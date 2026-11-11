import { AppEnvironment } from './environment.model';

/** `npm run start:backend`: use the local MissionWatch API (backend/missionwatch-api). */
export const environment: AppEnvironment = {
  dataSource: 'backend',
  apiBaseUrl: 'http://localhost:8080',
};
