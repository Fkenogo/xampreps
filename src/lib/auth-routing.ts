import type { AppRole } from '@/contexts/AuthContext';

export function getDashboardPathForRole(role: AppRole | null | undefined): string {
  if (!role) {
    return '/auth';
  }
  switch (role) {
    case 'super_admin':
      return '/dashboard/business-console';
    case 'admin':
      return '/dashboard/admin';
    case 'school_admin':
      return '/dashboard/school-admin';
    case 'teacher':
      return '/dashboard/teacher';
    case 'school':
      return '/dashboard/school';
    case 'parent':
      return '/dashboard/parent';
    case 'student':
      return '/dashboard/student';
    default:
      return '/auth';
  }
}
