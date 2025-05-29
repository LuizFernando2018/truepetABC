import express from 'express';
import cors from 'cors';
import { clientService } from './controllerLogin.js';
import { mensagemService } from './controllerMensagem.js';
import { animalService } from './animalService.js';
import { connection } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: false
}));

app.use(express.static(path.join(__dirname, 'public')));

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).json({ error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userTipo = decoded.tipo;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Função para registrar ações na tabela AuditLogs
const logAudit = async (userId, action, details = null) => {
  try {
    await connection.execute(
      'INSERT INTO AuditLogs (userId, action, details) VALUES (?, ?, ?)',
      [userId, action, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.error('Erro ao registrar auditoria:', err);
  }
};

// Configuração do rate limit para o endpoint de login
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // Máximo de 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente após 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.log(`Limite de tentativas excedido para IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Configuração do rate limit para recuperação de senha
const recoverLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 3, // Máximo de 3 tentativas por IP
  message: {
    error: 'Muitas tentativas de recuperação de senha. Tente novamente após 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.log(`Limite de tentativas excedido para IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Rota de login com 2FA
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, senha, twoFactorCode } = req.body;
    const loginResult = await clientService.logarUsuario(email, senha, twoFactorCode);
    await logAudit(loginResult.userId, 'login', { email });
    res.status(200).json(loginResult);
  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(401).json(erro);
  }
});

// Rota de recuperação de senha
app.post(
  '/recuperar-senha',
  recoverLimiter,
  [
    body('email').trim().isEmail().withMessage({ field: 'email', message: 'Email inválido' }).normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const { email } = req.body;
      const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(404).json({ error: { field: 'email', message: 'Email não encontrado' } });
      }

      const user = rows[0];
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const resetLink = `http://localhost:3000/redefinir-senha?token=${token}`;

      // Simulando envio de email (pode ser substituído por Nodemailer ou outro serviço de email)
      console.log(`Link de recuperação para ${email}: ${resetLink}`);

      // Registrar a solicitação de recuperação na auditoria
      await logAudit(user.id, 'request_password_reset', { email });

      res.status(200).json({ message: 'Link de recuperação enviado com sucesso' });
    } catch (err) {
      console.error('Erro ao processar recuperação de senha:', err);
      res.status(500).json({ error: { field: 'general', message: 'Erro ao processar recuperação de senha' } });
    }
  }
);

// Rota para ativar 2FA
app.post('/enable-two-factor', verifyToken, async (req, res) => {
  try {
    const otpauthUrl = await clientService.enableTwoFactorAuthentication(req.userId);
    const qrCode = await qrcode.toDataURL(otpauthUrl);
    res.status(200).json({ qrCode, otpauthUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ativar 2FA' });
  }
});

// Rota para desativar 2FA
app.post('/disable-two-factor', verifyToken, async (req, res) => {
  try {
    const result = await clientService.disableTwoFactorAuthentication(req.userId);
    res.status(200).json(result);
  } catch (err) {
    console.error('Erro ao desabilitar 2FA:', err);
    // Check if the error has a structured message from clientService
    if (err.error && err.error.message) {
      res.status(500).json({ error: err.error.message });
    } else {
      res.status(500).json({ error: 'Erro interno ao desabilitar autenticação de dois fatores.' });
    }
  }
});

// Rota para buscar perfil do usuário
app.get('/perfil/:id', verifyToken, async (req, res) => {
  try {
    const usuario = await clientService.perfilUsuario(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.status(200).json(usuario);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Rota para listar animais disponíveis (para usuários comuns)
app.get('/animais', async (req, res) => {
  try {
    const animais = await animalService.listarAnimaisDisponiveis();
    res.status(200).json(animais);
  } catch (erro) {
    console.error('Erro ao listar animais:', erro);
    res.status(500).json({ erro: 'Erro ao listar animais' });
  }
});

// Rota para listar todos os animais (acessível a qualquer usuário autenticado)
app.get('/animais/admin', verifyToken, async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM Animais');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erro ao listar animais:', err);
    res.status(500).json({ error: 'Erro ao listar animais' });
  }
});

// Rota para cadastrar animal
app.post('/animais', verifyToken, async (req, res) => {
  try {
    const { nome, especie, idade, descricao, status } = req.body;

    if (!nome || !especie) {
      return res.status(400).json({ error: 'Nome e espécie são obrigatórios' });
    }

    const [result] = await connection.execute(
      'INSERT INTO Animais (nome, especie, idade, descricao, status, id_responsavel) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, especie, idade || null, descricao || null, status || 'disponivel', req.userId]
    );

    const animalCriado = {
      id: result.insertId,
      nome,
      especie,
      idade,
      descricao,
      status: status || 'disponivel',
      id_responsavel: req.userId
    };

    // Registrar a criação do animal na auditoria
    await logAudit(req.userId, 'create_animal', animalCriado);

    res.status(201).json(animalCriado);
  } catch (err) {
    console.error('Erro ao cadastrar animal:', err);
    res.status(500).json({ error: 'Erro ao cadastrar animal' });
  }
});

// Rota para buscar animal por ID
app.get('/animais/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM Animais WHERE id = ?', [id]);
    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: 'Animal não encontrado' });
    }
  } catch (err) {
    console.error('Erro ao buscar animal:', err);
    res.status(500).json({ error: 'Erro ao buscar animal' });
  }
});

