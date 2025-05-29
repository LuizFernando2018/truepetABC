import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Funcionando!');
});

app.listen(3001, () => console.log('Rodando na porta 3001'));