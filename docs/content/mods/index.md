# Mods

<style>
/* Page de référence : blocs de code sobres (aucune coloration), tables qui
   défilent seules sous 700 px, et un encart d'avertissement qui se voit sans
   crier (police, couleur, taille : jamais de capitales). */
.md-typeset .mods-code { margin: 0.8rem 0 1.2rem; }
.md-typeset .mods-code pre { background: rgba(127,127,127,.06); border-radius: 4px; }
.md-typeset .mods-code code { font-size: .68rem; line-height: 1.45; }
.md-typeset .mods-note {
  background: rgba(127,127,127,.06); border-left: 3px solid #cfc8b8; border-radius: 4px;
  padding: .5rem 1rem; margin: 1rem 0 1.4rem; font-size: .9em;
}
.md-typeset .mods-note p:last-child { margin-bottom: 0; }
.md-typeset .mods-alerte {
  border: 1px solid var(--green-title,#667861); border-left-width: 5px; border-radius: 4px;
  padding: .8rem 1.1rem; margin: 1.1rem 0 1.5rem;
}
.md-typeset .mods-alerte .cle {
  font-family: 'Cinzel', Garamond, serif; font-size: 1.15em; line-height: 1.5;
  color: var(--green-title,#667861); margin: 0;
}
.md-typeset table:not([class]) td code { white-space: nowrap; }
@media screen and (max-width: 44em) {
  .md-typeset table:not([class]) td code { white-space: normal; overflow-wrap: anywhere; }
  .md-typeset .mods-code code { font-size: .62rem; }
}
</style>

La fiche bâtit ses blocs à partir d'un registre de modules. Un mod est un module
de plus, écrit par un joueur : quelques lignes de JavaScript rangées dans le
personnage, que la fiche exécute à chaque ouverture. Rien ne se compile et rien
ne s'installe sur la machine ; le code est du texte, rangé dans le personnage,
exécuté tel quel.

Cette page décrit l'interface publique de la fiche 3 : l'objet `Jjk`, le
contexte reçu par un module, les filtres de calcul, et les deux blocs de
l'onglet Options qui les gouvernent. Le 3 est le premier nombre de la release,
celui que rend `Jjk.version` ; il ne se confond pas avec le schéma de l'état,
qui compte la forme des données et monte de son côté.

<div class="mods-alerte" markdown>

<p class="cle">Installer un mod, c'est confier à son auteur son personnage, et tous ceux que ce navigateur garde.</p>

</div>

Un mod tourne dans la page de la fiche, avec les droits de la fiche. Avant d'en
autoriser un qui vient d'ailleurs, lire la dernière section de cette page.

## Deux blocs dans l'onglet Options

| Bloc | Ce qu'il règle |
| --- | --- |
| Mods | la liste des mods du personnage : ajouter, lire, modifier, autoriser, couper, supprimer. |
| Modules | la disposition de la fiche : ce qui s'affiche, dans quel ordre, dans quelle colonne. Les modules livrés avec la fiche et les mods y figurent ensemble. |

## Installer un mod

Options, bloc « Mods », bouton « Ajouter un mod ». Le dialogue demande un nom,
un identifiant (pré-rempli depuis le nom, corrigible), le code, et une release
minimale facultative. L'identifiant est normalisé en minuscules, chiffres et
traits d'union, et il est unique dans le personnage.

Chaque ligne du bloc porte le nom du mod, son identifiant en petit, son état,
puis les boutons qui vont avec : « Voir le code », qui l'affiche en lecture
seule sans rien décider, « Modifier », « Autoriser » et « Refuser » selon ce qui
a déjà été répondu, l'interrupteur actif ou inactif, et « Supprimer », qui
demande confirmation.

Supprimer retire du personnage le mod et son code, rien de plus : son coffre de
données reste rangé sous son identifiant, et l'accord donné à ce code sur ce
navigateur reste lui aussi. Le dialogue de confirmation le dit avant de trancher.

### Le code voyage avec le personnage

Le code d'un mod est rangé dans le personnage, au même titre que ses
caractéristiques. Il part dans l'export JSON, dans la bibliothèque du site et
dans les Attributes Roll20. Ouvrir la fiche d'un autre joueur, c'est donc
rencontrer le code qu'il porte, MJ compris.

### Le consentement, navigateur par navigateur

Un mod ne tourne pas tant qu'il n'a pas été autorisé sur ce navigateur.

| Règle | Détail |
| --- | --- |
| Empreinte | chaque mod porte une empreinte calculée sur son identifiant et son code. Deux mods identiques ont la même empreinte. |
| Registre des avis | les réponses tiennent dans le stockage local du navigateur, sous la clé `jjk.mods.avis`. Elles ne partent jamais dans le personnage ni dans les Attributes : autoriser un mod chez soi n'autorise personne d'autre. |
| Sans avis, rien ne tourne | un mod dont l'empreinte n'a pas de réponse est en attente, et son code n'est pas exécuté. |
| Un mod modifié redemande | changer une ligne de code change l'empreinte : la question est reposée à tous ceux qui n'ont pas écrit cette version. |
| Ce qu'on écrit soi-même | un mod tapé dans le bloc Mods est autorisé d'office, puisqu'il vient d'être écrit. Le modifier vaut de même, dès que le code change ; ouvrir l'éditeur et le refermer sans rien toucher ne décide de rien. |
| Stockage indisponible | en navigation privée stricte, les réponses tiennent pour la session seulement, et la fiche ne s'en trouve pas gênée. |

Quand un personnage porte des mods en attente, la fiche pose un bandeau sous la
barre d'outils. « Examiner » ouvre la liste : pour chaque mod, son nom, son
identifiant, son code en lecture seule, et les deux boutons « Autoriser » et
« Refuser ». « Tout refuser » répond non à l'ensemble. La fiche s'ouvre dans
tous les cas : un mod en attente ne bloque rien.

### Les états d'un mod

| État | Ce qu'il dit |
| --- | --- |
| ok | le mod a tourné. |
| attente | il n'a pas encore reçu de réponse sur ce navigateur. |
| refuse | la réponse a été non. |
| coupe | son interrupteur est sur inactif. |
| recent | sa release minimale dépasse celle de la fiche, ou son schéma minimal dépasse le sien. |
| panne | son code a levé une erreur ; le message est affiché. Le mod n'est pas coupé pour autant, le montage suivant le retente. |

`Jjk.mods()` rend la même chose au code : une copie du bilan du dernier passage
du moteur, avec l'identifiant, le nom, l'interrupteur, l'état et l'empreinte de
chaque mod. Elle est vide tant que le moteur n'a pas tourné.

## Ranger la fiche sans écrire de code

Le bloc « Modules » liste tous les modules, groupés par onglet, dans l'ordre où
ils se montent. Les modules livrés avec la fiche et les mods y sont traités de
la même façon.

| Geste | Effet |
| --- | --- |
| La puce « Affiché » | le module disparaît de la fiche ou y revient. Rien n'est perdu : un module coupé garde ses données, il ne s'affiche plus. |
| Les flèches | le module monte ou descend dans sa colonne. |
| Le menu de colonne | il apparaît quand l'onglet a plusieurs colonnes, et déplace le module de l'une à l'autre. |
| « Disposition d'origine » | efface le rangement enregistré : chaque module retrouve son onglet, sa colonne et son rang d'origine. Il ne touche pas aux interrupteurs, et les modules coupés le restent : ils se rallument un par un, par leur puce. |

Un module en panne ou muselé porte la mention et son message sur sa ligne, et un
module qui ne rend rien porte la mention « n'affiche rien ». Un module dont
l'onglet est inconnu se range à part, sous « Onglet inconnu » : il ne s'affiche
nulle part, mais sa ligne reste, pour pouvoir le couper. Le bloc « Modules » n'a
pas de puce à lui : il ne peut pas se couper lui-même, sans quoi plus rien ne
pourrait être rallumé.

Ce rangement est une donnée du personnage : il voyage avec lui, dans l'export
JSON comme dans les Attributes Roll20, et chaque personnage a le sien. Deux
personnages peuvent donc porter les mêmes mods rangés autrement. La place
enregistrée retient l'onglet et la colonne ; l'interface propose la colonne, le
changement d'onglet se déclare dans le code du mod.

## Son premier mod

Options, puis « Mods », puis « Ajouter un mod ». Coller ceci, valider :

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "mon-premier-mod",
  titre: "Bonjour",
  onglet: "fiche",
  colonne: "droite",
  build: function (ctx) {
    var b = ctx.bloc("Bonjour");
    b.appendChild(ctx.el("p", null, (ctx.state.name || "Ce personnage") + " se porte bien."));
    return b;
  }
});
```

</div>

Un bloc « Bonjour » apparaît dans la colonne de droite de l'onglet Fiche.
Quatre règles tiennent dans cet exemple :

| Règle | Détail |
| --- | --- |
| Le code d'un mod reçoit `Jjk` | c'est l'objet public de la fiche. Il reçoit aussi un `ctx` à lui, qui porte `id` et `nom`, les deux renseignements sur le mod en cours, puis `version` et `schema`, les deux numéros de la fiche qui l'exécute. À ne pas confondre avec le `ctx` de `build`, qui est celui d'un module. |
| `build` rend un élément | il ne l'accroche pas lui-même. La fiche le pose où le rangement des modules dit de le poser. |
| Un `id` unique | c'est la clé du module dans la liste, et celle de son coffre de données. Deux modules qui partagent un `id` partagent tout : le second remplace le premier, à sa place. |
| Le code est en ES5 | la fiche tourne dans une iframe Roll20 : `var`, `function`, pas de flèche, pas de `let`, pas de gabarit de chaîne. |

## Le module, en entier

`Jjk.enregistre` prend un seul objet.

| Clé | Valeur |
| --- | --- |
| `id` | chaîne, obligatoire. L'identifiant du module. |
| `titre` | chaîne. Le nom affiché dans le bloc Modules. |
| `onglet` | `"fiche"`, `"art"`, `"equipement"`, `"bio"` ou `"options"`. |
| `colonne` | une colonne de cet onglet, par son nom (table ci-dessous). Place de départ : le rangement des modules a le dernier mot. |
| `build` | fonction. Reçoit `ctx`, rend un élément. |
| `pour` | fonction facultative, sans argument : le module n'existe que si elle rend vrai, et une erreur levée vaut faux. À ne pas confondre avec le champ `pour` d'un mod, qui est une release minimale. |

Les colonnes portent des noms, et non des numéros :

| Onglet | Colonnes |
| --- | --- |
| `fiche` | `gauche`, `milieu`, `droite` |
| `art` | `seule` (une seule colonne, toute la largeur) |
| `equipement` | `gauche`, `droite`, `bas` (`bas` court sous les deux colonnes) |
| `bio` | `gauche`, `droite` |
| `options` | `gauche`, `droite` |

Un onglet ou une colonne que la fiche ne connaît pas ne fait rien tomber : le
module est simplement laissé de côté, et rien ne s'affiche. Sa ligne, elle,
reste dans le bloc Modules : elle suffit à le couper, et à lui rendre une
colonne connue quand c'est la colonne qui manque.

## Le contexte, en entier

`build` reçoit un seul argument, `ctx`. C'est tout ce qu'un module touche,
natif comme mod, et c'est le contrat public de la fiche 3.

### Identité

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.id` | l'identifiant du module, tel qu'il s'est enregistré. |
| `ctx.version` | la release de la fiche qui l'exécute, telle qu'elle est publiée, suffixe de chantier compris, et qui se compare [nombre par nombre](#versions). |

### Données

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.state` | l'état du personnage, l'objet vivant. |
| `ctx.data` | le jeu de données des règles chargé par la fiche : compétences, armes, avantages, stades. En lecture. |
| `ctx.donnees.get()` | le coffre privé du module : son objet à lui, rangé dans le personnage sous son identifiant. Un objet vide tant que rien n'a été rangé sous cet identifiant. |
| `ctx.donnees.set(o)` | remplace ce coffre. `null` le vide ; ce qui n'est pas un objet est refusé, comme un objet circulaire : l'erreur part au module, jamais à la sauvegarde du personnage. |

### Structure

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.bloc(titre)` | un bloc de fiche, cadre et titre, prêt à recevoir des enfants. |
| `ctx.bloc(titre, { edition: true })` | le même, avec le rouage qui bascule `ctx.edition()`. À ne demander que si le module s'en sert : un rouage qui ne change rien de visible est un bouton qui ment. |
| `ctx.el(tag, classe, texte)` | un élément nu. `classe` et `texte` acceptent `null`. Un module qui ne veut pas de rouage rend son propre élément. |
| `ctx.fld(libelle, champ)` | une ligne « libellé + champ », alignée sur celles de la fiche. |

### Cycle

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.surRafraichissement(fn)` | inscrit `fn` au registre du module : elle est rappelée chaque fois que les valeurs affichées doivent se remettre à jour. |
| `ctx.rafraichir()` | enregistre le personnage, puis rejoue tous ces registres. Les valeurs changent, les éléments restent. |
| `ctx.enregistrer()` | écrit le personnage sans rafraîchir : bibliothèque du site, Attributes Roll20. |
| `ctx.reconstruire()` | rebâtit la fiche entière et rappelle `build`. Cher : à réserver aux changements de structure. |
| `ctx.edition()` | vrai quand le rouage du module est ouvert. Les gestes de construction (ajouter, supprimer, forcer une valeur) ne s'offrent qu'à ce moment. |

### Briques

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.texte(lire, ecrire, indication)` | champ texte relié à une donnée. Il rafraîchit à chaque frappe. |
| `ctx.bouton(libelle, infobulle, action)` | bouton de la fiche. |
| `ctx.pas(lire, ecrire, pas)` | compteur « − valeur + », champ du milieu éditable. Il rafraîchit à chaque clic. |
| `ctx.tuile(libelle, valeur, action)` | grande tuile chiffrée ; `valeur` est une fonction, rappelée à chaque rafraîchissement, et `action` est facultative. |
| `ctx.ligneComp(carac, nom)` | ligne de compétence complète : pastille de caractéristique, stade, total, jet. |
| `ctx.filtre(libelle, lire, ecrire)` | puce de filtre, comme celles des modules Armes et Compétences. Sans rapport avec les filtres de calcul, plus bas. |
| `ctx.dialogue(titre, corps, valider)` | fenêtre modale. `corps` est un élément ; `valider` est appelée au clic sur Valider, et garder le dialogue ouvert se dit en rendant `false`. Rend un objet qui porte `fermer()`. C'est le seul moyen de poser une question : `prompt()` et `confirm()` ne fonctionnent pas dans la fiche, qui vit dans une iframe d'un autre site. |
| `ctx.message(texte)` | bandeau passager, en bas de la fiche. |

### Sorties

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.jet(libelle, valeur)` | lance le dé de la fiche avec cette valeur et envoie le résultat au tchat. Jet de test : le critique s'applique. |
| `ctx.auTchat(titre, champs)` | envoie une carte : un titre, puis une liste de paires `[cle, valeur]`. Les valeurs vides sont ignorées. |
| `ctx.boutonTchat(libelle, titre, champs)` | le bouton qui fait ce qui précède. `champs` accepte une fonction, évaluée au clic. |

### Calculs

Toutes ces valeurs sont dérivées, donc en lecture seule : les écrire n'aurait
pas de sens, elles se recalculent à chaque affichage. Pour les infléchir, il y a
les filtres.

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.calculs.caracTotal(nom)` | le total d'une caractéristique : `"Body"`, `"Mind"`, `"Prestance"`. C'est la caractéristique nue, sans le malus de poids, celle dont sortent les PV et la régénération. |
| `ctx.calculs.compValue(carac, comp, cle)` | le total d'une compétence, modificateurs, total forcé et malus de poids compris. `comp` est l'objet de compétence du personnage, `cle` la clé qui le désigne, de la forme `"Body/Initiative"`. |
| `ctx.calculs.pvMax()` | les PV maximum, valeur forcée comprise. |
| `ctx.calculs.pvCourant()` | les PV du moment. |
| `ctx.calculs.initiative()` | l'initiative, malus de poids déduit. |
| `ctx.calculs.vitesse()` | la vitesse, unité comprise : une chaîne, par exemple `"10.5 m"`. |
| `ctx.calculs.regen()` | la régénération. |
| `ctx.calculs.poidsPorte()` | le poids porté. |
| `ctx.calculs.poidsMalus()` | le malus que ce poids inflige, arrondi à la dizaine inférieure. |

<div class="mods-code" markdown>

```
var cle = "Body/Initiative";
var v = ctx.calculs.compValue("Body", ctx.state.comps[cle], cle);
```

</div>

### Filtres de calcul

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.filtreCalcul(nom, fn)` | inscrit un filtre sur un calcul de la fiche, au nom du module. Même chose que `Jjk.filtre`, section suivante. |

### Mise en forme

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.fmt.signe(n)` | `"+2"`, `"−3"` : le moins de la fiche, pas celui du clavier. |
| `ctx.fmt.nombre(n)` | arrondi au centième, sans zéro inutile. |
| `ctx.champs` | les libellés officiels des données du personnage (`ctx.champs.pv`, `ctx.champs.initiative`, `ctx.champs.vitesse`…). Les reprendre, pour qu'un mod nomme les choses comme le reste de la fiche. |
| `ctx.abbr(carac)` | la pastille courte d'une caractéristique : `BODY`, `MIND`, `PRES`. |

## Filtrer un calcul

`Jjk.filtre(nom, fn)` glisse une fonction dans un calcul de la fiche. Le calcul
fait son travail, puis passe sa valeur aux filtres inscrits, chacun recevant ce
que le précédent a rendu.

<div class="mods-code" markdown>

```
// un mod qui donne 10 PV de plus, quelle que soit la source du calcul
Jjk.filtre("pvMax", function (valeur, infos) {
  return valeur + 10;
});

// un mod qui ne touche qu'une caractéristique
Jjk.filtre("caracTotal", function (valeur, infos) {
  return infos.carac === "Body" ? valeur + 5 : valeur;
});
```

</div>

Dix calculs se filtrent. La valeur est toujours un nombre, et le filtre doit
en rendre un.

| Nom | Valeur filtrée | Deuxième argument |
| --- | --- | --- |
| `caracTotal` | le total d'une caractéristique | `{ carac }`, l'un des trois noms : Body, Mind, Prestance |
| `compValue` | le total d'une compétence | `{ carac, cle, comp }` |
| `compXp` | le coût en xp d'une compétence | `{ cle, comp }` |
| `pvMax` | les PV maximum | `{}` |
| `initiative` | l'initiative | `{}` |
| `vitesse` | la vitesse en mètres, avant que l'unité ne s'y ajoute | `{}` |
| `regen` | la régénération | `{}` |
| `poidsPorte` | le poids porté | `{}` |
| `poidsMalus` | le malus de poids, une fois le poids porté arrondi à la dizaine inférieure | `{}` |
| `xpDepense` | l'xp dépensé | `{}` |

Depuis un module, `ctx.filtreCalcul` fait la même chose, le propriétaire étant
déjà connu :

<div class="mods-code" markdown>

```
build: function (ctx) {
  ctx.filtreCalcul("poidsPorte", function (valeur, infos) {
    return Math.max(0, valeur - 3);
  });
  return ctx.bloc("Sac allégé");
}
```

</div>

Les règles de sûreté, qui valent pour les deux :

| Règle | Détail |
| --- | --- |
| Ordre | les filtres tournent dans l'ordre où ils se sont inscrits. |
| Nom inconnu | un filtre inscrit sous un autre nom que ces dix-là n'est jamais appelé, et le journal du navigateur le dit dès l'inscription. |
| Récursion | pendant la passe d'un filtre, tout appel au même calcul rend la valeur brute, sans repasser par les filtres. Un filtre peut donc lire `ctx.calculs` sans figer la fiche. |
| Résultat invalide | un filtre qui jette, ou qui rend autre chose qu'un nombre fini, est ignoré pour cette passe : la valeur précédente passe, et une faute est comptée. |
| Cinq fautes | cinq fautes consécutives et le filtre est retiré. Le journal reçoit `[mod:<id>] filtre <nom> retiré : <message>`, et `Jjk.etat(id).erreur` porte le message. Une passe sans faute remet le compteur à zéro. |
| Remise à zéro | le registre des filtres est vidé à chaque montage : les mods et les modules le repeuplent. Un filtre posé hors montage, depuis un bouton ou depuis la console, est reposé au montage suivant ; celui d'un mod cesse de l'être dès que ce mod est coupé, refusé ou supprimé. |

## L'objet Jjk

| Membre | Ce qu'il fait |
| --- | --- |
| `Jjk.version` | la release de la fiche, en trois nombres, suivie du `b` du site de chantier le cas échéant : `"3.6.0"`, `"3.6.0b"`. À comparer par ses nombres, jamais comme une chaîne. |
| `Jjk.schema` | le numéro de schéma de l'état, un entier, `3` aujourd'hui. Il ne se déduit pas de `Jjk.version` : un mod qui en tirerait le schéma par le premier nombre se tromperait le jour où les deux divergeront. |
| `Jjk.enregistre(module)` | déclare un module, ou remplace celui qui porte le même `id`, à sa place. Rend le module. |
| `Jjk.ordonne(ids)` | ordre partiel : les identifiants cités passent devant, dans l'ordre donné, les autres suivent à leur rang de déclaration. Un identifiant inconnu ne casse rien. |
| `Jjk.liste()` | une copie de la liste des modules : `id`, `titre`, `onglet`, `colonne`, `actif`. |
| `Jjk.actif(id)` | vrai tant que le module n'est pas coupé. |
| `Jjk.active(id, oui)` | coupe ou rallume un module, et enregistre. |
| `Jjk.etat(id)` | l'état d'un module : `echecs`, `musele`, `erreur`, `panne`, `vide`, `actif`. |
| `Jjk.remonte()` | rebâtit la fiche entière. |
| `Jjk.filtre(nom, fn)` | inscrit un filtre de calcul. |
| `Jjk.mods()` | une copie de la liste des mods : `id`, `nom`, `actif`, `etat`, `empreinte`. |

Appelés depuis la console du navigateur, hors de tout montage, `Jjk.enregistre`
et `Jjk.filtre` restent valides : ils prennent effet au montage suivant, que
`Jjk.remonte()` déclenche, et à tous ceux d'après. Ce qu'un mod inscrit ainsi,
depuis un bouton par exemple, cesse d'être rejoué dès que ce mod est coupé,
refusé ou supprimé.

`window.__jjkModules` est l'ancien nom du même objet. Il reste en place pour ce
qui a été écrit avant ; un mod neuf s'écrit contre `Jjk`.

## Lire et écrire les données du personnage

`ctx.state` est l'état vivant du personnage, pas une copie : ce qu'un mod y
écrit est bel et bien écrit, et part dans Roll20 au premier enregistrement. La
règle est donc de tenue, pas de barrière : ce qui appartient au personnage
appartient aux modules qui l'affichent, un mod ne le corrige pas dans leur dos.

Un mod range ses données à lui dans son coffre, un objet libre attaché à son
`id`.

<div class="mods-code" markdown>

```
var d = ctx.donnees.get();          // {} tant que rien n'y a été rangé
d.balles = (d.balles || 0) - 1;     // du code : le moins du clavier
ctx.donnees.set(d);                 // remplace le coffre
ctx.enregistrer();                  // et l'écrit dans le personnage
```

</div>

Ce coffre suit le personnage partout où il va : bibliothèque du site, export
JSON, Attributes Roll20. Il ne contient que ce qu'on y met, et il est rangé sous
l'identifiant du module, non dans le mod : supprimer le mod emporte son code,
jamais son coffre. Un mod qui reprend plus tard le même identifiant y retrouve
donc ce qui y avait été rangé, et deux modules qui partagent un identifiant
partagent aussi ce coffre. Un mod qui veut repartir de zéro le vide lui-même,
par `ctx.donnees.set({})`.

<div class="mods-note" markdown>

`ctx.donnees.set` remplace : il ne fusionne pas. Lire, modifier l'objet lu,
réécrire, comme ci-dessus. `ctx.rafraichir()` enregistre déjà, et les briques
qui rafraîchissent d'elles-mêmes (`ctx.texte`, `ctx.pas`) enregistrent donc
aussi : `ctx.enregistrer()` ne se rajoute qu'après un geste qui ne rafraîchit
rien.

</div>

`ctx.data` donne les listes des règles pour construire des menus : les noms de
compétences, les armes, les avantages. La fiche ne contient aucune règle et un
mod ne doit pas en réintroduire : afficher un nom d'arme est légitime, recopier
un seuil ou une table dans un bloc ne l'est pas.

## Parler au tchat Roll20

Trois sorties, toutes adressées au destinataire fixé dans la barre d'envoi :
publique, au MJ, à un joueur. Un mod ne choisit pas le destinataire, c'est le
joueur qui l'a fixé, et le mod n'y touche pas. Le modificateur demandé au lancer
ne vaut que pour `ctx.jet`, comme pour les jets de test de la fiche : une carte
part sans lui.

<div class="mods-code" markdown>

```
// un jet : dé de la fiche + valeur, critiques compris
ctx.jet("Initiative", ctx.calculs.initiative());

// une carte : un titre, des paires
ctx.auTchat("Munitions", [
  ["Restantes", "12"],
  ["Chargeur", "Glock 17"]
]);

// le bouton qui envoie la carte, champs recalculés au clic
b.appendChild(ctx.boutonTchat("Annoncer", "Munitions", function () {
  return [["Restantes", String(ctx.donnees.get().balles || 0)]];
}));
```

</div>

Hors de Roll20, sur le site, ces trois sorties ne partent nulle part : le jet se
résout sur place et s'affiche dans un bandeau, la carte s'y affiche aussi. Un
mod n'a donc pas à savoir où il tourne.

## Quatre mods complets

### Une tuile de PV

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "pv-en-grand",
  titre: "PV en grand",
  onglet: "fiche",
  colonne: "milieu",
  build: function (ctx) {
    var b = ctx.bloc("Vitalité");
    b.appendChild(ctx.tuile("PV", function () {
      return ctx.calculs.pvCourant() + " / " + ctx.calculs.pvMax();
    }));
    return b;
  }
});
```

</div>

La tuile se remet à jour toute seule : sa valeur est une fonction, que la fiche
rappelle à chaque rafraîchissement.

### Un compteur de munitions

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "munitions",
  titre: "Munitions",
  onglet: "equipement",
  colonne: "droite",
  build: function (ctx) {
    var b = ctx.bloc("Munitions");
    function lire() { return ctx.donnees.get().balles || 0; }
    function ecrire(n) {
      var d = ctx.donnees.get();
      d.balles = Math.max(0, n);
      ctx.donnees.set(d);
    }
    b.appendChild(ctx.fld("Dans le chargeur", ctx.pas(lire, ecrire, 1)));
    b.appendChild(ctx.bouton("Recharger", "Remettre le chargeur au plein", function () {
      ecrire(17);
      ctx.rafraichir();
    }));
    return b;
  }
});
```

