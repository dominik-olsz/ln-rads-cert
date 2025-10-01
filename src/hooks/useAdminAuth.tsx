import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authLoading) return;

      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setIsAdmin(true);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading, navigate]);

  return { isAdmin, loading };
};
