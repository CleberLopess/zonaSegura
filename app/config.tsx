import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Switch, SegmentedButtons, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConfigScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationType, setNotificationType] = useState('both'); // 'notification', 'vibration', 'both'
  const [vibrationPattern, setVibrationPattern] = useState('off'); // 'off', 'short', 'long', 'double'
  const [radius, setRadius] = useState(500);
  const [notificationInterval, setNotificationInterval] = useState('hourly');
  const [minRiskPercentage, setMinRiskPercentage] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  const radiusOptions = [
    { value: '300', label: '300m' },
    { value: '400', label: '400m' },
    { value: '500', label: '500m' },
    { value: '1000', label: '1km' },
    { value: '2000', label: '2km' }
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setNotificationsEnabled(settings.notificationsEnabled);
          setNotificationType(settings.notificationType || 'both');
          setVibrationPattern(settings.vibrationPattern || 'off');
          setRadius(settings.radius);
          setNotificationInterval(settings.notificationInterval);
          setMinRiskPercentage(settings.minRiskPercentage);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const settings = {
        notificationsEnabled,
        notificationType,
        vibrationPattern,
        radius,
        notificationInterval,
        minRiskPercentage
      };
      
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
      router.back();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const testVibration = (pattern: string) => {
    if (pattern === 'off') return;
    
    const patterns = {
      short: [500, 300], // Vibração curta
      long: [500, 1300], // Vibração longa
      double: [500, 1200, 500, 200, 500, 1200] // Vibração forte
    };

    Vibration.vibrate(patterns[pattern as keyof typeof patterns]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Configurações de Notificação</Text>
        
        <View style={styles.row}>
          <Text>Ativar Alertas</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </View>

        {notificationsEnabled && (
          <>
            <Text style={styles.subtitle}>Tipo de Alerta</Text>
            <SegmentedButtons
              value={notificationType}
              onValueChange={setNotificationType}
              buttons={[
                { value: 'notification', label: 'Notificação' },
                { value: 'vibration', label: 'Vibração' },
                { value: 'both', label: 'Ambos' }
              ]}
            />

            {(notificationType === 'vibration' || notificationType === 'both') && (
              <>
                <Text style={styles.subtitle}>Padrão de Vibração</Text>
                <SegmentedButtons
                  value={vibrationPattern}
                  onValueChange={(value) => {
                    setVibrationPattern(value);
                    testVibration(value);
                  }}
                  buttons={[
                    { value: 'off', label: 'Desligar' },
                    { value: 'short', label: 'Curta' },
                    { value: 'long', label: 'Longa' },
                    { value: 'double', label: 'Forte' },
                  ]}
                />
              </>
            )}

            <Text style={styles.subtitle}>Raio de Alerta</Text>
            <SegmentedButtons
              value={radius.toString()}
              onValueChange={(value) => setRadius(Number(value))}
              buttons={radiusOptions}
            />

            <Text style={styles.subtitle}>Percentual Mínimo de Risco</Text>
            <SegmentedButtons
              value={minRiskPercentage.toString()}
              onValueChange={(value) => setMinRiskPercentage(Number(value))}
              buttons={[
                { value: '0', label: '0%' },
                { value: '30', label: '30%' },
                { value: '50', label: '50%' },
                { value: '70', label: '70%' },
                { value: '90', label: '90%' }
              ]}
            />

            <Text style={styles.subtitle}>Intervalo de Notificação</Text>
            <SegmentedButtons
              value={notificationInterval}
              onValueChange={setNotificationInterval}
              buttons={[
                { value: 'minute', label: 'Minuto' },
                { value: 'hourly', label: 'Hora' },
                { value: 'daily', label: 'Dia' },
              ]}
            />
          </>
        )}
      </View>

      <Button 
        mode="contained" 
        onPress={saveSettings}
        style={styles.saveButton}
        loading={isSaving}
        disabled={isSaving}
      >
        Salvar Configurações
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 20,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButton: {
    marginTop: 20,
    padding: 10,
  },
}); 