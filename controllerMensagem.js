import { connection } from './db.js';

const mensagemService = {
    async enviarMensagem(nome, telefone, animal, mensagem, animal_id) {
        const [result] = await connection.execute(
            'INSERT INTO Mensagens (nome, telefone, animal_id, mensagem) VALUES (?, ?, ?, ?)',
            [nome, telefone, animal_id, mensagem]
        );
        return { id: result.insertId, nome, telefone, animal, mensagem, animal_id };
    },

    // Nova função para buscar mensagens do responsável
    async buscarMensagensPorResponsavel(responsavelId) {
        const [rows] = await connection.execute(
            `SELECT m.*, a.nome AS animal_nome 
             FROM Mensagens m 
             JOIN Animais a ON m.animal_id = a.id 
             WHERE a.id_responsavel = ?`,
            [responsavelId]
        );
        return rows;
    }
};

export { mensagemService };