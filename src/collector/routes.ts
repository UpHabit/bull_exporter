import expressPromiseRouter from 'express-promise-router';
import { Request, Response, RequestHandler } from 'express';
import promClient from 'prom-client';

import CollectorApi from './api';

function init() {
	const router = expressPromiseRouter();

	router.post('/discover_queues', ...discoverQueues);
	router.get('/healthz', ...getHealth);
	router.get('/metrics', ...getMetrics);

	return router;
}

const discoverQueues = [
	async (_req: Request, res: Response) => {
		await CollectorApi.discoverAll();

		return res.send({ ok: true });
	},
] as RequestHandler[];

const getHealth = [
	async (_req: Request, res: Response) => {
		await CollectorApi.ping();

		return res.send({ ok: true });
	},
] as RequestHandler[];

const getMetrics = [
	async (_req: Request, res: Response) => {
		await CollectorApi.updateAll();

		res.contentType(promClient.register.contentType);

		return res.send(promClient.register.metrics());
	},
] as RequestHandler[];

const collectorRoutes = init();

export default collectorRoutes;
