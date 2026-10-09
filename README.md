# CoFoundry

Peer-to-peer skill exchange. Set your skills, filter for a partner, generate a 3-day quest with Gemini, and keep building in the quest group chat.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Add your key to `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

The quest route is `POST /api/generate-quest`. It calls Gemini and falls back across Flash models when one is busy. If the key is missing, the route returns a labeled sample quest so the match flow still runs.

Profiles and accepted quests are stored in the browser.
