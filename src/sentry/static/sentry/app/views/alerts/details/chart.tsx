import React from 'react';
import moment from 'moment';

import {t} from 'app/locale';
import space from 'app/styles/space';
import theme from 'app/utils/theme';
import {getFormattedDate, getTimeFormat} from 'app/utils/dates';
import {Trigger} from 'app/views/settings/incidentRules/types';
import LineChart from 'app/components/charts/lineChart';
import MarkPoint from 'app/components/charts/components/markPoint';
import MarkLine from 'app/components/charts/components/markLine';

import closedSymbol from './closedSymbol';
import startedSymbol from './startedSymbol';

type Data = [number, {count: number}[]];
/**
 * So we'll have to see how this looks with real data, but echarts requires
 * an explicit (x,y) value to draw a symbol (incident detected/closed bubble).
 *
 * This uses the closest date *without* going over.
 *
 * AFAICT we can't give it an x-axis value and have it draw on the line,
 * so we probably need to calculate the y-axis value ourselves if we want it placed
 * at the exact time.
 *
 * @param data Data array
 * @param needle the target timestamp
 */
function getNearbyIndex(data: Data[], needle: number) {
  // `data` is sorted, return the first index whose value (timestamp) is > `needle`
  const index = data.findIndex(([ts]) => ts > needle);

  // this shouldn't happen, as we try to buffer dates before start/end dates
  if (index === 0) {
    return 0;
  }

  return index !== -1 ? index - 1 : data.length - 1;
}

type Props = {
  data: Data[];
  aggregate: string;
  started: string;
  closed?: string;
  triggers?: Trigger[];
  timeWindow: number;
};

