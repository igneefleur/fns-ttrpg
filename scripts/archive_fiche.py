#!/usr/bin/env python3
"""Fige la LIGNE courante de la fiche JJK dans docs/fiche/v<release>/.

    python scripts/archive_fiche.py                # ouvre la ligne, si elle est neuve
    python scripts/archive_fiche.py --essai        # dit tout, n'écrit rien
    python scripts/archive_fiche.py --force        # reprend un dossier jamais publié
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

UN DOSSIER PAR LIGNE X.Y, PAS PAR SCHÉMA NI PAR RELEASE. Une ligne s'ouvre à sa
première release (3.6.0 ouvre la ligne 3.6) et le dossier garde ce nom-là ; les
correctifs de la ligne (3.6.1, 3.6.2…) ne gèlent plus rien, parce qu'un Z ne
touche jamais au format des données du personnage. Un personnage qui porte
« 3.6.4 » se fait donc servir par l'archive 3.6.0 : il redescend d'un ou deux
correctifs, jamais d'une forme d'état.

Un dossier par SCHÉMA, lui, ferait se recouvrir des versions qui ne se
ressemblent pas : le manifeste garderait archives["3.0.0"] pointant sur un
dossier réécrit par 3.1.0, et « ouvrir avec sa version » servirait l'autre
version sans le dire. C'est ce raisonnement qui interdit tout regroupement plus
large que la ligne.

LE SUFFIXE « b » NE VOYAGE NULLE PART. Sur la branche de chantier, le bundle
porte « 3.6.0b » : le dossier s'appelle quand même v3.6.0/, la clé du manifeste
est « 3.6.0 », ET LE CONTENU GELÉ AUSSI. Le bundle copié y déclare RELEASE
« 3.6.0 », l'attr-map RELEASE_DEFAUT « 3.6.0 », la page d'archive s'intitule
« Fiche JJK 3.6.0 ». Le gel se fait sur le numéro NU de bout en bout.

Deux raisons, et la seconde est la plus dure. Sans dépouillement du NOM, la
fusion vers la branche stable amènerait un v3.6.0b/ immuable, doublon de la même
ligne, et la recherche par ligne aurait deux archives concurrentes selon la
branche qui a publié. Sans dépouillement du CONTENU, le nom serait bien le même,
mais geler la ligne depuis le stable produirait des octets DIFFÉRENTS de ceux
gelés depuis le chantier ; or figer() compare octet à octet, et il n'aurait plus
qu'un choix : refuser la publication, ou réécrire une archive immuable. Une
archive appartient à sa ligne, pas à la branche qui l'a gelée.

Seule la bibliothèque standard est employée. mkdocs n'a même pas besoin d'être
installé : le hook est chargé par chemin et son import de mkdocs est bouché.
"""

import argparse
import importlib.util
import io
import json
import os
import shutil
import sys
import types

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import version_fiche as V  # noqa: E402  (la grammaire du numéro, partagée)

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

# LES DEUX PIÈCES QUI NOMMENT LEUR VERSION, et donc les deux seules à dépouiller
# de leur suffixe avant le gel. Les feuilles de style ne disent aucun numéro, le
# moteur de migration compte en schémas, et le JSON de règles est produit tel
# quel par le hook. Voir l'en-tête : le gel se fait sur le numéro NU.
DENUDE = {
    "jjk-fiche.js": V.bundle_denude,
    "jjk-attr-map.js": V.attrmap_denude,
}


def lire(chemin):
    # utf-8-sig : le bundle porte une marque d'ordre des octets
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


def _octets_denudes(nom, octets, cle):
    """Les octets à geler, numéro dépouillé du suffixe « b ». Rend (octets, faute).

    Décodage en « utf-8 » et NON en « utf-8-sig » : ainsi la marque d'ordre des
    octets reste un caractère de la chaîne et repart telle quelle dans le
    fichier gelé. Tout ce qui n'est pas le numéro se recopie à l'octet près, y
    compris les fins de ligne, sans quoi le gel dépendrait de la machine qui
    l'exécute autant que de la branche.

    La faute rendue est un REFUS, jamais un repli : une archive est immuable, et
    une archive fausse ne se rattrape plus après coup.
    """
    denude = DENUDE.get(nom)
    if denude is None:
        return (octets, None)
    try:
        src = octets.decode("utf-8")
    except UnicodeDecodeError:
        return (octets, "%s n'est pas lisible en utf-8 : son numéro ne peut pas "
                "être dépouillé de son suffixe" % nom)
    neuf, ancien, nu = denude(src)
    if ancien is None:
        return (octets, "%s ne déclare pas son numéro de version : gelé tel quel, "
                "il ne dirait pas de quelle version il est" % nom)
    if nu is None:
        return (octets, "%s annonce le numéro %r, que la grammaire refuse : %s"
                % (nom, ancien, V.faute_de_forme(ancien)))
    if nu != cle:
        # Le seul moment où l'on peut encore le dire. Une fois l'archive posée,
        # un attr-map resté à 3.5.0 dans le dossier v3.6.0/ relira pour toujours
        # les personnages avec la carte d'une autre version, sans un mot.
        return (octets, "%s annonce %s alors que la ligne se gèle en %s : les "
                "pièces d'une archive portent toutes le même numéro" % (nom, ancien, cle))
    if neuf == src:
        return (octets, None)      # déjà nu : les octets d'origine, intacts
    return (neuf.encode("utf-8"), None)


