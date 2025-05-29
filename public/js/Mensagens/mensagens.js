const formulario = document.querySelector('[data-formMensagem]');

// Pega o animal_id da URL
const urlParams = new URLSearchParams(window.location.search);
const animalId = urlParams.get('animal_id');
console.log('Animal ID da URL:', animalId); // Adiciona log para depuração

if (!formulario) {
    console.error('Formulário [data-formMensagem] não encontrado no HTML');
} else {
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nomeInput = e.target.querySelector('[data-nome]');
        const telefoneInput = e.target.querySelector('[data-telefone]');
        const animalInput = e.target.querySelector('[data-animal]');
        const mensagemInput = e.target.querySelector('[data-mensagem]');

        if (!nomeInput || !telefoneInput || !animalInput || !mensagemInput) {
            console.error('Campos do formulário não encontrados:', {
                nome: !!nomeInput,
                telefone: !!telefoneInput,
                animal: !!animalInput,
                mensagem: !!mensagemInput
            });
            return;
        }

        const nome = nomeInput.value;
        const telefone = telefoneInput.value;
        const animal = animalInput.value;
        const mensagem = mensagemInput.value;

        console.log('Enviando mensagem com animal_id:', animalId); // Adiciona log para depuração

        try {
            const response = await fetch('http://localhost:3000/mensagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, telefone, animal, mensagem, animal_id: animalId })
            });
            if (response.ok) {
                alert('Mensagem enviada!!!');
                window.location.reload();
            } else {
                const errorData = await response.json();
                throw new Error(`Erro ao enviar mensagem: ${errorData.erro}`);
            }
        } catch (erro) {
            console.error('Erro ao enviar mensagem:', erro);
        }
    });
}

async function preencherNomeAnimal() {
    if (animalId) {
        try {
            const response = await fetch(`http://localhost:3000/animais/${animalId}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar animal');
            }
            const animal = await response.json();
            const animalInput = document.querySelector('[data-animal]');
            if (animalInput) {
                animalInput.value  = animal.nome;
            } else {
                console.error('Elemento [data-animal] não encontrado no formulário');
            }
        } catch (erro) {
            console.error('Erro ao preencher nome do animal:', erro);
        }
    }
}

document.addEventListener('DOMContentLoaded', preencherNomeAnimal);