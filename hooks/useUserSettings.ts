import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  updateInterval: number; // em milissegundos
  notificationThreshold: number; // percentual de risco para notificar
  vibrationEnabled: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  updateInterval: 60000, // 1 minuto
  notificationThreshold: 80, // 80%
  vibrationEnabled: true,
};

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('userSettings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem('userSettings', JSON.stringify(updated));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.removeItem('userSettings');
      return true;
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
  };
}; 