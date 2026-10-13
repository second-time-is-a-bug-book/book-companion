// Decides which overdue invoices get a reminder today. Pure:
// no clock, no database, no email. The job in
// app/src/jobs/reminder-job.ts does the I/O.
import { REMINDER_INTERVAL_DAYS } from '../config.ts';
import {
  addDays,
  daysOverdue,
  isOverdue,
} from './due-dates.ts';

export interface ReminderCandidate {
  id: number;
  number: string;
  status: string;
  dueDate: string;
  // ISO date of the previous reminder, if any.
  lastRemindedOn: string | null;
}

export interface Reminder {
  invoiceId: number;
  invoiceNumber: string;
  daysOverdue: number;
}

// Never reminded, or last reminded at least the interval ago.
function reminderDue(
  last: string | null,
  today: string,
): boolean {
  if (last === null) return true;
  return addDays(last, REMINDER_INTERVAL_DAYS) <= today;
}

export function dueReminders(
  invoices: ReminderCandidate[],
  today: string,
): Reminder[] {
  return invoices
    .filter((inv) => isOverdue(inv.status, inv.dueDate, today))
    .filter((inv) => reminderDue(inv.lastRemindedOn, today))
    .map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      daysOverdue: daysOverdue(inv.dueDate, today),
    }));
}
