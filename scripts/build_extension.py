"""Packe l'extension JJK (Firefox + Chrome) en fichiers téléchargeables depuis le site.

- Firefox : extension/firefox/ (Manifest V2) -> docs/download/jjk-beta-roll20-firefox.xpi
- Chrome  : extension/chrome/manifest.json (Manifest V3) + les fichiers PARTAGÉS
  de extension/firefox/ -> docs/download/jjk-beta-roll20-chrome.zip

L'extension est une COQUILLE : la fiche (jjk-creation.js/.css/.json, amorce,
correspondance état <-> Attributes) est SERVIE PAR LE SITE (roll20-fiche.html)
et affichée dans une iframe — plus rien n'est copié du site dans le paquet, et
l'extension n'a besoin d'être re-signée que si la coquille elle-même change.

Le code JS/CSS/les icônes n'existent qu'une fois (dans firefox/) : seul le manifest
diffère entre les deux navigateurs. On écrit les entrées avec des séparateurs « / »
(Compress-Archive de PowerShell 5.1 met des « \\ » que Firefox refuse) et manifest.json
est toujours à la racine de l'archive.

    python scripts/build_extension.py
"""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FF = ROOT / "extension" / "firefox"           # source de vérité (manifest V2 + fichiers)
CHROME_MANIFEST = ROOT / "extension" / "chrome" / "manifest.json"  # manifest V3 seul
DL = ROOT / "docs" / "download"
OUT_FF = DL / "jjk-beta-roll20-firefox.xpi"
OUT_CHROME = DL / "jjk-beta-roll20-chrome.zip"


def _write(out, files):
    """files : liste de (source_sur_disque, chemin_dans_archive)."""
    DL.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    arcs = []
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for src, arc in sorted(files, key=lambda p: p[1]):
            z.write(src, arc)
            arcs.append(arc)
    assert "manifest.json" in arcs, f"manifest.json absent de la racine de {out.name}"
    print(f"[extension] {out.relative_to(ROOT)} — {out.stat().st_size} octets, {len(arcs)} fichiers")
    return arcs


def build():
    # Firefox : tout extension/firefox/ tel quel.
    ff_files = [(p, p.relative_to(FF).as_posix()) for p in FF.rglob("*") if p.is_file()]
    _write(OUT_FF, ff_files)

    # Chrome : manifest V3 + tous les fichiers partagés de firefox/ SAUF son manifest.json.
    shared = [(p, arc) for (p, arc) in ff_files if arc != "manifest.json"]
    chrome_files = [(CHROME_MANIFEST, "manifest.json")] + shared
    _write(OUT_CHROME, chrome_files)


if __name__ == "__main__":
    build()
