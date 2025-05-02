import React, { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { MapPosition } from '@/hooks/useMapPosition';
import { useNavigation } from '@/contexts/NavigationContext';
import { useToast } from '@/components/ui/use-toast';
import StatsWrapper from './StatsWrapper';

interface Earth3DProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  visible: boolean;
}

const Earth3D: React.FC<Earth3DProps> = ({ position, onPositionChange, visible }) => {
  const { routePath, currentLocation, destination, isNavigating } = useNavigation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  useEffect(() => {
    if (visible) {
      console.log("Using Earth3D as 3D view fallback");
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-5 max-w-md">
          <h2 className="text-xl font-bold mb-3">3D View Error</h2>
          <p>There was an error loading the 3D view. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p>Loading 3D View...</p>
          </div>
        </div>
      }>
        <Canvas
          camera={{ 
            position: [0, 0, 5], 
            fov: 45,
            near: 0.1,
            far: 1000
          }}
          style={{ background: '#000814' }}
          onCreated={() => {
            console.log("Three.js canvas created successfully");
            setIsLoading(false);
          }}
          onError={(error) => {
            console.error("Three.js error:", error);
            setHasError(true);
            toast({
              title: "3D View Error",
              description: "An error occurred while rendering the 3D view.",
              variant: "destructive",
            });
          }}
        >
          <ErrorBoundary>
            <EarthSphere 
              position={position} 
              onPositionChange={onPositionChange}
              routePath={routePath}
              currentLocation={currentLocation}
              destination={destination}
              isNavigating={isNavigating}
            />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={2.5}
              maxDistance={10}
            />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 3, 5]} intensity={0.8} />
            {import.meta.env.DEV && <StatsWrapper />}
          </ErrorBoundary>
        </Canvas>
      </Suspense>

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
      </div>
      
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
      
      <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-70 text-white px-3 py-1 rounded-md text-sm">
        3D Globe View
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D View Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color="red" />
        </mesh>
      );
    }

    return this.props.children;
  }
}

interface EarthSphereProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  routePath: Array<{ latitude: number; longitude: number }>;
  currentLocation: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number; name?: string } | null;
  isNavigating: boolean;
}

