import { FactoryProvider } from '@angular/core';
import { AppEnvironment } from '../../../environments/environment.model';
import { provideBackendLaunchData } from './backend/backend-launch-data.service';
import { provideLiveLaunchData } from './ll2/live-launch-data.service';
import { provideMockLaunchData } from './mock/mock-launch-data.service';

/** Picks the launch data adapter for this build (see src/environments). */
export function provideLaunchData(env: AppEnvironment): FactoryProvider {
  switch (env.dataSource) {
    case 'backend':
      return provideBackendLaunchData(env.apiBaseUrl);
    case 'mock':
      return provideMockLaunchData();
    case 'll2':
      return provideLiveLaunchData();
  }
}
