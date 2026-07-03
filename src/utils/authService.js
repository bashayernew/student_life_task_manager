import { apiRequest } from '../lib/api';

export const authService = {
  async signIn(email, password) {
    const { data, error } = await apiRequest('post', '/auth/login', { email, password });
    return { data, error };
  },

  async signOut() {
    return { error: null };
  },

  async getSession() {
    const { data, error } = await apiRequest('get', '/auth/me');
    return { data, error };
  },

  async getUser() {
    const { data, error } = await apiRequest('get', '/auth/me');
    return { data: data?.user ? { user: data.user } : null, error };
  },

  async getUserProfile(userId) {
    const { data, error } = await apiRequest('get', '/auth/me');
    if (error) return { data: null, error };
    if (data?.profile?.id !== userId) {
      return { data: data?.profile || null, error: null };
    }
    return { data: data?.profile || null, error: null };
  },

  async updateProfile(userId, updates) {
    const { data, error } = await apiRequest('put', '/auth/profile', updates);
    return { data: data?.profile || null, error };
  },

  async changePassword({ currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      return { data: null, error: { message: 'Current password and new password are required' } };
    }
    const { data, error } = await apiRequest('patch', '/auth/password', {
      currentPassword,
      newPassword,
    });
    return { data, error };
  },

  async getStaffMembers() {
    const { data, error } = await apiRequest('get', '/staff');
    return { data: data || [], error };
  },

  async createStaffMember(email, password, fullName, role = 'staff') {
    const { data, error } = await apiRequest('post', '/staff', {
      email,
      password,
      full_name: fullName,
      fullName,
      role,
    });
    return { data, error };
  },

  async updateStaffRole(userId, newRole) {
    const { data, error } = await apiRequest('patch', `/staff/${userId}/role`, { role: newRole });
    return { data, error };
  },

  async deleteStaffMember(userId) {
    const { data, error } = await apiRequest('delete', `/staff/${userId}`);
    return { data, error };
  },

  async isAdmin() {
    const { data, error } = await apiRequest('get', '/auth/me');
    return { data: data?.profile?.role === 'admin', error };
  },

  async isManager() {
    const { data, error } = await apiRequest('get', '/auth/me');
    return {
      data: data?.profile?.role === 'admin' || data?.profile?.role === 'manager',
      error,
    };
  },

  onAuthStateChange() {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
};

export default authService;
