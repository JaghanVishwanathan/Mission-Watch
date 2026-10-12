import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { Icon } from '../../shared/ui/icon';

export interface TableColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

/** A chart with an equivalent data-table view, so no figure is chart-only (SRS §10.4). */
@Component({
  selector: 'mw-chart-panel',
  imports: [NgxEchartsDirective, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" [attr.aria-labelledby]="id() + '-title'">
      <header class="head">
        <div>
          <h2 [id]="id() + '-title'">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="subtitle">{{ subtitle() }}</p>
          }
        </div>
        <button
          type="button"
          class="btn btn--ghost toggle"
          [attr.aria-pressed]="showTable()"
          (click)="showTable.set(!showTable())"
        >
          <mw-icon [name]="showTable() ? 'chart' : 'table'" [size]="16" />
          {{ showTable() ? 'Show chart' : 'Show table' }}
        </button>
      </header>

      @if (showTable()) {
        <div class="table-wrap">
          <table class="data-table">
            <caption class="visually-hidden">
              {{
                title()
              }}
            </caption>
            <thead>
              <tr>
                @for (c of columns(); track c.key) {
                  <th scope="col" [class.num]="c.numeric">{{ c.label }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr>
                  @for (c of columns(); track c.key) {
                    <td [class.num]="c.numeric">{{ row[c.key] }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div
          echarts
          class="chart"
          [style.height.px]="height()"
          [options]="options()"
          [autoResize]="true"
          role="img"
          [attr.aria-label]="title()"
        ></div>
      }

      @if (footnote()) {
        <p class="footnote">{{ footnote() }}</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .panel {
      display: grid;
      gap: var(--space-3);
      height: 100%;
      align-content: start;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-3);
    }
    h2 {
      font-size: var(--fs-md);
    }
    .subtitle {
      font-size: var(--fs-sm);
      color: var(--text-muted);
    }
    .toggle {
      height: 32px;
      padding: 0 var(--space-2);
      flex-shrink: 0;
    }
    .chart {
      width: 100%;
    }
    .table-wrap {
      max-height: 360px;
      overflow: auto;
    }
    .footnote {
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }
  `,
})
export class ChartPanel {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly footnote = input<string>();
  readonly options = input.required<EChartsCoreOption>();
  readonly columns = input.required<TableColumn[]>();
  readonly rows = input.required<Record<string, string | number>[]>();
  readonly height = input(280);

  protected readonly showTable = signal(false);
}
