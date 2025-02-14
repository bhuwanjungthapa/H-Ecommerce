import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { AdminUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type LoginData = {
  email: string;
  password: string;
};

type AuthContextType = {
  user: AdminUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AdminUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AdminUser | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: Infinity,
  });

  // Setup Supabase auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth event:', event);
        if (event === 'SIGNED_IN') {
          // Fetch admin user data after Supabase auth
          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        } else if (event === 'SIGNED_OUT') {
          queryClient.setQueryData(["/api/user"], null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // First authenticate with Supabase
      const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      console.log('Supabase auth response:', { data: supabaseAuth, error: supabaseError });

      if (supabaseError) {
        console.error('Supabase auth error:', supabaseError);
        throw supabaseError;
      }

      // Then authenticate with our server to set up the session
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      console.log('Server login response:', userData);
      return userData;
    },
    onSuccess: (user: AdminUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: "Welcome back!"
      });
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // First sign out from Supabase
      const { error: supabaseError } = await supabase.auth.signOut();
      if (supabaseError) throw supabaseError;

      // Then clear the server session
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const value = {
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}