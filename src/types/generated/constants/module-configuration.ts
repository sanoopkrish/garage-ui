// Auto-generated from backend constants
// Source: src/shared/constants/module-configuration.ts
// Generated at: 2026-10-07T14:34:31.132Z
// DO NOT EDIT MANUALLY - This file is auto-generated


/**
 * All configurable module keys (administration is always enabled)
 */
export const CONFIGURABLE_MODULE_KEYS = [
  'dashboard',
  'workshop',
  'crm',
  'team',
  'stock',
  'finance',
  'hr',
  'assets',
] as const;

export type ModuleKey = typeof CONFIGURABLE_MODULE_KEYS[number];

/**
 * Submodule definitions for each module
 */
export const MODULE_SUBMODULES: Record<ModuleKey, readonly string[]> = {
  dashboard: [],
  workshop:  ['jobs', 'schedule'],
  crm:       ['customers', 'vehicles'],
  team:      ['technicians'],
  stock:     ['inventory'],
  finance:   ['invoices', 'statements', 'supplierInvoices', 'creditNotes', 'procurement', 'suppliers'],
  hr:        ['attendance', 'timesheets'],
  assets:    ['register'],
};

/**
 * Interface for submodule configuration
 */
export interface SubmoduleConfig {
  [key: string]: boolean;
}

/**
 * Interface for module configuration
 */
export interface ModuleConfig {
  enabled: boolean;
  submodules: SubmoduleConfig;
}

/**
 * Interface for all enabled modules
 */
export type EnabledModules = {
  [K in ModuleKey]?: ModuleConfig;
};

/**
 * Generate default enabled modules configuration
 * All modules and submodules enabled by default
 */
export function getDefaultEnabledModules(): EnabledModules {
  const result: EnabledModules = {};

  for (const moduleKey of CONFIGURABLE_MODULE_KEYS) {
    const submodules: SubmoduleConfig = {};
    for (const subKey of MODULE_SUBMODULES[moduleKey]) {
      submodules[subKey] = true;
    }
    result[moduleKey] = { enabled: true, submodules };
  }

  return result;
}

/**
 * Get submodule keys for a specific module
 */
export function getSubmoduleKeys(moduleKey: ModuleKey): readonly string[] {
  return MODULE_SUBMODULES[moduleKey] || [];
}

/**
 * Check if a module key is valid
 */
export function isValidModuleKey(key: string): key is ModuleKey {
  return CONFIGURABLE_MODULE_KEYS.includes(key as ModuleKey);
}

/**
 * Check if a submodule key is valid for a given module
 */
export function isValidSubmoduleKey(moduleKey: ModuleKey, submoduleKey: string): boolean {
  return MODULE_SUBMODULES[moduleKey]?.includes(submoduleKey) ?? false;
}

/**
 * Human-readable labels for every permission key used in the roles UI
 */
