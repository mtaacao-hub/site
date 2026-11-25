/* Cotacao do dia, direto da B3 (com atraso), so do papel que esta aberto.
 *
 * Pedido do Ricardo (25/11/2026): preco do dia como no Status, sem
 * intermediario. O endpoint e o que o proprio site da B3 usa para a cotacao
 * com atraso, e responde com `access-control-allow-origin: *`: quem busca e o
 * NAVEGADOR de quem abriu a ficha, sem servidor nosso no meio. Medido em
 * 25/11/2026: o minuto a minuto (DailyFluctuationHistory) anda em lotes e
 * fica 15-30 min atras do relogio; a cotacao atual (instrumentQuotation) fica
 * ~15 min atras (BOVA11 as 12:16: minuto a minuto parado em 11:47 a 161,78,
 * cotacao atual 162,50). Por isso os dois: o minuto a minuto desenha o dia e
 * a cotacao atual e o ultimo ponto e o preco do cabecalho. Acao, FII, ETF e
 * unit. Papel inexistente volta sem `lstQtn`.
 *
 * Nao e API documentada: se a B3 mudar, a ficha so perde a linha "agora" e o
 * botao 1d (falha e silenciosa; o fechamento do pipeline continua valendo).
 * O Yahoo foi descartado no mesmo dia: respondeu 429 na primeira chamada, e
 * nao aceita chamada do navegador.
 *
 * Uso (acoes.html e fiis.html):
 *   AoVivo.seguir(ticker, function (d) { ... }, semDado)   d = {data, hora, preco, var, serie}
 *   AoVivo.falta(ticker) / AoVivo.explica(motivo)   o 1d sem dado (o botao fica sempre a mostra)
 *   AoVivo.comHoje(serieDiaria, d)   acrescenta o preco do dia ao fim da serie
 *   AoVivo.linha(d, dataFechamento)  HTML da linha "agora" do cabecalho
 */
