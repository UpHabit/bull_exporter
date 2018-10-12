import promClient from 'prom-client';
import yargs from 'yargs';

import { version } from '../package.json';

import { MetricCollector } from './metricCollector';

export function getArgs(...args: string[]): { url: string, prefix: string, _: string[] } {
  return yargs
    .usage('prom-metrics [queueNames]')

    .alias('u', 'url')
    .demandOption('url', 'A redis connection url')
    .default('url', 'redis://127.0.0.1:6379')

    .alias('p', 'prefix')
    .demandOption('prefix', 'metrics prefix')
    .default('prefix', 'uhapp_queue_')

    .demandCommand(1)
    .version(version)
    .parse(args) as any;
}

export async function main(...args: string[]): Promise<void> {
  const opts = getArgs(...args);

  const collector = new MetricCollector(opts.prefix, opts._, { redis: opts.url });
  await collector.updateAll();
  await collector.close();
  console.log(promClient.register.metrics());
}

if (require.main === module) {
  const args = process.argv.slice(2);

  let exitCode = 0;
  main(...args)
    .catch(() => process.exitCode = exitCode = 1)
    .then(() => {
      setTimeout(
        () => {
          console.error('No clean exit after 5 seconds, force exit');
          process.exit(exitCode);
        },
        5000,
      ).unref();
    });
}
