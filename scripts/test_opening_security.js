#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const manifest = JSON.parse(fs.readFileSync('docs/jjk-manifeste.json', 'utf8'));
const boot = fs.readFileSync('docs/javascripts/jjk-roll20-boot.js', 'utf8');
const html = fs.readFileSync('docs/roll20-fiche.html', 'utf8');
const bridge = fs.readFileSync('extension/firefox/beta/roll20-page.js', 'utf8');
const content = fs.readFileSync('extension/firefox/beta/content-roll20.js', 'utf8');
const extManifest = JSON.parse(fs.readFileSync('extension/firefox/manifest.json', 'utf8'));
const updates = JSON.parse(fs.readFileSync('docs/download/updates.json', 'utf8'));
const chromeManifest = JSON.parse(fs.readFileSync('extension/chrome/manifest.json', 'utf8'));
const narration = fs.readFileSync('docs/javascripts/jjk-narration.js', 'utf8');
const roll20Css = fs.readFileSync('docs/stylesheets/jjk-roll20.css', 'utf8');
const demarrageExtension = fs.readFileSync('src/extension/content-roll20/190-demarrage.js', 'utf8');
const pontPageSource = fs.readFileSync('src/extension/content-roll20/050-pont-page.js', 'utf8');
const contentStable = fs.readFileSync('extension/firefox/stable/content-roll20.js', 'utf8');

