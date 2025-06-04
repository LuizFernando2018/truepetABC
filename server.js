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
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import helmet from 'helmet';

dotenv.config();

// Configuração do Nodemailer Transporter
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Seu email do Gmail (do .env)
      pass: process.env.EMAIL_PASS  // Sua senha de app do Gmail (do .env)
    }
  });

  // Verificar a conexão do transporter (opcional, mas bom para debug)
  transporter.verify(function(error, success) {
    if (error) {
      console.error('Erro ao configurar o transporter do Nodemailer:', error);
      console.warn('AVISO: O envio de email para recuperação de senha pode não funcionar. Verifique as variáveis de ambiente EMAIL_USER e EMAIL_PASS e as configurações da conta Gmail.');
    } else {
      console.log('Nodemailer transporter configurado e pronto para enviar emails.');
    }
  });
} else {
  console.warn('AVISO: Variáveis de ambiente EMAIL_USER ou EMAIL_PASS não definidas. O envio de email para recuperação de senha está DESABILITADO.');
  console.log('Para habilitar, configure EMAIL_USER e EMAIL_PASS no arquivo .env e reinicie o servidor.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet()); // Aplica padrões de segurança do Helmet

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://ajax.googleapis.com", // CORRIGIDO AQUI
        "https://accessibility-widget.pages.dev",
        "'sha256-Pm3v7w2K3NW064ZpDut6RgIT+c34UZKAlVK7vzBRQpE='",
        "https://vlibras.gov.br",
        "https://cdn.jsdelivr.net" // <<< ADICIONADO
      ],
      scriptSrcElem: [ // Garantindo que esta diretiva esteja presente
        "'self'",
        "https://ajax.googleapis.com", // CORRIGIDO AQUI
        "https://accessibility-widget.pages.dev",
        "'sha256-Pm3v7w2K3NW064ZpDut6RgIT+c34UZKAlVK7vzBRQpE='",
        "https://vlibras.gov.br",
        "https://cdn.jsdelivr.net" // <<< ADICIONADO
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://vlibras.gov.br" // <<< ADICIONADO
      ],
      connectSrc: [
        "'self'"
      ],
      objectSrc: ["'none'"], // Recomendado: desabilita plugins como Flash
      upgradeInsecureRequests: [], // Deixe vazio por enquanto, ative em produção com HTTPS
    },
  })
);

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
  const authHeader = req.headers['authorization'];
  // Log para ver o JWT_SECRET usado na verificação
  console.log('[verifyToken] JWT_SECRET em uso para verificação:', process.env.JWT_SECRET);
  console.log('[verifyToken] Cabeçalho Authorization recebido:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[verifyToken] Falha: Token não fornecido ou mal formatado (sem prefixo "Bearer ").');
    return res.status(403).json({ error: 'Token não fornecido ou mal formatado.' });
  }

  const tokenItself = authHeader.split(' ')[1]; // Extrai apenas a string do token
  console.log('[verifyToken] Token puro extraído para verificação:', tokenItself);

  try {
    const decoded = jwt.verify(tokenItself, process.env.JWT_SECRET); // Usa o token puro
    req.userId = decoded.id;
    req.userTipo = decoded.tipo;
    console.log('[verifyToken] Sucesso: Token verificado. UserID:', req.userId, 'Tipo:', req.userTipo);
    next();
  } catch (err) {
    console.error('[verifyToken] Falha na verificação do JWT:', err.message);
    // Adiciona mais detalhes do erro ao log e à resposta, se for um erro conhecido do JWT
    let errorDetail = err.message;
    if (err.name === 'TokenExpiredError') {
      errorDetail = 'Token expirado.';
    } else if (err.name === 'JsonWebTokenError') {
      errorDetail = 'Token inválido (problema na assinatura ou malformado).';
    }
    res.status(401).json({ error: 'Token inválido ou expirado.', details: errorDetail });
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
// Rota para redefinir senha com código de verificação
app.post(
  '/redefinir-senha-com-codigo',
  [
    body('email').trim().isEmail().withMessage('Formato de email inválido.').normalizeEmail(),
    body('codigo').isString().isLength({ min: 6, max: 6 }).withMessage('Código deve ter 6 dígitos.'),
    body('novaSenha')
      .isLength({ min: 8, max: 12 }).withMessage('A senha deve ter entre 8 e 12 caracteres.')
      .matches(/[A-Z]/).withMessage('A senha deve conter pelo menos 1 letra maiúscula.')
      .matches(/[0-9]/).withMessage('A senha deve conter pelo menos 1 número.')
      .matches(/[!@#$%^&*]/).withMessage('A senha deve conter pelo menos 1 caractere especial.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return the first error and its field
      const firstError = errors.array()[0];
      return res.status(400).json({ error: { message: firstError.msg, field: firstError.param } });
    }

    const { email, codigo, novaSenha } = req.body;

    try {
      const [userRows] = await connection.execute('SELECT * FROM Usuarios WHERE email = ?', [email]);
      if (userRows.length === 0) {
        return res.status(404).json({ error: { message: 'Usuário não encontrado.', field: 'email' } });
      }
      const user = userRows[0];

      const now = new Date();
      const [codeRows] = await connection.execute(
        'SELECT * FROM PasswordResetCodes WHERE userId = ? AND code = ? AND expiresAt > ?',
        [user.id, codigo, now]
      );

      if (codeRows.length === 0) {
        await logAudit(user.id, 'password_reset_invalid_code_attempt', { email, code: codigo });
        return res.status(400).json({ error: { field: 'codigo', message: 'Código inválido ou expirado.' } });
      }

      // Invalidar o código usado
      await connection.execute('DELETE FROM PasswordResetCodes WHERE userId = ? AND code = ?', [user.id, codigo]);

      const hashedPassword = await bcrypt.hash(novaSenha, 10);
      await connection.execute('UPDATE Usuarios SET senha = ? WHERE id = ?', [hashedPassword, user.id]);

      await logAudit(user.id, 'password_reset_with_code_success', { email });

      res.status(200).json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
      console.error('Erro no servidor ao redefinir senha com código:', error);
      // Attempt to get userId for logging, even if it's just from email if user object not yet fetched
      let logUserId = null;
      if (typeof user !== 'undefined' && user && user.id) {
        logUserId = user.id;
      } else {
          try {
            const [tempUserRows] = await connection.execute('SELECT id FROM Usuarios WHERE email = ?', [email]);
            if (tempUserRows.length > 0) logUserId = tempUserRows[0].id;
          } catch (e) { /* ignore lookup error for logging */ }
      }
      await logAudit(logUserId, 'password_reset_with_code_server_error', { email, code: codigo, error: error.message });
      res.status(500).json({ error: { message: 'Erro interno do servidor ao tentar redefinir a senha.' } });
    }
  }
);

// Rota para solicitar código de recuperação de senha
app.post(
  '/solicitar-codigo-recuperacao',
  [
    body('email').trim().isEmail().withMessage('Formato de email inválido.').normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return the first error message
      return res.status(400).json({ error: { message: errors.array()[0].msg, field: errors.array()[0].param } });
    }

    const { email } = req.body;

    try {
      const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE email = ?', [email]);
      if (rows.length === 0) {
        // Log a tentativa de recuperação para um email não existente, mas não informe ao usuário que o email não existe por segurança.
        // console.log(`Tentativa de recuperação de senha para email não cadastrado: ${email}`);
        // await logAudit(null, 'attempt_password_reset_nonexistent_email', { email });
        // Retorne uma mensagem genérica para evitar enumeração de usuários.
        // No entanto, para fins de depuração e feedback ao frontend, vamos retornar 404 por enquanto.
        // Em produção, considerar mudar para 200 com mensagem genérica.
        return res.status(404).json({ error: { message: 'Email não encontrado.', field: 'email' } });
      }

      const user = rows[0];
      const codigo = Math.floor(100000 + Math.random() * 900000).toString(); // Gera código de 6 dígitos
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Expira em 15 minutos

      // Armazenar Código no Banco (assumindo tabela PasswordResetCodes)
      // Primeiro, delete códigos antigos para este usuário
      await connection.execute('DELETE FROM PasswordResetCodes WHERE userId = ?', [user.id]);
      // Insira o novo código
      await connection.execute('INSERT INTO PasswordResetCodes (userId, code, expiresAt) VALUES (?, ?, ?)', [user.id, codigo, expiresAt]);

      // Enviar Email com o código
      if (!transporter) {
        console.error('ERRO FATAL: Transporter do Nodemailer não está configurado. Não é possível enviar email de recuperação.');
        // Mantém o código no log do console como fallback APENAS para desenvolvimento,
        // mas em produção isso seria um erro crítico que impede a recuperação.
        console.log(`FALLBACK (Sem Email): Código de recuperação para ${email}: ${codigo}`);
        // Para o usuário, a requisição pode falhar aqui ou prosseguir e ele pega o código do log.
        // Vamos optar por falhar para que o problema de configuração de email seja percebido.
        return res.status(500).json({ error: { message: 'Erro no servidor ao tentar enviar o código de recuperação. Por favor, tente mais tarde.' } });
      }

      const mailOptions = {
        from: `"TruePet Adopet" <${process.env.EMAIL_USER}>`, // Nome do remetente e email
        to: email, // Email do destinatário (usuário)
        subject: 'Seu Código de Recuperação de Senha - TruePet Adopet',
        text: `Olá ${user.nome || 'usuário'},

Seu código de recuperação de senha é: ${codigo}

Este código expira em 15 minutos.

Se você não solicitou esta recuperação, por favor ignore este email.

Atenciosamente,
Equipe TruePet Adopet`,
        html: `
          <p>Olá ${user.nome || 'usuário'},</p>
          <p>Seu código de recuperação de senha é: <strong>${codigo}</strong></p>
          <p>Este código expira em 15 minutos.</p>
          <p>Se você não solicitou esta recuperação, por favor ignore este email.</p>
          <p>Atenciosamente,<br>Equipe TruePet Adopet</p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de recuperação enviado com sucesso para: ${email}`);
        // A resposta de sucesso para o cliente já está mais abaixo na rota, mantenha como está.
        // res.status(200).json({ message: 'Código de recuperação enviado para o seu email.' });
      } catch (emailError) {
        console.error(`Erro ao enviar email de recuperação para ${email}:`, emailError);
        // Logar o código no console como fallback em caso de falha no envio do email
        console.log(`FALLBACK (Falha no Email): Código de recuperação para ${email}: ${codigo}`);
        // Informar ao usuário que houve um problema, mas o código pode estar no log do servidor se for ambiente de dev.
        // Ou pode-se optar por uma mensagem mais genérica.
        // Para este caso, vamos manter a mensagem genérica de erro 500 que o catch externo da rota já faria,
        // mas o log acima é importante.
        // Lançamos o erro para ser pego pelo catch geral da rota.
        throw emailError;
      }

      // Log de Auditoria
      await logAudit(user.id, 'request_password_reset_code', { email });

      res.status(200).json({ message: 'Código de recuperação enviado para o seu email.' });

    } catch (error) {
      console.error('Erro no servidor ao solicitar código de recuperação:', error);
      await logAudit(null, 'request_password_reset_code_server_error', { email, error: error.message });
      res.status(500).json({ error: { message: 'Erro interno do servidor ao tentar solicitar o código.' } });
    }
  }
);

