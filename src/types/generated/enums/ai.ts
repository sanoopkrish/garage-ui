// Auto-generated from backend enums
// Source: src/shared/enums/ai.enum.ts
// Generated at: 2026-10-07T14:34:31.132Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum AIFeatureType {
  DIAGNOSTICS_INTELLIGENCE = 'diagnosticsIntelligence',
  COMMUNICATION_DRAFTS = 'communicationDrafts',
  QUOTE_SUGGESTIONS = 'quoteSuggestions',
  PHOTO_DAMAGE_NOTES = 'photoDamageNotes',
  INVOICE_CAPTURE = 'invoiceCapture',
}

export const AIFeatureTypeLabels: Record<AIFeatureType, string> = {
  [AIFeatureType.DIAGNOSTICS_INTELLIGENCE]: 'Diagnostic report intelligence',
  [AIFeatureType.COMMUNICATION_DRAFTS]: 'Message drafting',
  [AIFeatureType.QUOTE_SUGGESTIONS]: 'Quote suggestions',
  [AIFeatureType.PHOTO_DAMAGE_NOTES]: 'Photo damage notes',
  [AIFeatureType.INVOICE_CAPTURE]: 'Supplier invoice reading',
};

export const AIFeatureTypeValues = Object.values(AIFeatureType);

