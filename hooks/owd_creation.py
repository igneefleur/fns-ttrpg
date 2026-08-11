"""Jeu de données de la fiche : extrait des règles ce que la fiche consomme.

Le dépôt tient à ce que **les données viennent des règles, jamais du code**.
Ce hook lit `docs/content/regles/` au build et produit `owd-creation.json`, que
`owd-fiche.js` charge : le barème des rangs, les formules des capacités, les
huit caractéristiques, les armes et leurs paliers. Rien de tout cela n'est
recopié à la main dans un fichier JS, et une règle qui change au livre change
la fiche à la construction suivante.

CE QUE CE HOOK NE FAIT PAS, ET C'EST VOULU
  - Il n'invente AUCUNE valeur par défaut. La discipline d'`armes.py` vaut ici :
    une formule dont le membre gauche est inconnu, un rang sans coût, une
    caractéristique manquante, un désaccord entre la table de l'effondrement et
    les pourcentages du texte lèvent `ErreurRegles` et le build s'arrête. Ce que
    ce hook ne sait pas lire ne doit jamais se retrouver écrit en dur dans
    `owd-fiche.js`.
  - Il n'écrit pas dans `docs/` : le fichier est ajouté au site par l'API Files,
    en mémoire, sinon `mkdocs serve` reconstruirait en boucle.
  - Il ne fabrique PAS de liste de compétences. `base/competences.md` définit ce
    qu'est une compétence, ce que donne son rang et ce qu'il coûte, et rien
    d'autre : pas un seul nom de compétence, pas même en exemple. L'épée et
    l'herboristerie sont citées dans la prose comme illustrations, jamais comme
    une liste fermée. En tirer une liste la ferait passer pour une règle du
    livre. La fiche laisse donc le joueur nommer les siennes.

UNE PAGE ABSENTE N'EST PAS UNE PAGE FAUSSE, ET C'EST TOUTE LA DIFFÉRENCE
  Les huit chapitres lus ici ne sont pas tous écrits, et ceux qui le sont ne
  sont pas tous committés : la CI ne voit que l'arbre du dépôt, où un chapitre
  en cours de rédaction n'existe pas. Un chapitre qui MANQUE ne fait donc pas
  tomber le build — sa section est simplement omise du JSON, et `_absents` la
  nomme, avertissement à l'appui dans le journal de la construction. Un
  chapitre PRÉSENT dont un motif ne se lit plus, lui, arrête tout comme avant :
  la règle a changé de forme sans que le hook le sache, et servir un barème
  faux à une table coûte plus cher qu'un build rouge.

  OMETTRE CE QUI N'EXISTE PAS ENCORE N'EST PAS DEVINER ; LIRE DE TRAVERS CE QUI
  EXISTE, SI.

  Deux façons de défaire cela, et il ne faut ni l'une ni l'autre : donner une
  valeur de repli aux sections absentes (le JSON cesserait de dire ce qu'il
  sait de ce qu'il ignore), ou construire la CI avec « --strict », qui rend à
  l'avertissement le pouvoir d'échouer et ramène exactement la panne qu'on
  vient de retirer. Une section omise ne laisse NI clé vide NI valeur par
  défaut : la clé n'existe pas, et son absence se distingue ainsi d'une lecture
  qui n'aurait rien trouvé.

CE QUE LE HOOK TIENT, LUI, ET POURQUOI CE N'EST PAS UNE ENTORSE
  Les tables de correspondance ci-dessous (`CAPACITES`, `HORS_CAPACITE`) ne
  portent AUCUN nombre et AUCUNE règle : elles disent seulement quel libellé du
  livre correspond à quelle clé d'état et à quelle abréviation d'affichage. La
  clé (`pv`, `charge`) est un identifiant de la fiche, l'abréviation est un
  raccourci de mise en page ; ni l'une ni l'autre n'est écrite dans le livre, et
  les y chercher n'aurait pas de sens. Tout ce qui est chiffré, en revanche —
  bases, facteurs, coûts, pourcentages, paliers — est LU.

CE QUE LE LIVRE NE DIT PAS, ET QUE LE JSON DIT DONC AUTREMENT
  - Le maximum de points de mana. Le chapitre nomme la réserve et donne ses
    récupérations naturelles, mais aucune formule ne fixe son maximum. La
    capacité sort donc avec `"formule": null` et une base à zéro, et c'est ce
    `null` qui fait afficher « aucune formule » sous la jauge, plutôt qu'un cas
    particulier codé dans le JS. Le jour où une règle le donnera, ce sera une
    ligne de règles de plus, et rien à changer ailleurs.
  - Les trois types de dégâts n'ont pas d'adjectif dans le livre : il écrit les
    CODES (TRA, PER, CON) et dit ce qui les inflige (« le fil tranche »). Le
    libellé rendu est donc le code lui-même, et la phrase du livre voyage sous
    `dit`, pour l'infobulle. Fabriquer « tranchant » à partir de « tranche »
    marcherait une fois sur trois et inventerait le reste.
"""

