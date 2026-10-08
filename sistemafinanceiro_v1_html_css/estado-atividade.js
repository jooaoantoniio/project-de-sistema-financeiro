/* ==========================================================================
   MEU FINANCEIRO - Estado da Descoberta Guiada (módulo compartilhado)
   Usado pelo dashboard e pela atividade. Guarda no localStorage a etapa,
   as respostas, o prompt e o estado do dashboard (antes/depois).
   ========================================================================== */
(function () {
  "use strict";

  var CHAVE = "meuFinanceiro.descobertaGuiada.v2";

  function estadoInicial() {
    return {
      etapa: 1,
      respostas: {
        olhar: null,         // etapa 1: para onde o olhar foi primeiro
        atencao: null,       // etapa 1: o saldo recebe a atenção devida?
        concorrente: null,   // etapa 2
        alavancas: [],       // etapa 3
        olharDepois: null,   // etapa 5
        melhorou: null       // etapa 5
      },
      prompt: "",
      promptEditado: false,  // o usuário mexeu na sugestão gerada?
      dashboard: {
        melhorado: false,
        posicao: false,
        alteracoes: []
      },
      ultimoResultado: null
    };
  }

  /* Mescla o salvo com o inicial, tolerando chaves ausentes */
  function mesclar(base, salvo) {
    if (!salvo || typeof salvo !== "object") return base;
    Object.keys(base).forEach(function (chave) {
      if (!(chave in salvo)) return;
      var valor = base[chave];
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        base[chave] = mesclar(valor, salvo[chave]);
      } else {
        base[chave] = salvo[chave];
      }
    });
    return base;
  }

  function carregar() {
    try {
      var bruto = window.localStorage.getItem(CHAVE);
      return mesclar(estadoInicial(), bruto ? JSON.parse(bruto) : null);
    } catch (erro) {
      return estadoInicial();
    }
  }

  function salvar(estado) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (erro) {
      /* Armazenamento indisponível (modo privado, cota): segue sem salvar */
    }
  }

  function limpar() {
    try {
      window.localStorage.removeItem(CHAVE);
    } catch (erro) {
      /* Nada a limpar */
    }
  }

  /* Aplica (dashboard.melhorado) ou remove (null) o estado "depois" num painel */
  function aplicarNoPainel(painel, dashboard) {
    if (!painel) return;
    var melhorado = Boolean(dashboard && dashboard.melhorado);
    painel.classList.toggle("painel--hierarquia", melhorado);
    painel.classList.toggle("painel--hierarquia-posicao", melhorado && Boolean(dashboard.posicao));
  }

  /* Liga as transições só depois do primeiro desenho, para a página não "crescer" ao carregar */
  function ativarTransicoes(paineis) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        paineis.forEach(function (painel) { painel.classList.add("painel--animado"); });
      });
    });
  }

  window.EstadoAtividade = {
    estadoInicial: estadoInicial,
    carregar: carregar,
    salvar: salvar,
    limpar: limpar,
    aplicarNoPainel: aplicarNoPainel,
    ativarTransicoes: ativarTransicoes
  };
})();
