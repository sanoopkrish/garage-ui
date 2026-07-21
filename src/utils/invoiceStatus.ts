import { InvoiceStatus, InvoicePaymentStatus, PaymentMethod } from '@/types/generated/enums/invoice'

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'Draft',
  [InvoiceStatus.ISSUED]: 'Issued',
  [InvoiceStatus.VOID]: 'Void',
}

export const paymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  [InvoicePaymentStatus.UNPAID]: 'Unpaid',
  [InvoicePaymentStatus.PART_PAID]: 'Part Paid',
  [InvoicePaymentStatus.PAID]: 'Paid',
  [InvoicePaymentStatus.OVERDUE]: 'Overdue',
}

export const paymentStatusVariant: Record<InvoicePaymentStatus, string> = {
  [InvoicePaymentStatus.UNPAID]: 'open',
  [InvoicePaymentStatus.PART_PAID]: 'progress',
  [InvoicePaymentStatus.PAID]: 'done',
  [InvoicePaymentStatus.OVERDUE]: 'cancelled',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.DEPOSIT_APPLIED]: 'Deposit Applied',
}

export const gbp = (v: number) => `£${Number(v).toFixed(2)}`
