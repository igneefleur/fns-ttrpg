#!/usr/bin/env python3
"""Vérification des numéros de version de la fiche JJK.

    python scripts/verif_versions.py
    python scripts/verif_versions.py --archive-differee   # pendant un essai de publication

Huit choses peuvent se désynchroniser en silence, et chacune se paie sur la
fiche d'un joueur :

  1. LA FORME du numéro publié et sa concordance entre ses TROIS porteurs (le
     bundle, le manifeste, RELEASE_DEFAUT de la carte d'attributs). Le contrat
     dit « X.Y.Z », chaque nombre de 0 à 999, plus le suffixe « b » de la
     branche de chantier, qui doit être là sur le chantier et absent ailleurs :
     c'est ce suffixe, et lui seul, qui montre au joueur qu'il est sur la beta.
  2. LE RECUL. Une archive est immuable : republier sous une version déjà gelée
     ferait servir un code à un numéro qui en désigne un autre. La seule mémoire
     dont ce script dispose est le manifeste (ni git, qui peut manquer, ni le
     réseau), donc les clés d'archives. L'extension, elle, ne doit pas repasser
     sous sa dernière signature, que Mozilla refuserait. Ces deux contrôles ne
     se comparent PAS l'un à l'autre : les trois numéros du projet avancent
     chacun quand ils ont une raison d'avancer.
  3. LE SCHÉMA de l'état. Il ne suit plus le majeur : c'est un entier libre, qui
     ne monte que lorsque la FORME de l'état du personnage change. Il se juge
     contre le manifeste, contre la chaîne de migrations, qui doit être contiguë
     et monter exactement jusqu'à lui (un cran de moins, et une fiche déjà migrée
     trouve un moteur qui refuse de la redescendre), et contre L'ARCHIVE QUI SERT
     LA LIGNE : à l'intérieur d'une ligne X.Y, le schéma ne bouge pas, parce
     qu'un Z ne touche jamais au format des données du personnage.
  4. LE MODE DE BLOCAGE du manifeste. « schema » est le réglage attendu ; en
     « release », un simple correctif de CSS sort l'écran de version chez tous
     les joueurs, à toutes les tables, pour un code qui lit et écrit exactement
     les mêmes données. C'est une note, pas une faute : le contrat n'interdit pas
     ce réglage, l'amorceur le sert pour de bon, et un outil qui refuserait de
     passer sur un réglage licite se ferait contourner tout entier.
  5. les ?v= de mkdocs.yml et ceux de docs/jjk-manifeste.json. Le site charge le
     bundle par mkdocs.yml, Roll20 le charge par le manifeste : deux numéros
     différents, et les deux mondes ne font pas tourner le même code. (Le ?v=
     est une clé de cache, jamais un numéro de version : les aligner sur X.Y.Z
     ferait retélécharger la fiche à contretemps.)
  6. une URL absolue dans le manifeste. L'amorceur gelé la refuse déjà
     (roll20-fiche.html, fonction sure()) et retombe alors sur son repli sans
     ?v= : la panne est muette, la fiche a l'air de marcher.
  7. docs/javascripts/jjk-mods.js, oublié du manifeste ou d'une archive. Le
     bundle vit très bien sans lui : les mods d'un personnage cessent alors
     d'exister, sans bandeau, sans panne et sans un mot. C'est la seule panne du
     lot qui ne laisse aucune trace, donc la seule qu'il faut attraper avant la
     publication.
  8. la LIGNE X.Y de la version publiée, restée sans archive. Une archive se
     gèle par ligne, à la première release de la ligne ; sans elle, « ouvrir
     avec sa version » n'aura rien à servir à personne de cette ligne.

Le script sort 0 si tout concorde, 1 sinon. Il est fait pour bloquer une
publication. Seule la bibliothèque standard est employée : il doit tourner même
là où mkdocs n'est pas installé, donc mkdocs.yml se lit à l'expression
régulière et non par PyYAML.
"""

