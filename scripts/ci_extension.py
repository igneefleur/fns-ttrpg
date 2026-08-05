"""Re-signature AUTOMATIQUE de l'extension en CI : rien à faire au push.

Appelé par le workflow de la branche jjk après `mkdocs build`. L'extension est
une COQUILLE (la fiche est servie par le site via roll20-fiche.html) : les
évolutions de la fiche ne passent PLUS par ici, seuls les changements de la
coquille elle-même déclenchent une signature. Logique :

  1. Calcule l'EMPREINTE du contenu de l'extension (tous les fichiers packagés,
     champ "version" des manifests neutralisé : la version ne compte pas).
  2. La compare à docs/download/ext-signed.json (l'empreinte du dernier .xpi
     SIGNÉ, committée). Identique -> rien à faire, le .xpi signé committé reste
     bon. Différente -> la version du PROJET est POSÉE dans les DEUX manifests,
     les DEUX PARTIES sont datées (voir plus bas), empaquetage, signature Mozilla
     (scripts/sign_extension.py, clés dans les secrets GitHub AMO_JWT_ISSUER /
     AMO_JWT_SECRET), écriture de updates.json et de la nouvelle empreinte.
  3. Le workflow committe alors ces fichiers sur la branche ([skip ci]) et
     déploie : les Firefox installés se mettent à jour tout seuls.

UNE VERSION PAR PARTIE, EN PLUS DE CELLE DU PAQUET. Le paquet porte les deux
moitiés, stable/ et beta/, et chacune déclare le numéro du PAQUET auquel elle a
changé pour la dernière fois : c'est ce que dit extension/firefox/parties.js,
écrit ici même, juste avant l'empaquetage, et lu par le popup. La moitié beta
porte le suffixe « b », la stable jamais. Conséquence à assumer : un changement
d'un fichier PARTAGÉ (le popup, un gabarit, une icône) fait sortir un paquet neuf
sans qu'aucune des deux parties ne bouge, et les deux gardent alors leur ancien
numéro pendant que le paquet avance. C'est exactement l'information utile : « ces
deux moitiés n'ont pas changé depuis la 3.6.0 ».

    python scripts/ci_extension.py --etat   # dit ce qui a changé, n'écrit rien

LE NUMÉRO SE POSE, IL NE S'INCRÉMENTE PLUS. Le projet n'a qu'une ligne de
versions : la fiche du site stable, celle du chantier et l'extension visent le
même numéro. La coquille prend donc celui que publie docs/jjk-manifeste.json,
DÉBARRASSÉ du suffixe « b » : l'extension est la même sur les deux branches et
n'en porte jamais.

Ce n'est pas une égalité vérifiable à tout instant, et le contrat l'assume :
tant que la coquille ne bouge pas, ce script sort au premier retour (« contenu
inchangé ») sans rien poser, et les manifests restent en arrière pendant que le
site avance. Les trois numéros visent la même ligne ; chacun avance quand il a
une raison d'avancer.

Si le numéro visé n'est pas STRICTEMENT au-dessus de ce qui est déjà signé, on
ne le pose pas : Mozilla refuse un numéro déjà pris, et le refus tombe après la
validation, quota consommé. On monte alors d'un cran Z au-dessus du plancher,
et on le DIT en clair dans le journal du run. Et si le plancher lui-même est
illisible, on ne pose RIEN : deviner un numéro dans ce cas, c'est en brûler un
chez Mozilla et laisser les manifests estampillés d'un recul.

Utilisable aussi en local (mêmes variables d'environnement).
"""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_extension  # noqa: E402
import sign_extension   # noqa: E402
import version_fiche as V  # noqa: E402  (la grammaire du numéro, partagée)

ROOT = Path(__file__).resolve().parent.parent
FF = ROOT / "extension" / "firefox"
MANIFESTS = [FF / "manifest.json", ROOT / "extension" / "chrome" / "manifest.json"]
STATE = ROOT / "docs" / "download" / "ext-signed.json"
MANIFESTE_SITE = ROOT / "docs" / "jjk-manifeste.json"
# Le fichier que ce script ÉCRIT dans l'extension, et le nom du global qu'il
# pose : les deux viennent de build_extension, qui les nomme pour tout le monde.
VERSIONS_JS = FF / build_extension.VERSIONS_PARTIES
# La partie qui porte le suffixe « b ». Les deux noms de parties, eux, viennent
# de build_extension.PARTIES : une seule liste pour les deux outils.
PARTIE_BETA = "beta"


def _hache(h, etiquette, octets):
    """Un fichier dans une empreinte : son nom, puis son contenu NORMALISÉ.

    Partagé par l'empreinte du paquet et celle d'une partie, pour que les deux
    normalisent PAREIL. Deux copies de ces quatre lignes finiraient par diverger,
    et une empreinte de partie qui bouge sans que rien n'ait changé ferait
    avancer un numéro de partie à chaque signature, ce qui est précisément ce
    qu'on veut éviter. Sur le pourquoi des fins de ligne, voir content_hash().
    """
    h.update(etiquette.encode())
    if b"\x00" not in octets:
        octets = octets.replace(b"\r\n", b"\n")
    h.update(octets)


