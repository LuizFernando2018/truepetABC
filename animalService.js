import { connection } from './db.js';


const animalService = {
    async listarAnimaisDisponiveis() {
        const [rows] = await connection.execute(
            'SELECT * FROM Animais WHERE status = "disponivel"'
        );
        return rows;
    },
    // Em animalService.js
    async buscarAnimalPorId(id) {
        const [rows] = await connection.execute('SELECT * FROM Animais WHERE id = ?', [id]);
            return rows[0] || null;
    }
};

export { animalService };