</div>

`ctx.pas` rafraîchit après chaque clic, et rafraîchir enregistre ; le bouton,
lui, change la donnée sans passer par un champ : il lui faut donc
`ctx.rafraichir()` pour que l'affichage suive.

### Un bouton d'initiative au tchat

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "init-tchat",
  titre: "Initiative au tchat",
  onglet: "fiche",
  colonne: "milieu",
  build: function (ctx) {
    var b = ctx.bloc("Initiative");
    b.appendChild(ctx.bouton("Jeter", "Initiative au tchat", function () {
      ctx.jet("Initiative", ctx.calculs.initiative());
    }));
    b.appendChild(ctx.boutonTchat("Annoncer", "Initiative", function () {
      return [["Valeur", ctx.fmt.nombre(ctx.calculs.initiative())]];
    }));
    return b;
  }
});
```

</div>

### Remplacer un module natif

Un mod qui reprend l'`id` d'un module natif prend sa place : même onglet, même
colonne, même rang. Le natif ne s'exécute plus.

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "initiative",
  titre: "Initiative",
  onglet: "fiche",
  colonne: "milieu",
  build: function (ctx) {
    return ctx.el("p", null, "Initiative : " + ctx.fmt.nombre(ctx.calculs.initiative()));
  }
});
```

</div>

