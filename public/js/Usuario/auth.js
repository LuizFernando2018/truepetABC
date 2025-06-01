(function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Define as páginas que não requerem autenticação.
    // index.html (página inicial/landing), login, cadastro, e recuperação de senha são consideradas públicas.
    const publicPages = ['index.html', 'login.html', 'cadastro.html', 'recuperarSenha.html'];

    // Se a página atual estiver na lista de páginas públicas, não fazer nada.
    if (publicPages.includes(currentPage)) {
        return;
    }

    // Para todas as outras páginas, verificar o token.
    const token = localStorage.getItem('token');

    if (!token) {
        console.log(`Auth: Token não encontrado. Redirecionando para login.html a partir de ${currentPage}`);
        window.location.href = 'login.html'; // Ajuste o caminho se as HTMLs não estiverem na raiz
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const nowInSeconds = Date.now() / 1000;

        // Verificar expiração do token
        if (payload.exp < nowInSeconds) {
            console.log(`Auth: Token expirado. Limpando localStorage e redirecionando para login.html a partir de ${currentPage}`);
            localStorage.removeItem('token');
            localStorage.removeItem('userId'); // Limpar userId também, se existir
            // localStorage.clear(); // Alternativa para limpar tudo, mas pode ser demais se houver outros dados.
            window.location.href = 'login.html';
            return;
        }

        // Lógica de autorização específica para admin.html
        if (currentPage === 'admin.html') {
            if (payload.tipo !== 'admin' && payload.tipo !== 'ong') {
                console.log(`Auth: Acesso negado a admin.html para tipo de usuário "${payload.tipo}". Redirecionando.`);
                alert('Acesso negado. Esta página é restrita a administradores ou ONGs.');
                window.location.href = 'animais.html'; // Página padrão para usuários comuns
                return;
            }
        }

        // Adicionar aqui outras verificações para outras páginas se necessário
        // Exemplo:
        // if (currentPage === 'algumaPaginaEspecifica.html') {
        //     if (payload.tipo !== 'tipoEsperado') {
        //         alert('Acesso negado.');
        //         window.location.href = 'paginaPadrao.html';
        //         return;
        //     }
        // }

        // Se chegou até aqui, o token é válido e o usuário tem permissão (para as verificações implementadas)
        // console.log(`Auth: Acesso permitido para ${currentPage} para usuário tipo "${payload.tipo}"`);

    } catch (error) {
        console.error('Auth: Erro ao processar token ou durante a verificação de autenticação:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        // localStorage.clear();
        window.location.href = 'login.html';
    }
})();