"""Packe l'extension JJK (Firefox + Chrome) en fichiers téléchargeables depuis le site.

- Firefox : extension/firefox/ (Manifest V2) -> docs/download/jjk-roll20-firefox.xpi
- Chrome  : extension/chrome/manifest.json (Manifest V3) + les fichiers PARTAGÉS
  de extension/firefox/ -> docs/download/jjk-roll20-chrome.zip

L'extension est une COQUILLE : la fiche (jjk-creation.js/.css/.json, amorce,
correspondance état <-> Attributes) est SERVIE PAR LE SITE (roll20-fiche.html)
et affichée dans une iframe — plus rien n'est copié du site dans le paquet, et
l'extension n'a besoin d'être re-signée que si la coquille elle-même change.

DEUX PARTIES DANS UN SEUL PAQUET. Ce qui dépend du mode existe en double, sous
extension/firefox/stable/ et extension/firefox/beta/ ; le reste (pages, feuilles,
icônes, popup) est partagé. Les sous-dossiers sont ramassés tels quels : rglob
descend, et l'entrée d'archive garde ses séparateurs « / » (Compress-Archive de
PowerShell 5.1 met des « \\ » que Firefox refuse). Conséquence à ne pas oublier :
TOUT fichier posé sous extension/firefox/ part dans les DEUX paquets, déclaré ou
non, et personne ne le signalera — d'où les contrôles ci-dessous.

LES DEUX PARTIES NE SONT PLUS ÉCRITES, ELLES SONT ENGENDRÉES. Elles étaient
deux copies tenues à la main, et ce fichier les COMPARAIT ligne à ligne pour
attraper la dérive : une surveillance, pas une garantie — un correctif de sûreté
posé d'un seul côté laissait le trou ouvert de l'autre jusqu'à ce que quelqu'un
lance le contrôle. Les huit fichiers sortent maintenant des morceaux de
src/extension/, collés par scripts/assembler.py d'après scripts/assemblage.plan,
où les trois valeurs qui séparent les moitiés sont déclarées UNE fois. La
divergence n'est plus détectée : elle est impossible. Ce qui se vérifie ici a
donc changé de nature — non plus « les deux copies se ressemblent-elles » mais
« chaque moitié est-elle bien à jour par rapport à la source » (voir
_parties_a_jour). Une moitié retouchée à la main fait échouer le contrôle, et le
message dit quoi relancer.

CHAQUE PARTIE PORTE SON PROPRE NUMÉRO, déclaré dans parties.js (voir la
constante VERSIONS_PARTIES). Ce fichier est ÉCRIT par scripts/ci_extension.py
juste avant l'empaquetage et lu par le popup ; il est nommé ici parce que les
deux outils en ont besoin, et qu'une deuxième copie du nom finirait par mentir.

Comme rien de cette extension n'est essayable ici (personne n'a de compte
Roll20), verifie() fait tout ce qui se vérifie sans navigateur : chaque fichier
nommé par un manifeste existe, aucun fichier n'est orphelin, les deux manifestes
déclarent la même chose, chaque moitié est à jour par rapport à ses morceaux, et
chaque ligne marquée « propre à cette copie » nomme bien SA partie et pas
l'autre. Ce dernier contrôle survit à l'assemblage, et pour une bonne raison :
la substitution supprime le risque de laisser une ligne en arrière, pas celui
d'écrire la mauvaise valeur en face du mauvais nom dans le plan.

    python scripts/build_extension.py              # packe dans docs/download/
    python scripts/build_extension.py --verifie    # contrôles seuls, rien d'écrit
    python scripts/build_extension.py --sortie DIR # packe ailleurs (essai)

ATTENTION : sans --sortie, build() ÉCRASE docs/download/jjk-roll20-firefox.xpi,
c'est-à-dire le binaire SIGNÉ que distribue le site (Firefox refuse alors de
l'installer, sans que rien n'échoue en CI). Pour seulement voir ce que contient
le paquet, prendre --sortie ou --verifie.
"""
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath

