import * as Location from 'expo-location';
import { useState, useEffect } from 'react';

export interface LocationSpeed {
  location: Location.LocationObject;
  isMovingFast: boolean;
}

export const useLocationTracking = (updateInterval: number) => {
  const [location, setLocation] = useState<LocationSpeed | null>(null);
  
  const isMovingTooFast = (speed: number) => {
    // Velocidade em m/s (13.89 m/s = 50 km/h)
    return speed > 13.89;
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permissão de localização negada');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: updateInterval,
          distanceInterval: 10, // Atualiza a cada 10 metros
        },
        (newLocation) => {
          setLocation({
            location: newLocation,
            isMovingFast: isMovingTooFast(newLocation.coords.speed || 0)
          });
        }
      );
    };

    startTracking();
    return () => {
      subscription?.remove();
    };
  }, [updateInterval]);

  return location;
}; 