import { supabase } from './supabase';
import { ALL_VIDEO_PERMISSIONS, NO_VIDEO_PERMISSIONS } from '../types';
import type { VideoPermissions } from '../types';

/** The one account that approves users and grants video permissions.
 *  Must match `is_admin()` in supabase-migration-v2.sql. */
export const ADMIN_EMAIL = 'dkvala2003@gmail.com';

export async function checkUserApproval(
  userId: string,
  email: string,
): Promise<{ allowed: boolean; message?: string }> {
  if (email === ADMIN_EMAIL) return { allowed: true };

  const { data } = await supabase
    .from('user_approvals')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return {
    allowed: false,
    message: 'Your account is pending admin approval. Please wait — you will be able to sign in once the admin approves your request.',
  };
  if (data.status === 'approved') return { allowed: true };
  if (data.status === 'pending') {
    return {
      allowed: false,
      message: 'Your account is pending admin approval. Please wait — you will be able to sign in once the admin approves your request.',
    };
  }
  return {
    allowed: false,
    message: 'Your account has been deactivated. Please contact the admin.',
  };
}

/** Video-library rights for a user. The admin always has every right. */
export async function fetchVideoPermissions(userId: string, email: string): Promise<VideoPermissions> {
  if (email === ADMIN_EMAIL) return ALL_VIDEO_PERMISSIONS;
  const { data } = await supabase
    .from('video_permissions')
    .select('can_upload, can_edit, can_delete')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return NO_VIDEO_PERMISSIONS;
  return { canUpload: !!data.can_upload, canEdit: !!data.can_edit, canDelete: !!data.can_delete };
}
