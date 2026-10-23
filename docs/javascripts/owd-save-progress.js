/* Contours d’enregistrement : mémoire de la vue, jamais un attribut Roll20. */
(function(root){
  'use strict';
  function Tracker(now){this.now=now||Date.now;this.values=null;this.records={};this.seen={};this.confirmed={};this.serial=0;}
  Tracker.prototype.capture=function(values,pending,active){
    var self=this,old=this.values,ids=Object.keys(pending||{}),fresh=ids.filter(function(id){return !self.seen[id];});
    this.values=values;this.seen=Object.assign({},pending);
    if(!old||!active||!ids.length)return;
    // Une opération non envoyée peut être remplacée par capture(). Les modules
    // calculés dont la valeur reste identique suivent son nouvel identifiant,
    // sans redémarrer leur contour ni attendre un identifiant devenu caduc.
    if(fresh.length)Object.keys(this.records).forEach(function(k){var r=self.records[k];
      if(r.phase!=='pending'||!r.ids.some(function(id){return !pending[id]&&!self.confirmed[id];}))return;
      r.ids=r.ids.filter(function(id){return !!pending[id]||!!self.confirmed[id];});
      fresh.forEach(function(id){if(r.ids.indexOf(id)<0)r.ids.push(id);});
    });
    Object.keys(values).concat(Object.keys(old).filter(function(k){return !(k in values);})).forEach(function(k){
      if(old[k]===values[k])return;
      var before=self.records[k],deps=before?before.ids.filter(function(id){return !!pending[id];}):[];
      (fresh.length?fresh:ids).forEach(function(id){if(deps.indexOf(id)<0)deps.push(id);});
      self.records[k]={revision:++self.serial,ids:deps,start:self.now(),phase:'pending'};
    });
  };
  Tracker.prototype.confirm=function(remote,canFinish){
    if(!remote||remote.incomplete)return;
    this.confirmed=remote.ids;
    var self=this;Object.keys(this.records).forEach(function(k){var r=self.records[k];
      if(r.phase==='pending'&&r.ids.every(function(id){return !!remote.ids[id];})&&(!canFinish||canFinish(k))){r.phase='finishing';r.finish=self.now();}
    });
  };
  function progress(ms){if(ms<=12000)return .75*Math.max(0,ms)/12000;if(ms<=60000)return .75+.20*(ms-12000)/48000;return Math.min(.98,.95+.03*(ms-60000)/60000);}
  function Painter(tracker,doc){this.tracker=tracker;this.doc=doc;this.nodes={};this.timer=null;this.observer=typeof ResizeObserver==='function'?new ResizeObserver(this.resize.bind(this)):null;}
  Painter.prototype.resize=function(entries){var self=this;entries.forEach(function(e){Object.keys(self.nodes).forEach(function(k){var n=self.nodes[k];if(n.el===e.target)self.geometry(n);});});};
  Painter.prototype.geometry=function(n){
    var w=n.el.clientWidth,h=n.el.clientHeight;if(!w||!h)return;
    var x=1,y=1,right=w-1,bottom=h-1,rad=Math.min(4,(w-2)/2,(h-2)/2),mid=w/2;
    n.svg.setAttribute('viewBox','0 0 '+w+' '+h);
    n.path.setAttribute('d','M '+mid+' '+y+' H '+(right-rad)+' Q '+right+' '+y+' '+right+' '+(y+rad)+' V '+(bottom-rad)+' Q '+right+' '+bottom+' '+(right-rad)+' '+bottom+' H '+(x+rad)+' Q '+x+' '+bottom+' '+x+' '+(bottom-rad)+' V '+(y+rad)+' Q '+x+' '+y+' '+(x+rad)+' '+y+' H '+mid);
  };
  Painter.prototype.remove=function(k){var n=this.nodes[k];if(!n)return;if(n.animation)n.animation.cancel();if(this.observer)this.observer.unobserve(n.el);n.svg.remove();n.el.classList.remove('owd-module-saving');delete n.el.dataset.owdSavePhase;delete this.nodes[k];};
  Painter.prototype.sync=function(){
    var self=this,now=this.tracker.now();if(this.timer){clearTimeout(this.timer);this.timer=null;}
    Object.keys(this.nodes).forEach(function(k){if(!self.tracker.records[k]||!self.nodes[k].el.isConnected)self.remove(k);});
    Object.keys(this.tracker.records).forEach(function(k){
      var r=self.tracker.records[k];if(r.phase==='finishing'&&now-r.finish>=400){delete self.tracker.records[k];self.remove(k);return;}
      var n=self.nodes[k],el=Array.prototype.find.call(self.doc.querySelectorAll('#perso-fiche [data-module]'),function(e){return e.dataset.module===k&&!e.classList.contains('pc-module-differe');});
      if(!el)return;if(n&&n.el!==el){self.remove(k);n=null;}
      if(!n){
        var svg=self.doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=self.doc.createElementNS(svg.namespaceURI,'path');
        svg.classList.add('owd-save-outline');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
        path.setAttribute('pathLength','1');path.setAttribute('fill','none');path.setAttribute('stroke-dasharray','1 1');svg.appendChild(path);el.appendChild(svg);el.classList.add('owd-module-saving');
        n=self.nodes[k]={el:el,svg:svg,path:path};self.geometry(n);if(self.observer)self.observer.observe(el);
      }
      if(n.revision===r.revision&&n.phase===r.phase)return;
      n.revision=r.revision;n.phase=r.phase;el.dataset.owdSavePhase=r.phase;
      if(n.animation)n.animation.cancel();
      var reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      var elapsed=now-r.start;
      if(r.phase==='pending'){
        n.path.style.strokeDashoffset=reduced?'.25':String(1-progress(elapsed));
        if(n.path.animate&&!reduced){n.animation=n.path.animate([{strokeDashoffset:'1',offset:0},{strokeDashoffset:'.25',offset:.1},{strokeDashoffset:'.05',offset:.5},{strokeDashoffset:'.02',offset:1}],{duration:120000,fill:'forwards',easing:'linear'});n.animation.currentTime=Math.min(elapsed,120000);}
      }else{
        var left=Math.max(0,400-(now-r.finish)),offset=String(1-progress(r.finish-r.start));n.path.style.strokeDashoffset='0';
        if(n.path.animate&&!reduced)n.animation=n.path.animate([{strokeDashoffset:offset},{strokeDashoffset:'0'}],{duration:left,fill:'forwards',easing:'ease-out'});
      }
    });
    var ends=Object.keys(this.tracker.records).map(function(k){var r=self.tracker.records[k];return r.phase==='finishing'?Math.max(1,400-(now-r.finish)):null;}).filter(function(n){return n!==null;});
    if(ends.length)this.timer=setTimeout(function(){self.timer=null;self.sync();},Math.min.apply(null,ends));
  };
  Painter.prototype.destroy=function(){var self=this;Object.keys(this.nodes).forEach(function(k){self.remove(k);});if(this.observer)this.observer.disconnect();if(this.timer)clearTimeout(this.timer);};
  var api={Tracker:Tracker,Painter:Painter,progress:progress};if(typeof module==='object'&&module.exports)module.exports=api;else root.OwdSaveProgress=api;
})(typeof window==='object'?window:this);
