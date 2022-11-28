import BullQueue, { Queue } from 'bull';
import { Registry } from 'prom-client';

import { makeGuages, QueueGauges } from '../src/queueGauges';

export interface TestData {
  name: string;
  queue: Queue;
  prefix: string;
  guages: QueueGauges;
  registry: Registry;
}

export function makeQueue(name: string = 'TestQueue', prefix: string = 'test-queue'): TestData {

  const registry = new Registry();
  const queue = new BullQueue(name, { prefix });

  return {
    name,
    queue,
    prefix,
    registry,
    guages: makeGuages('test_stat_', [registry]),
  };
}
