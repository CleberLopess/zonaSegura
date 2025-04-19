import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

export interface CrimeData {
  RISP: number;
  AISP: number;
  CISP: number;
  unidadeTerritorial: string;
  municipio: string;
  regiaoDeGoverno: string;
  Percentual: string;
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
  
  console.log(`Maior percentual encontrado: ${maxPercentual}%`);

  // Normaliza todos os percentuais baseado no maior valor
  return data.map(item => {
    const originalValue = parsePercentual(item.percentual);
    const normalizedValue = originalValue / maxPercentual;
    
    console.log(`Normalizando ${item.unidadeTerritorial}: ${originalValue}% -> ${(normalizedValue * 100).toFixed(2)}%`);
    
    return {
      ...item,
      percentualOriginal: item.percentual,
      Percentual: `${(normalizedValue * 100).toFixed(2)}%`,
      heatmapIntensity: normalizedValue
    };
  });
};

export const readData = async (
  onProgress?: (progress: number) => void
): Promise<CrimeData[]> => {
  try {
    console.log("Iniciando processamento dos dados...");

    // Carrega o JSON de dados
    console.log("Carregando dados do JSON...");
    const jsonData = require("../assets/data/dados_RJ.json");

    // Processa os dados
    console.log("Processando dados...");
    const processedData = jsonData.map((item: any) => ({
      RISP: item.RISP,
      AISP: item.AISP,
      CISP: item.CISP,
      "unidadeTerritorial": item.unidadeTerritorial,
      "municipio": item.municipio,
      "regiaoDeGoverno": item.regiaoDeGoverno,
      Percentual: item.percentual || "0%",
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude)
    }));

    // Normaliza os percentuais
    console.log("Normalizando percentuais...");
    const normalizedData = normalizePercentuals(processedData);

    // Salva o resultado processado
    if (FileSystem.documentDirectory) {
      const filePath = FileSystem.documentDirectory + RESULT_PATH;
      console.log("Salvando resultado final em:", filePath);
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(normalizedData));
      console.log("Arquivo salvo com sucesso!");
    }

    return normalizedData;
  } catch (error) {
    console.error("Erro detalhado ao processar os dados:", error);
    throw error;
  }
};