import json
import logging
import re
import unicodedata
from pathlib import Path

from mkdocs.structure.files import File

CIBLE = "owd-creation.json"
RACINE = "content/regles"

# Le journal de la construction. MkDocs branche ses gestionnaires sur le logger
# « mkdocs » : un enfant de ce nom paraît dans la sortie de `mkdocs build` sans
# rien avoir à installer, et se compte parmi les avertissements du build.
LOG = logging.getLogger("mkdocs.hooks.owd_creation")

LISEZMOI = (
    "Produit au build par hooks/owd_creation.py depuis docs/content/regles/. "
    "Ne pas editer a la main : la prochaine construction l'ecrase."
)

# Les huit chapitres dont ce hook tire le jeu de données, dans l'ordre du livre.
# Cette liste est la SEULE à les nommer : elle sert à les lire, à dresser
# « _absents » et à nommer les manquants dans le journal. En ajouter un ici sans
# l'assembler dans _jeu() le ferait lire pour rien.
PAGES = (
    "base/caracteristiques.md",
    "base/competences.md",
    "base/techniques.md",
    "base/actions.md",
    "base/capacites-physiques.md",
    "combat/portees.md",
    "combat/armes.md",
    "equipement.md",
)

# Les nombres que le livre ecrit en toutes lettres. Aucune valeur par defaut :
# un mot absent de cette table leve, plutot que de rendre zero en silence.
NOMBRES = {
    "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
    "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11,
    "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16,
    "vingt": 20,
}

# Les fractions, pour « Elle vaut le tiers de l'achat ».
FRACTIONS = {"moitie": 2, "demi": 2, "tiers": 3, "quart": 4, "cinquieme": 5}

# Libelle du livre -> (cle d'etat, abreviation d'affichage). Aucun nombre ici :
# les bases, les facteurs et les diviseurs sont LUS dans les formules. L'ordre
# de cette table est celui du JSON produit.
CAPACITES = [
    ("Points de vie", "pv", "PV"),
    ("Points d'endurance", "pe", "PE"),
    ("Points d'innocence", "pi", "PI"),
    ("Points de repos", "pr", "PR"),
    ("Points de satiété", "ps", "PS"),
    ("Points d'hydratation", "ph", "PH"),
    ("Charge", "charge", "CHG"),
    ("Accès rapides", "acces", "ACC"),
    ("Contenance", "contenance", "CTN"),
    ("Exposition", "expo", "EXP"),
    # Nommee par le chapitre, sans formule : voir le docstring.
    ("Points de mana", "pm", "PM"),
]

# Les formules de `capacites-physiques.md` qui ne donnent PAS une capacite. Les
# nommer une par une est le prix a payer pour que toute formule NOUVELLE et
# inconnue fasse echouer le build au lieu de passer inapercue.
HORS_CAPACITE = {
    "Recuperation naturelle eveille",
    "Recuperation naturelle endormi",
    "Une place se libere toutes les dix minutes",
    "Paliers",
}


class ErreurRegles(Exception):
    """Une regle que le hook n'a pas su lire : le build s'arrete plutot que de
    laisser la fiche tourner sur des nombres devines."""


# ----------------------------------------------------------------------
# Outils
# ----------------------------------------------------------------------

def _plat(txt):
    """Sans accents, sans casse : sert aux COMPARAISONS, jamais a l'affichage."""
    d = unicodedata.normalize("NFD", txt)
    return "".join(c for c in d if unicodedata.category(c) != "Mn")


