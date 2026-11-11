// Auto-generated from backend enums
// Source: src/shared/enums/procurement.enum.ts
// Generated at: 2026-11-11T13:34:13.788Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export const SupplierStatusLabels: Record<SupplierStatus, string> = {
  [SupplierStatus.ACTIVE]: 'active',
  [SupplierStatus.INACTIVE]: 'inactive',
  [SupplierStatus.BLOCKED]: 'blocked',
};

export const SupplierStatusValues = Object.values(SupplierStatus);

export enum SupplierCategory {
  PARTS = 'parts',
  TYRES = 'tyres',
  CONSUMABLES = 'consumables',
  EQUIPMENT = 'equipment',
  SERVICES = 'services',
  UTILITIES = 'utilities',
}

export const SupplierCategoryLabels: Record<SupplierCategory, string> = {
  [SupplierCategory.PARTS]: 'parts',
  [SupplierCategory.TYRES]: 'tyres',
  [SupplierCategory.CONSUMABLES]: 'consumables',
  [SupplierCategory.EQUIPMENT]: 'equipment',
  [SupplierCategory.SERVICES]: 'services',
  [SupplierCategory.UTILITIES]: 'utilities',
};

export const SupplierCategoryValues = Object.values(SupplierCategory);

export enum PurchaseOrderKind {
  STOCK_PARTS = 'stock_parts',
  CONSUMABLES = 'consumables',
  EQUIPMENT = 'equipment',
  SERVICES = 'services',
  OTHER = 'other',
}

export const PurchaseOrderKindLabels: Record<PurchaseOrderKind, string> = {
  [PurchaseOrderKind.STOCK_PARTS]: 'stock_parts',
  [PurchaseOrderKind.CONSUMABLES]: 'consumables',
  [PurchaseOrderKind.EQUIPMENT]: 'equipment',
  [PurchaseOrderKind.SERVICES]: 'services',
  [PurchaseOrderKind.OTHER]: 'other',
};

export const PurchaseOrderKindValues = Object.values(PurchaseOrderKind);

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT_TO_SUPPLIER = 'sent_to_supplier',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export const PurchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.DRAFT]: 'draft',
  [PurchaseOrderStatus.PENDING_APPROVAL]: 'pending_approval',
  [PurchaseOrderStatus.APPROVED]: 'approved',
  [PurchaseOrderStatus.REJECTED]: 'rejected',
  [PurchaseOrderStatus.SENT_TO_SUPPLIER]: 'sent_to_supplier',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'partially_received',
  [PurchaseOrderStatus.FULLY_RECEIVED]: 'fully_received',
  [PurchaseOrderStatus.CLOSED]: 'closed',
  [PurchaseOrderStatus.CANCELLED]: 'cancelled',
};

export const PurchaseOrderStatusValues = Object.values(PurchaseOrderStatus);

export enum PurchaseOrderItemStatus {
  PENDING = 'pending',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  CANCELLED = 'cancelled',
}

export const PurchaseOrderItemStatusLabels: Record<PurchaseOrderItemStatus, string> = {
  [PurchaseOrderItemStatus.PENDING]: 'pending',
  [PurchaseOrderItemStatus.PARTIALLY_RECEIVED]: 'partially_received',
  [PurchaseOrderItemStatus.FULLY_RECEIVED]: 'fully_received',
  [PurchaseOrderItemStatus.CANCELLED]: 'cancelled',
};

export const PurchaseOrderItemStatusValues = Object.values(PurchaseOrderItemStatus);

export enum GoodsReceiptCondition {
  GOOD = 'good',
  DAMAGED = 'damaged',
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
}

export const GoodsReceiptConditionLabels: Record<GoodsReceiptCondition, string> = {
  [GoodsReceiptCondition.GOOD]: 'good',
  [GoodsReceiptCondition.DAMAGED]: 'damaged',
  [GoodsReceiptCondition.DEFECTIVE]: 'defective',
  [GoodsReceiptCondition.WRONG_ITEM]: 'wrong_item',
};

export const GoodsReceiptConditionValues = Object.values(GoodsReceiptCondition);

export enum SupplierInvoiceStatus {
  RECEIVED = 'received',
  MATCHED = 'matched',
  APPROVED = 'approved',
  PAID = 'paid',
  DISPUTED = 'disputed',
  VOID = 'void',
}

export const SupplierInvoiceStatusLabels: Record<SupplierInvoiceStatus, string> = {
  [SupplierInvoiceStatus.RECEIVED]: 'received',
  [SupplierInvoiceStatus.MATCHED]: 'matched',
  [SupplierInvoiceStatus.APPROVED]: 'approved',
  [SupplierInvoiceStatus.PAID]: 'paid',
  [SupplierInvoiceStatus.DISPUTED]: 'disputed',
  [SupplierInvoiceStatus.VOID]: 'void',
};

export const SupplierInvoiceStatusValues = Object.values(SupplierInvoiceStatus);

export enum SupplierInvoiceMatchStatus {
  UNMATCHED = 'unmatched',
  MATCHED = 'matched',
  VARIANCE = 'variance',
}

export const SupplierInvoiceMatchStatusLabels: Record<SupplierInvoiceMatchStatus, string> = {
  [SupplierInvoiceMatchStatus.UNMATCHED]: 'unmatched',
  [SupplierInvoiceMatchStatus.MATCHED]: 'matched',
  [SupplierInvoiceMatchStatus.VARIANCE]: 'variance',
};

export const SupplierInvoiceMatchStatusValues = Object.values(SupplierInvoiceMatchStatus);

export enum SupplierInvoiceCaptureSource {
  MANUAL = 'manual',
  UPLOAD = 'upload',
  AI = 'ai',
  FIELD = 'field',
}

export const SupplierInvoiceCaptureSourceLabels: Record<SupplierInvoiceCaptureSource, string> = {
  [SupplierInvoiceCaptureSource.MANUAL]: 'manual',
  [SupplierInvoiceCaptureSource.UPLOAD]: 'upload',
  [SupplierInvoiceCaptureSource.AI]: 'ai',
  [SupplierInvoiceCaptureSource.FIELD]: 'field',
};

export const SupplierInvoiceCaptureSourceValues = Object.values(SupplierInvoiceCaptureSource);

