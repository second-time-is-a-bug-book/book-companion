# Incident log

One entry per agent mistake that got past you: into review, a
commit, or production. The first time is the model's; the
second time is a bug in your harness. Newest entry at the top.

A first miss fills steps 1 and 2: the fix goes in, and a guide
line under step 3 is optional. When the same root cause comes
back, complete the entry: a sensor that catches it (3), its
placement (4), a seeded-defect proof (5) and a retirement
condition. Mistakes you cannot afford even once (destructive or
irreversible actions, leaked secrets) get the complete entry at
once.

---

## YYYY-MM-DD: <the symptom, in one line>

**1. Symptom.** What you saw, where, and who saw it first. Link
the diff or log.

**2. Root cause.** Why the agent could do this. Keep asking
"why" until the answer is about your harness (missing context,
a wrong guide, no sensor), not about the model being careless.

**3. Control.** What stops it next time, and which kind it is:
guide (tells the agent before it acts) or sensor (catches the
result after); computational (a script decides) or inferential
(a model decides). Name the file.

**4. Placement.** Where the control runs: edit, commit, build,
deploy or live. Earlier is cheaper to fix; later sees more. Say
why you chose this one.

**5. Proof.** The seeded defect that shows the control works:
it passes without the mistake and fails with it. Give the
command and the output.

**Retire when.** The condition under which this control can be
deleted.

**Card.** The pattern card this became, if any (PNN).
