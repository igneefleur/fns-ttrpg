"""Hook MkDocs : extrait les règles de création de personnage et expose creation.json.

C'est le pont de synchronisation entre les règles et l'onglet « Création »
(créateur de personnage). Tout ce que l'outil affiche, caractéristiques, Éclat,
compétences, formations, arts, sens, tailles et tables de capacités physiques,
est écrit une seule fois, dans les pages de règles ; ce hook les relit au build
et en fait un JSON que le créateur consomme. Une valeur changée dans les règles
se répercute donc dans l'outil : aucune double saisie, aucune dérive.

Seule la bibliothèque standard est utilisée (comme hooks/forge.py) : la CI
n'installe que mkdocs-material et le moteur PDF. Le fichier est ajouté via l'API
Files (en mémoire) — on n'écrit PAS dans docs/.

Sources et formats parsés (voir chaque fonction pour le détail) :
  - personnage/caracteristiques.md : mcards « **Nom** <span class="prereq">ABR</span>
    desc » sous ## Caractéristiques Physiques / Mentales ; table Modificateurs
    (Caractéristique | Modificateur). La création se fait à 60 points (3 à 9).
  - personnage/eclat.md : cartes <div class="eclat-card"> « **Éclat N** desc ».
  - personnage/competences.md : lignes <tr> des tables de récap (Compétence |
    Caractéristique | Groupes | Utilité | Accessible) sous ### Champ X, plus les
    descriptions des blocs de détail (#### Nom + <p class="groupes">).
  - formation/formations-*.md : cartes <div class="mcard art"> avec spans
    « Prérequis : … » et « Coût : N PF ».
  - art/arts-*.md : mêmes cartes, plus paliers <p class="palier">✦✧✧ Basique</p>
    avec lignes **Prérequis :** / **Effet :** et, pour les arts martiaux, une
    ligne **Dégâts :** « 100 + ×2 (main et pied) » par palier (l'ancienne ligne
    de calibrage « (À retirer — …) » reste tolérée).
  - personnage/sens.md : une mcard par niveau (**Primaire** … **Inexistant**),
    sens en <span class="zchip"> rangés Externes / Internes (div.sens-niveau).
  - monde/tailles.md : catégories de taille + modificateur de PV par taille.
  - monde/formes.md : tables bio (Forme | Exemples | Respiration | Alimentation |
    Propriété), membres (Forme | Tête | …), caracs (Forme | FOR … PRÉ) et les
    deux grilles HTML de sens (cases <td class="p|s|t|l|i">).
  - personnage/avantages.md : table des points (Éclat | Points d'avantage,
    palier inférieur) + mcards « **Nom** <span class="prereq">N points</span> ».
  - nen/techniques-nen.md : cartes mcard art des techniques ; paliers sans pips
    (<p class="palier">Basique</p>) + Prérequis/Coût en spans (comme les
    formations) ; certaines cartes portent des tables (bonus, rayons d'En).
  - personnage/capacites-physiques.md : tables 0-30 (Mouvement, Port, Apnée,
    Sommeil/Activité) repérées par leur colonne de tête.

Les pages encore inachevées (avantages.md, classe.md, formations non martiales,
arts sans paliers) sont tolérées : le hook n'exige jamais leur contenu. Le
créateur (creation.js) porte la sémantique d'interface et les règles de calcul
prosaïques (caractéristiques : 60 points, 3 à 9 ; 5 PF = +20 de base, plafond de
5 PF par compétence et par niveau) ; ce hook ne fournit que le contenu.
"""
import html
import json
import re
from pathlib import Path

from mkdocs.structure.files import File

MINUS = "−"   # signe moins typographique employé dans les règles
NDASH = "–"   # tiret de plage (U+2013)

PAGES = {
    "caracs": "content/regles/personnage/caracteristiques.md",
    "eclat": "content/regles/personnage/eclat.md",
    "competences": "content/regles/personnage/competences.md",
    "sens": "content/regles/personnage/sens.md",
    "tailles": "content/regles/monde/tailles.md",
    "formes": "content/regles/monde/formes.md",
    "avantages": "content/regles/personnage/avantages.md",
    "techniques": "content/regles/nen/techniques-nen.md",
    "capacites": "content/regles/personnage/capacites-physiques.md",
    "armes": "content/regles/combat/armes.md",
    "etats": "content/regles/personnage/etats.md",
}
FORMATION_PAGES = [
    ("martiales", "content/regles/formation/formations-martiales.md"),
    ("athlétiques", "content/regles/formation/formations-athletiques.md"),
    ("vitales", "content/regles/formation/formations-vitales.md"),
    ("sociales", "content/regles/formation/formations-sociales.md"),
    ("intellectuelles", "content/regles/formation/formations-intellectuelles.md"),
    ("naturelles", "content/regles/formation/formations-naturelles.md"),
    ("sensorielles", "content/regles/formation/formations-sensorielles.md"),
    ("techniques", "content/regles/formation/formations-techniques.md"),
    ("du transport", "content/regles/formation/formations-transport.md"),
    ("furtives", "content/regles/formation/formations-furtives.md"),
    ("artisanales", "content/regles/formation/formations-artisanales.md"),
    ("artistiques", "content/regles/formation/formations-artistiques.md"),
]
ART_PAGES = [
    ("martiaux", "content/regles/art/arts-martiaux.md"),
    ("athlétiques", "content/regles/art/arts-athletiques.md"),
    ("vitaux", "content/regles/art/arts-vitaux.md"),
    ("sociaux", "content/regles/art/arts-sociaux.md"),
    ("intellectuels", "content/regles/art/arts-intellectuels.md"),
    ("naturels", "content/regles/art/arts-naturels.md"),
    ("sensoriels", "content/regles/art/arts-sensoriels.md"),
    ("techniques", "content/regles/art/arts-techniques.md"),
    ("du transport", "content/regles/art/arts-transport.md"),
    ("furtifs", "content/regles/art/arts-furtifs.md"),
    ("artisanaux", "content/regles/art/arts-artisanaux.md"),
    ("artistiques", "content/regles/art/arts-artistiques.md"),
]


