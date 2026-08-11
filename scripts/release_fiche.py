#!/usr/bin/env python3
"""Protocole de publication d'une version de la fiche Outward.

    python scripts/release_fiche.py --petit --essai   # déroule tout, n'écrit rien
    python scripts/release_fiche.py --moyen
    python scripts/release_fiche.py --sans-montee     # reprise d'une publication interrompue

Publier la fiche, ce n'est pas pousser un fichier : c'est promettre qu'un
personnage écrit aujourd'hui se rouvrira demain. Quatre gestes tiennent cette
promesse, et ils s'oublient tous les quatre quand on les fait à la main.

  1. LE NUMÉRO. Il se demande par son CRAN, jamais à la main : --majeur pour
     une fonctionnalité entière, --moyen pour un petit module ou la correction
     d'une grosse erreur, --petit pour du CSS ou une erreur mineure. Le script
     le calcule (retenue à 999 comprise), pose le suffixe « b » si la branche
     est la beta, et l'écrit dans les TROIS porteurs d'un seul geste. Un
     numéro implicite est exactement ce que le contrat de versionnage supprime.
  2. LE SCHÉMA du bundle, posé au manifeste. C'est ce nombre-là, et non le
     numéro de version, que l'amorceur compare au schéma du personnage pour
     sortir l'écran de version. Personne ne l'écrirait à la main sans l'oublier
     un jour, et l'oubli ne se verrait qu'à la fin, publication déjà déroulée.
  3. LES ?v=. Le site charge le bundle par mkdocs.yml, Roll20 le charge par le
     manifeste. Deux numéros qui divergent, et les deux mondes font tourner
     deux codes différents en croyant faire tourner le même. On les monte donc
     TOUS ENSEMBLE, sur un seul numéro commun : aucun fichier de la fiche ne
     peut plus rester en arrière tout seul. (Le ?v= n'est PAS le numéro de
     version : c'est une clé de cache, avec sa propre règle de non-recul.)
  4. LA COHÉRENCE DES VERSIONS (scripts/verif_versions.py), EN DERNIER, pour
     qu'elle juge l'état PUBLIÉ et non celui d'avant.

CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI

Il n'appelle PAS scripts/ci_extension.py. Le quota de soumissions Mozilla se
compte à la dizaine par jour, il est partagé avec l'extension de la branche
sœur, et la coquille signée est indépendante de la fiche : c'est tout l'intérêt
de l'amorceur gelé. Les trois numéros du projet visent la même ligne, mais
chacun avance quand il a une raison d'avancer.

Il ne gèle AUCUNE ARCHIVE : Outward n'en a pas (« archives » vaut {} au
manifeste). Il n'y a donc rien à figer, rien à comparer à un schéma gelé, et le
seul non-recul disponible est le plancher des trois porteurs (voir
scripts/version_fiche.py). Le jour où une archive existera, une étape reviendra
ici, entre le 3 et le 4.

Il n'éprouve PAS le moteur de migrations : la chaîne est vide (schéma 1 = le
socle), il n'y a pas un seul pas à faire monter ni redescendre. Cette épreuve
revient le jour du premier pas, et elle passera AVANT toute écriture — un moteur
fautif doit arrêter la publication avant qu'elle ait laissé la moindre trace.
"""

import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import version_fiche as V  # noqa: E402  (la grammaire du numéro, partagée)

RACINE_DEFAUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# LES FICHIERS DE LA FICHE, les seuls dont ce script monte le ?v=. extra.css,
# night.css et les scripts du site n'en sont pas : les monter à chaque
# publication ferait retélécharger tout le site pour rien.
#
# CETTE LISTE DOIT NOMMER TOUT CE QUE LE SITE SERT ET QUE LE MANIFESTE CITE.
# Un fichier oublié ici garde son ?v= pendant que les autres montent : il reste
# alors servi depuis le cache du navigateur, au milieu d'une fiche neuve, et
# rien ne le dit. Le journal signale d'ailleurs tout fichier de cette liste que
# ni mkdocs.yml ni le manifeste ne nomment — il est mort ou oublié.
FICHIERS = [
    "javascripts/owd-attr-map.js",
    "javascripts/owd-roll20-boot.js",
    "javascripts/owd-migrations.js",
    # le moteur de mods : chargé AVANT la fiche, qui l'interroge. Il a été
    # oublié de cette liste à sa création, alors qu'il était bien nommé au
    # manifeste et à mkdocs.yml — c'est la faute exacte que l'avertissement
    # ci-dessus décrit, et elle serait passée : tout le bundle serait monté
    # d'un cran pendant que le moteur, lui, restait servi depuis le cache.
    "javascripts/owd-mods.js",
    "javascripts/owd-fiche.js",
    "stylesheets/owd-fiche.css",
    "stylesheets/owd-roll20.css",
    # le panneau de Camp : servi par le même site, à travers la même coquille
    # signée, il doit monter avec les autres — un ?v= figé aurait l'air de
    # protéger sans rien protéger
    "javascripts/owd-camp.js",
    "stylesheets/owd-camp.css",
    # ENGENDRÉ AU BUILD, et monté quand même. hooks/owd_creation.py le produit
    # depuis les règles : il n'est donc pas sur le disque, mais il EST servi par
    # le site et nommé au manifeste (bundle.data), et son contenu change dès
    # qu'une règle bouge. Le laisser hors de cette liste, c'est servir un vieux
    # barème de rangs à une fiche neuve. Le contrôle d'existence sur disque le
    # saute déjà, comme le fait verif_versions.py.
    "owd-creation.json",
]

