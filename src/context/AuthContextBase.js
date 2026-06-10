import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  setUser: () => {},
  profile: null,
  setProfile: () => {},
  plan: 'free',
  planLimits: {},
  loading: true,
  signOut: () => {}
});
