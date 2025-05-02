// Type definitions for Cesium global variables
declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

declare module 'cesium' {
  export class Viewer {
    constructor(container: HTMLElement | string, options?: ViewerOptions);
    scene: Scene;
    camera: Camera;
    imageryLayers: ImageryLayerCollection;
    terrainProvider: any;
    destroy(): void;
    isDestroyed(): boolean;
    entities: EntityCollection;
    screenSpaceEventHandler: ScreenSpaceEventHandler;
  }

  export interface ViewerOptions {
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
    imageryProvider?: ImageryProvider;
    terrainProvider?: any;
    shouldAnimate?: boolean;
  }

  export class ImageryProvider {
    constructor(options?: any);
  }

  export enum BingMapsStyle {
    AERIAL = 'Aerial',
    AERIAL_WITH_LABELS = 'AerialWithLabels',
    ROAD = 'Road',
    CANVAS_DARK = 'CanvasDark',
    CANVAS_LIGHT = 'CanvasLight',
    CANVAS_GRAY = 'CanvasGray'
  }

  export class BingMapsImageryProvider extends ImageryProvider {
    constructor(options: {
      url: string;
      key: string;
      mapStyle?: BingMapsStyle;
      [key: string]: any; // Allow additional properties
    });
  }

  export class IonImageryProvider extends ImageryProvider {
    constructor(options: { assetId: number });
  }

  export class ImageryLayerCollection {
    addImageryProvider(provider: ImageryProvider): any;
    removeAll(): void;
    length: number;
  }

  export class EntityCollection {
    add(entity: Entity): Entity;
    removeAll(): void;
  }

  export class Entity {
    constructor(options?: any);
  }

  export class PolylineGraphics {
    constructor(options: {
      positions: Cartesian3[];
      width: number;
      material: Color;
    });
  }

  export class PointGraphics {
    constructor(options: {
      color: Color;
      pixelSize: number;
    });
  }

  export class Color {
    static BLUE: Color;
    static GREEN: Color;
    static RED: Color;
    static YELLOW: Color;
  }

  export class Cartesian3 {
    static fromDegrees(longitude: number, latitude: number, height?: number): Cartesian3;
  }

  export class Math {
    static toRadians(degrees: number): number;
  }

  export class Ion {
    static defaultAccessToken: string;
  }

  export function createWorldTerrainAsync(): Promise<any>;

  // Additional types for Scene and Camera
  export class Scene {
    globe: Globe;
  }

  export class Globe {
    ellipsoid: Ellipsoid;
  }

  export class Ellipsoid {
    cartesianToCartographic(cartesian: Cartesian3): Cartographic;
  }

  export class Cartographic {
    longitude: number;
    latitude: number;
    height: number;
  }

  export class Camera {
    flyTo(options: {
      destination: Cartesian3;
      orientation?: {
        heading: number;
        pitch: number;
        roll: number;
      };
    }): void;
    pickEllipsoid(windowPosition: any, ellipsoid: Ellipsoid): Cartesian3 | undefined;
  }

  export class ScreenSpaceEventHandler {
    setInputAction(action: (click: any) => void, type: ScreenSpaceEventType): void;
  }

  export enum ScreenSpaceEventType {
    LEFT_CLICK = 'LEFT_CLICK',
    LEFT_DOUBLE_CLICK = 'LEFT_DOUBLE_CLICK',
    LEFT_DRAG = 'LEFT_DRAG',
    MIDDLE_CLICK = 'MIDDLE_CLICK',
    MIDDLE_DOUBLE_CLICK = 'MIDDLE_DOUBLE_CLICK',
    MIDDLE_DRAG = 'MIDDLE_DRAG',
    RIGHT_CLICK = 'RIGHT_CLICK',
    RIGHT_DOUBLE_CLICK = 'RIGHT_DOUBLE_CLICK',
    RIGHT_DRAG = 'RIGHT_DRAG'
  }
}

export {};
