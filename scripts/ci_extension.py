"""Re-signature AUTOMATIQUE de l'extension en CI : rien à faire au push.

Appelé par le workflow de la branche jjk après `mkdocs build`. L'extension est
une COQUILLE (la fiche est servie par le site via roll20-fiche.html) : les
évolutions de la fiche ne passent PLUS par ici, seuls les changements de la
coquille elle-même déclenchent une signature. Logique :

  1. Calcule l'EMPREINTE du contenu de l'extension (tous les fichiers packagés,
     champ "version" des manifests neutralisé : la version ne compte pas).
  2. La compare à docs/download/ext-signed.json (l'empreinte du dernier .xpi
     SIGNÉ, committée). Identique -> rien à faire, le .xpi signé committé reste
     bon. Différente -> montée de version automatique (2.0.N -> 2.0.N+1) dans
     les DEUX manifests, empaquetage, signature Mozilla (scripts/
     sign_extension.py, clés dans les secrets GitHub AMO_JWT_ISSUER /
     AMO_JWT_SECRET), écriture de updates.json et de la nouvelle empreinte.
  3. Le workflow committe alors ces fichiers sur la branche ([skip ci]) et
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


def xpi_signe():
    """True si docs/download/jjk-roll20-firefox.xpi est un binaire signé Mozilla."""
    import zipfile
    try:
        with zipfile.ZipFile(sign_extension.XPI) as z:
            return any(n.startswith("META-INF/") for n in z.namelist())
    except Exception:
        return False


def repare_xpi_signe(issuer, secret):
    """Garde-fou (vécu le 2026-08-01) : un commit local peut écraser le .xpi
    signé par un pack de développement NON signé — le site distribue alors un
    fichier que Firefox refuse d'installer, sans que rien n'échoue en CI. Si le
    .xpi committé n'est pas signé, on re-télécharge le dernier binaire signé
    depuis AMO (les GET ne subissent pas le quota de soumission) et on réaligne
    updates.json ; le commit de retour du workflow les republie."""
    if xpi_signe():
        return
    print("[ci-extension] ALERTE : le .xpi committé n'est PAS signé (écrasé par "
          "un pack local ?) — récupération du binaire signé depuis AMO…")
    if not issuer or not secret:
        print("[ci-extension] clés AMO absentes : réparation impossible ici.")
        return
    try:
        import requests
        amo = sign_extension.Amo(issuer, secret)
        manifest = json.loads(MANIFESTS[0].read_text(encoding="utf-8"))
        gecko = manifest["browser_specific_settings"]["gecko"]
        r = amo.get(f"/addons/addon/{gecko['id']}/versions/?filter=all_with_unlisted&page_size=10")
        for v in r.json().get("results", []):
            f = v.get("file") or {}
            if f.get("status") != "public":
                continue
            dl = requests.get(f["url"], headers=amo.h(), timeout=120)
            dl.raise_for_status()
            sign_extension.XPI.write_bytes(dl.content)
            sign_extension.UPDATES.write_text(json.dumps({
                "addons": {gecko["id"]: {"updates": [
                    {"version": v["version"], "update_link": sign_extension.XPI_URL,
                     "browser_specific_settings": {"gecko": {
                         "strict_min_version": gecko.get("strict_min_version", "109.0")}}}
                ]}}
            }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[ci-extension] binaire signé v{v['version']} restauré depuis AMO "
                  "(updates.json réaligné)")
            return
        print("[ci-extension] aucune version signée publique trouvée chez AMO.")
    except Exception as e:
        print(f"[ci-extension] réparation impossible : {e}")


def main():
    issuer = os.environ.get("AMO_JWT_ISSUER")
    secret = os.environ.get("AMO_JWT_SECRET")

    state = {}
    if STATE.exists():
        state = json.loads(STATE.read_text(encoding="utf-8"))
    current = content_hash()
    if current == state.get("hash"):
        print(f"[ci-extension] contenu inchangé (v{state.get('version')} signée reste bonne) : rien à faire")
        # plus aucune synchro depuis le site (coquille) : on remet juste les
        # archives committées à l'exact au cas où un pack de développement
        # local les aurait écrasées
        subprocess.run(["git", "checkout", "--",
                        "docs/download/jjk-roll20-firefox.xpi",
                        "docs/download/jjk-roll20-chrome.zip"],
                       cwd=ROOT, check=False)
        repare_xpi_signe(issuer, secret)
        return

    if not issuer or not secret:
        sys.exit("[ci-extension] l'extension a changé mais les clés AMO manquent : "
                 "ajouter les secrets AMO_JWT_ISSUER et AMO_JWT_SECRET au dépôt "
                 "(Settings -> Secrets and variables -> Actions).")

    manifest = json.loads(MANIFESTS[0].read_text(encoding="utf-8"))
    # base = max(dernière signée, version des manifests) : un saut de version
    # posé à la main dans les manifests (ex. 1.0.8 -> 2.0.0 pour la coquille)
    # n'est jamais rabaissé par l'empreinte de l'ancienne série.
    base = max(state.get("version", "1.0.0"), manifest["version"], key=parse_ver)
    guid = manifest["browser_specific_settings"]["gecko"]["id"]
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
        subprocess.run(["git", "checkout", "--",
                        "docs/download/jjk-roll20-firefox.xpi",
                        "docs/download/jjk-roll20-chrome.zip",
                        "docs/download/updates.json",
                        "extension/firefox/manifest.json",
                        "extension/chrome/manifest.json"],
                       cwd=ROOT, check=False)
        repare_xpi_signe(issuer, secret)
        deja_signee = STATE.exists() and xpi_signe()
        # Panne DURABLE (pas un simple quota) : à signaler fort. AMO qui ne
        # connaît « aucune version » du guid alors qu'il refuse de le créer
        # (« Duplicate add-on ID found ») veut dire que les clés API
        # appartiennent à un compte qui ne possède PAS cet add-on : la
        # signature ne repassera jamais toute seule.
        if "quota" not in str(e) and amo_latest(guid, issuer, secret) is None:
            print("::error title=Signature JJK impossible::" + str(e) +
                  " — AMO ne montre aucune version de " + guid + " à ce compte. "
                  "Si la création répond « Duplicate add-on ID found », les secrets "
                  "AMO_JWT_ISSUER / AMO_JWT_SECRET sont ceux d'un AUTRE compte que "
                  "le propriétaire de l'add-on : reposer les clés du bon compte "
                  "(ou transférer l'add-on) puis relancer le workflow.")
            # Le site NE DOIT PAS rester bloqué pour autant : tant qu'une version
            # signée est distribuée, on déploie et on retentera au prochain run.
            # On ne casse le run que si rien n'a jamais été signé (sinon la panne
            # d'un add-on emporterait la publication des règles et de la fiche).
            if not deja_signee:
                raise
        else:
            print(f"::warning title=Extension JJK non signée::{e} — le site "
                  f"distribue encore la v{state.get('version', '?')} signée.")
        print(f"[ci-extension] SIGNATURE REPORTÉE ({e}) — le site est déployé "
              f"avec les paquets signés v{state.get('version', '?')}.")
        return

    STATE.write_text(json.dumps({"version": new_version, "hash": current},
                                indent=2) + "\n", encoding="utf-8")
    print(f"[ci-extension] v{new_version} signée et publiée ; empreinte enregistrée")


if __name__ == "__main__":
    main()