def _clean(text):
    """Prose lisible : retire balises, liens markdown, gras, espaces multiples."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"[*_]", "", text)
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


def _int(cell):
    """« −25 » / « +5 » / « 24 » -> int (gère le moins typographique)."""
    t = (cell or "").replace(MINUS, "-").replace(" ", "").replace(" ", "")
    m = re.search(r"[+-]?\d+", t)
    return int(m.group()) if m else None


def _range(cell):
    """« 0 – 9 » / « 15 – 25 » / « 30 » -> (min, max). Plages au tiret U+2013."""
    t = cell.replace(NDASH, "-").replace(MINUS, "-")
    nums = [int(n) for n in re.findall(r"\d+", t)]
    if not nums:
        return None
    return (nums[0], nums[-1])


def _pipe_tables(text):
    """Toutes les tables markdown pipe : liste de {header: [...], rows: [[...]]}."""
    tables, cur = [], []
    for ln in text.splitlines() + [""]:
        if ln.lstrip().startswith("|"):
            cur.append([c.strip() for c in ln.strip().strip("|").split("|")])
        elif cur:
            if len(cur) >= 2:
                body = [r for r in cur[2:] if any(r)]   # cur[1] = |---|
                tables.append({"header": cur[0], "rows": body})
            cur = []
    return tables


# ---------------------------------------------------------------------------
# Caractéristiques
# ---------------------------------------------------------------------------
_CARAC_CARD = re.compile(
    r'<div class="mcard" markdown>\s*\*\*(.+?)\*\* <span class="prereq">(.+?)</span>(.*?)</div>',
    re.S)


def _caracteristiques(text):
    caracs = []
    # le groupe (physique/mentale) dépend de la section ## englobante
    sections = re.split(r"^## ", text, flags=re.M)
    for sec in sections:
        low = sec.lower()
        groupe = "physique" if low.startswith("caractéristiques physiques") else \
                 "mentale" if low.startswith("caractéristiques mentales") else None
        if not groupe:
            continue
        for m in _CARAC_CARD.finditer(sec):
            caracs.append({
                "name": _clean(m.group(1)),
                "abbr": _clean(m.group(2)),
                "groupe": groupe,
                "desc": _clean(m.group(3)),
            })

    # seule la table des modificateurs est encore utilisée (le système d'Éclat requis
    # et de budget de création a été remplacé par « 60 points, 3 à 9, 1 pt = 1 pt »).
    tables = _pipe_tables(text)
    modificateurs = []
    for t in tables:
        head = [_clean(h) for h in t["header"]]
        if head[:2] == ["Caractéristique", "Modificateur"]:
            for r in t["rows"]:
                rg = _range(r[0])
                if rg:
                    modificateurs.append({"min": rg[0], "max": rg[1], "mod": _int(r[1])})
    return caracs, {"modificateurs": modificateurs}


# ---------------------------------------------------------------------------
# Éclat
# ---------------------------------------------------------------------------
_ECLAT_CARD = re.compile(
    r'<div class="eclat-card" markdown>\s*\*\*Éclat (\d+)( et au-delà)?\*\*(.*?)</div>',
    re.S)


def _eclat(text):
    tiers = []
    for m in _ECLAT_CARD.finditer(text):
        body = m.group(3)
        naissance = ""
        nm = re.search(r"Naissance\s*:\s*(.+?)\.?\s*$", body, re.S)
        if nm:
            naissance = _clean(nm.group(1))
            body = body[:nm.start()]
        tiers.append({
            "val": int(m.group(1)),
            "plus": bool(m.group(2)),
            "desc": _clean(body),
            "naissance": naissance,
        })
    return tiers


# ---------------------------------------------------------------------------
# Compétences
# ---------------------------------------------------------------------------
_COMP_ROW = re.compile(
    r"<tr><td>(.+?)</td><td>(.+?)</td><td>(.+?)</td><td>([●○]{5})</td><td>(Non)?</td></tr>")
_COMP_H4 = re.compile(r"^#### (.+)$")
_COMP_GROUPES = re.compile(r'<p class="groupes">')


def _competences(text):
    # 1) tables de récap : liste canonique (nom, carac, groupes, utilité, accessible)
    comps, champ = [], None
    for ln in text.splitlines():
        h = re.match(r"^### Champ (.+)$", ln)
        if h:
            champ = _clean(h.group(1))
            continue
        m = _COMP_ROW.match(ln.strip())
        if m and champ:
            comps.append({
                "name": html.unescape(m.group(1)),
                "carac": _clean(m.group(2)),
                "groupes": [g.strip() for g in _clean(m.group(3)).split(",")],
                "champ": champ,
                "utilite": m.group(4).count("●"),
                "accessible": m.group(5) != "Non",
                "desc": "",
            })
    # 2) blocs de détail : la description qui suit « #### Nom » + p.groupes
    by_name = {c["name"]: c for c in comps}
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        m = _COMP_H4.match(lines[i])
        if m:
            name = html.unescape(m.group(1).strip())
            j = i + 1
            seen_groupes = False
            while j < len(lines):
                s = lines[j].strip()
                if _COMP_H4.match(lines[j]) or s.startswith("## "):
                    break
                if _COMP_GROUPES.search(s):
                    seen_groupes = True
                elif seen_groupes and s and not s.startswith("<"):
                    if name in by_name:
                        by_name[name]["desc"] = _clean(s)
                    break
                j += 1
            i = j
        else:
            i += 1
    groupes = []
    gsec = re.search(r"^## Groupes(.*?)(?=^## |\Z)", text, re.S | re.M)
    if gsec:
        for gm in re.finditer(r"\*\*(.+?)\s*:\*\*\s*(.+)", gsec.group(1)):
            groupes.append({"name": _clean(gm.group(1)), "desc": _clean(gm.group(2))})
    difficultes = [{"name": _clean(m.group(1)), "seuil": int(m.group(2))}
                   for m in re.finditer(r"<tr><td>([^<]+)</td><td>(\d+)</td></tr>", text)]
    return comps, groupes, difficultes


# ---------------------------------------------------------------------------
# Formations et arts (cartes mcard art)
# ---------------------------------------------------------------------------
_ART_CARD = re.compile(r'<div class="mcard art" markdown>(.*?)</div>', re.S)
_NAME = re.compile(r"\*\*(.+?)\*\*(?:\s*<span class=\"prereq\">(.*?)</span>)?")   # tagline optionnelle (les arts n'en portent plus)
_SPAN = re.compile(r'<span class="prereq">(.*?)</span>', re.S)
_PALIER = re.compile(r'<p class="palier">([✦✧]+)\s*(\w+)(?:\s*:\s*[^<]*)?</p>')   # tolère un nom de palier (« Basique : Déchet de la société »)
_CALIBRAGE = re.compile(
    r"\(À retirer[^)]*?frappe Basique (\d+) \+×(\d+) FOR, Avancé (\d+) \+×(\d+) FOR, "
    r"Expert (\d+) \+×(\d+) FOR\.?\)")
_DEGATS = re.compile(r"\*\*Dégâts\s*:\*\*\s*(\d+)\s*\+\s*×(\d+)(?:\s*\(([^)]*)\))?")


def _formations(text, categorie):
    out = []
    for m in _ART_CARD.finditer(text):
        inner = m.group(1)
        nm = _NAME.search(inner)
        if not nm:
            continue
        name, tagline = _clean(nm.group(1)), _clean(nm.group(2) or "")
        spans = [_clean(s) for s in _SPAN.findall(inner[nm.end():])]
        prereq = next((s.split(":", 1)[1].strip() for s in spans
                       if s.lower().startswith("prérequis")), "")
        cout_s = next((s for s in spans if s.lower().startswith("coût")), "")
        cm = re.search(r"(\d+)\s*PF", cout_s)
        body = _SPAN.sub("", inner[nm.end():])
        desc = _clean("\n".join(l for l in body.splitlines()
                                if not l.lstrip().startswith("|")))
        out.append({
            "categorie": categorie,
            "name": name,
            "tagline": tagline,
            "prereq": prereq,
            "cout": int(cm.group(1)) if cm else None,
            "desc": desc,
            "repetable": bool(re.search(r"se suit (autant|plusieurs|une fois par)", desc)),
        })
    return out


def _art_tables(block):
    """Tables markdown d'un fragment de carte, au format compact du JSON."""
    return [{"cols": [_clean(c) for c in t["header"]],
             "rows": [[_clean(c) for c in r] for r in t["rows"]]}
            for t in _pipe_tables(block)]