def _cle(txt):
    """Libelle -> identifiant sans accent (Dexterite, grande-epee)."""
    s = _plat(txt).lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _lire_opt(docs, rel):
    """Le texte d'un chapitre, ou None s'il n'est pas là.

    C'EST LE SEUL ENDROIT DU FICHIER OÙ UNE ABSENCE EST TOLÉRÉE, et il ne sert
    qu'aux huit chapitres de PAGES, depuis _jeu(). Tout le reste garde sa
    rigueur : dans un chapitre PRÉSENT, un motif introuvable lève toujours
    (_un), parce que la règle a alors changé de forme. Ne pas se servir de ce
    None ailleurs pour « laisser passer » une lecture qui échoue.
    """
    p = Path(docs) / RACINE / rel
    return p.read_text(encoding="utf-8") if p.is_file() else None


def _un(motif, texte, quoi, drapeaux=0):
    """La premiere capture, ou l'echec du build. Jamais None rendu en douce."""
    m = re.search(motif, texte, drapeaux)
    if not m:
        raise ErreurRegles(f"{quoi} : introuvable (motif « {motif} »)")
    return m


def _ecrit(mot, quoi):
    n = NOMBRES.get(_plat(mot).lower())
    if n is None:
        raise ErreurRegles(f"{quoi} : « {mot} » n'est pas un nombre que ce hook sache lire")
    return n


# ----------------------------------------------------------------------
# Caracteristiques
# ----------------------------------------------------------------------

# « La Force ouvre… », « L'Endurance mesure… », « La Chance donne… » : une phrase
# par caracteristique, en tete de paragraphe. Le hook ECHOUE si les huit ne sont
# pas trouvees, quatre par famille.
_CARAC = re.compile(
    r"^(?:La |Le |L')([A-ZÉÈ][A-Za-zéèêîïôûàç]+)\s+(ouvre|mesure|donne)\b(.*)$",
    re.M,
)


def _section(texte, titre, quoi):
    """Le corps d'une section « ### Titre », jusqu'au titre de meme rang suivant."""
    m = re.search(r"^###\s+" + re.escape(titre) + r"\s*(?:\{[^}]*\})?\s*$", texte, re.M)
    if not m:
        raise ErreurRegles(f"{quoi} : section « {titre} » introuvable")
    suite = re.search(r"^#{1,3}\s+", texte[m.end():], re.M)
    return texte[m.end(): m.end() + (suite.start() if suite else len(texte))]


def _caracs(txt):
    out = []
    for titre, famille in (("Les quatre maîtrises", "maitrise"),
                           ("Les quatre réserves", "reserve")):
        corps = _section(txt, titre, "caractéristiques")
        trouvees = _CARAC.findall(corps)
        if len(trouvees) != 4:
            raise ErreurRegles(
                f"caractéristiques : « {titre} » en donne {len(trouvees)} et non quatre "
                f"({', '.join(t[0] for t in trouvees) or 'aucune'})")
        for libelle, verbe, reste in trouvees:
            c = {"cle": _plat(libelle), "libelle": libelle,
                 "abbr": _plat(libelle)[:3].upper(), "famille": famille}
            if verbe == "ouvre":
                # « ouvre les armes de puissance et fixe leurs dégâts » : ce que
                # la caractéristique autorise, tel que le livre l'écrit.
                m = re.match(r"\s+(.+?),?\s+et fixe\b", reste)
                if m:
                    c["ouvre"] = m.group(1)
            out.append(c)

    abbrs = [c["abbr"] for c in out]
    if len(set(abbrs)) != len(abbrs):
        raise ErreurRegles(
            "caractéristiques : deux abréviations identiques (" + ", ".join(abbrs) + ")")
    return out


# ----------------------------------------------------------------------
# Rangs de compétence
# ----------------------------------------------------------------------

_PALIER = re.compile(
    r'<p class="palier">\s*<span class="nom">(?P<nom>[^<]+)</span>\s*'
    r'<span class="rg">(?P<rg>[^<]+)</span>\s*'
    r'<span class="cout">(?P<cout>.*?)</span>\s*</p>', re.S)


def _des_et_bonus(bloc, quoi):
    """« engage 2 dés d'action au plus … et ajoute 1 à son résultat »."""
    m = re.search(r"engage (\d+) dés? d'action", bloc)
    if not m:
        raise ErreurRegles(f"{quoi} : le nombre de dés engagés ne se lit pas")
    des = int(m.group(1))
    b = re.search(r"ajoute (\d+) à son résultat", bloc)
    if b:
        return des, int(b.group(1))
    if re.search(r"n'ajoute aucun bonus", bloc):
        return des, 0
    raise ErreurRegles(f"{quoi} : le bonus de rang ne se lit ni en nombre ni en « aucun »")


