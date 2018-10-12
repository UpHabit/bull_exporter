import * as Logger from 'bunyan';

const streams = [{
  stream: process.stdout,
  level: 'info' as Logger.LogLevelString,
}];

export function create(name: string): Logger {
  return Logger.createLogger({
    name,
    streams,
    serializers: {
      err(err: any): any {
        if (!err) { return err; }
        return {
          name: err.name || err.constructor.name || 'Error',
          message: err.message,
          stack: err.stack,
          errors: err.errors,
        };
      },
      req: Logger.stdSerializers.req,
      res: Logger.stdSerializers.res,
    },
  });
}

export const logger = create('bull-prom-metrics');
