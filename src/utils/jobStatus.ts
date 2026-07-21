import { JobStatus } from '@/types/generated/enums/job'

export const jobStatusLabels: Record<JobStatus, string> = {
  [JobStatus.ENQUIRY]: 'Enquiry',
  [JobStatus.BOOKED]: 'Booked',
  [JobStatus.CHECKED_IN]: 'Checked In',
  [JobStatus.DIAGNOSIS]: 'Diagnosis',
  [JobStatus.QUOTED]: 'Quoted',
  [JobStatus.AWAITING_AUTHORISATION]: 'Awaiting Authorisation',
  [JobStatus.APPROVED]: 'Approved',
  [JobStatus.PARTS_ORDERED]: 'Parts Ordered',
  [JobStatus.IN_REPAIR]: 'In Repair',
  [JobStatus.QUALITY_CHECK]: 'Quality Check',
  [JobStatus.COMPLETE]: 'Complete',
  [JobStatus.COLLECTED]: 'Collected',
  [JobStatus.CANCELLED]: 'Cancelled',
}

/** Maps each lifecycle status onto the UiBadge variants (open/progress/done/cancelled/pending) */
export const jobStatusBadgeVariant: Record<JobStatus, string> = {
  [JobStatus.ENQUIRY]: 'open',
  [JobStatus.BOOKED]: 'open',
  [JobStatus.CHECKED_IN]: 'progress',
  [JobStatus.DIAGNOSIS]: 'progress',
  [JobStatus.QUOTED]: 'pending',
  [JobStatus.AWAITING_AUTHORISATION]: 'pending',
  [JobStatus.APPROVED]: 'progress',
  [JobStatus.PARTS_ORDERED]: 'pending',
  [JobStatus.IN_REPAIR]: 'progress',
  [JobStatus.QUALITY_CHECK]: 'progress',
  [JobStatus.COMPLETE]: 'done',
  [JobStatus.COLLECTED]: 'done',
  [JobStatus.CANCELLED]: 'cancelled',
}
