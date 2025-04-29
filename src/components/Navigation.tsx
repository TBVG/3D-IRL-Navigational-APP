
import React from 'react';

interface NavigationProps {
  children?: React.ReactNode;
}

const Navigation: React.FC<NavigationProps> = ({ children }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-2xl font-medium tracking-tighter text-gray-900 transition-transform duration-200 hover:scale-105">
            <span className="inline-flex items-center gap-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-blue-500"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                <path d="M2 12h20"></path>
              </svg>
              EarthScape
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {children}
        </div>
      </div>
    </header>
  );
};

export default Navigation;
