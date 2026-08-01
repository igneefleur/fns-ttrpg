"""Re-signature AUTOMATIQUE de l'extension en CI : rien à faire au push.

Appelé par le workflow de la branche jjk après `mkdocs build`. Logique :

  1. Synchronise les fichiers générés de l'extension (jjk-creation.css/.json,
     creation-embed.js) depuis le site construit — comme build_extension.py.
  2. Calcule l'EMPREINTE du contenu de l'extension (tous les fichiers packagés,
     champ "version" des manifests neutralisé : la version ne compte pas).
  3. La compare à docs/download/ext-signed.json (l'empreinte du dernier .xpi
     SIGNÉ, committée). Identique -> rien à faire, le .xpi signé committé reste
     bon. Différente -> montée de version automatique (1.0.N -> 1.0.N+1) dans
     les DEUX manifests, empaquetage, signature Mozilla (scripts/
     sign_extension.py, clés dans les secrets GitHub AMO_JWT_ISSUER /
     AMO_JWT_SECRET), écriture de updates.json et de la nouvelle empreinte.
  4. Le workflow committe alors ces fichiers sur la branche ([skip ci]) et
     déploie : les Firefox installés se mettent à jour tout seuls.

Utilisable aussi en local (mêmes variables d'environnement).
"""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_extension  # noqa: E402
import sign_extension   # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FF = ROOT / "extension" / "firefox"
MANIFESTS = [FF / "manifest.json", ROOT / "extension" / "chrome" / "manifest.json"]
STATE = ROOT / "docs" / "download" / "ext-signed.json"


def content_hash():
    """Empreinte du contenu packagé, indépendante du champ version des manifests."""
    h = hashlib.sha256()
    files = sorted(p for p in FF.rglob("*") if p.is_file())
    files.append(MANIFESTS[1])
    for p in files:
        h.update(str(p.relative_to(ROOT)).replace("\\", "/").encode())
        if p.name == "manifest.json":
            m = json.loads(p.read_text(encoding="utf-8"))
            m["version"] = "0"
            h.update(json.dumps(m, ensure_ascii=False, sort_keys=True).encode())
        else:
            h.update(p.read_bytes())
    return h.hexdigest()


def bump_version(old):
    parts = old.split(".")
    parts[-1] = str(int(parts[-1]) + 1)
    return ".".join(parts)


def stamp_version(version):
    for p in MANIFESTS:
        m = json.loads(p.read_text(encoding="utf-8"))
        m["version"] = version
        p.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_ver(v):
    try:
        return tuple(int(x) for x in str(v).split("."))
    except (TypeError, ValueError):
        return (0,)


def amo_latest(guid, issuer, secret):
    """Dernière version connue d'AMO (canaux confondus), ou None.

    Indispensable après un run interrompu : une version peut avoir été signée
    chez Mozilla SANS avoir jamais été recommittée ici (course de pushes,
    commit de retour refusé). La re-proposer ferait échouer tout le pipeline
    (« version already exists ») ; on repart donc toujours du maximum entre
    l'empreinte locale et ce qu'AMO connaît déjà."""
    try:
        amo = sign_extension.Amo(issuer, secret)
        r = amo.get(f"/addons/addon/{guid}/versions/?filter=all_with_unlisted&page_size=10")
        if r.status_code != 200:
            return None
        vs = [x.get("version") for x in r.json().get("results", []) if x.get("version")]
        return max(vs, key=parse_ver) if vs else None
    except Exception:
        return None


def main():
    # 1. fichiers générés à jour (sans empaqueter : les archives gardent
    #    leur version committée — la SIGNÉE — si rien n'a changé)
    build_extension.sync_creation_css()
    build_extension.sync_creator_assets()

    state = {}
    if STATE.exists():
        state = json.loads(STATE.read_text(encoding="utf-8"))
    current = content_hash()
    if current == state.get("hash"):
        print(f"[ci-extension] contenu inchangé (v{state.get('version')} signée reste bonne) : rien à faire")
        # les fichiers générés re-synchronisés sont identiques byte à byte ;
        # on remet les archives committées à l'exact au cas où
        subprocess.run(["git", "checkout", "--",
                        "docs/download/jjk-roll20-firefox.xpi",
                        "docs/download/jjk-roll20-chrome.zip"],
                       cwd=ROOT, check=False)
        return

    issuer = os.environ.get("AMO_JWT_ISSUER")
    secret = os.environ.get("AMO_JWT_SECRET")
    if not issuer or not secret:
        sys.exit("[ci-extension] l'extension a changé mais les clés AMO manquent : "
                 "ajouter les secrets AMO_JWT_ISSUER et AMO_JWT_SECRET au dépôt "
                 "(Settings -> Secrets and variables -> Actions).")

    base = state.get("version", "1.0.0")
    guid = json.loads(MANIFESTS[0].read_text(encoding="utf-8"))["browser_specific_settings"]["gecko"]["id"]
    remote = amo_latest(guid, issuer, secret)
    if remote and parse_ver(remote) > parse_ver(base):
        print(f"[ci-extension] AMO connaît déjà v{remote} (run précédent interrompu) : on repart de là")
        base = remote
    new_version = bump_version(base)
    print(f"[ci-extension] contenu modifié : v{base} -> v{new_version}, "
          "empaquetage + signature Mozilla…")
    stamp_version(new_version)
    build_extension.build()
    try:
        sign_extension.sign(issuer, secret)
    except SystemExit as e:
        # signature impossible (quota AMO, panne…) : on restaure les paquets
        # DÉJÀ SIGNÉS pour que le site parte quand même à jour ; l'empreinte
        # n'est pas écrite, le prochain run (push ou workflow_dispatch)
        # retentera la signature.
        print(f"[ci-extension] SIGNATURE REPORTÉE ({e}) — le site est déployé "
              f"avec les paquets signés v{state.get('version', '?')}.")
        subprocess.run(["git", "checkout", "--",
                        "docs/download/jjk-roll20-firefox.xpi",
                        "docs/download/jjk-roll20-chrome.zip",
                        "docs/download/updates.json",
                        "extension/firefox/manifest.json",
                        "extension/chrome/manifest.json"],
                       cwd=ROOT, check=False)
        return

    STATE.write_text(json.dumps({"version": new_version, "hash": current},
                                indent=2) + "\n", encoding="utf-8")
    print(f"[ci-extension] v{new_version} signée et publiée ; empreinte enregistrée")


if __name__ == "__main__":
    main()