L'identifiant d'un module natif se lit dans la fiche elle-même : son bloc porte
l'attribut `data-module`. `Jjk.liste()` les donne tous. Supprimer le mod rend sa
place au module natif, intact.

<div class="mods-note" markdown>

Remplacer un natif, c'est en assumer tout le travail : ses jets, ses
modificateurs, son mode édition. Ajouter un bloc à côté coûte presque toujours
moins cher que réécrire celui qui existe, et un filtre de calcul suffit souvent
là où on croyait devoir tout reprendre.

</div>

## Versions

La fiche porte deux numéros, qui ne se déduisent pas l'un de l'autre.

`Jjk.version` est la release : trois nombres, `X.Y.Z`, chacun de 0 à 999, et
au-delà de 999 le nombre repart à 0 en faisant monter celui de sa gauche. Le
premier monte pour une fonctionnalité entière, le deuxième pour un module ou la
correction d'une grosse erreur, le troisième pour un détail d'affichage ou une
erreur mineure. Ce troisième nombre ne change jamais la forme des données du
personnage : c'est ce qui permet à un personnage écrit sur `3.6.0` de s'ouvrir
sur `3.6.4` sans que la fiche pose de question.

`Jjk.schema` est le numéro de schéma de l'état, un entier séparé. Il ne monte
que lorsque la forme des données du personnage change, et il est le seul à
compter pour la compatibilité des données. Il ne suit pas le premier nombre de
la release : le jour où l'un des deux montera sans l'autre, un mod qui aurait
lu le schéma dans `parseInt(Jjk.version)` lira un nombre qui ne veut rien dire.
Le schéma se demande à `Jjk.schema`, et à lui seul.

