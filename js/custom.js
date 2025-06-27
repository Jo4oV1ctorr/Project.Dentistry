document.addEventListener('DOMContentLoaded', () => {
  // Inicializar o IndexedDB
  const dbPromise = idb.openDB('forescanDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('laudos')) {
        db.createObjectStore('laudos', { keyPath: 'id' });
      }
    }
  });

  // to get current year
  function getYear() {
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    document.querySelector("#displayYear").innerHTML = currentYear;
  }
  getYear();

  // nice select
  $(document).ready(function () {
    $('select').niceSelect();
  });

  // Manipulação do campo de fotos
  const fotoInput = document.getElementById('foto');
  const fileNamesSpan = document.getElementById('file-names');
  const clearPhotosBtn = document.getElementById('clearPhotos');
  if (fotoInput && fileNamesSpan) {
    fotoInput.addEventListener('change', function () {
      const files = Array.from(this.files);
      const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
      const validFiles = files.filter(file => validFormats.includes(file.type));
      if (validFiles.length < files.length) {
        mostrarToast('Alguns arquivos foram ignorados. Apenas imagens JPEG, PNG ou GIF são permitidas.', 'warning');
      }
      fileNamesSpan.textContent = validFiles.length > 0 ? validFiles.map(f => f.name).join(', ') : 'Nenhuma foto selecionada';
      console.log('Fotos selecionadas:', validFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    });
  }

  // Botão de limpar fotos
  if (clearPhotosBtn) {
    clearPhotosBtn.addEventListener('click', () => {
      if (fotoInput) fotoInput.value = '';
      if (fileNamesSpan) fileNamesSpan.textContent = 'Nenhuma foto selecionada';
      console.log('Fotos limpas pelo usuário.');
    });
  }

  // Dashboard e casos
  const totalLaudos = document.getElementById('totalLaudos');
  const laudosHoje = document.getElementById('laudosHoje');
  const peritoAtivo = document.getElementById('peritoAtivo');
  const peritoChart = document.getElementById('peritoChart');
  const laudosTable = document.getElementById('laudosTable');
  const filtroData = document.getElementById('filtroData');
  const filtroPerito = document.getElementById('filtroPerito');
  const filtroNomeCaso = document.getElementById('filtroNomeCaso');
  const toastContainer = document.getElementById('toastContainer');
  const paginationNumbers = document.getElementById('paginationNumbers');
  const formLaudo = document.getElementById('formLaudo');
  const laudosCarousel = document.getElementById('laudosCarousel');
  const { jsPDF } = window.jspdf;

  // Carregar casos do IndexedDB
  let casos = [];
  async function carregarCasos() {
    try {
      const db = await dbPromise;
      casos = await db.getAll('laudos');
      // Migrar campo paciente para nomeCaso, se necessário (compatibilidade com dados antigos)
      casos = casos.map((caso, index) => {
        const updatedCaso = {
          ...caso,
          nomeCaso: caso.nomeCaso || caso.paciente || `Caso_${index + 1}`,
          paciente: undefined,
          fotos: caso.fotos || [],
          status: caso.status || 'Em andamento'
        };
        console.log(`Migrando caso ${caso.id || index}: nomeCaso=${updatedCaso.nomeCaso}, fotos=${updatedCaso.fotos.length}, status=${updatedCaso.status}`);
        return updatedCaso;
      });
      console.log('Casos carregados do IndexedDB:', casos);
      atualizarTabela();
      atualizarEstatisticas();
      if (laudosCarousel) atualizarCasos();
    } catch (err) {
      console.error('Erro ao carregar casos do IndexedDB:', err);
      mostrarToast('Erro ao carregar os casos.', 'danger');
    }
  }
  carregarCasos();

  // Configuração de paginação
  const casosPorPagina = 5;
  let paginaAtual = 1;
  let filtrosAtuais = {};

  // Função para mostrar toast
  function mostrarToast(mensagem, tipo = 'success') {
    if (!toastContainer) return;
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="3000">
        <div class="toast-header">
          <strong class="me-auto">Notificação</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
        <div class="toast-body">${mensagem}</div>
      </div>
    `;
    toastContainer.innerHTML += toastHTML;
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
  }

  // Função para validar Nome do Caso
  async function validarNomeCaso(nomeCaso, casoId = null) {
    if (!nomeCaso || nomeCaso.trim() === '') {
      return 'O Nome do Caso é obrigatório.';
    }
    const regex = /^[a-zA-Z0-9\s-]{3,}$/;
    if (!regex.test(nomeCaso)) {
      return 'O Nome do Caso deve ter pelo menos 3 caracteres e conter apenas letras, números, espaços ou hífens.';
    }
    const db = await dbPromise;
    const allCasos = await db.getAll('laudos');
    const exists = allCasos.some(c => c.nomeCaso.toLowerCase() === nomeCaso.toLowerCase() && c.id !== casoId);
    if (exists) {
      return 'O Nome do Caso já existe. Escolha outro.';
    }
    return null;
  }

  // Função para limpar o formulário
  function limparFormulario() {
    if (formLaudo) {
      formLaudo.reset();
      const nomeCasoInput = document.getElementById('nomeCaso');
      nomeCasoInput.classList.remove('is-invalid');
      const errorDiv = nomeCasoInput.parentNode.querySelector('.invalid-feedback');
      if (errorDiv) errorDiv.textContent = '';
      if (fileNamesSpan) fileNamesSpan.textContent = 'Nenhuma foto selecionada';
      if (fotoInput) fotoInput.value = '';
      $('#peritoNome').niceSelect('update');
      $('#statusCaso').niceSelect('update');
    }
  }

  // Validação do formulário de casos
  if (formLaudo) {
    const nomeCasoInput = document.getElementById('nomeCaso');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    nomeCasoInput.parentNode.appendChild(errorDiv);

    formLaudo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const casoId = new URLSearchParams(window.location.search).get('id');
      const nomeCaso = nomeCasoInput.value.trim();
      console.log('Tentando salvar caso:', { nomeCaso, casoId });

      const error = await validarNomeCaso(nomeCaso, casoId);
      if (error) {
        nomeCasoInput.classList.add('is-invalid');
        errorDiv.textContent = error;
        console.log('Erro de validação:', error);
        return;
      }

      nomeCasoInput.classList.remove('is-invalid');
      errorDiv.textContent = '';

      // Processar fotos
      const fotos = [];
      if (fotoInput && fotoInput.files.length > 0) {
        const validFormats = ['image/jpeg', 'image/png', 'image/gif'];
        const files = Array.from(fotoInput.files).filter(file => validFormats.includes(file.type));
        try {
          for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
              mostrarToast(`A foto ${file.name} excede o limite de 2MB.`, 'warning');
              continue;
            }
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(new Error(`Erro ao ler o arquivo ${file.name}`));
              reader.readAsDataURL(file);
            });
            fotos.push(dataUrl);
            console.log(`Foto processada: ${file.name}, tamanho: ${dataUrl.length} bytes`);
          }
        } catch (err) {
          console.error('Erro ao processar fotos:', err);
          mostrarToast('Erro ao processar as fotos. Tente novamente.', 'danger');
          return;
        }
      } else {
        console.log('Nenhuma foto selecionada para o caso.');
      }

      const caso = {
        id: casoId || Date.now().toString(),
        nomeCaso,
        data: document.getElementById('dataPericia').value || '',
        perito: document.getElementById('peritoNome').value,
        descricao: document.getElementById('exameDescricao').value,
        diagnostico: document.getElementById('diagnostico').value,
        observacoes: document.getElementById('observacoes').value,
        status: document.getElementById('statusCaso').value || 'Em andamento',
        fotos
      };

      console.log('Caso a ser salvo:', caso);

      try {
        const db = await dbPromise;
        const tx = db.transaction('laudos', 'readwrite');
        if (casoId) {
          await tx.store.put(caso);
          const index = casos.findIndex(c => c.id === casoId);
          casos[index] = caso;
          console.log(`Caso editado (ID ${casoId}):`, caso);
        } else {
          await tx.store.add(caso);
          casos.push(caso);
          console.log('Caso adicionado:', caso);
        }
        await tx.done;

        mostrarToast('Caso salvo com sucesso!');
        if (!casoId) limparFormulario();
        if (laudosCarousel) atualizarCasos();
      } catch (err) {
        console.error('Erro ao salvar no IndexedDB:', err);
        mostrarToast('Erro ao salvar o caso. Tente novamente.', 'danger');
        return;
      }
    });

    // Preencher formulário para edição
    const casoId = new URLSearchParams(window.location.search).get('id');
    if (casoId) {
      (async () => {
        try {
          const db = await dbPromise;
          const caso = await db.get('laudos', casoId);
          if (caso) {
            console.log('Preenchendo formulário para edição:', caso);
            document.getElementById('nomeCaso').value = caso.nomeCaso || '';
            document.getElementById('dataPericia').value = caso.data || '';
            document.getElementById('peritoNome').value = caso.perito || '';
            document.getElementById('exameDescricao').value = caso.descricao || '';
            document.getElementById('diagnostico').value = caso.diagnostico || '';
            document.getElementById('observacoes').value = caso.observacoes || '';
            document.getElementById('statusCaso').value = caso.status || 'Em andamento';
            if (caso.fotos && caso.fotos.length > 0) {
              fileNamesSpan.textContent = `${caso.fotos.length} foto(s) carregada(s) anteriormente`;
            }
            $('#peritoNome').niceSelect('update');
            $('#statusCaso').niceSelect('update');
          }
        } catch (err) {
          console.error('Erro ao carregar caso para edição:', err);
          mostrarToast('Erro ao carregar o caso para edição.', 'danger');
        }
      })();
    }
  }

  // Função para atualizar a tabela
  function atualizarTabela(filtros = filtrosAtuais, pagina = paginaAtual) {
    if (!laudosTable || !paginationNumbers) return;
    laudosTable.innerHTML = '';
    let casosFiltrados = [...casos];

    if (filtros.data) {
      casosFiltrados = casosFiltrados.filter(c => c.data === filtros.data);
    }
    if (filtros.perito) {
      casosFiltrados = casosFiltrados.filter(c => c.perito === filtros.perito);
    }
    if (filtros.nomeCaso) {
      const termo = filtros.nomeCaso.toLowerCase();
      casosFiltrados = casosFiltrados.filter(c => (c.nomeCaso || '').toLowerCase().includes(termo));
    }

    const totalCasos = casosFiltrados.length;
    const totalPaginas = Math.ceil(totalCasos / casosPorPagina);
    pagina = Math.max(1, Math.min(pagina, totalPaginas));
    paginaAtual = pagina;

    const inicio = (pagina - 1) * casosPorPagina;
    const fim = inicio + casosPorPagina;
    const casosPaginados = casosFiltrados.slice(inicio, fim);

    console.log('Atualizando tabela:', { pagina, totalPaginas, casosPaginados });

    // Recuperar o tipo de usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const tipoUsuario = usuarioLogado ? usuarioLogado.tipo : null;
    const podeEditar = tipoUsuario === 'Administrador' || tipoUsuario === 'Perito';
    const podeExcluir = tipoUsuario === 'Administrador';

    casosPaginados.forEach((caso, index) => {
      const nomeCasoDisplay = caso.nomeCaso || 'N/A';
      const fotosCount = caso.fotos ? caso.fotos.length : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${inicio + index + 1}</td>
        <td>${nomeCasoDisplay}</td>
        <td>${caso.data || 'N/A'}</td>
        <td>${caso.perito || 'N/A'}</td>
        <td>
          ${podeEditar ? `
            <select class="form-select status-select" data-caso-id="${caso.id}">
              <option value="Em andamento" ${caso.status === 'Em andamento' ? 'selected' : ''}>Em andamento</option>
              <option value="Finalizado" ${caso.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
              <option value="Arquivado" ${caso.status === 'Arquivado' ? 'selected' : ''}>Arquivado</option>
            </select>
          ` : caso.status || 'Em andamento'}
        </td>
        <td>${fotosCount} foto(s)</td>
        <td>
          <button class="btn btn-black" onclick="gerarPDF(${casos.indexOf(caso)})">Gerar PDF</button>
          <a href="Laudos.html?id=${caso.id}" class="btn btn-primary">Visualizar</a>
          ${podeEditar ? `<a href="Adicionar_casos.html?id=${caso.id}" class="btn btn-primary">Editar</a>` : ''}
          ${podeExcluir ? `<button class="btn btn-danger" onclick="excluirCaso('${caso.id}')">Excluir</button>` : ''}
        </td>
      `;
      laudosTable.appendChild(row);
    });

    // Adicionar evento para os selects de status
    if (podeEditar) {
      document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async () => {
          const casoId = select.dataset.casoId;
          const newStatus = select.value;
          try {
            const db = await dbPromise;
            const caso = await db.get('laudos', casoId);
            if (caso) {
              caso.status = newStatus;
              await db.put('laudos', caso);
              const index = casos.findIndex(c => c.id === casoId);
              casos[index] = caso;
              mostrarToast('Status atualizado com sucesso!', 'success');
              atualizarTabela();
            }
          } catch (err) {
            console.error('Erro ao atualizar status:', err);
            mostrarToast('Erro ao atualizar o status.', 'danger');
          }
        });
      });
    }

    paginationNumbers.innerHTML = '';
    for (let i = 1; i <= totalPaginas; i++) {
      const pageItem = document.createElement('li');
      pageItem.className = `page-item ${i === pagina ? 'active' : ''}`;
      pageItem.innerHTML = `<a class="page-link" href="#" onclick="irParaPagina(${i})">${i}</a>`;
      paginationNumbers.appendChild(pageItem);
    }

    const btnAnterior = document.querySelector('.pagination .page-item:first-child');
    const btnProximo = document.querySelector('.pagination .page-item:last-child');
    btnAnterior.classList.toggle('disabled', pagina === 1);
    btnProximo.classList.toggle('disabled', pagina === totalPaginas);
  }

  // Funções de navegação de página
  window.paginaAnterior = function() {
    if (paginaAtual > 1) {
      atualizarTabela(filtrosAtuais, paginaAtual - 1);
    }
  };

  window.proximaPagina = function() {
    const totalPaginas = Math.ceil(casos.filter(c => {
      if (filtrosAtuais.data && c.data !== filtrosAtuais.data) return false;
      if (filtrosAtuais.perito && c.perito !== filtrosAtuais.perito) return false;
      if (filtrosAtuais.nomeCaso && !(c.nomeCaso || '').toLowerCase().includes(filtrosAtuais.nomeCaso.toLowerCase())) return false;
      return true;
    }).length / casosPorPagina);
    if (paginaAtual < totalPaginas) {
      atualizarTabela(filtrosAtuais, paginaAtual + 1);
    }
  };

  window.irParaPagina = function(pagina) {
    atualizarTabela(filtrosAtuais, pagina);
  };

  // Função para aplicar filtros
  window.aplicarFiltros = function() {
    filtrosAtuais = {
      data: filtroData ? filtroData.value : '',
      perito: filtroPerito ? filtroPerito.value : '',
      nomeCaso: filtroNomeCaso ? filtroNomeCaso.value.trim() : ''
    };
    paginaAtual = 1;
    atualizarTabela(filtrosAtuais, 1);
  };

  // Função para limpar filtros
  window.limparFiltros = function() {
    if (filtroData) filtroData.value = '';
    if (filtroPerito) filtroPerito.value = '';
    if (filtroNomeCaso) filtroNomeCaso.value = '';
    filtrosAtuais = {};
    paginaAtual = 1;
    atualizarTabela({}, 1);
  };

  // Função centralizada para excluir caso
  window.excluirCaso = async function(casoId) {
    if (confirm('Tem certeza que deseja excluir este caso?')) {
      try {
        const db = await dbPromise;
        await db.delete('laudos', casoId);
        casos = casos.filter(caso => caso.id !== casoId);
        mostrarToast('Caso excluído com sucesso!', 'danger');
        atualizarTabela();
        atualizarEstatisticas();
        if (laudosCarousel) atualizarCasos();
        // Se estiver na página Laudos.html, redirecionar para o dashboard após exclusão
        if (window.location.pathname.includes('Laudos.html')) {
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        }
      } catch (err) {
        console.error('Erro ao excluir caso do IndexedDB:', err);
        mostrarToast('Erro ao excluir o caso.', 'danger');
      }
    }
  };

  // Função para atualizar estatísticas e gráfico
  function atualizarEstatisticas() {
    if (!totalLaudos || !laudosHoje || !peritoAtivo) return;

    const hoje = new Date().toISOString().split('T')[0];
    const casosHojeCount = casos.filter(c => c.data === hoje).length;
    const peritosCount = {};
    casos.forEach(c => {
      if (c.perito) {
        peritosCount[c.perito] = (peritosCount[c.perito] || 0) + 1;
      }
    });

    totalLaudos.textContent = casos.length;
    laudosHoje.textContent = casosHojeCount;
    peritoAtivo.textContent = Object.keys(peritosCount).length
      ? Object.keys(peritosCount).reduce((a, b) => peritosCount[a] > peritosCount[b] ? a : b)
      : 'Nenhum';

    if (peritoChart) {
      new Chart(peritoChart.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['Nicolas Gomes', 'Manoel Gomes', 'João Pedro', 'Rafael Arcanjo', 'Maisa Letícia'],
          datasets: [{
            label: 'Casos por Perito',
            data: [
              peritosCount['Nicolas Gomes'] || 0,
              peritosCount['Manoel Gomes'] || 0,
              peritosCount['João Pedro'] || 0,
              peritosCount['Rafael Arcanjo'] || 0,
              peritosCount['Maisa Letícia'] || 0
            ],
            backgroundColor: 'rgba(167, 202, 201, 0.5)',
            borderColor: '#A7CAC9',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  // Função para gerar PDF com suporte a múltiplas páginas
  window.gerarPDF = function(index) {
    const caso = casos[index];
    console.log('Gerando PDF para caso:', caso);
    const doc = new jsPDF();

    // Configurações de página
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const maxWidth = 180;
    let yPosition = margin;
    const lineHeight = 10;
    const imageHeight = 50;
    const imageWidth = 50;
    const spaceAfterImage = 10;

    // Função para verificar se há espaço suficiente e adicionar nova página se necessário
    function checkPageSpace(requiredHeight) {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    }

    // Título
    doc.setFontSize(16);
    doc.text('Relatório de Caso', margin, yPosition);
    yPosition += lineHeight * 2;

    // Nome do Caso
    doc.setFontSize(12);
    checkPageSpace(lineHeight);
    doc.text(`Nome do Caso: ${caso.nomeCaso || 'N/A'}`, margin, yPosition);
    yPosition += lineHeight;

    // Data
    checkPageSpace(lineHeight);
    doc.text(`Data: ${caso.data || 'N/A'}`, margin, yPosition);
    yPosition += lineHeight;

    // Perito
    checkPageSpace(lineHeight);
    doc.text(`Perito: ${caso.perito || 'N/A'}`, margin, yPosition);
    yPosition += lineHeight;

    // Status
    checkPageSpace(lineHeight);
    doc.text(`Status: ${caso.status || 'Em andamento'}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Descrição
    checkPageSpace(lineHeight);
    doc.text('Detalhe do Caso:', margin, yPosition);
    yPosition += lineHeight;
    const descricaoLines = doc.splitTextToSize(caso.descricao || 'N/A', maxWidth);
    for (const line of descricaoLines) {
      checkPageSpace(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight;

    // Diagnóstico
    checkPageSpace(lineHeight);
    doc.text('Evidência:', margin, yPosition);
    yPosition += lineHeight;
    const diagnosticoLines = doc.splitTextToSize(caso.diagnostico || 'N/A', maxWidth);
    for (const line of diagnosticoLines) {
      checkPageSpace(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight;

    // Observações
    checkPageSpace(lineHeight);
    doc.text('Observações:', margin, yPosition);
    yPosition += lineHeight;
    const observacoesLines = doc.splitTextToSize(caso.observacoes || 'Nenhuma', maxWidth);
    for (const line of observacoesLines) {
      checkPageSpace(lineHeight);
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight * 2;

    // Fotos
    if (caso.fotos && caso.fotos.length > 0) {
      checkPageSpace(lineHeight);
      doc.text('Fotos:', margin, yPosition);
      yPosition += lineHeight;

      caso.fotos.forEach((foto, i) => {
        try {
          checkPageSpace(imageHeight + spaceAfterImage);
          doc.addImage(foto, 'JPEG', margin, yPosition, imageWidth, imageHeight);
          yPosition += imageHeight + spaceAfterImage;
          console.log(`Foto ${i + 1} adicionada ao PDF: ${foto.substring(0, 50)}...`);
        } catch (e) {
          console.error(`Erro ao adicionar foto ${i + 1} ao PDF:`, e);
          mostrarToast(`Erro ao adicionar foto ${i + 1} ao PDF.`, 'warning');
        }
      });
    } else {
      console.log('Nenhuma foto para adicionar ao PDF.');
    }

    doc.save(`caso_${(caso.nomeCaso || 'caso').replace(/\s+/g, '_')}_${caso.id}.pdf`);
  };

  // Carrossel de casos
  function atualizarCasos() {
    if (!laudosCarousel) return;
    $(laudosCarousel).owlCarousel('destroy');
    laudosCarousel.innerHTML = '';
    if (casos.length === 0) {
      laudosCarousel.innerHTML = '<div class="item"><div class="box"><div class="detail-box"><p>Nenhum caso salvo</p></div></div></div>';
    } else {
      casos.forEach((caso, index) => {
        const fotosCount = caso.fotos ? caso.fotos.length : 0;
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `
          <div class="box">
            <div class="img-box">
              <img src="images/laudos.png" alt="Pasta" />
            </div>
            <div class="detail-box">
              <h5>${caso.nomeCaso || `Caso ${index + 1}`}</h5>
              <p>${fotosCount} foto(s)</p>
              <div class="btn-box">
                <button class="btn btn-custom" onclick="window.location.href='Adicionar_casos.html?id=${caso.id}'">Editar</button>
              </div>
            </div>
          </div>
        `;
        laudosCarousel.appendChild(item);
      });
    }
    $('.team_carousel').owlCarousel({
      loop: true,
      margin: 15,
      dots: true,
      autoplay: true,
      navText: [
        '<i class="fa fa-angle-left" aria-hidden="true"></i>',
        '<i class="fa fa-angle-right" aria-hidden="true"></i>'
      ],
      autoplayHoverPause: true,
      responsive: {
        0: { items: 1, margin: 0 },
        576: { items: 2 },
        992: { items: 3 }
      }
    });
  }
});

// Gerenciamento de Usuários
$(document).ready(function() {
  // Carregar usuários do localStorage
  function loadUsers() {
    var users = JSON.parse(localStorage.getItem("users")) || [];
    $("#userTableBody").empty();
    users.forEach(function(user, index) {
      $("#userTableBody").append(`
        <tr>
          <td>${user.nome}</td>
          <td>${user.email}</td>
          <td>${user.tipo}</td>
          <td>
            <button class="btn btn-black edit-user" data-index="${index}">Editar</button>
            <button class="btn btn-danger delete-user" data-index="${index}">Excluir</button>
          </td>
        </tr>
      `);
    });
  }

  // Carregar usuários ao iniciar
  loadUsers();

  // Salvar/Atualizar usuário
  $("#userForm").submit(function(event) {
    event.preventDefault();
    var userIndex = $("#userIndex").val();
    var user = {
      nome: $("#nome").val(),
      email: $("#email").val(),
      senha: $("#senha").val(),
      tipo: $("#tipo").val()
    };
    var users = JSON.parse(localStorage.getItem("users")) || [];

    if (userIndex === "") {
      // Adicionar novo usuário
      users.push(user);
    } else {
      // Atualizar usuário existente
      users[userIndex] = user;
      $("#userIndex").val("");
      $("#cancelEdit").hide();
    }

    localStorage.setItem("users", JSON.stringify(users));
    loadUsers();
    $("#userForm")[0].reset();
  });

  // Editar usuário
  $(document).on("click", ".edit-user", function() {
    var index = $(this).data("index");
    var users = JSON.parse(localStorage.getItem("users")) || [];
    var user = users[index];

    $("#nome").val(user.nome);
    $("#email").val(user.email);
    $("#senha").val(user.senha);
    $("#tipo").val(user.tipo);
    $("#userIndex").val(index);
    $("#cancelEdit").show();
  });

  // Cancelar edição
  $("#cancelEdit").click(function() {
    $("#userForm")[0].reset();
    $("#userIndex").val("");
    $(this).hide();
  });

  // Excluir usuário
  $(document).on("click", ".delete-user", function() {
    var index = $(this).data("index");
    var users = JSON.parse(localStorage.getItem("users")) || [];
    users.splice(index, 1);
    localStorage.setItem("users", JSON.stringify(users));
    loadUsers();
  });

  // Função para mostrar toast (reutilizada para login)
  function mostrarToast(mensagem, tipo = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="3000">
        <div class="toast-header">
          <strong class="me-auto">Notificação</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
        <div class="toast-body">${mensagem}</div>
      </div>
    `;
    toastContainer.innerHTML += toastHTML;
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
  }

  // Validação e envio do formulário de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      // Validação dos campos
      let isValid = true;
      if (!email) {
        emailInput.classList.add('is-invalid');
        isValid = false;
      } else {
        emailInput.classList.remove('is-invalid');
      }
      if (!password) {
        passwordInput.classList.add('is-invalid');
        isValid = false;
      } else {
        passwordInput.classList.remove('is-invalid');
      }

      if (!isValid) {
        mostrarToast('Por favor, preencha todos os campos.', 'warning');
        return;
      }

      // Verificar credenciais no localStorage
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const user = users.find(u => u.email === email && u.senha === password);

      if (user) {
        // Armazenar informações do usuário logado
        localStorage.setItem('usuarioLogado', JSON.stringify({
          id: user.email,
          nome: user.nome,
          tipo: user.tipo,
          email: user.email
        }));
        
        mostrarToast('Login realizado com sucesso!', 'success');
        // Redirecionar para o Dashboard
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        mostrarToast('Email ou senha incorretos.', 'danger');
      }
    });
  }
});

// Verificação de autenticação
document.addEventListener('DOMContentLoaded', () => {
  // Função para verificar autenticação e permissões
  function verificarAutenticacao() {
    // Não verificar autenticação na página de login
    if (window.location.pathname.includes('Login.html')) {
      return;
    }

    // Verificar se o usuário está autenticado
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (!usuarioLogado) {
      // Redirecionar para a página de login
      window.location.href = 'Login.html';
      return;
    }

    // Verificar se a página atual é Gerenciar_usuarios.html e se o usuário é Administrador
    if (window.location.pathname.includes('Gerenciar_usuarios.html')) {
      const usuario = JSON.parse(usuarioLogado);
      if (usuario.tipo !== 'Administrador') {
        // Mostrar mensagem de acesso negado e redirecionar para o Dashboard
        mostrarToast('Acesso negado! Apenas administradores podem acessar esta página.', 'danger');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
        return;
      }
    }

    // Ocultar o link "Gerenciar Usuários" para usuários não-administradores
    const usuario = JSON.parse(usuarioLogado);
    const gerenciarUsuariosLink = document.querySelector('a[href="Gerenciar_usuarios.html"]');
    if (gerenciarUsuariosLink && usuario.tipo !== 'Administrador') {
      const navItem = gerenciarUsuariosLink.closest('.nav-item');
      if (navItem) {
        navItem.style.display = 'none';
        console.log('Link "Gerenciar Usuários" ocultado para usuário não-administrador:', usuario);
      }
    }
  }

  // Verificar autenticação ao carregar a página
  verificarAutenticacao();

  // Função de logout
  window.logout = function() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'Login.html';
  };

  // Adicionar botão de logout ao menu de navegação
  const navbarMenu = document.querySelector('.navbar-nav');
  if (navbarMenu) {
    const logoutItem = document.createElement('li');
    logoutItem.className = 'nav-item';

    // Verificar se o usuário está logado para mostrar o botão de logout
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado) {
      const usuario = JSON.parse(usuarioLogado);

      // Criar item de menu com nome do usuário
      const userItem = document.createElement('li');
      userItem.className = 'nav-item';
      userItem.innerHTML = `<span class="nav-link">Olá, ${usuario.nome}</span>`;
      navbarMenu.appendChild(userItem);

      // Adicionar botão de logout
      logoutItem.innerHTML = '<a class="nav-link" href="#" onclick="logout()">Logout</a>';
      navbarMenu.appendChild(logoutItem);
    }
  }

  // Modificar a função de login para armazenar informações do usuário
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      // Validação dos campos
      let isValid = true;
      if (!email) {
        emailInput.classList.add('is-invalid');
        isValid = false;
      } else {
        emailInput.classList.remove('is-invalid');
      }
      if (!password) {
        passwordInput.classList.add('is-invalid');
        isValid = false;
      } else {
        passwordInput.classList.remove('is-invalid');
      }

      if (!isValid) {
        mostrarToast('Por favor, preencha todos os campos.', 'warning');
        return;
      }

      // Verificar credenciais no localStorage
      const users = JSON.parse(localStorage.getItem('users')) || [];
      const user = users.find(u => u.email === email && u.senha === password);

      if (user) {
        // Armazenar informações do usuário logado
        localStorage.setItem('usuarioLogado', JSON.stringify({
          id: user.email,
          nome: user.nome,
          tipo: user.tipo,
          email: user.email
        }));

        mostrarToast('Login realizado com sucesso!', 'success');
        // Redirecionar para o Dashboard
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        mostrarToast('Email ou senha incorretos.', 'danger');
      }
    });
  }
});