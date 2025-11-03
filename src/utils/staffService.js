import { supabase } from '../lib/supabase';

export const staffService = {
  // Get all staff members
  async getStaff() {
    try {
      // First get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, department_id')
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // If it's a permission/RLS error, return helpful message
        if (profilesError.code === '42501' || profilesError.message?.includes('permission')) {
          return { 
            data: [], 
            error: { 
              message: 'Permission denied. Please run the RLS policies SQL script in your Supabase dashboard.' 
            } 
          };
        }
        return { data: [], error: profilesError };
      }

      if (!profiles || profiles.length === 0) {
        return { data: [], error: null };
      }

      // Get all departments (with error handling)
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name');

      // Create a map for quick lookup
      const deptMap = {};
      if (departments && !deptError) {
        departments.forEach(dept => {
          deptMap[dept.id] = dept;
        });
      } else if (deptError) {
        console.warn('Could not fetch departments:', deptError);
        // Continue without departments - not critical
      }

      // Combine profiles with their departments
      const staffWithDepts = profiles.map(profile => ({
        ...profile,
        department: profile.department_id ? deptMap[profile.department_id] : null
      }));

      return { data: staffWithDepts, error: null };
    } catch (error) {
      console.error('Exception in getStaff:', error);
      return { data: [], error: { message: 'Failed to load staff: ' + error.message } };
    }
  },

  // Find or create department by name
  async findOrCreateDepartment(departmentName) {
    if (!departmentName || !departmentName.trim()) {
      return { data: null, error: null };
    }

    try {
      const deptName = departmentName.trim();
      
      // First, try to find existing department (case-insensitive exact match)
      const { data: allDepartments, error: fetchError } = await supabase
        .from('departments')
        .select('id, name');
      
      if (fetchError) {
        return { data: null, error: fetchError };
      }

      // Find case-insensitive match
      const existing = allDepartments?.find(
        dept => dept.name.toLowerCase() === deptName.toLowerCase()
      );

      if (existing) {
        return { data: existing.id, error: null };
      }

      // If not found, create new department
      const { data: newDept, error: createError } = await supabase
        .from('departments')
        .insert({ name: departmentName.trim() })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating department:', createError);
        // If it's a permission error, provide helpful message
        if (createError.code === '42501' || createError.message?.includes('permission')) {
          return { 
            data: null, 
            error: { 
              message: 'Permission denied. Please run the RLS policies SQL script (fix_rls_policies.sql) in your Supabase dashboard.' 
            } 
          };
        }
        return { data: null, error: createError };
      }

      return { data: newDept.id, error: null };
    } catch (error) {
      return { data: null, error: { message: 'Failed to process department' } };
    }
  },

  // Create staff member via RPC function (with edge function fallback)
  async createStaffUser(staffData) {
    try {
      // First try RPC function (more reliable, already set up in migrations)
      if (!staffData.password) {
        return {
          data: null,
          error: { message: 'Password is required to create staff member' },
        };
      }

      // Find or create department if department name is provided
      let departmentId = staffData.department_id;
      if (staffData.department && !departmentId) {
        const { data: deptId, error: deptError } = await this.findOrCreateDepartment(staffData.department);
        if (deptError) {
          return { data: null, error: { message: `Failed to process department: ${deptError.message}` } };
        }
        departmentId = deptId;
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('create_staff_member', {
        member_email: staffData.email,
        member_password: staffData.password,
        member_name: staffData.full_name,
        member_role: staffData.role || 'staff',
      });

      if (!rpcError && rpcData && !rpcData.error) {
        // If RPC succeeded, update department if provided
        if (departmentId && rpcData.user_id) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ department_id: departmentId })
            .eq('id', rpcData.user_id);
          
          if (updateError) {
            console.warn('Failed to update department:', updateError);
          }
        }
        return { data: rpcData, error: null };
      }

      // Check if RPC returned an error
      if (rpcData && rpcData.error) {
        return { data: null, error: { message: rpcData.error } };
      }

      // Fallback to edge function if RPC fails
      const { data: funcData, error: funcError } = await supabase.functions.invoke('create_staff_user', {
        body: {
          email: staffData.email,
          full_name: staffData.full_name,
          role: staffData.role || 'staff',
          department_id: staffData.department_id || null,
        },
      });

      if (funcError) {
        return { data: null, error: funcError };
      }
      return { data: funcData, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || 'Failed to create staff member. Make sure the create_staff_member function is set up in your database.',
        },
      };
    }
  },

  // Delete staff member (admin only) - DEPRECATED: Use adminService.deleteStaffMember instead
  async deleteStaffUser(userId) {
    try {
      // Use RPC function to delete (handles both profile and auth user)
      const { data, error } = await supabase.rpc('delete_staff_member', {
        member_user_id: userId,
      });

      if (error) {
        return { data: null, error: { message: error.message || 'Failed to delete staff member' } };
      }

      // Check if RPC returned an error
      if (data && data.error) {
        return { data: null, error: { message: data.error } };
      }

      return { data: data || { success: true }, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || 'Failed to delete staff member. Make sure the delete_staff_member function is set up in your database.',
        },
      };
    }
  },
};

export default staffService;

