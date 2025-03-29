import { AuthResponse, User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  full_name: string;
  company?: string;
}

export const authService = {
  init: async () => {
    // Set up session handling
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      localStorage.setItem("token", session.access_token);
    }

    // Set up auth state change listener
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem("token", session.access_token);
      } else {
        localStorage.removeItem("token");
      }
    });
  },

  async login({
    email,
    password,
  }: LoginCredentials): Promise<{
    user: User | null;
    session: Session | null;
  }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Token is handled by init() and onAuthStateChange
    return { user: data.user, session: data.session };
  },

  async register(data: RegisterData): Promise<{ user: User | null }> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          company: data.company,
        },
      },
    });
    if (error) throw error;
    return { user: authData.user };
  },

  async logout(): Promise<void> {
    localStorage.removeItem("token");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },
};