Les releases se comparent nombre par nombre, jamais comme des chaînes :
`"3.10.0"` vient après `"3.9.0"`, alors que la comparaison de texte prétendrait
l'inverse.

### Le suffixe du site de chantier

Le site de chantier ajoute un `b` collé au dernier nombre, `"3.6.0b"`. Le site
public ne le porte jamais : il est là pour qu'un joueur voie sur quel site il
est.

Ce suffixe se lit, il ne se compte pas. `"3.6.0b"` et `"3.6.0"` sont de même
rang, parce que le chantier est ce que le site public recevra à la fusion. Un
mod déclaré `pour: "3.6.0"` tourne donc sur le chantier `3.6.0b`, et un mod
déclaré `pour: "3.6.0b"` tourne sur le site public `3.6.0`. Un personnage
enregistré sur l'un ne passe jamais pour plus récent que l'autre.

Un mod qui compare des numéros lui-même retire donc ce `b` avant de lire les
nombres. Le plus simple reste de ne pas comparer du tout : le champ `pour` le
fait déjà, et la fiche trop ancienne écarte le mod d'elle-même.

### Ce qu'un mod peut exiger

| Champ | Ce qu'il déclare |
| --- | --- |
| `pour` | la release minimale de la fiche, en trois nombres, le `b` du chantier accepté : `"3.6.0"`, `"3.6.0b"`. Facultatif, et proposé dans le dialogue d'ajout, qui refuse ce qui n'est pas un numéro de version. Arrivé illisible par un import, il est gardé tel quel et ne bloque rien. |
| `apiMin` | le schéma minimal de l'état, un entier. Il vise le schéma seul, jamais la release : `Jjk.schema` vaut 3 ici. Facultatif ; il ne se règle pas dans le dialogue, il arrive avec un mod importé dans le personnage. |

