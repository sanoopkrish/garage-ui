// Auto-generated from backend enums
// Source: src/shared/enums/quote.enum.ts
// Generated at: 2026-11-12T12:26:11.637Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_APPROVED = 'partially_approved',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export const QuoteStatusLabels: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'draft',
  [QuoteStatus.SENT]: 'sent',
  [QuoteStatus.PARTIALLY_APPROVED]: 'partially_approved',
  [QuoteStatus.APPROVED]: 'approved',
  [QuoteStatus.REJECTED]: 'rejected',
  [QuoteStatus.EXPIRED]: 'expired',
};

export const QuoteStatusValues = Object.values(QuoteStatus);

export enum QuoteLineType {
  LABOUR = 'labour',
  PART = 'part',
}

export const QuoteLineTypeLabels: Record<QuoteLineType, string> = {
  [QuoteLineType.LABOUR]: 'labour',
  [QuoteLineType.PART]: 'part',
};

export const QuoteLineTypeValues = Object.values(QuoteLineType);

export enum QuoteLineStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const QuoteLineStatusLabels: Record<QuoteLineStatus, string> = {
  [QuoteLineStatus.PENDING]: 'pending',
  [QuoteLineStatus.APPROVED]: 'approved',
  [QuoteLineStatus.REJECTED]: 'rejected',
};

export const QuoteLineStatusValues = Object.values(QuoteLineStatus);

