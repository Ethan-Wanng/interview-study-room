import { createAntigravityDriver, createWorkBuddyDriver } from './drivers/acp-driver.js';
import { CodexAppServerDriver } from './drivers/codex-driver.js';
import {
 BridgeError,
 type LocalAgentDriver,
 type LocalProviderId,
 type ProviderDetection,
 type StreamTurnInput,
} from './drivers/types.js';

const IDLE_TTL_MS = 15 * 60_000;
const SWEEP_INTERVAL_MS = 60_000;

export class DriverProcessPool {
 private drivers = new Map<LocalProviderId, LocalAgentDriver>();
 private lastUsedAt = new Map<LocalProviderId, number>();
 private sweepTimer: ReturnType<typeof setInterval> | null = null;

 constructor(drivers?: LocalAgentDriver[]) {
  const list = drivers ?? [
   createAntigravityDriver(),
   new CodexAppServerDriver(),
   createWorkBuddyDriver(),
  ];
  for (const d of list) {
   this.drivers.set(d.id, d);
  }
  this.sweepTimer = setInterval(() => {
   void this.sweepIdle();
  }, SWEEP_INTERVAL_MS);
  this.sweepTimer.unref();
 }

 hasProvider(id: string): id is LocalProviderId {
  return this.drivers.has(id as LocalProviderId);
 }

 private touch(id: LocalProviderId): void {
  this.lastUsedAt.set(id, Date.now());
 }

 private async sweepIdle(): Promise<void> {
  const now = Date.now();
  for (const [id, last] of this.lastUsedAt.entries()) {
   if (now - last >= IDLE_TTL_MS) {
    this.lastUsedAt.delete(id);
    const drv = this.drivers.get(id);
    if (drv) await drv.dispose().catch(() => {});
   }
  }
 }

 async detectAll(): Promise<ProviderDetection[]> {
  const ordered = [...this.drivers.values()];
  return Promise.all(
   ordered.map(async d => {
    this.touch(d.id);
    return d.detect(false);
   }),
  );
 }

 async refreshProvider(id: LocalProviderId): Promise<ProviderDetection> {
  const drv = this.drivers.get(id);
  if (!drv) {
   throw new BridgeError('bad_request', `未知客户端：${id}`);
  }
  this.touch(id);
  return drv.detect(true);
 }

 async streamTurn(id: LocalProviderId, input: StreamTurnInput): Promise<void> {
  const drv = this.drivers.get(id);
  if (!drv) {
   throw new BridgeError('bad_request', `未知客户端：${id}`);
  }
  this.touch(id);
  try {
   await drv.streamTurn(input);
  } finally {
   this.touch(id);
  }
 }

 async disposeAll(): Promise<void> {
  if (this.sweepTimer) {
   clearInterval(this.sweepTimer);
   this.sweepTimer = null;
  }
  await Promise.all([...this.drivers.values()].map(d => d.dispose().catch(() => {})));
 }
}
