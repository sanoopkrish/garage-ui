// Auto-generated from backend enums
// Source: src/shared/enums/attachment.enum.ts
// Generated at: 2026-11-12T12:26:11.642Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum AttachmentEntityType {
  JOB = 'job',
  CUSTOMER = 'customer',
  VEHICLE = 'vehicle',
  QUOTE = 'quote',
  INVOICE = 'invoice',
  PARTS_ORDER = 'parts_order',
  PURCHASE_ORDER = 'purchase_order',
  GOODS_RECEIPT = 'goods_receipt',
  SUPPLIER_INVOICE = 'supplier_invoice',
  ASSET = 'asset',
}

export const AttachmentEntityTypeLabels: Record<AttachmentEntityType, string> = {
  [AttachmentEntityType.JOB]: 'job',
  [AttachmentEntityType.CUSTOMER]: 'customer',
  [AttachmentEntityType.VEHICLE]: 'vehicle',
  [AttachmentEntityType.QUOTE]: 'quote',
  [AttachmentEntityType.INVOICE]: 'invoice',
  [AttachmentEntityType.PARTS_ORDER]: 'parts_order',
  [AttachmentEntityType.PURCHASE_ORDER]: 'purchase_order',
  [AttachmentEntityType.GOODS_RECEIPT]: 'goods_receipt',
  [AttachmentEntityType.SUPPLIER_INVOICE]: 'supplier_invoice',
  [AttachmentEntityType.ASSET]: 'asset',
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
  DELIVERY_NOTE = 'delivery_note',
  DOCUMENT = 'document',
  ASSET_PHOTO = 'asset_photo',
  ASSET_DOCUMENT = 'asset_document',
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
  [AttachmentCategory.DELIVERY_NOTE]: 'delivery_note',
  [AttachmentCategory.DOCUMENT]: 'document',
  [AttachmentCategory.ASSET_PHOTO]: 'asset_photo',
  [AttachmentCategory.ASSET_DOCUMENT]: 'asset_document',
  [AttachmentCategory.OTHER]: 'other',
};

export const AttachmentCategoryValues = Object.values(AttachmentCategory);

