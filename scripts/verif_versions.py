#!/usr/bin/env python3
"""Vérification des numéros de version de la fiche Outward.

    python scripts/verif_versions.py

Six choses peuvent se désynchroniser en silence, et chacune se paie sur la
fiche d'un joueur :

  1. LA FORME du numéro publié et sa concordance entre ses TROIS porteurs (le
     bundle, le manifeste, RELEASE_DEFAUT de la carte d'attributs). Le contrat
     dit « X.Y.Z », chaque nombre de 0 à 999, plus le suffixe « b » de la
     branche beta, qui doit être là sur la beta et absent ailleurs : c'est ce
     suffixe, et lui seul, qui montre au joueur qu'il est sur la beta.
  2. LE SCHÉMA de l'état. Il ne suit pas le majeur : c'est un entier libre, qui
     ne monte que lorsque la FORME de l'état du personnage change. Il se juge
     contre le manifeste et contre la chaîne de migrations, qui doit être
     contiguë et monter exactement jusqu'à lui (un cran de moins, et une fiche
     déjà migrée trouve un moteur qui refuse de la redescendre).
  3. LE MODE DE BLOCAGE du manifeste. « schema » est le réglage attendu ; en
     « release », un simple correctif de CSS sort l'écran de version chez tous
     les joueurs, à toutes les tables, pour un code qui lit et écrit exactement
     les mêmes données. C'est une note, pas une faute : le contrat n'interdit pas
     ce réglage, l'amorceur le sert pour de bon, et un outil qui refuserait de
     passer sur un réglage licite se ferait contourner tout entier.
  4. LE RECUL DE L'EXTENSION sous sa dernière signature, que Mozilla refuserait
     — et son refus tombe APRÈS la validation, quota consommé. Rien ici ne
     compare l'extension au site : les trois numéros du projet visent la même
     ligne mais avancent chacun quand ils ont une raison d'avancer.
  5. les ?v= de mkdocs.yml et ceux de docs/owd-manifeste.json. Le site charge le
     bundle par mkdocs.yml, Roll20 le charge par le manifeste : deux numéros
     différents, et les deux mondes ne font pas tourner le même code. (Le ?v=
     est une clé de cache, jamais un numéro de version : les aligner sur X.Y.Z
     ferait retélécharger la fiche à contretemps.)
  6. une URL absolue, ou qui ne désigne aucun fichier, dans le manifeste.
     L'amorceur gelé refuse l'absolue (roll20-fiche.html, fonction sure()) et
     retombe alors sur son repli sans ?v= : la panne est muette, la fiche a
     l'air de marcher.

CE QUE CE SCRIPT NE CONTRÔLE PAS, ET POURQUOI : les archives de fiche. Outward
n'en a pas (« archives » vaut {} au manifeste), donc il n'y a ni gel de ligne, ni
recul sous une version gelée, ni schéma figé par une archive à comparer. Le jour
où une archive existera, ces contrôles reviendront — et avec eux la seule mémoire
capable de dire qu'un numéro a déjà servi.

Le script sort 0 si tout concorde, 1 sinon. Il est fait pour bloquer une
publication. Seule la bibliothèque standard est employée : il doit tourner même
là où mkdocs n'est pas installé, donc mkdocs.yml se lit à l'expression
régulière et non par PyYAML.
"""

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import version_fiche as V  # noqa: E402  (la grammaire du numéro, partagée)

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# LES QUATRE PORTEURS SE NOMMENT DANS version_fiche, ET NULLE PART AILLEURS.
# Recodés ici, le contrôle finirait par juger d'autres fichiers que ceux que la
# publication écrit : le jour où l'un des deux jeux de chemins bouge, ce script
# dit « rien à signaler » sur le fichier que personne ne sert.
BUNDLE = os.path.join(RACINE, V.BUNDLE)
MANIFESTE = os.path.join(RACINE, V.MANIFESTE)
MKDOCS = os.path.join(RACINE, V.MKDOCS)
ATTRMAP = os.path.join(RACINE, V.ATTRMAP)
DOCS = os.path.join(RACINE, "docs")
# Ce fichier-ci ne porte pas le numéro mais décide jusqu'où une fiche sait
# migrer. Le contrôle est CONDITIONNÉ à son existence, et il le reste : la
# chaîne de migrations est vide au départ (schéma 1 = le socle), et le mécanisme
# doit reprendre tout seul le jour où un premier pas sera écrit, sans que
# personne ait à se souvenir de rallumer quoi que ce soit ici.
MIGRATIONS = os.path.join(RACINE, "docs", "javascripts", "owd-migrations.js")
# L'extension est une COQUILLE : son numéro avance seul, et le seul contrôle
# qui la regarde ici est qu'il ne RECULE pas sous ce qui est déjà signé.
EXT_MANIFESTS = [os.path.join(RACINE, "extension", "firefox", "manifest.json"),
                 os.path.join(RACINE, "extension", "chrome", "manifest.json")]
