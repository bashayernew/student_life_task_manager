import { supabase } from "../lib/supabase";

/**
 * Delete a staff member by user id via RPC.
 * Throws on error.
 */
export async function deleteStaffMember(userId) {
  const { error } = await supabase.rpc("delete_staff_member", {
    member_user_id: userId,
  });
  if (error) throw error;
}

