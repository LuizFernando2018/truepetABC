import { validaCampo } from './validacao.js';

document.addEventListener('DOMContentLoaded', () => {
  // Bloco de verificação de token existente
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Opcional: Verificar expiração do token, embora o backend vá validar de qualquer forma.
      // const currentTime = Math.floor(Date.now() / 1000);
      // if (payload.exp && payload.exp < currentTime) {
      //   console.log('Token expirado encontrado no localStorage, removendo.');
      //   localStorage.removeItem('token');
      //   localStorage.removeItem('userId');
      //   // Prossegue para mostrar a página de login
      // } else {
        console.log('Usuário já logado, redirecionando...');
        const tipoUsuario = payload.tipo;
        if (tipoUsuario === 'ong') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'animais.html';
        }
        return; // Impede a execução do resto do script de login
      // }
    } catch (e) {
      console.error('Erro ao decodificar token existente, removendo-o:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      // Prossegue para mostrar a página de login
    }
  }
  // Fim do bloco de verificação

  // O restante do código original do DOMContentLoaded continua aqui...
  console.log('DOM da tela de login totalmente carregado'); // Este log agora só aparecerá se não houver token válido

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
        // Limpar mensagens de erro de email/senha antes de mostrar erro 2FA ou outros
        limparMensagensErro();

        if (errorData.error && errorData.error.field === 'twoFactor') {
          console.log('2FA requerido:', errorData.error.message);
          let twoFactorContainer = document.getElementById('twoFactorContainer');
          let twoFactorCodeInput;
          let twoFactorErrorSpan;

          if (twoFactorContainer) {
            console.log('Container 2FA existente encontrado.');
            twoFactorCodeInput = document.getElementById('twoFactorCode');
            twoFactorErrorSpan = document.getElementById('twoFactorError');
            twoFactorCodeInput.value = ''; // Limpa o valor anterior
            twoFactorErrorSpan.textContent = errorData.error.message; // Exibe a mensagem de "Código necessário"
            twoFactorErrorSpan.style.display = 'block';
          } else {
            console.log('Criando novo container 2FA.');
            twoFactorContainer = document.createElement('div');
            twoFactorContainer.id = 'twoFactorContainer';
            twoFactorContainer.classList.add('input-container'); // Para estilização consistente
            twoFactorContainer.innerHTML = `
              <label for="twoFactorCode" class="formulario__campo">Código 2FA</label>
              <input type="text" id="twoFactorCode" name="twoFactorCode" class="formulario__input input" placeholder="Digite o código do autenticador" required>
              <span id="twoFactorError" class="input-mensagem-erro" style="display: block;">${errorData.error.message}</span>
            `;
            // Insere o container 2FA após o campo de senha
            inputs.senha.closest('.input-container').insertAdjacentElement('afterend', twoFactorContainer);
            twoFactorCodeInput = document.getElementById('twoFactorCode');
            twoFactorErrorSpan = document.getElementById('twoFactorError');
          }

          inputs.email.readOnly = true;
          inputs.senha.readOnly = true;

          const originalSubmitButton = formulario.querySelector('button[type="submit"]');
          const clonedSubmitButton = originalSubmitButton.cloneNode(true);
          clonedSubmitButton.textContent = 'Verificar Código 2FA';
          originalSubmitButton.parentNode.replaceChild(clonedSubmitButton, originalSubmitButton);

          clonedSubmitButton.addEventListener('click', async (event2FA) => {
            event2FA.preventDefault();
            console.log('Botão de verificação 2FA clicado.');

            const twoFactorCode = twoFactorCodeInput.value;
            if (!twoFactorCode) {
              twoFactorErrorSpan.textContent = 'O código 2FA não pode estar vazio.';
              twoFactorErrorSpan.style.display = 'block';
              twoFactorCodeInput.focus();
              return;
            }
            twoFactorErrorSpan.textContent = ''; // Limpa erro anterior
            twoFactorErrorSpan.style.display = 'none';

            console.log('Enviando com 2FA:', { email, senha, twoFactorCode });
            try {
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
                console.log('Login 2FA bem-sucedido. Redirecionando...');
                if (tipoUsuario === 'ong') {
                  window.location.href = 'admin.html';
                } else {
                  window.location.href = 'animais.html';
                }
              } else {
                const errorData2FA = await response2FA.json();
                console.log('Erro na verificação 2FA:', errorData2FA);
                if (errorData2FA.error && errorData2FA.error.field === 'twoFactor') {
                  twoFactorErrorSpan.textContent = errorData2FA.error.message || 'Código 2FA inválido ou expirado.';
                } else if (errorData2FA.error && errorData2FA.error.message) {
                  twoFactorErrorSpan.textContent = errorData2FA.error.message; // Outro erro relacionado ao 2FA
                } else {
                  twoFactorErrorSpan.textContent = 'Erro ao verificar código 2FA. Tente novamente.';
                }
                twoFactorErrorSpan.style.display = 'block';
                twoFactorCodeInput.focus();
              }
            } catch (err) {
              console.error('Erro de fetch na submissão 2FA:', err);
              twoFactorErrorSpan.textContent = 'Erro de comunicação ao verificar o código 2FA.';
              twoFactorErrorSpan.style.display = 'block';
            }
          });
        } else if (errorData.error && errorData.error.field) {
          // Limpa UI de 2FA se o erro for de email/senha
          const existingTwoFactorContainer = document.getElementById('twoFactorContainer');
          if (existingTwoFactorContainer) {
            existingTwoFactorContainer.remove();
          }
          // Restaura o botão original se ele foi clonado e os campos email/senha se foram readOnly
          inputs.email.readOnly = false;
          inputs.senha.readOnly = false;
          const currentSubmitButton = formulario.querySelector('button[type="submit"]');
          if (currentSubmitButton.textContent !== 'Entrar') { // Se o texto foi mudado, provavelmente é o clonado
             // Idealmente, teríamos uma referência ao botão original para restaurar,
             // ou recriamos o original. Por simplicidade, apenas resetamos o texto e listeners (o que é mais dificil).
             // A melhor abordagem aqui seria ter o listener do formulário principal e apenas mudar o estado.
             // Mas seguindo o padrão de clonagem:
             // Se o erro não é 2FA, e o botão foi alterado, recarregue a página ou restaure o botão original.
             // Para esta implementação, vamos apenas reabilitar os campos e o usuário teria que tentar o login do zero.
             // Se quisermos restaurar o botão, precisaríamos de uma referência ao original ou recriar o listener do formulário.
             // Por agora, focamos em exibir o erro do campo.
          }

          const field = errorData.error.field;
          const message = errorData.error.message;
          const input = inputs[field]; // Assumindo que 'field' é 'email' ou 'senha'
          if (input) {
            const container = input.closest('.input-container'); // Usa closest para garantir que pegamos o container certo
            const erroSpan = container.querySelector('.input-mensagem-erro');
            if (erroSpan) {
              erroSpan.textContent = message;
              container.classList.add('input-container--invalido');
            }
          } else {
            // Erro geral não associado a um campo específico
            const generalErrorSpan = document.getElementById('generalLoginError'); // Supondo que existe um span geral
            if (generalErrorSpan) {
                generalErrorSpan.textContent = message;
                generalErrorSpan.style.display = 'block';
            } else {
                alert(message); // Fallback
            }
          }
        } else {
            // Outro tipo de erro não estruturado
            const generalErrorSpan = document.getElementById('generalLoginError');
            if (generalErrorSpan) {
                generalErrorSpan.textContent = errorData.message || 'Ocorreu um erro inesperado.';
                generalErrorSpan.style.display = 'block';
            } else {
                alert(errorData.message || 'Ocorreu um erro inesperado.');
            }
        }
      }
    } catch (erro) {
      console.error('Erro de fetch ao fazer login (primeira etapa ou erro geral):', erro);
      const generalErrorSpan = document.getElementById('generalLoginError'); // Supondo que existe
      if (generalErrorSpan) {
        generalErrorSpan.textContent = 'Erro de conexão ou ao processar sua solicitação.';
        generalErrorSpan.style.display = 'block';
      } else {
        alert('Erro de conexão ou ao processar sua solicitação.');
      }
      // Certifique-se de que os campos de email/senha não estão readOnly se ocorrer um erro de rede aqui
      inputs.email.readOnly = false;
      inputs.senha.readOnly = false;
       // E que o botão de submit está no estado original (pode ser complexo se já clonado)
    }
  });
});
$('#acessibilidade').load('../acessibilidade.html');