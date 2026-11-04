#!/usr/bin/env python3
"""Publie le paquet JJK beta sur le canal public seulement s'il est plus récent.

L'extension Firefox pointe volontairement vers /jjk/download/updates.json,
quel que soit le mode stable/beta. Le site beta doit donc y recopier son paquet
signé lorsqu'il dépasse effectivement celui déjà publié. Comparer les versions
et empreintes empêche une branche beta en retard de faire reculer le canal public.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

REMOTE_STATE_URL = (
    "https://igneefleur.github.io/fns-ttrpg/jjk/download/ext-signed.json"
)
PUBLIC_XPI_URL = (
    "https://igneefleur.github.io/fns-ttrpg/jjk/download/jjk-roll20-firefox.xpi"
)


def version_tuple(value: object) -> tuple[int, int, int, int]:
    text = str(value or "")
    if not re.fullmatch(r"\d+(?:\.\d+){2,3}", text):
        raise ValueError(f"version d'extension invalide : {text!r}")
    parts = [int(part) for part in text.split(".")]
    return tuple((parts + [0, 0, 0, 0])[:4])  # type: ignore[return-value]


def read_json(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"JSON invalide : {path}")
    return data


def fetch_remote(url: str) -> dict:
    # Le paramètre évite qu'un cache intermédiaire donne une ancienne empreinte.
    separator = "&" if "?" in url else "?"
    request = urllib.request.Request(
        url + separator + "_=" + str(os.getpid()),
        headers={"Cache-Control": "no-cache", "Pragma": "no-cache"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError("le manifeste signé public n'est pas un objet JSON")
    return data


def verify_local_package(download_dir: Path, version: str) -> None:
    state = read_json(download_dir / "ext-signed.json")
    if state.get("version") != version:
        raise ValueError("la version du paquet signé et de son empreinte divergent")
    digest = state.get("hash")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise ValueError("empreinte du paquet signé absente ou invalide")

    updates = read_json(download_dir / "updates.json")
    try:
        addon = updates["addons"]["jjk-roll20@igneefleur"]["updates"][0]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("entrée Firefox absente de updates.json") from exc
    if addon.get("version") != version:
        raise ValueError("updates.json n'annonce pas la version de l'empreinte signée")
    if addon.get("update_link") != PUBLIC_XPI_URL:
        raise ValueError("updates.json ne pointe pas vers l'URL publique stable")

    xpi = download_dir / "jjk-roll20-firefox.xpi"
    if not xpi.is_file():
        raise ValueError("paquet Firefox signé absent")
    try:
        with zipfile.ZipFile(xpi) as archive:
            names = archive.namelist()
            if not any(name.startswith("META-INF/") for name in names):
                raise ValueError("le paquet Firefox n'a pas de signature Mozilla")
            manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
    except (zipfile.BadZipFile, KeyError, json.JSONDecodeError) as exc:
        raise ValueError(f"paquet Firefox illisible : {exc}") from exc
    if manifest.get("version") != version:
        raise ValueError("la version du manifeste dans le XPI ne correspond pas à l'empreinte")


def set_output(value: bool) -> None:
    line = f"publish={'true' if value else 'false'}\n"
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as stream:
            stream.write(line)
    else:
        print(line, end="")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, default=Path("site/download"))
    parser.add_argument("--remote-url", default=REMOTE_STATE_URL)
    parser.add_argument("--remote-file", type=Path, help="fixture JSON hors ligne pour les tests")
    args = parser.parse_args()

    try:
        local = read_json(args.site / "ext-signed.json")
        remote = read_json(args.remote_file) if args.remote_file else fetch_remote(args.remote_url)
        local_version = str(local.get("version") or "")
        remote_version = str(remote.get("version") or "")
        local_rank = version_tuple(local_version)
        remote_rank = version_tuple(remote_version)
        local_hash = local.get("hash")
        remote_hash = remote.get("hash")
        if not isinstance(local_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", local_hash):
            raise ValueError("empreinte signée beta absente ou invalide")
        if not isinstance(remote_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", remote_hash):
            raise ValueError("empreinte signée publique absente ou invalide")

        if local_rank < remote_rank:
            print(f"[publication-extension] beta v{local_version} < public v{remote_version} : copie refusée")
            set_output(False)
            return 0
        if local_rank == remote_rank:
            if local_hash != remote_hash:
                raise ValueError(
                    f"même version v{local_version}, mais empreintes différentes : publication refusée"
                )
            print(f"[publication-extension] public déjà à jour : v{remote_version}")
            set_output(False)
            return 0

        verify_local_package(args.site, local_version)
        print(
            f"[publication-extension] publication autorisée : "
            f"v{remote_version} -> v{local_version} (XPI signé et liens vérifiés)"
        )
        set_output(True)
        return 0
    except Exception as exc:
        print(f"::error title=Publication de l'extension JJK impossible::{exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
