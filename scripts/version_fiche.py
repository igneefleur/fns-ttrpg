#!/usr/bin/env python3
"""Le NUMÉRO de version du projet JJK : sa forme, sa montée, ses trois porteurs.

    python scripts/version_fiche.py                  # dit où en est le numéro
    python scripts/version_fiche.py --petit          # du CSS, une erreur mineure
    python scripts/version_fiche.py --moyen          # un petit module, une grosse erreur corrigée
    python scripts/version_fiche.py --majeur         # une fonctionnalité entière
    python scripts/version_fiche.py --poser 3.6.0    # numéro imposé
    python scripts/version_fiche.py --stable         # retire le suffixe (fusion vers la branche stable)
    python scripts/version_fiche.py --petit --essai  # dit tout, n'écrit rien

UNE SEULE LIGNE DE VERSIONS pour le projet entier : la fiche du site stable, la
fiche du chantier et l'extension. Forme « X.Y.Z », chaque nombre de 0 à 999.

  X monte pour une grosse mise à jour (une fonctionnalité entière) ;
  Y monte pour une moyenne (un petit module, la correction d'une grosse erreur) ;
  Z monte pour une petite (du CSS, une erreur mineure). Un Z ne doit JAMAIS
    toucher au format des données du personnage : c'est cette promesse, et elle
    seule, qui autorise l'archive par ligne (voir plus bas).

RETENUE. 999 plus 1 rend 0 et monte le cran du dessus : 3.12.999 plus un
correctif rend 3.13.0, et 3.999.999 plus un correctif rend 4.0.0. C'est ce qui
permet de garder trois nombres bornés sans jamais reculer.

LE SUFFIXE « b » EST CELUI DU CHANTIER, ET IL NE CHANGE PAS LE RANG. « 3.12.9b »
et « 3.12.9 » sont de même rang, parce que la beta EST ce que le stable recevra
à la fusion. Le réflexe semver, qui range une pré-version SOUS la version
finale, ferait passer un personnage écrit sur la beta pour venu du passé dès
qu'il serait rouvert sur le site stable du même numéro : c'est exactement ce
qu'il ne faut pas. Le suffixe ne sert qu'à une chose, montrer au joueur qu'il
est sur le chantier.

LA LIGNE « X.Y » est ce qui gèle une archive : une archive par ligne, prise à la
première release de la ligne. Un Z ne gèle plus rien, et un personnage qui porte
« 3.6.4 » (ou « 3.6.4b ») se fait servir par l'archive de la ligne 3.6.

LE PLANCHER N'EST PAS LE BUNDLE, mais le plus haut des trois porteurs. Un seul
fichier ramené en arrière (un « git checkout » d'un ancien bundle, le temps
d'une bissection) ne doit pas pouvoir faire RESSORTIR un numéro déjà publié,
sous lequel des personnages sont écrits. Voir plancher().

Ce fichier est à la fois l'OUTIL qui monte le numéro et la GRAMMAIRE que les
autres scripts de publication importent (verif_versions, archive_fiche,
release_fiche, ci_extension). Une seule lecture du numéro pour tout le monde :
tant qu'elle était recopiée d'un script à l'autre, le jour où l'un apprenait le
suffixe, les autres continuaient de le rejeter sans un mot.

Seule la bibliothèque standard est employée : ces outils doivent tourner là où
mkdocs n'est même pas installé.
"""

import argparse
import io
import json
import os
import re
import sys

MAX = 999
# du plus gros au plus petit : l'ordre sert aussi à nommer le nombre fautif
CRANS = ("majeur", "moyen", "petit")

# Les TROIS porteurs du numéro. Ils montent ensemble ou le site ment sur
# lui-même : le bundle est ce qui TOURNE, le manifeste est ce que le site
# ANNONCE, et RELEASE_DEFAUT est ce que la fiche INSCRIT dans le personnage
# quand le manifeste n'a pas répondu.
#
# LE NUMÉRO S'ÉCRIT DANS LA SOURCE, PAS DANS LE FICHIER ENGENDRÉ. Depuis que le
# bundle est assemblé de morceaux, écrire dans docs/javascripts/jjk-fiche.js ne
# tient qu'un instant : le prochain assemblage le refabrique à partir des
# morceaux et RAMÈNE l'ancien numéro, sans que rien ne le signale. On écrit donc
# dans le morceau qui porte RELEASE, et l'assemblage propage. Le fichier engendré
# reste NOMMÉ ici, parce que c'est encore lui qu'on LIT (il est ce qui tourne) et
# lui que les contrôles comparent au manifeste.
BUNDLE_SRC = os.path.join("src", "fiche", "socle", "020-version.js")
BUNDLE = os.path.join("docs", "javascripts", "jjk-fiche.js")
ATTRMAP = os.path.join("docs", "javascripts", "jjk-attr-map.js")
MANIFESTE = os.path.join("docs", "jjk-manifeste.json")
MKDOCS = "mkdocs.yml"

