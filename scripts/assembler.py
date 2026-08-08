#!/usr/bin/env python3
"""Assemble les fichiers servis a partir de morceaux, octet pour octet.

    python scripts/assembler.py --verifie   # compare, n'ecrit rien, sort 1 au premier ecart
    python scripts/assembler.py             # assemble et ecrit les fichiers servis

POURQUOI CET OUTIL EXISTE
docs/javascripts/jjk-fiche.js fait 6634 lignes dans une seule fonction anonyme.
Deux personnes ne peuvent pas y travailler en meme temps sans se marcher dessus.
On veut donc un fichier par module dans les sources, et une etape d'assemblage a
la publication. Ce qui est SERVI et ce qui est ARCHIVE ne doit pas bouger d'un
octet au passage : le manifeste nomme ces fichiers-la, le chargeur les prend tels
quels, et docs/fiche/v*/ en a fige des copies exactes qui sont la memoire des
personnages deja ecrits.

CE QUE L'ASSEMBLAGE N'EST PAS
Ce n'est pas un empaqueteur. Il ne reformate pas, ne renomme pas, ne reordonne
pas, n'ajoute ni en-tete, ni separateur, ni saut de ligne. Il colle des morceaux
bout a bout, dans l'ordre du plan, et c'est tout. Toute envie de « nettoyer au
passage » se traite APRES, une amelioration a la fois, une fois ce point d'appui
acquis.

CONSEQUENCE A ASSUMER
Decoupe, un morceau d'IIFE n'est PAS un fichier JavaScript valide isolement :
c'est un FRAGMENT, assemble comme un « #include ». « node --check » ne peut donc
s'appliquer qu'au fichier ASSEMBLE, jamais aux morceaux. C'est le prix de la
regle « octet pour octet », et c'est le bon prix.

LES TROIS PIEGES, ET COMMENT ILS SONT TRAITES

1. LES FINS DE LIGNE. Le depot n'a pas de .gitattributes et core.autocrlf vaut
   true : git stocke jjk-fiche.js en LF (« git ls-files --eol » dit i/lf) mais
   une extraction fraiche sous Windows le pose en CRLF dans la copie de travail,
   pendant que mkdocs.yml et le manifeste y sont deja en CRLF. Les deux formes
   passent « git status » sans un mot, puisque autocrlf renormalise a l'ajout.
   Sans precaution, la meme comparaison dirait donc vrai en CI et faux sur la
   machine de l'auteur. Ce n'est pas une crainte theorique : ce piege a DEJA
   frappe ce depot, docs/fiche/v3.4.0/jjk-fiche.js est fige en CRLF quand les
   huit autres archives sont en LF, et docs/fiche/v3.0.0/jjk-attr-map.js
   pareillement. Deux archives portent la cicatrice.
   La parade : les morceaux sont ramenes en LF a la lecture, quelle que soit la
   forme sous laquelle ils ont ete extraits, puis le fichier produit recoit la
   fin de ligne DECLAREE dans le plan (fin = lf). Les octets produits ne
   dependent plus de la machine.

2. L'ENCODAGE ET LA MARQUE D'ORDRE DES OCTETS. Contrairement a ce qu'on croit
   dans ce depot, docs/javascripts/jjk-fiche.js PORTE une marque d'ordre des
   octets (EF BB BF), dans la copie de travail, dans git, et dans les neuf
   archives. jjk-narration.js n'en a pas. Un assemblage qui l'oublierait
   differerait des l'octet 0 ; un assemblage qui l'ajouterait partout casserait
   la narration. Elle se DECLARE donc par fichier (bom = oui), et jamais ne se
   devine. Chaque morceau est par ailleurs debarrasse de la sienne : un editeur
   Windows en pose volontiers une, et collee au milieu du fichier elle
   deviendrait un caractere invisible en plein code.

3. LE DERNIER SAUT DE LIGNE, qui se perd toujours dans cet exercice. Il
   appartient au DERNIER morceau : l'assembleur n'en ajoute pas, puisqu'il
   n'ajoute rien. Le verificateur, lui, sait reconnaitre ce cas precis et le dit
   en toutes lettres au lieu de laisser chercher un octet fantome.

LE PLAN (scripts/assemblage.plan par defaut)
Il remplace la table des matieres que le gros fichier portait dans sa tete. Il
se lit d'un coup d'oeil, et se modifie sans peur : deplacer un module, c'est
deplacer une ligne.

    # tout ce qui suit un croisillon est un commentaire

    [docs/javascripts/jjk-fiche.js]
    bom = oui
    fin = lf
      src/fiche/000-entete.js
      src/fiche/fiche/narration.js
      src/fiche/fiche/caracs.js
      src/fiche/999-amorce.js

Entre crochets, le fichier SERVI. En dessous, ses morceaux dans l'ordre, chemins
relatifs a la racine du depot. L'indentation ne sert qu'a l'oeil.

    bom = oui | non   marque d'ordre des octets en tete du fichier produit
    fin = lf | crlf   fin de ligne du fichier produit

Un morceau prefixe de « + » se soude au precedent SANS fin de ligne entre eux.
C'est reserve a une coupure en plein milieu d'une ligne, ce qui ne devrait
jamais arriver ; sans ce prefixe, un morceau qui ne finit pas par une fin de
ligne est refuse. Un editeur qui mange le saut de ligne final souderait sinon
« })(); » et « var X » sur une meme ligne, en silence, et le fichier produit
serait faux sans que rien ne le dise.

Un fichier absent du plan n'est pas touche : cet outil arrive avant le decoupage,
et une publication doit continuer de fonctionner tant que rien n'est decoupe.

LES VARIANTES : UNE SOURCE, PLUSIEURS FICHIERS PRESQUE PAREILS
L'extension existe en DEUX moities, stable/ et beta/, dont les fichiers sont
identiques a trois valeurs pres. Elles etaient tenues a la main, cote a cote, et
un controle refusait le paquet quand elles divergeaient : une surveillance, pas
une garantie. Une variante rend la divergence IMPOSSIBLE au lieu de la detecter.

    [variante stable]
    partie  = stable
    libelle = Fiche JJK
    site    = jjk

    [variante beta]
    partie  = beta
    libelle = Fiche JJK beta
    site    = jjk-beta

    [extension/firefox/@@partie@@/content-roll20.js]
    variantes = stable, beta
      src/extension/content-roll20/000-entete.js
      ...

Un bloc a « variantes » engendre UN FICHIER PAR VARIANTE, a partir des memes
morceaux : le chemin de sortie porte lui aussi ses reperes. Dans les morceaux,
« @@partie@@ » est remplace par la valeur de la variante en cours. Un repere sans
valeur, une variante nommee et non definie, une variante definie et jamais
employee : chacun est un ARRET. Un repere qu'on laisserait passer partirait tel
quel dans un paquet signe.

    @@colonne:58@@   des espaces jusqu'a la colonne 58, et rien d'autre

Ce second repere n'est pas une coquetterie. Les lignes concernees portent un
commentaire de bout de ligne aligne en colonne, et « stable » est deux
caracteres plus long que « beta » : sans lui, le fichier produit differerait de
celui d'aujourd'hui par ses seuls espaces, ce que la regle « octet pour octet »
refuse. Les colonnes se comptent en CARACTERES et non en octets, et la premiere
est la numero 1.

Aucun morceau du depot ne contient « @@ » : le repere ne peut donc rien casser
de ce qui existe. Un « @@ » isole (sans son jumeau fermant) est laisse tel quel.
"""

