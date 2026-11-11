/**
 * Must be imported before 'cesium': tells CesiumJS where its static Workers, Assets and Widgets are
 * served (copied to /cesium by angular.json). Relative to the base href, like other assets.
 */
(globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = new URL(
  'cesium/',
  document.baseURI,
).href;
