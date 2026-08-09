#!/usr/bin/env python3
"""Protocole de publication d'une version de la fiche JJK.

    python scripts/release_fiche.py --petit --essai   # déroule tout, n'écrit rien
    python scripts/release_fiche.py --moyen
    python scripts/release_fiche.py --petit --sans-descente --motif "…"

Publier la fiche, ce n'est pas pousser un fichier : c'est promettre qu'un
personnage écrit aujourd'hui se rouvrira demain, et qu'un personnage écrit
hier se rouvrira dans la version d'hier. Six gestes tiennent cette promesse,
et ils s'oublient tous les six quand on les fait à la main.

  0. L'ASSEMBLAGE (scripts/assembler.py). Les gros fichiers servis se découpent
     en morceaux, un par module, pour qu'on puisse y travailler à plusieurs.
     Le fichier servi est donc un PRODUIT : publier sans l'avoir réassemblé
     publierait le fichier d'hier avec les sources d'aujourd'hui, et personne ne
     le verrait, puisque le fichier servi, lui, aurait l'air parfaitement normal.
     Cette étape passe donc EN PREMIER, avant même la lecture de RELEASE et
     SCHEMA : ces deux constantes se lisent dans le bundle, et les lire avant
     l'assemblage les prendrait dans la version périmée.
     Tant que rien n'est découpé (pas de scripts/assemblage.plan), l'étape ne
     fait rien et le dit.
  1. LE NUMÉRO. Il se demande par son CRAN, jamais à la main : --majeur pour
     une fonctionnalité entière, --moyen pour un petit module ou la correction
     d'une grosse erreur, --petit pour du CSS ou une erreur mineure. Le script
     le calcule (retenue à 999 comprise), pose le suffixe « b » si la branche
     est la beta, et l'écrit dans les TROIS porteurs d'un seul geste. Un
     numéro implicite est exactement ce que le contrat de versionnage supprime.
     Le SCHÉMA du bundle est posé au manifeste dans le même geste : c'est ce
     nombre-là, et non le numéro de version, que l'amorceur compare au schéma
     du personnage pour sortir l'écran de version. Personne ne l'écrivait, et
     une montée de schéma laissait donc le manifeste en arrière jusqu'à ce que
     scripts/verif_versions.py la signale, publication déjà déroulée.
  2. LA DESCENTE. Le pas de migration qui mène au schéma publié doit savoir se
     défaire. Sans lui, une table restée sur la version d'avant ne peut plus
     lire le personnage qui est passé par la nouvelle : la fiche est captive.
     Un pas volontairement irréversible se publie avec --sans-descente et un
     --motif, qui s'affiche en clair dans le journal de publication.
  3. LES ?v=. Le site charge le bundle par mkdocs.yml, Roll20 le charge par le
     manifeste. Deux numéros qui divergent, et les deux mondes font tourner
     deux codes différents en croyant faire tourner le même. On les monte donc
     TOUS ENSEMBLE, sur un seul numéro commun : aucun fichier de la fiche ne
     peut plus rester en arrière tout seul. (Le ?v= n'est PAS le numéro de
     version : c'est une clé de cache, avec sa propre règle de non-recul.)
  4. L'ÉPREUVE DU MOTEUR (scripts/test_migrations.js).
  5. L'ARCHIVE (scripts/archive_fiche.py), sans quoi « ouvrir avec la version
     de la fiche » n'a rien à ouvrir. Elle ne se gèle QUE lorsque le numéro
     ouvre une ligne X.Y : un correctif ne gèle rien, et le journal le dit,
     sans quoi un auteur croirait à une panne.
  6. LA COHÉRENCE DES VERSIONS (scripts/verif_versions.py).

L'ORDRE N'EST PAS LIBRE. Le numéro s'écrit AVANT l'archive, puisque c'est lui
qui décide si une ligne s'ouvre ; et il s'écrit APRÈS l'épreuve du moteur,
pour qu'un moteur fautif arrête la publication avant qu'elle ait laissé la
moindre trace.

CE QUE CE SCRIPT NE FAIT JAMAIS
Il n'appelle PAS scripts/ci_extension.py. Le quota de soumissions Mozilla se
compte à la dizaine par jour, et la coquille signée est indépendante de la
fiche : c'est tout l'intérêt de l'amorceur gelé. Les trois numéros du projet
visent la même ligne, mais chacun avance quand il a une raison d'avancer.
"""

