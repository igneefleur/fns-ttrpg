#!/usr/bin/env python3
"""Aligne le manifeste de repli gelé de Roll20 sur la release publiée.

Le fichier docs/roll20-fiche.html contient un manifeste DEFAUT intégré. Il doit
porter la même release que docs/jjk-manifeste.json, sinon l'ouverture en mode
repli charge une ancienne version et le test de sécurité échoue.

Usage : python scripts/synchroniser_repli_jjk.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "jjk-manifeste.json"
HTML = ROOT / "docs" / "roll20-fiche.html"

RELEASE_PATTERN = re.compile(r'''(\brelease\s*:\s*["'])([^"']*)(["'])''')
SCHEMA_PATTERN = re.compile(r'''(\bschema\s*:\s*)(\d+)(\s*[,}])''')


def main() -> int:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        release = manifest.get("release")
        schema = manifest.get("schema")
        if not isinstance(release, str) or not re.fullmatch(r"\d+\.\d+\.\d+b?", release):
            raise ValueError("release invalide dans docs/jjk-manifeste.json")
        if not isinstance(schema, int) or isinstance(schema, bool) or schema < 1:
            raise ValueError("schema invalide dans docs/jjk-manifeste.json")

        raw = HTML.read_bytes()
        text = raw.decode("utf-8-sig")
        start = text.find("var DEFAUT = {")
        if start < 0:
            raise ValueError("manifeste DEFAUT introuvable dans docs/roll20-fiche.html")
        end = text.find("var manifesteChoisi", start)
        if end < 0:
            raise ValueError("fin du manifeste DEFAUT introuvable dans docs/roll20-fiche.html")
        before, block, after = text[:start], text[start:end], text[end:]

        release_matches = list(RELEASE_PATTERN.finditer(block))
        schema_matches = list(SCHEMA_PATTERN.finditer(block))
        if len(release_matches) != 1:
            raise ValueError(f"attendu un seul champ release dans DEFAUT, trouvé {len(release_matches)}")
        if len(schema_matches) != 1:
            raise ValueError(f"attendu un seul champ schema dans DEFAUT, trouvé {len(schema_matches)}")

        block, n_release = RELEASE_PATTERN.subn(
            lambda m: m.group(1) + release + m.group(3), block, count=1
        )
        block, n_schema = SCHEMA_PATTERN.subn(
            lambda m: m.group(1) + str(schema) + m.group(3), block, count=1
        )
        if n_release != 1 or n_schema != 1:
            raise ValueError("impossible de mettre à jour les champs release/schema du repli")

        updated = before + block + after
        if updated != text:
            # Conserver l'éventuel BOM d'origine et les fins de ligne intactes.
            bom = raw.startswith(b"\xef\xbb\xbf")
            encoded = updated.encode("utf-8")
            if bom:
                encoded = b"\xef\xbb\xbf" + encoded
            HTML.write_bytes(encoded)

        print(f"Repli Roll20 synchronisé : release {release}, schema {schema}.")
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
