import { validaCampo, validaConfirmaSenha } from './validacao.js';

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
      //   // Prossegue para mostrar a página de cadastro
      // } else {
        console.log('Usuário já logado, redirecionando da página de cadastro...');
        const tipoUsuario = payload.tipo;
        if (tipoUsuario === 'ong') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'animais.html';
        }
        return; // Impede a execução do resto do script de cadastro
      // }
    } catch (e) {
      console.error('Erro ao decodificar token existente na página de cadastro, removendo-o:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      // Prossegue para mostrar a página de cadastro
    }
  }
  // Fim do bloco de verificação

  // O restante do código original do DOMContentLoaded continua aqui...
  console.log('DOM totalmente carregado'); // Este log agora só aparecerá se não houver token válido

  const formulario = document.querySelector('[data-formCadastro]');
    if (!formulario) {
        console.error('Erro: Formulário [data-formCadastro] não encontrado');
        alert('Erro: Formulário não encontrado. Verifique o HTML.');
        return;
    }
    console.log('Formulário encontrado:', formulario);
    console.log('HTML do formulário:', formulario.innerHTML);

    const inputs = {
        nome: formulario.querySelector("[data-type='nome']"),
        email: formulario.querySelector("[data-type='email']"),
        senha: formulario.querySelector("[data-type='senha']"),
        confirmaSenha: document.getElementById('confirmaSenha')
    };

    Object.keys(inputs).forEach(key => {
        if (!inputs[key]) {
            console.error(`Erro: Input ${key} não encontrado no DOM. Verificando todos os elementos...`);
            const allInputs = document.querySelectorAll('input');
            console.log(`Todos os inputs encontrados:`, Array.from(allInputs).map(input => ({
                id: input.id,
                dataType: input.getAttribute('data-type'),
                class: input.className
            })));
            console.log('HTML completo do body:', document.body.innerHTML);
        } else {
            console.log(`Input ${key} encontrado:`, inputs[key]);
        }
    });

    formulario.addEventListener('submit', async (e) => {
        console.log('Evento submit disparado');
        e.preventDefault();

        const limparMensagensErro = () => {
            const erroSpans = formulario.querySelectorAll('.input-mensagem-erro');
            erroSpans.forEach(span => (span.textContent = ''));
            const containers = formulario.querySelectorAll('.input-container');
            containers.forEach(container => {
                container.classList.remove('input-container--invalido', 'input-container--valido');
            });
        };
        limparMensagensErro();

        let temErrosFrontend = false;

        // Validação padrão
        if (inputs.nome && validaCampo(inputs.nome)) temErrosFrontend = true;
        if (inputs.email && validaCampo(inputs.email)) temErrosFrontend = true;
        if (inputs.senha && validaCampo(inputs.senha)) temErrosFrontend = true;
        if (inputs.senha && inputs.confirmaSenha && validaConfirmaSenha(inputs.senha, inputs.confirmaSenha)) temErrosFrontend = true;

        // Validação personalizada para email
        // Validação personalizada para email
        const emailValue = inputs.email.value.trim();
        if (emailValue) {
            const emailParts = emailValue.split('@');
            if (emailParts.length === 2) {
                const domainParts = emailParts[1].split('.');
                const extension = domainParts[domainParts.length - 1].toLowerCase();
                const secondLevel = domainParts.length >= 2 ? domainParts[domainParts.length - 2].toLowerCase() : null;

                // Lista de extensões válidas (pode ser expandida)
                const validExtensions = ['com', 'org', 'net', 'gov', 'edu', 'br', 'uk', 'fr', 'de', 'jp'];
                const validSecondLevels = ['com', 'org', 'net', 'gov', 'edu', 'co'];

                // Validação do domínio
                if (domainParts.length > 3 || // Mais de 3 partes (ex.: gmail.com.br.net)
                    extension.length < 2 || extension.length > 4 || // Extensão inválida
                    (domainParts.length === 3 && 
                    (!validSecondLevels.includes(secondLevel) || !validExtensions.includes(extension)) && 
                    !(secondLevel === 'com' && extension === 'br'))) {
                    temErrosFrontend = true;
                    const container = inputs.email.parentElement;
                    const erroSpan = container.querySelector('.input-mensagem-erro');
                    erroSpan.textContent = 'O email deve ter uma extensão válida (ex.: .com, .org, .br, .com.br)';
                    container.classList.add('input-container--invalido');
                }
            } else {
                temErrosFrontend = true;
                const container = inputs.email.parentElement;
                const erroSpan = container.querySelector('.input-mensagem-erro');
                erroSpan.textContent = 'O email deve conter exatamente um @';
                container.classList.add('input-container--invalido');
            }
        }

        // Para a execução se houver erros
        if (temErrosFrontend) {
            return; // Sai da função se houver erros, evitando o envio
        }

        const dados = {
            nome: inputs.nome ? inputs.nome.value : '',
            email: inputs.email ? inputs.email.value : '',
            senha: inputs.senha ? inputs.senha.value : ''
        };
        console.log('Enviando dados para a API:', dados);

        try {
            const response = await fetch('http://localhost:3000/cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                window.location.href = 'login.html';
            } else {
                const errorData = await response.json();
                console.log('Resposta da API com erros:', errorData);
                limparMensagensErro();
                if (errorData && errorData.errors && Array.isArray(errorData.errors)) {
                    errorData.errors.forEach(error => {
                        const input = inputs[error.path];
                        if (input) {
                            const container = input.parentElement;
                            const erroSpan = container.querySelector('.input-mensagem-erro');
                            if (erroSpan) {
                                erroSpan.textContent = error.msg;
                                container.classList.add('input-container--invalido');
                            } else {
                                console.error(`Erro: Span .input-mensagem-erro não encontrado para ${error.path}`);
                            }
                        } else {
                            console.error(`Erro: Campo ${error.path} não encontrado nos inputs`, inputs);
                        }
                    });
                } else {
                    const erroMsg = errorData?.erro || errorData?.message || 'Erro desconhecido';
                    const emailInput = inputs.email;
                    if (emailInput && (erroMsg.includes('Email já cadastrado') || erroMsg.includes('email já cadastrado'))) {
                        const container = emailInput.parentElement;
                        const erroSpan = container.querySelector('.input-mensagem-erro');
                        erroSpan.textContent = 'Email já cadastrado';
                        container.classList.add('input-container--invalido');
                    } else {
                        alert(`Erro ao cadastrar: ${erroMsg}`);
                    }
                }
            }
        } catch (erro) {
            console.error('Erro no frontend:', erro.message);
            alert(erro.message);
        }
    });
});

$('#acessibilidade').load('../acessibilidade.html');