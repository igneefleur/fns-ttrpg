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

<div class="mods-note" markdown>
**Où en est cette page.** Elle décrit le système de mods tel qu'il est arrêté,
et elle fait foi : c'est sur elle que l'implémentation se règle. Le moteur qui
exécute les mods, lui, n'est pas encore en ligne. Ce qui suit est donc à lire
comme une référence, pas encore comme un mode d'emploi : les exemples sont
justes, mais l'atelier qui les fait tourner arrive avec une version
ultérieure. Cette page est publiée sur le site de chantier pour que le format
soit discuté avant d'être figé, pas après.
</div>

## Ce qu'est un mod

Un mod est un module de fiche écrit par un joueur : quelques lignes de
JavaScript qui rendent un bloc, posé dans l'onglet et la colonne de son choix,
à côté des modules livrés avec la fiche. Il s'enregistre dans le personnage,
se range dans la liste des modules comme n'importe quel autre module, et la
fiche l'exécute à chaque ouverture. Rien ne se compile et rien ne s'installe :
le code est du texte, collé dans le personnage, exécuté tel quel.

## Ranger sa fiche sans écrire une ligne de code

L'onglet Options porte la liste « Modules ». Chaque module de la fiche y a sa
ligne, les natifs comme les mods, avec son onglet, sa colonne, un interrupteur
et deux flèches.

| Geste | Effet |
| --- | --- |
| L'interrupteur | le module disparaît de la fiche ou y revient. Rien n'est perdu : un module caché garde ses données, il ne s'affiche plus. |
| Les flèches | le module monte ou descend dans sa colonne. L'ordre affiché est celui de la liste. |
| L'onglet et la colonne | deux menus : le module change de place sans toucher à son code. Le mod qui se déclarait en colonne 2 obéit désormais à la liste. |

Ce rangement est une donnée du personnage : il voyage avec lui, dans l'export
JSON comme dans les Attributes Roll20, et chaque personnage a le sien. Deux
personnages peuvent donc porter les mêmes mods rangés autrement.

Le bouton « Ajouter un mod » de cette même liste ouvre une zone de texte : on y
colle le code d'un mod, on valide, il apparaît dans la liste. « Retirer »
l'efface, lui et son coffre de données.

## Son premier mod

Options, puis « Modules », puis « Ajouter un mod ». Coller ceci, valider :

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "mon-premier-mod",
  titre: "Bonjour",
  onglet: "fiche", colonne: 3, pour: "3.x",
  build: function (ctx) {
    var b = ctx.bloc("Bonjour");
    b.appendChild(ctx.el("p", null, ctx.state.name + " se porte bien."));
    return b;
  }
});
```

</div>

Un bloc « Bonjour » apparaît en troisième colonne de l'onglet Fiche. Trois
règles tiennent dans cet exemple :

| Règle | Détail |
| --- | --- |
| `build` rend un élément | il ne l'accroche pas lui-même. La fiche le pose où la liste des modules dit de le poser. |
| Un seul appel par mod | `Jjk.enregistre` se déclare une fois. Un second appel avec le même `id` remplace le premier. |
| `id` unique | c'est la clé du module dans la liste, et celle de son coffre de données. Deux mods qui partagent un `id` partagent tout. |

## Le contexte, en entier

`Jjk.enregistre` prend un seul objet.

| Clé | Valeur |
| --- | --- |
| `id` | chaîne, obligatoire. L'identifiant du module. |
| `titre` | chaîne. Le nom affiché dans la liste des modules. |
| `onglet` | `"fiche"`, `"art"`, `"equipement"`, `"bio"` ou `"options"`. |
| `colonne` | `1`, `2` ou `3`. Place de départ ; la liste des modules a le dernier mot. |
| `pour` | la version de fiche pour laquelle le mod est écrit, par exemple `"3.x"`. |
| `build` | fonction. Reçoit `ctx`, rend un élément. |

`build` reçoit un seul argument, `ctx`. C'est tout ce qu'un mod peut toucher,
et c'est un contrat : ce qui suit ne changera pas sans changer le numéro majeur
de la fiche.

### Identité

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.id` | l'identifiant du mod, tel qu'il s'est enregistré. |
| `ctx.version` | la version de la fiche qui l'exécute, par exemple `"3.0.0"`. |