def _rangs(txt):
    # Le Rang 0 vit dans sa propre section : il n'a ni palier ni prix.
    zero = _section(txt, "Le Rang 0", "rang 0")
    des0, bonus0 = _des_et_bonus(zero, "rang 0")
    nom0 = _un(r"est dit ([a-zéèêà ]+?) dans cette compétence", zero,
               "rang 0 : son nom").group(1).strip()
    out = [{"rang": 0, "nom": nom0[:1].upper() + nom0[1:], "designation": "Rang 0",
            "des": des0, "bonus": bonus0, "xp": 0, "rupture": 0}]

    carte = _un(r'<div class="mcard art rangs" markdown>(.*?)\n</div>', txt,
                "barème des rangs", re.S).group(1)
    paliers = list(_PALIER.finditer(carte))
    if not paliers:
        raise ErreurRegles("barème des rangs : aucun palier lisible")
    for i, m in enumerate(paliers):
        fin = paliers[i + 1].start() if i + 1 < len(paliers) else len(carte)
        bloc = carte[m.end():fin]
        rg = m.group("rg").strip()
        quoi = f"rang « {rg} »"
        des, bonus = _des_et_bonus(bloc, quoi)
        cout = m.group("cout")
        xp = _un(r'<span class="xp">(\d+) XP</span>', cout, f"{quoi} : son coût")
        rup = re.search(r'<span class="rup">(\d+)</span>', cout)
        # « Rang 4 » donne son numéro ; « Rang Max » est le dernier, et son rang
        # est celui qui suit le précédent : le livre ne le numérote pas, il le
        # nomme. Le déduire de la position dans la carte serait le même nombre,
        # mais cesserait d'être vrai le jour où un rang s'insère au milieu.
        n = re.search(r"Rang (\d+)", rg)
        rang = int(n.group(1)) if n else out[-1]["rang"] + 1
        if rang != out[-1]["rang"] + 1:
            raise ErreurRegles(
                f"{quoi} : les rangs sautent de {out[-1]['rang']} à {rang}, "
                f"or ils se prennent dans l'ordre")
        out.append({"rang": rang, "nom": m.group("nom").strip(), "designation": rg,
                    "des": des, "bonus": bonus, "xp": int(xp.group(1)),
                    "rupture": int(rup.group(1)) if rup else 0})

    # L'initiale est ce que porte chaque cran de la barre de rang : six boutons
    # d'une lettre. Deux rangs de même initiale rendraient la barre illisible.
    for r in out:
        r["initiale"] = _plat(r["nom"])[:1].upper()
    lettres = [r["initiale"] for r in out]
    if len(set(lettres)) != len(lettres):
        raise ErreurRegles(
            "rangs : deux initiales identiques (" + " ".join(lettres) +
            ") — la barre de rang ne saurait plus les distinguer")
    return out


# ----------------------------------------------------------------------
# Capacités
# ----------------------------------------------------------------------

_FORMULE = re.compile(r'<p class="formula">(.+?)</p>', re.S)

# « Points de repos = 800 + Vigueur × 8 », « Contenance = 60 »
_SOMME = re.compile(r"^(?P<base>\d+)(?:\s*\+\s*(?P<carac>[^\s×]+)(?:\s*×\s*(?P<f>\d+))?)?$")
# « Dextérité ÷ 4, arrondi à l'inférieur »
_DIVISION = re.compile(r"^(?P<carac>[^\s÷]+)\s*÷\s*(?P<d>\d+)\s*,\s*arrondi à l'(?P<a>inférieur|supérieur)$")
# « de −(100 + Résistance) à +(100 + Résistance) »
_SIGNEE = re.compile(
    r"^de\s*[−-]\(\s*(?P<b1>\d+)\s*\+\s*(?P<c1>[^)]+?)\s*\)\s*à\s*\+\(\s*(?P<b2>\d+)\s*\+\s*(?P<c2>[^)]+?)\s*\)$")

_ARRONDI = {"inférieur": "bas", "supérieur": "haut"}


def _carac_de(nom, caracs, quoi):
    cle = _plat(nom).strip()
    for c in caracs:
        if c["cle"] == cle:
            return c["cle"]
    raise ErreurRegles(
        f"{quoi} : « {nom} » n'est pas une des huit caractéristiques")


