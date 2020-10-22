import bull from 'bull';
import * as Logger from 'bunyan';
import { EventEmitter } from 'events';
import IoRedis from 'ioredis';
import { register as globalRegister, Registry } from 'prom-client';

import { logger as globalLogger } from './logger';
import {
  getJobCompleteStats,
  getStats,
  incrementJobTotalCompletedCounter,
  incrementJobTotalFailedCounter,
  makeGuages,
  QueueGauges,
} from './queueGauges';

export interface MetricCollectorOptions extends Omit<bull.QueueOptions, 'redis'> {
  metricPrefix: string;
  redis: string;
  autoDiscover: boolean;
  logger: Logger;
}

export interface QueueData<T = unknown> {
  queue: bull.Queue<T>;
  name: string;
  prefix: string;
}

interface QueueListener {
  queue: QueueData<unknown>;
  event: string;
  callback: any;
}

type MetricCollectedHanler = ((queuePrefix: string, queueName: string) => void) | undefined;

export class MetricCollector {

  private readonly logger: Logger;

  private readonly defaultRedisClient: IoRedis.Redis;
  private readonly redisUri: string;
  private readonly bullOpts: Omit<bull.QueueOptions, 'redis'>;
  private readonly queuesByName: Map<string, QueueData<unknown>> = new Map();

  private get queues(): QueueData<unknown>[] {
    return [...this.queuesByName.values()];
  }

  private readonly queueListeners: Set<QueueListener> = new Set();
  private readonly queueRedisClients: Set<IoRedis.Redis> = new Set();

  private readonly guages: QueueGauges;

  constructor(
    queueNames: string[],
    opts: MetricCollectorOptions,
    registers: Registry[] = [globalRegister],
  ) {
    const { logger, autoDiscover, redis, metricPrefix, ...bullOpts } = opts;
    this.redisUri = redis;
    this.defaultRedisClient = new IoRedis(this.redisUri);
    this.defaultRedisClient.setMaxListeners(32);
    this.bullOpts = bullOpts;
    this.logger = logger || globalLogger;
    this.addToQueueSet(queueNames);
    this.guages = makeGuages(metricPrefix, registers);
  }

  private createClient(_type: 'client' | 'subscriber' | 'bclient', redisOpts?: IoRedis.RedisOptions): IoRedis.Redis {
    if (_type === 'client') {
      return this.defaultRedisClient!;
    }
    const redisClient = new IoRedis(this.redisUri, redisOpts);
    this.queueRedisClients.add(redisClient);
    return redisClient;
  }

  private addToQueueSet(names: string[]): void {
    for (const name of names) {
      if (this.queuesByName.has(name)) {
        continue;
      }
      this.logger.info('added queue', name);
      this.queuesByName.set(name, {
        name,
        queue: new bull(name, {
          ...this.bullOpts,
          createClient: this.createClient.bind(this),
        }),
        prefix: this.bullOpts.prefix || 'bull',
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

  private jobCompletionCollectedHandler: MetricCollectedHanler;
  public registerJobCompletionCollectedHandler(jobCompletionCollectedHandler: MetricCollectedHanler): void {
    this.jobCompletionCollectedHandler = jobCompletionCollectedHandler;
  }

  private jobFailureCollectedHandler: MetricCollectedHanler;
  public registerJobFailureCollectedHandler(jobFailureCollectedHandler: MetricCollectedHanler): void {
    this.jobFailureCollectedHandler = jobFailureCollectedHandler;
  }

  private async onJobComplete(queue: QueueData, id: string): Promise<void> {
    try {
      await incrementJobTotalCompletedCounter(queue.prefix, queue.name, this.guages);
      if (this.jobCompletionCollectedHandler) {
        this.jobCompletionCollectedHandler(queue.prefix, queue.name);
      }
      const job = await queue.queue.getJob(id);
      if (!job) {
        this.logger.warn({ job: id }, 'unable to find job from id');
        return;
      }
      await getJobCompleteStats(queue.prefix, queue.name, job, this.guages);
    } catch (err) {
      this.logger.error({ err, job: id }, 'unable to fetch or increment completed job');
    }
  }

  private async onJobFailed(queue: QueueData, id: string): Promise<void> {
    try {
      await incrementJobTotalFailedCounter(queue.prefix, queue.name, this.guages);
      if (this.jobFailureCollectedHandler) {
        this.jobFailureCollectedHandler(queue.prefix, queue.name);
      }
    } catch (err) {
      this.logger.error({ err, job: id }, 'unable to increment failed jobs counter');
    }
  }

  public collectJobCompletions(): void {
    for (const q of this.queues) {
      const onJobCompleteCallback = this.onJobComplete.bind(this, q);
      this.queueListeners.add({ queue: q, event: 'global:completed', callback: onJobCompleteCallback });
      q.queue.on('global:completed', onJobCompleteCallback);

      const onJobFailedCallback = this.onJobFailed.bind(this, q);
      this.queueListeners.add({ queue: q, event: 'global:failed', callback: onJobFailedCallback });
      q.queue.on('global:failed', onJobFailedCallback);
    }
  }

  public async updateAll(): Promise<void> {
    const updatePromises = this.queues.map(q => getStats(q.prefix, q.name, q.queue, this.guages));
    await Promise.all(updatePromises);
  }

  public async ping(): Promise<void> {
    await this.defaultRedisClient.ping();
  }

  public async close(): Promise<void> {
    globalRegister.clear();

    this.defaultRedisClient.disconnect();

    for (const redisClient of this.queueRedisClients) {
      redisClient.disconnect();
    }
    this.queueRedisClients.clear();

    for (const listener of this.queueListeners) {
      (listener.queue.queue as any as EventEmitter).removeListener(listener.event, listener.callback);
    }
    this.queueListeners.clear();

    await Promise.all(this.queues.map(q => q.queue.close()));
  }

}
