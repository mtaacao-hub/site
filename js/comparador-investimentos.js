(function () {
  var $ = function (id) { return document.getElementById(id); };

  var tipoSelect = $("tipo-produto");
  var taxaInput = $("taxa-cdi");
  var prazoSelect = $("prazo");

  var outLabel = $("out-label");
  var outEquivalente = $("out-equivalente");
  var outExplicacao = $("out-explicacao");
  var irRows = document.querySelectorAll("#ir-table tbody tr");

  if (!tipoSelect) return;

  function pct(v) { return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }

  function update() {
    var tipo = tipoSelect.value;
    var taxaCdi = Math.max(0, parseFloat(taxaInput.value) || 0);
    var taxaIR = parseFloat(prazoSelect.value) || 0.175;

    var equivalente;
    if (tipo === "cdb") {
      // CDB informado -> qual % do CDI a LCI/LCA (isenta) precisaria pra render o mesmo líquido
      equivalente = taxaCdi * (1 - taxaIR);
      outLabel.textContent = "Uma LCI/LCA precisaria render";
      outExplicacao.textContent = "pra render o mesmo líquido que um CDB de " + pct(taxaCdi) + " do CDI, descontado o IR de " + pct(taxaIR * 100) + " desse prazo.";
    } else {
      // LCI/LCA informada (isenta) -> qual % do CDI o CDB precisaria oferecer, bruto, pra igualar depois do IR
      equivalente = taxaIR < 1 ? taxaCdi / (1 - taxaIR) : 0;
      outLabel.textContent = "Um CDB precisaria render";
      outExplicacao.textContent = "bruto, pra render o mesmo líquido que uma LCI/LCA de " + pct(taxaCdi) + " do CDI (isenta), depois de descontado o IR de " + pct(taxaIR * 100) + " desse prazo.";
    }

    outEquivalente.textContent = pct(equivalente) + " do CDI";

    irRows.forEach(function (row) {
      var rowTaxa = parseFloat(row.getAttribute("data-taxa"));
      row.classList.toggle("is-active", rowTaxa === taxaIR);
    });
  }

  [tipoSelect, taxaInput, prazoSelect].forEach(function (el) {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  update();
})();
