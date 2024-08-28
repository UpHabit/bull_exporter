import { Queue, QueueEvents, QueueOptions } from 'bullmq';
import * as Logger from 'bunyan';
import IoRedis, { Redis } from 'ioredis';
import { register as globalRegister, Registry } from 'prom-client';

import { logger, logger as globalLogger } from '../utils/logger';
import { getJobCompleteStats, getStats, makeGuages, Index } from '../queue-gauges';
import { getOptions } from '../utils/options';

export interface QueueData<T = unknown> {
	queue: Queue<T>;
	name: string;
	prefix: string;
	queueEvents: QueueEvents;
}

export class MetricsCollector {
	private readonly logger: Logger;

	private readonly defaultRedisClient: Redis;
	private readonly redisUri: string;
	private readonly bullOpts: Pick<QueueOptions, 'prefix'>;
	private readonly queuesByName: Map<string, QueueData<unknown>> = new Map();

	private get queues(): QueueData<unknown>[] {
		return [...this.queuesByName.values()];
	}

	private readonly myListeners: Set<(id: string) => Promise<void>> = new Set();

	private readonly guages: Index;

	constructor(queueNames: string[], registers: Registry[] = [globalRegister]) {
		const opts = getOptions();
		this.redisUri = opts.url;
		this.defaultRedisClient = new IoRedis(this.redisUri, { maxRetriesPerRequest: null });
		this.defaultRedisClient.setMaxListeners(32);
		this.bullOpts = { prefix: opts.prefix };
		this.logger = logger || globalLogger;
		this.addToQueueSet(queueNames);
		this.guages = makeGuages(opts.metricPrefix, registers);
	}

	private addToQueueSet(names: string[]): void {
		for (const name of names) {
			if (this.queuesByName.has(name)) {
				continue;
			}
			this.logger.info('added queue', name);
			this.queuesByName.set(name, {
				name,
				queue: new Queue(name, {
					...this.bullOpts,
					connection: this.defaultRedisClient,
				}),
				prefix: this.bullOpts.prefix || 'bull',
				queueEvents: new QueueEvents(name, {
					...this.bullOpts,
					connection: new IoRedis(this.redisUri, { maxRetriesPerRequest: null }), // QueueEvents instances must not reuse Redis connections, see https://docs.bullmq.io/guide/connections
				}),
			});
		}
	}

	public async discoverAll(): Promise<void> {
		const keyPattern = new RegExp(`^${this.bullOpts.prefix}:([^:]+):(id|failed|active|waiting|stalled-check)$`);
		this.logger.info({ pattern: keyPattern.source }, 'running queue discovery');

		const keyStream = this.defaultRedisClient.scanStream({
			match: `${this.bullOpts.prefix}:*:*`,
		});
		// tslint:disable-next-line:await-promise tslint does not like Readable's here
		for await (const keyChunk of keyStream) {
			for (const key of keyChunk) {
				const match = keyPattern.exec(key);
				if (match && match[1]) {
					this.addToQueueSet([match[1]]);
				}
			}
		}
	}

	private async onJobComplete(queue: QueueData, id: string): Promise<void> {
		try {
			const job = await queue.queue.getJob(id);
			if (!job) {
				this.logger.warn({ job: id }, 'unable to find job from id');
				return;
			}
			await getJobCompleteStats(queue.prefix, queue.name, job, this.guages);
		} catch (err) {
			this.logger.error({ err, job: id }, 'unable to fetch completed job');
		}
	}

	public collectJobCompletions(): void {
		for (const q of this.queues) {
			const cb = this.onJobComplete.bind(this, q);
			this.myListeners.add(cb);
			q.queueEvents.on('completed', ({ jobId }) => cb(jobId));
		}
	}

	public async updateAll(): Promise<void> {
		const updatePromises = this.queues.map((q) => getStats(q.prefix, q.name, q.queue, this.guages));
		await Promise.all(updatePromises);
	}

	public async ping(): Promise<void> {
		await this.defaultRedisClient.ping();
	}

	public async close(): Promise<void> {
		this.defaultRedisClient.disconnect();
		for (const q of this.queues) {
			for (const l of this.myListeners) {
				q.queueEvents.removeListener('completed', l);
			}
		}
		await Promise.all(this.queues.reduce((ary, q) => ary.concat([q.queue.close(), q.queueEvents.close()]), [] as Promise<void>[]));
	}
}
