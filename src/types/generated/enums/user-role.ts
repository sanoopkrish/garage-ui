// Auto-generated from backend enums
// Source: src/shared/enums/user-role.enum.ts
// Generated at: 2026-07-21T10:29:19.787Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum UserRole {
  ADMIN = 'admin',
  NURSE = 'nurse',
  CAREGIVER = 'caregiver',
  FAMILY = 'familt',
  RESIDENT = 'resident',
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.NURSE]: 'nurse',
  [UserRole.CAREGIVER]: 'caregiver',
  [UserRole.FAMILY]: 'familt',
  [UserRole.RESIDENT]: 'resident',
};

export const UserRoleValues = Object.values(UserRole);

