#!/usr/bin/env python3
"""Le NUMÉRO de version du projet Outward : sa forme, sa montée, ses trois porteurs.

    python scripts/version_fiche.py                  # dit où en est le numéro
    python scripts/version_fiche.py --petit          # du CSS, une erreur mineure
    python scripts/version_fiche.py --moyen          # un petit module, une grosse erreur corrigée
    python scripts/version_fiche.py --majeur         # une fonctionnalité entière
    python scripts/version_fiche.py --poser 1.2.0    # numéro imposé
    python scripts/version_fiche.py --stable         # retire le suffixe (fusion vers la branche stable)
    python scripts/version_fiche.py --petit --essai  # dit tout, n'écrit rien

UNE SEULE LIGNE DE VERSIONS pour le projet entier : la fiche du site stable, la
fiche de la beta et l'extension. Forme « X.Y.Z », chaque nombre de 0 à 999.

  X monte pour une grosse mise à jour (une fonctionnalité entière) ;
  Y monte pour une moyenne (un petit module, la correction d'une grosse erreur) ;
  Z monte pour une petite (du CSS, une erreur mineure). Un Z ne doit JAMAIS
    toucher au format des données du personnage : c'est cette promesse, et elle
    seule, qui autorise de servir un personnage d'un correctif antérieur sans
    lui faire traverser une migration.

RETENUE. 999 plus 1 rend 0 et monte le cran du dessus : 3.12.999 plus un
correctif rend 3.13.0, et 3.999.999 plus un correctif rend 4.0.0. C'est ce qui
permet de garder trois nombres bornés sans jamais reculer.

LE SUFFIXE « b » EST CELUI DE LA BETA, ET IL NE CHANGE PAS LE RANG. « 1.2.9b »
et « 1.2.9 » sont de même rang, parce que la beta EST ce que le stable recevra
à la fusion. Le réflexe semver, qui range une pré-version SOUS la version
finale, ferait passer un personnage écrit sur la beta pour venu du passé dès
qu'il serait rouvert sur le site stable du même numéro : c'est exactement ce
qu'il ne faut pas. Le suffixe ne sert qu'à une chose, montrer au joueur qu'il
est sur la beta.

LE PLANCHER N'EST PAS LE BUNDLE, mais le plus haut des trois porteurs. Un seul
fichier ramené en arrière (un « git checkout » d'un ancien bundle, le temps
d'une bissection) ne doit pas pouvoir faire RESSORTIR un numéro déjà publié,
sous lequel des personnages sont écrits. Voir plancher().

CE QU'OUTWARD NE PORTE PAS : les archives de fiche. La branche sœur gèle un
dossier par ligne X.Y et son outillage relit ces dossiers comme une mémoire
(non-recul sous une version déjà gelée, gel du schéma d'une ligne). Ici,
« archives » vaut {} au manifeste : il n'y a pas d'ancienne version à rouvrir,
donc pas de mémoire d'archive à consulter, et le plancher des trois porteurs est
la seule chose qui empêche un numéro de ressortir. Le jour où une archive
existera, c'est ici que sa lecture reviendra, et nulle part ailleurs.

Ce fichier est à la fois l'OUTIL qui monte le numéro et la GRAMMAIRE que les
autres scripts de publication importent (verif_versions, release_fiche,
ci_extension). Une seule lecture du numéro pour tout le monde : tant qu'elle
était recopiée d'un script à l'autre, le jour où l'un apprenait le suffixe, les
autres continuaient de le rejeter sans un mot.

CE QUI SE DÉCLARE ICI, ET NULLE PART AILLEURS : la forme du numéro, les chemins
de ses porteurs (BUNDLE, ATTRMAP, MANIFESTE, MKDOCS), la lecture d'un fichier du
site, et la forme des ?v= de mkdocs.yml. Les autres outils les IMPORTENT. Chacun
les recopiait, et une copie ne se corrige jamais deux fois le même jour.

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
# LE BUNDLE S'ÉCRIT DIRECTEMENT, il n'est le produit d'aucun assembleur : la
# branche sœur découpe le sien en morceaux et doit poser le numéro dans la
# SOURCE, faute de quoi le prochain collage ramènerait l'ancien numéro sans un
# mot. Ici le fichier servi est le fichier écrit, et poser() n'a qu'une porte.
BUNDLE = os.path.join("docs", "javascripts", "owd-fiche.js")
ATTRMAP = os.path.join("docs", "javascripts", "owd-attr-map.js")
MANIFESTE = os.path.join("docs", "owd-manifeste.json")
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
        """« X.Y » : la ligne de correctifs à laquelle ce numéro appartient."""
        return "%d.%d" % (self.x, self.y)

    @property
    def nu(self):
        """Le numéro sans son suffixe : ce que porte l'extension, qui n'en a
        jamais."""
        return "%d.%d.%d" % (self.x, self.y, self.z)

    def texte(self):
        return self.nu + ("b" if self.beta else "")

    def avec_suffixe(self, beta):
        return Version(self.x, self.y, self.z, beta)

    # PAS DE __str__ NI DE __repr__ ICI, ET C'EST VOULU. Le numéro se demande
    # par son nom — texte(), nu, ligne, rang — parce que ces quatre réponses ne
    # sont pas la même et que le suffixe « b » se perd trop facilement. Un
    # « %s » qui rendrait tout seul le texte suffixé ferait écrire « 1.0.0b »
    # là où l'extension, elle, ne porte jamais de suffixe. Formater une Version
    # rend donc « <Version object at …> », ce qui se voit tout de suite.


def faute_de_forme(texte):
    """Ce qui cloche dans ce numéro, en français, ou None s'il est conforme.

    Un simple booléen ne suffirait pas : « 1.0.1000 » et « 1.0.0-beta » sont
    faux pour deux raisons très différentes, et l'auteur doit lire laquelle.
    """
    if not isinstance(texte, str) or not texte.strip():
        return "%r n'est pas un numéro de version" % (texte,)
    t = texte.strip()
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)(.*)$", t)
    if not m:
        return "%r n'est pas un numéro X.Y.Z" % texte
    if m.group(4) not in ("", "b"):
        return ("%r : le seul suffixe admis est « b », celui de la branche "
                "beta (« 1.0.0-beta » ou « 1.0.0.1 » n'en sont pas)" % texte)
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
    """« 1.2 » pour « 1.2.4b », None pour ce qui n'est pas un numéro.

    Rendre None, et non « 1.0 », sur un « 1 » saisi à la main : un numéro
    tronqué n'appartient à aucune ligne, et le deviner ferait ranger un
    personnage dans une ligne dont il ne vient pas.
    """
    v = lire(texte)
    return v.ligne if v else None


def compare(a, b):
    """-1, 0 ou 1 sur le RANG. None dès que l'un des deux est illisible.

    C'est ici que se lit la règle qui fonde tout le contrat : « 1.2.9b » et
    « 1.2.9 » sont de MÊME RANG. Le repli silencieux (« illisible, donc égal »)
    est précisément ce qui rend une panne de suffixe invisible ; ici l'appelant
    voit le None et décide lui-même quoi en dire.
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


