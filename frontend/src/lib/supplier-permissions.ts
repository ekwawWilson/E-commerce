/**
 * Supplier Portal Role-Based Permissions
 *
 * Roles:
 * - OWNER: Full access to all features, can manage staff
 * - MANAGER: Can manage products, orders, and view payouts
 * - STAFF: Can view and update order fulfillment only
 */

export type SupplierRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface SupplierPermissions {
  // Products
  canViewProducts: boolean;
  canCreateProducts: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;

  // Orders
  canViewOrders: boolean;
  canUpdateFulfillment: boolean;

  // Payouts
  canViewPayouts: boolean;

  // Settings
  canViewSettings: boolean;
  canEditProfile: boolean;
  canManageStaff: boolean;
  canChangePassword: boolean;

  // Dashboard
  canViewDashboard: boolean;
  canViewRevenue: boolean;
}

const rolePermissions: Record<SupplierRole, SupplierPermissions> = {
  OWNER: {
    canViewProducts: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canViewOrders: true,
    canUpdateFulfillment: true,
    canViewPayouts: true,
    canViewSettings: true,
    canEditProfile: true,
    canManageStaff: true,
    canChangePassword: true,
    canViewDashboard: true,
    canViewRevenue: true,
  },
  MANAGER: {
    canViewProducts: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: false,
    canViewOrders: true,
    canUpdateFulfillment: true,
    canViewPayouts: true,
    canViewSettings: true,
    canEditProfile: true,
    canManageStaff: false,
    canChangePassword: true,
    canViewDashboard: true,
    canViewRevenue: true,
  },
  STAFF: {
    canViewProducts: true,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canViewOrders: true,
    canUpdateFulfillment: true,
    canViewPayouts: false,
    canViewSettings: true,
    canEditProfile: false,
    canManageStaff: false,
    canChangePassword: true,
    canViewDashboard: true,
    canViewRevenue: false,
  },
};

export function getPermissions(role: SupplierRole | undefined | null): SupplierPermissions {
  if (!role) {
    // Return no permissions if role is undefined
    return {
      canViewProducts: false,
      canCreateProducts: false,
      canEditProducts: false,
      canDeleteProducts: false,
      canViewOrders: false,
      canUpdateFulfillment: false,
      canViewPayouts: false,
      canViewSettings: false,
      canEditProfile: false,
      canManageStaff: false,
      canChangePassword: false,
      canViewDashboard: false,
      canViewRevenue: false,
    };
  }
  return rolePermissions[role];
}

export function hasPermission(
  role: SupplierRole | undefined | null,
  permission: keyof SupplierPermissions
): boolean {
  return getPermissions(role)[permission];
}

export function getRoleLabel(role: SupplierRole): string {
  const labels: Record<SupplierRole, string> = {
    OWNER: 'Owner',
    MANAGER: 'Manager',
    STAFF: 'Staff',
  };
  return labels[role] || role;
}

export function getRoleBadgeColor(role: SupplierRole): string {
  const colors: Record<SupplierRole, string> = {
    OWNER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    STAFF: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}
