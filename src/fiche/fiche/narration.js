  function buildNarration() {
    var b = block("Narration");
    var nRow = el("div", "pc-kv");
    var nStep = el("span", "pc-step");
    nStep.appendChild(stepBtn("−", null, function () { state.narration = Math.max(0, state.narration - 1); refresh(); }));
    var nV = el("span", "v", "");
    hooks.push(function () { nV.textContent = String(state.narration); });
    nStep.appendChild(nV);
    nStep.appendChild(stepBtn("+", null, function () { state.narration++; refresh(); }));
    nRow.appendChild(nStep);
    nRow.appendChild(el("span", "sp"));
    nRow.appendChild(miniBtn("Nouvelle session", "Repartir à 3 points", function () { state.narration = 3; refresh(); }));
    b.appendChild(nRow);
    return b;
  }

