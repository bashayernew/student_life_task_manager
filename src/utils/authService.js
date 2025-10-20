import { supabase } from '../lib/supabase';

/**
 * Enhanced Authentication Service with Better Error Handling
 * Integrates with existing Supabase auth and profiles schema
 */

export const authService = {
  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase?.auth?.signInWithPassword({
        email: email?.trim(),
        password
      });
      
      if (error) {
        // Supabase handled the request but returned an error
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      // Network/Infrastructure errors
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('AuthRetryableFetchError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { 
          data: null, 
          error: { 
            message: 'Cannot connect to authentication service. Your Supabase project may be paused or inactive. Please check your Supabase dashboard and resume your project if needed.' 
          } 
        };
      }
      
      return { 
        data: null, 
        error: { message: 'An unexpected error occurred during sign in' } 
      };
    }
  },

  // Sign out user
  async signOut() {
    try {
      const { error } = await supabase?.auth?.signOut();
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          error: { 
            message: 'Cannot connect to authentication service. Please check your connection.' 
          } 
        };
      }
      
      return { error: { message: 'Failed to sign out' } };
    }
  },

  // Get current user session
  async getSession() {
    try {
      const { data, error } = await supabase?.auth?.getSession();
      
      if (error) {
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: 'Failed to get session' } 
      };
    }
  },

  // Get current user
  async getUser() {
    try {
      const { data, error } = await supabase?.auth?.getUser();
      
      if (error) {
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: 'Failed to get user' } 
      };
    }
  },

  // Get user profile from profiles table
  async getUserProfile(userId) {
    if (!userId) {
      return { data: null, error: { message: 'User ID required' } };
    }

    try {
      const { data, error } = await supabase
        ?.from('profiles')
        ?.select('*')
        ?.eq('id', userId)
        ?.single();
      
      if (error) {
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          data: null, 
          error: { 
            message: 'Cannot connect to database. Please check your connection.' 
          } 
        };
      }
      
      return { 
        data: null, 
        error: { message: 'Failed to load user profile' } 
      };
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    if (!userId) {
      return { data: null, error: { message: 'User ID required' } };
    }

    try {
      const { data, error } = await supabase
        ?.from('profiles')
        ?.update(updates)
        ?.eq('id', userId)
        ?.select()
        ?.single();
      
      if (error) {
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: 'Failed to update profile' } 
      };
    }
  },

  // Create staff member (admin function)
  async createStaffMember(email, fullName, departmentId = null) {
    try {
      const { data, error } = await supabase?.rpc('create_staff_member', {
        user_email: email?.trim(),
        user_full_name: fullName?.trim(),
        user_department_id: departmentId
      });
      
      if (error) {
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: 'Failed to create staff member' } 
      };
    }
  },

  // Check if current user is admin
  async isAdmin() {
    try {
      const { data, error } = await supabase?.rpc('is_admin');
      
      if (error) {
        return { data: false, error };
      }
      
      return { data: data || false, error: null };
    } catch (error) {
      return { 
        data: false, 
        error: { message: 'Failed to check admin status' } 
      };
    }
  },

  // Check if current user is manager
  async isManager() {
    try {
      const { data, error } = await supabase?.rpc('is_manager');
      
      if (error) {
        return { data: false, error };
      }
      
      return { data: data || false, error: null };
    } catch (error) {
      return { 
        data: false, 
        error: { message: 'Failed to check manager status' } 
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase?.auth?.onAuthStateChange(callback);
  }
};

export default authService;