def _arts(text, categorie):
    out = []
    for m in _ART_CARD.finditer(text):
        inner = m.group(1)
        nm = _NAME.search(inner)
        if not nm:
            continue
        name, tagline = _clean(nm.group(1)), _clean(nm.group(2) or "")
        body = inner[nm.end():]

        frappe = None
        cal = _CALIBRAGE.search(body)
        if cal:
            v = [int(x) for x in cal.groups()]
            frappe = {"basique": v[0:2], "avance": v[2:4], "expert": v[4:6]}
            body = body[:cal.start()] + body[cal.end():]
        body = re.sub(r"\(À retirer[^)]*\)", "", body)   # calibrage L/E/N résiduel

        # découpe par paliers ; l'avant-premier palier = description générale
        parts = _PALIER.split(body)
        desc = _clean("\n".join(l for l in parts[0].splitlines()
                                if not l.lstrip().startswith("|")))
        todo = desc == "TODO"
        if todo:
            desc = ""
        paliers = []
        for k in range(1, len(parts), 3):
            pips, pname, pbody = parts[k], parts[k + 1], parts[k + 2]
            pm = re.search(r"\*\*Prérequis\s*:\*\*\s*(.*?)(?:<br>|\n)", pbody)
            # L'effet court jusqu'à la fin du fragment de palier (certaines cartes
            # portent des paragraphes de règles APRÈS une table, ex. Krav Maga,
            # MMA), mais s'arrête avant la ligne **Dégâts :** des arts martiaux ;
            # seules les lignes de table en sont retranchées.
            em = re.search(r"\*\*Effet\s*:\*\*\s*(.*?)(?=\s*\*\*Dégâts\s*:\*\*|\Z)",
                           pbody, re.S)
            dm = _DEGATS.search(pbody)
            flavor = _clean(pbody[:pm.start()] if pm else pbody)
            effet = ""
            if em:
                effet = _clean("\n".join(l for l in em.group(1).splitlines()
                                         if not l.lstrip().startswith("|")))
            paliers.append({
                "niveau": _clean(pname),
                "pips": pips,
                "prereq": _clean(pm.group(1)) if pm else "",
                "effet": effet,
                "flavor": flavor,
                "degats": [int(dm.group(1)), int(dm.group(2))] if dm else None,
                "degatsParties": _clean(dm.group(3) or "") if dm else "",
                "tables": _art_tables(pbody),
            })
        # Les lignes **Dégâts :** par palier remplacent l'ancienne ligne de
        # calibrage : elles reconstruisent le même dict frappe {palier: [base, ×N]}.
        if frappe is None and len(paliers) >= 3 and all(p["degats"] for p in paliers[:3]):
            frappe = {"basique": paliers[0]["degats"],
                      "avance": paliers[1]["degats"],
                      "expert": paliers[2]["degats"]}
        out.append({
            "categorie": categorie,
            "name": name,
            "tagline": tagline,
            "desc": desc,
            "todo": todo and not paliers,
            "frappe": frappe,
            "frappeParties": next((p["degatsParties"] for p in paliers
                                   if p["degatsParties"]), ""),
            "paliers": paliers,
        })
    return out


