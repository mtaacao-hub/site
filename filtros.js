/* Filtros da lista (acoes.html e fiis.html).
 *
 * Pedido do Ricardo (25/11/2026): a lista vira a pagina principal, filtravel
 * por multiplo ("DY maior que 4%, P/L menor que 7, P/VP menor que 1"), setor,
 * subsetor, endividamento e, para assinantes, preco abaixo de um metodo.
 *
 * O estado vai no ENDERECO (?dy_min=4&p_l_max=7&setor=...): um criterio vira
 * link que se guarda ou se manda. A pagina chama:
 *
 *   var F = Filtros({ el, grupos: [{nome, nota, campos: [{k, nome, unid, mult}]}],
 *                     selecoes: [{k, nome, opcoes: function (estado) -> [valor...]}],
 *                     aoMudar: function () {...} });
 *   F.passa(valores)   true se o papel passa (valores = o `ord` da lista)
 *   F.consulta()       "dy_min=4&p_l_max=7"
 *   F.lerUrl()         repoe o estado a partir do endereco (voltar do navegador)
 *
 * Campo com filtro e sem valor no papel (P/L de quem teve prejuizo, banco sem
 * EV/EBIT) NAO passa: "P/L menor que 7" nao inclui quem nao tem P/L.
 * `mult` divide o valor antes de comparar (valor de mercado em R$ bi: 1e9).
 */