Un mod dont la release minimale dépasse celle de la fiche, ou dont le schéma
minimal dépasse le sien, ne tourne pas : son état est « trop récent ». Il n'est
ni effacé ni modifié, sa ligne reste dans le bloc Mods et son coffre l'attend.
Le message de sa ligne donne le numéro de la fiche tel quel, suffixe compris, là
où la comparaison, elle, ignore ce suffixe. Le cas se rencontre en ouvrant, sur
une fiche ancienne, un personnage réglé sur une fiche plus neuve.

Les noms décrits sur cette page sont figés : ce sont le contrat public de la
fiche 3, celle que dit le premier nombre de `Jjk.version`, et un mod écrit
contre eux traverse les mises à jour de la lignée sans être retouché.

## Quand ça casse

Un mod est du code écrit par un joueur : il finira par casser. La fiche est
faite pour que cela reste sans conséquence.

| Panne | Ce que fait la fiche |
| --- | --- |
| Le code du mod jette, ou ne s'analyse même pas | le mod passe en panne avec son message, sur sa ligne du bloc Mods. Il n'est pas coupé : le montage suivant le retente. Les autres mods tournent. |
| `build` lève une erreur | le bloc du module est remplacé par un cadre qui donne son identifiant et le message, avec « Réessayer » et « Désactiver ». Le bloc « Modules » n'a que « Réessayer » : le désactiver retirerait le seul endroit d'où l'on rallume un module. Le reste de la fiche se monte normalement. |
| `build` ne rend rien, ou rend autre chose qu'un élément | rien ne s'affiche, et `Jjk.etat(id).vide` passe à vrai. Ce n'est pas une erreur : un module a le droit de s'effacer. |
| Une fonction de rafraîchissement jette cinq fois de suite | le module est muselé : son bloc reste, avec les valeurs du dernier rafraîchissement réussi, il est marqué et cesse d'être rappelé. Une passe réussie remet le compteur à zéro. |
| Un filtre jette ou rend autre chose qu'un nombre fini | la valeur passe sans lui, et cinq fautes consécutives le retirent. |

