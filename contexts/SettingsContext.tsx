import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Settings {
  notificationsEnabled: boolean;
  notificationType: 'notification' | 'vibration' | 'both';
  vibrationPattern: 'off' | 'short' | 'long' | 'double';
  radius: number;
  notificationInterval: 'minute' | 'hourly' | 'daily';
  minRiskPercentage: number;
  vibrationEnabled: boolean;
}

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  notificationType: 'both',
  vibrationPattern: 'off',
  radius: 500,
  notificationInterval: 'hourly',
  minRiskPercentage: 30,
  vibrationEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
      } else {
        await AsyncStorage.setItem('settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem('settings', JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 