(function () {
  var $ = function (id) { return document.getElementById(id); };

  var fields = {
    idadeAtual: $("idade-atual"),
    idadeAposentadoria: $("idade-aposentadoria"),
    valorAtual: $("valor-atual"),
    rentabilidade: $("rentabilidade"),
    idadeFinal: $("idade-final"),
    valorFinal: $("valor-final")
  };
  var modoFinal = $("modo-final");
  var campoValorFinal = $("campo-valor-final");
  var fasesLista = $("fases-aporte-lista");
  var btnAddFase = $("btn-add-fase");

  var outTotal = $("out-total");
  var outRendaUsufruto = $("out-renda-usufruto");
  var outRendaUsufrutoSub = $("out-renda-usufruto-sub");
  var outBreakdown = $("out-breakdown");
  var canvas = $("growth-chart");

  if (!canvas) return;

  // Estado das fases de aporte. A última fase sempre vai até a aposentadoria (ateIdade: null).
  var fasesAporte = [{ ateIdade: null, aporte: 800 }];

  function brl(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function num(field, fallback) {
    var v = parseFloat(field.value);
    return isNaN(v) ? fallback : v;
  }

  function resolveFases(idadeAtual, idadeAposentadoria) {
    var cursor = idadeAtual;
    var resolved = [];
    for (var i = 0; i < fasesAporte.length; i++) {
      var isLast = i === fasesAporte.length - 1;
      var end;
      if (isLast) {
        end = Math.max(cursor, idadeAposentadoria);
      } else {
        var bruto = fasesAporte[i].ateIdade;
        if (bruto === null || isNaN(bruto)) bruto = cursor + 1;
        end = Math.max(cursor + 1 / 12, Math.min(bruto, idadeAposentadoria - 1 / 12));
      }
      resolved.push({ start: cursor, end: end, aporte: fasesAporte[i].aporte || 0 });
      cursor = end;
    }
    return resolved;
  }

  function renderFases() {
    var idadeAtual = num(fields.idadeAtual, 30);
    var idadeAposentadoria = num(fields.idadeAposentadoria, 65);
    var resolved = resolveFases(idadeAtual, idadeAposentadoria);

    fasesLista.innerHTML = "";
    fasesAporte.forEach(function (fase, i) {
      var isLast = i === fasesAporte.length - 1;
      var start = Math.round(resolved[i].start);
      var row = document.createElement("div");
      row.className = "phase-row";
      row.setAttribute("data-index", i);

      var header = document.createElement("div");
      header.className = "phase-row-header";

      var strong = document.createElement("strong");
      strong.textContent = "Fase " + (i + 1) + ":";
      header.appendChild(strong);

      if (isLast) {
        var spanFim = document.createElement("span");
        spanFim.textContent = "dos " + start + " anos até a aposentadoria (" + Math.round(idadeAposentadoria) + " anos)";
        header.appendChild(spanFim);
      } else {
        var spanDe = document.createElement("span");
        spanDe.textContent = "dos " + start + " até";
        header.appendChild(spanDe);

        var inputAte = document.createElement("input");
        inputAte.type = "number";
        inputAte.className = "phase-ate";
        inputAte.min = String(start + 1);
        inputAte.max = String(Math.round(idadeAposentadoria));
        inputAte.step = "1";
        inputAte.value = Math.round(resolved[i].end);
        inputAte.addEventListener("input", function () {
          fasesAporte[i].ateIdade = parseFloat(inputAte.value);
          renderFasesPreservingFocus();
          update();
        });
        header.appendChild(inputAte);

        var spanAnos = document.createElement("span");
        spanAnos.textContent = "anos";
        header.appendChild(spanAnos);
      }

      if (fasesAporte.length > 1) {
        var btnRemove = document.createElement("button");
        btnRemove.type = "button";
        btnRemove.className = "phase-remove";
        btnRemove.textContent = "Remover";
        btnRemove.addEventListener("click", function () {
          fasesAporte.splice(i, 1);
          if (i === fasesAporte.length) {
            fasesAporte[fasesAporte.length - 1].ateIdade = null;
          }
          renderFases();
          update();
        });
        header.appendChild(btnRemove);
      }

      row.appendChild(header);

      var fieldDiv = document.createElement("div");
      fieldDiv.className = "field";
      var label = document.createElement("label");
      label.textContent = "Aporte mensal nessa fase (R$)";
      var inputAporte = document.createElement("input");
      inputAporte.type = "number";
      inputAporte.className = "phase-aporte-input";
      inputAporte.step = "50";
      inputAporte.value = fase.aporte;
      inputAporte.addEventListener("input", function () {
        fasesAporte[i].aporte = parseFloat(inputAporte.value) || 0;
        update();
      });
      var hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = "Pode ser negativo, se for um período em que pretende sacar em vez de investir.";
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(inputAporte);
      fieldDiv.appendChild(hint);
      row.appendChild(fieldDiv);

      fasesLista.appendChild(row);
    });
  }

  function renderFasesPreservingFocus() {
    var active = document.activeElement;
    var focusInfo = null;
    if (active && fasesLista.contains(active)) {
      var row = active.closest(".phase-row");
      if (row) {
        focusInfo = {
          index: row.getAttribute("data-index"),
          isAte: active.classList.contains("phase-ate"),
          isAporte: active.classList.contains("phase-aporte-input"),
          selectionStart: active.selectionStart,
          selectionEnd: active.selectionEnd
        };
      }
    }
    renderFases();
    if (focusInfo) {
      var newRow = fasesLista.querySelector('.phase-row[data-index="' + focusInfo.index + '"]');
      if (newRow) {
        var newInput = focusInfo.isAte ? newRow.querySelector(".phase-ate") : (focusInfo.isAporte ? newRow.querySelector(".phase-aporte-input") : null);
        if (newInput) {
          newInput.focus();
          if (typeof focusInfo.selectionStart === "number") {
            try { newInput.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd); } catch (e) {}
          }
        }
      }
    }
  }

  function addFase() {
    var idadeAtual = num(fields.idadeAtual, 30);
    var idadeAposentadoria = num(fields.idadeAposentadoria, 65);
    var resolved = resolveFases(idadeAtual, idadeAposentadoria);
    var last = resolved[resolved.length - 1];
    var meio = Math.round((last.start + idadeAposentadoria) / 2);
    if (meio <= last.start) meio = last.start + 1;
    if (meio >= idadeAposentadoria) meio = idadeAposentadoria - 1;

    fasesAporte[fasesAporte.length - 1].ateIdade = meio;
    fasesAporte.push({ ateIdade: null, aporte: fasesAporte[fasesAporte.length - 1].aporte });
    renderFases();
    update();
  }

  function projection() {
    var idadeAtual = num(fields.idadeAtual, 30);
    var idadeAposentadoria = num(fields.idadeAposentadoria, 65);
    var valorAtual = Math.max(0, num(fields.valorAtual, 0));
    var rentabilidadeAno = Math.max(0, num(fields.rentabilidade, 0)) / 100;
    var idadeFinal = num(fields.idadeFinal, 100);
    var anosUsufruto = Math.max(1, idadeFinal - idadeAposentadoria);

    // ---- Fase de acumulação (múltiplas fases de aporte) ----
    var mesesAcumulacao = Math.max(0, Math.round((idadeAposentadoria - idadeAtual) * 12));
    var rMensal = Math.pow(1 + rentabilidadeAno, 1 / 12) - 1;

    var resolved = resolveFases(idadeAtual, idadeAposentadoria);
    var fasesMeses = resolved.map(function (f) {
      return {
        inicioMes: Math.round((f.start - idadeAtual) * 12),
        fimMes: Math.round((f.end - idadeAtual) * 12),
        aporte: f.aporte
      };
    });

    function aporteNoMes(m) {
      for (var i = 0; i < fasesMeses.length; i++) {
        if (m <= fasesMeses[i].fimMes) return fasesMeses[i].aporte;
      }
      return fasesMeses.length ? fasesMeses[fasesMeses.length - 1].aporte : 0;
    }

    var pontos = [];
    var saldo = valorAtual;
    pontos.push({ idade: idadeAtual, saldo: saldo, fase: "acumulacao" });

    var totalContribuido = valorAtual;
    for (var m = 1; m <= mesesAcumulacao; m++) {
      var aporteMes = aporteNoMes(m);
      saldo = saldo * (1 + rMensal) + aporteMes;
      totalContribuido += aporteMes;
      if (m % 12 === 0 || m === mesesAcumulacao) {
        pontos.push({ idade: idadeAtual + m / 12, saldo: saldo, fase: "acumulacao" });
      }
    }

    var totalAcumulado = saldo;
    var rendimento = Math.max(0, totalAcumulado - totalContribuido);

    // ---- Fase de usufruto: renda mensal que leva o saldo ao valor-alvo na idade final ----
    var modo = modoFinal ? modoFinal.value : "zerar";
    var valorFinalAlvo;
    if (modo === "preservar") valorFinalAlvo = totalAcumulado;
    else if (modo === "personalizado") valorFinalAlvo = Math.max(0, num(fields.valorFinal, 0));
    else valorFinalAlvo = 0;

    var mesesUsufruto = Math.round(anosUsufruto * 12);
    var rMensalUsufruto = rMensal;
    var rendaUsufruto;
    if (rMensalUsufruto > 0) {
      var fatorDesconto = Math.pow(1 + rMensalUsufruto, mesesUsufruto);
      rendaUsufruto = (totalAcumulado - valorFinalAlvo / fatorDesconto) * rMensalUsufruto / (1 - Math.pow(1 + rMensalUsufruto, -mesesUsufruto));
    } else {
      rendaUsufruto = mesesUsufruto > 0 ? (totalAcumulado - valorFinalAlvo) / mesesUsufruto : 0;
    }
    rendaUsufruto = Math.max(0, rendaUsufruto);

    var saldoUsufruto = totalAcumulado;
    var idadeInicioUsufruto = idadeAtual + mesesAcumulacao / 12;
    for (var u = 1; u <= mesesUsufruto; u++) {
      saldoUsufruto = saldoUsufruto * (1 + rMensalUsufruto) - rendaUsufruto;
      if (saldoUsufruto < 0) saldoUsufruto = 0;
      if (u % 12 === 0 || u === mesesUsufruto) {
        pontos.push({ idade: idadeInicioUsufruto + u / 12, saldo: saldoUsufruto, fase: "usufruto" });
      }
    }

    return {
      pontos: pontos,
      totalContribuido: totalContribuido,
      totalAcumulado: totalAcumulado,
      rendimento: rendimento,
      rendaUsufruto: rendaUsufruto,
      modo: modo,
      valorFinalAlvo: valorFinalAlvo,
      idadeAposentadoria: idadeInicioUsufruto,
      idadeFimUsufruto: idadeInicioUsufruto + anosUsufruto,
      mesesAcumulacao: mesesAcumulacao
    };
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
    var minIdade = pontos[0].idade;
    var maxIdade = pontos[pontos.length - 1].idade;
    var idadeSpan = Math.max(0.0001, maxIdade - minIdade);

    function xAt(idade) { return padding.left + ((idade - minIdade) / idadeSpan) * plotW; }
    function yAt(saldo) { return padding.top + plotH - (saldo / maxSaldo) * plotH; }

    var wine = getComputedStyle(document.documentElement).getPropertyValue("--color-wine").trim() || "#4c100f";
    var green = getComputedStyle(document.documentElement).getPropertyValue("--color-green").trim() || "#345b2a";
    var border = getComputedStyle(document.documentElement).getPropertyValue("--color-border").trim() || "#d8d8d8";
    var muted = getComputedStyle(document.documentElement).getPropertyValue("--color-text-muted").trim() || "#6b6864";

    // area fill
    ctx.beginPath();
    ctx.moveTo(xAt(pontos[0].idade), yAt(pontos[0].saldo));
    pontos.forEach(function (p) { ctx.lineTo(xAt(p.idade), yAt(p.saldo)); });
    ctx.lineTo(xAt(pontos[pontos.length - 1].idade), padding.top + plotH);
    ctx.lineTo(xAt(pontos[0].idade), padding.top + plotH);
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

    // retirement marker (dashed vertical line)
    var xRet = xAt(r.idadeAposentadoria);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(xRet, padding.top);
    ctx.lineTo(xRet, padding.top + plotH);
    ctx.stroke();
    ctx.restore();

    // line: two segments colored by phase
    function drawSegment(filterFn, color) {
      ctx.beginPath();
      var started = false;
      pontos.forEach(function (p) {
        if (!filterFn(p)) return;
        if (!started) { ctx.moveTo(xAt(p.idade), yAt(p.saldo)); started = true; }
        else ctx.lineTo(xAt(p.idade), yAt(p.saldo));
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    drawSegment(function (p) { return p.fase === "acumulacao"; }, green);
    // include last acumulacao point so the usufruto segment connects visually
    var lastAcumIndex = -1;
    pontos.forEach(function (p, i) { if (p.fase === "acumulacao") lastAcumIndex = i; });
    ctx.beginPath();
    var started = false;
    pontos.forEach(function (p, i) {
      if (p.fase === "usufruto" || i === lastAcumIndex) {
        if (!started) { ctx.moveTo(xAt(p.idade), yAt(p.saldo)); started = true; }
        else ctx.lineTo(xAt(p.idade), yAt(p.saldo));
      }
    });
    ctx.strokeStyle = wine;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // end point
    var last = pontos[pontos.length - 1];
    ctx.beginPath();
    ctx.arc(xAt(last.idade), yAt(last.saldo), 4, 0, Math.PI * 2);
    ctx.fillStyle = wine;
    ctx.fill();

    // labels
    ctx.fillStyle = muted;
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(Math.round(pontos[0].idade) + " anos", padding.left, height - 6);
    ctx.textAlign = "right";
    ctx.fillText(Math.round(last.idade) + " anos", width - padding.right, height - 6);
    ctx.textAlign = "center";
    ctx.fillText("aposentadoria", xRet, padding.top - 2);
  }

  function update() {
    var r = projection();
    outTotal.textContent = brl(r.totalAcumulado);
    outRendaUsufruto.textContent = brl(r.rendaUsufruto) + " / mês";

    var idadeFim = Math.round(r.idadeFimUsufruto);
    if (r.modo === "preservar") {
      outRendaUsufrutoSub.textContent = "O patrimônio nunca é consumido — aos " + idadeFim + " anos continua valendo " + brl(r.totalAcumulado) + ", e você segue vivendo só do rendimento.";
    } else if (r.modo === "personalizado") {
      outRendaUsufrutoSub.textContent = "Nesse ritmo, o patrimônio chega aos " + idadeFim + " anos valendo " + brl(r.valorFinalAlvo) + ", como você definiu.";
    } else {
      outRendaUsufrutoSub.textContent = "Nesse ritmo, o patrimônio chega a zero aos " + idadeFim + " anos.";
    }

    outBreakdown.textContent = "Você contribui com " + brl(r.totalContribuido) + " ao longo de " + r.mesesAcumulacao + " meses; o restante, " + brl(r.rendimento) + ", viria do rendimento acumulado.";
    drawChart(r);
  }

  Object.keys(fields).forEach(function (key) {
    if (fields[key]) fields[key].addEventListener("input", function () {
      if (key === "idadeAtual" || key === "idadeAposentadoria") renderFases();
      update();
    });
  });
  if (modoFinal) {
    modoFinal.addEventListener("change", function () {
      campoValorFinal.style.display = modoFinal.value === "personalizado" ? "block" : "none";
      update();
    });
  }
  if (btnAddFase) btnAddFase.addEventListener("click", addFase);
  window.addEventListener("resize", function () { drawChart(projection()); });

  renderFases();
  update();
})();
