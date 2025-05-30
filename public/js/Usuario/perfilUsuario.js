console.log('Script perfilUsuario.js carregado com sucesso'); // Log inicial

// import { clientService } from "../controllerLogin.js"; // Removido - clientService não será usado

// console.log('clientService importado:', clientService); // Removido

// const defineIdGeral = () => { // Temporariamente comentado, ID será do token
//   const verificarID = new URL(window.location);
//   const id = verificarID.searchParams.get('id');
//   console.log('ID extraído da URL:', id);
//   return id;
// };

const verificaTipoUsuario = () => { // Esta função pode ser simplificada ou integrada em exibeDados
  const token = localStorage.getItem('token');
  // console.log('Token encontrado no localStorage:', token);
  if (!token) {
    // console.log('Token não encontrado, redirecionando para login.html');
    window.location.href = 'login.html';
    return null;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // console.log('Payload do token:', payload);
    return payload; // Retorna todo o payload para ter acesso ao ID e tipo
  } catch (erro) {
    console.error('Erro ao decodificar token:', erro);
    window.location.href = 'login.html';
    return null;
  }
};

const mostraDados = (usuario) => {
  const perfil = document.createElement('div');
  // Adicionado twoFactorStatusText e o botão/QR div
  perfil.innerHTML = `
    <label for="foto" class="formulario__campo">Foto</label>
    <figure class="formulario__fotoperfil">
      <img src="./assets/img/user.png" alt="" class="formulario__fotoperfil--foto">
      <figcaption class="formulario__fotoperfil--legenda">Clique na foto para editar</figcaption>
    </figure>
    <div class="input-container">
      <label for="nome" class="formulario__campo">Nome</label>
      <input type="text" data-type="nome" class="formulario__input input" id="nome" placeholder="Insira seu nome completo" value="${usuario.nome || ''}" required>
      <span class="input-mensagem-erro">Campo inválido</span>
    </div>
    <div class="input-container">
      <label for="fone" class="formulario__campo">Telefone</label>
      <input type="tel" data-type="telefone" class="formulario__input input" id="phone" placeholder="55 11 XXXXXXXXX" value="${usuario.telefone || ''}">
      <span class="input-mensagem-erro">Campo inválido</span>
    </div>
    <label for="cidade" class="formulario__campo">Cidade</label>
    <input data-type="cidade" type="text" class="formulario__input input" id="cidade" placeholder="São Paulo" value="${usuario.cidade || ''}">
    <label for="mensagem" class="formulario__campo">Sobre</label>
    <textarea data-type="sobre" class="formulario__textarea" id="mensagem" rows="6" cols="50" placeholder="At vero eos et accusamus et iusto odio...">${usuario.sobre || ''}</textarea>

    <div class="two-factor-section">
      <h3>Autenticação de Dois Fatores (2FA)</h3>
      <p id="twoFactorStatusText">Status 2FA: Verificando...</p>
      <button id="enableTwoFactorBtn" class="button">Carregando...</button>
      <div id="twoFactorQr" style="margin-top: 10px;"></div>
    </div>
  `;
  return perfil;
};

// --- Funções para 2FA ---
async function handleEnableTwoFactor(event) {
  event.preventDefault();
  console.log('Tentando ativar 2FA...');
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/enable-two-factor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Embora não haja corpo, é uma boa prática
        'Authorization': token
      }
    });

    if (response.ok) {
      const { qrCode, otpauthUrl } = await response.json();
      console.log('2FA ativado, QR Code URL:', otpauthUrl);
      updateTwoFactorUI(true, qrCode);
      // A mensagem de instrução será adicionada por updateTwoFactorUI
    } else {
      const errorData = await response.json();
      console.error('Falha ao ativar 2FA:', errorData);
      alert(`Erro ao ativar 2FA: ${errorData.error || 'Erro desconhecido'}`);
      updateTwoFactorUI(false); // Reverte a UI para o estado desativado
    }
  } catch (error) {
    console.error('Erro de rede ou JS ao ativar 2FA:', error);
    alert('Erro de comunicação ao tentar ativar 2FA.');
    updateTwoFactorUI(false); // Reverte a UI
  }
}

