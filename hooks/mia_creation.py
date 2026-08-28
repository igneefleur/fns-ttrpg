"""Hook MkDocs : extrait les règles MIA et expose mia-creation.json.

Pont de synchronisation entre la page de règles et la fiche de personnage. Tout
ce que la fiche affiche — les huit caractéristiques, les huit compétences, la
table des MOD, des limites et des coûts, les paliers de charge — est écrit une
seule fois, dans la page de règles ; ce hook la relit au build et en fait un
JSON que la fiche consomme. Une valeur changée dans les règles se répercute donc
dans l'outil, et une seule fois.

CE QUE CE HOOK NE FAIT PAS : les FORMULES. La table « Valeur / MOD / LIM / XP »
donne les vingt et une lignes déjà calculées, donc la fiche n'a pas à connaître
la règle qui les engendre ; mais les PV, l'endurance, l'initiative, la vitesse,
les sauts, la charge et la récupération se calculent dans la fiche, à partir des
constantes que ce hook pêche dans la page (les multiplicateurs, les seuils). Une
formule réécrite dans les règles demande donc de toucher AUSSI à la fiche.

Seule la bibliothèque standard est utilisée : la CI n'installe que
mkdocs-material. Le fichier est ajouté via l'API Files (en mémoire), on n'écrit
PAS dans docs/.
"""
import json
import re
from pathlib import Path

from mkdocs.structure.files import File

MOINS = "−"   # signe moins typographique employé dans les règles
PAGE = "content/regles/index.md"

# Un sigle de caractéristique ou de compétence : trois capitales, accents
# compris (DÉT, CRÉ). « É » n'est PAS dans A-Z, et l'oublier fait rendre
# « DT » sans lever la moindre erreur.
SIGLE = r"[A-ZÀ-Þ]{3}"


def _num(s):
    """« −25 » / « +20 » / « 1,75 » -> nombre (moins typographique compris)."""
    s = str(s).replace(MOINS, "-").replace(",", ".").replace(" ", "").replace(" ", "")
    return float(s) if "." in s else int(s)


def _table(text, entete):
    """Lignes de la table markdown dont l'entête matche `entete` -> [[cellules]].

    On identifie une table par le libellé EXACT de son entête : renommer une
    colonne dans la page suffit donc à faire rendre une liste vide. Le contrôle
    est plus loin, dans _extract, qui refuse une table absente au lieu de la
    laisser passer.
    """
    lignes = text.splitlines()
    for i, ligne in enumerate(lignes):
        if re.search(entete, ligne) and ligne.lstrip().startswith("|"):
            out = []
            for row in lignes[i + 2:]:          # saute la ligne d'alignement
                row = row.strip()
                if not row.startswith("|"):
                    break
                out.append([c.strip() for c in row.strip("|").split("|")])
            return out
    return []


def _un(text, motif, defaut=None, groupe=1):
    """Une valeur pêchée dans la PROSE. Rend `defaut` si la phrase a changé."""
    m = re.search(motif, text)
    return _num(m.group(groupe)) if m else defaut


def _caracs(text):
    """Les huit caractéristiques, dans l'ordre de la page."""
    return [{"code": r[0], "nom": r[1], "groupe": r[2].lower()}
            for r in _table(text, r"\|\s*Sigle\s*\|\s*Caractéristique\s*\|\s*Groupe\s*\|")
            if len(r) >= 3 and re.fullmatch(SIGLE, r[0])]


def _valeurs(text):
    """La table Valeur / MOD / LIM / XP cumulés, ligne par ligne.

    C'est la pièce qui dispense la fiche de porter les règles de calcul : elle
    lit, elle ne recalcule pas. Une ligne manquante se verrait au build.
    """
    return [{"v": _num(r[0]), "mod": _num(r[1]), "lim": _num(r[2]), "xp": _num(r[3])}
            for r in _table(text, r"\|\s*Valeur\s*\|\s*MOD\s*\|\s*LIM\s*\|\s*XP cumulés\s*\|")
            if len(r) >= 4 and r[0].lstrip("-").isdigit()]


def _comps(text):
    """Les huit compétences : sigle, nom, caracs du plafond, carac par défaut.

    La colonne « Plafond de points » est de la PROSE (« le plus haut des MOD
    FOR, DEX, AGI, CON », « MOD AGI ») : on y relève les sigles, dans l'ordre.
    Le mot MOD lui-même en est un — trois capitales — d'où son retrait.
    """
    out = []
    for r in _table(text, r"\|\s*Sigle\s*\|\s*Compétence\s*\|\s*Plafond de points\s*\|"):
        if len(r) < 4 or not re.fullmatch(SIGLE, r[0]):
            continue
        mods = [s for s in re.findall(SIGLE, r[2]) if s != "MOD"]
        out.append({"code": r[0], "nom": r[1], "mod": mods, "lim": r[3]})
    return out


def _spe_nommees(text):
    """Les spécialités que les formules des règles appellent par leur nom.

    Il n'y a pas de liste de spécialités — chacun crée les siennes — mais quatre
    noms sont LUS par la fiche (les PV en ajoutent une, la récupération en EST
    une, l'obstination en lance une, la charge en pénalise une). Une spécialité
    mal orthographiée ne les remplit pas, et rien ne le dirait : la fiche
    affiche donc ces noms-là, et c'est d'ici qu'elle les tient.
    """
    m = re.search(r"nomment\s+cependant\s+quatre[^:]*:\s*(.+?)\.", text, re.S)
    return re.findall(r"\*\*([^*]+)\*\*", m.group(1)) if m else []


