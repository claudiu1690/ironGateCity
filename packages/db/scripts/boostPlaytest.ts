/**
 * `pnpm admin:boost --email <e> [--email <e> …] [--dry-run]`: an operator script for the slice-3
 * playtest (not an API route). Lifts the chosen testers' characters to Rank 3 (2,000 Faction XP)
 * and Known Local Standing in their home city (30 Successes), with the 10 PC deposit, so they can
 * stand in the next nominations window. Never lowers anything; running it again changes nothing.
 * Marks each boosted character `playtest.boosted` (with the time and the values before), so
 * `pnpm report:playtest` shows boosted and natural testers apart.
 *
 * Runs against MONGODB_URI (reads apps/server/.env when it is not set).
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Character, connectDb, disconnectDb } from '../src';
import { boostByEmails, boostPlan } from '../src/boost';
import { nativeDb } from '../src/connect';

const serverEnv = fileURLToPath(new URL('../../../apps/server/.env', import.meta.url));
if (!process.env.MONGODB_URI && existsSync(serverEnv)) process.loadEnvFile(serverEnv);
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set (set it, or create apps/server/.env from .env.example).');
  process.exit(1);
}

const args = process.argv.slice(2);
const emails: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) emails.push(args[++i]!);
  else if (args[i]?.startsWith('--email=')) emails.push(args[i]!.slice('--email='.length));
}
const dryRun = args.includes('--dry-run');
if (emails.length === 0) {
  console.error('Usage: pnpm admin:boost --email <address> [--email <address> …] [--dry-run]');
  process.exit(1);
}

await connectDb(uri, { log: console.log });
try {
  if (dryRun) {
    for (const email of emails) {
      const user = await nativeDb().collection('user').findOne({ email: email.trim().toLowerCase() });
      const c = user ? await Character.findOne({ userId: String(user._id) }).lean() : null;
      const plan = c ? boostPlan(c) : null;
      console.log(
        `[dry run] ${email}: ${!user ? 'no such account' : !c ? 'no character yet' : plan!.changes.length ? plan!.changes.join('; ') : 'nothing to change'}`,
      );
    }
  } else {
    for (const r of await boostByEmails(emails)) {
      const who = r.name ? `${r.name} <${r.email}>` : r.email;
      if (r.status === 'boosted')
        console.log(`Boosted ${who}: ${r.changes.join('; ')}. Marked playtest.boosted.`);
      else if (r.status === 'unchanged') console.log(`${who}: already Rank 3 and Known, nothing changed.`);
      else if (r.status === 'no-user') console.log(`${r.email}: no account with this email.`);
      else if (r.status === 'no-character')
        console.log(`${who}: the account has no character yet (still arriving).`);
      else console.log(`${who}: the character kept changing under the boost; run it again.`);
    }
  }
} finally {
  await disconnectDb();
}
