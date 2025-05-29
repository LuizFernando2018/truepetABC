async function carregarAnimais() {
    try {
        const response = await fetch('http://localhost:3000/animais');
        if (!response.ok) {
            throw new Error('Erro ao buscar animais');
        }
        const animais = await response.json();
        const galeria = document.querySelector('.animais__lista');
        if (!galeria) {
            console.error('Elemento .animais__lista não encontrado no HTML');
            return;
        }
        galeria.innerHTML = ''; // Limpa a galeria estática

        animais.forEach(animal => {
            const card = `
                <li class="lista__item">
                    <div class="lista__item--container">
                        
                        <div class="item__texto">
                            <h3 class="item__titulo">${animal.nome}</h3>
                            <p class="item__idade">${animal.idade}</p>
                            <p class="item__caracteristica">${animal.descricao}</p>
                            <p class="item__localizacao">RJ</p>
                            <button class="botao--falar-responsavel" data-animal-id="${animal.id}">Falar com responsável</button>
                        </div>
                    </div>
                </li>
            `;
            galeria.innerHTML += card;
        });

        // Adicionar evento aos botões "Falar com responsável"
        document.querySelectorAll('.botao--falar-responsavel').forEach(botao => {
            botao.addEventListener('click', (e) => {
                const animalId = e.target.getAttribute('data-animal-id');
                window.location.href = `mensagem.html?animal_id=${animalId}`;
            });
        });
    } catch (erro) {
        console.error('Erro ao carregar animais:', erro);
    }
}

document.addEventListener('DOMContentLoaded', carregarAnimais);

$('#acessibilidade').load('../acessibilidade.html');