(function () {
  var $ = function (id) { return document.getElementById(id); };

  var fields = {
    valorImovel: $("valor-imovel"),
    entrada: $("entrada"),
    prazoAnos: $("prazo-anos"),
    jurosFinanciamento: $("juros-financiamento"),
    aluguelEquivalente: $("aluguel-equivalente"),
    rentabilidade: $("rentabilidade-af")
  };

  var banner = $("af-banner");
  var outParcela = $("af-out-parcela");
  var outParcelaSub = $("af-out-parcela-sub");
  var outComprar = $("af-out-comprar");
  var outAlugar = $("af-out-alugar");

  if (!banner) return;

  function brl(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function num(field, fallback) {
    var v = parseFloat(field.value);
    return isNaN(v) ? fallback : v;
  }

  function update() {
    var valorImovel = Math.max(0, num(fields.valorImovel, 0));
    var entrada = Math.min(valorImovel, Math.max(0, num(fields.entrada, 0)));
    var prazoAnos = Math.max(1, num(fields.prazoAnos, 30));
    var jurosAno = Math.max(0, num(fields.jurosFinanciamento, 0)) / 100;
    var aluguel = Math.max(0, num(fields.aluguelEquivalente, 0));
    var rentabilidadeAno = Math.max(0, num(fields.rentabilidade, 0)) / 100;

    var meses = Math.round(prazoAnos * 12);
    var principal = valorImovel - entrada;
    var rMensalFin = Math.pow(1 + jurosAno, 1 / 12) - 1;

    var parcela;
    if (rMensalFin > 0) {
      parcela = principal * rMensalFin / (1 - Math.pow(1 + rMensalFin, -meses));
    } else {
      parcela = principal / meses;
    }

    outParcela.textContent = brl(parcela);
    outParcelaSub.textContent = "Financiando " + brl(principal) + " em " + meses + " meses.";

    // Comprando: patrimônio final = imóvel quitado (sem modelar valorização)
    var patrimonioComprar = valorImovel;

    // Alugando: investe a entrada, e todo mês investe (parcela - aluguel), quando positivo
    var rMensalInv = Math.pow(1 + rentabilidadeAno, 1 / 12) - 1;
    var saldo = entrada;
    for (var m = 1; m <= meses; m++) {
      saldo = saldo * (1 + rMensalInv) + (parcela - aluguel);
    }
    var patrimonioAlugar = saldo;

    outComprar.textContent = brl(patrimonioComprar);
    outAlugar.textContent = brl(patrimonioAlugar);

    var diff = patrimonioAlugar - patrimonioComprar;
    if (diff > 0) {
      banner.className = "winner-banner is-lci";
      banner.textContent = "Nesses números, alugar e investir a diferença deixaria " + brl(diff) + " a mais de patrimônio.";
    } else if (diff < 0) {
      banner.className = "winner-banner is-cdb";
      banner.textContent = "Nesses números, comprar deixaria " + brl(Math.abs(diff)) + " a mais de patrimônio.";
    } else {
      banner.className = "winner-banner is-lci";
      banner.textContent = "Dá praticamente no mesmo, nesses números.";
    }
  }

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", update);
  });

  update();
})();