import argparse
import io
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import version_fiche as V  # noqa: E402  (la grammaire du numéro, partagée)
import assembler as A      # noqa: E402  (le collage des morceaux, avant tout le reste)

RACINE_DEFAUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Les fichiers de la FICHE, les seuls dont ce script monte le ?v=. extra.css,
# jjk.css et les scripts du site ne sont pas de la fiche : les monter à chaque
# publication ferait retélécharger tout le site pour rien.
FICHIERS = [
    "javascripts/jjk-attr-map.js",
    "javascripts/jjk-roll20-boot.js",
    "javascripts/jjk-migrations.js",
    "javascripts/jjk-mods.js",
    "javascripts/jjk-fiche.js",
    "stylesheets/jjk-fiche.css",
    "stylesheets/jjk-roll20.css",
    # le plateau de Narration : servi par le même site, à travers la même
    # coquille signée, il doit monter avec les autres — un ?v= figé aurait
    # l'air de protéger sans rien protéger
    "javascripts/jjk-narration.js",
    "stylesheets/jjk-narration.css",
]


# UNE SEULE GRAMMAIRE POUR TOUS LES OUTILS DE PUBLICATION, dans
# scripts/version_fiche.py : les chemins des porteurs (V.BUNDLE, V.MANIFESTE,
# V.MKDOCS), le lecteur utf-8-sig (V.lire_fichier), le saut de ligne dominant
# (V.fin_de_ligne), la lecture des constantes du bundle (V.constantes_bundle) et
# la forme des ?v= (V.sans_v, V.serial_v, V.serials_mkdocs). Ce fichier les avait
# tous recopiés, dont un détour qui rechargeait archive_fiche.py par chemin pour
# n'y reprendre qu'un alias de V.fin_de_ligne.


# ---------------------------------------------------------- 1. la descente
SONDE_DESCENTE = r"""
/* Le pas qui mène au schéma publié sait-il redescendre ?
 * On ne se contente pas de regarder si descendre() existe : le moteur l'exige
 * déjà au chargement. Ce qui nous intéresse est le pas qui existe et qui
 * REFUSE, en levant JjkMigr.IRREVERSIBLE. Celui-là condamne toute table restée
 * sur la version d'avant, et il ne se publie pas par distraction. */
"use strict";
var M = require(process.argv[2]);
var s = parseInt(process.argv[3], 10);
var out = { base: M.SCHEMA_BASE, pas: false, descendre: false,
            ok: false, irreversible: false, message: "" };
var p = M.pas(s);
if (p) { out.pas = true; out.descendre = typeof p.descendre === "function"; }
if (out.descendre) {
  var r = M.appliquer({ v: s }, s, s - 1);
  out.ok = !!r.ok;
  if (!r.ok) {
    out.message = (r.erreur && r.erreur.message) ? r.erreur.message : "";
    out.irreversible = !!(r.erreur && r.erreur.irreversible);
  }
}
console.log(JSON.stringify(out));
"""


