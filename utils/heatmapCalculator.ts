import { CrimeData } from "./csvReader";

export interface HeatmapData {
  regiao: string;
  latitude: number;
  longitude: number;
  alertLevel: "low" | "medium" | "high";
  average: number;
  totalCrimes: number;
}

// Coordenadas das principais regiões do Rio de Janeiro
const REGION_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  Capital: { lat: -22.9068, lng: -43.1729 },
  "Baixada Fluminense": { lat: -22.7579, lng: -43.4529 },
  "Grande Niterói": { lat: -22.8832, lng: -43.1036 },
  Interior: { lat: -22.2789, lng: -42.5335 },
  "Região dos Lagos": { lat: -22.8714, lng: -42.018 },
  "Costa Verde": { lat: -23.0047, lng: -44.3197 },
  "Norte Fluminense": { lat: -21.7545, lng: -41.3244 },
  "Noroeste Fluminense": { lat: -21.2017, lng: -41.8857 },
  "Região Serrana": { lat: -22.2873, lng: -42.5343 },
};

const getRegionCoordinates = (regiao: string): { lat: number; lng: number } => {
  if (REGION_COORDINATES[regiao]) {
    return REGION_COORDINATES[regiao];
  }

  // Mapeamento de substrings para regiões
  if (regiao.toLowerCase().includes("capital"))
    return REGION_COORDINATES["Capital"];
  if (regiao.toLowerCase().includes("baixada"))
    return REGION_COORDINATES["Baixada Fluminense"];
  if (regiao.toLowerCase().includes("niterói"))
    return REGION_COORDINATES["Grande Niterói"];
  if (regiao.toLowerCase().includes("lagos"))
    return REGION_COORDINATES["Região dos Lagos"];
  if (regiao.toLowerCase().includes("costa verde"))
    return REGION_COORDINATES["Costa Verde"];
  if (
    regiao.toLowerCase().includes("norte") &&
    !regiao.toLowerCase().includes("noroeste")
  )
    return REGION_COORDINATES["Norte Fluminense"];
  if (regiao.toLowerCase().includes("noroeste"))
    return REGION_COORDINATES["Noroeste Fluminense"];
  if (regiao.toLowerCase().includes("serrana"))
    return REGION_COORDINATES["Região Serrana"];

  return REGION_COORDINATES["Interior"];
};

export const calculateHeatmap = (data: CrimeData[]): HeatmapData[] => {
  const regionData: {
    [key: string]: {
      total: number;
      count: number;
      latitude: number;
      longitude: number;
    };
  } = {};

  // Agrupar e somar dados por região
  data.forEach((item) => {
    // Calculando o total de crimes violentos com peso maior
    const violentCrimes =
      item.hom_doloso * 2 +
      item.lesao_corp_morte * 2 +
      item.latrocinio * 2 +
      item.cvli * 2 +
      item.hom_por_interv_policial * 1.5 +
      item.letalidade_violenta * 1.5;

    // Calculando o total de crimes contra o patrimônio
    const propertyCrimes =
      item.roubo_rua +
      item.roubo_veiculo +
      item.total_roubos +
      item.total_furtos * 0.5; // Furtos têm peso menor por serem menos violentos

    // Total ponderado de crimes
    const totalCrime = violentCrimes + propertyCrimes;

    if (!regionData[item.regiao]) {
      const coords = getRegionCoordinates(item.regiao);
      regionData[item.regiao] = {
        total: 0,
        count: 0,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    }

    regionData[item.regiao].total += totalCrime;
    regionData[item.regiao].count += 1;
  });

  // Calcular médias por região
  const regionAverages = Object.entries(regionData).map(([regiao, data]) => ({
    regiao,
    average: data.total / data.count,
    latitude: data.latitude,
    longitude: data.longitude,
    totalCrimes: data.total,
  }));

  // Calcular média geral para determinar limiares
  const overallAverage =
    regionAverages.reduce((acc, curr) => acc + curr.average, 0) /
    regionAverages.length;
  const stdDev = Math.sqrt(
    regionAverages.reduce(
      (acc, curr) => acc + Math.pow(curr.average - overallAverage, 2),
      0
    ) / regionAverages.length
  );

  // Gerar dados do heatmap com níveis de alerta usando desvio padrão
  const heatmap: HeatmapData[] = regionAverages.map((region) => {
    const zScore = (region.average - overallAverage) / stdDev;
    return {
      ...region,
      alertLevel: zScore > 1 ? "high" : zScore > -0.5 ? "medium" : "low",
    };
  });

  return heatmap;
};
