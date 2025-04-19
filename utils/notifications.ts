import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const setupNotifications = async () => {
  if (!Device.isDevice) {
    return false;
  }

  // Configurar o comportamento das notificações
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Solicitar permissão para notificações
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Permissão para notificações negada');
    return;
  }

  // Configurar o canal de notificação para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
};

let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutos

export const sendDangerNotification = async (
  region: string,
  riskLevel: number,
  shouldVibrate: boolean = false
) => {
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return; // Evita spam de notificações
  }

  if (shouldVibrate) {
    try {
      await Haptics.notificationAsync(
        riskLevel >= 90
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.error('Erro ao vibrar:', error);
    }
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: riskLevel >= 90 ? '⚠️ ALERTA DE RISCO CRÍTICO!' : '⚠️ ALERTA DE RISCO',
        body: `Você está em ${region}, uma área com ${riskLevel.toFixed(0)}% de risco.\nFique atento!`,
        data: { region, riskLevel },
        sound: true,
        priority: 'high',
      },
      trigger: null,
    });

    lastNotificationTime = now;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
}; 