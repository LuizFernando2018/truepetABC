console.log('Script perfilUsuario.js carregado com sucesso'); // Log inicial

import { clientService } from "../controllerLogin.js";

console.log('clientService importado:', clientService); // Log para verificar o import

const defineIdGeral = () => {
  const verificarID = new URL(window.location);
  const id = verificarID.searchParams.get('id');
  console.log('ID extraído da URL:', id); // Log do ID
  return id;
};

const verificaTipoUsuario = () => {
  const token = localStorage.getItem('token');
  console.log('Token encontrado no localStorage:', token); // Log do token
  if (!token) {
    console.log('Token não encontrado, redirecionando para login.html');
    window.location.href = 'login.html';
    return null;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Payload do token:', payload); // Log do payload
    return payload.tipo;
  } catch (erro) {
    console.error('Erro ao decodificar token:', erro);
    window.location.href = 'login.html';
    return null;
  }
};

const mostraDados = (nome, telefone, cidade, sobre) => {
  const perfil = document.createElement('div');
  perfil.innerHTML = `
    <label for="foto" class="formulario__campo">Foto</label>
    <figure class="formulario__fotoperfil">
      <img src="./assets/img/user.png" alt="" class="formulario__fotoperfil--foto">
      <figcaption class="formulario__fotoperfil--legenda">Clique na foto para editar</figcaption>
    </figure>
    <div class="input-container">
      <label for="nome" class="formulario__campo">Nome</label>
      <input type="text" data-type="nome" class="formulario__input input" id="nome" placeholder="Insira seu nome completo" value="${nome || ''}" required>
      <span class="input-mensagem-erro">Campo inválido</span>
    </div>
    <div class="input-container">
      <label for="fone" class="formulario__campo">Telefone</label>
      <input type="tel" data-type="telefone" class="formulario__input input" id="phone" placeholder="55 11 XXXXXXXXX" value="${telefone || ''}">
      <span class="input-mensagem-erro">Campo inválido</span>
    </div>
    <label for="cidade" class="formulario__campo">Cidade</label>
    <input data-type="cidade" type="text" class="formulario__input input" id="cidade" placeholder="São Paulo" value="${cidade || ''}">
    <label for="mensagem" class="formulario__campo">Sobre</label>
    <textarea data-type="sobre" class="formulario__textarea" id="mensagem" rows="6" cols="50" placeholder="At vero eos et accusamus et iusto odio...">${sobre || ''}</textarea>
    <button id="enableTwoFactor">Ativar Verificação 2FA</button>
    <div id="twoFactorQr"></div>
  `;
  return perfil;
};

const id = defineIdGeral();

const formulario = document.querySelector('[data-formPerfil]');
console.log('Formulário encontrado:', formulario); // Log 1: Verifica se o formulário é encontrado

const exibeDados = async () => {
  // Removido o try/catch temporariamente para expor erros
  const tipo = verificaTipoUsuario();
  console.log('Tipo de usuário:', tipo); // Log do tipo
  if (!tipo) return;

  if (window.location.pathname.includes('admin.html') && tipo !== 'admin') {
    console.log('Usuário não é admin, redirecionando para perfil.html');
    window.location.href = 'perfil.html';
    return;
  }

  if (!id) throw new Error('ID do usuário não encontrado na URL');
  console.log('Buscando perfil do usuário com ID:', id); // Log antes da chamada
  const usuario = await clientService.perfilUsuario(id);
  console.log('Usuário retornado:', usuario); // Log do usuário retornado
  if (!usuario) throw new Error('Usuário não encontrado');

  const botaoExistente = formulario.querySelector('button[type="submit"]');
  console.log('Botão existente:', botaoExistente); // Log 2: Verifica se o botão submit é encontrado
  const perfilDiv = mostraDados(usuario.nome, usuario.telefone, usuario.cidade, usuario.sobre);
  console.log('Perfil div criado:', perfilDiv); // Log 3: Verifica se o div foi criado
  formulario.appendChild(perfilDiv); // Simplificado para appendChild

  const enableTwoFactorBtn = document.getElementById('enableTwoFactor');
  console.log('Botão enableTwoFactor:', enableTwoFactorBtn); // Log 4: Verifica se o botão 2FA foi adicionado
  if (enableTwoFactorBtn) {
    enableTwoFactorBtn.addEventListener('click', async () => {
      const response = await fetch('http://localhost:3000/enable-two-factor', {
        method: 'POST',
        headers: { 'Authorization': localStorage.getItem('token') }
      });
      if (response.ok) {
        const { qrCode } = await response.json();
        const qrDiv = document.getElementById('twoFactorQr');
        qrDiv.innerHTML = `<img src="${qrCode}" alt="QR Code 2FA">`;
        qrDiv.innerHTML += '<p>Escanear este QR code com um aplicativo autenticador (ex.: Google Authenticator).</p>';
      }
    });
  } else {
    console.error('Botão enableTwoFactor não encontrado');
  }
};

$('#acessibilidade').load('../acessibilidade.html');
exibeDados();
