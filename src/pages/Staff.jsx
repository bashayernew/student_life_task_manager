import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { staffService } from '../utils/staffService';
import { taskService } from '../utils/taskService';
import { deleteStaffMember } from '../utils/adminService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Icon from '../components/AppIcon';

const Staff = () => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: '',
    department: '',
    department_id: '',
  });

  useEffect(() => {
    loadStaff();
    loadDepartments();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    const { data, error } = await staffService.getStaff();
    if (!error && data) {
      setStaff(data);
    }
    setLoading(false);
  };

  const loadDepartments = async () => {
    const { data } = await taskService.getDepartments();
    if (data) {
      setDepartments(data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!formData.role || !formData.role.trim()) {
      setError('Role is required');
      setSubmitting(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password is required and must be at least 6 characters');
      setSubmitting(false);
      return;
    }

    const { data, error } = await staffService.createStaffUser({
      email: formData.email,
      full_name: formData.full_name,
      password: formData.password,
      role: formData.role.trim(),
      department: formData.department?.trim() || null,
      department_id: formData.department_id || null,
    });

    if (error) {
      setError(error.message || 'Failed to create staff member');
      setSubmitting(false);
    } else {
      setSuccess('Staff member created successfully! They will now appear in the team member dropdown when creating tasks.');
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: '',
        department: '',
        department_id: '',
      });
      // Reload staff list to show the new member
      await loadStaff();
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setSuccess('');
  };

  const handleDeleteStaff = async (member) => {
    if (!confirmDelete || confirmDelete !== member.id) {
      setConfirmDelete(member.id);
      setError('');
      return;
    }

    setDeletingUserId(member.id);
    setError('');
    setSuccess('');

    try {
      await deleteStaffMember(member.id);
      
      setSuccess(`Staff member ${member.full_name} (${member.email}) has been deleted successfully.`);
      setConfirmDelete(null);
      // Reload staff list
      await loadStaff();
    } catch (err) {
      const msg =
        err?.message ||
        err?.hint ||
        'Failed to delete staff member. Please try again.';
      console.error('deleteStaffMember RPC error:', err);
      setError(`Failed to delete staff member: ${msg}`);
      setConfirmDelete(null);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-xl font-bold">Staff Management</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={() => navigate('/tasks')}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  Tasks
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Create Staff Form */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create New Staff Member</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-700 border-gray-600 text-white"
                    placeholder="staff@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-700 border-gray-600 text-white"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Password *
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-700 border-gray-600 text-white"
                  placeholder="Set initial password (min 6 characters)"
                  minLength={6}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Staff member will use this password to login. They can change it later.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role *
                  </label>
                  <Input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-700 border-gray-600 text-white"
                    placeholder="Type role (e.g., staff, admin)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Department
                  </label>
                  <Input
                    type="text"
                    name="department"
                    value={formData.department || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, department: e.target.value }));
                      setError('');
                      setSuccess('');
                    }}
                    className="w-full bg-gray-700 border-gray-600 text-white"
                    placeholder="Type department name"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Creating...' : 'Create Staff Member'}
              </Button>
            </form>
          </div>

                {/* Staff List */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg sm:text-xl font-bold">Staff Members</h2>
                    <div className="text-xs sm:text-sm text-gray-400">
                      <p>⚠️ Passwords are encrypted and cannot be retrieved</p>
                      <p className="text-xs mt-1 hidden sm:block">Use "Reset Password" in Supabase Dashboard if needed</p>
                    </div>
                  </div>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full">
                         <thead className="bg-gray-700 hidden sm:table-header-group">
                           <tr>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                               Email
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                               Full Name
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                               Role
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                               Department
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                               Actions
                             </th>
                           </tr>
                         </thead>
                  <tbody className="divide-y divide-gray-700">
                           {staff.length === 0 ? (
                             <tr>
                               <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                 No staff members found
                               </td>
                             </tr>
                    ) : (
                             staff.map((member) => (
                               <>
                                 {/* Mobile Card View */}
                                 <tr key={`${member.id}-mobile`} className="sm:hidden hover:bg-gray-700">
                                   <td className="px-4 py-4">
                                     <div className="space-y-2">
                                       <div>
                                         <div className="text-sm font-semibold text-white break-words">{member.full_name}</div>
                                         <div className="text-xs text-gray-400 font-mono break-all">{member.email}</div>
                                       </div>
                                       <div className="flex flex-wrap items-center gap-2">
                                         <span
                                           className={`px-2 py-1 text-xs font-medium rounded ${
                                             member.role === 'admin'
                                               ? 'bg-purple-500/20 text-purple-400'
                                               : 'bg-blue-500/20 text-blue-400'
                                           }`}
                                         >
                                           {member.role}
                                         </span>
                                         {member.department?.name && (
                                           <span className="text-xs text-gray-300">{member.department.name}</span>
                                         )}
                                       </div>
                                       <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-700">
                                         <button
                                           onClick={() => {
                                             navigator.clipboard.writeText(member.email);
                                             alert(`Email copied: ${member.email}`);
                                           }}
                                           className="text-blue-400 hover:text-blue-300 underline text-xs"
                                         >
                                           Copy Email
                                         </button>
                                         {member.role !== 'admin' && (
                                           <>
                                             {confirmDelete === member.id ? (
                                               <div className="flex items-center gap-2">
                                                 <button
                                                   onClick={() => handleDeleteStaff(member)}
                                                   disabled={deletingUserId === member.id}
                                                   className="text-red-400 hover:text-red-300 underline text-xs font-medium flex items-center gap-1"
                                                 >
                                                   {deletingUserId === member.id ? (
                                                     <>
                                                       <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                                       Deleting...
                                                     </>
                                                   ) : (
                                                     <>
                                                       <Icon name="Trash2" size={12} />
                                                       Confirm
                                                     </>
                                                   )}
                                                 </button>
                                                 <button
                                                   onClick={() => setConfirmDelete(null)}
                                                   className="text-gray-400 hover:text-gray-300 underline text-xs"
                                                 >
                                                   Cancel
                                                 </button>
                                               </div>
                                             ) : (
                                               <button
                                                 onClick={() => handleDeleteStaff(member)}
                                                 disabled={deletingUserId === member.id}
                                                 className="text-red-400 hover:text-red-300 underline text-xs flex items-center gap-1"
                                               >
                                                 <Icon name="Trash2" size={12} />
                                                 Delete
                                               </button>
                                             )}
                                           </>
                                         )}
                                         {member.role === 'admin' && (
                                           <span className="text-xs text-gray-500">Cannot delete admin</span>
                                         )}
                                       </div>
                                     </div>
                                   </td>
                                 </tr>
                                 {/* Desktop Table View */}
                                 <tr key={member.id} className="hidden sm:table-row hover:bg-gray-700">
                                   <td className="px-4 sm:px-6 py-4 text-sm text-white font-mono break-all">
                                     {member.email}
                                   </td>
                                   <td className="px-4 sm:px-6 py-4 text-sm text-white">
                                     {member.full_name}
                                   </td>
                                   <td className="px-4 sm:px-6 py-4">
                                     <span
                                       className={`px-2 py-1 text-xs font-medium rounded ${
                                         member.role === 'admin'
                                           ? 'bg-purple-500/20 text-purple-400'
                                           : 'bg-blue-500/20 text-blue-400'
                                       }`}
                                     >
                                       {member.role}
                                     </span>
                                   </td>
                                   <td className="px-4 sm:px-6 py-4 text-sm text-gray-300">
                                     {member.department?.name || 'No department'}
                                   </td>
                                   <td className="px-4 sm:px-6 py-4 text-sm">
                                     <div className="flex items-center gap-3">
                                       <button
                                         onClick={() => {
                                           navigator.clipboard.writeText(member.email);
                                           alert(`Email copied: ${member.email}`);
                                         }}
                                         className="text-blue-400 hover:text-blue-300 underline text-xs"
                                       >
                                         Copy Email
                                       </button>
                                       {member.role !== 'admin' && (
                                         <>
                                           {confirmDelete === member.id ? (
                                             <div className="flex items-center gap-2">
                                               <button
                                                 onClick={() => handleDeleteStaff(member)}
                                                 disabled={deletingUserId === member.id}
                                                 className="text-red-400 hover:text-red-300 underline text-xs font-medium flex items-center gap-1"
                                               >
                                                 {deletingUserId === member.id ? (
                                                   <>
                                                     <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                                     Deleting...
                                                   </>
                                                 ) : (
                                                   <>
                                                     <Icon name="Trash2" size={12} />
                                                     Confirm Delete
                                                   </>
                                                 )}
                                               </button>
                                               <button
                                                 onClick={() => setConfirmDelete(null)}
                                                 className="text-gray-400 hover:text-gray-300 underline text-xs"
                                               >
                                                 Cancel
                                               </button>
                                             </div>
                                           ) : (
                                             <button
                                               onClick={() => handleDeleteStaff(member)}
                                               disabled={deletingUserId === member.id}
                                               className="text-red-400 hover:text-red-300 underline text-xs flex items-center gap-1"
                                             >
                                               <Icon name="Trash2" size={12} />
                                               Delete
                                             </button>
                                           )}
                                         </>
                                       )}
                                       {member.role === 'admin' && (
                                         <span className="text-xs text-gray-500">Cannot delete admin</span>
                                       )}
                                     </div>
                                   </td>
                                 </tr>
                               </>
                             ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Staff;