def controle_descente(racine, schema, journal):
    """Rend (bloquant, texte) : bloquant = il faut --sans-descente."""
    migrations = os.path.join(racine, "docs", "javascripts", "jjk-migrations.js")
    if not os.path.exists(migrations):
        return (False, "jjk-migrations.js absent, contrôle sauté")
    fd, sonde = tempfile.mkstemp(suffix=".js")
    os.close(fd)
    try:
        with io.open(sonde, "w", encoding="utf-8") as f:
            f.write(SONDE_DESCENTE)
        r = subprocess.run(["node", sonde, migrations, str(schema)],
                           capture_output=True, text=True)
    except OSError as e:
        return (False, "node introuvable (%s), contrôle sauté" % e)
    finally:
        try:
            os.remove(sonde)
        except OSError:
            pass
    if r.returncode != 0:
        return (False, "la sonde n'a pas tourné : " + (r.stderr or "").strip())
    try:
        d = json.loads((r.stdout or "").strip().splitlines()[-1])
    except (ValueError, IndexError):
        return (False, "sortie de sonde illisible : " + (r.stdout or "").strip())

    if schema <= d["base"]:
        return (False, "schéma %d = le socle, aucun pas à contrôler" % schema)
    if not d["pas"]:
        return (True, "aucun pas de migration vers le schéma %d" % schema)
    if not d["descendre"]:
        return (True, "le pas %d n'a pas de descendre()" % schema)
    if d["irreversible"]:
        return (True, "le pas %d refuse de redescendre : %s" % (schema, d["message"]))
    if not d["ok"]:
        # Un échec qui n'est PAS irréversible se juge sur un vrai état, pas sur
        # le squelette {v:N} que la sonde emploie : c'est le travail de
        # test_migrations.js, qui tourne juste après. On le dit sans bloquer,
        # sinon un pas exigeant ferait échouer toutes les publications.
        journal.append("descente %d -> %d en échec sur un état squelette (%s) ; "
                       "test_migrations.js tranche" % (schema, schema - 1, d["message"]))
        return (False, "descente présente, éprouvée par test_migrations.js")
    return (False, "le pas %d redescend" % schema)


# ------------------------------------------------------------- 2. les ?v=
def serials_actuels(racine):
    """Tous les ?v= portés par les fichiers de la fiche, des deux côtés."""
    vus = []
    for chemin, serial in V.serials_mkdocs(
            V.lire_fichier(os.path.join(racine, V.MKDOCS))).items():
        if chemin in FICHIERS and serial:
            vus.append(serial)
    with open(os.path.join(racine, V.MANIFESTE), "rb") as f:
        man = json.loads(f.read().decode("utf-8"))
    # « narration » compte comme les autres. monter_manifeste() montait déjà ce
    # bloc, mais personne ne le LISAIT ici : le plus grand ?v= servi pouvait
    # donc être le sien sans que prochain_serial() le voie, et le « maximum + 1 »
    # retombait EN DESSOUS. Le plateau serait reparti sur une clé de cache qu'un
    # navigateur avait déjà vue, avec l'ancien fichier au bout.
    for liste in ([man.get("amorce") or []]
                  + [(man.get("narration") or {}).get("js") or []]
                  + [(man.get("narration") or {}).get("css") or []]
                  + [(man.get("bundle") or {}).get("js") or []]
                  + [(man.get("bundle") or {}).get("css") or []]):
        for u in liste:
            if V.sans_v(u) in FICHIERS and V.serial_v(u):
                vus.append(V.serial_v(u))
    return vus


def prochain_serial(vus):
    """Un SEUL numéro pour tous, au-dessus de tous les numéros déjà servis.

    Le ?v= n'est qu'une clé de cache : ce qui compte est qu'il ne recule
    jamais. Prendre le maximum + 1 aligne d'un coup des fichiers qui avaient
    dérivé (v=25 d'un côté, v=1 de l'autre) sans jamais faire redescendre un
    fichier, ce qui rendrait un cache périmé à des navigateurs.
    """
    n = 0
    for v in vus:
        m = re.match(r"^\d+$", str(v))
        if m and int(v) > n:
            n = int(v)
    return n + 1


def monter_mkdocs(racine, serial, essai=False):
    chemin = os.path.join(racine, V.MKDOCS)
    with open(chemin, "rb") as f:
        texte = f.read().decode("utf-8")   # la marque d'ordre des octets reste dans le texte
    touches = []
    for f_rel in FICHIERS:
        # \r? explicite avant la fin de ligne : le fichier est en CRLF, et en
        # mode multiligne « $ » s'arrête AVANT le \n mais APRÈS le \r, qu'il
        # faut donc consommer. Sans lui, seules les lignes suivies d'un
        # commentaire (dont le « .* » avale le \r) étaient montées : cinq
        # fichiers sur six restaient en arrière, en silence.
        motif = re.compile(r"^(\s*-\s*)" + re.escape(f_rel)
                           + r"(?:\?v=[^\s#]*)?([ \t]*(?:#[^\r\n]*)?)(\r?)$", re.M)

        def remplace(m, f_rel=f_rel):
            touches.append(f_rel)
            # le \r est rendu tel qu'il a été pris : le fichier garde ses fins
            # de ligne, et le diff ne montre que les lignes réellement montées
            return m.group(1) + f_rel + "?v=" + str(serial) + m.group(2) + m.group(3)
        texte = motif.sub(remplace, texte)
    if not essai:
        with open(chemin, "wb") as f:
            f.write(texte.encode("utf-8"))
    return touches


