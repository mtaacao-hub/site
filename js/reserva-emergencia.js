(function () {
  var $ = function (id) { return document.getElementById(id); };

  var fields = {
    gastoMensal: $("gasto-mensal"),
    mesesMeta: $("meses-meta"),
    jaTem: $("ja-tem"),
    aporteMensal: $("aporte-mensal"),
    rentabilidade: $("rentabilidade")
  };

  var outMeta = $("out-meta");
  var outMetaSub = $("out-meta-sub");
  var outTempo = $("out-tempo");
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
    var gastoMensal = Math.max(0, num(fields.gastoMensal, 0));
    var mesesMeta = Math.max(1, num(fields.mesesMeta, 6));
    var jaTem = Math.max(0, num(fields.jaTem, 0));
    var aporteMensal = Math.max(0, num(fields.aporteMensal, 0));
    var rentabilidadeAno = Math.max(0, num(fields.rentabilidade, 0)) / 100;
    var rMensal = Math.pow(1 + rentabilidadeAno, 1 / 12) - 1;

    var meta = gastoMensal * mesesMeta;
    var pontos = [];
    var saldo = jaTem;
    pontos.push({ mes: 0, saldo: saldo });

    var mesesParaMeta = null;
    var maxMeses = 600; // 50 anos de teto, evita loop infinito se aporte for 0
    for (var m = 1; m <= maxMeses; m++) {
      saldo = saldo * (1 + rMensal) + aporteMensal;
      pontos.push({ mes: m, saldo: saldo });
      if (mesesParaMeta === null && saldo >= meta) {
        mesesParaMeta = m;
        break;
      }
    }

    return { meta: meta, pontos: pontos, mesesParaMeta: mesesParaMeta, jaTem: jaTem };
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
    var maxSaldo = Math.max(r.meta, pontos[pontos.length - 1].saldo) || 1;
    var maxMes = pontos[pontos.length - 1].mes || 1;

    function xAt(mes) { return padding.left + (mes / maxMes) * plotW; }
    function yAt(saldo) { return padding.top + plotH - (saldo / maxSaldo) * plotH; }

    var green = getComputedStyle(document.documentElement).getPropertyValue("--color-green").trim() || "#345b2a";
    var wine = getComputedStyle(document.documentElement).getPropertyValue("--color-wine").trim() || "#4c100f";
    var border = getComputedStyle(document.documentElement).getPropertyValue("--color-border").trim() || "#d8d8d8";
    var muted = getComputedStyle(document.documentElement).getPropertyValue("--color-text-muted").trim() || "#6b6864";

    // meta line (dashed)
    var yMeta = yAt(r.meta);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = wine;
    ctx.beginPath();
    ctx.moveTo(padding.left, yMeta);
    ctx.lineTo(width - padding.right, yMeta);
    ctx.stroke();
    ctx.restore();

    // area fill
    ctx.beginPath();
    ctx.moveTo(xAt(pontos[0].mes), yAt(pontos[0].saldo));
    pontos.forEach(function (p) { ctx.lineTo(xAt(p.mes), yAt(p.saldo)); });
    ctx.lineTo(xAt(pontos[pontos.length - 1].mes), padding.top + plotH);
    ctx.lineTo(xAt(pontos[0].mes), padding.top + plotH);
    ctx.closePath();
    var gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
    gradient.addColorStop(0, "rgba(52, 91, 42, 0.22)");
    gradient.addColorStop(1, "rgba(52, 91, 42, 0.02)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // baseline
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + plotH + 0.5);
    ctx.lineTo(width - padding.right, padding.top + plotH + 0.5);
    ctx.stroke();

    // line
    ctx.beginPath();
    ctx.moveTo(xAt(pontos[0].mes), yAt(pontos[0].saldo));
    pontos.forEach(function (p) { ctx.lineTo(xAt(p.mes), yAt(p.saldo)); });
    ctx.strokeStyle = green;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    var last = pontos[pontos.length - 1];
    ctx.beginPath();
    ctx.arc(xAt(last.mes), yAt(last.saldo), 4, 0, Math.PI * 2);
    ctx.fillStyle = green;
    ctx.fill();

    ctx.fillStyle = muted;
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("hoje", padding.left, height - 6);
    ctx.textAlign = "right";
    ctx.fillText(Math.round(last.mes) + " meses", width - padding.right, height - 6);
    ctx.textAlign = "left";
    ctx.fillText("meta", padding.left, yMeta - 4);
  }

  function update() {
    var r = projection();
    outMeta.textContent = brl(r.meta);
    outMetaSub.textContent = "Você já tem " + brl(r.jaTem) + " guardado.";
    if (r.mesesParaMeta === null) {
      outTempo.textContent = "Não atinge nesse ritmo";
    } else if (r.mesesParaMeta === 0) {
      outTempo.textContent = "Você já chegou lá!";
    } else {
      var anos = Math.floor(r.mesesParaMeta / 12);
      var meses = r.mesesParaMeta % 12;
      var partes = [];
      if (anos > 0) partes.push(anos + (anos === 1 ? " ano" : " anos"));
      if (meses > 0) partes.push(meses + (meses === 1 ? " mês" : " meses"));
      outTempo.textContent = partes.join(" e ");
    }
    drawChart(r);
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", update);
  });
  window.addEventListener("resize", function () { drawChart(projection()); });

  update();
})();
