import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useSettings } from '@/contexts/SettingsContext';

export const useLocation = () => {
  const { settings } = useSettings();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permissão de localização negada');
        return;
      }

      try {
        // Obter localização inicial
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        setUserLocation(initialLocation);

        // Configurar atualização periódica baseada nas configurações
        const interval = getIntervalInMilliseconds(settings?.notificationInterval || '1min');
        
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: interval,
            distanceInterval: 10,
          },
          (newLocation) => {
            setUserLocation(newLocation);
          }
        );
      } catch (error) {
        setError('Erro ao obter localização');
        console.error('Erro ao obter localização:', error);
      }
    };

    startTracking();
    return () => {
      subscription?.remove();
    };
  }, [settings?.notificationInterval]);

  return { userLocation, error };
};

const getIntervalInMilliseconds = (interval: string): number => {
  switch (interval) {
    case '1min':
      return 60000; // 1 minuto
    case '5min':
      return 300000; // 5 minutos
    case '15min':
      return 900000; // 15 minutos
    case '30min':
      return 1800000; // 30 minutos
    case '1hr':
      return 3600000; // 1 hora
    case '3hr':
      return 10800000; // 3 horas
    case '6hr':
      return 21600000; // 6 horas
    case '12hr':
      return 43200000; // 12 horas
    case '1day':
      return 86400000; // 1 dia
    default:
      return 60000; // padrão 1 minuto
  }
}; 