# La lecture du numéro était recopiée ici, au nom du découplage entre outils de
# publication. Le suffixe « b » a montré ce que coûtait cette copie : le jour où
# une expression régulière apprend une forme, les autres continuent de la
# rejeter sans un mot. Elle vit maintenant dans scripts/version_fiche.py, avec
# la retenue et la réduction en ligne X.Y, et tout le monde y lit la même chose.
constantes_bundle = V.constantes_bundle


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
def _page_archive(cle, schema):
    """La page qui ouvre l'archive hors de Roll20.

    Elle ne fait pas partie des sept pièces exigées : dans Roll20, c'est
    l'amorceur gelé qui lit le manifeste et charge l'archive. Mais une archive
    qu'on ne peut pas ouvrir à la main est une archive que personne ne vérifie
    jamais ; celle-ci se suffit à elle-même et ne nomme que des fichiers de son
    propre dossier, sauf les polices, qui sont de la présentation et jamais des
    règles.

    Elle est titrée de la CLÉ, jamais de la release : c'est la clé qui nomme la
    ligne gelée, et un « Fiche JJK 3.6.0b (archive) » ferait dire à la même
    archive deux choses différentes selon la branche qui l'a produite.
    """
    return """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Fiche JJK %(cle)s (archive)</title>
  <!-- ARCHIVE GELÉE de la ligne %(cle)s (schéma %(sch)d), produite par
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
""" % {"cle": cle, "sch": schema}


# ------------------------------------------------------------- le manifeste
# Le saut de ligne dominant se lit dans la grammaire partagée : le manifeste est
# en CRLF, et le réécrire en LF ferait un diff de tout le fichier à chaque
# archivage, où la vraie modification, une clé de plus, se perdrait. Le nom
# privé reste : scripts/release_fiche.py le prend ici.
_fin_de_ligne = V.fin_de_ligne


