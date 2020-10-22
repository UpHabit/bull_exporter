import { logger } from '../src/logger';
import { MetricCollector } from '../src/metricCollector';
import { makeQueue } from './create.util';
import promClient, { Registry } from 'prom-client';


describe('metricsCollector', () => {
  const REDIS_TEST_URL = 'redis://127.0.0.1:6379';
  let testData: any;
  let collector: MetricCollector;
  beforeEach(async () => {
    testData = makeQueue();
    collector = new MetricCollector([], {
      logger,
      metricPrefix: testData.metricsPrefix,
      redis: REDIS_TEST_URL,
      prefix: testData.prefix,
      autoDiscover: false,
    });

    await collector.discoverAll();
    collector.collectJobCompletions();
  });

  afterEach(async () => {
    (testData.registry as Registry).clear();
    await collector.close();
    await testData.queue.clean(0, 'completed');
    await testData.queue.clean(0, 'active');
    await testData.queue.clean(0, 'delayed');
    await testData.queue.clean(0, 'failed');
    await testData.queue.empty();
    await testData.queue.close();
  });

  it('should list 1 total failed job', async () => {
    const {
      queue,
    } = testData;

    queue.process(async () => {
      throw new Error('expected');
    });

    const metricCollected = new Promise((resolve) => {
      collector.registerJobFailureCollectedHandler(() => {
        resolve();
      });
    });

    const job = (await queue.add({ a: 1 }));
    await expect(job.finished()).rejects.toThrow(/expected/);

    await metricCollected;

    const metrics = promClient.register.metrics();

    expect(metrics).toMatch(/^test_stat_total_failed{prefix="test-queue",queue="TestQueue"} 1$/m);
  });

});