sys.path.insert(0, str(Path(__file__).resolve().parent))
import assembler  # noqa: E402  (le collage des morceaux : c'est lui qui fait les deux moitiés)

ROOT = Path(__file__).resolve().parent.parent
FF = ROOT / "extension" / "firefox"           # source de vérité (manifest V2 + fichiers)
CHROME = ROOT / "extension" / "chrome"
CHROME_MANIFEST = CHROME / "manifest.json"    # manifest V3 seul
DL = ROOT / "docs" / "download"
NOM_FF = "jjk-roll20-firefox.xpi"
NOM_CHROME = "jjk-roll20-chrome.zip"

# Les deux parties. Les fichiers qui dépendent du mode existent une fois par
# dossier, sous le MÊME nom, parce qu'ils sortent des MÊMES morceaux : c'est le
# plan d'assemblage qui les nomme, pas une main.
PARTIES = ("stable", "beta")
# La ligne qui appartient à une copie et à elle seule le dit en bout de ligne.
# Elle ne s'écrit plus deux fois : elle porte un repère dans la source, et
# l'assemblage y pose la valeur de la moitié. La marque reste, parce que c'est
# elle qui donne au contrôle ci-dessous les lignes à juger.
MARQUE = "propre à cette copie"
# Le plan d'assemblage : la source unique des deux moitiés. Son absence est un
# REFUS et non un « rien à faire ». C'est lui qui a remplacé la comparaison des
# deux copies ; sans lui, les huit fichiers ne sont plus tenus par rien, et le
# paquet partirait chez Mozilla avec ce que la dernière main y a laissé.
PLAN = ROOT / "scripts" / "assemblage.plan"
# Orphelins assumés : le README part quand même chez Mozilla (tout ce qui est
# sous firefox/ y part), et le manifeste est la racine, il ne peut être nommé
# par personne.
#
# LES LICENCES DES POLICES en sont, et elles DOIVENT partir. Alegreya et Cinzel
# sont sous SIL Open Font License, qui exige que le texte de la licence
# accompagne toute redistribution — or le paquet signé redistribue bien les
# fichiers de police. Aucun CSS ne les nomme, donc rien ne les atteint : sans
# cette ligne, le contrôle les refuserait en orphelins et on serait tenté de les
# retirer du paquet, c'est-à-dire de violer la licence pour faire taire un
# contrôle.
ORPHELINS_ADMIS = {"README.md", "manifest.json",
                   "fonts/licences/alegreya-OFL.txt",
                   "fonts/licences/cinzel-OFL.txt"}

# LE FICHIER DES VERSIONS DE PARTIES : ce que chaque moitié du paquet déclare
# comme son propre numéro. Il est ÉCRIT par scripts/ci_extension.py à chaque
# signature, jamais à la main, et lu par le popup. Il vit à la RACINE de
# extension/firefox/ et non dans stable/ ni beta/ : il parle des deux à la fois,
# et un fichier de plus dans une partie devrait exister dans l'autre sous le même
# nom (les deux jeux sont comparés plus bas), ce qui donnerait deux déclarations
# concurrentes pour un seul réglage.
VERSIONS_PARTIES = "parties.js"
# Le nom du global que ce fichier pose, et que le popup lit (PARTIES.stable,
# PARTIES.beta). Le popup le charge par une balise script, sans module ni
# import : ce nom est la seule poignée entre l'outil qui écrit et la page qui
# lit, et il ne se change que des deux côtés à la fois.
VAR_VERSIONS = "PARTIES"