def content_hash():
    """Empreinte du contenu packagé, indépendante du champ version des manifests.

    ET INDÉPENDANTE DU SYSTÈME, sur deux points qui l'ont fait mentir.

    1. L'ORDRE. Le tri se fait sur le chemin relatif en POSIX, celui-là même
       qui est haché juste après, et non sur des objets Path : `sorted()` sur
       des Path compare une forme normalisée qui dépend du système (mise en
       minuscules sous Windows, pas sous Linux). Il a suffi d'un `README.md`
       en capitales pour que les deux plateformes rangent les mêmes fichiers
       dans un ordre différent.

    2. LES FINS DE LIGNE. Sans .gitattributes, le dépôt se décoche en CRLF
       sous Windows et en LF sous Linux : lire le disque donnait deux suites
       d'octets pour un fichier identique. Les fichiers texte sont donc
       ramenés en LF avant d'être hachés. Les binaires (les icônes) passent
       intacts, reconnus à l'octet nul que git utilise lui-même comme indice :
       les normaliser les abîmerait.

    Une signature faite depuis le poste enregistrait sinon une empreinte que
    la CI ne retrouvait jamais : au déploiement suivant elle croyait
    l'extension modifiée et re-signait, mordant sur le quota AMO pour rien.
    C'est arrivé (2.1.3 signée en local, 2.1.4 re-signée par la CI aussitôt).

    3. LES NUMÉROS, TOUS LES NUMÉROS. Le champ "version" des manifests était
       déjà neutralisé ; parties.js, qui déclare le numéro de chaque
       partie, l'est pour LA MÊME RAISON et il faut y insister, parce que le
       piège y est pire. Ce fichier vit DANS l'extension et c'est CE script qui
       l'écrit, à chaque signature : compté dans l'empreinte, il la ferait
       changer à tout coup, le déploiement suivant croirait l'extension
       modifiée, re-signerait, réécrirait le fichier, changerait l'empreinte…
       une boucle qui tourne toute seule, un quota AMO par tour, sur un quota
       qui se compte à la dizaine par jour. Son NOM reste haché : le fichier
       doit être là, et sa disparition, elle, est bien un changement de paquet.
    """
    h = hashlib.sha256()

    def chemin(p):
        return str(p.relative_to(ROOT)).replace("\\", "/")

    neutre = chemin(VERSIONS_JS)
    files = sorted((p for p in FF.rglob("*") if p.is_file()), key=chemin)
    files.append(MANIFESTS[1])
    for p in files:
        rel = chemin(p)
        if p.name == "manifest.json":
            h.update(rel.encode())
            m = json.loads(p.read_text(encoding="utf-8"))
            m["version"] = "0"
            h.update(json.dumps(m, ensure_ascii=False, sort_keys=True).encode())
        elif rel == neutre:
            h.update(rel.encode())          # présent, oui ; son contenu, jamais
        else:
            _hache(h, rel, p.read_bytes())
    return h.hexdigest()


def empreinte_partie(nom):
    """Empreinte du contenu d'une partie, ou None si le dossier n'est pas là.

    Ce qui APPARTIENT à une partie, c'est extension/firefox/<nom>/ et rien
    d'autre : les fichiers partagés n'en font pas partie, et c'est tout le sens
    de ce numéro (voir l'en-tête). Le nom haché est RELATIF au dossier de la
    partie, pas à la racine du dépôt : sinon les deux moitiés ne pourraient
    jamais avoir la même empreinte, alors même que leurs cinq lignes de
    divergence sont la seule chose qui les sépare, et la comparaison des deux
    états ne dirait plus rien de lisible dans le journal.

    Même normalisation que l'empreinte du paquet, par le même _hache() : l'ordre
    est pris sur le chemin POSIX qui est haché juste après, et les fins de ligne
    sont ramenées en LF. Un dossier lu sous Windows et sous Linux doit rendre le
    même nombre, ou la partie « changerait » à chaque changement de machine.
    """
    dossier = FF / nom
    if not dossier.is_dir():
        return None
    h = hashlib.sha256()

    def sous(p):
        return p.relative_to(dossier).as_posix()

    for p in sorted((q for q in dossier.rglob("*") if q.is_file()), key=sous):
        _hache(h, sous(p), p.read_bytes())
    return h.hexdigest()


def refus(titre, message):
    """Arrête le run en le DISANT, sans rien poser ni signer. Ne rend jamais.

    Une annotation ::error:: pour que la faute paraisse en tête du run, et une
    sortie non nulle pour que le workflow s'arrête là. Un numéro qu'on ne sait
    pas choisir ne se devine pas : il se corrige à la main, et rien n'est parti
    chez Mozilla entre-temps.
    """
    print(f"::error title={titre}::{message}")
    sys.exit("[ci-extension] " + message)


