import { apiRequest } from '../lib/api';

export const departmentService = {
  async getDepartments() {
    const { data, error } = await apiRequest('get', '/departments');
    return { data: data || [], error };
  },

  async createDepartment(name) {
    const { data, error } = await apiRequest('post', '/departments', { name: name?.trim() });
    return { data, error };
  },

  async updateDepartment(id, name) {
    const { data, error } = await apiRequest('put', `/departments/${id}`, { name: name?.trim() });
    return { data, error };
  },

  async deleteDepartment(id) {
    const { data, error } = await apiRequest('delete', `/departments/${id}`);
    return { data, error };
  },
};

export default departmentService;
