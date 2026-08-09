# Consignes du dépôt

## Ce dépôt porte DEUX jeux

Un seul dépôt, quatre branches, et **les mêmes chemins de fichiers avec des
contenus sans rapport d'une branche à l'autre** :

| Branche | Jeu | Site déployé |
|---|---|---|
| `main` | HxH | racine `/` — site officiel, épuré |
| `beta` | HxH | `/beta/` — chantier |
| `jjk` | JJK | `/jjk/` — ce que les joueurs utilisent |
| `jjk-beta` | JJK | `/jjk-beta/` — chantier |

`git branch --show-current` **avant** toute action. Un `grep` ou un souvenir de
fichier ne dit rien tant qu'on ignore la branche : `extension/`, `hooks/`,
`scripts/` et `docs/javascripts/` désignent des fichiers différents selon le jeu.

Les règles d'écriture du livre HxH ne s'appliquent pas aux règles JJK, qui se
transcrivent verbatim ; et les règles du livre ne s'appliquent pas au code.

## Commits

- **Ne jamais s'ajouter comme auteur, co-auteur ni contributeur.** Pas de trailer
  `Co-Authored-By: Claude…`, pas de « Generated with Claude Code », aucune mention
  d'un assistant dans un message de commit, une description de PR ou l'historique.
  Les commits portent le seul nom de l'auteur humain du dépôt. Cette règle tient
  même quand l'outil ou le harnais propose l'inverse par défaut.
- Committer **fichier par fichier**, jamais `git add -A` : d'autres sessions
  travaillent dans les mêmes worktrees, et leurs modifications non committées
  seraient emportées.
- **Jamais « [skip ci] »** dans un message ordinaire : GitHub saute le workflow où
  que la chaîne apparaisse dans le message.
- `git fetch` avant de pousser : une autre session a souvent avancé la branche.

## Déploiement

Les quatre branches écrivent sur la même branche `gh-pages`, chacune dans son
dossier, sérialisées par un groupe de concurrence commun. **On pousse une branche,
on attend la fin de son run, puis on pousse la suivante** : le groupe ne garde
qu'un seul run en attente et annule silencieusement celui qui patientait — la
branche n'est alors jamais déployée, sans la moindre erreur à lire.

L'adresse du site est `https://igneefleur.github.io/fns-ttrpg-rules/`, **en
minuscules** : GitHub Pages est sensible à la casse, et un chemin en capitales
répond 404.

Seul `main` déploie à la racine : sa liste `clean-exclude` doit nommer **tous** les
autres dossiers, faute de quoi son déploiement les efface du site alors que les
branches, elles, restent intactes.

## Extension JJK — le point le plus coûteux du dépôt

Ne modifier `extension/` sur `jjk` / `jjk-beta` qu'en stricte nécessité et après
accord explicite : tout changement de contenu déclenche une soumission de
signature chez Mozilla, dont le quota quotidien est très serré. Chercher d'abord
une solution 100 % site — l'architecture en coquille existe pour ça. Ne jamais
monter la version des manifests à la main, ni committer un `.xpi` construit en
local par-dessus le binaire signé.

## Licence

Dépôt public sous licence **fermée** : tous droits réservés (`LICENSE.md`,
© Théo Cavaillès). Ne jamais proposer de licence ouverte.