def bump_version(old):
    """Le cran Z au-dessus, RETENUE comprise. N'est plus le chemin normal.

    C'est devenu le repli du cas de recul : quand la version du projet n'est pas
    au-dessus de ce qui est déjà signé, il faut bien proposer quelque chose de
    neuf à Mozilla. Sans la retenue, un 3.6.999 aurait produit 3.6.1000, hors du
    domaine 0 à 999 que le contrat borne.

    UN PLANCHER ILLISIBLE ARRÊTE TOUT. Ce repli repartait de « 0.0.1 » sur un
    simple avertissement : il proposait alors à Mozilla un numéro très en dessous
    de tout ce qui est déjà pris, dont le refus (« version already exists »)
    tombe APRÈS la validation, quota consommé ; et il laissait les deux manifests
    estampillés d'un numéro qui faisait reculer l'extension de plusieurs majeurs,
    committé tel quel par le workflow. Deux dégâts pour une seule ligne
    illisible. On ne devine plus, on refuse.
    """
    # LE PLANCHER PORTE DÉJÀ UN QUATRIÈME NOMBRE dès la première ressortie, et
    # la grammaire du projet n'en connaît que trois : lu tel quel, « 3.6.0.1 »
    # passait pour illisible et l'outil REFUSAIT de choisir un numéro. Ce repli
    # sert justement quand la cible ne convient pas ; le voir tomber là aurait
    # bloqué la seule issue qui restait. On monte le tronc, et le compteur de
    # signatures repart de zéro puisque le X.Y.Z change.
    old = ".".join(str(old).split(".")[:3])
    v = V.lire(str(old))
    if v is None:
        refus("Plancher de version d'extension illisible",
              f"« {old} » n'est pas un numéro X.Y.Z : impossible de savoir ce qui "
              "est déjà pris chez Mozilla, donc impossible de choisir le numéro "
              "suivant. Rien n'est posé ni signé. Corriger le champ version des "
              "deux manifests (ou docs/download/ext-signed.json) puis relancer.")
    try:
        return V.monter(v, "petit").nu
    except ValueError as e:
        # version_fiche lève plutôt que de fabriquer un « 1000 » que plus aucun
        # de ces outils ne sait relire. Laissée remonter, l'exception sortait en
        # trace d'exécution au milieu du journal du run : illisible, et sans le
        # seul mot qui compte, à savoir qu'aucune signature n'a été tentée.
        refus("Plus de numéro au-dessus", str(e))


def stamp_version(version):
    """Pose le numéro dans les DEUX manifests. Dernière porte avant Mozilla.

    LE SUFFIXE « b » NE PASSE PAS. L'extension est la même sur les deux branches
    et n'en porte jamais : signée depuis le chantier, elle brûlerait chez Mozilla
    un numéro que le site stable doit encore publier, et un numéro pris ne se
    reprend pas. Le contrôle est ici, au seul endroit par où le numéro entre dans
    les manifests, plutôt que sur chacun des chemins qui y mènent : c'est ce qui
    le rend impossible à contourner par un chemin de plus.
    """
    # LE QUATRIÈME NOMBRE appartient à l'extension seule, et la grammaire du
    # projet n'en connaît que trois : on le met de côté, on fait valider le
    # tronc, puis on le rend. Sans ce détour, une simple ressortie de coquille
    # (« 3.6.0.1 ») était déclarée illisible et rien ne partait chez Mozilla.
    mx = str(version).split(".")
    quatre = mx[3] if len(mx) > 3 else None
    if quatre is not None and not (quatre.isdigit() and 0 < int(quatre) <= 999):
        refus("Quatrième nombre d'extension invalide",
              f"« {version} » : le compteur de signatures doit être un entier de 1 "
              "à 999, et ne s'écrit jamais quand il vaut zéro (Firefox et Chrome "
              "tiennent « X.Y.Z.0 » pour ÉGAL à « X.Y.Z », et Mozilla refuserait "
              "le second après le premier, APRÈS validation, quota consommé).")
    v = V.lire(".".join(mx[:3]))
    if v is None:
        refus("Version d'extension illisible",
              f"« {version} » n'est pas un numéro X.Y.Z : rien n'est posé dans les "
              "manifests, rien n'est envoyé à la signature.")
    pose = v.nu + ("." + quatre if quatre is not None else "")
    for p in MANIFESTS:
        m = json.loads(p.read_text(encoding="utf-8"))
        m["version"] = pose
        p.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return pose


