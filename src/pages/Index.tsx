
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
  const [isGlobeView, setIsGlobeView] = useState(false);
  const { position, flyTo } = useMapPosition();
  const [cesiumFailed, setCesiumFailed] = useState(false);
  const [is3DFallback, setIs3DFallback] = useState(false);

  // Check if Cesium has loaded properly
  useEffect(() => {
    const handleCesiumError = (event: ErrorEvent) => {
      if (event.message.includes('cesium') || event.message.includes('Cesium')) {
        console.error('Cesium error detected:', event);
        setCesiumFailed(true);
        setIs3DFallback(true);
        toast({
          title: 'Error loading 3D view',
          description: 'Using alternative 3D view instead.',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('error', handleCesiumError);
    
    // Handle THREE.js related errors too
    const handleThreeError = (event: ErrorEvent) => {
      if (event.message.includes('three') || event.message.includes('Three') || 
          event.message.includes('THREE') || event.message.includes('webgl')) {
        console.error('Three.js or WebGL error detected:', event);
        toast({
          title: '3D rendering issue detected',
          description: 'Some 3D features may not display correctly.',
          variant: 'destructive',
        });
      }
    };
    
    window.addEventListener('error', handleThreeError);
    
    return () => {
      window.removeEventListener('error', handleCesiumError);
      window.removeEventListener('error', handleThreeError);
    };
  }, [toast]);

  const handleViewToggle = useCallback((useGlobeView: boolean) => {
    // If switching to 3D and Cesium failed, use the fallback Earth3D component
    if (useGlobeView && cesiumFailed) {
      setIsGlobeView(true);
      setIs3DFallback(true);
      toast({
        title: 'Using alternative 3D view',
        description: 'The primary 3D Earth view is unavailable.',
        duration: 3000,
      });
      return;
    }
    
    setIsGlobeView(useGlobeView);
    toast({
      title: `Switched to ${useGlobeView ? '3D' : '2D'} view`,
      duration: 1500,
    });
  }, [toast, cesiumFailed]);

  const handleLocationSelect = useCallback((location: { latitude: number; longitude: number }) => {
    flyTo({ 
      latitude: location.latitude, 
      longitude: location.longitude, 
      zoom: 10
    });
    toast({
      title: 'Location updated',
      description: `Navigating to ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`,
      duration: 2000,
    });
  }, [flyTo, toast]);

  return (
    <NavigationProvider>
      <div className="h-screen w-screen overflow-hidden relative">
        {/* Main visualization area - ensuring both map and globe have proper size */}
        <div className="absolute inset-0 w-full h-full">
          <Map 
            position={position} 
            onPositionChange={flyTo} 
            visible={!isGlobeView} 
          />
          
          {/* Only show Cesium Earth if not using fallback */}
          <CesiumEarth 
            position={position} 
            onPositionChange={flyTo} 
            visible={isGlobeView && !is3DFallback} 
          />
          
          {/* Use Earth3D as a fallback when Cesium fails */}
          <Earth3D
            position={position}
            onPositionChange={flyTo}
            visible={isGlobeView && is3DFallback}
          />
          
          <Route visible={true} />
        </div>
        
        {/* UI overlay - using z-index 50 to ensure it appears above ALL other elements */}
        <div className="absolute inset-0 pointer-events-none z-50">
          <Navigation>
            <div className="pointer-events-auto">
              <ViewToggle isGlobeView={isGlobeView} onChange={handleViewToggle} />
            </div>
          </Navigation>
          
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-xl px-4 pointer-events-auto">
            <SearchBar onSelectLocation={handleLocationSelect} />
          </div>
          
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-xl px-4 text-center">
            <div className="glass-panel rounded-lg py-3 px-4 inline-block animate-slide-up shadow-float">
              <span className="text-xs uppercase tracking-wider font-medium text-gray-500">Current Location</span>
              <p className="font-medium">
                {position.latitude.toFixed(4)}°, {position.longitude.toFixed(4)}°
              </p>
            </div>
          </div>
        </div>
      </div>
    </NavigationProvider>
  );
};

export default Index;
