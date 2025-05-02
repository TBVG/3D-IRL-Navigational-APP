import React, { useEffect, useRef, useState } from 'react';
import { 
  Viewer, 
  Cartesian3,
  Cartographic,
  createWorldTerrainAsync,
  Entity,
  PolylineGraphics,
  Color,
  PointGraphics,
  Math as CesiumMath,
  Ion,
  ScreenSpaceEventType,
  createWorldImageryAsync,
  IonImageryProvider,
  Globe,
  sampleTerrainMostDetailed,
  buildModuleUrl,
  Cesium3DTileset,
  createOsmBuildingsAsync,
  IonResource,
  Cesium3DTileStyle,
  ShadowMode,
  IonWorldImageryStyle
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { MapPosition } from '@/hooks/useMapPosition';
import { useNavigation } from '@/contexts/NavigationContext';

// Set Cesium Ion token
Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNTYyMjFmNC00NGIzLTQwZTUtYjEzZS1jN2NkNzhjNDhmNGEiLCJpZCI6MTAzOTM4LCJpYXQiOjE3NDYxNTc2NjJ9.OYr_hXGvNtuXkHP7mD7qKtVx8Ez2bThgLWLRou27JOg';

// Set Cesium base URL
window.CESIUM_BASE_URL = buildModuleUrl('');

interface CesiumEarthProps {
  position: MapPosition;
  onPositionChange: (newPosition: Partial<MapPosition>) => void;
  visible: boolean;
  onError?: () => void;
}

const CesiumEarth: React.FC<CesiumEarthProps> = ({
  position,
  onPositionChange,
  visible,
  onError
}) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { routePath, currentLocation, destination, isNavigating, waypoints } = useNavigation();

  useEffect(() => {
    if (!visible || !cesiumContainerRef.current) return;

    const initCesium = async () => {
      try {
        console.log('Initializing Cesium...');
        
        // Initialize Cesium with basic settings first
        const viewer = new Viewer(cesiumContainerRef.current, {
          terrainProvider: await createWorldTerrainAsync(),
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          scene3DOnly: true,
          shouldAnimate: true,
          contextOptions: {
            webgl: {
              alpha: true,
              depth: true,
              stencil: true,
              antialias: true,
              premultipliedAlpha: true,
              preserveDrawingBuffer: true,
              failIfMajorPerformanceCaveat: false
            }
          }
        });

        // Basic scene setup
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.baseColor = Color.WHITE;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.maximumScreenSpaceError = 2;

        // Add imagery provider
        try {
          const imageryProvider = await createWorldImageryAsync({
            style: IonWorldImageryStyle.AERIAL_WITH_LABELS
          });
          viewer.imageryLayers.addImageryProvider(imageryProvider);
          console.log('Imagery provider added');
        } catch (error) {
          console.error('Error adding imagery provider:', error);
        }

        // Add OSM Buildings
        try {
          const osmBuildings = await createOsmBuildingsAsync();
          viewer.scene.primitives.add(osmBuildings);
          console.log('OSM Buildings added');
        } catch (error) {
          console.error('Error adding OSM Buildings:', error);
        }

        // Set initial camera position
        try {
          const cartographic = Cartographic.fromDegrees(
            position.longitude,
            position.latitude,
            0
          );
          
          const [sampledPosition] = await sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic]);
          if (sampledPosition) {
            viewer.camera.flyTo({
              destination: Cartesian3.fromDegrees(
                position.longitude,
                position.latitude,
                sampledPosition.height + 1.8
              ),
              orientation: {
                heading: CesiumMath.toRadians(position.bearing || 0),
                pitch: CesiumMath.toRadians(0),
                roll: 0
              },
              duration: 0
            });
          }
        } catch (error) {
          console.error('Error setting initial position:', error);
          // Fallback to non-terrain position
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(
              position.longitude,
              position.latitude,
              1.8
            ),
            orientation: {
              heading: CesiumMath.toRadians(position.bearing || 0),
              pitch: CesiumMath.toRadians(0),
              roll: 0
            },
            duration: 0
          });
        }

        // Add click handler
        viewer.screenSpaceEventHandler.setInputAction((click: any) => {
          const cartesian = viewer.camera.pickEllipsoid(
            click.position,
            viewer.scene.globe.ellipsoid
          );
          if (cartesian) {
            const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
            const longitude = CesiumMath.toDegrees(cartographic.longitude);
            const latitude = CesiumMath.toDegrees(cartographic.latitude);
            
            onPositionChange({
              longitude,
              latitude,
              zoom: position.zoom
            });
          }
        }, ScreenSpaceEventType.LEFT_CLICK);

        // Store viewer instance
        viewerRef.current = viewer;
        setIsInitialized(true);
        setError(null);
        console.log('Cesium initialization complete');

        return () => {
          if (viewerRef.current) {
            viewerRef.current.destroy();
            viewerRef.current = null;
          }
        };
      } catch (error) {
        console.error('Error initializing Cesium:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize Cesium');
        onError?.();
      }
    };

    initCesium();
  }, [visible, position, onError, onPositionChange]);

  // Handle position changes
  useEffect(() => {
    if (!viewerRef.current || !visible || !isInitialized) return;
    
    try {
      const viewer = viewerRef.current;
      const cartographic = Cartographic.fromDegrees(
        position.longitude,
        position.latitude,
        0
      );
      
      sampleTerrainMostDetailed(viewer.terrainProvider, [cartographic])
        .then(([sampledPosition]) => {
          if (sampledPosition) {
            viewer.camera.flyTo({
              destination: Cartesian3.fromDegrees(
                position.longitude,
                position.latitude,
                sampledPosition.height + 1.8
              ),
              orientation: {
                heading: CesiumMath.toRadians(position.bearing || 0),
                pitch: CesiumMath.toRadians(0),
                roll: 0
              },
              duration: 1
            });
          }
        })
        .catch(error => {
          console.error('Error updating camera position:', error);
        });
    } catch (error) {
      console.error('Error updating position:', error);
    }
  }, [position, visible, isInitialized]);

  // Handle navigation route
  useEffect(() => {
    if (!viewerRef.current || !visible || !isNavigating || !isInitialized) return;

    try {
      // Clear existing entities
      viewerRef.current.entities.removeAll();
      
      // Convert route points to Cesium format
      const positions = routePath.map(point => 
        Cartesian3.fromDegrees(point.longitude, point.latitude)
      );
      
      // Add route line with enhanced styling
      viewerRef.current.entities.add({
        polyline: new PolylineGraphics({
          positions: positions,
          width: 12, // Increased width
          material: new Color(0.0, 0.7, 1.0, 0.9), // Brighter blue with higher opacity
          clampToGround: true,
          classificationType: 3, // Both terrain and 3D tiles
          shadows: ShadowMode.ENABLED
        })
      });

      // Add a second, wider line underneath for better visibility
      viewerRef.current.entities.add({
        polyline: new PolylineGraphics({
          positions: positions,
          width: 16, // Wider background line
          material: new Color(0.0, 0.3, 0.6, 0.5), // Darker blue with lower opacity
          clampToGround: true,
          classificationType: 3,
          shadows: ShadowMode.ENABLED
        })
      });

      // Add start point with label
      viewerRef.current.entities.add({
        position: Cartesian3.fromDegrees(
          currentLocation.longitude, 
          currentLocation.latitude
        ),
        point: new PointGraphics({
          color: Color.GREEN,
          pixelSize: 16, // Larger point
          outlineColor: Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY // Always on top
        }),
        label: {
          text: 'Start',
          font: '16px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: 1,
          verticalOrigin: 1,
          pixelOffset: new Cartesian3(0, -20, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });

      // Add end point with label
      viewerRef.current.entities.add({
        position: Cartesian3.fromDegrees(
          destination.longitude, 
          destination.latitude
        ),
        point: new PointGraphics({
          color: Color.RED,
          pixelSize: 16, // Larger point
          outlineColor: Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }),
        label: {
          text: 'Destination',
          font: '16px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: 1,
          verticalOrigin: 1,
          pixelOffset: new Cartesian3(0, -20, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });

      // Add waypoints with labels
      waypoints.forEach((waypoint, idx) => {
        viewerRef.current?.entities.add({
          position: Cartesian3.fromDegrees(
            waypoint.longitude, 
            waypoint.latitude
          ),
          point: new PointGraphics({
            color: Color.YELLOW,
            pixelSize: 14,
            outlineColor: Color.WHITE,
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }),
          label: {
            text: `Waypoint ${idx + 1}`,
            font: '14px sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 3,
            style: 1,
            verticalOrigin: 1,
            pixelOffset: new Cartesian3(0, -18, 0),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });
      });

      // Fly to starting location
      const cartographic = Cartographic.fromDegrees(
        currentLocation.longitude,
        currentLocation.latitude,
        0
      );
      
      sampleTerrainMostDetailed(viewerRef.current.terrainProvider, [cartographic])
        .then(([sampledPosition]) => {
          if (sampledPosition) {
            viewerRef.current?.camera.flyTo({
              destination: Cartesian3.fromDegrees(
                currentLocation.longitude,
                currentLocation.latitude,
                sampledPosition.height + 1.8
              ),
              orientation: {
                heading: CesiumMath.toRadians(currentLocation?.bearing ?? 0),
                pitch: CesiumMath.toRadians(0),
                roll: 0
              },
              duration: 2
            });
          }
        })
        .catch(error => {
          console.error('Error flying to starting location:', error);
        });
    } catch (error) {
      console.error('Error updating navigation route:', error);
    }
  }, [routePath, currentLocation, destination, waypoints, isNavigating, visible, isInitialized]);

  // Handle position updates during navigation
  useEffect(() => {
    if (!viewerRef.current || !visible || !isNavigating || !isInitialized) return;

    try {
      const cartographic = Cartographic.fromDegrees(
        currentLocation.longitude,
        currentLocation.latitude,
        0
      );
      
      sampleTerrainMostDetailed(viewerRef.current.terrainProvider, [cartographic])
        .then(([sampledPosition]) => {
          if (sampledPosition) {
            // Update camera position to follow user
            viewerRef.current?.camera.setView({
              destination: Cartesian3.fromDegrees(
                currentLocation.longitude,
                currentLocation.latitude,
                sampledPosition.height + 1.8
              ),
              orientation: {
                heading: CesiumMath.toRadians(currentLocation?.bearing ?? 0),
                pitch: CesiumMath.toRadians(0),
                roll: 0
              }
            });
          }
        })
        .catch(error => {
          console.error('Error updating camera position:', error);
        });
    } catch (error) {
      console.error('Error updating position:', error);
    }
  }, [currentLocation, visible, isNavigating, isInitialized]);

  if (!visible) return null;

  return (
    <div className="relative w-full h-full">
      <div 
        ref={cesiumContainerRef}
        className="w-full h-full"
      />
      {!isInitialized && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading 3D view...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CesiumEarth;
