import React, { useEffect, useState } from 'react';

// A safe wrapper for the @react-three/drei Stats component
const StatsWrapper: React.FC = () => {
  const [StatsComponent, setStatsComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Dynamically import the Stats component only on client side
    // and handle any import errors gracefully
    const loadStats = async () => {
      try {
        // Try to dynamically import the Stats component
        const dreiModule = await import('@react-three/drei');
        if (dreiModule.Stats) {
          setStatsComponent(() => dreiModule.Stats);
        }
      } catch (error) {
        console.error('Failed to load Stats component:', error);
        // No need to crash the app, just don't show stats
      }
    };
    
    loadStats();
  }, []);

  // If the Stats component loaded successfully, render it
  // Otherwise, render nothing
  return StatsComponent ? <StatsComponent /> : null;
};

export default StatsWrapper;