_MOTIF = re.compile(r"^(\d+)\.(\d+)\.(\d+)(b?)$")
# groupe 1 : ce qui précède la valeur, groupe 2 : la valeur, groupe 3 : le guillemet
_RELEASE_JS = re.compile(r"""(\b(?:var|let|const)\s+RELEASE\s*=\s*["'])([^"']*)(["'])""")
_SCHEMA_JS = re.compile(r"""\b(?:var|let|const)\s+SCHEMA\s*=\s*(\d+)""")
_DEFAUT_JS = re.compile(r"""(\bRELEASE_DEFAUT\s*=\s*["'])([^"']*)(["'])""")


# ------------------------------------------------------------- la grammaire
class Version(object):
    """Un numéro du contrat, lu et démonté une bonne fois."""

    def __init__(self, x, y, z, beta=False):
        self.x = x
        self.y = y
        self.z = z
        self.beta = bool(beta)

    @property
    def rang(self):
        """Ce qui sert à COMPARER : trois nombres, sans le suffixe.

        Le « b » en est volontairement absent : deux numéros qui ne diffèrent
        que par lui sont de même rang, voir l'en-tête.
        """
        return (self.x, self.y, self.z)

    @property
    def ligne(self):
        """« X.Y » : ce qui désigne une archive."""
        return "%d.%d" % (self.x, self.y)

    @property
    def nu(self):
        """Le numéro sans son suffixe : ce qui nomme un dossier d'archive, et ce
        que porte l'extension, qui n'a jamais de suffixe."""
        return "%d.%d.%d" % (self.x, self.y, self.z)

    def texte(self):
        return self.nu + ("b" if self.beta else "")

    def avec_suffixe(self, beta):
        return Version(self.x, self.y, self.z, beta)

    def __str__(self):
        return self.texte()

    def __repr__(self):
        return "Version(%s)" % self.texte()


def faute_de_forme(texte):
    """Ce qui cloche dans ce numéro, en français, ou None s'il est conforme.

    Un simple booléen ne suffisait pas : « 3.6.1000 » et « 3.6.0-beta » sont
    faux pour deux raisons très différentes, et l'auteur doit lire laquelle.
    """
    if not isinstance(texte, str) or not texte.strip():
        return "%r n'est pas un numéro de version" % (texte,)
    t = texte.strip()
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)(.*)$", t)
    if not m:
        return "%r n'est pas un numéro X.Y.Z" % texte
    if m.group(4) not in ("", "b"):
        return ("%r : le seul suffixe admis est « b », celui de la branche de "
                "chantier (« 3.6.0-beta » ou « 3.6.0.1 » n'en sont pas)" % texte)
    for cran, brut in zip(CRANS, m.group(1, 2, 3)):
        if len(brut) > 1 and brut[0] == "0":
            return ("%r : le %s s'écrit sans zéro en tête, sinon deux textes "
                    "différents nommeraient le même rang" % (texte, cran))
        if int(brut) > MAX:
            return ("%r : le %s vaut %s, or chaque nombre va de 0 à %d "
                    "(au-delà, la retenue monte le cran du dessus)"
                    % (texte, cran, brut, MAX))
    return None


def lire(texte):
    """La Version, ou None si le texte n'est pas conforme au contrat."""
    if faute_de_forme(texte):
        return None
    m = _MOTIF.match(str(texte).strip())
    return Version(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                   m.group(4) == "b")


def rang(texte):
    v = lire(texte)
    return v.rang if v else None


def ligne(texte):
    """« 3.6 » pour « 3.6.4b », None pour ce qui n'est pas un numéro.

    Rendre None, et non « 3.0 », sur un « 3 » saisi à la main : sinon un
    personnage dont la version est tronquée se ferait servir l'archive 3.0.0,
    dont il ne vient pas.
    """
    v = lire(texte)
    return v.ligne if v else None


