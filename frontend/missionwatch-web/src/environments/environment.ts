import { AppEnvironment } from './environment.model';

/**
 * Default build (production and `npm start`): read Launch Library 2 directly from the browser.
 * The public site stays on this until the MissionWatch API is hosted (Phase 8).
 */
export const environment: AppEnvironment = {
  dataSource: 'll2',
  apiBaseUrl: '',
};
