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

export function makeQueue(name: string = 'TestQueue', prefix: string = 'test-queue', metricsPrefix: string = 'test_stat_'): TestData {

  const registry = new Registry();
  const queue = new Bull(name, { prefix });

  return {
    name,
    queue,
    prefix,
    registry,
    metricsPrefix,
    guages: makeGuages(metricsPrefix, [registry]),
  };
}