# ------------------------------------------------------------- les fichiers
def lire_fichier(chemin):
    # utf-8-sig : un fichier écrit sous Windows peut porter une marque d'ordre
    # des octets, qui n'a rien à faire dans le texte qu'on relit
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


def fin_de_ligne(octets):
    """Le saut de ligne dominant du fichier, pour le réécrire comme il était.

    Le dépôt est travaillé sous Windows. Réécrire en LF un fichier en CRLF (ou
    l'inverse) ferait un diff de tout le fichier à chaque publication, et la
    vraie modification, un numéro, s'y perdrait.
    """
    crlf = octets.count(b"\r\n")
    return "\r\n" if crlf and crlf >= octets.count(b"\n") - crlf else "\n"


# ---------------------------------------------------- les ?v= (clés de cache)
# LE ?v= N'EST PAS UN NUMÉRO DE VERSION, et il vit pourtant ici : ce fichier est
# le seul endroit qui sache déjà où sont mkdocs.yml et le manifeste, et la FORME
# d'une ligne « - javascripts/owd-fiche.js?v=3 » serait sinon écrite deux fois,
# mot pour mot, dans verif_versions.py et dans release_fiche.py. L'un contrôle
# que les deux côtés disent le même ?v=, l'autre les monte : le jour où l'un des
# deux apprend une forme de ligne que l'autre ignore, le contrôle passe sur ce
# que la montée n'a pas touché, et deux mondes font tourner deux codes en
# croyant le même.
_LIGNE_MKDOCS = re.compile(
    r"^\s*-\s*([^\s#]+\.(?:js|css))(?:\?v=([^\s#]+))?\s*(?:#.*)?$")


