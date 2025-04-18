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

const REGION_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  Capital: { lat: -22.9068, lng: -43.1729 },
  "Baixada Fluminense": { lat: -22.7631, lng: -43.4379 },
  "Grande Niterói": { lat: -22.8832, lng: -43.1036 },
  Interior: { lat: -22.5203, lng: -43.1794 },
};

const JSON_PATH = FileSystem.documentDirectory + "BaseMunicipioTaxaMes.json";

export const readCSV = async (
  onProgress?: (progress: number) => void
): Promise<CrimeData[]> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(JSON_PATH);

    if (fileInfo.exists) {
      const jsonData = await FileSystem.readAsStringAsync(JSON_PATH);
      const parsed = JSON.parse(jsonData);
      return addCoordinates(parsed);
    }

    const csvAsset = Asset.fromModule(
      require("../assets/data/BaseMunicipioTaxaMes.csv")
    );
    await csvAsset.downloadAsync();

    if (!csvAsset.localUri) {
      throw new Error("Não foi possível carregar o arquivo CSV");
    }

    const csvContent = await FileSystem.readAsStringAsync(csvAsset.localUri);

    const totalLines = csvContent.split("\n").length;
    const data: any[] = [];
    let processedLines = 0;

    await new Promise<void>((resolve, reject) => {
      Papa.parse<Record<string, any>>(csvContent, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        step: (results: Papa.ParseStepResult<Record<string, any>>) => {
          const row: Record<string, any> = results.data as Record<string, any>;

          const numericFields: string[] = [
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

          for (const key of numericFields) {
            if (row[key]) {
              const cleanValue: string = row[key]
                .replace(/['"]/g, "")
                .replace(",", ".");
              row[key] = parseFloat(cleanValue) || 0;
            }
          }

          data.push(row);
          processedLines++;

          if (onProgress) {
            const progress: number = processedLines / totalLines;
            console.log(progress);

            onProgress(progress);
          }
        },
        complete: () => resolve(),
        error: (err: Error) => reject(err),
      });
    });

    await FileSystem.writeAsStringAsync(JSON_PATH, JSON.stringify(data));

    return addCoordinates(data);
  } catch (error) {
    console.error("Erro ao processar o CSV:", error);
    return [];
  }
};

const addCoordinates = (data: any[]): CrimeData[] => {
  return data.map((item) => {
    const coords =
      REGION_COORDINATES[item.regiao] || REGION_COORDINATES["Interior"];
    return {
      ...item,
      latitude: coords.lat,
      longitude: coords.lng,
    };
  });
};
