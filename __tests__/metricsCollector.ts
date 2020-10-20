import { logger } from '../src/logger';
import { MetricCollector } from '../src/metricCollector';
import { makeQueue } from './create.util';
import promClient from 'prom-client';


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
    await collector.close();
    await testData.queue.clean(0, 'completed');
    await testData.queue.clean(0, 'active');
    await testData.queue.clean(0, 'delayed');
    await testData.queue.clean(0, 'failed');
    await testData.queue.empty();
    await testData.queue.close();
  });

  it('should list 1 completed job', async () => {
    const {
      queue,
    } = testData;

    queue.process(async () => {
    });

    const job1 = (await queue.add({ a: 1 }));
    const job2 = (await queue.add({ a: 2 }));
    await job1.finished();
    await job2.finished();

    const metrics = promClient.register.metrics();

    expect(metrics).toMatch(/^test_stat_total_completed{prefix="test-queue",queue="TestQueue"} 2$/m);
  });
});