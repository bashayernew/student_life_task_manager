import React, { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { staffService } from '../utils/staffService';
import { departmentService } from '../utils/departmentService';
import { deleteStaffMember } from '../utils/adminService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import AppPageHeader from '../components/AppPageHeader';

const Staff = () => {
  const { userProfile } = useAuth();
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
    role: 'staff',
    department_id: '',
    department_ids: [],
  });
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [confirmManagerDepts, setConfirmManagerDepts] = useState(null);
  const [pendingDeptSelection, setPendingDeptSelection] = useState({});

  const departmentSelectOptions = departments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }));

  const getMemberDepartmentValue = (member) => {
    if (member.role === 'staff' || member.role === 'manager') {
      const ids = member.department_ids || member.departments?.map((dept) => dept.id) || [];
      return Array.isArray(ids) ? ids : [];
    }
    return member.department_id || '';
  };

  const getDepartmentOptionsForMember = (member) => {
    const merged = new Map();

    for (const option of departmentSelectOptions) {
      merged.set(option.value, option);
    }

    for (const dept of member.departments || []) {
      merged.set(dept.id, { value: dept.id, label: dept.name });
    }

    return Array.from(merged.values());
  };

  const getMemberDepartmentLabel = (member) => {
    if (member.departments?.length) {
      return member.departments.map((dept) => dept.name).join(', ');
    }
    return member.department?.name || '';
  };

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
    const { data } = await departmentService.getDepartments();
    if (data) {
      setDepartments(data);
    }
  };

  const departmentOptions = [
    { value: '', label: 'No department' },
    ...departmentSelectOptions,
  ];

  const applyDepartmentAssignment = async (userId, value, memberRole) => {
    setAssigningUserId(userId);
    setError('');

    const departmentIds = Array.isArray(value) ? value : value ? [value] : [];
    const { data, error } = await staffService.updateStaffDepartments(userId, departmentIds);

    if (error) {
      setError(error.message || 'Failed to assign department');
    } else {
      setStaff((prev) =>
        prev.map((member) =>
          member.id === userId ? { ...member, ...data } : member
        )
      );
      setSuccess('Department assignment updated.');
      setTimeout(() => setSuccess(''), 2500);
    }
    setAssigningUserId(null);
  };

  const handleAssignDepartment = async (userId, value, memberRole, memberName = '') => {
    const departmentIds = Array.isArray(value) ? value : value ? [value] : [];

    if (memberRole === 'manager' && departmentIds.length > 1) {
      setConfirmManagerDepts({
        userId,
        value: departmentIds,
        memberName,
      });
      return;
    }

    await applyDepartmentAssignment(userId, departmentIds, memberRole);
  };

  const getDepartmentSelectValue = (member) => {
    if (pendingDeptSelection[member.id] !== undefined) {
      return pendingDeptSelection[member.id];
    }
    return getMemberDepartmentValue(member);
  };

  const handleDepartmentSelectClose = (member, isOpen) => {
    if (isOpen || (member.role !== 'staff' && member.role !== 'manager')) return;
    if (pendingDeptSelection[member.id] === undefined) return;

    const finalValue = pendingDeptSelection[member.id];
    setPendingDeptSelection((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });
    handleAssignDepartment(member.id, finalValue, member.role, member.full_name);
  };

  const handleDepartmentSelectChange = (member, value) => {
    const isMulti = member.role === 'staff' || member.role === 'manager';
    if (isMulti) {
      setPendingDeptSelection((prev) => ({
        ...prev,
        [member.id]: Array.isArray(value) ? value : [],
      }));
      return;
    }
    handleAssignDepartment(member.id, value, member.role, member.full_name);
  };

  const handleConfirmManagerDepartments = async () => {
    if (!confirmManagerDepts) return;

    if (confirmManagerDepts.mode === 'create') {
      const payload = confirmManagerDepts.formSnapshot;
      setConfirmManagerDepts(null);
      await createStaffMember(payload);
      return;
    }

    const { userId, value } = confirmManagerDepts;
    setConfirmManagerDepts(null);
    await applyDepartmentAssignment(userId, value, 'manager');
  };

  const createStaffMember = async (payload) => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    const { error } = await staffService.createStaffUser({
      email: payload.email,
      full_name: payload.full_name,
      password: payload.password,
      role: payload.role.trim(),
      department_id: payload.role === 'manager' ? payload.department_ids?.[0] || null : null,
      department_ids:
        payload.role === 'staff' || payload.role === 'manager'
          ? payload.department_ids || []
          : [],
    });

    if (error) {
      setError(error.message || 'Failed to create staff member');
    } else {
      setSuccess('Staff member created successfully! They will now appear in the team member dropdown when creating tasks.');
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'staff',
        department_id: '',
        department_ids: [],
      });
      await loadStaff();
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.role || !formData.role.trim()) {
      setError('Role is required');
      return;
    }

    if (!['admin', 'staff', 'manager'].includes(formData.role.trim())) {
      setError('Role must be admin, staff, or manager');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password is required and must be at least 6 characters');
      return;
    }

    if (formData.role === 'manager' && formData.department_ids.length > 1) {
      setConfirmManagerDepts({
        mode: 'create',
        formSnapshot: { ...formData },
      });
      return;
    }

    await createStaffMember(formData);
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
      console.error('deleteStaffMember error:', err);
      setError(`Failed to delete staff member: ${msg}`);
      setConfirmDelete(null);
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-background text-foreground">
        <AppPageHeader title="Staff Management" />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          {(error || success) && (
            <div className="mb-6 space-y-3">
              {error && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                  <p className="text-sm text-success">{success}</p>
                </div>
              )}
            </div>
          )}

          {/* Create Staff Form */}
          <div className="ktech-card p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-xl font-bold mb-4">Create New Staff Member</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-background border-border text-foreground"
                    placeholder="staff@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-background border-border text-foreground"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Initial Password *
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-background border-border text-foreground"
                  placeholder="Set initial password (min 6 characters)"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set the login password here when creating the account. It cannot be retrieved later.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Role *"
                    name="role"
                    value={formData.role}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        role: value || 'staff',
                        department_id: '',
                        department_ids: [],
                      }));
                      setError('');
                      setSuccess('');
                    }}
                    options={[
                      { value: 'staff', label: 'Staff' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                    placeholder="Select role"
                    className="w-full"
                  />
                </div>
                <div>
                  {formData.role === 'staff' ? (
                    <Select
                      label="Departments"
                      name="department_ids"
                      value={formData.department_ids}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          department_ids: Array.isArray(value) ? value : [],
                        }));
                        setError('');
                        setSuccess('');
                      }}
                      options={departmentSelectOptions}
                      placeholder="Select one or more departments"
                      multiple={true}
                      searchable={true}
                      className="w-full"
                    />
                  ) : formData.role === 'manager' ? (
                    <Select
                      label="Departments"
                      name="department_ids"
                      value={formData.department_ids}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          department_ids: Array.isArray(value) ? value : [],
                        }));
                        setError('');
                        setSuccess('');
                      }}
                      options={departmentSelectOptions}
                      placeholder="Select one or more departments"
                      multiple={true}
                      searchable={true}
                      className="w-full"
                    />
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Department
                      </label>
                      <p className="text-sm text-muted-foreground">Not required for admin accounts.</p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Staff Member'}
              </Button>
            </form>
          </div>

                {/* Staff List */}
                <div className="ktech-card overflow-visible">
                  <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                    <h2 className="text-lg sm:text-xl font-bold">Staff Members</h2>
                    <div className="text-xs sm:text-sm text-muted-foreground sm:text-right sm:max-w-md">
                      <p>Passwords are stored securely and cannot be viewed after creation.</p>
                      <p className="mt-1">
                        Assign departments to staff and managers (multiple allowed for both). Managers can only assign tasks to staff in their departments.{' '}
                        <button
                          type="button"
                          onClick={() => navigate('/departments')}
                          className="text-secondary hover:text-primary underline"
                        >
                          Manage departments
                        </button>
                      </p>
                    </div>
                  </div>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="ktech-spinner"></div>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible -mx-3 sm:mx-0">
                <table className="w-full">
                         <thead className="bg-muted hidden sm:table-header-group">
                           <tr>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                               Email
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                               Full Name
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                               Role
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                               Department(s)
                             </th>
                             <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                               Actions
                             </th>
                           </tr>
                         </thead>
                  <tbody className="divide-y divide-border">
                           {staff.length === 0 ? (
                             <tr>
                               <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                                 No staff members found
                               </td>
                             </tr>
                    ) : (
                             staff.map((member) => (
                               <Fragment key={member.id}>
                                 {/* Mobile Card View */}
                                 <tr className="sm:hidden hover:bg-muted">
                                   <td className="px-4 py-4">
                                     <div className="space-y-2">
                                       <div>
                                         <div className="text-sm font-semibold text-foreground break-words">{member.full_name}</div>
                                         <div className="text-xs text-muted-foreground font-mono break-all">{member.email}</div>
                                       </div>
                                       <div className="flex flex-wrap items-center gap-2">
                                         <span
                                           className={`px-2 py-1 text-xs font-medium rounded ${
                                             member.role === 'admin'
                                               ? 'bg-secondary/15 text-secondary'
                                               : 'bg-accent/15 text-secondary'
                                           }`}
                                         >
                                           {member.role}
                                         </span>
                                         {getMemberDepartmentLabel(member) && (
                                           <span className="text-xs text-muted-foreground">{getMemberDepartmentLabel(member)}</span>
                                         )}
                                       </div>
                                       <div className="pt-2">
                                         {member.role === 'admin' ? (
                                           <p className="text-xs text-muted-foreground">No department</p>
                                         ) : (
                                           <Select
                                             key={`${member.id}-mobile-dept`}
                                             label={member.role === 'staff' || member.role === 'manager' ? 'Departments' : 'Department'}
                                             value={getDepartmentSelectValue(member)}
                                             onChange={(value) => handleDepartmentSelectChange(member, value)}
                                             onOpenChange={(open) => handleDepartmentSelectClose(member, open)}
                                             options={getDepartmentOptionsForMember(member)}
                                             multiple={member.role === 'staff' || member.role === 'manager'}
                                             disabled={assigningUserId === member.id}
                                             searchable
                                             clearable={member.role !== 'staff' && member.role !== 'manager'}
                                             className="w-full"
                                           />
                                         )}
                                       </div>
                                       <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                                         <button
                                           onClick={() => {
                                             navigator.clipboard.writeText(member.email);
                                             alert(`Email copied: ${member.email}`);
                                           }}
                                           className="text-secondary hover:text-primary underline text-xs"
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
                                                   className="text-error hover:text-red-300 underline text-xs font-medium flex items-center gap-1"
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
                                                   className="text-muted-foreground hover:text-muted-foreground underline text-xs"
                                                 >
                                                   Cancel
                                                 </button>
                                               </div>
                                             ) : (
                                               <button
                                                 onClick={() => handleDeleteStaff(member)}
                                                 disabled={deletingUserId === member.id}
                                                 className="text-error hover:text-red-300 underline text-xs flex items-center gap-1"
                                               >
                                                 <Icon name="Trash2" size={12} />
                                                 Delete
                                               </button>
                                             )}
                                           </>
                                         )}
                                         {member.role === 'admin' && (
                                           <span className="text-xs text-muted-foreground">Cannot delete admin</span>
                                         )}
                                       </div>
                                     </div>
                                   </td>
                                 </tr>
                                 {/* Desktop Table View */}
                                 <tr className="hidden sm:table-row hover:bg-muted">
                                   <td className="px-4 sm:px-6 py-4 text-sm text-foreground font-mono break-all">
                                     {member.email}
                                   </td>
                                   <td className="px-4 sm:px-6 py-4 text-sm text-foreground">
                                     {member.full_name}
                                   </td>
                                   <td className="px-4 sm:px-6 py-4">
                                     <span
                                       className={`px-2 py-1 text-xs font-medium rounded ${
                                         member.role === 'admin'
                                           ? 'bg-secondary/15 text-secondary'
                                           : 'bg-accent/15 text-secondary'
                                       }`}
                                     >
                                       {member.role}
                                     </span>
                                   </td>
                                   <td className="px-4 sm:px-6 py-4 text-sm min-w-[220px]">
                                     {member.role === 'admin' ? (
                                       <span className="text-muted-foreground">—</span>
                                     ) : (
                                       <Select
                                         key={`${member.id}-dept`}
                                         value={getDepartmentSelectValue(member)}
                                         onChange={(value) => handleDepartmentSelectChange(member, value)}
                                         onOpenChange={(open) => handleDepartmentSelectClose(member, open)}
                                         options={getDepartmentOptionsForMember(member)}
                                         multiple={member.role === 'staff' || member.role === 'manager'}
                                         disabled={assigningUserId === member.id}
                                         searchable
                                         clearable={member.role !== 'staff' && member.role !== 'manager'}
                                         className="w-full min-w-[200px]"
                                       />
                                     )}
                                   </td>
                                   <td className="px-4 sm:px-6 py-4 text-sm">
                                     <div className="flex items-center gap-3">
                                       <button
                                         onClick={() => {
                                           navigator.clipboard.writeText(member.email);
                                           alert(`Email copied: ${member.email}`);
                                         }}
                                         className="text-secondary hover:text-primary underline text-xs"
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
                                                 className="text-error hover:text-red-300 underline text-xs font-medium flex items-center gap-1"
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
                                                 className="text-muted-foreground hover:text-muted-foreground underline text-xs"
                                               >
                                                 Cancel
                                               </button>
                                             </div>
                                           ) : (
                                             <button
                                               onClick={() => handleDeleteStaff(member)}
                                               disabled={deletingUserId === member.id}
                                               className="text-error hover:text-red-300 underline text-xs flex items-center gap-1"
                                             >
                                               <Icon name="Trash2" size={12} />
                                               Delete
                                             </button>
                                           )}
                                         </>
                                       )}
                                       {member.role === 'admin' && (
                                         <span className="text-xs text-muted-foreground">Cannot delete admin</span>
                                       )}
                                     </div>
                                   </td>
                                 </tr>
                               </Fragment>
                             ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {confirmManagerDepts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
              <h3 className="text-lg font-bold mb-2">Assign multiple departments?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {confirmManagerDepts.mode === 'create'
                  ? 'This manager will be assigned to more than one department and can manage tasks across all of them.'
                  : `Are you sure you want to assign ${confirmManagerDepts.memberName || 'this manager'} to more than one department? They will be able to manage tasks across all selected departments.`}
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmManagerDepts(null)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirmManagerDepartments}>
                  Yes, I&apos;m sure
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Staff;

