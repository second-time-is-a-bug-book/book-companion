# T7: Recurring invoices

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

Some clients pay a fixed monthly fee. Add recurring invoices:

- `POST /api/recurring` with a body like
  `{ "clientId": 1, "startDate": "2026-01-31", "lines": [...] }` (lines as for
  `POST /api/invoices`) stores a monthly schedule and answers 201 with it,
  including its `id`. An invalid `startDate` or invalid lines are rejected with
  400 and a message saying why.
- A schedule's invoices fall on its start date and then once a month on the
  same day of the month. When a month is too short, use its last day: a
  schedule starting on 31 January 2024 bills on 31 January, 29 February,
  31 March, 30 April and so on. A short month never shifts the later dates.
- `POST /api/recurring/run` creates every scheduled invoice whose date is on or
  before today and that has not been created yet, oldest first, as a draft,
  with that date as its issue date and the usual due date. It answers 200 with
  `{ "created": [...] }`, the new invoices as `GET /api/invoices/:id` shows
  them. Running it twice creates nothing twice; after months without a run,
  it catches up.
- Schedules are stored in the database.
- Run the job every hour from `app/src/main.ts`, as the reminder job is.

Tell me when you are done.
