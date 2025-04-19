import { readData } from "./csvReader";
import { calculateHeatmap } from "./heatmapCalculator";

const testHeatmapLogic = async () => {
  const data = await readData();

  if (!data) {
    console.error("Falha ao carregar dados do CSV");
    return;
  }

  const heatmap = calculateHeatmap(data as any);

  console.log("Resultado das zonas de calor:", heatmap);
};

testHeatmapLogic();