Le journal du navigateur (F12, onglet Console) reçoit les pannes, préfixées de
l'identifiant du mod ou du module, par exemple `[mod:munitions]` : un mod dont
le code ne s'analyse pas ou qui jette, une erreur levée par `build`, un module
muselé, un filtre retiré au bout de cinq fautes, un filtre inscrit sous un nom
que la fiche ne connaît pas. Deux messages ne nomment personne : `[mods]` quand
le moteur de mods tombe lui-même, `[fiche]` quand le montage échoue ou qu'un mod
redemande un remontage sans fin.

Le reste ne s'y trouve pas, et se lit sur la ligne du mod ou du module, dans
l'onglet Options : une faute isolée de filtre, un module qui ne rend rien, et un
mod qui ne tourne pas parce qu'il attend une réponse, qu'il a été refusé, coupé,
ou qu'il est trop récent.

Pour reprendre la main, dans l'ordre du plus doux au plus net : couper le module
depuis le bloc Modules ou depuis le bouton « Désactiver » du cadre d'erreur,
refuser le mod depuis le bloc Mods, ou le supprimer.

Le vrai garde-fou reste le consentement : un mod qui n'a pas été autorisé sur ce
navigateur ne tourne pas du tout. Effacer la clé `jjk.mods.avis` du stockage
local efface les réponses enregistrées, et plus aucun de ces mods ne tourne tant
qu'il n'est pas autorisé à nouveau, y compris dans une page restée ouverte : le
stockage fait foi, et une réponse effacée est une réponse retirée. C'est ce qui
permet de révoquer un mod depuis un autre onglet et d'être suivi partout.

