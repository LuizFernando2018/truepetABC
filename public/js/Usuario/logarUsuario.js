import { validaCampo } from './validacao.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM da tela de login totalmente carregado');

  const formulario = document.querySelector('[data-formLogin]');
  if (!formulario) {
    console.error('Erro: Formulário [data-formLogin] não encontrado');
    return;
  }
  console.log('Formulário de login encontrado:', formulario);

  const inputs = {
    email: formulario.querySelector("[data-type='email']"),
    senha: formulario.querySelector("[data-type='senha']")
  };

  const limparMensagensErro = () => {
    const erroSpans = formulario.querySelectorAll('.input-mensagem-erro');
    erroSpans.forEach(span => (span.textContent = ''));
    const containers = formulario.querySelectorAll('.input-container');
    containers.forEach(container => {
      container.classList.remove('input-container--invalido', 'input-container--valido');
    });
  };

  limparMensagensErro();

  if (inputs.email) inputs.email.setCustomValidity('');
  if (inputs.senha) inputs.senha.setCustomValidity('');

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Evento submit disparado na tela de login');

    limparMensagensErro();

    let temErrosFrontend = false;

    if (inputs.email && validaCampo(inputs.email)) temErrosFrontend = true;
    if (inputs.senha && validaCampo(inputs.senha)) temErrosFrontend = true;

    if (temErrosFrontend) return;

    const email = inputs.email.value;
    const senha = inputs.senha.value;

    console.log('Dados enviados para login:', { email, senha });

    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      if (response.ok) {
        const { token, userId } = await response.json();
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId);

        const payload = JSON.parse(atob(token.split('.')[1]));
        const tipoUsuario = payload.tipo;

        if (tipoUsuario === 'ong') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'animais.html';
        }
      } else {
        const errorData = await response.json();
        limparMensagensErro();

        if (errorData.error && errorData.error.field === 'twoFactor') {
          const twoFactorContainer = document.createElement('div');
          twoFactorContainer.innerHTML = `
            <label>Código 2FA</label>
            <input type="text" id="twoFactorCode" placeholder="Digite o código do autenticador">
            <span class="input-mensagem-erro"></span>
          `;
          formulario.appendChild(twoFactorContainer);

          const submitButton = formulario.querySelector('button[type="submit"]');
          submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const twoFactorCode = document.getElementById('twoFactorCode').value;
            const response2FA = await fetch('http://localhost:3000/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, senha, twoFactorCode })
            });
            if (response2FA.ok) {
              const { token, userId } = await response2FA.json();
              localStorage.setItem('token', token);
              localStorage.setItem('userId', userId);
              const payload = JSON.parse(atob(token.split('.')[1]));
              const tipoUsuario = payload.tipo;
              if (tipoUsuario === 'ong') {
                window.location.href = 'admin.html';
              } else {
                window.location.href = 'animais.html';
              }
            } else {
              const errorData2FA = await response2FA.json();
              const erroSpan = twoFactorContainer.querySelector('.input-mensagem-erro');
              erroSpan.textContent = errorData2FA.error.message || 'Erro ao verificar código 2FA';
            }
          });
        } else if (errorData.error && errorData.error.field) {
          // Exibir erro apenas no campo correspondente
          const field = errorData.error.field;
          const message = errorData.error.message;
          const input = inputs[field];
          if (input) {
            const container = input.parentElement;
            const erroSpan = container.querySelector('.input-mensagem-erro');
            if (erroSpan) {
              erroSpan.textContent = message;
              container.classList.add('input-container--invalido');
            }
          }
        }
      }
    } catch (erro) {
      console.error('Erro ao fazer login:', erro);
      // Tratar erro de conexão ou inesperado
      [inputs.email, inputs.senha].forEach(input => {
        if (input) {
          const container = input.parentElement;
          const erroSpan = container.querySelector('.input-mensagem-erro');
          if (erroSpan) {
            erroSpan.textContent = 'Erro ao conectar ao servidor';
            container.classList.add('input-container--invalido');
          }
        }
      });
    }
  });
});
$('#acessibilidade').load('../acessibilidade.html');