export const PERMISSION_LABELS: Record<string, { label: string; description?: string }> = {
  // ==================== MODULES ====================
  dashboard:      { label: 'Dashboard',    description: 'Main dashboard overview' },
  workshop:       { label: 'Workshop',     description: 'Jobs and scheduling' },
  crm:            { label: 'CRM',          description: 'Customers and vehicles' },
  team:           { label: 'Team',         description: 'Technician management' },
  stock:          { label: 'Stock',        description: 'Inventory and parts' },
  finance:        { label: 'Finance',      description: 'Invoices and payments' },
  hr:             { label: 'HR',           description: 'Clocking in and timesheets' },
  assets:         { label: 'Assets',       description: 'Equipment register and where it is' },
  administration: { label: 'Administration', description: 'System administration and settings' },

  // ==================== SUBMODULES ====================
  jobs:        { label: 'Jobs',        description: 'Work orders and repair jobs' },
  schedule:    { label: 'Schedule',    description: 'Appointment scheduling' },
  customers:   { label: 'Customers',   description: 'Customer records' },
  vehicles:    { label: 'Vehicles',    description: 'Vehicle records' },
  technicians: { label: 'Technicians', description: 'Technician profiles' },
  inventory:   { label: 'Inventory',   description: 'Parts and stock management' },
  invoices:    { label: 'Invoices',    description: 'Invoice management' },
  statements:  { label: 'Statements',  description: 'B2B statements of account' },
  supplierInvoices: { label: 'Supplier Invoices', description: 'Supplier purchase invoices for accountant review' },
  attendance:  { label: 'Attendance',  description: 'Clock-in / clock-out records and corrections' },
  timesheets:  { label: 'Timesheets',  description: 'Weekly timesheets, approval and payroll export' },
  creditNotes: { label: 'Credit Notes', description: 'Credit notes, allocations and the trade credit switch' },
  register:    { label: 'Asset register', description: 'Diagnostic kit, equipment and tool kits — location, calibration, value' },
  procurement: { label: 'Purchasing',   description: 'Purchase orders, deliveries and supplier invoices' },
  suppliers:   { label: 'Suppliers',    description: 'Supplier records, terms and bank details' },

  // Administration submodules
  users:        { label: 'Users',         description: 'User account management' },
  systemRoles:  { label: 'System Roles',  description: 'Role and permission management' },
  company:      { label: 'Company',       description: 'Company settings' },
  general:      { label: 'General',       description: 'General company settings' },
  locations:    { label: 'Locations',     description: 'Company locations' },
  masterData:   { label: 'Master Data',   description: 'Departments, job titles, employment types and roles' },
  departments:       { label: 'Departments',       description: 'Department management' },
  jobTitles:         { label: 'Job Titles',         description: 'Job title management' },
  employmentTypes:   { label: 'Employment Types',   description: 'Employment type management' },
  employeeRoles:     { label: 'Employee Roles',     description: 'Employee role management' },
  skills:            { label: 'Skills',             description: 'Technician skill management' },
  auditLogs:     { label: 'Audit Logs',    description: 'System audit trail' },
  settings:      { label: 'Settings',      description: 'System settings' },

  // Settings sub-tabs
  business:      { label: 'Business',       description: 'Business information and contact details' },
  billing:       { label: 'Billing / VAT',  description: 'VAT rates, payment terms and bank details' },
  notifications: { label: 'Notifications',  description: 'Notification channels and preferences' },
  security:      { label: 'Security',       description: 'Security and access settings' },
  appearance:    { label: 'Appearance',     description: 'Theme and display preferences' },
  integrations:  { label: 'Integrations',   description: 'Xero accounting feed and RAM vehicle tracking' },

  // ==================== ACTIONS ====================
  create: { label: 'Create', description: 'Permission to create new records' },
  read:   { label: 'View',   description: 'Permission to view records' },
  update: { label: 'Edit',   description: 'Permission to modify records' },
  delete: { label: 'Delete', description: 'Permission to delete records' },

  // Job-specific actions
  assignTechnician: { label: 'Assign Technician', description: 'Assign a technician to a job' },
  updateStatus:     { label: 'Update Status',     description: 'Change job status' },

  // Invoice-specific actions
  send:     { label: 'Send Invoice',   description: 'Send invoice to customer' },
  markPaid: { label: 'Mark as Paid',   description: 'Mark an invoice as paid' },

  // Timesheet actions
  approve:  { label: 'Approve / Reject', description: 'Approve or reject timesheets, enter leave and sick hours' },
  reopen:   { label: 'Reopen',           description: 'Reopen an approved (locked) timesheet for correction' },

  // Credit note actions
  issue:    { label: 'Issue / Allocate / Void', description: 'Issue credit notes, allocate them to invoices, void unallocated ones' },

  // Purchasing actions
  createOrder:  { label: 'Raise Orders',      description: 'Create, edit, send and cancel purchase orders' },
  approveOrder: { label: 'Approve Orders',    description: 'Approve or reject purchase orders over the approval limit' },
  receive:      { label: 'Book In Deliveries', description: 'Record goods received against an order' },
  manageBills:  { label: 'Supplier Invoices', description: 'Enter, upload, match, approve and dispute supplier invoices' },
  payBills:     { label: 'Record Payments',   description: 'Record payments made to suppliers' },

  // Inventory-specific actions
  adjustStock: { label: 'Adjust Stock', description: 'Adjust stock levels' },

  // Role management
  configPermission: { label: 'Configure Permissions', description: 'Configure role permissions' },

  // Notification actions
  managePreferences: { label: 'Manage Preferences', description: 'Manage notification preferences' },
  broadcast:         { label: 'Broadcast',           description: 'Broadcast notifications to all users' },
  sendSystem:        { label: 'Send System',         description: 'Send system notifications' },
  viewStats:         { label: 'View Statistics',     description: 'View notification statistics' },
  companySettings:   { label: 'Company Settings',    description: 'Company notification configuration' },
  roleNotificationTags: { label: 'Role Tags', description: 'Configure notification routing tags' },

  // Audit log actions
  export:             { label: 'Export',              description: 'Export records' },
  viewEntityHistory:  { label: 'View Entity History', description: 'View record change history' },
  viewUserActivity:   { label: 'View User Activity',  description: 'View user activity logs' },
};

/**
 * Get label for a permission key — falls back to formatted camelCase
 */
export function getPermissionLabel(key: string): string {
  const info = PERMISSION_LABELS[key];
  if (info) return info.label;
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

/**
 * Get description for a permission key
 */
export function getPermissionDescription(key: string): string | undefined {
  return PERMISSION_LABELS[key]?.description;
}
