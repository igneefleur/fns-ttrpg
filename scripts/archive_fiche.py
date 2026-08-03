#!/usr/bin/env python3
"""Fige la version courante de la fiche JJK dans docs/fiche/v<release>/.

    python scripts/archive_fiche.py                # fige la version courante
    python scripts/archive_fiche.py --essai        # dit tout, n'écrit rien
    python scripts/archive_fiche.py --force        # re-fige une archive qui a bougé
    python scripts/archive_fiche.py --supprimer 2.1.0

POURQUOI UNE ARCHIVE
Le joueur qui ouvre un personnage écrit par une version antérieure a le droit
de le rouvrir DANS CETTE VERSION, pleinement jouable et enregistrable (modèle
Minecraft). Cela suppose que la version d'hier existe encore, entière, à un
chemin qui ne bougera plus.

Une archive contient SEPT fichiers, et les sept comptent :

  jjk-migrations.js   le moteur de migration (le bundle l'appelle en tête de
                      normalize() ; sans lui la fiche refuse de partir)
  jjk-mods.js         le moteur de mods. Le bundle vit sans lui (les mods ne
                      tournent simplement pas), et c'est précisément pourquoi
                      il doit être là : une archive à qui il manque ouvrirait
                      un personnage qui porte des mods SANS RIEN DIRE, ni
                      panne ni bandeau, comme si le personnage n'en avait
                      jamais eu.
  jjk-fiche.js        le bundle : toute la fiche
  jjk-fiche.css       le style de la fiche
  jjk-roll20.css      l'appoint iframe Roll20, posé APRÈS (il contre-épingle
                      la racine à 18 px) ; l'ordre est porté par le manifeste
  jjk-attr-map.js     la carte des Attributes Roll20 de cette version : c'est
                      elle qui sait relire l'état écrit à l'époque
  jjk-creation.json   les données de règles GELÉES À LEUR DATE

Le dernier est le moins évident et le plus important. Le bundle lit ses
compétences, ses stades et ses courbes dans un JSON produit au build depuis la
page de règles. Sans copie gelée, une archive lirait les règles d'AUJOURD'HUI :
un simple renommage de compétence, et le personnage qu'on croit rejouer tel
qu'il était perd une ligne. D'où le refus, ci-dessous, de figer un bundle qui
ne sait pas lire window.__jjkDataUrl : un tel bundle ne saurait pas où trouver
la copie gelée et retomberait sur celle du jour, en silence.

CHEMIN IMMUABLE
docs/fiche/v<release>/... et AUCUN ?v= nulle part là-dedans. Un ?v= sert à
casser un cache quand un fichier change ; ici rien ne change jamais, et un ?v=
qui bougerait ferait mentir la promesse d'immuabilité.

UN DOSSIER PAR RELEASE, PAS PAR SCHÉMA. Le blocage retenu est « release » :
l'écran de version paraît dès que le NUMÉRO diffère, même à schéma constant,
parce que 3.0.0 et 3.1.0 partagent la forme de l'état mais pas forcément les
règles gelées ni le code. Un dossier par schéma les ferait se recouvrir : le
manifeste garderait archives["3.0.0"] pointant sur un dossier réécrit par
3.1.0, et « ouvrir avec sa version » servirait l'autre version sans le dire.

Seule la bibliothèque standard est employée. mkdocs n'a même pas besoin d'être
installé : le hook est chargé par chemin et son import de mkdocs est bouché.
"""

import argparse
import importlib.util
import io
import json
import os
import re
import shutil
import sys
import types

RACINE_DEFAUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Les six fichiers COPIÉS tels quels, dans l'ordre où le manifeste les
# nommera. La septième pièce, jjk-creation.json, est PRODUITE (par le hook).
COPIES = [
    ("javascripts/jjk-migrations.js", "jjk-migrations.js"),
    ("javascripts/jjk-mods.js", "jjk-mods.js"),
    ("javascripts/jjk-fiche.js", "jjk-fiche.js"),
    ("stylesheets/jjk-fiche.css", "jjk-fiche.css"),
    ("stylesheets/jjk-roll20.css", "jjk-roll20.css"),
    ("javascripts/jjk-attr-map.js", "jjk-attr-map.js"),
]
DONNEES = "jjk-creation.json"
PAGE = "index.html"          # l'ouvre-archive : voir _page_archive()

