const Caso = require('../models/Caso');

// Valida se o nome do caso já existe, exceto se for o mesmo identificador (evita duplicidade)
async function validarNomeCaso(nomeCaso, identificador) {
  const existente = await Caso.findOne({ nomeCaso });

  if (existente && existente.identificador !== identificador) {
    return 'Nome de caso já existe.';
  }

  return null;
}

// Salva o caso no banco de dados
async function salvarCaso(dados) {
  const { nomeCaso, identificador } = dados;

  const existente = await Caso.findOne({ identificador });

  if (existente) {
    // Atualiza o caso existente
    existente.nomeCaso = nomeCaso;
    await existente.save();
  } else {
    // Cria novo caso
    const novoCaso = new Caso({ nomeCaso, identificador });
    await novoCaso.save();
  }
}

module.exports = {
  validarNomeCaso,
  salvarCaso,
};
