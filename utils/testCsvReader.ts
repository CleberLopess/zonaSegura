import { readData } from './csvReader';

const testReadData = async () => {
  try {
    console.log('Iniciando teste de leitura de dados...');
    const result = await readData((progress) => {
      console.log(`Progresso: ${(progress * 100).toFixed(2)}%`);
    });
    console.log('Dados lidos com sucesso:', result);
  } catch (error) {
    console.error('Erro ao ler dados:', error);
  }
};

testReadData(); 