import argparse
import os
import re
import sys

RACINE_DEFAUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN_DEFAUT = os.path.join("scripts", "assemblage.plan")

BOM = b"\xef\xbb\xbf"
FINS = {"lf": b"\n", "crlf": b"\r\n"}

# Un repere : « @@partie@@ », « @@colonne:58@@ ». Le corps ne peut pas contenir
# d'arobase, ce qui interdit a deux reperes voisins de se manger l'un l'autre, ni
# de fin de ligne, ce qui garantit qu'une substitution ne change JAMAIS le nombre
# de lignes du fichier produit — sans quoi le verificateur nommerait le mauvais
# morceau, et ce nom est tout ce qu'il a d'utile.
RE_REPERE = re.compile(r"@@([^@\n]+)@@")
PREFIXE_COLONNE = "colonne:"
RE_NOM = re.compile(r"^[A-Za-z0-9_-]+$")


class Faute(Exception):
    """Le plan ou les morceaux sont inutilisables : on ne produit rien."""


class Bloc(object):
    """Un bloc [fichier] du plan, avant qu'il ne soit developpe en cibles.

    Le chemin de sortie est ici un MODELE : il peut porter des reperes, et le
    bloc engendre alors un fichier par variante. La distinction bloc/cible tient
    a ce que les morceaux sont les MEMES pour toutes les variantes : c'est ce qui
    rend la divergence entre deux moities structurellement impossible.
    """

    def __init__(self, modele, ligne_plan):
        self.modele = modele          # chemin de sortie, reperes non resolus
        self.ligne_plan = ligne_plan  # pour situer une faute dans le plan
        self.bom = False
        self.fin = "lf"
        self.variantes = None         # None = un seul fichier, sans substitution
        self.morceaux = []            # (chemin, soude) ; soude = pas de fin de ligne avant