def compare(a, b):
    """-1, 0 ou 1 sur le RANG. None dès que l'un des deux est illisible.

    Le repli silencieux (« illisible, donc égal ») est précisément ce qui a
    rendu la panne du suffixe invisible du côté des mods : ici l'appelant voit
    le None et décide lui-même quoi en dire.
    """
    ra, rb = rang(a), rang(b)
    if ra is None or rb is None:
        return None
    return -1 if ra < rb else (1 if ra > rb else 0)


def monter(v, cran):
    """La version suivante, RETENUE comprise, suffixe conservé.

    Lève ValueError au-delà de 999.999.999 : il n'y a rien au-dessus, et
    fabriquer un « 1000 » ferait un numéro que plus aucun de ces outils ne sait
    relire.
    """
    if cran not in CRANS:
        raise ValueError("cran inconnu : %r (majeur, moyen ou petit)" % (cran,))
    x, y, z = v.rang
    if cran == "petit":
        z += 1
        if z > MAX:
            z = 0
            y += 1
    elif cran == "moyen":
        z = 0
        y += 1
    else:
        z = 0
        y = 0
        x += 1
    if y > MAX:
        y = 0
        x += 1
    if x > MAX:
        raise ValueError("%s plus un cran %s dépasse 999.999.999 : il n'y a "
                         "plus de place au-dessus" % (v.texte(), cran))
    return Version(x, y, z, v.beta)


# ------------------------------------------------------------- les archives
def archives_lisibles(man):
    """{clé: Version} des archives du manifeste dont la clé est un numéro valide."""
    out = {}
    for cle in (man.get("archives") or {}):
        v = lire(cle)
        if v:
            out[cle] = v
    return out


def archive_de_ligne(man, texte):
    """La clé d'archive qui SERT ce numéro : la plus récente de sa ligne X.Y.

    Même règle que archiveDe() de l'amorceur, et pour la même raison : le
    personnage porte « 3.6.4b » quand le manifeste ne publie que « 3.6.0 ».
    Chercher par clé exacte ne trouverait rien et griserait « ouvrir avec sa
    version » pour toute la ligne.

    Le choix est NUMÉRIQUE et déterministe : un tri de chaînes rangerait
    « 3.1.10 » sous « 3.1.2 », et l'ordre des clés d'un JSON n'est pas un
    critère (un futur tri du document le changerait).

    LE DÉPARTAGE EST CELUI DE L'AMORCEUR, à la lettre : à rang égal, c'est la
    clé la plus PETITE qui tranche (parcours par clés triées, comparaison
    STRICTE, donc la première rencontrée gagne). L'amorceur départageait ainsi
    et cette fonction préférait la clé sans suffixe puis la plus GRANDE : deux
    règles qui se ressemblent assez pour rendre la divergence invisible, et le
    jour où elles ne nomment pas la même archive, la publication gèle un dossier
    que Roll20 n'ouvre pas.
    """
    l = ligne(texte)
    if l is None:
        return None
    retenue, haut = None, None
    for cle, v in sorted(archives_lisibles(man).items()):
        if v.ligne != l:
            continue
        if haut is None or v.rang > haut:
            retenue, haut = cle, v.rang
    return retenue


# ------------------------------------------------------------- les fichiers
def lire_fichier(chemin):
    # utf-8-sig : le bundle et mkdocs.yml portent une marque d'ordre des octets
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


def fin_de_ligne(octets):
    """Le saut de ligne dominant du fichier, pour le réécrire comme il était.

    Le dépôt est travaillé sous Windows : le manifeste est en CRLF. Réécrire en
    LF ferait un diff de tout le fichier à chaque publication, et la vraie
    modification, un numéro, s'y perdrait.
    """
    crlf = octets.count(b"\r\n")
    return "\r\n" if crlf and crlf >= octets.count(b"\n") - crlf else "\n"


def constantes_bundle(src):
    """(RELEASE, SCHEMA) déclarés dans le bundle, ou (None, None).

    var, let ou const, guillemets simples ou doubles : le but est de TROUVER la
    constante, pas d'imposer une façon de l'écrire.
    """
    rel = _RELEASE_JS.search(src)
    sch = _SCHEMA_JS.search(src)
    return (rel.group(2) if rel else None, int(sch.group(1)) if sch else None)


