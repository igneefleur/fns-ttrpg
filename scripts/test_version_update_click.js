const fs = require("fs");
const assert = require("assert");

const boot = fs.readFileSync("docs/javascripts/jjk-roll20-boot.js", "utf8");

// The version screen must never reference undeclared operation guards.
assert(!/\boperationBusy\b/.test(boot), "operationBusy must not be referenced without a declaration");
assert(!/\bmiseANiveauDemandee\b/.test(boot), "miseANiveauDemandee must not be assigned without a declaration");

// Both actions are guarded by the real bundle-loading state.
assert(boot.includes('if (!bundleEnCours && window.JjkMigr && typeof window.JjkMigr.appliquer === "function") monter(false, f);'),
  "the update action must call monter when migration support is ready");
assert(boot.includes("if (!arch || bundleEnCours) return;"),
  "the archive action must use the declared bundle-loading guard");

console.log("Écran de version : gestionnaires de clic valides.");
