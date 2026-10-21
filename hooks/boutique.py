"""La Boutique définit les équipements. Le livre et la fiche sont des consommateurs."""
import copy
import hashlib
import json
import math
from urllib.parse import urlparse
from pathlib import Path
from mkdocs.structure.files import File

TAILLES = ('Minuscule', 'Très petite', 'Petite', 'Moyenne', 'Grande', 'Très grande', 'Gigantesque')
TYPES = ('arme', 'vetement', 'accessoire', 'rangement', 'contenant', 'consommable', 'munition', 'autre')
DAMAGE = {'physique':'Physique', 'feu':'Feu', 'froid':'Froid', 'eclair':'Éclair', 'decomposition':'Décomposition', 'ethere':'Éthéré', 'brut':'Brut'}


def reference(docs):
    """Une seule définition éditable ; aucune lecture du livre ou d'un tableur."""
    docs = Path(docs)
    data = json.loads((docs / 'data/owd-boutique.json').read_text(encoding='utf8'))
    items = data.get('equipements', [])
    if not items:
        raise ValueError('Le catalogue Boutique est vide.')
    ids, names = set(), set()
    effects = {e['id'] for e in data.get('effets', [])}
    if len(effects) != len(data.get('effets', [])):
        raise ValueError('Identifiants d’effets dupliqués.')
    imbues = set()
    for d in data.get('impregnations', []):
        if not d.get('id') or d['id'] in imbues:
            raise ValueError('Identifiant d’imprégnation absent ou dupliqué.')
        imbues.add(d['id'])
        for key in ('pct', 'flat'):
            value = d.get(key)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise ValueError(f'Imprégnation : {key} invalide : {d["id"]}')
        if d.get('type') not in ('', *DAMAGE) or (d['flat'] and not d.get('type')):
            raise ValueError(f'Type d’imprégnation invalide : {d["id"]}')
        img = d.get('img', '')
        resolved = (docs / img).resolve()
        if not img.startswith('assets/impregnations/') or not resolved.is_relative_to(docs.resolve()) or not resolved.is_file():
            raise ValueError(f'Icône d’imprégnation non embarquée : {d["id"]}')
    for o in items:
        name = o['nom']
        if o['id'] in ids or name in names:
            raise ValueError(f'Équipement dupliqué : {name}')
        ids.add(o['id']); names.add(name)
        missing = set(o.get('donneesACompleter', [])) if o.get('definitionStatut') == 'a-completer' else set()
        if o.get('typeObjet') not in TYPES or (o.get('taille') not in TAILLES and not (o.get('taille') == '' and 'taille' in missing)):
            raise ValueError(f'Type/taille invalide : {name}')
        if o.get('mains') not in (1, 2, '2 obligatoires'):
            raise ValueError(f'Nombre de mains invalide : {name}')
        for key in ('poids', 'volume', 'achat', 'vente'):
            val = o.get(key)
            if val is None and (key in ('achat', 'vente') or key in missing): continue
            if not isinstance(val, (float, int)) or not math.isfinite(val) or val < 0:
                raise ValueError(f'{key} invalide ou absent : {name}')
        if o.get('encombre') != o['volume']:
            raise ValueError(f'Volume/encombrement différents : {name}')
        if not isinstance(o.get('desc'), str):
            raise ValueError(f'Description invalide : {name}')
        if o['desc']:
            src = urlparse(o.get('descriptionSource', ''))
            if src.scheme != 'https' or src.netloc not in ('outward.wiki.gg', 'outward.fandom.com') or not src.path.startswith('/wiki/') or o.get('descriptionStatut') != 'wiki':
                raise ValueError(f'Description sans source wiki : {name}')
            if hashlib.sha256(o['desc'].encode()).hexdigest() != o.get('descriptionEmpreinte'):
                raise ValueError(f'Description modifiée sans vérification : {name}')
        img = o.get('img', '')
        if img:
            resolved = (docs / img).resolve()
            if not img.startswith('assets/') or not resolved.is_relative_to(docs.resolve()) or not resolved.is_file():
                raise ValueError(f'Illustration non embarquée : {name}: {img}')
        if o.get('tailleAccroche') and o['tailleAccroche'] not in TAILLES:
            raise ValueError(f'Taille d’accroche invalide : {name}')
        for eid in o.get('effets', []):
            if eid not in effects:
                raise ValueError(f'Effet inconnu : {name}: {eid}')
        if o.get('arme'):
            rep = o['arme'].get('repartition', {})
            if abs(sum(rep.values()) - 100) > 1e-6:
                raise ValueError(f'Répartition des dégâts invalide : {name}')
    return data


