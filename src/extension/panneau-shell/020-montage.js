  var hash = location.hash || "";
  var m = /[#&]p=([^&]*)/.exec(hash);
  var page = "";
  try { page = m ? decodeURIComponent(m[1]) : ""; } catch (e) { page = ""; }
  if (!sure(page)) page = DEFAUT;

  function mount(base) {
    // le hash entier suit : la page distante y lit le thème (n=1/0) comme la fiche
    document.getElementById("jjk-remote").src = String(base) + page + hash;
  }
  try {
    browser.storage.local.get("jjk_site_url").then(
      function (r) { mount((r && r.jjk_site_url) || SITE); },
      function () { mount(SITE); }
    );
  } catch (e) { mount(SITE); }
})();
