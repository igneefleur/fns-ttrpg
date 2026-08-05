#!/usr/bin/env python3
"""Vérification des numéros de version de la fiche JJK.

    python scripts/verif_versions.py

Six choses peuvent se désynchroniser en silence, et chacune se paie sur la
fiche d'un joueur :

  1. le MAJEUR de la version publiée et le numéro de SCHÉMA de l'état. Le
     schéma suit le majeur (3.x.y -> schéma 3) : c'est ce qui permet à la
     fiche, en ouvrant un personnage, de savoir s'il faut migrer et jusqu'où.
  2. les ?v= de mkdocs.yml et ceux de docs/jjk-manifeste.json. Le site charge
     le bundle par mkdocs.yml, Roll20 le charge par le manifeste : deux
     numéros différents, et les deux mondes ne font pas tourner le même code.
  3. une URL absolue dans le manifeste. L'amorceur gelé la refuse déjà
     (roll20-fiche.html, fonction sure()) et retombe alors sur son repli sans
     ?v= : la panne est muette, la fiche a l'air de marcher.
  4. le RELEASE_DEFAUT de docs/javascripts/jjk-attr-map.js. C'est le numéro
     que la fiche inscrit dans les Attributes d'un personnage quand le
     manifeste n'a pas répondu : laissé en arrière, il fait mentir la fiche
     sur elle-même.
  5. la chaîne de docs/javascripts/jjk-migrations.js. Elle doit être contiguë
     et monter exactement jusqu'au schéma annoncé : un cran de moins, et une
     fiche déjà migrée trouve un moteur qui refuse de la redescendre.
  6. docs/javascripts/jjk-mods.js, oublié du manifeste ou d'une archive. Le
     bundle vit très bien sans lui : les mods d'un personnage cessent alors
     d'exister, sans bandeau, sans panne et sans un mot. C'est la seule panne
     du lot qui ne laisse aucune trace, donc la seule qu'il faut attraper
     avant la publication.

Le script sort 0 si tout concorde, 1 sinon. Il est fait pour bloquer une
publication. Seule la bibliothèque standard est employée : il doit tourner
même là où mkdocs n'est pas installé, donc mkdocs.yml se lit à l'expression
régulière et non par PyYAML.
"""

import io
import json
import os
import re
import sys

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

fautes = []
notes = []


def lire(chemin):
    # utf-8-sig : jjk-fiche.js porte une marque d'ordre des octets
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


# ---------------------------------------------------------------- le bundle
def constantes_bundle(src):
    """RELEASE et SCHEMA déclarés dans le bundle, ou None chacun.

    var, let ou const, guillemets simples ou doubles : le but est de TROUVER
    la constante, pas d'imposer une façon de l'écrire.
    """
    rel = re.search(r"""\b(?:var|let|const)\s+RELEASE\s*=\s*["']([^"']+)["']""", src)
    sch = re.search(r"""\b(?:var|let|const)\s+SCHEMA\s*=\s*(\d+)""", src)
    return (rel.group(1) if rel else None, int(sch.group(1)) if sch else None)


def release_attrmap(src):
    """RELEASE_DEFAUT de jjk-attr-map.js, ou None.

    C'est le numéro que la fiche inscrit dans le `max` de jjk_version quand le
    manifeste n'est pas là (node, amorceur de secours). Laissé en arrière, il
    fait dire à des personnages Roll20 qu'ils ont été écrits par une version
    qui n'existe plus.
    """
    m = re.search(r"""\bRELEASE_DEFAUT\s*=\s*["']([^"']+)["']""", src)
    return m.group(1) if m else None


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
    nommera demain ses propres js/css/data, et une URL absolue y serait aussi
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


