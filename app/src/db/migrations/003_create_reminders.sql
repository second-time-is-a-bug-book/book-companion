-- migrate:up
CREATE TABLE reminders (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_on TEXT NOT NULL,
  days_overdue INTEGER NOT NULL
);

-- migrate:down
DROP TABLE reminders;