EXT_SIGNEE = os.path.join(RACINE, "docs", "download", "ext-signed.json")
# Tous les fichiers servis ne sont pas dans docs/ : certains n'existent QU'APRÈS
# la construction, engendrés par un hook mkdocs (owd-creation.json, que
# hooks/owd_creation.py dérive des règles ; changelog.json). Les chercher sur le
# disque les déclarerait manquants à chaque fois, et ce script bloque une
# publication : la faute serait fausse et la seule issue serait de le contourner.
HOOKS = os.path.join(RACINE, "hooks")

fautes = []
notes = []


# ---------------------------------------------------------------- le bundle
def _sans_commentaires(src):
    """La source débarrassée de ses commentaires.

    LES COMMENTAIRES DE CE FICHIER-LÀ SONT PIÉGEUX. owd-migrations.js porte en
    en-tête un exemple de pas, écrit en toutes lettres — « schema: 2, // le
    schéma CIBLE » — pour montrer comment on en écrit un. Lu tel quel, le
    relevé ci-dessous y voyait un pas déclaré, concluait que la chaîne monte
    jusqu'au schéma 2 alors qu'aucun pas n'existe, et REFUSAIT la publication
    pour de la prose. Un contrôle qui se trompe sur un commentaire finit par se
    faire contourner, et il emporte alors ce qu'il gardait vraiment.

    Le « (?<!:) » devant les commentaires de fin de ligne épargne les « // »
    d'une adresse web citée dans le code : couper là n'attraperait rien de plus
    et effacerait la fin d'une ligne utile.
    """
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    return re.sub(r"(?<!:)//[^\n]*", " ", src)


def chaine_migrations(src):
    """(socle, [schémas cibles des pas]) de owd-migrations.js.

    Le motif n'attrape que les « schema: <entier> » des appels à ajouter() :
    partout ailleurs dans ce fichier, la clé porte une variable — et les
    commentaires, eux, sont retirés d'abord (voir _sans_commentaires).
    """
    src = _sans_commentaires(src)
    base = re.search(r"\bSCHEMA_BASE\s*=\s*(\d+)", src)
    cibles = sorted(int(x) for x in re.findall(r"\bschema\s*:\s*(\d+)", src))
    return (int(base.group(1)) if base else None, cibles)


# Les ?v= se lisent dans version_fiche (V.sans_v, V.serial_v, V.serials_mkdocs).
# Ces trois fonctions seraient sinon écrites ici ET dans release_fiche.py, avec
# le même motif de ligne mkdocs recopié mot pour mot : celui qui MONTE les ?v= et
# celui qui les CONTRÔLE doivent lire mkdocs.yml de la même façon, ou le contrôle
# approuve ce que la montée n'a pas touché.


# ------------------------------------------------------- URL du manifeste
def fichiers_engendres():
    """Les fichiers qu'un hook mkdocs ajoute AU BUILD, à la racine du site.

    On les lit dans hooks/*.py au motif « File.generated(config, X » : X est
    soit la chaîne elle-même, soit le nom d'une constante déclarée en tête du
    même fichier (owd_creation.py passe par CIBLE). Lire les hooks plutôt que
    tenir une liste ici est le seul moyen que le contrôle suive le jour où un
    hook change sa cible : une liste recopiée vieillirait en silence, et ce
    script dirait « rien à signaler » sur un fichier que personne ne sert plus.
    On n'IMPORTE pas les hooks — ce script ne doit dépendre que de la
    bibliothèque standard, et importer un hook exigerait mkdocs.
    """
    engendres = set()
    if not os.path.isdir(HOOKS):
        return engendres
    for nom in sorted(os.listdir(HOOKS)):
        if not nom.endswith(".py"):
            continue
        src = V.lire_fichier(os.path.join(HOOKS, nom))
        for arg in re.findall(r"File\.generated\(\s*config\s*,\s*([^,)]+)", src):
            arg = arg.strip()
            lit = re.match(r"""^["'](.+?)["']$""", arg)
            if lit:
                engendres.add(lit.group(1))
                continue
            # une constante : on la résout dans le hook qui la nomme
            const = re.search(r"""^%s\s*=\s*["'](.+?)["']""" % re.escape(arg),
                              src, re.M)
            if const:
                engendres.add(const.group(1))
            else:
                notes.append("hooks/%s : cible de File.generated illisible (%s), "
                             "son fichier n'est pas contrôlé" % (nom, arg))
    return engendres


