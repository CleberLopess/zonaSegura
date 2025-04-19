import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  notificationsEnabled: boolean;
  updateInterval: number; // em milissegundos
  notificationThreshold: number; // percentual de risco para notificar
  vibrationEnabled: boolean;
  radius: number; // raio em metros
  notificationInterval: string; // 'minute', 'hourly', 'daily'
  minRiskPercentage: number; // percentual mínimo de risco
}

export const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  updateInterval: 60000, // 1 minuto
  notificationThreshold: 80, // 80%
  vibrationEnabled: true,
  radius: 500, // 500 metros
  notificationInterval: 'hourly',
  minRiskPercentage: 30, // 30%
};

export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // Garantir que todas as propriedades necessárias existam
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsedSettings
        });
      } else {
        // Se não houver configurações salvas, salvar as padrão
        await AsyncStorage.setItem('userSettings', JSON.stringify(DEFAULT_SETTINGS));
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      // Em caso de erro, manter as configurações padrão
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Garantir que o AsyncStorage esteja pronto antes de carregar as configurações
    const initializeSettings = async () => {
      try {
        await AsyncStorage.clear(); // Limpar qualquer configuração antiga
        await loadSettings();
      } catch (error) {
        console.error('Erro ao inicializar configurações:', error);
        setSettings(DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = {
        ...settings,
        ...newSettings
      };
      await AsyncStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
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
    settings: settings || DEFAULT_SETTINGS, // Garantir que nunca retorne undefined
    isLoading,
    updateSettings,
    resetSettings,
    loadSettings,
  };
}; 