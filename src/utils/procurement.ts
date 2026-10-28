import {
  PurchaseOrderKind, PurchaseOrderStatus, SupplierCategory, SupplierInvoiceMatchStatus, SupplierInvoiceStatus, SupplierStatus,
  GoodsReceiptCondition,
} from '@/types/generated/enums/procurement'

/** Labels + badge variants for purchasing (Sprint 23) */

export const orderStatusLabels: Record<string, string> = {
  [PurchaseOrderStatus.DRAFT]: 'Draft',
  [PurchaseOrderStatus.PENDING_APPROVAL]: 'Awaiting approval',
  [PurchaseOrderStatus.APPROVED]: 'Approved',
  [PurchaseOrderStatus.REJECTED]: 'Rejected',
  [PurchaseOrderStatus.SENT_TO_SUPPLIER]: 'Sent to supplier',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'Part received',
  [PurchaseOrderStatus.FULLY_RECEIVED]: 'Received',
  [PurchaseOrderStatus.CLOSED]: 'Closed',
  [PurchaseOrderStatus.CANCELLED]: 'Cancelled',
  // job parts orders share the one list
  to_order: 'To order',
  ordered: 'Ordered',
  delayed: 'Delayed',
  received: 'Received',
  wrong_part: 'Wrong part',
  returned: 'Returned',
}

export const orderStatusVariant: Record<string, string> = {
  [PurchaseOrderStatus.DRAFT]: 'pending',
  [PurchaseOrderStatus.PENDING_APPROVAL]: 'progress',
  [PurchaseOrderStatus.APPROVED]: 'open',
  [PurchaseOrderStatus.REJECTED]: 'cancelled',
  [PurchaseOrderStatus.SENT_TO_SUPPLIER]: 'info',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'progress',
  [PurchaseOrderStatus.FULLY_RECEIVED]: 'done',
  [PurchaseOrderStatus.CLOSED]: 'pending',
  [PurchaseOrderStatus.CANCELLED]: 'cancelled',
  to_order: 'pending',
  ordered: 'info',
  delayed: 'progress',
  received: 'done',
  wrong_part: 'cancelled',
  returned: 'pending',
}

export const orderKindLabels: Record<string, string> = {
  [PurchaseOrderKind.STOCK_PARTS]: 'Stock parts',
  [PurchaseOrderKind.CONSUMABLES]: 'Consumables',
  [PurchaseOrderKind.EQUIPMENT]: 'Equipment',
  [PurchaseOrderKind.SERVICES]: 'Services',
  [PurchaseOrderKind.OTHER]: 'Other',
  job_parts: 'Job parts',
}

export const supplierCategoryLabels: Record<string, string> = {
  [SupplierCategory.PARTS]: 'Parts',
  [SupplierCategory.TYRES]: 'Tyres',
  [SupplierCategory.CONSUMABLES]: 'Consumables',
  [SupplierCategory.EQUIPMENT]: 'Equipment',
  [SupplierCategory.SERVICES]: 'Services',
  [SupplierCategory.UTILITIES]: 'Utilities',
}

export const supplierStatusLabels: Record<string, string> = {
  [SupplierStatus.ACTIVE]: 'Active',
  [SupplierStatus.INACTIVE]: 'Inactive',
  [SupplierStatus.BLOCKED]: 'Blocked',
}
export const supplierStatusVariant: Record<string, string> = {
  [SupplierStatus.ACTIVE]: 'done',
  [SupplierStatus.INACTIVE]: 'pending',
  [SupplierStatus.BLOCKED]: 'cancelled',
}

export const billStatusLabels: Record<string, string> = {
  [SupplierInvoiceStatus.RECEIVED]: 'To check',
  [SupplierInvoiceStatus.MATCHED]: 'Ready to approve',
  [SupplierInvoiceStatus.APPROVED]: 'Approved',
  [SupplierInvoiceStatus.PAID]: 'Paid',
  [SupplierInvoiceStatus.DISPUTED]: 'Disputed',
  [SupplierInvoiceStatus.VOID]: 'Void',
}
export const billStatusVariant: Record<string, string> = {
  [SupplierInvoiceStatus.RECEIVED]: 'progress',
  [SupplierInvoiceStatus.MATCHED]: 'open',
  [SupplierInvoiceStatus.APPROVED]: 'info',
  [SupplierInvoiceStatus.PAID]: 'done',
  [SupplierInvoiceStatus.DISPUTED]: 'cancelled',
  [SupplierInvoiceStatus.VOID]: 'pending',
}

export const matchStatusLabels: Record<string, string> = {
  [SupplierInvoiceMatchStatus.MATCHED]: 'Matches order',
  [SupplierInvoiceMatchStatus.VARIANCE]: 'Does not match',
  [SupplierInvoiceMatchStatus.UNMATCHED]: 'No order',
}

export const conditionLabels: Record<string, string> = {
  [GoodsReceiptCondition.GOOD]: 'Good',
  [GoodsReceiptCondition.DAMAGED]: 'Damaged',
  [GoodsReceiptCondition.DEFECTIVE]: 'Defective',
  [GoodsReceiptCondition.WRONG_ITEM]: 'Wrong item',
}

export const gbp = (value: number | null | undefined) =>
  `£${Number(value ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const todayIso = () => new Date().toISOString().slice(0, 10)

export function apiMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message
  return Array.isArray(message) ? message.join('; ') : (message ?? fallback)
}
