import * as FileSystem from "expo-file-system";
import * as Papa from "papaparse";
import { Asset } from "expo-asset";

export interface CrimeData {
  fmun_cod: string;
  fmun: string;
  ano: string;
  mes: string;
  mes_ano: string;
  regiao: string;
  hom_doloso: number;
  lesao_corp_morte: number;
  latrocinio: number;
  cvli: number;
  hom_por_interv_policial: number;
  letalidade_violenta: number;
  roubo_rua: number;
  roubo_veiculo: number;
  total_roubos: number;
  total_furtos: number;
  latitude?: number;
  longitude?: number;
}

// Coordenadas aproximadas das regiões principais do Rio de Janeiro
const REGION_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  Capital: { lat: -22.9068, lng: -43.1729 },
  "Baixada Fluminense": { lat: -22.7631, lng: -43.4379 },
  "Grande Niterói": { lat: -22.8832, lng: -43.1036 },
  Interior: { lat: -22.5203, lng: -43.1794 },
};

export const readCSV = async (filePath: string): Promise<CrimeData[]> => {
  try {
    console.log("Iniciando leitura do CSV...");
    const csvAsset = Asset.fromModule(
      require("../assets/data/BaseMunicipioTaxaMes.csv")
    );
    console.log("Asset carregado:", csvAsset);

    await csvAsset.downloadAsync();
    console.log("Asset baixado, localUri:", csvAsset.localUri);

    if (!csvAsset?.localUri) {
      throw new Error("Não foi possível carregar o arquivo CSV");
    }

    const csvFile = await FileSystem.readAsStringAsync(csvAsset.localUri);
    console.log(
      "Conteúdo do CSV (primeiros 100 chars):",
      csvFile.substring(0, 100)
    );

    const results = Papa.parse(csvFile, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transform: (value: string, field: string) => {
        // Lista de campos que devem ser convertidos para números
        const numericFields = [
          "cvli",
          "roubo_rua",
          "roubo_veiculo",
          "total_roubos",
          "total_furtos",
          "hom_doloso",
          "lesao_corp_morte",
          "latrocinio",
          "hom_por_interv_policial",
          "letalidade_violenta",
        ];

        if (numericFields.includes(field)) {
          // Remove aspas, substitui vírgula por ponto e converte para número
          const cleanValue = value.replace(/['"]/g, "").replace(",", ".");
          return parseFloat(cleanValue) || 0;
        }
        return value;
      },
    });

    console.log(
      "Dados parseados (primeiras 2 linhas):",
      results.data.slice(0, 2)
    );

    // Adicionar coordenadas com base na região
    const processedData = results.data.map((item: any) => {
      const coords =
        REGION_COORDINATES[item.regiao] || REGION_COORDINATES["Interior"];
      return {
        ...item,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    });

    console.log(
      "Dados processados (primeiras 2 linhas):",
      processedData.slice(0, 2)
    );
    return processedData as CrimeData[];
  } catch (error) {
    console.error("Erro ao ler o arquivo CSV:", error);
    return [];
  }
};
