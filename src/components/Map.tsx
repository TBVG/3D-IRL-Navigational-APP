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

// Try to use the Mapbox token, but fall back to a basic style if it fails
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFyaXFiaXZpamkiLCJhIjoiY2xsNTY0d3JtMGQxdjNlbzF2b2loNm40aCJ9.AZajFCsj0ImNT2zgkcF45Q';
const FALLBACK_STYLE: mapboxgl.Style = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [{
    id: 'osm',
    type: 'raster',
    source: 'osm',
    minzoom: 0,
    maxzoom: 19
  }]
};

// Initialize with fallback style by default
const INITIAL_STYLE = FALLBACK_STYLE;

const Map: React.FC<MapProps> = ({ position, onPositionChange, visible }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { toast } = useToast();
  const [mapError, setMapError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(true); // Start with fallback

  const { routePath, currentLocation, destination, isNavigating } = useNavigation();

  const clearMarkers = () => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    }
  };

  const updateRouteVisualization = () => {
    if (!mapRef.current) return;
    
    try {
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
    } catch (error) {
      console.error('Error updating route visualization:', error);
      toast({
        title: 'Error updating map',
        description: 'There was an error updating the route visualization.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      if (!mapRef.current) {
        const mapOptions: mapboxgl.MapOptions = {
          container: mapContainer.current,
          style: INITIAL_STYLE,
          center: [position.longitude, position.latitude],
          zoom: position.zoom,
          attributionControl: false,
          preserveDrawingBuffer: true,
        };

        mapRef.current = new mapboxgl.Map(mapOptions);

        mapRef.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: true }),
          'top-right'
        );
        
        mapRef.current.on('style.load', () => {
          try {
            if (!usingFallback) {
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
                    } as mapboxgl.FillExtrusionLayer,
                    labelLayerId
                  );
                }
              }
            }
          } catch (error) {
            console.error('Error adding 3D buildings:', error);
          }
        });

        mapRef.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          if (!usingFallback) {
            setUsingFallback(true);
            mapRef.current?.setStyle(FALLBACK_STYLE);
          } else {
            setMapError('Error loading map');
            toast({
              title: 'Map Error',
              description: 'There was an error loading the map.',
              variant: 'destructive',
            });
          }
        });

        mapRef.current.on('load', () => {
          setMapError(null);
          // Try to load Mapbox style after initial load
          if (usingFallback) {
            try {
              mapRef.current?.setStyle('mapbox://styles/mapbox/streets-v12');
              setUsingFallback(false);
            } catch (error) {
              console.warn('Failed to load Mapbox style, keeping fallback:', error);
            }
          }
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
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
      toast({
        title: 'Map Initialization Error',
        description: 'Failed to initialize the map. Please refresh the page.',
        variant: 'destructive',
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [position.latitude, position.longitude, position.zoom, toast, onPositionChange, usingFallback]);

  useEffect(() => {
    if (mapRef.current && visible) {
      updateRouteVisualization();
    }
  }, [routePath, currentLocation, destination, isNavigating, visible]);

  if (mapError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-2">{mapError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      className={`h-full w-full ${visible ? 'block' : 'hidden'}`}
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    />
  );
};

export default Map;
