import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@lnrads.com',
      password: 'AdminLNRADS2024!',
      email_confirm: true,
      user_metadata: {
        full_name: 'LN-RADS Administrator',
      },
    });

    if (userError) throw userError;

    console.log('Admin user created:', userData.user?.id);

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'admin',
      });

    if (roleError) throw roleError;

    console.log('Admin role assigned');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        email: 'admin@lnrads.com',
        userId: userData.user.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create admin user';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
