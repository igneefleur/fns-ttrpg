"""Catalogue de Boutique, reconstruit depuis les fiches d'équipement au build."""
import json
import re
from pathlib import Path
from mkdocs.structure.files import File


def plain(text):
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    text = re.sub(r'\[([^]]+)\]\([^)]+\)', r'\1', text)
    return text.replace('**', '').strip()


def catalogue(docs):
    items = []
    for path in sorted((docs / 'content/regles/equipements').glob('*.md')):
        text = path.read_text(encoding='utf-8-sig')
        title = re.search(r'^# (.+)$', text, re.M)
        category = re.search(r'^\*\*Catégorie :\*\*\s*(.+)', text, re.M)
        if not title or not category:
            continue
        image = re.search(r'!\[[^]]*\]\(([^)]+)\)', text)
        fields = []
        for line in text.splitlines():
            if not line.startswith('| '):
                continue
            cells = [plain(c) for c in line.strip('| ').split('|')]
            if len(cells) == 2 and cells[0] not in ('Caractéristique', '---') and not set(cells[0]) <= {'-', ' '}:
                fields.append(cells)
        description = re.sub(r'<!--.*?-->', '', text, flags=re.S)
        description = re.sub(r'!\[[^]]*\]\([^)]*\)(?:\{[^}]*\})?', '', description)
        description = '\n'.join(line for line in description.splitlines()
                                if not line.startswith(('# ', '|', '**', '[Retour')))
        description = re.sub(r'^## (.+)$', r'\1', description, flags=re.M)
        description = re.sub(r'\n{3,}', '\n\n', description).strip()
        img = ''
        if not image:
            raise ValueError(f'Illustration absente : {path.name}')
        if image:
            resolved = (path.parent / image[1]).resolve()
            img = resolved.relative_to(docs.resolve()).as_posix()
            if not resolved.is_file():
                raise ValueError(f'Image absente : {path.name}: {img}')
        family = re.search(r'^\*\*Famille :\*\*\s*(.+)', text, re.M)
        origin = re.search(r'^\*\*Origine :\*\*\s*(.+)', text, re.M)
        items.append({'id': path.stem, 'nom': title[1], 'categorie': category[1].strip(),
                      'famille': family[1].strip() if family else '',
                      'origine': origin[1].strip() if origin else '', 'img': img,
                      'desc': plain(description), 'champs': fields})
    if not items:
        raise ValueError('Le catalogue des équipements est vide.')
    # Les données JDR du tableur priment sur les anciennes fiches descriptives.
    reference = docs / 'data/owd-effets.json'
    if reference.exists():
        data = json.loads(reference.read_text(encoding='utf8'))
        by_name = {o['nom']: o for o in data.get('equipements', [])}
        for it in items:
            if it['nom'] not in by_name:
                continue
            obj = dict(by_name[it['nom']])
            obj['img'] = it['img']
            if not obj.get('desc'):
                obj['desc'] = it['desc']
            it['objet'] = obj
            replacements = {'Type': obj.get('construction'), 'Taille': obj.get('taille'),
                            'Taille maximale acceptée': obj.get('tailleInterieure'),
                            'Attaches': obj.get('ep')}
            it['champs'] = [['Accroches' if k == 'Attaches' else k,
                             str(replacements[k]) if k in replacements and replacements[k] is not None else v]
                            for k, v in it['champs']]
            if obj.get('sac'):
                it['categorie'] = 'Rangement'
                it['famille'] = 'Sac à dos'
                it['champs'].append(['Taille maximale aux accroches', 'Moyenne (2 acc par objet Moyen)'])
        existing = {it['nom'] for it in items}
        categories = {'arme':'Arme','vetement':'Vêtement','rangement':'Rangement','eclairage':'Éclairage','couchage':'Couchage'}
        for o in data.get('equipements', []):
            if o['nom'] in existing:
                continue
            existing.add(o['nom'])
            fields = [['Poids (kg)', str(o.get('poids',0))],['Volume (L)',str(o.get('volume',0))],
                      ['Taille',o.get('taille','')],['Construction',o.get('construction','')],
                      ['Achat (argent)',str(o.get('achat',0))],['Vente (argent)',str(o.get('vente',0))]]
            fields += [['Effet '+str(i+1), name] for i,name in enumerate(o.get('effets',[]))]
            items.append({'id':o['id'],'nom':o['nom'],'categorie':categories[o['typeObjet']],
                          'famille':o.get('sousType',''),'origine':'Outward','img':o.get('img',''),
                          'desc':o.get('desc',''),'champs':fields,'objet':o})
        for o in data.get('objets', []):
            if o['nom'] in existing:
                continue
            fields = [['Poids (kg)', str(o.get('poids', 0))], ['Volume (L)', str(round(o.get('volume', 0), 3))],
                      ['Contenance', str(o.get('places', 0))], ['Temps (DA)', str(o.get('tempsConsommation', 0))],
                      ['PS', str(o.get('ps', 0))], ['PH', str(o.get('ph', 0))]]
            fields += [['Effet '+str(i+1), name] for i, name in enumerate(o.get('effets', []))]
            fields += [['Restauration '+k.upper(), str(v)+' '+o.get('unitesRestauration', {}).get(k, 'points')]
                       for k, v in o.get('restaurations', {}).items() if v]
            items.append({'id': o['id'], 'nom': o['nom'], 'categorie': {'solide':'Solide','pate':'Pâte','liquide':'Liquide'}[o['typeObjet']],
                          'famille':'Ingérable' if o['sousType']=='ingerable' else 'Consommable', 'origine':'Outward', 'img':o.get('img',''), 'desc':o.get('desc',''),
                          'champs':fields, 'objet':o})
    return {'version': 2, 'objets': items}


def on_files(files, config):
    docs = Path(config['docs_dir'])
    data = json.dumps(catalogue(docs), ensure_ascii=False, separators=(',', ':'))
    files.append(File.generated(config, 'owd-boutique.json', content=data))
    return files
