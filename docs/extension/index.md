# Extension

## La fiche MIA sur Roll20

Une extension (Firefox ou Chrome) affiche une fiche de personnage MIA à la place
de la fiche Roll20, et envoie ses jets dans le tchat. Les personnages se créent
dans le [créateur de personnage](../personnage/index.md) ; l'extension les
récupère et les présente dans une partie Roll20, via un onglet « Fiche MIA »
ajouté à la fiche du personnage.

### Mode beta

Une seule extension, deux versions de la fiche. Le fichier est le MÊME sur les
deux sites : peu importe d'où il est téléchargé, c'est son réglage qui décide.
Son bouton dans la barre du navigateur ouvre un panneau qui porte
l'interrupteur « Beta » : coché, la fiche affichée dans Roll20 est celle de la
beta, là où les nouveautés arrivent en premier, au risque de casses
passagères ; décoché, elle revient à la version stable. L'onglet du dialogue de
personnage s'annonce alors « Fiche MIA beta », pour qu'on sache toujours quelle
version on remplit.

Les deux versions écrivent les mêmes Attributes du personnage : un aller-retour
ne perd rien, et les autres joueurs ne voient aucune différence.

<style>
.ext-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; margin:1rem 0 1.25rem; align-items:start; }
@media (max-width:720px){ .ext-grid{ grid-template-columns:1fr; } }
.md-typeset .ext-grid .mcard { margin:0; }
.md-typeset .ext-card .md-button { font-size:.62rem; padding:.3em .9em; margin:.15rem 0 .55rem; }
.md-typeset .ext-card ol.ext-steps { font-size:.66rem; margin:.2rem 0 0; padding-left:1.15rem; }
.md-typeset .ext-card ol.ext-steps li { margin:.24rem 0; text-align:left; }
.ext-url { display:inline-flex; align-items:center; gap:.3rem; }
.ext-url code { white-space:nowrap; }
.md-typeset .ext-copy {
  font-family:'Cinzel', Garamond, serif; font-size:.6rem; letter-spacing:.03em;
  border:1px solid var(--md-default-fg-color--lightest,#d9d2bf); border-radius:4px;
  background:transparent; color:var(--green-title,#667861); padding:.06rem .42rem; cursor:pointer;
}
.md-typeset .ext-copy:hover { border-color:var(--green-title,#667861); }
.md-typeset .ext-copy.ok { border-color:var(--green-title,#667861); font-weight:700; }
</style>

<div class="ext-grid">
  <div class="mcard ext-card">
    <p><strong>Firefox</strong><span class="prereq">Signée par Mozilla · installation permanente</span></p>
    <p><a class="md-button" href="../download/mia-roll20-firefox.xpi" download>Télécharger (.xpi)</a></p>
    <ol class="ext-steps">
      <li>télécharger le fichier <code>.xpi</code> ;</li>
      <li>l'ouvrir avec Firefox : <kbd>Ctrl</kbd>+<kbd>J</kbd> (téléchargements)
          puis double-clic sur le fichier, ou le glisser dans une fenêtre Firefox ;</li>
      <li>confirmer « Ajouter » : l'installation est définitive et les mises à
          jour se font toutes seules depuis ce site.</li>
    </ol>
  </div>
  <div class="mcard ext-card">
    <p><strong>Chrome / Edge</strong><span class="prereq">Mode développeur · dossier décompressé</span></p>
    <p><a class="md-button" href="../download/mia-roll20-chrome.zip" download>Télécharger (.zip)</a></p>
    <ol class="ext-steps">
      <li>décompresser le <code>.zip</code> dans un dossier (à conserver : le
          navigateur y lit l'extension) ;</li>
      <li>ouvrir : <span class="ext-url"><code>chrome://extensions</code><button class="ext-copy" type="button" data-copy="chrome://extensions">copier</button></span>
          (Edge : <span class="ext-url"><code>edge://extensions</code><button class="ext-copy" type="button" data-copy="edge://extensions">copier</button></span>) ;</li>
      <li>activer le « Mode développeur » (« Developer mode ») ;</li>
      <li>« Charger l'extension non empaquetée » (« Load unpacked ») et choisir
          le dossier décompressé.</li>
    </ol>
  </div>
</div>

Les deux marches à suivre ci-dessus valent telles quelles : seuls les boutons de
téléchargement manquent, et ils reviendront à la première signature.

La fiche affichée dans Roll20 est chargée depuis le site à chaque ouverture :
les évolutions du créateur et des règles arrivent toutes seules, sans mise à
jour de l'extension (une connexion internet est nécessaire pendant la partie).
La fiche lue dépend de l'interrupteur « Mode beta » ci-dessus.

Ensuite : ouvrir le [créateur de personnage](../personnage/index.md) une fois
(les fiches se synchronisent), puis, dans une partie Roll20, ouvrir un personnage
et cliquer l'onglet « Fiche MIA », en **deuxième position** dans la barre du
dialogue. Si le personnage n'a pas encore de fiche, un bouton « Créer fiche MIA »
en fabrique une, enregistrée dans le personnage Roll20 lui-même (partagée avec
tous les joueurs qui le contrôlent).
