import { MemoryCategory, SourceType, VerificationStatus } from '../types/memory';

export interface PastelStyle {
  bg: string;
  text: string;
  border?: string;
}

export const PASTEL_BADGES = {
  blue: 'bg-[var(--pastel-blue)] text-[var(--ink-blue)]',
  green: 'bg-[var(--pastel-green)] text-[var(--ink-green)]',
  red: 'bg-[var(--pastel-red)] text-[var(--ink-red)]',
  yellow: 'bg-[var(--pastel-yellow)] text-[var(--ink-yellow)]',
  lavender: 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]',
  purple: 'bg-[var(--pastel-purple)] text-[var(--ink-purple)]',
  cyan: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
} as const;

export function getSourcePastelClass(sourceType: SourceType | string): string {
  switch (sourceType) {
    case 'WhatsApp Export':
    case 'WhatsApp ZIP':
      return PASTEL_BADGES.green;
    case 'Gmail':
      return PASTEL_BADGES.red;
    case 'Google Calendar':
      return PASTEL_BADGES.blue;
    case 'Audio':
    case 'Video':
      return PASTEL_BADGES.purple;
    case 'PDF Document':
    case 'DOCX Document':
    case 'Image':
    case 'Text File':
      return PASTEL_BADGES.cyan;
    default:
      return PASTEL_BADGES.lavender;
  }
}

export function getImportancePastelClass(category: string): string {
  switch (category) {
    case 'Critical':
      return PASTEL_BADGES.red;
    case 'High':
      return PASTEL_BADGES.yellow;
    case 'Medium':
      return PASTEL_BADGES.blue;
    case 'Low':
      return PASTEL_BADGES.cyan;
    default:
      return PASTEL_BADGES.lavender;
  }
}

export function getCategoryPastelClass(category: MemoryCategory | string): string {
  switch (category) {
    case 'Deadlines':
      return PASTEL_BADGES.yellow;
    case 'Events':
      return PASTEL_BADGES.blue;
    case 'Decisions':
    case 'Questions':
      return PASTEL_BADGES.lavender;
    case 'Commitments':
    case 'Tasks':
      return PASTEL_BADGES.green;
    case 'People':
    case 'Relationships':
    case 'Preferences':
      return PASTEL_BADGES.purple;
    case 'Projects':
    case 'Announcements':
      return PASTEL_BADGES.cyan;
    default:
      return PASTEL_BADGES.lavender;
  }
}

export function getStatusPastelClass(status: VerificationStatus | string): string {
  switch (status) {
    case 'Verified':
    case 'Completed':
    case 'Confirmed':
    case 'Answer found':
    case 'Official / Authoritative':
    case 'Analyzed':
    case 'Indexed':
      return PASTEL_BADGES.green;
    case 'Conflicted':
    case 'Conflicting':
    case 'Overdue':
    case 'Unresolved':
    case 'Urgent':
    case 'Failed':
      return PASTEL_BADGES.red;
    case 'Needs Review':
    case 'Needs attention':
    case 'Needs Confirmation':
    case 'Rescheduled':
    case 'Pending':
    case 'Unconfirmed':
    case 'High':
      return PASTEL_BADGES.yellow;
    case 'Processing':
    case 'Uploaded':
      return PASTEL_BADGES.blue;
    default:
      return PASTEL_BADGES.lavender;
  }
}
