import yargs from 'yargs';

import { version } from '../package.json';

export interface Options {
  url: string;
  sentinelExtraEndpoints: string[];
  sentinelMasterName: string;
  prefix: string;
  metricPrefix: string;
  once: boolean;
  port: number;
  bindAddress: string;
  autoDiscover: boolean;
  _: string[];
}

export function getOptionsFromArgs(...args: string[]): Options {
  return yargs
    .version(version)
    .alias('V', 'version')
    .options({
      url: {
        alias: 'u',
        describe: 'A redis connection url. To connect to Redis Sentinel use "sentinel:" schema',
        default: 'redis://127.0.0.1:6379',
        demandOption: true,
      },
      sentinelExtraEndpoints: {
        describe: 'Extra host:port pairs for Redis Sentinel',
        default: [],
        array: true,
        demandOption: true,
      },
      sentinelMasterName: {
        describe: 'Redis Sentinel Master Name',
        default: '',
        demandOption: true,
      },
      prefix: {
        alias: 'p',
        default: 'bull',
        demandOption: true,
      },
      metricPrefix: {
        alias: 'm',
        default: 'bull_queue_',
        defaultDescription: 'prefix for all exported metrics',
        demandOption: true,
      },
      once: {
        alias: 'n',
        default: false,
        type: 'boolean',
        description: 'Print stats and exit without starting a server',
      },
      port: {
        default: 9538,
      },
      autoDiscover: {
        default: false,
        alias: 'a',
        type: 'boolean',
      },
      bindAddress: {
        alias: 'b',
        description: 'Address to listen on',
        default: '0.0.0.0',
      },
    }).parse(args);
}