def parties_connues(state):
    """{partie: (version, empreinte)} d'après l'état enregistré, ou (None, None).

    TOUT EST FACULTATIF ICI, et rien ne doit tomber. L'état a vécu sans la clé
    "parties" et les .json déjà committés ne l'ont pas : une entrée absente,
    tronquée ou d'un autre type doit se lire « on ne sait pas », jamais lever.
    Une exception à cet endroit arrêterait un run qui, lui, n'a rien à se
    reprocher, et il n'y a pas de raison de payer une panne d'affichage au prix
    d'un déploiement.

    « On ne sait pas » n'est pas « inchangé » : voir versions_parties().
    """
    out = {}
    connu = state.get("parties")
    if not isinstance(connu, dict):
        connu = {}
    for nom in build_extension.PARTIES:
        e = connu.get(nom)
        e = e if isinstance(e, dict) else {}
        v, emp = e.get("version"), e.get("hash")
        out[nom] = (v if isinstance(v, str) and v else None,
                    emp if isinstance(emp, str) and emp else None)
    return out


def versions_parties(paquet, state):
    """(déclarations, journal) : le numéro de chaque partie après CE paquet.

    Une partie prend le numéro du paquet qu'on s'apprête à signer QUAND SON
    CONTENU A CHANGÉ, et garde le sien sinon. Les deux moitiés peuvent donc
    rester en arrière pendant que le paquet avance, et c'est voulu : le numéro
    d'une partie répond à « depuis quand cette moitié est-elle celle-là ? », pas
    à « quel paquet est installé ? », auquel le manifeste répond déjà.

    UNE PARTIE INCONNUE COMPTE POUR MODIFIÉE. On ne peut pas prouver qu'elle
    n'a pas bougé, et le seul numéro qu'on puisse honnêtement lui attacher est
    celui du paquet qu'on signe : c'est le seul dont on soit sûr qu'il la
    contient. Ce n'est pas une boucle, parce que l'état repart écrit juste
    après, avec l'empreinte qui manquait.
    """
    ancien = parties_connues(state)
    out, journal = {}, []
    for nom in build_extension.PARTIES:
        emp = empreinte_partie(nom)
        if emp is None:
            # build_extension.verifie() a déjà refusé pour ça, bien avant la
            # moindre requête : on ne fabrique pas un numéro pour un dossier
            # qui n'existe pas, on n'écrit simplement rien sur cette ligne.
            journal.append(f"::warning title=Partie absente::extension/firefox/{nom}/ "
                           "n'existe pas : aucun numéro n'est déclaré pour cette partie.")
            continue
        v_avant, emp_avant = ancien[nom]
        if emp_avant == emp and v_avant:
            out[nom] = {"version": v_avant, "hash": emp}
            journal.append(f"[ci-extension] partie {nom} : inchangée depuis v{v_avant}")
        else:
            # LE SUFFIXE EST CELUI DE LA PARTIE, pas celui de la branche : la
            # moitié beta est la moitié beta dans les deux branches, puisque le
            # même paquet les sert toutes les deux.
            neuve = paquet + ("b" if nom == PARTIE_BETA else "")
            out[nom] = {"version": neuve, "hash": emp}
            journal.append(f"[ci-extension] partie {nom} : "
                           + (f"contenu modifié, v{v_avant} -> v{neuve}" if emp_avant
                              else f"aucune empreinte enregistrée, elle prend v{neuve}"))
    return (out, journal)


def texte_versions_parties(parties):
    """Le fichier de déclaration, tel qu'il part dans les deux paquets.

    IL NE PORTE QUE LES DEUX NUMÉROS DE PARTIES, et surtout pas celui du paquet
    courant. Le paquet est déjà dans les manifests, et le popup le lit là
    (getManifest().version) ; le rappeler ici ferait changer ce fichier à CHAQUE
    signature, y compris celles où aucune des deux moitiés n'a bougé. Or c'est
    justement l'inverse qu'on veut lire : tant que ce fichier ne change pas, les
    deux moitiés sont les mêmes, et son diff dit à lui seul laquelle a bougé.
    """
    corps = ",\n".join('  "%s": "%s"' % (nom, parties[nom]["version"])
                       for nom in build_extension.PARTIES if nom in parties)
    return (
        "/* Le numéro de chaque PARTIE de l'extension. ÉCRIT PAR\n"
        " * scripts/ci_extension.py À CHAQUE SIGNATURE : ne pas le modifier à la\n"
        " * main, la signature suivante réécrirait la retouche sans la lire.\n"
        " *\n"
        " * CE QUE DIT UN NUMÉRO : le paquet auquel cette partie a changé pour la\n"
        " * dernière fois, et rien d'autre. Un changement d'un fichier PARTAGÉ (le\n"
        " * popup, un gabarit, une icône) fait sortir un paquet neuf sans qu'aucune\n"
        " * des deux parties ne bouge : les deux gardent alors leur ancien numéro\n"
        " * pendant que le paquet avance, et c'est justement l'information utile,\n"
        " * « ces deux moitiés n'ont pas changé depuis la 3.6.0 ». Le numéro du\n"
        " * paquet, lui, est dans le manifeste, et nulle part ailleurs.\n"
        " *\n"
        " * La partie beta porte le suffixe « b », la stable jamais. Ces numéros ne\n"
        " * partent JAMAIS chez Mozilla : le manifeste, lui, n'en porte aucun, sans\n"
        " * quoi une signature faite depuis le chantier brûlerait un numéro que la\n"
        " * branche stable doit encore publier.\n"
        " *\n"
        " * ES5, global, chargé par une balise script : pas de module, pas d'import.\n"
        " * Le popup lit les clés ci-dessous sur le global "
        + build_extension.VAR_VERSIONS + ", en se gardant\n"
        " * du cas où le fichier n'a pas été chargé (typeof).\n"
        " */\n"
        "var " + build_extension.VAR_VERSIONS + " = {\n" + corps + "\n};\n")