# Les sept pièces exigées. Une archive à qui il en manque une n'est pas une
# archive : c'est un piège qui s'ouvrira à moitié le jour où on en aura besoin.
SEPT = [n for _, n in COPIES] + [DONNEES]


def lire(chemin):
    # utf-8-sig : le bundle porte une marque d'ordre des octets
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


def constantes_bundle(src):
    """(RELEASE, SCHEMA) déclarés dans le bundle, ou (None, None).

    Délibérément recopié de scripts/verif_versions.py plutôt qu'importé : ce
    script doit continuer à figer une version même le jour où l'autre change
    de forme, et deux expressions régulières de trois lignes ne valent pas un
    couplage entre deux outils de publication.
    """
    rel = re.search(r"""\b(?:var|let|const)\s+RELEASE\s*=\s*["']([^"']+)["']""", src)
    sch = re.search(r"""\b(?:var|let|const)\s+SCHEMA\s*=\s*(\d+)""", src)
    return (rel.group(1) if rel else None, int(sch.group(1)) if sch else None)


# ------------------------------------------------------------ le hook MkDocs
class _FileBouchon(object):
    """Ce que le hook croit fabriquer quand il appelle File.generated().

    On passe par on_files() plutôt que par la fonction d'extraction interne :
    c'est le VRAI point d'entrée du hook, celui que MkDocs appelle au build.
    Le JSON archivé est donc, à l'octet près, celui que le site sert le jour
    où l'archive est prise. Une évolution du hook (une clé de plus, une
    sérialisation différente) suit toute seule.
    """

    def __init__(self, nom, contenu):
        self.src_uri = nom
        self.content = contenu

    @classmethod
    def generated(cls, config, nom, content=None, **kw):
        return cls(nom, content)


def _bouchon_mkdocs():
    """Rend mkdocs.structure.files importable même sans mkdocs installé.

    Le hook fait « from mkdocs.structure.files import File » en tête. Ce
    script doit tourner dans un environnement nu (une machine de secours, un
    poste où seul python est là) : on ne remplace mkdocs que s'il manque.
    """
    try:
        import mkdocs.structure.files  # noqa: F401
        return
    except Exception:
        pass
    for nom in ("mkdocs", "mkdocs.structure", "mkdocs.structure.files"):
        if nom not in sys.modules:
            sys.modules[nom] = types.ModuleType(nom)
    sys.modules["mkdocs"].structure = sys.modules["mkdocs.structure"]
    sys.modules["mkdocs.structure"].files = sys.modules["mkdocs.structure.files"]
    sys.modules["mkdocs.structure.files"].File = _FileBouchon


def donnees_gelees(racine):
    """Le contenu de jjk-creation.json, produit par le hook, tel quel."""
    chemin = os.path.join(racine, "hooks", "jjk_creation.py")
    if not os.path.exists(chemin):
        raise RuntimeError("hooks/jjk_creation.py introuvable : "
                           "sans lui l'archive n'aurait pas ses données gelées")
    _bouchon_mkdocs()
    spec = importlib.util.spec_from_file_location("jjk_creation_pour_archive", chemin)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    # on force le bouchon MÊME quand mkdocs est là : le vrai File.generated()
    # réclame une configuration de build complète, qu'on n'a pas ici
    mod.File = _FileBouchon
    fichiers = []
    mod.on_files(fichiers, {"docs_dir": os.path.join(racine, "docs")})
    for f in fichiers:
        if getattr(f, "src_uri", None) == DONNEES:
            return f.content
    raise RuntimeError("le hook n'a pas produit " + DONNEES)


