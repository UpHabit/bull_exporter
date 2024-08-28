import { MetricsCollector } from './metrics-collector';
import { getOptions } from '../utils/options';

let collector: MetricsCollector;

const CollectorApi = {
	getCollector,
	discoverAll,
	updateAll,
	ping,
	startCollector,
};

function getCollector() {
	if (!collector) {
		const opts = getOptions();
		const queueNames = opts._;

		collector = new MetricsCollector(queueNames);
	}

	return collector;
}

async function startCollector() {
	const opts = getOptions();
	const collector = getCollector();

	if (opts.autoDiscover) {
		await collector.discoverAll();
	}

	collector.collectJobCompletions();
}

async function discoverAll() {
	const collector = getCollector();
	await collector.discoverAll();
}

async function ping() {
	const collector = getCollector();
	await collector.ping();
}

async function updateAll() {
	const collector = getCollector();
	await collector.updateAll();
}

export default CollectorApi;
