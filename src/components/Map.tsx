import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MapPosition } from '@/hooks/useMapPosition';
import { useNavigation } from '@/contexts/NavigationContext';
import { useToast } from '@/components/ui/use-toast';

interface MapProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  visible: boolean;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFyaXFiaXZpamkiLCJhIjoiY2xsNTY0d3JtMGQxdjNlbzF2b2loNm40aCJ9.AZajFCsj0ImNT2zgkcF45Q';

const Map: React.FC<MapProps> = ({ position, onPositionChange, visible }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { toast } = useToast();

  const { routePath, currentLocation, destination, isNavigating } = useNavigation();

  const clearMarkers = () => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    }
  };

  const updateRouteVisualization = () => {
    if (!mapRef.current) return;
    
    if (mapRef.current.getSource('route')) {
      mapRef.current.removeLayer('route-border');
      mapRef.current.removeLayer('route');
      mapRef.current.removeSource('route');
    }
    
    if (isNavigating && routePath.length > 1) {
      mapRef.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routePath.map(p => [p.longitude, p.latitude])
          }
        }
      });

      mapRef.current.addLayer({
        id: 'route-border',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 8,
          'line-opacity': 0.8
        }
      });

      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#4285F4',
          'line-width': 6,
          'line-opacity': 1
        }
      });
    }
    
    clearMarkers();
    
    if (currentLocation) {
      const startMarker = new mapboxgl.Marker({
        color: '#4285F4',
        scale: 1.2
      })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(mapRef.current);
      markersRef.current.push(startMarker);

      if (!mapRef.current.getSource('location-accuracy')) {
        mapRef.current.addSource('location-accuracy', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [currentLocation.longitude, currentLocation.latitude]
            }
          }
        });

        mapRef.current.addLayer({
          id: 'location-accuracy',
          type: 'circle',
          source: 'location-accuracy',
          paint: {
            'circle-radius': 20,
            'circle-color': '#4285F4',
            'circle-opacity': 0.15,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#4285F4'
          }
        });
      }
    }
    
    if (destination) {
      const endMarker = new mapboxgl.Marker({
        color: '#EA4335',
        scale: 1.2
      })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(mapRef.current);
      markersRef.current.push(endMarker);
    }
    
    if (isNavigating && routePath.length > 3) {
      for (let i = 1; i < routePath.length - 1; i += Math.max(1, Math.floor(routePath.length / 10))) {
        const point = routePath[i];
        const waypointMarker = new mapboxgl.Marker({
          color: '#FBBC04',
          scale: 0.8
        })
          .setLngLat([point.longitude, point.latitude])
          .addTo(mapRef.current);
        markersRef.current.push(waypointMarker);
      }
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    if (!mapRef.current) {
      try {
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [position.longitude, position.latitude],
          zoom: position.zoom,
          attributionControl: false,
          preserveDrawingBuffer: true,
        });

        mapRef.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: true }),
          'top-right'
        );
        
        mapRef.current.on('style.load', () => {
          const layers = mapRef.current?.getStyle().layers;
          if (layers) {
            const labelLayerId = layers.find(
              (layer) => layer.type === 'symbol' && 
              layer.layout && 
              (layer.layout as any)['text-field']
            )?.id;

            if (labelLayerId && !mapRef.current?.getLayer('3d-buildings')) {
              mapRef.current?.addLayer(
                {
                  'id': '3d-buildings',
                  'source': 'composite',
                  'source-layer': 'building',
                  'filter': ['==', 'extrude', 'true'],
                  'type': 'fill-extrusion',
                  'minzoom': 15,
                  'paint': {
                    'fill-extrusion-color': '#aaa',
                    'fill-extrusion-height': [
                      'interpolate', ['linear'], ['zoom'],
                      15, 0,
                      15.05, ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                      'interpolate', ['linear'], ['zoom'],
                      15, 0,
                      15.05, ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.6
                  }
                },
                labelLayerId
              );
            }
          }
          
          updateRouteVisualization();
        });

        mapRef.current.on('moveend', () => {
          if (!mapRef.current) return;
          const c = mapRef.current.getCenter();
          const z = mapRef.current.getZoom();
          onPositionChange({ latitude: c.lat, longitude: c.lng, zoom: z });
        });

        mapRef.current.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          onPositionChange({ latitude: lat, longitude: lng });
        });
        
        toast({
          title: "Map loaded successfully",
          description: "You can now explore streets and buildings",
          duration: 3000
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Error loading map",
          description: "Please check your internet connection",
          variant: "destructive"
        });
      }
    }

    return () => {
      if (mapRef.current) {
        clearMarkers();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onPositionChange, toast]);

  useEffect(() => {
    if (!mapRef.current) return;
    const curr = mapRef.current.getCenter();
    if (
      Math.abs(curr.lat - position.latitude) > 0.0001 ||
      Math.abs(curr.lng - position.longitude) > 0.0001
    ) {
      mapRef.current.setCenter([position.longitude, position.latitude]);
    }
    if (Math.abs(mapRef.current.getZoom() - position.zoom) > 0.001) {
      mapRef.current.setZoom(position.zoom);
    }
  }, [position.latitude, position.longitude, position.zoom]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.loaded()) return;
    updateRouteVisualization();
  }, [routePath, currentLocation, destination, isNavigating]);

  return (
    <div
      className={`map-container ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-1000`}
      style={{ zIndex: visible ? 10 : 0, position: 'absolute', width: '100%', height: '100%' }}
    >
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10 rounded-lg" />

      <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
        <button 
          onClick={() => onPositionChange({ zoom: Math.min(position.zoom + 1, 20) })}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        </button>
        <button 
          onClick={() => onPositionChange({ zoom: Math.max(position.zoom - 1, 1) })}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path></svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <button 
          onClick={() => {
            if (currentLocation) {
              onPositionChange({ 
                latitude: currentLocation.latitude, 
                longitude: currentLocation.longitude,
                zoom: 16
              });
            }
          }}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="My location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Map;
