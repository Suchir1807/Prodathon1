# Two-member Exchange test

Use two separate browser profiles so each member has an independent session. Record each step as Pass or Fail.

| # | Action | Expected result | Result |
|---|---|---|---|
| 1 | Sign up as Member A and Member B, then add at least one offered and one wanted skill to each Skill Passport. | Both profiles save; users without skills are directed to onboarding. | |
| 2 | From Member A, open Find Partners and invite Member B. | The invitation appears in Member B's inbox, and duplicate invitations are rejected. | |
| 3 | Accept as Member B. | One active Exchange is created for both members and appears in both Exchanges lists. | |
| 4 | Set a shared weekly goal from each member in turn. | The latest saved goal is visible after reload from either account. | |
| 5 | Book a Session as the learner with the partner selected as teacher. | The learner's balance decreases by the duration; the scheduled Session and SessionRoom appear for both. | |
| 6 | Open the SessionRoom from both accounts. Edit and save notes from one; try saving stale notes from the other. | Notes persist; the stale save receives a conflict and can reload the latest revision. | |
| 7 | Send messages from both accounts. | Messages appear in the SessionRoom chat after polling without reloading. | |
| 8 | Before the scheduled time, try marking the Session complete. | The server rejects early completion. | |
| 9 | After the scheduled time, complete the Session and submit a review with one skill. | Completion is idempotent, the teacher earns the reserved credits, and the reviewed skill appears on their public Skill Passport. | |
| 10 | Create an Ask from one account and accept it from another. | The Ask becomes matched and both members get a new active Exchange. | |
| 11 | Try to book a Session longer than the learner's available credit balance. | The request is rejected without creating a Session or a partial debit. | |
| 12 | Visit `/workspace`, `/workspace/example`, `/sprint`, `/trading-floor`, `/showcase`, and `/showcase/example`. | Old destinations redirect to Exchanges, Sessions, Asks, or the Skill Passport instead of returning a 404. | |