async function handleDisableTwoFactor(event) {
  event.preventDefault();
  console.log('Tentando desativar 2FA...');
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sessão expirada. Faça login novamente.');
    window.location.href = 'login.html';
    return;
  }

  if (!confirm('Tem certeza que deseja desativar a autenticação de dois fatores?')) {
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/disable-two-factor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Embora não haja corpo, é uma boa prática
        'Authorization': token
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('2FA desativado:', result.message);
      alert(result.message || 'Autenticação de dois fatores desabilitada com sucesso.');
      updateTwoFactorUI(false);
    } else {
      const errorData = await response.json();
      console.error('Falha ao desativar 2FA:', errorData);
      alert(`Erro ao desativar 2FA: ${errorData.error || 'Erro desconhecido'}`);
      updateTwoFactorUI(true); // Reverte a UI para o estado ativado, pois a operação falhou
    }
  } catch (error) {
    console.error('Erro de rede ou JS ao desativar 2FA:', error);
    alert('Erro de comunicação ao tentar desativar 2FA.');
    updateTwoFactorUI(true); // Reverte a UI
  }
}

function updateTwoFactorUI(isTwoFactorEnabled, qrCodeDataUrl = null) {
  console.log(`Atualizando UI para 2FA: ${isTwoFactorEnabled}, QR Code: ${qrCodeDataUrl ? 'sim' : 'não'}`);
  const statusTextElement = document.getElementById('twoFactorStatusText');
  const buttonElement = document.getElementById('enableTwoFactorBtn');
  const qrDivElement = document.getElementById('twoFactorQr');

  if (!statusTextElement || !buttonElement || !qrDivElement) {
    console.error('Elementos da UI para 2FA não encontrados. O HTML foi carregado corretamente?');
    return;
  }

  // Limpa QR Code e remove ouvintes antigos para evitar duplicação
  qrDivElement.innerHTML = '';
  // Para remover event listeners, é mais seguro substituir o botão por um clone dele.
  const newButton = buttonElement.cloneNode(true);
  buttonElement.parentNode.replaceChild(newButton, buttonElement);
  // newButton agora é a referência para o botão no DOM

  if (isTwoFactorEnabled) {
    statusTextElement.textContent = 'Status 2FA: Ativado';
    newButton.textContent = 'Desativar Verificação 2FA';
    newButton.addEventListener('click', handleDisableTwoFactor);

    if (qrCodeDataUrl) {
      // Se qrCodeDataUrl é fornecido, significa que estamos no processo de ativação.
      statusTextElement.textContent = 'Status 2FA: Ativado (Escaneie o QR Code abaixo)';
      qrDivElement.innerHTML = `<img src="${qrCodeDataUrl}" alt="QR Code 2FA" style="max-width: 200px; height: auto;">`;
      qrDivElement.innerHTML += '<p style="font-size: 0.9em; margin-top: 5px;">Escaneie este QR code com um aplicativo autenticador (ex.: Google Authenticator, Authy) e guarde o código de recuperação em um lugar seguro.</p>';
    } else {
      // Se 2FA já está ativo (ex: no carregamento da página), não mostra QR code.
      qrDivElement.innerHTML = '<p style="font-size: 0.9em;">A autenticação de dois fatores já está ativa para sua conta.</p>';
    }
  } else {
    statusTextElement.textContent = 'Status 2FA: Desativado';
    newButton.textContent = 'Ativar Verificação 2FA';
    newButton.addEventListener('click', handleEnableTwoFactor);
    qrDivElement.innerHTML = '<p style="font-size: 0.9em;">Ative a autenticação de dois fatores para maior segurança.</p>';
  }
}

// const id = defineIdGeral(); // ID será obtido do token dentro de exibeDados
// const formulario = document.querySelector('[data-formPerfil]'); // Movido para dentro de exibeDados
// console.log('Formulário encontrado:', formulario); // Removido ou movido