def number(v):
    if v is None: return 'Non renseigné'
    try:
        n = float(v)
        if math.isfinite(n): return str(int(n)) if int(n) == n else str(n)
    except (ValueError, TypeError): pass
    return str(v)


def champs(o, effects):
    """Projection d'affichage, sans modifier ou réinterpréter les valeurs."""
    f = [['Poids (kg)', number(o['poids'])], ['Volume (L)', number(o['volume'])],
         ['Taille', o['taille'] or 'Non renseignée'], ['Mains', str(o['mains'])],
         ['Achat (argent)', 'Non commercialisé' if o.get('commerce') == 'non-commercialise' else ('Non renseigné' if o.get('achat') is None else number(o['achat']))],
         ['Vente (argent)', 'Non commercialisé' if o.get('commerce') == 'non-commercialise' else ('Non renseigné' if o.get('vente') is None else number(o['vente']))]]
    def add(label, value, always=False):
        if always or value not in (None, '', 0, False):
            f.append([label, number(value)])
    if o.get('effetsStatut') == 'non-definis': f.append(['Effets JDR', 'Non définis'])
    a = o.get('arme')
    if a:
        for label, key in [('Attaque','attaque'), ('Touches','hits'), ('Dégâts de base','degats'), ('Parade','parade'), ('Réduction de base','reduction')]:
            add(label, a.get(key, 0), True)
        abbr = {'Force':'FOR','Dexterite':'DEX','Vigueur':'VIG','Endurance':'END','Resistance':'RES','Ferveur':'FER','Intelligence':'INT','Chance':'CHA'}
        for label, key in [('Modificateur de dégâts','modsDegats'), ('Modificateur de réduction','modsParade')]:
            for i, val in enumerate(a.get(key, [])):
                if val: add(f'{label} {i+1}', abbr.get(val, val))
        for key, val in a.get('repartition', {}).items():
            add(DAMAGE.get(key, key) + ' (%)', val, True)
    for k, val in o.get('prerequis', {}).items():
        add(k.upper() + ' requise', val)
    if o.get('sac') or o['typeObjet'] == 'contenant':
        add('Capacité (L)', o.get('cap', 0), True)
        add('Taille maximale acceptée', o.get('tailleInterieure'))
    if o.get('sac') or o.get('ceint'):
        add('Accroches', o.get('ep', 0), True)
        add('Taille maximale aux accroches', o.get('tailleAccroche'))
    if o['typeObjet'] == 'contenant':
        add('Contenu accepté', {'liquide':'Liquide','pate':'Pâte','poudre':'Poudre','solide':'Solide'}.get(o.get('contenant'), o.get('contenant', '')))
        add('Piles de contenu', o.get('emplacements', 0), True)
        add('Capacité (doses de 0,25 L)', o.get('doses'))
    for key, label in [('froid','Protection contre le froid'), ('chaud','Protection contre la chaleur'), ('poches','Poches (L)')]:
        add(label, o.get(key, 0), o['typeObjet'] == 'vetement')
    for typ, label in DAMAGE.items():
        add('Protection ' + label, o.get('prot_' + typ))
        add('Résistance ' + label + ' (%)', o.get('res_' + typ))
    stats = o.get('stats', {})
    for typ, val in stats.get('degats', {}).items(): add('Bonus ' + DAMAGE.get(typ, typ) + ' (%)', val)
    for typ, val in stats.get('protections', {}).items(): add('Protection passive ' + DAMAGE.get(typ, typ), val)
    for typ, val in stats.get('resistances', {}).items(): add('Résistance passive ' + DAMAGE.get(typ, typ) + ' (%)', val)
    for res, val in stats.get('couts', {}).items(): add('Coût ' + res.upper() + ' (%)', val)
    for key, label in [('vitesse','Déplacement (%)'), ('innocence','Résistance à la corruption (%)'), ('alterations','Résistance aux altérations (%)')]: add(label, stats.get(key))
    if o['typeObjet'] == 'consommable':
        if o.get('nourri'):
            for k, label in [('places','Contenance'), ('ps','PS'), ('ph','PH')]: add(label, o.get(k, 0), True)
        add('Temps (DA)', o.get('tempsConsommation', 0), True)
        for k, val in o.get('restaurations', {}).items():
            if val: add('Restauration ' + k.upper(), number(val) + ' ' + o.get('unitesRestauration', {}).get(k, 'points'))
        for eid, threshold in o.get('conditionsEffets', {}).items():
            add('Condition : ' + effects.get(eid, {}).get('nom', eid), f'PS ≤ {threshold} %')
    props = o.get('proprietes', {})
    labels = {'autonomie':'Autonomie', 'recharge':'Recharge', 'esquiveLibre':'Ne gêne pas l’esquive', 'conservationAliments':'Périssement ralenti (%)', 'lumiere':'Lumière'}
    for k, v in props.items():
        if v is not None and v is not False:
            add(labels.get(k, k), 'Oui' if v is True else {'faint':'Faible','bright':'Vive'}.get(str(v), v), True)
    for rule in o.get('reglesManuelles', []): add('Propriété — gestion manuelle', rule)
    for i, eid in enumerate(o.get('effets', [])):
        d = effects[eid]
        value = d['nom']
        if d.get('description'): value += ' — ' + d['description']
        if d.get('dureeTexte'): value += ' (' + d['dureeTexte'] + ')'
        if d.get('manuel'): value += ' — gestion manuelle'
        add(f'Effet {i+1}', value)
    return f