def ecrire_versions_parties(parties):
    """Pose le fichier dans l'extension. Rend True s'il a changé sur le disque.

    Écrit en octets, saut de ligne LF imposé : write_text() traduirait en CRLF
    sous Windows, et le fichier ferait un diff entier d'une machine à l'autre
    pour deux nombres. L'empreinte, elle, ne s'en soucie pas (ce fichier y est
    neutralisé, voir content_hash), mais le journal de git, si.
    """
    texte = texte_versions_parties(parties)
    ancien = None
    if VERSIONS_JS.exists():
        ancien = VERSIONS_JS.read_bytes().decode("utf-8").replace("\r\n", "\n")
    if ancien == texte:
        return False
    VERSIONS_JS.write_bytes(texte.encode("utf-8"))
    return True


def parse_ver(v):
    """Le rang d'un numéro, suffixe « b » ôté, complété à trois nombres.

    Le repli était SILENCIEUX et rendait (0,) sur tout ce qu'il ne savait pas
    lire : une version suffixée passait alors pour la plus basse de toutes, le
    plancher était mal choisi, et l'outil pouvait proposer un recul à Mozilla,
    refusé en fin de pipeline, après la validation. Il parle, désormais.
    """
    r = V.rang(str(v))
    if r is not None:
        return r
    try:
        # les numéros d'avant le contrat (« 1.0 », « 2.1.5.1 ») se comparent
        # encore : ils sont complétés à trois nombres, jamais tronqués
        parts = tuple(int(x) for x in str(v).split("."))
        while len(parts) < 3:
            parts += (0,)
        return parts
    except (TypeError, ValueError):
        print(f"::warning title=Version illisible::« {v} » n'est pas un numéro "
              "de version ; elle compte pour la plus basse.")
        return (0, 0, 0)


def signature_suivante(base, cible):
    """« X.Y.Z.B » quand la coquille ressort sans que le projet ait bougé.

    B compte les signatures d'un même X.Y.Z, et rien d'autre. Il n'existe que
    tant que le projet piétine : dès que le site publie plus haut, la cible
    reprend la main et B disparaît de lui-même, sans qu'on ait à le remettre à
    zéro nulle part.

    B NE S'ÉCRIT JAMAIS QUAND IL VAUT ZÉRO, et ce n'est pas une coquetterie de
    lisibilité : Firefox comme Chrome complètent de zéros et tiennent
    « 3.6.0.0 » pour ÉGAL à « 3.6.0 ». Soumettre le second après le premier
    serait refusé APRÈS la validation, quota du jour consommé pour rien. La
    première ressortie est donc « .1 ».

    Rend None si le cas n'est pas celui-là : à l'appelant de monter d'un cran.
    """
    if not cible:
        return None
    # Le plancher porte DÉJÀ un quatrième nombre dès la deuxième ressortie, et
    # la grammaire du projet, elle, n'en connaît que trois : le comparer tel
    # quel rendait « illisible » et faisait tomber l'outil dans le refus. On le
    # coupe donc avant de comparer les lignes.
    morceaux = str(base).split(".")
    tronc = ".".join(morceaux[:3])
    rc, rb = V.rang(str(cible)), V.rang(tronc)
    if rc is None or rb is None or rc != rb:
        return None          # lignes différentes : ce n'est pas une ressortie
    try:
        b = int(morceaux[3]) if len(morceaux) > 3 else 0
    except ValueError:
        return None
    b += 1
    if b > 999:
        # Le contrat borne chaque nombre à 999. Mille signatures pour un même
        # X.Y.Z ne se produira pas, mais un dépassement silencieux fabriquerait
        # un « 1000 » que plus aucun de ces outils ne sait relire.
        return None
    return "%s.%d" % (cible, b)


