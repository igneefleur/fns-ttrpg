"""Signe l'extension Firefox JJK via l'API de soumission de Mozilla (AMO).

Un .xpi SIGNÉ s'installe DÉFINITIVEMENT sur tout Firefox (double-clic ou
« Ouvrir avec Firefox ») : plus de rechargement à chaque session. Le canal est
« unlisted » : l'extension n'est PAS publiée sur addons.mozilla.org, Mozilla ne
fait que la valider et la signer ; la distribution reste le site.

Flux (API de soumission v5, celle de web-ext >= 7 ; l'ancienne API « signing »
en PUT répond désormais 404 pour les nouveaux add-ons) :
  1. POST /addons/upload/ (multipart, channel=unlisted) -> uuid ;
  2. attente de la validation (GET /addons/upload/{uuid}/) ;
  3. POST /addons/addon/ {version:{upload:uuid}} (création) — ou, si l'add-on
     existe déjà, POST /addons/addon/{guid}/versions/ (nouvelle version) ;
  4. attente de la signature (file.status == "public"), téléchargement du .xpi
     signé PAR-DESSUS docs/download/jjk-roll20-firefox.xpi ;
  5. mise à jour de docs/download/updates.json (mise à jour AUTOMATIQUE : le
     manifest porte update_url -> ce fichier ; Firefox y lit la dernière
     version et va la chercher sur le site tout seul).

Prérequis :
  1. `mkdocs build` puis `python scripts/build_extension.py` (le .xpi à signer) ;
  2. les clés API du compte Firefox (https://addons.mozilla.org/fr/developers/addon/api/key/),
     dans les variables d'environnement AMO_JWT_ISSUER et AMO_JWT_SECRET.

    python scripts/sign_extension.py

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
API = "https://addons.mozilla.org/api/v5"


def jwt_token(issuer, secret):
    """JWT HS256 signé à la main (aucune dépendance) — format exigé par l'API AMO."""
    def b64(d):
        return base64.urlsafe_b64encode(d).rstrip(b"=")
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    now = int(time.time())
    payload = b64(json.dumps({
        # AMO refuse toute fenêtre iat->exp au-delà de 5 min : 60 s suffisent,
        # le jeton est refabriqué à chaque appel.
        "iss": issuer, "jti": str(uuid.uuid4()), "iat": now, "exp": now + 60,
    }).encode())
    signing = header + b"." + payload
    sig = b64(hmac.new(secret.encode(), signing, hashlib.sha256).digest())
    return (signing + b"." + sig).decode()


class Amo:
    """Petit client authentifié ; le JWT expire en 5 min, on le refait à chaque appel."""

    def __init__(self, issuer, secret):
        self.issuer, self.secret = issuer, secret

    def h(self, extra=None):
        out = {"Authorization": "JWT " + jwt_token(self.issuer, self.secret)}
        if extra:
            out.update(extra)
        return out

    def get(self, path, **kw):
        return requests.get(API + path, headers=self.h(), timeout=60, **kw)

    def post(self, path, **kw):
        return requests.post(API + path, headers=self.h(kw.pop("headers", None)), timeout=120, **kw)


def upload_xpi(amo):
    print(f"[signature] téléversement de {XPI.name} ({XPI.stat().st_size} octets)…")
    with XPI.open("rb") as fh:
        r = amo.post("/addons/upload/",
                     files={"upload": ("jjk-roll20-firefox.xpi", fh, "application/x-xpinstall")},
                     data={"channel": "unlisted"})
    if r.status_code not in (200, 201, 202):
        sys.exit(f"Téléversement refusé (HTTP {r.status_code}) : {r.text[:800]}")
    return r.json()["uuid"]


def wait_validation(amo, up_uuid):
    print("[signature] validation Mozilla en cours…")
    for _ in range(60):                       # ~5 min max
        time.sleep(5)
        r = amo.get(f"/addons/upload/{up_uuid}/")
        if r.status_code != 200:
            continue
        s = r.json()
        if not s.get("processed"):
            continue
        if not s.get("valid"):
            msgs = (s.get("validation") or {}).get("messages", [])
            errs = [m.get("message") for m in msgs if m.get("type") == "error"]
            sys.exit("Validation refusée : " + " | ".join(map(str, errs[:5])))
        print("[signature] validation acquise")
        return
    sys.exit("Validation toujours en cours après 5 min : relancer plus tard.")