def catalogue(docs):
    data = reference(docs)
    effects = {e['id']: e for e in data['effets']}
    items = []
    for o in data['equipements']:
        items.append({'id':o['id'], 'nom':o['nom'], 'categorie':o['categorieBoutique'],
                      'famille':o.get('famille',''), 'origine':o.get('origine',''),
                      'img':o.get('img',''), 'desc':o['desc'], 'champs':champs(o, effects),
                      'objet':copy.deepcopy(o)})
    return {'version':data['version'], 'source':'OWD Boutique', 'effets':data['effets'], 'typesArmes':data['typesArmes'], 'typesDegats':data['typesDegats'], 'monnaie':data['monnaie'], 'objets':items}


def document(it):
    def escape(v): return str(v).replace('|', '&#124;').replace('\n', '<br>')
    text = f"# {it['nom']}\n\n<!-- Généré depuis docs/data/owd-boutique.json ; modifier la Boutique. -->\n\n"
    if it['img']: text += f"![{it['nom']}](../../../{it['img']}){{ .equipment-portrait }}\n\n"
    text += f"**Catégorie :** {it['categorie']}  \n**Famille :** {it['famille']}  \n**Origine :** {it['origine']}\n\n{it['desc']}\n\n| Caractéristique | Valeur |\n| --- | --- |\n"
    text += '\n'.join('| ' + escape(k) + ' | ' + escape(v) + ' |' for k, v in it['champs'])
    return text + '\n\n[Retour au catalogue](../equipement.md)\n'


def index_document(data):
    lines = ['# Équipements', '', '<!-- Généré depuis la Boutique. -->', '', 'Les équipements, leurs valeurs et leurs effets sont définis par la Boutique.', '']
    for category in sorted({x['categorie'] for x in data['objets']}):
        lines += ['## ' + category, '']
        lines += [f"- [{x['nom']}](equipements/{Path(x['objet']['page']).name})" for x in data['objets'] if x['categorie'] == category]
        lines.append('')
    return '\n'.join(lines)


def on_config(config):
    # Navigation dérivée du même catalogue, y compris les robes et nouveaux objets.
    data = reference(Path(config['docs_dir']))
    groups = {}
    for item in sorted(data['equipements'], key=lambda o:o['nom'].casefold()):
        groups.setdefault(item['categorieBoutique'], []).append({item['nom']: item['page']})
    equipment_nav = [{'Catalogue':'content/regles/equipement.md'}] + [{k:groups[k]} for k in sorted(groups)]
    def walk(nodes):
        for node in nodes or []:
            if not isinstance(node, dict): continue
            for key, value in list(node.items()):
                if key == 'Équipements': node[key] = equipment_nav
                elif isinstance(value, list): walk(value)
    walk(config.get('nav'))
    return config


def on_files(files, config):
    data = catalogue(Path(config['docs_dir']))
    def replace(path, content):
        old = files.get_file_from_path(path)
        if old is not None: files.remove(old)
        files.append(File.generated(config, path, content=content))
    old = files.get_file_from_path('owd-boutique.json')
    if old is not None: files.remove(old)
    files.append(File.generated(config, 'owd-boutique.json', content=json.dumps(data, ensure_ascii=False, separators=(',', ':'))))
    for item in data['objets']: replace(item['objet']['page'], document(item))
    replace('content/regles/equipement.md', index_document(data))
    return files
