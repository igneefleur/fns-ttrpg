  function mount(url) {
    document.getElementById("mia-remote").src = url + (location.hash || "");
  }
  try {
    // storage.local.get : promesse sur Firefox (V2) comme sur Chrome (V3)
    browser.storage.local.get("mia_sheet_url").then(
      function (r) { mount((r && r.mia_sheet_url) || SITE_URL); },
      function () { mount(SITE_URL); }
    );
  } catch (e) { mount(SITE_URL); }
})();
