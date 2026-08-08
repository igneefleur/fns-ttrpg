  // ---------- ce que cette copie a de propre ----------
  // MODE nomme la copie. Il voyage aussi dans le hash des coquilles (« &m=… »)
  // pour que shell-loader.js n'ait pas à relire le mode dans le stockage : une
  // seconde lecture serait une seconde course, et on a vu l'onglet annoncer
  // « Fiche JJK beta » avec la fiche stable dedans parce que l'utilisateur avait
  // basculé entre les deux lectures. Ici, la copie qui construit l'adresse dicte
  // la coquille, et il n'y a plus rien à accorder.
  //
  // LIBELLE est figé, alors qu'il se posait autrefois après coup : le stockage
  // répondait parfois APRÈS la construction de l'écran « pas encore de fiche »,
  // dont le titre restait « Fiche JJK » même en beta. Plus rien n'est construit
  // avant que le mode soit connu, le défaut disparaît de lui-même.
  var MODE = "@@partie@@";@@colonne:58@@// propre à cette copie
  var LIBELLE = "@@libelle@@";@@colonne:58@@// propre à cette copie

  // Fenêtre popout d'une fiche : la barre d'onglets vit dans le document du HAUT
  // (aucune iframe de dialogue), il faut donc y poser l'onglet nous-mêmes.
  var IS_POPOUT = IS_TOP && /^\/editor\/character\/[^/]+\//.test(location.pathname);

