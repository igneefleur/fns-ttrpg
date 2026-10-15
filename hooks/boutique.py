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
    return {'version': 1, 'objets': items}


def on_files(files, config):
    docs = Path(config['docs_dir'])
    data = json.dumps(catalogue(docs), ensure_ascii=False, separators=(',', ':'))
    files.append(File.generated(config, 'owd-boutique.json', content=data))
    return files
