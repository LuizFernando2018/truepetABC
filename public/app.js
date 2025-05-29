import { validaCampo } from "./js/Usuario/validacao.js";
    //import { clientService } from "../controllerLogin.js";

console.log('app.js carregado');
    //valida formulario
    /*
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('blur', (evento) => {
            validaCampo(evento.target);
        });
    });
    */

//recupera id do cookie com id do usuario
const cookies = document.cookie.split(';');
const idCookie = cookies.find(cookie => cookie.trim().startsWith('id='));
const id = idCookie ? idCookie.split('=')[1] : null;
//atualiza ID do usuário em todas as páginas:
if (id) {
    history.replaceState({ id: id }, document.title, window.location.href.split('?')[0] + '?id=' + id);
}