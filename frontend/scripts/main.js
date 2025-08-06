document.addEventListener('DOMContentLoaded', () => {
  const formLancamento = document.getElementById('formLancamento');
  const tipoInput = document.getElementById('tipo');
  const valorInput = document.getElementById('valor');
  const categoriaInput = document.getElementById('categoria');
  const descricaoInput = document.getElementById('descricao');
  const dataInput = document.getElementById('data');
  const listaLancamentosUl = document.getElementById('listaLancamentos');
  const totalEntradasSpan = document.getElementById('totalEntradas');
  const totalSaidasSpan = document.getElementById('totalSaidas');
  const saldoAtualSpan = document.getElementById('saldoAtual');
  const filtroTipoSelect = document.getElementById('filtroTipo');
  const filtroCategoriaInput = document.getElementById('filtroCategoria');
  const filtroMesInput = document.getElementById('filtroMes');
  const btnFiltrar = document.getElementById('btnFiltrar');
  const logoutBtn = document.getElementById('logoutBtn');

  let graficoPizzaChart;
  let graficoBarrasChart;
  let lancamentos = [];

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function renderizarLancamentos(lancamentosFiltrados = lancamentos) {
    listaLancamentosUl.innerHTML = '';
    let totalEntradas = 0;
    let totalSaidas = 0;

    lancamentosFiltrados.forEach(lancamento => {
      const li = document.createElement('li');
      li.className = lancamento.tipo === 'entrada' ? 'entrada' : 'saida';
      li.innerHTML = `
        <div>
          <strong>${lancamento.categoria}</strong> - ${lancamento.descricao}<br>
          <span>${new Date(lancamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
        </div>
        <div>
          <span>${formatarMoeda(lancamento.valor)}</span>
          <button class="excluir-btn" data-id="${lancamento.id}">Excluir</button>
        </div>
      `;
      listaLancamentosUl.appendChild(li);

      if (lancamento.tipo === 'entrada') totalEntradas += lancamento.valor;
      else totalSaidas += lancamento.valor;
    });

    totalEntradasSpan.textContent = formatarMoeda(totalEntradas);
    totalSaidasSpan.textContent = formatarMoeda(totalSaidas);
    saldoAtualSpan.textContent = formatarMoeda(totalEntradas - totalSaidas);
  }

  function atualizarGraficos(lancamentosParaGraficos = lancamentos) {
    const categorias = {};
    lancamentosParaGraficos.forEach(lancamento => {
      const chave = `${lancamento.tipo} - ${lancamento.categoria}`;
      categorias[chave] = (categorias[chave] || 0) + lancamento.valor;
    });

    const categoriasLabels = Object.keys(categorias);
    const categoriasData = Object.values(categorias);

    if (graficoPizzaChart) graficoPizzaChart.destroy();
    if (document.getElementById('graficoPizza')) {
      const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
      graficoPizzaChart = new Chart(ctxPizza, {
        type: 'pie',
        data: {
          labels: categoriasLabels,
          datasets: [{
            data: categoriasData,
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
            hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
          }]
        },
        options: {
          responsive: true,
          plugins: { title: { display: true, text: 'Gastos por Categoria' } }
        }
      });
    }

    const totaisPorPeriodo = {};
    lancamentosParaGraficos.forEach(lanc => {
      const data = new Date(lanc.data + 'T00:00:00');
      const mesAno = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!totaisPorPeriodo[mesAno]) totaisPorPeriodo[mesAno] = { entradas: 0, saidas: 0 };
      if (lanc.tipo === 'entrada') totaisPorPeriodo[mesAno].entradas += lanc.valor;
      else totaisPorPeriodo[mesAno].saidas += lanc.valor;
    });

    const labels = Object.keys(totaisPorPeriodo).sort();
    const entradas = labels.map(l => totaisPorPeriodo[l].entradas);
    const saidas = labels.map(l => totaisPorPeriodo[l].saidas);

    if (graficoBarrasChart) graficoBarrasChart.destroy();
    if (document.getElementById('graficoBarras')) {
      const ctxBarras = document.getElementById('graficoBarras').getContext('2d');
      graficoBarrasChart = new Chart(ctxBarras, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Entradas', data: entradas, backgroundColor: 'rgba(54,162,235,0.6)', borderColor: 'rgba(54,162,235,1)' },
            { label: 'Saídas', data: saidas, backgroundColor: 'rgba(255,99,132,0.6)', borderColor: 'rgba(255,99,132,1)' }
          ]
        },
        options: {
          responsive: true,
          plugins: { title: { display: true, text: 'Entradas e Saídas por Mês' } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }

  async function carregarDashboard() {
    try {
      const response = await fetch('/api/lancamentos');
      if (!response.ok) {
        throw new Error('Falha ao carregar os lançamentos. Talvez a sessão tenha expirado.');
      }
      lancamentos = await response.json();
      renderizarLancamentos();
      atualizarGraficos();
    } catch (error) {
      console.error('Erro:', error);
      window.location.href = '/login.html';
    }
  }

  formLancamento.addEventListener('submit', async (e) => {
    e.preventDefault();
    const novo = {
      tipo: tipoInput.value,
      valor: parseFloat(valorInput.value),
      categoria: categoriaInput.value.trim(),
      descricao: descricaoInput.value.trim(),
      data: dataInput.value
    };

    if (novo.valor <= 0 || isNaN(novo.valor)) return alert('Insira um valor válido.');
    if (!novo.categoria) return alert('Insira uma categoria.');
    if (!novo.data) return alert('Selecione uma data.');

    const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
    const totalSaidas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
    const saldoAtual = totalEntradas - totalSaidas;

    if (novo.tipo === 'saida' && novo.valor > saldoAtual) {
      return alert('Saldo insuficiente. Você não pode registrar uma saída maior que o saldo atual.');
    }

    try {
      const response = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novo)
      });
      if (!response.ok) {
        throw new Error('Falha ao adicionar lançamento');
      }
      formLancamento.reset();
      carregarDashboard();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao adicionar lançamento.');
    }
  });

  listaLancamentosUl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('excluir-btn')) {
      const id = e.target.dataset.id;
      if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        try {
          const response = await fetch(`/api/lancamentos/${id}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            throw new Error('Falha ao excluir lançamento');
          }
          carregarDashboard();
        } catch (error) {
          console.error('Erro:', error);
          alert('Erro ao excluir lançamento.');
        }
      }
    }
  });

  btnFiltrar.addEventListener('click', () => {
    const tipo = filtroTipoSelect.value;
    const cat = filtroCategoriaInput.value.toLowerCase().trim();
    const mes = filtroMesInput.value;

    const filtrados = lancamentos.filter(l => {
      const matchTipo = tipo === '' || l.tipo === tipo;
      const matchCat = cat === '' || l.categoria.toLowerCase().includes(cat);
      let matchMes = true;
      if (mes) {
        const d = new Date(l.data + 'T00:00:00');
        const mesAno = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        matchMes = mesAno === mes;
      }
      return matchTipo && matchCat && matchMes;
    });

    renderizarLancamentos(filtrados);
    atualizarGraficos(filtrados);
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/logout', {
      method: 'POST'
    });
    window.location.href = '/login.html';
  });

  carregarDashboard();
});