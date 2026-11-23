/* Menu das ferramentas Muita Ação.
 *
 * UM arquivo so, incluido por todas as paginas das ferramentas com uma linha
 * logo depois de <body>:
 *     <script src="menu.js"></script>
 * Mudar o menu e mudar SO este arquivo (antes eram oito cabecalhos para manter
 * iguais). Compartilhado entre as duas frentes: cada uma inclui a linha nas
 * paginas dela; a lista abaixo so muda com aviso a outra.
 *
 * E menu INTERNO: liga as ferramentas entre si. Elas continuam fora do site
 * pessoal (nenhum link de la para ca) e com noindex. Ficam FORA de proposito
 * a dados-cvm.html e a auditoria.html (paginas de auditoria do Ricardo; a
 * dados-cvm ainda mostra o ranking da Magic Formula).
 *
 * Faixa marinho de largura inteira: serve nas paginas claras (acoes, fiis,
 * carteira...) e nas escuras (calculadora), sem depender do CSS de nenhuma.
 */
(function () {
  "use strict";
  var ITENS = [
    ["acoes.html", "Ações"],
    ["fiis.html", "FIIs"],
    ["fundos.html", "Fundos"],
    ["bolsa.html", "Bolsa"],
    ["comparador.html", "Comparador"],
    ["carteira.html", "Carteira"],
    ["calculadora-preco-teto.html", "Calculadora"]
  ];
  var aqui = (location.pathname.split("/").pop() || "").toLowerCase();

  var css =
    ".ma-menu{background:#10233B;font-family:Poppins,Arial,Helvetica,sans-serif;" +
    /* fundo de borda a borda sem estourar a largura da pagina (100vw conta a
       barra de rolagem e criaria rolagem lateral) */
    "box-shadow:0 0 0 100vmax #10233B;clip-path:inset(0 -100vmax);margin-bottom:6px}" +
    ".ma-menu .ma-in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:2px;" +
    "overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}" +
    ".ma-menu .ma-in::-webkit-scrollbar{display:none}" +
    ".ma-menu .ma-marca{display:flex;align-items:center;gap:7px;margin-right:12px;" +
    "color:#F4EFE3;font-weight:800;font-size:.82rem;text-decoration:none;white-space:nowrap;padding:9px 0}" +
    ".ma-menu a.ma-item{color:rgba(244,239,227,.72);text-decoration:none;font-size:.8rem;" +
    "font-weight:600;padding:10px 11px;white-space:nowrap;border-bottom:2px solid transparent;" +
    "transition:color .15s}" +
    ".ma-menu a.ma-item:hover{color:#F4EFE3}" +
    ".ma-menu a.ma-item[aria-current=page]{color:#fff;border-bottom-color:#C9A227}" +
    "@media print{.ma-menu{display:none}}";
  var estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  var monograma =
    '<svg width="22" height="14" viewBox="0 0 200 120" aria-hidden="true"><g fill="#C9A227">' +
    '<rect x="12" y="60" width="16" height="35"/><rect x="47" y="35" width="16" height="45"/>' +
    '<rect x="82" y="14" width="16" height="98"/><rect x="117" y="40" width="16" height="45"/>' +
    '<rect x="152" y="48" width="16" height="27"/></g></svg>';

  var nav = document.createElement("nav");
  nav.className = "ma-menu";
  nav.setAttribute("aria-label", "Ferramentas Muita Ação");
  nav.innerHTML = '<div class="ma-in"><a class="ma-marca" href="acoes.html">' + monograma +
    "Muita Ação</a>" + ITENS.map(function (it) {
      var atual = it[0] === aqui;
      return '<a class="ma-item" href="' + it[0] + '"' + (atual ? ' aria-current="page"' : "") +
             ">" + it[1] + "</a>";
    }).join("") + "</div>";

  function por() {
    document.body.insertBefore(nav, document.body.firstChild);
    // colado no topo em qualquer pagina: a calculadora tem padding no body e
    // o menu ficava abaixo de uma faixa vazia
    var pt = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
    if (pt) nav.style.marginTop = (-pt) + "px";
  }
  if (document.body) por(); else document.addEventListener("DOMContentLoaded", por);
  // o item da pagina atual visivel no celular (a faixa rola de lado)
  setTimeout(function () {
    var a = nav.querySelector("[aria-current=page]");
    if (a && a.scrollIntoView) a.scrollIntoView({ block: "nearest", inline: "center" });
  }, 0);
})();