const EarthSphere: React.FC<EarthSphereProps> = ({ 
  position, 
  routePath, 
  currentLocation, 
  destination,
  isNavigating 
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const routeRef = useRef<THREE.Line | null>(null);
  
  const textures = useMemo(() => {
    const textureLoader = new THREE.TextureLoader();
    
    // Load textures with error handling
    const loadTexture = (path: string, name: string) => {
      return new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            resolve(texture);
          },
          undefined,
          (error) => {
            console.error(`Failed to load ${name}:`, error);
            reject(error);
          }
        );
      });
    };

    // Use default textures if custom ones fail to load
    const defaultTexture = new THREE.Texture();
    defaultTexture.colorSpace = THREE.SRGBColorSpace;
    defaultTexture.minFilter = THREE.LinearFilter;
    defaultTexture.magFilter = THREE.LinearFilter;

    return {
      earthTexture: loadTexture('/textures/earth-texture.jpg', 'earth texture')
        .catch(() => defaultTexture),
      earthBumpMap: loadTexture('/textures/earth-bump.jpg', 'earth bump map')
        .catch(() => defaultTexture),
      cloudsTexture: loadTexture('/textures/earth-clouds.png', 'clouds texture')
        .catch(() => defaultTexture)
    };
  }, []);
  
  const { camera } = useThree();
  
  useEffect(() => {
    try {
      const phi = (90 - position.latitude) * (Math.PI / 180);
      const theta = (position.longitude + 180) * (Math.PI / 180);
      
      const distance = 10 - (position.zoom * 0.4);
      
      const x = distance * Math.sin(phi) * Math.cos(theta);
      const y = distance * Math.cos(phi);
      const z = distance * Math.sin(phi) * Math.sin(theta);
      
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    } catch (error) {
      console.error('Error updating camera position:', error);
    }
  }, [position, camera]);

  useFrame(({ clock }) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0005;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.00055;
    }
    if (routeRef.current && routeRef.current.material) {
      const material = routeRef.current.material as THREE.LineBasicMaterial;
      const pulseFactor = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 2);
      material.color.setRGB(0.31, 0.28, 0.9 * pulseFactor);
      material.opacity = 0.7 + 0.3 * pulseFactor;
    }
  });

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      Object.values(textures).forEach(texture => {
        if (texture) {
          texture.dispose();
        }
      });
    };
  }, [textures]);

  const latLongToVector3 = (lat: number, long: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (long + 180) * (Math.PI / 180);
    
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
  };

  const roadNetwork = useMemo(() => {
    if (!isNavigating || routePath.length < 2) return null;
    
    const roadGeometry = new THREE.BufferGeometry();
    const roadMaterial = new THREE.LineBasicMaterial({
      color: 0x4F46E5,
      linewidth: 4,
      transparent: true,
      opacity: 0.9
    });
    
    const points = routePath.map(point => 
      latLongToVector3(point.latitude, point.longitude, 2.02)
    );
    
    roadGeometry.setFromPoints(points);
    
    return (
      <primitive object={new THREE.Line(roadGeometry, roadMaterial)} ref={routeRef} />
    );
  }, [routePath, isNavigating]);

  const elevatedRoad = useMemo(() => {
    if (!isNavigating || routePath.length < 2) return null;
    
    return routePath.map((point, index) => {
      if (index < routePath.length - 1) {
        const start = latLongToVector3(point.latitude, point.longitude, 2.05);
        const end = latLongToVector3(routePath[index + 1].latitude, routePath[index + 1].longitude, 2.05);
        
        return (
          <Line 
            key={`road-segment-${index}`} 
            points={[start, end]}
            color="#4F46E5"
            lineWidth={3}
            transparent
            opacity={0.8}
          />
        );
      }
      return null;
    });
  }, [routePath, isNavigating]);

  const routeMarkers = useMemo(() => {
    if (!isNavigating || routePath.length < 3) return [];
    
    return routePath.filter((point, i) => {
      if (i === 0 || i === routePath.length - 1) return false;
      if (i % 3 === 0) return true; // Increase frequency of markers for better visibility
      
      const prev = routePath[i-1];
      const curr = routePath[i];
      const next = routePath[i+1];
      
      const dx1 = curr.longitude - prev.longitude;
      const dy1 = curr.latitude - prev.latitude;
      const dx2 = next.longitude - curr.longitude;
      const dy2 = next.latitude - curr.latitude;
      
      const dotProduct = dx1 * dx2 + dy1 * dy2;
      const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      if (mag1 * mag2 === 0) return false;
      
      const cosAngle = dotProduct / (mag1 * mag2);
      const angle = Math.acos(Math.min(1, Math.max(-1, cosAngle))) * 180 / Math.PI;
      
      return angle > 20; // Lower threshold to show more turn points
    }).map(point => 
      latLongToVector3(point.latitude, point.longitude, 2.03)
    );
  }, [routePath, isNavigating]);

  const intersections = useMemo(() => {
    if (!isNavigating || routePath.length < 3) return null;
    
    return routeMarkers.map((position, idx) => (
      <group key={`intersection-${idx}`} position={position}>
        <mesh>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial color="#FB923C" emissive="#FB923C" emissiveIntensity={0.5} />
        </mesh>
        
        <mesh>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial 
            color="#FB923C" 
            transparent={true} 
            opacity={0.3}
            emissive="#FB923C"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>
    ));
  }, [routeMarkers, isNavigating]);

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial 
          map={textures.earthTexture}
          bumpMap={textures.earthBumpMap}
          bumpScale={0.1}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>

      <mesh ref={cloudRef}>
        <sphereGeometry args={[2.05, 64, 64]} />
        <meshStandardMaterial 
          map={textures.cloudsTexture}
          transparent={true}
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.15, 32, 32]} />
        <meshStandardMaterial 
          color="#4ca6ff" 
          transparent={true} 
          opacity={0.1}
        />
      </mesh>

      {isNavigating && roadNetwork}
      
      {isNavigating && elevatedRoad}
      
      {isNavigating && intersections}
      
      {currentLocation && (
        <group position={latLongToVector3(currentLocation.latitude, currentLocation.longitude, 2.1)}>
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial 
              color="#22c55e" 
              emissive="#22c55e"
              emissiveIntensity={0.5}
            />
          </mesh>
          
          <mesh>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial 
              color="#22c55e" 
              transparent={true} 
              opacity={0.3}
              emissive="#22c55e"
              emissiveIntensity={0.2}
            />
          </mesh>
          
          <mesh>
            <ringGeometry args={[0.07, 0.09, 32]} />
            <meshBasicMaterial 
              color="#22c55e" 
              transparent={true} 
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
      
      {destination && (
        <group position={latLongToVector3(destination.latitude, destination.longitude, 2.1)}>
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial 
              color="#ef4444" 
              emissive="#ef4444"
              emissiveIntensity={0.5}
            />
          </mesh>
          
          <mesh position={[0, 0.06, 0]}>
            <coneGeometry args={[0.03, 0.08, 8]} />
            <meshStandardMaterial 
              color="#ef4444" 
              emissive="#ef4444"
              emissiveIntensity={0.5} 
            />
          </mesh>
          
          <mesh>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial 
              color="#ef4444" 
              transparent={true} 
              opacity={0.3}
              emissive="#ef4444"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default Earth3D;
