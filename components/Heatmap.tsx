import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useSettings } from '@/contexts/SettingsContext';

interface HeatmapData {
  latitude: number;
  longitude: number;
  percentual: string;
}

interface HeatmapProps {
  data: HeatmapData[];
  userLocation: Location.LocationObject | null;
}

const DEFAULT_REGION = {
  latitude: -22.9068, // Rio de Janeiro
  longitude: -43.1729,
  zoom: 13,
};

const Heatmap: React.FC<HeatmapProps> = ({ data, userLocation }) => {
  const { settings } = useSettings();
  const webViewRef = useRef<WebView>(null);
  const [mapHtml, setMapHtml] = useState<string>('');
  

  if (!settings) {
    return null;
  }

  // Atualizar o HTML do mapa quando as configurações mudarem
  useEffect(() => {
    setMapHtml(generateMapHTML());
  }, [settings, data, userLocation]);

  // Efeito para atualizar o mapa quando os dados mudarem
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateAreas();
      `);
    }
  }, [data]);

  // Efeito para atualizar o mapa quando as configurações mudarem
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        updateSettings(${JSON.stringify(settings)});
        updateAreas();
      `);
    }
  }, [settings]);

  // Efeito para atualizar a localização do usuário no mapa
  useEffect(() => {
    if (webViewRef.current && userLocation) {
      webViewRef.current.injectJavaScript(`
        updateUserLocation([${userLocation.coords.latitude}, ${userLocation.coords.longitude}, ${userLocation.coords.accuracy}]);
      `);
    }
  }, [userLocation]);

  const generateMapHTML = () => {
    const points = data.map(point => {
      const percentual = point.percentual;
      const intensity = parseFloat(percentual) / 100;
      
      return {
        lat: point.latitude,
        lng: point.longitude,
        intensity: isNaN(intensity) ? 0 : intensity
      };
    });
    

    const userLocationStr = userLocation 
      ? `[${userLocation.coords.latitude}, ${userLocation.coords.longitude}, ${userLocation.coords.accuracy}]`
      : 'null';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body, html, #map { 
              margin: 0; 
              padding: 0; 
              width: 100%; 
              height: 100%; 
            }
            .circle-marker {
              border-radius: 50%;
              opacity: 0.6;
              pointer-events: none;
            }
            .locate-button {
              width: 40px;
              height: 40px;
              line-height: 40px;
              text-align: center;
              background: white;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              cursor: pointer;
              font-size: 20px;
            }
            .loading-message {
              position: absolute;
              top: 10px;
              left: 50%;
              transform: translateX(-50%);
              background: white;
              padding: 8px 16px;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              z-index: 1000;
              font-family: Arial, sans-serif;
              font-size: 14px;
            }
            .legend {
              position: absolute;
              bottom: 20px;
              left: 20px;
              background: white;
              padding: 10px;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              z-index: 1000;
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              margin: 5px 0;
            }
            .legend-color {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              margin-right: 8px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          ${!userLocation ? '<div class="loading-message">Carregando sua localização...</div>' : ''}
          <div class="legend">
            <div class="legend-item"><div class="legend-color" style="background: rgba(121, 188, 106, 0.7)"></div>0-20%</div>
            <div class="legend-item"><div class="legend-color" style="background: rgba(187, 207, 76, 0.7)"></div>20-40%</div>
            <div class="legend-item"><div class="legend-color" style="background: rgba(238, 194, 11, 0.7)"></div>40-60%</div>
            <div class="legend-item"><div class="legend-color" style="background: rgba(242, 147, 5, 0.7)"></div>60-80%</div>
            <div class="legend-item"><div class="legend-color" style="background: rgba(229, 0, 0, 0.7)"></div>80-100%</div>
          </div>
          <script>
            const map = L.map('map').setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], ${DEFAULT_REGION.zoom});
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            const points = ${JSON.stringify(points)};
            let userLocation = ${userLocationStr};
            let currentSettings = ${JSON.stringify(settings)};
            let userMarker, userCircle, circles = [];
            
            function getColor(intensity) {
              const colors = [
                [121, 188, 106], // Verde claro - Mais seguro
                [187, 207, 76],  // Verde amarelado
                [238, 194, 11],  // Amarelo
                [242, 147, 5],   // Laranja
                [229, 0, 0]      // Vermelho - Mais perigoso
              ];
              
              const index = Math.min(Math.floor(intensity * (colors.length - 1)), colors.length - 1);
              const [r, g, b] = colors[index];
              const opacity = 0.5 + (intensity * 0.5);
              return \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;
            }

            function getRadius(intensity) {
              return Math.max(100, currentSettings.radius * (1 + intensity));
            }

            // Adicionar botão de localização
            const locateControl = L.Control.extend({
              options: {
                position: 'topright'
              },
              onAdd: function() {
                const container = L.DomUtil.create('div', 'locate-button');
                container.innerHTML = '📍';
                container.title = 'Centralizar em minha localização';
                
                container.onclick = function() {
                  if (userLocation) {
                    map.setView([userLocation[0], userLocation[1]], 16);
                  }
                };
                
                return container;
              }
            });
            
            new locateControl().addTo(map);

            function updateUserLocation(location) {
              if (!location) return;
              
              userLocation = location;
              
              if (userMarker) map.removeLayer(userMarker);
              if (userCircle) map.removeLayer(userCircle);
              
              userMarker = L.marker([location[0], location[1]], {
                icon: L.divIcon({
                  className: 'user-location-marker',
                  html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>',
                  iconSize: [20, 20]
                })
              })
                .addTo(map)
                .bindPopup("Sua localização atual");
              
              userCircle = L.circle([location[0], location[1]], {
                radius: location[2] || 50,
                fillColor: '#2196F3',
                fillOpacity: 0.15,
                stroke: false
              }).addTo(map);

              // Centralizar mapa na primeira vez que obtiver a localização
              if (!window.hasInitialLocation) {
                map.setView([location[0], location[1]], 16);
                window.hasInitialLocation = true;
              }
            }

            function updateSettings(newSettings) {
              currentSettings = newSettings;
              updateAreas();
            }

            function updateAreas() {
              // Limpar círculos existentes
              circles.forEach(circle => map.removeLayer(circle));
              circles = [];

              // Adicionar círculos para cada ponto
              points.forEach(point => {
                if (point.intensity >= currentSettings.minRiskPercentage / 100) {
                  const circle = L.circle([point.lat, point.lng], {
                    radius: getRadius(point.intensity),
                    fillColor: getColor(point.intensity),
                    fillOpacity: 0.6,
                    stroke: false
                  }).addTo(map);
                  circles.push(circle);
                }
              });
            }

            // Inicializar áreas
            updateAreas();

            // Se já tiver localização inicial, atualizar
            if (userLocation) {
              updateUserLocation(userLocation);
            }

            // Expor funções para o React Native
            window.updateSettings = updateSettings;
            window.updateUserLocation = updateUserLocation;
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        onMessage={(event) => {
          console.log('Message from WebView:', event.nativeEvent.data);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
}); 

export default Heatmap; 