def release_attrmap(src):
    """RELEASE_DEFAUT de jjk-attr-map.js, ou None.

    C'est le numéro que la fiche inscrit dans le `max` de jjk_version quand le
    manifeste n'est pas là (node, amorceur de secours). Laissé en arrière, il
    fait dire à des personnages Roll20 qu'ils ont été écrits par une version
    qui n'existe plus.
    """
    m = _DEFAUT_JS.search(src)
    return m.group(2) if m else None


def _denuder(src, motif):
    """La source, son numéro privé du suffixe « b ». Rend (source, ancien, nu).

    Trois réponses distinctes, parce que l'appelant doit pouvoir REFUSER plutôt
    que deviner : (src, None, None) quand la constante est absente, (src,
    ancien, None) quand elle est là mais illisible, et la source dépouillée
    sinon. Un numéro déjà nu rend la source d'ORIGINE, inchangée : ce qui se
    fige se fige à l'octet, et un aller-retour de plus n'a rien à y toucher.
    """
    m = motif.search(src)
    if not m:
        return (src, None, None)
    ancien = m.group(2)
    v = lire(ancien)
    if v is None:
        return (src, ancien, None)
    if v.nu == ancien:
        return (src, ancien, v.nu)
    return (motif.sub(lambda mm: mm.group(1) + v.nu + mm.group(3), src, count=1),
            ancien, v.nu)


def bundle_denude(src):
    """Le bundle dont RELEASE a perdu le suffixe « b » du chantier.

    Sert au GEL d'une archive : une archive appartient à sa LIGNE, pas à la
    branche qui l'a gelée, et le même dossier doit sortir octet pour octet du
    chantier et du stable. Voir scripts/archive_fiche.py.
    """
    return _denuder(src, _RELEASE_JS)


def attrmap_denude(src):
    """L'attr-map dont RELEASE_DEFAUT a perdu le suffixe « b » du chantier."""
    return _denuder(src, _DEFAUT_JS)


def manifeste(racine):
    """Le manifeste du site, ou None s'il est absent ou illisible."""
    chemin = os.path.join(racine, MANIFESTE)
    if not os.path.exists(chemin):
        return None
    try:
        with open(chemin, "rb") as f:
            return json.loads(f.read().decode("utf-8"))
    except (ValueError, IOError, OSError):
        return None


def chantier(racine):
    """True si ce dépôt est la branche de CHANTIER, d'après site_url.

    Le marqueur est VERSIONNÉ et jamais git : les sondes recopient docs/,
    hooks/, scripts/ et mkdocs.yml dans un bac qui n'est pas un dépôt, et ces
    outils doivent y dire la même chose qu'ici. Rend None quand mkdocs.yml ne
    dit rien : on ne devine pas une branche, on se tait.
    """
    chemin = os.path.join(racine, MKDOCS)
    if not os.path.exists(chemin):
        return None
    try:
        src = lire_fichier(chemin)
    except (IOError, OSError, UnicodeDecodeError):
        return None
    m = re.search(r"^\s*site_url\s*:\s*(\S+)", src, re.M)
    if not m:
        return None
    return m.group(1).strip("'\"").rstrip("/").endswith("/jjk-beta")


def porteurs(racine):
    """[(nom, chemin, numéro lu ou None)] pour les trois porteurs, dans l'ordre."""
    out = []
    for nom, rel in (("bundle", BUNDLE), ("manifeste", MANIFESTE),
                     ("attr-map", ATTRMAP)):
        chemin = os.path.join(racine, rel)
        valeur = None
        if os.path.exists(chemin):
            if nom == "bundle":
                valeur = constantes_bundle(lire_fichier(chemin))[0]
            elif nom == "attr-map":
                valeur = release_attrmap(lire_fichier(chemin))
            else:
                man = manifeste(racine)
                valeur = man.get("release") if isinstance(man, dict) else None
        out.append((nom, chemin, valeur if isinstance(valeur, str) else None))
    return out


def courante(racine):
    """Le numéro du BUNDLE : celui du code qui tourne, donc la référence.

    Le manifeste dit ce que le site sert, mais c'est le bundle qui s'exécute :
    quand les deux divergent, le bundle a raison sur ce qui tourne, et
    verif_versions.py se charge de crier qu'ils divergent.

    Ce que le bundle N'EST PAS : un plancher. Il dit le présent, pas le passé.
    Pour savoir sous quel numéro on ne redescend plus, voir plancher().
    """
    chemin = os.path.join(racine, BUNDLE)
    if not os.path.exists(chemin):
        return None
    return constantes_bundle(lire_fichier(chemin))[0]