def poser_schema(racine, schema, essai=False):
    """Aligne man["schema"] sur le SCHÉMA du bundle. Rend (changé, faute).

    Aucun outil ne l'écrivait. Le numéro de version avait ses trois porteurs et
    son geste unique ; le schéma, lui, se posait à la main dans le manifeste, et
    l'oubli ne se voyait qu'à la toute fin, quand verif_versions.py comparait les
    deux nombres, publication déjà déroulée. Or c'est celui du manifeste que
    l'amorceur compare au schéma du personnage : laissé en arrière, il fait
    entrer dans la fiche du jour, sans un mot, un personnage d'une forme d'état
    qu'elle ne sait plus lire.

    Le manifeste est relu et rendu dans son ordre d'origine, avec ses fins de
    ligne d'origine : la seule clé qui bouge est celle-là.
    """
    chemin = os.path.join(racine, V.MANIFESTE)
    if not os.path.exists(chemin):
        return (False, "manifeste introuvable : " + V.MANIFESTE.replace(os.sep, "/"))
    with open(chemin, "rb") as f:
        octets = f.read()
    try:
        man = json.loads(octets.decode("utf-8"))
    except ValueError as e:
        return (False, "%s illisible : %s" % (V.MANIFESTE.replace(os.sep, "/"), e))
    if man.get("schema") == schema:
        return (False, None)
    man["schema"] = schema
    if not essai:
        texte = json.dumps(man, ensure_ascii=False, indent=2) + "\n"
        with open(chemin, "wb") as f:
            f.write(texte.replace("\n", V.fin_de_ligne(octets)).encode("utf-8"))
    return (True, None)


def monter_manifeste(racine, serial, essai=False):
    """Monte les ?v= du manifeste. Les ARCHIVES n'y passent pas : leur chemin
    est immuable, un ?v= y serait un mensonge."""
    chemin = os.path.join(racine, V.MANIFESTE)
    with open(chemin, "rb") as f:
        octets = f.read()
    nl = V.fin_de_ligne(octets)
    man = json.loads(octets.decode("utf-8"))
    touches = []

    def monte(liste):
        for i, u in enumerate(liste or []):
            base = V.sans_v(u)
            if base in FICHIERS:
                liste[i] = base + "?v=" + str(serial)
                touches.append(base)

    monte(man.get("amorce"))
    monte((man.get("narration") or {}).get("js"))
    monte((man.get("narration") or {}).get("css"))
    monte((man.get("bundle") or {}).get("js"))
    monte((man.get("bundle") or {}).get("css"))
    if not essai:
        texte = json.dumps(man, ensure_ascii=False, indent=2) + "\n"
        with open(chemin, "wb") as f:
            f.write(texte.replace("\n", nl).encode("utf-8"))
    return touches