def numero_a_poser(base, cible):
    """(version à poser, lignes de journal), d'après le plancher et la cible.

    « base » est le plancher : ce qui est déjà pris (manifests, dernière
    signature, AMO). « cible » est le numéro du projet, sans suffixe.

    On POSE la cible si elle est strictement au-dessus du plancher ; sinon on
    monte d'un cran Z au-dessus du plancher et on le DIT fort. Mozilla refuse un
    numéro déjà pris, et son refus tombe APRÈS la validation, quota consommé :
    le seul cas où l'on peut se permettre d'être silencieux, c'est celui où l'on
    avance vraiment.
    """
    if cible and parse_ver(cible) > parse_ver(base):
        return (cible, [f"[ci-extension] contenu modifié : la coquille prend le "
                        f"numéro du projet, v{base} -> v{cible}"])
    # LE QUATRIÈME NOMBRE. La coquille doit ressortir alors que le projet n'a
    # pas bougé : c'est précisément le cas pour lequel il existe. Monter le Z du
    # projet ferait annoncer à l'extension une version que le site n'a jamais
    # publiée, et le prochain correctif de fiche retomberait sur un numéro déjà
    # brûlé chez Mozilla.
    quatrieme = signature_suivante(base, cible)
    if quatrieme:
        return (quatrieme, [f"[ci-extension] le projet n'a pas bougé (v{cible}) : "
                            f"la coquille ressort, v{base} -> v{quatrieme}"])
    montee = bump_version(base)
    if cible:
        return (montee, [f"::warning title=Extension JJK décalée du projet::le site "
                         f"publie v{cible}, qui n'est pas au-dessus de ce qui est "
                         f"déjà pris (v{base}) : la coquille part en v{montee}. Les "
                         "trois numéros du projet visent la même ligne mais avancent "
                         "chacun quand ils ont une raison d'avancer ; le site "
                         "rattrapera."])
    return (montee, ["::warning title=Numéro du projet illisible::"
                     "docs/jjk-manifeste.json ne donne pas de release lisible : "
                     f"la coquille monte d'un cran, v{base} -> v{montee}."])