# ---------------------------------------------------------------------------
# Sens
# ---------------------------------------------------------------------------
def _sens(text):
    """Une mcard par niveau : le niveau est le **gras** de tête, les sens sont
    les <span class="zchip"> rangés par paragraphe Externes / Internes du
    <div class="sens-niveau">."""
    out = []
    for chunk in re.split(r'(?=<div class="mcard")', text):
        mn = re.search(r"\*\*(Primaire|Secondaire|Tertiaire|Latent|Inexistant)\*\*", chunk)
        if not mn:
            continue
        niveau = mn.group(1)
        bloc = re.search(r'<div class="sens-niveau">(.*?)</div>', chunk, re.S)
        if not bloc:
            continue
        for pm in re.finditer(r"<p>(.*?)</p>", bloc.group(1), re.S):
            para = pm.group(1)
            zl = re.search(r'<span class="zlbl">(Externes|Internes)</span>', para)
            typ = "externe" if (zl and zl.group(1) == "Externes") else "interne"
            for zc in re.finditer(r'<span class="zchip">(.*?)</span>', para):
                name = html.unescape(_clean(zc.group(1)))
                if name:
                    out.append({"name": name, "niveau": niveau, "type": typ,
                                "desc": ""})
    return out


# ---------------------------------------------------------------------------
# Tailles
# ---------------------------------------------------------------------------
def _tailles(text):
    cats, mods = [], {}
    for t in _pipe_tables(text):
        head = [_clean(h) for h in t["header"]]
        if head[:2] == ["Catégorie", "Hauteur ou Longueur"]:
            for r in t["rows"]:
                cats.append({"name": r[0], "taille": r[1], "poids": r[2],
                             "espace": r[3], "allonge": r[4]})
        elif head[:2] == ["Taille", "Modificateur"]:
            for r in t["rows"]:
                mods[r[0]] = _int(r[1]) or 0
    for c in cats:
        c["pvMod"] = mods.get(c["name"], 0)
    return cats