# Adresses citées à l'intérieur des fichiers. Les getURL sont EXIGÉS (un getURL
# vers un absent donne un 404 muet, et l'onglet reste blanc) ; les autres
# littéraux qui ressemblent à un chemin ne servent qu'à suivre les liens, car
# beaucoup nomment des pages DU SITE (roll20-fiche.html, roll20-narration.html)
# qui n'ont rien à faire dans le paquet.
RE_HTML = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+)["']""")
RE_CSS = re.compile(r"""url\(\s*["']?([^"')]+)["']?\s*\)""")
RE_GETURL = re.compile(r"""getURL\(\s*["']([^"']+)["']""")
RE_CHEMIN = re.compile(r"""["']([A-Za-z0-9._/-]+\.(?:js|css|html|svg|png|json))["']""")
EXTERNE = ("http://", "https://", "data:", "javascript:", "mailto:", "//", "#")


def refus(msg):
    print(f"[extension] REFUS : {msg}", file=sys.stderr)
    return False


def _lit(p):
    return p.read_text(encoding="utf-8")


def _resolu(depuis, cible):
    """Chemin d'archive d'une adresse citée, ou None si elle sort du paquet."""
    if not cible or cible.startswith(EXTERNE):
        return None
    cible = cible.split("#")[0].split("?")[0]
    if not cible:
        return None
    chemin = PurePosixPath(depuis).parent / cible
    parts = []
    for bout in chemin.parts:
        if bout == ".":
            continue
        if bout == "..":
            if not parts:
                return None          # remonte hors du paquet
            parts.pop()
        else:
            parts.append(bout)
    return "/".join(parts)


def _references(arc):
    """(exigées, suivies) : ce que ce fichier nomme, résolu depuis son dossier.
    Les binaires (icônes) ne nomment rien : on ne tente même pas de les lire."""
    exigees, suivies = set(), set()
    if not arc.endswith((".html", ".css", ".js")):
        return exigees, suivies
    texte = _lit(FF / arc)
    if arc.endswith(".html"):
        brut = [m.group(1) for m in RE_HTML.finditer(texte)]
        exigees |= {r for r in (_resolu(arc, c) for c in brut) if r}
    elif arc.endswith(".css"):
        brut = [m.group(1) for m in RE_CSS.finditer(texte)]
        exigees |= {r for r in (_resolu(arc, c) for c in brut) if r}
    elif arc.endswith(".js"):
        # Un chemin cité par du JS part de la RACINE du paquet, pas du dossier du
        # fichier : c'est vrai de runtime.getURL, et de la balise <script> que
        # shell-loader.js ajoute (l'adresse se résout depuis creator.html, qui
        # est à la racine). Résoudre depuis stable/ donnerait stable/stable/…
        brut = [m.group(1) for m in RE_GETURL.finditer(texte)]
        exigees |= {r for r in (_resolu("racine", c) for c in brut) if r}
        doux = [m.group(1) for m in RE_CHEMIN.finditer(texte)]
        suivies |= {r for r in (_resolu("racine", c) for c in doux) if r}
    return exigees, exigees | suivies


def _declares(manifeste):
    """Tout ce qu'un manifeste nomme, en chemins d'archive."""
    out = set()
    for bloc in manifeste.get("content_scripts", []):
        out |= set(bloc.get("js", [])) | set(bloc.get("css", []))
    war = manifeste.get("web_accessible_resources", [])
    for entree in war:
        if isinstance(entree, str):
            out.add(entree)                      # liste plate (V2)
        else:
            out |= set(entree.get("resources", []))   # bloc à matches (V3)
    out |= set(manifeste.get("icons", {}).values())
    for cle in ("browser_action", "action"):
        bloc = manifeste.get(cle) or {}
        if bloc.get("default_popup"):
            out.add(bloc["default_popup"])
        icone = bloc.get("default_icon")
        if isinstance(icone, str):
            out.add(icone)
        elif isinstance(icone, dict):
            out |= set(icone.values())
    fond = manifeste.get("background") or {}
    out |= set(fond.get("scripts", []))
    for cle in ("page", "service_worker"):
        if fond.get(cle):
            out.add(fond[cle])
    options = manifeste.get("options_ui") or {}
    if options.get("page"):
        out.add(options["page"])
    return out


