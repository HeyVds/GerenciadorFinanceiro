const lista = document.getElementById('listaLancamentos');
const form = document.getElementById('formLancamento');
const tipo = document.getElementById('tipo');
const valor = document.getElementById('valor');
const categoria = document.getElementById('categoria');
const descricao = document.getElementById('descricao');
const data = document.getElementById('data');

const filtroTipo = document.getElementById('filtroTipo');
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroMes = document.getElementById('filtroMes');
const btnFiltrar = document.getElementById('btnFiltrar');

const totalEntradas = document.getElementById('totalEntradas');
const totalSaidas = document.getElementById('totalSaidas');
const saldoAtual = document.getElementById('saldoAtual');

const logoutBtn = document.getElementById('logoutBtn');

const graficoPizza = document.getElementById('graficoPizza');
const graficoBarras = document.getElementById('graficoBarras');

let chartPizza, chartBarras;

function formatarValor(num) {
  return Number(num).toFixed(2);
}

// ------------ Carregar e exibir lançamentos ------------
async function carregarLancamentos() {
  const params = new URLSearchParams();
  if (filtroTipo.value) params.append('tipo', filtroTipo.value);
  if (filtroCategoria.value) params.append('categoria', filtroCategoria.value);
  if (filtroMes.value) params.append('mes', filtroMes.value);

  const res = await fetch('/transacoes?' + params.toString());
  if (res.status === 401) {
    window.location.href = 'login.html';
    return;
  }

  const dados = await res.json();

  lista.innerHTML = '';
  let entradas = 0, saidas = 0;
  const porCategoria = {};
  const porData = {};

  dados.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.data} - ${item.tipo.toUpperCase()} - R$ ${formatarValor(item.valor)} - ${item.categoria} (${item.descricao || '-'})`;

    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.onclick = async () => {
      if (confirm('Deseja excluir este lançamento?')) {
        await fetch(`/transacoes/${item.id}`, { method: 'DELETE' });
        carregarLancamentos();
      }
    };

    li.appendChild(btnExcluir);
    lista.appendChild(li);

    // Resumo
    if (item.tipo === 'entrada') entradas += item.valor;
    if (item.tipo === 'saida') saidas += item.valor;

    // Pizza: total por categoria
    if (!porCategoria[item.categoria]) porCategoria[item.categoria] = 0;
    porCategoria[item.categoria] += item.valor;

    // Barras: total por data
    const dia = item.data;
    if (!porData[dia]) porData[dia] = 0;
    porData[dia] += item.valor * (item.tipo === 'entrada' ? 1 : -1);
  });

  totalEntradas.textContent = formatarValor(entradas);
  totalSaidas.textContent = formatarValor(saidas);
  saldoAtual.textContent = formatarValor(entradas - saidas);

  atualizarGraficos(porCategoria, porData);
}

// ------------ Enviar novo lançamento ------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  await fetch('/transacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: tipo.value,
      valor: parseFloat(valor.value),
      categoria: categoria.value,
      descricao: descricao.value,
      data: data.value
    })
  });

  form.reset();
  carregarLancamentos();
});

// ------------ Filtros ------------
btnFiltrar.addEventListener('click', carregarLancamentos);

// ------------ Logout ------------
logoutBtn.addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  window.location.href = 'login.html';
});

// ------------ Gráficos ------------
function atualizarGraficos(pizzaData, barrasData) {
  const categorias = Object.keys(pizzaData);
  const valores = Object.values(pizzaData);

  if (chartPizza) chartPizza.destroy();
  chartPizza = new Chart(graficoPizza, {
    type: 'pie',
    data: {
      labels: categorias,
      datasets: [{
        data: valores,
        backgroundColor: gerarCores(categorias.length),
      }]
    }
  });

  const datas = Object.keys(barrasData).sort();
  const totais = datas.map(d => barrasData[d]);

  if (chartBarras) chartBarras.destroy();
  chartBarras = new Chart(graficoBarras, {
    type: 'bar',
    data: {
      labels: datas,
      datasets: [{
        label: 'Saldo Diário',
        data: totais,
        backgroundColor: 'rgba(54, 162, 235, 0.7)'
      }]
    }
  });
}

function gerarCores(qtd) {
  const cores = [];
  for (let i = 0; i < qtd; i++) {
    const cor = `hsl(${(i * 360) / qtd}, 70%, 60%)`;
    cores.push(cor);
  }
  return cores;
}

// ------------ Inicialização ------------
carregarLancamentos();