def _capacites(txt, caracs):
    par_libelle = {_plat(lib): (lib, cle, abbr) for lib, cle, abbr in CAPACITES}
    lues = {}

    for m in _FORMULE.finditer(txt):
        brut = re.sub(r"\s+", " ", m.group(1)).strip()
        gauche, sep, droite = brut.partition("=")
        gauche, droite = gauche.strip(), droite.strip()
        plat = _plat(gauche)
        if not sep:
            # Une formule sans « = » (« Une place se libère toutes les dix
            # minutes ») n'énonce pas une capacité, mais elle doit être NOMMÉE
            # ici, sans quoi une formule nouvelle passerait inaperçue.
            if _plat(brut) in HORS_CAPACITE:
                continue
            raise ErreurRegles(
                f"capacités : formule « {brut} » sans membre gauche connu")
        if plat in HORS_CAPACITE:
            continue
        if plat not in par_libelle:
            raise ErreurRegles(
                f"capacités : « {gauche} » n'est ni une capacité connue ni dans "
                f"la liste des formules qui n'en sont pas (formule « {brut} »)")
        if plat in lues:
            raise ErreurRegles(f"capacités : « {gauche} » a deux formules")

        # Le libellé rendu est celui du LIVRE, tel que la formule l'écrit, et
        # non celui de la table ci-dessus : elle ne sert qu'à reconnaître la
        # capacité et à lui donner sa clé.
        _, cle, abbr = par_libelle[plat]
        cap = {"cle": cle, "libelle": gauche, "abbr": abbr,
               "base": 0, "carac": None, "facteur": 0, "formule": brut}
        quoi = f"capacité « {gauche} »"

        s = _SOMME.match(droite)
        d = _DIVISION.match(droite)
        g = _SIGNEE.match(droite)
        if s:
            cap["base"] = int(s.group("base"))
            if s.group("carac"):
                cap["carac"] = _carac_de(s.group("carac"), caracs, quoi)
                cap["facteur"] = int(s.group("f") or 1)
        elif d:
            cap["carac"] = _carac_de(d.group("carac"), caracs, quoi)
            cap["diviseur"] = int(d.group("d"))
            cap["arrondi"] = _ARRONDI[d.group("a")]
            del cap["facteur"]
        elif g:
            if g.group("b1") != g.group("b2") or _plat(g.group("c1")) != _plat(g.group("c2")):
                raise ErreurRegles(
                    f"{quoi} : les deux bornes ne se répondent pas ({brut})")
            cap["base"] = int(g.group("b1"))
            cap["carac"] = _carac_de(g.group("c1"), caracs, quoi)
            cap["facteur"] = 1
            cap["signe"] = True
        else:
            raise ErreurRegles(
                f"{quoi} : membre droit « {droite} » d'une forme que ce hook ne lit pas")
        lues[plat] = cap

    out = []
    for libelle, cle, abbr in CAPACITES:
        plat = _plat(libelle)
        if plat in lues:
            out.append(lues[plat])
            continue
        # Aucune formule. La capacité doit alors au moins être NOMMÉE par le
        # chapitre : c'est le cas des points de mana, dont le livre donne les
        # récupérations sans jamais fixer le maximum. Sans ce contrôle, une
        # capacité effacée des règles continuerait d'apparaître dans la fiche.
        if not re.search(r"^###\s+.*" + re.escape(_plat(libelle).lower()),
                         _plat(txt).lower(), re.M):
            raise ErreurRegles(
                f"capacités : « {libelle} » n'a ni formule ni section dans les règles")
        out.append({"cle": cle, "libelle": libelle, "abbr": abbr,
                    "base": 0, "carac": None, "facteur": 0, "formule": None})
    return out


# ----------------------------------------------------------------------
# Effondrement
# ----------------------------------------------------------------------

