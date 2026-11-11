// Auto-generated from backend enums
// Source: src/shared/enums/credit-note.enum.ts
// Generated at: 2026-11-11T13:39:36.187Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum CreditNoteStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  VOID = 'void',
}

export const CreditNoteStatusLabels: Record<CreditNoteStatus, string> = {
  [CreditNoteStatus.DRAFT]: 'draft',
  [CreditNoteStatus.ISSUED]: 'issued',
  [CreditNoteStatus.VOID]: 'void',
};

export const CreditNoteStatusValues = Object.values(CreditNoteStatus);

export enum CreditNoteReason {
  TRADE_CREDIT = 'trade_credit',
  GOODWILL = 'goodwill',
  PRICING_ERROR = 'pricing_error',
  RETURNED_PART = 'returned_part',
  DUPLICATE = 'duplicate',
  OTHER = 'other',
}

export const CreditNoteReasonLabels: Record<CreditNoteReason, string> = {
  [CreditNoteReason.TRADE_CREDIT]: 'trade_credit',
  [CreditNoteReason.GOODWILL]: 'goodwill',
  [CreditNoteReason.PRICING_ERROR]: 'pricing_error',
  [CreditNoteReason.RETURNED_PART]: 'returned_part',
  [CreditNoteReason.DUPLICATE]: 'duplicate',
  [CreditNoteReason.OTHER]: 'other',
};

export const CreditNoteReasonValues = Object.values(CreditNoteReason);

export enum CreditNoteLineType {
  LABOUR = 'labour',
  PART = 'part',
  DIAGNOSIS_FEE = 'diagnosis_fee',
  STORAGE_CHARGE = 'storage_charge',
  TRADE_CREDIT = 'trade_credit',
  OTHER = 'other',
}

export const CreditNoteLineTypeLabels: Record<CreditNoteLineType, string> = {
  [CreditNoteLineType.LABOUR]: 'labour',
  [CreditNoteLineType.PART]: 'part',
  [CreditNoteLineType.DIAGNOSIS_FEE]: 'diagnosis_fee',
  [CreditNoteLineType.STORAGE_CHARGE]: 'storage_charge',
  [CreditNoteLineType.TRADE_CREDIT]: 'trade_credit',
  [CreditNoteLineType.OTHER]: 'other',
};

export const CreditNoteLineTypeValues = Object.values(CreditNoteLineType);

