const mongoose = require('mongoose');

const casoSchema = new mongoose.Schema({
    identificador: {
        type: String,
        required: true,
        unique: true,  // Garante que o identificador seja único
    },
    nomeCaso: {
        type: String,
        required: true,
    },
    peritoNome: {
        type: String,
        required: true,
    },
    statusCaso: {
        type: String,
        required: true,
        enum: ['Em andamento', 'Finalizado', 'Arquivado'],  // Restringe os valores possíveis
    },
    dataPericia: {
        type: Date,
        required: true,
    },
    exameDescricao: {
        type: String,
        required: true,
    },
    diagnostico: {
        type: String,
        required: true,
    },
    observacoes: {
        type: String,
        required: false,  // Observações são opcionais
    },
    fotos: {
        type: [String],  // Array de strings para armazenar os caminhos das fotos
        required: false,
    }
}, { timestamps: true });  // Adiciona campos `createdAt` e `updatedAt`

// Criar o modelo a partir do esquema
const Caso = mongoose.model('Caso', casoSchema);

module.exports = Caso;
