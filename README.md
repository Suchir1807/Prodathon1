# Skillin

Skillin is a peer-to-peer skill exchange where you teach what you know, earn time credits, and learn anything from anyone.

The learning loop is: **Offer & Want → Match or Ask → Book a Session → Learn & Teach → Review & Grow.**

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `MONGODB_URI` and `NEXTAUTH_SECRET` in `.env.local`.

## Demo data

To seed a small learning community with demo profiles, an ongoing Exchange, a completed and an upcoming Session, reviews, Asks, and time-credit history:

```bash
npm run seed:demo -- --confirm-demo-seed
```

The seed script uses `DEMO_PASSWORD` when set; otherwise it prints the demo password it created. It only refreshes data associated with its five demo accounts.

Legacy demo-only data is not migrated. See [docs/data-cleanup.md](./docs/data-cleanup.md) for the guarded cleanup command and its exact scope. The cleanup command has not been run.
