import { startMemoryReplSet } from '@irongate/db/testing';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/** One in-memory replica set for the run (ADR 0004); each test file gets its own database. */
export default async function setup(project: TestProject) {
  const replSet = await startMemoryReplSet();
  project.provide('mongoUri', replSet.uri);
  return async () => {
    await replSet.stop();
  };
}
