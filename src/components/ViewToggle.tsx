
import React from 'react';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  isGlobeView: boolean;
  onChange: (isGlobeView: boolean) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ isGlobeView, onChange }) => {
  return (
    <div className="glass-panel rounded-full p-1 flex shadow-map-control transition-all duration-300 hover:shadow-lg">
      <button
        onClick={() => onChange(false)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
          !isGlobeView 
            ? "bg-white text-gray-900 shadow-sm" 
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        2D
      </button>
      <button
        onClick={() => onChange(true)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
          isGlobeView 
            ? "bg-white text-gray-900 shadow-sm" 
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        3D
      </button>
    </div>
  );
};

export default ViewToggle;
