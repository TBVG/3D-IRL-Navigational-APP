import React, { useEffect, useRef, useState } from 'react';
import type { MapPosition } from '@/hooks/useMapPosition';
import { useNavigation } from '@/contexts/NavigationContext';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import StatsWrapper from './StatsWrapper';

interface GoogleEarthProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  visible: boolean;
}

const GoogleEarth: React.FC<GoogleEarthProps> = ({ position, onPositionChange, visible }) => {
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const { routePath, currentLocation, destination, isNavigating } = useNavigation();

  if (!visible) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <Canvas
        style={{ background: '#041228' }}
      >
        {!isFirstPerson && (
          <PerspectiveCamera 
            makeDefault
            position={[0, 0, 5]} 
            fov={45}
            near={0.1}
            far={1000}
          />
        )}
        
        <EarthSphere 
          position={position} 
          onPositionChange={onPositionChange}
          routePath={routePath}
          currentLocation={currentLocation}
          destination={destination}
          isNavigating={isNavigating}
          isFirstPerson={isFirstPerson}
        />
        
        {!isFirstPerson && (
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2.5}
            maxDistance={10}
          />
        )}
        
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <hemisphereLight args={['#0000ff', '#00ff00', 0.6]} />
        {import.meta.env.DEV && <StatsWrapper />}
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
        <button 
          onClick={() => onPositionChange({ zoom: Math.min(position.zoom + 1, 20) })}
          className="w-10 h-10 rounded-full bg-white shadow-map-control flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Zoom in"
          disabled={isFirstPerson}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        </button>
        <button 
          onClick={() => onPositionChange({ zoom: Math.max(position.zoom - 1, 1) })}
          className="w-10 h-10 rounded-full bg-white shadow-map-control flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Zoom out"
          disabled={isFirstPerson}
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
              setIsFirstPerson(false);
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

      {/* First-person navigation indicator */}
      {isFirstPerson && isNavigating && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-4 h-4 border-2 border-white rounded-full"></div>
        </div>
      )}

      {/* Direction indicator in first-person mode */}
      {isFirstPerson && isNavigating && destination && (
        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-center pointer-events-none">
          <p className="font-medium">Follow the highlighted path</p>
          <p className="text-sm text-blue-300">Distance to destination: ~{getDistanceEstimate(currentLocation, destination)}m</p>
        </div>
      )}
    </div>
  );
};

// Simple distance estimation function
function getDistanceEstimate(
  start: { latitude: number; longitude: number } | null,
  end: { latitude: number; longitude: number } | null
): string {
  if (!start || !end) return "Unknown";
  
  // Simple distance calculation (very rough approximation)
  const dx = (end.longitude - start.longitude) * 111320 * Math.cos(start.latitude * Math.PI / 180);
  const dy = (end.latitude - start.latitude) * 110574;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance.toFixed(0);
}

interface EarthSphereProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  routePath: Array<{ latitude: number; longitude: number }>;
  currentLocation: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number; name?: string } | null;
  isNavigating: boolean;
  isFirstPerson: boolean;
}

