import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Region } from 'react-native-maps';
import { CrimeData } from '@/utils/csvReader';
import { LocationSpeed } from '@/hooks/useLocationTracking';
import { sendDangerNotification } from '@/utils/notifications';
import { UserSettings } from '@/hooks/useUserSettings';

interface HeatmapProps {
  data: CrimeData[];
  radius?: number;
  maxOpacity?: number;
  transitionPoint?: number;
  userLocation: LocationSpeed | null;
  settings: UserSettings;
}

const DEFAULT_RADIUS = 2000; // 2km
const DEFAULT_MAX_OPACITY = 0.7;
const DEFAULT_TRANSITION_POINT = 0.3;

const INITIAL_REGION: Region = {
  latitude: -22.9068,
  longitude: -43.1729,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  radius = DEFAULT_RADIUS,
  maxOpacity = DEFAULT_MAX_OPACITY,
  transitionPoint = DEFAULT_TRANSITION_POINT,
  userLocation,
  settings,
}) => {
  const mapRef = useRef<MapView>(null);
  const lastCheckedRegion = useRef<string | null>(null);

  const getHeatmapColor = (intensity: number) => {
    if (intensity <= transitionPoint) {
      // Transparente para amarelo
      const alpha = (intensity / transitionPoint) * maxOpacity;
      return `rgba(255, 255, 0, ${alpha})`;
    } else {
      // Amarelo para vermelho
      const ratio = (intensity - transitionPoint) / (1 - transitionPoint);
      return `rgba(255, ${255 * (1 - ratio)}, 0, ${maxOpacity})`;
    }
  };

  useEffect(() => {
    if (!userLocation || userLocation.isMovingFast || !settings) return;

    const checkUserLocation = async () => {
      const { latitude, longitude } = userLocation.location.coords;

      // Encontra a região mais próxima
      const nearestRegion = data.reduce((nearest, current) => {
        if (!current.latitude || !current.longitude || !current.heatmapIntensity) return nearest;

        const distance = Math.sqrt(
          Math.pow(current.latitude - latitude, 2) + 
          Math.pow(current.longitude - longitude, 2)
        );

        if (!nearest || distance < nearest.distance) {
          return { region: current, distance };
        }
        return nearest;
      }, null as { region: CrimeData; distance: number } | null);

      if (nearestRegion && 
          nearestRegion.distance < 0.01 && // Aproximadamente 1km
          nearestRegion.region.heatmapIntensity! >= (settings.notificationThreshold / 100) &&
          lastCheckedRegion.current !== nearestRegion.region["unidadeTerritorial"]) {
        
        await sendDangerNotification(
          nearestRegion.region["unidadeTerritorial"],
          nearestRegion.region.heatmapIntensity! * 100,
          settings.vibrationEnabled && nearestRegion.region.heatmapIntensity! >= 0.9
        );

        lastCheckedRegion.current = nearestRegion.region["unidadeTerritorial"];
      }
    };

    checkUserLocation();
  }, [userLocation, data, settings]);

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {data.map((item) => {
          if (!item.latitude || !item.longitude || !item.heatmapIntensity) {
            return null;
          }

          return (
            <Circle
              key={item.CISP}
              center={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              radius={radius}
              fillColor={getHeatmapColor(item.heatmapIntensity)}
              strokeColor="transparent"
            />
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
}); 