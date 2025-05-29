import { validaCampo } from './validacao.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM da tela de recuperação de senha totalmente carregado');

  const formulario = document.querySelector('[data-formRecuperarSenha]');
  if (!formulario) {
    console.error('Erro: Formulário [data-formRecuperarSenha] não encontrado');
    return;
  }
  console.log('Formulário de recuperação de senha encontrado:', formulario);

  const inputEmail = formulario.querySelector("[data-type='email']");

  const limparMensagensErro = () => {
    const erroSpans = formulario.querySelectorAll('.input-mensagem-erro');
    erroSpans.forEach(span => (span.textContent = ''));
    const containers = formulario.querySelectorAll('.input-container');
    containers.forEach(container => {
      container.classList.remove('input-container--invalido', 'input-container--valido');
    });
  };

  limparMensagensErro();

  if (inputEmail) inputEmail.setCustomValidity('');

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Evento submit disparado na tela de recuperação de senha');

    limparMensagensErro();

    let temErrosFrontend = false;

    if (inputEmail && validaCampo(inputEmail)) temErrosFrontend = true;

    if (temErrosFrontend) return;

    const email = inputEmail.value;
    console.log('Enviando solicitação de recuperação para o email:', email);

    try {
      const response = await fetch('http://localhost:3000/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const container = inputEmail.parentElement;
        const erroSpan = container.querySelector('.input-mensagem-erro');
        if (erroSpan) {
          erroSpan.textContent = 'Link de recuperação enviado com sucesso! Verifique seu email.';
          erroSpan.style.color = 'green'; // Mensagem de sucesso em verde
          container.classList.add('input-container--valido');
        }
      } else {
        const errorData = await response.json();
        const container = inputEmail.parentElement;
        const erroSpan = container.querySelector('.input-mensagem-erro');
        if (erroSpan) {
          erroSpan.textContent = errorData.error.message || 'Erro ao enviar o link de recuperação';
          container.classList.add('input-container--invalido');
        }
      }
    } catch (erro) {
      console.error('Erro ao enviar solicitação de recuperação:', erro);
      const container = inputEmail.parentElement;
      const erroSpan = container.querySelector('.input-mensagem-erro');
      if (erroSpan) {
        erroSpan.textContent = 'Erro ao conectar ao servidor';
        container.classList.add('input-container--invalido');
      }
    }
  });
});