const Chart = (props: Props) => {
  const {aggregate, data, started, closed, triggers, timeWindow} = props;
  const startedTs = started && moment.utc(started).unix();
  const closedTs = closed && moment.utc(closed).unix();
  const chartData = data.map(([ts, val]) => [
    ts * 1000,
    val.length ? val.reduce((acc, {count} = {count: 0}) => acc + count, 0) : 0,
  ]);

  const startedCoordinate = startedTs
    ? chartData[getNearbyIndex(data, startedTs)]
    : undefined;
  const showClosedMarker =
    data && closedTs && data[data.length - 1] && data[data.length - 1][0] >= closedTs
      ? true
      : false;
  const closedCoordinate =
    closedTs && showClosedMarker ? chartData[getNearbyIndex(data, closedTs)] : undefined;

  const seriesName = aggregate;

  const warningTrigger = triggers?.find(trig => trig.label === 'warning');
  const criticalTrigger = triggers?.find(trig => trig.label === 'critical');
  const warningTriggerAlertThreshold =
    typeof warningTrigger?.alertThreshold === 'number'
      ? warningTrigger?.alertThreshold
      : undefined;
  const warningTriggerResolveThreshold =
    typeof warningTrigger?.resolveThreshold === 'number'
      ? warningTrigger?.resolveThreshold
      : undefined;
  const criticalTriggerAlertThreshold =
    typeof criticalTrigger?.alertThreshold === 'number'
      ? criticalTrigger?.alertThreshold
      : undefined;
  const criticalTriggerResolveThreshold =
    typeof criticalTrigger?.resolveThreshold === 'number'
      ? criticalTrigger?.resolveThreshold
      : undefined;

  const marklinePrecision = Math.max(
    ...[
      warningTriggerAlertThreshold,
      warningTriggerResolveThreshold,
      criticalTriggerAlertThreshold,
      criticalTriggerResolveThreshold,
    ].map(decimal => {
      if (!decimal || !isFinite(decimal)) return 0;
      let e = 1;
      let p = 0;
      while (Math.round(decimal * e) / e !== decimal) {
        e *= 10;
        p += 1;
      }
      return p;
    })
  );

  // alert rule time window is in minutes but x-axis
  const timeWindowMillis = timeWindow * 60 * 1000;

  const tooltip = {
    formatAxisLabel(
      value: number,
      isTimestamp: boolean,
      utc: boolean,
      showTimeInTooltip: boolean
    ) {
      if (!isTimestamp) {
        return value;
      }

      if (!timeWindow) {
        const format = `MMM D, YYYY ${showTimeInTooltip ? getTimeFormat() : ''}`.trim();
        return getFormattedDate(value, format, {local: !utc});
      }

      const now = moment();
      const bucketStart = moment(value);
      const bucketEnd = moment(value + timeWindowMillis);

      let format = '';

      if (now.year() !== bucketStart.year()) {
        format = `MMM D, YYYY ${showTimeInTooltip ? getTimeFormat() : ''}`.trim();
      } else if (bucketStart.date() !== bucketEnd.date()) {
        format = `MMM D ${showTimeInTooltip ? getTimeFormat() : ''}`.trim();
      } else {
        format = getTimeFormat();
      }

      return `${getFormattedDate(bucketStart, format, {
        local: !utc,
      })} - ${getFormattedDate(bucketEnd, format, {local: !utc})}`;
    },
  };

  return (
    <LineChart
      isGroupedByDate
      showTimeInTooltip
      grid={{
        left: 0,
        right: 0,
        top: space(2),
        bottom: 0,
      }}
      series={[
        {
          // e.g. Events or Users
          seriesName,
          dataArray: chartData,
          markPoint: MarkPoint({
            data: [
              {
                labelForValue: seriesName,
                seriesName,
                symbol: `image://${startedSymbol}`,
                name: t('Alert Triggered'),
                coord: startedCoordinate,
              },
              ...(closedTs
                ? [
                    {
                      labelForValue: seriesName,
                      seriesName,
                      symbol: `image://${closedSymbol}`,
                      symbolSize: 24,
                      name: t('Alert Resolved'),
                      coord: closedCoordinate,
                    },
                  ]
                : []),
            ],
          }),
        },
        warningTrigger &&
          warningTriggerAlertThreshold && {
            name: 'Warning Alert',
            type: 'line',
            markLine: MarkLine({
              silent: true,
              lineStyle: {color: theme.yellow400},
              data: [
                {
                  yAxis: warningTriggerAlertThreshold,
                },
              ],
              precision: marklinePrecision,
              label: {
                show: true,
                position: 'insideEndTop',
                formatter: 'WARNING',
                color: theme.yellow400,
                fontSize: 10,
              },
            }),
            data: [],
          },
        warningTrigger &&
          warningTriggerResolveThreshold && {
            name: 'Warning Resolve',
            type: 'line',
            markLine: MarkLine({
              silent: true,
              lineStyle: {color: theme.gray400},
              data: [
                {
                  yAxis: warningTriggerResolveThreshold,
                },
              ],
              precision: marklinePrecision,
              label: {
                show: true,
                position: 'insideEndBottom',
                formatter: 'WARNING RESOLUTION',
                color: theme.gray400,
                fontSize: 10,
              },
            }),
            data: [],
          },
        criticalTrigger &&
          criticalTriggerAlertThreshold && {
            name: 'Critical Alert',
            type: 'line',
            markLine: MarkLine({
              silent: true,
              lineStyle: {color: theme.red300},
              data: [
                {
                  yAxis: criticalTriggerAlertThreshold,
                },
              ],
              precision: marklinePrecision,
              label: {
                show: true,
                position: 'insideEndTop',
                formatter: 'CRITICAL',
                color: theme.red400,
                fontSize: 10,
              },
            }),
            data: [],
          },
        criticalTrigger &&
          criticalTriggerResolveThreshold && {
            name: 'Critical Resolve',
            type: 'line',
            markLine: MarkLine({
              silent: true,
              lineStyle: {color: theme.gray400},
              data: [
                {
                  yAxis: criticalTriggerResolveThreshold,
                },
              ],
              precision: marklinePrecision,
              label: {
                show: true,
                position: 'insideEndBottom',
                formatter: 'CRITICAL RESOLUTION',
                color: theme.gray400,
                fontSize: 10,
              },
            }),
            data: [],
          },
      ].filter(Boolean)}
      tooltip={tooltip}
    />
  );
};

export default Chart;
