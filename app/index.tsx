import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Circle, Callout, Marker } from 'react-native-maps';
import { readData } from '../utils/csvReader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FAB } from 'react-native-paper';
import * as Location from 'expo-location';

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  const radius = params.radius ? Number(params.radius) : 500;
  const intensity = params.intensity ? Number(params.intensity) : 0.6;
  const blur = params.blur ? Number(params.blur) : 0.5;

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
    // Usa uma função exponencial para aumentar o contraste
    const adjustedWeight = Math.pow(weight, 0.5); // Ajusta a curva de distribuição
    const index = Math.min(Math.floor(adjustedWeight * colors.length), colors.length - 1);
    const [r, g, b] = colors[index];
    
    // Aumenta a opacidade para cores mais intensas
    const opacity = intensity * (0.5 + (weight * 0.5));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <View style={styles.container}>
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
        {!loading && data.map((item, index) => (
          <React.Fragment key={index}>
            <Circle
              center={{
                latitude: item.latitude || 0,
                longitude: item.longitude || 0,
              }}
              radius={radius}
              fillColor={getColor(item.heatmapIntensity || 0)}
              strokeWidth={0}
            />
            <Marker
              coordinate={{
                latitude: item.latitude || 0,
                longitude: item.longitude || 0,
              }}
              opacity={0}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{item["unidadeTerritorial"]}</Text>
                  <Text>Percentual Original: {item.percentualOriginal}</Text>
                  <Text>Índice de Risco: {item.Percentual}</Text>
                </View>
              </Callout>
            </Marker>
          </React.Fragment>
        ))}

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
}); 