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


    let lancamentos = JSON.parse(localStorage.getItem('lancamentos')) || [];

    function salvarLancamentos() {
        localStorage.setItem('lancamentos', JSON.stringify(lancamentos));
    }


    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }


    function renderizarLancamentos(lancamentosFiltrados = lancamentos) {
        listaLancamentosUl.innerHTML = ''; 
        let totalEntradas = 0;
        let totalSaidas = 0;

        lancamentosFiltrados.forEach((lancamento, index) => {
            const li = document.createElement('li');
            li.className = lancamento.tipo === 'entrada' ? 'entrada' : 'saida';
            li.innerHTML = `
                <div>
                    <strong>${lancamento.categoria}</strong> - ${lancamento.descricao}<br>
                    <span>${new Date(lancamento.data).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                    <span>${formatarMoeda(lancamento.valor)}</span>
                    <button class="excluir-btn" data-index="${index}">Excluir</button>
                </div>
            `;
            listaLancamentosUl.appendChild(li);

            if (lancamento.tipo === 'entrada') {
                totalEntradas += lancamento.valor;
            } else {
                totalSaidas += lancamento.valor;
            }
        });


        totalEntradasSpan.textContent = formatarMoeda(totalEntradas);
        totalSaidasSpan.textContent = formatarMoeda(totalSaidas);
        saldoAtualSpan.textContent = formatarMoeda(totalEntradas - totalSaidas);
    }


    function atualizarGraficos(lancamentosParaGraficos = lancamentos) {
        const categorias = {};
        lancamentosParaGraficos.forEach(lancamento => {
            if (lancamento.tipo === 'saida') { 
                categorias[lancamento.categoria] = (categorias[lancamento.categoria] || 0) + lancamento.valor;
            }
        });

        const categoriasLabels = Object.keys(categorias);
        const categoriasData = Object.values(categorias);

        if (graficoPizzaChart) {
            graficoPizzaChart.destroy(); 
        }

        const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
        graficoPizzaChart = new Chart(ctxPizza, {
            type: 'pie',
            data: {
                labels: categoriasLabels,
                datasets: [{
                    data: categoriasData,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#C9CBCE', '#7B7B7B', '#A2D9CE', '#FADBD8'
                    ],
                    hoverBackgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#C9CBCE', '#7B7B7B', '#A2D9CE', '#FADBD8'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Gastos por Categoria'
                    }
                }
            }
        });

        const totaisPorPeriodo = {};
        lancamentosParaGraficos.forEach(lancamento => {
            const dataLancamento = new Date(lancamento.data + 'T00:00:00'); 
            const mesAno = `${dataLancamento.getFullYear()}-${(dataLancamento.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!totaisPorPeriodo[mesAno]) {
                totaisPorPeriodo[mesAno] = { entradas: 0, saidas: 0 };
            }
            if (lancamento.tipo === 'entrada') {
                totaisPorPeriodo[mesAno].entradas += lancamento.valor;
            } else {
                totaisPorPeriodo[mesAno].saidas += lancamento.valor;
            }
        });

        const periodosLabels = Object.keys(totaisPorPeriodo).sort(); 
        const entradasPorPeriodo = periodosLabels.map(periodo => totaisPorPeriodo[periodo].entradas);
        const saidasPorPeriodo = periodosLabels.map(periodo => totaisPorPeriodo[periodo].saidas);

        if (graficoBarrasChart) {
            graficoBarrasChart.destroy(); 
        }

        const ctxBarras = document.getElementById('graficoBarras').getContext('2d');
        graficoBarrasChart = new Chart(ctxBarras, {
            type: 'bar', 
            data: {
                labels: periodosLabels,
                datasets: [
                    {
                        label: 'Entradas',
                        data: entradasPorPeriodo,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)', 
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Saídas',
                        data: saidasPorPeriodo,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)', 
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Entradas e Saídas por Mês'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }    function carregarDashboard() {
        renderizarLancamentos();
        atualizarGraficos();
    }



    formLancamento.addEventListener('submit', (e) => {
        e.preventDefault(); 

        const novoLancamento = {
            tipo: tipoInput.value,
            valor: parseFloat(valorInput.value),
            categoria: categoriaInput.value.trim(),
            descricao: descricaoInput.value.trim(),
            data: dataInput.value
        };

        if (novoLancamento.valor <= 0 || isNaN(novoLancamento.valor)) {
            alert('Por favor, insira um valor válido e positivo.');
            return;
        }
        if (!novoLancamento.categoria) {
             alert('Por favor, insira uma categoria.');
             return;
        }
        if (!novoLancamento.data) {
            alert('Por favor, selecione uma data.');
            return;
        }

        lancamentos.push(novoLancamento);
        salvarLancamentos();
        carregarDashboard(); 
        formLancamento.reset(); 
    });

    listaLancamentosUl.addEventListener('click', (e) => {
        if (e.target.classList.contains('excluir-btn')) {
            const index = e.target.dataset.index;
            lancamentos.splice(index, 1); 
            salvarLancamentos();
            carregarDashboard(); 
        }
    });

    btnFiltrar.addEventListener('click', () => {
        const filtroTipo = filtroTipoSelect.value;
        const filtroCategoria = filtroCategoriaInput.value.toLowerCase().trim();
        const filtroMes = filtroMesInput.value; 
        const lancamentosFiltrados = lancamentos.filter(lancamento => {
            const matchTipo = filtroTipo === '' || lancamento.tipo === filtroTipo;
            const matchCategoria = filtroCategoria === '' || lancamento.categoria.toLowerCase().includes(filtroCategoria);
            
            let matchMes = true;
            if (filtroMes) {
                const dataLancamento = new Date(lancamento.data + 'T00:00:00');
                const mesAnoLancamento = `${dataLancamento.getFullYear()}-${(dataLancamento.getMonth() + 1).toString().padStart(2, '0')}`;
                matchMes = mesAnoLancamento === filtroMes;
            }
            
            return matchTipo && matchCategoria && matchMes;
        });

        renderizarLancamentos(lancamentosFiltrados);
        atualizarGraficos(lancamentosFiltrados); 
    });

    logoutBtn.addEventListener('click', () => {
        alert('Você saiu!');
    });


    carregarDashboard();
});