import { Processor, Queue, QueueEvents, Worker } from 'bullmq';
import RedisClient from 'ioredis';
import { Registry } from 'prom-client';

import { makeGuages, QueueGauges } from '../src/queueGauges';

export interface TestData {
	name: string;
	queue: Queue;
	prefix: string;
	guages: QueueGauges;
	registry: Registry;
	events: QueueEvents;
	worker?: Worker;
}

const connection: RedisClient = new RedisClient({ host: 'localhost', port: 6379 });
connection.options.maxRetriesPerRequest = null; // otherwise BullMQ complains, not overly clear why, see https://github.com/OptimalBits/bull/blob/develop/CHANGELOG.md#400-2021-10-27

export function makeQueue(name: string = 'TestQueue', prefix: string = 'test-queue'): TestData {
	const registry = new Registry();
	const queue = new Queue(name, { connection });
	const events = new QueueEvents(name, { connection });

	return {
		name,
		queue,
		prefix,
		registry,
		guages: makeGuages('test_stat_', [registry]),
		events,
	};
}

export function makeWorker(name: string = 'TestQueue', func: Processor): Worker {
	return new Worker(name, func, { connection });
}
