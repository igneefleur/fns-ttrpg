#!/usr/bin/env python3
"""Protocole de publication d'une version de la fiche JJK.

    python scripts/release_fiche.py --essai     # déroule tout, n'écrit rien
    python scripts/release_fiche.py
    python scripts/release_fiche.py --sans-descente --motif "…"

Publier la fiche, ce n'est pas pousser un fichier : c'est promettre qu'un
personnage écrit aujourd'hui se rouvrira demain, et qu'un personnage écrit
hier se rouvrira dans la version d'hier. Cinq gestes tiennent cette promesse,
et ils s'oublient tous les cinq quand on les fait à la main.

  1. LA DESCENTE. Le pas de migration qui mène au schéma publié doit savoir se
     défaire. Sans lui, une table restée sur la version d'avant ne peut plus
     lire le personnage qui est passé par la nouvelle : la fiche est captive.
     Un pas volontairement irréversible se publie avec --sans-descente et un
     --motif, qui s'affiche en clair dans le journal de publication.
  2. LES ?v=. Le site charge le bundle par mkdocs.yml, Roll20 le charge par le
     manifeste. Deux numéros qui divergent, et les deux mondes font tourner
     deux codes différents en croyant faire tourner le même. On les monte donc
     TOUS ENSEMBLE, sur un seul numéro commun : aucun fichier de la fiche ne
     peut plus rester en arrière tout seul.
  3. L'ÉPREUVE DU MOTEUR (scripts/test_migrations.js).
  4. LA COHÉRENCE DES VERSIONS (scripts/verif_versions.py).
  5. L'ARCHIVE (scripts/archive_fiche.py), sans quoi « ouvrir avec la version
     de la fiche » n'a rien à ouvrir.

CE QUE CE SCRIPT NE FAIT JAMAIS
Il n'appelle PAS scripts/ci_extension.py. Sous Windows les fins de ligne
faussent l'empreinte de extension/ : l'appeler ici déclencherait une
soumission Mozilla pour un dossier qui n'a pas bougé d'un octet, et le quota
de soumissions se compte à la dizaine par jour. La coquille signée est
indépendante de la fiche : c'est tout l'intérêt de l'amorceur gelé.

Il ne touche pas non plus au numéro de version lui-même : RELEASE et SCHEMA se
décident dans le bundle, à la main, et tout le reste en découle.
"""

import argparse
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import tempfile

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
]


def _module(racine, nom):
    """Charge un script voisin par chemin (scripts/ n'est pas un paquet)."""
    chemin = os.path.join(racine, "scripts", nom + ".py")
    spec = importlib.util.spec_from_file_location("jjk_" + nom, chemin)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def lire(chemin):
    with io.open(chemin, encoding="utf-8-sig") as f:
        return f.read()


def constantes_bundle(src):
    rel = re.search(r"""\b(?:var|let|const)\s+RELEASE\s*=\s*["']([^"']+)["']""", src)
    sch = re.search(r"""\b(?:var|let|const)\s+SCHEMA\s*=\s*(\d+)""", src)
    return (rel.group(1) if rel else None, int(sch.group(1)) if sch else None)


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
def _v_de(url):
    m = re.search(r"[?&]v=([^&\s#]+)", url)
    return m.group(1) if m else None


def _sans_v(url):
    return url.split("?", 1)[0]


def serials_actuels(racine):
    """Tous les ?v= portés par les fichiers de la fiche, des deux côtés."""
    vus = []
    src = lire(os.path.join(racine, "mkdocs.yml"))
    for ligne in src.splitlines():
        m = re.match(r"^\s*-\s*([^\s#]+\.(?:js|css))(\?v=([^\s#]+))?\s*(?:#.*)?$", ligne)
        if m and m.group(1) in FICHIERS and m.group(3):
            vus.append(m.group(3))
    with open(os.path.join(racine, "docs", "jjk-manifeste.json"), "rb") as f:
        man = json.loads(f.read().decode("utf-8"))
    for liste in ([man.get("amorce") or []]
                  + [(man.get("bundle") or {}).get("js") or []]
                  + [(man.get("bundle") or {}).get("css") or []]):
        for u in liste:
            if _sans_v(u) in FICHIERS and _v_de(u):
                vus.append(_v_de(u))
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
    chemin = os.path.join(racine, "mkdocs.yml")
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


