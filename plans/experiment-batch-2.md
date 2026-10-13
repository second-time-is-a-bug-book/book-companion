# Plan: a second, harder experiment batch

## Goal
Add tasks T4 to T7 for a second Chapter 12 batch, with hidden acceptance
tests and a plan for the batch written before any run.

## Steps
- [x] Shared harness: start on a given database; build a v1.0.0 database
- [x] T4 and T5 with their hidden tests
- [x] T6 and T7 with their hidden tests
- [x] experiment/tasks/BATCH-2.md, PROTOCOL.md and README
- [ ] Remove this plan, so it never reaches a run folder

## Done when
Each new hidden test fails on the shipped code and passes on a reference
solution kept outside the repository; npm run gate passes at every commit.
