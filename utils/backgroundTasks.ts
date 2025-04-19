import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readData } from './csvReader';

// Configurar o comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Definir a tarefa de background
export const BACKGROUND_FETCH_TASK = 'background-fetch-task';

// Função para calcular distância entre dois pontos
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Distância em metros
};

// Registrar a tarefa
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const savedSettings = await AsyncStorage.getItem('settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.notificationsEnabled) {
        const data = await readData();
        const location = await Location.getCurrentPositionAsync({});
        
        for (const item of data) {
          // Calcular distância entre usuário e ponto de risco
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            item.latitude || 0,
            item.longitude || 0
          );

          // Só considera o risco se estiver dentro do raio configurado
          if (distance <= settings.radius) {
            const weight = item.heatmapIntensity || 0;
            if (weight >= (settings.minRiskPercentage / 100)) {
              if (settings.notificationType === 'notification' || settings.notificationType === 'both') {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: 'Alerta de Risco',
                    body: `Risco detectado: ${Math.round(weight * 100)}% (${Math.round(distance)}m)`,
                    data: { riskPercentage: weight * 100 },
                  },
                  trigger: null,
                });
              }
              break;
            }
          }
        }
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Erro na tarefa de background:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundTask = async (notificationInterval: string) => {
  try {
    const getIntervalSeconds = () => {
      switch (notificationInterval) {
        case 'minute': return 60; // 1 minuto
        case 'hourly': return 3600; // 1 hora
        case 'daily': return 86400; // 1 dia
        default: return 3600;
      }
    };

    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: getIntervalSeconds(),
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    console.error('Erro ao registrar tarefa de background:', error);
  }
}; 