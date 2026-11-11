import './cesium-base-url';
import {
  buildModuleUrl,
  Cartesian2,
  Cartesian3,
  Color,
  defined,
  Entity,
  HorizontalOrigin,
  ImageryLayer,
  LabelStyle,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  TileMapServiceImageryProvider,
  VerticalOrigin,
  Viewer,
} from 'cesium';
import { GlobeMarker, GlobeRenderer, GlobeTarget } from './globe-renderer';

const SITE_PREFIX = 'site:';
const WIDGETS_CSS_ID = 'mw-cesium-widgets-css';

/**
 * CesiumJS implementation of the globe. The basemap is Cesium's bundled Natural Earth II imagery,
 * so no Cesium ion account or token is needed and nothing is fetched from third-party map servers.
 */
export class CesiumGlobeRenderer implements GlobeRenderer {
  private viewer?: Viewer;
  private handler?: ScreenSpaceEventHandler;
  private selectHandler?: (id: string) => void;
  private readonly markerEntities: Entity[] = [];
  private accent = Color.fromCssColorString('#3b82f6');

  async init(container: HTMLElement): Promise<void> {
    loadWidgetsCss();
    const css = getComputedStyle(container);
    const signal = css.getPropertyValue('--signal').trim();
    if (signal) this.accent = Color.fromCssColorString(signal);

    const imagery = ImageryLayer.fromProviderAsync(
      TileMapServiceImageryProvider.fromUrl(buildModuleUrl('Assets/Textures/NaturalEarthII')),
    );
    this.viewer = new Viewer(container, {
      baseLayer: imagery,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      // Redraw only when something changes: far less GPU and battery use.
      requestRenderMode: true,
    });
    this.viewer.scene.globe.enableLighting = false;
    this.viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50_000;

    this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction((click: { position: Cartesian2 }) => {
      const picked = this.viewer?.scene.pick(click.position);
      const id: unknown = defined(picked) ? picked.id?.id : undefined;
      if (typeof id === 'string' && id.startsWith(SITE_PREFIX)) {
        this.selectHandler?.(id.slice(SITE_PREFIX.length));
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  setMarkers(markers: GlobeMarker[]): void {
    const viewer = this.viewer;
    if (!viewer) return;
    for (const e of this.markerEntities.splice(0)) viewer.entities.remove(e);
    for (const m of markers) {
      this.markerEntities.push(
        viewer.entities.add({
          id: SITE_PREFIX + m.id,
          name: m.label,
          position: Cartesian3.fromDegrees(m.longitude, m.latitude),
          point: {
            pixelSize: m.selected ? 14 : 8 + Math.min(m.count, 6),
            color: m.selected ? this.accent : Color.WHITE,
            outlineColor: m.selected ? Color.WHITE : this.accent,
            outlineWidth: 2,
          },
          label: {
            text: m.count > 1 ? `${m.label} (${m.count})` : m.label,
            font: '12px sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            horizontalOrigin: HorizontalOrigin.LEFT,
            verticalOrigin: VerticalOrigin.CENTER,
            pixelOffset: new Cartesian2(12, 0),
            // Labels only when zoomed in, or for the selected site, to avoid clutter.
            translucencyByDistance: m.selected
              ? undefined
              : new NearFarScalar(1.5e6, 1.0, 8.0e6, 0.0),
          },
        }),
      );
    }
    viewer.scene.requestRender();
  }

  focus(target: GlobeTarget, animate: boolean): void {
    this.viewer?.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        target.longitude,
        target.latitude,
        target.heightKm * 1000,
      ),
      duration: animate ? 1.6 : 0,
    });
  }

  onSelect(handler: (markerId: string) => void): void {
    this.selectHandler = handler;
  }

  destroy(): void {
    this.handler?.destroy();
    if (this.viewer && !this.viewer.isDestroyed()) this.viewer.destroy();
    this.viewer = undefined;
  }
}

/** Cesium's widget styles (credits, canvas sizing), added once and only when the globe loads. */
function loadWidgetsCss(): void {
  if (document.getElementById(WIDGETS_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = WIDGETS_CSS_ID;
  link.rel = 'stylesheet';
  link.href = buildModuleUrl('Widgets/widgets.css');
  document.head.appendChild(link);
}
