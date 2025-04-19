import axios from 'axios';

interface Coordinates {
  latitude: number;
  longitude: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getCoordinatesByAddress = async (address: string): Promise<Coordinates> => {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
    
    throw new Error('Endereço não encontrado');
  } catch (error) {
    console.error('Erro ao buscar coordenadas:', error);
    throw error;
  }
};

export const getCoordinatesByMunicipio = async (municipio: string, estado: string): Promise<Coordinates> => {
  try {
    // Adiciona um delay de 1 segundo entre as requisições para respeitar o rate limit
    await delay(1000);
    
    const response = await axios.get(
      `https://brasilapi.com.br/api/ibge/municipios/v1/${estado}/${municipio}`
    );
    
    return {
      latitude: response.data.latitude,
      longitude: response.data.longitude
    };
  } catch (error) {
    console.error('Erro ao buscar coordenadas do municipio:', error);
    throw error;
  }
}; 