def _scripts_et_styles(manifeste):
    """js/css des content_scripts, dans l'ordre : les deux manifestes doivent
    dire EXACTEMENT la même chose. Rien ne détecte la dérive aujourd'hui, et
    elle donnerait un paquet Chrome au comportement différent en silence."""
    return [(bloc.get("matches"), bloc.get("js"), bloc.get("css"))
            for bloc in manifeste.get("content_scripts", [])]


def _war(manifeste):
    out = set()
    for entree in manifeste.get("web_accessible_resources", []):
        out |= {entree} if isinstance(entree, str) else set(entree.get("resources", []))
    return out


def _marquees(texte):
    """Les lignes marquées « propre à cette copie » d'une moitié."""
    return [l for l in texte.splitlines() if MARQUE in l]


def _parties_a_jour():
    """Chaque fichier des deux moitiés sort-il bien de ses morceaux ? (ok, engendrés)

    LE CONTRÔLE A CHANGÉ DE NATURE. Il comparait stable/ et beta/ ligne à ligne :
    la duplication était un fait, et on surveillait sa dérive. Les deux moitiés
    sont maintenant ENGENDRÉES par scripts/assembler.py à partir des morceaux de
    src/extension/, avec les trois valeurs qui les séparent déclarées une seule
    fois dans le plan. Comparer n'a plus de sens — deux fichiers faits du même
    moule se ressemblent toujours. Ce qui peut encore mal tourner, c'est qu'une
    moitié soit RETOUCHÉE À LA MAIN, ou qu'une source ait bougé sans qu'on
    réassemble : dans les deux cas le fichier servi ne correspond plus à ses
    morceaux, et c'est cela qu'on mesure.

    On refuse aussi tout fichier de partie que le plan n'engendre PAS. Sans quoi
    il suffirait d'en poser un à la main pour qu'il échappe à tout — et il
    partirait quand même chez Mozilla, puisque tout ce qui est sous
    extension/firefox/ part dans le paquet.
    """
    if not PLAN.exists():
        return (refus(f"{PLAN.relative_to(ROOT).as_posix()} est absent : les deux moitiés "
                      f"de l'extension n'ont plus de source. Elles ne sont plus comparées "
                      f"l'une à l'autre, c'est ce plan qui les engendre."), set())
    try:
        cibles = [c for c in assembler.charger_plan(str(PLAN))
                  if c.sortie.startswith("extension/firefox/")]
    except (OSError, assembler.Faute) as e:
        return (refus(f"plan d'assemblage illisible : {e}"), set())

    ok = True
    engendres = {c.sortie for c in cibles}
    for c in cibles:
        try:
            produit = assembler.assembler(c, str(ROOT))
        except (OSError, assembler.Faute) as e:
            ok = refus(f"{c.sortie} ne s'assemble pas : {e}")
            continue
        identique, journal = assembler.verifier(c, str(ROOT), produit)
        if not identique:
            for ligne in journal:
                print(f"[extension]   {ligne}", file=sys.stderr)
            ok = refus(f"{c.sortie} ne correspond plus à ses morceaux. Soit cette moitié a "
                       f"été retouchée à la main — ce qui ne se fait plus, elle est "
                       f"engendrée — soit un morceau a bougé sans réassemblage. Corriger "
                       f"sous src/extension/, puis « python scripts/assembler.py ».")

    for partie in PARTIES:
        dossier = FF / partie
        if not dossier.is_dir():
            ok = refus(f"partie manquante : extension/firefox/{partie}/ (elle est "
                       f"engendrée : « python scripts/assembler.py »)")
            continue
        for p in sorted(dossier.rglob("*")):
            if not p.is_file():
                continue
            arc = p.relative_to(ROOT).as_posix()
            if arc not in engendres:
                ok = refus(f"{arc} n'est engendré par aucun bloc de "
                           f"{PLAN.relative_to(ROOT).as_posix()} : il a été posé à la main "
                           f"dans une moitié, rien ne le tient, et il part quand même dans "
                           f"le paquet signé.")
    return (ok, engendres)