def plancher(racine):
    """Le plus haut numéro que porte ce dépôt : (Version, [porteurs qui le portent]).

    LE BUNDLE SEUL NE FAIT PAS UN PLANCHER, et c'est le piège qui a coûté un
    numéro republié. Un « git checkout <ancien> -- docs/javascripts/jjk-fiche.js »
    (une bissection, une reprise de correctif) ramène le bundle à 3.6.1b sans un
    mot, pendant que le manifeste, lui, annonce toujours le 3.6.4b SORTI. Monter
    d'un cran depuis le bundle rendait alors 3.6.2b : un numéro déjà servi, sous
    lequel des personnages sont écrits, et deux codes différents portant le même
    nom pour toujours.

    Le plancher est donc le MAXIMUM des trois porteurs, et rien ne passe en
    dessous. Rend (None, []) quand aucun ne dit un numéro lisible.
    """
    haut, noms = None, []
    for nom, _, valeur in porteurs(racine):
        v = lire(valeur) if valeur else None
        if v is None:
            continue
        if haut is None or v.rang > haut.rang:
            haut, noms = v, [nom]
        elif v.rang == haut.rang:
            noms.append(nom)
    return (haut, noms)


def _et(noms):
    """« bundle, manifeste et attr-map » : une énumération qui se lit."""
    if len(noms) < 2:
        return "".join(noms)
    return ", ".join(noms[:-1]) + " et " + noms[-1]


def _poser_js(chemin, motif, texte, essai):
    """Remplace la valeur d'une constante JS sans toucher au reste du fichier.

    Le fichier est relu en OCTETS puis réécrit tel quel à un mot près : la
    marque d'ordre des octets reste dans la chaîne décodée et les fins de ligne
    ne sont jamais retouchées. Un aller-retour moins prudent ferait un diff de
    tout le fichier, où la seule ligne qui compte se perdrait.
    """
    with open(chemin, "rb") as f:
        src = f.read().decode("utf-8")
    neuf, n = motif.subn(lambda m: m.group(1) + texte + m.group(3), src, count=1)
    if n == 0 or neuf == src:
        return False
    if not essai:
        with open(chemin, "wb") as f:
            f.write(neuf.encode("utf-8"))
    return True


def poser(racine, texte, essai=False):
    """Écrit le numéro dans les trois porteurs. Rend (touchés, absents).

    Le manifeste n'est pas réécrit à partir de rien : il est relu, la seule clé
    qui nous regarde est posée, et il repart dans son ordre d'origine avec ses
    fins de ligne d'origine.
    """
    touches, absents = [], []

    # LA SOURCE D'ABORD, ET LE FICHIER ENGENDRÉ ENSUITE. Écrire seulement dans
    # docs/javascripts/jjk-fiche.js ne tiendrait pas : le prochain assemblage le
    # refabrique depuis les morceaux et ramène l'ancien numéro, en silence. On
    # pose donc dans le morceau qui porte RELEASE ; le fichier engendré est mis à
    # jour dans la foulée pour que tout ce qui le LIT (le plancher, les contrôles,
    # release_fiche) voie le bon numéro sans attendre un assemblage.
    #
    # Si la source n'existe pas — dépôt d'avant le découpage — on se contente du
    # fichier engendré, comme autrefois.
    bs = os.path.join(racine, BUNDLE_SRC)
    if os.path.exists(bs) and _poser_js(bs, _RELEASE_JS, texte, essai):
        touches.append("source du bundle")

    b = os.path.join(racine, BUNDLE)
    if not os.path.exists(b):
        absents.append("bundle")
    elif _poser_js(b, _RELEASE_JS, texte, essai):
        touches.append("bundle")

    a = os.path.join(racine, ATTRMAP)
    if not os.path.exists(a):
        absents.append("attr-map")
    elif _poser_js(a, _DEFAUT_JS, texte, essai):
        touches.append("attr-map")

    m = os.path.join(racine, MANIFESTE)
    if not os.path.exists(m):
        absents.append("manifeste")
    else:
        with open(m, "rb") as f:
            octets = f.read()
        nl = fin_de_ligne(octets)
        man = json.loads(octets.decode("utf-8"))
        if man.get("release") != texte:
            man["release"] = texte
            touches.append("manifeste")
            if not essai:
                sortie = json.dumps(man, ensure_ascii=False, indent=2) + "\n"
                with open(m, "wb") as f:
                    f.write(sortie.replace("\n", nl).encode("utf-8"))
    return (touches, absents)


