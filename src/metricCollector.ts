import bull from "bull";
import * as Logger from "bunyan";
import { EventEmitter } from "events";
import IoRedis from "ioredis";
import { register as globalRegister, Registry } from "prom-client";
import { Readable } from "stream";

import { logger as globalLogger } from "./logger";
import {
  getJobCompleteStats,
  getStats,
  makeGuages,
  QueueGauges,
} from "./queueGauges";

export interface MetricCollectorOptions
  extends Omit<bull.QueueOptions, "redis"> {
  metricPrefix: string;
  redis: string;
  autoDiscover: boolean;
  logger: Logger;
  useClusterMode: boolean;
}

export interface QueueData<T = unknown> {
  queue: bull.Queue<T>;
  name: string;
  prefix: string;
}

export class MetricCollector {
  private readonly logger: Logger;

  private readonly defaultRedisClient: IoRedis.Redis | IoRedis.Cluster;
  private readonly redisUri: string;
  /**
   * @property useClusterMode
   * property is used to decide wether connect to redis using cluster mode or not?
   */
  private readonly useClusterMode: boolean;
  private readonly bullOpts: Omit<bull.QueueOptions, "redis">;
  private readonly queuesByName: Map<string, QueueData<unknown>> = new Map();

  private get queues(): QueueData<unknown>[] {
    return [...this.queuesByName.values()];
  }

  private readonly myListeners: Set<(id: string) => Promise<void>> = new Set();

  private readonly guages: QueueGauges;

  constructor(
    queueNames: string[],
    opts: MetricCollectorOptions,
    registers: Registry[] = [globalRegister]
  ) {
    const {
      logger,
      autoDiscover,
      redis,
      useClusterMode,
      metricPrefix,
      ...bullOpts
    } = opts;
    this.redisUri = redis;
    this.useClusterMode = useClusterMode;
    this.defaultRedisClient = opts.useClusterMode
      ? new IoRedis.Cluster(this.redisUri.split(","))
      : new IoRedis(this.redisUri);

    this.defaultRedisClient.setMaxListeners(32);
    this.bullOpts = bullOpts;
    this.logger = logger || globalLogger;
    this.addToQueueSet(queueNames);
    this.guages = makeGuages(metricPrefix, registers);
  }

  private createClient(
    _type: "client" | "subscriber" | "bclient",
    redisOpts?: IoRedis.RedisOptions
  ): IoRedis.Redis | IoRedis.Cluster {
    if (_type === "client") {
      return this.defaultRedisClient!;
    }
    return this.useClusterMode
      ? new IoRedis.Cluster(this.redisUri.split(","), redisOpts)
      : new IoRedis(this.redisUri, redisOpts);
  }

  private addToQueueSet(names: string[]): void {
    for (const name of names) {
      if (this.queuesByName.has(name)) {
        continue;
      }
      this.logger.info("added queue", name);
      this.queuesByName.set(name, {
        name,
        queue: new bull(name, {
          ...this.bullOpts,
          createClient: this.createClient.bind(this),
        }),
        prefix: this.bullOpts.prefix || "bull",
      });
    }
  }

  public async discoverAll(): Promise<void> {
    const keyPattern = new RegExp(
      `^${this.bullOpts.prefix}:([^:]+):(id|failed|active|waiting|stalled-check)$`
    );
    this.logger.info({ pattern: keyPattern.source }, "running queue discovery");

    const keys: string[] = await this.scan({
      match: `${this.bullOpts.prefix}:*:*`,
    });
    for (const key of keys) {
      const match = keyPattern.exec(key);
      if (match && match[1]) {
        this.addToQueueSet([match[1]]);
      }
    }
  }

  private async convertKeyStreamToKeys(keyStream: Readable): Promise<string[]> {
    const keys: string[] = [];
    for await (const keyChunk of keyStream) {
      for (const key of keyChunk) {
        keys.push(key);
      }
    }
    return keys;
  }

  private async scan({ match }: { match: string }): Promise<string[]> {
    if (this.useClusterMode === false) {
      const keyStream: Readable = (
        this.defaultRedisClient as IoRedis.Redis
      ).scanStream({
        match,
      });
      return this.convertKeyStreamToKeys(keyStream);
    } else {
      const nodes = (this.defaultRedisClient as IoRedis.Cluster).nodes("all");
      const streams = nodes.map((node: IoRedis.Redis) =>
        node.scanStream({ match })
      );
      const keys = await Promise.all(
        streams.map((value: Readable) => this.convertKeyStreamToKeys(value))
      );
      // @ts-ignore
      return [].concat(...keys);
    }
  }

  private async onJobComplete(queue: QueueData, id: string): Promise<void> {
    try {
      const job = await queue.queue.getJob(id);
      if (!job) {
        this.logger.warn({ job: id }, "unable to find job from id");
        return;
      }
      await getJobCompleteStats(queue.prefix, queue.name, job, this.guages);
    } catch (err) {
      this.logger.error({ err, job: id }, "unable to fetch completed job");
    }
  }

  public collectJobCompletions(): void {
    for (const q of this.queues) {
      const cb = this.onJobComplete.bind(this, q);
      this.myListeners.add(cb);
      q.queue.on("global:completed", cb);
    }
  }

  public async updateAll(): Promise<void> {
    const updatePromises = this.queues.map((q) =>
      getStats(q.prefix, q.name, q.queue, this.guages)
    );
    await Promise.all(updatePromises);
  }

  public async ping(): Promise<void> {
    await (this.defaultRedisClient as IoRedis.Redis).ping();
  }

  public async close(): Promise<void> {
    this.defaultRedisClient.disconnect();
    for (const q of this.queues) {
      for (const l of this.myListeners) {
        (q.queue as any as EventEmitter).removeListener("global:completed", l);
      }
    }
    await Promise.all(this.queues.map((q) => q.queue.close()));
  }
}
