import { readCSV } from "./csvReader";
import { calculateHeatmap } from "./heatmapCalculator";

const testHeatmapLogic = async () => {
  const data = await readCSV("assets/data/BaseMunicipioTaxaMes.csv");

  if (!data) {
    console.error("Falha ao carregar dados do CSV");
    return;
  }

  const heatmap = calculateHeatmap(data as any);

  console.log("Resultado das zonas de calor:", heatmap);
};

testHeatmapLogic();
