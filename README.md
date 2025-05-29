# Adopet

Projeto feito para o challenge front-end, todo o código foi criado do zero. Sem dúvida a parte mais desafiadora foi o Javascript, que consegui desenvolver bem nesse projeto. Deixo os detalhes mais abaixo.
> Para conseguir logar e utilizar demais páginas, siga as instruções em [Como rodar o projeto](#como-rodar-o-projeto)

> Caso queira apenas dar uma olhada, utilize a página [Adopet no Github Pages](https://alan004.github.io/adopet/index.html) e verifique as demais páginas em [Telas e responsividade](#telas-e-responsividade). Se preferir, você pode assistir ao [vídeo de demonstração](https://www.youtube.com/watch?v=80T_j2Zan9A) que mostra os detalhes do projeto.

| :placard: Vitrine.Dev |     |
| -------------  | --- |
| :sparkles: Nome        | **Adopet**
| :label: Tecnologias | html, css, javascript
| :rocket: URL         | https://alan004.github.io/adopet/index.html
| :fire: Desafio     | https://www.alura.com.br/challenges/front-end-4/semana-01-criando-site-mobile-first

<!-- Inserir imagem com a #vitrinedev ao final do link -->
<!--![AdopetcAPA](https://user-images.githubusercontent.com/17684918/209195984-a3c4e20b-4f3a-4778-b5b4-3e17556a0480.png#vitrinedev)-->
![AdopetCapa](https://user-images.githubusercontent.com/17684918/228087166-cfdf565e-70ad-49a0-a68a-d1849dadd25e.png#vitrinedev)

## Detalhes do projeto

> Status do Projeto: Finalizado  🫡  

A estrutura do projeto é feita em HTML e CSS. Utilizo o Javascript para validação de fomulários e manutenção de usuários usando o JSON SERVER. Foi bem legal criar esse projeto e sem dúvida aprendi bastante sobre CSS e CRUD, as duas coisas que me tomaram mais tempo.

### Javascript e validações
Em primeiro lugar, o Javascript foi utilizado para validar os inputs dos formulários do site. São apontadas em tela mensagens de erro personalizadas nos casos de 'valueMissing', 'tipeMismatch', 'patternMismatch' e também no caso das senhas não baterem no formulário de cadastro: \
![Tipos de erro](https://user-images.githubusercontent.com/17684918/228090337-96d46be4-36d6-4a2d-a6e0-dbc4d99f28b2.png)

Em segundo lugar, foi utilizado o Javascript para fazer a gestão de usuários de forma assíncrona. Utilizando o json server, é possível criar e atualizar os usuários de db.json. Toda essa gestão é feita pelo controllerLogin.js e arquivos dentro de "JS >> Usuario", que definem qual operação será realizada em cada página. Além disso, no momento de login, o id do usuário é inserido ao final da URL e código JS gera um cookie no navegador contendo esse número, assim salvamos esse id em qualquer página do site, preservando os dados das páginas PERFIL e MENSAGEM: 
![id](https://user-images.githubusercontent.com/17684918/228100283-1f6eeeff-654b-4074-b50b-09e0302d5baa.png)
![cookie](https://user-images.githubusercontent.com/17684918/228104787-998cc422-1e0c-4525-85a7-b07f74e8fcc2.png)

### Telas e responsividade
O projeto foi feito seguindo o conceito mobile-first, então todas as páginas são responsivas nos variados dispositivos. A personalização foi feita em CSS puro, sem usar frameworks, com cada classe sendo declarada em um arquivo .css diferente, ajudando na estruturação e manutenção do código. Segue imagem ilustrativa com detalhes de cada tela.  
![AdopetTelas](https://user-images.githubusercontent.com/17684918/228090474-017bde69-0593-4042-af3a-279ecacc9563.png)


## Como rodar o projeto
Depois de clonar o repositório, instale o JSON server usando \
`npm install json-server`
E o browser-sync usando \
`npm install -g browser-sync`

Após isso, é possível rodar nosso db.json e dbMensagens.json pelo JSON server\
`json-server --watch db.json` \
`json-server --watch dbMensagens.json --port 3005`

E então rodar o projeto utilizando o Browsersync:\
`browser-sync start --server --file . --host --port 5000 --startPath index.html`
