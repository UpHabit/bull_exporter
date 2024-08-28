import promClient from 'prom-client';

import { logger } from './utils/logger';
import { getOptions } from './utils/options';
import { startServer } from './app';
import CollectorApi from './collector/api';

export async function printOnce(): Promise<void> {
	const opts = getOptions();
	const collector = CollectorApi.getCollector();

	if (opts.autoDiscover) {
		await collector.discoverAll();
	}

	await collector.updateAll();
	await collector.close();

	logger.info(promClient.register.metrics());
}

export async function runServer(): Promise<void> {
	const { done } = await startServer();
	await done;
}

export async function main(...args: string[]): Promise<void> {
	const opts = getOptions(...args);

	if (opts.once) {
		await printOnce();
	} else {
		await runServer();
	}
}

if (require.main === module) {
	const args = process.argv.slice(2);

	let exitCode = 0;
	main(...args)
		.catch(() => (process.exitCode = exitCode = 1))
		.then(() => {
			setTimeout(() => {
				logger.error('No clean exit after 5 seconds, force exit');
				process.exit(exitCode);
			}, 5000).unref();
		})
		.catch((err) => {
			console.error('Double error');
			console.error(err.stack);
			process.exit(-1);
		});
}
