"""Signe l'extension Firefox JJK via l'API de signature de Mozilla (AMO).

Un .xpi SIGNÉ s'installe DÉFINITIVEMENT sur tout Firefox (double-clic ou
« Ouvrir avec Firefox ») : plus de rechargement à chaque session. Le canal est
« unlisted » : l'extension n'est PAS publiée sur addons.mozilla.org, Mozilla ne
fait que la valider et la signer ; la distribution reste le site.

Prérequis :
  1. `mkdocs build` puis `python scripts/build_extension.py` (le .xpi à signer) ;
  2. les clés API du compte Firefox (https://addons.mozilla.org/fr/developers/addon/api/key/),
     dans les variables d'environnement AMO_JWT_ISSUER et AMO_JWT_SECRET.

    python scripts/sign_extension.py

Le script téléverse le .xpi, attend la validation et la signature (~1 min),
télécharge le .xpi signé PAR-DESSUS docs/download/jjk-roll20-firefox.xpi, et met
à jour docs/download/updates.json (mise à jour AUTOMATIQUE : le manifest porte
update_url -> ce fichier ; Firefox y lit la dernière version et va la chercher
sur le site tout seul).

Chaque signature exige une VERSION NEUVE : monter "version" dans les deux
manifests (extension/firefox/ et extension/chrome/) avant de re-signer.
"""
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
FF_MANIFEST = ROOT / "extension" / "firefox" / "manifest.json"
XPI = ROOT / "docs" / "download" / "jjk-roll20-firefox.xpi"
UPDATES = ROOT / "docs" / "download" / "updates.json"
XPI_URL = "https://igneefleur.github.io/HxH-Regles-JDR/jjk/download/jjk-roll20-firefox.xpi"
AMO = "https://addons.mozilla.org"


def jwt_token(issuer, secret):
    """JWT HS256 signé à la main (aucune dépendance) — format exigé par l'API AMO."""
    def b64(d):
        return base64.urlsafe_b64encode(d).rstrip(b"=")
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    now = int(time.time())
    payload = b64(json.dumps({
        "iss": issuer, "jti": str(uuid.uuid4()), "iat": now - 5, "exp": now + 300,
    }).encode())
    signing = header + b"." + payload
    sig = b64(hmac.new(secret.encode(), signing, hashlib.sha256).digest())
    return (signing + b"." + sig).decode()


def auth(issuer, secret):
    return {"Authorization": "JWT " + jwt_token(issuer, secret)}


def main():
    issuer = os.environ.get("AMO_JWT_ISSUER")
    secret = os.environ.get("AMO_JWT_SECRET")
    if not issuer or not secret:
        sys.exit("Clés absentes : définir AMO_JWT_ISSUER et AMO_JWT_SECRET "
                 "(https://addons.mozilla.org/fr/developers/addon/api/key/).")
    if not XPI.exists():
        sys.exit(f"{XPI} absent : lancer d'abord mkdocs build + scripts/build_extension.py.")

    manifest = json.loads(FF_MANIFEST.read_text(encoding="utf-8"))
    guid = manifest["browser_specific_settings"]["gecko"]["id"]
    version = manifest["version"]
    url = f"{AMO}/api/v5/addons/{guid}/versions/{version}/"
    print(f"[signature] {guid} v{version} — téléversement ({XPI.stat().st_size} octets)…")

    with XPI.open("rb") as fh:
        r = requests.put(url, headers=auth(issuer, secret),
                         files={"upload": ("jjk-roll20-firefox.xpi", fh, "application/x-xpinstall")},
                         data={"channel": "unlisted"}, timeout=120)
    if r.status_code == 409:
        sys.exit(f"La version {version} existe déjà sur AMO : monter \"version\" dans les "
                 "deux manifests, re-packer (build_extension.py) puis relancer.")
    if r.status_code not in (200, 201, 202):
        sys.exit(f"Téléversement refusé (HTTP {r.status_code}) : {r.text[:800]}")

    # attente de la validation puis de la signature
    print("[signature] validation Mozilla en cours…")
    signed_url = None
    for _ in range(60):                      # ~5 min max
        time.sleep(5)
        st = requests.get(url, headers=auth(issuer, secret), timeout=60)
        if st.status_code != 200:
            continue
        s = st.json()
        if not s.get("processed"):
            continue
        if not s.get("valid"):
            msgs = s.get("validation_results", {}).get("messages", [])
            errs = [m.get("message") for m in msgs if m.get("type") == "error"]
            sys.exit("Validation refusée : " + " | ".join(errs[:5]))
        files = s.get("files") or []
        if files and files[0].get("signed"):
            signed_url = files[0]["download_url"]
            break
        print("  … validée, signature en attente")
    if not signed_url:
        sys.exit("Signature toujours absente après 5 min : relancer plus tard, "
                 "le téléversement est acquis (le script reprendra au même point).")

    print(f"[signature] téléchargement du .xpi signé : {signed_url}")
    dl = requests.get(signed_url, headers=auth(issuer, secret), timeout=120)
    dl.raise_for_status()
    XPI.write_bytes(dl.content)
    print(f"[signature] {XPI.relative_to(ROOT)} remplacé par la version SIGNÉE "
          f"({len(dl.content)} octets)")

    UPDATES.write_text(json.dumps({
        "addons": {
            guid: {
                "updates": [
                    {"version": version, "update_link": XPI_URL,
                     "browser_specific_settings": {"gecko": {"strict_min_version": "109.0"}}}
                ]
            }
        }
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[signature] {UPDATES.relative_to(ROOT)} mis à jour (v{version}) — "
          "les Firefox installés se mettront à jour tout seuls depuis le site.")


if __name__ == "__main__":
    main()
