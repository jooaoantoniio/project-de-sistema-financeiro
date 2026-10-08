/* ==========================================================================
   MEU FINANCEIRO - Serviço de IA (simulado)
   Nesta versão a "IA" roda no navegador: lê o prompt e decide como o
   dashboard deve mudar. Nenhuma API externa é chamada.

   Para conectar uma IA real, substitua o corpo de applyAIPrompt por uma
   chamada de API (fetch) que devolva o MESMO formato:

   {
     aplicou: boolean,        // a melhoria foi aplicada?
     posicao: boolean,        // o saldo deve ir para a linha inteira, no topo?
     alteracoes: ["..."],     // o que mudou, em linguagem simples
     mensagem: "..."          // explicação para o usuário
   }
   ========================================================================== */
(function () {
  "use strict";

  var ATRASO_SIMULADO_MS = 900;
  var TAMANHO_MINIMO = 15;

  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function interpretar(prompt) {
    var texto = normalizar(prompt);

    if (texto.trim().length < TAMANHO_MINIMO) {
      return {
        aplicou: false,
        posicao: false,
        alteracoes: [],
        mensagem: "O pedido está curto demais. Diga o que deve se destacar e como."
      };
    }

    if (!/saldo|conta corrente|principal/.test(texto)) {
      return {
        aplicou: false,
        posicao: false,
        alteracoes: [],
        mensagem: "A IA não entendeu qual informação deve se destacar. Cite o saldo da Conta Corrente no pedido."
      };
    }

    var posicao = /\bposic|topo|linha inteira|primeiro lugar|largura total/.test(texto);
    var alteracoes = [
      "Saldo da Conta Corrente maior e com mais peso (800).",
      "Fundo azul-escuro de alto contraste no card principal.",
      "Mais respiro em volta do saldo e secundários agrupados.",
      "Cartão, Dinheiro, Entradas e Saídas menores e com menos contraste."
    ];
    if (posicao) alteracoes.push("Saldo movido para a linha inteira, no topo do painel.");

    return {
      aplicou: true,
      posicao: posicao,
      alteracoes: alteracoes,
      mensagem: "Melhoria aplicada ao dashboard."
    };
  }

  /**
   * Recebe o prompt e devolve (Promise) o resultado da "IA".
   * Ponto único de integração: troque por uma chamada real de API.
   */
  function applyAIPrompt(prompt) {
    return new Promise(function (resolve) {
      var resultado = interpretar(prompt);
      window.setTimeout(function () {
        resolve(resultado);
      }, ATRASO_SIMULADO_MS);
    });
  }

  window.applyAIPrompt = applyAIPrompt;
})();
