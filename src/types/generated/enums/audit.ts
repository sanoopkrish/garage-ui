// Auto-generated from backend enums
// Source: src/shared/enums/audit.enum.ts
// Generated at: 2026-11-12T12:26:11.642Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  PRINT = 'PRINT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SIGN_OFF = 'SIGN_OFF',
}

export const AuditActionLabels: Record<AuditAction, string> = {
  [AuditAction.CREATE]: 'CREATE',
  [AuditAction.READ]: 'READ',
  [AuditAction.UPDATE]: 'UPDATE',
  [AuditAction.DELETE]: 'DELETE',
  [AuditAction.EXPORT]: 'EXPORT',
  [AuditAction.PRINT]: 'PRINT',
  [AuditAction.LOGIN]: 'LOGIN',
  [AuditAction.LOGOUT]: 'LOGOUT',
  [AuditAction.FAILED_LOGIN]: 'FAILED_LOGIN',
  [AuditAction.PASSWORD_CHANGE]: 'PASSWORD_CHANGE',
  [AuditAction.PASSWORD_RESET]: 'PASSWORD_RESET',
  [AuditAction.PERMISSION_CHANGE]: 'PERMISSION_CHANGE',
  [AuditAction.BULK_UPDATE]: 'BULK_UPDATE',
  [AuditAction.BULK_DELETE]: 'BULK_DELETE',
  [AuditAction.ARCHIVE]: 'ARCHIVE',
  [AuditAction.RESTORE]: 'RESTORE',
  [AuditAction.APPROVE]: 'APPROVE',
  [AuditAction.REJECT]: 'REJECT',
  [AuditAction.SIGN_OFF]: 'SIGN_OFF',
};

export const AuditActionValues = Object.values(AuditAction);

export enum AuditSensitivityLevel {
  HIGHEST = 'HIGHEST',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export const AuditSensitivityLevelLabels: Record<AuditSensitivityLevel, string> = {
  [AuditSensitivityLevel.HIGHEST]: 'HIGHEST',
  [AuditSensitivityLevel.HIGH]: 'HIGH',
  [AuditSensitivityLevel.MEDIUM]: 'MEDIUM',
  [AuditSensitivityLevel.LOW]: 'LOW',
};

export const AuditSensitivityLevelValues = Object.values(AuditSensitivityLevel);

export enum AuditCategory {
  CUSTOMER_RECORD = 'CUSTOMER_RECORD',
  VEHICLE_RECORD = 'VEHICLE_RECORD',
  JOB_RECORD = 'JOB_RECORD',
  QUOTE = 'QUOTE',
  COMPLIANCE_CERTIFICATE = 'COMPLIANCE_CERTIFICATE',
  WARRANTY_REWORK = 'WARRANTY_REWORK',
  PARTS_ORDER = 'PARTS_ORDER',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  FINANCIAL = 'FINANCIAL',
  STAFF_RECORD = 'STAFF_RECORD',
  HR = 'HR',
  GDPR_CONSENT = 'GDPR_CONSENT',
  GDPR_DATA_BREACH = 'GDPR_DATA_BREACH',
  GDPR_SAR = 'GDPR_SAR',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  ADMINISTRATION = 'ADMINISTRATION',
  DATA_EXPORT = 'DATA_EXPORT',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  GENERAL = 'GENERAL',
}

export const AuditCategoryLabels: Record<AuditCategory, string> = {
  [AuditCategory.CUSTOMER_RECORD]: 'CUSTOMER_RECORD',
  [AuditCategory.VEHICLE_RECORD]: 'VEHICLE_RECORD',
  [AuditCategory.JOB_RECORD]: 'JOB_RECORD',
  [AuditCategory.QUOTE]: 'QUOTE',
  [AuditCategory.COMPLIANCE_CERTIFICATE]: 'COMPLIANCE_CERTIFICATE',
  [AuditCategory.WARRANTY_REWORK]: 'WARRANTY_REWORK',
  [AuditCategory.PARTS_ORDER]: 'PARTS_ORDER',
  [AuditCategory.INVOICE]: 'INVOICE',
  [AuditCategory.PAYMENT]: 'PAYMENT',
  [AuditCategory.FINANCIAL]: 'FINANCIAL',
  [AuditCategory.STAFF_RECORD]: 'STAFF_RECORD',
  [AuditCategory.HR]: 'HR',
  [AuditCategory.GDPR_CONSENT]: 'GDPR_CONSENT',
  [AuditCategory.GDPR_DATA_BREACH]: 'GDPR_DATA_BREACH',
  [AuditCategory.GDPR_SAR]: 'GDPR_SAR',
  [AuditCategory.AUTHENTICATION]: 'AUTHENTICATION',
  [AuditCategory.AUTHORIZATION]: 'AUTHORIZATION',
  [AuditCategory.ADMINISTRATION]: 'ADMINISTRATION',
  [AuditCategory.DATA_EXPORT]: 'DATA_EXPORT',
  [AuditCategory.SYSTEM_CONFIG]: 'SYSTEM_CONFIG',
  [AuditCategory.GENERAL]: 'GENERAL',
};

export const AuditCategoryValues = Object.values(AuditCategory);

export enum RetentionTier {
  TIER_1_10_YEARS = 'TIER_1_10_YEARS',
  TIER_2_6_YEARS = 'TIER_2_6_YEARS',
  TIER_3_3_YEARS = 'TIER_3_3_YEARS',
  TIER_4_1_YEAR = 'TIER_4_1_YEAR',
}

export const RetentionTierLabels: Record<RetentionTier, string> = {
  [RetentionTier.TIER_1_10_YEARS]: 'TIER_1_10_YEARS',
  [RetentionTier.TIER_2_6_YEARS]: 'TIER_2_6_YEARS',
  [RetentionTier.TIER_3_3_YEARS]: 'TIER_3_3_YEARS',
  [RetentionTier.TIER_4_1_YEAR]: 'TIER_4_1_YEAR',
};

export const RetentionTierValues = Object.values(RetentionTier);

