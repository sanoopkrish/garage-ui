import { CreditNoteStatus, CreditNoteReason, CreditNoteLineType } from '@/types/generated/enums/credit-note'

export const creditNoteStatusLabels: Record<CreditNoteStatus, string> = {
  [CreditNoteStatus.DRAFT]: 'Draft',
  [CreditNoteStatus.ISSUED]: 'Issued',
  [CreditNoteStatus.VOID]: 'Void',
}

export const creditNoteStatusVariant: Record<CreditNoteStatus, string> = {
  [CreditNoteStatus.DRAFT]: 'pending',
  [CreditNoteStatus.ISSUED]: 'done',
  [CreditNoteStatus.VOID]: 'cancelled',
}

export const creditNoteReasonLabels: Record<CreditNoteReason, string> = {
  [CreditNoteReason.TRADE_CREDIT]: 'Trade credit',
  [CreditNoteReason.GOODWILL]: 'Goodwill',
  [CreditNoteReason.PRICING_ERROR]: 'Pricing error',
  [CreditNoteReason.RETURNED_PART]: 'Returned part',
  [CreditNoteReason.DUPLICATE]: 'Duplicate invoice',
  [CreditNoteReason.OTHER]: 'Other',
}

export const creditNoteLineTypeLabels: Record<CreditNoteLineType, string> = {
  [CreditNoteLineType.LABOUR]: 'Labour',
  [CreditNoteLineType.PART]: 'Part',
  [CreditNoteLineType.DIAGNOSIS_FEE]: 'Diagnosis fee',
  [CreditNoteLineType.STORAGE_CHARGE]: 'Storage charge',
  [CreditNoteLineType.TRADE_CREDIT]: 'Trade credit',
  [CreditNoteLineType.OTHER]: 'Other',
}