def sans_v(url):
    """L'URL débarrassée de sa clé de cache : « a.js?v=3 » rend « a.js »."""
    return url.split("?", 1)[0]


def serial_v(url):
    """La clé de cache d'une URL, ou None si elle n'en porte pas."""
    m = re.search(r"[?&]v=([^&\s#]+)", url)
    return m.group(1) if m else None


def serials_mkdocs(src):
    """{ 'javascripts/owd-fiche.js': '3' } d'après extra_css et extra_javascript.

    La valeur est None pour un fichier nommé SANS ?v= : « pas de clé de cache »
    et « fichier absent du site » sont deux réponses différentes, et l'appelant
    a besoin de les distinguer.
    """
    out = {}
    # « brute » et non « ligne » : ligne() est une fonction de ce module, et
    # l'ombrer ici la rendrait introuvable au premier besoin.
    for brute in src.splitlines():
        m = _LIGNE_MKDOCS.match(brute)
        if m:
            out[m.group(1)] = m.group(2)
    return out


# ------------------------------------------------------------ les constantes
def constantes_bundle(src):
    """(RELEASE, SCHEMA) déclarés dans le bundle, ou (None, None).

    var, let ou const, guillemets simples ou doubles : le but est de TROUVER la
    constante, pas d'imposer une façon de l'écrire.
    """
    rel = _RELEASE_JS.search(src)
    sch = _SCHEMA_JS.search(src)
    return (rel.group(2) if rel else None, int(sch.group(1)) if sch else None)


def release_attrmap(src):
    """RELEASE_DEFAUT de owd-attr-map.js, ou None.

    C'est le numéro que la fiche inscrit dans le `max` de owd_version quand le
    manifeste n'est pas là (node, amorceur de secours). Laissé en arrière, il
    fait dire à des personnages Roll20 qu'ils ont été écrits par une version
    qui n'existe plus.
    """
    m = _DEFAUT_JS.search(src)
    return m.group(2) if m else None


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


