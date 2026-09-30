(function () {
  var $ = function (id) { return document.getElementById(id); };

  var fields = {
    valorDivida: $("valor-divida"),
    jurosMes: $("juros-mes"),
    pagamentoMensal: $("pagamento-mensal")
  };

  var alerta = $("alerta-divida");
  var outTempo = $("out-tempo");
  var outJuros = $("out-juros");
  var outJurosSub = $("out-juros-sub");
  var canvas = $("growth-chart");

  if (!canvas) return;

  function brl(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function num(field, fallback) {
    var v = parseFloat(field.value);
    return isNaN(v) ? fallback : v;
  }

  function projection() {
    var valorDivida = Math.max(0, num(fields.valorDivida, 0));
    var jurosMesFrac = Math.max(0, num(fields.jurosMes, 0)) / 100;
    var pagamentoMensal = Math.max(0, num(fields.pagamentoMensal, 0));

    var pontos = [{ mes: 0, saldo: valorDivida }];
    var interestFirst = valorDivida * jurosMesFrac;
    var neverPaysOff = valorDivida > 0 && pagamentoMensal <= interestFirst;

    var saldo = valorDivida;
    var jurosAcumulados = 0;
    var mesesParaQuitar = null;
    var maxMeses = neverPaysOff ? 36 : 480;

    for (var m = 1; m <= maxMeses; m++) {
      var juros = saldo * jurosMesFrac;
      jurosAcumulados += juros;
      saldo = saldo + juros - pagamentoMensal;
      if (!neverPaysOff && saldo <= 0) {
        saldo = 0;
        pontos.push({ mes: m, saldo: saldo });
        mesesParaQuitar = m;
        break;
      }
      pontos.push({ mes: m, saldo: saldo });
    }

    return { pontos: pontos, jurosAcumulados: jurosAcumulados, mesesParaQuitar: mesesParaQuitar, neverPaysOff: neverPaysOff, valorDivida: valorDivida };
  }

  function drawChart(r) {
    var pontos = r.pontos;
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var width = Math.max(280, rect.width);
    var height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = height + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (pontos.length < 2) return;

    var padding = { top: 14, right: 12, bottom: 24, left: 12 };
    var plotW = width - padding.left - padding.right;
    var plotH = height - padding.top - padding.bottom;
    var maxSaldo = Math.max.apply(null, pontos.map(function (p) { return p.saldo; })) || 1;
    var maxMes = pontos[pontos.length - 1].mes || 1;

    function xAt(mes) { return padding.left + (mes / maxMes) * plotW; }
    function yAt(saldo) { return padding.top + plotH - (saldo / maxSaldo) * plotH; }

    var wine = getComputedStyle(document.documentElement).getPropertyValue("--color-wine").trim() || "#4c100f";
    var border = getComputedStyle(document.documentElement).getPropertyValue("--color-border").trim() || "#d8d8d8";
    var muted = getComputedStyle(document.documentElement).getPropertyValue("--color-text-muted").trim() || "#6b6864";

    ctx.beginPath();
    ctx.moveTo(xAt(pontos[0].mes), yAt(pontos[0].saldo));
    pontos.forEach(function (p) { ctx.lineTo(xAt(p.mes), yAt(p.saldo)); });
    ctx.lineTo(xAt(pontos[pontos.length - 1].mes), padding.top + plotH);
    ctx.lineTo(xAt(pontos[0].mes), padding.top + plotH);
    ctx.closePath();
    var gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
    gradient.addColorStop(0, "rgba(76, 16, 15, 0.20)");
    gradient.addColorStop(1, "rgba(76, 16, 15, 0.02)");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + plotH + 0.5);
    ctx.lineTo(width - padding.right, padding.top + plotH + 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(xAt(pontos[0].mes), yAt(pontos[0].saldo));
    pontos.forEach(function (p) { ctx.lineTo(xAt(p.mes), yAt(p.saldo)); });
    ctx.strokeStyle = wine;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    var last = pontos[pontos.length - 1];
    ctx.beginPath();
    ctx.arc(xAt(last.mes), yAt(last.saldo), 4, 0, Math.PI * 2);
    ctx.fillStyle = wine;
    ctx.fill();

    ctx.fillStyle = muted;
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("hoje", padding.left, height - 6);
    ctx.textAlign = "right";
    ctx.fillText(Math.round(last.mes) + " meses", width - padding.right, height - 6);
  }

  function update() {
    var r = projection();

    if (r.neverPaysOff) {
      alerta.style.display = "block";
      alerta.textContent = "Esse pagamento não cobre nem os juros do mês — nesse ritmo, a dívida nunca diminui, só cresce.";
      outTempo.textContent = "Nunca quita nesse ritmo";
      outJuros.textContent = brl(r.jurosAcumulados) + "+";
      outJurosSub.textContent = "Só nos primeiros 3 anos, sem nunca reduzir o principal.";
    } else {
      alerta.style.display = "none";
      var anos = Math.floor(r.mesesParaQuitar / 12);
      var meses = r.mesesParaQuitar % 12;
      var partes = [];
      if (anos > 0) partes.push(anos + (anos === 1 ? " ano" : " anos"));
      if (meses > 0) partes.push(meses + (meses === 1 ? " mês" : " meses"));
      outTempo.textContent = partes.length ? partes.join(" e ") : "menos de 1 mês";
      outJuros.textContent = brl(r.jurosAcumulados);
      outJurosSub.textContent = "Além dos " + brl(r.valorDivida) + " da dívida original.";
    }
    drawChart(r);
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", update);
  });
  window.addEventListener("resize", function () { drawChart(projection()); });

  update();
})();