import argparse
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import version_fiche as V  # noqa: E402  (la grammaire du numéro, partagée)

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE = os.path.join(RACINE, "docs", "javascripts", "jjk-fiche.js")
MANIFESTE = os.path.join(RACINE, "docs", "jjk-manifeste.json")
MKDOCS = os.path.join(RACINE, "mkdocs.yml")
DOCS = os.path.join(RACINE, "docs")
# Deux fichiers portent eux aussi un numéro, et personne ne les regardait :
# l'un répond « quelle version a écrit cette fiche ? » quand le manifeste
# manque, l'autre décide jusqu'où une fiche sait migrer.
ATTRMAP = os.path.join(RACINE, "docs", "javascripts", "jjk-attr-map.js")
MIGRATIONS = os.path.join(RACINE, "docs", "javascripts", "jjk-migrations.js")
MODS = os.path.join(RACINE, "docs", "javascripts", "jjk-mods.js")
# L'extension est une COQUILLE : son numéro avance seul, et le seul contrôle
# qui la regarde ici est qu'il ne RECULE pas sous ce qui est déjà signé.
EXT_MANIFESTS = [os.path.join(RACINE, "extension", "firefox", "manifest.json"),
                 os.path.join(RACINE, "extension", "chrome", "manifest.json")]
EXT_SIGNEE = os.path.join(RACINE, "docs", "download", "ext-signed.json")

fautes = []
notes = []


def lire(chemin):
    # utf-8-sig : jjk-fiche.js porte une marque d'ordre des octets
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


# ---------------------------------------------------------------- le bundle
def chaine_migrations(src):
    """(socle, [schémas cibles des pas]) de jjk-migrations.js.

    Le motif ne peut attraper que les « schema: <entier> » des appels à
    ajouter() : partout ailleurs dans ce fichier, la clé porte une variable.
    """
    base = re.search(r"\bSCHEMA_BASE\s*=\s*(\d+)", src)
    cibles = sorted(int(x) for x in re.findall(r"\bschema\s*:\s*(\d+)", src))
    return (int(base.group(1)) if base else None, cibles)


# ------------------------------------------------------------------ les ?v=
def versions_mkdocs(src):
    """{ 'javascripts/jjk-fiche.js': '1' } d'après extra_css et extra_javascript."""
    out = {}
    for ligne in src.splitlines():
        m = re.match(r"^\s*-\s*([^\s#]+\.(?:js|css))(\?v=([^\s#]+))?\s*(?:#.*)?$", ligne)
        if m:
            out[m.group(1)] = m.group(3)
    return out


def sans_v(url):
    return url.split("?", 1)[0]


def version_de(url):
    m = re.search(r"[?&]v=([^&]+)", url)
    return m.group(1) if m else None


# ------------------------------------------------------- URL du manifeste
def relative(u):
    """Même règle que sure() dans roll20-fiche.html : pas de schéma, pas de
    « // » en tête, pas de remontée de dossier."""
    return (isinstance(u, str) and bool(u)
            and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", u)
            and not u.startswith("//")
            and ".." not in u)


def urls_du_manifeste(man):
    """Toutes les URL nommées par le manifeste, avec leur chemin de lecture.

    Le document est parcouru en ENTIER, archives comprises : une archive
    nomme ses propres js/css/data, et une URL absolue y serait aussi
    dangereuse qu'ailleurs.
    """
    trouvees = []

    def marche(noeud, ou):
        if isinstance(noeud, dict):
            for k in sorted(noeud):
                marche(noeud[k], ou + "." + str(k))
        elif isinstance(noeud, list):
            for i, v in enumerate(noeud):
                marche(v, ou + "[" + str(i) + "]")
        elif isinstance(noeud, str):
            # une chaîne qui nomme un fichier servi, ou qui sent l'URL absolue
            if re.search(r"\.(js|css|json)(\?|$)", noeud) or "://" in noeud or noeud.startswith("//"):
                trouvees.append((ou, noeud))

    # « narration » (le plateau du panneau flottant) compte comme le reste : ses
    # deux URL doivent être relatives et nommer des fichiers qui existent, sans
    # quoi le panneau resterait vide sans un mot (l'amorceur avale l'erreur de
    # chargement pour ne jamais geler sur un fichier manquant).
    for cle in ("amorce", "narration", "bundle", "archives"):
        if cle in man:
            marche(man[cle], cle)
    return trouvees