def branche_beta(racine):
    """True si ce dépôt est la branche BETA, d'après site_url.

    À ne pas confondre avec Version.beta, qui dit tout autre chose : celui-ci
    juge le DÉPÔT, celui-là le NUMÉRO. C'est justement leur accord que
    scripts/verif_versions.py contrôle.

    LE MARQUEUR EST « /owd-beta », ET C'EST LE PORTAGE LE PLUS SILENCIEUX DE
    TOUTE LA CHAÎNE. Laissé sur le nom d'une autre branche, cette fonction rend
    False ici, et verif_versions.py reproche alors à « 1.0.0b » de porter un
    suffixe « qui n'appartient qu'à la beta » — un refus incompréhensible sur
    une branche qui EST la beta.

    Le marqueur est VERSIONNÉ et jamais git : une copie du dépôt posée hors d'un
    dépôt (un bac d'essai qui recopie docs/, hooks/, scripts/ et mkdocs.yml)
    doit dire la même chose qu'ici. Rend None quand mkdocs.yml ne dit rien : on
    ne devine pas une branche, on se tait.
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
    return m.group(1).strip("'\"").rstrip("/").endswith("/owd-beta")


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

    LE BUNDLE SEUL NE FAIT PAS UN PLANCHER. Un « git checkout <ancien> --
    docs/javascripts/owd-fiche.js » (une bissection, une reprise de correctif)
    ramène le bundle en arrière sans un mot, pendant que le manifeste, lui,
    annonce toujours le numéro SORTI. Monter d'un cran depuis le bundle rendrait
    alors un numéro déjà servi, sous lequel des personnages sont écrits, et deux
    codes différents porteraient le même nom pour toujours.

    Le plancher est donc le MAXIMUM des trois porteurs, et rien ne passe en
    dessous. Rend (None, []) quand aucun ne dit un numéro lisible.

    C'EST LA SEULE MÉMOIRE DU DÉPÔT ICI. La branche sœur en a une deuxième, les
    archives gelées, qui survit à ses trois porteurs ramenés ensemble en
    arrière ; Outward n'en a pas. Ramener les trois d'un coup fait donc reculer
    le plancher, et rien ne le rattrapera : c'est le prix assumé de ne pas
    porter les archives, et la raison de ne jamais reprendre une branche de
    trop loin.
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

    suffixe : True (beta), False (stable), None (d'après mkdocs.yml).
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
        c = branche_beta(racine)
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
        # suffixe ne change pas le rang, donc « 1.0.0b » qui devient « 1.0.0 »
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

    return (cible, None)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(
        description="Dit et monte le numéro de version du projet Outward.")
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
    s.add_argument("--beta", action="store_true", help="force le suffixe « b »")
    s.add_argument("--stable", action="store_true", help="retire le suffixe « b »")
    a = p.parse_args()

    racine = a.racine
    print("VERSION" + (" (essai)" if a.essai else ""))
    brut = courante(racine)
    v = lire(brut) if brut else None
    c = branche_beta(racine)
    print("  courante : %s" % (brut if brut else "aucune (le bundle est muet)"))
    if v:
        print("  ligne    : %s" % v.ligne)
    elif brut:
        print("  ligne    : illisible, %s" % faute_de_forme(brut))
    print("  branche  : %s" % ("beta, suffixe « b » obligatoire" if c
                               else ("stable, aucun suffixe" if c is False
                                     else "inconnue : mkdocs.yml ne dit pas site_url")))
    for nom, _, valeur in porteurs(racine):
        print("  %-9s: %s" % (nom, valeur if valeur else "non déclaré"))
    sol, portants = plancher(racine)
    if sol is not None:
        # Sans cette ligne, l'auteur dont le bundle a été ramené en arrière
        # lirait « 1.0.1b -> 1.0.5b » sans comprendre d'où sort le 4 : le cran
        # ne part pas du bundle, il part du plus haut des porteurs.
        note = (" (le bundle est en dessous : un cran repart d'ici)"
                if v is not None and sol.rang > v.rang else "")
        print("  plancher : %s, porté par %s%s" % (sol.texte(), _et(portants), note))

    cran = "majeur" if a.majeur else ("moyen" if a.moyen else ("petit" if a.petit else None))
    suffixe = True if a.beta else (False if a.stable else None)
    if cran is None and a.poser is None and suffixe is None:
        return 0

    # CHANGER LE SEUL SUFFIXE N'EST PAS UNE MONTÉE, et ne doit pas être jugé
    # comme telle. « 1.0.0b » et « 1.0.0 » sont de MÊME RANG par contrat : le
    # comparateur refuserait donc de poser le second par-dessus le premier, au
    # motif qu'il n'est pas « strictement au-dessus ». Autrement dit --stable ne
    # saurait pas faire son unique travail dans le seul cas où on l'appelle :
    # une fusion vers la branche stable, où le tronc n'a justement pas bougé. Le
    # manifeste garderait son « b » pendant que le bundle l'aurait perdu, et la
    # fiche annoncerait deux numéros différents selon qui la lit.
    if cran is None and a.poser is None and suffixe is not None:
        if v is None:
            print("VERSION : le bundle ne déclare pas de RELEASE lisible : il "
                  "n'y a pas de numéro dont changer le suffixe")
            return 1
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
    print("VERSION : %s" % ("essai, rien d'écrit" if a.essai else "posée"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