### Données

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.state` | l'état du personnage, en lecture. |
| `ctx.data` | les listes des règles (compétences, armes, avantages), en lecture. |
| `ctx.donnees.get()` | le coffre privé du mod : son objet à lui, vide au premier appel. |
| `ctx.donnees.set(o)` | remplace ce coffre. |

### Structure

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.bloc(titre)` | un bloc de fiche, cadre et titre compris, prêt à recevoir des enfants. |
| `ctx.el(tag, classe, texte)` | un élément nu. `classe` et `texte` acceptent `null`. |
| `ctx.fld(libelle, champ)` | une ligne « libellé + champ », alignée sur celles de la fiche. |

### Cycle

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.surRafraichissement(fn)` | inscrit `fn` au registre de rafraîchissement : elle est rappelée chaque fois que les valeurs affichées doivent se remettre à jour. |
| `ctx.rafraichir()` | déclenche ce rafraîchissement. Les valeurs changent, les éléments restent. |
| `ctx.enregistrer()` | écrit le personnage : bibliothèque du site, Attributes Roll20. |
| `ctx.reconstruire()` | rebâtit la fiche entière et rappelle `build`. Cher : à réserver aux changements de structure. |
| `ctx.edition()` | vrai quand le rouage du module est ouvert. Les gestes de construction (ajouter, supprimer, forcer une valeur) ne s'offrent qu'à ce moment. |

### Briques

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.texte(lire, ecrire, indication)` | champ texte relié à une donnée. |
| `ctx.bouton(libelle, infobulle, action)` | bouton de la fiche. |
| `ctx.pas(lire, ecrire, pas)` | compteur « − valeur + », champ du milieu éditable. |
| `ctx.tuile(libelle, valeur, action)` | grande tuile chiffrée ; `valeur` est une fonction, `action` est facultative. |
| `ctx.ligneComp(carac, nom)` | ligne de compétence complète : pastille de caractéristique, stade, total, jet. |
| `ctx.filtre(libelle, lire, ecrire)` | puce de filtre, comme celles des modules Armes et Compétences. |
| `ctx.dialogue(titre, corps, valider)` | fenêtre modale. C'est le seul moyen de poser une question : `prompt()` et `confirm()` ne fonctionnent pas dans la fiche, qui vit dans une iframe d'un autre site. |
| `ctx.message(texte)` | bandeau passager, en bas de la fiche. |

### Sorties

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.jet(libelle, valeur)` | lance le dé de la fiche avec cette valeur et envoie le résultat au tchat. |
| `ctx.auTchat(titre, champs)` | envoie une carte : un titre, puis une liste de paires `[cle, valeur]`. |
| `ctx.boutonTchat(libelle, titre, champs)` | le bouton qui fait ce qui précède. `champs` accepte une fonction, évaluée au clic. |

### Calculs

Toutes ces valeurs sont dérivées, donc en lecture seule : les écrire n'aurait
pas de sens, elles se recalculent à chaque affichage.

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.calculs.caracTotal(nom)` | le total d'une caractéristique : `"Mind"`, `"Body"`, `"Prestance"`. |
| `ctx.calculs.compValue(carac, comp, cle)` | le total d'une compétence, modificateurs compris. |
| `ctx.calculs.pvMax()` | les PV maximum, valeur forcée comprise. |
| `ctx.calculs.pvCourant()` | les PV du moment. |
| `ctx.calculs.initiative()` | l'initiative, poids porté déduit. |
| `ctx.calculs.vitesse()` | la vitesse. |
| `ctx.calculs.regen()` | la régénération. |
| `ctx.calculs.poidsPorte()` | le poids porté. |

### Mise en forme

| Entrée | Ce que c'est |
| --- | --- |
| `ctx.fmt.signe(n)` | `"+2"`, `"−3"` : le moins de la fiche, pas celui du clavier. |
| `ctx.fmt.nombre(n)` | arrondi à deux décimales, sans zéro inutile. |
| `ctx.champs` | les libellés officiels des données du personnage (`ctx.champs.pv`, `ctx.champs.initiative`…). Les reprendre, pour qu'un mod nomme les choses comme le reste de la fiche. |
| `ctx.abbr(carac)` | la pastille courte d'une caractéristique : `MIND`, `BODY`, `PRES`. |

## Lire et écrire les données du personnage

