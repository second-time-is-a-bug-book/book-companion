import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dueReminders,
  type ReminderCandidate,
} from '../src/domain/reminders.ts';

const base: ReminderCandidate = {
  id: 1,
  number: 'INV-0001',
  status: 'sent',
  dueDate: '2026-03-01',
  lastRemindedOn: null,
};

test('a never-reminded overdue invoice is reminded', () => {
  assert.deepEqual(dueReminders([base], '2026-03-04'), [
    { invoiceId: 1, invoiceNumber: 'INV-0001', daysOverdue: 3 },
  ]);
});

test('invoices that are not overdue get nothing', () => {
  const candidates = [
    { ...base, status: 'paid' },
    { ...base, id: 2, dueDate: '2026-03-10' },
  ];
  assert.deepEqual(dueReminders(candidates, '2026-03-04'), []);
});

test('no second reminder within the reminder interval', () => {
  const reminded = { ...base, lastRemindedOn: '2026-03-02' };
  assert.deepEqual(dueReminders([reminded], '2026-03-08'), []);
  assert.equal(
    dueReminders([reminded], '2026-03-09').length,
    1,
  ); // 7 days later
});
