/*! markdown-it 14.1.0 https://github.com/markdown-it/markdown-it @license MIT */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).markdownit=e()}(this,(function(){"use strict";const t={};function e(r,n){"string"!=typeof n&&(n=e.defaultChars);const s=function(e){let r=t[e];if(r)return r;r=t[e]=[];for(let t=0;t<128;t++){const e=String.fromCharCode(t);r.push(e)}for(let t=0;t<e.length;t++){const n=e.charCodeAt(t);r[n]="%"+("0"+n.toString(16).toUpperCase()).slice(-2)}return r}(n);return r.replace(/(%[a-f0-9]{2})+/gi,(function(t){let e="";for(let r=0,n=t.length;r<n;r+=3){const i=parseInt(t.slice(r+1,r+3),16);if(i<128)e+=s[i];else{if(192==(224&i)&&r+3<n){const n=parseInt(t.slice(r+4,r+6),16);if(128==(192&n)){const t=i<<6&1984|63&n;e+=t<128?"\ufffd\ufffd":String.fromCharCode(t),r+=3;continue}}if(224==(240&i)&&r+6<n){const n=parseInt(t.slice(r+4,r+6),16),s=parseInt(t.slice(r+7,r+9),16);if(128==(192&n)&&128==(192&s)){const t=i<<12&61440|n<<6&4032|63&s;e+=t<2048||t>=55296&&t<=57343?"\ufffd\ufffd\ufffd":String.fromCharCode(t),r+=6;continue}}if(240==(248&i)&&r+9<n){const n=parseInt(t.slice(r+4,r+6),16),s=parseInt(t.slice(r+7,r+9),16),o=parseInt(t.slice(r+10,r+12),16);if(128==(192&n)&&128==(192&s)&&128==(192&o)){let t=i<<18&1835008|n<<12&258048|s<<6&4032|63&o;t<65536||t>1114111?e+="\ufffd\ufffd\ufffd\ufffd":(t-=65536,e+=String.fromCharCode(55296+(t>>10),56320+(1023&t))),r+=9;continue}}e+="\ufffd"}}return e}))}e.defaultChars=";/?:@&=+$,#",e.componentChars="";const r={};function n(t,e,s){"string"!=typeof e&&(s=e,e=n.defaultChars),void 0===s&&(s=!0);const i=function(t){let e=r[t];if(e)return e;e=r[t]=[];for(let t=0;t<128;t++){const r=String.fromCharCode(t);/^[0-9a-z]$/i.test(r)?e.push(r):e.push("%"+("0"+t.toString(16).toUpperCase()).slice(-2))}for(let r=0;r<t.length;r++)e[t.charCodeAt(r)]=t[r];return e}(e);let o="";for(let e=0,r=t.length;e<r;e++){const n=t.charCodeAt(e);if(s&&37===n&&e+2<r&&/^[0-9a-f]{2}$/i.test(t.slice(e+1,e+3)))o+=t.slice(e,e+3),e+=2;else if(n<128)o+=i[n];else if(n>=55296&&n<=57343){if(n>=55296&&n<=56319&&e+1<r){const r=t.charCodeAt(e+1);if(r>=56320&&r<=57343){o+=encodeURIComponent(t[e]+t[e+1]),e++;continue}}o+="%EF%BF%BD"}else o+=encodeURIComponent(t[e])}return o}function s(t){let e="";return e+=t.protocol||"",e+=t.slashes?"//":"",e+=t.auth?t.auth+"@":"",t.hostname&&-1!==t.hostname.indexOf(":")?e+="["+t.hostname+"]":e+=t.hostname||"",e+=t.port?":"+t.port:"",e+=t.pathname||"",e+=t.search||"",e+=t.hash||"",e}function i(){this.protocol=null,this.slashes=null,this.auth=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.pathname=null}n.defaultChars=";/?:@&=+$,-_.!~*'()#",n.componentChars="-_.!~*'()";const o=/^([a-z0-9.+-]+:)/i,u=/:[0-9]*$/,c=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,a=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),l=["'"].concat(a),h=["%","/","?",";","#"].concat(l),p=["/","?","#"],f=/^[+a-z0-9A-Z_-]{0,63}$/,d=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,_={javascript:!0,"javascript:":!0},m={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function g(t,e){if(t&&t instanceof i)return t;const r=new i;return r.parse(t,e),r}i.prototype.parse=function(t,e){let r,n,s,i=t;if(i=i.trim(),!e&&1===t.split("#").length){const t=c.exec(i);if(t)return this.pathname=t[1],t[2]&&(this.search=t[2]),this}let u=o.exec(i);if(u&&(u=u[0],r=u.toLowerCase(),this.protocol=u,i=i.substr(u.length)),(e||u||i.match(/^\/\/[^@\/]+@[^@\/]+/))&&(s="//"===i.substr(0,2),!s||u&&_[u]||(i=i.substr(2),this.slashes=!0)),!_[u]&&(s||u&&!m[u])){let t,e,r=-1;for(let t=0;t<p.length;t++)n=i.indexOf(p[t]),-1!==n&&(-1===r||n<r)&&(r=n);e=-1===r?i.lastIndexOf("@"):i.lastIndexOf("@",r),-1!==e&&(t=i.slice(0,e),i=i.slice(e+1),this.auth=t),r=-1;for(let t=0;t<h.length;t++)n=i.indexOf(h[t]),-1!==n&&(-1===r||n<r)&&(r=n);-1===r&&(r=i.length),":"===i[r-1]&&r--;const s=i.slice(0,r);i=i.slice(r),this.parseHost(s),this.hostname=this.hostname||"";const o="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!o){const t=this.hostname.split(/\./);for(let e=0,r=t.length;e<r;e++){const r=t[e];if(r&&!r.match(f)){let n="";for(let t=0,e=r.length;t<e;t++)r.charCodeAt(t)>127?n+="x":n+=r[t];if(!n.match(f)){const n=t.slice(0,e),s=t.slice(e+1),o=r.match(d);o&&(n.push(o[1]),s.unshift(o[2])),s.length&&(i=s.join(".")+i),this.hostname=n.join(".");break}}}}this.hostname.length>255&&(this.hostname=""),o&&(this.hostname=this.hostname.substr(1,this.hostname.length-2))}const a=i.indexOf("#");-1!==a&&(this.hash=i.substr(a),i=i.slice(0,a));const l=i.indexOf("?");return-1!==l&&(this.search=i.substr(l),i=i.slice(0,l)),i&&(this.pathname=i),m[r]&&this.hostname&&!this.pathname&&(this.pathname=""),this},i.prototype.parseHost=function(t){let e=u.exec(t);e&&(e=e[0],":"!==e&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};var k,D=Object.freeze({__proto__:null,decode:e,encode:n,format:s,parse:g}),C=/[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,y=/[\0-\x1F\x7F-\x9F]/,E=/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,A=/[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/,b=/[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,F=Object.freeze({__proto__:null,Any:C,Cc:y,Cf:/[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,P:E,S:A,Z:b}),x=new Uint16Array('\u1d41<\xd5\u0131\u028a\u049d\u057b\u05d0\u0675\u06de\u07a2\u07d6\u080f\u0a4a\u0a91\u0da1\u0e6d\u0f09\u0f26\u10ca\u1228\u12e1\u1415\u149d\u14c3\u14df\u1525\0\0\0\0\0\0\u156b\u16cd\u198d\u1c12\u1ddd\u1f7e\u2060\u21b0\u228d\u23c0\u23fb\u2442\u2824\u2912\u2d08\u2e48\u2fce\u3016\u32ba\u3639\u37ac\u38fe\u3a28\u3a71\u3ae0\u3b2e\u0800EMabcfglmnoprstu\\bfms\x7f\x84\x8b\x90\x95\x98\xa6\xb3\xb9\xc8\xcflig\u803b\xc6\u40c6P\u803b&\u4026cute\u803b\xc1\u40c1reve;\u4102\u0100iyx}rc\u803b\xc2\u40c2;\u4410r;\uc000\ud835\udd04rave\u803b\xc0\u40c0pha;\u4391acr;\u4100d;\u6a53\u0100gp\x9d\xa1on;\u4104f;\uc000\ud835\udd38plyFunction;\u6061ing\u803b\xc5\u40c5\u0100cs\xbe\xc3r;\uc000\ud835\udc9cign;\u6254ilde\u803b\xc3\u40c3ml\u803b\xc4\u40c4\u0400aceforsu\xe5\xfb\xfe\u0117\u011c\u0122\u0127\u012a\u0100cr\xea\xf2kslash;\u6216\u0176\xf6\xf8;\u6ae7ed;\u6306y;\u4411\u0180crt\u0105\u010b\u0114ause;\u6235noullis;\u612ca;\u4392r;\uc000\ud835\udd05pf;\uc000\ud835\udd39eve;\u42d8c\xf2\u0113mpeq;\u624e\u0700HOacdefhilorsu\u014d\u0151\u0156\u0180\u019e\u01a2\u01b5\u01b7\u01ba\u01dc\u0215\u0273\u0278\u027ecy;\u4427PY\u803b\xa9\u40a9\u0180cpy\u015d\u0162\u017aute;\u4106\u0100;i\u0167\u0168\u62d2talDifferentialD;\u6145leys;\u612d\u0200aeio\u0189\u018e\u0194\u0198ron;\u410cdil\u803b\xc7\u40c7rc;\u4108nint;\u6230ot;\u410a\u0100dn\u01a7\u01adilla;\u40b8terDot;\u40b7\xf2\u017fi;\u43a7rcle\u0200DMPT\u01c7\u01cb\u01d1\u01d6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01e2\u01f8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020foubleQuote;\u601duote;\u6019\u0200lnpu\u021e\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6a74\u0180git\u022f\u0236\u023aruent;\u6261nt;\u622fourIntegral;\u622e\u0100fr\u024c\u024e;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6a2fcr;\uc000\ud835\udc9ep\u0100;C\u0284\u0285\u62d3ap;\u624d\u0580DJSZacefios\u02a0\u02ac\u02b0\u02b4\u02b8\u02cb\u02d7\u02e1\u02e6\u0333\u048d\u0100;o\u0179\u02a5trahd;\u6911cy;\u4402cy;\u4405cy;\u440f\u0180grs\u02bf\u02c4\u02c7ger;\u6021r;\u61a1hv;\u6ae4\u0100ay\u02d0\u02d5ron;\u410e;\u4414l\u0100;t\u02dd\u02de\u6207a;\u4394r;\uc000\ud835\udd07\u0100af\u02eb\u0327\u0100cm\u02f0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031ccute;\u40b4o\u0174\u030b\u030d;\u42d9bleAcute;\u42ddrave;\u4060ilde;\u42dcond;\u62c4ferentialD;\u6146\u0470\u033d\0\0\0\u0342\u0354\0\u0405f;\uc000\ud835\udd3b\u0180;DE\u0348\u0349\u034d\u40a8ot;\u60dcqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03cf\u03e2\u03f8ontourIntegra\xec\u0239o\u0274\u0379\0\0\u037b\xbb\u0349nArrow;\u61d3\u0100eo\u0387\u03a4ft\u0180ART\u0390\u0396\u03a1rrow;\u61d0ightArrow;\u61d4e\xe5\u02cang\u0100LR\u03ab\u03c4eft\u0100AR\u03b3\u03b9rrow;\u67f8ightArrow;\u67faightArrow;\u67f9ight\u0100AT\u03d8\u03derrow;\u61d2ee;\u62a8p\u0241\u03e9\0\0\u03efrrow;\u61d1ownArrow;\u61d5erticalBar;\u6225n\u0300ABLRTa\u0412\u042a\u0430\u045e\u047f\u037crrow\u0180;BU\u041d\u041e\u0422\u6193ar;\u6913pArrow;\u61f5reve;\u4311eft\u02d2\u043a\0\u0446\0\u0450ightVector;\u6950eeVector;\u695eector\u0100;B\u0459\u045a\u61bdar;\u6956ight\u01d4\u0467\0\u0471eeVector;\u695fector\u0100;B\u047a\u047b\u61c1ar;\u6957ee\u0100;A\u0486\u0487\u62a4rrow;\u61a7\u0100ct\u0492\u0497r;\uc000\ud835\udc9frok;\u4110\u0800NTacdfglmopqstux\u04bd\u04c0\u04c4\u04cb\u04de\u04e2\u04e7\u04ee\u04f5\u0521\u052f\u0536\u0552\u055d\u0560\u0565G;\u414aH\u803b\xd0\u40d0cute\u803b\xc9\u40c9\u0180aiy\u04d2\u04d7\u04dcron;\u411arc\u803b\xca\u40ca;\u442dot;\u4116r;\uc000\ud835\udd08rave\u803b\xc8\u40c8ement;\u6208\u0100ap\u04fa\u04fecr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65fberySmallSquare;\u65ab\u0100gp\u0526\u052aon;\u4118f;\uc000\ud835\udd3csilon;\u4395u\u0100ai\u053c\u0549l\u0100;T\u0542\u0543\u6a75ilde;\u6242librium;\u61cc\u0100ci\u0557\u055ar;\u6130m;\u6a73a;\u4397ml\u803b\xcb\u40cb\u0100ip\u056a\u056fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058d\u05b2\u05ccy;\u4424r;\uc000\ud835\udd09lled\u0253\u0597\0\0\u05a3mallSquare;\u65fcerySmallSquare;\u65aa\u0370\u05ba\0\u05bf\0\0\u05c4f;\uc000\ud835\udd3dAll;\u6200riertrf;\u6131c\xf2\u05cb\u0600JTabcdfgorst\u05e8\u05ec\u05ef\u05fa\u0600\u0612\u0616\u061b\u061d\u0623\u066c\u0672cy;\u4403\u803b>\u403emma\u0100;d\u05f7\u05f8\u4393;\u43dcreve;\u411e\u0180eiy\u0607\u060c\u0610dil;\u4122rc;\u411c;\u4413ot;\u4120r;\uc000\ud835\udd0a;\u62d9pf;\uc000\ud835\udd3eeater\u0300EFGLST\u0635\u0644\u064e\u0656\u065b\u0666qual\u0100;L\u063e\u063f\u6265ess;\u62dbullEqual;\u6267reater;\u6aa2ess;\u6277lantEqual;\u6a7eilde;\u6273cr;\uc000\ud835\udca2;\u626b\u0400Aacfiosu\u0685\u068b\u0696\u069b\u069e\u06aa\u06be\u06caRDcy;\u442a\u0100ct\u0690\u0694ek;\u42c7;\u405eirc;\u4124r;\u610clbertSpace;\u610b\u01f0\u06af\0\u06b2f;\u610dizontalLine;\u6500\u0100ct\u06c3\u06c5\xf2\u06a9rok;\u4126mp\u0144\u06d0\u06d8ownHum\xf0\u012fqual;\u624f\u0700EJOacdfgmnostu\u06fa\u06fe\u0703\u0707\u070e\u071a\u071e\u0721\u0728\u0744\u0778\u078b\u078f\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803b\xcd\u40cd\u0100iy\u0713\u0718rc\u803b\xce\u40ce;\u4418ot;\u4130r;\u6111rave\u803b\xcc\u40cc\u0180;ap\u0720\u072f\u073f\u0100cg\u0734\u0737r;\u412ainaryI;\u6148lie\xf3\u03dd\u01f4\u0749\0\u0762\u0100;e\u074d\u074e\u622c\u0100gr\u0753\u0758ral;\u622bsection;\u62c2isible\u0100CT\u076c\u0772omma;\u6063imes;\u6062\u0180gpt\u077f\u0783\u0788on;\u412ef;\uc000\ud835\udd40a;\u4399cr;\u6110ilde;\u4128\u01eb\u079a\0\u079ecy;\u4406l\u803b\xcf\u40cf\u0280cfosu\u07ac\u07b7\u07bc\u07c2\u07d0\u0100iy\u07b1\u07b5rc;\u4134;\u4419r;\uc000\ud835\udd0dpf;\uc000\ud835\udd41\u01e3\u07c7\0\u07ccr;\uc000\ud835\udca5rcy;\u4408kcy;\u4404\u0380HJacfos\u07e4\u07e8\u07ec\u07f1\u07fd\u0802\u0808cy;\u4425cy;\u440cppa;\u439a\u0100ey\u07f6\u07fbdil;\u4136;\u441ar;\uc000\ud835\udd0epf;\uc000\ud835\udd42cr;\uc000\ud835\udca6\u0580JTaceflmost\u0825\u0829\u082c\u0850\u0863\u09b3\u09b8\u09c7\u09cd\u0a37\u0a47cy;\u4409\u803b<\u403c\u0280cmnpr\u0837\u083c\u0841\u0844\u084dute;\u4139bda;\u439bg;\u67ealacetrf;\u6112r;\u619e\u0180aey\u0857\u085c\u0861ron;\u413ddil;\u413b;\u441b\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087e\u08a9\u08b1\u08e0\u08e6\u08fc\u092f\u095b\u0390\u096a\u0100nr\u0883\u088fgleBracket;\u67e8row\u0180;BR\u0899\u089a\u089e\u6190ar;\u61e4ightArrow;\u61c6eiling;\u6308o\u01f5\u08b7\0\u08c3bleBracket;\u67e6n\u01d4\u08c8\0\u08d2eeVector;\u6961ector\u0100;B\u08db\u08dc\u61c3ar;\u6959loor;\u630aight\u0100AV\u08ef\u08f5rrow;\u6194ector;\u694e\u0100er\u0901\u0917e\u0180;AV\u0909\u090a\u0910\u62a3rrow;\u61a4ector;\u695aiangle\u0180;BE\u0924\u0925\u0929\u62b2ar;\u69cfqual;\u62b4p\u0180DTV\u0937\u0942\u094cownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61bfar;\u6958ector\u0100;B\u0965\u0966\u61bcar;\u6952ight\xe1\u039cs\u0300EFGLST\u097e\u098b\u0995\u099d\u09a2\u09adqualGreater;\u62daullEqual;\u6266reater;\u6276ess;\u6aa1lantEqual;\u6a7dilde;\u6272r;\uc000\ud835\udd0f\u0100;e\u09bd\u09be\u62d8ftarrow;\u61daidot;\u413f\u0180npw\u09d4\u0a16\u0a1bg\u0200LRlr\u09de\u09f7\u0a02\u0a10eft\u0100AR\u09e6\u09ecrrow;\u67f5ightArrow;\u67f7ightArrow;\u67f6eft\u0100ar\u03b3\u0a0aight\xe1\u03bfight\xe1\u03caf;\uc000\ud835\udd43er\u0100LR\u0a22\u0a2ceftArrow;\u6199ightArrow;\u6198\u0180cht\u0a3e\u0a40\u0a42\xf2\u084c;\u61b0rok;\u4141;\u626a\u0400acefiosu\u0a5a\u0a5d\u0a60\u0a77\u0a7c\u0a85\u0a8b\u0a8ep;\u6905y;\u441c\u0100dl\u0a65\u0a6fiumSpace;\u605flintrf;\u6133r;\uc000\ud835\udd10nusPlus;\u6213pf;\uc000\ud835\udd44c\xf2\u0a76;\u439c\u0480Jacefostu\u0aa3\u0aa7\u0aad\u0ac0\u0b14\u0b19\u0d91\u0d97\u0d9ecy;\u440acute;\u4143\u0180aey\u0ab4\u0ab9\u0aberon;\u4147dil;\u4145;\u441d\u0180gsw\u0ac7\u0af0\u0b0eative\u0180MTV\u0ad3\u0adf\u0ae8ediumSpace;\u600bhi\u0100cn\u0ae6\u0ad8\xeb\u0ad9eryThi\xee\u0ad9ted\u0100GL\u0af8\u0b06reaterGreate\xf2\u0673essLes\xf3\u0a48Line;\u400ar;\uc000\ud835\udd11\u0200Bnpt\u0b22\u0b28\u0b37\u0b3areak;\u6060BreakingSpace;\u40a0f;\u6115\u0680;CDEGHLNPRSTV\u0b55\u0b56\u0b6a\u0b7c\u0ba1\u0beb\u0c04\u0c5e\u0c84\u0ca6\u0cd8\u0d61\u0d85\u6aec\u0100ou\u0b5b\u0b64ngruent;\u6262pCap;\u626doubleVerticalBar;\u6226\u0180lqx\u0b83\u0b8a\u0b9bement;\u6209ual\u0100;T\u0b92\u0b93\u6260ilde;\uc000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0bb6\u0bb7\u0bbd\u0bc9\u0bd3\u0bd8\u0be5\u626fqual;\u6271ullEqual;\uc000\u2267\u0338reater;\uc000\u226b\u0338ess;\u6279lantEqual;\uc000\u2a7e\u0338ilde;\u6275ump\u0144\u0bf2\u0bfdownHump;\uc000\u224e\u0338qual;\uc000\u224f\u0338e\u0100fs\u0c0a\u0c27tTriangle\u0180;BE\u0c1a\u0c1b\u0c21\u62eaar;\uc000\u29cf\u0338qual;\u62ecs\u0300;EGLST\u0c35\u0c36\u0c3c\u0c44\u0c4b\u0c58\u626equal;\u6270reater;\u6278ess;\uc000\u226a\u0338lantEqual;\uc000\u2a7d\u0338ilde;\u6274ested\u0100GL\u0c68\u0c79reaterGreater;\uc000\u2aa2\u0338essLess;\uc000\u2aa1\u0338recedes\u0180;ES\u0c92\u0c93\u0c9b\u6280qual;\uc000\u2aaf\u0338lantEqual;\u62e0\u0100ei\u0cab\u0cb9verseElement;\u620cghtTriangle\u0180;BE\u0ccb\u0ccc\u0cd2\u62ebar;\uc000\u29d0\u0338qual;\u62ed\u0100qu\u0cdd\u0d0cuareSu\u0100bp\u0ce8\u0cf9set\u0100;E\u0cf0\u0cf3\uc000\u228f\u0338qual;\u62e2erset\u0100;E\u0d03\u0d06\uc000\u2290\u0338qual;\u62e3\u0180bcp\u0d13\u0d24\u0d4eset\u0100;E\u0d1b\u0d1e\uc000\u2282\u20d2qual;\u6288ceeds\u0200;EST\u0d32\u0d33\u0d3b\u0d46\u6281qual;\uc000\u2ab0\u0338lantEqual;\u62e1ilde;\uc000\u227f\u0338erset\u0100;E\u0d58\u0d5b\uc000\u2283\u20d2qual;\u6289ilde\u0200;EFT\u0d6e\u0d6f\u0d75\u0d7f\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uc000\ud835\udca9ilde\u803b\xd1\u40d1;\u439d\u0700Eacdfgmoprstuv\u0dbd\u0dc2\u0dc9\u0dd5\u0ddb\u0de0\u0de7\u0dfc\u0e02\u0e20\u0e22\u0e32\u0e3f\u0e44lig;\u4152cute\u803b\xd3\u40d3\u0100iy\u0dce\u0dd3rc\u803b\xd4\u40d4;\u441eblac;\u4150r;\uc000\ud835\udd12rave\u803b\xd2\u40d2\u0180aei\u0dee\u0df2\u0df6cr;\u414cga;\u43a9cron;\u439fpf;\uc000\ud835\udd46enCurly\u0100DQ\u0e0e\u0e1aoubleQuote;\u601cuote;\u6018;\u6a54\u0100cl\u0e27\u0e2cr;\uc000\ud835\udcaaash\u803b\xd8\u40d8i\u016c\u0e37\u0e3cde\u803b\xd5\u40d5es;\u6a37ml\u803b\xd6\u40d6er\u0100BP\u0e4b\u0e60\u0100ar\u0e50\u0e53r;\u603eac\u0100ek\u0e5a\u0e5c;\u63deet;\u63b4arenthesis;\u63dc\u0480acfhilors\u0e7f\u0e87\u0e8a\u0e8f\u0e92\u0e94\u0e9d\u0eb0\u0efcrtialD;\u6202y;\u441fr;\uc000\ud835\udd13i;\u43a6;\u43a0usMinus;\u40b1\u0100ip\u0ea2\u0eadncareplan\xe5\u069df;\u6119\u0200;eio\u0eb9\u0eba\u0ee0\u0ee4\u6abbcedes\u0200;EST\u0ec8\u0ec9\u0ecf\u0eda\u627aqual;\u6aaflantEqual;\u627cilde;\u627eme;\u6033\u0100dp\u0ee9\u0eeeuct;\u620fortion\u0100;a\u0225\u0ef9l;\u621d\u0100ci\u0f01\u0f06r;\uc000\ud835\udcab;\u43a8\u0200Ufos\u0f11\u0f16\u0f1b\u0f1fOT\u803b"\u4022r;\uc000\ud835\udd14pf;\u611acr;\uc000\ud835\udcac\u0600BEacefhiorsu\u0f3e\u0f43\u0f47\u0f60\u0f73\u0fa7\u0faa\u0fad\u1096\u10a9\u10b4\u10bearr;\u6910G\u803b\xae\u40ae\u0180cnr\u0f4e\u0f53\u0f56ute;\u4154g;\u67ebr\u0100;t\u0f5c\u0f5d\u61a0l;\u6916\u0180aey\u0f67\u0f6c\u0f71ron;\u4158dil;\u4156;\u4420\u0100;v\u0f78\u0f79\u611cerse\u0100EU\u0f82\u0f99\u0100lq\u0f87\u0f8eement;\u620builibrium;\u61cbpEquilibrium;\u696fr\xbb\u0f79o;\u43a1ght\u0400ACDFTUVa\u0fc1\u0feb\u0ff3\u1022\u1028\u105b\u1087\u03d8\u0100nr\u0fc6\u0fd2gleBracket;\u67e9row\u0180;BL\u0fdc\u0fdd\u0fe1\u6192ar;\u61e5eftArrow;\u61c4eiling;\u6309o\u01f5\u0ff9\0\u1005bleBracket;\u67e7n\u01d4\u100a\0\u1014eeVector;\u695dector\u0100;B\u101d\u101e\u61c2ar;\u6955loor;\u630b\u0100er\u102d\u1043e\u0180;AV\u1035\u1036\u103c\u62a2rrow;\u61a6ector;\u695biangle\u0180;BE\u1050\u1051\u1055\u62b3ar;\u69d0qual;\u62b5p\u0180DTV\u1063\u106e\u1078ownVector;\u694feeVector;\u695cector\u0100;B\u1082\u1083\u61bear;\u6954ector\u0100;B\u1091\u1092\u61c0ar;\u6953\u0100pu\u109b\u109ef;\u611dndImplies;\u6970ightarrow;\u61db\u0100ch\u10b9\u10bcr;\u611b;\u61b1leDelayed;\u69f4\u0680HOacfhimoqstu\u10e4\u10f1\u10f7\u10fd\u1119\u111e\u1151\u1156\u1161\u1167\u11b5\u11bb\u11bf\u0100Cc\u10e9\u10eeHcy;\u4429y;\u4428FTcy;\u442ccute;\u415a\u0280;aeiy\u1108\u1109\u110e\u1113\u1117\u6abcron;\u4160dil;\u415erc;\u415c;\u4421r;\uc000\ud835\udd16ort\u0200DLRU\u112a\u1134\u113e\u1149ownArrow\xbb\u041eeftArrow\xbb\u089aightArrow\xbb\u0fddpArrow;\u6191gma;\u43a3allCircle;\u6218pf;\uc000\ud835\udd4a\u0272\u116d\0\0\u1170t;\u621aare\u0200;ISU\u117b\u117c\u1189\u11af\u65a1ntersection;\u6293u\u0100bp\u118f\u119eset\u0100;E\u1197\u1198\u628fqual;\u6291erset\u0100;E\u11a8\u11a9\u6290qual;\u6292nion;\u6294cr;\uc000\ud835\udcaear;\u62c6\u0200bcmp\u11c8\u11db\u1209\u120b\u0100;s\u11cd\u11ce\u62d0et\u0100;E\u11cd\u11d5qual;\u6286\u0100ch\u11e0\u1205eeds\u0200;EST\u11ed\u11ee\u11f4\u11ff\u627bqual;\u6ab0lantEqual;\u627dilde;\u627fTh\xe1\u0f8c;\u6211\u0180;es\u1212\u1213\u1223\u62d1rset\u0100;E\u121c\u121d\u6283qual;\u6287et\xbb\u1213\u0580HRSacfhiors\u123e\u1244\u1249\u1255\u125e\u1271\u1276\u129f\u12c2\u12c8\u12d1ORN\u803b\xde\u40deADE;\u6122\u0100Hc\u124e\u1252cy;\u440by;\u4426\u0100bu\u125a\u125c;\u4009;\u43a4\u0180aey\u1265\u126a\u126fron;\u4164dil;\u4162;\u4422r;\uc000\ud835\udd17\u0100ei\u127b\u1289\u01f2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128e\u1298kSpace;\uc000\u205f\u200aSpace;\u6009lde\u0200;EFT\u12ab\u12ac\u12b2\u12bc\u623cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uc000\ud835\udd4bipleDot;\u60db\u0100ct\u12d6\u12dbr;\uc000\ud835\udcafrok;\u4166\u0ae1\u12f7\u130e\u131a\u1326\0\u132c\u1331\0\0\0\0\0\u1338\u133d\u1377\u1385\0\u13ff\u1404\u140a\u1410\u0100cr\u12fb\u1301ute\u803b\xda\u40dar\u0100;o\u1307\u1308\u619fcir;\u6949r\u01e3\u1313\0\u1316y;\u440eve;\u416c\u0100iy\u131e\u1323rc\u803b\xdb\u40db;\u4423blac;\u4170r;\uc000\ud835\udd18rave\u803b\xd9\u40d9acr;\u416a\u0100di\u1341\u1369er\u0100BP\u1348\u135d\u0100ar\u134d\u1350r;\u405fac\u0100ek\u1357\u1359;\u63dfet;\u63b5arenthesis;\u63ddon\u0100;P\u1370\u1371\u62c3lus;\u628e\u0100gp\u137b\u137fon;\u4172f;\uc000\ud835\udd4c\u0400ADETadps\u1395\u13ae\u13b8\u13c4\u03e8\u13d2\u13d7\u13f3rrow\u0180;BD\u1150\u13a0\u13a4ar;\u6912ownArrow;\u61c5ownArrow;\u6195quilibrium;\u696eee\u0100;A\u13cb\u13cc\u62a5rrow;\u61a5own\xe1\u03f3er\u0100LR\u13de\u13e8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13f9\u13fa\u43d2on;\u43a5ing;\u416ecr;\uc000\ud835\udcb0ilde;\u4168ml\u803b\xdc\u40dc\u0480Dbcdefosv\u1427\u142c\u1430\u1433\u143e\u1485\u148a\u1490\u1496ash;\u62abar;\u6aeby;\u4412ash\u0100;l\u143b\u143c\u62a9;\u6ae6\u0100er\u1443\u1445;\u62c1\u0180bty\u144c\u1450\u147aar;\u6016\u0100;i\u144f\u1455cal\u0200BLST\u1461\u1465\u146a\u1474ar;\u6223ine;\u407ceparator;\u6758ilde;\u6240ThinSpace;\u600ar;\uc000\ud835\udd19pf;\uc000\ud835\udd4dcr;\uc000\ud835\udcb1dash;\u62aa\u0280cefos\u14a7\u14ac\u14b1\u14b6\u14bcirc;\u4174dge;\u62c0r;\uc000\ud835\udd1apf;\uc000\ud835\udd4ecr;\uc000\ud835\udcb2\u0200fios\u14cb\u14d0\u14d2\u14d8r;\uc000\ud835\udd1b;\u439epf;\uc000\ud835\udd4fcr;\uc000\ud835\udcb3\u0480AIUacfosu\u14f1\u14f5\u14f9\u14fd\u1504\u150f\u1514\u151a\u1520cy;\u442fcy;\u4407cy;\u442ecute\u803b\xdd\u40dd\u0100iy\u1509\u150drc;\u4176;\u442br;\uc000\ud835\udd1cpf;\uc000\ud835\udd50cr;\uc000\ud835\udcb4ml;\u4178\u0400Hacdefos\u1535\u1539\u153f\u154b\u154f\u155d\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417d;\u4417ot;\u417b\u01f2\u1554\0\u155boWidt\xe8\u0ad9a;\u4396r;\u6128pf;\u6124cr;\uc000\ud835\udcb5\u0be1\u1583\u158a\u1590\0\u15b0\u15b6\u15bf\0\0\0\0\u15c6\u15db\u15eb\u165f\u166d\0\u1695\u169b\u16b2\u16b9\0\u16becute\u803b\xe1\u40e1reve;\u4103\u0300;Ediuy\u159c\u159d\u15a1\u15a3\u15a8\u15ad\u623e;\uc000\u223e\u0333;\u623frc\u803b\xe2\u40e2te\u80bb\xb4\u0306;\u4430lig\u803b\xe6\u40e6\u0100;r\xb2\u15ba;\uc000\ud835\udd1erave\u803b\xe0\u40e0\u0100ep\u15ca\u15d6\u0100fp\u15cf\u15d4sym;\u6135\xe8\u15d3ha;\u43b1\u0100ap\u15dfc\u0100cl\u15e4\u15e7r;\u4101g;\u6a3f\u0264\u15f0\0\0\u160a\u0280;adsv\u15fa\u15fb\u15ff\u1601\u1607\u6227nd;\u6a55;\u6a5clope;\u6a58;\u6a5a\u0380;elmrsz\u1618\u1619\u161b\u161e\u163f\u164f\u1659\u6220;\u69a4e\xbb\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163a\u163c\u163e;\u69a8;\u69a9;\u69aa;\u69ab;\u69ac;\u69ad;\u69ae;\u69aft\u0100;v\u1645\u1646\u621fb\u0100;d\u164c\u164d\u62be;\u699d\u0100pt\u1654\u1657h;\u6222\xbb\xb9arr;\u637c\u0100gp\u1663\u1667on;\u4105f;\uc000\ud835\udd52\u0380;Eaeiop\u12c1\u167b\u167d\u1682\u1684\u1687\u168a;\u6a70cir;\u6a6f;\u624ad;\u624bs;\u4027rox\u0100;e\u12c1\u1692\xf1\u1683ing\u803b\xe5\u40e5\u0180cty\u16a1\u16a6\u16a8r;\uc000\ud835\udcb6;\u402amp\u0100;e\u12c1\u16af\xf1\u0288ilde\u803b\xe3\u40e3ml\u803b\xe4\u40e4\u0100ci\u16c2\u16c8onin\xf4\u0272nt;\u6a11\u0800Nabcdefiklnoprsu\u16ed\u16f1\u1730\u173c\u1743\u1748\u1778\u177d\u17e0\u17e6\u1839\u1850\u170d\u193d\u1948\u1970ot;\u6aed\u0100cr\u16f6\u171ek\u0200ceps\u1700\u1705\u170d\u1713ong;\u624cpsilon;\u43f6rime;\u6035im\u0100;e\u171a\u171b\u623dq;\u62cd\u0176\u1722\u1726ee;\u62bded\u0100;g\u172c\u172d\u6305e\xbb\u172drk\u0100;t\u135c\u1737brk;\u63b6\u0100oy\u1701\u1741;\u4431quo;\u601e\u0280cmprt\u1753\u175b\u1761\u1764\u1768aus\u0100;e\u010a\u0109ptyv;\u69b0s\xe9\u170cno\xf5\u0113\u0180ahw\u176f\u1771\u1773;\u43b2;\u6136een;\u626cr;\uc000\ud835\udd1fg\u0380costuvw\u178d\u179d\u17b3\u17c1\u17d5\u17db\u17de\u0180aiu\u1794\u1796\u179a\xf0\u0760rc;\u65efp\xbb\u1371\u0180dpt\u17a4\u17a8\u17adot;\u6a00lus;\u6a01imes;\u6a02\u0271\u17b9\0\0\u17becup;\u6a06ar;\u6605riangle\u0100du\u17cd\u17d2own;\u65bdp;\u65b3plus;\u6a04e\xe5\u1444\xe5\u14adarow;\u690d\u0180ako\u17ed\u1826\u1835\u0100cn\u17f2\u1823k\u0180lst\u17fa\u05ab\u1802ozenge;\u69ebriangle\u0200;dlr\u1812\u1813\u1818\u181d\u65b4own;\u65beeft;\u65c2ight;\u65b8k;\u6423\u01b1\u182b\0\u1833\u01b2\u182f\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183e\u184d\u0100;q\u1843\u1846\uc000=\u20e5uiv;\uc000\u2261\u20e5t;\u6310\u0200ptwx\u1859\u185e\u1867\u186cf;\uc000\ud835\udd53\u0100;t\u13cb\u1863om\xbb\u13cctie;\u62c8\u0600DHUVbdhmptuv\u1885\u1896\u18aa\u18bb\u18d7\u18db\u18ec\u18ff\u1905\u190a\u1910\u1921\u0200LRlr\u188e\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18a1\u18a2\u18a4\u18a6\u18a8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18b3\u18b5\u18b7\u18b9;\u655d;\u655a;\u655c;\u6559\u0380;HLRhlr\u18ca\u18cb\u18cd\u18cf\u18d1\u18d3\u18d5\u6551;\u656c;\u6563;\u6560;\u656b;\u6562;\u655fox;\u69c9\u0200LRlr\u18e4\u18e6\u18e8\u18ea;\u6555;\u6552;\u6510;\u650c\u0280;DUdu\u06bd\u18f7\u18f9\u18fb\u18fd;\u6565;\u6568;\u652c;\u6534inus;\u629flus;\u629eimes;\u62a0\u0200LRlr\u1919\u191b\u191d\u191f;\u655b;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193b\u6502;\u656a;\u6561;\u655e;\u653c;\u6524;\u651c\u0100ev\u0123\u1942bar\u803b\xa6\u40a6\u0200ceio\u1951\u1956\u195a\u1960r;\uc000\ud835\udcb7mi;\u604fm\u0100;e\u171a\u171cl\u0180;bh\u1968\u1969\u196b\u405c;\u69c5sub;\u67c8\u016c\u1974\u197el\u0100;e\u1979\u197a\u6022t\xbb\u197ap\u0180;Ee\u012f\u1985\u1987;\u6aae\u0100;q\u06dc\u06db\u0ce1\u19a7\0\u19e8\u1a11\u1a15\u1a32\0\u1a37\u1a50\0\0\u1ab4\0\0\u1ac1\0\0\u1b21\u1b2e\u1b4d\u1b52\0\u1bfd\0\u1c0c\u0180cpr\u19ad\u19b2\u19ddute;\u4107\u0300;abcds\u19bf\u19c0\u19c4\u19ca\u19d5\u19d9\u6229nd;\u6a44rcup;\u6a49\u0100au\u19cf\u19d2p;\u6a4bp;\u6a47ot;\u6a40;\uc000\u2229\ufe00\u0100eo\u19e2\u19e5t;\u6041\xee\u0693\u0200aeiu\u19f0\u19fb\u1a01\u1a05\u01f0\u19f5\0\u19f8s;\u6a4don;\u410ddil\u803b\xe7\u40e7rc;\u4109ps\u0100;s\u1a0c\u1a0d\u6a4cm;\u6a50ot;\u410b\u0180dmn\u1a1b\u1a20\u1a26il\u80bb\xb8\u01adptyv;\u69b2t\u8100\xa2;e\u1a2d\u1a2e\u40a2r\xe4\u01b2r;\uc000\ud835\udd20\u0180cei\u1a3d\u1a40\u1a4dy;\u4447ck\u0100;m\u1a47\u1a48\u6713ark\xbb\u1a48;\u43c7r\u0380;Ecefms\u1a5f\u1a60\u1a62\u1a6b\u1aa4\u1aaa\u1aae\u65cb;\u69c3\u0180;el\u1a69\u1a6a\u1a6d\u42c6q;\u6257e\u0261\u1a74\0\0\u1a88rrow\u0100lr\u1a7c\u1a81eft;\u61baight;\u61bb\u0280RSacd\u1a92\u1a94\u1a96\u1a9a\u1a9f\xbb\u0f47;\u64c8st;\u629birc;\u629aash;\u629dnint;\u6a10id;\u6aefcir;\u69c2ubs\u0100;u\u1abb\u1abc\u6663it\xbb\u1abc\u02ec\u1ac7\u1ad4\u1afa\0\u1b0aon\u0100;e\u1acd\u1ace\u403a\u0100;q\xc7\xc6\u026d\u1ad9\0\0\u1ae2a\u0100;t\u1ade\u1adf\u402c;\u4040\u0180;fl\u1ae8\u1ae9\u1aeb\u6201\xee\u1160e\u0100mx\u1af1\u1af6ent\xbb\u1ae9e\xf3\u024d\u01e7\u1afe\0\u1b07\u0100;d\u12bb\u1b02ot;\u6a6dn\xf4\u0246\u0180fry\u1b10\u1b14\u1b17;\uc000\ud835\udd54o\xe4\u0254\u8100\xa9;s\u0155\u1b1dr;\u6117\u0100ao\u1b25\u1b29rr;\u61b5ss;\u6717\u0100cu\u1b32\u1b37r;\uc000\ud835\udcb8\u0100bp\u1b3c\u1b44\u0100;e\u1b41\u1b42\u6acf;\u6ad1\u0100;e\u1b49\u1b4a\u6ad0;\u6ad2dot;\u62ef\u0380delprvw\u1b60\u1b6c\u1b77\u1b82\u1bac\u1bd4\u1bf9arr\u0100lr\u1b68\u1b6a;\u6938;\u6935\u0270\u1b72\0\0\u1b75r;\u62dec;\u62dfarr\u0100;p\u1b7f\u1b80\u61b6;\u693d\u0300;bcdos\u1b8f\u1b90\u1b96\u1ba1\u1ba5\u1ba8\u622arcap;\u6a48\u0100au\u1b9b\u1b9ep;\u6a46p;\u6a4aot;\u628dr;\u6a45;\uc000\u222a\ufe00\u0200alrv\u1bb5\u1bbf\u1bde\u1be3rr\u0100;m\u1bbc\u1bbd\u61b7;\u693cy\u0180evw\u1bc7\u1bd4\u1bd8q\u0270\u1bce\0\0\u1bd2re\xe3\u1b73u\xe3\u1b75ee;\u62ceedge;\u62cfen\u803b\xa4\u40a4earrow\u0100lr\u1bee\u1bf3eft\xbb\u1b80ight\xbb\u1bbde\xe4\u1bdd\u0100ci\u1c01\u1c07onin\xf4\u01f7nt;\u6231lcty;\u632d\u0980AHabcdefhijlorstuwz\u1c38\u1c3b\u1c3f\u1c5d\u1c69\u1c75\u1c8a\u1c9e\u1cac\u1cb7\u1cfb\u1cff\u1d0d\u1d7b\u1d91\u1dab\u1dbb\u1dc6\u1dcdr\xf2\u0381ar;\u6965\u0200glrs\u1c48\u1c4d\u1c52\u1c54ger;\u6020eth;\u6138\xf2\u1133h\u0100;v\u1c5a\u1c5b\u6010\xbb\u090a\u016b\u1c61\u1c67arow;\u690fa\xe3\u0315\u0100ay\u1c6e\u1c73ron;\u410f;\u4434\u0180;ao\u0332\u1c7c\u1c84\u0100gr\u02bf\u1c81r;\u61catseq;\u6a77\u0180glm\u1c91\u1c94\u1c98\u803b\xb0\u40b0ta;\u43b4ptyv;\u69b1\u0100ir\u1ca3\u1ca8sht;\u697f;\uc000\ud835\udd21ar\u0100lr\u1cb3\u1cb5\xbb\u08dc\xbb\u101e\u0280aegsv\u1cc2\u0378\u1cd6\u1cdc\u1ce0m\u0180;os\u0326\u1cca\u1cd4nd\u0100;s\u0326\u1cd1uit;\u6666amma;\u43ddin;\u62f2\u0180;io\u1ce7\u1ce8\u1cf8\u40f7de\u8100\xf7;o\u1ce7\u1cf0ntimes;\u62c7n\xf8\u1cf7cy;\u4452c\u026f\u1d06\0\0\u1d0arn;\u631eop;\u630d\u0280lptuw\u1d18\u1d1d\u1d22\u1d49\u1d55lar;\u4024f;\uc000\ud835\udd55\u0280;emps\u030b\u1d2d\u1d37\u1d3d\u1d42q\u0100;d\u0352\u1d33ot;\u6251inus;\u6238lus;\u6214quare;\u62a1blebarwedg\xe5\xfan\u0180adh\u112e\u1d5d\u1d67ownarrow\xf3\u1c83arpoon\u0100lr\u1d72\u1d76ef\xf4\u1cb4igh\xf4\u1cb6\u0162\u1d7f\u1d85karo\xf7\u0f42\u026f\u1d8a\0\0\u1d8ern;\u631fop;\u630c\u0180cot\u1d98\u1da3\u1da6\u0100ry\u1d9d\u1da1;\uc000\ud835\udcb9;\u4455l;\u69f6rok;\u4111\u0100dr\u1db0\u1db4ot;\u62f1i\u0100;f\u1dba\u1816\u65bf\u0100ah\u1dc0\u1dc3r\xf2\u0429a\xf2\u0fa6angle;\u69a6\u0100ci\u1dd2\u1dd5y;\u445fgrarr;\u67ff\u0900Dacdefglmnopqrstux\u1e01\u1e09\u1e19\u1e38\u0578\u1e3c\u1e49\u1e61\u1e7e\u1ea5\u1eaf\u1ebd\u1ee1\u1f2a\u1f37\u1f44\u1f4e\u1f5a\u0100Do\u1e06\u1d34o\xf4\u1c89\u0100cs\u1e0e\u1e14ute\u803b\xe9\u40e9ter;\u6a6e\u0200aioy\u1e22\u1e27\u1e31\u1e36ron;\u411br\u0100;c\u1e2d\u1e2e\u6256\u803b\xea\u40ealon;\u6255;\u444dot;\u4117\u0100Dr\u1e41\u1e45ot;\u6252;\uc000\ud835\udd22\u0180;rs\u1e50\u1e51\u1e57\u6a9aave\u803b\xe8\u40e8\u0100;d\u1e5c\u1e5d\u6a96ot;\u6a98\u0200;ils\u1e6a\u1e6b\u1e72\u1e74\u6a99nters;\u63e7;\u6113\u0100;d\u1e79\u1e7a\u6a95ot;\u6a97\u0180aps\u1e85\u1e89\u1e97cr;\u4113ty\u0180;sv\u1e92\u1e93\u1e95\u6205et\xbb\u1e93p\u01001;\u1e9d\u1ea4\u0133\u1ea1\u1ea3;\u6004;\u6005\u6003\u0100gs\u1eaa\u1eac;\u414bp;\u6002\u0100gp\u1eb4\u1eb8on;\u4119f;\uc000\ud835\udd56\u0180als\u1ec4\u1ece\u1ed2r\u0100;s\u1eca\u1ecb\u62d5l;\u69e3us;\u6a71i\u0180;lv\u1eda\u1edb\u1edf\u43b5on\xbb\u1edb;\u43f5\u0200csuv\u1eea\u1ef3\u1f0b\u1f23\u0100io\u1eef\u1e31rc\xbb\u1e2e\u0269\u1ef9\0\0\u1efb\xed\u0548ant\u0100gl\u1f02\u1f06tr\xbb\u1e5dess\xbb\u1e7a\u0180aei\u1f12\u1f16\u1f1als;\u403dst;\u625fv\u0100;D\u0235\u1f20D;\u6a78parsl;\u69e5\u0100Da\u1f2f\u1f33ot;\u6253rr;\u6971\u0180cdi\u1f3e\u1f41\u1ef8r;\u612fo\xf4\u0352\u0100ah\u1f49\u1f4b;\u43b7\u803b\xf0\u40f0\u0100mr\u1f53\u1f57l\u803b\xeb\u40ebo;\u60ac\u0180cip\u1f61\u1f64\u1f67l;\u4021s\xf4\u056e\u0100eo\u1f6c\u1f74ctatio\xee\u0559nential\xe5\u0579\u09e1\u1f92\0\u1f9e\0\u1fa1\u1fa7\0\0\u1fc6\u1fcc\0\u1fd3\0\u1fe6\u1fea\u2000\0\u2008\u205allingdotse\xf1\u1e44y;\u4444male;\u6640\u0180ilr\u1fad\u1fb3\u1fc1lig;\u8000\ufb03\u0269\u1fb9\0\0\u1fbdg;\u8000\ufb00ig;\u8000\ufb04;\uc000\ud835\udd23lig;\u8000\ufb01lig;\uc000fj\u0180alt\u1fd9\u1fdc\u1fe1t;\u666dig;\u8000\ufb02ns;\u65b1of;\u4192\u01f0\u1fee\0\u1ff3f;\uc000\ud835\udd57\u0100ak\u05bf\u1ff7\u0100;v\u1ffc\u1ffd\u62d4;\u6ad9artint;\u6a0d\u0100ao\u200c\u2055\u0100cs\u2011\u2052\u03b1\u201a\u2030\u2038\u2045\u2048\0\u2050\u03b2\u2022\u2025\u2027\u202a\u202c\0\u202e\u803b\xbd\u40bd;\u6153\u803b\xbc\u40bc;\u6155;\u6159;\u615b\u01b3\u2034\0\u2036;\u6154;\u6156\u02b4\u203e\u2041\0\0\u2043\u803b\xbe\u40be;\u6157;\u615c5;\u6158\u01b6\u204c\0\u204e;\u615a;\u615d8;\u615el;\u6044wn;\u6322cr;\uc000\ud835\udcbb\u0880Eabcdefgijlnorstv\u2082\u2089\u209f\u20a5\u20b0\u20b4\u20f0\u20f5\u20fa\u20ff\u2103\u2112\u2138\u0317\u213e\u2152\u219e\u0100;l\u064d\u2087;\u6a8c\u0180cmp\u2090\u2095\u209dute;\u41f5ma\u0100;d\u209c\u1cda\u43b3;\u6a86reve;\u411f\u0100iy\u20aa\u20aerc;\u411d;\u4433ot;\u4121\u0200;lqs\u063e\u0642\u20bd\u20c9\u0180;qs\u063e\u064c\u20c4lan\xf4\u0665\u0200;cdl\u0665\u20d2\u20d5\u20e5c;\u6aa9ot\u0100;o\u20dc\u20dd\u6a80\u0100;l\u20e2\u20e3\u6a82;\u6a84\u0100;e\u20ea\u20ed\uc000\u22db\ufe00s;\u6a94r;\uc000\ud835\udd24\u0100;g\u0673\u061bmel;\u6137cy;\u4453\u0200;Eaj\u065a\u210c\u210e\u2110;\u6a92;\u6aa5;\u6aa4\u0200Eaes\u211b\u211d\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6a8arox\xbb\u2124\u0100;q\u212e\u212f\u6a88\u0100;q\u212e\u211bim;\u62e7pf;\uc000\ud835\udd58\u0100ci\u2143\u2146r;\u610am\u0180;el\u066b\u214e\u2150;\u6a8e;\u6a90\u8300>;cdlqr\u05ee\u2160\u216a\u216e\u2173\u2179\u0100ci\u2165\u2167;\u6aa7r;\u6a7aot;\u62d7Par;\u6995uest;\u6a7c\u0280adels\u2184\u216a\u2190\u0656\u219b\u01f0\u2189\0\u218epro\xf8\u209er;\u6978q\u0100lq\u063f\u2196les\xf3\u2088i\xed\u066b\u0100en\u21a3\u21adrtneqq;\uc000\u2269\ufe00\xc5\u21aa\u0500Aabcefkosy\u21c4\u21c7\u21f1\u21f5\u21fa\u2218\u221d\u222f\u2268\u227dr\xf2\u03a0\u0200ilmr\u21d0\u21d4\u21d7\u21dbrs\xf0\u1484f\xbb\u2024il\xf4\u06a9\u0100dr\u21e0\u21e4cy;\u444a\u0180;cw\u08f4\u21eb\u21efir;\u6948;\u61adar;\u610firc;\u4125\u0180alr\u2201\u220e\u2213rts\u0100;u\u2209\u220a\u6665it\xbb\u220alip;\u6026con;\u62b9r;\uc000\ud835\udd25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223a\u223e\u2243\u225e\u2263rr;\u61fftht;\u623bk\u0100lr\u2249\u2253eftarrow;\u61a9ightarrow;\u61aaf;\uc000\ud835\udd59bar;\u6015\u0180clt\u226f\u2274\u2278r;\uc000\ud835\udcbdas\xe8\u21f4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xbb\u1c5b\u0ae1\u22a3\0\u22aa\0\u22b8\u22c5\u22ce\0\u22d5\u22f3\0\0\u22f8\u2322\u2367\u2362\u237f\0\u2386\u23aa\u23b4cute\u803b\xed\u40ed\u0180;iy\u0771\u22b0\u22b5rc\u803b\xee\u40ee;\u4438\u0100cx\u22bc\u22bfy;\u4435cl\u803b\xa1\u40a1\u0100fr\u039f\u22c9;\uc000\ud835\udd26rave\u803b\xec\u40ec\u0200;ino\u073e\u22dd\u22e9\u22ee\u0100in\u22e2\u22e6nt;\u6a0ct;\u622dfin;\u69dcta;\u6129lig;\u4133\u0180aop\u22fe\u231a\u231d\u0180cgt\u2305\u2308\u2317r;\u412b\u0180elp\u071f\u230f\u2313in\xe5\u078ear\xf4\u0720h;\u4131f;\u62b7ed;\u41b5\u0280;cfot\u04f4\u232c\u2331\u233d\u2341are;\u6105in\u0100;t\u2338\u2339\u621eie;\u69dddo\xf4\u2319\u0280;celp\u0757\u234c\u2350\u235b\u2361al;\u62ba\u0100gr\u2355\u2359er\xf3\u1563\xe3\u234darhk;\u6a17rod;\u6a3c\u0200cgpt\u236f\u2372\u2376\u237by;\u4451on;\u412ff;\uc000\ud835\udd5aa;\u43b9uest\u803b\xbf\u40bf\u0100ci\u238a\u238fr;\uc000\ud835\udcben\u0280;Edsv\u04f4\u239b\u239d\u23a1\u04f3;\u62f9ot;\u62f5\u0100;v\u23a6\u23a7\u62f4;\u62f3\u0100;i\u0777\u23aelde;\u4129\u01eb\u23b8\0\u23bccy;\u4456l\u803b\xef\u40ef\u0300cfmosu\u23cc\u23d7\u23dc\u23e1\u23e7\u23f5\u0100iy\u23d1\u23d5rc;\u4135;\u4439r;\uc000\ud835\udd27ath;\u4237pf;\uc000\ud835\udd5b\u01e3\u23ec\0\u23f1r;\uc000\ud835\udcbfrcy;\u4458kcy;\u4454\u0400acfghjos\u240b\u2416\u2422\u2427\u242d\u2431\u2435\u243bppa\u0100;v\u2413\u2414\u43ba;\u43f0\u0100ey\u241b\u2420dil;\u4137;\u443ar;\uc000\ud835\udd28reen;\u4138cy;\u4445cy;\u445cpf;\uc000\ud835\udd5ccr;\uc000\ud835\udcc0\u0b80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248d\u2491\u250e\u253d\u255a\u2580\u264e\u265e\u2665\u2679\u267d\u269a\u26b2\u26d8\u275d\u2768\u278b\u27c0\u2801\u2812\u0180art\u2477\u247a\u247cr\xf2\u09c6\xf2\u0395ail;\u691barr;\u690e\u0100;g\u0994\u248b;\u6a8bar;\u6962\u0963\u24a5\0\u24aa\0\u24b1\0\0\0\0\0\u24b5\u24ba\0\u24c6\u24c8\u24cd\0\u24f9ute;\u413amptyv;\u69b4ra\xee\u084cbda;\u43bbg\u0180;dl\u088e\u24c1\u24c3;\u6991\xe5\u088e;\u6a85uo\u803b\xab\u40abr\u0400;bfhlpst\u0899\u24de\u24e6\u24e9\u24eb\u24ee\u24f1\u24f5\u0100;f\u089d\u24e3s;\u691fs;\u691d\xeb\u2252p;\u61abl;\u6939im;\u6973l;\u61a2\u0180;ae\u24ff\u2500\u2504\u6aabil;\u6919\u0100;s\u2509\u250a\u6aad;\uc000\u2aad\ufe00\u0180abr\u2515\u2519\u251drr;\u690crk;\u6772\u0100ak\u2522\u252cc\u0100ek\u2528\u252a;\u407b;\u405b\u0100es\u2531\u2533;\u698bl\u0100du\u2539\u253b;\u698f;\u698d\u0200aeuy\u2546\u254b\u2556\u2558ron;\u413e\u0100di\u2550\u2554il;\u413c\xec\u08b0\xe2\u2529;\u443b\u0200cqrs\u2563\u2566\u256d\u257da;\u6936uo\u0100;r\u0e19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694bh;\u61b2\u0280;fgqs\u258b\u258c\u0989\u25f3\u25ff\u6264t\u0280ahlrt\u2598\u25a4\u25b7\u25c2\u25e8rrow\u0100;t\u0899\u25a1a\xe9\u24f6arpoon\u0100du\u25af\u25b4own\xbb\u045ap\xbb\u0966eftarrows;\u61c7ight\u0180ahs\u25cd\u25d6\u25derrow\u0100;s\u08f4\u08a7arpoon\xf3\u0f98quigarro\xf7\u21f0hreetimes;\u62cb\u0180;qs\u258b\u0993\u25falan\xf4\u09ac\u0280;cdgs\u09ac\u260a\u260d\u261d\u2628c;\u6aa8ot\u0100;o\u2614\u2615\u6a7f\u0100;r\u261a\u261b\u6a81;\u6a83\u0100;e\u2622\u2625\uc000\u22da\ufe00s;\u6a93\u0280adegs\u2633\u2639\u263d\u2649\u264bppro\xf8\u24c6ot;\u62d6q\u0100gq\u2643\u2645\xf4\u0989gt\xf2\u248c\xf4\u099bi\xed\u09b2\u0180ilr\u2655\u08e1\u265asht;\u697c;\uc000\ud835\udd29\u0100;E\u099c\u2663;\u6a91\u0161\u2669\u2676r\u0100du\u25b2\u266e\u0100;l\u0965\u2673;\u696alk;\u6584cy;\u4459\u0280;acht\u0a48\u2688\u268b\u2691\u2696r\xf2\u25c1orne\xf2\u1d08ard;\u696bri;\u65fa\u0100io\u269f\u26a4dot;\u4140ust\u0100;a\u26ac\u26ad\u63b0che\xbb\u26ad\u0200Eaes\u26bb\u26bd\u26c9\u26d4;\u6268p\u0100;p\u26c3\u26c4\u6a89rox\xbb\u26c4\u0100;q\u26ce\u26cf\u6a87\u0100;q\u26ce\u26bbim;\u62e6\u0400abnoptwz\u26e9\u26f4\u26f7\u271a\u272f\u2741\u2747\u2750\u0100nr\u26ee\u26f1g;\u67ecr;\u61fdr\xeb\u08c1g\u0180lmr\u26ff\u270d\u2714eft\u0100ar\u09e6\u2707ight\xe1\u09f2apsto;\u67fcight\xe1\u09fdparrow\u0100lr\u2725\u2729ef\xf4\u24edight;\u61ac\u0180afl\u2736\u2739\u273dr;\u6985;\uc000\ud835\udd5dus;\u6a2dimes;\u6a34\u0161\u274b\u274fst;\u6217\xe1\u134e\u0180;ef\u2757\u2758\u1800\u65cange\xbb\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277c\u2785\u2787r\xf2\u08a8orne\xf2\u1d8car\u0100;d\u0f98\u2783;\u696d;\u600eri;\u62bf\u0300achiqt\u2798\u279d\u0a40\u27a2\u27ae\u27bbquo;\u6039r;\uc000\ud835\udcc1m\u0180;eg\u09b2\u27aa\u27ac;\u6a8d;\u6a8f\u0100bu\u252a\u27b3o\u0100;r\u0e1f\u27b9;\u601arok;\u4142\u8400<;cdhilqr\u082b\u27d2\u2639\u27dc\u27e0\u27e5\u27ea\u27f0\u0100ci\u27d7\u27d9;\u6aa6r;\u6a79re\xe5\u25f2mes;\u62c9arr;\u6976uest;\u6a7b\u0100Pi\u27f5\u27f9ar;\u6996\u0180;ef\u2800\u092d\u181b\u65c3r\u0100du\u2807\u280dshar;\u694ahar;\u6966\u0100en\u2817\u2821rtneqq;\uc000\u2268\ufe00\xc5\u281e\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288e\u2893\u28a0\u28a5\u28a8\u28da\u28e2\u28e4\u0a83\u28f3\u2902Dot;\u623a\u0200clpr\u284e\u2852\u2863\u287dr\u803b\xaf\u40af\u0100et\u2857\u2859;\u6642\u0100;e\u285e\u285f\u6720se\xbb\u285f\u0100;s\u103b\u2868to\u0200;dlu\u103b\u2873\u2877\u287bow\xee\u048cef\xf4\u090f\xf0\u13d1ker;\u65ae\u0100oy\u2887\u288cmma;\u6a29;\u443cash;\u6014asuredangle\xbb\u1626r;\uc000\ud835\udd2ao;\u6127\u0180cdn\u28af\u28b4\u28c9ro\u803b\xb5\u40b5\u0200;acd\u1464\u28bd\u28c0\u28c4s\xf4\u16a7ir;\u6af0ot\u80bb\xb7\u01b5us\u0180;bd\u28d2\u1903\u28d3\u6212\u0100;u\u1d3c\u28d8;\u6a2a\u0163\u28de\u28e1p;\u6adb\xf2\u2212\xf0\u0a81\u0100dp\u28e9\u28eeels;\u62a7f;\uc000\ud835\udd5e\u0100ct\u28f8\u28fdr;\uc000\ud835\udcc2pos\xbb\u159d\u0180;lm\u2909\u290a\u290d\u43bctimap;\u62b8\u0c00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297e\u2989\u2998\u29da\u29e9\u2a15\u2a1a\u2a58\u2a5d\u2a83\u2a95\u2aa4\u2aa8\u2b04\u2b07\u2b44\u2b7f\u2bae\u2c34\u2c67\u2c7c\u2ce9\u0100gt\u2947\u294b;\uc000\u22d9\u0338\u0100;v\u2950\u0bcf\uc000\u226b\u20d2\u0180elt\u295a\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61cdightarrow;\u61ce;\uc000\u22d8\u0338\u0100;v\u297b\u0c47\uc000\u226a\u20d2ightarrow;\u61cf\u0100Dd\u298e\u2993ash;\u62afash;\u62ae\u0280bcnpt\u29a3\u29a7\u29ac\u29b1\u29ccla\xbb\u02deute;\u4144g;\uc000\u2220\u20d2\u0280;Eiop\u0d84\u29bc\u29c0\u29c5\u29c8;\uc000\u2a70\u0338d;\uc000\u224b\u0338s;\u4149ro\xf8\u0d84ur\u0100;a\u29d3\u29d4\u666el\u0100;s\u29d3\u0b38\u01f3\u29df\0\u29e3p\u80bb\xa0\u0b37mp\u0100;e\u0bf9\u0c00\u0280aeouy\u29f4\u29fe\u2a03\u2a10\u2a13\u01f0\u29f9\0\u29fb;\u6a43on;\u4148dil;\u4146ng\u0100;d\u0d7e\u2a0aot;\uc000\u2a6d\u0338p;\u6a42;\u443dash;\u6013\u0380;Aadqsx\u0b92\u2a29\u2a2d\u2a3b\u2a41\u2a45\u2a50rr;\u61d7r\u0100hr\u2a33\u2a36k;\u6924\u0100;o\u13f2\u13f0ot;\uc000\u2250\u0338ui\xf6\u0b63\u0100ei\u2a4a\u2a4ear;\u6928\xed\u0b98ist\u0100;s\u0ba0\u0b9fr;\uc000\ud835\udd2b\u0200Eest\u0bc5\u2a66\u2a79\u2a7c\u0180;qs\u0bbc\u2a6d\u0be1\u0180;qs\u0bbc\u0bc5\u2a74lan\xf4\u0be2i\xed\u0bea\u0100;r\u0bb6\u2a81\xbb\u0bb7\u0180Aap\u2a8a\u2a8d\u2a91r\xf2\u2971rr;\u61aear;\u6af2\u0180;sv\u0f8d\u2a9c\u0f8c\u0100;d\u2aa1\u2aa2\u62fc;\u62facy;\u445a\u0380AEadest\u2ab7\u2aba\u2abe\u2ac2\u2ac5\u2af6\u2af9r\xf2\u2966;\uc000\u2266\u0338rr;\u619ar;\u6025\u0200;fqs\u0c3b\u2ace\u2ae3\u2aeft\u0100ar\u2ad4\u2ad9rro\xf7\u2ac1ightarro\xf7\u2a90\u0180;qs\u0c3b\u2aba\u2aealan\xf4\u0c55\u0100;s\u0c55\u2af4\xbb\u0c36i\xed\u0c5d\u0100;r\u0c35\u2afei\u0100;e\u0c1a\u0c25i\xe4\u0d90\u0100pt\u2b0c\u2b11f;\uc000\ud835\udd5f\u8180\xac;in\u2b19\u2b1a\u2b36\u40acn\u0200;Edv\u0b89\u2b24\u2b28\u2b2e;\uc000\u22f9\u0338ot;\uc000\u22f5\u0338\u01e1\u0b89\u2b33\u2b35;\u62f7;\u62f6i\u0100;v\u0cb8\u2b3c\u01e1\u0cb8\u2b41\u2b43;\u62fe;\u62fd\u0180aor\u2b4b\u2b63\u2b69r\u0200;ast\u0b7b\u2b55\u2b5a\u2b5flle\xec\u0b7bl;\uc000\u2afd\u20e5;\uc000\u2202\u0338lint;\u6a14\u0180;ce\u0c92\u2b70\u2b73u\xe5\u0ca5\u0100;c\u0c98\u2b78\u0100;e\u0c92\u2b7d\xf1\u0c98\u0200Aait\u2b88\u2b8b\u2b9d\u2ba7r\xf2\u2988rr\u0180;cw\u2b94\u2b95\u2b99\u619b;\uc000\u2933\u0338;\uc000\u219d\u0338ghtarrow\xbb\u2b95ri\u0100;e\u0ccb\u0cd6\u0380chimpqu\u2bbd\u2bcd\u2bd9\u2b04\u0b78\u2be4\u2bef\u0200;cer\u0d32\u2bc6\u0d37\u2bc9u\xe5\u0d45;\uc000\ud835\udcc3ort\u026d\u2b05\0\0\u2bd6ar\xe1\u2b56m\u0100;e\u0d6e\u2bdf\u0100;q\u0d74\u0d73su\u0100bp\u2beb\u2bed\xe5\u0cf8\xe5\u0d0b\u0180bcp\u2bf6\u2c11\u2c19\u0200;Ees\u2bff\u2c00\u0d22\u2c04\u6284;\uc000\u2ac5\u0338et\u0100;e\u0d1b\u2c0bq\u0100;q\u0d23\u2c00c\u0100;e\u0d32\u2c17\xf1\u0d38\u0200;Ees\u2c22\u2c23\u0d5f\u2c27\u6285;\uc000\u2ac6\u0338et\u0100;e\u0d58\u2c2eq\u0100;q\u0d60\u2c23\u0200gilr\u2c3d\u2c3f\u2c45\u2c47\xec\u0bd7lde\u803b\xf1\u40f1\xe7\u0c43iangle\u0100lr\u2c52\u2c5ceft\u0100;e\u0c1a\u2c5a\xf1\u0c26ight\u0100;e\u0ccb\u2c65\xf1\u0cd7\u0100;m\u2c6c\u2c6d\u43bd\u0180;es\u2c74\u2c75\u2c79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2c8f\u2c94\u2c99\u2c9e\u2ca3\u2cb0\u2cb6\u2cd3\u2ce3ash;\u62adarr;\u6904p;\uc000\u224d\u20d2ash;\u62ac\u0100et\u2ca8\u2cac;\uc000\u2265\u20d2;\uc000>\u20d2nfin;\u69de\u0180Aet\u2cbd\u2cc1\u2cc5rr;\u6902;\uc000\u2264\u20d2\u0100;r\u2cca\u2ccd\uc000<\u20d2ie;\uc000\u22b4\u20d2\u0100At\u2cd8\u2cdcrr;\u6903rie;\uc000\u22b5\u20d2im;\uc000\u223c\u20d2\u0180Aan\u2cf0\u2cf4\u2d02rr;\u61d6r\u0100hr\u2cfa\u2cfdk;\u6923\u0100;o\u13e7\u13e5ear;\u6927\u1253\u1a95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2d2d\0\u2d38\u2d48\u2d60\u2d65\u2d72\u2d84\u1b07\0\0\u2d8d\u2dab\0\u2dc8\u2dce\0\u2ddc\u2e19\u2e2b\u2e3e\u2e43\u0100cs\u2d31\u1a97ute\u803b\xf3\u40f3\u0100iy\u2d3c\u2d45r\u0100;c\u1a9e\u2d42\u803b\xf4\u40f4;\u443e\u0280abios\u1aa0\u2d52\u2d57\u01c8\u2d5alac;\u4151v;\u6a38old;\u69bclig;\u4153\u0100cr\u2d69\u2d6dir;\u69bf;\uc000\ud835\udd2c\u036f\u2d79\0\0\u2d7c\0\u2d82n;\u42dbave\u803b\xf2\u40f2;\u69c1\u0100bm\u2d88\u0df4ar;\u69b5\u0200acit\u2d95\u2d98\u2da5\u2da8r\xf2\u1a80\u0100ir\u2d9d\u2da0r;\u69beoss;\u69bbn\xe5\u0e52;\u69c0\u0180aei\u2db1\u2db5\u2db9cr;\u414dga;\u43c9\u0180cdn\u2dc0\u2dc5\u01cdron;\u43bf;\u69b6pf;\uc000\ud835\udd60\u0180ael\u2dd4\u2dd7\u01d2r;\u69b7rp;\u69b9\u0380;adiosv\u2dea\u2deb\u2dee\u2e08\u2e0d\u2e10\u2e16\u6228r\xf2\u1a86\u0200;efm\u2df7\u2df8\u2e02\u2e05\u6a5dr\u0100;o\u2dfe\u2dff\u6134f\xbb\u2dff\u803b\xaa\u40aa\u803b\xba\u40bagof;\u62b6r;\u6a56lope;\u6a57;\u6a5b\u0180clo\u2e1f\u2e21\u2e27\xf2\u2e01ash\u803b\xf8\u40f8l;\u6298i\u016c\u2e2f\u2e34de\u803b\xf5\u40f5es\u0100;a\u01db\u2e3as;\u6a36ml\u803b\xf6\u40f6bar;\u633d\u0ae1\u2e5e\0\u2e7d\0\u2e80\u2e9d\0\u2ea2\u2eb9\0\0\u2ecb\u0e9c\0\u2f13\0\0\u2f2b\u2fbc\0\u2fc8r\u0200;ast\u0403\u2e67\u2e72\u0e85\u8100\xb6;l\u2e6d\u2e6e\u40b6le\xec\u0403\u0269\u2e78\0\0\u2e7bm;\u6af3;\u6afdy;\u443fr\u0280cimpt\u2e8b\u2e8f\u2e93\u1865\u2e97nt;\u4025od;\u402eil;\u6030enk;\u6031r;\uc000\ud835\udd2d\u0180imo\u2ea8\u2eb0\u2eb4\u0100;v\u2ead\u2eae\u43c6;\u43d5ma\xf4\u0a76ne;\u660e\u0180;tv\u2ebf\u2ec0\u2ec8\u43c0chfork\xbb\u1ffd;\u43d6\u0100au\u2ecf\u2edfn\u0100ck\u2ed5\u2eddk\u0100;h\u21f4\u2edb;\u610e\xf6\u21f4s\u0480;abcdemst\u2ef3\u2ef4\u1908\u2ef9\u2efd\u2f04\u2f06\u2f0a\u2f0e\u402bcir;\u6a23ir;\u6a22\u0100ou\u1d40\u2f02;\u6a25;\u6a72n\u80bb\xb1\u0e9dim;\u6a26wo;\u6a27\u0180ipu\u2f19\u2f20\u2f25ntint;\u6a15f;\uc000\ud835\udd61nd\u803b\xa3\u40a3\u0500;Eaceinosu\u0ec8\u2f3f\u2f41\u2f44\u2f47\u2f81\u2f89\u2f92\u2f7e\u2fb6;\u6ab3p;\u6ab7u\xe5\u0ed9\u0100;c\u0ece\u2f4c\u0300;acens\u0ec8\u2f59\u2f5f\u2f66\u2f68\u2f7eppro\xf8\u2f43urlye\xf1\u0ed9\xf1\u0ece\u0180aes\u2f6f\u2f76\u2f7approx;\u6ab9qq;\u6ab5im;\u62e8i\xed\u0edfme\u0100;s\u2f88\u0eae\u6032\u0180Eas\u2f78\u2f90\u2f7a\xf0\u2f75\u0180dfp\u0eec\u2f99\u2faf\u0180als\u2fa0\u2fa5\u2faalar;\u632eine;\u6312urf;\u6313\u0100;t\u0efb\u2fb4\xef\u0efbrel;\u62b0\u0100ci\u2fc0\u2fc5r;\uc000\ud835\udcc5;\u43c8ncsp;\u6008\u0300fiopsu\u2fda\u22e2\u2fdf\u2fe5\u2feb\u2ff1r;\uc000\ud835\udd2epf;\uc000\ud835\udd62rime;\u6057cr;\uc000\ud835\udcc6\u0180aeo\u2ff8\u3009\u3013t\u0100ei\u2ffe\u3005rnion\xf3\u06b0nt;\u6a16st\u0100;e\u3010\u3011\u403f\xf1\u1f19\xf4\u0f14\u0a80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30e0\u310e\u312b\u3147\u3162\u3172\u318e\u3206\u3215\u3224\u3229\u3258\u326e\u3272\u3290\u32b0\u32b7\u0180art\u3047\u304a\u304cr\xf2\u10b3\xf2\u03ddail;\u691car\xf2\u1c65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307f\u308f\u3094\u30cc\u0100eu\u306d\u3071;\uc000\u223d\u0331te;\u4155i\xe3\u116emptyv;\u69b3g\u0200;del\u0fd1\u3089\u308b\u308d;\u6992;\u69a5\xe5\u0fd1uo\u803b\xbb\u40bbr\u0580;abcfhlpstw\u0fdc\u30ac\u30af\u30b7\u30b9\u30bc\u30be\u30c0\u30c3\u30c7\u30cap;\u6975\u0100;f\u0fe0\u30b4s;\u6920;\u6933s;\u691e\xeb\u225d\xf0\u272el;\u6945im;\u6974l;\u61a3;\u619d\u0100ai\u30d1\u30d5il;\u691ao\u0100;n\u30db\u30dc\u6236al\xf3\u0f1e\u0180abr\u30e7\u30ea\u30eer\xf2\u17e5rk;\u6773\u0100ak\u30f3\u30fdc\u0100ek\u30f9\u30fb;\u407d;\u405d\u0100es\u3102\u3104;\u698cl\u0100du\u310a\u310c;\u698e;\u6990\u0200aeuy\u3117\u311c\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xec\u0ff2\xe2\u30fa;\u4440\u0200clqs\u3134\u3137\u313d\u3144a;\u6937dhar;\u6969uo\u0100;r\u020e\u020dh;\u61b3\u0180acg\u314e\u315f\u0f44l\u0200;ips\u0f78\u3158\u315b\u109cn\xe5\u10bbar\xf4\u0fa9t;\u65ad\u0180ilr\u3169\u1023\u316esht;\u697d;\uc000\ud835\udd2f\u0100ao\u3177\u3186r\u0100du\u317d\u317f\xbb\u047b\u0100;l\u1091\u3184;\u696c\u0100;v\u318b\u318c\u43c1;\u43f1\u0180gns\u3195\u31f9\u31fcht\u0300ahlrst\u31a4\u31b0\u31c2\u31d8\u31e4\u31eerrow\u0100;t\u0fdc\u31ada\xe9\u30c8arpoon\u0100du\u31bb\u31bfow\xee\u317ep\xbb\u1092eft\u0100ah\u31ca\u31d0rrow\xf3\u0feaarpoon\xf3\u0551ightarrows;\u61c9quigarro\xf7\u30cbhreetimes;\u62ccg;\u42daingdotse\xf1\u1f32\u0180ahm\u320d\u3210\u3213r\xf2\u0feaa\xf2\u0551;\u600foust\u0100;a\u321e\u321f\u63b1che\xbb\u321fmid;\u6aee\u0200abpt\u3232\u323d\u3240\u3252\u0100nr\u3237\u323ag;\u67edr;\u61fer\xeb\u1003\u0180afl\u3247\u324a\u324er;\u6986;\uc000\ud835\udd63us;\u6a2eimes;\u6a35\u0100ap\u325d\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6a12ar\xf2\u31e3\u0200achq\u327b\u3280\u10bc\u3285quo;\u603ar;\uc000\ud835\udcc7\u0100bu\u30fb\u328ao\u0100;r\u0214\u0213\u0180hir\u3297\u329b\u32a0re\xe5\u31f8mes;\u62cai\u0200;efl\u32aa\u1059\u1821\u32ab\u65b9tri;\u69celuhar;\u6968;\u611e\u0d61\u32d5\u32db\u32df\u332c\u3338\u3371\0\u337a\u33a4\0\0\u33ec\u33f0\0\u3428\u3448\u345a\u34ad\u34b1\u34ca\u34f1\0\u3616\0\0\u3633cute;\u415bqu\xef\u27ba\u0500;Eaceinpsy\u11ed\u32f3\u32f5\u32ff\u3302\u330b\u330f\u331f\u3326\u3329;\u6ab4\u01f0\u32fa\0\u32fc;\u6ab8on;\u4161u\xe5\u11fe\u0100;d\u11f3\u3307il;\u415frc;\u415d\u0180Eas\u3316\u3318\u331b;\u6ab6p;\u6abaim;\u62e9olint;\u6a13i\xed\u1204;\u4441ot\u0180;be\u3334\u1d47\u3335\u62c5;\u6a66\u0380Aacmstx\u3346\u334a\u3357\u335b\u335e\u3363\u336drr;\u61d8r\u0100hr\u3350\u3352\xeb\u2228\u0100;o\u0a36\u0a34t\u803b\xa7\u40a7i;\u403bwar;\u6929m\u0100in\u3369\xf0nu\xf3\xf1t;\u6736r\u0100;o\u3376\u2055\uc000\ud835\udd30\u0200acoy\u3382\u3386\u3391\u33a0rp;\u666f\u0100hy\u338b\u338fcy;\u4449;\u4448rt\u026d\u3399\0\0\u339ci\xe4\u1464ara\xec\u2e6f\u803b\xad\u40ad\u0100gm\u33a8\u33b4ma\u0180;fv\u33b1\u33b2\u33b2\u43c3;\u43c2\u0400;deglnpr\u12ab\u33c5\u33c9\u33ce\u33d6\u33de\u33e1\u33e6ot;\u6a6a\u0100;q\u12b1\u12b0\u0100;E\u33d3\u33d4\u6a9e;\u6aa0\u0100;E\u33db\u33dc\u6a9d;\u6a9fe;\u6246lus;\u6a24arr;\u6972ar\xf2\u113d\u0200aeit\u33f8\u3408\u340f\u3417\u0100ls\u33fd\u3404lsetm\xe9\u336ahp;\u6a33parsl;\u69e4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341c\u341d\u6aaa\u0100;s\u3422\u3423\u6aac;\uc000\u2aac\ufe00\u0180flp\u342e\u3433\u3442tcy;\u444c\u0100;b\u3438\u3439\u402f\u0100;a\u343e\u343f\u69c4r;\u633ff;\uc000\ud835\udd64a\u0100dr\u344d\u0402es\u0100;u\u3454\u3455\u6660it\xbb\u3455\u0180csu\u3460\u3479\u349f\u0100au\u3465\u346fp\u0100;s\u1188\u346b;\uc000\u2293\ufe00p\u0100;s\u11b4\u3475;\uc000\u2294\ufe00u\u0100bp\u347f\u348f\u0180;es\u1197\u119c\u3486et\u0100;e\u1197\u348d\xf1\u119d\u0180;es\u11a8\u11ad\u3496et\u0100;e\u11a8\u349d\xf1\u11ae\u0180;af\u117b\u34a6\u05b0r\u0165\u34ab\u05b1\xbb\u117car\xf2\u1148\u0200cemt\u34b9\u34be\u34c2\u34c5r;\uc000\ud835\udcc8tm\xee\xf1i\xec\u3415ar\xe6\u11be\u0100ar\u34ce\u34d5r\u0100;f\u34d4\u17bf\u6606\u0100an\u34da\u34edight\u0100ep\u34e3\u34eapsilo\xee\u1ee0h\xe9\u2eafs\xbb\u2852\u0280bcmnp\u34fb\u355e\u1209\u358b\u358e\u0480;Edemnprs\u350e\u350f\u3511\u3515\u351e\u3523\u352c\u3531\u3536\u6282;\u6ac5ot;\u6abd\u0100;d\u11da\u351aot;\u6ac3ult;\u6ac1\u0100Ee\u3528\u352a;\u6acb;\u628alus;\u6abfarr;\u6979\u0180eiu\u353d\u3552\u3555t\u0180;en\u350e\u3545\u354bq\u0100;q\u11da\u350feq\u0100;q\u352b\u3528m;\u6ac7\u0100bp\u355a\u355c;\u6ad5;\u6ad3c\u0300;acens\u11ed\u356c\u3572\u3579\u357b\u3326ppro\xf8\u32faurlye\xf1\u11fe\xf1\u11f3\u0180aes\u3582\u3588\u331bppro\xf8\u331aq\xf1\u3317g;\u666a\u0680123;Edehlmnps\u35a9\u35ac\u35af\u121c\u35b2\u35b4\u35c0\u35c9\u35d5\u35da\u35df\u35e8\u35ed\u803b\xb9\u40b9\u803b\xb2\u40b2\u803b\xb3\u40b3;\u6ac6\u0100os\u35b9\u35bct;\u6abeub;\u6ad8\u0100;d\u1222\u35c5ot;\u6ac4s\u0100ou\u35cf\u35d2l;\u67c9b;\u6ad7arr;\u697bult;\u6ac2\u0100Ee\u35e4\u35e6;\u6acc;\u628blus;\u6ac0\u0180eiu\u35f4\u3609\u360ct\u0180;en\u121c\u35fc\u3602q\u0100;q\u1222\u35b2eq\u0100;q\u35e7\u35e4m;\u6ac8\u0100bp\u3611\u3613;\u6ad4;\u6ad6\u0180Aan\u361c\u3620\u362drr;\u61d9r\u0100hr\u3626\u3628\xeb\u222e\u0100;o\u0a2b\u0a29war;\u692alig\u803b\xdf\u40df\u0be1\u3651\u365d\u3660\u12ce\u3673\u3679\0\u367e\u36c2\0\0\0\0\0\u36db\u3703\0\u3709\u376c\0\0\0\u3787\u0272\u3656\0\0\u365bget;\u6316;\u43c4r\xeb\u0e5f\u0180aey\u3666\u366b\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uc000\ud835\udd31\u0200eiko\u3686\u369d\u36b5\u36bc\u01f2\u368b\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369b\u43b8ym;\u43d1\u0100cn\u36a2\u36b2k\u0100as\u36a8\u36aeppro\xf8\u12c1im\xbb\u12acs\xf0\u129e\u0100as\u36ba\u36ae\xf0\u12c1rn\u803b\xfe\u40fe\u01ec\u031f\u36c6\u22e7es\u8180\xd7;bd\u36cf\u36d0\u36d8\u40d7\u0100;a\u190f\u36d5r;\u6a31;\u6a30\u0180eps\u36e1\u36e3\u3700\xe1\u2a4d\u0200;bcf\u0486\u36ec\u36f0\u36f4ot;\u6336ir;\u6af1\u0100;o\u36f9\u36fc\uc000\ud835\udd65rk;\u6ada\xe1\u3362rime;\u6034\u0180aip\u370f\u3712\u3764d\xe5\u1248\u0380adempst\u3721\u374d\u3740\u3751\u3757\u375c\u375fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65b5own\xbb\u1dbbeft\u0100;e\u2800\u373e\xf1\u092e;\u625cight\u0100;e\u32aa\u374b\xf1\u105aot;\u65ecinus;\u6a3alus;\u6a39b;\u69cdime;\u6a3bezium;\u63e2\u0180cht\u3772\u377d\u3781\u0100ry\u3777\u377b;\uc000\ud835\udcc9;\u4446cy;\u445brok;\u4167\u0100io\u378b\u378ex\xf4\u1777head\u0100lr\u3797\u37a0eftarro\xf7\u084fightarrow\xbb\u0f5d\u0900AHabcdfghlmoprstuw\u37d0\u37d3\u37d7\u37e4\u37f0\u37fc\u380e\u381c\u3823\u3834\u3851\u385d\u386b\u38a9\u38cc\u38d2\u38ea\u38f6r\xf2\u03edar;\u6963\u0100cr\u37dc\u37e2ute\u803b\xfa\u40fa\xf2\u1150r\u01e3\u37ea\0\u37edy;\u445eve;\u416d\u0100iy\u37f5\u37farc\u803b\xfb\u40fb;\u4443\u0180abh\u3803\u3806\u380br\xf2\u13adlac;\u4171a\xf2\u13c3\u0100ir\u3813\u3818sht;\u697e;\uc000\ud835\udd32rave\u803b\xf9\u40f9\u0161\u3827\u3831r\u0100lr\u382c\u382e\xbb\u0957\xbb\u1083lk;\u6580\u0100ct\u3839\u384d\u026f\u383f\0\0\u384arn\u0100;e\u3845\u3846\u631cr\xbb\u3846op;\u630fri;\u65f8\u0100al\u3856\u385acr;\u416b\u80bb\xa8\u0349\u0100gp\u3862\u3866on;\u4173f;\uc000\ud835\udd66\u0300adhlsu\u114b\u3878\u387d\u1372\u3891\u38a0own\xe1\u13b3arpoon\u0100lr\u3888\u388cef\xf4\u382digh\xf4\u382fi\u0180;hl\u3899\u389a\u389c\u43c5\xbb\u13faon\xbb\u389aparrows;\u61c8\u0180cit\u38b0\u38c4\u38c8\u026f\u38b6\0\0\u38c1rn\u0100;e\u38bc\u38bd\u631dr\xbb\u38bdop;\u630eng;\u416fri;\u65f9cr;\uc000\ud835\udcca\u0180dir\u38d9\u38dd\u38e2ot;\u62f0lde;\u4169i\u0100;f\u3730\u38e8\xbb\u1813\u0100am\u38ef\u38f2r\xf2\u38a8l\u803b\xfc\u40fcangle;\u69a7\u0780ABDacdeflnoprsz\u391c\u391f\u3929\u392d\u39b5\u39b8\u39bd\u39df\u39e4\u39e8\u39f3\u39f9\u39fd\u3a01\u3a20r\xf2\u03f7ar\u0100;v\u3926\u3927\u6ae8;\u6ae9as\xe8\u03e1\u0100nr\u3932\u3937grt;\u699c\u0380eknprst\u34e3\u3946\u394b\u3952\u395d\u3964\u3996app\xe1\u2415othin\xe7\u1e96\u0180hir\u34eb\u2ec8\u3959op\xf4\u2fb5\u0100;h\u13b7\u3962\xef\u318d\u0100iu\u3969\u396dgm\xe1\u33b3\u0100bp\u3972\u3984setneq\u0100;q\u397d\u3980\uc000\u228a\ufe00;\uc000\u2acb\ufe00setneq\u0100;q\u398f\u3992\uc000\u228b\ufe00;\uc000\u2acc\ufe00\u0100hr\u399b\u399fet\xe1\u369ciangle\u0100lr\u39aa\u39afeft\xbb\u0925ight\xbb\u1051y;\u4432ash\xbb\u1036\u0180elr\u39c4\u39d2\u39d7\u0180;be\u2dea\u39cb\u39cfar;\u62bbq;\u625alip;\u62ee\u0100bt\u39dc\u1468a\xf2\u1469r;\uc000\ud835\udd33tr\xe9\u39aesu\u0100bp\u39ef\u39f1\xbb\u0d1c\xbb\u0d59pf;\uc000\ud835\udd67ro\xf0\u0efbtr\xe9\u39b4\u0100cu\u3a06\u3a0br;\uc000\ud835\udccb\u0100bp\u3a10\u3a18n\u0100Ee\u3980\u3a16\xbb\u397en\u0100Ee\u3992\u3a1e\xbb\u3990igzag;\u699a\u0380cefoprs\u3a36\u3a3b\u3a56\u3a5b\u3a54\u3a61\u3a6airc;\u4175\u0100di\u3a40\u3a51\u0100bg\u3a45\u3a49ar;\u6a5fe\u0100;q\u15fa\u3a4f;\u6259erp;\u6118r;\uc000\ud835\udd34pf;\uc000\ud835\udd68\u0100;e\u1479\u3a66at\xe8\u1479cr;\uc000\ud835\udccc\u0ae3\u178e\u3a87\0\u3a8b\0\u3a90\u3a9b\0\0\u3a9d\u3aa8\u3aab\u3aaf\0\0\u3ac3\u3ace\0\u3ad8\u17dc\u17dftr\xe9\u17d1r;\uc000\ud835\udd35\u0100Aa\u3a94\u3a97r\xf2\u03c3r\xf2\u09f6;\u43be\u0100Aa\u3aa1\u3aa4r\xf2\u03b8r\xf2\u09eba\xf0\u2713is;\u62fb\u0180dpt\u17a4\u3ab5\u3abe\u0100fl\u3aba\u17a9;\uc000\ud835\udd69im\xe5\u17b2\u0100Aa\u3ac7\u3acar\xf2\u03cer\xf2\u0a01\u0100cq\u3ad2\u17b8r;\uc000\ud835\udccd\u0100pt\u17d6\u3adcr\xe9\u17d4\u0400acefiosu\u3af0\u3afd\u3b08\u3b0c\u3b11\u3b15\u3b1b\u3b21c\u0100uy\u3af6\u3afbte\u803b\xfd\u40fd;\u444f\u0100iy\u3b02\u3b06rc;\u4177;\u444bn\u803b\xa5\u40a5r;\uc000\ud835\udd36cy;\u4457pf;\uc000\ud835\udd6acr;\uc000\ud835\udcce\u0100cm\u3b26\u3b29y;\u444el\u803b\xff\u40ff\u0500acdefhiosw\u3b42\u3b48\u3b54\u3b58\u3b64\u3b69\u3b6d\u3b74\u3b7a\u3b80cute;\u417a\u0100ay\u3b4d\u3b52ron;\u417e;\u4437ot;\u417c\u0100et\u3b5d\u3b61tr\xe6\u155fa;\u43b6r;\uc000\ud835\udd37cy;\u4436grarr;\u61ddpf;\uc000\ud835\udd6bcr;\uc000\ud835\udccf\u0100jn\u3b85\u3b87;\u600dj;\u600c'.split("").map((t=>t.charCodeAt(0)))),w=new Uint16Array("\u0200aglq\t\x15\x18\x1b\u026d\x0f\0\0\x12p;\u4026os;\u4027t;\u403et;\u403cuot;\u4022".split("").map((t=>t.charCodeAt(0))));const v=new Map([[0,65533],[128,8364],[130,8218],[131,402],[132,8222],[133,8230],[134,8224],[135,8225],[136,710],[137,8240],[138,352],[139,8249],[140,338],[142,381],[145,8216],[146,8217],[147,8220],[148,8221],[149,8226],[150,8211],[151,8212],[152,732],[153,8482],[154,353],[155,8250],[156,339],[158,382],[159,376]]),z=null!==(k=String.fromCodePoint)&&void 0!==k?k:function(t){let e="";return t>65535&&(t-=65536,e+=String.fromCharCode(t>>>10&1023|55296),t=56320|1023&t),e+=String.fromCharCode(t),e};var S;!function(t){t[t.NUM=35]="NUM",t[t.SEMI=59]="SEMI",t[t.EQUALS=61]="EQUALS",t[t.ZERO=48]="ZERO",t[t.NINE=57]="NINE",t[t.LOWER_A=97]="LOWER_A",t[t.LOWER_F=102]="LOWER_F",t[t.LOWER_X=120]="LOWER_X",t[t.LOWER_Z=122]="LOWER_Z",t[t.UPPER_A=65]="UPPER_A",t[t.UPPER_F=70]="UPPER_F",t[t.UPPER_Z=90]="UPPER_Z"}(S||(S={}));var q,B,L;function I(t){return t>=S.ZERO&&t<=S.NINE}function M(t){return t>=S.UPPER_A&&t<=S.UPPER_F||t>=S.LOWER_A&&t<=S.LOWER_F}function T(t){return t===S.EQUALS||function(t){return t>=S.UPPER_A&&t<=S.UPPER_Z||t>=S.LOWER_A&&t<=S.LOWER_Z||I(t)}(t)}!function(t){t[t.VALUE_LENGTH=49152]="VALUE_LENGTH",t[t.BRANCH_LENGTH=16256]="BRANCH_LENGTH",t[t.JUMP_TABLE=127]="JUMP_TABLE"}(q||(q={})),function(t){t[t.EntityStart=0]="EntityStart",t[t.NumericStart=1]="NumericStart",t[t.NumericDecimal=2]="NumericDecimal",t[t.NumericHex=3]="NumericHex",t[t.NamedEntity=4]="NamedEntity"}(B||(B={})),function(t){t[t.Legacy=0]="Legacy",t[t.Strict=1]="Strict",t[t.Attribute=2]="Attribute"}(L||(L={}));class R{constructor(t,e,r){this.decodeTree=t,this.emitCodePoint=e,this.errors=r,this.state=B.EntityStart,this.consumed=1,this.result=0,this.treeIndex=0,this.excess=1,this.decodeMode=L.Strict}startEntity(t){this.decodeMode=t,this.state=B.EntityStart,this.result=0,this.treeIndex=0,this.excess=1,this.consumed=1}write(t,e){switch(this.state){case B.EntityStart:return t.charCodeAt(e)===S.NUM?(this.state=B.NumericStart,this.consumed+=1,this.stateNumericStart(t,e+1)):(this.state=B.NamedEntity,this.stateNamedEntity(t,e));case B.NumericStart:return this.stateNumericStart(t,e);case B.NumericDecimal:return this.stateNumericDecimal(t,e);case B.NumericHex:return this.stateNumericHex(t,e);case B.NamedEntity:return this.stateNamedEntity(t,e)}}stateNumericStart(t,e){return e>=t.length?-1:(32|t.charCodeAt(e))===S.LOWER_X?(this.state=B.NumericHex,this.consumed+=1,this.stateNumericHex(t,e+1)):(this.state=B.NumericDecimal,this.stateNumericDecimal(t,e))}addToNumericResult(t,e,r,n){if(e!==r){const s=r-e;this.result=this.result*Math.pow(n,s)+parseInt(t.substr(e,s),n),this.consumed+=s}}stateNumericHex(t,e){const r=e;for(;e<t.length;){const n=t.charCodeAt(e);if(!I(n)&&!M(n))return this.addToNumericResult(t,r,e,16),this.emitNumericEntity(n,3);e+=1}return this.addToNumericResult(t,r,e,16),-1}stateNumericDecimal(t,e){const r=e;for(;e<t.length;){const n=t.charCodeAt(e);if(!I(n))return this.addToNumericResult(t,r,e,10),this.emitNumericEntity(n,2);e+=1}return this.addToNumericResult(t,r,e,10),-1}emitNumericEntity(t,e){var r;if(this.consumed<=e)return null===(r=this.errors)||void 0===r||r.absenceOfDigitsInNumericCharacterReference(this.consumed),0;if(t===S.SEMI)this.consumed+=1;else if(this.decodeMode===L.Strict)return 0;return this.emitCodePoint(function(t){var e;return t>=55296&&t<=57343||t>1114111?65533:null!==(e=v.get(t))&&void 0!==e?e:t}(this.result),this.consumed),this.errors&&(t!==S.SEMI&&this.errors.missingSemicolonAfterCharacterReference(),this.errors.validateNumericCharacterReference(this.result)),this.consumed}stateNamedEntity(t,e){const{decodeTree:r}=this;let n=r[this.treeIndex],s=(n&q.VALUE_LENGTH)>>14;for(;e<t.length;e++,this.excess++){const i=t.charCodeAt(e);if(this.treeIndex=P(r,n,this.treeIndex+Math.max(1,s),i),this.treeIndex<0)return 0===this.result||this.decodeMode===L.Attribute&&(0===s||T(i))?0:this.emitNotTerminatedNamedEntity();if(n=r[this.treeIndex],s=(n&q.VALUE_LENGTH)>>14,0!==s){if(i===S.SEMI)return this.emitNamedEntityData(this.treeIndex,s,this.consumed+this.excess);this.decodeMode!==L.Strict&&(this.result=this.treeIndex,this.consumed+=this.excess,this.excess=0)}}return-1}emitNotTerminatedNamedEntity(){var t;const{result:e,decodeTree:r}=this,n=(r[e]&q.VALUE_LENGTH)>>14;return this.emitNamedEntityData(e,n,this.consumed),null===(t=this.errors)||void 0===t||t.missingSemicolonAfterCharacterReference(),this.consumed}emitNamedEntityData(t,e,r){const{decodeTree:n}=this;return this.emitCodePoint(1===e?n[t]&~q.VALUE_LENGTH:n[t+1],r),3===e&&this.emitCodePoint(n[t+2],r),r}end(){var t;switch(this.state){case B.NamedEntity:return 0===this.result||this.decodeMode===L.Attribute&&this.result!==this.treeIndex?0:this.emitNotTerminatedNamedEntity();case B.NumericDecimal:return this.emitNumericEntity(0,2);case B.NumericHex:return this.emitNumericEntity(0,3);case B.NumericStart:return null===(t=this.errors)||void 0===t||t.absenceOfDigitsInNumericCharacterReference(this.consumed),0;case B.EntityStart:return 0}}}function N(t){let e="";const r=new R(t,(t=>e+=z(t)));return function(t,n){let s=0,i=0;for(;(i=t.indexOf("&",i))>=0;){e+=t.slice(s,i),r.startEntity(n);const o=r.write(t,i+1);if(o<0){s=i+r.end();break}s=i+o,i=0===o?s+1:s}const o=e+t.slice(s);return e="",o}}function P(t,e,r,n){const s=(e&q.BRANCH_LENGTH)>>7,i=e&q.JUMP_TABLE;if(0===s)return 0!==i&&n===i?r:-1;if(i){const e=n-i;return e<0||e>=s?-1:t[r+e]-1}let o=r,u=o+s-1;for(;o<=u;){const e=o+u>>>1,r=t[e];if(r<n)o=e+1;else{if(!(r>n))return t[e+s];u=e-1}}return-1}const O=N(x);function j(t,e=L.Legacy){return O(t,e)}function Z(t){return"[object String]"===function(t){return Object.prototype.toString.call(t)}(t)}N(w);const $=Object.prototype.hasOwnProperty;function U(t){return Array.prototype.slice.call(arguments,1).forEach((function(e){if(e){if("object"!=typeof e)throw new TypeError(e+"must be object");Object.keys(e).forEach((function(r){t[r]=e[r]}))}})),t}function H(t,e,r){return[].concat(t.slice(0,e),r,t.slice(e+1))}function V(t){return!(t>=55296&&t<=57343)&&(!(t>=64976&&t<=65007)&&(!!(65535&~t&&65534!=(65535&t))&&(!(t>=0&&t<=8)&&(11!==t&&(!(t>=14&&t<=31)&&(!(t>=127&&t<=159)&&!(t>1114111)))))))}function G(t){if(t>65535){const e=55296+((t-=65536)>>10),r=56320+(1023&t);return String.fromCharCode(e,r)}return String.fromCharCode(t)}const W=/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,J=new RegExp(W.source+"|"+/&([a-z#][a-z0-9]{1,31});/gi.source,"gi"),Q=/^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;function X(t){return t.indexOf("\\")<0&&t.indexOf("&")<0?t:t.replace(J,(function(t,e,r){return e||function(t,e){if(35===e.charCodeAt(0)&&Q.test(e)){const r="x"===e[1].toLowerCase()?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return V(r)?G(r):t}const r=j(t);return r!==t?r:t}(t,r)}))}const Y=/[&<>"]/,K=/[&<>"]/g,tt={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"};function et(t){return tt[t]}function rt(t){return Y.test(t)?t.replace(K,et):t}const nt=/[.?*+^$[\]\\(){}|-]/g;function st(t){switch(t){case 9:case 32:return!0}return!1}function it(t){if(t>=8192&&t<=8202)return!0;switch(t){case 9:case 10:case 11:case 12:case 13:case 32:case 160:case 5760:case 8239:case 8287:case 12288:return!0}return!1}function ot(t){return E.test(t)||A.test(t)}function ut(t){switch(t){case 33:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 41:case 42:case 43:case 44:case 45:case 46:case 47:case 58:case 59:case 60:case 61:case 62:case 63:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 124:case 125:case 126:return!0;default:return!1}}function ct(t){return t=t.trim().replace(/\s+/g," "),"\u1e7e"==="\u1e9e".toLowerCase()&&(t=t.replace(/\u1e9e/g,"\xdf")),t.toLowerCase().toUpperCase()}const at={mdurl:D,ucmicro:F};var lt=Object.freeze({__proto__:null,arrayReplaceAt:H,assign:U,escapeHtml:rt,escapeRE:function(t){return t.replace(nt,"\\$&")},fromCodePoint:G,has:function(t,e){return $.call(t,e)},isMdAsciiPunct:ut,isPunctChar:ot,isSpace:st,isString:Z,isValidEntityCode:V,isWhiteSpace:it,lib:at,normalizeReference:ct,unescapeAll:X,unescapeMd:function(t){return t.indexOf("\\")<0?t:t.replace(W,"$1")}});var ht=Object.freeze({__proto__:null,parseLinkDestination:function(t,e,r){let n,s=e;const i={ok:!1,pos:0,str:""};if(60===t.charCodeAt(s)){for(s++;s<r;){if(n=t.charCodeAt(s),10===n)return i;if(60===n)return i;if(62===n)return i.pos=s+1,i.str=X(t.slice(e+1,s)),i.ok=!0,i;92===n&&s+1<r?s+=2:s++}return i}let o=0;for(;s<r&&(n=t.charCodeAt(s),32!==n)&&!(n<32||127===n);)if(92===n&&s+1<r){if(32===t.charCodeAt(s+1))break;s+=2}else{if(40===n&&(o++,o>32))return i;if(41===n){if(0===o)break;o--}s++}return e===s||0!==o||(i.str=X(t.slice(e,s)),i.pos=s,i.ok=!0),i},parseLinkLabel:function(t,e,r){let n,s,i,o;const u=t.posMax,c=t.pos;for(t.pos=e+1,n=1;t.pos<u;){if(i=t.src.charCodeAt(t.pos),93===i&&(n--,0===n)){s=!0;break}if(o=t.pos,t.md.inline.skipToken(t),91===i)if(o===t.pos-1)n++;else if(r)return t.pos=c,-1}let a=-1;return s&&(a=t.pos),t.pos=c,a},parseLinkTitle:function(t,e,r,n){let s,i=e;const o={ok:!1,can_continue:!1,pos:0,str:"",marker:0};if(n)o.str=n.str,o.marker=n.marker;else{if(i>=r)return o;let n=t.charCodeAt(i);if(34!==n&&39!==n&&40!==n)return o;e++,i++,40===n&&(n=41),o.marker=n}for(;i<r;){if(s=t.charCodeAt(i),s===o.marker)return o.pos=i+1,o.str+=X(t.slice(e,i)),o.ok=!0,o;if(40===s&&41===o.marker)return o;92===s&&i+1<r&&i++,i++}return o.can_continue=!0,o.str+=X(t.slice(e,i)),o}});const pt={};function ft(){this.rules=U({},pt)}function dt(){this.__rules__=[],this.__cache__=null}function _t(t,e,r){this.type=t,this.tag=e,this.attrs=null,this.map=null,this.nesting=r,this.level=0,this.children=null,this.content="",this.markup="",this.info="",this.meta=null,this.block=!1,this.hidden=!1}function mt(t,e,r){this.src=t,this.env=r,this.tokens=[],this.inlineMode=!1,this.md=e}pt.code_inline=function(t,e,r,n,s){const i=t[e];return"<code"+s.renderAttrs(i)+">"+rt(i.content)+"</code>"},pt.code_block=function(t,e,r,n,s){const i=t[e];return"<pre"+s.renderAttrs(i)+"><code>"+rt(t[e].content)+"</code></pre>\n"},pt.fence=function(t,e,r,n,s){const i=t[e],o=i.info?X(i.info).trim():"";let u,c="",a="";if(o){const t=o.split(/(\s+)/g);c=t[0],a=t.slice(2).join("")}if(u=r.highlight&&r.highlight(i.content,c,a)||rt(i.content),0===u.indexOf("<pre"))return u+"\n";if(o){const t=i.attrIndex("class"),e=i.attrs?i.attrs.slice():[];t<0?e.push(["class",r.langPrefix+c]):(e[t]=e[t].slice(),e[t][1]+=" "+r.langPrefix+c);const n={attrs:e};return`<pre><code${s.renderAttrs(n)}>${u}</code></pre>\n`}return`<pre><code${s.renderAttrs(i)}>${u}</code></pre>\n`},pt.image=function(t,e,r,n,s){const i=t[e];return i.attrs[i.attrIndex("alt")][1]=s.renderInlineAsText(i.children,r,n),s.renderToken(t,e,r)},pt.hardbreak=function(t,e,r){return r.xhtmlOut?"<br />\n":"<br>\n"},pt.softbreak=function(t,e,r){return r.breaks?r.xhtmlOut?"<br />\n":"<br>\n":"\n"},pt.text=function(t,e){return rt(t[e].content)},pt.html_block=function(t,e){return t[e].content},pt.html_inline=function(t,e){return t[e].content},ft.prototype.renderAttrs=function(t){let e,r,n;if(!t.attrs)return"";for(n="",e=0,r=t.attrs.length;e<r;e++)n+=" "+rt(t.attrs[e][0])+'="'+rt(t.attrs[e][1])+'"';return n},ft.prototype.renderToken=function(t,e,r){const n=t[e];let s="";if(n.hidden)return"";n.block&&-1!==n.nesting&&e&&t[e-1].hidden&&(s+="\n"),s+=(-1===n.nesting?"</":"<")+n.tag,s+=this.renderAttrs(n),0===n.nesting&&r.xhtmlOut&&(s+=" /");let i=!1;if(n.block&&(i=!0,1===n.nesting&&e+1<t.length)){const r=t[e+1];("inline"===r.type||r.hidden||-1===r.nesting&&r.tag===n.tag)&&(i=!1)}return s+=i?">\n":">",s},ft.prototype.renderInline=function(t,e,r){let n="";const s=this.rules;for(let i=0,o=t.length;i<o;i++){const o=t[i].type;void 0!==s[o]?n+=s[o](t,i,e,r,this):n+=this.renderToken(t,i,e)}return n},ft.prototype.renderInlineAsText=function(t,e,r){let n="";for(let s=0,i=t.length;s<i;s++)switch(t[s].type){case"text":case"html_inline":case"html_block":n+=t[s].content;break;case"image":n+=this.renderInlineAsText(t[s].children,e,r);break;case"softbreak":case"hardbreak":n+="\n"}return n},ft.prototype.render=function(t,e,r){let n="";const s=this.rules;for(let i=0,o=t.length;i<o;i++){const o=t[i].type;"inline"===o?n+=this.renderInline(t[i].children,e,r):void 0!==s[o]?n+=s[o](t,i,e,r,this):n+=this.renderToken(t,i,e,r)}return n},dt.prototype.__find__=function(t){for(let e=0;e<this.__rules__.length;e++)if(this.__rules__[e].name===t)return e;return-1},dt.prototype.__compile__=function(){const t=this,e=[""];t.__rules__.forEach((function(t){t.enabled&&t.alt.forEach((function(t){e.indexOf(t)<0&&e.push(t)}))})),t.__cache__={},e.forEach((function(e){t.__cache__[e]=[],t.__rules__.forEach((function(r){r.enabled&&(e&&r.alt.indexOf(e)<0||t.__cache__[e].push(r.fn))}))}))},dt.prototype.at=function(t,e,r){const n=this.__find__(t),s=r||{};if(-1===n)throw new Error("Parser rule not found: "+t);this.__rules__[n].fn=e,this.__rules__[n].alt=s.alt||[],this.__cache__=null},dt.prototype.before=function(t,e,r,n){const s=this.__find__(t),i=n||{};if(-1===s)throw new Error("Parser rule not found: "+t);this.__rules__.splice(s,0,{name:e,enabled:!0,fn:r,alt:i.alt||[]}),this.__cache__=null},dt.prototype.after=function(t,e,r,n){const s=this.__find__(t),i=n||{};if(-1===s)throw new Error("Parser rule not found: "+t);this.__rules__.splice(s+1,0,{name:e,enabled:!0,fn:r,alt:i.alt||[]}),this.__cache__=null},dt.prototype.push=function(t,e,r){const n=r||{};this.__rules__.push({name:t,enabled:!0,fn:e,alt:n.alt||[]}),this.__cache__=null},dt.prototype.enable=function(t,e){Array.isArray(t)||(t=[t]);const r=[];return t.forEach((function(t){const n=this.__find__(t);if(n<0){if(e)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[n].enabled=!0,r.push(t)}),this),this.__cache__=null,r},dt.prototype.enableOnly=function(t,e){Array.isArray(t)||(t=[t]),this.__rules__.forEach((function(t){t.enabled=!1})),this.enable(t,e)},dt.prototype.disable=function(t,e){Array.isArray(t)||(t=[t]);const r=[];return t.forEach((function(t){const n=this.__find__(t);if(n<0){if(e)return;throw new Error("Rules manager: invalid rule name "+t)}this.__rules__[n].enabled=!1,r.push(t)}),this),this.__cache__=null,r},dt.prototype.getRules=function(t){return null===this.__cache__&&this.__compile__(),this.__cache__[t]||[]},_t.prototype.attrIndex=function(t){if(!this.attrs)return-1;const e=this.attrs;for(let r=0,n=e.length;r<n;r++)if(e[r][0]===t)return r;return-1},_t.prototype.attrPush=function(t){this.attrs?this.attrs.push(t):this.attrs=[t]},_t.prototype.attrSet=function(t,e){const r=this.attrIndex(t),n=[t,e];r<0?this.attrPush(n):this.attrs[r]=n},_t.prototype.attrGet=function(t){const e=this.attrIndex(t);let r=null;return e>=0&&(r=this.attrs[e][1]),r},_t.prototype.attrJoin=function(t,e){const r=this.attrIndex(t);r<0?this.attrPush([t,e]):this.attrs[r][1]=this.attrs[r][1]+" "+e},mt.prototype.Token=_t;const gt=/\r\n?|\n/g,kt=/\0/g;function Dt(t){return/^<\/a\s*>/i.test(t)}const Ct=/\+-|\.\.|\?\?\?\?|!!!!|,,|--/,yt=/\((c|tm|r)\)/i,Et=/\((c|tm|r)\)/gi,At={c:"\xa9",r:"\xae",tm:"\u2122"};function bt(t,e){return At[e.toLowerCase()]}function Ft(t){let e=0;for(let r=t.length-1;r>=0;r--){const n=t[r];"text"!==n.type||e||(n.content=n.content.replace(Et,bt)),"link_open"===n.type&&"auto"===n.info&&e--,"link_close"===n.type&&"auto"===n.info&&e++}}function xt(t){let e=0;for(let r=t.length-1;r>=0;r--){const n=t[r];"text"!==n.type||e||Ct.test(n.content)&&(n.content=n.content.replace(/\+-/g,"\xb1").replace(/\.{2,}/g,"\u2026").replace(/([?!])\u2026/g,"$1..").replace(/([?!]){4,}/g,"$1$1$1").replace(/,{2,}/g,",").replace(/(^|[^-])---(?=[^-]|$)/gm,"$1\u2014").replace(/(^|\s)--(?=\s|$)/gm,"$1\u2013").replace(/(^|[^-\s])--(?=[^-\s]|$)/gm,"$1\u2013")),"link_open"===n.type&&"auto"===n.info&&e--,"link_close"===n.type&&"auto"===n.info&&e++}}const wt=/['"]/,vt=/['"]/g,zt="\u2019";function St(t,e,r){return t.slice(0,e)+r+t.slice(e+1)}function qt(t,e){let r;const n=[];for(let s=0;s<t.length;s++){const i=t[s],o=t[s].level;for(r=n.length-1;r>=0&&!(n[r].level<=o);r--);if(n.length=r+1,"text"!==i.type)continue;let u=i.content,c=0,a=u.length;t:for(;c<a;){vt.lastIndex=c;const l=vt.exec(u);if(!l)break;let h=!0,p=!0;c=l.index+1;const f="'"===l[0];let d=32;if(l.index-1>=0)d=u.charCodeAt(l.index-1);else for(r=s-1;r>=0&&("softbreak"!==t[r].type&&"hardbreak"!==t[r].type);r--)if(t[r].content){d=t[r].content.charCodeAt(t[r].content.length-1);break}let _=32;if(c<a)_=u.charCodeAt(c);else for(r=s+1;r<t.length&&("softbreak"!==t[r].type&&"hardbreak"!==t[r].type);r++)if(t[r].content){_=t[r].content.charCodeAt(0);break}const m=ut(d)||ot(String.fromCharCode(d)),g=ut(_)||ot(String.fromCharCode(_)),k=it(d),D=it(_);if(D?h=!1:g&&(k||m||(h=!1)),k?p=!1:m&&(D||g||(p=!1)),34===_&&'"'===l[0]&&d>=48&&d<=57&&(p=h=!1),h&&p&&(h=m,p=g),h||p){if(p)for(r=n.length-1;r>=0;r--){let h=n[r];if(n[r].level<o)break;if(h.single===f&&n[r].level===o){let o,p;h=n[r],f?(o=e.md.options.quotes[2],p=e.md.options.quotes[3]):(o=e.md.options.quotes[0],p=e.md.options.quotes[1]),i.content=St(i.content,l.index,p),t[h.token].content=St(t[h.token].content,h.pos,o),c+=p.length-1,h.token===s&&(c+=o.length-1),u=i.content,a=u.length,n.length=r;continue t}}h?n.push({token:s,pos:l.index,single:f,level:o}):p&&f&&(i.content=St(i.content,l.index,zt))}else f&&(i.content=St(i.content,l.index,zt))}}}const Bt=[["normalize",function(t){let e;e=t.src.replace(gt,"\n"),e=e.replace(kt,"\ufffd"),t.src=e}],["block",function(t){let e;t.inlineMode?(e=new t.Token("inline","",0),e.content=t.src,e.map=[0,1],e.children=[],t.tokens.push(e)):t.md.block.parse(t.src,t.md,t.env,t.tokens)}],["inline",function(t){const e=t.tokens;for(let r=0,n=e.length;r<n;r++){const n=e[r];"inline"===n.type&&t.md.inline.parse(n.content,t.md,t.env,n.children)}}],["linkify",function(t){const e=t.tokens;var r;if(t.md.options.linkify)for(let n=0,s=e.length;n<s;n++){if("inline"!==e[n].type||!t.md.linkify.pretest(e[n].content))continue;let s=e[n].children,i=0;for(let o=s.length-1;o>=0;o--){const u=s[o];if("link_close"!==u.type){if("html_inline"===u.type&&(r=u.content,/^<a[>\s]/i.test(r)&&i>0&&i--,Dt(u.content)&&i++),!(i>0)&&"text"===u.type&&t.md.linkify.test(u.content)){const r=u.content;let i=t.md.linkify.match(r);const c=[];let a=u.level,l=0;i.length>0&&0===i[0].index&&o>0&&"text_special"===s[o-1].type&&(i=i.slice(1));for(let e=0;e<i.length;e++){const n=i[e].url,s=t.md.normalizeLink(n);if(!t.md.validateLink(s))continue;let o=i[e].text;o=i[e].schema?"mailto:"!==i[e].schema||/^mailto:/i.test(o)?t.md.normalizeLinkText(o):t.md.normalizeLinkText("mailto:"+o).replace(/^mailto:/,""):t.md.normalizeLinkText("http://"+o).replace(/^http:\/\//,"");const u=i[e].index;if(u>l){const e=new t.Token("text","",0);e.content=r.slice(l,u),e.level=a,c.push(e)}const h=new t.Token("link_open","a",1);h.attrs=[["href",s]],h.level=a++,h.markup="linkify",h.info="auto",c.push(h);const p=new t.Token("text","",0);p.content=o,p.level=a,c.push(p);const f=new t.Token("link_close","a",-1);f.level=--a,f.markup="linkify",f.info="auto",c.push(f),l=i[e].lastIndex}if(l<r.length){const e=new t.Token("text","",0);e.content=r.slice(l),e.level=a,c.push(e)}e[n].children=s=H(s,o,c)}}else for(o--;s[o].level!==u.level&&"link_open"!==s[o].type;)o--}}}],["replacements",function(t){let e;if(t.md.options.typographer)for(e=t.tokens.length-1;e>=0;e--)"inline"===t.tokens[e].type&&(yt.test(t.tokens[e].content)&&Ft(t.tokens[e].children),Ct.test(t.tokens[e].content)&&xt(t.tokens[e].children))}],["smartquotes",function(t){if(t.md.options.typographer)for(let e=t.tokens.length-1;e>=0;e--)"inline"===t.tokens[e].type&&wt.test(t.tokens[e].content)&&qt(t.tokens[e].children,t)}],["text_join",function(t){let e,r;const n=t.tokens,s=n.length;for(let t=0;t<s;t++){if("inline"!==n[t].type)continue;const s=n[t].children,i=s.length;for(e=0;e<i;e++)"text_special"===s[e].type&&(s[e].type="text");for(e=r=0;e<i;e++)"text"===s[e].type&&e+1<i&&"text"===s[e+1].type?s[e+1].content=s[e].content+s[e+1].content:(e!==r&&(s[r]=s[e]),r++);e!==r&&(s.length=r)}}]];function Lt(){this.ruler=new dt;for(let t=0;t<Bt.length;t++)this.ruler.push(Bt[t][0],Bt[t][1])}function It(t,e,r,n){this.src=t,this.md=e,this.env=r,this.tokens=n,this.bMarks=[],this.eMarks=[],this.tShift=[],this.sCount=[],this.bsCount=[],this.blkIndent=0,this.line=0,this.lineMax=0,this.tight=!1,this.ddIndent=-1,this.listIndent=-1,this.parentType="root",this.level=0;const s=this.src;for(let t=0,e=0,r=0,n=0,i=s.length,o=!1;e<i;e++){const u=s.charCodeAt(e);if(!o){if(st(u)){r++,9===u?n+=4-n%4:n++;continue}o=!0}10!==u&&e!==i-1||(10!==u&&e++,this.bMarks.push(t),this.eMarks.push(e),this.tShift.push(r),this.sCount.push(n),this.bsCount.push(0),o=!1,r=0,n=0,t=e+1)}this.bMarks.push(s.length),this.eMarks.push(s.length),this.tShift.push(0),this.sCount.push(0),this.bsCount.push(0),this.lineMax=this.bMarks.length-1}Lt.prototype.process=function(t){const e=this.ruler.getRules("");for(let r=0,n=e.length;r<n;r++)e[r](t)},Lt.prototype.State=mt,It.prototype.push=function(t,e,r){const n=new _t(t,e,r);return n.block=!0,r<0&&this.level--,n.level=this.level,r>0&&this.level++,this.tokens.push(n),n},It.prototype.isEmpty=function(t){return this.bMarks[t]+this.tShift[t]>=this.eMarks[t]},It.prototype.skipEmptyLines=function(t){for(let e=this.lineMax;t<e&&!(this.bMarks[t]+this.tShift[t]<this.eMarks[t]);t++);return t},It.prototype.skipSpaces=function(t){for(let e=this.src.length;t<e;t++){if(!st(this.src.charCodeAt(t)))break}return t},It.prototype.skipSpacesBack=function(t,e){if(t<=e)return t;for(;t>e;)if(!st(this.src.charCodeAt(--t)))return t+1;return t},It.prototype.skipChars=function(t,e){for(let r=this.src.length;t<r&&this.src.charCodeAt(t)===e;t++);return t},It.prototype.skipCharsBack=function(t,e,r){if(t<=r)return t;for(;t>r;)if(e!==this.src.charCodeAt(--t))return t+1;return t},It.prototype.getLines=function(t,e,r,n){if(t>=e)return"";const s=new Array(e-t);for(let i=0,o=t;o<e;o++,i++){let t=0;const u=this.bMarks[o];let c,a=u;for(c=o+1<e||n?this.eMarks[o]+1:this.eMarks[o];a<c&&t<r;){const e=this.src.charCodeAt(a);if(st(e))9===e?t+=4-(t+this.bsCount[o])%4:t++;else{if(!(a-u<this.tShift[o]))break;t++}a++}s[i]=t>r?new Array(t-r+1).join(" ")+this.src.slice(a,c):this.src.slice(a,c)}return s.join("")},It.prototype.Token=_t;function Mt(t,e){const r=t.bMarks[e]+t.tShift[e],n=t.eMarks[e];return t.src.slice(r,n)}function Tt(t){const e=[],r=t.length;let n=0,s=t.charCodeAt(n),i=!1,o=0,u="";for(;n<r;)124===s&&(i?(u+=t.substring(o,n-1),o=n):(e.push(u+t.substring(o,n)),u="",o=n+1)),i=92===s,n++,s=t.charCodeAt(n);return e.push(u+t.substring(o)),e}function Rt(t,e){const r=t.eMarks[e];let n=t.bMarks[e]+t.tShift[e];const s=t.src.charCodeAt(n++);if(42!==s&&45!==s&&43!==s)return-1;if(n<r){if(!st(t.src.charCodeAt(n)))return-1}return n}function Nt(t,e){const r=t.bMarks[e]+t.tShift[e],n=t.eMarks[e];let s=r;if(s+1>=n)return-1;let i=t.src.charCodeAt(s++);if(i<48||i>57)return-1;for(;;){if(s>=n)return-1;if(i=t.src.charCodeAt(s++),!(i>=48&&i<=57)){if(41===i||46===i)break;return-1}if(s-r>=10)return-1}return s<n&&(i=t.src.charCodeAt(s),!st(i))?-1:s}const Pt="<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^\"'=<>`\\x00-\\x20]+|'[^']*'|\"[^\"]*\"))?)*\\s*\\/?>",Ot="<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>",jt=new RegExp("^(?:"+Pt+"|"+Ot+"|\x3c!---?>|\x3c!--(?:[^-]|-[^-]|--[^>])*--\x3e|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)"),Zt=new RegExp("^(?:"+Pt+"|"+Ot+")"),$t=[[/^<(script|pre|style|textarea)(?=(\s|>|$))/i,/<\/(script|pre|style|textarea)>/i,!0],[/^<!--/,/-->/,!0],[/^<\?/,/\?>/,!0],[/^<![A-Z]/,/>/,!0],[/^<!\[CDATA\[/,/\]\]>/,!0],[new RegExp("^</?("+["address","article","aside","base","basefont","blockquote","body","caption","center","col","colgroup","dd","details","dialog","dir","div","dl","dt","fieldset","figcaption","figure","footer","form","frame","frameset","h1","h2","h3","h4","h5","h6","head","header","hr","html","iframe","legend","li","link","main","menu","menuitem","nav","noframes","ol","optgroup","option","p","param","search","section","summary","table","tbody","td","tfoot","th","thead","title","tr","track","ul"].join("|")+")(?=(\\s|/?>|$))","i"),/^$/,!0],[new RegExp(Zt.source+"\\s*$"),/^$/,!1]];const Ut=[["table",function(t,e,r,n){if(e+2>r)return!1;let s=e+1;if(t.sCount[s]<t.blkIndent)return!1;if(t.sCount[s]-t.blkIndent>=4)return!1;let i=t.bMarks[s]+t.tShift[s];if(i>=t.eMarks[s])return!1;const o=t.src.charCodeAt(i++);if(124!==o&&45!==o&&58!==o)return!1;if(i>=t.eMarks[s])return!1;const u=t.src.charCodeAt(i++);if(124!==u&&45!==u&&58!==u&&!st(u))return!1;if(45===o&&st(u))return!1;for(;i<t.eMarks[s];){const e=t.src.charCodeAt(i);if(124!==e&&45!==e&&58!==e&&!st(e))return!1;i++}let c=Mt(t,e+1),a=c.split("|");const l=[];for(let t=0;t<a.length;t++){const e=a[t].trim();if(!e){if(0===t||t===a.length-1)continue;return!1}if(!/^:?-+:?$/.test(e))return!1;58===e.charCodeAt(e.length-1)?l.push(58===e.charCodeAt(0)?"center":"right"):58===e.charCodeAt(0)?l.push("left"):l.push("")}if(c=Mt(t,e).trim(),-1===c.indexOf("|"))return!1;if(t.sCount[e]-t.blkIndent>=4)return!1;a=Tt(c),a.length&&""===a[0]&&a.shift(),a.length&&""===a[a.length-1]&&a.pop();const h=a.length;if(0===h||h!==l.length)return!1;if(n)return!0;const p=t.parentType;t.parentType="table";const f=t.md.block.ruler.getRules("blockquote"),d=[e,0];t.push("table_open","table",1).map=d,t.push("thead_open","thead",1).map=[e,e+1],t.push("tr_open","tr",1).map=[e,e+1];for(let e=0;e<a.length;e++){const r=t.push("th_open","th",1);l[e]&&(r.attrs=[["style","text-align:"+l[e]]]);const n=t.push("inline","",0);n.content=a[e].trim(),n.children=[],t.push("th_close","th",-1)}let _;t.push("tr_close","tr",-1),t.push("thead_close","thead",-1);let m=0;for(s=e+2;s<r&&!(t.sCount[s]<t.blkIndent);s++){let n=!1;for(let e=0,i=f.length;e<i;e++)if(f[e](t,s,r,!0)){n=!0;break}if(n)break;if(c=Mt(t,s).trim(),!c)break;if(t.sCount[s]-t.blkIndent>=4)break;if(a=Tt(c),a.length&&""===a[0]&&a.shift(),a.length&&""===a[a.length-1]&&a.pop(),m+=h-a.length,m>65536)break;if(s===e+2){t.push("tbody_open","tbody",1).map=_=[e+2,0]}t.push("tr_open","tr",1).map=[s,s+1];for(let e=0;e<h;e++){const r=t.push("td_open","td",1);l[e]&&(r.attrs=[["style","text-align:"+l[e]]]);const n=t.push("inline","",0);n.content=a[e]?a[e].trim():"",n.children=[],t.push("td_close","td",-1)}t.push("tr_close","tr",-1)}return _&&(t.push("tbody_close","tbody",-1),_[1]=s),t.push("table_close","table",-1),d[1]=s,t.parentType=p,t.line=s,!0},["paragraph","reference"]],["code",function(t,e,r){if(t.sCount[e]-t.blkIndent<4)return!1;let n=e+1,s=n;for(;n<r;)if(t.isEmpty(n))n++;else{if(!(t.sCount[n]-t.blkIndent>=4))break;n++,s=n}t.line=s;const i=t.push("code_block","code",0);return i.content=t.getLines(e,s,4+t.blkIndent,!1)+"\n",i.map=[e,t.line],!0}],["fence",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;if(s+3>i)return!1;const o=t.src.charCodeAt(s);if(126!==o&&96!==o)return!1;let u=s;s=t.skipChars(s,o);let c=s-u;if(c<3)return!1;const a=t.src.slice(u,s),l=t.src.slice(s,i);if(96===o&&l.indexOf(String.fromCharCode(o))>=0)return!1;if(n)return!0;let h=e,p=!1;for(;(h++,!(h>=r))&&(s=u=t.bMarks[h]+t.tShift[h],i=t.eMarks[h],!(s<i&&t.sCount[h]<t.blkIndent));)if(t.src.charCodeAt(s)===o&&!(t.sCount[h]-t.blkIndent>=4||(s=t.skipChars(s,o),s-u<c||(s=t.skipSpaces(s),s<i)))){p=!0;break}c=t.sCount[e],t.line=h+(p?1:0);const f=t.push("fence","code",0);return f.info=l,f.content=t.getLines(e+1,h,c,!0),f.markup=a,f.map=[e,t.line],!0},["paragraph","reference","blockquote","list"]],["blockquote",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];const o=t.lineMax;if(t.sCount[e]-t.blkIndent>=4)return!1;if(62!==t.src.charCodeAt(s))return!1;if(n)return!0;const u=[],c=[],a=[],l=[],h=t.md.block.ruler.getRules("blockquote"),p=t.parentType;t.parentType="blockquote";let f,d=!1;for(f=e;f<r;f++){const e=t.sCount[f]<t.blkIndent;if(s=t.bMarks[f]+t.tShift[f],i=t.eMarks[f],s>=i)break;if(62===t.src.charCodeAt(s++)&&!e){let e,r,n=t.sCount[f]+1;32===t.src.charCodeAt(s)?(s++,n++,r=!1,e=!0):9===t.src.charCodeAt(s)?(e=!0,(t.bsCount[f]+n)%4==3?(s++,n++,r=!1):r=!0):e=!1;let o=n;for(u.push(t.bMarks[f]),t.bMarks[f]=s;s<i;){const e=t.src.charCodeAt(s);if(!st(e))break;9===e?o+=4-(o+t.bsCount[f]+(r?1:0))%4:o++,s++}d=s>=i,c.push(t.bsCount[f]),t.bsCount[f]=t.sCount[f]+1+(e?1:0),a.push(t.sCount[f]),t.sCount[f]=o-n,l.push(t.tShift[f]),t.tShift[f]=s-t.bMarks[f];continue}if(d)break;let n=!1;for(let e=0,s=h.length;e<s;e++)if(h[e](t,f,r,!0)){n=!0;break}if(n){t.lineMax=f,0!==t.blkIndent&&(u.push(t.bMarks[f]),c.push(t.bsCount[f]),l.push(t.tShift[f]),a.push(t.sCount[f]),t.sCount[f]-=t.blkIndent);break}u.push(t.bMarks[f]),c.push(t.bsCount[f]),l.push(t.tShift[f]),a.push(t.sCount[f]),t.sCount[f]=-1}const _=t.blkIndent;t.blkIndent=0;const m=t.push("blockquote_open","blockquote",1);m.markup=">";const g=[e,0];m.map=g,t.md.block.tokenize(t,e,f),t.push("blockquote_close","blockquote",-1).markup=">",t.lineMax=o,t.parentType=p,g[1]=t.line;for(let r=0;r<l.length;r++)t.bMarks[r+e]=u[r],t.tShift[r+e]=l[r],t.sCount[r+e]=a[r],t.bsCount[r+e]=c[r];return t.blkIndent=_,!0},["paragraph","reference","blockquote","list"]],["hr",function(t,e,r,n){const s=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;let i=t.bMarks[e]+t.tShift[e];const o=t.src.charCodeAt(i++);if(42!==o&&45!==o&&95!==o)return!1;let u=1;for(;i<s;){const e=t.src.charCodeAt(i++);if(e!==o&&!st(e))return!1;e===o&&u++}if(u<3)return!1;if(n)return!0;t.line=e+1;const c=t.push("hr","hr",0);return c.map=[e,t.line],c.markup=Array(u+1).join(String.fromCharCode(o)),!0},["paragraph","reference","blockquote","list"]],["list",function(t,e,r,n){let s,i,o,u,c=e,a=!0;if(t.sCount[c]-t.blkIndent>=4)return!1;if(t.listIndent>=0&&t.sCount[c]-t.listIndent>=4&&t.sCount[c]<t.blkIndent)return!1;let l,h,p,f=!1;if(n&&"paragraph"===t.parentType&&t.sCount[c]>=t.blkIndent&&(f=!0),(p=Nt(t,c))>=0){if(l=!0,o=t.bMarks[c]+t.tShift[c],h=Number(t.src.slice(o,p-1)),f&&1!==h)return!1}else{if(!((p=Rt(t,c))>=0))return!1;l=!1}if(f&&t.skipSpaces(p)>=t.eMarks[c])return!1;if(n)return!0;const d=t.src.charCodeAt(p-1),_=t.tokens.length;l?(u=t.push("ordered_list_open","ol",1),1!==h&&(u.attrs=[["start",h]])):u=t.push("bullet_list_open","ul",1);const m=[c,0];u.map=m,u.markup=String.fromCharCode(d);let g=!1;const k=t.md.block.ruler.getRules("list"),D=t.parentType;for(t.parentType="list";c<r;){i=p,s=t.eMarks[c];const e=t.sCount[c]+p-(t.bMarks[c]+t.tShift[c]);let n=e;for(;i<s;){const e=t.src.charCodeAt(i);if(9===e)n+=4-(n+t.bsCount[c])%4;else{if(32!==e)break;n++}i++}const h=i;let f;f=h>=s?1:n-e,f>4&&(f=1);const _=e+f;u=t.push("list_item_open","li",1),u.markup=String.fromCharCode(d);const m=[c,0];u.map=m,l&&(u.info=t.src.slice(o,p-1));const D=t.tight,C=t.tShift[c],y=t.sCount[c],E=t.listIndent;if(t.listIndent=t.blkIndent,t.blkIndent=_,t.tight=!0,t.tShift[c]=h-t.bMarks[c],t.sCount[c]=n,h>=s&&t.isEmpty(c+1)?t.line=Math.min(t.line+2,r):t.md.block.tokenize(t,c,r,!0),t.tight&&!g||(a=!1),g=t.line-c>1&&t.isEmpty(t.line-1),t.blkIndent=t.listIndent,t.listIndent=E,t.tShift[c]=C,t.sCount[c]=y,t.tight=D,u=t.push("list_item_close","li",-1),u.markup=String.fromCharCode(d),c=t.line,m[1]=c,c>=r)break;if(t.sCount[c]<t.blkIndent)break;if(t.sCount[c]-t.blkIndent>=4)break;let A=!1;for(let e=0,n=k.length;e<n;e++)if(k[e](t,c,r,!0)){A=!0;break}if(A)break;if(l){if(p=Nt(t,c),p<0)break;o=t.bMarks[c]+t.tShift[c]}else if(p=Rt(t,c),p<0)break;if(d!==t.src.charCodeAt(p-1))break}return u=l?t.push("ordered_list_close","ol",-1):t.push("bullet_list_close","ul",-1),u.markup=String.fromCharCode(d),m[1]=c,t.line=c,t.parentType=D,a&&function(t,e){const r=t.level+2;for(let n=e+2,s=t.tokens.length-2;n<s;n++)t.tokens[n].level===r&&"paragraph_open"===t.tokens[n].type&&(t.tokens[n+2].hidden=!0,t.tokens[n].hidden=!0,n+=2)}(t,_),!0},["paragraph","reference","blockquote"]],["reference",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e],o=e+1;if(t.sCount[e]-t.blkIndent>=4)return!1;if(91!==t.src.charCodeAt(s))return!1;function u(e){const r=t.lineMax;if(e>=r||t.isEmpty(e))return null;let n=!1;if(t.sCount[e]-t.blkIndent>3&&(n=!0),t.sCount[e]<0&&(n=!0),!n){const n=t.md.block.ruler.getRules("reference"),s=t.parentType;t.parentType="reference";let i=!1;for(let s=0,o=n.length;s<o;s++)if(n[s](t,e,r,!0)){i=!0;break}if(t.parentType=s,i)return null}const s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];return t.src.slice(s,i+1)}let c=t.src.slice(s,i+1);i=c.length;let a=-1;for(s=1;s<i;s++){const t=c.charCodeAt(s);if(91===t)return!1;if(93===t){a=s;break}if(10===t){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}else if(92===t&&(s++,s<i&&10===c.charCodeAt(s))){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}}if(a<0||58!==c.charCodeAt(a+1))return!1;for(s=a+2;s<i;s++){const t=c.charCodeAt(s);if(10===t){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}else if(!st(t))break}const l=t.md.helpers.parseLinkDestination(c,s,i);if(!l.ok)return!1;const h=t.md.normalizeLink(l.str);if(!t.md.validateLink(h))return!1;s=l.pos;const p=s,f=o,d=s;for(;s<i;s++){const t=c.charCodeAt(s);if(10===t){const t=u(o);null!==t&&(c+=t,i=c.length,o++)}else if(!st(t))break}let _,m=t.md.helpers.parseLinkTitle(c,s,i);for(;m.can_continue;){const e=u(o);if(null===e)break;c+=e,s=i,i=c.length,o++,m=t.md.helpers.parseLinkTitle(c,s,i,m)}for(s<i&&d!==s&&m.ok?(_=m.str,s=m.pos):(_="",s=p,o=f);s<i;){if(!st(c.charCodeAt(s)))break;s++}if(s<i&&10!==c.charCodeAt(s)&&_)for(_="",s=p,o=f;s<i;){if(!st(c.charCodeAt(s)))break;s++}if(s<i&&10!==c.charCodeAt(s))return!1;const g=ct(c.slice(1,a));return!!g&&(n||(void 0===t.env.references&&(t.env.references={}),void 0===t.env.references[g]&&(t.env.references[g]={title:_,href:h}),t.line=o),!0)}],["html_block",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;if(!t.md.options.html)return!1;if(60!==t.src.charCodeAt(s))return!1;let o=t.src.slice(s,i),u=0;for(;u<$t.length&&!$t[u][0].test(o);u++);if(u===$t.length)return!1;if(n)return $t[u][2];let c=e+1;if(!$t[u][1].test(o))for(;c<r&&!(t.sCount[c]<t.blkIndent);c++)if(s=t.bMarks[c]+t.tShift[c],i=t.eMarks[c],o=t.src.slice(s,i),$t[u][1].test(o)){0!==o.length&&c++;break}t.line=c;const a=t.push("html_block","",0);return a.map=[e,c],a.content=t.getLines(e,c,t.blkIndent,!0),!0},["paragraph","reference","blockquote"]],["heading",function(t,e,r,n){let s=t.bMarks[e]+t.tShift[e],i=t.eMarks[e];if(t.sCount[e]-t.blkIndent>=4)return!1;let o=t.src.charCodeAt(s);if(35!==o||s>=i)return!1;let u=1;for(o=t.src.charCodeAt(++s);35===o&&s<i&&u<=6;)u++,o=t.src.charCodeAt(++s);if(u>6||s<i&&!st(o))return!1;if(n)return!0;i=t.skipSpacesBack(i,s);const c=t.skipCharsBack(i,35,s);c>s&&st(t.src.charCodeAt(c-1))&&(i=c),t.line=e+1;const a=t.push("heading_open","h"+String(u),1);a.markup="########".slice(0,u),a.map=[e,t.line];const l=t.push("inline","",0);return l.content=t.src.slice(s,i).trim(),l.map=[e,t.line],l.children=[],t.push("heading_close","h"+String(u),-1).markup="########".slice(0,u),!0},["paragraph","reference","blockquote"]],["lheading",function(t,e,r){const n=t.md.block.ruler.getRules("paragraph");if(t.sCount[e]-t.blkIndent>=4)return!1;const s=t.parentType;t.parentType="paragraph";let i,o=0,u=e+1;for(;u<r&&!t.isEmpty(u);u++){if(t.sCount[u]-t.blkIndent>3)continue;if(t.sCount[u]>=t.blkIndent){let e=t.bMarks[u]+t.tShift[u];const r=t.eMarks[u];if(e<r&&(i=t.src.charCodeAt(e),(45===i||61===i)&&(e=t.skipChars(e,i),e=t.skipSpaces(e),e>=r))){o=61===i?1:2;break}}if(t.sCount[u]<0)continue;let e=!1;for(let s=0,i=n.length;s<i;s++)if(n[s](t,u,r,!0)){e=!0;break}if(e)break}if(!o)return!1;const c=t.getLines(e,u,t.blkIndent,!1).trim();t.line=u+1;const a=t.push("heading_open","h"+String(o),1);a.markup=String.fromCharCode(i),a.map=[e,t.line];const l=t.push("inline","",0);return l.content=c,l.map=[e,t.line-1],l.children=[],t.push("heading_close","h"+String(o),-1).markup=String.fromCharCode(i),t.parentType=s,!0}],["paragraph",function(t,e,r){const n=t.md.block.ruler.getRules("paragraph"),s=t.parentType;let i=e+1;for(t.parentType="paragraph";i<r&&!t.isEmpty(i);i++){if(t.sCount[i]-t.blkIndent>3)continue;if(t.sCount[i]<0)continue;let e=!1;for(let s=0,o=n.length;s<o;s++)if(n[s](t,i,r,!0)){e=!0;break}if(e)break}const o=t.getLines(e,i,t.blkIndent,!1).trim();t.line=i,t.push("paragraph_open","p",1).map=[e,t.line];const u=t.push("inline","",0);return u.content=o,u.map=[e,t.line],u.children=[],t.push("paragraph_close","p",-1),t.parentType=s,!0}]];function Ht(){this.ruler=new dt;for(let t=0;t<Ut.length;t++)this.ruler.push(Ut[t][0],Ut[t][1],{alt:(Ut[t][2]||[]).slice()})}function Vt(t,e,r,n){this.src=t,this.env=r,this.md=e,this.tokens=n,this.tokens_meta=Array(n.length),this.pos=0,this.posMax=this.src.length,this.level=0,this.pending="",this.pendingLevel=0,this.cache={},this.delimiters=[],this._prev_delimiters=[],this.backticks={},this.backticksScanned=!1,this.linkLevel=0}function Gt(t){switch(t){case 10:case 33:case 35:case 36:case 37:case 38:case 42:case 43:case 45:case 58:case 60:case 61:case 62:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 125:case 126:return!0;default:return!1}}Ht.prototype.tokenize=function(t,e,r){const n=this.ruler.getRules(""),s=n.length,i=t.md.options.maxNesting;let o=e,u=!1;for(;o<r&&(t.line=o=t.skipEmptyLines(o),!(o>=r))&&!(t.sCount[o]<t.blkIndent);){if(t.level>=i){t.line=r;break}const e=t.line;let c=!1;for(let i=0;i<s;i++)if(c=n[i](t,o,r,!1),c){if(e>=t.line)throw new Error("block rule didn't increment state.line");break}if(!c)throw new Error("none of the block rules matched");t.tight=!u,t.isEmpty(t.line-1)&&(u=!0),o=t.line,o<r&&t.isEmpty(o)&&(u=!0,o++,t.line=o)}},Ht.prototype.parse=function(t,e,r,n){if(!t)return;const s=new this.State(t,e,r,n);this.tokenize(s,s.line,s.lineMax)},Ht.prototype.State=It,Vt.prototype.pushPending=function(){const t=new _t("text","",0);return t.content=this.pending,t.level=this.pendingLevel,this.tokens.push(t),this.pending="",t},Vt.prototype.push=function(t,e,r){this.pending&&this.pushPending();const n=new _t(t,e,r);let s=null;return r<0&&(this.level--,this.delimiters=this._prev_delimiters.pop()),n.level=this.level,r>0&&(this.level++,this._prev_delimiters.push(this.delimiters),this.delimiters=[],s={delimiters:this.delimiters}),this.pendingLevel=this.level,this.tokens.push(n),this.tokens_meta.push(s),n},Vt.prototype.scanDelims=function(t,e){const r=this.posMax,n=this.src.charCodeAt(t),s=t>0?this.src.charCodeAt(t-1):32;let i=t;for(;i<r&&this.src.charCodeAt(i)===n;)i++;const o=i-t,u=i<r?this.src.charCodeAt(i):32,c=ut(s)||ot(String.fromCharCode(s)),a=ut(u)||ot(String.fromCharCode(u)),l=it(s),h=it(u),p=!h&&(!a||l||c),f=!l&&(!c||h||a);return{can_open:p&&(e||!f||c),can_close:f&&(e||!p||a),length:o}},Vt.prototype.Token=_t;const Wt=/(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i;const Jt=[];for(let t=0;t<256;t++)Jt.push(0);function Qt(t,e){let r;const n=[],s=e.length;for(let i=0;i<s;i++){const s=e[i];if(126!==s.marker)continue;if(-1===s.end)continue;const o=e[s.end];r=t.tokens[s.token],r.type="s_open",r.tag="s",r.nesting=1,r.markup="~~",r.content="",r=t.tokens[o.token],r.type="s_close",r.tag="s",r.nesting=-1,r.markup="~~",r.content="","text"===t.tokens[o.token-1].type&&"~"===t.tokens[o.token-1].content&&n.push(o.token-1)}for(;n.length;){const e=n.pop();let s=e+1;for(;s<t.tokens.length&&"s_close"===t.tokens[s].type;)s++;s--,e!==s&&(r=t.tokens[s],t.tokens[s]=t.tokens[e],t.tokens[e]=r)}}"\\!\"#$%&'()*+,./:;<=>?@[]^_`{|}~-".split("").forEach((function(t){Jt[t.charCodeAt(0)]=1}));var Xt={tokenize:function(t,e){const r=t.pos,n=t.src.charCodeAt(r);if(e)return!1;if(126!==n)return!1;const s=t.scanDelims(t.pos,!0);let i=s.length;const o=String.fromCharCode(n);if(i<2)return!1;let u;i%2&&(u=t.push("text","",0),u.content=o,i--);for(let e=0;e<i;e+=2)u=t.push("text","",0),u.content=o+o,t.delimiters.push({marker:n,length:0,token:t.tokens.length-1,end:-1,open:s.can_open,close:s.can_close});return t.pos+=s.length,!0},postProcess:function(t){const e=t.tokens_meta,r=t.tokens_meta.length;Qt(t,t.delimiters);for(let n=0;n<r;n++)e[n]&&e[n].delimiters&&Qt(t,e[n].delimiters)}};function Yt(t,e){for(let r=e.length-1;r>=0;r--){const n=e[r];if(95!==n.marker&&42!==n.marker)continue;if(-1===n.end)continue;const s=e[n.end],i=r>0&&e[r-1].end===n.end+1&&e[r-1].marker===n.marker&&e[r-1].token===n.token-1&&e[n.end+1].token===s.token+1,o=String.fromCharCode(n.marker),u=t.tokens[n.token];u.type=i?"strong_open":"em_open",u.tag=i?"strong":"em",u.nesting=1,u.markup=i?o+o:o,u.content="";const c=t.tokens[s.token];c.type=i?"strong_close":"em_close",c.tag=i?"strong":"em",c.nesting=-1,c.markup=i?o+o:o,c.content="",i&&(t.tokens[e[r-1].token].content="",t.tokens[e[n.end+1].token].content="",r--)}}var Kt={tokenize:function(t,e){const r=t.pos,n=t.src.charCodeAt(r);if(e)return!1;if(95!==n&&42!==n)return!1;const s=t.scanDelims(t.pos,42===n);for(let e=0;e<s.length;e++){t.push("text","",0).content=String.fromCharCode(n),t.delimiters.push({marker:n,length:s.length,token:t.tokens.length-1,end:-1,open:s.can_open,close:s.can_close})}return t.pos+=s.length,!0},postProcess:function(t){const e=t.tokens_meta,r=t.tokens_meta.length;Yt(t,t.delimiters);for(let n=0;n<r;n++)e[n]&&e[n].delimiters&&Yt(t,e[n].delimiters)}};const te=/^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,ee=/^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;const re=/^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,ne=/^&([a-z][a-z0-9]{1,31});/i;function se(t){const e={},r=t.length;if(!r)return;let n=0,s=-2;const i=[];for(let o=0;o<r;o++){const r=t[o];if(i.push(0),t[n].marker===r.marker&&s===r.token-1||(n=o),s=r.token,r.length=r.length||0,!r.close)continue;e.hasOwnProperty(r.marker)||(e[r.marker]=[-1,-1,-1,-1,-1,-1]);const u=e[r.marker][(r.open?3:0)+r.length%3];let c=n-i[n]-1,a=c;for(;c>u;c-=i[c]+1){const e=t[c];if(e.marker===r.marker&&(e.open&&e.end<0)){let n=!1;if((e.close||r.open)&&(e.length+r.length)%3==0&&(e.length%3==0&&r.length%3==0||(n=!0)),!n){const n=c>0&&!t[c-1].open?i[c-1]+1:0;i[o]=o-c+n,i[c]=n,r.open=!1,e.end=o,e.close=!1,a=-1,s=-2;break}}}-1!==a&&(e[r.marker][(r.open?3:0)+(r.length||0)%3]=a)}}const ie=[["text",function(t,e){let r=t.pos;for(;r<t.posMax&&!Gt(t.src.charCodeAt(r));)r++;return r!==t.pos&&(e||(t.pending+=t.src.slice(t.pos,r)),t.pos=r,!0)}],["linkify",function(t,e){if(!t.md.options.linkify)return!1;if(t.linkLevel>0)return!1;const r=t.pos;if(r+3>t.posMax)return!1;if(58!==t.src.charCodeAt(r))return!1;if(47!==t.src.charCodeAt(r+1))return!1;if(47!==t.src.charCodeAt(r+2))return!1;const n=t.pending.match(Wt);if(!n)return!1;const s=n[1],i=t.md.linkify.matchAtStart(t.src.slice(r-s.length));if(!i)return!1;let o=i.url;if(o.length<=s.length)return!1;o=o.replace(/\*+$/,"");const u=t.md.normalizeLink(o);if(!t.md.validateLink(u))return!1;if(!e){t.pending=t.pending.slice(0,-s.length);const e=t.push("link_open","a",1);e.attrs=[["href",u]],e.markup="linkify",e.info="auto";t.push("text","",0).content=t.md.normalizeLinkText(o);const r=t.push("link_close","a",-1);r.markup="linkify",r.info="auto"}return t.pos+=o.length-s.length,!0}],["newline",function(t,e){let r=t.pos;if(10!==t.src.charCodeAt(r))return!1;const n=t.pending.length-1,s=t.posMax;if(!e)if(n>=0&&32===t.pending.charCodeAt(n))if(n>=1&&32===t.pending.charCodeAt(n-1)){let e=n-1;for(;e>=1&&32===t.pending.charCodeAt(e-1);)e--;t.pending=t.pending.slice(0,e),t.push("hardbreak","br",0)}else t.pending=t.pending.slice(0,-1),t.push("softbreak","br",0);else t.push("softbreak","br",0);for(r++;r<s&&st(t.src.charCodeAt(r));)r++;return t.pos=r,!0}],["escape",function(t,e){let r=t.pos;const n=t.posMax;if(92!==t.src.charCodeAt(r))return!1;if(r++,r>=n)return!1;let s=t.src.charCodeAt(r);if(10===s){for(e||t.push("hardbreak","br",0),r++;r<n&&(s=t.src.charCodeAt(r),st(s));)r++;return t.pos=r,!0}let i=t.src[r];if(s>=55296&&s<=56319&&r+1<n){const e=t.src.charCodeAt(r+1);e>=56320&&e<=57343&&(i+=t.src[r+1],r++)}const o="\\"+i;if(!e){const e=t.push("text_special","",0);s<256&&0!==Jt[s]?e.content=i:e.content=o,e.markup=o,e.info="escape"}return t.pos=r+1,!0}],["backticks",function(t,e){let r=t.pos;if(96!==t.src.charCodeAt(r))return!1;const n=r;r++;const s=t.posMax;for(;r<s&&96===t.src.charCodeAt(r);)r++;const i=t.src.slice(n,r),o=i.length;if(t.backticksScanned&&(t.backticks[o]||0)<=n)return e||(t.pending+=i),t.pos+=o,!0;let u,c=r;for(;-1!==(u=t.src.indexOf("`",c));){for(c=u+1;c<s&&96===t.src.charCodeAt(c);)c++;const n=c-u;if(n===o){if(!e){const e=t.push("code_inline","code",0);e.markup=i,e.content=t.src.slice(r,u).replace(/\n/g," ").replace(/^ (.+) $/,"$1")}return t.pos=c,!0}t.backticks[n]=u}return t.backticksScanned=!0,e||(t.pending+=i),t.pos+=o,!0}],["strikethrough",Xt.tokenize],["emphasis",Kt.tokenize],["link",function(t,e){let r,n,s,i,o="",u="",c=t.pos,a=!0;if(91!==t.src.charCodeAt(t.pos))return!1;const l=t.pos,h=t.posMax,p=t.pos+1,f=t.md.helpers.parseLinkLabel(t,t.pos,!0);if(f<0)return!1;let d=f+1;if(d<h&&40===t.src.charCodeAt(d)){for(a=!1,d++;d<h&&(r=t.src.charCodeAt(d),st(r)||10===r);d++);if(d>=h)return!1;if(c=d,s=t.md.helpers.parseLinkDestination(t.src,d,t.posMax),s.ok){for(o=t.md.normalizeLink(s.str),t.md.validateLink(o)?d=s.pos:o="",c=d;d<h&&(r=t.src.charCodeAt(d),st(r)||10===r);d++);if(s=t.md.helpers.parseLinkTitle(t.src,d,t.posMax),d<h&&c!==d&&s.ok)for(u=s.str,d=s.pos;d<h&&(r=t.src.charCodeAt(d),st(r)||10===r);d++);}(d>=h||41!==t.src.charCodeAt(d))&&(a=!0),d++}if(a){if(void 0===t.env.references)return!1;if(d<h&&91===t.src.charCodeAt(d)?(c=d+1,d=t.md.helpers.parseLinkLabel(t,d),d>=0?n=t.src.slice(c,d++):d=f+1):d=f+1,n||(n=t.src.slice(p,f)),i=t.env.references[ct(n)],!i)return t.pos=l,!1;o=i.href,u=i.title}if(!e){t.pos=p,t.posMax=f;const e=[["href",o]];t.push("link_open","a",1).attrs=e,u&&e.push(["title",u]),t.linkLevel++,t.md.inline.tokenize(t),t.linkLevel--,t.push("link_close","a",-1)}return t.pos=d,t.posMax=h,!0}],["image",function(t,e){let r,n,s,i,o,u,c,a,l="";const h=t.pos,p=t.posMax;if(33!==t.src.charCodeAt(t.pos))return!1;if(91!==t.src.charCodeAt(t.pos+1))return!1;const f=t.pos+2,d=t.md.helpers.parseLinkLabel(t,t.pos+1,!1);if(d<0)return!1;if(i=d+1,i<p&&40===t.src.charCodeAt(i)){for(i++;i<p&&(r=t.src.charCodeAt(i),st(r)||10===r);i++);if(i>=p)return!1;for(a=i,u=t.md.helpers.parseLinkDestination(t.src,i,t.posMax),u.ok&&(l=t.md.normalizeLink(u.str),t.md.validateLink(l)?i=u.pos:l=""),a=i;i<p&&(r=t.src.charCodeAt(i),st(r)||10===r);i++);if(u=t.md.helpers.parseLinkTitle(t.src,i,t.posMax),i<p&&a!==i&&u.ok)for(c=u.str,i=u.pos;i<p&&(r=t.src.charCodeAt(i),st(r)||10===r);i++);else c="";if(i>=p||41!==t.src.charCodeAt(i))return t.pos=h,!1;i++}else{if(void 0===t.env.references)return!1;if(i<p&&91===t.src.charCodeAt(i)?(a=i+1,i=t.md.helpers.parseLinkLabel(t,i),i>=0?s=t.src.slice(a,i++):i=d+1):i=d+1,s||(s=t.src.slice(f,d)),o=t.env.references[ct(s)],!o)return t.pos=h,!1;l=o.href,c=o.title}if(!e){n=t.src.slice(f,d);const e=[];t.md.inline.parse(n,t.md,t.env,e);const r=t.push("image","img",0),s=[["src",l],["alt",""]];r.attrs=s,r.children=e,r.content=n,c&&s.push(["title",c])}return t.pos=i,t.posMax=p,!0}],["autolink",function(t,e){let r=t.pos;if(60!==t.src.charCodeAt(r))return!1;const n=t.pos,s=t.posMax;for(;;){if(++r>=s)return!1;const e=t.src.charCodeAt(r);if(60===e)return!1;if(62===e)break}const i=t.src.slice(n+1,r);if(ee.test(i)){const r=t.md.normalizeLink(i);if(!t.md.validateLink(r))return!1;if(!e){const e=t.push("link_open","a",1);e.attrs=[["href",r]],e.markup="autolink",e.info="auto";t.push("text","",0).content=t.md.normalizeLinkText(i);const n=t.push("link_close","a",-1);n.markup="autolink",n.info="auto"}return t.pos+=i.length+2,!0}if(te.test(i)){const r=t.md.normalizeLink("mailto:"+i);if(!t.md.validateLink(r))return!1;if(!e){const e=t.push("link_open","a",1);e.attrs=[["href",r]],e.markup="autolink",e.info="auto";t.push("text","",0).content=t.md.normalizeLinkText(i);const n=t.push("link_close","a",-1);n.markup="autolink",n.info="auto"}return t.pos+=i.length+2,!0}return!1}],["html_inline",function(t,e){if(!t.md.options.html)return!1;const r=t.posMax,n=t.pos;if(60!==t.src.charCodeAt(n)||n+2>=r)return!1;const s=t.src.charCodeAt(n+1);if(33!==s&&63!==s&&47!==s&&!function(t){const e=32|t;return e>=97&&e<=122}(s))return!1;const i=t.src.slice(n).match(jt);if(!i)return!1;if(!e){const e=t.push("html_inline","",0);e.content=i[0],o=e.content,/^<a[>\s]/i.test(o)&&t.linkLevel++,function(t){return/^<\/a\s*>/i.test(t)}(e.content)&&t.linkLevel--}var o;return t.pos+=i[0].length,!0}],["entity",function(t,e){const r=t.pos,n=t.posMax;if(38!==t.src.charCodeAt(r))return!1;if(r+1>=n)return!1;if(35===t.src.charCodeAt(r+1)){const n=t.src.slice(r).match(re);if(n){if(!e){const e="x"===n[1][0].toLowerCase()?parseInt(n[1].slice(1),16):parseInt(n[1],10),r=t.push("text_special","",0);r.content=V(e)?G(e):G(65533),r.markup=n[0],r.info="entity"}return t.pos+=n[0].length,!0}}else{const n=t.src.slice(r).match(ne);if(n){const r=j(n[0]);if(r!==n[0]){if(!e){const e=t.push("text_special","",0);e.content=r,e.markup=n[0],e.info="entity"}return t.pos+=n[0].length,!0}}}return!1}]],oe=[["balance_pairs",function(t){const e=t.tokens_meta,r=t.tokens_meta.length;se(t.delimiters);for(let t=0;t<r;t++)e[t]&&e[t].delimiters&&se(e[t].delimiters)}],["strikethrough",Xt.postProcess],["emphasis",Kt.postProcess],["fragments_join",function(t){let e,r,n=0;const s=t.tokens,i=t.tokens.length;for(e=r=0;e<i;e++)s[e].nesting<0&&n--,s[e].level=n,s[e].nesting>0&&n++,"text"===s[e].type&&e+1<i&&"text"===s[e+1].type?s[e+1].content=s[e].content+s[e+1].content:(e!==r&&(s[r]=s[e]),r++);e!==r&&(s.length=r)}]];function ue(){this.ruler=new dt;for(let t=0;t<ie.length;t++)this.ruler.push(ie[t][0],ie[t][1]);this.ruler2=new dt;for(let t=0;t<oe.length;t++)this.ruler2.push(oe[t][0],oe[t][1])}function ce(t){return Array.prototype.slice.call(arguments,1).forEach((function(e){e&&Object.keys(e).forEach((function(r){t[r]=e[r]}))})),t}function ae(t){return Object.prototype.toString.call(t)}function le(t){return"[object Function]"===ae(t)}function he(t){return t.replace(/[.?*+^$[\]\\(){}|-]/g,"\\$&")}ue.prototype.skipToken=function(t){const e=t.pos,r=this.ruler.getRules(""),n=r.length,s=t.md.options.maxNesting,i=t.cache;if(void 0!==i[e])return void(t.pos=i[e]);let o=!1;if(t.level<s){for(let s=0;s<n;s++)if(t.level++,o=r[s](t,!0),t.level--,o){if(e>=t.pos)throw new Error("inline rule didn't increment state.pos");break}}else t.pos=t.posMax;o||t.pos++,i[e]=t.pos},ue.prototype.tokenize=function(t){const e=this.ruler.getRules(""),r=e.length,n=t.posMax,s=t.md.options.maxNesting;for(;t.pos<n;){const i=t.pos;let o=!1;if(t.level<s)for(let n=0;n<r;n++)if(o=e[n](t,!1),o){if(i>=t.pos)throw new Error("inline rule didn't increment state.pos");break}if(o){if(t.pos>=n)break}else t.pending+=t.src[t.pos++]}t.pending&&t.pushPending()},ue.prototype.parse=function(t,e,r,n){const s=new this.State(t,e,r,n);this.tokenize(s);const i=this.ruler2.getRules(""),o=i.length;for(let t=0;t<o;t++)i[t](s)},ue.prototype.State=Vt;const pe={fuzzyLink:!0,fuzzyEmail:!0,fuzzyIP:!1};const fe={"http:":{validate:function(t,e,r){const n=t.slice(e);return r.re.http||(r.re.http=new RegExp("^\\/\\/"+r.re.src_auth+r.re.src_host_port_strict+r.re.src_path,"i")),r.re.http.test(n)?n.match(r.re.http)[0].length:0}},"https:":"http:","ftp:":"http:","//":{validate:function(t,e,r){const n=t.slice(e);return r.re.no_http||(r.re.no_http=new RegExp("^"+r.re.src_auth+"(?:localhost|(?:(?:"+r.re.src_domain+")\\.)+"+r.re.src_domain_root+")"+r.re.src_port+r.re.src_host_terminator+r.re.src_path,"i")),r.re.no_http.test(n)?e>=3&&":"===t[e-3]||e>=3&&"/"===t[e-3]?0:n.match(r.re.no_http)[0].length:0}},"mailto:":{validate:function(t,e,r){const n=t.slice(e);return r.re.mailto||(r.re.mailto=new RegExp("^"+r.re.src_email_name+"@"+r.re.src_host_strict,"i")),r.re.mailto.test(n)?n.match(r.re.mailto)[0].length:0}}},de="a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]",_e="biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|\u0440\u0444".split("|");function me(t){const e=t.re=function(t){const e={};t=t||{},e.src_Any=C.source,e.src_Cc=y.source,e.src_Z=b.source,e.src_P=E.source,e.src_ZPCc=[e.src_Z,e.src_P,e.src_Cc].join("|"),e.src_ZCc=[e.src_Z,e.src_Cc].join("|");const r="[><\uff5c]";return e.src_pseudo_letter="(?:(?![><\uff5c]|"+e.src_ZPCc+")"+e.src_Any+")",e.src_ip4="(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)",e.src_auth="(?:(?:(?!"+e.src_ZCc+"|[@/\\[\\]()]).)+@)?",e.src_port="(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?",e.src_host_terminator="(?=$|[><\uff5c]|"+e.src_ZPCc+")(?!"+(t["---"]?"-(?!--)|":"-|")+"_|:\\d|\\.-|\\.(?!$|"+e.src_ZPCc+"))",e.src_path="(?:[/?#](?:(?!"+e.src_ZCc+"|"+r+"|[()[\\]{}.,\"'?!\\-;]).|\\[(?:(?!"+e.src_ZCc+"|\\]).)*\\]|\\((?:(?!"+e.src_ZCc+"|[)]).)*\\)|\\{(?:(?!"+e.src_ZCc+'|[}]).)*\\}|\\"(?:(?!'+e.src_ZCc+'|["]).)+\\"|\\\'(?:(?!'+e.src_ZCc+"|[']).)+\\'|\\'(?="+e.src_pseudo_letter+"|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!"+e.src_ZCc+"|[.]|$)|"+(t["---"]?"\\-(?!--(?:[^-]|$))(?:-*)|":"\\-+|")+",(?!"+e.src_ZCc+"|$)|;(?!"+e.src_ZCc+"|$)|\\!+(?!"+e.src_ZCc+"|[!]|$)|\\?(?!"+e.src_ZCc+"|[?]|$))+|\\/)?",e.src_email_name='[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*',e.src_xn="xn--[a-z0-9\\-]{1,59}",e.src_domain_root="(?:"+e.src_xn+"|"+e.src_pseudo_letter+"{1,63})",e.src_domain="(?:"+e.src_xn+"|(?:"+e.src_pseudo_letter+")|(?:"+e.src_pseudo_letter+"(?:-|"+e.src_pseudo_letter+"){0,61}"+e.src_pseudo_letter+"))",e.src_host="(?:(?:(?:(?:"+e.src_domain+")\\.)*"+e.src_domain+"))",e.tpl_host_fuzzy="(?:"+e.src_ip4+"|(?:(?:(?:"+e.src_domain+")\\.)+(?:%TLDS%)))",e.tpl_host_no_ip_fuzzy="(?:(?:(?:"+e.src_domain+")\\.)+(?:%TLDS%))",e.src_host_strict=e.src_host+e.src_host_terminator,e.tpl_host_fuzzy_strict=e.tpl_host_fuzzy+e.src_host_terminator,e.src_host_port_strict=e.src_host+e.src_port+e.src_host_terminator,e.tpl_host_port_fuzzy_strict=e.tpl_host_fuzzy+e.src_port+e.src_host_terminator,e.tpl_host_port_no_ip_fuzzy_strict=e.tpl_host_no_ip_fuzzy+e.src_port+e.src_host_terminator,e.tpl_host_fuzzy_test="localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:"+e.src_ZPCc+"|>|$))",e.tpl_email_fuzzy='(^|[><\uff5c]|"|\\(|'+e.src_ZCc+")("+e.src_email_name+"@"+e.tpl_host_fuzzy_strict+")",e.tpl_link_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|"+e.src_ZPCc+"))((?![$+<=>^`|\uff5c])"+e.tpl_host_port_fuzzy_strict+e.src_path+")",e.tpl_link_no_ip_fuzzy="(^|(?![.:/\\-_@])(?:[$+<=>^`|\uff5c]|"+e.src_ZPCc+"))((?![$+<=>^`|\uff5c])"+e.tpl_host_port_no_ip_fuzzy_strict+e.src_path+")",e}(t.__opts__),r=t.__tlds__.slice();function n(t){return t.replace("%TLDS%",e.src_tlds)}t.onCompile(),t.__tlds_replaced__||r.push(de),r.push(e.src_xn),e.src_tlds=r.join("|"),e.email_fuzzy=RegExp(n(e.tpl_email_fuzzy),"i"),e.link_fuzzy=RegExp(n(e.tpl_link_fuzzy),"i"),e.link_no_ip_fuzzy=RegExp(n(e.tpl_link_no_ip_fuzzy),"i"),e.host_fuzzy_test=RegExp(n(e.tpl_host_fuzzy_test),"i");const s=[];function i(t,e){throw new Error('(LinkifyIt) Invalid schema "'+t+'": '+e)}t.__compiled__={},Object.keys(t.__schemas__).forEach((function(e){const r=t.__schemas__[e];if(null===r)return;const n={validate:null,link:null};if(t.__compiled__[e]=n,"[object Object]"===ae(r))return!function(t){return"[object RegExp]"===ae(t)}(r.validate)?le(r.validate)?n.validate=r.validate:i(e,r):n.validate=function(t){return function(e,r){const n=e.slice(r);return t.test(n)?n.match(t)[0].length:0}}(r.validate),void(le(r.normalize)?n.normalize=r.normalize:r.normalize?i(e,r):n.normalize=function(t,e){e.normalize(t)});!function(t){return"[object String]"===ae(t)}(r)?i(e,r):s.push(e)})),s.forEach((function(e){t.__compiled__[t.__schemas__[e]]&&(t.__compiled__[e].validate=t.__compiled__[t.__schemas__[e]].validate,t.__compiled__[e].normalize=t.__compiled__[t.__schemas__[e]].normalize)})),t.__compiled__[""]={validate:null,normalize:function(t,e){e.normalize(t)}};const o=Object.keys(t.__compiled__).filter((function(e){return e.length>0&&t.__compiled__[e]})).map(he).join("|");t.re.schema_test=RegExp("(^|(?!_)(?:[><\uff5c]|"+e.src_ZPCc+"))("+o+")","i"),t.re.schema_search=RegExp("(^|(?!_)(?:[><\uff5c]|"+e.src_ZPCc+"))("+o+")","ig"),t.re.schema_at_start=RegExp("^"+t.re.schema_search.source,"i"),t.re.pretest=RegExp("("+t.re.schema_test.source+")|("+t.re.host_fuzzy_test.source+")|@","i"),function(t){t.__index__=-1,t.__text_cache__=""}(t)}function ge(t,e){const r=t.__index__,n=t.__last_index__,s=t.__text_cache__.slice(r,n);this.schema=t.__schema__.toLowerCase(),this.index=r+e,this.lastIndex=n+e,this.raw=s,this.text=s,this.url=s}function ke(t,e){const r=new ge(t,e);return t.__compiled__[r.schema].normalize(r,t),r}function De(t,e){if(!(this instanceof De))return new De(t,e);var r;e||(r=t,Object.keys(r||{}).reduce((function(t,e){return t||pe.hasOwnProperty(e)}),!1)&&(e=t,t={})),this.__opts__=ce({},pe,e),this.__index__=-1,this.__last_index__=-1,this.__schema__="",this.__text_cache__="",this.__schemas__=ce({},fe,t),this.__compiled__={},this.__tlds__=_e,this.__tlds_replaced__=!1,this.re={},me(this)}De.prototype.add=function(t,e){return this.__schemas__[t]=e,me(this),this},De.prototype.set=function(t){return this.__opts__=ce(this.__opts__,t),this},De.prototype.test=function(t){if(this.__text_cache__=t,this.__index__=-1,!t.length)return!1;let e,r,n,s,i,o,u,c,a;if(this.re.schema_test.test(t))for(u=this.re.schema_search,u.lastIndex=0;null!==(e=u.exec(t));)if(s=this.testSchemaAt(t,e[2],u.lastIndex),s){this.__schema__=e[2],this.__index__=e.index+e[1].length,this.__last_index__=e.index+e[0].length+s;break}return this.__opts__.fuzzyLink&&this.__compiled__["http:"]&&(c=t.search(this.re.host_fuzzy_test),c>=0&&(this.__index__<0||c<this.__index__)&&null!==(r=t.match(this.__opts__.fuzzyIP?this.re.link_fuzzy:this.re.link_no_ip_fuzzy))&&(i=r.index+r[1].length,(this.__index__<0||i<this.__index__)&&(this.__schema__="",this.__index__=i,this.__last_index__=r.index+r[0].length))),this.__opts__.fuzzyEmail&&this.__compiled__["mailto:"]&&(a=t.indexOf("@"),a>=0&&null!==(n=t.match(this.re.email_fuzzy))&&(i=n.index+n[1].length,o=n.index+n[0].length,(this.__index__<0||i<this.__index__||i===this.__index__&&o>this.__last_index__)&&(this.__schema__="mailto:",this.__index__=i,this.__last_index__=o))),this.__index__>=0},De.prototype.pretest=function(t){return this.re.pretest.test(t)},De.prototype.testSchemaAt=function(t,e,r){return this.__compiled__[e.toLowerCase()]?this.__compiled__[e.toLowerCase()].validate(t,r,this):0},De.prototype.match=function(t){const e=[];let r=0;this.__index__>=0&&this.__text_cache__===t&&(e.push(ke(this,r)),r=this.__last_index__);let n=r?t.slice(r):t;for(;this.test(n);)e.push(ke(this,r)),n=n.slice(this.__last_index__),r+=this.__last_index__;return e.length?e:null},De.prototype.matchAtStart=function(t){if(this.__text_cache__=t,this.__index__=-1,!t.length)return null;const e=this.re.schema_at_start.exec(t);if(!e)return null;const r=this.testSchemaAt(t,e[2],e[0].length);return r?(this.__schema__=e[2],this.__index__=e.index+e[1].length,this.__last_index__=e.index+e[0].length+r,ke(this,0)):null},De.prototype.tlds=function(t,e){return t=Array.isArray(t)?t:[t],e?(this.__tlds__=this.__tlds__.concat(t).sort().filter((function(t,e,r){return t!==r[e-1]})).reverse(),me(this),this):(this.__tlds__=t.slice(),this.__tlds_replaced__=!0,me(this),this)},De.prototype.normalize=function(t){t.schema||(t.url="http://"+t.url),"mailto:"!==t.schema||/^mailto:/i.test(t.url)||(t.url="mailto:"+t.url)},De.prototype.onCompile=function(){};const Ce=2147483647,ye=36,Ee=/^xn--/,Ae=/[^\0-\x7F]/,be=/[\x2E\u3002\uFF0E\uFF61]/g,Fe={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},xe=Math.floor,we=String.fromCharCode;function ve(t){throw new RangeError(Fe[t])}function ze(t,e){const r=t.split("@");let n="";r.length>1&&(n=r[0]+"@",t=r[1]);const s=function(t,e){const r=[];let n=t.length;for(;n--;)r[n]=e(t[n]);return r}((t=t.replace(be,".")).split("."),e).join(".");return n+s}function Se(t){const e=[];let r=0;const n=t.length;for(;r<n;){const s=t.charCodeAt(r++);if(s>=55296&&s<=56319&&r<n){const n=t.charCodeAt(r++);56320==(64512&n)?e.push(((1023&s)<<10)+(1023&n)+65536):(e.push(s),r--)}else e.push(s)}return e}const qe=function(t,e){return t+22+75*(t<26)-((0!=e)<<5)},Be=function(t,e,r){let n=0;for(t=r?xe(t/700):t>>1,t+=xe(t/e);t>455;n+=ye)t=xe(t/35);return xe(n+36*t/(t+38))},Le=function(t){const e=[],r=t.length;let n=0,s=128,i=72,o=t.lastIndexOf("-");o<0&&(o=0);for(let r=0;r<o;++r)t.charCodeAt(r)>=128&&ve("not-basic"),e.push(t.charCodeAt(r));for(let c=o>0?o+1:0;c<r;){const o=n;for(let e=1,s=ye;;s+=ye){c>=r&&ve("invalid-input");const o=(u=t.charCodeAt(c++))>=48&&u<58?u-48+26:u>=65&&u<91?u-65:u>=97&&u<123?u-97:ye;o>=ye&&ve("invalid-input"),o>xe((Ce-n)/e)&&ve("overflow"),n+=o*e;const a=s<=i?1:s>=i+26?26:s-i;if(o<a)break;const l=ye-a;e>xe(Ce/l)&&ve("overflow"),e*=l}const a=e.length+1;i=Be(n-o,a,0==o),xe(n/a)>Ce-s&&ve("overflow"),s+=xe(n/a),n%=a,e.splice(n++,0,s)}var u;return String.fromCodePoint(...e)},Ie=function(t){const e=[],r=(t=Se(t)).length;let n=128,s=0,i=72;for(const r of t)r<128&&e.push(we(r));const o=e.length;let u=o;for(o&&e.push("-");u<r;){let r=Ce;for(const e of t)e>=n&&e<r&&(r=e);const c=u+1;r-n>xe((Ce-s)/c)&&ve("overflow"),s+=(r-n)*c,n=r;for(const r of t)if(r<n&&++s>Ce&&ve("overflow"),r===n){let t=s;for(let r=ye;;r+=ye){const n=r<=i?1:r>=i+26?26:r-i;if(t<n)break;const s=t-n,o=ye-n;e.push(we(qe(n+s%o,0))),t=xe(s/o)}e.push(we(qe(t,0))),i=Be(s,c,u===o),s=0,++u}++s,++n}return e.join("")},Me={version:"2.3.1",ucs2:{decode:Se,encode:t=>String.fromCodePoint(...t)},decode:Le,encode:Ie,toASCII:function(t){return ze(t,(function(t){return Ae.test(t)?"xn--"+Ie(t):t}))},toUnicode:function(t){return ze(t,(function(t){return Ee.test(t)?Le(t.slice(4).toLowerCase()):t}))}};const Te={default:{options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"\u201c\u201d\u2018\u2019",highlight:null,maxNesting:100},components:{core:{},block:{},inline:{}}},zero:{options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"\u201c\u201d\u2018\u2019",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["paragraph"]},inline:{rules:["text"],rules2:["balance_pairs","fragments_join"]}}},commonmark:{options:{html:!0,xhtmlOut:!0,breaks:!1,langPrefix:"language-",linkify:!1,typographer:!1,quotes:"\u201c\u201d\u2018\u2019",highlight:null,maxNesting:20},components:{core:{rules:["normalize","block","inline","text_join"]},block:{rules:["blockquote","code","fence","heading","hr","html_block","lheading","list","reference","paragraph"]},inline:{rules:["autolink","backticks","emphasis","entity","escape","html_inline","image","link","newline","text"],rules2:["balance_pairs","emphasis","fragments_join"]}}}},Re=/^(vbscript|javascript|file|data):/,Ne=/^data:image\/(gif|png|jpeg|webp);/;function Pe(t){const e=t.trim().toLowerCase();return!Re.test(e)||Ne.test(e)}const Oe=["http:","https:","mailto:"];function je(t){const e=g(t,!0);if(e.hostname&&(!e.protocol||Oe.indexOf(e.protocol)>=0))try{e.hostname=Me.toASCII(e.hostname)}catch(t){}return n(s(e))}function Ze(t){const r=g(t,!0);if(r.hostname&&(!r.protocol||Oe.indexOf(r.protocol)>=0))try{r.hostname=Me.toUnicode(r.hostname)}catch(t){}return e(s(r),e.defaultChars+"%")}function $e(t,e){if(!(this instanceof $e))return new $e(t,e);e||Z(t)||(e=t||{},t="default"),this.inline=new ue,this.block=new Ht,this.core=new Lt,this.renderer=new ft,this.linkify=new De,this.validateLink=Pe,this.normalizeLink=je,this.normalizeLinkText=Ze,this.utils=lt,this.helpers=U({},ht),this.options={},this.configure(t),e&&this.set(e)}return $e.prototype.set=function(t){return U(this.options,t),this},$e.prototype.configure=function(t){const e=this;if(Z(t)){const e=t;if(!(t=Te[e]))throw new Error('Wrong `markdown-it` preset "'+e+'", check name')}if(!t)throw new Error("Wrong `markdown-it` preset, can't be empty");return t.options&&e.set(t.options),t.components&&Object.keys(t.components).forEach((function(r){t.components[r].rules&&e[r].ruler.enableOnly(t.components[r].rules),t.components[r].rules2&&e[r].ruler2.enableOnly(t.components[r].rules2)})),this},$e.prototype.enable=function(t,e){let r=[];Array.isArray(t)||(t=[t]),["core","block","inline"].forEach((function(e){r=r.concat(this[e].ruler.enable(t,!0))}),this),r=r.concat(this.inline.ruler2.enable(t,!0));const n=t.filter((function(t){return r.indexOf(t)<0}));if(n.length&&!e)throw new Error("MarkdownIt. Failed to enable unknown rule(s): "+n);return this},$e.prototype.disable=function(t,e){let r=[];Array.isArray(t)||(t=[t]),["core","block","inline"].forEach((function(e){r=r.concat(this[e].ruler.disable(t,!0))}),this),r=r.concat(this.inline.ruler2.disable(t,!0));const n=t.filter((function(t){return r.indexOf(t)<0}));if(n.length&&!e)throw new Error("MarkdownIt. Failed to disable unknown rule(s): "+n);return this},$e.prototype.use=function(t){const e=[this].concat(Array.prototype.slice.call(arguments,1));return t.apply(t,e),this},$e.prototype.parse=function(t,e){if("string"!=typeof t)throw new Error("Input data should be a String");const r=new this.core.State(t,this,e);return this.core.process(r),r.tokens},$e.prototype.render=function(t,e){return e=e||{},this.renderer.render(this.parse(t,e),this.options,e)},$e.prototype.parseInline=function(t,e){const r=new this.core.State(t,this,e);return r.inlineMode=!0,this.core.process(r),r.tokens},$e.prototype.renderInline=function(t,e){return e=e||{},this.renderer.render(this.parseInline(t,e),this.options,e)},$e}));
/*! @license DOMPurify 3.3.3 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.3/LICENSE */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).DOMPurify=t()}(this,(function(){"use strict";const{entries:e,setPrototypeOf:t,isFrozen:n,getPrototypeOf:o,getOwnPropertyDescriptor:r}=Object;let{freeze:i,seal:a,create:l}=Object,{apply:c,construct:s}="undefined"!=typeof Reflect&&Reflect;i||(i=function(e){return e}),a||(a=function(e){return e}),c||(c=function(e,t){for(var n=arguments.length,o=new Array(n>2?n-2:0),r=2;r<n;r++)o[r-2]=arguments[r];return e.apply(t,o)}),s||(s=function(e){for(var t=arguments.length,n=new Array(t>1?t-1:0),o=1;o<t;o++)n[o-1]=arguments[o];return new e(...n)});const u=D(Array.prototype.forEach),m=D(Array.prototype.lastIndexOf),p=D(Array.prototype.pop),f=D(Array.prototype.push),d=D(Array.prototype.splice),h=D(String.prototype.toLowerCase),g=D(String.prototype.toString),T=D(String.prototype.match),y=D(String.prototype.replace),E=D(String.prototype.indexOf),A=D(String.prototype.trim),_=D(Object.prototype.hasOwnProperty),b=D(RegExp.prototype.test),S=(N=TypeError,function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return s(N,t)});var N;function D(e){return function(t){t instanceof RegExp&&(t.lastIndex=0);for(var n=arguments.length,o=new Array(n>1?n-1:0),r=1;r<n;r++)o[r-1]=arguments[r];return c(e,t,o)}}function R(e,o){let r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:h;t&&t(e,null);let i=o.length;for(;i--;){let t=o[i];if("string"==typeof t){const e=r(t);e!==t&&(n(o)||(o[i]=e),t=e)}e[t]=!0}return e}function w(e){for(let t=0;t<e.length;t++){_(e,t)||(e[t]=null)}return e}function C(t){const n=l(null);for(const[o,r]of e(t)){_(t,o)&&(Array.isArray(r)?n[o]=w(r):r&&"object"==typeof r&&r.constructor===Object?n[o]=C(r):n[o]=r)}return n}function O(e,t){for(;null!==e;){const n=r(e,t);if(n){if(n.get)return D(n.get);if("function"==typeof n.value)return D(n.value)}e=o(e)}return function(){return null}}const v=i(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","search","section","select","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),k=i(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","enterkeyhint","exportparts","filter","font","g","glyph","glyphref","hkern","image","inputmode","line","lineargradient","marker","mask","metadata","mpath","part","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),x=i(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),L=i(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),I=i(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),M=i(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),U=i(["#text"]),z=i(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","exportparts","face","for","headers","height","hidden","high","href","hreflang","id","inert","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","part","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","slot","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns","slot"]),P=i(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","mask-type","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),F=i(["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),H=i(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),B=a(/\{\{[\w\W]*|[\w\W]*\}\}/gm),G=a(/<%[\w\W]*|[\w\W]*%>/gm),W=a(/\$\{[\w\W]*/gm),Y=a(/^data-[\-\w.\u00B7-\uFFFF]+$/),j=a(/^aria-[\-\w]+$/),X=a(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),q=a(/^(?:\w+script|data):/i),$=a(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),K=a(/^html$/i),V=a(/^[a-z][.\w]*(-[.\w]+)+$/i);var Z=Object.freeze({__proto__:null,ARIA_ATTR:j,ATTR_WHITESPACE:$,CUSTOM_ELEMENT:V,DATA_ATTR:Y,DOCTYPE_NAME:K,ERB_EXPR:G,IS_ALLOWED_URI:X,IS_SCRIPT_OR_DATA:q,MUSTACHE_EXPR:B,TMPLIT_EXPR:W});const J=1,Q=3,ee=7,te=8,ne=9,oe=function(){return"undefined"==typeof window?null:window};var re=function t(){let n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:oe();const o=e=>t(e);if(o.version="3.3.3",o.removed=[],!n||!n.document||n.document.nodeType!==ne||!n.Element)return o.isSupported=!1,o;let{document:r}=n;const a=r,c=a.currentScript,{DocumentFragment:s,HTMLTemplateElement:N,Node:D,Element:w,NodeFilter:B,NamedNodeMap:G=n.NamedNodeMap||n.MozNamedAttrMap,HTMLFormElement:W,DOMParser:Y,trustedTypes:j}=n,q=w.prototype,$=O(q,"cloneNode"),V=O(q,"remove"),re=O(q,"nextSibling"),ie=O(q,"childNodes"),ae=O(q,"parentNode");if("function"==typeof N){const e=r.createElement("template");e.content&&e.content.ownerDocument&&(r=e.content.ownerDocument)}let le,ce="";const{implementation:se,createNodeIterator:ue,createDocumentFragment:me,getElementsByTagName:pe}=r,{importNode:fe}=a;let de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]};o.isSupported="function"==typeof e&&"function"==typeof ae&&se&&void 0!==se.createHTMLDocument;const{MUSTACHE_EXPR:he,ERB_EXPR:ge,TMPLIT_EXPR:Te,DATA_ATTR:ye,ARIA_ATTR:Ee,IS_SCRIPT_OR_DATA:Ae,ATTR_WHITESPACE:_e,CUSTOM_ELEMENT:be}=Z;let{IS_ALLOWED_URI:Se}=Z,Ne=null;const De=R({},[...v,...k,...x,...I,...U]);let Re=null;const we=R({},[...z,...P,...F,...H]);let Ce=Object.seal(l(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Oe=null,ve=null;const ke=Object.seal(l(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}}));let xe=!0,Le=!0,Ie=!1,Me=!0,Ue=!1,ze=!0,Pe=!1,Fe=!1,He=!1,Be=!1,Ge=!1,We=!1,Ye=!0,je=!1,Xe=!0,qe=!1,$e={},Ke=null;const Ve=R({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","style","svg","template","thead","title","video","xmp"]);let Ze=null;const Je=R({},["audio","video","img","source","image","track"]);let Qe=null;const et=R({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),tt="http://www.w3.org/1998/Math/MathML",nt="http://www.w3.org/2000/svg",ot="http://www.w3.org/1999/xhtml";let rt=ot,it=!1,at=null;const lt=R({},[tt,nt,ot],g);let ct=R({},["mi","mo","mn","ms","mtext"]),st=R({},["annotation-xml"]);const ut=R({},["title","style","font","a","script"]);let mt=null;const pt=["application/xhtml+xml","text/html"];let ft=null,dt=null;const ht=r.createElement("form"),gt=function(e){return e instanceof RegExp||e instanceof Function},Tt=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(!dt||dt!==e){if(e&&"object"==typeof e||(e={}),e=C(e),mt=-1===pt.indexOf(e.PARSER_MEDIA_TYPE)?"text/html":e.PARSER_MEDIA_TYPE,ft="application/xhtml+xml"===mt?g:h,Ne=_(e,"ALLOWED_TAGS")?R({},e.ALLOWED_TAGS,ft):De,Re=_(e,"ALLOWED_ATTR")?R({},e.ALLOWED_ATTR,ft):we,at=_(e,"ALLOWED_NAMESPACES")?R({},e.ALLOWED_NAMESPACES,g):lt,Qe=_(e,"ADD_URI_SAFE_ATTR")?R(C(et),e.ADD_URI_SAFE_ATTR,ft):et,Ze=_(e,"ADD_DATA_URI_TAGS")?R(C(Je),e.ADD_DATA_URI_TAGS,ft):Je,Ke=_(e,"FORBID_CONTENTS")?R({},e.FORBID_CONTENTS,ft):Ve,Oe=_(e,"FORBID_TAGS")?R({},e.FORBID_TAGS,ft):C({}),ve=_(e,"FORBID_ATTR")?R({},e.FORBID_ATTR,ft):C({}),$e=!!_(e,"USE_PROFILES")&&e.USE_PROFILES,xe=!1!==e.ALLOW_ARIA_ATTR,Le=!1!==e.ALLOW_DATA_ATTR,Ie=e.ALLOW_UNKNOWN_PROTOCOLS||!1,Me=!1!==e.ALLOW_SELF_CLOSE_IN_ATTR,Ue=e.SAFE_FOR_TEMPLATES||!1,ze=!1!==e.SAFE_FOR_XML,Pe=e.WHOLE_DOCUMENT||!1,Be=e.RETURN_DOM||!1,Ge=e.RETURN_DOM_FRAGMENT||!1,We=e.RETURN_TRUSTED_TYPE||!1,He=e.FORCE_BODY||!1,Ye=!1!==e.SANITIZE_DOM,je=e.SANITIZE_NAMED_PROPS||!1,Xe=!1!==e.KEEP_CONTENT,qe=e.IN_PLACE||!1,Se=e.ALLOWED_URI_REGEXP||X,rt=e.NAMESPACE||ot,ct=e.MATHML_TEXT_INTEGRATION_POINTS||ct,st=e.HTML_INTEGRATION_POINTS||st,Ce=e.CUSTOM_ELEMENT_HANDLING||{},e.CUSTOM_ELEMENT_HANDLING&&gt(e.CUSTOM_ELEMENT_HANDLING.tagNameCheck)&&(Ce.tagNameCheck=e.CUSTOM_ELEMENT_HANDLING.tagNameCheck),e.CUSTOM_ELEMENT_HANDLING&&gt(e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)&&(Ce.attributeNameCheck=e.CUSTOM_ELEMENT_HANDLING.attributeNameCheck),e.CUSTOM_ELEMENT_HANDLING&&"boolean"==typeof e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements&&(Ce.allowCustomizedBuiltInElements=e.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements),Ue&&(Le=!1),Ge&&(Be=!0),$e&&(Ne=R({},U),Re=l(null),!0===$e.html&&(R(Ne,v),R(Re,z)),!0===$e.svg&&(R(Ne,k),R(Re,P),R(Re,H)),!0===$e.svgFilters&&(R(Ne,x),R(Re,P),R(Re,H)),!0===$e.mathMl&&(R(Ne,I),R(Re,F),R(Re,H))),_(e,"ADD_TAGS")||(ke.tagCheck=null),_(e,"ADD_ATTR")||(ke.attributeCheck=null),e.ADD_TAGS&&("function"==typeof e.ADD_TAGS?ke.tagCheck=e.ADD_TAGS:(Ne===De&&(Ne=C(Ne)),R(Ne,e.ADD_TAGS,ft))),e.ADD_ATTR&&("function"==typeof e.ADD_ATTR?ke.attributeCheck=e.ADD_ATTR:(Re===we&&(Re=C(Re)),R(Re,e.ADD_ATTR,ft))),e.ADD_URI_SAFE_ATTR&&R(Qe,e.ADD_URI_SAFE_ATTR,ft),e.FORBID_CONTENTS&&(Ke===Ve&&(Ke=C(Ke)),R(Ke,e.FORBID_CONTENTS,ft)),e.ADD_FORBID_CONTENTS&&(Ke===Ve&&(Ke=C(Ke)),R(Ke,e.ADD_FORBID_CONTENTS,ft)),Xe&&(Ne["#text"]=!0),Pe&&R(Ne,["html","head","body"]),Ne.table&&(R(Ne,["tbody"]),delete Oe.tbody),e.TRUSTED_TYPES_POLICY){if("function"!=typeof e.TRUSTED_TYPES_POLICY.createHTML)throw S('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if("function"!=typeof e.TRUSTED_TYPES_POLICY.createScriptURL)throw S('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');le=e.TRUSTED_TYPES_POLICY,ce=le.createHTML("")}else void 0===le&&(le=function(e,t){if("object"!=typeof e||"function"!=typeof e.createPolicy)return null;let n=null;const o="data-tt-policy-suffix";t&&t.hasAttribute(o)&&(n=t.getAttribute(o));const r="dompurify"+(n?"#"+n:"");try{return e.createPolicy(r,{createHTML:e=>e,createScriptURL:e=>e})}catch(e){return console.warn("TrustedTypes policy "+r+" could not be created."),null}}(j,c)),null!==le&&"string"==typeof ce&&(ce=le.createHTML(""));i&&i(e),dt=e}},yt=R({},[...k,...x,...L]),Et=R({},[...I,...M]),At=function(e){f(o.removed,{element:e});try{ae(e).removeChild(e)}catch(t){V(e)}},_t=function(e,t){try{f(o.removed,{attribute:t.getAttributeNode(e),from:t})}catch(e){f(o.removed,{attribute:null,from:t})}if(t.removeAttribute(e),"is"===e)if(Be||Ge)try{At(t)}catch(e){}else try{t.setAttribute(e,"")}catch(e){}},bt=function(e){let t=null,n=null;if(He)e="<remove></remove>"+e;else{const t=T(e,/^[\r\n\t ]+/);n=t&&t[0]}"application/xhtml+xml"===mt&&rt===ot&&(e='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+e+"</body></html>");const o=le?le.createHTML(e):e;if(rt===ot)try{t=(new Y).parseFromString(o,mt)}catch(e){}if(!t||!t.documentElement){t=se.createDocument(rt,"template",null);try{t.documentElement.innerHTML=it?ce:o}catch(e){}}const i=t.body||t.documentElement;return e&&n&&i.insertBefore(r.createTextNode(n),i.childNodes[0]||null),rt===ot?pe.call(t,Pe?"html":"body")[0]:Pe?t.documentElement:i},St=function(e){return ue.call(e.ownerDocument||e,e,B.SHOW_ELEMENT|B.SHOW_COMMENT|B.SHOW_TEXT|B.SHOW_PROCESSING_INSTRUCTION|B.SHOW_CDATA_SECTION,null)},Nt=function(e){return e instanceof W&&("string"!=typeof e.nodeName||"string"!=typeof e.textContent||"function"!=typeof e.removeChild||!(e.attributes instanceof G)||"function"!=typeof e.removeAttribute||"function"!=typeof e.setAttribute||"string"!=typeof e.namespaceURI||"function"!=typeof e.insertBefore||"function"!=typeof e.hasChildNodes)},Dt=function(e){return"function"==typeof D&&e instanceof D};function Rt(e,t,n){u(e,(e=>{e.call(o,t,n,dt)}))}const wt=function(e){let t=null;if(Rt(de.beforeSanitizeElements,e,null),Nt(e))return At(e),!0;const n=ft(e.nodeName);if(Rt(de.uponSanitizeElement,e,{tagName:n,allowedTags:Ne}),ze&&e.hasChildNodes()&&!Dt(e.firstElementChild)&&b(/<[/\w!]/g,e.innerHTML)&&b(/<[/\w!]/g,e.textContent))return At(e),!0;if(e.nodeType===ee)return At(e),!0;if(ze&&e.nodeType===te&&b(/<[/\w]/g,e.data))return At(e),!0;if(!(ke.tagCheck instanceof Function&&ke.tagCheck(n))&&(!Ne[n]||Oe[n])){if(!Oe[n]&&Ot(n)){if(Ce.tagNameCheck instanceof RegExp&&b(Ce.tagNameCheck,n))return!1;if(Ce.tagNameCheck instanceof Function&&Ce.tagNameCheck(n))return!1}if(Xe&&!Ke[n]){const t=ae(e)||e.parentNode,n=ie(e)||e.childNodes;if(n&&t){for(let o=n.length-1;o>=0;--o){const r=$(n[o],!0);r.__removalCount=(e.__removalCount||0)+1,t.insertBefore(r,re(e))}}}return At(e),!0}return e instanceof w&&!function(e){let t=ae(e);t&&t.tagName||(t={namespaceURI:rt,tagName:"template"});const n=h(e.tagName),o=h(t.tagName);return!!at[e.namespaceURI]&&(e.namespaceURI===nt?t.namespaceURI===ot?"svg"===n:t.namespaceURI===tt?"svg"===n&&("annotation-xml"===o||ct[o]):Boolean(yt[n]):e.namespaceURI===tt?t.namespaceURI===ot?"math"===n:t.namespaceURI===nt?"math"===n&&st[o]:Boolean(Et[n]):e.namespaceURI===ot?!(t.namespaceURI===nt&&!st[o])&&!(t.namespaceURI===tt&&!ct[o])&&!Et[n]&&(ut[n]||!yt[n]):!("application/xhtml+xml"!==mt||!at[e.namespaceURI]))}(e)?(At(e),!0):"noscript"!==n&&"noembed"!==n&&"noframes"!==n||!b(/<\/no(script|embed|frames)/i,e.innerHTML)?(Ue&&e.nodeType===Q&&(t=e.textContent,u([he,ge,Te],(e=>{t=y(t,e," ")})),e.textContent!==t&&(f(o.removed,{element:e.cloneNode()}),e.textContent=t)),Rt(de.afterSanitizeElements,e,null),!1):(At(e),!0)},Ct=function(e,t,n){if(ve[t])return!1;if(Ye&&("id"===t||"name"===t)&&(n in r||n in ht))return!1;if(Le&&!ve[t]&&b(ye,t));else if(xe&&b(Ee,t));else if(ke.attributeCheck instanceof Function&&ke.attributeCheck(t,e));else if(!Re[t]||ve[t]){if(!(Ot(e)&&(Ce.tagNameCheck instanceof RegExp&&b(Ce.tagNameCheck,e)||Ce.tagNameCheck instanceof Function&&Ce.tagNameCheck(e))&&(Ce.attributeNameCheck instanceof RegExp&&b(Ce.attributeNameCheck,t)||Ce.attributeNameCheck instanceof Function&&Ce.attributeNameCheck(t,e))||"is"===t&&Ce.allowCustomizedBuiltInElements&&(Ce.tagNameCheck instanceof RegExp&&b(Ce.tagNameCheck,n)||Ce.tagNameCheck instanceof Function&&Ce.tagNameCheck(n))))return!1}else if(Qe[t]);else if(b(Se,y(n,_e,"")));else if("src"!==t&&"xlink:href"!==t&&"href"!==t||"script"===e||0!==E(n,"data:")||!Ze[e]){if(Ie&&!b(Ae,y(n,_e,"")));else if(n)return!1}else;return!0},Ot=function(e){return"annotation-xml"!==e&&T(e,be)},vt=function(e){Rt(de.beforeSanitizeAttributes,e,null);const{attributes:t}=e;if(!t||Nt(e))return;const n={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:Re,forceKeepAttr:void 0};let r=t.length;for(;r--;){const i=t[r],{name:a,namespaceURI:l,value:c}=i,s=ft(a),m=c;let f="value"===a?m:A(m);if(n.attrName=s,n.attrValue=f,n.keepAttr=!0,n.forceKeepAttr=void 0,Rt(de.uponSanitizeAttribute,e,n),f=n.attrValue,!je||"id"!==s&&"name"!==s||(_t(a,e),f="user-content-"+f),ze&&b(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,f)){_t(a,e);continue}if("attributename"===s&&T(f,"href")){_t(a,e);continue}if(n.forceKeepAttr)continue;if(!n.keepAttr){_t(a,e);continue}if(!Me&&b(/\/>/i,f)){_t(a,e);continue}Ue&&u([he,ge,Te],(e=>{f=y(f,e," ")}));const d=ft(e.nodeName);if(Ct(d,s,f)){if(le&&"object"==typeof j&&"function"==typeof j.getAttributeType)if(l);else switch(j.getAttributeType(d,s)){case"TrustedHTML":f=le.createHTML(f);break;case"TrustedScriptURL":f=le.createScriptURL(f)}if(f!==m)try{l?e.setAttributeNS(l,a,f):e.setAttribute(a,f),Nt(e)?At(e):p(o.removed)}catch(t){_t(a,e)}}else _t(a,e)}Rt(de.afterSanitizeAttributes,e,null)},kt=function e(t){let n=null;const o=St(t);for(Rt(de.beforeSanitizeShadowDOM,t,null);n=o.nextNode();)Rt(de.uponSanitizeShadowNode,n,null),wt(n),vt(n),n.content instanceof s&&e(n.content);Rt(de.afterSanitizeShadowDOM,t,null)};return o.sanitize=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=null,r=null,i=null,l=null;if(it=!e,it&&(e="\x3c!--\x3e"),"string"!=typeof e&&!Dt(e)){if("function"!=typeof e.toString)throw S("toString is not a function");if("string"!=typeof(e=e.toString()))throw S("dirty is not a string, aborting")}if(!o.isSupported)return e;if(Fe||Tt(t),o.removed=[],"string"==typeof e&&(qe=!1),qe){if(e.nodeName){const t=ft(e.nodeName);if(!Ne[t]||Oe[t])throw S("root node is forbidden and cannot be sanitized in-place")}}else if(e instanceof D)n=bt("\x3c!----\x3e"),r=n.ownerDocument.importNode(e,!0),r.nodeType===J&&"BODY"===r.nodeName||"HTML"===r.nodeName?n=r:n.appendChild(r);else{if(!Be&&!Ue&&!Pe&&-1===e.indexOf("<"))return le&&We?le.createHTML(e):e;if(n=bt(e),!n)return Be?null:We?ce:""}n&&He&&At(n.firstChild);const c=St(qe?e:n);for(;i=c.nextNode();)wt(i),vt(i),i.content instanceof s&&kt(i.content);if(qe)return e;if(Be){if(Ge)for(l=me.call(n.ownerDocument);n.firstChild;)l.appendChild(n.firstChild);else l=n;return(Re.shadowroot||Re.shadowrootmode)&&(l=fe.call(a,l,!0)),l}let m=Pe?n.outerHTML:n.innerHTML;return Pe&&Ne["!doctype"]&&n.ownerDocument&&n.ownerDocument.doctype&&n.ownerDocument.doctype.name&&b(K,n.ownerDocument.doctype.name)&&(m="<!DOCTYPE "+n.ownerDocument.doctype.name+">\n"+m),Ue&&u([he,ge,Te],(e=>{m=y(m,e," ")})),le&&We?le.createHTML(m):m},o.setConfig=function(){Tt(arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}),Fe=!0},o.clearConfig=function(){dt=null,Fe=!1},o.isValidAttribute=function(e,t,n){dt||Tt({});const o=ft(e),r=ft(t);return Ct(o,r,n)},o.addHook=function(e,t){"function"==typeof t&&f(de[e],t)},o.removeHook=function(e,t){if(void 0!==t){const n=m(de[e],t);return-1===n?void 0:d(de[e],n,1)[0]}return p(de[e])},o.removeHooks=function(e){de[e]=[]},o.removeAllHooks=function(){de={afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},o}();return re}));
//# sourceMappingURL=purify.min.js.map
/* Créateur de personnage JJK — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, onglets (Fiche / Art / Équipement / Bio / Options), colonnes,
 * valeurs cliquables pour lancer les jets, journal de jets flottant.
 * La Fiche a trois colonnes (caractéristiques | combat | compétences), tout
 * dans l'ordre Body, Mind, Prestance ; une ligne par compétence (nom | stade
 * en menu | total-jet). L'onglet Art porte la personnalisation : les
 * passifs d'une compétence et son art (au stade Artiste).
 * Chaque module éditable porte un rouage (mode édition par module) : la
 * construction du personnage est verrouillée hors édition, seuls les gestes
 * de jeu restent actifs (jets, tchat, PV, narration, quantités, notes).
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures, actions) vient de
 * jjk-creation.json, généré au build par hooks/jjk_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence
 *     (Non initié, Initié, Maitre, Expert, Artiste), 20 xp par +5 de
 *     caractéristique (limite 80 sans avantage) ; le stade Artiste (sans bonus
 *     propre) ouvre l'art et les passifs de la compétence : le passif
 *     original est inclus dans le stade, les suivants coûtent 20 xp pièce ;
 *   - pas plus d'un quart de l'xp total investi dans une seule compétence ;
 *   - PV max = (20 + Body) / 2 ; récupération Body/10 PV par jour ;
 *   - jet = 1d100 + caractéristique (+ bonus de stade pour une compétence) ;
 *     96+ au dé : coup critique ; 5 ou moins : échec critique.
 *
 * Persistance : localStorage « jjk-perso » (état), « jjk-cards » (cartes
 * calculées, _current = brouillon), « jjk-persos » (bibliothèque). Clés
 * préfixées jjk- : le site partage son origine avec le site HxH.
 *
 * Dans Roll20 (l'extension affiche roll20-fiche.html, servie par CE site),
 * javascripts/jjk-roll20-boot.js pose AVANT ce script :
 *   - window.__jjkLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__jjkRoll : les jets partent dans le tchat Roll20 ;
 *   - window.__jjkCompact : masque la barre d'outils et la bibliothèque.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__jjkCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20, la
  // page d'amorce pose window.__jjkLocalStorage (shim -> Attributes Roll20)
  // avant ce script. Les appels sont tous sous try/catch : STORE peut être nul
  // (stockage refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__jjkLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte. Les deux sont
  // désormais INDÉPENDANTS : le schéma est un entier libre, que rien ne
  // déduit du majeur de la release, et le manifeste les publie séparément.
  // Un mod qui ferait parseInt(Jjk.version) pour en tirer le schéma se
  // tromperait dès la première fois où les deux divergeront.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens (renommage, fusion, déplacement, changement de type). Ajouter une
  // clé racine avec un défaut n'en est pas un : normalize() la complète et ne
  // purge aucune clé racine inconnue, donc une telle fiche s'ouvre dans les
  // deux sens sans migration. C'est ce qui permettra de livrer la disposition
  // des modules puis les mods sans forcer un 4.0.0 puis un 5.0.0.
  //
  // À l'inverse, une petite mise à jour (le Z de X.Y.Z) ne doit JAMAIS toucher
  // au format de l'état du personnage : c'est ce qui autorise une seule
  // archive par ligne X.Y, et c'est le seul garde-fou qui reste depuis que
  // l'écran de version ne paraît plus qu'au désaccord de schéma.
  //
  // Le suffixe « b » marque la branche beta, pour que le joueur voie sur quel
  // site il est. Il ne change PAS le rang : « 3.6.0b » et « 3.6.0 » sont de
  // même version, parce que la beta est ce que le site stable recevra à la
  // fusion (JjkMods.compareVersions tient cette règle).
  var RELEASE = "4.5.1";
  var SCHEMA = 4;

  var XP_CREATION = 500;      // xp de départ (le total reste modifiable)
  // Les deux barèmes de la création. Ce ne sont plus des murs : le bloc
  // Création des Options les décale ou les remplace, fiche par fiche (et pour
  // le plafond, caractéristique par caractéristique).
  var PTS_CREATION = 120;     // points de caractéristiques à la création
  var CARAC_MAX = 80;         // plafond d'une caractéristique
  var CARAC_PAS = 5;          // +5 par achat d'xp
  var MOD_PAS = 5;            // tous les modificateurs se règlent de 5 en 5
  var QUART = 4;              // « pas plus d'un quart de l'xp total »

  var ABBR = { Mind: "MIND", Body: "BODY", Prestance: "PRES" };

  // LE DÉ DES JETS DE TEST, écrit comme les règles le disent et comme Roll20
  // le comprend : « 96+ au dé est un coup critique, 5- au dé est un échec
  // critique ». cs> et cf< sont les annotations de critique de Roll20 : le
  // résultat s'y colore de lui-même dans le tchat, vert sur un critique et
  // rouge sur un échec critique, sans que la fiche ait à le calculer.
  var DE_DEFAUT = "1d100cs>96cf<5";
  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // jjk-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__jjkDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un renommage de compétence
  // suffirait à trahir la version qu'on croit rejouer.
  // Une archive est gelée par LIGNE X.Y, à la première release de la ligne :
  // les règles qu'elle embarque sont donc celles de ce jour-là, et un
  // correctif ultérieur qui les retoucherait ne serait archivé nulle part.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__jjkDataUrl : null;
    return u || (siteBase() + "jjk-creation.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids : décimal positif, virgule tolérée à la saisie, arrondi au centième
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  // affichage des poids : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 100) / 100); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements (équipement /
  // art / décision du MJ), sommés dans la valeur effective — le geste de la
  // fiche HxH. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  function nowStamp() { return new Date().toISOString(); }
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  // les compétences commencent toujours par une majuscule (« apnée » -> « Apnée »)
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  // ---------- état ----------
  function blank() {
    return {
      v: SCHEMA, rel: RELEASE,
      name: "", portrait: "", espece: "", age: "", sexe: "", genre: "",
      defaut: "", qualites: ["", ""], background: "", notes: "",
      notesJournal: { format: 1, messages: [] },
      avantages: [], sansLimite: false,
      // Le PLAFOND des caractéristiques et le budget de POINTS DE CRÉATION se
      // règlent (bloc Création des Options), avec la même grammaire que les
      // autres leviers : une valeur forcée, ou un modificateur du barème.
      // Ils remplacent l'ancienne case « Sans limite », qui ne savait que
      // lever le plafond, et pour les trois caractéristiques à la fois.
      caracsPlafondMod: { Mind: 0, Body: 0, Prestance: 0 },
      caracsPlafondForce: {},
      ptsCreaMod: 0, ptsCreaForce: null,
      caracsBase: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXp: { Mind: 0, Body: 0, Prestance: 0 },
      caracsMod: { Mind: 0, Body: 0, Prestance: 0 },
      // DEUX modificateurs par valeur, et non un seul : le premier pour
      // l'équipement, le second pour un art ou une décision du MJ. Un seul
      // champ obligeait à additionner de tête avant de saisir, et à défaire le
      // calcul pour retirer l'un des deux.
      caracsMod2: { Mind: 0, Body: 0, Prestance: 0 },
      // Les caractéristiques reçoivent les mêmes leviers que les compétences :
      // total forcé, et coût en xp forcé avec ses deux modificateurs.
      caracsForce: {}, caracsXpForce: {},
      caracsXpMod: { Mind: 0, Body: 0, Prestance: 0 },
      caracsXpMod2: { Mind: 0, Body: 0, Prestance: 0 },
      compsMod: {}, compsMod2: {}, compsXpMod2: {},
      xpTotal: XP_CREATION,
      comps: {}, customComps: [],
      // Catégories de techniques et passifs d'énergie occulte.
      energie: [],
      // leviers du MJ, par compétence (clé « Carac/Nom ») : total forcé
      // (vide = calculé), coût en xp forcé (vide = calculé), et modificateur
      // de ce coût
      compsForce: {}, compsXpForce: {}, compsXpMod: {},
      pv: null, em: null, emMax: 0, narration: 3,
      armes: [], armures: [], inventaire: "",
      // inventaire illustré : groupes, objets, et les réglages d'affichage du
      // module (le poids de JJK est un nombre SANS unité)
      inv: {
        texte: [], groupes: ["Sur soi"], objets: [],
        // Un drapeau « compté » par groupe, dans un tableau PARALLÈLE et non
        // dans le groupe lui-même : inv.groupes est un tableau de CHAÎNES que
        // sept endroits lisent tel quel (bandeau, renommage, menus du tiroir et
        // du dialogue Prendre, carte de tchat). Le passer en objets obligerait
        // à un pas de migration avec descente, et une archive qui relirait la
        // fiche écrirait « [object Object] » dans le tchat d'un joueur. Ici,
        // rien ne casse : normalize() ne purge pas les clés inconnues de `inv`,
        // donc une archive 3.0.0 fait voyager `comptes` intact sans savoir le
        // lire (elle compte simplement tout le poids, ce qui se voit à l'écran
        // et se répare en rouvrant la fiche).
        comptes: [true],
        // Les réglages d'affichage des TUILES : combien par ligne, et ce que
        // leur pied montre. « vign » ne commande plus rien : il servait à la
        // colonne de vignettes d'un inventaire en lignes, essayé puis retiré.
        // Il reste écrit dans les personnages déjà enregistrés, donc on le
        // garde pour ne pas le leur effacer, mais rien ne le lit.
        opts: { cols: 4, nom: true, qte: true, poids: false, total: true, vign: true }
      },
      divers: { pvMax: [0, 0, 0], regen: [0, 0, 0], vitesse: [0, 0, 0] },
      pvMaxOverride: null,
      vitesseOverride: null,
      regenOverride: null,
      // langues : des compétences de Mind à part entière (clé « Mind/<nom> »
      // dans comps), rassemblées dans leur module. langueBase = la langue du
      // personnage, acquise jusqu'à Expert sans rien coûter.
      langues: [], langueBase: "",
      // armes ajoutées par le joueur : des compétences de Body, rassemblées
      // dans le module Armes avec celles des règles (DATA.compsArmes)
      armesComps: [],
      // modules : le coffre privé de chaque module (id -> objet libre) et les
      // interrupteurs (id -> false pour les seuls modules coupés). Deux clés
      // RACINE avec un défaut : normalize() les complète, donc le schéma ne
      // monte pas et une fiche s'ouvre dans les deux sens.
      modData: {}, modActifs: {},
      // disposition des modules ({ ordre: [], place: {} }, éparse : seul ce que
      // le joueur a déplacé y figure) et mods du personnage (leur CODE voyage
      // avec lui). Deux clés racine de plus, mêmes raisons, même absence de
      // montée de schéma ; le blank() de jjk-attr-map.js les porte déjà, sans
      // quoi elles se perdraient sur le chemin de repli des Attributes Roll20.
      modules: {}, mods: [],
      de: DE_DEFAUT
    };
  }
  // Toute donnée entrante (localStorage, import JSON, Attributes Roll20) passe
  // par cette normalisation : champ manquant -> valeur par défaut, types sûrs.
  // La validation est PROFONDE (éléments des tableaux, sous-objets compris) :
  // un état corrompu ne doit ni briquer la page ni s'effacer en silence.
  // Migration de schéma, AVANT toute normalisation : normalize() complète et
  // nettoie selon la forme d'AUJOURD'HUI, donc il faut d'abord amener l'état
  // jusqu'ici. Le moteur est facultatif de naissance : le repli gelé de
  // roll20-fiche.html ne charge que le bundle, et une fiche sans moteur doit
  // s'ouvrir quand même — d'où le garde, qui restera pour toujours.
  // Une fiche VENUE DU FUTUR (v > SCHEMA) n'est pas migrée à la baisse en
  // douce : on la laisse telle quelle et l'amorce s'en occupe (écran de
  // version). Écrire dessus avec un code qui ne la comprend pas serait le
  // seul vrai moyen de la perdre. Le schéma est d'ailleurs le SEUL axe qui
  // fasse encore paraître cet écran : un simple écart de numéro de release ne
  // le déclenche plus, sans quoi un correctif de feuille de style barrerait
  // le passage à toute une table.
  function migre(s) {
    if (!s || typeof s !== "object") return s;
    var de = parseInt(s.v, 10);
    if (!isFinite(de)) de = 1;
    if (de === SCHEMA) return s;
    if (de > SCHEMA) return s;                     // du futur : ne rien toucher
    if (!window.JjkMigr || !window.JjkMigr.appliquer) return s;
    var r = window.JjkMigr.appliquer(s, de, SCHEMA);
    if (!r || !r.ok) return s;                     // échec : l'état d'origine, intact
    r.state.v = SCHEMA;
    r.state.rel = RELEASE;
    return r.state;
  }

  function normalize(s) {
    var b = blank();
    if (!s || typeof s !== "object") return b;
    s = migre(s);
    // Notes versionnées : l'ancien champ `notes` est conservé comme miroir
    // texte pour les bundles/archives antérieurs. À la première ouverture,
    // l'ancienne zone devient un message historique daté de façon neutre.
    if (s.notesJournal === undefined) {
      s.notesJournal = { format: 1, messages: typeof s.notes === "string" && s.notes.length
        ? [{ id: "legacy", at: 0, text: s.notes, mode: "plain" }] : [] };
    }
    Object.keys(b).forEach(function (k) { if (s[k] === undefined) s[k] = b[k]; });
    if (!s.notesJournal || s.notesJournal.format !== 1 || !Array.isArray(s.notesJournal.messages)) {
      s.notesJournal = { format: 1, messages: typeof s.notes === "string" && s.notes.length
        ? [{ id: "legacy", at: 0, text: s.notes, mode: "plain" }] : [] };
    } else {
      var noteIds = Object.create(null);
      s.notesJournal.messages = s.notesJournal.messages.filter(function (m) {
        if (!m || typeof m !== "object" || typeof m.id !== "string" || !m.id || noteIds[m.id] || typeof m.text !== "string") return false;
        noteIds[m.id] = true;
        m.mode = m.mode === "markdown" ? "markdown" : "plain";
        m.at = isFinite(Number(m.at)) && Number(m.at) >= 0 && Number(m.at) <= 8640000000000000 ? Number(m.at) : 0;
        return true;
      });
    }
    // La release suit toujours le code qui vient d'écrire : c'est lui qui fait
    // foi. Sur la beta, cela tamponne le suffixe sur n'importe quel personnage
    // seulement ouvert puis réenregistré ; c'est sans danger tant que le
    // suffixe ne change pas le rang, un « 3.6.0b » rouvert sur le site stable
    // 3.6.0 ne devant surtout pas passer pour venu du futur.
    if (parseInt(s.v, 10) === SCHEMA) s.rel = RELEASE;
    if (!s.caracsBase || typeof s.caracsBase !== "object") s.caracsBase = b.caracsBase;
    if (!s.caracsXp || typeof s.caracsXp !== "object") s.caracsXp = b.caracsXp;
    if (!s.caracsMod || typeof s.caracsMod !== "object") s.caracsMod = b.caracsMod;
    ["caracsMod2", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = { Mind: 0, Body: 0, Prestance: 0 };
    });
    ["caracsForce", "caracsXpForce", "caracsPlafondForce"].forEach(function (k) {
      if (!s[k] || typeof s[k] !== "object" || Array.isArray(s[k])) s[k] = {};
    });
    // les modificateurs (blocs Options) acceptent les décimales : les sommes
    // migrées depuis les anciens divers peuvent en porter
    function modNum(v) {
      var n = parseFloat(v);
      return isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    ["Mind", "Body", "Prestance"].forEach(function (c) {
      s.caracsBase[c] = clamp(num(s.caracsBase[c], 0), 0, 999);
      s.caracsXp[c] = clamp(num(s.caracsXp[c], 0), 0, 99);
      s.caracsMod[c] = modNum(s.caracsMod[c]);
      s.caracsMod2[c] = modNum(s.caracsMod2[c]);
      s.caracsXpMod[c] = modNum(s.caracsXpMod[c]);
      s.caracsXpMod2[c] = modNum(s.caracsXpMod2[c]);
      s.caracsPlafondMod[c] = modNum(s.caracsPlafondMod[c]);
      // forçages : ABSENTS par défaut, une valeur les pose
      ["caracsForce", "caracsXpForce", "caracsPlafondForce"].forEach(function (k) {
        if (s[k][c] === undefined || s[k][c] === null || s[k][c] === "") { delete s[k][c]; return; }
        var n = parseFloat(s[k][c]);
        if (isFinite(n)) s[k][c] = clamp(Math.round(n), -9999, 9999); else delete s[k][c];
      });
    });
    // budget de points de création : un modificateur, et un forçage qui vaut
    // null quand il n'y en a pas (même convention que pvMaxOverride)
    s.ptsCreaMod = modNum(s.ptsCreaMod);
    if (s.ptsCreaForce === undefined || s.ptsCreaForce === null || s.ptsCreaForce === "") s.ptsCreaForce = null;
    else {
      var pcf = parseFloat(s.ptsCreaForce);
      s.ptsCreaForce = isFinite(pcf) ? clamp(Math.round(pcf), -9999, 9999) : null;
    }
    // Migration de l'ancienne case « Sans limite » (retirée le 2026-08-04) :
    // elle levait le plafond des trois caractéristiques d'un coup. Une fiche
    // qui la portait cochée garde ses chiffres, plafond forcé assez haut pour
    // ne jamais mordre — mais SEULEMENT là où le plafond mordrait vraiment.
    // Sinon la case, cochée « au cas où » sur une fiche que 80 n'a jamais
    // gênée, laissait trois plafonds forcés à 9999 en travers du bloc.
    if (s.sansLimite) {
      ["Mind", "Body", "Prestance"].forEach(function (c) {
        if (s.caracsPlafondForce[c] !== undefined) return;
        if (s.caracsBase[c] + CARAC_PAS * s.caracsXp[c] > CARAC_MAX) s.caracsPlafondForce[c] = 9999;
      });
    }
    s.sansLimite = false;
    // modificateurs divers (3 emplacements : équipement / art / MJ) : seuls
    // PV max, régén et vitesse en portent encore
    if (!s.divers || typeof s.divers !== "object" || Array.isArray(s.divers)) s.divers = b.divers;
    s.divers.pvMax = modArr(s.divers.pvMax);
    s.divers.regen = modArr(s.divers.regen);
    s.divers.vitesse = modArr(s.divers.vitesse);
    if (!s.compsMod || typeof s.compsMod !== "object" || Array.isArray(s.compsMod)) s.compsMod = {};
    // migration inverse (2026-08-02) : les divers de caractéristiques et de
    // compétences (essai en ligne du 2026-08-01) redeviennent le modificateur
    // UNIQUE des blocs Options — leurs sommes s'y replient, rien ne se perd
    if (s.divers.caracs && typeof s.divers.caracs === "object") {
      ["Mind", "Body", "Prestance"].forEach(function (c) {
        var d = modSum(modArr(s.divers.caracs[c]));
        if (d) s.caracsMod[c] = modNum(s.caracsMod[c] + d);
      });
    }
    delete s.divers.caracs;
    if (s.divers.comps && typeof s.divers.comps === "object" && !Array.isArray(s.divers.comps)) {
      Object.keys(s.divers.comps).forEach(function (k) {
        var d = modSum(modArr(s.divers.comps[k]));
        if (d) s.compsMod[k] = modNum((parseFloat(s.compsMod[k]) || 0) + d);
      });
    }
    delete s.divers.comps;
    // modificateur unique par compétence (bloc Options) : clés normalisées
    // comme les compétences, entrées nulles purgées
    var cmods = {};
    Object.keys(s.compsMod).forEach(function (k) {
      var n = modNum(s.compsMod[k]);
      if (!n) return;
      var di = k.indexOf("/");
      cmods[di > 0 ? k.slice(0, di + 1) + capFirst(k.slice(di + 1)) : k] = n;
    });
    s.compsMod = cmods;
    // leviers du MJ, par compétence : les cartes de forçage acceptent le vide
    // (= valeur calculée) ; le modificateur de coût, lui, est un nombre
    function mapNombres(src, force) {
      var out = {};
      if (!src || typeof src !== "object" || Array.isArray(src)) return out;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        if (force && (v === null || v === undefined || v === "")) return;
        var n = parseFloat(v);
        if (!isFinite(n)) return;
        n = clamp(Math.round(n), -9999, 9999);
        if (!force && !n) return;   // zéro = pas d'entrée
        var i = k.indexOf("/");
        out[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = n;
      });
      return out;
    }
    s.compsForce = mapNombres(s.compsForce, true);
    s.compsXpForce = mapNombres(s.compsXpForce, true);
    s.compsXpMod = mapNombres(s.compsXpMod, false);
    // PV max forcé : vide = valeur calculée ; borné comme le reste
    s.pvMaxOverride = (s.pvMaxOverride === null || s.pvMaxOverride === undefined || s.pvMaxOverride === "")
      ? null : Math.floor(parseFloat(s.pvMaxOverride));
    if (s.pvMaxOverride !== null && !isFinite(s.pvMaxOverride)) s.pvMaxOverride = null;
    if (s.pvMaxOverride !== null) s.pvMaxOverride = clamp(s.pvMaxOverride, 0, 9999);
    // vitesse et régénération forcées : même règle, la vitesse en décimales
    // (la table donne des paliers comme 10.5 m)
    function force(v, dec, max) {
      if (v === null || v === undefined || v === "") return null;
      var n = parseFloat(v);
      if (!isFinite(n)) return null;
      return clamp(dec ? Math.round(n * 100) / 100 : Math.floor(n), 0, max);
    }
    s.vitesseOverride = force(s.vitesseOverride, true, 9999);
    s.regenOverride = force(s.regenOverride, false, 9999);
    // langues : noms uniques, capitalisés ; la langue de base doit être l'une
    // d'elles (sinon la gratuité viserait une langue absente)
    if (!Array.isArray(s.langues)) s.langues = [];
    var vues = {};
    s.langues = s.langues
      .map(function (n) { return capFirst(String(n == null ? "" : n).trim()); })
      .filter(function (n) {
        if (!n || vues[n.toLowerCase()]) return false;
        vues[n.toLowerCase()] = 1;
        return true;
      });
    s.langueBase = capFirst(String(s.langueBase == null ? "" : s.langueBase).trim());
    if (s.langueBase && !vues[s.langueBase.toLowerCase()]) s.langueBase = "";
    // armes ajoutées à la main : noms uniques, et jamais un doublon de celles
    // des règles (qui sont déjà dans le module)
    if (!Array.isArray(s.armesComps)) s.armesComps = [];
    var basiques = {};
    ((DATA && DATA.compsArmes) || []).forEach(function (n) { basiques[String(n).toLowerCase()] = 1; });
    var vuesA = {};
    s.armesComps = s.armesComps
      .map(function (n) { return capFirst(String(n == null ? "" : n).trim()); })
      .filter(function (n) {
        if (!n || vuesA[n.toLowerCase()] || basiques[n.toLowerCase()]) return false;
        vuesA[n.toLowerCase()] = 1;
        return true;
      });
    if (!Array.isArray(s.qualites)) s.qualites = ["", ""];
    s.qualites = s.qualites.map(function (q) { return q == null ? "" : String(q); });
    while (s.qualites.length < 2) s.qualites.push("");
    function objArray(a) {
      if (!Array.isArray(a)) return [];
      return a.filter(function (x) { return x && typeof x === "object"; });
    }
    s.avantages = objArray(s.avantages);
    // Les techniques occultes sont rangées par catégorie. Leur coût est un
    // entier en EO ; une catégorie ou une technique vide reste conservée pour
    // que l'édition ne fasse jamais disparaître une saisie en cours.
    s.energie = (Array.isArray(s.energie) ? s.energie : []).filter(function (c) {
      return c && typeof c === "object" && !Array.isArray(c);
    }).map(function (c) {
      var techniques = Array.isArray(c.techniques) ? c.techniques : [];
      return {
        name: String(c.name || ""),
        techniques: techniques.filter(function (t) {
          return t && typeof t === "object" && !Array.isArray(t);
        }).map(function (t) {
          var cout = Math.floor(parseFloat(t.cout));
          return {
            name: String(t.name || ""),
            cout: isFinite(cout) ? clamp(cout, 0, 9999) : 0,
            desc: String(t.desc || "")
          };
        })
      };
    });
    s.customComps = objArray(s.customComps);
    s.customComps.forEach(function (cc) { if (cc.name) cc.name = capFirst(cc.name); });
    s.armes = objArray(s.armes);
    s.armures = objArray(s.armures);
    if (typeof s.comps !== "object" || !s.comps) s.comps = {};
    var comps = {};
    Object.keys(s.comps).forEach(function (k) {
      var c = s.comps[k];
      if (!c || typeof c !== "object") c = {};
      c.stade = clamp(num(c.stade, 0), 0, DATA ? DATA.stades.length - 1 : 4);
      // la clé d'état s'appelle « techniques » (historique : elle a déjà été
      // migrée depuis « passifs », que l'interface réemploie aujourd'hui) ;
      // chaque entrée est un objet {name, desc} (l'ancien texte simple
      // devient le nom, description vide)
      if (!Array.isArray(c.techniques)) c.techniques = Array.isArray(c.passifs) ? c.passifs : [];
      delete c.passifs;
      c.techniques = c.techniques.map(function (p) {
        // cout : coût forcé de CE passif (null = le tarif de base) ; le joueur
        // peut le régler à droite du nom, en mode édition
        if (p && typeof p === "object") {
          var t = { name: String(p.name || ""), desc: String(p.desc || "") };
          var co = (p.cout === null || p.cout === undefined || p.cout === "") ? null : Math.floor(parseFloat(p.cout));
          if (co !== null && isFinite(co)) t.cout = clamp(co, 0, 9999);
          return t;
        }
        return { name: p == null ? "" : String(p), desc: "" };
      });
      // l'art du stade qui l'ouvre (Art) : {name, desc} ; un art resté vide s'efface
      if (c.art && typeof c.art === "object") {
        var aco = (c.art.cout === null || c.art.cout === undefined || c.art.cout === "")
          ? null : Math.floor(parseFloat(c.art.cout));
        c.art = { name: String(c.art.name || ""), desc: String(c.art.desc || "") };
        if (aco !== null && isFinite(aco)) c.art.cout = clamp(aco, 0, 9999);
        // un art vierge s'efface — son coût forcé n'aurait plus d'objet
        if (!c.art.name.trim() && !c.art.desc.trim()) delete c.art;
      } else delete c.art;
      // migration : noms de compétences capitalisés (« Body/apnée » -> « Body/Apnée »)
      var i = k.indexOf("/");
      comps[i > 0 ? k.slice(0, i + 1) + capFirst(k.slice(i + 1)) : k] = c;
    });
    s.comps = comps;
    // renommages de compétences (2026-08-02) : les fiches d'avant migrent
    // d'elles-mêmes — investissements, modificateurs et leviers du MJ suivent
    // le nouveau nom, rien ne se perd
    var RENOMMAGES = {
      "Body/Se cacher": "Body/Discrétion",
      "Body/Pique Longue": "Body/Pique longue",
      "Mind/Histoire Japon": "Mind/Histoire du Japon",
      "Mind/Se concentrer": "Mind/Concentration",
      "Mind/Résister à la douleur": "Mind/Résistance à la douleur",
      "Mind/Garder son calme": "Mind/Sang-froid",
      "Mind/Observer": "Mind/Observation",
      "Mind/Utiliser un autre de ses sens que la vue": "Mind/Sens autres que la vue",
      "Prestance/Déception": "Prestance/Tromperie",
      "Prestance/Commander": "Prestance/Commandement",
      "Prestance/Réconforter": "Prestance/Réconfort",
      // 26/08/2026, à la demande de l'auteur des règles
      "Mind/Politique régionale/nationale": "Mind/Politique du Japon"
    };
    // LES SEPT CARTES, ET NON CINQ. compsMod2 et compsXpMod2 sont le SECOND
    // levier du MJ : ils portent les mêmes clés que les autres et s'ajoutent à
    // eux dans les calculs (voir 110-calculs-comps.js et 080-calculs-caracs.js).
    // Les oublier ici faisait perdre ce second levier à chaque renommage — pour
    // les onze de 2026-08-02 comme pour celui d'aujourd'hui. Le commentaire
    // ci-dessus promet que « rien ne se perd » : il ne devient vrai que
    // maintenant.
    // ET L'ON VÉRIFIE QUE LA CARTE EXISTE. Les cinq premières sont normalisées
    // plus haut (lignes 69 et 114-116) et sont donc sûres ; les deux « 2 » ne
    // le sont PAS — rien ne les crée avant ce point sur un état venu de Roll20.
    // Sans ce garde, hasOwnProperty.call(undefined, …) lèverait, et c'est toute
    // la fiche qui ne s'ouvrirait plus.
    [s.comps, s.compsMod, s.compsMod2, s.compsForce,
     s.compsXpForce, s.compsXpMod, s.compsXpMod2].forEach(function (m) {
      if (!m || typeof m !== "object") return;
      Object.keys(RENOMMAGES).forEach(function (vieux) {
        if (Object.prototype.hasOwnProperty.call(m, vieux)) {
          if (m[RENOMMAGES[vieux]] === undefined) m[RENOMMAGES[vieux]] = m[vieux];
          delete m[vieux];
        }
      });
    });
    // inventaire structuré : liste (texte) + objets illustrés par groupes
    // (un tableau passerait le typeof : ses propriétés nommées seraient
    // perdues par JSON.stringify au premier save)
    if (!s.inv || typeof s.inv !== "object" || Array.isArray(s.inv)) s.inv = b.inv;
    s.inv.texte = objArray(s.inv.texte).map(function (it) {
      return {
        nom: it.nom == null ? "" : String(it.nom),
        qte: Math.max(0, num(it.qte, 1)),
        poids: pnum(it.poids),
        compte: it.compte !== false
      };
    });
    // réglages d'affichage du module (bornés : une fiche corrompue ne doit pas
    // produire une grille de 0 colonne)
    if (!s.inv.opts || typeof s.inv.opts !== "object" || Array.isArray(s.inv.opts)) s.inv.opts = b.inv.opts;
    s.inv.opts.cols = clamp(num(s.inv.opts.cols, b.inv.opts.cols), 1, 8);
    // chaque réglage garde SON défaut quand il manque (un opts partiel ne doit
    // pas allumer un affichage éteint par défaut)
    ["nom", "qte", "poids", "total", "vign"].forEach(function (k) {
      s.inv.opts[k] = s.inv.opts[k] === undefined ? b.inv.opts[k] : !!s.inv.opts[k];
    });
    if (!Array.isArray(s.inv.groupes)) s.inv.groupes = [];
    s.inv.groupes = s.inv.groupes.map(function (g) {
      g = g == null ? "" : String(g).trim();
      return g || "Groupe";
    });
    if (!s.inv.groupes.length) s.inv.groupes = ["Sur soi"];
    // Les drapeaux « compté » se recalent sur les groupes à chaque chargement :
    // un tableau plus court se complète (un groupe neuf est PORTÉ, jamais posé,
    // sinon du poids disparaîtrait en silence), un tableau plus long se coupe
    // (le groupe a été supprimé ailleurs). C'est un tableau RECONSTRUIT : ne
    // rien y ranger d'autre.
    if (!Array.isArray(s.inv.comptes)) s.inv.comptes = [];
    // PLUS DE DRAPEAUX QUE DE GROUPES : un groupe a été supprimé par une version
    // qui ignore « comptes » (une archive antérieure sait ouvrir ce personnage,
    // c'est même son rôle). Elle n'a pas retiré le drapeau correspondant, et
    // personne ne peut plus dire LEQUEL : couper la fin décalerait tous les
    // suivants, et un sac resterait posé au sol sans que rien ne le montre.
    // On rend donc tout au poids porté. Perdre un décochage se voit et se
    // refait ; perdre du poids en silence fausse la fiche sans prévenir.
    if (s.inv.comptes.length > s.inv.groupes.length) s.inv.comptes = [];
    s.inv.comptes = s.inv.groupes.map(function (_, gi) {
      return s.inv.comptes[gi] !== false;
    });
    var refsObjets = {};
    function hashRefObjet(v) {
      var texte = JSON.stringify(v), h = 2166136261;
      for (var ri = 0; ri < texte.length; ri++) { h ^= texte.charCodeAt(ri); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(36);
    }
    s.inv.objets = objArray(s.inv.objets).map(function (it, indexObjet) {
      // `id` reste l'identifiant métier utilisé par Donner/Prendre. `ref` est
      // une identité technique distincte et stable pour la synchronisation
      // Compact : elle ne dépend ni du nom ni du groupe après la migration.
      var refObjet = String(it.ref == null ? "" : it.ref).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
      if (!refObjet || refsObjets[refObjet]) {
        var baseRef = "i-" + hashRefObjet({ index: indexObjet, id: it.id || "", nom: it.nom || "", img: it.img || "", desc: it.desc || "" });
        refObjet = baseRef; var suffixeRef = 1;
        while (refsObjets[refObjet]) refObjet = baseRef + "-" + (++suffixeRef);
      }
      refsObjets[refObjet] = true;
      return {
        ref: refObjet,
        nom: it.nom == null ? "" : String(it.nom),
        // quantités et poids DÉCIMAUX (une demi-ration, 0.5 de poids…)
        qte: pnum(it.qte === undefined ? 1 : it.qte),
        poids: pnum(it.poids),
        img: it.img == null ? "" : String(it.img),
        desc: it.desc == null ? "" : String(it.desc),
        // identifiant libre : c'est LUI qui reconnaît le même objet d'une fiche
        // à l'autre quand on le donne (deux « Corde » différentes ne se
        // confondent pas si elles portent des identifiants distincts)
        id: it.id == null ? "" : String(it.id),
        achat: pnum(it.achat),
        vente: pnum(it.vente),
        groupe: clamp(num(it.groupe, 0), 0, s.inv.groupes.length - 1)
      };
    });
    // migration : l'ancien inventaire en texte libre (une ligne par objet)
    // devient des lignes de liste, quantité 1 et poids 0
    if (s.inventaire && typeof s.inventaire === "string" && !s.inv.texte.length) {
      s.inventaire.split(/\r?\n/).forEach(function (line) {
        line = line.trim();
        if (line) s.inv.texte.push({ nom: line, qte: 1, poids: 0, compte: true });
      });
      s.inventaire = "";
    }
    // migration : la liste (retirée de la fiche) se fond dans les objets
    // illustrés, au premier groupe ; sa case « compter le poids » disparaît
    if (s.inv.texte.length) {
      s.inv.texte.forEach(function (it) {
        s.inv.objets.push({ nom: it.nom, qte: it.qte, poids: it.poids, img: "", desc: "", groupe: 0 });
      });
      s.inv.texte = [];
    }
    // coffres des modules : le contenu appartient au module, la fiche ne juge
    // que la forme. Une entrée qui n'est pas un objet est jetée : elle ferait
    // planter le get() du module sans que personne ne sache pourquoi.
    if (!s.modData || typeof s.modData !== "object" || Array.isArray(s.modData)) s.modData = {};
    Object.keys(s.modData).forEach(function (k) {
      var d = s.modData[k];
      if (!d || typeof d !== "object") delete s.modData[k];
    });
    // interrupteurs : seuls les modules COUPÉS y figurent (false). Tout le
    // reste s'efface, pour qu'un module retiré un jour ne laisse pas de trace.
    if (!s.modActifs || typeof s.modActifs !== "object" || Array.isArray(s.modActifs)) s.modActifs = {};
    Object.keys(s.modActifs).forEach(function (k) {
      if (s.modActifs[k] !== false) delete s.modActifs[k];
    });
    // Disposition des modules. ÉPARSE : on valide ce qui est là sans rien
    // matérialiser. Écrire un « ordre » vide chez tout le monde ferait voyager
    // une liste inutile jusque dans les Attributes Roll20, et un module ajouté
    // demain n'apparaîtrait pas chez un personnage rangé avant lui.
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
    }
    if (s.modules.place !== undefined) {
      var placeSrc = s.modules.place;
      var place = {};
      if (placeSrc && typeof placeSrc === "object" && !Array.isArray(placeSrc)) {
        Object.keys(placeSrc).forEach(function (id) {
          var p = placeSrc[id];
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
    // Mods du personnage. Le moteur (jjk-mods.js) fait foi quand il est là :
    // c'est lui qui connaît la forme d'un mod. Sans lui, la fiche s'en tient au
    // strict nécessaire, mais elle ne s'en dispense JAMAIS : un état venu
    // d'ailleurs (import, Attributes d'un autre joueur) ne doit pas entrer sans
    // contrôle, et un mod sans id ni code ne pourrait ni tourner ni se nommer.
    if (!Array.isArray(s.mods)) s.mods = [];
    if (window.JjkMods && typeof window.JjkMods.normalise === "function") {
      try {
        var normes = window.JjkMods.normalise(s.mods);
        if (Array.isArray(normes)) s.mods = normes;
      } catch (e) {}
    }
    var vusMods = {};
    s.mods = objArray(s.mods).filter(function (m) {
      // L'id impose son alphabet : il sert de clé partout (avis du navigateur,
      // journal « [mod:<id>] », coffre du module qu'il remplacerait). Même
      // règle que le moteur (idPropre) : les deux chemins doivent donner le
      // MÊME id, sans quoi l'empreinte changerait selon le chemin pris et le
      // joueur aurait à réautoriser un mod qu'il connaît déjà.
      m.id = String(m.id == null ? "" : m.id).toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
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
    s.xpTotal = Math.max(0, num(s.xpTotal, XP_CREATION));
    s.narration = clamp(num(s.narration, 3), 0, 99);
    s.pv = (s.pv === null || s.pv === undefined || s.pv === "") ? null : parseFloat(s.pv);
    if (s.pv !== null && !isFinite(s.pv)) s.pv = null;
    s.emMax = clamp(Math.floor(num(s.emMax, 0)), 0, 9999);
    s.em = (s.em === null || s.em === undefined || s.em === "") ? null : parseFloat(s.em);
    if (s.em !== null && !isFinite(s.em)) s.em = null;
    return s;
  }

  // ---------- filtres de calcul ----------
  // Un filtre intercepte une valeur DÉRIVÉE (total de caractéristique, PV max,
  // initiative…) juste après son calcul. Le calcul lui-même garde son nom
  // suffixé « Brut » ; le nom public appelle le brut, puis passe la valeur aux
  // filtres enregistrés pour ce nom. C'est par là qu'un mod change une règle de
  // calcul sans qu'on rouvre ce fichier, et sans avoir à réécrire le module qui
  // affiche la valeur : tout ce qui lit caracTotal() voit le même chiffre.
  //
  // Les CASCADES sont voulues, et elles tombent toutes seules : pvMaxAuto()
  // appelle caracTotal(), donc un filtre sur caracTotal se voit dans les PV ;
  // poidsMalus() appelle poidsPorte() et compValue() appelle poidsMalus(), donc
  // un filtre sur le poids se voit dans toutes les compétences de Body, dans
  // l'initiative et dans la vitesse ; xpDepense() appelle compXp(). Les gardes
  // ci-dessous sont par NOM, jamais globales, pour ne pas couper ces chaînes-là.
  var filtres = {};            // nom -> [{ fn, prop, echecs }], ordre d'enregistrement
  var filtresEnCours = {};     // nom -> 1 pendant sa passe (garde de récursion)
  var FILTRE_FAUTES = 5;       // même seuil que la muselière des modules, même raison
  // À qui appartient ce qui s'enregistre : monteModules le pose autour du build
  // d'un module, l'exécution des mods autour du moteur. Hors de tout
  // propriétaire (console du navigateur), personne ne répond : « ? ».
  var proprietaireCourant = "?";
  // L'id du mod que le moteur est en train de lancer, ou null. Différent de
  // proprietaireCourant, qui vaut aussi pendant le build d'un module natif.
  var modEnExec = null;
  var PROP_MOD = "mod";        // repli quand le moteur ne nomme pas le mod qui tourne
  // Vrai pendant un montage. Ce qui s'enregistre HORS d'un montage (console du
  // navigateur, script tiers chargé après la fiche) n'a personne pour le
  // rejouer après la remise à zéro du prochain mount() : on le garde ici.
  var enMontage = false;
  // { mod: module, prop } ou { nom, fn, prop } pour un filtre : chaque entrée
  // dit à QUI elle est, faute de quoi rien ne saurait plus l'en défaire
  var horsMontage = [];
  // Les dix points de filtre. La table ne sert qu'à prévenir d'un nom mal
  // tapé : un filtre posé sur « pvmax » ne serait jamais appelé, et rien ne le
  // dirait.
  var FILTRES_CONNUS = {
    caracTotal: 1, compValue: 1, compXp: 1, pvMax: 1, initiative: 1,
    vitesse: 1, regen: 1, poidsPorte: 1, poidsMalus: 1, xpDepense: 1
  };
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs (mod,
  // état importé). Sans elle, un nom comme « toString » répond « oui » depuis
  // Object.prototype, et la suite manipule une méthode en croyant tenir une
  // donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
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
    // comptait double (+20, +40, +60…), sans que rien ne le montre. Même
    // nom, même propriétaire, même texte de fonction : c'est le même filtre,
    // et le reposer ne veut pas dire le vouloir deux fois.
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
  // Ce qui attend le prochain montage porte son PROPRIÉTAIRE (celui du filtre,
  // l'id du module pour un enregistrement) et ne s'inscrit qu'UNE FOIS. Sans ce
  // second point, un bouton qui repose le même filtre à chaque clic l'empile :
  // deux clics et le bonus compte double, à chaque montage, pour toujours.
  //
  // COMPARER LES FONCTIONS PAR RÉFÉRENCE NE SUFFIT PAS, et c'est le piège qui a
  // laissé passer ce défaut une première fois : « function (v) { return v + 20; } »
  // écrit DANS un gestionnaire de clic fabrique un objet NEUF à chaque clic.
  // Deux entrées identiques à la lettre près étaient donc jugées différentes et
  // s'empilaient (+20, +40, +60…). On compare donc aussi le TEXTE de la
  // fonction. Deux filtres vraiment distincts qui s'écriraient caractère pour
  // caractère pareil se confondraient, mais poser deux fois le même calcul pour
  // qu'il compte double n'est pas un usage : l'empilement sans fin, si.
  function signeFn(fn) {
    try { return String(fn); } catch (e) { return ""; }
  }
  function gardeHorsMontage(e) {
    if (!e.mod) e.src = signeFn(e.fn);
    // l'état des mods AU MOMENT du dépôt : le rejeu s'en sert pour savoir si la
    // liste a bougé depuis (voir rejoueHorsMontage)
    e.sig = signatureAuMontage;
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
  // Rejoué au début de chaque montage, dans l'ordre : le contrat promet qu'un
  // Jjk.filtre ou un Jjk.enregistre lancé depuis la console vaut « pour le
  // montage suivant » — et pour tous ceux d'après, rien d'autre ne le rejoue.
  //
  // Mais seulement ce qui a encore un ayant droit. Ce qui appartient à un MOD ne
  // se rejoue que tant que ce mod est sur le personnage, actif et accordé :
  // sinon le filtre posé par le bouton d'un mod refusé, coupé ou supprimé
  // continuerait de fausser les calculs à chaque montage, sans un mot et sans
  // rien pour le défaire — seul un rechargement complet de la page en viendrait
  // à bout, geste que le joueur n'a pas dans l'iframe Roll20. Le bilan du
  // montage précédent sert encore ici, c'est lui qui reconnaît un id de mod :
  // executeMods ne le remplace qu'après. Le propriétaire « ? » (console du
  // navigateur) est promis par le contrat, il se rejoue toujours.
  // Ce que les mods du personnage donnent à voir : leurs id, leur interrupteur
  // et l'accord du navigateur. Il change dès qu'un mod est ajouté, retiré,
  // coupé, autorisé ou refusé — et c'est exactement à ces moments-là que ce qui
  // n'a PAS d'ayant droit connu doit cesser d'être rejoué.
  function signatureMods() {
    var l = (state && Array.isArray(state.mods)) ? state.mods : [];
    return l.map(function (m) {
      return String(m.id) + ":" + (m.actif !== false ? "1" : "0") + ":" + avisMod(empreinteMod(m.id, m.src));
    }).join("|");
  }
  var signatureAuMontage = null;
  function rejoueHorsMontage() {
    var sig = signatureMods();
    var reste = [];
    horsMontage.forEach(function (h) {
      if (propEstUnMod(h.prop) && !modAutorise(h.prop)) return;
      // LE FILET. Un mod qui pose un filtre depuis un setTimeout, ou depuis un
      // écouteur qu'il a accroché lui-même, échappe à toute attribution : son
      // propriétaire vaut « ? », comme une ligne tapée dans la console, que le
      // contrat promet de conserver. On ne peut pas distinguer les deux — mais
      // on peut refuser de rejouer un « ? » anonyme dès que la liste des mods a
      // BOUGÉ. Le joueur qui refuse, coupe ou supprime un mod voit alors partir
      // ce que ce mod avait installé, quel qu'en soit le chemin. Une mise au
      // point à la console, elle, ne touche pas aux mods : elle survit.
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
  // pour cette passe (la valeur d'avant continue son chemin) et compte une
  // faute ; cinq fautes de SUITE et il part, parce qu'un filtre cassé fausserait
  // chaque calcul de la fiche sans que personne ne sache d'où vient le chiffre.
  // Une passe sans faute remet son compteur à zéro.
  function applique(nom, valeur, infos) {
    var liste = filtres[nom];
    if (!liste || !liste.length) return valeur;
    // Garde de récursion : pendant la passe, tout nouvel appel au MÊME calcul
    // rend le brut. Sans elle, un filtre qui lit ctx.calculs.caracTotal se
    // rappellerait sans fin et figerait l'onglet.
    if (filtresEnCours[nom]) return valeur;
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
    // le propriétaire porte l'erreur : c'est ce que Jjk.etat(id) rend, et ce
    // que les listes de mods et de modules affichent
    etatModule(f.prop).erreur = texte;
  }
  // Jjk.filtre : le propriétaire est celui du moment. ctx.filtreCalcul, lui,
  // fige l'id de son module à la construction du contexte (un module qui pose
  // un filtre depuis un bouton, longtemps après son build, reste chez lui).
  function filtreCalcul(nom, fn) { ajouteFiltre(nom, fn, proprietaireCourant); }

  // ---------- calculs ----------
  // Chaque valeur dérivée existe en deux temps : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur avant le forçage du MJ, et elles ne bougent pas.
  // Plafond d'une caractéristique : le barème (80), décalé par le modificateur
  // du bloc Création, ou remplacé net par un plafond forcé. UN SEUL endroit le
  // calcule : les garde-fous des boutons, l'infobulle et le champ forcé des
  // Options lisent tous cette fonction, sinon deux d'entre eux finissent par
  // dire des chiffres différents du total réellement retenu.
  function caracPlafondAuto(c) { return CARAC_MAX + (state.caracsPlafondMod[c] || 0); }
  function caracPlafond(c) {
    if (state.caracsPlafondForce[c] !== undefined) return state.caracsPlafondForce[c];
    return caracPlafondAuto(c);
  }
  // budget de points de caractéristiques à la création : même grammaire
  function ptsCreaAuto() { return PTS_CREATION + (state.ptsCreaMod || 0); }
  function ptsCreaMax() {
    if (state.ptsCreaForce !== null && state.ptsCreaForce !== undefined) return state.ptsCreaForce;
    return ptsCreaAuto();
  }
  function caracTotalBrut(c) {
    // total FORCÉ : il court-circuite tout, plafond et modificateurs compris
    if (state.caracsForce[c] !== undefined) return state.caracsForce[c];
    var v = state.caracsBase[c] + CARAC_PAS * state.caracsXp[c];
    v = Math.min(v, caracPlafond(c));
    // le modificateur (bloc Options) s'applique APRÈS le plafond : il peut
    // porter le total au-delà de 80 comme en dessous de 0.
    return v + (state.caracsMod[c] || 0) + (state.caracsMod2[c] || 0);
  }
  function caracTotal(c) {
    var v = caracTotalBrut(c);
    // le test évite de fabriquer l'objet d'infos pour rien : ce calcul-là est
    // rappelé des centaines de fois par rafraîchissement
    return aFiltre("caracTotal") ? applique("caracTotal", v, { carac: c }) : v;
  }
  function stadeInfo(i) { return DATA.stades[clamp(i, 0, DATA.stades.length - 1)]; }
  // coût d'un passif : son coût forcé s'il en porte un, sinon le tarif de base
  // (20 xp) — TOUS les passifs sont payants, aucun n'est offert par un stade
  function techXp(t) {
    return (t && t.cout !== null && t.cout !== undefined && isFinite(t.cout))
      ? t.cout : DATA.xpParStade;
  }
  // coût de l'art : rien par défaut (il vient avec son stade), sauf coût forcé
  function artXp(c) {
    return (c && c.art && c.art.cout !== null && c.art.cout !== undefined && isFinite(c.art.cout))
      ? c.art.cout : 0;
  }
  // clés et repères des compétences que la fiche traite à part
  var INIT_KEY = "Body/Initiative";
  var LANGUE_CARAC = "Mind";
  // les compétences d'ARMES sont TOUJOURS des compétences de Body
  var ARME_CARAC = "Body";
  function armeKey(nom) { return ARME_CARAC + "/" + nom; }
  // celles des règles, puis celles que le joueur a ajoutées
  function armesNoms() {
    return ((DATA && DATA.compsArmes) || []).concat(state.armesComps);
  }
  // Reconnaître une compétence d'arme par sa CLÉ, et surtout pas par le drapeau
  // « arme » que allComps() pose sur ses items : compValue() ne reçoit jamais
  // l'item, et ctx.ligneComp construit le sien SANS ce drapeau. Un mod qui
  // afficherait une ligne de Katana verrait alors le malus de poids tomber sur
  // une attaque, que la règle exempte. Passer par armesNoms() plutôt que par une
  // liste figée fait qu'une arme ajoutée par le joueur en est exempte aussitôt.
  // Une compétence d'arme, c'est-à-dire l'attaque et la parade, que le malus de
  // poids épargne.
  //
  // Les armes des règles font foi. Une arme PERSONNALISÉE, elle, n'exempte que
  // si son nom ne recouvre pas une compétence de Body existante : sans cette
  // réserve, un joueur qui baptise son arme « Esquive » ou « Sprint » retirerait
  // le malus de poids à la compétence du même nom, initiative comprise, et rien
  // à l'écran ne le dirait.
  function estArme(key) {
    var rgl = (DATA && DATA.compsArmes) || [];
    var i;
    for (i = 0; i < rgl.length; i++) if (armeKey(rgl[i]) === key) return true;
    var body = (DATA && DATA.comps && DATA.comps[ARME_CARAC]) || [];
    for (i = 0; i < state.armesComps.length; i++) {
      if (armeKey(state.armesComps[i]) !== key) continue;
      return body.indexOf(state.armesComps[i]) < 0;
    }
    return false;
  }
  function langueKey(nom) { return LANGUE_CARAC + "/" + nom; }
  // index du stade « Expert » : la langue du personnage y monte gratuitement
  function stadeIndex(nom) {
    for (var i = 0; i < DATA.stades.length; i++) {
      if ((DATA.stades[i].nom || "").toLowerCase() === nom) return i;
    }
    return -1;
  }
  function stadeExpert() {
    var i = stadeIndex("expert");
    return i >= 0 ? i : Math.max(0, DATA.stades.length - 2);
  }
  function compXpBrut(c, key) {
    // coût forcé (Options) : il court-circuite tout le calcul
    if (key && state.compsXpForce[key] !== undefined) return state.compsXpForce[key];
    // la langue du personnage est acquise : ses stades ne coûtent rien
    // jusqu'à Expert, au-delà seule la différence se paie
    var stadesDus = c.stade;
    if (key && state.langueBase && key === langueKey(state.langueBase)) {
      stadesDus = Math.max(0, c.stade - stadeExpert());
    }
    var xp = DATA.xpParStade * stadesDus;
    // les passifs PRÉSENTS restent facturés même si le stade ne les ouvre
    // plus (fiches d'avant un déplacement du stade d'ouverture : rien ne
    // doit disparaître ni se re-créditer en silence)
    (c.techniques || []).forEach(function (t) { xp += techXp(t); });
    return xp + artXp(c) +
           (key ? (state.compsXpMod[key] || 0) + (state.compsXpMod2[key] || 0) : 0);
  }
  function compXp(c, key) {
    var v = compXpBrut(c, key);
    return aFiltre("compXp") ? applique("compXp", v, { cle: key, comp: c }) : v;
  }
  // Ce qu'une caractéristique coûte, forçage et modificateurs compris. Elle
  // se règle désormais comme une compétence : c'est le même geste pour le MJ.
  function caracXp(c) {
    if (state.caracsXpForce[c] !== undefined) return state.caracsXpForce[c];
    return DATA.xpParStade * (state.caracsXp[c] || 0) +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function caracXpAuto(c) {
    return DATA.xpParStade * (state.caracsXp[c] || 0) +
           (state.caracsXpMod[c] || 0) + (state.caracsXpMod2[c] || 0);
  }
  function compCap() { return Math.floor(state.xpTotal / QUART); }
  // le total appelle compXp() et non compXpBrut() : un filtre sur le coût d'une
  // compétence doit se voir dans l'xp dépensé, sinon les deux chiffres de
  // l'en-tête se contrediraient
  function xpDepenseBrut() {
    var xp = 0;
    ["Mind", "Body", "Prestance"].forEach(function (c) { xp += caracXp(c); });
    Object.keys(state.comps).forEach(function (k) { xp += compXp(state.comps[k], k); });
    return xp;
  }
  function xpDepense() {
    var v = xpDepenseBrut();
    return aFiltre("xpDepense") ? applique("xpDepense", v, {}) : v;
  }
  function xpRestant() { return state.xpTotal - xpDepense(); }
  // xp dépensé DANS un champ : la montée de la caractéristique elle-même, plus
  // toutes les compétences qui s'y rattachent (armes et langues comprises,
  // elles sont des compétences de Body et de Mind)
  function xpChamp(carac) {
    var xp = caracXp(carac);
    Object.keys(state.comps).forEach(function (k) {
      if (k.slice(0, carac.length + 1) === carac + "/") xp += compXp(state.comps[k], k);
    });
    return xp;
  }
  function ptsCreation() {
    return state.caracsBase.Mind + state.caracsBase.Body + state.caracsBase.Prestance;
  }
  // PV, régénération et coûts d'xp lisent caracTotal("Body") SANS le malus de
  // poids, et c'est voulu : la charge ne mord que sur les compétences de Body
  // (hors armes) et sur la vitesse, or aucun de ces trois-là n'en est. Un sac
  // lourd ralentit et fait rater, il ne coûte ni points de vie maximum, ni
  // régénération quotidienne, ni xp.
  // les valeurs issues d'une division s'arrondissent à l'INFÉRIEUR
  function pvMaxAuto() { return Math.floor((20 + caracTotal("Body")) / 2) + modSum(state.divers.pvMax); }
  // PV max : la valeur forcée (Options du bloc PV) court-circuite le calcul
  function pvMaxBrut() { return state.pvMaxOverride !== null ? state.pvMaxOverride : pvMaxAuto(); }
  function pvMax() {
    var v = pvMaxBrut();
    return aFiltre("pvMax") ? applique("pvMax", v, {}) : v;
  }
  function pvCourant() { return state.pv === null ? pvMax() : state.pv; }
  function regenAuto() { return Math.max(0, Math.floor(caracTotal("Body") / 10) + modSum(state.divers.regen)); }
  function regenBrut() { return state.regenOverride !== null ? state.regenOverride : regenAuto(); }
  function regen() {
    var v = regenBrut();
    return aFiltre("regen") ? applique("regen", v, {}) : v;
  }
  // Le poids des objets se calcule ICI et nulle part ailleurs : le module
  // d'inventaire lit les mêmes trois fonctions que poidsPorteBrut(). Deux
  // calculs séparés finiraient par se contredire à l'écran (le pied du module
  // annonçant un chiffre, l'initiative en supposant un autre), ce qui est pire
  // que l'absence du réglage.
  //
  // Un groupe décoché est posé au sol : ses objets restent dans la fiche, se
  // lisent, se donnent et se déplacent, mais leur poids ne pèse plus sur le
  // personnage.
  function invCompte(gi) { return state.inv.comptes[gi] !== false; }
  function poidsGroupe(gi) {
    var t = 0;
    state.inv.objets.forEach(function (o) {
      if (o.groupe === gi) t += pnum(o.qte) * pnum(o.poids);
    });
    return Math.round(t * 100) / 100;
  }
  // porte = true : ce qui est SUR le personnage ; false : ce qu'il a posé.
  function poidsObjets(porte) {
    var t = 0;
    state.inv.groupes.forEach(function (_, gi) {
      if (invCompte(gi) === porte) t += poidsGroupe(gi);
    });
    return Math.round(t * 100) / 100;
  }
  // Poids porté : tout ce que le personnage a sur lui — armes, armures et
  // objets de l'inventaire (quantité comprise). C'est la SOURCE du malus, pas le
  // malus : il s'affiche tel quel partout où il s'affichait, et poidsMalus() en
  // tire le chiffre qui pénalise réellement les jets.
  function poidsPorteBrut() {
    var t = 0;
    state.armes.forEach(function (a) { t += pnum(a.poids); });
    state.armures.forEach(function (a) { t += pnum(a.poids); });
    // les groupes posés au sol ne pèsent plus : c'est la case du bandeau. Les
    // armes et les armures, elles, sont toujours sur le personnage.
    t += poidsObjets(true);
    return Math.round(t * 100) / 100;
  }
  function poidsPorte() {
    var v = poidsPorteBrut();
    return aFiltre("poidsPorte") ? applique("poidsPorte", v, {}) : v;
  }
  // LE MALUS, qui n'est pas le poids : les règles arrondissent le total porté à
  // la dizaine INFÉRIEURE, si bien qu'un poids de 19 n'ôte que 10 et qu'un poids
  // de 9 n'ôte rien. Il se dérive de poidsPorte() (le public, pas le brut) pour
  // qu'un filtre de mod sur le poids se voie dans le malus.
  //
  // Math.max(0 : un filtre peut rendre un poids NÉGATIF (applique() ne vérifie
  // que la finitude), et Math.floor(−5 / 10) × 10 vaut −10, c'est-à-dire un
  // BONUS de 10 à tous les jets de Body que personne n'a demandé.
  function poidsMalusBrut() {
    return Math.max(0, Math.floor(poidsPorte() / 10) * 10);
  }
  function poidsMalus() {
    var v = poidsMalusBrut();
    return aFiltre("poidsMalus") ? applique("poidsMalus", v, {}) : v;
  }
  // La caractéristique telle qu'on la LANCE.
  //
  // LE POIDS NE PÈSE PLUS SUR LA CARACTÉRISTIQUE (arbitrage du MJ, 2026-08-04) :
  // lancer Body en direct se fait au total plein. La charge garde ses deux autres
  // prises, et elles seules : les COMPÉTENCES de Body hors armes (compPoidsMalus)
  // et la VITESSE, dont le palier se lit sur un Body diminué (bodyVitesse), la
  // surcharge en plus. Un seul mécanisme par endroit, jamais deux fois le même.
  //
  // La fonction reste, plutôt que d'appeler caracTotal partout : elle est le point
  // unique où la question « ce jet subit-il la charge ? » se pose, l'affichage en
  // tire le « · poids −N » de la tuile (nul, donc absent), et les mods l'appellent
  // par l'API. Si l'arbitrage rebasculait, une ligne suffirait.
  function caracJet(c) {
    return caracTotal(c);
  }
  // Initiative : une compétence de Body comme les autres, malus de poids compris.
  function initComp() { return state.comps[INIT_KEY] || blankComp(); }
  // LE POIDS NE SE SOUSTRAIT PLUS ICI (arbitrage du MJ, 2026-08-04). Body/Initiative
  // est une compétence de Body : compValue() lui applique déjà le malus, comme à
  // l'esquive ou à la course, et l'ôter une seconde fois le comptait deux fois.
  // Un seul mécanisme, appliqué une seule fois.
  //
  // Conséquence voulue : le malus de l'initiative est désormais ARRONDI à la
  // dizaine inférieure (19 de poids porté valent −10), là où cette ligne
  // soustrayait le poids exact. La formule des règles (« Initiative = D100 +
  // Body − poids ») reste vraie : « poids » y désigne ce malus arrondi.
  //
  // compValue() (le public, pas le brut) : un filtre sur le total d'une
  // compétence doit se voir dans l'initiative. L'arrondi au centième reste, les
  // modificateurs de compétence acceptant les décimales.
  function initiativeBrut() {
    return Math.round(compValue("Body", initComp(), INIT_KEY) * 100) / 100;
  }
  function initiative() {
    var v = initiativeBrut();
    return aFiltre("initiative") ? applique("initiative", v, {}) : v;
  }
  // Le Body qui INDEXE la table des vitesses : le POIDS NE S'EN RETRANCHE PLUS
  // (arbitrage du MJ, 2026-08-04). Porter lourd ne fait plus descendre le
  // personnage dans la table ; la charge ne touche la vitesse que par la
  // surcharge ci-dessous, et seulement quand elle dépasse le Body. Un seul
  // endroit le calcule, l'infobulle de la tuile le lit ici aussi, sinon elle
  // annoncerait un palier lu sur un autre chiffre que celui qui a servi.
  function bodyVitesse() { return caracTotal("Body"); }
  // La surcharge est un MALUS DE VITESSE, et la règle l'énonce désormais comme
  // tel (« notre vitesse diminue de 3 m »). L'ancienne formulation annonçait la
  // vitesse RÉSULTANTE (« passe à 6 m ») : elle ne tenait que parce que le poids
  // ramenait alors le palier au premier, ce qu'il ne fait plus. Un personnage
  // robuste et surchargé garde donc son palier, moins ces mètres-là.
  //
  // La valeur se LIT dans les données plutôt que de s'écrire ici : la fiche ne
  // porte aucune valeur de règles, et le jour où la phrase change, le malus suit
  // sans qu'on rouvre ce fichier. Données trop anciennes ou phrase reformulée :
  // la fiche n'invente rien, la surcharge ne s'applique simplement pas.
  function surchargeMalus() {
    var malus = parseFloat(DATA && DATA.vitesseSurcharge);
    return isFinite(malus) && malus > 0 ? malus : null;
  }
  function estSurcharge() {
    return surchargeMalus() !== null && poidsMalus() > caracTotal("Body");
  }
  // la table des règles donne une CHAÎNE (« 10.5 m ») : le palier s'extrait en
  // nombre pour recevoir les divers, puis se réaffiche avec son unité
  function vitessePalier() {
    // arrondi à l'inférieur : un Body décimal (divers) tomberait sinon dans
    // les trous de la table (39.5 entre les lignes 0-39 et 40-79) et
    // retomberait sur la DERNIÈRE ligne, la vitesse maximale
    var b = Math.floor(Math.max(0, bodyVitesse()));   // négatif : 1er palier
    var rows = DATA.vitesses || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (b >= r.min && (r.max === null || b <= r.max)) return r.vitesse;
    }
    return rows.length ? rows[rows.length - 1].vitesse : "";
  }
  function vitesseBase() {
    // UNE SEULE PRISE DE LA CHARGE SUR LA VITESSE, et c'est la surcharge : le
    // palier se lit sur le Body plein, puis, si la charge dépasse ce Body, la
    // règle retranche ses mètres. Le poids ne fait plus descendre le personnage
    // dans la table (il le faisait avant l'arbitrage du 2026-08-04, et les deux
    // effets se cumulaient alors).
    //
    // Les modificateurs divers et le forçage du MJ restent en aval : ici comme
    // partout ailleurs, ils ont le dernier mot.
    var n = parseFloat(vitessePalier());
    if (!isFinite(n)) return 0;
    if (estSurcharge()) n -= surchargeMalus();
    // jamais négatif : on ne recule pas parce qu'on porte trop
    return Math.max(0, n);
  }
  function vitesseAuto() {
    return Math.max(0, vitesseBase() + modSum(state.divers.vitesse));
  }
  function vitesseValBrut() {
    return state.vitesseOverride !== null ? state.vitesseOverride : vitesseAuto();
  }
  // le filtre porte sur le NOMBRE de mètres, jamais sur la chaîne rendue par
  // vitesse() : un mod qui double la vitesse fait une multiplication, pas une
  // opération de texte
  function vitesseVal() {
    var v = vitesseValBrut();
    return aFiltre("vitesse") ? applique("vitesse", v, {}) : v;
  }
  function vitesse() { return fmtP(vitesseVal()) + " m"; }
  // Le malus de poids RETENU par une compétence, et le seul endroit qui en
  // décide. Les infobulles le lisent ici plutôt que de le recalculer : sinon
  // elles finiraient par énumérer un terme que le total n'a pas subi, et la
  // somme affichée ne se vérifierait plus de tête.
  //
  // La règle le retranche « à chaque jet de Body (autre que l'attaque et la
  // parade) », d'où les trois refus. Les compétences d'arme SONT l'attaque et la
  // parade. Celles de Mind et de Prestance ne sont pas des jets de Body. Un total
  // forcé (Options) remplace le calcul entier, malus compris : c'est la règle de
  // ce champ depuis toujours, et l'infobulle « Total forcé à 50 » mentirait sur
  // un total affiché à 40.
  function compPoidsMalus(carac, key) {
    if (key && state.compsForce[key] !== undefined) return 0;
    if (carac !== "Body" || (key && estArme(key))) return 0;
    return poidsMalus();
  }
  // LE POINT DE BRANCHEMENT DU MALUS DE POIDS : le seul endroit qui voie à la
  // fois la caractéristique et la clé, donc le seul capable d'épargner les
  // compétences d'arme. Tout ce qui affiche ou lance une compétence passe par là,
  // l'initiative comprise.
  function compValueBrut(carac, comp, key) {
    // total forcé (Options) : il remplace le calcul, modificateur compris
    if (key && state.compsForce[key] !== undefined) return state.compsForce[key];
    return caracTotal(carac) + stadeInfo(comp ? comp.stade : 0).bonus +
           (key ? (state.compsMod[key] || 0) + (state.compsMod2[key] || 0) : 0) -
           compPoidsMalus(carac, key);
  }
  function compValue(carac, comp, key) {
    var v = compValueBrut(carac, comp, key);
    return aFiltre("compValue")
      ? applique("compValue", v, { carac: carac, cle: key, comp: comp })
      : v;
  }
  // Total SANS le forçage : ce que la compétence vaudrait normalement.
  // « Auto » ne veut pas dire « sans filtre » : ces deux fonctions passent par
  // les publiques (compValue, compXp), donc un filtre s'y voit aussi. C'est
  // voulu : ce sont les valeurs de repli affichées à côté des cases de forçage,
  // et elles doivent parler la même langue que le reste de la fiche. Recopier
  // le corps du brut donnait deux chiffres pour une seule compétence : la
  // colonne Total affichait 45 pendant que l'indication du champ « Total forcé »
  // proposait 40, et le joueur qui recopiait l'indication perdait les 5 points
  // du filtre sans rien voir. Le forçage s'ôte le temps du calcul, comme pour
  // l'xp : c'est la seule chose dont ces valeurs doivent se passer.
  //
  // finally, et pas une simple ligne de plus : le forçage est une donnée du
  // PERSONNAGE, retirée le temps d'un calcul. Ces fonctions tournent dans les
  // hooks de rafraîchissement, où chaque appel est déjà sous try/catch ; un
  // calcul qui jetterait entre le retrait et la remise ne ferait donc pas de
  // bruit, mais le chiffre saisi par le joueur serait effacé pour de bon, et le
  // save() suivant l'emporterait.
  function compValueAuto(carac, comp, key) {
    var f = state.compsForce[key];
    delete state.compsForce[key];
    try { return compValue(carac, comp, key); }
    finally { if (f !== undefined) state.compsForce[key] = f; }
  }
  function compXpAuto(c, key) {
    var f = state.compsXpForce[key];
    delete state.compsXpForce[key];
    try { return compXp(c, key); }
    finally { if (f !== undefined) state.compsXpForce[key] = f; }
  }
  function blankComp() { return { stade: 0, techniques: [] }; }
  function allComps() {
    var out = [];
    var armes = {};
    ((DATA && DATA.compsArmes) || []).forEach(function (n) { armes[n] = 1; });
    CHAMPS.forEach(function (c) {
      (DATA.comps[c] || []).forEach(function (n) {
        out.push({ key: c + "/" + n, name: n, carac: c, custom: false,
                   arme: c === ARME_CARAC && !!armes[n] });
      });
    });
    // armes ajoutées par le joueur : mêmes compétences de Body, personnalisées
    state.armesComps.forEach(function (n) {
      out.push({ key: armeKey(n), name: n, carac: ARME_CARAC, custom: true, arme: true });
    });
    state.customComps.forEach(function (cc) {
      if (cc && cc.name) out.push({ key: cc.carac + "/" + cc.name, name: cc.name, carac: cc.carac, custom: true });
    });
    // les langues sont des compétences de Mind à part entière : elles doivent
    // apparaître dans l'onglet Art et dans les modificateurs (Options) comme
    // les autres. Seule la liste de l'onglet Fiche les écarte, puisqu'elles
    // ont leur propre module.
    state.langues.forEach(function (n) {
      out.push({ key: langueKey(n), name: n, carac: LANGUE_CARAC, custom: true, langue: true });
    });
    return out;
  }

  // La « carte » : le résumé calculé de la fiche, pour la bibliothèque, le popup
  // de l'extension et les attributs miroir Roll20 (barres de jetons, macros).
  function computeCard() {
    return {
      name: state.name || "Sans nom",
      caracs: { Mind: caracTotal("Mind"), Body: caracTotal("Body"), Prestance: caracTotal("Prestance") },
      combat: {
        pv: state.pv === null ? null : pvCourant(), pvMax: pvMax(),
        vitesse: vitesse(), regen: regen(), initiative: initiative(), poids: poidsPorte()
      },
      narration: state.narration
    };
  }

  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2.6 s vu une seule
  // fois, comme le faisait l'ancien flash : la fiche continuerait de s'afficher,
  // parfaitement normale, pendant qu'une session entière de travail se perd à
  // la fermeture. Tant que ça ne repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state (la page
    // Mods invite justement à y écrire, et seul ctx.donnees.set s'en protège)
    // fait jeter stringify : setItem n'était alors jamais atteint, donc sous
    // Roll20 le cache mémoire du pont n'était même pas à jour, donc aucune
    // écriture programmée, donc ni accusé de réception, ni chien de garde, ni
    // bandeau de perte. Rien ne s'enregistrait plus et rien ne le disait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("jjk-perso", json); }
      catch (e) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
    var card = computeCard();
    card.id = "_current";
    cards._current = card;
    try { STORE.setItem("jjk-cards", JSON.stringify(cards)); } catch (e) {}
    enregistrementModules(card, json);
  }
  // Photographie des valeurs propres et calculées de chaque module. Le
  // détecteur compare ces valeurs à la capture précédente, puis ne démarre le
  // contour que si le journal Compact porte déjà un ID local à faire confirmer.
  // Cela fait aussi suivre les modules dépendants (PV, vitesse, compétences…)
  // lorsqu'une caractéristique ou un équipement change leur résultat affiché.
  var enregistrementEtat = null;
  function enregistrementModules(card, json) {
    if (!window.__jjkSavingModules || json === null || enregistrementEtat === json) return;
    enregistrementEtat = json;
    var out = {}, c = card.combat || {};
    function set(id, value) { out[id] = JSON.stringify(value); }
    function add(id, value) { set(id, [out[id], value]); }
    var own = {
      narration: ["narration"],
      caracs: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod", "caracsPlafondForce", "ptsCreaMod", "ptsCreaForce", "xpTotal"],
      langues: ["langues", "langueBase"],
      initiative: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2"],
      tuiles: ["divers", "vitesseOverride", "regenOverride"],
      pv: ["pv", "pvMaxOverride", "divers"],
      em: ["em", "emMax"],
      armescomp: ["armesComps", "comps"],
      comps: ["comps", "customComps", "compsMod", "compsMod2", "compsForce", "compsXpForce", "compsXpMod", "compsXpMod2"],
      arts: ["comps", "customComps"],
      armes: ["armes", "armesComps"],
      armures: ["armures"],
      inv: ["inv", "armes", "armures"],
      perso: ["name", "portrait", "espece", "age", "sexe", "genre", "defaut", "qualites"],
      avantages: ["avantages"],
      bg: ["background"],
      notes: ["notesJournal", "notes"],
      jets: ["de"],
      actions: ["narration", "de"],
      modcaracs: ["caracsMod", "caracsMod2", "caracsForce", "caracsXpMod", "caracsXpMod2", "caracsXpForce", "caracsPlafondMod", "caracsPlafondForce"],
      xpchamps: ["xpTotal", "caracsXp", "comps", "compsXpForce", "compsXpMod", "compsXpMod2"],
      creation: ["ptsCreaMod", "ptsCreaForce", "caracsPlafondMod", "caracsPlafondForce", "caracsForce", "caracsXpForce"],
      filtres: ["filtres"],
      affichage: ["modules"],
      mods: ["mods"],
      modules: ["modData", "modActifs", "modules"],
      optcomps: ["compsMod", "compsMod2", "compsForce", "compsXpForce", "compsXpMod", "compsXpMod2"]
    };
    Object.keys(own).forEach(function (id) {
      set(id, own[id].map(function (key) { return state[key]; }));
    });
    // Sorties calculées qui changent parfois sans que la donnée brute du module
    // change (ex. Body modifie PV max, initiative, vitesse et jets de compétences).
    add("initiative", [c.initiative, card.caracs]);
    add("tuiles", [c.vitesse, c.regen, c.poids]);
    add("pv", [c.pv, c.pvMax]);
    add("em", [state.em, state.emMax]);
    add("inv", c.poids);
    try {
      var skills = allComps().map(function (entry) {
        var comp = state.comps[entry.key] || {};
        return [entry.key, compValue(entry.carac, comp, entry.key), compXp(comp, entry.key), comp.techniques || []];
      });
      add("comps", skills);
      add("arts", skills);
      add("armescomp", skills.filter(function (entry) { return /^Body\//.test(entry[0]) && (state.armesComps || []).some(function (n) { return entry[0] === "Body/" + n; }); }));
    } catch (eSkills) {}
    // Les coffres de mods peuvent correspondre à des modules ajoutés ou
    // remplacés : ils héritent de leur ID DOM, comme dans Outward.
    Object.keys(state.modData || {}).forEach(function (id) { add(id, state.modData[id]); });
    (typeof modules !== "undefined" && Array.isArray(modules) ? modules : []).forEach(function (module) {
      if (module && typeof module.enregistrement === "function") {
        try { add(module.id, module.enregistrement()); } catch (eModule) {}
      }
    });
    window.__jjkSavingModules(out);
  }
  // Le bandeau de perte : même mise en forme que celui des mods, au même
  // endroit, juste avant la feuille. Il n'y en a qu'UN, gardé d'un montage à
  // l'autre : mount() vide la racine, l'élément se retrouve détaché, et le
  // premier enregistrement du nouveau montage le remet en tête. Il s'en va tout
  // seul dès qu'un enregistrement repasse, sans que personne ait à y penser.
  //
  // SA PROPRE CLASSE, en plus de la commune. Le contrat réserve .pc-avis au
  // bandeau de consentement ; les deux peuvent coexister (un mod en attente ET
  // un enregistrement en panne), et sans marque distincte plus personne, code
  // ou sonde, ne sait lequel des deux il tient.
  function montrePanneSave(msg) {
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
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
    try { return normalize(JSON.parse(STORE.getItem("jjk-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("jjk-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("jjk-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "jjk-persos";
  function loadPersos() { try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  // jjk-cards ne porte QUE la fiche ouverte (« _current »), la seule que le
  // popup de l'extension et les attributs miroir lisent : y recalculer une carte
  // par personnage de la bibliothèque ne servait personne.
  function savePersos(a) {
    try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {}
  }

  // ---------- envoi au tchat : destinataire et modificateur ----------
  // Tout ce que la fiche envoie à Roll20 traverse ce bloc. La commande est
  // composée ICI, côté site, et part par window.__jjkChat, que l'extension
  // relaie SANS RIEN RÉÉCRIRE : le format peut donc évoluer sans re-signature.
  // Les deux réglages (à qui, avec ou sans modificateur) vivent dans le VRAI
  // localStorage du navigateur, comme la préférence jour/nuit : ce ne sont pas
  // des données de personnage, et les écrire dans les Attributes Roll20 à
  // chaque clic n'aurait aucun sens.
  var ENVOI = {
    mode: "jjk-r20-envoi",        // "public" | "gm" | "joueur"
    dest: "jjk-r20-envoi-dest",   // nom d'affichage du destinataire
    input: "jjk-r20-envoi-input", // "0" (sans) | "1" (avec)
    carac: "jjk-r20-envoi-carac", // "0" (automatique) | "1" (carac au choix au lancer)
    noms: "jjk-r20-envoi-noms"    // liste de secours, si Roll20 ne la donne pas
  };
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
  function envCaracChoix() { return lpref(ENVOI.carac, "0") === "1"; }
  // Même assainissement que l'extension (content-roll20.js) : sur le canal brut
  // elle n'en fait aucun, une accolade ou un retour à la ligne d'un texte de
  // fiche casserait la carte.
  function envSan(s) {
    return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }
  // Valeur de champ : les accolades d'une macro Roll20 (@{Perso|jjk_body},
  // ?{…}) sont légitimes et doivent survivre. Un champ de gabarit se ferme sur
  // « }} » : c'est la SEULE séquence à briser, et une valeur qui finit par une
  // accolade prend une espace pour ne pas en fabriquer une avec la fermeture.
  function envVal(s) {
    var v = String(s == null ? "" : s).replace(/\s+/g, " ").trim().replace(/\}\}/g, "} }");
    return /\}$/.test(v) ? v + " " : v;
  }
  // Le préfixe de chuchotement ouvre la commande : Roll20 exige que le message
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
  // Requête Roll20 : résolue côté client à l'envoi, donc seulement parce que
  // l'extension écrit dans la zone de saisie du tchat. Les parenthèses laissent
  // saisir un modificateur négatif sans ambiguïté (« + (-5) »).
  var ENV_QUERY = " + (?{Modificateur|0})";
  // Option de jet Roll20 : le résultat s'inscrit dans le compteur de tours, à
  // la ligne du token sélectionné (créée si elle manque). Réservée à
  // l'initiative, seul jet dont dépend une place au tour.
  // Elle se pose DANS le jet en ligne, entre les doubles crochets, et non à la
  // fin du message : hors d'un « /roll », c'est-à-dire dès qu'on passe par un
  // gabarit, Roll20 ne la lit qu'attachée au jet lui-même
  // (wiki Macros/Initiative : {{Initiative=[[1d20+…&{tracker}]]}}). Posée après
  // « }} », elle s'afficherait en toutes lettres au tchat sans rien compter.
  var ENV_TRACKER = " &{tracker}";
  function cmdJet(label, value, die, avecInput, caracQ, tracker) {
    // « + 0 » est du bruit sur les jets d'équipement (dégâts, invu), qui
    // n'ont jamais de bonus : l'expression part seule.
    var v = value ? (value > 0 ? " + " + value : " - " + (-value)) : "";
    // Le libellé passe par envSan comme les titres de cartes, et le dé voit
    // ses blancs repliés : un saut de ligne (nom de compétence venu d'un
    // import, dé recopié depuis une macro) ferait une SECONDE ligne au tchat.
    // L'extension refuse une commande multiligne, et le clic partirait alors
    // sans rien envoyer. Les accolades du dé restent : « ?{Dé|1d100} » et
    // « @{…} » sont des dés légitimes dans Roll20.
    var de = String(die == null ? "" : die).replace(/\s+/g, " ").trim() || DE_DEFAUT;
    return "&{template:default} {{name=" + (envSan(label) || "Jet") +
           "}} {{Jet=[[" + de +
           (caracQ ? " + (" + caracQ + ")" : "") + v +
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
  // envoi effectif : préfixe + commande. Renvoie false hors Roll20.
  function envoyer(cmd) {
    if (typeof window === "undefined" || typeof window.__jjkChat !== "function") return false;
    window.__jjkChat(envPrefixe() + cmd);
    return true;
  }

  // ---------- jets ----------
  // Les dés se jettent dans Roll20 : jjk-roll20-boot.js (amorce Roll20 servie
  // par le site) pose window.__jjkRoll et le
  // jet part au TCHAT. Sur le site (pas de Roll20), un clic lance quand même le
  // dé et montre le résultat dans un toast discret — aucun panneau de jets.
  function parseDice(expr) {
    var m = /^(\d{1,2})d(\d{1,4})([+-]\d{1,4})?$/i.exec(String(expr || "").replace(/\s/g, ""));
    if (!m) return null;   // expression illisible : doRoll prévient au lieu de lancer autre chose
    return { n: clamp(+m[1], 1, 20), faces: clamp(+m[2], 2, 1000), plus: +(m[3] || 0) };
  }
  // isCheck : vrai pour un jet de test (carac/compétence) — seuls ces jets
  // critent (96+/5-). Les jets d'équipement (dégâts, invu) restent des dés bruts.
  // caracDe : caractéristique propre d'un jet de COMPÉTENCE. Avec le réglage
  // « Au choix » de la barre d'envoi, la macro Roll20 demande alors quelle
  // caractéristique porte le jet (la sienne proposée en premier) : le total
  // envoyé se décompose en (carac choisie) + (stade et modificateur).
  function caracQuery(propre) {
    var ordre = [propre].concat(CHAMPS.filter(function (c) { return c !== propre; }));
    return "?{Caractéristique|" + ordre.map(function (c) { return c + "," + caracTotal(c); }).join("|") + "}";
  }
  // tracker : le jet s'inscrit dans le compteur de tours de Roll20 (initiative).
  function doRoll(label, value, die, isCheck, caracDe, tracker) {
    die = die || state.de || DE_DEFAUT;
    // « avec input » ne vaut QUE pour les jets de test : isCheck est vrai
    // exactement aux caractéristiques et aux compétences, faux aux dégâts et
    // à l'invulnérabilité — aucun autre filtre à écrire.
    // Le choix de carac ne vit que sur le canal brut (macro) : les replis
    // (vieille extension, hors Roll20) partent avec la carac automatique.
    var q = (isCheck && caracDe && envCaracChoix()) ? caracQuery(caracDe) : null;
    if (envoyer(cmdJet(label, q ? value - caracTotal(caracDe) : value, die,
                       isCheck && envInput(), q, tracker))) return;
    // extension antérieure au canal brut : jet public, sans modificateur — et
    // sans compteur de tours, ce canal-là n'envoyant pas de commande Roll20
    if (typeof window !== "undefined" && typeof window.__jjkRoll === "function") {
      window.__jjkRoll(die, value, label);
      return;
    }
    var d = parseDice(die);
    // Hors Roll20 la fiche lance le dé elle-même : elle sait faire « NdM ±k »,
    // pas résoudre une macro Roll20 (@{…}, ?{…}), qui n'a de sens que là-bas.
    if (!d) {
      flash(/[@?]\{/.test(String(die))
        ? "« " + die + " » est une macro Roll20 : elle ne se lance que dans Roll20."
        : "Dé illisible : « " + die + " » (attendu : NdM, ex. 1d100).");
      return;
    }
    var dice = [];
    for (var i = 0; i < d.n; i++) dice.push(1 + Math.floor(Math.random() * d.faces));
    var sum = dice.reduce(function (a, b) { return a + b; }, 0) + d.plus;
    var total = sum + value;
    var det = "dé " + dice.join(" + ") + (value ? " " + (value >= 0 ? "+ " : "− ") + Math.abs(value) : "");
    // 96+ au dé : coup critique (le résultat au d100 devient 100) ; 5 ou moins :
    // échec critique (il devient 0). Les modificateurs (d.plus, valeur) restent.
    if (isCheck && d.n === 1 && d.faces === 100) {
      if (dice[0] >= 96) {
        total = 100 + d.plus + value;
        det = "coup critique — le dé devient 100";
      } else if (dice[0] <= 5) {
        total = 0 + d.plus + value;
        det = "échec critique — le dé devient 0";
      }
    }
    flash(label + " : " + total + " (" + det + ")");
  }

  // ---------- envoi d'un élément au tchat ----------
  // Dans Roll20, l'élément part au TCHAT en carte (jjk-roll20-boot.js pose __jjkSay) ;
  // sur le site, il s'affiche en toast. fields : [[libellé, valeur], …],
  // les valeurs vides sont ignorées.
  // Une étiquette VIDE ("") est volontaire : la carte Roll20 rend alors
  // « {{=texte}} », une ligne pleine largeur sans colonne de libellé. Réservée
  // aux TEXTES LONGS (effet d'un passif, description d'un art, avantage…),
  // dont le libellé n'apprend rien que le titre ne dise déjà ; les champs
  // courts et tabulaires (poids, dégâts, quantité…) gardent le leur.
  // Une seule étiquette vide par carte : le template les indexe par clé.
  function sayChat(title, fields) {
    var clean = (fields || []).filter(function (f) { return f && String(f[1] || "").trim(); });
    if (envoyer(cmdCarte(title, clean))) return;
    // extension antérieure au canal brut : carte publique
    if (typeof window !== "undefined" && typeof window.__jjkSay === "function") {
      window.__jjkSay(title, clean);
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
  // à chaque mount() (navigation instantanée comprise) pour ne pas s'accumuler.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction, puis le rend. Les briques (textInput,
  // stepper, bigTile, gearBtn…) continuent donc d'écrire dans « hooks » sans
  // rien savoir des modules, et chaque fonction atterrit chez son propriétaire.
  // C'est ce qui permet de museler un module sans toucher aux autres.
  var regHors = [];             // hors module : ce qui encadre les onglets
  var regsModules = {};         // id -> tableau de fonctions (ordre de montage)
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  var optHooks = [];            // bloc Options « Modificateurs de compétences », rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps » ; rappelé quand les comps perso changent
  // filtres du bloc, survivants au remount comme ceux de la Fiche
  var optFilter = "";
  var optChamp = "";
  var optOnly = COMPACT;        // Roll20 : investies seulement par défaut, comme la Fiche
  var optPerso = true;          // décoché : seules les compétences de base du jeu

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule
  // réussite remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};        // id -> { echecs, musele, erreur, panne }
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Un registre tourne SOUS SON PROPRE try/catch, fonction par fonction : un
  // hook qui jette n'interrompt plus le rafraîchissement des autres, et ne
  // fige donc plus la fiche entière.
  //
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et
  // le compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce
  // qu'un même id peut avoir DEUX registres (« comps » et « optcomps » ont
  // aussi celui de leurs lignes rebâties) : en jugeant registre par registre,
  // la réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là n'aurait jamais pu tomber.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;   // registre vu, sans échec
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  // Une même cadence de relecture ne doit pas faire clignoter toute la fiche.
  // Outward compare les empreintes de l'état et ne relance que les registres
  // qui dépendent réellement des clés modifiées. Les modules JJK gardent leur
  // propre carte de dépendances (les attributs Roll20 sont traduits en ces clés
  // par JjkAttrMap avant d'arriver ici).
  var refreshEmpreintes = null;
  var VUE_DEPENDANCES = {
    narration: ["narration"],
    caracs: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod", "caracsPlafondForce", "sansLimite"],
    langues: ["langues", "langueBase", "comps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod", "armesComps"],
    initiative: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "comps", "compsMod", "compsMod2", "compsForce", "armesComps", "inv", "inventaire"],
    tuiles: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "divers", "vitesseOverride", "regenOverride", "inv", "inventaire"],
    pv: ["pv", "pvMaxOverride", "divers"],
    armescomp: ["armesComps", "comps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod"],
    comps: ["comps", "customComps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod", "langues", "armesComps"],
    arts: ["mods", "modData", "modActifs"],
    armes: ["armes", "comps", "armesComps", "inv", "inventaire"],
    armures: ["armures", "inv", "inventaire"],
    inv: ["inv", "inventaire", "armes", "armures", "divers"],
    perso: ["name", "espece", "age", "sexe", "genre", "defaut", "qualites"],
    avantages: ["avantages"],
    bg: ["background"],
    notes: ["notes", "notesJournal", "name"],
    jets: ["de"],
    actions: ["name"],
    modcaracs: ["caracsBase", "caracsXp", "caracsMod", "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "caracsPlafondMod", "caracsPlafondForce", "sansLimite"],
    xpchamps: ["xpTotal", "caracsXp", "caracsXpForce", "caracsXpMod", "caracsXpMod2", "comps", "compsForce", "compsXpForce", "compsXpMod"],
    creation: ["ptsCreaMod", "ptsCreaForce", "caracsBase", "caracsXp", "caracsPlafondMod", "caracsPlafondForce", "sansLimite", "comps", "compsForce", "xpTotal"],
    mods: ["mods", "modData", "modActifs"],
    modules: ["modules", "modActifs"],
    optcomps: ["comps", "customComps", "compsMod", "compsMod2", "compsXpMod2", "compsForce", "compsXpForce", "compsXpMod", "armesComps", "langues"]
  };
  var DEPENDANCES_CONNues = { v: 1, rel: 1, portrait: 1 };
  Object.keys(VUE_DEPENDANCES).forEach(function (id) {
    VUE_DEPENDANCES[id].forEach(function (k) { DEPENDANCES_CONNues[k] = 1; });
  });
  function empreinteRefresh(v) {
    try {
      if (window.JjkSync && window.JjkSync.Compact && typeof window.JjkSync.Compact.stable === "function")
        return window.JjkSync.Compact.stable(v);
    } catch (e) {}
    return JSON.stringify(v);
  }
  function refresh(force) {
    save();
    var stamps = {}, changes = [], invalidStamp = false;
    try {
      Object.keys(state || {}).forEach(function (k) { stamps[k] = empreinteRefresh(state[k]); });
    } catch (e) { invalidStamp = true; }
    Object.keys(stamps).forEach(function (k) {
      if (!refreshEmpreintes || stamps[k] !== refreshEmpreintes[k]) changes.push(k);
    });
    Object.keys(refreshEmpreintes || {}).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(stamps, k) && changes.indexOf(k) < 0) changes.push(k);
    });
    var cleInconnue = changes.some(function (k) { return !DEPENDANCES_CONNues[k]; });
    var premierePasse = !refreshEmpreintes;
    // JJK reçoit une photographie Roll20 toutes les 1,2 s. Une lecture
    // identique ne doit PAS reconstruire les modules : contrairement aux
    // rafraîchissements ponctuels d'Outward, ce chemin est périodique. Les
    // hooks hors module restent exécutés pour garder l'en-tête et la barre
    // cohérents ; les modules ne tournent que si une de leurs données change,
    // si l'appelant force la passe ou si un mod exige le rafraîchissement total.
    var tout = invalidStamp || force === true || premierePasse || modulesPersoActifs() || cleInconnue;
    refreshEmpreintes = invalidStamp ? null : stamps;
    function doit(id) {
      if (tout) return true;
      if (VUE_DEPENDANCES[id]) return changes.some(function (k) { return VUE_DEPENDANCES[id].indexOf(k) >= 0; });
      // Les clés d'identité ne concernent que les registres hors module et
      // « Personnalité » / « Notes », déjà traités explicitement ci-dessus.
      if (changes.every(function (k) { return ["name", "portrait", "espece", "age", "sexe", "genre"].indexOf(k) >= 0; })) return false;
      // Une nouvelle clé ou une dépendance inconnue doit rester visible :
      // mieux vaut rafraîchir un module de trop que laisser un champ périmé.
      return true;
    }
    var bilan = {};
    joue("", regHors, bilan);
    Object.keys(regsModules).forEach(function (id) { if (doit(id)) joue(id, regsModules[id], bilan); });
    if (doit("comps")) joue("comps", compHooks, bilan);
    if (doit("optcomps")) joue("optcomps", optHooks, bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
    // Les contrôles de construction sont recréés par certains modules : le
    // verrou global doit être reposé après chaque passe, comme dans Outward.
    if (typeof window.__jjkApplyMode === "function") window.__jjkApplyMode();
  }

  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière depuis le nouvel état.
  // Nettoyage des ressources attachées au DOM des modules (observateurs,
  // timers et écouteurs document/window). Outward utilise le même registre :
  // un module reconstruit doit d'abord libérer ce qu'il avait installé.
  var remontageNettoyage = [];
  var rootEl = null;
  var appEl = null;      // le .perso-atelier monté : porte les jetons de couleur
  // C'est aussi ce que rend ctx.reconstruire et Jjk.remonte. Appelé PENDANT un
  // montage (un mod, un hook), il ne relance rien sur-le-champ : mount() note
  // la demande et l'honore une fois le montage courant fini.
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
    var i = el("input", "pc-edit-field");
    i.type = "text";
    if (placeholder) i.placeholder = placeholder;
    i.value = get() || "";
    i.addEventListener("input", function () { set(i.value); refresh(); });
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
  // stepper −/champ/+ : le champ du milieu est éditable (pc-num).
  // reg : registre de rafraîchissement (hooks par défaut ; optHooks pour le
  // bloc rebâtissable des modificateurs de compétences).
  function stepper(get, set, step, title, reg) {
    var w = el("span", "pc-step");
    w.appendChild(stepBtn("−", title ? "− " + step : null, function () { set(get() - step); refresh(); }));
    var i = el("input", "pc-num pc-edit-field");
    i.type = "number";
    i.value = get();
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { set(v); refresh(); }
    });
    (reg || hooks).push(function () { if (document.activeElement !== i) i.value = get(); });
    w.appendChild(i);
    w.appendChild(stepBtn("+", title ? "+ " + step : null, function () { set(get() + step); refresh(); }));
    return w;
  }
  // trois petits champs ± (équipement / art / décision du MJ), sommés dans la
  // valeur effective ; discrets, révélés au survol de l'hôte (.pc-mods-host).
  var MMOD_SLOTS = ["équipement", "art", "autre"];
  function multiMod(map, key) {
    var wrap = el("span", "pc-mmods");
    function arr() {
      if (!map[key]) map[key] = [0, 0, 0];
      return map[key];
    }
    for (var i = 0; i < MMOD_SLOTS.length; i++) (function (i) {
      var inp = el("input", "pc-mmod pc-edit-field");
      inp.type = "number"; inp.step = "any"; inp.placeholder = "0";
      inp.title = "Bonus ou malus divers (" + MMOD_SLOTS[i] + ") — emplacement " +
                  (i + 1) + " sur " + MMOD_SLOTS.length + " ; les modificateurs s'additionnent.";
      var v0 = map[key] ? map[key][i] : 0;
      inp.value = v0 ? v0 : "";
      inp.classList.toggle("neg", v0 < 0);
      inp.addEventListener("input", function () {
        var n = parseFloat(String(inp.value).replace(",", "."));
        arr()[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
        inp.classList.toggle("neg", arr()[i] < 0);
        refresh();
      });
      hooks.push(function () {
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
  // CONSTRUCTION du personnage (stades, ajouts, suppressions, textes, divers…).
  // Hors édition, seuls les gestes de JEU restent actifs : jets, tchat, PV
  // courant, narration, quantités d'objets, notes de session. Les éléments
  // .pc-edit-only n'existent qu'en édition ; les champs .pc-edit-field
  // deviennent inertes (disabled + air d'un simple texte). Réglage d'interface
  // pur : ni dans l'état du personnage, ni persisté — chaque chargement
  // repart verrouillé.
  var editMods = {};
  // Le verrou général vient de l'extension dans Roll20. Hors Roll20, le
  // créateur de personnage garde son comportement historique : édition libre.
  function ficheModifiable() { return !window.__jjkCanEdit || window.__jjkCanEdit(); }
  function isEdit(id) { return ficheModifiable() && !!editMods[id]; }
  function applyEdit(scope, id) {
    var actif = isEdit(id);
    scope.classList.toggle("editing", actif);
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-edit-field"), function (f) {
      f.disabled = !actif;
    });
    Array.prototype.forEach.call(scope.querySelectorAll(".pc-gear"), function (g) {
      g.setAttribute("aria-disabled", ficheModifiable() ? "false" : "true");
    });
  }
  function gearBtn(scope, id, onToggle) {
    var g = el("button", "pc-gear", "⚙");
    g.type = "button";
    g.title = "Modifier ce module";
    g.addEventListener("click", function () {
      if (!ficheModifiable()) return;
      editMods[id] = !editMods[id];
      g.title = isEdit(id) ? "Terminer les modifications" : "Modifier ce module";
      applyEdit(scope, id);
      if (onToggle) onToggle();
    });
    // resynchronise aussi les éléments recréés par les rebuilds internes
    hooks.push(function () { applyEdit(scope, id); });
    return g;
  }
  function appliqueChampsHorsModule(root) {
    var base = root && root.querySelectorAll ? root : document;
    Array.prototype.forEach.call(base.querySelectorAll(".pc-global-edit-field"), function (f) {
      f.disabled = !ficheModifiable();
      f.setAttribute("aria-disabled", f.disabled ? "true" : "false");
    });
    Array.prototype.forEach.call(base.querySelectorAll(".pc-edit-field[data-jjk-requires-edit]"), function (f) {
      var id = f.getAttribute("data-jjk-requires-edit") || "";
      f.disabled = !isEdit(id);
      f.setAttribute("aria-disabled", f.disabled ? "true" : "false");
    });
  }
  function canUseControl(target) {
    if (!target || !target.matches) return false;
    // Liste d'actions de jeu/lecture, calquée sur OWD : les champs de saisie,
    // les jauges modifiables et les quantités ne sont pas des commandes de jeu.
    return target.matches(
      ".pc-tab, .pc-rollable, .pc-obj-tile, " +
      ".pc-obj-context-action:not([data-jjk-requires-edit]), " +
      ".pc-comp-roll, .pc-notes-latest, .pc-notes-older, .pc-notes-newer, " +
      ".pc-note-toggle, .pc-journal-toggle, summary, a[href]"
    ) || !!target.closest(".pc-notes-search, .pc-journal-pages") ||
      !!target.closest(".pc-envoi") || target.type === "search";
  }
  function appliqueVerrouGlobal(scope) {
    var surface = scope && scope.querySelectorAll ? scope : document;
    var selector = surface === document
      ? "#perso-atelier input, #perso-atelier textarea, #perso-atelier select, #perso-atelier button, #perso-atelier [draggable='true']"
      : "input, textarea, select, button, [draggable='true']";
    var nodes = Array.prototype.slice.call(surface.querySelectorAll(selector));
    // MutationObserver peut recevoir directement un champ ou un bouton ajouté
    // seul : querySelectorAll ne comprend pas l'élément racine lui-même.
    if (surface !== document && surface.matches && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(surface.tagName))
      nodes.unshift(surface);
    nodes.forEach(function (node) {
      if (!ficheModifiable()) {
        if (node.draggable) { node.dataset.jjkModeWasDraggable = "1"; node.draggable = false; }
        if (!canUseControl(node)) {
          node.setAttribute("data-jjk-readonly", "1");
          if (node.tagName === "TEXTAREA" || node.tagName === "INPUT" &&
              !/^(checkbox|radio|range|file|button|submit|reset)$/i.test(node.type)) {
            if (node.dataset.jjkModeWasReadonly === undefined) node.dataset.jjkModeWasReadonly = node.readOnly ? "1" : "0";
            node.readOnly = true;
          } else {
            if (node.dataset.jjkModeWasDisabled === undefined) node.dataset.jjkModeWasDisabled = node.disabled ? "1" : "0";
            node.disabled = true;
          }
        }
      } else if (node.hasAttribute("data-jjk-readonly")) {
        if (node.dataset.jjkModeWasReadonly !== undefined) {
          node.readOnly = node.dataset.jjkModeWasReadonly === "1";
          delete node.dataset.jjkModeWasReadonly;
        }
        if (node.dataset.jjkModeWasDisabled !== undefined) {
          node.disabled = node.dataset.jjkModeWasDisabled === "1";
          delete node.dataset.jjkModeWasDisabled;
        }
        if (node.dataset.jjkModeWasDraggable === "1") node.draggable = true;
        delete node.dataset.jjkModeWasDraggable;
        node.removeAttribute("data-jjk-readonly");
      }
    });
  }
  window.__jjkApplyMode = function (scope) {
    var surface = scope && scope.querySelectorAll ? scope : document;
    // D'abord retirer le verrou global précédent. Ensuite seulement, réappliquer
    // les permissions plus fines des modules : un champ pc-edit-field ne doit
    // jamais redevenir actif simplement parce que le mode global repasse en édition.
    appliqueVerrouGlobal(surface);
    if (surface.classList && surface.classList.contains("pc-editable")) applyEdit(surface, surface.dataset.module || "");
    Array.prototype.forEach.call(surface.querySelectorAll(".pc-editable"), function (b) { applyEdit(b, b.dataset.module || ""); });
    // L'identité et les commandes hors module partagent le verrou global.
    appliqueChampsHorsModule(surface);
  };
  // Toutes les interactions de CONSTRUCTION repassent par le même garde.
  // Les actions de jeu restent libres : clic sur une tuile, Montrer, Donner,
  // lancer un jet ou consulter une note ne sont pas des modifications de fiche.
  function scopeEdition(target) {
    return target && target.closest ? target.closest(".pc-editable") : null;
  }
  function autoriseConstruction(target) {
    if (!ficheModifiable()) return false;
    var explicite = target && target.getAttribute ? target.getAttribute("data-jjk-requires-edit") : null;
    if (explicite && explicite !== "1") return isEdit(explicite);
    var scope = scopeEdition(target);
    // Les champs d'identité hors module sont modifiables dès que le mode global
    // est en Édition. Les champs de mods portent un propriétaire explicite et
    // ont été traités plus haut par isEdit(id).
    if (!scope) return ficheModifiable();
    return isEdit(scope.dataset.module || "");
  }
  function annuleEdition(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }
  document.addEventListener("click", function (ev) {
    var target = ev.target && ev.target.closest ? ev.target.closest(".pc-edit-only, .pc-gear, [data-jjk-requires-edit]") : null;
    if (!target) return;
    if (target.classList.contains("pc-gear")) {
      if (!ficheModifiable()) annuleEdition(ev);
      return;
    }
    if (!autoriseConstruction(target)) annuleEdition(ev);
  }, true);
  // Le clic droit sur une tuile d'inventaire reste disponible (Détails,
  // Montrer, Donner). Seuls les éléments explicitement marqués comme outils de
  // construction peuvent être ouverts ou activés en mode Consultation.
  document.addEventListener("contextmenu", function (ev) {
    var target = ev.target && ev.target.closest ? ev.target.closest(".pc-gear, .pc-edit-only, [data-jjk-requires-edit]") : null;
    if (target && (target.classList.contains("pc-gear") ? !ficheModifiable() : !autoriseConstruction(target))) annuleEdition(ev);
  }, true);
  ["dragstart", "dragover", "drop"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      var scope = scopeEdition(ev.target);
      if (scope && !isEdit(scope.dataset.module || "")) annuleEdition(ev);
    }, true);
  });
  ["beforeinput", "paste", "cut"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest(".pc-edit-field, [contenteditable='true'], .pc-edit-only") : null;
      if (!target) return;
      if (target.matches(".pc-edit-field") && target.disabled) return annuleEdition(ev);
      if (!autoriseConstruction(target)) annuleEdition(ev);
    }, true);
  });
  document.addEventListener("submit", function (ev) {
    var scope = scopeEdition(ev.target);
    if (scope && !isEdit(scope.dataset.module || "")) annuleEdition(ev);
  }, true);

  // Verrou global de Consultation, calqué sur Outward : les commandes de
  // construction sont bloquées même si un contrôle a été ajouté sans classe
  // pc-edit-field. Les actions de jeu et de lecture restent disponibles.
  function dansFiche(target) {
    var root = document.getElementById("perso-atelier");
    return !!(root && target && root.contains(target));
  }
  function guardConsultation(ev) {
    if (!ready || ficheModifiable() || !dansFiche(ev.target)) return;
    var target = ev.target && ev.target.closest ? ev.target.closest(
      "button, input, textarea, select, a, summary, [contenteditable='true'], " +
      "[draggable='true'], .pc-tab, .pc-rollable, .pc-obj-tile"
    ) : null;
    var drag = /^(dragstart|dragenter|dragover|drop)$/.test(ev.type);
    if (!drag && canUseControl(target)) return;
    // Le clic droit sur une tuile ouvre son menu d'actions de jeu (Détails,
    // Montrer, Donner). Il reste donc permis, contrairement au glisser-déposer.
    if (ev.type === "contextmenu" && target && target.matches(".pc-obj-tile")) return;
    if (ev.type === "keydown" && ((ev.ctrlKey || ev.metaKey) && /^[ac]$/i.test(ev.key) ||
        /^(Tab|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown|Home|End)$/.test(ev.key))) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
  ["click", "dblclick", "beforeinput", "input", "change", "keydown", "paste", "cut",
   "submit", "contextmenu", "dragstart", "dragenter", "dragover", "drop"].forEach(function (type) {
    document.addEventListener(type, guardConsultation, true);
  });
  document.addEventListener("focusin", function (ev) {
    if (!ready || ficheModifiable() || !dansFiche(ev.target)) return;
    var target = ev.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !canUseControl(target)) target.blur();
  }, true);

  // Les champs peuvent être recréés après un changement d'onglet, un remontage
  // ou l'ajout dynamique d'un module. Les nouvelles commandes héritent aussitôt
  // du verrou courant, sans attendre une prochaine sauvegarde ou un clic.
  if (window.MutationObserver && document.documentElement) {
    var verrouObserver = new MutationObserver(function (changes) {
      if (ficheModifiable()) return;
      var root = document.getElementById("perso-atelier");
      if (!root) return;
      changes.forEach(function (change) {
        Array.prototype.forEach.call(change.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1 || typeof window.__jjkApplyMode !== "function") return;
          // La barre Consultation / Edition est volontairement une sœur de la
          // racine : elle doit rester interactive pour pouvoir sortir du mode
          // Consultation. Ne verrouiller que les ajouts qui appartiennent à la
          // fiche, ou un conteneur qui vient de recevoir la fiche elle-même.
          if (node !== root && !root.contains(node)) {
            if (node.contains && node.contains(root)) window.__jjkApplyMode(root);
            return;
          }
          var owner = node.closest ? node.closest(".pc-editable") : null;
          window.__jjkApplyMode(owner || node);
        });
      });
    });
    verrouObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function block(title, small, editId, onToggle) {
    var b = el("div", "pc-block");
    var t = el("div", "pc-block-title", title);
    if (small) t.appendChild(el("small", null, small));
    if (editId) {
      b.classList.add("pc-editable");
      b.dataset.module = editId;
      t.appendChild(gearBtn(b, editId, onToggle));
    }
    b.appendChild(t);
    return b;
  }
  // reg : registre de rafraîchissement, comme textInput
  function bigTile(label, getV, onClick, reg) {
    var d = el("div", "pc-big" + (onClick ? " pc-rollable" : ""));
    d.appendChild(el("span", "k", label));
    var v = el("span", "v", "");
    d.appendChild(v);
    (reg || hooks).push(function () { v.textContent = String(getV()); });
    if (onClick) d.addEventListener("click", onClick);
    return d;
  }

  // ---------- barre d'outils + bibliothèque ----------
  function buildTop(container) {
    if (COMPACT) return;   // dans Roll20, la fiche EST le personnage
    var top = el("div", "pc-top");
    top.appendChild(el("span", "pc-top-title", "Fiche JJK"));
    top.appendChild(el("span", "pc-top-hint", "Créateur de personnage — règles de base JJK"));

    var lib = el("div", "pc-lib");
    var sel = el("select");
    function fillSel() {
      sel.innerHTML = "";
      var o0 = el("option", null, "— Bibliothèque —");
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

    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Charger");
      b.type = "button";
      b.addEventListener("click", function () {
        var p = loadPersos().filter(function (q) { return q.id === sel.value; })[0];
        if (!p) { flash("Choisir un personnage dans la liste."); return; }
        try { state = normalize(JSON.parse(JSON.stringify(p.state))); }
        catch (e) { flash("Fiche illisible."); return; }
        remount();
        flash("« " + (p.name || "Sans nom") + " » chargé.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Enregistrer");
      b.type = "button";
      b.title = "Enregistrer le personnage courant dans la bibliothèque";
      b.addEventListener("click", function () {
        var persos = loadPersos();
        var name = state.name || "Sans nom";
        var existing = null;
        persos.forEach(function (p) { if (p.name === name) existing = p; });
        var copy = JSON.parse(JSON.stringify(state));
        if (existing) { existing.state = copy; }
        else persos.push({ id: "p" + Date.now().toString(36), name: name, state: copy });
        savePersos(persos);
        fillSel();
        flash("« " + name + " » enregistré.");
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Supprimer");
      b.type = "button";
      b.className = "pc-btn danger";
      b.title = "Supprimer le personnage choisi de la bibliothèque";
      b.addEventListener("click", function () {
        if (!sel.value) { flash("Choisir un personnage dans la liste."); return; }
        savePersos(loadPersos().filter(function (q) { return q.id !== sel.value; }));
        fillSel();
      });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Nouveau");
      b.type = "button";
      b.addEventListener("click", function () { state = blank(); remount(); });
      return b;
    })());
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-jjk") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    lib.appendChild((function () {
      var b = el("button", "pc-btn", "Importer");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    lib.appendChild(file);
    top.appendChild(lib);
    container.appendChild(top);
  }

  // ---------- en-tête : portrait + identité + compteurs + garde-fous ----------
  // En-tête réduit aux seules infos importantes (2026-08-02) : plus de
  // portrait ni de cartouche « JJK Système JDR » ; PV, Vitesse et Narration
  // (doublons en lecture seule de l'onglet Fiche) n'y figurent plus.
  //   Nom | Espèce | Âge | Sexe | Genre
  //   Création ———— | XP dépensé ———— | XP total
  // ---------- barre d'envoi (Roll20 seulement) ----------
  // À qui part la macro, et faut-il demander un modificateur. Geste de JEU :
  // aucun rouage, aucun mode édition. Posée en FRÈRE de .pc-head, jamais dans
  // .pc-id (dont les 12 colonnes sont pleines, et dont la hauteur commande la
  // taille du portrait).
  function buildEnvoi(sheet) {
    if (!COMPACT) return;   // hors Roll20 il n'y a pas de tchat : rien à régler
    var bar = el("div", "pc-envoi");
    bar.appendChild(el("span", "lbl", "Envoi"));

    var destSel = el("select", "pc-select");
    destSel.title = "Destinataire du chuchotement";
    var editNoms = null;

    function majDest() {
      var joueur = envMode() === "joueur";
      destSel.style.display = joueur ? "" : "none";
      if (editNoms) editNoms.style.display = joueur && !listeRoll20 ? "" : "none";
    }

    // segments : Publique | Au MJ | À un joueur
    var segs = el("div", "pc-envoi-segs");
    var boutons = [];
    [["public", "Publique", "Tout le monde voit la carte"],
     ["gm", "Au MJ", "Chuchoté au MJ (/w gm)"],
     ["joueur", "À un joueur", "Chuchoté au joueur choisi à droite"]].forEach(function (o) {
      var b = el("button", "seg" + (envMode() === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.mode, o[0]);
        boutons.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        majDest();
        if (o[0] === "joueur") demanderJoueurs();
      });
      boutons.push(b);
      segs.appendChild(b);
    });
    bar.appendChild(segs);

    // liste des destinataires : celle de Roll20 si l'extension sait la donner,
    // sinon celle que l'utilisateur saisit (et qui reste dans son navigateur)
    var listeRoll20 = null;
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
      // Ce qui est AFFICHÉ est ce qui sera utilisé. Sans cette ligne, un
      // sélecteur qui ne porte qu'un nom n'émet jamais « change » (le
      // navigateur le choisit tout seul) : le destinataire restait vide et la
      // macro repartait en public alors que son nom s'affichait.
      lset(ENVOI.dest, destSel.value);
    }
    destSel.addEventListener("change", function () { lset(ENVOI.dest, destSel.value); });
    // Roll20 ne livre sa liste que par l'extension (la fiche est une iframe
    // d'une autre origine) : si elle ne répond pas, la saisie manuelle prend
    // le relais et rien n'est perdu.
    function demanderJoueurs() {
      if (typeof window.__jjkPlayers !== "function") { remplirDest(nomsManuels()); return; }
      window.__jjkPlayers(function (noms) {
        if (noms && noms.length) {
          listeRoll20 = noms;
          remplirDest(noms);
        } else remplirDest(nomsManuels());
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

    // sans input / avec input : la requête ?{…} n'a de sens que sur un jet de
    // test, elle est donc posée par doRoll et ignorée partout ailleurs
    var sep = el("span", "lbl", "Modificateur");
    sep.title = "Ne s'applique qu'aux jets de caractéristique et de compétence";
    bar.appendChild(sep);
    var segs2 = el("div", "pc-envoi-segs");
    var bin = [];
    [["0", "Sans input", "Le jet part tel quel"],
     ["1", "Avec input", "Roll20 demande un modificateur avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envInput() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.input, o[0]);
        bin.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      bin.push(b);
      segs2.appendChild(b);
    });
    bar.appendChild(segs2);

    // automatique / au choix : sur un jet de COMPÉTENCE, « au choix » fait
    // demander par Roll20 quelle caractéristique porte le jet (Body / Mind /
    // Prestance, la sienne en tête) — ex. une Esquive lancée sur la Prestance.
    var sep3 = el("span", "lbl", "Caractéristique");
    sep3.title = "Ne s'applique qu'aux jets de compétence";
    bar.appendChild(sep3);
    var segs3 = el("div", "pc-envoi-segs");
    var cbtn = [];
    [["0", "Automatique", "La compétence part avec sa caractéristique"],
     ["1", "Au choix", "Roll20 demande quelle caractéristique utiliser avant de lancer"]].forEach(function (o) {
      var b = el("button", "seg" + ((envCaracChoix() ? "1" : "0") === o[0] ? " on" : ""), o[1]);
      b.type = "button";
      b.title = o[2];
      b.addEventListener("click", function () {
        lset(ENVOI.carac, o[0]);
        cbtn.forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
      cbtn.push(b);
      segs3.appendChild(b);
    });
    bar.appendChild(segs3);

    sheet.appendChild(bar);
    remplirDest(nomsManuels());
    majDest();
    demanderJoueurs();
  }

  function buildHead(sheet) {
    var head = el("div", "pc-head");
    var idBox = el("div", "pc-id");   // créé tôt : le portrait s'aligne sur sa hauteur

    // portrait compact 1:1, coins arrondis. L'URL s'édite EN PLACE au clic
    // (jamais prompt() : muet dans l'iframe Roll20 sous Chrome).
    var pbox = el("div", "pc-portrait-box");
    pbox.title = "Portrait — clic : changer l'image (URL)";
    var pclip = el("div", "clip");
    var pimg = el("img");
    pimg.alt = "";
    pclip.appendChild(pimg);
    var pph = el("span", "ph", "?");
    pclip.appendChild(pph);
    pbox.appendChild(pclip);
    hooks.push(function () {
      var want = state.portrait || "";
      if (pimg.getAttribute("src") !== want) {
        if (want) pimg.src = want;
        else pimg.removeAttribute("src");
      }
      pbox.classList.toggle("vide", !want);
    });
    var pedit = null;
    pbox.addEventListener("click", function () {
      // Le portrait fait partie de la construction de la fiche : le mode
      // Consultation global doit empêcher l'ouverture même de son champ URL.
      if (!ficheModifiable() || pedit) return;
      pedit = el("input", "pc-portrait-edit");
      pedit.type = "text";
      pedit.placeholder = "URL de l'image…";
      pedit.value = state.portrait || "";
      pedit.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); pedit.blur(); }
        else if (e.key === "Escape") { pedit.value = state.portrait || ""; pedit.blur(); }
      });
      pedit.addEventListener("blur", function () {
        // Le verrou peut être activé pendant que le champ est ouvert.
        if (ficheModifiable()) state.portrait = pedit.value.trim();
        if (pedit) { pedit.remove(); pedit = null; }
        refresh();
      });
      pbox.appendChild(pedit);
      setTimeout(function () { pedit.focus(); pedit.select(); }, 0);
    });
    head.appendChild(pbox);
    // carré 1:1 haut comme l'en-tête : largeur = hauteur MESURÉE (le transfert
    // aspect-ratio depuis un étirement flex n'est pas fiable sous Firefox).
    // Le carré fait la hauteur de l'en-tête PARTOUT (site, dialogue Roll20,
    // fenêtre séparée) : côté = hauteur du bloc d'identité, plafonné pour ne
    // pas dévorer la largeur quand l'en-tête se replie sur trois lignes.
    // Les deux dimensions sont posées en dur : aucun transfert aspect-ratio
    // (infiable depuis un étirement flex) et aucune règle de largeur en CSS.
    // Boucle bornée : régler le côté rétrécit le bloc d'identité, qui peut se
    // replier et changer de hauteur — on repasse au plus 3 fois, puis on garde.
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
    // suit les redimensionnements de la fenêtre (dialogue Roll20, popout)
    try { new ResizeObserver(function () { carrePortrait(0); }).observe(idBox); } catch (e) {}

    var id = idBox;
    function champEntete(get, set, placeholder) {
      var champ = textInput(get, set, placeholder);
      champ.classList.add("pc-global-edit-field");
      return champ;
    }
    id.appendChild(fld("Nom", champEntete(function () { return state.name; }, function (v) { state.name = v; }, "Nom du personnage"), "c4"));
    id.appendChild(fld("Espèce", champEntete(function () { return state.espece; }, function (v) { state.espece = v; }), "c2"));
    id.appendChild(fld("Âge", champEntete(function () { return state.age; }, function (v) { state.age = v; }), "c2"));
    id.appendChild(fld("Sexe", champEntete(function () { return state.sexe; }, function (v) { state.sexe = v; }), "c2"));
    id.appendChild(fld("Genre", champEntete(function () { return state.genre; }, function (v) { state.genre = v; }), "c2"));

    // Deux budgets côte à côte : XP et EO, chacun avec sa dépense, son total
    // éditable et sa barre. La réserve courante du module EO n'entre pas ici.
    var mrow = el("div", "pc-id-meters pc-id-progression");
    function meter(label, getUsed, getTotal, totalInput, titre) {
      var m = el("span", "pc-meter");
      m.appendChild(el("span", null, label));
      var b = el("b", null, "");
      m.appendChild(b);
      if (totalInput) {
        m.appendChild(el("span", null, "/"));
        m.appendChild(totalInput);
      }
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      if (titre) m.title = titre;
      hooks.push(function () {
        var used = Number(getUsed()) || 0, total = Math.max(0, Number(getTotal()) || 0);
        b.textContent = fmtP(used);
        var over = used > total;
        b.classList.toggle("over", over);
        fill.classList.toggle("over", over);
        fill.style.width = clamp(total ? used / total * 100 : 0, 0, 100) + "%";
      });
      return m;
    }
    function eoDepense() {
      var total = 0;
      (Array.isArray(state.energie) ? state.energie : []).forEach(function (categorie) {
        if (!categorie || !Array.isArray(categorie.techniques)) return;
        categorie.techniques.forEach(function (technique) {
          var cout = Number(technique && technique.cout);
          if (isFinite(cout) && cout > 0) total += Math.floor(cout);
        });
      });
      return total;
    }

    var xpIn = el("input", "pc-meter-total pc-id-xp-total pc-edit-field pc-global-edit-field");
    xpIn.type = "number"; xpIn.min = 0; xpIn.step = 5;
    xpIn.setAttribute("aria-label", "XP total");
    xpIn.title = "XP total";
    hooks.push(function () { if (document.activeElement !== xpIn) xpIn.value = state.xpTotal; });
    xpIn.addEventListener("input", function () {
      var v = parseInt(xpIn.value, 10);
      if (isFinite(v)) { state.xpTotal = Math.max(0, v); refresh(); }
    });
    mrow.appendChild(meter("XP dépensé", xpDepense, function () { return state.xpTotal; },
      xpIn, "Expérience dépensée / totale"));

    var emMaxIn = el("input", "pc-meter-total pc-id-em-total pc-edit-field pc-global-edit-field pc-em-max-input");
    emMaxIn.type = "number"; emMaxIn.min = "0"; emMaxIn.max = "9999"; emMaxIn.step = "1";
    emMaxIn.setAttribute("aria-label", "EO total");
    emMaxIn.title = "Réserve totale d'énergie occulte";
    hooks.push(function () { if (document.activeElement !== emMaxIn) emMaxIn.value = state.emMax; });
    emMaxIn.addEventListener("input", function () {
      var v = parseInt(emMaxIn.value, 10);
      state.emMax = isFinite(v) ? clamp(v, 0, 9999) : 0;
      refresh();
    });
    mrow.appendChild(meter("EO dépensé", eoDepense, function () { return state.emMax; },
      emMaxIn, "Énergie occulte dépensée / totale"));
    id.appendChild(mrow);

    head.appendChild(id);
    sheet.appendChild(head);
    buildEnvoi(sheet);

    // garde-fous
    var warns = el("div", "pc-warns");
    hooks.push(function () {
      warns.innerHTML = "";
      if (ptsCreation() > ptsCreaMax())
        warns.appendChild(el("div", "pc-warn", "Points de création dépassés : " + ptsCreation() + " / " + ptsCreaMax() + "."));
      if (xpRestant() < 0)
        warns.appendChild(el("div", "pc-warn", "XP dépensé au-delà du total (" + xpDepense() + " / " + state.xpTotal + ")."));
      if (eoDepense() > state.emMax)
        warns.appendChild(el("div", "pc-warn", "EO dépensée au-delà du total (" + fmtP(eoDepense()) + " / " + fmtP(state.emMax) + ")."));
      var cap = compCap();
      Object.keys(state.comps).forEach(function (k) {
        if (compXp(state.comps[k]) > cap)
          warns.appendChild(el("div", "pc-warn", "« " + k.split("/").slice(1).join("/") + " » dépasse le quart de l'xp total (" + compXp(state.comps[k]) + " / " + cap + " xp)."));
      });
    });
    sheet.appendChild(warns);
  }

  // ---------- onglets ----------
  var TABS = [
    { id: "fiche", label: "Fiche" },
    { id: "art", label: "Art" },
    { id: "energie", label: "Énergie" },
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
      // l'onglet se nomme sur son panneau : c'est le seul moyen, de l'extérieur,
      // de dire dans QUELLE colonne de QUEL onglet un module a atterri
      panes[t.id].dataset.tab = t.id;
    });
    function activate(id) {
      if (!panes[id]) id = "fiche";
      TABS.forEach(function (t) {
        btns[t.id].classList.toggle("on", t.id === id);
        panes[t.id].classList.toggle("on", t.id === id);
      });
      setTab(id);
    }
    sheet.appendChild(bar);
    TABS.forEach(function (t) { sheet.appendChild(panes[t.id]); });
    activate(curTab());
    return panes;
  }

  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage faisait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod puisse un jour se
  // substituer à un module natif, ou changer la disposition, sans qu'on
  // rouvre ce fichier.
  //
  // Un module se décrit ainsi :
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (pour les réglages de disposition)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction sans effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];        // dans l'ordre de déclaration
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée au montage avant toute consigne

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
    // refuse ou supprime. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
    // Hors montage (console du navigateur, script tiers chargé après la fiche) :
    // le prochain mount() remet la table à la table native, et rien ne
    // rejouerait cet enregistrement. On le garde donc, comme le montage rejoue
    // les mods à chaque fois. Le propriétaire est le MOD s'il y en a un, sinon
    // l'id du module : c'est par lui que le rejeu saura s'il a encore un ayant
    // droit (rejoueHorsMontage).
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

  // Squelette de chaque onglet : ses colonnes, dans l'ordre exact où elles
  // existaient avant le registre. Il vit ici, et pas dans les modules, pour
  // qu'un mod n'ait qu'un bloc à fournir sans rien savoir de la charpente.
  var SQUELETTES = {
    fiche: function (pane) {
      // trois colonnes : narration, caractéristiques, langues | initiative,
      // vitesse, régén, PV, armes | compétences (Body, Mind, Prestance)
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
    art: function (pane) {
      return { seule: pane };   // un seul bloc, sur toute la largeur
    },
    energie: function (pane) {
      return { seule: pane };   // catégories sur toute la largeur, comme les Arts
    },
    equipement: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      // « bas » = sous les deux colonnes, pleine largeur (l'inventaire)
      return { gauche: left, droite: right, bas: pane };
    },
    bio: function (pane) {
      var cols = el("div", "pc-cols2");
      var left = el("div", "pc-col");
      var right = el("div", "pc-col");
      cols.appendChild(left);
      cols.appendChild(right);
      pane.appendChild(cols);
      return { gauche: left, droite: right };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var colA = el("div", "pc-col");
      var colB = el("div", "pc-col");
      cols.appendChild(colA);
      cols.appendChild(colB);
      pane.appendChild(cols);
      return { gauche: colA, droite: colB };
    }
  };

  // L'interrupteur du module. Seuls les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche sans rien effacer : son coffre et
  // ses données restent, il ne s'affiche plus. C'est le corps de Jjk.active,
  // NOMMÉ ici parce que le bloc Options « Modules » s'en sert aussi : son
  // interrupteur ne doit pas passer par un window.Jjk qu'un mod peut remplacer.
  function activeModule(id, oui) {
    if (!state) return;                  // avant le chargement : rien à couper
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et le REFUS EST ICI, dans l'écriture,
    // pas seulement dans le montage. Sinon un mod qui appelle Jjk.active laisse
    // « modules: false » dans le personnage pour toujours : le bloc s'affiche
    // (le montage l'exempte) pendant que Jjk.actif("modules") répond faux, et le
    // personnage transmis emporte une incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le bloc des réglages d'affichage, nommé une fois pour toutes : trois
  // endroits doivent l'épargner, et un id recopié à la main finirait par
  // manquer à l'un d'eux.
  var MODULE_REGLAGES = "modules";

  // Même garde que dans Outward : un module remplacé par un mod, un filtre
  // personnalisé ou un mod actif impose un remontage complet. Pour les modules
  // natifs, une modification distante ne reconstruit que les blocs concernés.
  function moduleNatif(m) {
    return MODULES_NATIFS.some(function (n) { return n.id === m.id && n.build === m.build; });
  }
  function modulesPersoActifs() {
    return (typeof filtres !== "undefined" && Object.keys(filtres).some(function (k) { return filtres[k].length > 0; })) ||
      (Array.isArray(modules) && modules.some(function (m) { return !moduleNatif(m); })) ||
      ((state && state.mods) || []).some(function (m) { return m && m.actif !== false && modAutorise(m.id); });
  }
  function nettoieHooksModule(id) {
    var conserves = [];
    remontageNettoyage.forEach(function (fn) {
      if (fn._jjkModule === id) { try { fn(); } catch (e) {} }
      else conserves.push(fn);
    });
    remontageNettoyage = conserves;
  }
  function construitModule(m, hote, ancien) {
    var reg = regModule(m.id), precedent = hooks, propPrecedent = proprietaireCourant;
    var cleanStart = remontageNettoyage.length, e = null, erreurBuild = null;
    hooks = reg;
    proprietaireCourant = m.__mod || m.id;
    try {
      e = m.build(contexte(m, reg));
      if (e && e.nodeType !== 1) e = null;
      if (e && !e.dataset.module) e.dataset.module = m.id;
      etatModule(m.id).panne = "";
    } catch (err) {
      erreurBuild = err;
      reg.length = 0;
    } finally {
      hooks = precedent;
      proprietaireCourant = propPrecedent;
    }
    if (erreurBuild) {
      remontageNettoyage.splice(cleanStart).forEach(function (fn) { try { fn(); } catch (e) {} });
      e = blocEnPanne(m, erreurBuild);
    } else {
      remontageNettoyage.slice(cleanStart).forEach(function (fn) { fn._jjkModule = m.id; });
    }
    etatModule(m.id).vide = !e;
    if (!e) {
      if (ancien && ancien.parentNode) ancien.parentNode.removeChild(ancien);
      delete elModules[m.id];
      return;
    }
    try {
      if (ancien && ancien.parentNode) ancien.parentNode.replaceChild(e, ancien);
      else hote.appendChild(e);
      elModules[m.id] = e;
    } catch (err2) {
      reg.length = 0;
      remontageNettoyage.splice(cleanStart).forEach(function (fn) { try { fn(); } catch (e) {} });
      var carte = blocEnPanne(m, err2);
      try {
        if (ancien && ancien.parentNode) ancien.parentNode.replaceChild(carte, ancien);
        else hote.appendChild(carte);
        elModules[m.id] = carte;
        etatModule(m.id).panne = messageErreur(err2);
        etatModule(m.id).vide = false;
      } catch (fatal) {
        etatModule(m.id).vide = true;
        delete elModules[m.id];
        if (window.console && window.console.error) window.console.error("[fiche] insertion du module " + m.id, fatal);
      }
    }
  }
  function reconstruitModules(ids) {
    (ids || []).forEach(function (id) {
      var ancien = elModules[id];
      var m = modules.filter(function (x) { return x.id === id; })[0];
      if (!ancien || !ancien.parentNode || !m) return;
      nettoieHooksModule(id);
      regsModules[id] = [];
      if (id === "comps") compHooks = [];
      if (id === "optcomps") optHooks = [];
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
      construitModule(m, ancien.parentNode, ancien);
    });
  }

  function monteModules(panes) {
    var colonnes = {};
    elModules = {};
    TABS.forEach(function (t) {
      if (SQUELETTES[t.id] && panes[t.id]) colonnes[t.id] = SQUELETTES[t.id](panes[t.id]);
    });
    ordreModules().forEach(function (m) {
      // Le bloc des réglages ne se coupe pas. Sa puce est déjà absente de la
      // liste, mais un mod (ou une ligne de console) qui appelle
      // Jjk.active("modules", false) écrit le refus DANS LE PERSONNAGE : le
      // bloc ne se monterait plus, et avec lui disparaîtrait le seul endroit
      // d'où l'on rallume un module ou d'où l'on rend la disposition d'origine.
      // Le blocage voyagerait même avec le personnage.
      //
      // Ce test passe AVANT celui de l'hôte : un module coupé n'affiche rien
      // parce que le joueur l'a voulu, il n'a pas à porter la mention de ceux
      // qui ne trouvent pas leur place.
      if (m.id !== MODULE_REGLAGES && !actif(m.id)) return;   // coupé : pas monté
      // « pour » de la table native est un PRÉDICAT (le module n'existe que
      // s'il rend vrai) ; celui d'un mod est une version, gérée ailleurs.
      // Il passe par moduleAffichable, qui l'attrape : un prédicat qui jette
      // emportait sinon TOUT le montage, donc la fiche, sans rien pour rouvrir.
      // Lui aussi avant l'hôte : un module qui n'existe pas ici n'a rien à dire
      // de sa colonne, et le bloc Modules ne lui donne d'ailleurs pas de ligne.
      if (!moduleAffichable(m)) return;
      // Onglet ou colonne inconnus : le module est laissé de côté (un mod mal
      // réglé ne doit pas emporter toute la fiche), mais il est MARQUÉ. Sans ce
      // « vide », un module qui déclare une colonne absente de son onglet ne
      // s'affiche nulle part ET ne se plaint nulle part : sa ligne du bloc
      // Modules le donne pour un module ordinaire, et le joueur cherche une
      // panne qui n'existe pas. aClef, et pas une simple lecture : une colonne
      // nommée « constructor » rendrait autrement une méthode d'Object en guise
      // d'hôte, et le montage tomberait sur le premier appendChild.
      var cols = colonnes[m.onglet];
      var hote = (cols && aClef(cols, m.colonne)) ? cols[m.colonne] : null;
      if (!hote) { etatModule(m.id).vide = true; return; }
      // Construction centralisée : mêmes gardes à l'ouverture et lors d'une
      // mise à jour distante ciblée, avec enregistrement des nettoyages.
      construitModule(m, hote, null);
    });
  }

  // ---------- isolation des pannes ----------
  // Un module dont build() jette ne fait pas tomber la fiche : il rend cette
  // carte à sa place, et le montage continue. Réessayer le reconstruit (une
  // panne peut tenir à l'état du moment) ; Désactiver le retire de la fiche
  // sans rien effacer de ce qu'il porte.
  function blocEnPanne(m, err) {
    var msg = messageErreur(err);
    etatModule(m.id).panne = msg;
    if (window.console && window.console.error) window.console.error("[mod:" + m.id + "]", err);
    var b = el("div", "pc-block");
    b.dataset.module = m.id;
    b.dataset.panne = "1";
    var t = el("div", "pc-block-title", m.titre || m.id);
    // la page Mods promet un cadre qui donne l'ID du module et le message :
    // c'est l'id, pas le titre, qui sert à retrouver le mod dans la liste et
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
    // couper retirerait le seul endroit d'où l'on rallume un module, y compris
    // lui-même. « Réessayer » reste, et le montage suivant lui redonne sa
    // chance ; les modules coupés le sont, eux, sans que la fiche s'en mêle.
    if (m.id !== MODULE_REGLAGES)
      line.appendChild(miniBtn("Désactiver", "Retirer ce module de la fiche : rien n'est perdu, il ne s'affiche plus.", function () {
        // même garde que __jjkModules.active : une panne peut survenir sur un
        // état remplacé à la main (import, bibliothèque) qui n'est pas repassé
        // par normalize(), et la clé manquerait
        if (!state.modActifs) state.modActifs = {};
        state.modActifs[m.id] = false;
        save();
        remount();
      }, "danger"));
    tools.appendChild(line);
    b.appendChild(tools);
    return b;
  }
  // Muselé : le module garde son bloc (ses valeurs sont celles du dernier
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
  // C'est TOUT ce qu'un module touche, natif comme mod : le contrat public
  // décrit dans la page Mods. Les modules natifs de ce fichier n'en font pas
  // usage (ils appellent les fonctions directement), mais ils le reçoivent :
  // un mod qui reprend l'id de l'un d'eux dispose exactement du même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "PV", pvMax: "PV max", initiative: "Initiative", vitesse: "Vitesse",
    regen: "Régén / jour", poids: "Poids porté", narration: "Narration",
    xpTotal: "XP total", stade: "Stade", total: "Total",
    competence: "Compétence", art: "Art", passif: "Passif",
    arme: "Arme", degats: "Dégâts", armure: "Armure",
    quantite: "Quantité", groupe: "Groupe", description: "Description",
    avantage: "Avantage", defaut: "Défaut", qualite: "Qualité",
    background: "Background", notes: "Notes", de: "Dé des jets de test"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE. Un mod enregistre presque
    // toujours un module dont l'id diffère du sien (« lmod » qui pose
    // « bloc-journal ») : attribuer le filtre au module rendrait la purge
    // inopérante, puisque c'est le MOD que le joueur refuse ou supprime.
    // m.__mod est posé par enregistre() quand un mod tourne.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe, proprietaireCourant
    // est retombé à « ? » et le filtre posé par le bouton d'un mod refusé
    // survivait à son refus : c'est exactement le défaut que la contre-relecture
    // a rouvert.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    // le coffre privé du module, rangé dans state.modData[id] : il voyage avec
    // le personnage (bibliothèque, export JSON, Attributes Roll20)
    var donnees = {
      // LIRE NE SALIT PAS. L'ancienne version rangeait un objet vide dans
      // l'état au premier get() : tout module qui se contentait de lire
      // laissait sa trace dans le personnage, et un personnage qui n'a jamais
      // rien réglé se retrouvait avec autant d'entrées que de modules. On rend
      // un objet détaché ; c'est set() qui écrit, lui seul.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE. Un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche : rangé tel quel, il ferait échouer le JSON.stringify(state)
      // du premier save() et le personnage entier cesserait de s'enregistrer.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);              // circulaire : l'erreur part au module
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
    // puce de filtre, comme celles des modules Armes et Compétences
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
      // identité
      id: id,
      // Le numéro tel qu'il est, suffixe de beta compris : qui voudrait le
      // lire passe par JjkMods.lireVersion, seul endroit qui sache ce que
      // vaut ce suffixe. Le découper à la main ici rendrait « 0b » sur le
      // dernier nombre, et le majeur n'apprend RIEN du schéma.
      version: RELEASE,
      // données (en lecture : ce qui appartient au personnage appartient aux
      // modules natifs, un module ne le corrige pas dans le dos des autres)
      state: state,
      data: DATA,
      donnees: donnees,
      // structure
      // Le rouage d'édition est OPTIONNEL : ctx.bloc("Titre", { edition: true }).
      // Sans lui, un module qui n'a rien à éditer affichait quand même le
      // bouton, qui ne faisait que basculer un mode dont il ne se servait pas.
      // Le bloc reste repérable sans : monteModules pose data-module lui-même.
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      // cycle
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques. Tout ce qui prend un GESTE du joueur passe par aNous() : le
      // code appelé au clic doit rester attribué à son mod, sinon ce qu'il
      // installe alors n'a plus d'ayant droit et survit à son refus.
      texte: function (lire, ecrire, indication) {
        var champ = textInput(lire, aNous(ecrire), indication, reg);
        champ.setAttribute("data-jjk-requires-edit", id);
        return champ;
      },
      bouton: function (libelle, infobulle, action) {
        var bouton = miniBtn(libelle, infobulle, aNous(action));
        bouton.setAttribute("data-jjk-requires-edit", id);
        return bouton;
      },
      pas: function (lire, ecrire, pas) {
        var champ = stepper(lire, aNous(ecrire), pas || 1, null, reg);
        champ.setAttribute("data-jjk-requires-edit", id);
        var saisie = champ.querySelector(".pc-edit-field");
        if (saisie) saisie.setAttribute("data-jjk-requires-edit", id);
        return champ;
      },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (carac, nom) {
        return compRow({ key: carac + "/" + nom, name: nom, carac: carac, custom: false },
                       false, { module: id, reg: reg });
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur) { doRoll(libelle, valeur, null, true); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal,
        compValue: compValue,
        pvMax: pvMax,
        pvCourant: pvCourant,
        initiative: initiative,
        vitesse: vitesse,
        regen: regen,
        poidsPorte: poidsPorte,
        poidsMalus: poidsMalus
      },
      // …et de quoi les CHANGER : un filtre reçoit la valeur calculée et rend
      // celle qu'il veut, pour toute la fiche. Le propriétaire est figé ici, à
      // la construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui,
      // et refuser le mod emporte bien le filtre.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      // mise en forme
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return ABBR[carac] || carac; }
    };
  }

  // ---------- onglet Fiche : caractéristiques + combat | compétences ----------
  function buildCaracs() {
    // jeu : le total et son jet ; édition : les steppers Création / Achats xp
    var b = block("Caractéristiques", null, "caracs");
    // même ordre que les compétences : Body, puis Mind, puis Prestance
    CHAMPS.forEach(function (name) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-crow");
      var top = el("div", "pc-crow-top");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      top.appendChild(chip);
      // la ligne du nom porte aussi le malus de poids : elle est mise à jour au
      // rafraîchissement, d'où la référence gardée
      var val = el("span", "pc-cval pc-rollable", "");
      // caracJet, pas caracTotal : ce bouton LANCE la caractéristique, et c'est
      // caracJet qui dit ce que vaut un jet direct (la charge n'y pèse plus)
      val.addEventListener("click", function () { doRoll(name, caracJet(name), null, true); });
      top.appendChild(val);
      row.appendChild(top);

      var bot = el("div", "pc-crow-bot pc-edit-only");
      bot.appendChild(el("span", "lbl", "Création"));
      bot.appendChild(stepper(
        function () { return state.caracsBase[name]; },
        function (v) {
          // le plafond ne bloque que les HAUSSES : une base montée au-dessus
          // du plafond (abaissé ensuite dans les Options) redescend pas à pas,
          // sans être écrasée au plafond par un simple clic
          var plaf = caracPlafond(name);
          var max = Math.max(plaf, state.caracsBase[name]);
          var val2 = clamp(v, 0, 9999);
          if (val2 > max) { flash("Plafond de " + plaf + " atteint (Options, bloc Création)."); val2 = max; }
          state.caracsBase[name] = val2;
        }, CARAC_PAS, "création"));
      bot.appendChild(el("span", "lbl", "Achats XP"));
      bot.appendChild(stepper(
        function () { return state.caracsXp[name]; },
        function (v) {
          var actuel = state.caracsXp[name];
          var suivant = clamp(Math.floor(Number(v) || 0), 0, 9999);
          if (suivant > actuel) {
            var cout = (suivant - actuel) * DATA.xpParStade;
            if (xpRestant() < cout) { flash("XP insuffisant."); return; }
            // Le plafond porte sur base + achats, sans modificateur de total.
            if (state.caracsBase[name] + CARAC_PAS * suivant > caracPlafond(name)) {
              flash("Plafond de " + caracPlafond(name) + " atteint (Options, bloc Création).");
              return;
            }
          }
          state.caracsXp[name] = suivant;
        }, 1, "achat XP"));
      row.appendChild(bot);

      hooks.push(function () {
        var d = (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        var brut = state.caracsBase[name] + CARAC_PAS * state.caracsXp[name];
        var plaf = caracPlafond(name);
        var plafonne = Math.min(brut, plaf);
        var force = state.caracsForce[name] !== undefined;
        // ce que le JET perd par rapport au total : nul depuis que la charge ne
        // pèse plus sur la caractéristique (elle reste sur les compétences de
        // Body et sur la vitesse). La ligne demeure parce qu'elle est la seule
        // à relier l'affichage à caracJet : si l'arbitrage rebasculait, la
        // mention et l'accent reviendraient d'eux-mêmes.
        var m = caracTotal(name) - caracJet(name);
        // Un écart s'écrirait en clair sur la ligne du nom : sans lui, le joueur
        // verrait un total qui ne correspond ni à sa création ni à ses achats,
        // sans rien dans le bloc pour dire pourquoi.
        val.textContent = String(caracJet(name));
        val.classList.toggle("adj", d !== 0 || force || m !== 0);
        // quand le plafond mord, l'écrire en substitution (« plafonné à 80 »)
        // pour que la somme du tooltip se vérifie de tête ; un total forcé, lui,
        // remplace la somme (l'afficher quand même la ferait mentir). Le malus de
        // poids vient APRÈS le forçage : il fixe la caractéristique, pas le jet.
        val.title = (force
                      ? "Total forcé (Options)"
                      : "Création " + state.caracsBase[name] +
                        " + achats " + (CARAC_PAS * state.caracsXp[name]) +
                        (brut !== plafonne ? ", plafonné à " + plaf : "") +
                        (d ? " · modificateur (Options) " + sign(d) : "")) +
                    (m ? " · poids " + sign(-m) : "") +
                    " = " + caracJet(name) + " — clic : lancer 1d100 + " + name;
      });
      b.appendChild(row);
    });

    // Budget de création : la même jauge pleine largeur que les réserves OWD.
    var budget = el("div", "pc-creation-budget pc-edit-only");
    var ligne = el("div", "pc-vital-tete");
    ligne.appendChild(el("span", "pc-vital-nom", "Création"));
    var valeur = el("span", "pc-vital-val", "");
    ligne.appendChild(valeur);
    budget.appendChild(ligne);
    var jauge = el("span", "pc-vital-jauge");
    var plein = el("i");
    jauge.appendChild(plein);
    budget.appendChild(jauge);
    b.appendChild(budget);
    hooks.push(function () {
      var pris = ptsCreation(), max = ptsCreaMax();
      valeur.textContent = fmtP(pris) + " / " + fmtP(max);
      plein.style.width = clamp(max ? pris / max * 100 : 0, 0, 100) + "%";
      plein.classList.toggle("over", pris > max);
    });
    return b;
  }

  // L'ancien bloc « Combat » est éclaté (2026-08-01) : Vitesse et Régén / jour
  // forment leur propre élément (tuiles autonomes), PV et Narration ont chacun
  // leur bloc ; la tuile « XP restant » a disparu, le compteur « XP dépensé »
  // de l'en-tête la rendait redondante.
  // Valeur forcée d'une tuile : vide = valeur calculée. Même mécanique que le
  // maximum de PV, en version étroite (deux lignes empilées sous la valeur).
  function tuileForce(tile, champ, auto, dec) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    var inp = el("input", "force pc-edit-field");
    inp.type = "number"; inp.min = "0";
    inp.step = dec ? "0.5" : "1";
    inp.title = "Vide = valeur calculée (modificateurs compris) ; une valeur la force.";
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      state[champ] = isFinite(v)
        ? clamp(dec ? Math.round(v * 100) / 100 : Math.floor(v), 0, 9999)
        : null;
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = fmtP(auto());
      if (document.activeElement !== inp) inp.value = state[champ] === null ? "" : state[champ];
    });
    row.appendChild(inp);
    tile.appendChild(row);
  }
  function tuileMods(tile, cle) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiMod(state.divers, cle));
    tile.appendChild(row);
  }

  function buildVitesse() {
    // deux tuiles = deux MODULES distincts : chacune porte son propre rouage
    // flottant (jeu : lecture ; édition : sa valeur forcée et ses modificateurs)
    var tiles = el("div", "pc-bigrow pc-bigrow-2");

    var tv = bigTile("Vitesse", vitesse);
    tv.classList.add("pc-mods-host", "pc-editable");
    tv.dataset.module = "vitesse";
    var gV = gearBtn(tv, "vitesse");
    gV.classList.add("pc-gear-float");
    tv.appendChild(gV);
    tuileForce(tv, "vitesseOverride", vitesseAuto, true);
    tuileMods(tv, "vitesse");
    hooks.push(function () {
      var d = modSum(state.divers.vitesse);
      // la charge ne marque la tuile que lorsqu'elle coûte vraiment des mètres,
      // c'est-à-dire en surcharge : un sac lourd mais porté ne change plus rien
      var surch = estSurcharge();
      tv.classList.toggle("adj", state.vitesseOverride !== null || d !== 0 || surch);
      // D'où sort le chiffre : le palier lu sur le Body (le poids ne l'y descend
      // plus), puis la surcharge si la charge dépasse ce Body. Sans ce détail, un
      // joueur surchargé cherche son résultat dans la table et ne l'y trouve pas.
      var calcul = "Palier de la table (Body " + bodyVitesse() + ") : " + vitessePalier() +
        (surch ? " · surcharge " + sign(-surchargeMalus()) + " m" : "");
      tv.title = state.vitesseOverride !== null
        ? "Vitesse forcée à " + fmtP(state.vitesseOverride) + " m (calculée : " + fmtP(vitesseAuto()) + " m)"
        : calcul + (d ? " · modificateurs " + sign(d) + " m" : "");
    });
    tiles.appendChild(tv);

    var tr = bigTile("Régén / jour", regen);
    tr.classList.add("pc-mods-host", "pc-editable");
    tr.dataset.module = "regen";
    var gR = gearBtn(tr, "regen");
    gR.classList.add("pc-gear-float");
    tr.appendChild(gR);
    tuileForce(tr, "regenOverride", regenAuto, false);
    tuileMods(tr, "regen");
    hooks.push(function () {
      var d = modSum(state.divers.regen);
      tr.classList.toggle("adj", state.regenOverride !== null || d !== 0);
      tr.title = state.regenOverride !== null
        ? "Régénération forcée à " + state.regenOverride + " (calculée : " + regenAuto() + ")"
        : "Body / 10 = " + Math.floor(caracTotal("Body") / 10) +
          (d ? " · modificateurs " + sign(d) : "") + " (jamais sous 0)";
    });
    tiles.appendChild(tr);

    return tiles;
  }

  // ---------- initiative ----------
  // Une compétence de Body comme les autres (stade, passifs à Artiste dans
  // l'onglet Art, modificateur dans Options), malus de poids compris : il lui
  // arrive par compValue(), comme à l'esquive ou à la course, et la ligne
  // générique l'affiche déjà, d'où les crochets adj et detail retirés d'ici : ils
  // parlaient du poids BRUT et le comptaient une seconde fois. Elle a son module
  // parce qu'elle se lance à chaque combat ; la liste des compétences l'écarte
  // donc, pour ne pas doubler la même commande.
  function buildInitiative() {
    var initHooks = [];   // registre PROPRE au module : la ligne est reconstruite
    var b = block("Initiative", null, "initiative", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);
    function rendre() {
      initHooks.length = 0;   // les hooks de la ligne détruite partent avec elle
      box.innerHTML = "";
      box.appendChild(compRow({ key: INIT_KEY, name: "Initiative", carac: "Body", custom: false },
                              false, {
        module: "initiative", reg: initHooks,
        // le seul écart avec une ligne ordinaire : le filtre « initiative » ne
        // vit que sur cette valeur-là, et la ligne générique le manquerait en
        // appelant compValue() directement
        value: function () { return initiative(); },
        rollLabel: "Initiative"
      }));
      applyEdit(b, "initiative");
      refresh();
    }
    hooks.push(function () { initHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

  // ---------- xp par champ ----------
  // Où le personnage a mis son xp : la caractéristique elle-même et toutes ses
  // compétences. Les barres se comparent entre elles (part du dépensé), pas au
  // total disponible : c'est la répartition qui intéresse.
  function buildXpChamps() {
    var b = block("XP par champ", null, null);
    CHAMPS.forEach(function (carac) {
      var row = el("div", "pc-xpchamp");
      row.appendChild(el("span", "pc-abbr", ABBR[carac] || carac));
      var m = el("span", "pc-meter");
      var v = el("b", null, "");
      m.appendChild(v);
      var bar = el("span", "bar");
      var fill = el("i");
      bar.appendChild(fill);
      m.appendChild(bar);
      var part = el("span", "pct", "");
      m.appendChild(part);
      row.appendChild(m);
      hooks.push(function () {
        var xp = xpChamp(carac), tot = xpDepense();
        v.textContent = xp + " xp";
        var p = tot > 0 ? (xp / tot) * 100 : 0;
        fill.style.width = clamp(p, 0, 100) + "%";
        part.textContent = tot > 0 ? Math.round(p) + " %" : "—";
        row.title = carac + " : " + (DATA.xpParStade * (state.caracsXp[carac] || 0)) +
                    " xp de caractéristique, " +
                    (xp - DATA.xpParStade * (state.caracsXp[carac] || 0)) + " xp de compétences";
      });
      b.appendChild(row);
    });
    return b;
  }

  // ---------- compétences d'armes ----------
  // Toujours des compétences de Body. Celles des règles (DATA.compsArmes) et
  // celles que le joueur ajoute vivent ensemble ici, et nulle part ailleurs :
  // la liste générale les écarte pour ne pas doubler la commande du stade.
  function buildArmesComps() {
    var armHooks = [];
    var b = block("Armes", null, "armescomp", function () { rendre(); });

    // mêmes filtres que la liste des compétences : décoché, « Armes
    // personnalisées » ne laisse que celles des règles ; « Investies
    // seulement » masque celles où rien n'est posé.
    var tools = el("div", "pc-comp-tools");
    // pas de menu des champs ici (une arme est toujours une compétence de
    // Body) : le filtre prend donc toute la largeur
    var recherche = champFiltre(function () { return armesFilter; },
                                function (v) { armesFilter = v; }, "Filtrer les armes…",
                                function () { rendre(); });
    if (recherche) {
      var lineF = el("div", "row");
      lineF.appendChild(recherche);
      tools.appendChild(lineF);
    }
    var line = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    persoChip.title = "Décoché : seules les armes des règles sont affichées.";
    persoChip.classList.toggle("on", armesPerso);
    persoChip.addEventListener("click", function () {
      armesPerso = !armesPerso;
      persoChip.classList.toggle("on", armesPerso);
      rendre();
    });
    line.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les armes où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", armesOnly);
    onlyChip.addEventListener("click", function () {
      armesOnly = !armesOnly;
      onlyChip.classList.toggle("on", armesOnly);
      rendre();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);

    var box = el("div");
    b.appendChild(box);

    function rendre() {
      armHooks.length = 0;
      box.innerHTML = "";
      var flt = filtreDe(armesFilter);
      var noms = armesNoms().filter(function (nom) {
        var perso = state.armesComps.indexOf(nom) >= 0;
        if (!armesPerso && perso) return false;
        if (armesOnly && !compInvestie({ key: armeKey(nom) })) return false;
        if (flt && nom.toLowerCase().indexOf(flt) < 0) return false;
        return true;
      });
      if (noms.length) {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Arme"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        box.appendChild(head);
      } else {
        box.appendChild(el("div", "pc-empty",
          flt ? "Aucune arme ne correspond."
              : armesOnly ? "Aucune arme investie." : "Aucune arme."));
      }
      noms.forEach(function (nom, i) {
        var perso = state.armesComps.indexOf(nom) >= 0;
        box.appendChild(compRow(
          { key: armeKey(nom), name: nom, carac: ARME_CARAC, custom: perso, arme: true },
          i % 2 === 1, { module: "armescomp", reg: armHooks, onDrop: rendre }));
      });

      if (isEdit("armescomp")) {
        var addRow = el("div", "pc-comp-add");
        var inp = el("input");
        inp.type = "text";
        inp.placeholder = "Nouvelle arme…";
        addRow.appendChild(inp);
        addRow.appendChild(miniBtn("+", "Ajouter", function () {
          var nom = capFirst(inp.value.trim());
          if (!nom) return;
          if (allComps().some(function (it) {
                return it.carac === ARME_CARAC && it.name.toLowerCase() === nom.toLowerCase();
              })) { flash("« " + nom + " » existe déjà en Body."); return; }
          state.armesComps.push(nom);
          // ne jamais ajouter une arme qui resterait invisible
          if (!armesPerso) { armesPerso = true; persoChip.classList.add("on"); }
          if (armesOnly) { armesOnly = false; onlyChip.classList.remove("on"); }
          if (filtreDe(armesFilter)) { armesFilter = ""; if (recherche) recherche.value = ""; }
          inp.value = "";
          refresh();
          rendre();
          if (optCompsRebuild) optCompsRebuild();
        }));
        box.appendChild(addRow);
      }
      applyEdit(b, "armescomp");
      refresh();
    }
    hooks.push(function () { armHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

  // ---------- langues ----------
  // Des compétences de Mind, rassemblées dans leur module. La langue du
  // personnage monte jusqu'à Expert sans rien coûter ; les autres se paient
  // comme n'importe quelle compétence.
  function buildLangues() {
    var langHooks = [];
    var b = block("Langues", null, "langues", function () { rendre(); });

    var tools = el("div", "pc-comp-tools");
    // pas de menu des champs (une langue est toujours une compétence de Mind)
    var recherche = champFiltre(function () { return languesFilter; },
                                function (v) { languesFilter = v; }, "Filtrer les langues…",
                                function () { rendre(); });
    if (recherche) {
      var lineF = el("div", "row");
      lineF.appendChild(recherche);
      tools.appendChild(lineF);
    }
    var line = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    // « personnalisée » = apprise en plus ; la langue du personnage, elle, est
    // acquise, c'est le pendant des compétences des règles dans les autres modules
    persoChip.title = "Décoché : seule la langue du personnage est affichée.";
    persoChip.classList.toggle("on", languesPerso);
    persoChip.addEventListener("click", function () {
      languesPerso = !languesPerso;
      persoChip.classList.toggle("on", languesPerso);
      rendre();
    });
    line.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les langues où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", languesOnly);
    onlyChip.addEventListener("click", function () {
      languesOnly = !languesOnly;
      onlyChip.classList.toggle("on", languesOnly);
      rendre();
    });
    line.appendChild(onlyChip);
    tools.appendChild(line);
    b.appendChild(tools);

    var box = el("div");
    b.appendChild(box);

    function rendre() {
      langHooks.length = 0;
      box.innerHTML = "";
      var flt = filtreDe(languesFilter);
      var noms = state.langues.filter(function (nom) {
        if (!languesPerso && nom !== state.langueBase) return false;
        if (languesOnly && !compInvestie({ key: langueKey(nom) })) return false;
        if (flt && nom.toLowerCase().indexOf(flt) < 0) return false;
        return true;
      });
      if (noms.length) {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Langue"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        box.appendChild(head);
      } else {
        box.appendChild(el("div", "pc-empty",
          flt ? "Aucune langue ne correspond."
              : languesOnly ? "Aucune langue investie."
              : state.langues.length ? "Aucune langue à afficher."
              : isEdit("langues")
                ? "Aucune langue : la première ajoutée devient celle du personnage."
                : "Aucune langue."));
      }
      noms.forEach(function (nom, i) {
        var item = { key: langueKey(nom), name: nom, carac: LANGUE_CARAC, custom: true, langue: true };
        var row = compRow(item, i % 2 === 1,
                          { module: "langues", reg: langHooks, onDrop: rendre });
        // la langue du personnage se désigne d'un clic : une seule à la fois
        var etoile = el("button", "pc-lang-base" + (state.langueBase === nom ? " on" : ""), "★");
        etoile.type = "button";
        etoile.title = state.langueBase === nom
          ? "Langue du personnage : acquise jusqu'à Expert sans rien coûter"
          : "Faire de « " + nom + " » la langue du personnage";
        etoile.addEventListener("click", function () {
          if (!isEdit("langues")) return;
          state.langueBase = state.langueBase === nom ? "" : nom;
          refresh();
          rendre();
        });
        row.querySelector(".pc-comp-name").insertBefore(etoile, row.querySelector(".pc-comp-label"));
        box.appendChild(row);
      });

      if (isEdit("langues")) {
        var addRow = el("div", "pc-comp-add");
        var inp = el("input");
        inp.type = "text";
        inp.placeholder = state.langues.length ? "Nouvelle langue…" : "Langue du personnage…";
        addRow.appendChild(inp);
        addRow.appendChild(miniBtn("+", "Ajouter", function () {
          var nom = capFirst(inp.value.trim());
          if (!nom) return;
          if (allComps().some(function (it) {
                return it.carac === LANGUE_CARAC && it.name.toLowerCase() === nom.toLowerCase();
              })) { flash("« " + nom + " » existe déjà en Mind."); return; }
          state.langues.push(nom);
          // la première langue est celle du personnage : elle arrive à Expert,
          // gratuitement — c'est tout l'intérêt de la désigner
          if (!state.langueBase) {
            state.langueBase = nom;
            state.comps[langueKey(nom)] = { stade: stadeExpert(), techniques: [] };
          }
          // une langue ajoutée ne doit jamais rester invisible
          if (!languesPerso) { languesPerso = true; persoChip.classList.add("on"); }
          if (languesOnly) { languesOnly = false; onlyChip.classList.remove("on"); }
          if (filtreDe(languesFilter)) { languesFilter = ""; if (recherche) recherche.value = ""; }
          inp.value = "";
          refresh();
          rendre();
          if (optCompsRebuild) optCompsRebuild();
        }));
        box.appendChild(addRow);
      }
      applyEdit(b, "langues");
      refresh();
    }
    hooks.push(function () { langHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

  // Réserves PV / EO : même charpente pleine largeur que la jauge vitale OWD.
  // Le courant reste une action de jeu indépendante du budget EO de l'en-tête.
  function buildReserve(cfg) {
    var b = cfg.editId ? block("", null, cfg.editId) : el("div", "pc-block");
    b.classList.add("pc-vital-block");
    if (!cfg.editId) b.dataset.module = cfg.moduleId;

    // Le titre natif porte aussi le bouton de réglage du module PV : on le
    // déplace dans le bandeau, à côté du nom, sans perdre son action.
    var ancienTitre = b.querySelector(".pc-block-title");
    var gear = ancienTitre && (ancienTitre.querySelector(".pc-gear-float") || ancienTitre.querySelector("button"));
    if (gear && gear.parentNode) gear.parentNode.removeChild(gear);
    if (ancienTitre && ancienTitre.parentNode) ancienTitre.parentNode.removeChild(ancienTitre);

    var reserve = el("div", "pc-vital-res " + cfg.themeClass);
    var head = el("div", "pc-vital-tete");
    head.appendChild(el("span", "pc-vital-nom", cfg.title));
    if (gear) head.appendChild(gear);

    var val = el("span", "pc-vital-val");
    var current = el("input", "pc-vital-num");
    current.type = "number";
    current.step = "1";
    current.setAttribute("aria-label", cfg.accessibleName + " actuels");
    current.addEventListener("input", function () {
      var v = parseFloat(current.value);
      cfg.setCurrent(isFinite(v) ? v : null);
      refresh();
    });
    val.appendChild(current);
    var maximum = el("span", "pc-vital-max", "");
    val.appendChild(maximum);
    head.appendChild(val);
    reserve.appendChild(head);

    var bar = el("span", "pc-vital-jauge");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", cfg.accessibleName);
    bar.setAttribute("aria-valuemin", "0");
    var fill = el("i");
    bar.appendChild(fill);
    reserve.appendChild(bar);

    var commands = el("div", "pc-vital-cmd");
    var delta = el("input", "pc-vital-delta");
    delta.type = "number";
    delta.step = "1";
    delta.placeholder = "±";
    delta.setAttribute("aria-label", cfg.accessibleName + " à ajouter ou retirer");
    delta.title = "Valeur à ajouter ou à retirer";
    function appliquerVariation() {
      var variation = parseFloat(delta.value);
      if (!isFinite(variation) || variation === 0) return;
      cfg.setCurrent(cfg.getCurrent() + variation);
      delta.value = "";
      refresh();
    }
    delta.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); appliquerVariation(); }
    });
    commands.appendChild(delta);
    commands.appendChild(miniBtn("Appliquer", "Appliquer la variation", appliquerVariation));
    commands.appendChild(miniBtn("Max", "Revenir au maximum", function () {
      cfg.setCurrent(null);
      refresh();
    }));
    reserve.appendChild(commands);
    b.appendChild(reserve);

    hooks.push(function () {
      var max = Math.max(0, Math.floor(Number(cfg.getMaximum()) || 0));
      var courant = Number(cfg.getCurrent()) || 0;
      var negatif = courant < 0;
      if (document.activeElement !== current) current.value = String(courant);
      current.style.width = Math.max(3.4, String(current.value).length + 0.3) + "ch";
      maximum.textContent = "/ " + fmtP(max);
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(clamp(courant, 0, max)));
      reserve.classList.toggle("over", negatif);
      fill.classList.toggle("over", negatif);
      fill.style.marginLeft = negatif ? "auto" : "0";
      fill.style.width = clamp(negatif ? 100 : (max > 0 ? courant / max * 100 : 0), 0, 100) + "%";
      if (cfg.updateMaximum) cfg.updateMaximum(maximum);
    });

    if (cfg.appendOptions) cfg.appendOptions(b);
    return b;
  }

  function buildPv() {
    return buildReserve({
      title: "PV", moduleId: "pv", editId: "pv", themeClass: "t-pv",
      accessibleName: "Points de vie", getCurrent: pvCourant, getMaximum: pvMax,
      setCurrent: function (v) { state.pv = v; },
      updateMaximum: function (node) {
        var d = modSum(state.divers.pvMax);
        node.classList.toggle("adj", state.pvMaxOverride !== null || d !== 0);
        node.title = state.pvMaxOverride !== null
          ? "Maximum forcé à " + state.pvMaxOverride + " (calculé : " + pvMaxAuto() + ")"
          : "(20 + Body) / 2 = " + Math.floor((20 + caracTotal("Body")) / 2) +
            (d ? " · modificateurs " + sign(d) : "");
      },
      appendOptions: function (b) {
        // Le maximum de PV garde ses leviers JJK : valeur forcée ou calcul
        // habituel avec les trois emplacements de modificateurs.
        var mrow = el("div", "pc-pvmax pc-mods-host pc-edit-only");
        mrow.appendChild(el("span", "lbl", "Forcé"));
        var force = el("input", "force pc-edit-field");
        force.type = "number"; force.step = "1"; force.min = "0";
        force.title = "Vide = maximum calculé ((20 + Body) / 2, modificateurs compris) ; une valeur le force.";
        force.addEventListener("input", function () {
          var v = parseFloat(force.value);
          state.pvMaxOverride = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : null;
          refresh();
        });
        hooks.push(function () {
          force.placeholder = String(pvMaxAuto());
          if (document.activeElement !== force) force.value = state.pvMaxOverride === null ? "" : state.pvMaxOverride;
        });
        mrow.appendChild(force);
        mrow.appendChild(el("span", "lbl", "Modificateurs"));
        mrow.appendChild(multiMod(state.divers, "pvMax"));
        mrow.appendChild(el("span", "sp"));
        b.appendChild(mrow);
      }
    });
  }

  function buildEm() {
    function emMax() { return Math.max(0, Math.floor(Number(state.emMax) || 0)); }
    function emCourant() { return state.em == null ? emMax() : Number(state.em) || 0; }
    return buildReserve({
      title: "EO", moduleId: "em", themeClass: "t-em",
      accessibleName: "Énergie occulte", getCurrent: emCourant, getMaximum: emMax,
      setCurrent: function (v) { state.em = v; }
    });
  }
  // opts : { module, reg, onDrop } — le module dont le rouage déverrouille la
  // barre de stade, le registre de hooks où la ligne s'inscrit (celui du module
  // qui la reconstruit, sinon ses hooks fuiteraient), et le retrait sur mesure.
  // Par défaut : le module « comps » de l'onglet Fiche.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var mod = opts.module || "comps";
    var reg = opts.reg || compHooks;
    var comp = function () { return state.comps[item.key] || blankComp(); };
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.name);
    label.title = item.name + " (" + item.carac + ")";
    nameBox.appendChild(label);
    if (item.custom) {
      var del = el("button", "pc-comp-del pc-edit-only", "✕");
      del.type = "button";
      del.title = item.langue ? "Retirer cette langue" : "Retirer cette compétence personnalisée";
      del.addEventListener("click", function () {
        // la compétence peut porter des données que la ligne ne montre pas
        // (un art rédigé puis stade redescendu) : confirmer avant d'effacer
        var c = state.comps[item.key];
        var garde = [];
        if (c && c.stade > 0) garde.push("de l'xp investi");
        if (c && c.techniques && c.techniques.length) garde.push("des passifs");
        if (porteArt(c)) garde.push("un art");
        if (state.compsMod[item.key]) garde.push("un modificateur (Options)");
        if (garde.length &&
            !confirm("Supprimer « " + item.name + " » effacera aussi " + garde.join(", ") + ". Continuer ?")) return;
        if (item.langue) {
          state.langues = state.langues.filter(function (n) { return n !== item.name; });
          if (state.langueBase === item.name) state.langueBase = "";
        } else if (item.arme) {
          state.armesComps = state.armesComps.filter(function (n) { return n !== item.name; });
        } else {
          state.customComps = state.customComps.filter(function (cc) { return (cc.carac + "/" + cc.name) !== item.key; });
        }
        delete state.comps[item.key];
        delete state.compsMod[item.key];   // sinon le modificateur renaîtrait sur une homonyme
        refresh();
        if (opts.onDrop) opts.onDrop();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      });
      nameBox.appendChild(del);
    }
    row.appendChild(nameBox);

    // stade : une barre segmentée [ N | I | M | E | A ] au dégradé qui monte
    // jusqu'au rouge des caractéristiques ; centrée, toujours au même endroit.
    // Cliquable seulement en mode édition du module (le coût se règle tout
    // seul) ; verrouillée, elle reste l'affichage du stade. Les passifs et
    // l'art se personnalisent dans l'onglet Art.
    function applyStade(target) {
      var c = comp();
      if (target === c.stade) return;
      var next = { stade: target, techniques: c.techniques.slice() };
      // l'art suit la compétence : il survit aux allers-retours de stade
      // (il ne se montre que quand le stade qui l'ouvre est atteint)
      if (porteArt(c)) next.art = c.art;
      if (!stadeInfo(target).techniques) {
        // les passifs rédigés vivent dans l'onglet Art : la ligne ne les
        // montre pas, on confirme avant de les effacer avec la descente
        var redigees = c.techniques.filter(function (t) {
          return String(t.name || "").trim() || String(t.desc || "").trim();
        }).length;
        if (redigees &&
            !confirm("Redescendre « " + item.name + " » à " + stadeInfo(target).nom +
                     " effacera " + redigees + " passif(s) rédigé(s) (onglet Art). Continuer ?")) return;
        next.techniques = [];
      }
      var delta = compXp(next, item.key) - compXp(c, item.key);
      if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
      // le plafond du quart ne bloque que les HAUSSES : on peut toujours redescendre
      if (delta > 0 && compXp(next, item.key) > compCap()) {
        flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence.");
        return;
      }
      state.comps[item.key] = next;
      if (!next.stade && !next.techniques.length && !next.art) delete state.comps[item.key];
      refresh();
    }
    var st = el("span", "pc-stadebar");
    var segs = [];
    DATA.stades.forEach(function (sd, i) {
      var sg = el("button", "seg s" + i, (sd.nom || "?").charAt(0).toUpperCase());
      sg.type = "button";
      sg.title = sd.nom + " (" + sign(sd.bonus) + ") — " + (DATA.xpParStade * i) + " xp";
      sg.addEventListener("click", function () {
        if (!isEdit(mod)) return;   // construction : mode édition requis
        applyStade(i);
      });
      st.appendChild(sg);
      segs.push(sg);
    });
    row.appendChild(st);

    // le total est un BOUTON de jet, comme la valeur d'une caractéristique.
    // opts.value permet à un module de compter autrement (l'initiative passe par
    // son propre filtre) sans dupliquer la ligne.
    var valeur = opts.value || function (c) { return compValue(item.carac, c, item.key); };
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      // L'initiative, et elle seule, s'inscrit au compteur de tours de Roll20.
      // Le drapeau suit la CLÉ de la compétence, pas le module : la ligne est
      // la même quand le module Initiative est coupé et que Body/Initiative
      // revient dans la liste des compétences.
      doRoll(opts.rollLabel || (item.name + " (" + item.carac + ")"), valeur(comp()),
             null, true, item.carac, item.key === INIT_KEY);
    });
    row.appendChild(total);

    reg.push(function () {
      var c = comp();
      var d = state.compsMod[item.key] || 0;
      // le malus de poids réellement retenu par cette ligne : zéro hors des jets
      // de Body, zéro sur une arme, zéro sous un total forcé
      var m = compPoidsMalus(item.carac, item.key);
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= c.stade);
        // « cur » MARQUE LE STADE COURANT, et n'a effectivement aucune regle de
        // style : c'est un REPERE, pas une decoration. Un audit l'a retiree pour
        // cette raison, et quatre sondes sont tombees — c'est par elle qu'on
        // lit, de l'exterieur, a quel stade une competence se trouve. Une marque
        // sans peinture reste une marque.
        sg.classList.toggle("cur", i === c.stade);
      });
      total.textContent = sign(valeur(c));
      // « zero » dit « rien ne s'ajoute ni ne se retranche à la caractéristique » :
      // le malus compte, sans quoi une compétence grisée comme inerte afficherait
      // un total qui bouge à chaque objet rangé dans le sac
      total.classList.toggle("zero", !c.stade && !d && !m && !opts.value);
      total.classList.toggle("adj", d !== 0 || m !== 0);
      total.title = item.carac + " " + sign(caracTotal(item.carac)) +
                    " · stade " + sign(stadeInfo(c.stade).bonus) +
                    (d ? " · modificateur (Options) " + sign(d) : "") +
                    (m ? " · poids " + sign(-m) : "") +
                    (item.langue && state.langueBase === item.name ? " · langue du personnage (gratuite)" : "") +
                    " — clic : lancer";
    });
    return row;
  }

  var compBox = null;
  var compFilter = "";
  var compChamp = "";           // "" = tous les champs
  var compOnly = COMPACT;       // fiche condensée (Roll20) : investies seulement par défaut
  // décoché : seules les compétences de base du jeu (listes des règles) sont
  // affichées ; coché : les compétences personnalisées s'y ajoutent
  var compPerso = true;
  var compPersoChip = null;     // la puce, rallumée quand on ajoute une comp perso
  // mêmes filtres pour les modules Armes et Langues (réglages de VUE : ils
  // survivent au remontage de la fiche, comme ceux des compétences)
  var armesPerso = true;
  var armesOnly = COMPACT;
  var armesFilter = "";
  var languesPerso = true;
  var languesOnly = false;
  var languesFilter = "";
  // Les deux outils de filtre se coupent depuis l'onglet Options. Coupés, ils
  // DISPARAISSENT et cessent d'agir : un filtre invisible qui masque encore
  // des lignes est un piège. Réglage d'AFFICHAGE, donc dans le vrai
  // localStorage du navigateur, jamais dans le personnage.
  var FILTRES = { texte: "jjk-filtre-texte", champ: "jjk-filtre-champ" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function filtreChampOn() { return lpref(FILTRES.champ, "1") !== "0"; }
  // champ de filtre d'un module ; rend null quand le réglage le coupe, et le
  // texte est alors ignoré par les listes (voir filtreDe)
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? String(v || "").trim().toLowerCase() : ""; }
  function compInvestie(it) {
    var c = state.comps[it.key];
    // l'art compte : une compétence redescendue qui garde son art reste
    // visible ; un modificateur (Options) non nul aussi (sinon « Investies
    // seulement » cache une valeur pourtant modifiée)
    return !!(c && (c.stade > 0 || (c.techniques && c.techniques.length) || porteArt(c))) ||
           (state.compsMod[it.key] || 0) !== 0 ||
           (state.compsMod2[it.key] || 0) !== 0 ||
           // un total ou un coût forcé compte aussi : sinon « Investies »
           // cacherait la compétence qu'on vient justement de régler
           state.compsForce[it.key] !== undefined ||
           state.compsXpForce[it.key] !== undefined ||
           (state.compsXpMod[it.key] || 0) !== 0 ||
           (state.compsXpMod2[it.key] || 0) !== 0;
  }
  // l'ordre des champs, partout sur la Fiche : Body, puis Mind, puis Prestance
  var CHAMPS = ["Body", "Mind", "Prestance"];
  function rebuildComps() {
    if (!compBox) return;
    compHooks = [];   // les lignes vont être détruites : leurs hooks avec
    compBox.innerHTML = "";
    var flt = filtreDe(compFilter);
    CHAMPS.forEach(function (carac) {
      if (filtreChampOn() && compChamp && compChamp !== carac) return;
      // l'Initiative, les langues et les armes ont leur propre module sur
      // cette page : les répéter ici ferait deux commandes pour un même stade.
      // Mais un module COUPÉ rend ses compétences à cette liste : sans quoi
      // couper « Langues » rendrait les langues du personnage inatteignables.
      // Aucun calcul ne change, seulement l'endroit où la ligne se lit.
      var items = allComps().filter(function (it) {
        if (it.carac !== carac) return false;
        if (it.key === INIT_KEY) return !actif("initiative");
        if (it.langue) return !actif("langues");
        if (it.arme) return !actif("armescomp");
        return true;
      });
      if (!compPerso) items = items.filter(function (it) { return !it.custom; });
      if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
      if (compOnly) items = items.filter(compInvestie);
      // ordre alphabétique (français, accents ignorés), comps perso intercalées
      items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
      compBox.appendChild(el("div", "pc-comp-champ", carac));
      if (!items.length) {
        compBox.appendChild(el("div", "pc-empty",
          flt ? "Aucune compétence ne correspond."
              : compOnly ? "Aucune compétence investie." : "—"));
      } else {
        var head = el("div", "pc-comp-row head");
        head.appendChild(el("span", null, "Compétence"));
        head.appendChild(el("span", null, "Stade"));
        head.appendChild(el("span", null, "Total"));
        compBox.appendChild(head);
        items.forEach(function (it, i) { compBox.appendChild(compRow(it, i % 2 === 1)); });
      }
      // ajout d'une compétence personnalisée (les listes des règles sont
      // ouvertes : « … ») — seulement en mode édition du module
      if (!isEdit("comps")) return;
      var addRow = el("div", "pc-comp-add");
      var inp = el("input");
      inp.type = "text"; inp.placeholder = "Nouvelle compétence " + carac + "…";
      addRow.appendChild(inp);
      addRow.appendChild(miniBtn("+", "Ajouter", function () {
        var name = capFirst(inp.value.trim());
        if (!name) return;
        var exists = allComps().some(function (it) { return it.carac === carac && it.name.toLowerCase() === name.toLowerCase(); });
        if (exists) { flash("Cette compétence existe déjà."); return; }
        state.customComps.push({ name: name, carac: carac });
        // ne jamais ajouter une compétence qui resterait invisible
        if (!compPerso) {
          compPerso = true;
          if (compPersoChip) compPersoChip.classList.add("on");
        }
        inp.value = "";
        refresh();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();   // la nouvelle comp gagne sa ligne dans Options
      }));
      compBox.appendChild(addRow);
    });
    refresh();
  }
  function buildComps() {
    // jeu : filtres (outils de vue) et totaux-jets ; édition : stades, ajout
    // et retrait de compétences perso. Le rouage rebâtit la liste : les
    // rangées d'ajout n'existent qu'en édition.
    var b = block("Compétences", null, "comps", function () { rebuildComps(); });
    // outils sur deux lignes : filtre texte + filtre de champ côte à côte,
    // puis les deux puces de filtre en dessous
    var tools = el("div", "pc-comp-tools");
    var line1 = el("div", "row");
    var search = champFiltre(function () { return compFilter; },
                             function (v) { compFilter = v; }, null, rebuildComps);
    if (search) line1.appendChild(search);
    if (filtreChampOn()) {
      var champSel = el("select", "pc-select pc-edit-field");
      ["Tous les champs", "Body", "Mind", "Prestance"].forEach(function (ch) {
        var o = el("option");
        o.value = ch === "Tous les champs" ? "" : ch;
        o.textContent = ch;
        champSel.appendChild(o);
      });
      champSel.value = compChamp;
      champSel.addEventListener("change", function () { compChamp = champSel.value; rebuildComps(); });
      line1.appendChild(champSel);
    }
    if (line1.children.length) tools.appendChild(line1);
    var line2 = el("div", "row");
    var persoChip = el("span", "pc-chip");
    persoChip.textContent = "Personnalisées";
    persoChip.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    persoChip.classList.toggle("on", compPerso);
    persoChip.addEventListener("click", function () {
      compPerso = !compPerso;
      persoChip.classList.toggle("on", compPerso);
      rebuildComps();
    });
    compPersoChip = persoChip;
    line2.appendChild(persoChip);
    var onlyChip = el("span", "pc-chip");
    onlyChip.textContent = "Investies";
    onlyChip.title = "N'afficher que les compétences où un stade, un passif ou un modificateur est posé.";
    onlyChip.classList.toggle("on", compOnly);
    onlyChip.addEventListener("click", function () {
      compOnly = !compOnly;
      onlyChip.classList.toggle("on", compOnly);
      rebuildComps();
    });
    line2.appendChild(onlyChip);
    tools.appendChild(line2);
    b.appendChild(tools);
    compBox = el("div");
    b.appendChild(compBox);
    rebuildComps();
    return b;
  }

  // ---------- onglet Art ----------
  // La personnalisation d'une compétence vit ICI : au stade qui ouvre les
  // passifs et l'art (« Artiste » sous les règles actuelles), sa carte porte les
  // fiches de passifs, le nom et la description de l'art. Aucun
  // contenu de règles : seulement les données du personnage. La liste se
  // reconstruit seulement quand les compétences éligibles (ou leur stade)
  // changent, pas à chaque frappe.
  // porteArt : la compétence a un art non vide (même si le stade est redescendu)
  function porteArt(c) {
    return !!(c && c.art && (String(c.art.name || "").trim() || String(c.art.desc || "").trim()));
  }
  function artComps() {
    // même ordre que la Fiche : Body, puis Mind, puis Prestance, puis alphabétique
    var rang = {};
    CHAMPS.forEach(function (ch, i) { rang[ch] = i; });
    return allComps().filter(function (it) {
      var c = state.comps[it.key];
      // les passifs rédigés et l'art restent VISIBLES même si le stade ne les
      // ouvre plus (stade redescendu, ou stade d'ouverture déplacé) : les
      // données du joueur ne disparaissent jamais en silence
      return !!(c && (stadeInfo(c.stade).techniques || stadeInfo(c.stade).art ||
                      (c.techniques && c.techniques.length) || porteArt(c)));
    }).sort(function (a, b) {
      return (rang[a.carac] || 0) - (rang[b.carac] || 0)
        || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }
  function artStadeNom() {
    // premier stade qui ouvre quelque chose (techniques ou art)
    for (var i = 0; i < DATA.stades.length; i++)
      if (DATA.stades[i].techniques || DATA.stades[i].art) return DATA.stades[i].nom;
    return null;
  }
  function buildArt() {
    // jeu : lire les arts et passifs, les envoyer au tchat ; édition :
    // rédiger, ajouter, retirer
    var b = block("Arts et passifs", null, "arts");
    var box = el("div", "pc-arts");
    b.appendChild(box);

    function artCard(it) {
      var c = state.comps[it.key];
      var card = el("div", "pc-av pc-art");

      var top = el("div", "pc-art-top");
      var chip = el("span", "pc-abbr", ABBR[it.carac] || it.carac);
      chip.title = it.carac;
      top.appendChild(chip);
      top.appendChild(el("span", "pc-art-comp", it.name));
      top.appendChild(el("span", "pc-art-stade", stadeInfo(c.stade).nom));
      card.appendChild(top);

      // l'art, au stade qui l'ouvre — et un art DÉJÀ rédigé reste visible et
      // éditable même si le stade ne l'ouvre plus (même échappatoire que les
      // passifs : les données du joueur ne disparaissent jamais en silence).
      // Il n'entre dans l'état qu'à la première frappe : un art resté vierge
      // ne doit pas générer d'écriture (Attributes Roll20) à la simple
      // ouverture de la fiche.
      if (stadeInfo(c.stade).art || porteArt(c)) {
        var a = c.art || { name: "", desc: "" };
        var keep = function () { c.art = a; };
        var head = el("div", "pc-av-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text"; nm.placeholder = "Nom du passif"; nm.value = a.name || "";
        nm.addEventListener("input", function () { a.name = nm.value; keep(); save(); });
        head.appendChild(nm);

        // coût de l'art, à droite de son nom : rien par défaut (il vient avec
        // son stade), une valeur le force
        var aCout = el("span", "pc-tech-cout pc-edit-only");
        var aIn = el("input");
        aIn.type = "number"; aIn.min = "0"; aIn.step = "5";
        aIn.placeholder = "0";
        aIn.value = (a.cout === null || a.cout === undefined) ? "" : a.cout;
        aIn.addEventListener("input", function () {
          var v = parseFloat(aIn.value);
          if (isFinite(v)) a.cout = clamp(Math.floor(v), 0, 9999);
          else delete a.cout;
          keep();
          refresh();
        });
        aCout.title = "Coût de l'art — vide = 0 xp (il vient avec son stade) ; une valeur le force.";
        aCout.appendChild(aIn);
        aCout.appendChild(el("span", "u", "xp"));
        head.appendChild(aCout);
        // la compétence tient dans le titre : la carte n'a plus de colonne de
        // libellé, sa description occupe toute la largeur
        head.appendChild(chatBtn(
          function () { return "Passif — " + (a.name || it.name) + " (" + it.name + ")"; },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Effacer cet art", function () {
          // un texte rédigé ne part pas sur un simple clic (le ✕ jouxte Chat)
          if ((String(a.name || "").trim() || String(a.desc || "").trim()) &&
              !confirm("Effacer l'art « " + (a.name || it.name) + " » et sa description ?")) return;
          delete c.art;
          refresh();
          render();
        }, "danger pc-edit-only"));
        card.appendChild(head);

        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 5;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; keep(); save(); });
        card.appendChild(d);
      }

      // les passifs, dès le stade qui les ouvre
      var techBox = el("div", "pc-techniques");
      card.appendChild(techBox);
      function renderTechs() {
        var cc = state.comps[it.key];
        techBox.innerHTML = "";
        // même échappatoire que compXp et artComps : des passifs EXISTANTS
        // restent lisibles, éditables et supprimables même si le stade courant
        // ne les ouvre plus (fiche migrée : leur stade d'ouverture a bougé)
        if (!cc || (!stadeInfo(cc.stade).techniques && !(cc.techniques && cc.techniques.length))) return;
        cc.techniques.forEach(function (t, i) {
          var tCard = el("div", "pc-av pc-technique");
          var tHead = el("div", "pc-av-head");
          var tNm = el("input", "nm pc-edit-field");
          tNm.type = "text"; tNm.placeholder = "Nom du passif"; tNm.value = t.name || "";
          tNm.addEventListener("input", function () { t.name = tNm.value; state.comps[it.key] = cc; save(); });
          tHead.appendChild(tNm);

          // coût du passif, à droite du nom : vide = tarif de base, une valeur
          // le force (décision du MJ, passif hors barème)
          var tCout = el("span", "pc-tech-cout pc-edit-only");
          var cIn = el("input");
          cIn.type = "number"; cIn.min = "0"; cIn.step = "5";
          cIn.value = (t.cout === null || t.cout === undefined) ? "" : t.cout;
          cIn.addEventListener("input", function () {
            var v = parseFloat(cIn.value);
            if (isFinite(v)) t.cout = clamp(Math.floor(v), 0, 9999);
            else delete t.cout;
            state.comps[it.key] = cc;
            refresh();
          });
          tCout.appendChild(cIn);
          tCout.appendChild(el("span", "u", "xp"));
          // état posé ICI (renderTechs se rejoue à chaque ajout, retrait ou
          // changement de stade) : un hook global fuirait, cette fonction
          // n'étant pas vidée par mount()
          cIn.placeholder = String(DATA.xpParStade);
          tCout.title = "Coût de ce passif — vide = " + DATA.xpParStade +
                        " xp (tarif de base) ; une valeur le force.";
          tHead.appendChild(tCout);
          tHead.appendChild(chatBtn(
            function () { return "Passif — " + (t.name || it.name) + " (" + it.name + ")"; },
            function () { return [["", t.desc]]; }));
          tHead.appendChild(miniBtn("✕", "Retirer ce passif", function () {
            if ((String(t.name || "").trim() || String(t.desc || "").trim()) &&
                !confirm("Retirer le passif « " + (t.name || "sans nom") + " » ?")) return;
            cc.techniques.splice(i, 1); state.comps[it.key] = cc; refresh(); renderTechs();
          }, "danger pc-edit-only"));
          tCard.appendChild(tHead);
          var tD = el("textarea", "pc-notes pc-edit-field");
          tD.rows = 3;
          tD.placeholder = "Effet";
          tD.value = t.desc || "";
          tD.addEventListener("input", function () { t.desc = tD.value; state.comps[it.key] = cc; save(); });
          tCard.appendChild(tD);
          techBox.appendChild(tCard);
        });
        // en acheter de NOUVEAUX reste réservé au stade qui les ouvre
        if (!stadeInfo(cc.stade).techniques) { applyEdit(b, "arts"); return; }
        // le coût annoncé est celui d'un passif neuf : le tarif de base
        // (l'art de la compétence est repris dans la comparaison, sinon son
        // coût forcé fausserait la différence)
        function avecPassifNeuf() {
          return { stade: cc.stade, art: cc.art, techniques: cc.techniques.concat([{ name: "", desc: "" }]) };
        }
        var prochaine = compXp(avecPassifNeuf()) - compXp(cc);
        techBox.appendChild(miniBtn("+ passif (" + prochaine + " xp)", null, function () {
          var test = avecPassifNeuf();
          var delta = compXp(test) - compXp(cc);
          if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
          if (delta > 0 && compXp(test) > compCap()) { flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence."); return; }
          cc.techniques.push({ name: "", desc: "" }); state.comps[it.key] = cc; refresh(); renderTechs();
        }, "pc-edit-only"));
        applyEdit(b, "arts");
      }
      renderTechs();
      return card;
    }

    function render() {
      box.innerHTML = "";
      var items = artComps();
      if (!items.length) {
        var nom = artStadeNom();
        box.appendChild(el("div", "pc-empty",
          nom ? "Aucune compétence n'a atteint le stade " + nom + "." : "Aucun stade n'ouvre de passif ou d'art."));
        return;
      }
      items.forEach(function (it) { box.appendChild(artCard(it)); });
      applyEdit(b, "arts");
    }

    // reconstruire seulement quand les compétences éligibles ou leur stade
    // changent : les frappes (save sans refresh) ne détruisent pas le focus
    var lastSig = null;
    hooks.push(function () {
      var sig = artComps().map(function (it) {
        var c = state.comps[it.key];
        return it.key + ":" + (c ? c.stade : 0);
      }).join("|");
      if (sig !== lastSig) { lastSig = sig; render(); }
    });
    return b;
  }

  // ---------- onglet Énergie ----------
  // Les coûts des techniques sont indépendants de l'XP : ils alimentent le
  // budget EO de l'en-tête, distinct du courant de la réserve EO sur la fiche.
  function buildEnergie() {
    var b = block("Techniques occultes", null, "energie");
    var box = el("div", "pc-arts pc-energie");
    b.appendChild(box);

    function render() {
      box.innerHTML = "";
      if (!Array.isArray(state.energie)) state.energie = [];

      if (!state.energie.length)
        box.appendChild(el("div", "pc-empty", "Aucune catégorie d'énergie occulte."));

      state.energie.forEach(function (categorie, ci) {
        var card = el("div", "pc-av pc-art pc-energie-categorie");
        var head = el("div", "pc-av-head");
        var nom = el("input", "nm pc-edit-field");
        nom.type = "text";
        nom.placeholder = "Nom de la catégorie";
        nom.value = categorie.name || "";
        nom.addEventListener("input", function () {
          categorie.name = nom.value;
          save();
        });
        head.appendChild(nom);
        head.appendChild(miniBtn("✕", "Supprimer cette catégorie", function () {
          var contient = !!String(categorie.name || "").trim() ||
            (categorie.techniques || []).some(function (t) {
              return String(t.name || "").trim() || String(t.desc || "").trim();
            });
          if (contient && !confirm("Supprimer la catégorie « " +
              (categorie.name || "sans nom") + " » et toutes ses techniques ?")) return;
          state.energie.splice(ci, 1);
          save();
          render();
          refresh();
        }, "danger pc-edit-only"));
        card.appendChild(head);

        var liste = el("div", "pc-techniques");
        (categorie.techniques || []).forEach(function (technique, ti) {
          var tCard = el("div", "pc-av pc-technique pc-energie-technique");
          var tHead = el("div", "pc-av-head");
          var tNom = el("input", "nm pc-edit-field");
          tNom.type = "text";
          tNom.placeholder = "Nom de la technique";
          tNom.value = technique.name || "";
          tNom.addEventListener("input", function () {
            technique.name = tNom.value;
            save();
          });
          tHead.appendChild(tNom);

          var cout = el("span", "pc-tech-cout");
          var coutIn = el("input", "pc-edit-field");
          coutIn.type = "number";
          coutIn.min = "0";
          coutIn.max = "9999";
          coutIn.step = "1";
          coutIn.setAttribute("aria-label", "Coût en énergie occulte");
          coutIn.title = "Coût de cette technique en énergie occulte";
          coutIn.value = String(technique.cout == null ? 0 : technique.cout);
          coutIn.addEventListener("input", function () {
            var v = parseFloat(coutIn.value);
            technique.cout = isFinite(v) ? clamp(Math.floor(v), 0, 9999) : 0;
            save();
            refresh();
          });
          cout.appendChild(coutIn);
          cout.appendChild(el("span", "u", "EO"));
          tHead.appendChild(cout);
          tHead.appendChild(miniBtn("✕", "Retirer cette technique", function () {
            if ((String(technique.name || "").trim() || String(technique.desc || "").trim()) &&
                !confirm("Retirer la technique « " + (technique.name || "sans nom") + " » ?")) return;
            categorie.techniques.splice(ti, 1);
            save();
            render();
            refresh();
          }, "danger pc-edit-only"));
          tCard.appendChild(tHead);

          var description = el("textarea", "pc-notes pc-edit-field");
          description.rows = 3;
          description.placeholder = "Description / effet";
          description.value = technique.desc || "";
          description.addEventListener("input", function () {
            technique.desc = description.value;
            save();
          });
          tCard.appendChild(description);
          liste.appendChild(tCard);
        });
        card.appendChild(liste);
        card.appendChild(miniBtn("+ technique", "Ajouter une technique à cette catégorie", function () {
          if (!Array.isArray(categorie.techniques)) categorie.techniques = [];
          categorie.techniques.push({ name: "", cout: 0, desc: "" });
          save();
          render();
          refresh();
        }, "pc-edit-only"));
        box.appendChild(card);
      });

      box.appendChild(miniBtn("+ catégorie", "Créer une catégorie d'énergie occulte", function () {
        state.energie.push({ name: "", techniques: [] });
        save();
        render();
        refresh();
      }, "pc-edit-only"));
      applyEdit(b, "energie");
    }

    render();
    return b;
  }

  // ---------- onglet Équipement ----------
  function eqField(labelTxt, obj, key, wide) {
    var i = el("input", "pc-edit-field");
    i.type = "text";
    i.placeholder = labelTxt;
    i.value = obj[key] || "";
    i.addEventListener("input", function () { obj[key] = i.value; save(); });
    return fld(labelTxt, i, wide ? "w" : null);
  }
  function eqArea(labelTxt, obj, key, rows) {
    var t = el("textarea", "pc-notes pc-edit-field");
    t.rows = rows || 3;
    t.value = obj[key] || "";
    t.addEventListener("input", function () { obj[key] = t.value; save(); });
    return fld(labelTxt, t, "w");
  }
  // Le champ accepte TOUTE expression Roll20, pas seulement « 5D8 » : dés,
  // références d'attribut @{Perso|jjk_body}, requêtes ?{…}, arithmétique.
  // L'expression part telle quelle dans le jet en ligne. Elle n'est PAS
  // réécrite : l'ancienne extraction n'en gardait que les premiers dés et
  // jetait le reste en silence (« 5d6+@{Zhalian|jjk_body}/10 » devenait
  // « 5d6 »).
  function diceOf(txt) {
    return String(txt == null ? "" : txt).replace(/\s+/g, " ").trim() || null;
  }
  function eqCards(box, items, kind, blk, mid) {
    // kind : "arme" (poids/dégâts/reach/propriétés) ou "armure" (poids/invu/zones)
    // blk / mid : le bloc hôte et son id de module d'édition (jeu : Jet et
    // Chat ; édition : fiches, ajout, retrait)
    function render() {
      box.innerHTML = "";
      items.forEach(function (it, idx) {
        var card = el("div", "pc-arme");
        var head = el("div", "pc-arme-head");
        var nm = el("input", "nm pc-edit-field");
        nm.type = "text";
        nm.placeholder = kind === "arme" ? "Nom de l'arme" : "Nom de l'armure";
        nm.value = it.nom || "";
        nm.addEventListener("input", function () { it.nom = nm.value; save(); });
        head.appendChild(nm);
        head.appendChild(chatBtn(
          function () { return (kind === "arme" ? "Arme — " : "Armure — ") + (it.nom || (kind === "arme" ? "arme" : "armure")); },
          function () {
            // valeurs courtes étiquetées, propriétés (texte long) pleine largeur
            return kind === "arme"
              ? [["Poids", it.poids], ["Dégâts", it.degats], ["Reach", it.reach], ["", it.props]]
              : [["Poids", it.poids], ["Invu", it.invu], ["Zones protégées", it.zones]];
          }));
        head.appendChild(miniBtn("✕", "Retirer", function () { items.splice(idx, 1); render(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);

        var line = el("div", "pc-arme-line");
        line.appendChild(eqField("Poids", it, "poids"));
        if (kind === "arme") {
          line.appendChild(eqField("Dégâts", it, "degats"));
          line.appendChild(eqField("Reach", it, "reach"));
        } else {
          line.appendChild(eqField("Invu", it, "invu"));
        }
        var chip = el("span", "pc-roll-chip", "Jet");
        chip.title = kind === "arme" ? "Lancer les dégâts" : "Lancer l'invu";
        chip.addEventListener("click", function () {
          var d = diceOf(kind === "arme" ? it.degats : it.invu);
          if (!d) { flash("Renseigner d'abord " + (kind === "arme" ? "les dégâts" : "l'invu") +
                          " (ex. 5D8, ou toute expression Roll20)."); return; }
          doRoll((kind === "arme" ? "Dégâts — " : "Invu — ") + (it.nom || (kind === "arme" ? "arme" : "armure")), 0, d, false);
        });
        line.appendChild(chip);
        card.appendChild(line);

        var line2 = el("div", "pc-arme-line");
        if (kind === "arme") line2.appendChild(eqArea("Avantages / désavantages", it, "props", 3));
        else line2.appendChild(eqArea("Zones protégées", it, "zones", 2));
        card.appendChild(line2);

        box.appendChild(card);
      });
      if (!items.length) box.appendChild(el("div", "pc-empty", kind === "arme" ? "Aucune arme." : "Aucune armure."));
      var add = miniBtn(kind === "arme" ? "+ Ajouter une arme" : "+ Ajouter une armure", null, function () {
        items.push({});
        render();
        refresh();
      }, "pc-edit-only");
      box.appendChild(add);
      if (blk) applyEdit(blk, mid);
    }
    render();
  }
  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage encodé en base64. L'extension Roll20 intercepte
  // le clic sur ce lien (la fiche, dans son iframe, ne voit pas le tchat) et
  // renvoie le payload à la fiche du preneur, qui affiche son dialogue de
  // réception. L'encodage vit ICI, côté site : son format peut donc évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/jjk_take";
  var IMG_MAX = 4000;   // une vignette plus lourde ne tient pas dans un message
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
  // objet -> payload compact (clés courtes : le message de tchat est borné)
  function packObjet(it, qte) {
    var p = {
      n: String(it.nom || ""), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      d: String(it.desc || ""), k: String(it.id || ""),
      a: pnum(it.achat), v: pnum(it.vente)
    };
    var img = String(it.img || "");
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    return b64encode(JSON.stringify(p));
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    return {
      nom: String(o.n || "Objet"), qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: pnum(o.a), vente: pnum(o.v)
    };
  }

  // ---------- boîte de dialogue (jamais prompt/confirm pour un formulaire) ----------
  // Dans Roll20 la fiche est une iframe d'une autre origine : les fenêtres
  // natives y sont muettes sous Chrome. Tout formulaire passe donc par cette
  // couche, posée dans le document de la fiche.
  function dialogue(titre, corps, valider, libelleValider) {
    var over = el("div", "pc-modal-over");
    var box = el("div", "pc-modal");
    box.appendChild(el("div", "pc-modal-title", titre));
    box.appendChild(corps);
    var pied = el("div", "pc-modal-actions");
    function fermer() { if (over.parentNode) over.parentNode.removeChild(over); }
    pied.appendChild(miniBtn("Annuler", null, fermer));
    var ok = miniBtn(libelleValider || "Valider", null, function () {
      if (valider() !== false) fermer();
    }, "primary");
    pied.appendChild(ok);
    box.appendChild(pied);
    over.appendChild(box);
    over.addEventListener("mousedown", function (e) { if (e.target === over) fermer(); });
    // DANS .perso-atelier : c'est lui qui porte les jetons de couleur (jour et
    // nuit) ; accroché plus haut, le dialogue perdrait tout son habillage
    (appEl || rootEl || document.body).appendChild(over);
    setTimeout(function () {
      var f = box.querySelector("input, textarea, select");
      if (f) { f.focus(); if (f.select) f.select(); }
    }, 0);
    return { fermer: fermer };
  }
  // confirm() est MUET dans l'iframe Roll20 (autre origine) : il renvoie false
  // sans rien afficher, donc le retrait y était annulé en silence dès que
  // l'objet portait un nom. Toute confirmation passe par la modale de la fiche.
  function confirmer(titre, texte, libelle, fn) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note", texte));
    dialogue(titre, corps, fn, libelle);
  }

  // Donner : combien, puis la carte part au tchat et la pile diminue d'autant.
  function donnerDialogue(it, qteDefaut) {
    var corps = el("div", "pc-modal-body");
    corps.appendChild(el("div", "pc-modal-note",
      "L'objet quitte l'inventaire et part dans le tchat : le premier joueur qui clique « Prendre » le reçoit."));
    var qIn = el("input", "n");
    qIn.type = "number"; qIn.min = "0"; qIn.max = String(it.qte); qIn.step = "any";
    qIn.value = fmtP(Math.min(pnum(qteDefaut) || it.qte, it.qte));
    corps.appendChild(fld("Quantité à donner (sur " + fmtP(it.qte) + ")", qIn));
    dialogue("Donner « " + (it.nom || "objet") + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || it.qte, it.qte);
      if (!it.qte || !q) { flash("Cet objet n'est plus en stock."); return; }
      // le nom passe par envSan comme partout ailleurs : sans lui, un nom qui
      // porte une accolade ou un saut de ligne (objet importé, objet reçu d'un
      // autre joueur) compose une commande que l'extension refuse — et l'objet
      // serait quand même retiré de l'inventaire, donc perdu.
      var cmd = "&{template:default} {{name=Objet donné — " + (envSan(it.nom) || "objet") + "}}" +
                (q > 1 ? " {{Quantité=" + fmtP(q) + "}}" : "") +
                (it.desc ? " {{=" + String(it.desc).replace(/[{}]/g, "").replace(/\s+/g, " ").trim() + "}}" : "") +
                " {{Prendre=[Prendre](" + TAKE_CMD + " " + packObjet(it, q) + ")}}";
      if (typeof window.__jjkChat === "function") envoyer(cmd);
      else flash("Hors de Roll20 : rien n'est envoyé au tchat (l'objet reste dans l'inventaire).");
      if (typeof window.__jjkChat === "function") {
        it.qte = Math.max(0, Math.round((it.qte - q) * 100) / 100);
        if (!it.qte) {
          var i = state.inv.objets.indexOf(it);
          if (i >= 0) state.inv.objets.splice(i, 1);
        }
        refresh();
        if (invRender) invRender();
      }
    }, "Donner");
  }

  // Prendre : l'objet arrive du tchat (relayé par l'extension). S'il existe
  // déjà, on empile les quantités et on tranche champ par champ ce qui diffère.
  var invRender = null;   // posé par invObjets : re-rendu de l'inventaire
  function recevoirObjet(payload) {
    var recu = unpackObjet(payload);
    if (!recu) { flash("Objet illisible (message abîmé)."); return; }
    var G = state.inv.groupes, items = state.inv.objets;
    // reconnaissance : d'abord l'identifiant (deux objets homonymes mais
    // distincts ne fusionnent pas), à défaut le nom
    var jumeau = null;
    if (recu.id) {
      items.forEach(function (x) { if (!jumeau && x.id && x.id === recu.id) jumeau = x; });
    }
    if (!jumeau) {
      items.forEach(function (x) {
        if (!jumeau && !x.id && !recu.id &&
            String(x.nom).trim().toLowerCase() === recu.nom.trim().toLowerCase()) jumeau = x;
      });
    }

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
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        gSel.appendChild(o);
      });
      corps.appendChild(fld("Ranger dans", gSel));
    }

    // conflits : pour chaque champ qui diffère, garder le sien ou prendre le neuf
    var choix = {};
    if (jumeau) {
      corps.appendChild(el("div", "pc-modal-note",
        "« " + jumeau.nom + " » est déjà dans l'inventaire (" + fmtP(jumeau.qte) + ")" +
        (recu.id ? " — même identifiant" : "") + " : les quantités s'additionnent."));
      [["nom", "Nom"], ["img", "Image"], ["poids", "Poids"],
       ["desc", "Description"], ["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var mien = String(jumeau[c[0]] || ""), neuf = String(recu[c[0]] || "");
        if (mien === neuf || (!mien && !neuf)) return;
        choix[c[0]] = "mien";
        var bloc = el("div", "pc-modal-conflit");
        bloc.appendChild(el("div", "lbl", c[1] + " : deux versions"));
        var row = el("div", "row");
        [["mien", "Garder le mien", mien], ["neuf", "Prendre le nouveau", neuf]].forEach(function (opt) {
          var b = el("button", "pc-modal-choix" + (opt[0] === "mien" ? " on" : ""));
          b.type = "button";
          b.appendChild(el("div", "tag", opt[1]));
          if (c[0] === "img" && opt[2]) {
            var mi = el("img"); mi.alt = ""; mi.src = opt[2];
            b.appendChild(mi);
          } else {
            b.appendChild(el("div", "val", opt[2] ? (c[0] === "poids" ? fmtP(pnum(opt[2])) : opt[2]) : "— vide —"));
          }
          b.addEventListener("click", function () {
            choix[c[0]] = opt[0];
            Array.prototype.forEach.call(row.children, function (x) { x.classList.remove("on"); });
            b.classList.add("on");
          });
          row.appendChild(b);
        });
        bloc.appendChild(row);
        corps.appendChild(bloc);
      });
    }

    dialogue("Prendre « " + recu.nom + " »", corps, function () {
      var q = Math.min(pnum(qIn.value) || recu.qte, recu.qte);
      if (jumeau) {
        jumeau.qte = Math.round((jumeau.qte + q) * 100) / 100;
        ["nom", "img", "poids", "desc", "achat", "vente"].forEach(function (k) {
          if (choix[k] === "neuf") jumeau[k] = recu[k];
        });
        if (!jumeau.id && recu.id) jumeau.id = recu.id;
      } else {
        items.push({
          nom: recu.nom, qte: q, poids: recu.poids, img: recu.img, desc: recu.desc,
          id: recu.id, achat: recu.achat, vente: recu.vente,
          groupe: gSel ? clamp(num(gSel.value, 0), 0, G.length - 1) : 0
        });
      }
      refresh();
      if (invRender) invRender();
      flash(fmtP(q) + " × « " + recu.nom + " » ajouté à l'inventaire.");
    }, "Prendre");
  }

  // ---------- inventaire : objets illustrés (tuiles par groupes + panneau) ----------
  // Des TUILES carrées rangées par groupes (Sur soi, Sacoche…), et le détail de
  // l'objet choisi dans la colonne de droite : image, quantité, poids, groupe,
  // description, envoi au tchat. On glisse une tuile d'un groupe à l'autre.
  //
  // Un registre en lignes a été essayé à la place, puis RETIRÉ : les tuiles
  // valent mieux ici, un inventaire se reconnaît à ses images. Si l'idée
  // revient, qu'elle revienne comme un choix d'affichage, pas comme un
  // remplacement.
  //
  // Le bandeau d'un groupe porte à droite son POIDS et sa case « Compté » :
  // décochée, le groupe est posé au sol, son poids sort du poids porté (donc du
  // malus de Body), mais ses objets restent entiers, consultables, déplaçables
  // et donnables. Le drapeau vit dans state.inv.comptes, parallèle aux groupes.
  //
  // Les images importées d'un fichier sont réduites en vignette pour tenir dans
  // la fiche (et dans les Attributes Roll20) ; préférer une URL quand c'est
  // possible.
  function invObjets(container, renderRef) {
    var G = state.inv.groupes;
    var items = state.inv.objets;
    var O = state.inv.opts;
    var sel = null;          // index dans items de l'objet affiché au panneau
    var dragIdx = null;
    var editGi = null;       // groupe à ouvrir en édition de nom au prochain render
    var tileRefs = {};       // idx -> { nom, badge, poids } pour maj sans re-render
    // Les poids des bandeaux se rafraîchissent SANS re-render : saisir un poids
    // dans le panneau recréerait sinon la tuile en cours d'édition, et le champ
    // frappé perdrait le focus au premier caractère.
    var grpPoids = [];

    // réglages d'affichage du module, en mode édition seulement
    var optRow = el("div", "pc-obj-opts pc-edit-only");
    var colIn = el("input", "n");
    colIn.type = "number"; colIn.min = "1"; colIn.max = "8"; colIn.step = "1";
    colIn.value = O.cols;
    colIn.title = "Objets par ligne";
    colIn.addEventListener("input", function () {
      O.cols = clamp(num(colIn.value, 4), 1, 8);
      render();
      refresh();
    });
    optRow.appendChild(fld("Par ligne", colIn));
    [["nom", "Nom"], ["qte", "Quantité"], ["poids", "Poids"], ["total", "Total"]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = "Afficher « " + o[1] + " » sur les tuiles" + (o[0] === "total" ? " (total en bas du module)" : "");
      chip.classList.toggle("on", !!O[o[0]]);
      chip.addEventListener("click", function () {
        O[o[0]] = !O[o[0]];
        chip.classList.toggle("on", !!O[o[0]]);
        render();
        refresh();
      });
      optRow.appendChild(chip);
    });
    container.appendChild(optRow);

    var wrap = el("div", "pc-obj-wrap");
    var leftBox = el("div", "pc-obj-left");
    var panel = el("div", "pc-obj-panel");
    wrap.appendChild(leftBox);
    wrap.appendChild(panel);
    var tot = el("div", "pc-inv-total");

    // le poids de JJK n'a pas d'unité : c'est une valeur nue
    //
    // Le pied distingue ce que le personnage PORTE de ce qu'il a POSÉ : un
    // total unique laisserait croire qu'un sac décoché pèse encore, ou qu'il a
    // disparu. Les bandeaux se rafraîchissent ici aussi, pour qu'une saisie de
    // poids dans le panneau les mette à jour sans recréer les tuiles.
    function updateTotal() {
      tot.style.display = O.total ? "" : "none";
      grpPoids.forEach(function (f) { f(); });
      var porte = poidsObjets(true), pose = poidsObjets(false);
      tot.textContent = "Objets portés : " + fmtP(porte) +
        (pose ? " · posés : " + fmtP(pose) : "");
    }

    function vignette(file, cb) {
      var r = new FileReader();
      r.onerror = function () { flash("Image illisible."); };
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          if (!img.width || !img.height) { flash("Image illisible."); return; }   // ex. SVG sans dimensions
          var S = 96, c = document.createElement("canvas");
          c.width = S; c.height = S;
          var k = Math.max(S / img.width, S / img.height);
          var w = img.width * k, h = img.height * k;
          c.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
          cb(c.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = function () { flash("Image illisible."); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }

    function moveTo(from, gi, targetIt) {
      // déplace items[from] dans le groupe gi, juste avant targetIt (null : à la fin).
      // La position cible se recalcule APRÈS le retrait : retirer l'objet déplacé
      // décale les index de tout ce qui le suivait.
      var moved = items.splice(from, 1)[0];
      moved.groupe = gi;
      var at = targetIt ? items.indexOf(targetIt) : -1;
      if (at < 0) items.push(moved);
      else items.splice(at, 0, moved);
      sel = items.indexOf(moved);
    }

    var menuContexte = null, menuContexteClic = null, menuContexteTouche = null;
    function fermeMenuContexte() {
      if (!menuContexte) return;
      if (menuContexte.parentNode) menuContexte.parentNode.removeChild(menuContexte);
      document.removeEventListener("mousedown", menuContexteClic, true);
      document.removeEventListener("keydown", menuContexteTouche, true);
      menuContexte = menuContexteClic = menuContexteTouche = null;
    }
    // Un état distant peut reconstruire le module Inventaire. Le menu flottant
    // et ses écouteurs vivent sur document : il faut les fermer avant de jeter
    // le bloc, sinon un ancien menu reste actif au-dessus de la nouvelle fiche.
    remontageNettoyage.push(function () { fermeMenuContexte(); });
    function retireObjet(it) {
      var here = items.indexOf(it);
      if (here < 0) return;
      items.splice(here, 1);
      if (sel === here) sel = null;
      else if (sel !== null && sel > here) sel--;
      render();
      refresh();
    }
    function montreObjet(it) {
      sayChat("Objet — " + (it.nom || "objet"), [
        ["Groupe", G[it.groupe]], ["Quantité", fmtP(it.qte)],
        ["Poids", it.poids ? fmtP(it.poids) : ""],
        ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "") : (it.achat ? "achat " + fmtP(it.achat) : "")],
        ["", it.desc]
      ]);
    }
    function ouvreMenuContexte(it, x, y) {
      fermeMenuContexte();
      var index = items.indexOf(it);
      if (index < 0) return;
      var menu = el("div", "pc-obj-context");
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", "Actions de l'objet " + (it.nom || "sans nom"));
      menuContexte = menu;
      function separateur() { menu.appendChild(el("div", "pc-obj-context-sep")); }
      function action(libelle, fn, disabled, danger, construction) {
        var bt = el("button", "pc-obj-context-action" + (danger ? " danger" : ""), libelle);
        bt.type = "button";
        bt.setAttribute("role", "menuitem");
        if (construction) bt.setAttribute("data-jjk-requires-edit", "inv");
        bt.disabled = !!disabled;
        bt.addEventListener("click", function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (bt.disabled || (construction && !isEdit("inv"))) return;
          fermeMenuContexte();
          fn();
        });
        menu.appendChild(bt);
        return bt;
      }
      action("Détails", function () { sel = items.indexOf(it); render(); refresh(); });
      action("Montrer", function () { montreObjet(it); });
      action("Donner", function () { donnerDialogue(it, it.qte); }, !(it.qte > 0));
      if (isEdit("inv")) {
        separateur();
        if (G.length > 1) {
          G.forEach(function (nom, gi) {
            if (gi === it.groupe) return;
            action("Déplacer vers « " + nom + " »", function () {
              var actuel = items.indexOf(it);
              if (actuel < 0 || !isEdit("inv")) return;
              moveTo(actuel, gi, null);
              render(); refresh();
            }, false, false, true);
          });
        }
        action("Retirer", function () {
          if (!isEdit("inv")) return;
          function confirmerRetrait() { if (isEdit("inv")) retireObjet(it); }
          if (!(it.nom || it.desc)) { confirmerRetrait(); return; }
          confirmer("Retirer un objet", "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?", "Retirer", confirmerRetrait);
        }, false, true, true);
      }
      (appEl || rootEl || document.body).appendChild(menu);
      menu.style.position = "fixed";
      menu.style.left = Math.max(6, x) + "px";
      menu.style.top = Math.max(6, y) + "px";
      var rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth - 6) menu.style.left = Math.max(6, window.innerWidth - rect.width - 6) + "px";
      if (rect.bottom > window.innerHeight - 6) menu.style.top = Math.max(6, window.innerHeight - rect.height - 6) + "px";
      menuContexteClic = function (ev) { if (menuContexte && !menuContexte.contains(ev.target)) fermeMenuContexte(); };
      menuContexteTouche = function (ev) {
        if (ev.key === "Escape") { ev.preventDefault(); fermeMenuContexte(); }
        else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          var visibles = Array.prototype.filter.call(menu.querySelectorAll("button:not(:disabled)"), function (b) { return true; });
          if (!visibles.length) return;
          ev.preventDefault();
          var courant = visibles.indexOf(document.activeElement);
          var suivant = ev.key === "ArrowDown" ? (courant + 1) % visibles.length : (courant <= 0 ? visibles.length - 1 : courant - 1);
          visibles[suivant].focus();
        }
      };
      document.addEventListener("mousedown", menuContexteClic, true);
      document.addEventListener("keydown", menuContexteTouche, true);
      var premier = menu.querySelector("button:not(:disabled)");
      if (premier) premier.focus();
    }

    function tile(it, idx) {
      var t = el("div", "pc-obj-tile" + (sel === idx ? " sel" : ""));
      t.tabIndex = 0;
      t.setAttribute("role", "button");
      t.setAttribute("aria-label", (it.nom || "Objet") + " — ouvrir les détails ; clic droit pour les actions");
      if (it.img) {
        var im = el("img");
        im.alt = ""; im.draggable = false;
        im.src = it.img;
        t.appendChild(im);
      } else t.appendChild(el("div", "pc-obj-ph", "?"));
      // retrait direct depuis la tuile, en mode édition
      var del = el("button", "pc-obj-del pc-edit-only", "✕");
      del.type = "button";
      del.title = "Retirer cet objet";
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        // confirm() est MUET dans l'iframe Roll20 : il rend false sans rien
        // afficher, donc le retrait y était annulé en silence dès que l'objet
        // portait un nom. La modale de la fiche, elle, s'affiche partout.
        function retire() {
          // La confirmation peut rester ouverte pendant un changement global
          // vers Consultation : le garde du clic initial ne suffit pas.
          if (!isEdit("inv")) return;
          var here = items.indexOf(it);
          if (here < 0) return;
          items.splice(here, 1);
          if (sel === here) sel = null;
          else if (sel !== null && sel > here) sel--;
          render();
          refresh();
        }
        if (!(it.nom || it.desc)) { retire(); return; }
        confirmer("Retirer un objet",
                  "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                  "Retirer", retire);
        return;
      });
      t.appendChild(del);
      var foot = el("div", "pc-obj-foot");
      var nom = el("span", "nm", it.nom || "Objet");
      if (!O.nom) nom.style.display = "none";
      foot.appendChild(nom);
      var poids = el("span", "pds", it.poids ? fmtP(it.poids) : "");
      poids.title = "Poids unitaire";
      if (!O.poids) poids.style.display = "none";
      foot.appendChild(poids);
      var badge = el("span", "qte", "×" + fmtP(it.qte));
      if (!O.qte) badge.style.display = "none";
      foot.appendChild(badge);
      // pied inutile si tout est masqué : la tuile reste une vignette nette
      if (!O.nom && !O.poids && !O.qte) foot.style.display = "none";
      t.appendChild(foot);
      tileRefs[idx] = { nom: nom, badge: badge, poids: poids };

      t.addEventListener("click", function () { fermeMenuContexte(); sel = items.indexOf(it); render(); });
      t.addEventListener("contextmenu", function (e) {
        e.preventDefault(); e.stopPropagation();
        ouvreMenuContexte(it, e.clientX, e.clientY);
      });
      t.addEventListener("keydown", function (e) {
        if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
          e.preventDefault();
          var r = t.getBoundingClientRect();
          ouvreMenuContexte(it, r.left + Math.min(24, r.width / 2), r.top + Math.min(24, r.height / 2));
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); sel = items.indexOf(it); render();
        }
      });
      t.draggable = true;
      t.addEventListener("dragstart", function (e) {
        // réordonner et changer de groupe = construction : mode édition requis
        if (!isEdit("inv")) { e.preventDefault(); return; }
        dragIdx = idx;
        t.classList.add("drag");
        try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.effectAllowed = "move"; } catch (err) {}
      });
      t.addEventListener("dragend", function () { dragIdx = null; render(); });
      t.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        if (!isEdit("inv")) { e.preventDefault(); e.stopPropagation(); dragIdx = null; return; }
        // lâcher sur soi-même : cible invalide, et on N'EN LAISSE PAS le
        // conteneur du groupe la valider (sinon l'objet saute en fin de groupe)
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        // le trait d'insertion se pose du côté visé : l'objet saura où il tombe
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        t.classList.toggle("over-l", avant);
        t.classList.toggle("over-r", !avant);
      });
      t.addEventListener("dragleave", function () { t.classList.remove("over-l", "over-r"); });
      t.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        if (!isEdit("inv")) { e.preventDefault(); e.stopPropagation(); dragIdx = null; render(); return; }
        if (dragIdx === idx) { e.stopPropagation(); return; }
        e.preventDefault();
        e.stopPropagation();
        var r = t.getBoundingClientRect();
        var avant = e.clientX < r.left + r.width / 2;
        var from = dragIdx; dragIdx = null;
        // déposer à DROITE d'une tuile = s'insérer avant la suivante du groupe.
        // L'objet déplacé est exclu du calcul : sinon il serait sa propre cible
        // et moveTo, qui le retire d'abord, l'expédierait en fin de groupe.
        var cible = it;
        if (!avant) {
          var deplace = items[from];
          var suivants = items.filter(function (x) { return x.groupe === it.groupe && x !== deplace; });
          var k = suivants.indexOf(it);
          cible = k >= 0 && k + 1 < suivants.length ? suivants[k + 1] : null;
        }
        moveTo(from, it.groupe, cible);
        render();
        refresh();
      });
      return t;
    }

    function groupBox(gi) {
      var g = el("div", "pc-obj-group");
      var head = el("div", "pc-obj-ghead");
      var name = el("span", "nm", G[gi]);
      name.title = isEdit("inv") ? "Double-clic : renommer le groupe" : G[gi];
      // édition EN PLACE, jamais prompt() : dans Roll20 la fiche est une iframe
      // d'une autre origine, où Chrome fait échouer prompt() en silence
      function editName() {
        var inp = el("input", "nmedit");
        inp.type = "text";
        inp.value = G[gi];
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          else if (e.key === "Escape") { inp.value = G[gi]; inp.blur(); }
        });
        inp.addEventListener("blur", function () {
          G[gi] = inp.value.trim() || G[gi];
          render();
          refresh();
        });
        head.replaceChild(inp, name);
        setTimeout(function () { inp.focus(); inp.select(); }, 0);
      }
      name.addEventListener("dblclick", function () { if (isEdit("inv")) editName(); });
      head.appendChild(name);
      if (editGi === gi) { editGi = null; editName(); }

      // CE QUE PÈSE CE GROUPE, ET S'IL PÈSE. Un personnage qui pose son sac au
      // sol ne le porte plus : le décocher sort ses objets du poids porté, donc
      // du malus de Body, sans rien perdre de ce qu'il contient. Les deux vivent
      // à droite du nom, là où l'oeil descend pour lire des chiffres.
      var pdsG = el("span", "pds");
      pdsG.title = "Poids de ce groupe";
      head.appendChild(pdsG);
      var caseG = el("label", "pc-obj-cnt");
      var boite = el("input", "pc-edit-field");
      boite.type = "checkbox";
      boite.checked = invCompte(gi);
      boite.title = "Décoché, ce groupe est posé au sol : il ne compte plus dans le poids porté.";
      boite.addEventListener("change", function () {
        state.inv.comptes[gi] = boite.checked;
        g.classList.toggle("pose", !boite.checked);
        majPoids();
        updateTotal();      // le pied distingue porté et posé : il doit suivre
        save();
        refresh();          // et le malus de Body avec, dans le même geste
      });
      caseG.appendChild(boite);
      caseG.appendChild(el("span", "t", "Compté"));
      head.appendChild(caseG);
      // Le poids d'un groupe posé s'écrit entre parenthèses : il existe, il est
      // rangé, mais il ne pèse pas. Rien ne disparaît de l'écran.
      function majPoids() {
        var p = poidsGroupe(gi);
        pdsG.textContent = invCompte(gi) ? fmtP(p) : "(" + fmtP(p) + ")";
        pdsG.classList.toggle("off", !invCompte(gi));
      }
      majPoids();
      grpPoids.push(majPoids);
      if (!invCompte(gi)) g.classList.add("pose");

      if (G.length > 1) {
        var delG = el("button", "x pc-edit-only", "✕");
        delG.type = "button";
        delG.title = "Supprimer le groupe (ses objets rejoignent le premier groupe)";
        delG.addEventListener("click", function () {
          function supprime() {
            G.splice(gi, 1);
            // le drapeau part AVEC son groupe : le laisser décalerait tous les
            // suivants, et un sac resterait posé au sol sans rien pour le dire
            state.inv.comptes.splice(gi, 1);
            items.forEach(function (it) {
              if (it.groupe === gi) it.groupe = 0;
              else if (it.groupe > gi) it.groupe--;
            });
            sel = null;
            render();
            refresh();
          }
          // Un groupe plein emporte ses objets ailleurs : on le dit avant, et
          // par la modale de la fiche, puisque confirm() est muet sous Roll20.
          var dedans = 0;
          items.forEach(function (it) { if (it.groupe === gi) dedans++; });
          if (!dedans) { supprime(); return; }
          confirmer("Supprimer un groupe",
                    "« " + G[gi] + " » contient " + dedans +
                    (dedans > 1 ? " objets" : " objet") +
                    ". Ils rejoindront « " + G[0] + " ».",
                    "Supprimer", supprime);
        });
        head.appendChild(delG);
      }
      g.appendChild(head);

      var tiles = el("div", "pc-obj-tiles");
      tiles.style.setProperty("--obj-cols", O.cols);   // objets par ligne, réglable
      items.forEach(function (it, idx) { if (it.groupe === gi) tiles.appendChild(tile(it, idx)); });
      var add = el("div", "pc-obj-addtile pc-edit-only", "+");
      add.title = "Ajouter un objet dans « " + G[gi] + " »";
      add.addEventListener("click", function () {
        items.push({ nom: "", qte: 1, poids: 0, img: "", desc: "", groupe: gi });
        sel = items.length - 1;
        render();
        refresh();
      });
      tiles.appendChild(add);
      // déposer dans le vide du groupe : l'objet rejoint la fin de ce groupe
      tiles.addEventListener("dragover", function (e) {
        if (dragIdx === null) return;
        if (!isEdit("inv")) { e.preventDefault(); e.stopPropagation(); dragIdx = null; return; }
        e.preventDefault();
        tiles.classList.add("over");
      });
      tiles.addEventListener("dragleave", function () { tiles.classList.remove("over"); });
      tiles.addEventListener("drop", function (e) {
        if (dragIdx === null) return;
        if (!isEdit("inv")) { e.preventDefault(); e.stopPropagation(); dragIdx = null; render(); return; }
        e.preventDefault();
        var from = dragIdx; dragIdx = null;
        moveTo(from, gi, null);
        render();
        refresh();
      });
      g.appendChild(tiles);
      return g;
    }

    function renderPanel() {
      panel.innerHTML = "";
      if (sel === null || !items[sel]) {
        panel.appendChild(el("div", "pc-obj-empty", isEdit("inv")
          ? "Choisir un objet, ou en ajouter un avec « + »."
          : "Choisir un objet."));
        return;
      }
      var it = items[sel];
      var refs = function () { return tileRefs[sel]; };

      var imgbox = el("div", "pc-obj-imgbox");
      if (it.img) { var im = el("img"); im.alt = ""; im.src = it.img; imgbox.appendChild(im); }
      else imgbox.appendChild(el("div", "pc-obj-ph big", "?"));
      panel.appendChild(imgbox);

      var body = el("div", "pc-obj-body");

      var nm = el("input", "nm pc-edit-field");
      nm.type = "text"; nm.placeholder = "Nom de l'objet";
      nm.value = it.nom;
      nm.addEventListener("input", function () {
        it.nom = nm.value;
        if (refs()) refs().nom.textContent = it.nom || "Objet";
        save();
      });
      body.appendChild(nm);

      // quantité : curseur + champ
      var qRow = el("div", "pc-obj-qrow");
      var slider = el("input");
      slider.type = "range"; slider.min = "0";
      slider.max = String(Math.max(10, it.qte));
      slider.value = it.qte;
      slider.step = "any";
      var qIn = el("input", "n");
      qIn.type = "number"; qIn.min = "0"; qIn.step = "any";
      qIn.value = it.qte;
      function setQte(v) {
        // quantités DÉCIMALES : une demi-ration, 2.5 mètres de corde…
        it.qte = isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
        if (+slider.max < it.qte) slider.max = String(it.qte);
        if (document.activeElement !== slider) slider.value = it.qte;
        if (document.activeElement !== qIn) qIn.value = it.qte;
        if (refs()) refs().badge.textContent = "×" + fmtP(it.qte);
        majAct();
        majPile();
        save(); updateTotal();
        refresh();   // le poids porté vient de bouger : le malus de Body suit
      }
      slider.addEventListener("input", function () { setQte(parseFloat(slider.value)); });
      qIn.addEventListener("input", function () { setQte(parseFloat(qIn.value)); });
      qRow.appendChild(slider);
      qRow.appendChild(qIn);
      body.appendChild(fld("Quantité", qRow));

      var pair = el("div", "pc-obj-pair");
      var pd = el("input", "pc-edit-field");
      pd.type = "text"; pd.inputMode = "decimal";
      pd.value = it.poids ? fmtP(it.poids) : "";
      pd.placeholder = "0";
      pd.addEventListener("input", function () {
        it.poids = pnum(pd.value);
        if (refs()) refs().poids.textContent = it.poids ? fmtP(it.poids) : "";
        majPile();
        save(); updateTotal();
        refresh();   // idem : un poids unitaire change le poids porté
      });
      pd.addEventListener("blur", function () { pd.value = it.poids ? fmtP(it.poids) : ""; });
      pair.appendChild(fld("Poids", pd));
      var gSel = el("select", "pc-edit-field");
      G.forEach(function (gn, gi) {
        var o = el("option", null, gn);
        o.value = String(gi);
        if (gi === it.groupe) o.selected = true;
        gSel.appendChild(o);
      });
      gSel.addEventListener("change", function () {
        moveTo(sel, clamp(num(gSel.value, 0), 0, G.length - 1), null);
        render();
        refresh();
      });
      pair.appendChild(fld("Groupe", gSel));
      body.appendChild(pair);

      // achat / vente : la valeur marchande de l'objet, laissée nue comme le
      // poids (JJK ne nomme pas sa monnaie)
      var prix = el("div", "pc-obj-pair");
      [["achat", "Achat"], ["vente", "Vente"]].forEach(function (c) {
        var inp = el("input", "pc-edit-field");
        inp.type = "text"; inp.inputMode = "decimal";
        inp.value = it[c[0]] ? fmtP(it[c[0]]) : "";
        inp.placeholder = "0";
        inp.addEventListener("input", function () { it[c[0]] = pnum(inp.value); save(); });
        inp.addEventListener("blur", function () { inp.value = it[c[0]] ? fmtP(it[c[0]]) : ""; });
        prix.appendChild(fld(c[1], inp));
      });
      body.appendChild(prix);

      // identifiant : c'est LUI qui reconnaît le même objet d'une fiche à
      // l'autre quand on le donne (deux « Corde » sans rapport ne fusionnent
      // pas si elles portent des identifiants différents)
      var idIn = el("input", "pc-edit-field");
      idIn.type = "text"; idIn.placeholder = "libre (ex. corde-chanvre)";
      idIn.value = it.id || "";
      idIn.addEventListener("input", function () { it.id = idIn.value; save(); });
      body.appendChild(fld("Identifiant", idIn, "w pc-edit-only"));

      // total de la pile : ce que cet objet pèse en tout (quantité × poids)
      var pile = el("div", "pc-obj-pile");
      function majPile() {
        pile.textContent = "Total : " + fmtP(it.qte * it.poids);
        pile.style.display = it.poids ? "" : "none";
      }
      majPile();
      body.appendChild(pile);

      var url = el("input", "pc-edit-field");
      url.type = "text"; url.placeholder = "https://…";
      url.value = /^data:/.test(it.img) ? "" : it.img;
      url.addEventListener("change", function () { it.img = url.value.trim(); render(); refresh(); });
      var urlFld = fld("Image (URL)", url);
      var file = el("input");
      file.type = "file"; file.accept = "image/*"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        file.value = "";   // vidé tout de suite : re-choisir le MÊME fichier redéclenche change
        if (!f) return;
        vignette(f, function (dataUrl) { it.img = dataUrl; render(); refresh(); });
      });
      urlFld.appendChild(file);
      urlFld.appendChild(miniBtn("Fichier…", "Importer une image (réduite en vignette 96 px)", function () { file.click(); }, "pc-edit-only"));
      body.appendChild(urlFld);

      var desc = el("textarea", "pc-notes pc-edit-field");
      desc.rows = 3;
      desc.placeholder = "Description, effets, notes…";
      desc.value = it.desc;
      desc.addEventListener("input", function () { it.desc = desc.value; save(); });
      body.appendChild(fld("Description", desc, "w"));

      // quantité d'ACTION : combien d'exemplaires les boutons ci-dessous
      // traitent. Elle ne touche pas la pile tant qu'on n'agit pas.
      var actQte = el("input", "n");
      actQte.type = "number"; actQte.min = "0"; actQte.step = "any";
      actQte.title = "Quantité traitée par les boutons ci-dessous";
      function bornerAct() {
        var v = pnum(actQte.value);
        if (!v || v > it.qte) v = it.qte;
        return Math.round(v * 100) / 100;
      }
      function majAct() {
        actQte.max = String(it.qte);
        if (document.activeElement !== actQte) actQte.value = fmtP(Math.min(pnum(actQte.value) || it.qte, it.qte));
      }
      actQte.value = fmtP(it.qte);
      actQte.addEventListener("blur", function () { actQte.value = fmtP(bornerAct()); });

      var actions = el("div", "pc-obj-actions");
      actions.appendChild(fld("Quantité", actQte, "qact"));
      actions.appendChild(chatBtn(
        function () { return "Objet — " + (it.nom || "objet"); },
        function () {
          var q = bornerAct();
          return [
            ["Groupe", G[it.groupe]],
            ["Quantité", fmtP(q) + (q < it.qte ? " (sur " + fmtP(it.qte) + ")" : "")],
            ["Poids", it.poids ? fmtP(it.poids) + (q > 1 ? " (total " + fmtP(q * it.poids) + ")" : "") : ""],
            ["Valeur", it.vente ? "vente " + fmtP(it.vente) + (it.achat ? " · achat " + fmtP(it.achat) : "")
                                : (it.achat ? "achat " + fmtP(it.achat) : "")],
            ["", it.desc]   // texte long : pleine largeur, sans libellé
          ];
        }));
      // donner : l'objet quitte CET inventaire et part au tchat sous forme de
      // lien « Prendre » ; le premier qui clique le reçoit dans sa fiche
      actions.appendChild(miniBtn("Donner", "Donner cette quantité à un autre joueur", function () {
        donnerDialogue(it, bornerAct());
      }));
      function retireQte(q, tout) {
        if (tout) {
          items.splice(sel, 1);
          sel = null;
        } else {
          it.qte = Math.round((it.qte - q) * 100) / 100;
        }
        render();
        refresh();
      }
      actions.appendChild(miniBtn("Retirer", "Retirer cette quantité (tout : l'objet disparaît)", function () {
        var q = bornerAct();
        var tout = q >= it.qte;
        // même raison que la croix de la tuile : la modale, jamais confirm(),
        // qui est muet dans l'iframe Roll20 et annulerait le retrait en silence
        if (tout && (it.nom || it.desc)) {
          confirmer("Retirer un objet",
                    "Retirer « " + (it.nom || "cet objet") + " » de l'inventaire ?",
                    "Retirer", function () { retireQte(q, true); });
          return;
        }
        retireQte(q, tout);
      }, "danger pc-edit-only"));
      body.appendChild(actions);
      panel.appendChild(body);
    }

    function render() {
      fermeMenuContexte();
      tileRefs = {};
      grpPoids = [];
      leftBox.innerHTML = "";
      G.forEach(function (_, gi) { leftBox.appendChild(groupBox(gi)); });
      var addG = miniBtn("+ Groupe", "Ajouter un groupe d'objets", function () {
        G.push("Groupe");
        // le drapeau naît AVEC son groupe : un groupe neuf est porté, jamais
        // posé, et le tableau reste parallèle à celui des groupes
        state.inv.comptes.push(true);
        editGi = G.length - 1;   // le nouveau groupe s'ouvre en édition de nom
        render();
        refresh();
      }, "pc-edit-only");
      addG.classList.add("pc-obj-addgroup");
      leftBox.appendChild(addG);
      renderPanel();
      updateTotal();
      applyEdit(container, "inv");
    }
    if (renderRef) renderRef.fn = render;
    invRender = render;   // un objet reçu du tchat redessine l'inventaire
    render();
    container.appendChild(wrap);
    container.appendChild(tot);
  }

  function buildArmes() {
    var bA = block("Armes", null, "armes");
    var boxA = el("div");
    bA.appendChild(boxA);
    eqCards(boxA, state.armes, "arme", bA, "armes");
    return bA;
  }

  function buildArmures() {
    var bB = block("Armures", null, "armures");
    var boxB = el("div");
    bB.appendChild(boxB);
    eqCards(boxB, state.armures, "armure", bB, "armures");
    return bB;
  }

  function buildInv() {
    // le rouage re-rend l'inventaire : messages et titres suivent le mode
    var invRenderRef = { fn: null };
    var bO = block("Inventaire", "objets par groupes", "inv", function () {
      if (invRenderRef.fn) invRenderRef.fn();
    });
    invObjets(bO, invRenderRef);
    return bO;
  }

  // ---------- onglet Bio ----------
  function buildPerso() {
    var bP = block("Personnalité", null, "perso");
    var g = el("div", "pc-id");
    var defIn = el("textarea", "pc-notes pc-edit-field");
    defIn.rows = 3;
    defIn.value = state.defaut || "";
    defIn.addEventListener("input", function () { state.defaut = defIn.value; save(); });
    var defFld = fld("Défaut", defIn, "c12");
    defFld.appendChild(chatBtn(
      function () { return "Défaut" + (state.name ? " — " + state.name : ""); },
      function () { return [["", state.defaut]]; }));
    g.appendChild(defFld);
    [0, 1].forEach(function (qi) {
      var qIn = el("textarea", "pc-notes pc-edit-field");
      qIn.rows = 3;
      qIn.value = state.qualites[qi] || "";
      qIn.addEventListener("input", function () { state.qualites[qi] = qIn.value; save(); });
      var qFld = fld("Qualité " + (qi + 1), qIn, "c6");
      qFld.appendChild(chatBtn(
        function () { return "Qualité " + (qi + 1) + (state.name ? " — " + state.name : ""); },
        function () { return [["", state.qualites[qi]]]; }));
      g.appendChild(qFld);
    });
    bP.appendChild(g);
    return bP;
  }

  function buildAvantages() {
    var bA = block("Avantages", null, "avantages");
    var avBox = el("div");
    bA.appendChild(avBox);
    function renderAv() {
      avBox.innerHTML = "";
      state.avantages.forEach(function (a, i) {
        var card = el("div", "pc-av");
        var head = el("div", "pc-av-head");
        var n = el("input", "nm pc-edit-field");
        n.type = "text"; n.placeholder = "Nom"; n.value = a.name || "";
        n.addEventListener("input", function () { a.name = n.value; save(); });
        head.appendChild(n);
        head.appendChild(chatBtn(
          function () { return "Avantage — " + (a.name || "sans nom"); },
          function () { return [["", a.desc]]; }));
        head.appendChild(miniBtn("✕", "Retirer", function () { state.avantages.splice(i, 1); renderAv(); refresh(); }, "danger pc-edit-only"));
        card.appendChild(head);
        var d = el("textarea", "pc-notes pc-edit-field");
        d.rows = 3;
        d.placeholder = "Effet";
        d.value = a.desc || "";
        d.addEventListener("input", function () { a.desc = d.value; save(); });
        card.appendChild(d);
        avBox.appendChild(card);
      });
      if (!state.avantages.length) avBox.appendChild(el("div", "pc-empty", "Aucun avantage."));
      avBox.appendChild(miniBtn("+ Ajouter un avantage", null, function () {
        state.avantages.push({ name: "", desc: "" });
        renderAv();
        refresh();
      }, "pc-edit-only"));
      applyEdit(bA, "avantages");
    }
    renderAv();
    return bA;
  }

  function buildBackground() {
    var bB = block("Background", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 9;
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    bB.appendChild(bg);
    return bB;
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
    function data(){return normaliseNotes(state.notesJournal !== undefined ? state.notesJournal : state.notes,true);}
    function resetWindow(){to=results.length;from=Math.max(0,to-BATCH);following=true;}
    function filter(){results=query?rows.filter(function(m){var c=searchCache[m.id];if(!c||c.text!==m.text||c.mode!==m.mode)c=searchCache[m.id]={text:m.text,mode:m.mode,plain:notesPlie(notesTexteRecherche(m))};return c.plain.indexOf(query)>=0;}):rows;}
    function recherche(){clearTimeout(timer);query=notesPlie(search.value);filter();resetWindow();render(true);}
    search.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(recherche,150);});
    search.addEventListener('keydown',function(e){if(e.key==='Escape'){search.value='';recherche();}});
    function redrawData(forceBottom){
      var value=JSON.stringify(state.notesJournal !== undefined ? state.notesJournal : state.notes);if(value===lastValue&&!forceBottom)return;
      var d=data(),key=JSON.stringify(d.messages);lastValue=value;if(key===lastKey&&!forceBottom)return;
      var nearBottom=history.scrollHeight-history.clientHeight-history.scrollTop<45,first=results[from]&&results[from].id;
      lastKey=key;rows=d.messages.slice().sort(function(a,c){return a.at-c.at||(a.id<c.id?-1:a.id>c.id?1:0);});filter();
      var live=Object.create(null);rows.forEach(function(m){live[m.id]=true;});Object.keys(searchCache).forEach(function(id){if(!live[id])delete searchCache[id];});
      if(forceBottom||following&&nearBottom)resetWindow();else{var i=results.findIndex(function(m){return m.id===first;});from=i<0?Math.min(from,Math.max(0,results.length-BATCH)):i;to=Math.min(results.length,Math.max(from+BATCH,Math.min(to,from+MAX)));}
      render(forceBottom||following&&nearBottom);
    }
    function commit(){state.notesJournal=data();state.notes=data().messages.map(function(m){return m.text;}).join("\n\n");save();lastValue=null;redrawData(false);}
    function ajoute(text,format){clearTimeout(timer);search.value='';query='';var d=data();d.messages.push({id:'n-'+uid()+'-'+Math.random().toString(36).slice(2),at:Date.now(),text:text,mode:format});state.notesJournal=d;state.notes=d.messages.map(function(m){return m.text;}).join("\n\n");save();lastValue=null;redrawData(true);}
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
        tools.appendChild(miniBtn('Supprimer',null,function(){var before=version(m);confirmer('Supprimer cette note ?','Cette note sera retirée de l’historique.','Supprimer',function(){var current=record(m.id);if(!current)return;if(version(current)!==before){flash('La note a changé depuis l’ouverture de la confirmation. Relisez-la avant de la supprimer.');return;}var d=data();d.messages=d.messages.filter(function(n){return n.id!==m.id;});state.notesJournal=d;state.notes=d.messages.map(function(n){return n.text;}).join("\n\n");if(editing&&editing.id===m.id)editing=null;delete drafts[m.id];commit();});}));head.appendChild(tools);message.appendChild(head);
        if(editing&&editing.id===m.id)edition(message,m);else{var body=el('div','pc-notes-body');notesRendu(body,m.text,m.mode);message.appendChild(body);}messages.appendChild(message);
      });
      // Préserver le brouillon même si son message est supprimé à distance.
      if(editing&&!record(editing.id)){var orphan=el('article','pc-note-message');edition(orphan,{id:editing.id});messages.appendChild(orphan);}
      if(to<results.length)messages.appendChild(miniBtn('Notes suivantes ('+(results.length-to)+')',null,function(){page(1);},'pc-notes-newer'));
      count.textContent=query?results.length+' résultat'+(results.length===1?'':'s')+' · '+rows.length+' notes':rows.length+' note'+(rows.length===1?'':'s');clear.disabled=!search.value;latest.hidden=to===results.length;following=!!bottom;
      if(bottom)history.scrollTop=history.scrollHeight;else{var found=Array.prototype.find.call(messages.querySelectorAll('.pc-note-message'),function(n){return n.dataset.id===anchor;});history.scrollTop=found?scroll+found.getBoundingClientRect().top-offset:scroll;}
      if(caret){var area=messages.querySelector('.pc-notes-editor textarea');if(area){area.focus({preventScroll:true});area.setSelectionRange(caret.start,caret.end);}}
      if(window.__jjkApplyMode)window.__jjkApplyMode(b);
    }
    history.addEventListener('scroll',function(){following=to===results.length&&history.scrollHeight-history.clientHeight-history.scrollTop<45;if(scrollFrame!==null)return;scrollFrame=requestAnimationFrame(function(){scrollFrame=null;if(dead||!history.clientHeight)return;if(history.scrollTop<35&&from>0)page(-1);else if(history.scrollHeight-history.clientHeight-history.scrollTop<35&&to<results.length)page(1);});},{passive:true});
    var observer=typeof ResizeObserver==='function'?new ResizeObserver(function(){if(following)history.scrollTop=history.scrollHeight;}):null;if(observer)observer.observe(messages);
    remontageNettoyage.push(function(){notesVues[vueKey]={text:input.value,mode:mode,search:search.value,editing:editing,drafts:drafts,searchCache:searchCache,first:results[from]&&results[from].id,count:to-from,scroll:history.scrollTop,following:following};dead=true;clearTimeout(timer);if(scrollFrame!==null)cancelAnimationFrame(scrollFrame);if(observer)observer.disconnect();});hooks.push(function(){redrawData(false);});
    updatePreview();redrawData(true);
    if(remembered&&!remembered.following){var index=results.findIndex(function(m){return m.id===remembered.first;});if(index>=0){from=index;to=Math.min(results.length,from+Math.max(BATCH,remembered.count));render(false);}}
    requestAnimationFrame(function(){if(dead)return;if(remembered&&!remembered.following){following=false;history.scrollTop=remembered.scroll;}else if(following)history.scrollTop=history.scrollHeight;});return b;
  }
  // ---------- onglet Options ----------
  // ---- jets ----
  function buildJets() {
    var bJ = block("Jets");
    var de = el("input", "de");
    de.type = "text";
    de.title = "Ce que la fiche lance pour un jet de test. Écrit en macro Roll20 : " +
               "cs> marque le coup critique, cf< l'échec critique.";
    de.value = state.de || DE_DEFAUT;
    de.addEventListener("input", function () { state.de = de.value || DE_DEFAUT; save(); });
    hooks.push(function () { if (document.activeElement !== de) de.value = state.de || DE_DEFAUT; });
    // Le champ et son bouton sur la MÊME ligne : le champ prend toute la place
    // que le bouton lui laisse. Sous le champ, le bouton occupait une rangée
    // entière pour un mot, et le bloc en paraissait deux fois plus haut.
    var ligneDe = el("div", "pc-jet-de");
    ligneDe.appendChild(fld("Dé des jets de test", de));
    ligneDe.appendChild(miniBtn("Réinitialiser", "Revenir au dé des règles : " + DE_DEFAUT,
      function () { state.de = DE_DEFAUT; refresh(); }));
    bJ.appendChild(ligneDe);
    return bJ;
  }

  // ---- modificateurs de caractéristiques (hors limite : au-delà de 80, sous 0) ----
  // équipement, art et décisions du MJ confondus : UN modificateur par
  // caractéristique, appliqué au total affiché sur la Fiche
  // MÊME GRILLE QUE LES COMPÉTENCES, et c'est voulu : régler une
  // caractéristique et régler une compétence sont le même geste pour le MJ, il
  // n'a pas à apprendre deux dispositions. Sans le filtre, le menu des champs
  // ni les puces : sur trois lignes, ils ne servent à rien.
  // Les deux champs des grilles d'Options vivent ICI, et non dans un bloc :
  // trois blocs s'en servent désormais (modificateurs de caractéristiques,
  // compétences, Création). Chacun existe en deux formes, une valeur d'un
  // ensemble (map + clé, la plupart des leviers) ou une valeur seule (le
  // budget de points de création) : la première délègue à la seconde, il n'y a
  // donc qu'une implémentation à corriger le jour où l'une d'elles bouge.
  // un champ de modificateur, nu, comme dans le bloc des compétences
  function champModVal(lire, ecrire, borne, titre) {
    var inp = el("input", "pc-num modif");
    inp.type = "number"; inp.step = String(MOD_PAS);
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -borne, borne) : 0);
      refresh();
    });
    hooks.push(function () {
      if (document.activeElement !== inp) inp.value = lire() ? lire() : "";
    });
    return inp;
  }
  function champMod(map, cle, borne, titre) {
    return champModVal(function () { return map[cle]; },
                       function (v) { map[cle] = v; }, borne, titre);
  }
  // un champ de forçage : vide = valeur calculée (undefined = pas de forçage)
  function champForceVal(lire, ecrire, auto, titre) {
    var inp = el("input", "force");
    inp.type = "number"; inp.step = "1";
    inp.title = titre;
    inp.addEventListener("input", function () {
      var v = parseFloat(inp.value);
      ecrire(isFinite(v) ? clamp(Math.round(v), -9999, 9999) : undefined);
      refresh();
    });
    hooks.push(function () {
      inp.placeholder = String(auto());
      var cur = lire();
      if (document.activeElement !== inp) inp.value = cur === undefined ? "" : cur;
    });
    return inp;
  }
  function champForce(map, cle, auto, titre) {
    return champForceVal(
      function () { return map[cle]; },
      function (v) { if (v === undefined) delete map[cle]; else map[cle] = v; },
      auto, titre);
  }

  function buildModCaracs() {
    var bM = block("Modificateurs de caractéristiques");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bM.appendChild(wrap);

    var grp = el("div", "pc-optcomp-row grp");
    grp.appendChild(el("span"));
    var gV = el("span", "g", "Valeur");
    gV.title = "Ce que vaut la caractéristique quand on la lance";
    grp.appendChild(gV);
    grp.appendChild(el("span", "rule"));
    var gX = el("span", "g", "Coût en xp");
    gX.title = "Ce que la caractéristique coûte sur l'xp du personnage";
    grp.appendChild(gX);
    box.appendChild(grp);

    var head = el("div", "pc-optcomp-row head");
    [["Carac.", "Caractéristique"],
     ["Forcé", "Total forcé — vide = total calculé"],
     ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
     ["Total", "Total effectif de la caractéristique"],
     null,
     ["Forcé", "Coût en xp forcé — vide = coût calculé"],
     ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
     ["Coût", "Coût effectif en xp"]].forEach(function (h) {
      if (!h) { head.appendChild(el("span", "rule")); return; }
      var sp = el("span", h[2] || null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    CHAMPS.forEach(function (name, i) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsForce, name,
        function () {
          var v = Math.min(state.caracsBase[name] + CARAC_PAS * state.caracsXp[name],
                           caracPlafond(name));
          return v + (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        },
        "Total forcé — vide = total calculé (création + achats + modificateurs)."));
      row.appendChild(champMod(state.caracsMod, name, 999,
        "Premier modificateur du total — vide = aucun."));
      row.appendChild(champMod(state.caracsMod2, name, 999,
        "Second modificateur du total — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      row.appendChild(el("span", "rule"));
      row.appendChild(champForce(state.caracsXpForce, name,
        function () { return caracXpAuto(name); },
        "Coût en xp forcé — vide = coût calculé (achats et modificateurs)."));
      row.appendChild(champMod(state.caracsXpMod, name, 9999,
        "Premier modificateur du coût en xp — vide = aucun."));
      row.appendChild(champMod(state.caracsXpMod2, name, 9999,
        "Second modificateur du coût en xp — vide = aucun."));
      var cout = el("span", "pc-comp-total", "");
      row.appendChild(cout);

      hooks.push(function () {
        var d = (state.caracsMod[name] || 0) + (state.caracsMod2[name] || 0);
        var force = state.caracsForce[name];
        tot.textContent = String(caracTotal(name));
        tot.classList.toggle("adj", d !== 0 || force !== undefined);
        tot.title = force !== undefined
          ? "Total forcé à " + force
          : "création " + state.caracsBase[name] +
            " · achats " + (CARAC_PAS * state.caracsXp[name]) +
            (d ? " · modificateurs " + sign(d) : "");

        var xf = state.caracsXpForce[name];
        var xm = (state.caracsXpMod[name] || 0) + (state.caracsXpMod2[name] || 0);
        var xp = caracXp(name);
        cout.textContent = xp + " xp";
        cout.classList.toggle("zero", !xp);
        cout.classList.toggle("adj", xf !== undefined || xm !== 0);
        cout.title = xf !== undefined
          ? "Coût forcé à " + xf + " xp (calculé : " + caracXpAuto(name) + " xp)"
          : "Achats d'xp" + (xm ? " · modificateurs " + sign(xm) + " xp" : "");

        row.classList.toggle("on", d !== 0 || xm !== 0 ||
                             force !== undefined || xf !== undefined);
      });
      box.appendChild(row);
    });
    return bM;
  }

  // ---- création : plafond des caractéristiques et budget de points ----
  // Ce bloc a remplacé la case « Sans limite » (2026-08-04), qui ne savait que
  // lever le plafond, et pour les trois caractéristiques à la fois. Mêmes
  // colonnes que les deux autres grilles de l'onglet, à quatre colonnes au lieu
  // de dix : un demi-bloc suffit ici (il n'y a pas de coût en xp à régler).
  function buildCreation() {
    var bC = block("Création");
    var wrap = el("div", "pc-optcomp-wrap");
    var box = el("div");
    wrap.appendChild(box);
    bC.appendChild(wrap);

    // Un seul entête pour toute la grille, en tête : les deux bandes qui
    // suivent nomment les rangées, pas les colonnes. D'où « Valeur » et non
    // « Plafond », qui aurait menti sur la rangée des points de création.
    var head = el("div", "pc-optcomp-row quatre head");
    [["Réglage", "Ce que la rangée règle"],
     ["Forcé", "Valeur forcée — vide = valeur calculée"],
     ["Modif.", "Modificateur du barème — vide = aucun"],
     ["Valeur", "Valeur effective"]].forEach(function (h) {
      var sp = el("span", null, h[0]);
      sp.title = h[1];
      head.appendChild(sp);
    });
    box.appendChild(head);

    // Les deux sections se titrent comme les champs du bloc des compétences
    // (« BODY ———— ») : un titre de RANGÉES, à gauche, filet jusqu'au bord.
    // La bande centrée des autres grilles ne convenait pas ici : elle titre des
    // COLONNES, et se lisait comme un second entête posé sur les chiffres.
    function bande(titre, aide) {
      var t = el("div", "pc-comp-champ", titre);
      t.title = aide;
      box.appendChild(t);
    }

    bande("Plafond des caractéristiques",
          "Ce que création + achats d'xp ne peuvent pas dépasser, "
          + "caractéristique par caractéristique");
    CHAMPS.forEach(function (name, i) {
      if (!DATA.caracs.some(function (cc) { return cc.name === name; })) return;
      var row = el("div", "pc-optcomp-row quatre" + (i % 2 === 1 ? " odd" : ""));
      var nameBox = el("span", "pc-comp-name");
      var chip = el("span", "pc-abbr", ABBR[name] || name);
      chip.title = name;
      nameBox.appendChild(chip);
      row.appendChild(nameBox);

      row.appendChild(champForce(state.caracsPlafondForce, name,
        function () { return caracPlafondAuto(name); },
        "Plafond forcé — vide = plafond calculé (" + CARAC_MAX + " + modificateur)."));
      row.appendChild(champModVal(
        function () { return state.caracsPlafondMod[name]; },
        function (v) { state.caracsPlafondMod[name] = v; }, 999,
        "Modificateur du plafond de " + name + " — vide = aucun."));
      var tot = el("span", "pc-comp-total", "");
      row.appendChild(tot);

      hooks.push(function () {
        var m = state.caracsPlafondMod[name] || 0;
        var f = state.caracsPlafondForce[name];
        tot.textContent = String(caracPlafond(name));
        tot.classList.toggle("adj", m !== 0 || f !== undefined);
        tot.title = f !== undefined
          ? "Plafond forcé à " + f
          : "barème " + CARAC_MAX + (m ? " · modificateur " + sign(m) : "");
        row.classList.toggle("on", m !== 0 || f !== undefined);
      });
      box.appendChild(row);
    });

    bande("Points de création",
          "Le budget que la jauge « Création » de la Fiche mesure");
    var rowP = el("div", "pc-optcomp-row quatre");
    var nomP = el("span", "pc-comp-name");
    nomP.appendChild(el("span", "pc-comp-label", "Points"));
    rowP.appendChild(nomP);
    rowP.appendChild(champForceVal(
      function () { return state.ptsCreaForce === null ? undefined : state.ptsCreaForce; },
      function (v) { state.ptsCreaForce = v === undefined ? null : v; },
      ptsCreaAuto,
      "Budget forcé — vide = budget calculé (" + PTS_CREATION + " + modificateur)."));
    rowP.appendChild(champModVal(
      function () { return state.ptsCreaMod; },
      function (v) { state.ptsCreaMod = v; }, 999,
      "Modificateur du budget de points de création — vide = aucun."));
    var totP = el("span", "pc-comp-total", "");
    rowP.appendChild(totP);
    hooks.push(function () {
      var m = state.ptsCreaMod || 0;
      var f = state.ptsCreaForce;
      totP.textContent = String(ptsCreaMax());
      totP.classList.toggle("adj", m !== 0 || f !== null);
      totP.title = f !== null
        ? "Budget forcé à " + f
        : "barème " + PTS_CREATION + (m ? " · modificateur " + sign(m) : "");
      rowP.classList.toggle("on", m !== 0 || f !== null);
    });
    box.appendChild(rowP);
    return bC;
  }

  // ---- modificateurs de compétences ----
  // le pendant du bloc caractéristiques : UN modificateur par compétence
  // (équipement, art, décision du MJ confondus), appliqué au total de la
  // ligne sur la Fiche. Rebâti quand les compétences perso changent
  // (optCompsRebuild, rappelé par l'ajout et la suppression) ; optHooks
  // remplace hooks pour ces lignes, sinon chaque rebâti fuirait des hooks.
  function buildOptComps() {
    var bMC = block("Modificateurs de compétences");
    // mêmes outils que la liste de la Fiche (filtre texte, champ, puces) et
    // mêmes lignes, mais une grille plus large : nom | modificateurs | total
    // forcé | total | modificateur de coût | coût forcé | coût.
    var mcTools = el("div", "pc-comp-tools");
    var mcLine1 = el("div", "row");
    var mcSearch = champFiltre(function () { return optFilter; },
                               function (v) { optFilter = v; }, null,
                               function () { optCompsRebuild(); });
    if (mcSearch) mcLine1.appendChild(mcSearch);
    if (filtreChampOn()) {
      var mcChamp = el("select", "pc-select");
      ["Tous les champs", "Body", "Mind", "Prestance"].forEach(function (ch) {
        var o = el("option");
        o.value = ch === "Tous les champs" ? "" : ch;
        o.textContent = ch;
        mcChamp.appendChild(o);
      });
      mcChamp.value = optChamp;
      mcChamp.addEventListener("change", function () { optChamp = mcChamp.value; optCompsRebuild(); });
      mcLine1.appendChild(mcChamp);
    }
    if (mcLine1.children.length) mcTools.appendChild(mcLine1);
    var mcLine2 = el("div", "row");
    var mcPerso = el("span", "pc-chip");
    mcPerso.textContent = "Personnalisées";
    mcPerso.title = "Décoché : seules les compétences de base du jeu sont affichées.";
    mcPerso.classList.toggle("on", optPerso);
    mcPerso.addEventListener("click", function () {
      optPerso = !optPerso;
      mcPerso.classList.toggle("on", optPerso);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcPerso);
    var mcOnly = el("span", "pc-chip");
    mcOnly.textContent = "Investies";
    mcOnly.title = "N'afficher que les compétences où un stade, un passif ou un modificateur est posé.";
    mcOnly.classList.toggle("on", optOnly);
    mcOnly.addEventListener("click", function () {
      optOnly = !optOnly;
      mcOnly.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    mcLine2.appendChild(mcOnly);
    mcTools.appendChild(mcLine2);
    bMC.appendChild(mcTools);
    // la grille des leviers est large : elle défile dans son cadre
    var mcWrap = el("div", "pc-optcomp-wrap");
    var mcBox = el("div");
    mcWrap.appendChild(mcBox);
    bMC.appendChild(mcWrap);
    // Modificateur d'une ligne de compétence : un champ NU, sans − ni +. Sur
    // cinquante lignes de sept colonnes, les boutons mangeaient la place et
    // n'apportaient rien qu'on ne fasse au clavier. Les caractéristiques,
    // elles, gardent leurs boutons : elles ne sont que trois.
    function modField(map, key, borne, titre) {
      var inp = el("input", "pc-num modif");
      inp.type = "number"; inp.step = String(MOD_PAS);
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v) && clamp(Math.round(v), -borne, borne)) map[key] = clamp(Math.round(v), -borne, borne);
        else delete map[key];   // vide ou zéro = pas d'entrée dans l'état
        refresh();
      });
      optHooks.push(function () {
        if (document.activeElement !== inp) inp.value = map[key] === undefined ? "" : map[key];
      });
      return inp;
    }
    // un champ de forçage : vide = valeur calculée, une valeur la remplace
    function forceField(map, key, auto, titre) {
      var inp = el("input", "force");
      inp.type = "number"; inp.step = "1";
      inp.title = titre;
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isFinite(v)) map[key] = clamp(Math.round(v), -9999, 9999);
        else delete map[key];
        refresh();
      });
      optHooks.push(function () {
        inp.placeholder = String(auto());
        if (document.activeElement !== inp) inp.value = map[key] === undefined ? "" : map[key];
      });
      return inp;
    }
    optCompsRebuild = function () {
      optHooks = [];
      mcBox.innerHTML = "";
      var flt = filtreDe(optFilter);
      var shown = 0;
      CHAMPS.forEach(function (carac) {
        if (filtreChampOn() && optChamp && optChamp !== carac) return;
        var items = allComps().filter(function (it) { return it.carac === carac; });
        if (!optPerso) items = items.filter(function (it) { return !it.custom; });
        if (flt) items = items.filter(function (it) { return it.name.toLowerCase().indexOf(flt) >= 0; });
        if (optOnly) items = items.filter(compInvestie);
        items.sort(function (a, b) { return a.name.localeCompare(b.name, "fr", { sensitivity: "base" }); });
        if (!items.length) return;
        mcBox.appendChild(el("div", "pc-comp-champ", carac));
        // Deux rangées d'entête : les groupes (valeur | coût), puis les
        // colonnes. Libellés courts — sept colonnes dans une demi-largeur ne
        // laissent pas la place aux noms complets, que portent les infobulles.
        // La colonne « rule » est un vrai filet : une colonne de la grille, en
        // place sur CHAQUE rangée, qui court d'un bord à l'autre du module.
        var grp = el("div", "pc-optcomp-row grp");
        grp.appendChild(el("span"));
        var gV = el("span", "g", "Valeur");
        gV.title = "Ce que vaut la compétence quand on la lance";
        grp.appendChild(gV);
        grp.appendChild(el("span", "rule"));
        var gX = el("span", "g", "Coût en xp");
        gX.title = "Ce que la compétence coûte sur l'xp du personnage";
        grp.appendChild(gX);
        mcBox.appendChild(grp);

        var head = el("div", "pc-optcomp-row head");
        [["Compétence", "Nom de la compétence"],
         ["Forcé", "Total forcé — vide = total calculé"],
         ["Modif.", "Deux modificateurs du total, qui s'additionnent", "duo"],
         ["Total", "Total effectif de la compétence"],
         null,
         ["Forcé", "Coût en xp forcé — vide = coût calculé"],
         ["Modif.", "Deux modificateurs du coût en xp, qui s'additionnent", "duo"],
         ["Coût", "Coût effectif en xp"]].forEach(function (h) {
          if (!h) { head.appendChild(el("span", "rule")); return; }
          var s = el("span", h[2] || null, h[0]);
          s.title = h[1];
          head.appendChild(s);
        });
        mcBox.appendChild(head);
        items.forEach(function (it, i) {
          shown++;
          var row = el("div", "pc-optcomp-row pc-mods-host" + (i % 2 === 1 ? " odd" : ""));
          var comp = function () { return state.comps[it.key] || blankComp(); };

          var nameBox = el("span", "pc-comp-name");
          var label = el("span", "pc-comp-label", it.name);
          label.title = it.name + " (" + it.carac + ")";
          nameBox.appendChild(label);
          row.appendChild(nameBox);

          // VALEUR : forcé, puis modificateur, puis le total effectif
          row.appendChild(forceField(state.compsForce, it.key,
            function () { return compValueAuto(it.carac, comp(), it.key); },
            "Total forcé — vide = total calculé (caractéristique + stade + modificateur)."));

          // DEUX champs : ils s'additionnent. Un seul obligeait à faire la
          // somme de tête avant de saisir, puis à la défaire pour retirer l'un
          // des deux apports.
          row.appendChild(modField(state.compsMod, it.key, 999,
            "Premier modificateur du total — vide = aucun."));
          row.appendChild(modField(state.compsMod2, it.key, 999,
            "Second modificateur du total — vide = aucun."));

          var tot = el("span", "pc-comp-total", "");
          row.appendChild(tot);

          // COÛT EN XP : même ordre, derrière le filet de séparation
          row.appendChild(el("span", "rule"));
          row.appendChild(forceField(state.compsXpForce, it.key,
            function () { return compXpAuto(comp(), it.key); },
            "Coût en xp forcé — vide = coût calculé (stades, passifs, art, modificateur)."));

          row.appendChild(modField(state.compsXpMod, it.key, 9999,
            "Premier modificateur du coût en xp — vide = aucun."));
          row.appendChild(modField(state.compsXpMod2, it.key, 9999,
            "Second modificateur du coût en xp — vide = aucun."));

          var cout = el("span", "pc-comp-total", "");
          row.appendChild(cout);

          optHooks.push(function () {
            var c = comp();
            var d = (state.compsMod[it.key] || 0) + (state.compsMod2[it.key] || 0);
            var force = state.compsForce[it.key];
            // même terme que la colonne Total de l'onglet Fiche : les deux
            // afficheraient sinon des chiffres différents pour une compétence
            var m = compPoidsMalus(it.carac, it.key);
            tot.textContent = sign(compValue(it.carac, c, it.key));
            tot.classList.toggle("zero", !c.stade && !d && !m && force === undefined);
            tot.classList.toggle("adj", d !== 0 || m !== 0 || force !== undefined);
            tot.title = force !== undefined
              ? "Total forcé à " + sign(force) + " (calculé : " + sign(compValueAuto(it.carac, c, it.key)) + ")"
              : it.carac + " " + sign(caracTotal(it.carac)) +
                " · stade " + sign(stadeInfo(c.stade).bonus) +
                (d ? " · modificateur " + sign(d) : "") +
                (m ? " · poids " + sign(-m) : "");

            var xForce = state.compsXpForce[it.key];
            var xm = (state.compsXpMod[it.key] || 0) + (state.compsXpMod2[it.key] || 0);
            var xp = compXp(c, it.key);
            cout.textContent = xp + " xp";
            cout.classList.toggle("zero", !xp);
            cout.classList.toggle("adj", xForce !== undefined || xm !== 0);
            cout.title = xForce !== undefined
              ? "Coût forcé à " + xForce + " xp (calculé : " + compXpAuto(c, it.key) + " xp)"
              : "Stades, passifs et art" + (xm ? " · modificateur " + sign(xm) + " xp" : "");

            // un liseré marque les lignes réglées : sur cinquante compétences,
            // c'est le seul moyen de retrouver d'un coup d'œil celles qu'on a
            // touchées
            row.classList.toggle("on",
              d !== 0 || force !== undefined || xForce !== undefined || xm !== 0);
          });
          mcBox.appendChild(row);
        });
      });
      if (!shown) {
        mcBox.appendChild(el("div", "pc-empty",
          optOnly ? "Aucune compétence investie ne correspond — décocher « Investies » pour toutes les voir."
                  : "Aucune compétence ne correspond."));
      }
      refresh();   // les lignes viennent de naître : leurs totaux se peuplent ici
    };
    optCompsRebuild();
    return bMC;
  }

  // ---- outils de filtre ----
  // Couper un outil le fait DISPARAÎTRE partout (Compétences, Armes, Langues
  // et le bloc ci-dessus) et cesser d'agir : un filtre invisible qui masque
  // encore des lignes serait un piège. Réglage d'affichage, donc local au
  // navigateur — il ne suit pas le personnage.
  function buildFiltres() {
    var bF = block("Outils de filtre");
    var fRow = el("div", "pc-comp-tools");
    var fLine = el("div", "row");
    // Chaque puce ALLUME OU ÉTEINT un outil ; elle porte donc le nom de
    // l'outil, pas celui de son réglage par défaut. La seconde s'appelait
    // « Tous les champs », qui est le premier choix de la liste déroulante :
    // on croyait afficher tous les champs alors qu'on décidait si la liste
    // existe.
    [["texte", "Champ de recherche",
      "La case où l'on tape pour filtrer les modules Compétences, Armes et Langues."],
     ["champ", "Sélecteur de champ",
      "La liste déroulante Body / Mind / Prestance des modules Compétences."]].forEach(function (o) {
      var chip = el("span", "pc-chip");
      chip.textContent = o[1];
      chip.title = o[2] + " Éteinte : l'outil disparaît, et ne filtre plus rien.";
      chip.classList.toggle("on", lpref(FILTRES[o[0]], "1") !== "0");
      chip.addEventListener("click", function () {
        var on = lpref(FILTRES[o[0]], "1") !== "0";
        lset(FILTRES[o[0]], on ? "0" : "1");
        chip.classList.toggle("on", !on);
        remount();   // les outils vivent dans d'autres onglets : tout se rebâtit
      });
      fLine.appendChild(chip);
    });
    fRow.appendChild(fLine);
    bF.appendChild(fRow);
    return bF;
  }

  // ---- affichage (fiche dans Roll20 seulement) ----
  // window.__jjkNight n'existe que sous roll20-fiche.html (posé par
  // jjk-roll20-boot.js) : sur le site, le bouton d'en-tête gère déjà la nuit.
  // Préférence locale au navigateur (pas dans l'état : réglage d'affichage,
  // pas de personnage) ; "auto" suit le mode jour/nuit de ROLL20 (indice
  // n=1/0 posé par l'extension 2.0.3+ ; repli navigateur sans indice).
  function affichagePresent() { return !!window.__jjkNight; }
  function buildAffichage() {
    var bAff = block("Affichage");
    var mode = el("select", "pc-select");
    [["auto", "Selon Roll20"], ["0", "Jour"], ["1", "Nuit"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      mode.appendChild(op);
    });
    mode.value = window.__jjkNight.pref();
    mode.addEventListener("change", function () { window.__jjkNight.set(mode.value); });
    bAff.appendChild(fld("Mode par défaut", mode));
    return bAff;
  }

  // ---- actions sur la fiche (exporter / importer / réinitialiser) ----
  function buildActions() {
    var bAct = block("Fiche");
    var act = el("div", "pc-opt-actions");
    act.appendChild((function () {
      var b = el("button", "pc-btn", "Exporter (JSON)");
      b.type = "button";
      b.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        a.download = (state.name || "personnage-jjk") + ".json";
        a.click();
      });
      return b;
    })());
    var file = el("input");
    file.type = "file"; file.accept = "application/json"; file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          state = normalize(JSON.parse(r.result));
          remount();
          flash("Personnage importé.");
        } catch (e) { flash("JSON illisible."); }
        file.value = "";
      };
      r.readAsText(f);
    });
    act.appendChild((function () {
      var b = el("button", "pc-btn", "Importer (JSON)");
      b.type = "button";
      b.addEventListener("click", function () { file.click(); });
      return b;
    })());
    act.appendChild(file);
    act.appendChild((function () {
      var b = el("button", "pc-btn danger", "Réinitialiser la fiche");
      b.type = "button";
      b.addEventListener("click", function () {
        if (!confirm("Réinitialiser la fiche ? Tout le personnage sera effacé.")) return;
        state = blank();
        remount();
        flash("Fiche réinitialisée.");
      });
      return b;
    })());
    bAct.appendChild(act);
    return bAct;
  }

  // ---- modules : ce que la fiche affiche, et où ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle vivent plus bas
  // (ordreModules, colonnesDe, MODULES_NATIFS) : ce sont ceux du montage, pour
  // que le plan dise exactement ce que la fiche a fait.
  //
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite (trois
  // colonnes côte à côte dans un bloc lui-même en colonne). « Colonne du
  // milieu » y passerait à la ligne.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite", bas: "Pleine largeur"
  };
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Un module qui n'existe pas n'a pas de ligne : il
  // n'y a rien à en régler. Son id, lui, reste dans l'ordre enregistré — sans
  // quoi ouvrir la fiche sur le site effacerait le rangement fait dans Roll20.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » (une colonne de l'onglet Fiche) dans un onglet
  // qui n'en a pas se retrouve sans hôte : il ne se monte nulle part, tout
  // comme un module dont l'ONGLET est inconnu. La différence est que sa ligne,
  // elle, figure bien sous son onglet, l'air d'un module ordinaire. Il faut
  // donc la reconnaître pour le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                          // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;             // le repli d'appliqueDisposition
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage.
  //
  // On ne lit surtout pas modules[i].onglet : appliqueDisposition l'a déjà
  // remanié au montage, donc il porte la place FORCÉE. Tant que le plan
  // rechargeait la fiche à chaque geste, les deux se confondaient ; maintenant
  // que le rangement attend le prochain chargement, il faut la consigne elle-
  // même — sans quoi « Disposition d'origine » ne montrerait rien avant le
  // rechargement, et un module déplacé deux fois de suite repartirait de sa
  // place forcée au lieu de sa place d'origine.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string"
        && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: p.colonne };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: o.colonne };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() {
    return ordreModules().map(function (m) { return m.id; });
  }
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet.
  //
  // L'ancienne version écrivait l'ordre COMPLET de tous les modules, tous
  // onglets confondus. Un seul clic sur une flèche, n'importe où, et la
  // disposition du personnage était gelée pour toujours : la fiche pouvait
  // ensuite changer l'agencement d'un onglet auquel le joueur n'avait jamais
  // touché, il ne le voyait jamais. C'est arrivé pour de bon — l'onglet Options
  // a été réagencé et les personnages qui avaient cliqué une fois gardaient
  // l'ancien, sans aucun moyen de le savoir.
  //
  // Désormais l'ordre enregistré ne retient que les colonnes RÉELLEMENT
  // remaniées. Les autres n'y figurent pas, donc elles suivent la table de la
  // fiche : un module ajouté ou déplacé par une mise à jour arrive chez tout le
  // monde, sauf là où le joueur a fait son propre rangement.
  //
  // ordonne() accepte un ordre PARTIEL, c'est ce qui rend la chose possible :
  // les id nommés passent devant dans l'ordre donné, les autres suivent à leur
  // rang de déclaration. Comme les colonnes sont séparées au montage, épingler
  // une colonne ne dérange pas les voisines.
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ids : l'ordre voulu, complet. onglet/colonne : la colonne remaniée.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    // ce qui était déjà épinglé AILLEURS reste épinglé, dans son ordre
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    // puis la colonne qu'on vient de remanier, dans son ordre nouveau
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = neuf;
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS.
    //
    // Elle se remontait à chaque geste : ranger trois modules reconstruisait
    // trois fois la fiche entière, l'onglet sautait, et le moindre clic coûtait
    // une seconde. Le plan se redessine seul (redessinePlan), le rangement est
    // enregistré, et « Recharger la fiche » l'applique quand on a fini.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
  // ---- le plan de la fiche : on range en FAISANT GLISSER ----
  //
  // La version d'avant réglait la disposition avec deux flèches et une liste
  // déroulante par module : pour descendre un bloc de trois rangs il fallait
  // trois clics, et pour le changer de colonne il fallait deviner quelle
  // colonne portait quel nom. On ne voyait jamais la fiche, seulement une liste
  // de lignes.
  //
  // Ici, chaque onglet est dessiné avec SES colonnes, côte à côte, et chaque
  // module est une carte qu'on prend et qu'on lâche où on veut : dans la même
  // colonne pour changer son rang, dans une autre pour l'y envoyer. Le plan
  // ressemble à la fiche, donc on range en regardant ce qu'on range.
  //
  // Glisser-déposer natif du navigateur (draggable, dragover, drop) : aucune
  // bibliothèque, et ça marche tel quel dans l'iframe Roll20.

  // Déplacer un module : sa colonne d'arrivée, et devant qui il se pose.
  // « avantId » nul = à la fin de la colonne.
  function deplaceModule(id, onglet, colonne, avantId) {
    var d = disposition();
    var nat = placeOrigine[id] || natifDe(id);
    if (!d.place || typeof d.place !== "object" || Array.isArray(d.place)) d.place = {};
    // Revenir à sa place d'origine EFFACE l'entrée plutôt que d'y ranger cette
    // place : la disposition reste éparse, et un module que la fiche déménagera
    // un jour suivra son déménagement au lieu d'être épinglé ici.
    if (nat && nat.onglet === onglet && nat.colonne === colonne) delete d.place[id];
    else d.place[id] = { onglet: onglet, colonne: colonne };
    // La consigne écrite suffit : memeColonne() la lit (placeDemandee), donc
    // l'ordre qu'on s'apprête à calculer voit déjà le module dans sa nouvelle
    // colonne. La table des modules, elle, n'est pas touchée : elle décrit la
    // fiche MONTÉE, qui ne bougera qu'au prochain chargement.
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

  // Redessiner LE PLAN SEUL, sans reconstruire la fiche. C'est ce qui permet de
  // ranger dix modules d'affilée sans la moindre secousse : seul ce bloc-ci
  // change, et ce qu'il montre est le rangement enregistré, pas la fiche montée.
  // Enveloppé : un plan qui échoue ne doit pas emporter la fiche avec lui.
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
    // haute d'une carte veut dire « avant elle », la moitié basse « après ».
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
      // L'oeil : affiché ou masqué. Le bloc des réglages lui-même n'en a pas,
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
        // se lâcher sur soi-même ne range rien
        if (avant && avant.dataset.id === id) return;
        deplaceModule(id, onglet, colonne, avant ? avant.dataset.id : null);
      });
      return { bloc: z, liste: liste };
    }

    // Remplit une rangée de colonnes du plan, et retient qui a trouvé sa place.
    // « premiere » reçoit en plus les cartes dont la colonne n'existe pas dans
    // cet onglet, comme la fiche les y replie au montage.
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
      // Une colonne PLEINE LARGEUR (l'inventaire de l'Équipement) n'est pas une
      // colonne de la grille : sur la fiche elle court sous les autres. Le plan
      // la met donc sous elles, dans sa propre rangée, au lieu de la serrer
      // entre deux voisines à qui elle prendrait un tiers de la place.
      var etroites = noms.filter(function (c) { return !d.larges[c]; });
      var larges = noms.filter(function (c) { return !!d.larges[c]; });
      // un onglet qui n'a QUE du pleine largeur (Art) garde sa rangée à lui
      if (!etroites.length) { etroites = larges; larges = []; }
      plan.appendChild(remplit(t.id, dedans, etroites, etroites[0]));
      larges.forEach(function (c) {
        plan.appendChild(remplit(t.id, dedans, [c], null));
      });
    });

    // Un module dont l'onglet n'existe pas (un mod mal réglé) ne se monte nulle
    // part. Sans cette rangée il serait invisible ET impossible à ranger : le
    // joueur n'aurait plus qu'à effacer le mod pour s'en défaire. Le déposer
    // dans n'importe quelle colonne d'un onglet réel le remet en jeu.
    var perdus = visibles.filter(function (m) { return !vus[m.id]; });
    if (perdus.length) {
      plan.appendChild(el("div", "pc-modgroupe", "Onglet inconnu"));
      var rp = el("div", "pc-modplan-cols");
      rp.style.gridTemplateColumns = "minmax(0, 1fr)";
      var zp = zone(TABS[0].id, "gauche", "À ranger");
      perdus.forEach(function (m) {
        zp.liste.appendChild(carte(m, "onglet « " + placeDemandee(m).onglet
          + " » inconnu : ce module ne s'affiche nulle part"));
      });
      rp.appendChild(zp.bloc);
      plan.appendChild(rp);
    }

    if (!plan.children.length) plan.appendChild(el("div", "pc-empty", "Aucun module."));
    b.appendChild(plan);
    var tools = el("div", "pc-comp-tools");
    // Ranger n'agit plus tout de suite, et il faut le DIRE : sans cette ligne,
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
    duo.appendChild(miniBtn("Recharger la fiche",
      "Reconstruire la fiche avec le rangement du plan.",
      function () {
        remount();
        flash("Fiche rechargée.");
      }));
    tools.appendChild(duo);
    b.appendChild(tools);
    return b;
  }

  // ---- mods : le code ajouté au personnage ----
  // Ce bloc dit ce que chaque mod fait (ou pourquoi il ne fait rien), donne de
  // quoi trancher, et permet d'en écrire un. Le moteur (jjk-mods.js) juge,
  // exécute et range les accords ; sans lui, ce bloc se contente de le dire.
  //
  // Aucun bac à sable : un mod autorisé tourne dans la page de la fiche avec
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
    return (window.JjkMods && typeof window.JjkMods.execute === "function") ? window.JjkMods : null;
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
  // Même règle d'id que le moteur (idPropre) et que normalize() : les trois
  // chemins doivent donner le MÊME id, sans quoi l'empreinte changerait selon
  // le chemin pris et le joueur réautoriserait un mod qu'il connaît déjà.
  function idMod(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  }
  // Un « pour » illisible est SILENCIEUSEMENT oublié par le moteur : autant le
  // dire tout de suite, sinon le joueur croit avoir posé un garde-fou qui
  // n'existe pas. La règle de lecture est CELLE DU MOTEUR, jamais une copie
  // locale : cette fonction tenait sa propre expression régulière, restée en
  // arrière quand le suffixe de beta est apparu, et le formulaire refusait
  // alors le numéro qu'il proposait lui-même en filigrane.
  function versionLisible(v) {
    var mm = window.JjkMods;
    // Sans moteur, le bloc Mods n'affiche même pas ce formulaire : ce repli ne
    // sert qu'au moteur trop ancien pour exporter sa lecture. Laisser passer
    // vaut mieux que refuser au nom d'une règle qu'on ne connaît plus, et le
    // moteur garde de toute façon le champ tel quel.
    if (!mm || typeof mm.lireVersion !== "function") return true;
    try { return !!mm.lireVersion(v); } catch (e) { return true; }
  }
  // Le formulaire d'un mod, celui de l'ajout comme celui de la modification.
  // « appliquer » reçoit des valeurs déjà validées ; rendre false laisse le
  // dialogue ouvert, avec le message qui dit pourquoi.
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
    corps.appendChild(fld("Code JavaScript (Jjk, ctx)", src));
    corps.appendChild(fld("Pour la fiche, au moins (facultatif)", pour));
    dialogue(titre, corps, function () {
      var vid = idMod(id.value) || idMod(nom.value);
      var vp = String(pour.value == null ? "" : pour.value).trim();
      var pris = false;
      if (!vid) { flash("Il faut un identifiant : des lettres, des chiffres ou des tirets."); return false; }
      (state.mods || []).forEach(function (x) { if (x !== base && x.id === vid) pris = true; });
      if (pris) { flash("L'identifiant « " + vid + " » est déjà pris par un autre mod."); return false; }
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
      // porte sur CE code et sur ce navigateur seulement ; retoucher le mod
      // change son empreinte, donc le fait redemander, et il ne vaut rien chez
      // les autres joueurs.
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
        // Le oui ne se pose QUE si l'empreinte a changé : le joueur vient alors
        // d'écrire ce code, et sans lui son propre mod lui redemanderait
        // l'autorisation à l'instant. Ouvrir puis refermer l'éditeur sans rien
        // toucher, en revanche, ne décide de rien : cela écrasait un refus
        // sans un mot, alors que la note du formulaire promet l'inverse.
        if (apres && apres !== avant) decideMod(apres, "oui");
        save();
        remount();
        flash("Mod « " + nom + " » enregistré.");
      });
  }
  // LIRE le code d'un mod ne doit pas supposer d'ouvrir l'éditeur : « Modifier »
  // sert à écrire, et valider son formulaire vaut accord. Ici rien ne bouge tant
  // que le joueur ne tranche pas, et les deux boutons sont là pour qu'il puisse
  // trancher en connaissance de cause.
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
    boutons.appendChild(miniBtn("Autoriser", "Ce code tournera à chaque ouverture, sur ce navigateur", function () {
      decideMod(emp, "oui");
      remount();
    }));
    boutons.appendChild(miniBtn("Refuser", "Ce code ne tournera pas ; il reste sur le personnage", function () {
      decideMod(emp, "non");
      remount();
    }, "danger"));
    corps.appendChild(boutons);
    // le dialogue ne valide rien : ses deux boutons ont déjà tout dit
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
  // UNE LIGNE, ET LE MOINS DE BOUTONS POSSIBLE.
  //
  // Il y en avait cinq, plus trois textes, et la ligne se repliait n'importe
  // comment. Deux d'entre eux, « Autoriser » et « Refuser », sont les deux
  // faces d'une même question : ils deviennent UNE puce, qui se lit comme
  // celle d'à côté. Les deux gestes de construction, « Modifier » et
  // « Supprimer », passent derrière le rouage du bloc, comme partout ailleurs
  // sur la fiche.
  //
  // Reste en permanence ce qu'on regarde tous les jours : le nom, l'état, de
  // quoi LIRE le code, et les deux interrupteurs.
  //
  // Les deux puces ne disent PAS la même chose, et c'est pour cela qu'elles
  // sont deux :
  //   « Actif »    appartient au PERSONNAGE et voyage avec lui ;
  //   « Autorisé » appartient à CE NAVIGATEUR et n'en sort jamais.
  // L'infobulle de chacune le dit en toutes lettres.
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

    // l'identifiant ne s'affiche plus : il ne parle qu'au code, il est dans le
    // dialogue de lecture et dans celui de modification, et il volait la place
    // qui manquait pour tenir sur une ligne
    // L'ÉTAT NE S'ÉCRIT PLUS SUR LA LIGNE : les deux puces le disent déjà.
    // « tourne » quand les deux sont allumées, « coupé » quand Actif est
    // éteinte, « refusé » quand Autorisé l'est. Le mot en gris répétait ce que
    // l'oeil voyait, et prenait la place du nom. Il reste dans l'infobulle,
    // avec l'identifiant, pour les deux cas qu'une puce ne distingue pas : en
    // attente et refusé s'éteignent pareil.
    var nom = el("span", "nom", m.nom || m.id);
    nom.title = (m.nom || m.id) + " · identifiant " + m.id + " · " +
                (aClef(ETATS_MOD, etat) ? ETATS_MOD[etat] : "état inconnu");
    barre.appendChild(nom);
    // La panne, elle, garde son marquage : le liseré rouge de la ligne et le
    // message du moteur en dessous. C'est la seule chose qu'une puce ne dit pas.
    if (etat === "panne") ligne.setAttribute("data-etat", "panne");

    // Lire d'abord : c'est le geste qu'on attend de celui qui reçoit le code
    // d'un autre, et il ne décide de rien.
    barre.appendChild(miniBtn("Voir le code", "Lire le code de ce mod sans y toucher", function () {
      voirMod(m);
    }, "voir"));

    var puceA = el("span", "pc-chip", "Actif");
    puceA.title = "Sur LE PERSONNAGE, et voyage avec lui : couper ce mod le met " +
                  "en veille pour tout le monde, sans rien effacer.";
    puceA.classList.toggle("on", on);
    puceA.addEventListener("click", function () {
      m.actif = !on;
      save();
      remount();
    });
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

    // Modifier et supprimer sont des gestes de CONSTRUCTION : ils ne s'offrent
    // que le rouage du bloc ouvert, comme les compétences et l'inventaire.
    // pc-edit-only, et non un test à la construction : le rouage bascule une
    // classe sur le bloc, il ne rebâtit pas ses lignes.
    barre.appendChild(miniBtn("Modifier", "Changer le nom, l'identifiant ou le code", function () {
      modifieMod(m);
    }, "pc-edit-only"));
    barre.appendChild(miniBtn("Supprimer", "Retirer ce mod du personnage", function () {
      supprimeMod(m);
    }, "danger pc-edit-only"));

    // Le message du moteur (la panne à réparer, la version qui manque) : c'est
    // tout ce que le joueur a pour comprendre, il prend sa propre ligne.
    if (bil && bil.message) ligne.appendChild(el("div", "pc-block-note", bil.message));
    return ligne;
  }
  function buildMods() {
    // le rouage ouvre les gestes de construction (modifier, supprimer)
    var b = block("Mods", null, "mods");
    // AUCUNE explication en tête de bloc. La fiche montre les données du
    // personnage, pas un mode d'emploi : ce qu'il faut savoir avant d'autoriser
    // du code est dit là où la décision se prend (le dialogue d'examen et le
    // formulaire), et le reste est dans la page Mods du livre.
    // Le moteur est facultatif de naissance (un repli gelé peut ne charger que
    // le bundle) : sans lui, on le dit et on ne propose rien qui n'aurait aucun
    // effet — un mod ajouté ici n'aurait ni empreinte ni accord possible.
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
  // Cette table-ci ne se remanie JAMAIS : chaque mount() en repart (modules =
  // MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui remplace un
  // module natif le remplacerait pour toujours — même désinstallé, la fiche
  // n'aurait plus l'original à remettre. Un module déplacé se recopie donc
  // avant d'être touché (appliqueDisposition).
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    { id: "caracs",     titre: "Caractéristiques",  onglet: "fiche", colonne: "gauche", build: buildCaracs },
    { id: "langues",    titre: "Langues",           onglet: "fiche", colonne: "gauche", build: buildLangues },
    { id: "initiative", titre: "Initiative",        onglet: "fiche", colonne: "milieu", build: buildInitiative },
    // Vitesse et Régén partagent une grille à deux cases qui ne se découpe
    // pas : elles ne forment qu'UN module, même si chacune garde son rouage
    { id: "tuiles",     titre: "Vitesse et Régén",  onglet: "fiche", colonne: "milieu", build: buildVitesse },
    { id: "em",         titre: "EO",                onglet: "fiche", colonne: "milieu", build: buildEm },
    { id: "pv",         titre: "PV",                onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "armescomp",  titre: "Armes",             onglet: "fiche", colonne: "milieu", build: buildArmesComps },
    { id: "comps",      titre: "Compétences",       onglet: "fiche", colonne: "droite", build: buildComps },
    // ---- onglet Art ----
    { id: "arts",       titre: "Arts et passifs",   onglet: "art", colonne: "seule", build: buildArt },
    { id: "energie",     titre: "Techniques occultes", onglet: "energie", colonne: "seule", build: buildEnergie },
    // ---- onglet Équipement ----
    { id: "armes",      titre: "Armes",             onglet: "equipement", colonne: "gauche", build: buildArmes },
    { id: "armures",    titre: "Armures",           onglet: "equipement", colonne: "droite", build: buildArmures },
    { id: "inv",        titre: "Inventaire",        onglet: "equipement", colonne: "bas",    build: buildInv },
    // ---- onglet Bio ----
    { id: "perso",      titre: "Personnalité",      onglet: "bio", colonne: "gauche", build: buildPerso },
    { id: "avantages",  titre: "Avantages",         onglet: "bio", colonne: "gauche", build: buildAvantages },
    { id: "bg",         titre: "Background",        onglet: "bio", colonne: "droite", build: buildBackground },
    { id: "notes",      titre: "Notes",             onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // À GAUCHE, dans l'ordre de la Fiche : ce qui touche aux caractéristiques
    // d'abord (leurs modificateurs, puis où est parti l'xp), la création
    // ensuite, le jeu après, et les réglages d'affichage en bas.
    // L'onglet Options se lit en DEUX COLONNES QUI SE RÉPONDENT, du plus
    // employé au plus long :
    //   en tête, ce qu'on ouvre le plus souvent : les Jets à gauche, la Fiche
    //     (exporter, importer, réinitialiser) à droite ;
    //   au deuxième rang, les deux faces de l'xp, côte à côte : ce qu'on ajoute
    //     aux caractéristiques à gauche, où l'xp est parti à droite ;
    //   au milieu, les réglages courts, répartis pour que les deux colonnes
    //     arrivent à la même hauteur ;
    //   tout en bas, les deux longues listes, qui déroulent sans fin : les
    //     Modules à gauche, les Compétences à droite.
    // L'ordre de déclaration EST l'ordre d'affichage, colonne par colonne.
    { id: "jets",       titre: "Jets",              onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",    titre: "Fiche",             onglet: "options", colonne: "droite", build: buildActions },
    { id: "modcaracs",  titre: "Modificateurs de caractéristiques", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "xpchamps",   titre: "XP par champ",      onglet: "options", colonne: "droite", build: buildXpChamps },
    // Création passe à DROITE, et ce n'est pas un choix de goût : mesuré sous
    // Firefox, les deux longues listes du bas démarraient à 139 px d'écart avec
    // ce bloc à gauche, contre 12 px une fois déplacé. Il tient d'ailleurs de
    // l'xp autant que « XP par champ », son voisin du dessus.
    { id: "creation",   titre: "Création",          onglet: "options", colonne: "droite", build: buildCreation },
    { id: "filtres",    titre: "Outils de filtre",  onglet: "options", colonne: "droite", build: buildFiltres },
    // « Affichage » n'existe que dans Roll20 : à gauche, il y compense les deux
    // blocs de réglages que porte la droite, et son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",  titre: "Affichage",         onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "mods",       titre: "Mods",              onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",    titre: "Modules",           onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",   titre: "Modificateurs de compétences", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

  // ---------- le moteur de mods ----------
  // jjk-mods.js est FACULTATIF DE NAISSANCE, exactement comme jjk-migrations.js :
  // sans lui la fiche s'ouvre, simplement sans mods. Il ne touche ni au DOM ni à
  // l'état, il reçoit la liste des mods et rend un bilan.
  //
  // Bilan du dernier passage : le bloc Options « Mods » et le bandeau de
  // consentement le lisent. Vide tant que le moteur n'a pas tourné.
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
  // reconnaître. « mod » est le repli du moteur : un mod dont on ignore le nom.
  function propEstUnMod(prop) {
    if (!prop || prop === "?") return false;
    if (prop === PROP_MOD) return true;
    return !!modDe(prop) || !!bilanDeMod(prop);
  }
  // Un mod n'a plus rien à faire tourner dès qu'il quitte le personnage, qu'on
  // le coupe ou qu'on lui retire son accord : ce qu'il a inscrit hors montage
  // (le filtre posé par l'un de ses boutons) s'arrête avec son code.
  function modAutorise(prop) {
    var m = modDe(prop);
    if (!m || m.actif === false) return false;
    return avisMod(empreinteMod(m.id, m.src)) === "oui";
  }
  function executeMods() {
    bilanMods = [];
    if (!state || !state.mods || !state.mods.length) return;
    if (!window.JjkMods || typeof window.JjkMods.execute !== "function") return;
    var avant = proprietaireCourant;
    // Un mod qui pose un filtre le fait pendant que le moteur l'exécute : le
    // propriétaire du moment lui revient. Le moteur peut nommer le mod qu'il
    // lance (Jjk.__proprietaire) ; s'il ne le fait pas, faute de mieux, tout ce
    // qui s'enregistre là appartient à « mod ».
    proprietaireCourant = PROP_MOD;
    try {
      var b = window.JjkMods.execute(state.mods, window.Jjk, { version: RELEASE, schema: SCHEMA });
      if (Array.isArray(b)) bilanMods = b;
      // Le bilan se range et se tait : une faute de syntaxe dans un mod ne
      // laissait RIEN dans la console du navigateur, alors que la page Mods dit
      // d'y regarder en premier. Le message part au même format que les autres
      // ennuis de module (« [mod:<id>] »), pour qu'un filtre sur « [mod: »
      // ramasse tout ce qui concerne un mod, d'où que ça vienne.
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
  // on le bâtit une fois à vide, dans un élément détaché, plutôt que de recopier
  // ici une liste de colonnes qui dériverait au premier onglet remanié.
  function colonnesDe(onglet) {
    if (!aClef(SQUELETTES, onglet)) return null;
    var noms = {};
    var c = SQUELETTES[onglet](el("div"));
    Object.keys(c || {}).forEach(function (k) { noms[k] = 1; });
    return noms;
  }
  // Les colonnes d'un onglet, DANS L'ORDRE, en distinguant celles qui courent
  // sur toute la largeur. Le squelette les reconnaît lui-même : une colonne
  // pleine largeur rend le PANNEAU au lieu d'une colonne de la grille (c'est
  // ainsi que l'inventaire passe sous les deux colonnes de l'Équipement). Le
  // plan a besoin de la distinction pour se dessiner comme la fiche.
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
  // state.modules : l'ordre d'abord, la place ensuite. Une consigne qui ne
  // désigne rien de valide (module inconnu, onglet disparu, colonne qui
  // n'existe plus dans ce squelette) est simplement ignorée : elle laisserait
  // sinon le module hors de la fiche, sans rien pour l'y ramener.
  function appliqueDisposition() {
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
      var colonne = (typeof p.colonne === "string" && aClef(cols, p.colonne)) ? p.colonne : null;
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
  // La fiche s'ouvre TOUJOURS : un mod en attente ne bloque rien, il ne tourne
  // pas, c'est tout. (L'écran de version, lui, protège des données : il bloque.
  // Mais il ne paraît plus qu'au désaccord de SCHÉMA, jamais sur un simple
  // écart de numéro de release.)
  function modsEnAttente() {
    if (!state || !state.mods || !state.mods.length) return [];
    if (!window.JjkMods || typeof window.JjkMods.enAttente !== "function") return [];
    try {
      // MÊME repère que executeMods, sans quoi les deux écrans se contredisent :
      // sans version ni schéma, le moteur saute ses deux contrôles, un mod
      // « pour: 4.0.0 » est annoncé « pas autorisé », le joueur l'autorise, et
      // le bloc Mods lui répond « trop récent ». Le oui ainsi arraché dort dans
      // le navigateur et s'appliquerait tout seul le jour de la 4.0.0.
      var a = window.JjkMods.enAttente(state.mods, { version: RELEASE, schema: SCHEMA });
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function decideMod(empreinte, avis) {
    if (!window.JjkMods || typeof window.JjkMods.decide !== "function") return;
    try { window.JjkMods.decide(empreinte, avis); } catch (e) {}
  }
  // Le dialogue d'examen : le code de chaque mod, en clair, et deux boutons.
  // Une décision remonte la fiche aussitôt (le mod autorisé doit tourner, et
  // le bandeau doit dire la vérité) : le dialogue part avec l'ancien DOM,
  // le bandeau restant se rouvre d'un clic s'il reste des mods à juger.
  function examinerMods(attente) {
    var corps = el("div", "pc-modal-body");
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
      boutons.appendChild(miniBtn("Autoriser", "Ce mod tournera à chaque ouverture, sur ce navigateur", function () {
        decideMod(m.empreinte, "oui");
        remount();
      }, "primary"));
      boutons.appendChild(miniBtn("Refuser", "Ce mod ne tournera pas ; il reste sur le personnage", function () {
        decideMod(m.empreinte, "non");
        remount();
      }, "danger"));
      corps.appendChild(boutons);
    });
    dialogue("Mods en attente d'autorisation", corps, function () { remount(); }, "Terminer");
  }
  function bandeauAvis(app) {
    var attente = modsEnAttente();
    if (!attente.length) return;
    var n = attente.length;
    // .pc-avis-mods : le bandeau de CONSENTEMENT, distinct de celui de perte
    // d'enregistrement, qui partage la même mise en forme (voir montrePanneSave)
    var av = el("div", "pc-avis pc-avis-mods");
    av.appendChild(el("div", "pc-avis-txt",
      "Ce personnage porte " + n + " mod" + (n > 1 ? "s" : "") + " qui n'" +
      (n > 1 ? "ont" : "a") + " pas été autorisé" + (n > 1 ? "s" : "") +
      " sur ce navigateur. " + (n > 1 ? "Ils ne tournent" : "Il ne tourne") + " pas."));
    var row = el("div", "row");
    row.appendChild(miniBtn("Examiner", "Lire le code de chaque mod avant de décider", function () {
      examinerMods(attente);
    }));
    row.appendChild(miniBtn("Tout refuser", "Aucun de ces mods ne tournera sur ce navigateur", function () {
      attente.forEach(function (m) { decideMod(m.empreinte, "non"); });
      remount();
    }, "danger"));
    av.appendChild(row);
    app.appendChild(av);
  }

  // La fiche expose UN objet public : c'est par là qu'un mod remplace un
  // module, change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__jjkModules est l'ANCIEN nom du MÊME objet : ce qui a
  // été écrit avant la 3.0.0 continue de marcher tel quel.
  window.Jjk = {
    // Sentinelle de montage consommée par l'amorce Roll20. Le chargement d'un
    // script n'implique pas que ses données asynchrones soient prêtes : seule
    // __pret=true, posé après mount(), autorise l'ouverture et les écritures.
    __pret: false,
    __erreur: "",
    // Les deux annoncent ce qu'ils ont toujours annoncé, mais ils ne se
    // déduisent plus l'un de l'autre : version porte le suffixe de beta le
    // cas échéant, schema est un entier libre. Un mod qui tirerait le schéma
    // du majeur de la version se tromperait à la première divergence, et le
    // moteur de mods offre JjkMods.lireVersion pour ne pas avoir à découper
    // le numéro soi-même.
    version: RELEASE,
    schema: SCHEMA,
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    // l'interrupteur : couper un module le retire de la fiche sans rien
    // effacer (son coffre et ses données restent, il ne s'affiche plus)
    active: activeModule,
    // de quoi afficher l'état d'un module : ses pannes, sa muselière
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    // filtrer un calcul de la fiche (les neuf points de FILTRES_CONNUS)
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur de mods, en COPIE : vide tant qu'il
    // n'a pas tourné. « actif » vient de l'état (l'interrupteur du joueur),
    // « etat » du moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id. Sans cet appel
    // ils reviennent tous à « mod », ce qui n'est faux que dans le journal.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le module
      // au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, la page Mods ne les nomme pas, et un mod qui
    // s'y appuie le fait à ses risques. Ils existent parce qu'une sonde qui
    // lirait les valeurs dans le DOM mesurerait la MISE EN FORME autant que le
    // calcul : « 30 » et « 30 m » se ressemblent trop pour juger d'un filtre.
    __calculs: {
      caracTotal: caracTotal, caracJet: caracJet, compValue: compValue, compXp: compXp,
      pvMax: pvMax, pvCourant: pvCourant, initiative: initiative,
      vitesse: vitesse, vitesseVal: vitesseVal, regen: regen,
      poidsPorte: poidsPorte, poidsMalus: poidsMalus, xpDepense: xpDepense
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
  window.__jjkModules = window.Jjk;

  // ---------- montage ----------
  // Un montage ne se relance JAMAIS depuis lui-même. Un mod qui finit par
  // Jjk.remonte() (geste naturel, et la page Mods documente remonte() sans
  // réserve) ou par ctx.reconstruire() rappellerait mount() DEPUIS mount() :
  // les mods repartiraient, redemanderaient un remontage, la pile déborderait,
  // et chaque niveau qui se dépile reprendrait son montage là où il en était
  // (page vidée, vingt-cinq blocs rebâtis, refresh, save). L'onglet gèle, à
  // CHAQUE ouverture puisque le mod voyage avec le personnage, et le joueur
  // n'atteint plus le bloc Mods pour couper le fautif. La demande est donc
  // notée et honorée UNE SEULE FOIS, le montage courant fini.
  //
  // La garde est ici et pas dans remount() : tout ce qui remonte la fiche passe
  // par mount(), remount() comme le premier montage.
  var montageEnCours = false;
  var remontageDu = false;
  var remontagesDus = 0;       // enchaînements, pour le mod qui en redemande à chaque fois
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
      // et il a pu laisser une demande de remontage en l'air : la queue de
      // mount() est sautée quand l'exception passe, si bien que le PROCHAIN
      // montage, réussi celui-là, payait un remontage gratuit hérité d'un
      // montage qui n'a jamais abouti.
      if (!abouti) { remontageDu = false; remontagesDus = 0; }
    }
    if (!remontageDu) { remontagesDus = 0; return; }
    remontageDu = false;
    // Un mod qui redemande un remontage à chaque montage boucle sans fin : on
    // s'arrête au bout de trois enchaînements et on le dit dans le journal. La
    // fiche reste utilisable, donc le bloc Mods aussi.
    if (remontagesDus >= REMONTAGES_MAX) {
      if (window.console && window.console.warn)
        window.console.warn("[fiche] remontage en boucle : demande ignorée. Un mod appelle Jjk.remonte() à chaque montage.");
      remontagesDus = 0;
      return;
    }
    remontagesDus++;
    mount(root);
  }
  function montage(root) {
    // Les observateurs et écouteurs du montage précédent ne doivent jamais
    // survivre à une reconstruction complète de la fiche.
    remontageNettoyage.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
    // Les références DOM et leurs empreintes appartiennent au montage : la
    // première passe du nouvel arbre doit réinitialiser tous les hooks.
    refreshEmpreintes = null;
    rootEl = root;
    enMontage = true;
    // tous les registres repartent à vide : les anciens pointent sur un DOM
    // qui n'existe plus. Les compteurs de panne aussi : un remontage est une
    // seconde chance, c'est ce que fait le bouton « Réessayer ».
    regHors = [];
    regsModules = {};
    etatsModules = {};
    hooks = regHors;
    compHooks = [];
    optHooks = [];
    optCompsRebuild = null;
    // Filtres et table des modules : même remise à zéro, même raison. Ce sont
    // les mods et les modules qui les repeuplent, à chaque montage. Sans elle,
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
    // ne remanie la table. C'est elle qui dit où un module retourne quand on
    // rétablit la disposition d'origine, et le plan s'en sert pour montrer un
    // rangement encore en attente : sans elle, la table en mémoire porte déjà
    // la place forcée et plus rien ne sait d'où le module venait.
    placeOrigine = {};
    modules.forEach(function (m) {
      placeOrigine[m.id] = { onglet: m.onglet, colonne: m.colonne };
    });
    appliqueDisposition();
    root.innerHTML = "";
    var app = el("div", "perso-atelier");
    appEl = app;

    buildTop(app);
    bandeauAvis(app);
    var sheet = el("div", "pc-sheet");
    app.appendChild(sheet);
    root.appendChild(app);

    buildHead(sheet);
    monteModules(buildTabs(sheet));
    enMontage = false;   // ce qui s'enregistre après (console) vaut pour le montage suivant
    refresh();
    // Un message de présence peut être arrivé avant le bundle : appliquer le
    // mode partagé une seconde fois après que tous les champs existent évite
    // de laisser l'en-tête éditable à l'ouverture en Consultation.
    if (typeof window.__jjkApplyMode === "function") window.__jjkApplyMode();
  }

  // Charger les données et MONTER sont deux pannes différentes, et elles ne se
  // disent pas de la même façon. Le montage vivait dans le .then() du fetch :
  // tout ce qui tombait pendant lui (le plus souvent un mod) se faisait
  // rattraper par le .catch d'à côté, qui accusait alors le fichier de données
  // d'une faute qui n'était pas la sienne — et data-ready interdisant le
  // réessai, la fiche restait close sur un message faux. Chacun son filet.
  // Les opérations reçues des autres fenêtres sont fusionnées par Compact.
  // Une relecture serveur toutes les 1,2 s n'est PAS un motif pour remonter
  // toute la fiche : Outward ne reconstruit que les modules dont la structure
  // a changé, puis restaure le focus et les défilements. Sans cela, chaque
  // écriture distante détruisait tous les champs, les brouillons et les menus.
  function recoitEtatCollaboratif(distant) {
    if (!distant || typeof distant !== "object" || !rootEl) return;
    var s;
    try { s = normalize(distant); }
    catch (e) { if (window.console && window.console.error) window.console.error("[fiche] état distant invalide", e); return; }
    function stable(v) {
      try {
        if (window.JjkSync && window.JjkSync.Compact && typeof window.JjkSync.Compact.stable === "function")
          return window.JjkSync.Compact.stable(v);
      } catch (e) {}
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    if (stable(s) === stable(state)) return;
    var keys = Object.keys(state).concat(Object.keys(s).filter(function (k) {
      return !Object.prototype.hasOwnProperty.call(state, k);
    }));
    var changes = keys.filter(function (k) { return stable(s[k]) !== stable(state[k]); });
    if (!changes.length) return;

    // Clés qui changent la liste ou la structure d'un module JJK. Les valeurs
    // simples restent dans les hooks de refresh, sans détruire les champs.
    var structural = {
      notes: ["notes"], notesJournal: ["notes"], background: ["bg"],
      avantages: ["avantages"],
      comps: ["comps", "optcomps", "armescomp"],
      customComps: ["comps", "optcomps"],
      compsMod: ["comps", "optcomps", "armescomp"],
      compsMod2: ["comps", "optcomps", "armescomp"],
      compsXpMod2: ["comps", "optcomps", "armescomp"],
      compsForce: ["comps", "optcomps", "armescomp"],
      compsXpForce: ["comps", "optcomps", "armescomp"],
      compsXpMod: ["comps", "optcomps", "armescomp"],
      armesComps: ["comps", "optcomps", "armescomp"],
      langues: ["langues", "comps", "optcomps"],
      armes: ["armes"], armures: ["armures"],
      energie: ["energie"],
      inv: ["inv"], inventaire: ["inv"], de: ["jets"]
    };
    var scalar = [
      "v", "rel", "name", "portrait", "espece", "age", "sexe", "genre",
      "defaut", "qualites", "sansLimite", "caracsPlafondMod", "caracsPlafondForce",
      "ptsCreaMod", "ptsCreaForce", "caracsBase", "caracsXp", "caracsMod",
      "caracsMod2", "caracsForce", "caracsXpForce", "caracsXpMod",
      "caracsXpMod2", "xpTotal", "pv", "narration", "divers",
      "pvMaxOverride", "vitesseOverride", "regenOverride", "langueBase"
    ];
    var targets = [];
    var partial = !modulesPersoActifs() && changes.every(function (k) {
      return Object.prototype.hasOwnProperty.call(structural, k) || scalar.indexOf(k) >= 0;
    });
    if (partial) changes.forEach(function (k) {
      (structural[k] || []).forEach(function (id) { if (targets.indexOf(id) < 0) targets.push(id); });
    });

    var active = document.activeElement, focus = null, positions = [];
    function signature(c) {
      return [c.tagName, c.type || "", c.className || "",
        c.getAttribute("placeholder") || "", c.getAttribute("aria-label") || ""].join("|");
    }
    function anchor(c) {
      var a = c.closest("[data-sync-entity], [data-id], [data-module]") || rootEl;
      var m = a.closest("[data-module]");
      return { module: m ? m.dataset.module : "",
        entity: a.dataset ? (a.dataset.syncEntity || a.dataset.id || "") : "", el: a };
    }
    if (active && rootEl.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
      var a = anchor(active), sig = signature(active);
      var similar = Array.prototype.filter.call(a.el.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === sig; });
      focus = { module: a.module, entity: a.entity, signature: sig, index: similar.indexOf(active),
        value: active.value, start: active.selectionStart, end: active.selectionEnd,
        direction: active.selectionDirection, scroll: active.scrollTop };
    }
    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    Array.prototype.forEach.call(rootEl.querySelectorAll("[data-module]"), function (m) {
      if (partial && targets.indexOf(m.dataset.module) < 0) return;
      Array.prototype.forEach.call(m.querySelectorAll("*"), function (n, i) {
        if (n.scrollTop || n.scrollLeft) positions.push({ module: m.dataset.module, index: i, top: n.scrollTop, left: n.scrollLeft });
      });
    });

    if (partial) {
      changes.forEach(function (k) {
        if (s[k] === undefined) delete state[k];
        else state[k] = s[k];
      });
      reconstruitModules(targets);
      refresh();
    } else {
      state = s;
      mount(rootEl);
    }

    positions.forEach(function (p) {
      var m = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === p.module; });
      var n = m && m.querySelectorAll("*")[p.index];
      if (n) { n.scrollTop = p.top; n.scrollLeft = p.left; }
    });
    if (focus) {
      var scope = rootEl;
      if (focus.module) scope = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === focus.module; });
      if (scope && focus.entity) scope = Array.prototype.find.call(scope.querySelectorAll("[data-sync-entity], [data-id]"), function (n) { return (n.dataset.syncEntity || n.dataset.id) === focus.entity; });
      if (scope) {
        var fields = Array.prototype.filter.call(scope.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === focus.signature; });
        var field = fields[focus.index];
        if (field && !field.disabled) {
          field.focus({ preventScroll: true });
          field.value = focus.value;
          try { if (focus.start !== null) field.setSelectionRange(focus.start, focus.end, focus.direction); } catch (e) {}
          field.scrollTop = focus.scroll;
        }
      }
    }
    try { window.scrollTo(sx, sy); } catch (e) {}
  }

  window.addEventListener("jjk-compact-sync", function (ev) {
    if (!ev || !ev.detail || typeof ev.detail !== "object" || !rootEl) return;
    try { recoitEtatCollaboratif(ev.detail); }
    catch (e) { if (window.console && window.console.error) window.console.error("[fiche] resynchronisation distante", e); }
  });

  function signaleEchecOuverture(e) {
    var message = messageErreur(e);
    if (window.Jjk) { window.Jjk.__pret = false; window.Jjk.__erreur = message; }
    try { window.dispatchEvent(new CustomEvent("jjk-fiche-mount-error", { detail: message })); } catch (ignore) {}
  }
  function demarre(root) {
    if (window.Jjk) { window.Jjk.__pret = false; window.Jjk.__erreur = ""; }
    state = load() || blank();
    try {
      mount(root);
      // Outward expose la même sentinelle : l'amorce ne déclare le bundle
      // monté qu'après la construction effective du DOM et le premier refresh.
      if (window.Jjk) { window.Jjk.__erreur = ""; window.Jjk.__pret = true; }
      try { window.dispatchEvent(new CustomEvent("jjk-fiche-mounted")); } catch (ignore) {}
    }
    catch (e) {
      signaleEchecOuverture(e);
      if (window.console && window.console.error) window.console.error("[fiche] montage", e);
      root.innerHTML = '<p style="padding:2rem;color:#b0402c">La fiche n\'a pas pu se monter (' +
        messageErreur(e) + "). Les données, elles, sont chargées : la cause est dans la fiche ou dans un mod.</p>";
    }
  }
  function init() {
    var root = document.getElementById("perso-atelier");
    if (!root || root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    // point d'entrée des objets donnés au tchat : l'amorce Roll20 appelle ceci
    // quand le joueur clique « Prendre » (et rejoue ce qui attendait le montage)
    window.__jjkOnTake = function (payload) {
      if (!state) { flash("La fiche n'est pas encore prête : reclique « Prendre »."); return; }
      recevoirObjet(payload);
    };
    if (DATA) { demarre(root); return; }
    fetch(dataUrl(), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      // DATA vide vaut échec : sans lui le montage partirait sans données, et
      // c'est bien du fichier qu'il faudrait alors se plaindre
      .then(function (d) { if (!d) throw new Error("données vides"); DATA = d; })
      .catch(function (e) {
        signaleEchecOuverture(e);
        root.innerHTML = '<p style="padding:2rem;color:#b0402c">Le créateur n\'a pas pu charger ses données (' + e.message + ").</p>";
      })
      // hors de portée du .catch ci-dessus : DATA dit si les données sont là
      .then(function () { if (DATA) demarre(root); });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