# LES BLOCS DU MANIFESTE QUI PORTENT DES ?v=. Une seule liste, lue par les DEUX
# fonctions qui s'en servent : celle qui relève les clés déjà servies et celle
# qui les monte. Sur la branche sœur, un bloc était monté sans être relu : le
# plus grand ?v= servi pouvait donc être le sien sans que le calcul du suivant
# le voie, et le « maximum + 1 » retombait EN DESSOUS d'une clé déjà servie —
# le panneau serait reparti sur une clé de cache qu'un navigateur avait déjà
# vue, avec l'ancien fichier au bout.
def blocs_a_serial(man):
    """Les listes d'URL du manifeste qui portent un ?v=, dans l'ordre.

    « archives » n'en est pas et n'en sera jamais : le chemin d'une archive est
    immuable, un ?v= y serait un mensonge. (Outward n'en a pas, mais la règle se
    dit ici pour le jour où il en aura une.)
    """
    return [
        man.get("amorce"),
        (man.get("camp") or {}).get("js"),
        (man.get("camp") or {}).get("css"),
        (man.get("bundle") or {}).get("js"),
        (man.get("bundle") or {}).get("css"),
    ]


# « bundle.data » EST UNE CHAÎNE, PAS UNE LISTE, et c'est le seul porteur de ?v=
# dans ce cas. Il ne pouvait donc pas entrer dans blocs_a_serial(), dont les deux
# consommateurs parcourent des listes et les MUTENT en place ; l'envelopper dans
# une liste d'un élément aurait relu le bon numéro sans jamais écrire le nouveau,
# la mutation ne retombant pas dans le manifeste.
#
# Il doit pourtant monter avec les autres : owd-creation.json est engendré au
# build par hooks/owd_creation.py depuis docs/content/regles/, donc son contenu
# change dès qu'une règle bouge. Servi depuis le cache d'un navigateur, il ferait
# tourner la fiche du jour sur le barème des rangs d'hier — et rien ne le dirait.
def data_du_bundle(man):
    """L'URL de bundle.data, ou None si le manifeste n'en porte pas."""
    d = (man.get("bundle") or {}).get("data")
    return d if isinstance(d, str) and d else None


def pose_data_du_bundle(man, url):
    man.setdefault("bundle", {})["data"] = url


# UNE SEULE GRAMMAIRE POUR TOUS LES OUTILS DE PUBLICATION, dans
# scripts/version_fiche.py : les chemins des porteurs (V.BUNDLE, V.MANIFESTE,
# V.MKDOCS), le lecteur utf-8-sig (V.lire_fichier), le saut de ligne dominant
# (V.fin_de_ligne), la lecture des constantes du bundle (V.constantes_bundle) et
# la forme des ?v= (V.sans_v, V.serial_v, V.serials_mkdocs). Les recopier ici
# ferait deux lectures du même fichier, et une copie ne se corrige jamais deux
# fois le même jour.


# ------------------------------------------------------------- 1. les ?v=
def serials_actuels(racine):
    """Tous les ?v= portés par les fichiers de la fiche, des deux côtés."""
    vus = []
    for chemin, serial in V.serials_mkdocs(
            V.lire_fichier(os.path.join(racine, V.MKDOCS))).items():
        if chemin in FICHIERS and serial:
            vus.append(serial)
    with open(os.path.join(racine, V.MANIFESTE), "rb") as f:
        man = json.loads(f.read().decode("utf-8"))
    for liste in blocs_a_serial(man):
        for u in (liste or []):
            if V.sans_v(u) in FICHIERS and V.serial_v(u):
                vus.append(V.serial_v(u))
    # le scalaire, relu comme les listes : son numéro compte dans le maximum,
    # sans quoi « maximum + 1 » pourrait retomber sur une clé qu'il a déjà servie
    d = data_du_bundle(man)
    if d and V.sans_v(d) in FICHIERS and V.serial_v(d):
        vus.append(V.serial_v(d))
    return vus


