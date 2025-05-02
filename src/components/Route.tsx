import React from 'react';
import { Card } from '@/components/ui/card';
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
    <Card className="p-4 bg-white/90 backdrop-blur-sm shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium">
            {currentLocation?.name || 'Current Location'}
          </span>
        </div>
        {routePath.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">
              {routePath.length} steps to destination
            </span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm font-medium">
            {destination?.name || 'Destination'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default Route;
