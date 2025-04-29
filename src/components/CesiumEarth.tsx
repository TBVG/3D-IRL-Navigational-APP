import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { MapPosition } from '@/hooks/useMapPosition';
import { useNavigation } from '@/contexts/NavigationContext';
import { useToast } from '@/components/ui/use-toast';

// Hardcoded Cesium Ion token - ideally should be in environment variables
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MGY2MDFlMy1hNDhiLTQwOTAtOGViMi1hYWJmN2IxNWUwNWEiLCJpZCI6MTAzOTM4LCJpYXQiOjE2NzQxNTYzNTZ9.aghoWLU-8M-xvCoKgd2MAUslG7eAmlRoIvvY0QWot5M';

// Initialize the Cesium ion access token
Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

// Initialize Cesium base URL for asset loading
// Use the defined CESIUM_BASE_URL or default to '/Cesium'
if (!window.CESIUM_BASE_URL) {
  window.CESIUM_BASE_URL = '/Cesium';
}

interface CesiumEarthProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  visible: boolean;
}

const CesiumEarth: React.FC<CesiumEarthProps> = ({ position, onPositionChange, visible }) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const { routePath, currentLocation, destination, isNavigating, waypoints } = useNavigation();
  const [viewerReady, setViewerReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  // Initialize Cesium viewer
  useEffect(() => {
    if (!cesiumContainerRef.current || !visible || viewerRef.current) return;

    try {
      console.log("Initializing Cesium with token:", CESIUM_ION_TOKEN);
      console.log("Using Cesium base URL:", window.CESIUM_BASE_URL);
      
      // Configure Cesium viewer with the correct options
      const viewer = new Cesium.Viewer(cesiumContainerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        scene3DOnly: true,
        shouldAnimate: true,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity
      });

      console.log("Cesium viewer created successfully");
      
      // Add event handler for render errors
      viewer.scene.renderError.addEventListener((scene, error) => {
        console.error("Cesium render error:", error);
        setHasError(true);
        toast({
          title: "3D View Error",
          description: "There was an error rendering the 3D view. Switching to alternative 3D view.",
          variant: "destructive",
        });
      });
      
      // Add depth testing for better 3D rendering
      viewer.scene.globe.depthTestAgainstTerrain = true;
      
      // Disable sky atmosphere for first-person view when needed
      viewer.scene.skyAtmosphere.show = !isFirstPerson;
      
      // Set viewer reference
      viewerRef.current = viewer;
      setViewerReady(true);
      setHasError(false);
    } catch (error) {
      console.error("Error initializing Cesium viewer:", error);
      setHasError(true);
      toast({
        title: "3D View Error",
        description: "Could not initialize 3D view. Using alternative view.",
        variant: "destructive",
      });
    }
    
    // Cleanup viewer on unmount
    return () => {
      if (viewerRef.current) {
        try {
          if (!viewerRef.current.isDestroyed()) {
            viewerRef.current.destroy();
          }
        } catch (e) {
          console.error("Error destroying Cesium viewer:", e);
        }
        viewerRef.current = null;
      }
    };
  }, [visible, toast, isFirstPerson]);

  // Handle position changes
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || !viewerReady || hasError) return;
    
    try {
      flyToPosition(position);
    } catch (error) {
      console.error("Error updating position:", error);
    }
  }, [position.latitude, position.longitude, position.zoom, viewerReady, hasError]);

  // Handle first-person view toggle
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || !viewerReady) return;
    
    // Toggle sky atmosphere based on view mode
    if (viewerRef.current.scene) {
      viewerRef.current.scene.skyAtmosphere.show = !isFirstPerson;
    }
    
    // Set up first-person view if enabled and navigating
    if (isFirstPerson && isNavigating && routePath.length > 0) {
      setupFirstPersonView();
    } else {
      // Reset to default view
      if (viewerRef.current.scene) {
        viewerRef.current.scene.screenSpaceCameraController.enableRotate = true;
        viewerRef.current.scene.screenSpaceCameraController.enableTilt = true;
        viewerRef.current.scene.screenSpaceCameraController.enableTranslate = true;
        viewerRef.current.scene.screenSpaceCameraController.enableZoom = true;
      }
    }
  }, [isFirstPerson, isNavigating, routePath, viewerReady]);

  // Handle navigation route visualization
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || !viewerReady || !isNavigating) return;
    drawRoute();
    
    // If in first-person mode, update the view
    if (isFirstPerson) {
      setupFirstPersonView();
    }
  }, [isNavigating, routePath, currentLocation, destination, viewerReady]);

  // Handle terrain loading - important for realistic street navigation
  useEffect(() => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || !viewerReady) return;
    
    try {
      // Use createWorldTerrainAsync instead of createWorldTerrain
      Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      }).then(terrainProvider => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.terrainProvider = terrainProvider;
          console.log("Terrain provider loaded successfully");
        }
      }).catch(error => {
        console.error("Failed to load terrain provider:", error);
        // Continue without terrain provider
      });
    } catch (error) {
      console.error("Error setting up terrain:", error);
    }
  }, [viewerReady]);

  // Fly to a given position
  const flyToPosition = (pos: MapPosition) => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || hasError) return;
    
    try {
      // Calculate appropriate height based on zoom
      // Zoom 1 is fully zoomed out, 20 is fully zoomed in
      const height = 10000000 / Math.pow(2, pos.zoom - 1); 
      
      // Fly to position
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          pos.longitude,
          pos.latitude,
          height
        ),
        orientation: {
          heading: Cesium.Math.toRadians(pos.bearing || 0),
          pitch: Cesium.Math.toRadians(pos.pitch || -90), // Default top-down view
          roll: 0
        }
      });
    } catch (error) {
      console.error("Error flying to position:", error);
    }
  };

  // Draw navigation route - improved for street visualization
  const drawRoute = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || routePath.length < 2) return;
    
    try {
      // Remove any existing route entities
      viewerRef.current.entities.removeAll();
      
      // Convert route points to Cesium format - clampToGround for street-level accuracy
      const positions = routePath.map(point => 
        Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude)
      );
      
      // Add route polyline with improved styling for street visualization
      viewerRef.current.entities.add({
        id: 'navigation-route',
        polyline: {
          positions: positions,
          width: 12,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: Cesium.Color.ORANGE
          }),
          clampToGround: true
        }
      });
      
      // Add start point with clear marker
      if (currentLocation) {
        viewerRef.current.entities.add({
          id: 'start-point',
          position: Cesium.Cartesian3.fromDegrees(
            currentLocation.longitude, 
            currentLocation.latitude
          ),
          point: {
            pixelSize: 12,
            color: Cesium.Color.BLUE,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: 'Start',
            font: '14pt sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      }
      
      // Add end point with clear marker
      if (destination) {
        viewerRef.current.entities.add({
          id: 'end-point',
          position: Cesium.Cartesian3.fromDegrees(
            destination.longitude, 
            destination.latitude
          ),
          point: {
            pixelSize: 12,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: destination.name || 'Destination',
            font: '14pt sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      }
      
      // Add waypoints if they exist
      waypoints.forEach((waypoint, idx) => {
        viewerRef.current?.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            waypoint.longitude, 
            waypoint.latitude
          ),
          point: {
            pixelSize: 10,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: waypoint.name || `Waypoint ${idx + 1}`,
            font: '12pt sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      });
    } catch (error) {
      console.error("Error drawing route:", error);
    }
  };

  // Set up first-person view
  const setupFirstPersonView = () => {
    if (!viewerRef.current || viewerRef.current.isDestroyed() || routePath.length < 1 || !currentLocation) return;
    
    try {
      // Get the first point in the route (or current location)
      const startPoint = currentLocation;
      
      // Calculate heading to the next point if available
      let heading = 0;
      if (routePath.length > 1) {
        const nextPoint = routePath[1];
        
        // Calculate heading between points (simple approximation)
        heading = Math.atan2(
          nextPoint.longitude - startPoint.longitude,
          nextPoint.latitude - startPoint.latitude
        ) * (180 / Math.PI);
      }
      
      // Set camera to first-person view
      viewerRef.current.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          startPoint.longitude,
          startPoint.latitude,
          1.8 // Height of average person
        ),
        orientation: {
          heading: Cesium.Math.toRadians(heading),
          pitch: Cesium.Math.toRadians(0), // Look horizontally
          roll: 0
        }
      });
      
      // Disable camera rotation to simulate first-person control
      if (viewerRef.current.scene) {
        viewerRef.current.scene.screenSpaceCameraController.enableRotate = false;
        viewerRef.current.scene.screenSpaceCameraController.enableTilt = false;
        viewerRef.current.scene.screenSpaceCameraController.enableTranslate = false;
        viewerRef.current.scene.screenSpaceCameraController.enableZoom = true;
      }
    } catch (error) {
      console.error("Error setting up first-person view:", error);
    }
  };

  // Fall back to Globe component if there's a Cesium error
  if (hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
        <div className="text-center p-5 max-w-md">
          <h2 className="text-xl font-bold mb-3">3D View Unavailable</h2>
          <p>The 3D Earth view couldn't be loaded. Using alternative 3D view instead.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`cesium-container ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-1000`}
      style={{ 
        zIndex: visible ? 10 : 0,
        position: 'absolute',
        width: '100%',
        height: '100%'
      }}
    >
      <div 
        ref={cesiumContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: visible ? 'block' : 'none' }}
      />
      
      {/* Controls */}
      {viewerReady && (
        <>
          {/* These controls have z-index 10, which is lower than the UI overlay z-index */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
            <button 
              onClick={() => onPositionChange({ zoom: Math.min(position.zoom + 1, 20) })}
              className="w-10 h-10 rounded-full bg-white shadow-map-control flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Zoom in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            </button>
            <button 
              onClick={() => onPositionChange({ zoom: Math.max(position.zoom - 1, 1) })}
              className="w-10 h-10 rounded-full bg-white shadow-map-control flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Zoom out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path></svg>
            </button>
            
            {/* Toggle first-person view button */}
            {isNavigating && (
              <button 
                onClick={() => setIsFirstPerson(prev => !prev)}
                className={`w-10 h-10 rounded-full shadow-map-control flex items-center justify-center transition-colors ${
                  isFirstPerson ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-label={isFirstPerson ? "Exit First-Person View" : "Enter First-Person View"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            )}
          </div>
          
          {/* Current location button */}
          <div className="absolute bottom-4 left-4 z-10">
            <button 
              onClick={() => {
                if (currentLocation) {
                  onPositionChange({ 
                    latitude: currentLocation.latitude, 
                    longitude: currentLocation.longitude,
                    zoom: 12
                  });
                }
              }}
              className="w-10 h-10 rounded-full bg-white shadow-map-control flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="My location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </>
      )}
      
      {/* Loading indicator */}
      {visible && !viewerReady && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
        </div>
      )}
    </div>
  );
};

export default CesiumEarth;
