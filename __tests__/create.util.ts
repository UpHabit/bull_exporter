import Bull = require('bull');
import { Registry } from 'prom-client';

import { makeGuages, QueueGauges } from '../src/queueGauges';

export interface TestData {
  name: string;
  queue: Bull.Queue;
  prefix: string;
  guages: QueueGauges;
  registry: Registry;
  metricsPrefix: string;
}

export async function makeQueue(name: string = 'TestQueue', prefix: string = 'test-queue', metricsPrefix: string = 'test_stat_'): Promise<TestData> {

  const registry = new Registry();
  const queue = new Bull(name, { prefix });
  await queue.isReady();

  return {
    name,
    queue,
    prefix,
    registry,
    metricsPrefix,
    guages: makeGuages(metricsPrefix, [registry]),
  };
}
