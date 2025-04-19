import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Button } from 'react-native-paper';

interface ConfigScreenProps {
  initialRadius?: number;
  initialIntensity?: number;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({
  initialRadius = 500,
  initialIntensity = 0.6,
}) => {
  const [radius, setRadius] = useState(initialRadius);
  const [intensity, setIntensity] = useState(initialIntensity);
  const router = useRouter();

  const handleSave = () => {
    router.push({
      pathname: '/',
      params: {
        radius,
        intensity,
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Configurações do Mapa</Text>
        
        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Raio da Área (metros)</Text>
          <Text style={styles.value}>{radius.toFixed(0)}m</Text>
          <Slider
            style={styles.slider}
            minimumValue={100}
            maximumValue={2000}
            value={radius}
            onValueChange={setRadius}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#000000"
          />
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Opacidade</Text>
          <Text style={styles.value}>{(intensity * 100).toFixed(0)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.1}
            maximumValue={1}
            value={intensity}
            onValueChange={setIntensity}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#000000"
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.button}
        >
          Salvar Configurações
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
  },
});

export default ConfigScreen; 