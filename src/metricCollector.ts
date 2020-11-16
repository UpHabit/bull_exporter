import bull from 'bull';
import * as Logger from 'bunyan';
import { EventEmitter } from 'events';
import IoRedis from 'ioredis';
import { register as globalRegister, Registry } from 'prom-client';
import URL from 'url';

import { logger as globalLogger } from './logger';
import { getJobCompleteStats, getStats, makeGuages, QueueGauges } from './queueGauges';

export interface MetricCollectorOptions extends Omit<bull.QueueOptions, 'redis'> {
  metricPrefix: string;
  redis: string;
  sentinelExtraEndpoints: string[];
  sentinelMasterName: string;
  autoDiscover: boolean;
  logger: Logger;
}

export interface QueueData<T = unknown> {
  queue: bull.Queue<T>;
  name: string;
  prefix: string;
}

export class MetricCollector {

  private readonly logger: Logger;

  private readonly defaultRedisClient: IoRedis.Redis;
  private readonly redisConnectionCredentials: string | IoRedis.RedisOptions;
  private readonly bullOpts: Omit<bull.QueueOptions, 'redis'>;
  private readonly queuesByName: Map<string, QueueData<unknown>> = new Map();

  private get queues(): QueueData<unknown>[] {
    return [...this.queuesByName.values()];
  }

  private readonly myListeners: Set<(id: string) => Promise<void>> = new Set();

  private readonly guages: QueueGauges;

  private static parseSentinelUri(redisUri: string, sentinelExtraEndpoints: string[], sentinelMasterName?: string): string | IoRedis.RedisOptions {
    const { protocol, host, port, auth } = URL.parse(redisUri);

    if (protocol !== 'sentinel:') {
      return redisUri;
    }

    const password = auth ? auth.split(':')[1] : undefined;

    if (host === undefined || port === undefined || sentinelExtraEndpoints === undefined) {
      throw new Error('');
    }

    return {
      password,
      sentinels: [{ host, port: Number(port) }].concat(sentinelExtraEndpoints.map(sentinelExtraEndpoint => {
        const [additionalHost, additionalPort] = sentinelExtraEndpoint.split(':');
        return { host: additionalHost, port: Number(additionalPort) };
      })),
      name: sentinelMasterName,
    };
  }
  constructor(
    queueNames: string[],
    opts: MetricCollectorOptions,
    registers: Registry[] = [globalRegister],
  ) {
    const { logger, autoDiscover, redis, metricPrefix, sentinelExtraEndpoints, sentinelMasterName, ...bullOpts } = opts;
    this.redisConnectionCredentials = MetricCollector.parseSentinelUri(redis, sentinelExtraEndpoints, sentinelMasterName === '' ? undefined : sentinelMasterName);
    if (typeof this.redisConnectionCredentials === 'string') {
      this.defaultRedisClient = new IoRedis(this.redisConnectionCredentials);
    } else {
      this.defaultRedisClient = new IoRedis(this.redisConnectionCredentials);
    }
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
    if (typeof this.redisConnectionCredentials === 'string') {
      return new IoRedis(this.redisConnectionCredentials, redisOpts);
    }
    return new IoRedis({ ...this.redisConnectionCredentials, ...redisOpts });
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
      q.queue.on('global:completed', cb);
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
    this.defaultRedisClient.disconnect();
    for (const q of this.queues) {
      for (const l of this.myListeners) {
        (q.queue as any as EventEmitter).removeListener('global:completed', l);
      }
    }
    await Promise.all(this.queues.map(q => q.queue.close()));
  }

}
