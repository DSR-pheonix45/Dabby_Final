import { useState, useEffect, useMemo } from 'react';
import { AuthContext } from './AuthContextBase';
import { signOut, getCurrentUser, onAuthStateChange, supabase } from '../lib/supabase';

// Plan limits — mirrors backend PLAN_LIMITS in auth_utils.py
const PLAN_LIMITS = {
  free: {
    max_workbenches: 0, max_members: 0, max_ai_requests: 50,
    doc_vault_mb: 0, investor_view: false, advanced_coa: false, audit_logs: false, priority_ai: false,
    coa_label_limit: 0,
  },
  go: {
    max_workbenches: 5, max_members: 5, max_ai_requests: 500,
    doc_vault_mb: 100, investor_view: false, advanced_coa: false, audit_logs: false, priority_ai: false,
    coa_label_limit: 20,
  },
  pro: {
    max_workbenches: 10, max_members: 15, max_ai_requests: 1000,
    doc_vault_mb: 500, investor_view: true, advanced_coa: true, audit_logs: false, priority_ai: true,
    coa_label_limit: 80,
  },
  enterprise: {
    max_workbenches: 999, max_members: 50, max_ai_requests: 9999,
    doc_vault_mb: 5000, investor_view: true, advanced_coa: true, audit_logs: true, priority_ai: true,
    coa_label_limit: 9999,
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile safely — plan is stored on the users table
   */
  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
      setPlan('free');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        setProfile(null);
        setPlan('free');
      } else if (!data) {
        setProfile({
          id: userId,
          status: 'partial'
        });
        setPlan('free');
      } else {
        setProfile({ ...data, status: 'active' });
        // Plan is directly on the users table
        setPlan(data.plan || 'free');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setProfile(null);
      setPlan('free');
    }
  };

  /**
   * Initial session check
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { user, error } = await getCurrentUser();

        if (error && error !== 'Auth session missing!') {
          console.warn('Auth init error:', error);
        }

        if (user) {
          setUser(user);
          await fetchUserProfile(user.id);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user.id);
        }
      } else if (event === 'TOKEN_REFRESH_FAILED' || event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        setProfile(null);
        setPlan('free');
        setLoading(false);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  /**
   * Sign out handler
   */
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
      setProfile(null);
      setPlan('free');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Compute plan limits from the current plan
  const planLimits = useMemo(() => PLAN_LIMITS[plan] || PLAN_LIMITS.free, [plan]);

  const value = {
    user,
    setUser,
    profile,
    setProfile,
    plan,
    planLimits,
    loading,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
