'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = p => fs.readFileSync(p, 'utf8');

// Inventaire : menu contextuel à la souris et au clavier, actions et verrou.
const inv = read('src/fiche/equipement/inv-objets.js');
assert.match(inv, /addEventListener\("contextmenu"/);
assert.match(inv, /e\.key === "ContextMenu"/);
assert.match(inv, /e\.shiftKey && e\.key === "F10"/);
assert.match(inv, /action\("Détails"/);
assert.match(inv, /action\("Montrer"/);
assert.match(inv, /donnerDialogue\(it, it\.qte\)/);
assert.match(inv, /if \(isEdit\("inv"\)\)/);
assert.match(inv, /action\("Retirer"/);
assert.match(inv, /action\("Déplacer vers/);
assert.match(inv, /var boite = el\("input", "pc-edit-field"\)/);
const invCss = read('docs/stylesheets/jjk-fiche.css');
assert.match(invCss, /\.pc-obj-context\s*\{/);
assert.match(invCss, /\.pc-obj-context-action:focus-visible/);
console.log('OK inventaire : clic droit, clavier, Montrer, Donner, déplacement et retrait selon le mode');

// PV / EM : une seule réserve horizontale pleine largeur, au format Outward.
// La palette et les leviers historiques de PV restent ceux de JJK ; EM dispose
// de son maximum éditable dans l'en-tête et de son propre accent cyan assourdi.
const pv = read('src/fiche/fiche/pv.js');
assert.match(pv, /function buildReserve\(cfg\)/);
assert.match(pv, /pc-vital-jauge/);
assert.match(pv, /fill\.style\.width = ratio \+ "%"/);
assert.match(invCss, /\.pc-vital-jauge\s*\{/);
assert.match(invCss, /\.pc-vital-jauge\.critical/);
assert.match(pv, /title: "PV", moduleId: "pv"/);
assert.match(pv, /title: "EM", moduleId: "em"/);
assert.match(pv, /themeClass: "pc-vital-em"/);
assert.match(invCss, /--vital-color: #438C96/);
const headVital = read('src/fiche/socle/190-entete.js');
assert.match(headVital, /EM max/);
assert.match(headVital, /pc-em-max-input/);
console.log('OK PV / EM : jauge pleine largeur, commandes communes et accent cyan modéré');

// Notes : le journal JJK existant reste un journal, avec Markdown et recherche.
const notes = read('src/fiche/bio/notes.js');
assert.match(notes, /notesJournal/);
assert.match(notes, /search\.addEventListener\('input'/);
assert.match(notes, /markdown|renderMarkdown|marked|Markdown/i);
console.log('OK Notes : journal structuré, recherche et rendu Markdown conservés');

// Consultation / Édition : état global partagé et garde sur les éléments de construction.
const boot = read('docs/javascripts/jjk-roll20-boot.js');
const edit = read('src/fiche/socle/170-edition.js');
assert.match(boot, /window\.__jjkCanEdit/);
assert.match(boot, /type: "presence"/);
assert.match(boot, /modePartage/);
assert.match(boot, /Passer en Mode Edition/);
assert.match(boot, /Passer en Mode Consultation/);
assert.match(edit, /function ficheModifiable\(\)/);
assert.match(edit, /\.pc-edit-only, \.pc-gear/);
const bricks = read('src/fiche/socle/160-briques.js');
assert.match(bricks, /el\("input", "pc-edit-field"\)/);
assert.match(bricks, /pc-num pc-edit-field/);
assert.match(bricks, /pc-mmod pc-edit-field/);
const moduleContext = read('src/fiche/socle/230-contexte-module.js');
const head = read('src/fiche/socle/190-entete.js');
assert.match(moduleContext, /data-jjk-requires-edit", id/);
assert.match(edit, /function appliqueChampsHorsModule/);
assert.match(edit, /pc-global-edit-field/);
assert.match(edit, /if \(!scope\) return ficheModifiable\(\)/);
assert.match(head, /champEntete[\s\S]*pc-global-edit-field/);
assert.match(head, /xpIn = el\("input", "pc-edit-field pc-global-edit-field"\)/);
const montage = read('src/fiche/socle/320-montage.js');
assert.match(montage, /refresh\(\);[\s\S]*window\.__jjkApplyMode\(\)/);
assert.match(head, /pbox\.addEventListener\(\"click\", function \(\) \{[\s\S]*?if \(!ficheModifiable\(\) \|\| pedit\) return/);
assert.match(head, /pedit\.addEventListener\(\"blur\", function \(\) \{[\s\S]*?if \(ficheModifiable\(\)\) state\.portrait/);
assert.match(boot, /function ecranPontIncompatible\(d\)[\s\S]*?Extension Jujutsu Kaisen à mettre à jour[\s\S]*?Votre extension Jujutsu Kaisen n’est pas à jour[\s\S]*?boutonExport\(z\)/);
assert.doesNotMatch(boot, /options\.exporterAttrs|options\.noExport|Capacités absentes : /);
console.log('OK modes : consultation/édition globales et présence partagée conservées');

// Sauvegardes locales : snapshot Compact validé comme une fiche, avec historique IDB.
const backups = read('extension/firefox/backups.js');
const relay = read('extension/firefox/backup-relay.js');
assert.match(backups, /jjk_state\s*\|\|\s*d\.attrs\.jjk_storage/);
assert.match(backups, /indexedDB\.open\('jjk-backups'/);
assert.match(backups, /SHA-256/);
assert.match(backups, /async function empreinte\(raw\)/);
assert.match(backups, /empreinte\(record\.raw\)/);
assert.match(backups, /async function lire\(id\)/);
assert.match(backups, /await empreinte\(record\.raw\)!==record\.hash/);
assert.match(backups, /rows\.slice\(19\)/);
assert.match(relay, /jjk-backup-save/);
assert.match(relay, /jjk-backup-restore/);
assert.match(boot, /sauvegardeLocale\(attrs, "opening"\)/);
assert.match(boot, /sauvegardeLocale\(attrs, "autosave"/);
const backupUI = read('extension/firefox/popup/backups-ui.js');
assert.match(backupUI, /JSON\.stringify\(saved,null,2\)/);
assert.match(backupUI, /action:'restore'/);
assert.match(relay, /120000/);
assert.match(boot, /backup-restore-start/);
assert.match(boot, /backup-restore-status/);
assert.doesNotMatch(boot, /Restauration d'une sauvegarde en cours|jjk_backup|Restaurer l'état d'origine/);
assert.match(boot, /sauvegardeLocale\(attrs, "migration", state, true\)/);
console.log('OK sauvegardes : snapshots Compact, IndexedDB, hash, rétention, export complet et restauration gelée');

// Le pont accepte les opérations JJK et Narration dans leurs espaces isolés.
const bridge = read('src/extension/roll20-page/090-ecouteur.js');
assert.match(bridge, /d\.type === "storage-ops"/);
assert.match(bridge, /jjk_narr_ops_/);
assert.match(bridge, /jjk_narr_block_/);
assert.match(bridge, /jjk_narr_stack_/);
assert.match(bridge, /opsPrefix \+ \(sessionId \|\| "session"\)/);
assert.match(bridge, /function retireObsoletes\(\)/);
assert.match(bridge, /ecrituresConfirmees\(\)/);
assert.match(bridge, /name\.indexOf\("jjk_narr_"\) !== 0/);
const writes = read('src/extension/roll20-page/030-attributs.js');
assert.match(writes, /function debutEcriture\(name, data, attendus\)/);
assert.match(writes, /trace\.reponses >= trace\.attendus/);
assert.match(writes, /réponse tardive d'une écriture remplacée/);
console.log('OK pont : journaux isolés, restauration serveur confirmée, attributs obsolètes purgés, Narration préservée');
