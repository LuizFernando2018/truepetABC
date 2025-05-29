import { connection } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import speakeasy from 'speakeasy';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  console.error('Erro: JWT_SECRET não está definido no arquivo .env');
  throw new Error('JWT_SECRET não configurado. Verifique o arquivo .env.');
}

const clientService = {
  async perfilUsuario(id) {
    const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async criarUsuario(nome, email, senha, tipo = 'comum') {
    try {
      console.log('Tentando criar usuário:', { nome, email, senha, tipo });
      const [existing] = await connection.execute('SELECT * FROM Usuarios WHERE email = ?', [email]);
      if (existing.length > 0) {
        throw { error: { field: 'email', message: 'Email já cadastrado' } };
      }
      const hashedPassword = await bcrypt.hash(senha, 10);
      console.log('Senha hasheada:', hashedPassword);
      const [result] = await connection.execute(
        'INSERT INTO Usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
        [nome, email, hashedPassword, tipo]
      );
      console.log('Usuário criado com sucesso:', { id: result.insertId, nome, email, tipo });
      return { id: result.insertId, nome, email, tipo };
    } catch (err) {
      console.error('Erro ao criar usuário no banco:', err.message);
      throw { error: { field: 'general', message: 'Erro ao criar usuário no banco: ' + err.message } };
    }
  },

  async enableTwoFactorAuthentication(userId) {
    const secret = speakeasy.generateSecret({
      name: 'TruePet:' + userId,
    });
    await connection.execute(
      'UPDATE Usuarios SET twoFactorSecret = ?, twoFactorEnabled = TRUE WHERE id = ?',
      [secret.base32, userId]
    );
    return secret.otpauth_url; // Retorna a URL para gerar o QR code
  },

  async verifyTwoFactorCode(userId, code) {
    const [rows] = await connection.execute('SELECT twoFactorSecret FROM Usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) throw { error: { field: 'general', message: 'Usuário não encontrado' } };
    const secret = rows[0].twoFactorSecret;
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 1, // Permite 1 janela de tempo (30 segundos) de tolerância
    });
    return verified;
  },

  async logarUsuario(email, senha, twoFactorCode = null) {
    console.log('Tentando logar usuário com email:', email, 'e senha fornecida:', senha);
    try {
      const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE email = ?', [email]);
      if (rows.length === 0) {
        console.log('Email não encontrado:', email);
        throw { error: { field: 'email', message: 'Email não encontrado' } };
      }
      const user = rows[0];
      console.log('Usuário encontrado no banco:', { id: user.id, email: user.email, senhaArmazenada: user.senha });

      const isValid = await bcrypt.compare(senha, user.senha);
      console.log('Comparação de senha:', { senhaFornecida: senha, senhaArmazenada: user.senha, isValid });
      if (!isValid) {
        console.log('Senha incorreta para email:', email);
        throw { error: { field: 'senha', message: 'Senha incorreta' } };
      }

      if (user.twoFactorEnabled && !twoFactorCode) {
        throw { error: { field: 'twoFactor', message: 'Código de verificação de dois fatores necessário' } };
      }

      if (user.twoFactorEnabled && twoFactorCode) {
        const verified = await this.verifyTwoFactorCode(user.id, twoFactorCode);
        if (!verified) {
          throw { error: { field: 'twoFactor', message: 'Código de verificação inválido ou expirado' } };
        }
      }

      const tipo = user.tipo;
      console.log('Gerando token com tipo:', tipo);
      const token = jwt.sign({ id: user.id, tipo: tipo }, SECRET_KEY, { expiresIn: '1h' });
      console.log('Login bem-sucedido, token gerado para usuário:', user.id);

      await connection.execute(
        'INSERT INTO AuditLogs (userId, action) VALUES (?, ?)',
        [user.id, 'login']
      );

      return { token, userId: user.id };
    } catch (err) {
      console.error('Erro ao logar usuário:', err.message);
      if (err.error && err.error.field) {
        throw err; // Re-lança o erro estruturado
      } else {
        throw { error: { field: 'general', message: 'Erro ao fazer login' } };
      }
    }
  },

  async lerUsuario(id) {
    const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async atualizarUsuario(usuario) {
    await connection.execute(
      'UPDATE Usuarios SET nome = ?, telefone = ?, cidade = ?, sobre = ? WHERE id = ?',
      [usuario.nome, usuario.telefone || null, usuario.cidade || null, usuario.sobre || null, usuario.id]
    );
    return usuario;
  }
};

export { clientService };