#!/usr/bin/env bash
''':'

TOP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILE="$TOP/$(basename "${BASH_SOURCE[0]}")"

if [[ ! -d "$TOP/.venv" ]] ; then
    echo "Creating venv in $TOP/.venv"
    python3 -m venv "$TOP/.venv"
fi

source "$TOP/.venv/bin/activate"

if ! pip show grafanalib >/dev/null 2>&1 ; then
    echo "Installing grafanalib"
    pip install grafanalib
fi

exec generate-dashboard "$FILE" "$@"
'''

from grafanalib.core import *

prefix = 'bull'

dashboard = Dashboard(
    title="Bull Queue",
    links=[DashboardLink(
        uri='https://github.com/UpHabit/bull_exporter',
        title='About Bull',
        type='link',
        dashboard=None,
    )],
    rows=[
        Row(panels=[
            Graph(
                title="Queue Length",
                dataSource='Prometheus',
                transparent=True,
                targets=[
                    Target(
                        expr=f'sum({prefix}_queue_waiting) by (prefix, queue)',
                        legendFormat="{{ queue }}",
                        refId='A',
                    ),
                ],
                yAxes=[
                    YAxis(format=OPS_FORMAT),
                    YAxis(format=OPS_FORMAT),
                ],
            ),
            Graph(
                title="Queue Length",
                dataSource='Prometheus',
                transparent=True,
                targets=[
                    Target(
                        expr=f'sum({prefix}_queue_waiting  / rate({prefix}_queue_completed[5m])) by (queue, prefix)',
                        legendFormat="{{ queue }}",
                        refId='A',
                    ),
                ],
                yAxes=[
                    YAxis(format=OPS_FORMAT),
                    YAxis(format=OPS_FORMAT),
                ],
            ),
        ]),
        Row(panels=[
            Graph(
                title="Queue States",
                dataSource='Prometheus',
                transparent=True,
                seriesOverrides=[{
                    "alias": "Complete Rate",
                    "yaxis": 2
                }, {
                    "alias": "Fail Rate",
                    "yaxis": 2
                }],
                yAxes=[
                    YAxis(format='short'),
                    YAxis(format='opm'),
                ],
                targets=[
                    Target(
                        expr=f'sum(rate({prefix}_queue_completed[5m])) * 60',
                        legendFormat="Complete Rate",
                        refId='A',
                    ),
                    Target(
                        expr=f'sum(rate({prefix}_queue_failed[5m])) * 60',
                        legendFormat="Fail Rate",
                        refId='B',
                    ),
                    Target(
                        expr=f'sum({prefix}_queue_active)',
                        legendFormat="Active",
                        refId='C',
                    ),
                    Target(
                        expr=f'sum({prefix}_queue_waiting)',
                        legendFormat="Waiting",
                        refId='D',
                    ),
                    Target(
                        expr=f'sum({prefix}_queue_delayed)',
                        legendFormat="Delayed",
                        refId='E',
                    ),
                    Target(
                        expr=f'sum({prefix}_queue_failed)',
                        legendFormat="Failed",
                        refId='F',
                    ),
                ],
            ),
            Graph(
                title="Failures By Queue",
                dataSource='Prometheus',
                transparent=True,
                targets=[
                    Target(
                        expr=f'max({prefix}_queue_failed) by (queue)',
                        legendFormat="{{ queue }}",
                        refId='A',
                    )
                ]
            ),
        ]),
        Row(panels=[
            Graph(
                title="Job Duration 90th Percentile",
                dataSource='Prometheus',
                transparent=True,
                yAxes=[
                    YAxis(format=MILLISECONDS_FORMAT),
                    YAxis(format=MILLISECONDS_FORMAT),
                ],
                targets=[
                    Target(
                        expr=f'sum({prefix}_queue_complete_duration {{ quantile = "0.9" }}) by (queue)',
                        legendFormat="{{ queue }}",
                        refId='A',
                    )
                ]
            ),
        ]),
    ],
).auto_panel_ids()