# ----------------------------------------------------------- l'ouvre-archive
def _page_archive(release, schema):
    """La page qui ouvre l'archive hors de Roll20.

    Elle ne fait pas partie des sept pièces exigées : dans Roll20, c'est
    l'amorceur gelé qui lit le manifeste et charge l'archive. Mais une archive
    qu'on ne peut pas ouvrir à la main est une archive que personne ne vérifie
    jamais ; celle-ci se suffit à elle-même et ne nomme que des fichiers de son
    propre dossier, sauf les polices, qui sont de la présentation et jamais des
    règles.
    """
    return """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Fiche JJK %(rel)s (archive)</title>
  <!-- ARCHIVE GELÉE de la fiche %(rel)s (schéma %(sch)d), produite par
       scripts/archive_fiche.py. Ne rien modifier ici à la main : le jour où
       un joueur rouvre un personnage dans cette version, c'est ce dossier
       qui doit répondre exactement ce qu'il répondait le jour de la sortie.

       Aucun ?v= : le chemin est immuable, donc rien ne change jamais, donc il
       n'y a aucun cache à casser. -->
  <link rel="stylesheet" href="../../stylesheets/fonts.css">
  <link rel="stylesheet" href="jjk-fiche.css">
  <link rel="stylesheet" href="jjk-roll20.css">
</head>
<body>
  <div id="perso-atelier">
    <noscript>La fiche a besoin de JavaScript.</noscript>
  </div>
  <script>
  // JOUR / NUIT avant le premier rendu, même règle que l'amorceur : indice
  // n=1/0 du hash, sinon la préférence locale, sinon le thème du navigateur.
  (function () {
    "use strict";
    try {
      var h = location.hash || "";
      var p = null;
      try { p = localStorage.getItem("jjk-r20-night"); } catch (e) {}
      var on = p === "1" ? true : p === "0" ? false
             : /[#&]n=1/.test(h) ? true : /[#&]n=0/.test(h) ? false
             : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("night", on);
    } catch (e) {}
  })();
  // LE RACCORD QUI FAIT L'ARCHIVE. Sans lui, le bundle retombe sur le
  // jjk-creation.json de la RACINE du site, c'est-à-dire sur les règles
  // d'aujourd'hui : la fiche s'ouvrirait sans erreur et mentirait.
  window.__jjkDataUrl = "jjk-creation.json";
  </script>
  <script src="jjk-attr-map.js"></script>
  <script src="jjk-migrations.js"></script>
  <script src="jjk-mods.js"></script>
  <script src="jjk-fiche.js"></script>
</body>
</html>
""" % {"rel": release, "sch": schema}


# ------------------------------------------------------------- le manifeste
def _fin_de_ligne(octets):
    """Le saut de ligne dominant du fichier, pour le réécrire comme il était.

    Le dépôt est travaillé sous Windows : le manifeste est en CRLF. Réécrire
    en LF ferait un diff de tout le fichier à chaque archivage, et la vraie
    modification, une clé de plus, s'y perdrait.
    """
    crlf = octets.count(b"\r\n")
    return "\r\n" if crlf and crlf >= octets.count(b"\n") - crlf else "\n"


def maj_manifeste(chemin, release, schema, essai=False, retirer=None):
    """Ajoute (ou retire) une entrée sous « archives », sans toucher au reste.

    Le manifeste est lu par l'amorceur gelé ET par l'écran de version : on ne
    le RÉÉCRIT PAS, on le relit, on pose la seule clé qui nous regarde et on
    rend le document dans son ordre d'origine. json.loads conserve l'ordre des
    clés, et « archives » existe déjà : sa place ne bouge pas.
    """
    with open(chemin, "rb") as f:
        octets = f.read()
    nl = _fin_de_ligne(octets)
    man = json.loads(octets.decode("utf-8"))

    archives = man.get("archives")
    if not isinstance(archives, dict):
        archives = {}
    avant = json.dumps(archives, sort_keys=True)

    if retirer is not None:
        archives.pop(retirer, None)
    else:
        base = "fiche/v%s/" % release
        archives[release] = {
            "schema": schema,
            "js": [base + "jjk-migrations.js", base + "jjk-mods.js",
                   base + "jjk-fiche.js"],
            "css": [base + "jjk-fiche.css", base + "jjk-roll20.css"],
            "attrmap": base + "jjk-attr-map.js",
            "data": base + DONNEES,
        }
    man["archives"] = archives
    change = json.dumps(archives, sort_keys=True) != avant

    if not essai:
        texte = json.dumps(man, ensure_ascii=False, indent=2) + "\n"
        with open(chemin, "wb") as f:
            f.write(texte.replace("\n", nl).encode("utf-8"))
    return change