def maj_manifeste(chemin, cle, schema, essai=False, retirer=None):
    """Ajoute (ou retire) une entrée sous « archives », sans toucher au reste.

    « cle » est le numéro NU (sans le suffixe « b ») : c'est la release qui a
    ouvert la ligne, et c'est aussi le nom du dossier.

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
        base = "fiche/v%s/" % cle
        archives[cle] = {
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
    # « schema is None » et non « not schema » : le schéma est un entier libre,
    # détaché du majeur, et rien ne lui interdit de valoir 0 un jour.
    if not release or schema is None:
        return ["le bundle ne déclare pas RELEASE et SCHEMA : rien à figer"]
    faute = V.faute_de_forme(release)
    if faute:
        return ["le bundle annonce RELEASE %s" % faute]
    version = V.lire(release)
    # La CLÉ et le DOSSIER portent le numéro NU : sur le chantier le bundle
    # s'appelle « 3.6.0b » et l'archive « 3.6.0 ». Voir l'en-tête.
    cle = version.nu

    with open(manifeste, "rb") as f:
        man = json.loads(f.read().decode("utf-8"))
    publiees = man.get("archives")
    if not isinstance(publiees, dict):
        publiees = {}

    # --FORCE NE TOUCHE PAS À CE QUI EST SORTI. L'entrée au manifeste est le
    # seul témoin dont le dépôt dispose, et elle ne veut dire qu'une chose :
    # cette version est publiée, des personnages ont pu être ouverts avec. La
    # réécrire ferait tourner un autre code sous le même nom, pour toujours.
    # --force ne sert donc qu'à une ligne dont le dossier traîne sur le disque
    # (une publication interrompue avant le manifeste) sans avoir jamais paru.
    if force and cle in publiees:
        return ["--force refusé : archives[%s] figure au manifeste, donc cette "
                "version est SORTIE et son archive est immuable. --force ne "
                "reprend qu'un dossier posé sur le disque et jamais publié." % cle]

    # LA LIGNE DÉCIDE, ET ELLE SEULE. Dès qu'une archive répond pour la ligne
    # courante, la ligne est OUVERTE et rien ne se gèle : ni un correctif (un Z
    # ne touche pas au format des données du personnage, l'archive de la ligne
    # sait déjà le relire), ni la release qui a ouvert la ligne elle-même.
    # Ce dernier cas est celui qui bloquait tout : la porte se décidait sur
    # « servante != cle », or en essai le numéro n'est pas encore posé, le
    # bundle lit encore 3.6.0b, sa clé nue 3.6.0 est ÉGALE à l'archive déjà
    # gelée, la porte ne s'ouvrait pas, et la publication d'un simple correctif
    # de CSS repartait geler une archive immuable pour s'arrêter dessus.
    # Sortir sans faute, et le DIRE : sans ce mot, un auteur croirait à une
    # panne le jour où l'étape ne pose plus de dossier.
    servante = V.archive_de_ligne(man, release)
    if servante is not None:
        print("  fiche %s : la ligne %s est déjà ouverte par l'archive %s"
              % (release, version.ligne, servante))
        if servante == cle:
            print("  c'est l'archive de CE numéro : la ligne est ouverte, il n'y "
                  "a rien à regeler")
        else:
            print("  un correctif ne gèle rien (seuls X et Y ouvrent une ligne)")
        if force:
            # ne pas avaler le --force en silence : il ne veut rien dire ici, et
            # ne conseiller aucun --supprimer, que supprimer() refuserait de
            # toute façon sur la ligne courante
            print("  --force ne rouvre pas une ligne : cette archive est immuable, "
                  "et elle sert la version publiée. Il n'y a rien à en reprendre.")
        return []

    dest = os.path.join(docs, "fiche", "v%s" % cle)
    print("  fiche %s, schéma %d -> docs/fiche/v%s/ (ligne %s)"
          % (release, schema, cle, version.ligne))
    if cle != release:
        print("  le suffixe « b » ne passe pas : dossier, clé ET contenu gelé "
              "portent le numéro nu %s" % cle)

    # LE REFUS QUI PROTÈGE L'ARCHIVE. Un bundle qui ne lit pas
    # window.__jjkDataUrl ira chercher jjk-creation.json à la racine du site,
    # donc les règles du jour, même servi depuis docs/fiche/v3.0.0/. L'archive
    # aurait l'air complète et serait fausse : on refuse de la fabriquer.
    if "__jjkDataUrl" not in src:
        return ["le bundle ne lit pas window.__jjkDataUrl : archive refusée "
                "(elle lirait le jjk-creation.json du jour, pas le sien)"]

    # ce qu'on va poser, en mémoire d'abord : rien n'est écrit tant qu'une
    # pièce manque à l'appel
    a_poser = {}
    for rel, nom in COPIES:
        chemin = os.path.join(docs, rel.replace("/", os.sep))
        if not os.path.exists(chemin):
            fautes.append("pièce manquante : docs/" + rel)
            continue
        with open(chemin, "rb") as f:
            octets = f.read()   # copie BINAIRE : une archive se fige à l'octet
        # à un mot près : le numéro, dépouillé de son suffixe de chantier
        octets, faute = _octets_denudes(nom, octets, cle)
        if faute:
            fautes.append(faute)
        a_poser[nom] = octets
    try:
        a_poser[DONNEES] = donnees_gelees(racine).encode("utf-8")
    except Exception as e:
        fautes.append("données gelées : %s" % e)
    a_poser[PAGE] = _page_archive(cle, schema).encode("utf-8")

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
                    "version n'a jamais été publiée." % (cle, ", ".join(diffs))]
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

    change = maj_manifeste(manifeste, cle, schema, essai=essai)
    print("  manifeste : archives[%s] %s (ligne %s ouverte)"
          % (cle, "ajoutée" if change else "inchangée", version.ligne))
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
    # La comparaison porte sur la LIGNE, pas sur le texte. Avec une release
    # 3.6.4b et une archive 3.6.0, l'égalité de chaîne est fausse : elle
    # laisserait retirer l'archive qui sert la ligne du jour, et « ouvrir avec
    # sa version » n'aurait plus rien pour toute la ligne.
    #
    # DEUX LIGNES SE PROTÈGENT, PAS UNE. Le manifeste dit ce que le site
    # ANNONCE, le bundle dit ce qui TOURNE, et les deux divergent le temps d'une
    # publication interrompue ou d'un fichier ramené en arrière. N'en regarder
    # qu'un laissait retirer l'archive de la ligne de l'autre, que figer()
    # refuserait ensuite de reposer, la ligne étant déjà ouverte.
    protegees = []
    for texte in (str(man.get("release", "")), V.courante(racine) or ""):
        l = V.ligne(texte)
        if l is not None and l not in protegees:
            protegees.append(l)
    if V.ligne(release) in protegees:
        return ["%s est de la ligne COURANTE (%s) : cette archive sert la version "
                "publiée, ce n'est pas une vieille archive"
                % (release, V.ligne(release))]
    entree = (man.get("archives") or {}).get(release)
    if not entree:
        return ["aucune archive %s au manifeste" % release]
    schema = entree.get("schema")
    # Un dossier par LIGNE : personne d'autre ne le nomme, il part avec son
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
    p = argparse.ArgumentParser(description="Fige la ligne courante de la fiche JJK.")
    p.add_argument("--racine", default=RACINE_DEFAUT,
                   help="racine du dépôt (défaut : le parent de scripts/)")
    p.add_argument("--essai", action="store_true", help="dit tout, n'écrit rien")
    p.add_argument("--force", action="store_true",
                   help="reprend un dossier d'archive posé sur le disque et JAMAIS "
                        "publié au manifeste ; refusé sur une version sortie")
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