Quand le stockage est indisponible, en navigation privée stricte par exemple,
les réponses tiennent en mémoire pour la durée de la page, le temps que la
séance se finisse. Elles repartent à zéro au rechargement.

## Ce qu'un mod peut atteindre

Un mod vit dans le personnage. Il voyage avec lui : dans l'export JSON, dans le
personnage Roll20, dans la fiche qu'un joueur envoie à un autre. Et il ne
s'exécute pas que chez celui qui l'a écrit : tout le monde à la table l'exécute
en ouvrant cette fiche, pour peu qu'il ait répondu oui.

Il n'y a pas de bac à sable. Un mod tourne dans la page de la fiche, avec les
droits de la fiche :

| Il atteint | Ce que cela veut dire |
| --- | --- |
| La fiche ouverte | lire et écrire n'importe quelle donnée du personnage, y compris celles qu'aucun module n'affiche. |
| Les personnages du navigateur | sur le site, la bibliothèque tient dans le stockage local de la page : un mod la lit et l'écrit en entier, pas seulement le personnage ouvert. |
| Le réseau | la page peut appeler n'importe quel serveur : tout ce qu'un mod lit, il peut l'envoyer ailleurs, sans que rien ne s'affiche. |
| La page | le mod tourne dans le même document que la fiche : il peut la modifier, la remplacer, ou en imiter une. |

