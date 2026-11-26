// Auto-generated from backend enums
// Source: src/shared/enums/portal.enum.ts
// Generated at: 2026-11-24T14:37:23.388Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum PortalContactRole {
  PRIMARY = 'primary',
  BILLING = 'billing',
  DRIVER = 'driver',
  OTHER = 'other',
}

export const PortalContactRoleLabels: Record<PortalContactRole, string> = {
  [PortalContactRole.PRIMARY]: 'Primary contact',
  [PortalContactRole.BILLING]: 'Billing',
  [PortalContactRole.DRIVER]: 'Driver',
  [PortalContactRole.OTHER]: 'Other',
};

export const PortalContactRoleValues = Object.values(PortalContactRole);

export enum PortalContactStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export const PortalContactStatusLabels: Record<PortalContactStatus, string> = {
  [PortalContactStatus.INVITED]: 'Invited',
  [PortalContactStatus.ACTIVE]: 'Active',
  [PortalContactStatus.DISABLED]: 'Disabled',
};

export const PortalContactStatusValues = Object.values(PortalContactStatus);

export enum PortalTokenPurpose {
  MAGIC_LINK = 'magic_link',
  INVITE = 'invite',
  SET_PASSWORD = 'set_password',
}

export const PortalTokenPurposeLabels: Record<PortalTokenPurpose, string> = {
  [PortalTokenPurpose.MAGIC_LINK]: 'magic_link',
  [PortalTokenPurpose.INVITE]: 'invite',
  [PortalTokenPurpose.SET_PASSWORD]: 'set_password',
};

export const PortalTokenPurposeValues = Object.values(PortalTokenPurpose);

export enum PortalLinkChannel {
  AUTO = 'auto',
  EMAIL = 'email',
  SMS = 'sms',
}

export const PortalLinkChannelLabels: Record<PortalLinkChannel, string> = {
  [PortalLinkChannel.AUTO]: 'auto',
  [PortalLinkChannel.EMAIL]: 'email',
  [PortalLinkChannel.SMS]: 'sms',
};

export const PortalLinkChannelValues = Object.values(PortalLinkChannel);

export enum NoteVisibility {
  INTERNAL = 'internal',
  CUSTOMER = 'customer',
}

export const NoteVisibilityLabels: Record<NoteVisibility, string> = {
  [NoteVisibility.INTERNAL]: 'Staff only',
  [NoteVisibility.CUSTOMER]: 'Visible to customer',
};

export const NoteVisibilityValues = Object.values(NoteVisibility);

