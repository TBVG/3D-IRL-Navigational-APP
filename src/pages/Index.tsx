import React, { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useMapPosition } from '@/hooks/useMapPosition';
import Map from '@/components/Map';
import CesiumEarth from '@/components/CesiumEarth';
import SearchBar from '@/components/SearchBar';
import ViewToggle from '@/components/ViewToggle';
import Navigation from '@/components/Navigation';
import Route from '@/components/Route';
import { NavigationProvider } from '@/contexts/NavigationContext';
import Earth3D from '@/components/Earth3D';

const Index = () => {
  const { toast } = useToast();
  const [isGlobeView, setIsGlobeView] = useState(true);
  const { position, flyTo } = useMapPosition();
  const [cesiumFailed, setCesiumFailed] = useState(false);
  const [is3DFallback, setIs3DFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle Cesium initialization errors
  const handleCesiumError = useCallback(() => {
    setCesiumFailed(true);
    setIs3DFallback(true);
    toast({
      title: 'Error loading 3D view',
      description: 'Using alternative 3D view instead.',
      variant: 'destructive',
    });
  }, [toast]);

  // Handle view toggle
  const handleViewToggle = useCallback(() => {
    setIsGlobeView(prev => !prev);
  }, []);

  // Handle location selection
  const handleLocationSelect = useCallback((location: { latitude: number; longitude: number }) => {
    flyTo({
      latitude: location.latitude,
      longitude: location.longitude,
      zoom: 12
    });
  }, [flyTo]);

  // Handle loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <NavigationProvider>
      <div className="relative w-full h-screen bg-gray-100">
        {/* Map/Globe View */}
        <div className="absolute inset-0">
          {isGlobeView ? (
            cesiumFailed ? (
              <Earth3D
                position={position}
                onPositionChange={flyTo}
                visible={true}
              />
            ) : (
              <CesiumEarth
                position={position}
                onPositionChange={flyTo}
                visible={true}
                onError={handleCesiumError}
              />
            )
          ) : (
            <Map
              position={position}
              onPositionChange={flyTo}
              visible={true}
            />
          )}
        </div>

        {/* UI Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col space-y-4">
              <div className="pointer-events-auto">
                <SearchBar onSelectLocation={handleLocationSelect} />
              </div>
              <div className="pointer-events-auto">
                <ViewToggle isGlobeView={isGlobeView} onToggle={handleViewToggle} />
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
            <Navigation />
          </div>
          
          <div className="absolute top-4 right-4 pointer-events-auto">
            <Route visible={true} />
          </div>
        </div>
      </div>
    </NavigationProvider>
  );
};

export default Index;