# ------------------------------------------------------------------ marche
def main():
    for chemin in (BUNDLE, MANIFESTE, MKDOCS):
        if not os.path.exists(chemin):
            fautes.append("fichier introuvable : " + os.path.relpath(chemin, RACINE))
    if fautes:
        return rendre()

    release, schema = constantes_bundle(lire(BUNDLE))

    try:
        man = json.loads(lire(MANIFESTE))
    except ValueError as e:
        fautes.append("docs/jjk-manifeste.json illisible : %s" % e)
        return rendre()

    # 1. majeur(RELEASE) == SCHEMA
    if release is None and schema is None:
        notes.append("bundle : pas encore de constantes de version (RELEASE / SCHEMA), contrôle sauté")
    elif release is None:
        fautes.append("bundle : SCHEMA = %s est déclaré, mais RELEASE manque" % schema)
    elif schema is None:
        fautes.append("bundle : RELEASE = %s est déclaré, mais SCHEMA manque" % release)
    else:
        m = re.match(r"^(\d+)\.(\d+)\.(\d+)$", release)
        if not m:
            fautes.append("bundle : RELEASE = %r n'est pas un majeur.mineur.correctif" % release)
        elif int(m.group(1)) != schema:
            fautes.append("bundle : RELEASE = %s (majeur %s) mais SCHEMA = %s, le schéma suit le majeur"
                          % (release, m.group(1), schema))
        else:
            notes.append("bundle : RELEASE %s, SCHEMA %s (le majeur et le schéma concordent)" % (release, schema))
        # le manifeste annonce les mêmes numéros au monde extérieur
        if str(man.get("release", "")) != release:
            fautes.append("manifeste : release = %r, bundle : RELEASE = %r" % (man.get("release"), release))
        if man.get("schema") != schema:
            fautes.append("manifeste : schema = %r, bundle : SCHEMA = %r" % (man.get("schema"), schema))

    # le manifeste doit de toute façon rester cohérent avec lui-même
    mrel, msch = man.get("release"), man.get("schema")
    if isinstance(mrel, str) and isinstance(msch, int) and not isinstance(msch, bool):
        mm = re.match(r"^(\d+)\.", mrel)
        if not mm:
            fautes.append("manifeste : release = %r n'est pas un numéro de version" % mrel)
        elif int(mm.group(1)) != msch:
            fautes.append("manifeste : release = %s (majeur %s) mais schema = %s" % (mrel, mm.group(1), msch))
        else:
            notes.append("manifeste : release %s, schema %s" % (mrel, msch))
    else:
        fautes.append("manifeste : release (texte) et schema (entier) sont obligatoires")

    # 1 bis. les DEUX AUTRES porteurs de numéro doivent suivre le manifeste.
    if os.path.exists(ATTRMAP):
        ra = release_attrmap(lire(ATTRMAP))
        if ra is None:
            notes.append("jjk-attr-map.js : pas de RELEASE_DEFAUT, contrôle sauté")
        elif isinstance(mrel, str) and ra != mrel:
            fautes.append("jjk-attr-map.js : RELEASE_DEFAUT = %r, manifeste : release = %r "
                          "(c'est ce numéro que la fiche écrit dans jjk_version quand le "
                          "manifeste manque)" % (ra, mrel))
        else:
            notes.append("jjk-attr-map.js : RELEASE_DEFAUT %s" % ra)

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

    # 1 bis. le moteur de MODS, même piège, en pire : le bundle vit sans lui,
    # donc rien ne casse. Une fiche ouverte sans jjk-mods.js n'affiche ni
    # bandeau ni panne : les mods du personnage cessent simplement d'exister,
    # sans un mot. C'est la panne la plus discrète du lot, d'où ce contrôle.
    if os.path.exists(MODS):
        nomme = any(sans_v(u) == "javascripts/jjk-mods.js"
                    for _, u in urls_du_manifeste(man))
        if not nomme:
            fautes.append("manifeste : jjk-mods.js existe mais n'est nommé nulle part ; "
                          "dans Roll20 les mods d'un personnage seraient ignorés en silence")
        # et chaque ARCHIVE doit le porter : rouvrir un personnage dans sa
        # version d'origine ne doit pas lui faire perdre ses mods
        for rel, spec in sorted((man.get("archives") or {}).items()):
            js = (spec or {}).get("js") or []
            if not any(sans_v(u).endswith("/jjk-mods.js") for u in js):
                fautes.append("archive %s : elle ne nomme pas jjk-mods.js ; un personnage "
                              "qui porte des mods les perdrait en rouvrant cette version" % rel)

    # 2. ?v= : mkdocs.yml et le manifeste doivent dire la même chose
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

    # 3. URL relatives, et qui désignent un fichier réellement publié
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
    sys.exit(main())
