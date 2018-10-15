import yargs from 'yargs';

import { version } from '../package.json';

export interface Options {
  url: string;
  prefix: string;
  metricPrefix: string;
  once: boolean;
  port: number;
  bindAddress: string;
  _: string[];
}

export function getOptionsFromArgs(...args: string[]): Options {
  return yargs
    .usage('prom-metrics [queueNames]')
    .alias('V', 'version')

    .alias('u', 'url')
    .demandOption('url', 'A redis connection url')
    .default('url', 'redis://127.0.0.1:6379')

    .alias('p', 'prefix')
    .demandOption('prefix', 'bull prefix')
    .default('prefix', 'bull')

    .alias('m', 'metric-prefix')
    .demandOption('metric-prefix', 'Metric prefix')
    .default('metric-prefix', 'uhapp_queue_')

    .boolean('once')
    .alias('n', 'once')
    .demandOption('once', 'Print stats and exit without starting a server')
    .default('once', false)

    .number('port')
    .default('port', 5959)

    .alias('b', 'bindAddress')
    .demandOption('bindAddress', 'Address to listen on')
    .default('bindAddress', '0.0.0.0')

    .demandCommand(1)
    .version(version)
    .parse(args) as any;
}
