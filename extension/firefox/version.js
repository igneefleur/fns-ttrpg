/* Les deux vérités de version de l'extension.
 *
 * Le manifeste ne porte qu'un seul numéro, celui que voient Mozilla et Chrome,
 * et les DEUX parties voyagent dans le MÊME paquet signé : ce numéro ne dira
 * donc jamais où en est la partie de chantier. Elles se déclarent ici toutes les
 * deux, et le popup les montre côte à côte en désignant celle qui tourne.
 *
 * Le numéro suit la ligne unique du projet, « X.Y.Z » : X grosse mise à jour, Y
 * moyenne, Z correctif minime, chaque nombre de 0 à 999 avec retenue. La partie
 * de chantier suffixe « b » (« 3.6.0b ») ; la partie publiée et le manifeste,
 * jamais. Le manifeste porte en plus un QUATRIÈME nombre, qui compte ses
 * signatures pour un même X.Y.Z (« 3.6.0.1 ») : l'extension peut être re-signée
 * plusieurs fois sans que le projet, lui, ait changé de version. Ce quatrième
 * nombre ne s'écrit PAS quand il vaut zéro, et ce n'est pas une coquetterie :
 * Firefox comme Chrome complètent de zéros et tiennent « 3.6.0.0 » pour ÉGAL à
 * « 3.6.0 ». Une soumission portant le second après le premier serait refusée
 * APRÈS validation, quota du jour consommé pour rien.
 *
 * Ce fichier n'est PAS un manifeste, et cela compte : la chaîne de signature
 * neutralise la clé « version » de tout fichier nommé manifest.json avant de
 * calculer l'empreinte du paquet. Un numéro rangé là serait invisible, et on
 * pourrait le monter dix fois sans qu'aucune signature ne parte. Ici, le monter
 * change l'empreinte, donc déclenche bien une nouvelle signature.
 *
 * PARTAGÉ par les deux parties : ne pas le recopier dans stable/ ni dans beta/.
 * Chargé par popup/popup.html seulement, qui est la seule surface où ces
 * numéros se lisent. */
// CE QUE CHAQUE PARTIE VISE, et non ce que le paquet vaut. La partie publiée
// parle au site stable, la partie de chantier au site de chantier : ces deux
// sites n'avancent pas ensemble, et c'est tout l'intérêt de les nommer ici.
// Écrire le même numéro des deux côtés reviendrait à dire que le chantier est
// déjà publié, ce qui est faux tant que la fusion n'a pas eu lieu.
//
// Le numéro du PAQUET, lui, ne se recopie pas ici : le popup le lit dans le
// manifeste par runtime.getManifest(), seule source qui ne puisse pas mentir.
var VERSIONS = {
  stable: "3.4.0",
  beta: "3.6.0b"
};
