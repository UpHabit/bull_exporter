import * as bull from 'bull';

import { getJobCompleteStats, getStats } from '../src/queueGauges';

import { TestData } from './create.util';
import { getCurrentTestHash } from './setup.util';

let testData: TestData;

beforeEach(async () => {
  jest.resetModuleRegistry();
  const { makeQueue } = await import('./create.util');
  const hash = getCurrentTestHash();
  testData = makeQueue(hash);
});

afterEach(async () => {
  await testData.queue.clean(0, 'completed');
  await testData.queue.clean(0, 'active');
  await testData.queue.clean(0, 'delayed');
  await testData.queue.clean(0, 'failed');
  await testData.queue.empty();
  await testData.queue.close();
});

it('should list 1 queued job', async () => {

  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  await queue.add({ a: 1 });

  await getStats(prefix, name, queue, guages);

  expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 completed job', async () => {
  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  queue.process(async (jobInner: bull.Job<unknown>) => {
    expect(jobInner).toMatchObject({ data: { a: 1 } });
  });
  const job = await queue.add({ a: 1 });
  await job.finished();

  await getStats(prefix, name, queue, guages);
  await getJobCompleteStats(prefix, name, job, guages);

  expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 completed job with delay', async () => {
  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  queue.process(async (jobInner: bull.Job<unknown>) => {
    expect(jobInner).toMatchObject({ data: { a: 1 } });
  });
  const job = await queue.add({ a: 1 });
  await job.finished();

  // TODO: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/31567
  // TODO: file bug with bull? finishedOn and processedOn are not set when we call finish
  const doneJob: any = await queue.getJob(job.id);
  // lie about job duration
  doneJob.finishedOn = doneJob.processedOn + 1000;

  await getStats(prefix, name, queue, guages);
  await getJobCompleteStats(prefix, name, doneJob, guages);

  expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 failed job', async () => {
  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  queue.process(async (jobInner: bull.Job<unknown>) => {
    expect(jobInner).toMatchObject({ data: { a: 1 } });
    throw new Error('expected');
  });
  const job = await queue.add({ a: 1 });

  await expect(job.finished()).rejects.toThrow(/expected/);

  await getStats(prefix, name, queue, guages);

  expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 delayed job', async () => {
  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  await queue.add({ a: 1 }, { delay: 100_000 });

  await getStats(prefix, name, queue, guages);

  expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 active job', async () => {
  const {
    name,
    queue,
    prefix,
    guages,
    registry,
  } = testData;

  let jobStartedResolve!: () => void;
  let jobDoneResolve!: () => void;
  const jobStartedPromise = new Promise(resolve => jobStartedResolve = resolve);
  const jobDonePromise = new Promise(resolve => jobDoneResolve = resolve);

  queue.process(async () => {
    jobStartedResolve();
    await jobDonePromise;
  });
  const job = await queue.add({ a: 1 });

  await jobStartedPromise;
  await getStats(prefix, name, queue, guages);
  expect(registry.metrics()).toMatchSnapshot();
  jobDoneResolve();
  await job.finished();

  await getStats(prefix, name, queue, guages);
  expect(registry.metrics()).toMatchSnapshot();
});
