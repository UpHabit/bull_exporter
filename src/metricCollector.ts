import bull from 'bull';
import { Gauge, register as globalRegister, Registry } from 'prom-client';

import { getStats, QueueGauges } from './queueGauges';

export interface BullOptions extends  Pick<bull.QueueOptions, Exclude<keyof bull.QueueOptions, 'redis'>> {
  redis?: string |  bull.QueueOptions['redis'];
}

export class MetricCollector {

  private readonly queues: {
    queue: bull.Queue;
    name: string;
    prefix: string;
  }[];

  private readonly guages: QueueGauges;

  constructor(
    statPrefix: string,
    queueNames: string[],
    opts: BullOptions,
    registers: Registry[] = [globalRegister],
  ) {
    this.queues = queueNames.map(name => ({
      name,
      queue: new bull(name, opts as bull.QueueOptions),
      prefix: opts.prefix || 'bull',
    }));

    this.guages = {
      completed: new Gauge({
        registers,
        name: `${statPrefix}completed`,
        help: 'Number of completed messages',
        labelNames: ['queue', 'prefix'],
      }),
      active: new Gauge({
        registers,
        name: `${statPrefix}active`,
        help: 'Number of active messages',
        labelNames: ['queue', 'prefix'],
      }),
      delayed: new Gauge({
        registers,
        name: `${statPrefix}delayed`,
        help: 'Number of delayed messages',
        labelNames: ['queue', 'prefix'],
      }),
      failed: new Gauge({
        registers,
        name: `${statPrefix}failed`,
        help: 'Number of failed messages',
        labelNames: ['queue', 'prefix'],
      }),
      waiting: new Gauge({
        registers,
        name: `${statPrefix}waiting`,
        help: 'Number of waiting messages',
        labelNames: ['queue', 'prefix'],
      }),
    };
  }

  public async updateAll(): Promise<void> {
    const updatePromises = this.queues.map(q => getStats(q.prefix, q.name, q.queue, this.guages));
    await Promise.all(updatePromises);
  }

  public async close(): Promise<void> {
    await Promise.all(this.queues.map(q => q.queue.close()));
  }

}
