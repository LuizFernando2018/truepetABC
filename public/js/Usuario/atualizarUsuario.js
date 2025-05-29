import { clientService } from "../../controllerLogin.js";

// Puxa o ID da página
const pegaUrl = new URL(window.location);
const id = pegaUrl.searchParams.get('id');

const formulario = document.querySelector('[data-formPerfil]');

// Função para validar campos
const validaCampos = () => {
    const nome = formulario.querySelector('[data-type="nome"]').value;
    const erroSpanNome = formulario.querySelector('[data-type="nome"]').parentElement.querySelector('.input-mensagem-erro');
    let temErros = false;

    if (!nome.trim()) {
        temErros = true;
        erroSpanNome.textContent = 'O nome é obrigatório.';
        formulario.querySelector('[data-type="nome"]').parentElement.classList.add('input-container--invalido');
    } else {
        erroSpanNome.textContent = '';
        formulario.querySelector('[data-type="nome"]').parentElement.classList.remove('input-container--invalido');
    }

    return temErros;
};

// Atualiza o usuário
formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (validaCampos()) return;

    const inputNome = formulario.querySelector('[data-type="nome"]').value;
    const inputTelefone = formulario.querySelector('[data-type="telefone"]').value;
    const inputCidade = formulario.querySelector('[data-type="cidade"]').value;
    const inputSobre = formulario.querySelector('[data-type="sobre"]').value;

    try {
        const usuario = await clientService.lerUsuario(id);
        if (!usuario) throw new Error('Usuário não encontrado');

        const camposAtualizados = {
            nome: inputNome,
            telefone: inputTelefone || null,
            cidade: inputCidade || null,
            sobre: inputSobre || null,
            id: usuario.id
        };

        await clientService.atualizarUsuario(camposAtualizados);

        // Atualiza os campos na tela
        formulario.querySelector('[data-type="nome"]').value = camposAtualizados.nome;
        formulario.querySelector('[data-type="telefone"]').value = camposAtualizados.telefone || '';
        formulario.querySelector('[data-type="cidade"]').value = camposAtualizados.cidade || '';
        formulario.querySelector('[data-type="sobre"]').value = camposAtualizados.sobre || '';

        // Registrar a ação de atualização na tabela de auditoria
        await fetch('/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: id,
                action: 'update_profile',
                details: JSON.stringify(camposAtualizados)
            })
        });

        alert('Perfil atualizado com sucesso!');
    } catch (erro) {
        console.error('Erro ao atualizar usuário:', erro);
        alert('Erro ao atualizar o perfil. Tente novamente.');
    }
});