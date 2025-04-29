
import React, { useEffect, useRef, memo, useState } from 'react';
import type { MapPosition } from '@/hooks/useMapPosition';
import { useNavigation } from '@/contexts/NavigationContext';

interface GlobeProps {
  position: MapPosition;
  onPositionChange: (position: Partial<MapPosition>) => void;
  visible: boolean;
}

const Globe: React.FC<GlobeProps> = ({ position, onPositionChange, visible }) => {
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const { routePath, currentLocation, destination, isNavigating } = useNavigation();
  const [isFirstPerson, setIsFirstPerson] = useState(false);

  useEffect(() => {
    if (!globeContainerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container size
    canvas.width = globeContainerRef.current.clientWidth;
    canvas.height = globeContainerRef.current.clientHeight;

    // Initialize simulated globe
    const initGlobe = () => {
      // Set up the simulated globe properties
      return {
        rotation: 0,
        tilt: 0.3,
        radius: Math.min(canvas.width, canvas.height) * 0.35,
        fpsIndex: 0, // Current position in the route path for FPS mode
        fpsUpdateTime: 0, // Time counter for FPS movement
        animate: (deltaTime: number) => {
          // Slowly rotate the globe (only when not navigating)
          if (!isNavigating) {
            globeInstanceRef.current.rotation += 0.0004 * deltaTime;
          } else if (isFirstPerson && routePath.length > 1) {
            // In first-person mode, move along the route
            globeInstanceRef.current.fpsUpdateTime += deltaTime;
            if (globeInstanceRef.current.fpsUpdateTime > 1000) { // Update every second
              globeInstanceRef.current.fpsUpdateTime = 0;
              globeInstanceRef.current.fpsIndex = (globeInstanceRef.current.fpsIndex + 1) % (routePath.length - 1);
              
              // Get current position in the route
              const currentPos = routePath[globeInstanceRef.current.fpsIndex];
              if (currentPos) {
                // Update the globe position based on FPS movement
                globeInstanceRef.current.rotation = currentPos.longitude * Math.PI / 180;
                globeInstanceRef.current.tilt = currentPos.latitude * Math.PI / 180;
              }
            }
          }
          drawGlobe();
        },
        setPositionFromCoordinates: (lat: number, lng: number) => {
          // Convert lat/lng to rotation
          globeInstanceRef.current.rotation = lng * Math.PI / 180;
          globeInstanceRef.current.tilt = lat * Math.PI / 180;
          drawGlobe();
        }
      };
    };

    // Draw the simulated globe
    const drawGlobe = () => {
      if (!ctx || !globeInstanceRef.current) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const { radius, rotation, tilt } = globeInstanceRef.current;

      if (isFirstPerson && isNavigating && routePath.length > 1) {
        drawFirstPersonView(ctx, canvas, rotation, tilt);
      } else {
        drawGlobeView(ctx, canvas, centerX, centerY, radius, rotation, tilt);
      }
    };

    // Draw first-person navigation view
    const drawFirstPersonView = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, rotation: number, tilt: number) => {
      // Draw sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
      skyGradient.addColorStop(0, '#87CEEB');
      skyGradient.addColorStop(1, '#E0F7FF');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.5);
      
      // Draw ground
      const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
      groundGradient.addColorStop(0, '#8FBC8F');
      groundGradient.addColorStop(1, '#3A5F0B');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);
      
      // Draw road
      ctx.fillStyle = '#808080';
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.3, canvas.height);
      ctx.lineTo(canvas.width * 0.4, canvas.height * 0.5);
      ctx.lineTo(canvas.width * 0.6, canvas.height * 0.5);
      ctx.lineTo(canvas.width * 0.7, canvas.height);
      ctx.fill();
      
      // Draw road markings
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.5, canvas.height);
      ctx.lineTo(canvas.width * 0.5, canvas.height * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw horizon mountains
      ctx.fillStyle = '#6B8E23';
      for (let i = 0; i < 5; i++) {
        const mountainHeight = Math.random() * 50 + 20;
        const mountainWidth = Math.random() * 100 + 50;
        const mountainX = Math.random() * canvas.width;
        
        ctx.beginPath();
        ctx.moveTo(mountainX - mountainWidth / 2, canvas.height * 0.5);
        ctx.lineTo(mountainX, canvas.height * 0.5 - mountainHeight);
        ctx.lineTo(mountainX + mountainWidth / 2, canvas.height * 0.5);
        ctx.fill();
      }
      
      // Draw route direction arrow
      if (routePath.length > 1) {
        // Get next point in route to determine direction
        const currIdx = globeInstanceRef.current.fpsIndex;
        const nextIdx = Math.min(currIdx + 1, routePath.length - 1);
        
        if (currIdx !== nextIdx) {
          const curr = routePath[currIdx];
          const next = routePath[nextIdx];
          
          // Calculate bearing between points
          const dx = next.longitude - curr.longitude;
          const dy = next.latitude - curr.latitude;
          const angle = Math.atan2(dx, dy) + Math.PI / 2;
          
          // Draw direction arrow
          const arrowSize = 40;
          ctx.fillStyle = '#4F46E5';
          ctx.save();
          ctx.translate(canvas.width * 0.5, canvas.height * 0.6);
          ctx.rotate(angle);
          
          ctx.beginPath();
          ctx.moveTo(0, -arrowSize / 2);
          ctx.lineTo(arrowSize / 3, arrowSize / 2);
          ctx.lineTo(-arrowSize / 3, arrowSize / 2);
          ctx.closePath();
          ctx.fill();
          
          // Draw arrow outline
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          
          // Draw distance indicator
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Next turn: 200m', canvas.width * 0.5, canvas.height * 0.75);
        }
      }
      
      // Draw compass
      drawCompass(ctx, canvas.width - 80, 80, 40);
    };
    
    // Draw a compass for orientation
    const drawCompass = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
      ctx.save();
      
      // Draw compass background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw compass border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw direction markers
      const directions = ['N', 'E', 'S', 'W'];
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      directions.forEach((dir, i) => {
        const angle = (i * Math.PI / 2) - Math.PI / 2;
        const textX = x + Math.cos(angle) * (radius - 15);
        const textY = y + Math.sin(angle) * (radius - 15);
        ctx.fillText(dir, textX, textY);
      });
      
      // Draw compass needle
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(globeInstanceRef.current.rotation);
      
      // North pointer (red)
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.moveTo(0, -radius + 10);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      
      // South pointer (white)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, radius - 10);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      
      // Center dot
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      ctx.restore();
    };

    // Draw the globe in 3D view mode
    const drawGlobeView = (
      ctx: CanvasRenderingContext2D, 
      canvas: HTMLCanvasElement,
      centerX: number, 
      centerY: number, 
      radius: number, 
      rotation: number, 
      tilt: number
    ) => {
      // Draw globe background (ocean)
      ctx.fillStyle = '#1E3A8A'; // Darker blue for ocean
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw longitude lines
      ctx.strokeStyle = '#FFFFFF20';
      ctx.lineWidth = 1;

      // Draw longitude lines
      for (let i = 0; i < 36; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        const calcRadius = radius * Math.abs(Math.cos(angle + rotation));
        if (calcRadius > 0) { // Check for positive radius
          ctx.beginPath();
          ctx.ellipse(
            centerX,
            centerY,
            calcRadius,
            radius,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      }

      // Draw latitude lines
      for (let i = 0; i < 18; i++) {
        const y = centerY - radius + (i * (radius * 2)) / 18;
        // Ensure the value under the square root is not negative
        const distanceSquared = radius * radius - Math.pow(y - centerY, 2);
        
        if (distanceSquared > 0) {
          const latRadius = Math.sqrt(distanceSquared);
          const calcHeight = latRadius * Math.abs(Math.sin(tilt));
          
          if (latRadius > 0 && calcHeight > 0) { // Check for positive radius
            ctx.beginPath();
            ctx.ellipse(
              centerX, 
              y, 
              latRadius, 
              calcHeight, 
              0, 
              0, 
              Math.PI * 2
            );
            ctx.stroke();
          }
        }
      }

      // Draw some continents with enhanced colors
      ctx.fillStyle = '#34D399'; // Green for land
      
      // North America
      ctx.beginPath();
      ctx.ellipse(centerX - radius * 0.3, centerY - radius * 0.2, radius * 0.25, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // South America
      ctx.beginPath();
      ctx.ellipse(centerX - radius * 0.1, centerY + radius * 0.3, radius * 0.15, radius * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Europe/Africa
      ctx.beginPath();
      ctx.ellipse(centerX + radius * 0.2, centerY, radius * 0.2, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Asia/Australia
      ctx.beginPath();
      ctx.ellipse(centerX + radius * 0.4, centerY - radius * 0.1, radius * 0.3, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw route if navigating
      if (isNavigating && routePath.length > 1) {
        ctx.strokeStyle = '#F59E0B'; // Amber color for the route
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw route glow
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 10;
        
        // Convert route points to 3D globe positions
        for (let i = 0; i < routePath.length - 1; i++) {
          const startPoint = routePath[i];
          const endPoint = routePath[i + 1];
          
          // Convert lat/lng to globe points
          const startLng = startPoint.longitude * Math.PI / 180 - rotation;
          const startLat = startPoint.latitude * Math.PI / 180;
          const endLng = endPoint.longitude * Math.PI / 180 - rotation;
          const endLat = endPoint.latitude * Math.PI / 180;
          
          // Calculate 3D positions
          const startX = centerX + radius * Math.cos(startLat) * Math.sin(startLng);
          const startY = centerY - radius * Math.sin(startLat);
          const endX = centerX + radius * Math.cos(endLat) * Math.sin(endLng);
          const endY = centerY - radius * Math.sin(endLat);
          
          // Only draw if points are on visible side of globe
          const isStartVisible = Math.cos(startLat) * Math.cos(startLng) > 0;
          const isEndVisible = Math.cos(endLat) * Math.cos(endLng) > 0;
          
          if (isStartVisible && isEndVisible) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw direction dots along the path
            if (i % 3 === 0) {
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc((startX + endX) / 2, (startY + endY) / 2, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw current location marker
        if (currentLocation) {
          const currLng = currentLocation.longitude * Math.PI / 180 - rotation;
          const currLat = currentLocation.latitude * Math.PI / 180;
          const currX = centerX + radius * Math.cos(currLat) * Math.sin(currLng);
          const currY = centerY - radius * Math.sin(currLat);
          
          const isCurrVisible = Math.cos(currLat) * Math.cos(currLng) > 0;
          
          if (isCurrVisible) {
            // Pulsing effect for current location
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(currX, currY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw pulsing circle around current location
            const time = Date.now() % 2000 / 2000;
            const pulseSize = 8 + 6 * Math.sin(time * Math.PI);
            
            ctx.strokeStyle = '#10B98180';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(currX, currY, pulseSize, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        
        // Draw destination marker
        if (destination) {
          const destLng = destination.longitude * Math.PI / 180 - rotation;
          const destLat = destination.latitude * Math.PI / 180;
          const destX = centerX + radius * Math.cos(destLat) * Math.sin(destLng);
          const destY = centerY - radius * Math.sin(destLat);
          
          const isDestVisible = Math.cos(destLat) * Math.cos(destLng) > 0;
          
          if (isDestVisible) {
            // Destination marker with pin shape
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            
            // Draw pin
            ctx.beginPath();
            ctx.arc(destX, destY - 4, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw pin's pointy bottom
            ctx.beginPath();
            ctx.moveTo(destX - 5, destY - 4);
            ctx.lineTo(destX, destY + 8);
            ctx.lineTo(destX + 5, destY - 4);
            ctx.fill();
            
            // White center of pin
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(destX, destY - 4, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Draw marker at current position when not navigating
        const markerX = centerX + radius * Math.sin(rotation) * Math.cos(tilt);
        const markerY = centerY - radius * Math.sin(tilt);
        
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw atmosphere glow
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius,
        centerX,
        centerY,
        radius * 1.2
      );
      gradient.addColorStop(0, 'rgba(200, 230, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
    };

    // Initialize the globe
    globeInstanceRef.current = initGlobe();
    
    // Set initial position based on props
    globeInstanceRef.current.setPositionFromCoordinates(
      position.latitude,
      position.longitude
    );

    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      const deltaTime = lastTime ? time - lastTime : 0;
      lastTime = time;
      
      globeInstanceRef.current.animate(deltaTime);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);

    // Handle interactions
    const handleGlobeClick = (e: MouseEvent) => {
      if (!canvas || !globeInstanceRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Convert click to lat/lng (simplified)
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only handle clicks on the globe
      if (distance <= globeInstanceRef.current.radius) {
        // Convert to latitude/longitude (simplified algorithm)
        const lng = Math.atan2(dx, -dy) * 180 / Math.PI;
        
        // Calculate distance from center as a fraction of radius
        const normalizedDistance = distance / globeInstanceRef.current.radius;
        // Convert to latitude (-90 to 90)
        const lat = 90 - (normalizedDistance * 180);
        
        console.log(`Globe clicked: lat ${lat.toFixed(2)}, lng ${lng.toFixed(2)}`);
        onPositionChange({ latitude: lat, longitude: lng });
      }
    };

    canvas.addEventListener('click', handleGlobeClick);

    // Handle window resize
    const handleResize = () => {
      if (!globeContainerRef.current || !canvas) return;
      
      canvas.width = globeContainerRef.current.clientWidth;
      canvas.height = globeContainerRef.current.clientHeight;
      
      // Update globe radius based on new dimensions
      if (globeInstanceRef.current) {
        globeInstanceRef.current.radius = Math.min(canvas.width, canvas.height) * 0.35;
      }
      
      drawGlobe();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('click', handleGlobeClick);
      window.removeEventListener('resize', handleResize);
    };
  }, [onPositionChange, isNavigating, routePath, currentLocation, destination, isFirstPerson]);

  // Handle position changes
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    
    globeInstanceRef.current.setPositionFromCoordinates(
      position.latitude,
      position.longitude
    );
  }, [position.latitude, position.longitude]);

  return (
    <div 
      ref={globeContainerRef} 
      className={`globe-container ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-1000`}
      style={{ 
        zIndex: visible ? 10 : 0,
        position: 'absolute',
        width: '100%',
        height: '100%'
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      
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
    </div>
  );
};

export default memo(Globe);