def verifie():
    """Tout ce qui se vérifie sans navigateur. Rend True si rien ne cloche."""
    ok = True
    presents = {p.relative_to(FF).as_posix() for p in FF.rglob("*") if p.is_file()}

    intrus = sorted(p.name for p in CHROME.rglob("*") if p.is_file() and p.name != "manifest.json")
    if intrus:
        ok = refus(f"extension/chrome/ ne doit contenir que manifest.json : {intrus} "
                   f"(rien d'autre n'est jamais packé ni haché, ce serait perdu en silence)")

    mv2 = json.loads(_lit(FF / "manifest.json"))
    mv3 = json.loads(_lit(CHROME_MANIFEST))
    if mv2.get("version") != mv3.get("version"):
        ok = refus(f"les deux manifestes annoncent {mv2.get('version')} et {mv3.get('version')}")
    if _scripts_et_styles(mv2) != _scripts_et_styles(mv3):
        ok = refus("les content_scripts des deux manifestes diffèrent")
    if _war(mv2) != _war(mv3):
        ok = refus(f"web_accessible_resources diffère : V2 seul {sorted(_war(mv2) - _war(mv3))}, "
                   f"V3 seul {sorted(_war(mv3) - _war(mv2))}")
    joker = sorted(r for r in _war(mv2) | _war(mv3) if "*" in r)
    if joker:
        ok = refus(f"joker en web_accessible_resources : {joker} (la revue Mozilla lit mal "
                   f"une liste qui ne s'énumère pas ; écrire les fichiers un par un)")
    # En V2 les ressources accessibles n'ont PAS de champ matches : sous Firefox
    # elles sont exposées à toute origine, et l'UUID tiré au hasard à
    # l'installation est la seule protection. La V3, elle, sait les restreindre :
    # doubler la liste ne doit pas être l'occasion d'y renoncer.
    for entree in mv3.get("web_accessible_resources", []):
        if not isinstance(entree, str) and entree.get("matches") != ["https://app.roll20.net/*"]:
            ok = refus(f"web_accessible_resources V3 : matches élargi -> {entree.get('matches')}")

    # Une ressource qu'un script de contenu fait charger PAR LA PAGE Roll20 (la
    # balise du pont, l'iframe d'une coquille) doit être accessible au web, sinon
    # elle échoue en silence : pas d'erreur, juste un onglet blanc. Rien ne le
    # dit en lisant le code, et rien ne l'essaiera avant une vraie partie.
    scripts_contenu = {j for bloc in mv2.get("content_scripts", []) for j in bloc.get("js", [])}
    for arc in sorted(scripts_contenu & presents):
        for cible in sorted(_references(arc)[0] - _war(mv2)):
            ok = refus(f"{arc} : getURL({cible!r}) mais {cible} n'est pas dans "
                       f"web_accessible_resources (échec muet, onglet blanc)")

    # Ce que les manifestes nomment doit exister : Firefox refuse le paquet sinon.
    #
    # LE FICHIER DES VERSIONS DE PARTIES EST UNE RACINE, lui aussi, bien qu'aucun
    # manifeste ne le nomme. Le tenir pour tel répond d'un coup aux deux façons
    # dont il peut disparaître sans bruit : ORPHELIN s'il reste dans le paquet
    # alors que plus personne ne le charge (il partirait chez Mozilla pour rien),
    # MANQUANT si on l'efface (le popup n'aurait plus qu'un global indéfini et
    # deux lignes vides, et rien ici ne l'aurait vu). Et l'exiger ICI, plutôt que
    # de compter sur la balise <script> du popup, tient même le jour où le popup
    # est réécrit : le paquet doit le porter parce que c'est le paquet qui le
    # déclare, pas parce qu'une page l'appelle aujourd'hui.
    racines = _declares(mv2) | _declares(mv3) | {VERSIONS_PARTIES}
    manquants = sorted(racines - presents)
    if VERSIONS_PARTIES in presents:
        src = _lit(FF / VERSIONS_PARTIES)
        # « var PARTIES », et non « PARTIES » tout court : le nom se retrouve
        # aussi dans l'en-tête du fichier, et un contrôle qui s'en contente
        # passerait sur un fichier réduit à ses commentaires.
        muet = [c for c in ["var " + VAR_VERSIONS] + ['"%s"' % p for p in PARTIES]
                if c not in src]
        if muet:
            ok = refus(f"{VERSIONS_PARTIES} ne déclare pas {muet} : il est écrit par "
                       f"scripts/ci_extension.py et ne se modifie pas à la main. "
                       f"Sans ces noms, le popup n'a plus de numéro à afficher et "
                       f"personne ne s'en apercevrait avant une vraie partie.")

    # Puis ce que les fichiers nomment entre eux, de proche en proche.
    atteints, a_voir = set(racines), list(racines)
    while a_voir:
        arc = a_voir.pop()
        if arc not in presents:
            continue
        exigees, suivies = _references(arc)
        manquants += sorted(exigees - presents)
        for suite in suivies:
            if suite in presents and suite not in atteints:
                atteints.add(suite)
                a_voir.append(suite)
    if manquants:
        ok = refus(f"fichiers nommés mais absents : {sorted(set(manquants))}")
    orphelins = sorted(presents - atteints - ORPHELINS_ADMIS)
    if orphelins:
        ok = refus(f"fichiers orphelins (ni déclarés, ni atteints, et pourtant expédiés "
                   f"chez Mozilla) : {orphelins}")

    # Les deux parties sortent du plan d'assemblage : ni comparées l'une à
    # l'autre, ni écrites à la main — engendrées, et vérifiées à jour.
    ok = _parties_a_jour()[0] and ok
    jeux = {}
    for partie in PARTIES:
        dossier = FF / partie
        jeux[partie] = ({p.name for p in dossier.iterdir() if p.is_file()}
                        if dossier.is_dir() else set())
    for nom in sorted(jeux.get("stable", set()) & jeux.get("beta", set())):
        marques_s = _marquees(_lit(FF / "stable" / nom))
        marques_b = _marquees(_lit(FF / "beta" / nom))
        # CHAQUE LIGNE MARQUÉE DOIT DÉSIGNER SA PROPRE PARTIE, et jamais
        # l'autre. Ne vérifier que l'absence du mot d'en face laissait passer
        # les trois oublis qui comptent, tous mesurés : une copie beta restée
        # en MODE "stable", une coquille beta pointant encore sur /jjk/, et un
        # pont dont l'adresse n'a pas suivi son dossier. Dans les trois cas la
        # ligne ne contient PAS le mot de l'autre partie, donc rien ne bronchait,
        # et le paquet partait chez Mozilla en annonçant « identiques hors mode ».
        #
        # CE CONTRÔLE SURVIT À L'ASSEMBLAGE, et ce n'est pas par prudence
        # superstitieuse. La substitution a supprimé une faute (oublier de
        # reporter une ligne d'une moitié à l'autre) et laissé l'autre intacte :
        # rien n'empêche d'écrire « partie = stable » sous « [variante beta] »
        # dans le plan. La faute est juste passée d'un fichier à un autre, et
        # elle se lit toujours ici, sur le fichier engendré.
        for partie, autre, marques in (("stable", "beta", marques_s),
                                       ("beta", "stable", marques_b)):
            for ligne in marques:
                nue = ligne.strip()
                if autre + "/" in ligne:
                    ok = refus(f"{partie}/{nom} : une ligne de mode désigne "
                               f"{autre}/ -> {nue}")
                # une adresse de dossier de partie doit être CELLE de la copie
                if partie + "/" not in ligne and (autre + "/") not in ligne:
                    if "getURL(" in ligne or "runtime.getURL" in ligne:
                        ok = refus(f"{partie}/{nom} : une ligne de mode charge une "
                                   f"ressource sans nommer sa partie -> {nue}")
                # le mode déclaré doit être celui du dossier
                if "var MODE" in ligne and ('"%s"' % partie) not in ligne:
                    ok = refus(f"{partie}/{nom} : MODE ne vaut pas {partie!r} -> {nue}")
                # une adresse du site doit être celle du site de cette partie
                if "igneefleur.github.io" in ligne:
                    attendu = "/jjk-beta/" if partie == "beta" else "/jjk/"
                    interdit = "/jjk/" if partie == "beta" else "/jjk-beta/"
                    if attendu not in ligne or interdit in ligne:
                        ok = refus(f"{partie}/{nom} : une ligne de mode ne pointe pas sur "
                                   f"{attendu} -> {nue}")
        # Et le MODE doit être déclaré : une copie qui ne se nomme nulle part
        # n'a plus rien pour se reconnaître.
        if nom == "content-roll20.js":
            for partie, marques in (("stable", marques_s), ("beta", marques_b)):
                if not any("var MODE" in l for l in marques):
                    ok = refus(f"{partie}/{nom} : aucune ligne marquée ne déclare MODE")

    if ok:
        print(f"[extension] contrôles : {len(presents)} fichiers, "
              f"{len(racines)} déclarés, orphelins admis {sorted(ORPHELINS_ADMIS)}, "
              f"parties {sorted(jeux.get('stable', ()))} engendrées et à jour.")
    return ok