def _effondrement(txt, capacites):
    corps = _section(txt, "L'effondrement", "effondrement")
    tranche = int(_un(r"par tranche de (\d+) %", corps,
                      "effondrement : la tranche").group(1))
    plafond = _ecrit(_un(r"sans jamais dépasser (\w+)", corps,
                         "effondrement : le plafond").group(1),
                     "effondrement : le plafond")
    m = _un(r"maximum de points d'endurance de (\d+) % par niveau, et le maximum "
            r"de points de vie de (\d+) %", corps, "effondrement : les deux pertes")
    pe, pv = int(m.group(1)), int(m.group(2))

    # LA TABLE DES DIX LIGNES EST LUE POUR VÉRIFIER, JAMAIS RECOPIÉE : un
    # désaccord entre elle et les pourcentages du texte arrête le build. C'est
    # le seul endroit où les mêmes nombres sont écrits deux fois dans le livre,
    # et c'est précisément là qu'ils peuvent diverger.
    lignes = re.findall(r"^\|\s*(\d+)\s*\|\s*(\d+) %\s*\|\s*(\d+) %\s*\|", corps, re.M)
    if len(lignes) != plafond:
        raise ErreurRegles(
            f"effondrement : la table donne {len(lignes)} niveaux et le texte en "
            f"annonce {plafond}")
    for n, restePe, restePv in lignes:
        n, restePe, restePv = int(n), int(restePe), int(restePv)
        if restePe != 100 - pe * n or restePv != 100 - pv * n:
            raise ErreurRegles(
                f"effondrement : au niveau {n} la table donne {restePe} % / {restePv} % "
                f"quand le texte donne {100 - pe * n} % / {100 - pv * n} %")

    # Quelles réserves comptent : celles que la phrase d'ouverture nomme, dans
    # l'ordre où elle les nomme. Les déduire d'une liste écrite ici les figerait.
    tete = corps.split("Chaque réserve")[0]
    reserves = []
    for cap in capacites:
        pos = _plat(tete).lower().find(_plat(cap["libelle"]).lower())
        if pos >= 0:
            reserves.append((pos, cap["cle"]))
    reserves = [c for _, c in sorted(reserves)]
    if not reserves:
        raise ErreurRegles("effondrement : aucune réserve nommée dans l'ouverture")
    return {"tranche": tranche, "plafond": plafond,
            "peParNiveau": pe, "pvParNiveau": pv, "reserves": reserves}


# ----------------------------------------------------------------------
# Armes
# ----------------------------------------------------------------------

_ARME = re.compile(
    r'<p class="arme-nom">(?P<nom>[^<]+)<span class="arme-portee">'
    r'parade (?P<p>\d+) · réduction (?P<r>\d+)</span></p>')


def _paliers(portees):
    """La table « Case / Ce qui y travaille » : ce qui travaille à N pas.

    Ce tableau n'est pas un résultat, c'est une règle : chaque catégorie tient
    un palier, et ce palier vaut pour toutes les armes qui y entrent.
    """
    m = _un(r"\|\s*Case\s*\|\s*Ce qui y travaille\s*\|(.+?)\n\n", portees,
            "paliers : la table des cases", re.S)
    out = []
    for case, quoi in re.findall(r"^\|\s*(\d+)\s*\|([^|]+)\|", m.group(1), re.M):
        for nom in quoi.split(","):
            nom = _plat(nom).strip().lower()
            if nom:
                out.append((nom, int(case)))
    if not out:
        raise ErreurRegles("paliers : la table des cases ne donne aucune entrée")
    # Le plus long d'abord : « grande hache » doit l'emporter sur « hache ».
    out.sort(key=lambda e: -len(e[0]))
    return out


def _armes(armes_md, portees_md):
    paliers = _paliers(portees_md)
    out, vues = [], {}
    for m in _ARME.finditer(armes_md):
        nom = m.group("nom").strip()
        avant = armes_md[:m.start()]
        cat = re.findall(r"^##\s+(.+?)\s*$", avant, re.M)
        if not cat:
            raise ErreurRegles(f"arme « {nom} » : aucune catégorie ne la précède")
        plat = _plat(nom).lower()
        # La clé ET le palier viennent de la table des portées : c'est elle qui
        # nomme les familles, et c'est donc elle qui les identifie.
        trouve = next(((k, c) for k, c in paliers if plat.startswith(k)), None)
        if trouve is None:
            raise ErreurRegles(
                f"arme « {nom} » : aucune entrée de la table des cases ne la nomme, "
                f"son palier serait inventé")
        cle = _cle(trouve[0])
        if cle in vues:
            raise ErreurRegles(
                f"arme « {nom} » : la clé « {cle} » sert déjà à « {vues[cle]} »")
        vues[cle] = nom
        out.append({"cle": cle, "nom": nom, "categorie": cat[-1],
                    "parade": int(m.group("p")), "reduction": int(m.group("r")),
                    "palier": trouve[1]})
    if not out:
        raise ErreurRegles("armes : aucune ligne d'arme lisible")
    return out


