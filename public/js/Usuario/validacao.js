export function validaCampo(input) {
    console.log(`Validando campo: ${input.id}`);
    const erroSpan = input.parentElement.querySelector('.input-mensagem-erro');
    const container = input.parentElement;

    if (!erroSpan) {
        console.error(`Erro: Elemento .input-mensagem-erro não encontrado para o input ${input.id}`);
        return 'Erro interno de validação';
    }

    if (input.validity.valid) {
        container.classList.remove('input-container--invalido');
        container.classList.add('input-container--valido');
        erroSpan.textContent = '';
        return null;
    } else {
        container.classList.remove('input-container--valido');
        container.classList.add('input-container--invalido');
        const erro = getMensagemErro(input);
        erroSpan.textContent = erro;
        return erro;
    }
}

function getMensagemErro(input) {
    const tipoInput = input.getAttribute('data-type') || input.type;

    if (input.validity.valueMissing) {
        return {
            email: 'O email é obrigatório.',
            senha: 'A senha é obrigatória.',
            text: 'Este campo é obrigatório.'
        }[tipoInput] || 'Este campo é obrigatório.';
    }

    if (input.validity.typeMismatch && tipoInput === 'email') {
        return 'O email deve seguir o formato exemplo@dominio.com.';
    }

    if (input.validity.patternMismatch) {
        if (tipoInput === 'email') {
            return 'O email deve conter @ e um domínio válido (ex.: exemplo@dominio.com).';
        } else if (tipoInput === 'senha') {
            if (input.value.length < 8) return 'A senha deve ter no mínimo 8 dígitos.';
            if (input.value.length > 12) return 'A senha deve ter no máximo 12 dígitos.';
            if (!/[A-Z]/.test(input.value)) return 'A senha deve conter pelo menos 1 letra maiúscula.';
            if (!/[0-9]/.test(input.value)) return 'A senha deve conter pelo menos 1 número.';
            if (!/[!@#$%^&*]/.test(input.value)) return 'A senha deve conter pelo menos 1 caractere especial (ex.: !@#$%).';
        }
    }

    if (input.validity.tooShort && tipoInput === 'senha') {
        return 'A senha deve ter no mínimo 8 caracteres.';
    }

    if (tipoInput === 'nome') {
        return 'O nome deve ter entre 2 e 100 caracteres.';
    }

    return 'Por favor, verifique os dados inseridos.';
}

export function validaConfirmaSenha(senhaInput, confirmaSenhaInput) {
    const erroSpan = confirmaSenhaInput.parentElement.querySelector('.input-mensagem-erro');
    const container = confirmaSenhaInput.parentElement;

    if (!erroSpan) {
        console.error(`Erro: Elemento .input-mensagem-erro não encontrado para confirmaSenha`);
        return 'Erro interno de validação';
    }

    if (senhaInput.value === confirmaSenhaInput.value) {
        container.classList.remove('input-container--invalido');
        container.classList.add('input-container--valido');
        erroSpan.textContent = '';
        return null;
    } else {
        container.classList.remove('input-container--valido');
        container.classList.add('input-container--invalido');
        const erro = 'As senhas não coincidem. Tente novamente.';
        erroSpan.textContent = erro;
        return erro;
    }
}