def _charge(text):
    """Les paliers de charge : seuil en pourcents, et leurs effets en toutes lettres."""
    out = []
    for r in _table(text, r"\|\s*Charge\s*\|\s*Effets\s*\|"):
        if len(r) >= 2 and r[0].rstrip("% ").isdigit():
            out.append({"seuil": int(r[0].rstrip("% ")), "effets": r[1]})
    return out


def _extract(docs_dir):
    text = (Path(docs_dir) / PAGE).read_text(encoding="utf-8")

    caracs, valeurs, comps = _caracs(text), _valeurs(text), _comps(text)
    codes = {c["code"] for c in caracs}

    data = {
        # --- les listes, lues dans les trois tables de la page ---
        "caracs": caracs,
        "valeurs": valeurs,
        "comps": comps,
        "speNommees": _spe_nommees(text),
        "charge": _charge(text),

        # --- le prestige, qui plafonne toute caractéristique ---
        "prestigeMin": _un(text, r"[Ll]e prestige va de\s*(-?\d+)\s*à", 0),
        "prestigeMax": _un(text, r"[Ll]e prestige va de\s*-?\d+\s*à\s*(\d+)", 20),

        # --- ce que coûte un point ---
        "xpComp": _un(text, r"point de compétence coûte\s*\*\*(\d+)\s*XP", 1),
        "xpSpe": _un(text, r"point de spécialité coûte\s*\*\*([\d,\.]+)\s*XP", 0.25),

        # --- le plafond d'une spécialité ---
        "speMarge": _un(text, r"Points de spécialité = LIM\s*[−-]\s*(\d+)", 50),
        "speMin": _un(text, r"comptent chacun pour\s*(\d+)\s*au minimum", 30),

        # --- l'endurance ---
        "endurAction": _un(text, r"jusqu'à\s*(\d+)\s*points pour une même action", 50),

        # --- l'initiative, la vitesse, les sauts, la récupération ---
        "iniMult": _un(text, r"Initiative = MOD AGI\s*×\s*(\d+)", 2),
        # LA VITESSE EST UN CARRÉ : « AGI × AGI ». Il n'y a donc pas de
        # multiplicateur à lire, mais une forme à reconnaître — et si la page
        # revenait un jour à « AGI × n », le carré retomberait à faux et le
        # nombre serait relu, sans qu'on touche au code de la fiche.
        "vitesseCarre": bool(re.search(r"Vitesse = AGI\s*×\s*AGI", text)),
        "vitesseMult": _un(text, r"Vitesse = AGI\s*×\s*([\d,\.]+)\s*m", None),
        "sautLong": _un(text, r"Saut en longueur = FOR\s*×\s*([\d,\.]+)", 1.75),
        "sautHaut": _un(text, r"Saut en hauteur = FOR\s*÷\s*([\d,\.]+)", 2),
        # l'endurance se regagne en ENTIER : deux fois son maximum, ce qui
        # couvre exactement la course de −max à +max
        "recupEndurMult": _un(text, r"Endurance regagnée par jour = endurance max\s*×\s*([\d,\.]+)", 2),
    }

    # LES CONTRÔLES. Une table renommée rend une liste VIDE sans rien lever :
    # c'est exactement la panne qu'on cherche pendant des heures, parce que le
    # build réussit et que la fiche s'ouvre — vide. On la fait échouer ici.
    fautes = []
    if len(caracs) != 8:
        fautes.append("%d caractéristique(s) lue(s), 8 attendues" % len(caracs))
    if len(comps) != 8:
        fautes.append("%d compétence(s) lue(s), 8 attendues" % len(comps))
    if len(valeurs) < 2:
        fautes.append("la table Valeur / MOD / LIM est introuvable ou vide")
    if not data["vitesseCarre"] and data["vitesseMult"] is None:
        fautes.append("la formule de la vitesse n'est plus reconnue "
                      "(ni « AGI × AGI », ni « AGI × n mètres »)")
    for c in comps:
        inconnus = [s for s in c["mod"] + [c["lim"]] if s not in codes]
        if inconnus:
            fautes.append("compétence %s : sigle inconnu %s" % (c["code"], ", ".join(inconnus)))
    if fautes:
        raise ValueError("hooks/mia_creation.py ne reconnaît plus la page de "
                         "règles :\n  - " + "\n  - ".join(fautes))

    return data


def on_files(files, config):
    data = _extract(config["docs_dir"])
    v = data["valeurs"]
    print("[mia-creation] %d caracs, %d compétences, table de valeurs 0-%s "
          "(MOD max %s, LIM max %s), %d paliers de charge, spé à %s XP le point"
          % (len(data["caracs"]), len(data["comps"]), v[-1]["v"],
             v[-1]["mod"], v[-1]["lim"], len(data["charge"]), data["xpSpe"]))
    content = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    files.append(File.generated(config, "mia-creation.json", content=content))
    return files


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parent.parent
    print(json.dumps(_extract(root / "docs"), ensure_ascii=False, indent=2))