# ------------------------------------------------------------------- marche
def decider(racine, cran=None, impose=None, suffixe=None):
    """Le numéro à poser : (Version, None), ou (None, faute) en français.

    Tout part du PLANCHER, jamais du seul bundle : c'est de lui qu'un cran
    monte, et aucune cible ne passe en dessous. Voir plancher().

    suffixe : True (chantier), False (stable), None (d'après mkdocs.yml).
    """
    brut = courante(racine)
    if brut is None:
        return (None, "le bundle ne déclare pas RELEASE : rien à monter")
    faute = faute_de_forme(brut)
    if faute:
        return (None, "numéro courant illisible, " + faute)
    v = lire(brut)

    # LE PLANCHER, ET NON LE SEUL BUNDLE : voir plancher(). On part de lui, on
    # monte depuis lui, et on ne redescend pas sous lui. Un bundle ramené en
    # arrière se fait ainsi remonter au lieu de faire ressortir un numéro.
    sol, portants = plancher(racine)
    if sol is None:
        # le bundle vient d'être lu et il est conforme : il porte au moins ça
        sol, portants = v, ["bundle"]

    if impose is not None:
        faute = faute_de_forme(impose)
        if faute:
            return (None, faute)
        cible = lire(impose)
    elif cran is not None:
        try:
            cible = monter(sol, cran)
        except ValueError as e:
            return (None, str(e))
    else:
        cible = sol

    if suffixe is None:
        c = chantier(racine)
        # mkdocs.yml muet : on garde le suffixe tel quel plutôt que de le
        # retirer par défaut, ce qui ferait passer une beta pour un stable
        suffixe = cible.beta if c is None else c
    cible = cible.avec_suffixe(suffixe)

    porte = _et(portants)
    if cible.rang < sol.rang:
        return (None, "%s est en dessous de %s, que porte %s : un numéro ne "
                "recule jamais" % (cible.texte(), sol.texte(), porte))
    if cible.rang == sol.rang:
        # MÊME RANG, deux cas très différents. Demander un cran ou --poser,
        # c'est vouloir un numéro NEUF : le rendre égal au plus haut porteur le
        # ferait sortir deux fois, et c'est refusé. Ne rien demander d'autre que
        # le suffixe, en revanche, ne republie rien : le contrat dit que le
        # suffixe ne change pas le rang, donc « 3.6.4b » qui devient « 3.6.4 »
        # à la fusion est le MÊME numéro et le même code.
        if cran is not None or impose is not None:
            try:
                suite = " (le cran --petit rendrait %s)" % monter(
                    sol, "petit").avec_suffixe(suffixe).texte()
            except ValueError:
                suite = ""
            return (None, "%s est déjà porté par %s : le numéro demandé doit "
                    "être STRICTEMENT au-dessus du plus haut des porteurs%s"
                    % (cible.texte(), porte, suite))
        if cible.texte() == v.texte():
            return (None, "%s est déjà le numéro courant : préciser un cran "
                    "(--majeur, --moyen, --petit) ou --poser" % cible.texte())

    # NON-RECUL sous une version DÉJÀ GELÉE, en plus du plancher : une archive
    # survit à ses porteurs. Les trois peuvent être ramenés en arrière ensemble
    # (une branche reprise de trop loin) ; le dossier gelé, lui, reste, et il
    # est la seule mémoire dont le dépôt dispose, ni git (qui peut manquer dans
    # un bac de sonde) ni le réseau.
    man = manifeste(racine)
    if isinstance(man, dict):
        for cle, av in sorted(archives_lisibles(man).items()):
            if av.rang > cible.rang:
                return (None, "l'archive %s est au-dessus de %s : le numéro "
                        "reculerait sous une version déjà gelée"
                        % (cle, cible.texte()))
    return (cible, None)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(
        description="Dit et monte le numéro de version du projet JJK.")
    p.add_argument("--racine",
                   default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    p.add_argument("--essai", action="store_true", help="dit tout, n'écrit rien")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--majeur", action="store_true", help="une fonctionnalité entière")
    g.add_argument("--moyen", action="store_true",
                   help="un petit module, une grosse erreur corrigée")
    g.add_argument("--petit", action="store_true", help="du CSS, une erreur mineure")
    g.add_argument("--poser", metavar="X.Y.Z", help="numéro imposé")
    s = p.add_mutually_exclusive_group()
    s.add_argument("--chantier", action="store_true", help="force le suffixe « b »")
    s.add_argument("--stable", action="store_true", help="retire le suffixe « b »")
    a = p.parse_args()

    racine = a.racine
    print("VERSION" + (" (essai)" if a.essai else ""))
    brut = courante(racine)
    v = lire(brut) if brut else None
    c = chantier(racine)
    print("  courante : %s" % (brut if brut else "aucune (le bundle est muet)"))
    if v:
        print("  ligne    : %s" % v.ligne)
    elif brut:
        print("  ligne    : illisible, %s" % faute_de_forme(brut))
    print("  branche  : %s" % ("chantier, suffixe « b » obligatoire" if c
                               else ("stable, aucun suffixe" if c is False
                                     else "inconnue : mkdocs.yml ne dit pas site_url")))
    for nom, _, valeur in porteurs(racine):
        print("  %-9s: %s" % (nom, valeur if valeur else "non déclaré"))
    sol, portants = plancher(racine)
    if sol is not None:
        # Sans cette ligne, l'auteur dont le bundle a été ramené en arrière
        # lirait « 3.6.1b -> 3.6.5b » sans comprendre d'où sort le 4 : le cran
        # ne part pas du bundle, il part du plus haut des porteurs.
        note = (" (le bundle est en dessous : un cran repart d'ici)"
                if v is not None and sol.rang > v.rang else "")
        print("  plancher : %s, porté par %s%s" % (sol.texte(), _et(portants), note))
    man = manifeste(racine)
    if isinstance(man, dict) and v:
        arch = archive_de_ligne(man, brut)
        print("  archive  : %s" % ("%s (ligne %s)" % (arch, v.ligne) if arch
                                   else "aucune pour la ligne %s" % v.ligne))

    cran = "majeur" if a.majeur else ("moyen" if a.moyen else ("petit" if a.petit else None))
    suffixe = True if a.chantier else (False if a.stable else None)
    if cran is None and a.poser is None and suffixe is None:
        return 0

    # CHANGER LE SEUL SUFFIXE N'EST PAS UNE MONTÉE, et ne doit pas être jugé
    # comme telle. « 3.6.0b » et « 3.6.0 » sont de MÊME RANG par contrat : le
    # comparateur refusait donc de poser le second par-dessus le premier, au
    # motif qu'il n'était pas « strictement au-dessus ». Autrement dit --stable
    # ne savait pas faire son unique travail dans le seul cas où on l'appelle :
    # une fusion vers la branche stable, où le tronc n'a justement pas bougé.
    # Le manifeste gardait son « b » pendant que le bundle l'avait perdu, et la
    # fiche annonçait deux numéros différents selon qui la lisait.
    if cran is None and a.poser is None and suffixe is not None:
        cible = Version(v.x, v.y, v.z, beta=suffixe)
        faute = None
    else:
        cible, faute = decider(racine, cran=cran, impose=a.poser, suffixe=suffixe)
    if faute:
        print("VERSION : " + faute)
        return 1
    print("")
    print("  %s -> %s" % (brut, cible.texte()))
    touches, absents = poser(racine, cible.texte(), essai=a.essai)
    print("  porteurs : %s" % (", ".join(touches) or "aucun (déjà à ce numéro)"))
    if absents:
        print("  ABSENTS  : %s" % ", ".join(absents))
        return 1
    # la ligne de départ est celle du PLANCHER, puisque c'est de lui que la
    # cible a été tirée : annoncer celle du bundle ferait promettre un gel
    # d'archive là où la ligne ne bouge pas (ou l'inverse)
    depart = sol.ligne if sol is not None else v.ligne
    if depart != cible.ligne:
        print("  la ligne passe de %s à %s : la prochaine publication GÈLE une "
              "archive" % (depart, cible.ligne))
    else:
        print("  même ligne %s : la publication ne gèle aucune archive" % cible.ligne)
    print("VERSION : %s" % ("essai, rien d'écrit" if a.essai else "posée"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
