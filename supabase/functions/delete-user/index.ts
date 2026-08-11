import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to verify the JWT and check admin status
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Not an admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'You must be an admin to delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get userId from request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Remove stored invoice PDFs for this user from the private invoices bucket
    const { data: userInvoices } = await supabaseAdmin
      .from('invoices')
      .select('pdf_path')
      .eq('user_id', userId);

    const pdfPaths = (userInvoices || [])
      .map((i: { pdf_path: string | null }) => i.pdf_path)
      .filter((p: string | null): p is string => !!p);

    if (pdfPaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from('invoices').remove(pdfPaths);
      if (storageError) console.error('Error removing invoice PDFs:', storageError);
    }

    // 2. Delete all application data belonging to this user.
    //    Ordered so child rows go before their parents.
    const tablesInOrder = [
      'certificates',
      'certification_test_progress',
      'invoices',
      'test_attempts',
      'user_progress',
      'course_progress',
      'course_bookmarks',
      'course_purchases',
      'certification_retake_purchases',
      'user_roles',
    ] as const;

    for (const table of tablesInOrder) {
      const { error: rowError } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
      if (rowError) {
        console.error(`Error deleting from ${table}:`, rowError);
        throw new Error(`Failed to delete ${table} data: ${rowError.message}`);
      }
    }

    // 3. Release any discount codes this user redeemed
    const { error: codeError } = await supabaseAdmin
      .from('discount_codes')
      .update({ redeemed_by: null, redeemed_at: null, redeemed_email: null })
      .eq('redeemed_by', userId);
    if (codeError) console.error('Error clearing redeemed discount codes:', codeError);

    // 4. Delete the profile explicitly (also cascades from auth.users)
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profileError) console.error('Error deleting profile:', profileError);

    // 5. Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log('User and all related data deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});