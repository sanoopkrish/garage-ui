// Auto-generated from backend enums
// Source: src/shared/enums/invoice.enum.ts
// Generated at: 2026-11-11T13:34:13.789Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  VOID = 'void',
}

export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'draft',
  [InvoiceStatus.ISSUED]: 'issued',
  [InvoiceStatus.VOID]: 'void',
};

export const InvoiceStatusValues = Object.values(InvoiceStatus);

export enum InvoicePaymentStatus {
  UNPAID = 'unpaid',
  PART_PAID = 'part_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export const InvoicePaymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  [InvoicePaymentStatus.UNPAID]: 'unpaid',
  [InvoicePaymentStatus.PART_PAID]: 'part_paid',
  [InvoicePaymentStatus.PAID]: 'paid',
  [InvoicePaymentStatus.OVERDUE]: 'overdue',
};

export const InvoicePaymentStatusValues = Object.values(InvoicePaymentStatus);

export enum InvoiceLineType {
  LABOUR = 'labour',
  PART = 'part',
  DIAGNOSIS_FEE = 'diagnosis_fee',
  STORAGE_CHARGE = 'storage_charge',
  OTHER = 'other',
}

export const InvoiceLineTypeLabels: Record<InvoiceLineType, string> = {
  [InvoiceLineType.LABOUR]: 'labour',
  [InvoiceLineType.PART]: 'part',
  [InvoiceLineType.DIAGNOSIS_FEE]: 'diagnosis_fee',
  [InvoiceLineType.STORAGE_CHARGE]: 'storage_charge',
  [InvoiceLineType.OTHER]: 'other',
};

export const InvoiceLineTypeValues = Object.values(InvoiceLineType);

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  DEPOSIT_APPLIED = 'deposit_applied',
}

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CARD]: 'card',
  [PaymentMethod.BANK_TRANSFER]: 'bank_transfer',
  [PaymentMethod.CASH]: 'cash',
  [PaymentMethod.DEPOSIT_APPLIED]: 'deposit_applied',
};

export const PaymentMethodValues = Object.values(PaymentMethod);

