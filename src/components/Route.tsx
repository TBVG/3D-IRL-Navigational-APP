
import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { ChevronRight, Navigation, Clock, Route as RouteIcon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface RouteProps {
  visible: boolean;
}

const Route: React.FC<RouteProps> = ({ visible }) => {
  const { 
    routePath, 
    currentLocation, 
    destination, 
    isNavigating, 
    endNavigation, 
    waypoints,
    estimatedTimeOfArrival,
    estimatedDistance,
    getCurrentStep,
    getNextTurn,
    getProgress
  } = useNavigation();

  if (!visible || !isNavigating || !currentLocation || !destination) {
    return null;
  }

  const currentStep = getCurrentStep();
  const nextTurn = getNextTurn();
  const progress = getProgress();
  
  // Format ETA
  const etaText = estimatedTimeOfArrival 
    ? formatDistanceToNow(estimatedTimeOfArrival, { addSuffix: true })
    : 'Calculating...';
  
  // Format distance
  const distanceText = estimatedDistance !== null 
    ? `${estimatedDistance.toFixed(1)} km`
    : 'Calculating...';

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <svg className="w-full h-full">
        {/* Draw the route path with enhanced styling for realistic streets */}
        {routePath.length > 1 && (
          <>
            {/* Create a filter for the glow effect */}
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            {/* Path shadow for depth - wider for street appearance */}
            <polyline
              points={routePath.map(point => `${point.longitude * 100 + 1000},${-point.latitude * 100 + 500}`).join(' ')}
              stroke="#4F46E580"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Main route line with animated dash effect */}
            <polyline
              points={routePath.map(point => `${point.longitude * 100 + 1000},${-point.latitude * 100 + 500}`).join(' ')}
              stroke="#4F46E5"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="none"
              filter="url(#glow)"
              fill="none"
              className="animate-pulse"
            />
            
            {/* Direction indicators on street corners */}
            {routePath.filter((_, i) => i > 0 && i < routePath.length - 1 && i % 4 === 0).map((point, idx) => {
              // Get previous and next points to determine corner angle
              const prevPoint = routePath[Math.max(0, idx * 4 - 1)];
              const nextPoint = routePath[Math.min(routePath.length - 1, idx * 4 + 1)];
              
              // Calculate bearing change
              const prevBearing = Math.atan2(
                point.longitude - prevPoint.longitude,
                point.latitude - prevPoint.latitude
              );
              
              const nextBearing = Math.atan2(
                nextPoint.longitude - point.longitude,
                nextPoint.latitude - point.latitude
              );
              
              // Determine if this is a significant turn
              const bearingChange = Math.abs(((nextBearing - prevBearing) * 180 / Math.PI + 360) % 360 - 180);
              const isSignificantTurn = bearingChange > 30;
              
              return (
                <g key={`corner-${idx}`}>
                  {isSignificantTurn ? (
                    // Turn indicator
                    <circle 
                      cx={point.longitude * 100 + 1000}
                      cy={-point.latitude * 100 + 500}
                      r="6"
                      fill="#FB923C"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ) : (
                    // Regular route point
                    <circle 
                      cx={point.longitude * 100 + 1000}
                      cy={-point.latitude * 100 + 500}
                      r="3"
                      fill="#ffffff"
                      stroke="#4F46E5"
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}
            
            {/* Waypoint markers */}
            {waypoints.map((waypoint, idx) => (
              <g key={`waypoint-${waypoint.id}`}>
                <circle 
                  cx={waypoint.longitude * 100 + 1000}
                  cy={-waypoint.latitude * 100 + 500}
                  r="8"
                  fill="#FB923C"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={waypoint.longitude * 100 + 1000}
                  y={-waypoint.latitude * 100 + 485}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  stroke="#000000"
                  strokeWidth="0.5"
                >
                  {idx + 1}
                </text>
              </g>
            ))}
            
            {/* Start point marker */}
            <g>
              <circle 
                cx={currentLocation.longitude * 100 + 1000}
                cy={-currentLocation.latitude * 100 + 500}
                r="8"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={currentLocation.longitude * 100 + 1000}
                y={-currentLocation.latitude * 100 + 485}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
                stroke="#000000"
                strokeWidth="0.5"
              >
                S
              </text>
            </g>
            
            {/* End point marker */}
            <g>
              <circle 
                cx={destination.longitude * 100 + 1000}
                cy={-destination.latitude * 100 + 500}
                r="8"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={destination.longitude * 100 + 1000}
                y={-destination.latitude * 100 + 485}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
                stroke="#000000"
                strokeWidth="0.5"
              >
                E
              </text>
            </g>
          </>
        )}
      </svg>
      
      {/* Navigation control panel with enhanced UI */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 pointer-events-auto z-20">
        <div className="glass-panel rounded-lg p-4 shadow-float text-center border border-indigo-100/20">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-indigo-600 rounded-full p-1">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-medium text-lg">
              {destination.name || 'Destination'}
            </h3>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-indigo-600 h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Turn-by-turn instructions */}
          <div className="bg-white/10 rounded-md p-3 mb-3">
            {currentStep && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-1.5 rounded mr-2">
                    <ChevronRight className="h-4 w-4 text-indigo-600" />
                  </div>
                  <span className="font-medium">{currentStep.instruction}</span>
                </div>
                {currentStep.distance > 0 && (
                  <span className="text-sm font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                    {currentStep.distance.toFixed(1)} km
                  </span>
                )}
              </div>
            )}
            
            {nextTurn && (
              <div className="flex items-center justify-between text-gray-500 text-sm">
                <div className="flex items-center">
                  <div className="p-1.5 mr-2">
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <span>Then {nextTurn.instruction.toLowerCase()}</span>
                </div>
                {nextTurn.distance > 0 && (
                  <span>{nextTurn.distance.toFixed(1)} km</span>
                )}
              </div>
            )}
          </div>
          
          {/* ETA and distance info */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/10 rounded-md p-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>ETA:</span>
                </div>
                <span className="font-medium">{etaText}</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-md p-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <RouteIcon className="h-4 w-4 text-indigo-400" />
                  <span>Distance:</span>
                </div>
                <span className="font-medium">{distanceText}</span>
              </div>
            </div>
          </div>
          
          {/* Destination coordinates */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 20l-5.447-5.446a10 10 0 1 1 14.142 0L13 20"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>
              {destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}
            </span>
          </div>
          
          {/* End navigation button */}
          <button
            onClick={endNavigation}
            className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-full shadow transition-colors"
          >
            End Navigation
          </button>
        </div>
      </div>
      
      {/* Compass heading indicator */}
      {currentStep && (
        <div className="absolute top-24 right-4 pointer-events-auto z-20">
          <div className="glass-panel rounded-full p-2 shadow-float">
            <div 
              className="relative w-12 h-12 flex items-center justify-center"
              style={{ transform: `rotate(${currentStep.fromBearing}deg)` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-10 bg-gradient-to-t from-indigo-600 to-white/0 rounded-full transform -translate-y-1"></div>
                <div className="absolute w-3 h-3 bg-indigo-600 rounded-full top-0"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold absolute top-1">N</span>
                <span className="text-[10px] font-bold absolute bottom-1">S</span>
                <span className="text-[10px] font-bold absolute left-1">W</span>
                <span className="text-[10px] font-bold absolute right-1">E</span>
              </div>
              <div className="w-10 h-10 border-2 border-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Route;
