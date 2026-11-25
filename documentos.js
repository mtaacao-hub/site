/* Documentos do RI na ficha (acoes.html e fiis.html).
 *
 * Pedido do Ricardo (25/11/2026). O dado vem do pipeline
 * (extrair_documentos.py -> documentos.json): para acao, o IPE da CVM
 * (fato relevante, release de resultado, apresentacao, comunicado, aviso aos
 * acionistas); para FII, o Fundos.NET da B3 (relatorio gerencial, fato
 * relevante, comunicado, aviso aos cotistas, assembleia). O arquivo (~2 MB)
 * so e buscado quando alguem abre a aba.
 *
 *   Documentos.abrir(elemento, "acoes", cnpj)   ou   (elemento, "fiis", ticker)
 *
 * O link vem encurtado do pipeline: "r:<protocolo>:<sequencia>:<versao>" e o
 * download do RAD; "f:<id>", o documento no Fundos.NET.
 */
(function () {
  "use strict";
  var pedido = null, MOSTRA = 30;
  var ORDEM = ["Resultado", "Relatório gerencial", "Apresentação", "Fato relevante", "Comunicado",
               "Aviso aos acionistas", "Aviso aos cotistas", "Assembleia", "Relatório"];
  var PLURAL = { "Resultado": "Resultados", "Relatório gerencial": "Relatórios gerenciais",
                 "Apresentação": "Apresentações", "Fato relevante": "Fatos relevantes",
                 "Comunicado": "Comunicados", "Aviso aos acionistas": "Avisos aos acionistas",
                 "Aviso aos cotistas": "Avisos aos cotistas", "Assembleia": "Assembleias",
                 "Relatório": "Outros relatórios" };
  var DESTAQUE = { "Resultado": 1, "Relatório gerencial": 1, "Fato relevante": 1, "Apresentação": 1 };

  var css =
    ".doc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}" +
    ".doc-chips button{font:inherit;font-size:.74rem;padding:5px 10px;border-radius:16px;cursor:pointer;" +
    "border:1px solid var(--line-forte,#d8d1c2);background:var(--card,#fff);color:var(--ink-2,#3d4f66)}" +
    ".doc-chips button[aria-pressed=true]{background:var(--ink,#10233B);color:#fff;border-color:var(--ink,#10233B)}" +
    ".doc-lista{background:var(--card,#fff);border:1px solid var(--line,#e6e1d6);border-radius:12px}" +
    ".doc-l{display:grid;grid-template-columns:86px 150px 1fr;gap:10px;align-items:baseline;padding:10px 14px;" +
    "border-top:1px solid var(--line,#e6e1d6);font-size:.82rem}" +
    ".doc-l:first-child{border-top:0}" +
    ".doc-l .d{color:var(--ink-3,#6b7a8c);font-variant-numeric:tabular-nums;font-size:.76rem}" +
    ".doc-l .t{font-size:.7rem;font-weight:700;color:var(--ink-2,#3d4f66);text-transform:uppercase;letter-spacing:.04em}" +
    ".doc-l .t.forte{color:var(--gold-ink,#8A6D12)}" +
    ".doc-l a{color:var(--ink,#10233B);text-decoration:none}" +
    ".doc-l a:hover{text-decoration:underline}" +
    ".doc-mais{display:block;margin:10px auto 0;font:inherit;font-size:.78rem;border:0;background:none;" +
    "color:var(--ink-2,#3d4f66);text-decoration:underline;cursor:pointer}" +
    ".doc-fonte{font-size:.72rem;color:var(--ink-3,#6b7a8c);margin:10px 2px 0;line-height:1.6}" +
    "@media (max-width:640px){.doc-l{grid-template-columns:78px 1fr}.doc-l a{grid-column:1 / -1}}";
  var estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function dataBR(iso) { var p = String(iso).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso; }
  function link(ref) {
    var m = /^r:(\d+):(\d+):(\d+)$/.exec(ref);
    if (m) return "https://www.rad.cvm.gov.br/ENET/frmDownloadDocumento.aspx?Tela=ext&descTipo=IPE&CodigoInstituicao=1" +
                  "&numProtocolo=" + m[1] + "&numSequencia=" + m[2] + "&numVersao=" + m[3];
    m = /^f:(\d+)$/.exec(ref);
    if (m) return "https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?id=" + m[1] + "&cvm=true";
    return /^https:\/\//.test(ref) ? ref : "#";
  }
  function carregar() {
    if (!pedido) pedido = fetch("documentos.json").then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    return pedido;
  }

  function desenhar(el, docs, lado, filtro, quantos) {
    var cont = {};
    docs.forEach(function (d) { cont[d[1]] = (cont[d[1]] || 0) + 1; });
    var tipos = ORDEM.filter(function (t) { return cont[t]; });
    var lista = filtro ? docs.filter(function (d) { return d[1] === filtro; }) : docs;
    el.innerHTML =
      '<div class="doc-chips"><button data-f="" aria-pressed="' + !filtro + '">Todos · ' + docs.length + "</button>" +
      tipos.map(function (t) {
        return '<button data-f="' + esc(t) + '" aria-pressed="' + (filtro === t) + '">' + esc(PLURAL[t] || t) +
               " · " + cont[t] + "</button>";
      }).join("") + "</div>" +
      '<div class="doc-lista">' + lista.slice(0, quantos).map(function (d) {
        return '<div class="doc-l"><span class="d">' + dataBR(d[0]) + '</span><span class="t' +
          (DESTAQUE[d[1]] ? " forte" : "") + '">' + esc(d[1]) + '</span><a href="' + esc(link(d[3])) +
          '" target="_blank" rel="noopener">' + esc(d[2]) + "</a></div>";
      }).join("") + "</div>" +
      (lista.length > quantos ? '<button class="doc-mais">Mostrar mais (' + (lista.length - quantos) + ")</button>" : "") +
      '<p class="doc-fonte">' + (lado === "acoes"
        ? "Documentos entregues à CVM pela companhia (IPE), últimos 18 meses. O link baixa o PDF do RAD da CVM."
        : "Documentos do fundo no Fundos.NET da B3, últimos 18 meses. O link abre o PDF no site da B3.") +
      " Comunicados e avisos: os 25 mais recentes.</p>";
    el.onclick = function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      if (b.classList.contains("doc-mais")) desenhar(el, docs, lado, filtro, quantos + 50);
      else if (b.dataset.f !== undefined) desenhar(el, docs, lado, b.dataset.f, MOSTRA);
    };
  }

  window.Documentos = {
    abrir: function (el, lado, chave) {
      el.innerHTML = '<div class="carregando">Carregando os documentos…</div>';
      carregar().then(function (d) {
        // a aba mudou (ou outro papel abriu) antes de o arquivo chegar
        if (el.dataset.chave !== chave) return;
        var docs = d && d[lado] && d[lado][chave];
        if (!d) { el.innerHTML = '<div class="vazio">Não consegui carregar os documentos.</div>'; return; }
        if (!docs || !docs.length) { el.innerHTML = '<div class="vazio">Nenhum documento nos últimos 18 meses.</div>'; return; }
        desenhar(el, docs, lado, "", MOSTRA);
      });
      el.dataset.chave = chave;
    }
  };
})();
