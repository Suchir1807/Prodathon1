# Two-user Quest flow test

## Setup

1. Configure `MONGODB_URI`, `NEXTAUTH_SECRET`, and `GEMINI_API_KEY` in `.env.local`.
2. Run `npm run seed:demo -- --confirm-demo-seed`.
3. Start the app and open two separate browser profiles so each user has an independent session.
4. Sign in as `demo_a` in browser A and `demo_b` in browser B, using the configured `DEMO_PASSWORD` (the seed script default applies when it is unset).

## Test steps

1. In browser B, open **Find Partners**, locate browser A by name or skill, and send a partner request.
   - Expect: the request appears in A's invitation inbox and A receives a notification.
2. In browser A, accept the request.
   - Expect: one pending quest is created with 6–8 generated tasks and a shared spec.
   - If Gemini is unavailable or returns invalid data, expect the tailored sample quest to load instead.
3. In browser B, accept the quest, then accept it in browser A.
   - Expect: the quest becomes active only after both accept; its server deadline is exactly 72 hours after `startedAt`.
4. In either browser, add a task, assign it to A or B, move it across statuses, edit it, reorder it, and delete a temporary task.
   - Expect: the board and counts refresh for both members; a completed task notifies the partner.
5. Edit the shared spec in browser A.
   - Expect: a saved revision and editor are shown in both sessions.
   - Submit a save using the previous revision from browser B.
   - Expect: a conflict response; refresh before retrying.
6. Send a quest message from A.
   - Expect: it appears in B's quest chat and B receives a notification.
7. Use **Get unstuck** with a specific blocker while the quest is active.
   - Expect: a contextual hint and a decreasing per-user quota; the eleventh request is rejected.
8. Complete every task and submit a repository URL, demo URL, and write-up from one member.
   - Expect: the quest enters submitted state and the partner receives a submission notification.
9. Review from the other member with a rating and feedback.
   - Approve: expect a completed quest, public showcase, and verified skill badges on both profiles.
   - To exercise the alternate branch, request changes instead and confirm the submitter can update and resubmit.
10. Open the public showcase in a signed-out browser.
    - Expect: both partners, skills, proof links, write-up, and approved review are visible.

## Execution record

The seeded two-user flow was exercised against the production build on the local server:

- **Pass:** Partner request creation and acceptance; fallback quest creation with seven tasks; both quest acceptances; server start time and 72-hour deadline.
- **Pass:** Task create, edit, assign, status update, reorder, and delete; the seeded board was restored afterward.
- **Pass:** Shared-spec save, stale-revision conflict, and restore; quest chat delivery to the partner; notification and user search APIs.
- **Pass:** Complete-task submission, partner approval, public showcase data/page, and verified profile badges.
- **Pass:** Re-seeding restored the two expected quests, removed the temporary request/quest, and cleared test messages/notifications.

Gemini returned a temporary 503 during generation; the built-in fallback produced a tailored seven-task quest and the workflow continued. The successful live-model response path was therefore not observed in this run.

Not exercised in this run: the timed curveball unlock (36-hour wait), the AI hint response, the request-changes review branch, and simultaneous polling from two open browser profiles.

The existing development server's HMR WebSocket was failing in the browser environment, so this run used `next start` rather than `next dev`. Repeat the script with the deployed Vercel app before the live demo.
