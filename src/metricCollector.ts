import bull from 'bull';
import * as Logger from 'bunyan';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { register as globalRegister, Registry } from 'prom-client';

import { logger as globalLogger } from './logger';
import { getJobCompleteStats, getStats, makeGuages, QueueGauges } from './queueGauges';

export interface BullOptions extends Pick<bull.QueueOptions, Exclude<keyof bull.QueueOptions, 'redis'>> {
  redis?: string | bull.QueueOptions['redis'];
}

export interface QueueData<T = unknown> {
  queue: bull.Queue<T>;
  name: string;
  prefix: string;
}

export class MetricCollector {

  private readonly logger: Logger;

  private readonly queues: QueueData<unknown>[];

  private readonly myListeners: Set<(id: string) => Promise<void>> = new Set();

  private readonly guages: QueueGauges;

  constructor(
    statPrefix: string,
    queueNames: string[],
    opts: BullOptions & { logger?: Logger },
    registers: Registry[] = [globalRegister],
  ) {
    const { logger, ...bullOpts } = opts;
    this.logger = logger || globalLogger;
    this.queues = queueNames.map(name => ({
      name,
      queue: new bull(name, bullOpts as bull.QueueOptions),
      prefix: opts.prefix || 'bull',
    }));

    this.guages = makeGuages(statPrefix, registers);
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
    await Promise.all(this.queues.map(async q => {
      const client: Redis = (q.queue as any).client;
      await client.ping();
    }));
  }

  public async close(): Promise<void> {
    for (const q of this.queues) {
      for (const l of this.myListeners) {
        (q.queue as any as EventEmitter).removeListener('global:completed', l);
      }
    }
    await Promise.all(this.queues.map(q => q.queue.close()));
  }

}
