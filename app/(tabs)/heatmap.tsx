import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { readData } from '@/utils/csvReader';
import { Heatmap } from '@/components/Heatmap';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useUserSettings } from '@/hooks/useUserSettings';
import { setupNotifications } from '@/utils/notifications';

export default function HeatmapScreen() {
  const [crimeData, setCrimeData] = useState<any[]>([]);
  const [radius, setRadius] = useState(2000);
  const [maxOpacity, setMaxOpacity] = useState(0.7);
  const [transitionPoint, setTransitionPoint] = useState(0.3);
  const [loading, setLoading] = useState(true);

  const { settings, updateSettings, isLoading: settingsLoading } = useUserSettings();
  const userLocation = useLocationTracking(settings.updateInterval);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        // Configura notificações
        await setupNotifications();
        
        // Carrega dados
        const data = await readData((progress) => {
          console.log(`Progresso: ${(progress * 100).toFixed(2)}%`);
        });
        setCrimeData(data);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  if (loading || settingsLoading) {
    return (
      <View style={styles.container}>
        <Text>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Heatmap
        data={crimeData}
        radius={radius}
        maxOpacity={maxOpacity}
        transitionPoint={transitionPoint}
        userLocation={userLocation}
        settings={settings}
      />
      
      <ScrollView style={styles.controls}>
        <View style={styles.controlGroup}>
          <Text>Raio de Monitoramento: {radius / 1000}km</Text>
          <Slider
            style={styles.slider}
            minimumValue={500}
            maximumValue={5000}
            step={500}
            value={radius}
            onValueChange={setRadius}
          />
        </View>

        <View style={styles.controlGroup}>
          <Text>Opacidade Máxima: {(maxOpacity * 100).toFixed(0)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1}
            step={0.1}
            value={maxOpacity}
            onValueChange={setMaxOpacity}
          />
        </View>

        <View style={styles.controlGroup}>
          <Text>Ponto de Transição: {(transitionPoint * 100).toFixed(0)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={0.9}
            step={0.1}
            value={transitionPoint}
            onValueChange={setTransitionPoint}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.controlGroup}>
          <Text>Intervalo de Atualização: {settings.updateInterval / 1000}s</Text>
          <Slider
            style={styles.slider}
            minimumValue={10000}
            maximumValue={300000}
            step={10000}
            value={settings.updateInterval}
            onValueChange={(value) => updateSettings({ updateInterval: value })}
          />
        </View>

        <View style={styles.controlGroup}>
          <Text>Limite para Notificação: {settings.notificationThreshold}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={100}
            step={5}
            value={settings.notificationThreshold}
            onValueChange={(value) => updateSettings({ notificationThreshold: value })}
          />
        </View>

        <View style={[styles.controlGroup, styles.row]}>
          <Text>Vibração em Alertas Críticos</Text>
          <Switch
            value={settings.vibrationEnabled}
            onValueChange={(value) => updateSettings({ vibrationEnabled: value })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  controlGroup: {
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
