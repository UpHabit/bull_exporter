export interface Options {
  url: string;
  prefix: string;
  metricPrefix: string;
  once: boolean;
  port: number;
  bindAddress: string;
  autoDiscover: boolean;
}

export function getOptions(): Options {
  const port = process.env.PORT ? +process.env.PORT : 9538;
  const url = process.env.REDIS_URL;
  const prefix = process.env.PREFIX ?? "bull";
  const metricPrefix = process.env.METRIC_PREFIX ?? "bull_queue_";
  const autoDiscover = process.env.AUTO_DISCOVER === "false" ? false : true;
  const bindAddress = process.env.BIND_ADDRESS ?? "0.0.0.0"; // Address to listen on
  const once = process.env.ONCE === "true" ? true : false;

  if (!url) {
    throw new Error("A redis connection url not set");
  }

  return { port, url, prefix, metricPrefix, autoDiscover, bindAddress, once };
}
