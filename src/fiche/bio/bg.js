  function buildBackground() {
    var bB = block("Background", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 9;
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    bB.appendChild(bg);
    return bB;
  }

