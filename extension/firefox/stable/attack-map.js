/* OWD attack previews. Grid analysis adapted from Théo Cavaillès' VTTinker.
 * The only shared data is a statusmarker; drawing never writes campaign paths.
 * ES5 bridge code, with pure functions exported for regression tests. */
(function () {
  "use strict";
  var PREFIX="owd-atk-v1-", SQ=Math.sqrt(3), MAX_TAG=20000;
  function valid(d) {
    if(!d||typeof d.mirror!=="boolean"||!Number.isInteger(d.orientation)||d.orientation<0||d.orientation>5||!Array.isArray(d.path)||!d.path.length||d.path.length>1024)return false;
    return d.path.every(function(p){return Array.isArray(p)&&p.length===3&&Number.isSafeInteger(p[0])&&Number.isSafeInteger(p[1])&&Math.abs(p[0])<=1000000&&Math.abs(p[1])<=1000000&&(p[2]==="hit"||p[2]==="pass");});
  }
  function encode(d){if(!valid(d))return null;var tag=PREFIX+btoa(JSON.stringify(d)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");return tag.length<=MAX_TAG?tag:null;}
  function decode(tag){if(typeof tag!=="string"||tag.length>MAX_TAG||tag.indexOf(PREFIX)!==0)return null;try{var raw=tag.slice(PREFIX.length);if(!/^[A-Za-z0-9_-]+$/.test(raw))return null;var d=JSON.parse(atob(raw.replace(/-/g,"+").replace(/_/g,"/")));return valid(d)?d:null;}catch(e){return null;}}
  function transform(q,r,ori,mirror){var t,i;if(mirror){t=-q;r+=q;q=t;}for(i=0;i<ori;i++){t=-r;r=q+r;q=t;}return [q,r];}
  function cells(d){var out={},ordered=[];d.path.forEach(function(p){var t=transform(p[0],p[1],d.orientation,d.mirror),key=t.join(",");if(!out[key]){out[key]={q:t[0],r:t[1],type:p[2]};ordered.push(out[key]);}else if(p[2]==="hit")out[key].type="hit";});return ordered;}
  function periode(vals) {
    /* ON DÉDOUBLONNE AVANT DE TRIER, et non l'inverse.
     *
     * Les neuf mille coordonnées d'une trame hexagonale n'ont que quarante-
     * quatre valeurs distinctes en x : trier les neuf mille pour n'en garder que
     * quarante-quatre, c'est soixante fois le travail nécessaire, et ce travail
     * se paie six fois au chargement d'une partie. Un tri est en n log n ; le
     * dédoublonnage par table est en n. */
    var vus = Object.create(null), v = [], j, k;
    for (j = 0; j < vals.length; j++) {
      k = Math.round(vals[j] * 100);
      if (vus[k] === undefined) { vus[k] = 1; v.push(vals[j]); }
    }
    v.sort(function (a, b) { return a - b; });
    /* DEUX TOLÉRANCES, ET C'EST VOULU. Celle du dédoublonnage est serrée — deux
     * sommets distants d'un centième sont le même point. Celle de la
     * CONCORDANCE est large : sur trente-sept périodes de 60,62, l'accumulation
     * des flottants dépasse largement le centième, et une tolérance unique
     * faisait échouer la recherche pour l'hexagone comme pour l'isométrie. La
     * période était bien là ; c'est nous qui la refusions. */
    var u = [], epsDoublon = 0.01, eps = 0.15;
    for (var i = 0; i < v.length; i++) {
      if (!u.length || v[i] - u[u.length - 1] > epsDoublon) { u.push(v[i]); }
    }
    if (u.length < 4) { return null; }
    var etendue = u[u.length - 1] - u[0];

    /* LES CANDIDATES NE S'ANCRENT PAS SUR LA PREMIÈRE VALEUR. C'était l'erreur :
     * la plus petite valeur est un sommet de BORDURE, rogné au bord de la page
     * et hors trame — toutes les périodes qu'on en tirait étaient décalées, et
     * la vraie n'était jamais essayée. On part donc de plusieurs origines, et
     * on garde la plus petite période qui tienne. */
    var cands = [];
    for (var o = 0; o < Math.min(4, u.length); o++) {
      for (var kk = o + 1; kk < Math.min(o + 40, u.length); kk++) {
        var c = u[kk] - u[o];
        if (c > eps) { cands.push(c); }
      }
    }
    cands.sort(function (a, b) { return a - b; });

    for (var k = 0; k < cands.length; k++) {
      var p = cands[k];
      if (k && p - cands[k - 1] < eps) { continue; }   // déjà essayée
      /* UNE CONCORDANCE TRÈS MAJORITAIRE, PAS TOTALE. Exiger que TOUTE valeur
       * décalée retombe sur une autre paraissait rigoureux ; c'était trop
       * strict, et la recherche échouait pour l'hexagone comme pour l'isométrie
       * alors que la période existait. La raison : la grille est ROGNÉE aux
       * bords de la page, et les rangées partielles de bordure ne se répètent
       * pas. Un seul de ces sommets suffisait à faire rejeter la bonne période.
       *
       * On demande donc quatre-vingt-dix pour cent. Et on borne la période à la
       * MOITIÉ de l'étendue plutôt que d'exiger un nombre d'appariements : une
       * période doit se répéter au moins deux fois pour en être une, et c'est
       * la seule formulation qui vaille aussi pour les grilles courtes — celle
       * de l'isométrie n'a que cent soixante-quinze sommets. */
      var vus = 0, apparies = 0, somme = 0;
      for (var j = 0; j < u.length; j++) {
        var cible = u[j] + p;
        if (cible > u[u.length - 1] - eps) { continue; }
        vus++;
        for (var q = j + 1; q < u.length; q++) {
          if (Math.abs(u[q] - cible) <= eps) {
            apparies++;
            somme += u[q] - u[j];   // cet écart vaut UNE période, et une seule
            break;
          }
          if (u[q] > cible + eps) { break; }
        }
      }
      if (vus >= 2 && apparies >= vus * 0.9 && p <= etendue / 2 + eps) {
        /* AFFINAGE PAR LA MOYENNE DES ÉCARTS APPARIÉS.
         *
         * La version d'avant prenait la distance entre le premier et le dernier
         * sommet appariés, divisée par le nombre de périodes qui les séparent.
         * C'était faux, et le chiffre l'a dit : 118,135 relevé pour « hexr » là
         * où le réseau vaut 121,2436. La raison — cette distance ne mesure des
         * périodes entières que si ses deux extrémités appartiennent à la MÊME
         * classe de résidu, et une trame hexagonale en a deux, séparées d'un
         * tiers de période. L'arrondi tombait alors sur le mauvais entier, et
         * rendait une valeur qui n'est période de rien.
         *
         * On moyenne donc les écarts appariés eux-mêmes : chacun vaut une
         * période et une seule, quelle que soit la classe d'où il part. L'erreur
         * est divisée par la racine de leur nombre, au lieu d'être remplacée par
         * une autre. */
        return somme / apparies;
      }
    }
    return null;
  }
  function segmentsDe(m) {
    var pos = null, idx = null;
    try { pos = m.getVerticesData("position"); idx = m.getIndices(); } catch (e) {}
    if (!pos || !pos.length) { return null; }
    if (!idx || !idx.length) {
      idx = [];
      for (var n = 0; n < pos.length / 3; n++) { idx.push(n); }
    }
    var seg = [], degeneres = 0, k, a, b, x0, y0, x1, y1, t;
    for (k = 0; k < Math.floor(idx.length / 2); k++) {
      a = idx[2 * k] * 3; b = idx[2 * k + 1] * 3;
      x0 = pos[a]; y0 = pos[a + 1]; x1 = pos[b]; y1 = pos[b + 1];
      if (x0 === x1 && y0 === y1) { degeneres++; continue; }
      if (x1 < x0 || (x1 === x0 && y1 < y0)) { t = x0; x0 = x1; x1 = t; t = y0; y0 = y1; y1 = t; }
      seg.push([x0, y0, x1, y1]);
    }
    return { seg: seg, z: pos[2], degeneres: degeneres };
  }
  function boiteDe(seg) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, i, s;
    for (i = 0; i < seg.length; i++) {
      s = seg[i];
      x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]);
      y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]);
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function distHex(px, py, w, h, ox, oy, plat) {
    var qx = px - ox, qy = py - oy, t;
    if (plat) { t = qx; qx = qy; qy = -t; }
    var ax = w, ay = 2 * h;
    var c1x = Math.floor(qx / ax + 0.5) * ax, c1y = Math.floor(qy / ay + 0.5) * ay;
    var c2x = Math.floor((qx - ax / 2) / ax + 0.5) * ax + ax / 2;
    var c2y = Math.floor((qy - ay / 2) / ay + 0.5) * ay + ay / 2;
    var d1x = qx - c1x, d1y = qy - c1y, d2x = qx - c2x, d2y = qy - c2y;
    var rx, ry;
    if (d1x * d1x + d1y * d1y < d2x * d2x + d2y * d2y) { rx = d1x; ry = d1y; }
    else { rx = d2x; ry = d2y; }
    var m = Math.max(Math.abs(rx),
                     Math.max(Math.abs(rx * 0.5 + ry * 0.8660254),
                              Math.abs(rx * -0.5 + ry * 0.8660254)));
    return Math.abs(m - w / 2);
  }
  function reseauHexagones(g, bb, px, py) {
    // Sommet pointu ou plat : le rapport des deux périodes le dit, et il vaut
    // racine de trois dans les deux cas — c'est lequel divise l'autre qui change.
    var w, h, plat;
    if (Math.abs(py / px - 1.7320508) < 0.02) { plat = false; w = 2 * px; h = py; }
    else if (Math.abs(px / py - 1.7320508) < 0.02) { plat = true; w = 2 * py; h = px; }
    else { return null; }   // ce n'est pas un pavage hexagonal régulier

    // Un échantillon de points qui sont TOUS sur un bord : sommets et milieux.
    var pts = [], i, s;
    var saut = Math.max(1, Math.floor(g.seg.length / 150));
    for (i = 0; i < g.seg.length; i += saut) {
      s = g.seg[i];
      if (s[0] <= bb.x0 + 1 || s[2] >= bb.x1 - 1 ||
          Math.min(s[1], s[3]) <= bb.y0 + 1 || Math.max(s[1], s[3]) >= bb.y1 - 1) { continue; }
      pts.push(s[0], s[1], (s[0] + s[2]) / 2, (s[1] + s[3]) / 2);
    }
    if (pts.length < 40) { return null; }

    function erreur(ox, oy) {
      var e = 0, k;
      for (k = 0; k < pts.length; k += 2) { e += distHex(pts[k], pts[k + 1], w, h, ox, oy, plat); }
      return e / (pts.length / 2);
    }

    /* LA PHASE NE SE CHERCHE PAS, ELLE SE DÉDUIT — et c'est six essais au lieu
     * de quatre cent quarante-huit.
     *
     * On la trouvait par balayage : seize par seize sur une maille, puis trois
     * resserrements. Ça marchait, et c'était cinq millisecondes sur les onze
     * que coûtait une pose — le poste le plus lourd de tout le module, chronomètre
     * en main.
     *
     * Or la phase n'a rien de continu. Tout sommet de la trame est un sommet
     * d'hexagone, donc son centre est à l'UNE DES SIX positions du sommet
     * correspondant. On prend un sommet intérieur, on essaie les six, on garde
     * le meilleur. Le résidu se juge ensuite comme avant : si aucun des six ne
     * tombe juste, le modèle est faux et on le dit. */
    var R = w / Math.sqrt(3);
    var offsets = [[0, R], [-w / 2, R / 2], [-w / 2, -R / 2],
                   [0, -R], [w / 2, -R / 2], [w / 2, R / 2]];
    // Le repère du calcul est celui de distHex, qui tourne d'un quart de tour
    // pour les sommets plats. On y amène le sommet de référence, et on ramènera
    // l'origine trouvée dans le repère d'origine.
    var vx = pts[0], vy = pts[1], t3;
    if (plat) { t3 = vx; vx = vy; vy = -t3; }
    var ox = 0, oy = 0, best = Infinity, k2, cx, cy, e;
    for (k2 = 0; k2 < 6; k2++) {
      cx = vx - offsets[k2][0];
      cy = vy - offsets[k2][1];
      // Retour dans le repère d'entrée : distHex refera la rotation lui-même.
      var rx = plat ? -cy : cx, ry = plat ? cx : cy;
      e = erreur(rx, ry);
      if (e < best) { best = e; ox = rx; oy = ry; }
    }
    return { mode: "hexagones", taille: [w, h], origine: [ox, oy], aplati: plat,
             residu: best, w: w, h: h };
  }
  function gridFromSegments(g){if(!g||g.seg.length<20)return null;var bb=boiteDe(g.seg),xs=[],ys=[];g.seg.forEach(function(s){if(s[0]<=bb.x0+.1||s[2]>=bb.x1-.1||Math.min(s[1],s[3])<=bb.y0+.1||Math.max(s[1],s[3])>=bb.y1-.1)return;xs.push(s[0],s[2]);ys.push(s[1],s[3]);});var px=periode(xs),py=periode(ys);if(!px||!py)return null;var h=reseauHexagones(g,bb,px,py);if(!h||h.residu>.6)return null;return {flat:h.aplati,radius:h.w/SQ,origin:h.origine,residual:h.residu};}
  function basis(g,q,r){var R=g.radius;return g.flat?[R*1.5*q,R*SQ*(r+q/2)]:[R*SQ*(q+r/2),R*1.5*r];}
  function anchor(g,x,y){var R=g.radius,dx=x-g.origin[0],dy=y-g.origin[1],q,r;if(g.flat){q=dx/(R*1.5);r=dy/(R*SQ)-q/2;}else{r=dy/(R*1.5);q=dx/(R*SQ)-r/2;}var z=-q-r,Q=Math.round(q),Rr=Math.round(r),Z=Math.round(z);var dq=Math.abs(Q-q),dr=Math.abs(Rr-r),dz=Math.abs(Z-z);if(dq>dr&&dq>dz)Q=-Rr-Z;else if(dr>dz)Rr=-Q-Z;var p=basis(g,Q,Rr);return [g.origin[0]+p[0],g.origin[1]+p[1]];}
  function polygon(g,x,y){var out=[],a,i;for(i=0;i<6;i++){a=(i*60+(g.flat?0:30))*Math.PI/180;out.push([x+g.radius*.98*Math.cos(a),y+g.radius*.98*Math.sin(a)]);}return out;}
  var API={valid:valid,encode:encode,decode:decode,transform:transform,cells:cells,gridFromSegments:gridFromSegments,basis:basis,anchor:anchor,polygon:polygon};
  if(typeof module!=="undefined"&&module.exports){module.exports=API;return;}
  if(window.OwdAttackMap)return;window.OwdAttackMap=API;
  var owned=null,bindings=[],gridCache=null,sceneCache=null,legacyCanvas=null,legacyCtx=null,meshDraws={},materials={},sourceStates={},blocked={},raf=null;
  var diagnostics=window.__owdAttackMapState={grid:null,cells:[],error:null};
  function player(){return window.currentPlayer;}
  function d20(){return player()&&player().d20||window.d20;}
  function page(){try{return window.Campaign&&Campaign.activePage();}catch(e){return null;}}
  function graphics(){var p=page();return p&&p.thegraphics;}
  function get(t,k){return t&&t.get?t.get(k):t&&t.attributes&&t.attributes[k];}
  function selection(){var d=d20(),col=graphics(),out=[];try{var raw=d&&d.engine&&d.engine.tabletopSelected();(raw||[]).forEach(function(o){var t=o&&o.model||col&&col.get(o.id);if(t&&out.indexOf(t)<0)out.push(t);});}catch(e){}return out;}
  function writable(t){if(window.is_gm===true)return true;var p=player();if(!p||!p.id)return false;var who=String(get(t,'controlledby')||'');if(!who){var ch=window.Campaign&&Campaign.characters&&Campaign.characters.get(get(t,'represents'));who=String(get(ch,'controlledby')||'');}var ids=who.split(',');return ids.indexOf('all')>=0||ids.indexOf(p.id)>=0;}
  function live(d){return d&&typeof d.owner==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(d.owner)&&Number.isSafeInteger(d.expiresAt)&&d.expiresAt>Date.now()&&d.expiresAt<Date.now()+20000;}
  function tags(t){return String(get(t,'statusmarkers')||'').split(',').filter(Boolean);}
  function write(t,tag){var old=String(get(t,'statusmarkers')||''),parts=tags(t).filter(function(s){return s.indexOf('owd-atk-')!==0;});if(tag)parts.push(tag);var next=parts.join(',');if(next!==old)t.save({statusmarkers:next});}
  function clearOwned(){if(owned){var o=owned;owned=null;try{if(tags(o.token).indexOf(o.tag)>=0&&writable(o.token))o.token.save({statusmarkers:tags(o.token).filter(function(s){return s!==o.tag;}).join(',')});}catch(e){diagnostics.error=String(e.message||e);}}}
  // Called only by the existing character-bound bridge after its access checks.
  API.preview=function(source,d){
    if(!Number.isSafeInteger(d.sequence)||d.sequence<0)return;
    if(d.action==='stop'){if(owned&&owned.source===source&&owned.owner===d.owner&&d.sequence>=owned.sequence)clearOwned();sourceStates[d.owner]=Math.max(sourceStates[d.owner]||0,d.sequence);return;}
    if(!valid(d.preview)||!live(d.preview)||blocked[d.preview.owner]===d.sequence)return;
    var previous=sourceStates[d.preview.owner];if(previous&&d.sequence<previous)return;sourceStates[d.preview.owner]=d.sequence;
    if(Object.keys(sourceStates).length>200)sourceStates={};
    var selected=selection();if(selected.length!==1||!writable(selected[0])){if(owned&&owned.source===source)clearOwned();return;}
    var t=selected[0];if(get(t,'layer')!=='objects')return;
    if(owned&&owned.source===source&&owned.owner===d.preview.owner&&owned.sequence===d.sequence&&tags(owned.token).indexOf(owned.tag)<0){blocked[owned.owner]=owned.sequence;owned=null;return;}
    if(owned&&(owned.source!==source||owned.token!==t||owned.owner!==d.preview.owner||owned.sequence!==d.sequence))clearOwned();
    var tag=encode(d.preview);if(!tag)return;
    try{write(t,tag);owned={source:source,owner:d.preview.owner,sequence:d.sequence,token:t,tag:tag,page:page(),until:Date.now()+2500};}catch(e){diagnostics.error=String(e.message||e);}
  };
  function meshGrid(){var S=window.MeshScene;if(!S)return null;return (S.meshes||[]).filter(function(m){return m&&m.name==='Hex-Grid-Line-System';})[0]||null;}
  function readGrid(){var p=page(),d=d20(),S=window.MeshScene;if(!p||!get(p,'showgrid')||!/^hexr?$/.test(String(get(p,'grid_type'))))return null;
    var m=S&&meshGrid(),key=[p.id,get(p,'grid_type'),get(p,'snapping_increment'),get(p,'width'),get(p,'height')].join('|');
    if(m)key+='|'+[m.position&&m.position.x,m.position&&m.position.y,m.scaling&&m.scaling.x,m.scaling&&m.scaling.y].join('|');
    if(gridCache&&gridCache.page===p&&gridCache.mesh===m&&gridCache.key===key&&gridCache.grid)return gridCache.grid;
    var g=null;
    if(S){if(!m)return null;g=segmentsDe(m);if(g){var world=m.getWorldMatrix&&m.getWorldMatrix(),V=S.activeCamera&&S.activeCamera.position.constructor;g.seg=g.seg.map(function(s){function pt(x,y){var a=world&&V&&V.TransformCoordinates?V.TransformCoordinates(new V(x,y,0),world):{x:x+(m.position.x||0),y:y+(m.position.y||0)};return [a.x,-a.y];}var a=pt(s[0],s[1]),b=pt(s[2],s[3]);return a[0]<b[0]||a[0]===b[0]&&a[1]<=b[1]?[a[0],a[1],b[0],b[1]]:[b[0],b[1],a[0],a[1]];});}}
    else {var draw=d&&d.canvas_overlay&&d.canvas_overlay.drawGrid;if(typeof draw!=='function')return null;var c=document.createElement('canvas').getContext('2d'),seg=[],from=null;var proxy=new Proxy(c,{get:function(target,k){if(k==='moveTo')return function(x,y){var a=c.getTransform();from=[a.a*x+a.c*y+a.e,a.b*x+a.d*y+a.f];c.moveTo(x,y);};if(k==='lineTo')return function(x,y){var a=c.getTransform(),to=[a.a*x+a.c*y+a.e,a.b*x+a.d*y+a.f];if(from){seg.push(from[0]<to[0]||from[0]===to[0]&&from[1]<=to[1]?[from[0],from[1],to[0],to[1]]:[to[0],to[1],from[0],from[1]]);}from=to;c.lineTo(x,y);};if(k==='beginPath')return function(){from=null;c.beginPath();};var val=target[k];return typeof val==='function'?val.bind(target):val;},set:function(t,k,val){t[k]=val;return true;}});try{draw.call(d.canvas_overlay,proxy);g={seg:seg};}catch(e){diagnostics.error='grid: '+String(e.message||e);return null;}}
    var grid=gridFromSegments(g);gridCache={page:p,mesh:m,key:key,grid:grid};diagnostics.grid=grid;return grid;
  }
  function tokenPosition(t){var a=t.attributes||{},S=window.MeshScene;if(S){var n=S.getTransformNodeByName&&S.getTransformNodeByName(t.id+'-markers');if(!n||n.isEnabled&&!n.isEnabled())return null;var p=n.getAbsolutePosition&&n.getAbsolutePosition();if(p)return [p.x,-p.y];}
    else{var d=d20(),os=d&&d.engine&&d.engine.canvas&&d.engine.canvas.getObjects();var o=(os||[]).filter(function(o){return o.model&&o.model.id===t.id;})[0];if(!o||o.visible===false)return null;return [o.left,o.top];}return Number.isFinite(a.left)&&Number.isFinite(a.top)?[a.left,a.top]:null;}
  function disposeMeshes(){Object.keys(meshDraws).forEach(function(k){try{meshDraws[k].mesh.dispose();}catch(e){}});meshDraws={};Object.keys(materials).forEach(function(k){try{materials[k].dispose();}catch(e){}});materials={};}
  function drawScene(entries,g){var S=window.MeshScene;if(sceneCache!==S){disposeMeshes();sceneCache=S;}
    var Mesh=null,Shader=null,ref=meshGrid();(S.meshes||[]).some(function(m){if(m.constructor&&m.constructor.CreatePlane){Mesh=m.constructor;return true;}});(S.materials||[]).some(function(m){if(m.getClassName&&m.getClassName()==='ShaderMaterial'){Shader=m.constructor;return true;}});
    if(!Mesh||!Shader||!ref)return;
    var used={};entries.forEach(function(e){e.cells.forEach(function(c,i){var key=e.id+':'+i,pts=polygon(g,c.x,c.y),sig=JSON.stringify(pts)+c.type;used[key]=true;var old=meshDraws[key];if(old&&old.sig===sig)return;if(old){try{old.mesh.dispose();}catch(err){}}
      var mat=materials[c.type];if(!mat){mat=materials[c.type]=new Shader('owd-attack-'+c.type,S,{vertexSource:'precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;void main(){gl_Position=worldViewProjection*vec4(position,1.0);}',fragmentSource:'precision highp float;uniform vec4 tint;void main(){gl_FragColor=tint;}'},{attributes:['position'],uniforms:['worldViewProjection','tint']});mat.setArray4('tint',c.type==='hit'?[1,.66,.16,.48]:[1,.66,.16,.18]);mat.backFaceCulling=false;mat.alpha=.999;mat.disableDepthWrite=true;}
      var m=Mesh.CreatePlane('owd-attack-cell-'+key,1,S),positions=[c.x,-c.y,0],indices=[];pts.forEach(function(p){positions.push(p[0],-p[1],0);});for(var j=0;j<6;j++)indices.push(0,1+j,1+(j+1)%6);m.setVerticesData('position',positions);m.setIndices(indices);m.material=mat;m.position.z=(ref.position.z||9999000)-2;m.renderingGroupId=ref.renderingGroupId;m.alphaIndex=(ref.alphaIndex||0)+1;m.isPickable=false;m.alwaysSelectAsActiveMesh=true;m.computeWorldMatrix(true);if(m.refreshBoundingInfo)m.refreshBoundingInfo();meshDraws[key]={mesh:m,sig:sig};
    });});Object.keys(meshDraws).forEach(function(k){if(!used[k]){try{meshDraws[k].mesh.dispose();}catch(e){}delete meshDraws[k];}});
  }
  function removeCanvas(){if(raf)cancelAnimationFrame(raf);raf=null;if(legacyCanvas)legacyCanvas.remove();legacyCanvas=null;legacyCtx=null;}
  function drawLegacy(entries,g){var d=d20(),e=d&&d.engine,vis=document.getElementById('babylonCanvas')||e&&e.canvas&&e.canvas.lowerCanvasEl;if(!vis||!e||!(e.canvasZoom>0))return;
    if(!legacyCanvas){legacyCanvas=document.createElement('canvas');legacyCanvas.id='owd-attack-map';legacyCanvas.style.cssText='position:fixed;pointer-events:none;z-index:9';vis.parentNode.appendChild(legacyCanvas);legacyCtx=legacyCanvas.getContext('2d');}
    var rect=vis.getBoundingClientRect(),c=legacyCanvas,ctx=legacyCtx,z=e.canvasZoom,off=e.currentCanvasOffset||[0,0];if(c.width!==vis.width)c.width=vis.width;if(c.height!==vis.height)c.height=vis.height;c.style.left=rect.left+'px';c.style.top=rect.top+'px';c.style.width=rect.width+'px';c.style.height=rect.height+'px';ctx.setTransform(c.width/rect.width,0,0,c.height/rect.height,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    entries.forEach(function(en){en.cells.forEach(function(cell){var pts=polygon(g,cell.x,cell.y);ctx.beginPath();pts.forEach(function(p,i){var x=(p[0]-off[0])*z,y=(p[1]-off[1])*z;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle=cell.type==='hit'?'rgba(255,168,41,.48)':'rgba(255,168,41,.18)';ctx.fill();});});
  }
  function render(){raf=null;try{var g=readGrid(),col=graphics(),entries=[];diagnostics.grid=g;diagnostics.cells=[];if(g&&col){(col.models||[]).forEach(function(t){if(get(t,'layer')!=='objects')return;var markers=tags(t),d=null;for(var i=markers.length-1;i>=0;i--){var parsed=decode(markers[i]);if(parsed&&live(parsed)){d=parsed;break;}}if(!d)return;var pos=tokenPosition(t);if(!pos)return;var a=anchor(g,pos[0],pos[1]);var pts=cells(d).map(function(c){var p=basis(g,c.q,c.r);return {q:c.q,r:c.r,type:c.type,x:a[0]+p[0],y:a[1]+p[1]};});entries.push({id:t.id,cells:pts});});}diagnostics.cells=entries;
      if(window.MeshScene){removeCanvas();if(g)drawScene(entries,g);else disposeMeshes();}else{if(sceneCache){disposeMeshes();sceneCache=null;}if(entries.length)drawLegacy(entries,g);else removeCanvas();}
      if(entries.length)raf=requestAnimationFrame(render);
    }catch(e){diagnostics.error=String(e.stack||e);disposeMeshes();removeCanvas();}}
  var interval=setInterval(function(){try{if(owned){var s=selection();if(Date.now()>owned.until||page()!==owned.page||s.length!==1||s[0]!==owned.token||!writable(owned.token))clearOwned();}if(!raf)render();}catch(e){diagnostics.error=String(e.message||e);}},250);
  window.addEventListener('pagehide',function(){clearOwned();clearInterval(interval);disposeMeshes();removeCanvas();});
  API.clear=function(source,owner){if(owned&&owned.source===source&&(!owner||owned.owner===owner))clearOwned();};
})();
