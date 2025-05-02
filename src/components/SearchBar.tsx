import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/contexts/NavigationContext';
import { Input } from '@/components/ui/input';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  filterLocations, 
  getExpandedMockLocations, 
  formatAddress, 
  LocationResult 
} from '@/utils/locationUtils';
import { Globe, MapPin, Navigation, Search, X } from 'lucide-react';

interface SearchBarProps {
  onSelectLocation: (location: { latitude: number; longitude: number }) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelectLocation }) => {
  // States for search queries
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  
  // States for search results
  const [startResults, setStartResults] = useState<LocationResult[]>([]);
  const [endResults, setEndResults] = useState<LocationResult[]>([]);
  
  // Loading states
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);
  
  // Focus states
  const [isStartFocused, setIsStartFocused] = useState(false);
  const [isEndFocused, setIsEndFocused] = useState(false);
  
  // Recent searches (mock data for now)
  const [recentSearches, setRecentSearches] = useState<LocationResult[]>([]);
  
  // Refs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Navigation context
  const { setCurrentLocation, setDestination, startNavigation, isNavigating } = useNavigation();
  
  // All locations data
  const allLocations = getExpandedMockLocations();
  
  // Handle start location search
  useEffect(() => {
    if (!startQuery.trim()) {
      setStartResults([]);
      return;
    }

    setIsSearchingStart(true);

    // Simulate API call with delay
    const timeoutId = setTimeout(() => {
      const filteredResults = filterLocations(allLocations, startQuery);
      setStartResults(filteredResults);
      setIsSearchingStart(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [startQuery]);

  // Handle end location search
  useEffect(() => {
    if (!endQuery.trim()) {
      setEndResults([]);
      return;
    }

    setIsSearchingEnd(true);

    // Simulate API call with delay
    const timeoutId = setTimeout(() => {
      const filteredResults = filterLocations(allLocations, endQuery);
      setEndResults(filteredResults);
      setIsSearchingEnd(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [endQuery]);

  // Handle clicking outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsStartFocused(false);
        setIsEndFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a start location
  const handleSelectStartLocation = (location: LocationResult) => {
    setCurrentLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name
    });
    
    setStartQuery(location.name);
    setIsStartFocused(false);
    onSelectLocation({ latitude: location.latitude, longitude: location.longitude });
    
    // Add to recent searches
    addToRecentSearches(location);
  };

  // Handle selecting an end location
  const handleSelectEndLocation = (location: LocationResult) => {
    setDestination({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name
    });
    
    setEndQuery(location.name);
    setIsEndFocused(false);
    
    // Add to recent searches
    addToRecentSearches(location);
  };
  
  // Add a location to recent searches
  const addToRecentSearches = (location: LocationResult) => {
    setRecentSearches(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item.id !== location.id);
      // Add to the beginning
      return [location, ...filtered].slice(0, 5);
    });
  };
  
  // Render category icon based on location category
  const renderCategoryIcon = (category?: string) => {
    switch(category?.toLowerCase()) {
      case 'city':
        return <Globe className="h-4 w-4 text-primary" />;
      case 'landmark':
      case 'museum':
      case 'park':
        return <MapPin className="h-4 w-4 text-red-500" />;
      case 'airport':
      case 'transit':
        return <Navigation className="h-4 w-4 text-blue-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Group results by category
  const groupResultsByCategory = (results: LocationResult[]) => {
    const grouped = results.reduce((acc, location) => {
      const category = location.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(location);
      return acc;
    }, {} as Record<string, LocationResult[]>);
    
    return grouped;
  };
  
  return (
    <div ref={searchContainerRef} className="relative w-full max-w-md">
      <div className="flex flex-col gap-3">
        {/* Start Location Input */}
        <div className={cn(
          "glass-panel rounded-full py-2 px-4 flex items-center transition-all duration-300",
          isStartFocused ? "shadow-lg ring-2 ring-primary/10" : "shadow-md hover:shadow-lg"
        )}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="mr-2 text-blue-500"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <input
            type="text"
            value={startQuery}
            onChange={(e) => setStartQuery(e.target.value)}
            onFocus={() => {
              setIsStartFocused(true);
              setIsEndFocused(false);
            }}
            placeholder="Enter your starting location..."
            className="flex-1 bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-800"
          />
          {isSearchingStart && (
            <svg 
              className="animate-spin h-4 w-4 text-gray-500" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {startQuery && !isSearchingStart && (
            <button 
              onClick={() => setStartQuery('')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Start Location Results */}
        {isStartFocused && (startResults.length > 0 || recentSearches.length > 0) && (
          <div className="absolute top-[60px] w-full glass-panel rounded-xl shadow-lg animate-fade-in overflow-hidden z-30">
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 py-1 text-sm text-gray-500 font-medium">Recent Searches</h3>
                  <ul>
                    {recentSearches.slice(0, 3).map(result => (
                      <li key={`recent-${result.id}`}>
                        <button
                          onClick={() => handleSelectStartLocation(result)}
                          className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-2 rounded-md"
                        >
                          {renderCategoryIcon(result.category)}
                          <div className="flex-1 truncate">
                            <div className="font-medium text-gray-800 truncate">{result.name}</div>
                            {result.address && (
                              <div className="text-xs text-gray-500 truncate">
                                {formatAddress(result.address)}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-100 mt-1"></div>
                </div>
              )}
              
              {/* Search Results by Category */}
              {startResults.length > 0 && (
                <div>
                  {Object.entries(groupResultsByCategory(startResults)).map(([category, locations]) => (
                    <div key={category} className="p-2">
                      <h3 className="px-2 py-1 text-sm text-gray-500 font-medium">{category}</h3>
                      <ul>
                        {locations.map(result => (
                          <li key={result.id}>
                            <button
                              onClick={() => handleSelectStartLocation(result)}
                              className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-2 rounded-md"
                            >
                              {renderCategoryIcon(result.category)}
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 truncate">{result.name}</div>
                                {result.address && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {formatAddress(result.address)}
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No Results */}
              {startResults.length === 0 && recentSearches.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>No locations found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Destination Input */}
        <div className={cn(
          "glass-panel rounded-full py-2 px-4 flex items-center transition-all duration-300",
          isEndFocused ? "shadow-lg ring-2 ring-primary/10" : "shadow-md hover:shadow-lg"
        )}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="mr-2 text-red-500"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <input
            type="text"
            value={endQuery}
            onChange={(e) => setEndQuery(e.target.value)}
            onFocus={() => {
              setIsEndFocused(true);
              setIsStartFocused(false);
            }}
            placeholder="Enter your destination..."
            className="flex-1 bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-800"
          />
          {isSearchingEnd && (
            <svg 
              className="animate-spin h-4 w-4 text-gray-500" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {endQuery && !isSearchingEnd && (
            <button 
              onClick={() => setEndQuery('')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Destination Results */}
        {isEndFocused && (endResults.length > 0 || recentSearches.length > 0) && (
          <div className="absolute top-[120px] w-full glass-panel rounded-xl shadow-lg animate-fade-in overflow-hidden z-30">
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 py-1 text-sm text-gray-500 font-medium">Recent Searches</h3>
                  <ul>
                    {recentSearches.slice(0, 3).map(result => (
                      <li key={`recent-${result.id}`}>
                        <button
                          onClick={() => handleSelectEndLocation(result)}
                          className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-2 rounded-md"
                        >
                          {renderCategoryIcon(result.category)}
                          <div className="flex-1 truncate">
                            <div className="font-medium text-gray-800 truncate">{result.name}</div>
                            {result.address && (
                              <div className="text-xs text-gray-500 truncate">
                                {formatAddress(result.address)}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-gray-100 mt-1"></div>
                </div>
              )}
              
              {/* Search Results by Category */}
              {endResults.length > 0 && (
                <div>
                  {Object.entries(groupResultsByCategory(endResults)).map(([category, locations]) => (
                    <div key={category} className="p-2">
                      <h3 className="px-2 py-1 text-sm text-gray-500 font-medium">{category}</h3>
                      <ul>
                        {locations.map(result => (
                          <li key={result.id}>
                            <button
                              onClick={() => handleSelectEndLocation(result)}
                              className="w-full px-2 py-1.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-2 rounded-md"
                            >
                              {renderCategoryIcon(result.category)}
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 truncate">{result.name}</div>
                                {result.address && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {formatAddress(result.address)}
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No Results */}
              {endResults.length === 0 && recentSearches.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p>No locations found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Button */}
      {!isNavigating && startQuery && endQuery && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={startNavigation}
            className="bg-primary text-white rounded-full py-2 px-4 flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Start Navigation
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
