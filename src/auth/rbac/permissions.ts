export const Permission = {
  // Girvi
  GIRVI_CREATE: 'girvi:create',
  GIRVI_VIEW: 'girvi:view',
  GIRVI_UPDATE: 'girvi:update',
  GIRVI_CLOSE: 'girvi:close',

  // Customers
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_UPDATE: 'customer:update',

  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',

  // Sales
  SALES_CREATE: 'sales:create',
  SALES_VIEW: 'sales:view',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Staff
  STAFF_MANAGE: 'staff:manage',
  DEVICE_APPROVE: 'device:approve',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  OWNER: Object.values(Permission),

  MANAGER: [
    Permission.GIRVI_CREATE,
    Permission.GIRVI_VIEW,
    Permission.GIRVI_UPDATE,
    Permission.GIRVI_CLOSE,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_UPDATE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_MANAGE,
    Permission.SALES_CREATE,
    Permission.SALES_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.DEVICE_APPROVE,
  ],

  ACCOUNTANT: [
    Permission.GIRVI_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.SALES_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],

  STAFF: [
    Permission.GIRVI_CREATE,
    Permission.GIRVI_VIEW,
    Permission.GIRVI_UPDATE,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.SALES_CREATE,
    Permission.SALES_VIEW,
  ],

  VIEWER: [
    Permission.GIRVI_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.SALES_VIEW,
    Permission.REPORTS_VIEW,
  ],
};
