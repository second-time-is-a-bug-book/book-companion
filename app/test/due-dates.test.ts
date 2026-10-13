// These tests pin every operator in due-dates.ts.
// guards/mini-mutate.ts checks that: each small change to the
// source must make at least one test fail.
import { equal } from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  daysOverdue,
  isOverdue,
} from '../src/domain/due-dates.ts';

const due = '2026-03-01';
const next = '2026-03-02';
const later = '2026-04-01';

test('addDays crosses month and year ends', () => {
  equal(addDays('2026-01-30', 3), '2026-02-02');
  equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('a sent invoice past its due date is overdue', () => {
  equal(isOverdue('sent', due, next), true);
});

test('an invoice due today is not overdue yet', () => {
  equal(isOverdue('sent', due, due), false);
});

test('paid and draft invoices are never overdue', () => {
  equal(isOverdue('paid', due, later), false);
  equal(isOverdue('draft', due, later), false);
});

test('daysOverdue counts whole days, never negative', () => {
  equal(daysOverdue(due, '2026-03-11'), 10);
  equal(daysOverdue('2026-03-11', due), 0);
});
