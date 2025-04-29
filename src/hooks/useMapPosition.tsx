
import { useState, useCallback, useEffect } from 'react';

export interface MapPosition {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

interface TrackingOptions {
  enabled: boolean;
  followUser: boolean;
  rotateWithMovement: boolean;
  tiltInFirstPerson: boolean;
}

const defaultPosition: MapPosition = {
  latitude: 40.7128,
  longitude: -74.006,
  zoom: 3,
  pitch: 0,
  bearing: 0
};

export function useMapPosition(initialPosition?: Partial<MapPosition>) {
  const [position, setPosition] = useState<MapPosition>({
    ...defaultPosition,
    ...initialPosition
  });
  
  const [tracking, setTracking] = useState<TrackingOptions>({
    enabled: false,
    followUser: false,
    rotateWithMovement: false,
    tiltInFirstPerson: false
  });
  
  const [previousPosition, setPreviousPosition] = useState<MapPosition | null>(null);

  const flyTo = useCallback((newPosition: Partial<MapPosition>) => {
    setPreviousPosition(position);
    setPosition(prev => ({
      ...prev,
      ...newPosition
    }));
    
    // Log position updates to help debug
    console.log(`Map position updated: ${newPosition.latitude || position.latitude}, ${newPosition.longitude || position.longitude}, zoom: ${newPosition.zoom || position.zoom}`);
  }, [position]);

  const zoomIn = useCallback(() => {
    setPosition(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 1, 20)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setPosition(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - 1, 1)
    }));
  }, []);

  const resetPosition = useCallback(() => {
    setPosition(defaultPosition);
  }, []);
  
  const goBack = useCallback(() => {
    if (previousPosition) {
      setPosition(previousPosition);
      setPreviousPosition(null);
    }
  }, [previousPosition]);
  
  const lookAt = useCallback((targetPosition: Partial<MapPosition>, options?: { duration?: number }) => {
    setPreviousPosition(position);
    
    // Calculate the bearing between current position and target
    if (position.latitude && position.longitude && targetPosition.latitude && targetPosition.longitude) {
      // Use the calculateBearing function from locationUtils instead
      import('../utils/locationUtils').then(({ calculateBearing }) => {
        const bearing = calculateBearing(
          position.latitude,
          position.longitude,
          targetPosition.latitude,
          targetPosition.longitude
        );
        
        // Update position with new bearing but keep current location
        setPosition(prev => ({
          ...prev,
          bearing: bearing,
          pitch: 15
        }));
      });
    }
  }, [position]);
  
  const enableTracking = useCallback((options: Partial<TrackingOptions> = {}) => {
    setTracking(prev => ({
      ...prev,
      enabled: true,
      ...options
    }));
  }, []);
  
  const disableTracking = useCallback(() => {
    setTracking(prev => ({
      ...prev,
      enabled: false
    }));
  }, []);

  return {
    position,
    setPosition,
    flyTo,
    zoomIn,
    zoomOut,
    resetPosition,
    goBack,
    lookAt,
    tracking,
    enableTracking,
    disableTracking
  };
}