// Rota para finalizar a redefinição de senha
app.post(
  '/redefinir-senha-final',
  [
    body('token').notEmpty().withMessage('Token é obrigatório'),
    body('novaSenha')
      .isLength({ min: 8, max: 12 }).withMessage('A senha deve ter entre 8 e 12 caracteres')
      .matches(/[A-Z]/).withMessage('A senha deve conter pelo menos 1 letra maiúscula')
      .matches(/[0-9]/).withMessage('A senha deve conter pelo menos 1 número')
      .matches(/[!@#$%^&*]/).withMessage('A senha deve conter pelo menos 1 caractere especial')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, novaSenha } = req.body;

    try {
      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        // Log específico para erro de JWT
        console.error('Erro ao verificar JWT:', jwtError.message);
        await logAudit(null, 'password_reset_invalid_token', { token, error: jwtError.message });
        return res.status(401).json({ error: { message: 'Token inválido ou expirado.' } });
      }

      const userId = decodedToken.id;
      const userEmail = decodedToken.email; // Email from token

      if (!userId) {
        // Should not happen if token structure is consistent
        console.error('ID do usuário não encontrado no token JWT após verificação bem-sucedida.');
        await logAudit(null, 'password_reset_missing_userid_in_token', { token });
        return res.status(401).json({ error: { message: 'Token inválido ou corrompido.' } });
      }

      const hashedPassword = await bcrypt.hash(novaSenha, 10);

      const [result] = await connection.execute(
        'UPDATE Usuarios SET senha = ? WHERE id = ?',
        [hashedPassword, userId]
      );

      if (result.affectedRows === 0) {
        await logAudit(userId, 'password_reset_user_not_found_or_update_failed', { email: userEmail });
        return res.status(404).json({ error: { message: 'Usuário não encontrado ou senha não pôde ser atualizada.' } });
      }

      await logAudit(userId, 'password_reset_success', { email: userEmail });

      res.status(200).json({ message: 'Senha redefinida com sucesso!' });

    } catch (error) {
      console.error('Erro no servidor ao redefinir senha:', error);
      // Log genérico para outros erros
      await logAudit(req.body.token ? jwt.decode(req.body.token)?.id : null, 'password_reset_server_error', { error: error.message });
      res.status(500).json({ error: { message: 'Erro interno do servidor ao tentar redefinir a senha.' } });
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
      const { nome, telefone, animal, mensagem } = req.body; // animal_id pode ser pego se necessário para logAudit
      const animal_id = req.body.animal_id || null; // Garante que animal_id exista para o log, mesmo que opcional

      // 1. Obter email do usuário logado
      const perfilUsuario = await clientService.perfilUsuario(req.userId);
      if (!perfilUsuario || !perfilUsuario.email) {
        await logAudit(req.userId, 'send_message_fail_no_user_email', { nome_contato: nome, animal_id });
        return res.status(404).json({ erro: 'Usuário ou email do usuário não encontrado para responder.' });
      }
      const emailRemetente = perfilUsuario.email;

      // 2. Verificar se o transporter do Nodemailer está pronto
      if (!transporter) {
        console.error('ERRO: Transporter do Nodemailer não está configurado. Não é possível enviar mensagem de contato.');
        await logAudit(req.userId, 'send_message_fail_nodemailer_not_configured', { nome_contato: nome, destinatario: process.env.EMAIL_USER });
        return res.status(500).json({ erro: 'Erro no servidor ao tentar enviar a mensagem. O sistema de email não está configurado.' });
      }

      // 3. Construir mailOptions
      const mailOptions = {
        from: `"${perfilUsuario.nome || 'Usuário TruePet'}" <${process.env.EMAIL_USER}>`, // Remetente é o sistema/app, mas pode mostrar nome do usuário
        to: process.env.EMAIL_USER, // Envia para truepetservice@gmail.com
        replyTo: emailRemetente,    // Para que a TruePet possa responder diretamente ao usuário
        subject: `Nova mensagem sobre o animal: ${animal} de ${nome}`,
        text: `
Nome do Contato: ${nome}
Telefone: ${telefone}
Email para Resposta: ${emailRemetente}
Nome do Animal de Interesse: ${animal}

Mensagem:
${mensagem}
        `,
        html: `
          <h3>Nova Mensagem de Contato - TruePet</h3>
          <p><strong>Nome do Contato:</strong> ${nome}</p>
          <p><strong>Telefone:</strong> ${telefone}</p>
          <p><strong>Email para Resposta:</strong> <a href="mailto:${emailRemetente}">${emailRemetente}</a></p>
          <hr>
          <p><strong>Animal de Interesse:</strong> ${animal}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${mensagem.replace(/\n/g, '<br>')}</p>
        `
      };

      // 4. Enviar o email
      await transporter.sendMail(mailOptions);
      console.log(`Mensagem de contato de ${emailRemetente} sobre ${animal} enviada para ${process.env.EMAIL_USER}`);

      // 5. Log de Auditoria (adaptado)
      await logAudit(req.userId, 'send_contact_message_success', {
        remetente: emailRemetente,
        destinatario: process.env.EMAIL_USER, // O email da TruePet que recebeu
        animal: animal,
        nome_contato: nome
      });

      // 6. Responder ao Frontend
      res.status(200).json({ mensagem: 'Mensagem enviada com sucesso!' });

    } catch (error) {
      console.error('Erro ao processar /mensagem:', error);
      // Tenta obter userId para o log mesmo em caso de erro antes da obtenção do perfil
      const userIdForAudit = req.userId || null;
      await logAudit(userIdForAudit, 'send_contact_message_error', { error: error.message, nome_contato: req.body.nome, animal_nome: req.body.animal });
      res.status(500).json({ erro: 'Erro interno do servidor ao tentar enviar a mensagem.' });
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