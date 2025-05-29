import { connection } from './db.js';

async function testConnection() {
  try {
    const conn = await connection.getConnection();
    console.log('Conexão com o banco MySQL bem-sucedida!');
    const [rows] = await conn.execute('SELECT 1 AS test');
    console.log('Teste de query:', rows);
    conn.release();
  } catch (err) {
    console.error('Erro ao conectar ao banco:', err.message);
  }
}

testConnection();