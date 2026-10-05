/**
 * QA (slice 5): the dev panel's risk actions and the risk hooks are absent without E2E_TEST_HOOKS
 * (tech design §8.5, §8.6, §14 "Test hooks in production"). The developer's test checks the four
 * `/api/test/*` hook routes; this one checks every dev-panel action and its status route too, and that
 * a hooks-off app never turns the street hooks on.
 */
import { getContent } from '@irongate/content';
import { mongoose, nativeDb } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { createAuth } from '../src/auth';
import { streetHooks } from '../src/services/streetHooks';
import { setupDb, teardownDb, testEnv } from './helpers';

let uri: string;
beforeAll(async () => {
  uri = await setupDb('qa-slice5-hooks');
});
afterAll(teardownDb);

const RISK_ACTIONS = ['heat', 'health', 'record', 'runIn', 'caught', 'cells', 'infirmary', 'release', 'decide', 'level6', 'rank3', 'goto', 'unbar'];

describe('QA · without E2E_TEST_HOOKS the dev panel’s risk actions do not exist', () => {
  it('404 on every risk action and on the status; the street hooks stay off and take nothing', async () => {
    const env = testEnv(uri);
    expect(env.E2E_TEST_HOOKS).toBe(false);
    const app = await buildApp({ env, auth: createAuth(env, nativeDb(), mongoose.connection.getClient()), content: getContent() });
    await app.ready();
    for (const a of RISK_ACTIONS) {
      const r = await app.inject({ method: 'POST', url: `/api/test/dev/${a}`, payload: { target: '60' } });
      expect(r.statusCode, a).toBe(404);
    }
    expect((await app.inject({ method: 'GET', url: '/api/test/dev/status' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/test/clock', payload: { advanceMs: 1 } })).statusCode).toBe(404);
    expect(streetHooks.enabled).toBe(false);
    streetHooks.set('qa', { runIn: 'next', caught: 'always' });
    expect(streetHooks.take('qa', 'k')).toBeNull();
    expect(streetHooks.peek('qa')).toBeNull();
    await app.close();
  });
});
