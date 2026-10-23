/*! markdown-it 14.1.0 https://github.com/markdown-it/markdown-it @license MIT */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).markdownit=e()}(this,(function(){"use strict";const t={};function e(r,n){"string"!=typeof n&&(n=e.defaultChars);const s=function(e){let r=t[e];if(r)return r;r=t[e]=[];for(let t=0;t<128;t++){const e=String.fromCharCode(t);r.push(e)}for(let t=0;t<e.length;t++){const n=e.charCodeAt(t);r[n]="%"+("0"+n.toString(16).toUpperCase()).slice(-2)}return r}(n);return r.replace(/(%[a-f0-9]{2})+/gi,(function(t){let e="";for(let r=0,n=t.length;r<n;r+=3){const i=parseInt(t.slice(r+1,r+3),16);if(i<128)e+=s[i];else{if(192==(224&i)&&r+3<n){const n=parseInt(t.slice(r+4,r+6),16);if(128==(192&n)){const t=i<<6&1984|63&n;e+=t<128?"\ufffd\ufffd":String.fromCharCode(t),r+=3;continue}}if(224==(240&i)&&r+6<n){const n=parseInt(t.slice(r+4,r+6),16),s=parseInt(t.slice(r+7,r+9),16);if(128==(192&n)&&128==(192&s)){const t=i<<12&61440|n<<6&4032|63&s;e+=t<2048||t>=55296&&t<=57343?"\ufffd\ufffd\ufffd":String.fromCharCode(t),r+=6;continue}}if(240==(248&i)&&r+9<n){const n=parseInt(t.slice(r+4,r+6),16),s=parseInt(t.slice(r+7,r+9),16),o=parseInt(t.slice(r+10,r+12),16);if(128==(192&n)&&128==(192&s)&&128==(192&o)){let t=i<<18&1835008|n<<12&258048|s<<6&4032|63&o;t<65536||t>1114111?e+="\ufffd\ufffd\ufffd\ufffd":(t-=65536,e+=String.fromCharCode(55296+(t>>10),56320+(1023&t))),r+=9;continue}}e+="\ufffd"}}return e}))}e.defaultChars=";/?:@&=+$,#",e.componentChars="";const r={};function n(t,e,s){"string"!=typeof e&&(s=e,e=n.defaultChars),void 0===s&&(s=!0);const i=function(t){let e=r[t];if(e)return e;e=r[t]=[];for(let t=0;t<128;t++){const r=String.fromCharCode(t);/^[0-9a-z]$/i.test(r)?e.push(r):e.push("%"+("0"+t.toString(16).toUpperCase()).slice(-2))}for(let r=0;r<t.length;r++)e[t.charCodeAt(r)]=t[r];return e}(e);let o="";for(let e=0,r=t.length;e<r;e++){const n=t.charCodeAt(e);if(s&&37===n&&e+2<r&&/^[0-9a-f]{2}$/i.test(t.slice(e+1,e+3)))o+=t.slice(e,e+3),e+=2;else if(n<128)o+=i[n];else if(n>=55296&&n<=57343){if(n>=55296&&n<=56319&&e+1<r){const r=t.charCodeAt(e+1);if(r>=56320&&r<=57343){o+=encodeURIComponent(t[e]+t[e+1]),e++;continue}}o+="%EF%BF%BD"}else o+=encodeURIComponent(t[e])}return o}function s(t){let e="";return e+=t.protocol||"",e+=t.slashes?"//":"",e+=t.auth?t.auth+"@":"",t.hostname&&-1!==t.hostname.indexOf(":")?e+="["+t.hostname+"]":e+=t.hostname||"",e+=t.port?":"+t.port:"",e+=t.pathname||"",e+=t.search||"",e+=t.hash||"",e}function i(){this.protocol=null,this.slashes=null,this.auth=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.pathname=null}n.defaultChars=";/?:@&=+$,-_.!~*'()#",n.componentChars="-_.!~*'()";const o=/^([a-z0-9.+-]+:)/i,u=/:[0-9]*$/,c=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,a=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),l=["'"].concat(a),h=["%","/","?",";","#"].concat(l),p=["/","?","#"],f=/^[+a-z0-9A-Z_-]{0,63}$/,d=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,_={javascript:!0,"javascript:":!0},m={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function g(t,e){if(t&&t instanceof i)return t;const r=new i;return r.parse(t,e),r}i.prototype.parse=function(t,e){let r,n,s,i=t;if(i=i.trim(),!e&&1===t.split("#").length){const t=c.exec(i);if(t)return this.pathname=t[1],t[2]&&(this.search=t[2]),this}let u=o.exec(i);if(u&&(u=u[0],r=u.toLowerCase(),this.protocol=u,i=i.substr(u.length)),(e||u||i.match(/^\/\/[^@\/]+@[^@\/]+/))&&(s="//"===i.substr(0,2),!s||u&&_[u]||(i=i.substr(2),this.slashes=!0)),!_[u]&&(s||u&&!m[u])){let t,e,r=-1;for(let t=0;t<p.length;t++)n=i.indexOf(p[t]),-1!==n&&(-1===r||n<r)&&(r=n);e=-1===r?i.lastIndexOf("@"):i.lastIndexOf("@",r),-1!==e&&(t=i.slice(0,e),i=i.slice(e+1),this.auth=t),r=-1;for(let t=0;t<h.length;t++)n=i.indexOf(h[t]),-1!==n&&(-1===r||n<r)&&(r=n);-1===r&&(r=i.length),":"===i[r-1]&&r--;const s=i.slice(0,r);i=i.slice(r),this.parseHost(s),this.hostname=this.hostname||"";const o="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!o){const t=this.hostname.split(/\./);for(let e=0,r=t.length;e<r;e++){const r=t[e];if(r&&!r.match(f)){let n="";for(let t=0,e=r.length;t<e;t++)r.charCodeAt(t)>127?n+="x":n+=r[t];if(!n.match(f)){const n=t.slice(0,e),s=t.slice(e+1),o=r.match(d);o&&(n.push(o[1]),s.unshift(o[2])),s.length&&(i=s.join(".")+i),this.hostname=n.join(".");break}}}}this.hostname.length>255&&(this.hostname=""),o&&(this.hostname=this.hostname.substr(1,this.hostname.length-2))}const a=i.indexOf("#");-1!==a&&(this.hash=i.substr(a),i=i.slice(0,a));const l=i.indexOf("?");return-1!==l&&(this.search=i.substr(l),i=i.slice(0,l)),i&&(this.pathname=i),m[r]&&this.hostname&&!this.pathname&&(this.pathname=""),this},i.prototype.parseHost=function(t){let e=u.exec(t);e&&(e=e[0],":"!==e&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};var k,D=Object.freeze({__proto__:null,decode:e,encode:n,format:s,parse:g}),C=/[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,y=/[\0-\x1F\x7F-\x9F]/,E=/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,A=/[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/,b=/[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,F=Object.freeze({__proto__:null,Any:C,Cc:y,Cf:/[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,P:E,S:A,Z:b}),x=new Uint16Array('\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c'.split("").map((t=>t.charCodeAt(0)))),w=new Uint16Array("\u0200aglq\t\x15\x18\x1b\u026d\x0f\0\0\x12p;\u4026os;\u4027t;\u403et;\u403cuot;\u4022".split("").map((t=>t.charCodeAt(0))));const v=new Map([[0,65533],[128,8364],[130,8218],[131,402],[132,8222],[133,8230],[134,8224],[135,8225],[136,710],[137,8240],[138,352],[139,8249],[140,338],[142,381],[145,8216],[146,8217],[147,8220],[148,8221],[149,8226],[150,8211],[151,8212],[152,732],[153,8482],[154,353],[155,8250],[156,339],[158,382],[159,376]]),z=null!==(k=String.fromCodePoint)&&void 0!==k?k:function(t){let e="";return t>65535&&(t-=65536,e+=String.fromCharCode(t>>>10&1023|55296),t=56320|1023&t),e+=String.fromCharCode(t),e};var S;!function(t){t[t.NUM=35]="NUM",t[t.SEMI=59]="SEMI",t[t.EQUALS=61]="EQUALS",t[t.ZERO=48]="ZERO",t[t.NINE=57]="NINE",t[t.LOWER_A=97]="LOWER_A",t[t.LOWER_F=102]="LOWER_F",t[t.LOWER_X=120]="LOWER_X",t[t.LOWER_Z=122]="LOWER_Z",t[t.UPPER_A=65]="UPPER_A",t[t.UPPER_F=70]="UPPER_F",t[t.UPPER_Z=90]="UPPER_Z"}(S||(S={}));var q,B,L;function I(t){return t>=S.ZERO&&t<=S.NINE}function M(t){return t>=S.UPPER_A&&t<=S.UPPER_F||t>=S.LOWER_A&&t<=S.LOWER_F}function T(t){return t===S.EQUALS||function(t){return t>=S.UPPER_A&&t<=S.UPPER_Z||t>=S.LOWER_A&&t<=S.LOWER_Z||I(t)}(t)}!function(t){t[t.VALUE_LENGTH=49152]="VALUE_LENGTH",t[t.BRANCH_LENGTH=16256]="BRANCH_LENGTH",t[t.JUMP_TABLE=127]="JUMP_TABLE"}(q||(q={})),function(t){t[t.EntityStart=0]="EntityStart",t[t.NumericStart=1]="NumericStart",t[t.NumericDecimal=2]="NumericDecimal",t[t.NumericHex=3]="NumericHex",t[t.NamedEntity=4]="NamedEntity"}(B||(B={})),function(t){t[t.Legacy=0]="Legacy",t[t.Strict=1]="Strict",t[t.Attribute=2]="Attribute"}(L||(L={}));class R{constructor(t,e,r){this.decodeTree=t,this.emitCodePoint=e,this.errors=r,this.state=B.EntityStart,this.consumed=1,this.result=0,this.treeIndex=0,this.excess=1,this.decodeMode=L.Strict}startEntity(t){this.decodeMode=t,this.state=B.EntityStart,this.result=0,this.treeIndex=0,this.excess=1,this.consumed=1}write(t,e){switch(this.state){case B.EntityStart:return t.charCodeAt(e)===S.NUM?(this.state=B.NumericStart,this.consumed+=1,this.stateNumericStart(t,e+1)):(this.state=B.NamedEntity,this.stateNamedEntity(t,e));case B.NumericStart:return this.stateNumericStart(t,e);case B.NumericDecimal:return this.stateNumericDecimal(t,e);case B.NumericHex:return this.stateNumericHex(t,e);case B.NamedEntity:return this.stateNamedEntity(t,e)}}stateNumericStart(t,e){return e>=t.length?-1:(32|t.charCodeAt(e))===S.LOWER_X?(this.state=B.NumericHex,this.consumed+=1,this.stateNumericHex(t,e+1)):(this.state=B.NumericDecimal,this.stateNumericDecimal(t,e))}addToNumericResult(t,e,r,n){if(e!==r){const s=r-e;this.result=this.result*Math.pow(n,s)+parseInt(t.substr(e,s),n),this.consumed+=s}}stateNumericHex(t,e){const r=e;for(;e<t.length;){const n=t.charCodeAt(e);if(!I(n)&&!M(n))return this.addToNumericResult(t,r,e,16),this.emitNumericEntity(n,3);e+=1}return this.addToNumericResult(t,r,e,16),-1}stateNumericDecimal(t,e){const r=e;for(;e<t.length;){const n=t.charCodeAt(e);if(!I(n))return this.addToNumericResult(t,r,e,10),this.emitNumericEntity(n,2);e+=1}return this.addToNumericResult(t,r,e,10),-1}emitNumericEntity(t,e){var r;if(this.consumed<=e)return null===(r=this.errors)||void 0===r||r.absenceOfDigitsInNumericCharacterReference(this.consumed),0;if(t===S.SEMI)this.consumed+=1;else if(this.decodeMode===L.Strict)return 0;return this.emitCodePoint(function(t){var e;return t>=55296&&t<=57343||t>1114111?65533:null!==(e=v.get(t))&&void 0!==e?e:t}(this.result),this.consumed),this.errors&&(t!==S.SEMI&&this.errors.missingSemicolonAfterCharacterReference(),this.errors.validateNumericCharacterReference(this.result)),this.consumed}stateNamedEntity(t,e){const{decodeTree:r}=this;let n=r[this.treeIndex],s=(n&q.VALUE_LENGTH)>>14;for(;e<t.length;e++,this.excess++){const i=t.charCodeAt(e);if(this.treeIndex=P(r,n,this.treeIndex+Math.max(1,s),i),this.treeIndex<0)return 0===this.result||this.decodeMode===L.Attribute&&(0===s||T(i))?0:this.emitNotTerminatedNamedEntity();if(n=r[this.treeIndex],s=(n&q.VALUE_LENGTH)>>14,0!==s){if(i===S.SEMI)return this.emitNamedEntityData(this.treeIndex,s,this.consumed+this.excess);this.decodeMode!==L.Strict&&(this.result=this.treeIndex,this.consumed+=this.excess,this.excess=0)}}return-1}emitNotTerminatedNamedEntity(){var t;const{result:e,decodeTree:r}=this,n=(r[e]&q.VALUE_LENGTH)>>14;return this.emitNamedEntityData(e,n,this.consumed),null===(t=this.errors)||void 0===t||t.missingSemicolonAfterCharacterReference(),this.consumed}emitNamedEntityData(t,e,r){const{decodeTree:n}=this;return this.emitCodePoint(1===e?n[t]&~q.VALUE_LENGTH:n[t+1],r),3===e&&this.emitCodePoint(n[t+2],r),r}end(){var t;switch(this.state){case B.NamedEntity:return 0===this.result||this.decodeMode===L.Attribute&&this.result!==this.treeIndex?0:this.emitNotTerminatedNamedEntity();case B.NumericDecimal:return this.emitNumericEntity(0,2);case B.NumericHex:return this.emitNumericEntity(0,3);case B.NumericStart:return null===(t=this.errors)||void 0===t||t.absenceOfDigitsInNumericCharacterReference(this.consumed),0;case B.EntityStart:return 0}}}function N(t){let e="";const r=new R(t,(t=>e+=z(t)));return function(t,n){let s=0,i=0;for(;(i=t.indexOf("&",i))>=0;){e+=t.slice(s,i),r.startEntity(n);const o=r.write(t,i+1);if(o<0){s=i+r.end();break}s=i+o,i=0===o?s+1:s}const o=e+t.slice(s);return e="",o}}function P(t,e,r,n){const s=(e&q.BRANCH_LENGTH)>>7,i=e&q.JUMP_TABLE;if(0===s)return 0!==i&&n===i?r:-1;if(i){const e=n-i;return e<0||e>=s?-1:t[r+e]-1}let o=r,u=o+s-1;for(;o<=u;){const e=o+u>>>1,r=t[e];if(r<n)o=e+1;else{if(!(r>n))return t[e+s];u=e-1}}return-1}const O=N(x);function j(t,e=L.Legacy){return O(t,e)}function Z(t){return"[object String]"===function(t){return Object.prototype.toString.call(t)}(t)}N(w);const $=Object.prototype.hasOwnProperty;function U(t){return Array.prototype.slice.call(arguments,1).forEach((function(e){if(e){if("object"!=typeof e)throw new TypeError(e+"must be object");Object.keys(e).forEach((function(r){t[r]=e[r]}))}})),t}function H(t,e,r){return[].concat(t.slice(0,e),r,t.slice(e+1))}function V(t){return!(t>=55296&&t<=57343)&&(!(t>=64976&&t<=65007)&&(!!(65535&~t&&65534!=(65535&t))&&(!(t>=0&&t<=8)&&(11!==t&&(!(t>=14&&t<=31)&&(!(t>=127&&t<=159)&&!(t>1114111)))))))}function G(t){if(t>65535){const e=55296+((t-=65536)>>10),r=56320+(1023&t);return String.fromCharCode(e,r)}return String.fromCharCode(t)}const W=/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,J=new RegExp(W.source+"|"+/&([a-z#][a-z0-9]{1,31});/gi.source,"gi"),Q=/^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;function X(t){return t.indexOf("\\")<0&&t.indexOf("&")<0?t:t.replace(J,(function(t,e,r){return e||function(t,e){if(35===e.charCodeAt(0)&&Q.test(e)){const r="x"===e[1].toLowerCase()?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return V(r)?G(r):t}const r=j(t);return r!==t?r:t}(t,r)}))}const Y=/[&<>"]/,K=/[&<>"]/g,tt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};function et(t){return tt[t]}function rt(t){return Y.test(t)?t.replace(K,et):t}const nt=/[.?*+^$[\]\\(){}|-]/g;function st(t){switch(t){case 9:case 32:return!0}return!1}function it(t){if(t>=8192&&t<=8202)return!0;switch(t){case 9:case 10:case 11:case 12:case 13:case 32:case 160:case 5760:case 8239:case 8287:case 12288:return!0}return!1}function ot(t){return E.test(t)||A.test(t)}function ut(t){switch(t){case 33:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 41:case 42:case 43:case 44:case 45:case 46:case 47:case 58:case 59:case 60:case 61:case 62:case 63:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 124:case 125:case 126:return!0;default:return!1}}function ct(t){return t=t.trim().replace(/\s+/g," "),"\u1e7e"==="\u1e9e".toLowerCase()&&(t=t.replace(/\u1e9e/g,"\xdf")),t.toLowerCase().toUpperCase()}const at={mdurl:D,ucmicro:F};var lt=Object.freeze({__proto__:null,arrayReplaceAt:H,assign:U,escapeHtml:rt,escapeRE:function(t){return t.replace(nt,"\\$&")},fromCodePoint:G,has:function(t,e){return $.call(t,e)},isMdAsciiPunct:ut,isPunctChar:ot,isSpace:st,isString:Z,isValidEntityCode:V,isWhiteSpace:it,lib:at,normalizeReference:ct,unescapeAll:X,unescapeMd:function(t){return t.indexOf("\\")<0?t:t.replace(W,"$1")}});var ht=Object.freeze({__proto__:null,parseLinkDestination:function(t,e,r){let n,s=e;const i={ok:!1,pos:0,str:""};if(60===t.charCodeAt(s)){for(s++;s<r;){if(n=t.charCodeAt(s),10===n)return i;if(60===n)return i;if(62===n)return i.pos=s+1,i.str=X(t.slice(e+1,s)),i.ok=!0,i;92===n&&s+1<r?s+=2:s++}return i}let o=0;for(;s<r&&(n=t.charCodeAt(s),32!==n)&&!(n<32||127===n);)if(92===n&&s+1<r){if(32===t.charCodeAt(s+1))break;s+=2}else{if(40===n&&(o++,o>32))return i;if(41===n){if(0===o)break;o--}s++}return e===s||0!==o||(i.str=X(t.slice(e,s)),i.pos=s,i.ok=!0),i},parseLinkLabel:function(t,e,r){let n,s,i,o;const u=t.posMax,c=t.pos;for(t.pos=e+1,n=1;t.pos<u;){if(i=t.src.charCodeAt(t.pos),93===i&&(n--,0===n)){s=!0;break}if(o=t.pos,t.md.inline.skipToken(t),91===i)if(o===t.pos-1)n++;else if(r)return t.pos=c,-1}let a=-1;return s&&(a=t.pos),t.pos=c,a},parseLinkTitle:function(t,e,r,n){let s,i=e;const o={ok:!1,can_continue:!1,pos:0,str:"",marker:0};if(n)o.str=n.str,o.marker=n.marker;else{if(i>=r)return o;let n=t.charCodeAt(i);if(34!==n&&39!==n&&40!==n)return o;e++,i++,40===n&&(n=41),o.marker=n}for(;i<r;){if(s=t.charCodeAt(i),s===o.marker)return o.pos=i+1,o.str+=X(t.slice(e,i)),o.ok=!0,o;if(40===s&&41===o.marker)return o;92===s&&i+1<r&&i++,i++}return o.can_continue=!0,o.str+=X(t.slice(e,i)),o}});const pt={};function ft(){this.rules=U({},pt)}function dt(){this.__rules__=[],this.__cache__=null}function _t(t,e,r){this.type=t,this.tag=e,this.attrs=null,this.map=null,this.nesting=r,this.level=0,this.children=null,this.content="",this.markup="",this.info="",this.meta=null,this.block=!1,this.hidden=!1}function mt(t,e,r){this.src=t,this.env=r,this.tokens=[],this.inlineMode=!1,this.md=e}pt.code_inline=function(t,e,r,n,s){const i=t[e];return"<code"+s.renderAttrs(i)+">"+rt(i.content)+"</code>"},pt.code_block=function(t,e,r,n,s){const i=t[e];return"<pre"+s.renderAttrs(i)+"><code>"+rt(t[e].content)+"</code></pre>\n"},pt.fence=function(t,e,r,n,s){const i=t[e],o=i.info?X(i.info).trim():"";let u,c="",a="";if(o){const t=o.split(/(\s+)/g);c=t[0],a=t.slice(2).join("")}if(u=r.highlight&&r.highlight(i.content,c,a)||rt(i.content),0===u.indexOf("<pre"))return u+"\n";if(o){const t=i.attrIndex("class"),e=i.attrs?i.attrs.slice():[];t<0?e.push(["class",r.langPrefix+c]):(e[t]=e[t].slice(),e[t][1]+=" "+r.langPrefix+c);const n={attrs:e};return`<pre><code${s.renderAttrs(n)}>${u}</code></pre>\n`}return`<pre><code${s.renderAttrs(i)}>${u}</code></pre>\n`},pt.image=function(t,e,r,n,s){const i=t[e];return i.attrs[i.attrIndex("alt")][1]=s.renderInlineAsText(i.children,r,n),s.renderToken(t,e,r)},pt.hardbreak=function(t,e,r){return r.xhtmlOut?"<br />\n":"<br>\n"},pt.softbreak=function(t,e,r){return r.breaks?r.xhtmlOut?"<br />\n":"<br>\n":"\n"},pt.text=function(t,e){return rt(t[e].content)},pt.html_block=function(t,e){return t[e].content},pt.html_inline=function(t,e){return t[e].content},ft.prototype.renderAttrs=function(t){let e,r,n;if(!t.attrs)return"";for(n="",e=0,r=t.attrs.length;e<r;e++)n+=" "+rt(t.attrs[e][0])+'="'+rt(t.attrs[e][1])+'"';return n},ft.prototype.renderToken=function(t,e,r){const n=t[e];let s="";if(n.hidden)return"";n.block&&-1!==n.nesting&&e&&t[e-1].hidden&&(s+="\n"),s+=(-1===n.nesting?"</":"<")+n.tag,s+=this.renderAttrs(n),0===n.nesting&&r.xhtmlOut&&(s+=" /");let i=!1;if(n.block&&(i=!0,1===n.nesting&&e+1<t.length)){const r=t[e+1];("inline"===r.type||r.hidden||-1===r.nesting&&r.tag===n.tag)&&(i=!1)}return s+=i?">\n":">",s},ft.prototype.renderInline=function(t,e,r){let n="";const s=this.rules;for(let i=0,o=t.length;i<o;i++){const o=t[i].type;void 0!==s[o]?n+=s[o](t,i,e,r,this):n+=this.renderToken(t,i,e)}return n},ft.prototype.renderInlineAsText=function(t,e,r){let n="";for(let s=0,i=t.length;s<i;s++)switch(t[s].type){case"text":case"html_inline":case"html_block":n+=t[s].content;break;case"image":n+=this.renderInlineAsText(t[s].children,e,r);break;case"softbreak":case"hardbreak":n+="\n"}return n},ft.prototype.render=function(t,e,r){let n="";const s=this.rules;for(let i=0,o=t.length;i<o;i++){const o=t[i].type;"inline"===o?n+=this.renderInline(t[i].children,e,r):void 0!==s[o]?n+=s[o](t,i,e,r,this):n+=this.renderToken(t,i,e,r)}return n},dt.prototype.__find__=function(t){for(let e=0;e<this.__rules__.length;e++)if(this.__rules__[e].name===t)return e;return-1},dt.prototype.__compile__=function(){const t=this,e=[""];t.__rules__.forEach((function(t){t.enabled&&t.alt.forEach((function(t){e.indexOf(t)<0&&e.push(t)}))})),t.__cache__={},e.forEach((function(e){t.__cache__[e]=[],t.__rules__.forEach((function(r){r.enabled&&(e&&r.alt.indexOf(e)<0||t.__cache__[e].push(r.fn))}))}))},dt.prototype.at=function(t,e,r){const n=this.__find__(t),s=r||{};if(-1===n)throw new Error("Parser rule not found: "+t);this.__rules__[n].fn=e,this.__rules__[n].alt=s.alt||[],this.__cache__=null},dt.prototype.before=function(t,e,r,n){const s=this.__find__(t),i=n||{};if(-1===s)throw new Error("Parser rule not found: "+t);this.__rules__.splice(s,0,{name:e,enabled:!0,fn:r,alt:i.alt||[]}),this.__cache__=null},dt.prototype.after=function(t,e,r,n){const s=this.__find__(t),i=n||{};if(-1===s)throw new Error("Parser rule not found: "+t);this.__rules__.splice(s+1,0,{name:e,enabled:!0,fn:r,alt:i.alt||[]}),this.__cache__=null},dt.prototype.push=function(t,e,r){const n=r||{};this.__rules__.push({name:t,enabled:!0,fn:e,alt:n.alt||[]}),this.__cache__=null},dt.prototype.enable=function(t,e){Array.isArray(t)||(t=[t]);const r=[];return t.forEach((function(t){const n=this.__find__(t);if(n<0){if(e)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[n].enabled=!0,r.push(t)}),this),this.__cache__=null,r},dt.prototype.enableOnly=function(t,e){Array.isArray(t)||(t=[t]),this.__rules__.forEach((function(t){t.enabled=!1})),this.enable(t,e)},dt.prototype.disable=function(t,e){Array.isArray(t)||(t=[t]);const r=[];return t.forEach((function(t){const n=this.__find__(t);if(n<0){if(e)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[n].enabled=!1,r.push(t)}),this),this.__cache__=null,r},dt.prototype.getRules=function(t){return null===this.__cache__&&this.__compile__(),this.__cache__[t]||[]},_t.prototype.attrIndex=function(t){if(!this.attrs)return-1;const e=this.attrs;for(let r=0,n=e.length;r<n;r++)if(e[r][0]===t)return r;return-1},_t.prototype.attrPush=function(t){this.attrs?this.attrs.push(t):this.attrs=[t]},_t.prototype.attrSet=function(t,e){const r=this.attrIndex(t),n=[t,e];r<0?this.attrPush(n):this.attrs[r]=n},_t.prototype.attrGet=function(t){const e=this.attrIndex(t);let r=null;return e>=0&&(r=this.attrs[e][1]),r},_t.prototype.attrJoin=function(t,e){const r=this.attrIndex(t);r<0?this.attrPush([t,e]):this.attrs[r][1]=this.attrs[r][1]+" "+e},mt.prototype.Token=_t;const gt=/\r\n?|\n/g,kt=/\0/g;function Dt(t){return/^<\/a\s*>/i.test(t)}const Ct=/\+-|\.\.|\?\?\?\?|!!!!|,,|--/,yt=/\((c|tm|r)\)/i,Et=/\((c|tm|r)\)/gi,At={c:"\xa9",r:"\xae",tm:"\u2122"};function bt(t,e){return At[e.toLowerCase()]}function Ft(t){let e=0;for(let r=t.length-1;r>=0;r--){const n=t[r];"text"!==n.type||e||(n.content=n.content.replace(Et,bt)),"link_open"===n.type&&"auto"===n.info&&e--,"link_close"===n.type&&"auto"===n.info&&e++}}function xt(t){let e=0;for(let r=t.length-1;r>=0;r--){const n=t[r];"text"!==n.type||e||Ct.test(n.content)&&(n.content=n.content.replace(/\+-/g,"\xb1").replace(/\.{2,}/g,"\u2026").replace(/([?!])\u2026/g,"$1..").replace(/([?!]){4,}/g,"$1$1$1").replace(/,{2,}/g,",").replace(/(^|[^-])---(?=[^-]|$)/gm,"$1\u2014").replace(/(^|\s)--(?=\s|$)/gm,"$1\u2013").replace(/(^|[^-\s])--(?=[^-\s]|$)/gm,"$1\u2013")),"link_open"===n.type&&"auto"===n.info&&e--,"link_close"===n.type&&"auto"===n.info&&e++}}const wt=/['"]/,vt=/['"]/g,zt="\u2019";function St(t,e,r){return t.slice(0,e)+r+t.slice(e+1)}function qt(t,e){let r;const n=[];for(let s=0;s<t.length;s++){const i=t[s],o=t[s].level;for(r=n.length-1;r>=0&&!(n[r].level<=o);r--);if(n.length=r+1,"text"!==i.type)continue;let u=i.content,c=0,a=u.length;t:for(;c<a;){vt.lastIndex=c;const l=vt.exec(u);if(!l)break;let h=!0,p=!0;c=l.index+1;const f="'"===l[0];let d=32;if(l.index-1>=0)d=u.charCodeAt(l.index-1);else for(r=s-1;r>=0&&("softbreak"!==t[r].type&&"hardbreak"!==t[r].type);r--)if(t[r].content){d=t[r].content.charCodeAt(t[r].content.length-1);break}let _=32;if(c<a)_=u.charCodeAt(c);else for(r=s+1;r<t.length&&("softbreak"!==t[r].type&&"hardbreak"!==t[r].type);r++)if(t[r].content){_=t[r].content.charCodeAt(0);break}const m=ut(d)||ot(String.fromCharCode(d)),g=ut(_)||ot(String.fromCharCode(_)),k=it(d),D=it(_);if(D?h=!1:g&&(k||m||(h=!1)),k?p=!1:m&&(D||g||(p=!1)),34===_&&'"'===l[0]&&d>=48&&d<=57&&(p=h=!1),h&&p&&(h=m,p=g),h||p){if(p)for(r=n.length-1;r>=0;r--){let h=n[r];if(n[r].level<o)break;if(h.single===f&&n[r].level===o){let o,p;h=n[r],f?(o=e.md.options.quotes[2],p=e.md.options.quotes[3]):(o=e.md.options.quotes[0],p=e.md.options.quotes[1]),i.content=St(i.content,l.index,p),t[h.token].content=St(t[h.token].content,h.pos,o),c+=p.length-1,h.token===s&&(c+=o.length-1),u=i.content,a=u.length,n.length=r;continue t}}h?n.push({token:s,pos:l.index,single:f,level:o}):p&&f&&(i.content=St(i.content,l.index,zt))}else f&&(i.content=St(i.content,l.index,zt))}}}const Bt=[["normalize",function(t){let e;e=t.src.replace(gt,"\n"),e=e.replace(kt,"\ufffd"),t.src=e}],["block",function(t){let e;t.inlineMode?(e=new t.Token("inline","",0),e.content=t.src,e.map=[0,1],e.children=[],t.tokens.push(e)):t.md.block.parse(t.src,t.md,t.env,t.tokens)}],["inline",function(t){const e=t.tokens;for(let r=0,n=e.length;r<n;r++){const n=e[r];"inline"===n.type&&t.md.inline.parse(n.content,t.md,t.env,n.children)}}],["linkify",function(t){const e=t.tokens;var r;if(t.md.options.linkify)for(let n=0,s=e.length;n<s;n++){if("inline"!==e[n].type||!t.md.linkify.pretest(e[n].content))continue;let s=e[n].children,i=0;for(let o=s.length-1;o>=0;o--){const u=s[o];if("link_close"!==u.type){if("html_inline"===u.type&&(r=u.content,/^<a[>\s]/i.test(r)&&i>0&&i--,Dt(u.content)&&i++),!(i>0)&&"text"===u.type&&t.md.linkify.test(u.content)){const r=u.content;let i=t.md.linkify.match(r);const c=[];let a=u.level,l=0;i.length>0&&0===i[0].index&&o>0&&"text_special"===s[o-1].type&&(i=i.slice(1));for(let e=0;e<i.length;e++){const n=i[e].url,s=t.md.normalizeLink(n);if(!t.md.validateLink(s))continue;let o=i[e].text;o=i[e].schema?"mailto:"!==i[e].schema||/^mailto:/i.test(o)?t.md.normalizeLinkText(o):t.md.normalizeLinkText("mailto:"+o).replace(/^mailto:/,""):t.md.normalizeLinkText("http://"+o).replace(/^http:\/\//,"");const u=i[e].index;if(u>l){const e=new t.Token("text","",0);e.content=r.slice(l,u),e.level=a,c.push(e)}const h=new t.Token("link_open","a",1);h.attrs=[["href",s]],h.level=a++,h.markup="linkify",h.info="auto",c.push(h);const p=new t.Token("text","",0);p.content=o,p.level=a,c.push(p);const f=new t.Token("link_close","a",-1);f.level=--a,f.markup="linkify",f.info="auto",c.push(f),l=i[e].lastIndex}if(l<r.length){const e=new t.Token("text","",0);e.content=r.slice(l),e.level=a,c.push(e)}e[n].children=s=H(s,o,c)}}else for(o--;s[o].level!==u.level&&"link_open"!==s[o].type;)o--}}}],["replacements",function(t){let e;if(t.md.options.typographer)for(e=t.tokens.length-1;e>=0;e--)"inline"===t.tokens[e].type&&(yt.test(t.tokens[e].content)&&Ft(t.tokens[e].children),Ct.test(t.tokens[e].content)&&xt(t.tokens[e].children))}],["smartquotes",function(t){if(t.md.options.typographer)for(let e=t.tokens.length-1;e>=0;e--)"inline"===t.tokens[e].type&&wt.test(t.tokens[e].content)&&qt(t.tokens[e].children,t)}],["text_join",function(t){let e,r;const n=t.tokens,s=n.length;for(let t=0;t<s;t++){if("inline"!==n[t].type)continue;const s=n[t].children,i=s.length;for(e=0;e<i;e++)"text_special"===s[e].type&&(s[e].type="text");for(e=r=0;e<i;e++)"text"===s[e].type&&e+1<i&&"text"===s[e+1].type?s[e+1].content=s[e].content+s[e+1].content:(e!==r&&(s[r]=s[e]),r++);e!==r&&(s.length=r)}}]];function Lt(){this.ruler=new dt;for(let t=0;t<Bt.length;t++)this.ruler.push(Bt[t][0],Bt[t][1])}function It(t,e,r,n){this.src=t,this.md=e,this.env=r,this.tokens=n,this.bMarks=[],this.eMarks=[],this.tShift=[],this.sCount=[],this.bsCount=[],this.blkIndent=0,this.line=0,this.lineMax=0,this.tight=!1,this.ddIndent=-1,this.listIndent=-1,this.parentType="root",this.level=0;const s=this.src;for(let t=0,e=0,r=0,n=0,i=s.length,o=!1;e<i;e++){const u=s.charCodeAt(e);if(!o){if(st(u)){r++,9===u?n+=4-n%4:n++;continue}o=!0}10!==u&&e!==i-1||(10!==u&&e++,this.bMarks.push(t),this.eMarks.push(e),this.tShift.push(r),this.sCount.push(n),this.bsCount.push(0),o=!1,r=0,n=0,t=e+1)}this.bMarks.push(s.length),this.eMarks.push(s.length),this.tShift.push(0),this.sCount.push(0),this.bsCount.push(0),this.lineMax=this.bMarks.length-1}Lt.prototype.process=function(t){const e=this.ruler.getRules("");for(let r=0,n=e.length;r<n;r++)e[r](t)},Lt.prototype.State=mt,It.prototype.push=function(t,e,r){const n=new _t(t,e,r);return n.block=!0,r<0&&this.level--,n.level=this.level,r>0&&this.level++,this.tokens.push(n),n},It.prototype.isEmpty=function(t){return this.bMarks[t]+this.tShift[t]>=this.eMarks[t]},It.prototype.skipEmptyLines=function(t){for(let e=this.lineMax;t<e&&!(this.bMarks[t]+this.tShift[t]<this.eMarks[t]);t++);return t},It.prototype.skipSpaces=function(t){for(let e=this.src.length;t<e;t++){if(!st(this.src.charCodeAt(t)))break}return t},It.prototype.skipSpacesBack=function(t,e){if(t<=e)return t;for(;t>e;)if(!st(this.src.charCodeAt(--t)))return t+1;return t},It.prototype.skipChars=function(t,e){for(let r=this.src.length;t<r&&this.src.charCodeAt(t)===e;t++);return t},It.prototype.skipCharsBack=function(t,e,r){if(t<=r)return t;for(;t>r;)if(e!==this.src.charCodeAt(--t))return t+1;return t},It.prototype.getLines=function(t,e,r,n){if(t>=e)return"";const s=new Array(e-t);for(let i=0,o=t;o<e;o++,i++){let t=0;const u=this.bMarks[o];let c,a=u;for(c=o+1<e||n?this.eMarks[o]+1:this.eMarks[o];a<c&&t<r;){const e=this.src.charCodeAt(a);if(st(e))9===e?t+=4-(t+this.bsCount[o])%4:t++;else{if(!(a-u<this.tShift[o]))break;t++}a++}s[i]=t>r?new Array(t-r+1).join(" ")+this.src.slice(a,c):this.src.slice(a,c)}return s.join("")},It.prototype.Token=_t;function Mt(t,e){const r=t.bMarks[e]+t.tShift[e],n=t.eMarks[e];return t.src.slice(r,n)}function Tt(t){const e=[],r=t.length;let n=0,s=t.charCodeAt(n),i=!1,o=0,u="";for(;n<r;)124===s&&(i?(u+=t.substring(o,n-1),o=n):(e.push(u+t.substring(o,n)),u="",o=n+1)),i=92===s,n++,s=t.charCodeAt(n);return e.push(u+t.substring(o)),e}function Rt(t,e){const r=t.eMarks[e];let n=t.bMarks[e]+t.tShift[e];const s=t.src.charCodeAt(n++);if(42!==s&&45!==s&&43!==s)return-1;if(n<r){if(!st(t.src.charCodeAt(n)))return-1}return n}function Nt(t,e){const r=t.bMarks[e]+t.tShift[e],n=t.eMarks[e];let s=r;if(s+1>=n)return-1;let i=t.src.charCodeAt(s++);if(i<48||i>57)return-1;for(;;){if(s>=n)return-1;if(i=t.src.charCodeAt(s++),!(i>=48&&i<=57)){if(41===i||46===i)break;return-1}if(s-r>=10)return-1}return s<n&&(i=t.src.charCodeAt(s),!st(i))?-1:s}const Pt="<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^\"'=<>`\\x00-\\x20]+|'[^']*'|\"[^\"]*\"))?)*\\s*\\/?>",Ot="<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>",jt=new RegExp("^(?:"+Pt+"|"+Ot+"|\x3c!---?>|\x3c!--(?:[^-]|-[^-]|--[^>])*--\x3e|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)"),Zt=new RegExp("^(?:"+Pt+"|"+Ot+")"),$t=[[/^<(script|pre|style|textarea)(?=(\s|>|$))/i,/<\/(script|pre|style|textarea)>/i,!0],[/^<!--/,/-->/,!0],[/^<\?/,/\?>/,!0],[/^<![A-Z]/,/>/,!0],[/^<!\[CDATA\[/,/\]\]>/,!0],[new RegExp("^</?("+["address","article","aside","base","basefont","blockquote","body","caption","center","col","colgroup","dd","details","dialog","dir","div","dl","dt","fieldset","figcaption","figure","footer","form","frame","frameset","h1","h2","h3","h4","h5","h6","head","header","hr","html","iframe","legend","li","link","main","menu","menuitem","nav","noframes","ol","optgroup","option","p","param","search","section","summary","table","tbody","td","tfoot","th","thead","title","tr","track","ul"].join("|")+")(?=(\\s|/?>|$))","i"),/^$/,!0],[new RegExp(Zt.source+"\\s*$"),/^$/,!1]];const Ut=[["table",function(t,e,r,n){if(e+2>r)return!1;let s=e+1;if(t.sCount[s]<t.blkIndent)return!1;if(t.sCount[s]-t.blkIndent>=4)return!1;let i=t.bMarks[s]+t.tShift[s];if(i>=t.eMarks[s])return!1;const o=t.src.charCodeAt(i++);if(124!==o&&45!==o&&58!==o)return!1;if(i>=t.eMarks[s])return!1;const u=t.src.charCodeAt(i++);if(124!==u&&45!==u&&58!==u&&!st(u))return!1;if(45===o&&st(u))return!1;for(;i<t.eMarks[s];){const e=t.src.charCodeAt(i);if(124!==e&&45!==e&&58!==e&&!st(e))return!1;i++}let c=Mt(t,e+1),a=c.split("|");const l=[];for(let t=0;t<a.length;t++){const e=a[t].trim();if(!e){if(0===t||t===a.length-1)continue;return!1}if(!/^:?-+:?$/.test(e))return!1;58===e.charCodeAt(e.length-1)?l.push(58===e.charCodeAt(0)?"center":"right"):58===e.charCodeAt(0)?l.push("left"):l.push("")}if(c=Mt(t,e).trim(),-1===c.indexOf("|"))return!1;if(t.sCount[e]-t.blkIndent>=4)return!1;a=Tt(c),a.length&&""===a[0]&&a.shift(),a.length&&""===a[a.length-1]&&a.pop();const h=a.length;if(0===h||h!==l.length)return!1;if(n)return!0;const p=t.parentType;t.parentType="table";const f=t.md.block.ruler.getRules("blockquote"),d=[e,0];t.push("table_open","table",1).map=d,t.push("thead_open","thead",1).map=[e,e+1],t.push("tr_open","tr",1).map=[e,e+1];for(let e=0;e<a.length;e++){const r=t.push("th_open","th",1);l[e]&&(r.attrs=[["style","text-align:"+l[e]]]);const n=t.push("inline","",0);n.content=a[e].trim(),n.children=[],t.push("th_close","th",-1)}let _;t.push("tr_close","tr",-1),t.push("thead_close","thead",-1);let m=0;for(s=e+2;s<r&&!(t.sCount[s]<t.blkIndent);s++){let n=!1;for(let e=0,i=f.length;e<i;e++)if(f[e](t,s,r,!0)){n=!0;break}if(n)break;if(c=Mt(t,s).trim(),!c)break;if(t.sCount[s]-t.blkIndent>=4)break;if(a=Tt(c),a.length&&""===a[0]&&a.shift(),a.length&&""===a[a.length-1]&&a.pop(),m+=h-a.length,m>65536)break;if(s===e+2){t.push("tbody_open","tbody",1).map=_=[e+2,0]}t.push("tr_open","tr",1).map=[s,s+1];for(let e=0;e<h;e++){const r=t.push("td_open","td",1);l[e]&&(r.attrs=[["style","text-align:"+l[e]]]);const n=t.push("inline","",0);n.content=a[e]?a[e].trim():"",n.children=[],t.push("td_close","td",-1)}t.push("tr_close","tr",-1)}return _&&(t.push("tbody_close","tbody",-1),_[1]=s),t.push("table_close","table",-1),d[1]=s,t.parentType=p,t.line=s,!0},["paragraph","reference"]],["code",function(t,e,r){if(t.sCount[e]-t.blkIndent<4)return!1;let n=e+1,s=n;for(;n<r;)if(t.isEmpty(n))n++;else{if(!(t.sCount[n]-t.blkIndent>=4))break;n++,s=n}t.line=s;const i=t.push("code_block","code",0);return i.content=t.getLines(e,s,4+t.blkIndent,!1)+"\n",i.map=[e,t.line],!0}],["fence",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;if(s+3>i)return!1;const o=t.src.charCodeAt(s);if(126!==o&&96!==o)return!1;let u=s;s=t.skipChars(s,o);let c=s-u;if(c<3)return!1;const a=t.src.slice(u,s),l=t.src.slice(s,i);if(96===o&&l.indexOf(String.fromCharCode(o))>=0)return!1;if(n)return!0;let h=e,p=!1;for(;(h++,!(h>=r))&&(s=u=t.bMarks[h]+t.tShift[h],i=t.eMarks[h],!(s<i&&t.sCount[h]<t.blkIndent));)if(t.src.charCodeAt(s)===o&&!(t.sCount[h]-t.blkIndent>=4||(s=t.skipChars(s,o),s-u<c||(s=t.skipSpaces(s),s<i)))){p=!0;break}c=t.sCount[e],t.line=h+(p?1:0);const f=t.push("fence","code",0);return f.info=l,f.content=t.getLines(e+1,h,c,!0),f.markup=a,f.map=[e,t.line],!0},["paragraph","reference","blockquote","list"]],["blockquote",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];const o=t.lineMax;if(t.sCount[e]-t.blkIndent>=4)return!1;if(62!==t.src.charCodeAt(s))return!1;if(n)return!0;const u=[],c=[],a=[],l=[],h=t.md.block.ruler.getRules("blockquote"),p=t.parentType;t.parentType="blockquote";let f,d=!1;for(f=e;f<r;f++){const e=t.sCount[f]<t.blkIndent;if(s=t.bMarks[f]+t.tShift[f],i=t.eMarks[f],s>=i)break;if(62===t.src.charCodeAt(s++)&&!e){let e,r,n=t.sCount[f]+1;32===t.src.charCodeAt(s)?(s++,n++,r=!1,e=!0):9===t.src.charCodeAt(s)?(e=!0,(t.bsCount[f]+n)%4==3?(s++,n++,r=!1):r=!0):e=!1;let o=n;for(u.push(t.bMarks[f]),t.bMarks[f]=s;s<i;){const e=t.src.charCodeAt(s);if(!st(e))break;9===e?o+=4-(o+t.bsCount[f]+(r?1:0))%4:o++,s++}d=s>=i,c.push(t.bsCount[f]),t.bsCount[f]=t.sCount[f]+1+(e?1:0),a.push(t.sCount[f]),t.sCount[f]=o-n,l.push(t.tShift[f]),t.tShift[f]=s-t.bMarks[f];continue}if(d)break;let n=!1;for(let e=0,s=h.length;e<s;e++)if(h[e](t,f,r,!0)){n=!0;break}if(n){t.lineMax=f,0!==t.blkIndent&&(u.push(t.bMarks[f]),c.push(t.bsCount[f]),l.push(t.tShift[f]),a.push(t.sCount[f]),t.sCount[f]-=t.blkIndent);break}u.push(t.bMarks[f]),c.push(t.bsCount[f]),l.push(t.tShift[f]),a.push(t.sCount[f]),t.sCount[f]=-1}const _=t.blkIndent;t.blkIndent=0;const m=t.push("blockquote_open","blockquote",1);m.markup=">";const g=[e,0];m.map=g,t.md.block.tokenize(t,e,f),t.push("blockquote_close","blockquote",-1).markup=">",t.lineMax=o,t.parentType=p,g[1]=t.line;for(let r=0;r<l.length;r++)t.bMarks[r+e]=u[r],t.tShift[r+e]=l[r],t.sCount[r+e]=a[r],t.bsCount[r+e]=c[r];return t.blkIndent=_,!0},["paragraph","reference","blockquote","list"]],["hr",function(t,e,r,n){const s=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;let i=t.bMarks[e]+t.tShift[e];const o=t.src.charCodeAt(i++);if(42!==o&&45!==o&&95!==o)return!1;let u=1;for(;i<s;){const e=t.src.charCodeAt(i++);if(e!==o&&!st(e))return!1;e===o&&u++}if(u<3)return!1;if(n)return!0;t.line=e+1;const c=t.push("hr","hr",0);return c.map=[e,t.line],c.markup=Array(u+1).join(String.fromCharCode(o)),!0},["paragraph","reference","blockquote","list"]],["list",function(t,e,r,n){let s,i,o,u,c=e,a=!0;if(t.sCount[c]-t.blkIndent>=4)return!1;if(t.listIndent>=0&&t.sCount[c]-t.listIndent>=4&&t.sCount[c]<t.blkIndent)return!1;let l,h,p,f=!1;if(n&&"paragraph"===t.parentType&&t.sCount[c]>=t.blkIndent&&(f=!0),(p=Nt(t,c))>=0){if(l=!0,o=t.bMarks[c]+t.tShift[c],h=Number(t.src.slice(o,p-1)),f&&1!==h)return!1}else{if(!((p=Rt(t,c))>=0))return!1;l=!1}if(f&&t.skipSpaces(p)>=t.eMarks[c])return!1;if(n)return!0;const d=t.src.charCodeAt(p-1),_=t.tokens.length;l?(u=t.push("ordered_list_open","ol",1),1!==h&&(u.attrs=[["start",h]])):u=t.push("bullet_list_open","ul",1);const m=[c,0];u.map=m,u.markup=String.fromCharCode(d);let g=!1;const k=t.md.block.ruler.getRules("list"),D=t.parentType;for(t.parentType="list";c<r;){i=p,s=t.eMarks[c];const e=t.sCount[c]+p-(t.bMarks[c]+t.tShift[c]);let n=e;for(;i<s;){const e=t.src.charCodeAt(i);if(9===e)n+=4-(n+t.bsCount[c])%4;else{if(32!==e)break;n++}i++}const h=i;let f;f=h>=s?1:n-e,f>4&&(f=1);const _=e+f;u=t.push("list_item_open","li",1),u.markup=String.fromCharCode(d);const m=[c,0];u.map=m,l&&(u.info=t.src.slice(o,p-1));const D=t.tight,C=t.tShift[c],y=t.sCount[c],E=t.listIndent;if(t.listIndent=t.blkIndent,t.blkIndent=_,t.tight=!0,t.tShift[c]=h-t.bMarks[c],t.sCount[c]=n,h>=s&&t.isEmpty(c+1)?t.line=Math.min(t.line+2,r):t.md.block.tokenize(t,c,r,!0),t.tight&&!g||(a=!1),g=t.line-c>1&&t.isEmpty(t.line-1),t.blkIndent=t.listIndent,t.listIndent=E,t.tShift[c]=C,t.sCount[c]=y,t.tight=D,u=t.push("list_item_close","li",-1),u.markup=String.fromCharCode(d),c=t.line,m[1]=c,c>=r)break;if(t.sCount[c]<t.blkIndent)break;if(t.sCount[c]-t.blkIndent>=4)break;let A=!1;for(let e=0,n=k.length;e<n;e++)if(k[e](t,c,r,!0)){A=!0;break}if(A)break;if(l){if(p=Nt(t,c),p<0)break;o=t.bMarks[c]+t.tShift[c]}else if(p=Rt(t,c),p<0)break;if(d!==t.src.charCodeAt(p-1))break}return u=l?t.push("ordered_list_close","ol",-1):t.push("bullet_list_close","ul",-1),u.markup=String.fromCharCode(d),m[1]=c,t.line=c,t.parentType=D,a&&function(t,e){const r=t.level+2;for(let n=e+2,s=t.tokens.length-2;n<s;n++)t.tokens[n].level===r&&"paragraph_open"===t.tokens[n].type&&(t.tokens[n+2].hidden=!0,t.tokens[n].hidden=!0,n+=2)}(t,_),!0},["paragraph","reference","blockquote"]],["reference",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e],o=e+1;if(t.sCount[e]-t.blkIndent>=4)return!1;if(91!==t.src.charCodeAt(s))return!1;function u(e){const r=t.lineMax;if(e>=r||t.isEmpty(e))return null;let n=!1;if(t.sCount[e]-t.blkIndent>3&&(n=!0),t.sCount[e]<0&&(n=!0),!n){const n=t.md.block.ruler.getRules("reference"),s=t.parentType;t.parentType="reference";let i=!1;for(let s=0,o=n.length;s<o;s++)if(n[s](t,e,r,!0)){i=!0;break}if(t.parentType=s,i)return null}const s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];return t.src.slice(s,i+1)}let c=t.src.slice(s,i+1);i=c.length;let a=-1;for(s=1;s<i;s++){const t=c.charCodeAt(s);if(91===t)return!1;if(93===t){a=s;break}if(10===t){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}else if(92===t&&(s++,s<i&&10===c.charCodeAt(s))){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}}if(a<0||58!==c.charCodeAt(a+1))return!1;for(s=a+2;s<i;s++){const t=c.charCodeAt(s);if(10===t){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}else if(!st(t))break}const l=t.md.helpers.parseLinkDestination(c,s,i);if(!l.ok)return!1;const h=t.md.normalizeLink(l.str);if(!t.md.validateLink(h))return!1;s=l.pos;const p=s,f=o,d=s;for(;s<i;s++){const t=c.charCodeAt(s);if(10===t){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}else if(!st(t))break}let _,m=t.md.helpers.parseLinkTitle(c,s,i);for(;m.can_continue;){const e=u(o);if(null===e)break;c+=e,s=i,i=c.length,o++,m=t.md.helpers.parseLinkTitle(c,s,i,m)}for(s<i&&d!==s&&m.ok?(_=m.str,s=m.pos):(_="",s=p,o=f);s<i;){if(!st(c.charCodeAt(s)))break;s++}if(s<i&&10!==c.charCodeAt(s)&&_)for(_="",s=p,o=f;s<i;){if(!st(c.charCodeAt(s)))break;s++}if(s<i&&10!==c.charCodeAt(s))return!1;const g=ct(c.slice(1,a));return!!g&&(n||(void 0===t.env.references&&(t.env.references={}),void 0===t.env.references[g]&&(t.env.references[g]={title:_,href:h}),t.line=o),!0)}],["html_block",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;if(!t.md.options.html)return!1;if(60!==t.src.charCodeAt(s))return!1;let o=t.src.slice(s,i),u=0;for(;u<$t.length&&!$t[u][0].test(o);u++);if(u===$t.length)return!1;if(n)return $t[u][2];let c=e+1;if(!$t[u][1].test(o))for(;c<r&&!(t.sCount[c]<t.blkIndent);c++)if(s=t.bMarks[c]+t.tShift[c],i=t.eMarks[c],o=t.src.slice(s,i),$t[u][1].test(o)){0!==o.length&&c++;break}t.line=c;const a=t.push("html_block","",0);return a.map=[e,c],a.content=t.getLines(e,c,t.blkIndent,!0),!0},["paragraph","reference","blockquote"]],["heading",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;let o=t.src.charCodeAt(s);if(35!==o||s>=i)return!1;let u=1;for(o=t.src.charCodeAt(++s);35===o&&s<i&&u<=6;)u++,o=t.src.charCodeAt(++s);if(u>6||s<i&&!st(o))return!1;if(n)return!0;i=t.skipSpacesBack(i,s);const c=t.skipCharsBack(i,35,s);c>s&&st(t.src.charCodeAt(c-1))&&(i=c),t.line=e+1;const a=t.push("heading_open","h"+String(u),1);a.markup="########".slice(0,u),a.map=[e,t.line];const l=t.push("inline","",0);return l.content=t.src.slice(s,i).trim(),l.map=[e,t.line],l.children=[],t.push("heading_close","h"+String(u),-1).markup="########".slice(0,u),!0},["paragraph","reference","blockquote"]],["lheading",function(t,e,r){const n=t.md.block.ruler.getRules("paragraph");if(t.sCount[e]-t.blkIndent>=4)return!1;const s=t.parentType;t.parentType="paragraph";let i,o=0,u=e+1;for(;u<r&&!t.isEmpty(u);u++){if(t.sCount[u]-t.blkIndent>3)continue;if(t.sCount[u]>=t.blkIndent){let e=t.bMarks[u]+t.tShift[u];const r=t.eMarks[u];if(e<r&&(i=t.src.charCodeAt(e),(45===i||61===i)&&(e=t.skipChars(e,i),e=t.skipSpaces(e),e>=r))){o=61===i?1:2;break}}if(t.sCount[u]<0)continue;let e=!1;for(let s=0,i=n.length;s<i;s++)if(n[s](t,u,r,!0)){e=!0;break}if(e)break}if(!o)return!1;const c=t.getLines(e,u,t.blkIndent,!1).trim();t.line=u+1;const a=t.push("heading_open","h"+String(o),1);a.markup=String.fromCharCode(i),a.map=[e,t.line];const l=t.push("inline","",0);return l.content=c,l.map=[e,t.line-1],l.children=[],t.push("heading_close","h"+String(o),-1).markup=String.fromCharCode(i),t.parentType=s,!0}],["paragraph",function(t,e,r){const n=t.md.block.ruler.getRules("paragraph"),s=t.parentType;let i=e+1;for(t.parentType="paragraph";i<r&&!t.isEmpty(i);i++){if(t.sCount[i]-t.blkIndent>3)continue;if(t.sCount[i]<0)continue;let e=!1;for(let s=0,o=n.length;s<o;s++)if(n[s](t,i,r,!0)){e=!0;break}if(e)break}const o=t.getLines(e,i,t.blkIndent,!1).trim();t.line=i,t.push("paragraph_open","p",1).map=[e,t.line];const u=t.push("inline","",0);return u.content=o,u.map=[e,t.line],u.children=[],t.push("paragraph_close","p",-1),t.parentType=s,!0}]];function Ht(){this.ruler=new dt;for(let t=0;t<Ut.length;t++)this.ruler.push(Ut[t][0],Ut[t][1],{alt:(Ut[t][2]||[]).slice()})}function Vt(t,e,r,n){this.src=t,this.env=r,this.md=e,this.tokens=n,this.tokens_meta=Array(n.length),this.pos=0,this.posMax=this.src.length,this.level=0,this.pending="",this.pendingLevel=0,this.cache={},this.delimiters=[],this._prev_delimiters=[],this.backticks={},this.backticksScanned=!1,this.linkLevel=0}function Gt(t){switch(t){case 10:case 33:case 35:case 36:case 37:case 38:case 42:case 43:case 45:case 58:case 60:case 61:case 62:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 125:case 126:return!0;default:return!1}}Ht.prototype.tokenize=function(t,e,r){const n=this.ruler.getRules(""),s=n.length,i=t.md.options.maxNesting;let o=e,u=!1;for(;o<r&&(t.line=o=t.skipEmptyLines(o),!(o>=r))&&!(t.sCount[o]<t.blkIndent);){if(t.level>=i){t.line=r;break}const e=t.line;let c=!1;for(let i=0;i<s;i++)if(c=n[i](t,o,r,!1),c){if(e>=t.line)throw new Error("block rule didn't increment state.line");break}if(!c)throw new Error("none of the block rules matched");t.tight=!u,t.isEmpty(t.line-1)&&(u=!0),o=t.line,o<r&&t.isEmpty(o)&&(u=!0,o++,t.line=o)}},Ht.prototype.parse=function(t,e,r,n){if(!t)return;const s=new this.State(t,e,r,n);this.tokenize(s,s.line,s.lineMax)},Ht.prototype.State=It,Vt.prototype.pushPending=function(){const t=new _t("text","",0);return t.content=this.pending,t.level=this.pendingLevel,this.tokens.push(t),this.pending="",t},Vt.prototype.push=function(t,e,r){this.pending&&this.pushPending();const n=new _t(t,e,r);let s=null;return r<0&&(this.level--,this.delimiters=this._prev_delimiters.pop()),n.level=this.level,r>0&&(this.level++,this._prev_delimiters.push(this.delimiters),this.delimiters=[],s={delimiters:this.delimiters}),this.pendingLevel=this.level,this.tokens.push(n),this.tokens_meta.push(s),n},Vt.prototype.scanDelims=function(t,e){const r=this.posMax,n=this.src.charCodeAt(t),s=t>0?this.src.charCodeAt(t-1):32;let i=t;for(;i<r&&this.src.charCodeAt(i)===n;)i++;const o=i-t,u=i<r?this.src.charCodeAt(i):32,c=ut(s)||ot(String.fromCharCode(s)),a=ut(u)||ot(String.fromCharCode(u)),l=it(s),h=it(u),p=!h&&(!a||l||c),f=!l&&(!c||h||a);return{can_open:p&&(e||!f||c),can_close:f&&(e||!p||a),length:o}},Vt.prototype.Token=_t;const Wt=/(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;const Jt=[];for(let t=0;t<256;t++)Jt.push(0);function Qt(t,e){let r;const n=[],s=e.length;for(let i=0;i<s;i++){const s=e[i];if(126!==s.marker)continue;if(-1===s.end)continue;const o=e[s.end];r=t.tokens[s.token],r.type="s_open",r.tag="s",r.nesting=1,r.markup="~~",r.content="",r=t.tokens[o.token],r.type="s_close",r.tag="s",r.nesting=-1,r.markup="~~",r.content="","text"===t.tokens[o.token-1].type&&"~"===t.tokens[o.token-1].content&&n.push(o.token-1)}for(;n.length;){const e=n.pop();let s=e+1;for(;s<t.tokens.length&&"s_close"===t.tokens[s].type;)s++;s--,e!==s&&(r=t.tokens[s],t.tokens[s]=t.tokens[e],t.tokens[e]=r)}}"\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach((function(t){Jt[t.charCodeAt(0)]=1}));var Xt={tokenize:function(t,e){const r=t.pos,n=t.src.charCodeAt(r);if(e)return!1;if(126!==n)return!1;const s=t.scanDelims(t.pos,!0);let i=s.length;const o=String.fromCharCode(n);if(i<2)return!1;let u;i%2&&(u=t.push("text","",0),u.content=o,i--);for(let e=0;e<i;e+=2)u=t.push("text","",0),u.content=o+o,t.delimiters.push({marker:n,length:0,token:t.tokens.length-1,end:-1,open:s.can_open,close:s.can_close});return t.pos+=s.length,!0},postProcess:function(t){const e=t.tokens_meta,r=t.tokens_meta.length;Qt(t,t.delimiters);for(let n=0;n<r;n++)e[n]&&e[n].delimiters&&Qt(t,e[n].delimiters)}};function Yt(t,e){for(let r=e.length-1;r>=0;r--){const n=e[r];if(95!==n.marker&&42!==n.marker)continue;if(-1===n.end)continue;const s=e[n.end],i=r>0&&e[r-1].end===n.end+1&&e[r-1].marker===n.marker&&e[r-1].token===n.token-1&&e[n.end+1].token===s.token+1,o=String.fromCharCode(n.marker),u=t.tokens[n.token];u.type=i?"strong_open":"em_open",u.tag=i?"strong":"em",u.nesting=1,u.markup=i?o+o:o,u.content="";const c=t.tokens[s.token];c.type=i?"strong_close":"em_close",c.tag=i?"strong":"em",c.nesting=-1,c.markup=i?o+o:o,c.content="",i&&(t.tokens[e[r-1].token].content="",t.tokens[e[n.end+1].token].content="",r--)}}var Kt={tokenize:function(t,e){const r=t.pos,n=t.src.charCodeAt(r);if(e)return!1;if(95!==n&&42!==n)return!1;const s=t.scanDelims(t.pos,42===n);for(let e=0;e<s.length;e++){t.push("text","",0).content=String.fromCharCode(n),t.delimiters.push({marker:n,length:s.length,token:t.tokens.length-1,end:-1,open:s.can_open,close:s.can_close})}return t.pos+=s.length,!0},postProcess:function(t){const e=t.tokens_meta,r=t.tokens_meta.length;Yt(t,t.delimiters);for(let n=0;n<r;n++)e[n]&&e[n].delimiters&&Yt(t,e[n].delimiters)}};const te=/^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,ee=/^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;const re=/^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,ne=/^&([a-z][a-z0-9]{1,31});/i;function se(t){const e={},r=t.length;if(!r)return;let n=0,s=-2;const i=[];for(let o=0;o<r;o++){const r=t[o];if(i.push(0),t[n].marker===r.marker&&s===r.token-1||(n=o),s=r.token,r.length=r.length||0,!r.close)continue;e.hasOwnProperty(r.marker)||(e[r.marker]=[-1,-1,-1,-1,-1,-1]);const u=e[r.marker][(r.open?3:0)+r.length%3];let c=n-i[n]-1,a=c;for(;c>u;c-=i[c]+1){const e=t[c];if(e.marker===r.marker&&(e.open&&e.end<0)){let n=!1;if((e.close||r.open)&&(e.length+r.length)%3==0&&(e.length%3==0&&r.length%3==0||(n=!0)),!n){const n=c>0&&!t[c-1].open?i[c-1]+1:0;i[o]=o-c+n,i[c]=n,r.open=!1,e.end=o,e.close=!1,a=-1,s=-2;break}}}-1!==a&&(e[r.marker][(r.open?3:0)+(r.length||0)%3]=a)}}const ie=[["text",function(t,e){let r=t.pos;for(;r<t.posMax&&!Gt(t.src.charCodeAt(r));)r++;return r!==t.pos&&(e||(t.pending+=t.src.slice(t.pos,r)),t.pos=r,!0)}],["linkify",function(t,e){if(!t.md.options.linkify)return!1;if(t.linkLevel>0)return!1;const r=t.pos;if(r+3>t.posMax)return!1;if(58!==t.src.charCodeAt(r))return!1;if(47!==t.src.charCodeAt(r+1))return!1;if(47!==t.src.charCodeAt(r+2))return!1;const n=t.pending.match(Wt);if(!n)return!1;const s=n[1],i=t.md.linkify.matchAtStart(t.src.slice(r-s.length));if(!i)return!1;let o=i.url;if(o.length<=s.length)return!1;o=o.replace(/\*+$/,"");const u=t.md.normalizeLink(o);if(!t.md.validateLink(u))return!1;if(!e){t.pending=t.pending.slice(0,-s.length);const e=t.push("link_open","a",1);e.attrs=[["href",u]],e.markup="linkify",e.info="auto";t.push("text","",0).content=t.md.normalizeLinkText(o);const r=t.push("link_close","a",-1);r.markup="linkify",r.info="auto"}return t.pos+=o.length-s.length,!0}],["newline",function(t,e){let r=t.pos;if(10!==t.src.charCodeAt(r))return!1;const n=t.pending.length-1,s=t.posMax;if(!e)if(n>=0&&32===t.pending.charCodeAt(n))if(n>=1&&32===t.pending.charCodeAt(n-1)){let e=n-1;for(;e>=1&&32===t.pending.charCodeAt(e-1);)e--;t.pending=t.pending.slice(0,e),t.push("hardbreak","br",0)}else t.pending=t.pending.slice(0,-1),t.push("softbreak","br",0);else t.push("softbreak","br",0);for(r++;r<s&&st(t.src.charCodeAt(r));)r++;return t.pos=r,!0}],["escape",function(t,e){let r=t.pos;const n=t.posMax;if(92!==t.src.charCodeAt(r))return!1;if(r++,r>=n)return!1;let s=t.src.charCodeAt(r);if(10===s){for(e||t.push("hardbreak","br",0),r++;r<n&&(s=t.src.charCodeAt(r),st(s));)r++;return t.pos=r,!0}let i=t.src[r];if(s>=55296&&s<=56319&&r+1<n){const e=t.src.charCodeAt(r+1);e>=56320&&e<=57343&&(i+=t.src[r+1],r++)}const o="\\"+i;if(!e){const e=t.push("text_special","",0);s<256&&0!==Jt[s]?e.content=i:e.content=o,e.markup=o,e.info="escape"}return t.pos=r+1,!0}],["backticks",function(t,e){let r=t.pos;if(96!==t.src.charCodeAt(r))return!1;const n=r;r++;const s=t.posMax;for(;r<s&&96===t.src.charCodeAt(r);)r++;const i=t.src.slice(n,r),o=i.length;if(t.backticksScanned&&(t.backticks[o]||0)<=n)return e||(t.pending+=i),t.pos+=o,!0;let u,c=r;for(;-1!==(u=t.src.indexOf("`",c));){for(c=u+1;c<s&&96===t.src.charCodeAt(c);)c++;const n=c-u;if(n===o){if(!e){const e=t.push("code_inline","code",0);e.markup=i,e.content=t.src.slice(r,u).replace(/\n/g," ").replace(/^ (.+) $/,"$1")}return t.pos=c,!0}t.backticks[n]=u}return t.backticksScanned=!0,e||(t.pending+=i),t.pos+=o,!0}],["strikethrough",Xt.tokenize],["emphasis",Kt.tokenize],["link",function(t,e){let r,n,s,i,o="",u="",c=t.pos,a=!0;if(91!==t.src.charCodeAt(t.pos))return!1;const l=t.pos,h=t.posMax,p=t.pos+1,f=t.md.helpers.parseLinkLabel(t,t.pos,!0);if(f<0)return!1;let d=f+1;if(d<h&&40===t.src.charCodeAt(d)){for(a=!1,d++;d<h&&(r=t.src.charCodeAt(d),st(r)||10===r);d++);if(d>=h)return!1;if(c=d,s=t.md.helpers.parseLinkDestination(t.src,d,t.posMax),s.ok){for(o=t.md.normalizeLink(s.str),t.md.validateLink(o)?d=s.pos:o="",c=d;d<h&&(r=t.src.charCodeAt(d),st(r)||10===r);d++);if(s=t.md.helpers.parseLinkTitle(t.src,d,t.posMax),d<h&&c!==d&&s.ok)for(u=s.str,d=s.pos;d<h&&(r=t.src.charCodeAt(d),st(r)||10===r);d++);}(d>=h||41!==t.src.charCodeAt(d))&&(a=!0),d++}if(a){if(void 0===t.env.references)return!1;if(d<h&&91===t.src.charCodeAt(d)?(c=d+1,d=t.md.helpers.parseLinkLabel(t,d),d>=0?n=t.src.slice(c,d++):d=f+1):d=f+1,n||(n=t.src.slice(p,f)),i=t.env.references[ct(n)],!i)return t.pos=l,!1;o=i.href,u=i.title}if(!e){t.pos=p,t.posMax=f;const e=[["href",o]];t.push("link_open","a",1).attrs=e,u&&e.push(["title",u]),t.linkLevel++,t.md.inline.tokenize(t),t.linkLevel--,t.push("link_close","a",-1)}return t.pos=d,t.posMax=h,!0}],["image",function(t,e){let r,n,s,i,o,u,c,a,l="";const h=t.pos,p=t.posMax;if(33!==t.src.charCodeAt(t.pos))return!1;if(91!==t.src.charCodeAt(t.pos+1))return!1;const f=t.pos+2,d=t.md.helpers.parseLinkLabel(t,t.pos+1,!1);if(d<0)return!1;if(i=d+1,i<p&&40===t.src.charCodeAt(i)){for(i++;i<p&&(r=t.src.charCodeAt(i),st(r)||10===r);i++);if(i>=p)return!1;for(a=i,u=t.md.helpers.parseLinkDestination(t.src,i,t.posMax),u.ok&&(l=t.md.normalizeLink(u.str),t.md.validateLink(l)?i=u.pos:l=""),a=i;i<p&&(r=t.src.charCodeAt(i),st(r)||10===r);i++);if(u=t.md.helpers.parseLinkTitle(t.src,i,t.posMax),i<p&&a!==i&&u.ok)for(c=u.str,i=u.pos;i<p&&(r=t.src.charCodeAt(i),st(r)||10===r);i++);else c="";if(i>=p||41!==t.src.charCodeAt(i))return t.pos=h,!1;i++}else{if(void 0===t.env.references)return!1;if(i<p&&91===t.src.charCodeAt(i)?(a=i+1,i=t.md.helpers.parseLinkLabel(t,i),i>=0?s=t.src.slice(a,i++):i=d+1):i=d+1,s||(s=t.src.slice(f,d)),o=t.env.references[ct(s)],!o)return t.pos=h,!1;l=o.href,c=o.title}if(!e){n=t.src.slice(f,d);const e=[];t.md.inline.parse(n,t.md,t.env,e);const r=t.push("image","img",0),s=[["src",l],["alt",""]];r.attrs=s,r.children=e,r.content=n,c&&s.push(["title",c])}return t.pos=i,t.posMax=p,!0}],["autolink",function(t,e){let r=t.pos;if(60!==t.src.charCodeAt(r))return!1;const n=t.pos,s=t.posMax;for(;;){if(++r>=s)return!1;const e=t.src.charCodeAt(r);if(60===e)return!1;if(62===e)break}const i=t.src.slice(n+1,r);if(ee.test(i)){const r=t.md.normalizeLink(i);if(!t.md.validateLink(r))return!1;if(!e){const e=t.push("link_open","a",1);e.attrs=[["href",r]],e.markup="autolink",e.info="auto";t.push("text","",0).content=t.md.normalizeLinkText(i);const n=t.push("link_close","a",-1);n.markup="autolink",n.info="auto"}return t.pos+=i.length+2,!0}if(te.test(i)){const r=t.md.normalizeLink("mailto:"+i);if(!t.md.validateLink(r))return!1;if(!e){const e=t.push("link_open","a",1);e.attrs=[["href",r]],e.markup="autolink",e.info="auto";t.push("text","",0).content=t.md.normalizeLinkText(i);const n=t.push("link_close","a",-1);n.markup="autolink",n.info="auto"}return t.pos+=i.length+2,!0}return!1}],["html_inline",function(t,e){if(!t.md.options.html)return!1;const r=t.posMax,n=t.pos;if(60!==t.src.charCodeAt(n)||n+2>=r)return!1;const s=t.src.charCodeAt(n+1);if(33!==s&&63!==s&&47!==s&&!function(t){const e=32|t;return e>=97&&e<=122}(s))return!1;const i=t.src.slice(n).match(jt);if(!i)return!1;if(!e){const e=t.push("html_inline","",0);e.content=i[0],o=e.content,/^<a[>\s]/i.test(o)&&t.linkLevel++,function(t){return/^<\/a\s*>/i.test(t)}(e.content)&&t.linkLevel--}var o;return t.pos+=i[0].length,!0}],["entity",function(t,e){const r=t.pos,n=t.posMax;if(38!==t.src.charCodeAt(r))return!1;if(r+1>=n)return!1;if(35===t.src.charCodeAt(r+1)){const n=t.src.slice(r).match(re);if(n){if(!e){const e="x"===n[1][0].toLowerCase()?parseInt(n[1].slice(1),16):parseInt(n[1],10),r=t.push("text_special","",0);r.content=V(e)?G(e):G(65533),r.markup=n[0],r.info="entity"}return t.pos+=n[0].length,!0}}else{const n=t.src.slice(r).match(ne);if(n){const r=j(n[0]);if(r!==n[0]){if(!e){const e=t.push("text_special","",0);e.content=r,e.markup=n[0],e.info="entity"}return t.pos+=n[0].length,!0}}}return!1}]],oe=[["balance_pairs",function(t){const e=t.tokens_meta,r=t.tokens_meta.length;se(t.delimiters);for(let t=0;t<r;t++)e[t]&&e[t].delimiters&&se(e[t].delimiters)}],["strikethrough",Xt.postProcess],["emphasis",Kt.postProcess],["fragments_join",function(t){let e,r,n=0;const s=t.tokens,i=t.tokens.length;for(e=r=0;e<i;e++)s[e].nesting<0&&n--,s[e].level=n,s[e].nesting>0&&n++,"text"===s[e].type&&e+1<i&&"text"===s[e+1].type?s[e+1].content=s[e].content+s[e+1].content:(e!==r&&(s[r]=s[e]),r++);e!==r&&(s.length=r)}]];function ue(){this.ruler=new dt;for(let t=0;t<ie.length;t++)this.ruler.push(ie[t][0],ie[t][1]);this.ruler2=new dt;for(let t=0;t<oe.length;t++)this.ruler2.push(oe[t][0],oe[t][1])}function ce(t){return Array.prototype.slice.call(arguments,1).forEach((function(e){e&&Object.keys(e).forEach((function(r){t[r]=e[r]}))})),t}function ae(t){return Object.prototype.toString.call(t)}function le(t){return"[object Function]"===ae(t)}function he(t){return t.replace(/[.?*+^$[\]\\(){}|-]/g,"\\$&")}ue.prototype.skipToken=function(t){const e=t.pos,r=this.ruler.getRules(""),n=r.length,s=t.md.options.maxNesting,i=t.cache;if(void 0!==i[e])return void(t.pos=i[e]);let o=!1;if(t.level<s){for(let s=0;s<n;s++)if(t.level++,o=r[s](t,!0),t.level--,o){if(e>=t.pos)throw new Error("inline rule didn't increment state.pos");break}}else t.pos=t.posMax;o||t.pos++,i[e]=t.pos},ue.prototype.tokenize=function(t){const e=this.ruler.getRules(""),r=e.length,n=t.posMax,s=t.md.options.maxNesting;for(;t.pos<n;){const i=t.pos;let o=!1;if(t.level<s)for(let n=0;n<r;n++)if(o=e[n](t,!1),o){if(i>=t.pos)throw new Error("inline rule didn't increment state.pos");break}if(o){if(t.pos>=n)break}else t.pending+=t.src[t.pos++]}t.pending&&t.pushPending()},ue.prototype.parse=function(t,e,r,n){const s=new this.State(t,e,r,n);this.tokenize(s);const i=this.ruler2.getRules(""),o=i.length;for(let t=0;t<o;t++)i[t](s)},ue.prototype.State=Vt;const pe={fuzzyLink:!0,fuzzyEmail:!0,fuzzyIP:!1};const fe={"http:":{validate:function(t,e,r){const n=t.slice(e);return r.re.http||(r.re.http=new RegExp("^\\/\\/"+r.re.src_auth+r.re.src_host_port_strict+r.re.src_path,"i")),r.re.http.test(n)?n.match(r.re.http)[0].length:0}},"https:":"http:","ftp:":"http:","//":{validate:function(t,e,r){const n=t.slice(e);return r.re.no_http||(r.re.no_http=new RegExp("^"+r.re.src_auth+"(?:localhost|(?:(?:"+r.re.src_domain+")\\.)+"+r.re.src_domain_root+")"+r.re.src_port+r.re.src_host_terminator+r.re.src_path,"i")),r.re.no_http.test(n)?e>=3&&":"===t[e-3]||e>=3&&"/"===t[e-3]?0:n.match(r.re.no_http)[0].length:0}},"mailto:":{validate:function(t,e,r){const n=t.slice(e);return r.re.mailto||(r.re.mailto=new RegExp("^"+r.re.src_email_name+"@"+r.re.src_host_strict,"i")),r.re.mailto.test(n)?n.match(r.re.mailto)[0].length:0}}},de="a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]",_e="biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|\u0440\u0444".split("|");function me(t){const e=t.re=function(t){const e={};t=t||{},e.src_Any=C.source,e.src_Cc=y.source,e.src_Z=b.source,e.src_P=E.source,e.src_ZPCc=[e.src_Z,e.src_P,e.src_Cc].join("|"),e.src_ZCc=[e.src_Z,e.src_Cc].join("|");const r="[><\uff5c]";return e.src_pseudo_letter="(?:(?![><\uff5c]|"+e.src_ZPCc+")"+e.src_Any+")",e.src_ip4="(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",e.src_auth="(?:(?:(?!"+e.src_ZCc+"|[@/\\[\\]()]).)+@)?",e.src_port="(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?",e.src_host_terminator="(?=$|[><\uff5c]|"+e.src_ZPCc+")(?!"+(t["---"]?"-(?!--)|":"-|")+"_|:\\d|\\.-|\\.(?!$|"+e.src_ZPCc+"))",e.src_path="(?:[/?#](?:(?!"+e.src_ZCc+"|"+r+"|[()[\\]{}.,\"'?!\\-;]).|\\[(?:(?!"+e.src_ZCc+"|\\]).)*\\]|\\((?:(?!"+e.src_ZCc+"|[)]).)*\\)|\\{(?:(?!"+e.src_ZCc+'|[}]).)*\\}|\\"(?:(?!'+e.src_ZCc+'|["]).)+\\"|\\\'(?:(?!'+e.src_ZCc+"|[']).)+\\'|\\'(?="+e.src_pseudo_letter+"|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!"+e.src_ZCc+"|[.]|$)|"+(t["---"]?"\\-(?!--(?:[^-]|$))(?:-*)|":"\\-+|")+",(?!"+e.src_ZCc+"|$)|;(?!"+e.src_ZCc+"|$)|\\!+(?!"+e.src_ZCc+"|[!]|$)|\\?(?!"+e.src_ZCc+"|[?]|$))+|\\/)?",e.src_email_name='[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*',e.src_xn="xn--[a-z0-9\\-]{1,59}",e.src_domain_root="(?:"+e.src_xn+"|"+e.src_pseudo_letter+"{1,63})",e.src_domain="(?:"+e.src_xn+"|(?:"+e.src_pseudo_letter+")|(?:"+e.src_pseudo_letter+"(?:-|"+e.src_pseudo_letter+"){0,61}"+e.src_pseudo_letter+"))",e.src_host="(?:(?:(?:(?:"+e.src_domain+")\\.)*"+e.src_domain+"))",e.tpl_host_fuzzy="(?:"+e.src_ip4+"|(?:(?:(?:"+e.src_domain+")\\.)+(?:%TLDS%)))",e.tpl_host_no_ip_fuzzy="(?:(?:(?:"+e.src_domain+")\\.)+(?:%TLDS%))",e.src_host_strict=e.src_host+e.src_host_terminator,e.tpl_host_fuzzy_strict=e.tpl_host_fuzzy+e.src_host_terminator,e.src_host_port_strict=e.src_host+e.src_port+e.src_host_terminator,e.tpl_host_port_fuzzy_strict=e.tpl_host_fuzzy+e.src_port+e.src_host_terminator,e.tpl_host_port_no_ip_fuzzy_strict=e.tpl_host_no_ip_fuzzy+e.src_port+e.src_host_terminator,e.tpl_host_fuzzy_test="localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:"+e.src_ZPCc+"|>|$))",e.tpl_email_fuzzy='(^|[><\uff5c]|"|\\(|'+e.src_ZCc+")("+e.src_email_name+"@"+e.tpl_host_fuzzy_strict+")",e.tpl_link_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|"+e.src_ZPCc+"))((?![$+<=>^`|\uff5c])"+e.tpl_host_port_fuzzy_strict+e.src_path+")",e.tpl_link_no_ip_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|"+e.src_ZPCc+"))((?![$+<=>^`|\uff5c])"+e.tpl_host_port_no_ip_fuzzy_strict+e.src_path+")",e}(t.__opts__),r=t.__tlds__.slice();function n(t){return t.replace("%TLDS%",e.src_tlds)}t.onCompile(),t.__tlds_replaced__||r.push(de),r.push(e.src_xn),e.src_tlds=r.join("|"),e.email_fuzzy=RegExp(n(e.tpl_email_fuzzy),"i"),e.link_fuzzy=RegExp(n(e.tpl_link_fuzzy),"i"),e.link_no_ip_fuzzy=RegExp(n(e.tpl_link_no_ip_fuzzy),"i"),e.host_fuzzy_test=RegExp(n(e.tpl_host_fuzzy_test),"i");const s=[];function i(t,e){throw new Error('(LinkifyIt) Invalid schema "'+t+'": '+e)}t.__compiled__={},Object.keys(t.__schemas__).forEach((function(e){const r=t.__schemas__[e];if(null===r)return;const n={validate:null,link:null};if(t.__compiled__[e]=n,"[object Object]"===ae(r))return!function(t){return"[object RegExp]"===ae(t)}(r.validate)?le(r.validate)?n.validate=r.validate:i(e,r):n.validate=function(t){return function(e,r){const n=e.slice(r);return t.test(n)?n.match(t)[0].length:0}}(r.validate),void(le(r.normalize)?n.normalize=r.normalize:r.normalize?i(e,r):n.normalize=function(t,e){e.normalize(t)});!function(t){return"[object String]"===ae(t)}(r)?i(e,r):s.push(e)})),s.forEach((function(e){t.__compiled__[t.__schemas__[e]]&&(t.__compiled__[e].validate=t.__compiled__[t.__schemas__[e]].validate,t.__compiled__[e].normalize=t.__compiled__[t.__schemas__[e]].normalize)})),t.__compiled__[""]={validate:null,normalize:function(t,e){e.normalize(t)}};const o=Object.keys(t.__compiled__).filter((function(e){return e.length>0&&t.__compiled__[e]})).map(he).join("|");t.re.schema_test=RegExp("(^|(?!_)(?:[><\uff5c]|"+e.src_ZPCc+"))("+o+")","i"),t.re.schema_search=RegExp("(^|(?!_)(?:[><\uff5c]|"+e.src_ZPCc+"))("+o+")","ig"),t.re.schema_at_start=RegExp("^"+t.re.schema_search.source,"i"),t.re.pretest=RegExp("("+t.re.schema_test.source+")|("+t.re.host_fuzzy_test.source+")|@","i"),function(t){t.__index__=-1,t.__text_cache__=""}(t)}function ge(t,e){const r=t.__index__,n=t.__last_index__,s=t.__text_cache__.slice(r,n);this.schema=t.__schema__.toLowerCase(),this.index=r+e,this.lastIndex=n+e,this.raw=s,this.text=s,this.url=s}function ke(t,e){const r=new ge(t,e);return t.__compiled__[r.schema].normalize(r,t),r}function De(t,e){if(!(this instanceof De))return new De(t,e);var r;e||(r=t,Object.keys(r||{}).reduce((function(t,e){return t||pe.hasOwnProperty(e)}),!1)&&(e=t,t={})),this.__opts__=ce({},pe,e),this.__index__=-1,this.__last_index__=-1,this.__schema__="",this.__text_cache__="",this.__schemas__=ce({},fe,t),this.__compiled__={},this.__tlds__=_e,this.__tlds_replaced__=!1,this.re={},me(this)}De.prototype.add=function(t,e){return this.__schemas__[t]=e,me(this),this},De.prototype.set=function(t){return this.__opts__=ce(this.__opts__,t),this},De.prototype.test=function(t){if(this.__text_cache__=t,this.__index__=-1,!t.length)return!1;let e,r,n,s,i,o,u,c,a;if(this.re.schema_test.test(t))for(u=this.re.schema_search,u.lastIndex=0;null!==(e=u.exec(t));)if(s=this.testSchemaAt(t,e[2],u.lastIndex),s){this.__schema__=e[2],this.__index__=e.index+e[1].length,this.__last_index__=e.index+e[0].length+s;break}return this.__opts__.fuzzyLink&&this.__compiled__["http:"]&&(c=t.search(this.re.host_fuzzy_test),c>=0&&(this.__index__<0||c<this.__index__)&&null!==(r=t.match(this.__opts__.fuzzyIP?this.re.link_fuzzy:this.re.link_no_ip_fuzzy))&&(i=r.index+r[1].length,(this.__index__<0||i<this.__index__)&&(this.__schema__="",this.__index__=i,this.__last_index__=r.index+r[0].length))),this.__opts__.fuzzyEmail&&this.__compiled__["mailto:"]&&(a=t.indexOf("@"),a>=0&&null!==(n=t.match(this.re.email_fuzzy))&&(i=n.index+n[1].length,o=n.index+n[0].length,(this.__index__<0||i<this.__index__||i===this.__index__&&o>this.__last_index__)&&(this.__schema__="mailto:",this.__index__=i,this.__last_index__=o))),this.__index__>=0},De.prototype.pretest=function(t){return this.re.pretest.test(t)},De.prototype.testSchemaAt=function(t,e,r){return this.__compiled__[e.toLowerCase()]?this.__compiled__[e.toLowerCase()].validate(t,r,this):0},De.prototype.match=function(t){const e=[];let r=0;this.__index__>=0&&this.__text_cache__===t&&(e.push(ke(this,r)),r=this.__last_index__);let n=r?t.slice(r):t;for(;this.test(n);)e.push(ke(this,r)),n=n.slice(this.__last_index__),r+=this.__last_index__;return e.length?e:null},De.prototype.matchAtStart=function(t){if(this.__text_cache__=t,this.__index__=-1,!t.length)return null;const e=this.re.schema_at_start.exec(t);if(!e)return null;const r=this.testSchemaAt(t,e[2],e[0].length);return r?(this.__schema__=e[2],this.__index__=e.index+e[1].length,this.__last_index__=e.index+e[0].length+r,ke(this,0)):null},De.prototype.tlds=function(t,e){return t=Array.isArray(t)?t:[t],e?(this.__tlds__=this.__tlds__.concat(t).sort().filter((function(t,e,r){return t!==r[e-1]})).reverse(),me(this),this):(this.__tlds__=t.slice(),this.__tlds_replaced__=!0,me(this),this)},De.prototype.normalize=function(t){t.schema||(t.url="http://"+t.url),"mailto:"!==t.schema||/^mailto:/i.test(t.url)||(t.url="mailto:"+t.url)},De.prototype.onCompile=function(){};const Ce=2147483647,ye=36,Ee=/^xn--/,Ae=/[^\0-\x7F]/,be=/[\x2E\u3002\uFF0E\uFF61]/g,Fe={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},xe=Math.floor,we=String.fromCharCode;function ve(t){throw new RangeError(Fe[t])}function ze(t,e){const r=t.split("@");let n="";r.length>1&&(n=r[0]+"@",t=r[1]);const s=function(t,e){const r=[];let n=t.length;for(;n--;)r[n]=e(t[n]);return r}((t=t.replace(be,".")).split("."),e).join(".");return n+s}function Se(t){const e=[];let r=0;const n=t.length;for(;r<n;){const s=t.charCodeAt(r++);if(s>=55296&&s<=56319&&r<n){const n=t.charCodeAt(r++);56320==(64512&n)?e.push(((1023&s)<<10)+(1023&n)+65536):(e.push(s),r--)}else e.push(s)}return e}const qe=function(t,e){return t+22+75*(t<26)-((0!=e)<<5)},Be=function(t,e,r){let n=0;for(t=r?xe(t/700):t>>1,t+=xe(t/e);t>455;n+=ye)t=xe(t/35);return xe(n+36*t/(t+38))},Le=function(t){const e=[],r=t.length;let n=0,s=128,i=72,o=t.lastIndexOf("-");o<0&&(o=0);for(let r=0;r<o;++r)t.charCodeAt(r)>=128&&ve("not-basic"),e.push(t.charCodeAt(r));for(let c=o>0?o+1:0;c<r;){const o=n;for(let e=1,s=ye;;s+=ye){c>=r&&ve("invalid-input");const o=(u=t.charCodeAt(c++))>=48&&u<58?u-48+26:u>=65&&u<91?u-65:u>=97&&u<123?u-97:ye;o>=ye&&ve("invalid-input"),o>xe((Ce-n)/e)&&ve("overflow"),n+=o*e;const a=s<=i?1:s>=i+26?26:s-i;if(o<a)break;const l=ye-a;e>xe(Ce/l)&&ve("overflow"),e*=l}const a=e.length+1;i=Be(n-o,a,0==o),xe(n/a)>Ce-s&&ve("overflow"),s+=xe(n/a),n%=a,e.splice(n++,0,s)}var u;return String.fromCodePoint(...e)},Ie=function(t){const e=[],r=(t=Se(t)).length;let n=128,s=0,i=72;for(const r of t)r<128&&e.push(we(r));const o=e.length;let u=o;for(o&&e.push("-");u<r;){let r=Ce;for(const e of t)e>=n&&e<r&&(r=e);const c=u+1;r-n>xe((Ce-s)/c)&&ve("overflow"),s+=(r-n)*c,n=r;for(const r of t)if(r<n&&++s>Ce&&ve("overflow"),r===n){let t=s;for(let r=ye;;r+=ye){const n=r<=i?1:r>=i+26?26:r-i;if(t<n)break;const s=t-n,o=ye-n;e.push(we(qe(n+s%o,0))),t=xe(s/o)}e.push(we(qe(t,0))),i=Be(s,c,u===o),s=0,++u}++s,++n}return e.join("")},Me={version:"2.3.1",ucs2:{decode:Se,encode:t=>String.fromCodePoint(...t)},decode:Le,encode:Ie,toASCII:function(t){return ze(t,(function(t){return Ae.test(t)?"xn--"+Ie(t):t}))},toUnicode:function(t){return ze(t,(function(t){return Ee.test(t)?Le(t.slice(4).toLowerCase()):t}))}};const Te={default:{options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"\u201c\u201d\u2018\u2019",highlight:null,maxNesting:100},components:{core:{},block:{},inline:{}}},zero:{options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"\u201c\u201d\u2018\u2019",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["paragraph"]},inline:{rules:["text"],rules2:["balance_pairs","fragments_join"]}}},commonmark:{options:{html:!0,xhtmlOut:!0,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"\u201c\u201d\u2018\u2019",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["blockquote","code","fence","heading","hr","html_block","lheading","list","reference","paragraph"]},inline:{rules:["autolink","backticks","emphasis","entity","escape","html_inline","image","link","newline","text"],rules2:["balance_pairs","emphasis","fragments_join"]}}}},Re=/^(vbscript|javascript|file|data):/,Ne=/^data:image\/(gif|png|jpeg|webp);/;function Pe(t){const e=t.trim().toLowerCase();return!Re.test(e)||Ne.test(e)}const Oe=["http:","https:","mailto:"];function je(t){const e=g(t,!0);if(e.hostname&&(!e.protocol||Oe.indexOf(e.protocol)>=0))try{e.hostname=Me.toASCII(e.hostname)}catch(t){}return n(s(e))}function Ze(t){const r=g(t,!0);if(r.hostname&&(!r.protocol||Oe.indexOf(r.protocol)>=0))try{r.hostname=Me.toUnicode(r.hostname)}catch(t){}return e(s(r),e.defaultChars+"%")}function $e(t,e){if(!(this instanceof $e))return new $e(t,e);e||Z(t)||(e=t||{},t="default"),this.inline=new ue,this.block=new Ht,this.core=new Lt,this.renderer=new ft,this.linkify=new De,this.validateLink=Pe,this.normalizeLink=je,this.normalizeLinkText=Ze,this.utils=lt,this.helpers=U({},ht),this.options={},this.configure(t),e&&this.set(e)}return $e.prototype.set=function(t){return U(this.options,t),this},$e.prototype.configure=function(t){const e=this;if(Z(t)){const e=t;if(!(t=Te[e]))throw new Error('Wrong `markdown-it` preset "'+e+'", check name')}if(!t)throw new Error("Wrong `markdown-it` preset, can't be empty");return t.options&&e.set(t.options),t.components&&Object.keys(t.components).forEach((function(r){t.components[r].rules&&e[r].ruler.enableOnly(t.components[r].rules),t.components[r].rules2&&e[r].ruler2.enableOnly(t.components[r].rules2)})),this},$e.prototype.enable=function(t,e){let r=[];Array.isArray(t)||(t=[t]),["core","block","inline"].forEach((function(e){r=r.concat(this[e].ruler.enable(t,!0))}),this),r=r.concat(this.inline.ruler2.enable(t,!0));const n=t.filter((function(t){return r.indexOf(t)<0}));if(n.length&&!e)throw new Error("MarkdownIt. Failed to enable unknown rule(s): "+n);return this},$e.prototype.disable=function(t,e){let r=[];Array.isArray(t)||(t=[t]),["core","block","inline"].forEach((function(e){r=r.concat(this[e].ruler.disable(t,!0))}),this),r=r.concat(this.inline.ruler2.disable(t,!0));const n=t.filter((function(t){return r.indexOf(t)<0}));if(n.length&&!e)throw new Error("MarkdownIt. Failed to disable unknown rule(s): "+n);return this},$e.prototype.use=function(t){const e=[this].concat(Array.prototype.slice.call(arguments,1));return t.apply(t,e),this},$e.prototype.parse=function(t,e){if("string"!=typeof t)throw new Error("Input data should be a String");const r=new this.core.State(t,this,e);return this.core.process(r),r.tokens},$e.prototype.render=function(t,e){return e=e||{},this.renderer.render(this.parse(t,e),this.options,e)},$e.prototype.parseInline=function(t,e){const r=new this.core.State(t,this,e);return r.inlineMode=!0,this.core.process(r),r.tokens},$e.prototype.renderInline=function(t,e){return e=e||{},this.renderer.render(this.parseInline(t,e),this.options,e)},$e}));
/*! @license DOMPurify 3.3.3 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.3/LICENSE */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).DOMPurify=t()}(this,(function(){"use strict";const{entries:e,setPrototypeOf:t,isFrozen:n,getPrototypeOf:o,getOwnPropertyDescriptor:r}=Object;let{freeze:i,seal:a,create:l}=Object,{apply:c,construct:s}="undefined"!=typeof Reflect&&Reflect;i||(i=function(e){return e}),a||(a=function(e){return e}),c||(c=function(e,t){for(var n=arguments.length,o=new Array(n>2?n-2:0),r=2;r<n;r++)o[r-2]=arguments[r];return e.apply(t,o)}),s||(s=function(e){for(var t=arguments.length,n=new Array(t>1?t-1:0),o=1;o<t;o++)n[o-1]=arguments[o];return new e(...n)});const u=D(Array.prototype.forEach),m=D(Array.prototype.lastIndexOf),p=D(Array.prototype.pop),f=D(Array.prototype.push),d=D(Array.prototype.splice),h=D(String.prototype.toLowerCase),g=D(String.prototype.toString),T=D(String.prototype.match),y=D(String.prototype.replace),E=D(String.prototype.indexOf),A=D(String.prototype.trim),_=D(Object.prototype.hasOwnProperty),b=D(RegExp.prototype.test),S=(N=TypeError,function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return s(N,t)});var N;function D(e){return function(t){t instanceof RegExp&&(t.lastIndex=0);for(var n=arguments.length,o=new Array(n>1?n-1:0),r=1;r<n;r++)o[r-1]=arguments[r];return c(e,t,o)}}function R(e,o){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:h;t&&t(e,null);let i=o.length;for(;i--;){let t=o[i];if("string"==typeof t){const e=r(t);e!==t&&(n(o)||(o[i]=e),t=e)}e[t]=!0}return e}function w(e){for(let t=0;t<e.length;t++){_(e,t)||(e[t]=null)}return e}function C(t){const n=l(null);for(const[o,r]of e(t)){_(t,o)&&(Array.isArray(r)?n[o]=w(r):r&&"object"==typeof r&&r.constructor===Object?n[o]=C(r):n[o]=r)}return n}function O(e,t){for(;null!==e;){const n=r(e,t);if(n){if(n.get)return D(n.get);if("function"==typeof n.value)return D(n.value)}e=o(e)}return function(){return null}}const v=i(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","search","section","select","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),k=i(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","enterkeyhint","exportparts","filter","font","g","glyph","glyphref","hkern","image","inputmode","line","lineargradient","marker","mask","metadata","mpath","part","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),x=i(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),L=i(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),I=i(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),M=i(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),U=i(["#text"]),z=i(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","exportparts","face","for","headers","height","hidden","high","href","hreflang","id","inert","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","part","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","slot","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),P=i(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","mask-type","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),F=i(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),H=i(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),B=a(/\{\{[\w\W]*|[\w\W]*\}\}/gm),G=a(/<%[\w\W]*|[\w\W]*%>/gm),W=a(/\$\{[\w\W]*/gm),Y=a(/^data-[\-\w.\u00B7-\uFFFF]+$/),j=a(/^aria-[\-\w]+$/),X=a(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),q=a(/^(?:\w+script|data):/i),$=a(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),K=a(/^html$/i),V=a(/^[a-z][.\w]*(-[.\w]+)+$/i);var Z=Object.freeze({__proto__:null,ARIA_ATTR:j,ATTR_WHITESPACE:$,CUSTOM_ELEMENT:V,DATA_ATTR:Y,DOCTYPE_NAME:K,ERB_EXPR:G,IS_ALLOWED_URI:X,IS_SCRIPT_OR_DATA:q,MUSTACHE_EXPR:B,TMPLIT_EXPR:W});const J=1,Q=3,ee=7,te=8,ne=9,oe=function(){return"undefined"==typeof window?null:window};var re=function t(){let n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:oe();const o=e=>t(e);if(o.version="3.3.3",o.removed=[],!n||!n.document||n.document.nodeType!==ne||!n.Element)return o.isSupported=!1,o;let{document:r}=n;const a=r,c=a.currentScript,{DocumentFragment:s,HTMLTemplateElement:N,Node:D,Element:w,NodeFilter:B,NamedNodeMap:G=n.NamedNodeMap||n.MozNamedAttrMap,HTMLFormElement:W,DOMParser:Y,trustedTypes:j}=n,q=w.prototype,$=O(q,"cloneNode"),V=O(q,"remove"),re=O(q,"nextSibling"),ie=O(q,"childNodes"),ae=O(q,"parentNode");if("function"==typeof N){const e=r.createElement("template");e.content&&e.content.ownerDocument&&(r=e.content.ownerDocument)}let le,ce="";const{implementation:se,createNodeIterator:ue,createDocumentFragment:me,getElementsByTagName:pe}=r,{importNode:fe}=a;let de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]};o.isSupported="function"==typeof e&&"function"==typeof ae&&se&&void 0!==se.createHTMLDocument;const{MUSTACHE_EXPR:he,ERB_EXPR:ge,TMPLIT_EXPR:Te,DATA_ATTR:ye,ARIA_ATTR:Ee,IS_SCRIPT_OR_DATA:Ae,ATTR_WHITESPACE:_e,CUSTOM_ELEMENT:be}=Z;let{IS_ALLOWED_URI:Se}=Z,Ne=null;const De=R({},[...v,...k,...x,...I,...U]);let Re=null;const we=R({},[...z,...P,...F,...H]);let Ce=Object.seal(l(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Oe=null,ve=null;const ke=Object.seal(l(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}}));let xe=!0,Le=!0,Ie=!1,Me=!0,Ue=!1,ze=!0,Pe=!1,Fe=!1,He=!1,Be=!1,Ge=!1,We=!1,Ye=!0,je=!1,Xe=!0,qe=!1,$e={},Ke=null;const Ve=R({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]);let Ze=null;const Je=R({},["audio","video","img","source","image","track"]);let Qe=null;const et=R({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),tt="http://www.w3.org/1998/Math/MathML",nt="http://www.w3.org/2000/svg",ot="http://www.w3.org/1999/xhtml";let rt=ot,it=!1,at=null;const lt=R({},[tt,nt,ot],g);let ct=R({},["mi","mo","mn","ms","mtext"]),st=R({},["annotation-xml"]);const ut=R({},["title","style","font","a","script"]);let mt=null;const pt=["application/xhtml+xml","text/html"];let ft=null,dt=null;const ht=r.createElement("form"),gt=function(e){return e instanceof RegExp||e instanceof Function},Tt=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(!dt||dt!==e){if(e&&"object"==typeof e||(e={}),e=C(e),mt=-1===pt.indexOf(e.PARSER_MEDIA_TYPE)?"text/html":e.PARSER_MEDIA_TYPE,ft="application/xhtml+xml"===mt?g:h,Ne=_(e,"ALLOWED_TAGS")?R({},e.ALLOWED_TAGS,ft):De,Re=_(e,"ALLOWED_ATTR")?R({},e.ALLOWED_ATTR,ft):we,at=_(e,"ALLOWED_NAMESPACES")?R({},e.ALLOWED_NAMESPACES,g):lt,Qe=_(e,"ADD_URI_SAFE_ATTR")?R(C(et),e.ADD_URI_SAFE_ATTR,ft):et,Ze=_(e,"ADD_DATA_URI_TAGS")?R(C(Je),e.ADD_DATA_URI_TAGS,ft):Je,Ke=_(e,"FORBID_CONTENTS")?R({},e.FORBID_CONTENTS,ft):Ve,Oe=_(e,"FORBID_TAGS")?R({},e.FORBID_TAGS,ft):C({}),ve=_(e,"FORBID_ATTR")?R({},e.FORBID_ATTR,ft):C({}),$e=!!_(e,"USE_PROFILES")&&e.USE_PROFILES,xe=!1!==e.ALLOW_ARIA_ATTR,Le=!1!==e.ALLOW_DATA_ATTR,Ie=e.ALLOW_UNKNOWN_PROTOCOLS||!1,Me=!1!==e.ALLOW_SELF_CLOSE_IN_ATTR,Ue=e.SAFE_FOR_TEMPLATES||!1,ze=!1!==e.SAFE_FOR_XML,Pe=e.WHOLE_DOCUMENT||!1,Be=e.RETURN_DOM||!1,Ge=e.RETURN_DOM_FRAGMENT||!1,We=e.RETURN_TRUSTED_TYPE||!1,He=e.FORCE_BODY||!1,Ye=!1!==e.SANITIZE_DOM,je=e.SANITIZE_NAMED_PROPS||!1,Xe=!1!==e.KEEP_CONTENT,qe=e.IN_PLACE||!1,Se=e.ALLOWED_URI_REGEXP||X,rt=e.NAMESPACE||ot,ct=e.MATHML_TEXT_INTEGRATION_POINTS||ct,st=e.HTML_INTEGRATION_POINTS||st,Ce=e.CUSTOM_ELEMENT_HANDLING||{},e.CUSTOM_ELEMENT_HANDLING&&gt(e.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(Ce.tagNameCheck=e.CUSTOM_ELEMENT_HANDLING.tagNameCheck),e.CUSTOM_ELEMENT_HANDLING&&gt(e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(Ce.attributeNameCheck=e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),e.CUSTOM_ELEMENT_HANDLING&&"boolean"==typeof e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements&&(Ce.allowCustomizedBuiltInElements=e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),Ue&&(Le=!1),Ge&&(Be=!0),$e&&(Ne=R({},U),Re=l(null),!0===$e.html&&(R(Ne,v),R(Re,z)),!0===$e.svg&&(R(Ne,k),R(Re,P),R(Re,H)),!0===$e.svgFilters&&(R(Ne,x),R(Re,P),R(Re,H)),!0===$e.mathMl&&(R(Ne,I),R(Re,F),R(Re,H))),_(e,"ADD_TAGS")||(ke.tagCheck=null),_(e,"ADD_ATTR")||(ke.attributeCheck=null),e.ADD_TAGS&&("function"==typeof e.ADD_TAGS?ke.tagCheck=e.ADD_TAGS:(Ne===De&&(Ne=C(Ne)),R(Ne,e.ADD_TAGS,ft))),e.ADD_ATTR&&("function"==typeof e.ADD_ATTR?ke.attributeCheck=e.ADD_ATTR:(Re===we&&(Re=C(Re)),R(Re,e.ADD_ATTR,ft))),e.ADD_URI_SAFE_ATTR&&R(Qe,e.ADD_URI_SAFE_ATTR,ft),e.FORBID_CONTENTS&&(Ke===Ve&&(Ke=C(Ke)),R(Ke,e.FORBID_CONTENTS,ft)),e.ADD_FORBID_CONTENTS&&(Ke===Ve&&(Ke=C(Ke)),R(Ke,e.ADD_FORBID_CONTENTS,ft)),Xe&&(Ne["#text"]=!0),Pe&&R(Ne,["html","head","body"]),Ne.table&&(R(Ne,["tbody"]),delete Oe.tbody),e.TRUSTED_TYPES_POLICY){if("function"!=typeof e.TRUSTED_TYPES_POLICY.createHTML)throw S('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if("function"!=typeof e.TRUSTED_TYPES_POLICY.createScriptURL)throw S('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');le=e.TRUSTED_TYPES_POLICY,ce=le.createHTML("")}else void 0===le&&(le=function(e,t){if("object"!=typeof e||"function"!=typeof e.createPolicy)return null;let n=null;const o="data-tt-policy-suffix";t&&t.hasAttribute(o)&&(n=t.getAttribute(o));const r="dompurify"+(n?"#"+n:"");try{return e.createPolicy(r,{createHTML:e=>e,createScriptURL:e=>e})}catch(e){return console.warn("TrustedTypes policy "+r+" could not be created."),null}}(j,c)),null!==le&&"string"==typeof ce&&(ce=le.createHTML(""));i&&i(e),dt=e}},yt=R({},[...k,...x,...L]),Et=R({},[...I,...M]),At=function(e){f(o.removed,{element:e});try{ae(e).removeChild(e)}catch(t){V(e)}},_t=function(e,t){try{f(o.removed,{attribute:t.getAttributeNode(e),from:t})}catch(e){f(o.removed,{attribute:null,from:t})}if(t.removeAttribute(e),"is"===e)if(Be||Ge)try{At(t)}catch(e){}else try{t.setAttribute(e,"")}catch(e){}},bt=function(e){let t=null,n=null;if(He)e="<remove></remove>"+e;else{const t=T(e,/^[\r\n\t ]+/);n=t&&t[0]}"application/xhtml+xml"===mt&&rt===ot&&(e='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+e+"</body></html>");const o=le?le.createHTML(e):e;if(rt===ot)try{t=(new Y).parseFromString(o,mt)}catch(e){}if(!t||!t.documentElement){t=se.createDocument(rt,"template",null);try{t.documentElement.innerHTML=it?ce:o}catch(e){}}const i=t.body||t.documentElement;return e&&n&&i.insertBefore(r.createTextNode(n),i.childNodes[0]||null),rt===ot?pe.call(t,Pe?"html":"body")[0]:Pe?t.documentElement:i},St=function(e){return ue.call(e.ownerDocument||e,e,B.SHOW_ELEMENT|B.SHOW_COMMENT|B.SHOW_TEXT|B.SHOW_PROCESSING_INSTRUCTION|B.SHOW_CDATA_SECTION,null)},Nt=function(e){return e instanceof W&&("string"!=typeof e.nodeName||"string"!=typeof e.textContent||"function"!=typeof e.removeChild||!(e.attributes instanceof G)||"function"!=typeof e.removeAttribute||"function"!=typeof e.setAttribute||"string"!=typeof e.namespaceURI||"function"!=typeof e.insertBefore||"function"!=typeof e.hasChildNodes)},Dt=function(e){return"function"==typeof D&&e instanceof D};function Rt(e,t,n){u(e,(e=>{e.call(o,t,n,dt)}))}const wt=function(e){let t=null;if(Rt(de.beforeSanitizeElements,e,null),Nt(e))return At(e),!0;const n=ft(e.nodeName);if(Rt(de.uponSanitizeElement,e,{tagName:n,allowedTags:Ne}),ze&&e.hasChildNodes()&&!Dt(e.firstElementChild)&&b(/<[/\w!]/g,e.innerHTML)&&b(/<[/\w!]/g,e.textContent))return At(e),!0;if(e.nodeType===ee)return At(e),!0;if(ze&&e.nodeType===te&&b(/<[/\w]/g,e.data))return At(e),!0;if(!(ke.tagCheck instanceof Function&&ke.tagCheck(n))&&(!Ne[n]||Oe[n])){if(!Oe[n]&&Ot(n)){if(Ce.tagNameCheck instanceof RegExp&&b(Ce.tagNameCheck,n))return!1;if(Ce.tagNameCheck instanceof Function&&Ce.tagNameCheck(n))return!1}if(Xe&&!Ke[n]){const t=ae(e)||e.parentNode,n=ie(e)||e.childNodes;if(n&&t){for(let o=n.length-1;o>=0;--o){const r=$(n[o],!0);r.__removalCount=(e.__removalCount||0)+1,t.insertBefore(r,re(e))}}}return At(e),!0}return e instanceof w&&!function(e){let t=ae(e);t&&t.tagName||(t={namespaceURI:rt,tagName:"template"});const n=h(e.tagName),o=h(t.tagName);return!!at[e.namespaceURI]&&(e.namespaceURI===nt?t.namespaceURI===ot?"svg"===n:t.namespaceURI===tt?"svg"===n&&("annotation-xml"===o||ct[o]):Boolean(yt[n]):e.namespaceURI===tt?t.namespaceURI===ot?"math"===n:t.namespaceURI===nt?"math"===n&&st[o]:Boolean(Et[n]):e.namespaceURI===ot?!(t.namespaceURI===nt&&!st[o])&&!(t.namespaceURI===tt&&!ct[o])&&!Et[n]&&(ut[n]||!yt[n]):!("application/xhtml+xml"!==mt||!at[e.namespaceURI]))}(e)?(At(e),!0):"noscript"!==n&&"noembed"!==n&&"noframes"!==n||!b(/<\/no(script|embed|frames)/i,e.innerHTML)?(Ue&&e.nodeType===Q&&(t=e.textContent,u([he,ge,Te],(e=>{t=y(t,e," ")})),e.textContent!==t&&(f(o.removed,{element:e.cloneNode()}),e.textContent=t)),Rt(de.afterSanitizeElements,e,null),!1):(At(e),!0)},Ct=function(e,t,n){if(ve[t])return!1;if(Ye&&("id"===t||"name"===t)&&(n in r||n in ht))return!1;if(Le&&!ve[t]&&b(ye,t));else if(xe&&b(Ee,t));else if(ke.attributeCheck instanceof Function&&ke.attributeCheck(t,e));else if(!Re[t]||ve[t]){if(!(Ot(e)&&(Ce.tagNameCheck instanceof RegExp&&b(Ce.tagNameCheck,e)||Ce.tagNameCheck instanceof Function&&Ce.tagNameCheck(e))&&(Ce.attributeNameCheck instanceof RegExp&&b(Ce.attributeNameCheck,t)||Ce.attributeNameCheck instanceof Function&&Ce.attributeNameCheck(t,e))||"is"===t&&Ce.allowCustomizedBuiltInElements&&(Ce.tagNameCheck instanceof RegExp&&b(Ce.tagNameCheck,n)||Ce.tagNameCheck instanceof Function&&Ce.tagNameCheck(n))))return!1}else if(Qe[t]);else if(b(Se,y(n,_e,"")));else if("src"!==t&&"xlink:href"!==t&&"href"!==t||"script"===e||0!==E(n,"data:")||!Ze[e]){if(Ie&&!b(Ae,y(n,_e,"")));else if(n)return!1}else;return!0},Ot=function(e){return"annotation-xml"!==e&&T(e,be)},vt=function(e){Rt(de.beforeSanitizeAttributes,e,null);const{attributes:t}=e;if(!t||Nt(e))return;const n={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:Re,forceKeepAttr:void 0};let r=t.length;for(;r--;){const i=t[r],{name:a,namespaceURI:l,value:c}=i,s=ft(a),m=c;let f="value"===a?m:A(m);if(n.attrName=s,n.attrValue=f,n.keepAttr=!0,n.forceKeepAttr=void 0,Rt(de.uponSanitizeAttribute,e,n),f=n.attrValue,!je||"id"!==s&&"name"!==s||(_t(a,e),f="user-content-"+f),ze&&b(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,f)){_t(a,e);continue}if("attributename"===s&&T(f,"href")){_t(a,e);continue}if(n.forceKeepAttr)continue;if(!n.keepAttr){_t(a,e);continue}if(!Me&&b(/\/>/i,f)){_t(a,e);continue}Ue&&u([he,ge,Te],(e=>{f=y(f,e," ")}));const d=ft(e.nodeName);if(Ct(d,s,f)){if(le&&"object"==typeof j&&"function"==typeof j.getAttributeType)if(l);else switch(j.getAttributeType(d,s)){case"TrustedHTML":f=le.createHTML(f);break;case"TrustedScriptURL":f=le.createScriptURL(f)}if(f!==m)try{l?e.setAttributeNS(l,a,f):e.setAttribute(a,f),Nt(e)?At(e):p(o.removed)}catch(t){_t(a,e)}}else _t(a,e)}Rt(de.afterSanitizeAttributes,e,null)},kt=function e(t){let n=null;const o=St(t);for(Rt(de.beforeSanitizeShadowDOM,t,null);n=o.nextNode();)Rt(de.uponSanitizeShadowNode,n,null),wt(n),vt(n),n.content instanceof s&&e(n.content);Rt(de.afterSanitizeShadowDOM,t,null)};return o.sanitize=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=null,r=null,i=null,l=null;if(it=!e,it&&(e="\x3c!--\x3e"),"string"!=typeof e&&!Dt(e)){if("function"!=typeof e.toString)throw S("toString is not a function");if("string"!=typeof(e=e.toString()))throw S("dirty is not a string, aborting")}if(!o.isSupported)return e;if(Fe||Tt(t),o.removed=[],"string"==typeof e&&(qe=!1),qe){if(e.nodeName){const t=ft(e.nodeName);if(!Ne[t]||Oe[t])throw S("root node is forbidden and cannot be sanitized in-place")}}else if(e instanceof D)n=bt("\x3c!----\x3e"),r=n.ownerDocument.importNode(e,!0),r.nodeType===J&&"BODY"===r.nodeName||"HTML"===r.nodeName?n=r:n.appendChild(r);else{if(!Be&&!Ue&&!Pe&&-1===e.indexOf("<"))return le&&We?le.createHTML(e):e;if(n=bt(e),!n)return Be?null:We?ce:""}n&&He&&At(n.firstChild);const c=St(qe?e:n);for(;i=c.nextNode();)wt(i),vt(i),i.content instanceof s&&kt(i.content);if(qe)return e;if(Be){if(Ge)for(l=me.call(n.ownerDocument);n.firstChild;)l.appendChild(n.firstChild);else l=n;return(Re.shadowroot||Re.shadowrootmode)&&(l=fe.call(a,l,!0)),l}let m=Pe?n.outerHTML:n.innerHTML;return Pe&&Ne["!doctype"]&&n.ownerDocument&&n.ownerDocument.doctype&&n.ownerDocument.doctype.name&&b(K,n.ownerDocument.doctype.name)&&(m="<!DOCTYPE "+n.ownerDocument.doctype.name+">\n"+m),Ue&&u([he,ge,Te],(e=>{m=y(m,e," ")})),le&&We?le.createHTML(m):m},o.setConfig=function(){Tt(arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}),Fe=!0},o.clearConfig=function(){dt=null,Fe=!1},o.isValidAttribute=function(e,t,n){dt||Tt({});const o=ft(e),r=ft(t);return Ct(o,r,n)},o.addHook=function(e,t){"function"==typeof t&&f(de[e],t)},o.removeHook=function(e,t){if(void 0!==t){const n=m(de[e],t);return-1===n?void 0:d(de[e],n,1)[0]}return p(de[e])},o.removeHooks=function(e){de[e]=[]},o.removeAllHooks=function(){de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},o}();return re}));
//# sourceMappingURL=purify.min.js.map
/* Fiche de personnage Outward — page « Personnage » du site, et fiche de
 * l'extension Roll20 (la coquille signée sert docs/roll20-fiche.html, qui
 * charge ce bundle d'après docs/owd-manifeste.json).
 *
 * Mise en page « dossier », la même qu'en HxH et en JJK : barre d'outils avec
 * la bibliothèque (site seulement), feuille à largeur fixe, en-tête portrait +
 * identité + compteurs de budgets, onglets, colonnes, valeurs cliquables qui
 * lancent les jets dans le tchat Roll20.
 *
 * TROIS onglets, et pas un de plus :
 *   Fiche       les huit caractéristiques, les capacités dérivées (PV, PE, PM,
 *               PI, PR, PS, PH), l'exposition, l'effondrement, la rupture,
 *               TOUTES les compétences d'un coup, et les techniques ;
 *   Inventaire  armes, charge et contenance, vêtements, bourse, et
 *               l'inventaire illustré par groupes ;
 *   Options     les leviers du MJ (forçages et modificateurs), les réglages
 *               d'envoi, l'export/import, le plan des modules et les mods.
 *
 * Chaque bloc de la fiche est un MODULE : un id stable, un onglet, une colonne,
 * un build() qui RETOURNE son élément. C'est ce qui permet de le déplacer
 * (bloc Modules), de le couper, de le museler quand il jette, et à un mod de le
 * remplacer sans qu'on rouvre ce fichier.
 *
 * Chaque module éditable porte un rouage : la CONSTRUCTION du personnage est
 * verrouillée hors édition (rangs, achats, forçages, modificateurs, textes),
 * seuls les gestes de JEU restent actifs (jets, envois au tchat, jauges
 * courantes, quantités d'objets, bourse, contenance).
 *
 * LES RÈGLES NE S'AFFICHENT PAS. Pas de table de récupération, pas de table du
 * froid ni du chaud, pas de table des milieux, pas de barème de prix, pas de
 * table de l'effondrement. La fiche CALCULE avec elles ; les infobulles
 * décomposent le calcul, le DOM ne montre aucun barème. Seule exception : les
 * avertissements, qui disent l'ÉTAT du personnage (« PE MAX à zéro :
 * inconscient »), jamais une règle.
 *
 * Le contenu des règles (caractéristiques, rangs, capacités et leurs formules,
 * effondrement, climat, armes, types de dégâts) vient de owd-creation.json,
 * produit AU BUILD par hooks/owd_creation.py depuis docs/content/regles/. Rien
 * de ce qui est une valeur de règle ne s'écrit ici : les données viennent des
 * règles, jamais du code.
 *
 * Persistance : STORE (« owd-perso » l'état, « owd-cards » la carte calculée,
 * « owd-persos » la bibliothèque). Dans Roll20, owd-roll20-boot.js pose AVANT
 * ce script :
 *   - window.__owdLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__owdCompact : affichage condensé, pas de bibliothèque ;
 *   - window.__owdChat / __owdRoll / __owdSay / __owdTake / __owdPlayers :
 *     les SEULS canaux du pont. LE PAQUET EST SIGNÉ ET GELÉ : un message de
 *     plus coûterait une re-signature chez Mozilla, dont le quota est très
 *     serré. On compose donc les commandes ICI et on les passe telles quelles.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__owdCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20,
  // l'amorce pose window.__owdLocalStorage (shim -> Attributes Roll20) avant ce
  // script. Tous les appels sont sous try/catch : STORE peut être nul (stockage
  // refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__owdLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte, et les deux sont
  // INDÉPENDANTS : le schéma est un entier libre que rien ne déduit du majeur
  // de la release. Un mod qui ferait parseInt(Owd.version) pour en tirer le
  // schéma se tromperait à la première divergence.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens. Ajouter une clé racine avec un défaut n'en est pas un : normalize()
  // la complète et ne purge aucune clé racine inconnue, donc une telle fiche
  // s'ouvre dans les deux sens sans migration.
  //
  // Le suffixe « b » marque la beta. Il ne change PAS le rang : « 1.0.0b » et
  // « 1.0.0 » sont de même version, la beta étant ce que le site public
  // recevra à la fusion. Les TROIS porteurs du numéro montent ensemble :
  // docs/owd-manifeste.json, RELEASE ici, RELEASE_DEFAUT de owd-attr-map.js.
  var RELEASE = "4.22.0b";
  var SCHEMA = 18;

  // Les modificateurs d'Outward se règlent de 1 en 1 : l'échelle des
  // caractéristiques est ouverte mais serrée (20 est la moyenne humaine), un
  // pas de 5 y serait un bond.
  var MOD_PAS = 1;

  // La borne d'un FACTEUR de la chaîne à neuf boîtes. Elle n'est pas celle d'un
  // ajout : ×1000 sur un maximum de points de repos dépasserait le million, et
  // un nombre qu'on ne peut plus lire n'est plus un réglage.
  var MULT_BORNE = 999;

  // LES HUIT CARACTÉRISTIQUES. Les CLÉS sont SANS ACCENT : elles voyagent en
  // nom d'attribut Roll20 et en fragment de macro (@{Perso|owd_resistance}),
  // deux endroits où un accent ne passe pas. Les libellés accentués vivent
  // dans LIBELLES_CARAC, jamais dans l'état.
  //
  // Cette liste est le SOCLE de blank(), et le miroir exact de celle de
  // owd-attr-map.js : c'est à ce titre qu'elle est écrite ici, et non pour
  // doubler les règles. L'ORDRE D'AFFICHAGE et les libellés, eux, viennent de
  // DATA.caracs dès que le jeu de données est là (voir caracsOrdre) ; une
  // caractéristique ajoutée demain dans les règles arrive donc sans qu'on
  // rouvre ce fichier, normalize() lui posant sa valeur de départ.
  var CARACS = ["Force", "Dexterite", "Intelligence", "Ferveur",
                "Vigueur", "Endurance", "Resistance", "Chance"];
  var LIBELLES_CARAC = {
    Force: "Force", Dexterite: "Dextérité", Intelligence: "Intelligence",
    Ferveur: "Ferveur", Vigueur: "Vigueur", Endurance: "Endurance",
    Resistance: "Résistance", Chance: "Chance"
  };
  var ABBR = {
    Force: "FOR", Dexterite: "DEX", Intelligence: "INT", Ferveur: "FER",
    Vigueur: "VIG", Endurance: "END", Resistance: "RES", Chance: "CHA"
  };

  // Trois emplacements de modificateur, fantômes au repos, révélés par le
  // survol de leur hôte : le geste de la fiche HxH. Un seul champ obligeait à
  // sommer de tête avant d'écrire, et à défaire le calcul pour retirer l'un
  // des trois.
  var MMOD_SLOTS = ["équipement", "technique", "autre"];

  // LE DÉ DES JETS. Tous les dés d'Outward sont des d8 : le champ reste
  // modifiable parce que c'est un réglage de table, pas une règle que la fiche
  // imposerait.
  var DE_DEFAUT = "1d8";

  // Le bloc des réglages de disposition, nommé une fois pour toutes : trois
  // endroits doivent l'épargner (activeModule, monteModules, blocEnPanne), et
  // un id recopié à la main finirait par manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // owd-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__owdDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un rang renommé suffirait à
  // trahir la version qu'on croit rejouer.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__owdDataUrl : null;
    return u || (siteBase() + "owd-creation-runtime.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids, encombrance, quantités, prix : décimal positif, virgule tolérée,
  // arrondi au MILLIÈME (un objet peut peser 0.001 kg)
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0;
  }
  // PRIX DE VENTE d'un objet : null veut dire « automatique », le tiers du
  // prix d'achat arrondi à l'inférieur. Un nombre saisi, 0 compris, prime.
  function venteNum(v) {
    return v == null || String(v).trim() === "" ? null : pnum(v);
  }
  function prixVente(it) {
    return it.vente == null ? (it.achat == null ? null : Math.max(0, Math.floor(pnum(it.achat) / 3))) : pnum(it.vente);
  }
  function prixObjetTexte(it, vente) {
    if(it.commerce==="non-commercialise")return "Non commercialisé";
    var v=vente?prixVente(it):it.achat;
    return v==null?"Prix non renseigné":fmtP(v)+" "+monnaie(true);
  }
  // nombre SIGNÉ (l'exposition va de −120 à +120) : même tolérance, sans plancher
  function snum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  // Entrées signées : utilisées notamment par les restaurations et effets
  // des Solides, Pâtes et Liquides. Les deux fonctions doivent appartenir au
  // socle commun : un appel sans définition interrompait le rendu du panneau.
  function champNombreSigne(input) {
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.spellcheck = false;
    return input;
  }
  function litNombreSigne(value) {
    var texte = String(value == null ? "" : value).trim()
      .replace(/[\u2212\u2013\u2014]/g, "-").replace(/\s+/g, "").replace(",", ".");
    // Durant la saisie, un '-' ou '+' isolé ne doit pas écrire zéro dans
    // l'état. L'utilisateur peut terminer son nombre avant la sauvegarde.
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(texte)) return NaN;
    var n = Number(texte);
    return isFinite(n) ? n : NaN;
  }
  // affichage : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 1000) / 1000); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements, sommés dans
  // la valeur effective. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  // Le signe s'écrit avec le VRAI moins typographique en négatif (« −3 ») et le
  // plus ordinaire en positif : c'est la convention du livre, et elle vaut
  // aussi pour l'écran.
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  // Identifiant STABLE d'une entrée (compétence, technique, arme, geste,
  // vêtement, objet). Il naît une fois et ne se réécrit jamais : c'est lui qui
  // relie une arme à sa compétence et un objet donné à son jumeau chez l'autre
  // joueur. Le compteur écarte les collisions du même millième de seconde.
  var idSeq = 0;
  function uid(prefixe) {
    idSeq++;
    return (prefixe || "x") + Date.now().toString(36) + idSeq.toString(36);
  }
  // Comparaison de noms insensible à la casse ET aux accents : « Épée » et
  // « epee » sont le même nom pour un refus de doublon.
  function pli(s) {
    s = String(s == null ? "" : s).trim().toLowerCase();
    try { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    catch (e) { return s; }   // vieux moteur : la casse suffit
  }
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs
  // (mod, état importé). Sans elle, un nom comme « toString » répond « oui »
  // depuis Object.prototype, et la suite manipule une méthode en croyant tenir
  // une donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

  // ---------- le jeu de données ----------
  // Tout ce qui suit LIT owd-creation.json et n'invente rien. Une clé absente
  // rend une valeur neutre (liste vide, null) : le bloc qui s'en sert affiche
  // alors un vide honnête plutôt qu'un chiffre inventé qui passerait pour une
  // règle du livre.
  function D() { return DATA || {}; }
  function caracsData() { return Array.isArray(D().caracs) ? D().caracs : []; }
  // Ordre demandé dans le module Caractéristiques et dans les prérequis.
  // Les éventuelles caractéristiques supplémentaires des règles restent visibles.
  function caracsOrdre() {
    var out = [], vus = {};
    ["Force", "Dexterite", "Vigueur", "Endurance", "Resistance", "Ferveur", "Intelligence", "Chance"]
      .concat(caracsData().map(function (c) { return c && c.cle; }))
      .concat(CARACS, state ? Object.keys(state.caracs || {}) : [])
      .forEach(function (k) {
        if (k && !vus[k]) { vus[k] = 1; out.push(k); }
      });
    return out;
  }
  function libCarac(c) {
    var d = null;
    caracsData().forEach(function (x) { if (x && x.cle === c) d = x; });
    return (d && d.libelle) || LIBELLES_CARAC[c] || c;
  }
  function abbrCarac(c) {
    var d = null;
    caracsData().forEach(function (x) { if (x && x.cle === c) d = x; });
    return (d && d.abbr) || ABBR[c] || String(c).slice(0, 3).toUpperCase();
  }
  // Les rangs de compétence, du 0 (non initié) au Rang Max. Dés, bonus, prix et
  // point de rupture viennent tous d'ici : AUCUN barème n'est écrit dans ce
  // fichier, et aucune table n'est affichée — ce sont les infobulles des crans
  // qui portent la décomposition.
  function rangs() { return Array.isArray(D().rangs) ? D().rangs : []; }
  function rangMax() { return Math.max(0, rangs().length - 1); }
  function rangInfo(i) {
    var r = rangs();
    if (!r.length) return { rang: 0, nom: "", des: 0, bonus: 0, xp: 0, rupture: 0, initiale: "?" };
    return r[clamp(num(i, 0), 0, r.length - 1)];
  }
  function rangInitiale(r) {
    if (r && r.initiale) return String(r.initiale).charAt(0).toUpperCase();
    return String((r && r.nom) || "?").charAt(0).toUpperCase();
  }
  // L'infobulle d'un cran : le rang COMPLET, tel que les règles le donnent.
  // C'est le seul endroit où le barème paraît, et il ne paraît qu'au survol.
  function rangTitre(r) {
    if (!r) return "";
    var t = (r.nom || "Rang " + r.rang) + " — Rang " + r.rang +
            " · " + r.des + (r.des > 1 ? " dés" : " dé") +
            " · " + sign(r.bonus || 0);
    if (r.xp) t += " · " + r.xp + " XP";
    if (r.rupture) t += " · " + r.rupture + " point de rupture";
    return t;
  }
  function faces() { var n = num((D().des || {}).faces, 8); return n > 1 ? n : 8; }
  function deDe(n) { return String(n) + "d" + faces(); }
  // Dés d'action reçus par tour, et ce qu'une technique peut en engager.
  function desActionBase() { return num((D().des || {}).actionParTour, 0); }
  function desTechnique() { return num((D().des || {}).techniqueMax, desActionBase()); }
  function rupturePoints() { return num((D().rupture || {}).points, 0); }
  // La définition d'une capacité dérivée : base, caractéristique, facteur ou
  // diviseur, et la formule VERBATIM du livre (que la fiche n'affiche pas,
  // mais dont elle se sert pour décomposer une infobulle).
  function capacites() { return Array.isArray(D().capacites) ? D().capacites : []; }
  function capDef(cle) {
    var out = null;
    capacites().forEach(function (c) { if (c && c.cle === cle) out = c; });
    return out;
  }
  function libCap(cle, repli) {
    var d = capDef(cle);
    return (d && d.libelle) || repli || cle;
  }
  function abbrCap(cle, repli) {
    var d = capDef(cle);
    return (d && d.abbr) || repli || String(cle).toUpperCase();
  }
  function effDef() { return D().effondrement || {}; }
  function climatDef() { return D().climat || {}; }
  function monnaie(pluriel) {
    var m = D().monnaie || {};
    return (pluriel ? m.pluriel : m.nom) || (pluriel ? "pièces d'argent" : "pièce d'argent");
  }
  function typesDegats() { return Array.isArray(D().typesDegats) ? D().typesDegats : []; }
  function armesData() { return Array.isArray(D().armes) ? D().armes : []; }


  function decodeRuntimeData(d){
    if(!d||d.format!=='owd-runtime-1')return d;
    if(!d.data||!d.catalogue)throw Error('Données communes incomplètes.');
    var out=Object.assign({},d.data);
    ['equipements','consommables'].forEach(function(k){var t=d.catalogue[k];if(!t||!Array.isArray(t.lignes)||!t.defauts)throw Error('Catalogue incomplet.');out[k]=t.lignes.map(function(row){return Object.assign({},t.defauts,row);});});
    return out;
  }
  // ---------- état ----------
  // L'état VIERGE, et la SEULE table qui fasse autorité sur les clés racine.
  // Trois règles tiennent ce bloc, et chacune a déjà coûté quelque chose :
  //   - toute clé ajoutée ici doit arriver dans SCALARS ou COLLECTIONS de
  //     owd-attr-map.js, sinon le chemin de repli (une fiche relue sans
  //     owd_state) la perd EN SILENCE ;
  //   - ajouter une clé racine avec un défaut ne fait PAS monter le SCHEMA :
  //     normalize() complète une clé absente et ne purge aucune clé racine
  //     inconnue, donc une telle fiche s'ouvre dans les deux sens sans migration ;
  //   - les cartes ÉPARSES ({} au départ) ne se matérialisent que le jour où le
  //     joueur y range quelque chose : une carte pleine de zéros voyagerait
  //     jusque dans les Attributes Roll20 sans rien dire de plus qu'un vide.
  function blank() {
    return {
      // v porte le SCHÉMA, rel la release lisible. Les deux voyagent : une
      // fiche relue sans eux repartirait en schéma 1, c'est-à-dire qu'elle se
      // ferait re-migrer indéfiniment.
      v: SCHEMA, rel: RELEASE,

      // ---- identité ----
      name: "", portrait: "", espece: "", taille: "moyenne", age: "", sexe: "", genre: "",
      background: "", notes: { format: 1, messages: [] },

      // ---- expérience ----
      // Les règles ne donnent AUCUNE dotation de départ : le total part à zéro
      // et se saisit dans l'en-tête. Le dépensé, lui, se CALCULE (rangs des
      // compétences + coût saisi des techniques + points de caractéristique
      // achetés) et ne se range jamais ici :
      // deux endroits pour dire la même chose finiraient par se contredire.
      xpTotal: 0,

      // ---- caractéristiques ----
      // Les CLÉS sont SANS ACCENT : elles voyagent en nom d'attribut Roll20 et
      // en fragment de macro (@{Perso|owd_resistance}). Les libellés accentués
      // vivent dans LIBELLES_CARAC, jamais dans l'état.
      // 20 est la moyenne humaine ; l'échelle n'a pas de plafond et la fiche
      // n'en invente pas — aucune borne haute n'est écrite ici.
      caracs: { Force: 20, Dexterite: 20, Intelligence: 20, Ferveur: 20,
                Vigueur: 20, Endurance: 20, Resistance: 20, Chance: 20 },
      // LES POINTS ACHETÉS À L'EXPÉRIENCE, par caractéristique, à part de la
      // répartition de création que porte `caracs`. Deux cartes et non une
      // valeur : le prix d'un point dépend de la valeur qu'il fait atteindre,
      // et la création se contrôle contre son propre budget. Le coût en XP se
      // CALCULE (owd-creation.json, progressionCarac) et ne se range jamais.
      // ÉPARSE : une caractéristique à 0 point acheté n'y figure pas.
      caracsXp: {},
      // LES LEVIERS DU MENEUR, en TABLE À TROIS NIVEAUX : levier, puis boîte,
      // puis caractéristique. Un seul levier ici, « total », et ses neuf boîtes :
      //     forçage  |  a1 a2  ×  m1 m2  |  a3 a4  ×  m3 m4
      // soit  (((base + a1 + a2) × m1 × m2) + a3 + a4) × m3 × m4,
      // et le forçage court-circuite tout.
      //
      // QUATRE GROUPES ET NON TROIS : trois ne savent pas dire « ajoute 20 puis
      // double le tout ». L'ordre DANS un groupe, lui, est sans effet.
      //
      // ÉPARSE À SES TROIS NIVEAUX : rien ne se matérialise à la lecture, et le
      // chemin se DÉFAIT quand sa dernière valeur s'en va. Sans quoi ouvrir les
      // Options écrirait toutes les sous-tables dans un personnage qui voyage
      // dans UN attribut Roll20.
      caracsLeviers: {},

      // ---- l'effort et l'air ----
      // L'effort que le personnage fournit (clé d'un effort des règles :
      // sommeil, repos, leger, intermediaire, lourd) et la température de
      // l'air en °C. Le module Temps s'en sert pour faire
      // passer le temps ; rien d'autre ne les lit.
      effort: "leger", temperature: 20, qualiteSommeil: "confortable",
      // Trois horloges internes invisibles, toutes normalisées J/H/M/S.
      // `horloge` est le temps du monde. Les deux autres ne tournent que tant
      // que leur processus est actif : ventre non vide pour la digestion,
      // régime thermique stable pour l'exposition.
      horloge: { jours: 0, heures: 0, minutes: 0, secondes: 0 },
      horlogeDigestion: { jours: 0, heures: 0, minutes: 0, secondes: 0 },
      horlogeExposition: { jours: 0, heures: 0, minutes: 0, secondes: 0, regime: "" },
      // L'ALLURE du module Mouvement (clé d'un effort des règles : on peut
      // aller moins vite que l'effort qu'on fournit) et le CRAN de l'allure
      // lourde, la seule qui se prend par crans.
      allure: "leger", allureCran: 1,

      // ---- l'effondrement ----
      // Les niveaux d'effondrement que le JOUEUR ajoute à ceux des réserves
      // (ligne « Autre » du module) : ce que la fiche ne sait pas compter.
      effAutre: 0,
      effDesactive: false,
      effPause: null,
      effAlcool: 0,
      horlogeAlcool: { jours: 0, heures: 0, minutes: 0, secondes: 0 },
      effParties: {},
      effetsActifs: [], effetsPermanents: {},

      // ---- les dés d'action ----
      // La taille de chaque dé d'action, dans l'ordre du module Actions : 4, 6,
      // 8, 10 ou 12. Vide au départ — un dé sans taille posée prend celle des
      // règles (le d8).
      desTailles: [],
      desUtilises: {},

      // ---- ce que le personnage porte à l'instant ----
      // null = « au maximum » : la valeur SUIT le maximum quand il bouge, ce
      // qu'un nombre figé ne ferait pas — et le maximum de PV et de PE bouge
      // tout seul, à chaque niveau d'effondrement.
      // expo et contenance partent de 0, qui est une VRAIE valeur (exposition
      // nulle, ventre vide) et non un repli : elles ne sont donc pas nullables.
      // Un courant supérieur à son maximum est signalé mais JAMAIS réécrit :
      // l'écraser perdrait la valeur le jour où le maximum remonte.
      etat: { pv: null, pe: null, pm: null, pi: null,
              pr: null, ps: null, ph: null, pc: null,
              expo: 0, contenance: 0, rupture: null },

      // LES LEVIERS DES CAPACITÉS, même table à trois niveaux : levier, boîte,
      // puis clé de capacité. Un seul levier, « max », qui porte le MAXIMUM de
      // chacune. Une SEULE table pour les quinze capacités plutôt que quinze
      // champs : une capacité de plus n'ajoute alors ni clé racine, ni attribut
      // Roll20, ni ligne de carte d'attributs.
      // Clés connues : pv pe pm pi pr ps ph pc charge acces contenance expo
      // rupture desAction effondrement.
      capsLeviers: {},

      // ---- compétences ----
      // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur les nomme
      // toutes. D'où un TABLEAU d'entrées à `id` STABLE, et non une carte
      // indexée par le nom — renommer une compétence perdrait sinon son rang et
      // ses modificateurs du même geste, sans un mot.
      // Une entrée : { id, nom, groupe, rang }.
      //   id     « c » + horodatage en base 36, posé à la création, jamais réécrit
      //   groupe texte LIBRE qui titre les rangées ; vide = « Sans groupe ».
      //          Ce n'est pas une règle : c'est le rangement du joueur.
      //   rang   entier 0 à 5 (non initié, initié, apprenti, maître, expert,
      //          Rang Max). Les dés, le bonus et le prix viennent de
      //          owd-creation.json, jamais d'une table écrite ici.
      // L'ordre du tableau EST l'ordre d'affichage dans son groupe.
      comps: [],
      // LES LEVIERS DES COMPÉTENCES, même table à trois niveaux, indexée par
      // l'ID de la compétence et jamais par son nom — un nom se renomme, un
      // levier ne doit pas se perdre avec. CINQ leviers :
      //   bonus    ce que la compétence ajoute au jet
      //   des      combien de dés d'action elle laisse engager
      //   xp       ce que ses rangs ont coûté
      //   rupture  ce que ses rangs ont engagé
      //   offerts  combien de ses premiers rangs ont été reçus sans XP
      compsLeviers: {},

      // ---- techniques ----
      // Les rangs d'une technique LUI APPARTIENNENT : les règles le disent, la
      // fiche ne les barème donc pas et se contente de les compter.
      // Une entrée : { id, nom, rang, rangs, xp, offert, rupture, desc }.
      //   rangs   combien de rangs cette technique-là possède
      //   offert  combien de ses PREMIERS rangs ont été reçus sans XP : ils
      //           n'entrent pas dans la limite des rangs de technique
      //   xp      ce que le joueur a payé pour elle, saisi (aucune règle ne le fixe)
      //   rupture combien de points de rupture elle a demandés
      techniques: [],

      // ---- combat ----
      // Les entrées référencent une arme ou conservent leurs propres valeurs.
      // La munition choisie reste propre à chaque entrée ; les consommations
      // se règlent une seule fois par module dans combatOptions.
      attaques: [],
      combatAffichage: { modificateursAttaque: true, defenseSans: true, defenseEsquive: true, modificateursDefense: true },
      combatModifiers: { attaques: {}, protections: {}, resistances: {} },
      combatOptions: { attaques: { utiliseEndurance: false, utiliseMunition: false, lente: false, impregnation: "" }, defenses: { utiliseEndurance: false, lente: false, degatsAuto: false } },
      defenses: { esquive: { comp: "", utiliseEndurance: false }, entrees: [] },

      // ---- avantages ----
      // Une entrée : { nom, cout, desc }. Le coût, en points d'avantage, se
      // compte contre ceux que le livre donne à la création.
      avantages: [],

      // ---- équipement ----
      // Les anciennes armes racine sont conservées pour les archives ; les armes
      // actives vivent désormais dans inv.objets[].arme (voir plus bas).
      armes: [],
      // Ce que le personnage porte contre le froid et le chaud, compté en
      // degrés, et ce qu'il pèse. Une entrée :
      // { id, nom, froid, chaud, poids, porte, note }.
      vetements: [],
      argent: 0,             // pièces d'argent : la monnaie du livre, nommée

      // Inventaire : TROIS GROUPES FIXES (schéma 3). Chaque objet a un
      // emplacement « ou » : une des huit cases de Sur soi (INV_CASES), les
      // poches ou le sac. Un objet : { id, nom, img, qte, poids, places, achat,
      //   vente, desc, ou, rapide, vet, poches, froid, chaud, sac, cap, arme,
      //   contenant, contenu, dans, encombre }.
      //   encombre  l'encombrance de l'objet, en eb : c'est elle, et non le poids,
      //             que limitent les poches et le sac
      //   nourri    c'est de la nourriture ; « places » porte alors son VOLUME
      //   contenant catégorie si le Type est Contenant (liquide, poudre, pâte
      //              ou munition), "" sinon
      //   contenu   même catégorie si le Type est Contenu, "" sinon
      //   dans      ref du Contenant qui reçoit ce Contenu, "" s'il est libre
      //   vet     type de vêtement (INV_VETEMENTS, ou hautbas) ou ""
      //   acc     type d'accessoire (INV_ACC_TYPES : bague, poignet…, sans côté) ou ""
      //   poches  ce qu'un vêtement ou un accessoire porté ajoute aux Poches, en eb
      //   froid / chaud  sa protection, comptée s'il est porté dans sa case
      //   sac / cap      c'est un sac à dos, et ce qu'il peut contenir en eb
      //   ceint   c'est une ceinture
      //   ep / ebMax     les emplacements d'une ceinture ou d'un sac, et
      //                  l'encombrance au plus de chacun
      //   emp     le rang de l'emplacement tenu (ou « ceint » ou « sacep »), -1 sinon
      //   arme    null, ou { attaque, degats, modsDegats[3], parade, reduction,
      //             modsParade[3], comp, type, mains }
      //   rapide  l'objet se saisit rapidement (compte contre les accès rapides)
      //   id      c'est LUI qui reconnaît le même objet d'une fiche à l'autre
      //   ref     identifiant INTERNE de l'objet dans cette fiche ; il sert aux
      //           modules qui doivent pointer vers cet objet sans dépendre du nom
      inv: {
        objets: [],
        opts: { cols: 5, nom: true, qte: true, poids: false, total: true, vign: true, coins: { hautGauche: "volumeTotal", hautDroite: "poidsTotal", basGauche: "da", basDroite: "qte" } }
      },

      // ---- le dé des jets ----
      // Tous les dés du jeu sont des d8. Le champ reste modifiable : c'est un
      // réglage de table, pas une règle que la fiche imposerait.
      de: DE_DEFAUT,

      // ---- le dispositif de modules et de mods : QUATRE clés racine ----
      // modules   le RANGEMENT SEUL : { ordre: [ids], place: { id: {onglet, colonne} } },
      //           épars, et VIDE tant que le joueur n'a rien rangé. Aucune clé
      //           « off » n'y existe ni n'y existera.
      // modData   les coffres privés des modules et des mods, contenu NON interprété.
      // modActifs le SEUL interrupteur : { id: false } pour les seuls modules COUPÉS.
      // mods      les mods du personnage, [{ id, nom, actif, pour, apiMin, src }].
      // Une clé racine du bundle absente de la carte d'attributs serait une
      // perte sèche au repli : les quatre sont aussi dans blank() d'owd-attr-map.js.
      modules: {}, modData: {}, modActifs: {}, mods: []
    };
  }

  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, il faut donc d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance (le repli gelé de
  // roll20-fiche.html ne le nomme pas) : d'où le garde, qui restera pour
  // toujours. Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas rabaissée en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le seul
  // vrai moyen de la perdre.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;
    if (!window.OwdMigr || !window.OwdMigr.appliquer) return s;
    var r = window.OwdMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                    // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par ici : champ manquant -> défaut, types sûrs, entrées sans id pourvues.
  // La validation est PROFONDE ; elle ne PURGE AUCUNE clé racine inconnue,
  // c'est ce qui permet à un mod et à une version future de faire voyager
  // leurs données sans que la fiche les efface au passage.
  // LES LIEUX DE L'INVENTAIRE. Les dix-neuf cases de Sur soi (les mains, la
  // ceinture, le sac à dos, les vêtements, les accessoires), les emplacements
  // (ep) de la ceinture et du sac à dos, puis Poches, Sac et Par terre.
  // Le SOUS-VÊTEMENT est un ACCESSOIRE et non un vêtement : il ne fait pas
  // partie du set de cinq pièces (tête, haut, mains, bas, pieds) dont se
  // comptent la réduction et le tier, il se porte EN PLUS.
  var INV_VETEMENTS = ["tete", "haut", "mains", "bas", "pieds"];
  var INV_ACCESSOIRES = ["oreilles", "collier", "sousvet", "poignetG", "poignetD",
                         "bagueG", "bagueD", "chevilleG", "chevilleD", "cape"];
  // Le TYPE d'un accessoire ne dit pas le côté : une bague va à gauche comme
  // à droite. Chaque type, et les cases qu'il accepte.
  var INV_ACC_TYPES = {
    oreilles: ["oreilles"], collier: ["collier"], sousvet: ["sousvet"],
    poignet: ["poignetG", "poignetD"],
    bague: ["bagueG", "bagueD"], cheville: ["chevilleG", "chevilleD"], cape: ["cape"]
  };
  var INV_CASES = ["mainG", "mainD", "ceinture", "dos"].concat(INV_VETEMENTS, INV_ACCESSOIRES);
  var INV_EP = ["ceint", "sacep"];
  var INV_LIEUX = INV_CASES.concat(INV_EP, ["poches", "sac", "terre"]);
  function accType(v) {
    if (aClef(INV_ACC_TYPES, v)) return v;
    var t = "";
    Object.keys(INV_ACC_TYPES).forEach(function (k) { if (INV_ACC_TYPES[k].indexOf(v) >= 0) t = k; });
    return t;
  }
  function normGestes(liste) {
    return (Array.isArray(liste) ? liste : []).filter(function (g) { return g && typeof g === "object"; })
      .map(function (g) {
        return {
          id: String(g.id || "") || uid("g"),
          nom: String(g.nom == null ? "" : g.nom),
          seuil: String(g.seuil == null ? "" : g.seuil),
          portee: String(g.portee == null ? "" : g.portee),
          degats: String(g.degats == null ? "" : g.degats),
          type: String(g.type == null ? "" : g.type),
          degatsDemi: String(g.degatsDemi == null ? "" : g.degatsDemi),
          typeDemi: String(g.typeDemi == null ? "" : g.typeDemi)
        };
      });
  }

  function normModsArme(liste) {
    if (!Array.isArray(liste)) liste = [];
    var out = ["", "", ""];
    for (var i = 0; i < 3; i++) out[i] = liste[i] == null ? "" : String(liste[i]);
    return out;
  }
  function normCombatLibre(a, comps) {
    if (!a || typeof a !== "object" || Array.isArray(a)) return null;
    var out = {};
    ["attaque", "degats", "parade", "reduction", "type", "mult", "trajet", "garde", "touche", "passage"].forEach(function (k) {
      out[k] = String(a[k] == null ? "" : a[k]);
    });
    out.modsDegats = normModsArme(a.modsDegats); out.modsParade = normModsArme(a.modsParade);
    out.comp = a.comp && comps[a.comp] ? String(a.comp) : "";
    out.mains = 1;
    return out;
  }
  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    s = migre(s);
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    // La release suit toujours le code qui vient d'écrire : c'est lui qui fait
    // foi. Sur la beta cela tamponne le suffixe sur un personnage seulement
    // ouvert puis réenregistré ; sans danger tant que le suffixe ne change pas
    // le rang.
    if (parseInt(s.v, 10) === SCHEMA) s.rel = RELEASE;

    // ---- identité et textes ----
    ["name", "portrait", "espece", "taille", "age", "sexe", "genre", "background", "de"]
      .forEach(function (k) { s[k] = s[k] == null ? "" : String(s[k]); });
    s.notes = normaliseNotes(s.notes);
    if (!s.de) s.de = DE_DEFAUT;
    s.xpTotal = Math.max(0, num(s.xpTotal, 0));
    s.effort = String(s.effort == null ? "" : s.effort) || b.effort;
    s.qualiteSommeil = String(s.qualiteSommeil == null ? "" : s.qualiteSommeil) || b.qualiteSommeil;
    var qualitesSommeil = D().temps && Array.isArray(D().temps.qualitesSommeil) ? D().temps.qualitesSommeil : [];
    if (qualitesSommeil.length && !qualitesSommeil.some(function (q) { return q.cle === s.qualiteSommeil; }))
      s.qualiteSommeil = b.qualiteSommeil;
    s.allure = String(s.allure == null ? "" : s.allure) || b.allure;
    s.allureCran = clamp(num(s.allureCran, 1), 1, 99);
    s.effAutre = clamp(Math.round(num(s.effAutre, 0)), -999, 999);
    s.effAlcool = clamp(Math.round(num(s.effAlcool, 0)), 0, 999);
    // Ancien compteur conservé à la lecture seulement, sans écran de migration.
    if (!s.horlogeAlcool || (num(s.effAlcoolSecondes, 0) > 0 && !Object.values(s.horlogeAlcool).some(Number)))
      s.horlogeAlcool = {secondes: num(s.effAlcoolSecondes, 0)};
    delete s.effAlcoolSecondes;
    if (!s.effParties || typeof s.effParties !== "object" || Array.isArray(s.effParties)) s.effParties = {};
    // Les anciens ajustements d’exposition suivent le côté actuellement actif.
    if (!s.effParties.froid && !s.effParties.chaud && s.effParties.expo) {
      var coteExpo = num((s.etat || {}).expo, 0) < 0 ? "froid" : "chaud";
      s.effParties[coteExpo] = { effet: num(s.effParties.expo.effet, 0), mod: num(s.effParties.expo.mod, 0) };
    }
    ["pr", "charge", "expo", "froid", "chaud", "ps", "contenance", "ph", "pi", "alcool", "autre", "total"].forEach(function (k) {
      var d = s.effParties[k];
      if (!d || typeof d !== "object" || Array.isArray(d)) d = {};
      s.effParties[k] = { effet: clamp(num(d.effet, 0), -999, 999), mod: clamp(num(d.mod, 0), -999, 999) };
      if (k === "pi") s.effParties[k].base = clamp(Math.round(num(d.base, 0)), 0, 999);
    });
    s.effDesactive = s.effDesactive === true;
    var pause = s.effPause;
    if (pause && typeof pause === "object" && !Array.isArray(pause) &&
        isFinite(pause.niveau) && pause.parties && EFF_PARTIES.every(function (cle) {
          var photo = pause.parties[cle];
          return photo && ["base", "apres", "niveau", "effet", "mod"].every(function (champ) {
            return typeof photo[champ] === "number" && isFinite(photo[champ]);
          });
        })) {
      s.effPause = { niveau: clamp(num(pause.niveau, 0), 0, 999), parties: {} };
      EFF_PARTIES.forEach(function (cle) {
        var photo = pause.parties[cle], copie = {};
        ["base", "apres", "niveau", "effet", "mod"].forEach(function (champ) { copie[champ] = clamp(photo[champ], -999, 999); });
        s.effPause.parties[cle] = copie;
      });
    } else s.effPause = null;
    var desUtilises = s.desUtilises;
    s.desUtilises = {};
    if (desUtilises && typeof desUtilises === "object") Object.keys(desUtilises).forEach(function (k) {
      if (/^(?:0|[1-9]\d?)$/.test(k) && Number(k) < 99 && desUtilises[k] === true) s.desUtilises[k] = true;
    });
    s.desTailles = Array.isArray(s.desTailles)
      ? s.desTailles.slice(0, 99).map(function (t) {
          t = num(t, 0);
          return [4, 6, 8, 10, 12].indexOf(t) >= 0 ? t : null;
        })
      : [];
    s.temperature = clamp(Math.round(num(s.temperature, b.temperature) * 10) / 10, -999, 999);
    // Les horloges sont stockées en J/H/M/S, jamais en total de secondes. Une
    // valeur débordante est reportée vers l'unité supérieure. Digestion et
    // Exposition utilisent exactement la même forme que l'horloge du monde.
    function normaliseHorloge(v, gardeRegime) {
      var h = (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
      var hs = Math.max(0, Math.floor(Number(h.secondes) || 0));
      var hm = Math.max(0, Math.floor(Number(h.minutes) || 0)) + Math.floor(hs / 60); hs %= 60;
      var hh = Math.max(0, Math.floor(Number(h.heures) || 0)) + Math.floor(hm / 60); hm %= 60;
      var hj = Math.max(0, Math.floor(Number(h.jours) || 0)) + Math.floor(hh / 24); hh %= 24;
      var out = { jours: hj, heures: hh, minutes: hm, secondes: hs };
      if (gardeRegime) out.regime = String(h.regime == null ? "" : h.regime);
      return out;
    }
    s.horloge = normaliseHorloge(s.horloge, false);
    s.horlogeDigestion = normaliseHorloge(s.horlogeDigestion, false);
    s.horlogeExposition = normaliseHorloge(s.horlogeExposition, true);
    s.horlogeAlcool = normaliseHorloge(s.effAlcool > 0 ? s.horlogeAlcool : null, false);
    s.argent = pnum(s.argent);

    // ---- caractéristiques ----
    // Les huit du socle, plus toute caractéristique que les règles déclarent
    // aujourd'hui : une caractéristique ajoutée demain arrive à sa valeur
    // moyenne sans migration ni montée de schéma.
    if (!s.caracs || typeof s.caracs !== "object" || Array.isArray(s.caracs)) s.caracs = b.caracs;
    var moyenne = num(D().moyenneHumaine, 20);
    var listeCaracs = CARACS.slice();
    caracsData().forEach(function (c) {
      if (c && c.cle && listeCaracs.indexOf(c.cle) < 0) listeCaracs.push(c.cle);
    });
    Object.keys(s.caracs).forEach(function (k) { if (listeCaracs.indexOf(k) < 0) listeCaracs.push(k); });
    listeCaracs.forEach(function (c) {
      s.caracs[c] = clamp(num(s.caracs[c], moyenne), -9999, 9999);
    });
    // Les points achetés : entiers positifs, et un zéro ne s'écrit pas. Une
    // clé qui n'est plus une caractéristique connue est GARDÉE, comme dans
    // `caracs` : on ne jette pas ce que le joueur a payé.
    var achats = (s.caracsXp && typeof s.caracsXp === "object" && !Array.isArray(s.caracsXp))
      ? s.caracsXp : {};
    s.caracsXp = {};
    Object.keys(achats).forEach(function (c) {
      var n = clamp(Math.round(num(achats[c], 0)), 0, 99999);
      if (n > 0) s.caracsXp[c] = n;
    });
    // LES LEVIERS. Le rangement boucle sur le CATALOGUE, jamais sur l'état : un
    // levier dont le nom n'est pas au catalogue disparaît au premier
    // enregistrement, sans un mot. C'est le prix d'un état qui ne grossit pas
    // tout seul, et c'est pourquoi le catalogue se tient à jour AVANT d'écrire
    // le module qui pose le levier.
    s.caracsLeviers = tableLeviers(s.caracsLeviers, CARAC_LEVIERS);

    // ---- valeurs courantes ----
    if (!s.etat || typeof s.etat !== "object" || Array.isArray(s.etat)) s.etat = b.etat;
    ["pv", "pe", "pm", "pi", "pr", "ps", "ph", "pc", "rupture"].forEach(function (k) {
      var v = s.etat[k];
      if (v === null || v === undefined || v === "") { s.etat[k] = null; return; }
      var n = parseFloat(v);
      s.etat[k] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -99999, 99999) : null;
    });
    // expo et contenance ne sont PAS nullables : 0 y est une vraie valeur
    s.etat.expo = clamp(snum(s.etat.expo), -99999, 99999);
    s.etat.contenance = clamp(pnum(s.etat.contenance), 0, 99999);
    if (!(s.etat.contenance > 0))
      s.horlogeDigestion = { jours: 0, heures: 0, minutes: 0, secondes: 0 };

    // ---- les leviers des capacités ----
    // Aucune liste de clés n'est imposée : une capacité ajoutée demain dans les
    // règles reçoit ses neuf boîtes sans qu'on rouvre ce fichier.
    s.capsLeviers = tableLeviers(s.capsLeviers, CAP_LEVIERS);

    // ---- compétences ----
    if (!Array.isArray(s.comps)) s.comps = [];
    var vusComps = {};
    s.comps = s.comps.filter(function (c) { return c && typeof c === "object"; }).map(function (c) {
      var id = String(c.id == null ? "" : c.id);
      if (!id || vusComps[id]) id = uid("c");   // deux entrées de même id se confondraient
      vusComps[id] = 1;
      return {
        id: id,
        nom: capFirst(String(c.nom == null ? "" : c.nom).trim()),
        groupe: String(c.groupe == null ? "" : c.groupe).trim(),
        rang: clamp(num(c.rang, 0), 0, rangs().length ? rangMax() : 5)
      };
    });
    // Les leviers ne parlent que de compétences qui existent : une clé orpheline
    // (compétence supprimée par une version qui l'ignorait) voyagerait pour rien.
    s.compsLeviers = tableLeviers(s.compsLeviers, COMP_LEVIERS, vusComps);

    if (["minuscule", "petite", "moyenne", "grande", "enorme", "gigantesque"].indexOf(s.taille) < 0) s.taille = "moyenne";
    var options = s.combatOptions || {}, attaqueOptions = options.attaques || {}, defenseOptions = options.defenses || {};
    s.combatOptions = { attaques: { utiliseEndurance: !!attaqueOptions.utiliseEndurance, utiliseMunition: !!attaqueOptions.utiliseMunition, lente: !!attaqueOptions.lente, impregnation: typeof attaqueOptions.impregnation === "string" ? attaqueOptions.impregnation : "" },
      defenses: { utiliseEndurance: !!defenseOptions.utiliseEndurance, lente: !!defenseOptions.lente, degatsAuto: !!defenseOptions.degatsAuto } };
    var combatAffichage = s.combatAffichage || {};
    s.combatAffichage = {
      modificateursAttaque: combatAffichage.modificateursAttaque !== false,
      defenseSans: combatAffichage.defenseSans !== false,
      defenseEsquive: combatAffichage.defenseEsquive !== false,
      modificateursDefense: combatAffichage.modificateursDefense !== false
    };
    var cm = s.combatModifiers || {};
    s.combatModifiers = { attaques: {}, protections: {}, resistances: {} };
    var legacyPhysique=cm.legacyPhysique && typeof cm.legacyPhysique==="object" ? JSON.parse(JSON.stringify(cm.legacyPhysique)) : {};
    ["attaques","protections","resistances"].forEach(function(k){
      if(cm[k] && ["contondant","perforant","tranchant"].some(function(t){return snum(cm[k][t])!==0;}))legacyPhysique[k]={contondant:snum(cm[k].contondant),perforant:snum(cm[k].perforant),tranchant:snum(cm[k].tranchant)};
    });
    if(Object.keys(legacyPhysique).length)s.combatModifiers.legacyPhysique=legacyPhysique;
    ["attaques", "protections", "resistances"].forEach(function (k) {
      ["physique", "feu", "froid", "eclair", "decomposition", "ethere", "brut"].forEach(function (t) {
        var ancienne = cm[k] || {};
        var n = Number(t === "physique" && ancienne.physique === undefined ? Math.max(snum(ancienne.contondant),snum(ancienne.perforant),snum(ancienne.tranchant)) : ancienne[t]); s.combatModifiers[k][t] = isFinite(n) ? n : 0;
      });
      // Archives uniquement : conserver les anciennes clés sans les réutiliser
      // dans les calculs Physique ni dans les champs visibles.
      ["contondant","perforant","tranchant"].forEach(function(t){var v=cm[k]&&cm[k][t];if(v===undefined && legacyPhysique[k])v=legacyPhysique[k][t];if(v!==undefined && isFinite(Number(v)))s.combatModifiers[k][t]=Number(v);});
    });
    // ---- attaques ----
    // La référence d'arme est validée APRÈS l'inventaire, parce que les anciens
    // objets ne portent pas encore nécessairement leur `ref`. Ici on ne fait
    // qu'assainir la forme et garantir l'identité de chaque raccourci.
    if (!Array.isArray(s.attaques)) s.attaques = [];
    s.attaques = s.attaques.filter(function (a) { return a && typeof a === "object"; })
      .map(function (a) {
        return {
          id: String(a.id || "") || uid("atk"),
          arme: String(a.arme || ""),
          nom: String(a.nom || ""),
          personnalisee: normCombatLibre(a.personnalisee, vusComps),
          utiliseEndurance: !!a.utiliseEndurance,
          utiliseMunition: !!a.utiliseMunition,
          munition: String(a.munition || "")
        };
      });

    if (!s.defenses || typeof s.defenses !== "object" || Array.isArray(s.defenses)) s.defenses = {};
    var esquive = s.defenses.esquive || {};
    s.defenses.esquive = { comp: vusComps[esquive.comp] ? String(esquive.comp) : "", utiliseEndurance: !!esquive.utiliseEndurance };
    s.defenses.entrees = (Array.isArray(s.defenses.entrees) ? s.defenses.entrees : []).filter(function (a) { return a && typeof a === "object"; }).map(function (a) {
      return { id: String(a.id || "") || uid("def"), nom: String(a.nom || ""), arme: String(a.arme || ""),
        personnalisee: normCombatLibre(a.personnalisee, vusComps), utiliseEndurance: !!a.utiliseEndurance };
    });

    // ---- avantages ----
    if (!Array.isArray(s.avantages)) s.avantages = [];
    s.avantages = s.avantages.filter(function (a) { return a && typeof a === "object"; }).map(function (a, index) {
      return {
        id: String(a.id || ("av-legacy-" + index)),
        nom: String(a.nom == null ? "" : a.nom),
        cout: pnum(a.cout),
        desc: String(a.desc == null ? "" : a.desc)
      };
    });

    // ---- techniques ----
    if (!Array.isArray(s.techniques)) s.techniques = [];
    s.techniques = s.techniques.filter(function (t) { return t && typeof t === "object"; })
      .map(function (t) {
        var nb = clamp(num(t.rangs, 1), 1, 20);
        return {
          id: String(t.id || "") || uid("t"),
          nom: String(t.nom == null ? "" : t.nom),
          rangs: nb,
          rang: clamp(num(t.rang, 0), 0, nb),
          xp: Math.max(0, num(t.xp, 0)),
          offert: clamp(num(t.offert, 0), 0, nb),
          rupture: clamp(num(t.rupture, 0), 0, 99),
          desc: String(t.desc == null ? "" : t.desc)
        };
      });

    // ---- armes et leurs gestes ----
    if (!Array.isArray(s.armes)) s.armes = [];
    s.armes = s.armes.filter(function (a) { return a && typeof a === "object"; }).map(function (a) {
      var gestes = Array.isArray(a.gestes) ? a.gestes : [];
      return {
        id: String(a.id || "") || uid("a"),
        nom: String(a.nom == null ? "" : a.nom),
        prise: String(a.prise == null ? "" : a.prise),
        parade: String(a.parade == null ? "" : a.parade),
        reduction: String(a.reduction == null ? "" : a.reduction),
        // l'ID d'une compétence, jamais son nom : le nom se renomme
        comp: String(a.comp == null ? "" : a.comp),
        note: String(a.note == null ? "" : a.note),
        gestes: normGestes(gestes)
      };
    });
    // une arme qui pointe sur une compétence disparue perd son lien plutôt que
    // de lancer un jet au nom de rien
    s.armes.forEach(function (a) { if (a.comp && !vusComps[a.comp]) a.comp = ""; });

    // ---- vêtements ----
    if (!Array.isArray(s.vetements)) s.vetements = [];
    var types = ["physique", "feu", "froid", "eclair", "decomposition", "ethere", "brut"];
    s.vetements = s.vetements.filter(function (v) { return v && typeof v === "object"; }).map(function (v) {
      var res = {
        id: String(v.id || "") || uid("v"),
        nom: String(v.nom == null ? "" : v.nom),
        froid: snum(v.froid), chaud: snum(v.chaud), poids: pnum(v.poids),
        porte: v.porte !== false,
        note: String(v.note == null ? "" : v.note)
      };
      types.forEach(function(t) {
        res["res_" + t] = snum(v["res_" + t]);
        res["prot_" + t] = snum(v["prot_" + t]);
      });
      return res;
    });

    // ---- inventaire illustré ----
    if (!s.inv || typeof s.inv !== "object" || Array.isArray(s.inv)) s.inv = b.inv;
    if (!s.inv.opts || typeof s.inv.opts !== "object" || Array.isArray(s.inv.opts)) s.inv.opts = b.inv.opts;
    s.inv.opts.cols = clamp(num(s.inv.opts.cols, b.inv.opts.cols), 1, 5);
    // chaque réglage garde SON défaut quand il manque (un opts partiel ne doit
    // pas allumer un affichage éteint par défaut)
    ["nom", "qte", "poids", "total", "vign"].forEach(function (k) {
      s.inv.opts[k] = s.inv.opts[k] === undefined ? b.inv.opts[k] : !!s.inv.opts[k];
    });
    var coinsDefaut=b.inv.opts.coins;
    if(!s.inv.opts.coins||typeof s.inv.opts.coins!=="object"||Array.isArray(s.inv.opts.coins))s.inv.opts.coins={};
    Object.keys(coinsDefaut).forEach(function(k){if(["aucun","nom","qte","poids","poidsTotal","volume","volumeTotal","da"].indexOf(s.inv.opts.coins[k])<0)s.inv.opts.coins[k]=coinsDefaut[k];});
    // Les anciens groupes libres ne survivent pas : le schéma 3 les a remis au
    // grenier, et l'emplacement « ou » les remplace.
    delete s.inv.groupes;
    delete s.inv.comptes;
    if (!Array.isArray(s.inv.objets)) s.inv.objets = [];
    // LE PRIX DE VENTE AUTOMATIQUE (null) n'existait pas : un champ laissé vide
    // s'enregistrait 0. Tout 0 d'avant veut donc dire « non rempli », et passe
    // une fois pour toutes en automatique ; venteAuto marque ce passage fait.
    if (!s.inv.venteAuto) {
      s.inv.objets.forEach(function (o) { if (o && typeof o === "object" && pnum(o.vente) === 0) o.vente = null; });
      s.inv.venteAuto = 1;
    }
    effetsNormalise(s);
    s.inv.objets = s.inv.objets.filter(function (o) { return o && typeof o === "object"; }).map(function (o) {
      var a = o.arme && typeof o.arme === "object" && !Array.isArray(o.arme) ? o.arme : null;
      return enrichitObjet({
        id: String(o.id == null ? "" : o.id),   // LIBRE et facultatif : c'est le joueur qui le pose
        // ref ne se donne pas et ne s'affiche pas : il identifie CET objet dans
        // CETTE fiche pour qu'un module survive à un renommage.
        ref: String(o.ref == null ? "" : o.ref) || uid("o"),
        nom: o.nom == null ? "" : String(o.nom),
        img: o.img == null ? "" : String(o.img),
        qte: pnum(o.qte === undefined ? 1 : o.qte),
        poids: pnum(o.poids),
        encombre: o.encombre===null?null:pnum(o.encombre),
        // « places » est le nom de CLÉ du volume d'un aliment : le livre dit
        // « volume », la clé garde son nom, qui voyage dans les Attributes
        places: o.places===null?null:pnum(o.places),
        emplacements: Math.max(0,Math.floor(num(o.emplacements,1))),
        tenueDeuxMains: o.tenueDeuxMains === true,
        prerequis: o.prerequis && typeof o.prerequis === "object" ? o.prerequis : {},
        nourri: !!o.nourri,
        // Types « contenant » et « contenu » : la chaîne porte leur catégorie.
        // Une valeur inconnue est conservée plutôt qu'effacée : une archive ou
        // un mod peut connaître une catégorie que les règles du jour n'ont plus.
        // Vide = l'objet n'est pas de ce type. `dans` référence le contenant
        // interne qui reçoit un Contenu ; ce lien est validé après la passe.
        contenant: o.contenant == null ? "" : String(o.contenant),
        contenu: o.contenu == null ? "" : String(o.contenu),
        dans: o.dans == null ? "" : String(o.dans),
        achat: venteNum(o.achat), vente: venteNum(o.vente),
        desc: o.desc == null ? "" : String(o.desc),
        ou: INV_LIEUX.indexOf(o.ou) >= 0 ? o.ou : "terre",
        // le rang de l'EMPLACEMENT qu'il tient, dans la ceinture ou sur le sac
        emp: Math.max(-1, Math.floor(num(o.emp, -1))),
        rapide: !!o.rapide,
        vet: INV_VETEMENTS.indexOf(o.vet) >= 0 || o.vet === "hautbas" ? o.vet : "",
        poches: pnum(o.poches),
        froid: snum(o.froid), chaud: snum(o.chaud),
        res_contondant: snum(o.res_contondant), prot_contondant: snum(o.prot_contondant),
        res_perforant: snum(o.res_perforant), prot_perforant: snum(o.prot_perforant),
        res_tranchant: snum(o.res_tranchant), prot_tranchant: snum(o.prot_tranchant),
        res_feu: snum(o.res_feu), prot_feu: snum(o.prot_feu),
        res_froid: snum(o.res_froid), prot_froid: snum(o.prot_froid),
        res_eclair: snum(o.res_eclair), prot_eclair: snum(o.prot_eclair),
        res_decomposition: snum(o.res_decomposition), prot_decomposition: snum(o.prot_decomposition),
        res_ethere: snum(o.res_ethere), prot_ethere: snum(o.prot_ethere),
        res_brut: snum(o.res_brut), prot_brut: snum(o.prot_brut),
        // un type (bague) ; une case d'avant (bagueG) redevient son type
        acc: accType(o.acc),
        sac: !!o.sac,
        cap: pnum(o.cap),
        ceint: !!o.ceint,
        // ce qu'une ceinture ou un sac offre d'EMPLACEMENTS, et l'encombrance
        // au plus qu'un emplacement accepte
        ep: Math.max(0, Math.floor(pnum(o.ep))),
        ebMax: pnum(o.ebMax),
        arme: a ? {
          attaque: String(a.attaque == null ? "" : a.attaque),
          degats: String(a.degats == null ? "" : a.degats),
          modsDegats: normModsArme(a.modsDegats),
          parade: String(a.parade == null ? "" : a.parade),
          reduction: String(a.reduction == null ? "" : a.reduction),
          modsParade: normModsArme(a.modsParade),
          // l'ID d'une compétence, jamais son nom : le nom se renomme
          comp: a.comp && vusComps[a.comp] ? String(a.comp) : "",
          // clé stable d'un type d'arme lu dans armes.md ; une valeur inconnue
          // est conservée pour qu'une archive ou un mod ne perde rien.
          type: String(a.type == null ? "" : a.type),
          // Prérequis : garder les huit entrées au round-trip et au transfert.
          for: pnum(a.for), dex: pnum(a.dex), vig: pnum(a.vig), end: pnum(a.end),
          res: pnum(a.res), fer: pnum(a.fer), int: pnum(a.int), cha: pnum(a.cha),
          // donnée technique de placement : la carte ne l'affiche plus.
          mains: num(a.mains, 1) === 2 ? 2 : 1
        } : null
      }, o);
    });
    // Un Contenu imbriqué n'occupe PAS une case normale : son lien `dans`
    // désigne le `ref` d'un Contenant de même catégorie. Une sauvegarde cassée,
    // un contenant supprimé ou deux contenus visant le même slot ne doivent pas
    // rendre l'objet invisible : le lien invalide est simplement libéré au sac.
    var contenantsParRef = Object.create(null);
    s.inv.objets.forEach(function (o) {
      if (o && o.ref && (o.contenant || o.sac)) contenantsParRef[o.ref] = o;
    });
    s.inv.objets.forEach(function (o) {
      if (!o || !o.dans) return;
      var p = contenantsParRef[o.dans];
      var cycle = p === o, walk = p, seen = {};
      while(walk && walk.dans && !cycle){if(seen[walk.ref]||walk.dans===o.ref){cycle=true;break;}seen[walk.ref]=true;walk=contenantsParRef[walk.dans];}
      if (!p || cycle || (!p.sac && (!o.contenu || String(o.contenu) !== String(p.contenant)))) {
        o.dans = "";
        o.ou = "terre";
        o.emp = -1;
        return;
      }
      if(p.sac) { if(o.ou!=="sacep") {o.ou="sac";o.emp=-1;} return; }
      // Plusieurs objets peuvent viser ce même contenant ; sa limite n'est qu'indicative.
      // `ou` reste un repli compatible avec les anciens schémas ; pendant que
      // `dans` est posé, l'interface et les calculs d'encombrement l'ignorent.
      o.ou = "sac";
      o.emp = -1;
    });

    // Un ancien objet d'arme ne portait pas de type. Quand son nom correspond
    // exactement à une arme du livre, on peut poser la clé sans inventer : le
    // nom vient du joueur, la clé et le nombre de mains viennent des règles.
    s.inv.objets.forEach(function (o) {
      if (!o.arme) return;
      var d = null;
      armesData().forEach(function (x) {
        if (!d && x && x.cle && ((o.arme.type && x.cle === o.arme.type) ||
            (!o.arme.type && pli(x.nom) === pli(o.nom)))) d = x;
      });
      if (!d) return;
      if (!o.arme.type) o.arme.type = String(d.cle);
      if (o.mains == null && (d.mains === 1 || d.mains === 2)) o.mains = d.mains;
      o.arme.mains = o.mains;
    });
    // UNE CASE, UN OBJET, ET LE BON : une case de vêtement ne prend que son
    // type de vêtement, la case du sac à dos qu'un sac. Ce qui n'y a pas sa
    // place, ou arrive second, retourne au sac plutôt que de disparaître.
    // Un objet à DEUX cases (robe, arme à deux mains) les prend toutes deux,
    // ancré sur la sienne ; qu'une seule soit déjà prise, et il retourne au sac.
    window.OwdInventoryData.normalizeSlots(s.inv.objets);
    var prises = {};
    s.inv.objets.forEach(function (o) {
      if (INV_CASES.indexOf(o.ou) < 0) return;
      if (!casePermise(o, o.ou)) { o.ou = "sac"; return; }
      o.ou = ancrage(o, o.ou);
      var cases = casesDe(o);
      if (cases.some(function (c) { return prises[c]; })) { o.ou = "sac"; return; }
      cases.forEach(function (c) { prises[c] = 1; });
    });
    rangeEmplacements(s.inv.objets);
    // Une ancienne poche contenant un objet trop grand est vidée sur le sol,
    // sans supprimer l’objet ni lui faire consommer artificiellement la charge.
    window.OwdInventoryData.bind(s.inv.objets);

    // Une attaque dont l'objet a disparu garde sa référence : en édition le
    // joueur peut lui choisir une nouvelle arme. On ne la supprime surtout pas
    // en silence, parce que l'objet peut aussi revenir lors d'un import.

    // ---- coffres, interrupteurs, disposition, mods ----
    if (!s.modData || typeof s.modData !== "object" || Array.isArray(s.modData)) s.modData = {};
    Object.keys(s.modData).forEach(function (k) {
      var d = s.modData[k];
      if (!d || typeof d !== "object") delete s.modData[k];
    });
    // interrupteurs : seuls les modules COUPÉS y figurent (false). Tout le
    // reste s'efface, pour qu'un module retiré un jour ne laisse pas de trace.
    if (!s.modActifs || typeof s.modActifs !== "object" || Array.isArray(s.modActifs)) s.modActifs = {};
    Object.keys(s.modActifs).forEach(function (k) { if (s.modActifs[k] !== false) delete s.modActifs[k]; });
    // Disposition ÉPARSE : on valide ce qui est là sans rien matérialiser.
    // Écrire un « ordre » vide chez tout le monde ferait voyager une liste
    // inutile jusque dans les Attributes Roll20, et un module ajouté demain
    // n'apparaîtrait pas chez un personnage rangé avant lui.
    if (!s.modules || typeof s.modules !== "object" || Array.isArray(s.modules)) s.modules = {};
    if (s.modules.ordre !== undefined) {
      var vusOrdre = {};
      s.modules.ordre = (Array.isArray(s.modules.ordre) ? s.modules.ordre : [])
        .map(function (id) { return String(id == null ? "" : id); })
        .filter(function (id) {
          if (!id || vusOrdre[id]) return false;   // un id en double décalerait le rangement
          vusOrdre[id] = 1;
          return true;
        });
      // « Récupération » vit désormais dans la grande colonne de droite,
      // juste APRÈS Compétences. Une fiche qui ne lui a PAS donné de place
      // explicite suit ce nouveau rangement natif, même si une version
      // précédente l'avait injectée automatiquement dans la colonne du milieu.
      // Une place explicite reste souveraine : un joueur qui a déplacé le
      // module volontairement ne voit jamais son choix écrasé.
      var placeRecup = s.modules.place && typeof s.modules.place === "object" &&
                       !Array.isArray(s.modules.place) && s.modules.place.recuperation;
      if (!placeRecup) {
        var iRecup = s.modules.ordre.indexOf("recuperation");
        if (iRecup >= 0) s.modules.ordre.splice(iRecup, 1);
        var iComps = s.modules.ordre.indexOf("comps");
        if (iComps >= 0) s.modules.ordre.splice(iComps + 1, 0, "recuperation");
      }
    }
    if (Array.isArray(s.modules.ordre) && !(s.modules.place && s.modules.place.effets)) {
      s.modules.ordre = s.modules.ordre.filter(function(id){return id!=="effets";});
      var ir=s.modules.ordre.indexOf("recuperation");if(ir>=0)s.modules.ordre.splice(ir+1,0,"effets");
    }
    if (s.modules.place !== undefined) {
      var src = s.modules.place, place = {};
      if (src && typeof src === "object" && !Array.isArray(src)) {
        Object.keys(src).forEach(function (id) {
          var p = src[id];
          if (!id || !p || typeof p !== "object" || Array.isArray(p)) return;
          var q = {};
          if (typeof p.onglet === "string" && p.onglet) q.onglet = p.onglet;
          if (typeof p.colonne === "string" && p.colonne) q.colonne = p.colonne;
          // une entrée qui ne dit ni onglet ni colonne ne déplace rien : elle
          // ne ferait qu'occuper la place et voyager pour rien
          if (q.onglet || q.colonne) place[id] = q;
        });
      }
      s.modules.place = place;
    }
    // Mods du personnage. Le moteur (owd-mods.js) fait foi quand il est là :
    // c'est lui qui connaît la forme d'un mod. Sans lui, la fiche s'en tient au
    // strict nécessaire, mais elle ne s'en dispense JAMAIS : un état venu
    // d'ailleurs (import, Attributes d'un autre joueur) ne doit pas entrer sans
    // contrôle, et un mod sans id ni code ne pourrait ni tourner ni se nommer.
    if (!Array.isArray(s.mods)) s.mods = [];
    if (window.OwdMods && typeof window.OwdMods.normalise === "function") {
      try {
        var normes = window.OwdMods.normalise(s.mods);
        if (Array.isArray(normes)) s.mods = normes;
      } catch (e) {}
    }
    var vusMods = {};
    s.mods = s.mods.filter(function (m) { return m && typeof m === "object"; }).filter(function (m) {
      // L'id impose son alphabet : il sert de clé partout (avis du navigateur,
      // journal « [mod:<id>] », coffre du module qu'il remplacerait). MÊME
      // règle que le moteur (idPropre) et que le formulaire : les trois chemins
      // doivent donner le MÊME id, sans quoi l'empreinte changerait selon le
      // chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
      m.id = idMod(m.id);
      m.nom = String(m.nom == null ? "" : m.nom);
      m.actif = m.actif !== false;
      if (typeof m.pour !== "string" || !m.pour) delete m.pour;
      if (typeof m.notes !== "string" || !m.notes) delete m.notes;
      var api = parseInt(m.apiMin, 10);
      if (isFinite(api)) m.apiMin = clamp(api, 0, 999); else delete m.apiMin;
      if (!m.id || typeof m.src !== "string" || vusMods[m.id]) return false;
      vusMods[m.id] = 1;
      return true;
    });
    return s;
  }
  // un modificateur : décimal borné, jamais nul par accident
  function modNombre(v) {
    var n = parseFloat(v);
    return isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
  }
  // Carte de FORÇAGES : le vide EFFACE la clé (absent = calculé), une valeur la
  // pose. Zéro est une valeur légitime — « forcé à 0 » n'est pas « pas forcé ».
  // ---------- LES TROIS CATALOGUES DE LEVIERS ----------
  // UN LEVIER ABSENT D'ICI EST JETÉ EN SILENCE au premier rangement : le
  // rangement boucle sur ces tables, jamais sur l'état. Écrire le module avant
  // le catalogue, c'est écrire un réglage qui disparaît au rechargement sans
  // qu'aucune erreur ne paraisse. La valeur est la BORNE des ajouts de ce
  // levier — l'échelle de ce qu'il règle, pas un plafond de jeu.
  var CARAC_LEVIERS = { total: 9999, xp: 99999 };
  var CAP_LEVIERS = { max: 99999 };
  var COMP_LEVIERS = { bonus: 999, des: 99, xp: 9999, rupture: 99, offerts: 99 };

  var BOITES_AJOUT = ["a1", "a2", "a3", "a4"];
  var BOITES_FACTEUR = ["m1", "m2", "m3", "m4"];

  // Une table de leviers : levier -> boîte -> clé. Trois niveaux, tous ÉPARS.
  //
  // LES NEUTRES NE SE RANGENT PAS, et ils ne sont pas les mêmes : un ajout de
  // zéro et un facteur de un ne changent rien, donc ils s'effacent ; un FORÇAGE
  // à zéro, lui, se range — c'est le seul moyen d'obtenir zéro à coup sûr, et
  // le confondre avec « pas de forçage » perdrait le réglage.
  //
  // `cles`, s'il est donné, est la table des clés encore vivantes : tout ce qui
  // ne s'y trouve plus s'en va.
  function tableLeviers(src, bornes, cles) {
    var out = {};
    if (!src || typeof src !== "object" || Array.isArray(src)) src = {};
    Object.keys(bornes).forEach(function (nom) {
      var t = src[nom];
      if (!t || typeof t !== "object" || Array.isArray(t)) return;
      var borne = bornes[nom];
      var boites = {};
      var pose = function (boite, cle, v) {
        if (!boites[boite]) boites[boite] = {};
        boites[boite][cle] = v;
      };
      var force = t.force;
      if (force && typeof force === "object" && !Array.isArray(force)) {
        Object.keys(force).forEach(function (cle) {
          if (cles && !cles[cle]) return;
          var v = parseFloat(force[cle]);
          if (!isFinite(v)) return;          // vide = pas de forçage
          pose("force", cle, clamp(Math.round(v * 100) / 100, -99999, 99999));
        });
      }
      BOITES_AJOUT.forEach(function (boite) {
        var m = t[boite];
        if (!m || typeof m !== "object" || Array.isArray(m)) return;
        Object.keys(m).forEach(function (cle) {
          if (cles && !cles[cle]) return;
          var v = parseFloat(m[cle]);
          if (!isFinite(v) || v === 0) return;   // un ajout de zéro n'est pas un réglage
          pose(boite, cle, clamp(Math.round(v * 100) / 100, -borne, borne));
        });
      });
      BOITES_FACTEUR.forEach(function (boite) {
        var m = t[boite];
        if (!m || typeof m !== "object" || Array.isArray(m)) return;
        Object.keys(m).forEach(function (cle) {
          if (cles && !cles[cle]) return;
          var v = parseFloat(m[cle]);
          if (!isFinite(v) || v === 1) return;   // un facteur de un n'est pas un réglage
          pose(boite, cle, clamp(Math.round(v * 100) / 100, -MULT_BORNE, MULT_BORNE));
        });
      });
      if (Object.keys(boites).length) out[nom] = boites;
    });
    return out;
  }

  function carteForcages(src) {
    var out = {};
    if (!src || typeof src !== "object" || Array.isArray(src)) return out;
    Object.keys(src).forEach(function (k) {
      var v = src[k];
      if (v === null || v === undefined || v === "") return;
      var n = parseFloat(v);
      if (isFinite(n)) out[k] = clamp(Math.round(n * 100) / 100, -99999, 99999);
    });
    return out;
  }
  // Carte de MODIFICATEURS : zéro = pas d'entrée, la clé s'efface. L'inverse
  // exact de la précédente, et c'est voulu — un zéro n'est pas un réglage.
  function carteNombres(src) {
    var out = {};
    if (!src || typeof src !== "object" || Array.isArray(src)) return out;
    Object.keys(src).forEach(function (k) {
      var n = modNombre(src[k]);
      if (n) out[k] = n;
    });
    return out;
  }
  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // niveau d'effondrement…) juste après son calcul. Le calcul lui-même garde
  // son nom suffixé « Brut » ; le nom public appelle le brut, puis passe la
  // valeur aux filtres enregistrés pour ce nom. C'est par là qu'un mod change
  // une règle de calcul sans qu'on rouvre ce fichier, et sans réécrire le
  // module qui affiche la valeur : tout ce qui lit pvMax() voit le même chiffre.
  //
  // Les CASCADES sont voulues et tombent toutes seules : pvMaxAuto() appelle
  // effondrement() qui appelle prMax() qui appelle caracTotal(). Les gardes
  // sont donc par NOM, jamais globales, pour ne pas couper ces chaînes-là.
  //
  // ET L'EFFONDREMENT NE BOUCLE PAS : il se calcule sur PR, PS, PH et
  // l'exposition, dont les maximums ne dépendent QUE des caractéristiques.
  // Seuls PV MAX et PE MAX dépendent de lui. Un filtre de mod posé sur
  // « effondrement » qui lirait ctx.calculs.pvMax refermerait la boucle : c'est
  // la garde par nom qui l'attrape, en rendant le brut au second appel.
  var filtres = {};            // nom -> [{ fn, prop, echecs, src }]
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  var modEnExec = null;        // l'id du mod que le moteur lance, ou null
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  var horsMontage = [];
  // Les points de filtre d'Outward. LA TABLE N'EST LÀ QUE POUR PRÉVENIR D'UN
  // NOM MAL TAPÉ : un filtre posé sur « pvmax » ne serait jamais appelé, et
  // rien ne le dirait. Un nom hors table passe quand même, avec un avertissement.
  var FILTRES_CONNUS = {
    caracTotal: 1, compBonus: 1, compDes: 1, compXp: 1,
    pvMax: 1, peMax: 1, pmMax: 1, piMax: 1, prMax: 1, psMax: 1, phMax: 1, pcMax: 1,
    charge: 1, accesRapides: 1, contenance: 1, expoMax: 1, effondrement: 1, effondrementPartie: 1,
    poidsPorte: 1, desAction: 1, ruptureMax: 1, xpDepense: 1
  };
  function ajouteFiltre(nom, fn, prop) {
    nom = String(nom == null ? "" : nom);
    if (typeof fn !== "function" || !nom) return;
    prop = prop || "?";
    if (!aClef(FILTRES_CONNUS, nom) && window.console && window.console.warn)
      window.console.warn("[mod:" + prop + "] filtre " + nom + " inconnu : il ne sera jamais appelé.");
    if (!aClef(filtres, nom)) filtres[nom] = [];
    // DÉDOUBLONNAGE DANS LE REGISTRE LUI-MÊME, et pas seulement dans ce qui
    // attend le montage suivant. Un bouton de mod qui repose son filtre à
    // chaque clic l'empilait DANS LE MÊME MONTAGE : deux clics et le bonus
    // comptait double (+2, +4, +6…), sans que rien ne le montre.
    var texte = signeFn(fn);
    var liste = filtres[nom];
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].prop === prop && (liste[i].fn === fn || (texte && liste[i].src === texte))) {
        liste[i].fn = fn;
        liste[i].echecs = 0;
        if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
        return;
      }
    }
    liste.push({ fn: fn, prop: prop, echecs: 0, src: texte });
    if (!enMontage) gardeHorsMontage({ nom: nom, fn: fn, prop: prop });
  }
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS : « function (v) {
  // return v + 2; } » écrit DANS un gestionnaire de clic fabrique un objet NEUF
  // à chaque clic. On compare donc aussi le TEXTE de la fonction. Deux filtres
  // vraiment distincts écrits caractère pour caractère pareil se confondraient,
  // mais poser deux fois le même calcul pour qu'il compte double n'est pas un
  // usage : l'empilement sans fin, si.
  function signeFn(fn) { try { return String(fn); } catch (e) { return ""; } }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    e.sig = signatureAuMontage;   // l'état des mods AU MOMENT du dépôt
    for (var i = 0; i < horsMontage.length; i++) {
      var h = horsMontage[i];
      // un module se REMPLACE à son id (c'est ce que fait enregistre) ; un
      // filtre se reconnaît à son nom, son propriétaire et son texte
      if (e.mod || h.mod) {
        if (e.mod && h.mod && h.mod.id === e.mod.id) { horsMontage[i] = e; return; }
        continue;
      }
      if (h.nom === e.nom && h.prop === e.prop &&
          (h.fn === e.fn || (e.src && h.src === e.src))) { horsMontage[i] = e; return; }
    }
    horsMontage.push(e);
  }
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Elle change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  // Rejoué au début de chaque montage : le contrat promet qu'un Owd.filtre ou
  // un Owd.enregistre lancé depuis la console vaut « pour le montage suivant »,
  // et pour tous ceux d'après. Mais seulement ce qui a encore un AYANT DROIT :
  // le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait sinon de fausser les calculs à chaque montage, sans un mot et
  // sans rien pour le défaire — seul un rechargement complet de la page en
  // viendrait à bout, geste que le joueur n'a pas dans l'iframe Roll20.
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout échappe à
      // toute attribution : son propriétaire vaut « ? », comme une ligne tapée
      // à la console, que le contrat promet de conserver. On ne peut pas
      // distinguer les deux — mais on peut refuser de rejouer un « ? » anonyme
      // dès que la liste des mods a BOUGÉ. Une mise au point à la console, elle,
      // ne touche pas aux mods : elle survit.
      if (h.prop === "?" && signatureAuMontage !== null && h.sig !== sig) return;
      reste.push(h);
      if (h.mod) enregistre(h.mod);
      else ajouteFiltre(h.nom, h.fn, h.prop);
    });
    horsMontage = reste;
    signatureAuMontage = sig;
  }
  function aFiltre(nom) {
    var l = filtres[nom];
    return !!(l && l.length);
  }
  // La passe : chaque filtre reçoit la valeur rendue par le précédent. Un
  // filtre qui jette, ou qui rend autre chose qu'un nombre fini, est IGNORÉ
  // pour cette passe et compte une faute ; cinq fautes de SUITE et il part,
  // parce qu'un filtre cassé fausserait chaque calcul de la fiche sans que
  // personne ne sache d'où vient le chiffre.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    if (filtresEnCours[nom]) return valeur;   // garde de récursion, PAR NOM
    filtresEnCours[nom] = 1;
    try {
      var i = 0;
      while (i < liste.length) {
        var f = liste[i], v = null, msg = "";
        try { v = f.fn(valeur, infos); }
        catch (err) { msg = messageErreur(err); }
        if (!msg && typeof v === "number" && isFinite(v)) {
          valeur = v;
          f.echecs = 0;
          i++;
          continue;
        }
        if (!msg) msg = typeof v === "number" ? "résultat non fini" : "résultat de type " + (typeof v);
        f.echecs++;
        if (f.echecs < FILTRE_FAUTES) { i++; continue; }
        liste.splice(i, 1);   // retiré : le suivant a pris la place, i ne bouge pas
        retireFiltre(nom, f, msg);
      }
    } finally { filtresEnCours[nom] = 0; }
    return valeur;
  }
  function retireFiltre(nom, f, msg) {
    var texte = "filtre " + nom + " retiré : " + msg;
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + f.prop + "] " + texte);
    // le propriétaire porte l'erreur : c'est ce que Owd.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Owd.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son mod à la construction du contexte.
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }
  // le passage public d'un calcul : le brut, puis les filtres. Le test évite de
  // fabriquer l'objet d'infos pour rien — ces calculs sont rappelés des
  // centaines de fois par rafraîchissement.
  function pub(nom, valeur, infos) {
    return aFiltre(nom) ? applique(nom, valeur, infos || {}) : valeur;
  }

  // ---------- calculs ----------
  // Chaque valeur dérivée existe en DEUX TEMPS : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur AVANT le forçage du MJ — c'est ce que montre le
  // placeholder du champ « Forcé », et ce que dit l'infobulle quand un forçage
  // est en place.

  // ---- LA CHAÎNE À NEUF BOÎTES ----
  // Toute valeur dérivée de la fiche passe par elle, et elle ne sait rien
  // d'Outward : elle prend une base et rend un nombre.
  //
  //     le forçage, s'il est posé — il court-circuite TOUT
  //     sinon  (((base + a1 + a2) × m1 × m2) + a3 + a4) × m3 × m4
  //
  // QUATRE GROUPES ET NON TROIS : trois ne savent pas dire « ajoute 20 puis
  // double le tout ». L'ordre DANS un groupe, lui, est sans effet.
  //
  // La chaîne ne sait pas où dorment ses nombres : elle ne reçoit qu'une
  // fonction qui rend une boîte. Trois lecteurs la nourrissent — les
  // caractéristiques, les capacités, les compétences — et un quatrième
  // s'écrirait sans toucher à ces lignes.
  function chaineAdd(v) { return v === undefined ? 0 : v; }
  function chaineMul(v) { return v === undefined ? 1 : v; }
  function chaineAuto(lire, base) {
    var v = (((base + chaineAdd(lire("a1")) + chaineAdd(lire("a2"))) *
              chaineMul(lire("m1")) * chaineMul(lire("m2"))) +
             chaineAdd(lire("a3")) + chaineAdd(lire("a4"))) *
            chaineMul(lire("m3")) * chaineMul(lire("m4"));
    // un NaN né ici traverserait la fiche entière sans qu'on sache d'où il vient
    if (!isFinite(v)) return base;
    return Math.round(v * 100) / 100;   // arrondi au centième, À LA TOUTE FIN
  }
  function chaine(lire, base) {
    var f = lire("force");
    return f === undefined ? chaineAuto(lire, base) : f;
  }
  // Les trois lecteurs. Chacun rend une fonction qui prend un nom de boîte :
  // c'est ce que la chaîne, les infobulles et levierRegleDe() attendent.
  function lireTable(nomTable, nom, cle) {
    return function (boite) {
      var t = state[nomTable] && state[nomTable][nom];
      var tb = t && t[boite];
      var v = tb && tb[cle];
      return (typeof v === "number" && isFinite(v)) ? v : undefined;
    };
  }
  function lireCarac(nom, c) { return lireTable("caracsLeviers", nom, c); }
  function lireCap(nom, cle) { return lireTable("capsLeviers", nom, cle); }
  function lireComp(nom, id) { return lireTable("compsLeviers", nom, id); }

  // ---- caractéristiques ----
  // La valeur d'une caractéristique : sa part de création plus les points
  // achetés à l'expérience. C'est elle qui entre dans la chaîne des leviers.
  function caracBase(c) { return num(state.caracs[c], 0); }
  function caracAchat(c) { return Math.max(0, Math.round(num((state.caracsXp || {})[c], 0))); }
  function caracVal(c) { return caracBase(c) + caracAchat(c); }
  function caracAuto(c) { return caracVal(c); }

  // ---- création ----
  // Budget et bornes viennent des règles. Sans elles, aucun contrôle : la
  // fiche n'invente pas une répartition que le livre ne donne pas.
  function creation() {
    var cr = D().creation;
    return (cr && typeof cr === "object") ? cr : null;
  }
  // Les POINTS D'AVANTAGE que le livre donne, et ce que coûtent les avantages
  // pris. Sans la page du livre, la fiche ne compte rien : null.
  function avantagePoints() {
    var a = D().avantages;
    return (a && typeof a === "object") ? num(a.points, 0) : null;
  }
  function avantageDepense() {
    var t = 0;
    state.avantages.forEach(function (a) { t += pnum(a.cout); });
    return Math.round(t * 100) / 100;
  }
  function creationPoints() { var cr = creation(); return cr ? num(cr.points, 0) : 0; }
  function creationDepense() {
    var t = 0;
    caracsOrdre().forEach(function (c) { t += caracBase(c); });
    return t;
  }

  // ---- progression à l'expérience ----
  // Le prix du point qui porte la caractéristique à `v`. La table des règles
  // donne ses tranches ; au-delà, la pente qu'elles annoncent. null quand les
  // règles manquent : un point sans prix connu ne s'achète pas.
  function prixPointCarac(v) {
    var p = D().progressionCarac, tr = p && Array.isArray(p.tranches) ? p.tranches : [];
    if (!tr.length) return null;
    var i, t;
    for (i = 0; i < tr.length; i++) {
      t = tr[i];
      if (v >= num(t.de, 0) && v <= num(t.a, 0)) return num(t.xp, 0);
    }
    if (v < num(tr[0].de, 0)) return num(tr[0].xp, 0);
    var der = tr[tr.length - 1], larg = Math.max(1, num(p.largeur, 1));
    return num(der.xp, 0) + num(p.pas, 0) * Math.ceil((v - num(der.a, 0)) / larg);
  }
  // Ce que coûtent les points achetés d'une caractéristique, de sa valeur de
  // création jusqu'à sa valeur actuelle.
  function caracXpDe(c) {
    var b = caracBase(c), n = caracAchat(c), t = 0, i, p;
    for (i = 1; i <= n; i++) { p = prixPointCarac(b + i); t += p === null ? 0 : p; }
    return t;
  }
  // Le coût effectif : celui des règles, passé à la chaîne du levier « xp ».
  function caracXp(c) { return chaine(lireCarac("xp", c), caracXpDe(c)); }
  function caracsXpDepense() {
    var t = 0;
    caracsOrdre().forEach(function (c) { t += caracXp(c); });
    return t;
  }
  function caracTotalBrut(c) { return chaine(lireCarac("total", c), caracVal(c)); }
  function caracTotal(c) { return pub("caracTotal", caracTotalBrut(c), { carac: c }); }

  // ---- capacités dérivées ----
  // UNE SEULE fonction de calcul pour toutes : la formule vient de
  // owd-creation.json (base + carac × facteur, ou carac ÷ diviseur), et les
  // trois emplacements de modificateurs s'y ajoutent. Une capacité de plus ne
  // demande alors ni ligne de calcul, ni clé racine, ni suffixe d'attribut.
  //
  // Une capacité SANS FORMULE (carac null et base nulle, comme les points de
  // mana aujourd'hui) rend 0, et ce zéro se VOIT sur la fiche : c'est la donnée
  // qui le dit, pas un cas particulier codé ici.
  function capAuto(cle) {
    var d = capDef(cle);
    var v = 0;
    if (d) {
      v = num(d.base, 0);
      if (d.carac) {
        var t = caracTotal(d.carac);
        if (d.diviseur) {
          var q = t / num(d.diviseur, 1);
          v += (d.arrondi === "haut") ? Math.ceil(q) : Math.floor(q);
        } else {
          v += t * (d.facteur === undefined ? 1 : num(d.facteur, 1));
        }
      }
    }
    Object.keys(state.effetsPermanents || {}).forEach(function(id){var e=effetDefinition(id);if(state.effetsPermanents[id] && e && e.ops.permanent)v+=num(e.ops.permanent[cle],0);});
    return v;
  }
  // Le maximum EFFECTIF d'une capacité : le forçage du MJ s'il existe, la
  // valeur calculée sinon. `auto` est passée à part parce que PV et PE portent
  // en plus le poids de l'effondrement.
  function capMax(cle, auto) { return chaine(lireCap("max", cle), auto()); }
  // « réglé » ne veut pas dire « forcé » : un facteur ou un ajout comptent
  // autant. C'est ce que la fiche marque d'un point d'encre appuyée.
  function capForce(cle) { return levierRegleDe(lireCap("max", cle)); }

  // ---- effondrement ----
  // Un niveau par tranche de 10 % PERDUE sur les réserves que les règles
  // nomment (repos, satiété, hydratation) et par tranche d'exposition ; les
  // niveaux s'additionnent, plafonnés. Rien de tout cela n'est écrit ici : la
  // tranche, le plafond, les pourcentages et la LISTE des réserves viennent de
  // owd-creation.json, et la table des dix lignes du livre n'apparaît nulle
  // part dans le DOM.
  function effTranche() { return Math.max(1, num(effDef().tranche, 10)); }
  function effPlafond() { return Math.max(0, num(effDef().plafond, 10)); }
  function effReserves() {
    var r = effDef().reserves;
    return Array.isArray(r) ? r : [];
  }
  // Ce qu'une réserve apporte au niveau. L'exposition est un cas à part, et
  // c'est la DONNÉE qui le dit (« signe: true ») : ce n'est pas une perte mais
  // un ÉCART à zéro, et il compte dans les deux sens — un homme gelé et un
  // homme cuit s'effondrent pareil.
  function effNiveauDe(cle) {
    var d = capDef(cle);
    if (d && d.signe) {
      var max = expoMax();
      if (max <= 0) return 0;
      return Math.floor((Math.abs(state.etat.expo) / max) * 100 / effTranche());
    }
    var m = maxDe(cle);
    if (m <= 0) return 0;
    var perte = (m - courantBrut(cle)) / m * 100;
    if (perte <= 0) return 0;
    return Math.floor(perte / effTranche());
  }
  var EFF_PARTIES = ["pr", "charge", "froid", "chaud", "ps", "contenance", "ph", "alcool", "pi", "autre"];
  function effReglage(cle) {
    return (state.effParties || {})[cle] || { effet: 0, mod: 0 };
  }
  // Une tranche complète de 5 % au-delà du maximum ; tolérance aux seules erreurs flottantes.
  function effSurcharge(pris, maximum) {
    if (maximum <= 0) return pris > 0 ? effPlafond() : 0;
    var tranche = Math.max(0.001, num(effDef().surchargeTranche, 5));
    return Math.max(0, Math.floor((pris - maximum) * 100 / maximum / tranche + 1e-9));
  }
  function effPhotoPartie(cle) { return state.effPause && state.effPause.parties && state.effPause.parties[cle]; }
  function effBasePartie(cle) {
    var photo = effPhotoPartie(cle); if (photo) return photo.base;
    if (cle === "charge") return effSurcharge(poidsPorte(), charge());
    if (cle === "contenance") return effSurcharge(contenancePrise(), contenance());
    if (cle === "alcool") return Math.max(0, num(state.effAlcool, 0));
    if (cle === "pi") return effNiveauDe("pi");
    if (cle === "froid" || cle === "chaud") return (cle === "froid" ? num(state.etat.expo, 0) < 0 : num(state.etat.expo, 0) > 0) ? effNiveauDe("expo") : 0;
    if (cle === "autre") return 0;
    if (cle === "total") return EFF_PARTIES.reduce(function (t, k) { return t + effBasePartie(k); }, 0);
    return effReserves().indexOf(cle) >= 0 ? effNiveauDe(cle) : 0;
  }
  function effApresEffets(cle) {
    var photo = effPhotoPartie(cle); if (photo) return photo.apres;
    var base = cle === "total" ? EFF_PARTIES.reduce(function (t, k) { return t + effPartie(k); }, 0) : effBasePartie(cle);
    var valeur = Math.floor(pub("effondrementPartie", base + num(effReglage(cle).effet, 0) + effetBonus("effondrement",cle) + (cle === "alcool" ? effetBonus("alcool") : 0), { cle: cle, base: base }));
    return cle === "autre" ? valeur : Math.max(0, valeur);
  }
  function effPartie(cle) {
    var photo = effPhotoPartie(cle); if (photo) return photo.niveau;
    var mod = cle === "autre" ? num(state.effAutre, 0) : num(effReglage(cle).mod, 0);
    var valeur = effApresEffets(cle) + mod;
    return cle === "autre" ? valeur : Math.max(0, valeur);
  }
  function effondrementAuto() {
    return clamp(effPartie("total"), 0, effPlafond());
  }
  // Le seul levier qui joue sur un NIVEAU et non sur des points : le MJ y pose
  // l'effondrement que les quatre réserves ne savent pas dire.
  function effondrementBrut() {
    return clamp(Math.floor(chaine(lireCap("max", "effondrement"), effondrementAuto())),
                 0, effPlafond());
  }
  function effondrementActif() { return pub("effondrement", effondrementBrut(), {}); }
  function effondrement() {
    if (state.effDesactive) return 0;
    if (state.effPause) return state.effPause.niveau;
    return effondrementActif();
  }
  function effSpecifiques() {
    var d = effDef().specifiques || {}, actif = !state.effDesactive;
    function n(cle) { return actif ? Math.max(0, effPartie(cle)) : 0; }
    var eveille = state.effort !== "sommeil", repos = eveille ? n("pr") : 0;
    return { pe: repos * num(d.reposPE, 0), pm: repos * num(d.reposPM, 0),
      ps: Math.floor(n("froid") / Math.max(1, num(d.froidTranche, 2))) * num(d.froidPS, 0),
      ph: Math.floor(n("chaud") / Math.max(1, num(d.chaudTranche, 2))) * num(d.chaudPH, 0),
      froid: n("ps") * num(d.faimFroid, 0), chaud: n("ph") * num(d.soifChaud, 0),
      pas: n("charge") * num(d.chargePas, 0) + n("contenance") * num(d.contenancePas, 0),
      mana: n("alcool") * num(d.alcoolMana, 0), difficulte: n("alcool") * num(d.alcoolDifficulte, 0) };
  }
  function figeEffondrement() {
    var photo = { niveau: effondrementActif(), parties: {} };
    EFF_PARTIES.forEach(function (cle) {
      var base = effBasePartie(cle);
      photo.parties[cle] = {
        base: base, apres: effApresEffets(cle), niveau: effPartie(cle),
        effet: pub("effondrementPartie", base + num(effReglage(cle).effet, 0) + effetBonus("effondrement",cle) + (cle === "alcool" ? effetBonus("alcool") : 0), { cle: cle, base: base }) - base,
        mod: cle === "autre" ? num(state.effAutre, 0) : num(effReglage(cle).mod, 0)
      };
    });
    return photo;
  }
  // Ce que l'effondrement laisse d'un maximum, en pour cent. À appliquer sur le
  // maximum ENTIER (modificateurs compris) : l'effondrement diminue ce que le
  // corps peut porter, pas seulement ce que la caractéristique lui donnait.
  function effReste(pct) {
    return clamp(100 - pct * effondrement(), 0, 100) / 100;
  }
  function pvMaxAuto() {
    return Math.floor(capAuto("pv") * effReste(num(effDef().pvParNiveau, 0)));
  }
  function peMaxAuto() {
    return Math.floor(capAuto("pe") * effReste(num(effDef().peParNiveau, 0)));
  }

  // ---- les treize maximums, un par un ----
  // Chacun existe en trois temps : Auto (avant forçage), Brut (après forçage),
  // public (après filtres). C'est ce qui permet au champ « Forcé » de montrer
  // la valeur calculée en filigrane, et à un mod de changer le résultat sans
  // toucher au forçage du MJ.
  function pvMax() { return pub("pvMax", capMax("pv", pvMaxAuto), {}); }
  function peMax() { return pub("peMax", capMax("pe", peMaxAuto), {}); }
  function pmMaxAuto() { return capAuto("pm"); }
  function pmMax() { return pub("pmMax", capMax("pm", pmMaxAuto), {}); }
  function piMaxAuto() { return capAuto("pi"); }
  function piMax() { return pub("piMax", capMax("pi", piMaxAuto), {}); }
  function prMaxAuto() { return capAuto("pr"); }
  function prMax() { return pub("prMax", capMax("pr", prMaxAuto), {}); }
  function psMaxAuto() { return capAuto("ps"); }
  function psMax() { return pub("psMax", capMax("ps", psMaxAuto), {}); }
  function phMaxAuto() { return capAuto("ph"); }
  function phMax() { return pub("phMax", capMax("ph", phMaxAuto), {}); }
  function pcMaxAuto() { return capAuto("pc"); }
  function pcMax() { return pub("pcMax", capMax("pc", pcMaxAuto), {}); }
  function chargeAuto() { return capAuto("charge"); }
  function charge() { return pub("charge", capMax("charge", chargeAuto), {}); }
  function accesAuto() { return capAuto("acces"); }
  function accesRapides() { return pub("accesRapides", capMax("acces", accesAuto), {}); }
  function contenanceAuto() { return capAuto("contenance"); }
  function contenance() { return pub("contenance", capMax("contenance", contenanceAuto), {}); }
  function expoMaxAuto() { return capAuto("expo"); }
  function expoMax() { return pub("expoMax", capMax("expo", expoMaxAuto), {}); }
  function ruptureMaxAuto() { return rupturePoints(); }
  function ruptureMax() { return pub("ruptureMax", capMax("rupture", ruptureMaxAuto), {}); }
  function desActionAuto() { return desActionBase(); }
  function desAction() { return pub("desAction", capMax("desAction", desActionAuto), {}); }

  // La table des maximums, par clé d'état : un seul endroit où le nom d'une
  // jauge se relie à son calcul. Les blocs, les cartes de tchat et les leviers
  // du MJ la lisent tous — deux tables se seraient contredites.
  var MAX_DE = {
    pv: pvMax, pe: peMax, pm: pmMax, pi: piMax,
    pr: prMax, ps: psMax, ph: phMax, pc: pcMax,
    charge: charge, acces: accesRapides, contenance: contenance,
    expo: expoMax, rupture: ruptureMax, desAction: desAction,
    effondrement: function () { return effPlafond(); }
  };
  var AUTO_DE = {
    pv: pvMaxAuto, pe: peMaxAuto, pm: pmMaxAuto, pi: piMaxAuto,
    pr: prMaxAuto, ps: psMaxAuto, ph: phMaxAuto, pc: pcMaxAuto,
    charge: chargeAuto, acces: accesAuto, contenance: contenanceAuto,
    expo: expoMaxAuto, rupture: ruptureMaxAuto, desAction: desActionAuto,
    effondrement: effondrementAuto
  };
  function maxDe(cle) { return aClef(MAX_DE, cle) ? MAX_DE[cle]() : 0; }
  function autoDe(cle) { return aClef(AUTO_DE, cle) ? AUTO_DE[cle]() : 0; }
  // La valeur COURANTE d'une jauge : null veut dire « au maximum », et la
  // valeur suit alors le maximum quand il bouge — ce qu'un nombre figé ne
  // ferait pas, et le maximum de PV et de PE bouge à chaque niveau
  // d'effondrement.
  function courantBrut(cle) {
    var v = state.etat[cle];
    return v === null || v === undefined ? maxDe(cle) : v;
  }
  function courant(cle) { return courantBrut(cle); }

  // ---- charge, poches, sac, par terre, accès rapides ----
  // Seuls les objets effectivement portés contribuent à la charge.
  // Les objets au sol, et tous les contenus de leurs contenants, sont exclus. Les poches et le sac ont en plus chacun leur capacité, qui vient de
  // ce que le personnage porte : les poches des vêtements dans leur case, et
  // le sac posé dans la case du sac à dos.
  function poidsDe(o) { return window.OwdInventoryData.totalQuantity(state.inv.objets,o) * pnum(o.poids); }
  function poidsOu(test) {
    var t = 0;
    state.inv.objets.forEach(function (o) { if (test(o.ou, o)) t += poidsDe(o); });
    return Math.round(t * 1000) / 1000;
  }
  // Les poches et le sac ne se limitent pas en poids mais en ENCOMBRANCE
  // (eb) : ce qu'ils contiennent se compare, en eb, à ce que valent les poches
  // des vêtements portés et le sac porté.
  function ebOu(ou) {
    var t = 0;
    // Un Contenu déjà rangé dans son Contenant n'occupe pas une seconde fois
    // la capacité du sac ou des poches. Son poids, lui, reste bien porté.
    state.inv.objets.forEach(function (o) {
      if (!o.dans && o.ou === ou) t += pnum(o.qte) * pnum(o.encombre);
    });
    return Math.round(t * 1000) / 1000;
  }
  function ebPoches() { return ebOu("poches"); }
  function ebSac() { var bag=window.OwdInventoryData.backpack(state.inv.objets), n=0;
    state.inv.objets.forEach(function(o){if(bag&&o.dans===bag.ref&&o.ou==="sac")n+=pnum(o.qte)*pnum(o.encombre);});return n; }
  // LES CASES QU'OCCUPE UN OBJET. D'ordinaire une seule, celle de son
  // emplacement ; mais un vêtement « Haut + Bas » (une robe) tient le haut ET
  // le bas, et une arme à deux mains les deux mains. Son emplacement « ou »
  // est alors la case d'ANCRAGE (haut, main droite), l'autre suit.
  function casesDe(o, ou, forceDeux) {
    var explicite = !!ou;
    ou = ou || o.ou;
    if (!explicite && (o.dans || pnum(o.qte)!==1)) return [];
    if (o.vet === "hautbas" && (ou === "haut" || ou === "bas")) return ["haut", "bas"];
    if ((ou === "mainG" || ou === "mainD") &&
        (o.mains === "2 obligatoires" || (forceDeux === undefined ? o.tenueDeuxMains === true : forceDeux === true)))
      return ["mainG", "mainD"];
    return INV_CASES.indexOf(ou) >= 0 ? [ou] : [];
  }
  // Une CASE de Sur soi accepte-t-elle cet objet ? Les mains prennent tout ;
  // la ceinture, une ceinture ; le dos, un sac ; une case de vêtement ou
  // d'accessoire, ce qui s'y porte.
  function casePermise(o, ou) {
    if(pnum(o.qte)<1)return false;
    if (ou === "mainG" || ou === "mainD") return true;
    if (ou === "ceinture") return !!o.ceint;
    if (ou === "dos") return !!o.sac;
    if (INV_ACCESSOIRES.indexOf(ou) >= 0) return !!o.acc && (INV_ACC_TYPES[o.acc] || []).indexOf(ou) >= 0;
    return o.vet === ou || (o.vet === "hautbas" && (ou === "haut" || ou === "bas"));
  }
  // LES EMPLACEMENTS (ep) : la ceinture portée et le sac porté en offrent
  // chacun un nombre, avec l'encombrance au plus qu'un emplacement accepte.
  // Un emplacement tient UN exemplaire, et ne compte dans aucune capacité.
  function porteurEp(lieu, objets) {
    var out = null, cas = lieu === "ceint" ? "ceinture" : "dos";
    (objets || state.inv.objets).forEach(function (o) {
      if (!out && !o.dans && pnum(o.qte)===1 && o.ou === cas && (lieu === "ceint" ? o.ceint : o.sac)) out = o;
    });
    return out;
  }
  function nbEp(lieu, objets) { var p = porteurEp(lieu, objets); return p ? p.ep : 0; }
  function ebMaxEp(lieu, objets) { var p = porteurEp(lieu, objets); return p ? (p.tailleAccroche || (p.sac ? "Moyenne" : "")) : ""; }
  function objetEp(lieu, k) {
    var out = null;
    state.inv.objets.forEach(function (o) {
      if (!out && (!o.dans || (lieu === "sacep" && porteurEp(lieu) && o.dans === porteurEp(lieu).ref)) && o.ou === lieu && o.emp <= k && k < o.emp + invCoutAcc(o,lieu)) out = o;
    });
    return out;
  }
  function epPermis(o, lieu, objets) {
    if(pnum(o.qte)<1 || !porteurEp(lieu,objets))return false;
    return invTailleAccepte(o.taille,ebMaxEp(lieu,objets)) && o !== porteurEp(lieu,objets);
  }
  // Ce qui n'a plus d'emplacement valable (ceinture ôtée, rang au-delà du
  // nombre, trop encombrant, deux au même rang, une pile) retourne au sac.
  // Un exemplaire qui retourne au sac y REJOINT sa pile, s'il en a une.
  function rangeEmplacements(objets) {
    window.OwdInventoryData.normalizeSlots(objets);
    var pris = {}, rendus = [];
    objets.forEach(function (o) {
      if (o.dans && o.ou !== "sacep") { o.emp = -1; return; }
      if(o.dans && o.ou === "sacep" && (!porteurEp("sacep",objets)||porteurEp("sacep",objets).ref!==o.dans))return;
      if (INV_EP.indexOf(o.ou) < 0) { o.emp = -1; return; }
      var cle = o.ou + o.emp;
      if (o.emp < 0 || o.emp + invCoutAcc(o,o.ou) > nbEp(o.ou, objets) || pris[cle] || (invCoutAcc(o,o.ou)>1 && pris[o.ou+(o.emp+1)]) ||
          pnum(o.qte) > 1 || !epPermis(o, o.ou, objets)) {
        o.ou = "sac"; o.emp = -1;
        rendus.push(o);
        return;
      }
      for(var j=0;j<invCoutAcc(o,o.ou);j++)pris[o.ou+(o.emp+j)]=1;
    });

  }
  // la case d'ancrage d'un objet posé en `ou`
  function ancrage(o, ou, forceDeux) {
    var c = casesDe(o, ou, forceDeux);
    return c.length > 1 ? (o.vet === "hautbas" ? "haut" : "mainD") : ou;
  }
  function objetEn(cas) {
    var out = null;
    state.inv.objets.forEach(function (o) { if (!out && casesDe(o).indexOf(cas) >= 0) out = o; });
    return out;
  }
  // un vêtement ou un accessoire PORTÉ : dans la case de son type (la robe,
  // en haut). Poches et protection viennent des deux.
  function vetementsPortes() {
    return state.inv.objets.filter(function (o) {
      return !o.dans && pnum(o.qte)===1 && ((o.vet && (o.ou === o.vet || (o.vet === "hautbas" && o.ou === "haut"))) ||
             (o.acc && INV_ACCESSOIRES.indexOf(o.ou) >= 0 && casePermise(o, o.ou)));
    });
  }
  // Objets dont les propriétés passives s'appliquent lorsqu'ils sont portés.
  function equipementsPortes() {
    var clothes=vetementsPortes();
    return (state.inv.objets || []).filter(function(o) {
      return !o.dans && pnum(o.qte)===1 && ((o.sac && o.ou==="dos") || (o.ceint && o.ou==="ceinture") || clothes.indexOf(o)>=0);
    });
  }
  function equipementsBonus() {
    var out=equipementsPortes();
    (state.inv.objets||[]).forEach(function(o){
      if(!o.dans && pnum(o.qte)===1 && (o.ou==="mainG" || o.ou==="mainD") && out.indexOf(o)<0)out.push(o);
    });
    return out.filter(function(o){return invType(o)!=="consommable";});
  }
  function capPoches() {
    var t = 0;
    vetementsPortes().forEach(function (o) { t += pnum(o.poches); });
    return Math.round(t * 1000) / 1000;
  }
  function capSac() {
    var s = objetEn("dos");
    return s && s.sac ? pnum(s.cap) : 0;
  }
  // Le poids porté se calcule ICI et nulle part ailleurs : le module
  // d'inventaire lit les mêmes fonctions.
  function poidsPorteBrut() { var porte = window.OwdInventoryData.carrier(state.inv.objets); return poidsOu(function (ou, o) { return porte(o); }); }
  function poidsPorte() { return pub("poidsPorte", poidsPorteBrut(), {}); }
  // Les objets marqués « prise rapide », comptés à l'unité et non à la
  // quantité : un carquois de vingt flèches occupe UN accès, pas vingt. Qu'ils
  // soient dans les poches ou dans le sac ne change rien.
  function accesPris() {
    var n = 0, porte = window.OwdInventoryData.carrier(state.inv.objets);
    state.inv.objets.forEach(function (o) { if (o.rapide && pnum(o.qte) > 0 && porte(o)) n++; });
    return n;
  }
  // La contenance OCCUPÉE se compte à la main (le pas du bloc Corps) : la fiche
  // ne devine pas ce qu'un personnage a dans le ventre à partir de son sac. Les
  // « places » d'un objet disent ce qu'il occuperait une fois avalé ; c'est une
  // aide à la saisie, pas un calcul automatique.
  function contenancePrise() { return state.etat.contenance; }

  // ---- compétences ----
  function compDe(id) {
    var out = null;
    state.comps.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }
  function compRang(c) { return c ? clamp(num(c.rang, 0), 0, rangMax()) : 0; }
  // Les DÉS qu'une compétence engage au plus : ceux de son rang, ou le nombre
  // forcé par le MJ. Le joueur peut toujours en engager moins (barre d'envoi,
  // segment « Dés engagés ») : c'est un plafond, pas une obligation.
  function compDesBrut(c) {
    if (!c) return 0;
    return Math.floor(chaine(lireComp("des", c.id), num(rangInfo(compRang(c)).des, 0)));
  }
  function compDes(c) { return pub("compDes", compDesBrut(c), { comp: c }); }
  // Le BONUS d'une compétence : celui de son rang, passé à la chaîne.
  function compBonusAuto(c) { return num(rangInfo(compRang(c)).bonus, 0); }
  function compBonusBrut(c) {
    if (!c) return 0;
    return chaine(lireComp("bonus", c.id), compBonusAuto(c));
  }
  function compBonus(c) { return pub("compBonus", compBonusBrut(c), { comp: c }); }
  // Les rangs OFFERTS d'une compétence : ceux qu'elle a reçus sans XP. Ils se
  // posent au levier « offerts » des Options et valent pour les PREMIERS
  // rangs. La valeur brute n'est pas coiffée par le rang : offrir deux rangs
  // à une compétence encore au Rang 0 rend gratuits les deux qu'elle prendra.
  function compOffertsBrut(c) {
    return c ? Math.max(0, Math.round(chaine(lireComp("offerts", c.id), 0))) : 0;
  }
  function compOfferts(c) { return Math.min(compOffertsBrut(c), compRang(c)); }
  // Ce qu'une compétence a coûté : la somme des rangs pris, prix par prix, hors
  // rangs offerts. Les prix viennent des règles, jamais d'ici.
  function compXpAuto(c) {
    var xp = 0, r = rangs(), i;
    for (i = compOfferts(c) + 1; i <= compRang(c) && i < r.length; i++) xp += num(r[i].xp, 0);
    return xp;
  }
  function compXpBrut(c) {
    if (!c) return 0;
    return chaine(lireComp("xp", c.id), compXpAuto(c));
  }
  function compXp(c) { return pub("compXp", compXpBrut(c), { comp: c }); }
  // Les points de rupture qu'une compétence engage : ceux de ses rangs.
  function compRuptureAuto(c) {
    var t = 0, r = rangs(), i;
    for (i = 1; i <= compRang(c) && i < r.length; i++) t += num(r[i].rupture, 0);
    return t;
  }
  function compRupture(c) {
    if (!c) return 0;
    return chaine(lireComp("rupture", c.id), compRuptureAuto(c));
  }
  // Une compétence est INVESTIE dès que quelque chose y est posé : un rang, un
  // modificateur, un forçage. Sans ce dernier point, la puce « Investies »
  // cacherait la compétence qu'on vient justement de régler.
  function compInvestie(c) {
    if (!c) return false;
    return compRang(c) > 0 ||
           levierRegleDe(lireComp("bonus", c.id)) ||
           levierRegleDe(lireComp("des", c.id)) ||
           levierRegleDe(lireComp("offerts", c.id));
  }
  function compGroupe(c) { return String(c.groupe || "").trim(); }

  // ---- limites de rangs ----
  // Combien de rangs de compétence et de technique le personnage porte en
  // tout : la somme de ses caractéristiques (création + expérience, SANS les
  // leviers du MJ) divisée comme les règles le disent. null quand les règles
  // manquent : aucune limite inventée.
  function sommeCaracs() {
    var t = 0;
    caracsOrdre().forEach(function (c) { t += caracVal(c); });
    return t;
  }
  function limiteRangs(cle) {
    var l = (D().limites || {})[cle];
    if (!l) return null;
    var q = sommeCaracs() / Math.max(1, num(l.diviseur, 1));
    return l.arrondi === "haut" ? Math.ceil(q) : Math.floor(q);
  }
  // Les rangs qui COMPTENT : les rangs pris, moins les rangs offerts.
  function compRangsComptes() {
    var t = 0;
    state.comps.forEach(function (c) { t += compRang(c) - compOfferts(c); });
    return t;
  }
  function techOfferts(t) { return clamp(num(t.offert, 0), 0, num(t.rang, 0)); }
  function techRangsComptes() {
    var n = 0;
    state.techniques.forEach(function (t) { n += Math.max(0, num(t.rang, 0) - techOfferts(t)); });
    return n;
  }
  // Ce qu'une montée de `de` à `a` ajoute au compte, les rangs offerts
  // (les `offert` premiers) n'y entrant pas.
  function rangsComptesEntre(de, a, offert) {
    var n = 0, i;
    for (i = de + 1; i <= a; i++) if (i > offert) n++;
    return n;
  }

  // ---- techniques, expérience, rupture ----
  function techXp(t) { return Math.max(0, num(t.xp, 0)); }
  function techRupture(t) { return Math.max(0, num(t.rupture, 0)); }
  function xpDepenseBrut() {
    var xp = 0;
    state.comps.forEach(function (c) { xp += compXp(c); });
    state.techniques.forEach(function (t) { xp += techXp(t); });
    return xp + caracsXpDepense();
  }
  function xpDepense() { return pub("xpDepense", xpDepenseBrut(), {}); }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  // Les points de rupture ENGAGÉS : ceux des Rangs Max et ceux que les
  // techniques ont demandés. Le compteur de l'en-tête et le bloc Rupture lisent
  // tous deux ces fonctions.
  function ruptureComps() {
    var t = 0;
    state.comps.forEach(function (c) { t += compRupture(c); });
    return t;
  }
  function ruptureTechs() {
    var t = 0;
    state.techniques.forEach(function (x) { t += techRupture(x); });
    return t;
  }
  function ruptureDepense() { return ruptureComps() + ruptureTechs(); }
  function ruptureRestante() { return ruptureMax() - ruptureDepense(); }

  // ---- climat ----
  // La zone de confort du personnage HABILLÉ : les deux bornes du corps nu
  // viennent des règles (owd-creation.json), les degrés de protection de ce
  // qu'il porte. Les bornes nues ne sont jamais montrées seules : ce serait une
  // règle affichée.
  // la protection des VÊTEMENTS PORTÉS, dans la case de leur type
  function protection(champ) {
    var t = 0;
    equipementsPortes().forEach(function (o) { t += snum(o[champ]); });
    return Math.round((t + effetBonus("climat",champ) + num(effSpecifiques()[champ], 0)) * 10) / 10;
  }
  // ---- le temps qui passe ----
  // Tout vient de owd-creation.json (clé « temps ») : les efforts et ce qu'ils
  // coûtent, la cadence de chaque niveau de récupération, les paliers du
  // climat, le retour de l'exposition, les niveaux qui accélèrent la dépense.
  // Sans ces données, le temps ne passe pas : la fiche n'invente aucun taux.
  function tempsDef() { var t = D().temps; return (t && Array.isArray(t.efforts)) ? t : null; }
  function effortsListe() { var t = tempsDef(); return t ? t.efforts : []; }
  function effortDe(cle) {
    var out = null;
    effortsListe().forEach(function (e) { if (e.cle === cle) out = e; });
    return out;
  }
  // ---- récupérations naturelles ----
  // Les niveaux viennent des règles. Le temps ne les traite plus comme un
  // débit continu : chaque récupération possède un compteur de secondes
  // consécutives actives et ne produit son effet qu'à la fin d'une cadence
  // complète (round, minute, 10 m, heure, 8 h...).
  function recupsListe() {
    var t = tempsDef();
    var liste = t && Array.isArray(t.recuperations) ? t.recuperations.slice() : [];
    // Conserver les anciennes lignes permanentes uniquement si elles ont été réglées.
    var niveaux = recupCoffre(false).niveaux || {};
    Object.keys(niveaux).forEach(function (id) {
      if (/^(pv|pe|pm|pr|ps|ph|pi):naturelle$/.test(id) && num(niveaux[id], 0))
        liste.push({id:id, reserve:id.split(":")[0], contexte:"Spéciale — ancien bonus", categorie:"speciale", condition:"toujours", niveau:0});
    });
    return liste;
  }
  function recupCoffre(cree) {
    if (!state.modData || typeof state.modData !== "object") {
      if (!cree) return {};
      state.modData = {};
    }
    var d = state.modData.recuperation;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      if (!cree) return {};
      d = {}; state.modData.recuperation = d;
    }
    return d;
  }
  function recupNiveauRegle(r) { return Math.round(num(r && r.niveau, 0)); }
  function recupNiveauBase(r) {
    var d = recupCoffre(false), n = d.niveaux && d.niveaux[r.id];
    if (n === undefined && r.ancienId && d.niveaux && d.niveaux[r.ancienId] !== undefined)
      n = recupNiveauRegle(r) + Number(d.niveaux[r.ancienId]) - num(r.ancienNiveau, 0);
    return isFinite(Number(n)) ? Math.round(Number(n)) : recupNiveauRegle(r);
  }
  function ecritRecupNiveau(r, v) {
    if (!r || !r.id) return;
    var t = tempsDef(), max = 20;
    if (t && Array.isArray(t.regen) && t.regen.length) {
      max = 0; t.regen.forEach(function (x) { max = Math.max(max, num(x.niveau, 0)); });
    }
    v = clamp(Math.round(num(v, recupNiveauRegle(r))), -max, max);
    var d = recupCoffre(true);
    if (!d.niveaux || typeof d.niveaux !== "object" || Array.isArray(d.niveaux)) d.niveaux = {};
    if (v === recupNiveauRegle(r) && !(r.ancienId && d.niveaux[r.ancienId] !== undefined)) delete d.niveaux[r.id];
    else d.niveaux[r.id] = v;
    if (!Object.keys(d.niveaux).length) delete d.niveaux;
    recupOublieSuivi(r.id);
    nettoieRecupCoffre();
  }
  function recupDefParId(id) {
    var out = null;
    recupsListe().forEach(function (r) { if (r.id === id) out = r; });
    return out;
  }
  function recupCondition(r) {
    if (!r) return false;
    if (r.condition === "toujours") return true;
    if (r.condition === "effort") return state.effort === r.valeur;
    if (r.condition === "sommeil") return (state.effort === "sommeil") === !!r.valeur;
    return false;
  }
  function recupQualiteSommeil(niveau, r) {
    if (!(niveau > 0) || !r || r.categorie === "speciale") return niveau;
    var liee = (r.condition === "sommeil" && !!r.valeur) ||
               (r.condition === "effort" && r.valeur === "sommeil") ||
               (r.condition === "toujours" && state.effort === "sommeil");
    if (!liee) return niveau;
    var t = tempsDef(), qs = t && Array.isArray(t.qualitesSommeil) ? t.qualitesSommeil : [];
    var cle = String(state.qualiteSommeil || "confortable"), mod = 0;
    qs.forEach(function (q) { if (q.cle === cle) mod = num(q.mod, 0); });
    return niveau + mod;
  }
  function recupBloquee(r) {
    var t = tempsDef(), out = false;
    ((t && t.recupBloques) || []).forEach(function (x) {
      if (x.reserve === r.reserve && (!x.effort || x.effort === state.effort)) out = true;
    });
    return out;
  }
  function niveauExpoActuel(cote) {
    var m = expoMax(), x = num(state.etat.expo, 0);
    if (!(m > 0) || !x) return 0;
    if (cote === "froid" && x >= 0) return 0;
    if (cote === "chaud" && x <= 0) return 0;
    return Math.floor((Math.abs(x) / m) * 100 / effTranche());
  }
  function recupCadence(niveau) {
    var t = tempsDef(), n = Math.abs(Math.round(num(niveau, 0))), out = null;
    ((t && t.regen) || []).forEach(function (r) {
      if (num(r.niveau, -1) === n) out = { niveau: n, points: num(r.points, 0), minutes: r.minutes == null ? null : num(r.minutes, 0) };
    });
    if (!out) return null;
    out.signe = niveau < 0 ? -1 : 1;
    return out;
  }
  function recupCadenceSecondes(c) {
    if (!c || !c.points) return 0;
    return c.minutes == null ? 3 : Math.max(1, Math.round(num(c.minutes, 0) * 60));
  }
  // État COMPLET d'une récupération : valeur réglée, modificateurs du
  // personnage et cadence réellement applicable à cet instant.
  function recupEtat(r) {
    var base = recupNiveauBase(r);
    var niveau = recupQualiteSommeil(base, r) + (r.categorie === "naturelle" ? num(effSpecifiques()[r.reserve], 0) : 0);
    var condition = recupCondition(r), bloque = condition && recupBloquee(r);
    var c = recupCadence(clamp(niveau, -20, 20)), exp = null;
    var raison = "";
    if (bloque) raison = "bloquée par l'effort actuel";
    if (exp && exp.aucune) { bloque = true; raison = "bloquée par l'exposition"; }
    if (c && exp && exp.minutes != null) c.minutes = num(exp.minutes, c.minutes);
    return {
      def: r, base: base, niveau: niveau, condition: condition, bloque: bloque,
      actif: !!(condition && !bloque && c && c.points && niveau), cadence: c,
      exposition: exp, raison: raison
    };
  }

  // Suivi persistant de la tranche en cours : { id: { secondes, signature } }.
  // Il ne stocke jamais des fractions de point. Une interruption efface le
  // compteur de la récupération concernée ; le prochain cycle repart de zéro.
  function recupSuivi(cree) {
    var d = recupCoffre(cree);
    if (!d.suivi || typeof d.suivi !== "object" || Array.isArray(d.suivi)) {
      if (!cree) return {};
      d.suivi = {};
    }
    return d.suivi;
  }
  function recupOublieSuivi(id) {
    var d = recupCoffre(false);
    if (!d || !d.suivi) return;
    delete d.suivi[id];
    nettoieRecupCoffre();
  }
  function nettoieRecupCoffre() {
    var d = recupCoffre(false);
    if (!d || !state.modData || !state.modData.recuperation) return;
    if (d.suivi && !Object.keys(d.suivi).length) delete d.suivi;
    if (d.niveaux && !Object.keys(d.niveaux).length) delete d.niveaux;
    if (d.restes && !Object.keys(d.restes).length) delete d.restes;
    if (Array.isArray(d.ajouts) && !d.ajouts.length) delete d.ajouts;
    if (!Object.keys(d).length) delete state.modData.recuperation;
  }

  // Le module Récupération remplace ces quatre crochets pour y joindre ses
  // récupérations ajoutées et leur durée. Sans lui, le moteur sait déjà faire
  // tourner toutes les récupérations natives.
  var recupListeTemps = function () { return recupsListe(); };
  var recupEtatTemps = function (r) { return recupEtat(r); };
  var recupSecondesDisponiblesTemps = function (r, e, secondes) { return e && e.actif ? secondes : 0; };
  var recupApresPasTemps = function () {};
  var recupFinTemps = function () {};

  function recupFacteurTemps(r) {
    return r && (r.reserve === "ps" || r.reserve === "ph") ? facteurDepense(r.reserve) : 1;
  }
  function recupSignatureTemps(r, e) {
    var c = e && e.cadence, sec = recupCadenceSecondes(c), f = recupFacteurTemps(r);
    if (!c || !sec) return "";
    return [Math.round(num(e.niveau, 0)), c.signe, num(c.points, 0), sec, f].join("|");
  }
  function recupDeltaTickTemps(r, e) {
    var c = e && e.cadence;
    if (!c) return 0;
    return c.signe * num(c.points, 0) * recupFacteurTemps(r);
  }
  function recupPeutCumulerTemps(r, e) {
    var d = recupDeltaTickTemps(r, e), cur = courant(r.reserve), m = maxDe(r.reserve);
    if (d > 0 && cur >= m) return false;
    if (d < 0 && cur <= 0) return false;
    return !!d;
  }
  function recupSynchroniseSuivi() {
    var suivi = recupSuivi(false), liste = recupListeTemps(), parId = {};
    liste.forEach(function (r) { if (r && r.id) parId[r.id] = r; });
    Object.keys(suivi).forEach(function (id) {
      var r = parId[id], e = r ? recupEtatTemps(r) : null;
      if (!r || !e || !e.actif || !recupPeutCumulerTemps(r, e) ||
          suivi[id].signature !== recupSignatureTemps(r, e)) delete suivi[id];
    });
    nettoieRecupCoffre();
  }
  // LA ZONE IDÉALE, en température de l'AIR : sa zone de confort (le corps nu
  // plus ce qu'il porte), moins les degrés que son effort lui ajoute.
  function zoneIdeale() {
    var z = confort(), e = effortDe(state.effort);
    if (!z || !e) return null;
    var d = num(e.degres, 0);
    return { bas: z.bas - d, haut: z.haut - d };
  }
  // L'INTENSITÉ de froid (négative) ou de chaud (positive) du personnage, à
  // la température de l'air et à l'effort qu'il fournit.
  function paliersClimat() {
    var t = tempsDef(), z = confort(), e = effortDe(state.effort);
    if (!t || !z || !e) return 0;
    var ressenti = num(state.temperature, 0) + num(e.degres, 0);
    var div = Math.max(1, num(t.paliers.diviseur, 1));
    var arr = t.paliers.arrondi === "bas" ? Math.floor : Math.ceil;
    // l'intensité ne dépasse pas le maximum des règles
    var im = t.intensite ? num(t.intensite.max, 0) : 0;
    function borne(k) { return im > 0 ? Math.min(k, im) : k; }
    if (ressenti < z.bas) return -borne(arr((z.bas - ressenti) / div));
    if (ressenti > z.haut) return borne(arr((ressenti - z.haut) / div));
    return 0;
  }
  // LE PLAFOND D'EXPOSITION d'une intensité, en points (positif) : jusque-là,
  // et pas plus loin, l'exposition peut aller du côté de l'intensité subie.
  // Sans table dans les règles, aucun plafond : l'exposition va jusqu'au bout.
  function plafondExpo(intensite) {
    var t = tempsDef(), m = expoMax(), k = Math.abs(intensite);
    var pl = t && t.intensite && t.intensite.plafonds;
    if (!pl || !aClef(pl, String(k))) return m;
    return m * num(pl[String(k)], 100) / 100;
  }
  // Le facteur de dépense d'une réserve, selon le niveau de froid ou de chaud
  // que l'exposition a atteint.
  function facteurDepense() { return 1; }
  // Une réserve qui bouge d'un nombre ENTIER de points. Les récupérations
  // arrivent désormais ici seulement lorsqu'une cadence complète est atteinte.
  function bougeReserve(cle, delta) {
    if (!delta) return;
    var cur = courant(cle), m = maxDe(cle);
    var v = Math.floor(cur + delta);
    if (delta > 0) v = Math.max(cur, Math.min(v, m));
    else v = Math.min(cur, Math.max(v, 0));
    state.etat[cle] = v >= m && cur <= m ? null : v;
  }

  // ---- horloge interne ----
  // Stockée en quatre champs normalisés, jamais en compteur géant de secondes.
  // Les secondes ne servent que temporairement aux additions/soustractions.
  function horlogeCourante() {
    if (!state.horloge || typeof state.horloge !== "object" || Array.isArray(state.horloge))
      state.horloge = { jours: 0, heures: 0, minutes: 0, secondes: 0 };
    return state.horloge;
  }
  function horlogeVersSecondes(h) {
    h = h || horlogeCourante();
    return ((((Math.max(0, Math.floor(Number(h.jours) || 0)) * 24) +
              Math.max(0, Math.floor(Number(h.heures) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.minutes) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.secondes) || 0)));
  }
  function poseHorlogeDepuisSecondes(total) {
    total = Math.max(0, Math.floor(Number(total) || 0));
    var h = horlogeCourante();
    h.jours = Math.floor(total / 86400); total %= 86400;
    h.heures = Math.floor(total / 3600); total %= 3600;
    h.minutes = Math.floor(total / 60);
    h.secondes = total % 60;
  }
  function bougeHorloge(secondes) {
    var avant = horlogeVersSecondes(), apres = Math.max(0, avant + Math.trunc(Number(secondes) || 0));
    poseHorlogeDepuisSecondes(apres);
    return apres - avant;
  }

  // Les processus périodiques ont leur PROPRE horloge J/H/M/S. Ce ne sont
  // pas des reliquats de cadence : ils gardent tout le temps actif écoulé,
  // quitte à atteindre des jours entiers. Les ticks se détectent en comparant
  // le nombre de tranches complètes avant/après l'avance.
  function horlogeProcessus(cle, regime) {
    var h = state[cle];
    if (!h || typeof h !== "object" || Array.isArray(h)) {
      h = { jours: 0, heures: 0, minutes: 0, secondes: 0 };
      state[cle] = h;
    }
    if (regime !== undefined && h.regime == null) h.regime = "";
    return h;
  }
  function secondesHorlogeProcessus(cle) {
    var h = horlogeProcessus(cle);
    return ((((Math.max(0, Math.floor(Number(h.jours) || 0)) * 24) +
              Math.max(0, Math.floor(Number(h.heures) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.minutes) || 0))) * 60 +
              Math.max(0, Math.floor(Number(h.secondes) || 0)));
  }
  function poseHorlogeProcessus(cle, total, regime) {
    total = Math.max(0, Math.floor(Number(total) || 0));
    var h = horlogeProcessus(cle, regime);
    h.jours = Math.floor(total / 86400); total %= 86400;
    h.heures = Math.floor(total / 3600); total %= 3600;
    h.minutes = Math.floor(total / 60);
    h.secondes = total % 60;
    if (regime !== undefined) h.regime = String(regime || "");
    return h;
  }
  function resetHorlogeProcessus(cle, regime) {
    poseHorlogeProcessus(cle, 0, regime);
  }
  function avanceHorlogeProcessus(cle, secondes, regime) {
    var avant = secondesHorlogeProcessus(cle);
    var apres = Math.max(0, avant + Math.trunc(Number(secondes) || 0));
    poseHorlogeProcessus(cle, apres, regime);
    return { avant: avant, apres: apres };
  }
  function reinitialiseHorlogeDigestion() { resetHorlogeProcessus("horlogeDigestion"); }

  // ---- moteur discret de récupération ----
  function recupAppliquePas(secondes, sens) {
    var liste = recupListeTemps(), suivi = recupSuivi(true), deltas = {};
    var i, r, e, actif, cadence, sig, u, total, ticks, delta;
    sens = sens < 0 ? -1 : 1;
    for (i = 0; i < liste.length; i++) {
      r = liste[i];
      if (!r || !r.id || !r.reserve) continue;
      e = recupEtatTemps(r);
      actif = recupSecondesDisponiblesTemps(r, e, secondes, sens);
      if (!(actif > 0) || !e || !e.actif || !e.cadence) { delete suivi[r.id]; continue; }

      // La durée d'un effet temporaire s'écoule tant qu'il est actif, même si
      // la réserve est déjà pleine/vide. En revanche une réserve à sa borne ne
      // banque jamais une récupération future : son compteur repart de zéro.
      recupApresPasTemps(r, e, actif, sens);
      cadence = recupCadenceSecondes(e.cadence);
      if (!cadence) { delete suivi[r.id]; continue; }
      sig = recupSignatureTemps(r, e);
      u = suivi[r.id];
      if (!u || typeof u !== "object" || u.signature !== sig) u = { secondes: 0, signature: sig };

      if (sens > 0 && !recupPeutCumulerTemps(r, e)) { delete suivi[r.id]; continue; }
      total = Math.max(0, num(u.secondes, 0));
      ticks = 0;
      if (sens > 0) {
        total += actif;
        ticks = Math.floor(total / cadence);
        total -= ticks * cadence;
      } else {
        total -= actif;
        while (total < 0) { total += cadence; ticks++; }
      }
      u.secondes = total; u.signature = sig; suivi[r.id] = u;
      if (ticks) {
        delta = recupDeltaTickTemps(r, e) * ticks * sens;
        deltas[r.reserve] = num(deltas[r.reserve], 0) + delta;
      }
    }
    Object.keys(deltas).forEach(function (cle) { bougeReserve(cle, deltas[cle]); });
    nettoieRecupCoffre();
  }

  // ---- exposition et digestion, par tranches complètes ----
  // Elles suivent la même philosophie que les récupérations : une cadence ne
  // produit RIEN avant d'être entièrement écoulée. Chacune possède cependant
  // une vraie horloge J/H/M/S cumulative, indépendante de l'horloge du monde.

  function digestionCadenceSecondes() {
    var t = tempsDef(), dg = t && t.digestion;
    if (!dg || !(num(dg.minutes, 0) > 0)) return 0;
    return Math.max(1, Math.round(num(dg.minutes, 0) * 60));
  }
  function appliqueDigestionSecondes(secondes, sens) {
    var t = tempsDef(), dg = t && t.digestion, cadence = digestionCadenceSecondes();
    if (!dg || !cadence || !(secondes > 0)) return;
    sens = sens < 0 ? -1 : 1;

    if (sens > 0) {
      // Ventre vide = aucun processus en cours, donc aucune horloge cachée qui
      // pourrait offrir un tick immédiat au prochain aliment avalé.
      if (!(snum(state.etat.contenance) > 0)) { reinitialiseHorlogeDigestion(); return; }
      var a = avanceHorlogeProcessus("horlogeDigestion", secondes);
      var ticks = Math.floor(a.apres / cadence) - Math.floor(a.avant / cadence);
      if (ticks > 0) {
        var retire = ticks * Math.max(0, num(dg.volume, 0));
        state.etat.contenance = Math.max(0, Math.round((snum(state.etat.contenance) - retire) * 1000) / 1000);
        if (!(state.etat.contenance > 0)) reinitialiseHorlogeDigestion();
      }
      return;
    }

    // Le journal restaure exactement une avance faite dans la session. Ce
    // chemin n'est qu'un repli quand on remonte plus loin : on recule l'horloge
    // encore active et restitue un volume à chaque frontière de cadence.
    var avant = secondesHorlogeProcessus("horlogeDigestion");
    var apres = Math.max(0, avant - secondes);
    var rticks = Math.floor(avant / cadence) - Math.floor(apres / cadence);
    poseHorlogeProcessus("horlogeDigestion", apres);
    if (rticks > 0)
      state.etat.contenance = Math.min(contenance(), Math.round((snum(state.etat.contenance) + rticks * Math.max(0, num(dg.volume, 0))) * 1000) / 1000);
  }

  // Le régime porte la continuité du PROCESSUS de résorption, indépendamment
  // de l'intensité : changer de climat favorable ne perd aucune seconde.
  function resorptionApplicable(x, p) {
    return !!x && (!p || x * p < 0 || Math.abs(x) > plafondExpo(p));
  }
  function regimeExposition() {
    var p = paliersClimat(), x = snum(state.etat.expo);
    if (resorptionApplicable(x,p)) return x > 0 ? "resorption:chaud" : "resorption:froid";
    return p ? "intensite:" + p : "";
  }
  function actualiseRegimeExposition() {
    var regime=regimeExposition(),h=horlogeProcessus("horlogeExposition","");
    if(h.regime!==regime || !regime)resetHorlogeProcessus("horlogeExposition",regime);
    return regime;
  }
  function niveauResorptionExposition() {
    var t=tempsDef(), r=t&&t.resorption;
    if(!r)return 0;
    var cadence=Math.max(1,num(t.tranche,10)*60), tranches=Math.max(1,Math.floor(secondesHorlogeProcessus("horlogeExposition")/cadence));
    return Math.min(num(r.max,0),num(r.depart,0)+(tranches-1)*num(r.increment,0));
  }
  function appliqueTickExposition() {
    var t=tempsDef(),p=paliersClimat(),m=expoMax(),x=snum(state.etat.expo);
    if(!t||!(m>0))return;
    var resorption=resorptionApplicable(x,p)?niveauResorptionExposition():0;
    if(p && x*p>0 && Math.abs(x)>plafondExpo(p)) {
      // Le bilan ne peut ni aggraver le dépassement ni traverser son plafond.
      var baisse=Math.max(0,resorption-Math.abs(p));
      x=(x<0?-1:1)*Math.max(plafondExpo(p),Math.abs(x)-baisse);
    } else {
      if(resorption)x=(x<0?-1:1)*Math.max(0,Math.abs(x)-resorption);
      if(p){var cap=plafondExpo(p);x=p>0?Math.min(cap,x+p):Math.max(-cap,x+p);}
    }
    state.etat.expo=Math.round(clamp(x,-m,m)*1000000)/1000000;
  }
  function appliqueExpositionSecondes(secondes, sens) {
    var t=tempsDef();if(!t||!(secondes>0))return;
    var cadence=Math.max(1,Math.round(Math.max(1,num(t.tranche,10))*60));
    if(sens<0){
      // Le journal temporel restaure exactement les retours usuels. Hors journal,
      // seul le temps connu peut être reculé, pas la météo passée.
      poseHorlogeProcessus("horlogeExposition",Math.max(0,secondesHorlogeProcessus("horlogeExposition")-secondes),String(horlogeProcessus("horlogeExposition","").regime||""));return;
    }
    var reste=Math.floor(secondes);
    while(reste>0){
      var regime=regimeExposition(),h=horlogeProcessus("horlogeExposition","");
      if(!regime){resetHorlogeProcessus("horlogeExposition","");return;}
      if(h.regime!==regime)resetHorlogeProcessus("horlogeExposition",regime);
      var avant=secondesHorlogeProcessus("horlogeExposition"),pas=Math.min(reste,cadence-avant%cadence);
      avanceHorlogeProcessus("horlogeExposition",pas,regime);reste-=pas;
      if((avant+pas)%cadence===0){
        appliqueTickExposition();
        var apres=regimeExposition();if(apres!==regime)resetHorlogeProcessus("horlogeExposition",apres);
      }
    }
  }

  function appliqueClimatSecondes(secondes, sens) {
    appliqueExpositionSecondes(secondes, sens);
    appliqueDigestionSecondes(secondes, sens);
  }

  // LE JOURNAL DU TEMPS : une avance complète est photographiée. Reculer la
  // même durée restaure exactement réserves, exposition, contenance, horloge,
  // durées temporaires et compteurs de récupération.
  var journalTemps = [];
  var TEMPS_CLES = ["pv", "pe", "pm", "pi", "pr", "ps", "ph", "expo", "contenance"];
  function copieTemps(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; }
  }
  function photoTemps() {
    var o = {
      horloge: copieTemps(horlogeCourante()),
      horlogeDigestion: copieTemps(horlogeProcessus("horlogeDigestion")),
      horlogeExposition: copieTemps(horlogeProcessus("horlogeExposition", "")),
      effAlcool: state.effAlcool,
      horlogeAlcool: copieTemps(horlogeProcessus("horlogeAlcool")),
      effetsActifs: copieTemps(state.effetsActifs || []),
      recuperation: copieTemps(recupCoffre(false)) || {}
    };
    TEMPS_CLES.forEach(function (k) { o[k] = state.etat[k]; });
    return o;
  }
  function restaurePhotoTemps(o) {
    if (!o) return;
    TEMPS_CLES.forEach(function (k) { state.etat[k] = o[k]; });
    state.horloge = copieTemps(o.horloge) || { jours: 0, heures: 0, minutes: 0, secondes: 0 };
    state.horlogeDigestion = copieTemps(o.horlogeDigestion) || { jours: 0, heures: 0, minutes: 0, secondes: 0 };
    state.horlogeExposition = copieTemps(o.horlogeExposition) || { jours: 0, heures: 0, minutes: 0, secondes: 0, regime: "" };
    state.effetsActifs = copieTemps(o.effetsActifs) || [];
    state.effAlcool = num(o.effAlcool, 0);
    state.horlogeAlcool = copieTemps(o.horlogeAlcool) || {jours:0, heures:0, minutes:0, secondes:0};
    if (!state.modData || typeof state.modData !== "object" || Array.isArray(state.modData)) state.modData = {};
    if (o.recuperation && Object.keys(o.recuperation).length) state.modData.recuperation = copieTemps(o.recuperation);
    else delete state.modData.recuperation;
    effVu = null;
  }
  function memePhotoTemps(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  // La plus petite unité du monde est le round : 3 secondes. Toutes les
  // cadences natives et toutes les durées proposées au module Récupération en
  // sont des multiples, ce qui rend le calcul exact sans fractions de temps.
  var PAS_TEMPS_SECONDES = 3;
  function alcoolCadenceSecondes() { return Math.max(1, num((effDef().specifiques || {}).alcoolSecondes, 7200)); }
  function actualiseHorlogeAlcool() {
    if (!(state.effAlcool > 0)) resetHorlogeProcessus("horlogeAlcool");
  }
  function avanceAlcoolSecondes(secondes) {
    actualiseHorlogeAlcool();
    if (!(state.effAlcool > 0) || !(secondes > 0)) return;
    var cadence = alcoolCadenceSecondes(), a = avanceHorlogeProcessus("horlogeAlcool", secondes);
    var ticks = Math.floor(a.apres / cadence) - Math.floor(a.avant / cadence);
    state.effAlcool = Math.max(0, state.effAlcool - ticks);
    actualiseHorlogeAlcool();
  }
  function avancerSecondesCalcul(secondes) {
    var t = tempsDef(), e = effortDe(state.effort), restant, pas;
    if (!t || !e) return 0;
    secondes = Math.max(0, Math.floor(Number(secondes) || 0));
    restant = secondes;
    while (restant > 0) {
      pas = Math.min(PAS_TEMPS_SECONDES, restant);
      recupAppliquePas(pas, 1);
      effetsAvance(pas);
      suitEffondrement();
      appliqueClimatSecondes(pas, 1);
      avanceAlcoolSecondes(pas);
      bougeHorloge(pas);
      restant -= pas;
    }
    recupFinTemps(1);
    return secondes;
  }
  function reculerSecondesCalcul(secondes) {
    var t = tempsDef(), e = effortDe(state.effort), restant, pas, fait = 0;
    if (!t || !e) return 0;
    secondes = Math.max(0, Math.floor(Number(secondes) || 0));
    restant = Math.min(secondes, horlogeVersSecondes());
    while (restant > 0) {
      pas = Math.min(PAS_TEMPS_SECONDES, restant);
      recupAppliquePas(pas, -1);
      appliqueClimatSecondes(pas, -1);
      bougeHorloge(-pas);
      restant -= pas; fait += pas;
    }
    recupFinTemps(-1);
    return -fait;
  }
  function avancerSecondes(secondes) {
    secondes = Math.trunc(Number(secondes) || 0);
    if (secondes < 0) return reculerSecondes(-secondes);
    if (!secondes) return 0;
    var avant = photoTemps(), fait = avancerSecondesCalcul(secondes);
    if (fait) {
      journalTemps.push({ secondes: fait, avant: avant, apres: photoTemps() });
      if (journalTemps.length > 50) journalTemps.shift();
    }
    return fait;
  }
  function reculerSecondes(secondes) {
    secondes = Math.max(0, Math.floor(Number(secondes) || 0));
    var restant = secondes, fait = 0, top;
    while (restant > 0 && journalTemps.length) {
      top = journalTemps[journalTemps.length - 1];
      if (top.secondes > restant || !memePhotoTemps(photoTemps(), top.apres)) break;
      restaurePhotoTemps(top.avant);
      journalTemps.pop();
      restant -= top.secondes; fait += top.secondes;
    }
    if (restant > 0) {
      journalTemps = [];
      var r = reculerSecondesCalcul(restant);
      fait += -r;
    }
    return -fait;
  }
  // Compatibilité interne avec d'anciens mods : une « tranche » reste la
  // tranche de règles, mais le vrai moteur est désormais en secondes.
  function avancerTemps(n) {
    var t = tempsDef(), tr = t ? Math.max(1, num(t.tranche, 10)) : 10;
    return avancerSecondes(num(n, 0) * tr * 60) / 60;
  }
  function reculerTemps(n) {
    var t = tempsDef(), tr = t ? Math.max(1, num(t.tranche, 10)) : 10;
    return reculerSecondes(num(n, 0) * tr * 60) / 60;
  }
  function confort() {
    var c = climatDef();
    if (c.nuBas === undefined || c.nuHaut === undefined) return null;
    return { bas: snum(c.nuBas) - protection("froid"), haut: snum(c.nuHaut) + protection("chaud") };
  }

  // La « carte » : le résumé CALCULÉ de la fiche, pour la bibliothèque, le
  // popup de l'extension et les attributs miroir Roll20 (barres de jetons,
  // macros). Elle ne se relit jamais : elle se recalcule.
  function computeCard() {
    var caracs = {};
    caracsOrdre().forEach(function (c) { caracs[c] = caracTotal(c); });
    return {
      name: state.name || "Sans nom",
      caracs: caracs,
      capacites: {
        pv: state.etat.pv, pvMax: pvMax(),
        pe: state.etat.pe, peMax: peMax(),
        pm: state.etat.pm, pmMax: pmMax(),
        pi: state.etat.pi, piMax: piMax(),
        pr: state.etat.pr, prMax: prMax(),
        ps: state.etat.ps, psMax: psMax(),
        ph: state.etat.ph, phMax: phMax(),
        pc: state.etat.pc, pcMax: pcMax(),
        expo: state.etat.expo, expoMax: expoMax(),
        charge: charge(), chargePorte: poidsPorte(),
        acces: accesRapides(), accesPris: accesPris(),
        contenance: contenance(), contenancePrise: contenancePrise(),
        rupture: state.etat.rupture === null ? ruptureRestante() : state.etat.rupture,
        ruptureMax: ruptureMax(),
        effondrement: effondrement(),
        desAction: desAction(),
        xpDepense: xpDepense()
      }
    };
  }

  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2,6 s vu une seule
  // fois : la fiche continuerait de s'afficher, parfaitement normale, pendant
  // qu'une session entière de travail se perd à la fermeture. Tant que ça ne
  // repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    window.OwdInventoryData.normalizeSlots(state.inv.objets);
    rangeEmplacements(state.inv.objets);
    window.OwdInventoryData.bind(state.inv.objets);
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state fait
    // jeter stringify : setItem n'est alors jamais atteint, donc sous Roll20 le
    // cache mémoire du pont n'est même pas à jour, donc aucune écriture
    // programmée, ni accusé de réception, ni chien de garde, ni bandeau de
    // perte. Rien ne s'enregistrerait plus et rien ne le dirait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("owd-perso", json); }
      catch (e2) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("owd-cards")) || {}; } catch (e3) { cards = {}; }
    var card;
    try { card = computeCard(); } catch (e4) { card = null; }
    if (card) {
      card.id = "_current";
      cards._current = card;
      try { STORE.setItem("owd-cards", JSON.stringify(cards)); } catch (e5) {}
      enregistrementModules(card,json);
    }
  }

  var enregistrementEtat=null;
  function enregistrementModules(card,json) {
    if(!window.__owdSavingModules||json===null||enregistrementEtat===json)return;
    enregistrementEtat=json;
    var out={},caps=card.capacites,caracs=card.caracs;
    function set(id,parts){out[id]=JSON.stringify(parts);}
    var own={caracs:['caracs','caracsXp','xpTotal'],effort:['effort','qualiteSommeil','horloge'],exposition:['temperature','horlogeExposition'],mouvement:['allure','allureCran'],effondrement:['effParties','effAutre','effAlcool','effAlcoolSecondes','horlogeAlcool','effDesactive','effPause'],desaction:['desTailles','desUtilises'],attaque:['attaques'],defense:['defenses'],comps:['comps','compsGroupes'],effets:['effetsActifs','effetsPermanents'],techniques:['techniques'],avantages:['avantages'],notes:['notes'],jets:['de'],modcaracs:['caracsLeviers'],optcaps:['capsLeviers'],optcomps:['compsLeviers'],modules:['modules','modActifs'],mods:['mods'],bg:['background'],inv:['inv']};
    Object.keys(own).forEach(function(id){set(id,own[id].map(function(k){return state[k];}));});
    Object.keys(state.modData||{}).forEach(function(id){set(id,[out[id],state.modData[id]]);});
    function add(id,value){set(id,[out[id],value]);}
    add('caracs',[caracs,caps.xpDepense]);
    ['pv','pe','pm','pi','pc','contenance','rupture'].forEach(function(k){add(k,[caps[k],caps[k+'Max'],['pv','pe','pm'].indexOf(k)>=0?effetConsommation(k):null]);});
    add('survie',['pr','ps','ph'].map(function(k){return [caps[k],caps[k+'Max']];}));
    add('exposition',[caps.expo,caps.expoMax,confort()]);
    add('pc',[caps.charge,caps.chargePorte,caps.acces,caps.accesPris]);
    add('contenance',caps.contenancePrise);
    var causes=['pr','ps','ph','pi','charge','contenance','chaud','froid','alcool','autre'].map(function(k){return [k,effPartie(k)];});
    add('effondrement',[caps.effondrement,causes,effSpecifiques()]);
    add('mouvement',[effetBonus('pas'),effetBonus('vitesse'),effSpecifiques().pas]);
    add('recuperation',recupListeModule().map(function(x){return [x,recupEtatVueModule(x)];}));
    add('desaction',caps.desAction);
    add('comps',(state.comps||[]).map(function(c){return [compBonus(c),compDes(c),compXp(c)];}));
    var weapons=(state.inv.objets||[]).filter(function(o){return o.arme;}),combat=[state.combatOptions,state.combatModifiers,state.combatAffichage];
    add('attaque',[weapons,combat,caracs,(state.inv.objets||[]).filter(function(o){return o.munition;}),combatTypes().map(function(t){return effetBonus('degats',t);}),effetBonus('attaque'),effetBonus('paradeAdverse'),effetsSources().filter(function(x){return !!x.d.ops.impregnation;})]);
    add('defense',[weapons,combat,effetBonus('parade'),weapons.map(function(o){return (o.arme.modsParade||[]).map(function(k){return caracs[k];});}),combatTypes().map(function(t){return defenseTotaux(t,null,false);})]);
    add('effets',effetsSources());
    if(window.__owdJournal)add('journal',window.__owdJournal().ops.map(function(o){return o.id;}));
    // A mod may declare the exact values its own module calculates.
    modules.forEach(function(m){if(typeof m.enregistrement==='function'){try{add(m.id,m.enregistrement());}catch(e){}}});
    window.__owdSavingModules(out);
  }

  function montrePanneSave(msg) {
    if(window.__owdSaveFailure){window.__owdSaveFailure(msg);return;}
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
      // SA PROPRE CLASSE, en plus de la commune : .pc-avis est réservée au
      // bandeau de consentement des mods, les deux peuvent coexister, et sans
      // marque distincte ni le code ni une sonde ne sait lequel il tient.
      elSavePanne = el("div", "pc-avis pc-avis-save");
      elSavePanne.appendChild(el("div", "pc-avis-txt", ""));
    }
    var txt = elSavePanne.firstChild;
    if (txt.textContent !== msg) txt.textContent = msg;
    // save() part à chaque frappe : ne toucher au DOM que si le bandeau n'est
    // pas déjà à sa place, sinon chaque lettre tapée le déplacerait.
    if (elSavePanne.parentNode === appEl) return;
    // la feuille est cherchée parmi les enfants DIRECTS : insertBefore veut un
    // repère qui soit bien un enfant de appEl, et un querySelector qui
    // descendrait dans l'arbre jetterait au lieu de poser le bandeau
    var avant = null, k;
    for (k = 0; k < appEl.children.length; k++)
      if (appEl.children[k].className === "pc-sheet") { avant = appEl.children[k]; break; }
    appEl.insertBefore(elSavePanne, avant);
  }
  function load() {
    try { return normalize(JSON.parse(STORE.getItem("owd-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("owd-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("owd-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "owd-persos";
  function loadPersos() {
    try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function savePersos(a) { try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {} }

  // ---------- envoi au tchat : destinataire, modificateur, dés engagés ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__owdChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les trois réglages vivent dans le VRAI localStorage du navigateur : ce ne
  // sont pas des données de personnage, et les écrire dans les Attributes
  // Roll20 à chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "owd-r20-envoi",         // "public" | "gm" | "joueur"
    dest: "owd-r20-envoi-dest",    // nom d'affichage du destinataire
    input: "owd-r20-envoi-input",  // "0" sans | "1" avec
    des: "owd-r20-envoi-des",      // "0" au maximum | "1" au choix
    noms: "owd-r20-envoi-noms"     // liste de secours, si Roll20 ne la donne pas
  };
  // LES DEUX SEULS APPELS BRUTS AU localStorage DE TOUT LE BUNDLE, et c'est
  // délibéré : partout ailleurs on passe par STORE, donc par le shim de
  // l'amorce, qui n'est qu'un cache en MÉMOIRE et meurt avec la page. Y ranger
  // ces réglages les ferait oublier à chaque ouverture de la fiche. Ici on vise
  // au contraire la persistance, sur le site comme dans Roll20 quand le
  // navigateur autorise le stockage tiers. La contrepartie est assumée : dans
  // une iframe d'une autre origine, Chrome peut refuser l'accès — les deux
  // appels sont donc sous try/catch, l'échec est SILENCIEUX, et les réglages
  // d'envoi repartent alors de leur valeur par défaut à chaque ouverture. Rien
  // de ce qui est ici n'appartient au personnage : le perdre ne perd rien.
  function lpref(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : v; } catch (e) { return def; }
  }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function envMode() {
    var m = lpref(ENVOI.mode, "public");
    return m === "gm" || m === "joueur" ? m : "public";
  }
  function envDest() { return lpref(ENVOI.dest, ""); }
  function envInput() { return lpref(ENVOI.input, "0") === "1"; }
  function envDesChoix() { return lpref(ENVOI.des, "0") === "1"; }
  // TITRES et libellés : les accolades casseraient la carte, les blancs se
  // replient. Même assainissement que celui que l'extension ne fait pas.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // VALEURS de champ : les accolades d'une macro Roll20 (@{Perso|owd_force},
  // ?{…}) sont LÉGITIMES et doivent survivre. Un champ de gabarit se ferme sur
  // « }} » : c'est la SEULE séquence à briser, et une valeur qui finit par une
  // accolade prend une espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = String(s == null ? "" : s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le préfixe de chuchotement OUVRE la commande : Roll20 exige que le message
  // COMMENCE par « / », un seul blanc devant et tout part en clair, en public.
  // Un nom qui contient une espace doit être entre guillemets droits.
  function envPrefixe() {
    var m = envMode();
    if (m === "gm") return "/w gm ";
    if (m === "joueur") {
      var d = envSan(envDest()).replace(/"/g, "");
      if (d) return "/w \"" + d + "\" ";
      // « à un joueur » sans destinataire : public plutôt qu'une commande cassée
    }
    return "";
  }
  // Requête Roll20, résolue à l'envoi. Les parenthèses laissent saisir un
  // modificateur négatif sans ambiguïté (« + (-3) »).
  var ENV_QUERY = " + (?{Modificateur|0})";
  // Combien de dés d'action le joueur engage. Le rang donne un PLAFOND (1, 2 ou
  // 3 dés) ; engager moins est un choix de jeu, pas une entorse. La requête se
  // pose EN FACTEUR du dé : « ?{Dés engagés|2}d8 ».
  function desQuery(n) { return "?{Dés engagés|" + Math.max(0, num(n, 0)) + "}"; }
  // Option de jet Roll20 : le résultat s'inscrit au compteur de tours. Elle se
  // pose DANS le jet en ligne, ENTRE les doubles crochets, jamais après « }} » :
  // hors d'un « /roll », Roll20 ne la lit qu'attachée au jet lui-même. AUCUN
  // bouton natif ne l'emploie — les règles publiées ne donnent pas d'ordre du
  // tour — mais le paramètre reste dans la signature pour qu'un mod puisse le
  // demander le jour où il arrivera.
  var ENV_TRACKER = " &{tracker}";
  function cmdJet(label, value, die, avecInput, desMax, tracker) {
    // « + 0 » est du bruit : une valeur nulle ne s'écrit pas.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Le dé voit ses blancs REPLIÉS : une commande multiligne est refusée par
    // l'extension, et le clic partirait alors sans rien envoyer. Ses accolades,
    // elles, restent : « ?{Dés engagés|2}d8 » est un dé légitime.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || (state.de || DE_DEFAUT);
    // « Dés au choix » : le nombre de dés devient une requête, le nombre du
    // rang restant proposé par défaut. On ne remplace que le FACTEUR, jamais
    // les faces — le d8 est la seule constante du jeu.
    if (desMax && envDesChoix()) de = de.replace(/^\s*\d+(?=d\d)/i, desQuery(desMax));
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de + v +
           (avecInput ? ENV_QUERY : "") +
           (tracker ? ENV_TRACKER : "") + "]]}}";
  }
  function cmdCarte(title, fields) {
    var cmd = "&{template:default} {{name=" + envSan(title) + "}}";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = envSan(f[0]), v = envVal(f[1]);
      if (v) cmd += " {{" + k + "=" + v + "}}";
    });
    return cmd;
  }
  // envoi effectif : préfixe + commande. Rend false hors Roll20, ce qui
  // déclenche les replis.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__owdChat !== "function") return false;
    window.__owdChat(envPrefixe() + cmd);
    return true;
  }

  // ---------- jets ----------
  // Trois voies, dans cet ordre : le canal brut (la commande composée ici), le
  // repli historique __owdRoll (l'extension recompose alors elle-même : jet
  // public, sans modificateur), et hors Roll20 le tirage local.
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  // isCheck : vrai EXACTEMENT pour les jets qui acceptent un modificateur au
  // lancer — compétence, attaque, parade, technique. Aucun autre filtre à
  // écrire. Les DÉGÂTS n'en sont pas : ils ne se lancent pas du tout.
  function doRoll(label, value, die, isCheck, desMax, tracker) {
    if(isCheck && effetBonus("sensAdverse") && pli(label).indexOf("discretion")>=0)sayChat("Discrétion",[["Jets de Sens adverses",sign(effetBonus("sensAdverse"))+" difficulté"]]);
    die = die || state.de || DE_DEFAUT;
    if (envoyer(cmdJet(label, value, die, isCheck && envInput(), desMax, tracker))) return;
    if (typeof window !== "undefined" && typeof window.__owdRoll === "function") {
      window.__owdRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20, qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. " + deDe(2) + ").");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var somme = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = somme + value;
    flash(label + " : " + total + " (dé " + dice.join(" + ") +
          (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "") + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // fields : [[libellé, valeur], …], les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé, réservée
  // aux TEXTES LONGS (description d'une technique, d'un objet). UNE SEULE par
  // carte : le gabarit les indexe par clé.
  function sayChat(title, fields, combat) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] == null ? "" : f[1]).trim(); });
    if (combat) {
      combat.v = 1; combat.title = String(title); combat.character = String(state.name || "");
      var payload = b64encode(JSON.stringify(combat)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      var action = combat.kind === "attack" ? "owd_defend" : "owd_defense";
      var carte = [[combat.kind === "attack" ? "Attaque" : "Défense", title], ["Personnage", state.name || "Sans nom"]].concat(clean);
      carte.push(["OWD", "[" + (combat.kind === "attack" ? "Se défendre" : "Carte") + "](/" + action + " " + payload + ")"]);
      if (envoyer(cmdCarte(combat.kind === "attack" ? "OWD Attack" : "OWD Defense", carte))) return;
    } else if (envoyer(cmdCarte(title, clean))) return;
    if (typeof window !== "undefined" && typeof window.__owdSay === "function") {
      window.__owdSay(title, clean);
      return;
    }
    flash(title + (clean.length
      ? " — " + clean.map(function (f) { return f[0] ? f[0] + " : " + f[1] : f[1]; }).join(" · ")
      : ""));
  }
  function chatBtn(getTitle, getFields) {
    return miniBtn("Chat", "Envoyer dans le tchat Roll20", function () {
      sayChat(getTitle(), getFields());
    });
  }

  // ---------- refresh ----------
  // Registres de rafraîchissement : les fonctions rappelées à chaque
  // changement d'état. Il y en a UN PAR MODULE, plus un pour ce qui n'est pas
  // un module (barre d'outils, en-tête, barre d'envoi). Tous sont remis à zéro
  // à chaque mount() : les anciens pointent sur un DOM qui n'existe plus.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction. Les briques (textInput, stepper, bigTile,
  // gearBtn…) écrivent donc dans « hooks » sans rien savoir des modules, et
  // chaque fonction atterrit chez son propriétaire. C'est ce qui permet de
  // museler un module sans toucher aux autres.
  var regHors = [];
  var regsModules = {};
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  var recupHooks = [];          // lignes de récupération, vidées par rebuildRecuperation()
  var optHooks = [];            // bloc Options rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps »
  // filtres de VUE du bloc Options, propres à lui : les siens ne doivent pas
  // suivre ceux de l'onglet Fiche, on n'y cherche pas la même chose
  var optFilter = "";
  var optOnly = COMPACT;

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule réussite
  // remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et le
  // compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce qu'un
  // même id peut avoir DEUX registres (« comps » et « optcomps » ont aussi
  // celui de leurs lignes rebâties) : en jugeant registre par registre, la
  // réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là ne serait jamais tombée.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  // LES PV ET LES PE SUIVENT L'EFFONDREMENT, dans un seul sens. Quand le
  // niveau monte, le maximum descend et la valeur courante qui le dépasse
  // descend avec lui (100/100 devient 95/95, 50/100 devient 50/95). Quand il
  // redescend, le maximum remonte mais PAS la valeur : les points perdus ne
  // reviennent pas. Une valeur « au maximum » (null) suivrait le maximum en
  // remontant ; elle se fige donc à l'ancien maximum à ce moment-là.
  // Seul un changement de NIVEAU joue ici : un maximum baissé par un levier du
  // MJ ne réécrit rien, comme partout ailleurs dans la fiche.
  // La mémoire du dernier état vu ne vit qu'en mémoire : la première passe
  // après un chargement ne fait que la poser.
  var effVu = null, effMaxVu = {};
  function suitEffondrement() {
    var e = effondrement();
    ["pv", "pe"].forEach(function (k) {
      var m = maxDe(k), v = state.etat[k], avant = effMaxVu[k];
      if (effVu !== null && avant !== undefined) {
        if (e > effVu && v !== null && v > m) state.etat[k] = m;
        if (e < effVu && v === null && m > avant) state.etat[k] = avant;
      }
      effMaxVu[k] = m;
    });
    effVu = e;
  }
  var refreshEmpreintes=null;
  var VUE_DEPENDANCES={notes:['notes'],bg:['background'],avantages:['avantages'],techniques:['techniques'],journal:[],modules:['modules','modActifs'],mods:['mods']};
  function refresh(force) {
    actualiseHorlogeAlcool();
    actualiseRegimeExposition();
    suitEffondrement();
    save();
    var stamps={},changes=[],invalidStamp=false;
    try{
    Object.keys(state).forEach(function(k){if(k==='etat'){Object.keys(state.etat).forEach(function(r){stamps['etat.'+r]=JSON.stringify(state.etat[r]);});}else stamps[k]=JSON.stringify(state[k]);});
    }catch(e){invalidStamp=true;}
    Object.keys(stamps).forEach(function(k){if(!refreshEmpreintes||stamps[k]!==refreshEmpreintes[k])changes.push(k);});
    var all=invalidStamp||force===true||!refreshEmpreintes||!changes.length||modulesPersoActifs();refreshEmpreintes=invalidStamp?null:stamps;
    function doit(id){
      // Le panneau Notes peut être masqué par le conteneur Roll20 sans signal.
      // Sa fenêtre limitée de messages reste cohérente sans reconstruire le module.
      if(id==='notes'&&changes.indexOf('notes')>=0)return true;
      if(window.__owdViewVisible===false&&!modulesPersoActifs())return false;
      var node=elModules[id];if(node&&!node.getClientRects().length&&!modulesPersoActifs())return false;
      if(all)return true;
      if(changes.every(function(k){return /^etat\.(pv|pe|pm)$/.test(k);}))return changes.some(function(k){return k==='etat.'+id;})||id==='optcaps';
      if(VUE_DEPENDANCES[id])return changes.some(function(k){return VUE_DEPENDANCES[id].indexOf(k)>=0;});
      if(changes.every(function(k){return ['notes','background','portrait','name','age','sexe','genre'].indexOf(k)>=0;}))return false;
      return true;
    }
    var bilan = {};
    joue("", regHors, bilan);
    // les clés d'un objet se parcourent dans leur ordre de création : c'est
    // l'ordre de montage des modules, donc l'affichage ne bouge pas
    Object.keys(regsModules).forEach(function (id) {if(doit(id))joue(id,regsModules[id],bilan);});
    if(doit("comps"))joue("comps",compHooks,bilan);
    if(doit("recuperation"))joue("recuperation",recupHooks,bilan);
    if(doit("optcomps"))joue("optcomps",optHooks,bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      // « » n'est pas un module mais ce qui encadre les onglets : le museler
      // éteindrait la fiche elle-même, sans bloc à marquer ni interrupteur pour
      // le rallumer. Ses hooks restent sous try/catch, c'est là qu'est la
      // protection.
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
    // Après les hooks : Bio et Notes viennent notamment de recevoir leur
    // valeur distante. La lecture doit montrer cette même valeur dès la passe.
    majTextesLecture(rootEl);
    if(window.__owdApplyMode)window.__owdApplyMode();
  }
  var remontageNettoyage = [];
  var rootEl = null;
  var appEl = null;      // le .perso-fiche monté : porte les jetons de couleur
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière. C'est aussi ce que rendent ctx.reconstruire et
  // Owd.remonte ; appelé PENDANT un montage, il ne relance rien sur-le-champ
  // (mount() note la demande et l'honore une fois le montage fini).
  function remount() { if (rootEl) mount(rootEl); }

  function flash(msg) {
    var f = document.querySelector(".pc-flash") || el("div", "pc-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

  // ---------- briques ----------
  function fld(labelTxt, input, span) {
    var w = el("div", "pc-f" + (span ? " " + span : ""));
    w.appendChild(el("label", null, labelTxt));
    w.appendChild(input);
    return w;
  }
  // reg : registre de rafraîchissement (le courant par défaut ; un module qui
  // fabrique un champ APRÈS son montage passe le sien, sinon sa fonction
  // atterrirait chez le voisin et échapperait à sa muselière).
  function textInput(get, set, placeholder, reg) {
    var i = el("input");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
    // le champ ne se réécrit JAMAIS pendant la frappe : c'est le motif de tous
    // les champs du fichier
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get() || ""; });
    return i;
  }
  function miniBtn(txt, title, fn, cls) {
    var b = el("button", "pc-mini" + (cls ? " " + cls : ""), txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  function stepBtn(txt, title, fn) {
    var b = el("button", null, txt);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", fn);
    return b;
  }
  // stepper −/champ/+ : le champ du milieu reste saisissable au point près, ce
  // qui compte sur les grands nombres d'Outward (1600 points de satiété ne se
  // remontent pas de 10 en 10 à la main).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step + (title === true ? "" : " (" + title + ")") : null,
      function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num");
    champNombreSigne(i);
    i.step = String(step);
    i.value = get();
    i.addEventListener("input", function () {
      var v = litNombreSigne(i.value);
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step + (title === true ? "" : " (" + title + ")") : null,
      function () { set(get() + step); refresh(); }));
    return w;
  }
  // trois petits champs ± (équipement / technique / décision du MJ), sommés
  // dans la valeur effective ; discrets, révélés au survol de l'hôte
  // (.pc-mods-host).
  // ---------- les cases d'un bloc de nombres ----------
  // TROIS FORMES, UNE SEULE BOÎTE. Les trois listes de la fiche s'en servent :
  // sans cela leurs lignes n'auraient pas la même hauteur, et la ligne changerait
  // d'épaisseur en ouvrant le rouage.
  //
  // caseTexte   un nombre, rien d'autre
  // caseDouble  deux nombres, un par mode — la feuille n'en montre qu'un
  // caseSaisie  un TEXTE en jouant, un CHAMP sous le rouage. Les deux, et pas
  //             seulement le champ : un champ de type nombre ne sait pas écrire
  //             « +25 » et porte des compteurs que Roll20 n'a nulle part.
  function caseVide(hote, cls) {
    var c = el("span", "c" + (cls ? " " + cls : ""));
    hote.appendChild(c);
    return c;
  }
  function caseTexte(hote, cls) {
    var c = caseVide(hote, cls);
    var v = el("span", "v", "");
    c.appendChild(v);
    return v;
  }
  function caseDouble(hote, cls) {
    var c = caseVide(hote, cls);
    var a = el("span", "v pc-jeu-only", "");
    var b = el("span", "v pc-edit-only", "");
    c.appendChild(a); c.appendChild(b);
    return [a, b];
  }
  // Le champ ne se réécrit JAMAIS sous les doigts : tant qu'il a le focus, ce
  // qu'on tape y reste tel quel.
  function caseSaisie(hote, lire, ecrire, aide, reg) {
    var c = caseVide(hote, "reglable");
    var t = el("span", "v pc-jeu-only", "");
    var i = el("input", "v pc-edit-only pc-case-champ pc-edit-field");
    champNombreSigne(i); i.step = "1";
    i.title = aide;
    i.addEventListener("input", function () {
      var v = Math.trunc(litNombreSigne(i.value));
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== i) i.value = lire();
    });
    c.appendChild(t);
    c.appendChild(i);
    return { txt: t, champ: i };
  }
  // ---------- écrire dans une boîte de la chaîne ----------
  // Le pendant des trois lecteurs (lireCarac, lireCap, lireComp) : ces deux-là
  // ÉCRIVENT, et ils ne créent rien tant qu'on ne leur donne rien. Le chemin se
  // DÉFAIT quand sa dernière valeur s'en va — sans quoi ouvrir un rouage
  // écrirait trois sous-tables vides dans un personnage qui voyage dans UN
  // attribut Roll20.
  function ecrireBoite(nomTable, levier, boite, cle, v) {
    if (!state[nomTable] || typeof state[nomTable] !== "object") state[nomTable] = {};
    var lv = state[nomTable];
    if (v === undefined || v === null) {
      if (!lv[levier] || !lv[levier][boite]) return;
      delete lv[levier][boite][cle];
      if (!Object.keys(lv[levier][boite]).length) delete lv[levier][boite];
      if (!Object.keys(lv[levier]).length) delete lv[levier];
      return;
    }
    if (!lv[levier]) lv[levier] = {};
    if (!lv[levier][boite]) lv[levier][boite] = {};
    lv[levier][boite][cle] = v;
  }
  // Le champ « Forcé » d'une valeur : vide = valeur CALCULÉE (le filigrane la
  // montre), une valeur la FORCE. Zéro est une valeur, et c'est le seul moyen
  // d'obtenir zéro à coup sûr.
  function champForceBoite(nomTable, levier, cle, auto, titre, reg) {
    var lire = lireTable(nomTable, levier, cle);
    var inp = el("input", "force");
    champNombreSigne(inp); inp.step = "any";
    inp.title = titre || "Vide = valeur calculée ; une valeur la force.";
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      ecrireBoite(nomTable, levier, "force", cle,
                  isFinite(v) ? clamp(Math.round(v * 100) / 100, -99999, 99999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = fmtP(auto());
      var cur = lire("force");
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  // Les trois emplacements de modificateur, fantômes au repos : ils écrivent
  // dans les trois PREMIERS ajouts de la chaîne. Le quatrième et les quatre
  // facteurs ne se règlent qu'en Options — la fiche ne porte que le geste
  // courant, le tableau de bord complet est ailleurs.
  var MMOD_BOITES = ["a1", "a2", "a3"];
  function multiModBoite(nomTable, levier, cle, reg) {
    var wrap = el("span", "pc-mmods");
    for (var i = 0; i < MMOD_BOITES.length; i++) (function (i) {
      var boite = MMOD_BOITES[i];
      var lire = lireTable(nomTable, levier, cle);
      var inp = el("input", "pc-mmod");
      champNombreSigne(inp); inp.step = "any"; inp.placeholder = "0";
      inp.title = "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
                  (i + 1) + " sur " + MMOD_SLOTS.length + " ; les modificateurs s'additionnent.";
      inp.addEventListener("input", function () {
        var n = litNombreSigne(inp.value);
        ecrireBoite(nomTable, levier, boite, cle,
                    isFinite(n) && n !== 0 ? clamp(Math.round(n * 100) / 100, -9999, 9999) : undefined);
        inp.classList.toggle("neg", n < 0);
        refresh();
      });
      (reg || hooks).push(function () {
        var v = lire(boite);
        if (document.activeElement !== inp) {
          inp.value = v === undefined ? "" : v;
          inp.classList.toggle("neg", v !== undefined && v < 0);
        }
      });
      wrap.appendChild(inp);
    })(i);
    return wrap;
  }

  function multiMod(map, key, reg) {
    var wrap = el("span", "pc-mmods");
    function arr() {
      if (!map[key]) map[key] = [0, 0, 0];
      return map[key];
    }
    for (var i = 0; i < MMOD_SLOTS.length; i++) (function (i) {
      var inp = el("input", "pc-mmod");
      champNombreSigne(inp); inp.step = "any"; inp.placeholder = "0";
      inp.title = "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
                  (i + 1) + " sur " + MMOD_SLOTS.length + " ; les modificateurs s'additionnent.";
      var v0 = map[key] ? map[key][i] : 0;
      inp.value = v0 ? v0 : "";
      inp.classList.toggle("neg", v0 < 0);
      inp.addEventListener("input", function () {
        var n = litNombreSigne(inp.value);
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      (reg || hooks).push(function () {
        if (document.activeElement !== inp) {
          var v = map[key] ? map[key][i] : 0;
          inp.value = v ? v : "";
          inp.classList.toggle("neg", v < 0);
        }
      });
      wrap.appendChild(inp);
    })(i);
    return wrap;
  }

  // ---------- mode édition par module ----------
  // Chaque module éditable porte un rouage dans son titre : il déverrouille la
  // CONSTRUCTION du personnage (rangs, forçages, modificateurs, ajouts,
  // suppressions, textes). Hors édition, seuls les gestes de JEU restent
  // actifs : jets, tchat, jauges courantes, contenance, bourse, quantités
  // d'objets. Réglage d'interface PUR : ni dans l'état du personnage, ni
  // persisté — chaque chargement repart verrouillé.
  var editMods = {};
  function ficheModifiable() { return !window.__owdCanEdit || window.__owdCanEdit(); }
  function isEdit(id) { return ficheModifiable() && !!editMods[id]; }
  // Lecture en texte normal : hauteur naturelle, même dans un onglet masqué
  // ou après un changement de largeur. Le textarea garde sa taille d'édition
  // et son redimensionnement manuel ; on ne mesure ni ne réécrit sa hauteur.
  function majTextesLecture(scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll("textarea.pc-notes.pc-edit-field,textarea.pc-notes.pc-item-edit-field"), function (f) {
      if (!f.parentNode) return;
      var lecture = f._owdLecture;
      if (!lecture || lecture.parentNode !== f.parentNode) {
        lecture = el("div", "pc-prose-read");
        f.parentNode.insertBefore(lecture, f);
        f._owdLecture = lecture;
      }
      // Ne pas remplacer le texte inchangé : cela casserait sa sélection
      // à chaque rafraîchissement de l'horloge ou des réserves.
      if (lecture.textContent !== f.value) lecture.textContent = f.value;
      lecture.hidden = !f.disabled;
      f.classList.toggle("pc-prose-editor-lecture", f.disabled);
    });
  }
  function applyEdit(scope, id) {
    scope.classList.toggle("editing", isEdit(id));
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-edit-field"), function (f) {
      f.disabled = !isEdit(id);
    });
    majTextesLecture(scope);
    if(window.__owdApplyMode)window.__owdApplyMode(scope);
  }
  function gearBtn(scope, id, onToggle) {
    var g = el("button", "pc-gear", "⚙");
    g.type = "button";
    g.title = "Modifier ce module";
    g.addEventListener("click", function () {
      if(!ficheModifiable())return;
      editMods[id] = !editMods[id];
      g.title = isEdit(id) ? "Terminer les modifications" : "Modifier ce module";
      applyEdit(scope, id);
      if (onToggle) onToggle();
    });
    // resynchronise aussi les éléments recréés par les rebuilds internes
    hooks.push(function () { applyEdit(scope, id); });
    return g;
  }
  function block(title, small, editId, onToggle) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    if (editId) {
      b.classList.add("pc-editable");
      // data-module est le point d'accroche des sondes ; les modules sans
      // rouage le reçoivent quand même, posé par monteModules
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }
  // Une note sous un bloc : ce que la fiche a besoin de dire sur l'ÉTAT du
  // personnage ou sur le sens d'un champ. Jamais une règle du livre.
  function note(txt) { return el("div", "pc-block-note", txt); }
  // ---------- barre d'outils + bibliothèque (site seulement) ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche Outward"));
    top.appendChild(el("span", "pc-top-hint", "Personnage — règles de base Outward"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      // refait après CHAQUE écriture de la bibliothèque, sinon le select ment
      sel.innerHTML = "";
      var o0 = el("option", null, "Bibliothèque");
      o0.value = "";
      sel.appendChild(o0);
      loadPersos().forEach(function (p) {
        var o = el("option", null, p.name || "Sans nom");
        o.value = p.id;
        sel.appendChild(o);
      });
    }
    fillSel();
    lib.appendChild(sel);

    function btn(txt, cls, title, fn) {
      var b = el("button", "pc-btn" + (cls ? " " + cls : ""), txt);
      b.type = "button";
      if (title) b.title = title;
      b.addEventListener("click", fn);
      return b;
    }
    lib.appendChild(btn("Charger", null, null, function () {
      var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
      if (!p) { flash("Choisir un personnage dans la liste."); return; }
      // COPIE : sans elle, la fiche et l'entrée de bibliothèque partageraient
      // les mêmes objets, et jouer écraserait la sauvegarde
      try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
      catch (e) { flash("Fiche illisible."); return; }
      remount();
      flash("« " + (p.name || "Sans nom") + " » chargé.");
    }));
    lib.appendChild(btn("Enregistrer", null, "Enregistrer le personnage courant dans la bibliothèque", function () {
      var persos = loadPersos();
      var name = state.name || "Sans nom";
      var existant = null;
      persos.forEach(function (p) { if (p.name === name) existant = p; });
      var copie = JSON.parse(JSON.stringify(state));
      if (existant) existant.state = copie;
      else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copie });
      savePersos(persos);
      fillSel();
      flash("« " + name + " » enregistré.");
    }));
    lib.appendChild(btn("Supprimer", "danger", "Supprimer le personnage choisi de la bibliothèque", function () {
      if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
      savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
      fillSel();
    }));
    lib.appendChild(btn("Nouveau", null, null, function () { state = blank(); remount(); }));
    lib.appendChild(btn("Exporter", null, null, exporterJson));
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () { importerJson(file); });
    lib.appendChild(btn("Importer", null, null, function () { file.click(); }));
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }
  // Exporter / importer : le même geste que dans le bloc « Fiche » des Options,
  // qui les REDONNE parce que la barre d'outils n'existe pas dans Roll20.
  function exporterJson() {
    var a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    a.download = (state.name || "personnage-outward") + ".json";
    a.click();
  }
  function importerJson(file) {
    if(!ficheModifiable())return;
    var f = file.files && file.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      if(!ficheModifiable()||!file.isConnected)return;
      try {
        state = normalize(JSON.parse(r.result));
        remount();
        flash("Personnage importé.");
      } catch (e) { flash("JSON illisible."); }
      file.value = "";
    };
    r.readAsText(f);
  }

  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, faut-il demander un modificateur, et combien de dés le
  // joueur engage. Geste de JEU : aucun rouage, aucun mode édition. Posée en
  // FRÈRE de .pc-head, jamais dans .pc-id — dont les douze colonnes sont
  // pleines, et dont la hauteur commande la taille du portrait.
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;
    var listeRoll20 = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }
    // fabrique de segments accolés : trois réglages, la même mécanique
    function segments(cle, actuel, choix, apres) {
      var segs = el("div", "pc-envoi-segs");
      var boutons = [];
      choix.forEach(function (o) {
        var b = el("button", "seg" + (actuel === o[0] ? " on" : ""), o[1]);
        b.type = "button";
        b.title = o[2];
        b.addEventListener("click", function () {
          lset(cle, o[0]);
          boutons.forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          if (apres) apres(o[0]);
        });
        boutons.push(b);
        segs.appendChild(b);
      });
      return segs;
    }

    bar.appendChild(segments(ENVOI.mode, envMode(), [
      ["public", "Publique", "Tout le monde voit la carte"],
      ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
      ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]
    ], function (v) { majDest(); if (v === "joueur") demanderJoueurs(); }));

    function nomsManuels() {
      return lpref(ENVOI.noms, "").split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    }
    function remplirDest(noms) {
      var actuel = envDest();
      destSel.innerHTML = "";
      if (!noms.length) {
        var vide = el("option", null, listeRoll20 ? "Aucun autre joueur connecté" : "Aucun joueur enregistré");
        vide.value = "";
        destSel.appendChild(vide);
      }
      noms.forEach(function (n) {
        var o = el("option", null, n);
        o.value = n;
        if (n === actuel) o.selected = true;
        destSel.appendChild(o);
      });
      // un destinataire choisi avant que la liste change reste sélectionnable
      if (actuel && noms.indexOf(actuel) < 0) {
        var o2 = el("option", null, actuel + " (absent)");
        o2.value = actuel; o2.selected = true;
        destSel.appendChild(o2);
      }
      // CE QUI EST AFFICHÉ EST CE QUI SERA UTILISÉ. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : sans réponse, la saisie manuelle prend le relais.
    function demanderJoueurs() {
      if (typeof window.__owdPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__owdPlayers(function (noms) {
        if (noms && noms.length) { listeRoll20 = noms; remplirDest(noms); }
        else remplirDest(nomsManuels());
        majDest();
      });
    }
    bar.appendChild(destSel);

    editNoms = miniBtn("Joueurs…", "Saisir les noms des joueurs de la table", function () {
      var corps = el("div", "pc-modal-body");
      corps.appendChild(el("div", "pc-modal-note",
        "Un nom par ligne, tel qu'il s'affiche dans Roll20. Cette liste reste dans ce navigateur."));
      var ta = el("textarea", "pc-notes");
      ta.rows = 6;
      ta.value = lpref(ENVOI.noms, "");
      corps.appendChild(ta);
      dialogue("Joueurs de la table", corps, function () {
        lset(ENVOI.noms, ta.value);
        remplirDest(nomsManuels());
      }, "Enregistrer");
    });
    bar.appendChild(editNoms);

    var sepM = el("span", "lbl", "Modificateur");
    sepM.title = "Ne s'applique qu'aux jets : compétence, attaque, parade, technique";
    bar.appendChild(sepM);
    bar.appendChild(segments(ENVOI.input, envInput() ? "1" : "0", [
      ["0", "Sans input", "Le jet part tel quel"],
      ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]
    ]));

    // LE TROISIÈME SEGMENT, propre à Outward. Une caractéristique n'entre
    // jamais dans un jet ici : elle ouvre l'usage d'une arme et fixe ses
    // dégâts. Ce qui varie, c'est le NOMBRE DE DÉS ENGAGÉS — le rang donne un
    // plafond, le joueur peut en engager moins.
    var sepD = el("span", "lbl", "Dés engagés");
    sepD.title = "Le rang donne un plafond de dés d'action ; on peut toujours en engager moins";
    bar.appendChild(sepD);
    bar.appendChild(segments(ENVOI.des, envDesChoix() ? "1" : "0", [
      ["0", "Au maximum", "Le jet engage tous les dés que le rang autorise"],
      ["1", "Au choix", "Roll20 demande combien de dés engager avant de lancer"]
    ]));

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur SA hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic —
    // JAMAIS prompt(), muet dans l'iframe Roll20 sous Chrome.
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    pclip.appendChild(el("span", "ph", "?"));
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      // ne toucher à src QUE s'il change : sinon l'image se recharge à chaque frappe
      if (pimg.getAttribute("src") !== want) {
        if (want) pimg.src = want;
        else pimg.removeAttribute("src");
      }
      pbox.classList.toggle("vide", !want);
    });
    var pedit = null;
    pbox.addEventListener("click", function () {
      if (pedit) return;
      pedit = el("input", "pc-portrait-edit");
      pedit.type = "text";
      pedit.placeholder = "URL de l'image…";
      pedit.value = state.portrait || "";
      pedit.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); pedit.blur(); }
        else if (e.key === "Escape") { pedit.value = state.portrait || ""; pedit.blur(); }
      });
      pedit.addEventListener("blur", function () {
        state.portrait = pedit.value.trim();
        if (pedit) { pedit.remove(); pedit = null; }
        refresh();
      });
      pbox.appendChild(pedit);
      setTimeout(function () { pedit.focus(); pedit.select(); }, 0);
    });
    head.appendChild(pbox);
    // Carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE. Aucun
    // transfert aspect-ratio (infiable depuis un étirement flex sous Firefox)
    // et aucune règle de largeur en CSS, qui contredirait le calcul. Boucle
    // BORNÉE à 3 passes : régler le côté rétrécit le bloc d'identité, qui peut
    // se replier et changer de hauteur.
    var PORTRAIT_MAX = 6;   // rem
    function carrePortrait(passe) {
      var un = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      var cible = Math.min(idBox.offsetHeight, Math.round(PORTRAIT_MAX * un));
      if (!cible) return;
      var actuel = parseFloat(pbox.style.width) || 0;
      if (Math.abs(actuel - cible) <= 1) return;
      pbox.style.width = cible + "px";
      pbox.style.height = cible + "px";
      if ((passe || 0) < 3) carrePortrait((passe || 0) + 1);
    }
    hooks.push(function () { carrePortrait(0); });
    setTimeout(function () { carrePortrait(0); }, 0);
    // suit les redimensionnements (dialogue Roll20, fenêtre séparée)
    try {
      var observateurPortrait = new ResizeObserver(function () { carrePortrait(0); });
      observateurPortrait.observe(idBox);
      remontageNettoyage.push(function () { observateurPortrait.disconnect(); });
    } catch (e) {}

    idBox.appendChild(fld("Nom", textInput(function () { return state.name; },
      function (v) { state.name = v; }, "Nom du personnage"), "c2"));
    idBox.appendChild(fld("Espèce", textInput(function () { return state.espece; },
      function (v) { state.espece = v; }), "c2"));
    var taille = el("select", "pc-select pc-taille"); taille.setAttribute("aria-label", "Taille du personnage");
    [["minuscule", "Minuscule"], ["petite", "Petite"], ["moyenne", "Moyenne"], ["grande", "Grande"], ["enorme", "Énorme"], ["gigantesque", "Gigantesque"]].forEach(function (v) {
      var op = el("option", null, v[1]); op.value = v[0]; op.selected = state.taille === v[0]; taille.appendChild(op);
    });
    taille.addEventListener("change", function () { state.taille = taille.value; refresh(); });
    hooks.push(function () { if (document.activeElement !== taille) taille.value = state.taille; });
    idBox.appendChild(fld("Taille", taille, "c2"));
    idBox.appendChild(fld("Âge", textInput(function () { return state.age; },
      function (v) { state.age = v; }), "c2"));
    idBox.appendChild(fld("Sexe", textInput(function () { return state.sexe; },
      function (v) { state.sexe = v; }), "c2"));
    idBox.appendChild(fld("Genre", textInput(function () { return state.genre; },
      function (v) { state.genre = v; }), "c2"));

    // 2e ligne, pleine largeur : les deux budgets et le total d'XP.
    var mrow = el("div", "pc-id-meters");
    function meter(label, getUsed, getTotal, titre) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      if (titre) m.title = titre;
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = fmtP(used) + " / " + fmtP(total);
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? (used / total) * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    // UN COMPTEUR EN PIÈCES, pour ce qui se compte à l'unité : autant de pièces
    // que de points, pleines pour ceux dépensés, vides pour ceux qui restent,
    // et celles de trop en danger. Carrés pour les avantages, maillons de
    // chaîne (le pictogramme de rupture du livre) pour la rupture.
    function pieces(label, getUsed, getTotal, forme, titre) {
      var m = el("span", "pc-meter pc-meter-pieces");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      var box = el("span", "pc-pieces " + forme);
      m.appendChild(box);
      if (titre) m.title = titre;
      hooks.push(function () {
        var used = getUsed(), total = getTotal();
        b.textContent = fmtP(used) + " / " + fmtP(total);
        b.classList.toggle("over", used > total);
        var pleins = Math.floor(used), n = Math.min(40, Math.max(Math.floor(total), pleins));
        box.innerHTML = "";
        for (var i = 0; i < n; i++)
          box.appendChild(el("i", "pc-piece" + (i < pleins ? " plein" : "") + (i >= total ? " over" : "")));
      });
      return m;
    }
    // DEUX LIGNES, dans l'ordre arrêté par l'auteur :
    //   Création | XP dépensé | XP total
    //   Avantage | Rupture | Compétences | Techniques
    var mrow2 = el("div", "pc-id-meters");
    if (creation()) mrow.appendChild(meter("Création", creationDepense, creationPoints));
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; },
      "Ce que les rangs de compétence, les techniques et les caractéristiques ont coûté"));
    if (avantagePoints() !== null)
      mrow2.appendChild(pieces("Avantage", avantageDepense, avantagePoints, "carres", "Points d'avantage"));
    mrow2.appendChild(pieces("Rupture", ruptureDepense, ruptureMax, "chaines",
      "Points de rupture engagés par les Rangs Max et par les techniques"));
    if (limiteRangs("competences") !== null)
      mrow2.appendChild(meter("Compétences", compRangsComptes,
        function () { return limiteRangs("competences"); }, "Rangs de compétence"));
    if (limiteRangs("techniques") !== null)
      mrow2.appendChild(meter("Techniques", techRangsComptes,
        function () { return limiteRangs("techniques"); }, "Rangs de technique"));
    var xpIn = el("input");
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 25;
    xpIn.value = state.xpTotal;
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    mrow.appendChild(fld("XP total", xpIn));
    idBox.appendChild(mrow);
    idBox.appendChild(mrow2);

    head.appendChild(idBox);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // ---- garde-fous ----
    // Ils disent l'ÉTAT du personnage, jamais une règle : c'est la seule
    // exception au « rien du livre ne s'affiche ». Le conteneur est toujours
    // là ; .pc-warns:empty le fait disparaître tout seul quand il n'a rien à
    // dire.
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      function dire(t) { warns.appendChild(el("div", "pc-warn", t)); }
      if (xpRestant() < 0)
        dire("XP dépensé au-delà du total (" + fmtP(xpDepense()) + " / " + fmtP(state.xpTotal) + ").");
      if (creation()) {
        if (creationDepense() > creationPoints())
          dire("Points de création répartis au-delà du compte (" + fmtP(creationDepense()) +
               " / " + fmtP(creationPoints()) + ").");
        var hors = caracsOrdre().filter(function (c) {
          var v = caracBase(c);
          return v < num(creation().min, 0) || v > num(creation().max, 9999);
        });
        if (hors.length)
          dire("Création hors des bornes : " + hors.map(function (c) {
            return libCarac(c) + " " + fmtP(caracBase(c));
          }).join(", ") + ".");
      }
      if (avantagePoints() !== null && avantageDepense() > avantagePoints())
        dire("Points d'avantage dépensés au-delà du compte (" + fmtP(avantageDepense()) +
             " / " + fmtP(avantagePoints()) + ").");
      [["competences", compRangsComptes, "compétence"],
       ["techniques", techRangsComptes, "technique"]].forEach(function (x) {
        var lim = limiteRangs(x[0]);
        if (lim !== null && x[1]() > lim)
          dire("Rangs de " + x[2] + " au-delà de la limite (" + fmtP(x[1]()) + " / " + fmtP(lim) + ").");
      });
      if (ruptureRestante() < 0)
        dire("Points de rupture engagés au-delà du compte (" + fmtP(ruptureDepense()) +
             " / " + fmtP(ruptureMax()) + ").");
      if (peMax() <= 0)
        dire("Points d'endurance au maximum de zéro : le personnage est inconscient.");
      if (poidsPorte() > charge())
        dire("Charge dépassée : " + fmtP(poidsPorte()) + " pour " + fmtP(charge()) + ".");
      if (ebPoches() > capPoches())
        dire("Poches trop pleines : " + fmtP(ebPoches()) + " eb pour " + fmtP(capPoches()) + ".");
      if (ebSac() > capSac())
        dire("Sac à dos trop plein : " + fmtP(ebSac()) + " eb pour " + fmtP(capSac()) + ".");
      if (accesPris() > accesRapides())
        dire("Accès rapides dépassés : " + accesPris() + " pour " + accesRapides() + ".");
      if (contenancePrise() > contenance())
        dire("Contenance dépassée : " + fmtP(contenancePrise()) + " pour " + fmtP(contenance()) + ".");
      if (state.etat.pm !== null && state.etat.pm > pmMax())
        dire("Points de mana au-delà du maximum (" + fmtP(state.etat.pm) + " / " + fmtP(pmMax()) +
             ") : aucune règle ne donne ce maximum aujourd'hui.");
      if (effondrement() >= effPlafond() && effPlafond() > 0)
        dire("Effondrement au dernier niveau (" + effondrement() + ").");
    });
    sheet.appendChild(warns);
  }

  // ---------- onglets ----------
  // CINQ, et chacun tient une seule sorte de chose. Le contrôle segmenté est
  // celui de JJK, repris tel quel.
  //
  //   Fiche       ce qui se lit en jouant : caractéristiques, réserves, corps
  //   Art         les techniques, qui sont des CARTES et n'ont pas de colonne
  //   Équipement  ce qui se porte : armes, vêtements, bourse, inventaire
  //   Bio         la prose, qu'on ne consulte pas en combat
  //   Options     les leviers du meneur et les réglages de la fiche
  //
  // POURQUOI CINQ ET NON TROIS : les techniques, la bio et les notes vivaient
  // en pleine largeur SOUS l'onglet Fiche, c'est-à-dire sous huit blocs qu'il
  // fallait dépasser pour les atteindre. Une carte de technique n'a rien à
  // faire derrière une jauge de satiété.
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "art", label: "Art" },
    { id: "equipement", label: "Équipement" },
    { id: "bio", label: "Bio" },
    { id: "options", label: "Options" }
  ];
  function buildTabs(sheet) {
    var bar = el("div", "pc-tabs");
    var panes = {};
    var btns = {};
    TABS.forEach(function (t) {
      var b = el("div", "pc-tab", t.label);
      b.addEventListener("click", function () { activate(t.id); });
      bar.appendChild(b);
      btns[t.id] = b;
      panes[t.id] = el("div", "pc-pane");
      // L'onglet se nomme sur son panneau : c'est le SEUL moyen, de
      // l'extérieur, de dire dans QUELLE colonne de QUEL onglet un module a
      // atterri. À ne pas omettre.
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);
      if(!enMontage){monteOnglet(id);refresh(true);}
      //    // l'onglet ouvert survit au remontage
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage ferait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod se substitue à un
  // module natif, ou change la disposition, sans qu'on rouvre ce fichier.
  //
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (repris par le plan et les cartes de panne)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction SANS effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée AVANT toute consigne

  function rangModule(id) {
    for (var i = 0; i < modules.length; i++) if (modules[i].id === id) return i;
    return -1;
  }
  // Un id DÉJÀ PRÉSENT est REMPLACÉ, À SA PLACE : c'est ainsi qu'un mod se
  // substitue à un module natif. Le renvoyer en fin de colonne changerait la
  // disposition en douce, ce que personne n'a demandé.
  function enregistre(m) {
    var i = rangModule(m.id);
    // QUI a enregistré ce module. Un mod pose presque toujours un module dont
    // l'id diffère du sien : sans cette marque, ni la purge de horsMontage ni
    // les filtres du module ne sauraient remonter jusqu'au mod que le joueur
    // refuse. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
    if (!enMontage)
      gardeHorsMontage({ mod: m, prop: (m && (m.__mod || m.id)) ? String(m.__mod || m.id) : "?" });
    return m;
  }
  // Ordre PARTIEL : les id listés passent devant, dans l'ordre donné ; tous les
  // autres suivent à leur rang de déclaration. La liste est gardée BRUTE et
  // filtrée seulement au montage : un id peut nommer un module pas encore
  // enregistré (un mod chargé après), et un module retiré un jour ne doit pas
  // casser une disposition enregistrée.
  function ordonne(liste) {
    moduleOrdre = [];
    if (!liste) return;
    for (var i = 0; i < liste.length; i++)
      if (moduleOrdre.indexOf(liste[i]) < 0) moduleOrdre.push(liste[i]);
  }
  function ordreModules() {
    var vus = {}, out = [];
    moduleOrdre.forEach(function (id) {
      var i = rangModule(id);
      if (i >= 0 && !vus[id]) { vus[id] = 1; out.push(modules[i]); }
    });
    modules.forEach(function (m) {
      if (!vus[m.id]) { vus[m.id] = 1; out.push(m); }
    });
    return out;
  }

  // Squelette de chaque onglet : ses colonnes, dans l'ordre. Il vit ICI, et pas
  // dans les modules, pour qu'un mod n'ait qu'un bloc à fournir sans rien
  // savoir de la charpente.
  //
  // Une colonne PLEINE LARGEUR se reconnaît à ce qu'elle rend le PANNEAU
  // lui-même (c[k] === pane) : c'est ainsi que l'inventaire passe sous les deux
  // colonnes, et c'est ce que squeletteColonnes() exploite pour dessiner le
  // plan. L'onglet Fiche en gagne une (JJK n'en avait pas) : les techniques
  // s'étalent sous les trois colonnes, le CSS le porte déjà
  // (.pc-cols-fiche + .pc-block { margin-top: var(--gut) }).
  var SQUELETTES = {
    // TROIS COLONNES, et pas de rangée pleine largeur : ce qui s'y trouvait est
    // parti dans ses propres onglets.
    fiche: function (pane) {
      var cols = el("div", "pc-cols-fiche");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      var c3 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      cols.appendChild(c3);
      pane.appendChild(cols);
      return { gauche: c1, milieu: c2, droite: c3 };
    },
    // UNE SEULE COLONNE, et c'est le PANNEAU lui-même : une carte de technique
    // porte cinq champs et une macro, elle ne tient pas dans un tiers de
    // feuille. Rendre le panneau au lieu d'un enfant est la convention qui dit
    // « pleine largeur » — le plan des modules la reconnaît et dessine alors sa
    // propre rangée.
    art: function (pane) {
      return { seule: pane };
    },
    equipement: function (pane) {
      return { milieu: pane };
    },
    bio: function (pane) {
      var cols = el("div", "pc-cols2");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      pane.appendChild(cols);
      return { gauche: c1, droite: c2 };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      pane.appendChild(cols);
      return { gauche: c1, droite: c2 };
    }
  };
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite",
    seule: "Pleine largeur", bas: "Pleine largeur"
  };

  // L'interrupteur du module. SEULS les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche SANS RIEN EFFACER : son coffre et
  // ses données restent, il ne s'affiche plus.
  function activeModule(id, oui) {
    if (!state) return;
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et LE REFUS EST ICI, DANS
    // L'ÉCRITURE, pas seulement au montage. Sinon un mod qui appelle
    // Owd.active("modules", false) laisse « modules: false » dans le personnage
    // pour toujours : le bloc s'affiche (le montage l'exempte) pendant que
    // Owd.actif("modules") répond faux, et le personnage transmis emporte une
    // incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Il passe par cette enveloppe qui ATTRAPE ses
  // exceptions : un prédicat qui jette emportait sinon TOUT le montage, donc la
  // fiche, sans rien pour rouvrir.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }

  var modulesDifferes=[],moduleObserver=null;
  function observeModuleDiffere(slot){if(moduleObserver)moduleObserver.observe(slot);}
  function observeVisibiliteModules(){
    if(typeof IntersectionObserver!=='function')return;
    var seen=false,wasVisible=true;
    var observer=new IntersectionObserver(function(entries){
      var restore=false;entries.forEach(function(e){if(e.target===rootEl){if(seen&&!wasVisible&&e.isIntersecting)restore=true;seen=true;wasVisible=e.isIntersecting;}});
      if(window.__owdViewVisible===false)return;
      var ready=modulesDifferes.filter(function(x){return entries.some(function(e){return e.target===x.slot&&e.isIntersecting;})&&x.slot.getClientRects().length;});
      modulesDifferes=modulesDifferes.filter(function(x){return ready.indexOf(x)<0;});
      ready.forEach(function(x){observer.unobserve(x.slot);construitModule(x.m,x.hote,x.slot);});
      if(ready.length||restore)refresh(true);
    });
    moduleObserver=observer;observer.observe(rootEl);remontageNettoyage.push(function(){observer.disconnect();});
  }
  function moduleNatif(m){return MODULES_NATIFS.some(function(n){return n.id===m.id&&n.build===m.build;});}
  function modulesPersoActifs(){return (typeof filtres!=='undefined'&&Object.keys(filtres).some(function(k){return filtres[k].length>0;}))||(Array.isArray(modules)&&modules.some(function(m){return !moduleNatif(m);}))||(state.mods||[]).some(function(m){return m.actif!==false&&modAutorise(m.id);});}
  function construitModule(m,hote,slot){
    var reg=regModule(m.id),precedent=hooks,propPrecedent=proprietaireCourant,e;
    hooks=reg;proprietaireCourant=m.__mod||m.id;
    var cleanStart=remontageNettoyage.length;
    try{e=m.build(contexte(m,reg));if(e&&e.nodeType!==1)e=null;if(e&&!e.dataset.module)e.dataset.module=m.id;etatModule(m.id).panne='';}
    catch(err){reg.length=0;e=blocEnPanne(m,err);}
    finally{hooks=precedent;proprietaireCourant=propPrecedent;}
    remontageNettoyage.slice(cleanStart).forEach(function(fn){fn._owdModule=m.id;});
    etatModule(m.id).vide=!e;
    if(!e){if(slot)slot.remove();delete elModules[m.id];return;}
    try{if(slot&&slot.parentNode)slot.parentNode.replaceChild(e,slot);else hote.appendChild(e);elModules[m.id]=e;}
    catch(err2){reg.length=0;var carte=blocEnPanne(m,err2);if(slot&&slot.parentNode)slot.parentNode.replaceChild(carte,slot);else hote.appendChild(carte);elModules[m.id]=carte;}
  }
  function monteOnglet(id){
    var todo=modulesDifferes.filter(function(x){return id==null||x.m.onglet===id;});
    modulesDifferes=modulesDifferes.filter(function(x){return id!=null&&x.m.onglet!==id;});
    todo.forEach(function(x){if(moduleObserver)moduleObserver.unobserve(x.slot);construitModule(x.m,x.hote,x.slot);});
  }
  function reconstruitModules(ids){
    ids.forEach(function(id){
      var old=elModules[id],m=modules.filter(function(x){return x.id===id;})[0];
      if(!old||!old.parentNode||!m||old.classList.contains('pc-module-differe'))return;
      var retained=[];remontageNettoyage.forEach(function(fn){if(fn._owdModule===id){try{fn();}catch(e){}}else retained.push(fn);});remontageNettoyage=retained;
      regsModules[id]=[];if(id==='comps')compHooks=[];if(id==='recuperation')recupHooks=[];if(id==='optcomps')optHooks=[];
      etatsModules[id]={echecs:0,musele:false,erreur:'',panne:'',vide:false};
      if((window.__owdViewVisible===false||!old.getClientRects().length)&&!m.__mod&&!modulesPersoActifs()){
        var parent=old.parentNode,slot=el('div','pc-module-differe');slot.dataset.module=id;slot.style.minHeight='1px';parent.replaceChild(slot,old);elModules[id]=slot;modulesDifferes.push({m:m,hote:parent,slot:slot});observeModuleDiffere(slot);
      }else construitModule(m,old.parentNode,old);
    });
  }
  function monteModules(panes){
    var colonnes={};elModules={};modulesDifferes=[];observeVisibiliteModules();
    TABS.forEach(function(t){if(SQUELETTES[t.id]&&panes[t.id])colonnes[t.id]=SQUELETTES[t.id](panes[t.id]);});
    ordreModules().forEach(function(m){
      if(panes.inventoryRoot&&m.id!==(panes.onlyModule||'inv'))return;
      if(!panes.inventoryRoot&&m.id!==MODULE_REGLAGES&&!actif(m.id))return;
      if(!moduleAffichable(m))return;
      var cols=colonnes[m.onglet],hote=panes.inventoryRoot||((cols&&aClef(cols,m.colonne))?cols[m.colonne]:null);
      if(!hote){etatModule(m.id).vide=true;return;}
      if(((panes.inventoryRoot&&window.__owdViewVisible===false)||(!panes.inventoryRoot&&m.onglet!==curTab()))&&!m.__mod&&!modulesPersoActifs()){
        var slot=el('div','pc-module-differe');slot.dataset.module=m.id;slot.style.minHeight='1px';hote.appendChild(slot);elModules[m.id]=slot;modulesDifferes.push({m:m,hote:hote,slot:slot});observeModuleDiffere(slot);
      }else construitModule(m,hote,null);
    });
  }
  // ---------- isolation des pannes ----------
  function blocEnPanne(m, err) {
    var msg = messageErreur(err);
    etatModule(m.id).panne = msg;
    if (window.console && window.console.error) window.console.error("[mod:" + m.id + "]", err);
    var b = el("div", "pc-block");
    b.dataset.module = m.id;
    b.dataset.panne = "1";
    var t = el("div", "pc-block-title", m.titre || m.id);
    // c'est l'ID, pas le titre, qui sert à retrouver le mod dans la liste et
    // dans le journal du navigateur (« [mod:<id>] »)
    t.appendChild(el("small", null, "module en panne — " + m.id));
    b.appendChild(t);
    b.appendChild(el("div", "pc-empty", msg));
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Réessayer", "Reconstruire ce module", function () {
      delete etatsModules[m.id];
      remount();
    }));
    // Pas de « Désactiver » pour le bloc des réglages, même en panne : le
    // couper retirerait le seul endroit d'où l'on rallume un module.
    if (m.id !== MODULE_REGLAGES)
      line.appendChild(miniBtn("Désactiver",
        "Retirer ce module de la fiche : rien n'est perdu, il ne s'affiche plus.", function () {
          // même garde qu'activeModule : une panne peut survenir sur un état
          // remplacé à la main, jamais repassé par normalize()
          if (!state.modActifs) state.modActifs = {};
          state.modActifs[m.id] = false;
          save();
          remount();
        }, "danger"));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // Muselé : le module GARDE son bloc (ses valeurs sont celles du dernier
  // rafraîchissement réussi), il cesse seulement d'être rappelé. On marque son
  // bloc et on dit pourquoi, sans rien changer à la mise en page.
  function museleAffiche(id, e) {
    if (window.console && window.console.warn)
      window.console.warn("[mod:" + id + "] muselé après " + e.echecs +
                          " rafraîchissements en erreur : " + e.erreur);
    var n = elModules ? elModules[id] : null;
    if (!n) return;
    n.dataset.musele = "1";
    n.title = "Module muselé après " + e.echecs + " rafraîchissements en erreur : " + e.erreur;
  }

  // ---------- le contexte d'un module ----------
  // C'est TOUT ce qu'un module touche, natif comme mod. Les natifs ne s'en
  // servent pas (ils appellent les fonctions directement) mais ils le
  // REÇOIVENT : un mod qui reprend l'id de l'un d'eux dispose exactement du
  // même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "Points de vie", pe: "Points d'endurance", pm: "Points de mana",
    pi: "Points d'innocence", pr: "Points de repos", ps: "Points de satiété",
    ph: "Points d'hydratation", expo: "Exposition", effondrement: "Effondrement",
    charge: "Charge", acces: "Accès rapides", contenance: "Contenance",
    rupture: "Rupture", desAction: "Dés d'action",
    competence: "Compétence", rang: "Rang", total: "Total", groupe: "Groupe",
    technique: "Technique", arme: "Arme", geste: "Geste", parade: "Parade",
    reduction: "Réduction", degats: "Dégâts", portee: "Portée", seuil: "Seuil",
    vetement: "Vêtement", froid: "Froid", chaud: "Chaud", poids: "Poids",
    quantite: "Quantité", places: "Volume", description: "Description",
    argent: "Bourse", xpTotal: "XP total", de: "Dé des jets"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE : un mod enregistre presque
    // toujours un module dont l'id diffère du sien, et attribuer le filtre au
    // module rendrait la purge inopérante puisque c'est le MOD que le joueur
    // refuse ou supprime.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe,
    // proprietaireCourant est retombé à « ? » et le filtre posé par le bouton
    // d'un mod refusé survit à son refus.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    var donnees = {
      // LIRE NE SALIT PAS : on rend un objet DÉTACHÉ plutôt que de ranger un
      // objet vide dans l'état au premier get(). Sinon tout module qui se
      // contente de lire laisse sa trace dans le personnage.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE : un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche entière.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
    function puce(libelle, lire, ecrire) {
      var c = el("span", "pc-chip", libelle);
      c.classList.toggle("on", !!lire());
      c.addEventListener("click", function () {
        ecrire(!lire());
        c.classList.toggle("on", !!lire());
        refresh();
      });
      reg.push(function () { c.classList.toggle("on", !!lire()); });
      return c;
    }
    return {
      id: id,
      // Le numéro tel qu'il est, suffixe de beta compris : qui veut le lire
      // passe par OwdMods.lireVersion, seul endroit qui sache ce que vaut ce
      // suffixe. Le découper à la main rendrait « 0b » sur le dernier nombre.
      version: RELEASE,
      state: state,
      data: DATA,
      donnees: donnees,
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques : tout ce qui prend un GESTE du joueur passe par aNous()
      texte: function (lire, ecrire, indication) { return textInput(lire, aNous(ecrire), indication, reg); },
      bouton: function (libelle, infobulle, action) { return miniBtn(libelle, infobulle, aNous(action)); },
      pas: function (lire, ecrire, pas) { return stepper(lire, aNous(ecrire), pas || 1, null, reg); },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (idComp) {
        var c = compDe(idComp);
        return c ? compRow(c, false, { module: id, reg: reg }) : el("div", "pc-empty", "Compétence inconnue.");
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur, des) { doRoll(libelle, valeur, deDe(des || 1), true, des || 1); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal, caracXp: caracXp, creationDepense: creationDepense,
        limiteRangs: limiteRangs, compRangsComptes: compRangsComptes, techRangsComptes: techRangsComptes,
        compBonus: compBonus, compDes: compDes, compXp: compXp,
        pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
        prMax: prMax, psMax: psMax, phMax: phMax,
        charge: charge, accesRapides: accesRapides, contenance: contenance,
        expoMax: expoMax, effondrement: effondrement, effBasePartie: effBasePartie, effApresEffets: effApresEffets, effPartie: effPartie,
        poidsPorte: poidsPorte, desAction: desAction, ruptureMax: ruptureMax,
        xpDepense: xpDepense, courant: courant, maxDe: maxDe
      },
      // …et de quoi les CHANGER. Le propriétaire est figé ici, à la
      // construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return abbrCarac(carac); }
    };
  }
  // ================= ONGLET FICHE =================

  // ---- les leviers d'une valeur : forçage et modificateurs ----
  // Vide = valeur CALCULÉE (le placeholder la montre en filigrane), une valeur
  // la FORCE. C'est le contrat de tous les champs « Forcé » de la fiche.
  function champForceMax(cle, auto, titre, reg) {
    return champForceBoite("capsLeviers", "max", cle, auto,
      titre || "Vide = maximum calculé (modificateurs compris) ; une valeur le force.", reg);
  }
  // La ligne « Forcé + Modificateurs » sous une jauge, en mode édition.
  function ligneLeviers(cle, auto, titre) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    row.appendChild(champForceMax(cle, auto, titre));
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiModBoite("capsLeviers", "max", cle));
    row.appendChild(el("span", "sp"));
    return row;
  }

  // D'où vient un maximum, décomposé pour l'infobulle. La formule VERBATIM du
  // livre est dans les données ; on la cite, on ne la réécrit pas, et on ajoute
  // ce que la caractéristique du personnage y met aujourd'hui.
  function provenanceCap(cle) {
    return function () {
      var d = capDef(cle);
      if (!d) return "Aucune donnée pour cette capacité.";
      if (!d.formule) return "Aucune formule ne donne cette valeur.";
      var t = d.formule;
      if (d.carac) t += " — " + libCarac(d.carac) + " " + fmtP(caracTotal(d.carac));
      return t;
    };
  }

  // ---- 1. Caractéristiques ----
  function buildCaracs() {
    var b = block("Caractéristiques", null, "caracs");

    // UNE SEULE ENTÊTE, COMME MIA : exactement le même squelette que les
    // deux cases qu'elle annonce. En jeu on lit VALEUR | MOD ; sous le rouage
    // les deux mêmes colonnes deviennent CRÉATION | XP.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "pc-carac-head-spacer"));
    var teteDuo = el("div", "pc-segs pc-carac-segs pc-carac-head");
    function teteCase(jeu, edit) {
      var c = el("span", "c");
      c.appendChild(el("span", "pc-jeu-only", jeu));
      c.appendChild(el("span", "pc-edit-only", edit));
      teteDuo.appendChild(c);
    }
    teteCase("VAL", "Création");
    teteCase("Mod", "XP");
    tete.appendChild(teteDuo);
    b.appendChild(tete);

    caracsOrdre().forEach(function (name) {
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr pc-carac-abbr", abbrCarac(name));
      chip.title = libCarac(name);
      top.appendChild(chip);

      var duo = el("div", "pc-segs pc-carac-segs");

      // CASE 1 : VALEUR en jeu, CRÉATION sous le rouage.
      var cVal = el("span", "c");
      var val = el("span", "pc-jeu-only pc-carac-val", "");
      val.title = "Valeur";
      var creationInput = el("input", "pc-edit-only pc-edit-field pc-carac-input");
      creationInput.type = "number";
      creationInput.step = "1";
      creationInput.title = "Création";
      creationInput.addEventListener("input", function () {
        var v = parseInt(creationInput.value, 10);
        if (!isFinite(v)) return;
        var avant = caracBase(name), cr = creation();
        v = Math.round(v);
        if (v === avant) return;
        if (cr) {
          v = clamp(v, num(cr.min, 0), num(cr.max, 9999));
          if (v > avant) {
            var libre = creationPoints() - creationDepense() + avant;
            if (v > libre) v = Math.max(avant, libre);
            if (v <= avant) { flash("Points de création épuisés."); return; }
          }
        }
        state.caracs[name] = clamp(v, -9999, 9999);
        refresh();
      });
      cVal.appendChild(val);
      cVal.appendChild(creationInput);
      duo.appendChild(cVal);

      // CASE 2 : MOD en jeu, XP sous le rouage.
      var cMod = el("span", "c");
      var mod = el("span", "pc-jeu-only pc-carac-mod", "");
      mod.title = "Modificateur";
      var xpInput = el("input", "pc-edit-only pc-edit-field pc-carac-input");
      xpInput.type = "number";
      xpInput.step = "1";
      xpInput.min = "0";
      xpInput.title = "XP";
      xpInput.addEventListener("input", function () {
        var apres = parseInt(xpInput.value, 10);
        if (!isFinite(apres)) return;
        var avant = caracAchat(name);
        apres = Math.max(0, Math.round(apres));
        if (apres === avant) return;
        if (apres > avant) {
          var base = caracBase(name), cout = 0, i, prix;
          for (i = avant + 1; i <= apres; i++) {
            prix = prixPointCarac(base + i);
            if (prix === null) return;
            cout += prix;
          }
          if (xpRestant() < cout) { flash("XP insuffisant."); return; }
        }
        if (!state.caracsXp) state.caracsXp = {};
        if (apres > 0) state.caracsXp[name] = apres;
        else delete state.caracsXp[name];
        refresh();
      });
      cMod.appendChild(mod);
      cMod.appendChild(xpInput);
      duo.appendChild(cMod);

      top.appendChild(duo);
      row.appendChild(top);

      hooks.push(function () {
        var regle = levierRegleDe(lireCarac("total", name));
        var total = caracTotal(name);
        var bonus = Math.floor(total / 5);
        val.textContent = String(total);
        mod.textContent = (bonus > 0 ? "+" : "") + String(bonus);
        val.classList.toggle("adj", regle);
        val.title = "Valeur — " + chaineTexteDe(lireCarac("total", name), "valeur", caracVal(name)) +
                    (regle ? " = " + fmtP(total) : "");
        mod.title = "Modificateur — floor(" + total + " / 5) = " + bonus;
        if (document.activeElement !== creationInput) creationInput.value = caracBase(name);
        if (document.activeElement !== xpInput) xpInput.value = caracAchat(name);
      });
      b.appendChild(row);
    });
    return b;
  }
  // ---- Récupération ----
  // Le module montre deux familles dans la MÊME vue :
  //   - les récupérations NATURELLES, venues des règles. Leur contexte décide
  //     si elles sont actives ; elles n'ont pas de durée et ne se suppriment
  //     jamais. Sous le rouage on modifie uniquement leur BONUS de niveau.
  //   - les récupérations AJOUTÉES au personnage. Elles sont activées à la
  //     main, ont une durée et disparaissent lorsqu'elle arrive à zéro.
  //
  // Les ajouts vivent dans modData.recuperation : c'est le coffre du module,
  // déjà persistant et volontairement extensible. Aucun autre module n'a besoin
  // de connaître leur forme. Toutes les durées utilisent désormais l'horloge
  // interne à la seconde : un round vaut 3 s, puis 1 m / 10 m / 1 h / 8 h.
  var recupBox = null;
  var recupOnly = false;
  var recupNatives = true;
  var recupVueSig = "";

  var RECUP_DUREES = [
    { cle: "round", nom: "Round", court: "round", secondes: 3 },
    { cle: "minute", nom: "Minute", court: "m", secondes: 60 },
    { cle: "10m", nom: "10 minutes", court: "10 m", secondes: 600 },
    { cle: "1h", nom: "1 heure", court: "1 h", secondes: 3600 },
    { cle: "8h", nom: "8 heures", court: "8 h", secondes: 28800 }
  ];

  function recupLibelle(r) {
    return libCap(r.reserve, String(r.reserve || "").toUpperCase());
  }
  function recupAbbr(r) {
    var d = capDef(r.reserve);
    return d && d.abbr ? d.abbr : String(r.reserve || "").toUpperCase();
  }
  function recupNom(r) {
    if (r && r.perso) return String(r.nom || "Récupération");
    if (r && r.effetActif) return (r.effetActif.categorie === "digestive" ? "Digestive" : "Spéciale") + " · " + r.contexte;
    return (r && r.categorie === "naturelle" ? "Naturelle · " : "") + String(r && r.contexte || "Sans contexte");
  }
  function recupDureeDef(cle) {
    var out = RECUP_DUREES[2], i;
    for (i = 0; i < RECUP_DUREES.length; i++) if (RECUP_DUREES[i].cle === cle) out = RECUP_DUREES[i];
    return out;
  }
  function recupCadenceCourt(c) {
    if (!c || !c.points) return "0";
    var s = c.signe < 0 ? "−" : "+";
    if (c.minutes == null) return s + fmtP(c.points) + " / round";
    if (c.minutes === 1) return s + fmtP(c.points) + " / m";
    if (c.minutes === 10) return s + fmtP(c.points) + " / 10 m";
    if (c.minutes === 60) return s + fmtP(c.points) + " / h";
    if (c.minutes === 480) return s + fmtP(c.points) + " / 8 h";
    if (c.minutes > 60 && c.minutes % 60 === 0) return s + fmtP(c.points) + " / " + (c.minutes / 60) + " h";
    return s + fmtP(c.points) + " / " + c.minutes + " m";
  }
  // ---- coffre des récupérations ajoutées ----
  function recupAjoutsModule(cree) {
    var d = recupCoffre(cree);
    if (!Array.isArray(d.ajouts)) {
      if (!cree) return [];
      d.ajouts = [];
    }
    return d.ajouts;
  }
  function recupNettoieCoffreModule() {
    var d = recupCoffre(false);
    if (!d || !state.modData || !state.modData.recuperation) return;
    if (Array.isArray(d.ajouts) && !d.ajouts.length) delete d.ajouts;
    if (d.niveaux && !Object.keys(d.niveaux).length) delete d.niveaux;
    if (d.suivi && !Object.keys(d.suivi).length) delete d.suivi;
    if (!Object.keys(d).length) delete state.modData.recuperation;
  }
  function recupNiveauMaxModule() {
    var t = tempsDef(), max = 20;
    if (t && Array.isArray(t.regen) && t.regen.length) {
      max = 0;
      t.regen.forEach(function (x) { max = Math.max(max, Math.abs(num(x.niveau, 0))); });
    }
    return Math.max(1, Math.round(max));
  }
  function recupBonusModule(r) {
    return recupNiveauBase(r) - recupNiveauRegle(r);
  }
  function ecritRecupBonusModule(r, v) {
    ecritRecupNiveau(r, recupNiveauRegle(r) + Math.round(num(v, 0)));
  }
  function recupNormaliseAjoutModule(r) {
    var max = recupNiveauMaxModule(), d;
    if (!r || typeof r !== "object") return null;
    if (!r.id) r.id = uid("r");
    r.perso = true; r.categorie = r.categorie === "digestive" ? "digestive" : "speciale";
    r.nom = capFirst(String(r.nom || "Récupération").trim()) || "Récupération";
    r.reserve = String(r.reserve || "pv");
    r.niveau = clamp(Math.round(num(r.niveau, 0)), -max, max);
    r.actif = !!r.actif;
    d = recupDureeDef(r.type);
    r.type = d.cle;
    r.temps = Math.max(0, Number(r.temps) || 0);
    if (!isFinite(Number(r.resteSecondes))) r.resteSecondes = r.temps * d.secondes;
    r.resteSecondes = Math.max(0, Math.floor(Number(r.resteSecondes) || 0));
    return r;
  }
  function recupAjoutsNormalisesModule() {
    var a = recupAjoutsModule(false), out = [], i, r;
    for (i = 0; i < a.length; i++) {
      r = recupNormaliseAjoutModule(a[i]);
      if (r) out.push(r);
    }
    return out;
  }
  function recupTempsRestantModule(r) {
    var d = recupDureeDef(r.type);
    return d.secondes > 0 ? Math.max(0, Number(r.resteSecondes) || 0) / d.secondes : 0;
  }
  function recupResetDureeModule(r) {
    var d = recupDureeDef(r.type);
    r.resteSecondes = Math.max(0, Math.round((Number(r.temps) || 0) * d.secondes));
    recupOublieSuivi(r.id);
  }
  function recupCustomEtatModule(r) {
    var c = recupCadence(r.niveau), d = recupDureeDef(r.type);
    var reste = recupTempsRestantModule(r);
    return {
      def: r,
      niveau: r.niveau,
      cadence: c,
      actif: !!(r.actif && reste > 0 && c && c.points && r.niveau),
      condition: !!r.actif,
      bloque: false,
      perso: true,
      reste: reste,
      duree: d
    };
  }
  function recupEtatVueModule(r) {
    if(r && r.effetActif){var d=effetDefinition(r.effetActif.effet),re=d.ops.regen;return {niveau:re.niveau,cadence:recupCadence(re.niveau),actif:effetsSources().some(function(x){return x.e.id===r.effetActif.id;}),condition:true,bloque:false};}
    return r && r.perso ? recupCustomEtatModule(r) : recupEtat(r);
  }
  function recupListeModule() {
    return recupsListe().concat(recupAjoutsNormalisesModule()).concat((state.effetsActifs||[]).filter(function(e){var d=effetDefinition(e.effet);return d&&d.ops.regen;}).map(function(e){var d=effetDefinition(e.effet);return {id:e.id,reserve:d.ops.regen.reserve,contexte:d.nom,effetActif:e};}));
  }

  // ---- branchement au moteur temporel discret ----
  // Le socle gère les ticks des récupérations natives. Le module lui fournit
  // simplement ses ajouts et leur durée en secondes.
  var recupExpireModule = {};
  function recupPurgeExpiresModule() {
    var ids = recupExpireModule, a, avant;
    if (!Object.keys(ids).length) return;
    a = recupAjoutsModule(false); avant = a.length;
    a = a.filter(function (r) {
      if (!r || !ids[r.id]) return true;
      recupOublieSuivi(r.id);
      return false;
    });
    if (a.length !== avant) recupCoffre(true).ajouts = a;
    recupExpireModule = {};
    recupNettoieCoffreModule();
  }
  recupListeTemps = function () { return recupListeModule().filter(function(r){return !r.effetActif;}); };
  recupEtatTemps = function (r) { return recupEtatVueModule(r); };
  recupSecondesDisponiblesTemps = function (r, e, secondes, sens) {
    if (!e || !e.actif) return 0;
    if (!r.perso || sens < 0) return secondes;
    return Math.min(secondes, Math.max(0, Math.floor(Number(r.resteSecondes) || 0)));
  };
  recupApresPasTemps = function (r, e, secondes, sens) {
    if (!r || !r.perso || !e || !e.actif || !(secondes > 0)) return;
    if (sens > 0) {
      r.resteSecondes = Math.max(0, Math.floor(Number(r.resteSecondes) || 0) - secondes);
      if (!r.resteSecondes) recupExpireModule[r.id] = true;
    } else {
      r.resteSecondes = Math.max(0, Math.floor(Number(r.resteSecondes) || 0) + secondes);
    }
  };
  recupFinTemps = function (sens) { if (sens > 0) recupPurgeExpiresModule(); };

  // ---- résumé par réserve ----
  function recupTotalCleModule(c) {
    if (!c) return "";
    if (c.minutes == null) return "round";
    return "m:" + fmtP(c.minutes);
  }
  function recupTotalLibelleModule(cle) {
    if (cle === "round") return "round";
    var m = num(String(cle).slice(2), 0);
    if (m === 1) return "m";
    if (m === 10) return "10 m";
    if (m === 60) return "h";
    if (m === 480) return "8 h";
    if (m > 60 && m % 60 === 0) return (m / 60) + " h";
    return fmtP(m) + " m";
  }
  function recupTotauxModule(reserve) {
    var sommes = {}, ordre = [], liste = recupListeModule(), i, r, e, k, v;
    for (i = 0; i < liste.length; i++) {
      r = liste[i];
      if (r.reserve !== reserve) continue;
      e = recupEtatVueModule(r);
      if (!e.actif || !e.cadence || !e.cadence.points) continue;
      k = recupTotalCleModule(e.cadence);
      if (!k) continue;
      if (!Object.prototype.hasOwnProperty.call(sommes, k)) { sommes[k] = 0; ordre.push(k); }
      sommes[k] += e.cadence.signe * e.cadence.points;
    }
    var out = [];
    for (i = 0; i < ordre.length; i++) {
      k = ordre[i]; v = sommes[k];
      if (Math.abs(v) < 1e-9) continue;
      out.push({ cle: k, valeur: v, texte: sign(v) + " / " + recupTotalLibelleModule(k) });
    }
    return out;
  }

  // ---- tableau compact, calé sur le module Compétences ----
  // Une seule ligne porte TOUT : nom | actif | niveau | temps | type.
  // La lecture et l'édition occupent les mêmes cellules ; jamais de seconde
  // rangée, jamais de cadre segmenté sous le libellé.
  function recupChampNombreModule(lire, ecrire, aide) {
    var i = el("input", "pc-rec-field pc-rec-number");
    champNombreSigne(i); i.step = "1"; i.title = aide || "";
    i.addEventListener("input", function () {
      var v = litNombreSigne(i.value);
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    recupHooks.push(function () { if (document.activeElement !== i) i.value = lire(); });
    return i;
  }
  function recupSelectDureeModule(r) {
    var s = el("select", "pc-rec-field pc-rec-select"), i, d, o;
    for (i = 0; i < RECUP_DUREES.length; i++) {
      d = RECUP_DUREES[i];
      o = el("option", null, d.court); o.value = d.cle; o.title = d.nom; s.appendChild(o);
    }
    s.value = r.type;
    s.addEventListener("change", function () {
      r.temps = recupTempsRestantModule(r);
      r.type = s.value;
      recupResetDureeModule(r);
      refresh(); rebuildRecuperation();
    });
    recupHooks.push(function () { if (document.activeElement !== s) s.value = r.type; });
    return s;
  }

  function supprimeRecupAjoutModule(r) {
    var a = recupAjoutsModule(false), d = recupCoffre(false);
    if (!a.length) return;
    if (d && d.niveaux && d.niveaux[r.id] !== undefined) delete d.niveaux[r.id];
    d.ajouts = a.filter(function (x) { return x && x.id !== r.id; });
    recupOublieSuivi(r.id);
    recupNettoieCoffreModule();
    refresh(); rebuildRecuperation();
  }

  function recupNomCelluleModule(r) {
    var w = el("span", "pc-rec-name");
    if (r.perso && isEdit("recuperation")) {
      var ed = el("input", "pc-rec-name-edit");
      ed.type = "text"; ed.value = recupNom(r); ed.setAttribute("aria-label", "Nom de la récupération");
      ed.addEventListener("input", function () { r.nom = ed.value; refresh(); });
      ed.addEventListener("blur", function () {
        r.nom = capFirst(String(r.nom || "").trim()) || "Récupération"; refresh();
      });
      recupHooks.push(function () { if (document.activeElement !== ed) ed.value = recupNom(r); });
      w.appendChild(ed);
      var del = el("button", "pc-comp-del", "✕");
      del.type = "button"; del.title = "Supprimer cette récupération ajoutée";
      del.addEventListener("click", function () { supprimeRecupAjoutModule(r); });
      w.appendChild(del);
    } else {
      w.appendChild(el("span", "pc-rec-label", recupNom(r)));
    }
    if (r.perso) {
      if (isEdit("recuperation")) {
        var categorie = el("select", "pc-rec-categorie"); categorie.setAttribute("aria-label", "Catégorie de récupération");
        [["speciale", "Spéciale"], ["digestive", "Digestive"]].forEach(function (x) { var o = el("option", null, x[1]); o.value = x[0]; categorie.appendChild(o); });
        categorie.value = r.categorie;
        categorie.addEventListener("change", function () { r.categorie = categorie.value; refresh(); }); w.appendChild(categorie);
      } else w.appendChild(el("small", "pc-rec-categorie", r.categorie === "digestive" ? "Digestive" : "Spéciale"));
    }
    return w;
  }

  function recupValeurModule(txt, cls) {
    return el("span", "pc-rec-value" + (cls ? " " + cls : ""), txt);
  }

  function recupRangeeModule(r, odd) {
    var row = el("div", "pc-rec-row" + (odd ? " odd" : ""));
    var edit = isEdit("recuperation") && !r.effetActif;
    var e, cb = null, nivJeu = null, tempsJeu = null, typeJeu = null;
    row.appendChild(recupNomCelluleModule(r));

    // ACT. — contrôle uniquement pour les récupérations ajoutées. Les natives
    // montrent un tiret : leur activation appartient aux règles, pas au joueur.
    var actif = el("span", "pc-rec-col pc-rec-actif");
    if (r.perso) {
      cb = el("input", "pc-rec-active"); cb.type = "checkbox";
      cb.title = "Activer ou désactiver cette récupération";
      cb.addEventListener("change", function () {
        r.actif = !!cb.checked; recupOublieSuivi(r.id); refresh(); rebuildRecuperation();
      });
      actif.appendChild(cb);
    } else actif.appendChild(recupValeurModule("—", "muted"));
    row.appendChild(actif);

    // NIV. — en édition, une native règle son BONUS ; une ajoutée règle son
    // niveau propre. Hors édition on affiche toujours le niveau effectif.
    var niv = el("span", "pc-rec-col");
    if (edit) {
      if (r.perso) {
        niv.appendChild(recupChampNombreModule(function () { return r.niveau; }, function (v) {
          r.niveau = clamp(Math.round(v), -recupNiveauMaxModule(), recupNiveauMaxModule());
          recupOublieSuivi(r.id);
        }, "Niveau de cette récupération"));
      } else {
        niv.appendChild(recupChampNombreModule(function () { return recupBonusModule(r); }, function (v) {
          ecritRecupBonusModule(r, v);
        }, "Bonus au niveau de récupération (la règle de base n'est pas modifiée)"));
      }
    } else {
      nivJeu = recupValeurModule(""); niv.appendChild(nivJeu);
    }
    row.appendChild(niv);

    // TEMPS / TYPE — les natives sont infinies. Les récupérations ajoutées
    // occupent exactement les mêmes deux colonnes, en lecture comme en édition.
    var temps = el("span", "pc-rec-col");
    var type = el("span", "pc-rec-col");
    if (r.perso) {
      if (edit) {
        var tempsEdit = recupChampNombreModule(function () { return fmtP(recupTempsRestantModule(r)); }, function (v) {
          var d = recupDureeDef(r.type);
          r.temps = Math.max(0, Number(v) || 0);
          r.resteSecondes = Math.max(0, Math.round(r.temps * d.secondes));
          recupOublieSuivi(r.id);
        }, "Durée restante de cette récupération");
        tempsEdit.min = "0"; tempsEdit.step = "any";
        temps.appendChild(tempsEdit);
        type.appendChild(recupSelectDureeModule(r));
      } else {
        tempsJeu = recupValeurModule("");
        typeJeu = recupValeurModule(recupDureeDef(r.type).court);
        temps.appendChild(tempsJeu); type.appendChild(typeJeu);
      }
    } else if(r.effetActif) {
      tempsJeu=recupValeurModule("");typeJeu=recupValeurModule("s");temps.appendChild(tempsJeu);type.appendChild(typeJeu);
    } else {
      temps.appendChild(recupValeurModule("∞", "infinity"));
      type.appendChild(recupValeurModule("—", "muted"));
    }
    row.appendChild(temps); row.appendChild(type);

    recupHooks.push(function () {
      e = recupEtatVueModule(r);
      if (cb) cb.checked = !!r.actif;
      if (nivJeu) {
        nivJeu.textContent = sign(e.niveau);
        nivJeu.classList.toggle("adj", !r.perso && recupBonusModule(r) !== 0);
      }
      if (tempsJeu) tempsJeu.textContent = r.effetActif ? fmtP(r.effetActif.reste) : fmtP(recupTempsRestantModule(r));
      if (typeJeu) typeJeu.textContent = r.effetActif ? "s" : recupDureeDef(r.type).court;
      row.classList.toggle("active", !!e.actif);
      row.classList.toggle("inactive", !e.actif);
      row.title = recupLibelle(r) + " · " + recupNom(r) + " · niveau " + sign(e.niveau) +
        (e.cadence ? " · " + recupCadenceCourt(e.cadence) : "");
    });
    return row;
  }

  function recupSignatureActivesModule() {
    return recupListeModule().filter(function (r) { return recupEtatVueModule(r).actif; })
      .map(function (r) { return r.id; }).join("|");
  }
  function joueRecupHooksModule() {
    recupHooks.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function recupReservesModule() {
    var out = [], vus = {}, i, liste = recupListeModule();
    for (i = 0; i < liste.length; i++) {
      if (!liste[i].reserve || vus[liste[i].reserve]) continue;
      vus[liste[i].reserve] = 1; out.push(liste[i].reserve);
    }
    return out;
  }
  function recupNomNouveauModule(reserve) {
    var n = 1, pris = {}, a = recupAjoutsNormalisesModule(), i;
    for (i = 0; i < a.length; i++) if (a[i].reserve === reserve) pris[pli(a[i].nom)] = true;
    while (pris[pli("Récupération " + n)]) n++;
    return "Récupération " + n;
  }
  function ajouteRecupModule(reserve) {
    var d = recupDureeDef("10m"), a = recupAjoutsModule(true);
    a.push({
      id: uid("r"), perso: true, nom: recupNomNouveauModule(reserve), reserve: reserve,
      niveau: 0, actif: false, temps: 1, type: d.cle, resteSecondes: d.secondes
    });
    if (recupOnly) recupOnly = false;
    refresh(); rebuildRecuperation();
  }

  function recupEnteteReserveModule(cle, ref) {
    var h = el("div", "pc-rec-grouphead");
    var nom = el("span", "pc-rec-groupname");
    nom.appendChild(el("span", "pc-abbr", recupAbbr(ref)));
    nom.appendChild(el("span", "pc-rec-reserve-label", recupLibelle(ref)));
    h.appendChild(nom);
    var totals = el("span", "pc-rec-totaux");
    h.appendChild(totals);
    recupHooks.push(function () {
      var t = recupTotauxModule(cle), i;
      totals.innerHTML = "";
      if (!t.length) totals.appendChild(el("span", "pc-rec-total zero", "0"));
      else for (i = 0; i < t.length; i++) totals.appendChild(el("span", "pc-rec-total", t[i].texte));
    });
    return h;
  }

  function recupPiedReserveModule(cle, ref) {
    var pied = el("div", "pc-rec-add");
    var add = miniBtn("+", "Ajouter une récupération à " + recupLibelle(ref), function () { ajouteRecupModule(cle); });
    add.classList.add("pc-rec-addbtn");
    pied.appendChild(add);
    return pied;
  }

  function rebuildRecuperation() {
    if (!recupBox) return;
    recupHooks = [];
    recupBox.innerHTML = "";
    var toute = recupListeModule();
    var liste = toute.filter(function (r) {
      var e = recupEtatVueModule(r);
      if (!recupNatives && r.categorie === "naturelle") return false;
      if (recupOnly && !e.actif) return false;
      return true;
    });
    if (!liste.length && !isEdit("recuperation")) {
      recupBox.appendChild(el("div", "pc-empty",
        recupOnly ? "Aucune récupération n'est active actuellement."
                  : !recupNatives ? "Aucune récupération ajoutée."
                                  : "Aucune récupération."));
      recupVueSig = recupSignatureActivesModule();
      return;
    }

    var ordre = [], vus = {}, i;
    var sourceOrdre = isEdit("recuperation") ? toute : liste;
    for (i = 0; i < sourceOrdre.length; i++) {
      if (!vus[sourceOrdre[i].reserve]) { vus[sourceOrdre[i].reserve] = 1; ordre.push(sourceOrdre[i].reserve); }
    }
    ordre.forEach(function (cle) {
      var groupe = liste.filter(function (r) { return r.reserve === cle; });
      var ref = groupe[0] || toute.filter(function (r) { return r.reserve === cle; })[0];
      if (!ref) return;
      var groupeBox = el("div", "pc-rec-group");
      groupeBox.appendChild(recupEnteteReserveModule(cle, ref));

      var head = el("div", "pc-rec-row head");
      head.appendChild(el("span", null, "RÉCUPÉRATION"));
      head.appendChild(el("span", null, "ACT."));
      head.appendChild(el("span", null, "NIV."));
      head.appendChild(el("span", null, "TEMPS"));
      head.appendChild(el("span", null, "TYPE"));
      groupeBox.appendChild(head);

      groupe.forEach(function (r, index) { groupeBox.appendChild(recupRangeeModule(r, index % 2 === 1)); });
      if (isEdit("recuperation")) groupeBox.appendChild(recupPiedReserveModule(cle, ref));
      recupBox.appendChild(groupeBox);
    });
    recupVueSig = recupSignatureActivesModule();
    joueRecupHooksModule();
  }

  function buildRecuperation() {
    var b = block("Récupération", null, "recuperation", function () { rebuildRecuperation(); });
    var tools = el("div", "pc-comp-tools pc-rec-tools");
    var ligne = el("div", "row");
    var actives = el("span", "pc-chip", "Actives");
    actives.title = "N'afficher que les récupérations actuellement actives.";
    actives.classList.toggle("on", recupOnly);
    actives.addEventListener("click", function () {
      recupOnly = !recupOnly;
      actives.classList.toggle("on", recupOnly);
      rebuildRecuperation();
    });
    ligne.appendChild(actives);
    var natives = el("span", "pc-chip", "Naturelles");
    natives.title = "Afficher ou masquer les récupérations naturelles de la fiche.";
    natives.classList.toggle("on", recupNatives);
    natives.addEventListener("click", function () {
      recupNatives = !recupNatives;
      natives.classList.toggle("on", recupNatives);
      rebuildRecuperation();
    });
    ligne.appendChild(natives);
    tools.appendChild(ligne);
    b.appendChild(tools);

    recupBox = el("div", "pc-rec-list");
    b.appendChild(recupBox);
    hooks.push(function () {
      var sig = recupSignatureActivesModule();
      if (sig !== recupVueSig) rebuildRecuperation();
    });
    rebuildRecuperation();
    return b;
  }
  // Les définitions et les propriétés des objets sont celles de la Boutique.
  function effetsDefinitions() { return D().effets || []; }
  var effetsCacheListe=null,effetsCache={};
  function effetDefinition(id) { var liste=effetsDefinitions();if(liste!==effetsCacheListe){effetsCacheListe=liste;effetsCache=Object.create(null);liste.forEach(function(d){effetsCache[d.id]=d;});}return effetsCache[id] || null; }
  function effetsNormalise(s) {
    var ids = {};
    s.effetsActifs = (Array.isArray(s.effetsActifs) ? s.effetsActifs : []).filter(function (e) { return e && typeof e === "object" && e.effet; }).map(function (e) {
      var id = String(e.id || uid("eff")); if (ids[id]) id = uid("eff"); ids[id] = true;
      return { categorie: e.categorie === "digestive" ? "digestive" : "speciale", id: id, effet: String(e.effet), source: String(e.source || ""), cible: String(e.cible || ""),
        actif: e.actif !== false, reste: e.reste == null ? null : Math.max(0, num(e.reste, 0)),
        duree: e.duree == null ? null : Math.max(0, num(e.duree, 0)), suivi: Math.max(0, num(e.suivi, 0)),
        niveau: clamp(Math.floor(num(e.niveau, 1)), 1, 4) };
    }).filter(function (e) { return e.reste === null || e.reste > 0; });
    var alcool = 0, progression = 0;
    s.effetsActifs = s.effetsActifs.filter(function (e) {
      var d = effetDefinition(e.effet); if (!d || !d.ops.alcool || !e.actif) return true;
      alcool += Math.max(0, num(d.ops.alcool, 0));
      progression = Math.max(progression, Math.max(0, num(e.duree, 7200) - num(e.reste, 7200)));
      return false;
    });
    if (alcool) {
      s.effAlcool = num(s.effAlcool, 0) + alcool;
      if (!horlogeVersSecondes(s.horlogeAlcool)) {
        progression %= alcoolCadenceSecondes();
        s.horlogeAlcool = {jours:0, heures:Math.floor(progression / 3600), minutes:Math.floor(progression % 3600 / 60), secondes:progression % 60};
      }
    }
    // Les anciennes récupérations alimentaires et de potion viennent du catalogue.
    s.effetsActifs.forEach(function (e) {
      if ((D().equipements || []).concat(D().consommables || []).some(function (o) { return o.nom === e.source && (o.effets || []).indexOf(e.effet) >= 0 && invEstIngerable(o); })) e.categorie = "digestive";
    });
    if (!s.effetsPermanents || typeof s.effetsPermanents !== "object" || Array.isArray(s.effetsPermanents)) s.effetsPermanents = {};
  }
  function effetsSources() {
    var out = [];
    (state.effetsActifs || []).forEach(function (e) {
      var d = effetDefinition(e.effet);
      if (d && e.actif && (e.reste === null || e.reste > 0)) out.push({ e: e, d: d });
    });
    // Les bonus d'équipement sont dérivés : aucune copie temporaire à sauvegarder.
    (state.inv && state.inv.objets || []).forEach(function (o) {
      // Les effets des consommables sont activés par leur consommation, jamais par leur port.
      if (invType(o) === "consommable") return;
      if (o.dans || pnum(o.qte)!==1 || !(o.ou === "mainG" || o.ou === "mainD" || (o.vet || o.acc || o.sac || o.ceint) && casePermise(o,o.ou) && casesDe(o).length)) return;
      (o.effets || []).forEach(function (id) { var d = effetDefinition(id); if (d) out.push({e:{niveau:1,cible:o.arme ? o.ref : "",equipement:o.ref,source:o.nom}, d:d}); });
    });
    // Même famille portée plusieurs fois : le rang le plus élevé gagne.
    var families = {};
    return out.filter(function (x) {
      if (x.d.ops.alerte || x.d.ops.alcool) return true;
      var key = x.d.famille + "|" + (x.e.cible || "");
      var best = out.filter(function (y) { return y.d.famille + "|" + (y.e.cible || "") === key; }).sort(function (a,b) { return num(b.d.rang,0)-num(a.d.rang,0); })[0];
      if (families[key] || best !== x) return false; families[key] = true; return true;
    });
  }
  function effetBonus(cle, type, cible) {
    var n = 0;
    equipementsBonus().forEach(function(o){var v=o.stats&&o.stats[cle];if(type!==undefined)v=v&&v[type];n+=num(v,0);});
    effetsSources().forEach(function (x) {
      if (x.e.cible && x.e.cible !== cible) return;
      var v = x.d.ops[cle]; if (type !== undefined) v = v && v[type]; n += num(v,0);
    });
    return n;
  }
  function effetAlerte() {
    return (state.effetsActifs || []).reduce(function (n,e) { var d=effetDefinition(e.effet); return d && d.ops.alerte && e.actif && (e.reste===null || e.reste>0) ? Math.max(n,e.niveau) : n; },0);
  }
  function effetConsommation(res) { return Math.max(0, 100 + effetBonus("couts",res) + (res === "pm" ? effSpecifiques().mana : 0)); }
  function effetCout(res, valeur) { return Math.max(0, Math.floor(Math.max(0, Number(valeur) || 0) * effetConsommation(res) / 100 + 1e-9)); }
  function effetPerteInnocence(delta) { return delta < 0 ? -Math.ceil(-delta * Math.max(0,1 - effetBonus("innocence")/100) - 1e-9) : delta; }
  function retireEffet(id) { state.effetsActifs = state.effetsActifs.filter(function (e) { return e.id !== id; }); }
  function effetCoupRecu() {
    state.effetsActifs = state.effetsActifs.filter(function (e) {
      var d=effetDefinition(e.effet); if (!d || !d.ops.alerte || !e.actif) return true;
      e.niveau--; return e.niveau > 0;
    });
  }
  function effetFinTour() {
    if (!(effetBonus("finTour") > 0)) return;
    for (var i=0;i<desAction();i++) if (state.desUtilises[i]) { delete state.desUtilises[i]; break; }
  }
  function appliqueEffet(id, source, cible, duree, categorie) {
    var d=effetDefinition(id); if (!d) return false;
    var op=d.ops || {}, actifs=state.effetsActifs;
    if (op.alcool) { state.effAlcool = Math.max(0, num(state.effAlcool, 0)) + Math.max(0, num(op.alcool, 0)); return true; }
    if (op.permanent) {
      if (!state.effetsPermanents[id]) {
        Object.keys(op.permanent).forEach(function(k){ if(state.etat[k]==null)state.etat[k]=maxDe(k); });
        state.effetsPermanents[id]=true;
      }
      return true;
    }
    if (op.supprime || op.panacee) {
      state.effetsActifs = actifs.filter(function(e){
        var def=effetDefinition(e.effet);
        return !(def && (op.panacee ? def.negatif && def.dissipable : op.supprime.indexOf(def.famille)>=0 || op.supprime.indexOf(def.id)>=0));
      }); return true;
    }
    if (op.impregnation && !(cible && defenseArme(cible))) return false;
    var meme=actifs.filter(function(e){var def=effetDefinition(e.effet);return def && def.famille===d.famille && (e.cible||"")===(cible||"");})[0];
    var seconds=duree === undefined ? d.duree : duree;
    if (op.alerte) {
      if (!meme) { meme={id:uid("eff"),effet:id,cible:"",niveau:0};actifs.push(meme); }
      meme.niveau=clamp(num(meme.niveau,0)+op.alerte,1,4);seconds=60;
    } else if (meme && !op.alcool) {
      var previous=effetDefinition(meme.effet);if(previous && num(previous.rang,0)>num(d.rang,0))return true;
    } else { meme={id:uid("eff"),niveau:1};actifs.push(meme); }
    meme.categorie=categorie === "digestive" ? "digestive" : "speciale";meme.effet=id;meme.source=String(source||"");meme.cible=String(cible||"");meme.actif=true;
    meme.reste=seconds;meme.duree=seconds;meme.suivi=0;return true;
  }
  function effetsAvance(secondes) {
    var efficaces=Object.create(null);effetsSources().forEach(function(x){if(x.e.id)efficaces[x.e.id]=true;});
    (state.effetsActifs || []).forEach(function(e){
      if(!e.actif)return;
      var d=effetDefinition(e.effet),r=d && efficaces[e.id] && d.ops.regen,sec=e.reste===null?secondes:Math.min(secondes,e.reste);
      if(r && sec>0) {
        if(courant(r.reserve)>=maxDe(r.reserve))e.suivi=0;
        else {e.suivi+=sec;var ticks=Math.floor((e.suivi+1e-9)/r.cadence);e.suivi-=ticks*r.cadence;if(ticks)bougeReserve(r.reserve,ticks*r.points);}
      }
      if(e.reste!==null)e.reste=Math.max(0,e.reste-secondes);
    });
    state.effetsActifs=state.effetsActifs.filter(function(e){return e.reste===null || e.reste>0;});
  }
  function effetTemps(secondes) {
    if(secondes===null)return "—";
    secondes=Math.max(0,Math.ceil(secondes));var j=Math.floor(secondes/86400),h=Math.floor(secondes%86400/3600),m=Math.floor(secondes%3600/60),s=secondes%60;
    return [j?j+" j":"",h?h+" h":"",m?m+" min":"",s?s+" s":""].filter(Boolean).join(" ") || "0 s";
  }
  function selectEffet(value, change) {
    var s=el("select","pc-select pc-edit-field"),empty=el("option",null,"Aucun");empty.value="";s.appendChild(empty);
    effetsDefinitions().forEach(function(d){var o=el("option",null,d.nom);o.value=d.id;o.selected=d.id===value;s.appendChild(o);});
    if(value && !effetDefinition(value)){var o=el("option",null,value+" (inconnu)");o.value=value;o.selected=true;s.appendChild(o);}
    s.addEventListener("change",function(){change(s.value);});return s;
  }
  function buildEffets() {
    var b=block("Effets",null,"effets"),box=el("div","pc-effets-liste");b.appendChild(box);
    var add=miniBtn("+ Ajouter un effet",null,function(){
      var body=el("div","pc-modal-body"),id="",temps=el("input","pc-edit-field"),armes=el("select","pc-select");
      temps.type="text";temps.inputMode="decimal";temps.placeholder="Durée du référentiel";
      var select=selectEffet("",function(v){id=v;var d=effetDefinition(id);temps.placeholder=d?d.dureeTexte:"Durée du référentiel";});
      body.appendChild(fld("Effet",select));body.appendChild(fld("Durée en minutes (facultatif)",temps));
      var none=el("option",null,"Personnage");none.value="";armes.appendChild(none);
      state.inv.objets.filter(function(o){return o.arme;}).forEach(function(o){var p=el("option",null,o.nom||"Arme");p.value=o.ref;armes.appendChild(p);});
      body.appendChild(fld("Cible",armes));
      dialogue("Ajouter un effet",body,function(){
        if(!id)return false;
        var n=temps.value.trim()?litNombreSigne(temps.value):null;if(n!==null && (!isFinite(n)||n<=0))return false;
        if(!appliqueEffet(id,"Manuel",armes.value,n===null?undefined:n*60)){flash("Choisissez l’arme à imprégner.");return false;}refresh();
      },"Appliquer");
    });b.appendChild(add);
    var cost=el("div","pc-obj-pair"),n=el("input","pc-num");champNombreSigne(n);n.placeholder="Coût de base";n.setAttribute("aria-label","Coût en ressource avant effets");cost.appendChild(n);
    var cs=el("div","pc-segs");["pm","pe"].forEach(function(k){cs.appendChild(miniBtn("Consommer "+k.toUpperCase(),null,function(){var v=litNombreSigne(n.value);if(!isFinite(v)||v<0)return;bougeReserve(k,-effetCout(k,v));n.value="";refresh();}));});cost.appendChild(cs);b.appendChild(cost);
    var sig="";
    hooks.push(function(){
      var passifs=effetsSources().filter(function(x){return x.e.equipement;});
      var now=JSON.stringify([state.effetsActifs,state.effetsPermanents,effetAlerte(),passifs]);if(now===sig)return;sig=now;box.innerHTML="";
      (state.effetsActifs||[]).forEach(function(e){
        var d=effetDefinition(e.effet),row=el("div","pc-effet-row");row.dataset.syncEntity=e.id;
        var head=el("div","pc-effet-head"),name=el("span","pc-effet-nom",d&&d.ops.alerte?"Alerte — "+e.niveau:(d?d.nom:e.effet));head.appendChild(name);
        head.appendChild(el("span","pc-effet-temps",effetTemps(e.reste)));row.appendChild(head);
        var texte=d?d.description:"Effet inconnu : gestion manuelle.";
        if(d&&d.ops.alerte)texte="−"+e.niveau+" difficulté d’Esquive ; −"+(5*e.niveau)+" % de résistance aux dégâts. Un coup reçu retire un niveau.";
        var desc=el("div","pc-effet-desc",texte);row.appendChild(desc);
        if(d&&d.manuel)row.appendChild(el("small","pc-effet-manuel","Conséquences manuelles"));
        var actions=el("div","pc-segs");actions.appendChild(miniBtn(e.actif?"Pauser":"Reprendre",null,function(){e.actif=!e.actif;if(d && d.ops.alcool && e.actif)effetsNormalise(state);refresh();}));
        if(d&&d.ops.alerte)actions.appendChild(miniBtn("Coup reçu", "Retirer un niveau d’Alerte",function(){effetCoupRecu();refresh();}));
        actions.appendChild(miniBtn("Retirer",null,function(){retireEffet(e.id);refresh();}));row.appendChild(actions);box.appendChild(row);
      });
      passifs.forEach(function(x){var row=el("div","pc-effet-row"),head=el("div","pc-effet-head");head.appendChild(el("span","pc-effet-nom",x.d.nom));head.appendChild(el("span","pc-effet-temps","Équipé"));row.appendChild(head);row.appendChild(el("div","pc-effet-desc",x.d.description));row.title=x.e.source;box.appendChild(row);});
      Object.keys(state.effetsPermanents||{}).forEach(function(id){if(state.effetsPermanents[id])box.appendChild(el("div","pc-effet-row",id+" — Permanent"));});
      if(!box.childNodes.length)box.appendChild(el("div","pc-empty","Aucun effet actif."));
    });return b;
  }
  // ---- Temps ----
  // L'effort que fournit le personnage et l'air qu'il respire, puis le geste
  // qui fait passer l'horloge interne : round (3 s), minute ou heure. Le moteur
  // temporel s'occupe ensuite des récupérations, de la survie et de l'exposition.
  // UN NOMBRE NÉGATIF FAIT RECULER LE TEMPS : c'est le rattrapage
  // d'une erreur de saisie. Aucune règle n'est écrite ici : les efforts, les
  // taux et les paliers viennent des données.
  // l'affichage d'un effort dont le nom ne tient pas dans sa case
  var EFFORT_COURT = { intermediaire: "Inter" };
  function buildEffort() {
    var b = block("Effort et Temps");

    // LES EFFORTS, en cases soudées comme le trio de MIA, sur deux lignes
    // arrêtées par l'auteur : [sommeil | repos], puis [léger | intermédiaire |
    // lourd]. Les deux premiers efforts des règles font la première ligne.
    var boutons = [];
    var liste = effortsListe();
    [liste.slice(0, 2), liste.slice(2)].forEach(function (rang) {
      if (!rang.length) return;
      var bloc = el("div", "pc-segs");
      rang.forEach(function (e) {
        // l'étiquette courte voulue par l'auteur ; le nom entier au survol
        var bt = el("button", "c", EFFORT_COURT[e.cle] || e.nom);
        bt.title = e.nom;
        bt.type = "button";
        bt.addEventListener("click", function () {
          if (state.effort !== e.cle) { state.effort = e.cle; recupSynchroniseSuivi(); }
          refresh();
        });
        bloc.appendChild(bt);
        boutons.push([bt, e.cle]);
      });
      b.appendChild(bloc);
    });

    // QUALITÉ DU SOMMEIL : comme les crans « Foncer » de Mouvement, une
    // seule ligne segmentée, visible uniquement lorsque Sommeil est choisi.
    var qualites = tempsDef() && Array.isArray(tempsDef().qualitesSommeil) ? tempsDef().qualitesSommeil : [];
    var sommeilQualite = el("div", "pc-segs pc-crans pc-sommeil-qualite");
    var boutonsQualite = [];
    qualites.forEach(function (q) {
      var bt = el("button", "c", (q.mod > 0 ? "+" : "") + q.mod);
      bt.type = "button";
      bt.title = q.nom + (num(q.mod, 0) ? " (" + (q.mod > 0 ? "+" : "") + q.mod + " niveaux)" : " (niveau normal)");
      bt.addEventListener("click", function () {
        if (state.qualiteSommeil !== q.cle) { state.qualiteSommeil = q.cle; recupSynchroniseSuivi(); }
        refresh();
      });
      sommeilQualite.appendChild(bt);
      boutonsQualite.push([bt, q.cle]);
    });
    sommeilQualite.style.display = (state.effort === "sommeil" && qualites.length) ? "" : "none";
    b.appendChild(sommeilQualite);

    var air = el("div", "pc-crow-bot pc-effort-temperature");
    air.appendChild(el("span", "lbl", "Température"));
    air.appendChild(stepper(
      function () { return num(state.temperature, 0); },
      function (v) { state.temperature = clamp(Math.round(v * 10) / 10, -999, 999); },
      1, "°C"));
    b.appendChild(air);

    // TROIS GESTES, tous branchés sur la même horloge à la seconde.
    function geste(unite, secondesParUnite, etiquette) {
      var cmd = el("div", "pc-segs pc-temps-segs");
      var nb = el("input", "c pc-temps-val");
      champNombreSigne(nb); nb.step = "1";
      nb.placeholder = "±";
      nb.setAttribute("aria-label", etiquette);
      function applique() {
        var n = Math.trunc(litNombreSigne(nb.value));
        if (!isFinite(n) || !n) return;
        var sec = avancerSecondes(n * secondesParUnite);
        nb.value = "";
        refresh();
        if (!sec) return;
        var abs = Math.abs(sec), texte;
        if (abs % 3600 === 0) texte = (abs / 3600) + " h";
        else if (abs % 60 === 0) texte = (abs / 60) + " m";
        else if (abs % 3 === 0) texte = (abs / 3) + " r";
        else texte = abs + " s";
        flash(texte + (sec > 0 ? " écoulé" : " reculé") + (abs > secondesParUnite ? "s." : "."));
      }
      nb.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); applique(); }
      });
      cmd.appendChild(nb);
      cmd.appendChild(el("span", "c pc-temps-unite", unite));
      var appliquer = el("button", "c pc-temps-appliquer", "Appliquer");
      appliquer.type = "button";
      appliquer.title = "Faire passer ce temps";
      appliquer.addEventListener("click", applique);
      cmd.appendChild(appliquer);
      b.appendChild(cmd);
    }
    geste("1 r", 3, "Rounds de 3 secondes, en plus ou en moins");
    geste("1 m", 60, "Minutes, en plus ou en moins");
    geste("1 h", 3600, "Heures, en plus ou en moins");

    hooks.push(function () {
      boutons.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.effort); });
      sommeilQualite.style.display = (state.effort === "sommeil" && qualites.length) ? "" : "none";
      boutonsQualite.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.qualiteSommeil); });
    });
    return b;
  }
  // ---- 4. Les trois réserves : PV, PE, PM ----
  // TROIS MODULES ET NON UN BLOC. Les réserves ont la même forme, mais on ne
  // les lit pas au même moment — les PV quand on encaisse, les PE quand on
  // force, les PM quand on lance — et elles se déplacent ou se coupent l'une
  // sans l'autre. Même gréement que les réserves de la fiche MIA :
  //
  //     ┌───────────────────────────────┐
  //     │ PV                   40 / 119 │  ← BANDEAU : l'identité et la valeur
  //     ├───────────────────────────────┤
  //     │ ███████                       │  ← la réserve, barre PLEINE
  //     │  [   ±   ]      [Appliquer]  │  ← le geste du jeu
  //     └───────────────────────────────┘
  //
  //   — on TAPE la variation (13 comme −7) et le bouton l'applique d'un coup ;
  //     Entrée vaut le bouton, et le champ se vide pour qu'un second appui
  //     n'applique pas deux fois le même nombre ;
  //   — vider la valeur du bandeau remet la réserve AU MAXIMUM (null dans
  //     l'état), qui la fait alors suivre le maximum quand il bouge ;
  //   — sous zéro, le bandeau entier passe au rouge.
  //
  // AUCUN ROUAGE : tout ce que le module porte se JOUE. Le maximum se construit
  // dans l'onglet Options (Réglages des capacités), avec la chaîne de leviers
  // de toute la fiche.

  // Le signe moins TYPOGRAPHIQUE, comme dans sign() : à cette taille le trait
  // d'union du clavier passe pour une césure.
  function reserveFmt(n) { return n < 0 ? "−" + fmtP(-n) : fmtP(n); }

  // Rend { el, etat } : UNE réserve (bandeau, barre, geste), et la pastille
  // d'état que l'appelant remplit lui-même. La CARTE qui la porte est à part
  // (carteVitale) : PV, PE et PM en ont une chacun, PR, PS et PH en partagent
  // une.
  function carteVitale() { return el("div", "pc-block pc-vital"); }
  // `nom` remplace le sigle des règles dans le bandeau, quand la fiche en
  // veut un autre (Repos plutôt que PR) ; la clé, elle, pose la TEINTE de la
  // réserve (classe t-<clé>, couleurs dans la feuille de style).
  function reserveVitale(cle, provenance, nomAffiche) {
    var nom = nomAffiche || abbrCap(cle, cle.toUpperCase());
    var box = el("div", "pc-vital-res t-" + cle);

    var tete = el("div", "pc-vital-tete");
    var n = el("span", "pc-vital-nom", nom);
    n.title = libCap(cle, cle);
    tete.appendChild(n);
    var etat = el("span", "pc-vital-etat", "");
    tete.appendChild(etat);
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
    inp.dataset.syncReserve=cle;
    champNombreSigne(inp);
    inp.step = "1";
    inp.setAttribute("aria-label", libCap(cle, nom));
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      if(window.__owdReserveSet)window.__owdReserveSet(cle);
      state.etat[cle] = isFinite(v) ? Math.round(v * 100) / 100 : null;
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    box.appendChild(tete);

    var jauge = el("span", "pc-vital-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    for (var palier = 1; ["pr", "ps", "ph", "pi"].indexOf(cle) >= 0 && palier < 10; palier++) {
      var trait = el("span", "pc-vital-palier");
      trait.style.left = (palier * 10) + "%";
      trait.setAttribute("aria-hidden", "true");
      jauge.appendChild(trait);
    }
    box.appendChild(jauge);

    var cmd = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    champNombreSigne(delta);
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", libCap(cle, nom) + " à ajouter ou retirer");
    function appliqueDelta() {
      var d = litNombreSigne(delta.value);
      if (!isFinite(d) || !d) return;
      if (cle === "pi") d = effetPerteInnocence(d);
      if (d < 0 && /^(pv|pe|pm)$/.test(cle)) d = -effetCout(cle, -d);
      state.etat[cle] = Math.round((courant(cle) + d) * 100) / 100;
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); appliqueDelta(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", appliqueDelta));
    box.appendChild(cmd);
    var consommation = /^(pv|pe|pm)$/.test(cle) ? el("div", "pc-vital-consommation") : null;
    if (consommation) box.appendChild(consommation);

    hooks.push(function () {
      if (consommation) consommation.textContent = "Consommation " + cle.toUpperCase() + " : " + fmtP(effetConsommation(cle)) + " %";
      var v = courant(cle), m = maxDe(cle);
      if (document.activeElement !== inp) inp.value = v;
      // un <input> ROGNE au lieu de déborder : sa largeur suit le nombre de
      // signes (les chiffres sont à chasse fixe)
      inp.style.width = Math.max(3.4, String(inp.value).length + 0.3) + "ch";
      mx.textContent = "/ " + fmtP(m);
      // l'accent dit un maximum réglé par un levier, ou une valeur au-dessus
      var forcee = capForce(cle), depasse = v > m;
      mx.classList.toggle("adj", forcee || depasse);
      mx.title = forcee ? chaineTexteDe(lireCap("max", cle), "calculé", autoDe(cle)) : provenance();
      // SOUS ZÉRO, la barre part de la droite et le bandeau passe au rouge
      var neg = v < 0;
      box.classList.toggle("over", neg);
      fill.classList.toggle("over", neg);
      fill.style.marginLeft = neg ? "auto" : "0";
      var pourcent = clamp(neg ? 100 : (m > 0 ? v / m * 100 : 0), 0, 100);
      fill.style.width = pourcent + "%";
      jauge.querySelectorAll(".pc-vital-palier").forEach(function (trait) {
        trait.classList.toggle("plein", parseFloat(trait.style.left) <= pourcent);
      });
      jauge.title = nom + " " + reserveFmt(v) + " / " + fmtP(m);
    });
    return { el: box, etat: etat };
  }
  // L'effondrement descend le maximum de PV et de PE : l'infobulle le dit, ou
  // le chiffre paraît faux au joueur qui vérifie la formule de tête.
  function provenanceEff(cle, champ) {
    return function () {
      var t = provenanceCap(cle)();
      var e = effondrement();
      if (e > 0) t += " · effondrement " + e + " (−" + (num(effDef()[champ], 0) * e) + " %)";
      return t;
    };
  }
  function seule(r) { var c = carteVitale(); c.appendChild(r.el); return c; }
  function buildPv() {
    return seule(reserveVitale("pv", provenanceEff("pv", "pvParNiveau")));
  }
  function buildPe() {
    var r = reserveVitale("pe", provenanceEff("pe", "peParNiveau"));
    // un ÉTAT du personnage, le même que dit l'avertissement de l'en-tête
    hooks.push(function () { r.etat.textContent = peMax() <= 0 ? "Inconscient" : ""; });
    return seule(r);
  }
  // LES POINTS D'INNOCENCE, même module que les PV. Ils ne remontent pas au
  // repos, mais cela ne change rien au geste : on y tape ce qui se perd ou se
  // regagne.
  function buildPi() {
    return seule(reserveVitale("pi", provenanceCap("pi"), "Innocence"));
  }
  // LES POINTS DE CHANCE, même module que les PV : un compteur qui se dépense
  // et se regagne, et dont le maximum vient de la Chance comme les autres
  // viennent de leur caractéristique.
  function buildPc() {
    return seule(reserveVitale("pc", provenanceCap("pc")));
  }
  function buildPm() {
    return seule(reserveVitale("pm", function () { return "Maximum calculé : " + fmtP(autoDe("pm")); }));
  }
  // ---- 5. Survie : PR, PS, PH ----
  // LE GRÉEMENT DES RÉSERVES VITALES (vitales.js), mais les trois dans UNE
  // carte : repos, satiété et hydratation se lisent ensemble, au campement,
  // et ne se déplacent pas l'une sans l'autre. Aucun rouage : leurs maximums
  // se règlent dans l'onglet Options, comme ceux des PV.
  // Les bandeaux disent le mot entier, et non le sigle des règles : la carte
  // n'a que ces trois-là, ils y tiennent.
  function buildSurvie() {
    var b = carteVitale();
    [["pr", "Repos"], ["ps", "Satiété"], ["ph", "Hydratation"]].forEach(function (x) {
      b.appendChild(reserveVitale(x[0], provenanceCap(x[0]), x[1]).el);
    });
    var pied = el("div", "pc-comp-tools pc-vital-pied");
    var ligne = el("div", "row");
    ligne.appendChild(chatBtn(
      function () { return "Survie — " + (state.name || "sans nom"); },
      function () {
        return [
          [abbrCap("pr", "PR"), fmtP(courant("pr")) + " / " + fmtP(prMax())],
          [abbrCap("ps", "PS"), fmtP(courant("ps")) + " / " + fmtP(psMax())],
          [abbrCap("ph", "PH"), fmtP(courant("ph")) + " / " + fmtP(phMax())],
          ["Effondrement", String(effondrement())]
        ];
      }));
    pied.appendChild(ligne);
    b.appendChild(pied);
    return b;
  }
  // ---- 6. Exposition ----
  // Zéro vide ; chaud depuis la gauche, froid depuis la droite, sur toute la largeur.
  function buildExposition() {
    var box = el("div", "pc-block pc-vital");
    var res = el("div", "pc-vital-res pc-expo-res");

    var tete = el("div", "pc-vital-tete");
    var nom = el("span", "pc-vital-nom", "Exposition");
    tete.appendChild(nom);
    var val = el("span", "pc-vital-val");
    var inp = el("input", "pc-vital-num");
    champNombreSigne(inp);
    inp.step = "1";
    inp.setAttribute("aria-label", "Exposition");
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      state.etat.expo = isFinite(v) ? Math.round(v * 100) / 100 : 0;
      refresh();
    });
    val.appendChild(inp);
    var mx = el("span", "pc-vital-max", "");
    val.appendChild(mx);
    tete.appendChild(val);
    res.appendChild(tete);

    // Même échelle de 0 à 100 % pour chaque sens de remplissage.
    var jauge = el("span", "pc-vital-jauge pc-expo-jauge");
    var fill = el("i");
    jauge.appendChild(fill);
    for (var palier = 1; palier < 10; palier++) {
      var trait = el("span", "pc-vital-palier");
      trait.style.left = (palier * 10) + "%";
      trait.setAttribute("aria-hidden", "true"); jauge.appendChild(trait);
    }
    res.appendChild(jauge);

    // LA ZONE IDÉALE (en température de l'air, selon l'effort du module
    // Effort et Temps) et l'INTENSITÉ de froid ou de chaud qu'il subit
    var stat = el("div", "pc-stat pc-expo-stat");
    function caseStat(k) {
      var c = el("div", "c"), v = el("span", "v", "");
      c.appendChild(v);
      c.appendChild(el("span", "k", k));
      stat.appendChild(c);
      return v;
    }
    var vZone = caseStat("idéal °C"), vInt = caseStat("intensité"), vRes = caseStat("résorption");
    vRes.setAttribute("aria-label", "Prochaine résorption naturelle");
    vRes.title = "Points de résorption naturelle à la prochaine tranche favorable complète";

    var cmd = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    champNombreSigne(delta);
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", "Exposition à ajouter ou retirer");
    function applique() {
      var d = litNombreSigne(delta.value);
      if (!isFinite(d) || !d) return;
      var m = expoMax();
      state.etat.expo = Math.round(clamp(num(state.etat.expo, 0) + d, -m, m) * 100) / 100;
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applique(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", applique));
    res.appendChild(cmd);
    // sous le geste : la barre, puis [± Appliquer], puis la zone et l'intensité
    res.appendChild(stat);
    box.appendChild(res);

    hooks.push(function () {
      var m = expoMax(), v = num(state.etat.expo, 0);
      if (document.activeElement !== inp) inp.value = v;
      inp.style.width = Math.max(3.4, String(inp.value).length + 0.3) + "ch";
      mx.textContent = "/ ±" + fmtP(m);
      mx.classList.toggle("adj", capForce("expo") || Math.abs(v) > m);
      mx.title = capForce("expo")
        ? chaineTexteDe(lireCap("max", "expo"), "calculé", expoMaxAuto())
        : provenanceCap("expo")();
      var part = m > 0 ? clamp(Math.abs(v) / m, 0, 1) * 100 : 0;
      fill.className = v < 0 ? "froid" : v > 0 ? "chaud" : "";
      fill.style.left = (v < 0 ? 100 - part : 0) + "%";
      fill.style.width = part + "%";
      jauge.querySelectorAll(".pc-vital-palier").forEach(function (trait) {
        var position = parseFloat(trait.style.left);
        trait.classList.toggle("plein", part > 0 && (v < 0 ? position >= 100 - part : position <= part));
      });
      var z = zoneIdeale();
      // le VRAI moins, comme au livre : « −5 à 7 »
      function deg(n) { return fmtP(n).replace("-", "−"); }
      vZone.textContent = z ? deg(z.bas) + " à " + deg(z.haut) : "—";
      var p = paliersClimat();
      vInt.textContent = p < 0 ? "Froid " + (-p) : p > 0 ? "Chaud " + p : "Aucune";
      vInt.className = "v" + (p < 0 ? " froid" : p > 0 ? " chaud" : "");
      var t=tempsDef(), r=t&&t.resorption, active=r&&resorptionApplicable(v,p);
      vRes.textContent=active ? fmtP(Math.min(r.max,r.depart+Math.floor(secondesHorlogeProcessus("horlogeExposition")/(t.tranche*60))*r.increment)) : "—";
      jauge.title = "Exposition " + (v < 0 ? "−" + fmtP(-v) : fmtP(v)) + " sur ±" + fmtP(m) +
                    " · niveau d'effondrement " + effNiveauDe("expo");
    });
    return box;
  }
  // ---- Formulaires communs aux attaques et défenses ----
  function combatTexte(label, data, key) {
    var i = el("input", "pc-edit-field"); i.type = "text"; i.value = data[key] || "";
    i.addEventListener("input", function () { data[key] = i.value; save(); });
    i.addEventListener("change", function () { refresh(); });
    return fld(label, i);
  }
  function combatTypes() {
    return ["physique", "feu", "froid", "eclair", "decomposition", "ethere", "brut"];
  }
  function combatLibType(t) {
    return { eclair: "Éclair", decomposition: "Décomposition", ethere: "Éthéré" }[t] || capFirst(t);
  }
  function combatType(data, key) {
    var s = el("select", "pc-select pc-edit-field");
    combatTypes().forEach(function (t) { var o = el("option", null, combatLibType(t)); o.value = t;
      o.selected = t === data[key]; s.appendChild(o); });
    if (!data[key]) { var empty = el("option", null, "Choisir"); empty.value = ""; empty.selected = true; s.insertBefore(empty, s.firstChild); }
    s.addEventListener("change", function () { data[key] = s.value; refresh(); });
    return s;
  }
  function combatComp(data) {
    var s = el("select", "pc-select pc-edit-field"), vide = el("option", null, "Choisir une compétence"); vide.value = ""; s.appendChild(vide);
    state.comps.forEach(function (c) { var o = el("option", null, c.nom || "Sans nom"); o.value = c.id; o.selected = c.id === data.comp; s.appendChild(o); });
    s.addEventListener("change", function () { data.comp = s.value; refresh(); }); return s;
  }
  function combatRessource(data, cle, texte) {
    var on = !!data[cle], b = el("button", "pc-chip pc-combat-toggle" + (on ? " on" : ""), texte);
    b.type = "button"; b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", function () { data[cle] = !data[cle]; refresh(); }); return b;
  }
  function combatMod(k, t) { return snum(state.combatModifiers && state.combatModifiers[k] && state.combatModifiers[k][t]); }
  // État de dépliage purement visuel, comme les cartes d'attaque et de défense.
  // Aucun nouvel attribut de personnage n'est nécessaire.
  var combatModVue = { attaque: false, defense: false };
  function combatModificateurs(module, redessiner) {
    var attaque = module === "attaque", ouvert = !!combatModVue[module];
    var cleVisibilite = attaque ? "modificateursAttaque" : "modificateursDefense";
    var visible = state.combatAffichage[cleVisibilite] !== false;
    if (!visible && !isEdit(module)) return null;
    var titre = attaque ? "Modificateurs d’Attaque" : "Modificateurs de Défense";
    // Même cadre, même en-tête et même chevron que toutes les cartes de combat.
    var card = el("div", "pc-attaque-card pc-combat-modificateurs");
    card.dataset.combatModifiers = module;
    combatCarteTete(card, titre, "", ouvert, module, "modificateurs-" + module,
      function () { combatModVue[module] = !combatModVue[module]; redessiner(); }, null, {
        visible: visible,
        basculer: function () { state.combatAffichage[cleVisibilite] = !visible; refresh(); }
      });
    if (!ouvert) return card;

    // La présentation est celle des défenses pour LES DEUX modules, y compris
    // les alignements, la typographie et l'espacement de leurs tableaux.
    var detail = el("div", "pc-attaque-detail pc-defense-detail pc-combat-mod-detail");
    var table = el("table", "pc-defense-valeurs pc-combat-mod-table"), head = el("tr");
    (attaque ? ["Type", "Dégâts"] : ["Type", "Protection", "Résistance"]).forEach(function (s) {
      head.appendChild(el("th", null, s));
    });
    table.appendChild(head);
    combatTypes().forEach(function (t) {
      var row = el("tr"); row.dataset.damageType = t;
      row.appendChild(el("td", null, combatLibType(t)));
      (attaque ? ["attaques"] : ["protections", "resistances"]).forEach(function (k) {
        var td = el("td"), valeur = el("span", "pc-combat-mod-cell");
        var i = el("input", "pc-num");
        champNombreSigne(i); i.step = "any"; i.value = combatMod(k, t);
        i.setAttribute("aria-label", (k === "attaques" ? "Dégâts" : k === "protections" ? "Protection" : "Résistance") + " " + combatLibType(t));
        i.addEventListener("input", function () {
          var n = Number(i.value);
          if (isFinite(n)) { state.combatModifiers[k][t] = n; save(); }
        });
        i.addEventListener("change", function () { refresh(); });
        valeur.appendChild(i);
        if (k === "resistances") valeur.appendChild(el("span", "pc-combat-mod-pourcent", "%"));
        td.appendChild(valeur); row.appendChild(td);
      });
      table.appendChild(row);
    });
    detail.appendChild(table); card.appendChild(detail); return card;
  }
  function combatEndurance(data) { return combatRessource(data, "utiliseEndurance", "Consommer Endurance"); }
  // Protection d'abord, pourcentage ensuite ; arrondi une seule fois, à la fin.
  // Borner chaque étape empêche deux valeurs négatives de produire des dégâts.
  function combatDegats(d, p, r) {
    return Math.max(0, Math.floor(Math.max(0, d - p) * Math.max(0, 1 - r / 100) + 1e-9));
  }
  function defenseArme(ref) {
    return state.inv.objets.filter(function (o) { return o.arme && String(o.ref) === String(ref) &&
      window.OwdInventoryData.isCarried(state.inv.objets,o); })[0] || null;
  }
  function defenseValeurs(entree) {
    var item = entree && entree.arme ? defenseArme(entree.arme) : null;
    var a = entree && entree.personnalisee || item && item.arme;
    var flat = snum(a && a.reduction);
    (a && a.modsParade || []).slice(0, 3).forEach(function (c) { if (c) flat += Math.floor(caracTotal(c) / 5); });
    return { item: item, protection: flat, difficulte: Math.max(1, snum(a && a.parade) + effetBonus("parade")), comp: a && a.comp || "" };
  }
  function defenseTotaux(type, defense, reussie) {
    var p = 0, r = 0, portes = equipementsPortes().filter(function (o) { return pnum(o.qte) > 0; });
    portes.forEach(function (o) { p += snum(o["prot_" + type]); r += snum(o["res_" + type]); });
    if (defense && reussie) {
      var active = defense.protection;
      // Un objet hybride déjà porté n'est compté qu'une seule fois.
      if (defense.item && portes.indexOf(defense.item) < 0) {
        active += snum(defense.item["prot_" + type]); r += snum(defense.item["res_" + type]);
      }
      p += state.combatOptions && state.combatOptions.defenses.lente ? Math.floor(active / 2) : active;
    }
    p += combatMod("protections",type) + effetBonus("protections",type);
    r += combatMod("resistances",type) + effetBonus("resistances",type) - 5*effetAlerte();
    if(effetBonus("immunites",type)>=100)r=Math.max(100,r);
    return {protection:p,reduction:r};
  }
  function defensePrompt(nom, mode, entree, recus) {
    var body = el("div", "pc-modal-body pc-defense-form"), inputs = {};
    combatTypes().forEach(function (t) {
      var input = el("input", "n"); input.type = "text"; input.inputMode = "decimal";
      input.value = String(recus && recus[t] || 0); input.setAttribute("aria-label", "Dégâts " + combatLibType(t));
      inputs[t] = input; body.appendChild(fld(combatLibType(t), input));
    });
    dialogue(nom, body, function () {
      var valeurs = {}, invalide = null;
      combatTypes().forEach(function (t) {
        var raw = inputs[t].value.trim(), n = Number(raw.replace(",", "."));
        if (raw && (!isFinite(n) || n < 0)) invalide = inputs[t];
        valeurs[t] = raw ? n : 0;
      });
      if (invalide) { flash("Saisissez des dégâts positifs ou nuls."); invalide.focus(); return false; }
      if (mode === "parade" && entree.arme && !defenseArme(entree.arme)) { flash("Cette arme n’est plus disponible."); return false; }
      var v = defenseValeurs(entree), subis = 0, champs = [], finaux = [];
      combatTypes().forEach(function (t) {
        var brut = valeurs[t];
        if (!brut) return;
        var totaux = defenseTotaux(t, mode === "parade" ? v : null, true);
        var n = mode === "esquive" ? 0 : combatDegats(brut, totaux.protection, totaux.reduction);
        subis += n; finaux.push({type:t, valeur:n});
        champs.push(["Reçus · " + combatLibType(t), fmtP(brut)]);
        champs.push(["Protection · " + combatLibType(t), fmtP(totaux.protection)]);
        champs.push(["Résistance · " + combatLibType(t), fmtP(totaux.reduction) + " %"]);
        champs.push(["Subis · " + combatLibType(t), fmtP(n)]);
      });
      champs.push(["Dégâts subis", fmtP(subis)]);
      var cout = mode === "esquive" ? 8 : mode === "sans" ? 0 : v.difficulte;
      var difficulte = mode === "esquive" ? Math.max(1,8-effetAlerte()) : cout;
      var comp = compDe(mode === "esquive" ? entree.comp : v.comp);
      if (mode !== "sans") {
        champs.push(["Difficulté", fmtP(difficulte)]);
        if (comp) champs.push(["Compétence", comp.nom || "Compétence"]);
        if (state.combatOptions.defenses.utiliseEndurance && !state.combatOptions.defenses.lente) {
          state.etat.pe = Math.round((courant("pe") - effetCout("pe",cout)) * 100) / 100;
          champs.push(["Endurance", "−" + fmtP(effetCout("pe",cout))]);
        }
      }
      if (state.combatOptions.defenses.degatsAuto && subis > 0) state.etat.pv = Math.round((courant("pv") - subis) * 100) / 100;
      refresh(); sayChat(nom, champs, {kind:"defense", final:finaux, total:subis});
    }, "Valider");
  }
  function defenseDepuisChat(payload) {
    var data;
    try { if (typeof payload !== "string" || payload.length > 16000) return; data = JSON.parse(b64decode(payload)); } catch (e) { return; }
    if (!data || data.v !== 1 || data.kind !== "attack") return;
    function valide(liste) {
      var vus = {};
      return Array.isArray(liste) && liste.length <= 7 && liste.every(function (d) {
        if (!d || combatTypes().indexOf(d.type) < 0 || vus[d.type] || typeof d.valeur !== "number" || !isFinite(d.valeur) || d.valeur < 0) return false;
        vus[d.type] = true; return true;
      });
    }
    if (!valide(data.hit) || !valide(data.pass)) return;
    var body = el("div", "pc-modal-body"), zone = el("select", "pc-select"), choix = el("select", "pc-select");
    [["hit", "Touche"], ["pass", "Passe"]].forEach(function (a) { var op = el("option", null, a[1]); op.value = a[0]; zone.appendChild(op); });
    zone.setAttribute("aria-label", "Dégâts à défendre");
    var defenses = [{nom:"Sans Défense", mode:"sans", entree:null}, {nom:"Esquive", mode:"esquive", entree:state.defenses.esquive}];
    state.defenses.entrees.forEach(function (e) {
      var item = defenseArme(e.arme);
      if (!e.personnalisee && !item) return;
      defenses.push({nom:e.nom || (item ? "Parade — " + item.nom : "Défense personnalisée"), mode:"parade", entree:e});
    });
    defenses.forEach(function (d, i) { var op = el("option", null, d.nom); op.value = String(i); choix.appendChild(op); });
    choix.setAttribute("aria-label", "Défense");
    body.appendChild(fld("Dégâts à défendre", zone)); body.appendChild(fld("Défense", choix));
    dialogue("Se défendre — " + (state.name || "Sans nom"), body, function () {
      var d = defenses[Number(choix.value)], recus = {};
      if (!d) return false;
      data[zone.value === "pass" ? "pass" : "hit"].forEach(function (x) { recus[x.type] = x.valeur; });
      // Le premier dialogue doit être fermé avant de monter le formulaire.
      setTimeout(function () { defensePrompt(d.nom, d.mode, d.entree, recus); }, 0);
    }, "Continuer");
  }
  var combatDrag = null;
  function combatOeil(visible) {
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    var forme = document.createElementNS(ns, "path");
    forme.setAttribute("d", "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"); svg.appendChild(forme);
    if (visible) {
      var pupille = document.createElementNS(ns, "circle");
      pupille.setAttribute("cx", "12"); pupille.setAttribute("cy", "12"); pupille.setAttribute("r", "3"); svg.appendChild(pupille);
    } else {
      var barre = document.createElementNS(ns, "path");
      barre.setAttribute("d", "M3 3 21 21"); svg.appendChild(barre);
    }
    return svg;
  }
  function combatCarteTete(card, nom, resume, ouvert, module, id, toggle, liste, visibilite) {
    var ligne = el("div", "pc-combat-tete");
    var tete = el("button", "pc-attaque-tete" + (module === "defense" ? " pc-defense-tete" : "")); tete.type = "button";
    tete.setAttribute("aria-expanded", String(ouvert));
    tete.appendChild(el("span", "pc-attaque-nom", nom)); tete.appendChild(el("span", "pc-attaque-meta", resume));
    tete.addEventListener("click", toggle); ligne.appendChild(tete);
    var outils = el("div", "pc-combat-outils");
    if (liste) {
      var drag = el("span", "pc-combat-poignee pc-combat-drag pc-edit-only", "⠿"); drag.title = "Déplacer"; drag.setAttribute("aria-label", "Déplacer " + nom); drag.draggable = true;
      drag.addEventListener("dragstart", function (ev) {
        if (!isEdit(module)) { ev.preventDefault(); return; }
        combatDrag = { module: module, id: id }; ev.dataTransfer.setData("text/plain", id); ev.dataTransfer.effectAllowed = "move"; card.classList.add("pc-combat-pris");
      });
      drag.addEventListener("dragend", function () { combatDrag = null; card.classList.remove("pc-combat-pris"); }); outils.appendChild(drag);
      card.addEventListener("dragover", function (ev) {
        if (!isEdit(module) || !combatDrag || combatDrag.module !== module || combatDrag.id === id) return;
        ev.preventDefault(); ev.dataTransfer.dropEffect = "move";
        card.classList.add("pc-combat-depot");
      });
      card.addEventListener("dragleave", function () { card.classList.remove("pc-combat-depot"); });
      card.addEventListener("drop", function (ev) {
        if (!isEdit(module) || !combatDrag || combatDrag.module !== module || combatDrag.id === id) return;
        ev.preventDefault(); var items = liste(), from = items.findIndex(function (e) { return e.id === combatDrag.id; });
        if (from < 0) return;
        var avant = ev.clientY < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
        var moved = items.splice(from, 1)[0], to = items.findIndex(function (e) { return e.id === id; });
        items.splice(to + (avant ? 0 : 1), 0, moved); combatDrag = null; refresh();
      });
    } else if (visibilite) {
      var oeil = el("button", "pc-combat-poignee pc-combat-oeil pc-edit-only"); oeil.type = "button";
      oeil.title = visibilite.visible ? "Masquer hors du mode édition" : "Afficher hors du mode édition";
      oeil.setAttribute("aria-label", oeil.title); oeil.setAttribute("aria-pressed", String(visibilite.visible));
      oeil.appendChild(combatOeil(visibilite.visible));
      oeil.addEventListener("click", function (ev) { ev.stopPropagation(); visibilite.basculer(); });
      outils.appendChild(oeil);
    }
    var ouvrir = el("button", "pc-attaque-chevron pc-combat-ouvrir", ouvert ? "▾" : "▸"); ouvrir.type = "button"; ouvrir.title = ouvert ? "Réduire" : "Agrandir"; ouvrir.addEventListener("click", toggle);
    ouvrir.setAttribute("aria-label", ouvert ? "Réduire" : "Agrandir"); ouvrir.setAttribute("aria-expanded", String(ouvert)); outils.appendChild(ouvrir);
    ligne.appendChild(outils); card.appendChild(ligne);
  }
  function combatSupprimer(card, action) {
    var pied = el("div", "pc-combat-pied pc-edit-only"); pied.appendChild(miniBtn("Supprimer", null, action, "danger")); card.appendChild(pied);
  }
  var defenseVue = { ouverts: Object.create(null) };
  function buildDefense() {
    var b = block("Défenses", null, "defense", rendre), box = el("div", "pc-attaques pc-defenses"); b.appendChild(box);
    function bouton(nom, mode, entree) {
      var btn = el("button", "pc-attaque-simple pc-defense-bouton"); btn.type = "button";
      btn.appendChild(el("strong", null, "Se défendre"));
      btn.addEventListener("click", function () { defensePrompt(nom, mode, entree); }); return btn;
    }
    function details(card, nom, mode, entree, id) {
      var ouvert = !!defenseVue.ouverts[id], v = defenseValeurs(entree);
      var valeur = state.combatOptions.defenses.lente ? Math.floor(v.protection / 2) : v.protection;
      var cleVisibilite = mode === "sans" ? "defenseSans" : mode === "esquive" ? "defenseEsquive" : "";
      var visible = !cleVisibilite || state.combatAffichage[cleVisibilite] !== false;
      combatCarteTete(card, nom, mode === "sans" ? "" : mode === "esquive" ? "Difficulté "+Math.max(1,8-effetAlerte()) : "Difficulté " + fmtP(v.difficulte) + " · Protection " + sign(valeur), ouvert, "defense", id,
        function () { defenseVue.ouverts[id] = !defenseVue.ouverts[id]; rendre(); }, mode === "parade" ? function () { return state.defenses.entrees; } : null,
        cleVisibilite ? { visible: visible, basculer: function () { state.combatAffichage[cleVisibilite] = !visible; refresh(); } } : null);
      if (!ouvert) return;
      var detail = el("div", "pc-attaque-detail pc-defense-detail");
      var comp = compDe(mode === "esquive" ? entree.comp : v.comp);
      if (comp) detail.appendChild(el("div", "pc-attaque-meta", comp.nom || "Compétence"));
      var table = el("table", "pc-defense-valeurs"), head = el("tr");
      ["Type", "Protection", "Résistance"].forEach(function (s) { head.appendChild(el("th", null, s)); }); table.appendChild(head);
      combatTypes().forEach(function (t) {
        var totaux = defenseTotaux(t, mode === "parade" ? v : null, true);
        if (totaux.protection === 0 && totaux.reduction === 0) return;
        var row = el("tr"); row.dataset.damageType = t;
        row.appendChild(el("td", null, combatLibType(t)));
        row.appendChild(el("td", "pc-defense-protection", (totaux.protection !== 0 ? fmtP(totaux.protection) : "")));
        row.appendChild(el("td", "pc-defense-resistance", (totaux.reduction !== 0 ? fmtP(totaux.reduction) + " %" : ""))); table.appendChild(row);
      });
      if (table.querySelector("td")) detail.appendChild(table); detail.appendChild(bouton(nom, mode, entree)); card.appendChild(detail);
    }
    function rendre() {
      box.innerHTML = "";
      var ressources = el("div", "pc-attaque-ressources pc-combat-ressources");
      ressources.appendChild(combatRessource(state.combatOptions.defenses, "lente", "Défense Lente"));
      ressources.appendChild(combatEndurance(state.combatOptions.defenses));
      var degatsAuto = combatRessource(state.combatOptions.defenses, "degatsAuto", "Dégâts Automatique");
      degatsAuto.title = "Déduire automatiquement les dégâts finaux des PV après validation d’une défense";
      ressources.appendChild(degatsAuto); box.appendChild(ressources);
      var sans = el("div", "pc-attaque-card"); sans.dataset.defenseId = "sans";
      if (isEdit("defense") || state.combatAffichage.defenseSans !== false) { details(sans, "Sans Défense", "sans", null, "sans"); box.appendChild(sans); }
      var es = el("div", "pc-attaque-card"), esquive = state.defenses.esquive;
      var editEs = el("div", "pc-edit-only pc-defense-edit"); editEs.appendChild(fld("Compétence d’esquive", combatComp(esquive))); 
      es.dataset.defenseId = "esquive";
      if (isEdit("defense") || state.combatAffichage.defenseEsquive !== false) {
        details(es, "Esquive", "esquive", esquive, "esquive"); if (defenseVue.ouverts.esquive) es.insertBefore(editEs, es.querySelector(".pc-defense-detail")); box.appendChild(es);
      }
      state.defenses.entrees.forEach(function (e) {
        var card = el("div", "pc-attaque-card"), edit = el("div", "pc-edit-only pc-defense-edit"), sel = el("select", "pc-select pc-edit-field");
        var opt = el("option", null, "Choisir une arme"); opt.value = ""; sel.appendChild(opt);
        opt = el("option", null, "Défense personnalisée"); opt.value = "custom"; opt.selected = !!e.personnalisee; sel.appendChild(opt);
        state.inv.objets.filter(function (o) { return o.arme; }).forEach(function (o) {
          if (!o.ref) o.ref = uid("o");
          var op = el("option", null, o.nom || "Arme sans nom"); op.value = o.ref; op.selected = !e.personnalisee && e.arme === o.ref; sel.appendChild(op);
        });
        sel.addEventListener("change", function () {
          if (sel.value === "custom") { e.arme = ""; e.personnalisee = e.personnalisee || { parade: "8", reduction: "0", modsParade: ["", "", ""], comp: "" }; }
          else { e.personnalisee = null; e.arme = sel.value; } refresh();
        });
        edit.appendChild(fld("Source", sel)); edit.appendChild(combatTexte("Nom", e, "nom"));
        if (e.personnalisee) {
          edit.appendChild(combatTexte("Difficulté", e.personnalisee, "parade"));
          edit.appendChild(combatTexte("Protection", e.personnalisee, "reduction"));
          edit.appendChild(fld("Compétence", combatComp(e.personnalisee)));
          var mods = el("div", "pc-arme-line pc-arme-3");
          for (var i = 0; i < 3; i++) (function (rang) {
            var sm = el("select", "pc-select pc-edit-field"), empty = el("option", null, "Aucun"); empty.value = ""; sm.appendChild(empty);
            caracsOrdre().forEach(function (c) { var op = el("option", null, abbrCarac(c)); op.value = c; op.selected = e.personnalisee.modsParade[rang] === c; sm.appendChild(op); });
            sm.addEventListener("change", function () { e.personnalisee.modsParade[rang] = sm.value; refresh(); }); mods.appendChild(fld("MOD", sm));
          })(i);
          edit.appendChild(mods);
        }
        var item = defenseArme(e.arme), nom = e.nom || (item ? "Parade — " + (item.nom || "Arme") : "Défense personnalisée");
        card.dataset.defenseId = e.id;
        details(card, nom, "parade", e, e.id);
        if (defenseVue.ouverts[e.id]) {
          card.insertBefore(edit, card.querySelector(".pc-defense-detail"));
          combatSupprimer(card, function () { state.defenses.entrees = state.defenses.entrees.filter(function (a) { return a.id !== e.id; }); refresh(); });
        }
        box.appendChild(card);
      });
      box.appendChild(miniBtn("+ Ajouter une défense", null, function () { var e = { id: uid("def"), nom: "", arme: "", personnalisee: null }; state.defenses.entrees.push(e); defenseVue.ouverts[e.id] = true; refresh(); }, "pc-edit-only"));
      var mods = combatModificateurs("defense", rendre); if (mods) box.appendChild(mods);
      applyEdit(b, "defense");
    }
    rendre(); hooks.push(rendre); return b;
  }
  // ---- Attaques liées aux armes ou créées librement ----
  var attaqueVue = { ouverts: Object.create(null), orientation: 0, miroirs: Object.create(null), portees: Object.create(null), gardes: Object.create(null), pinceaux: Object.create(null) };
  function buildAttaque() {
    // L'id technique reste « attaque » pour préserver les dispositions déjà
    // sauvegardées ; le titre visible devient « Attaques ».
    var b = block("Attaques", null, "attaque", function () { rendre(); });
    var box = el("div", "pc-attaques");
    b.appendChild(box);
    var ouverts = attaqueVue.ouverts;   // état d'interface seulement, jamais sauvegardé
    var orientation = attaqueVue.orientation;                 // 0 = haut, puis six directions dans le sens horaire
    var miroirs = attaqueVue.miroirs;   // par raccourci d'arme : main droite par défaut, gauche en miroir

    function impregnationSelectionnee() {
      var id = state.combatOptions.attaques.impregnation;
      return (D().impregnations || []).find(function (d) { return d.id === id; }) || null;
    }
    function bonusImpregnation() {
      var d = impregnationSelectionnee();
      return d ? snum(d.pct) / 100 : 0;
    }

    function armesInventaire() {
      var objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      return objets.filter(function (o) { return o && o.arme; });
    }
    function assureRef(o) {
      if (!o) return "";
      if (!o.ref) o.ref = uid("o");
      return String(o.ref);
    }
    function objetArme(ref) {
      var trouve = null;
      armesInventaire().forEach(function (o) {
        if (!trouve && String(o.ref || "") === String(ref || "")) trouve = o;
      });
      return trouve;
    }
    function typeArme(cle) {
      var trouve = null;
      armesData().forEach(function (d) {
        if (!trouve && d && d.cle === cle) trouve = d;
      });
      return trouve;
    }
    function modsDegatsArme(it) {
      if (!it || !it.arme) return 0;
      var a = it.arme, total = 0;
      (Array.isArray(a.modsDegats) ? a.modsDegats : []).slice(0, 3).forEach(function (c) {
        // Chaque MOD vaut toujours floor(CARAC / 5), indépendamment du
        // multiplicateur propre au coup.
        if (c) total += Math.floor(caracTotal(c) / 5);
      });
      return total;
    }
    function degatsArme(it) {
      if (!it || !it.arme) return 0;
      var total = brutArme(it);
      return Math.floor(total / (state.combatOptions.attaques.lente ? 2 : 1) + 1e-9);
    }
    function typesCoup(coup, def) {
      var types = coup && Array.isArray(coup.types) ? coup.types :
        (def && Array.isArray(def.types) ? def.types : []);
      var touche = types[0] || "—";
      return { touche: touche, passage: types[1] || touche };
    }
    function multiplicateurCoup(coup) {
      var n = Number(coup && coup.mult);
      return isFinite(n) && n > 0 ? n : 1;
    }
    function degatsCoup(it, coup) {
      var mult = multiplicateurCoup(coup);
      // Équilibrage : le multiplicateur du coup ne porte QUE sur les dégâts
      // de base de l'arme. Les MOD sont ajoutés ensuite, chacun valant
      // floor(CARAC / 5). Le passage vaut la moitié du résultat final.
      // L'epsilon évite uniquement les imprécisions binaires de 0.8/1.2/1.4.
      var touche = brutCoup(it, coup);
      if (state.combatOptions.attaques.lente) touche = Math.floor(touche / 2);
      return {
        mult: mult,
        touche: touche,
        passage: Math.floor(touche / 2)
      };
    }
    function degatsTypes(base, type, passage, it, entree) {
      return chiffresDegats(base, type, passage, it, entree).map(function (x) { return fmtP(x.valeur) + " " + x.type; }).join(" + ");
    }
    function chiffresDegats(base, type, passage, it, entree) {
      var valeurs = {}, primary = combatTypes().indexOf(type) >= 0 ? type : type || "—";
      primary = /^(tranchant|contondant|perforant)$/.test(primary) ? "physique" : primary;
      if (combatTypes().indexOf(primary) < 0) primary = "physique";
      var rep=it && it.arme && it.arme.repartition, somme=0;
      if(rep)Object.keys(rep).forEach(function(k){somme+=pnum(rep[k]);});
      if(somme>0)Object.keys(rep).forEach(function(k){if(rep[k]>0)valeurs[k]=base*rep[k]/somme;});else valeurs[primary] = base;
      var ammo=entree&&munitionSelectionnee(entree,typeArme(it&&it.arme&&it.arme.type)),ms=ammo&&ammo.munitionStats;
      if(ms&&ms.degats)combatTypes().forEach(function(k){var q=snum(ms.repartition&&ms.repartition[k]);if(q)valeurs[k]=(valeurs[k]||0)+snum(ms.degats)*q/100;});
      // Une seule imprégnation : le choix commun remplace, dans ce module,
      // l'imprégnation ciblée de l'arme. Sans choix, l'effet ciblé reste actif.
      var impregnation = impregnationSelectionnee();
      if (!impregnation) effetsSources().forEach(function(x){var op=x.d.ops.impregnation;if(op && it && x.e.cible===it.ref && op.type)valeurs[op.type]=(valeurs[op.type]||0)+snum(it.arme.degats)*op.pct/100+op.flat;});
      if (impregnation && impregnation.flat && impregnation.type && !Object.prototype.hasOwnProperty.call(valeurs, impregnation.type)) valeurs[impregnation.type] = 0;
      combatTypes().forEach(function (t) { var n = combatMod("attaques", t); if (n) valeurs[t] = (valeurs[t] || 0) + n; });
      return Object.keys(valeurs).map(function (t) {
        var fixe = impregnation && impregnation.type === t ? snum(impregnation.flat) : 0;
        var n = Math.floor(valeurs[t]*(1+effetBonus("degats",t)/100)+fixe+1e-9); if (state.combatOptions.attaques.lente) n = Math.floor(n / 2); if (passage) n = Math.floor(n / 2);
        return { type: t, valeur: Math.max(0, n) };
      }).filter(function (x) { return x.valeur || x.type === primary; });
    }
    function brutArme(it) { return Math.round((snum(it.arme.degats) * (1 + bonusImpregnation()) + modsDegatsArme(it)) * 1000) / 1000; }
    function brutCoup(it, coup) {
      var base = snum(it.arme.degats) * (multiplicateurCoup(coup) + bonusImpregnation());
      // Avec un bonus de coefficient, répartir avant l'arrondi final par type. Sans bonus,
      // préserver l'arrondi des attaques existantes.
      return (bonusImpregnation() ? base : Math.floor(base + 1e-9)) + modsDegatsArme(it);
    }
    function fmtMult(n) {
      return "×" + Number(n || 1).toFixed(1);
    }

    // ---------- ressources consommées par une attaque ----------
    function objetInventaire(ref) {
      var trouve = null, objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      objets.forEach(function (o) {
        if (!trouve && o && String(o.ref || "") === String(ref || "")) trouve = o;
      });
      return trouve;
    }
    function coutEndurance(it) {
      // La dépense vient de CET objet d'arme, pas de son type du livre : une
      // arme personnalisée à difficulté 5 coûte donc bien 5 PE.
      return Math.max(0, snum(it && it.arme ? it.arme.attaque : 0));
    }
    function categorieMunition(def) {
      return def && def.munition && def.munition.cle ? String(def.munition.cle) : "";
    }
    function munitionsCompatibles(def) {
      var cat = categorieMunition(def), objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      if (!cat) return [];
      return objets.filter(function (o) {
        return o && window.OwdInventoryData.isCarried(objets, o) &&
          String(o.typeObjet === "munition" ? o.sousType : o.contenu || "") === cat && pnum(o.qte) > 0;
      });
    }
    function contenantDe(o) {
      if (!o || !o.dans) return null;
      return objetInventaire(o.dans);
    }
    function libelleMunition(o) {
      var t = (o && o.nom) ? String(o.nom) : "Munition";
      t += " ×" + fmtP(pnum(o && o.qte));
      var c = contenantDe(o);
      if (c) t += " — " + (c.nom || "contenant");
      return t;
    }
    function munitionSelectionnee(entree, def) {
      var o = objetInventaire(entree && entree.munition);
      return o && window.OwdInventoryData.isCarried(state.inv.objets,o) &&
        String(o.typeObjet === "munition" ? o.sousType : o.contenu || "") === categorieMunition(def) ? o : null;
    }
    function retireUneMunition(o) {
      var objets = state.inv && Array.isArray(state.inv.objets) ? state.inv.objets : [];
      if (!o) return;
      window.OwdInventoryData.isolateAncestors(objets, o);
      // Conserver le modèle, ses propriétés et sa référence pour le réassort.
      o.qte = Math.max(0, Math.round((pnum(o.qte) - 1) * 100) / 100);
    }
    function prepareRessources(entree, it, def) {
      var out = { endurance: coutEndurance(it), munition: null };
      if (state.combatOptions.attaques.utiliseMunition && categorieMunition(def)) {
        out.munition = munitionSelectionnee(entree, def);
        if (!out.munition || pnum(out.munition.qte) < 1) {
          flash("Choisissez une munition disponible avant d'attaquer.");
          return null;
        }
      }
      return out;
    }
    function executeAttaque(entree, it, def, preparerMessage) {
      if (!window.OwdInventoryData.isCarried(state.inv.objets,it)) {
        flash("Cette arme est par terre : ramassez-la avant d'attaquer.");
        return;
      }
      // 2 : transportable dans une main, mais utilisable seulement à deux.
      // Les 2 obligatoires occupent déjà les deux mains dès leur équipement.
      if ((it.mains === 2 || it.mains === "2 obligatoires") &&
          (it.ou === "mainG" || it.ou === "mainD") && !it.tenueDeuxMains) {
        flash("Cette arme nécessite deux mains pour être utilisée. Déposez-la sur « 2 Mains ».");
        return;
      }
      var rep=it.arme&&it.arme.repartition,sum=0;
      if(rep){Object.keys(rep).forEach(function(k){sum+=pnum(rep[k]);});if(Math.abs(sum-100)>0.001){flash("La répartition des dégâts doit totaliser 100 %.");return;}}
      var r = prepareRessources(entree, it, def);
      if (!r) return;
      // Les dégâts utilisent encore toutes les propriétés du projectile tiré.
      var message = preparerMessage();
      if (state.combatOptions.attaques.utiliseEndurance && !state.combatOptions.attaques.lente && r.endurance > 0)
        state.etat.pe = Math.round((courant("pe") - effetCout("pe",r.endurance)) * 100) / 100;
      if (state.combatOptions.attaques.utiliseMunition && r.munition) {
        retireUneMunition(r.munition);
      }
      sayChat(message.titre, message.champs, message.combat);
      if(effetBonus("paradeAdverse"))sayChat("Effets de l’attaque",[["Parade adverse",sign(effetBonus("paradeAdverse"))],["Esquive adverse","Inchangée"]]);
      refresh();
    }
    function envoieCoup(entree, it, coup, def) {
      executeAttaque(entree, it, def, function () {
        var types = typesCoup(coup, def);
        return { combat: { kind: "attack", hit: chiffresDegats(brutCoup(it, coup), types.touche, false, it, entree), pass: chiffresDegats(brutCoup(it, coup), types.passage, true, it, entree) }, titre: (coup && coup.nom ? coup.nom : "Attaque") + " — " + (it.nom || (def && def.nom) || "Arme"), champs: [
          ["Case de touche", degatsTypes(brutCoup(it, coup), types.touche, false, it, entree)],
          ["Case de passage", degatsTypes(brutCoup(it, coup), types.passage, true, it, entree)]
        ] };
      });
    }
    function envoieAttaqueSimple(entree, it, def) {
      executeAttaque(entree, it, def, function () {
        var types = def && Array.isArray(def.types) ? def.types : [], type = types[0] || "—";
        return { combat: { kind: "attack", hit: chiffresDegats(brutArme(it), type, false, it, entree), pass: chiffresDegats(brutArme(it), type, true, it, entree) }, titre: "Attaque — " + (it.nom || (def && def.nom) || "Arme"), champs: [
          ["Case de touche", degatsTypes(brutArme(it), type, false, it, entree)], ["Case de passage", degatsTypes(brutArme(it), type, true, it, entree)]
        ] };
      });
    }

    // ---------- carte hexagonale ----------
    // Même géométrie que hooks/armes.py : hexagones à sommet plat, le porteur
    // au centre regardant vers le haut, trois anneaux autour de lui.
    var HX_NS = "http://www.w3.org/2000/svg";
    var HX_R = 10, HX_SQ3 = Math.sqrt(3);
    var HX_ANNEAUX = {};
    function svgEl(tag, attrs, txt) {
      var n = document.createElementNS(HX_NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (txt != null) n.textContent = txt;
      return n;
    }
    function hxDistance(q, r) { return (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2; }
    function hxCentre(q, r) { return [HX_R * 1.5 * q, HX_R * HX_SQ3 * (r + q / 2)]; }
    function hxTransforme(q, r, ori, miroir) {
      var nq, nr, i;
      // Le miroir est fait DANS le repère du porteur, avant sa rotation : sa
      // gauche et sa droite restent donc sa gauche et sa droite quelle que soit
      // la direction dans laquelle il regarde.
      if (miroir) { nq = -q; nr = r + q; q = nq; r = nr; }
      for (i = 0; i < ori; i++) {
        nq = -r; nr = q + r; q = nq; r = nr;
      }
      return [q, r];
    }
    function hxAnneau(n) {
      if (HX_ANNEAUX[n]) return HX_ANNEAUX[n];
      var cells = [];
      for (var q = -n; q <= n; q++) for (var r = -n; r <= n; r++) {
        if (hxDistance(q, r) === n) cells.push([q, r]);
      }
      cells.sort(function (a, z) {
        var ac = hxCentre(a[0], a[1]), zc = hxCentre(z[0], z[1]);
        return Math.atan2(ac[0], -ac[1]) - Math.atan2(zc[0], -zc[1]);
      });
      var i0 = 0, mieux = Infinity;
      cells.forEach(function (c, i) {
        var p = hxCentre(c[0], c[1]);
        var d = Math.abs(Math.atan2(p[0], -p[1]));
        if (d < mieux) { mieux = d; i0 = i; }
      });
      HX_ANNEAUX[n] = cells.slice(i0).concat(cells.slice(0, i0));
      return HX_ANNEAUX[n];
    }
    function hxCase(nom) {
      var m = /^(soi|(\d+)(g*|d*)(\d*))$/.exec(String(nom || "").trim());
      if (!m) return null;
      if (m[1] === "soi") return [0, 0];
      var n = parseInt(m[2], 10), cote = m[3] || "", compte = m[4] || "";
      if (!n) return null;
      if (compte && cote.length !== 1) return null;
      var k = compte ? parseInt(compte, 10) : cote.length;
      if (cote.charAt(0) === "g") k = -k;
      if (Math.abs(k) > 3 * n) return null;
      var anneau = hxAnneau(n);
      return anneau[((k % (6 * n)) + 6 * n) % (6 * n)] || null;
    }
    function hxEtapes(brut, ori, miroir) {
      var out = [];
      String(brut || "").split(">").forEach(function (bout, i) {
        var p = bout.indexOf(":");
        if (p < 0) return;
        var c = hxCase(bout.slice(0, p));
        var role = bout.slice(p + 1).trim();
        if (c && (role === "frappe" || role === "passe")) {
          c = hxTransforme(c[0], c[1], ori, miroir);
          out.push({ q: c[0], r: c[1], role: role, rang: i + 1 });
        }
      });
      return out;
    }
    function hxSommets(cx, cy, rayon) {
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var a = Math.PI * i / 3;
        pts.push((cx + rayon * Math.cos(a)).toFixed(2) + "," + (cy + rayon * Math.sin(a)).toFixed(2));
      }
      return pts.join(" ");
    }
    function carteHex(brut, ori, miroir, minimum) {
      var etapes = hxEtapes(brut, ori, miroir), parCase = {};
      etapes.forEach(function (e) { parCase[e.q + "," + e.r] = e; });
      var portee = Math.max(minimum || 1, etapes.reduce(function (n, e) { return Math.max(n, hxDistance(e.q, e.r)); }, 1));
      var largeur = HX_R * (1.5 * portee + 1);
      var hauteur = HX_R * HX_SQ3 * (portee + 0.5);
      var svg = svgEl("svg", {
        "class": "pc-attaque-carte", role: "img",
        "aria-label": "Trajet du coup : " + (brut || ""),
        viewBox: (-largeur).toFixed(1) + " " + (-hauteur).toFixed(1) + " " + (2 * largeur).toFixed(1) + " " + (2 * hauteur).toFixed(1)
      });
      for (var q = -portee; q <= portee; q++) for (var r = -portee; r <= portee; r++) {
        if (hxDistance(q, r) > portee) continue;
        var centre = hxCentre(q, r), e = parCase[q + "," + r];
        svg.appendChild(svgEl("polygon", {
          "class": e ? (e.role === "frappe" ? "hx-frappe" : "hx-passe") : "hx-vide",
          "data-q": q, "data-r": r, points: hxSommets(centre[0], centre[1], HX_R - 0.7)
        }));
      }
      etapes.forEach(function (e) {
        var c = hxCentre(e.q, e.r);
        svg.appendChild(svgEl("text", {
          "class": "hx-rang hx-rang--" + e.role, x: c[0].toFixed(2), y: c[1].toFixed(2), dy: "0.34em"
        }, String(e.rang)));
      });
      svg.appendChild(svgEl("polygon", { "class": "hx-soi", points: hxSommets(0, 0, HX_R - 0.7) }));
      svg.appendChild(svgEl("path", {
        "class": "hx-visee",
        d: "M 0 4 L 0 -5 M -2.4 -2.1 L 0 -5 L 2.4 -2.1",
        transform: "rotate(" + (ori * 60) + " 0 0)"
      }));
      return svg;
    }

    // ---------- carré de garde ----------
    function gardeCentre(i) {
      var col = (i - 1) % 3, rang = Math.floor((i - 1) / 3);
      return [4 + 8 * col, 4 + 8 * rang];
    }
    function miroirGarde(i) {
      var col = (i - 1) % 3, rang = Math.floor((i - 1) / 3);
      return rang * 3 + (2 - col) + 1;
    }
    function gardeSvg(brut, miroir) {
      var m = /^(\d)\s*>\s*(\d)$/.exec(String(brut || "").trim());
      if (!m) return null;
      var depart = parseInt(m[1], 10), arrivee = parseInt(m[2], 10);
      if (depart < 1 || depart > 9 || arrivee < 1 || arrivee > 9) return null;
      if (miroir) { depart = miroirGarde(depart); arrivee = miroirGarde(arrivee); }
      var svg = svgEl("svg", { "class": "pc-attaque-garde", role: "img", "aria-label": "Déplacement de la garde", viewBox: "0 0 24 24" });
      for (var i = 1; i <= 9; i++) {
        var c = gardeCentre(i);
        svg.appendChild(svgEl("rect", { "class": "gd-case", x: (c[0] - 3.4).toFixed(1), y: (c[1] - 3.4).toFixed(1), width: "6.8", height: "6.8", rx: "1" }));
      }
      var a = gardeCentre(depart), z = gardeCentre(arrivee);
      if (depart === arrivee) {
        svg.appendChild(svgEl("circle", { "class": "gd-fixe", cx: a[0], cy: a[1], r: "2.6" }));
        return svg;
      }
      var dx = z[0] - a[0], dy = z[1] - a[1], d = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
      var qx = a[0] + ux * 1.5, qy = a[1] + uy * 1.5;
      var px = z[0] - ux * 1.5, py = z[1] - uy * 1.5;
      var barbe = Math.min(3, 0.42 * Math.sqrt((px - qx) * (px - qx) + (py - qy) * (py - qy)));
      var rec = barbe * 0.848, ouv = barbe * 0.530;
      svg.appendChild(svgEl("path", { "class": "gd-fleche", d: "M " + qx.toFixed(2) + " " + qy.toFixed(2) + " L " + px.toFixed(2) + " " + py.toFixed(2) }));
      svg.appendChild(svgEl("path", { "class": "gd-pointe", d:
        "M " + (px - ux * rec + nx * ouv).toFixed(2) + " " + (py - uy * rec + ny * ouv).toFixed(2) +
        " L " + px.toFixed(2) + " " + py.toFixed(2) +
        " L " + (px - ux * rec - nx * ouv).toFixed(2) + " " + (py - uy * rec - ny * ouv).toFixed(2)
      }));
      return svg;
    }

    function carteCoup(entree, it, coup, def) {
      var dg = degatsCoup(it, coup), types = typesCoup(coup, def);
      var miroir = !!miroirs[entree.id];
      var btn = el("button", "pc-attaque-coup");
      btn.type = "button";
      btn.title = "Envoyer les dégâts dans le tchat";
      btn.addEventListener("click", function () { envoieCoup(entree, it, coup, def); });
      btn.appendChild(carteHex(coup.trajet, orientation, miroir, entree.personnalisee ? 1 : 3));
      if (window.__owdVueAttaques && window.__owdAttackPreview) {
        btn.addEventListener("pointerenter", function () {
          var path = hxEtapes(coup.trajet, 0, false).map(function (e) { return [e.q,e.r,e.role === "frappe" ? "hit" : "pass"]; });
          if (path.length) window.__owdAttackPreview({mirror:miroir,orientation:orientation,path:path});
        });
        btn.addEventListener("pointerleave", function () { window.__owdAttackPreview(null); });
      }

      var bas = el("div", "pc-attaque-coup-bas");
      var texte = el("div", "pc-attaque-coup-texte");
      var nom = el("div", "pc-attaque-coup-nom");
      nom.appendChild(document.createTextNode(coup.nom || "Attaque"));
      nom.appendChild(el("span", "pc-attaque-mult", fmtMult(dg.mult)));
      texte.appendChild(nom);
      var chiffres = el("div", "pc-attaque-coup-degats");
      chiffres.appendChild(el("span", "touche", "Touche " + degatsTypes(brutCoup(it, coup), types.touche, false, it, entree)));
      chiffres.appendChild(el("span", "passage", "Passage " + degatsTypes(brutCoup(it, coup), types.passage, true, it, entree)));
      texte.appendChild(chiffres);
      bas.appendChild(texte);
      var garde = gardeSvg(coup.garde, miroir);
      if (garde) bas.appendChild(garde);
      btn.appendChild(bas);
      return btn;
    }

    function editeurTrajet(entree) {
      var box = el("div", "pc-attaque-editor"), path = hxEtapes(entree.personnalisee.trajet, 0, false);
      var rayon = Math.max(3, attaqueVue.portees[entree.id] || 3, path.reduce(function (n, e) { return Math.max(n, hxDistance(e.q, e.r)); }, 0));
      var brush = attaqueVue.pinceaux[entree.id] || "frappe";
      var tools = el("div", "pc-attaque-editor-tools pc-attaque-editor-paint");
      [["frappe", "Touche"], ["passe", "Passage"]].forEach(function (v) {
        var bt = miniBtn(v[1], null, function () { attaqueVue.pinceaux[entree.id] = v[0]; rendre(); }, brush === v[0] ? "on" : "");
        bt.setAttribute("aria-pressed", String(brush === v[0])); tools.appendChild(bt);
      });
      box.appendChild(tools);
      var svg = carteHex(entree.personnalisee.trajet, 0, false, rayon);
      function ecrit() {
        entree.personnalisee.trajet = path.map(function (e) {
          var n = hxDistance(e.q, e.r), cells = hxAnneau(n), at = -1;
          cells.some(function (c, i) { if (c[0] === e.q && c[1] === e.r) { at = i; return true; } return false; });
          var nom = String(n) + (at === 0 ? "" : at <= 3 * n ? "d" + at : "g" + (6 * n - at));
          return nom + ":" + e.role;
        }).join(">");
        refresh();
      }
      Array.prototype.forEach.call(svg.querySelectorAll("polygon[data-q]"), function (cell) {
        var q = Number(cell.getAttribute("data-q")), r = Number(cell.getAttribute("data-r"));
        if (!q && !r) return;
        cell.setAttribute("tabindex", "0"); cell.setAttribute("role", "button");
        cell.setAttribute("aria-label", "Case " + q + ", " + r);
        function peint() {
          var at = -1; path.some(function (e, i) { if (e.q === q && e.r === r) { at = i; return true; } return false; });
          if (brush === "efface") { if (at >= 0) path.splice(at, 1); }
          else if (at >= 0) path[at].role = brush;
          else path.push({ q: q, r: r, role: brush });
          ecrit();
        }
        cell.addEventListener("click", peint);
        cell.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); peint(); } });
      });
      box.appendChild(svg);
      var efface = el("div", "pc-attaque-editor-tools pc-attaque-editor-erase");
      var gomme = miniBtn("Effacer", null, function () { attaqueVue.pinceaux[entree.id] = "efface"; rendre(); }, brush === "efface" ? "on" : "");
      gomme.setAttribute("aria-pressed", String(brush === "efface")); efface.appendChild(gomme);
      efface.appendChild(miniBtn("Tout Effacer", null, function () { path = []; ecrit(); }));
      box.insertBefore(efface, svg);
      var pieds = el("div", "pc-attaque-editor-tools pc-attaque-editor-range pc-step");
      pieds.appendChild(stepBtn("−", "Réduire la grille", function () { attaqueVue.portees[entree.id] = Math.max(3, rayon - 1); rendre(); }));
      pieds.appendChild(el("span", null, "Portée " + rayon));
      pieds.appendChild(stepBtn("+", "Agrandir la grille", function () { attaqueVue.portees[entree.id] = rayon + 1; rendre(); }));
      box.appendChild(pieds);
      return box;
    }

    function editeurGarde(entree) {
      var box = el("div", "pc-garde-editor"); box.appendChild(el("div", "pc-attaque-section-titre", "Garde"));
      var svg = gardeSvg(entree.personnalisee.garde || "5>5", false); svg.classList.add("pc-garde-dessin");
      svg.setAttribute("aria-label", "Dessiner la garde"); svg.setAttribute("role", "group");
      if (!entree.personnalisee.garde) Array.prototype.forEach.call(svg.querySelectorAll("circle,path"), function (n) { n.remove(); });
      Array.prototype.forEach.call(svg.querySelectorAll("rect"), function (cell, i) {
        var n = i + 1; cell.setAttribute("role", "button"); cell.setAttribute("tabindex", "0"); cell.setAttribute("aria-label", "Garde case " + n);
        function dessine() {
          var depart = attaqueVue.gardes[entree.id];
          entree.personnalisee.garde = (depart || n) + ">" + n;
          if (depart) delete attaqueVue.gardes[entree.id]; else attaqueVue.gardes[entree.id] = n;
          refresh();
        }
        cell.addEventListener("click", dessine);
        cell.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dessine(); } });
      });
      box.appendChild(svg); box.appendChild(miniBtn("Effacer la garde", null, function () { entree.personnalisee.garde = ""; delete attaqueVue.gardes[entree.id]; refresh(); })); return box;
    }

    function carte(entree) {
      var card = el("div", "pc-attaque-card"); card.dataset.attackId = entree.id;
      var it = entree.personnalisee ? { nom: entree.nom || "Attaque personnalisée", arme: entree.personnalisee } : objetArme(entree.arme);

      var ouvert = !!ouverts[entree.id], def = it && typeArme(it.arme.type), meta = [];
      if (it) {
        if (it.arme.type) meta.push((def && def.nom) || it.arme.type);
        if (String(it.arme.attaque || "").trim()) meta.push("Attaque " + Math.max(0,snum(it.arme.attaque)+effetBonus("attaque")));
        meta.push("Dégâts " + fmtP(degatsArme(it)));
      }
      combatCarteTete(card, it ? it.nom || "Arme sans nom" : "Nouvelle attaque", meta.join(" · "), ouvert, "attaque", entree.id,
        function () { ouverts[entree.id] = !ouverts[entree.id]; rendre(); }, function () { return state.attaques; });
      if (!ouvert) return card;
      function supprimer() { combatSupprimer(card, function () { state.attaques = state.attaques.filter(function (a) { return a.id !== entree.id; }); refresh(); }); }

      // Le choix de l'arme n'existe qu'en édition. L'entrée garde une `ref`
      // interne : renommer l'objet dans l'inventaire ne casse pas le raccourci.
      var edit = el("div", "pc-attaque-edit pc-edit-only");
      var choix = el("div", "pc-attaque-choix");
      var type = el("select", "pc-select pc-edit-field pc-attaque-type");
      [["arme", "Armes"], ["custom", "Attaque personnalisée"]].forEach(function (v) {
        var op = el("option", null, v[1]); op.value = v[0]; op.selected = (entree.personnalisee ? "custom" : "arme") === v[0]; type.appendChild(op);
      });
      type.addEventListener("change", function () {
        if (type.value === "custom") {
          entree.arme = "";
          entree.personnalisee = entree.personnalisee || { attaque: "8", degats: "0", modsDegats: ["", "", ""], modsParade: ["", "", ""], comp: "", type: "", mult: "1", trajet: "", garde: "", touche: "", passage: "" };
        } else entree.personnalisee = null;
        ouverts[entree.id] = true; refresh();
      });
      choix.appendChild(fld("Type", type));
      if (entree.personnalisee) choix.appendChild(combatTexte("Nom", entree, "nom"));
      else {
        var source = el("select", "pc-select pc-edit-field pc-attaque-source"), vide = el("option", null, "Choisir une arme"); vide.value = ""; source.appendChild(vide);
        armesInventaire().forEach(function (o) { var op = el("option", null, o.nom || "Arme sans nom"); op.value = assureRef(o); op.selected = it === o; source.appendChild(op); });
        if (entree.arme && !it) { var absent = el("option", null, "Arme introuvable"); absent.value = entree.arme; absent.selected = true; source.appendChild(absent); }
        source.addEventListener("change", function () { entree.arme = source.value; ouverts[entree.id] = true; refresh(); });
        choix.appendChild(fld("Source", source));
      }
      edit.appendChild(choix);
      if (entree.personnalisee) {
        var layout = el("div", "pc-attaque-custom-layout"), infos = el("div", "pc-attaque-custom-info");
        var dessin = el("div", "pc-attaque-custom-dessin"); dessin.appendChild(editeurTrajet(entree));
        var mult = el("div", "pc-attaque-editor-mult"); mult.appendChild(combatTexte("Multiplicateur", entree.personnalisee, "mult")); dessin.appendChild(mult);
        var types = el("div", "pc-attaque-editor-types");
        types.appendChild(fld("Type de touche", combatType(entree.personnalisee, "touche")));
        types.appendChild(fld("Type de passage", combatType(entree.personnalisee, "passage"))); dessin.appendChild(types);
        layout.appendChild(dessin); infos.appendChild(carteArme(it, true)); infos.appendChild(editeurGarde(entree)); layout.appendChild(infos); edit.appendChild(layout);
      }
      card.appendChild(edit);
      if (isEdit("attaque") && entree.personnalisee) { supprimer(); return card; }

      if (!it) {
        card.appendChild(el("div", "pc-empty pc-attaque-vide",
          entree.arme ? "Arme introuvable. Choisissez-en une autre en édition." : "Aucune arme choisie."));
        supprimer(); return card;
      }

      def = typeArme(it.arme.type);
      var coups = def && Array.isArray(def.attaques) ? def.attaques : [];
      if (entree.personnalisee && it.arme.trajet) coups = [{ nom: it.nom, mult: it.arme.mult,
        trajet: it.arme.trajet, garde: it.arme.garde, types: [it.arme.touche, it.arme.passage || it.arme.touche] }];
      if (entree.personnalisee && !it.arme.trajet && !it.arme.type) def = { types: [it.arme.touche] };
      var detail = el("div", "pc-attaque-detail");

      if (categorieMunition(def)) {
        var munBox = el("div", "pc-attaque-munitions");
        var sm = el("select", "pc-select pc-attaque-munition");
        var om0 = el("option", null, "Choisir une munition"); om0.value = ""; sm.appendChild(om0);
        var compatibles = munitionsCompatibles(def), trouveMunition = false;
        compatibles.forEach(function (o) {
          var op = el("option", null, libelleMunition(o));
          op.value = assureRef(o);
          if (op.value === String(entree.munition || "")) { op.selected = true; trouveMunition = true; }
          sm.appendChild(op);
        });
        if (entree.munition && !trouveMunition) {
          var precedente = objetInventaire(entree.munition);
          var ancienne = el("option", null, precedente && pnum(precedente.qte) === 0 ? libelleMunition(precedente) + " (épuisée)" : "Munition indisponible");
          ancienne.value = String(entree.munition); ancienne.selected = true; sm.appendChild(ancienne);
        }
        sm.addEventListener("change", function () { entree.munition = sm.value; refresh(); });
        munBox.appendChild(fld("Munitions", sm));
        detail.appendChild(munBox);
      }

      // Les armes de mêlée du livre ont six trajets. Les armes à distance,
      // boucliers et armes de jet sans trajet gardent néanmoins un vrai bouton
      // d'attaque : il envoie simplement leurs dégâts de base + MOD et leur type.
      if (!coups.length) {
        var simple = el("button", "pc-attaque-simple");
        simple.type = "button";
        var stypes = def && Array.isArray(def.types) ? def.types : [];
        simple.appendChild(el("strong", null, "Attaquer"));
        simple.appendChild(el("span", null, degatsTypes(brutArme(it), stypes[0] || "—", false, it, entree)));
        simple.addEventListener("click", function () { envoieAttaqueSimple(entree, it, def); });
        detail.appendChild(simple);
        card.appendChild(detail);
        supprimer(); return card;
      }

      detail.appendChild(el("div", "pc-attaque-section-titre", "Trajets et Attaques"));
      var legende = el("div", "pc-attaque-legende");
      var cles = el("div", "pc-attaque-legende-cles");
      var lgSoi = el("span", null); lgSoi.appendChild(el("i", "soi")); lgSoi.appendChild(document.createTextNode("vous"));
      var lgTouche = el("span", null); lgTouche.appendChild(el("i", "touche")); lgTouche.appendChild(document.createTextNode("touche"));
      var lgPasse = el("span", null); lgPasse.appendChild(el("i", "passe")); lgPasse.appendChild(document.createTextNode("passage"));
      cles.appendChild(lgSoi); cles.appendChild(lgTouche); cles.appendChild(lgPasse);
      legende.appendChild(cles);

      var controles = el("div", "pc-attaque-controles");
      var visee = el("div", "pc-attaque-visee");
      var directions = el("div", "pc-segs pc-attaque-orientations");
      directions.setAttribute("role", "group");
      directions.setAttribute("aria-label", "Orientation du personnage");
      ["↑", "↗", "↘", "↓", "↙", "↖"].forEach(function (sym, i) {
        var bouton = el("button", "c pc-attaque-orientation" + (i === orientation ? " on" : ""), sym);
        bouton.type = "button";
        bouton.setAttribute("aria-label", ["Haut", "Haut-droite", "Bas-droite", "Bas", "Bas-gauche", "Haut-gauche"][i]);
        bouton.setAttribute("aria-pressed", String(i === orientation));
        bouton.title = bouton.getAttribute("aria-label");
        bouton.addEventListener("click", function () {
          attaqueVue.orientation = orientation = i;
          rendre();
        });
        directions.appendChild(bouton);
      });
      visee.appendChild(directions);
      controles.appendChild(visee);

      var mir = el("button", "pc-mini pc-attaque-miroir" + (miroirs[entree.id] ? " on" : ""), "⇋");
      mir.type = "button";
      mir.setAttribute("aria-pressed", miroirs[entree.id] ? "true" : "false");
      mir.title = miroirs[entree.id] ? "Arme tenue en main gauche : revenir en main droite" : "Passer l'arme de la main droite à la main gauche";
      mir.setAttribute("aria-label", mir.title);
      mir.addEventListener("click", function () {
        miroirs[entree.id] = !miroirs[entree.id];
        rendre();
      });
      controles.appendChild(mir);
      legende.appendChild(controles);
      detail.appendChild(legende);

      var grille = el("div", "pc-attaque-coups");
      coups.forEach(function (coup) { grille.appendChild(carteCoup(entree, it, coup, def)); });
      detail.appendChild(grille);
      card.appendChild(detail);
      supprimer(); return card;
    }

    function carteImpregnation() {
      var actif = impregnationSelectionnee(), ouvert = !!attaqueVue.impregnation;
      var card = el("div", "pc-attaque-card pc-impregnation");
      combatCarteTete(card, "Imprégnation", actif ? actif.nom : "Aucune", ouvert, "attaque", "impregnation", function () {
        attaqueVue.impregnation = !ouvert; rendre();
      });
      if (!ouvert) return card;
      var detail = el("div", "pc-attaque-detail pc-impregnation-detail");
      var choix = el("div", "pc-impregnation-choix");
      function bouton(d) {
        var choisi = d ? !!actif && actif.id === d.id : !actif;
        var btn = el("button", "pc-impregnation-option" + (choisi ? " on" : ""));
        btn.type = "button"; btn.setAttribute("aria-pressed", String(choisi));
        if (d) {
          var image = el("img"); image.src = new URL(d.img, new URL(dataUrl(), location.href)).href;
          image.alt = ""; image.width = 40; image.height = 40; image.loading = "lazy"; btn.appendChild(image);
        }
        var texte = el("span", "pc-impregnation-libelle");
        texte.appendChild(el("span", "", d ? d.nom : "Aucune"));
        if (d) texte.appendChild(el("small", "", d.resume));
        btn.appendChild(texte); btn.title = d ? d.nomAnglais + (d.effetsManuels ? " — " + d.effetsManuels : "") : "Retirer l’imprégnation commune";
        btn.addEventListener("click", function () {
          state.combatOptions.attaques.impregnation = d && !choisi ? d.id : "";
          refresh();
        });
        choix.appendChild(btn);
      }
      bouton(null); (D().impregnations || []).forEach(bouton);
      detail.appendChild(choix);
      if (actif && actif.effetsManuels) detail.appendChild(el("p", "pc-impregnation-effets", actif.effetsManuels + " — gestion manuelle."));
      card.appendChild(detail); return card;
    }

    function rendre() {
      if (window.__owdVueAttaques && window.__owdAttackPreview) window.__owdAttackPreview(null);
      box.innerHTML = "";
      if (!Array.isArray(state.attaques)) state.attaques = [];
      var ressources = el("div", "pc-attaque-ressources pc-combat-ressources");
      ressources.appendChild(combatRessource(state.combatOptions.attaques, "lente", "Attaque Lente"));
      ressources.appendChild(combatEndurance(state.combatOptions.attaques));
      ressources.appendChild(combatRessource(state.combatOptions.attaques, "utiliseMunition", "Consommer Munition"));
      box.appendChild(ressources);
      state.attaques.forEach(function (a) { box.appendChild(carte(a)); });
      if (!state.attaques.length) box.appendChild(el("div", "pc-empty", "Aucune attaque."));
      box.appendChild(miniBtn("+ Ajouter une attaque", null, function () {
        var a = { id: uid("atk"), arme: "", munition: "" };
        state.attaques.push(a);
        ouverts[a.id] = true;
        refresh();
      }, "pc-edit-only pc-attaque-ajout"));
      var mods = combatModificateurs("attaque", rendre); if (mods) box.appendChild(mods);
      box.appendChild(carteImpregnation());
      applyEdit(b, "attaque");
    }
    if (window.__owdVueAttaques && window.__owdAttackPreview) remontageNettoyage.push(function () { window.__owdAttackPreview(null); });
    rendre();
    hooks.push(rendre);   // une arme modifiée dans l'inventaire se reflète ici immédiatement
    return b;
  }
  // ---- Mouvement ----
  // Les pas par round que donne l'ALLURE, choisie ici avec les mêmes cases que
  // l'effort : on peut se déplacer moins vite que l'effort qu'on fournit, les
  // deux ne se confondent donc pas. Endormi, le personnage n'a pas d'allure,
  // donc aucun pas. L'allure lourde se prend par crans, chacun
  // avec son coût en dés d'action et en PE : c'est le seul choix de ce module.
  // Aucune règle n'est écrite ici : les allures, leurs pas et leurs coûts
  // viennent des données (clé « mouvement »).
  function mouvementListe() { var m = D().mouvement; return Array.isArray(m) ? m : []; }
  // l'allure de l'effort courant : « leger » est l'allure « legere », « lourd »
  // la « lourde » ; le sommeil n'en a aucune
  function allureCourante() {
    var e = String(state.allure || ""), out = null;
    if (!e) return null;
    mouvementListe().forEach(function (a) { if (!out && a.cle.indexOf(e) === 0) out = a; });
    return out;
  }
  // Les DÉS D'ACTION que l'allure prend ce round (le coût du cran, à l'allure
  // lourde). Ce coût est informatif : le joueur gère ses dés dans Actions.
  function desPerdusMouvement() {
    var a = allureCourante();
    if (!a || a.crans.length < 2) return 0;
    var c = a.crans[clamp(num(state.allureCran, 1), 1, a.crans.length) - 1];
    return Math.max(0, Math.floor(num0(c.des)));
  }
  function num0(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function mouvementPas(base, bonus, vitesse, effondrement) {
    return base ? Math.max(0, Math.floor(base + bonus) + Math.trunc(vitesse / 10) + effondrement) : 0;
  }
  function buildMouvement() {
    var b = block("Mouvement");

    // L'ALLURE, en cases soudées sur deux lignes, comme les efforts du module
    // Effort et Temps : [sommeil | repos], puis [léger | inter | lourd].
    var boutons = [];
    var liste = effortsListe();
    [liste.slice(0, 2), liste.slice(2)].forEach(function (rang) {
      if (!rang.length) return;
      var bloc = el("div", "pc-segs");
      rang.forEach(function (e) {
        var bt = el("button", "c", EFFORT_COURT[e.cle] || e.nom);
        bt.title = e.nom;
        bt.type = "button";
        bt.addEventListener("click", function () { state.allure = e.cle; refresh(); });
        bloc.appendChild(bt);
        boutons.push([bt, e.cle]);
      });
      b.appendChild(bloc);
    });

    // UN TABLEAU DE BORD, dans l'ordre arrêté par l'auteur :
    //   [ pas / round | m / minute | km / heure ]   la grande case d'abord
    //   [ +3 | +6 | +9 | +12 | +15 ]                les crans, en effort lourd
    //   [ DA | PE ]                                 ce que le cran coûte
    // Les cases sont soudées, comme le trio de MIA : la valeur en grand,
    // l'étiquette en petites capitales dessous.
    function cases(cls, defs) {
      var box = el("div", "pc-stat " + cls), out = {};
      defs.forEach(function (d) {
        var c = el("div", "c" + (d[2] ? " " + d[2] : ""));
        var v = el("span", "v", "");
        c.appendChild(v);
        c.appendChild(el("span", "k", d[1]));
        box.appendChild(c);
        out[d[0]] = v;
      });
      b.appendChild(box);
      return { box: box, v: out };
    }
    var dist = cases("pc-mouv-dist", [["pas", "pas / rnd", "grand"], ["min", "m / min"], ["h", "km / h"]]);
    // les crans : foncer, chacun marqué des pas qu'il ajoute à l'allure d'avant
    var crans = el("div", "pc-segs pc-crans");
    b.appendChild(crans);
    var cout = cases("pc-mouv-cout", [["da", "dés d'action"], ["pe", "PE"]]);

    hooks.push(function () {
      boutons.forEach(function (x) { x[0].classList.toggle("on", x[1] === state.allure); });
      var a = allureCourante();
      crans.innerHTML = "";
      var lourd = !!a && a.crans.length > 1;
      crans.style.display = lourd ? "" : "none";
      cout.box.style.display = lourd ? "" : "none";
      var c = { pas: 0, minute: 0, heure: 0, des: 0, pe: 0 };
      if (a) {
        var k = clamp(num(state.allureCran, 1), 1, a.crans.length);
        c = a.crans[k - 1];
        if (lourd) {
          // les pas de l'allure d'avant : le point de départ des crans
          var liste = mouvementListe(), avant = liste[liste.indexOf(a) - 1];
          var base = avant ? avant.crans[avant.crans.length - 1].pas : 0;
          a.crans.forEach(function (x, i) {
            var bt = el("button", "c" + (i + 1 === k ? " on" : ""), "+" + (x.pas - base));
            bt.title = x.des + "DA" + (x.pe ? " · " + x.pe + " PE" : "");
            bt.type = "button";
            bt.addEventListener("click", function () { state.allureCran = i + 1; refresh(); });
            crans.appendChild(bt);
          });
        }
      }
      var pas = mouvementPas(c.pas, effetBonus("pas"), effetBonus("vitesse"), effSpecifiques().pas);
      dist.v.pas.textContent = String(pas);
      dist.v.min.textContent = fmtP(Math.round(c.pas ? num0(c.minute) * pas / c.pas : 0));
      dist.v.h.textContent = fmtP(Math.round((c.pas ? num0(c.heure) * pas / c.pas : 0) * 10) / 10);
      cout.v.da.textContent = String(c.des || 0);
      cout.v.pe.textContent = String(effetCout("pe",c.pe || 0));
    });
    return b;
  }
  // ---- Effondrement : dix causes, lecture seule et modificateur direct ----
  function buildEffondrement() {
    var b = block("Effondrement");
    function reste(champ) { return 100 - clamp(num(effDef()[champ], 0) * effondrement(), 0, 100); }
    var r = el("div", "pc-bigrow pc-bigrow-2");
    var tV = bigTile("MAX PV", function () { return reste("pvParNiveau") + " %"; });
    var tE = bigTile("MAX PE", function () { return reste("peParNiveau") + " %"; });
    r.appendChild(tV); r.appendChild(tE); b.appendChild(r);
    var tN = bigTile("EFFONDREMENT", function () { return String(effondrement()); });
    tN.classList.add("pc-eff-niveau"); b.appendChild(tN);
    var effetsActifs = el("div", "pc-eff-actifs");
    effetsActifs.setAttribute("aria-label", "Effets d’effondrement appliqués"); b.appendChild(effetsActifs);
    var commandes = el("div", "pc-eff-commandes");
    var desactive = el("button", "pc-chip pc-combat-toggle", "Désactiver Effondrement");
    desactive.type = "button";
    desactive.title = "Annule l’effondrement appliqué et ses pénalités ; les causes continuent de suivre le personnage.";
    desactive.addEventListener("click", function () { state.effDesactive = !state.effDesactive; refresh(); });
    var pause = el("button", "pc-chip pc-combat-toggle", "Pauser Effondrement");
    pause.type = "button";
    pause.title = "Fige les niveaux actuels. À la reprise, ils suivent de nouveau les réserves actuelles.";
    pause.addEventListener("click", function () { state.effPause = state.effPause ? null : figeEffondrement(); refresh(); });
    commandes.appendChild(desactive); commandes.appendChild(pause); b.appendChild(commandes);
    var grille = el("div", "pc-eff-grille"), vues = [];
    [["pr", "Repos"], ["charge", "Charge"], ["froid", "Froid"], ["chaud", "Chaud"],
     ["ps", "Satiété"], ["contenance", "Contenance"], ["ph", "Hydratation"], ["alcool", "Alcool"],
     ["pi", "Innocence"], ["autre", "Autre"]].forEach(function (d) {
      var cle = d[0], nom = d[1];
      var normal = { pr: "PR", pi: "PI", ps: "PS", ph: "PH" }[cle] || nom;
      var compact = { charge: "CHG", contenance: "CTN", alcool: "ALC", froid: "FRD", chaud: "CHD", autre: "AUT" }[cle] || normal;
      var carte = el("div", "pc-eff-partie t-" + cle); carte.dataset.effPartie = cle;
      var tete = el("div", "pc-eff-tete");
      var titre = el("span", "k"); titre.dataset.effNom = cle; titre.title = nom; titre.setAttribute("aria-label", nom);
      titre.appendChild(el("span", "pc-eff-nom-normal", normal));
      titre.appendChild(el("span", "pc-eff-nom-compact", compact)); tete.appendChild(titre);
      var valeur = el("div", "pc-eff-lecture");
      var total = el("span", "pc-eff-partie-total"); valeur.appendChild(total);
      valeur.appendChild(el("span", "pc-vital-max", "/ 10")); tete.appendChild(valeur); carte.appendChild(tete);
      var jauge = el("span", "pc-vital-jauge"), fill = el("i");
      jauge.appendChild(fill); carte.appendChild(jauge);
      var champs = el("div", "pc-segs pc-eff-champs");
      function lecture(label) {
        var champ = champNombreSigne(el("input", "c pc-eff-valeur"));
        champ.readOnly = true; champ.setAttribute("aria-label", nom + " — " + label);
        champs.appendChild(champ); return champ;
      }
      var base = lecture("Base"), effets = lecture("Effet");
      if (cle === "alcool") {
        base.readOnly = false; base.title = "Points d'alcool présents, résorbés par l'horloge dédiée.";
        base.addEventListener("input", function () {
          var n = litNombreSigne(base.value); if (!isFinite(n)) return;
          state.effAlcool = clamp(Math.round(n), 0, 999); refresh();
        });
      }
      base.title = cle === "alcool" ? base.title : "Base : niveau calculé depuis la réserve ou l’état du personnage.";
      effets.title = "Effet : bonus/malus des effets ; lecture seule.";
      var mod = champNombreSigne(el("input", "c pc-eff-delta"));
      mod.placeholder = "±"; mod.setAttribute("aria-label", nom + " — ±");
      mod.addEventListener("input", function () {
        if (state.effPause) return;
        var vide = mod.value.trim() === "", n = vide ? 0 : litNombreSigne(mod.value);
        if (!isFinite(n) || !Number.isInteger(n)) return;
        n = clamp(n, -999, 999);
        if (cle === "autre") state.effAutre = n;
        else {
          if (!state.effParties[cle]) state.effParties[cle] = { effet: 0, mod: 0 };
          state.effParties[cle].mod = n;
        }
        refresh();
      });
      mod.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
      mod.addEventListener("blur", function () { refresh(); });
      champs.appendChild(mod); carte.appendChild(champs); grille.appendChild(carte);
      vues.push({cle: cle, carte: carte, tete: tete, titre: titre, lecture: valeur, total: total, base: base, effets: effets, mod: mod, fill: fill});
    });
    b.appendChild(grille);
    function ajusteLibelles() {
      if (!b.isConnected) return;
      vues.forEach(function (v) {
        v.titre.classList.remove("compact");
        var style = getComputedStyle(v.tete);
        var requis = v.titre.getBoundingClientRect().width + v.lecture.getBoundingClientRect().width +
          parseFloat(style.columnGap || 0) + parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
        v.titre.classList.toggle("compact", requis > v.tete.clientWidth + 0.5);
      });
    }
    if (typeof ResizeObserver === "function") {
      var largeurObservee = -1;
      var observation = new ResizeObserver(function () {
        if (!b.isConnected) { observation.disconnect(); return; }
        var largeur = grille.clientWidth;
        if (largeur === largeurObservee) return;
        largeurObservee = largeur; ajusteLibelles();
      });
      observation.observe(grille);
    }
    hooks.push(function () {
      var sp = effSpecifiques(), lignes = [], total = effondrement();
      function ajoute(v, label, unite) { if (v) lignes.push(sign(v) + (unite || "") + " " + label); }
      ajoute(-Math.min(100, total * num(effDef().pvParNiveau, 0)), "PV maximums", " %");
      ajoute(-Math.min(100, total * num(effDef().peParNiveau, 0)), "PE maximums", " %");
      ajoute(sp.pe, "niveau(x) de récupération naturelle des PE");
      ajoute(sp.pm, "niveau(x) de récupération naturelle des PM");
      ajoute(sp.ps, "niveau(x) de récupération naturelle des PS");
      ajoute(sp.ph, "niveau(x) de récupération naturelle des PH");
      ajoute(sp.froid, "de protection contre le froid"); ajoute(sp.chaud, "de protection contre la chaleur");
      ajoute(sp.pas, "pas au mouvement total"); ajoute(sp.mana, "au coût en mana", " %");
      ajoute(sp.difficulte, "à la difficulté de tous les jets (à appliquer manuellement)");
      effetsActifs.replaceChildren(); lignes.forEach(function (texte) { effetsActifs.appendChild(el("div", "pc-eff-actif", texte)); });
      effetsActifs.hidden = !lignes.length;

      vues.forEach(function (v) {
        var brut = effBasePartie(v.cle), niveau = effPartie(v.cle);
        var photo = effPhotoPartie(v.cle);
        var ecart = photo ? photo.effet : pub("effondrementPartie", brut + num(effReglage(v.cle).effet, 0), { cle: v.cle, base: brut }) - brut;
        var ajustement = photo ? photo.mod : v.cle === "autre" ? num(state.effAutre, 0) : num(effReglage(v.cle).mod, 0);
        v.mod.disabled = !!state.effPause;
        if (v.cle === "alcool") v.base.disabled = !!state.effPause;
        if (document.activeElement !== v.base) v.base.value = brut;
        v.effets.value = ecart ? sign(ecart).replace("−", "-") : "0";
        v.total.textContent = String(niveau);
        v.fill.style.width = clamp(niveau * 10, 0, 100) + "%";
        v.fill.style.marginLeft = "0";
        if (document.activeElement !== v.mod) v.mod.value = ajustement ? sign(ajustement).replace("−", "-") : "";
        v.mod.title = "Modificateur direct, appliqué pendant la saisie. Vide = 0.";
        v.carte.title = "Base " + brut + " ; effets " + sign(ecart) + " ; ajustement " + sign(ajustement);
      });
      desactive.classList.toggle("on", !!state.effDesactive); desactive.setAttribute("aria-pressed", String(!!state.effDesactive));
      pause.classList.toggle("on", !!state.effPause); pause.setAttribute("aria-pressed", String(!!state.effPause));
      ajusteLibelles();
      var e = effondrement();
      [tN, tV, tE].forEach(function (t) { t.classList.toggle("adj", e > 0); });
      tN.title = capForce("effondrement")
        ? chaineTexteDe(lireCap("max", "effondrement"), "calculé", effondrementAuto())
        : "Somme après effets et ajustements : " + effPartie("total") + " ; plafond " + effPlafond();
    });
    return b;
  }
  // ---- Contenance : l'estomac ----
  // Un estomac d'une seule couleur, qui se remplit par le bas à mesure que la
  // contenance occupée monte, et dont la couleur passe du vert au rouge en
  // approchant du plein. La valeur s'écrit dans l'estomac. Dessous, le geste
  // de jeu des réserves : on tape ce qu'on avale ou ce qui se libère, et
  // « Appliquer » l'ajoute.
  //
  // L'IMAGE est l'estomac « plasticine » d'Icons8, découpé en DEUX MASQUES
  // (docs/assets/fiche/) : le contour, peint à l'encre de la fiche, et
  // l'intérieur, peint d'un ton neutre puis rempli. Des masques et non l'image
  // telle quelle : c'est ce qui laisse la fiche choisir les couleurs, de jour
  // comme de nuit.
  //
  // Aucun rouage : le maximum se règle dans les Options (Réglages des
  // capacités, ligne Contenance).
  function vomirContenu() {
    state.etat.contenance = 0; reinitialiseHorlogeDigestion();
    state.effetsActifs = (state.effetsActifs || []).filter(function (e) { return e.categorie !== "digestive"; });
    var d = recupCoffre(false);
    if (Array.isArray(d.ajouts)) d.ajouts = d.ajouts.filter(function (r) {
      if (r.categorie !== "digestive") return true; recupOublieSuivi(r.id); return false;
    });
    nettoieRecupCoffre(); refresh(); rebuildRecuperation();
  }
  function buildContenance() {
    var b = block("Contenance");
    var fig = el("div", "pc-estomac");
    var fond = el("span", "pc-estomac-fond");
    var plein = el("span", "pc-estomac-plein");
    var trait = el("span", "pc-estomac-trait");
    var chiffre = el("span", "pc-estomac-val");
    var v = el("b", null, "");
    var mx = el("small", null, "");
    chiffre.appendChild(v);
    chiffre.appendChild(mx);
    fig.appendChild(fond);
    fig.appendChild(plein);
    fig.appendChild(trait);
    fig.appendChild(chiffre);
    b.appendChild(fig);

    var cmd = el("div", "pc-vital-cmd pc-temps");
    var delta = el("input", "pc-vital-delta");
    champNombreSigne(delta);
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", "Contenance à ajouter ou retirer");
    function applique() {
      var d = litNombreSigne(delta.value);
      if (!isFinite(d) || !d) return;
      state.etat.contenance = Math.max(0, Math.round((contenancePrise() + d) * 100) / 100);
      if (!(state.etat.contenance > 0)) reinitialiseHorlogeDigestion();
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applique(); }
    });
    cmd.appendChild(delta);
    cmd.appendChild(miniBtn("Appliquer", "Ajouter cette variation", applique));
    b.appendChild(cmd);
    b.appendChild(miniBtn("Vomir", "Vider la contenance et interrompre les effets digestifs en cours", vomirContenu));

    hooks.push(function () {
      var pris = contenancePrise(), m = contenance();
      var p = m > 0 ? clamp(pris / m, 0, 1) : (pris > 0 ? 1 : 0);
      v.textContent = fmtP(pris);
      mx.textContent = "/ " + fmtP(m);
      // la hauteur remplie, et la teinte : vert au ventre vide, rouge au plein
      fig.style.setProperty("--niveau", (p * 100).toFixed(1) + "%");
      fig.style.setProperty("--teinte", "hsl(" + Math.round(120 - 120 * p) + ", 60%, 42%)");
      fig.classList.toggle("over", pris > m);
      fig.title = "Contenance " + fmtP(pris) + " sur " + fmtP(m);
    });
    return b;
  }
  // ---- Actions : les dés d'action du tour ----
  // Un dé par dé d'action du personnage, montré EN VOLUME sur sa plus haute
  // face, par le moteur des dés de l'extension (owd-des3d.js, servi au site
  // par hooks/des3d.py). Chaque dé change de taille séparément, du d4 au d12 ;
  // un clic le sélectionne, et « Envoyer » ne lance que les sélectionnés.
  //
  // L'ENVOI EST CELUI QUE LA SURCOUCHE SAIT DESSINER : une carte
  // « OWD Action Dice » qui porte UN jet par dé ([[1d8]][[1d6]]…). Un seul
  // jet de plusieurs dés rendrait une somme, et l'extension n'en ferait rien.
  // Hors de Roll20, les dés se lancent sur place et le résultat s'affiche.
  var TAILLES_DES = [4, 6, 8, 10, 12];
  function desTaille(i) {
    var t = (state.desTailles || [])[i];
    return TAILLES_DES.indexOf(t) >= 0 ? t : faces();
  }
  // UN DÉ IMMOBILE. Le moteur n'a pas d'option pour poser un dé sans le lancer
  // (il est ENGENDRÉ depuis la page d'essai d6.html, qui n'en a pas besoin) ;
  // il respecte en revanche le réglage « réduire les animations », qu'il lit à
  // la création. On le lui fait lire vrai le temps de cet appel, et seulement
  // pour cette requête-là. Le jour où le moteur aura son option, c'est ici
  // qu'on la passera.
  function deImmobile(taille, valeur, rang, rayon) {
    var M = window.OwdDes3d;
    if (!M || !M.connait(taille, valeur)) return null;
    var mm = window.matchMedia;
    try {
      window.matchMedia = function (q) {
        return /prefers-reduced-motion/.test(q) ? { matches: true, media: q }
                                                : mm.call(window, q);
      };
      var d = M.creer(taille, valeur, rang, rayon, null,
                      document.documentElement.classList.contains("night"));
      return d ? d.noeud : null;
    } catch (e) {
      return null;
    } finally {
      window.matchMedia = mm;
    }
  }
  function buildDesAction() {
    // LE ROUAGE garde la TAILLE des dés : c'est de la construction. Choisir
    // des dés et les envoyer se joue, et reste ouvert hors édition.
    var b = block("Actions", null, "desaction");
    var rangee = el("div", "pc-desaction");
    b.appendChild(rangee);
    var choisis = [];
    // Les dés utilisés font partie de l’état sauvegardé, même après remontage ou synchronisation.
    function utilise(i) { return (state.desUtilises || [])[i] === true; }
    function poseUtilise(i, v) { if (v) state.desUtilises[i] = true; else delete state.desUtilises[i]; }
    var cases = [];
    var nuitVue = null;

    // LE CHIFFRE AU MILIEU. Centrer la SCÈNE ne suffit pas : chaque solide y
    // est posé sur sa ligne de sol, et la face qu'on lit n'est ni au centre de
    // sa boîte ni au même endroit d'un solide à l'autre (le d4 montre sa face
    // haute, le d8 et le d10 une face penchée). On mesure donc le chiffre de la
    // face lue et l'on déplace le dé pour qu'il tombe au centre de la case.
    // Une case invisible (onglet fermé) ne se mesure pas : le centrage attend
    // alors le premier rafraîchissement où elle se montre.
    function centre(c) {
      var sc = c.pose.querySelector(".owd-d3");
      if (!sc) { c.centre = true; return; }
      sc.style.transform = "";
      var faces = sc.querySelectorAll(".owd-d3-f");
      var f = faces[c.valeur - 1], n = f && f.querySelector(".owd-d3-n");
      var boite = c.pose.getBoundingClientRect();
      if (!n || !boite.width) { c.centre = false; return; }
      var r = n.getBoundingClientRect();
      var dx = (boite.left + boite.width / 2) - (r.left + r.width / 2);
      var dy = (boite.top + boite.height / 2) - (r.top + r.height / 2);
      sc.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px)";
      c.centre = true;
    }
    function scene(i) {
      var c = cases[i], t = desTaille(i);
      c.pose.innerHTML = "";
      c.valeur = t;
      var n = deImmobile(t, t, i, 22);
      c.pose.appendChild(n || el("span", "pc-desaction-jeton", String(t)));
      centre(c);
      c.nom.textContent = "d" + t;
      c.moins.disabled = TAILLES_DES.indexOf(t) <= 0;
      c.plus.disabled = TAILLES_DES.indexOf(t) >= TAILLES_DES.length - 1;
    }
    function change(i, sens) {
      if (!isEdit("desaction")) return;
      var k = TAILLES_DES.indexOf(desTaille(i)) + sens;
      if (k < 0 || k >= TAILLES_DES.length) return;
      var tab = (state.desTailles || []).slice();
      while (tab.length <= i) tab.push(faces());
      tab[i] = TAILLES_DES[k];
      state.desTailles = tab;
      scene(i);
      refresh();
    }
    function bati() {
      var n = Math.max(0, Math.floor(desAction()));
      rangee.innerHTML = "";
      cases = [];
      choisis = choisis.slice(0, n);

      for (var i = 0; i < n; i++) (function (i) {
        var col = el("div", "pc-desaction-de");
        var pose = el("button", "pc-desaction-pose");
        pose.type = "button";
        pose.addEventListener("click", function () {
          if (utilise(i)) return;
          choisis[i] = !choisis[i];
          col.classList.toggle("on", !!choisis[i]);
          majBoutons();
        });
        var cadre = el("div", "pc-desaction-case");
        cadre.appendChild(pose);
        var bascule = el("button", "pc-desaction-bascule");
        bascule.type = "button";
        bascule.addEventListener("click", function (e) {
          e.stopPropagation();
          poseUtilise(i, !utilise(i));
          choisis[i] = false;
          refresh();
        });
        cadre.appendChild(bascule);
        col.appendChild(cadre);
        var taille = el("div", "pc-desaction-taille");
        var moins = el("button", "pc-desaction-pas pc-edit-only", "−");
        moins.type = "button";
        moins.addEventListener("click", function () { change(i, -1); });
        var nom = el("span", "pc-desaction-nom", "");
        var plus = el("button", "pc-desaction-pas pc-edit-only", "+");
        plus.type = "button";
        plus.addEventListener("click", function () { change(i, +1); });
        taille.appendChild(moins);
        taille.appendChild(nom);
        taille.appendChild(plus);
        col.appendChild(taille);
        col.classList.toggle("on", !!choisis[i]);
        col.classList.toggle("utilise", utilise(i));
        rangee.appendChild(col);
        cases.push({ col: col, pose: pose, nom: nom, moins: moins, plus: plus, bascule: bascule });
        scene(i);
      })(i);
      marqueUtilises();
    }

    var envoi = miniBtn("Envoyer", "Lancer les dés sélectionnés", function () {
      var tailles = [];
      cases.forEach(function (c, i) { if (choisis[i] && !utilise(i)) tailles.push(desTaille(i)); });
      if (!tailles.length) return;
      var cmd = "&{template:default}{{name=OWD Action Dice}}{{rolls=" +
                tailles.map(function (t) { return "[[1d" + t + "]]"; }).join("") + "}}";
      if (!envoyer(cmd)) {
        flash(tailles.map(function (t) {
          return "d" + t + " : " + (1 + Math.floor(Math.random() * t));
        }).join(" · "));
      }
      // ce qui vient d'être lancé est UTILISÉ jusqu'à « Récupérer »
      cases.forEach(function (c, i) {
        if (choisis[i]) poseUtilise(i, true);
        c.col.classList.remove("on");
      });
      choisis = [];
      refresh();
    }, "pc-desaction-envoi");
    var recup = miniBtn("Récupérer", "Rendre les dés utilisés", function () {
      state.desUtilises = {};
      refresh();
    }, "pc-desaction-envoi");
    // ENVOYER ne part qu'avec un dé choisi, RÉCUPÉRER qu'avec un dé utilisé
    function majBoutons() {
      envoi.disabled = !choisis.some(function (x, i) { return x && i < cases.length && !utilise(i); });
      recup.disabled = !cases.some(function (c, i) { return utilise(i); });
    }
    var gestes = el("div", "pc-desaction-gestes");
    gestes.appendChild(envoi);
    gestes.appendChild(recup);
    b.appendChild(gestes);
    var finTour=miniBtn("Fin de tour", "Appliquer Énergisé : récupérer un dé utilisé", function(){effetFinTour();refresh();});b.appendChild(finTour);
    hooks.push(function(){finTour.style.display=effetBonus("finTour")>0?"":"none";});

    bati();
    majBoutons();
    // LE MODE NUIT se bascule sans passer par la fiche (night.js, l'amorce
    // Roll20) : on guette la classe de <html> pour repeindre les dés. Le
    // guetteur se débranche de lui-même quand le module a quitté la page.
    if (window.MutationObserver) {
      var guet = new MutationObserver(function () {
        if (!b.isConnected) { guet.disconnect(); return; }
        var nuit = document.documentElement.classList.contains("night");
        if (nuit !== nuitVue) { nuitVue = nuit; bati(); }
      });
      guet.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      remontageNettoyage.push(function () { guet.disconnect(); });
    }
    function marqueUtilises() {
      cases.forEach(function (c, i) {
        var u = utilise(i);
        if (u) choisis[i] = false;
        c.col.classList.toggle("utilise", u);
        c.col.classList.toggle("on", !u && !!choisis[i]);
        c.pose.disabled = u;
        c.pose.title = u ? "Dé consommé — récupérer avec le bouton dans la case" : "Sélectionner ce dé";
        c.pose.setAttribute("aria-pressed", String(!u && !!choisis[i]));
        c.bascule.textContent = u ? "↶" : "−";
        c.bascule.title = u ? "Récupérer ce dé" : "Consommer temporairement ce dé";
        c.bascule.setAttribute("aria-label", (u ? "Récupérer" : "Consommer") + " le dé " + (i + 1));
      });
      majBoutons();
    }
    hooks.push(function () {
      cases.forEach(function (c) { if (!c.centre) centre(c); });
      // le nombre de dés suit la capacité (un levier du MJ peut la changer) ;
      // le mode nuit repeint les dés, qui prennent leur couleur de nuit
      var nuit = document.documentElement.classList.contains("night");
      if (cases.length !== Math.max(0, Math.floor(desAction())) || nuit !== nuitVue) {
        nuitVue = nuit;
        bati();
      }
      marqueUtilises();
    });
    return b;
  }
  // ---- 8. Compétences ----
  // LES RÈGLES NE DONNENT AUCUNE LISTE DE COMPÉTENCES : le joueur nomme les
  // siennes, et la fiche n'en propose pas — une liste d'exemples passerait pour
  // une règle du livre alors qu'elle n'y est pas. D'où un tableau d'entrées à
  // id stable, un champ « groupe » libre pour que chacun range comme il veut,
  // et des groupes repliables dont l’ordre vient de ce même tableau.
  function xpJusque(r) {
    var t = 0, tab = rangs(), i;
    for (i = 1; i <= r && i < tab.length; i++) t += num(tab[i].xp, 0);
    return t;
  }
  function ruptureJusque(r) {
    var t = 0, tab = rangs(), i;
    for (i = 1; i <= r && i < tab.length; i++) t += num(tab[i].rupture, 0);
    return t;
  }
  // La ligne d'une compétence. opts : { module, reg, onDrop } — le module dont
  // le rouage déverrouille la barre de rangs, le registre où la ligne
  // s'inscrit (celui du module qui la reconstruit, sinon ses hooks fuiraient),
  // et le rappel de reconstruction.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var mod = opts.module || "comps";
    var reg = opts.reg || compHooks;
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));
    row.dataset.id = item.id;

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.nom || "Sans nom");
    if (mod === "comps") nameBox.appendChild(poigneeComp("Déplacer la compétence", function () {
      return { type: "comp", id: item.id };
    }, row));
    nameBox.appendChild(label);
    // RENOMMAGE EN PLACE, au double-clic, en édition seulement. Jamais
    // prompt() : muet dans l'iframe Roll20 sous Chrome. Le renommage ne touche
    // PAS l'id — rang, modificateurs, forçages et les armes qui pointent dessus
    // survivent tous.
    label.addEventListener("dblclick", function () {
      if (!isEdit(mod)) return;
      var inp = el("input", "nmedit");
      inp.type = "text";
      inp.value = item.nom;
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
        else if (e.key === "Escape") { inp.value = item.nom; inp.blur(); }
      });
      inp.addEventListener("blur", function () {
        var v = capFirst(inp.value.trim());
        if (v) item.nom = v;
        if (inp.parentNode) inp.parentNode.replaceChild(label, inp);
        refresh();
        if (opts.onDrop) opts.onDrop();
        if (optCompsRebuild) optCompsRebuild();
      });
      nameBox.replaceChild(inp, label);
      setTimeout(function () { inp.focus(); inp.select(); }, 0);
    });
    var del = el("button", "pc-comp-del pc-edit-only", "✕");
    del.type = "button";
    del.title = "Retirer cette compétence";
    del.addEventListener("click", function () {
      // LISTER ce qui sera perdu : la ligne ne montre ni les modificateurs, ni
      // le point de rupture d'un Rang Max, ni les armes qui s'en servent.
      var perdu = [];
      if (compRang(item) > 0) perdu.push(fmtP(compXp(item)) + " XP investis");
      if (compRupture(item) > 0) perdu.push(fmtP(compRupture(item)) + " point de rupture");
      if (levierRegleDe(lireComp("bonus", item.id)) || levierRegleDe(lireComp("des", item.id)))
        perdu.push("ses leviers (Options)");
      var armes = state.inv.objets.filter(function (o) { return o.arme && o.arme.comp === item.id; });
      if (armes.length) perdu.push("le lien de " + armes.length + (armes.length > 1 ? " armes" : " arme"));
      function retire() {
        state.comps = state.comps.filter(function (c) { return c.id !== item.id; });
        // Les réglages actuels sont rangés par levier, boîte puis compétence.
        // Ne pas toucher aux réglages des autres compétences.
        Object.keys(state.compsLeviers || {}).forEach(function (nom) {
          var boites = state.compsLeviers[nom];
          Object.keys(boites).forEach(function (boite) {
            delete boites[boite][item.id];
            if (!Object.keys(boites[boite]).length) delete boites[boite];
          });
          if (!Object.keys(boites).length) delete state.compsLeviers[nom];
        });
        // Compatibilité avec un ancien import, sans exiger ces tables disparues.
        ["compsMod", "compsMod2", "compsForce", "compsDesForce"].forEach(function (k) {
          if (state[k]) delete state[k][item.id];
        });
        state.inv.objets.forEach(function (o) { if (o.arme && o.arme.comp === item.id) o.arme.comp = ""; });
        refresh();
        if (opts.onDrop) opts.onDrop();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      }
      if (!perdu.length) { retire(); return; }
      confirmer("Retirer une compétence",
                "Supprimer « " + (item.nom || "sans nom") + " » effacera aussi " + perdu.join(", ") + ".",
                "Supprimer", retire);
    });
    row.appendChild(nameBox);
    var rangBox = el("span", "pc-comp-rangs");
    rangBox.appendChild(del);

    // LA BARRE DE RANGS : un cran par rang, du non-initié au Rang Max. Le
    // dégradé monte avec le rang ; l'infobulle porte le rang COMPLET (dés,
    // bonus, prix), qui est la seule forme sous laquelle un barème paraît.
    function applyRang(cible) {
      var c = compDe(item.id);
      if (!c || cible === compRang(c)) return;
      // Les rangs offerts ne coûtent rien et ne comptent pas dans la limite.
      var off = compOffertsBrut(c);
      var deltaXp = xpJusque(Math.max(cible, off)) - xpJusque(Math.max(compRang(c), off));
      var deltaRup = ruptureJusque(cible) - ruptureJusque(compRang(c));
      var lim = limiteRangs("competences");
      if (lim !== null && cible > compRang(c) &&
          compRangsComptes() + rangsComptesEntre(compRang(c), cible, off) > lim) {
        flash("Limite de rangs de compétence atteinte."); return;
      }
      if (deltaXp > 0 && xpRestant() < deltaXp) { flash("XP insuffisant."); return; }
      if (deltaRup > 0 && ruptureRestante() < deltaRup) { flash("Aucun point de rupture disponible."); return; }
      // REDESCENDRE REND l'XP et le point de rupture, et DESCENDRE AU RANG 0 NE
      // SUPPRIME PAS L'ENTRÉE : ici l'entrée EST la compétence que le joueur a
      // nommée, la perdre effacerait son travail.
      c.rang = cible;
      refresh();
    }
    var bar = el("span", "pc-stadebar");
    var segs = [];
    rangs().forEach(function (r, i) {
      var sg = el("button", "seg s" + i, rangInitiale(r));
      sg.type = "button";
      sg.title = rangTitre(r);
      sg.addEventListener("click", function () {
        if (!isEdit(mod)) return;   // construction : mode édition requis
        applyRang(i);
      });
      bar.appendChild(sg);
      segs.push(sg);
    });
    rangBox.appendChild(bar);
    row.appendChild(rangBox);

    // Le total est un BOUTON de jet : c'est le bonus de rang plus les
    // modificateurs, et le clic lance les dés d'action que le rang autorise.
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      var c = compDe(item.id) || item;
      var n = compDes(c);
      doRoll(c.nom || "Compétence", compBonus(c), deDe(n), true, n);
    });
    row.appendChild(total);

    if (mod === "comps") cibleComp(row, function (e) {
      if (dragComp.type !== "comp" || dragComp.id === item.id) return false;
      return e.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2 ? "avant" : "apres";
    }, function (e, position) {
      deplaceComp(dragComp.id, item.id, position === "avant");
    });

    reg.push(function () {
      var c = compDe(item.id) || item;
      var rang = compRang(c);
      var regle = levierRegleDe(lireComp("bonus", c.id));
      var desRegle = levierRegleDe(lireComp("des", c.id));
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= rang);
        // « cur » MARQUE le rang courant et n'a AUCUNE règle de style : c'est
        // un REPÈRE lisible de l'extérieur, pas une décoration. Un audit l'a
        // retirée en JJK pour cette raison, et quatre sondes sont tombées. Une
        // marque sans peinture reste une marque.
        sg.classList.toggle("cur", i === rang);
      });
      var b = compBonus(c), n = compDes(c);
      total.textContent = sign(b);
      total.classList.toggle("zero", !rang && !regle);
      total.classList.toggle("adj", regle || desRegle);
      var info = rangInfo(rang);
      total.title = chaineTexteDe(lireComp("bonus", c.id),
                                  "rang " + rang + " (" + (info.nom || "?") + ")",
                                  sign(num(info.bonus, 0))) +
        (regle ? " = " + sign(b) : "") +
        (desRegle ? " · dés " + n : "") +
        " — clic : lancer " + deDe(n) + " " + sign(b);
      label.title = (c.nom || "Sans nom") + " · rang " + rang +
                    (info.nom ? " (" + info.nom + ")" : "") +
                    " · " + (compGroupe(c) || "sans groupe");
    });
    return row;
  }
  // Le repli est local à cette fiche ouverte ; aucun attribut de personnage.
  var compReplies = Object.create(null);
  var dragComp = null;
  function finDragComp() {
    dragComp = null;
    if (!compBox) return;
    Array.prototype.forEach.call(compBox.querySelectorAll(".pris, .avant, .apres, .depot"), function (n) {
      ["pris", "avant", "apres", "depot"].forEach(function (c) { n.classList.remove(c); });
    });
  }
  function poigneeComp(titre, lire, source) {
    var h = el("button", "pc-comp-drag pc-edit-only", "⠿");
    h.type = "button"; h.title = titre; h.setAttribute("aria-label", titre);
    h.draggable = true;
    h.addEventListener("dragstart", function (e) {
      e.stopPropagation();
      if (!isEdit("comps")) { e.preventDefault(); return; }
      dragComp = lire(); source.classList.add("pris");
      e.dataTransfer.setData("text/plain", "owd-competences");
      e.dataTransfer.effectAllowed = "move";
    });
    h.addEventListener("dragend", function (e) { e.stopPropagation(); finDragComp(); });
    return h;
  }
  function cibleComp(n, position, action) {
    n.addEventListener("dragover", function (e) {
      if (!isEdit("comps") || !dragComp) return;
      var p = position(e); if (!p) return;
      e.preventDefault(); e.stopPropagation();
      ["avant", "apres", "depot"].forEach(function (c) { n.classList.toggle(c, c === p); });
      e.dataTransfer.dropEffect = "move";
    });
    n.addEventListener("dragleave", function (e) {
      if (e.relatedTarget && n.contains(e.relatedTarget)) return;
      ["avant", "apres", "depot"].forEach(function (c) { n.classList.remove(c); });
    });
    n.addEventListener("drop", function (e) {
      if (!isEdit("comps") || !dragComp) return;
      var p = position(e); if (!p) return;
      e.preventDefault(); e.stopPropagation();
      action(e, p); finDragComp(); rebuildComps();
      if (optCompsRebuild) optCompsRebuild();
    });
  }
  function groupesComps() {
    var ordre = [];
    state.comps.forEach(function (c) { var g = compGroupe(c); if (ordre.indexOf(g) < 0) ordre.push(g); });
    return ordre;
  }
  function deplaceComp(id, cibleId, avant) {
    var m = compDeDans(state.comps, id), cible = compDeDans(state.comps, cibleId);
    if (!m || !cible || m === cible) return;
    m.groupe = compGroupe(cible);
    state.comps.splice(state.comps.indexOf(m), 1);
    var k = state.comps.indexOf(cible);
    state.comps.splice(avant ? k : k + 1, 0, m);
    save();
  }
  function compVersGroupe(id, groupe) {
    var m = compDeDans(state.comps, id); if (!m || compGroupe(m) === groupe) return;
    state.comps.splice(state.comps.indexOf(m), 1);
    m.groupe = groupe;
    var k = state.comps.length;
    state.comps.forEach(function (c, i) { if (compGroupe(c) === groupe) k = i + 1; });
    state.comps.splice(k, 0, m); save();
  }
  function deplaceGroupe(groupe, cible, avant) {
    var ordre = groupesComps(), from = ordre.indexOf(groupe);
    if (groupe === cible || from < 0 || ordre.indexOf(cible) < 0) return;
    ordre.splice(from, 1); ordre.splice(ordre.indexOf(cible) + (avant ? 0 : 1), 0, groupe);
    var resultat = [];
    ordre.forEach(function (g) { state.comps.forEach(function (c) { if (compGroupe(c) === g) resultat.push(c); }); });
    state.comps = resultat; save();
  }
  function compDeDans(liste, id) {
    var out = null;
    liste.forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }

  var compBox = null;
  var compSearch = null, compInvestiesChip = null;
  var compFilter = "";
  var compOnly = false;      // « Investies » : éteinte par défaut — l'auteur veut TOUT voir
  // L'outil de recherche se coupe depuis l'onglet Options. Coupé, il DISPARAÎT
  // et cesse d'agir : un filtre invisible qui masque encore des lignes est un
  // piège. Réglage d'AFFICHAGE, donc dans le vrai localStorage du navigateur,
  // jamais dans le personnage.
  var FILTRES = { texte: "owd-filtre-texte" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? pli(v) : ""; }

  function rebuildComps() {
    if (!compBox) return;
    if (compSearch) compSearch.value = compFilter;
    if (compInvestiesChip) compInvestiesChip.classList.toggle("on", compOnly);
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var head = el("div", "pc-comp-row head");
    head.appendChild(el("span", null, "Compétence"));
    head.appendChild(el("span", "pc-comp-rang-head", "Rang"));
    head.appendChild(el("span", null, "Total"));
    compBox.appendChild(head);
    var flt = filtreDe(compFilter);
    var liste = state.comps.filter(function (c) {
      if (compOnly && !compInvestie(c)) return false;
      if (flt && pli(c.nom).indexOf(flt) < 0 && pli(c.groupe).indexOf(flt) < 0) return false;
      return true;
    });
    if (!liste.length) {
      // le message NOMME le filtre coupable : sans cela, le joueur cherche une
      // compétence qu'il a bien saisie et qu'un réglage masque
      compBox.appendChild(el("div", "pc-empty",
        !state.comps.length
          ? (isEdit("comps") ? "Aucune compétence : la ligne du bas en ajoute."
                             : "Aucune compétence. Le rouage en ajoute.")
          : flt ? "Aucune compétence ne correspond à la recherche."
                : "Aucune compétence investie : la puce « Investies » masque les autres."));
    } else {
      // Par GROUPE, dans l'ordre où les groupes apparaissent : c'est le
      // rangement du joueur, la fiche n'en impose aucun et n'en trie aucun.
      groupesComps().forEach(function (g) {
        var visibles = liste.filter(function (c) { return compGroupe(c) === g; });
        if (!visibles.length) return;
        var groupe = el("section", "pc-comp-groupe"); groupe.dataset.groupe = g;
        var titre = el("div", "pc-comp-champ");
        titre.appendChild(poigneeComp("Déplacer le groupe", function () { return { type: "groupe", groupe: g }; }, groupe));
        titre.appendChild(el("span", "pc-comp-groupe-nom", g || "Sans groupe"));
        var bouton = el("button", "pc-comp-repli", compReplies[g] ? "▸" : "▾");
        bouton.type = "button";
        bouton.setAttribute("aria-expanded", String(!compReplies[g]));
        bouton.setAttribute("aria-label", (compReplies[g] ? "Déplier " : "Replier ") + (g || "Sans groupe"));
        var toggle = function () { compReplies[g] = !compReplies[g]; rebuildComps(); };
        bouton.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
        titre.addEventListener("dblclick", function (e) {
          if (e.target.closest("button")) return;
          e.preventDefault(); toggle();
        });
        titre.appendChild(bouton); groupe.appendChild(titre);
        cibleComp(titre, function (e) {
          if (dragComp.type === "comp") return "depot";
          if (dragComp.groupe === g) return false;
          var r = titre.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? "avant" : "apres";
        }, function (e, p) {
          if (dragComp.type === "comp") compVersGroupe(dragComp.id, g);
          else deplaceGroupe(dragComp.groupe, g, p === "avant");
        });
        // Toute la surface du groupe reçoit un groupe déplacé, y compris replié.
        cibleComp(groupe, function (e) {
          if (dragComp.type !== "groupe" || dragComp.groupe === g) return false;
          var r = groupe.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? "avant" : "apres";
        }, function (e, p) { deplaceGroupe(dragComp.groupe, g, p === "avant"); });
        if (!compReplies[g]) visibles.forEach(function (c, i) {
          groupe.appendChild(compRow(c, i % 2 === 1, { module: "comps", reg: compHooks }));
        });
        compBox.appendChild(groupe);
      });
    }
    if (isEdit("comps") && groupesComps().indexOf("") < 0 && state.comps.length) {
      var libre = el("div", "pc-comp-sans-groupe", "Déposer ici pour retirer le groupe");
      cibleComp(libre, function () { return dragComp.type === "comp" ? "depot" : false; },
        function () { compVersGroupe(dragComp.id, ""); });
      compBox.appendChild(libre);
    }
    // AJOUT, en édition seulement : un nom, un groupe, et c'est tout.
    if (isEdit("comps")) {
      var add = el("div", "pc-comp-add");
      var nom = el("input");
      nom.type = "text"; nom.placeholder = "Nouvelle compétence…";
      var grp = el("select", "pc-select"); grp.setAttribute("aria-label", "Groupe de la nouvelle compétence");
      var choix = el("option", null, "Sans groupe"); choix.value = "sans"; grp.appendChild(choix);
      var existants = groupesComps().filter(function (g) { return g !== ""; });
      existants.forEach(function (g, i) { var o = el("option", null, g); o.value = "g" + i; grp.appendChild(o); });
      var nouveau = el("option", null, "Nouveau groupe…"); nouveau.value = "nouveau"; grp.appendChild(nouveau);
      var nouveauNom = el("input"); nouveauNom.type = "text";
      nouveauNom.placeholder = "Nom du nouveau groupe"; nouveauNom.setAttribute("aria-label", "Nom du nouveau groupe");
      nouveauNom.hidden = true;
      grp.addEventListener("change", function () { nouveauNom.hidden = grp.value !== "nouveau"; if (!nouveauNom.hidden) nouveauNom.focus(); });
      add.appendChild(nom);
      add.appendChild(grp);
      add.appendChild(nouveauNom);
      // Une EXPRESSION de fonction, pas une déclaration : une déclaration dans
      // un bloc est refusée par le mode strict d'ES5, que le vieux moteur d'une
      // iframe Roll20 peut encore appliquer à la lettre.
      var ajoute = function () {
        var n = capFirst(nom.value.trim());
        if (!n) return;
        // refus d'un doublon, insensible à la casse ET aux accents
        var doublon = false;
        state.comps.forEach(function (c) { if (pli(c.nom) === pli(n)) doublon = true; });
        if (doublon) { flash("« " + n + " » existe déjà."); return; }
        var g = grp.value === "nouveau" ? nouveauNom.value.trim() : grp.value === "sans" ? "" : existants[Number(grp.value.slice(1))];
        if (grp.value === "nouveau" && !g) { nouveauNom.focus(); return; }
        state.comps.push({ id: uid("c"), nom: n, groupe: g, rang: 0 });
        compReplies[g] = false;
        nom.value = "";
        // ne jamais ajouter une compétence qui resterait invisible
        if (compOnly) compOnly = false;
        if (filtreDe(compFilter)) compFilter = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      };
      nom.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajoute(); } });
      nouveauNom.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ajoute(); } });
      add.appendChild(miniBtn("+", "Ajouter cette compétence", ajoute));
      compBox.appendChild(add);
    }
    refresh();
  }
  function buildComps() {
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    var tools = el("div", "pc-comp-tools");
    var l1 = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, "Filtrer les compétences…", rebuildComps);
    compSearch = search;
    if (search) l1.appendChild(search);
    // LE FILTRE ET LA PUCE SUR UNE MÊME LIGNE, à parts égales : la rangée est
    // une grille à colonnes 1fr, chacun y prend sa moitié
    var puce = el("span", "pc-chip", "Investies");
    puce.setAttribute("data-consultation","1");
    compInvestiesChip = puce;
    puce.title = "N'afficher que les compétences où un rang, un modificateur ou un forçage est posé.";
    puce.classList.toggle("on", compOnly);
    puce.addEventListener("click", function () {
      compOnly = !compOnly;
      puce.classList.toggle("on", compOnly);
      rebuildComps();
    });
    l1.appendChild(puce);
    tools.appendChild(l1);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }

  // ---- 9. Techniques (pleine largeur, sous les trois colonnes) ----
  // LES RANGS D'UNE TECHNIQUE LUI APPARTIENNENT : les règles le disent, la
  // fiche ne les barème donc pas. Elle compte le nombre de rangs pris, le prix
  // que le joueur a payé et les points de rupture engagés ; ce que chaque rang
  // apporte s'écrit en texte libre.
  function buildTechniques() {
    var b = block("Techniques", null, "techniques", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);
    // Un seul rappel appartient au module. Les lignes rebâties remplacent
    // leurs rappels au lieu d’en laisser sur les anciennes cartes.
    var techHooks = [];
    hooks.push(function () { techHooks.forEach(function (fn) { fn(); }); });

    function carte(t) {
      var card = el("div", "pc-av");
      card.dataset.syncEntity = t.id;
      var head = el("div", "pc-av-head");
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de la technique"; nm.value = t.nom || "";
      nm.addEventListener("input", function () { t.nom = nm.value; save(); });
      head.appendChild(nm);

      // la barre de rangs de CETTE technique : autant de crans qu'elle a de
      // rangs, sans nom ni prix — ils lui appartiennent
      var bar = el("span", "pc-stadebar");
      var segs = [];
      for (var i = 0; i <= t.rangs; i++) (function (i) {
        var sg = el("button", "seg s" + clamp(i, 0, 5), String(i));
        sg.type = "button";
        sg.title = "Rang " + i + " de « " + (t.nom || "cette technique") + " »";
        sg.addEventListener("click", function () {
          if (!isEdit("techniques")) return;
          var lim = limiteRangs("techniques");
          if (lim !== null && i > t.rang &&
              techRangsComptes() + rangsComptesEntre(t.rang, i, num(t.offert, 0)) > lim) {
            flash("Limite de rangs de technique atteinte.");
            return;
          }
          t.rang = i;
          refresh();
          rendre();
        });
        bar.appendChild(sg);
        segs.push(sg);
      })(i);
      head.appendChild(bar);

      var chip = el("span", "pc-roll-chip", "Jet");
      chip.title = "Lancer les dés d'action de cette technique";
      chip.addEventListener("click", function () {
        var n = desTechnique();
        doRoll(t.nom || "Technique", 0, desQuery(n) + "d" + faces(), true, n);
      });
      head.appendChild(chip);
      head.appendChild(chatBtn(
        function () { return "Technique — " + (t.nom || "sans nom"); },
        function () {
          return [["Rang", t.rang + " / " + t.rangs], ["", t.desc]];
        }));
      head.appendChild(miniBtn("✕", "Retirer cette technique", function () {
        function retire() {
          state.techniques = state.techniques.filter(function (x) { return x.id !== t.id; });
          refresh();
          rendre();
        }
        if (!String(t.nom || "").trim() && !String(t.desc || "").trim() && !t.xp) { retire(); return; }
        confirmer("Retirer une technique",
                  "Retirer « " + (t.nom || "cette technique") + " » ? Son coût en XP et son point de " +
                  "rupture reviendront au personnage.",
                  "Retirer", retire);
      }, "danger pc-edit-only"));
      card.appendChild(head);

      var d = el("textarea", "pc-notes pc-edit-field");
      d.rows = 3;
      d.placeholder = "Ce que chaque rang apporte";
      d.value = t.desc || "";
      d.addEventListener("input", function () { t.desc = d.value; save(); });
      card.appendChild(d);

      var ligne = el("div", "pc-arme-line");
      function nombre(libelle, lire, ecrire, min, max, titre, large) {
        var inp = el("input", "pc-edit-field");
        inp.type = "number"; inp.step = "1";
        if (min !== null) inp.min = String(min);
        inp.value = lire();
        inp.title = titre;
        inp.addEventListener("input", function () {
          var v = parseInt(inp.value, 10);
          ecrire(isFinite(v) ? clamp(v, min, max) : min);
          refresh();
        });
        techHooks.push(function () { if (document.activeElement !== inp) inp.value = lire(); });
        return fld(libelle, inp, large ? "w" : null);
      }
      ligne.appendChild(nombre("Rangs", function () { return t.rangs; },
        function (v) { t.rangs = v; if (t.rang > v) t.rang = v; rendre(); }, 1, 20,
        "Combien de rangs cette technique possède — les règles laissent chaque technique en décider."));
      ligne.appendChild(nombre("XP", function () { return t.xp; },
        function (v) { t.xp = v; }, 0, 99999,
        "Ce que cette technique a coûté — aucune règle ne le fixe, c'est la décision de la table."));
      ligne.appendChild(nombre("Offerts", function () { return num(t.offert, 0); },
        function (v) { t.offert = Math.min(v, t.rangs); }, 0, 20, "Rangs offerts"));
      ligne.appendChild(nombre("Rupture", function () { return t.rupture; },
        function (v) { t.rupture = v; }, 0, 99,
        "Combien de points de rupture cette technique a demandés."));
      card.appendChild(ligne);

      techHooks.push(function () {
        segs.forEach(function (sg, i) {
          sg.classList.toggle("on", i <= t.rang);
          sg.classList.toggle("cur", i === t.rang);
        });
      });
      return card;
    }

    function rendre() {
      techHooks = [];
      box.innerHTML = "";
      state.techniques.forEach(function (t) { box.appendChild(carte(t)); });
      if (!state.techniques.length) box.appendChild(el("div", "pc-empty", "Aucune technique."));
      box.appendChild(miniBtn("+ Ajouter une technique", null, function () {
        state.techniques.push({ id: uid("t"), nom: "", rang: 0, rangs: 1, xp: 0, offert: 0, rupture: 0, desc: "" });
        refresh();
        rendre();
      }, "pc-edit-only"));
      applyEdit(b, "techniques");
      techHooks.forEach(function (fn) { fn(); });
    }
    rendre();
    return b;
  }

  // ---------- Bio et Notes ----------
  // Les deux seules zones de PROSE LIBRE de la fiche. `state.background` et
  // `state.notes` existaient déjà — normalisés avec les champs d'identité,
  // initialisés par owd-attr-map.js et mappés vers les attributs Roll20
  // `owd_background` / `owd_notes` — mais AUCUN module ne les lisait ni ne les
  // écrivait : le joueur n'avait nulle part où écrire son personnage, et deux
  // champs morts faisaient l'aller-retour à vide dans les Attributes, dans
  // l'export et dans la migration. C'est le modèle de JJK
  // (buildBackground / buildNotes), repris tel quel, et le dernier trou de
  // parité avec elle.
  //
  // ILS VIVENT EN BAS DE L'ONGLET FICHE, sous les Techniques : Outward n'a que
  // trois onglets, il n'existe donc aucun onglet Bio où les ranger, et l'onglet
  // Options ne porte que des réglages — jamais du personnage. La colonne
  // « bas » leur donne la pleine largeur, seule mesure où de la prose se lit.
  // Ce sont DEUX modules et non un seul : chacun se déplace, se replie et se
  // masque de son côté, et une table qui ne veut pas d'histoire écrite peut
  // retirer la Bio sans perdre son carnet.
  function buildBio() {
    // Rouage : l'histoire s'écrit à la création et se relit ensuite. Le champ
    // se verrouille donc comme les autres champs de conception, contre la
    // frappe distraite au milieu d'une partie.
    // L'identifiant d'édition est « bg », celui du module, et non « bio » :
    // block() en fait le data-module du bloc, et monteModules ne le repose que
    // s'il manque (« if (!e.dataset.module) »). Deux mots différents, et le
    // bloc serait attribué à un module qui n'existe pas — les sondes, le
    // museau d'un module en panne et le plan chercheraient tous « bg » sans
    // jamais le trouver.
    var b = block("Bio", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 7;
    bg.placeholder = "D'où il vient, ce qu'il fuit, ce qu'il doit.";
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    // Le champ ne se réécrit JAMAIS pendant la frappe : c'est le motif de tous
    // les champs du fichier. Sans cette garde, une hydratation ou un import
    // arrivé en cours de phrase remettrait la valeur enregistrée et renverrait
    // le curseur au début.
    hooks.push(function () { if (document.activeElement !== bg) bg.value = state.background || ""; });
    b.appendChild(bg);
    // le rouage peut être déjà ouvert au remontage : sans cet appel le champ
    // resterait grisé jusqu'au premier refresh()
    applyEdit(b, "bg");
    return b;
  }
  // ---------- avantages ----------
  // LA MÊME CARTE QUE DANS MIA : le nom, puis la description. Outward y ajoute
  // le COÛT, en points d'avantage, à droite du nom : c'est lui que l'en-tête
  // additionne contre les points que donne le livre.
  //
  // UN AVANTAGE EST DU TEXTE : { nom, cout, desc } et rien d'autre. Aucune
  // conséquence chiffrée n'entre par là — elle passe par un réglage de
  // l'onglet Options, qui est le seul endroit où un nombre se règle.
  function buildAvantages() {
    var b = block("Avantages", null, "avantages");
    var box = el("div");
    b.appendChild(box);
    function rendu() {
      box.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var card = el("div", "pc-av");
        card.dataset.syncEntity = a.id;
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.nom || "";
        // UN NOM S'ENREGISTRE SANS RAFRAÎCHIR : rien ne se calcule à partir de
        // lui, et refresh() reconstruirait la liste sous les doigts.
        n.addEventListener("input", function () { a.nom = n.value; save(); });
        head.appendChild(n);
        var c = el("input", "cout pc-edit-field");
        c.type = "text"; c.inputMode = "numeric"; c.placeholder = "0";
        c.value = a.cout ? fmtP(a.cout) : "";
        c.title = "Coût, en points d'avantage";
        c.addEventListener("input", function () { a.cout = pnum(c.value); save(); refresh(); });
        c.addEventListener("blur", function () { c.value = a.cout ? fmtP(a.cout) : ""; });
        head.appendChild(c);
        head.appendChild(chatBtn(
          function () { return "Avantage — " + (a.nom || "sans nom"); },
          function () { return [["Coût", a.cout ? fmtP(a.cout) : ""], ["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () {
          state.avantages.splice(i, 1);
          rendu();
          refresh();
        }, "danger pc-edit-only"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 3;
        d.placeholder = "Description";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        card.appendChild(d);
        box.appendChild(card);
      });
      if (!state.avantages.length) box.appendChild(el("div", "pc-empty", "Aucun avantage."));
      box.appendChild(miniBtn("+ Ajouter un avantage", null, function () {
        state.avantages.push({ id: uid("av"), nom: "", cout: 0, desc: "" });
        rendu();
        refresh();
      }, "pc-edit-only"));
      // LA LISTE SE REFAIT ENTIÈREMENT à chaque ajout et à chaque retrait : les
      // cartes neuves naissent hors du mode courant, et c'est applyEdit qui les
      // y remet.
      applyEdit(b, "avantages");
    }
    rendu();
    return b;
  }
  // Un seul bloc Notes ; aucun attribut n'est créé par message.
  function normaliseNotes(value,strict) {
    if(typeof value==='string'||value==null){var text=value==null?'':value;return {format:1,messages:text.length?[{id:'legacy',at:0,text:text,mode:'plain'}]:[]};}
    if(!value||value.format!==1||!Array.isArray(value.messages)){if(strict)throw Error('Format des Notes illisible. Exportez la fiche avant de le remplacer.');return value;}
    var ids=Object.create(null),invalid=false;
    value.messages.forEach(function(m){
      if(!m||typeof m.id!=='string'||!m.id||ids[m.id]||['__proto__','prototype','constructor'].indexOf(m.id)>=0||typeof m.text!=='string'){invalid=true;return;}
      ids[m.id]=true;if(m.mode!=='markdown')m.mode='plain';if(!Number.isFinite(m.at)||m.at<0||m.at>8640000000000000)m.at=0;
    });if(invalid&&strict)throw Error("Message de Notes illisible.");return value;
  }
  var notesMarkdown=null;
  function moteurNotesMarkdown(){if(!notesMarkdown&&window.markdownit)notesMarkdown=window.markdownit({html:false,breaks:true,linkify:true});return notesMarkdown;}
  function notesTexteRecherche(message){
    var md=moteurNotesMarkdown(),words=[];
    function visit(tokens){tokens.forEach(function(t){if(t.children)visit(t.children);else if(['text','code_inline','code_block','fence'].indexOf(t.type)>=0)words.push(t.content);else if(t.type==='softbreak'||t.type==='hardbreak'||t.block&&t.nesting===-1)words.push(' ');});}
    if(message.mode==='markdown'&&md){visit(md.parse(message.text,{}));return words.join('');}return message.text;
  }
  function notesPlie(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function notesRendu(target,text,mode){
    target.classList.toggle('pc-notes-markdown',mode==='markdown');var md=moteurNotesMarkdown();
    if(mode!=='markdown'||!md||!window.DOMPurify){target.textContent=text;return;}
    target.innerHTML=window.DOMPurify.sanitize(md.render(text),{ALLOWED_TAGS:['p','br','hr','h1','h2','h3','h4','h5','h6','strong','em','s','ul','ol','li','blockquote','pre','code','a','img','table','thead','tbody','tr','th','td'],ALLOWED_ATTR:['href','src','alt','title','start','align']});
    Array.prototype.forEach.call(target.querySelectorAll('a'),function(a){a.target='_blank';a.rel='noopener noreferrer';});
    Array.prototype.forEach.call(target.querySelectorAll('img'),function(img){img.loading='lazy';img.decoding='async';});
  }
  var notesVues=Object.create(null);
  function buildNotes(){
    var vueKey=(location.hash.match(/(?:^#|&)c=([^&]+)/)||[])[1]||state.name||"local";
    var remembered=notesVues[vueKey]||null;
    var b=block('Notes');b.classList.add('pc-notes-chat');
    var searchBar=el('div','pc-notes-search'),search=el('input');search.type='search';search.placeholder='Rechercher dans les notes…';search.setAttribute('aria-label','Rechercher dans toutes les notes');
    var clear=miniBtn('×','Effacer la recherche',function(){search.value='';recherche();search.focus();});searchBar.appendChild(search);searchBar.appendChild(clear);b.appendChild(searchBar);
    var count=el('div','pc-notes-count');count.setAttribute('role','status');b.appendChild(count);
    var history=el('div','pc-notes-history'),messages=el('div','pc-notes-messages');history.tabIndex=0;history.setAttribute('aria-label','Historique des notes');history.appendChild(messages);b.appendChild(history);
    var latest=miniBtn('Dernières notes',null,function(){resetWindow();render(true);});latest.classList.add('pc-notes-latest');latest.hidden=true;b.appendChild(latest);
    var compose=el('div','pc-notes-compose'),input=el('textarea','pc-notes pc-notes-input'),controls=el('div','pc-notes-controls'),preview=el('div','pc-notes-body pc-notes-preview');
    input.rows=3;input.placeholder='Écrire une note…';input.setAttribute('aria-label','Nouvelle note');input.title='Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne';preview.hidden=true;
    compose.appendChild(input);compose.appendChild(preview);compose.appendChild(controls);b.appendChild(compose);
    input.value=remembered?remembered.text:'';search.value=remembered?remembered.search:'';
    var mode=remembered?remembered.mode:'plain',previewing=false,rows=[],results=[],from=0,to=0,lastValue=null,lastKey=null,query=notesPlie(search.value),editing=remembered?remembered.editing:null,following=true,dead=false,timer=null,scrollFrame=null;
    var searchCache=remembered?remembered.searchCache:Object.create(null),drafts=remembered?remembered.drafts:Object.create(null),BATCH=50,MAX=100;
    if(!ficheModifiable()&&editing){drafts[editing.id]=editing;editing=null;}
    function modes(parent,get,set){
      var group=el('div','pc-notes-modes'),buttons=[];group.setAttribute('role','group');group.setAttribute('aria-label','Format du message');
      [['plain','Brut'],['markdown','Markdown']].forEach(function(pair){var button=miniBtn(pair[1],null,function(){set(pair[0]);sync();});buttons.push([button,pair[0]]);group.appendChild(button);});
      function sync(){buttons.forEach(function(pair){pair[0].setAttribute('aria-pressed',String(get()===pair[1]));});}sync();parent.appendChild(group);
    }
    modes(controls,function(){return mode;},function(v){mode=v;updatePreview();});
    var previewButton=miniBtn('Aperçu',null,function(){previewing=!previewing;updatePreview();});controls.appendChild(previewButton);
    var send=miniBtn('Envoyer',null,envoie,'primary');controls.appendChild(send);
    function updatePreview(){previewButton.hidden=mode!=='markdown';preview.hidden=!previewing||mode!=='markdown';input.hidden=!preview.hidden;previewButton.setAttribute('aria-pressed',String(!preview.hidden));previewButton.textContent=preview.hidden?'Aperçu':'Écrire';if(!preview.hidden)notesRendu(preview,input.value,mode);send.disabled=!ficheModifiable()||!input.value.trim();}
    function data(){return normaliseNotes(state.notes,true);}
    function resetWindow(){to=results.length;from=Math.max(0,to-BATCH);following=true;}
    function filter(){results=query?rows.filter(function(m){var c=searchCache[m.id];if(!c||c.text!==m.text||c.mode!==m.mode)c=searchCache[m.id]={text:m.text,mode:m.mode,plain:notesPlie(notesTexteRecherche(m))};return c.plain.indexOf(query)>=0;}):rows;}
    function recherche(){clearTimeout(timer);query=notesPlie(search.value);filter();resetWindow();render(true);}
    search.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(recherche,150);});
    search.addEventListener('keydown',function(e){if(e.key==='Escape'){search.value='';recherche();}});
    function redrawData(forceBottom){
      var value=state.notes;if(value===lastValue&&!forceBottom)return;
      var d=data(),key=JSON.stringify(d.messages);lastValue=value;if(key===lastKey&&!forceBottom)return;
      var nearBottom=history.scrollHeight-history.clientHeight-history.scrollTop<45,first=results[from]&&results[from].id;
      lastKey=key;rows=d.messages.slice().sort(function(a,c){return a.at-c.at||(a.id<c.id?-1:a.id>c.id?1:0);});filter();
      var live=Object.create(null);rows.forEach(function(m){live[m.id]=true;});Object.keys(searchCache).forEach(function(id){if(!live[id])delete searchCache[id];});
      if(forceBottom||following&&nearBottom)resetWindow();else{var i=results.findIndex(function(m){return m.id===first;});from=i<0?Math.min(from,Math.max(0,results.length-BATCH)):i;to=Math.min(results.length,Math.max(from+BATCH,Math.min(to,from+MAX)));}
      render(forceBottom||following&&nearBottom);
    }
    function commit(){state.notes=data();save();lastValue=null;redrawData(false);}
    function ajoute(text,format){clearTimeout(timer);search.value='';query='';var d=data();d.messages.push({id:'n-'+uid()+'-'+Math.random().toString(36).slice(2),at:Date.now(),text:text,mode:format});state.notes=d;save();lastValue=null;redrawData(true);}
    function envoie(){if(!ficheModifiable()||!input.value.trim())return;ajoute(input.value,mode);input.value='';previewing=false;updatePreview();input.focus();}
    input.addEventListener('input',updatePreview);
    input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();envoie();}});
    function record(id){return data().messages.find(function(m){return m.id===id;});}
    function version(m){return m?JSON.stringify([m.text,m.mode]):null;}
    function commence(m){if(!ficheModifiable())return;if(editing&&editing.id!==m.id)drafts[editing.id]=editing;editing=drafts[m.id]||{id:m.id,text:m.text,mode:m.mode,base:version(m)};render(false);var area=messages.querySelector('.pc-notes-editor textarea');if(area)area.focus();}
    function edition(box,m){
      var draft=editing,editor=el('div','pc-notes-editor'),area=el('textarea','pc-notes'),actions=el('div','pc-notes-controls');area.rows=4;area.value=draft.text;area.setAttribute('aria-label','Modifier la note');editor.appendChild(area);editor.appendChild(actions);box.appendChild(editor);
      area.addEventListener('input',function(){draft.text=area.value;});modes(actions,function(){return draft.mode;},function(v){draft.mode=v;});
      actions.appendChild(miniBtn('Annuler',null,function(){delete drafts[m.id];editing=null;render(false);}));
      function saveEdit(){if(!ficheModifiable())return;var current=record(m.id);if(version(current)!==draft.base){flash('Cette note a changé ailleurs ou a été supprimée. Votre brouillon est conservé.');warning.hidden=false;return;}if(!draft.text.trim()){flash('Une note vide ne peut pas être enregistrée.');return;}current.text=draft.text;current.mode=draft.mode;delete drafts[m.id];editing=null;commit();}
      actions.appendChild(miniBtn('Enregistrer',null,saveEdit,'primary'));
      area.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();delete drafts[m.id];editing=null;render(false);}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!e.isComposing){e.preventDefault();saveEdit();}});
      var warning=el('div','pc-notes-conflict');warning.hidden=version(record(m.id))===draft.base;warning.appendChild(el('p',null,'Cette note a changé ailleurs. Vous pouvez conserver votre texte dans une nouvelle note.'));
      warning.appendChild(miniBtn('Envoyer comme nouvelle note',null,function(){if(!draft.text.trim())return;delete drafts[m.id];editing=null;ajoute(draft.text,draft.mode);}));editor.appendChild(warning);
    }
    function page(direction){if(direction<0){from=Math.max(0,from-BATCH);to=Math.min(to,from+MAX);}else{to=Math.min(results.length,to+BATCH);from=Math.max(from,to-MAX);}following=false;render(false);}
    function render(bottom){
      if(dead)return;
      var anchor=null,offset=0,top=history.getBoundingClientRect().top,scroll=history.scrollTop;
      Array.prototype.some.call(messages.querySelectorAll('.pc-note-message'),function(n){if(n.getBoundingClientRect().bottom>top){anchor=n.dataset.id;offset=n.getBoundingClientRect().top;return true;}return false;});
      var active=document.activeElement,caret=active&&active.closest&&active.closest('.pc-notes-editor')?{start:active.selectionStart,end:active.selectionEnd}:null;
      messages.textContent='';if(from>0)messages.appendChild(miniBtn('Notes précédentes ('+from+')',null,function(){page(-1);},'pc-notes-older'));
      if(!results.length)messages.appendChild(el('div','pc-notes-empty',query?'Aucune note trouvée.':'Aucune note pour le moment.'));
      results.slice(from,to).forEach(function(m){
        var message=el('article','pc-note-message');message.dataset.id=m.id;var head=el('div','pc-note-head'),time=el('time');
        if(m.at){var date=new Date(m.at);time.dateTime=date.toISOString();time.textContent=date.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});}else time.textContent='Anciennes notes';head.appendChild(time);
        var tools=el('div','pc-note-actions');tools.appendChild(miniBtn('Modifier',null,function(){commence(m);}));
        tools.appendChild(miniBtn('Supprimer',null,function(){var before=version(m);confirmer('Supprimer cette note ?','Cette note sera retirée de l’historique.','Supprimer',function(){var current=record(m.id);if(!current)return;if(version(current)!==before){flash('La note a changé depuis l’ouverture de la confirmation. Relisez-la avant de la supprimer.');return;}var d=data();d.messages=d.messages.filter(function(n){return n.id!==m.id;});state.notes=d;if(editing&&editing.id===m.id)editing=null;delete drafts[m.id];commit();});}));head.appendChild(tools);message.appendChild(head);
        if(editing&&editing.id===m.id)edition(message,m);else{var body=el('div','pc-notes-body');notesRendu(body,m.text,m.mode);message.appendChild(body);}messages.appendChild(message);
      });
      // Préserver le brouillon même si son message est supprimé à distance.
      if(editing&&!record(editing.id)){var orphan=el('article','pc-note-message');edition(orphan,{id:editing.id});messages.appendChild(orphan);}
      if(to<results.length)messages.appendChild(miniBtn('Notes suivantes ('+(results.length-to)+')',null,function(){page(1);},'pc-notes-newer'));
      count.textContent=query?results.length+' résultat'+(results.length===1?'':'s')+' · '+rows.length+' notes':rows.length+' note'+(rows.length===1?'':'s');clear.disabled=!search.value;latest.hidden=to===results.length;following=!!bottom;
      if(bottom)history.scrollTop=history.scrollHeight;else{var found=Array.prototype.find.call(messages.querySelectorAll('.pc-note-message'),function(n){return n.dataset.id===anchor;});history.scrollTop=found?scroll+found.getBoundingClientRect().top-offset:scroll;}
      if(caret){var area=messages.querySelector('.pc-notes-editor textarea');if(area){area.focus({preventScroll:true});area.setSelectionRange(caret.start,caret.end);}}
      if(window.__owdApplyMode)window.__owdApplyMode(b);
    }
    history.addEventListener('scroll',function(){following=to===results.length&&history.scrollHeight-history.clientHeight-history.scrollTop<45;if(scrollFrame!==null)return;scrollFrame=requestAnimationFrame(function(){scrollFrame=null;if(dead||!history.clientHeight)return;if(history.scrollTop<35&&from>0)page(-1);else if(history.scrollHeight-history.clientHeight-history.scrollTop<35&&to<results.length)page(1);});},{passive:true});
    var observer=typeof ResizeObserver==='function'?new ResizeObserver(function(){if(following)history.scrollTop=history.scrollHeight;}):null;if(observer)observer.observe(messages);
    remontageNettoyage.push(function(){notesVues[vueKey]={text:input.value,mode:mode,search:search.value,editing:editing,drafts:drafts,searchCache:searchCache,first:results[from]&&results[from].id,count:to-from,scroll:history.scrollTop,following:following};dead=true;clearTimeout(timer);if(scrollFrame!==null)cancelAnimationFrame(scrollFrame);if(observer)observer.disconnect();});hooks.push(function(){redrawData(false);});
    updatePreview();redrawData(true);
    if(remembered&&!remembered.following){var index=results.findIndex(function(m){return m.id===remembered.first;});if(index>=0){from=index;to=Math.min(results.length,from+Math.max(BATCH,remembered.count));render(false);}}
    requestAnimationFrame(function(){if(dead)return;if(remembered&&!remembered.following){following=false;history.scrollTop=remembered.scroll;}else if(following)history.scrollTop=history.scrollHeight;});return b;
  }
  // ---------- boîte de dialogue ----------
  // Dans Roll20 la fiche est une iframe d'une AUTRE ORIGINE : prompt() et
  // confirm() y sont muets sous Chrome — ils rendent false sans rien afficher,
  // et un retrait y était annulé en silence. TOUT formulaire, TOUTE
  // confirmation passe donc par cette couche, posée dans le document de la
  // fiche. Il n'y a pas une seule exception dans ce fichier.
  function dialogue(titre, corps, valider, libelleValider) {
    var lecture=!!corps.closest('[data-consultation]');
    var over = el("div", "pc-modal-over");
    if(lecture)over.setAttribute('data-consultation','1');
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    var annuler=miniBtn("Annuler", null, fermer);annuler.setAttribute('data-consultation','1');pied.appendChild(annuler);
    // valider() qui rend explicitement false LAISSE le dialogue ouvert ; toute
    // autre valeur ferme.
    pied.appendChild(miniBtn(libelleValider || "Valider", null, function () {
      if(!over.isConnected||!lecture&&!ficheModifiable()){fermer();return;}
      if (valider() !== false) fermer();
    }, "primary"));
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-fiche : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage.
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }

  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage en base64. L'extension intercepte le clic (la
  // fiche, dans son iframe, ne voit pas le tchat) et renvoie le payload à la
  // fiche du preneur. L'ENCODAGE VIT ICI, CÔTÉ SITE : son format peut évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/owd_take";
  var IMG_MAX = 200000;   // plafond des vignettes envoyées au tchat
  function b64encode(txt) {
    try {
      if (typeof TextEncoder !== "undefined") {
        var oct = new TextEncoder().encode(txt), s = "";
        for (var i = 0; i < oct.length; i++) s += String.fromCharCode(oct[i]);
        return btoa(s);
      }
    } catch (e) {}
    return btoa(unescape(encodeURIComponent(txt)));
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || "").replace(/-/g, "+").replace(/_/g, "/"));
    try {
      if (typeof TextDecoder !== "undefined") {
        var oct = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(oct);
      }
    } catch (e) {}
    return decodeURIComponent(escape(bin));
  }
  // objet -> payload compact. CLÉS COURTES : le message de tchat est borné.
  //   n nom · q quantité · p poids · l places de contenance · d description
  //   k identifiant · a achat · v vente · i image · r accès rapide
  function contenuGroupe(it) {
    // Un contenant (fiole, sac, coffre, poche...) doit voyager avec tous ses
    // descendants. Ce n'est pas une particularité réservée aux sacs à dos.
    if(!it || !it.ref || !window.OwdInventoryData) return null;
    var groupe=window.OwdInventoryData.group(state.inv,it.ref);
    return groupe.length>1 ? groupe : null;
  }
  function packObjet(it, qte) {
    var groupe=contenuGroupe(it);
    var p = {
      n: String(it.nom || ""), q: Math.min(pnum(it.qte), Math.max(0, pnum(qte))), p: pnum(it.poids),
      l: pnum(it.places), d: String(it.desc || ""), k: String(it.id || ""),
      a: venteNum(it.achat), version: 1, s: champsObjet(it, qte)
    };
    if(!groupe){p.item=JSON.parse(JSON.stringify(it));p.item.qte=p.q;p.item.dans="";}
    else {groupe[0].qte=p.q;p.bundle=groupe;}
    if (it.vente != null) p.v = pnum(it.vente);   // absent : automatique
    if (it.rapide) p.r = 1;
    var img = String(it.img || "");
    try { if(img && !/^data:/.test(img)) img = new URL(img, window.location.href).href; } catch(e) {}
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    if(p.item)p.item.img=p.i || "";
    return b64encode(JSON.stringify(p)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object" || !(pnum(o.q)>0)) return null;
    var bundle=null;
    if(o.bundle!==undefined){
      if(!Array.isArray(o.bundle)||!o.bundle.length||!o.bundle[0]||!o.bundle[0].ref)return null;
      try{var root=o.bundle[0];bundle=window.OwdInventoryData.group({objets:o.bundle},root.ref);
        if(bundle.length!==o.bundle.length||bundle.some(function(x){return !x.ref;}))return null;
      }catch(e){return null;}
    }
    return {bundle:bundle,item:o.item && typeof o.item==="object" ? o.item : null,
      nom: String(o.n || "Objet"), qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      places: pnum(o.l), desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: venteNum(o.a), vente: venteNum(o.v), rapide: !!o.r
    };
  }

  // Donner : combien, puis la carte part au tchat et la pile diminue d'autant.
  function donnerDialogue(it, qteDefaut, mode) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "L'objet quitte l'inventaire et part dans le tchat : le premier joueur qui clique « Prendre » le reçoit."));
    var groupe=contenuGroupe(it);
    if(groupe)corps.appendChild(el("div","pc-modal-note","Chaque exemplaire donné emporte son contenu."));
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(it.qte); qIn.step = "any";
    qIn.value = fmtP(Math.min(pnum(qteDefaut) || it.qte, it.qte));

    if(mode !== "all") corps.appendChild(fld("Quantité à donner (sur " + fmtP(it.qte) + ")", qIn));
    else corps.appendChild(el("div", "pc-modal-note", "Quantité : " + fmtP(it.qte)));
    dialogue("Donner « " + (it.nom || "objet") + " »", corps, function () {
      if(state.inv.objets.indexOf(it)<0) {flash("Cet objet n'est plus dans l'inventaire.");return;}
      var q = mode === "all" ? it.qte : Math.min(pnum(qIn.value) || it.qte, it.qte);
      if(mode === "part") q=Math.round(pnum(qIn.value)*100)/100;
      if(mode === "part" && !(q>0 && q<it.qte)) {
        flash("Indiquez une quantité supérieure à zéro et inférieure à la pile.");qIn.focus();return false;
      }
      if (!it.qte || !q) { flash("Cet objet n'est plus en stock."); return; }
      window.OwdInventoryData.isolateAncestors(state.inv.objets,it);
      groupe=contenuGroupe(it);
      // LE NOM PASSE PAR envSan : sans lui, un nom porteur d'une accolade ou
      // d'un saut de ligne compose une commande que l'extension refuse — et
      // l'objet serait quand même retiré de l'inventaire, donc perdu.
      var cmd = cmdCarte("OWD Item Give", [["Objet", it.nom || "objet"]].concat(
        champsObjet(it, q), [["Prendre", "[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")"]]));
      var enRoll20 = typeof window.__owdChat === "function";
      if (enRoll20) envoyer(cmd);
      else flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'inventaire).");
      // LA PILE NE DIMINUE QUE SI LE CANAL EXISTE : sinon l'objet partirait
      // sans que personne ne puisse le prendre.
      if (!enRoll20) return;
      if(groupe && q>=it.qte){var refs=groupe.map(function(x){return x.ref;});
        for(var z=state.inv.objets.length-1;z>=0;z--)if(refs.indexOf(state.inv.objets[z].ref)>=0)state.inv.objets.splice(z,1);refresh();if(invRender)invRender();return;}
      it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
      if (!it.qte) {
        // Un Contenant donné ne peut pas rendre son Contenu invisible : le
        // protocole de don actuel n'embarque pas les sous-types d'équipement,
        // donc le contenu reste dans cette fiche et retourne au sac.
        if (it.contenant && it.ref) state.inv.objets.forEach(function (x) {
          if (String(x.dans || "") === String(it.ref)) { x.dans = ""; x.ou = it.ou === "terre" ? "terre" : "sac"; x.emp = -1; }
        });
        var i = state.inv.objets.indexOf(it);
        if (i >= 0) state.inv.objets.splice(i, 1);
      }
      refresh();
      if (invRender) invRender();
    }, "Donner");
  }

  // Prendre : l'objet arrive du tchat (relayé par l'extension). S'il existe
  // déjà, on empile les quantités et on tranche champ par champ ce qui diffère.
  var invRender = null;   // posé par invObjets : re-rendu de l'inventaire
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var items = state.inv.objets;
    var jumeau=null;
    var corps = el("div", "pc-modal-body");
    if (recu.img) {
      var imb = el("div", "pc-modal-img");
      var im = el("img"); im.alt = ""; im.src = recu.img;
      imb.appendChild(im);
      corps.appendChild(imb);
    }
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(recu.qte); qIn.step = "any";
    qIn.value = fmtP(recu.qte);

    corps.appendChild(fld("Quantité à prendre (sur " + fmtP(recu.qte) + ")", qIn));

    var gSel = null;
    if (!jumeau) {
      gSel = el("select");
      // Un objet reçu arrive au sol par défaut ; le joueur choisit ensuite
      // s'il le ramasse. Les poches ne sont proposées que si sa taille est connue.
      var lieuxReception = [["terre", "Par terre"]];
      if (window.OwdInventoryData.backpack(items)) lieuxReception.push(["sac", "Sac à dos"]);
      if (recu.item && window.OwdInventoryData.pocketFits(recu.item)) lieuxReception.push(["poches", "Poches"]);
      lieuxReception.forEach(function (g) {
        var o = el("option", null, g[1]);
        o.value = g[0];
        gSel.appendChild(o);
      });
      corps.appendChild(fld("Ranger dans", gSel));
    }

    dialogue("Prendre « " + recu.nom + " »", corps, function () {
      var q = Math.min(pnum(qIn.value), recu.qte);
      if(!(q>0)){flash("Indiquez une quantité positive.");return false;}
      var incoming=null;
      if(recu.bundle){var refs={};recu.bundle.forEach(function(x){refs[x.ref]=uid("o");});
        var bag=window.OwdInventoryData.backpack(items);
        recu.bundle.forEach(function(x,i){var c=JSON.parse(JSON.stringify(x));c.ref=refs[x.ref];c.dans=refs[x.dans]||"";
          if(i===0){incoming=c;c.qte=q;c.ou=gSel?gSel.value:"terre";c.emp=-1;if(c.ou==="sac"&&bag)c.dans=bag.ref;}
          items.push(c);});
      } else if(recu.item){
        var copie=JSON.parse(JSON.stringify(recu.item));copie.ref=uid("o");copie.qte=q;copie.ou=gSel?gSel.value:"terre";copie.dans="";copie.emp=-1;items.push(copie);incoming=copie;
      } else {
        items.push({
          id: recu.id, ref: uid("o"), nom: recu.nom, img: recu.img, qte: q, poids: recu.poids,
          places: recu.places, achat: recu.achat, vente: recu.vente, desc: recu.desc,
          ou: gSel ? gSel.value : "terre", emp: -1,
          rapide: recu.rapide, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
          sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0,
          contenant: "", contenu: "", dans: "", arme: null
        });
      }
      window.OwdInventoryData.bind(items);
      if(incoming){var twin=items.filter(function(o){return window.OwdInventoryData.canMerge(items,o,incoming);})[0];if(twin)window.OwdInventoryData.merge(items,twin,incoming);}
      refresh();
      if (invRender) invRender();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'inventaire.");
    }, "Prendre");
  }

  // ================= ONGLET INVENTAIRE =================

  // ---- 10. Armes : la propriété « arme » d'un objet ----
  // Il n'y a plus de gestes ni de préréglage dans l'inventaire. Une arme porte
  // seulement les valeurs qui lui appartiennent : difficulté d'attaque, dégâts
  // de base et jusqu'à trois caractéristiques qui les modifient ; difficulté de
  // parade, réduction de base et jusqu'à trois caractéristiques qui la
  // modifient ; enfin la compétence liée et le TYPE d'arme du livre. Le type
  // est une clé stable vers DATA.armes : il servira plus tard à retrouver ses
  // trajets sans recopier les règles dans la fiche.
  function champArme(libelle, obj, cle, titre) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.inputMode = "numeric";
    i.placeholder = "0";
    i.value = obj[cle] == null ? "" : String(obj[cle]);
    if (titre) i.title = titre;
    i.addEventListener("input", function () { obj[cle] = i.value; save(); });
    return fld(libelle, i);
  }

  function carteArme(it, attaqueLibre, sousTypeHost) {
    // L’inventaire passe historiquement un callback en second argument.
    // Seul le booléen explicite des attaques libres masque la parade.
    attaqueLibre = attaqueLibre === true;
    var a = it.arme;

    function selComp() {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = a.comp || "";
        s.innerHTML = "";
        var o0 = el("option", null, "Aucune");
        o0.value = "";
        s.appendChild(o0);
        state.comps.forEach(function (c) {
          var o = el("option", null, c.nom || "Sans nom");
          o.value = c.id;
          if (c.id === valeur) o.selected = true;
          s.appendChild(o);
        });
      }
      remplir();
      s.title = "La compétence affiliée à cette arme.";
      s.addEventListener("change", function () { a.comp = s.value; save(); refresh(); });
      if (!attaqueLibre) hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function selCarac(table, rang) {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = Array.isArray(a[table]) ? String(a[table][rang] || "") : "";
        s.innerHTML = "";
        var o0 = el("option", null, "Aucun");
        o0.value = "";
        s.appendChild(o0);
        caracsOrdre().forEach(function (c) {
          var o = el("option", null, abbrCarac(c));
          o.value = c;
          o.title = libCarac(c);
          if (c === valeur) o.selected = true;
          s.appendChild(o);
        });
      }
      remplir();
      s.title = "Caractéristique ajoutée comme MOD.";
      s.addEventListener("change", function () {
        if (!Array.isArray(a[table])) a[table] = ["", "", ""];
        while (a[table].length < 3) a[table].push("");
        a[table][rang] = s.value;
        save();
      });
      if (!attaqueLibre) hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function selTypeArme() {
      var s = el("select", "pc-select pc-edit-field");
      function remplir() {
        var valeur = String(a.type || ""), trouve = false, groupes = {};
        s.innerHTML = "";
        var o0 = el("option", null, "Aucun");
        o0.value = "";
        s.appendChild(o0);
        armesData().forEach(function (d) {
          if (!d || !d.cle) return;
          var cat = String(d.categorie || "Armes");
          if (!groupes[cat]) {
            groupes[cat] = document.createElement("optgroup");
            groupes[cat].label = cat;
            s.appendChild(groupes[cat]);
          }
          var o = el("option", null, d.nom || d.cle);
          o.value = d.cle;
          if (d.cle === valeur) { o.selected = true; trouve = true; }
          groupes[cat].appendChild(o);
        });
        // Une archive ou un mod peut porter un type que les règles du jour ne
        // connaissent plus. On le montre au lieu de l'effacer silencieusement.
        if (valeur && !trouve) {
          var ancien = el("option", null, valeur + " (inconnu)");
          ancien.value = valeur;
          ancien.selected = true;
          s.appendChild(ancien);
        }
      }
      remplir();
      s.title = "Type d'arme du livre ; il servira notamment à retrouver ses trajets.";
      s.addEventListener("change", function () {
        a.type = s.value;
        it.sousType=s.value;
        // La famille choisie initialise le champ Mains commun à tous les objets.
        armesData().forEach(function (d) {
          if (d && d.cle === a.type && (d.mains === 1 || d.mains === 2)) it.mains = a.mains = d.mains;
        });
        save();
        refresh();
      });
      if (!attaqueLibre) hooks.push(function () { if (document.activeElement !== s) remplir(); });
      return s;
    }

    function ligne(classe) {
      return el("div", "pc-arme-line " + classe);
    }

    var card = el("div", "pc-arme pc-obj-weapon-details");

    // La compétence précède les valeurs d'attaque et de dégâts.
    var l0 = ligne("pc-arme-1");
    l0.appendChild(fld("Compétence", selComp()));
    card.appendChild(l0);

    var l1 = ligne("pc-arme-2");
    l1.appendChild(champArme("Attaque", a, "attaque", "Difficulté du jet d'attaque."));
    l1.appendChild(champArme("Dégâts", a, "degats", "Dégâts de base de l'arme, avant ses MOD."));
    card.appendChild(l1);

    var l2 = ligne("pc-arme-3");
    for (var i = 0; i < 3; i++) l2.appendChild(fld("MOD", selCarac("modsDegats", i)));
    card.appendChild(l2);

    var l3 = ligne("pc-arme-2");
    l3.appendChild(champArme("Parade", a, "parade", "Difficulté du jet de parade."));
    l3.appendChild(champArme("Réduction", a, "reduction", "Réduction de dégâts de base sur une parade réussie."));
    if (!attaqueLibre) card.appendChild(l3);

    var l4 = ligne("pc-arme-3");
    for (var j = 0; j < 3; j++) l4.appendChild(fld("MOD", selCarac("modsParade", j)));
    if (!attaqueLibre) card.appendChild(l4);

    if (!attaqueLibre) {
      var typeField = fld(sousTypeHost ? "Sous-type" : "Type", selTypeArme());
      if (sousTypeHost) sousTypeHost.appendChild(typeField);
      else { var lType = ligne("pc-arme-1"); lType.appendChild(typeField); card.appendChild(lType); }
    }

    if (!attaqueLibre) {
      if (!a.repartition) a.repartition = {physique:100};
      var rep = el("div", "pc-arme-repartition");
      // Une sortie calculée, ni champ éditable, ni texte sélectionnable.
      var totalInput = el("div", "pc-edit-field pc-arme-total");
      totalInput.setAttribute("role", "status");
      totalInput.setAttribute("aria-label", "Total des types de dégâts (%)");
      totalInput.title = "Somme calculée automatiquement, non modifiable";
      function total() {
        var n = 0;
        combatTypes().forEach(function (k) { n += pnum(a.repartition[k]); });
        totalInput.textContent = fmtP(n) + " %";
        totalInput.classList.toggle("pc-invalid", Math.abs(n-100) > 0.001);
      }
      // 4 rangées × 2, avec Brut / Total pour la dernière.
      ["physique", "ethere", "feu", "froid", "eclair", "decomposition", "brut"].forEach(function (k) {
        var input = el("input", "pc-edit-field");
        input.type = "text";
        input.inputMode = "decimal";
        input.value = pnum(a.repartition[k]);
        input.setAttribute("aria-label", "Dégâts " + combatLibType(k) + " (%)");
        input.addEventListener("input", function () {
          var v = litNombreSigne(input.value);
          if (isFinite(v) && v >= 0) { a.repartition[k] = v; save(); total(); }
        });
        input.addEventListener("change", refresh);
        rep.appendChild(fld(combatLibType(k) + " (%)", input));
      });
      rep.appendChild(fld("Total", totalInput));
      total();
      card.appendChild(rep);

      // Les prérequis sont tous prévus, y compris ceux encore peu utilisés.
      [["for", "FOR"], ["dex", "DEX"], ["vig", "VIG"], ["end", "END"],
       ["res", "RES"], ["fer", "FER"], ["int", "INT"], ["cha", "CHA"]].forEach(function (x, i) {
        if (i % 2 === 0) card.appendChild(ligne("pc-arme-2 pc-arme-requis"));
        card.lastChild.appendChild(champArme("PRÉ. " + x[1], a, x[0], "Prérequis de " + x[1]));
      });
    }

    return card;
  }
  // Propriétés communes ajoutées sans réinterpréter les anciennes clés de stockage.
  var INV_TAILLES = ["Minuscule","Très petite","Petite","Moyenne","Grande","Très grande","Gigantesque"];
  var INV_TYPES_OBJETS = {arme:"Arme",vetement:"Vêtement",accessoire:"Accessoire",rangement:"Rangement",contenant:"Contenant",consommable:"Consommable",munition:"Munition",autre:"Objet divers"};
  function invType(o) {
    var ancien=String(o.typeObjet||"");
    if(/^(eclairage|couchage)$/.test(ancien))return "autre";
    // Les trois anciens types deviennent un même type de formulaire sans
    // réécrire la catégorie physique `contenu` des objets déjà stockés.
    if(["solide","pate","liquide"].indexOf(ancien)>=0)return "consommable";
    if(ancien)return ancien;
    if(o.arme)return "arme";
    if(o.vet)return "vetement";
    if(o.acc)return "accessoire";
    if(o.sac||o.ceint)return "rangement";
    if(o.contenant)return "contenant";
    if(/^(fleche|carreau|balle|pierre)/.test(o.contenu||""))return "munition";
    if(o.nourri||["solide","pate","liquide"].indexOf(o.contenu)>=0)return "consommable";
    return "autre";
  }
  function invFormeConsommable(o) {
    var raw=String(o.typeObjet||"");
    if(["solide","pate","liquide"].indexOf(raw)>=0)return raw;
    var sub=String(o.sousType||"");
    if(/^(solide|pate|liquide)_(ingerable|autre)$/.test(sub))return sub.split("_")[0];
    if(o.contenu==="liquide"||o.contenu==="pate")return o.contenu;
    return "solide";
  }
  function invSousTypeConsommable(o) {
    var sub=String(o.sousType||"");
    if(/^(solide|pate|liquide)_(ingerable|autre)$/.test(sub))return sub;
    // Avant la fusion, `consommable` désignait l'usage sans ingestion :
    // il devient « autre », mais conserve ses effets et ses restaurations.
    var use=(sub==="ingerable"||(!sub && o.nourri))?"ingerable":"autre";
    return invFormeConsommable(o)+"_"+use;
  }
  function invEstIngerable(it){return /^(solide|pate|liquide)_ingerable$/.test(it.sousType||"");}
  function invSousTypes(type) {
    if(type==="rangement")return [["sac","Sac à dos"],["ceint","Ceinture"]];
    if(type==="consommable")return [
      ["solide_ingerable","Solide ingérable"],["solide_autre","Solide autre"],
      ["pate_ingerable","Pâte ingérable"],["pate_autre","Pâte autre"],
      ["liquide_ingerable","Liquide ingérable"],["liquide_autre","Liquide autre"]
    ];
    if(type==="munition")return [["fleches","Flèche"],["carreaux","Carreau"],["balles","Balle"],["pierres","Pierre"]];
    return [];
  }
  function invTailleAccepte(taille, max) {return (!taille || INV_TAILLES.indexOf(taille)>=0) && (!max || INV_TAILLES.indexOf(max)>=0) && (!taille || !max || INV_TAILLES.indexOf(taille)<=INV_TAILLES.indexOf(max));}
  function invCoutAcc(o,lieu) {return 1;} // Chaque objet accroché occupe un emplacement, taille contrôlée séparément.
  function invTailleMaxSac(o) {return o && (o.tailleInterieure || (o.cap>=100?"Moyenne":o.cap>=50?"Petite":"Très petite"));}
  var catalogueIndex=null;
  function modeleCatalogue(o){
    var d=D(),items=d.equipements||[],foods=d.consommables||[];
    if(typeof state!=='undefined'&&state&&typeof modulesPersoActifs==='function'&&modulesPersoActifs())return items.concat(foods).filter(function(x){return x.id===(o.catalogueId||o.id)||(x.aliasIds||[]).indexOf(o.catalogueId||o.id)>=0||x.nom===o.nom||(x.aliases||[]).indexOf(o.nom)>=0;})[0];
    if(!catalogueIndex||catalogueIndex.items!==items||catalogueIndex.foods!==foods||catalogueIndex.count!==items.length+foods.length){
      var all=items.concat(foods),byId=Object.create(null),byName=Object.create(null);
      function add(map,key,i){if(typeof key==='string'&&key&&!Object.prototype.hasOwnProperty.call(map,key))map[key]=i;}
      all.forEach(function(x,i){add(byId,x.id,i);(x.aliasIds||[]).forEach(function(k){add(byId,k,i);});add(byName,x.nom,i);(x.aliases||[]).forEach(function(k){add(byName,k,i);});});
      catalogueIndex={items:items,foods:foods,count:all.length,all:all,ids:byId,names:byName};
    }
    var id=catalogueIndex.ids[o.catalogueId||o.id],name=catalogueIndex.names[o.nom],i=id===undefined?name:name===undefined?id:Math.min(id,name);
    return i===undefined?undefined:catalogueIndex.all[i];
  }
  function enrichitObjet(n,o) {
    var modele=modeleCatalogue(o);
    // Les anciens achats de Boutique ne transportaient aucun champ technique.
    // Leurs quantités, prix, poids, image et description restent ceux du joueur.
    if(!o.versionObjet && /^boutique:/.test(o.id||"") && modele){
      o=Object.assign({},modele,o);
      ["typeObjet","sousType","taille","tailleInterieure","tailleAccroche","effets","stats","restaurations","unitesRestauration","ps","ph","places","emplacements","prerequis","tenueDeuxMains","tempsConsommation","conditionsEffets","proprietes"].forEach(function(k){if(modele[k]!==undefined)o[k]=JSON.parse(JSON.stringify(modele[k]));});
      ["arme","vet","sac","ceint","acc","contenant","contenu","cap","ep","froid","chaud","poches","prot_physique","res_physique"].forEach(function(k){if(modele[k]!==undefined)n[k]=JSON.parse(JSON.stringify(modele[k]));});
      combatTypes().forEach(function(t){["prot_","res_"].forEach(function(p){if(modele[p+t]!==undefined){n[p+t]=modele[p+t];o[p+t]=modele[p+t];}});});
      if(n.arme)o.arme=n.arme;
    }
    n.catalogueId=modele ? modele.id : o.catalogueId || "";
    n.catalogueVersion=o.catalogueVersion || (modele ? D().catalogueVersion : null);
    n.commerce=o.commerce || (modele && modele.commerce) || "vendu";
    if(modele){n.desc=modele.desc;n.descriptionSource=modele.descriptionSource || "";n.descriptionStatut=modele.descriptionStatut;n.descriptionEmpreinte=modele.descriptionEmpreinte || "";}
    n.donneesACompleter=modele ? (modele.donneesACompleter||[]).slice() : (o.donneesACompleter||[]).slice();
    n.definitionStatut=modele ? (modele.definitionStatut||"") : (o.definitionStatut||"");
    n.effetsStatut=modele ? (modele.effetsStatut||"") : (o.effetsStatut||"");
    n.typeRangement=o.typeRangement || (modele && modele.typeRangement) || "";
    if(modele && (modele.aliases||[]).indexOf(o.nom)>=0)n.nom=modele.nom;
    n.reglesManuelles=(Array.isArray(o.reglesManuelles)?o.reglesManuelles:modele&&modele.reglesManuelles||[]).map(String);
    n.doses=pnum(o.doses===undefined?modele&&modele.doses:o.doses);
    n.prixStatut=o.prixStatut || (modele && modele.prixStatut) || "";
    if(modele && modele.prixStatut==="non-renseigne")n.achat=n.vente=null;
    n.versionObjet=1;
    n.typeObjet=invType(o);if(!INV_TYPES_OBJETS[n.typeObjet])n.typeObjet="autre";
    n.sousType=n.typeObjet==="consommable"?invSousTypeConsommable(o):
      String(o.sousType || (o.sac?"sac":o.ceint?"ceint":o.vet?o.vet:o.acc?o.acc:o.arme?o.arme.type:n.typeObjet==="munition"?o.contenu:"autre"));
    if(/^(eclairage|couchage)$/.test(o.typeObjet))n.sousType="autre";
    // La catégorie technique du contenant EST son sous-type affiché.
    if(n.typeObjet==="contenant" && n.contenant)n.sousType=String(n.contenant);
    n.nourri=invEstIngerable(n);n.places=o.places===null?null:pnum(o.places);
    n.taille=INV_TAILLES.indexOf(o.taille)>=0?o.taille:modele&&modele.taille||"";
    var mainsBase=o.arme&&o.arme.mains;
    if(mainsBase==null && o.arme)armesData().forEach(function(d){if(d.cle===o.arme.type || !o.arme.type&&pli(d.nom)===pli(o.nom))mainsBase=d.mains;});
    // 1 : une main suffit ; 2 : deux mains pour l'utilisation, une pour le port ;
    // 2 obligatoires : occupation simultanée des deux mains.
    n.mains=o.mains==="2 obligatoires"?"2 obligatoires":num(o.mains,mainsBase===2?2:1)===2?2:1;
    n.tenueDeuxMains=(o.tenueDeuxMains===true || n.mains==="2 obligatoires") && (o.ou==="mainG" || o.ou==="mainD");
    if(n.arme)n.arme.mains=n.mains;
    n.emplacements=Math.max(0,Math.floor(num(o.emplacements,1)));
    n.prerequis={};["for","dex","vig","end","res","fer","int","cha"].forEach(function(k){n.prerequis[k]=pnum(o.prerequis&&o.prerequis[k]!==undefined ? o.prerequis[k] : o.arme&&o.arme[k]);});
    var rawVolume=o.volume===undefined?o.encombre:o.volume;n.volume=rawVolume===null?null:pnum(rawVolume);n.encombre=n.volume;
    n.tailleInterieure=String(o.tailleInterieure||"");n.tailleAccroche=String(o.tailleAccroche || (n.sac?"Moyenne":""));
    n.effets=(Array.isArray(o.effets)?o.effets:[]).slice(0,8).map(String);
    n.restaurations={};n.unitesRestauration={};
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){n.restaurations[k]=snum(o.restaurations&&o.restaurations[k]);n.unitesRestauration[k]=o.unitesRestauration&&o.unitesRestauration[k]==="% max"?"% max":"points";});
    n.ps=o.ps===null?null:snum(o.ps);n.ph=o.ph===null?null:snum(o.ph);n.tempsConsommation=o.tempsConsommation===null?null:pnum(o.tempsConsommation);
    n.conditionsEffets=o.conditionsEffets&&typeof o.conditionsEffets==="object"?JSON.parse(JSON.stringify(o.conditionsEffets)):{};
    n.stats=o.stats&&typeof o.stats==="object"?JSON.parse(JSON.stringify(o.stats)):{};
    // Le choix des huit lignes est purement visuel ; les effets conservent
    // leurs clés historiques, utilisées par les attaques et les défenses.
    n.effetsEquipement=Array.isArray(o.effetsEquipement)?o.effetsEquipement.slice(0,8).map(String):null;
    n.proprietes=o.proprietes&&typeof o.proprietes==="object"?JSON.parse(JSON.stringify(o.proprietes)):{};
    delete n.proprietes.accrochable;
    n.munitionStats=o.munitionStats&&typeof o.munitionStats==="object"?JSON.parse(JSON.stringify(o.munitionStats)):{degats:0,repartition:{physique:100}};
    ["prot","res"].forEach(function(k){n[k+"_physique"]=o[k+"_physique"]===undefined?(modele&&modele[k+"_physique"]!==undefined?snum(modele[k+"_physique"]):Math.max(snum(o[k+"_contondant"]),snum(o[k+"_perforant"]),snum(o[k+"_tranchant"]))):snum(o[k+"_physique"]);});
    if(n.arme){var rep=o.arme&&o.arme.repartition || modele&&modele.arme&&modele.arme.repartition || {physique:100};n.arme.repartition={};combatTypes().forEach(function(k){if(isFinite(Number(rep[k])))n.arme.repartition[k]=pnum(rep[k]);});if(!Object.keys(n.arme.repartition).length)n.arme.repartition={physique:100};n.arme.hits=Math.max(1,Math.floor(pnum(o.arme&&o.arme.hits)||1));["for","dex","vig","end","res","fer","int","cha"].forEach(function(k){n.arme[k]=pnum(o.arme&&o.arme[k]);});}
    if(n.typeObjet==="munition"){n.sousType={fleche:"fleches",carreau:"carreaux",balle:"balles",pierre:"pierres"}[n.sousType]||n.sousType;n.contenu=n.sousType;}
    return n;
  }
  function invChoix(label,values,current,change) {
    var s=el("select","pc-select pc-edit-field");values.forEach(function(v){var k=Array.isArray(v)?v[0]:v,t=Array.isArray(v)?v[1]:v;var op=el("option",null,t);op.value=k;op.selected=k===current;s.appendChild(op);});
    s.addEventListener("change",function(){change(s.value);save();refresh();});return fld(label,s);
  }
  // Toutes les propriétés chiffrées d'un vêtement passent par les mêmes
  // accès que l'ancien formulaire, afin que les calculs continuent à fonctionner.
  function invOptionsEquipement() {
    var out = [];
    combatTypes().forEach(function(k){out.push(["prot_"+k,"Protection "+combatLibType(k)+" (points)"]);});
    combatTypes().forEach(function(k){out.push(["res_"+k,"Résistance "+combatLibType(k)+" (%)"]);});
    out.push(["poches","Poches (L)"],["froid","Défense froid (°)"],["chaud","Défense chaud (°)"]);
    combatTypes().forEach(function(k){out.push(["degats:"+k,"Dégâts "+combatLibType(k)+" (%)"]);});
    out.push(["couts:pv","Coût PV (%)"],["couts:pm","Coût PM (%)"],["couts:pe","Coût PE (%)"],
      ["vitesse","Vitesse"],["innocence","Résistance corruption (%)"],
      ["alterations","Résistance altérations (%)"]);
    return out;
  }
  function invValeurEquipement(it,cle) {
    if (!cle) return 0;
    if (cle.indexOf("degats:")===0) return snum(it.stats&&it.stats.degats&&it.stats.degats[cle.slice(7)]);
    if (cle.indexOf("couts:")===0) return snum(it.stats&&it.stats.couts&&it.stats.couts[cle.slice(6)]);
    if (["vitesse","innocence","alterations"].indexOf(cle)>=0) return snum(it.stats&&it.stats[cle]);
    return snum(it[cle]);
  }
  function invPoseValeurEquipement(it,cle,val) {
    if (!cle) return;
    if (cle.indexOf("degats:")===0 || cle.indexOf("couts:")===0) {
      if (!it.stats || typeof it.stats!=="object") it.stats={};
      var nom=cle.split(":")[0], k=cle.split(":")[1];
      if(!it.stats[nom] || typeof it.stats[nom]!=="object") it.stats[nom]={};
      it.stats[nom][k]=val;
    } else if (["vitesse","innocence","alterations"].indexOf(cle)>=0) {
      if(!it.stats || typeof it.stats!=="object")it.stats={};
      it.stats[cle]=val;
    } else it[cle]=val;
  }
  function invLignesEquipement(it) {
    var liste=invOptionsEquipement().map(function(x){return x[0];});
    if(!Array.isArray(it.effetsEquipement))it.effetsEquipement=liste.filter(function(k){return invValeurEquipement(it,k)!==0;}).slice(0,8);
    var present={};
    it.effetsEquipement=Array.from({length:8},function(_,i){
      var k=it.effetsEquipement[i]||"";
      if(!k || liste.indexOf(k)<0 || present[k]) return "";
      present[k]=true;return k;
    });
    return it.effetsEquipement;
  }
  function invChampsVetement(host,it) {
    var choices=invOptionsEquipement(), lignes=invLignesEquipement(it);
    var carte=el("div","pc-obj-effets-equipement");
    for(var index=0;index<8;index++)(function(i){
      var ligne=el("div","pc-obj-pair pc-obj-effet-ligne");
      var montant=el("input","pc-edit-field");montant.type="text";montant.inputMode="decimal";
      champNombreSigne(montant);
      var select=el("select","pc-select pc-edit-field");
      var vide=el("option",null,"Aucun effet");vide.value="";select.appendChild(vide);
      choices.forEach(function(c){var opt=el("option",null,c[1]);opt.value=c[0];select.appendChild(opt);});
      function afficher(){var cle=lignes[i]||"";select.value=cle;montant.value=cle?fmtP(invValeurEquipement(it,cle)):"";montant.disabled=!cle;}
      select.addEventListener("change",function(){
        var ancien=lignes[i]||"",nouveau=select.value;
        if(nouveau && lignes.some(function(x,j){return j!==i&&x===nouveau;})){
          select.value=ancien;flash("Cet effet est déjà utilisé dans une autre ligne.");return;
        }
        if(ancien!==nouveau){invPoseValeurEquipement(it,ancien,0);lignes[i]=nouveau;it.effetsEquipement=lignes;}
        afficher();save();refresh();
      });
      montant.addEventListener("input",function(){
        var v=litNombreSigne(montant.value);
        if(isFinite(v) && lignes[i]){invPoseValeurEquipement(it,lignes[i],v);save();refresh();}
      });
      ligne.appendChild(fld("Valeur",montant));
      ligne.appendChild(fld("Type d’effet",select));
      carte.appendChild(ligne);
      afficher();
    })(index);
    host.appendChild(carte);
    // Les anciennes sauvegardes peuvent avoir davantage de huit valeurs.
    // Ne jamais les supprimer silencieusement : elles restent actives.
    var caches=choices.filter(function(c){return invValeurEquipement(it,c[0])!==0 && lignes.indexOf(c[0])<0;});
    if(caches.length){var a=el("div","pc-obj-effets-anciens");a.appendChild(el("small",null,
      caches.length+" effet(s) historique(s) hors des huit lignes, toujours actifs : "+caches.map(function(c){return c[1]+" "+fmtP(invValeurEquipement(it,c[0]));}).join(" ; ")));host.appendChild(a);}
  }
  // Un seul tableau de prérequis pour les vêtements et les accessoires.
  // Les valeurs restent en données, même si les règles d'équipement évoluent.
  function invChampsPrerequis(host,it) {
    if(!it.prerequis || typeof it.prerequis!=="object")it.prerequis={};
    var grille=el("div","pc-obj-pre-requis");
    [["for","FOR"],["dex","DEX"],["vig","VIG"],["end","END"],
     ["res","RES"],["fer","FER"],["int","INT"],["cha","CHA"]].forEach(function(x){
      var n=el("input","pc-edit-field");n.type="text";n.inputMode="numeric";
      n.value=fmtP(pnum(it.prerequis[x[0]]));n.addEventListener("input",function(){
        var v=litNombreSigne(n.value);if(isFinite(v) && v>=0){it.prerequis[x[0]]=v;save();}
      });
      grille.appendChild(fld("PRÉ. "+x[1],n));
    });
    host.appendChild(grille);
  }
  function invAvecEffets(it) {return invType(it)==="consommable" && /^(solide|pate|liquide)_(ingerable|autre)$/.test(it.sousType||"");}
  function invChampsCommuns(body,it,render) {
    if(invAvecEffets(it)){
      body.appendChild(el("div","lbl","Effets"));var card=el("div","pc-arme pc-obj-effets-grid");
      if(!Array.isArray(it.effets))it.effets=[];
      for(var i=0;i<8;i++)(function(index){card.appendChild(fld("Effet "+(index+1),selectEffet(it.effets[index]||"",function(v){it.effets[index]=v;save();refresh();})));})(i);
      body.appendChild(card);
    }
    if(it.proprietes && Object.keys(it.proprietes).some(function(k){return it.proprietes[k]!=null;})){
      var props=el("div","pc-arme");Object.keys(it.proprietes).forEach(function(k){if(k==="accrochable"||it.proprietes[k]==null)return;var i=el("input","pc-edit-field");i.type="text";i.value=it.proprietes[k];i.addEventListener("input",function(){it.proprietes[k]=i.value;save();});props.appendChild(fld({autonomie:"Autonomie",recharge:"Recharge"}[k]||k,i));});body.appendChild(props);
    }
    if(invType(it)==="munition"){
      if(!it.munitionStats)it.munitionStats={degats:0,repartition:{physique:100}};
      var mun=el("div","pc-arme");mun.appendChild(champArme("Dégâts supplémentaires",it.munitionStats,"degats"));
      if(!it.munitionStats.repartition)it.munitionStats.repartition={physique:100};
      combatTypes().forEach(function(k){mun.appendChild(champArme(combatLibType(k)+" (%)",it.munitionStats.repartition,k));});body.appendChild(mun);
    }
    if(invAvecEffets(it)){
      var rs=el("div","pc-arme pc-obj-restauration");
      if(!it.restaurations)it.restaurations={};if(!it.unitesRestauration)it.unitesRestauration={};
      ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){
        var line=el("div","pc-obj-pair"),n=el("input","pc-edit-field");champNombreSigne(n);n.value=snum(it.restaurations[k]);n.setAttribute("aria-label","Restauration "+k.toUpperCase());
        n.addEventListener("input",function(){var v=litNombreSigne(n.value);if(isFinite(v)){it.restaurations[k]=v;save();}});
        line.appendChild(fld("Restauration "+k.toUpperCase(),n));line.appendChild(invChoix("Unité",[["points","Points"],["% max","% du maximum"]],it.unitesRestauration[k]||"points",function(v){it.unitesRestauration[k]=v;}));rs.appendChild(line);
      });body.appendChild(rs);
    }
  }
  function invConsommer(it,q,cible) {
    q=Math.min(pnum(q),pnum(it.qte));if(!(q>0))return false;
    var effects=(it.effets||[]).map(effetDefinition).filter(Boolean);
    if(effects.length && Math.abs(q-Math.round(q))>1e-9){flash("Les effets sont définis par dose entière : choisissez une quantité entière.");return false;}
    if(effects.some(function(d){return d.ops.impregnation;})&&!defenseArme(cible)){flash("Choisissez l’arme à imprégner.");return false;}
    // Un refus ne doit pas séparer les contenants ni modifier leurs contenus.
    window.OwdInventoryData.isolateAncestors(state.inv.objets,it);
    var ingere=invEstIngerable(it),avant={};
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){avant[k]=maxDe(k);});
    var results=[];
    // Les probabilités sont testées à la consommation, jamais au rafraîchissement.
    effects.forEach(function(d){
      if(d.categorie==="Maladie" || d.categorie==="Traitement"){results.push([d.nom,"À gérer avec les maladies"]);return;}
      var seuil=Number(it.conditionsEffets&&it.conditionsEffets[d.id]);
      if(seuil>0){var jet=1+Math.floor(Math.random()*8)+1+Math.floor(Math.random()*8);results.push([d.nom,"2d8 = "+jet+" ; seuil ≤ "+seuil]);if(jet>seuil)return;}
      var count=d.ops.alcool?Math.floor(q):1;
      while(count-->0)appliqueEffet(d.id,it.nom,cible,undefined,ingere ? "digestive" : "speciale");
    });
    ["pv","pe","pm","pr","ps","ph","pi"].forEach(function(k){
      var v=snum(it.restaurations&&it.restaurations[k]);
      if(it.unitesRestauration&&it.unitesRestauration[k]==="% max")v=avant[k]*v/100;
      if(ingere && (k==="ps"||k==="ph"))v+=num(it[k],0);
      v*=q;if(k==="pi")v=effetPerteInnocence(v);
      if(v)bougeReserve(k,v);
    });
    if(ingere)state.etat.contenance=Math.round((contenancePrise()+q*pnum(it.places))*1000)/1000;
    it.qte=Math.round((it.qte-q)*100)/100;
    if(!it.qte)state.inv.objets.splice(state.inv.objets.indexOf(it),1);
    results.unshift(["Quantité",fmtP(q)],["Temps",fmtP(q*pnum(it.tempsConsommation))+" DA"]);
    sayChat("Consommer — "+it.nom,results);refresh();if(invRender)invRender();return true;
  }
  function invConsommerDialogue(it,q) {
    var impr=(it.effets||[]).some(function(id){var d=effetDefinition(id);return d&&d.ops.impregnation;});
    if(!impr){invConsommer(it,q,"");return;}
    var body=el("div","pc-modal-body"),s=el("select","pc-select");
    state.inv.objets.filter(function(o){return o.arme;}).forEach(function(o){var op=el("option",null,o.nom||"Arme");op.value=o.ref;s.appendChild(op);});body.appendChild(fld("Arme à imprégner",s));
    dialogue("Appliquer — "+it.nom,body,function(){return invConsommer(it,q,s.value);},"Appliquer");
  }
  // ---- 14. Inventaire (pleine largeur) ----
  // QUATRE GROUPES FIXES, et rien d'autre dans l'onglet Équipement :
  //
  //   SUR SOI     [main gauche] [main droite]  ·  [ceinture] [sac à dos]
  //               [tête] [haut] [mains] [bas] [pieds]        ← les cinq VÊTEMENTS
  //               [boucles d'oreilles] [collier] [sous-vêtement] [poignet G] [poignet D]
  //               [bague G] [bague D] [cheville G] [cheville D] [cape]
  //   CEINTURE    les emplacements (ep) de la ceinture portée
  //   POCHES      ce que les vêtements et accessoires portés laissent emporter (en L)
  //   SAC À DOS   les emplacements du sac porté, PUIS ce qu'il contient (en L)
  //
  // Les cases de Sur soi sont TOUJOURS là, vides ou pleines ; chacune ne prend
  // que ce qui s'y porte. Un EMPLACEMENT tient un seul exemplaire, jusqu'à
  // l'encombrance au plus de sa ceinture ou de son sac, et ne compte dans
  // aucune capacité ; ils se montrent tous, même vides, avant tout le reste et
  // sur leurs propres lignes. Poches et sac se remplissent de tuiles, cinq par
  // ligne au plus.
  // Le détail de l'objet choisi occupe la colonne de droite : c'est là qu'on
  // dit ce qu'est un objet (vêtement, sac à dos, arme) et où il se trouve.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  var INV_NOMS = {
    mainG: "Main gauche", mainD: "Main droite", deuxMains: "2 Mains", ceinture: "Ceinture", dos: "Sac à dos",
    tete: "Tête", mains: "Mains", haut: "Haut", bas: "Bas", pieds: "Pieds",
    sousvet: "Sous-vêtement", hautbas: "Robe",
    oreilles: "Boucles d'oreilles", collier: "Collier",
    poignetG: "Poignet gauche", poignetD: "Poignet droit",
    bagueG: "Bague gauche", bagueD: "Bague droite",
    chevilleG: "Cheville gauche", chevilleD: "Cheville droite", cape: "Cape",
    poignet: "Poignet", bague: "Bague", cheville: "Cheville",
    ceint: "Ceinture", sacep: "Sac à dos", poches: "Poches", sac: "Sac à dos", terre: "Par terre"
  };
  // le nom d'une case vide coupé à la main : les deux côtés d'une paire se
  // coupent au même endroit, jamais l'un seul parce que l'autre tient
  var CASE_LIGNES = {
    poignetG: "Poignet\ngauche", poignetD: "Poignet\ndroit",
    chevilleG: "Cheville\ngauche", chevilleD: "Cheville\ndroite"
  };
  // Les poches n'acceptent que Minuscule / Très petite. Le sol n'a aucune limite.
  function lieuPermis(o, ou) {
    if (ou === "terre" || ou === "sac") return true;
    if (ou === "poches") return window.OwdInventoryData.pocketFits(o);
    return casePermise(o, ou);
  }
  function champsObjet(it, q) {
    var bagWeight = it.sac ? window.OwdInventoryData.weight(state.inv.objets,it) * (pnum(it.qte)>0 ? pnum(q)/pnum(it.qte) : 0) : null;
    var fields = [["Quantité", fmtP(q)], ["Poids", fmtP(it.poids || 0) + (q > 1 ? " (total " + fmtP(q * (it.poids || 0)) + ")" : "")],
      ["Volume", it.encombre===null?"Non renseigné":fmtP(it.encombre || 0) + " L"],
      ["Achat", prixObjetTexte(it,false)], ["Vente", prixObjetTexte(it,true)]];
    function add(k,v){if(v!=null && String(v).trim()!=="")fields.push([k,String(v)]);}
    if(it.arme){var a=it.arme;add("Type",a.type || "Arme");add("Attaque",a.attaque);add("Dégâts",a.degats);
      add("Mods dégâts",(a.modsDegats||[]).filter(Boolean).join(" · "));add("Parade",a.parade);add("Réduction",a.reduction);
      add("Mods parade",(a.modsParade||[]).filter(Boolean).join(" · "));
      var comp=(state.comps||[]).filter(function(c){return c.id===a.comp;})[0];if(comp)add("Compétence",comp.nom);
    } else if(it.vet)add("Type",INV_NOMS[it.vet] || it.vet);
    else if(it.acc)add("Type",INV_NOMS[it.acc] || it.acc);
    else if(it.sac)add("Type","Sac à dos");else if(it.ceint)add("Type","Ceinture");
    if(it.contenant)add("Contenant",it.contenant);if(it.contenu)add("Contenu",it.contenu);
    add("Type",INV_TYPES_OBJETS[invType(it)]);add("Sous-type",it.sousType);add("Taille",it.taille);add("Mains",it.mains || it.arme&&it.arme.mains || 1);
    if(it.nourri){add("Contenance",it.places===null?"Non renseignée":fmtP(it.places || 0));add("PS",it.ps===null?"Non renseigné":fmtP(it.ps||0));add("PH",it.ph===null?"Non renseigné":fmtP(it.ph||0));}
    (it.effets||[]).filter(Boolean).forEach(function(id,i){add("Effet "+(i+1),id);});
    Object.keys(it.restaurations||{}).forEach(function(k){if(it.restaurations[k])add("Restauration "+k.toUpperCase(),fmtP(it.restaurations[k])+" "+(it.unitesRestauration[k]||"points"));});
    if(it.cap)add("Capacité",fmtP(it.cap)+" L");if(it.ep)add("Accroches",fmtP(it.ep)+" acc (max. "+(it.tailleAccroche || "non renseignée")+")");
    if(it.poches)add("Poches",fmtP(it.poches)+" L");if(it.froid)add("Protection froid",fmtP(it.froid));if(it.chaud)add("Protection chaleur",fmtP(it.chaud));
    ["physique","tranchant","contondant","perforant","feu","froid","eclair","decomposition","ethere","brut"].forEach(function(t){
      var labels={eclair:"éclair",decomposition:"décomposition",ethere:"éthéré"},label=labels[t]||t;
      if(it["res_"+t])add("Résistance "+label,fmtP(it["res_"+t])+" %");if(it["prot_"+t])add("Protection "+label,fmtP(it["prot_"+t]));
    });
    var stats=it.stats||{};
    ["degats","protections","resistances"].forEach(function(k){Object.keys(stats[k]||{}).forEach(function(t){if(stats[k][t])add(({degats:"Bonus dégâts ",protections:"Protection passive ",resistances:"Résistance passive "})[k]+combatLibType(t),fmtP(stats[k][t])+(k==="protections"?"":" %"));});});
    Object.keys(stats.couts||{}).forEach(function(k){if(stats.couts[k])add("Coût "+k.toUpperCase(),fmtP(stats.couts[k])+" %");});
    [["vitesse","Vitesse"],["innocence","Résistance corruption"],["alterations","Résistance altérations"]].forEach(function(x){if(stats[x[0]])add(x[1],fmtP(stats[x[0]])+(x[0]==="vitesse"?"":" %"));});
    if(it.sac||it.ceint){add("Accroches",it.ep);add("Taille maximale aux accroches",it.tailleAccroche);}
    if(it.sac||it.contenant)add("Capacité (L)",it.cap);
    (it.reglesManuelles||[]).forEach(function(rule){add("Propriété — gestion manuelle",rule);});
    if(bagWeight!==null)add("Poids avec contenu",fmtP(bagWeight)+" kg");
    if(it.rapide)add("Accès rapide","Oui");add("",it.desc);return fields;
  }
  function montreObjet(ref, qte) {
    var it = state && state.inv && state.inv.objets.filter(function (o) { return o.ref === ref; })[0];
    if (it) {var q=qte==null?it.qte:Math.min(pnum(qte),it.qte);if(!q)return;
      sayChat("OWD Item Show", [["Objet",it.nom || "objet"]].concat(champsObjet(it,q),
        [["Montrer","[Montrer](/owd_item_show "+packObjet(it,q)+")"]]));}
  }
  function actionObjet(ref, action) {
    function objet() { return state.inv.objets.filter(function (o) { return o.ref === ref; })[0]; }
    var it = objet(); if (!it) return;
    if (action === "montrer") { montreObjet(ref); return; }
    if (action === "donner") { donnerDialogue(it, it.qte); return; }
    if (action !== "supprimer") return;
    confirmer("Détruire un objet", "Détruire « " + (it.nom || "cet objet") + " » de l'inventaire" + (it.sac ? " avec tout son contenu" : "") + " ?", "Détruire", function () {
      var actuel = objet(); if (!actuel) return;
      window.OwdInventoryData.isolateAncestors(state.inv.objets,actuel);
      if(actuel.sac){var refs=window.OwdInventoryData.group(state.inv,actuel.ref).map(function(o){return o.ref;});
        for(var z=state.inv.objets.length-1;z>=0;z--)if(state.inv.objets[z]!==actuel&&refs.indexOf(state.inv.objets[z].ref)>=0)state.inv.objets.splice(z,1);}
      if (actuel.contenant) state.inv.objets.forEach(function (o) {
        if (String(o.dans || "") === String(ref)) { o.qte=Math.round(pnum(o.qte)*pnum(actuel.qte)*100)/100; o.dans = ""; o.ou = actuel.ou === "terre" ? "terre" : "sac"; o.emp = -1; }
      });
      state.inv.objets.splice(state.inv.objets.indexOf(actuel), 1);
      refresh(); if (invRender) invRender();
    });
  }
  var invSelectionLocale = "", invEditionObjetLocale = "";
  function invObjets(container, renderRef) {
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = items.filter(function (o) { return o.ref === invSelectionLocale; })[0] || null;          // l'OBJET affiché au panneau
    var drag = null;         // l'objet qu'on glisse
    var panelHooks = [];     // ce que le panneau rafraîchit, vidé à chaque rendu

    // Le rouage du module ne règle que l’affichage commun aux tuiles.
    var optRow = el("div", "pc-obj-opts pc-edit-only");
    var choixCoins=[["aucun","Aucun"],["nom","Nom"],["qte","Quantité"],["poids","Poids unitaire"],["poidsTotal","Poids total"],["volume","Volume unitaire"],["volumeTotal","Volume total"],["da","Prise en main (DA)"]];
    [["hautGauche","En haut à gauche"],["hautDroite","En haut à droite"],["basGauche","En bas à gauche"],["basDroite","En bas à droite"]].forEach(function(c){
      var select=el("select","pc-select pc-edit-field");select.setAttribute("aria-label",c[1]);select.dataset.invCorner=c[0];
      choixCoins.forEach(function(v){var option=el("option",null,v[1]);option.value=v[0];option.selected=O.coins[c[0]]===v[0];select.appendChild(option);});
      select.addEventListener("change",function(){O.coins[c[0]]=select.value;render();refresh();});
      optRow.appendChild(fld(c[1],select));
    });
    var totalToggle=el("button","pc-chip"+(O.total?" on":""),"Total porté");totalToggle.type="button";totalToggle.setAttribute("aria-pressed",String(!!O.total));
    totalToggle.addEventListener("click",function(){O.total=!O.total;totalToggle.classList.toggle("on",O.total);totalToggle.setAttribute("aria-pressed",String(O.total));refresh();});optRow.appendChild(totalToggle);
    container.appendChild(optRow);

    var wrap = el("div", "pc-obj-wrap");
    var leftBox = el("div", "pc-obj-left");
    var panel = el("div", "pc-obj-panel");
    wrap.appendChild(leftBox);
    wrap.appendChild(panel);
    var tot = el("div", "pc-inv-total");
    var objetsAvecContenu=Object.create(null);
    function indexContenus(){objetsAvecContenu=Object.create(null);items.forEach(function(o){if(o.dans)objetsAvecContenu[o.dans]=true;});}
    var majGroupes = [];     // les poids des bandeaux, rafraîchis sans re-rendu

    function updateTotal() {
      indexContenus();
      tot.style.display = O.total ? "" : "none";
      majGroupes.forEach(function (f) { f(); });
      tot.textContent = "Poids porté : " + fmtP(poidsPorte()) + " / " + fmtP(charge()) + " kg";
    }

    // ---- Contenants / Contenus -------------------------------------------------
    // Un Contenant offre une case pour un contenu identique. Un Contenu est un objet complet dont
    // la catégorie doit être exactement celle du Contenant qui le reçoit. Le
    // lien voyage par `ref`, jamais par le nom affiché : renommer une gourde ne
    // fait donc pas tomber son eau.
    function assureRef(o) {
      if (o && !o.ref) o.ref = uid("o");
      return o && o.ref ? String(o.ref) : "";
    }
    function contenusDans(porteur) {
      var ref=assureRef(porteur);
      return ref?items.filter(function(o){return o!==porteur && String(o.dans||"")===ref;}):[];
    }
    function contenuDans(porteur) {return contenusDans(porteur)[0] || null;}
    function nomCategorie(cle) {
      var noms = { liquide: "Liquide", poudre: "Poudre", pate: "Pâte" }, trouve = noms[cle] || "";
      if (trouve) return trouve;
      armesData().forEach(function (a) {
        var m = a && a.munition;
        if (!trouve && m && typeof m === "object" && String(m.cle || "") === String(cle || ""))
          trouve = String(m.nom || m.cle);
      });
      return trouve || String(cle || "");
    }
    function compatibleContenu(o, porteur) {
      return !!(o && o.contenu && porteur && porteur.contenant &&
                String(o.contenu) === String(porteur.contenant));
    }
    function libereContenu(porteur, silencieux) {
      if(!silencieux)window.OwdInventoryData.isolate(items,porteur);
      var ref = porteur && porteur.ref ? String(porteur.ref) : "", n = 0;
      if (!ref) return 0;
      items.forEach(function (o) {
        if (String(o.dans || "") !== ref) return;
        if(silencieux)o.qte=Math.round(pnum(o.qte)*pnum(porteur.qte)*100)/100;
        o.dans = ""; o.ou = porteur.ou === "terre" ? "terre" : "sac"; o.emp = -1; n++;
      });
      if (n && !silencieux) flash("Le contenu a été sorti du contenant.");
      return n;
    }
    function poseContenu(o, porteur) {
      if(window.__owdCanEdit&&!window.__owdCanEdit())return false;
      if (!o || !porteur || o === porteur) return false;
      if (!o.contenu) { flash("Seul un objet de type Contenu peut être placé ici."); return false; }
      if (!porteur.contenant) { flash("Cet objet n'est pas un contenant."); return false; }
      if (!compatibleContenu(o, porteur)) {
        flash("Ce contenant accepte « " + nomCategorie(porteur.contenant) + " », pas « " +
              nomCategorie(o.contenu) + " ».");
        return false;
      }
      if(window.OwdInventoryData.group({objets:items},o.ref).some(function(x){return x.ref===porteur.ref;}))return false;
      if(!window.OwdInventoryData.canContain(items,o,porteur)){
        flash("Ce contenant contient déjà un contenu différent.");return false;
      }
      window.OwdInventoryData.isolate(items,porteur);
      window.OwdInventoryData.isolateAncestors(items,o);
      var avant=contenusDans(porteur);
      assureRef(o); assureRef(porteur);
      o.dans = porteur.ref;
      // `ou` reste un repli lisible par les anciens schémas. Tant que `dans`
      // est posé, le contenu n'apparaît pas dans le sac et n'en consomme pas
      // l'encombrement une seconde fois.
      o.ou = "sac"; o.emp = -1;
      var cible=avant.filter(function(child){return child!==o;})[0]||o;
      avant.concat([o]).forEach(function(child){
        if(child!==cible&&items.indexOf(child)>=0&&window.OwdInventoryData.canMerge(items,cible,child))window.OwdInventoryData.merge(items,cible,child);
      });
      return cible;
    }

    function vignette(file, cb) {
      var r = new FileReader();
      r.onerror = function () { flash("Image illisible."); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          if (!img.width || !img.height) { flash("Image illisible."); return; }   // ex. SVG sans dimensions
          // le PORTRAIT des images du livre, 84 × 128
          var W = 84, H = 128, c = document.createElement("canvas");
          c.width = W; c.height = H;
          var k = Math.max(W / img.width, H / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    // DÉPLACER un objet vers `ou`, juste avant `cible` (null : à la fin). Une
    // case déjà prise ÉCHANGE : ce qu'elle tenait part là d'où l'objet vient,
    // ou au sac s'il n'y a pas sa place. Un objet à deux cases (robe, arme à
    // deux mains) libère les DEUX, et ce qui les tenait part au sac.
    function deplace(o, ou, cible) {
      if(window.__owdCanEdit&&!window.__owdCanEdit())return false;
      if((INV_CASES.indexOf(ou)>=0 || ou==="deuxMains") && pnum(o.qte)<1){flash("Un emplacement exige un exemplaire entier.");return false;}
      var deuxMains=ou==="deuxMains" || o.mains==="2 obligatoires" && (ou==="mainG" || ou==="mainD");
      if(ou==="deuxMains")ou="mainD";
      if (!lieuPermis(o, ou)) {
        flash(ou === "poches" ? "Les poches acceptent uniquement les objets de taille Très petite ou Minuscule (renseignez la taille de l'objet)." : "« " + INV_NOMS[ou] + " » ne prend pas cet objet.");
        return false;
      }
      var bagCible=window.OwdInventoryData.backpack(items);
      if(ou === "sac" && bagCible && o!==bagCible && !invTailleAccepte(o.taille,invTailleMaxSac(bagCible))){flash("Cet objet dépasse la taille intérieure maximale du sac.");return false;}
      window.OwdInventoryData.isolateAncestors(items,o);
      if(INV_CASES.indexOf(ou)>=0)window.OwdInventoryData.isolate(items,o);
      var dest = ancrage(o, ou, deuxMains), cases = casesDe(o, dest, deuxMains), vient = o.ou;
      // Tirer un Contenu hors de son petit slot le redevient un objet libre.
      window.OwdInventoryData.bind(items);
      o.dans = "";
      var chasses = [];
      cases.forEach(function (c) {
        var occ = objetEn(c);
        if (occ && occ !== o && chasses.indexOf(occ) < 0) chasses.push(occ);
      });
      o.ou = dest;
      o.tenueDeuxMains = deuxMains;
      o.emp = -1;
      chasses.forEach(function (occ) {
        // l'échange simple : un seul occupant, qui tient là d'où l'objet vient
        var retour = chasses.length === 1 && lieuPermis(occ, vient) &&
                     casesDe(occ, vient).every(function (c) { return casesDe(o).indexOf(c) < 0; });
        occ.ou = retour ? ancrage(occ, vient, false) : "sac";
        occ.tenueDeuxMains = occ.mains === "2 obligatoires" && (occ.ou === "mainD" || occ.ou === "mainG");
      });
      if (cible !== undefined) {
        items.splice(items.indexOf(o), 1);
        var at = cible ? items.indexOf(cible) : -1;
        if (at < 0) items.push(o);
        else items.splice(at, 0, o);
      }
      var bag = window.OwdInventoryData.backpack(items);
      if(dest === "sac" && bag && bag!==o) o.dans=bag.ref;
      window.OwdInventoryData.bind(items);
      rangeEmplacements(items);   // une ceinture ôtée rend ses emplacements
      return true;
    }

    // POSER dans l'emplacement k de la ceinture (« ceint ») ou du sac
    // (« sacep ») : UN exemplaire, qu'on détache d'une pile, et pas plus
    // encombrant que l'emplacement ne l'accepte. Ce qui l'occupait retourne
    // d'où l'objet vient s'il y tient, au sac sinon.
    function poseEp(o, lieu, k) {
      if(window.__owdCanEdit&&!window.__owdCanEdit())return null;
      if(k<0 || k+invCoutAcc(o,lieu)>nbEp(lieu)){flash("Pas assez d’accroches contiguës.");return null;}
      if (!epPermis(o, lieu)) {
        flash(o === porteurEp(lieu) ? "Un contenant ne s'accroche pas à lui-même."
          : "Cet objet dépasse la taille maximale des accroches (" + ebMaxEp(lieu) + ").");
        return null;
      }
      var vient = o.ou, vientK = o.emp;
      var pose = o;
      window.OwdInventoryData.isolateAncestors(items,o);
      if (pnum(o.qte)>1) { pose=window.OwdInventoryData.split(items,o,1,uid("o")); vient=null; }
      var occ = objetEp(lieu, k);
      for(var slot=1;slot<invCoutAcc(pose,lieu);slot++){var autre=objetEp(lieu,k+slot);if(autre && autre!==pose && autre!==occ){autre.ou="sac";autre.emp=-1;autre.dans="";}}
      pose.dans = "";
      pose.ou = lieu;
      pose.emp = k;
      if (occ && occ !== pose) {
        if (vient && INV_EP.indexOf(vient) >= 0 && epPermis(occ, vient)) { occ.ou = vient; occ.emp = vientK; }
        else if (vient === "terre" || vient === "sac" || (vient === "poches" && lieuPermis(occ, "poches"))) { occ.ou = vient; occ.emp = -1; }
        else { occ.ou = "sac"; occ.emp = -1; }
      }
      window.OwdInventoryData.bind(items);
      rangeEmplacements(items);
      return pose;
    }

    // Petit slot visible DANS la tuile d'un Contenant. Il est lui-même
    // draggable quand il est plein : on peut donc sortir son Contenu vers le
    // sac/les poches ou le déposer dans un autre Contenant compatible.
    function slotContenant(porteur) {
      var contenus=contenusDans(porteur);
      var groupe=el("div","pc-obj-content-group");
      groupe.title="Contenu";
      // Les anciens contenus restent accessibles, sans créer une case vide à côté.
      var visibles=contenus.length?contenus:[null];
      visibles.forEach(function(occ){
        var s=el("div","pc-obj-content-slot"+(occ?" plein":" vide")+(sel===occ?" sel":""));
        s.title=occ?(occ.nom||"Contenu"):"Déposer un contenu "+nomCategorie(porteur.contenant);
        if(occ){
          if(occ.img){var im=el("img");im.alt="";im.draggable=false;im.src=occ.img;s.appendChild(im);}
          else s.appendChild(el("span","pc-obj-content-ph",(nomCategorie(occ.contenu)||"?").slice(0,1).toUpperCase()));
          s.appendChild(el("span","pc-obj-content-qte","x "+fmtP(pnum(occ.qte))));
          s.draggable=ficheModifiable();
          s.addEventListener("click",function(e){e.stopPropagation();sel=occ;render();});
          s.addEventListener("dragstart",function(e){e.stopPropagation();drag=occ;s.classList.add("drag");try{e.dataTransfer.setData("text/plain","");e.dataTransfer.effectAllowed="move";if(window.__owdObjetDrag)window.__owdObjetDrag(drag.ref,e.dataTransfer);}catch(err){}});
          s.addEventListener("dragend",function(e){e.stopPropagation();drag=null;if(window.__owdObjetDragFin)window.__owdObjetDragFin();render();});
        }else s.appendChild(el("span","pc-obj-content-ph","+"));
        s.addEventListener("dragover",function(e){if(!drag||drag===porteur)return;e.preventDefault();e.stopPropagation();s.classList.toggle("over",window.OwdInventoryData.canContain(items,drag,porteur));});
        s.addEventListener("dragleave",function(e){e.stopPropagation();s.classList.remove("over");});
        s.addEventListener("drop",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();var d=drag;drag=null;var contenu=poseContenu(d,porteur);if(contenu){sel=contenu;save();refresh();}render();});
        groupe.appendChild(s);
      });
      return groupe;
    }

    // Menu local aux objets : mêmes opérations que le panneau et le drag.
    var menuObjet = null, menuRef = "";
    function fermeMenu(retour) {
      var ref = menuRef;
      if (menuObjet && menuObjet.parentNode) menuObjet.parentNode.removeChild(menuObjet);
      menuObjet = null; menuRef = "";
      if (retour) Array.prototype.some.call(container.querySelectorAll(".pc-obj-tile"), function (t) {
        if (t.dataset.objectRef !== ref) return false;
        t.focus(); return true;
      });
    }
    function objetActuel(ref) {
      return items.filter(function (o) { return o.ref === ref; })[0] || null;
    }
    function avecQuantite(ref, titre, action) {
      var it = objetActuel(ref); if (!it) return;
      var body = el("div", "pc-modal-body"), q = el("input", "n");
      q.type = "number"; q.min = "0.01"; q.max = fmtP(it.qte); q.step = "any";
      q.value = fmtP(Math.min(1, it.qte / 2));
      body.appendChild(el("div", "pc-modal-note", "Indiquez une quantité inférieure à la pile (" + fmtP(it.qte) + ")."));
      body.appendChild(fld("Quantité", q));
      dialogue(titre + " — " + (it.nom || "objet"), body, function () {
        var actuel = objetActuel(ref), n = Math.round(pnum(q.value) * 100) / 100;
        if (!actuel) { flash("Cet objet n'est plus dans l'inventaire."); return; }
        if (!(n > 0 && n < actuel.qte)) { flash("Indiquez une quantité supérieure à zéro et inférieure à la pile."); q.focus(); return false; }
        try { action(actuel, n); } catch (e) { flash(e.message); return false; }
      }, titre);
    }
    function emplacementsEquipement(it) {
      if (it.arme) return ["mainD", "mainG"];
      if (it.sac) return ["dos"];
      if (it.ceint) return ["ceinture"];
      if (it.vet) return [it.vet === "hautbas" ? "haut" : it.vet];
      if (it.acc) return (INV_ACC_TYPES[it.acc] || []).slice();
      return [];
    }
    function rangeRemplace(it) {
      var bag = window.OwdInventoryData.backpack(items);
      deplace(it, bag && bag !== it ? "sac" : "terre");
    }
    function equipeObjet(it) {
      var lieux = emplacementsEquipement(it).filter(function (ou) { return casePermise(it, ou); });
      if (!lieux.length) return;
      var libre = lieux.filter(function (ou) { return casesDe(it, ou).every(function (c) { return !objetEn(c); }); });
      var ou = libre[0] || lieux[0], remplaces = [];
      casesDe(it, ou).forEach(function (c) { var o = objetEn(c); if (o && o !== it && remplaces.indexOf(o) < 0) remplaces.push(o); });
      var pose = it;
      if(pnum(it.qte)>1)pose=window.OwdInventoryData.split(items,it,1,uid("o"));
      if (deplace(pose, ou)) { remplaces.forEach(rangeRemplace); sel = pose; render(); refresh(); }
    }
    function accrocheObjet(it, lieu) {
      if (!nbEp(lieu) || !epPermis(it, lieu)) return;
      var k = 0;
      for (var i = 0; i < nbEp(lieu); i++) if (!objetEp(lieu, i)) { k = i; break; }
      var occ = objetEp(lieu, k), pose = poseEp(it, lieu, k);
      if (pose) { if (occ && occ !== pose) rangeRemplace(occ); sel = pose; render(); refresh(); }
    }
    function ouvreMenu(it, e) {
      if(!ficheModifiable()){e.preventDefault();return;}
      e.preventDefault(); e.stopPropagation(); fermeMenu();
      if (!objetActuel(it.ref)) return;
      var r = e.currentTarget.getBoundingClientRect();
      menuRef = it.ref; menuObjet = el("div", "pc-inv-context");
      menuObjet.setAttribute("role", "menu");
      menuObjet.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
      menuObjet.setAttribute("aria-label", "Actions — " + (it.nom || "objet"));
      var groupes = [], part = pnum(it.qte) > 1;
      function entree(label, fn, danger) { return { label: label, fn: fn, danger: danger }; }
      groupes.push([entree("Montrer", function (o) { montreObjet(o.ref); })].concat(part ? [entree("Montrer une partie", function (o) {
        avecQuantite(o.ref, "Montrer une partie", function (a, q) { montreObjet(a.ref, q); });
      })] : []));
      groupes.push([entree("Donner", function (o) { donnerDialogue(o, o.qte, "all"); })].concat(part ? [entree("Donner une partie", function (o) {
        donnerDialogue(o, Math.min(1, o.qte / 2), "part");
      })] : []));
      if (part) groupes.push([entree("Séparer une partie", function (o) {
        avecQuantite(o.ref, "Séparer une partie", function (a, q) { window.OwdInventoryData.split(items, a, q, uid("o")); render(); refresh(); });
      })]);
      groupes.push([entree("Détruire", function (o) { actionObjet(o.ref, "supprimer"); }, true)].concat(part ? [entree("Détruire une partie", function (o) {
        avecQuantite(o.ref, "Détruire une partie", function (a, q) { window.OwdInventoryData.isolateAncestors(items,a); a.qte = Math.round((a.qte - q) * 100) / 100; render(); refresh(); });
      }, true)] : []));
      if (it.sac) groupes.push([entree("Voir son contenu", function (o) {
        sel = o; render(); var contenu = panel.querySelector(".pc-obj-tiles");
        if (contenu) contenu.scrollIntoView({ block: "nearest" });
      })]);
      var deplacements = [], bag = window.OwdInventoryData.backpack(items);
      if (bag && bag !== it && !(it.ou === "sac" && it.dans === bag.ref)) deplacements.push(entree("Déplacer dans le sac à dos", function (o) {
        if (deplace(o, "sac")) { sel = o; render(); refresh(); }
      }));
      if (lieuPermis(it, "poches") && (it.ou !== "poches" || it.dans)) deplacements.push(entree("Déplacer dans les poches", function (o) {
        if (deplace(o, "poches")) { sel = o; render(); refresh(); }
      }));
      if (it.ou !== "terre" || it.dans) deplacements.push(entree("Déplacer par terre", function (o) {
        if (deplace(o, "terre")) { sel = o; render(); refresh(); }
      }));
      if (deplacements.length) groupes.push(deplacements);
      var equipements = [], lieux = emplacementsEquipement(it);
      if (lieux.length && (!casesDe(it).length || lieux.indexOf(it.ou) < 0)) equipements.push(entree("Équiper", equipeObjet));
      [["ceint", "Accrocher à la ceinture"], ["sacep", "Accrocher au sac à dos"]].forEach(function (opt) {
        if (nbEp(opt[0]) > 0 && epPermis(it, opt[0]) && it.ou !== opt[0]) equipements.push(entree(opt[1], function (o) { accrocheObjet(o, opt[0]); }));
      });
      if (equipements.length) groupes.push(equipements);
      groupes.forEach(function (g, i) {
        if (i) { var sep = el("div", "pc-inv-context-separator"); sep.setAttribute("role", "separator"); menuObjet.appendChild(sep); }
        g.forEach(function (a) {
          var b = el("button", a.danger ? "danger" : "", a.label); b.type = "button"; b.setAttribute("role", "menuitem");
          b.addEventListener("click", function () {
            var o = objetActuel(it.ref); fermeMenu(); if (!o) return;
            try { a.fn(o); } catch (err) { flash(err.message); }
          }); menuObjet.appendChild(b);
        });
      });
      (appEl || rootEl || document.body).appendChild(menuObjet);
      var x = e.clientX || r.left + 8, y = e.clientY || r.top + 8, box = menuObjet.getBoundingClientRect();
      menuObjet.style.left = Math.max(8, Math.min(x, window.innerWidth - box.width - 8)) + "px";
      menuObjet.style.top = Math.max(8, Math.min(y, window.innerHeight - box.height - 8)) + "px";
      menuObjet.querySelector("button").focus();
    }
    function menuExterieur(e) { if (menuObjet && !menuObjet.contains(e.target)) fermeMenu(); }
    function menuClavier(e) {
      if (!menuObjet) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermeMenu(true); return; }
      if (e.key === "Tab") { fermeMenu(); return; }
      var bs = Array.prototype.slice.call(menuObjet.querySelectorAll("button")), at = bs.indexOf(document.activeElement), next;
      if (e.key === "ArrowDown") next = (at + 1) % bs.length;
      else if (e.key === "ArrowUp") next = (at + bs.length - 1) % bs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = bs.length - 1;
      if (next !== undefined) { e.preventDefault(); bs[next].focus(); }
    }
    function menuScroll(e) { if (!menuObjet || menuObjet.contains(e.target)) return; fermeMenu(); }
    document.addEventListener("pointerdown", menuExterieur, true);
    document.addEventListener("keydown", menuClavier, true);
    document.addEventListener("scroll", menuScroll, true);
    function menuRedimensionne() { fermeMenu(); }
    window.addEventListener("resize", menuRedimensionne);
    window.addEventListener("blur", menuRedimensionne);
    remontageNettoyage.push(function () {
      fermeMenu(); document.removeEventListener("pointerdown", menuExterieur, true);
      document.removeEventListener("keydown", menuClavier, true); document.removeEventListener("scroll", menuScroll, true);
      window.removeEventListener("resize", menuRedimensionne);
      window.removeEventListener("blur", menuRedimensionne);
    });

    function tile(it) {
      var t = el("div", "pc-obj-tile" + (sel === it ? " sel" : ""));
      t.dataset.objectRef = assureRef(it); t.tabIndex = 0;
      t.addEventListener("contextmenu", function (e) { ouvreMenu(it, e); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) ouvreMenu(it, e);
      });
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
      ["hautGauche","hautDroite","basGauche","basDroite"].forEach(function(position){
        var key=O.coins[position];if(key==="aucun")return;
        var badge=el("span","pc-obj-corner "+position);badge.dataset.corner=position;badge.dataset.value=key;t.appendChild(badge);
        function update(){
          var q=pnum(it.qte),value="",label="";
          if(key==="nom"){value=it.nom||"Objet";label="Nom";}
          if(key==="qte"){value="x "+fmtP(q);label="Quantité";}
          if(key==="da"){value=window.OwdInventoryData.takeCost(it)+" DA";label="Prise en main";}
          if(key==="poids"||key==="poidsTotal"){value=it.poids==null?"—":fmtP(key==="poidsTotal"?(objetsAvecContenu[it.ref]?window.OwdInventoryData.weight(items,it):pnum(it.poids)*q):pnum(it.poids))+" kg";label=key==="poidsTotal"?"Poids total, contenu inclus":"Poids unitaire";}
          if(key==="volume"||key==="volumeTotal"){value=it.encombre==null?"—":fmtP(pnum(it.encombre)*(key==="volumeTotal"?q:1))+" L";label=key==="volumeTotal"?"Volume total":"Volume unitaire";}
          if(badge.textContent!==value)badge.textContent=value;
          badge.title=label+" : "+value;
        }
        majGroupes.push(update);update();
      });
      if (it.contenant) t.appendChild(slotContenant(it));
      t.title = (it.nom || "Objet") + (it.rapide ? " — accès rapide" : "");
      majGroupes.push(function(){var titre=(it.nom||"Objet")+(it.rapide?" — accès rapide":"");if(t.title!==titre)t.title=titre;});
      if (it.rapide) t.classList.add("rapide");

      t.addEventListener("click", function (e) { e.stopPropagation(); sel = it; render(); });
      t.draggable = ficheModifiable();
      // RANGER SE JOUE : on passe l'épée d'une main à l'autre, on range une
      // fiole dans les poches en pleine partie. Le glisser-déposer marche donc
      // hors du mode édition comme dedans.
      t.addEventListener("dragstart", function (e) {
        drag = it;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; if (window.__owdObjetDrag) window.__owdObjetDrag(drag.ref, e.dataTransfer); } catch (err) {}
      });
      t.addEventListener("dragend", function () { drag = null; if (window.__owdObjetDragFin) window.__owdObjetDragFin(); render(); });
      // dans les poches et le sac, déposer SUR une tuile range avant ou après
      // elle ; dans une case, c'est la case qui reçoit
      if (it.ou === "poches" || it.ou === "sac" || it.ou === "terre") {
        t.addEventListener("dragover", function (e) {
          if (!drag || drag === it) return;
          e.preventDefault();
          e.stopPropagation();
          var r = t.getBoundingClientRect();
          var avant = e.clientX < r.left + r.width / 2;
          t.classList.toggle("over-l", avant);
          t.classList.toggle("over-r", !avant);
        });
        t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
        t.addEventListener("drop", function (e) {
          if (!drag || drag === it) return;
          e.preventDefault();
          e.stopPropagation();
          var r = t.getBoundingClientRect();
          var avant = e.clientX < r.left + r.width / 2;
          var o = drag; drag = null;
          var cible = it;
          if (!avant) {
            var suivants = items.filter(function (x) { return !x.dans && x.ou === it.ou && x !== o; });
            var k = suivants.indexOf(it);
            cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
          }
          if (deplace(o, it.ou, cible)) { sel = o; refresh(); }
          render();
        });
      }
      return t;
    }

    // une CASE de Sur soi : l'objet qu'elle tient, ou son nom en creux
    function caseSurSoi(ou) {
      var c = el("div", "pc-inv-case");
      c.dataset.ou = ou;
      var o = objetEn(ou);
      if (o) {
        c.appendChild(tile(o));
        // la SECONDE case d'un objet qui en tient deux : le même objet, en écho
        if (o.ou !== ou) c.classList.add("echo");
      } else c.appendChild(el("div", "pc-inv-vide", CASE_LIGNES[ou] || INV_NOMS[ou]));
      c.title = INV_NOMS[ou];
      c.addEventListener("dragover", function (e) {
        if (!drag || !lieuPermis(drag, ou)) return;
        e.preventDefault();
        c.classList.add("over");
      });
      c.addEventListener("dragleave", function () { c.classList.remove("over"); });
      c.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        var d = drag; drag = null;
        if (deplace(d, ou)) { sel = d; refresh(); }
        render();
      });
      return c;
    }

    // un EMPLACEMENT : l'objet qu'il tient, ou l'encombrance qu'il accepte en creux
    function caseEp(lieu, k) {
      var c = el("div", "pc-inv-case pc-inv-ep");
      var o = objetEp(lieu, k);
      if (o) c.appendChild(tile(o));
      else c.appendChild(el("div", "pc-inv-vide", "≤ " + (ebMaxEp(lieu) || "Taille libre")));
      c.title = "Emplacement " + (k + 1) + " — " + (ebMaxEp(lieu) || "Taille libre") + " au plus, un exemplaire";
      c.addEventListener("dragover", function (e) {
        if (!drag || !epPermis(drag, lieu)) return;
        e.preventDefault();
        e.stopPropagation();
        c.classList.add("over");
      });
      c.addEventListener("dragleave", function () { c.classList.remove("over"); });
      c.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        var d = drag; drag = null;
        var pose = poseEp(d, lieu, k);
        if (pose) { sel = pose; refresh(); }
        render();
      });
      return c;
    }
    // les emplacements d'un lieu, cinq par ligne, sur leurs PROPRES lignes :
    // la dernière se complète de blancs, aucun objet libre ne s'y glisse
    function lignesEp(lieu) {
      var n = nbEp(lieu), box = el("div", "pc-inv-eps");
      for (var i = 0; i < n; i += 5) {
        var l = el("div", "pc-inv-cases");
        for (var k = i; k < i + 5; k++)
          l.appendChild(k < n ? caseEp(lieu, k) : el("div", "pc-inv-case pc-inv-rien"));
        box.appendChild(l);
      }
      return box;
    }

    function bandeau(titre, pds) {
      var head = el("div", "pc-obj-ghead");
      head.appendChild(el("span", "nm", titre));
      if (pds) head.appendChild(pds);
      return head;
    }

    function caseDeuxMains() {
      var c=el("div","pc-inv-case pc-inv-rien pc-inv-twohand-cell");
      var zone=el("div","pc-obj-content-slot pc-inv-twohand-target","2 Mains");
      zone.title="Tenir cet objet à deux mains : disponible même si une seule main suffit";
      zone.setAttribute("role","group");zone.setAttribute("aria-label","Déposer pour tenir à deux mains");
      var occ=objetEn("mainG"),autre=objetEn("mainD");
      if(occ && occ===autre){zone.classList.add("plein");zone.title="Tenue à deux mains : "+(occ.nom||"Objet");}
      zone.addEventListener("dragover",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();zone.classList.add("over");});
      zone.addEventListener("dragleave",function(e){e.stopPropagation();zone.classList.remove("over");});
      zone.addEventListener("drop",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();var d=drag;drag=null;if(deplace(d,"deuxMains")){sel=d;refresh();}render();});
      c.appendChild(zone);return c;
    }
    function groupeSurSoi() {
      var g = el("div", "pc-obj-group");
      g.appendChild(bandeau("Sur soi"));
      // l'ordre arrêté par l'auteur ; null laisse la case vide
      [["mainG", "mainD", null, "ceinture", "dos"],
       ["tete", "haut", "mains", "bas", "pieds"],
       ["oreilles", "collier", "sousvet", "poignetG", "poignetD"],
       ["bagueG", "bagueD", "chevilleG", "chevilleD", "cape"]].forEach(function (ligne) {
        var l = el("div", "pc-inv-cases");
        ligne.forEach(function (ou) {
          l.appendChild(ou ? caseSurSoi(ou) : caseDeuxMains());
        });
        g.appendChild(l);
      });
      return g;
    }

    // le compte des emplacements tenus, pour un bandeau
    function compteEp(lieu) {
      var pds = el("span", "pds");
      pds.title = "Emplacements tenus contre emplacements";
      function maj() {
        var n = nbEp(lieu), pris = items.filter(function (o) { return o.ou === lieu; }).reduce(function(t,o){return t+invCoutAcc(o,lieu);},0);
        pds.textContent = pris + " / " + n + " acc";
      }
      maj();
      majGroupes.push(maj);
      return pds;
    }
    // CEINTURE : ses emplacements seuls, une ligne en pointillé sans ceinture
    function groupeCeinture() {
      var g = el("div", "pc-obj-group");
      g.appendChild(bandeau("Ceinture", compteEp("ceint")));
      if (nbEp("ceint")) g.appendChild(lignesEp("ceint"));
      else {
        var l = el("div", "pc-obj-tiles");
        l.style.setProperty("--obj-cols", 5);
        for (var k = 0; k < 5; k++) l.appendChild(el("div", "pc-obj-tile pc-inv-trou"));
        g.appendChild(l);
      }
      return g;
    }

    // POCHES et SAC À DOS : capacité affichée. PAR TERRE : illimité et hors charge.
    // Le sac montre D'ABORD ses emplacements, sur leurs propres lignes.
    function groupeLibre(ou, titre, poids, cap) {
      var bag=window.OwdInventoryData.backpack(items);
      function visible(it){return it.ou===ou && (ou==="sac" ? bag&&it.dans===bag.ref : !it.dans);}
      var g = el("div", "pc-obj-group");
      var pds = el("span", "pds");
      pds.title = ou === "terre" ? "Sans limite : hors du poids porté" : "Volume contre capacité";
      function maj() {
        if (ou === "terre") {
          pds.textContent = items.filter(visible).length + " objets · illimité";
          pds.classList.remove("over");
          return;
        }
        var p = poids(), c = cap();
        pds.textContent = fmtP(p) + " / " + fmtP(c) + " L";
        pds.classList.toggle("over", p > c);
      }
      maj();
      majGroupes.push(maj);
      var head = bandeau(titre, pds);
      if (ou === "sac" && nbEp("sacep")) head.insertBefore(compteEp("sacep"), pds);
      g.appendChild(head);
      if (ou === "sac" && nbEp("sacep")) g.appendChild(lignesEp("sacep"));
      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", 5);
      items.forEach(function (it) { if (visible(it)) tiles.appendChild(tile(it)); });
      if (ou === "terre") {
      var add = el("button", "pc-obj-addtile", "+");add.type="button";add.setAttribute("aria-label","Ajouter un objet");
      add.title = "Ajouter un objet dans « " + titre + " »";
      add.addEventListener("click", function () {
        if(window.__owdCanEdit&&!window.__owdCanEdit())return;
        var o = { id: "", ref: uid("o"), nom: "", img: "", qte: 1, poids: 0, encombre: 0, places: 0, nourri: false, achat: 0, vente: null,
                  desc: "", ou: ou, emp: -1, rapide: false, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
                  sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0, contenant: "", contenu: "", dans: "", arme: null };
        if(ou === "sac" && bag) o.dans=bag.ref;
        items.push(o);
        invEditionObjetLocale=o.ref;
        sel = o;
        render();
        refresh();
      });
      tiles.appendChild(add);
      }
      // LA LIGNE SE COMPLÈTE de cases vides en pointillé, et un groupe vide en
      // garde une entière : on voit la place qui reste. La case « + » de
      // l'édition compte dans la ligne.
      var n = items.filter(function (x) { return visible(x); }).length + (ou === "terre" ? 1 : 0);
      var trous = Math.max(5, Math.ceil(n / 5) * 5) - n;
      for (var k = 0; k < trous; k++) tiles.appendChild(el("div", "pc-obj-tile pc-inv-trou"));
      tiles.addEventListener("dragover", function (e) {
        if (!drag) return;
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (!drag) return;
        e.preventDefault();
        var o = drag; drag = null;
        if (deplace(o, ou, null)) { sel = o; refresh(); }
        render();
      });
      g.appendChild(tiles);
      return g;
    }

    // ---- le détail de l'objet ----
    function champNombre(libelle, lire, ecrire, titre) {
      var i = el("input", "pc-edit-field");
      i.type = "text"; i.inputMode = "decimal";
      i.value = lire() ? fmtP(lire()) : "";
      i.placeholder = libelle==="Prix d'achat" ? "Non renseigné" : "0";
      if (titre) i.title = titre;
      i.addEventListener("input", function () { ecrire(i.value); save(); updateTotal(); refresh(); });
      i.addEventListener("blur", function () { i.value = lire() ? fmtP(lire()) : ""; });
      return fld(libelle, i);
    }

    // Les sous-champs propres à un type vivent tous dans la même carte.
    // L'arme avait déjà cette lecture visuelle ; vêtements, accessoires,
    // nourriture, sacs, ceintures, contenants et contenus suivent la même règle.
    function carteNature() { return el("div", "pc-obj-subcard"); }

    function selCategorieStockage(it, cle) {
      var s = el("select", "pc-select pc-edit-field");
      var valeur = String(it[cle] || ""), trouve = false;
      var groupes = [
        { nom: "Matières", choix: [
          { cle: "liquide", nom: "Liquide" },
          { cle: "poudre", nom: "Poudre" },
          { cle: "pate", nom: "Pâte" }
        ] },
        { nom: "Munitions", choix: [] }
      ];
      var vus = Object.create(null);
      armesData().forEach(function (a) {
        var m = a && a.munition;
        if (!m || typeof m !== "object" || !m.cle || vus[m.cle]) return;
        vus[m.cle] = 1;
        groupes[1].choix.push({ cle: String(m.cle), nom: String(m.nom || m.cle) });
      });
      groupes[1].choix.sort(function (a, b) { return a.nom.localeCompare(b.nom, "fr"); });

      groupes.forEach(function (g) {
        if (!g.choix.length) return;
        var og = document.createElement("optgroup");
        og.label = g.nom;
        g.choix.forEach(function (c) {
          var o = el("option", null, c.nom);
          o.value = c.cle;
          if (c.cle === valeur) { o.selected = true; trouve = true; }
          og.appendChild(o);
        });
        s.appendChild(og);
      });
      // Même politique que le type d'arme : ne jamais faire disparaître une
      // ancienne valeur simplement parce que les règles actuelles l'ignorent.
      if (valeur && !trouve) {
        var ancien = el("option", null, valeur + " (inconnu)");
        ancien.value = valeur; ancien.selected = true;
        s.appendChild(ancien);
      }
      s.addEventListener("change", function () {
        it[cle] = s.value;
        if (cle === "contenant") {
          it.sousType=s.value;
          var occ = contenuDans(it);
          if (occ && !compatibleContenu(occ, it)) libereContenu(it);
        } else if (cle === "contenu" && it.dans) {
          var porteur = null;
          items.forEach(function (x) { if (!porteur && x.ref === it.dans) porteur = x; });
          if (!porteur || !compatibleContenu(it, porteur)) {
            it.dans = ""; it.ou = "sac"; it.emp = -1;
            flash("Le contenu ne correspond plus à son contenant : il retourne au sac à dos.");
          }
        }
        save();
        render();
        refresh();
      });
      return s;
    }
    function renderPanel() {
      panel.innerHTML = "";
      // SANS OBJET CHOISI, le panneau montre un objet FANTÔME : la même fiche,
      // vide et inerte. Le panneau garde ainsi sa forme et sa taille, et l'on
      // voit d'avance ce qu'un objet porte.
      if (sel && items.indexOf(sel) < 0) sel = null;
      invSelectionLocale = sel ? sel.ref : "";
      if(invEditionObjetLocale!==invSelectionLocale)invEditionObjetLocale="";
      panel.dataset.syncEntity = invSelectionLocale;
      var fantome = !sel;
      panel.classList.toggle("fantome", fantome);
      var types = ["physique", "feu", "froid", "eclair", "decomposition", "ethere", "brut"];
      var it = sel || { id: "", ref: "", nom: "", img: "", qte: 0, poids: 0, encombre: 0, places: 0, achat: 0, vente: null,
                        desc: "", ou: "sac", emp: -1, rapide: false, vet: "", acc: "", poches: 0, froid: 0, chaud: 0,
                        sac: false, cap: 0, ceint: false, ep: 0, ebMax: 0, contenant: "", contenu: "", dans: "", arme: null };
      types.forEach(function(t) {
        it["res_" + t] = it["res_" + t] || 0;
        it["prot_" + t] = it["prot_" + t] || 0;
      });

      // AUCUNE IMAGE AU PANNEAU, consigne de l'auteur : l'image se voit sur la
      // tuile, le panneau ne porte que le détail.

      var body = el("div", "pc-obj-body");

      // Champs communs d’abord, puis propriétés propres au type et quantité.
      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = fantome ? "Aucun objet" : "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () { it.nom = nm.value; save(); });
      nm.addEventListener("change", function () { updateTotal();refresh(); });
      var nameRow=el("div","pc-obj-name-row"),itemGear=el("button","pc-item-gear","⚙");itemGear.type="button";
      itemGear.addEventListener("click",function(){
        if(!sel||window.__owdCanEdit&&!window.__owdCanEdit())return;
        invEditionObjetLocale=invEditionObjetLocale===sel.ref?"":sel.ref;applyItemEdit();
      });nameRow.appendChild(nm);nameRow.appendChild(itemGear);body.appendChild(nameRow);

      // TYPE : une seule nature fonctionnelle à la fois. « Contenant » offre
      // un slot interne ; « Contenu » est ce qui peut y entrer. Changer de type
      // ne détruit jamais le contenu : un slot qui disparaît est vidé au sac.
      var ligneNat = el("div", "pc-obj-pair");
      var nat = el("select", "pc-edit-field");
      var natureDe = invType(it);
      Object.keys(INV_TYPES_OBJETS).forEach(function(k){var o=el("option",null,INV_TYPES_OBJETS[k]);o.value=k;o.selected=k===natureDe;nat.appendChild(o);});
      nat.addEventListener("change", function () {
        var type=nat.value, v={arme:"arme",vetement:"vet",accessoire:"acc",contenant:"contenant"}[type] || "";
        var sub=invSousTypes(type);it.typeObjet=type;it.sousType=sub.length?sub[0][0]:"";
        if(type==="rangement")v=it.sousType;
        if(it.contenant && v!=="contenant" || it.sac && v!=="sac")libereContenu(it,true);
        it.nourri=invEstIngerable(it);it.sac=v==="sac";it.ceint=v==="ceint";
        it.vet=v==="vet"?(it.vet||"haut"):"";it.acc=v==="acc"?(it.acc||"collier"):"";
        it.contenant=v==="contenant"?(it.contenant||"liquide"):"";
        if(type==="contenant")it.sousType=it.contenant;
        it.contenu=type==="munition"?it.sousType:type==="consommable"?"":"";
        it.arme=v==="arme"?(it.arme||{attaque:"",degats:"",parade:"",reduction:"",modsDegats:[],modsParade:[],comp:"",type:"",mains:1,repartition:{physique:100}}):null;
        if (INV_EP.indexOf(it.ou) < 0 && !lieuPermis(it, it.ou)) it.ou = "sac";
        rangeEmplacements(items);
        save();
        render();
        refresh();
      });
      ligneNat.appendChild(fld("Type", nat));
      var rapideBoite = el("div", "pc-f pc-obj-quick");
      rapideBoite.appendChild(el("label", null, "Accès rapide"));
      var rapide = miniBtn("Activer", "Activer ou désactiver l'accès rapide", function () {
        window.OwdInventoryData.isolate(items,it);
        it.rapide = !it.rapide;
        save(); render(); refresh();
      }, "pc-obj-quick-toggle" + (it.rapide ? " on" : ""));
      rapide.setAttribute("aria-pressed", String(!!it.rapide));
      rapideBoite.appendChild(rapide);
      ligneNat.appendChild(rapideBoite);
      body.appendChild(ligneNat);

      // Le type possède son bloc, puis le sous-type sa ligne indépendante et
      // son propre cadre. Les propriétés communes ne sont montrées qu'après.
      var specifiquesType = el("div", "pc-obj-specifics pc-obj-type-properties");
      var specifiquesSous = el("div", "pc-obj-specifics pc-obj-subtype-card");
      var sousLigne = el("div", "pc-obj-subtype-row");
      var sous = invSousTypes(invType(it));
      if(invType(it)==="consommable") {
        // Les familles sont des en-têtes natifs en gras, non sélectionnables,
        // comme dans la liste des types d'armes.
        var choixConso=el("select","pc-select pc-edit-field");
        [["Solide",sous.slice(0,2)],["Pâte",sous.slice(2,4)],["Liquide",sous.slice(4,6)]].forEach(function(gr){
          var optgroup=document.createElement("optgroup");optgroup.label=gr[0];
          gr[1].forEach(function(e){var opt=el("option",null,e[1]);opt.value=e[0];opt.selected=e[0]===it.sousType;optgroup.appendChild(opt);});
          choixConso.appendChild(optgroup);
        });
        choixConso.addEventListener("change",function(){
          it.sousType=choixConso.value;it.nourri=invEstIngerable(it);
          var forme=invFormeConsommable(it);
          // Conserver la compatibilité avec les Contenants : liquide/pâte
          // restent des catégories de contenu indépendantes du sous-type.
          if(["liquide","pate",""].indexOf(it.contenu||"")>=0)it.contenu=forme==="solide"?"":forme;
          if(it.dans){var porteur=items.find(function(o){return o.ref===it.dans;});
            if(porteur&&porteur.contenant&&it.contenu!==porteur.contenant){
              it.dans="";it.ou=porteur.ou==="terre"?"terre":"sac";it.emp=-1;
              flash("La matière ne correspond plus au contenant : l’objet en est sorti.");
            }
          }
          save();render();refresh();
        });
        sousLigne.appendChild(fld("Sous-type",choixConso));
      } else if(sous.length) sousLigne.appendChild(invChoix("Sous-type", sous,
        it.sousType || (it.ceint ? "ceint" : it.sac ? "sac" : "autre"), function (v) {
          it.sousType=v;it.nourri=invEstIngerable(it);
          if(invType(it)==="rangement"){
            if(it.sac&&v!=="sac")libereContenu(it,true);
            it.sac=v==="sac";it.ceint=v==="ceint";
          }
          if(invType(it)==="munition")it.contenu=v;
          if(INV_EP.indexOf(it.ou)<0 && !lieuPermis(it,it.ou)){
            it.ou="poches";it.dans="";
          }
          rangeEmplacements(items);render();
        }));


      // ce que le type demande, juste sous lui. Tous les types utilisent le
      // même cadre visuel que la carte d'arme : un seul bloc contient leurs
      // sous-champs, au lieu de lignes flottantes.
      if (it.vet) {
        var cv = carteNature();
        var pv = el("div", "pc-obj-pair");
        var typ = el("select", "pc-edit-field");
        INV_VETEMENTS.concat(["hautbas"]).forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.vet) o.selected = true;
          typ.appendChild(o);
        });
        typ.addEventListener("change", function () {
          it.vet = typ.value;it.sousType=typ.value;
          if (!lieuPermis(it, it.ou)) it.ou = "sac";
          else if (INV_CASES.indexOf(it.ou) >= 0) deplace(it, it.ou);   // la robe prend aussi le bas
          render();
          refresh();
        });
        sousLigne.appendChild(fld("Sous-type", typ));
        // Huit lignes uniques « Valeur | Type d'effet », données d'origine
        // conservées pour les calculs de protection/résistance et les bonus.
        invChampsVetement(cv,it);
        invChampsPrerequis(cv,it);
        specifiquesSous.appendChild(cv);
      }

      // l'ACCESSOIRE : sa case, ses poches, sa protection
      if (it.acc) {
        var ca = carteNature();
        var pa = el("div", "pc-obj-pair");
        var tya = el("select", "pc-edit-field");
        Object.keys(INV_ACC_TYPES).forEach(function (v) {
          var o = el("option", null, INV_NOMS[v]);
          o.value = v;
          if (v === it.acc) o.selected = true;
          tya.appendChild(o);
        });
        tya.addEventListener("change", function () {
          it.acc = tya.value;it.sousType=tya.value;
          if (INV_EP.indexOf(it.ou) < 0 && !lieuPermis(it, it.ou)) it.ou = "sac";
          render();
          refresh();
        });
        sousLigne.appendChild(fld("Sous-type", tya));
        invChampsVetement(ca,it);
        invChampsPrerequis(ca,it);
        specifiquesSous.appendChild(ca);
      }

      // les EMPLACEMENTS d'une ceinture ou d'un sac : leur nombre, et
      // l'encombrance au plus de chacun. Les changer redessine les groupes.
      function champsEp() {
        var pe = el("div", "pc-obj-pair");
        pe.appendChild(champNombre("Accroches", function () { return it.ep; },
          function (v) { it.ep = Math.floor(pnum(v)); rangeEmplacements(items); }, "Nombre de points d'accroche"));
        pe.appendChild(invChoix(it.sac?"Taille ACC. max":"Taille maximale",[["","Non renseignée"]].concat(INV_TAILLES.map(function(t){return [t,t];})),it.tailleAccroche || (it.sac?"Moyenne":""),function(v){it.tailleAccroche=v;rangeEmplacements(items);render();}));
        Array.prototype.forEach.call(pe.querySelectorAll("input"), function (i) {
          i.addEventListener("change", function () { render(); });
        });
        return pe;
      }
      if (it.ceint) {
        var cc = carteNature();
        cc.appendChild(champsEp());
        specifiquesSous.appendChild(cc);
      }

      // la nourriture porte son VOLUME : ce qu'une dose ou une part occupe de
      // contenance une fois avalée
      if (invAvecEffets(it)) {
        var cn = carteNature();
        var pn = el("div", "pc-obj-pair");
        pn.appendChild(champNombre("Contenance", function () { return it.places; },
          function (v) { it.places = pnum(v); }, "Ce qu'une dose ou une part occupe de contenance"));
        pn.appendChild(champNombre("Temps (DA)",function(){return num(it.tempsConsommation,0);},function(v){it.tempsConsommation=pnum(v);}));
        cn.appendChild(pn);
        if(it.nourri){
          var nutrition=el("div","pc-obj-pair");
          ["ps","ph"].forEach(function(k){nutrition.appendChild(champNombre(k.toUpperCase(),function(){return num(it[k],0);},function(v){it[k]=snum(v);}));});
          cn.appendChild(nutrition);
        }
        specifiquesSous.appendChild(cn);
      }

      if (it.sac) {
        var cs = carteNature();
        var ps = el("div", "pc-obj-pair");
        ps.appendChild(champNombre("Capacité", function () { return it.cap; },
          function (v) { it.cap = pnum(v); }, "Capacité intérieure du sac, en L"));
        ps.appendChild(invChoix("Taille INT. max",[["","Non renseignée"]].concat(INV_TAILLES.map(function(t){return [t,t];})),invTailleMaxSac(it),function(v){it.tailleInterieure=v;rangeEmplacements(items);render();}));
        cs.appendChild(ps);
        cs.appendChild(champsEp());
        specifiquesSous.appendChild(cs);
      }

      // CONTENANT et CONTENU partagent exactement les mêmes catégories. Le
      // premier expose une case sur sa tuile ; le second doit correspondre à
      // sa catégorie et au contenu déjà présent.
      if (it.contenant) {
        var ct = carteNature();
        sousLigne.appendChild(fld("Sous-type",selCategorieStockage(it,"contenant")));
        var dedans=contenusDans(it);
        if(dedans.length){
          var liste=el("div","pc-obj-container-contents");
          liste.appendChild(el("small","","Contenu"));
          dedans.forEach(function(child){var b=miniBtn(child.nom||"Contenu","Sélectionner ce contenu",function(){sel=child;render();});liste.appendChild(b);});
          ct.appendChild(liste);
          specifiquesType.appendChild(ct);
        }
      }
      if (it.contenu && invType(it)==="autre") {
        var ctu = carteNature();
        var pctu = el("div", "pc-obj-pair");
        pctu.appendChild(fld("Catégorie", selCategorieStockage(it, "contenu")));
        ctu.appendChild(pctu);
        specifiquesType.appendChild(ctu);
      }

      // L'ARME : cinq lignes de données, sans gestes ni boutons. Ses
      // rafraîchissements vont au registre du PANNEAU, vidé à chaque rendu :
      // sinon chaque clic sur une tuile laisserait des fonctions pointer sur un
      // détail disparu.
      if (it.arme && !fantome) {
        var ancien = hooks;
        hooks = panelHooks;
        try { specifiquesType.appendChild(carteArme(it, false, sousLigne)); }
        finally { hooks = ancien; }
      }

      var pair = el("div", "pc-obj-pair");
      pair.appendChild(champNombre("Poids", function () { return it.poids; },
        function (v) { it.poids = pnum(v); }));
      pair.appendChild(champNombre("Volume", function () { return it.encombre; },
        function (v) { it.volume = it.encombre = pnum(v); }, "En L"));
      body.appendChild(pair);
      var tailleMains=el("div","pc-obj-pair");
      tailleMains.appendChild(invChoix("Taille",[["","Non renseignée"]].concat(INV_TAILLES.map(function(t){return [t,t];})),it.taille||"",function(v){it.taille=v;rangeEmplacements(items);render();}));
      tailleMains.appendChild(invChoix("Mains",[[1,"1"],[2,"2"],["2 obligatoires","2 obligatoires"]],it.mains||1,function(v){
        var nouvellesMains=v==="2 obligatoires"?v:Number(v);
        // Occuper les deux mains AVANT de modifier le nombre requis : sinon
        // l'objet masquerait l'occupant de l'autre main durant l'échange.
        if(nouvellesMains==="2 obligatoires" && (it.ou==="mainG"||it.ou==="mainD"))deplace(it,"deuxMains");
        it.mains=nouvellesMains;if(it.arme)it.arme.mains=it.mains;
        rangeEmplacements(items);render();}));
      body.appendChild(tailleMains);

      // achat / vente, en pièces d'argent : la monnaie du livre est NOMMÉE
      var prix = el("div", "pc-obj-pair");
      prix.appendChild(champNombre("Prix d'achat", function () { return it.achat; },
        function (v) { it.achat = venteNum(v); majVente(); }, "Prix d'achat en " + monnaie(true)));
      // le prix de vente laissé vide est AUTOMATIQUE ; un nombre saisi, 0
      // compris, s'affiche tel quel
      var vIn = el("input", "pc-edit-field");
      vIn.type = "text"; vIn.inputMode = "decimal";
      vIn.placeholder = it.achat==null ? "Non renseigné" : "automatique";
      function majVente() {
        if (document.activeElement !== vIn) vIn.value = it.vente == null ? "" : fmtP(it.vente);
        vIn.title = "Prix de vente en " + monnaie(true) + (it.vente == null ? " : " + prixObjetTexte(it,true) : "");
      }
      majVente();
      vIn.addEventListener("input", function () { it.vente = venteNum(vIn.value); save(); refresh(); majVente(); });
      vIn.addEventListener("blur", majVente);
      prix.appendChild(fld("Prix de vente", vIn));
      body.appendChild(prix);

      // Identifiant visible ; image et fichier uniquement en édition.
      // L'identifiant reconnaît le même objet d'une fiche à l'autre quand on
      // le donne.
      var pairE = el("div", "pc-obj-pair pc-obj-media pc-edit-only");
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "ex. iron_sword";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn));
      var url = el("input", "pc-edit-field");
      url.type = "text"; url.placeholder = "https://…";
      url.value = /^data:/.test(it.img) ? "" : it.img;
      url.addEventListener("change", function () { it.img = url.value.trim(); render(); refresh(); });
      var urlFld = fld("Image", url);
      var file = el("input");
      file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        file.value = "";
        if (!f) return;
        vignette(f, function (data) { if(!ficheModifiable()||!file.isConnected)return; window.OwdInventoryData.isolate(items,it); it.img = data; render(); refresh(); });
      });
      urlFld.appendChild(file);
      pairE.appendChild(fld("Fichier",miniBtn("Choisir", "Importer une image (réduite en vignette 84 × 128)",
        function () { file.click(); })));
      pairE.insertBefore(urlFld,pairE.firstChild);
      body.appendChild(pairE);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));
      if(it.reglesManuelles && it.reglesManuelles.length){
        var rules=el("div","pc-obj-regles");rules.appendChild(el("div","lbl","Propriétés — gestion manuelle"));
        it.reglesManuelles.forEach(function(rule){rules.appendChild(el("div","pc-notes",rule));});body.appendChild(rules);
      }

      invChampsCommuns(specifiquesSous,it,render);
      if (specifiquesType.childNodes.length) body.insertBefore(specifiquesType, pair);
      if (sousLigne.childNodes.length) body.insertBefore(sousLigne, pair);
      if (specifiquesSous.childNodes.length) body.insertBefore(specifiquesSous, pair);
      // quantité : curseur à l'unité + champ, décimal (une demi-ration)
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "1";   // à l'UNITÉ : on ne prend pas 3,27 fioles au curseur
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        if(window.OwdInventoryData.equipped(it))return;
        if(window.__owdInventorySet)window.__owdInventorySet(it.ref);
        window.OwdInventoryData.isolateAncestors(items,it);
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        majAct();
        var etaitEquipe=window.OwdInventoryData.equipped(it);
        save(); updateTotal();
        if(etaitEquipe)render();
        refresh();   // le poids porté vient de bouger : la charge suit
      }
      slider.addEventListener("input", function () { setQte(Math.round(parseFloat(slider.value))); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });

      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      if(!window.OwdInventoryData.equipped(it))body.insertBefore(fld("Quantité", qRow), ligneNat.nextSibling);


      if (fantome) {
        Array.prototype.forEach.call(body.querySelectorAll("input, select, textarea, button"),
          function (x) { x.disabled = true; });
        panel.appendChild(body);
        prepareItemFields();applyItemEdit();
        return;
      }

      // quantité d'ACTION : combien d'exemplaires les boutons traitent. Elle
      // ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons";
      function bornerAct() {
        var v = pnum(actQte.value);
        if (!v || v > it.qte) v = it.qte;
        return Math.round(v * 100) / 100;
      }
      function majAct() {
        actQte.max = String(it.qte);
        if (document.activeElement !== actQte)
          actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
      }
      actQte.value = fmtP(it.qte);
      actQte.addEventListener("blur", function () { actQte.value = fmtP(bornerAct()); });

      var actions = el("div", "pc-obj-actions");
      if(!window.OwdInventoryData.equipped(it))actions.appendChild(fld("Quantité", actQte, "qact"));
      var montrer = miniBtn("Montrer", "Montrer cet objet dans le tchat", function () {
        montreObjet(it.ref, bornerAct());
      });
      actions.appendChild(montrer);
      if(invAvecEffets(it))actions.appendChild(miniBtn("Consommer",null,function(){invConsommerDialogue(it,bornerAct());}));
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        window.OwdInventoryData.isolateAncestors(items,it);
        if (tout) {
          if(it.sac){var refs=window.OwdInventoryData.group(state.inv,it.ref).map(function(o){return o.ref;});
            for(var z=items.length-1;z>=0;z--)if(items[z]!==it&&refs.indexOf(items[z].ref)>=0)items.splice(z,1);}
          if (it.contenant) libereContenu(it, true);
          items.splice(items.indexOf(it), 1); sel = null;
        } else it.qte = Math.round((it.qte - q) * 100) / 100;
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Séparer", "Créer une pile avec la quantité indiquée", function(){
        try{window.OwdInventoryData.split(items,it,bornerAct(),uid("o"));render();refresh();}catch(e){flash(e.message);}
      }));
      if(it.sac){var contents=el("div","pc-obj-tiles");
        var deposit=el("div","pc-obj-addtile","Ranger dans le sac");deposit.title="Déposer un objet dans ce sac, même retiré";contents.appendChild(deposit);
        deposit.addEventListener("dragover",function(e){if(drag&&drag!==it){e.preventDefault();e.stopPropagation();}});
        deposit.addEventListener("drop",function(e){if(!drag)return;e.preventDefault();e.stopPropagation();var d=drag;drag=null;
          if(window.OwdInventoryData.group(state.inv,d.ref).some(function(o){return o.ref===it.ref;})){flash("Un sac ne peut pas contenir lui-même.");return;}
          if(!invTailleAccepte(d.taille,invTailleMaxSac(it))){flash("Cet objet dépasse la taille intérieure du sac.");return;}
          window.OwdInventoryData.isolate(items,it);
          if(deplace(d,"sac")){d.dans=it.ref;d.emp=-1;render();refresh();}});
        items.forEach(function(o){if(o.dans===it.ref)contents.appendChild(tile(o));});
        body.appendChild(el("div","lbl","Contenu du sac"));body.appendChild(contents);
        body.appendChild(el("div","pc-modal-note","Glissez un objet vers les poches ou une case pour le sortir du sac. Poids total : "+fmtP(window.OwdInventoryData.weight(items,it))+" kg"));}
      actions.appendChild(miniBtn("Détruire", "Détruire cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        if (tout && (it.nom || it.desc)) {
          confirmer("Détruire un objet",
                    "Détruire « " + (it.nom || "cet objet") + " » de l'inventaire" + (it.sac ? " avec tout son contenu" : "") + " ?",
                    "Détruire", function () { retireQte(q, true); });
          return;
        }
        retireQte(q, tout);
      }, "danger"));
      actions.appendChild(miniBtn("Empiler", "Réunir les objets et contenus strictement identiques au même endroit", function(){
        var target=items.filter(function(o){return window.OwdInventoryData.canMerge(items,o,it);})[0];
        if(!target){flash("Aucune pile strictement identique à cet emplacement.");return;}
        sel=window.OwdInventoryData.merge(items,target,it);render();refresh();
      }));
      function avantEdition(e){if(qRow.contains(e.target)||actions.contains(e.target))return;
        if(e.target.matches && e.target.matches('input,select,textarea'))window.OwdInventoryData.isolate(items,it);}
      body.addEventListener("input",avantEdition,true);body.addEventListener("change",avantEdition,true);
      body.addEventListener("change",function(e){if(!actions.contains(e.target)&&body.isConnected){if(e.target.tagName==="SELECT")render();refresh();}});
      body.appendChild(actions);
      panel.appendChild(body);
      prepareItemFields();applyItemEdit();
    }

    function prepareItemFields(){
      panel.querySelectorAll(".pc-edit-field").forEach(function(n){n.classList.replace("pc-edit-field","pc-item-edit-field");});
      panel.querySelectorAll(".pc-edit-only").forEach(function(n){n.classList.replace("pc-edit-only","pc-item-edit-only");});
    }
    function applyItemEdit(){
      var allowed=!window.__owdCanEdit||window.__owdCanEdit();
      if(!allowed||!sel||items.indexOf(sel)<0)invEditionObjetLocale="";
      var editing=!!sel&&allowed&&invEditionObjetLocale===sel.ref;
      panel.classList.toggle("pc-item-editing",editing);
      panel.querySelectorAll(".pc-item-edit-field").forEach(function(n){n.disabled=!editing;});
      var button=panel.querySelector(".pc-item-gear");if(button){button.disabled=!sel||!allowed;button.title=editing?"Terminer les modifications de cet objet":"Modifier cet objet";button.setAttribute("aria-label",button.title);button.setAttribute("aria-pressed",String(editing));}
      majTextesLecture(panel);
    }

    // TOUTE LA HAUTEUR DE LA FENÊTRE (la page du site, ou l'iframe de Roll20),
    // moins le titre du module et son pied : défilé jusqu'à lui, le module
    // occupe l'écran entier, et ses deux colonnes défilent chacune dans cette
    // hauteur. Une fenêtre trop basse garde un plancher ; le module invisible
    // (onglet fermé) ne se mesure pas.
    function ajusteHauteur() {
      if (window.__owdVueInventaire) { wrap.style.removeProperty("--inv-h"); return; }
      if (!wrap.isConnected || !wrap.offsetParent) return;
      // l'en-tête FIXE du site (absent dans Roll20) couvre le haut de l'écran
      var fixe = document.querySelector(".md-header");
      var autour = (wrap.getBoundingClientRect().top - container.getBoundingClientRect().top) +
                   tot.offsetHeight + 28 + (fixe ? fixe.offsetHeight : 0);
      var h = Math.max(420, Math.floor(window.innerHeight - autour));
      wrap.style.setProperty("--inv-h", h + "px");
    }
    window.addEventListener("resize", ajusteHauteur);
    remontageNettoyage.push(function () { window.removeEventListener("resize", ajusteHauteur); });
    if (window.IntersectionObserver) {
      var observateurInventaire = new IntersectionObserver(function (e) { if (e[0] && e[0].isIntersecting) ajusteHauteur(); });
      observateurInventaire.observe(wrap);
      remontageNettoyage.push(function () { observateurInventaire.disconnect(); });
    }
    function render() {
      fermeMenu();
      window.OwdInventoryData.bind(items);
      if(sel && items.indexOf(sel)<0) sel=null;
      majGroupes = [];
      indexContenus();
      panelHooks.length = 0;
      leftBox.innerHTML = "";
      leftBox.appendChild(groupeSurSoi());
      leftBox.appendChild(groupeCeinture());
      leftBox.appendChild(groupeLibre("poches", "Poches", ebPoches, capPoches));
      if(window.OwdInventoryData.backpack(items)) leftBox.appendChild(groupeLibre("sac", "Sac à dos", ebSac, capSac));
      leftBox.appendChild(groupeLibre("terre", "PAR TERRE"));
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
    }
    hooks.push(function () {
      ajusteHauteur();
      updateTotal();
      panelHooks.forEach(function (f) { try { f(); } catch (e) {} });
      applyItemEdit();
    });
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }
  // Transfert entre les inventaires contrôlés : le destinataire est confirmé
  // avant le retrait source. Les refs déterministes rendent la reprise idempotente.
  function objetsTransfert(ref) {
    var item=state.inv.objets.filter(function(o){return o.ref===ref;})[0];
    if(item){window.OwdInventoryData.isolateAncestors(state.inv.objets,item);save();}
    return {items:window.OwdInventoryData.group(state.inv, ref),competences:window.OwdInventoryData.copy(state.comps)};
  }
  function importeTransfert(job) {
    var D = window.OwdInventoryData, items = state.inv.objets;
    if (D.committed(state, job)) return true;
    job.dest.forEach(function (it) {
      var old = items.filter(function (o) { return o.ref === it.ref; })[0];
      if (old) { Object.keys(old).forEach(function (k) { delete old[k]; }); Object.assign(old, D.copy(it)); }
      else items.push(D.copy(it));
    });
    save(); remount(); return true;
  }
  function confirmeTransfert(job) {
    state.inv.transferts = state.inv.transferts || {};
    state.inv.transferts[job.id] = true;
    save(); return true;
  }
  function retireTransfert(job) {
    var D = window.OwdInventoryData, items = state.inv.objets;
    // Un objet retouché pendant le transfert ne doit pas être supprimé.
    job.items.forEach(function (expected) {
      var current = items.filter(function (o) { return o.ref === expected.ref; })[0];
      if (current && D.stable(current) !== D.stable(expected)) throw new Error('L’objet a été modifié pendant le transfert. Le retrait reste en attente.');
    });
    var ids = job.items.map(function (x) { return x.ref; });
    for (var i = items.length - 1; i >= 0; i--) if (ids.indexOf(items[i].ref) >= 0) items.splice(i, 1);
    invSelectionLocale = ''; save(); remount(); return true;
  }
  function annuleTransfert(job) {
    var D=window.OwdInventoryData,items=state.inv.objets;
    job.dest.forEach(function(expected){var current=items.filter(function(o){return o.ref===expected.ref;})[0];if(current&&D.stable(current)!==D.stable(expected))throw new Error('L’objet reçu a été modifié : annulation automatique impossible.');});
    var ids=job.dest.map(function(x){return x.ref;});
    for(var i=items.length-1;i>=0;i--)if(ids.indexOf(items[i].ref)>=0)items.splice(i,1);
    state.inv.transferts=state.inv.transferts||{};state.inv.transferts[job.id]=true;
    save();remount();return true;
  }
  function prepareTransfert(job) {
    var D=window.OwdInventoryData,future=D.copy(state),dest=D.copy(job.dest);
    // Les IDs de compétences appartiennent au personnage. On retrouve la même
    // compétence chez le destinataire par son nom et son groupe, sinon aucun lien.
    dest.forEach(function(it){if(!it.arme||!it.arme.comp)return;var original=(job.competences||[]).filter(function(c){return c.id===it.arme.comp;})[0];var matches=original?state.comps.filter(function(c){return c.nom===original.nom&&c.groupe===original.groupe;}):[];it.arme.comp=matches.length===1?matches[0].id:'';});
    future.inv.objets=future.inv.objets.concat(dest);future=normalize(future);
    return dest.map(function(it){return future.inv.objets.filter(function(o){return o.ref===it.ref;})[0];});
  }
  function buildInv() {
    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var ref = { fn: null };
    var b = block("Inventaire", null, "inv", function () {
      if (ref.fn) ref.fn();
    });
    invObjets(b, ref);
    return b;
  }

  // ================= ONGLET OPTIONS =================

  // ---- 15. Jets ----
  function buildJets() {
    var b = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance par dé d'action. Toute expression Roll20 est acceptée.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : sous le champ, le bouton
    // occupait une rangée entière pour un mot, et le bloc paraissait deux fois
    // plus haut.
    var ligne = el("div", "pc-jet-de");
    ligne.appendChild(fld("Dé des jets", de));
    ligne.appendChild(miniBtn("Réinitialiser", "Revenir au dé du livre : " + deDe(1),
      function () { state.de = deDe(1); refresh(); }));
    b.appendChild(ligne);
    // Pas de note : ce que le champ contient se lit dans le champ, et dire
    // combien de faces ont les dés du jeu, c'est réciter la règle.
    return b;
  }

  // ---- les deux champs partagés des grilles d'Options ----
  // Un champ de MODIFICATEUR : nu, sans − ni +. Sur cinquante lignes de quatre
  // colonnes, les boutons mangeaient la place et n'apportaient rien qu'on ne
  // fasse au clavier. Vide affiché quand la valeur est 0 : un zéro n'est pas un
  // réglage.
  function champModVal(lire, ecrire, borne, titre, reg) {
    var inp = el("input", "pc-num modif");
    champNombreSigne(inp); inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -borne, borne) : 0);
      refresh();
    });
    (reg || hooks).push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre, reg) {
    return champModVal(function () { return map[cle]; },
                       function (v) { if (v) map[cle] = v; else delete map[cle]; },
                       borne, titre, reg);
  }
  // Un champ de FORÇAGE : vide = valeur calculée (undefined, distinct de 0).
  function champForceVal(lire, ecrire, auto, titre, reg) {
    var inp = el("input", "force");
    champNombreSigne(inp); inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -99999, 99999) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = fmtP(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  function champForce(map, cle, auto, titre, reg) {
    return champForceVal(
      function () { return map[cle]; },
      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
      auto, titre, reg);
  }
  // Un champ de FACTEUR : vide = ×1, jamais ×0. Il se calque sur le champ de
  // forçage et NON sur celui de modificateur : bâti sur le second, il écrirait
  // zéro en s'effaçant et annulerait la valeur qu'il devait seulement laisser
  // tranquille. Son pas est libre, des flèches de 1 en 1 sautant de ×1 à ×6.
  function champMultVal(lire, ecrire, titre, reg) {
    var inp = el("input", "pc-num modif mult");
    champNombreSigne(inp); inp.step = "any";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = litNombreSigne(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v * 100) / 100, -MULT_BORNE, MULT_BORNE) : undefined);
      refresh();
    });
    (reg || hooks).push(function () {
      inp.placeholder = "1";
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  // L'entête d'une grille de leviers. Libellés COURTS : quatre colonnes dans
  // une demi-largeur ne laissent pas la place aux noms complets, que portent
  // les infobulles.
  function entete(box, colonnes, cls) {
    var head = el("div", "pc-optcomp-row " + (cls || "quatre") + " head");
    colonnes.forEach(function (h) {
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);
    return head;
  }

  // ---- la machinerie commune aux blocs de leviers de l'onglet Options ----
  // TROIS BLOCS PORTENT LA MÊME CHOSE : les caractéristiques, les compétences,
  // les capacités. Chacun range ses réglages dans sa propre table à trois
  // niveaux, mais le GESTE est identique : une bande d'onglets, une grille par
  // onglet, et sur chaque rangée la chaîne à neuf boîtes.
  //
  // LA CHAÎNE EST UNE MÉCANIQUE, PAS UNE RÈGLE. Elle ne sait rien d'Outward :
  // elle prend une base, lui applique un forçage, ou quatre ajouts et quatre
  // facteurs, et rend un nombre. C'est ce qui permet de la poser sur n'importe
  // quelle valeur dérivée sans rouvrir ce fichier, et c'est pourquoi elle vaut
  // pour une caractéristique comme pour un maximum de points de vie.
  //
  // Trois modules ne peuvent pas partager des fermetures : sans ce fichier, la
  // même centaine de lignes serait recopiée trois fois, et corrigée une fois
  // sur trois.

  // ---------- la bande d'onglets ----------
  // Rend { onglet, montre } : le bloc en garde ce qu'il veut. L'ONGLET OUVERT
  // NE S'ENREGISTRE PAS — ce n'est pas un état du personnage, et deux fiches du
  // même personnage n'ont pas à s'ouvrir sur le même réglage. On rouvre sur le
  // premier, comme un rouage d'édition se referme au rechargement.
  function bandeOnglets(bloc) {
    var bande = el("div", "pc-tabs mini");
    var corps = el("div");
    bloc.appendChild(bande);
    bloc.appendChild(corps);
    var pages = [];
    function montre(i) {
      pages.forEach(function (p, j) {
        p.bouton.classList.toggle("on", j === i);
        p.page.classList.toggle("on", j === i);
        // UN SEUL ARRÊT DE TABULATION POUR TOUTE LA BANDE. Cinq boutons
        // focalisables, ce sont cinq tabulations entre le titre du bloc et le
        // premier champ qu'on vient régler : la bande coûterait plus cher à
        // traverser qu'à employer. On entre sur l'onglet ouvert, les flèches
        // font le reste.
        p.bouton.tabIndex = j === i ? 0 : -1;
      });
    }
    function onglet(nom, aide, bati) {
      var i = pages.length;
      // UN BOUTON, ET NON UN DIV. Les onglets de la feuille sont des div et ne
      // s'atteignent qu'à la souris ; les segments de la barre d'envoi sont des
      // boutons, et c'est ce précédent-là qui vaut ici. Le navigateur donne
      // alors le focus, Entrée et Espace sans qu'on écrive une ligne pour ça.
      var bouton = el("button", "pc-tab", nom);
      bouton.type = "button";
      // UNE INFOBULLE SEULEMENT QUAND LE MOT EST ABRÉGÉ, et elle ne dit alors
      // que le mot entier : la fiche ne récite pas les règles.
      if (aide) bouton.title = aide;
      bouton.addEventListener("click", function () { montre(i); });
      bouton.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : (e.key === "ArrowLeft" ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        var j = (i + d + pages.length) % pages.length;
        montre(j);
        pages[j].bouton.focus();
      });
      bande.appendChild(bouton);
      // LE COMPTE PART DANS LE HTML : le CSS ne sait pas compter ses enfants, et
      // c'est lui qui décide comment couper une bande longue en deux rangs.
      bande.setAttribute("data-n", String(pages.length + 1));
      var page = el("div", "pc-souspage");
      bati(page);
      corps.appendChild(page);
      pages.push({ bouton: bouton, page: page });
    }
    return { onglet: onglet, montre: montre };
  }

  // ---------- la grille, son entête, ses rangées ----------
  // LA GRILLE ET SON DÉFILEMENT. Les colonnes d'une grille d'Options ont une
  // largeur en rem, pas en parts : sous une certaine largeur de colonne, elles
  // ne rentrent plus, et c'est voulu — un champ de saisie qui se réduit à deux
  // millimètres ne sert plus à rien. L'enveloppe laisse alors défiler.
  function grilleOpt(hote) {
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    hote.appendChild(wrap);
    return box;
  }
  // UN MOT NUL POSE UN FILET, et non un entête vide : la grille des leviers
  // porte des colonnes d'un pixel qui séparent les groupes, et un entête de
  // texte à leur place décalerait tout d'une colonne.
  function enteteOpt(hote, cls, mots) {
    var head = el("div", "pc-optcomp-row " + cls + " head");
    mots.forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    hote.appendChild(head);
    return head;
  }
  function rangeeOpt(hote, cls, i) {
    var row = el("div", "pc-optcomp-row " + cls + (i % 2 === 1 ? " odd" : ""));
    hote.appendChild(row);
    return row;
  }
  // Une rangée qui se nomme par un SIGLE : caractéristiques et compétences. Le
  // nom entier tient dans l'infobulle — la colonne est trop étroite pour
  // « Détermination ».
  function rangeeSigle(hote, cls, code, i, nom) {
    var row = rangeeOpt(hote, cls, i);
    var nameBox = el("span", "pc-comp-name");
    var chip = el("span", "pc-abbr", code);
    chip.title = nom || code;
    nameBox.appendChild(chip);
    row.appendChild(nameBox);
    return row;
  }
  // Une rangée qui se nomme par un NOM : les spécialités, qui n'ont pas de
  // sigle. Le nom se coupe à l'ellipse et se lit entier en infobulle.
  function rangeeNom(hote, cls, nom, i, titre) {
    var row = rangeeOpt(hote, cls, i);
    var nameBox = el("span", "pc-comp-name");
    var lab = el("span", "pc-comp-label", nom || "Sans nom");
    lab.title = titre || nom || "";
    nameBox.appendChild(lab);
    row.appendChild(nameBox);
    return row;
  }

  // ---------- lire et écrire une boîte, sans rien matérialiser ----------
  // On ne passe PAS par champMod(map, clé, …), qui exige une table existante :
  // l'appeler au montage créerait toutes les sous-tables chez tout personnage
  // qui ouvre simplement les Options, et l'état, qui voyage dans un seul
  // attribut Roll20, s'alourdirait d'objets vides pour rien.
  //
  // Ces fermetures ne créent qu'à l'écriture, et DÉFONT le chemin quand la
  // dernière valeur s'en va.
  function boitesTable(nomTable) {
    return {
      lire: function (nom, cle) {
        return function (boite) {
          var t = state[nomTable] && state[nomTable][nom];
          var tb = t && t[boite];
          var v = tb && tb[cle];
          return (typeof v === "number" && isFinite(v)) ? v : undefined;
        };
      },
      ecrire: function (nom, boite, cle, v) {
        if (!state[nomTable] || typeof state[nomTable] !== "object") state[nomTable] = {};
        var lv = state[nomTable];
        if (v === undefined || v === null) {
          if (!lv[nom] || !lv[nom][boite]) return;
          delete lv[nom][boite][cle];
          if (!Object.keys(lv[nom][boite]).length) delete lv[nom][boite];
          if (!Object.keys(lv[nom]).length) delete lv[nom];
          return;
        }
        if (!lv[nom]) lv[nom] = {};
        if (!lv[nom][boite]) lv[nom][boite] = {};
        lv[nom][boite][cle] = v;
      }
    };
  }
  // ---------- ce qui compte comme « réglé », et ce que la chaîne a fait ----------
  // UNE BOÎTE QUI NE CHANGE RIEN NE COMPTE PAS : un ajout de zéro et un facteur
  // de un sont le NEUTRE de leur opération. Un forçage, si — forcer une valeur
  // à zéro est un réglage, et le seul moyen d'obtenir zéro à coup sûr.
  var BOITES_LEV = [["force", null], ["a1", 0], ["a2", 0], ["m1", 1], ["m2", 1],
                    ["a3", 0], ["a4", 0], ["m3", 1], ["m4", 1]];
  function levierRegleDe(lire) {
    for (var i = 0; i < BOITES_LEV.length; i++) {
      var v = lire(BOITES_LEV[i][0]);
      if (v === undefined) continue;
      if (BOITES_LEV[i][1] !== null && v === BOITES_LEV[i][1]) continue;
      return true;
    }
    return false;
  }
  // CE QUE LA CHAÎNE A FAIT, RELU DANS L'ORDRE : la base d'abord, puis chaque
  // boîte réglée. C'est l'infobulle du dernier nombre, et la seule façon
  // honnête de dire d'où il sort — une phrase écrite d'avance mentirait dès
  // qu'un facteur est posé.
  function chaineTexteDe(lire, motBase, base) {
    var f = lire("force");
    if (f !== undefined) return "Forcé à " + f;
    var out = motBase + " " + base;
    [["a1", " · ", 0], ["a2", " · ", 0], ["m1", " · ×", 1], ["m2", " · ×", 1],
     ["a3", " · ", 0], ["a4", " · ", 0], ["m3", " · ×", 1], ["m4", " · ×", 1]]
      .forEach(function (d) {
        var v = lire(d[0]);
        // le neutre ne se dit pas : « de la table 400 · +0 » se lit deux fois
        // avant de vouloir dire qu'il ne s'est rien passé
        if (v === undefined || v === d[2]) return;
        out += d[1] + (d[0].charAt(0) === "m" ? v : sign(v));
      });
    return out;
  }

  // ---------- LA GRILLE D'UN LEVIER ----------
  // Les onglets des trois blocs l'appellent, et ne diffèrent que par ce qu'ils
  // lui passent.
  //
  // LES ENTÊTES DES HUIT CHAMPS SONT DES SIGNES, et il n'y a pas d'alternative
  // honnête : la colonne fait 1,25 rem, aucun mot n'y tient, et deux « MODIF. »
  // de suite ne diraient pas lequel vient avant l'autre. « ＋ » et « × » disent
  // ce que la case CONTIENT ; « avant » et « après » diraient où elle tombe
  // dans un calcul, c'est-à-dire la règle, qui n'a pas sa place ici.
  //
  // opts :
  //   cls     la classe de grille ("levier")
  //   lignes  [{ cle, nom, titre }] — ce qui va en colonne de gauche
  //   rangee  (hote, cls, ligne, i) -> l'élément de rangée
  //   lire    (cle) -> (boîte) -> nombre|undefined
  //   ecrire  (cle, boîte, v) ; v undefined DÉFAIT le chemin
  //   mot     [libellé, infobulle] de la dernière colonne
  //   borne   999 ou 9999, l'échelle des ajouts
  //   auto    (cle) -> le filigrane du champ forcé
  //   rendu   (cle) -> { texte, titre, zero }
  //   reg     le registre de rafraîchissement où pousser
  function grilleLevier(page, opts) {
    var box = grilleOpt(page);
    var reg = opts.reg || hooks;
    enteteOpt(box, opts.cls, [
      opts.entete || ["Nom", "Ce que la rangée règle"],
      ["Forcé", "Valeur imposée — vide = valeur calculée", "fo"],
      ["＋", "Deux nombres qui s'ajoutent avant les facteurs", "duo op"],
      null,
      ["×", "Deux facteurs — vide = ×1", "duo op"],
      null,
      ["＋", "Deux nombres qui s'ajoutent après les premiers facteurs", "duo op"],
      null,
      ["×", "Deux facteurs de plus — vide = ×1", "duo op"],
      opts.mot
    ]);
    opts.lignes.forEach(function (ligne, i) {
      var cle = ligne.cle;
      var lire = opts.lire(cle);
      var row = opts.rangee(box, opts.cls, ligne, i);
      row.appendChild(champForceVal(
        function () { return lire("force"); },
        function (v) { opts.ecrire(cle, "force", v); },
        function () { return opts.auto(cle); },
        "Valeur imposée — vide = valeur calculée.", reg));
      ["a1", "a2"].forEach(function (bx) { row.appendChild(ajout(bx)); });
      row.appendChild(el("span", "rule"));
      ["m1", "m2"].forEach(function (bx) { row.appendChild(facteur(bx)); });
      row.appendChild(el("span", "rule"));
      ["a3", "a4"].forEach(function (bx) { row.appendChild(ajout(bx)); });
      row.appendChild(el("span", "rule"));
      ["m3", "m4"].forEach(function (bx) { row.appendChild(facteur(bx)); });
      var out = el("span", "pc-comp-total", "");
      row.appendChild(out);
      reg.push(function () {
        var r = opts.rendu(cle);
        var regle = levierRegleDe(opts.lire(cle));
        out.textContent = r.texte;
        out.classList.toggle("adj", regle);
        if (r.zero !== undefined) out.classList.toggle("zero", r.zero);
        out.title = r.titre;
        row.classList.toggle("on", regle);
      });
      function ajout(bx) {
        return champModVal(
          function () { return opts.lire(cle)(bx); },
          function (v) { opts.ecrire(cle, bx, v ? v : undefined); }, opts.borne,
          "Nombre qui s'ajoute — vide = aucun.", reg);
      }
      function facteur(bx) {
        return champMultVal(
          function () { return opts.lire(cle)(bx); },
          function (v) { opts.ecrire(cle, bx, v); },
          "Facteur — vide = ×1.", reg);
      }
    });
  }
  // ---- 16. Réglages des caractéristiques ----
  // LE TABLEAU DE BORD DU MENEUR, première moitié. Une rangée par
  // caractéristique, et sur chaque rangée la chaîne à neuf boîtes :
  //
  //     forçage  |  ＋ ＋  ×  × ×  |  ＋ ＋  ×  × ×
  //
  // MÊME GRILLE que les compétences et les capacités, et c'est voulu : régler
  // une caractéristique, une compétence ou un maximum sont le même geste, et le
  // meneur n'a pas à apprendre trois dispositions.
  //
  // DEUX LEVIERS, donc une bande d'onglets comme celle des compétences :
  //   Total  la valeur de la caractéristique
  //   XP     ce que ses points achetés à l'expérience ont coûté
  function buildModCaracs() {
    var b = block("Réglages des caractéristiques");
    var B = boitesTable("caracsLeviers");
    var bande = bandeOnglets(b);
    function onglet(titre, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, "", function (page) {
        grilleLevier(page, {
          cls: "levier",
          entete: ["Carac.", "Caractéristique"],
          lignes: caracsOrdre().map(function (name) {
            return { cle: name, nom: abbrCarac(name), titre: libCarac(name) };
          }),
          rangee: function (hote, cls, ligne, i) {
            return rangeeSigle(hote, cls, ligne.nom, i, ligne.titre);
          },
          lire: function (c) { return B.lire(nom, c); },
          ecrire: function (c, boite, v) { B.ecrire(nom, boite, c, v); },
          mot: mot,
          borne: borne,
          auto: auto,
          rendu: rendu
        });
      });
    }
    onglet("Total", "total", ["Total", "Total effectif de la caractéristique"], 9999,
      function (c) { return caracAuto(c); },
      function (c) {
        return {
          texte: fmtP(caracTotal(c)),
          titre: chaineTexteDe(lireCarac("total", c), "valeur", caracVal(c))
        };
      });
    onglet("XP", "xp", ["Coût", "Coût effectif en xp"], 99999,
      function (c) { return caracXpDe(c); },
      function (c) {
        return {
          texte: fmtP(caracXp(c)),
          zero: !caracXp(c),
          titre: chaineTexteDe(lireCarac("xp", c), fmtP(caracAchat(c)) + " points achetés :",
                               caracXpDe(c))
        };
      });
    bande.montre(0);
    return b;
  }
  // ---- 17. Affichage (Roll20 seulement) ----
  // window.__owdNight n'existe que sous roll20-fiche.html : sur le site, le
  // bouton d'en-tête gère déjà la nuit.
  function affichagePresent() { return !!window.__owdNight; }
  function buildAffichage() {
    var b = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__owdNight.pref();
    mode.addEventListener("change", function () { window.__owdNight.set(mode.value); });
    b.appendChild(fld("Mode par défaut", mode));
    return b;
  }

  // ---- 20. Fiche : exporter / importer / réinitialiser ----
  // REDONNÉ ici parce que la barre d'outils n'existe pas dans Roll20, où la
  // fiche EST le personnage.
  function buildActions() {
    var b = block("Fiche");
    var act = el("div", "pc-opt-actions");
    function btn(txt, cls, fn) {
      var x = el("button", "pc-btn" + (cls ? " " + cls : ""), txt);
      x.type = "button";
      x.addEventListener("click", fn);
      return x;
    }
    var exportBtn=btn("Exporter (JSON)", null, exporterJson);exportBtn.setAttribute("data-consultation","1");act.appendChild(exportBtn);
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () { importerJson(file); });
    act.appendChild(btn("Importer (JSON)", null, function () { file.click(); }));
    act.appendChild(file);
    act.appendChild(btn("Réinitialiser la fiche", "danger", function () {
      // confirmer(), jamais confirm() : muet dans l'iframe Roll20, il rendrait
      // false sans rien afficher et le geste serait annulé en silence.
      confirmer("Réinitialiser la fiche",
                "Tout le personnage sera effacé : caractéristiques, compétences, techniques, " +
                "équipement, inventaire, mods. Exporter d'abord si le doute existe.",
                "Réinitialiser", function () {
        state = blank();
        remount();
        flash("Fiche réinitialisée.");
      });
    }));
    b.appendChild(act);
    return b;
  }

  // ---- Rupture ----
  // UN MODULE D'OPTION : les points de rupture se dépensent en prenant un Rang
  // Max ou un rang de technique, et l'en-tête en tient le compte. Ce bloc ne
  // sert qu'à FORCER les points disponibles quand la table en décide
  // autrement ; « Max » rend la main au calcul. Leur nombre au plus se règle
  // dans les Réglages des capacités, à la ligne Rupture.
  function buildRupture() {
    var b = block("Rupture");
    var row = el("div", "pc-kv");
    row.appendChild(stepper(
      function () { return state.etat.rupture === null ? ruptureRestante() : state.etat.rupture; },
      function (v) { state.etat.rupture = Math.round(v); },
      1, "points de rupture"));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Max", "Revenir au calcul", function () {
      state.etat.rupture = null;
      refresh();
    }));
    b.appendChild(row);
    hooks.push(function () {
      max.textContent = "/ " + fmtP(ruptureMax());
      max.classList.toggle("adj", capForce("rupture"));
      max.title = capForce("rupture")
        ? chaineTexteDe(lireCap("max", "rupture"), "calculé", ruptureMaxAuto())
        : "";
    });
    return b;
  }
  // ---- 21. Réglages des capacités ----
  // LE TABLEAU DE BORD DU MENEUR, seconde moitié : une rangée par valeur
  // dérivée du corps, et la même chaîne à neuf boîtes que les caractéristiques
  // et les compétences.
  //
  // C'est ICI, et nulle part ailleurs, qu'on impose un maximum : les champs
  // « Forcé » des blocs de la Fiche écrivent dans la MÊME boîte (capsLeviers,
  // levier « max », boîte « force »), et les trois emplacements qu'ils portent
  // sont les trois premiers ajouts de cette chaîne. Deux endroits pour la même
  // donnée finiraient par se contredire ; il n'y en a qu'un.
  //
  // L'ORDRE EST CELUI DE LA FICHE : les jauges d'abord, les limites du corps
  // ensuite, les compteurs à la fin. La liste est écrite ici parce qu'elle
  // range ET nomme ce que le livre laisse sans ordre ; les libellés, eux,
  // viennent des règles (libCap) dès qu'elles les donnent.
  function buildOptCaps() {
    var b = block("Réglages des capacités");
    var B = boitesTable("capsLeviers");
    var LIGNES = [
      ["pv", "Points de vie"], ["pe", "Points d'endurance"], ["pm", "Points de mana"],
      ["pi", "Points d'innocence"], ["pr", "Points de repos"], ["ps", "Points de satiété"],
      ["ph", "Points d'hydratation"], ["pc", "Points de chance"],
      ["charge", "Charge"], ["acces", "Accès rapides"],
      ["contenance", "Contenance"], ["expo", "Exposition"], ["rupture", "Rupture"],
      ["desAction", "Dés d'action"], ["effondrement", "Effondrement"]
    ];
    grilleLevier(b, {
      cls: "levier",
      entete: ["Capacité", "La valeur dérivée à régler"],
      lignes: LIGNES.map(function (L) {
        return { cle: L[0], nom: libCap(L[0], L[1]), titre: libCap(L[0], L[1]) };
      }),
      rangee: function (hote, cls, ligne, i) {
        return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
      },
      lire: function (cle) { return B.lire("max", cle); },
      ecrire: function (cle, boite, v) { B.ecrire("max", boite, cle, v); },
      mot: ["Total", "Valeur effective"],
      borne: 99999,
      // L'EFFONDREMENT N'EST PAS UN MAXIMUM, C'EST UN NIVEAU. Sa ligne montre
      // donc ce que le personnage SUBIT, pas le plafond de l'échelle : les deux
      // se lisaient côte à côte dans la même rangée, le filigrane disant 0 et
      // le total disant 10.
      auto: function (cle) {
        return cle === "effondrement" ? effondrementAuto() : autoDe(cle);
      },
      rendu: function (cle) {
        var d = capDef(cle);
        return {
          texte: fmtP(cle === "effondrement" ? effondrement() : maxDe(cle)),
          // La formule du livre est ce que la capacité vaut AVANT tout réglage :
          // c'est la base de la chaîne, et la dire n'est pas réciter une règle,
          // c'est dire d'où sort le nombre qu'on lit.
          titre: chaineTexteDe(lireCap("max", cle),
                               d && d.formule ? d.formule + " :" : "calculé",
                               fmtP(cle === "effondrement" ? effondrementAuto() : autoDe(cle)))
        };
      }
    });
    return b;
  }

  // ---- 22. Réglages des compétences ----
  // Le pendant des deux blocs précédents, compétence par compétence, et le seul
  // des trois à porter une BANDE D'ONGLETS : une compétence a quatre valeurs
  // dérivées, là où une caractéristique n'en a qu'une.
  //
  //   Bonus    ce qu'elle ajoute au jet
  //   Dés      combien de dés d'action elle laisse engager
  //   XP       ce que ses rangs ont coûté
  //   Offerts  combien de ses premiers rangs ont été reçus sans XP
  //   Rupture  ce que ses rangs ont engagé
  //
  // La liste est OUVERTE (le joueur nomme ses compétences) et FILTRÉE : le bloc
  // se rebâtit donc, et ses fonctions de rafraîchissement vivent dans un
  // registre à lui, `optHooks`, vidé à chaque passe — sinon chaque rebâti
  // fuirait des hooks qui pointent sur un DOM disparu.
  //
  // LES QUATRE ONGLETS SE REBÂTISSENT ENSEMBLE, et le rejeu final est
  // obligatoire : les appelants lancent refresh() PUIS le rebâti, donc les
  // fonctions fraîches naîtraient après la passe et les totaux resteraient
  // vides jusqu'au prochain geste.
  //
  // Ses variables de vue lui sont PROPRES (optFilter, optOnly) : on ne cherche
  // pas la même chose ici que dans l'onglet Fiche.
  function buildOptComps() {
    var b = block("Réglages des compétences");
    var tools = el("div", "pc-comp-tools");
    var l1 = el("div", "row");
    var search = champFiltre(function () { return optFilter; },
                             function (v) { optFilter = v; }, "Filtrer les compétences…",
                             function () { optCompsRebuild(); });
    if (search) l1.appendChild(search);
    if (l1.children.length) tools.appendChild(l1);
    var l2 = el("div", "row");
    var puce = el("span", "pc-chip", "Investies");
    puce.title = "N'afficher que les compétences où un rang ou un levier est posé.";
    puce.classList.toggle("on", optOnly);
    puce.addEventListener("click", function () {
      optOnly = !optOnly;
      puce.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    l2.appendChild(puce);
    tools.appendChild(l2);
    b.appendChild(tools);

    var bande = bandeOnglets(b);
    var B = boitesTable("compsLeviers");
    var rebatis = [];

    // Ce que les quatre onglets montrent, dans l'ordre de la vie d'une
    // compétence : ce qu'elle DONNE (bonus, dés), puis ce qu'elle COÛTE
    // (xp, rupture).
    function onglet(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (page) {
        var corps = el("div");
        page.appendChild(corps);
        function bati() {
          corps.innerHTML = "";
          var liste = compsVisibles();
          if (!liste.length) { corps.appendChild(el("div", "pc-empty", motVide())); return; }
          grilleLevier(corps, {
            cls: "levier",
            entete: ["Comp.", "Compétence"],
            lignes: liste.map(function (c) {
              return { cle: c.id, nom: c.nom || "Sans nom",
                       titre: (c.nom || "Sans nom") + " · " + (compGroupe(c) || "sans groupe") };
            }),
            rangee: function (hote, cls, ligne, i) {
              return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
            },
            lire: function (id) { return B.lire(nom, id); },
            ecrire: function (id, boite, v) { B.ecrire(nom, boite, id, v); },
            mot: mot, borne: borne,
            auto: function (id) { return auto(compDe(id)); },
            rendu: function (id) { return rendu(compDe(id)); },
            reg: optHooks
          });
        }
        bati();
        rebatis.push(bati);
      });
    }

    function compsVisibles() {
      var flt = filtreDe(optFilter);
      return state.comps.filter(function (c) {
        if (optOnly && !compInvestie(c)) return false;
        if (flt && pli(c.nom).indexOf(flt) < 0 && pli(c.groupe).indexOf(flt) < 0) return false;
        return true;
      });
    }
    function motVide() {
      var flt = filtreDe(optFilter);
      return !state.comps.length ? "Aucune compétence sur cette fiche."
        : flt ? "Aucune compétence ne correspond à la recherche."
              : "Aucune compétence investie : la puce « Investies » masque les autres.";
    }

    onglet("Bonus", "", "bonus", ["Bonus", "Bonus effectif au jet"], 999,
      function (c) { return compBonusAuto(c); },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        var rang = compRang(c), info = rangInfo(rang);
        return {
          texte: sign(compBonus(c)),
          zero: !rang && !levierRegleDe(lireComp("bonus", c.id)),
          titre: chaineTexteDe(lireComp("bonus", c.id),
                               "rang " + rang + " (" + (info.nom || "?") + ")",
                               sign(num(info.bonus, 0)))
        };
      });

    onglet("Dés", "", "des", ["Dés", "Dés d'action engageables"], 99,
      function (c) { return c ? num(rangInfo(compRang(c)).des, 0) : 0; },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        var rang = compRang(c);
        return {
          texte: fmtP(compDes(c)),
          zero: !compDes(c),
          titre: chaineTexteDe(lireComp("des", c.id), "rang " + rang + " :",
                               num(rangInfo(rang).des, 0))
        };
      });

    onglet("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      function (c) { return compXpAuto(c); },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        return {
          texte: fmtP(compXp(c)),
          zero: !compXp(c),
          titre: chaineTexteDe(lireComp("xp", c.id),
                               "rangs pris jusqu'au rang " + compRang(c) + " :",
                               compXpAuto(c))
        };
      });

    onglet("Offerts", "", "offerts", ["Rangs", "Rangs offerts"], 99,
      function () { return 0; },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        return {
          texte: fmtP(compOffertsBrut(c)),
          zero: !compOffertsBrut(c),
          titre: chaineTexteDe(lireComp("offerts", c.id), "rangs offerts :", 0)
        };
      });

    onglet("Rupture", "", "rupture", ["Points", "Points de rupture engagés"], 99,
      function (c) { return compRuptureAuto(c); },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        return {
          texte: fmtP(compRupture(c)),
          zero: !compRupture(c),
          titre: chaineTexteDe(lireComp("rupture", c.id),
                               "rangs pris jusqu'au rang " + compRang(c) + " :",
                               compRuptureAuto(c))
        };
      });

    optCompsRebuild = function () {
      optHooks.length = 0;
      rebatis.forEach(function (f) { f(); });
      // Les fonctions qui viennent de naître n'ont pas été jouées par la passe
      // en cours : sans ce rejeu, les totaux restent vides jusqu'au geste
      // suivant, et le bloc a l'air cassé.
      for (var i = 0; i < optHooks.length; i++) {
        try { optHooks[i](); } catch (e) { /* une rangée fautive n'emporte pas le bloc */ }
      }
    };

    bande.montre(0);
    return b;
  }

  // ---- 23. Outils de filtre ----
  // Couper un outil le fait DISPARAÎTRE partout et cesser d'agir : un filtre
  // invisible qui masque encore des lignes serait un piège. La puce porte le
  // nom de l'OUTIL, jamais celui de son réglage par défaut.
  function buildFiltres() {
    var b = block("Outils de filtre");
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    var chip = el("span", "pc-chip", "Champ de recherche");
    chip.title = "La case où l'on tape pour filtrer les compétences, sur la Fiche comme ici. " +
                 "Éteinte : l'outil disparaît, et ne filtre plus rien.";
    chip.classList.toggle("on", filtreTexteOn());
    chip.addEventListener("click", function () {
      var on = filtreTexteOn();
      lset(FILTRES.texte, on ? "0" : "1");
      chip.classList.toggle("on", !on);
      remount();   // l'outil vit dans un autre onglet : tout se rebâtit
    });
    line.appendChild(chip);
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // ---- 19. Modules : le plan de la fiche ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle sont ceux du
  // MONTAGE (ordreModules, squeletteColonnes, MODULES_NATIFS), pour que le plan
  // dise exactement ce que la fiche a fait.
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage. On ne lit surtout pas
  // modules[i].onglet : appliqueDisposition l'a déjà remanié, il porte la place
  // FORCÉE — et « Disposition d'origine » ne montrerait rien avant le
  // rechargement, un module déplacé deux fois repartant de sa place forcée.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string" && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: colonneNormalisee(p.onglet, p.colonne) };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: colonneNormalisee(o.onglet, o.colonne) };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() { return ordreModules().map(function (m) { return m.id; }); }
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet. L'ancienne
  // version écrivait l'ordre COMPLET de tous les modules, tous onglets
  // confondus : un seul clic n'importe où, et la disposition du personnage
  // était gelée pour toujours — la fiche pouvait ensuite réagencer un onglet
  // auquel le joueur n'avait jamais touché, il ne le voyait jamais. C'est
  // arrivé pour de bon en JJK.
  //
  // ordonne() accepte un ordre PARTIEL : c'est ce qui rend la chose possible.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = neuf;
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS : elle
    // se remontait, et ranger trois modules reconstruisait trois fois la fiche
    // entière, l'onglet sautait, et le moindre clic coûtait une seconde.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
  function deplaceModule(id, onglet, colonne, avantId) {
    var d = disposition();
    var nat = placeOrigine[id] || natifDe(id);
    if (!d.place || typeof d.place !== "object" || Array.isArray(d.place)) d.place = {};
    // Revenir à sa place d'origine EFFACE l'entrée plutôt que d'y ranger cette
    // place : la disposition reste éparse, et un module que la fiche
    // déménagera un jour suivra son déménagement au lieu d'être épinglé ici.
    if (nat && nat.onglet === onglet && nat.colonne === colonne) delete d.place[id];
    else d.place[id] = { onglet: onglet, colonne: colonne };
    var ids = idsConnus();
    var j = ids.indexOf(id);
    if (j >= 0) ids.splice(j, 1);
    var k = avantId ? ids.indexOf(avantId) : -1;
    if (k >= 0) ids.splice(k, 0, id);
    else {
      // à la fin de SA colonne, et non à la fin de tout : sinon un module lâché
      // au bas d'une colonne se rangerait derrière ceux des autres onglets
      var dernier = -1, q;
      for (q = 0; q < ids.length; q++) if (memeColonne(ids[q], onglet, colonne)) dernier = q;
      if (dernier >= 0) ids.splice(dernier + 1, 0, id);
      else ids.push(id);
    }
    ecritOrdre(ids, onglet, colonne);
    redessinePlan();
  }
  // Redessiner LE PLAN SEUL, sans reconstruire la fiche. Enveloppé : un plan
  // qui échoue ne doit pas emporter la fiche avec lui.
  function redessinePlan() {
    try {
      var vieux = document.querySelector('[data-module="' + MODULE_REGLAGES + '"]');
      if (!vieux || !vieux.parentNode) return;
      var neuf = buildModules();
      if (!neuf) return;
      neuf.dataset.module = MODULE_REGLAGES;
      vieux.parentNode.replaceChild(neuf, vieux);
      elModules[MODULE_REGLAGES] = neuf;
    } catch (e) {}
  }
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » dans un onglet qui n'en a pas se retrouve sans
  // hôte : il ne se monte nulle part, alors que sa ligne, elle, figure bien
  // sous son onglet, l'air d'un module ordinaire. Il faut le reconnaître pour
  // le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                    // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
  }
  function buildModules() {
    var b = block("Modules");
    var plan = el("div", "pc-modplan");
    var visibles = ordreModules().filter(moduleAffichable);
    var vus = {};
    var pris = null;        // l'id qu'on tient
    var listes = [];        // toutes les zones de dépôt, pour les éteindre

    function eteintTout() {
      listes.forEach(function (z) { z.classList.remove("survol"); });
      var c = plan.querySelectorAll(".pc-modplan-carte.avant");
      for (var i = 0; i < c.length; i++) c[i].classList.remove("avant");
    }
    // Devant quelle carte se pose ce qu'on lâche à cette hauteur ? La moitié
    // HAUTE d'une carte veut dire « avant elle ».
    function cibleDe(liste, y) {
      var cartes = liste.querySelectorAll(".pc-modplan-carte");
      for (var i = 0; i < cartes.length; i++) {
        var r = cartes[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return cartes[i];
      }
      return null;
    }
    function carte(m, souci) {
      var c = el("div", "pc-modplan-carte");
      c.dataset.id = m.id;
      c.draggable = true;
      var t = el("span", "t", m.titre || m.id);
      t.title = (m.titre || m.id) + (souci ? " — " + souci : "");
      c.appendChild(t);
      // L'œil : affiché ou masqué. Le bloc des réglages lui-même n'en a pas,
      // c'est lui qui rallume les autres.
      if (m.id !== MODULE_REGLAGES) {
        var oeil = el("span", "pc-modplan-oeil");
        oeil.textContent = actif(m.id) ? "●" : "○";
        oeil.title = actif(m.id)
          ? "Affiché sur la fiche. Cliquer pour le masquer : rien n'est effacé."
          : "Masqué. Cliquer pour le réafficher.";
        oeil.addEventListener("click", function (e) {
          e.stopPropagation();
          activeModule(m.id, !actif(m.id));
          redessinePlan();       // comme le rangement : la fiche attend son chargement
        });
        c.appendChild(oeil);
      }
      var e = etatModule(m.id);
      if (e.panne) { c.dataset.etat = "panne"; t.title += " — en panne : " + e.panne; }
      else if (e.musele) { c.dataset.etat = "panne"; t.title += " — muselé : " + e.erreur; }
      if (souci) c.dataset.etat = "perdu";
      if (!actif(m.id)) c.classList.add("off");

      c.addEventListener("dragstart", function (ev) {
        pris = m.id;
        c.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", m.id);
        } catch (err) {}
      });
      c.addEventListener("dragend", function () {
        pris = null;
        c.classList.remove("pris");
        eteintTout();
      });
      return c;
    }
    function zone(onglet, colonne, libelle) {
      var z = el("div", "pc-modplan-col");
      z.appendChild(el("div", "pc-modplan-col-nom", libelle));
      var liste = el("div", "pc-modplan-liste");
      z.appendChild(liste);
      listes.push(liste);
      liste.addEventListener("dragover", function (ev) {
        if (!pris) return;
        ev.preventDefault();           // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (err) {}
        eteintTout();
        liste.classList.add("survol");
        var avant = cibleDe(liste, ev.clientY);
        if (avant) avant.classList.add("avant");
      });
      liste.addEventListener("dragleave", function (ev) {
        if (ev.target === liste) liste.classList.remove("survol");
      });
      liste.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var id = pris;
        if (!id) { try { id = ev.dataTransfer.getData("text/plain"); } catch (err) { id = null; } }
        eteintTout();
        if (!id) return;
        var avant = cibleDe(liste, ev.clientY);
        if (avant && avant.dataset.id === id) return;   // se lâcher sur soi-même ne range rien
        deplaceModule(id, onglet, colonne, avant ? avant.dataset.id : null);
      });
      return { bloc: z, liste: liste };
    }
    function remplit(onglet, dedans, noms, premiere) {
      var rangee = el("div", "pc-modplan-cols");
      rangee.style.gridTemplateColumns = "repeat(" + noms.length + ", minmax(0, 1fr))";
      noms.forEach(function (c) {
        var z = zone(onglet, c, LIB_COLONNES[c] || capFirst(c));
        dedans.forEach(function (o) {
          // une colonne que l'onglet ne connaît pas : la carte se pose dans la
          // PREMIÈRE colonne, marquée, plutôt que de n'apparaître nulle part —
          // sinon le module serait invisible ET impossible à ranger
          var perdue = colonneInconnue(o.place);
          var ici = perdue ? (c === premiere) : (o.place.colonne === c);
          if (!ici) return;
          vus[o.m.id] = 1;
          z.liste.appendChild(carte(o.m, perdue
            ? "colonne « " + o.place.colonne + " » inconnue dans cet onglet : ce module ne s'affiche nulle part"
            : ""));
        });
        rangee.appendChild(z.bloc);
      });
      return rangee;
    }

    TABS.forEach(function (t) {
      var dedans = [];
      visibles.forEach(function (m) {
        var p = placeDemandee(m);
        if (p.onglet === t.id) dedans.push({ m: m, place: p });
      });
      if (!dedans.length) return;
      plan.appendChild(el("div", "pc-modgroupe", t.label));
      var d = squeletteColonnes(t.id) || { noms: [], larges: {} };
      var noms = d.noms.length ? d.noms : ["gauche"];
      // Une colonne PLEINE LARGEUR n'est pas une colonne de la grille : sur la
      // fiche elle court sous les autres. Le plan la met donc SOUS elles, dans
      // sa propre rangée, au lieu de la serrer entre deux voisines à qui elle
      // prendrait un tiers de la place.
      var etroites = noms.filter(function (c) { return !d.larges[c]; });
      var larges = noms.filter(function (c) { return !!d.larges[c]; });
      if (!etroites.length) { etroites = larges; larges = []; }
      plan.appendChild(remplit(t.id, dedans, etroites, etroites[0]));
      larges.forEach(function (c) { plan.appendChild(remplit(t.id, dedans, [c], null)); });
    });

    // Un module dont l'ONGLET n'existe pas (un mod mal réglé) ne se monte nulle
    // part. Sans cette rangée il serait invisible ET impossible à ranger : le
    // joueur n'aurait plus qu'à effacer le mod pour s'en défaire.
    var perdus = visibles.filter(function (m) { return !vus[m.id]; });
    if (perdus.length) {
      plan.appendChild(el("div", "pc-modgroupe", "Onglet inconnu"));
      var rp = el("div", "pc-modplan-cols");
      rp.style.gridTemplateColumns = "minmax(0, 1fr)";
      var zp = zone(TABS[0].id, "gauche", "À ranger");
      perdus.forEach(function (m) {
        zp.liste.appendChild(carte(m, "onglet « " + placeDemandee(m).onglet +
          " » inconnu : ce module ne s'affiche nulle part"));
      });
      rp.appendChild(zp.bloc);
      plan.appendChild(rp);
    }

    if (!plan.children.length) plan.appendChild(el("div", "pc-empty", "Aucun module."));
    b.appendChild(plan);
    var tools = el("div", "pc-comp-tools");
    // Ranger n'agit plus tout de suite, et IL FAUT LE DIRE : sans cette ligne,
    // le plan montrerait un rangement que la fiche derrière ne suit pas, et on
    // le croirait cassé.
    tools.appendChild(el("div", "pc-modplan-avis",
      "La disposition ne change qu'au chargement de la fiche."));
    var duo = el("div", "pc-modplan-duo");
    duo.appendChild(miniBtn("Disposition d'origine",
      "Rendre à chaque module son onglet, sa colonne et son rang d'origine. Les modules masqués le restent.",
      function () {
        state.modules = {};
        ordonne([]);
        save();
        redessinePlan();
        flash("Disposition d'origine rétablie. Recharger la fiche pour la voir.");
      }));
    duo.appendChild(miniBtn("Recharger la fiche", "Reconstruire la fiche avec le rangement du plan.",
      function () { remount(); flash("Fiche rechargée."); }));
    tools.appendChild(duo);
    b.appendChild(tools);
    return b;
  }

  // Lecture des opérations existantes : ouvrir, chercher et paginer n'écrit
  // rien sur la fiche et ne produit donc jamais de logs récursifs.
  var journalVue = {query:"", page:0, ouverts:{}};
  var JOURNAL_LIBELLES = {
    name:"Nom", age:"Âge", espece:"Espèce", genre:"Genre", sexe:"Sexe", taille:"Taille", portrait:"Portrait", background:"Bio",
    caracs:"Caractéristiques", caracsXp:"XP des caractéristiques", xpTotal:"XP", etat:"Réserves", pv:"PV", pe:"PE", pm:"PM", ps:"PS", pr:"PR", ph:"PH", pi:"PI", pc:"PC",
    comps:"Compétences", techniques:"Techniques", notes:"Notes", messages:"Messages", text:"Texte", mode:"Format", at:"Date", format:"Format",
    inv:"Inventaire", objets:"Objets", nom:"Nom", qte:"Quantité", ou:"Emplacement", dans:"Contenant", emp:"Accroche", rang:"Rang", groupe:"Groupe", ordre:"Ordre", order:"Ordre",
    attaques:"Attaques", defenses:"Défenses", avantages:"Avantages", modules:"Disposition des modules", modActifs:"Modules actifs", mods:"Mods", modData:"Données des modules",
    effort:"Effort", horloge:"Horloge", horlogeDigestion:"Digestion", horlogeExposition:"Exposition", horlogeAlcool:"Alcool", temperature:"Température", qualiteSommeil:"Qualité du sommeil",
    effetsActifs:"Effets actifs", effetsPermanents:"Effets permanents", effParties:"Effondrement", effDesactive:"Désactiver Effondrement", allure:"Allure", allureCran:"Vitesse",
    capsLeviers:"Réglages des capacités", caracsLeviers:"Réglages des caractéristiques", compsLeviers:"Réglages des compétences", combatOptions:"Options de combat", impregnation:"Imprégnation", combatModifiers:"Modificateurs de combat", combatAffichage:"Affichage de combat",
    desTailles:"Dés d’action", desUtilises:"Dés utilisés", v:"Format de fiche", rel:"Version", de:"Jets"
  };
  function journalLib(k) { return JOURNAL_LIBELLES[k] || String(k).replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," "); }
  function journalValeur(n) {
    if(!n) return "Absent";
    if(n[0]==="d") return "Supprimé";
    if(n[0]==="o") return "Objet";
    if(n[0]==="l") return "Liste";
    if(n[0]==="i") return "Liste de "+n[1]+" éléments";
    return typeof n[1]==="string" ? n[1] : JSON.stringify(n[1]);
  }
  function journalChemin(c, op) {
    var p;try{p=JSON.parse(c.k);}catch(e){return "Champ inconnu";}
    return p.map(function(seg,i){
      if(seg[0]==="e") {
        var name=(op.labels||{})[seg[1]];
        if(!name) {var source=p[0][1]==="inv" ? state.inv.objets : state[p[0][1]];
          if(Array.isArray(source)){var item=source.filter(function(x){return x&&(x.id===seg[1]||x.ref===seg[1]);})[0];if(item)name=item.nom||item.name||item.text;}}
        return name ? String(name).slice(0,100) : "Élément "+seg[1];
      }
      return seg[0]==="order" ? "Ordre" : seg[0]==="index" ? "Emplacement "+(Number(seg[1])+1) : journalLib(seg[1]);
    }).join(" · ");
  }
  function buildJournal() {
    var b=block("Journal"), search=el("input","pc-input"), info=el("div","pc-journal-info"), list=el("div","pc-journal-list"), pages=el("div","pc-journal-pages");
    search.type="search";search.placeholder="Rechercher un changement ou un joueur…";search.setAttribute("aria-label","Rechercher dans le journal");search.value=journalVue.query;
    b.appendChild(search);b.appendChild(info);b.appendChild(list);b.appendChild(pages);
    var previous="",dead=false,timer=null;
    function render(force) {
      if(dead || (!force && (window.__owdViewVisible===false||!b.getClientRects().length)))return;
      if(typeof window.__owdJournal!=="function") {info.textContent="Le journal des changements est disponible dans Roll20.";return;}
      var data=window.__owdJournal(), rows=data.ops.filter(function(op){return op.changes&&op.changes.length;});
      var signature=rows.map(function(op){return op.id;}).join("|")+"/"+Object.keys(data.pending).join("|")+"/"+data.conflicts.length+"/"+data.identity;
      if(!force&&signature===previous)return;previous=signature;
      var conflicts={};data.conflicts.forEach(function(c){conflicts[c.id]=true;});
      rows.sort(function(a,b){return b.clock-a.clock || (a.id<b.id?1:-1);});
      function payloadText(op){return Object.keys(op.creates||{}).map(function(ref){var value=data.payload&&data.payload(op.creates[ref].attribute);return value?JSON.stringify(value):"";}).join(" ");}
      var query=journalVue.query.toLocaleLowerCase("fr");
      if(query)rows=rows.filter(function(op){return ((op.actor&&op.actor.name||"")+" "+payloadText(op)+" "+op.changes.map(function(c){return journalChemin(c,op)+" "+journalValeur(c.before)+" "+journalValeur(c.n);}).join(" ")).toLocaleLowerCase("fr").indexOf(query)>=0;});
      var max=Math.max(0,Math.ceil(rows.length/50)-1);journalVue.page=Math.min(max,journalVue.page);
      list.textContent="";pages.textContent="";
      info.textContent=rows.length+" changement"+(rows.length===1?"":"s")+(data.identity?"":" · Auteur non identifié avec ce pont Roll20");
      if(!rows.length)list.appendChild(el("div","pc-empty",query?"Aucun changement trouvé.":"Aucun changement enregistré."));
      rows.slice(journalVue.page*50,(journalVue.page+1)*50).forEach(function(op){
        var row=el("details","pc-journal-entry"),summary=el("summary"),head=el("div","pc-journal-head"),time=el("time"),date=new Date(op.at);
        row.dataset.id=op.id;
        if(op.at>0&&isFinite(date.getTime())){time.dateTime=date.toISOString();time.textContent=date.toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"medium"});}else time.textContent="Date non enregistrée";
        head.appendChild(time);
        head.appendChild(el("strong",null,op.actor&&op.actor.name ? op.actor.name : /^token(?:-max)?:/.test(op.id)?"Token · joueur non identifié":"Joueur non identifié"));
        if(conflicts[op.id])head.appendChild(el("span","pc-journal-status","Conflit détecté"));
        else if(data.pending[op.id])head.appendChild(el("span","pc-journal-status","En attente de sauvegarde"));
        summary.appendChild(head);
        var groups=[];op.changes.forEach(function(c){var path;try{path=JSON.parse(c.k);var name=path.length?journalLib(path[0][1]):"Fiche";if(groups.indexOf(name)<0)groups.push(name);}catch(e){}});
        summary.appendChild(el("div","pc-journal-summary",groups.join(" · ")+" ("+op.changes.length+")"));row.appendChild(summary);
        var content=el("div","pc-journal-details"),loaded=false;row.appendChild(content);
        function detail(){if(loaded)return;loaded=true;op.changes.forEach(function(c){var line=el("div","pc-journal-change");line.appendChild(el("strong",null,journalChemin(c,op)));
          line.appendChild(el("pre",null,journalValeur(c.before)+" → "+journalValeur(c.n)));
          if(c.delta!==undefined)line.appendChild(el("small",null,"Variation : "+(c.delta>0?"+":"")+c.delta));content.appendChild(line);});
          [op.creates||{},op.modules||{}].forEach(function(map){Object.keys(map).forEach(function(id){var value=data.payload&&data.payload(map[id].attribute);if(value){var line=el("div","pc-journal-change");line.appendChild(el("strong",null,"Création · "+((op.labels||{})[id]||id)));line.appendChild(el("pre",null,JSON.stringify(value,null,2)));content.appendChild(line);}});});}
        row.open=!!journalVue.ouverts[op.id];if(row.open)detail();
        row.addEventListener("toggle",function(){journalVue.ouverts[op.id]=row.open;if(row.open)detail();});list.appendChild(row);
      });
      function page(text,step,disabled){var button=miniBtn(text,null,function(){journalVue.page+=step;render(true);});button.disabled=disabled;pages.appendChild(button);}
      page("Plus récents",-1,journalVue.page===0);pages.appendChild(el("span",null,(journalVue.page+1)+" / "+(max+1)));page("Plus anciens",1,journalVue.page===max);
    }
    search.addEventListener("input",function(){journalVue.query=search.value;journalVue.page=0;clearTimeout(timer);timer=setTimeout(function(){render(true);},150);});
    var poll=setInterval(function(){render(false);},1000);
    remontageNettoyage.push(function(){dead=true;clearInterval(poll);clearTimeout(timer);});
    hooks.push(function(){render(false);});render(true);return b;
  }
  // ---- 18. Mods : le code ajouté au personnage ----
  // Ce bloc dit ce que chaque mod fait (ou pourquoi il ne fait rien), donne de
  // quoi trancher, et permet d'en écrire un. Le moteur (owd-mods.js) juge,
  // exécute et range les accords ; sans lui, ce bloc se contente de le dire.
  //
  // AUCUN BAC À SABLE : un mod autorisé tourne dans la page de la fiche avec
  // exactement ses droits. Les textes d'ici ne doivent jamais laisser croire
  // autre chose.
  var ETATS_MOD = {
    ok: "tourne",
    panne: "en panne",
    attente: "en attente d'autorisation",
    coupe: "coupé",
    recent: "trop récent",
    refuse: "refusé sur ce navigateur"
  };
  function moteurMods() {
    return (window.OwdMods && typeof window.OwdMods.execute === "function") ? window.OwdMods : null;
  }
  function bilanDeMod(id) {
    for (var i = 0; i < bilanMods.length; i++) if (bilanMods[i].id === id) return bilanMods[i];
    return null;
  }
  // Le moteur fait foi pour l'empreinte comme pour l'avis : la recalculer ici
  // ferait deux règles pour une seule décision, et un mod se remettrait à
  // demander l'autorisation dès que les deux dérivent d'un caractère.
  function empreinteMod(id, src) {
    var mm = moteurMods();
    try { return mm ? mm.empreinte(id, src) : ""; } catch (e) { return ""; }
  }
  function avisMod(emp) {
    var mm = moteurMods();
    try { return mm ? mm.avis(emp) : ""; } catch (e) { return ""; }
  }
  function decideMod(empreinte, avis) {
    if (!window.OwdMods || typeof window.OwdMods.decide !== "function") return;
    try { window.OwdMods.decide(empreinte, avis); } catch (e) {}
  }
  // Même règle d'id que le moteur (idPropre) et que normalize() : les trois
  // chemins doivent donner le MÊME id, sans quoi l'empreinte changerait selon
  // le chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
  function idMod(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  // Un « pour » illisible est SILENCIEUSEMENT oublié par le moteur : autant le
  // dire tout de suite. La règle de lecture est CELLE DU MOTEUR, jamais une
  // copie locale — en JJK, une copie restée en arrière a fait refuser au
  // formulaire le numéro qu'il proposait lui-même en filigrane.
  function versionLisible(v) {
    var mm = window.OwdMods;
    if (!mm || typeof mm.lireVersion !== "function") return true;
    try { return !!mm.lireVersion(v); } catch (e) { return true; }
  }
  function formulaireMod(base, titre, libelleValider, appliquer) {
    base = base || {};
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Ce code tourne dans la page de la fiche, avec les mêmes droits qu'elle : il n'y a pas de bac à sable. " +
      "Il part avec le personnage, et les autres joueurs auront à l'autoriser chez eux avant qu'il ne tourne."));
    var nom = el("input");
    nom.type = "text";
    nom.value = base.nom || "";
    var id = el("input");
    id.type = "text";
    id.value = base.id || "";
    // l'id se déduit du nom TANT QUE personne n'y a touché : un id corrigé à la
    // main ne doit pas se faire réécrire à la frappe suivante
    var idTenu = !!base.id;
    nom.addEventListener("input", function () { if (!idTenu) id.value = idMod(nom.value); });
    id.addEventListener("input", function () { idTenu = true; });
    var src = el("textarea", "pc-code");
    src.value = base.src || "";
    src.spellcheck = false;
    var pour = el("input");
    pour.type = "text";
    pour.placeholder = RELEASE;
    pour.value = base.pour || "";
    corps.appendChild(fld("Nom", nom));
    corps.appendChild(fld("Identifiant", id));
    corps.appendChild(fld("Code JavaScript (Owd, ctx)", src));
    corps.appendChild(fld("Pour la fiche, au moins (facultatif)", pour));
    dialogue(titre, corps, function () {
      var vid = idMod(id.value) || idMod(nom.value);
      var vp = String(pour.value == null ? "" : pour.value).trim();
      var prisId = false;
      if (!vid) { flash("Il faut un identifiant : des lettres, des chiffres ou des tirets."); return false; }
      (state.mods || []).forEach(function (x) { if (x !== base && x.id === vid) prisId = true; });
      if (prisId) { flash("L'identifiant « " + vid + " » est déjà pris par un autre mod."); return false; }
      if (vp && !versionLisible(vp)) {
        flash("« Pour la fiche » attend un numéro de version, comme " + RELEASE + ".");
        return false;
      }
      appliquer(vid, String(nom.value == null ? "" : nom.value).trim() || vid,
                String(src.value == null ? "" : src.value), vp);
    }, libelleValider);
  }
  function ajouteMod() {
    formulaireMod(null, "Ajouter un mod", "Ajouter", function (id, nom, src, pour) {
      var neuf = { id: id, nom: nom, actif: true, src: src };
      if (pour) neuf.pour = pour;
      if (!Array.isArray(state.mods)) state.mods = [];
      state.mods.push(neuf);
      // Le joueur vient de le taper : il n'a pas à s'autoriser lui-même. Le oui
      // porte sur CE code et sur CE navigateur seulement.
      decideMod(empreinteMod(id, src), "oui");
      save();
      remount();
      flash("Mod « " + nom + " » ajouté.");
    });
  }
  function modifieMod(m) {
    var avant = empreinteMod(m.id, m.src);
    formulaireMod(m, "Modifier « " + (m.nom || m.id) + " »", "Enregistrer",
      function (id, nom, src, pour) {
        m.id = id;
        m.nom = nom;
        m.src = src;
        if (pour) m.pour = pour; else delete m.pour;
        var apres = empreinteMod(id, src);
        // Le oui ne se pose QUE si l'empreinte a changé. Ouvrir puis refermer
        // l'éditeur sans rien toucher ne décide de rien : cela écrasait un
        // refus sans un mot, alors que la note du formulaire promet l'inverse.
        if (apres && apres !== avant) decideMod(apres, "oui");
        save();
        remount();
        flash("Mod « " + nom + " » enregistré.");
      });
  }
  // LIRE le code d'un mod ne doit pas supposer d'ouvrir l'éditeur : « Modifier »
  // sert à écrire, et valider son formulaire vaut accord. Ici rien ne bouge
  // tant que le joueur ne tranche pas.
  function voirMod(m) {
    var emp = empreinteMod(m.id, m.src);
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il n'y a pas de bac à sable. Lire ce code ne décide de rien."));
    var ligne = el("div", "pc-modrow");
    ligne.appendChild(el("span", "nom", m.nom || m.id));
    ligne.appendChild(el("span", "id", m.id));
    corps.appendChild(ligne);
    var ta = el("textarea", "pc-code");
    ta.readOnly = true;
    ta.spellcheck = false;
    ta.value = String(m.src == null ? "" : m.src);
    corps.appendChild(ta);
    var boutons = el("div", "row");
    boutons.appendChild(miniBtn("Autoriser", "Ce code tournera à chaque ouverture, sur ce navigateur",
      function () { decideMod(emp, "oui"); remount(); }));
    boutons.appendChild(miniBtn("Refuser", "Ce code ne tournera pas ; il reste sur le personnage",
      function () { decideMod(emp, "non"); remount(); }, "danger"));
    corps.appendChild(boutons);
    dialogue("Code de « " + (m.nom || m.id) + " »", corps, function () {}, "Fermer");
  }
  function supprimeMod(m) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "Le mod et son code quittent le personnage. Ce qu'il a déjà écrit dans la fiche reste ; " +
      "l'accord donné à ce code sur ce navigateur reste lui aussi, et vaudrait encore si le mod revenait."));
    dialogue("Supprimer « " + (m.nom || m.id) + " » ?", corps, function () {
      var i = state.mods.indexOf(m);
      if (i >= 0) state.mods.splice(i, 1);
      save();
      remount();
      flash("Mod supprimé.");
    }, "Supprimer");
  }
  // UNE LIGNE, ET LE MOINS DE BOUTONS POSSIBLE. « Autoriser » et « Refuser »
  // sont les deux faces d'une même question : une PUCE. « Modifier » et
  // « Supprimer » sont des gestes de CONSTRUCTION : derrière le rouage, par la
  // classe pc-edit-only — une classe, pas un test à la construction, le rouage
  // bascule une classe et ne rebâtit pas ses lignes.
  //
  // LES DEUX PUCES NE DISENT PAS LA MÊME CHOSE, et c'est pour cela qu'elles
  // sont deux : « Actif » appartient au PERSONNAGE et voyage avec lui,
  // « Autorisé » appartient à CE NAVIGATEUR et n'en sort jamais.
  function ligneMod(m) {
    var ligne = el("div", "pc-modrow pc-modrow-mod");
    ligne.dataset.id = m.id;
    var bil = bilanDeMod(m.id);
    var etat = bil ? bil.etat : "";
    var emp = empreinteMod(m.id, m.src);
    var avis = avisMod(emp);
    var on = m.actif !== false;
    var barre = el("div", "l");
    ligne.appendChild(barre);

    var nom = el("span", "nom", m.nom || m.id);
    nom.title = (m.nom || m.id) + " · identifiant " + m.id + " · " +
                (aClef(ETATS_MOD, etat) ? ETATS_MOD[etat] : "état inconnu");
    barre.appendChild(nom);
    // La panne garde son marquage : le liseré de la ligne et le message du
    // moteur en dessous. C'est la seule chose qu'une puce ne dit pas.
    if (etat === "panne") ligne.setAttribute("data-etat", "panne");

    barre.appendChild(miniBtn("Voir le code", "Lire le code de ce mod sans y toucher",
      function () { voirMod(m); }, "voir"));

    var puceA = el("span", "pc-chip", "Actif");
    puceA.title = "Sur LE PERSONNAGE, et voyage avec lui : couper ce mod le met en veille pour " +
                  "tout le monde, sans rien effacer.";
    puceA.classList.toggle("on", on);
    puceA.addEventListener("click", function () { m.actif = !on; save(); remount(); });
    barre.appendChild(puceA);

    var puceO = el("span", "pc-chip", "Autorisé");
    puceO.title = avis === "oui"
      ? "Sur CE NAVIGATEUR seulement : retirer l'accord, le code cessera de tourner ici."
      : "Sur CE NAVIGATEUR seulement : donner l'accord, le code tournera à chaque ouverture.";
    puceO.classList.toggle("on", avis === "oui");
    puceO.addEventListener("click", function () {
      decideMod(emp, avis === "oui" ? "non" : "oui");
      remount();
    });
    barre.appendChild(puceO);

    barre.appendChild(miniBtn("Modifier", "Changer le nom, l'identifiant ou le code",
      function () { modifieMod(m); }, "pc-edit-only"));
    barre.appendChild(miniBtn("Supprimer", "Retirer ce mod du personnage",
      function () { supprimeMod(m); }, "danger pc-edit-only"));

    if (bil && bil.message) ligne.appendChild(note(bil.message));
    return ligne;
  }
  function buildMods() {
    var b = block("Mods", null, "mods");
    // AUCUNE explication en tête de bloc : la fiche montre les données du
    // personnage, pas un mode d'emploi. Ce qu'il faut savoir avant d'autoriser
    // du code est dit LÀ OÙ LA DÉCISION SE PREND.
    //
    // Le moteur est FACULTATIF DE NAISSANCE (le repli gelé de roll20-fiche.html
    // ne le nomme pas) : sans lui, on le dit et ON NE PROPOSE RIEN qui n'aurait
    // aucun effet — un mod ajouté ici n'aurait ni empreinte ni accord possible.
    if (!moteurMods()) {
      b.appendChild(el("div", "pc-empty",
        "Le moteur de mods n'est pas chargé : les mods du personnage sont conservés tels quels, aucun ne tourne."));
      return b;
    }
    var mods = Array.isArray(state.mods) ? state.mods : [];
    var box = el("div");
    mods.forEach(function (m) { box.appendChild(ligneMod(m)); });
    if (!mods.length) box.appendChild(el("div", "pc-empty", "Aucun mod sur cette fiche personnage."));
    b.appendChild(box);
    var tools = el("div", "pc-comp-tools");
    var line = el("div", "row");
    line.appendChild(miniBtn("Ajouter un mod", "Écrire un mod pour ce personnage", ajouteMod));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }

  // ---------- les modules natifs ----------
  // L'ordre de cette table EST l'ordre par défaut de la fiche : chaque module
  // tombe dans sa colonne, à la suite de ceux déjà déclarés pour elle.
  // buildTop, buildHead et buildEnvoi n'y sont pas : la barre d'outils,
  // l'en-tête et la barre d'envoi ne sont pas des modules, ils encadrent les
  // onglets et ne se déplacent pas.
  //
  // CETTE TABLE NE SE REMANIE JAMAIS : chaque mount() en repart
  // (modules = MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui
  // remplace un module natif le remplacerait pour toujours — même désinstallé,
  // la fiche n'aurait plus l'original à remettre.
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    { id: "caracs",       titre: "CARACTÉRISTIQUES", onglet: "fiche", colonne: "gauche", build: buildCaracs },
    { id: "effort",       titre: "EFFORT ET TEMPS",  onglet: "fiche", colonne: "gauche", build: buildEffort },
    { id: "exposition",   titre: "EXPOSITION",       onglet: "fiche", colonne: "gauche", build: buildExposition },
    { id: "survie",       titre: "SURVIE",           onglet: "fiche", colonne: "gauche", build: buildSurvie },
    { id: "pi",           titre: "INNOCENCE",        onglet: "fiche", colonne: "gauche", build: buildPi },
    // TROIS RÉSERVES, TROIS MODULES : même forme, mais on ne les lit pas au
    // même moment, et elles se déplacent — ou se coupent — l'une sans l'autre.
    { id: "pv",           titre: "PV",               onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "pe",           titre: "PE",               onglet: "fiche", colonne: "milieu", build: buildPe },
    { id: "pm",           titre: "PM",               onglet: "fiche", colonne: "milieu", build: buildPm },
    { id: "mouvement",    titre: "MOUVEMENT",        onglet: "fiche", colonne: "milieu", build: buildMouvement },
    { id: "effondrement", titre: "EFFONDREMENT",     onglet: "fiche", colonne: "milieu", build: buildEffondrement },
    { id: "pc",           titre: "PC",               onglet: "fiche", colonne: "milieu", build: buildPc },
    { id: "contenance",   titre: "CONTENANCE",       onglet: "fiche", colonne: "milieu", build: buildContenance },
    { id: "desaction",    titre: "ACTIONS",          onglet: "fiche", colonne: "droite", build: buildDesAction },
    { id: "attaque",      titre: "ATTAQUES",          onglet: "fiche", colonne: "droite", build: buildAttaque },
    { id: "defense",      titre: "DÉFENSES",         onglet: "fiche", colonne: "droite", build: buildDefense },
    { id: "comps",        titre: "COMPÉTENCES",      onglet: "fiche", colonne: "droite", build: buildComps },
    { id: "recuperation", titre: "RÉCUPÉRATION",     onglet: "fiche", colonne: "droite", build: buildRecuperation },
    { id: "effets", titre: "EFFETS", onglet: "fiche", colonne: "droite", build: buildEffets },
    // ---- onglet Art ----
    // Pleine largeur, seul de son onglet : une technique est une CARTE, avec
    // ses rangs, son coût et son effet. Elle vivait sous les huit blocs de la
    // Fiche, c'est-à-dire là où personne n'allait la chercher.
    { id: "techniques",   titre: "TECHNIQUES",       onglet: "art", colonne: "seule",  build: buildTechniques },
    // ---- onglet Équipement ----
    { id: "inv",          titre: "INVENTAIRE",       onglet: "equipement", colonne: "milieu",    build: buildInv },
    // ---- onglet Bio ----
    // La prose, dans son propre onglet : ce qui se lit ne se met pas devant ce
    // qui se joue, et ces deux zones sont les seules de la fiche qu'on ne
    // consulte pas en combat. « bg » porte le nom de son champ d'état.
    { id: "bg",           titre: "BIO",              onglet: "bio", colonne: "gauche", build: buildBio },
    { id: "avantages",    titre: "AVANTAGES",        onglet: "bio", colonne: "gauche", build: buildAvantages },
    { id: "notes",        titre: "NOTES",            onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // Deux colonnes qui se répondent : à gauche ce qui touche aux valeurs et au
    // dispositif, à droite ce qui touche à la fiche et aux longues listes.
    { id: "jets",         titre: "JETS",             onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",      titre: "FICHE",            onglet: "options", colonne: "droite", build: buildActions },
    { id: "modcaracs",    titre: "RÉGLAGES DES CARACTÉRISTIQUES", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "optcaps",      titre: "RÉGLAGES DES CAPACITÉS", onglet: "options", colonne: "droite", build: buildOptCaps },
    // les points de rupture DISPONIBLES, à forcer : un réglage, pas un geste de jeu
    { id: "rupture",      titre: "RUPTURE",          onglet: "options", colonne: "gauche", build: buildRupture },
    // « Affichage » n'existe que dans Roll20 ; son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",    titre: "AFFICHAGE",        onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "filtres",      titre: "OUTILS DE FILTRE", onglet: "options", colonne: "droite", build: buildFiltres },
    { id: "mods",         titre: "MODS",             onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",      titre: "MODULES",          onglet: "options", colonne: "gauche", build: buildModules },
    { id: "journal",      titre: "JOURNAL",          onglet: "options", colonne: "gauche", build: buildJournal },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondrait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",     titre: "RÉGLAGES DES COMPÉTENCES", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

  // ---------- le moteur de mods ----------
  // owd-mods.js est FACULTATIF DE NAISSANCE, exactement comme owd-migrations.js :
  // sans lui la fiche s'ouvre, simplement sans mods. Il ne touche ni au DOM ni à
  // l'état ; il reçoit la liste des mods et rend un bilan.
  var bilanMods = [];
  function modActifDe(id) {
    var a = true;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) a = m.actif !== false; });
    return a;
  }
  function modDe(id) {
    var out = null;
    ((state && state.mods) || []).forEach(function (m) { if (m && m.id === id) out = m; });
    return out;
  }
  // Ce propriétaire est-il un MOD ? Son id figure alors parmi les mods du
  // personnage, ou dans le bilan du montage précédent — un mod qu'on vient de
  // supprimer n'est plus que là, et c'est justement celui-là qu'il faut
  // reconnaître.
  function propEstUnMod(prop) {
    if (!prop || prop === "?") return false;
    if (prop === PROP_MOD) return true;
    return !!modDe(prop) || !!bilanDeMod(prop);
  }
  // Un mod n'a plus rien à faire tourner dès qu'il quitte le personnage, qu'on
  // le coupe ou qu'on lui retire son accord.
  function modAutorise(prop) {
    var m = modDe(prop);
    if (!m || m.actif === false) return false;
    return avisMod(empreinteMod(m.id, m.src)) === "oui";
  }
  function executeMods() {
    bilanMods = [];
    if (!state || !state.mods || !state.mods.length) return;
    if (!window.OwdMods || typeof window.OwdMods.execute !== "function") return;
    var avant = proprietaireCourant;
    proprietaireCourant = PROP_MOD;
    try {
      var b = window.OwdMods.execute(state.mods, window.Owd, { version: RELEASE, schema: SCHEMA });
      if (Array.isArray(b)) bilanMods = b;
      // Une faute de syntaxe dans un mod ne laissait RIEN dans la console,
      // alors que la page Mods dit d'y regarder en premier. Le message part au
      // même format que les autres ennuis (« [mod:<id>] »), pour qu'un filtre
      // sur « [mod: » ramasse tout ce qui concerne un mod, d'où que ça vienne.
      bilanMods.forEach(function (x) {
        if (!x || x.etat !== "panne") return;
        if (window.console && window.console.warn)
          window.console.warn("[mod:" + x.id + "] en panne : " + (x.message || "sans message"));
      });
    } catch (err) {
      // le moteur lui-même en panne : la fiche s'ouvre quand même, sans mods
      if (window.console && window.console.warn)
        window.console.warn("[mods] moteur en panne : " + messageErreur(err));
    }
    proprietaireCourant = avant;
  }

  // ---------- la disposition enregistrée ----------
  // Les colonnes d'un onglet ne se connaissent qu'en bâtissant son squelette :
  // on le bâtit UNE FOIS À VIDE, dans un élément détaché, plutôt que de
  // recopier ici une liste de colonnes qui dériverait au premier onglet
  // remanié.
  function colonneNormalisee(onglet, colonne) {
    return onglet === "equipement" && ["gauche", "droite", "bas", "seule"].indexOf(colonne) >= 0 ? "milieu" : colonne;
  }
  function colonnesDe(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var noms = {};
    var c = SQUELETTES[onglet](el("div"));
    Object.keys(c || {}).forEach(function (k) { noms[k] = 1; });
    return noms;
  }
  // Les colonnes d'un onglet, DANS L'ORDRE, en distinguant celles qui courent
  // sur toute la largeur. Le squelette les reconnaît lui-même : une colonne
  // pleine largeur rend le PANNEAU au lieu d'une colonne de la grille.
  function squeletteColonnes(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var pane = el("div");
    var c = SQUELETTES[onglet](pane) || {};
    var noms = [], larges = {};
    Object.keys(c).forEach(function (k) {
      noms.push(k);
      if (c[k] === pane) larges[k] = 1;
    });
    return { noms: noms, larges: larges };
  }
  // Une consigne qui ne désigne rien de valide (module inconnu, onglet disparu,
  // colonne qui n'existe plus dans ce squelette) est simplement IGNORÉE : elle
  // laisserait sinon le module hors de la fiche, sans rien pour l'y ramener.
  function appliqueDisposition() {
    modules = modules.map(function (m) {
      var colonne = colonneNormalisee(m.onglet, m.colonne);
      if (colonne === m.colonne) return m;
      var copie = {}; Object.keys(m).forEach(function(k){copie[k]=m[k];});
      copie.colonne = colonne; return copie;
    });
    var d = state && state.modules;
    if (!d || typeof d !== "object") return;
    if (Array.isArray(d.ordre)) ordonne(d.ordre);
    var place = d.place;
    if (!place || typeof place !== "object") return;
    Object.keys(place).forEach(function (id) {
      var p = place[id];
      if (!p || typeof p !== "object") return;
      var i = rangModule(id);
      if (i < 0) return;
      var m = modules[i];
      var onglet = (typeof p.onglet === "string" && aClef(SQUELETTES, p.onglet)) ? p.onglet : m.onglet;
      var cols = colonnesDe(onglet) || {};
      var demandee = colonneNormalisee(onglet, p.colonne);
      var colonne = (typeof demandee === "string" && aClef(cols, demandee)) ? demandee : null;
      // l'onglet change sans que la colonne suive : celle du module n'existe
      // peut-être pas là-bas, on prend alors la première du squelette
      if (!colonne) colonne = aClef(cols, m.colonne) ? m.colonne : Object.keys(cols)[0];
      if (!colonne || (onglet === m.onglet && colonne === m.colonne)) return;
      // COPIE : la table native ne se laisse pas remanier, elle est le seul
      // moyen de rendre à un module sa place d'origine
      var copie = {};
      Object.keys(m).forEach(function (k) { copie[k] = m[k]; });
      copie.onglet = onglet;
      copie.colonne = colonne;
      modules[i] = copie;
    });
  }

  // ---------- le bandeau de consentement ----------
  // Le code d'un mod voyage AVEC le personnage : ouvrir la fiche d'un autre
  // joueur ne doit jamais exécuter son code sans un oui explicite. Ce oui reste
  // dans CE navigateur (le moteur le range), il ne voyage pas — sinon l'auteur
  // consentirait pour tout le monde.
  //
  // LA FICHE S'OUVRE TOUJOURS : un mod en attente ne bloque rien, il ne tourne
  // pas, c'est tout.
  function modsEnAttente() {
    if (!state || !state.mods || !state.mods.length) return [];
    if (!window.OwdMods || typeof window.OwdMods.enAttente !== "function") return [];
    try {
      // MÊME repère qu'executeMods, sans quoi les deux écrans se contredisent :
      // sans version ni schéma, le moteur saute ses contrôles, un mod
      // « pour: 4.0.0 » est annoncé « pas autorisé », le joueur l'autorise, et
      // le bloc Mods lui répond « trop récent » — le oui ainsi arraché dort
      // dans le navigateur et s'appliquerait tout seul le jour de la 4.0.0.
      var a = window.OwdMods.enAttente(state.mods, { version: RELEASE, schema: SCHEMA });
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function examinerMods(attente) {
    var corps = el("div", "pc-modal-body");corps.setAttribute("data-consultation", "1");
    corps.appendChild(el("div", "pc-modal-note",
      "Un mod autorisé tourne dans la page de la fiche, avec les mêmes droits qu'elle : " +
      "il fait ce qu'il veut de ce qui s'y affiche et de ce qui s'y enregistre. " +
      "N'autoriser que du code dont la provenance est sûre."));
    attente.forEach(function (m) {
      var ligne = el("div", "pc-modrow");
      ligne.appendChild(el("span", "nom", m.nom || m.id));
      ligne.appendChild(el("span", "id", m.id));
      corps.appendChild(ligne);
      var ta = el("textarea", "pc-code");
      ta.readOnly = true;
      ta.value = String(m.src == null ? "" : m.src);
      corps.appendChild(ta);
      var boutons = el("div", "row");
      boutons.appendChild(miniBtn("Autoriser", "Ce mod tournera à chaque ouverture, sur ce navigateur",
        function () { decideMod(m.empreinte, "oui"); remount(); }, "primary"));
      boutons.appendChild(miniBtn("Refuser", "Ce mod ne tournera pas ; il reste sur le personnage",
        function () { decideMod(m.empreinte, "non"); remount(); }, "danger"));
      corps.appendChild(boutons);
    });
    dialogue("Mods en attente d'autorisation", corps, function () { remount(); }, "Terminer");
  }
  function bandeauAvis(app) {
    var attente = modsEnAttente();
    if (!attente.length) return;
    var n = attente.length;
    // .pc-avis-mods : le bandeau de CONSENTEMENT, distinct de celui de perte
    // d'enregistrement, qui partage la même mise en forme.
    var av = el("div", "pc-avis pc-avis-mods");av.setAttribute("data-consultation", "1");
    av.appendChild(el("strong", null, "Mods en attente d’autorisation"));
    av.appendChild(el("div", "pc-avis-txt", "Ce personnage contient des mods qui n’ont pas été autorisés sur ce navigateur. Ils restent désactivés."));
    var row = el("div", "row");
    row.appendChild(miniBtn("Examiner les mods", "Lire le code de chaque mod avant de décider",
      function () { examinerMods(attente); }));
    row.appendChild(miniBtn("Tout refuser", "Aucun de ces mods ne tournera sur ce navigateur", function () {
      attente.forEach(function (m) { decideMod(m.empreinte, "non"); });
      remount();
    }, "danger"));
    av.appendChild(row);
    app.appendChild(av);
  }

  // ---------- l'objet public ----------
  // La fiche expose UN objet : c'est par là qu'un mod remplace un module,
  // change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__owdModules est un ALIAS du MÊME objet.
  function recoitEtatCollaboratif(s) {
    if (!s || parseInt(s.v, 10) !== SCHEMA) throw new Error("Schéma distant incompatible : recharger la fiche.");
    s = normalize(s);
    if (JSON.stringify(s) === JSON.stringify(state)) return;
    var changes=Object.keys(state).concat(Object.keys(s).filter(function(k){return !Object.prototype.hasOwnProperty.call(state,k);})).filter(function(k){return JSON.stringify(s[k])!==JSON.stringify(state[k]);});
    if(!changes.length)return;
    var structural={notes:[],background:['bg'],avantages:['avantages'],comps:['comps','optcomps','attaque','defense'],techniques:['techniques'],inv:['inv','attaque','defense','effets'],attaques:['attaque'],defenses:['defense'],combatOptions:['attaque','defense'],combatModifiers:['attaque','defense'],combatAffichage:['attaque','defense'],effetsActifs:['effets','recuperation'],effetsPermanents:['effets','recuperation'],caracs:['caracs'],caracsXp:['caracs'],caracsLeviers:['modcaracs'],capsLeviers:['optcaps'],compsLeviers:['optcomps','comps']};
    var scalar=['name','portrait','age','sexe','genre','espece','taille','xpTotal','etat','effort','temperature','qualiteSommeil','horloge','horlogeDigestion','horlogeExposition','horlogeAlcool','effAlcool','effAlcoolSecondes','effParties','effAutre','effDesactive','effPause','allure','allureCran','desTailles','desUtilises'];
    var oldData=state.modData||{},newData=s.modData||{};
    if(Object.keys(oldData).concat(Object.keys(newData)).every(function(k){return k==='recuperation'||JSON.stringify(oldData[k])===JSON.stringify(newData[k]);}))structural.modData=['recuperation'];
    var targets=[],partial=!modulesPersoActifs()&&changes.every(function(k){return structural[k]||scalar.indexOf(k)>=0;});
    if(partial)changes.forEach(function(k){(structural[k]||[]).forEach(function(id){if(targets.indexOf(id)<0)targets.push(id);});});
    var actif = document.activeElement, focus = null, positions = [];
    function signature(c) { return [c.tagName, c.type || "", c.className, c.getAttribute("placeholder") || "", c.getAttribute("aria-label") || ""].join("|"); }
    function ancre(c) {
      var a = c.closest("[data-sync-entity], [data-id], [data-module]") || rootEl;
      var m = a.closest("[data-module]");
      return { module: m ? m.dataset.module : "",
        entity: a.dataset ? (a.dataset.syncEntity || a.dataset.id || "") : "", el: a };
    }
    if (actif && rootEl && rootEl.contains(actif) && /^(INPUT|TEXTAREA|SELECT)$/.test(actif.tagName)) {
      var a = ancre(actif), sig = signature(actif);
      var semblables = Array.prototype.filter.call(a.el.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === sig; });
      focus = { module: a.module, entity: a.entity, signature: sig, index: semblables.indexOf(actif),
        reserve: actif.dataset.syncReserve || null, value: actif.value, start: actif.selectionStart, end: actif.selectionEnd, direction: actif.selectionDirection, scroll: actif.scrollTop };
    }
    var sx = window.scrollX, sy = window.scrollY;
    Array.prototype.forEach.call(rootEl.querySelectorAll("[data-module]"), function (m) {
      if(partial&&targets.indexOf(m.dataset.module)<0)return;
      Array.prototype.forEach.call(m.querySelectorAll("*"), function (n, i) {
        if (n.scrollTop || n.scrollLeft) positions.push({ module: m.dataset.module, index: i, top: n.scrollTop, left: n.scrollLeft });
      });
    });
    journalTemps=[];
    if(partial){
      changes.forEach(function(k){if(s[k]===undefined)delete state[k];else if(k==='etat'){Object.keys(state.etat).forEach(function(r){if(!(r in s.etat))delete state.etat[r];});Object.assign(state.etat,s.etat);}else state[k]=s[k];});
      reconstruitModules(targets);refresh();
    }else{effVu=null;effMaxVu={};state=s;remount();}
    positions.forEach(function (p) {
      var m = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === p.module; });
      var n = m && m.querySelectorAll("*")[p.index]; if (n) { n.scrollTop = p.top; n.scrollLeft = p.left; }
    });
    if (focus) {
      var scope = rootEl;
      if (focus.module) scope = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === focus.module; });
      if (scope && focus.entity) scope = Array.prototype.find.call(scope.querySelectorAll("[data-sync-entity], [data-id]"), function (n) { return (n.dataset.syncEntity || n.dataset.id) === focus.entity; });
      if (scope) {
        var champs = Array.prototype.filter.call(scope.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === focus.signature; });
        var c = champs[focus.index];
        if (c && !c.disabled) {
          c.focus({ preventScroll: true });
          // Les commandes ± ne sont pas encore dans l'état. Une saisie locale
          // reste aussi sous les doigts pendant la réception d'autres champs.
          c.value = focus.reserve ? courant(focus.reserve) : focus.value;
          try { if (focus.start !== null) c.setSelectionRange(focus.start, focus.end, focus.direction); } catch (e) {}
          c.scrollTop = focus.scroll;
        }
      }
    }
    window.scrollTo(sx, sy);
  }

  window.Owd = {
    __pret: false,
    __afficheVue:function(){monteOnglet(window.__owdVueInventaire?null:curTab());refresh(true);},
    __recoitEtat: recoitEtatCollaboratif,
    __defendreDepuisChat: defenseDepuisChat,
    __montreObjet: montreObjet,
    __actionObjet: actionObjet,
    __objetsTransfert: objetsTransfert,
    __prepareTransfert: prepareTransfert,
    __importeTransfert: importeTransfert,
    __confirmeTransfert: confirmeTransfert,
    __retireTransfert: retireTransfert,
    __annuleTransfert: annuleTransfert,
    // Les deux ne se déduisent pas l'un de l'autre : version porte le suffixe
    // de beta le cas échéant, schema est un entier libre. Un mod qui tirerait
    // le schéma du majeur de la version se tromperait à la première
    // divergence ; OwdMods.lireVersion existe pour ne pas avoir à découper le
    // numéro soi-même.
    version: RELEASE,
    schema: SCHEMA,
    effets: {
      liste: function(){return copieTemps(state.effetsActifs);},
      definitions: function(){return copieTemps(effetsDefinitions());},
      ajoute: function(id,source,cible,duree){var ok=appliqueEffet(id,source,cible,duree);refresh();return ok;},
      retire: function(id){retireEffet(id);refresh();},
      coupRecu: function(){effetCoupRecu();refresh();},
      finTour: function(){effetFinTour();refresh();},
      cout: effetCout,
      accumulation: function(points){return Math.ceil(Math.max(0,num(points,0)) * Math.max(0,1-effetBonus("alterations")/100) - 1e-9);},
      consomme: function(ref,q,cible){var it=state.inv.objets.filter(function(o){return o.ref===ref;})[0];return it?invConsommer(it,q,cible||""):false;}
    },
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    active: activeModule,
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur, en COPIE : vide tant qu'il n'a pas
    // tourné. « actif » vient de l'état (l'interrupteur du joueur), « etat » du
    // moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le
      // module au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, et un mod qui s'y appuie le fait à ses
    // risques. Ils existent parce qu'une sonde qui lirait les valeurs dans le
    // DOM mesurerait la MISE EN FORME autant que le calcul.
    __calculs: {
      caracTotal: caracTotal, caracXp: caracXp, creationDepense: creationDepense,
      limiteRangs: limiteRangs, compRangsComptes: compRangsComptes, techRangsComptes: techRangsComptes,
      compBonus: compBonus, compDes: compDes, compXp: compXp,
      pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
      prMax: prMax, psMax: psMax, phMax: phMax,
      charge: charge, accesRapides: accesRapides, contenance: contenance,
      expoMax: expoMax, effondrement: effondrement, effBasePartie: effBasePartie, effApresEffets: effApresEffets, effPartie: effPartie, effNiveauDe: effNiveauDe,
      poidsPorte: poidsPorte, accesPris: accesPris, contenancePrise: contenancePrise,
      desAction: desAction, ruptureMax: ruptureMax, ruptureDepense: ruptureDepense,
      xpDepense: xpDepense, courant: courant, maxDe: maxDe, autoDe: autoDe,
      confort: confort, defenseTotaux:defenseTotaux, defenseValeurs:defenseValeurs,
      effetBonus:effetBonus, effetAlerte:effetAlerte,
      avancerSecondes:function(n){var t=avancerSecondes(n);refresh();return t;},
      reculerSecondes:function(n){var t=reculerSecondes(n);refresh();return t;},
      epPermis:epPermis, nbEp:nbEp, objetEp:objetEp
    },
    // le registre des filtres, à plat et en copie : nom, propriétaire, fautes
    __filtres: function () {
      var out = [];
      Object.keys(filtres).forEach(function (nom) {
        (filtres[nom] || []).forEach(function (f) {
          out.push({ nom: nom, prop: f.prop, echecs: f.echecs });
        });
      });
      return out;
    }
  };
  window.__owdModules = window.Owd;


  // Les commandes externes ne doivent pas contourner le mode Consultation.
  function gardeCommandeEdition(obj,key){var fn=obj[key];obj[key]=function(){if(window.__owdCanEdit&&!window.__owdCanEdit())return false;return fn.apply(this,arguments);};}
  ['__actionObjet','active','ordonne','__defendreDepuisChat','__prepareTransfert','__importeTransfert','__confirmeTransfert','__retireTransfert','__annuleTransfert'].forEach(function(k){gardeCommandeEdition(window.Owd,k);});
  ['ajoute','retire','coupRecu','finTour','consomme'].forEach(function(k){gardeCommandeEdition(window.Owd.effets,k);});
  ['avancerSecondes','reculerSecondes'].forEach(function(k){gardeCommandeEdition(window.Owd.__calculs,k);});
  // ---------- montage ----------
  // UN MONTAGE NE SE RELANCE JAMAIS DEPUIS LUI-MÊME. Un mod qui finit par
  // Owd.remonte() (geste naturel, et la documentation le donne sans réserve) ou
  // par ctx.reconstruire() rappellerait mount() DEPUIS mount() : les mods
  // repartiraient, redemanderaient un remontage, la pile déborderait, et chaque
  // niveau qui se dépile reprendrait son montage là où il en était. L'onglet
  // gèle, à CHAQUE ouverture puisque le mod voyage avec le personnage, et le
  // joueur n'atteint plus le bloc Mods pour couper le fautif.
  //
  // La demande est donc NOTÉE et honorée UNE SEULE FOIS, le montage courant
  // fini. La garde est ici et pas dans remount() : tout ce qui remonte la fiche
  // passe par mount().
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;
  var REMONTAGES_MAX = 3;
  function mount(root) {
    if (montageEnCours) { remontageDu = true; return; }
    montageEnCours = true;
    var abouti = false;
    try { montage(root); abouti = true; }
    finally {
      montageEnCours = false;
      // un montage tombé en route l'a laissé levé : ce qui s'enregistrerait
      // ensuite serait perdu au lieu d'attendre le montage suivant
      enMontage = false;
      // et il a pu laisser une demande de remontage en l'air : le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Owd.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    remontageNettoyage.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
    modulesDifferes=[];refreshEmpreintes=null;
    rootEl = root;
    enMontage = true;
    // Tous les registres repartent à vide : les anciens pointent sur un DOM qui
    // n'existe plus. Les compteurs de panne aussi — un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    compBox = null;
    invRender = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent à chaque montage. Sans elle,
    // un mod désinstallé garderait pour toujours la place du module natif qu'il
    // avait remplacé, et ses filtres s'empileraient à chaque remontage.
    filtres = {};
    filtresEnCours = {};
    proprietaireCourant = "?";
    modules = MODULES_NATIFS.slice();
    moduleOrdre = [];
    rejoueHorsMontage();
    // les mods d'abord (ils enregistrent modules et filtres), la disposition
    // ensuite : elle peut nommer un module qu'un mod vient d'ajouter
    executeMods();
    // La place D'ORIGINE de chaque module, relevée AVANT qu'appliqueDisposition
    // ne remanie la table : c'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    // La racine porte les jetons de couleur (jour et nuit) : c'est sur elle que
    // dialogue() accroche ses modales. Le mot « atelier » est réservé au Nen
    // par consigne du dépôt — ici, c'est « perso-fiche », le même mot que l'id
    // GELÉ de roll20-fiche.html.
    var app = el("div", "perso-fiche");
    appEl = app;

    if (!window.__owdVueInventaire) buildTop(app);
    bandeauAvis(app);
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    if (window.__owdVueInventaire) {
      app.classList.add("pc-inventaire-seul");
      if (window.__owdVueNotes) app.classList.add("pc-notes-seul");
      monteModules({inventoryRoot: sheet, onlyModule: window.__owdVueNotes ? "notes" : window.__owdVueAttaques ? "attaque" : window.__owdVueDefenses ? "defense" : "inv"});
    } else {
      buildHead(sheet);
      monteModules(buildTabs(sheet));
    }
    enMontage = false;   // ce qui s'enregistre après (console) vaut pour le montage suivant
    refresh();
  }

  // CHARGER LES DONNÉES ET MONTER SONT DEUX PANNES DIFFÉRENTES, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait le fichier de données d'une
  // faute qui n'était pas la sienne — et data-ready interdisant le réessai, la
  // fiche restait close sur un message faux. Chacun son filet.
  function demarre(root) {
    state = load() || blank();
    try { mount(root); window.Owd.__pret = true; }
    catch (e) {
      if (window.console && window.console.error) window.console.error("[fiche] montage", e);
      if(window.__owdOpenFailure){window.__owdOpenFailure('program');return;}
      root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu se monter (' +
        messageErreur(e) + "). Les données, elles, sont chargées : la cause est dans la fiche ou dans un mod.</p>";
    }
  }
  function init() {
    // « perso-fiche » : le mot est GELÉ par roll20-fiche.html, que la coquille
    // signée charge en dur. Les deux côtés doivent dire le même mot.
    var root = document.getElementById("perso-fiche");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__owdOnTake = function (payload) {
      if(!ficheModifiable())return false;
      if (!state) { flash("La fiche n'est pas encore prête : recliquer « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = decodeRuntimeData(d); })
      .catch(function (e) {
        if(window.__owdOpenFailure){window.__owdOpenFailure('files');return;}
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu charger ses données (' +
          e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
