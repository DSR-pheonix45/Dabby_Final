import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextBase';
import { signOut, getCurrentUser, onAuthStateChange, supabase } from '../lib/supabase';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile safely
   */
  const fetchUserProfile = async (userId) => {
    if (!userId) {
      setProfile(null);
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
      } else if (!data) {
        setProfile({
          id: userId,
          status: 'partial'
        });
      } else {
        setProfile({ ...data, status: 'active' });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setProfile(null);
    }
  };

  const fetchUserSubscription = async (userId) => {
    if (!userId) {
      setSubscription(null);
      setPlan('free');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch subscription:', error);
        setSubscription(null);
        setPlan('free');
      } else if (!data) {
        setSubscription(null);
        setPlan('free');
      } else {
        setSubscription(data);
        setPlan(data.plan_id || data?.plans?.id || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch user subscription:', err);
      setSubscription(null);
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
          await fetchUserSubscription(user.id);
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
          fetchUserSubscription(session.user.id);
        }
      } else if (event === 'TOKEN_REFRESH_FAILED' || event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        setProfile(null);
        setSubscription(null);
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
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    profile,
    setProfile,
    loading,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
