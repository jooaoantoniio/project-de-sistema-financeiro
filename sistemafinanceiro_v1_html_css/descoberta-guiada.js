/* ==========================================================================
   MEU FINANCEIRO - Descoberta Guiada
   Fluxo: Teste → Concorrente → Alavanca → Prompt → Validação.
   Todo o estado (etapa, respostas, prompt e dashboard) fica no localStorage
   através de estado-atividade.js. A "IA" é simulada em servico-ia.js.
   ========================================================================== */
(function () {
  "use strict";

  var Estado = window.EstadoAtividade;
  if (!Estado || typeof window.applyAIPrompt !== "function") return;

  var TOTAL_ETAPAS = 5;
  var DURACAO_TESTE_S = 3;
  var reduzirMovimento = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     CONTEÚDO
     Os tamanhos citados são os valores reais de estilos.css.
     ------------------------------------------------------------------------ */
  var OPCOES = {
    olhar: [
      ["conta-corrente", "Saldo / Conta Corrente"], ["cartao", "Cartão"], ["dinheiro", "Dinheiro"],
      ["entradas", "Entradas do mês"], ["saidas", "Saídas do mês"], ["outro", "Outro"]
    ],
    atencao: [["sim", "Sim"], ["nao", "Não"], ["nao-sei", "Não tenho certeza"]],
    concorrente: [
      ["cartao", "Cartão"], ["dinheiro", "Dinheiro"], ["entradas", "Entradas do mês"],
      ["saidas", "Saídas do mês"], ["titulo", "Título"], ["outro", "Outro"]
    ],
    alavancas: [
      ["tamanho", "Tamanho", "Aumentar ou reduzir o destaque."],
      ["cor", "Cor", "Usar contraste para indicar importância."],
      ["espaco", "Espaço", "Criar respiro e reduzir competição."],
      ["posicao", "Posição", "Colocar o elemento importante em uma área de maior destaque."]
    ],
    olharDepois: [
      ["conta-corrente", "Saldo / Conta Corrente"], ["cartao", "Cartão"], ["dinheiro", "Dinheiro"],
      ["entradas", "Entradas"], ["saidas", "Saídas"], ["outro", "Outro"]
    ],
    melhorou: [
      ["sim", "Sim, ficou mais clara"],
      ["parcial", "Melhorou, mas ainda pode melhorar"],
      ["nao", "Não melhorou"]
    ]
  };

  var MULTIPLA = { alavancas: true };

  var FEEDBACK_OLHAR = {
    "conta-corrente": "Você chegou ao saldo, mas provavelmente pela posição (canto superior esquerdo). Ele tem o mesmo tamanho, cor e peso de Cartão e Dinheiro.",
    cartao: "Cartão é visualmente idêntico ao saldo. Sem diferença de peso, o olho não tem um ponto de entrada claro.",
    dinheiro: "Dinheiro é visualmente idêntico ao saldo. Sem diferença de peso, o olho não tem um ponto de entrada claro.",
    entradas: "Faz sentido: “Entradas do mês” é o maior número da tela (1.8rem) e está em verde saturado. O saldo (1.5rem) perdeu a disputa.",
    saidas: "Faz sentido: “Saídas do mês” é maior que o saldo (1.8rem contra 1.5rem) e usa vermelho, a cor que sinaliza alerta.",
    outro: "Se o olhar foi para outro lugar, como o título, o saldo não está liderando a leitura da tela."
  };

  var FEEDBACK_ATENCAO = {
    sim: "Repare: o saldo usa 1.5rem, o mesmo de Cartão e Dinheiro, e é menor que Entradas e Saídas (1.8rem). Ele pode ter ganhado pela posição, não pela hierarquia.",
    nao: "Exato. O dado mais importante tem o mesmo peso, ou menos, que os secundários.",
    "nao-sei": "Essa dúvida já é um diagnóstico: quando a hierarquia é clara, a resposta é imediata."
  };

  var FEEDBACK_CONCORRENTE = {
    cartao: "Cartão tem o mesmo tamanho (1.5rem), peso e cor do saldo: disputa a atenção de igual para igual.",
    dinheiro: "Dinheiro tem o mesmo tamanho (1.5rem), peso e cor do saldo: disputa a atenção de igual para igual.",
    entradas: "“Entradas do mês” usa 1.8rem e verde saturado: é maior do que o próprio saldo.",
    saidas: "“Saídas do mês” usa 1.8rem e vermelho, a cor de alerta, que puxa o olho antes de tudo.",
    titulo: "O título “Meu Painel” (1.8rem, azul-marinho) é maior que o saldo e fica logo acima dele.",
    outro: "Qualquer elemento com peso igual ou maior que o saldo rouba atenção. O importante é perceber a disputa."
  };

  var EXPLICACAO_ALAVANCA = {
    tamanho: "O saldo (1.5rem) é menor que Entradas e Saídas (1.8rem). Aumentar o saldo e reduzir os secundários cria a diferença que falta.",
    cor: "O saldo usa o mesmo azul de Cartão e Dinheiro. Um fundo escuro de alto contraste o separa do resto.",
    espaco: "Todos os cards têm o mesmo padding e espaçamento. Dar respiro ao saldo e agrupar os secundários reduz a competição.",
    posicao: "O saldo já começa no canto superior esquerdo, mas divide a linha com dois cards iguais. Ocupar a linha inteira o isola no topo."
  };

  var NOME_CONCORRENTE_PROMPT = {
    cartao: "Cartão",
    dinheiro: "Dinheiro",
    entradas: "Entradas do mês",
    saidas: "Saídas do mês",
    titulo: "título “Meu Painel”"
  };

  var DICAS_CONTINUAR = {
    1: "Responda às duas perguntas para continuar.",
    2: "Escolha o elemento que mais compete com o saldo para continuar.",
    3: "Escolha ao menos uma alavanca para continuar.",
    4: "Aplique o prompt para continuar.",
    5: "Responda às duas perguntas para concluir."
  };

  /* ------------------------------------------------------------------------
     ESTADO
     ------------------------------------------------------------------------ */
  var estado = Estado.carregar();
  var modoPrevia = "antes";
  var aplicando = false;
  var erroAplicacao = "";
  var testeEmAndamento = false;
  var aguardandoResposta = false; // cortina após o teste até responder
  var cronometro = null;
  var focoPrevia = null;

  /* ------------------------------------------------------------------------
     UTILITÁRIOS
     ------------------------------------------------------------------------ */
  function $(seletor, contexto) {
    return (contexto || document).querySelector(seletor);
  }

  function $$(seletor, contexto) {
    return Array.prototype.slice.call((contexto || document).querySelectorAll(seletor));
  }

  /* Cria elemento com texto (nunca injeta HTML) */
  function el(tag, classe, texto) {
    var elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
  }

  function salvar() {
    Estado.salvar(estado);
  }

  function rotulo(tipo, valor) {
    var opcao = OPCOES[tipo].filter(function (item) { return item[0] === valor; })[0];
    return opcao ? opcao[1] : "";
  }

  function listaEmTexto(itens) {
    if (itens.length <= 1) return itens.join("");
    return itens.slice(0, -1).join(", ") + " e " + itens[itens.length - 1];
  }

  function anunciar(mensagem) {
    var regiao = $("#anuncio");
    regiao.textContent = "";
    window.setTimeout(function () { regiao.textContent = mensagem; }, 60);
  }

  /* Reconstrói um feedback só quando o conteúdo muda (evita releitura no leitor de tela) */
  function atualizarFeedback(id, chave, construir) {
    var caixa = document.getElementById(id);
    if (caixa.dataset.chave === chave) return;
    caixa.dataset.chave = chave;
    caixa.textContent = "";
    if (chave) caixa.appendChild(construir());
  }

  function caixaFeedback(tipo, titulo) {
    var caixa = el("div", "feedback__caixa feedback__caixa--" + tipo);
    if (titulo) caixa.appendChild(el("p", "feedback__titulo", titulo));
    return caixa;
  }

  function botaoIrPara(etapa, texto) {
    var botao = el("button", "botao botao--secundario botao--pequeno", texto);
    botao.type = "button";
    botao.dataset.irEtapa = String(etapa);
    return botao;
  }

  /* ------------------------------------------------------------------------
     REGRAS
     ------------------------------------------------------------------------ */
  function etapaConcluida(n) {
    var r = estado.respostas;
    switch (n) {
      case 1: return Boolean(r.olhar && r.atencao);
      case 2: return Boolean(r.concorrente);
      case 3: return r.alavancas.length > 0;
      case 4: return estado.dashboard.melhorado;
      case 5: return Boolean(r.olharDepois && r.melhorou);
      default: return false;
    }
  }

  /* Maior etapa que o usuário pode abrir: a primeira ainda não concluída */
  function etapaLiberada() {
    for (var n = 1; n <= TOTAL_ETAPAS; n++) {
      if (!etapaConcluida(n)) return n;
    }
    return TOTAL_ETAPAS;
  }

  function totalConcluidas() {
    var total = 0;
    for (var n = 1; n <= TOTAL_ETAPAS; n++) if (etapaConcluida(n)) total++;
    return total;
  }

  function gerarPrompt() {
    var r = estado.respostas;
    var alavancas = r.alavancas.length
      ? listaEmTexto(r.alavancas.map(function (id) { return rotulo("alavancas", id).toLowerCase(); }))
      : "tamanho e cor";
    var concorrente = NOME_CONCORRENTE_PROMPT[r.concorrente];
    var trechoConcorrente = concorrente
      ? "reduza a competição do elemento " + concorrente
      : "reduza a competição dos elementos secundários";
    return "Destaque o saldo da Conta Corrente como a principal informação do dashboard. " +
      "Use " + alavancas + " para aumentar sua hierarquia visual e " + trechoConcorrente + ". " +
      "Mantenha o layout limpo, profissional e responsivo.";
  }

  function modoPadrao(n) {
    if (!estado.dashboard.melhorado || n < 4) return "antes";
    return n === 5 ? "comparar" : "depois";
  }

  /* ------------------------------------------------------------------------
     MONTAGEM
     ------------------------------------------------------------------------ */
  function criarOpcoes() {
    $$("[data-opcoes]").forEach(function (grupo) {
      var tipo = grupo.dataset.opcoes;
      var multipla = Boolean(MULTIPLA[tipo]);

      OPCOES[tipo].forEach(function (opcao) {
        var valor = opcao[0];
        var label = el("label", multipla ? "alavanca" : "opcao");
        var entrada = el("input", "opcao__entrada");
        entrada.type = multipla ? "checkbox" : "radio";
        entrada.name = grupo.dataset.campo;
        entrada.value = valor;
        label.appendChild(entrada);

        if (multipla) {
          var textos = el("span", "alavanca__textos");
          textos.appendChild(el("span", "alavanca__nome", opcao[1]));
          textos.appendChild(el("span", "alavanca__descricao", opcao[2]));
          label.appendChild(textos);
        } else {
          label.appendChild(el("span", "opcao__texto", opcao[1]));
          if (valor !== "outro" && /olhar|concorrente/i.test(tipo)) label.dataset.alvo = valor;
        }
        grupo.appendChild(label);
      });
    });
  }

  function montarPrevia() {
    var modelo = $("#modelo-painel");
    $$(".previa__quadro").forEach(function (quadro) {
      quadro.appendChild(modelo.content.cloneNode(true));
    });
  }

  /* ------------------------------------------------------------------------
     RENDERIZAÇÃO
     ------------------------------------------------------------------------ */
  function renderizar() {
    renderizarProgresso();
    renderizarEtapas();
    renderizarNavegacao();
    renderizarPrevia();
  }

  function renderizarProgresso() {
    var concluidas = totalConcluidas();
    var liberada = etapaLiberada();
    $("#progresso-etapa").textContent = "Etapa " + estado.etapa + " de " + TOTAL_ETAPAS;
    $("#progresso-concluidas").textContent = concluidas + " de " + TOTAL_ETAPAS + " concluídas";
    $("#progresso-preenchimento").style.width = (concluidas / TOTAL_ETAPAS) * 100 + "%";
    var barra = $("#progresso-barra");
    barra.setAttribute("aria-valuenow", String(concluidas));
    barra.setAttribute("aria-valuetext", concluidas + " de " + TOTAL_ETAPAS + " etapas concluídas");

    $$(".passo").forEach(function (botao) {
      var n = Number(botao.dataset.irEtapa);
      var atual = n === estado.etapa;
      botao.classList.toggle("passo--atual", atual);
      botao.classList.toggle("passo--concluido", etapaConcluida(n));
      botao.disabled = n > liberada;
      if (atual) botao.setAttribute("aria-current", "step");
      else botao.removeAttribute("aria-current");
    });
  }

  function marcar(nome, valores) {
    $$('input[name="' + nome + '"]').forEach(function (entrada) {
      entrada.checked = valores.indexOf(entrada.value) !== -1;
    });
  }

  function renderizarEtapas() {
    var r = estado.respostas;
    $$(".etapa").forEach(function (secao) {
      secao.hidden = Number(secao.dataset.etapa) !== estado.etapa;
    });

    marcar("olhar", r.olhar ? [r.olhar] : []);
    marcar("atencao", r.atencao ? [r.atencao] : []);
    marcar("concorrente", r.concorrente ? [r.concorrente] : []);
    marcar("alavancas", r.alavancas);
    marcar("olharDepois", r.olharDepois ? [r.olharDepois] : []);
    marcar("melhorou", r.melhorou ? [r.melhorou] : []);

    $("#iniciar-teste").disabled = testeEmAndamento;

    renderizarFeedback1();
    renderizarFeedback2();
    renderizarFeedback3();
    renderizarEtapa4();
    renderizarEtapa5();
  }

  function renderizarFeedback1() {
    var r = estado.respostas;
    var chave = r.olhar || r.atencao ? (r.olhar || "") + "|" + (r.atencao || "") : "";
    atualizarFeedback("feedback-1", chave, function () {
      var caixa = caixaFeedback("info");
      if (r.olhar) {
        caixa.appendChild(el("p", "feedback__titulo", "Para onde o olhar foi"));
        caixa.appendChild(el("p", null, FEEDBACK_OLHAR[r.olhar]));
      }
      if (r.atencao) {
        caixa.appendChild(el("p", "feedback__titulo", "O saldo recebe a atenção devida?"));
        caixa.appendChild(el("p", null, FEEDBACK_ATENCAO[r.atencao]));
      }
      if (r.olhar && r.atencao) {
        caixa.appendChild(el("p", "feedback__destaque",
          "Diagnóstico: a informação mais importante não é a que chama atenção primeiro."));
      }
      return caixa;
    });
  }

  function renderizarFeedback2() {
    var r = estado.respostas;
    atualizarFeedback("feedback-2", r.concorrente || "", function () {
      var caixa = caixaFeedback("sucesso", "Boa observação! 👏");
      caixa.appendChild(el("p", null, FEEDBACK_CONCORRENTE[r.concorrente]));
      caixa.appendChild(el("p", "feedback__destaque", "Você encontrou o concorrente. Agora escolha a alavanca para resolver."));
      return caixa;
    });
  }

  function renderizarFeedback3() {
    var r = estado.respostas;
    var escolhidas = OPCOES.alavancas
      .map(function (opcao) { return opcao[0]; })
      .filter(function (id) { return r.alavancas.indexOf(id) !== -1; });

    atualizarFeedback("feedback-3", escolhidas.join(","), function () {
      var temPrincipais = escolhidas.indexOf("tamanho") !== -1 || escolhidas.indexOf("cor") !== -1;
      var caixa = caixaFeedback(temPrincipais ? "sucesso" : "info", "Por que isso funciona");
      var lista = el("ul", "explicacoes");
      escolhidas.forEach(function (id) {
        var item = el("li", "explicacoes__item");
        item.appendChild(el("strong", "explicacoes__nome", rotulo("alavancas", id)));
        item.appendChild(el("span", null, EXPLICACAO_ALAVANCA[id]));
        lista.appendChild(item);
      });
      caixa.appendChild(lista);
      caixa.appendChild(el("p", "feedback__destaque", temPrincipais
        ? "Boa escolha: tamanho e cor são as alavancas que mais faltam neste dashboard."
        : "Dica: tamanho e cor são as alavancas que mais faltam neste dashboard. Considere incluí-las."));
      return caixa;
    });
  }

  function renderizarEtapa4() {
    var r = estado.respostas;
    $("#resumo-olhar").textContent = r.olhar ? rotulo("olhar", r.olhar) : "—";
    $("#resumo-concorrente").textContent = r.concorrente ? rotulo("concorrente", r.concorrente) : "—";
    $("#resumo-alavanca").textContent = r.alavancas.length
      ? listaEmTexto(r.alavancas.map(function (id) { return rotulo("alavancas", id); }))
      : "—";

    if (!estado.promptEditado) estado.prompt = gerarPrompt();
    var campo = $("#campo-prompt");
    if (campo.value !== estado.prompt) campo.value = estado.prompt;

    var botao = $("#aplicar-prompt");
    botao.disabled = aplicando || campo.value.trim().length === 0;
    botao.textContent = aplicando ? "Aplicando…" : "Aplicar prompt";
    botao.setAttribute("aria-busy", String(aplicando));
    $("#gerar-sugestao").disabled = aplicando || !estado.promptEditado;

    var chave = aplicando ? "aplicando" : erroAplicacao ? "erro:" + erroAplicacao : "";
    atualizarFeedback("feedback-4", chave, function () {
      if (aplicando) {
        var carregando = caixaFeedback("info");
        carregando.classList.add("feedback__caixa--carregando");
        carregando.appendChild(el("p", null, "A IA está lendo o seu prompt e aplicando a melhoria…"));
        return carregando;
      }
      var erro = caixaFeedback("alerta", "A IA não conseguiu aplicar");
      erro.appendChild(el("p", null, erroAplicacao));
      return erro;
    });
  }

  function renderizarEtapa5() {
    var r = estado.respostas;
    var dashboard = estado.dashboard;

    var chaveAlteracoes = dashboard.melhorado ? JSON.stringify(dashboard.alteracoes) : "vazio";
    atualizarFeedback("alteracoes", chaveAlteracoes, function () {
      if (!dashboard.melhorado) {
        var vazio = caixaFeedback("alerta", "Nenhum prompt aplicado ainda");
        vazio.appendChild(el("p", null, "Aplique um prompt na etapa 04 para validar o resultado."));
        vazio.appendChild(botaoIrPara(4, "Ir para a etapa 04"));
        return vazio;
      }
      var bloco = el("div", "alteracoes__bloco");
      bloco.appendChild(el("p", "alteracoes__titulo", "O que a IA mudou"));
      var lista = el("ul", "alteracoes__lista");
      dashboard.alteracoes.forEach(function (texto) { lista.appendChild(el("li", null, texto)); });
      bloco.appendChild(lista);
      return bloco;
    });

    var chave = r.melhorou ? r.melhorou + "|" + (r.olharDepois || "") : "";
    atualizarFeedback("feedback-5", chave, function () {
      var caixa;
      if (r.melhorou === "sim") {
        caixa = caixaFeedback("sucesso", "✅ Excelente! Você diagnosticou o problema e dirigiu a IA para corrigir a hierarquia visual.");
        caixa.classList.add("feedback__caixa--vitoria");
        if (r.olharDepois === "conta-corrente") {
          caixa.appendChild(el("p", null, "Seu olhar agora vai direto para o saldo: a hierarquia está funcionando."));
        } else if (r.olharDepois) {
          caixa.appendChild(el("p", null, "Atenção: seu olhar ainda foi para “" + rotulo("olharDepois", r.olharDepois) + "”. Vale reforçar o prompt numa próxima rodada."));
        }
      } else if (r.melhorou === "parcial") {
        caixa = caixaFeedback("info", "🔄 Boa análise. Revise o prompt e tente novamente.");
        caixa.appendChild(el("p", null, "Dica: cite mais de uma alavanca, como tamanho e cor, ou peça para o saldo ocupar a linha inteira no topo."));
        caixa.appendChild(botaoIrPara(4, "Revisar o prompt"));
      } else {
        caixa = caixaFeedback("alerta", "💡 Volte às quatro alavancas e refine o diagnóstico.");
        caixa.appendChild(botaoIrPara(3, "Voltar às alavancas"));
      }
      return caixa;
    });
  }

  function renderizarNavegacao() {
    var n = estado.etapa;
    var concluida = etapaConcluida(n);
    var ultima = n === TOTAL_ETAPAS;
    $("#etapa-voltar").disabled = n === 1;
    $("#etapa-continuar").hidden = ultima;
    $("#etapa-continuar").disabled = !concluida;
    $("#ver-dashboard").hidden = !(ultima && concluida);
    $("#continuar-dica").textContent = concluida ? "" : DICAS_CONTINUAR[n];
  }

  function renderizarPrevia() {
    var melhorado = estado.dashboard.melhorado;
    if (!melhorado) modoPrevia = "antes";

    $$(".segmentado__botao").forEach(function (botao) {
      var modo = botao.dataset.modo;
      botao.disabled = modo !== "antes" && !melhorado;
      botao.setAttribute("aria-pressed", String(modo === modoPrevia));
    });

    $("#previa-palco").dataset.modo = modoPrevia;
    Estado.aplicarNoPainel($('[data-versao="antes"] .painel'), null);
    Estado.aplicarNoPainel($('[data-versao="depois"] .painel'), estado.dashboard);

    $("#previa-cortina").hidden = !(aguardandoResposta && estado.etapa === 1 && !testeEmAndamento);
    renderizarMarcas();
  }

  /* Marcas na prévia: seu olhar, concorrente, principal e destaque ao passar o mouse */
  function renderizarMarcas() {
    var r = estado.respostas;
    var marcas = { antes: {}, depois: {} };

    if (estado.etapa === 1 && r.olhar && r.olhar !== "outro" && !testeEmAndamento) {
      marcas.antes[r.olhar] = ["olhar", "Seu olhar"];
    }
    if (estado.etapa === 2 && r.concorrente) {
      if (r.concorrente !== "outro") marcas.antes[r.concorrente] = ["concorrente", "Concorrente"];
      marcas.antes["conta-corrente"] = ["principal", "Principal"];
    }
    if (estado.etapa === 5 && r.olharDepois && r.olharDepois !== "outro") {
      marcas.depois[r.olharDepois] = ["olhar", "Seu olhar"];
    }

    $$(".previa__quadro").forEach(function (quadro) {
      var daVersao = marcas[quadro.dataset.versao];
      $$("[data-elemento]", quadro).forEach(function (alvo) {
        var marca = daVersao[alvo.dataset.elemento];
        if (marca) {
          alvo.dataset.marca = marca[0];
          alvo.dataset.marcaRotulo = marca[1];
        } else {
          delete alvo.dataset.marca;
          delete alvo.dataset.marcaRotulo;
        }
        alvo.classList.toggle("previa__alvo--foco", alvo.dataset.elemento === focoPrevia);
      });
    });
  }

  /* ------------------------------------------------------------------------
     AÇÕES
     ------------------------------------------------------------------------ */
  function cancelarTeste() {
    if (cronometro) window.clearInterval(cronometro);
    cronometro = null;
    testeEmAndamento = false;
    $("#previa-contador").hidden = true;
  }

  function irParaEtapa(n, focar) {
    if (n < 1 || n > etapaLiberada()) return;
    cancelarTeste();
    aguardandoResposta = false;
    erroAplicacao = "";
    focoPrevia = null;
    estado.etapa = n;
    modoPrevia = modoPadrao(n);
    salvar();
    renderizar();
    if (focar) {
      var titulo = $("#etapa-" + n + "-titulo");
      titulo.setAttribute("tabindex", "-1");
      titulo.focus();
    }
  }

  function iniciarTeste() {
    if (testeEmAndamento) return;
    testeEmAndamento = true;
    aguardandoResposta = false;
    estado.respostas.olhar = null;
    modoPrevia = "antes";
    salvar();
    renderizar();

    var palco = $("#previa-palco");
    var caixa = palco.getBoundingClientRect();
    if (caixa.top < 0 || caixa.bottom > window.innerHeight) {
      palco.scrollIntoView({ behavior: reduzirMovimento ? "auto" : "smooth", block: "center" });
    }

    var contador = $("#previa-contador");
    var restante = DURACAO_TESTE_S;
    contador.textContent = String(restante);
    contador.hidden = false;
    anunciar("Teste iniciado. Observe a prévia do dashboard por 3 segundos.");

    cronometro = window.setInterval(function () {
      restante--;
      if (restante > 0) {
        contador.textContent = String(restante);
        return;
      }
      cancelarTeste();
      aguardandoResposta = true;
      renderizar();
      anunciar("Tempo esgotado. Para onde seu olhar foi primeiro?");
      var primeira = $('input[name="olhar"]');
      if (primeira) primeira.focus({ preventScroll: true });
    }, 1000);
  }

  function aplicarPrompt() {
    var prompt = $("#campo-prompt").value.trim();
    if (aplicando || !prompt) return;

    aplicando = true;
    erroAplicacao = "";
    renderizar();

    window.applyAIPrompt(prompt)
      .then(function (resultado) {
        aplicando = false;
        if (!resultado.aplicou) {
          erroAplicacao = resultado.mensagem;
          renderizar();
          return;
        }
        estado.dashboard = {
          melhorado: true,
          posicao: Boolean(resultado.posicao),
          alteracoes: resultado.alteracoes.slice()
        };
        // Um novo resultado precisa ser validado de novo
        estado.respostas.olharDepois = null;
        estado.respostas.melhorou = null;
        salvar();
        anunciar("Prompt aplicado. Compare o antes e o depois.");
        irParaEtapa(5, true);
        animarPrevia();
      })
      .catch(function () {
        aplicando = false;
        erroAplicacao = "Não foi possível falar com a IA agora. Tente novamente.";
        renderizar();
      });
  }

  function animarPrevia() {
    if (reduzirMovimento) return;
    var palco = $("#previa-palco");
    palco.classList.remove("previa__palco--atualizado");
    void palco.offsetWidth;
    palco.classList.add("previa__palco--atualizado");
  }

  function reiniciar() {
    if (!window.confirm("Reiniciar a atividade? Todas as respostas e o prompt serão apagados.")) return;
    cancelarTeste();
    Estado.limpar();
    estado = Estado.estadoInicial();
    aplicando = false;
    aguardandoResposta = false;
    erroAplicacao = "";
    $$("[data-chave]").forEach(function (caixa) { delete caixa.dataset.chave; });
    irParaEtapa(1, true);
    anunciar("Atividade reiniciada.");
  }

  /* ------------------------------------------------------------------------
     EVENTOS
     ------------------------------------------------------------------------ */
  document.addEventListener("change", function (evento) {
    var alvo = evento.target;
    var r = estado.respostas;
    if (!(alvo.name in r)) return;

    if (MULTIPLA[alvo.name]) {
      r[alvo.name] = $$('input[name="' + alvo.name + '"]:checked').map(function (e) { return e.value; });
    } else {
      r[alvo.name] = alvo.value;
    }
    if (alvo.name === "olhar") aguardandoResposta = false;
    salvar();
    renderizar();
  });

  document.addEventListener("click", function (evento) {
    var botao = evento.target.closest("button");
    if (!botao || botao.disabled) return;

    if (botao.dataset.irEtapa) {
      irParaEtapa(Number(botao.dataset.irEtapa), true);
      return;
    }
    if (botao.dataset.modo) {
      modoPrevia = botao.dataset.modo;
      renderizarPrevia();
      return;
    }
    switch (botao.id) {
      case "iniciar-teste": iniciarTeste(); break;
      case "aplicar-prompt": aplicarPrompt(); break;
      case "etapa-voltar": irParaEtapa(estado.etapa - 1, true); break;
      case "etapa-continuar": irParaEtapa(estado.etapa + 1, true); break;
      case "reiniciar": reiniciar(); break;
      case "gerar-sugestao":
        estado.promptEditado = false;
        salvar();
        renderizar();
        $("#campo-prompt").focus();
        break;
      default: break;
    }
  });

  $("#campo-prompt").addEventListener("input", function (evento) {
    estado.prompt = evento.target.value;
    estado.promptEditado = true;
    erroAplicacao = "";
    salvar();
    renderizarEtapa4();
  });

  /* Destaque na prévia ao passar o mouse ou focar uma opção */
  function definirFoco(evento) {
    var label = evento.target.closest && evento.target.closest("[data-alvo]");
    var entrando = evento.type === "mouseover" || evento.type === "focusin";
    var novo = entrando && label ? label.dataset.alvo : null;
    if (novo === focoPrevia) return;
    focoPrevia = novo;
    renderizarMarcas();
  }
  ["mouseover", "mouseout", "focusin", "focusout"].forEach(function (tipo) {
    $(".estudio__etapas").addEventListener(tipo, definirFoco);
  });

  /* ------------------------------------------------------------------------
     INÍCIO
     ------------------------------------------------------------------------ */
  criarOpcoes();
  montarPrevia();
  if (estado.etapa > etapaLiberada()) estado.etapa = etapaLiberada();
  modoPrevia = modoPadrao(estado.etapa);
  renderizar();
  Estado.ativarTransicoes($$(".previa__quadro .painel"));
})();
