interface Coordinates {
  latitude: number;
  longitude: number;
}

// Calcula a distância entre dois pontos usando a fórmula de Haversine
export const calculateDistance = (
  point1: Coordinates,
  point2: Coordinates
): number => {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Retorna a distância em metros
};

// Verifica se um ponto está dentro de uma região circular
export const isPointInRegion = (
  point: Coordinates,
  center: Coordinates,
  radius: number
): boolean => {
  const distance = calculateDistance(point, center);
  return distance <= radius;
};
