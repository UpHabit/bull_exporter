import bull from "bull";
import IORedis from "ioredis";
import { Gauge, Registry, Summary } from "prom-client";

type LabelsT = "queue" | "prefix";

export interface QueueGauges {
  completed: Gauge<LabelsT>;
  active: Gauge<LabelsT>;
  delayed: Gauge<LabelsT>;
  failed: Gauge<LabelsT>;
  waiting: Gauge<LabelsT>;
  completeSummary: Summary<LabelsT>;
  connectedClients: Gauge<LabelsT>;
  blockedClients: Gauge<LabelsT>;
}

export function makeGuages(
  statPrefix: string,
  registers: Registry[]
): QueueGauges {
  return {
    completed: new Gauge({
      registers,
      name: `${statPrefix}completed`,
      help: "Number of completed messages",
      labelNames: ["queue", "prefix"],
    }),
    completeSummary: new Summary({
      registers,
      name: `${statPrefix}complete_duration`,
      help: "Time to complete jobs",
      labelNames: ["queue", "prefix"],
      maxAgeSeconds: 300,
      ageBuckets: 13,
    }),
    active: new Gauge({
      registers,
      name: `${statPrefix}active`,
      help: "Number of active messages",
      labelNames: ["queue", "prefix"],
    }),
    delayed: new Gauge({
      registers,
      name: `${statPrefix}delayed`,
      help: "Number of delayed messages",
      labelNames: ["queue", "prefix"],
    }),
    failed: new Gauge({
      registers,
      name: `${statPrefix}failed`,
      help: "Number of failed messages",
      labelNames: ["queue", "prefix"],
    }),
    waiting: new Gauge({
      registers,
      name: `${statPrefix}waiting`,
      help: "Number of waiting messages",
      labelNames: ["queue", "prefix"],
    }),
    connectedClients: new Gauge({
      registers,
      name: `${statPrefix}connected_clients`,
      help: "Connected clients",
      labelNames: ["queue", "prefix"],
    }),
    blockedClients: new Gauge({
      registers,
      name: `${statPrefix}blocked_clients`,
      help: "Blocked clients",
      labelNames: ["queue", "prefix"],
    }),
  };
}

export async function getJobCompleteStats(
  prefix: string,
  name: string,
  job: bull.Job,
  gauges: QueueGauges
): Promise<void> {
  if (!job.finishedOn) {
    return;
  }
  const duration = job.finishedOn - job.processedOn!;
  gauges.completeSummary.observe({ prefix, queue: name }, duration);
}

async function getConnectedClients(redisClient: IORedis.Redis) {
  const info = await redisClient.info();
  const connectedClients = info
    .split("\r\n")
    .find((line) => line.startsWith("connected_clients"));
  const connectedClientsNumber = connectedClients?.split(":")[1];

  if (connectedClientsNumber) {
    return parseInt(connectedClientsNumber);
  }

  return undefined;
}

async function getBlockedClients(redisClient: IORedis.Redis) {
  const info = await redisClient.info();
  const blockedClients = info
    .split("\r\n")
    .find((line) => line.startsWith("blocked_clients"));
  const blockedClientsNumber = blockedClients?.split(":")[1];

  if (blockedClientsNumber) {
    return parseInt(blockedClientsNumber);
  }

  return undefined;
}

export async function getStats(
  prefix: string,
  name: string,
  queue: bull.Queue,
  gauges: QueueGauges,
  redisClient: IORedis.Redis
): Promise<void> {
  const { completed, active, delayed, failed, waiting } =
    await queue.getJobCounts();

  const connectedClients = await getConnectedClients(redisClient);
  const blockedClients = await getBlockedClients(redisClient);

  gauges.completed.set({ prefix, queue: name }, completed);
  gauges.active.set({ prefix, queue: name }, active);
  gauges.delayed.set({ prefix, queue: name }, delayed);
  gauges.failed.set({ prefix, queue: name }, failed);
  gauges.waiting.set({ prefix, queue: name }, waiting);
  if (connectedClients) {
    gauges.connectedClients.set({ prefix, queue: name }, connectedClients);
  }
  if (blockedClients) {
    gauges.blockedClients.set({ prefix, queue: name }, blockedClients);
  }
}
