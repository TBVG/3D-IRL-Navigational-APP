import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Map } from 'lucide-react';

interface ViewToggleProps {
  isGlobeView: boolean;
  onToggle: (isGlobe: boolean) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ isGlobeView, onToggle }) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={isGlobeView ? "default" : "outline"}
        size="icon"
        onClick={() => onToggle(true)}
        className="rounded-full"
      >
        <Globe className="h-4 w-4" />
      </Button>
      <Button
        variant={!isGlobeView ? "default" : "outline"}
        size="icon"
        onClick={() => onToggle(false)}
        className="rounded-full"
      >
        <Map className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ViewToggle;