# ---------------------------------------------------------------------------
# Avantages (avantages.md)
# ---------------------------------------------------------------------------
def _avantages(text):
    """Table des points d'avantage (Éclat | Points d'avantage, lue au palier
    inférieur) + une mcard par avantage : **Nom** <span class="prereq">N
    points</span> puis la règle."""
    points = []
    for t in _pipe_tables(text):
        head = [_clean(h) for h in t["header"]]
        if head[:2] == ["Éclat", "Points d'avantage"]:
            for r in t["rows"]:
                v, p = _int(r[0]), _int(r[1])
                if v is not None and p is not None:
                    points.append({"eclat": v, "pts": p})
    liste = []
    for m in re.finditer(r'<div class="mcard"[^>]*>(.*?)</div>', text, re.S):
        inner = m.group(1)
        nm = re.search(r'\*\*(.+?)\*\*\s*(?:<span class="prereq">(.*?)</span>)?', inner)
        if not nm:
            continue
        cout_txt = _clean(nm.group(2) or "")
        # « 2 points » -> cout 2 ; « 1 à 3 points » -> cout 1, coutMax 3 (le
        # joueur règle le coût dépensé dans cette fourchette)
        nums = [int(n) for n in re.findall(r"\d+", cout_txt)]
        liste.append({"name": _clean(nm.group(1)),
                      "cout": nums[0] if nums else 0,
                      "coutMax": nums[-1] if nums else 0,
                      "coutTxt": cout_txt,
                      "desc": _clean(inner[nm.end():])})
    return {"points": points, "liste": liste}


# ---------------------------------------------------------------------------
# Formes du vivant (formes.md)
# ---------------------------------------------------------------------------
def _formes(text):
    """Quatre sources par forme : la table bio (exemples, respiration,
    alimentation, propriété spéciale), la table des membres, la table des écarts
    de caractéristiques, et les deux grilles HTML de sens (externes puis
    internes) dont chaque case <td class="p|s|t|l|i"> donne le niveau."""
    formes, order = {}, []

    def get(name):
        if name not in formes:
            formes[name] = {"name": name, "exemples": "", "respiration": "",
                            "alimentation": "", "propriete": "",
                            "membres": {}, "caracs": {}, "sens": {}}
            order.append(name)
        return formes[name]

    for t in _pipe_tables(text):
        head = [_clean(h) for h in t["header"]]
        if head[:3] == ["Forme", "Exemples", "Respiration"]:
            for r in t["rows"]:
                f = get(_clean(r[0]))
                f["exemples"] = _clean(r[1]) if len(r) > 1 else ""
                f["respiration"] = _clean(r[2]) if len(r) > 2 else ""
                f["alimentation"] = _clean(r[3]) if len(r) > 3 else ""
                f["propriete"] = _clean(r[4]) if len(r) > 4 else ""
        elif head[:2] == ["Forme", "Tête"]:
            for r in t["rows"]:
                f = get(_clean(r[0]))
                for i, col in enumerate(head[1:], 1):
                    v = _clean(r[i]) if i < len(r) else ""
                    if v:
                        f["membres"][col] = v
        elif head[:2] == ["Forme", "FOR"]:
            for r in t["rows"]:
                f = get(_clean(r[0]))
                for i, col in enumerate(head[1:], 1):
                    v = _int(r[i]) if i < len(r) else None
                    f["caracs"][col] = v if v is not None else 0

    niv = {"p": "Primaire", "s": "Secondaire", "t": "Tertiaire", "l": "Latent"}
    for gm in re.finditer(r'<div class="[^"]*sens-grille[^"]*">.*?</table>',
                          text, re.S):
        g = gm.group(0)
        names = [html.unescape(n) for n in
                 re.findall(r'<span class="vh">(.*?)</span>', g)]
        for rm in re.finditer(r"<tr><td>(.*?)</td>(.*?)</tr>", g):
            f = get(html.unescape(_clean(rm.group(1))))
            cells = re.findall(r'<td class="(\w)"[^>]*>', rm.group(2))
            for name, cl in zip(names, cells):
                if cl in niv:
                    f["sens"][name] = niv[cl]
    return [formes[n] for n in order]