def relative(u):
    """Même règle que sure() dans roll20-fiche.html : pas de schéma, pas de
    « // » en tête, pas de remontée de dossier."""
    return (isinstance(u, str) and bool(u)
            and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", u)
            and not u.startswith("//")
            and ".." not in u)


def urls_du_manifeste(man):
    """Toutes les URL nommées par le manifeste, avec leur chemin de lecture.

    « camp » (le panneau flottant) compte comme le reste : ses deux URL doivent
    être relatives et nommer des fichiers qui existent, sans quoi le panneau
    resterait vide sans un mot (l'amorceur avale l'erreur de chargement pour ne
    jamais geler sur un fichier manquant).

    « archives » est parcouru bien qu'il vaille {} : le jour où une entrée y sera
    posée, elle nommera des js/css/data, et une URL absolue y serait aussi
    dangereuse qu'ailleurs. Ne pas l'énumérer ici en ferait la seule partie du
    fichier que personne ne contrôle.
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

    for cle in ("amorce", "camp", "bundle", "archives"):
        if cle in man:
            marche(man[cle], cle)
    return trouvees


# ------------------------------------------------------------- l'extension
def signature_enregistree():
    """(version signée, oui/non une signature a bien eu lieu).

    « Une signature a eu lieu » veut dire : l'état porte une empreinte non vide.
    Le gabarit de départ de docs/download/ext-signed.json, lui, porte une
    empreinte VIDE — il existe pour que le fichier soit là, pas pour prétendre
    qu'un paquet a été signé. Cette distinction sert au contrôle du quatrième
    nombre juste en dessous.
    """
    if not os.path.exists(EXT_SIGNEE):
        return (None, False)
    try:
        etat = json.loads(V.lire_fichier(EXT_SIGNEE))
    except ValueError:
        return (None, False)
    if not isinstance(etat, dict):
        return (None, False)
    emp = etat.get("hash")
    return (etat.get("version"), isinstance(emp, str) and bool(emp))


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
            m = json.loads(V.lire_fichier(chemin))
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
    signee, deja_signe = signature_enregistree()

    # LE QUATRIÈME NOMBRE N'EXISTE QUE POUR L'EXTENSION. Il compte ses
    # signatures pour un même X.Y.Z, quand la coquille doit ressortir sans que
    # le projet ait bougé. La grammaire du projet, elle, n'en connaît que trois,
    # et refuserait donc « 1.0.0.1 » comme un suffixe illégal. On le met de côté
    # avant de faire juger le tronc, puis on le juge à part : entier de 1 à 999.
    #
    # LE ZÉRO EST UNE EXCEPTION, ET ELLE NE VAUT QU'AU PREMIER ENVOI. « X.Y.Z.0 »
    # ne doit jamais partir chez Mozilla : Firefox et Chrome complètent de zéros
    # et le tiennent pour ÉGAL à « X.Y.Z », donc le second après le premier
    # serait refusé APRÈS validation, quota consommé. Mais l'extension d'Outward
    # PART en 1.0.0.0 dans les deux manifests, et c'est cohérent avec la
    # mécanique : scripts/ci_extension.py ne soumettra jamais ce numéro-là, il
    # rendra 1.0.0.1 à la première signature (voir signature_suivante()) et
    # réécrira les manifests avec. Le zéro n'est donc admis que TANT QUE RIEN
    # N'A ÉTÉ SIGNÉ ; dès la première signature enregistrée, il redevient une
    # faute, parce qu'il ne pourrait plus venir que d'une main.
    morceaux = str(version).split(".")
    tronc = ".".join(morceaux[:3])
    quatre = morceaux[3] if len(morceaux) > 3 else None
    if quatre is not None and not quatre.isdigit():
        fautes.append("extension : version %r : le compteur de signatures doit "
                      "être un entier de 1 à %d" % (version, V.MAX))
        return
    if quatre is not None and int(quatre) > V.MAX:
        fautes.append("extension : version %r : le compteur de signatures va de 1 "
                      "à %d" % (version, V.MAX))
        return
    if quatre is not None and int(quatre) == 0:
        if deja_signe:
            fautes.append("extension : version %r : le compteur de signatures ne "
                          "s'écrit jamais quand il vaut zéro (Firefox et Chrome "
                          "tiennent « X.Y.Z.0 » pour ÉGAL à « X.Y.Z », et Mozilla "
                          "refuserait le second après le premier, APRÈS validation, "
                          "quota consommé). Ce numéro n'est admis qu'avant la toute "
                          "première signature, or la v%s est signée." % (version, signee))
            return
        notes.append("extension : version %s, aucune signature enregistrée — le "
                     "quatrième nombre à zéro est admis au premier envoi seulement ; "
                     "la première signature posera %s.1 dans les deux manifests"
                     % (version, tronc))
    faute = V.faute_de_forme(tronc)
    if faute:
        fautes.append("extension : version %s" % faute)
        return
    if V.lire(tronc).beta:
        fautes.append("extension : version %r porte le suffixe « b » ; l'extension "
                      "n'en porte jamais, elle est la même sur les deux branches"
                      % version)
        return

    if not deja_signe:
        notes.append("extension : version %s (aucune empreinte signée à comparer)" % version)
        return

    # LE RECUL SE COMPARE SUR QUATRE NOMBRES. La grammaire du projet n'en connaît
    # que trois et rend « illisible » sur « 1.0.0.1 » : le contrôle serait alors
    # SAUTÉ, en le disant, mais sauté quand même — c'est-à-dire précisément quand
    # le compteur de signatures est en service, le seul moment où deux numéros
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
def main():
    for chemin in (BUNDLE, MANIFESTE, MKDOCS):
        if not os.path.exists(chemin):
            fautes.append("fichier introuvable : " + os.path.relpath(chemin, RACINE))
    if fautes:
        return rendre()

    release, schema = V.constantes_bundle(V.lire_fichier(BUNDLE))

    try:
        man = json.loads(V.lire_fichier(MANIFESTE))
    except ValueError as e:
        fautes.append("%s illisible : %s" % (V.MANIFESTE.replace(os.sep, "/"), e))
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
    # script tourne (un bac d'essai, une machine nue).
    sur_beta = V.branche_beta(RACINE)
    if version is None:
        pass
    elif sur_beta is None:
        notes.append("mkdocs.yml ne dit pas site_url : le suffixe n'est pas contrôlé")
    elif sur_beta and not version.beta:
        fautes.append("branche beta : RELEASE = %s devrait porter le suffixe "
                      "« b » ; sans lui le joueur ne voit pas qu'il est sur la beta"
                      % release)
    elif not sur_beta and version.beta:
        fautes.append("branche stable : RELEASE = %s porte le suffixe « b », qui "
                      "n'appartient qu'à la beta" % release)
    else:
        notes.append("suffixe : conforme à la branche (%s)"
                     % ("beta" if sur_beta else "stable"))

    # 1 bis. le TROISIÈME porteur, celui que la fiche écrit dans le personnage
    # quand le manifeste n'a pas répondu.
    if os.path.exists(ATTRMAP):
        ra = V.release_attrmap(V.lire_fichier(ATTRMAP))
        if ra is None:
            notes.append("owd-attr-map.js : pas de RELEASE_DEFAUT, contrôle sauté")
        elif isinstance(mrel, str) and ra != mrel:
            fautes.append("owd-attr-map.js : RELEASE_DEFAUT = %r, manifeste : release = %r "
                          "(c'est ce numéro que la fiche écrit dans owd_version quand le "
                          "manifeste manque)" % (ra, mrel))
        else:
            notes.append("owd-attr-map.js : RELEASE_DEFAUT %s" % ra)

    # 2. LE SCHÉMA, détaché du majeur. Rien ne le déduit du numéro : ses deux
    # seuls ancrages sont le manifeste (contrôlé plus haut) et la chaîne de
    # migrations, qui doit monter exactement jusqu'à lui. Au départ la chaîne
    # est vide (schéma 1 = le socle) et le contrôle se saute tout seul en le
    # disant : c'est l'état normal, pas une panne.
    if os.path.exists(MIGRATIONS):
        socle, cibles = chaine_migrations(V.lire_fichier(MIGRATIONS))
        if socle is None:
            fautes.append("owd-migrations.js : SCHEMA_BASE introuvable")
        elif not cibles:
            notes.append("owd-migrations.js : aucun pas déclaré (socle %d), contrôle sauté"
                         % socle)
        else:
            attendu = list(range(socle + 1, max(cibles) + 1))
            if cibles != attendu:
                fautes.append("owd-migrations.js : chaîne trouée ou hors d'ordre, pas déclarés %s, "
                              "attendus %s" % (cibles, attendu))
            elif isinstance(msch, int) and max(cibles) != msch:
                # une fiche en schéma msch qui rencontre un moteur qui s'arrête
                # plus bas refuse de migrer : « schéma inconnu de cette version »
                fautes.append("owd-migrations.js : la chaîne monte jusqu'au schéma %d, "
                              "le manifeste annonce schema = %s" % (max(cibles), msch))
            else:
                notes.append("owd-migrations.js : chaîne %d -> %d" % (socle, max(cibles)))
        # le moteur doit être SERVI, sinon window.OwdMigr n'existe nulle part
        nomme = any(V.sans_v(u) == "javascripts/owd-migrations.js"
                    for _, u in urls_du_manifeste(man))
        if not nomme:
            fautes.append("manifeste : owd-migrations.js existe mais n'est nommé nulle part ; "
                          "dans Roll20 le moteur de migration ne serait jamais chargé")

    # 3. LE MODE DE BLOCAGE. C'est ce réglage, et non le suffixe, qui décide
    # quand l'écran de version paraît. « release » n'est pas une faute : le
    # contrat ne l'a jamais banni et l'amorceur le sert pour de bon (voir
    # blocage() dans owd-roll20-boot.js). En faire un refus donnerait un outil
    # qu'il faudrait contourner pour publier un réglage licite, et un outil
    # qu'on contourne ne garde plus rien du tout. On le dit, on ne bloque pas.
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

    # LES ARCHIVES sont VIDES et doivent le rester tant que rien n'est gelé. Une
    # clé posée à la main y nommerait des fichiers que personne n'a figés, et
    # « ouvrir avec sa version » servirait un code qui n'est pas celui qu'annonce
    # le bouton.
    arch = man.get("archives")
    if not isinstance(arch, dict):
        fautes.append("manifeste : archives doit être un objet (vide, {} , tant qu'aucune "
                      "version n'est gelée) ; l'amorce le parcourt sans se garder du type")
    elif arch:
        fautes.append("manifeste : archives n'est pas vide (%s) alors qu'Outward ne gèle "
                      "aucune version : rien n'écrit ces dossiers, et l'écran de version "
                      "proposerait d'ouvrir un code qui n'existe pas"
                      % ", ".join(sorted(arch)))

    controle_extension()

    # 5. ?v= : mkdocs.yml et le manifeste doivent dire la même chose
    mk = V.serials_mkdocs(V.lire_fichier(MKDOCS))
    urls = urls_du_manifeste(man)
    communs = 0
    for ou, u in urls:
        chemin = V.sans_v(u)
        if chemin not in mk:
            # normal : l'amorce, owd-roll20.css et les fichiers du panneau ne
            # sont chargés QUE par le manifeste, le site ne les connaît pas
            continue
        communs += 1
        vm, vk = V.serial_v(u), mk[chemin]
        if vm != vk:
            fautes.append("?v= discordant pour %s : manifeste %s (%s), mkdocs.yml %s"
                          % (chemin, "?v=" + vm if vm else "aucun", ou, "?v=" + vk if vk else "aucun"))
    notes.append("?v= : %d fichier(s) nommé(s) des deux côtés, sur %d URL(s) au manifeste" % (communs, len(urls)))

    # 6. URL relatives, et qui désignent un fichier réellement publié
    engendres = fichiers_engendres()
    for ou, u in urls:
        if not relative(u):
            fautes.append("manifeste : URL non relative en %s (%s), l'amorceur la refuserait et "
                          "retomberait sur son repli sans ?v=" % (ou, u))
            continue
        rel = V.sans_v(u)
        # Un fichier engendré au build n'est pas sur le disque et n'a pas à y
        # être : il paraît à la racine du site, servi comme les autres.
        if rel in engendres:
            continue
        cible = os.path.join(DOCS, rel.replace("/", os.sep))
        if not os.path.exists(cible):
            fautes.append("manifeste : %s nomme docs/%s, qui n'existe pas" % (ou, rel))
    if engendres:
        notes.append("engendrés au build, non cherchés sur le disque : %s"
                     % ", ".join(sorted(engendres)))

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
    # Aucune option : il n'y a pas d'archive à différer ici, donc rien à
    # désarmer le temps d'un essai. L'analyseur reste pour que « --aide » dise
    # ce que fait le script, et pour qu'un argument de trop soit refusé au lieu
    # d'être ignoré.
    argparse.ArgumentParser(
        description="Vérifie les numéros de version de la fiche Outward.").parse_args()
    sys.exit(main())