def prochain_serial(vus):
    """Un SEUL numéro pour tous, au-dessus de tous les numéros déjà servis.

    Le ?v= n'est qu'une clé de cache : ce qui compte est qu'il ne recule
    jamais. Prendre le maximum + 1 aligne d'un coup des fichiers qui auraient
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
        # \r? EXPLICITE AVANT LA FIN DE LIGNE. Le dépôt est travaillé sous
        # Windows et mkdocs.yml est en CRLF dans la copie de travail : en mode
        # multiligne, « $ » s'arrête AVANT le \n mais APRÈS le \r, qu'il faut
        # donc consommer. Sans lui, seules les lignes suivies d'un commentaire
        # (dont le « .* » avale le \r) seraient montées, et les autres
        # resteraient en arrière EN SILENCE — c'est ce qui a laissé cinq
        # fichiers sur six derrière sur la branche sœur.
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


def monter_manifeste(racine, serial, essai=False):
    """Monte les ?v= du manifeste, sur les mêmes blocs que serials_actuels()."""
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

    for liste in blocs_a_serial(man):
        monte(liste)
    # le scalaire se pose par affectation, là où les listes se mutent
    d = data_du_bundle(man)
    if d and V.sans_v(d) in FICHIERS:
        pose_data_du_bundle(man, V.sans_v(d) + "?v=" + str(serial))
        touches.append(V.sans_v(d))
    if not essai:
        texte = json.dumps(man, ensure_ascii=False, indent=2) + "\n"
        with open(chemin, "wb") as f:
            f.write(texte.replace("\n", nl).encode("utf-8"))
    return touches


# ---------------------------------------------------------- 2. le schéma
def poser_schema(racine, schema, essai=False):
    """Aligne man["schema"] sur le SCHÉMA du bundle. Rend (changé, faute).

    C'est le schéma DU MANIFESTE que l'amorceur compare à celui du personnage :
    laissé en arrière, il fait entrer dans la fiche du jour, sans un mot, un
    personnage d'une forme d'état qu'elle ne sait plus lire. Le numéro de
    version a ses trois porteurs et son geste unique ; le schéma, s'il se
    posait à la main, s'oublierait, et l'oubli ne se verrait qu'à la toute fin,
    quand scripts/verif_versions.py compare les deux nombres.

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


# ------------------------------------------------------------- 3. la porte
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


def controle_numero(racine, release, cran, impose, sans_montee):
    """Le numéro à publier : (Version ou None si rien à monter, faute).

    Tout se décide ICI, avant la moindre écriture : la forme, le cran, la
    retenue, le suffixe de la branche et le non-recul sous le plancher des trois
    porteurs.
    """
    faute = V.faute_de_forme(release)
    if faute:
        return (None, "le bundle annonce RELEASE %s" % faute)

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
        return (None, None)

    return V.decider(racine, cran=cran, impose=impose)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Publie une version de la fiche Outward.")
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
    a = p.parse_args()
    racine = a.racine

    print("PUBLICATION DE LA FICHE" + (" (essai)" if a.essai else ""))

    bundle = os.path.join(racine, V.BUNDLE)
    if not os.path.exists(bundle):
        print("  bundle introuvable : " + V.BUNDLE.replace(os.sep, "/"))
        return 1
    release, schema = V.constantes_bundle(V.lire_fichier(bundle))
    # « schema is None » et non « not schema » : le schéma est un entier libre,
    # détaché du majeur, et rien ne lui interdit de valoir 0 le jour où la
    # numérotation repart
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
    cible, faute = controle_numero(racine, release, cran, a.version, a.sans_montee)
    if faute:
        print("")
        print("  ARRÊT : " + faute)
        return 1
    if cible is None:
        print("  numéro : %s inchangé (--sans-montee)" % release)
    else:
        print("  numéro : %s -> %s (%s)" % (release, cible.texte(), cran or "imposé"))

    # 2. LE NUMÉRO S'ÉCRIT ICI. Il n'y a rien avant lui qui puisse encore
    # arrêter la publication : la seule épreuve qui devrait le précéder est
    # celle du moteur de migrations, et elle n'existera qu'avec le premier pas
    # (voir l'en-tête). Le jour où elle reviendra, elle se placera AVANT cette
    # ligne, pour qu'une publication arrêtée ne laisse rien derrière elle.
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

    # 3. LE SCHÉMA du manifeste, posé par l'outil et non à la main.
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

    # 4. LES ?v=, tous sur le même numéro. Ce compteur n'a RIEN à voir avec le
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

    # 5. LA COHÉRENCE DES VERSIONS, EN DERNIER. Elle juge l'état PUBLIÉ, pas
    # celui d'avant : le numéro posé, le schéma au manifeste et les ?v= montés.
    # S'arrêter ici ne laisse pas de demi-publication — rien de ce qui précède
    # n'est un dossier à moitié écrit.
    if not lancer("scripts/verif_versions.py",
                  [sys.executable, "scripts/verif_versions.py"], racine):
        print("")
        print("  ARRÊT : les numéros de version ne concordent pas.")
        return 1

    print("")
    # Rappel volontaire : ce script ne signe rien. Voir l'en-tête.
    print("  scripts/ci_extension.py n'a PAS été appelé (et ne doit pas l'être).")
    print("PUBLICATION : %s en %s" % (release, "essai" if a.essai else "ordre de marche"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
