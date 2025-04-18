import { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import MapView, { Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { readCSV } from "@/utils/csvReader";
import { calculateHeatmap, HeatmapData } from "@/utils/heatmapCalculator";
import { isPointInRegion } from "@/utils/locationUtils";

const mapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#242f3e",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#746855",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#242f3e",
      },
    ],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#d59563",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#d59563",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#263c3f",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#6b9a76",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#38414e",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#212a37",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9ca5b3",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#746855",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#1f2835",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#f3d19c",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [
      {
        color: "#2f3948",
      },
    ],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#d59563",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#17263c",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#515c6d",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#17263c",
      },
    ],
  },
];

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
      const notificationSupported = await configureNotifications();
      setNotificationsEnabled(notificationSupported);

      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== "granted") {
        setErrorMsg("Permissão de localização negada");
        return;
      }

      try {
        const data = await readCSV("assets/data/BaseMunicipioTaxaMes.csv");
        if (data && data.length > 0) {
          const heatmap = calculateHeatmap(data);
          console.log("Dados do heatmap:", heatmap);
          setHeatmapData(heatmap);
        } else {
          setErrorMsg("Não foi possível carregar os dados de criminalidade");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErrorMsg("Erro ao carregar dados de criminalidade");
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000,
          distanceInterval: 100,
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
    const now = Date.now();
    if (now - lastNotificationTime < 5 * 60 * 1000) return;

    if (userLocation.coords.speed && userLocation.coords.speed > 5.5) return;

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
        5000
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
        return "rgba(255,0,0,0.6)"; // Vermelho mais forte e mais opaco
      case "medium":
        return "rgba(255,165,0,0.6)"; // Laranja mais forte e mais opaco
      default:
        return "rgba(0,255,0,0.6)"; // Verde mais forte e mais opaco
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
        customMapStyle={mapStyle}
      >
        {heatmapData.map((region, index) => {
          console.log(`Renderizando círculo ${index}:`, {
            latitude: region.latitude,
            longitude: region.longitude,
            alertLevel: region.alertLevel,
          });
          return (
            <Circle
              key={index}
              center={{
                latitude: region.latitude,
                longitude: region.longitude,
              }}
              radius={15000} // Aumentado de 5000 para 15000 metros
              fillColor={getRegionColor(region.alertLevel)}
              strokeColor={getRegionColor(region.alertLevel)}
              strokeWidth={3}
              zIndex={
                region.alertLevel === "high"
                  ? 3
                  : region.alertLevel === "medium"
                  ? 2
                  : 1
              }
            />
          );
        })}
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
