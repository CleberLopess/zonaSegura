import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import MapView, { Circle, Callout, Marker } from 'react-native-maps';
import { readData } from '../utils/csvReader';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FAB } from 'react-native-paper';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    radius: 500,
    notificationInterval: 'hourly',
    minRiskPercentage: 30
  });
  const router = useRouter();
  const params = useLocalSearchParams();

  const radius = params.radius ? Number(params.radius) : settings.radius;
  const intensity = params.intensity ? Number(params.intensity) : 0.6;
  const blur = params.blur ? Number(params.blur) : 0.5;

  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await readData();
        setData(result);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permissão para acessar localização foi negada');
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      } catch (error) {
        console.error('Erro ao obter localização:', error);
      }
    })();
  }, []);

  // Usa useFocusEffect para recarregar as configurações quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const getColor = (weight: number) => {
    // Cores do mais seguro para o mais perigoso
    const colors = [
      [121, 188, 106], // Verde claro - Mais seguro
      [187, 207, 76],  // Verde amarelado
      [238, 194, 11],  // Amarelo
      [242, 147, 5],   // Laranja
      [229, 0, 0]      // Vermelho - Mais perigoso
    ];
    
    // Ajusta o índice para usar todo o espectro de cores
    const index = Math.min(Math.floor(weight * (colors.length - 1)), colors.length - 1);
    const [r, g, b] = colors[index];
    
    // Opacidade baseada no peso, com mínimo de 0.5 para garantir visibilidade
    const opacity = 0.5 + (weight * 0.5);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const getRadius = (weight: number) => {
    // Usa o raio das configurações como base
    const baseRadius = settings.radius;
    // Aumenta o raio proporcionalmente ao peso, com mínimo de 100m
    return Math.max(100, baseRadius * (1 + weight));
  };

  const shouldNotify = (weight: number) => {
    return weight >= (settings.minRiskPercentage / 100);
  };

  const getColorLegend = () => {
    const colors = [
      { color: [121, 188, 106], label: '0-20% - Baixo Risco' },
      { color: [187, 207, 76], label: '20-40% - Risco Moderado' },
      { color: [238, 194, 11], label: '40-60% - Risco Médio' },
      { color: [242, 147, 5], label: '60-80% - Risco Alto' },
      { color: [229, 0, 0], label: '80-100% - Risco Muito Alto' }
    ];

    return (
      <ScrollView horizontal style={styles.legendContainer}>
        {colors.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: `rgba(${item.color.join(',')}, 0.7)` }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {getColorLegend()}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -22.9068,
          longitude: -43.1729,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {!loading && data.map((item, index) => {
          const weight = item.heatmapIntensity || 0;
          return (
            <React.Fragment key={index}>
              <Circle
                center={{
                  latitude: item.latitude || 0,
                  longitude: item.longitude || 0,
                }}
                radius={getRadius(weight)}
                fillColor={getColor(weight)}
                strokeWidth={0}
              />
              {settings.notificationsEnabled && shouldNotify(weight) && (
                <Marker
                  coordinate={{
                    latitude: item.latitude || 0,
                    longitude: item.longitude || 0,
                  }}
                  opacity={0}
                >
                  <Callout>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>{item.unidadeTerritorial}</Text>
                      <Text>Percentual Original: {item.percentualOriginal}</Text>
                      <Text>Índice de Risco: {item.percentual}</Text>
                    </View>
                  </Callout>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            title="Sua Localização"
            description="Você está aqui"
            pinColor="blue"
          />
        )}
      </MapView>
      
      <FAB
        icon="cog"
        style={styles.fab}
        onPress={() => router.push('/config')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  callout: {
    padding: 10,
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  legendContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
}); 