# ---------------------------------------------------------------------------
# Capacités physiques (tables 0-30)
# ---------------------------------------------------------------------------
def _capacites(text):
    """Les lignes sont indexées par la VALEUR de la première colonne (0-30), pas
    par leur position : une table réordonnée reste juste, une table à trous est
    écartée avec un avertissement bruyant plutôt qu'en silence."""
    caps = {}
    for t in _pipe_tables(text):
        head = [_clean(h) for h in t["header"]]
        if len(head) < 2:                 # au moins une colonne de valeurs (Lancer n'en a qu'une)
            continue
        if head[0] == "Mouvement":
            key, carac = "mouvement", "AGI"
        elif head[0] == "Port":
            key, carac = "port", "FOR"
        elif head[0] == "Saut":           # Saut (FOR) : sans élan / avec élan
            key, carac = "saut", "FOR"
        elif head[0] == "Lancer":         # Lancer (FOR) : multiplicateur des portées de jet et de tir
            key, carac = "lancer", "FOR"
        elif head[0] == "Repos":          # Repos (sommeil) : Temps de sommeil / redormir / fatigue
            key, carac = "repos", "END"
        elif head[0] == "Fond":           # Fond (effort) : durées d'activité intermédiaire / lourde
            key, carac = "fond", "END"
        elif head[0] == "Pression":       # Pression aquatique : profondeur supportée selon l'allure
            key, carac = "pression", "END"
        elif head[0] == "Apnée" and head[1] == "Légère":
            key, carac = "apnee", "END"
        else:
            continue
        by_val = {}
        for r in t["rows"]:
            rg = _range(r[0])
            if rg and rg[0] == rg[1]:
                by_val[rg[0]] = r[1:]
        if set(by_val) != set(range(31)):
            print(f"[creation] AVERTISSEMENT : table de capacité « {key} » sans "
                  f"les 31 paliers 0-30 ({len(by_val)} lus), table écartée")
            continue
        caps[key] = {"carac": carac, "cols": head[1:],
                     "rows": [by_val[v] for v in range(31)]}
    return caps


# ---------------------------------------------------------------------------
# États (etats.md) : <div class="sblock"> avec **Nom**, spans smod et paliers
# ---------------------------------------------------------------------------
_SBLOCK = re.compile(r'<div class="sblock" markdown>(.*?)</div>', re.S)
_SMOD = re.compile(r'<span class="smod">([^<]+?)\s*<b>([−+]?\d+)</b></span>')
_PALIER_P = re.compile(r'<p class="palier">(.*?)</p>')


def _etat_mods(fragment):
    return [{"cible": _clean(m.group(1)), "val": _int(m.group(2))}
            for m in _SMOD.finditer(fragment)]


def _etats(text):
    out, categorie = [], None
    # les catégories sont les ### qui précèdent les blocs
    pieces = re.split(r"^### (.+)$", text, flags=re.M)
    for i in range(1, len(pieces), 2):
        categorie = _clean(pieces[i])
        for m in _SBLOCK.finditer(pieces[i + 1]):
            inner = m.group(1)
            nm = re.search(r"^\*\*(.+?)\*\*\s*$", inner, re.M)
            if not nm:
                continue
            # découpe par paliers ; l'avant-premier palier = état simple
            parts = _PALIER_P.split(inner[nm.end():])
            paliers = []
            for k in range(1, len(parts), 2):
                pname, pbody = _clean(parts[k]), parts[k + 1]
                paliers.append({
                    "name": pname,
                    "mods": _etat_mods(pbody),
                    "desc": _clean(_SMOD.sub("", pbody)),
                })
            out.append({
                "name": _clean(nm.group(1)),
                "categorie": categorie,
                "mods": _etat_mods(parts[0]),
                "desc": _clean(_SMOD.sub("", parts[0])),
                "paliers": paliers,
            })
    return out


# ---------------------------------------------------------------------------
# Armes (catalogue d'équipement, avec la famille = section ## d'armes.md)
# ---------------------------------------------------------------------------
def _armes(text):
    """Mêmes lignes à 11 cellules que hooks/forge.py, plus la famille (section ##)
    et le prix converti en entier (« 8 000 Ɉ » -> 8000, vide -> None)."""
    out, famille = [], None
    for ln in text.splitlines():
        h = re.match(r"^## (.+)$", ln)
        if h:
            famille = _clean(h.group(1))
            continue
        s = ln.strip()
        if not (s.startswith("|") and s.endswith("|")):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) != 11:
            continue
        name = cells[0]
        if name in ("Arme", "") or set(name) <= set("-: "):
            continue
        prix = _int(cells[9].replace("Ɉ", ""))
        out.append({
            "name": name, "famille": famille,
            "am": cells[1], "portee": cells[2].replace("<br>", " · "),
            "munitions": cells[3].replace("<br>", " "), "mains": cells[4],
            "degats": _int(cells[5]), "mod": cells[6] or "×0", "type": cells[7],
            "illeg": cells[8], "prix": prix, "props": cells[10] or "Aucune",
            "corps": famille == "Corps",
        })
    return out


# ---------------------------------------------------------------------------
# Nen — techniques (techniques-nen.md) et archétypes
# ---------------------------------------------------------------------------
# Paliers de technique : <p class="palier">Basique</p> SANS pips (contrairement
# aux arts). On ne retient que les quatre noms canoniques.
_TECH_PALIER = re.compile(r'<p class="palier">\s*(Basique|Avancé|Expert|Maître)\s*</p>')


