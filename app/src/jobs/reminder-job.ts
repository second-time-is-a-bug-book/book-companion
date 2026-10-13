// The overdue-reminder job: read candidates, decide (pure),
// record what was sent. "Sending" is recording a row in the
// reminders table; a real app would email here.
import {
  reminderCandidates,
  recordReminder,
} from '../db/invoices.ts';
import type { Database } from '../db/database.ts';
import {
  dueReminders,
  type Reminder,
} from '../domain/reminders.ts';

export function runReminderJob(
  db: Database,
  today: string,
): Reminder[] {
  const reminders = dueReminders(reminderCandidates(db), today);
  for (const reminder of reminders)
    recordReminder(db, reminder, today);
  return reminders;
}