`ctx.state` se lit, ne s'écrit pas. Un mod qui pose `ctx.state.pv = 12` ne
plante pas, mais son geste ne survit pas au premier rafraîchissement, et il ne
part jamais dans Roll20. La règle est nette : ce qui appartient au personnage
appartient aux modules natifs, un mod ne le corrige pas dans son dos.

Un mod range ses données à lui dans son coffre, un objet libre attaché à son
`id`.

<div class="mods-code" markdown>

```
var d = ctx.donnees.get();          // {} au premier appel
d.balles = (d.balles || 0) - 1;    // du code : le moins du clavier
ctx.donnees.set(d);                 // remplace le coffre
ctx.enregistrer();                  // et l'écrit dans le personnage
```

</div>

Ce coffre suit le personnage partout où il va : bibliothèque du site, export
JSON, Attributes Roll20. Il ne contient que ce qu'on y met, il est propre au
mod, et il part avec lui quand on retire le mod.

<div class="mods-note" markdown>

`ctx.donnees.set` remplace : il ne fusionne pas. Lire, modifier l'objet lu,
réécrire, comme ci-dessus. `ctx.enregistrer()` est ce qui coûte le plus cher
dans la fiche (Roll20 écrit un Attribute) : l'appeler à la fin d'un geste, pas
à chaque frappe de clavier.

</div>

`ctx.data` donne les listes des règles pour construire des menus : les noms de
compétences, les armes, les avantages. La fiche ne contient aucune règle et un
mod ne doit pas en réintroduire : afficher un nom d'arme est légitime, recopier
un seuil ou une table dans un bloc ne l'est pas.

## Parler au tchat Roll20

Trois sorties, toutes soumises aux réglages de la barre d'envoi (public, au MJ,
à un joueur ; avec ou sans modificateur). Un mod ne choisit pas le
destinataire : c'est le joueur qui l'a fixé, et le mod n'y touche pas.

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
résout sur place et s'affiche dans un bandeau, la carte est simplement ignorée.
Un mod n'a donc pas à savoir où il tourne.

## Quatre mods complets

