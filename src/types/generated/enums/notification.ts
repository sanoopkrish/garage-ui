// Auto-generated from backend enums
// Source: src/shared/enums/notification.enum.ts
// Generated at: 2026-11-11T13:39:36.185Z
// DO NOT EDIT MANUALLY - This file is auto-generated

export enum NotificationRecipientTag {
  ADMIN = 'admin',
  MANAGEMENT = 'management',
  WORKSHOP_MANAGER = 'workshop_manager',
  RECEPTIONIST = 'receptionist',
  ACCOUNTS = 'accounts',
  TECHNICIAN = 'technician',
  FIELD_ENGINEER = 'field_engineer',
}

export const NotificationRecipientTagLabels: Record<NotificationRecipientTag, string> = {
  [NotificationRecipientTag.ADMIN]: 'admin',
  [NotificationRecipientTag.MANAGEMENT]: 'management',
  [NotificationRecipientTag.WORKSHOP_MANAGER]: 'workshop_manager',
  [NotificationRecipientTag.RECEPTIONIST]: 'receptionist',
  [NotificationRecipientTag.ACCOUNTS]: 'accounts',
  [NotificationRecipientTag.TECHNICIAN]: 'technician',
  [NotificationRecipientTag.FIELD_ENGINEER]: 'field_engineer',
};

export const NotificationRecipientTagValues = Object.values(NotificationRecipientTag);

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const NotificationPriorityLabels: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: 'low',
  [NotificationPriority.MEDIUM]: 'medium',
  [NotificationPriority.HIGH]: 'high',
  [NotificationPriority.CRITICAL]: 'critical',
};

export const NotificationPriorityValues = Object.values(NotificationPriority);

export enum NotificationCategory {
  WORKSHOP = 'workshop',
  FINANCE = 'finance',
  STOCK = 'stock',
  ALERT = 'alert',
  STAFF = 'staff',
  EXTERNAL = 'external',
  SYSTEM = 'system',
}

export const NotificationCategoryLabels: Record<NotificationCategory, string> = {
  [NotificationCategory.WORKSHOP]: 'workshop',
  [NotificationCategory.FINANCE]: 'finance',
  [NotificationCategory.STOCK]: 'stock',
  [NotificationCategory.ALERT]: 'alert',
  [NotificationCategory.STAFF]: 'staff',
  [NotificationCategory.EXTERNAL]: 'external',
  [NotificationCategory.SYSTEM]: 'system',
};

export const NotificationCategoryValues = Object.values(NotificationCategory);

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
}

export const NotificationChannelLabels: Record<NotificationChannel, string> = {
  [NotificationChannel.IN_APP]: 'in_app',
  [NotificationChannel.EMAIL]: 'email',
  [NotificationChannel.SMS]: 'sms',
  [NotificationChannel.WEBHOOK]: 'webhook',
};

export const NotificationChannelValues = Object.values(NotificationChannel);

export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export const NotificationDeliveryStatusLabels: Record<NotificationDeliveryStatus, string> = {
  [NotificationDeliveryStatus.PENDING]: 'pending',
  [NotificationDeliveryStatus.SENT]: 'sent',
  [NotificationDeliveryStatus.DELIVERED]: 'delivered',
  [NotificationDeliveryStatus.FAILED]: 'failed',
  [NotificationDeliveryStatus.BOUNCED]: 'bounced',
};

export const NotificationDeliveryStatusValues = Object.values(NotificationDeliveryStatus);

export enum ExternalContactType {
  CUSTOMER = 'customer',
  INSURANCE_COMPANY = 'insurance_company',
  SUPPLIER = 'supplier',
  OTHER = 'other',
}

export const ExternalContactTypeLabels: Record<ExternalContactType, string> = {
  [ExternalContactType.CUSTOMER]: 'customer',
  [ExternalContactType.INSURANCE_COMPANY]: 'insurance_company',
  [ExternalContactType.SUPPLIER]: 'supplier',
  [ExternalContactType.OTHER]: 'other',
};

export const ExternalContactTypeValues = Object.values(ExternalContactType);

export enum NotificationType {
  TASK_ASSIGNMENT = 'task_assignment',
  APPROVAL_NEEDED = 'approval_needed',
  ESCALATION = 'escalation',
  SYSTEM_ALERT = 'system_alert',
  JOB_ASSIGNED = 'job_assigned',
  JOB_IN_PROGRESS = 'job_in_progress',
  JOB_READY_FOR_COLLECTION = 'job_ready_for_collection',
  JOB_COMPLETED_FIELD = 'job_completed_field',
  VEHICLE_UNCOLLECTED = 'vehicle_uncollected',
  QUOTE_READY = 'quote_ready',
  QUOTE_APPROVED = 'quote_approved',
  QUOTE_FOLLOW_UP = 'quote_follow_up',
  INVOICE_ISSUED = 'invoice_issued',
  PAYMENT_RECEIVED = 'payment_received',
  STORAGE_CHARGE_APPLIED = 'storage_charge_applied',
  PARTS_RECEIVED = 'parts_received',
  PARTS_DELAYED = 'parts_delayed',
  USER_CREATED = 'user_created',
  PASSWORD_RESET = 'password_reset',
  CALENDAR_SYNC = 'calendar_sync',
  CALENDAR_REMINDER = 'calendar_reminder',
  MEETING_REMINDER = 'meeting_reminder',
  BROADCAST = 'broadcast',
}

export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.TASK_ASSIGNMENT]: 'task_assignment',
  [NotificationType.APPROVAL_NEEDED]: 'approval_needed',
  [NotificationType.ESCALATION]: 'escalation',
  [NotificationType.SYSTEM_ALERT]: 'system_alert',
  [NotificationType.JOB_ASSIGNED]: 'job_assigned',
  [NotificationType.JOB_IN_PROGRESS]: 'job_in_progress',
  [NotificationType.JOB_READY_FOR_COLLECTION]: 'job_ready_for_collection',
  [NotificationType.JOB_COMPLETED_FIELD]: 'job_completed_field',
  [NotificationType.VEHICLE_UNCOLLECTED]: 'vehicle_uncollected',
  [NotificationType.QUOTE_READY]: 'quote_ready',
  [NotificationType.QUOTE_APPROVED]: 'quote_approved',
  [NotificationType.QUOTE_FOLLOW_UP]: 'quote_follow_up',
  [NotificationType.INVOICE_ISSUED]: 'invoice_issued',
  [NotificationType.PAYMENT_RECEIVED]: 'payment_received',
  [NotificationType.STORAGE_CHARGE_APPLIED]: 'storage_charge_applied',
  [NotificationType.PARTS_RECEIVED]: 'parts_received',
  [NotificationType.PARTS_DELAYED]: 'parts_delayed',
  [NotificationType.USER_CREATED]: 'user_created',
  [NotificationType.PASSWORD_RESET]: 'password_reset',
  [NotificationType.CALENDAR_SYNC]: 'calendar_sync',
  [NotificationType.CALENDAR_REMINDER]: 'calendar_reminder',
  [NotificationType.MEETING_REMINDER]: 'meeting_reminder',
  [NotificationType.BROADCAST]: 'broadcast',
};

export const NotificationTypeValues = Object.values(NotificationType);

export enum DigestFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export const DigestFrequencyLabels: Record<DigestFrequency, string> = {
  [DigestFrequency.DAILY]: 'daily',
  [DigestFrequency.WEEKLY]: 'weekly',
};

export const DigestFrequencyValues = Object.values(DigestFrequency);

