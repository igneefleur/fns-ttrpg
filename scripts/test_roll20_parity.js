#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');

const boot = fs.readFileSync('docs/javascripts/jjk-roll20-boot.js', 'utf8');
const html = fs.readFileSync('docs/roll20-fiche.html', 'utf8');
const bridge = fs.readFileSync('src/extension/roll20-page/070-ouverture-fiche.js', 'utf8');
const api = fs.readFileSync('src/fiche/socle/310-api-publique.js', 'utf8');
const mount = fs.readFileSync('src/fiche/socle/320-montage.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('docs/jjk-manifeste.json', 'utf8'));

// Libellés partagés avec Outward, en remplaçant uniquement le nom du jeu.
for (const phrase of [
  'Chargement du personnage',
  'Vérification de l’extension…',
  'Chargement des données du personnage depuis Roll20…',
  'Impossible d’ouvrir le personnage',
  'Roll20 n’a pas répondu à la demande de chargement du personnage.',
  'Les informations nécessaires pour vérifier la version de l’extension n’ont pas pu être récupérées.',
  'Roll20 n’a pas transmis toutes les données nécessaires pour ouvrir ce personnage.',
  'Les données reçues de Roll20 ne peuvent pas être lues. Le personnage n’a pas pu être ouvert.',
  'Les fichiers nécessaires au fonctionnement de la fiche n’ont pas pu être chargés.',
  'Une erreur empêche l’affichage de la fiche.',
  'Réessayez dans quelques instants.',
  'Réessayer',
  'Exporter les données disponibles',
  'Aucune donnée du personnage disponible à exporter.',
  'Votre version de l’extension : ',
  'Dernière version de l’extension : ',
  'Télécharger la mise à jour',
  'Impossible d’enregistrer le personnage',
  'Une erreur empêche l’enregistrement des dernières modifications. Réessayez dans quelques instants.',
  'Roll20 n’a pas confirmé les dernières modifications. Elles restent dans cette fenêtre et seront perdues si vous la fermez ou la rechargez. Réessayez dans quelques instants.'
]) assert.ok(boot.includes(phrase) || html.includes(phrase), 'texte Outward manquant : ' + phrase);
assert.ok(boot.includes('Extension Jujutsu Kaisen à mettre à jour'));
assert.match(boot, /Ce personnage a été enregistré avec une ancienne version de la fiche Jujutsu Kaisen/);
assert.match(boot, /Ce personnage a été enregistré avec une version plus récente de la fiche Jujutsu Kaisen/);
assert.match(html, /function afficherErreur\(\)/);
assert.match(html, /Les fichiers nécessaires au fonctionnement de la fiche n’ont pas pu être chargés\. Réessayez dans quelques instants\./);
assert.match(boot, /window\.__jjkOpeningDone = true/);
assert.equal((boot.match(/\bbandeau\s*\(/g) || []).length, 2, 'un seul appel de bandeau : celui de sauvegarde partagé avec Outward');
assert.doesNotMatch(boot, /La synchronisation ne répond plus|modification concurrente sur les mêmes données|nettoyage du stockage|Restauration incomplète|Fiche mise à niveau en/);
assert.ok(boot.includes('Votre extension Jujutsu Kaisen n’est pas à jour. Installez la dernière version, puis rechargez la page Roll20 pour ouvrir ce personnage.'));

// La barre de mode et de présence reprend l’architecture Outward et reste attachée à body.
for (const phrase of [
  'Mode Consultation', 'Mode Edition', 'Passer en Mode Edition', 'Passer en Mode Consultation',
  'En édition : ', 'En consultation : '
]) assert.ok(boot.includes(phrase), 'libellé du bandeau absent : ' + phrase);
assert.match(boot, /var parent = document\.body;/);
assert.match(boot, /parent\.insertBefore\(bar, root\)/);
assert.match(boot, /setInterval\(function \(\) \{ envoyerPresence\("heartbeat"\); \}, 10000\)/);

// Cadences réellement utilisées par Outward : poll Compact fiche, fetch serveur pont, présence.
assert.match(boot, /delai == null \? 1200/);
assert.match(bridge, /RESYNC_MIN\s*=\s*1500/);
assert.match(bridge, /var resyncJobs = \{\}/);
assert.match(bridge, /job\.timer = setTimeout\(function \(\) \{[\s\S]*?resynchronise\(ch\)/);
assert.match(bridge, /fresh: !!ok/);
assert.match(boot, /}, 10000\)/);
assert.match(boot, /Date\.now\(\) - derniereLectureFraiche < 12000/);
assert.match(boot, /setInterval\(verifieSilenceSynchronisation, 1200\)/);

// Ouverture identique à Outward : lecture répétée, délai central, erreur non fraîche.
assert.match(boot, /var OPERATION_TIMEOUT = 36000/);
assert.match(boot, /function startLoading\(kind, step\)/);
assert.match(boot, /function stopLoading\(\)/);
assert.match(boot, /function updateLoading\(step\)/);
assert.match(boot, /function demanderOuverture\(\)[\s\S]*?if \(hydrated \|\| failureKind \|\| pontRefuse\) return;[\s\S]*?setTimeout\(ask, 500\)/);
assert.match(boot, /function relireOuverture\(\)[\s\S]*?startLoading\("opening"[\s\S]*?post\(\{ type: "load", resync: true, allege: true, viewId: VIEW_ID \}\);/);
assert.doesNotMatch(boot.slice(boot.indexOf('function relireOuverture()'), boot.indexOf('function ecranDonneesIncompletes')), /setTimeout\(ask, 500\)/);
assert.doesNotMatch(boot, /tries > 80|hydrate-refresh-error/);
assert.match(boot, /if \(d\.fresh !== true\) \{\s*if \(hydrated\) sondeReponse\(null\);\s*return;/);
assert.match(boot, /updateLoading\("Chargement des données du personnage depuis Roll20…"\)/);
assert.match(boot, /updateLoading\("Préparation de la fiche…"\)/);
assert.match(boot, /function finalizeMontage\(\)[\s\S]*?stopLoading\(\);[\s\S]*?fermerEcran\(\);[\s\S]*?poserModeBar\(\)[\s\S]*?note\(null\);[\s\S]*?post\(\{ type: "mounted" \}\)/,
  'l’écran de chargement reste présent jusqu’au montage réellement terminé');

// Le chargement d'un script n'ouvre pas la fiche : le DOM monté est le seul signal.
assert.match(api, /__pret:\s*false/);
assert.match(mount, /window\.Jjk\.__pret = true/);
assert.match(boot, /function attendreMontage\(\)/);
assert.match(boot, /window\.Jjk\.__pret === true/);
assert.match(boot, /setTimeout\(attendreMontage, 25\)/);
assert.match(html, /setTimeout\(function \(\) \{ une\(null\); \}, 3000\)/);
assert.match(html, /var DEFAUT = \{/);
assert.match(html, /var garde = setTimeout/);
assert.match(boot, /window\.__jjkOpeningDone = true/);
const hydrateFn = boot.slice(boot.indexOf('function hydrate('), boot.indexOf('window.addEventListener("message"'));
assert.match(hydrateFn, /hydrated = true;/);
assert.doesNotMatch(hydrateFn, /__jjkOpeningDone/,
  'une hydratation ne doit pas désarmer le watchdog avant le montage');
assert.match(boot, /délai dépassé pendant le chargement du script/);
assert.ok(manifest.extension.minVersion === '4.3.2', 'le pont corrigé doit imposer l’extension signée correspondante');
