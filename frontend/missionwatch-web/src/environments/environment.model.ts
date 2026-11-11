/**
 * Build-time settings, swapped per Angular configuration (angular.json fileReplacements).
 *
 * - `ll2`: Launch Library 2 directly from the browser, cached locally (no backend needed)
 * - `backend`: the MissionWatch API at `apiBaseUrl`
 * - `mock`: the bundled demo dataset, for offline work
 */
export interface AppEnvironment {
  dataSource: 'll2' | 'backend' | 'mock';
  /** Base URL of the MissionWatch API, without a trailing slash. Used when dataSource is 'backend'. */
  apiBaseUrl: string;
}