def _types_degats(armes_md):
    """« Le fil tranche (TRA), la pointe perce (PER), … écrasent (CON) ».

    Le livre n'écrit pas d'adjectif : il écrit le CODE et ce qui l'inflige. Le
    libellé rendu est donc le code, et la phrase voyage sous `dit`.
    """
    phrase = _un(r"(Le fil [^.]+\(CON\))", armes_md,
                 "types de dégâts : la phrase de « Lire un coup »").group(1)
    # Découpé sur les CODES et non sur les virgules : la dernière proposition
    # en porte trois (« une hampe, un manche, un plat ou un pommeau écrasent »),
    # et une coupure à la virgule n'en garderait que le dernier morceau.
    out = []
    bouts = re.split(r"\((TRA|PER|CON)\)", phrase)
    for i in range(1, len(bouts), 2):
        out.append({"cle": bouts[i], "libelle": bouts[i],
                    "dit": bouts[i - 1].strip(" ,").strip()})
    codes = [t["cle"] for t in out]
    if sorted(codes) != ["CON", "PER", "TRA"]:
        raise ErreurRegles(
            "types de dégâts : les trois codes ne se lisent pas tous (" +
            " ".join(codes) + ")")
    return out


# ----------------------------------------------------------------------
# Assemblage
# ----------------------------------------------------------------------

