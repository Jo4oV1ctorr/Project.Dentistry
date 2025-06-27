const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Importando o modelo Caso
const Caso = require('../models/Caso.js');  // Ajuste o caminho conforme necessário

// Corrigido o caminho e nome do arquivo para minúsculo
const connectDB = require('./DB.JS');

// Importação do controller
const { validarNomeCaso, salvarCaso } = require('../Controller/casosController.js');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Conectar ao banco
connectDB();

// Rota de salvar caso
app.post('/api/casos', async (req, res) => {
  const caso = req.body;
  const error = await validarNomeCaso(caso.nomeCaso, caso.id);

  if (error) {
    return res.status(400).json({ erro: error });
  }

  try {
    // Usando o modelo Caso para salvar o novo caso no banco de dados
    const novoCaso = new Caso(caso);  // Criando uma instância de Caso com os dados recebidos
    await novoCaso.save();  // Salvando o caso no banco de dados
    
    return res.status(200).json({ mensagem: 'Caso salvo com sucesso!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: 'Erro ao salvar o caso' });
  }
});

// Iniciar servidor
app.listen(3001, () => {
  console.log('🚀 Servidor rodando na porta 3001');
});
