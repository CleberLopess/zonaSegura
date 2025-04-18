import { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import MapView, { Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { readCSV } from "@/utils/csvReader";
import { calculateHeatmap, HeatmapData } from "@/utils/heatmapCalculator";
import { isPointInRegion } from "@/utils/locationUtils";

// Configurar comportamento das notificações apenas se o dispositivo suportar
async function configureNotifications() {
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        return false;
      }
    }

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldVibrate: true,
      }),
    });

    return true;
  }
  return false;
}

export default function HeatmapScreen() {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const setupPermissions = async () => {
      // Configurar notificações
      const notificationSupported = await configureNotifications();
      setNotificationsEnabled(notificationSupported);

      // Permissão para localização
      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== "granted") {
        setErrorMsg("Permissão de localização negada");
        return;
      }

      // Carregar dados do CSV e calcular zonas de risco
      try {
        const data = await readCSV("assets/data/BaseMunicipioTaxaMes.csv");
        if (data && data.length > 0) {
          const heatmap = calculateHeatmap(data);
          setHeatmapData(heatmap);
        } else {
          setErrorMsg("Não foi possível carregar os dados de criminalidade");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErrorMsg("Erro ao carregar dados de criminalidade");
      }

      // Iniciar monitoramento de localização
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // 1 minuto
          distanceInterval: 100, // 100 metros
        },
        (newLocation) => {
          setLocation(newLocation);
          if (notificationSupported) {
            checkDangerZone(newLocation);
          }
        }
      );

      return () => {
        locationSubscription.remove();
      };
    };

    setupPermissions();
  }, []);

  const checkDangerZone = async (userLocation: Location.LocationObject) => {
    // Evitar múltiplas notificações em um curto período (5 minutos)
    const now = Date.now();
    if (now - lastNotificationTime < 5 * 60 * 1000) return;

    // Verificar velocidade (ignorar se estiver em movimento rápido)
    if (userLocation.coords.speed && userLocation.coords.speed > 5.5) return; // 5.5 m/s ≈ 20 km/h

    // Encontrar região mais próxima e seu nível de risco
    const nearestRegion = heatmapData.find((region) =>
      isPointInRegion(
        {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        },
        {
          latitude: region.latitude,
          longitude: region.longitude,
        },
        5000 // raio em metros
      )
    );

    if (nearestRegion) {
      let title, body;

      if (nearestRegion.alertLevel === "high") {
        title = "⚠️ ALERTA DE RISCO ALTO!";
        body = `Você está em ${nearestRegion.regiao}, uma área com alto índice de criminalidade.\nFique atento ao seu redor!`;
      } else if (nearestRegion.alertLevel === "medium") {
        title = "⚠️ Alerta de Risco Moderado";
        body = `Você está em ${nearestRegion.regiao}, uma área com índice médio de criminalidade.\nMantenha-se atento.`;
      }

      if (title && body) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: "high",
            vibrate: [0, 250, 250, 250],
          },
          trigger: null,
        });

        setLastNotificationTime(now);
      }
    }
  };

  const getRegionColor = (alertLevel: string) => {
    switch (alertLevel) {
      case "high":
        return "rgba(255,0,0,0.3)";
      case "medium":
        return "rgba(255,255,0,0.3)";
      default:
        return "rgba(0,255,0,0.3)";
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: -22.9068,
          longitude: -43.1729,
          latitudeDelta: 0.9,
          longitudeDelta: 0.9,
        }}
        showsUserLocation
        showsMyLocationButton
        showsCompass
      >
        {heatmapData.map((region, index) => (
          <Circle
            key={index}
            center={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            radius={5000}
            fillColor={getRegionColor(region.alertLevel)}
            strokeColor={getRegionColor(region.alertLevel)}
            strokeWidth={2}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    margin: 20,
  },
});