### Une tuile de PV

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "pv-en-grand",
  titre: "PV en grand",
  onglet: "fiche", colonne: 2, pour: "3.x",
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
  onglet: "equipement", colonne: 3, pour: "3.x",
  build: function (ctx) {
    var b = ctx.bloc("Munitions");
    function lire() { return ctx.donnees.get().balles || 0; }
    function ecrire(n) {
      var d = ctx.donnees.get();
      d.balles = Math.max(0, n);
      ctx.donnees.set(d);
      ctx.enregistrer();
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

`ctx.pas` écrit à chaque clic ; le bouton, lui, change la donnée sans passer par
un champ : il lui faut donc `ctx.rafraichir()` pour que l'affichage suive.

### Un bouton d'initiative au tchat

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "init-tchat",
  titre: "Initiative au tchat",
  onglet: "fiche", colonne: 2, pour: "3.x",
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
colonne, même rang dans la liste, sauf indication contraire. Le natif ne
s'exécute plus.

<div class="mods-code" markdown>

```
Jjk.enregistre({
  id: "initiative", titre: "Initiative", onglet: "fiche", colonne: 2, pour: "3.x",
  build: function (ctx) {
    return ctx.el("p", null, "Initiative : " + ctx.fmt.nombre(ctx.calculs.initiative()));
  }
});
```

</div>

L'identifiant d'un module natif se lit dans la fiche elle-même : son bloc porte
l'attribut `data-module`. Retirer le mod rend sa place au module natif, intact.

<div class="mods-note" markdown>

Remplacer un natif, c'est en assumer tout le travail : ses jets, ses
modificateurs, son mode édition. Ajouter un bloc à côté coûte presque toujours
moins cher que réécrire celui qui existe.

</div>

## Versions

`pour` déclare la version de fiche contre laquelle le mod a été écrit. La fiche
la compare à la sienne avant d'exécuter quoi que ce soit.

| Écriture | Ce qu'elle accepte |
| --- | --- |
| `"3.x"` | toute la lignée 3 : `3.0.0`, `3.4.1`, `3.12.0`. C'est l'écriture normale. |
| `"3.2.x"` | la lignée mineure 3.2 seulement. |
| `"3.0.0"` | cette version exacte, rien d'autre. |

La fiche peut monter de version comme redescendre : le manifeste sait servir
une version antérieure, et un personnage ouvert sur une fiche 2.x rencontrera
des mods écrits pour 3.x.

Quand `pour` ne correspond pas, le mod n'est pas exécuté. Il n'est ni effacé ni
modifié : sa ligne reste dans la liste des modules, marquée « écrit pour 3.x »,
et son coffre de données l'attend. Un bouton permet de l'exécuter quand même,
au risque de l'auteur du personnage.

Le numéro majeur de la fiche ne change que si `ctx` change : tant qu'on reste
en 3, ce que décrit cette page reste vrai. Un mod écrit `"3.x"` traverse donc
toutes les mises à jour de la lignée sans être retouché.

## Quand ça casse

Un mod est du code écrit par un joueur : il finira par casser. La fiche est
faite pour que cela reste sans conséquence.

| Panne | Ce que fait la fiche |
| --- | --- |
| `build` lève une erreur | le bloc du mod est remplacé par un cadre d'erreur qui donne son `id` et le message. Le reste de la fiche se construit normalement. |
| Le code ne s'analyse même pas | le mod est marqué « illisible » dans la liste, et n'est pas exécuté. |
| `build` ne rend rien | rien ne s'affiche, et la liste le signale. Ce n'est pas une erreur : c'est un mod qui a oublié son `return`. |

Le journal du navigateur (F12, onglet Console) reçoit chaque incident, préfixé
de l'identifiant du mod, par exemple `[mod:munitions]`. C'est le premier endroit
à regarder.

Pour ouvrir une fiche sans aucun mod : cocher « Démarrer sans les mods » en tête
de la liste des modules. Le réglage tient jusqu'à ce qu'on le décoche, il
n'appartient pas au personnage mais au navigateur, et il vaut aussi dans
Roll20. Sur le site, `?sansmods` ajouté à l'adresse de la page fait la même
chose pour une seule ouverture.

Enfin, la fiche pose un jeton avant d'exécuter les mods et l'efface une fois
montée. Si ce jeton est encore là à l'ouverture suivante, c'est que la fiche
n'a pas survécu à la précédente : elle démarre alors sans les mods et le dit.
Une fiche ne peut donc pas rester bloquée par un mod.

## Ce qu'un mod peut atteindre

Un mod vit dans le personnage. Il voyage avec lui : dans l'export JSON, dans le
personnage Roll20, dans la fiche qu'un joueur envoie à un autre. Et il ne
s'exécute pas que chez celui qui l'a installé : tout le monde à la table
l'exécute en ouvrant cette fiche, avec les droits de la page du site.

<div class="mods-alerte" markdown>

<p class="cle">installer un mod, c'est confier son personnage, son compte Roll20 et sa table à l'auteur du mod.</p>

</div>

Sans euphémisme, voici ce qu'un mod peut faire :

| Il atteint | Ce que cela veut dire |
| --- | --- |
| Toute la fiche ouverte | lire et modifier n'importe quelle donnée du personnage, y compris celles qu'aucun module n'affiche. |
| Toutes les fiches du navigateur | la bibliothèque du site est dans le stockage local de la page : un mod la lit et l'écrit en entier, pas seulement le personnage ouvert. |
| Le tchat de la partie | envoyer n'importe quelle commande que le joueur pourrait taper : jets truqués, chuchotements, commandes d'API de la table. Chez un MJ, avec les droits du MJ. |
| Le réseau | la page peut appeler n'importe quel serveur : tout ce qu'un mod lit, il peut l'envoyer ailleurs, sans que rien ne s'affiche. |
| La page entière | le mod tourne dans le même document que la fiche : il peut la modifier, la remplacer, ou faire semblant. |

Ce qu'il n'atteint pas : la page Roll20 elle-même, qui est d'une autre origine
que la fiche, et l'extension, qui ne fait que relayer. C'est une barrière
étroite, et elle ne protège pas de ce qui précède.

Trois habitudes valent toutes les protections :

| Habitude | Pourquoi |
| --- | --- |
| Lire le code avant de le coller | un mod tient en quelques dizaines de lignes. Un mod qu'on ne peut pas lire est un mod qu'on n'installe pas. |
| N'installer que ce qui vient de quelqu'un de connu | un fichier de personnage reçu d'un inconnu est du code exécutable, pas une feuille de papier. |
| Le MJ décide | une table peut simplement demander que les personnages n'en portent aucun. « Démarrer sans les mods » suffit à le vérifier. |