class Cible(object):
    """Un fichier servi, la liste ordonnee de ses morceaux, et ses valeurs."""

    def __init__(self, bloc, sortie, variante, valeurs):
        self.sortie = sortie              # chemin relatif au depot, reperes resolus
        self.ligne_plan = bloc.ligne_plan
        self.bom = bloc.bom
        self.fin = bloc.fin
        self.morceaux = bloc.morceaux
        self.variante = variante          # nom de la variante, ou None
        self.valeurs = valeurs            # ce que les reperes valent ici


# ------------------------------------------------------- les reperes
def substitue(ligne, valeurs, ou):
    """Rend la ligne, reperes resolus. « ou » situe la faute pour le lecteur.

    Un seul balayage de gauche a droite, parce que l'alignement depend de ce qui
    precede : « @@colonne:58@@ » ne peut compter ses espaces qu'une fois les
    valeurs posees, et « stable » n'a pas la longueur de « beta ».
    """
    if "@@" not in ligne:
        return ligne
    faite = []
    largeur = 0      # caracteres deja poses sur cette ligne
    fin = 0
    for m in RE_REPERE.finditer(ligne):
        avant = ligne[fin:m.start()]
        faite.append(avant)
        largeur += len(avant)
        nom = m.group(1).strip()
        if nom.startswith(PREFIXE_COLONNE):
            chiffres = nom[len(PREFIXE_COLONNE):].strip()
            if not chiffres.isdigit() or int(chiffres) < 1:
                raise Faute("%s : « @@%s@@ » attend un numero de colonne, "
                            "comme « @@colonne:58@@ »" % (ou, nom))
            vise = int(chiffres)
            if largeur + 1 > vise:
                # Se taire ici donnerait un fichier faux d'un espace, et le
                # verificateur enverrait chercher une faute de decoupage.
                raise Faute("%s : la ligne occupe deja %d caractere(s), elle ne peut pas "
                            "etre alignee sur la colonne %d. Une valeur de variante a "
                            "grandi : reculer la colonne visee, des DEUX cotes."
                            % (ou, largeur, vise))
            blancs = " " * (vise - 1 - largeur)
            faite.append(blancs)
            largeur += len(blancs)
        else:
            if nom not in valeurs:
                connues = (", ".join(sorted(valeurs)) if valeurs
                           else "aucune : ce fichier n'est engendre par aucune variante "
                                "(il n'a pas de cle « variantes » dans le plan)")
                raise Faute("%s : le repere « @@%s@@ » n'a pas de valeur. Valeurs "
                            "connues ici : %s." % (ou, nom, connues))
            valeur = valeurs[nom]
            faite.append(valeur)
            largeur += len(valeur)
        fin = m.end()
    faite.append(ligne[fin:])
    return "".join(faite)


