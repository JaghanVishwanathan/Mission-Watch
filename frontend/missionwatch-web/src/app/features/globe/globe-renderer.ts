import { InjectionToken } from '@angular/core';
import { GeoPoint } from './globe-util';

/**
 * The boundary between the globe page and the 3D engine. Only cesium-globe-renderer.ts imports
 * CesiumJS; the page talks to this interface, and tests provide a fake (jsdom has no WebGL).
 */

export interface GlobeMarker {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** Launches at this site in the current view. */
  count: number;
  selected: boolean;
}

export interface GlobePath {
  points: GeoPoint[];
  /** Where the vehicle marker sits on the path, 0 (pad) to 1 (end). */
  progress: number;
  /** Shown next to the path; always says the path is illustrative. */
  label: string;
}

export interface GlobeTarget {
  latitude: number;
  longitude: number;
  /** Camera height above the surface in kilometres. */
  heightKm: number;
}

export interface GlobeRenderer {
  /** Creates the globe in the element. Rejects when WebGL or the engine is unavailable. */
  init(container: HTMLElement): Promise<void>;
  setMarkers(markers: GlobeMarker[]): void;
  setPath(path: GlobePath | null): void;
  focus(target: GlobeTarget, animate: boolean): void;
  /** Called with a marker id when the viewer clicks a site marker. */
  onSelect(handler: (markerId: string) => void): void;
  destroy(): void;
}

/** Creates the renderer on demand, so CesiumJS loads only when the globe is shown. */
export type GlobeRendererFactory = () => Promise<GlobeRenderer>;

export const GLOBE_RENDERER = new InjectionToken<GlobeRendererFactory>('GLOBE_RENDERER', {
  providedIn: 'root',
  factory: () => () => import('./cesium-globe-renderer').then((m) => new m.CesiumGlobeRenderer()),
});
