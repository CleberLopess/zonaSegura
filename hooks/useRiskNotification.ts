import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/contexts/SettingsContext';
import { useLocation } from '@/hooks/useLocation';
import { setupNotifications } from '@/utils/notifications';
import * as Location from 'expo-location';
import { parsePercentual } from '@/utils/csvReader';

interface Point {
  latitude: number;
  longitude: number;
  percentual: string;
}

export const useRiskNotification = (crimeData: Point[]) => {
  const { settings } = useSettings();
  const { userLocation } = useLocation();
  const lastNotificationTime = useRef<number>(0);
  const isInRiskArea = useRef<boolean>(false);

  useEffect(() => {
    setupNotifications();
  }, []);

  const checkRiskArea = async (location: Location.LocationObject) => {
    try {
      const riskPoints = crimeData;
      
      if (!riskPoints || riskPoints.length === 0) {
        return { isInRiskArea: false, riskPercentage: 0 };
      }

      // Calcula distância para cada ponto
      const pointsWithDistance = riskPoints.map(point => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          point.latitude,
          point.longitude
        );
        
        const percentual = parsePercentual(point.percentual);
        
        return {
          ...point,
          distance,
          percentual
        };
      });

      // Filtra pontos dentro do raio
      const pointsInRadius = pointsWithDistance.filter(
        point => point.distance <= settings.radius
      );

      if (pointsInRadius.length === 0) {
        return { isInRiskArea: false, riskPercentage: 0 };
      }

      // Calcula média ponderada dos percentuais
      const totalDistance = pointsInRadius.reduce((sum, point) => sum + point.distance, 0);
      const weightedSum = pointsInRadius.reduce((sum, point) => {
        const weight = 1 - (point.distance / settings.radius);
        return sum + (point.percentual * weight);
      }, 0);

      const riskPercentage = weightedSum / pointsInRadius.length;
      return {
        isInRiskArea: riskPercentage >= settings.minRiskPercentage,
        riskPercentage
      };
    } catch (error) {
      console.error('Erro ao verificar área de risco:', error);
      return { isInRiskArea: false, riskPercentage: 0 };
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distância em metros
  };

  const sendNotification = async (riskPercentage: number, forceSend: boolean = false) => {
    if (!settings?.notificationsEnabled) return;

    const now = Date.now();
    const interval = settings.notificationInterval === 'minute' ? 60000 : 
                    settings.notificationInterval === 'hourly' ? 3600000 : 
                    86400000; // 1 min, 1 hora ou 1 dia

    // Se não for forçado e ainda não passou o intervalo, não envia
    if (!forceSend && now - lastNotificationTime.current < interval) {
      return;
    }

    try {
      // Vibrar de acordo com as configurações
      if (settings.vibrationEnabled) {
        switch (settings.vibrationPattern) {
          case 'short':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'long':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'double':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await new Promise(resolve => setTimeout(resolve, 200));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'off':
          default:
            // Não vibra
            break;
        }
      }

      // Enviar notificação
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Área de Risco Detectada",
          body: `Você está em uma área com risco de ${riskPercentage.toFixed(2)}%. Tome cuidado!`,
          data: { 
            type: 'risk_alert', 
            riskPercentage,
            timestamp: new Date().toISOString()
          },
          sound: true,
          priority: 'high',
        },
        trigger: null,
      });

      lastNotificationTime.current = now;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  // Verificar risco quando a localização muda
  useEffect(() => {
    if (!userLocation || !settings) return;

    const checkRisk = async () => {
      const newRiskStatus = await checkRiskArea(userLocation);

      // Enviar notificação apenas quando entrar em uma área de risco
      if (newRiskStatus.isInRiskArea && !isInRiskArea.current) {
        sendNotification(newRiskStatus.riskPercentage, true); // Força envio ao entrar em área de risco
      }

      isInRiskArea.current = newRiskStatus.isInRiskArea;
    };

    checkRisk();
  }, [userLocation, crimeData, settings?.radius, settings?.minRiskPercentage]);

  // Verificar risco quando as configurações mudam
  useEffect(() => {
    if (!userLocation || !settings) return;

    const checkRisk = async () => {
      const newRiskStatus = await checkRiskArea(userLocation);

      // Se estiver em área de risco, envia notificação imediatamente
      if (newRiskStatus.isInRiskArea) {
        sendNotification(newRiskStatus.riskPercentage, true); // Força envio após mudança de configurações
      }

      isInRiskArea.current = newRiskStatus.isInRiskArea;
    };

    checkRisk();
  }, [settings?.notificationInterval, settings?.minRiskPercentage]);
}; 