def monter_manifeste(racine, serial, essai=False):
    """Monte les ?v= du manifeste. Les ARCHIVES n'y passent pas : leur chemin
    est immuable, un ?v= y serait un mensonge."""
    archive = _module(racine, "archive_fiche")
    chemin = os.path.join(racine, "docs", "jjk-manifeste.json")
    with open(chemin, "rb") as f:
        octets = f.read()
    nl = archive._fin_de_ligne(octets)
    man = json.loads(octets.decode("utf-8"))
    touches = []

    def monte(liste):
        for i, u in enumerate(liste or []):
            base = _sans_v(u)
            if base in FICHIERS:
                liste[i] = base + "?v=" + str(serial)
                touches.append(base)

    monte(man.get("amorce"))
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


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="Publie une version de la fiche JJK.")
    p.add_argument("--racine", default=RACINE_DEFAUT)
    p.add_argument("--essai", action="store_true", help="déroule tout, n'écrit rien")
    p.add_argument("--v", type=int, default=None, help="numéro de ?v= imposé")
    p.add_argument("--sans-descente", action="store_true", dest="sans_descente",
                   help="publie un pas de migration irréversible")
    p.add_argument("--motif", default="", help="pourquoi la descente est abandonnée")
    p.add_argument("--force-archive", action="store_true", dest="force_archive",
                   help="passe --force à archive_fiche.py")
    a = p.parse_args()
    racine = a.racine
    journal = []

    print("PUBLICATION DE LA FICHE" + (" (essai)" if a.essai else ""))
    bundle = os.path.join(racine, "docs", "javascripts", "jjk-fiche.js")
    if not os.path.exists(bundle):
        print("  bundle introuvable : docs/javascripts/jjk-fiche.js")
        return 1
    release, schema = constantes_bundle(lire(bundle))
    if not release or not schema:
        print("  le bundle ne déclare pas RELEASE et SCHEMA")
        return 1
    print("  version : %s (schéma %d)" % (release, schema))

    # 1. la descente, AVANT d'écrire quoi que ce soit
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

    # 2. l'épreuve du moteur AVANT de toucher aux fichiers : elle ne lit rien
    # qu'on modifie, et un moteur fautif doit arrêter la publication avant
    # qu'elle ait laissé la moindre trace.
    if not lancer("scripts/test_migrations.js", ["node", "scripts/test_migrations.js"], racine):
        print("")
        print("  ARRÊT : le moteur de migration est en défaut.")
        return 1

    # 3. les ?v=, tous sur le même numéro
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

    # 4. l'archive
    argv = [sys.executable, "scripts/archive_fiche.py"]
    if a.essai:
        argv.append("--essai")
    if a.force_archive:
        argv.append("--force")
    if not lancer("scripts/archive_fiche.py", argv, racine):
        print("")
        print("  ARRÊT : la version n'a pas pu être gelée.")
        return 1

    # 5. la cohérence des versions, EN DERNIER. Elle juge l'état PUBLIÉ, pas
    # celui d'avant : les ?v= montés, et l'entrée d'archive que le pas 4 vient
    # d'ajouter au manifeste (verif_versions parcourt « archives » et vérifie
    # que chaque fichier nommé existe vraiment sous docs/). Passée avant
    # l'archive, elle reprocherait à la version d'hier de nommer un dossier
    # que la version du jour n'a pas encore posé.
    # S'arrêter ici ne laisse pas de demi-publication : l'archive est un
    # dossier complet ou rien, et le manifeste n'a gagné qu'une clé.
    if not lancer("scripts/verif_versions.py", [sys.executable, "scripts/verif_versions.py"], racine):
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