# ------------------------------------------------------------------ le plan
def charger_plan(chemin):
    """Rend la liste des cibles. Leve Faute si le plan ne se lit pas.

    Le plan est lu en UTF-8 strict : un plan en mojibake nommerait des morceaux
    introuvables, et l'erreur se lirait « fichier absent » au lieu de « ton plan
    n'est pas dans le bon encodage ».
    """
    with open(chemin, "rb") as f:
        octets = f.read()
    if octets.startswith(BOM):
        octets = octets[len(BOM):]
    try:
        texte = octets.decode("utf-8")
    except UnicodeDecodeError as e:
        raise Faute("le plan %s n'est pas de l'UTF-8 : %s" % (chemin, e))

    blocs = []
    variantes = {}      # nom -> {repere: valeur}
    lignes_variantes = {}
    courant = None      # Bloc en cours
    variante = None     # nom de la variante en cours
    for n, brute in enumerate(texte.replace("\r\n", "\n").replace("\r", "\n").split("\n"), 1):
        ligne = brute.split("#", 1)[0].strip()
        if not ligne:
            continue
        if ligne.startswith("[") and ligne.endswith("]"):
            entete = ligne[1:-1].strip()
            if not entete:
                raise Faute("plan, ligne %d : nom de fichier vide entre crochets" % n)
            mots = entete.split(None, 1)
            if mots[0].lower() == "variante":
                if len(mots) < 2 or not mots[1].strip():
                    raise Faute("plan, ligne %d : « [variante] » sans nom" % n)
                variante = mots[1].strip()
                if variante in variantes:
                    raise Faute("plan, ligne %d : la variante « %s » est deja definie ligne %d"
                                % (n, variante, lignes_variantes[variante]))
                variantes[variante] = {}
                lignes_variantes[variante] = n
                courant = None
                continue
            variante = None
            courant = Bloc(entete.replace("\\", "/"), n)
            blocs.append(courant)
            continue
        if variante is not None:
            # Sous une variante, tout est « repere = valeur ». La valeur n'est
            # PAS mise en minuscules : c'est du texte qui part dans un fichier
            # signe (« Fiche JJK beta »), pas un reglage.
            if "=" not in ligne:
                raise Faute("plan, ligne %d : sous [variante %s], « %s » n'est pas "
                            "un « repere = valeur »" % (n, variante, ligne))
            cle, _, val = ligne.partition("=")
            cle, val = cle.strip(), val.strip()
            if not RE_NOM.match(cle):
                raise Faute("plan, ligne %d : « %s » n'est pas un nom de repere "
                            "(lettres, chiffres, tiret, souligne)" % (n, cle))
            if cle in variantes[variante]:
                raise Faute("plan, ligne %d : « %s » est deja donne dans la variante « %s »"
                            % (n, cle, variante))
            variantes[variante][cle] = val
            continue
        if courant is None:
            raise Faute("plan, ligne %d : « %s » n'est sous aucun [fichier]" % (n, ligne))
        if "=" in ligne:
            cle, _, brut = ligne.partition("=")
            # Le NOM d'une variante garde sa casse : il doit se retrouver tel
            # quel dans « [variante ... ] », et une mise en minuscules ici ferait
            # dire « variante introuvable » a un plan pourtant juste.
            cle, brut = cle.strip().lower(), brut.strip()
            val = brut.lower()
            if cle == "bom":
                if val not in ("oui", "non"):
                    raise Faute("plan, ligne %d : bom vaut oui ou non, pas « %s »" % (n, brut))
                courant.bom = (val == "oui")
            elif cle == "fin":
                if val not in FINS:
                    raise Faute("plan, ligne %d : fin vaut lf ou crlf, pas « %s »" % (n, brut))
                courant.fin = val
            elif cle == "variantes":
                noms = [x.strip() for x in brut.split(",") if x.strip()]
                if not noms:
                    raise Faute("plan, ligne %d : « variantes » sans aucun nom" % n)
                courant.variantes = noms
            else:
                # Refuser plutot que d'ignorer : une cle mal orthographiee
                # (« bomb », « fins ») laisserait le defaut s'appliquer en
                # silence, et le fichier produit serait faux d'un octet sans
                # que personne ait le moindre indice.
                raise Faute("plan, ligne %d : cle inconnue « %s »" % (n, cle))
            continue
        soude = ligne.startswith("+")
        chemin_m = ligne[1:].strip() if soude else ligne
        if not chemin_m:
            raise Faute("plan, ligne %d : « + » sans nom de morceau" % n)
        if soude and not courant.morceaux:
            raise Faute("plan, ligne %d : le premier morceau de %s ne peut pas se souder "
                        "a celui d'avant, il n'y en a pas" % (n, courant.modele))
        courant.morceaux.append((chemin_m.replace("\\", "/"), soude))

    for b in blocs:
        if not b.morceaux:
            raise Faute("plan, ligne %d : %s n'a aucun morceau" % (b.ligne_plan, b.modele))
    return _developpe(blocs, variantes, lignes_variantes)


