declare module '@cawfree/react-native-heat-map' {
  import { Component } from 'react';

  interface HeatMapProps {
    points: Array<{
      latitude: number;
      longitude: number;
      weight: number;
    }>;
    radius?: number;
    opacity?: number;
    blur?: number;
    maxIntensity?: number;
    gradientSmoothing?: number;
    heatMapStyle?: {
      colors: string[];
      startPoints: number[];
      size: number;
    };
  }

  export default class HeatMap extends Component<HeatMapProps> {}
} 