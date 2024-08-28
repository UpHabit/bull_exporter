import yargs from 'yargs';

import { version } from '../../package.json';

export interface Options {
	url: string;
	prefix: string;
	metricPrefix: string;
	once: boolean;
	port: number;
	bindAddress: string;
	autoDiscover: boolean;
	_: string[];
}

let options: Options;

export function getOptions(...args: string[]): Options {
	if (!options) {
		const parsedArgs = yargs
			.version(version)
			.alias('V', 'version')
			.options({
				url: {
					alias: 'u',
					describe: 'A redis connection url',
					default: 'redis://127.0.0.1:6379',
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
			})
			.option('string-option', {
				string: true,
			})
			.parse(args);

		options = { ...parsedArgs, _: parsedArgs._ as string[] };
	}

	return options;
}
