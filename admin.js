document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Você precisa estar logado para acessar esta página.');
    window.location.href = 'login.html';
    return;
  }

  // Seleciona os elementos do DOM
  const formCadastro = document.getElementById('form-cadastro');
  const formEditar = document.getElementById('form-editar');
  const tabelaAnimais = document.getElementById('tabela-animais').querySelector('tbody');
  const btnCancelarEditar = document.getElementById('btn-cancelar-editar');

  // Função para listar todos os animais
  const listarAnimais = async () => {
    try {
      const response = await fetch('http://localhost:3000/animais/admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao listar animais');
      }
      const animais = await response.json();
      tabelaAnimais.innerHTML = '';
      animais.forEach(animal => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${animal.id}</td>
          <td>${animal.nome}</td>
          <td>${animal.especie}</td>
          <td>${animal.idade || '-'}</td>
          <td>${animal.descricao || '-'}</td>
          <td>${animal.status}</td>
          <td>
            <button onclick="editarAnimal(${animal.id})">Editar</button>
            <button onclick="deletarAnimal(${animal.id})">Deletar</button>
          </td>
        `;
        tabelaAnimais.appendChild(tr);
      });
    } catch (error) {
      console.error('Erro ao listar animais:', error);
      alert('Erro ao listar animais. Verifique o console para mais detalhes.');
    }
  };

  // Função para cadastrar um animal
  formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome-cadastro').value;
    const especie = document.getElementById('especie-cadastro').value;
    const idade = document.getElementById('idade-cadastro').value;
    const descricao = document.getElementById('descricao-cadastro').value;
    const status = document.getElementById('status-cadastro').value;

    try {
      const response = await fetch('http://localhost:3000/animais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ nome, especie, idade, descricao, status })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cadastrar animal');
      }
      alert('Animal cadastrado com sucesso!');
      formCadastro.reset();
      listarAnimais();
    } catch (error) {
      console.error('Erro ao cadastrar animal:', error);
      alert('Erro ao cadastrar animal: ' + error.message);
    }
  });

  // Função para buscar animal por ID e preencher o formulário de edição
  window.editarAnimal = async (id) => {
    try {
      const response = await fetch(`http://localhost:3000/animais/${id}`, {
        headers: {
          'Authorization': token
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar animal');
      }
      const animal = await response.json();
      document.getElementById('id-editar').value = animal.id;
      document.getElementById('nome-editar').value = animal.nome;
      document.getId('especie-editar').value = animal.especie;
      document.getId('idade-editar').value = animal.idade || '';
      document.getId('descricao-editar').value = animal.descricao || '';
      document.getId('status-editar').value = animal.status;
      formEditar.style.display = 'block';
    } catch (error) {
      console.error('Erro ao buscar animal:', error);
      alert('Erro ao buscar animal: ' + error.message);
    }
  };

  // Função para atualizar um animal
  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('id-editar').value;
    const nome = document.getElementById('nome-editar').value;
    const especie = document.getElementById('especie-editar').value;
    const idade = document.getElementById('idade-editar').value;
    const descricao = document.getElementById('descricao-editar').value;
    const status = document.getElementById('status-editar').value;

    try {
      const response = await fetch(`http://localhost:3000/animais/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ nome, especie, idade, descricao, status })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar animal');
      }
      alert('Animal atualizado com sucesso!');
      formEditar.style.display = 'none';
      listarAnimais();
    } catch (error) {
      console.error('Erro ao atualizar animal:', error);
      alert('Erro ao atualizar animal: ' + error.message);
    }
  });

  // Função para cancelar a edição
  btnCancelarEditar.addEventListener('click', () => {
    formEditar.style.display = 'none';
  });

  // Função para deletar um animal
  window.deletarAnimal = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este animal?')) return;
    try {
      const response = await fetch(`http://localhost:3000/animais/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar animal');
      }
      alert('Animal deletado com sucesso!');
      listarAnimais();
    } catch (error) {
      console.error('Erro ao deletar animal:', error);
      alert('Erro ao deletar animal: ' + error.message);
    }
  };

  // Carrega a lista de animais ao iniciar
  listarAnimais();
});