const exibeDados = async () => {
  try {
    const tokenData = verificaTipoUsuario(); // Agora retorna o payload ou null
    if (!tokenData || !tokenData.id || !tokenData.tipo) {
      console.error('Dados do token inválidos ou não encontrados. Redirecionando para login.');
      window.location.href = 'login.html';
      return;
    }
    const userIdFromToken = tokenData.id;
    const userTypeFromToken = tokenData.tipo;

    // console.log('ID do usuário (do token):', userIdFromToken);
    // console.log('Tipo de usuário (do token):', userTypeFromToken);

    if (window.location.pathname.includes('admin.html') && userTypeFromToken !== 'admin') {
      // console.log('Usuário não é admin, redirecionando para perfil.html');
      window.location.href = 'perfil.html'; // Ou uma página de "não autorizado"
      return;
    }

    // O token já foi verificado em verificaTipoUsuario, mas pegamos ele de novo para a requisição
    const token = localStorage.getItem('token');
    // A verificação de !token já está em verificaTipoUsuario, mas uma dupla checagem não prejudica.
    if (!token) {
      // console.log('Token não encontrado (redundante), redirecionando para login.html');
      window.location.href = 'login.html';
      return;
    }

    // console.log('Buscando perfil do usuário com ID do token:', userIdFromToken);

    const response = await fetch(`/perfil/${userIdFromToken}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro ao buscar perfil, resposta não JSON.' }));
      console.error('Falha ao buscar perfil:', response.status, errorData);
      alert(`Erro ao buscar dados do perfil: ${errorData.error || response.statusText}`);
      if (response.status === 401 || response.status === 403) {
        window.location.href = 'login.html';
      }
      return;
    }

    const usuario = await response.json();
    // console.log('Usuário retornado via fetch:', usuario);
    if (!usuario) {
      console.error('Dados do usuário não encontrados na resposta.');
      alert('Dados do usuário não encontrados.');
      return;
    }

    const formulario = document.querySelector('[data-formPerfil]');
    if (!formulario) {
      console.error('Elemento [data-formPerfil] não encontrado no DOM! Verifique o HTML.');
      alert('Erro na configuração da página: container do perfil não encontrado.');
      return;
    }
    // console.log('Elemento [data-formPerfil] encontrado:', formulario);

    const perfilDiv = mostraDados(usuario);
    // console.log('Perfil div criado:', perfilDiv);

    while (formulario.firstChild) {
      formulario.removeChild(formulario.firstChild);
    }
    formulario.appendChild(perfilDiv);

    // Inicializa a UI do 2FA DEPOIS que os elementos HTML foram adicionados ao DOM
    // A propriedade twoFactorEnabled deve vir do objeto 'usuario'
    updateTwoFactorUI(usuario.twoFactorEnabled);

  } catch (error) {
    console.error('Erro detalhado em exibeDados:', error);
    // Adiciona mais detalhes ao erro, se disponíveis
    let errorMessage = 'Erro ao exibir dados do perfil.';
    if (error.message) {
      errorMessage += ` Detalhes: ${error.message}`;
    }
    // Este bloco de erro é para o try/catch geral de exibeDados
    // Erros de fetch específicos são tratados acima
    if (error.message.includes('Failed to fetch')) {
         errorMessage = 'Erro de conexão. Verifique sua internet ou o servidor pode estar indisponível.';
    } else if (error.response && typeof error.response.json === 'function') { // Verifica se error.response existe
      // Este bloco pode não ser alcançado se o fetch falhar antes de obter uma resposta (ex: rede)
      // Os erros de resposta HTTP (4xx, 5xx) já são tratados dentro do bloco do fetch.
      // Este local seria mais para erros de processamento JS após um fetch bem-sucedido (improvável aqui)
      // ou se o objeto error tiver uma propriedade 'response' por algum motivo.
      try {
        const jsonError = await error.response.json();
        errorMessage += ` Server: ${jsonError.error || JSON.stringify(jsonError)}`;
      } catch (e) {
        // Não conseguiu parsear o JSON do erro, usa a mensagem original
      }
    }
    alert(errorMessage); // Exibe a mensagem de erro construída
    // Opcional: redirecionar para uma página de erro ou login
    // window.location.href = 'login.html';
  }
};

$('#acessibilidade').load('../acessibilidade.html');
exibeDados();
