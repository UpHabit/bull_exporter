import "dotenv/config";

import promClient from "prom-client";

import { logger } from "./logger";
import { MetricCollector } from "./metricCollector";
import { getOptions, Options } from "./options";
import { startServer } from "./server";

export async function printOnce(opts: Options): Promise<void> {
  const collector = new MetricCollector([], {
    logger,
    metricPrefix: opts.metricPrefix,
    redis: opts.url,
    prefix: opts.prefix,
    autoDiscover: opts.autoDiscover,
  });
  if (opts.autoDiscover) {
    await collector.discoverAll();
  }
  await collector.updateAll();
  await collector.close();

  console.log(promClient.register.metrics());
}

export async function runServer(opts: Options): Promise<void> {
  const { done } = await startServer(opts);
  await done;
}

export async function main(): Promise<void> {
  const opts = getOptions();
  if (opts.once) {
    await printOnce(opts);
  } else {
    await runServer(opts);
  }
}

if (require.main === module) {
  let exitCode = 0;
  main()
    .catch(() => (process.exitCode = exitCode = 1))
    .then(() => {
      setTimeout(() => {
        logger.error("No clean exit after 5 seconds, force exit");
        process.exit(exitCode);
      }, 5000).unref();
    })
    .catch((err) => {
      console.error("Double error");
      console.error(err.stack);
      process.exit(-1);
    });
}