def version_du_projet():
    """Le numéro que publie le site, sans le suffixe « b », ou None.

    C'est docs/jjk-manifeste.json qui fait foi : c'est lui que lisent l'amorceur
    et la fiche, donc c'est lui qui dit ce que le projet publie aujourd'hui.
    """
    try:
        man = json.loads(MANIFESTE_SITE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    v = V.lire(str(man.get("release", "")))
    return v.nu if v else None


def amo_latest(guid, issuer, secret):
    """Dernière version connue d'AMO (canaux confondus), ou None.

    Indispensable après un run interrompu : une version peut avoir été signée
    chez Mozilla SANS avoir jamais été recommittée ici (course de pushes,
    commit de retour refusé). La re-proposer ferait échouer tout le pipeline
    (« version already exists ») ; on repart donc toujours du maximum entre
    l'empreinte locale et ce qu'AMO connaît déjà."""
    try:
        amo = sign_extension.Amo(issuer, secret)
        r = amo.get(f"/addons/addon/{guid}/versions/?filter=all_with_unlisted&page_size=10")
        if r.status_code != 200:
            return None
        vs = [x.get("version") for x in r.json().get("results", []) if x.get("version")]
        return max(vs, key=parse_ver) if vs else None
    except Exception:
        return None


def xpi_signe():
    """True si docs/download/jjk-roll20-firefox.xpi est un binaire signé Mozilla."""
    import zipfile
    try:
        with zipfile.ZipFile(sign_extension.XPI) as z:
            return any(n.startswith("META-INF/") for n in z.namelist())
    except Exception:
        return False


def repare_xpi_signe(issuer, secret):
    """Garde-fou (vécu le 2026-08-01) : un commit local peut écraser le .xpi
    signé par un pack de développement NON signé — le site distribue alors un
    fichier que Firefox refuse d'installer, sans que rien n'échoue en CI. Si le
    .xpi committé n'est pas signé, on re-télécharge le dernier binaire signé
    depuis AMO (les GET ne subissent pas le quota de soumission) et on réaligne
    updates.json ; le commit de retour du workflow les republie."""
    if xpi_signe():
        return
    print("[ci-extension] ALERTE : le .xpi committé n'est PAS signé (écrasé par "
          "un pack local ?) — récupération du binaire signé depuis AMO…")
    if not issuer or not secret:
        print("[ci-extension] clés AMO absentes : réparation impossible ici.")
        return
    try:
        import requests
        amo = sign_extension.Amo(issuer, secret)
        manifest = json.loads(MANIFESTS[0].read_text(encoding="utf-8"))
        gecko = manifest["browser_specific_settings"]["gecko"]
        r = amo.get(f"/addons/addon/{gecko['id']}/versions/?filter=all_with_unlisted&page_size=10")
        for v in r.json().get("results", []):
            f = v.get("file") or {}
            if f.get("status") != "public":
                continue
            dl = requests.get(f["url"], headers=amo.h(), timeout=120)
            dl.raise_for_status()
            sign_extension.XPI.write_bytes(dl.content)
            sign_extension.UPDATES.write_text(json.dumps({
                "addons": {gecko["id"]: {"updates": [
                    {"version": v["version"], "update_link": sign_extension.XPI_URL,
                     "browser_specific_settings": {"gecko": {
                         "strict_min_version": gecko.get("strict_min_version", "109.0")}}}
                ]}}
            }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[ci-extension] binaire signé v{v['version']} restauré depuis AMO "
                  "(updates.json réaligné)")
            return
        print("[ci-extension] aucune version signée publique trouvée chez AMO.")
    except Exception as e:
        print(f"[ci-extension] réparation impossible : {e}")


def main():
    issuer = os.environ.get("AMO_JWT_ISSUER")
    secret = os.environ.get("AMO_JWT_SECRET")

    # LES CONTRÔLES DU PAQUET TOMBENT ICI, ET AVANT TOUT LE RESTE.
    #
    # build_extension.verifie() est le SEUL garde-fou de la duplication des deux
    # parties : il exige que stable/ et beta/ soient identiques hors des lignes
    # marquées, et que chaque ligne marquée nomme sa propre partie. Il ne
    # tournait que depuis la ligne de commande de build_extension.py, jamais
    # depuis ici — or c'est ici que passe la CI, et build() emballe sans rien
    # vérifier. Une correction de sûreté posée d'un seul côté partait donc chez
    # Mozilla en silence, et le trou restait ouvert du côté oublié.
    #
    # Avant l'empreinte, avant l'emballage, avant la moindre requête : un refus
    # ne doit rien coûter au quota, qui se compte à la dizaine par jour.
    if not build_extension.verifie():
        sys.exit("[ci-extension] contrôles du paquet en échec : rien n'est signé")

    state = {}
    if STATE.exists():
        state = json.loads(STATE.read_text(encoding="utf-8"))
    current = content_hash()
    if current == state.get("hash"):
        print(f"[ci-extension] contenu inchangé (v{state.get('version')} signée reste bonne) : rien à faire")
        # plus aucune synchro depuis le site (coquille) : on remet juste les
        # archives committées à l'exact au cas où un pack de développement
        # local les aurait écrasées
        subprocess.run(["git", "checkout", "--",
                        "docs/download/jjk-roll20-firefox.xpi",
                        "docs/download/jjk-roll20-chrome.zip"],
                       cwd=ROOT, check=False)
        repare_xpi_signe(issuer, secret)
        return

    if not issuer or not secret:
        sys.exit("[ci-extension] l'extension a changé mais les clés AMO manquent : "
                 "ajouter les secrets AMO_JWT_ISSUER et AMO_JWT_SECRET au dépôt "
                 "(Settings -> Secrets and variables -> Actions).")

    manifest = json.loads(MANIFESTS[0].read_text(encoding="utf-8"))
    # LE PLANCHER : ce qui est déjà pris, et sous quoi on ne peut pas repasser.
    # max(dernière signée, version des manifests) parce qu'un saut posé à la
    # main dans les manifests (1.0.8 -> 2.0.0 pour la coquille) ne doit jamais
    # être rabaissé par l'empreinte de l'ancienne série.
    base = max(state.get("version", "1.0.0"), manifest["version"], key=parse_ver)
    guid = manifest["browser_specific_settings"]["gecko"]["id"]
    remote = amo_latest(guid, issuer, secret)
    if remote and parse_ver(remote) > parse_ver(base):
        print(f"[ci-extension] AMO connaît déjà v{remote} (run précédent interrompu) : on repart de là")
        base = remote

    new_version, journal = numero_a_poser(base, version_du_projet())
    for ligne in journal:
        print(ligne)
    # Le numéro RÉELLEMENT POSÉ fait foi pour tout ce qui suit : c'est
    # stamp_version() qui ôte le suffixe, et l'empreinte enregistrée plus bas
    # doit porter le numéro qui est parti chez Mozilla, pas celui qu'on visait.
    new_version = stamp_version(new_version)
    # LES DEUX PARTIES SONT DATÉES ICI, AVANT L'EMPAQUETAGE et jamais après :
    # le fichier de déclaration part DANS le .xpi, et l'écrire après build()
    # n'aurait daté que la copie restée sur le disque, pendant que le paquet
    # signé, lui, annoncerait encore les numéros d'avant.
    parties, journal_parties = versions_parties(new_version, state)
    for ligne in journal_parties:
        print(ligne)
    ecrire_versions_parties(parties)
    print(f"[ci-extension] v{new_version} : empaquetage + signature Mozilla…")
    build_extension.build()
    try:
        sign_extension.sign(issuer, secret)
    except SystemExit as e:
        # signature impossible (quota AMO, panne…) : on restaure les paquets
        # DÉJÀ SIGNÉS pour que le site parte quand même à jour ; l'empreinte
        # n'est pas écrite, le prochain run (push ou workflow_dispatch)
        # retentera la signature.
        subprocess.run(["git", "checkout", "--",
                        "docs/download/jjk-roll20-firefox.xpi",
                        "docs/download/jjk-roll20-chrome.zip",
                        "docs/download/updates.json",
                        "extension/firefox/manifest.json",
                        "extension/chrome/manifest.json"],
                       cwd=ROOT, check=False)
        # Le fichier des versions de parties se restaure À PART, et pas par
        # coquetterie : un git checkout à plusieurs chemins échoue EN ENTIER si
        # l'un d'eux n'est pas suivi (« did not match any file(s) known to
        # git »). Le jour où ce fichier vient d'être créé et pas encore
        # committé, le glisser dans la liste ci-dessus ferait rater la
        # restauration des manifests, qui, elle, compte vraiment : ils
        # resteraient estampillés d'un numéro que Mozilla n'a jamais signé.
        subprocess.run(["git", "checkout", "--",
                        "extension/firefox/" + build_extension.VERSIONS_PARTIES],
                       cwd=ROOT, check=False)
        repare_xpi_signe(issuer, secret)
        deja_signee = STATE.exists() and xpi_signe()
        # Panne DURABLE (pas un simple quota) : à signaler fort. AMO qui ne
        # connaît « aucune version » du guid alors qu'il refuse de le créer
        # (« Duplicate add-on ID found ») veut dire que les clés API
        # appartiennent à un compte qui ne possède PAS cet add-on : la
        # signature ne repassera jamais toute seule.
        if "quota" not in str(e) and amo_latest(guid, issuer, secret) is None:
            print("::error title=Signature JJK impossible::" + str(e) +
                  " — AMO ne montre aucune version de " + guid + " à ce compte. "
                  "Si la création répond « Duplicate add-on ID found », les secrets "
                  "AMO_JWT_ISSUER / AMO_JWT_SECRET sont ceux d'un AUTRE compte que "
                  "le propriétaire de l'add-on : reposer les clés du bon compte "
                  "(ou transférer l'add-on) puis relancer le workflow.")
            # Le site NE DOIT PAS rester bloqué pour autant : tant qu'une version
            # signée est distribuée, on déploie et on retentera au prochain run.
            # On ne casse le run que si rien n'a jamais été signé (sinon la panne
            # d'un add-on emporterait la publication des règles et de la fiche).
            if not deja_signee:
                raise
        else:
            print(f"::warning title=Extension JJK non signée::{e} — le site "
                  f"distribue encore la v{state.get('version', '?')} signée.")
        print(f"[ci-extension] SIGNATURE REPORTÉE ({e}) — le site est déployé "
              f"avec les paquets signés v{state.get('version', '?')}.")
        return

    # "parties" s'ajoute À CÔTÉ de ce qui s'y trouvait, jamais à la place : ce
    # fichier est lu ailleurs (scripts/verif_versions.py y prend "version" pour
    # vérifier que rien ne recule sous ce qui est signé), et il doit rester
    # lisible par qui n'attend que les deux anciennes clés.
    STATE.write_text(json.dumps({"version": new_version, "hash": current,
                                 "parties": parties}, indent=2) + "\n",
                     encoding="utf-8")
    print(f"[ci-extension] v{new_version} signée et publiée ; empreinte enregistrée")


def dire_etat():
    """Dit ce que l'outil voit, SANS RIEN ÉCRIRE ni signer (option --etat).

    Le seul moyen d'éprouver la mécanique sans mordre sur le quota AMO, qui se
    compte à la dizaine par jour : ce que porte l'état, ce que valent les
    empreintes aujourd'hui, et donc ce que la prochaine signature ferait.
    """
    state = {}
    if STATE.exists():
        try:
            state = json.loads(STATE.read_text(encoding="utf-8"))
        except ValueError:
            print(f"[ci-extension] {STATE.name} est illisible : tout compte pour inconnu")
    if not isinstance(state, dict):
        state = {}
    courant = content_hash()
    print("ÉTAT DE L'EXTENSION")
    print("  paquet signé : v%s" % state.get("version", "?"))
    print("  empreinte    : %s" % ("inchangée" if courant == state.get("hash")
                                   else "MODIFIÉE (une signature est due)"))
    ancien = parties_connues(state)
    for nom in build_extension.PARTIES:
        v_avant, emp_avant = ancien[nom]
        emp = empreinte_partie(nom)
        if emp is None:
            etat = "dossier absent"
        elif emp_avant is None:
            etat = "aucune empreinte enregistrée"
        elif emp_avant == emp:
            etat = "inchangée"
        else:
            etat = "MODIFIÉE (elle prendra le numéro du prochain paquet)"
        print("  partie %-6s: v%s, %s" % (nom, v_avant or "?", etat))
    print("  déclaré dans %s :" % build_extension.VERSIONS_PARTIES)
    if VERSIONS_JS.exists():
        for ligne in VERSIONS_JS.read_text(encoding="utf-8").splitlines():
            if ligne.startswith("  \""):
                print("   " + ligne.strip())
    else:
        print("    ABSENT (build_extension.verifie() le refusera)")


if __name__ == "__main__":
    if "--etat" in sys.argv[1:]:
        dire_etat()
    else:
        main()