def _tech_meta(chunk):
    """(prérequis, coût DI, description) d'un fragment de carte ou de palier."""
    spans = [_clean(s) for s in _SPAN.findall(chunk)]
    prereq = next((s.split(":", 1)[1].strip() for s in spans
                   if s.lower().startswith("prérequis")), "")
    cout_s = next((s for s in spans if s.lower().startswith("coût")), "")
    cm = re.search(r"(\d+)\s*DI", cout_s)
    body = _SPAN.sub("", chunk)
    desc = _clean("\n".join(l for l in body.splitlines()
                            if not l.lstrip().startswith("|")
                            and not re.match(r"^\s*(-{3,}|\*{3,})\s*$", l)))
    return prereq, (int(cm.group(1)) if cm else None), desc


def _techniques(text):
    """Une carte mcard art par technique. Bloc (Initiation, Hatsu, Shu, Ken, Ko,
    Ryu) = un seul coût ; à paliers (Ten, Zetsu, Ren, Gyo, En, In) = quatre. Les
    tables internes (bonus, rayons d'En) sont jointes telles quelles."""
    out = []
    for m in _ART_CARD.finditer(text):
        inner = m.group(1)
        nm = _NAME.search(inner)
        if not nm:
            continue
        name, tag = _clean(nm.group(1)), _clean(nm.group(2) or "")
        rest = inner[nm.end():]
        # Bloc indépendant qui suit un hr « --- » autonome (la carte En : extension du
        # rayon, « indépendamment des quatre paliers ») : on le retranche du corps des
        # paliers pour ne pas le coller au palier Maître. Sûr car seul l'En en porte un
        # (les séparateurs de table « |---| » commencent par « | » et ne matchent pas).
        mhr = re.search(r"(?m)^[ \t]*---[ \t]*$", rest)
        rest_paliers = rest[:mhr.start()] if mhr else rest
        parts = _TECH_PALIER.split(rest_paliers)
        tables = _art_tables(inner)
        # L'En : la table des rayons (« Rayon | Coût (DI) | Aura par tour ») devient un
        # champ structuré `rayons` (crans payants) et sort de `tables` pour ne pas être
        # affichée deux fois. Les autres techniques gardent leurs tables informatives.
        rayons = []
        if name == "En":
            kept = []
            for t in tables:
                cols = [c.lower() for c in t["cols"]]
                if cols and cols[0].startswith("rayon"):
                    for r in t["rows"]:
                        di = re.search(r"\d+", r[1]) if len(r) > 1 else None
                        au = re.search(r"\d+", r[2]) if len(r) > 2 else None
                        rayons.append({"rayon": r[0],
                                       "coutDI": int(di.group()) if di else 0,
                                       "auraTour": int(au.group()) if au else 0})
                else:
                    kept.append(t)
            tables = kept
        entry = {"name": name, "tag": tag, "tables": tables}
        if rayons:
            entry["rayons"] = rayons
        if len(parts) == 1:
            # technique d'un bloc : prérequis/coût directement sous le nom
            prereq, cout, desc = _tech_meta(rest)
            entry.update({"bloc": True, "prereq": prereq, "cout": cout,
                          "desc": desc, "paliers": []})
        else:
            head_prereq, head_cout, head_desc = _tech_meta(parts[0])
            paliers = []
            for k in range(1, len(parts), 2):
                niveau, pbody = parts[k], parts[k + 1]
                prereq, cout, desc = _tech_meta(pbody)
                paliers.append({"niveau": niveau, "prereq": prereq,
                                "cout": cout, "desc": desc})
            entry.update({"bloc": False, "prereq": head_prereq,
                          "cout": head_cout, "desc": head_desc,
                          "paliers": paliers})
        out.append(entry)
    return out


# Affinités d'emploi/apprentissage par archétype (AE % par catégorie), copiées de
# hooks/nen_atelier.py pour ne pas dépendre de l'ordre de chargement des hooks.
# Ordre des catégories : renforcement, émission, transmutation, manipulation,
# conjuration, spécialisation. La valeur de spécialisation n'est atteinte qu'avec
# l'avantage Spécialiste (drapeau `spe`) ; sans lui, 0.
_NEN_CATS = ["renforcement", "émission", "transmutation", "manipulation",
             "conjuration", "spécialisation"]
_ARCHETYPES = [
    ("Renforceur",               [100, 80, 80, 60, 60, 40], False),
    ("Émitteur",                 [80, 100, 60, 80, 40, 60], False),
    ("Transmuteur",              [80, 60, 100, 40, 80, 60], False),
    ("Manipulateur",             [60, 80, 40, 100, 60, 80], False),
    ("Conjurateur",              [60, 40, 80, 60, 100, 80], False),
    ("Spécialiste",              [40, 60, 60, 80, 80, 100], True),
    ("Renforceur-Émitteur",      [90, 90, 70, 70, 50, 50], False),
    ("Renforceur-Transmuteur",   [90, 70, 90, 50, 70, 50], False),
    ("Émitteur-Manipulateur",    [70, 90, 50, 90, 50, 70], False),
    ("Transmuteur-Conjurateur",  [70, 50, 90, 50, 90, 70], False),
    ("Manipulateur-Spécialiste", [50, 70, 50, 90, 70, 90], True),
    ("Conjurateur-Spécialiste",  [50, 50, 70, 70, 90, 90], True),
]