// Rota para atualizar animal
app.put('/animais/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const { nome, especie, idade, descricao, status } = req.body;

  try {
    const [rows] = await connection.execute('SELECT * FROM Animais WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    const animalAntigo = rows[0];
    const [result] = await connection.execute(
      'UPDATE Animais SET nome = ?, especie = ?, idade = ?, descricao = ?, status = ? WHERE id = ?',
      [nome || animalAntigo.nome, especie || animalAntigo.especie, idade || animalAntigo.idade, descricao || animalAntigo.descricao, status || animalAntigo.status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Erro ao atualizar animal' });
    }

    const animalAtualizado = {
      id,
      nome: nome || animalAntigo.nome,
      especie: especie || animalAntigo.especie,
      idade: idade || animalAntigo.idade,
      descricao: descricao || animalAntigo.descricao,
      status: status || animalAntigo.status
    };

    // Registrar a atualização na auditoria
    await logAudit(req.userId, 'update_animal', {
      animalId: id,
      before: animalAntigo,
      after: animalAtualizado
    });

    res.status(200).json(animalAtualizado);
  } catch (err) {
    console.error('Erro ao atualizar animal:', err);
    res.status(500).json({ error: 'Erro ao atualizar animal' });
  }
});

// Rota para deletar animal
app.delete('/animais/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.execute('SELECT * FROM Animais WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Animal não encontrado' });
    }

    const animalDeletado = rows[0];
    const [result] = await connection.execute('DELETE FROM Animais WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Erro ao deletar animal' });
    }

    // Registrar a exclusão na auditoria
    await logAudit(req.userId, 'delete_animal', { animalId: id, animal: animalDeletado });

    res.status(200).json({ message: 'Animal deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar animal:', err);
    res.status(500).json({ error: 'Erro ao deletar animal' });
  }
});

// Rota de cadastro de usuário
app.post(
  '/cadastro',
  [
    body('nome').trim().notEmpty().withMessage('O nome é obrigatório').isLength({ min: 2, max: 100 }).withMessage('O nome deve ter entre 2 e 100 caracteres'),
    body('email').trim().isEmail().withMessage('Email inválido').custom((value) => {
      const emailParts = value.split('@');
      if (emailParts.length !== 2) throw new Error('O email deve conter exatamente um @');
      const domainParts = emailParts[1].split('.');
      const extension = domainParts[domainParts.length - 1].toLowerCase();
      const secondLevel = domainParts.length >= 2 ? domainParts[domainParts.length - 2].toLowerCase() : null;
      const validExtensions = ['com', 'org', 'net', 'gov', 'edu', 'br', 'uk', 'fr', 'de', 'jp'];
      const validSecondLevels = ['com', 'org', 'net', 'gov', 'edu', 'co'];
      if (domainParts.length > 3 || extension.length < 2 || extension.length > 4 || (domainParts.length === 3 && 
        (!validSecondLevels.includes(secondLevel) || !validExtensions.includes(extension)) && 
        !(secondLevel === 'com' && extension === 'br'))) {
        throw new Error('O email deve ter uma extensão válida (ex.: .com, .org, .br, .com.br)');
      }
      return true;
    }).normalizeEmail(),
    body('senha').isLength({ min: 8, max: 12 }).withMessage('A senha deve ter entre 8 e 12 caracteres').matches(/[A-Z]/).withMessage('A senha deve conter pelo menos 1 letra maiúscula').matches(/[0-9]/).withMessage('A senha deve conter pelo menos 1 número').matches(/[!@#$%^&*]/).withMessage('A senha deve conter pelo menos 1 caractere especial')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { nome, email, senha } = req.body;
      const novoUsuario = await clientService.criarUsuario(nome, email, senha);

      // Registrar o cadastro na auditoria
      await logAudit(novoUsuario.id, 'create_user', { nome, email });

      res.status(201).json(novoUsuario);
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }
);

// Rota de listar usuários
app.get('/usuarios', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT id, nome, email, tipo FROM Usuarios');
    res.status(200).json(rows);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// Rota de envio de mensagem
app.post(
  '/mensagem',
  verifyToken,
  [
    body('nome').trim().notEmpty().withMessage('O nome é obrigatório').isLength({ min: 2, max: 100 }).withMessage('O nome deve ter entre 2 e 100 caracteres'),
    body('telefone').trim().notEmpty().withMessage('O telefone é obrigatório').matches(/^\+?\d{10,15}$/).withMessage('O telefone deve ter entre 10 e 15 dígitos'),
    body('animal').trim().notEmpty().withMessage('O nome do animal é obrigatório').isLength({ max: 100 }).withMessage('O nome do animal deve ter no máximo 100 caracteres'),
    body('mensagem').trim().notEmpty().withMessage('A mensagem é obrigatória').isLength({ max: 1000 }).withMessage('A mensagem deve ter no máximo 1000 caracteres'),
    body('animal_id').isInt().withMessage('O ID do animal deve ser um número inteiro')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { nome, telefone, animal, mensagem, animal_id } = req.body;
      const novaMensagem = await mensagemService.enviarMensagem(nome, telefone, animal, mensagem, animal_id);

      // Registrar o envio de mensagem na auditoria
      await logAudit(req.userId, 'send_message', { nome, animal_id });

      res.status(201).json(novaMensagem);
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }
);

// Rota para buscar mensagens do responsável
app.get('/mensagens/responsavel/:responsavelId', verifyToken, async (req, res) => {
  const responsavelId = req.params.responsavelId;
  try {
    const mensagens = await mensagemService.buscarMensagensPorResponsavel(responsavelId);
    res.status(200).json(mensagens);
  } catch (erro) {
    console.error('Erro ao buscar mensagens do responsável:', erro);
    res.status(500).json({ erro: 'Erro ao buscar mensagens' });
  }
});

// Rota padrão para 404
app.use((req, res) => {
  res.status(404).send('Rota não encontrada');
});

// Iniciar servidor
app.listen(3000, () => console.log('Rodando na porta 3000'));