def _developpe(blocs, variantes, lignes_variantes):
    """Rend les cibles : un bloc sans variante en donne une, sinon une par variante."""
    cibles = []
    employees = set()
    for b in blocs:
        if b.variantes is None:
            if RE_REPERE.search(b.modele):
                raise Faute("plan, ligne %d : %s porte un repere mais aucune cle "
                            "« variantes » ne dit ce qu'il vaut" % (b.ligne_plan, b.modele))
            cibles.append(Cible(b, b.modele, None, {}))
            continue
        for nom in b.variantes:
            if nom not in variantes:
                raise Faute("plan, ligne %d : la variante « %s » n'est definie nulle part "
                            "(il faut un bloc « [variante %s] »)" % (b.ligne_plan, nom, nom))
            employees.add(nom)
            valeurs = variantes[nom]
            ou = "plan, ligne %d (variante %s)" % (b.ligne_plan, nom)
            cibles.append(Cible(b, substitue(b.modele, valeurs, ou), nom, valeurs))
    for nom in variantes:
        if nom not in employees:
            # Une variante orpheline veut dire qu'un fichier a perdu sa cle
            # « variantes » : il serait alors assemble SANS substitution, et le
            # premier repere venu partirait tel quel dans un paquet signe.
            raise Faute("plan, ligne %d : la variante « %s » est definie et n'engendre "
                        "aucun fichier" % (lignes_variantes[nom], nom))
    vus = {}
    for c in cibles:
        if c.sortie in vus:
            raise Faute("plan, ligne %d : %s est deja assemble ligne %d"
                        % (c.ligne_plan, c.sortie, vus[c.sortie]))
        vus[c.sortie] = c.ligne_plan
    return cibles


# ------------------------------------------------------------ l'assemblage
def assembler(cible, racine):
    """Rend les octets du fichier servi. Leve Faute si un morceau cloche.

    Le collage se fait en memoire, sur du texte ramene en LF, puis les fins de
    ligne declarees sont posees d'un seul geste a la fin. Poser la fin de ligne
    morceau par morceau reviendrait au meme tant que tous les morceaux sont
    propres, mais laisserait passer un morceau a fins de ligne melangees : la
    normalisation d'abord rend le resultat independant de l'etat des sources.

    Les reperes sont resolus MORCEAU PAR MORCEAU, avant le collage, et jamais sur
    le fichier entier : c'est le seul moment ou l'on sait encore de quel morceau
    et de quelle ligne vient un repere qui cloche. Le meme morceau, lu deux fois
    avec deux jeux de valeurs, donne les deux moities de l'extension.
    """
    bouts = []
    for i, (rel, _soude) in enumerate(cible.morceaux):
        chemin = os.path.join(racine, rel.replace("/", os.sep))
        if not os.path.exists(chemin):
            raise Faute("%s : morceau introuvable, %s" % (cible.sortie, rel))
        with open(chemin, "rb") as f:
            octets = f.read()
        if octets.startswith(BOM):
            # Une marque d'ordre des octets au debut d'un morceau du MILIEU
            # deviendrait un U+FEFF invisible en plein code. Celle du fichier
            # produit se declare dans le plan, elle ne se herite pas d'un
            # morceau.
            octets = octets[len(BOM):]
        try:
            texte = octets.decode("utf-8")
        except UnicodeDecodeError as e:
            raise Faute("%s : le morceau %s n'est pas de l'UTF-8 : %s"
                        % (cible.sortie, rel, e))
        texte = texte.replace("\r\n", "\n").replace("\r", "\n")
        if "@@" in texte:
            # Ligne par ligne, pour pouvoir DIRE laquelle quand un repere cloche :
            # « le repere @@parti@@ n'a pas de valeur » sans son adresse enverrait
            # chercher dans vingt morceaux. Le decoupage et le recollage sont
            # exacts (split/join sur le meme separateur), la substitution ne
            # touche donc rien d'autre que les lignes qui portent un repere.
            lignes = texte.split("\n")
            for k, l in enumerate(lignes):
                if "@@" in l:
                    lignes[k] = substitue(l, cible.valeurs, "%s, ligne %d" % (rel, k + 1))
            texte = "\n".join(lignes)
        dernier = (i == len(cible.morceaux) - 1)
        suivant_soude = (not dernier and cible.morceaux[i + 1][1])
        if texte and not texte.endswith("\n") and not dernier and not suivant_soude:
            raise Faute(
                "%s : le morceau %s ne finit pas par une fin de ligne. Sa derniere "
                "ligne se souderait a la premiere du morceau suivant, et le fichier "
                "produit serait faux sans que rien ne le montre. Remettre la fin de "
                "ligne, ou prefixer le morceau suivant de « + » si la soudure est "
                "voulue." % (cible.sortie, rel))
        bouts.append(texte)
    texte = "".join(bouts)
    octets = texte.replace("\n", FINS[cible.fin].decode("ascii")).encode("utf-8")
    return (BOM + octets) if cible.bom else octets


