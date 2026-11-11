import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { handleNavigationError } from './core/chunk-reload';
import { provideLaunchData } from './core/data/provide-launch-data';
import { MissionWatchTitleStrategy } from './core/title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // After a deploy, pages may request code files that no longer exist; reload to recover.
      withNavigationErrorHandler(handleNavigationError),
    ),
    { provide: TitleStrategy, useClass: MissionWatchTitleStrategy },
    // Launch data source per build: Launch Library 2 directly (default), the MissionWatch API
    // (`npm run start:backend`) or the demo dataset. See src/environments.
    provideLaunchData(environment),
  ],
};
