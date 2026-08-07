/* Le numéro de chaque PARTIE de l'extension. ÉCRIT PAR
 * scripts/ci_extension.py À CHAQUE SIGNATURE : ne pas le modifier à la
 * main, la signature suivante réécrirait la retouche sans la lire.
 *
 * CE QUE DIT UN NUMÉRO : le paquet auquel cette partie a changé pour la
 * dernière fois, et rien d'autre. Un changement d'un fichier PARTAGÉ (le
 * popup, un gabarit, une icône) fait sortir un paquet neuf sans qu'aucune
 * des deux parties ne bouge : les deux gardent alors leur ancien numéro
 * pendant que le paquet avance, et c'est justement l'information utile,
 * « ces deux moitiés n'ont pas changé depuis la 3.6.0 ». Le numéro du
 * paquet, lui, est dans le manifeste, et nulle part ailleurs.
 *
 * La partie beta porte le suffixe « b », la stable jamais. Ces numéros ne
 * partent JAMAIS chez Mozilla : le manifeste, lui, n'en porte aucun, sans
 * quoi une signature faite depuis le chantier brûlerait un numéro que la
 * branche stable doit encore publier.
 *
 * ES5, global, chargé par une balise script : pas de module, pas d'import.
 * Le popup lit les clés ci-dessous sur le global PARTIES, en se gardant
 * du cas où le fichier n'a pas été chargé (typeof).
 */
var PARTIES = {
  "stable": "3.6.0.7",
  "beta": "3.6.0.7b"
};