(function () {
  "use strict";
  var URL = "https://cotacao.b3.com.br/mds/api/v1/DailyFluctuationHistory/";
  var URL_ATUAL = "https://cotacao.b3.com.br/mds/api/v1/instrumentQuotation/";
  var ATUAL = "atual";           // rotulo do ultimo ponto (a cotacao atual, sem minuto exato)
  var A_CADA = 60000;            // a B3 fecha o minuto; mais que isso nao traz nada novo
  var guardado = {}, falta = {}, timer = null, seguindo = null;

  function json(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function ler(t) {
    return Promise.all([json(URL + encodeURIComponent(t)), json(URL_ATUAL + encodeURIComponent(t))])
      .then(function (r) {
        var j = r[0], tf = j && j.TradgFlr, l = tf && tf.scty && tf.scty.lstQtn;
        // "falhou": a B3 nao respondeu (fora do ar, rede, bloqueador de anuncio);
        // "vazio": respondeu sem negocio (antes da abertura, papel sem negocio)
        if (!j) return { falta: "falhou" };
        if (!l || !l.length || !tf.date) return { falta: "vazio" };
        var u = l[l.length - 1];
        var serie = l.map(function (p) { return [String(p.dtTm).slice(0, 5), p.closPric]; });
        var d = { data: tf.date, preco: u.closPric, "var": Number(u.prcFlcn),
                  hora: String(u.dtTm).slice(0, 5), servidor: (j.Msg && j.Msg.dtTm) || "" };
        // a cotacao atual, quando vem e e do mesmo pregao
        var q = r[1] && r[1].Trad && r[1].Trad[0] && r[1].Trad[0].scty && r[1].Trad[0].scty.SctyQtn;
        var qd = r[1] && r[1].Msg && r[1].Msg.dtTm;
        if (q && q.curPrc > 0 && qd && qd.slice(0, 10) === tf.date) {
          d.preco = q.curPrc; d["var"] = Number(q.prcFlcn);
          d.hora = qd.slice(11, 16); d.servidor = qd;
          serie.push([ATUAL, q.curPrc]);
        }
        d.serie = serie;
        return d;
      });
  }

  // pregao aberto pelo relogio da B3 (o do visitante pode estar em outro fuso)
  function aberto(servidor) {
    var m = /^(\d{4})-(\d\d)-(\d\d) (\d\d)/.exec(servidor || "");
    if (!m) return false;
    var dia = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
    var h = Number(m[4]);
    return dia > 0 && dia < 6 && h >= 9 && h < 18;
  }

  // o mesmo, pelo relogio do visitante levado para Sao Paulo: e o que decide
  // tentar de novo quando a B3 ainda nao deu nada (sem isso, quem abria a
  // ficha antes das 10h ficava sem o 1d o dia inteiro)
  function abertoPeloRelogio() {
    try {
      var p = {};
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short",
                                         hour: "numeric", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var h = Number(p.hour);
      return p.weekday !== "Sat" && p.weekday !== "Sun" && h >= 9 && h < 18;
    } catch (e) { return true; }
  }

  function fmt(v) {
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.AoVivo = {
    // semDado(motivo), opcional: chamada quando ainda nao ha nada do dia para
    // o papel ("falhou" ou "vazio"); a pagina explica no lugar do grafico
    seguir: function (t, cb, semDado) {
      seguindo = t;
      clearTimeout(timer);
      var g = guardado[t];
      if (g) cb(g);
      (function rodada() {
        if (seguindo !== t) return;
        if (document.hidden) { timer = setTimeout(rodada, A_CADA); return; }
        ler(t).then(function (d) {
          if (seguindo !== t) return;
          if (d.falta) {
            // uma falha no meio do dia nao apaga o que ja veio
            if (!guardado[t]) { falta[t] = d.falta; if (semDado) semDado(d.falta); }
            if (abertoPeloRelogio()) timer = setTimeout(rodada, A_CADA);
            return;
          }
          delete falta[t];
          guardado[t] = d; cb(d);
          if (aberto(d.servidor)) timer = setTimeout(rodada, A_CADA);
        });
      })();
    },
    // por que nao ha o dia deste papel: "falhou", "vazio", ou null (ha, ou ainda buscando)
    falta: function (t) { return guardado[t] ? null : (falta[t] || null); },
    // o texto para o lugar do 1d sem dado
    explica: function (motivo) {
      return motivo === "falhou"
        ? "Não consegui buscar a cotação do dia na B3. Um bloqueador de anúncios ou de rastreadores pode impedir a consulta (ela vai direto ao site da B3). Mostrando os últimos 5 pregões."
        : motivo === "vazio"
          ? "A B3 ainda não tem negócio deste papel hoje (o pregão abre às 10h). Mostrando os últimos 5 pregões."
          : "Buscando a cotação do dia na B3… Mostrando os últimos 5 pregões.";
    },
    // a lista (sem papel aberto) nao precisa buscar nada
    parar: function () { seguindo = null; clearTimeout(timer); },
    comHoje: function (serie, d) {
      if (!d || !serie.length || d.data <= serie[serie.length - 1][0]) return serie;
      return serie.concat([[d.data, d.preco]]);
    },
    linha: function (d, dataFechamento) {
      // so quando e um pregao DEPOIS do fechamento que a ficha ja mostra
      if (!d || (dataFechamento && d.data <= dataFechamento)) return "";
      var sobe = d["var"] >= 0;
      return "agora <b>R$ " + fmt(d.preco) + '</b> <b style="color:' + (sobe ? "#1C7F4D" : "#B5392B") + '">' +
        (sobe ? "+" : "−") + fmt(Math.abs(d["var"])) + "%</b> · consultado às " + d.hora +
        ' <span title="Cotação da B3 com atraso de cerca de 15 minutos">(B3, ~15 min de atraso)</span>';
    },
    rotulo: function (d) {
      var p = d.data.split("-"), dia = p[2] + "/" + p[1] + "/" + p[0].slice(2);
      return function (h) { return h === ATUAL ? "cotação atual (~15 min de atraso)" : h + " · " + dia; };
    }
  };
})();
