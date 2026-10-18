"""Régénère les fiches du livre depuis la Boutique, jamais l'inverse."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from hooks.boutique import catalogue, document, index_document
root = Path(__file__).resolve().parents[1] / 'docs'
data = catalogue(root)
for item in data['objets']:
    target = root / item['objet']['page']; target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document(item), encoding='utf8')
(root / 'content/regles/equipement.md').write_text(index_document(data), encoding='utf8')
print(len(data['objets']), 'fiches régénérées depuis la Boutique')
