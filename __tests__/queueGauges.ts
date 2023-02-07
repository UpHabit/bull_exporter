import { Job } from 'bullmq';
import { getJobCompleteStats, getStats } from '../src/queueGauges';

import { makeQueue, makeWorker, TestData } from './create.util';
import { getCurrentTestHash } from './setup.util';

let testData: TestData;
const JOB_NAME = 'test-job';

beforeEach(async () => {
	jest.resetModules();
	const hash = getCurrentTestHash();
	testData = makeQueue(hash);
});

afterEach(async () => {
	await testData.worker?.close();
	await testData.queue.obliterate({ force: true });
	await testData.events.close();
	await testData.queue.close();
});

it('should list 1 queued job', async () => {
	const { name, queue, prefix, guages, registry } = testData;

	await queue.add(JOB_NAME, { a: 1 });

	await getStats(prefix, name, queue, guages);

	expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 completed job', async () => {
	const { name, queue, prefix, guages, registry, events } = testData;
	testData.worker = makeWorker(name, async (jobInner: Job<unknown>) => {
		expect(jobInner).toMatchObject({ data: { a: 1 } });
	});

	const job = await queue.add(JOB_NAME, { a: 1 });
	await job.waitUntilFinished(events);

	await getStats(prefix, name, queue, guages);
	await getJobCompleteStats(prefix, name, job, guages);

	expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 completed job with delay', async () => {
	const { name, queue, prefix, guages, registry, events } = testData;
	testData.worker = makeWorker(name, async (jobInner: Job<unknown>) => {
		expect(jobInner).toMatchObject({ data: { a: 1 } });
	});

	const job = await queue.add(JOB_NAME, { a: 1 });
	await job.waitUntilFinished(events);
	const doneJob: any = await queue.getJob(job.id!);
	// lie about job duration
	doneJob.finishedOn = doneJob.processedOn + 1000;

	await getStats(prefix, name, queue, guages);
	await getJobCompleteStats(prefix, name, doneJob, guages);

	expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 failed job', async () => {
	const { name, queue, prefix, guages, registry, events } = testData;

	testData.worker = makeWorker(queue.name, async (jobInner: Job<unknown>) => {
		expect(jobInner).toMatchObject({ data: { a: 1 } });
		throw new Error('expected');
	});
	const job = await queue.add(JOB_NAME, { a: 1 });

	await expect(job.waitUntilFinished(events)).rejects.toThrow(/expected/);

	await getStats(prefix, name, queue, guages);

	expect(registry.metrics()).toMatchSnapshot();
});

it('should list 1 delayed job', async () => {
	const { name, queue, prefix, guages, registry, events } = testData;

	const job = await queue.add(JOB_NAME, { a: 1 }, { delay: 100000 });

	await getStats(prefix, name, queue, guages);

	expect(registry.metrics()).toMatchSnapshot();

	// for some reason delayed jobs are not obliterated, so we need to complete it first in order for the cleanup to succeed
	await job.changeDelay(0);
	testData.worker = makeWorker(name, async (jobInner: Job<unknown>) => {
		expect(jobInner).toMatchObject({ data: { a: 1 } });
	});
	await job.waitUntilFinished(events);
});

it('should list 1 active job', async () => {
	const { name, queue, prefix, guages, registry, events } = testData;

	let jobStartedResolve!: () => void;
	let jobDoneResolve!: () => void;
	const jobStartedPromise = new Promise<void>((resolve) => (jobStartedResolve = resolve));
	const jobDonePromise = new Promise<void>((resolve) => (jobDoneResolve = resolve));

	testData.worker = makeWorker(queue.name, async () => {
		jobStartedResolve();
		await jobDonePromise;
	});
	const job = await queue.add(JOB_NAME, { a: 1 });

	await jobStartedPromise;
	await getStats(prefix, name, queue, guages);
	expect(registry.metrics()).toMatchSnapshot();
	jobDoneResolve();
	await job.waitUntilFinished(events);

	await getStats(prefix, name, queue, guages);
	expect(registry.metrics()).toMatchSnapshot();
});
