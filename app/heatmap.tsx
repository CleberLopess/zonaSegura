import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { readData } from '@/utils/csvReader';
import Heatmap from '@/components/Heatmap';
import { useSettings } from '@/contexts/SettingsContext';
import { FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useLocation } from '@/hooks/useLocation';
import { useRiskNotification } from '@/hooks/useRiskNotification';

export default function HeatmapScreen() {
  const [crimeData, setCrimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, isLoading: settingsLoading } = useSettings();
  const router = useRouter();
  const { userLocation, error } = useLocation();

  // Usar o hook de notificação de risco
  useRiskNotification(crimeData);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const data = await readData();
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

  if (!settings) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Heatmap
        key={`${settings.radius}-${settings.notificationInterval}-${Date.now()}`}
        data={crimeData}
        userLocation={userLocation}
      />
      <FAB
        icon="cog"
        style={styles.fab}
        onPress={() => router.push('/config')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 