Ce qui le borne n'est pas la fiche : c'est le pont qui la relie à Roll20, et ce
pont ne fait confiance à rien de ce qui vient d'elle.

| Verrou | Ce qu'il laisse passer |
| --- | --- |
| Écriture | les seuls attributs `jjk_`. Un autre nom est refusé en silence : les attributs natifs du personnage, barres de jetons et macros comprises, restent hors d'atteinte. |
| Personnage | une fiche n'écrit que dans le personnage qu'elle affiche. Toute écriture demandée pour un autre personnage est refusée, même par le MJ qui a ouvert la sienne. |
| Tchat | les seules commandes que la fiche compose : un chuchotement facultatif, puis une carte de gabarit, sur une seule ligne. Une commande d'API, une autre commande à barre oblique ou du texte libre sont ignorés en silence. |

Cette barrière protège la table Roll20. Elle ne protège ni le personnage, ni le
navigateur, ni le reste de la page, et la page Roll20 elle-même n'est hors
d'atteinte que parce qu'elle est d'une autre origine que la fiche.

Trois habitudes valent toutes les protections :

| Habitude | Pourquoi |
| --- | --- |
| Lire le code avant de répondre oui | le bandeau de consentement le montre en entier, et un mod tient en quelques dizaines de lignes. Un mod qu'on ne peut pas lire est un mod qu'on n'autorise pas. |
| N'autoriser que ce qui vient de quelqu'un de connu | un fichier de personnage reçu d'un inconnu est du code exécutable, pas une feuille de papier. |
| Le MJ décide | une table peut demander que personne n'autorise rien. Le bandeau dit qui porte des mods, et « Tout refuser » suffit à s'en tenir là. |
