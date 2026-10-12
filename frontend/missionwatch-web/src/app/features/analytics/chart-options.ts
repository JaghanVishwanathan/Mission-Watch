import type { EChartsCoreOption } from 'echarts/core';
import { CountBucket, LaunchStatus, ProviderStats } from '../../core/models';
import { STATUS_INFO } from '../../core/util/status';
import { Theme } from '../../core/state/theme.service';

/**
 * Chart palette per theme. Series blue follows the validated reference palette
 * (light #2a78d6 / dark #3987e5); status colours are reserved for outcomes and always
 * paired with a text label.
 */
export interface ChartPalette {
  series: string;
  text: string;
  muted: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  status: Record<'good' | 'serious' | 'critical', string>;
}

export const PALETTES: Record<Theme, ChartPalette> = {
  dark: {
    series: '#d6d9de',
    text: '#ffffff',
    muted: '#8c8c8c',
    grid: '#1c1e22',
    axis: '#34373d',
    tooltipBg: '#0c0d0f',
    tooltipBorder: 'rgba(255,255,255,0.16)',
    status: { good: '#2fbf71', serious: '#ec835a', critical: '#ef5b5b' },
  },
  light: {
    series: '#24272c',
    text: '#000000',
    muted: '#62666e',
    grid: '#e8e8eb',
    axis: '#c4c6cc',
    tooltipBg: '#ffffff',
    tooltipBorder: 'rgba(10,14,26,0.12)',
    status: { good: '#138a4b', serious: '#c2511f', critical: '#c62f2f' },
  },
};

const FONT = 'Barlow, system-ui, -apple-system, "Segoe UI", sans-serif';

function base(p: ChartPalette, reducedMotion: boolean, description: string): EChartsCoreOption {
  return {
    animation: !reducedMotion,
    animationDuration: 400,
    aria: { enabled: true, label: { description } },
    textStyle: { fontFamily: FONT, color: p.muted },
    tooltip: {
      backgroundColor: p.tooltipBg,
      borderColor: p.tooltipBorder,
      textStyle: { color: p.text, fontFamily: FONT, fontSize: 12 },
      extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);',
    },
  };
}

function categoryAxis(p: ChartPalette, data: string[], extra: object = {}) {
  return {
    type: 'category',
    data,
    axisLine: { lineStyle: { color: p.axis } },
    axisTick: { show: false },
    axisLabel: { color: p.muted, fontSize: 11 },
    ...extra,
  };
}

function valueAxis(p: ChartPalette) {
  return {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { color: p.grid } },
    axisLabel: { color: p.muted, fontSize: 11 },
  };
}

export function launchesPerYearOption(
  rows: CountBucket[],
  p: ChartPalette,
  reducedMotion: boolean,
): EChartsCoreOption {
  return {
    ...base(p, reducedMotion, `Bar chart of launches per year, ${rows.length} years.`),
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      ...(base(p, reducedMotion, '')['tooltip'] as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: categoryAxis(
      p,
      rows.map((r) => r.label),
    ),
    yAxis: valueAxis(p),
    series: [
      {
        name: 'Launches',
        type: 'bar',
        data: rows.map((r) => r.count),
        barMaxWidth: 28,
        itemStyle: { color: p.series, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
      },
    ],
  };
}

export function monthlyCadenceOption(
  rows: CountBucket[],
  p: ChartPalette,
  reducedMotion: boolean,
): EChartsCoreOption {
  return {
    ...base(
      p,
      reducedMotion,
      `Line chart of launches per month over the last ${rows.length} months.`,
    ),
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      ...(base(p, reducedMotion, '')['tooltip'] as object),
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: p.axis } },
    },
    xAxis: categoryAxis(
      p,
      rows.map((r) => r.label),
      { boundaryGap: false },
    ),
    yAxis: valueAxis(p),
    series: [
      {
        name: 'Launches',
        type: 'line',
        data: rows.map((r) => r.count),
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2, color: p.series },
        itemStyle: { color: p.series },
        areaStyle: { color: p.series, opacity: 0.08 },
      },
    ],
  };
}

export function providerVolumeOption(
  rows: ProviderStats[],
  p: ChartPalette,
  reducedMotion: boolean,
): EChartsCoreOption {
  const ordered = [...rows].reverse(); // largest at top in a horizontal bar chart
  return {
    ...base(
      p,
      reducedMotion,
      `Horizontal bar chart of launches by provider, ${rows.length} providers.`,
    ),
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...(base(p, reducedMotion, '')['tooltip'] as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: { ...valueAxis(p), axisLabel: { show: false } },
    yAxis: categoryAxis(
      p,
      ordered.map((r) => r.abbrev ?? r.name),
      { axisLabel: { color: p.text, fontSize: 12 } },
    ),
    series: [
      {
        name: 'Launches',
        type: 'bar',
        data: ordered.map((r) => r.launches),
        barMaxWidth: 18,
        itemStyle: { color: p.series, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: p.muted, fontSize: 11 },
      },
    ],
  };
}

export function outcomesOption(
  rows: { status: LaunchStatus; count: number }[],
  p: ChartPalette,
  reducedMotion: boolean,
): EChartsCoreOption {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const toneColor = (status: LaunchStatus) => {
    const tone = STATUS_INFO[status].tone;
    return tone === 'good' || tone === 'serious' || tone === 'critical' ? p.status[tone] : p.muted;
  };
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : '0%');
  const ordered = [...rows].reverse();
  return {
    ...base(p, reducedMotion, 'Horizontal bar chart of launch outcomes.'),
    grid: { left: 8, right: 96, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...(base(p, reducedMotion, '')['tooltip'] as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: { ...valueAxis(p), axisLabel: { show: false } },
    yAxis: categoryAxis(
      p,
      ordered.map((r) => STATUS_INFO[r.status].label),
      { axisLabel: { color: p.text, fontSize: 12 } },
    ),
    series: [
      {
        name: 'Launches',
        type: 'bar',
        barMaxWidth: 18,
        data: ordered.map((r) => ({
          value: r.count,
          itemStyle: { color: toneColor(r.status), borderRadius: [0, 4, 4, 0] },
        })),
        // Direct labels: identity never rests on colour alone.
        label: {
          show: true,
          position: 'right',
          color: p.muted,
          fontSize: 11,
          formatter: (params: { value: number }) => `${params.value} (${pct(params.value)})`,
        },
      },
    ],
  };
}