# ------------------------------------------------------------------- marche
def figer(racine, essai=False, force=False):
    docs = os.path.join(racine, "docs")
    bundle = os.path.join(docs, "javascripts", "jjk-fiche.js")
    manifeste = os.path.join(docs, "jjk-manifeste.json")
    fautes = []

    if not os.path.exists(bundle):
        return ["bundle introuvable : docs/javascripts/jjk-fiche.js"]
    if not os.path.exists(manifeste):
        return ["manifeste introuvable : docs/jjk-manifeste.json"]

    src = lire(bundle)
    release, schema = constantes_bundle(src)
    if not release or not schema:
        return ["le bundle ne déclare pas RELEASE et SCHEMA : rien à figer"]

    # LE REFUS QUI PROTÈGE L'ARCHIVE. Un bundle qui ne lit pas
    # window.__jjkDataUrl ira chercher jjk-creation.json à la racine du site,
    # donc les règles du jour, même servi depuis docs/fiche/v3.0.0/. L'archive
    # aurait l'air complète et serait fausse : on refuse de la fabriquer.
    if "__jjkDataUrl" not in src:
        return ["le bundle ne lit pas window.__jjkDataUrl : archive refusée "
                "(elle lirait le jjk-creation.json du jour, pas le sien)"]

    dest = os.path.join(docs, "fiche", "v%s" % release)
    print("  fiche %s, schéma %d -> docs/fiche/v%s/" % (release, schema, release))

    # ce qu'on va poser, en mémoire d'abord : rien n'est écrit tant qu'une
    # pièce manque à l'appel
    a_poser = {}
    for rel, nom in COPIES:
        chemin = os.path.join(docs, rel.replace("/", os.sep))
        if not os.path.exists(chemin):
            fautes.append("pièce manquante : docs/" + rel)
            continue
        with open(chemin, "rb") as f:
            a_poser[nom] = f.read()   # copie BINAIRE : une archive se fige à l'octet
    try:
        a_poser[DONNEES] = donnees_gelees(racine).encode("utf-8")
    except Exception as e:
        fautes.append("données gelées : %s" % e)
    a_poser[PAGE] = _page_archive(release, schema).encode("utf-8")

    manquantes = [n for n in SEPT if not a_poser.get(n)]
    if manquantes:
        fautes.append("archive incomplète, il manque : " + ", ".join(manquantes))
    if fautes:
        return fautes

    # Une archive déjà posée ne se réécrit pas en silence : si son contenu a
    # bougé, c'est que quelqu'un publie deux fois le même numéro avec deux
    # codes différents, et c'est exactement ce qu'une archive doit rendre
    # impossible.
    if os.path.isdir(dest):
        diffs = []
        for nom in sorted(a_poser):
            ancien = os.path.join(dest, nom)
            if not os.path.exists(ancien):
                diffs.append(nom + " (absent)")
                continue
            with open(ancien, "rb") as f:
                if f.read() != a_poser[nom]:
                    diffs.append(nom)
        if not diffs:
            print("  archive déjà gelée, identique à l'octet près")
        elif not force:
            return ["docs/fiche/v%s/ existe déjà et diffère (%s) ; une archive "
                    "est immuable. Reprendre avec --force seulement si cette "
                    "version n'a jamais été publiée." % (release, ", ".join(diffs))]
        else:
            print("  --force : %d fichier(s) réécrit(s) (%s)" % (len(diffs), ", ".join(diffs)))

    if not essai:
        if not os.path.isdir(dest):
            os.makedirs(dest)
        for nom in sorted(a_poser):
            with open(os.path.join(dest, nom), "wb") as f:
                f.write(a_poser[nom])
    for nom in SEPT:
        print("    %-20s %7d octets" % (nom, len(a_poser[nom])))
    print("    %-20s %7d octets (ouvre-archive, hors des sept)" % (PAGE, len(a_poser[PAGE])))

    # contrôle APRÈS écriture : ce qui compte est ce qui est sur le disque
    if not essai:
        absents = [n for n in SEPT if not os.path.exists(os.path.join(dest, n))]
        if absents:
            return ["archive incomplète sur le disque : " + ", ".join(absents)]

    change = maj_manifeste(manifeste, release, schema, essai=essai)
    print("  manifeste : archives[%s] %s" % (release, "ajoutée" if change else "inchangée"))
    return []


