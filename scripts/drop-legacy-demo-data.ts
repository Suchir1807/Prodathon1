import mongoose from "mongoose";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const LEGACY_DEMO_COLLECTIONS = [
  "quests",
  "tasks",
  "sharedspecs",
  "submissions",
  "reviews",
  "showcases",
];

async function dropLegacyDemoData() {
  if (!process.argv.includes("--confirm-drop-legacy-demo-data")) {
    throw new Error("Pass --confirm-drop-legacy-demo-data to drop the listed demo-only collections.");
  }
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI environment variable.");

  await mongoose.connect(process.env.MONGODB_URI);
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection did not expose a database.");

  for (const name of LEGACY_DEMO_COLLECTIONS) {
    const exists = await database.listCollections({ name }, { nameOnly: true }).hasNext();
    if (exists) {
      await database.dropCollection(name);
      console.log(`Dropped demo-only collection: ${name}`);
    } else {
      console.log(`Collection not found, skipped: ${name}`);
    }
  }

  const badges = await database.listCollections({ name: "badges" }, { nameOnly: true }).hasNext();
  if (badges) {
    const result = await database.collection("badges").deleteMany({ quest: { $exists: true } });
    console.log(`Removed ${result.deletedCount} legacy project-derived badges.`);
  }

  await mongoose.disconnect();
}

dropLegacyDemoData().catch(async (error: unknown) => {
  console.error("Legacy demo-data cleanup failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
