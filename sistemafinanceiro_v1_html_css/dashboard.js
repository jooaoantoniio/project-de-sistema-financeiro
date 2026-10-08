/* ==========================================================================
   MEU FINANCEIRO - Dashboard
   Se o prompt da Descoberta Guiada foi aplicado, mostra o painel "depois"
   e permite alternar com o "antes". Sem prompt aplicado, o dashboard
   continua exatamente como o original.
   ========================================================================== */
(function () {
  "use strict";

  var painel = document.getElementById("painel");
  var aviso = document.getElementById("aviso-painel");
  var texto = document.getElementById("aviso-painel-texto");
  var botao = document.getElementById("alternar-painel");
  if (!painel || !aviso || !botao || !window.EstadoAtividade) return;

  var dashboard = window.EstadoAtividade.carregar().dashboard;
  if (!dashboard.melhorado) return;

  var vendoAntes = false;

  function atualizar() {
    window.EstadoAtividade.aplicarNoPainel(painel, vendoAntes ? null : dashboard);
    botao.setAttribute("aria-pressed", String(vendoAntes));
    botao.textContent = vendoAntes ? "Ver depois" : "Ver antes";
    texto.textContent = vendoAntes
      ? "Você está vendo o painel original, antes do prompt."
      : "Você está vendo o painel depois do prompt aplicado na Descoberta Guiada.";
  }

  botao.addEventListener("click", function () {
    vendoAntes = !vendoAntes;
    atualizar();
  });

  aviso.hidden = false;
  atualizar();
  window.EstadoAtividade.ativarTransicoes([painel]);
})();
