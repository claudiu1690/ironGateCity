import type { TestProject } from 'vitest/node';
import { startMemoryReplSet } from '../src/testing/memoryReplSet';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/** One in-memory replica set for the whole run; each test file uses its own database name. */
export default async function setup(project: TestProject) {
  const replSet = await startMemoryReplSet();
  project.provide('mongoUri', replSet.uri);
  return async () => {
    await replSet.stop();
  };
}
