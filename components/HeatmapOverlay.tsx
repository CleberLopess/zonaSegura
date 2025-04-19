import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { getHeatmapColor } from '../utils/heatmapUtils';

interface HeatmapData {
  latitude: number;
  longitude: number;
  intensity: number;
}

interface HeatmapOverlayProps {
  data: HeatmapData[];
  visible: boolean;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ data, visible }) => {
  if (!visible) return null;

  const generateHeatmapHTML = () => {
    const points = data.map(point => ({
      lat: point.latitude,
      lng: point.longitude,
      intensity: point.intensity,
      color: getHeatmapColor(point.intensity)
    }));

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
            #heatmap { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="heatmap"></div>
          <script>
            const points = ${JSON.stringify(points)};
            const heatmap = document.getElementById('heatmap');
            
            points.forEach(point => {
              const dot = document.createElement('div');
              dot.style.position = 'absolute';
              dot.style.width = '20px';
              dot.style.height = '20px';
              dot.style.borderRadius = '50%';
              dot.style.backgroundColor = point.color;
              dot.style.transform = 'translate(-50%, -50%)';
              dot.style.left = (point.lng + 180) / 360 * 100 + '%';
              dot.style.top = (90 - point.lat) / 180 * 100 + '%';
              heatmap.appendChild(dot);
            });
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateHeatmapHTML() }}
        style={styles.webview}
        scrollEnabled={false}
        scalesPageToFit={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default HeatmapOverlay; 