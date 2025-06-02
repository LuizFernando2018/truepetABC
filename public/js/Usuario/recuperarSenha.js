import { validaCampo } from './validacao.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-formRecuperarSenha]');
    if (!form) {
        console.error('Formulário [data-formRecuperarSenha] não encontrado.');
        return;
    }

    const inputEmail = form.querySelector("#email");
    const btnEnviarCodigo = form.querySelector("#btnEnviarCodigo");

    const fase1Recuperacao = form.querySelector("#fase1Recuperacao");
    const fase2Recuperacao = form.querySelector("#fase2Recuperacao");

    const inputCodigo = form.querySelector("#codigoVerificacao");
    const inputNovaSenha = form.querySelector("#novaSenha");
    const inputConfirmaNovaSenha = form.querySelector("#confirmaNovaSenha");

    const mensagemGeral = document.getElementById("mensagemGeralRecuperacao");

    const allInputs = [inputEmail, inputCodigo, inputNovaSenha, inputConfirmaNovaSenha];

    function limparMensagensErro() {
        if (mensagemGeral) {
            mensagemGeral.textContent = '';
            mensagemGeral.className = 'input-mensagem-erro';
            mensagemGeral.style.color = '';
        }
        allInputs.forEach(input => {
            if (input) {
                const container = input.parentElement;
                const erroSpan = container.querySelector('.input-mensagem-erro');
                if (erroSpan) {
                    erroSpan.textContent = '';
                }
                container.classList.remove('input-container--invalido');
                container.classList.remove('input-container--valido');
            }
        });
    }

    limparMensagensErro();
    if(fase2Recuperacao) fase2Recuperacao.style.display = 'none';
    if(fase1Recuperacao) fase1Recuperacao.style.display = 'block';


    if (btnEnviarCodigo) {
        btnEnviarCodigo.addEventListener('click', async (e) => {
            e.preventDefault();
            limparMensagensErro();

            const emailError = validaCampo(inputEmail);
            if (emailError) {
                return;
            }

            btnEnviarCodigo.disabled = true;
            btnEnviarCodigo.textContent = 'Enviando...';

            try {
                const response = await fetch('http://localhost:3000/solicitar-codigo-recuperacao', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: inputEmail.value })
                });
                const data = await response.json();

                if (response.ok) {
                    if (mensagemGeral) {
                        mensagemGeral.textContent = data.message || 'Código de verificação enviado para seu email.';
                        mensagemGeral.style.color = 'green';
                    }
                    if(fase1Recuperacao) fase1Recuperacao.style.display = 'none';
                    if(fase2Recuperacao) fase2Recuperacao.style.display = 'block';
                    if(inputCodigo) inputCodigo.focus();
                } else {
                    if (mensagemGeral) {
                        mensagemGeral.textContent = (data.error && data.error.message) || data.message || 'Erro ao solicitar o código.';
                        mensagemGeral.style.color = 'red';
                    }
                    if (response.status === 404 || (data.error && data.error.field === 'email')) {
                        const emailContainer = inputEmail.parentElement;
                        const emailErrorSpan = emailContainer.querySelector('.input-mensagem-erro');
                        if(emailErrorSpan) emailErrorSpan.textContent = (data.error && data.error.message) || 'Email não encontrado.';
                        emailContainer.classList.add('input-container--invalido');
                    }
                }
            } catch (erro) {
                console.error("Erro de conexão:", erro);
                if (mensagemGeral) {
                    mensagemGeral.textContent = 'Erro de conexão ao solicitar código. Tente novamente.';
                    mensagemGeral.style.color = 'red';
                }
            } finally {
                btnEnviarCodigo.disabled = false;
                btnEnviarCodigo.textContent = 'Enviar Código';
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => { // This is triggered by btnRedefinirSenha
            e.preventDefault();
            limparMensagensErro();

            let isValid = true;
            const email = inputEmail.value;
            const codigo = inputCodigo.value;
            const novaSenha = inputNovaSenha.value;
            const confirmaSenha = inputConfirmaNovaSenha.value;

            if (!codigo) {
                const codigoContainer = inputCodigo.parentElement;
                const codigoErrorSpan = codigoContainer.querySelector('.input-mensagem-erro');
                if(codigoErrorSpan) codigoErrorSpan.textContent = 'O código de verificação é obrigatório.';
                codigoContainer.classList.add('input-container--invalido');
                isValid = false;
            }

            if (validaCampo(inputNovaSenha)) {
                isValid = false;
            }

            if (novaSenha !== confirmaSenha) {
                const confirmaSenhaContainer = inputConfirmaNovaSenha.parentElement;
                const confirmaSenhaErrorSpan = confirmaSenhaContainer.querySelector('.input-mensagem-erro');
                if(confirmaSenhaErrorSpan) confirmaSenhaErrorSpan.textContent = 'As senhas não coincidem.';
                confirmaSenhaContainer.classList.add('input-container--invalido');
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            const submitButton = form.querySelector('#btnRedefinirSenha');
            if(submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Redefinindo...';
            }

            try {
                const response = await fetch('http://localhost:3000/redefinir-senha-com-codigo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, codigo, novaSenha })
                });
                const data = await response.json();

                if (response.ok) {
                    if (mensagemGeral) {
                        mensagemGeral.textContent = data.message || 'Senha redefinida com sucesso! Você já pode fazer o login.';
                        mensagemGeral.style.color = 'green';
                    }
                    form.querySelectorAll('input, button').forEach(el => el.disabled = true);
                    if(fase2Recuperacao) fase2Recuperacao.style.display = 'none';
                } else {
                    if (mensagemGeral) {
                        mensagemGeral.textContent = (data.error && data.error.message) || data.message || 'Erro ao redefinir a senha.';
                        mensagemGeral.style.color = 'red';
                    }
                    if (data.error && data.error.field === 'codigo') {
                        const codigoContainer = inputCodigo.parentElement;
                        const codigoErrorSpan = codigoContainer.querySelector('.input-mensagem-erro');
                        if(codigoErrorSpan) codigoErrorSpan.textContent = (data.error && data.error.message) || 'Código inválido ou expirado.';
                        codigoContainer.classList.add('input-container--invalido');
                        if(inputCodigo) inputCodigo.focus();
                    }
                }
            } catch (erro) {
                console.error("Erro de conexão:", erro);
                if (mensagemGeral) {
                    mensagemGeral.textContent = 'Erro de conexão ao redefinir senha. Tente novamente.';
                    mensagemGeral.style.color = 'red';
                }
            } finally {
                 if(submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Redefinir Senha';
                 }
            }
        });
    }

    // Blur listeners for proactive validation
    if (inputEmail) {
        inputEmail.addEventListener('blur', () => {
            if(inputEmail.value && !inputEmail.disabled) validaCampo(inputEmail);
        });
    }
    if (inputNovaSenha) {
        inputNovaSenha.addEventListener('blur', () => {
             if(inputNovaSenha.value) validaCampo(inputNovaSenha);
        });
    }
    if (inputConfirmaNovaSenha) {
        inputConfirmaNovaSenha.addEventListener('blur', () => {
            if (!inputConfirmaNovaSenha.value && !inputNovaSenha.value) return;

            const container = inputConfirmaNovaSenha.parentElement;
            const erroSpan = container.querySelector('.input-mensagem-erro');

            if (inputNovaSenha.value !== inputConfirmaNovaSenha.value) {
                if(erroSpan) erroSpan.textContent = 'As senhas não coincidem.';
                container.classList.add('input-container--invalido');
                container.classList.remove('input-container--valido');
            } else {
                if (erroSpan && (erroSpan.textContent === 'As senhas não coincidem.')) {
                     erroSpan.textContent = '';
                }
                if(inputConfirmaNovaSenha.value) validaCampo(inputConfirmaNovaSenha);
            }
        });
    }
});