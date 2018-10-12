import promClient from 'prom-client';

import { logger } from './logger';
import { MetricCollector } from './metricCollector';
import { getOptionsFromArgs, Options } from './options';
import { startServer } from './server';

export async function printOnce(opts: Options): Promise<void> {
  const collector = new MetricCollector(opts.prefix, opts._, { redis: opts.url });
  await collector.updateAll();
  await collector.close();
  console.log(promClient.register.metrics());
}

export async function runServer(opts: Options): Promise<void> {
  const { done } = await startServer(opts);
  await done;
}

export async function main(...args: string[]): Promise<void> {
  const opts = getOptionsFromArgs(...args);
  if (opts.once) {
    await printOnce(opts);
  } else {
    await runServer(opts);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);

  let exitCode = 0;
  main(...args)
    .catch(() => process.exitCode = exitCode = 1)
    .then(() => {
      setTimeout(
        () => {
          logger.error('No clean exit after 5 seconds, force exit');
          process.exit(exitCode);
        },
        5000,
      ).unref();
    });
}
