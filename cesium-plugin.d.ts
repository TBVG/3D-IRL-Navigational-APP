
// TypeScript declaration file for cesium-plugin.js
export function cesiumPlugin(): {
  name: string;
  configureServer(server: any): void;
  config(): {
    build: {
      assetsInlineLimit: number;
      rollupOptions: {
        output: {
          manualChunks: {
            cesium: string[];
          };
        };
      };
    };
    resolve: {
      alias: {
        '@': string;
        'cesium': string;
      };
    };
  };
};

// Add more complete type declarations for Cesium to fix TypeScript errors
declare module 'cesium' {
  // Viewer class
  class Viewer {
    constructor(container: HTMLElement | string, options?: ViewerOptions);
    scene: Scene;
    camera: Camera;
    imageryLayers: ImageryLayerCollection;
    terrainProvider: any;
    destroy(): void;
    isDestroyed(): boolean;
    entities: EntityCollection;
  }

  // ViewerOptions interface
  interface ViewerOptions {
    animation?: boolean;
    baseLayerPicker?: boolean;
    fullscreenButton?: boolean;
    geocoder?: boolean;
    homeButton?: boolean;
    infoBox?: boolean;
    sceneModePicker?: boolean;
    selectionIndicator?: boolean;
    timeline?: boolean;
    navigationHelpButton?: boolean;
    navigationInstructionsInitiallyVisible?: boolean;
    scene3DOnly?: boolean;
    imageryProvider?: ImageryProvider | null;
    terrainProvider?: any;
    [key: string]: any;
  }

  // Image Providers
  
  // Base ImageryProvider
  class ImageryProvider {
    constructor(options?: any);
  }

  // BingMapsImageryProvider
  class BingMapsImageryProvider extends ImageryProvider {
    constructor(options: { 
      url: string;
      key: string;
      mapStyle?: BingMapsStyle;
    });
  }

  // BingMapsStyle enum
  enum BingMapsStyle {
    AERIAL,
    AERIAL_WITH_LABELS,
    ROAD,
    CANVAS_DARK,
    CANVAS_LIGHT,
    CANVAS_GRAY
  }

  // TileMapServiceImageryProvider class
  class TileMapServiceImageryProvider extends ImageryProvider {
    constructor(options: { url: string });
  }

  // IonImageryProvider class
  class IonImageryProvider extends ImageryProvider {
    constructor(options: { assetId: number });
  }

  // ImageryLayerCollection class
  class ImageryLayerCollection {
    addImageryProvider(provider: ImageryProvider): any;
    removeAll(): void;
    length: number;
  }

  // Entity related types
  class EntityCollection {
    add(entity: Entity): Entity;
    remove(entity: Entity): boolean;
    getById(id: string): Entity | undefined;
  }

  interface Entity {
    id?: string;
    position?: Cartesian3;
    polyline?: any;
    billboard?: any;
    point?: any;
    [key: string]: any;
  }

  // Scene class
  class Scene {
    globe: Globe;
    skyAtmosphere: any;
    screenSpaceCameraController: ScreenSpaceCameraController;
  }

  // Globe class
  class Globe {
    depthTestAgainstTerrain: boolean;
  }

  // ScreenSpaceCameraController class
  class ScreenSpaceCameraController {
    enableRotate: boolean;
    enableTilt: boolean;
    enableTranslate: boolean;
    enableZoom: boolean;
  }

  // Camera class
  class Camera {
    flyTo(options: any): Promise<void>;
    setView(options: any): void;
  }

  // Other necessary Cesium classes and interfaces
  class Ion {
    static defaultAccessToken: string;
  }

  class Cartesian3 {
    static fromDegrees(longitude: number, latitude: number, height?: number): Cartesian3;
  }

  class Math {
    static toRadians(degrees: number): number;
  }

  class Color {
    static ORANGE: Color;
    static GREEN: Color;
    static RED: Color;
    static WHITE: Color;
  }

  class PolylineGlowMaterialProperty {
    constructor(options: { glowPower: number; color: Color });
  }

  // Utility function
  function buildModuleUrl(path: string): string;

  // Function to create terrain
  function createWorldTerrainAsync(options?: { requestWaterMask?: boolean; requestVertexNormals?: boolean }): Promise<any>;
}
