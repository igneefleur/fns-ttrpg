"""Les liens vers une page de règles RETENUE deviennent du texte.

Le site publié ne construit pas toutes les pages de règles : celles que
`exclude_docs` nomme dans mkdocs.yml restent dans la branche (les hooks de la
fiche les lisent sur le disque) mais ne sont pas publiées. Une page publiée qui
les cite garderait un lien vers une page absente ; ce hook ne laisse que le mot.

Seuls les liens Markdown relatifs vers un .md exclu sont touchés : `[mot](x.md)`
et `[mot](x.md#ancre)` deviennent `mot`. Tout le reste passe tel quel.
"""
import posixpath
import re

_LIEN = re.compile(r"(?<!!)\[([^\]]+)\]\(([^)\s]+?\.md)(#[^)\s]*)?\)")
_retenues = set()


def on_files(files, config, **kwargs):
    _retenues.clear()
    for f in files:
        if f.src_uri.endswith(".md") and f.inclusion.is_excluded():
            _retenues.add(f.src_uri)
    return files


def on_page_markdown(markdown, page, config, files, **kwargs):
    if not _retenues:
        return markdown
    ici = posixpath.dirname(page.file.src_uri)

    def remplace(m):
        cible = posixpath.normpath(posixpath.join(ici, m.group(2)))
        return m.group(1) if cible in _retenues else m.group(0)

    return _LIEN.sub(remplace, markdown)