# ------------------------------------------------------------- l'extension
def controle_extension():
    """Le numéro de l'extension ne recule pas sous sa dernière signature.

    Rien d'autre : le contrat dit expressément que les outils ne vérifient PAS
    l'ordre entre l'extension et le site. Les trois numéros du projet visent la
    même ligne, mais ils avancent chacun quand ils ont une raison d'avancer, et
    la coquille ne bouge que quand la coquille bouge. Le seul mur dur est celui
    de Mozilla : un numéro déjà pris est refusé, après la validation.
    """
    vus = []
    for chemin in EXT_MANIFESTS:
        if not os.path.exists(chemin):
            return
        try:
            m = json.loads(lire(chemin))
        except ValueError as e:
            fautes.append("%s illisible : %s" % (os.path.relpath(chemin, RACINE), e))
            return
        vus.append((os.path.relpath(chemin, RACINE).replace(os.sep, "/"), m.get("version")))

    if len(set(v for _, v in vus)) != 1:
        fautes.append("extension : les deux manifests annoncent des versions "
                      "différentes (%s) ; Firefox et Chrome distribueraient deux "
                      "paquets pour un même contenu"
                      % ", ".join("%s = %r" % (c, v) for c, v in vus))
        return
    version = vus[0][1]
    # LE QUATRIÈME NOMBRE N'EXISTE QUE POUR L'EXTENSION. Il compte ses
    # signatures pour un même X.Y.Z, quand la coquille doit ressortir sans que
    # le projet ait bougé. La grammaire du projet, elle, n'en connaît que trois,
    # et refusait donc « 3.6.0.1 » comme un suffixe illégal. On le met de côté
    # avant de faire juger le tronc, puis on le juge à part : entier de 1 à 999,
    # jamais zéro (Firefox et Chrome tiennent « X.Y.Z.0 » pour ÉGAL à
    # « X.Y.Z », et Mozilla refuserait le second après le premier).
    morceaux = str(version).split(".")
    tronc = ".".join(morceaux[:3])
    quatre = morceaux[3] if len(morceaux) > 3 else None
    if quatre is not None and not (quatre.isdigit() and 0 < int(quatre) <= V.MAX):
        fautes.append("extension : version %r : le compteur de signatures doit "
                      "être un entier de 1 à %d, et ne s'écrit jamais quand il "
                      "vaut zéro" % (version, V.MAX))
        return
    faute = V.faute_de_forme(tronc)
    if faute:
        fautes.append("extension : version %s" % faute)
        return
    if V.lire(tronc).beta:
        fautes.append("extension : version %r porte le suffixe « b » ; l'extension "
                      "n'en porte jamais, elle est la même sur les deux branches"
                      % version)
        return

    if not os.path.exists(EXT_SIGNEE):
        notes.append("extension : version %s (aucune empreinte signée à comparer)" % version)
        return
    try:
        signee = json.loads(lire(EXT_SIGNEE)).get("version")
    except ValueError:
        signee = None
    # LE RECUL SE COMPARE SUR QUATRE NOMBRES. V.compare ne connaît que le
    # tronc, et rendait None sur « 3.6.0.1 » : le contrôle était alors SAUTÉ,
    # en le disant, mais sauté quand même — c'est-à-dire précisément quand le
    # compteur de signatures est en service, le seul moment où deux numéros
    # peuvent se ressembler au point qu'on s'y trompe.
    def rang4(t):
        mx = str(t).split(".")
        r = V.rang(".".join(mx[:3]))
        if r is None:
            return None
        try:
            b4 = int(mx[3]) if len(mx) > 3 else 0
        except ValueError:
            return None
        return tuple(r) + (b4,)

    ra, rb = rang4(version), rang4(signee)
    ordre = None if (ra is None or rb is None) else (
        0 if ra == rb else (1 if ra > rb else -1))
    if ordre is None:
        notes.append("extension : version %s, dernière signée %r illisible, contrôle du recul sauté"
                     % (version, signee))
    elif ordre < 0:
        fautes.append("extension : version %s en dessous de la dernière signée %s ; "
                      "Mozilla refuse un numéro déjà pris, et le refus tombe APRÈS "
                      "la validation, quota consommé" % (version, signee))
    else:
        notes.append("extension : version %s, dernière signée %s (pas de recul ; "
                     "rien ici ne la compare au site)" % (version, signee))


