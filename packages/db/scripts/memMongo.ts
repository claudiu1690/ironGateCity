/**
 * `pnpm db:mem`: an in-memory replica set on 127.0.0.1:27018 (name rs0), kept alive until Ctrl+C.
 * Data is lost when it stops (ADR 0004). `pnpm dev:mem` runs this next to the apps.
 */
import { startMemoryReplSet } from '../src/testing/memoryReplSet';

const PORT = Number(process.env.MEM_MONGO_PORT ?? 27018);

const replSet = await startMemoryReplSet({ port: PORT, replSetName: 'rs0' });
console.log(`In-memory MongoDB replica set ready on 127.0.0.1:${PORT} (rs0).`);
console.log(`MONGODB_URI=mongodb://127.0.0.1:${PORT}/irongate?replicaSet=rs0&directConnection=true`);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await replSet.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('SIGBREAK', stop);

// Keep the process alive.
setInterval(() => undefined, 1 << 30);
