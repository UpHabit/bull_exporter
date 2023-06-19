# Bull Queue Exporter - fork

**Prometheus exporter for Bull metrics.**

<p align="right">
  <a href="https://travis-ci.org/UpHabit/bull_exporter/branches/">
    <img src="https://travis-ci.org/UpHabit/bull-prom-metrics.svg?branch=master"/>
  </a>
  <br/>
</p>
<p align="center">
  <a href="https://prometheus.io/">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Prometheus_software_logo.svg/115px-Prometheus_software_logo.svg.png" height="115">
  </a>
  <a href="https://github.com/OptimalBits/bull">
    <img src="https://github.com/OptimalBits/bull/blob/develop/support/logo@2x.png" height="115" />
  </a>
</p>

---

## Setup

#### Prometheus

**An existing prometheus server is required to use this project**

To learn more about how to setup promethues and grafana see: https://eksworkshop.com/monitoring/

#### Grafana

The dashboard pictured above is [available to download from grafana](https://grafana.com/grafana/dashboards/10128).
It will work aslong as EXPORTER_STAT_PREFIX is not changed.

## Queue Discovery

Queues are discovered at start up by running `KEYS bull:*:id`
this can also be triggered manually from the `/discover_queues` endpoint
`curl -XPOST localhost:9538/discover_queues`

## Metrics

| Metric                       | type    | description                                             |
| ---------------------------- | ------- | ------------------------------------------------------- |
| bull_queue_completed         | counter | Total number of completed jobs                          |
| bull_queue_complete_duration | summary | Processing time for completed jobs                      |
| bull_queue_active            | counter | Total number of active jobs (currently being processed) |
| bull_queue_delayed           | counter | Total number of jobs that will run in the future        |
| bull_queue_failed            | counter | Total number of failed jobs                             |
| bull_queue_waiting           | counter | Total number of jobs waiting to be processed            |
| bull_queue_connected_clients | counter | Total number of redis connected clients                 |
| bull_queue_blocked_clients   | counter | Total number of redis blocked clients                   |
