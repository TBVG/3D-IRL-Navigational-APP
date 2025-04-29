// Utility functions for handling location data

// Calculate the bearing between two coordinates
export const calculateBearing = (
  startLat: number, startLng: number, 
  destLat: number, destLng: number
): number => {
  const startLatRad = startLat * Math.PI / 180;
  const startLngRad = startLng * Math.PI / 180;
  const destLatRad = destLat * Math.PI / 180;
  const destLngRad = destLng * Math.PI / 180;
  
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  if (bearing < 0) bearing += 360;
  
  return bearing;
};

// Calculate distance between two coordinates in kilometers
export const calculateDistance = (
  startLat: number, startLng: number, 
  destLat: number, destLng: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (destLat - startLat) * Math.PI / 180;
  const dLng = (destLng - startLng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

// Generate points along a path between two coordinates
export const generateRoutePath = (
  startLat: number, startLng: number,
  destLat: number, destLng: number,
  pointsCount = 10
): Array<{latitude: number, longitude: number}> => {
  const points = [];
  
  for (let i = 0; i <= pointsCount; i++) {
    const fraction = i / pointsCount;
    
    // Simple linear interpolation between points
    // For a real app, you'd use a routing API
    const lat = startLat + fraction * (destLat - startLat);
    const lng = startLng + fraction * (destLng - startLng);
    
    points.push({ latitude: lat, longitude: lng });
  }
  
  return points;
};

// Get a human-readable direction from bearing
export const getDirectionFromBearing = (bearing: number): string => {
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

// Calculate the turn type based on bearing change
export const getTurnType = (bearingChange: number): string => {
  // Normalize bearing change to 0-360
  const normalizedChange = ((bearingChange % 360) + 360) % 360;
  
  if (normalizedChange < 20 || normalizedChange > 340) {
    return 'continue';
  } else if (normalizedChange >= 20 && normalizedChange < 60) {
    return 'slight right';
  } else if (normalizedChange >= 60 && normalizedChange < 120) {
    return 'right';
  } else if (normalizedChange >= 120 && normalizedChange < 150) {
    return 'sharp right';
  } else if (normalizedChange >= 150 && normalizedChange <= 210) {
    return 'u-turn';
  } else if (normalizedChange > 210 && normalizedChange <= 240) {
    return 'sharp left';
  } else if (normalizedChange > 240 && normalizedChange <= 300) {
    return 'left';
  } else {
    return 'slight left';
  }
};

// Generate a more realistic route with slight deviations
export const generateRealisticRoutePath = (
  startLat: number, startLng: number,
  destLat: number, destLng: number,
  pointsCount = 20
): Array<{latitude: number, longitude: number}> => {
  const points = [];
  
  // Base distance for calculating deviation
  const baseDistance = Math.sqrt(
    Math.pow(destLat - startLat, 2) + Math.pow(destLng - startLng, 2)
  );
  
  // Maximum deviation as a fraction of the total distance
  const maxDeviation = baseDistance * 0.05;
  
  for (let i = 0; i <= pointsCount; i++) {
    const fraction = i / pointsCount;
    
    // Basic linear interpolation
    let lat = startLat + fraction * (destLat - startLat);
    let lng = startLng + fraction * (destLng - startLng);
    
    // Add some randomness for middle points (not first or last)
    if (i > 0 && i < pointsCount) {
      // The deviation increases in the middle and decreases at the ends
      const deviationFactor = Math.sin(fraction * Math.PI);
      const latDeviation = (Math.random() - 0.5) * maxDeviation * deviationFactor;
      const lngDeviation = (Math.random() - 0.5) * maxDeviation * deviationFactor;
      
      lat += latDeviation;
      lng += lngDeviation;
    }
    
    points.push({ latitude: lat, longitude: lng });
  }
  
  return points;
};

// Format address for display
export const formatAddress = (address: LocationAddress): string => {
  const parts = [];
  
  if (address.name) parts.push(address.name);
  if (address.street) parts.push(address.street);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
};

// Filter locations by search query
export const filterLocations = (locations: LocationResult[], query: string): LocationResult[] => {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return locations.filter(location => {
    // Check name
    if (location.name.toLowerCase().includes(normalizedQuery)) return true;
    
    // Check address components
    if (location.address) {
      if (location.address.street?.toLowerCase().includes(normalizedQuery)) return true;
      if (location.address.district?.toLowerCase().includes(normalizedQuery)) return true;
      if (location.address.city?.toLowerCase().includes(normalizedQuery)) return true;
      if (location.address.state?.toLowerCase().includes(normalizedQuery)) return true;
      if (location.address.country?.toLowerCase().includes(normalizedQuery)) return true;
      if (location.address.postalCode?.toLowerCase().includes(normalizedQuery)) return true;
    }
    
    // Check category
    if (location.category?.toLowerCase().includes(normalizedQuery)) return true;
    
    // Check description
    if (location.description?.toLowerCase().includes(normalizedQuery)) return true;
    
    return false;
  });
};

// Types for location data
export interface LocationAddress {
  name?: string;
  street?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface LocationResult {
  id: string;
  name: string;
  description?: string;
  category?: string;
  address?: LocationAddress;
  latitude: number;
  longitude: number;
  isFavorite?: boolean;
}

export const getExpandedMockLocations = (): LocationResult[] => {
  return [
    // Universities
    {
      id: 'nyu',
      name: 'New York University (NYU)',
      category: 'University',
      description: 'Private research university',
      address: {
        street: '70 Washington Square South',
        district: 'Greenwich Village',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10012'
      },
      latitude: 40.7295,
      longitude: -73.9965
    },
    {
      id: 'columbia',
      name: 'Columbia University',
      category: 'University',
      description: 'Ivy League university',
      address: {
        street: '116th Street and Broadway',
        district: 'Morningside Heights',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10027'
      },
      latitude: 40.8075,
      longitude: -73.9626
    },
    
    // Shopping Malls
    {
      id: 'hudson-yards',
      name: 'The Shops at Hudson Yards',
      category: 'Mall',
      description: 'Luxury shopping center',
      address: {
        street: '20 Hudson Yards',
        district: 'Hudson Yards',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10001'
      },
      latitude: 40.7539,
      longitude: -74.0024
    },
    {
      id: 'westfield-wtc',
      name: 'Westfield World Trade Center',
      category: 'Mall',
      description: 'Shopping complex at One World Trade',
      address: {
        street: '185 Greenwich Street',
        district: 'Financial District',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10007'
      },
      latitude: 40.7117,
      longitude: -74.0125
    },
    
    // Notable Streets
    {
      id: 'fifth-ave',
      name: 'Fifth Avenue Shopping District',
      category: 'Street',
      description: 'Luxury shopping street',
      address: {
        street: 'Fifth Avenue',
        district: 'Midtown',
        city: 'New York',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.7636,
      longitude: -73.9738
    },
    {
      id: 'madison-ave',
      name: 'Madison Avenue',
      category: 'Street',
      description: 'High-end retail and business district',
      address: {
        street: 'Madison Avenue',
        district: 'Upper East Side',
        city: 'New York',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.7720,
      longitude: -73.9638
    },
    
    // Specific Buildings & Landmarks
    {
      id: 'one-wtc',
      name: 'One World Trade Center',
      category: 'Landmark',
      description: 'Tallest building in Western Hemisphere',
      address: {
        street: '285 Fulton Street',
        district: 'Financial District',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10007'
      },
      latitude: 40.7127,
      longitude: -74.0134
    },
    {
      id: 'chrysler',
      name: 'Chrysler Building',
      category: 'Landmark',
      description: 'Art Deco skyscraper',
      address: {
        street: '405 Lexington Avenue',
        district: 'Midtown East',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10174'
      },
      latitude: 40.7516,
      longitude: -73.9753
    },
    
    // Museums with Specific Addresses
    {
      id: 'moma',
      name: 'Museum of Modern Art (MoMA)',
      category: 'Museum',
      description: 'Modern and contemporary art museum',
      address: {
        street: '11 West 53rd Street',
        district: 'Midtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10019'
      },
      latitude: 40.7614,
      longitude: -73.9776
    },
    {
      id: 'guggenheim',
      name: 'Solomon R. Guggenheim Museum',
      category: 'Museum',
      description: 'Modern and contemporary art museum',
      address: {
        street: '1071 Fifth Avenue',
        district: 'Upper East Side',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10128'
      },
      latitude: 40.7830,
      longitude: -73.9590
    },
    
    // Hotels with Exact Locations
    {
      id: 'ritz-central-park',
      name: 'Ritz-Carlton Central Park',
      category: 'Hotel',
      description: 'Luxury hotel overlooking Central Park',
      address: {
        street: '50 Central Park South',
        district: 'Midtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10019'
      },
      latitude: 40.7651,
      longitude: -73.9746
    },
    {
      id: 'mandarin-oriental',
      name: 'Mandarin Oriental New York',
      category: 'Hotel',
      description: 'Luxury hotel at Columbus Circle',
      address: {
        street: '80 Columbus Circle',
        district: 'Upper West Side',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10023'
      },
      latitude: 40.7687,
      longitude: -73.9827
    },
    
    // Transportation Hubs
    {
      id: 'penn-station',
      name: 'Pennsylvania Station',
      category: 'Transit',
      description: 'Major rail station',
      address: {
        street: '234 West 31st Street',
        district: 'Midtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10001'
      },
      latitude: 40.7506,
      longitude: -73.9936
    },
    {
      id: 'port-authority',
      name: 'Port Authority Bus Terminal',
      category: 'Transit',
      description: 'Main gateway for buses',
      address: {
        street: '625 8th Avenue',
        district: 'Midtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10018'
      },
      latitude: 40.7571,
      longitude: -73.9917
    },
    
    // Parks with Specific Entrances
    {
      id: 'bryant-park',
      name: 'Bryant Park',
      category: 'Park',
      description: 'Public park behind NY Public Library',
      address: {
        street: '42nd Street and 6th Avenue',
        district: 'Midtown',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10018'
      },
      latitude: 40.7536,
      longitude: -73.9832
    },
    // Major Cities
    {
      id: 'ny-city',
      name: 'New York City',
      category: 'City',
      description: 'The Big Apple',
      address: {
        city: 'New York',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.7128,
      longitude: -74.006
    },
    {
      id: 'london-city',
      name: 'London',
      category: 'City',
      address: {
        city: 'London',
        country: 'United Kingdom'
      },
      latitude: 51.5074,
      longitude: -0.1278
    },
    
    // Points of Interest
    {
      id: 'empire-state',
      name: 'Empire State Building',
      category: 'Landmark',
      description: 'Iconic skyscraper',
      address: {
        street: '350 Fifth Avenue',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10118'
      },
      latitude: 40.7484,
      longitude: -73.9857
    },
    {
      id: 'central-park',
      name: 'Central Park',
      category: 'Park',
      description: 'Urban park in Manhattan',
      address: {
        city: 'New York',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.7812,
      longitude: -73.9665
    },
    
    // Restaurants
    {
      id: 'katz-deli',
      name: "Katz's Delicatessen",
      category: 'Restaurant',
      description: 'Famous Jewish deli',
      address: {
        street: '205 E Houston St',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10002'
      },
      latitude: 40.7223,
      longitude: -73.9874
    },
    
    // Hotels
    {
      id: 'plaza-hotel',
      name: 'The Plaza Hotel',
      category: 'Hotel',
      description: 'Historic luxury hotel',
      address: {
        street: '768 Fifth Avenue',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10019'
      },
      latitude: 40.7645,
      longitude: -73.9741
    },
    
    // Transportation
    {
      id: 'grand-central',
      name: 'Grand Central Terminal',
      category: 'Transit',
      description: 'Historic train terminal',
      address: {
        street: '89 E 42nd St',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10017'
      },
      latitude: 40.7527,
      longitude: -73.9772
    },
    
    // Shopping
    {
      id: 'times-square',
      name: 'Times Square',
      category: 'Entertainment',
      description: 'Major commercial intersection',
      address: {
        district: 'Manhattan',
        city: 'New York',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.7580,
      longitude: -73.9855
    },
    
    // Museums
    {
      id: 'met-museum',
      name: 'Metropolitan Museum of Art',
      category: 'Museum',
      description: 'Art museum',
      address: {
        street: '1000 Fifth Avenue',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10028'
      },
      latitude: 40.7794,
      longitude: -73.9632
    },
    
    // Airports
    {
      id: 'jfk-airport',
      name: 'John F. Kennedy International Airport',
      category: 'Airport',
      description: 'International airport',
      address: {
        city: 'Queens',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.6413,
      longitude: -73.7781
    },
    
    // International Locations
    {
      id: 'eiffel-tower',
      name: 'Eiffel Tower',
      category: 'Landmark',
      description: 'Iconic Paris landmark',
      address: {
        street: 'Champ de Mars',
        city: 'Paris',
        country: 'France',
        postalCode: '75007'
      },
      latitude: 48.8584,
      longitude: 2.2945
    },
    
    // Neighborhoods
    {
      id: 'brooklyn-heights',
      name: 'Brooklyn Heights',
      category: 'Neighborhood',
      description: 'Historic neighborhood',
      address: {
        district: 'Brooklyn',
        city: 'New York',
        state: 'New York',
        country: 'USA'
      },
      latitude: 40.6936,
      longitude: -73.9930
    },
    
    // Street Addresses
    {
      id: 'broadway-1500',
      name: '1500 Broadway',
      category: 'Address',
      address: {
        street: '1500 Broadway',
        district: 'Times Square',
        city: 'New York',
        state: 'New York',
        country: 'USA',
        postalCode: '10036'
      },
      latitude: 40.7570,
      longitude: -73.9866
    },
    
    // More cities worldwide
    {
      id: 'tokyo-city',
      name: 'Tokyo',
      category: 'City',
      address: {
        city: 'Tokyo',
        country: 'Japan'
      },
      latitude: 35.6762,
      longitude: 139.6503
    },
    {
      id: 'sydney-city',
      name: 'Sydney',
      category: 'City',
      address: {
        city: 'Sydney',
        country: 'Australia'
      },
      latitude: -33.8688,
      longitude: 151.2093
    },
    {
      id: 'paris-city',
      name: 'Paris',
      category: 'City',
      address: {
        city: 'Paris',
        country: 'France'
      },
      latitude: 48.8566,
      longitude: 2.3522
    }
  ];
};
