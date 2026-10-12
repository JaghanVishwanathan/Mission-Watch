// Tree-shaken ECharts build: only what the analytics page draws. Loaded lazily via
// provideEchartsCore, so it never ships in the initial bundle (NFR-01).
import { BarChart, LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, AriaComponent, GridComponent, TooltipComponent, SVGRenderer]);

export { echarts };