def _archetypes():
    return [{"name": n, "affinites": aff, "spe": spe}
            for n, aff, spe in _ARCHETYPES]


# ---------------------------------------------------------------------------
# Assemblage
# ---------------------------------------------------------------------------
def _read(docs_dir, rel):
    p = docs_dir / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""


def _extract(docs_dir):
    caracs, carac_tables = _caracteristiques(_read(docs_dir, PAGES["caracs"]))
    comps, groupes, difficultes = _competences(_read(docs_dir, PAGES["competences"]))
    formations = []
    for cat, rel in FORMATION_PAGES:
        formations.extend(_formations(_read(docs_dir, rel), cat))
    arts = []
    for cat, rel in ART_PAGES:
        arts.extend(_arts(_read(docs_dir, rel), cat))
    # Les frappes des arts martiaux vivent dans les lignes **Dégâts :** de leurs
    # paliers : si elles disparaissent du livre, le créateur perd la mécanique.
    # On le crie au build.
    sans_frappe = [a["name"] for a in arts
                   if a["categorie"] == "martiaux" and a["paliers"] and not a["frappe"]]
    if sans_frappe:
        print("[creation] AVERTISSEMENT : arts martiaux à paliers SANS ligne "
              "**Dégâts :** : " + ", ".join(sans_frappe))
    return {
        "caracs": caracs,
        "caracTables": carac_tables,
        "eclat": _eclat(_read(docs_dir, PAGES["eclat"])),
        "competences": comps,
        "groupes": groupes,
        "difficultes": difficultes,
        "formations": formations,
        "arts": arts,
        "sens": _sens(_read(docs_dir, PAGES["sens"])),
        "tailles": _tailles(_read(docs_dir, PAGES["tailles"])),
        "formes": _formes(_read(docs_dir, PAGES["formes"])),
        "avantages": _avantages(_read(docs_dir, PAGES["avantages"])),
        "capacites": _capacites(_read(docs_dir, PAGES["capacites"])),
        "armes": _armes(_read(docs_dir, PAGES["armes"])),
        "etats": _etats(_read(docs_dir, PAGES["etats"])),
        "techniques": _techniques(_read(docs_dir, PAGES["techniques"])),
        "nenCats": _NEN_CATS,
        "archetypes": _archetypes(),
    }


def on_files(files, config, **kwargs):
    data = _extract(Path(config["docs_dir"]))
    print(f"[creation] {len(data['caracs'])} caracs, {len(data['eclat'])} paliers d'Éclat, "
          f"{len(data['competences'])} compétences, {len(data['formations'])} formations, "
          f"{len(data['arts'])} arts, {len(data['sens'])} sens, "
          f"{len(data['tailles'])} tailles, {len(data['formes'])} formes, "
          f"{len(data['avantages']['liste'])} avantages, "
          f"{len(data['capacites'])} tables de capacités, "
          f"{len(data['armes'])} armes, {len(data['etats'])} états, "
          f"{len(data['techniques'])} techniques, {len(data['archetypes'])} archétypes")
    content = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    files.append(File.generated(config, "creation.json", content=content))
    return files


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(__file__).resolve().parent.parent
    data = _extract(root / "docs")
    out = sys.argv[1] if len(sys.argv) > 1 else "creation.debug.json"
    Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=2),
                         encoding="utf-8")
    print(f"caracs: {len(data['caracs'])}")
    for c in data["caracs"]:
        print(f"  {c['abbr']:4} {c['name']:12} ({c['groupe']})")
    print(f"tables carac: modificateurs={len(data['caracTables']['modificateurs'])}")
    print(f"éclat: {len(data['eclat'])} paliers")
    print(f"compétences: {len(data['competences'])} "
          f"(desc remplies: {sum(1 for c in data['competences'] if c['desc'])})")
    champs = {}
    for c in data["competences"]:
        champs[c["champ"]] = champs.get(c["champ"], 0) + 1
    print("  " + ", ".join(f"{k}={v}" for k, v in champs.items()))
    print(f"groupes: {len(data['groupes'])}, difficultés: {len(data['difficultes'])}")
    print(f"formations: {len(data['formations'])}")
    for f in data["formations"]:
        print(f"  {f['name']:24} {f['cout']} PF  prereq={f['prereq'] or '—'}")
    arts_ok = sum(1 for a in data["arts"] if a["paliers"])
    print(f"arts: {len(data['arts'])} (avec paliers: {arts_ok}, "
          f"frappe: {sum(1 for a in data['arts'] if a['frappe'])})")
    print(f"sens: {len(data['sens'])}, tailles: {len(data['tailles'])}, "
          f"capacités: {list(data['capacites'].keys())}")
    familles = {}
    for a in data["armes"]:
        familles[a["famille"]] = familles.get(a["famille"], 0) + 1
    print(f"armes: {len(data['armes'])} — " + ", ".join(f"{k}={v}" for k, v in familles.items()))
