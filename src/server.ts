import express from 'express';
import * as http from 'http';
import promClient from 'prom-client';
import { v4 as uuid } from 'uuid';

import { logger } from './logger';
import { MetricCollector } from './metricCollector';
import { Options } from './options';

function calcDuration(start: [number, number]): number {
  const diff = process.hrtime(start);
  return diff[0] * 1e3 + diff[1] * 1e-6;
}

export function makeServer(opts: Options): express.Application {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Content-Security-Policy', `default-src 'none'; form-action 'none'`);
    res.header('X-Permitted-Cross-Domain-Policies', 'none');
    res.header('Pragma', 'no-cache');
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Content-Type-Options', 'nosniff');
    res.header('XSS-Protection', '1; mode=block');
    next();
  });

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {

    const start = process.hrtime();
    const id = uuid();
    const reqLog = logger.child({
      req,
      req_id: id,
    });

    res.on('finish', () => {
      const data = {
        res,
        duration: calcDuration(start),
      };
      reqLog.info(data, 'request finish');
    });

    res.on('close', () => {
      const data = {
        res,
        duration: calcDuration(start),

      };
      reqLog.warn(data, 'request socket closed');
    });

    next();

  });

  const collector = new MetricCollector(opts.metricPrefix, opts._, { redis: opts.url, prefix: opts.prefix });
  collector.collectJobCompletions();

  app.get('/healthz', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    collector.ping()
      .then(() => {
        res.send({
          ok: true,
        });
      })
      .catch(err => next(err));
  });

  app.get('/metrics', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    collector.updateAll()
      .then(() => {
        res.contentType(promClient.register.contentType);
        res.send(promClient.register.metrics());
      })
      .catch(err => next(err));
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500);
    res.send({
      err: (err && err.message) || 'Unknown error',
    });
  });

  return app;
}

export async function startServer(opts: Options): Promise<{ done: Promise<void> }> {
  const app = makeServer(opts);

  let server: http.Server;
  await new Promise((resolve, reject) => {
    server = app.listen(opts.port, opts.bindAddress, (err: any) => {
      if (err) {
        reject(err);
        return;
      }
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
