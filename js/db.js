const mongoose = require('mongoose');

async function connectDB() {
  try {
    // Substitua a URL do MongoDB Atlas conforme mencionado anteriormente
    await mongoose.connect('mongodb+srv://admin:admin@cluster0.j5rgmit.mongodb.net/odontologia?retryWrites=true&w=majority');
    console.log('🟢 Conectado ao MongoDB Atlas!');
  } catch (error) {
    console.error('🔴 Erro ao conectar ao MongoDB:', error);
  }
}

module.exports = connectDB;