def supprimer(racine, release, essai=False):
    """Retire une vieille archive (dossier + entrée du manifeste).

    NE TOUCHE JAMAIS docs/javascripts/jjk-migrations.js. Les pas de migration
    ne s'élaguent pas, même quand le bundle correspondant disparaît : un
    personnage n'a pas besoin de repasser par les versions intermédiaires,
    mais la CHAÎNE, elle, doit rester contiguë pour le traverser. Un pas retiré
    troue la chaîne, et appliquer() refuse alors de partir : une fiche de cette
    époque ne remonte plus du tout.
    """
    docs = os.path.join(racine, "docs")
    manifeste = os.path.join(docs, "jjk-manifeste.json")
    with open(manifeste, "rb") as f:
        man = json.loads(f.read().decode("utf-8"))
    if release == str(man.get("release", "")):
        return ["%s est la version COURANTE : ce n'est pas une vieille archive" % release]
    entree = (man.get("archives") or {}).get(release)
    if not entree:
        return ["aucune archive %s au manifeste" % release]
    schema = entree.get("schema")
    # Un dossier par RELEASE : personne d'autre ne le nomme, il part avec son
    # entrée. (Un dossier par schéma aurait été partagé par 3.0.0 et 3.1.0, et
    # en retirer une aurait emporté l'autre.)
    if not essai:
        maj_manifeste(manifeste, release, schema, retirer=release)
        dossier = os.path.join(docs, "fiche", "v%s" % release)
        if os.path.isdir(dossier):
            shutil.rmtree(dossier)
    print("  archive %s retirée (avec docs/fiche/v%s/)" % (release, release))
    print("  jjk-migrations.js : intact, les pas ne s'élaguent pas")
    return []


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Fige la version courante de la fiche JJK.")
    p.add_argument("--racine", default=RACINE_DEFAUT,
                   help="racine du dépôt (défaut : le parent de scripts/)")
    p.add_argument("--essai", action="store_true", help="dit tout, n'écrit rien")
    p.add_argument("--force", action="store_true",
                   help="réécrit une archive qui a bougé (version jamais publiée)")
    p.add_argument("--supprimer", metavar="RELEASE",
                   help="retire une vieille archive ; n'élague AUCUN pas de migration")
    a = p.parse_args()

    print("ARCHIVE" + (" (essai)" if a.essai else ""))
    if a.supprimer:
        fautes = supprimer(a.racine, a.supprimer, essai=a.essai)
    else:
        fautes = figer(a.racine, essai=a.essai, force=a.force)
    if fautes:
        print("ARCHIVE : %d faute(s)" % len(fautes))
        for f in fautes:
            print("  - " + f)
        return 1
    print("ARCHIVE : rien à signaler")
    return 0


if __name__ == "__main__":
    sys.exit(main())