function extractFunction(source, name) {
  const re = new RegExp(String.raw`function\s+${name}\s*\([^)]*\)\s*\{`, 'm');
  const match = re.exec(source);
  assert.ok(match, 'fonction absente : ' + name);
  let i = match.index + match[0].length, depth = 1, quote = null, escape = false;
  for (; i < source.length && depth; i++) {
    const c = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  assert.equal(depth, 0, 'fonction non fermée : ' + name);
  return source.slice(match.index, i);
}

// Le contrat publié doit correspondre à l'extension reconstruite.
assert.equal(manifest.extension.bridgeProtocol, 2);
assert.equal(manifest.extension.minVersion, '4.3.2', 'le minimum requis par la fiche reste inchangé');
assert.match(extManifest.version, /^\d+\.\d+\.\d+(?:\.\d+)?$/, 'la version de paquet doit accepter le compteur de signature');
assert.equal(extManifest.version, chromeManifest.version);
assert.equal(extManifest.browser_specific_settings.gecko.update_url,
  'https://igneefleur.github.io/fns-ttrpg/jjk-beta/download/updates.json',
  'la beta doit lire son flux de mise à jour beta, pas le flux stable périmé');
const updateLink = updates.addons['jjk-roll20@igneefleur'].updates[0].update_link;
assert.ok([
  'https://igneefleur.github.io/fns-ttrpg/jjk-beta/download/jjk-roll20-firefox.xpi',
  'https://igneefleur.github.io/fns-ttrpg/jjk/download/jjk-roll20-firefox.xpi'
].includes(updateLink), 'le lien XPI doit pointer vers la distribution beta ou vers la copie stable faite par la signature');
assert.ok(manifest.extension.requiredCapabilities.length >= 8);
for (const key of manifest.extension.requiredCapabilities) {
  assert.match(key, /^[A-Za-z][A-Za-z0-9]*$/);
  assert.match(bridge, new RegExp(String.raw`\b${key}\s*:\s*1`));
}
assert.match(content, /data-jjk-extension-version/);
assert.match(content, /data-jjk-bridge-protocol/);
assert.match(demarrageExtension, /if \(IS_EDITEUR\) \{\s*injectPageScript\(\);\s*panDemarre\(\);\s*\}/,
  'comme Outward, le pont est injecté au démarrage de l’éditeur');
assert.match(content, /if \(IS_EDITEUR\) \{\s*injectPageScript\(\);\s*panDemarre\(\);\s*\}/);
assert.match(contentStable, /if \(IS_EDITEUR\) \{\s*injectPageScript\(\);\s*panDemarre\(\);\s*\}/);
assert.match(demarrageExtension, /if \(d\.type === "need-bridge"\) \{\s*injectPageScript\(\);/,
  'la demande ponctuelle d’injection suit le protocole Outward');
assert.doesNotMatch(demarrageExtension, /requestId|injectPageScript\(ev\.source/);
assert.match(pontPageSource, /function injectPageScript\(\)/);
assert.doesNotMatch(pontPageSource, /data-jjk-bridge-state|bridge-ready|bridge-error/);
assert.match(content, /function requestBridge\(\)/);
assert.match(contentStable, /function requestBridge\(\)/);

// Vérifie réellement la comparaison de version et l'acceptation de la version exacte.
const funcs = ['lire', 'compare', 'compareExtension', 'capacitesManquantes', 'pontCompatible'].map(n => extractFunction(boot, n)).join('\n');
let contrat = manifest;
const ctx = { manifeste: () => contrat };
vm.createContext(ctx);
vm.runInContext(funcs, ctx);
const extension = { protocol: 2, version: manifest.extension.minVersion, capabilities: {} };
manifest.extension.requiredCapabilities.forEach(k => { extension.capabilities[k] = 1; });
assert.equal(ctx.pontCompatible({ extension }), true, 'la version exactement minimale doit être acceptée');
assert.equal(ctx.compare('4.3.0b', '4.3.0'), 0, 'le suffixe beta ne change pas le rang de release');
assert.equal(ctx.compare('4.3.1b', '4.3.0'), 1, 'une release supérieure doit être détectée');
assert.equal(ctx.compare('illisible', '4.3.0'), null, 'une release illisible ne doit pas être considérée égale');
assert.equal(ctx.pontCompatible({ extension: { ...extension, version: '1.0.0' } }), false, 'une extension trop ancienne doit être refusée');
assert.equal(ctx.pontCompatible({ extension: { ...extension, version: '999.0.0' } }), true, 'une extension plus récente doit être acceptée');
assert.ok(ctx.compareExtension(extManifest.version, manifest.extension.minVersion) >= 0, 'le paquet signé doit satisfaire le minimum requis');
assert.equal(ctx.compareExtension('4.2.1.2', '4.2.1'), 1, 'une version extension à quatre composants doit être reconnue comme plus récente');
assert.equal(ctx.compareExtension('4.2.1.0', '4.2.1'), 0, 'le quatrième composant nul doit être équivalent à la version à trois composants');
assert.equal(ctx.pontCompatible({ extension: { ...extension, version: '4.3.2' } }), true, 'l’extension 4.3.2 signée doit être acceptée avec ses capacités présentes');
assert.equal(ctx.pontCompatible({ extension: { ...extension, version: '4.3.2' } }), true, 'la version signée 4.3.2 doit satisfaire le contrat');
assert.equal(ctx.pontCompatible({ extension: { ...extension, version: '4.2.1.2' } }), false, 'une extension sous la version minimale doit être refusée');
const sansModePartage = { ...extension, version: '4.3.2', capabilities: { ...extension.capabilities, sharedMode: 0 } };
assert.equal(ctx.pontCompatible({ extension: sansModePartage }), false, 'une extension sans mode Consultation/Édition partagé doit être refusée même si son numéro est récent');
assert.ok(ctx.capacitesManquantes(sansModePartage, manifest.extension).includes('sharedMode'), 'le diagnostic doit nommer la capacité absente');
assert.equal(manifest.extension.requiredCapabilities.includes('perPlayerPresence'), false, 'le contrat ne doit pas exiger une capacité par joueur absente du pont actuel');
assert.equal(ctx.pontCompatible({ extension: { ...extension, version: '4.2.0.99' } }), false, 'un quatrième composant ne doit pas masquer une version de base trop ancienne');
assert.equal(ctx.compareExtension('4.2.1.2-beta', '4.2.1'), null, 'les versions d’extension mal formées doivent être refusées');
const missing = { ...extension, capabilities: { ...extension.capabilities } };
delete missing.capabilities[manifest.extension.requiredCapabilities[0]];
assert.equal(ctx.pontCompatible({ extension: missing }), false, 'une capacité manquante doit être refusée');
assert.equal(ctx.pontCompatible({ extension: { ...extension, protocol: 1 } }), false, 'un protocole différent doit être refusé');
console.log('OK contrat extension : version minimale, capacités et protocole');

// L'amorceur distingue explicitement les releases de fiche (3 composants)
// des versions d'extension (3 ou 4 composants, compteur de signature).
const htmlFns = ['urlSure', 'listeSure', 'versionSure', 'versionExtensionSure', 'valide']
  .map(n => extractFunction(html, n)).join('\n');
const htmlCtx = {};
vm.createContext(htmlCtx);
vm.runInContext(htmlFns, htmlCtx);
assert.equal(htmlCtx.versionSure('4.2.2b'), true);
assert.equal(htmlCtx.versionSure('4.2.1.2'), false, 'une version d’extension ne doit pas être acceptée comme release de fiche');
assert.equal(htmlCtx.versionExtensionSure('4.2.1.2'), true, 'le compteur de signature à quatre composants doit être accepté');
assert.equal(htmlCtx.versionExtensionSure('4.2.1.2-beta'), false, 'une version d’extension mal formée doit être refusée');
assert.equal(htmlCtx.valide(manifest), true, 'le manifeste publié doit passer la validation de l’amorceur HTML');

// La validation interne du boot suit la même grammaire que l'amorceur HTML.
const bootManifestFns = ['lire', 'urlSure', 'compareExtension', 'manifesteValide'].map(n => extractFunction(boot, n)).join('\n');
const bootManifestCtx = { manifeste: () => manifest };
vm.createContext(bootManifestCtx);
vm.runInContext(bootManifestFns, bootManifestCtx);
assert.equal(bootManifestCtx.manifesteValide(manifest), true, 'le boot doit accepter le même manifeste que l’amorceur');
assert.equal(bootManifestCtx.manifesteValide({ ...manifest, extension: { ...manifest.extension, minVersion: '4.2.1.2-beta' } }), false,
  'le boot doit refuser une version d’extension mal formée');

// Comme Outward, toute différence de release OU de schéma demande un choix.
assert.equal(manifest.blocage, 'release');
assert.match(boot, /m\.blocage !== "release"/);
assert.doesNotMatch(boot, /m\.blocage !== "release" && m\.blocage !== "schema"/);
assert.match(boot, /var memeVersion = f\.schema === schSite && f\.release && memeRang\(f\.release, relSite\)/);
assert.match(boot, /Version du personnage incompatible/);
assert.match(boot, /Personnage à mettre à jour/);
assert.match(boot, /Version actuelle de la fiche : /);
assert.match(boot, /Ce personnage a été enregistré avec une ancienne version de la fiche Jujutsu Kaisen/);
assert.match(boot, /Ce personnage a été enregistré avec une version plus récente de la fiche Jujutsu Kaisen/);
assert.match(boot, /Ouvrir avec l’ancienne version/);
assert.match(boot, /Ouvrir avec la version du personnage/);
assert.doesNotMatch(boot, /Ce que la mise à niveau change|Rien n'a été lu de travers|bandeauPlusRecente/);
console.log('OK sécurité de version : texte et architecture Outward, avec le nom Jujutsu Kaisen');

// Comme Outward, l'amorceur choisit le manifeste complet ou un repli gelé complet.
const htmlActif = html.replace(/<!--[\s\S]*?-->/g, '');
assert.match(htmlActif, /var DEFAUT = \{/);
assert.match(htmlActif, /jjk-fiche\.js\?v=77/);
assert.match(htmlActif, /function une\(m\)[\s\S]*?lancer\(valide\(m\) \? m : DEFAUT\)/);
assert.match(htmlActif, /setTimeout\(function \(\) \{ une\(null\); \}, 3000\)/);
assert.match(html, /cache:\s*"no-store"/);
assert.match(html, /script\.onerror/);
assert.match(html, /<h1>Chargement du personnage<\/h1><p>Vérification de l’extension…<\/p>/);
assert.match(html, /function afficherErreur\(\)/);
assert.match(html, /window\.__jjkOpeningDone/);
assert.match(html, /if \(window\.__jjkRoll20BootReady\) return/);
assert.doesNotMatch(html, /position:fixed|alertdialog|Aucune fiche partielle ne sera ouverte|aucune donnée n'a été écrite/);
assert.match(roll20Css, /#jjk-roll20-note button[\s\S]*?background: #171D1E; color: #E4ECEC/);
assert.match(html, /Impossible d’ouvrir le personnage/);
assert.match(html, /Les fichiers nécessaires au fonctionnement de la fiche n’ont pas pu être chargés\. Réessayez dans quelques instants\./);
assert.match(html, /Exporter les données disponibles/);
assert.match(html, /Aucune donnée du personnage disponible à exporter\./);
assert.doesNotMatch(html, /Aucune fiche partielle ne sera ouverte|aucune donnée n'a été écrite|manifest JJK ne répond pas|Initialisation incomplète/);
assert.doesNotMatch(html, /afficherErreur\(\s*['"]/);
assert.match(html, /Repli gelé, construit sur le même modèle que celui d'Outward/);
// Le repli doit être un manifeste complet et accepté par le même validateur,
// avec les mêmes URL que le manifeste publié : jamais de chargement hybride.
const defMatch = /var DEFAUT = (\{[\s\S]*?\n    \});/.exec(htmlActif);
assert.ok(defMatch, 'manifeste de repli absent');
const fallback = vm.runInNewContext('(' + defMatch[1] + ')');
const htmlValidators = ['urlSure', 'listeSure', 'versionSure', 'versionExtensionSure', 'valide']
  .map(n => extractFunction(htmlActif, n)).join('\n');
const htmlValidationContext = {};
vm.createContext(htmlValidationContext);
vm.runInContext(htmlValidators, htmlValidationContext);
assert.equal(htmlValidationContext.valide(fallback), true, 'le repli doit passer le validateur de l’amorceur');
assert.equal(fallback.release, manifest.release, 'le repli doit porter la release publiée');
assert.deepEqual(JSON.parse(JSON.stringify(fallback.amorce)), manifest.amorce);
assert.deepEqual(JSON.parse(JSON.stringify(fallback.bundle.js)), manifest.bundle.js);
assert.deepEqual(JSON.parse(JSON.stringify(fallback.bundle.css)), manifest.bundle.css);
assert.deepEqual(JSON.parse(JSON.stringify(fallback.archives)), manifest.archives, 'le repli doit conserver les versions archivées');
assert.deepEqual(JSON.parse(JSON.stringify(fallback.extension)), manifest.extension, 'le repli doit garder le contrat d’extension publié');
for (const url of [...fallback.amorce, ...fallback.bundle.js, ...fallback.bundle.css]) {
  assert.ok(fs.existsSync('docs/' + url.split('?')[0]), 'fichier du repli absent : ' + url);
}
assert.match(html, /var garde = setTimeout/);
assert.match(html, /\}, 10000\)/);
assert.match(html, /styles partent en parallèle/);
assert.match(html, /window\.__jjkRoll20BootReady/);
// Le message de chargement reste jusqu'au montage réel. Le garde HTML
// surveille uniquement les scripts ; le boot gère ensuite les réponses Roll20.
const finalize = extractFunction(boot, 'finalizeMontage');
const hydrateFn = extractFunction(boot, 'hydrate');
assert.doesNotMatch(hydrateFn, /window\.__jjkOpeningDone = true/,
  'une hydratation ne signifie pas que la fiche est montée');
assert.doesNotMatch(hydrateFn, /note\(null\)/, 'l’hydratation ne doit pas laisser un écran vide pendant le montage');
assert.match(finalize, /bundleCharge = true;[\s\S]*?note\(null\);[\s\S]*?post\(\{ type: "mounted" \}\)/,
  'le message de chargement ne disparaît qu’après le montage confirmé');
assert.match(boot, /délai dépassé pendant le chargement du script/);
assert.match(boot, /délai dépassé pendant le chargement de la feuille de style/);
assert.match(boot, /délai dépassé pendant le chargement de la correspondance des attributs/);
assert.match(html, /var garde = setTimeout/,
  'le watchdog HTML ne doit couvrir que le chargement des scripts ; le boot gère ensuite la réponse Roll20');
assert.match(boot, /function ecranDonneesIncompletes/);
assert.doesNotMatch(boot, /Écraser avec ce qui a pu être lu|function bandeauGel\(/,
  'une lecture incomplète ne doit jamais proposer un écrasement automatique de la fiche');
assert.match(boot, /function ecranPontIncompatible/);
assert.doesNotMatch(boot, /Capacités absentes : /, 'le message de compatibilité doit rester celui d’Outward');
assert.doesNotMatch(boot, /function ecranMiseAJourObligatoire/);
assert.match(boot, /function ecranPontIncompatible[\s\S]*?Extension Jujutsu Kaisen à mettre à jour[\s\S]*?Votre version de l’extension[\s\S]*?Dernière version de l’extension/);
assert.match(boot, /if \(ev\.source !== window\.top\) return/);
assert.match(boot, /attrsVus = d && d\.attrs && typeof d\.attrs === "object" \? d\.attrs : null/);
assert.doesNotMatch(boot, /options\.exporterAttrs/);
assert.doesNotMatch(boot, /options\.noExport/);
assert.match(narration, /var VIEW_ID = "narr-/);
assert.match(narration, /msg\.viewId = VIEW_ID/);
assert.match(narration, /post\(\{ type: "load"[\s\S]*?resync: rs \}\)/);
assert.match(boot, /pontRefuse = true/);
assert.match(boot, /if \(hydrated \|\| failureKind \|\| pontRefuse\) return;/);
assert.match(boot, /var OPERATION_TIMEOUT = 36000/);
assert.match(boot, /function startLoading\(kind, step\)/);
assert.doesNotMatch(boot, /tries > 80/);
assert.match(boot, /function specCourant\(\)[\s\S]*?if \(!manifesteValide\(m\)\) return null/);
assert.doesNotMatch(boot, /javascripts\/jjk-fiche\.js"\s*\]/);
assert.match(boot, /echec\(u, "script obligatoire introuvable"\)/);
assert.match(boot, /bundleCharge = true/);
assert.match(boot, /post\(\{ type: "mounted" \}\)/);
assert.match(boot, /window\.__jjkRoll20BootReady = true/);
assert.ok(boot.indexOf('window.__jjkRoll20BootReady = true') < boot.indexOf('if (STANDALONE)'));
// Le bundle n'est considéré prêt qu'après le montage réel, comme Outward.
const apiPublic = fs.readFileSync('src/fiche/socle/310-api-publique.js', 'utf8');
const mount = fs.readFileSync('src/fiche/socle/320-montage.js', 'utf8');
assert.match(apiPublic, /window\.Jjk = \{/);
assert.match(mount, /window\.Jjk\.__pret = true/);
const mountProbe = boot.slice(boot.indexOf("function ficheEstMontee()"), boot.indexOf("function attendreMontage()"));
assert.match(mountProbe, /window\.Jjk && window\.Jjk\.__pret === true/);
assert.ok(mountProbe.includes('root.querySelector(".perso-atelier .pc-sheet")'));
assert.ok(mountProbe.includes("window.Jjk && window.Jjk.__erreur"));
assert.ok(mountProbe.includes('root.querySelector(".perso-atelier .pc-sheet")'), 'le boot attend le nœud du montage réel lorsque le bundle ne publie pas de sentinelle');
assert.match(boot, /function attendreMontage\(\)/);
assert.match(boot, /var parent = document\.body;[\s\S]*?parent\.insertBefore\(bar, root\)/);
assert.match(boot, /delai == null \? 1200/);
console.log('OK ouverture : repli Outward, erreurs bloquantes, sentinelle de montage et bandeau après montage réel');

// Les sauvegardes/relectures initiales doivent attendre le fetch serveur, jamais la copie Backbone locale.
assert.match(bridge, /ch\.attribs\.fetch\(\{\s*success:/);
assert.match(bridge, /setInterval\(function \(\)[\s\S]*?resynchronise\(ch\)/);
const load = bridge.slice(bridge.indexOf('if (d.type === "load")'), bridge.indexOf('} else if (d.type === "save")'));
assert.match(load, /if \(d\.resync === true\)/);
assert.match(load, /resynchronise\(chl\);[\s\S]*?return;/);
assert.ok(load.indexOf('resynchronise(chl);') < load.indexOf('var lecture = readAll(d.charId)'),
  'une demande resync ne doit jamais répondre avec la copie locale Roll20');
assert.doesNotMatch(load, /if \(resynchronise\(chl\)\) \{[\s\S]*?var lecture/);
assert.match(bridge, /var resyncJobs = \{\}/);
assert.match(bridge, /job\.timer = setTimeout\(function \(\) \{[\s\S]*?resynchronise\(ch\)/);
assert.match(bridge, /fresh: !!ok/);
assert.match(bridge, /srcViewIds/);
assert.match(bridge, /if \(vue && srcViewIds\[i\] !== vue\)[\s\S]*?srcLourds\[i\] = null/);
assert.match(load, /lier\(ev\.source, d\.charId, d\.viewId\)/);
assert.match(boot, /completeOmis\(d\.attrs \|\| \{\}, d\.omis\)/);
assert.match(boot, /if \(d\.fresh !== true\) \{\s*if \(hydrated\) sondeReponse\(null\);\s*return;/);
const freshBranch = boot.slice(boot.indexOf('if (d.fresh !== true) {'), boot.indexOf('// objet pris au tchat'));
assert.ok(freshBranch.includes('appliqueLectureCompact(d.attrs);') && freshBranch.includes('sondeReponse(d.attrs);'),
  'une lecture fraîche doit actualiser Compact et acquitter les confirmations');
assert.doesNotMatch(boot, /else if \(hydrated\) sondeReponse\(d\.attrs\)/,
  'une lecture Roll20 non fraîche ne doit jamais acquitter une sonde');
assert.doesNotMatch(boot, /hydrate-refresh-error/,
  'le boot JJK doit utiliser le même signal de lecture non fraîche qu’Outward');
assert.match(boot, /cb\(null\);[\s\S]*?\}, 40000\)/);
assert.match(boot, /var fin = Date\.now\(\) \+ \(delaiMax \|\| 40000\)/);
assert.equal((boot.match(/confirme\(lot, function/g) || []).length, 1);
const confirmation = extractFunction(boot, 'confirme');
assert.match(confirmation, /if \(Date\.now\(\) >= fin\) \{ cb\(false\); return; \}[\s\S]*?setTimeout\(essai, 700\)/,
  'une confirmation relance la lecture jusqu’au délai maximal au lieu de déclarer trop tôt un échec');
console.log('OK synchronisation initiale : aucune hydratation sur un cache Roll20 non rafraîchi');

// Le pont doit porter le cycle Compact complet et la libération des vues.
const storageSource = fs.readFileSync('src/extension/roll20-page/085-stockage.js', 'utf8');
const listener = fs.readFileSync('src/extension/roll20-page/090-ecouteur.js', 'utf8');
assert.match(bridge, /storageActivation\s*:\s*1/);
assert.match(bridge, /storageCleanup\s*:\s*1/);
assert.match(bridge, /storageRelease\s*:\s*1/);
assert.match(storageSource, /function stockageActiver/);
assert.match(storageSource, /function stockageNettoie/);
assert.match(storageSource, /function stockageLibereVue/);
assert.match(storageSource, /backup\[kind\] !== meta\.epoch/,
  'le nettoyage doit attendre la sauvegarde locale confirmée de la même époque');
assert.match(listener, /d\.type === "storage-activate"[\s\S]*?srcViewIds\[activationIndex\] !== activationView/);
assert.match(listener, /d\.type === "storage-cleanup"[\s\S]*?d\.storage !== "narration"/);
assert.match(listener, /d\.type === "storage-release"[\s\S]*?stockageLibereVue/);
assert.match(listener, /Identifiant d'opération réutilisé avec un contenu différent/);
assert.match(boot, /#jjk-bandeau\{position:sticky[\s\S]*?background:#171D1E;color:#78BBC0/);
assert.equal((boot.match(/\bbandeau\s*\(/g) || []).length, 2, 'JJK ne doit construire que le bandeau de sauvegarde Outward');
assert.match(boot, /function bandeauPerte\(\)[\s\S]*?afficheErreurEnregistrement\(false\)/);
assert.doesNotMatch(boot, /La synchronisation ne répond plus|modification concurrente sur les mêmes données|nettoyage du stockage|changement de mode\. La fiche conserve|Sauvegarde restaurée et confirmée|Restauration incomplète/);
assert.match(boot, /Impossible de mettre à jour le personnage[\s\S]*?La mise à jour du personnage n’a pas pu être terminée\. Réessayez dans quelques instants\./);
assert.doesNotMatch(boot, /Restauration d'une sauvegarde en cours|Fiche mise à niveau en|bandeauMisAJour/);
assert.match(boot, /function afficheErreurEnregistrement\(failed\)/);
assert.match(boot, /jjk-save-status/);
assert.match(boot, /Exporter les données disponibles/);
assert.match(boot, /addEventListener\("pagehide"[\s\S]*?type: "storage-release"/);
assert.match(narration, /addEventListener\("pagehide"[\s\S]*?type: "storage-release"/);
assert.equal((narration.match(/d\.type === "storage-error" && d\.charId === charId && d\.storage === "narration"/g) || []).length, 1, 'les erreurs de stockage Narration ne doivent pas être masquées par un branchement vide');
assert.match(listener, /stockageOperationsEnAttente\(storageChar, kindStorage, d\.epoch\)/);
// La sauvegarde locale ne doit pas faire confiance aux attributs envoyés par
// la fiche : elle doit reprendre une photographie fraîche issue de Roll20 et
// relier l'accusé à la même vue.
assert.match(boot, /type: "backup-snapshot", request: request[\s\S]*?viewId: VIEW_ID/);
const backupBlock = listener.slice(listener.indexOf('if (d.type === "backup-snapshot")'), listener.indexOf('// le plateau de Narration'));
assert.match(backupBlock, /srcViewIds\[backupIndex\] !== backupView/);
assert.match(backupBlock, /stockageFraichePour\(bch\)/);
assert.match(backupBlock, /var ba = freshBackup\.attrs/);
assert.doesNotMatch(backupBlock, /(?:var|const) ba = d\.attrs|for \(bn in d\.attrs\)/);
assert.match(backupBlock, /totalBackup > 20000000/);
assert.match(listener, /srcViewIds\[i\] !== pending\.viewId/);
assert.match(boot, /d\.viewId !== VIEW_ID \|\| d\.request !== backupPendingRequest/);
console.log('OK sauvegarde locale : source Roll20 fraîche, identité de vue et plafond de taille');
assert.match(listener, /incomingOps\[op\.id\][\s\S]*?contenu différent/);
assert.match(listener, /stockageSuitVue\(storageChar, viewId, sessionId, kindStorage, d\.epoch, operationsRecues, payloadSource\)/);
assert.match(storageSource, /function stockageConfirme\(ch, attrs\)/);
assert.match(storageSource, /function stockageTravailContient\(ch, item, isPayload\)/);
console.log('OK stockage Compact : activation, ménage après sauvegarde confirmée, collisions et libération des vues');
console.log('OK bandeau : charte JJK sombre et turquoise, relâchement de session à la fermeture');

// Le mode Consultation doit couvrir les actions de construction, pas les gestes de jeu.
const guards = fs.readFileSync('src/fiche/socle/170-edition.js', 'utf8');
const inv = fs.readFileSync('src/fiche/equipement/inv-objets.js', 'utf8');
assert.match(guards, /\[\"dragstart\", \"dragover\", \"drop\"\]\.forEach/);
assert.match(guards, /\[\"beforeinput\", \"input\", \"change\", \"paste\", \"cut\", \"keydown\"\]\.forEach/);
assert.match(guards, /addEventListener\("submit"/);
assert.match(guards, /data-jjk-requires-edit/);
assert.match(inv, /if \(!isEdit\("inv"\)\) return/);
assert.match(inv, /addEventListener\("contextmenu"/);
console.log('OK Consultation/Édition : garde drag/drop, saisie, soumission et actions contextuelles');
