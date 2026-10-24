"""Régressions de la source unique, indépendantes du livre et du tableur."""
from pathlib import Path
import copy
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from hooks.boutique import reference, catalogue
ROOT = Path(__file__).resolve().parents[1]

class BoutiqueReference(unittest.TestCase):
    def copy_source(self, docs, raw):
        """Copier uniquement le référentiel Boutique et toutes ses illustrations."""
        (docs/'data').mkdir()
        (docs/'data/owd-boutique.json').write_text(json.dumps(raw), encoding='utf8')
        images = {item['img'] for group in ('equipements', 'impregnations')
                  for item in raw.get(group, []) if item.get('img')}
        for image in images:
            target = docs/image
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(ROOT/'docs'/image, target)

    def test_complete_source(self):
        raw = reference(ROOT / 'docs')
        catalog = catalogue(ROOT / 'docs')
        self.assertGreaterEqual(len(raw['equipements']), 1600)
        self.assertEqual(sum(o['typeObjet']=='vetement' for o in raw['equipements']), 430)
        self.assertEqual(len(catalog['objets']), len(raw['equipements']))
        byname = {o['nom']:o for o in raw['equipements']}
        types={t['cle'] for t in raw['typesArmes']}
        for o in raw['equipements']:
            if o.get('arme'): self.assertIn(o['arme']['type'],types)
        for it in catalog['objets']:
            self.assertEqual(it['objet'], byname[it['nom']])
            o = it['objet']; fields = dict(it['champs'])
            for field,key in [('Poids (kg)','poids'),('Volume (L)','volume')]:
                self.assertEqual(fields[field],'Non renseigné') if o[key] is None else self.assertEqual(float(fields[field]),o[key],o['nom'])
            for key in ['taille','mains','achat','vente']:self.assertIn(key,o)
            self.assertEqual(fields['Taille'],o['taille'] or 'Non renseignée')
            self.assertEqual(fields['Mains'],str(o['mains']))
            if o['commerce']=='vendu':
                self.assertEqual(fields['Achat (argent)'],'Non renseigné' if o['achat'] is None else str(o['achat']).removesuffix('.0'))
                self.assertEqual(fields['Vente (argent)'],'Non renseigné' if o['vente'] is None else str(o['vente']).removesuffix('.0'))
            self.assertTrue(o['img'].startswith('assets/'))
        self.assertEqual(byname['Thick Oil']['taille'],'Minuscule')
        self.assertNotEqual(byname['Thick Oil']['desc'],'6600070')
        self.assertEqual(byname['Arcane Robe']['froid'],6)
        self.assertEqual(byname['Whole Loaf']['achat'],1)
        self.assertEqual(byname['Bread Slice']['achat'],.2)
        self.assertEqual(byname['Trader Warbelt']['ep'],20)
        self.assertEqual(byname['Nomad Baldric']['ep'],4)
        self.assertEqual(byname['Primitive Belt']['ep'],2)
        belts=[o for o in byname.values() if o.get('ceint')]
        self.assertGreaterEqual(len(belts),14)
        for o in belts:
            self.assertFalse(o['effets']);self.assertFalse(o['stats']);self.assertEqual(o['taille'],'Minuscule')
        self.assertNotIn('Gourde en cuir',byname)
        self.assertEqual(sum(o['nom']=="Gep's Drink" for o in byname.values()),1)

    def test_no_book_or_sheet_dependency(self):
        expected=catalogue(ROOT/'docs')
        with tempfile.TemporaryDirectory() as temp:
            docs=Path(temp)
            raw=reference(ROOT/'docs')
            self.copy_source(docs, raw)
            # Aucun Markdown ni ancien référentiel, uniquement la Boutique et ses images.
            self.assertEqual(reference(docs)['impregnations'], raw['impregnations'])
            self.assertEqual(catalogue(docs),expected)
            p=docs/'data/owd-boutique.json';data=json.loads(p.read_text())
            data['equipements'][0]['taille']='829';p.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'taille invalide'):reference(docs)

    def test_wiki_descriptions_only(self):
        raw = reference(ROOT/'docs')
        self.assertTrue(any(not o['desc'] for o in raw['equipements']))
        self.assertTrue(any(o['desc'] for o in raw['equipements']))
        for o in raw['equipements']:
            if o['desc']:
                self.assertEqual(o['descriptionStatut'], 'wiki')
                self.assertIn('/wiki/', o['descriptionSource'])
        # Une ancienne phrase générique ne peut pas réapparaître sans vérification.
        with tempfile.TemporaryDirectory() as temp:
            docs=Path(temp)
            self.copy_source(docs, raw)
            invalid=copy.deepcopy(raw)
            obj=next(o for o in invalid['equipements'] if not o['desc'])
            obj['desc']='A generic invented description.'
            p=docs/'data/owd-boutique.json';p.write_text(json.dumps(invalid))
            with self.assertRaisesRegex(ValueError,'sans source wiki'):reference(docs)
            obj['descriptionSource']='https://outward.wiki.gg/wiki/Example';obj['descriptionStatut']='wiki';obj['descriptionEmpreinte']='old'
            p.write_text(json.dumps(invalid))
            with self.assertRaisesRegex(ValueError,'sans vérification'):reference(docs)

    def test_missing_imbue_image_is_rejected(self):
        raw=reference(ROOT/'docs')
        with tempfile.TemporaryDirectory() as temp:
            docs=Path(temp)
            self.copy_source(docs, raw)
            # Une vraie image absente doit toujours bloquer le déploiement.
            (docs/raw['impregnations'][0]['img']).unlink()
            with self.assertRaisesRegex(ValueError, 'Icône d’imprégnation non embarquée'):
                reference(docs)

    def test_import_cannot_erase_catalogue(self):
        p=ROOT/'docs/data/owd-boutique.json';before=p.read_bytes()
        result=subprocess.run([sys.executable,str(ROOT/'scripts/importer_effets.py'),'fake.xlsx'],capture_output=True)
        self.assertEqual(result.returncode,2);self.assertEqual(p.read_bytes(),before)

if __name__=='__main__':unittest.main()
