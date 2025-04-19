import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Vibration } from 'react-native';
import MapView, { Circle, Callout, Marker } from 'react-native-maps';
import { readData } from '../utils/csvReader';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FAB } from 'react-native-paper';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    radius: 500,
    notificationInterval: 'hourly',
    minRiskPercentage: 30,
    notificationType: 'both',
    vibrationPattern: 'default'
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

  // Solicitar permissão para notificações
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão para notificações negada');
      }
    };

    requestPermissions();
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
      { color: [121, 188, 106], label: '0-20%' },
      { color: [187, 207, 76], label: '20-40%' },
      { color: [238, 194, 11], label: '40-60%' },
      { color: [242, 147, 5], label: '60-80%' },
      { color: [229, 0, 0], label: '80-100%' }
    ];

    return (
      <View style={styles.legendContainer}>
        {colors.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={styles.legendColorContainer}>
              <View style={[styles.legendColor, { backgroundColor: `rgba(${item.color.join(',')}, 0.7)` }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const handleNotification = useCallback(async (weight: number) => {
    if (!settings.notificationsEnabled) return;

    // O peso já está em porcentagem (0-100)
    const riskPercentage = weight;
    
    // Verificando se o risco está acima do percentual mínimo configurado
    if (riskPercentage < settings.minRiskPercentage) return;

    console.log('Risco detectado:', riskPercentage, '%');

    // Lógica de notificação baseada nas configurações
    if (settings.notificationType === 'notification' || settings.notificationType === 'both') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Alerta de Risco',
          body: `Risco detectado: ${Math.round(riskPercentage)}%`,
          data: { riskPercentage },
        },
        trigger: null, // Notificação imediata
      });
      return true; // Retorna true para indicar que uma notificação foi enviada
    }

    if (settings.notificationType === 'vibration' || settings.notificationType === 'both') {
      if (settings.vibrationPattern !== 'off') {
        const patterns = {
          short: [500, 300],
          long: [500, 1300],
          double: [500, 1200, 500, 200, 500, 1200]
        };

        Vibration.vibrate(patterns[settings.vibrationPattern as keyof typeof patterns]);
      }
      return true; // Retorna true para indicar que uma vibração foi enviada
    }

    return false;
  }, [settings]);

  const checkAndNotify = async () => {
    if (userLocation) {
      for (const item of data) {
        const weight = item.heatmapIntensity || 0;
        const notificationSent = await handleNotification(weight);
        if (notificationSent) break; // Para após enviar a primeira notificação
      }
    }
  };

  // Função para verificar notificações periodicamente
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (settings.notificationsEnabled) {
      const getIntervalMs = () => {
        switch (settings.notificationInterval) {
          case 'minute': return 60000; // 1 minuto
          case 'hourly': return 3600000; // 1 hora
          case 'daily': return 86400000; // 1 dia
          default: return 3600000;
        }
      };

      // Verifica imediatamente ao carregar
      checkAndNotify();

      // Configura o intervalo para verificações periódicas
      interval = setInterval(checkAndNotify, getIntervalMs());
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings, userLocation, data, handleNotification]);

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
    top: 70,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 2,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'column',
    maxWidth: 200,
    zIndex: 1,
  },
  legendItem: {
    marginBottom: 10,
  },
  legendColorContainer: {
    alignItems: 'center',
    gap: 5,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 15,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
}); 