(function () {
  "use strict";

  var css =
    ".flt{background:var(--card,#fff);border:1px solid var(--line,#e6e1d6);border-radius:12px;margin-top:12px}" +
    ".flt-topo{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:11px 14px}" +
    ".flt-abre{font:inherit;font-size:.8rem;font-weight:700;border:1px solid var(--line-forte,#d8d1c2);" +
    "background:var(--card,#fff);color:var(--ink,#10233B);border-radius:8px;padding:6px 11px;cursor:pointer}" +
    ".flt-abre[aria-expanded=true]{background:var(--ink,#10233B);color:#fff;border-color:var(--ink,#10233B)}" +
    ".flt-n{display:inline-block;min-width:18px;margin-left:5px;padding:0 5px;border-radius:9px;" +
    "background:#C9A227;color:#10233B;font-size:.7rem;text-align:center}" +
    ".flt-n:empty{display:none}" +
    ".flt-topo label{display:flex;align-items:center;gap:6px;font-size:.74rem;color:var(--ink-2,#3d4f66)}" +
    ".flt-topo select{font:inherit;font-size:.78rem;max-width:220px;padding:5px 7px;border-radius:7px;" +
    "border:1px solid var(--line-forte,#d8d1c2);background:var(--card,#fff);color:var(--ink,#10233B)}" +
    ".flt-limpa{margin-left:auto;font:inherit;font-size:.74rem;border:0;background:none;color:var(--ink-3,#6b7a8c);" +
    "cursor:pointer;text-decoration:underline}" +
    ".flt-corpo{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:4px 26px;" +
    "padding:4px 14px 14px;border-top:1px solid var(--line,#e6e1d6)}" +
    ".flt-corpo[hidden]{display:none}" +
    ".flt-g h4{margin:12px 0 4px;font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:var(--gold-ink,#8A6D12)}" +
    ".flt-g .flt-nota{font-size:.68rem;color:var(--ink-3,#6b7a8c);margin:0 0 4px;line-height:1.45}" +
    ".flt-l{display:grid;grid-template-columns:1fr 62px 12px 62px 22px;align-items:center;gap:4px;padding:2px 0}" +
    ".flt-l span{font-size:.76rem;color:var(--ink-2,#3d4f66)}" +
    ".flt-l .a{text-align:center;color:var(--ink-3,#6b7a8c);font-size:.7rem}" +
    ".flt-l .u{font-size:.7rem;color:var(--ink-3,#6b7a8c)}" +
    ".flt-l input{font:inherit;font-size:.78rem;width:100%;box-sizing:border-box;padding:4px 6px;border-radius:6px;" +
    "border:1px solid var(--line-forte,#d8d1c2);background:var(--card,#fff);color:var(--ink,#10233B);" +
    "font-variant-numeric:tabular-nums;text-align:right}" +
    ".flt-l input:focus{outline:2px solid #C9A227;outline-offset:-1px}" +
    ".flt-l input.ativo{border-color:#C9A227;background:#FFFBEF}";
  var estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  function num(s) {
    if (s === null || s === undefined) return null;
    s = String(s).trim().replace(/\s/g, "").replace(",", ".");
    if (!s || s === "-" || s === ".") return null;
    var v = Number(s);
    return isFinite(v) ? v : null;
  }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function mostra(v) { return v === undefined || v === null ? "" : String(v).replace(".", ","); }

  window.Filtros = function (opt) {
    var el = opt.el, grupos = opt.grupos || [], sels = opt.selecoes || [];
    var campos = [];
    grupos.forEach(function (g) { g.campos.forEach(function (c) { campos.push(c); }); });
    // no celular o painel ocupa uma tela inteira: comeca fechado (o botao
    // mostra quantos filtros estao ligados)
    var estado = {}, aberto = window.innerWidth >= 700, espera = null;

    function lerUrl() {
      var q = new URLSearchParams(location.search);
      estado = {};
      campos.forEach(function (c) {
        ["min", "max"].forEach(function (l) {
          var v = num(q.get(c.k + "_" + l));
          if (v !== null) estado[c.k + "_" + l] = v;
        });
      });
      sels.forEach(function (s) { var v = q.get(s.k); if (v) estado[s.k] = v; });
    }
    function consulta() {
      var q = new URLSearchParams();
      Object.keys(estado).forEach(function (k) { q.set(k, String(estado[k])); });
      return q.toString();
    }
    function ativos() { return Object.keys(estado).length; }
    function passa(o) {
      for (var i = 0; i < campos.length; i++) {
        var c = campos[i], lo = estado[c.k + "_min"], hi = estado[c.k + "_max"];
        if (lo === undefined && hi === undefined) continue;
        var v = o[c.k];
        if (v === null || v === undefined || !isFinite(v)) return false;
        v = v / (c.mult || 1);
        if (lo !== undefined && v < lo) return false;
        if (hi !== undefined && v > hi) return false;
      }
      for (var j = 0; j < sels.length; j++) {
        var s = sels[j];
        if (estado[s.k] && (o[s.k] || "") !== estado[s.k]) return false;
      }
      return true;
    }

    function opcoesHtml(s) {
      var lista = s.opcoes(estado);
      if (estado[s.k] && lista.indexOf(estado[s.k]) < 0) delete estado[s.k];
      return '<option value="">Todos</option>' + lista.map(function (v) {
        return '<option value="' + esc(v) + '"' + (estado[s.k] === v ? " selected" : "") + ">" + esc(v) + "</option>";
      }).join("");
    }
    function contar() {
      var n = el.querySelector(".flt-n");
      if (n) n.textContent = ativos() || "";
    }
    function montar() {
      el.innerHTML = '<div class="flt"><div class="flt-topo">' +
        '<button type="button" class="flt-abre" aria-expanded="' + aberto + '">Filtros<span class="flt-n"></span></button>' +
        sels.map(function (s) {
          return "<label>" + esc(s.nome) + ' <select data-s="' + esc(s.k) + '">' + opcoesHtml(s) + "</select></label>";
        }).join("") +
        '<button type="button" class="flt-limpa">Limpar filtros</button></div>' +
        '<div class="flt-corpo"' + (aberto ? "" : " hidden") + ">" + grupos.map(function (g) {
          return '<div class="flt-g"><h4>' + esc(g.nome) + "</h4>" +
            (g.nota ? '<p class="flt-nota">' + g.nota + "</p>" : "") +
            g.campos.map(function (c) {
              var lo = estado[c.k + "_min"], hi = estado[c.k + "_max"];
              return '<div class="flt-l"><span>' + esc(c.nome) + "</span>" +
                '<input inputmode="decimal" data-k="' + c.k + '_min" placeholder="mín" value="' + mostra(lo) + '"' +
                  (lo !== undefined ? ' class="ativo"' : "") + ' aria-label="' + esc(c.nome) + ' mínimo">' +
                '<span class="a">a</span>' +
                '<input inputmode="decimal" data-k="' + c.k + '_max" placeholder="máx" value="' + mostra(hi) + '"' +
                  (hi !== undefined ? ' class="ativo"' : "") + ' aria-label="' + esc(c.nome) + ' máximo">' +
                '<span class="u">' + esc(c.unid || "") + "</span></div>";
            }).join("") + "</div>";
        }).join("") + "</div></div>";
      contar();
    }

    el.addEventListener("input", function (ev) {
      var i = ev.target;
      if (i.tagName !== "INPUT" || !i.dataset.k) return;
      var v = num(i.value);
      if (v === null) delete estado[i.dataset.k]; else estado[i.dataset.k] = v;
      i.classList.toggle("ativo", v !== null);
      contar();
      clearTimeout(espera);
      espera = setTimeout(opt.aoMudar, 250);
    });
    el.addEventListener("change", function (ev) {
      var s = ev.target;
      if (s.tagName !== "SELECT") return;
      if (s.value) estado[s.dataset.s] = s.value; else delete estado[s.dataset.s];
      // o subsetor depende do setor: refaz as opcoes de todas as selecoes
      sels.forEach(function (x) {
        var e = el.querySelector('select[data-s="' + x.k + '"]');
        if (e && e !== s) e.innerHTML = opcoesHtml(x);
      });
      contar();
      opt.aoMudar();
    });
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      if (b.classList.contains("flt-abre")) {
        aberto = !aberto;
        b.setAttribute("aria-expanded", aberto);
        el.querySelector(".flt-corpo").hidden = !aberto;
      } else if (b.classList.contains("flt-limpa")) {
        estado = {};
        montar();
        opt.aoMudar();
      }
    });

    lerUrl();
    montar();
    return {
      passa: passa, consulta: consulta, ativos: ativos,
      lerUrl: function () { lerUrl(); montar(); }
    };
  };
})();