# ----------------------------------------------------------- la comparaison
def _premiere_difference(a, b):
    """Indice du premier octet qui differe (ou la fin du plus court)."""
    n = min(len(a), len(b))
    i = 0
    while i < n and a[i] == b[i]:
        i += 1
    return i


def _visible(octets, colonne=0, largeur=110):
    """Une ligne rendue lisible : le \\r se voit, l'espace de fin se voit.

    Les lignes de ce depot passent les 200 caracteres. Montrer la ligne entiere
    noierait la difference ; on fenetre donc autour de la colonne fautive.
    """
    texte = octets.decode("utf-8", "replace")
    texte = texte.replace("\r", "\\r").replace("\t", "\\t")
    texte = texte.replace("\ufeff", "<BOM>")
    if texte != texte.rstrip(" "):
        texte = texte.rstrip(" ") + "<%d espace(s) en fin>" % (len(texte) - len(texte.rstrip(" ")))
    if len(texte) <= largeur:
        return texte
    debut = max(0, colonne - largeur // 3)
    bout = texte[debut:debut + largeur]
    return ("…" if debut else "") + bout + ("…" if debut + largeur < len(texte) else "")


def _sans_bom(octets):
    """Le contenu prive de sa marque d'ordre des octets de tete, s'il en a une.

    Surtout pas bytes.lstrip(BOM) : lstrip prend un ENSEMBLE d'octets a rogner,
    pas un prefixe. Il mangerait tout debut compose de EF, BB et BF dans
    n'importe quel ordre, et pourrait donc rogner un caractere accentue.
    """
    return octets[len(BOM):] if octets.startswith(BOM) else octets


def _diagnostic(produit, depot, sortie):
    """La cause probable de l'ecart, en francais, ou None.

    Un verificateur qui dit « octet 4 » sur une difference de fins de ligne
    envoie chercher une faute de decoupage la ou il n'y a qu'une extraction
    Windows. Ces quatre phrases-la evitent des heures.
    """
    if _sans_bom(produit) == _sans_bom(depot):
        return ("seule la marque d'ordre des octets differe : le depot en %s et le "
                "fichier produit en %s. C'est la cle « bom » du plan."
                % ("porte une" if depot.startswith(BOM) else "est depourvu",
                   "porte une" if produit.startswith(BOM) else "est depourvu"))
    plat_p = produit.replace(b"\r\n", b"\n")
    plat_d = depot.replace(b"\r\n", b"\n")
    if plat_p == plat_d:
        return ("seules les fins de ligne different (produit %s, depot %s). Le depot n'a "
                "pas de .gitattributes et core.autocrlf vaut true : une extraction fraiche "
                "sous Windows pose des CRLF que « git status » ne montre pas. Verifier avec "
                "« git ls-files --eol %s », et regler la cle « fin » du plan sur ce que git "
                "STOCKE (colonne i/), pas sur ce que la copie de travail affiche (colonne w/)."
                % ("CRLF" if b"\r\n" in produit else "LF",
                   "CRLF" if b"\r\n" in depot else "LF", sortie))
    if plat_p == plat_d + b"\n":
        return "le fichier produit a un saut de ligne final EN TROP (dernier morceau du plan)"
    if plat_p + b"\n" == plat_d:
        return ("il ne manque QUE le saut de ligne final au fichier produit : le dernier "
                "morceau du plan a perdu le sien, souvent en passant par un editeur")
    return None


def verifier(cible, racine, produit):
    """Rend (identique, lignes de journal). N'ecrit rien."""
    chemin = os.path.join(racine, cible.sortie.replace("/", os.sep))
    if not os.path.exists(chemin):
        return (False, ["%s : le fichier du depot n'existe pas" % cible.sortie])
    with open(chemin, "rb") as f:
        depot = f.read()
    if produit == depot:
        return (True, ["%s : identique (%d octets, %d morceaux)"
                       % (cible.sortie, len(depot), len(cible.morceaux))])

    # LA FORME D'EXTRACTION N'EST PAS UNE DIFFÉRENCE DE CONTENU.
    #
    # Le dépôt n'a pas de .gitattributes et core.autocrlf vaut true : la MÊME
    # révision se pose en LF sous Linux et en CRLF sous Windows, sans que « git
    # status » n'en dise un mot. Comparer les octets bruts faisait donc échouer
    # la vérification sur la machine de l'auteur et réussir en CI — soit
    # exactement le genre de contrôle qui apprend à ne plus être cru.
    #
    # Ce qui compte est le CONTENU. On compare donc les deux ramenés en LF, et
    # c'est l'assemblage, lui, qui pose la fin de ligne déclarée au moment
    # d'écrire. Une vraie différence, elle, reste attrapée : elle survit à la
    # normalisation.
    if produit.replace(b"\r\n", b"\n") == depot.replace(b"\r\n", b"\n"):
        return (True, ["%s : identique (%d octets, %d morceaux ; le fichier du "
                       "depot est extrait en CRLF, ce qui ne change pas son contenu)"
                       % (cible.sortie, len(produit), len(cible.morceaux))])

    j = ["%s : DIFFERENT (produit %d octets, depot %d octets)"
         % (cible.sortie, len(produit), len(depot))]
    cause = _diagnostic(produit, depot, cible.sortie)
    if cause:
        j.append("    cause : " + cause)

    # ON DÉSIGNE L'ÉCART SUR LES OCTETS NORMALISÉS, jamais sur les bruts. Un
    # fichier extrait en CRLF diffère dès la première ligne : le rapport pointait
    # alors « ligne 1, colonne 70 » quelle que soit la vraie faute, qui pouvait
    # être trois mille lignes plus bas. Montrer le bruit à la place de la faute
    # fait perdre plus de temps que ne pas montrer du tout.
    produit = produit.replace(b"\r\n", b"\n")
    depot = depot.replace(b"\r\n", b"\n")

    i = _premiere_difference(produit, depot)
    no = produit[:i].count(b"\n") + 1
    debut_ligne = produit.rfind(b"\n", 0, i) + 1
    colonne = i - debut_ligne
    lp = produit.split(b"\n")
    ld = depot.split(b"\n")

    def montre(lignes, n):
        # Le marqueur de fin n'est pas une coquetterie : quand l'ecart est le
        # saut de ligne FINAL, les deux versions de la ligne sont identiques a
        # l'oeil (« })(); » des deux cotes) et le journal avait l'air de se
        # contredire. C'est ce qui suit la ligne qui differe, il faut donc le
        # rendre visible.
        if n > len(lignes):
            return "(ce fichier s'arrete avant cette ligne)"
        texte = _visible(lignes[n - 1], colonne)
        # split(b"\n") laisse un dernier element VIDE quand le fichier finit par
        # un saut de ligne : ce n'est pas une ligne, c'est ce qu'il y a apres la
        # derniere. Le confondre avec une vraie derniere ligne ferait annoncer
        # « sans saut de ligne final » sur un fichier qui en a un.
        if n == len(lignes):
            if lignes[-1] == b"":
                return "(rien : le fichier s'arrete la, apres son saut de ligne final)"
            return texte + "  <fin du fichier, SANS saut de ligne final>"
        if n == len(lignes) - 1 and lignes[-1] == b"":
            return texte + "  <fin du fichier, avec saut de ligne final>"
        return texte

    j.append("    premier octet different : %d, ligne %d, colonne %d" % (i, no, colonne + 1))
    j.append("    produit | " + montre(lp, no))
    j.append("    depot   | " + montre(ld, no))
    rel = _morceau_de_ligne(cible, racine, no)
    if rel:
        j.append("    ce que le plan met a cette ligne : " + rel)
    return (False, j)


def _morceau_de_ligne(cible, racine, no):
    """Le morceau qui fournit la ligne n du fichier produit, ou None.

    Sans lui, « ligne 4211 » ne dit rien : personne ne sait plus dans quel
    fichier source aller regarder, ce qui est exactement ce que le decoupage
    etait cense rendre facile.
    """
    debut = 1
    for rel, _soude in cible.morceaux:
        chemin = os.path.join(racine, rel.replace("/", os.sep))
        try:
            with open(chemin, "rb") as f:
                octets = f.read()
        except OSError:
            return None
        n = octets.replace(b"\r\n", b"\n").count(b"\n")
        if debut <= no <= debut + n:
            return "%s (sa ligne %d)" % (rel, no - debut + 1)
        debut += n
    return None


# ------------------------------------------------------------------ l'ecriture
def ecrire(cible, racine, produit):
    """Ecrit le fichier servi. Rend True s'il a change."""
    chemin = os.path.join(racine, cible.sortie.replace("/", os.sep))
    ancien = None
    if os.path.exists(chemin):
        with open(chemin, "rb") as f:
            ancien = f.read()
    if ancien == produit:
        return False
    dossier = os.path.dirname(chemin)
    if dossier and not os.path.isdir(dossier):
        os.makedirs(dossier)
    # « wb » et rien d'autre : en mode texte, Python traduirait \n en \r\n sous
    # Windows et l'assemblage rendrait des octets differents des deux cotes,
    # c'est-a-dire exactement ce que cet outil existe pour empecher.
    with open(chemin, "wb") as f:
        f.write(produit)
    return True


# --------------------------------------------------- la porte de publication
def porte(racine, essai=False, plan=None):
    """Assemble (ou verifie seulement) avant une publication.

    Rend (ok, journal). Appelee par scripts/release_fiche.py.

      - plan absent            : rien a assembler, on laisse passer. Cet outil
                                 arrive AVANT le decoupage, et une publication
                                 doit continuer de marcher tant que rien n'est
                                 decoupe.
      - plan illisible, morceau introuvable, morceau mal termine : ARRET. Ce
        sont des fautes que l'assemblage ne peut pas trancher tout seul.
      - essai                  : on n'ecrit rien, mais on DIT quels fichiers
                                 servis sont en retard sur leurs sources.
      - en ordre de marche     : on ecrit, et on dit lesquels ont change. Une
                                 source modifiee sans assemblage devient donc
                                 impossible a publier sans qu'on le voie.
    """
    chemin_plan = plan or os.path.join(racine, PLAN_DEFAUT)
    if not os.path.exists(chemin_plan):
        return (True, ["aucun plan (%s) : rien n'est encore decoupe, rien a assembler"
                       % os.path.relpath(chemin_plan, racine).replace(os.sep, "/")])
    try:
        cibles = charger_plan(chemin_plan)
    except (OSError, Faute) as e:
        return (False, [str(e)])

    journal = []
    retard = []
    for c in cibles:
        try:
            produit = assembler(c, racine)
        except (OSError, Faute) as e:
            return (False, journal + [str(e)])
        if essai:
            identique, lignes = verifier(c, racine, produit)
            journal.extend(lignes)
            if not identique:
                retard.append(c.sortie)
        else:
            change = ecrire(c, racine, produit)
            journal.append("%s : %s (%d octets, %d morceaux)"
                           % (c.sortie, "REASSEMBLE" if change else "inchange",
                              len(produit), len(c.morceaux)))
            if change:
                retard.append(c.sortie)
    if retard:
        journal.append("les sources etaient EN AVANCE sur le fichier servi : %s"
                       % ", ".join(retard))
        if essai:
            journal.append("l'essai n'ecrit rien : une publication en ordre de marche "
                           "reassemblerait ces fichiers, et la suite les jugerait")
    return (True, journal)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Assemble les fichiers servis a partir de morceaux.")
    p.add_argument("--racine", default=RACINE_DEFAUT)
    p.add_argument("--plan", default=None, help="par defaut " + PLAN_DEFAUT.replace(os.sep, "/"))
    p.add_argument("--verifie", action="store_true",
                   help="compare au depot, n'ecrit rien, sort 1 au premier ecart")
    a = p.parse_args()
    racine = a.racine
    chemin_plan = a.plan or os.path.join(racine, PLAN_DEFAUT)

    print("ASSEMBLAGE" + (" (verification seule)" if a.verifie else ""))
    if not os.path.exists(chemin_plan):
        print("  aucun plan : %s" % chemin_plan)
        print("  rien n'est encore decoupe, rien a assembler.")
        return 0
    try:
        cibles = charger_plan(chemin_plan)
    except (OSError, Faute) as e:
        print("  ARRET : %s" % e)
        return 1

    ecarts = 0
    for c in cibles:
        try:
            produit = assembler(c, racine)
        except (OSError, Faute) as e:
            print("  ARRET : %s" % e)
            return 1
        if a.verifie:
            identique, lignes = verifier(c, racine, produit)
            for l in lignes:
                print("  " + l)
            if not identique:
                ecarts += 1
        else:
            change = ecrire(c, racine, produit)
            print("  %s : %s (%d octets, %d morceaux)"
                  % (c.sortie, "reassemble" if change else "inchange",
                     len(produit), len(c.morceaux)))
    if ecarts:
        print("")
        print("  ARRET : %d fichier(s) servi(s) ne correspondent pas a leurs morceaux." % ecarts)
        return 1
    print("")
    print("ASSEMBLAGE : %d fichier(s), %s" % (len(cibles),
                                              "tout est identique" if a.verifie else "ecrits"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
