// Auto-generated from backend enums
// Source: src/shared/enums/attachment.enum.ts
// Generated at: 2026-07-21T10:29:19.789Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum AttachmentEntityType {
  JOB = 'job',
  CUSTOMER = 'customer',
  VEHICLE = 'vehicle',
  QUOTE = 'quote',
  INVOICE = 'invoice',
  PARTS_ORDER = 'parts_order',
}

export const AttachmentEntityTypeLabels: Record<AttachmentEntityType, string> = {
  [AttachmentEntityType.JOB]: 'job',
  [AttachmentEntityType.CUSTOMER]: 'customer',
  [AttachmentEntityType.VEHICLE]: 'vehicle',
  [AttachmentEntityType.QUOTE]: 'quote',
  [AttachmentEntityType.INVOICE]: 'invoice',
  [AttachmentEntityType.PARTS_ORDER]: 'parts_order',
};

export const AttachmentEntityTypeValues = Object.values(AttachmentEntityType);

export enum AttachmentCategory {
  ARRIVAL_PHOTO = 'arrival_photo',
  CHECKIN_PHOTO = 'checkin_photo',
  WIP_PHOTO = 'wip_photo',
  COMPLETION_PHOTO = 'completion_photo',
  DIAGNOSTIC_REPORT = 'diagnostic_report',
  CERTIFICATE = 'certificate',
  SUPPLIER_INVOICE = 'supplier_invoice',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export const AttachmentCategoryLabels: Record<AttachmentCategory, string> = {
  [AttachmentCategory.ARRIVAL_PHOTO]: 'arrival_photo',
  [AttachmentCategory.CHECKIN_PHOTO]: 'checkin_photo',
  [AttachmentCategory.WIP_PHOTO]: 'wip_photo',
  [AttachmentCategory.COMPLETION_PHOTO]: 'completion_photo',
  [AttachmentCategory.DIAGNOSTIC_REPORT]: 'diagnostic_report',
  [AttachmentCategory.CERTIFICATE]: 'certificate',
  [AttachmentCategory.SUPPLIER_INVOICE]: 'supplier_invoice',
  [AttachmentCategory.DOCUMENT]: 'document',
  [AttachmentCategory.OTHER]: 'other',
};

export const AttachmentCategoryValues = Object.values(AttachmentCategory);