def create_version(amo, guid, up_uuid, version):
    # création de l'add-on (premier envoi) ; s'il existe déjà, nouvelle version
    r = amo.post("/addons/addon/", json={"version": {"upload": up_uuid}})
    if r.status_code in (200, 201, 202):
        v = r.json()["version"]
        print(f"[signature] add-on créé sur AMO (canal unlisted), version {v['version']}")
        return v["id"]
    r2 = amo.post(f"/addons/addon/{guid}/versions/", json={"upload": up_uuid})
    if r2.status_code in (200, 201, 202):
        v = r2.json()
        print(f"[signature] nouvelle version {v['version']} envoyée")
        return v["id"]
    if r2.status_code == 409 or "already exists" in r2.text:
        sys.exit(f"La version {version} existe déjà sur AMO : monter \"version\" dans les "
                 "deux manifests, re-packer (build_extension.py) puis relancer.")
    sys.exit(f"Création refusée (HTTP {r.status_code} puis {r2.status_code}) : "
             f"{r.text[:400]} | {r2.text[:400]}")


def wait_signed(amo, guid, version_id):
    print("[signature] signature en attente (revue automatique)…")
    for _ in range(120):                      # ~10 min max
        time.sleep(5)
        r = amo.get(f"/addons/addon/{guid}/versions/{version_id}/")
        if r.status_code != 200:
            continue
        f = (r.json() or {}).get("file") or {}
        if f.get("status") == "public":
            return f["url"]
        if f.get("status") == "disabled":
            sys.exit("Version désactivée par la revue : voir le tableau de bord AMO.")
    sys.exit("Fichier signé toujours absent après 10 min : la revue peut prendre plus de "
             "temps ; relancer plus tard (le téléchargement reprendra ici).")


def sign(issuer, secret):
    """Signe le .xpi courant et met à jour docs/download/ (xpi signé + updates.json)."""
    if not XPI.exists():
        sys.exit(f"{XPI} absent : lancer d'abord mkdocs build + scripts/build_extension.py.")

    manifest = json.loads(FF_MANIFEST.read_text(encoding="utf-8"))
    gecko = manifest["browser_specific_settings"]["gecko"]
    guid = gecko["id"]
    version = manifest["version"]
    amo = Amo(issuer, secret)

    up_uuid = upload_xpi(amo)
    wait_validation(amo, up_uuid)
    version_id = create_version(amo, guid, up_uuid, version)
    signed_url = wait_signed(amo, guid, version_id)

    print(f"[signature] téléchargement du .xpi signé : {signed_url}")
    dl = requests.get(signed_url, headers=amo.h(), timeout=120)
    dl.raise_for_status()
    XPI.write_bytes(dl.content)
    print(f"[signature] {XPI.relative_to(ROOT)} remplacé par la version SIGNÉE "
          f"({len(dl.content)} octets)")

    UPDATES.write_text(json.dumps({
        "addons": {
            guid: {
                "updates": [
                    {"version": version, "update_link": XPI_URL,
                     "browser_specific_settings": {"gecko": {
                         "strict_min_version": gecko.get("strict_min_version", "109.0")}}}
                ]
            }
        }
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[signature] {UPDATES.relative_to(ROOT)} mis à jour (v{version}) — "
          "les Firefox installés se mettront à jour tout seuls depuis le site.")


def main():
    issuer = os.environ.get("AMO_JWT_ISSUER")
    secret = os.environ.get("AMO_JWT_SECRET")
    if not issuer or not secret:
        sys.exit("Clés absentes : définir AMO_JWT_ISSUER et AMO_JWT_SECRET "
                 "(https://addons.mozilla.org/fr/developers/addon/api/key/).")
    sign(issuer, secret)


if __name__ == "__main__":
    main()
