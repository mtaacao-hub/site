(function () {
  var $ = function (id) { return document.getElementById(id); };

  var fields = {
    precoVista: $("preco-vista"),
    precoParcelado: $("preco-parcelado"),
    numParcelas: $("num-parcelas"),
    rentabilidade: $("rentabilidade-vp")
  };

  var banner = $("vp-banner");
  var outParcela = $("vp-out-parcela");
  var outDiferenca = $("vp-out-diferenca");
  var outSub = $("vp-out-sub");

  if (!banner) return;

  function brl(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function num(field, fallback) {
    var v = parseFloat(field.value);
    return isNaN(v) ? fallback : v;
  }

  function update() {
    var precoVista = Math.max(0, num(fields.precoVista, 0));
    var precoParcelado = Math.max(0, num(fields.precoParcelado, 0));
    var numParcelas = Math.max(1, Math.round(num(fields.numParcelas, 1)));
    var rentabilidadeAno = Math.max(0, num(fields.rentabilidade, 0)) / 100;
    var rMensal = Math.pow(1 + rentabilidadeAno, 1 / 12) - 1;

    var parcela = precoParcelado / numParcelas;
    outParcela.textContent = brl(parcela);

    // Mantém o valor à vista investido, pagando as parcelas com o rendimento + o próprio saldo.
    var saldo = precoVista;
    for (var m = 1; m <= numParcelas; m++) {
      saldo = saldo * (1 + rMensal) - parcela;
    }

    outDiferenca.textContent = brl(Math.abs(saldo));

    if (saldo > 0.5) {
      banner.className = "winner-banner is-lci";
      banner.textContent = "Compensa mais parcelar — investindo o valor à vista, sobrariam " + brl(saldo) + " depois de pagar todas as parcelas.";
      outSub.textContent = "A favor de parcelar.";
    } else if (saldo < -0.5) {
      banner.className = "winner-banner is-cdb";
      banner.textContent = "Compensa mais pagar à vista — parcelando, faltariam " + brl(Math.abs(saldo)) + " mesmo investindo o valor à vista.";
      outSub.textContent = "A favor de pagar à vista.";
    } else {
      banner.className = "winner-banner is-lci";
      banner.textContent = "Dá praticamente no mesmo, nesses números.";
      outSub.textContent = "";
    }
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", update);
  });

  update();
})();