# ------------------------------------------------------ 3, 4, 5. les portes
def lancer(titre, argv, racine):
    print("")
    print("  --- %s" % titre)
    # PYTHONIOENCODING : sous Windows un script python enfant écrit en cp1252
    # et son journal revient en mojibake. On le force en utf-8 pour que les
    # messages de verif_versions.py restent lisibles dans CE journal.
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    try:
        r = subprocess.run(argv, cwd=racine, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", env=env)
    except OSError as e:
        print("      n'a pas pu démarrer : %s" % e)
        return False
    for ligne in ((r.stdout or "") + (r.stderr or "")).splitlines():
        print("      " + ligne)
    return r.returncode == 0


def cran_demande(a):
    """Le cran choisi en ligne de commande, ou None."""
    return "majeur" if a.majeur else ("moyen" if a.moyen else ("petit" if a.petit else None))


def schema_gele(man, texte):
    """(clé de l'archive qui sert cette ligne, schéma qu'elle a gelé).

    (None, None) si la ligne n'a pas encore d'archive, (clé, None) si l'archive
    ne dit pas de schéma lisible.
    """
    if not isinstance(man, dict):
        return (None, None)
    cle = V.archive_de_ligne(man, texte)
    if cle is None:
        return (None, None)
    sch = ((man.get("archives") or {}).get(cle) or {}).get("schema")
    if not isinstance(sch, int) or isinstance(sch, bool):
        return (cle, None)
    return (cle, sch)


def faute_de_schema(man, texte, schema):
    """« Un Z ne touche JAMAIS au format des données », en français ou None.

    LE CONTRÔLE SE JUGE CONTRE L'ARCHIVE, PAS CONTRE LE MANIFESTE. Comparé à
    man["schema"], il ne se déclenchait jamais : verif_versions.py exige que le
    manifeste annonce exactement le schéma du bundle, donc l'auteur monte les
    deux dans le même commit, et le garde-fou ne voyait plus que deux nombres
    égaux. Il n'attrapait que l'oubli du manifeste, c'est-à-dire une faute de
    frappe, et jamais la faute qu'il est censé attraper.

    L'archive, elle, est IMMUABLE : elle se souvient de la forme des données du
    jour où la ligne s'est ouverte, et rien de ce que fait la publication du
    jour ne peut la réaligner. C'est la seule mémoire disponible ici.

    Une ligne NEUVE (aucune archive) ne dit rien et ne doit rien dire : c'est
    précisément le moment où le schéma a le droit de monter, puisque la
    publication va geler la forme du jour dans une archive à elle.
    """
    cle, gele = schema_gele(man, texte)
    if cle is None or gele is None or gele == schema:
        return None
    return ("le bundle publie le schéma %d sur la ligne %s, que l'archive %s a "
            "gelée au schéma %d : ce n'est pas un correctif. Un Z ne touche "
            "JAMAIS au format des données du personnage ; changer la forme de "
            "l'état demande au moins --moyen, qui ouvre une ligne et lui gèle "
            "sa propre archive." % (schema, V.ligne(texte), cle, gele))


def controle_numero(racine, release, schema, cran, impose, sans_montee):
    """Le numéro à publier : (Version ou None si rien à monter, faute).

    Tout se décide ICI, avant la moindre écriture : la forme, le cran, la
    retenue, le suffixe de la branche, le non-recul sous une archive gelée, et
    le seul contrôle mécanique disponible sur la promesse « un Z ne touche pas
    au format des données ».
    """
    faute = V.faute_de_forme(release)
    if faute:
        return (None, "le bundle annonce RELEASE %s" % faute)
    man = V.manifeste(racine)

    if sans_montee:
        # republier le numéro courant reste une publication : il doit être
        # conforme, sinon la reprise d'une publication interrompue serait la
        # porte par où un numéro fautif passerait sans être vu
        v = V.lire(release)
        c = V.branche_beta(racine)
        if c is not None and v.beta != c:
            return (None, "%s %s le suffixe « b » alors que la branche est %s"
                    % (release, "porte" if v.beta else "n'a pas",
                       "la beta" if c else "stable"))
        if isinstance(man, dict):
            for cle, av in sorted(V.archives_lisibles(man).items()):
                if av.rang > v.rang:
                    return (None, "l'archive %s est au-dessus de %s : le numéro "
                            "publié a reculé sous une version déjà gelée"
                            % (cle, release))
        return (None, faute_de_schema(man, release, schema))

    cible, faute = V.decider(racine, cran=cran, impose=impose)
    if faute:
        return (None, faute)
    # Le contrôle porte sur la ligne VISÉE, quel que soit le cran demandé : un
    # --version 3.6.5 posé à la main est un Z tout autant qu'un --petit, et la
    # retenue peut faire ouvrir une ligne neuve à un --petit (3.6.999 -> 3.7.0),
    # auquel cas rien n'est captif, puisqu'une archive sera gelée pour elle.
    return (cible, faute_de_schema(man, cible.texte(), schema))


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Publie une version de la fiche JJK.")
    p.add_argument("--racine", default=RACINE_DEFAUT)
    p.add_argument("--essai", action="store_true", help="déroule tout, n'écrit rien")
    p.add_argument("--v", type=int, default=None, help="numéro de ?v= imposé (clé de cache)")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--majeur", action="store_true", help="une fonctionnalité entière")
    g.add_argument("--moyen", action="store_true",
                   help="un petit module, une grosse erreur corrigée")
    g.add_argument("--petit", action="store_true", help="du CSS, une erreur mineure")
    g.add_argument("--version", metavar="X.Y.Z", default=None,
                   help="numéro imposé (à ne pas confondre avec --v)")
    g.add_argument("--sans-montee", action="store_true", dest="sans_montee",
                   help="republie le numéro courant (reprise d'une publication interrompue)")
    p.add_argument("--sans-descente", action="store_true", dest="sans_descente",
                   help="publie un pas de migration irréversible")
    p.add_argument("--motif", default="", help="pourquoi la descente est abandonnée")
    p.add_argument("--force-archive", action="store_true", dest="force_archive",
                   help="passe --force à archive_fiche.py")
    a = p.parse_args()
    racine = a.racine
    journal = []

    print("PUBLICATION DE LA FICHE" + (" (essai)" if a.essai else ""))

    # 0. L'ASSEMBLAGE, AVANT TOUT LE RESTE. Le fichier servi est un produit :
    # ses morceaux sont la vérité, lui n'en est que le collage. Publier sans
    # réassembler mettrait en ligne le collage d'hier avec les sources du jour,
    # et rien ne le montrerait, puisque le fichier servi aurait l'air normal.
    # Placé ici, avant la lecture de RELEASE et SCHEMA, il garantit aussi que
    # ces deux constantes sont lues dans le fichier qui va réellement partir :
    # les lire avant l'assemblage, c'était publier sous le numéro d'hier.
    print("")
    print("  --- assemblage des fichiers servis")
    ok, journal_a = A.porte(racine, essai=a.essai)
    for l in journal_a:
        print("      " + l)
    if not ok:
        print("")
        print("  ARRÊT : les morceaux ne s'assemblent pas.")
        return 1

    bundle = os.path.join(racine, V.BUNDLE)
    if not os.path.exists(bundle):
        print("  bundle introuvable : " + V.BUNDLE.replace(os.sep, "/"))
        return 1
    release, schema = V.constantes_bundle(V.lire_fichier(bundle))
    # « schema is None » : le schéma est un entier libre, détaché du majeur, et
    # rien ne lui interdit de valoir 0 le jour où la numérotation repart
    if not release or schema is None:
        print("  le bundle ne déclare pas RELEASE et SCHEMA")
        return 1
    print("  version : %s (schéma %d)" % (release, schema))

    # 1. LE NUMÉRO, décidé mais pas encore écrit
    cran = cran_demande(a)
    if cran is None and a.version is None and not a.sans_montee:
        print("")
        print("  ARRÊT : dire de quelle taille est cette mise à jour."
              "\n          --majeur  une fonctionnalité entière"
              "\n          --moyen   un petit module, une grosse erreur corrigée"
              "\n          --petit   du CSS, une erreur mineure"
              "\n          --version X.Y.Z pour imposer un numéro,"
              "\n          --sans-montee pour republier le numéro courant.")
        return 1
    cible, faute = controle_numero(racine, release, schema, cran, a.version, a.sans_montee)
    if faute:
        print("")
        print("  ARRÊT : " + faute)
        return 1
    ligne_avant = V.lire(release).ligne
    # QUI DÉCIDE DU GEL : archive_fiche.py, et lui seul, sur « cette ligne a-t-elle
    # déjà une archive ». Annoncer ici d'après « la ligne change-t-elle » donnait
    # une réponse différente de celle qui allait être prise trois étapes plus bas :
    # une ligne ouverte par les trois porteurs mais que nulle archive ne sert
    # encore SERA gelée, alors que sa ligne ne change pas.
    def gelera(v):
        try:
            return V.archive_de_ligne(V.manifeste(racine), v) is None
        except Exception:
            return None          # on ne sait pas : on n'annonce rien plutôt que de mentir
    if cible is None:
        print("  numéro : %s inchangé (--sans-montee)" % release)
    else:
        print("  numéro : %s -> %s (%s)" % (release, cible.texte(), cran or "imposé"))
        if gelera(cible.texte()):
            # au futur pour une vraie publication, au conditionnel pour un
            # essai : c'est le même mot qui, dit trop vite, ferait chercher une
            # archive que l'essai n'a jamais eu l'intention d'écrire
            print("           la ligne passe de %s à %s : une archive %s"
                  % (ligne_avant, cible.ligne,
                     "SERAIT gelée (l'essai n'écrit rien)" if a.essai else "sera GELÉE"))
        else:
            print("           même ligne %s : aucune archive ne sera gelée" % cible.ligne)

    # 2. la descente, AVANT d'écrire quoi que ce soit
    print("")
    print("  --- descente du pas %d" % schema)
    bloquant, texte = controle_descente(racine, schema, journal)
    print("      " + texte)
    if bloquant:
        if not a.sans_descente:
            print("")
            print("  ARRÊT : reprendre avec --sans-descente --motif \"…\" si "
                  "l'irréversibilité est voulue.")
            return 1
        if not a.motif.strip():
            print("")
            print("  ARRÊT : --sans-descente exige un --motif, qui reste au journal.")
            return 1
        print("      --sans-descente ACCEPTÉ, motif : " + a.motif.strip())
        journal.append("publiée sans descente possible — " + a.motif.strip())

    # 3. l'épreuve du moteur AVANT de toucher aux fichiers : elle ne lit rien
    # qu'on modifie, et un moteur fautif doit arrêter la publication avant
    # qu'elle ait laissé la moindre trace.
    if not lancer("scripts/test_migrations.js", ["node", "scripts/test_migrations.js"], racine):
        print("")
        print("  ARRÊT : le moteur de migration est en défaut.")
        return 1

    # 4. LE NUMÉRO S'ÉCRIT ICI, et pas ailleurs : après l'épreuve du moteur (une
    # publication arrêtée ne doit rien laisser derrière elle) et AVANT l'archive,
    # puisque c'est lui qui décide si une ligne s'ouvre. Le poser plus tard
    # gèlerait l'archive sous l'ancienne ligne.
    if cible is not None:
        print("")
        print("  --- numéro %s" % cible.texte())
        touches, absents = V.poser(racine, cible.texte(), essai=a.essai)
        print("      porteurs : %s" % (", ".join(touches) or "aucun (déjà à ce numéro)"))
        if absents:
            print("")
            print("  ARRÊT : porteur(s) introuvable(s) : %s" % ", ".join(absents))
            return 1
        if a.essai:
            # sans cet aveu, le journal d'un essai ferait croire que la suite a
            # jugé le nouveau numéro alors qu'elle juge encore l'ancien
            print("      essai : rien n'est écrit, la suite juge donc encore %s" % release)
        else:
            release = cible.texte()

    # 4 bis. LE SCHÉMA du manifeste, posé par l'outil et non à la main. C'est ce
    # nombre que l'amorceur compare au schéma du personnage : laissé en arrière,
    # il laisse entrer dans la fiche du jour un personnage d'une autre forme
    # d'état, sans écran de version et sans un mot.
    print("")
    print("  --- schéma %d au manifeste" % schema)
    change, faute = poser_schema(racine, schema, essai=a.essai)
    if faute:
        print("")
        print("  ARRÊT : " + faute)
        return 1
    print("      %s" % ("le manifeste annonçait déjà le schéma %d" % schema
                        if not change
                        else ("schéma %d à poser (essai : rien d'écrit)" % schema
                              if a.essai else "schéma %d posé" % schema)))

    # 5. les ?v=, tous sur le même numéro. Ce compteur n'a RIEN à voir avec le
    # numéro de version : c'est une clé de cache, avec sa propre règle de
    # non-recul. Les aligner sur X.Y.Z ferait retélécharger la fiche à
    # contretemps, ou laisserait un cache périmé le jour où le numéro se
    # réécrit.
    serial = a.v if a.v is not None else prochain_serial(serials_actuels(racine))
    print("")
    print("  --- ?v=%d pour les %d fichiers de la fiche" % (serial, len(FICHIERS)))
    mk = monter_mkdocs(racine, serial, essai=a.essai)
    mn = monter_manifeste(racine, serial, essai=a.essai)
    print("      mkdocs.yml  : %s" % (", ".join(mk) or "aucune ligne touchée"))
    print("      manifeste   : %s" % (", ".join(mn) or "aucune URL touchée"))
    oublies = [f for f in FICHIERS if f not in mk and f not in mn]
    if oublies:
        # un fichier de la fiche que personne ne charge est soit mort, soit
        # oublié : dans les deux cas, ça se règle avant de publier
        print("      NON NOMMÉ nulle part : %s" % ", ".join(oublies))

    # 6. l'archive. L'appel est INCONDITIONNEL : c'est archive_fiche.py qui sait
    # si la ligne est neuve. Le journal doit dire lequel des deux cas s'est
    # produit, sinon un auteur croira à une panne le jour où l'étape ne pose
    # plus de dossier.
    argv = [sys.executable, "scripts/archive_fiche.py"]
    if a.essai:
        argv.append("--essai")
    if a.force_archive:
        argv.append("--force")
    # relevé AVANT l'archivage : ensuite l'entrée existe, et le juge répondrait
    # « déjà servie » à cause de l'étape qu'on est justement en train de décrire
    gele_prevu = cible is not None and gelera(cible.texte()) is not False
    if not lancer("scripts/archive_fiche.py", argv, racine):
        print("")
        print("  ARRÊT : la ligne n'a pas pu être gelée.")
        return 1
    if cible is not None and gele_prevu:
        # Un essai n'ouvre RIEN. Annoncer « une archive a été gelée » au bas
        # d'un essai envoyait chercher dans docs/fiche/ un dossier que personne
        # n'avait écrit, et faisait douter de l'archivage lui-même.
        if a.essai:
            journal.append("ligne %s : un essai n'ouvre rien, mais en ordre de "
                           "marche cette publication aurait gelé l'archive %s"
                           % (cible.ligne, cible.nu))
        else:
            journal.append("ligne %s ouverte : une archive a été gelée" % cible.ligne)
    elif cible is not None:
        journal.append("ligne %s inchangée : aucune archive gelée, "
                       "un correctif ne gèle rien" % cible.ligne)

    # 7. la cohérence des versions, EN DERNIER. Elle juge l'état PUBLIÉ, pas
    # celui d'avant : le numéro posé, les ?v= montés, et l'entrée d'archive que
    # le pas 6 vient d'ajouter au manifeste (verif_versions parcourt « archives »
    # et vérifie que chaque fichier nommé existe vraiment sous docs/). Passée avant
    # l'archive, elle reprocherait à la version d'hier de nommer un dossier
    # que la version du jour n'a pas encore posé.
    # S'arrêter ici ne laisse pas de demi-publication : l'archive est un
    # dossier complet ou rien, et le manifeste n'a gagné qu'une clé.
    argv = [sys.executable, "scripts/verif_versions.py"]
    if a.essai and V.archive_de_ligne(V.manifeste(racine) or {}, release) is None:
        # Un essai n'écrit pas l'archive : lui reprocher son absence ferait
        # échouer tout essai d'une LIGNE NEUVE, celui-là même qu'on déroule.
        # Mais le donner à TOUT essai éteignait aussi le contrôle sur une ligne
        # déjà ouverte : une archive réellement manquante (dossier effacé, entrée
        # perdue au manifeste) ne se voyait plus en essai, c'est-à-dire au seul
        # moment où on regarde. Un essai ne pose pas de numéro, donc c'est bien
        # la ligne de « release » que verif_versions.py va juger.
        argv.append("--archive-differee")
    if not lancer("scripts/verif_versions.py", argv, racine):
        print("")
        print("  ARRÊT : les numéros de version ne concordent pas.")
        return 1

    print("")
    for n in journal:
        print("  ! " + n)
    # Rappel volontaire : ce script ne signe rien. Voir l'en-tête.
    print("  scripts/ci_extension.py n'a PAS été appelé (et ne doit pas l'être).")
    print("PUBLICATION : %s en %s" % (release, "essai" if a.essai else "ordre de marche"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
