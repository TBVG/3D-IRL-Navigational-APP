import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { generateRoutePath, calculateDistance, calculateBearing } from '@/utils/locationUtils';
import { useMapPosition } from '@/hooks/useMapPosition';

interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  bearing?: number;
}

interface Waypoint extends Location {
  id: string;
  distanceFromStart?: number;
  arrivalTime?: Date;
}

interface TurnDirection {
  fromBearing: number;
  toBearing: number;
  instruction: string;
  distance: number;
  location: Location;
}

interface NavigationContextType {
  currentLocation: Location | null;
  destination: Location | null;
  routePath: Location[];
  waypoints: Waypoint[];
  turns: TurnDirection[];
  isNavigating: boolean;
  estimatedTimeOfArrival: Date | null;
  estimatedDistance: number | null;
  setCurrentLocation: (location: Location) => void;
  setDestination: (location: Location) => void;
  addWaypoint: (location: Location) => void;
  removeWaypoint: (id: string) => void;
  reorderWaypoints: (ids: string[]) => void;
  startNavigation: () => void;
  endNavigation: () => void;
  getCurrentStep: () => TurnDirection | null;
  getNextTurn: () => TurnDirection | null;
  getProgress: () => number;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Mock street segments to simulate realistic navigation
const generateStreetBasedRoute = (startLat: number, startLng: number, endLat: number, endLng: number): Location[] => {
  const path: Location[] = [];
  
  // Start point
  path.push({ latitude: startLat, longitude: startLng });
  
  // Determine if we need to go north/south first or east/west first
  const latDiff = endLat - startLat;
  const lngDiff = endLng - startLng;
  
  // Create a grid pattern to simulate streets
  const latSteps = Math.abs(latDiff) > 0.01 ? Math.floor(Math.abs(latDiff) / 0.005) : 1;
  const lngSteps = Math.abs(lngDiff) > 0.01 ? Math.floor(Math.abs(lngDiff) / 0.005) : 1;
  
  // Generate intermediary points that follow a grid pattern
  if (Math.abs(latDiff) > Math.abs(lngDiff)) {
    // Go in latitude direction first (north/south)
    const latStepSize = latDiff / latSteps;
    for (let i = 1; i <= latSteps; i++) {
      // Add a slight variation to make it look more natural
      const jitter = (Math.random() - 0.5) * 0.0005;
      path.push({
        latitude: startLat + (latStepSize * i),
        longitude: startLng + jitter
      });
    }
    
    // Then go in longitude direction (east/west)
    const currLat = startLat + latDiff;
    const lngStepSize = lngDiff / lngSteps;
    for (let i = 1; i <= lngSteps; i++) {
      // Add a slight variation to make it look more natural
      const jitter = (Math.random() - 0.5) * 0.0005;
      path.push({
        latitude: currLat + jitter,
        longitude: startLng + (lngStepSize * i)
      });
    }
  } else {
    // Go in longitude direction first (east/west)
    const lngStepSize = lngDiff / lngSteps;
    for (let i = 1; i <= lngSteps; i++) {
      // Add a slight variation to make it look more natural
      const jitter = (Math.random() - 0.5) * 0.0005;
      path.push({
        latitude: startLat + jitter,
        longitude: startLng + (lngStepSize * i)
      });
    }
    
    // Then go in latitude direction (north/south)
    const currLng = startLng + lngDiff;
    const latStepSize = latDiff / latSteps;
    for (let i = 1; i <= latSteps; i++) {
      // Add a slight variation to make it look more natural
      const jitter = (Math.random() - 0.5) * 0.0005;
      path.push({
        latitude: startLat + (latStepSize * i),
        longitude: currLng + jitter
      });
    }
  }
  
  // Add some random street corners to make route more realistic
  if (path.length > 3) {
    for (let i = 1; i < path.length - 1; i += 2) {
      if (Math.random() > 0.5 && i + 1 < path.length) {
        // Create a detour
        const midLat = (path[i].latitude + path[i+1].latitude) / 2;
        const midLng = (path[i].longitude + path[i+1].longitude) / 2;
        const offset = 0.002 * (Math.random() > 0.5 ? 1 : -1);
        
        // Insert a detour point
        path.splice(i + 1, 0, {
          latitude: midLat + offset,
          longitude: midLng + offset
        });
        i++; // Skip the newly added point
      }
    }
  }
  
  // End point
  path.push({ latitude: endLat, longitude: endLng });
  
  return path;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { flyTo } = useMapPosition();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [routePath, setRoutePath] = useState<Location[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [turns, setTurns] = useState<TurnDirection[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [estimatedTimeOfArrival, setEstimatedTimeOfArrival] = useState<Date | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const addWaypoint = useCallback((location: Location) => {
    setWaypoints(prev => [
      ...prev, 
      { 
        ...location, 
        id: Date.now().toString() 
      }
    ]);
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
  }, []);

  const reorderWaypoints = useCallback((ids: string[]) => {
    const reorderedWaypoints = ids.map(id => 
      waypoints.find(wp => wp.id === id)
    ).filter((wp): wp is Waypoint => wp !== undefined);
    
    setWaypoints(reorderedWaypoints);
  }, [waypoints]);

  const calculateTurns = useCallback((path: Location[]): TurnDirection[] => {
    const turns: TurnDirection[] = [];
    
    if (path.length < 3) return turns;
    
    const initialBearing = calculateBearing(
      path[0].latitude, path[0].longitude,
      path[1].latitude, path[1].longitude
    );
    
    turns.push({
      fromBearing: initialBearing,
      toBearing: initialBearing,
      instruction: "Start navigation",
      distance: 0,
      location: path[0]
    });
    
    for (let i = 1; i < path.length - 1; i++) {
      const prevBearing = calculateBearing(
        path[i-1].latitude, path[i-1].longitude,
        path[i].latitude, path[i].longitude
      );
      
      const nextBearing = calculateBearing(
        path[i].latitude, path[i].longitude,
        path[i+1].latitude, path[i+1].longitude
      );
      
      const bearingChange = ((nextBearing - prevBearing + 360) % 360);
      
      let instruction = "Continue straight";
      
      if (bearingChange > 30 && bearingChange < 150) {
        instruction = "Turn right";
      } else if (bearingChange >= 150 && bearingChange <= 210) {
        instruction = "Make a U-turn";
      } else if (bearingChange > 210 && bearingChange < 330) {
        instruction = "Turn left";
      }
      
      const distance = calculateDistance(
        path[i-1].latitude, path[i-1].longitude,
        path[i].latitude, path[i].longitude
      );
      
      // Only add turn points where there's a significant direction change
      if (Math.abs(bearingChange - 180) > 20) {
        turns.push({
          fromBearing: prevBearing,
          toBearing: nextBearing,
          instruction,
          distance,
          location: path[i]
        });
      }
    }
    
    const finalDistance = calculateDistance(
      path[path.length-2].latitude, path[path.length-2].longitude,
      path[path.length-1].latitude, path[path.length-1].longitude
    );
    
    turns.push({
      fromBearing: calculateBearing(
        path[path.length-2].latitude, path[path.length-2].longitude,
        path[path.length-1].latitude, path[path.length-1].longitude
      ),
      toBearing: 0,
      instruction: "Arrive at destination",
      distance: finalDistance,
      location: path[path.length-1]
    });
    
    return turns;
  }, []);

  const calculateETA = useCallback((path: Location[]): { eta: Date, distance: number } => {
    let totalDistance = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += calculateDistance(
        path[i].latitude, path[i].longitude,
        path[i+1].latitude, path[i+1].longitude
      );
    }
    
    const averageSpeedKmh = 50;
    const timeInHours = totalDistance / averageSpeedKmh;
    const timeInMs = timeInHours * 60 * 60 * 1000;
    
    const eta = new Date();
    eta.setTime(eta.getTime() + timeInMs);
    
    return { eta, distance: totalDistance };
  }, []);

  const getCurrentStep = useCallback((): TurnDirection | null => {
    if (!isNavigating || turns.length === 0 || currentStep >= turns.length) {
      return null;
    }
    
    return turns[currentStep];
  }, [isNavigating, turns, currentStep]);

  const getNextTurn = useCallback((): TurnDirection | null => {
    if (!isNavigating || turns.length === 0 || currentStep + 1 >= turns.length) {
      return null;
    }
    
    return turns[currentStep + 1];
  }, [isNavigating, turns, currentStep]);

  const getProgress = useCallback((): number => {
    if (!isNavigating || estimatedDistance === null || currentStep === 0) {
      return 0;
    }
    
    let distanceTraveled = 0;
    for (let i = 0; i < currentStep; i++) {
      distanceTraveled += turns[i].distance;
    }
    
    return Math.min(100, Math.max(0, (distanceTraveled / estimatedDistance) * 100));
  }, [isNavigating, estimatedDistance, currentStep, turns]);

  useEffect(() => {
    if (!isNavigating || turns.length === 0) {
      return;
    }
    
    const interval = setInterval(() => {
      if (currentStep < turns.length - 1) {
        setCurrentStep(prev => prev + 1);
        
        toast({
          title: turns[currentStep + 1]?.instruction || "Continuing",
          description: `In ${turns[currentStep + 1]?.distance?.toFixed(1) || "0"} km`,
          duration: 5000,
        });
      } else {
        clearInterval(interval);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isNavigating, turns, currentStep, toast]);

  const startNavigation = useCallback(() => {
    if (!currentLocation || !destination) {
      toast({
        title: 'Cannot start navigation',
        description: 'Both current location and destination are required.',
        variant: 'destructive',
      });
      return;
    }

    let fullPath: Location[] = [currentLocation];
    
    if (waypoints.length > 0) {
      fullPath = fullPath.concat(waypoints);
    }
    
    fullPath.push(destination);
    
    let completePath: Location[] = [];
    
    // Use the new street-based route generator instead of straight lines
    for (let i = 0; i < fullPath.length - 1; i++) {
      const segment = generateStreetBasedRoute(
        fullPath[i].latitude,
        fullPath[i].longitude,
        fullPath[i + 1].latitude,
        fullPath[i + 1].longitude
      );
      
      if (i < fullPath.length - 2) {
        completePath = completePath.concat(segment.slice(0, -1));
      } else {
        completePath = completePath.concat(segment);
      }
    }
    
    setRoutePath(completePath);
    setIsNavigating(true);
    
    const calculatedTurns = calculateTurns(completePath);
    setTurns(calculatedTurns);
    setCurrentStep(0);
    
    const { eta, distance } = calculateETA(completePath);
    setEstimatedTimeOfArrival(eta);
    setEstimatedDistance(distance);
    
    const midLat = (currentLocation.latitude + destination.latitude) / 2;
    const midLng = (currentLocation.longitude + destination.longitude) / 2;
    
    const latDiff = Math.abs(currentLocation.latitude - destination.latitude);
    const lngDiff = Math.abs(currentLocation.longitude - destination.longitude);
    const maxDiff = Math.max(latDiff, lngDiff);
    const zoom = Math.max(2, 10 - Math.log2(maxDiff * 111));
    
    flyTo({ latitude: midLat, longitude: midLng, zoom });
    
    toast({
      title: 'Navigation started',
      description: destination.name 
        ? `Navigating to ${destination.name}`
        : `Navigating to ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`,
    });
  }, [currentLocation, destination, waypoints, flyTo, toast, calculateTurns, calculateETA]);

  const endNavigation = useCallback(() => {
    setIsNavigating(false);
    setRoutePath([]);
    setTurns([]);
    setCurrentStep(0);
    setEstimatedTimeOfArrival(null);
    setEstimatedDistance(null);
    toast({
      title: 'Navigation ended',
      duration: 2000,
    });
  }, [toast]);

  const value = {
    currentLocation,
    destination,
    routePath,
    waypoints,
    turns,
    isNavigating,
    estimatedTimeOfArrival,
    estimatedDistance,
    setCurrentLocation,
    setDestination,
    addWaypoint,
    removeWaypoint,
    reorderWaypoints,
    startNavigation,
    endNavigation,
    getCurrentStep,
    getNextTurn,
    getProgress
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
