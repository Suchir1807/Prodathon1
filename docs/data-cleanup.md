# Demo data cleanup

The old project-collaboration data was demo-only and is not migrated. The cleanup script requires an explicit confirmation flag:

```bash
npx tsx scripts/drop-legacy-demo-data.ts --confirm-drop-legacy-demo-data
```

It drops only the old `quests`, `tasks`, `sharedspecs`, `submissions`, `reviews`, and `showcases` collections. In the shared badges collection it removes only records containing the old `quest` field.

The script does not drop or modify users, authentication data, messages, partner-request records, ongoing Exchanges, Sessions, Asks, credits, or other legacy collections. Review the target database and back it up before running the script. It has not been run as part of this migration.
