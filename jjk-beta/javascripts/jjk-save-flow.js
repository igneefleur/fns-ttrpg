/* Alignement de la confirmation Compact JJK sur le comportement Outward.
 * Un ID encore absent après 10 s est un retard de confirmation, pas une preuve
 * que l'écriture a échoué : l'opération reste dans pending et sera renvoyée.
 * Outward conserve cette information sans convertir `lost` en bandeau d'échec.
 */
(function (root) {
  "use strict";
  var compact = root.JjkSync && root.JjkSync.Compact;
  var Session = compact && compact.Session;
  var proto = Session && Session.prototype;
  if (!proto || typeof proto.receive !== "function" || proto.receive.__jjkOutwardWaitStatus) return;

  var receive = proto.receive;
  function receiveAvecAttente(attrs, verified) {
    var result = receive.call(this, attrs, verified);
    if (result && result.lost && this.pending && Object.keys(this.pending).length) {
      // La saisie n'est ni effacée ni confirmée : seul le faux verdict fatal
      // est retiré. actualiseStatutEnregistrement() affiche « en attente »
      // jusqu'à ce que la relecture Roll20 retrouve réellement l'ID.
      result.confirmationEnRetard = true;
      result.lost = false;
    }
    return result;
  }
  receiveAvecAttente.__jjkOutwardWaitStatus = true;
  proto.receive = receiveAvecAttente;
})(typeof window === "object" ? window : this);
