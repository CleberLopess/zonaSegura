/**
 * Função para gerar cores do heatmap baseado na intensidade
 * @param intensity - Valor entre 0 e 1 representando a intensidade
 * @param maxOpacity - Opacidade máxima (padrão: 0.8)
 * @param transitionPoint - Ponto de transição entre amarelo e vermelho (padrão: 0.5)
 * @returns String com a cor no formato rgba
 */
export const getHeatmapColor = (
  intensity: number,
  maxOpacity: number = 0.8,
  transitionPoint: number = 0.5
): string => {
  if (intensity <= transitionPoint) {
    // Transição de transparente para amarelo
    const alpha = (intensity / transitionPoint) * maxOpacity;
    return `rgba(255, 255, 0, ${alpha})`;
  } else {
    // Transição de amarelo para vermelho
    const ratio = (intensity - transitionPoint) / (1 - transitionPoint);
    const red = Math.floor(255 * ratio);
    return `rgba(255, ${255 - red}, 0, ${maxOpacity})`;
  }
}; 