def _write(out, files):
    """files : liste de (source_sur_disque, chemin_dans_archive)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    arcs = []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for src, arc in sorted(files, key=lambda p: p[1]):
            z.write(src, arc)
            arcs.append(arc)
    assert "manifest.json" in arcs, f"manifest.json absent de la racine de {out.name}"
    print(f"[extension] {out} — {out.stat().st_size} octets, {len(arcs)} fichiers")
    return arcs


def build(sortie=None):
    dossier = Path(sortie) if sortie else DL
    # Firefox : tout extension/firefox/ tel quel, sous-dossiers compris.
    ff_files = [(p, p.relative_to(FF).as_posix()) for p in FF.rglob("*") if p.is_file()]
    _write(dossier / NOM_FF, ff_files)

    # Chrome : manifest V3 + tous les fichiers partagés de firefox/ SAUF son manifest.json.
    shared = [(p, arc) for (p, arc) in ff_files if arc != "manifest.json"]
    chrome_files = [(CHROME_MANIFEST, "manifest.json")] + shared
    _write(dossier / NOM_CHROME, chrome_files)


if __name__ == "__main__":
    args = sys.argv[1:]

    # UN ARGUMENT INCONNU NE DOIT RIEN ÉCRIRE. Seule la chaîne exacte
    # « --verifie » arrêtait le script avant l'empaquetage : toute autre
    # orthographe tombait dans build(), qui RÉÉCRIT docs/download/*.xpi,
    # c'est-à-dire le binaire SIGNÉ que le site distribue, par un paquet non
    # signé. Rien n'échouait, le code de sortie restait 0, et le message avait
    # l'air d'un succès. C'est arrivé deux fois, dont une à moi, avec
    # « --verifier ». On refuse donc ce qu'on ne comprend pas, avant d'écrire.
    ADMIS = ("--verifie", "--sortie")
    i, inconnus = 0, []
    while i < len(args):
        a = args[i]
        if a == "--sortie":
            i += 2
            continue
        if a not in ADMIS:
            inconnus.append(a)
        i += 1
    if inconnus:
        sys.exit("[extension] argument inconnu %s : les seuls admis sont "
                 "--verifie (contrôle seul, n'écrit rien) et --sortie <dossier>. "
                 "Rien n'a été écrit ; le paquet signé de docs/download/ est "
                 "intact." % ", ".join(repr(x) for x in inconnus))

    if not verifie():
        sys.exit(1)
    if "--verifie" in args:
        sys.exit(0)
    sortie = None
    if "--sortie" in args:
        sortie = args[args.index("--sortie") + 1]
    build(sortie)
