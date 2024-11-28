import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    PropsWithChildren
  } from 'react';
  import { supabase } from '../lib/supabase';
  import { Session } from '@supabase/supabase-js';

  type AuthContextType = {
    session: Session | null;
    user: any;
    signOut: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    signOut: async () => {},
  });
  
  export const useAuth = () => useContext(AuthContext);
  
  export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<any>(null);
  
    useEffect(() => {
      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      });
  
      // Listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
        }
      );
  
      return () => {
        authListener.subscription.unsubscribe();
      };
    }, []);
  
    const signOut = async () => {
      await supabase.auth.signOut();
    };
  
    return (
      <AuthContext.Provider value={{ session, user, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  };