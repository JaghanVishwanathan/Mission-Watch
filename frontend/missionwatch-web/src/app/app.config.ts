import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './app.routes';
import { provideLiveLaunchData } from './core/data/ll2/live-launch-data.service';
import { MissionWatchTitleStrategy } from './core/title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: MissionWatchTitleStrategy },
    // Live sources: Launch Library 2 (launches) + GCAT snapshot (history).
    // Swap for provideMockLaunchData() to work offline with the demo dataset.
    provideLiveLaunchData(),
  ],
};
