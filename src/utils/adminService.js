import { apiRequest } from '../lib/api';

export async function deleteStaffMember(userId) {
  const { error } = await apiRequest('delete', `/staff/${userId}`);
  if (error) throw new Error(error.message);
}

export default { deleteStaffMember };
