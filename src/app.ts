import express from 'express';
import * as http from 'http';

import { logger } from './utils/logger';
import collectorRoutes from './collector/routes';
import { getOptions } from './utils/options';
import { handleError } from './middlewares/error-handler-middleware';
import { setHeaders } from './middlewares/headers-middleware';
import { logRequestDetails } from './middlewares/request-stats-middleware';
import CollectorApi from './collector/api';

export async function makeServer(): Promise<express.Application> {
	const app = express();
	app.disable('x-powered-by');

	app.use(setHeaders);
	app.use(logRequestDetails);

	await CollectorApi.startCollector();

	app.use('/', collectorRoutes);

	app.use(handleError);

	return app;
}

export async function startServer(): Promise<{ done: Promise<void> }> {
	const app = await makeServer();

	let server: http.Server;
	const opts = getOptions();
	await new Promise<void>((resolve) => {
		server = app.listen(opts.port, opts.bindAddress, () => {
			logger.info(`Running on ${opts.bindAddress}:${opts.port}`);
			resolve();
		});
	});

	process.on('SIGTERM', () => server.close());

	const done = new Promise<void>((resolve, reject) => {
		server.on('close', () => resolve());
		server.on('error', (err: any) => reject(err));
	});

	return { done };
}