# ------------------------------------------------------------------ marche
def main(archive_differee=False):
    for chemin in (BUNDLE, MANIFESTE, MKDOCS):
        if not os.path.exists(chemin):
            fautes.append("fichier introuvable : " + os.path.relpath(chemin, RACINE))
    if fautes:
        return rendre()

    release, schema = V.constantes_bundle(lire(BUNDLE))

    try:
        man = json.loads(lire(MANIFESTE))
    except ValueError as e:
        fautes.append("docs/jjk-manifeste.json illisible : %s" % e)
        return rendre()

    # 1. LA FORME du numéro, et les TROIS porteurs qui doivent dire le même mot
    version = None
    if release is None and schema is None:
        notes.append("bundle : pas encore de constantes de version (RELEASE / SCHEMA), contrôle sauté")
    elif release is None:
        fautes.append("bundle : SCHEMA = %s est déclaré, mais RELEASE manque" % schema)
    elif schema is None:
        fautes.append("bundle : RELEASE = %s est déclaré, mais SCHEMA manque" % release)
    else:
        faute = V.faute_de_forme(release)
        if faute:
            fautes.append("bundle : RELEASE %s" % faute)
        else:
            version = V.lire(release)
            notes.append("bundle : RELEASE %s (ligne %s), SCHEMA %s"
                         % (release, version.ligne, schema))
        # Le manifeste annonce le même numéro au monde extérieur, au caractère
        # près, suffixe compris : c'est lui que lisent l'amorceur et la carte
        # d'attributs, et un écart ferait tourner un code sous un autre nom.
        if str(man.get("release", "")) != release:
            fautes.append("manifeste : release = %r, bundle : RELEASE = %r"
                          % (man.get("release"), release))
        if man.get("schema") != schema:
            fautes.append("manifeste : schema = %r, bundle : SCHEMA = %r"
                          % (man.get("schema"), schema))

    # le manifeste doit de toute façon rester lisible pour ce qu'il est
    mrel, msch = man.get("release"), man.get("schema")
    if not (isinstance(mrel, str) and isinstance(msch, int) and not isinstance(msch, bool)):
        fautes.append("manifeste : release (texte) et schema (entier) sont obligatoires")

    # LE SUFFIXE ET LA BRANCHE. Le marqueur est site_url de mkdocs.yml, qui est
    # versionné et voyage avec une copie du dépôt : git peut manquer là où ce
    # script tourne (un bac de sonde, une machine nue).
    chantier = V.chantier(RACINE)
    if version is None:
        pass
    elif chantier is None:
        notes.append("mkdocs.yml ne dit pas site_url : le suffixe n'est pas contrôlé")
    elif chantier and not version.beta:
        fautes.append("branche de chantier : RELEASE = %s devrait porter le suffixe "
                      "« b » ; sans lui le joueur ne voit pas qu'il est sur la beta"
                      % release)
    elif not chantier and version.beta:
        fautes.append("branche stable : RELEASE = %s porte le suffixe « b », qui "
                      "n'appartient qu'au chantier" % release)
    else:
        notes.append("suffixe : conforme à la branche (%s)"
                     % ("chantier" if chantier else "stable"))

    # 1 bis. le TROISIÈME porteur, celui que la fiche écrit dans le personnage
    # quand le manifeste n'a pas répondu.
    if os.path.exists(ATTRMAP):
        ra = V.release_attrmap(lire(ATTRMAP))
        if ra is None:
            notes.append("jjk-attr-map.js : pas de RELEASE_DEFAUT, contrôle sauté")
        elif isinstance(mrel, str) and ra != mrel:
            fautes.append("jjk-attr-map.js : RELEASE_DEFAUT = %r, manifeste : release = %r "
                          "(c'est ce numéro que la fiche écrit dans jjk_version quand le "
                          "manifeste manque)" % (ra, mrel))
        else:
            notes.append("jjk-attr-map.js : RELEASE_DEFAUT %s" % ra)

    # 3. LE SCHÉMA, détaché du majeur. Plus rien ne le déduit du numéro : ses
    # deux seuls ancrages sont le manifeste (contrôlé plus haut) et la chaîne de
    # migrations, qui doit monter exactement jusqu'à lui.
    if os.path.exists(MIGRATIONS):
        socle, cibles = chaine_migrations(lire(MIGRATIONS))
        if socle is None:
            fautes.append("jjk-migrations.js : SCHEMA_BASE introuvable")
        elif not cibles:
            notes.append("jjk-migrations.js : aucun pas déclaré, contrôle sauté")
        else:
            attendu = list(range(socle + 1, max(cibles) + 1))
            if cibles != attendu:
                fautes.append("jjk-migrations.js : chaîne trouée ou hors d'ordre, pas déclarés %s, "
                              "attendus %s" % (cibles, attendu))
            elif isinstance(msch, int) and max(cibles) != msch:
                # une fiche en schéma msch qui rencontre un moteur qui s'arrête
                # plus bas refuse de migrer : « schéma inconnu de cette version »
                fautes.append("jjk-migrations.js : la chaîne monte jusqu'au schéma %d, "
                              "le manifeste annonce schema = %s" % (max(cibles), msch))
            else:
                notes.append("jjk-migrations.js : chaîne %d -> %d" % (socle, max(cibles)))
        # le moteur doit être SERVI, sinon window.JjkMigr n'existe nulle part
        nomme = any(sans_v(u) == "javascripts/jjk-migrations.js"
                    for _, u in urls_du_manifeste(man))
        if not nomme:
            fautes.append("manifeste : jjk-migrations.js existe mais n'est nommé nulle part ; "
                          "dans Roll20 le moteur de migration ne serait jamais chargé")

    # 4. LE MODE DE BLOCAGE. C'est ce réglage, et non le suffixe, qui décide
    # quand l'écran de version paraît. « release » n'est pas une faute : le
    # contrat ne l'a jamais banni et l'amorceur le sert pour de bon (voir
    # blocage() dans jjk-roll20-boot.js). En faire un refus donnait un outil
    # qu'il fallait contourner pour publier un réglage licite, et un outil qu'on
    # contourne ne garde plus rien du tout. On le dit, on ne bloque pas.
    blocage = man.get("blocage")
    if blocage == "schema":
        notes.append("manifeste : blocage « schema »")
    elif blocage == "release":
        notes.append("manifeste : blocage « release », alors que « schema » est le "
                     "réglage attendu ; ainsi réglé, un simple correctif de CSS sort "
                     "l'écran de version chez tous les joueurs, à toutes les tables, "
                     "pour un code qui lit et écrit exactement les mêmes données")
    else:
        fautes.append("manifeste : blocage = %r, inconnu de l'amorceur, qui retombera "
                      "sur « schema » sans le dire ; les deux seuls réglages servis "
                      "sont « schema » (attendu) et « release »" % blocage)

    # 2. LE RECUL, et la ligne X.Y qui doit avoir son archive.
    brutes = man.get("archives") or {}
    lisibles = V.archives_lisibles(man)
    for cle in sorted(brutes):
        if cle not in lisibles:
            fautes.append("archive %r : la clé n'est pas un numéro de version ; la "
                          "recherche par ligne ne la trouvera jamais" % cle)
        elif lisibles[cle].beta:
            fautes.append("archive %r : une clé d'archive ne porte jamais le suffixe "
                          "« b ». Le dossier se nomme d'après le numéro nu, sans quoi "
                          "la même ligne aurait deux archives selon la branche qui "
                          "publie" % cle)
    if version is not None and lisibles:
        for cle, av in sorted(lisibles.items()):
            if av.rang > version.rang:
                fautes.append("archive %s : au-dessus de la version publiée %s ; un "
                              "numéro ne recule jamais sous une version déjà gelée"
                              % (cle, release))
    # 8. la ligne courante doit avoir son archive (celle qui a ouvert la ligne)
    if version is not None:
        servante = V.archive_de_ligne(man, release)
        if servante is None and archive_differee:
            # essai de publication : archive_fiche.py vient de tourner à blanc,
            # rien n'a été écrit. Le reprocher ferait échouer tout essai d'une
            # ligne neuve, c'est-à-dire précisément celui qu'on veut dérouler.
            notes.append("aucune archive pour la ligne %s, attendu : l'essai n'écrit "
                         "rien" % version.ligne)
        elif servante is None:
            fautes.append("aucune archive pour la ligne %s : « ouvrir avec sa version » "
                          "n'aurait rien à servir. scripts/archive_fiche.py ouvre la "
                          "ligne (la publication l'appelle toute seule)" % version.ligne)
        else:
            notes.append("archives : la ligne %s est servie par %s"
                         % (version.ligne, servante))
            # 3 bis. « UN Z NE TOUCHE JAMAIS AU FORMAT DES DONNÉES ». Le seul
            # contrôle mécanique de cette promesse, et il se juge ICI, contre le
            # schéma que l'archive a GELÉ en ouvrant la ligne.
            #
            # Le comparer à man["schema"], comme on faisait, ne pouvait rien
            # attraper : ce script exige dix lignes plus haut que le manifeste
            # annonce exactement le SCHEMA du bundle, donc les deux montent dans
            # le même commit et le garde-fou ne voyait plus que deux nombres
            # égaux. L'archive, elle, est immuable : elle se souvient de la forme
            # des données du jour où la ligne s'est ouverte.
            #
            # Ce que la faute désigne : des personnages écrits par un correctif
            # de la même ligne portent une forme d'état que l'archive de leur
            # ligne ne sait pas relire. « Ouvrir avec sa version » leur rendrait
            # une fiche qui refuse de partir, ou pire, qui part en perdant ce
            # qu'elle ne reconnaît pas.
            gele = ((brutes.get(servante) or {}).get("schema"))
            if not isinstance(gele, int) or isinstance(gele, bool):
                notes.append("archive %s : pas de schema lisible, le contrôle du Z "
                             "est sauté" % servante)
            elif isinstance(schema, int) and gele != schema:
                fautes.append("le bundle publie le schéma %s sur la ligne %s, que "
                              "l'archive %s a gelée au schéma %s : un Z ne touche "
                              "JAMAIS au format des données du personnage. Changer "
                              "la forme de l'état demande un cran Y au moins, qui "
                              "ouvre une ligne et lui gèle sa propre archive "
                              "(scripts/release_fiche.py --moyen)"
                              % (schema, version.ligne, servante, gele))

    controle_extension()

    # 7. le moteur de MODS, même piège que les migrations, en pire : le bundle
    # vit sans lui, donc rien ne casse. Une fiche ouverte sans jjk-mods.js
    # n'affiche ni bandeau ni panne : les mods du personnage cessent simplement
    # d'exister, sans un mot. C'est la panne la plus discrète du lot.
    if os.path.exists(MODS):
        nomme = any(sans_v(u) == "javascripts/jjk-mods.js"
                    for _, u in urls_du_manifeste(man))
        if not nomme:
            fautes.append("manifeste : jjk-mods.js existe mais n'est nommé nulle part ; "
                          "dans Roll20 les mods d'un personnage seraient ignorés en silence")
        # et chaque ARCHIVE doit le porter : rouvrir un personnage dans sa
        # version d'origine ne doit pas lui faire perdre ses mods
        for rel, spec in sorted(brutes.items()):
            js = (spec or {}).get("js") or []
            if not any(sans_v(u).endswith("/jjk-mods.js") for u in js):
                fautes.append("archive %s : elle ne nomme pas jjk-mods.js ; un personnage "
                              "qui porte des mods les perdrait en rouvrant cette version" % rel)

    # 5. ?v= : mkdocs.yml et le manifeste doivent dire la même chose
    mk = versions_mkdocs(lire(MKDOCS))
    urls = urls_du_manifeste(man)
    communs = 0
    for ou, u in urls:
        chemin = sans_v(u)
        if chemin not in mk:
            # normal : l'amorce, jjk-roll20.css et les archives ne sont
            # chargées QUE par le manifeste, le site ne les connaît pas
            continue
        communs += 1
        vm, vk = version_de(u), mk[chemin]
        if vm != vk:
            fautes.append("?v= discordant pour %s : manifeste %s (%s), mkdocs.yml %s"
                          % (chemin, "?v=" + vm if vm else "aucun", ou, "?v=" + vk if vk else "aucun"))
    notes.append("?v= : %d fichier(s) nommé(s) des deux côtés, sur %d URL(s) au manifeste" % (communs, len(urls)))

    # 6. URL relatives, et qui désignent un fichier réellement publié
    for ou, u in urls:
        if not relative(u):
            fautes.append("manifeste : URL non relative en %s (%s), l'amorceur la refuserait et "
                          "retomberait sur son repli sans ?v=" % (ou, u))
            continue
        cible = os.path.join(DOCS, sans_v(u).replace("/", os.sep))
        if not os.path.exists(cible):
            fautes.append("manifeste : %s nomme docs/%s, qui n'existe pas" % (ou, sans_v(u)))

    return rendre()


def rendre():
    for n in notes:
        print("  " + n)
    if fautes:
        print("VERSIONS : %d faute(s)" % len(fautes))
        for f in fautes:
            print("  - " + f)
        return 1
    print("VERSIONS : rien à signaler")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Vérifie les numéros de version de la fiche JJK.")
    p.add_argument("--archive-differee", action="store_true", dest="archive_differee",
                   help="l'archive de la ligne courante n'a pas encore été écrite "
                        "(essai de publication) : ne pas en faire une faute")
    sys.exit(main(archive_differee=p.parse_args().archive_differee))
