"""Sert au site le moteur des dés en volume, pris dans l'extension.

Le moteur vit dans `extension/firefox/des3d.js` (et sa feuille `des3d.css`) :
c'est lui que la surcouche Roll20 fait tourner. La fiche en a besoin aussi,
pour montrer les dés d'action en volume. Plutôt qu'une copie dans `docs/`, qui
divergerait au premier correctif, ce hook ajoute les deux fichiers au site AU
BUILD, lus à leur unique source. Il n'écrit rien dans `docs/`.

Un fichier absent n'arrête pas le build : la fiche sait s'en passer (le module
des dés d'action retombe alors sur de simples pastilles).
"""

import logging
from pathlib import Path

from mkdocs.structure.files import File

LOG = logging.getLogger("mkdocs.hooks.des3d")


def _lire(config, rel):
    p = Path(config["config_file_path"]).parent / "extension" / "firefox" / rel
    if not p.is_file():
        LOG.warning("des3d : %s introuvable, la fiche montrera des pastilles", p)
        return None
    return p.read_text(encoding="utf-8")


def on_files(files, config, **kwargs):
    js = _lire(config, "des3d.js")
    if js is not None:
        files.append(File.generated(config, "javascripts/owd-des3d.js", content=js))
    css = _lire(config, "des3d.css")
    if css is not None:
        files.append(File.generated(config, "stylesheets/owd-des3d.css", content=css))
    return files