const EarthSphere: React.FC<EarthSphereProps> = ({ 
  position, 
  routePath, 
  currentLocation, 
  destination,
  isNavigating,
  isFirstPerson
}) => {
  const earthRef = useRef<THREE.Group>(null);
  const firstPersonCameraRef = useRef<THREE.PerspectiveCamera>(null);
  const earthTexture = useLoader(THREE.TextureLoader, '/earth-texture.jpg');
  const earthBumpMap = useLoader(THREE.TextureLoader, '/earth-bump.jpg');
  const cloudsTexture = useLoader(THREE.TextureLoader, '/earth-clouds.png');
  const { camera } = useThree();
  
  // Update camera position based on map position
  useEffect(() => {
    if (isFirstPerson && isNavigating && currentLocation) {
      // Don't adjust the camera here - it's managed in the FirstPersonView component
      return;
    } else {
      // Regular view based on position
      const phi = (90 - position.latitude) * (Math.PI / 180);
      const theta = (position.longitude + 180) * (Math.PI / 180);
      
      // Scale distance based on zoom level (1-20)
      const distance = 10 - (position.zoom * 0.4);
      
      // Calculate position
      const x = distance * Math.sin(phi) * Math.cos(theta);
      const y = distance * Math.cos(phi);
      const z = distance * Math.sin(phi) * Math.sin(theta);
      
      // Set camera position
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    }
  }, [position, camera, isFirstPerson, isNavigating, currentLocation]);

  // Gentle rotation of earth when not in navigation mode
  useFrame(() => {
    if (earthRef.current && !isNavigating) {
      earthRef.current.rotation.y += 0.0005;
    }
  });

  // Convert lat/long to 3D coordinates on sphere
  const latLongToVector3 = (lat: number, long: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (long + 180) * (Math.PI / 180);
    
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
  };

  // Create positions array for route path
  const createRoutePositions = () => {
    if (!isNavigating || routePath.length < 2) return new Float32Array(0);
    
    const positions = new Float32Array(routePath.length * 3);
    
    routePath.forEach((point, i) => {
      const v = latLongToVector3(point.latitude, point.longitude, 2.1);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    });
    
    return positions;
  };

  // Simulate a street/ground plane in first-person mode
  const Street = () => {
    if (!isFirstPerson || !isNavigating || !currentLocation) return null;
    
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
        <planeGeometry args={[100, 100, 20, 20]} />
        <meshStandardMaterial 
          color="#333333"
          roughness={0.9}
          wireframe={false}
        />
      </mesh>
    );
  };

  // First-person camera and view
  const FirstPersonView = () => {
    const { camera } = useThree();
    
    useEffect(() => {
      if (isFirstPerson && isNavigating && currentLocation && routePath.length > 0) {
        // Calculate the direction to the next point in the route
        const currentPointIndex = routePath.findIndex(
          p => p.latitude === currentLocation.latitude && p.longitude === currentLocation.longitude
        );
        
        let targetPointIndex = currentPointIndex + 1;
        if (targetPointIndex >= routePath.length) {
          targetPointIndex = currentPointIndex;
        }
        
        // Get direction vector (simple version - just point to the next waypoint)
        const currentPoint = routePath[currentPointIndex >= 0 ? currentPointIndex : 0];
        const targetPoint = routePath[targetPointIndex >= 0 ? targetPointIndex : 0];
        
        // Set camera position at human height (about 1.7 meters)
        const position = latLongToVector3(currentPoint.latitude, currentPoint.longitude, 2.1);
        
        // Calculate a normal vector to place camera slightly above surface
        const normalVector = position.clone().normalize();
        const cameraPosition = position.clone().add(normalVector.multiplyScalar(0.0));
        
        // Set first-person camera position
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        
        // Calculate look direction
        if (targetPointIndex !== currentPointIndex) {
          const targetPosition = latLongToVector3(targetPoint.latitude, targetPoint.longitude, 2.1);
          camera.lookAt(targetPosition);
        }
        
        camera.up.set(0, 1, 0); // Keep "up" direction
      }
    }, [isFirstPerson, isNavigating, currentLocation, camera, routePath]);
    
    return null;
  };

  // 3D route visualization for first-person mode
  const RoutePathVisualizer = () => {
    if (!isFirstPerson || !isNavigating || routePath.length < 2) return null;
    
    return (
      <>
        {routePath.map((point, index) => {
          if (index < routePath.length - 1) {
            const start = latLongToVector3(point.latitude, point.longitude, 2.1);
            const end = latLongToVector3(routePath[index + 1].latitude, routePath[index + 1].longitude, 2.1);
            
            // Create direction arrow (simplified for first-person view)
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            
            return (
              <group key={`route-segment-${index}`}>
                <mesh position={mid}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshStandardMaterial color="#4db0ee" emissive="#4db0ee" emissiveIntensity={0.5} />
                </mesh>
              </group>
            );
          }
          return null;
        })}
        
        {/* Glowing path markers */}
        {routePath.map((point, index) => (
          <mesh 
            key={`path-marker-${index}`} 
            position={latLongToVector3(point.latitude, point.longitude, 2.1)}
          >
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial 
              color="#4285F4" 
              emissive="#4285F4" 
              emissiveIntensity={0.8} 
              transparent={true}
              opacity={0.8}
            />
          </mesh>
        ))}
      </>
    );
  };

  return (
    <group ref={earthRef}>
      {/* Only show earth elements if not in first-person mode */}
      {!isFirstPerson && (
        <>
          {/* Earth sphere with Google Earth-like appearance */}
          <mesh>
            <sphereGeometry args={[2, 64, 64]} />
            <meshStandardMaterial 
              map={earthTexture}
              bumpMap={earthBumpMap}
              bumpScale={0.1}
              metalness={0.2}
              roughness={0.6}
            />
          </mesh>

          {/* Clouds layer */}
          <mesh>
            <sphereGeometry args={[2.05, 64, 64]} />
            <meshStandardMaterial 
              map={cloudsTexture}
              transparent={true}
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
          
          {/* Atmospheric glow */}
          <mesh>
            <sphereGeometry args={[2.3, 32, 32]} />
            <meshStandardMaterial
              color="#8ab4f8"
              transparent={true}
              opacity={0.07}
              side={THREE.BackSide}
            />
          </mesh>

          {/* Navigation route */}
          {isNavigating && routePath.length > 1 && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  array={createRoutePositions()}
                  count={routePath.length}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial 
                color="#4db0ee" 
                linewidth={4} 
              />
            </line>
          )}
          
          {/* Current location marker */}
          {currentLocation && (
            <group position={latLongToVector3(currentLocation.latitude, currentLocation.longitude, 2.1)}>
              <mesh>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial color="#4285F4" />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <ringGeometry args={[0.04, 0.05, 32]} />
                <meshBasicMaterial color="#4285F4" transparent opacity={0.6} />
              </mesh>
            </group>
          )}
          
          {/* Destination marker */}
          {destination && (
            <group position={latLongToVector3(destination.latitude, destination.longitude, 2.15)}>
              <mesh>
                <sphereGeometry args={[0.02, 16, 16]} />
                <meshBasicMaterial color="#DB4437" />
              </mesh>
              <mesh position={[0, 0.05, 0]}>
                <coneGeometry args={[0.02, 0.05, 8]} />
                <meshBasicMaterial color="#DB4437" />
              </mesh>
              {destination.name && (
                <Text
                  position={[0, 0.1, 0]}
                  fontSize={0.05}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.005}
                  outlineColor="#000000"
                >
                  {destination.name}
                </Text>
              )}
            </group>
          )}
          
          {/* Google-like POI markers for demonstrative purposes */}
          <group>
            <mesh position={latLongToVector3(48.8566, 2.3522, 2.1)}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#FBBC05" />
            </mesh>
            <mesh position={latLongToVector3(51.5074, -0.1278, 2.1)}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#FBBC05" />
            </mesh>
            <mesh position={latLongToVector3(40.7128, -74.0060, 2.1)}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#FBBC05" />
            </mesh>
            <mesh position={latLongToVector3(35.6762, 139.6503, 2.1)}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#FBBC05" />
            </mesh>
          </group>
        </>
      )}
      
      {/* First-person mode elements */}
      {isFirstPerson && (
        <>
          <FirstPersonView />
          <RoutePathVisualizer />
          <Street />
          {destination && (
            <mesh 
              position={latLongToVector3(destination.latitude, destination.longitude, 2.15)}
              scale={[1, 1.5, 1]}
            >
              <coneGeometry args={[0.2, 0.5, 8]} />
              <meshStandardMaterial 
                color="#DB4437" 
                emissive="#DB4437"
                emissiveIntensity={0.5}
              />
              {destination.name && (
                <Text
                  position={[0, 0.5, 0]}
                  fontSize={0.2}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.03}
                  outlineColor="#000000"
                >
                  {destination.name}
                </Text>
              )}
            </mesh>
          )}
        </>
      )}
    </group>
  );
};

export default GoogleEarth;
