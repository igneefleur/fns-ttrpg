"""Ancienne entrée de commande, conservée sans permettre d'écraser la Boutique.

La Boutique est désormais le référentiel des équipements et des effets.
Pour modifier un équipement : docs/data/owd-boutique.json.
Pour régénérer le livre : python scripts/exporter_boutique.py.
"""
import sys
if __name__ == '__main__':
    print('Import de tableur désactivé : modifier docs/data/owd-boutique.json, puis reconstruire le site. Aucun fichier modifié.')
    sys.exit(2)
