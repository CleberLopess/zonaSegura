import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

export interface CrimeData {
  RISP: number;
  AISP: number;
  CISP: number;
  unidadeTerritorial: string;
  municipio: string;
  regiaoDeGoverno: string;
  percentual: string;
  latitude?: number;
  longitude?: number;
  heatmapIntensity?: number;
  percentualOriginal?: string;
}

const RESULT_PATH = "resultadoFinal.json";

// Função para converter percentual em número
const parsePercentual = (percentual: string | undefined): number => {
  if (!percentual) return 0;
  // Remove o % e substitui vírgula por ponto
  const cleanValue = percentual.replace("%", "").replace(",", ".");
  return parseFloat(cleanValue);
};

// Função para normalizar os percentuais
const normalizePercentuals = (data: any[]): any[] => {
  // Encontra o maior percentual
  const maxPercentual = Math.max(...data.map(item => parsePercentual(item.percentual) || 0));

  // Normaliza todos os percentuais baseado no maior valor
  return data.map(item => {
    const originalValue = parsePercentual(item.percentual);
    const normalizedValue = originalValue / maxPercentual;
    
    return {
      ...item,
      percentualOriginal: item.percentual,
      percentual: `${(normalizedValue * 100).toFixed(2)}%`,
      heatmapIntensity: normalizedValue
    };
  });
};

export const readData = async (
  onProgress?: (progress: number) => void
): Promise<CrimeData[]> => {
  try {

    // Carrega o JSON de dados
    const jsonData = require("../assets/data/dados_RJ.json");

    // Processa os dados
    const processedData = jsonData.map((item: any) => ({
      RISP: item.RISP,
      AISP: item.AISP,
      CISP: item.CISP,
      unidadeTerritorial: item.unidadeTerritorial,
      municipio: item.municipio,
      regiaoDeGoverno: item.regiaoDeGoverno,
      percentual: item.percentual || "0%",
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude)
    }));

    // Normaliza os percentuais
    const normalizedData = normalizePercentuals(processedData);

    // Salva o resultado processado
    if (FileSystem.documentDirectory) {
      const filePath = FileSystem.documentDirectory + RESULT_PATH;
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(normalizedData));
    }

    return normalizedData;
  } catch (error) {
    console.error("Erro detalhado ao processar os dados:", error);
    throw error;
  }
};
