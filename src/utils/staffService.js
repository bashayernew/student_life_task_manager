import { apiRequest } from '../lib/api';

export const staffService = {
  async getStaff() {
    const { data, error } = await apiRequest('get', '/staff');
    return { data: data || [], error };
  },

  async findOrCreateDepartment(departmentName) {
    if (!departmentName || !departmentName.trim()) {
      return { data: null, error: null };
    }

    const { data, error } = await apiRequest('post', '/departments', {
      name: departmentName.trim(),
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data?.id, error: null };
  },

  async createStaffUser(staffData) {
    if (!staffData.password) {
      return {
        data: null,
        error: { message: 'Password is required to create staff member' },
      };
    }

    const { data, error } = await apiRequest('post', '/staff', staffData);
    return { data, error };
  },

  async deleteStaffUser(userId) {
    const { data, error } = await apiRequest('delete', `/staff/${userId}`);
    return { data, error };
  },

  async updateStaffDepartment(userId, departmentId) {
    const { data, error } = await apiRequest('patch', `/staff/${userId}/department`, {
      department_id: departmentId || null,
    });
    return { data, error };
  },

  async updateStaffDepartments(userId, departmentIds) {
    const { data, error } = await apiRequest('patch', `/staff/${userId}/department`, {
      department_ids: departmentIds || [],
    });
    return { data, error };
  },
};

export default staffService;
