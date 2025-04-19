import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';

export const setupNotifications = async () => {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
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