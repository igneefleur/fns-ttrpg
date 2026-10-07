/* Compatibilité pour l’ancien amorceur Camp : charger seulement Monde. */
(function(){var files=['owd-sync.js','owd-monde-data.js','owd-monde.js'],i=0;function next(){if(i>=files.length)return;var s=document.createElement('script');s.src='javascripts/'+files[i++]+'?t='+Date.now();s.onload=next;document.body.appendChild(s);}next();})();
