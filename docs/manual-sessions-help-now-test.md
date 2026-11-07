# Sessions and Help Now manual test

Use two separate browser profiles so each member has an independent session. Record each step as Pass or Fail.

| # | Action | Expected result | Result |
|---|---|---|---|
| 1 | Sign up as two new members and complete each profile with offered and learning skills. | Each new account starts with 2 time credits; the skill picker supports categories and custom entries and prevents duplicates across the two lists. | |
| 2 | From one account, invite the other from Find Partners; accept from the second account. | The invitation is visible on the Sessions page under Requests; both members can schedule a Session together. | |
| 3 | Book a scheduled Session with a partner. | The learner's balance decreases by the duration through the ledger; both members see the partner, skill, time, duration, credits, status, and room link. | |
| 4 | Open the room from both accounts, edit notes from one, and attempt a stale save from the other. | Notes persist, the stale save receives a conflict, and Messages continue to work in the room. | |
| 5 | Complete the scheduled Session after its start time and submit reviews. | The teacher receives the held credits; completion is idempotent and reviewed skills appear in the public profile's earned overview. | |
| 6 | In one account, enable Available now and choose several offered skills. In the other, request Help Now for a matching everyday skill. | A short AI answer appears immediately; the helper receives an offer toast with a 90-second countdown on any page. | |
| 7 | Accept the offer and open the room from both accounts. | A Help Now Session and Jitsi room are created; the room shows the helper brief, shared notes, timer, extension, completion, report, and block controls. | |
| 8 | Extend from the learner account, then confirm completion from both accounts and submit quick reviews. | The learner confirms the 15-credit extension; the held credits transfer once, and the recap and three practice steps appear on the Dashboard. | |
| 9 | Cancel an active request or report a no-show in a Help Now room. | The learner's held credits are refunded once and the cancellation safety limit is applied. | |
| 10 | Visit `/exchanges`, `/profile/[id]`, and old profile links. | Legacy paths redirect to Sessions or the canonical `/u/[username]` profile. | |