def _jeu(docs):
    """Le jeu de données, assemblé section par section — chacune sous condition.

    L'ORDRE DES AFFECTATIONS EST L'ORDRE DU JSON, et il se lit comme le livre :
    caractéristiques, compétences, dés, rupture, capacités, effondrement,
    climat, pas, monnaie, armes. Insérer une section ailleurs déplacerait une
    clé dans le fichier produit sans que rien ne le signale.

    Chaque `if` en dit un peu plus que « le fichier est là » : il dit de QUOI
    la section a besoin. Deux sections tiennent de deux chapitres à la fois, et
    ce sont celles-là qui piègent — voir leurs commentaires.
    """
    src = {rel: _lire_opt(docs, rel) for rel in PAGES}
    absents = [rel for rel in PAGES if src[rel] is None]

    carac_md = src["base/caracteristiques.md"]
    comp_md = src["base/competences.md"]
    tech_md = src["base/techniques.md"]
    act_md = src["base/actions.md"]
    cap_md = src["base/capacites-physiques.md"]
    portees_md = src["combat/portees.md"]
    armes_md = src["combat/armes.md"]
    equip_md = src["equipement.md"]

    jeu = {"_lisezmoi": LISEZMOI}
    # En TÊTE du fichier, et seulement s'il y a quelque chose à dire : c'est la
    # première chose qu'on veut lire en ouvrant un JSON qu'on trouve court. Un
    # jeu complet ne porte donc PAS cette clé, et sa présence est à elle seule
    # la réponse à « pourquoi la fiche n'a-t-elle pas ses armes ? ».
    if absents:
        jeu["_absents"] = absents

    # Les formules des capacités NOMMENT des caractéristiques (« 800 + Vigueur
    # × 8 »), et `_carac_de` refuse tout ce qui n'est pas l'une des huit : sans
    # le chapitre des caractéristiques, ce contrôle n'aurait plus rien contre
    # quoi se faire et les capacités sortiraient sur parole. Les deux se lisent
    # donc ensemble, ou pas du tout.
    caracs = _caracs(carac_md) if carac_md is not None else None
    capacites = (_capacites(cap_md, caracs)
                 if cap_md is not None and caracs is not None else None)

    if caracs is not None:
        # Ce que chaque caractéristique DONNE : l'inverse de ce que les
        # capacités déclarent. Le relire dans la prose des caractéristiques
        # donnerait un autre compte (elle ne cite ni la satiété ni
        # l'hydratation), et deux réponses à la même question finiraient par se
        # contredire. Sans les capacités, la clé n'est pas écrite du tout : une
        # liste vide se lirait « cette caractéristique ne donne rien », et c'est
        # une affirmation, pas une absence.
        if capacites is not None:
            for c in caracs:
                c["donne"] = [k["cle"] for k in capacites if k["carac"] == c["cle"]]
        jeu["caracs"] = caracs
        jeu["moyenneHumaine"] = int(_un(r"(\d+) est la moyenne humaine", carac_md,
                                        "la moyenne humaine").group(1))

    if comp_md is not None:
        jeu["rangs"] = _rangs(comp_md)

    # Les dés tiennent de DEUX chapitres : les faces, la dotation du tour et le
    # plafond d'une compétence viennent des actions ; le plafond d'une technique
    # vient des techniques. Chaque sous-clé suit donc son propre chapitre, et
    # l'absence de l'un ne prive pas l'autre. Le bloc entier disparaît s'il n'y
    # a rien dedans, plutôt que de sortir un « des » vide.
    des = {}
    if act_md is not None:
        des["faces"] = _ecrit(
            _un(r"dés à (\w+) faces", act_md, "dés : les faces").group(1),
            "dés : les faces")
        des["actionParTour"] = int(_un(r"reçoit (\d+) dés d'action", act_md,
                                       "dés : la dotation du tour").group(1))
        des["compMax"] = int(
            _un(r"engage 0 à (\d+) dés d'action pour employer une compétence",
                act_md, "dés : le plafond d'une compétence").group(1))
    if tech_md is not None:
        des["techniqueMax"] = int(
            _un(r"engage jusqu'à (\d+) dés d'action pour employer une technique",
                tech_md, "dés : le plafond d'une technique").group(1))
    if des:
        jeu["des"] = des

    if tech_md is not None:
        jeu["rupture"] = {"points": _ecrit(
            _un(r"possède (\w+) points de rupture", tech_md,
                "points de rupture").group(1),
            "points de rupture")}

    if capacites is not None:
        jeu["capacites"] = capacites
        # L'effondrement lit sa table et ses pourcentages dans le chapitre des
        # capacités, mais sa liste de réserves dans les capacités DÉJÀ LUES : il
        # ne survit pas à leur absence, et le confronter à une liste vide ferait
        # lever « aucune réserve nommée » pour une raison qui n'est pas la
        # bonne.
        jeu["effondrement"] = _effondrement(cap_md, capacites)

    if cap_md is not None:
        nu = _un(r"corps nu est à l'aise de (\d+) à (\d+) °C", cap_md,
                 "climat : la zone du corps nu")
        jeu["climat"] = {"nuBas": int(nu.group(1)), "nuHaut": int(nu.group(2))}

    if portees_md is not None:
        jeu["pas"] = float(
            _un(r"case vaut un pas.{0,200}?vaut ([\d.,]+) m", portees_md,
                "le pas", re.S).group(1).replace(",", "."))

    if equip_md is not None:
        piece = _un(r"en (pièces? d'[a-zéèê]+)", equip_md, "monnaie : son nom").group(1)
        vente = FRACTIONS.get(_plat(_un(r"vaut le (\w+) de l'achat", equip_md,
                                        "monnaie : le prix de vente").group(1)).lower())
        if vente is None:
            raise ErreurRegles("monnaie : la fraction de la vente ne se lit pas")
        jeu["monnaie"] = {"nom": re.sub(r"^pièces", "pièce", piece),
                          "pluriel": re.sub(r"^pièce\b", "pièces", piece),
                          "venteSurAchat": vente}

    # Le palier d'une arme vient de la table des cases, qui vit dans les
    # portées : sans ce chapitre, `_armes` inventerait la distance à laquelle
    # chaque famille travaille — donc pas d'armes du tout. Les trois types de
    # dégâts, eux, ne tiennent qu'au chapitre des armes et sortent quand même.
    if armes_md is not None:
        if portees_md is not None:
            jeu["armes"] = _armes(armes_md, portees_md)
        jeu["typesDegats"] = _types_degats(armes_md)

    return jeu


def on_files(files, config, **kwargs):
    jeu = _jeu(config["docs_dir"])
    absents = jeu.get("_absents")
    if absents:
        # AVERTISSEMENT, et surtout pas erreur : un chapitre pas encore écrit —
        # ou écrit mais pas encore committé, ce que la CI ne distingue pas — ne
        # doit pas emporter le déploiement du site entier. Le dire fort reste
        # nécessaire : un JSON silencieusement court se remarque le jour où la
        # fiche s'ouvre sans ses armes.
        LOG.warning(
            "%s : %d chapitre(s) de règles absent(s) — leurs sections sont "
            "omises du jeu de données (clé « _absents ») : %s",
            CIBLE, len(absents), ", ".join(absents))
    contenu = json.dumps(jeu, ensure_ascii=False, indent=1)
    files.append(File.generated(config, CIBLE, content=contenu))
    return files
