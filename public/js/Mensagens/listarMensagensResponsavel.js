async function carregarMensagens() {
    try {
        const responsavelId = 1; // Substitua pelo ID do usuário logado
        console.log('Buscando mensagens para o responsável ID:', responsavelId);
        const response = await fetch(`http://localhost:3000/mensagens/responsavel/${responsavelId}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar mensagens: ${response.status} ${response.statusText}`);
        }
        const mensagens = await response.json();
        console.log('Mensagens recebidas:', mensagens);

        const lista = document.querySelector('.mensagens__lista');
        if (!lista) {
            console.error('Elemento .mensagens__lista não encontrado no HTML');
            return;
        }
        lista.innerHTML = ''; // Limpa a lista

        if (mensagens.length === 0) {
            lista.innerHTML = '<li>Nenhuma mensagem recebida.</li>';
            return;
        }

        mensagens.forEach(mensagem => {
            const item = `
                <li class="mensagem__item">
                    <h3>Interessado: ${mensagem.nome}</h3>
                    <p>Telefone: ${mensagem.telefone}</p>
                    <p>Animal: ${mensagem.animal_nome}</p>
                    <p>Mensagem: ${mensagem.mensagem}</p>
                </li>
            `;
            lista.innerHTML += item;
        });
    } catch (erro) {
        console.error('Erro ao carregar mensagens:', erro);
    }
}

document.addEventListener('DOMContentLoaded', carregarMensagens);