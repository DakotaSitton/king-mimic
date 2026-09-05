var TH="185",pU={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},mU={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},SH=0,WW=1,jH=2,dU=3,lU=0,c7=1,yH=2,q7=3,F7=0,sJ=1,L9=2,V9=0,n7=1,ZW=2,KW=3,HW=4,vH=5,uU=6,D7=100,fH=101,bH=102,hH=103,xH=104,gH=200,pH=201,mH=202,dH=203,lH=204,uH=205,cH=206,nH=207,sH=208,iH=209,oH=210,aH=211,rH=212,tH=213,eH=214,JY=0,QY=1,$Y=2,YW=3,WY=4,ZY=5,KY=6,HY=7,YY=0,XY=1,UY=2,E9=0,XW=1,UW=2,GW=3,NW=4,EW=5,qW=6,FW=7,cU="attached",nU="detached",sU=300,O7=301,_8=302,UQ=303,GQ=304,s7=306,GY=1000,NQ=1001,NY=1002,J8=1003,EY=1004,iU=1004,i7=1005,oU=1005,iJ=1006,EQ=1007,aU=1007,C8=1008,rU=1008,q9=1009,qY=1010,FY=1011,o7=1012,DW=1013,Q8=1014,h9=1015,x9=1016,OW=1017,RW=1018,R7=1020,DY=35902,OY=35899,RY=1021,kY=1022,B9=1023,P8=1026,T8=1027,MY=1028,kW=1029,S8=1030,MW=1031,tU=1032,LW=1033,qQ=33776,FQ=33777,DQ=33778,OQ=33779,VW=35840,BW=35841,zW=35842,IW=35843,AW=36196,wW=37492,_W=37496,CW=37488,PW=37489,RQ=37490,TW=37491,SW=37808,jW=37809,yW=37810,vW=37811,fW=37812,bW=37813,hW=37814,xW=37815,gW=37816,pW=37817,mW=37818,dW=37819,lW=37820,uW=37821,cW=36492,nW=36494,sW=36495,iW=36283,oW=36284,kQ=36285,aW=36286,eU=2200,JG=2201,QG=2202,$G=2300,WG=2301,ZG=2302,KG=2303,HG=2400,YG=2401,XG=2402,UG=2500,GG=2501,NG=0,EG=1,qG=2,FG=3200,DG=3201,OG=3202,RG=3203,rW=0,LY=1,j8="",VY="srgb",tW="srgb-linear",eW="linear",qJ="srgb",kG="",MG="rg",LG="ga",VG=0,BG=7680,zG=7681,IG=7682,AG=7683,wG=34055,_G=34056,CG=5386,PG=512,TG=513,SG=514,jG=515,yG=516,vG=517,fG=518,bG=519,BY=512,zY=513,IY=514,MQ=515,AY=516,wY=517,LQ=518,_Y=519,hG=35044,xG=35048,gG=35040,pG=35045,mG=35049,dG=35041,lG=35046,uG=35050,cG=35042,nG="100",JZ="300 es",QZ=2000,sG=2001,iG={COMPUTE:"compute",RENDER:"render"},oG={PERSPECTIVE:"perspective",LINEAR:"linear",FLAT:"flat"},aG={NORMAL:"normal",CENTROID:"centroid",SAMPLE:"sample",FIRST:"first",EITHER:"either"},rG={TEXTURE_COMPARE:"depthTextureCompare"};function tG(J){for(let Q=J.length-1;Q>=0;--Q)if(J[Q]>=65535)return!0;return!1}var eG={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};function H7(J,Q){return new eG[J](Q)}function CY(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}function X7(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function PY(){let J=X7("canvas");return J.style.display="block",J}var LK={},t9=null;function JN(J){t9=J}function QN(){return t9}function m7(...J){let Q="THREE."+J.shift();if(t9)t9("log",Q,...J);else console.log(Q,...J)}function TY(J){let Q=J[0];if(typeof Q==="string"&&Q.startsWith("TSL:")){let $=J[1];if($&&$.isStackTrace)J[0]+=" "+$.getLocation();else J[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return J}function Y0(...J){J=TY(J);let Q="THREE."+J.shift();if(t9)t9("warn",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.warn($.getError(Q));else console.warn(Q,...J)}}function T0(...J){J=TY(J);let Q="THREE."+J.shift();if(t9)t9("error",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.error($.getError(Q));else console.error(Q,...J)}}function r9(...J){let Q=J.join(" ");if(Q in LK)return;LK[Q]=!0,Y0(...J)}function SY(J,Q,$){return new Promise(function(W,Z){function K(){switch(J.clientWaitSync(Q,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:Z();break;case J.TIMEOUT_EXPIRED:setTimeout(K,$);break;default:W()}}setTimeout(K,$)})}var jY={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class K9{addEventListener(J,Q){if(this._listeners===void 0)this._listeners={};let $=this._listeners;if($[J]===void 0)$[J]=[];if($[J].indexOf(Q)===-1)$[J].push(Q)}hasEventListener(J,Q){let $=this._listeners;if($===void 0)return!1;return $[J]!==void 0&&$[J].indexOf(Q)!==-1}removeEventListener(J,Q){let $=this._listeners;if($===void 0)return;let W=$[J];if(W!==void 0){let Z=W.indexOf(Q);if(Z!==-1)W.splice(Z,1)}}dispatchEvent(J){let Q=this._listeners;if(Q===void 0)return;let $=Q[J.type];if($!==void 0){J.target=this;let W=$.slice(0);for(let Z=0,K=W.length;Z<K;Z++)W[Z].call(this,J);J.target=null}}}var fJ=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],VK=1234567,B8=Math.PI/180,z8=180/Math.PI;function eJ(){let J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,$=Math.random()*4294967295|0,W=Math.random()*4294967295|0;return(fJ[J&255]+fJ[J>>8&255]+fJ[J>>16&255]+fJ[J>>24&255]+"-"+fJ[Q&255]+fJ[Q>>8&255]+"-"+fJ[Q>>16&15|64]+fJ[Q>>24&255]+"-"+fJ[$&63|128]+fJ[$>>8&255]+"-"+fJ[$>>16&255]+fJ[$>>24&255]+fJ[W&255]+fJ[W>>8&255]+fJ[W>>16&255]+fJ[W>>24&255]).toLowerCase()}function g0(J,Q,$){return Math.max(Q,Math.min($,J))}function $Z(J,Q){return(J%Q+Q)%Q}function $N(J,Q,$,W,Z){return W+(J-Q)*(Z-W)/($-Q)}function WN(J,Q,$){if(J!==Q)return($-J)/(Q-J);else return 0}function x7(J,Q,$){return(1-$)*J+$*Q}function ZN(J,Q,$,W){return x7(J,Q,1-Math.exp(-$*W))}function KN(J,Q=1){return Q-Math.abs($Z(J,Q*2)-Q)}function HN(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*(3-2*J)}function YN(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*J*(J*(J*6-15)+10)}function XN(J,Q){return J+Math.floor(Math.random()*(Q-J+1))}function UN(J,Q){return J+Math.random()*(Q-J)}function GN(J){return J*(0.5-Math.random())}function NN(J){if(J!==void 0)VK=J;let Q=VK+=1831565813;return Q=Math.imul(Q^Q>>>15,Q|1),Q^=Q+Math.imul(Q^Q>>>7,Q|61),((Q^Q>>>14)>>>0)/4294967296}function EN(J){return J*B8}function qN(J){return J*z8}function FN(J){return(J&J-1)===0&&J!==0}function DN(J){return Math.pow(2,Math.ceil(Math.log(J)/Math.LN2))}function ON(J){return Math.pow(2,Math.floor(Math.log(J)/Math.LN2))}function RN(J,Q,$,W,Z){let{cos:K,sin:H}=Math,Y=K($/2),X=H($/2),U=K((Q+W)/2),N=H((Q+W)/2),E=K((Q-W)/2),G=H((Q-W)/2),q=K((W-Q)/2),O=H((W-Q)/2);switch(Z){case"XYX":J.set(Y*N,X*E,X*G,Y*U);break;case"YZY":J.set(X*G,Y*N,X*E,Y*U);break;case"ZXZ":J.set(X*E,X*G,Y*N,Y*U);break;case"XZX":J.set(Y*N,X*O,X*q,Y*U);break;case"YXY":J.set(X*q,Y*N,X*O,Y*U);break;case"ZYZ":J.set(X*O,X*q,Y*N,Y*U);break;default:Y0("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+Z)}}function dJ(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("THREE.MathUtils: Invalid component type.")}}function o0(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("THREE.MathUtils: Invalid component type.")}}var kN={DEG2RAD:B8,RAD2DEG:z8,generateUUID:eJ,clamp:g0,euclideanModulo:$Z,mapLinear:$N,inverseLerp:WN,lerp:x7,damp:ZN,pingpong:KN,smoothstep:HN,smootherstep:YN,randInt:XN,randFloat:UN,randFloatSpread:GN,seededRandom:NN,degToRad:EN,radToDeg:qN,isPowerOfTwo:FN,ceilPowerOfTwo:DN,floorPowerOfTwo:ON,setQuaternionFromProperEuler:RN,normalize:o0,denormalize:dJ};class a{static{a.prototype.isVector2=!0}constructor(J=0,Q=0){this.x=J,this.y=Q}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,Q){return this.x=J,this.y=Q,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;default:throw Error("THREE.Vector2: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("THREE.Vector2: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let Q=this.x,$=this.y,W=J.elements;return this.x=W[0]*Q+W[3]*$+W[6],this.y=W[1]*Q+W[4]*$+W[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,Q){return this.x=g0(this.x,J.x,Q.x),this.y=g0(this.y,J.y,Q.y),this}clampScalar(J,Q){return this.x=g0(this.x,J,Q),this.y=g0(this.y,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(g0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(g0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y;return Q*Q+$*$}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this}rotateAround(J,Q){let $=Math.cos(Q),W=Math.sin(Q),Z=this.x-J.x,K=this.y-J.y;return this.x=Z*$-K*W+J.x,this.y=Z*W+K*$+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class xJ{constructor(J=0,Q=0,$=0,W=1){this.isQuaternion=!0,this._x=J,this._y=Q,this._z=$,this._w=W}static slerpFlat(J,Q,$,W,Z,K,H){let Y=$[W+0],X=$[W+1],U=$[W+2],N=$[W+3],E=Z[K+0],G=Z[K+1],q=Z[K+2],O=Z[K+3];if(N!==O||Y!==E||X!==G||U!==q){let R=Y*E+X*G+U*q+N*O;if(R<0)E=-E,G=-G,q=-q,O=-O,R=-R;let D=1-H;if(R<0.9995){let F=Math.acos(R),I=Math.sin(F);D=Math.sin(D*F)/I,H=Math.sin(H*F)/I,Y=Y*D+E*H,X=X*D+G*H,U=U*D+q*H,N=N*D+O*H}else{Y=Y*D+E*H,X=X*D+G*H,U=U*D+q*H,N=N*D+O*H;let F=1/Math.sqrt(Y*Y+X*X+U*U+N*N);Y*=F,X*=F,U*=F,N*=F}}J[Q]=Y,J[Q+1]=X,J[Q+2]=U,J[Q+3]=N}static multiplyQuaternionsFlat(J,Q,$,W,Z,K){let H=$[W],Y=$[W+1],X=$[W+2],U=$[W+3],N=Z[K],E=Z[K+1],G=Z[K+2],q=Z[K+3];return J[Q]=H*q+U*N+Y*G-X*E,J[Q+1]=Y*q+U*E+X*N-H*G,J[Q+2]=X*q+U*G+H*E-Y*N,J[Q+3]=U*q-H*N-Y*E-X*G,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,Q,$,W){return this._x=J,this._y=Q,this._z=$,this._w=W,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,Q=!0){let{_x:$,_y:W,_z:Z,_order:K}=J,H=Math.cos,Y=Math.sin,X=H($/2),U=H(W/2),N=H(Z/2),E=Y($/2),G=Y(W/2),q=Y(Z/2);switch(K){case"XYZ":this._x=E*U*N+X*G*q,this._y=X*G*N-E*U*q,this._z=X*U*q+E*G*N,this._w=X*U*N-E*G*q;break;case"YXZ":this._x=E*U*N+X*G*q,this._y=X*G*N-E*U*q,this._z=X*U*q-E*G*N,this._w=X*U*N+E*G*q;break;case"ZXY":this._x=E*U*N-X*G*q,this._y=X*G*N+E*U*q,this._z=X*U*q+E*G*N,this._w=X*U*N-E*G*q;break;case"ZYX":this._x=E*U*N-X*G*q,this._y=X*G*N+E*U*q,this._z=X*U*q-E*G*N,this._w=X*U*N+E*G*q;break;case"YZX":this._x=E*U*N+X*G*q,this._y=X*G*N+E*U*q,this._z=X*U*q-E*G*N,this._w=X*U*N-E*G*q;break;case"XZY":this._x=E*U*N-X*G*q,this._y=X*G*N-E*U*q,this._z=X*U*q+E*G*N,this._w=X*U*N+E*G*q;break;default:Y0("Quaternion: .setFromEuler() encountered an unknown order: "+K)}if(Q===!0)this._onChangeCallback();return this}setFromAxisAngle(J,Q){let $=Q/2,W=Math.sin($);return this._x=J.x*W,this._y=J.y*W,this._z=J.z*W,this._w=Math.cos($),this._onChangeCallback(),this}setFromRotationMatrix(J){let Q=J.elements,$=Q[0],W=Q[4],Z=Q[8],K=Q[1],H=Q[5],Y=Q[9],X=Q[2],U=Q[6],N=Q[10],E=$+H+N;if(E>0){let G=0.5/Math.sqrt(E+1);this._w=0.25/G,this._x=(U-Y)*G,this._y=(Z-X)*G,this._z=(K-W)*G}else if($>H&&$>N){let G=2*Math.sqrt(1+$-H-N);this._w=(U-Y)/G,this._x=0.25*G,this._y=(W+K)/G,this._z=(Z+X)/G}else if(H>N){let G=2*Math.sqrt(1+H-$-N);this._w=(Z-X)/G,this._x=(W+K)/G,this._y=0.25*G,this._z=(Y+U)/G}else{let G=2*Math.sqrt(1+N-$-H);this._w=(K-W)/G,this._x=(Z+X)/G,this._y=(Y+U)/G,this._z=0.25*G}return this._onChangeCallback(),this}setFromUnitVectors(J,Q){let $=J.dot(Q)+1;if($<0.00000001)if($=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=$;else this._x=0,this._y=-J.z,this._z=J.y,this._w=$;else this._x=J.y*Q.z-J.z*Q.y,this._y=J.z*Q.x-J.x*Q.z,this._z=J.x*Q.y-J.y*Q.x,this._w=$;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(g0(this.dot(J),-1,1)))}rotateTowards(J,Q){let $=this.angleTo(J);if($===0)return this;let W=Math.min(1,Q/$);return this.slerp(J,W),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,Q){let{_x:$,_y:W,_z:Z,_w:K}=J,H=Q._x,Y=Q._y,X=Q._z,U=Q._w;return this._x=$*U+K*H+W*X-Z*Y,this._y=W*U+K*Y+Z*H-$*X,this._z=Z*U+K*X+$*Y-W*H,this._w=K*U-$*H-W*Y-Z*X,this._onChangeCallback(),this}slerp(J,Q){let{_x:$,_y:W,_z:Z,_w:K}=J,H=this.dot(J);if(H<0)$=-$,W=-W,Z=-Z,K=-K,H=-H;let Y=1-Q;if(H<0.9995){let X=Math.acos(H),U=Math.sin(X);Y=Math.sin(Y*X)/U,Q=Math.sin(Q*X)/U,this._x=this._x*Y+$*Q,this._y=this._y*Y+W*Q,this._z=this._z*Y+Z*Q,this._w=this._w*Y+K*Q,this._onChangeCallback()}else this._x=this._x*Y+$*Q,this._y=this._y*Y+W*Q,this._z=this._z*Y+Z*Q,this._w=this._w*Y+K*Q,this.normalize();return this}slerpQuaternions(J,Q,$){return this.copy(J).slerp(Q,$)}random(){let J=2*Math.PI*Math.random(),Q=2*Math.PI*Math.random(),$=Math.random(),W=Math.sqrt(1-$),Z=Math.sqrt($);return this.set(W*Math.sin(J),W*Math.cos(J),Z*Math.sin(Q),Z*Math.cos(Q))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,Q=0){return this._x=J[Q],this._y=J[Q+1],this._z=J[Q+2],this._w=J[Q+3],this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._w,J}fromBufferAttribute(J,Q){return this._x=J.getX(Q),this._y=J.getY(Q),this._z=J.getZ(Q),this._w=J.getW(Q),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{static{P.prototype.isVector3=!0}constructor(J=0,Q=0,$=0){this.x=J,this.y=Q,this.z=$}set(J,Q,$){if($===void 0)$=this.z;return this.x=J,this.y=Q,this.z=$,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;default:throw Error("THREE.Vector3: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("THREE.Vector3: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,Q){return this.x=J.x*Q.x,this.y=J.y*Q.y,this.z=J.z*Q.z,this}applyEuler(J){return this.applyQuaternion(BK.setFromEuler(J))}applyAxisAngle(J,Q){return this.applyQuaternion(BK.setFromAxisAngle(J,Q))}applyMatrix3(J){let Q=this.x,$=this.y,W=this.z,Z=J.elements;return this.x=Z[0]*Q+Z[3]*$+Z[6]*W,this.y=Z[1]*Q+Z[4]*$+Z[7]*W,this.z=Z[2]*Q+Z[5]*$+Z[8]*W,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let Q=this.x,$=this.y,W=this.z,Z=J.elements,K=1/(Z[3]*Q+Z[7]*$+Z[11]*W+Z[15]);return this.x=(Z[0]*Q+Z[4]*$+Z[8]*W+Z[12])*K,this.y=(Z[1]*Q+Z[5]*$+Z[9]*W+Z[13])*K,this.z=(Z[2]*Q+Z[6]*$+Z[10]*W+Z[14])*K,this}applyQuaternion(J){let Q=this.x,$=this.y,W=this.z,Z=J.x,K=J.y,H=J.z,Y=J.w,X=2*(K*W-H*$),U=2*(H*Q-Z*W),N=2*(Z*$-K*Q);return this.x=Q+Y*X+K*N-H*U,this.y=$+Y*U+H*X-Z*N,this.z=W+Y*N+Z*U-K*X,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let Q=this.x,$=this.y,W=this.z,Z=J.elements;return this.x=Z[0]*Q+Z[4]*$+Z[8]*W,this.y=Z[1]*Q+Z[5]*$+Z[9]*W,this.z=Z[2]*Q+Z[6]*$+Z[10]*W,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,Q){return this.x=g0(this.x,J.x,Q.x),this.y=g0(this.y,J.y,Q.y),this.z=g0(this.z,J.z,Q.z),this}clampScalar(J,Q){return this.x=g0(this.x,J,Q),this.y=g0(this.y,J,Q),this.z=g0(this.z,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(g0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,Q){let{x:$,y:W,z:Z}=J,K=Q.x,H=Q.y,Y=Q.z;return this.x=W*Y-Z*H,this.y=Z*K-$*Y,this.z=$*H-W*K,this}projectOnVector(J){let Q=J.lengthSq();if(Q===0)return this.set(0,0,0);let $=J.dot(this)/Q;return this.copy(J).multiplyScalar($)}projectOnPlane(J){return F$.copy(this).projectOnVector(J),this.sub(F$)}reflect(J){return this.sub(F$.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(g0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y,W=this.z-J.z;return Q*Q+$*$+W*W}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,Q,$){let W=Math.sin(Q)*J;return this.x=W*Math.sin($),this.y=Math.cos(Q)*J,this.z=W*Math.cos($),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,Q,$){return this.x=J*Math.sin(Q),this.y=$,this.z=J*Math.cos(Q),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this}setFromMatrixScale(J){let Q=this.setFromMatrixColumn(J,0).length(),$=this.setFromMatrixColumn(J,1).length(),W=this.setFromMatrixColumn(J,2).length();return this.x=Q,this.y=$,this.z=W,this}setFromMatrixColumn(J,Q){return this.fromArray(J.elements,Q*4)}setFromMatrix3Column(J,Q){return this.fromArray(J.elements,Q*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,Q=Math.random()*2-1,$=Math.sqrt(1-Q*Q);return this.x=$*Math.cos(J),this.y=Q,this.z=$*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var F$=new P,BK=new xJ;class l0{static{l0.prototype.isMatrix3=!0}constructor(J,Q,$,W,Z,K,H,Y,X){if(this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,Q,$,W,Z,K,H,Y,X)}set(J,Q,$,W,Z,K,H,Y,X){let U=this.elements;return U[0]=J,U[1]=W,U[2]=H,U[3]=Q,U[4]=Z,U[5]=Y,U[6]=$,U[7]=K,U[8]=X,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],this}extractBasis(J,Q,$){return J.setFromMatrix3Column(this,0),Q.setFromMatrix3Column(this,1),$.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let Q=J.elements;return this.set(Q[0],Q[4],Q[8],Q[1],Q[5],Q[9],Q[2],Q[6],Q[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,W=Q.elements,Z=this.elements,K=$[0],H=$[3],Y=$[6],X=$[1],U=$[4],N=$[7],E=$[2],G=$[5],q=$[8],O=W[0],R=W[3],D=W[6],F=W[1],I=W[4],V=W[7],M=W[2],w=W[5],_=W[8];return Z[0]=K*O+H*F+Y*M,Z[3]=K*R+H*I+Y*w,Z[6]=K*D+H*V+Y*_,Z[1]=X*O+U*F+N*M,Z[4]=X*R+U*I+N*w,Z[7]=X*D+U*V+N*_,Z[2]=E*O+G*F+q*M,Z[5]=E*R+G*I+q*w,Z[8]=E*D+G*V+q*_,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[3]*=J,Q[6]*=J,Q[1]*=J,Q[4]*=J,Q[7]*=J,Q[2]*=J,Q[5]*=J,Q[8]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[1],W=J[2],Z=J[3],K=J[4],H=J[5],Y=J[6],X=J[7],U=J[8];return Q*K*U-Q*H*X-$*Z*U+$*H*Y+W*Z*X-W*K*Y}invert(){let J=this.elements,Q=J[0],$=J[1],W=J[2],Z=J[3],K=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=U*K-H*X,E=H*Y-U*Z,G=X*Z-K*Y,q=Q*N+$*E+W*G;if(q===0)return this.set(0,0,0,0,0,0,0,0,0);let O=1/q;return J[0]=N*O,J[1]=(W*X-U*$)*O,J[2]=(H*$-W*K)*O,J[3]=E*O,J[4]=(U*Q-W*Y)*O,J[5]=(W*Z-H*Q)*O,J[6]=G*O,J[7]=($*Y-X*Q)*O,J[8]=(K*Q-$*Z)*O,this}transpose(){let J,Q=this.elements;return J=Q[1],Q[1]=Q[3],Q[3]=J,J=Q[2],Q[2]=Q[6],Q[6]=J,J=Q[5],Q[5]=Q[7],Q[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let Q=this.elements;return J[0]=Q[0],J[1]=Q[3],J[2]=Q[6],J[3]=Q[1],J[4]=Q[4],J[5]=Q[7],J[6]=Q[2],J[7]=Q[5],J[8]=Q[8],this}setUvTransform(J,Q,$,W,Z,K,H){let Y=Math.cos(Z),X=Math.sin(Z);return this.set($*Y,$*X,-$*(Y*K+X*H)+K+J,-W*X,W*Y,-W*(-X*K+Y*H)+H+Q,0,0,1),this}scale(J,Q){return r9("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(D$.makeScale(J,Q)),this}rotate(J){return r9("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(D$.makeRotation(-J)),this}translate(J,Q){return r9("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(D$.makeTranslation(J,Q)),this}makeTranslation(J,Q){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,Q,0,0,1);return this}makeRotation(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,$,Q,0,0,0,1),this}makeScale(J,Q){return this.set(J,0,0,0,Q,0,0,0,1),this}equals(J){let Q=this.elements,$=J.elements;for(let W=0;W<9;W++)if(Q[W]!==$[W])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<9;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var D$=new l0,zK=new l0().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),IK=new l0().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function MN(){let J={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(Z,K,H){if(this.enabled===!1||K===H||!K||!H)return Z;if(this.spaces[K].transfer==="srgb")Z.r=f9(Z.r),Z.g=f9(Z.g),Z.b=f9(Z.b);if(this.spaces[K].primaries!==this.spaces[H].primaries)Z.applyMatrix3(this.spaces[K].toXYZ),Z.applyMatrix3(this.spaces[H].fromXYZ);if(this.spaces[H].transfer==="srgb")Z.r=Y7(Z.r),Z.g=Y7(Z.g),Z.b=Y7(Z.b);return Z},workingToColorSpace:function(Z,K){return this.convert(Z,this.workingColorSpace,K)},colorSpaceToWorking:function(Z,K){return this.convert(Z,K,this.workingColorSpace)},getPrimaries:function(Z){return this.spaces[Z].primaries},getTransfer:function(Z){if(Z==="")return"linear";return this.spaces[Z].transfer},getToneMappingMode:function(Z){return this.spaces[Z].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(Z,K=this.workingColorSpace){return Z.fromArray(this.spaces[K].luminanceCoefficients)},define:function(Z){Object.assign(this.spaces,Z)},_getMatrix:function(Z,K,H){return Z.copy(this.spaces[K].toXYZ).multiply(this.spaces[H].fromXYZ)},_getDrawingBufferColorSpace:function(Z){return this.spaces[Z].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(Z=this.workingColorSpace){return this.spaces[Z].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(Z,K){return r9("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),J.workingToColorSpace(Z,K)},toWorkingColorSpace:function(Z,K){return r9("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),J.colorSpaceToWorking(Z,K)}},Q=[0.64,0.33,0.3,0.6,0.15,0.06],$=[0.2126,0.7152,0.0722],W=[0.3127,0.329];return J.define({["srgb-linear"]:{primaries:Q,whitePoint:W,transfer:"linear",toXYZ:zK,fromXYZ:IK,luminanceCoefficients:$,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:Q,whitePoint:W,transfer:"srgb",toXYZ:zK,fromXYZ:IK,luminanceCoefficients:$,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),J}var JJ=MN();function f9(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function Y7(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var p8;class WZ{static getDataURL(J,Q="image/png"){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(p8===void 0)p8=X7("canvas");p8.width=J.width,p8.height=J.height;let W=p8.getContext("2d");if(J instanceof ImageData)W.putImageData(J,0,0);else W.drawImage(J,0,0,J.width,J.height);$=p8}return $.toDataURL(Q)}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let Q=X7("canvas");Q.width=J.width,Q.height=J.height;let $=Q.getContext("2d");$.drawImage(J,0,0,J.width,J.height);let W=$.getImageData(0,0,J.width,J.height),Z=W.data;for(let K=0;K<Z.length;K++)Z[K]=f9(Z[K]/255)*255;return $.putImageData(W,0,0),Q}else if(J.data){let Q=J.data.slice(0);for(let $=0;$<Q.length;$++)if(Q instanceof Uint8Array||Q instanceof Uint8ClampedArray)Q[$]=Math.floor(f9(Q[$]/255)*255);else Q[$]=f9(Q[$]);return{data:Q,width:J.width,height:J.height}}else return Y0("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var LN=0;class v9{constructor(J=null){this.isSource=!0,Object.defineProperty(this,"id",{value:LN++}),this.uuid=eJ(),this.data=J,this.dataReady=!0,this.version=0}getSize(J){let Q=this.data;if(typeof HTMLVideoElement<"u"&&Q instanceof HTMLVideoElement)J.set(Q.videoWidth,Q.videoHeight,0);else if(typeof VideoFrame<"u"&&Q instanceof VideoFrame)J.set(Q.displayWidth,Q.displayHeight,0);else if(Q!==null)J.set(Q.width,Q.height,Q.depth||0);else J.set(0,0,0);return J}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let $={uuid:this.uuid,url:""},W=this.data;if(W!==null){let Z;if(Array.isArray(W)){Z=[];for(let K=0,H=W.length;K<H;K++)if(W[K].isDataTexture)Z.push(O$(W[K].image));else Z.push(O$(W[K]))}else Z=O$(W);$.url=Z}if(!Q)J.images[this.uuid]=$;return $}}function O$(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return WZ.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return Y0("Texture: Unable to serialize Texture."),{}}var VN=0,R$=new P;class kJ extends K9{constructor(J=kJ.DEFAULT_IMAGE,Q=kJ.DEFAULT_MAPPING,$=1001,W=1001,Z=1006,K=1008,H=1023,Y=1009,X=kJ.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:VN++}),this.uuid=eJ(),this.name="",this.source=new v9(J),this.mipmaps=[],this.mapping=Q,this.channel=0,this.wrapS=$,this.wrapT=W,this.magFilter=Z,this.minFilter=K,this.anisotropy=X,this.format=H,this.internalFormat=null,this.type=Y,this.offset=new a(0,0),this.repeat=new a(1,1),this.center=new a(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new l0,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=J&&J.depth&&J.depth>1?!0:!1,this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(R$).x}get height(){return this.source.getSize(R$).y}get depth(){return this.source.getSize(R$).z}get image(){return this.source.data}set image(J){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.normalized=J.normalized,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.renderTarget=J.renderTarget,this.isRenderTargetTexture=J.isRenderTargetTexture,this.isArrayTexture=J.isArrayTexture,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}setValues(J){for(let Q in J){let $=J[Q];if($===void 0){Y0(`Texture.setValues(): parameter '${Q}' has value of undefined.`);continue}let W=this[Q];if(W===void 0){Y0(`Texture.setValues(): property '${Q}' does not exist.`);continue}if(W&&$&&(W.isVector2&&$.isVector2))W.copy($);else if(W&&$&&(W.isVector3&&$.isVector3))W.copy($);else if(W&&$&&(W.isMatrix3&&$.isMatrix3))W.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let $={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)$.userData=this.userData;if(!Q)J.textures[this.uuid]=$;return $}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}kJ.DEFAULT_IMAGE=null;kJ.DEFAULT_MAPPING=300;kJ.DEFAULT_ANISOTROPY=1;class XJ{static{XJ.prototype.isVector4=!0}constructor(J=0,Q=0,$=0,W=1){this.x=J,this.y=Q,this.z=$,this.w=W}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,Q,$,W){return this.x=J,this.y=Q,this.z=$,this.w=W,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;case 3:this.w=Q;break;default:throw Error("THREE.Vector4: index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("THREE.Vector4: index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this.w=J.w+Q.w,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this.w+=J.w*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this.w=J.w-Q.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let Q=this.x,$=this.y,W=this.z,Z=this.w,K=J.elements;return this.x=K[0]*Q+K[4]*$+K[8]*W+K[12]*Z,this.y=K[1]*Q+K[5]*$+K[9]*W+K[13]*Z,this.z=K[2]*Q+K[6]*$+K[10]*W+K[14]*Z,this.w=K[3]*Q+K[7]*$+K[11]*W+K[15]*Z,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let Q=Math.sqrt(1-J.w*J.w);if(Q<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/Q,this.y=J.y/Q,this.z=J.z/Q;return this}setAxisAngleFromRotationMatrix(J){let Q,$,W,Z,K=0.01,H=0.1,Y=J.elements,X=Y[0],U=Y[4],N=Y[8],E=Y[1],G=Y[5],q=Y[9],O=Y[2],R=Y[6],D=Y[10];if(Math.abs(U-E)<0.01&&Math.abs(N-O)<0.01&&Math.abs(q-R)<0.01){if(Math.abs(U+E)<0.1&&Math.abs(N+O)<0.1&&Math.abs(q+R)<0.1&&Math.abs(X+G+D-3)<0.1)return this.set(1,0,0,0),this;Q=Math.PI;let I=(X+1)/2,V=(G+1)/2,M=(D+1)/2,w=(U+E)/4,_=(N+O)/4,C=(q+R)/4;if(I>V&&I>M)if(I<0.01)$=0,W=0.707106781,Z=0.707106781;else $=Math.sqrt(I),W=w/$,Z=_/$;else if(V>M)if(V<0.01)$=0.707106781,W=0,Z=0.707106781;else W=Math.sqrt(V),$=w/W,Z=C/W;else if(M<0.01)$=0.707106781,W=0.707106781,Z=0;else Z=Math.sqrt(M),$=_/Z,W=C/Z;return this.set($,W,Z,Q),this}let F=Math.sqrt((R-q)*(R-q)+(N-O)*(N-O)+(E-U)*(E-U));if(Math.abs(F)<0.001)F=1;return this.x=(R-q)/F,this.y=(N-O)/F,this.z=(E-U)/F,this.w=Math.acos((X+G+D-1)/2),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this.w=Q[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,Q){return this.x=g0(this.x,J.x,Q.x),this.y=g0(this.y,J.y,Q.y),this.z=g0(this.z,J.z,Q.z),this.w=g0(this.w,J.w,Q.w),this}clampScalar(J,Q){return this.x=g0(this.x,J,Q),this.y=g0(this.y,J,Q),this.z=g0(this.z,J,Q),this.w=g0(this.w,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(g0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this.w+=(J.w-this.w)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this.w=J.w+(Q.w-J.w)*$,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this.w=J[Q+3],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J[Q+3]=this.w,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this.w=J.getW(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class VQ extends K9{constructor(J=1,Q=1,$={}){super();$=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},$),this.isRenderTarget=!0,this.width=J,this.height=Q,this.depth=$.depth,this.scissor=new XJ(0,0,J,Q),this.scissorTest=!1,this.viewport=new XJ(0,0,J,Q),this.textures=[];let W={width:J,height:Q,depth:$.depth},Z=new kJ(W),K=$.count;for(let H=0;H<K;H++)this.textures[H]=Z.clone(),this.textures[H].isRenderTargetTexture=!0,this.textures[H].renderTarget=this;this._setTextureOptions($),this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=$.depthTexture,this.samples=$.samples,this.multiview=$.multiview,this.useArrayDepthTexture=$.useArrayDepthTexture}_setTextureOptions(J={}){let Q={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(J.mapping!==void 0)Q.mapping=J.mapping;if(J.wrapS!==void 0)Q.wrapS=J.wrapS;if(J.wrapT!==void 0)Q.wrapT=J.wrapT;if(J.wrapR!==void 0)Q.wrapR=J.wrapR;if(J.magFilter!==void 0)Q.magFilter=J.magFilter;if(J.minFilter!==void 0)Q.minFilter=J.minFilter;if(J.format!==void 0)Q.format=J.format;if(J.type!==void 0)Q.type=J.type;if(J.anisotropy!==void 0)Q.anisotropy=J.anisotropy;if(J.colorSpace!==void 0)Q.colorSpace=J.colorSpace;if(J.flipY!==void 0)Q.flipY=J.flipY;if(J.generateMipmaps!==void 0)Q.generateMipmaps=J.generateMipmaps;if(J.internalFormat!==void 0)Q.internalFormat=J.internalFormat;for(let $=0;$<this.textures.length;$++)this.textures[$].setValues(Q)}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}set depthTexture(J){if(this._depthTexture!==null)this._depthTexture.renderTarget=null;if(J!==null)J.renderTarget=this;this._depthTexture=J}get depthTexture(){return this._depthTexture}setSize(J,Q,$=1){if(this.width!==J||this.height!==Q||this.depth!==$){this.width=J,this.height=Q,this.depth=$;for(let W=0,Z=this.textures.length;W<Z;W++)if(this.textures[W].image.width=J,this.textures[W].image.height=Q,this.textures[W].image.depth=$,this.textures[W].isData3DTexture!==!0)this.textures[W].isArrayTexture=this.textures[W].image.depth>1;this.dispose()}this.viewport.set(0,0,J,Q),this.scissor.set(0,0,J,Q)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,$=J.textures.length;Q<$;Q++){this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0,this.textures[Q].renderTarget=this;let W=Object.assign({},J.textures[Q].image);this.textures[Q].source=new v9(W)}if(this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,J.depthTexture!==null)this.depthTexture=J.depthTexture.clone();return this.samples=J.samples,this.multiview=J.multiview,this.useArrayDepthTexture=J.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class oJ extends VQ{constructor(J=1,Q=1,$={}){super(J,Q,$);this.isWebGLRenderTarget=!0}}class a7 extends kJ{constructor(J=null,Q=1,$=1,W=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:Q,height:$,depth:W},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class yY extends oJ{constructor(J=1,Q=1,$=1,W={}){super(J,Q,W);this.isWebGLArrayRenderTarget=!0,this.depth=$,this.texture=new a7(null,J,Q,$),this._setTextureOptions(W),this.texture.isRenderTargetTexture=!0}}class r7 extends kJ{constructor(J=null,Q=1,$=1,W=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:Q,height:$,depth:W},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class vY extends oJ{constructor(J=1,Q=1,$=1,W={}){super(J,Q,W);this.isWebGL3DRenderTarget=!0,this.depth=$,this.texture=new r7(null,J,Q,$),this._setTextureOptions(W),this.texture.isRenderTargetTexture=!0}}class p0{static{p0.prototype.isMatrix4=!0}constructor(J,Q,$,W,Z,K,H,Y,X,U,N,E,G,q,O,R){if(this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,Q,$,W,Z,K,H,Y,X,U,N,E,G,q,O,R)}set(J,Q,$,W,Z,K,H,Y,X,U,N,E,G,q,O,R){let D=this.elements;return D[0]=J,D[4]=Q,D[8]=$,D[12]=W,D[1]=Z,D[5]=K,D[9]=H,D[13]=Y,D[2]=X,D[6]=U,D[10]=N,D[14]=E,D[3]=G,D[7]=q,D[11]=O,D[15]=R,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new p0().fromArray(this.elements)}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],Q[9]=$[9],Q[10]=$[10],Q[11]=$[11],Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],Q[15]=$[15],this}copyPosition(J){let Q=this.elements,$=J.elements;return Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],this}setFromMatrix3(J){let Q=J.elements;return this.set(Q[0],Q[3],Q[6],0,Q[1],Q[4],Q[7],0,Q[2],Q[5],Q[8],0,0,0,0,1),this}extractBasis(J,Q,$){if(this.determinantAffine()===0)return J.set(1,0,0),Q.set(0,1,0),$.set(0,0,1),this;return J.setFromMatrixColumn(this,0),Q.setFromMatrixColumn(this,1),$.setFromMatrixColumn(this,2),this}makeBasis(J,Q,$){return this.set(J.x,Q.x,$.x,0,J.y,Q.y,$.y,0,J.z,Q.z,$.z,0,0,0,0,1),this}extractRotation(J){if(J.determinantAffine()===0)return this.identity();let Q=this.elements,$=J.elements,W=1/m8.setFromMatrixColumn(J,0).length(),Z=1/m8.setFromMatrixColumn(J,1).length(),K=1/m8.setFromMatrixColumn(J,2).length();return Q[0]=$[0]*W,Q[1]=$[1]*W,Q[2]=$[2]*W,Q[3]=0,Q[4]=$[4]*Z,Q[5]=$[5]*Z,Q[6]=$[6]*Z,Q[7]=0,Q[8]=$[8]*K,Q[9]=$[9]*K,Q[10]=$[10]*K,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromEuler(J){let Q=this.elements,$=J.x,W=J.y,Z=J.z,K=Math.cos($),H=Math.sin($),Y=Math.cos(W),X=Math.sin(W),U=Math.cos(Z),N=Math.sin(Z);if(J.order==="XYZ"){let E=K*U,G=K*N,q=H*U,O=H*N;Q[0]=Y*U,Q[4]=-Y*N,Q[8]=X,Q[1]=G+q*X,Q[5]=E-O*X,Q[9]=-H*Y,Q[2]=O-E*X,Q[6]=q+G*X,Q[10]=K*Y}else if(J.order==="YXZ"){let E=Y*U,G=Y*N,q=X*U,O=X*N;Q[0]=E+O*H,Q[4]=q*H-G,Q[8]=K*X,Q[1]=K*N,Q[5]=K*U,Q[9]=-H,Q[2]=G*H-q,Q[6]=O+E*H,Q[10]=K*Y}else if(J.order==="ZXY"){let E=Y*U,G=Y*N,q=X*U,O=X*N;Q[0]=E-O*H,Q[4]=-K*N,Q[8]=q+G*H,Q[1]=G+q*H,Q[5]=K*U,Q[9]=O-E*H,Q[2]=-K*X,Q[6]=H,Q[10]=K*Y}else if(J.order==="ZYX"){let E=K*U,G=K*N,q=H*U,O=H*N;Q[0]=Y*U,Q[4]=q*X-G,Q[8]=E*X+O,Q[1]=Y*N,Q[5]=O*X+E,Q[9]=G*X-q,Q[2]=-X,Q[6]=H*Y,Q[10]=K*Y}else if(J.order==="YZX"){let E=K*Y,G=K*X,q=H*Y,O=H*X;Q[0]=Y*U,Q[4]=O-E*N,Q[8]=q*N+G,Q[1]=N,Q[5]=K*U,Q[9]=-H*U,Q[2]=-X*U,Q[6]=G*N+q,Q[10]=E-O*N}else if(J.order==="XZY"){let E=K*Y,G=K*X,q=H*Y,O=H*X;Q[0]=Y*U,Q[4]=-N,Q[8]=X*U,Q[1]=E*N+O,Q[5]=K*U,Q[9]=G*N-q,Q[2]=q*N-G,Q[6]=H*U,Q[10]=O*N+E}return Q[3]=0,Q[7]=0,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromQuaternion(J){return this.compose(BN,J,zN)}lookAt(J,Q,$){let W=this.elements;if(rJ.subVectors(J,Q),rJ.lengthSq()===0)rJ.z=1;if(rJ.normalize(),u9.crossVectors($,rJ),u9.lengthSq()===0){if(Math.abs($.z)===1)rJ.x+=0.0001;else rJ.z+=0.0001;rJ.normalize(),u9.crossVectors($,rJ)}return u9.normalize(),O6.crossVectors(rJ,u9),W[0]=u9.x,W[4]=O6.x,W[8]=rJ.x,W[1]=u9.y,W[5]=O6.y,W[9]=rJ.y,W[2]=u9.z,W[6]=O6.z,W[10]=rJ.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,W=Q.elements,Z=this.elements,K=$[0],H=$[4],Y=$[8],X=$[12],U=$[1],N=$[5],E=$[9],G=$[13],q=$[2],O=$[6],R=$[10],D=$[14],F=$[3],I=$[7],V=$[11],M=$[15],w=W[0],_=W[4],C=W[8],k=W[12],B=W[1],f=W[5],T=W[9],p=W[13],n=W[2],b=W[6],u=W[10],l=W[14],h=W[3],r=W[7],W0=W[11],H0=W[15];return Z[0]=K*w+H*B+Y*n+X*h,Z[4]=K*_+H*f+Y*b+X*r,Z[8]=K*C+H*T+Y*u+X*W0,Z[12]=K*k+H*p+Y*l+X*H0,Z[1]=U*w+N*B+E*n+G*h,Z[5]=U*_+N*f+E*b+G*r,Z[9]=U*C+N*T+E*u+G*W0,Z[13]=U*k+N*p+E*l+G*H0,Z[2]=q*w+O*B+R*n+D*h,Z[6]=q*_+O*f+R*b+D*r,Z[10]=q*C+O*T+R*u+D*W0,Z[14]=q*k+O*p+R*l+D*H0,Z[3]=F*w+I*B+V*n+M*h,Z[7]=F*_+I*f+V*b+M*r,Z[11]=F*C+I*T+V*u+M*W0,Z[15]=F*k+I*p+V*l+M*H0,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[4]*=J,Q[8]*=J,Q[12]*=J,Q[1]*=J,Q[5]*=J,Q[9]*=J,Q[13]*=J,Q[2]*=J,Q[6]*=J,Q[10]*=J,Q[14]*=J,Q[3]*=J,Q[7]*=J,Q[11]*=J,Q[15]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[4],W=J[8],Z=J[12],K=J[1],H=J[5],Y=J[9],X=J[13],U=J[2],N=J[6],E=J[10],G=J[14],q=J[3],O=J[7],R=J[11],D=J[15],F=Y*G-X*E,I=H*G-X*N,V=H*E-Y*N,M=K*G-X*U,w=K*E-Y*U,_=K*N-H*U;return Q*(O*F-R*I+D*V)-$*(q*F-R*M+D*w)+W*(q*I-O*M+D*_)-Z*(q*V-O*w+R*_)}determinantAffine(){let J=this.elements,Q=J[0],$=J[4],W=J[8],Z=J[1],K=J[5],H=J[9],Y=J[2],X=J[6],U=J[10];return Q*(K*U-H*X)-$*(Z*U-H*Y)+W*(Z*X-K*Y)}transpose(){let J=this.elements,Q;return Q=J[1],J[1]=J[4],J[4]=Q,Q=J[2],J[2]=J[8],J[8]=Q,Q=J[6],J[6]=J[9],J[9]=Q,Q=J[3],J[3]=J[12],J[12]=Q,Q=J[7],J[7]=J[13],J[13]=Q,Q=J[11],J[11]=J[14],J[14]=Q,this}setPosition(J,Q,$){let W=this.elements;if(J.isVector3)W[12]=J.x,W[13]=J.y,W[14]=J.z;else W[12]=J,W[13]=Q,W[14]=$;return this}invert(){let J=this.elements,Q=J[0],$=J[1],W=J[2],Z=J[3],K=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=J[9],E=J[10],G=J[11],q=J[12],O=J[13],R=J[14],D=J[15],F=Q*H-$*K,I=Q*Y-W*K,V=Q*X-Z*K,M=$*Y-W*H,w=$*X-Z*H,_=W*X-Z*Y,C=U*O-N*q,k=U*R-E*q,B=U*D-G*q,f=N*R-E*O,T=N*D-G*O,p=E*D-G*R,n=F*p-I*T+V*f+M*B-w*k+_*C;if(n===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let b=1/n;return J[0]=(H*p-Y*T+X*f)*b,J[1]=(W*T-$*p-Z*f)*b,J[2]=(O*_-R*w+D*M)*b,J[3]=(E*w-N*_-G*M)*b,J[4]=(Y*B-K*p-X*k)*b,J[5]=(Q*p-W*B+Z*k)*b,J[6]=(R*V-q*_-D*I)*b,J[7]=(U*_-E*V+G*I)*b,J[8]=(K*T-H*B+X*C)*b,J[9]=($*B-Q*T-Z*C)*b,J[10]=(q*w-O*V+D*F)*b,J[11]=(N*V-U*w-G*F)*b,J[12]=(H*k-K*f-Y*C)*b,J[13]=(Q*f-$*k+W*C)*b,J[14]=(O*I-q*M-R*F)*b,J[15]=(U*M-N*I+E*F)*b,this}scale(J){let Q=this.elements,$=J.x,W=J.y,Z=J.z;return Q[0]*=$,Q[4]*=W,Q[8]*=Z,Q[1]*=$,Q[5]*=W,Q[9]*=Z,Q[2]*=$,Q[6]*=W,Q[10]*=Z,Q[3]*=$,Q[7]*=W,Q[11]*=Z,this}getMaxScaleOnAxis(){let J=this.elements,Q=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],$=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],W=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max(Q,$,W))}makeTranslation(J,Q,$){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,Q,0,0,1,$,0,0,0,1);return this}makeRotationX(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(1,0,0,0,0,Q,-$,0,0,$,Q,0,0,0,0,1),this}makeRotationY(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,0,$,0,0,1,0,0,-$,0,Q,0,0,0,0,1),this}makeRotationZ(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,0,$,Q,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,Q){let $=Math.cos(Q),W=Math.sin(Q),Z=1-$,K=J.x,H=J.y,Y=J.z,X=Z*K,U=Z*H;return this.set(X*K+$,X*H-W*Y,X*Y+W*H,0,X*H+W*Y,U*H+$,U*Y-W*K,0,X*Y-W*H,U*Y+W*K,Z*Y*Y+$,0,0,0,0,1),this}makeScale(J,Q,$){return this.set(J,0,0,0,0,Q,0,0,0,0,$,0,0,0,0,1),this}makeShear(J,Q,$,W,Z,K){return this.set(1,$,Z,0,J,1,K,0,Q,W,1,0,0,0,0,1),this}compose(J,Q,$){let W=this.elements,Z=Q._x,K=Q._y,H=Q._z,Y=Q._w,X=Z+Z,U=K+K,N=H+H,E=Z*X,G=Z*U,q=Z*N,O=K*U,R=K*N,D=H*N,F=Y*X,I=Y*U,V=Y*N,M=$.x,w=$.y,_=$.z;return W[0]=(1-(O+D))*M,W[1]=(G+V)*M,W[2]=(q-I)*M,W[3]=0,W[4]=(G-V)*w,W[5]=(1-(E+D))*w,W[6]=(R+F)*w,W[7]=0,W[8]=(q+I)*_,W[9]=(R-F)*_,W[10]=(1-(E+O))*_,W[11]=0,W[12]=J.x,W[13]=J.y,W[14]=J.z,W[15]=1,this}decompose(J,Q,$){let W=this.elements;J.x=W[12],J.y=W[13],J.z=W[14];let Z=this.determinantAffine();if(Z===0)return $.set(1,1,1),Q.identity(),this;let K=m8.set(W[0],W[1],W[2]).length(),H=m8.set(W[4],W[5],W[6]).length(),Y=m8.set(W[8],W[9],W[10]).length();if(Z<0)K=-K;Y9.copy(this);let X=1/K,U=1/H,N=1/Y;return Y9.elements[0]*=X,Y9.elements[1]*=X,Y9.elements[2]*=X,Y9.elements[4]*=U,Y9.elements[5]*=U,Y9.elements[6]*=U,Y9.elements[8]*=N,Y9.elements[9]*=N,Y9.elements[10]*=N,Q.setFromRotationMatrix(Y9),$.x=K,$.y=H,$.z=Y,this}makePerspective(J,Q,$,W,Z,K,H=2000,Y=!1){let X=this.elements,U=2*Z/(Q-J),N=2*Z/($-W),E=(Q+J)/(Q-J),G=($+W)/($-W),q,O;if(Y)q=Z/(K-Z),O=K*Z/(K-Z);else if(H===2000)q=-(K+Z)/(K-Z),O=-2*K*Z/(K-Z);else if(H===2001)q=-K/(K-Z),O=-K*Z/(K-Z);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=E,X[12]=0,X[1]=0,X[5]=N,X[9]=G,X[13]=0,X[2]=0,X[6]=0,X[10]=q,X[14]=O,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,Q,$,W,Z,K,H=2000,Y=!1){let X=this.elements,U=2/(Q-J),N=2/($-W),E=-(Q+J)/(Q-J),G=-($+W)/($-W),q,O;if(Y)q=1/(K-Z),O=K/(K-Z);else if(H===2000)q=-2/(K-Z),O=-(K+Z)/(K-Z);else if(H===2001)q=-1/(K-Z),O=-Z/(K-Z);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=0,X[12]=E,X[1]=0,X[5]=N,X[9]=0,X[13]=G,X[2]=0,X[6]=0,X[10]=q,X[14]=O,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let Q=this.elements,$=J.elements;for(let W=0;W<16;W++)if(Q[W]!==$[W])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<16;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J[Q+9]=$[9],J[Q+10]=$[10],J[Q+11]=$[11],J[Q+12]=$[12],J[Q+13]=$[13],J[Q+14]=$[14],J[Q+15]=$[15],J}}var m8=new P,Y9=new p0,BN=new P(0,0,0),zN=new P(1,1,1),u9=new P,O6=new P,rJ=new P,AK=new p0,wK=new xJ;class N9{constructor(J=0,Q=0,$=0,W=N9.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=Q,this._z=$,this._order=W}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,Q,$,W=this._order){return this._x=J,this._y=Q,this._z=$,this._order=W,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,Q=this._order,$=!0){let W=J.elements,Z=W[0],K=W[4],H=W[8],Y=W[1],X=W[5],U=W[9],N=W[2],E=W[6],G=W[10];switch(Q){case"XYZ":if(this._y=Math.asin(g0(H,-1,1)),Math.abs(H)<0.9999999)this._x=Math.atan2(-U,G),this._z=Math.atan2(-K,Z);else this._x=Math.atan2(E,X),this._z=0;break;case"YXZ":if(this._x=Math.asin(-g0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(H,G),this._z=Math.atan2(Y,X);else this._y=Math.atan2(-N,Z),this._z=0;break;case"ZXY":if(this._x=Math.asin(g0(E,-1,1)),Math.abs(E)<0.9999999)this._y=Math.atan2(-N,G),this._z=Math.atan2(-K,X);else this._y=0,this._z=Math.atan2(Y,Z);break;case"ZYX":if(this._y=Math.asin(-g0(N,-1,1)),Math.abs(N)<0.9999999)this._x=Math.atan2(E,G),this._z=Math.atan2(Y,Z);else this._x=0,this._z=Math.atan2(-K,X);break;case"YZX":if(this._z=Math.asin(g0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-U,X),this._y=Math.atan2(-N,Z);else this._x=0,this._y=Math.atan2(H,G);break;case"XZY":if(this._z=Math.asin(-g0(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(E,X),this._y=Math.atan2(H,Z);else this._x=Math.atan2(-U,G),this._y=0;break;default:Y0("Euler: .setFromRotationMatrix() encountered an unknown order: "+Q)}if(this._order=Q,$===!0)this._onChangeCallback();return this}setFromQuaternion(J,Q,$){return AK.makeRotationFromQuaternion(J),this.setFromRotationMatrix(AK,Q,$)}setFromVector3(J,Q=this._order){return this.set(J.x,J.y,J.z,Q)}reorder(J){return wK.setFromEuler(this),this.setFromQuaternion(wK,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}N9.DEFAULT_ORDER="XYZ";class t7{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var IN=0,_K=new P,d8=new xJ,w9=new p0,R6=new P,I7=new P,AN=new P,wN=new xJ,CK=new P(1,0,0),PK=new P(0,1,0),TK=new P(0,0,1),SK={type:"added"},_N={type:"removed"},l8={type:"childadded",child:null},k$={type:"childremoved",child:null};class ZJ extends K9{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:IN++}),this.uuid=eJ(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ZJ.DEFAULT_UP.clone();let J=new P,Q=new N9,$=new xJ,W=new P(1,1,1);function Z(){$.setFromEuler(Q,!1)}function K(){Q.setFromQuaternion($,void 0,!1)}Q._onChange(Z),$._onChange(K),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:Q},quaternion:{configurable:!0,enumerable:!0,value:$},scale:{configurable:!0,enumerable:!0,value:W},modelViewMatrix:{value:new p0},normalMatrix:{value:new l0}}),this.matrix=new p0,this.matrixWorld=new p0,this.matrixAutoUpdate=ZJ.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ZJ.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new t7,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,Q){this.quaternion.setFromAxisAngle(J,Q)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,Q){return d8.setFromAxisAngle(J,Q),this.quaternion.multiply(d8),this}rotateOnWorldAxis(J,Q){return d8.setFromAxisAngle(J,Q),this.quaternion.premultiply(d8),this}rotateX(J){return this.rotateOnAxis(CK,J)}rotateY(J){return this.rotateOnAxis(PK,J)}rotateZ(J){return this.rotateOnAxis(TK,J)}translateOnAxis(J,Q){return _K.copy(J).applyQuaternion(this.quaternion),this.position.add(_K.multiplyScalar(Q)),this}translateX(J){return this.translateOnAxis(CK,J)}translateY(J){return this.translateOnAxis(PK,J)}translateZ(J){return this.translateOnAxis(TK,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(w9.copy(this.matrixWorld).invert())}lookAt(J,Q,$){if(J.isVector3)R6.copy(J);else R6.set(J,Q,$);let W=this.parent;if(this.updateWorldMatrix(!0,!1),I7.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)w9.lookAt(I7,R6,this.up);else w9.lookAt(R6,I7,this.up);if(this.quaternion.setFromRotationMatrix(w9),W)w9.extractRotation(W.matrixWorld),d8.setFromRotationMatrix(w9),this.quaternion.premultiply(d8.invert())}add(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.add(arguments[Q]);return this}if(J===this)return T0("Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(SK),l8.child=J,this.dispatchEvent(l8),l8.child=null;else T0("Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.remove(arguments[$]);return this}let Q=this.children.indexOf(J);if(Q!==-1)J.parent=null,this.children.splice(Q,1),J.dispatchEvent(_N),k$.child=J,this.dispatchEvent(k$),k$.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),w9.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),w9.multiply(J.parent.matrixWorld);return J.applyMatrix4(w9),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(SK),l8.child=J,this.dispatchEvent(l8),l8.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,Q){if(this[J]===Q)return this;for(let $=0,W=this.children.length;$<W;$++){let K=this.children[$].getObjectByProperty(J,Q);if(K!==void 0)return K}return}getObjectsByProperty(J,Q,$=[]){if(this[J]===Q)$.push(this);let W=this.children;for(let Z=0,K=W.length;Z<K;Z++)W[Z].getObjectsByProperty(J,Q,$);return $}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(I7,J,AN),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(I7,wN,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let Q=this.matrixWorld.elements;return J.set(Q[8],Q[9],Q[10]).normalize()}raycast(){}traverse(J){J(this);let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].traverseVisible(J)}traverseAncestors(J){let Q=this.parent;if(Q!==null)J(Q),Q.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let J=this.pivot;if(J!==null){let{x:Q,y:$,z:W}=J,Z=this.matrix.elements;Z[12]+=Q-Z[0]*Q-Z[4]*$-Z[8]*W,Z[13]+=$-Z[1]*Q-Z[5]*$-Z[9]*W,Z[14]+=W-Z[2]*Q-Z[6]*$-Z[10]*W}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let Q=this.children;for(let $=0,W=Q.length;$<W;$++)Q[$].updateMatrixWorld(J)}updateWorldMatrix(J,Q,$=!1){let W=this.parent;if(J===!0&&W!==null)W.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||$){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,$=!0}if(Q===!0){let Z=this.children;for(let K=0,H=Z.length;K<H;K++)Z[K].updateWorldMatrix(!1,!0,$)}}toJSON(J){let Q=J===void 0||typeof J==="string",$={};if(Q)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},$.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let W={};if(W.uuid=this.uuid,W.type=this.type,this.name!=="")W.name=this.name;if(this.castShadow===!0)W.castShadow=!0;if(this.receiveShadow===!0)W.receiveShadow=!0;if(this.visible===!1)W.visible=!1;if(this.frustumCulled===!1)W.frustumCulled=!1;if(this.renderOrder!==0)W.renderOrder=this.renderOrder;if(this.static!==!1)W.static=this.static;if(Object.keys(this.userData).length>0)W.userData=this.userData;if(W.layers=this.layers.mask,W.matrix=this.matrix.toArray(),W.up=this.up.toArray(),this.pivot!==null)W.pivot=this.pivot.toArray();if(this.matrixAutoUpdate===!1)W.matrixAutoUpdate=!1;if(this.morphTargetDictionary!==void 0)W.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)W.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(W.type="InstancedMesh",W.count=this.count,W.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)W.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(W.type="BatchedMesh",W.perObjectFrustumCulled=this.perObjectFrustumCulled,W.sortObjects=this.sortObjects,W.drawRanges=this._drawRanges,W.reservedRanges=this._reservedRanges,W.geometryInfo=this._geometryInfo.map((H)=>({...H,boundingBox:H.boundingBox?H.boundingBox.toJSON():void 0,boundingSphere:H.boundingSphere?H.boundingSphere.toJSON():void 0})),W.instanceInfo=this._instanceInfo.map((H)=>({...H})),W.availableInstanceIds=this._availableInstanceIds.slice(),W.availableGeometryIds=this._availableGeometryIds.slice(),W.nextIndexStart=this._nextIndexStart,W.nextVertexStart=this._nextVertexStart,W.geometryCount=this._geometryCount,W.maxInstanceCount=this._maxInstanceCount,W.maxVertexCount=this._maxVertexCount,W.maxIndexCount=this._maxIndexCount,W.geometryInitialized=this._geometryInitialized,W.matricesTexture=this._matricesTexture.toJSON(J),W.indirectTexture=this._indirectTexture.toJSON(J),this._colorsTexture!==null)W.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)W.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)W.boundingBox=this.boundingBox.toJSON()}function Z(H,Y){if(H[Y.uuid]===void 0)H[Y.uuid]=Y.toJSON(J);return Y.uuid}if(this.isScene){if(this.background){if(this.background.isColor)W.background=this.background.toJSON();else if(this.background.isTexture)W.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)W.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){W.geometry=Z(J.geometries,this.geometry);let H=this.geometry.parameters;if(H!==void 0&&H.shapes!==void 0){let Y=H.shapes;if(Array.isArray(Y))for(let X=0,U=Y.length;X<U;X++){let N=Y[X];Z(J.shapes,N)}else Z(J.shapes,Y)}}if(this.isSkinnedMesh){if(W.bindMode=this.bindMode,W.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)Z(J.skeletons,this.skeleton),W.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let H=[];for(let Y=0,X=this.material.length;Y<X;Y++)H.push(Z(J.materials,this.material[Y]));W.material=H}else W.material=Z(J.materials,this.material);if(this.children.length>0){W.children=[];for(let H=0;H<this.children.length;H++)W.children.push(this.children[H].toJSON(J).object)}if(this.animations.length>0){W.animations=[];for(let H=0;H<this.animations.length;H++){let Y=this.animations[H];W.animations.push(Z(J.animations,Y))}}if(Q){let H=K(J.geometries),Y=K(J.materials),X=K(J.textures),U=K(J.images),N=K(J.shapes),E=K(J.skeletons),G=K(J.animations),q=K(J.nodes);if(H.length>0)$.geometries=H;if(Y.length>0)$.materials=Y;if(X.length>0)$.textures=X;if(U.length>0)$.images=U;if(N.length>0)$.shapes=N;if(E.length>0)$.skeletons=E;if(G.length>0)$.animations=G;if(q.length>0)$.nodes=q}return $.object=W,$;function K(H){let Y=[];for(let X in H){let U=H[X];delete U.metadata,Y.push(U)}return Y}}clone(J){return new this.constructor().copy(this,J)}copy(J,Q=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.pivot=J.pivot!==null?J.pivot.clone():null,this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.static=J.static,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),Q===!0)for(let $=0;$<J.children.length;$++){let W=J.children[$];this.add(W.clone())}return this}}ZJ.DEFAULT_UP=new P(0,1,0);ZJ.DEFAULT_MATRIX_AUTO_UPDATE=!0;ZJ.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class L8 extends ZJ{constructor(){super();this.isGroup=!0,this.type="Group"}}var CN={type:"move"};class e7{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new L8,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new L8,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new L8,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P,this._grip.eventsEnabled=!1;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let Q=this._hand;if(Q)for(let $ of J.hand.values())this._getHandJoint(Q,$)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,Q,$){let W=null,Z=null,K=null,H=this._targetRay,Y=this._grip,X=this._hand;if(J&&Q.session.visibilityState!=="visible-blurred"){if(X&&J.hand){K=!0;for(let O of J.hand.values()){let R=Q.getJointPose(O,$),D=this._getHandJoint(X,O);if(R!==null)D.matrix.fromArray(R.transform.matrix),D.matrix.decompose(D.position,D.rotation,D.scale),D.matrixWorldNeedsUpdate=!0,D.jointRadius=R.radius;D.visible=R!==null}let U=X.joints["index-finger-tip"],N=X.joints["thumb-tip"],E=U.position.distanceTo(N.position),G=0.02,q=0.005;if(X.inputState.pinching&&E>G+q)X.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!X.inputState.pinching&&E<=G-q)X.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(Y!==null&&J.gripSpace){if(Z=Q.getPose(J.gripSpace,$),Z!==null){if(Y.matrix.fromArray(Z.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,Z.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(Z.linearVelocity);else Y.hasLinearVelocity=!1;if(Z.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(Z.angularVelocity);else Y.hasAngularVelocity=!1;if(Y.eventsEnabled)Y.dispatchEvent({type:"gripUpdated",data:J,target:this})}}if(H!==null){if(W=Q.getPose(J.targetRaySpace,$),W===null&&Z!==null)W=Z;if(W!==null){if(H.matrix.fromArray(W.transform.matrix),H.matrix.decompose(H.position,H.rotation,H.scale),H.matrixWorldNeedsUpdate=!0,W.linearVelocity)H.hasLinearVelocity=!0,H.linearVelocity.copy(W.linearVelocity);else H.hasLinearVelocity=!1;if(W.angularVelocity)H.hasAngularVelocity=!0,H.angularVelocity.copy(W.angularVelocity);else H.hasAngularVelocity=!1;this.dispatchEvent(CN)}}}if(H!==null)H.visible=W!==null;if(Y!==null)Y.visible=Z!==null;if(X!==null)X.visible=K!==null;return this}_getHandJoint(J,Q){if(J.joints[Q.jointName]===void 0){let $=new L8;$.matrixAutoUpdate=!1,$.visible=!1,J.joints[Q.jointName]=$,J.add($)}return J.joints[Q.jointName]}}var fY={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},c9={h:0,s:0,l:0},k6={h:0,s:0,l:0};function M$(J,Q,$){if($<0)$+=1;if($>1)$-=1;if($<0.16666666666666666)return J+(Q-J)*6*$;if($<0.5)return Q;if($<0.6666666666666666)return J+(Q-J)*6*(0.6666666666666666-$);return J}class B0{constructor(J,Q,$){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,Q,$)}set(J,Q,$){if(Q===void 0&&$===void 0){let W=J;if(W&&W.isColor)this.copy(W);else if(typeof W==="number")this.setHex(W);else if(typeof W==="string")this.setStyle(W)}else this.setRGB(J,Q,$);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,Q="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,JJ.colorSpaceToWorking(this,Q),this}setRGB(J,Q,$,W=JJ.workingColorSpace){return this.r=J,this.g=Q,this.b=$,JJ.colorSpaceToWorking(this,W),this}setHSL(J,Q,$,W=JJ.workingColorSpace){if(J=$Z(J,1),Q=g0(Q,0,1),$=g0($,0,1),Q===0)this.r=this.g=this.b=$;else{let Z=$<=0.5?$*(1+Q):$+Q-$*Q,K=2*$-Z;this.r=M$(K,Z,J+0.3333333333333333),this.g=M$(K,Z,J),this.b=M$(K,Z,J-0.3333333333333333)}return JJ.colorSpaceToWorking(this,W),this}setStyle(J,Q="srgb"){function $(Z){if(Z===void 0)return;if(parseFloat(Z)<1)Y0("Color: Alpha component of "+J+" will be ignored.")}let W;if(W=/^(\w+)\(([^\)]*)\)/.exec(J)){let Z,K=W[1],H=W[2];switch(K){case"rgb":case"rgba":if(Z=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(Z[4]),this.setRGB(Math.min(255,parseInt(Z[1],10))/255,Math.min(255,parseInt(Z[2],10))/255,Math.min(255,parseInt(Z[3],10))/255,Q);if(Z=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(Z[4]),this.setRGB(Math.min(100,parseInt(Z[1],10))/100,Math.min(100,parseInt(Z[2],10))/100,Math.min(100,parseInt(Z[3],10))/100,Q);break;case"hsl":case"hsla":if(Z=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(Z[4]),this.setHSL(parseFloat(Z[1])/360,parseFloat(Z[2])/100,parseFloat(Z[3])/100,Q);break;default:Y0("Color: Unknown color model "+J)}}else if(W=/^\#([A-Fa-f\d]+)$/.exec(J)){let Z=W[1],K=Z.length;if(K===3)return this.setRGB(parseInt(Z.charAt(0),16)/15,parseInt(Z.charAt(1),16)/15,parseInt(Z.charAt(2),16)/15,Q);else if(K===6)return this.setHex(parseInt(Z,16),Q);else Y0("Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,Q);return this}setColorName(J,Q="srgb"){let $=fY[J.toLowerCase()];if($!==void 0)this.setHex($,Q);else Y0("Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=f9(J.r),this.g=f9(J.g),this.b=f9(J.b),this}copyLinearToSRGB(J){return this.r=Y7(J.r),this.g=Y7(J.g),this.b=Y7(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return JJ.workingToColorSpace(bJ.copy(this),J),Math.round(g0(bJ.r*255,0,255))*65536+Math.round(g0(bJ.g*255,0,255))*256+Math.round(g0(bJ.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,Q=JJ.workingColorSpace){JJ.workingToColorSpace(bJ.copy(this),Q);let{r:$,g:W,b:Z}=bJ,K=Math.max($,W,Z),H=Math.min($,W,Z),Y,X,U=(H+K)/2;if(H===K)Y=0,X=0;else{let N=K-H;switch(X=U<=0.5?N/(K+H):N/(2-K-H),K){case $:Y=(W-Z)/N+(W<Z?6:0);break;case W:Y=(Z-$)/N+2;break;case Z:Y=($-W)/N+4;break}Y/=6}return J.h=Y,J.s=X,J.l=U,J}getRGB(J,Q=JJ.workingColorSpace){return JJ.workingToColorSpace(bJ.copy(this),Q),J.r=bJ.r,J.g=bJ.g,J.b=bJ.b,J}getStyle(J="srgb"){JJ.workingToColorSpace(bJ.copy(this),J);let{r:Q,g:$,b:W}=bJ;if(J!=="srgb")return`color(${J} ${Q.toFixed(3)} ${$.toFixed(3)} ${W.toFixed(3)})`;return`rgb(${Math.round(Q*255)},${Math.round($*255)},${Math.round(W*255)})`}offsetHSL(J,Q,$){return this.getHSL(c9),this.setHSL(c9.h+J,c9.s+Q,c9.l+$)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,Q){return this.r=J.r+Q.r,this.g=J.g+Q.g,this.b=J.b+Q.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,Q){return this.r+=(J.r-this.r)*Q,this.g+=(J.g-this.g)*Q,this.b+=(J.b-this.b)*Q,this}lerpColors(J,Q,$){return this.r=J.r+(Q.r-J.r)*$,this.g=J.g+(Q.g-J.g)*$,this.b=J.b+(Q.b-J.b)*$,this}lerpHSL(J,Q){this.getHSL(c9),J.getHSL(k6);let $=x7(c9.h,k6.h,Q),W=x7(c9.s,k6.s,Q),Z=x7(c9.l,k6.l,Q);return this.setHSL($,W,Z),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let Q=this.r,$=this.g,W=this.b,Z=J.elements;return this.r=Z[0]*Q+Z[3]*$+Z[6]*W,this.g=Z[1]*Q+Z[4]*$+Z[7]*W,this.b=Z[2]*Q+Z[5]*$+Z[8]*W,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,Q=0){return this.r=J[Q],this.g=J[Q+1],this.b=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.r,J[Q+1]=this.g,J[Q+2]=this.b,J}fromBufferAttribute(J,Q){return this.r=J.getX(Q),this.g=J.getY(Q),this.b=J.getZ(Q),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var bJ=new B0;B0.NAMES=fY;class BQ{constructor(J,Q=0.00025){this.isFogExp2=!0,this.name="",this.color=new B0(J),this.density=Q}clone(){return new BQ(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class zQ{constructor(J,Q=1,$=1000){this.isFog=!0,this.name="",this.color=new B0(J),this.near=Q,this.far=$}clone(){return new zQ(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class ZZ extends ZJ{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new N9,this.environmentIntensity=1,this.environmentRotation=new N9,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,Q){if(super.copy(J,Q),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let Q=super.toJSON(J);if(this.fog!==null)Q.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)Q.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)Q.object.backgroundIntensity=this.backgroundIntensity;if(Q.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)Q.object.environmentIntensity=this.environmentIntensity;return Q.object.environmentRotation=this.environmentRotation.toArray(),Q}}var X9=new P,_9=new P,L$=new P,C9=new P,u8=new P,c8=new P,jK=new P,V$=new P,B$=new P,z$=new P,I$=new XJ,A$=new XJ,w$=new XJ;class nJ{constructor(J=new P,Q=new P,$=new P){this.a=J,this.b=Q,this.c=$}static getNormal(J,Q,$,W){W.subVectors($,Q),X9.subVectors(J,Q),W.cross(X9);let Z=W.lengthSq();if(Z>0)return W.multiplyScalar(1/Math.sqrt(Z));return W.set(0,0,0)}static getBarycoord(J,Q,$,W,Z){X9.subVectors(W,Q),_9.subVectors($,Q),L$.subVectors(J,Q);let K=X9.dot(X9),H=X9.dot(_9),Y=X9.dot(L$),X=_9.dot(_9),U=_9.dot(L$),N=K*X-H*H;if(N===0)return Z.set(0,0,0),null;let E=1/N,G=(X*Y-H*U)*E,q=(K*U-H*Y)*E;return Z.set(1-G-q,q,G)}static containsPoint(J,Q,$,W){if(this.getBarycoord(J,Q,$,W,C9)===null)return!1;return C9.x>=0&&C9.y>=0&&C9.x+C9.y<=1}static getInterpolation(J,Q,$,W,Z,K,H,Y){if(this.getBarycoord(J,Q,$,W,C9)===null){if(Y.x=0,Y.y=0,"z"in Y)Y.z=0;if("w"in Y)Y.w=0;return null}return Y.setScalar(0),Y.addScaledVector(Z,C9.x),Y.addScaledVector(K,C9.y),Y.addScaledVector(H,C9.z),Y}static getInterpolatedAttribute(J,Q,$,W,Z,K){return I$.setScalar(0),A$.setScalar(0),w$.setScalar(0),I$.fromBufferAttribute(J,Q),A$.fromBufferAttribute(J,$),w$.fromBufferAttribute(J,W),K.setScalar(0),K.addScaledVector(I$,Z.x),K.addScaledVector(A$,Z.y),K.addScaledVector(w$,Z.z),K}static isFrontFacing(J,Q,$,W){return X9.subVectors($,Q),_9.subVectors(J,Q),X9.cross(_9).dot(W)<0}set(J,Q,$){return this.a.copy(J),this.b.copy(Q),this.c.copy($),this}setFromPointsAndIndices(J,Q,$,W){return this.a.copy(J[Q]),this.b.copy(J[$]),this.c.copy(J[W]),this}setFromAttributeAndIndices(J,Q,$,W){return this.a.fromBufferAttribute(J,Q),this.b.fromBufferAttribute(J,$),this.c.fromBufferAttribute(J,W),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return X9.subVectors(this.c,this.b),_9.subVectors(this.a,this.b),X9.cross(_9).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return nJ.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,Q){return nJ.getBarycoord(J,this.a,this.b,this.c,Q)}getInterpolation(J,Q,$,W,Z){return nJ.getInterpolation(J,this.a,this.b,this.c,Q,$,W,Z)}containsPoint(J){return nJ.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return nJ.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,Q){let $=this.a,W=this.b,Z=this.c,K,H;u8.subVectors(W,$),c8.subVectors(Z,$),V$.subVectors(J,$);let Y=u8.dot(V$),X=c8.dot(V$);if(Y<=0&&X<=0)return Q.copy($);B$.subVectors(J,W);let U=u8.dot(B$),N=c8.dot(B$);if(U>=0&&N<=U)return Q.copy(W);let E=Y*N-U*X;if(E<=0&&Y>=0&&U<=0)return K=Y/(Y-U),Q.copy($).addScaledVector(u8,K);z$.subVectors(J,Z);let G=u8.dot(z$),q=c8.dot(z$);if(q>=0&&G<=q)return Q.copy(Z);let O=G*X-Y*q;if(O<=0&&X>=0&&q<=0)return H=X/(X-q),Q.copy($).addScaledVector(c8,H);let R=U*q-G*N;if(R<=0&&N-U>=0&&G-q>=0)return jK.subVectors(Z,W),H=(N-U)/(N-U+(G-q)),Q.copy(W).addScaledVector(jK,H);let D=1/(R+O+E);return K=O*D,H=E*D,Q.copy($).addScaledVector(u8,K).addScaledVector(c8,H)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}class yJ{constructor(J=new P(1/0,1/0,1/0),Q=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromArray(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q+=3)this.expandByPoint(U9.fromArray(J,Q));return this}setFromBufferAttribute(J){this.makeEmpty();for(let Q=0,$=J.count;Q<$;Q++)this.expandByPoint(U9.fromBufferAttribute(J,Q));return this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=U9.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}setFromObject(J,Q=!1){return this.makeEmpty(),this.expandByObject(J,Q)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,Q=!1){J.updateWorldMatrix(!1,!1);let $=J.geometry;if($!==void 0){let Z=$.getAttribute("position");if(Q===!0&&Z!==void 0&&J.isInstancedMesh!==!0)for(let K=0,H=Z.count;K<H;K++){if(J.isMesh===!0)J.getVertexPosition(K,U9);else U9.fromBufferAttribute(Z,K);U9.applyMatrix4(J.matrixWorld),this.expandByPoint(U9)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();M6.copy(J.boundingBox)}else{if($.boundingBox===null)$.computeBoundingBox();M6.copy($.boundingBox)}M6.applyMatrix4(J.matrixWorld),this.union(M6)}}let W=J.children;for(let Z=0,K=W.length;Z<K;Z++)this.expandByObject(W[Z],Q);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,U9),U9.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let Q,$;if(J.normal.x>0)Q=J.normal.x*this.min.x,$=J.normal.x*this.max.x;else Q=J.normal.x*this.max.x,$=J.normal.x*this.min.x;if(J.normal.y>0)Q+=J.normal.y*this.min.y,$+=J.normal.y*this.max.y;else Q+=J.normal.y*this.max.y,$+=J.normal.y*this.min.y;if(J.normal.z>0)Q+=J.normal.z*this.min.z,$+=J.normal.z*this.max.z;else Q+=J.normal.z*this.max.z,$+=J.normal.z*this.min.z;return Q<=-J.constant&&$>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(A7),L6.subVectors(this.max,A7),n8.subVectors(J.a,A7),s8.subVectors(J.b,A7),i8.subVectors(J.c,A7),n9.subVectors(s8,n8),s9.subVectors(i8,s8),X8.subVectors(n8,i8);let Q=[0,-n9.z,n9.y,0,-s9.z,s9.y,0,-X8.z,X8.y,n9.z,0,-n9.x,s9.z,0,-s9.x,X8.z,0,-X8.x,-n9.y,n9.x,0,-s9.y,s9.x,0,-X8.y,X8.x,0];if(!_$(Q,n8,s8,i8,L6))return!1;if(Q=[1,0,0,0,1,0,0,0,1],!_$(Q,n8,s8,i8,L6))return!1;return V6.crossVectors(n9,s9),Q=[V6.x,V6.y,V6.z],_$(Q,n8,s8,i8,L6)}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,U9).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(U9).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return P9[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),P9[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),P9[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),P9[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),P9[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),P9[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),P9[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),P9[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(P9),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(J){return this.min.fromArray(J.min),this.max.fromArray(J.max),this}}var P9=[new P,new P,new P,new P,new P,new P,new P,new P],U9=new P,M6=new yJ,n8=new P,s8=new P,i8=new P,n9=new P,s9=new P,X8=new P,A7=new P,L6=new P,V6=new P,U8=new P;function _$(J,Q,$,W,Z){for(let K=0,H=J.length-3;K<=H;K+=3){U8.fromArray(J,K);let Y=Z.x*Math.abs(U8.x)+Z.y*Math.abs(U8.y)+Z.z*Math.abs(U8.z),X=Q.dot(U8),U=$.dot(U8),N=W.dot(U8);if(Math.max(-Math.max(X,U,N),Math.min(X,U,N))>Y)return!1}return!0}var y9=PN();function PN(){let J=new ArrayBuffer(4),Q=new Float32Array(J),$=new Uint32Array(J),W=new Uint32Array(512),Z=new Uint32Array(512);for(let X=0;X<256;++X){let U=X-127;if(U<-27)W[X]=0,W[X|256]=32768,Z[X]=24,Z[X|256]=24;else if(U<-14)W[X]=1024>>-U-14,W[X|256]=1024>>-U-14|32768,Z[X]=-U-1,Z[X|256]=-U-1;else if(U<=15)W[X]=U+15<<10,W[X|256]=U+15<<10|32768,Z[X]=13,Z[X|256]=13;else if(U<128)W[X]=31744,W[X|256]=64512,Z[X]=24,Z[X|256]=24;else W[X]=31744,W[X|256]=64512,Z[X]=13,Z[X|256]=13}let K=new Uint32Array(2048),H=new Uint32Array(64),Y=new Uint32Array(64);for(let X=1;X<1024;++X){let U=X<<13,N=0;while((U&8388608)===0)U<<=1,N-=8388608;U&=-8388609,N+=947912704,K[X]=U|N}for(let X=1024;X<2048;++X)K[X]=939524096+(X-1024<<13);for(let X=1;X<31;++X)H[X]=X<<23;H[31]=1199570944,H[32]=2147483648;for(let X=33;X<63;++X)H[X]=2147483648+(X-32<<23);H[63]=3347054592;for(let X=1;X<64;++X)if(X!==32)Y[X]=1024;return{floatView:Q,uint32View:$,baseTable:W,shiftTable:Z,mantissaTable:K,exponentTable:H,offsetTable:Y}}function cJ(J){if(Math.abs(J)>65504)Y0("DataUtils.toHalfFloat(): Value out of range.");J=g0(J,-65504,65504),y9.floatView[0]=J;let Q=y9.uint32View[0],$=Q>>23&511;return y9.baseTable[$]+((Q&8388607)>>y9.shiftTable[$])}function b7(J){let Q=J>>10;return y9.uint32View[0]=y9.mantissaTable[y9.offsetTable[Q]+(J&1023)]+y9.exponentTable[Q],y9.floatView[0]}class bY{static toHalfFloat(J){return cJ(J)}static fromHalfFloat(J){return b7(J)}}var wJ=new P,B6=new a,TN=0;class YJ extends K9{constructor(J,Q,$=!1){super();if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:TN++}),this.name="",this.array=J,this.itemSize=Q,this.count=J!==void 0?J.length/Q:0,this.normalized=$,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,Q,$){J*=this.itemSize,$*=Q.itemSize;for(let W=0,Z=this.itemSize;W<Z;W++)this.array[J+W]=Q.array[$+W];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let Q=0,$=this.count;Q<$;Q++)B6.fromBufferAttribute(this,Q),B6.applyMatrix3(J),this.setXY(Q,B6.x,B6.y);else if(this.itemSize===3)for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.applyMatrix3(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}applyMatrix4(J){for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.applyMatrix4(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.applyNormalMatrix(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)wJ.fromBufferAttribute(this,Q),wJ.transformDirection(J),this.setXYZ(Q,wJ.x,wJ.y,wJ.z);return this}set(J,Q=0){return this.array.set(J,Q),this}getComponent(J,Q){let $=this.array[J*this.itemSize+Q];if(this.normalized)$=dJ($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=o0($,this.array);return this.array[J*this.itemSize+Q]=$,this}getX(J){let Q=this.array[J*this.itemSize];if(this.normalized)Q=dJ(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize]=Q,this}getY(J){let Q=this.array[J*this.itemSize+1];if(this.normalized)Q=dJ(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+1]=Q,this}getZ(J){let Q=this.array[J*this.itemSize+2];if(this.normalized)Q=dJ(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+2]=Q,this}getW(J){let Q=this.array[J*this.itemSize+3];if(this.normalized)Q=dJ(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+3]=Q,this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this}setXYZ(J,Q,$,W){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),W=o0(W,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=W,this}setXYZW(J,Q,$,W,Z){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),W=o0(W,this.array),Z=o0(Z,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=W,this.array[J+3]=Z,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")J.name=this.name;if(this.usage!==35044)J.usage=this.usage;return J}dispose(){this.dispatchEvent({type:"dispose"})}}class hY extends YJ{constructor(J,Q,$){super(new Int8Array(J),Q,$)}}class xY extends YJ{constructor(J,Q,$){super(new Uint8Array(J),Q,$)}}class gY extends YJ{constructor(J,Q,$){super(new Uint8ClampedArray(J),Q,$)}}class pY extends YJ{constructor(J,Q,$){super(new Int16Array(J),Q,$)}}class IQ extends YJ{constructor(J,Q,$){super(new Uint16Array(J),Q,$)}}class mY extends YJ{constructor(J,Q,$){super(new Int32Array(J),Q,$)}}class AQ extends YJ{constructor(J,Q,$){super(new Uint32Array(J),Q,$)}}class dY extends YJ{constructor(J,Q,$){super(new Uint16Array(J),Q,$);this.isFloat16BufferAttribute=!0}getX(J){let Q=b7(this.array[J*this.itemSize]);if(this.normalized)Q=dJ(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize]=cJ(Q),this}getY(J){let Q=b7(this.array[J*this.itemSize+1]);if(this.normalized)Q=dJ(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+1]=cJ(Q),this}getZ(J){let Q=b7(this.array[J*this.itemSize+2]);if(this.normalized)Q=dJ(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+2]=cJ(Q),this}getW(J){let Q=b7(this.array[J*this.itemSize+3]);if(this.normalized)Q=dJ(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+3]=cJ(Q),this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.array[J+0]=cJ(Q),this.array[J+1]=cJ($),this}setXYZ(J,Q,$,W){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),W=o0(W,this.array);return this.array[J+0]=cJ(Q),this.array[J+1]=cJ($),this.array[J+2]=cJ(W),this}setXYZW(J,Q,$,W,Z){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),W=o0(W,this.array),Z=o0(Z,this.array);return this.array[J+0]=cJ(Q),this.array[J+1]=cJ($),this.array[J+2]=cJ(W),this.array[J+3]=cJ(Z),this}}class w0 extends YJ{constructor(J,Q,$){super(new Float32Array(J),Q,$)}}var SN=new yJ,w7=new P,C$=new P;class SJ{constructor(J=new P,Q=-1){this.isSphere=!0,this.center=J,this.radius=Q}set(J,Q){return this.center.copy(J),this.radius=Q,this}setFromPoints(J,Q){let $=this.center;if(Q!==void 0)$.copy(Q);else SN.setFromPoints(J).getCenter($);let W=0;for(let Z=0,K=J.length;Z<K;Z++)W=Math.max(W,$.distanceToSquared(J[Z]));return this.radius=Math.sqrt(W),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let Q=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=Q*Q}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,Q){let $=this.center.distanceToSquared(J);if(Q.copy(J),$>this.radius*this.radius)Q.sub(this.center).normalize(),Q.multiplyScalar(this.radius).add(this.center);return Q}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;w7.subVectors(J,this.center);let Q=w7.lengthSq();if(Q>this.radius*this.radius){let $=Math.sqrt(Q),W=($-this.radius)*0.5;this.center.addScaledVector(w7,W/$),this.radius+=W}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else C$.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(w7.copy(J.center).add(C$)),this.expandByPoint(w7.copy(J.center).sub(C$));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(J){return this.radius=J.radius,this.center.fromArray(J.center),this}}var jN=0,Z9=new p0,P$=new ZJ,o8=new P,tJ=new yJ,_7=new yJ,PJ=new P;class u0 extends K9{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:jN++}),this.uuid=eJ(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((tG(J))?AQ:IQ)(J,1);else this.index=J;return this}setIndirect(J,Q=0){return this.indirect=J,this.indirectOffset=Q,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,Q){return this.attributes[J]=Q,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,Q,$=0){this.groups.push({start:J,count:Q,materialIndex:$})}clearGroups(){this.groups=[]}setDrawRange(J,Q){this.drawRange.start=J,this.drawRange.count=Q}applyMatrix4(J){let Q=this.attributes.position;if(Q!==void 0)Q.applyMatrix4(J),Q.needsUpdate=!0;let $=this.attributes.normal;if($!==void 0){let Z=new l0().getNormalMatrix(J);$.applyNormalMatrix(Z),$.needsUpdate=!0}let W=this.attributes.tangent;if(W!==void 0)W.transformDirection(J),W.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this._transformed=!0,this}applyQuaternion(J){return Z9.makeRotationFromQuaternion(J),this.applyMatrix4(Z9),this}rotateX(J){return Z9.makeRotationX(J),this.applyMatrix4(Z9),this}rotateY(J){return Z9.makeRotationY(J),this.applyMatrix4(Z9),this}rotateZ(J){return Z9.makeRotationZ(J),this.applyMatrix4(Z9),this}translate(J,Q,$){return Z9.makeTranslation(J,Q,$),this.applyMatrix4(Z9),this}scale(J,Q,$){return Z9.makeScale(J,Q,$),this.applyMatrix4(Z9),this}lookAt(J){return P$.lookAt(J),P$.updateMatrix(),this.applyMatrix4(P$.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(o8).negate(),this.translate(o8.x,o8.y,o8.z),this}setFromPoints(J){let Q=this.getAttribute("position");if(Q===void 0){let $=[];for(let W=0,Z=J.length;W<Z;W++){let K=J[W];$.push(K.x,K.y,K.z||0)}this.setAttribute("position",new w0($,3))}else{let $=Math.min(J.length,Q.count);for(let W=0;W<$;W++){let Z=J[W];Q.setXYZ(W,Z.x,Z.y,Z.z||0)}if(J.length>Q.count)Y0("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");Q.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new yJ;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){T0("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),Q)for(let $=0,W=Q.length;$<W;$++){let Z=Q[$];if(tJ.setFromBufferAttribute(Z),this.morphTargetsRelative)PJ.addVectors(this.boundingBox.min,tJ.min),this.boundingBox.expandByPoint(PJ),PJ.addVectors(this.boundingBox.max,tJ.max),this.boundingBox.expandByPoint(PJ);else this.boundingBox.expandByPoint(tJ.min),this.boundingBox.expandByPoint(tJ.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))T0('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new SJ;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){T0("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(J){let $=this.boundingSphere.center;if(tJ.setFromBufferAttribute(J),Q)for(let Z=0,K=Q.length;Z<K;Z++){let H=Q[Z];if(_7.setFromBufferAttribute(H),this.morphTargetsRelative)PJ.addVectors(tJ.min,_7.min),tJ.expandByPoint(PJ),PJ.addVectors(tJ.max,_7.max),tJ.expandByPoint(PJ);else tJ.expandByPoint(_7.min),tJ.expandByPoint(_7.max)}tJ.getCenter($);let W=0;for(let Z=0,K=J.count;Z<K;Z++)PJ.fromBufferAttribute(J,Z),W=Math.max(W,$.distanceToSquared(PJ));if(Q)for(let Z=0,K=Q.length;Z<K;Z++){let H=Q[Z],Y=this.morphTargetsRelative;for(let X=0,U=H.count;X<U;X++){if(PJ.fromBufferAttribute(H,X),Y)o8.fromBufferAttribute(J,X),PJ.add(o8);W=Math.max(W,$.distanceToSquared(PJ))}}if(this.boundingSphere.radius=Math.sqrt(W),isNaN(this.boundingSphere.radius))T0('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,Q=this.attributes;if(J===null||Q.position===void 0||Q.normal===void 0||Q.uv===void 0){T0("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:$,normal:W,uv:Z}=Q,K=this.getAttribute("tangent");if(K===void 0||K.count!==$.count)K=new YJ(new Float32Array(4*$.count),4),this.setAttribute("tangent",K);let H=[],Y=[];for(let C=0;C<$.count;C++)H[C]=new P,Y[C]=new P;let X=new P,U=new P,N=new P,E=new a,G=new a,q=new a,O=new P,R=new P;function D(C,k,B){X.fromBufferAttribute($,C),U.fromBufferAttribute($,k),N.fromBufferAttribute($,B),E.fromBufferAttribute(Z,C),G.fromBufferAttribute(Z,k),q.fromBufferAttribute(Z,B),U.sub(X),N.sub(X),G.sub(E),q.sub(E);let f=1/(G.x*q.y-q.x*G.y);if(!isFinite(f))return;O.copy(U).multiplyScalar(q.y).addScaledVector(N,-G.y).multiplyScalar(f),R.copy(N).multiplyScalar(G.x).addScaledVector(U,-q.x).multiplyScalar(f),H[C].add(O),H[k].add(O),H[B].add(O),Y[C].add(R),Y[k].add(R),Y[B].add(R)}let F=this.groups;if(F.length===0)F=[{start:0,count:J.count}];for(let C=0,k=F.length;C<k;++C){let B=F[C],f=B.start,T=B.count;for(let p=f,n=f+T;p<n;p+=3)D(J.getX(p+0),J.getX(p+1),J.getX(p+2))}let I=new P,V=new P,M=new P,w=new P;function _(C){M.fromBufferAttribute(W,C),w.copy(M);let k=H[C];I.copy(k),I.sub(M.multiplyScalar(M.dot(k))).normalize(),V.crossVectors(w,k);let f=V.dot(Y[C])<0?-1:1;K.setXYZW(C,I.x,I.y,I.z,f)}for(let C=0,k=F.length;C<k;++C){let B=F[C],f=B.start,T=B.count;for(let p=f,n=f+T;p<n;p+=3)_(J.getX(p+0)),_(J.getX(p+1)),_(J.getX(p+2))}this._transformed=!0}computeVertexNormals(){let J=this.index,Q=this.getAttribute("position");if(Q!==void 0){let $=this.getAttribute("normal");if($===void 0||$.count!==Q.count)$=new YJ(new Float32Array(Q.count*3),3),this.setAttribute("normal",$);else for(let E=0,G=$.count;E<G;E++)$.setXYZ(E,0,0,0);let W=new P,Z=new P,K=new P,H=new P,Y=new P,X=new P,U=new P,N=new P;if(J)for(let E=0,G=J.count;E<G;E+=3){let q=J.getX(E+0),O=J.getX(E+1),R=J.getX(E+2);W.fromBufferAttribute(Q,q),Z.fromBufferAttribute(Q,O),K.fromBufferAttribute(Q,R),U.subVectors(K,Z),N.subVectors(W,Z),U.cross(N),H.fromBufferAttribute($,q),Y.fromBufferAttribute($,O),X.fromBufferAttribute($,R),H.add(U),Y.add(U),X.add(U),$.setXYZ(q,H.x,H.y,H.z),$.setXYZ(O,Y.x,Y.y,Y.z),$.setXYZ(R,X.x,X.y,X.z)}else for(let E=0,G=Q.count;E<G;E+=3)W.fromBufferAttribute(Q,E+0),Z.fromBufferAttribute(Q,E+1),K.fromBufferAttribute(Q,E+2),U.subVectors(K,Z),N.subVectors(W,Z),U.cross(N),$.setXYZ(E+0,U.x,U.y,U.z),$.setXYZ(E+1,U.x,U.y,U.z),$.setXYZ(E+2,U.x,U.y,U.z);this.normalizeNormals(),$.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let Q=0,$=J.count;Q<$;Q++)PJ.fromBufferAttribute(J,Q),PJ.normalize(),J.setXYZ(Q,PJ.x,PJ.y,PJ.z)}toNonIndexed(){function J(H,Y){let{array:X,itemSize:U,normalized:N}=H,E=new X.constructor(Y.length*U),G=0,q=0;for(let O=0,R=Y.length;O<R;O++){if(H.isInterleavedBufferAttribute)G=Y[O]*H.data.stride+H.offset;else G=Y[O]*U;for(let D=0;D<U;D++)E[q++]=X[G++]}return new YJ(E,U,N)}if(this.index===null)return Y0("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let Q=new u0,$=this.index.array,W=this.attributes;for(let H in W){let Y=W[H],X=J(Y,$);Q.setAttribute(H,X)}let Z=this.morphAttributes;for(let H in Z){let Y=[],X=Z[H];for(let U=0,N=X.length;U<N;U++){let E=X[U],G=J(E,$);Y.push(G)}Q.morphAttributes[H]=Y}Q.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;for(let H=0,Y=K.length;H<Y;H++){let X=K[H];Q.addGroup(X.start,X.count,X.materialIndex)}return Q}toJSON(){let J={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!=="")J.name=this.name;if(Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0&&this._transformed!==!0){let Y=this.parameters;for(let X in Y)if(Y[X]!==void 0)J[X]=Y[X];return J}J.data={attributes:{}};let Q=this.index;if(Q!==null)J.data.index={type:Q.array.constructor.name,array:Array.prototype.slice.call(Q.array)};let $=this.attributes;for(let Y in $){let X=$[Y];J.data.attributes[Y]=X.toJSON(J.data)}let W={},Z=!1;for(let Y in this.morphAttributes){let X=this.morphAttributes[Y],U=[];for(let N=0,E=X.length;N<E;N++){let G=X[N];U.push(G.toJSON(J.data))}if(U.length>0)W[Y]=U,Z=!0}if(Z)J.data.morphAttributes=W,J.data.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;if(K.length>0)J.data.groups=JSON.parse(JSON.stringify(K));let H=this.boundingSphere;if(H!==null)J.data.boundingSphere=H.toJSON();return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let Q={};this.name=J.name;let $=J.index;if($!==null)this.setIndex($.clone());let W=J.attributes;for(let X in W){let U=W[X];this.setAttribute(X,U.clone(Q))}let Z=J.morphAttributes;for(let X in Z){let U=[],N=Z[X];for(let E=0,G=N.length;E<G;E++)U.push(N[E].clone(Q));this.morphAttributes[X]=U}this.morphTargetsRelative=J.morphTargetsRelative;let K=J.groups;for(let X=0,U=K.length;X<U;X++){let N=K[X];this.addGroup(N.start,N.count,N.materialIndex)}let H=J.boundingBox;if(H!==null)this.boundingBox=H.clone();let Y=J.boundingSphere;if(Y!==null)this.boundingSphere=Y.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this._transformed=J._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class J6{constructor(J,Q){this.isInterleavedBuffer=!0,this.array=J,this.stride=Q,this.count=J!==void 0?J.length/Q:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=eJ()}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.array=new J.array.constructor(J.array),this.count=J.count,this.stride=J.stride,this.usage=J.usage,this}copyAt(J,Q,$){J*=this.stride,$*=Q.stride;for(let W=0,Z=this.stride;W<Z;W++)this.array[J+W]=Q.array[$+W];return this}set(J,Q=0){return this.array.set(J,Q),this}clone(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=eJ();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let Q=new this.array.constructor(J.arrayBuffers[this.array.buffer._uuid]),$=new this.constructor(Q,this.stride);return $.setUsage(this.usage),$}onUpload(J){return this.onUploadCallback=J,this}toJSON(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=eJ();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}var mJ=new P;class I8{constructor(J,Q,$,W=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=J,this.itemSize=Q,this.offset=$,this.normalized=W}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(J){this.data.needsUpdate=J}applyMatrix4(J){for(let Q=0,$=this.data.count;Q<$;Q++)mJ.fromBufferAttribute(this,Q),mJ.applyMatrix4(J),this.setXYZ(Q,mJ.x,mJ.y,mJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)mJ.fromBufferAttribute(this,Q),mJ.applyNormalMatrix(J),this.setXYZ(Q,mJ.x,mJ.y,mJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)mJ.fromBufferAttribute(this,Q),mJ.transformDirection(J),this.setXYZ(Q,mJ.x,mJ.y,mJ.z);return this}getComponent(J,Q){let $=this.array[J*this.data.stride+this.offset+Q];if(this.normalized)$=dJ($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=o0($,this.array);return this.data.array[J*this.data.stride+this.offset+Q]=$,this}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset]=Q,this}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+1]=Q,this}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+2]=Q,this}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+3]=Q,this}getX(J){let Q=this.data.array[J*this.data.stride+this.offset];if(this.normalized)Q=dJ(Q,this.array);return Q}getY(J){let Q=this.data.array[J*this.data.stride+this.offset+1];if(this.normalized)Q=dJ(Q,this.array);return Q}getZ(J){let Q=this.data.array[J*this.data.stride+this.offset+2];if(this.normalized)Q=dJ(Q,this.array);return Q}getW(J){let Q=this.data.array[J*this.data.stride+this.offset+3];if(this.normalized)Q=dJ(Q,this.array);return Q}setXY(J,Q,$){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this}setXYZ(J,Q,$,W){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),W=o0(W,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this.data.array[J+2]=W,this}setXYZW(J,Q,$,W,Z){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),W=o0(W,this.array),Z=o0(Z,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this.data.array[J+2]=W,this.data.array[J+3]=Z,this}clone(J){if(J===void 0){m7("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let Q=[];for(let $=0;$<this.count;$++){let W=$*this.data.stride+this.offset;for(let Z=0;Z<this.itemSize;Z++)Q.push(this.data.array[W+Z])}return new YJ(new this.array.constructor(Q),this.itemSize,this.normalized)}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.clone(J);return new I8(J.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(J){if(J===void 0){m7("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let Q=[];for(let $=0;$<this.count;$++){let W=$*this.data.stride+this.offset;for(let Z=0;Z<this.itemSize;Z++)Q.push(this.data.array[W+Z])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:Q,normalized:this.normalized}}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.toJSON(J);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}var yN=0;class jJ extends K9{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:yN++}),this.uuid=eJ(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new B0(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let Q in J){let $=J[Q];if($===void 0){Y0(`Material: parameter '${Q}' has value of undefined.`);continue}let W=this[Q];if(W===void 0){Y0(`Material: '${Q}' is not a property of THREE.${this.type}.`);continue}if(W&&W.isColor)W.set($);else if(W&&W.isVector2&&($&&$.isVector2)||W&&W.isEuler&&($&&$.isEuler)||W&&W.isVector3&&($&&$.isVector3))W.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(Q)J={textures:{},images:{}};let $={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if($.uuid=this.uuid,$.type=this.type,this.name!=="")$.name=this.name;if(this.color&&this.color.isColor)$.color=this.color.getHex();if(this.roughness!==void 0)$.roughness=this.roughness;if(this.metalness!==void 0)$.metalness=this.metalness;if(this.sheen!==void 0)$.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)$.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)$.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)$.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)$.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)$.specular=this.specular.getHex();if(this.specularIntensity!==void 0)$.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)$.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)$.shininess=this.shininess;if(this.clearcoat!==void 0)$.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)$.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)$.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)$.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)$.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,$.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)$.sheenColorMap=this.sheenColorMap.toJSON(J).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)$.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(J).uuid;if(this.dispersion!==void 0)$.dispersion=this.dispersion;if(this.iridescence!==void 0)$.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)$.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)$.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)$.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)$.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)$.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)$.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)$.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)$.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)$.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)$.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)$.lightMap=this.lightMap.toJSON(J).uuid,$.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)$.aoMap=this.aoMap.toJSON(J).uuid,$.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)$.bumpMap=this.bumpMap.toJSON(J).uuid,$.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)$.normalMap=this.normalMap.toJSON(J).uuid,$.normalMapType=this.normalMapType,$.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)$.displacementMap=this.displacementMap.toJSON(J).uuid,$.displacementScale=this.displacementScale,$.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)$.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)$.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)$.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)$.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)$.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)$.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if($.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)$.combine=this.combine}if(this.envMapRotation!==void 0)$.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)$.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)$.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)$.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)$.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)$.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)$.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)$.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)$.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)$.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)$.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)$.size=this.size;if(this.shadowSide!==null)$.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)$.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)$.blending=this.blending;if(this.side!==0)$.side=this.side;if(this.vertexColors===!0)$.vertexColors=!0;if(this.opacity<1)$.opacity=this.opacity;if(this.transparent===!0)$.transparent=!0;if(this.blendSrc!==204)$.blendSrc=this.blendSrc;if(this.blendDst!==205)$.blendDst=this.blendDst;if(this.blendEquation!==100)$.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)$.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)$.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)$.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)$.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)$.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)$.depthFunc=this.depthFunc;if(this.depthTest===!1)$.depthTest=this.depthTest;if(this.depthWrite===!1)$.depthWrite=this.depthWrite;if(this.colorWrite===!1)$.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)$.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)$.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)$.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)$.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)$.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)$.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)$.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)$.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)$.rotation=this.rotation;if(this.polygonOffset===!0)$.polygonOffset=!0;if(this.polygonOffsetFactor!==0)$.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)$.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)$.linewidth=this.linewidth;if(this.dashSize!==void 0)$.dashSize=this.dashSize;if(this.gapSize!==void 0)$.gapSize=this.gapSize;if(this.scale!==void 0)$.scale=this.scale;if(this.dithering===!0)$.dithering=!0;if(this.alphaTest>0)$.alphaTest=this.alphaTest;if(this.alphaHash===!0)$.alphaHash=!0;if(this.alphaToCoverage===!0)$.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)$.premultipliedAlpha=!0;if(this.forceSinglePass===!0)$.forceSinglePass=!0;if(this.allowOverride===!1)$.allowOverride=!1;if(this.wireframe===!0)$.wireframe=!0;if(this.wireframeLinewidth>1)$.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")$.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")$.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)$.flatShading=!0;if(this.visible===!1)$.visible=!1;if(this.toneMapped===!1)$.toneMapped=!1;if(this.fog===!1)$.fog=!1;if(Object.keys(this.userData).length>0)$.userData=this.userData;function W(Z){let K=[];for(let H in Z){let Y=Z[H];delete Y.metadata,K.push(Y)}return K}if(Q){let Z=W(J.textures),K=W(J.images);if(Z.length>0)$.textures=Z;if(K.length>0)$.images=K}return $}fromJSON(J,Q){if(J.uuid!==void 0)this.uuid=J.uuid;if(J.name!==void 0)this.name=J.name;if(J.color!==void 0&&this.color!==void 0)this.color.setHex(J.color);if(J.roughness!==void 0)this.roughness=J.roughness;if(J.metalness!==void 0)this.metalness=J.metalness;if(J.sheen!==void 0)this.sheen=J.sheen;if(J.sheenColor!==void 0)this.sheenColor=new B0().setHex(J.sheenColor);if(J.sheenRoughness!==void 0)this.sheenRoughness=J.sheenRoughness;if(J.emissive!==void 0&&this.emissive!==void 0)this.emissive.setHex(J.emissive);if(J.specular!==void 0&&this.specular!==void 0)this.specular.setHex(J.specular);if(J.specularIntensity!==void 0)this.specularIntensity=J.specularIntensity;if(J.specularColor!==void 0&&this.specularColor!==void 0)this.specularColor.setHex(J.specularColor);if(J.shininess!==void 0)this.shininess=J.shininess;if(J.clearcoat!==void 0)this.clearcoat=J.clearcoat;if(J.clearcoatRoughness!==void 0)this.clearcoatRoughness=J.clearcoatRoughness;if(J.dispersion!==void 0)this.dispersion=J.dispersion;if(J.iridescence!==void 0)this.iridescence=J.iridescence;if(J.iridescenceIOR!==void 0)this.iridescenceIOR=J.iridescenceIOR;if(J.iridescenceThicknessRange!==void 0)this.iridescenceThicknessRange=J.iridescenceThicknessRange;if(J.transmission!==void 0)this.transmission=J.transmission;if(J.thickness!==void 0)this.thickness=J.thickness;if(J.attenuationDistance!==void 0)this.attenuationDistance=J.attenuationDistance;if(J.attenuationColor!==void 0&&this.attenuationColor!==void 0)this.attenuationColor.setHex(J.attenuationColor);if(J.anisotropy!==void 0)this.anisotropy=J.anisotropy;if(J.anisotropyRotation!==void 0)this.anisotropyRotation=J.anisotropyRotation;if(J.fog!==void 0)this.fog=J.fog;if(J.flatShading!==void 0)this.flatShading=J.flatShading;if(J.blending!==void 0)this.blending=J.blending;if(J.combine!==void 0)this.combine=J.combine;if(J.side!==void 0)this.side=J.side;if(J.shadowSide!==void 0)this.shadowSide=J.shadowSide;if(J.opacity!==void 0)this.opacity=J.opacity;if(J.transparent!==void 0)this.transparent=J.transparent;if(J.alphaTest!==void 0)this.alphaTest=J.alphaTest;if(J.alphaHash!==void 0)this.alphaHash=J.alphaHash;if(J.depthFunc!==void 0)this.depthFunc=J.depthFunc;if(J.depthTest!==void 0)this.depthTest=J.depthTest;if(J.depthWrite!==void 0)this.depthWrite=J.depthWrite;if(J.colorWrite!==void 0)this.colorWrite=J.colorWrite;if(J.blendSrc!==void 0)this.blendSrc=J.blendSrc;if(J.blendDst!==void 0)this.blendDst=J.blendDst;if(J.blendEquation!==void 0)this.blendEquation=J.blendEquation;if(J.blendSrcAlpha!==void 0)this.blendSrcAlpha=J.blendSrcAlpha;if(J.blendDstAlpha!==void 0)this.blendDstAlpha=J.blendDstAlpha;if(J.blendEquationAlpha!==void 0)this.blendEquationAlpha=J.blendEquationAlpha;if(J.blendColor!==void 0&&this.blendColor!==void 0)this.blendColor.setHex(J.blendColor);if(J.blendAlpha!==void 0)this.blendAlpha=J.blendAlpha;if(J.stencilWriteMask!==void 0)this.stencilWriteMask=J.stencilWriteMask;if(J.stencilFunc!==void 0)this.stencilFunc=J.stencilFunc;if(J.stencilRef!==void 0)this.stencilRef=J.stencilRef;if(J.stencilFuncMask!==void 0)this.stencilFuncMask=J.stencilFuncMask;if(J.stencilFail!==void 0)this.stencilFail=J.stencilFail;if(J.stencilZFail!==void 0)this.stencilZFail=J.stencilZFail;if(J.stencilZPass!==void 0)this.stencilZPass=J.stencilZPass;if(J.stencilWrite!==void 0)this.stencilWrite=J.stencilWrite;if(J.wireframe!==void 0)this.wireframe=J.wireframe;if(J.wireframeLinewidth!==void 0)this.wireframeLinewidth=J.wireframeLinewidth;if(J.wireframeLinecap!==void 0)this.wireframeLinecap=J.wireframeLinecap;if(J.wireframeLinejoin!==void 0)this.wireframeLinejoin=J.wireframeLinejoin;if(J.rotation!==void 0)this.rotation=J.rotation;if(J.linewidth!==void 0)this.linewidth=J.linewidth;if(J.dashSize!==void 0)this.dashSize=J.dashSize;if(J.gapSize!==void 0)this.gapSize=J.gapSize;if(J.scale!==void 0)this.scale=J.scale;if(J.polygonOffset!==void 0)this.polygonOffset=J.polygonOffset;if(J.polygonOffsetFactor!==void 0)this.polygonOffsetFactor=J.polygonOffsetFactor;if(J.polygonOffsetUnits!==void 0)this.polygonOffsetUnits=J.polygonOffsetUnits;if(J.dithering!==void 0)this.dithering=J.dithering;if(J.alphaToCoverage!==void 0)this.alphaToCoverage=J.alphaToCoverage;if(J.premultipliedAlpha!==void 0)this.premultipliedAlpha=J.premultipliedAlpha;if(J.forceSinglePass!==void 0)this.forceSinglePass=J.forceSinglePass;if(J.allowOverride!==void 0)this.allowOverride=J.allowOverride;if(J.visible!==void 0)this.visible=J.visible;if(J.toneMapped!==void 0)this.toneMapped=J.toneMapped;if(J.userData!==void 0)this.userData=J.userData;if(J.vertexColors!==void 0)if(typeof J.vertexColors==="number")this.vertexColors=J.vertexColors>0;else this.vertexColors=J.vertexColors;if(J.size!==void 0)this.size=J.size;if(J.sizeAttenuation!==void 0)this.sizeAttenuation=J.sizeAttenuation;if(J.map!==void 0)this.map=Q[J.map]||null;if(J.matcap!==void 0)this.matcap=Q[J.matcap]||null;if(J.alphaMap!==void 0)this.alphaMap=Q[J.alphaMap]||null;if(J.bumpMap!==void 0)this.bumpMap=Q[J.bumpMap]||null;if(J.bumpScale!==void 0)this.bumpScale=J.bumpScale;if(J.normalMap!==void 0)this.normalMap=Q[J.normalMap]||null;if(J.normalMapType!==void 0)this.normalMapType=J.normalMapType;if(J.normalScale!==void 0){let $=J.normalScale;if(Array.isArray($)===!1)$=[$,$];this.normalScale=new a().fromArray($)}if(J.displacementMap!==void 0)this.displacementMap=Q[J.displacementMap]||null;if(J.displacementScale!==void 0)this.displacementScale=J.displacementScale;if(J.displacementBias!==void 0)this.displacementBias=J.displacementBias;if(J.roughnessMap!==void 0)this.roughnessMap=Q[J.roughnessMap]||null;if(J.metalnessMap!==void 0)this.metalnessMap=Q[J.metalnessMap]||null;if(J.emissiveMap!==void 0)this.emissiveMap=Q[J.emissiveMap]||null;if(J.emissiveIntensity!==void 0)this.emissiveIntensity=J.emissiveIntensity;if(J.specularMap!==void 0)this.specularMap=Q[J.specularMap]||null;if(J.specularIntensityMap!==void 0)this.specularIntensityMap=Q[J.specularIntensityMap]||null;if(J.specularColorMap!==void 0)this.specularColorMap=Q[J.specularColorMap]||null;if(J.envMap!==void 0)this.envMap=Q[J.envMap]||null;if(J.envMapRotation!==void 0)this.envMapRotation.fromArray(J.envMapRotation);if(J.envMapIntensity!==void 0)this.envMapIntensity=J.envMapIntensity;if(J.reflectivity!==void 0)this.reflectivity=J.reflectivity;if(J.refractionRatio!==void 0)this.refractionRatio=J.refractionRatio;if(J.lightMap!==void 0)this.lightMap=Q[J.lightMap]||null;if(J.lightMapIntensity!==void 0)this.lightMapIntensity=J.lightMapIntensity;if(J.aoMap!==void 0)this.aoMap=Q[J.aoMap]||null;if(J.aoMapIntensity!==void 0)this.aoMapIntensity=J.aoMapIntensity;if(J.gradientMap!==void 0)this.gradientMap=Q[J.gradientMap]||null;if(J.clearcoatMap!==void 0)this.clearcoatMap=Q[J.clearcoatMap]||null;if(J.clearcoatRoughnessMap!==void 0)this.clearcoatRoughnessMap=Q[J.clearcoatRoughnessMap]||null;if(J.clearcoatNormalMap!==void 0)this.clearcoatNormalMap=Q[J.clearcoatNormalMap]||null;if(J.clearcoatNormalScale!==void 0)this.clearcoatNormalScale=new a().fromArray(J.clearcoatNormalScale);if(J.iridescenceMap!==void 0)this.iridescenceMap=Q[J.iridescenceMap]||null;if(J.iridescenceThicknessMap!==void 0)this.iridescenceThicknessMap=Q[J.iridescenceThicknessMap]||null;if(J.transmissionMap!==void 0)this.transmissionMap=Q[J.transmissionMap]||null;if(J.thicknessMap!==void 0)this.thicknessMap=Q[J.thicknessMap]||null;if(J.anisotropyMap!==void 0)this.anisotropyMap=Q[J.anisotropyMap]||null;if(J.sheenColorMap!==void 0)this.sheenColorMap=Q[J.sheenColorMap]||null;if(J.sheenRoughnessMap!==void 0)this.sheenRoughnessMap=Q[J.sheenRoughnessMap]||null;return this}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let Q=J.clippingPlanes,$=null;if(Q!==null){let W=Q.length;$=Array(W);for(let Z=0;Z!==W;++Z)$[Z]=Q[Z].clone()}return this.clippingPlanes=$,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.allowOverride=J.allowOverride,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}}class wQ extends jJ{constructor(J){super();this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new B0(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.rotation=J.rotation,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var a8,C7=new P,r8=new P,t8=new P,e8=new a,P7=new a,lY=new p0,z6=new P,T7=new P,I6=new P,yK=new a,T$=new a,vK=new a;class KZ extends ZJ{constructor(J=new wQ){super();if(this.isSprite=!0,this.type="Sprite",a8===void 0){a8=new u0;let Q=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),$=new J6(Q,5);a8.setIndex([0,1,2,0,2,3]),a8.setAttribute("position",new I8($,3,0,!1)),a8.setAttribute("uv",new I8($,2,3,!1))}this.geometry=a8,this.material=J,this.center=new a(0.5,0.5),this.count=1}raycast(J,Q){if(J.camera===null)T0('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if(r8.setFromMatrixScale(this.matrixWorld),lY.copy(J.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(J.camera.matrixWorldInverse,this.matrixWorld),t8.setFromMatrixPosition(this.modelViewMatrix),J.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)r8.multiplyScalar(-t8.z);let $=this.material.rotation,W,Z;if($!==0)Z=Math.cos($),W=Math.sin($);let K=this.center;A6(z6.set(-0.5,-0.5,0),t8,K,r8,W,Z),A6(T7.set(0.5,-0.5,0),t8,K,r8,W,Z),A6(I6.set(0.5,0.5,0),t8,K,r8,W,Z),yK.set(0,0),T$.set(1,0),vK.set(1,1);let H=J.ray.intersectTriangle(z6,T7,I6,!1,C7);if(H===null){if(A6(T7.set(-0.5,0.5,0),t8,K,r8,W,Z),T$.set(0,1),H=J.ray.intersectTriangle(z6,I6,T7,!1,C7),H===null)return}let Y=J.ray.origin.distanceTo(C7);if(Y<J.near||Y>J.far)return;Q.push({distance:Y,point:C7.clone(),uv:nJ.getInterpolation(C7,z6,T7,I6,yK,T$,vK,new a),face:null,object:this})}copy(J,Q){if(super.copy(J,Q),J.center!==void 0)this.center.copy(J.center);return this.material=J.material,this}}function A6(J,Q,$,W,Z,K){if(e8.subVectors(J,$).addScalar(0.5).multiply(W),Z!==void 0)P7.x=K*e8.x-Z*e8.y,P7.y=Z*e8.x+K*e8.y;else P7.copy(e8);J.copy(Q),J.x+=P7.x,J.y+=P7.y,J.applyMatrix4(lY)}var w6=new P,fK=new P;class HZ extends ZJ{constructor(){super();this.isLOD=!0,this._currentLevel=0,this.type="LOD",Object.defineProperties(this,{levels:{enumerable:!0,value:[]}}),this.autoUpdate=!0}copy(J){super.copy(J,!1);let Q=J.levels;for(let $=0,W=Q.length;$<W;$++){let Z=Q[$];this.addLevel(Z.object.clone(),Z.distance,Z.hysteresis)}return this.autoUpdate=J.autoUpdate,this}addLevel(J,Q=0,$=0){Q=Math.abs(Q);let W=this.levels,Z;for(Z=0;Z<W.length;Z++)if(Q<W[Z].distance)break;return W.splice(Z,0,{distance:Q,hysteresis:$,object:J}),this.add(J),this}removeLevel(J){let Q=this.levels;for(let $=0;$<Q.length;$++)if(Q[$].distance===J){let W=Q.splice($,1);return this.remove(W[0].object),!0}return!1}getCurrentLevel(){return this._currentLevel}getObjectForDistance(J){let Q=this.levels;if(Q.length>0){let $,W;for($=1,W=Q.length;$<W;$++){let Z=Q[$].distance;if(Q[$].object.visible)Z-=Z*Q[$].hysteresis;if(J<Z)break}return Q[$-1].object}return null}raycast(J,Q){if(this.levels.length>0){w6.setFromMatrixPosition(this.matrixWorld);let W=J.ray.origin.distanceTo(w6);this.getObjectForDistance(W).raycast(J,Q)}}update(J){let Q=this.levels;if(Q.length>1){w6.setFromMatrixPosition(J.matrixWorld),fK.setFromMatrixPosition(this.matrixWorld);let $=w6.distanceTo(fK)/J.zoom;Q[0].object.visible=!0;let W,Z;for(W=1,Z=Q.length;W<Z;W++){let K=Q[W].distance;if(Q[W].object.visible)K-=K*Q[W].hysteresis;if($>=K)Q[W-1].object.visible=!1,Q[W].object.visible=!0;else break}this._currentLevel=W-1;for(;W<Z;W++)Q[W].object.visible=!1}}toJSON(J){let Q=super.toJSON(J);if(this.autoUpdate===!1)Q.object.autoUpdate=!1;Q.object.levels=[];let $=this.levels;for(let W=0,Z=$.length;W<Z;W++){let K=$[W];Q.object.levels.push({object:K.object.uuid,distance:K.distance,hysteresis:K.hysteresis})}return Q}}var T9=new P,S$=new P,_6=new P,i9=new P,j$=new P,C6=new P,y$=new P;class y8{constructor(J=new P,Q=new P(0,0,-1)){this.origin=J,this.direction=Q}set(J,Q){return this.origin.copy(J),this.direction.copy(Q),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,Q){return Q.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,T9)),this}closestPointToPoint(J,Q){Q.subVectors(J,this.origin);let $=Q.dot(this.direction);if($<0)return Q.copy(this.origin);return Q.copy(this.origin).addScaledVector(this.direction,$)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let Q=T9.subVectors(J,this.origin).dot(this.direction);if(Q<0)return this.origin.distanceToSquared(J);return T9.copy(this.origin).addScaledVector(this.direction,Q),T9.distanceToSquared(J)}distanceSqToSegment(J,Q,$,W){S$.copy(J).add(Q).multiplyScalar(0.5),_6.copy(Q).sub(J).normalize(),i9.copy(this.origin).sub(S$);let Z=J.distanceTo(Q)*0.5,K=-this.direction.dot(_6),H=i9.dot(this.direction),Y=-i9.dot(_6),X=i9.lengthSq(),U=Math.abs(1-K*K),N,E,G,q;if(U>0)if(N=K*Y-H,E=K*H-Y,q=Z*U,N>=0)if(E>=-q)if(E<=q){let O=1/U;N*=O,E*=O,G=N*(N+K*E+2*H)+E*(K*N+E+2*Y)+X}else E=Z,N=Math.max(0,-(K*E+H)),G=-N*N+E*(E+2*Y)+X;else E=-Z,N=Math.max(0,-(K*E+H)),G=-N*N+E*(E+2*Y)+X;else if(E<=-q)N=Math.max(0,-(-K*Z+H)),E=N>0?-Z:Math.min(Math.max(-Z,-Y),Z),G=-N*N+E*(E+2*Y)+X;else if(E<=q)N=0,E=Math.min(Math.max(-Z,-Y),Z),G=E*(E+2*Y)+X;else N=Math.max(0,-(K*Z+H)),E=N>0?Z:Math.min(Math.max(-Z,-Y),Z),G=-N*N+E*(E+2*Y)+X;else E=K>0?-Z:Z,N=Math.max(0,-(K*E+H)),G=-N*N+E*(E+2*Y)+X;if($)$.copy(this.origin).addScaledVector(this.direction,N);if(W)W.copy(S$).addScaledVector(_6,E);return G}intersectSphere(J,Q){T9.subVectors(J.center,this.origin);let $=T9.dot(this.direction),W=T9.dot(T9)-$*$,Z=J.radius*J.radius;if(W>Z)return null;let K=Math.sqrt(Z-W),H=$-K,Y=$+K;if(Y<0)return null;if(H<0)return this.at(Y,Q);return this.at(H,Q)}intersectsSphere(J){if(J.radius<0)return!1;return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let Q=J.normal.dot(this.direction);if(Q===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let $=-(this.origin.dot(J.normal)+J.constant)/Q;return $>=0?$:null}intersectPlane(J,Q){let $=this.distanceToPlane(J);if($===null)return null;return this.at($,Q)}intersectsPlane(J){let Q=J.distanceToPoint(this.origin);if(Q===0)return!0;if(J.normal.dot(this.direction)*Q<0)return!0;return!1}intersectBox(J,Q){let $,W,Z,K,H,Y,X=1/this.direction.x,U=1/this.direction.y,N=1/this.direction.z,E=this.origin;if(X>=0)$=(J.min.x-E.x)*X,W=(J.max.x-E.x)*X;else $=(J.max.x-E.x)*X,W=(J.min.x-E.x)*X;if(U>=0)Z=(J.min.y-E.y)*U,K=(J.max.y-E.y)*U;else Z=(J.max.y-E.y)*U,K=(J.min.y-E.y)*U;if($>K||Z>W)return null;if(Z>$||isNaN($))$=Z;if(K<W||isNaN(W))W=K;if(N>=0)H=(J.min.z-E.z)*N,Y=(J.max.z-E.z)*N;else H=(J.max.z-E.z)*N,Y=(J.min.z-E.z)*N;if($>Y||H>W)return null;if(H>$||$!==$)$=H;if(Y<W||W!==W)W=Y;if(W<0)return null;return this.at($>=0?$:W,Q)}intersectsBox(J){return this.intersectBox(J,T9)!==null}intersectTriangle(J,Q,$,W,Z){j$.subVectors(Q,J),C6.subVectors($,J),y$.crossVectors(j$,C6);let K=this.direction.dot(y$),H;if(K>0){if(W)return null;H=1}else if(K<0)H=-1,K=-K;else return null;i9.subVectors(this.origin,J);let Y=H*this.direction.dot(C6.crossVectors(i9,C6));if(Y<0)return null;let X=H*this.direction.dot(j$.cross(i9));if(X<0)return null;if(Y+X>K)return null;let U=-H*i9.dot(y$);if(U<0)return null;return this.at(U/K,Z)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class g9 extends jJ{constructor(J){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new B0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var bK=new p0,G8=new y8,P6=new SJ,hK=new P,T6=new P,S6=new P,j6=new P,v$=new P,y6=new P,xK=new P,v6=new P;class AJ extends ZJ{constructor(J=new u0,Q=new g9){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(J,Q){if(super.copy(J,Q),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let W=Q[$[0]];if(W!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Z=0,K=W.length;Z<K;Z++){let H=W[Z].name||String(Z);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=Z}}}}getVertexPosition(J,Q){let $=this.geometry,W=$.attributes.position,Z=$.morphAttributes.position,K=$.morphTargetsRelative;Q.fromBufferAttribute(W,J);let H=this.morphTargetInfluences;if(Z&&H){y6.set(0,0,0);for(let Y=0,X=Z.length;Y<X;Y++){let U=H[Y],N=Z[Y];if(U===0)continue;if(v$.fromBufferAttribute(N,J),K)y6.addScaledVector(v$,U);else y6.addScaledVector(v$.sub(Q),U)}Q.add(y6)}return Q}raycast(J,Q){let $=this.geometry,W=this.material,Z=this.matrixWorld;if(W===void 0)return;if($.boundingSphere===null)$.computeBoundingSphere();if(P6.copy($.boundingSphere),P6.applyMatrix4(Z),G8.copy(J.ray).recast(J.near),P6.containsPoint(G8.origin)===!1){if(G8.intersectSphere(P6,hK)===null)return;if(G8.origin.distanceToSquared(hK)>(J.far-J.near)**2)return}if(bK.copy(Z).invert(),G8.copy(J.ray).applyMatrix4(bK),$.boundingBox!==null){if(G8.intersectsBox($.boundingBox)===!1)return}this._computeIntersections(J,Q,G8)}_computeIntersections(J,Q,$){let W,Z=this.geometry,K=this.material,H=Z.index,Y=Z.attributes.position,X=Z.attributes.uv,U=Z.attributes.uv1,N=Z.attributes.normal,E=Z.groups,G=Z.drawRange;if(H!==null)if(Array.isArray(K))for(let q=0,O=E.length;q<O;q++){let R=E[q],D=K[R.materialIndex],F=Math.max(R.start,G.start),I=Math.min(H.count,Math.min(R.start+R.count,G.start+G.count));for(let V=F,M=I;V<M;V+=3){let w=H.getX(V),_=H.getX(V+1),C=H.getX(V+2);if(W=f6(this,D,J,$,X,U,N,w,_,C),W)W.faceIndex=Math.floor(V/3),W.face.materialIndex=R.materialIndex,Q.push(W)}}else{let q=Math.max(0,G.start),O=Math.min(H.count,G.start+G.count);for(let R=q,D=O;R<D;R+=3){let F=H.getX(R),I=H.getX(R+1),V=H.getX(R+2);if(W=f6(this,K,J,$,X,U,N,F,I,V),W)W.faceIndex=Math.floor(R/3),Q.push(W)}}else if(Y!==void 0)if(Array.isArray(K))for(let q=0,O=E.length;q<O;q++){let R=E[q],D=K[R.materialIndex],F=Math.max(R.start,G.start),I=Math.min(Y.count,Math.min(R.start+R.count,G.start+G.count));for(let V=F,M=I;V<M;V+=3){let w=V,_=V+1,C=V+2;if(W=f6(this,D,J,$,X,U,N,w,_,C),W)W.faceIndex=Math.floor(V/3),W.face.materialIndex=R.materialIndex,Q.push(W)}}else{let q=Math.max(0,G.start),O=Math.min(Y.count,G.start+G.count);for(let R=q,D=O;R<D;R+=3){let F=R,I=R+1,V=R+2;if(W=f6(this,K,J,$,X,U,N,F,I,V),W)W.faceIndex=Math.floor(R/3),Q.push(W)}}}}function vN(J,Q,$,W,Z,K,H,Y){let X;if(Q.side===1)X=W.intersectTriangle(H,K,Z,!0,Y);else X=W.intersectTriangle(Z,K,H,Q.side===0,Y);if(X===null)return null;v6.copy(Y),v6.applyMatrix4(J.matrixWorld);let U=$.ray.origin.distanceTo(v6);if(U<$.near||U>$.far)return null;return{distance:U,point:v6.clone(),object:J}}function f6(J,Q,$,W,Z,K,H,Y,X,U){J.getVertexPosition(Y,T6),J.getVertexPosition(X,S6),J.getVertexPosition(U,j6);let N=vN(J,Q,$,W,T6,S6,j6,xK);if(N){let E=new P;if(nJ.getBarycoord(xK,T6,S6,j6,E),Z)N.uv=nJ.getInterpolatedAttribute(Z,Y,X,U,E,new a);if(K)N.uv1=nJ.getInterpolatedAttribute(K,Y,X,U,E,new a);if(H){if(N.normal=nJ.getInterpolatedAttribute(H,Y,X,U,E,new P),N.normal.dot(W.direction)>0)N.normal.multiplyScalar(-1)}let G={a:Y,b:X,c:U,normal:new P,materialIndex:0};nJ.getNormal(T6,S6,j6,G.normal),N.face=G,N.barycoord=E}return N}var S7=new XJ,gK=new XJ,pK=new XJ,fN=new XJ,mK=new p0,b6=new P,f$=new SJ,dK=new p0,b$=new y8;class YZ extends AJ{constructor(J,Q){super(J,Q);this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new p0,this.bindMatrixInverse=new p0,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let J=this.geometry;if(this.boundingBox===null)this.boundingBox=new yJ;this.boundingBox.makeEmpty();let Q=J.getAttribute("position");for(let $=0;$<Q.count;$++)this.getVertexPosition($,b6),this.boundingBox.expandByPoint(b6)}computeBoundingSphere(){let J=this.geometry;if(this.boundingSphere===null)this.boundingSphere=new SJ;this.boundingSphere.makeEmpty();let Q=J.getAttribute("position");for(let $=0;$<Q.count;$++)this.getVertexPosition($,b6),this.boundingSphere.expandByPoint(b6)}copy(J,Q){if(super.copy(J,Q),this.bindMode=J.bindMode,this.bindMatrix.copy(J.bindMatrix),this.bindMatrixInverse.copy(J.bindMatrixInverse),this.skeleton=J.skeleton,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}raycast(J,Q){let $=this.material,W=this.matrixWorld;if($===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(f$.copy(this.boundingSphere),f$.applyMatrix4(W),J.ray.intersectsSphere(f$)===!1)return;if(dK.copy(W).invert(),b$.copy(J.ray).applyMatrix4(dK),this.boundingBox!==null){if(b$.intersectsBox(this.boundingBox)===!1)return}this._computeIntersections(J,Q,b$)}getVertexPosition(J,Q){return super.getVertexPosition(J,Q),this.applyBoneTransform(J,Q),Q}bind(J,Q){if(this.skeleton=J,Q===void 0)this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),Q=this.matrixWorld;this.bindMatrix.copy(Q),this.bindMatrixInverse.copy(Q).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let J=new XJ,Q=this.geometry.attributes.skinWeight;for(let $=0,W=Q.count;$<W;$++){J.fromBufferAttribute(Q,$);let Z=1/J.manhattanLength();if(Z!==1/0)J.multiplyScalar(Z);else J.set(1,0,0,0);Q.setXYZW($,J.x,J.y,J.z,J.w)}}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.bindMode==="attached")this.bindMatrixInverse.copy(this.matrixWorld).invert();else if(this.bindMode==="detached")this.bindMatrixInverse.copy(this.bindMatrix).invert();else Y0("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(J,Q){let $=this.skeleton,W=this.geometry;if(gK.fromBufferAttribute(W.attributes.skinIndex,J),pK.fromBufferAttribute(W.attributes.skinWeight,J),Q.isVector4)S7.copy(Q),Q.set(0,0,0,0);else S7.set(...Q,1),Q.set(0,0,0);S7.applyMatrix4(this.bindMatrix);for(let Z=0;Z<4;Z++){let K=pK.getComponent(Z);if(K!==0){let H=gK.getComponent(Z);mK.multiplyMatrices($.bones[H].matrixWorld,$.boneInverses[H]),Q.addScaledVector(fN.copy(S7).applyMatrix4(mK),K)}}if(Q.isVector4)Q.w=S7.w;return Q.applyMatrix4(this.bindMatrixInverse)}}class _Q extends ZJ{constructor(){super();this.isBone=!0,this.type="Bone"}}class J9 extends kJ{constructor(J=null,Q=1,$=1,W,Z,K,H,Y,X=1003,U=1003,N,E){super(null,K,H,Y,X,U,W,Z,N,E);this.isDataTexture=!0,this.image={data:J,width:Q,height:$},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var lK=new p0,bN=new p0;class CQ{constructor(J=[],Q=[]){this.uuid=eJ(),this.bones=J.slice(0),this.boneInverses=Q,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let J=this.bones,Q=this.boneInverses;if(this.boneMatrices=new Float32Array(J.length*16),Q.length===0)this.calculateInverses();else if(J.length!==Q.length){Y0("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let $=0,W=this.bones.length;$<W;$++)this.boneInverses.push(new p0)}}calculateInverses(){this.boneInverses.length=0;for(let J=0,Q=this.bones.length;J<Q;J++){let $=new p0;if(this.bones[J])$.copy(this.bones[J].matrixWorld).invert();this.boneInverses.push($)}}pose(){for(let J=0,Q=this.bones.length;J<Q;J++){let $=this.bones[J];if($)$.matrixWorld.copy(this.boneInverses[J]).invert()}for(let J=0,Q=this.bones.length;J<Q;J++){let $=this.bones[J];if($){if($.parent&&$.parent.isBone)$.matrix.copy($.parent.matrixWorld).invert(),$.matrix.multiply($.matrixWorld);else $.matrix.copy($.matrixWorld);$.matrix.decompose($.position,$.quaternion,$.scale)}}}update(){let J=this.bones,Q=this.boneInverses,$=this.boneMatrices,W=this.boneTexture;for(let Z=0,K=J.length;Z<K;Z++){let H=J[Z]?J[Z].matrixWorld:bN;lK.multiplyMatrices(H,Q[Z]),lK.toArray($,Z*16)}if(W!==null)W.needsUpdate=!0}clone(){return new CQ(this.bones,this.boneInverses)}computeBoneTexture(){let J=Math.sqrt(this.bones.length*4);J=Math.ceil(J/4)*4,J=Math.max(J,4);let Q=new Float32Array(J*J*4);Q.set(this.boneMatrices);let $=new J9(Q,J,J,1023,1015);return $.needsUpdate=!0,this.boneMatrices=Q,this.boneTexture=$,this}getBoneByName(J){for(let Q=0,$=this.bones.length;Q<$;Q++){let W=this.bones[Q];if(W.name===J)return W}return}dispose(){if(this.boneTexture!==null)this.boneTexture.dispose(),this.boneTexture=null}fromJSON(J,Q){this.uuid=J.uuid;for(let $=0,W=J.bones.length;$<W;$++){let Z=J.bones[$],K=Q[Z];if(K===void 0)Y0("Skeleton: No bone found with UUID:",Z),K=new _Q;this.bones.push(K),this.boneInverses.push(new p0().fromArray(J.boneInverses[$]))}return this.init(),this}toJSON(){let J={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};J.uuid=this.uuid;let Q=this.bones,$=this.boneInverses;for(let W=0,Z=Q.length;W<Z;W++){let K=Q[W];J.bones.push(K.uuid);let H=$[W];J.boneInverses.push(H.toArray())}return J}}class A8 extends YJ{constructor(J,Q,$,W=1){super(J,Q,$);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=W}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}toJSON(){let J=super.toJSON();return J.meshPerAttribute=this.meshPerAttribute,J.isInstancedBufferAttribute=!0,J}}var J7=new p0,uK=new p0,h6=[],cK=new yJ,hN=new p0,j7=new AJ,y7=new SJ;class XZ extends AJ{constructor(J,Q,$){super(J,Q);this.isInstancedMesh=!0,this.instanceMatrix=new A8(new Float32Array($*16),16),this.instanceColor=null,this.morphTexture=null,this.count=$,this.boundingBox=null,this.boundingSphere=null;for(let W=0;W<$;W++)this.setMatrixAt(W,hN)}computeBoundingBox(){let J=this.geometry,Q=this.count;if(this.boundingBox===null)this.boundingBox=new yJ;if(J.boundingBox===null)J.computeBoundingBox();this.boundingBox.makeEmpty();for(let $=0;$<Q;$++)this.getMatrixAt($,J7),cK.copy(J.boundingBox).applyMatrix4(J7),this.boundingBox.union(cK)}computeBoundingSphere(){let J=this.geometry,Q=this.count;if(this.boundingSphere===null)this.boundingSphere=new SJ;if(J.boundingSphere===null)J.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let $=0;$<Q;$++)this.getMatrixAt($,J7),y7.copy(J.boundingSphere).applyMatrix4(J7),this.boundingSphere.union(y7)}copy(J,Q){if(super.copy(J,Q),this.instanceMatrix.copy(J.instanceMatrix),J.morphTexture!==null)this.morphTexture=J.morphTexture.clone();if(J.instanceColor!==null)this.instanceColor=J.instanceColor.clone();if(this.count=J.count,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}getColorAt(J,Q){if(this.instanceColor===null)return Q.setRGB(1,1,1);else return Q.fromArray(this.instanceColor.array,J*3)}getMatrixAt(J,Q){return Q.fromArray(this.instanceMatrix.array,J*16)}getMorphAt(J,Q){let $=Q.morphTargetInfluences,W=this.morphTexture.source.data.data,Z=$.length+1,K=J*Z+1;for(let H=0;H<$.length;H++)$[H]=W[K+H]}raycast(J,Q){let $=this.matrixWorld,W=this.count;if(j7.geometry=this.geometry,j7.material=this.material,j7.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(y7.copy(this.boundingSphere),y7.applyMatrix4($),J.ray.intersectsSphere(y7)===!1)return;for(let Z=0;Z<W;Z++){this.getMatrixAt(Z,J7),uK.multiplyMatrices($,J7),j7.matrixWorld=uK,j7.raycast(J,h6);for(let K=0,H=h6.length;K<H;K++){let Y=h6[K];Y.instanceId=Z,Y.object=this,Q.push(Y)}h6.length=0}}setColorAt(J,Q){if(this.instanceColor===null)this.instanceColor=new A8(new Float32Array(this.instanceMatrix.count*3).fill(1),3);return Q.toArray(this.instanceColor.array,J*3),this}setMatrixAt(J,Q){return Q.toArray(this.instanceMatrix.array,J*16),this}setMorphAt(J,Q){let $=Q.morphTargetInfluences,W=$.length+1;if(this.morphTexture===null)this.morphTexture=new J9(new Float32Array(W*this.count),W,this.count,1028,1015);let Z=this.morphTexture.source.data.data,K=0;for(let X=0;X<$.length;X++)K+=$[X];let H=this.geometry.morphTargetsRelative?1:1-K,Y=W*J;return Z[Y]=H,Z.set($,Y+1),this}updateMorphTargets(){}dispose(){if(this.dispatchEvent({type:"dispose"}),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null}}var h$=new P,xN=new P,gN=new l0;class j9{constructor(J=new P(1,0,0),Q=0){this.isPlane=!0,this.normal=J,this.constant=Q}set(J,Q){return this.normal.copy(J),this.constant=Q,this}setComponents(J,Q,$,W){return this.normal.set(J,Q,$),this.constant=W,this}setFromNormalAndCoplanarPoint(J,Q){return this.normal.copy(J),this.constant=-Q.dot(this.normal),this}setFromCoplanarPoints(J,Q,$){let W=h$.subVectors($,Q).cross(xN.subVectors(J,Q)).normalize();return this.setFromNormalAndCoplanarPoint(W,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,Q){return Q.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,Q,$=!0){let W=J.delta(h$),Z=this.normal.dot(W);if(Z===0){if(this.distanceToPoint(J.start)===0)return Q.copy(J.start);return null}let K=-(J.start.dot(this.normal)+this.constant)/Z;if($===!0&&(K<0||K>1))return null;return Q.copy(J.start).addScaledVector(W,K)}intersectsLine(J){let Q=this.distanceToPoint(J.start),$=this.distanceToPoint(J.end);return Q<0&&$>0||$<0&&Q>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,Q){let $=Q||gN.getNormalMatrix(J),W=this.coplanarPoint(h$).applyMatrix4(J),Z=this.normal.applyMatrix3($).normalize();return this.constant=-W.dot(Z),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}}var N8=new SJ,pN=new a(0.5,0.5),x6=new P;class e9{constructor(J=new j9,Q=new j9,$=new j9,W=new j9,Z=new j9,K=new j9){this.planes=[J,Q,$,W,Z,K]}set(J,Q,$,W,Z,K){let H=this.planes;return H[0].copy(J),H[1].copy(Q),H[2].copy($),H[3].copy(W),H[4].copy(Z),H[5].copy(K),this}copy(J){let Q=this.planes;for(let $=0;$<6;$++)Q[$].copy(J.planes[$]);return this}setFromProjectionMatrix(J,Q=2000,$=!1){let W=this.planes,Z=J.elements,K=Z[0],H=Z[1],Y=Z[2],X=Z[3],U=Z[4],N=Z[5],E=Z[6],G=Z[7],q=Z[8],O=Z[9],R=Z[10],D=Z[11],F=Z[12],I=Z[13],V=Z[14],M=Z[15];if(W[0].setComponents(X-K,G-U,D-q,M-F).normalize(),W[1].setComponents(X+K,G+U,D+q,M+F).normalize(),W[2].setComponents(X+H,G+N,D+O,M+I).normalize(),W[3].setComponents(X-H,G-N,D-O,M-I).normalize(),$)W[4].setComponents(Y,E,R,V).normalize(),W[5].setComponents(X-Y,G-E,D-R,M-V).normalize();else if(W[4].setComponents(X-Y,G-E,D-R,M-V).normalize(),Q===2000)W[5].setComponents(X+Y,G+E,D+R,M+V).normalize();else if(Q===2001)W[5].setComponents(Y,E,R,V).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+Q);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();N8.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let Q=J.geometry;if(Q.boundingSphere===null)Q.computeBoundingSphere();N8.copy(Q.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(N8)}intersectsSprite(J){N8.center.set(0,0,0);let Q=pN.distanceTo(J.center);return N8.radius=0.7071067811865476+Q,N8.applyMatrix4(J.matrixWorld),this.intersectsSphere(N8)}intersectsSphere(J){let Q=this.planes,$=J.center,W=-J.radius;for(let Z=0;Z<6;Z++)if(Q[Z].distanceToPoint($)<W)return!1;return!0}intersectsBox(J){let Q=this.planes;for(let $=0;$<6;$++){let W=Q[$];if(x6.x=W.normal.x>0?J.max.x:J.min.x,x6.y=W.normal.y>0?J.max.y:J.min.y,x6.z=W.normal.z>0?J.max.z:J.min.z,W.distanceToPoint(x6)<0)return!1}return!0}containsPoint(J){let Q=this.planes;for(let $=0;$<6;$++)if(Q[$].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}var nK=new p0;class PQ{constructor(){this.coordinateSystem=2000,this._frustums=[],this._count=0}setFromArrayCamera(J){let Q=J.cameras,$=this._frustums;for(let W=0;W<Q.length;W++){let Z=Q[W];if(nK.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),$[W]===void 0)$[W]=new e9;$[W].setFromProjectionMatrix(nK,Z.coordinateSystem,Z.reversedDepth)}return this._count=Q.length,this}intersectsObject(J){let Q=this._frustums;for(let $=0;$<this._count;$++)if(Q[$].intersectsObject(J))return!0;return!1}intersectsSprite(J){let Q=this._frustums;for(let $=0;$<this._count;$++)if(Q[$].intersectsSprite(J))return!0;return!1}intersectsSphere(J){let Q=this._frustums;for(let $=0;$<this._count;$++)if(Q[$].intersectsSphere(J))return!0;return!1}intersectsBox(J){let Q=this._frustums;for(let $=0;$<this._count;$++)if(Q[$].intersectsBox(J))return!0;return!1}containsPoint(J){let Q=this._frustums;for(let $=0;$<this._count;$++)if(Q[$].containsPoint(J))return!0;return!1}copy(J){this.coordinateSystem=J.coordinateSystem;let Q=this._frustums,$=J._frustums;for(let W=0;W<J._count;W++){if(Q[W]===void 0)Q[W]=new e9;Q[W].copy($[W])}return this._count=J._count,this}clone(){return new PQ().copy(this)}}function x$(J,Q){return J-Q}function mN(J,Q){return J.z-Q.z}function dN(J,Q){return Q.z-J.z}class uY{constructor(){this.index=0,this.pool=[],this.list=[]}push(J,Q,$,W){let Z=this.pool,K=this.list;if(this.index>=Z.length)Z.push({start:-1,count:-1,z:-1,index:-1});let H=Z[this.index];K.push(H),this.index++,H.start=J,H.count=Q,H.z=$,H.index=W}reset(){this.list.length=0,this.index=0}}var uJ=new p0,lN=new B0(1,1,1),uN=new e9,cN=new PQ,g6=new yJ,E8=new SJ,v7=new P,sK=new P,nN=new P,g$=new uY,hJ=new AJ,p6=[];function sN(J,Q,$=0){let W=Q.itemSize;if(J.isInterleavedBufferAttribute||J.array.constructor!==Q.array.constructor){let Z=J.count;for(let K=0;K<Z;K++)for(let H=0;H<W;H++)Q.setComponent(K+$,H,J.getComponent(K,H))}else Q.array.set(J.array,$*W);Q.needsUpdate=!0}function q8(J,Q){if(J.constructor!==Q.constructor){let $=Math.min(J.length,Q.length);for(let W=0;W<$;W++)Q[W]=J[W]}else{let $=Math.min(J.length,Q.length);Q.set(new J.constructor(J.buffer,0,$))}}class UZ extends AJ{constructor(J,Q,$=Q*2,W){super(new u0,W);this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=J,this._maxVertexCount=Q,this._maxIndexCount=$,this._multiDrawCounts=new Int32Array(J),this._multiDrawStarts=new Int32Array(J),this._multiDrawCount=0,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}_initMatricesTexture(){let J=Math.sqrt(this._maxInstanceCount*4);J=Math.ceil(J/4)*4,J=Math.max(J,4);let Q=new Float32Array(J*J*4),$=new J9(Q,J,J,1023,1015);this._matricesTexture=$}_initIndirectTexture(){let J=Math.sqrt(this._maxInstanceCount);J=Math.ceil(J);let Q=new Uint32Array(J*J),$=new J9(Q,J,J,1029,1014);this._indirectTexture=$}_initColorsTexture(){let J=Math.sqrt(this._maxInstanceCount);J=Math.ceil(J);let Q=new Float32Array(J*J*4).fill(1),$=new J9(Q,J,J,1023,1015);$.colorSpace=JJ.workingColorSpace,this._colorsTexture=$}_initializeGeometry(J){let Q=this.geometry,$=this._maxVertexCount,W=this._maxIndexCount;if(this._geometryInitialized===!1){for(let Z in J.attributes){let K=J.getAttribute(Z),{array:H,itemSize:Y,normalized:X}=K,U=new H.constructor($*Y),N=new YJ(U,Y,X);Q.setAttribute(Z,N)}if(J.getIndex()!==null){let Z=$>65535?new Uint32Array(W):new Uint16Array(W);Q.setIndex(new YJ(Z,1))}this._geometryInitialized=!0}}_validateGeometry(J){let Q=this.geometry;if(Boolean(J.getIndex())!==Boolean(Q.getIndex()))throw Error('THREE.BatchedMesh: All geometries must consistently have "index".');for(let $ in Q.attributes){if(!J.hasAttribute($))throw Error(`THREE.BatchedMesh: Added geometry missing "${$}". All geometries must have consistent attributes.`);let W=J.getAttribute($),Z=Q.getAttribute($);if(W.itemSize!==Z.itemSize||W.normalized!==Z.normalized)throw Error("THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}validateInstanceId(J){let Q=this._instanceInfo;if(J<0||J>=Q.length||Q[J].active===!1)throw Error(`THREE.BatchedMesh: Invalid instanceId ${J}. Instance is either out of range or has been deleted.`)}validateGeometryId(J){let Q=this._geometryInfo;if(J<0||J>=Q.length||Q[J].active===!1)throw Error(`THREE.BatchedMesh: Invalid geometryId ${J}. Geometry is either out of range or has been deleted.`)}setCustomSort(J){return this.customSort=J,this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new yJ;let J=this.boundingBox,Q=this._instanceInfo;J.makeEmpty();for(let $=0,W=Q.length;$<W;$++){if(Q[$].active===!1)continue;let Z=Q[$].geometryIndex;this.getMatrixAt($,uJ),this.getBoundingBoxAt(Z,g6).applyMatrix4(uJ),J.union(g6)}}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new SJ;let J=this.boundingSphere,Q=this._instanceInfo;J.makeEmpty();for(let $=0,W=Q.length;$<W;$++){if(Q[$].active===!1)continue;let Z=Q[$].geometryIndex;this.getMatrixAt($,uJ),this.getBoundingSphereAt(Z,E8).applyMatrix4(uJ),J.union(E8)}}addInstance(J){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw Error("THREE.BatchedMesh: Maximum item count reached.");let $={visible:!0,active:!0,geometryIndex:J},W=null;if(this._availableInstanceIds.length>0)this._availableInstanceIds.sort(x$),W=this._availableInstanceIds.shift(),this._instanceInfo[W]=$;else W=this._instanceInfo.length,this._instanceInfo.push($);let Z=this._matricesTexture;uJ.identity().toArray(Z.image.data,W*16),Z.needsUpdate=!0;let K=this._colorsTexture;if(K)lN.toArray(K.image.data,W*4),K.needsUpdate=!0;return this._visibilityChanged=!0,W}addGeometry(J,Q=-1,$=-1){this._initializeGeometry(J),this._validateGeometry(J);let W={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},Z=this._geometryInfo;W.vertexStart=this._nextVertexStart,W.reservedVertexCount=Q===-1?J.getAttribute("position").count:Q;let K=J.getIndex();if(K!==null)W.indexStart=this._nextIndexStart,W.reservedIndexCount=$===-1?K.count:$;if(W.indexStart!==-1&&W.indexStart+W.reservedIndexCount>this._maxIndexCount||W.vertexStart+W.reservedVertexCount>this._maxVertexCount)throw Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");let Y;if(this._availableGeometryIds.length>0)this._availableGeometryIds.sort(x$),Y=this._availableGeometryIds.shift(),Z[Y]=W;else Y=this._geometryCount,this._geometryCount++,Z.push(W);return this.setGeometryAt(Y,J),this._nextIndexStart=W.indexStart+W.reservedIndexCount,this._nextVertexStart=W.vertexStart+W.reservedVertexCount,Y}setGeometryAt(J,Q){if(J>=this._geometryCount)throw Error("THREE.BatchedMesh: Maximum geometry count reached.");this._validateGeometry(Q);let $=this.geometry,W=$.getIndex()!==null,Z=$.getIndex(),K=Q.getIndex(),H=this._geometryInfo[J];if(W&&K.count>H.reservedIndexCount||Q.attributes.position.count>H.reservedVertexCount)throw Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");let{vertexStart:Y,reservedVertexCount:X}=H;H.vertexCount=Q.getAttribute("position").count;for(let U in $.attributes){let N=Q.getAttribute(U),E=$.getAttribute(U);sN(N,E,Y);let G=N.itemSize;for(let q=N.count,O=X;q<O;q++){let R=Y+q;for(let D=0;D<G;D++)E.setComponent(R,D,0)}E.needsUpdate=!0,E.addUpdateRange(Y*G,X*G)}if(W){let{indexStart:U,reservedIndexCount:N}=H;H.indexCount=Q.getIndex().count;for(let E=0;E<K.count;E++)Z.setX(U+E,Y+K.getX(E));for(let E=K.count,G=N;E<G;E++)Z.setX(U+E,Y);Z.needsUpdate=!0,Z.addUpdateRange(U,H.reservedIndexCount)}if(H.start=W?H.indexStart:H.vertexStart,H.count=W?H.indexCount:H.vertexCount,H.boundingBox=null,Q.boundingBox!==null)H.boundingBox=Q.boundingBox.clone();if(H.boundingSphere=null,Q.boundingSphere!==null)H.boundingSphere=Q.boundingSphere.clone();return this._visibilityChanged=!0,J}deleteGeometry(J){let Q=this._geometryInfo;if(J>=Q.length||Q[J].active===!1)return this;let $=this._instanceInfo;for(let W=0,Z=$.length;W<Z;W++)if($[W].active&&$[W].geometryIndex===J)this.deleteInstance(W);return Q[J].active=!1,this._availableGeometryIds.push(J),this._visibilityChanged=!0,this}deleteInstance(J){return this.validateInstanceId(J),this._instanceInfo[J].active=!1,this._availableInstanceIds.push(J),this._visibilityChanged=!0,this}optimize(){let J=0,Q=0,$=this._geometryInfo,W=$.map((K,H)=>H).sort((K,H)=>{return $[K].vertexStart-$[H].vertexStart}),Z=this.geometry;for(let K=0,H=$.length;K<H;K++){let Y=W[K],X=$[Y];if(X.active===!1)continue;if(Z.index!==null){if(X.indexStart!==Q){let{indexStart:U,vertexStart:N,reservedIndexCount:E}=X,G=Z.index,q=G.array,O=J-N;for(let R=U;R<U+E;R++)q[R]=q[R]+O;G.array.copyWithin(Q,U,U+E),G.addUpdateRange(Q,E),G.needsUpdate=!0,X.indexStart=Q}Q+=X.reservedIndexCount}if(X.vertexStart!==J){let{vertexStart:U,reservedVertexCount:N}=X,E=Z.attributes;for(let G in E){let q=E[G],{array:O,itemSize:R}=q;O.copyWithin(J*R,U*R,(U+N)*R),q.addUpdateRange(J*R,N*R),q.needsUpdate=!0}X.vertexStart=J}J+=X.reservedVertexCount,X.start=Z.index?X.indexStart:X.vertexStart}return this._nextIndexStart=Q,this._nextVertexStart=J,this._visibilityChanged=!0,this}getBoundingBoxAt(J,Q){if(J>=this._geometryCount)return null;let $=this.geometry,W=this._geometryInfo[J];if(W.boundingBox===null){let Z=new yJ,K=$.index,H=$.attributes.position;for(let Y=W.start,X=W.start+W.count;Y<X;Y++){let U=Y;if(K)U=K.getX(U);Z.expandByPoint(v7.fromBufferAttribute(H,U))}W.boundingBox=Z}return Q.copy(W.boundingBox),Q}getBoundingSphereAt(J,Q){if(J>=this._geometryCount)return null;let $=this.geometry,W=this._geometryInfo[J];if(W.boundingSphere===null){let Z=new SJ;this.getBoundingBoxAt(J,g6),g6.getCenter(Z.center);let K=$.index,H=$.attributes.position,Y=0;for(let X=W.start,U=W.start+W.count;X<U;X++){let N=X;if(K)N=K.getX(N);v7.fromBufferAttribute(H,N),Y=Math.max(Y,Z.center.distanceToSquared(v7))}Z.radius=Math.sqrt(Y),W.boundingSphere=Z}return Q.copy(W.boundingSphere),Q}setMatrixAt(J,Q){this.validateInstanceId(J);let $=this._matricesTexture,W=this._matricesTexture.image.data;return Q.toArray(W,J*16),$.needsUpdate=!0,this}getMatrixAt(J,Q){return this.validateInstanceId(J),Q.fromArray(this._matricesTexture.image.data,J*16)}setColorAt(J,Q){if(this.validateInstanceId(J),this._colorsTexture===null)this._initColorsTexture();return Q.toArray(this._colorsTexture.image.data,J*4),this._colorsTexture.needsUpdate=!0,this}getColorAt(J,Q){if(this.validateInstanceId(J),this._colorsTexture===null)if(Q.isVector4)return Q.set(1,1,1,1);else return Q.setRGB(1,1,1);else return Q.fromArray(this._colorsTexture.image.data,J*4)}setVisibleAt(J,Q){if(this.validateInstanceId(J),this._instanceInfo[J].visible===Q)return this;return this._instanceInfo[J].visible=Q,this._visibilityChanged=!0,this}getVisibleAt(J){return this.validateInstanceId(J),this._instanceInfo[J].visible}setGeometryIdAt(J,Q){return this.validateInstanceId(J),this.validateGeometryId(Q),this._instanceInfo[J].geometryIndex=Q,this}getGeometryIdAt(J){return this.validateInstanceId(J),this._instanceInfo[J].geometryIndex}getGeometryRangeAt(J,Q={}){this.validateGeometryId(J);let $=this._geometryInfo[J];return Q.vertexStart=$.vertexStart,Q.vertexCount=$.vertexCount,Q.reservedVertexCount=$.reservedVertexCount,Q.indexStart=$.indexStart,Q.indexCount=$.indexCount,Q.reservedIndexCount=$.reservedIndexCount,Q.start=$.start,Q.count=$.count,Q}setInstanceCount(J){let Q=this._availableInstanceIds,$=this._instanceInfo;Q.sort(x$);while(Q[Q.length-1]===$.length-1)$.pop(),Q.pop();if(J<$.length)throw Error(`THREE.BatchedMesh: Instance ids outside the range ${J} are being used. Cannot shrink instance count.`);let W=new Int32Array(J),Z=new Int32Array(J);q8(this._multiDrawCounts,W),q8(this._multiDrawStarts,Z),this._multiDrawCounts=W,this._multiDrawStarts=Z,this._maxInstanceCount=J;let K=this._indirectTexture,H=this._matricesTexture,Y=this._colorsTexture;if(K.dispose(),this._initIndirectTexture(),q8(K.image.data,this._indirectTexture.image.data),H.dispose(),this._initMatricesTexture(),q8(H.image.data,this._matricesTexture.image.data),Y)Y.dispose(),this._initColorsTexture(),q8(Y.image.data,this._colorsTexture.image.data)}setGeometrySize(J,Q){let $=[...this._geometryInfo].filter((H)=>H.active);if(Math.max(...$.map((H)=>H.vertexStart+H.reservedVertexCount))>J)throw Error(`THREE.BatchedMesh: Geometry vertex values are being used outside the range ${Q}. Cannot shrink further.`);if(this.geometry.index){if(Math.max(...$.map((Y)=>Y.indexStart+Y.reservedIndexCount))>Q)throw Error(`THREE.BatchedMesh: Geometry index values are being used outside the range ${Q}. Cannot shrink further.`)}let Z=this.geometry;if(Z.dispose(),this._maxVertexCount=J,this._maxIndexCount=Q,this._geometryInitialized)this._geometryInitialized=!1,this.geometry=new u0,this._initializeGeometry(Z);let K=this.geometry;if(Z.index)q8(Z.index.array,K.index.array);for(let H in Z.attributes)q8(Z.attributes[H].array,K.attributes[H].array)}raycast(J,Q){let $=this._instanceInfo,W=this._geometryInfo,Z=this.matrixWorld,K=this.geometry;if(hJ.material=this.material,hJ.geometry.index=K.index,hJ.geometry.attributes=K.attributes,hJ.geometry.boundingBox===null)hJ.geometry.boundingBox=new yJ;if(hJ.geometry.boundingSphere===null)hJ.geometry.boundingSphere=new SJ;for(let H=0,Y=$.length;H<Y;H++){if(!$[H].visible||!$[H].active)continue;let X=$[H].geometryIndex,U=W[X];hJ.geometry.setDrawRange(U.start,U.count),this.getMatrixAt(H,hJ.matrixWorld).premultiply(Z),this.getBoundingBoxAt(X,hJ.geometry.boundingBox),this.getBoundingSphereAt(X,hJ.geometry.boundingSphere),hJ.raycast(J,p6);for(let N=0,E=p6.length;N<E;N++){let G=p6[N];G.object=this,G.batchId=H,Q.push(G)}p6.length=0}hJ.material=null,hJ.geometry.index=null,hJ.geometry.attributes={},hJ.geometry.setDrawRange(0,1/0)}copy(J){if(super.copy(J),this.geometry=J.geometry.clone(),this.perObjectFrustumCulled=J.perObjectFrustumCulled,this.sortObjects=J.sortObjects,this.boundingBox=J.boundingBox!==null?J.boundingBox.clone():null,this.boundingSphere=J.boundingSphere!==null?J.boundingSphere.clone():null,this._geometryInfo=J._geometryInfo.map((Q)=>({...Q,boundingBox:Q.boundingBox!==null?Q.boundingBox.clone():null,boundingSphere:Q.boundingSphere!==null?Q.boundingSphere.clone():null})),this._instanceInfo=J._instanceInfo.map((Q)=>({...Q})),this._availableInstanceIds=J._availableInstanceIds.slice(),this._availableGeometryIds=J._availableGeometryIds.slice(),this._nextIndexStart=J._nextIndexStart,this._nextVertexStart=J._nextVertexStart,this._geometryCount=J._geometryCount,this._maxInstanceCount=J._maxInstanceCount,this._maxVertexCount=J._maxVertexCount,this._maxIndexCount=J._maxIndexCount,this._geometryInitialized=J._geometryInitialized,this._multiDrawCounts=J._multiDrawCounts.slice(),this._multiDrawStarts=J._multiDrawStarts.slice(),this._indirectTexture=J._indirectTexture.clone(),this._indirectTexture.image.data=this._indirectTexture.image.data.slice(),this._matricesTexture=J._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null)this._colorsTexture=J._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice();return this}dispose(){if(this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null)this._colorsTexture.dispose(),this._colorsTexture=null}onBeforeRender(J,Q,$,W,Z){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;let K=W.getIndex(),H=K===null?1:K.array.BYTES_PER_ELEMENT,Y=1;if(Z.wireframe)Y=2,H=W.attributes.position.count>65535?4:2;let X=this._instanceInfo,U=this._multiDrawStarts,N=this._multiDrawCounts,E=this._geometryInfo,G=this.perObjectFrustumCulled,q=this._indirectTexture,O=q.image.data,R=$.isArrayCamera?cN:uN;if(G)if($.isArrayCamera)R.setFromArrayCamera($);else uJ.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse).multiply(this.matrixWorld),R.setFromProjectionMatrix(uJ,$.coordinateSystem,$.reversedDepth);let D=0;if(this.sortObjects){uJ.copy(this.matrixWorld).invert(),v7.setFromMatrixPosition($.matrixWorld).applyMatrix4(uJ),sK.set(0,0,-1).transformDirection($.matrixWorld).transformDirection(uJ);for(let V=0,M=X.length;V<M;V++)if(X[V].visible&&X[V].active){let w=X[V].geometryIndex;this.getMatrixAt(V,uJ),this.getBoundingSphereAt(w,E8).applyMatrix4(uJ);let _=!1;if(G)_=!R.intersectsSphere(E8);if(!_){let C=E[w],k=nN.subVectors(E8.center,v7).dot(sK);g$.push(C.start,C.count,k,V)}}let F=g$.list,I=this.customSort;if(I===null)F.sort(Z.transparent?dN:mN);else I.call(this,F,$);for(let V=0,M=F.length;V<M;V++){let w=F[V];U[D]=w.start*H*Y,N[D]=w.count*Y,O[D]=w.index,D++}g$.reset()}else for(let F=0,I=X.length;F<I;F++)if(X[F].visible&&X[F].active){let V=X[F].geometryIndex,M=!1;if(G)this.getMatrixAt(F,uJ),this.getBoundingSphereAt(V,E8).applyMatrix4(uJ),M=!R.intersectsSphere(E8);if(!M){let w=E[V];U[D]=w.start*H*Y,N[D]=w.count*Y,O[D]=F,D++}}q.needsUpdate=!0,this._multiDrawCount=D,this._visibilityChanged=!1}onBeforeShadow(J,Q,$,W,Z,K){this.onBeforeRender(J,null,W,Z,K)}}class gJ extends jJ{constructor(J){super();this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new B0(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.linewidth=J.linewidth,this.linecap=J.linecap,this.linejoin=J.linejoin,this.fog=J.fog,this}}var KQ=new P,HQ=new P,iK=new p0,f7=new y8,m6=new SJ,p$=new P,oK=new P;class b9 extends ZJ{constructor(J=new u0,Q=new gJ){super();this.isLine=!0,this.type="Line",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(J,Q){return super.copy(J,Q),this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}computeLineDistances(){let J=this.geometry;if(J.index===null){let Q=J.attributes.position,$=[0];for(let W=1,Z=Q.count;W<Z;W++)KQ.fromBufferAttribute(Q,W-1),HQ.fromBufferAttribute(Q,W),$[W]=$[W-1],$[W]+=KQ.distanceTo(HQ);J.setAttribute("lineDistance",new w0($,1))}else Y0("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(J,Q){let $=this.geometry,W=this.matrixWorld,Z=J.params.Line.threshold,K=$.drawRange;if($.boundingSphere===null)$.computeBoundingSphere();if(m6.copy($.boundingSphere),m6.applyMatrix4(W),m6.radius+=Z,J.ray.intersectsSphere(m6)===!1)return;iK.copy(W).invert(),f7.copy(J.ray).applyMatrix4(iK);let H=Z/((this.scale.x+this.scale.y+this.scale.z)/3),Y=H*H,X=this.isLineSegments?2:1,U=$.index,E=$.attributes.position;if(U!==null){let G=Math.max(0,K.start),q=Math.min(U.count,K.start+K.count);for(let O=G,R=q-1;O<R;O+=X){let D=U.getX(O),F=U.getX(O+1),I=d6(this,J,f7,Y,D,F,O);if(I)Q.push(I)}if(this.isLineLoop){let O=U.getX(q-1),R=U.getX(G),D=d6(this,J,f7,Y,O,R,q-1);if(D)Q.push(D)}}else{let G=Math.max(0,K.start),q=Math.min(E.count,K.start+K.count);for(let O=G,R=q-1;O<R;O+=X){let D=d6(this,J,f7,Y,O,O+1,O);if(D)Q.push(D)}if(this.isLineLoop){let O=d6(this,J,f7,Y,q-1,G,q-1);if(O)Q.push(O)}}}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let W=Q[$[0]];if(W!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Z=0,K=W.length;Z<K;Z++){let H=W[Z].name||String(Z);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=Z}}}}}function d6(J,Q,$,W,Z,K,H){let Y=J.geometry.attributes.position;if(KQ.fromBufferAttribute(Y,Z),HQ.fromBufferAttribute(Y,K),$.distanceSqToSegment(KQ,HQ,p$,oK)>W)return;p$.applyMatrix4(J.matrixWorld);let U=Q.ray.origin.distanceTo(p$);if(U<Q.near||U>Q.far)return;return{distance:U,point:oK.clone().applyMatrix4(J.matrixWorld),index:H,face:null,faceIndex:null,barycoord:null,object:J}}var aK=new P,rK=new P;class F9 extends b9{constructor(J,Q){super(J,Q);this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let J=this.geometry;if(J.index===null){let Q=J.attributes.position,$=[];for(let W=0,Z=Q.count;W<Z;W+=2)aK.fromBufferAttribute(Q,W),rK.fromBufferAttribute(Q,W+1),$[W]=W===0?0:$[W-1],$[W+1]=$[W]+aK.distanceTo(rK);J.setAttribute("lineDistance",new w0($,1))}else Y0("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class GZ extends b9{constructor(J,Q){super(J,Q);this.isLineLoop=!0,this.type="LineLoop"}}class TQ extends jJ{constructor(J){super();this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new B0(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.size=J.size,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var tK=new p0,t$=new y8,l6=new SJ,u6=new P;class NZ extends ZJ{constructor(J=new u0,Q=new TQ){super();this.isPoints=!0,this.type="Points",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(J,Q){return super.copy(J,Q),this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}raycast(J,Q){let $=this.geometry,W=this.matrixWorld,Z=J.params.Points.threshold,K=$.drawRange;if($.boundingSphere===null)$.computeBoundingSphere();if(l6.copy($.boundingSphere),l6.applyMatrix4(W),l6.radius+=Z,J.ray.intersectsSphere(l6)===!1)return;tK.copy(W).invert(),t$.copy(J.ray).applyMatrix4(tK);let H=Z/((this.scale.x+this.scale.y+this.scale.z)/3),Y=H*H,X=$.index,N=$.attributes.position;if(X!==null){let E=Math.max(0,K.start),G=Math.min(X.count,K.start+K.count);for(let q=E,O=G;q<O;q++){let R=X.getX(q);u6.fromBufferAttribute(N,R),eK(u6,R,Y,W,J,Q,this)}}else{let E=Math.max(0,K.start),G=Math.min(N.count,K.start+K.count);for(let q=E,O=G;q<O;q++)u6.fromBufferAttribute(N,q),eK(u6,q,Y,W,J,Q,this)}}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let W=Q[$[0]];if(W!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let Z=0,K=W.length;Z<K;Z++){let H=W[Z].name||String(Z);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=Z}}}}}function eK(J,Q,$,W,Z,K,H){let Y=t$.distanceSqToPoint(J);if(Y<$){let X=new P;t$.closestPointToPoint(J,X),X.applyMatrix4(W);let U=Z.ray.origin.distanceTo(X);if(U<Z.near||U>Z.far)return;K.push({distance:U,distanceToRay:Math.sqrt(Y),point:X,index:Q,face:null,faceIndex:null,barycoord:null,object:H})}}class EZ extends kJ{constructor(J,Q,$,W,Z=1006,K=1006,H,Y,X){super(J,Q,$,W,Z,K,H,Y,X);this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let U=this;function N(){U.needsUpdate=!0,U._requestVideoFrameCallbackId=J.requestVideoFrameCallback(N)}if("requestVideoFrameCallback"in J)this._requestVideoFrameCallbackId=J.requestVideoFrameCallback(N)}clone(){return new this.constructor(this.image).copy(this)}update(){let J=this.image;if("requestVideoFrameCallback"in J===!1&&J.readyState>=J.HAVE_CURRENT_DATA)this.needsUpdate=!0}dispose(){if(this._requestVideoFrameCallbackId!==0)this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0;super.dispose()}}class cY extends EZ{constructor(J,Q,$,W,Z,K,H,Y){super({},J,Q,$,W,Z,K,H,Y);this.isVideoFrameTexture=!0}update(){}clone(){return new this.constructor().copy(this)}setFrame(J){this.image=J,this.needsUpdate=!0}}class nY extends kJ{constructor(J,Q){super({width:J,height:Q});this.isFramebufferTexture=!0,this.magFilter=1003,this.minFilter=1003,this.generateMipmaps=!1,this.needsUpdate=!0}}class Q6 extends kJ{constructor(J,Q,$,W,Z,K,H,Y,X,U,N,E){super(null,K,H,Y,X,U,W,Z,N,E);this.isCompressedTexture=!0,this.image={width:Q,height:$},this.mipmaps=J,this.flipY=!1,this.generateMipmaps=!1}}class sY extends Q6{constructor(J,Q,$,W,Z,K){super(J,Q,$,Z,K);this.isCompressedArrayTexture=!0,this.image.depth=W,this.wrapR=1001,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class iY extends Q6{constructor(J,Q,$){super(void 0,J[0].width,J[0].height,Q,$,301);this.isCompressedCubeTexture=!0,this.isCubeTexture=!0,this.image=J}}class k7 extends kJ{constructor(J=[],Q=301,$,W,Z,K,H,Y,X,U){super(J,Q,$,W,Z,K,H,Y,X,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class oY extends kJ{constructor(J,Q,$,W,Z,K,H,Y,X){super(J,Q,$,W,Z,K,H,Y,X);this.isCanvasTexture=!0,this.needsUpdate=!0}}class aY extends kJ{constructor(J,Q,$,W,Z,K,H,Y,X){super(J,Q,$,W,Z,K,H,Y,X);this.isHTMLTexture=!0,this.generateMipmaps=!1,this.needsUpdate=!0;let U=J?J.parentNode:null;if(U!==null&&"requestPaint"in U)U.onpaint=()=>{this.needsUpdate=!0},U.requestPaint()}dispose(){let J=this.image?this.image.parentNode:null;if(J!==null&&"onpaint"in J)J.onpaint=null;super.dispose()}}class $8 extends kJ{constructor(J,Q,$=1014,W,Z,K,H=1003,Y=1003,X,U=1026,N=1){if(U!==1026&&U!==1027)throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let E={width:J,height:Q,depth:N};super(E,W,Z,K,H,Y,U,$,X);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.source=new v9(Object.assign({},J.image)),this.compareFunction=J.compareFunction,this}toJSON(J){let Q=super.toJSON(J);if(this.compareFunction!==null)Q.compareFunction=this.compareFunction;return Q}}class qZ extends $8{constructor(J,Q=1014,$=301,W,Z,K=1003,H=1003,Y,X=1026){let U={width:J,height:J,depth:1},N=[U,U,U,U,U,U];super(J,J,Q,$,W,Z,K,H,Y,X);this.image=N,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(J){this.image=J}}class SQ extends kJ{constructor(J=null){super();this.sourceTexture=J,this.isExternalTexture=!0}copy(J){return super.copy(J),this.sourceTexture=J.sourceTexture,this}}class v8 extends u0{constructor(J=1,Q=1,$=1,W=1,Z=1,K=1){super();this.type="BoxGeometry",this.parameters={width:J,height:Q,depth:$,widthSegments:W,heightSegments:Z,depthSegments:K};let H=this;W=Math.floor(W),Z=Math.floor(Z),K=Math.floor(K);let Y=[],X=[],U=[],N=[],E=0,G=0;q("z","y","x",-1,-1,$,Q,J,K,Z,0),q("z","y","x",1,-1,$,Q,-J,K,Z,1),q("x","z","y",1,1,J,$,Q,W,K,2),q("x","z","y",1,-1,J,$,-Q,W,K,3),q("x","y","z",1,-1,J,Q,$,W,Z,4),q("x","y","z",-1,-1,J,Q,-$,W,Z,5),this.setIndex(Y),this.setAttribute("position",new w0(X,3)),this.setAttribute("normal",new w0(U,3)),this.setAttribute("uv",new w0(N,2));function q(O,R,D,F,I,V,M,w,_,C,k){let B=V/_,f=M/C,T=V/2,p=M/2,n=w/2,b=_+1,u=C+1,l=0,h=0,r=new P;for(let W0=0;W0<u;W0++){let H0=W0*f-p;for(let C0=0;C0<b;C0++){let L0=C0*B-T;r[O]=L0*F,r[R]=H0*I,r[D]=n,X.push(r.x,r.y,r.z),r[O]=0,r[R]=0,r[D]=w>0?1:-1,U.push(r.x,r.y,r.z),N.push(C0/_),N.push(1-W0/C),l+=1}}for(let W0=0;W0<C;W0++)for(let H0=0;H0<_;H0++){let C0=E+H0+b*W0,L0=E+H0+b*(W0+1),UJ=E+(H0+1)+b*(W0+1),HJ=E+(H0+1)+b*W0;Y.push(C0,L0,HJ),Y.push(L0,UJ,HJ),h+=6}H.addGroup(G,h,k),G+=h,E+=l}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new v8(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}class jQ extends u0{constructor(J=1,Q=1,$=4,W=8,Z=1){super();this.type="CapsuleGeometry",this.parameters={radius:J,height:Q,capSegments:$,radialSegments:W,heightSegments:Z},Q=Math.max(0,Q),$=Math.max(1,Math.floor($)),W=Math.max(3,Math.floor(W)),Z=Math.max(1,Math.floor(Z));let K=[],H=[],Y=[],X=[],U=Q/2,N=Math.PI/2*J,E=Q,G=2*N+E,q=$*2+Z,O=W+1,R=new P,D=new P;for(let F=0;F<=q;F++){let I=0,V=0,M=0,w=0;if(F<=$){let k=F/$,B=k*Math.PI/2;V=-U-J*Math.cos(B),M=J*Math.sin(B),w=-J*Math.cos(B),I=k*N}else if(F<=$+Z){let k=(F-$)/Z;V=-U+k*Q,M=J,w=0,I=N+k*E}else{let k=(F-$-Z)/$,B=k*Math.PI/2;V=U+J*Math.sin(B),M=J*Math.cos(B),w=J*Math.sin(B),I=N+E+k*N}let _=Math.max(0,Math.min(1,I/G)),C=0;if(F===0)C=0.5/W;else if(F===q)C=-0.5/W;for(let k=0;k<=W;k++){let B=k/W,f=B*Math.PI*2,T=Math.sin(f),p=Math.cos(f);D.x=-M*p,D.y=V,D.z=M*T,H.push(D.x,D.y,D.z),R.set(-M*p,w,M*T),R.normalize(),Y.push(R.x,R.y,R.z),X.push(B+C,_)}if(F>0){let k=(F-1)*O;for(let B=0;B<W;B++){let f=k+B,T=k+B+1,p=F*O+B,n=F*O+B+1;K.push(f,T,p),K.push(T,n,p)}}}this.setIndex(K),this.setAttribute("position",new w0(H,3)),this.setAttribute("normal",new w0(Y,3)),this.setAttribute("uv",new w0(X,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new jQ(J.radius,J.height,J.capSegments,J.radialSegments,J.heightSegments)}}class yQ extends u0{constructor(J=1,Q=32,$=0,W=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:J,segments:Q,thetaStart:$,thetaLength:W},Q=Math.max(3,Q);let Z=[],K=[],H=[],Y=[],X=new P,U=new a;K.push(0,0,0),H.push(0,0,1),Y.push(0.5,0.5);for(let N=0,E=3;N<=Q;N++,E+=3){let G=$+N/Q*W;X.x=J*Math.cos(G),X.y=J*Math.sin(G),K.push(X.x,X.y,X.z),H.push(0,0,1),U.x=(K[E]/J+1)/2,U.y=(K[E+1]/J+1)/2,Y.push(U.x,U.y)}for(let N=1;N<=Q;N++)Z.push(N,N+1,0);this.setIndex(Z),this.setAttribute("position",new w0(K,3)),this.setAttribute("normal",new w0(H,3)),this.setAttribute("uv",new w0(Y,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new yQ(J.radius,J.segments,J.thetaStart,J.thetaLength)}}class $6 extends u0{constructor(J=1,Q=1,$=1,W=32,Z=1,K=!1,H=0,Y=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:J,radiusBottom:Q,height:$,radialSegments:W,heightSegments:Z,openEnded:K,thetaStart:H,thetaLength:Y};let X=this;W=Math.floor(W),Z=Math.floor(Z);let U=[],N=[],E=[],G=[],q=0,O=[],R=$/2,D=0;if(F(),K===!1){if(J>0)I(!0);if(Q>0)I(!1)}this.setIndex(U),this.setAttribute("position",new w0(N,3)),this.setAttribute("normal",new w0(E,3)),this.setAttribute("uv",new w0(G,2));function F(){let V=new P,M=new P,w=0,_=(Q-J)/$;for(let C=0;C<=Z;C++){let k=[],B=C/Z,f=B*(Q-J)+J;for(let T=0;T<=W;T++){let p=T/W,n=p*Y+H,b=Math.sin(n),u=Math.cos(n);M.x=f*b,M.y=-B*$+R,M.z=f*u,N.push(M.x,M.y,M.z),V.set(b,_,u).normalize(),E.push(V.x,V.y,V.z),G.push(p,1-B),k.push(q++)}O.push(k)}for(let C=0;C<W;C++)for(let k=0;k<Z;k++){let B=O[k][C],f=O[k+1][C],T=O[k+1][C+1],p=O[k][C+1];if(J>0||k!==0)U.push(B,f,p),w+=3;if(Q>0||k!==Z-1)U.push(f,T,p),w+=3}X.addGroup(D,w,0),D+=w}function I(V){let M=q,w=new a,_=new P,C=0,k=V===!0?J:Q,B=V===!0?1:-1;for(let T=1;T<=W;T++)N.push(0,R*B,0),E.push(0,B,0),G.push(0.5,0.5),q++;let f=q;for(let T=0;T<=W;T++){let n=T/W*Y+H,b=Math.cos(n),u=Math.sin(n);_.x=k*u,_.y=R*B,_.z=k*b,N.push(_.x,_.y,_.z),E.push(0,B,0),w.x=b*0.5+0.5,w.y=u*0.5*B+0.5,G.push(w.x,w.y),q++}for(let T=0;T<W;T++){let p=M+T,n=f+T;if(V===!0)U.push(n,n+1,p);else U.push(n+1,n,p);C+=3}X.addGroup(D,C,V===!0?1:2),D+=C}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new $6(J.radiusTop,J.radiusBottom,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class W6 extends $6{constructor(J=1,Q=1,$=32,W=1,Z=!1,K=0,H=Math.PI*2){super(0,J,Q,$,W,Z,K,H);this.type="ConeGeometry",this.parameters={radius:J,height:Q,radialSegments:$,heightSegments:W,openEnded:Z,thetaStart:K,thetaLength:H}}static fromJSON(J){return new W6(J.radius,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class W8 extends u0{constructor(J=[],Q=[],$=1,W=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:J,indices:Q,radius:$,detail:W};let Z=[],K=[];if(H(W),X($),U(),this.setAttribute("position",new w0(Z,3)),this.setAttribute("normal",new w0(Z.slice(),3)),this.setAttribute("uv",new w0(K,2)),W===0)this.computeVertexNormals();else this.normalizeNormals();function H(F){let I=new P,V=new P,M=new P;for(let w=0;w<Q.length;w+=3)G(Q[w+0],I),G(Q[w+1],V),G(Q[w+2],M),Y(I,V,M,F)}function Y(F,I,V,M){let w=M+1,_=[];for(let C=0;C<=w;C++){_[C]=[];let k=F.clone().lerp(V,C/w),B=I.clone().lerp(V,C/w),f=w-C;for(let T=0;T<=f;T++)if(T===0&&C===w)_[C][T]=k;else _[C][T]=k.clone().lerp(B,T/f)}for(let C=0;C<w;C++)for(let k=0;k<2*(w-C)-1;k++){let B=Math.floor(k/2);if(k%2===0)E(_[C][B+1]),E(_[C+1][B]),E(_[C][B]);else E(_[C][B+1]),E(_[C+1][B+1]),E(_[C+1][B])}}function X(F){let I=new P;for(let V=0;V<Z.length;V+=3)I.x=Z[V+0],I.y=Z[V+1],I.z=Z[V+2],I.normalize().multiplyScalar(F),Z[V+0]=I.x,Z[V+1]=I.y,Z[V+2]=I.z}function U(){let F=new P;for(let I=0;I<Z.length;I+=3){F.x=Z[I+0],F.y=Z[I+1],F.z=Z[I+2];let V=R(F)/2/Math.PI+0.5,M=D(F)/Math.PI+0.5;K.push(V,1-M)}q(),N()}function N(){for(let F=0;F<K.length;F+=6){let I=K[F+0],V=K[F+2],M=K[F+4],w=Math.max(I,V,M),_=Math.min(I,V,M);if(w>0.9&&_<0.1){if(I<0.2)K[F+0]+=1;if(V<0.2)K[F+2]+=1;if(M<0.2)K[F+4]+=1}}}function E(F){Z.push(F.x,F.y,F.z)}function G(F,I){let V=F*3;I.x=J[V+0],I.y=J[V+1],I.z=J[V+2]}function q(){let F=new P,I=new P,V=new P,M=new P,w=new a,_=new a,C=new a;for(let k=0,B=0;k<Z.length;k+=9,B+=6){F.set(Z[k+0],Z[k+1],Z[k+2]),I.set(Z[k+3],Z[k+4],Z[k+5]),V.set(Z[k+6],Z[k+7],Z[k+8]),w.set(K[B+0],K[B+1]),_.set(K[B+2],K[B+3]),C.set(K[B+4],K[B+5]),M.copy(F).add(I).add(V).divideScalar(3);let f=R(M);O(w,B+0,F,f),O(_,B+2,I,f),O(C,B+4,V,f)}}function O(F,I,V,M){if(M<0&&F.x===1)K[I]=F.x-1;if(V.x===0&&V.z===0)K[I]=M/2/Math.PI+0.5}function R(F){return Math.atan2(F.z,-F.x)}function D(F){return Math.atan2(-F.y,Math.sqrt(F.x*F.x+F.z*F.z))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new W8(J.vertices,J.indices,J.radius,J.detail)}}class vQ extends W8{constructor(J=1,Q=0){let $=(1+Math.sqrt(5))/2,W=1/$,Z=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-W,-$,0,-W,$,0,W,-$,0,W,$,-W,-$,0,-W,$,0,W,-$,0,W,$,0,-$,0,-W,$,0,-W,-$,0,W,$,0,W],K=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(Z,K,J,Q);this.type="DodecahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new vQ(J.radius,J.detail)}}var c6=new P,n6=new P,m$=new P,s6=new nJ;class FZ extends u0{constructor(J=null,Q=1){super();if(this.type="EdgesGeometry",this.parameters={geometry:J,thresholdAngle:Q},J!==null){let W=Math.pow(10,4),Z=Math.cos(B8*Q),K=J.getIndex(),H=J.getAttribute("position"),Y=K?K.count:H.count,X=[0,0,0],U=["a","b","c"],N=[,,,],E={},G=[];for(let q=0;q<Y;q+=3){if(K)X[0]=K.getX(q),X[1]=K.getX(q+1),X[2]=K.getX(q+2);else X[0]=q,X[1]=q+1,X[2]=q+2;let{a:O,b:R,c:D}=s6;if(O.fromBufferAttribute(H,X[0]),R.fromBufferAttribute(H,X[1]),D.fromBufferAttribute(H,X[2]),s6.getNormal(m$),N[0]=`${Math.round(O.x*W)},${Math.round(O.y*W)},${Math.round(O.z*W)}`,N[1]=`${Math.round(R.x*W)},${Math.round(R.y*W)},${Math.round(R.z*W)}`,N[2]=`${Math.round(D.x*W)},${Math.round(D.y*W)},${Math.round(D.z*W)}`,N[0]===N[1]||N[1]===N[2]||N[2]===N[0])continue;for(let F=0;F<3;F++){let I=(F+1)%3,V=N[F],M=N[I],w=s6[U[F]],_=s6[U[I]],C=`${V}_${M}`,k=`${M}_${V}`;if(k in E&&E[k]){if(m$.dot(E[k].normal)<=Z)G.push(w.x,w.y,w.z),G.push(_.x,_.y,_.z);E[k]=null}else if(!(C in E))E[C]={index0:X[F],index1:X[I],normal:m$.clone()}}}for(let q in E)if(E[q]){let{index0:O,index1:R}=E[q];c6.fromBufferAttribute(H,O),n6.fromBufferAttribute(H,R),G.push(c6.x,c6.y,c6.z),G.push(n6.x,n6.y,n6.z)}this.setAttribute("position",new w0(G,3))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}}class H9{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Y0("Curve: .getPoint() not implemented.")}getPointAt(J,Q){let $=this.getUtoTmapping(J);return this.getPoint($,Q)}getPoints(J=5){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPoint($/J));return Q}getSpacedPoints(J=5){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPointAt($/J));return Q}getLength(){let J=this.getLengths();return J[J.length-1]}getLengths(J=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===J+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let Q=[],$,W=this.getPoint(0),Z=0;Q.push(0);for(let K=1;K<=J;K++)$=this.getPoint(K/J),Z+=$.distanceTo(W),Q.push(Z),W=$;return this.cacheArcLengths=Q,Q}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(J,Q=null){let $=this.getLengths(),W=0,Z=$.length,K;if(Q)K=Q;else K=J*$[Z-1];let H=0,Y=Z-1,X;while(H<=Y)if(W=Math.floor(H+(Y-H)/2),X=$[W]-K,X<0)H=W+1;else if(X>0)Y=W-1;else{Y=W;break}if(W=Y,$[W]===K)return W/(Z-1);let U=$[W],E=$[W+1]-U,G=(K-U)/E;return(W+G)/(Z-1)}getTangent(J,Q){let W=J-0.0001,Z=J+0.0001;if(W<0)W=0;if(Z>1)Z=1;let K=this.getPoint(W),H=this.getPoint(Z),Y=Q||(K.isVector2?new a:new P);return Y.copy(H).sub(K).normalize(),Y}getTangentAt(J,Q){let $=this.getUtoTmapping(J);return this.getTangent($,Q)}computeFrenetFrames(J,Q=!1){let $=new P,W=[],Z=[],K=[],H=new P,Y=new p0;for(let G=0;G<=J;G++){let q=G/J;W[G]=this.getTangentAt(q,new P)}Z[0]=new P,K[0]=new P;let X=Number.MAX_VALUE,U=Math.abs(W[0].x),N=Math.abs(W[0].y),E=Math.abs(W[0].z);if(U<=X)X=U,$.set(1,0,0);if(N<=X)X=N,$.set(0,1,0);if(E<=X)$.set(0,0,1);H.crossVectors(W[0],$).normalize(),Z[0].crossVectors(W[0],H),K[0].crossVectors(W[0],Z[0]);for(let G=1;G<=J;G++){if(Z[G]=Z[G-1].clone(),K[G]=K[G-1].clone(),H.crossVectors(W[G-1],W[G]),H.length()>Number.EPSILON){H.normalize();let q=Math.acos(g0(W[G-1].dot(W[G]),-1,1));Z[G].applyMatrix4(Y.makeRotationAxis(H,q))}K[G].crossVectors(W[G],Z[G])}if(Q===!0){let G=Math.acos(g0(Z[0].dot(Z[J]),-1,1));if(G/=J,W[0].dot(H.crossVectors(Z[0],Z[J]))>0)G=-G;for(let q=1;q<=J;q++)Z[q].applyMatrix4(Y.makeRotationAxis(W[q],G*q)),K[q].crossVectors(W[q],Z[q])}return{tangents:W,normals:Z,binormals:K}}clone(){return new this.constructor().copy(this)}copy(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}toJSON(){let J={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return J.arcLengthDivisions=this.arcLengthDivisions,J.type=this.type,J}fromJSON(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}}class Z6 extends H9{constructor(J=0,Q=0,$=1,W=1,Z=0,K=Math.PI*2,H=!1,Y=0){super();this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=J,this.aY=Q,this.xRadius=$,this.yRadius=W,this.aStartAngle=Z,this.aEndAngle=K,this.aClockwise=H,this.aRotation=Y}getPoint(J,Q=new a){let $=Q,W=Math.PI*2,Z=this.aEndAngle-this.aStartAngle,K=Math.abs(Z)<Number.EPSILON;while(Z<0)Z+=W;while(Z>W)Z-=W;if(Z<Number.EPSILON)if(K)Z=0;else Z=W;if(this.aClockwise===!0&&!K)if(Z===W)Z=-W;else Z=Z-W;let H=this.aStartAngle+J*Z,Y=this.aX+this.xRadius*Math.cos(H),X=this.aY+this.yRadius*Math.sin(H);if(this.aRotation!==0){let U=Math.cos(this.aRotation),N=Math.sin(this.aRotation),E=Y-this.aX,G=X-this.aY;Y=E*U-G*N+this.aX,X=E*N+G*U+this.aY}return $.set(Y,X)}copy(J){return super.copy(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}toJSON(){let J=super.toJSON();return J.aX=this.aX,J.aY=this.aY,J.xRadius=this.xRadius,J.yRadius=this.yRadius,J.aStartAngle=this.aStartAngle,J.aEndAngle=this.aEndAngle,J.aClockwise=this.aClockwise,J.aRotation=this.aRotation,J}fromJSON(J){return super.fromJSON(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}}class DZ extends Z6{constructor(J,Q,$,W,Z,K){super(J,Q,$,$,W,Z,K);this.isArcCurve=!0,this.type="ArcCurve"}}function OZ(){let J=0,Q=0,$=0,W=0;function Z(K,H,Y,X){J=K,Q=Y,$=-3*K+3*H-2*Y-X,W=2*K-2*H+Y+X}return{initCatmullRom:function(K,H,Y,X,U){Z(H,Y,U*(Y-K),U*(X-H))},initNonuniformCatmullRom:function(K,H,Y,X,U,N,E){let G=(H-K)/U-(Y-K)/(U+N)+(Y-H)/N,q=(Y-H)/N-(X-H)/(N+E)+(X-Y)/E;G*=N,q*=N,Z(H,Y,G,q)},calc:function(K){let H=K*K,Y=H*K;return J+Q*K+$*H+W*Y}}}var JH=new P,QH=new P,d$=new OZ,l$=new OZ,u$=new OZ;class RZ extends H9{constructor(J=[],Q=!1,$="centripetal",W=0.5){super();this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=J,this.closed=Q,this.curveType=$,this.tension=W}getPoint(J,Q=new P){let $=Q,W=this.points,Z=W.length,K=(Z-(this.closed?0:1))*J,H=Math.floor(K),Y=K-H;if(this.closed)H+=H>0?0:(Math.floor(Math.abs(H)/Z)+1)*Z;else if(Y===0&&H===Z-1)H=Z-2,Y=1;let X,U;if(this.closed||H>0)X=W[(H-1)%Z];else QH.subVectors(W[0],W[1]).add(W[0]),X=QH;let N=W[H%Z],E=W[(H+1)%Z];if(this.closed||H+2<Z)U=W[(H+2)%Z];else JH.subVectors(W[Z-1],W[Z-2]).add(W[Z-1]),U=JH;if(this.curveType==="centripetal"||this.curveType==="chordal"){let G=this.curveType==="chordal"?0.5:0.25,q=Math.pow(X.distanceToSquared(N),G),O=Math.pow(N.distanceToSquared(E),G),R=Math.pow(E.distanceToSquared(U),G);if(O<0.0001)O=1;if(q<0.0001)q=O;if(R<0.0001)R=O;d$.initNonuniformCatmullRom(X.x,N.x,E.x,U.x,q,O,R),l$.initNonuniformCatmullRom(X.y,N.y,E.y,U.y,q,O,R),u$.initNonuniformCatmullRom(X.z,N.z,E.z,U.z,q,O,R)}else if(this.curveType==="catmullrom")d$.initCatmullRom(X.x,N.x,E.x,U.x,this.tension),l$.initCatmullRom(X.y,N.y,E.y,U.y,this.tension),u$.initCatmullRom(X.z,N.z,E.z,U.z,this.tension);return $.set(d$.calc(Y),l$.calc(Y),u$.calc(Y)),$}copy(J){super.copy(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let W=J.points[Q];this.points.push(W.clone())}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}toJSON(){let J=super.toJSON();J.points=[];for(let Q=0,$=this.points.length;Q<$;Q++){let W=this.points[Q];J.points.push(W.toArray())}return J.closed=this.closed,J.curveType=this.curveType,J.tension=this.tension,J}fromJSON(J){super.fromJSON(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let W=J.points[Q];this.points.push(new P().fromArray(W))}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}}function $H(J,Q,$,W,Z){let K=(W-Q)*0.5,H=(Z-$)*0.5,Y=J*J,X=J*Y;return(2*$-2*W+K+H)*X+(-3*$+3*W-2*K-H)*Y+K*J+$}function iN(J,Q){let $=1-J;return $*$*Q}function oN(J,Q){return 2*(1-J)*J*Q}function aN(J,Q){return J*J*Q}function g7(J,Q,$,W){return iN(J,Q)+oN(J,$)+aN(J,W)}function rN(J,Q){let $=1-J;return $*$*$*Q}function tN(J,Q){let $=1-J;return 3*$*$*J*Q}function eN(J,Q){return 3*(1-J)*J*J*Q}function JE(J,Q){return J*J*J*Q}function p7(J,Q,$,W,Z){return rN(J,Q)+tN(J,$)+eN(J,W)+JE(J,Z)}class fQ extends H9{constructor(J=new a,Q=new a,$=new a,W=new a){super();this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=J,this.v1=Q,this.v2=$,this.v3=W}getPoint(J,Q=new a){let $=Q,W=this.v0,Z=this.v1,K=this.v2,H=this.v3;return $.set(p7(J,W.x,Z.x,K.x,H.x),p7(J,W.y,Z.y,K.y,H.y)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class kZ extends H9{constructor(J=new P,Q=new P,$=new P,W=new P){super();this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=J,this.v1=Q,this.v2=$,this.v3=W}getPoint(J,Q=new P){let $=Q,W=this.v0,Z=this.v1,K=this.v2,H=this.v3;return $.set(p7(J,W.x,Z.x,K.x,H.x),p7(J,W.y,Z.y,K.y,H.y),p7(J,W.z,Z.z,K.z,H.z)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class bQ extends H9{constructor(J=new a,Q=new a){super();this.isLineCurve=!0,this.type="LineCurve",this.v1=J,this.v2=Q}getPoint(J,Q=new a){let $=Q;if(J===1)$.copy(this.v2);else $.copy(this.v2).sub(this.v1),$.multiplyScalar(J).add(this.v1);return $}getPointAt(J,Q){return this.getPoint(J,Q)}getTangent(J,Q=new a){return Q.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,Q){return this.getTangent(J,Q)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class MZ extends H9{constructor(J=new P,Q=new P){super();this.isLineCurve3=!0,this.type="LineCurve3",this.v1=J,this.v2=Q}getPoint(J,Q=new P){let $=Q;if(J===1)$.copy(this.v2);else $.copy(this.v2).sub(this.v1),$.multiplyScalar(J).add(this.v1);return $}getPointAt(J,Q){return this.getPoint(J,Q)}getTangent(J,Q=new P){return Q.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,Q){return this.getTangent(J,Q)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class hQ extends H9{constructor(J=new a,Q=new a,$=new a){super();this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=J,this.v1=Q,this.v2=$}getPoint(J,Q=new a){let $=Q,W=this.v0,Z=this.v1,K=this.v2;return $.set(g7(J,W.x,Z.x,K.x),g7(J,W.y,Z.y,K.y)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class xQ extends H9{constructor(J=new P,Q=new P,$=new P){super();this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=J,this.v1=Q,this.v2=$}getPoint(J,Q=new P){let $=Q,W=this.v0,Z=this.v1,K=this.v2;return $.set(g7(J,W.x,Z.x,K.x),g7(J,W.y,Z.y,K.y),g7(J,W.z,Z.z,K.z)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class gQ extends H9{constructor(J=[]){super();this.isSplineCurve=!0,this.type="SplineCurve",this.points=J}getPoint(J,Q=new a){let $=Q,W=this.points,Z=(W.length-1)*J,K=Math.floor(Z),H=Z-K,Y=W[K===0?K:K-1],X=W[K],U=W[K>W.length-2?W.length-1:K+1],N=W[K>W.length-3?W.length-1:K+2];return $.set($H(H,Y.x,X.x,U.x,N.x),$H(H,Y.y,X.y,U.y,N.y)),$}copy(J){super.copy(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let W=J.points[Q];this.points.push(W.clone())}return this}toJSON(){let J=super.toJSON();J.points=[];for(let Q=0,$=this.points.length;Q<$;Q++){let W=this.points[Q];J.points.push(W.toArray())}return J}fromJSON(J){super.fromJSON(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let W=J.points[Q];this.points.push(new a().fromArray(W))}return this}}var YQ=Object.freeze({__proto__:null,ArcCurve:DZ,CatmullRomCurve3:RZ,CubicBezierCurve:fQ,CubicBezierCurve3:kZ,EllipseCurve:Z6,LineCurve:bQ,LineCurve3:MZ,QuadraticBezierCurve:hQ,QuadraticBezierCurve3:xQ,SplineCurve:gQ});class LZ extends H9{constructor(){super();this.type="CurvePath",this.curves=[],this.autoClose=!1}add(J){this.curves.push(J)}closePath(){let J=this.curves[0].getPoint(0),Q=this.curves[this.curves.length-1].getPoint(1);if(!J.equals(Q)){let $=J.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new YQ[$](Q,J))}return this}getPoint(J,Q){let $=J*this.getLength(),W=this.getCurveLengths(),Z=0;while(Z<W.length){if(W[Z]>=$){let K=W[Z]-$,H=this.curves[Z],Y=H.getLength(),X=Y===0?0:1-K/Y;return H.getPointAt(X,Q)}Z++}return null}getLength(){let J=this.getCurveLengths();return J[J.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let J=[],Q=0;for(let $=0,W=this.curves.length;$<W;$++)Q+=this.curves[$].getLength(),J.push(Q);return this.cacheLengths=J,J}getSpacedPoints(J=40){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPoint($/J));if(this.autoClose)Q.push(Q[0]);return Q}getPoints(J=12){let Q=[],$;for(let W=0,Z=this.curves;W<Z.length;W++){let K=Z[W],H=K.isEllipseCurve?J*2:K.isLineCurve||K.isLineCurve3?1:K.isSplineCurve?J*K.points.length:J,Y=K.getPoints(H);for(let X=0;X<Y.length;X++){let U=Y[X];if($&&$.equals(U))continue;Q.push(U),$=U}}if(this.autoClose&&Q.length>1&&!Q[Q.length-1].equals(Q[0]))Q.push(Q[0]);return Q}copy(J){super.copy(J),this.curves=[];for(let Q=0,$=J.curves.length;Q<$;Q++){let W=J.curves[Q];this.curves.push(W.clone())}return this.autoClose=J.autoClose,this}toJSON(){let J=super.toJSON();J.autoClose=this.autoClose,J.curves=[];for(let Q=0,$=this.curves.length;Q<$;Q++){let W=this.curves[Q];J.curves.push(W.toJSON())}return J}fromJSON(J){super.fromJSON(J),this.autoClose=J.autoClose,this.curves=[];for(let Q=0,$=J.curves.length;Q<$;Q++){let W=J.curves[Q];this.curves.push(new YQ[W.type]().fromJSON(W))}return this}}class U7 extends LZ{constructor(J){super();if(this.type="Path",this.currentPoint=new a,J)this.setFromPoints(J)}setFromPoints(J){this.moveTo(J[0].x,J[0].y);for(let Q=1,$=J.length;Q<$;Q++)this.lineTo(J[Q].x,J[Q].y);return this}moveTo(J,Q){return this.currentPoint.set(J,Q),this}lineTo(J,Q){let $=new bQ(this.currentPoint.clone(),new a(J,Q));return this.curves.push($),this.currentPoint.set(J,Q),this}quadraticCurveTo(J,Q,$,W){let Z=new hQ(this.currentPoint.clone(),new a(J,Q),new a($,W));return this.curves.push(Z),this.currentPoint.set($,W),this}bezierCurveTo(J,Q,$,W,Z,K){let H=new fQ(this.currentPoint.clone(),new a(J,Q),new a($,W),new a(Z,K));return this.curves.push(H),this.currentPoint.set(Z,K),this}splineThru(J){let Q=[this.currentPoint.clone()].concat(J),$=new gQ(Q);return this.curves.push($),this.currentPoint.copy(J[J.length-1]),this}arc(J,Q,$,W,Z,K){let H=this.currentPoint.x,Y=this.currentPoint.y;return this.absarc(J+H,Q+Y,$,W,Z,K),this}absarc(J,Q,$,W,Z,K){return this.absellipse(J,Q,$,$,W,Z,K),this}ellipse(J,Q,$,W,Z,K,H,Y){let X=this.currentPoint.x,U=this.currentPoint.y;return this.absellipse(J+X,Q+U,$,W,Z,K,H,Y),this}absellipse(J,Q,$,W,Z,K,H,Y){let X=new Z6(J,Q,$,W,Z,K,H,Y);if(this.curves.length>0){let N=X.getPoint(0);if(!N.equals(this.currentPoint))this.lineTo(N.x,N.y)}this.curves.push(X);let U=X.getPoint(1);return this.currentPoint.copy(U),this}copy(J){return super.copy(J),this.currentPoint.copy(J.currentPoint),this}toJSON(){let J=super.toJSON();return J.currentPoint=this.currentPoint.toArray(),J}fromJSON(J){return super.fromJSON(J),this.currentPoint.fromArray(J.currentPoint),this}}class M7 extends U7{constructor(J){super(J);this.uuid=eJ(),this.type="Shape",this.holes=[]}getPointsHoles(J){let Q=[];for(let $=0,W=this.holes.length;$<W;$++)Q[$]=this.holes[$].getPoints(J);return Q}extractPoints(J){return{shape:this.getPoints(J),holes:this.getPointsHoles(J)}}copy(J){super.copy(J),this.holes=[];for(let Q=0,$=J.holes.length;Q<$;Q++){let W=J.holes[Q];this.holes.push(W.clone())}return this}toJSON(){let J=super.toJSON();J.uuid=this.uuid,J.holes=[];for(let Q=0,$=this.holes.length;Q<$;Q++){let W=this.holes[Q];J.holes.push(W.toJSON())}return J}fromJSON(J){super.fromJSON(J),this.uuid=J.uuid,this.holes=[];for(let Q=0,$=J.holes.length;Q<$;Q++){let W=J.holes[Q];this.holes.push(new U7().fromJSON(W))}return this}}function QE(J,Q,$=2){let W=Q&&Q.length,Z=W?Q[0]*$:J.length,K=rY(J,0,Z,$,!0),H=[];if(!K||K.next===K.prev)return H;let Y,X,U;if(W)K=HE(J,Q,K,$);if(J.length>80*$){Y=J[0],X=J[1];let N=Y,E=X;for(let G=$;G<Z;G+=$){let q=J[G],O=J[G+1];if(q<Y)Y=q;if(O<X)X=O;if(q>N)N=q;if(O>E)E=O}U=Math.max(N-Y,E-X),U=U!==0?32767/U:0}return d7(K,H,$,Y,X,U,0),H}function rY(J,Q,$,W,Z){let K;if(Z===RE(J,Q,$,W)>0)for(let H=Q;H<$;H+=W)K=WH(H/W|0,J[H],J[H+1],K);else for(let H=$-W;H>=Q;H-=W)K=WH(H/W|0,J[H],J[H+1],K);if(K&&G7(K,K.next))u7(K),K=K.next;return K}function w8(J,Q){if(!J)return J;if(!Q)Q=J;let $=J,W;do if(W=!1,!$.steiner&&(G7($,$.next)||RJ($.prev,$,$.next)===0)){if(u7($),$=Q=$.prev,$===$.next)break;W=!0}else $=$.next;while(W||$!==Q);return Q}function d7(J,Q,$,W,Z,K,H){if(!J)return;if(!H&&K)NE(J,W,Z,K);let Y=J;while(J.prev!==J.next){let{prev:X,next:U}=J;if(K?WE(J,W,Z,K):$E(J)){Q.push(X.i,J.i,U.i),u7(J),J=U.next,Y=U.next;continue}if(J=U,J===Y){if(!H)d7(w8(J),Q,$,W,Z,K,1);else if(H===1)J=ZE(w8(J),Q),d7(J,Q,$,W,Z,K,2);else if(H===2)KE(J,Q,$,W,Z,K);break}}}function $E(J){let Q=J.prev,$=J,W=J.next;if(RJ(Q,$,W)>=0)return!1;let Z=Q.x,K=$.x,H=W.x,Y=Q.y,X=$.y,U=W.y,N=Math.min(Z,K,H),E=Math.min(Y,X,U),G=Math.max(Z,K,H),q=Math.max(Y,X,U),O=W.next;while(O!==Q){if(O.x>=N&&O.x<=G&&O.y>=E&&O.y<=q&&h7(Z,Y,K,X,H,U,O.x,O.y)&&RJ(O.prev,O,O.next)>=0)return!1;O=O.next}return!0}function WE(J,Q,$,W){let Z=J.prev,K=J,H=J.next;if(RJ(Z,K,H)>=0)return!1;let Y=Z.x,X=K.x,U=H.x,N=Z.y,E=K.y,G=H.y,q=Math.min(Y,X,U),O=Math.min(N,E,G),R=Math.max(Y,X,U),D=Math.max(N,E,G),F=e$(q,O,Q,$,W),I=e$(R,D,Q,$,W),V=J.prevZ,M=J.nextZ;while(V&&V.z>=F&&M&&M.z<=I){if(V.x>=q&&V.x<=R&&V.y>=O&&V.y<=D&&V!==Z&&V!==H&&h7(Y,N,X,E,U,G,V.x,V.y)&&RJ(V.prev,V,V.next)>=0)return!1;if(V=V.prevZ,M.x>=q&&M.x<=R&&M.y>=O&&M.y<=D&&M!==Z&&M!==H&&h7(Y,N,X,E,U,G,M.x,M.y)&&RJ(M.prev,M,M.next)>=0)return!1;M=M.nextZ}while(V&&V.z>=F){if(V.x>=q&&V.x<=R&&V.y>=O&&V.y<=D&&V!==Z&&V!==H&&h7(Y,N,X,E,U,G,V.x,V.y)&&RJ(V.prev,V,V.next)>=0)return!1;V=V.prevZ}while(M&&M.z<=I){if(M.x>=q&&M.x<=R&&M.y>=O&&M.y<=D&&M!==Z&&M!==H&&h7(Y,N,X,E,U,G,M.x,M.y)&&RJ(M.prev,M,M.next)>=0)return!1;M=M.nextZ}return!0}function ZE(J,Q){let $=J;do{let W=$.prev,Z=$.next.next;if(!G7(W,Z)&&eY(W,$,$.next,Z)&&l7(W,Z)&&l7(Z,W))Q.push(W.i,$.i,Z.i),u7($),u7($.next),$=J=Z;$=$.next}while($!==J);return w8($)}function KE(J,Q,$,W,Z,K){let H=J;do{let Y=H.next.next;while(Y!==H.prev){if(H.i!==Y.i&&FE(H,Y)){let X=JX(H,Y);H=w8(H,H.next),X=w8(X,X.next),d7(H,Q,$,W,Z,K,0),d7(X,Q,$,W,Z,K,0);return}Y=Y.next}H=H.next}while(H!==J)}function HE(J,Q,$,W){let Z=[];for(let K=0,H=Q.length;K<H;K++){let Y=Q[K]*W,X=K<H-1?Q[K+1]*W:J.length,U=rY(J,Y,X,W,!1);if(U===U.next)U.steiner=!0;Z.push(qE(U))}Z.sort(YE);for(let K=0;K<Z.length;K++)$=XE(Z[K],$);return $}function YE(J,Q){let $=J.x-Q.x;if($===0){if($=J.y-Q.y,$===0){let W=(J.next.y-J.y)/(J.next.x-J.x),Z=(Q.next.y-Q.y)/(Q.next.x-Q.x);$=W-Z}}return $}function XE(J,Q){let $=UE(J,Q);if(!$)return Q;let W=JX($,J);return w8(W,W.next),w8($,$.next)}function UE(J,Q){let $=Q,W=J.x,Z=J.y,K=-1/0,H;if(G7(J,$))return $;do{if(G7(J,$.next))return $.next;else if(Z<=$.y&&Z>=$.next.y&&$.next.y!==$.y){let E=$.x+(Z-$.y)*($.next.x-$.x)/($.next.y-$.y);if(E<=W&&E>K){if(K=E,H=$.x<$.next.x?$:$.next,E===W)return H}}$=$.next}while($!==Q);if(!H)return null;let Y=H,X=H.x,U=H.y,N=1/0;$=H;do{if(W>=$.x&&$.x>=X&&W!==$.x&&tY(Z<U?W:K,Z,X,U,Z<U?K:W,Z,$.x,$.y)){let E=Math.abs(Z-$.y)/(W-$.x);if(l7($,J)&&(E<N||E===N&&($.x>H.x||$.x===H.x&&GE(H,$))))H=$,N=E}$=$.next}while($!==Y);return H}function GE(J,Q){return RJ(J.prev,J,Q.prev)<0&&RJ(Q.next,J,J.next)<0}function NE(J,Q,$,W){let Z=J;do{if(Z.z===0)Z.z=e$(Z.x,Z.y,Q,$,W);Z.prevZ=Z.prev,Z.nextZ=Z.next,Z=Z.next}while(Z!==J);Z.prevZ.nextZ=null,Z.prevZ=null,EE(Z)}function EE(J){let Q,$=1;do{let W=J,Z;J=null;let K=null;Q=0;while(W){Q++;let H=W,Y=0;for(let U=0;U<$;U++)if(Y++,H=H.nextZ,!H)break;let X=$;while(Y>0||X>0&&H){if(Y!==0&&(X===0||!H||W.z<=H.z))Z=W,W=W.nextZ,Y--;else Z=H,H=H.nextZ,X--;if(K)K.nextZ=Z;else J=Z;Z.prevZ=K,K=Z}W=H}K.nextZ=null,$*=2}while(Q>1);return J}function e$(J,Q,$,W,Z){return J=(J-$)*Z|0,Q=(Q-W)*Z|0,J=(J|J<<8)&16711935,J=(J|J<<4)&252645135,J=(J|J<<2)&858993459,J=(J|J<<1)&1431655765,Q=(Q|Q<<8)&16711935,Q=(Q|Q<<4)&252645135,Q=(Q|Q<<2)&858993459,Q=(Q|Q<<1)&1431655765,J|Q<<1}function qE(J){let Q=J,$=J;do{if(Q.x<$.x||Q.x===$.x&&Q.y<$.y)$=Q;Q=Q.next}while(Q!==J);return $}function tY(J,Q,$,W,Z,K,H,Y){return(Z-H)*(Q-Y)>=(J-H)*(K-Y)&&(J-H)*(W-Y)>=($-H)*(Q-Y)&&($-H)*(K-Y)>=(Z-H)*(W-Y)}function h7(J,Q,$,W,Z,K,H,Y){return!(J===H&&Q===Y)&&tY(J,Q,$,W,Z,K,H,Y)}function FE(J,Q){return J.next.i!==Q.i&&J.prev.i!==Q.i&&!DE(J,Q)&&(l7(J,Q)&&l7(Q,J)&&OE(J,Q)&&(RJ(J.prev,J,Q.prev)||RJ(J,Q.prev,Q))||G7(J,Q)&&RJ(J.prev,J,J.next)>0&&RJ(Q.prev,Q,Q.next)>0)}function RJ(J,Q,$){return(Q.y-J.y)*($.x-Q.x)-(Q.x-J.x)*($.y-Q.y)}function G7(J,Q){return J.x===Q.x&&J.y===Q.y}function eY(J,Q,$,W){let Z=o6(RJ(J,Q,$)),K=o6(RJ(J,Q,W)),H=o6(RJ($,W,J)),Y=o6(RJ($,W,Q));if(Z!==K&&H!==Y)return!0;if(Z===0&&i6(J,$,Q))return!0;if(K===0&&i6(J,W,Q))return!0;if(H===0&&i6($,J,W))return!0;if(Y===0&&i6($,Q,W))return!0;return!1}function i6(J,Q,$){return Q.x<=Math.max(J.x,$.x)&&Q.x>=Math.min(J.x,$.x)&&Q.y<=Math.max(J.y,$.y)&&Q.y>=Math.min(J.y,$.y)}function o6(J){return J>0?1:J<0?-1:0}function DE(J,Q){let $=J;do{if($.i!==J.i&&$.next.i!==J.i&&$.i!==Q.i&&$.next.i!==Q.i&&eY($,$.next,J,Q))return!0;$=$.next}while($!==J);return!1}function l7(J,Q){return RJ(J.prev,J,J.next)<0?RJ(J,Q,J.next)>=0&&RJ(J,J.prev,Q)>=0:RJ(J,Q,J.prev)<0||RJ(J,J.next,Q)<0}function OE(J,Q){let $=J,W=!1,Z=(J.x+Q.x)/2,K=(J.y+Q.y)/2;do{if($.y>K!==$.next.y>K&&$.next.y!==$.y&&Z<($.next.x-$.x)*(K-$.y)/($.next.y-$.y)+$.x)W=!W;$=$.next}while($!==J);return W}function JX(J,Q){let $=JW(J.i,J.x,J.y),W=JW(Q.i,Q.x,Q.y),Z=J.next,K=Q.prev;return J.next=Q,Q.prev=J,$.next=Z,Z.prev=$,W.next=$,$.prev=W,K.next=W,W.prev=K,W}function WH(J,Q,$,W){let Z=JW(J,Q,$);if(!W)Z.prev=Z,Z.next=Z;else Z.next=W.next,Z.prev=W,W.next.prev=Z,W.next=Z;return Z}function u7(J){if(J.next.prev=J.prev,J.prev.next=J.next,J.prevZ)J.prevZ.nextZ=J.nextZ;if(J.nextZ)J.nextZ.prevZ=J.prevZ}function JW(J,Q,$){return{i:J,x:Q,y:$,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function RE(J,Q,$,W){let Z=0;for(let K=Q,H=$-W;K<$;K+=W)Z+=(J[H]-J[K])*(J[K+1]+J[H+1]),H=K;return Z}class QX{static triangulate(J,Q,$=2){return QE(J,Q,$)}}class G9{static area(J){let Q=J.length,$=0;for(let W=Q-1,Z=0;Z<Q;W=Z++)$+=J[W].x*J[Z].y-J[Z].x*J[W].y;return $*0.5}static isClockWise(J){return G9.area(J)<0}static triangulateShape(J,Q){let $=[],W=[],Z=[];ZH(J),KH($,J);let K=J.length;Q.forEach(ZH);for(let Y=0;Y<Q.length;Y++)W.push(K),K+=Q[Y].length,KH($,Q[Y]);let H=QX.triangulate($,W);for(let Y=0;Y<H.length;Y+=3)Z.push(H.slice(Y,Y+3));return Z}}function ZH(J){let Q=J.length;if(Q>2&&J[Q-1].equals(J[0]))J.pop()}function KH(J,Q){for(let $=0;$<Q.length;$++)J.push(Q[$].x),J.push(Q[$].y)}class pQ extends u0{constructor(J=new M7([new a(0.5,0.5),new a(-0.5,0.5),new a(-0.5,-0.5),new a(0.5,-0.5)]),Q={}){super();this.type="ExtrudeGeometry",this.parameters={shapes:J,options:Q},J=Array.isArray(J)?J:[J];let $=this,W=[],Z=[];for(let H=0,Y=J.length;H<Y;H++){let X=J[H];K(X)}this.setAttribute("position",new w0(W,3)),this.setAttribute("uv",new w0(Z,2)),this.computeVertexNormals();function K(H){let Y=[],X=Q.curveSegments!==void 0?Q.curveSegments:12,U=Q.steps!==void 0?Q.steps:1,N=Q.depth!==void 0?Q.depth:1,E=Q.bevelEnabled!==void 0?Q.bevelEnabled:!0,G=Q.bevelThickness!==void 0?Q.bevelThickness:0.2,q=Q.bevelSize!==void 0?Q.bevelSize:G-0.1,O=Q.bevelOffset!==void 0?Q.bevelOffset:0,R=Q.bevelSegments!==void 0?Q.bevelSegments:3,D=Q.extrudePath,F=Q.UVGenerator!==void 0?Q.UVGenerator:kE,I,V=!1,M,w,_,C;if(D){I=D.getSpacedPoints(U),V=!0,E=!1;let t=D.isCatmullRomCurve3?D.closed:!1;M=D.computeFrenetFrames(U,t),w=new P,_=new P,C=new P}if(!E)R=0,G=0,q=0,O=0;let k=H.extractPoints(X),B=k.shape,f=k.holes;if(!G9.isClockWise(B)){B=B.reverse();for(let t=0,$0=f.length;t<$0;t++){let Q0=f[t];if(G9.isClockWise(Q0))f[t]=Q0.reverse()}}function p(t){let k0=t[0];for(let z0=1;z0<=t.length;z0++){let S0=z0%t.length,y0=t[S0],c0=y0.x-k0.x,n0=y0.y-k0.y,S=c0*c0+n0*n0,FJ=Math.max(Math.abs(y0.x),Math.abs(y0.y),Math.abs(k0.x),Math.abs(k0.y)),e0=0.000000000000000000010000000000000001*FJ*FJ;if(S<=e0){t.splice(S0,1),z0--;continue}k0=y0}}p(B),f.forEach(p);let n=f.length,b=B;for(let t=0;t<n;t++){let $0=f[t];B=B.concat($0)}function u(t,$0,Q0){if(!$0)T0("ExtrudeGeometry: vec does not exist");return t.clone().addScaledVector($0,Q0)}let l=B.length;function h(t,$0,Q0){let k0,z0,S0,y0=t.x-$0.x,c0=t.y-$0.y,n0=Q0.x-t.x,S=Q0.y-t.y,FJ=y0*y0+c0*c0,e0=y0*S-c0*n0;if(Math.abs(e0)>Number.EPSILON){let r0=Math.sqrt(FJ),A=Math.sqrt(n0*n0+S*S),L=$0.x-c0/r0,j=$0.y+y0/r0,m=Q0.x-S/A,e=Q0.y+n0/A,Z0=((m-L)*S-(e-j)*n0)/(y0*S-c0*n0);k0=L+y0*Z0-t.x,z0=j+c0*Z0-t.y;let G0=k0*k0+z0*z0;if(G0<=2)return new a(k0,z0);else S0=Math.sqrt(G0/2)}else{let r0=!1;if(y0>Number.EPSILON){if(n0>Number.EPSILON)r0=!0}else if(y0<-Number.EPSILON){if(n0<-Number.EPSILON)r0=!0}else if(Math.sign(c0)===Math.sign(S))r0=!0;if(r0)k0=-c0,z0=y0,S0=Math.sqrt(FJ);else k0=y0,z0=c0,S0=Math.sqrt(FJ/2)}return new a(k0/S0,z0/S0)}let r=[];for(let t=0,$0=b.length,Q0=$0-1,k0=t+1;t<$0;t++,Q0++,k0++){if(Q0===$0)Q0=0;if(k0===$0)k0=0;r[t]=h(b[t],b[Q0],b[k0])}let W0=[],H0,C0=r.concat();for(let t=0,$0=n;t<$0;t++){let Q0=f[t];H0=[];for(let k0=0,z0=Q0.length,S0=z0-1,y0=k0+1;k0<z0;k0++,S0++,y0++){if(S0===z0)S0=0;if(y0===z0)y0=0;H0[k0]=h(Q0[k0],Q0[S0],Q0[y0])}W0.push(H0),C0=C0.concat(H0)}let L0;if(R===0)L0=G9.triangulateShape(b,f);else{let t=[],$0=[];for(let Q0=0;Q0<R;Q0++){let k0=Q0/R,z0=G*Math.cos(k0*Math.PI/2),S0=q*Math.sin(k0*Math.PI/2)+O;for(let y0=0,c0=b.length;y0<c0;y0++){let n0=u(b[y0],r[y0],S0);if(N0(n0.x,n0.y,-z0),k0===0)t.push(n0)}for(let y0=0,c0=n;y0<c0;y0++){let n0=f[y0];H0=W0[y0];let S=[];for(let FJ=0,e0=n0.length;FJ<e0;FJ++){let r0=u(n0[FJ],H0[FJ],S0);if(N0(r0.x,r0.y,-z0),k0===0)S.push(r0)}if(k0===0)$0.push(S)}}L0=G9.triangulateShape(t,$0)}let UJ=L0.length,HJ=q+O;for(let t=0;t<l;t++){let $0=E?u(B[t],C0[t],HJ):B[t];if(!V)N0($0.x,$0.y,0);else _.copy(M.normals[0]).multiplyScalar($0.x),w.copy(M.binormals[0]).multiplyScalar($0.y),C.copy(I[0]).add(_).add(w),N0(C.x,C.y,C.z)}for(let t=1;t<=U;t++)for(let $0=0;$0<l;$0++){let Q0=E?u(B[$0],C0[$0],HJ):B[$0];if(!V)N0(Q0.x,Q0.y,N/U*t);else _.copy(M.normals[t]).multiplyScalar(Q0.x),w.copy(M.binormals[t]).multiplyScalar(Q0.y),C.copy(I[t]).add(_).add(w),N0(C.x,C.y,C.z)}for(let t=R-1;t>=0;t--){let $0=t/R,Q0=G*Math.cos($0*Math.PI/2),k0=q*Math.sin($0*Math.PI/2)+O;for(let z0=0,S0=b.length;z0<S0;z0++){let y0=u(b[z0],r[z0],k0);N0(y0.x,y0.y,N+Q0)}for(let z0=0,S0=f.length;z0<S0;z0++){let y0=f[z0];H0=W0[z0];for(let c0=0,n0=y0.length;c0<n0;c0++){let S=u(y0[c0],H0[c0],k0);if(!V)N0(S.x,S.y,N+Q0);else N0(S.x,S.y+I[U-1].y,I[U-1].x+Q0)}}}i(),X0();function i(){let t=W.length/3;if(E){let $0=0,Q0=l*$0;for(let k0=0;k0<UJ;k0++){let z0=L0[k0];b0(z0[2]+Q0,z0[1]+Q0,z0[0]+Q0)}$0=U+R*2,Q0=l*$0;for(let k0=0;k0<UJ;k0++){let z0=L0[k0];b0(z0[0]+Q0,z0[1]+Q0,z0[2]+Q0)}}else{for(let $0=0;$0<UJ;$0++){let Q0=L0[$0];b0(Q0[2],Q0[1],Q0[0])}for(let $0=0;$0<UJ;$0++){let Q0=L0[$0];b0(Q0[0]+l*U,Q0[1]+l*U,Q0[2]+l*U)}}$.addGroup(t,W.length/3-t,0)}function X0(){let t=W.length/3,$0=0;V0(b,$0),$0+=b.length;for(let Q0=0,k0=f.length;Q0<k0;Q0++){let z0=f[Q0];V0(z0,$0),$0+=z0.length}$.addGroup(t,W.length/3-t,1)}function V0(t,$0){let Q0=t.length;while(--Q0>=0){let k0=Q0,z0=Q0-1;if(z0<0)z0=t.length-1;for(let S0=0,y0=U+R*2;S0<y0;S0++){let c0=l*S0,n0=l*(S0+1),S=$0+k0+c0,FJ=$0+z0+c0,e0=$0+z0+n0,r0=$0+k0+n0;QJ(S,FJ,e0,r0)}}}function N0(t,$0,Q0){Y.push(t),Y.push($0),Y.push(Q0)}function b0(t,$0,Q0){m0(t),m0($0),m0(Q0);let k0=W.length/3,z0=F.generateTopUV($,W,k0-3,k0-2,k0-1);d0(z0[0]),d0(z0[1]),d0(z0[2])}function QJ(t,$0,Q0,k0){m0(t),m0($0),m0(k0),m0($0),m0(Q0),m0(k0);let z0=W.length/3,S0=F.generateSideWallUV($,W,z0-6,z0-3,z0-2,z0-1);d0(S0[0]),d0(S0[1]),d0(S0[3]),d0(S0[1]),d0(S0[2]),d0(S0[3])}function m0(t){W.push(Y[t*3+0]),W.push(Y[t*3+1]),W.push(Y[t*3+2])}function d0(t){Z.push(t.x),Z.push(t.y)}}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON(),Q=this.parameters.shapes,$=this.parameters.options;return ME(Q,$,J)}static fromJSON(J,Q){let $=[];for(let Z=0,K=J.shapes.length;Z<K;Z++){let H=Q[J.shapes[Z]];$.push(H)}let W=J.options.extrudePath;if(W!==void 0)J.options.extrudePath=new YQ[W.type]().fromJSON(W);return new pQ($,J.options)}}var kE={generateTopUV:function(J,Q,$,W,Z){let K=Q[$*3],H=Q[$*3+1],Y=Q[W*3],X=Q[W*3+1],U=Q[Z*3],N=Q[Z*3+1];return[new a(K,H),new a(Y,X),new a(U,N)]},generateSideWallUV:function(J,Q,$,W,Z,K){let H=Q[$*3],Y=Q[$*3+1],X=Q[$*3+2],U=Q[W*3],N=Q[W*3+1],E=Q[W*3+2],G=Q[Z*3],q=Q[Z*3+1],O=Q[Z*3+2],R=Q[K*3],D=Q[K*3+1],F=Q[K*3+2];if(Math.abs(Y-N)<Math.abs(H-U))return[new a(H,1-X),new a(U,1-E),new a(G,1-O),new a(R,1-F)];else return[new a(Y,1-X),new a(N,1-E),new a(q,1-O),new a(D,1-F)]}};function ME(J,Q,$){if($.shapes=[],Array.isArray(J))for(let W=0,Z=J.length;W<Z;W++){let K=J[W];$.shapes.push(K.uuid)}else $.shapes.push(J.uuid);if($.options=Object.assign({},Q),Q.extrudePath!==void 0)$.options.extrudePath=Q.extrudePath.toJSON();return $}class mQ extends W8{constructor(J=1,Q=0){let $=(1+Math.sqrt(5))/2,W=[-1,$,0,1,$,0,-1,-$,0,1,-$,0,0,-1,$,0,1,$,0,-1,-$,0,1,-$,$,0,-1,$,0,1,-$,0,-1,-$,0,1],Z=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(W,Z,J,Q);this.type="IcosahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new mQ(J.radius,J.detail)}}class dQ extends u0{constructor(J=[new a(0,-0.5),new a(0.5,0),new a(0,0.5)],Q=12,$=0,W=Math.PI*2){super();this.type="LatheGeometry",this.parameters={points:J,segments:Q,phiStart:$,phiLength:W},Q=Math.floor(Q),W=g0(W,0,Math.PI*2);let Z=[],K=[],H=[],Y=[],X=[],U=1/Q,N=new P,E=new a,G=new P,q=new P,O=new P,R=0,D=0;for(let F=0;F<=J.length-1;F++)switch(F){case 0:R=J[F+1].x-J[F].x,D=J[F+1].y-J[F].y,G.x=D*1,G.y=-R,G.z=D*0,O.copy(G),G.normalize(),Y.push(G.x,G.y,G.z);break;case J.length-1:Y.push(O.x,O.y,O.z);break;default:R=J[F+1].x-J[F].x,D=J[F+1].y-J[F].y,G.x=D*1,G.y=-R,G.z=D*0,q.copy(G),G.x+=O.x,G.y+=O.y,G.z+=O.z,G.normalize(),Y.push(G.x,G.y,G.z),O.copy(q)}for(let F=0;F<=Q;F++){let I=$+F*U*W,V=Math.sin(I),M=Math.cos(I);for(let w=0;w<=J.length-1;w++){N.x=J[w].x*V,N.y=J[w].y,N.z=J[w].x*M,K.push(N.x,N.y,N.z),E.x=F/Q,E.y=w/(J.length-1),H.push(E.x,E.y);let _=Y[3*w+0]*V,C=Y[3*w+1],k=Y[3*w+0]*M;X.push(_,C,k)}}for(let F=0;F<Q;F++)for(let I=0;I<J.length-1;I++){let V=I+F*J.length,M=V,w=V+J.length,_=V+J.length+1,C=V+1;Z.push(M,w,C),Z.push(_,C,w)}this.setIndex(Z),this.setAttribute("position",new w0(K,3)),this.setAttribute("uv",new w0(H,2)),this.setAttribute("normal",new w0(X,3))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new dQ(J.points,J.segments,J.phiStart,J.phiLength)}}class K6 extends W8{constructor(J=1,Q=0){let $=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],W=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super($,W,J,Q);this.type="OctahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new K6(J.radius,J.detail)}}class L7 extends u0{constructor(J=1,Q=1,$=1,W=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:Q,widthSegments:$,heightSegments:W};let Z=J/2,K=Q/2,H=Math.floor($),Y=Math.floor(W),X=H+1,U=Y+1,N=J/H,E=Q/Y,G=[],q=[],O=[],R=[];for(let D=0;D<U;D++){let F=D*E-K;for(let I=0;I<X;I++){let V=I*N-Z;q.push(V,-F,0),O.push(0,0,1),R.push(I/H),R.push(1-D/Y)}}for(let D=0;D<Y;D++)for(let F=0;F<H;F++){let I=F+X*D,V=F+X*(D+1),M=F+1+X*(D+1),w=F+1+X*D;G.push(I,V,w),G.push(V,M,w)}this.setIndex(G),this.setAttribute("position",new w0(q,3)),this.setAttribute("normal",new w0(O,3)),this.setAttribute("uv",new w0(R,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new L7(J.width,J.height,J.widthSegments,J.heightSegments)}}class lQ extends u0{constructor(J=0.5,Q=1,$=32,W=1,Z=0,K=Math.PI*2){super();this.type="RingGeometry",this.parameters={innerRadius:J,outerRadius:Q,thetaSegments:$,phiSegments:W,thetaStart:Z,thetaLength:K},$=Math.max(3,$),W=Math.max(1,W);let H=[],Y=[],X=[],U=[],N=J,E=(Q-J)/W,G=new P,q=new a;for(let O=0;O<=W;O++){for(let R=0;R<=$;R++){let D=Z+R/$*K;G.x=N*Math.cos(D),G.y=N*Math.sin(D),Y.push(G.x,G.y,G.z),X.push(0,0,1),q.x=(G.x/Q+1)/2,q.y=(G.y/Q+1)/2,U.push(q.x,q.y)}N+=E}for(let O=0;O<W;O++){let R=O*($+1);for(let D=0;D<$;D++){let F=D+R,I=F,V=F+$+1,M=F+$+2,w=F+1;H.push(I,V,w),H.push(V,M,w)}}this.setIndex(H),this.setAttribute("position",new w0(Y,3)),this.setAttribute("normal",new w0(X,3)),this.setAttribute("uv",new w0(U,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new lQ(J.innerRadius,J.outerRadius,J.thetaSegments,J.phiSegments,J.thetaStart,J.thetaLength)}}class uQ extends u0{constructor(J=new M7([new a(0,0.5),new a(-0.5,-0.5),new a(0.5,-0.5)]),Q=12){super();this.type="ShapeGeometry",this.parameters={shapes:J,curveSegments:Q};let $=[],W=[],Z=[],K=[],H=0,Y=0;if(Array.isArray(J)===!1)X(J);else for(let U=0;U<J.length;U++)X(J[U]),this.addGroup(H,Y,U),H+=Y,Y=0;this.setIndex($),this.setAttribute("position",new w0(W,3)),this.setAttribute("normal",new w0(Z,3)),this.setAttribute("uv",new w0(K,2));function X(U){let N=W.length/3,E=U.extractPoints(Q),G=E.shape,q=E.holes;if(G9.isClockWise(G)===!1)G=G.reverse();for(let R=0,D=q.length;R<D;R++){let F=q[R];if(G9.isClockWise(F)===!0)q[R]=F.reverse()}let O=G9.triangulateShape(G,q);for(let R=0,D=q.length;R<D;R++){let F=q[R];G=G.concat(F)}for(let R=0,D=G.length;R<D;R++){let F=G[R];W.push(F.x,F.y,0),Z.push(0,0,1),K.push(F.x,F.y)}for(let R=0,D=O.length;R<D;R++){let F=O[R],I=F[0]+N,V=F[1]+N,M=F[2]+N;$.push(I,V,M),Y+=3}}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON(),Q=this.parameters.shapes;return LE(Q,J)}static fromJSON(J,Q){let $=[];for(let W=0,Z=J.shapes.length;W<Z;W++){let K=Q[J.shapes[W]];$.push(K)}return new uQ($,J.curveSegments)}}function LE(J,Q){if(Q.shapes=[],Array.isArray(J))for(let $=0,W=J.length;$<W;$++){let Z=J[$];Q.shapes.push(Z.uuid)}else Q.shapes.push(J.uuid);return Q}class H6 extends u0{constructor(J=1,Q=32,$=16,W=0,Z=Math.PI*2,K=0,H=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:Q,heightSegments:$,phiStart:W,phiLength:Z,thetaStart:K,thetaLength:H},Q=Math.max(3,Math.floor(Q)),$=Math.max(2,Math.floor($));let Y=Math.min(K+H,Math.PI),X=0,U=[],N=new P,E=new P,G=[],q=[],O=[],R=[];for(let D=0;D<=$;D++){let F=[],I=D/$,V=K+I*H,M=J*Math.cos(V),w=Math.sqrt(J*J-M*M),_=0;if(D===0&&K===0)_=0.5/Q;else if(D===$&&Y===Math.PI)_=-0.5/Q;for(let C=0;C<=Q;C++){let k=C/Q,B=W+k*Z;N.x=-w*Math.cos(B),N.y=M,N.z=w*Math.sin(B),q.push(N.x,N.y,N.z),E.copy(N).normalize(),O.push(E.x,E.y,E.z),R.push(k+_,1-I),F.push(X++)}U.push(F)}for(let D=0;D<$;D++)for(let F=0;F<Q;F++){let I=U[D][F+1],V=U[D][F],M=U[D+1][F],w=U[D+1][F+1];if(D!==0||K>0)G.push(I,V,w);if(D!==$-1||Y<Math.PI)G.push(V,M,w)}this.setIndex(G),this.setAttribute("position",new w0(q,3)),this.setAttribute("normal",new w0(O,3)),this.setAttribute("uv",new w0(R,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new H6(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}class cQ extends W8{constructor(J=1,Q=0){let $=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],W=[2,1,0,0,3,2,1,3,0,2,3,1];super($,W,J,Q);this.type="TetrahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new cQ(J.radius,J.detail)}}class nQ extends u0{constructor(J=1,Q=0.4,$=12,W=48,Z=Math.PI*2,K=0,H=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:J,tube:Q,radialSegments:$,tubularSegments:W,arc:Z,thetaStart:K,thetaLength:H},$=Math.floor($),W=Math.floor(W);let Y=[],X=[],U=[],N=[],E=new P,G=new P,q=new P;for(let O=0;O<=$;O++){let R=K+O/$*H;for(let D=0;D<=W;D++){let F=D/W*Z;G.x=(J+Q*Math.cos(R))*Math.cos(F),G.y=(J+Q*Math.cos(R))*Math.sin(F),G.z=Q*Math.sin(R),X.push(G.x,G.y,G.z),E.x=J*Math.cos(F),E.y=J*Math.sin(F),q.subVectors(G,E).normalize(),U.push(q.x,q.y,q.z),N.push(D/W),N.push(O/$)}}for(let O=1;O<=$;O++)for(let R=1;R<=W;R++){let D=(W+1)*O+R-1,F=(W+1)*(O-1)+R-1,I=(W+1)*(O-1)+R,V=(W+1)*O+R;Y.push(D,F,V),Y.push(F,I,V)}this.setIndex(Y),this.setAttribute("position",new w0(X,3)),this.setAttribute("normal",new w0(U,3)),this.setAttribute("uv",new w0(N,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new nQ(J.radius,J.tube,J.radialSegments,J.tubularSegments,J.arc)}}class sQ extends u0{constructor(J=1,Q=0.4,$=64,W=8,Z=2,K=3){super();this.type="TorusKnotGeometry",this.parameters={radius:J,tube:Q,tubularSegments:$,radialSegments:W,p:Z,q:K},$=Math.floor($),W=Math.floor(W);let H=[],Y=[],X=[],U=[],N=new P,E=new P,G=new P,q=new P,O=new P,R=new P,D=new P;for(let I=0;I<=$;++I){let V=I/$*Z*Math.PI*2;F(V,Z,K,J,G),F(V+0.01,Z,K,J,q),R.subVectors(q,G),D.addVectors(q,G),O.crossVectors(R,D),D.crossVectors(O,R),O.normalize(),D.normalize();for(let M=0;M<=W;++M){let w=M/W*Math.PI*2,_=-Q*Math.cos(w),C=Q*Math.sin(w);N.x=G.x+(_*D.x+C*O.x),N.y=G.y+(_*D.y+C*O.y),N.z=G.z+(_*D.z+C*O.z),Y.push(N.x,N.y,N.z),E.subVectors(N,G).normalize(),X.push(E.x,E.y,E.z),U.push(I/$),U.push(M/W)}}for(let I=1;I<=$;I++)for(let V=1;V<=W;V++){let M=(W+1)*(I-1)+(V-1),w=(W+1)*I+(V-1),_=(W+1)*I+V,C=(W+1)*(I-1)+V;H.push(M,w,C),H.push(w,_,C)}this.setIndex(H),this.setAttribute("position",new w0(Y,3)),this.setAttribute("normal",new w0(X,3)),this.setAttribute("uv",new w0(U,2));function F(I,V,M,w,_){let C=Math.cos(I),k=Math.sin(I),B=M/V*I,f=Math.cos(B);_.x=w*(2+f)*0.5*C,_.y=w*(2+f)*k*0.5,_.z=w*Math.sin(B)*0.5}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new sQ(J.radius,J.tube,J.tubularSegments,J.radialSegments,J.p,J.q)}}class iQ extends u0{constructor(J=new xQ(new P(-1,-1,0),new P(-1,1,0),new P(1,1,0)),Q=64,$=1,W=8,Z=!1){super();this.type="TubeGeometry",this.parameters={path:J,tubularSegments:Q,radius:$,radialSegments:W,closed:Z};let K=J.computeFrenetFrames(Q,Z);this.tangents=K.tangents,this.normals=K.normals,this.binormals=K.binormals;let H=new P,Y=new P,X=new a,U=new P,N=[],E=[],G=[],q=[];O(),this.setIndex(q),this.setAttribute("position",new w0(N,3)),this.setAttribute("normal",new w0(E,3)),this.setAttribute("uv",new w0(G,2));function O(){for(let I=0;I<Q;I++)R(I);R(Z===!1?Q:0),F(),D()}function R(I){U=J.getPointAt(I/Q,U);let V=K.normals[I],M=K.binormals[I];for(let w=0;w<=W;w++){let _=w/W*Math.PI*2,C=Math.sin(_),k=-Math.cos(_);Y.x=k*V.x+C*M.x,Y.y=k*V.y+C*M.y,Y.z=k*V.z+C*M.z,Y.normalize(),E.push(Y.x,Y.y,Y.z),H.x=U.x+$*Y.x,H.y=U.y+$*Y.y,H.z=U.z+$*Y.z,N.push(H.x,H.y,H.z)}}function D(){for(let I=1;I<=Q;I++)for(let V=1;V<=W;V++){let M=(W+1)*(I-1)+(V-1),w=(W+1)*I+(V-1),_=(W+1)*I+V,C=(W+1)*(I-1)+V;q.push(M,w,C),q.push(w,_,C)}}function F(){for(let I=0;I<=Q;I++)for(let V=0;V<=W;V++)X.x=I/Q,X.y=V/W,G.push(X.x,X.y)}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON();return J.path=this.parameters.path.toJSON(),J}static fromJSON(J){return new iQ(new YQ[J.path.type]().fromJSON(J.path),J.tubularSegments,J.radius,J.radialSegments,J.closed)}}class VZ extends u0{constructor(J=null){super();if(this.type="WireframeGeometry",this.parameters={geometry:J},J!==null){let Q=[],$=new Set,W=new P,Z=new P;if(J.index!==null){let K=J.attributes.position,H=J.index,Y=J.groups;if(Y.length===0)Y=[{start:0,count:H.count,materialIndex:0}];for(let X=0,U=Y.length;X<U;++X){let N=Y[X],E=N.start,G=N.count;for(let q=E,O=E+G;q<O;q+=3)for(let R=0;R<3;R++){let D=H.getX(q+R),F=H.getX(q+(R+1)%3);if(W.fromBufferAttribute(K,D),Z.fromBufferAttribute(K,F),HH(W,Z,$)===!0)Q.push(W.x,W.y,W.z),Q.push(Z.x,Z.y,Z.z)}}}else{let K=J.attributes.position;for(let H=0,Y=K.count/3;H<Y;H++)for(let X=0;X<3;X++){let U=3*H+X,N=3*H+(X+1)%3;if(W.fromBufferAttribute(K,U),Z.fromBufferAttribute(K,N),HH(W,Z,$)===!0)Q.push(W.x,W.y,W.z),Q.push(Z.x,Z.y,Z.z)}}this.setAttribute("position",new w0(Q,3))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}}function HH(J,Q,$){let W=`${J.x},${J.y},${J.z}-${Q.x},${Q.y},${Q.z}`,Z=`${Q.x},${Q.y},${Q.z}-${J.x},${J.y},${J.z}`;if($.has(W)===!0||$.has(Z)===!0)return!1;else return $.add(W),$.add(Z),!0}var YH=Object.freeze({__proto__:null,BoxGeometry:v8,CapsuleGeometry:jQ,CircleGeometry:yQ,ConeGeometry:W6,CylinderGeometry:$6,DodecahedronGeometry:vQ,EdgesGeometry:FZ,ExtrudeGeometry:pQ,IcosahedronGeometry:mQ,LatheGeometry:dQ,OctahedronGeometry:K6,PlaneGeometry:L7,PolyhedronGeometry:W8,RingGeometry:lQ,ShapeGeometry:uQ,SphereGeometry:H6,TetrahedronGeometry:cQ,TorusGeometry:nQ,TorusKnotGeometry:sQ,TubeGeometry:iQ,WireframeGeometry:VZ});class BZ extends jJ{constructor(J){super();this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new B0(0),this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.fog=J.fog,this}}function f8(J){let Q={};for(let $ in J){Q[$]={};for(let W in J[$]){let Z=J[$][W];if(XH(Z))if(Z.isRenderTargetTexture)Y0("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),Q[$][W]=null;else Q[$][W]=Z.clone();else if(Array.isArray(Z))if(XH(Z[0])){let K=[];for(let H=0,Y=Z.length;H<Y;H++)K[H]=Z[H].clone();Q[$][W]=K}else Q[$][W]=Z.slice();else Q[$][W]=Z}}return Q}function pJ(J){let Q={};for(let $=0;$<J.length;$++){let W=f8(J[$]);for(let Z in W)Q[Z]=W[Z]}return Q}function XH(J){return J&&(J.isColor||J.isMatrix3||J.isMatrix4||J.isVector2||J.isVector3||J.isVector4||J.isTexture||J.isQuaternion)}function VE(J){let Q=[];for(let $=0;$<J.length;$++)Q.push(J[$].clone());return Q}function zZ(J){let Q=J.getRenderTarget();if(Q===null)return J.outputColorSpace;if(Q.isXRRenderTarget===!0)return Q.texture.colorSpace;return JJ.workingColorSpace}var $X={clone:f8,merge:pJ},BE=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,zE=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Q9 extends jJ{constructor(J){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=BE,this.fragmentShader=zE,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=f8(J.uniforms),this.uniformsGroups=VE(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this.defaultAttributeValues=Object.assign({},J.defaultAttributeValues),this.index0AttributeName=J.index0AttributeName,this.uniformsNeedUpdate=J.uniformsNeedUpdate,this}toJSON(J){let Q=super.toJSON(J);Q.glslVersion=this.glslVersion,Q.uniforms={};for(let W in this.uniforms){let K=this.uniforms[W].value;if(K&&K.isTexture)Q.uniforms[W]={type:"t",value:K.toJSON(J).uuid};else if(K&&K.isColor)Q.uniforms[W]={type:"c",value:K.getHex()};else if(K&&K.isVector2)Q.uniforms[W]={type:"v2",value:K.toArray()};else if(K&&K.isVector3)Q.uniforms[W]={type:"v3",value:K.toArray()};else if(K&&K.isVector4)Q.uniforms[W]={type:"v4",value:K.toArray()};else if(K&&K.isMatrix3)Q.uniforms[W]={type:"m3",value:K.toArray()};else if(K&&K.isMatrix4)Q.uniforms[W]={type:"m4",value:K.toArray()};else Q.uniforms[W]={value:K}}if(Object.keys(this.defines).length>0)Q.defines=this.defines;Q.vertexShader=this.vertexShader,Q.fragmentShader=this.fragmentShader,Q.lights=this.lights,Q.clipping=this.clipping;let $={};for(let W in this.extensions)if(this.extensions[W]===!0)$[W]=!0;if(Object.keys($).length>0)Q.extensions=$;return Q}fromJSON(J,Q){if(super.fromJSON(J,Q),J.uniforms!==void 0)for(let $ in J.uniforms){let W=J.uniforms[$];switch(this.uniforms[$]={},W.type){case"t":this.uniforms[$].value=Q[W.value]||null;break;case"c":this.uniforms[$].value=new B0().setHex(W.value);break;case"v2":this.uniforms[$].value=new a().fromArray(W.value);break;case"v3":this.uniforms[$].value=new P().fromArray(W.value);break;case"v4":this.uniforms[$].value=new XJ().fromArray(W.value);break;case"m3":this.uniforms[$].value=new l0().fromArray(W.value);break;case"m4":this.uniforms[$].value=new p0().fromArray(W.value);break;default:this.uniforms[$].value=W.value}}if(J.defines!==void 0)this.defines=J.defines;if(J.vertexShader!==void 0)this.vertexShader=J.vertexShader;if(J.fragmentShader!==void 0)this.fragmentShader=J.fragmentShader;if(J.glslVersion!==void 0)this.glslVersion=J.glslVersion;if(J.extensions!==void 0)for(let $ in J.extensions)this.extensions[$]=J.extensions[$];if(J.lights!==void 0)this.lights=J.lights;if(J.clipping!==void 0)this.clipping=J.clipping;return this}}class oQ extends Q9{constructor(J){super(J);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class aQ extends jJ{constructor(J){super();this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new B0(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new B0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new a(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={STANDARD:""},this.color.copy(J.color),this.roughness=J.roughness,this.metalness=J.metalness,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.roughnessMap=J.roughnessMap,this.metalnessMap=J.metalnessMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.envMapIntensity=J.envMapIntensity,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class IZ extends aQ{constructor(J){super();this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new a(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return g0(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(Q){this.ior=(1+0.4*Q)/(1-0.4*Q)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new B0(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new B0(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new B0(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(J)}get anisotropy(){return this._anisotropy}set anisotropy(J){if(this._anisotropy>0!==J>0)this.version++;this._anisotropy=J}get clearcoat(){return this._clearcoat}set clearcoat(J){if(this._clearcoat>0!==J>0)this.version++;this._clearcoat=J}get iridescence(){return this._iridescence}set iridescence(J){if(this._iridescence>0!==J>0)this.version++;this._iridescence=J}get dispersion(){return this._dispersion}set dispersion(J){if(this._dispersion>0!==J>0)this.version++;this._dispersion=J}get sheen(){return this._sheen}set sheen(J){if(this._sheen>0!==J>0)this.version++;this._sheen=J}get transmission(){return this._transmission}set transmission(J){if(this._transmission>0!==J>0)this.version++;this._transmission=J}copy(J){return super.copy(J),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=J.anisotropy,this.anisotropyRotation=J.anisotropyRotation,this.anisotropyMap=J.anisotropyMap,this.clearcoat=J.clearcoat,this.clearcoatMap=J.clearcoatMap,this.clearcoatRoughness=J.clearcoatRoughness,this.clearcoatRoughnessMap=J.clearcoatRoughnessMap,this.clearcoatNormalMap=J.clearcoatNormalMap,this.clearcoatNormalScale.copy(J.clearcoatNormalScale),this.dispersion=J.dispersion,this.ior=J.ior,this.iridescence=J.iridescence,this.iridescenceMap=J.iridescenceMap,this.iridescenceIOR=J.iridescenceIOR,this.iridescenceThicknessRange=[...J.iridescenceThicknessRange],this.iridescenceThicknessMap=J.iridescenceThicknessMap,this.sheen=J.sheen,this.sheenColor.copy(J.sheenColor),this.sheenColorMap=J.sheenColorMap,this.sheenRoughness=J.sheenRoughness,this.sheenRoughnessMap=J.sheenRoughnessMap,this.transmission=J.transmission,this.transmissionMap=J.transmissionMap,this.thickness=J.thickness,this.thicknessMap=J.thicknessMap,this.attenuationDistance=J.attenuationDistance,this.attenuationColor.copy(J.attenuationColor),this.specularIntensity=J.specularIntensity,this.specularIntensityMap=J.specularIntensityMap,this.specularColor.copy(J.specularColor),this.specularColorMap=J.specularColorMap,this}}class AZ extends jJ{constructor(J){super();this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new B0(16777215),this.specular=new B0(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new B0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new a(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.specular.copy(J.specular),this.shininess=J.shininess,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.envMapIntensity=J.envMapIntensity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class wZ extends jJ{constructor(J){super();this.isMeshToonMaterial=!0,this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new B0(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new B0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new a(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.gradientMap=J.gradientMap,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.alphaMap=J.alphaMap,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}class _Z extends jJ{constructor(J){super();this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new a(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(J)}copy(J){return super.copy(J),this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.flatShading=J.flatShading,this}}class CZ extends jJ{constructor(J){super();this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new B0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new B0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new a(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new N9,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.envMapIntensity=J.envMapIntensity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class rQ extends jJ{constructor(J){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class tQ extends jJ{constructor(J){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}class PZ extends jJ{constructor(J){super();this.isMeshMatcapMaterial=!0,this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new B0(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new a(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={MATCAP:""},this.color.copy(J.color),this.matcap=J.matcap,this.map=J.map,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.alphaMap=J.alphaMap,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.flatShading=J.flatShading,this.fog=J.fog,this}}class TZ extends gJ{constructor(J){super();this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(J)}copy(J){return super.copy(J),this.scale=J.scale,this.dashSize=J.dashSize,this.gapSize=J.gapSize,this}}function V8(J,Q){if(!J||J.constructor===Q)return J;if(typeof Q.BYTES_PER_ELEMENT==="number")return new Q(J);return Array.prototype.slice.call(J)}function WX(J){function Q(Z,K){return J[Z]-J[K]}let $=J.length,W=Array($);for(let Z=0;Z!==$;++Z)W[Z]=Z;return W.sort(Q),W}function QW(J,Q,$){let W=J.length,Z=new J.constructor(W);for(let K=0,H=0;H!==W;++K){let Y=$[K]*Q;for(let X=0;X!==Q;++X)Z[H++]=J[Y+X]}return Z}function ZX(J,Q,$,W){let Z=1,K=J[0];while(K!==void 0&&K[W]===void 0)K=J[Z++];if(K===void 0)return;let H=K[W];if(H===void 0)return;if(Array.isArray(H))do{if(H=K[W],H!==void 0)Q.push(K.time),$.push(...H);K=J[Z++]}while(K!==void 0);else if(H.toArray!==void 0)do{if(H=K[W],H!==void 0)Q.push(K.time),H.toArray($,$.length);K=J[Z++]}while(K!==void 0);else do{if(H=K[W],H!==void 0)Q.push(K.time),$.push(H);K=J[Z++]}while(K!==void 0)}function IE(J,Q,$,W,Z=30){let K=J.clone();K.name=Q;let H=[];for(let X=0;X<K.tracks.length;++X){let U=K.tracks[X],N=U.getValueSize(),E=[],G=[];for(let q=0;q<U.times.length;++q){let O=U.times[q]*Z;if(O<$||O>=W)continue;E.push(U.times[q]);for(let R=0;R<N;++R)G.push(U.values[q*N+R])}if(E.length===0)continue;U.times=V8(E,U.times.constructor),U.values=V8(G,U.values.constructor),H.push(U)}K.tracks=H;let Y=1/0;for(let X=0;X<K.tracks.length;++X)if(Y>K.tracks[X].times[0])Y=K.tracks[X].times[0];for(let X=0;X<K.tracks.length;++X)K.tracks[X].shift(-1*Y);return K.resetDuration(),K}function AE(J,Q=0,$=J,W=30){if(W<=0)W=30;let Z=$.tracks.length,K=Q/W;for(let H=0;H<Z;++H){let Y=$.tracks[H],X=Y.ValueTypeName;if(X==="bool"||X==="string")continue;let U=J.tracks.find(function(F){return F.name===Y.name&&F.ValueTypeName===X});if(U===void 0)continue;let N=0,E=Y.getValueSize();if(Y.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)N=E/3;let G=0,q=U.getValueSize();if(U.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)G=q/3;let O=Y.times.length-1,R;if(K<=Y.times[0]){let F=N,I=E-N;R=Y.values.slice(F,I)}else if(K>=Y.times[O]){let F=O*E+N,I=F+E-N;R=Y.values.slice(F,I)}else{let F=Y.createInterpolant(),I=N,V=E-N;F.evaluate(K),R=F.resultBuffer.slice(I,V)}if(X==="quaternion")new xJ().fromArray(R).normalize().conjugate().toArray(R);let D=U.times.length;for(let F=0;F<D;++F){let I=F*q+G;if(X==="quaternion")xJ.multiplyQuaternionsFlat(U.values,I,R,0,U.values,I);else{let V=q-G*2;for(let M=0;M<V;++M)U.values[I+M]-=R[M]}}}return J.blendMode=2501,J}class KX{static convertArray(J,Q){return V8(J,Q)}static isTypedArray(J){return CY(J)}static getKeyframeOrder(J){return WX(J)}static sortedArray(J,Q,$){return QW(J,Q,$)}static flattenJSON(J,Q,$,W){ZX(J,Q,$,W)}static subclip(J,Q,$,W,Z=30){return IE(J,Q,$,W,Z)}static makeClipAdditive(J,Q=0,$=J,W=30){return AE(J,Q,$,W)}}class b8{constructor(J,Q,$,W){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=W!==void 0?W:new Q.constructor($),this.sampleValues=Q,this.valueSize=$,this.settings=null,this.DefaultSettings_={}}evaluate(J){let Q=this.parameterPositions,$=this._cachedIndex,W=Q[$],Z=Q[$-1];J:{Q:{let K;$:{W:if(!(J<W)){for(let H=$+2;;){if(W===void 0){if(J<Z)break W;return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}if($===H)break;if(Z=W,W=Q[++$],J<W)break Q}K=Q.length;break $}if(!(J>=Z)){let H=Q[1];if(J<H)$=2,Z=H;for(let Y=$-2;;){if(Z===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if($===Y)break;if(W=Z,Z=Q[--$-1],J>=Z)break Q}K=$,$=0;break $}break J}while($<K){let H=$+K>>>1;if(J<Q[H])K=H;else $=H+1}if(W=Q[$],Z=Q[$-1],Z===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(W===void 0)return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}this._cachedIndex=$,this.intervalChanged_($,Z,W)}return this.interpolate_($,Z,J,W)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let Q=this.resultBuffer,$=this.sampleValues,W=this.valueSize,Z=J*W;for(let K=0;K!==W;++K)Q[K]=$[Z+K];return Q}interpolate_(){throw Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class SZ extends b8{constructor(J,Q,$,W){super(J,Q,$,W);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,Q,$){let W=this.parameterPositions,Z=J-2,K=J+1,H=W[Z],Y=W[K];if(H===void 0)switch(this.getSettings_().endingStart){case 2401:Z=J,H=2*Q-$;break;case 2402:Z=W.length-2,H=Q+W[Z]-W[Z+1];break;default:Z=J,H=$}if(Y===void 0)switch(this.getSettings_().endingEnd){case 2401:K=J,Y=2*$-Q;break;case 2402:K=1,Y=$+W[1]-W[0];break;default:K=J-1,Y=Q}let X=($-Q)*0.5,U=this.valueSize;this._weightPrev=X/(Q-H),this._weightNext=X/(Y-$),this._offsetPrev=Z*U,this._offsetNext=K*U}interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this._offsetPrev,N=this._offsetNext,E=this._weightPrev,G=this._weightNext,q=($-Q)/(W-Q),O=q*q,R=O*q,D=-E*R+2*E*O-E*q,F=(1+E)*R+(-1.5-2*E)*O+(-0.5+E)*q+1,I=(-1-G)*R+(1.5+G)*O+0.5*q,V=G*R-G*O;for(let M=0;M!==H;++M)Z[M]=D*K[U+M]+F*K[X+M]+I*K[Y+M]+V*K[N+M];return Z}}class eQ extends b8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=($-Q)/(W-Q),N=1-U;for(let E=0;E!==H;++E)Z[E]=K[X+E]*N+K[Y+E]*U;return Z}}class jZ extends b8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J){return this.copySampleValue_(J-1)}}class yZ extends b8{interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this.inTangents,N=this.outTangents;if(!U||!N){let q=($-Q)/(W-Q),O=1-q;for(let R=0;R!==H;++R)Z[R]=K[X+R]*O+K[Y+R]*q;return Z}let E=H*2,G=J-1;for(let q=0;q!==H;++q){let O=K[X+q],R=K[Y+q],D=G*E+q*2,F=N[D],I=N[D+1],V=J*E+q*2,M=U[V],w=U[V+1],_=($-Q)/(W-Q),C,k,B,f,T;for(let p=0;p<8;p++){C=_*_,k=C*_,B=1-_,f=B*B,T=f*B;let b=T*Q+3*f*_*F+3*B*C*M+k*W-$;if(Math.abs(b)<0.0000000001)break;let u=3*f*(F-Q)+6*B*_*(M-F)+3*C*(W-M);if(Math.abs(u)<0.0000000001)break;_=_-b/u,_=Math.max(0,Math.min(1,_))}Z[q]=T*O+3*f*_*I+3*B*C*w+k*R}return Z}}class $9{constructor(J,Q,$,W){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(Q===void 0||Q.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=V8(Q,this.TimeBufferType),this.values=V8($,this.ValueBufferType),this.setInterpolation(W||this.DefaultInterpolation)}static toJSON(J){let Q=J.constructor,$;if(Q.toJSON!==this.toJSON)$=Q.toJSON(J);else{$={name:J.name,times:V8(J.times,Array),values:V8(J.values,Array)};let W=J.getInterpolation();if(W!==J.DefaultInterpolation)$.interpolation=W}return $.type=J.ValueTypeName,$}InterpolantFactoryMethodDiscrete(J){return new jZ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new eQ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new SZ(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodBezier(J){let Q=new yZ(this.times,this.values,this.getValueSize(),J);if(this.settings)Q.inTangents=this.settings.inTangents,Q.outTangents=this.settings.outTangents;return Q}setInterpolation(J){let Q;switch(J){case 2300:Q=this.InterpolantFactoryMethodDiscrete;break;case 2301:Q=this.InterpolantFactoryMethodLinear;break;case 2302:Q=this.InterpolantFactoryMethodSmooth;break;case 2303:Q=this.InterpolantFactoryMethodBezier;break}if(Q===void 0){let $="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error($);return Y0("KeyframeTrack:",$),this}return this.createInterpolant=Q,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let Q=this.times;for(let $=0,W=Q.length;$!==W;++$)Q[$]+=J}return this}scale(J){if(J!==1){let Q=this.times;for(let $=0,W=Q.length;$!==W;++$)Q[$]*=J}return this}trim(J,Q){let $=this.times,W=$.length,Z=0,K=W-1;while(Z!==W&&$[Z]<J)++Z;while(K!==-1&&$[K]>Q)--K;if(++K,Z!==0||K!==W){if(Z>=K)K=Math.max(K,1),Z=K-1;let H=this.getValueSize();this.times=$.slice(Z,K),this.values=this.values.slice(Z*H,K*H)}return this}validate(){let J=!0,Q=this.getValueSize();if(Q-Math.floor(Q)!==0)T0("KeyframeTrack: Invalid value size in track.",this),J=!1;let $=this.times,W=this.values,Z=$.length;if(Z===0)T0("KeyframeTrack: Track is empty.",this),J=!1;let K=null;for(let H=0;H!==Z;H++){let Y=$[H];if(typeof Y==="number"&&isNaN(Y)){T0("KeyframeTrack: Time is not a valid number.",this,H,Y),J=!1;break}if(K!==null&&K>Y){T0("KeyframeTrack: Out of order keys.",this,H,Y,K),J=!1;break}K=Y}if(W!==void 0){if(CY(W))for(let H=0,Y=W.length;H!==Y;++H){let X=W[H];if(isNaN(X)){T0("KeyframeTrack: Value is not a valid number.",this,H,X),J=!1;break}}}return J}optimize(){let J=this.times.slice(),Q=this.values.slice(),$=this.getValueSize(),W=this.getInterpolation()===2302,Z=J.length-1,K=1;for(let H=1;H<Z;++H){let Y=!1,X=J[H],U=J[H+1];if(X!==U&&(H!==1||X!==J[0]))if(!W){let N=H*$,E=N-$,G=N+$;for(let q=0;q!==$;++q){let O=Q[N+q];if(O!==Q[E+q]||O!==Q[G+q]){Y=!0;break}}}else Y=!0;if(Y){if(H!==K){J[K]=J[H];let N=H*$,E=K*$;for(let G=0;G!==$;++G)Q[E+G]=Q[N+G]}++K}}if(Z>0){J[K]=J[Z];for(let H=Z*$,Y=K*$,X=0;X!==$;++X)Q[Y+X]=Q[H+X];++K}if(K!==J.length)this.times=J.slice(0,K),this.values=Q.slice(0,K*$);else this.times=J,this.values=Q;return this}clone(){let J=this.times.slice(),Q=this.values.slice(),W=new this.constructor(this.name,J,Q);return W.createInterpolant=this.createInterpolant,W}}$9.prototype.ValueTypeName="";$9.prototype.TimeBufferType=Float32Array;$9.prototype.ValueBufferType=Float32Array;$9.prototype.DefaultInterpolation=2301;class Z8 extends $9{constructor(J,Q,$){super(J,Q,$)}}Z8.prototype.ValueTypeName="bool";Z8.prototype.ValueBufferType=Array;Z8.prototype.DefaultInterpolation=2300;Z8.prototype.InterpolantFactoryMethodLinear=void 0;Z8.prototype.InterpolantFactoryMethodSmooth=void 0;class J$ extends $9{constructor(J,Q,$,W){super(J,Q,$,W)}}J$.prototype.ValueTypeName="color";class Y6 extends $9{constructor(J,Q,$,W){super(J,Q,$,W)}}Y6.prototype.ValueTypeName="number";class vZ extends b8{constructor(J,Q,$,W){super(J,Q,$,W)}interpolate_(J,Q,$,W){let Z=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=($-Q)/(W-Q),X=J*H;for(let U=X+H;X!==U;X+=4)xJ.slerpFlat(Z,0,K,X-H,K,X,Y);return Z}}class X6 extends $9{constructor(J,Q,$,W){super(J,Q,$,W)}InterpolantFactoryMethodLinear(J){return new vZ(this.times,this.values,this.getValueSize(),J)}}X6.prototype.ValueTypeName="quaternion";X6.prototype.InterpolantFactoryMethodSmooth=void 0;class K8 extends $9{constructor(J,Q,$){super(J,Q,$)}}K8.prototype.ValueTypeName="string";K8.prototype.ValueBufferType=Array;K8.prototype.DefaultInterpolation=2300;K8.prototype.InterpolantFactoryMethodLinear=void 0;K8.prototype.InterpolantFactoryMethodSmooth=void 0;class Q$ extends $9{constructor(J,Q,$,W){super(J,Q,$,W)}}Q$.prototype.ValueTypeName="vector";class N7{constructor(J="",Q=-1,$=[],W=2500){if(this.name=J,this.tracks=$,this.duration=Q,this.blendMode=W,this.uuid=eJ(),this.userData={},this.duration<0)this.resetDuration()}static parse(J){let Q=[],$=J.tracks,W=1/(J.fps||1);for(let K=0,H=$.length;K!==H;++K)Q.push(_E($[K]).scale(W));let Z=new this(J.name,J.duration,Q,J.blendMode);return Z.uuid=J.uuid,Z.userData=JSON.parse(J.userData||"{}"),Z}static toJSON(J){let Q=[],$=J.tracks,W={name:J.name,duration:J.duration,tracks:Q,uuid:J.uuid,blendMode:J.blendMode,userData:JSON.stringify(J.userData)};for(let Z=0,K=$.length;Z!==K;++Z)Q.push($9.toJSON($[Z]));return W}static CreateFromMorphTargetSequence(J,Q,$,W){let Z=Q.length,K=[];for(let H=0;H<Z;H++){let Y=[],X=[];Y.push((H+Z-1)%Z,H,(H+1)%Z),X.push(0,1,0);let U=WX(Y);if(Y=QW(Y,1,U),X=QW(X,1,U),!W&&Y[0]===0)Y.push(Z),X.push(X[0]);K.push(new Y6(".morphTargetInfluences["+Q[H].name+"]",Y,X).scale(1/$))}return new this(J,-1,K)}static findByName(J,Q){let $=J;if(!Array.isArray(J)){let W=J;$=W.geometry&&W.geometry.animations||W.animations}for(let W=0;W<$.length;W++)if($[W].name===Q)return $[W];return null}static CreateClipsFromMorphTargetSequences(J,Q,$){let W={},Z=/^([\w-]*?)([\d]+)$/;for(let H=0,Y=J.length;H<Y;H++){let X=J[H],U=X.name.match(Z);if(U&&U.length>1){let N=U[1],E=W[N];if(!E)W[N]=E=[];E.push(X)}}let K=[];for(let H in W)K.push(this.CreateFromMorphTargetSequence(H,W[H],Q,$));return K}resetDuration(){let J=this.tracks,Q=0;for(let $=0,W=J.length;$!==W;++$){let Z=this.tracks[$];Q=Math.max(Q,Z.times[Z.times.length-1])}return this.duration=Q,this}trim(){for(let J=0;J<this.tracks.length;J++)this.tracks[J].trim(0,this.duration);return this}validate(){let J=!0;for(let Q=0;Q<this.tracks.length;Q++)J=J&&this.tracks[Q].validate();return J}optimize(){for(let J=0;J<this.tracks.length;J++)this.tracks[J].optimize();return this}clone(){let J=[];for(let $=0;$<this.tracks.length;$++)J.push(this.tracks[$].clone());let Q=new this.constructor(this.name,this.duration,J,this.blendMode);return Q.userData=JSON.parse(JSON.stringify(this.userData)),Q}toJSON(){return this.constructor.toJSON(this)}}function wE(J){switch(J.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Y6;case"vector":case"vector2":case"vector3":case"vector4":return Q$;case"color":return J$;case"quaternion":return X6;case"bool":case"boolean":return Z8;case"string":return K8}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+J)}function _E(J){if(J.type===void 0)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");let Q=wE(J.type);if(J.times===void 0){let $=[],W=[];ZX(J.keys,$,W,"value"),J.times=$,J.values=W}if(Q.parse!==void 0)return Q.parse(J);else return new Q(J.name,J.times,J.values,J.interpolation)}var k9={enabled:!1,files:{},add:function(J,Q){if(this.enabled===!1)return;if(UH(J))return;this.files[J]=Q},get:function(J){if(this.enabled===!1)return;if(UH(J))return;return this.files[J]},remove:function(J){delete this.files[J]},clear:function(){this.files={}}};function UH(J){try{let Q=J.slice(J.indexOf(":")+1);return new URL(Q).protocol==="blob:"}catch(Q){return!1}}class $${constructor(J,Q,$){let W=this,Z=!1,K=0,H=0,Y=void 0,X=[];this.onStart=void 0,this.onLoad=J,this.onProgress=Q,this.onError=$,this._abortController=null,this.itemStart=function(U){if(H++,Z===!1){if(W.onStart!==void 0)W.onStart(U,K,H)}Z=!0},this.itemEnd=function(U){if(K++,W.onProgress!==void 0)W.onProgress(U,K,H);if(K===H){if(Z=!1,W.onLoad!==void 0)W.onLoad()}},this.itemError=function(U){if(W.onError!==void 0)W.onError(U)},this.resolveURL=function(U){if(U=U.normalize("NFC"),Y)return Y(U);return U},this.setURLModifier=function(U){return Y=U,this},this.addHandler=function(U,N){return X.push(U,N),this},this.removeHandler=function(U){let N=X.indexOf(U);if(N!==-1)X.splice(N,2);return this},this.getHandler=function(U){for(let N=0,E=X.length;N<E;N+=2){let G=X[N],q=X[N+1];if(G.global)G.lastIndex=0;if(G.test(U))return q}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var HX=new $$;class lJ{constructor(J){if(this.manager=J!==void 0?J:HX,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(J,Q){let $=this;return new Promise(function(W,Z){$.load(J,W,Q,Z)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}abort(){return this}}lJ.DEFAULT_MATERIAL_NAME="__DEFAULT";var S9={};class YX extends Error{constructor(J,Q){super(J);this.response=Q}}class M9 extends lJ{constructor(J){super(J);this.mimeType="",this.responseType="",this._abortController=new AbortController}load(J,Q,$,W){if(J===void 0)J="";if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let Z=k9.get(`file:${J}`);if(Z!==void 0){this.manager.itemStart(J),setTimeout(()=>{if(Q)Q(Z);this.manager.itemEnd(J)},0);return}if(S9[J]!==void 0){S9[J].push({onLoad:Q,onProgress:$,onError:W});return}S9[J]=[],S9[J].push({onLoad:Q,onProgress:$,onError:W});let K=new Request(J,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),H=this.mimeType,Y=this.responseType;fetch(K).then((X)=>{if(X.status===200||X.status===0){if(X.status===0)Y0("FileLoader: HTTP Status 0 received.");if(typeof ReadableStream>"u"||X.body===void 0||X.body.getReader===void 0)return X;let U=S9[J],N=X.body.getReader(),E=X.headers.get("X-File-Size")||X.headers.get("Content-Length"),G=E?parseInt(E):0,q=G!==0,O=0,R=new ReadableStream({start(D){F();function F(){N.read().then(({done:I,value:V})=>{if(I)D.close();else{O+=V.byteLength;let M=new ProgressEvent("progress",{lengthComputable:q,loaded:O,total:G});for(let w=0,_=U.length;w<_;w++){let C=U[w];if(C.onProgress)C.onProgress(M)}D.enqueue(V),F()}},(I)=>{D.error(I)})}}});return new Response(R)}else throw new YX(`fetch for "${X.url}" responded with ${X.status}: ${X.statusText}`,X)}).then((X)=>{switch(Y){case"arraybuffer":return X.arrayBuffer();case"blob":return X.blob();case"document":return X.text().then((U)=>{return new DOMParser().parseFromString(U,H)});case"json":return X.json();default:if(H==="")return X.text();else{let N=/charset="?([^;"\s]*)"?/i.exec(H),E=N&&N[1]?N[1].toLowerCase():void 0,G=new TextDecoder(E);return X.arrayBuffer().then((q)=>G.decode(q))}}}).then((X)=>{k9.add(`file:${J}`,X);let U=S9[J];delete S9[J];for(let N=0,E=U.length;N<E;N++){let G=U[N];if(G.onLoad)G.onLoad(X)}}).catch((X)=>{let U=S9[J];if(U===void 0)throw this.manager.itemError(J),X;delete S9[J];for(let N=0,E=U.length;N<E;N++){let G=U[N];if(G.onError)G.onError(X)}this.manager.itemError(J)}).finally(()=>{this.manager.itemEnd(J)}),this.manager.itemStart(J)}setResponseType(J){return this.responseType=J,this}setMimeType(J){return this.mimeType=J,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class XX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=this,K=new M9(this.manager);K.setPath(this.path),K.setRequestHeader(this.requestHeader),K.setWithCredentials(this.withCredentials),K.load(J,function(H){try{Q(Z.parse(JSON.parse(H)))}catch(Y){if(W)W(Y);else T0(Y);Z.manager.itemError(J)}},$,W)}parse(J){let Q=[];for(let $=0;$<J.length;$++){let W=N7.parse(J[$]);Q.push(W)}return Q}}class UX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=this,K=[],H=new Q6,Y=new M9(this.manager);Y.setPath(this.path),Y.setResponseType("arraybuffer"),Y.setRequestHeader(this.requestHeader),Y.setWithCredentials(Z.withCredentials);let X=0;function U(N){Y.load(J[N],function(E){let G=Z.parse(E,!0);if(K[N]={width:G.width,height:G.height,format:G.format,mipmaps:G.mipmaps},X+=1,X===6){if(G.mipmapCount===1)H.minFilter=1006;if(H.image=K,H.format=G.format,H.needsUpdate=!0,Q)Q(H)}},$,W)}if(Array.isArray(J))for(let N=0,E=J.length;N<E;++N)U(N);else Y.load(J,function(N){let E=Z.parse(N,!0);if(E.isCubemap){let G=E.mipmaps.length/E.mipmapCount;for(let q=0;q<G;q++){K[q]={mipmaps:[]};for(let O=0;O<E.mipmapCount;O++)K[q].mipmaps.push(E.mipmaps[q*E.mipmapCount+O]),K[q].format=E.format,K[q].width=E.width,K[q].height=E.height}H.image=K}else H.image.width=E.width,H.image.height=E.height,H.mipmaps=E.mipmaps;if(E.mipmapCount===1)H.minFilter=1006;if(H.format=E.format,H.needsUpdate=!0,Q)Q(H)},$,W);return H}}var Q7=new WeakMap;class E7 extends lJ{constructor(J){super(J)}load(J,Q,$,W){if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let Z=this,K=k9.get(`image:${J}`);if(K!==void 0){if(K.complete===!0)Z.manager.itemStart(J),setTimeout(function(){if(Q)Q(K);Z.manager.itemEnd(J)},0);else{let N=Q7.get(K);if(N===void 0)N=[],Q7.set(K,N);N.push({onLoad:Q,onError:W})}return K}let H=X7("img");function Y(){if(U(),Q)Q(this);let N=Q7.get(this)||[];for(let E=0;E<N.length;E++){let G=N[E];if(G.onLoad)G.onLoad(this)}Q7.delete(this),Z.manager.itemEnd(J)}function X(N){if(U(),W)W(N);k9.remove(`image:${J}`);let E=Q7.get(this)||[];for(let G=0;G<E.length;G++){let q=E[G];if(q.onError)q.onError(N)}Q7.delete(this),Z.manager.itemError(J),Z.manager.itemEnd(J)}function U(){H.removeEventListener("load",Y,!1),H.removeEventListener("error",X,!1)}if(H.addEventListener("load",Y,!1),H.addEventListener("error",X,!1),J.slice(0,5)!=="data:"){if(this.crossOrigin!==void 0)H.crossOrigin=this.crossOrigin}return k9.add(`image:${J}`,H),Z.manager.itemStart(J),H.src=J,H}}class GX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=new k7;Z.colorSpace="srgb";let K=new E7(this.manager);K.setCrossOrigin(this.crossOrigin),K.setPath(this.path);let H=0;function Y(X){K.load(J[X],function(U){if(Z.images[X]=U,H++,H===6){if(Z.needsUpdate=!0,Q)Q(Z)}},void 0,W)}for(let X=0;X<J.length;++X)Y(X);return Z}}class NX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=this,K=new J9,H=new M9(this.manager);return H.setResponseType("arraybuffer"),H.setRequestHeader(this.requestHeader),H.setPath(this.path),H.setWithCredentials(Z.withCredentials),H.load(J,function(Y){let X;try{X=Z.parse(Y)}catch(U){if(W!==void 0)W(U);else T0(U);return}if(Z._applyTexData(K,X),Q)Q(K,X)},$,W),K}createDataTexture(J){let Q=new J9;return this._applyTexData(Q,this.parse(J)),Q}_applyTexData(J,Q){if(Q.image!==void 0)J.image=Q.image;else if(Q.data!==void 0)J.image.width=Q.width,J.image.height=Q.height,J.image.data=Q.data;if(J.wrapS=Q.wrapS!==void 0?Q.wrapS:1001,J.wrapT=Q.wrapT!==void 0?Q.wrapT:1001,J.magFilter=Q.magFilter!==void 0?Q.magFilter:1006,J.minFilter=Q.minFilter!==void 0?Q.minFilter:1006,J.anisotropy=Q.anisotropy!==void 0?Q.anisotropy:1,Q.colorSpace!==void 0)J.colorSpace=Q.colorSpace;if(Q.flipY!==void 0)J.flipY=Q.flipY;if(Q.format!==void 0)J.format=Q.format;if(Q.type!==void 0)J.type=Q.type;if(Q.mipmaps!==void 0)J.mipmaps=Q.mipmaps,J.minFilter=1008;if(Q.mipmapCount===1)J.minFilter=1006;if(Q.generateMipmaps!==void 0)J.generateMipmaps=Q.generateMipmaps;J.needsUpdate=!0}}class EX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=new kJ,K=new E7(this.manager);return K.setCrossOrigin(this.crossOrigin),K.setPath(this.path),K.load(J,function(H){if(Z.image=H,Z.needsUpdate=!0,Q!==void 0)Q(Z)},$,W),Z}}class p9 extends ZJ{constructor(J,Q=1){super();this.isLight=!0,this.type="Light",this.color=new B0(J),this.intensity=Q}dispose(){this.dispatchEvent({type:"dispose"})}copy(J,Q){return super.copy(J,Q),this.color.copy(J.color),this.intensity=J.intensity,this}toJSON(J){let Q=super.toJSON(J);return Q.object.color=this.color.getHex(),Q.object.intensity=this.intensity,Q}}class fZ extends p9{constructor(J,Q,$){super(J,$);this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ZJ.DEFAULT_UP),this.updateMatrix(),this.groundColor=new B0(Q)}copy(J,Q){return super.copy(J,Q),this.groundColor.copy(J.groundColor),this}toJSON(J){let Q=super.toJSON(J);return Q.object.groundColor=this.groundColor.getHex(),Q}}var c$=new p0,GH=new P,NH=new P;class W${constructor(J){this.camera=J,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new a(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new p0,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new e9,this._frameExtents=new a(1,1),this._viewportCount=1,this._viewports=[new XJ(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(J){let Q=this.camera,$=this.matrix;if(GH.setFromMatrixPosition(J.matrixWorld),Q.position.copy(GH),NH.setFromMatrixPosition(J.target.matrixWorld),Q.lookAt(NH),Q.updateMatrixWorld(),c$.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),this._frustum.setFromProjectionMatrix(c$,Q.coordinateSystem,Q.reversedDepth),Q.coordinateSystem===2001||Q.reversedDepth)$.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,1,0,0,0,0,1);else $.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1);$.multiply(c$)}getViewport(J){return this._viewports[J]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy(J){return this.camera=J.camera.clone(),this.intensity=J.intensity,this.bias=J.bias,this.radius=J.radius,this.autoUpdate=J.autoUpdate,this.needsUpdate=J.needsUpdate,this.normalBias=J.normalBias,this.blurSamples=J.blurSamples,this.mapSize.copy(J.mapSize),this.biasNode=J.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let J={};if(this.intensity!==1)J.intensity=this.intensity;if(this.bias!==0)J.bias=this.bias;if(this.normalBias!==0)J.normalBias=this.normalBias;if(this.radius!==1)J.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)J.mapSize=this.mapSize.toArray();return J.camera=this.camera.toJSON(!1).object,delete J.camera.matrix,J}}var a6=new P,r6=new xJ,R9=new P;class U6 extends ZJ{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new p0,this.projectionMatrix=new p0,this.projectionMatrixInverse=new p0,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(J,Q){return super.copy(J,Q),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.matrixWorld.decompose(a6,r6,R9),R9.x===1&&R9.y===1&&R9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(a6,r6,R9.set(1,1,1)).invert()}updateWorldMatrix(J,Q,$=!1){if(super.updateWorldMatrix(J,Q,$),this.matrixWorld.decompose(a6,r6,R9),R9.x===1&&R9.y===1&&R9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(a6,r6,R9.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var o9=new P,EH=new a,qH=new a;class TJ extends U6{constructor(J=50,Q=1,$=0.1,W=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=$,this.far=W,this.focus=10,this.aspect=Q,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let Q=0.5*this.getFilmHeight()/J;this.fov=z8*2*Math.atan(Q),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(B8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return z8*2*Math.atan(Math.tan(B8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,Q,$){o9.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(o9.x,o9.y).multiplyScalar(-J/o9.z),o9.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(o9.x,o9.y).multiplyScalar(-J/o9.z)}getViewSize(J,Q){return this.getViewBounds(J,EH,qH),Q.subVectors(qH,EH)}setViewOffset(J,Q,$,W,Z,K){if(this.aspect=J/Q,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=W,this.view.width=Z,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,Q=J*Math.tan(B8*0.5*this.fov)/this.zoom,$=2*Q,W=this.aspect*$,Z=-0.5*W,K=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:Y,fullHeight:X}=K;Z+=K.offsetX*W/Y,Q-=K.offsetY*$/X,W*=K.width/Y,$*=K.height/X}let H=this.filmOffset;if(H!==0)Z+=J*H/this.getFilmWidth();this.projectionMatrix.makePerspective(Z,Z+W,Q,Q-$,J,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.fov=this.fov,Q.object.zoom=this.zoom,Q.object.near=this.near,Q.object.far=this.far,Q.object.focus=this.focus,Q.object.aspect=this.aspect,this.view!==null)Q.object.view=Object.assign({},this.view);return Q.object.filmGauge=this.filmGauge,Q.object.filmOffset=this.filmOffset,Q}}class qX extends W${constructor(){super(new TJ(50,1,0.5,500));this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(J){let Q=this.camera,$=z8*2*J.angle*this.focus,W=this.mapSize.width/this.mapSize.height*this.aspect,Z=J.distance||Q.far;if($!==Q.fov||W!==Q.aspect||Z!==Q.far)Q.fov=$,Q.aspect=W,Q.far=Z,Q.updateProjectionMatrix();super.updateMatrices(J)}copy(J){return super.copy(J),this.focus=J.focus,this}}class bZ extends p9{constructor(J,Q,$=0,W=Math.PI/3,Z=0,K=2){super(J,Q);this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ZJ.DEFAULT_UP),this.updateMatrix(),this.target=new ZJ,this.distance=$,this.angle=W,this.penumbra=Z,this.decay=K,this.map=null,this.shadow=new qX}get power(){return this.intensity*Math.PI}set power(J){this.intensity=J/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(J,Q){return super.copy(J,Q),this.distance=J.distance,this.angle=J.angle,this.penumbra=J.penumbra,this.decay=J.decay,this.target=J.target.clone(),this.map=J.map,this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);if(Q.object.distance=this.distance,Q.object.angle=this.angle,Q.object.decay=this.decay,Q.object.penumbra=this.penumbra,Q.object.target=this.target.uuid,this.map&&this.map.isTexture)Q.object.map=this.map.toJSON(J).uuid;return Q.object.shadow=this.shadow.toJSON(),Q}}class FX extends W${constructor(){super(new TJ(90,1,0.5,500));this.isPointLightShadow=!0}}class hZ extends p9{constructor(J,Q,$=0,W=2){super(J,Q);this.isPointLight=!0,this.type="PointLight",this.distance=$,this.decay=W,this.shadow=new FX}get power(){return this.intensity*4*Math.PI}set power(J){this.intensity=J/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(J,Q){return super.copy(J,Q),this.distance=J.distance,this.decay=J.decay,this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);return Q.object.distance=this.distance,Q.object.decay=this.decay,Q.object.shadow=this.shadow.toJSON(),Q}}class V7 extends U6{constructor(J=-1,Q=1,$=1,W=-1,Z=0.1,K=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=Q,this.top=$,this.bottom=W,this.near=Z,this.far=K,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,Q,$,W,Z,K){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=W,this.view.width=Z,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),Q=(this.top-this.bottom)/(2*this.zoom),$=(this.right+this.left)/2,W=(this.top+this.bottom)/2,Z=$-J,K=$+J,H=W+Q,Y=W-Q;if(this.view!==null&&this.view.enabled){let X=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;Z+=X*this.view.offsetX,K=Z+X*this.view.width,H-=U*this.view.offsetY,Y=H-U*this.view.height}this.projectionMatrix.makeOrthographic(Z,K,H,Y,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.zoom=this.zoom,Q.object.left=this.left,Q.object.right=this.right,Q.object.top=this.top,Q.object.bottom=this.bottom,Q.object.near=this.near,Q.object.far=this.far,this.view!==null)Q.object.view=Object.assign({},this.view);return Q}}class DX extends W${constructor(){super(new V7(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}}class xZ extends p9{constructor(J,Q){super(J,Q);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ZJ.DEFAULT_UP),this.updateMatrix(),this.target=new ZJ,this.shadow=new DX}dispose(){super.dispose(),this.shadow.dispose()}copy(J){return super.copy(J),this.target=J.target.clone(),this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);return Q.object.shadow=this.shadow.toJSON(),Q.object.target=this.target.uuid,Q}}class gZ extends p9{constructor(J,Q){super(J,Q);this.isAmbientLight=!0,this.type="AmbientLight"}}class pZ extends p9{constructor(J,Q,$=10,W=10){super(J,Q);this.isRectAreaLight=!0,this.type="RectAreaLight",this.width=$,this.height=W}get power(){return this.intensity*this.width*this.height*Math.PI}set power(J){this.intensity=J/(this.width*this.height*Math.PI)}copy(J){return super.copy(J),this.width=J.width,this.height=J.height,this}toJSON(J){let Q=super.toJSON(J);return Q.object.width=this.width,Q.object.height=this.height,Q}}class Z${constructor(){this.isSphericalHarmonics3=!0,this.coefficients=[];for(let J=0;J<9;J++)this.coefficients.push(new P)}set(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].copy(J[Q]);return this}zero(){for(let J=0;J<9;J++)this.coefficients[J].set(0,0,0);return this}getAt(J,Q){let{x:$,y:W,z:Z}=J,K=this.coefficients;return Q.copy(K[0]).multiplyScalar(0.282095),Q.addScaledVector(K[1],0.488603*W),Q.addScaledVector(K[2],0.488603*Z),Q.addScaledVector(K[3],0.488603*$),Q.addScaledVector(K[4],1.092548*($*W)),Q.addScaledVector(K[5],1.092548*(W*Z)),Q.addScaledVector(K[6],0.315392*(3*Z*Z-1)),Q.addScaledVector(K[7],1.092548*($*Z)),Q.addScaledVector(K[8],0.546274*($*$-W*W)),Q}getIrradianceAt(J,Q){let{x:$,y:W,z:Z}=J,K=this.coefficients;return Q.copy(K[0]).multiplyScalar(0.886227),Q.addScaledVector(K[1],1.023328*W),Q.addScaledVector(K[2],1.023328*Z),Q.addScaledVector(K[3],1.023328*$),Q.addScaledVector(K[4],0.858086*$*W),Q.addScaledVector(K[5],0.858086*W*Z),Q.addScaledVector(K[6],0.743125*Z*Z-0.247708),Q.addScaledVector(K[7],0.858086*$*Z),Q.addScaledVector(K[8],0.429043*($*$-W*W)),Q}add(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].add(J.coefficients[Q]);return this}addScaledSH(J,Q){for(let $=0;$<9;$++)this.coefficients[$].addScaledVector(J.coefficients[$],Q);return this}scale(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].multiplyScalar(J);return this}lerp(J,Q){for(let $=0;$<9;$++)this.coefficients[$].lerp(J.coefficients[$],Q);return this}equals(J){for(let Q=0;Q<9;Q++)if(!this.coefficients[Q].equals(J.coefficients[Q]))return!1;return!0}copy(J){return this.set(J.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(J,Q=0){let $=this.coefficients;for(let W=0;W<9;W++)$[W].fromArray(J,Q+W*3);return this}toArray(J=[],Q=0){let $=this.coefficients;for(let W=0;W<9;W++)$[W].toArray(J,Q+W*3);return J}static getBasisAt(J,Q){let{x:$,y:W,z:Z}=J;Q[0]=0.282095,Q[1]=0.488603*W,Q[2]=0.488603*Z,Q[3]=0.488603*$,Q[4]=1.092548*$*W,Q[5]=1.092548*W*Z,Q[6]=0.315392*(3*Z*Z-1),Q[7]=1.092548*$*Z,Q[8]=0.546274*($*$-W*W)}}class mZ extends p9{constructor(J=new Z$,Q=1){super(void 0,Q);this.isLightProbe=!0,this.sh=J}copy(J){return super.copy(J),this.sh.copy(J.sh),this}toJSON(J){let Q=super.toJSON(J);return Q.object.sh=this.sh.toArray(),Q}}var FH={};class K$ extends lJ{constructor(J){super(J);this.textures={}}load(J,Q,$,W){let Z=this,K=new M9(Z.manager);K.setPath(Z.path),K.setRequestHeader(Z.requestHeader),K.setWithCredentials(Z.withCredentials),K.load(J,function(H){try{Q(Z.parse(JSON.parse(H)))}catch(Y){if(W)W(Y);else T0(Y);Z.manager.itemError(J)}},$,W)}parse(J){let Q=this.createMaterialFromType(J.type);return Q.fromJSON(J,this.textures),Q}setTextures(J){return this.textures=J,this}createMaterialFromType(J){return K$.createMaterialFromType(J)}static createMaterialFromType(J){let $={ShadowMaterial:BZ,SpriteMaterial:wQ,RawShaderMaterial:oQ,ShaderMaterial:Q9,PointsMaterial:TQ,MeshPhysicalMaterial:IZ,MeshStandardMaterial:aQ,MeshPhongMaterial:AZ,MeshToonMaterial:wZ,MeshNormalMaterial:_Z,MeshLambertMaterial:CZ,MeshDepthMaterial:rQ,MeshDistanceMaterial:tQ,MeshBasicMaterial:g9,MeshMatcapMaterial:PZ,LineDashedMaterial:TZ,LineBasicMaterial:gJ,Material:jJ,...FH}[J],W;if($===void 0)r9(`MaterialLoader: Unknown material type "${J}". Use .registerMaterial() before starting the deserialization process.`),W=new jJ;else W=new $;return W}static registerMaterial(J,Q){FH[J]=Q}}class XQ{static extractUrlBase(J){let Q=J.lastIndexOf("/");if(Q===-1)return"./";return J.slice(0,Q+1)}static resolveURL(J,Q){if(typeof J!=="string"||J==="")return"";if(/^https?:\/\//i.test(Q)&&/^\//.test(J))Q=Q.replace(/(^https?:\/\/[^\/]+).*/i,"$1");if(/^(https?:)?\/\//i.test(J))return J;if(/^data:.*,.*$/i.test(J))return J;if(/^blob:.*$/i.test(J))return J;return Q+J}}class dZ extends u0{constructor(){super();this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(J){return super.copy(J),this.instanceCount=J.instanceCount,this}toJSON(){let J=super.toJSON();return J.instanceCount=this.instanceCount,J.isInstancedBufferGeometry=!0,J}}class lZ extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=this,K=new M9(Z.manager);K.setPath(Z.path),K.setRequestHeader(Z.requestHeader),K.setWithCredentials(Z.withCredentials),K.load(J,function(H){try{Q(Z.parse(JSON.parse(H)))}catch(Y){if(W)W(Y);else T0(Y);Z.manager.itemError(J)}},$,W)}parse(J){let Q={},$={};function W(G,q){if(Q[q]!==void 0)return Q[q];let R=G.interleavedBuffers[q],D=Z(G,R.buffer),F=H7(R.type,D),I=new J6(F,R.stride);return I.uuid=R.uuid,Q[q]=I,I}function Z(G,q){if($[q]!==void 0)return $[q];let R=G.arrayBuffers[q],D=new Uint32Array(R).buffer;return $[q]=D,D}let K=J.isInstancedBufferGeometry?new dZ:new u0,H=J.data.index;if(H!==void 0){let G=H7(H.type,H.array);K.setIndex(new YJ(G,1))}let Y=J.data.attributes;for(let G in Y){let q=Y[G],O;if(q.isInterleavedBufferAttribute){let R=W(J.data,q.data);O=new I8(R,q.itemSize,q.offset,q.normalized)}else{let R=H7(q.type,q.array);O=new(q.isInstancedBufferAttribute?A8:YJ)(R,q.itemSize,q.normalized)}if(q.name!==void 0)O.name=q.name;if(q.usage!==void 0)O.setUsage(q.usage);K.setAttribute(G,O)}let X=J.data.morphAttributes;if(X)for(let G in X){let q=X[G],O=[];for(let R=0,D=q.length;R<D;R++){let F=q[R],I;if(F.isInterleavedBufferAttribute){let V=W(J.data,F.data);I=new I8(V,F.itemSize,F.offset,F.normalized)}else{let V=H7(F.type,F.array);I=new YJ(V,F.itemSize,F.normalized)}if(F.name!==void 0)I.name=F.name;O.push(I)}K.morphAttributes[G]=O}if(J.data.morphTargetsRelative)K.morphTargetsRelative=!0;let N=J.data.groups||J.data.drawcalls||J.data.offsets;if(N!==void 0)for(let G=0,q=N.length;G!==q;++G){let O=N[G];K.addGroup(O.start,O.count,O.materialIndex)}let E=J.data.boundingSphere;if(E!==void 0)K.boundingSphere=new SJ().fromJSON(E);if(J.name)K.name=J.name;if(J.userData)K.userData=J.userData;return K}}var n$={};class OX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=this,K=this.path===""?XQ.extractUrlBase(J):this.path;this.resourcePath=this.resourcePath||K;let H=new M9(this.manager);H.setPath(this.path),H.setRequestHeader(this.requestHeader),H.setWithCredentials(this.withCredentials),H.load(J,function(Y){let X=null;try{X=JSON.parse(Y)}catch(N){if(W!==void 0)W(N);T0("ObjectLoader: Can't parse "+J+".",N.message);return}let U=X.metadata;if(U===void 0||U.type===void 0||U.type.toLowerCase()==="geometry"){if(W!==void 0)W(Error("THREE.ObjectLoader: Can't load "+J));T0("ObjectLoader: Can't load "+J);return}Z.parse(X,Q)},$,W)}async loadAsync(J,Q){let $=this,W=this.path===""?XQ.extractUrlBase(J):this.path;this.resourcePath=this.resourcePath||W;let Z=new M9(this.manager);Z.setPath(this.path),Z.setRequestHeader(this.requestHeader),Z.setWithCredentials(this.withCredentials);let K=await Z.loadAsync(J,Q),H;try{H=JSON.parse(K)}catch(X){throw Error("THREE.ObjectLoader: Can't parse "+J+". "+X.message)}let Y=H.metadata;if(Y===void 0||Y.type===void 0||Y.type.toLowerCase()==="geometry")throw Error("THREE.ObjectLoader: Can't load "+J);return await $.parseAsync(H)}parse(J,Q){let $=this.parseAnimations(J.animations),W=this.parseShapes(J.shapes),Z=this.parseGeometries(J.geometries,W),K=this.parseImages(J.images,function(){if(Q!==void 0)Q(X)}),H=this.parseTextures(J.textures,K),Y=this.parseMaterials(J.materials,H),X=this.parseObject(J.object,Z,Y,H,$),U=this.parseSkeletons(J.skeletons,X);if(this.bindSkeletons(X,U),this.bindLightTargets(X),Q!==void 0){let N=!1;for(let E in K)if(K[E].data instanceof HTMLImageElement){N=!0;break}if(N===!1)Q(X)}return X}async parseAsync(J){let Q=this.parseAnimations(J.animations),$=this.parseShapes(J.shapes),W=this.parseGeometries(J.geometries,$),Z=await this.parseImagesAsync(J.images),K=this.parseTextures(J.textures,Z),H=this.parseMaterials(J.materials,K),Y=this.parseObject(J.object,W,H,K,Q),X=this.parseSkeletons(J.skeletons,Y);return this.bindSkeletons(Y,X),this.bindLightTargets(Y),Y}static registerGeometry(J,Q){n$[J]=Q}parseShapes(J){let Q={};if(J!==void 0)for(let $=0,W=J.length;$<W;$++){let Z=new M7().fromJSON(J[$]);Q[Z.uuid]=Z}return Q}parseSkeletons(J,Q){let $={},W={};if(Q.traverse(function(Z){if(Z.isBone)W[Z.uuid]=Z}),J!==void 0)for(let Z=0,K=J.length;Z<K;Z++){let H=new CQ().fromJSON(J[Z],W);$[H.uuid]=H}return $}parseGeometries(J,Q){let $={};if(J!==void 0){let W=new lZ;for(let Z=0,K=J.length;Z<K;Z++){let H,Y=J[Z];switch(Y.type){case"BufferGeometry":case"InstancedBufferGeometry":H=W.parse(Y);break;default:if(Y.type in YH)H=YH[Y.type].fromJSON(Y,Q);else if(Y.type in n$)H=n$[Y.type].fromJSON(Y,Q);else Y0(`ObjectLoader: Unknown geometry type "${Y.type}". Use .registerGeometry() before starting the deserialization process.`)}if(H.uuid=Y.uuid,Y.name!==void 0)H.name=Y.name;if(Y.userData!==void 0)H.userData=Y.userData;$[Y.uuid]=H}}return $}parseMaterials(J,Q){let $={},W={};if(J!==void 0){let Z=new K$;Z.setTextures(Q);for(let K=0,H=J.length;K<H;K++){let Y=J[K];if($[Y.uuid]===void 0)$[Y.uuid]=Z.parse(Y);W[Y.uuid]=$[Y.uuid]}}return W}parseAnimations(J){let Q={};if(J!==void 0)for(let $=0;$<J.length;$++){let W=J[$],Z=N7.parse(W);Q[Z.uuid]=Z}return Q}parseImages(J,Q){let $=this,W={},Z;function K(Y){return Y=$.manager.resolveURL(Y),$.manager.itemStart(Y),Z.load(Y,function(){$.manager.itemEnd(Y)},void 0,function(){$.manager.itemError(Y),$.manager.itemEnd(Y)})}function H(Y){if(typeof Y==="string"){let X=Y,U=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(X)?X:$.resourcePath+X;return K(U)}else if(Y.data)return{data:H7(Y.type,Y.data),width:Y.width,height:Y.height};else return null}if(J!==void 0&&J.length>0){let Y=new $$(Q);Z=new E7(Y),Z.setCrossOrigin(this.crossOrigin);for(let X=0,U=J.length;X<U;X++){let N=J[X],E=N.url;if(Array.isArray(E)){let G=[];for(let q=0,O=E.length;q<O;q++){let R=E[q],D=H(R);if(D!==null)if(D instanceof HTMLImageElement)G.push(D);else G.push(new J9(D.data,D.width,D.height))}W[N.uuid]=new v9(G)}else{let G=H(N.url);W[N.uuid]=new v9(G)}}}return W}async parseImagesAsync(J){let Q=this,$={},W;async function Z(K){if(typeof K==="string"){let H=K,Y=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(H)?H:Q.resourcePath+H;return await W.loadAsync(Y)}else if(K.data)return{data:H7(K.type,K.data),width:K.width,height:K.height};else return null}if(J!==void 0&&J.length>0){W=new E7(this.manager),W.setCrossOrigin(this.crossOrigin);for(let K=0,H=J.length;K<H;K++){let Y=J[K],X=Y.url;if(Array.isArray(X)){let U=[];for(let N=0,E=X.length;N<E;N++){let G=X[N],q=await Z(G);if(q!==null)if(q instanceof HTMLImageElement)U.push(q);else U.push(new J9(q.data,q.width,q.height))}$[Y.uuid]=new v9(U)}else{let U=await Z(Y.url);$[Y.uuid]=new v9(U)}}}return $}parseTextures(J,Q){function $(Z,K){if(typeof Z==="number")return Z;return Y0("ObjectLoader.parseTexture: Constant should be in numeric form.",Z),K[Z]}let W={};if(J!==void 0)for(let Z=0,K=J.length;Z<K;Z++){let H=J[Z];if(H.image===void 0)Y0('ObjectLoader: No "image" specified for',H.uuid);if(Q[H.image]===void 0)Y0("ObjectLoader: Undefined image",H.image);let Y=Q[H.image],X=Y.data,U;if(Array.isArray(X)){if(U=new k7,X.length===6)U.needsUpdate=!0}else{if(X&&X.data)U=new J9;else U=new kJ;if(X)U.needsUpdate=!0}if(U.source=Y,U.uuid=H.uuid,H.name!==void 0)U.name=H.name;if(H.mapping!==void 0)U.mapping=$(H.mapping,CE);if(H.channel!==void 0)U.channel=H.channel;if(H.offset!==void 0)U.offset.fromArray(H.offset);if(H.repeat!==void 0)U.repeat.fromArray(H.repeat);if(H.center!==void 0)U.center.fromArray(H.center);if(H.rotation!==void 0)U.rotation=H.rotation;if(H.wrap!==void 0)U.wrapS=$(H.wrap[0],DH),U.wrapT=$(H.wrap[1],DH);if(H.format!==void 0)U.format=H.format;if(H.internalFormat!==void 0)U.internalFormat=H.internalFormat;if(H.type!==void 0)U.type=H.type;if(H.colorSpace!==void 0)U.colorSpace=H.colorSpace;if(H.minFilter!==void 0)U.minFilter=$(H.minFilter,OH);if(H.magFilter!==void 0)U.magFilter=$(H.magFilter,OH);if(H.anisotropy!==void 0)U.anisotropy=H.anisotropy;if(H.flipY!==void 0)U.flipY=H.flipY;if(H.generateMipmaps!==void 0)U.generateMipmaps=H.generateMipmaps;if(H.premultiplyAlpha!==void 0)U.premultiplyAlpha=H.premultiplyAlpha;if(H.unpackAlignment!==void 0)U.unpackAlignment=H.unpackAlignment;if(H.compareFunction!==void 0)U.compareFunction=H.compareFunction;if(H.normalized!==void 0)U.normalized=H.normalized;if(H.userData!==void 0)U.userData=H.userData;W[H.uuid]=U}return W}parseObject(J,Q,$,W,Z){let K;function H(E){if(Q[E]===void 0)Y0("ObjectLoader: Undefined geometry",E);return Q[E]}function Y(E){if(E===void 0)return;if(Array.isArray(E)){let G=[];for(let q=0,O=E.length;q<O;q++){let R=E[q];if($[R]===void 0)Y0("ObjectLoader: Undefined material",R);G.push($[R])}return G}if($[E]===void 0)Y0("ObjectLoader: Undefined material",E);return $[E]}function X(E){if(W[E]===void 0)Y0("ObjectLoader: Undefined texture",E);return W[E]}let U,N;switch(J.type){case"Scene":if(K=new ZZ,J.background!==void 0)if(Number.isInteger(J.background))K.background=new B0(J.background);else K.background=X(J.background);if(J.environment!==void 0)K.environment=X(J.environment);if(J.fog!==void 0){if(J.fog.type==="Fog")K.fog=new zQ(J.fog.color,J.fog.near,J.fog.far);else if(J.fog.type==="FogExp2")K.fog=new BQ(J.fog.color,J.fog.density);if(J.fog.name!=="")K.fog.name=J.fog.name}if(J.backgroundBlurriness!==void 0)K.backgroundBlurriness=J.backgroundBlurriness;if(J.backgroundIntensity!==void 0)K.backgroundIntensity=J.backgroundIntensity;if(J.backgroundRotation!==void 0)K.backgroundRotation.fromArray(J.backgroundRotation);if(J.environmentIntensity!==void 0)K.environmentIntensity=J.environmentIntensity;if(J.environmentRotation!==void 0)K.environmentRotation.fromArray(J.environmentRotation);break;case"PerspectiveCamera":if(K=new TJ(J.fov,J.aspect,J.near,J.far),J.focus!==void 0)K.focus=J.focus;if(J.zoom!==void 0)K.zoom=J.zoom;if(J.filmGauge!==void 0)K.filmGauge=J.filmGauge;if(J.filmOffset!==void 0)K.filmOffset=J.filmOffset;if(J.view!==void 0)K.view=Object.assign({},J.view);break;case"OrthographicCamera":if(K=new V7(J.left,J.right,J.top,J.bottom,J.near,J.far),J.zoom!==void 0)K.zoom=J.zoom;if(J.view!==void 0)K.view=Object.assign({},J.view);break;case"AmbientLight":K=new gZ(J.color,J.intensity);break;case"DirectionalLight":K=new xZ(J.color,J.intensity),K.target=J.target||"";break;case"PointLight":K=new hZ(J.color,J.intensity,J.distance,J.decay);break;case"RectAreaLight":K=new pZ(J.color,J.intensity,J.width,J.height);break;case"SpotLight":K=new bZ(J.color,J.intensity,J.distance,J.angle,J.penumbra,J.decay),K.target=J.target||"";break;case"HemisphereLight":K=new fZ(J.color,J.groundColor,J.intensity);break;case"LightProbe":let E=new Z$().fromArray(J.sh);K=new mZ(E,J.intensity);break;case"SkinnedMesh":if(U=H(J.geometry),N=Y(J.material),K=new YZ(U,N),J.bindMode!==void 0)K.bindMode=J.bindMode;if(J.bindMatrix!==void 0)K.bindMatrix.fromArray(J.bindMatrix);if(J.skeleton!==void 0)K.skeleton=J.skeleton;break;case"Mesh":U=H(J.geometry),N=Y(J.material),K=new AJ(U,N);break;case"InstancedMesh":U=H(J.geometry),N=Y(J.material);let{count:G,instanceMatrix:q,instanceColor:O}=J;if(K=new XZ(U,N,G),K.instanceMatrix=new A8(new Float32Array(q.array),16),O!==void 0)K.instanceColor=new A8(new Float32Array(O.array),O.itemSize);break;case"BatchedMesh":if(U=H(J.geometry),N=Y(J.material),K=new UZ(J.maxInstanceCount,J.maxVertexCount,J.maxIndexCount,N),K.geometry=U,K.perObjectFrustumCulled=J.perObjectFrustumCulled,K.sortObjects=J.sortObjects,K._drawRanges=J.drawRanges,K._reservedRanges=J.reservedRanges,K._geometryInfo=J.geometryInfo.map((R)=>{let D=null,F=null;if(R.boundingBox!==void 0)D=new yJ().fromJSON(R.boundingBox);if(R.boundingSphere!==void 0)F=new SJ().fromJSON(R.boundingSphere);return{...R,boundingBox:D,boundingSphere:F}}),K._instanceInfo=J.instanceInfo,K._availableInstanceIds=J._availableInstanceIds,K._availableGeometryIds=J._availableGeometryIds,K._nextIndexStart=J.nextIndexStart,K._nextVertexStart=J.nextVertexStart,K._geometryCount=J.geometryCount,K._maxInstanceCount=J.maxInstanceCount,K._maxVertexCount=J.maxVertexCount,K._maxIndexCount=J.maxIndexCount,K._geometryInitialized=J.geometryInitialized,K._matricesTexture=X(J.matricesTexture.uuid),K._indirectTexture=X(J.indirectTexture.uuid),J.colorsTexture!==void 0)K._colorsTexture=X(J.colorsTexture.uuid);if(J.boundingSphere!==void 0)K.boundingSphere=new SJ().fromJSON(J.boundingSphere);if(J.boundingBox!==void 0)K.boundingBox=new yJ().fromJSON(J.boundingBox);break;case"LOD":K=new HZ;break;case"Line":K=new b9(H(J.geometry),Y(J.material));break;case"LineLoop":K=new GZ(H(J.geometry),Y(J.material));break;case"LineSegments":K=new F9(H(J.geometry),Y(J.material));break;case"PointCloud":case"Points":K=new NZ(H(J.geometry),Y(J.material));break;case"Sprite":K=new KZ(Y(J.material));break;case"Group":K=new L8;break;case"Bone":K=new _Q;break;default:K=new ZJ}if(K.uuid=J.uuid,J.name!==void 0)K.name=J.name;if(J.matrix!==void 0){if(K.matrix.fromArray(J.matrix),J.matrixAutoUpdate!==void 0)K.matrixAutoUpdate=J.matrixAutoUpdate;if(K.matrixAutoUpdate)K.matrix.decompose(K.position,K.quaternion,K.scale)}else{if(J.position!==void 0)K.position.fromArray(J.position);if(J.rotation!==void 0)K.rotation.fromArray(J.rotation);if(J.quaternion!==void 0)K.quaternion.fromArray(J.quaternion);if(J.scale!==void 0)K.scale.fromArray(J.scale)}if(J.up!==void 0)K.up.fromArray(J.up);if(J.pivot!==void 0)K.pivot=new P().fromArray(J.pivot);if(J.morphTargetDictionary!==void 0)K.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);if(J.morphTargetInfluences!==void 0)K.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.castShadow!==void 0)K.castShadow=J.castShadow;if(J.receiveShadow!==void 0)K.receiveShadow=J.receiveShadow;if(J.shadow){if(J.shadow.intensity!==void 0)K.shadow.intensity=J.shadow.intensity;if(J.shadow.bias!==void 0)K.shadow.bias=J.shadow.bias;if(J.shadow.normalBias!==void 0)K.shadow.normalBias=J.shadow.normalBias;if(J.shadow.radius!==void 0)K.shadow.radius=J.shadow.radius;if(J.shadow.mapSize!==void 0)K.shadow.mapSize.fromArray(J.shadow.mapSize);if(J.shadow.camera!==void 0)K.shadow.camera=this.parseObject(J.shadow.camera)}if(J.visible!==void 0)K.visible=J.visible;if(J.frustumCulled!==void 0)K.frustumCulled=J.frustumCulled;if(J.renderOrder!==void 0)K.renderOrder=J.renderOrder;if(J.static!==void 0)K.static=J.static;if(J.userData!==void 0)K.userData=J.userData;if(J.layers!==void 0)K.layers.mask=J.layers;if(J.children!==void 0){let E=J.children;for(let G=0;G<E.length;G++)K.add(this.parseObject(E[G],Q,$,W,Z))}if(J.animations!==void 0){let E=J.animations;for(let G=0;G<E.length;G++){let q=E[G];K.animations.push(Z[q])}}if(J.type==="LOD"){if(J.autoUpdate!==void 0)K.autoUpdate=J.autoUpdate;let E=J.levels;for(let G=0;G<E.length;G++){let q=E[G],O=K.getObjectByProperty("uuid",q.object);if(O!==void 0)K.addLevel(O,q.distance,q.hysteresis)}}return K}bindSkeletons(J,Q){if(Object.keys(Q).length===0)return;J.traverse(function($){if($.isSkinnedMesh===!0&&$.skeleton!==void 0){let W=Q[$.skeleton];if(W===void 0)Y0("ObjectLoader: No skeleton found with UUID:",$.skeleton);else $.bind(W,$.bindMatrix)}})}bindLightTargets(J){J.traverse(function(Q){if(Q.isDirectionalLight||Q.isSpotLight){let $=Q.target,W=J.getObjectByProperty("uuid",$);if(W!==void 0)Q.target=W;else Q.target=new ZJ}})}}var CE={UVMapping:300,CubeReflectionMapping:301,CubeRefractionMapping:302,EquirectangularReflectionMapping:303,EquirectangularRefractionMapping:304,CubeUVReflectionMapping:306},DH={RepeatWrapping:1000,ClampToEdgeWrapping:1001,MirroredRepeatWrapping:1002},OH={NearestFilter:1003,NearestMipmapNearestFilter:1004,NearestMipmapLinearFilter:1005,LinearFilter:1006,LinearMipmapNearestFilter:1007,LinearMipmapLinearFilter:1008},s$=new WeakMap;class RX extends lJ{constructor(J){super(J);if(this.isImageBitmapLoader=!0,typeof createImageBitmap>"u")Y0("ImageBitmapLoader: createImageBitmap() not supported.");if(typeof fetch>"u")Y0("ImageBitmapLoader: fetch() not supported.");this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(J){return this.options=J,this}load(J,Q,$,W){if(J===void 0)J="";if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let Z=this,K=k9.get(`image-bitmap:${J}`);if(K!==void 0){if(Z.manager.itemStart(J),K.then){K.then((X)=>{if(s$.has(K)===!0){if(W)W(s$.get(K));Z.manager.itemError(J),Z.manager.itemEnd(J)}else{if(Q)Q(X);Z.manager.itemEnd(J)}});return}setTimeout(function(){if(Q)Q(K);Z.manager.itemEnd(J)},0);return}let H={};H.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",H.headers=this.requestHeader,H.signal=typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let Y=fetch(J,H).then(function(X){return X.blob()}).then(function(X){return createImageBitmap(X,Object.assign(Z.options,{colorSpaceConversion:"none"}))}).then(function(X){if(k9.add(`image-bitmap:${J}`,X),Q)Q(X);Z.manager.itemEnd(J)}).catch(function(X){if(W)W(X);s$.set(Y,X),k9.remove(`image-bitmap:${J}`),Z.manager.itemError(J),Z.manager.itemEnd(J)});k9.add(`image-bitmap:${J}`,Y),Z.manager.itemStart(J)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}var t6;class H${static getContext(){if(t6===void 0)t6=new(window.AudioContext||window.webkitAudioContext);return t6}static setContext(J){t6=J}}class kX extends lJ{constructor(J){super(J)}load(J,Q,$,W){let Z=this,K=new M9(this.manager);K.setResponseType("arraybuffer"),K.setPath(this.path),K.setRequestHeader(this.requestHeader),K.setWithCredentials(this.withCredentials),K.load(J,function(Y){try{let X=Y.slice(0),U=H$.getContext(),N=J+"#decode";Z.manager.itemStart(N),U.decodeAudioData(X,function(E){Q(E),Z.manager.itemEnd(N)}).catch(function(E){H(E),Z.manager.itemEnd(N)})}catch(X){H(X)}},$,W);function H(Y){if(W)W(Y);else T0(Y);Z.manager.itemError(J)}}}var RH=new p0,kH=new p0,F8=new p0;class MX{constructor(){this.type="StereoCamera",this.aspect=1,this.eyeSep=0.064,this.cameraL=new TJ,this.cameraL.layers.enable(1),this.cameraL.matrixAutoUpdate=!1,this.cameraR=new TJ,this.cameraR.layers.enable(2),this.cameraR.matrixAutoUpdate=!1,this._cache={focus:null,fov:null,aspect:null,near:null,far:null,zoom:null,eyeSep:null}}update(J){let Q=this._cache;if(Q.focus!==J.focus||Q.fov!==J.fov||Q.aspect!==J.aspect*this.aspect||Q.near!==J.near||Q.far!==J.far||Q.zoom!==J.zoom||Q.eyeSep!==this.eyeSep){Q.focus=J.focus,Q.fov=J.fov,Q.aspect=J.aspect*this.aspect,Q.near=J.near,Q.far=J.far,Q.zoom=J.zoom,Q.eyeSep=this.eyeSep,F8.copy(J.projectionMatrix);let W=Q.eyeSep/2,Z=W*Q.near/Q.focus,K=Q.near*Math.tan(B8*Q.fov*0.5)/Q.zoom,H,Y;kH.elements[12]=-W,RH.elements[12]=W,H=-K*Q.aspect+Z,Y=K*Q.aspect+Z,F8.elements[0]=2*Q.near/(Y-H),F8.elements[8]=(Y+H)/(Y-H),this.cameraL.projectionMatrix.copy(F8),H=-K*Q.aspect-Z,Y=K*Q.aspect-Z,F8.elements[0]=2*Q.near/(Y-H),F8.elements[8]=(Y+H)/(Y-H),this.cameraR.projectionMatrix.copy(F8)}this.cameraL.matrix.copy(J.matrixWorld).multiply(kH),this.cameraL.matrixWorldNeedsUpdate=!0,this.cameraR.matrix.copy(J.matrixWorld).multiply(RH),this.cameraR.matrixWorldNeedsUpdate=!0}}var $7=-90,W7=1;class uZ extends ZJ{constructor(J,Q,$){super();this.type="CubeCamera",this.renderTarget=$,this.coordinateSystem=null,this.activeMipmapLevel=0;let W=new TJ($7,W7,J,Q);W.layers=this.layers,this.add(W);let Z=new TJ($7,W7,J,Q);Z.layers=this.layers,this.add(Z);let K=new TJ($7,W7,J,Q);K.layers=this.layers,this.add(K);let H=new TJ($7,W7,J,Q);H.layers=this.layers,this.add(H);let Y=new TJ($7,W7,J,Q);Y.layers=this.layers,this.add(Y);let X=new TJ($7,W7,J,Q);X.layers=this.layers,this.add(X)}updateCoordinateSystem(){let J=this.coordinateSystem,Q=this.children.concat(),[$,W,Z,K,H,Y]=Q;for(let X of Q)this.remove(X);if(J===2000)$.up.set(0,1,0),$.lookAt(1,0,0),W.up.set(0,1,0),W.lookAt(-1,0,0),Z.up.set(0,0,-1),Z.lookAt(0,1,0),K.up.set(0,0,1),K.lookAt(0,-1,0),H.up.set(0,1,0),H.lookAt(0,0,1),Y.up.set(0,1,0),Y.lookAt(0,0,-1);else if(J===2001)$.up.set(0,-1,0),$.lookAt(-1,0,0),W.up.set(0,-1,0),W.lookAt(1,0,0),Z.up.set(0,0,1),Z.lookAt(0,1,0),K.up.set(0,0,-1),K.lookAt(0,-1,0),H.up.set(0,-1,0),H.lookAt(0,0,1),Y.up.set(0,-1,0),Y.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let X of Q)this.add(X),X.updateMatrixWorld()}update(J,Q){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:$,activeMipmapLevel:W}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[Z,K,H,Y,X,U]=this.children,N=J.getRenderTarget(),E=J.getActiveCubeFace(),G=J.getActiveMipmapLevel(),q=J.xr.enabled;J.xr.enabled=!1;let O=$.texture.generateMipmaps;$.texture.generateMipmaps=!1;let R=!1;if(J.isWebGLRenderer===!0)R=J.state.buffers.depth.getReversed();else R=J.reversedDepthBuffer;if(J.setRenderTarget($,0,W),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Z),J.setRenderTarget($,1,W),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,K),J.setRenderTarget($,2,W),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,H),J.setRenderTarget($,3,W),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Y),J.setRenderTarget($,4,W),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,X),$.texture.generateMipmaps=O,J.setRenderTarget($,5,W),R&&J.autoClear===!1)J.clearDepth();J.render(Q,U),J.setRenderTarget(N,E,G),J.xr.enabled=q,$.texture.needsPMREMUpdate=!0}}class cZ extends TJ{constructor(J=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=J}}class nZ{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(J){if(this._document=J,J.hidden!==void 0)this._pageVisibilityHandler=PE.bind(this),J.addEventListener("visibilitychange",this._pageVisibilityHandler,!1)}disconnect(){if(this._pageVisibilityHandler!==null)this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null;this._document=null}getDelta(){return this._delta/1000}getElapsed(){return this._elapsed/1000}getTimescale(){return this._timescale}setTimescale(J){return this._timescale=J,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(J){if(this._pageVisibilityHandler!==null&&this._document.hidden===!0)this._delta=0;else this._previousTime=this._currentTime,this._currentTime=(J!==void 0?J:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta;return this}}function PE(){if(this._document.hidden===!1)this.reset()}var D8=new P,i$=new xJ,TE=new P,O8=new P,R8=new P;class LX extends ZJ{constructor(){super();this.type="AudioListener",this.context=H$.getContext(),this.gain=this.context.createGain(),this.gain.connect(this.context.destination),this.filter=null,this.timeDelta=0,this._timer=new nZ}getInput(){return this.gain}removeFilter(){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null;return this}getFilter(){return this.filter}setFilter(J){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination);else this.gain.disconnect(this.context.destination);return this.filter=J,this.gain.connect(this.filter),this.filter.connect(this.context.destination),this}getMasterVolume(){return this.gain.gain.value}setMasterVolume(J){return this.gain.gain.setTargetAtTime(J,this.context.currentTime,0.01),this}updateMatrixWorld(J){super.updateMatrixWorld(J),this._timer.update();let Q=this.context.listener;if(this.timeDelta=this._timer.getDelta(),this.matrixWorld.decompose(D8,i$,TE),O8.set(0,0,-1).applyQuaternion(i$),R8.set(0,1,0).applyQuaternion(i$),Q.positionX){let $=this.context.currentTime+this.timeDelta;Q.positionX.linearRampToValueAtTime(D8.x,$),Q.positionY.linearRampToValueAtTime(D8.y,$),Q.positionZ.linearRampToValueAtTime(D8.z,$),Q.forwardX.linearRampToValueAtTime(O8.x,$),Q.forwardY.linearRampToValueAtTime(O8.y,$),Q.forwardZ.linearRampToValueAtTime(O8.z,$),Q.upX.linearRampToValueAtTime(R8.x,$),Q.upY.linearRampToValueAtTime(R8.y,$),Q.upZ.linearRampToValueAtTime(R8.z,$)}else Q.setPosition(D8.x,D8.y,D8.z),Q.setOrientation(O8.x,O8.y,O8.z,R8.x,R8.y,R8.z)}}class sZ extends ZJ{constructor(J){super();this.type="Audio",this.listener=J,this.context=J.context,this.gain=this.context.createGain(),this.gain.connect(J.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(J){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=J,this.connect(),this}setMediaElementSource(J){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(J),this.connect(),this}setMediaStreamSource(J){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(J),this.connect(),this}setBuffer(J){if(this.buffer=J,this.sourceType="buffer",this.autoplay)this.play();return this}play(J=0){if(this.isPlaying===!0){Y0("Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){Y0("Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+J;let Q=this.context.createBufferSource();return Q.buffer=this.buffer,Q.loop=this.loop,Q.loopStart=this.loopStart,Q.loopEnd=this.loopEnd,Q.onended=this.onEnded.bind(this),Q.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=Q,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){Y0("Audio: this Audio has no playback control.");return}if(this.isPlaying===!0){if(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0)this._progress=this._progress%(this.duration||this.buffer.duration);this.source.stop(),this.source.onended=null,this.isPlaying=!1}return this}stop(J=0){if(this.hasPlaybackControl===!1){Y0("Audio: this Audio has no playback control.");return}if(this._progress=0,this.source!==null)this.source.stop(this.context.currentTime+J),this.source.onended=null;return this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let J=1,Q=this.filters.length;J<Q;J++)this.filters[J-1].connect(this.filters[J]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this._connected===!1)return;if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let J=1,Q=this.filters.length;J<Q;J++)this.filters[J-1].disconnect(this.filters[J]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(J){if(!J)J=[];if(this._connected===!0)this.disconnect(),this.filters=J.slice(),this.connect();else this.filters=J.slice();return this}setDetune(J){if(this.detune=J,this.isPlaying===!0&&this.source.detune!==void 0)this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,0.01);return this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(J){return this.setFilters(J?[J]:[])}setPlaybackRate(J){if(this.hasPlaybackControl===!1){Y0("Audio: this Audio has no playback control.");return}if(this.playbackRate=J,this.isPlaying===!0)this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,0.01);return this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1,this._progress=0}getLoop(){if(this.hasPlaybackControl===!1)return Y0("Audio: this Audio has no playback control."),!1;return this.loop}setLoop(J){if(this.hasPlaybackControl===!1){Y0("Audio: this Audio has no playback control.");return}if(this.loop=J,this.isPlaying===!0)this.source.loop=this.loop;return this}setLoopStart(J){return this.loopStart=J,this}setLoopEnd(J){return this.loopEnd=J,this}getVolume(){return this.gain.gain.value}setVolume(J){return this.gain.gain.setTargetAtTime(J,this.context.currentTime,0.01),this}copy(J,Q){if(super.copy(J,Q),J.sourceType!=="buffer")return Y0("Audio: Audio source type cannot be copied."),this;return this.autoplay=J.autoplay,this.buffer=J.buffer,this.detune=J.detune,this.loop=J.loop,this.loopStart=J.loopStart,this.loopEnd=J.loopEnd,this.offset=J.offset,this.duration=J.duration,this.playbackRate=J.playbackRate,this.hasPlaybackControl=J.hasPlaybackControl,this.sourceType=J.sourceType,this.filters=J.filters.slice(),this}clone(J){return new this.constructor(this.listener).copy(this,J)}}var k8=new P,MH=new xJ,SE=new P,M8=new P;class VX extends sZ{constructor(J){super(J);this.panner=this.context.createPanner(),this.panner.panningModel="HRTF",this.panner.connect(this.gain)}connect(){return super.connect(),this.panner.connect(this.gain),this}disconnect(){return super.disconnect(),this.panner.disconnect(this.gain),this}getOutput(){return this.panner}getRefDistance(){return this.panner.refDistance}setRefDistance(J){return this.panner.refDistance=J,this}getRolloffFactor(){return this.panner.rolloffFactor}setRolloffFactor(J){return this.panner.rolloffFactor=J,this}getDistanceModel(){return this.panner.distanceModel}setDistanceModel(J){return this.panner.distanceModel=J,this}getMaxDistance(){return this.panner.maxDistance}setMaxDistance(J){return this.panner.maxDistance=J,this}setDirectionalCone(J,Q,$){return this.panner.coneInnerAngle=J,this.panner.coneOuterAngle=Q,this.panner.coneOuterGain=$,this}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.hasPlaybackControl===!0&&this.isPlaying===!1)return;this.matrixWorld.decompose(k8,MH,SE),M8.set(0,0,1).applyQuaternion(MH);let Q=this.panner;if(Q.positionX){let $=this.context.currentTime+this.listener.timeDelta;Q.positionX.linearRampToValueAtTime(k8.x,$),Q.positionY.linearRampToValueAtTime(k8.y,$),Q.positionZ.linearRampToValueAtTime(k8.z,$),Q.orientationX.linearRampToValueAtTime(M8.x,$),Q.orientationY.linearRampToValueAtTime(M8.y,$),Q.orientationZ.linearRampToValueAtTime(M8.z,$)}else Q.setPosition(k8.x,k8.y,k8.z),Q.setOrientation(M8.x,M8.y,M8.z)}}class BX{constructor(J,Q=2048){this.analyser=J.context.createAnalyser(),this.analyser.fftSize=Q,this.data=new Uint8Array(this.analyser.frequencyBinCount),J.getOutput().connect(this.analyser)}getFrequencyData(){return this.analyser.getByteFrequencyData(this.data),this.data}getAverageFrequency(){let J=0,Q=this.getFrequencyData();for(let $=0;$<Q.length;$++)J+=Q[$];return J/Q.length}}class iZ{constructor(J,Q,$){this.binding=J,this.valueSize=$;let W,Z,K;switch(Q){case"quaternion":W=this._slerp,Z=this._slerpAdditive,K=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array($*6),this._workIndex=5;break;case"string":case"bool":W=this._select,Z=this._select,K=this._setAdditiveIdentityOther,this.buffer=Array($*5);break;default:W=this._lerp,Z=this._lerpAdditive,K=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array($*5)}this._mixBufferRegion=W,this._mixBufferRegionAdditive=Z,this._setIdentity=K,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(J,Q){let $=this.buffer,W=this.valueSize,Z=J*W+W,K=this.cumulativeWeight;if(K===0){for(let H=0;H!==W;++H)$[Z+H]=$[H];K=Q}else{K+=Q;let H=Q/K;this._mixBufferRegion($,Z,0,H,W)}this.cumulativeWeight=K}accumulateAdditive(J){let Q=this.buffer,$=this.valueSize,W=$*this._addIndex;if(this.cumulativeWeightAdditive===0)this._setIdentity();this._mixBufferRegionAdditive(Q,W,0,J,$),this.cumulativeWeightAdditive+=J}apply(J){let Q=this.valueSize,$=this.buffer,W=J*Q+Q,Z=this.cumulativeWeight,K=this.cumulativeWeightAdditive,H=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,Z<1){let Y=Q*this._origIndex;this._mixBufferRegion($,W,Y,1-Z,Q)}if(K>0)this._mixBufferRegionAdditive($,W,this._addIndex*Q,1,Q);for(let Y=Q,X=Q+Q;Y!==X;++Y)if($[Y]!==$[Y+Q]){H.setValue($,W);break}}saveOriginalState(){let J=this.binding,Q=this.buffer,$=this.valueSize,W=$*this._origIndex;J.getValue(Q,W);for(let Z=$,K=W;Z!==K;++Z)Q[Z]=Q[W+Z%$];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let J=this.valueSize*3;this.binding.setValue(this.buffer,J)}_setAdditiveIdentityNumeric(){let J=this._addIndex*this.valueSize,Q=J+this.valueSize;for(let $=J;$<Q;$++)this.buffer[$]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let J=this._origIndex*this.valueSize,Q=this._addIndex*this.valueSize;for(let $=0;$<this.valueSize;$++)this.buffer[Q+$]=this.buffer[J+$]}_select(J,Q,$,W,Z){if(W>=0.5)for(let K=0;K!==Z;++K)J[Q+K]=J[$+K]}_slerp(J,Q,$,W){xJ.slerpFlat(J,Q,J,Q,J,$,W)}_slerpAdditive(J,Q,$,W,Z){let K=this._workIndex*Z;xJ.multiplyQuaternionsFlat(J,K,J,Q,J,$),xJ.slerpFlat(J,Q,J,Q,J,K,W)}_lerp(J,Q,$,W,Z){let K=1-W;for(let H=0;H!==Z;++H){let Y=Q+H;J[Y]=J[Y]*K+J[$+H]*W}}_lerpAdditive(J,Q,$,W,Z){for(let K=0;K!==Z;++K){let H=Q+K;J[H]=J[H]+J[$+K]*W}}}var oZ="\\[\\]\\.:\\/",jE=new RegExp("["+oZ+"]","g"),aZ="[^"+oZ+"]",yE="[^"+oZ.replace("\\.","")+"]",vE=/((?:WC+[\/:])*)/.source.replace("WC",aZ),fE=/(WCOD+)?/.source.replace("WCOD",yE),bE=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",aZ),hE=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",aZ),xE=new RegExp("^"+vE+fE+bE+hE+"$"),gE=["material","materials","bones","map"];class zX{constructor(J,Q,$){let W=$||WJ.parseTrackName(Q);this._targetGroup=J,this._bindings=J.subscribe_(Q,W)}getValue(J,Q){this.bind();let $=this._targetGroup.nCachedObjects_,W=this._bindings[$];if(W!==void 0)W.getValue(J,Q)}setValue(J,Q){let $=this._bindings;for(let W=this._targetGroup.nCachedObjects_,Z=$.length;W!==Z;++W)$[W].setValue(J,Q)}bind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].bind()}unbind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].unbind()}}class WJ{constructor(J,Q,$){this.path=Q,this.parsedPath=$||WJ.parseTrackName(Q),this.node=WJ.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,Q,$){if(!(J&&J.isAnimationObjectGroup))return new WJ(J,Q,$);else return new WJ.Composite(J,Q,$)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(jE,"")}static parseTrackName(J){let Q=xE.exec(J);if(Q===null)throw Error("THREE.PropertyBinding: Cannot parse trackName: "+J);let $={nodeName:Q[2],objectName:Q[3],objectIndex:Q[4],propertyName:Q[5],propertyIndex:Q[6]},W=$.nodeName&&$.nodeName.lastIndexOf(".");if(W!==void 0&&W!==-1){let Z=$.nodeName.substring(W+1);if(gE.indexOf(Z)!==-1)$.nodeName=$.nodeName.substring(0,W),$.objectName=Z}if($.propertyName===null||$.propertyName.length===0)throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+J);return $}static findNode(J,Q){if(Q===void 0||Q===""||Q==="."||Q===-1||Q===J.name||Q===J.uuid)return J;if(J.skeleton){let $=J.skeleton.getBoneByName(Q);if($!==void 0)return $}if(J.children){let $=function(Z){for(let K=0;K<Z.length;K++){let H=Z[K];if(H.name===Q||H.uuid===Q)return H;let Y=$(H.children);if(Y)return Y}return null},W=$(J.children);if(W)return W}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,Q){J[Q]=this.targetObject[this.propertyName]}_getValue_array(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)J[Q++]=$[W]}_getValue_arrayElement(J,Q){J[Q]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,Q){this.resolvedProperty.toArray(J,Q)}_setValue_direct(J,Q){this.targetObject[this.propertyName]=J[Q]}_setValue_direct_setNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)$[W]=J[Q++]}_setValue_array_setNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)$[W]=J[Q++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let W=0,Z=$.length;W!==Z;++W)$[W]=J[Q++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q]}_setValue_arrayElement_setNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,Q){this.resolvedProperty.fromArray(J,Q)}_setValue_fromArray_setNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,Q){this.bind(),this.getValue(J,Q)}_setValue_unbound(J,Q){this.bind(),this.setValue(J,Q)}bind(){let J=this.node,Q=this.parsedPath,$=Q.objectName,W=Q.propertyName,Z=Q.propertyIndex;if(!J)J=WJ.findNode(this.rootNode,Q.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){Y0("PropertyBinding: No target node found for track: "+this.path+".");return}if($){let X=Q.objectIndex;switch($){case"materials":if(!J.material){T0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){T0("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){T0("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===X){X=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){T0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){T0("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[$]===void 0){T0("PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[$]}if(X!==void 0){if(J[X]===void 0){T0("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[X]}}let K=J[W];if(K===void 0){let X=Q.nodeName;T0("PropertyBinding: Trying to update property for track: "+X+"."+W+" but it wasn't found.",J);return}let H=this.Versioning.None;if(this.targetObject=J,J.isMaterial===!0)H=this.Versioning.NeedsUpdate;else if(J.isObject3D===!0)H=this.Versioning.MatrixWorldNeedsUpdate;let Y=this.BindingType.Direct;if(Z!==void 0){if(W==="morphTargetInfluences"){if(!J.geometry){T0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){T0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[Z]!==void 0)Z=J.morphTargetDictionary[Z]}Y=this.BindingType.ArrayElement,this.resolvedProperty=K,this.propertyIndex=Z}else if(K.fromArray!==void 0&&K.toArray!==void 0)Y=this.BindingType.HasFromToArray,this.resolvedProperty=K;else if(Array.isArray(K))Y=this.BindingType.EntireArray,this.resolvedProperty=K;else this.propertyName=W;this.getValue=this.GetterByBindingType[Y],this.setValue=this.SetterByBindingTypeAndVersioning[Y][H]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}WJ.Composite=zX;WJ.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};WJ.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};WJ.prototype.GetterByBindingType=[WJ.prototype._getValue_direct,WJ.prototype._getValue_array,WJ.prototype._getValue_arrayElement,WJ.prototype._getValue_toArray];WJ.prototype.SetterByBindingTypeAndVersioning=[[WJ.prototype._setValue_direct,WJ.prototype._setValue_direct_setNeedsUpdate,WJ.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[WJ.prototype._setValue_array,WJ.prototype._setValue_array_setNeedsUpdate,WJ.prototype._setValue_array_setMatrixWorldNeedsUpdate],[WJ.prototype._setValue_arrayElement,WJ.prototype._setValue_arrayElement_setNeedsUpdate,WJ.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[WJ.prototype._setValue_fromArray,WJ.prototype._setValue_fromArray_setNeedsUpdate,WJ.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class IX{constructor(){this.isAnimationObjectGroup=!0,this.uuid=eJ(),this._objects=Array.prototype.slice.call(arguments),this.nCachedObjects_=0;let J={};this._indicesByUUID=J;for(let $=0,W=arguments.length;$!==W;++$)J[arguments[$].uuid]=$;this._paths=[],this._parsedPaths=[],this._bindings=[],this._bindingsIndicesByPath={};let Q=this;this.stats={objects:{get total(){return Q._objects.length},get inUse(){return this.total-Q.nCachedObjects_}},get bindingsPerObject(){return Q._bindings.length}}}add(){let J=this._objects,Q=this._indicesByUUID,$=this._paths,W=this._parsedPaths,Z=this._bindings,K=Z.length,H=void 0,Y=J.length,X=this.nCachedObjects_;for(let U=0,N=arguments.length;U!==N;++U){let E=arguments[U],G=E.uuid,q=Q[G];if(q===void 0){q=Y++,Q[G]=q,J.push(E);for(let O=0,R=K;O!==R;++O)Z[O].push(new WJ(E,$[O],W[O]))}else if(q<X){H=J[q];let O=--X,R=J[O];Q[R.uuid]=q,J[q]=R,Q[G]=O,J[O]=E;for(let D=0,F=K;D!==F;++D){let I=Z[D],V=I[O],M=I[q];if(I[q]=V,M===void 0)M=new WJ(E,$[D],W[D]);I[O]=M}}else if(J[q]!==H)T0("AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=X}remove(){let J=this._objects,Q=this._indicesByUUID,$=this._bindings,W=$.length,Z=this.nCachedObjects_;for(let K=0,H=arguments.length;K!==H;++K){let Y=arguments[K],X=Y.uuid,U=Q[X];if(U!==void 0&&U>=Z){let N=Z++,E=J[N];Q[E.uuid]=U,J[U]=E,Q[X]=N,J[N]=Y;for(let G=0,q=W;G!==q;++G){let O=$[G],R=O[N],D=O[U];O[U]=R,O[N]=D}}}this.nCachedObjects_=Z}uncache(){let J=this._objects,Q=this._indicesByUUID,$=this._bindings,W=$.length,Z=this.nCachedObjects_,K=J.length;for(let H=0,Y=arguments.length;H!==Y;++H){let X=arguments[H],U=X.uuid,N=Q[U];if(N!==void 0)if(delete Q[U],N<Z){let E=--Z,G=J[E],q=--K,O=J[q];Q[G.uuid]=N,J[N]=G,Q[O.uuid]=E,J[E]=O,J.pop();for(let R=0,D=W;R!==D;++R){let F=$[R],I=F[E],V=F[q];F[N]=I,F[E]=V,F.pop()}}else{let E=--K,G=J[E];if(E>0)Q[G.uuid]=N;J[N]=G,J.pop();for(let q=0,O=W;q!==O;++q){let R=$[q];R[N]=R[E],R.pop()}}}this.nCachedObjects_=Z}subscribe_(J,Q){let $=this._bindingsIndicesByPath,W=$[J],Z=this._bindings;if(W!==void 0)return Z[W];let K=this._paths,H=this._parsedPaths,Y=this._objects,X=Y.length,U=this.nCachedObjects_,N=Array(X);W=Z.length,$[J]=W,K.push(J),H.push(Q),Z.push(N);for(let E=U,G=Y.length;E!==G;++E){let q=Y[E];N[E]=new WJ(q,J,Q)}return N}unsubscribe_(J){let Q=this._bindingsIndicesByPath,$=Q[J];if($!==void 0){let W=this._paths,Z=this._parsedPaths,K=this._bindings,H=K.length-1,Y=K[H],X=J[H];Q[X]=$,K[$]=Y,K.pop(),Z[$]=Z[H],Z.pop(),W[$]=W[H],W.pop()}}}class rZ{constructor(J,Q,$=null,W=Q.blendMode){this._mixer=J,this._clip=Q,this._localRoot=$,this.blendMode=W;let Z=Q.tracks,K=Z.length,H=Array(K),Y={endingStart:2400,endingEnd:2400};for(let X=0;X!==K;++X){let U=Z[X].createInterpolant(null);H[X]=U,U.settings=Y}this._interpolantSettings=Y,this._interpolants=H,this._propertyBindings=Array(K),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._restoreTimeScale=null,this._weightInterpolant=null,this.loop=2201,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(J){return this._startTime=J,this}setLoop(J,Q){return this.loop=J,this.repetitions=Q,this}setEffectiveWeight(J){return this.weight=J,this._effectiveWeight=this.enabled?J:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(J){return this._scheduleFading(J,0,1)}fadeOut(J){return this._scheduleFading(J,1,0)}crossFadeFrom(J,Q,$=!1){if(J.fadeOut(Q),this.fadeIn(Q),$===!0){let W=this._clip.duration,Z=J._clip.duration,K=Z/W,H=W/Z;J._restoreTimeScale=J.timeScale,this._restoreTimeScale=this.timeScale,J.warp(1,K,Q),this.warp(H,1,Q)}return this}crossFadeTo(J,Q,$=!1){return J.crossFadeFrom(this,Q,$)}stopFading(){let J=this._weightInterpolant;if(J!==null)this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(J);return this}setEffectiveTimeScale(J){return this.timeScale=J,this._effectiveTimeScale=this.paused?0:J,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(J){return this.timeScale=this._clip.duration/J,this.stopWarping()}syncWith(J){return this.time=J.time,this.timeScale=J.timeScale,this.stopWarping()}halt(J){return this.warp(this._effectiveTimeScale,0,J)}warp(J,Q,$){let W=this._mixer,Z=W.time,K=this.timeScale,H=this._timeScaleInterpolant;if(H===null)H=W._lendControlInterpolant(),this._timeScaleInterpolant=H;let{parameterPositions:Y,sampleValues:X}=H;return Y[0]=Z,Y[1]=Z+$,X[0]=J/K,X[1]=Q/K,this}stopWarping(){let J=this._timeScaleInterpolant;if(J!==null)this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(J);return this._restoreTimeScale=null,this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(J,Q,$,W){if(!this.enabled){this._updateWeight(J);return}let Z=this._startTime;if(Z!==null){let Y=(J-Z)*$;if(Y<0||$===0)Q=0;else this._startTime=null,Q=$*Y}Q*=this._updateTimeScale(J);let K=this._updateTime(Q),H=this._updateWeight(J);if(H>0){let Y=this._interpolants,X=this._propertyBindings;switch(this.blendMode){case 2501:for(let U=0,N=Y.length;U!==N;++U)Y[U].evaluate(K),X[U].accumulateAdditive(H);break;case 2500:default:for(let U=0,N=Y.length;U!==N;++U)Y[U].evaluate(K),X[U].accumulate(W,H)}}}_updateWeight(J){let Q=0;if(this.enabled){Q=this.weight;let $=this._weightInterpolant;if($!==null){let W=$.evaluate(J)[0];if(Q*=W,J>$.parameterPositions[1]){if(this.stopFading(),W===0)this.enabled=!1}}}return this._effectiveWeight=Q,Q}_updateTimeScale(J){let Q=0;if(!this.paused){Q=this.timeScale;let $=this._timeScaleInterpolant;if($!==null){let W=$.evaluate(J)[0];if(Q*=W,J>$.parameterPositions[1]){if(Q===0)this.paused=!0;else{if(this._restoreTimeScale!==null)Q=this._restoreTimeScale;this.timeScale=Q}this.stopWarping()}}}return this._effectiveTimeScale=Q,Q}_updateTime(J){let Q=this._clip.duration,$=this.loop,W=this.time+J,Z=this._loopCount,K=$===2202;if(J===0){if(Z===-1)return W;return K&&(Z&1)===1?Q-W:W}if($===2200){if(Z===-1)this._loopCount=0,this._setEndings(!0,!0,!1);J:{if(W>=Q)W=Q;else if(W<0)W=0;else{this.time=W;break J}if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;this.time=W,this._mixer.dispatchEvent({type:"finished",action:this,direction:J<0?-1:1})}}else{if(Z===-1)if(J>=0)Z=0,this._setEndings(!0,this.repetitions===0,K);else this._setEndings(this.repetitions===0,!0,K);if(W>=Q||W<0){let H=Math.floor(W/Q);W-=Q*H,Z+=Math.abs(H);let Y=this.repetitions-Z;if(Y<=0){if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;W=J>0?Q:0,this.time=W,this._mixer.dispatchEvent({type:"finished",action:this,direction:J>0?1:-1})}else{if(Y===1){let X=J<0;this._setEndings(X,!X,K)}else this._setEndings(!1,!1,K);this._loopCount=Z,this.time=W,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:H})}}else this._loopCount=Z,this.time=W;if(K&&(Z&1)===1)return Q-W}return W}_setEndings(J,Q,$){let W=this._interpolantSettings;if($)W.endingStart=2401,W.endingEnd=2401;else{if(J)W.endingStart=this.zeroSlopeAtStart?2401:2400;else W.endingStart=2402;if(Q)W.endingEnd=this.zeroSlopeAtEnd?2401:2400;else W.endingEnd=2402}}_scheduleFading(J,Q,$){let W=this._mixer,Z=W.time,K=this._weightInterpolant;if(K===null)K=W._lendControlInterpolant(),this._weightInterpolant=K;let{parameterPositions:H,sampleValues:Y}=K;return H[0]=Z,Y[0]=Q,H[1]=Z+J,Y[1]=$,this}}var pE=new Float32Array(1);class AX extends K9{constructor(J){super();if(this._root=J,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(J,Q){let $=J._localRoot||this._root,W=J._clip.tracks,Z=W.length,K=J._propertyBindings,H=J._interpolants,Y=$.uuid,X=this._bindingsByRootAndName,U=X[Y];if(U===void 0)U={},X[Y]=U;for(let N=0;N!==Z;++N){let E=W[N],G=E.name,q=U[G];if(q!==void 0)++q.referenceCount,K[N]=q;else{if(q=K[N],q!==void 0){if(q._cacheIndex===null)++q.referenceCount,this._addInactiveBinding(q,Y,G);continue}let O=Q&&Q._propertyBindings[N].binding.parsedPath;q=new iZ(WJ.create($,G,O),E.ValueTypeName,E.getValueSize()),++q.referenceCount,this._addInactiveBinding(q,Y,G),K[N]=q}H[N].resultBuffer=q.buffer}}_activateAction(J){if(!this._isActiveAction(J)){if(J._cacheIndex===null){let $=(J._localRoot||this._root).uuid,W=J._clip.uuid,Z=this._actionsByClip[W];this._bindAction(J,Z&&Z.knownActions[0]),this._addInactiveAction(J,W,$)}let Q=J._propertyBindings;for(let $=0,W=Q.length;$!==W;++$){let Z=Q[$];if(Z.useCount++===0)this._lendBinding(Z),Z.saveOriginalState()}this._lendAction(J)}}_deactivateAction(J){if(this._isActiveAction(J)){let Q=J._propertyBindings;for(let $=0,W=Q.length;$!==W;++$){let Z=Q[$];if(--Z.useCount===0)Z.restoreOriginalState(),this._takeBackBinding(Z)}this._takeBackAction(J)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let J=this;this.stats={actions:{get total(){return J._actions.length},get inUse(){return J._nActiveActions}},bindings:{get total(){return J._bindings.length},get inUse(){return J._nActiveBindings}},controlInterpolants:{get total(){return J._controlInterpolants.length},get inUse(){return J._nActiveControlInterpolants}}}}_isActiveAction(J){let Q=J._cacheIndex;return Q!==null&&Q<this._nActiveActions}_addInactiveAction(J,Q,$){let W=this._actions,Z=this._actionsByClip,K=Z[Q];if(K===void 0)K={knownActions:[J],actionByRoot:{}},J._byClipCacheIndex=0,Z[Q]=K;else{let H=K.knownActions;J._byClipCacheIndex=H.length,H.push(J)}J._cacheIndex=W.length,W.push(J),K.actionByRoot[$]=J}_removeInactiveAction(J){let Q=this._actions,$=Q[Q.length-1],W=J._cacheIndex;$._cacheIndex=W,Q[W]=$,Q.pop(),J._cacheIndex=null;let Z=J._clip.uuid,K=this._actionsByClip,H=K[Z],Y=H.knownActions,X=Y[Y.length-1],U=J._byClipCacheIndex;X._byClipCacheIndex=U,Y[U]=X,Y.pop(),J._byClipCacheIndex=null;let N=H.actionByRoot,E=(J._localRoot||this._root).uuid;if(delete N[E],Y.length===0)delete K[Z];this._removeInactiveBindingsForAction(J)}_removeInactiveBindingsForAction(J){let Q=J._propertyBindings;for(let $=0,W=Q.length;$!==W;++$){let Z=Q[$];if(--Z.referenceCount===0)this._removeInactiveBinding(Z)}}_lendAction(J){let Q=this._actions,$=J._cacheIndex,W=this._nActiveActions++,Z=Q[W];J._cacheIndex=W,Q[W]=J,Z._cacheIndex=$,Q[$]=Z}_takeBackAction(J){let Q=this._actions,$=J._cacheIndex,W=--this._nActiveActions,Z=Q[W];J._cacheIndex=W,Q[W]=J,Z._cacheIndex=$,Q[$]=Z}_addInactiveBinding(J,Q,$){let W=this._bindingsByRootAndName,Z=this._bindings,K=W[Q];if(K===void 0)K={},W[Q]=K;K[$]=J,J._cacheIndex=Z.length,Z.push(J)}_removeInactiveBinding(J){let Q=this._bindings,$=J.binding,W=$.rootNode.uuid,Z=$.path,K=this._bindingsByRootAndName,H=K[W],Y=Q[Q.length-1],X=J._cacheIndex;if(Y._cacheIndex=X,Q[X]=Y,Q.pop(),delete H[Z],Object.keys(H).length===0)delete K[W]}_lendBinding(J){let Q=this._bindings,$=J._cacheIndex,W=this._nActiveBindings++,Z=Q[W];J._cacheIndex=W,Q[W]=J,Z._cacheIndex=$,Q[$]=Z}_takeBackBinding(J){let Q=this._bindings,$=J._cacheIndex,W=--this._nActiveBindings,Z=Q[W];J._cacheIndex=W,Q[W]=J,Z._cacheIndex=$,Q[$]=Z}_lendControlInterpolant(){let J=this._controlInterpolants,Q=this._nActiveControlInterpolants++,$=J[Q];if($===void 0)$=new eQ(new Float32Array(2),new Float32Array(2),1,pE),$.__cacheIndex=Q,J[Q]=$;return $}_takeBackControlInterpolant(J){let Q=this._controlInterpolants,$=J.__cacheIndex,W=--this._nActiveControlInterpolants,Z=Q[W];J.__cacheIndex=W,Q[W]=J,Z.__cacheIndex=$,Q[$]=Z}clipAction(J,Q,$){let W=Q||this._root,Z=W.uuid,K=typeof J==="string"?N7.findByName(W,J):J,H=K!==null?K.uuid:J,Y=this._actionsByClip[H],X=null;if($===void 0)if(K!==null)$=K.blendMode;else $=2500;if(Y!==void 0){let N=Y.actionByRoot[Z];if(N!==void 0&&N.blendMode===$)return N;if(X=Y.knownActions[0],K===null)K=X._clip}if(K===null)return null;let U=new rZ(this,K,Q,$);return this._bindAction(U,X),this._addInactiveAction(U,H,Z),U}existingAction(J,Q){let $=Q||this._root,W=$.uuid,Z=typeof J==="string"?N7.findByName($,J):J,K=Z?Z.uuid:J,H=this._actionsByClip[K];if(H!==void 0)return H.actionByRoot[W]||null;return null}stopAllAction(){let J=this._actions,Q=this._nActiveActions;for(let $=Q-1;$>=0;--$)J[$].stop();return this}update(J){J*=this.timeScale;let Q=this._actions,$=this._nActiveActions,W=this.time+=J,Z=Math.sign(J),K=this._accuIndex^=1;for(let X=0;X!==$;++X)Q[X]._update(W,J,Z,K);let H=this._bindings,Y=this._nActiveBindings;for(let X=0;X!==Y;++X)H[X].apply(K);return this}setTime(J){this.time=0;for(let Q=0;Q<this._actions.length;Q++)this._actions[Q].time=0;return this.update(J)}getRoot(){return this._root}uncacheClip(J){let Q=this._actions,$=J.uuid,W=this._actionsByClip,Z=W[$];if(Z!==void 0){let K=Z.knownActions;for(let H=0,Y=K.length;H!==Y;++H){let X=K[H];this._deactivateAction(X);let U=X._cacheIndex,N=Q[Q.length-1];X._cacheIndex=null,X._byClipCacheIndex=null,N._cacheIndex=U,Q[U]=N,Q.pop(),this._removeInactiveBindingsForAction(X)}delete W[$]}}uncacheRoot(J){let Q=J.uuid,$=this._actionsByClip;for(let K in $){let H=$[K].actionByRoot,Y=H[Q];if(Y!==void 0)this._deactivateAction(Y),this._removeInactiveAction(Y)}let W=this._bindingsByRootAndName,Z=W[Q];if(Z!==void 0)for(let K in Z){let H=Z[K];H.restoreOriginalState(),this._removeInactiveBinding(H)}}uncacheAction(J,Q){let $=this.existingAction(J,Q);if($!==null)this._deactivateAction($),this._removeInactiveAction($)}}class wX extends VQ{constructor(J=1,Q=1,$=1,W={}){super(J,Q,W);this.isRenderTarget3D=!0,this.depth=$,this.texture=new r7(null,J,Q,$),this._setTextureOptions(W),this.texture.isRenderTargetTexture=!0}}class tZ{constructor(J){this.value=J}clone(){return new tZ(this.value.clone===void 0?this.value:this.value.clone())}}var mE=0;class _X extends K9{constructor(){super();this.isUniformsGroup=!0,Object.defineProperty(this,"id",{value:mE++}),this.name="",this.usage=35044,this.uniforms=[]}add(J){return this.uniforms.push(J),this}remove(J){let Q=this.uniforms.indexOf(J);if(Q!==-1)this.uniforms.splice(Q,1);return this}setName(J){return this.name=J,this}setUsage(J){return this.usage=J,this}dispose(){this.dispatchEvent({type:"dispose"})}copy(J){this.name=J.name,this.usage=J.usage;let Q=J.uniforms;this.uniforms.length=0;for(let $=0,W=Q.length;$<W;$++){let Z=Array.isArray(Q[$])?Q[$]:[Q[$]];for(let K=0;K<Z.length;K++)this.uniforms.push(Z[K].clone())}return this}clone(){return new this.constructor().copy(this)}}class CX extends J6{constructor(J,Q,$=1){super(J,Q);this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=$}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}clone(J){let Q=super.clone(J);return Q.meshPerAttribute=this.meshPerAttribute,Q}toJSON(J){let Q=super.toJSON(J);return Q.isInstancedInterleavedBuffer=!0,Q.meshPerAttribute=this.meshPerAttribute,Q}}class PX{constructor(J,Q,$,W,Z,K=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=J,this.type=Q,this.itemSize=$,this.elementSize=W,this.count=Z,this.normalized=K,this.version=0}set needsUpdate(J){if(J===!0)this.version++}setBuffer(J){return this.buffer=J,this}setType(J,Q){return this.type=J,this.elementSize=Q,this}setItemSize(J){return this.itemSize=J,this}setCount(J){return this.count=J,this}}var LH=new p0;class TX{constructor(J,Q,$=0,W=1/0){this.ray=new y8(J,Q),this.near=$,this.far=W,this.camera=null,this.layers=new t7,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,Q){this.ray.set(J,Q)}setFromCamera(J,Q){if(Q.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(Q.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject(Q).sub(this.ray.origin).normalize(),this.camera=Q;else if(Q.isOrthographicCamera)this.ray.origin.set(J.x,J.y,Q.projectionMatrix.elements[14]).unproject(Q),this.ray.direction.set(0,0,-1).transformDirection(Q.matrixWorld),this.camera=Q;else T0("Raycaster: Unsupported camera type: "+Q.type)}setFromXRController(J){return LH.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(LH),this}intersectObject(J,Q=!0,$=[]){return $W(J,this,$,Q),$.sort(VH),$}intersectObjects(J,Q=!0,$=[]){for(let W=0,Z=J.length;W<Z;W++)$W(J[W],this,$,Q);return $.sort(VH),$}}function VH(J,Q){return J.distance-Q.distance}function $W(J,Q,$,W){let Z=!0;if(J.layers.test(Q.layers)){if(J.raycast(Q,$)===!1)Z=!1}if(Z===!0&&W===!0){let K=J.children;for(let H=0,Y=K.length;H<Y;H++)$W(K[H],Q,$,!0)}}class SX{constructor(J=!0){this.autoStart=J,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,Y0("Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let J=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let Q=performance.now();J=(Q-this.oldTime)/1000,this.oldTime=Q,this.elapsedTime+=J}return J}}class jX{constructor(J=1,Q=0,$=0){this.radius=J,this.phi=Q,this.theta=$}set(J,Q,$){return this.radius=J,this.phi=Q,this.theta=$,this}copy(J){return this.radius=J.radius,this.phi=J.phi,this.theta=J.theta,this}makeSafe(){return this.phi=g0(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){if(this.radius=Math.sqrt(J*J+Q*Q+$*$),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(J,$),this.phi=Math.acos(g0(Q/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class yX{constructor(J=1,Q=0,$=0){this.radius=J,this.theta=Q,this.y=$}set(J,Q,$){return this.radius=J,this.theta=Q,this.y=$,this}copy(J){return this.radius=J.radius,this.theta=J.theta,this.y=J.y,this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){return this.radius=Math.sqrt(J*J+$*$),this.theta=Math.atan2(J,$),this.y=Q,this}clone(){return new this.constructor().copy(this)}}class eZ{static{eZ.prototype.isMatrix2=!0}constructor(J,Q,$,W){if(this.elements=[1,0,0,1],J!==void 0)this.set(J,Q,$,W)}identity(){return this.set(1,0,0,1),this}fromArray(J,Q=0){for(let $=0;$<4;$++)this.elements[$]=J[$+Q];return this}set(J,Q,$,W){let Z=this.elements;return Z[0]=J,Z[2]=Q,Z[1]=$,Z[3]=W,this}}var BH=new a;class JK{constructor(J=new a(1/0,1/0),Q=new a(-1/0,-1/0)){this.isBox2=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=BH.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(J){return this.isEmpty()?J.set(0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,BH).distanceTo(J)}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}}var zH=new P,e6=new P,Z7=new P,K7=new P,o$=new P,dE=new P,lE=new P;class vX{constructor(J=new P,Q=new P){this.start=J,this.end=Q}set(J,Q){return this.start.copy(J),this.end.copy(Q),this}copy(J){return this.start.copy(J.start),this.end.copy(J.end),this}getCenter(J){return J.addVectors(this.start,this.end).multiplyScalar(0.5)}delta(J){return J.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(J,Q){return this.delta(Q).multiplyScalar(J).add(this.start)}closestPointToPointParameter(J,Q){zH.subVectors(J,this.start),e6.subVectors(this.end,this.start);let $=e6.dot(e6);if($===0)return 0;let Z=e6.dot(zH)/$;if(Q)Z=g0(Z,0,1);return Z}closestPointToPoint(J,Q,$){let W=this.closestPointToPointParameter(J,Q);return this.delta($).multiplyScalar(W).add(this.start)}distanceSqToLine3(J,Q=dE,$=lE){let Z,K,H=this.start,Y=J.start,X=this.end,U=J.end;Z7.subVectors(X,H),K7.subVectors(U,Y),o$.subVectors(H,Y);let N=Z7.dot(Z7),E=K7.dot(K7),G=K7.dot(o$);if(N<=0.00000000000000010000000000000001&&E<=0.00000000000000010000000000000001)return Q.copy(H),$.copy(Y),Q.sub($),Q.dot(Q);if(N<=0.00000000000000010000000000000001)Z=0,K=G/E,K=g0(K,0,1);else{let q=Z7.dot(o$);if(E<=0.00000000000000010000000000000001)K=0,Z=g0(-q/N,0,1);else{let O=Z7.dot(K7),R=N*E-O*O;if(R!==0)Z=g0((O*G-q*E)/R,0,1);else Z=0;if(K=(O*Z+G)/E,K<0)K=0,Z=g0(-q/N,0,1);else if(K>1)K=1,Z=g0((O-q)/N,0,1)}}return Q.copy(H).addScaledVector(Z7,Z),$.copy(Y).addScaledVector(K7,K),Q.distanceToSquared($)}applyMatrix4(J){return this.start.applyMatrix4(J),this.end.applyMatrix4(J),this}equals(J){return J.start.equals(this.start)&&J.end.equals(this.end)}clone(){return new this.constructor().copy(this)}}var IH=new P;class fX extends ZJ{constructor(J,Q){super();this.light=J,this.matrixAutoUpdate=!1,this.color=Q,this.type="SpotLightHelper";let $=new u0,W=[0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,-1,0,1,0,0,0,0,1,1,0,0,0,0,-1,1];for(let K=0,H=1,Y=32;K<Y;K++,H++){let X=K/Y*Math.PI*2,U=H/Y*Math.PI*2;W.push(Math.cos(X),Math.sin(X),1,Math.cos(U),Math.sin(U),1)}$.setAttribute("position",new w0(W,3));let Z=new gJ({fog:!1,toneMapped:!1});this.cone=new F9($,Z),this.add(this.cone),this.update()}dispose(){this.cone.geometry.dispose(),this.cone.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),this.parent)this.parent.updateWorldMatrix(!0),this.matrix.copy(this.parent.matrixWorld).invert().multiply(this.light.matrixWorld);else this.matrix.copy(this.light.matrixWorld);this.matrixWorldNeedsUpdate=!0;let J=this.light.distance?this.light.distance:1000,Q=J*Math.tan(this.light.angle);if(this.cone.scale.set(Q,Q,J),IH.setFromMatrixPosition(this.light.target.matrixWorld),this.cone.lookAt(IH),this.color!==void 0)this.cone.material.color.set(this.color);else this.cone.material.color.copy(this.light.color)}}var a9=new P,JQ=new p0,a$=new p0;class bX extends F9{constructor(J){let Q=hX(J),$=new u0,W=[],Z=[];for(let X=0;X<Q.length;X++){let U=Q[X];if(U.parent&&U.parent.isBone)W.push(0,0,0),W.push(0,0,0),Z.push(0,0,0),Z.push(0,0,0)}$.setAttribute("position",new w0(W,3)),$.setAttribute("color",new w0(Z,3));let K=new gJ({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super($,K);this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=J,this.bones=Q,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1;let H=new B0(255),Y=new B0(65280);this.setColors(H,Y)}updateMatrixWorld(J){let Q=this.bones,$=this.geometry,W=$.getAttribute("position");a$.copy(this.root.matrixWorld).invert();for(let Z=0,K=0;Z<Q.length;Z++){let H=Q[Z];if(H.parent&&H.parent.isBone)JQ.multiplyMatrices(a$,H.matrixWorld),a9.setFromMatrixPosition(JQ),W.setXYZ(K,a9.x,a9.y,a9.z),JQ.multiplyMatrices(a$,H.parent.matrixWorld),a9.setFromMatrixPosition(JQ),W.setXYZ(K+1,a9.x,a9.y,a9.z),K+=2}$.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(J)}setColors(J,Q){let W=this.geometry.getAttribute("color");for(let Z=0;Z<W.count;Z+=2)W.setXYZ(Z,J.r,J.g,J.b),W.setXYZ(Z+1,Q.r,Q.g,Q.b);return W.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}function hX(J){let Q=[];if(J.isBone===!0)Q.push(J);for(let $=0;$<J.children.length;$++)Q.push(...hX(J.children[$]));return Q}class xX extends AJ{constructor(J,Q,$){let W=new H6(Q,4,2),Z=new g9({wireframe:!0,fog:!1,toneMapped:!1});super(W,Z);this.light=J,this.color=$,this.type="PointLightHelper",this.matrix=this.light.matrixWorld,this.matrixAutoUpdate=!1,this.update()}dispose(){this.geometry.dispose(),this.material.dispose()}update(){if(this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),this.color!==void 0)this.material.color.set(this.color);else this.material.color.copy(this.light.color)}}var uE=new P,AH=new B0,wH=new B0;class gX extends ZJ{constructor(J,Q,$){super();this.light=J,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.color=$,this.type="HemisphereLightHelper";let W=new K6(Q);if(W.rotateY(Math.PI*0.5),this.material=new g9({wireframe:!0,fog:!1,toneMapped:!1}),this.color===void 0)this.material.vertexColors=!0;let Z=W.getAttribute("position"),K=new Float32Array(Z.count*3);W.setAttribute("color",new YJ(K,3)),this.add(new AJ(W,this.material)),this.update()}dispose(){this.children[0].geometry.dispose(),this.children[0].material.dispose()}update(){let J=this.children[0];if(this.color!==void 0)this.material.color.set(this.color);else{let Q=J.geometry.getAttribute("color");AH.copy(this.light.color),wH.copy(this.light.groundColor);for(let $=0,W=Q.count;$<W;$++){let Z=$<W/2?AH:wH;Q.setXYZ($,Z.r,Z.g,Z.b)}Q.needsUpdate=!0}this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),J.lookAt(uE.setFromMatrixPosition(this.light.matrixWorld).negate())}}class pX extends F9{constructor(J=10,Q=10,$=4473924,W=8947848){$=new B0($),W=new B0(W);let Z=Q/2,K=J/Q,H=J/2,Y=[],X=[];for(let E=0,G=0,q=-H;E<=Q;E++,q+=K){Y.push(-H,0,q,H,0,q),Y.push(q,0,-H,q,0,H);let O=E===Z?$:W;O.toArray(X,G),G+=3,O.toArray(X,G),G+=3,O.toArray(X,G),G+=3,O.toArray(X,G),G+=3}let U=new u0;U.setAttribute("position",new w0(Y,3)),U.setAttribute("color",new w0(X,3));let N=new gJ({vertexColors:!0,toneMapped:!1});super(U,N);this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class mX extends F9{constructor(J=10,Q=16,$=8,W=64,Z=4473924,K=8947848){Z=new B0(Z),K=new B0(K);let H=[],Y=[];if(Q>1)for(let N=0;N<Q;N++){let E=N/Q*(Math.PI*2),G=Math.sin(E)*J,q=Math.cos(E)*J;H.push(0,0,0),H.push(G,0,q);let O=N&1?Z:K;Y.push(O.r,O.g,O.b),Y.push(O.r,O.g,O.b)}for(let N=0;N<$;N++){let E=N&1?Z:K,G=J-J/$*N;for(let q=0;q<W;q++){let O=q/W*(Math.PI*2),R=Math.sin(O)*G,D=Math.cos(O)*G;H.push(R,0,D),Y.push(E.r,E.g,E.b),O=(q+1)/W*(Math.PI*2),R=Math.sin(O)*G,D=Math.cos(O)*G,H.push(R,0,D),Y.push(E.r,E.g,E.b)}}let X=new u0;X.setAttribute("position",new w0(H,3)),X.setAttribute("color",new w0(Y,3));let U=new gJ({vertexColors:!0,toneMapped:!1});super(X,U);this.type="PolarGridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}var _H=new P,QQ=new P,CH=new P;class dX extends ZJ{constructor(J,Q,$){super();if(this.light=J,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.color=$,this.type="DirectionalLightHelper",Q===void 0)Q=1;let W=new u0;W.setAttribute("position",new w0([-Q,Q,0,Q,Q,0,Q,-Q,0,-Q,-Q,0,-Q,Q,0],3));let Z=new gJ({fog:!1,toneMapped:!1});this.lightPlane=new b9(W,Z),this.add(this.lightPlane),W=new u0,W.setAttribute("position",new w0([0,0,0,0,0,1],3)),this.targetLine=new b9(W,Z),this.add(this.targetLine),this.update()}dispose(){this.lightPlane.geometry.dispose(),this.lightPlane.material.dispose(),this.targetLine.geometry.dispose(),this.targetLine.material.dispose()}update(){if(this.matrixWorldNeedsUpdate=!0,this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),_H.setFromMatrixPosition(this.light.matrixWorld),QQ.setFromMatrixPosition(this.light.target.matrixWorld),CH.subVectors(QQ,_H),this.lightPlane.lookAt(QQ),this.color!==void 0)this.lightPlane.material.color.set(this.color),this.targetLine.material.color.set(this.color);else this.lightPlane.material.color.copy(this.light.color),this.targetLine.material.color.copy(this.light.color);this.targetLine.lookAt(QQ),this.targetLine.scale.z=CH.length()}}var $Q=new P,VJ=new U6;class lX extends F9{constructor(J){let Q=new u0,$=new gJ({color:16777215,vertexColors:!0,toneMapped:!1}),W=[],Z=[],K={};H("n1","n2"),H("n2","n4"),H("n4","n3"),H("n3","n1"),H("f1","f2"),H("f2","f4"),H("f4","f3"),H("f3","f1"),H("n1","f1"),H("n2","f2"),H("n3","f3"),H("n4","f4"),H("p","n1"),H("p","n2"),H("p","n3"),H("p","n4"),H("u1","u2"),H("u2","u3"),H("u3","u1"),H("c","t"),H("p","c"),H("cn1","cn2"),H("cn3","cn4"),H("cf1","cf2"),H("cf3","cf4");function H(q,O){Y(q),Y(O)}function Y(q){if(W.push(0,0,0),Z.push(0,0,0),K[q]===void 0)K[q]=[];K[q].push(W.length/3-1)}Q.setAttribute("position",new w0(W,3)),Q.setAttribute("color",new w0(Z,3));super(Q,$);if(this.type="CameraHelper",this.camera=J,this.camera.updateProjectionMatrix)this.camera.updateProjectionMatrix();this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.pointMap=K,this.update();let X=new B0(16755200),U=new B0(16711680),N=new B0(43775),E=new B0(16777215),G=new B0(3355443);this.setColors(X,U,N,E,G)}setColors(J,Q,$,W,Z){let H=this.geometry.getAttribute("color");return H.setXYZ(0,J.r,J.g,J.b),H.setXYZ(1,J.r,J.g,J.b),H.setXYZ(2,J.r,J.g,J.b),H.setXYZ(3,J.r,J.g,J.b),H.setXYZ(4,J.r,J.g,J.b),H.setXYZ(5,J.r,J.g,J.b),H.setXYZ(6,J.r,J.g,J.b),H.setXYZ(7,J.r,J.g,J.b),H.setXYZ(8,J.r,J.g,J.b),H.setXYZ(9,J.r,J.g,J.b),H.setXYZ(10,J.r,J.g,J.b),H.setXYZ(11,J.r,J.g,J.b),H.setXYZ(12,J.r,J.g,J.b),H.setXYZ(13,J.r,J.g,J.b),H.setXYZ(14,J.r,J.g,J.b),H.setXYZ(15,J.r,J.g,J.b),H.setXYZ(16,J.r,J.g,J.b),H.setXYZ(17,J.r,J.g,J.b),H.setXYZ(18,J.r,J.g,J.b),H.setXYZ(19,J.r,J.g,J.b),H.setXYZ(20,J.r,J.g,J.b),H.setXYZ(21,J.r,J.g,J.b),H.setXYZ(22,J.r,J.g,J.b),H.setXYZ(23,J.r,J.g,J.b),H.setXYZ(24,Q.r,Q.g,Q.b),H.setXYZ(25,Q.r,Q.g,Q.b),H.setXYZ(26,Q.r,Q.g,Q.b),H.setXYZ(27,Q.r,Q.g,Q.b),H.setXYZ(28,Q.r,Q.g,Q.b),H.setXYZ(29,Q.r,Q.g,Q.b),H.setXYZ(30,Q.r,Q.g,Q.b),H.setXYZ(31,Q.r,Q.g,Q.b),H.setXYZ(32,$.r,$.g,$.b),H.setXYZ(33,$.r,$.g,$.b),H.setXYZ(34,$.r,$.g,$.b),H.setXYZ(35,$.r,$.g,$.b),H.setXYZ(36,$.r,$.g,$.b),H.setXYZ(37,$.r,$.g,$.b),H.setXYZ(38,W.r,W.g,W.b),H.setXYZ(39,W.r,W.g,W.b),H.setXYZ(40,Z.r,Z.g,Z.b),H.setXYZ(41,Z.r,Z.g,Z.b),H.setXYZ(42,Z.r,Z.g,Z.b),H.setXYZ(43,Z.r,Z.g,Z.b),H.setXYZ(44,Z.r,Z.g,Z.b),H.setXYZ(45,Z.r,Z.g,Z.b),H.setXYZ(46,Z.r,Z.g,Z.b),H.setXYZ(47,Z.r,Z.g,Z.b),H.setXYZ(48,Z.r,Z.g,Z.b),H.setXYZ(49,Z.r,Z.g,Z.b),H.needsUpdate=!0,this}update(){let J=this.geometry,Q=this.pointMap,$=1,W=1,Z,K;if(VJ.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse),this.camera.reversedDepth===!0)Z=1,K=0;else if(this.camera.coordinateSystem===2000)Z=-1,K=1;else if(this.camera.coordinateSystem===2001)Z=0,K=1;else throw Error("THREE.CameraHelper.update(): Invalid coordinate system: "+this.camera.coordinateSystem);IJ("c",Q,J,VJ,0,0,Z),IJ("t",Q,J,VJ,0,0,K),IJ("n1",Q,J,VJ,-1,-1,Z),IJ("n2",Q,J,VJ,1,-1,Z),IJ("n3",Q,J,VJ,-1,1,Z),IJ("n4",Q,J,VJ,1,1,Z),IJ("f1",Q,J,VJ,-1,-1,K),IJ("f2",Q,J,VJ,1,-1,K),IJ("f3",Q,J,VJ,-1,1,K),IJ("f4",Q,J,VJ,1,1,K),IJ("u1",Q,J,VJ,0.7,1.1,Z),IJ("u2",Q,J,VJ,-0.7,1.1,Z),IJ("u3",Q,J,VJ,0,2,Z),IJ("cf1",Q,J,VJ,-1,0,K),IJ("cf2",Q,J,VJ,1,0,K),IJ("cf3",Q,J,VJ,0,-1,K),IJ("cf4",Q,J,VJ,0,1,K),IJ("cn1",Q,J,VJ,-1,0,Z),IJ("cn2",Q,J,VJ,1,0,Z),IJ("cn3",Q,J,VJ,0,-1,Z),IJ("cn4",Q,J,VJ,0,1,Z),J.getAttribute("position").needsUpdate=!0}dispose(){this.geometry.dispose(),this.material.dispose()}}function IJ(J,Q,$,W,Z,K,H){$Q.set(Z,K,H).unproject(W);let Y=Q[J];if(Y!==void 0){let X=$.getAttribute("position");for(let U=0,N=Y.length;U<N;U++)X.setXYZ(Y[U],$Q.x,$Q.y,$Q.z)}}var WQ=new yJ;class uX extends F9{constructor(J,Q=16776960){let $=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),W=new Float32Array(24),Z=new u0;Z.setIndex(new YJ($,1)),Z.setAttribute("position",new YJ(W,3));super(Z,new gJ({color:Q,toneMapped:!1}));this.object=J,this.type="BoxHelper",this.matrixAutoUpdate=!1,this.update()}update(){if(this.object!==void 0)WQ.setFromObject(this.object);if(WQ.isEmpty())return;let{min:J,max:Q}=WQ,$=this.geometry.attributes.position,W=$.array;W[0]=Q.x,W[1]=Q.y,W[2]=Q.z,W[3]=J.x,W[4]=Q.y,W[5]=Q.z,W[6]=J.x,W[7]=J.y,W[8]=Q.z,W[9]=Q.x,W[10]=J.y,W[11]=Q.z,W[12]=Q.x,W[13]=Q.y,W[14]=J.z,W[15]=J.x,W[16]=Q.y,W[17]=J.z,W[18]=J.x,W[19]=J.y,W[20]=J.z,W[21]=Q.x,W[22]=J.y,W[23]=J.z,$.needsUpdate=!0,this.geometry.computeBoundingSphere()}setFromObject(J){return this.object=J,this.update(),this}copy(J,Q){return super.copy(J,Q),this.object=J.object,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class cX extends F9{constructor(J,Q=16776960){let $=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),W=[1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1],Z=new u0;Z.setIndex(new YJ($,1)),Z.setAttribute("position",new w0(W,3));super(Z,new gJ({color:Q,toneMapped:!1}));this.box=J,this.type="Box3Helper",this.geometry.computeBoundingSphere()}updateMatrixWorld(J){let Q=this.box;if(Q.isEmpty())return;Q.getCenter(this.position),Q.getSize(this.scale),this.scale.multiplyScalar(0.5),super.updateMatrixWorld(J)}dispose(){this.geometry.dispose(),this.material.dispose()}}class nX extends b9{constructor(J,Q=1,$=16776960){let W=$,Z=[1,-1,0,-1,1,0,-1,-1,0,1,1,0,-1,1,0,-1,-1,0,1,-1,0,1,1,0],K=new u0;K.setAttribute("position",new w0(Z,3)),K.computeBoundingSphere();super(K,new gJ({color:W,toneMapped:!1}));this.type="PlaneHelper",this.plane=J,this.size=Q;let H=[1,1,0,-1,1,0,-1,-1,0,1,1,0,-1,-1,0,1,-1,0],Y=new u0;Y.setAttribute("position",new w0(H,3)),Y.computeBoundingSphere(),this.add(new AJ(Y,new g9({color:W,opacity:0.2,transparent:!0,depthWrite:!1,toneMapped:!1})))}updateMatrixWorld(J){this.position.set(0,0,0),this.scale.set(0.5*this.size,0.5*this.size,1),this.lookAt(this.plane.normal),this.translateZ(-this.plane.constant),super.updateMatrixWorld(J)}dispose(){this.geometry.dispose(),this.material.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}}var PH=new P,ZQ,r$;class sX extends ZJ{constructor(J=new P(0,0,1),Q=new P(0,0,0),$=1,W=16776960,Z=$*0.2,K=Z*0.2){super();if(this.type="ArrowHelper",ZQ===void 0)ZQ=new u0,ZQ.setAttribute("position",new w0([0,0,0,0,1,0],3)),r$=new W6(0.5,1,5,1),r$.translate(0,-0.5,0);this.position.copy(Q),this.line=new b9(ZQ,new gJ({color:W,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new AJ(r$,new g9({color:W,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(J),this.setLength($,Z,K)}setDirection(J){if(J.y>0.99999)this.quaternion.set(0,0,0,1);else if(J.y<-0.99999)this.quaternion.set(1,0,0,0);else{PH.set(J.z,0,-J.x).normalize();let Q=Math.acos(J.y);this.quaternion.setFromAxisAngle(PH,Q)}}setLength(J,Q=J*0.2,$=Q*0.2){this.line.scale.set(1,Math.max(0.0001,J-Q),1),this.line.updateMatrix(),this.cone.scale.set($,Q,$),this.cone.position.y=J,this.cone.updateMatrix()}setColor(J){this.line.material.color.set(J),this.cone.material.color.set(J)}copy(J){return super.copy(J,!1),this.line.copy(J.line),this.cone.copy(J.cone),this}dispose(){this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}}class iX extends F9{constructor(J=1){let Q=[0,0,0,J,0,0,0,0,0,0,J,0,0,0,0,0,0,J],$=[1,0,0,1,0.6,0,0,1,0,0.6,1,0,0,0,1,0,0.6,1],W=new u0;W.setAttribute("position",new w0(Q,3)),W.setAttribute("color",new w0($,3));let Z=new gJ({vertexColors:!0,toneMapped:!1});super(W,Z);this.type="AxesHelper"}setColors(J,Q,$){let W=new B0,Z=this.geometry.attributes.color.array;return W.set(J),W.toArray(Z,0),W.toArray(Z,3),W.set(Q),W.toArray(Z,6),W.toArray(Z,9),W.set($),W.toArray(Z,12),W.toArray(Z,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class oX{constructor(){this.type="ShapePath",this.color=new B0,this.subPaths=[],this.currentPath=null,this.userData={}}moveTo(J,Q){return this.currentPath=new U7,this.subPaths.push(this.currentPath),this.currentPath.moveTo(J,Q),this}lineTo(J,Q){return this.currentPath.lineTo(J,Q),this}quadraticCurveTo(J,Q,$,W){return this.currentPath.quadraticCurveTo(J,Q,$,W),this}bezierCurveTo(J,Q,$,W,Z,K){return this.currentPath.bezierCurveTo(J,Q,$,W,Z,K),this}splineThru(J){return this.currentPath.splineThru(J),this}toShapes(){function J(Y,X){let U=!1,N=X.length;for(let E=0,G=N-1;E<N;G=E++){let q=X[E],O=X[G];if(q.y>Y.y!==O.y>Y.y&&Y.x<(O.x-q.x)*(Y.y-q.y)/(O.y-q.y)+q.x)U=!U}return U}function Q(Y,X){let U=X.getCenter(new a);if(J(U,Y))return U;let N=U.y,E=[],G=Y.length;for(let q=0;q<G;q++){let O=Y[q],R=Y[(q+1)%G];if(O.y>N!==R.y>N){let D=O.x+(N-O.y)*(R.x-O.x)/(R.y-O.y);E.push(D)}}if(E.length>1)E.sort((q,O)=>q-O),U.x=(E[0]+E[1])/2;return U}let $=this.userData.style&&this.userData.style.fillRule||"nonzero";if($!=="nonzero"&&$!=="evenodd")Y0('Fill-rule "'+$+'" is not supported, falling back to "nonzero".'),$="nonzero";let W=$==="nonzero"?(Y)=>Y!==0:(Y)=>(Y&1)!==0,Z=[];for(let Y of this.subPaths){let X=Y.getPoints();if(X.length<3)continue;let U=G9.area(X);if(U===0)continue;let N=new JK;for(let E=0;E<X.length;E++)N.expandByPoint(X[E]);Z.push({subPath:Y,points:X,boundingBox:N,interiorPoint:Q(X,N),absArea:Math.abs(U),winding:U<0?-1:1,container:null,exclude:!1,role:null})}Z.sort((Y,X)=>X.absArea-Y.absArea);for(let Y=0;Y<Z.length;Y++){let X=Z[Y],U=0;for(let N=Y-1;N>=0;N--){let E=Z[N];if(!E.boundingBox.containsBox(X.boundingBox))continue;if(!J(X.interiorPoint,E.points))continue;X.container=E.exclude?E.container:E,U=E.winding,X.winding+=U;break}if(W(X.winding)===W(U))X.exclude=!0}for(let Y of Z){if(Y.exclude)continue;Y.role=Y.container===null||Y.container.role==="hole"?"outer":"hole"}let K=[],H=new Map;for(let Y of Z){if(Y.exclude||Y.role!=="outer")continue;let X=new M7;X.curves=Y.subPath.curves,K.push(X),H.set(Y,X)}for(let Y of Z){if(Y.exclude||Y.role!=="hole")continue;let X=H.get(Y.container);if(!X)continue;let U=new U7;U.curves=Y.subPath.curves,X.holes.push(U)}return K}}class aX extends K9{constructor(J,Q=null){super();this.object=J,this.domElement=Q,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(J){if(J===void 0){Y0("Controls: connect() now requires an element.");return}if(this.domElement!==null)this.disconnect();this.domElement=J}disconnect(){}dispose(){}update(){}}function cE(J,Q){let $=J.image&&J.image.width?J.image.width/J.image.height:1;if($>Q)J.repeat.x=1,J.repeat.y=$/Q,J.offset.x=0,J.offset.y=(1-J.repeat.y)/2;else J.repeat.x=Q/$,J.repeat.y=1,J.offset.x=(1-J.repeat.x)/2,J.offset.y=0;return J}function nE(J,Q){let $=J.image&&J.image.width?J.image.width/J.image.height:1;if($>Q)J.repeat.x=Q/$,J.repeat.y=1,J.offset.x=(1-J.repeat.x)/2,J.offset.y=0;else J.repeat.x=1,J.repeat.y=$/Q,J.offset.x=0,J.offset.y=(1-J.repeat.y)/2;return J}function sE(J){return J.repeat.x=1,J.repeat.y=1,J.offset.x=0,J.offset.y=0,J}function Y$(J,Q,$,W){let Z=iE(W);switch($){case 1021:return J*Q;case 1028:return J*Q/Z.components*Z.byteLength;case 1029:return J*Q/Z.components*Z.byteLength;case 1030:return J*Q*2/Z.components*Z.byteLength;case 1031:return J*Q*2/Z.components*Z.byteLength;case 1022:return J*Q*3/Z.components*Z.byteLength;case 1023:return J*Q*4/Z.components*Z.byteLength;case 1033:return J*Q*4/Z.components*Z.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max(Q,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max(Q,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor((Q+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor((Q+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor((Q+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor((Q+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor((Q+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor((Q+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor((Q+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor((Q+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor((Q+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor((Q+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor((Q+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor((Q+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor((Q+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil(Q/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil(Q/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil(Q/4)*16}throw Error(`Unable to determine texture byte length for ${$} format.`)}function iE(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${J}.`)}class rX{static contain(J,Q){return cE(J,Q)}static cover(J,Q){return nE(J,Q)}static fill(J){return sE(J)}static getByteLength(J,Q,$,W){return Y$(J,Q,$,W)}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"185"}}));if(typeof window<"u")if(window.__THREE__)Y0("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="185";function LU(){let J=null,Q=!1,$=null,W=null;function Z(K,H){$(K,H),W=J.requestAnimationFrame(Z)}return{start:function(){if(Q===!0)return;if($===null)return;if(J===null)return;W=J.requestAnimationFrame(Z),Q=!0},stop:function(){if(J!==null)J.cancelAnimationFrame(W);Q=!1},setAnimationLoop:function(K){$=K},setContext:function(K){J=K}}}function oE(J){let Q=new WeakMap;function $(Y,X){let{array:U,usage:N}=Y,E=U.byteLength,G=J.createBuffer();J.bindBuffer(X,G),J.bufferData(X,U,N),Y.onUploadCallback();let q;if(U instanceof Float32Array)q=J.FLOAT;else if(typeof Float16Array<"u"&&U instanceof Float16Array)q=J.HALF_FLOAT;else if(U instanceof Uint16Array)if(Y.isFloat16BufferAttribute)q=J.HALF_FLOAT;else q=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)q=J.SHORT;else if(U instanceof Uint32Array)q=J.UNSIGNED_INT;else if(U instanceof Int32Array)q=J.INT;else if(U instanceof Int8Array)q=J.BYTE;else if(U instanceof Uint8Array)q=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)q=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:G,type:q,bytesPerElement:U.BYTES_PER_ELEMENT,version:Y.version,size:E}}function W(Y,X,U){let{array:N,updateRanges:E}=X;if(J.bindBuffer(U,Y),E.length===0)J.bufferSubData(U,0,N);else{E.sort((q,O)=>q.start-O.start);let G=0;for(let q=1;q<E.length;q++){let O=E[G],R=E[q];if(R.start<=O.start+O.count+1)O.count=Math.max(O.count,R.start+R.count-O.start);else++G,E[G]=R}E.length=G+1;for(let q=0,O=E.length;q<O;q++){let R=E[q];J.bufferSubData(U,R.start*N.BYTES_PER_ELEMENT,N,R.start,R.count)}X.clearUpdateRanges()}X.onUploadCallback()}function Z(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;return Q.get(Y)}function K(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;let X=Q.get(Y);if(X)J.deleteBuffer(X.buffer),Q.delete(Y)}function H(Y,X){if(Y.isInterleavedBufferAttribute)Y=Y.data;if(Y.isGLBufferAttribute){let N=Q.get(Y);if(!N||N.version<Y.version)Q.set(Y,{buffer:Y.buffer,type:Y.type,bytesPerElement:Y.elementSize,version:Y.version});return}let U=Q.get(Y);if(U===void 0)Q.set(Y,$(Y,X));else if(U.version<Y.version){if(U.size!==Y.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");W(U.buffer,Y,X),U.version=Y.version}}return{get:Z,remove:K,update:H}}var aE=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,rE=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,tE=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,eE=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,J5=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Q5=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,$5=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,W5=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Z5=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,K5=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,H5=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Y5=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,X5=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,U5=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,G5=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,N5=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,E5=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,q5=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,F5=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,D5=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,O5=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,R5=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,k5=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,M5=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,L5=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,V5=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,B5=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,z5=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,I5=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,A5=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,w5="gl_FragColor = linearToOutputTexel( gl_FragColor );",_5=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,C5=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,P5=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,T5=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,S5=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,j5=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,y5=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,v5=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,f5=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,b5=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,h5=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,x5=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,g5=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,p5=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,m5=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,d5=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,l5=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,u5=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,c5=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,n5=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,s5=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,i5=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,o5=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,a5=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,r5=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,t5=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,e5=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Jq=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Qq=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,$q=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Wq=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Zq=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Kq=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Hq=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Yq=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Xq=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Uq=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Gq=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Nq=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Eq=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,qq=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Fq=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Dq=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Oq=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rq=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kq=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Mq=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Lq=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Vq=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Bq=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,zq=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Iq=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Aq=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,wq=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,_q=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Cq=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Pq=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Tq=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Sq=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,jq=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,yq=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,vq=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,fq=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,bq=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,hq=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,xq=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,gq=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,pq=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,mq=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,dq=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,lq=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,uq=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,cq=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,nq=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,sq=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,iq=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,oq=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,aq=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,rq=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tq=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,eq=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,JF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,QF=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$F=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,WF=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,ZF=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,KF=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,HF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,YF=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,XF=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,UF=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,GF=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,NF=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,EF=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,qF=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,FF=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,DF=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,OF=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,RF=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,kF=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,MF=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,LF=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,VF=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,BF=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,zF=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,IF=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,AF=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,wF=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_F=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,CF=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,PF=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,a0={alphahash_fragment:aE,alphahash_pars_fragment:rE,alphamap_fragment:tE,alphamap_pars_fragment:eE,alphatest_fragment:J5,alphatest_pars_fragment:Q5,aomap_fragment:$5,aomap_pars_fragment:W5,batching_pars_vertex:Z5,batching_vertex:K5,begin_vertex:H5,beginnormal_vertex:Y5,bsdfs:X5,iridescence_fragment:U5,bumpmap_pars_fragment:G5,clipping_planes_fragment:N5,clipping_planes_pars_fragment:E5,clipping_planes_pars_vertex:q5,clipping_planes_vertex:F5,color_fragment:D5,color_pars_fragment:O5,color_pars_vertex:R5,color_vertex:k5,common:M5,cube_uv_reflection_fragment:L5,defaultnormal_vertex:V5,displacementmap_pars_vertex:B5,displacementmap_vertex:z5,emissivemap_fragment:I5,emissivemap_pars_fragment:A5,colorspace_fragment:w5,colorspace_pars_fragment:_5,envmap_fragment:C5,envmap_common_pars_fragment:P5,envmap_pars_fragment:T5,envmap_pars_vertex:S5,envmap_physical_pars_fragment:d5,envmap_vertex:j5,fog_vertex:y5,fog_pars_vertex:v5,fog_fragment:f5,fog_pars_fragment:b5,gradientmap_pars_fragment:h5,lightmap_pars_fragment:x5,lights_lambert_fragment:g5,lights_lambert_pars_fragment:p5,lights_pars_begin:m5,lights_toon_fragment:l5,lights_toon_pars_fragment:u5,lights_phong_fragment:c5,lights_phong_pars_fragment:n5,lights_physical_fragment:s5,lights_physical_pars_fragment:i5,lights_fragment_begin:o5,lights_fragment_maps:a5,lights_fragment_end:r5,lightprobes_pars_fragment:t5,logdepthbuf_fragment:e5,logdepthbuf_pars_fragment:Jq,logdepthbuf_pars_vertex:Qq,logdepthbuf_vertex:$q,map_fragment:Wq,map_pars_fragment:Zq,map_particle_fragment:Kq,map_particle_pars_fragment:Hq,metalnessmap_fragment:Yq,metalnessmap_pars_fragment:Xq,morphinstance_vertex:Uq,morphcolor_vertex:Gq,morphnormal_vertex:Nq,morphtarget_pars_vertex:Eq,morphtarget_vertex:qq,normal_fragment_begin:Fq,normal_fragment_maps:Dq,normal_pars_fragment:Oq,normal_pars_vertex:Rq,normal_vertex:kq,normalmap_pars_fragment:Mq,clearcoat_normal_fragment_begin:Lq,clearcoat_normal_fragment_maps:Vq,clearcoat_pars_fragment:Bq,iridescence_pars_fragment:zq,opaque_fragment:Iq,packing:Aq,premultiplied_alpha_fragment:wq,project_vertex:_q,dithering_fragment:Cq,dithering_pars_fragment:Pq,roughnessmap_fragment:Tq,roughnessmap_pars_fragment:Sq,shadowmap_pars_fragment:jq,shadowmap_pars_vertex:yq,shadowmap_vertex:vq,shadowmask_pars_fragment:fq,skinbase_vertex:bq,skinning_pars_vertex:hq,skinning_vertex:xq,skinnormal_vertex:gq,specularmap_fragment:pq,specularmap_pars_fragment:mq,tonemapping_fragment:dq,tonemapping_pars_fragment:lq,transmission_fragment:uq,transmission_pars_fragment:cq,uv_pars_fragment:nq,uv_pars_vertex:sq,uv_vertex:iq,worldpos_vertex:oq,background_vert:aq,background_frag:rq,backgroundCube_vert:tq,backgroundCube_frag:eq,cube_vert:JF,cube_frag:QF,depth_vert:$F,depth_frag:WF,distance_vert:ZF,distance_frag:KF,equirect_vert:HF,equirect_frag:YF,linedashed_vert:XF,linedashed_frag:UF,meshbasic_vert:GF,meshbasic_frag:NF,meshlambert_vert:EF,meshlambert_frag:qF,meshmatcap_vert:FF,meshmatcap_frag:DF,meshnormal_vert:OF,meshnormal_frag:RF,meshphong_vert:kF,meshphong_frag:MF,meshphysical_vert:LF,meshphysical_frag:VF,meshtoon_vert:BF,meshtoon_frag:zF,points_vert:IF,points_frag:AF,shadow_vert:wF,shadow_frag:_F,sprite_vert:CF,sprite_frag:PF},D0={common:{diffuse:{value:new B0(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new l0},alphaMap:{value:null},alphaMapTransform:{value:new l0},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new l0}},envmap:{envMap:{value:null},envMapRotation:{value:new l0},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new l0}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new l0}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new l0},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new l0},normalScale:{value:new a(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new l0},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new l0}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new l0}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new l0}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new B0(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new P},probesMax:{value:new P},probesResolution:{value:new P}},points:{diffuse:{value:new B0(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new l0},alphaTest:{value:0},uvTransform:{value:new l0}},sprite:{diffuse:{value:new B0(16777215)},opacity:{value:1},center:{value:new a(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new l0},alphaMap:{value:null},alphaMapTransform:{value:new l0},alphaTest:{value:0}}},I9={basic:{uniforms:pJ([D0.common,D0.specularmap,D0.envmap,D0.aomap,D0.lightmap,D0.fog]),vertexShader:a0.meshbasic_vert,fragmentShader:a0.meshbasic_frag},lambert:{uniforms:pJ([D0.common,D0.specularmap,D0.envmap,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.fog,D0.lights,{emissive:{value:new B0(0)},envMapIntensity:{value:1}}]),vertexShader:a0.meshlambert_vert,fragmentShader:a0.meshlambert_frag},phong:{uniforms:pJ([D0.common,D0.specularmap,D0.envmap,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.fog,D0.lights,{emissive:{value:new B0(0)},specular:{value:new B0(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:a0.meshphong_vert,fragmentShader:a0.meshphong_frag},standard:{uniforms:pJ([D0.common,D0.envmap,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.roughnessmap,D0.metalnessmap,D0.fog,D0.lights,{emissive:{value:new B0(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:a0.meshphysical_vert,fragmentShader:a0.meshphysical_frag},toon:{uniforms:pJ([D0.common,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.gradientmap,D0.fog,D0.lights,{emissive:{value:new B0(0)}}]),vertexShader:a0.meshtoon_vert,fragmentShader:a0.meshtoon_frag},matcap:{uniforms:pJ([D0.common,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.fog,{matcap:{value:null}}]),vertexShader:a0.meshmatcap_vert,fragmentShader:a0.meshmatcap_frag},points:{uniforms:pJ([D0.points,D0.fog]),vertexShader:a0.points_vert,fragmentShader:a0.points_frag},dashed:{uniforms:pJ([D0.common,D0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:a0.linedashed_vert,fragmentShader:a0.linedashed_frag},depth:{uniforms:pJ([D0.common,D0.displacementmap]),vertexShader:a0.depth_vert,fragmentShader:a0.depth_frag},normal:{uniforms:pJ([D0.common,D0.bumpmap,D0.normalmap,D0.displacementmap,{opacity:{value:1}}]),vertexShader:a0.meshnormal_vert,fragmentShader:a0.meshnormal_frag},sprite:{uniforms:pJ([D0.sprite,D0.fog]),vertexShader:a0.sprite_vert,fragmentShader:a0.sprite_frag},background:{uniforms:{uvTransform:{value:new l0},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:a0.background_vert,fragmentShader:a0.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new l0}},vertexShader:a0.backgroundCube_vert,fragmentShader:a0.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:a0.cube_vert,fragmentShader:a0.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:a0.equirect_vert,fragmentShader:a0.equirect_frag},distance:{uniforms:pJ([D0.common,D0.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:a0.distance_vert,fragmentShader:a0.distance_frag},shadow:{uniforms:pJ([D0.lights,D0.fog,{color:{value:new B0(0)},opacity:{value:1}}]),vertexShader:a0.shadow_vert,fragmentShader:a0.shadow_frag}};I9.physical={uniforms:pJ([I9.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new l0},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new l0},clearcoatNormalScale:{value:new a(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new l0},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new l0},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new l0},sheen:{value:0},sheenColor:{value:new B0(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new l0},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new l0},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new l0},transmissionSamplerSize:{value:new a},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new l0},attenuationDistance:{value:0},attenuationColor:{value:new B0(0)},specularColor:{value:new B0(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new l0},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new l0},anisotropyVector:{value:new a},anisotropyMap:{value:null},anisotropyMapTransform:{value:new l0}}]),vertexShader:a0.meshphysical_vert,fragmentShader:a0.meshphysical_frag};var X$={r:0,b:0,g:0},TF=new p0,VU=new l0;VU.set(-1,0,0,0,1,0,0,0,1);function SF(J,Q,$,W,Z,K){let H=new B0(0),Y=Z===!0?0:1,X,U,N=null,E=0,G=null;function q(I){let V=I.isScene===!0?I.background:null;if(V&&V.isTexture){let M=I.backgroundBlurriness>0;V=Q.get(V,M)}return V}function O(I){let V=!1,M=q(I);if(M===null)D(H,Y);else if(M&&M.isColor)D(M,1),V=!0;let w=J.xr.getEnvironmentBlendMode();if(w==="additive")$.buffers.color.setClear(0,0,0,1,K);else if(w==="alpha-blend")$.buffers.color.setClear(0,0,0,0,K);if(J.autoClear||V)$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function R(I,V){let M=q(V);if(M&&(M.isCubeTexture||M.mapping===s7)){if(U===void 0)U=new AJ(new v8(1,1,1),new Q9({name:"BackgroundCubeMaterial",uniforms:f8(I9.backgroundCube.uniforms),vertexShader:I9.backgroundCube.vertexShader,fragmentShader:I9.backgroundCube.fragmentShader,side:sJ,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(w,_,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),W.update(U);if(U.material.uniforms.envMap.value=M,U.material.uniforms.backgroundBlurriness.value=V.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=V.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(TF.makeRotationFromEuler(V.backgroundRotation)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1)U.material.uniforms.backgroundRotation.value.premultiply(VU);if(U.material.toneMapped=JJ.getTransfer(M.colorSpace)!==qJ,N!==M||E!==M.version||G!==J.toneMapping)U.material.needsUpdate=!0,N=M,E=M.version,G=J.toneMapping;U.layers.enableAll(),I.unshift(U,U.geometry,U.material,0,0,null)}else if(M&&M.isTexture){if(X===void 0)X=new AJ(new L7(2,2),new Q9({name:"BackgroundMaterial",uniforms:f8(I9.background.uniforms),vertexShader:I9.background.vertexShader,fragmentShader:I9.background.fragmentShader,side:F7,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),X.geometry.deleteAttribute("normal"),Object.defineProperty(X.material,"map",{get:function(){return this.uniforms.t2D.value}}),W.update(X);if(X.material.uniforms.t2D.value=M,X.material.uniforms.backgroundIntensity.value=V.backgroundIntensity,X.material.toneMapped=JJ.getTransfer(M.colorSpace)!==qJ,M.matrixAutoUpdate===!0)M.updateMatrix();if(X.material.uniforms.uvTransform.value.copy(M.matrix),N!==M||E!==M.version||G!==J.toneMapping)X.material.needsUpdate=!0,N=M,E=M.version,G=J.toneMapping;X.layers.enableAll(),I.unshift(X,X.geometry,X.material,0,0,null)}}function D(I,V){I.getRGB(X$,zZ(J)),$.buffers.color.setClear(X$.r,X$.g,X$.b,V,K)}function F(){if(U!==void 0)U.geometry.dispose(),U.material.dispose(),U=void 0;if(X!==void 0)X.geometry.dispose(),X.material.dispose(),X=void 0}return{getClearColor:function(){return H},setClearColor:function(I,V=1){H.set(I),Y=V,D(H,Y)},getClearAlpha:function(){return Y},setClearAlpha:function(I){Y=I,D(H,Y)},render:O,addToRenderList:R,dispose:F}}function jF(J,Q){let $=J.getParameter(J.MAX_VERTEX_ATTRIBS),W={},Z=G(null),K=Z,H=!1;function Y(T,p,n,b,u){let l=!1,h=E(T,b,n,p);if(K!==h)K=h,U(K.object);if(l=q(T,b,n,u),l)O(T,b,n,u);if(u!==null)Q.update(u,J.ELEMENT_ARRAY_BUFFER);if(l||H){if(H=!1,M(T,p,n,b),u!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,Q.get(u).buffer)}}function X(){return J.createVertexArray()}function U(T){return J.bindVertexArray(T)}function N(T){return J.deleteVertexArray(T)}function E(T,p,n,b){let u=b.wireframe===!0,l=W[p.id];if(l===void 0)l={},W[p.id]=l;let h=T.isInstancedMesh===!0?T.id:0,r=l[h];if(r===void 0)r={},l[h]=r;let W0=r[n.id];if(W0===void 0)W0={},r[n.id]=W0;let H0=W0[u];if(H0===void 0)H0=G(X()),W0[u]=H0;return H0}function G(T){let p=[],n=[],b=[];for(let u=0;u<$;u++)p[u]=0,n[u]=0,b[u]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:p,enabledAttributes:n,attributeDivisors:b,object:T,attributes:{},index:null}}function q(T,p,n,b){let u=K.attributes,l=p.attributes,h=0,r=n.getAttributes();for(let W0 in r)if(r[W0].location>=0){let C0=u[W0],L0=l[W0];if(L0===void 0){if(W0==="instanceMatrix"&&T.instanceMatrix)L0=T.instanceMatrix;if(W0==="instanceColor"&&T.instanceColor)L0=T.instanceColor}if(C0===void 0)return!0;if(C0.attribute!==L0)return!0;if(L0&&C0.data!==L0.data)return!0;h++}if(K.attributesNum!==h)return!0;if(K.index!==b)return!0;return!1}function O(T,p,n,b){let u={},l=p.attributes,h=0,r=n.getAttributes();for(let W0 in r)if(r[W0].location>=0){let C0=l[W0];if(C0===void 0){if(W0==="instanceMatrix"&&T.instanceMatrix)C0=T.instanceMatrix;if(W0==="instanceColor"&&T.instanceColor)C0=T.instanceColor}let L0={};if(L0.attribute=C0,C0&&C0.data)L0.data=C0.data;u[W0]=L0,h++}K.attributes=u,K.attributesNum=h,K.index=b}function R(){let T=K.newAttributes;for(let p=0,n=T.length;p<n;p++)T[p]=0}function D(T){F(T,0)}function F(T,p){let{newAttributes:n,enabledAttributes:b,attributeDivisors:u}=K;if(n[T]=1,b[T]===0)J.enableVertexAttribArray(T),b[T]=1;if(u[T]!==p)J.vertexAttribDivisor(T,p),u[T]=p}function I(){let{newAttributes:T,enabledAttributes:p}=K;for(let n=0,b=p.length;n<b;n++)if(p[n]!==T[n])J.disableVertexAttribArray(n),p[n]=0}function V(T,p,n,b,u,l,h){if(h===!0)J.vertexAttribIPointer(T,p,n,u,l);else J.vertexAttribPointer(T,p,n,b,u,l)}function M(T,p,n,b){R();let u=b.attributes,l=n.getAttributes(),h=p.defaultAttributeValues;for(let r in l){let W0=l[r];if(W0.location>=0){let H0=u[r];if(H0===void 0){if(r==="instanceMatrix"&&T.instanceMatrix)H0=T.instanceMatrix;if(r==="instanceColor"&&T.instanceColor)H0=T.instanceColor}if(H0!==void 0){let{normalized:C0,itemSize:L0}=H0,UJ=Q.get(H0);if(UJ===void 0)continue;let{buffer:HJ,type:i,bytesPerElement:X0}=UJ,V0=i===J.INT||i===J.UNSIGNED_INT||H0.gpuType===DW;if(H0.isInterleavedBufferAttribute){let N0=H0.data,b0=N0.stride,QJ=H0.offset;if(N0.isInstancedInterleavedBuffer){for(let m0=0;m0<W0.locationSize;m0++)F(W0.location+m0,N0.meshPerAttribute);if(T.isInstancedMesh!==!0&&b._maxInstanceCount===void 0)b._maxInstanceCount=N0.meshPerAttribute*N0.count}else for(let m0=0;m0<W0.locationSize;m0++)D(W0.location+m0);J.bindBuffer(J.ARRAY_BUFFER,HJ);for(let m0=0;m0<W0.locationSize;m0++)V(W0.location+m0,L0/W0.locationSize,i,C0,b0*X0,(QJ+L0/W0.locationSize*m0)*X0,V0)}else{if(H0.isInstancedBufferAttribute){for(let N0=0;N0<W0.locationSize;N0++)F(W0.location+N0,H0.meshPerAttribute);if(T.isInstancedMesh!==!0&&b._maxInstanceCount===void 0)b._maxInstanceCount=H0.meshPerAttribute*H0.count}else for(let N0=0;N0<W0.locationSize;N0++)D(W0.location+N0);J.bindBuffer(J.ARRAY_BUFFER,HJ);for(let N0=0;N0<W0.locationSize;N0++)V(W0.location+N0,L0/W0.locationSize,i,C0,L0*X0,L0/W0.locationSize*N0*X0,V0)}}else if(h!==void 0){let C0=h[r];if(C0!==void 0)switch(C0.length){case 2:J.vertexAttrib2fv(W0.location,C0);break;case 3:J.vertexAttrib3fv(W0.location,C0);break;case 4:J.vertexAttrib4fv(W0.location,C0);break;default:J.vertexAttrib1fv(W0.location,C0)}}}}I()}function w(){B();for(let T in W){let p=W[T];for(let n in p){let b=p[n];for(let u in b){let l=b[u];for(let h in l)N(l[h].object),delete l[h];delete b[u]}}delete W[T]}}function _(T){if(W[T.id]===void 0)return;let p=W[T.id];for(let n in p){let b=p[n];for(let u in b){let l=b[u];for(let h in l)N(l[h].object),delete l[h];delete b[u]}}delete W[T.id]}function C(T){for(let p in W){let n=W[p];for(let b in n){let u=n[b];if(u[T.id]===void 0)continue;let l=u[T.id];for(let h in l)N(l[h].object),delete l[h];delete u[T.id]}}}function k(T){for(let p in W){let n=W[p],b=T.isInstancedMesh===!0?T.id:0,u=n[b];if(u===void 0)continue;for(let l in u){let h=u[l];for(let r in h)N(h[r].object),delete h[r];delete u[l]}if(delete n[b],Object.keys(n).length===0)delete W[p]}}function B(){if(f(),H=!0,K===Z)return;K=Z,U(K.object)}function f(){Z.geometry=null,Z.program=null,Z.wireframe=!1}return{setup:Y,reset:B,resetDefaultState:f,dispose:w,releaseStatesOfGeometry:_,releaseStatesOfObject:k,releaseStatesOfProgram:C,initAttributes:R,enableAttribute:D,disableUnusedAttributes:I}}function yF(J,Q,$){let W;function Z(X){W=X}function K(X,U){J.drawArrays(W,X,U),$.update(U,W,1)}function H(X,U,N){if(N===0)return;J.drawArraysInstanced(W,X,U,N),$.update(U,W,N)}function Y(X,U,N){if(N===0)return;Q.get("WEBGL_multi_draw").multiDrawArraysWEBGL(W,X,0,U,0,N);let G=0;for(let q=0;q<N;q++)G+=U[q];$.update(G,W,1)}this.setMode=Z,this.render=K,this.renderInstances=H,this.renderMultiDraw=Y}function vF(J,Q,$,W){let Z;function K(){if(Z!==void 0)return Z;if(Q.has("EXT_texture_filter_anisotropic")===!0){let C=Q.get("EXT_texture_filter_anisotropic");Z=J.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else Z=0;return Z}function H(C){if(C!==B9&&W.convert(C)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function Y(C){let k=C===x9&&(Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float"));if(C!==q9&&W.convert(C)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==h9&&!k)return!1;return!0}function X(C){if(C==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";C="mediump"}if(C==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=$.precision!==void 0?$.precision:"highp",N=X(U);if(N!==U)Y0("WebGLRenderer:",U,"not supported, using",N,"instead."),U=N;let E=$.logarithmicDepthBuffer===!0,G=$.reversedDepthBuffer===!0&&Q.has("EXT_clip_control");if($.reversedDepthBuffer===!0&&G===!1)Y0("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let q=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),O=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),R=J.getParameter(J.MAX_TEXTURE_SIZE),D=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),F=J.getParameter(J.MAX_VERTEX_ATTRIBS),I=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),V=J.getParameter(J.MAX_VARYING_VECTORS),M=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),w=J.getParameter(J.MAX_SAMPLES),_=J.getParameter(J.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:K,getMaxPrecision:X,textureFormatReadable:H,textureTypeReadable:Y,precision:U,logarithmicDepthBuffer:E,reversedDepthBuffer:G,maxTextures:q,maxVertexTextures:O,maxTextureSize:R,maxCubemapSize:D,maxAttributes:F,maxVertexUniforms:I,maxVaryings:V,maxFragmentUniforms:M,maxSamples:w,samples:_}}function fF(J){let Q=this,$=null,W=0,Z=!1,K=!1,H=new j9,Y=new l0,X={value:null,needsUpdate:!1};this.uniform=X,this.numPlanes=0,this.numIntersection=0,this.init=function(E,G){let q=E.length!==0||G||W!==0||Z;return Z=G,W=E.length,q},this.beginShadows=function(){K=!0,N(null)},this.endShadows=function(){K=!1},this.setGlobalState=function(E,G){$=N(E,G,0)},this.setState=function(E,G,q){let{clippingPlanes:O,clipIntersection:R,clipShadows:D}=E,F=J.get(E);if(!Z||O===null||O.length===0||K&&!D)if(K)N(null);else U();else{let I=K?0:W,V=I*4,M=F.clippingState||null;X.value=M,M=N(O,G,V,q);for(let w=0;w!==V;++w)M[w]=$[w];F.clippingState=M,this.numIntersection=R?this.numPlanes:0,this.numPlanes+=I}};function U(){if(X.value!==$)X.value=$,X.needsUpdate=W>0;Q.numPlanes=W,Q.numIntersection=0}function N(E,G,q,O){let R=E!==null?E.length:0,D=null;if(R!==0){if(D=X.value,O!==!0||D===null){let F=q+R*4,I=G.matrixWorldInverse;if(Y.getNormalMatrix(I),D===null||D.length<F)D=new Float32Array(F);for(let V=0,M=q;V!==R;++V,M+=4)H.copy(E[V]).applyMatrix4(I,Y),H.normal.toArray(D,M),D[M+3]=H.constant}X.value=D,X.needsUpdate=!0}return Q.numPlanes=R,Q.numIntersection=0,D}}var H8=4,tX=[0.125,0.215,0.35,0.446,0.526,0.582],h8=20,bF=256,G6=new V7,eX=new B0,QK=null,$K=0,WK=0,ZK=!1,hF=new P;class YK{constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(J,Q=0,$=0.1,W=100,Z={}){let{size:K=256,position:H=hF}=Z;QK=this._renderer.getRenderTarget(),$K=this._renderer.getActiveCubeFace(),WK=this._renderer.getActiveMipmapLevel(),ZK=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(K);let Y=this._allocateTargets();if(Y.depthBuffer=!0,this._sceneToCubeUV(J,$,W,Y,H),Q>0)this._blur(Y,0,0,Q);return this._applyPMREM(Y),this._cleanup(Y),Y}fromEquirectangular(J,Q=null){return this._fromTexture(J,Q)}fromCubemap(J,Q=null){return this._fromTexture(J,Q)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=$U(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=QU(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodMeshes.length;J++)this._lodMeshes[J].geometry.dispose()}_cleanup(J){this._renderer.setRenderTarget(QK,$K,WK),this._renderer.xr.enabled=ZK,J.scissorTest=!1,B7(J,0,0,J.width,J.height)}_fromTexture(J,Q){if(J.mapping===O7||J.mapping===_8)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);QK=this._renderer.getRenderTarget(),$K=this._renderer.getActiveCubeFace(),WK=this._renderer.getActiveMipmapLevel(),ZK=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let $=Q||this._allocateTargets();return this._textureToCubeUV(J,$),this._applyPMREM($),this._cleanup($),$}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),Q=4*this._cubeSize,$={magFilter:iJ,minFilter:iJ,generateMipmaps:!1,type:x9,format:B9,colorSpace:tW,depthBuffer:!1},W=JU(J,Q,$);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==Q){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=JU(J,Q,$);let{_lodMax:Z}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=xF(Z)),this._blurMaterial=pF(Z,J,Q),this._ggxMaterial=gF(Z,J,Q)}return W}_compileMaterial(J){let Q=new AJ(new u0,J);this._renderer.compile(Q,G6)}_sceneToCubeUV(J,Q,$,W,Z){let Y=new TJ(90,1,Q,$),X=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],N=this._renderer,E=N.autoClear,G=N.toneMapping;if(N.getClearColor(eX),N.toneMapping=E9,N.autoClear=!1,N.state.buffers.depth.getReversed())N.setRenderTarget(W),N.clearDepth(),N.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new AJ(new v8,new g9({name:"PMREM.Background",side:sJ,depthWrite:!1,depthTest:!1}));let O=this._backgroundBox,R=O.material,D=!1,F=J.background;if(F){if(F.isColor)R.color.copy(F),J.background=null,D=!0}else R.color.copy(eX),D=!0;for(let I=0;I<6;I++){let V=I%3;if(V===0)Y.up.set(0,X[I],0),Y.position.set(Z.x,Z.y,Z.z),Y.lookAt(Z.x+U[I],Z.y,Z.z);else if(V===1)Y.up.set(0,0,X[I]),Y.position.set(Z.x,Z.y,Z.z),Y.lookAt(Z.x,Z.y+U[I],Z.z);else Y.up.set(0,X[I],0),Y.position.set(Z.x,Z.y,Z.z),Y.lookAt(Z.x,Z.y,Z.z+U[I]);let M=this._cubeSize;if(B7(W,V*M,I>2?M:0,M,M),N.setRenderTarget(W),D)N.render(O,Y);N.render(J,Y)}N.toneMapping=G,N.autoClear=E,J.background=F}_textureToCubeUV(J,Q){let $=this._renderer,W=J.mapping===O7||J.mapping===_8;if(W){if(this._cubemapMaterial===null)this._cubemapMaterial=$U();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=QU();let Z=W?this._cubemapMaterial:this._equirectMaterial,K=this._lodMeshes[0];K.material=Z;let H=Z.uniforms;H.envMap.value=J;let Y=this._cubeSize;B7(Q,0,0,3*Y,2*Y),$.setRenderTarget(Q),$.render(K,G6)}_applyPMREM(J){let Q=this._renderer,$=Q.autoClear;Q.autoClear=!1;let W=this._lodMeshes.length;for(let Z=1;Z<W;Z++)this._applyGGXFilter(J,Z-1,Z);Q.autoClear=$}_applyGGXFilter(J,Q,$){let W=this._renderer,Z=this._pingPongRenderTarget,K=this._ggxMaterial,H=this._lodMeshes[$];H.material=K;let Y=K.uniforms,X=$/(this._lodMeshes.length-1),U=Q/(this._lodMeshes.length-1),N=Math.sqrt(X*X-U*U),E=0+X*1.25,G=N*E,{_lodMax:q}=this,O=this._sizeLods[$],R=3*O*($>q-H8?$-q+H8:0),D=4*(this._cubeSize-O);Y.envMap.value=J.texture,Y.roughness.value=G,Y.mipInt.value=q-Q,B7(Z,R,D,3*O,2*O),W.setRenderTarget(Z),W.render(H,G6),Y.envMap.value=Z.texture,Y.roughness.value=0,Y.mipInt.value=q-$,B7(J,R,D,3*O,2*O),W.setRenderTarget(J),W.render(H,G6)}_blur(J,Q,$,W,Z){let K=this._pingPongRenderTarget;this._halfBlur(J,K,Q,$,W,"latitudinal",Z),this._halfBlur(K,J,$,$,W,"longitudinal",Z)}_halfBlur(J,Q,$,W,Z,K,H){let Y=this._renderer,X=this._blurMaterial;if(K!=="latitudinal"&&K!=="longitudinal")T0("blur direction must be either latitudinal or longitudinal!");let U=3,N=this._lodMeshes[W];N.material=X;let E=X.uniforms,G=this._sizeLods[$]-1,q=isFinite(Z)?Math.PI/(2*G):2*Math.PI/(2*h8-1),O=Z/q,R=isFinite(Z)?1+Math.floor(U*O):h8;if(R>h8)Y0(`sigmaRadians, ${Z}, is too large and will clip, as it requested ${R} samples when the maximum is set to ${h8}`);let D=[],F=0;for(let _=0;_<h8;++_){let C=_/O,k=Math.exp(-C*C/2);if(D.push(k),_===0)F+=k;else if(_<R)F+=2*k}for(let _=0;_<D.length;_++)D[_]=D[_]/F;if(E.envMap.value=J.texture,E.samples.value=R,E.weights.value=D,E.latitudinal.value=K==="latitudinal",H)E.poleAxis.value=H;let{_lodMax:I}=this;E.dTheta.value=q,E.mipInt.value=I-$;let V=this._sizeLods[W],M=3*V*(W>I-H8?W-I+H8:0),w=4*(this._cubeSize-V);B7(Q,M,w,3*V,2*V),Y.setRenderTarget(Q),Y.render(N,G6)}}function xF(J){let Q=[],$=[],W=[],Z=J,K=J-H8+1+tX.length;for(let H=0;H<K;H++){let Y=Math.pow(2,Z);Q.push(Y);let X=1/Y;if(H>J-H8)X=tX[H-J+H8-1];else if(H===0)X=0;$.push(X);let U=1/(Y-2),N=-U,E=1+U,G=[N,N,E,N,E,E,N,N,E,E,N,E],q=6,O=6,R=3,D=2,F=1,I=new Float32Array(R*O*q),V=new Float32Array(D*O*q),M=new Float32Array(F*O*q);for(let _=0;_<q;_++){let C=_%3*2/3-1,k=_>2?0:-1,B=[C,k,0,C+0.6666666666666666,k,0,C+0.6666666666666666,k+1,0,C,k,0,C+0.6666666666666666,k+1,0,C,k+1,0];I.set(B,R*O*_),V.set(G,D*O*_);let f=[_,_,_,_,_,_];M.set(f,F*O*_)}let w=new u0;if(w.setAttribute("position",new YJ(I,R)),w.setAttribute("uv",new YJ(V,D)),w.setAttribute("faceIndex",new YJ(M,F)),W.push(new AJ(w,null)),Z>H8)Z--}return{lodMeshes:W,sizeLods:Q,sigmas:$}}function JU(J,Q,$){let W=new oJ(J,Q,$);return W.texture.mapping=s7,W.texture.name="PMREM.cubeUv",W.scissorTest=!0,W}function B7(J,Q,$,W,Z){J.viewport.set(Q,$,W,Z),J.scissor.set(Q,$,W,Z)}function gF(J,Q,$){return new Q9({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:bF,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:G$(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:V9,depthTest:!1,depthWrite:!1})}function pF(J,Q,$){let W=new Float32Array(h8),Z=new P(0,1,0);return new Q9({name:"SphericalGaussianBlur",defines:{n:h8,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:W},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:Z}},vertexShader:G$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:V9,depthTest:!1,depthWrite:!1})}function QU(){return new Q9({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:G$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:V9,depthTest:!1,depthWrite:!1})}function $U(){return new Q9({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:G$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:V9,depthTest:!1,depthWrite:!1})}function G$(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class GK extends oJ{constructor(J=1,Q={}){super(J,J,Q);this.isWebGLCubeRenderTarget=!0;let $={width:J,height:J,depth:1},W=[$,$,$,$,$,$];this.texture=new k7(W),this._setTextureOptions(Q),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(J,Q){this.texture.type=Q.type,this.texture.colorSpace=Q.colorSpace,this.texture.generateMipmaps=Q.generateMipmaps,this.texture.minFilter=Q.minFilter,this.texture.magFilter=Q.magFilter;let $={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},W=new v8(5,5,5),Z=new Q9({name:"CubemapFromEquirect",uniforms:f8($.uniforms),vertexShader:$.vertexShader,fragmentShader:$.fragmentShader,side:sJ,blending:V9});Z.uniforms.tEquirect.value=Q;let K=new AJ(W,Z),H=Q.minFilter;if(Q.minFilter===C8)Q.minFilter=iJ;return new uZ(1,10,this).update(J,K),Q.minFilter=H,K.geometry.dispose(),K.material.dispose(),this}clear(J,Q=!0,$=!0,W=!0){let Z=J.getRenderTarget();for(let K=0;K<6;K++)J.setRenderTarget(this,K),J.clear(Q,$,W);J.setRenderTarget(Z)}}function mF(J){let Q=new WeakMap,$=new WeakMap,W=null;function Z(G,q=!1){if(G===null||G===void 0)return null;if(q)return H(G);return K(G)}function K(G){if(G&&G.isTexture){let q=G.mapping;if(q===UQ||q===GQ)if(Q.has(G)){let O=Q.get(G).texture;return Y(O,G.mapping)}else{let O=G.image;if(O&&O.height>0){let R=new GK(O.height);return R.fromEquirectangularTexture(J,G),Q.set(G,R),G.addEventListener("dispose",U),Y(R.texture,G.mapping)}else return null}}return G}function H(G){if(G&&G.isTexture){let q=G.mapping,O=q===UQ||q===GQ,R=q===O7||q===_8;if(O||R){let D=$.get(G),F=D!==void 0?D.texture.pmremVersion:0;if(G.isRenderTargetTexture&&G.pmremVersion!==F){if(W===null)W=new YK(J);return D=O?W.fromEquirectangular(G,D):W.fromCubemap(G,D),D.texture.pmremVersion=G.pmremVersion,$.set(G,D),D.texture}else if(D!==void 0)return D.texture;else{let I=G.image;if(O&&I&&I.height>0||R&&I&&X(I)){if(W===null)W=new YK(J);return D=O?W.fromEquirectangular(G):W.fromCubemap(G),D.texture.pmremVersion=G.pmremVersion,$.set(G,D),G.addEventListener("dispose",N),D.texture}else return null}}}return G}function Y(G,q){if(q===UQ)G.mapping=O7;else if(q===GQ)G.mapping=_8;return G}function X(G){let q=0,O=6;for(let R=0;R<O;R++)if(G[R]!==void 0)q++;return q===O}function U(G){let q=G.target;q.removeEventListener("dispose",U);let O=Q.get(q);if(O!==void 0)Q.delete(q),O.dispose()}function N(G){let q=G.target;q.removeEventListener("dispose",N);let O=$.get(q);if(O!==void 0)$.delete(q),O.dispose()}function E(){if(Q=new WeakMap,$=new WeakMap,W!==null)W.dispose(),W=null}return{get:Z,dispose:E}}function dF(J){let Q={};function $(W){if(Q[W]!==void 0)return Q[W];let Z=J.getExtension(W);return Q[W]=Z,Z}return{has:function(W){return $(W)!==null},init:function(){$("EXT_color_buffer_float"),$("WEBGL_clip_cull_distance"),$("OES_texture_float_linear"),$("EXT_color_buffer_half_float"),$("WEBGL_multisampled_render_to_texture"),$("WEBGL_render_shared_exponent")},get:function(W){let Z=$(W);if(Z===null)r9("WebGLRenderer: "+W+" extension not supported.");return Z}}}function lF(J,Q,$,W){let Z={},K=new WeakMap;function H(E){let G=E.target;if(G.index!==null)Q.remove(G.index);for(let O in G.attributes)Q.remove(G.attributes[O]);G.removeEventListener("dispose",H),delete Z[G.id];let q=K.get(G);if(q)Q.remove(q),K.delete(G);if(W.releaseStatesOfGeometry(G),G.isInstancedBufferGeometry===!0)delete G._maxInstanceCount;$.memory.geometries--}function Y(E,G){if(Z[G.id]===!0)return G;return G.addEventListener("dispose",H),Z[G.id]=!0,$.memory.geometries++,G}function X(E){let G=E.attributes;for(let q in G)Q.update(G[q],J.ARRAY_BUFFER)}function U(E){let G=[],q=E.index,O=E.attributes.position,R=0;if(O===void 0)return;if(q!==null){let I=q.array;R=q.version;for(let V=0,M=I.length;V<M;V+=3){let w=I[V+0],_=I[V+1],C=I[V+2];G.push(w,_,_,C,C,w)}}else{let I=O.array;R=O.version;for(let V=0,M=I.length/3-1;V<M;V+=3){let w=V+0,_=V+1,C=V+2;G.push(w,_,_,C,C,w)}}let D=new(O.count>=65535?AQ:IQ)(G,1);D.version=R;let F=K.get(E);if(F)Q.remove(F);K.set(E,D)}function N(E){let G=K.get(E);if(G){let q=E.index;if(q!==null){if(G.version<q.version)U(E)}}else U(E);return K.get(E)}return{get:Y,update:X,getWireframeAttribute:N}}function uF(J,Q,$){let W;function Z(E){W=E}let K,H;function Y(E){K=E.type,H=E.bytesPerElement}function X(E,G){J.drawElements(W,G,K,E*H),$.update(G,W,1)}function U(E,G,q){if(q===0)return;J.drawElementsInstanced(W,G,K,E*H,q),$.update(G,W,q)}function N(E,G,q){if(q===0)return;Q.get("WEBGL_multi_draw").multiDrawElementsWEBGL(W,G,0,K,E,0,q);let R=0;for(let D=0;D<q;D++)R+=G[D];$.update(R,W,1)}this.setMode=Z,this.setIndex=Y,this.render=X,this.renderInstances=U,this.renderMultiDraw=N}function cF(J){let Q={geometries:0,textures:0},$={frame:0,calls:0,triangles:0,points:0,lines:0};function W(K,H,Y){switch($.calls++,H){case J.TRIANGLES:$.triangles+=Y*(K/3);break;case J.LINES:$.lines+=Y*(K/2);break;case J.LINE_STRIP:$.lines+=Y*(K-1);break;case J.LINE_LOOP:$.lines+=Y*K;break;case J.POINTS:$.points+=Y*K;break;default:T0("WebGLInfo: Unknown draw mode:",H);break}}function Z(){$.calls=0,$.triangles=0,$.points=0,$.lines=0}return{memory:Q,render:$,programs:null,autoReset:!0,reset:Z,update:W}}function nF(J,Q,$){let W=new WeakMap,Z=new XJ;function K(H,Y,X){let U=H.morphTargetInfluences,N=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,E=N!==void 0?N.length:0,G=W.get(Y);if(G===void 0||G.count!==E){let B=function(){C.dispose(),W.delete(Y),Y.removeEventListener("dispose",B)};if(G!==void 0)G.texture.dispose();let q=Y.morphAttributes.position!==void 0,O=Y.morphAttributes.normal!==void 0,R=Y.morphAttributes.color!==void 0,D=Y.morphAttributes.position||[],F=Y.morphAttributes.normal||[],I=Y.morphAttributes.color||[],V=0;if(q===!0)V=1;if(O===!0)V=2;if(R===!0)V=3;let M=Y.attributes.position.count*V,w=1;if(M>Q.maxTextureSize)w=Math.ceil(M/Q.maxTextureSize),M=Q.maxTextureSize;let _=new Float32Array(M*w*4*E),C=new a7(_,M,w,E);C.type=h9,C.needsUpdate=!0;let k=V*4;for(let f=0;f<E;f++){let T=D[f],p=F[f],n=I[f],b=M*w*4*f;for(let u=0;u<T.count;u++){let l=u*k;if(q===!0)Z.fromBufferAttribute(T,u),_[b+l+0]=Z.x,_[b+l+1]=Z.y,_[b+l+2]=Z.z,_[b+l+3]=0;if(O===!0)Z.fromBufferAttribute(p,u),_[b+l+4]=Z.x,_[b+l+5]=Z.y,_[b+l+6]=Z.z,_[b+l+7]=0;if(R===!0)Z.fromBufferAttribute(n,u),_[b+l+8]=Z.x,_[b+l+9]=Z.y,_[b+l+10]=Z.z,_[b+l+11]=n.itemSize===4?Z.w:1}}G={count:E,texture:C,size:new a(M,w)},W.set(Y,G),Y.addEventListener("dispose",B)}if(H.isInstancedMesh===!0&&H.morphTexture!==null)X.getUniforms().setValue(J,"morphTexture",H.morphTexture,$);else{let q=0;for(let R=0;R<U.length;R++)q+=U[R];let O=Y.morphTargetsRelative?1:1-q;X.getUniforms().setValue(J,"morphTargetBaseInfluence",O),X.getUniforms().setValue(J,"morphTargetInfluences",U)}X.getUniforms().setValue(J,"morphTargetsTexture",G.texture,$),X.getUniforms().setValue(J,"morphTargetsTextureSize",G.size)}return{update:K}}function sF(J,Q,$,W,Z){let K=new WeakMap;function H(U){let N=Z.render.frame,E=U.geometry,G=Q.get(U,E);if(K.get(G)!==N)Q.update(G),K.set(G,N);if(U.isInstancedMesh){if(U.hasEventListener("dispose",X)===!1)U.addEventListener("dispose",X);if(K.get(U)!==N){if($.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)$.update(U.instanceColor,J.ARRAY_BUFFER);K.set(U,N)}}if(U.isSkinnedMesh){let q=U.skeleton;if(K.get(q)!==N)q.update(),K.set(q,N)}return G}function Y(){K=new WeakMap}function X(U){let N=U.target;if(N.removeEventListener("dispose",X),W.releaseStatesOfObject(N),$.remove(N.instanceMatrix),N.instanceColor!==null)$.remove(N.instanceColor)}return{update:H,dispose:Y}}var iF={[XW]:"LINEAR_TONE_MAPPING",[UW]:"REINHARD_TONE_MAPPING",[GW]:"CINEON_TONE_MAPPING",[NW]:"ACES_FILMIC_TONE_MAPPING",[qW]:"AGX_TONE_MAPPING",[FW]:"NEUTRAL_TONE_MAPPING",[EW]:"CUSTOM_TONE_MAPPING"};function oF(J,Q,$,W,Z,K){let H=new oJ(Q,$,{type:J,depthBuffer:Z,stencilBuffer:K,samples:W?4:0,depthTexture:Z?new $8(Q,$):void 0}),Y=new oJ(Q,$,{type:x9,depthBuffer:!1,stencilBuffer:!1}),X=new u0;X.setAttribute("position",new w0([-1,3,0,-1,-1,0,3,-1,0],3)),X.setAttribute("uv",new w0([0,2,0,0,2,0],2));let U=new oQ({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),N=new AJ(X,U),E=new V7(-1,1,1,-1,0,1),G=null,q=null,O=!1,R,D=null,F=[],I=!1;this.setSize=function(V,M){H.setSize(V,M),Y.setSize(V,M);for(let w=0;w<F.length;w++){let _=F[w];if(_.setSize)_.setSize(V,M)}},this.setEffects=function(V){F=V,I=F.length>0&&F[0].isRenderPass===!0;let{width:M,height:w}=H;for(let _=0;_<F.length;_++){let C=F[_];if(C.setSize)C.setSize(M,w)}},this.begin=function(V,M){if(O)return!1;if(V.toneMapping===E9&&F.length===0)return!1;if(D=M,M!==null){let{width:w,height:_}=M;if(H.width!==w||H.height!==_)this.setSize(w,_)}if(I===!1)V.setRenderTarget(H);return R=V.toneMapping,V.toneMapping=E9,!0},this.hasRenderPass=function(){return I},this.end=function(V,M){V.toneMapping=R,O=!0;let w=H,_=Y;for(let C=0;C<F.length;C++){let k=F[C];if(k.enabled===!1)continue;if(k.render(V,_,w,M),k.needsSwap!==!1){let B=w;w=_,_=B}}if(G!==V.outputColorSpace||q!==V.toneMapping){if(G=V.outputColorSpace,q=V.toneMapping,U.defines={},JJ.getTransfer(G)===qJ)U.defines.SRGB_TRANSFER="";let C=iF[q];if(C)U.defines[C]="";U.needsUpdate=!0}U.uniforms.tDiffuse.value=w.texture,V.setRenderTarget(D),V.render(N,E),D=null,O=!1},this.isCompositing=function(){return O},this.dispose=function(){if(H.depthTexture)H.depthTexture.dispose();H.dispose(),Y.dispose(),X.dispose(),U.dispose()}}var BU=new kJ,XK=new $8(1,1),zU=new a7,IU=new r7,AU=new k7,WU=[],ZU=[],KU=new Float32Array(16),HU=new Float32Array(9),YU=new Float32Array(4);function z7(J,Q,$){let W=J[0];if(W<=0||W>0)return J;let Z=Q*$,K=WU[Z];if(K===void 0)K=new Float32Array(Z),WU[Z]=K;if(Q!==0){W.toArray(K,0);for(let H=1,Y=0;H!==Q;++H)Y+=$,J[H].toArray(K,Y)}return K}function _J(J,Q){if(J.length!==Q.length)return!1;for(let $=0,W=J.length;$<W;$++)if(J[$]!==Q[$])return!1;return!0}function CJ(J,Q){for(let $=0,W=Q.length;$<W;$++)J[$]=Q[$]}function N$(J,Q){let $=ZU[Q];if($===void 0)$=new Int32Array(Q),ZU[Q]=$;for(let W=0;W!==Q;++W)$[W]=J.allocateTextureUnit();return $}function aF(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1f(this.addr,Q),$[0]=Q}function rF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2f(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(_J($,Q))return;J.uniform2fv(this.addr,Q),CJ($,Q)}}function tF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3f(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else if(Q.r!==void 0){if($[0]!==Q.r||$[1]!==Q.g||$[2]!==Q.b)J.uniform3f(this.addr,Q.r,Q.g,Q.b),$[0]=Q.r,$[1]=Q.g,$[2]=Q.b}else{if(_J($,Q))return;J.uniform3fv(this.addr,Q),CJ($,Q)}}function eF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4f(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(_J($,Q))return;J.uniform4fv(this.addr,Q),CJ($,Q)}}function JD(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(_J($,Q))return;J.uniformMatrix2fv(this.addr,!1,Q),CJ($,Q)}else{if(_J($,W))return;YU.set(W),J.uniformMatrix2fv(this.addr,!1,YU),CJ($,W)}}function QD(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(_J($,Q))return;J.uniformMatrix3fv(this.addr,!1,Q),CJ($,Q)}else{if(_J($,W))return;HU.set(W),J.uniformMatrix3fv(this.addr,!1,HU),CJ($,W)}}function $D(J,Q){let $=this.cache,W=Q.elements;if(W===void 0){if(_J($,Q))return;J.uniformMatrix4fv(this.addr,!1,Q),CJ($,Q)}else{if(_J($,W))return;KU.set(W),J.uniformMatrix4fv(this.addr,!1,KU),CJ($,W)}}function WD(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1i(this.addr,Q),$[0]=Q}function ZD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2i(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(_J($,Q))return;J.uniform2iv(this.addr,Q),CJ($,Q)}}function KD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3i(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(_J($,Q))return;J.uniform3iv(this.addr,Q),CJ($,Q)}}function HD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4i(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(_J($,Q))return;J.uniform4iv(this.addr,Q),CJ($,Q)}}function YD(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1ui(this.addr,Q),$[0]=Q}function XD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2ui(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(_J($,Q))return;J.uniform2uiv(this.addr,Q),CJ($,Q)}}function UD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3ui(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(_J($,Q))return;J.uniform3uiv(this.addr,Q),CJ($,Q)}}function GD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4ui(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(_J($,Q))return;J.uniform4uiv(this.addr,Q),CJ($,Q)}}function ND(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;let K;if(this.type===J.SAMPLER_2D_SHADOW)XK.compareFunction=$.isReversedDepthBuffer()?LQ:MQ,K=XK;else K=BU;$.setTexture2D(Q||K,Z)}function ED(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;$.setTexture3D(Q||IU,Z)}function qD(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;$.setTextureCube(Q||AU,Z)}function FD(J,Q,$){let W=this.cache,Z=$.allocateTextureUnit();if(W[0]!==Z)J.uniform1i(this.addr,Z),W[0]=Z;$.setTexture2DArray(Q||zU,Z)}function DD(J){switch(J){case 5126:return aF;case 35664:return rF;case 35665:return tF;case 35666:return eF;case 35674:return JD;case 35675:return QD;case 35676:return $D;case 5124:case 35670:return WD;case 35667:case 35671:return ZD;case 35668:case 35672:return KD;case 35669:case 35673:return HD;case 5125:return YD;case 36294:return XD;case 36295:return UD;case 36296:return GD;case 35678:case 36198:case 36298:case 36306:case 35682:return ND;case 35679:case 36299:case 36307:return ED;case 35680:case 36300:case 36308:case 36293:return qD;case 36289:case 36303:case 36311:case 36292:return FD}}function OD(J,Q){J.uniform1fv(this.addr,Q)}function RD(J,Q){let $=z7(Q,this.size,2);J.uniform2fv(this.addr,$)}function kD(J,Q){let $=z7(Q,this.size,3);J.uniform3fv(this.addr,$)}function MD(J,Q){let $=z7(Q,this.size,4);J.uniform4fv(this.addr,$)}function LD(J,Q){let $=z7(Q,this.size,4);J.uniformMatrix2fv(this.addr,!1,$)}function VD(J,Q){let $=z7(Q,this.size,9);J.uniformMatrix3fv(this.addr,!1,$)}function BD(J,Q){let $=z7(Q,this.size,16);J.uniformMatrix4fv(this.addr,!1,$)}function zD(J,Q){J.uniform1iv(this.addr,Q)}function ID(J,Q){J.uniform2iv(this.addr,Q)}function AD(J,Q){J.uniform3iv(this.addr,Q)}function wD(J,Q){J.uniform4iv(this.addr,Q)}function _D(J,Q){J.uniform1uiv(this.addr,Q)}function CD(J,Q){J.uniform2uiv(this.addr,Q)}function PD(J,Q){J.uniform3uiv(this.addr,Q)}function TD(J,Q){J.uniform4uiv(this.addr,Q)}function SD(J,Q,$){let W=this.cache,Z=Q.length,K=N$($,Z);if(!_J(W,K))J.uniform1iv(this.addr,K),CJ(W,K);let H;if(this.type===J.SAMPLER_2D_SHADOW)H=XK;else H=BU;for(let Y=0;Y!==Z;++Y)$.setTexture2D(Q[Y]||H,K[Y])}function jD(J,Q,$){let W=this.cache,Z=Q.length,K=N$($,Z);if(!_J(W,K))J.uniform1iv(this.addr,K),CJ(W,K);for(let H=0;H!==Z;++H)$.setTexture3D(Q[H]||IU,K[H])}function yD(J,Q,$){let W=this.cache,Z=Q.length,K=N$($,Z);if(!_J(W,K))J.uniform1iv(this.addr,K),CJ(W,K);for(let H=0;H!==Z;++H)$.setTextureCube(Q[H]||AU,K[H])}function vD(J,Q,$){let W=this.cache,Z=Q.length,K=N$($,Z);if(!_J(W,K))J.uniform1iv(this.addr,K),CJ(W,K);for(let H=0;H!==Z;++H)$.setTexture2DArray(Q[H]||zU,K[H])}function fD(J){switch(J){case 5126:return OD;case 35664:return RD;case 35665:return kD;case 35666:return MD;case 35674:return LD;case 35675:return VD;case 35676:return BD;case 5124:case 35670:return zD;case 35667:case 35671:return ID;case 35668:case 35672:return AD;case 35669:case 35673:return wD;case 5125:return _D;case 36294:return CD;case 36295:return PD;case 36296:return TD;case 35678:case 36198:case 36298:case 36306:case 35682:return SD;case 35679:case 36299:case 36307:return jD;case 35680:case 36300:case 36308:case 36293:return yD;case 36289:case 36303:case 36311:case 36292:return vD}}class wU{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.setValue=DD(Q.type)}}class _U{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.size=Q.size,this.setValue=fD(Q.type)}}class CU{constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,Q,$){let W=this.seq;for(let Z=0,K=W.length;Z!==K;++Z){let H=W[Z];H.setValue(J,Q[H.id],$)}}}var KK=/(\w+)(\])?(\[|\.)?/g;function XU(J,Q){J.seq.push(Q),J.map[Q.id]=Q}function bD(J,Q,$){let W=J.name,Z=W.length;KK.lastIndex=0;while(!0){let K=KK.exec(W),H=KK.lastIndex,Y=K[1],X=K[2]==="]",U=K[3];if(X)Y=Y|0;if(U===void 0||U==="["&&H+2===Z){XU($,U===void 0?new wU(Y,J,Q):new _U(Y,J,Q));break}else{let E=$.map[Y];if(E===void 0)E=new CU(Y),XU($,E);$=E}}}class q6{constructor(J,Q){this.seq=[],this.map={};let $=J.getProgramParameter(Q,J.ACTIVE_UNIFORMS);for(let K=0;K<$;++K){let H=J.getActiveUniform(Q,K),Y=J.getUniformLocation(Q,H.name);bD(H,Y,this)}let W=[],Z=[];for(let K of this.seq)if(K.type===J.SAMPLER_2D_SHADOW||K.type===J.SAMPLER_CUBE_SHADOW||K.type===J.SAMPLER_2D_ARRAY_SHADOW)W.push(K);else Z.push(K);if(W.length>0)this.seq=W.concat(Z)}setValue(J,Q,$,W){let Z=this.map[Q];if(Z!==void 0)Z.setValue(J,$,W)}setOptional(J,Q,$){let W=Q[$];if(W!==void 0)this.setValue(J,$,W)}static upload(J,Q,$,W){for(let Z=0,K=Q.length;Z!==K;++Z){let H=Q[Z],Y=$[H.id];if(Y.needsUpdate!==!1)H.setValue(J,Y.value,W)}}static seqWithValue(J,Q){let $=[];for(let W=0,Z=J.length;W!==Z;++W){let K=J[W];if(K.id in Q)$.push(K)}return $}}function UU(J,Q,$){let W=J.createShader(Q);return J.shaderSource(W,$),J.compileShader(W),W}var hD=37297,xD=0;function gD(J,Q){let $=J.split(`
`),W=[],Z=Math.max(Q-6,0),K=Math.min(Q+6,$.length);for(let H=Z;H<K;H++){let Y=H+1;W.push(`${Y===Q?">":" "} ${Y}: ${$[H]}`)}return W.join(`
`)}var GU=new l0;function pD(J){JJ._getMatrix(GU,JJ.workingColorSpace,J);let Q=`mat3( ${GU.elements.map(($)=>$.toFixed(4))} )`;switch(JJ.getTransfer(J)){case eW:return[Q,"LinearTransferOETF"];case qJ:return[Q,"sRGBTransferOETF"];default:return Y0("WebGLProgram: Unsupported color space: ",J),[Q,"LinearTransferOETF"]}}function NU(J,Q,$){let W=J.getShaderParameter(Q,J.COMPILE_STATUS),K=(J.getShaderInfoLog(Q)||"").trim();if(W&&K==="")return"";let H=/ERROR: 0:(\d+)/.exec(K);if(H){let Y=parseInt(H[1]);return $.toUpperCase()+`

`+K+`

`+gD(J.getShaderSource(Q),Y)}else return K}function mD(J,Q){let $=pD(Q);return[`vec4 ${J}( vec4 value ) {`,`	return ${$[1]}( vec4( value.rgb * ${$[0]}, value.a ) );`,"}"].join(`
`)}var dD={[XW]:"Linear",[UW]:"Reinhard",[GW]:"Cineon",[NW]:"ACESFilmic",[qW]:"AgX",[FW]:"Neutral",[EW]:"Custom"};function lD(J,Q){let $=dD[Q];if($===void 0)return Y0("WebGLProgram: Unsupported toneMapping:",Q),"vec3 "+J+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+J+"( vec3 color ) { return "+$+"ToneMapping( color ); }"}var U$=new P;function uD(){JJ.getLuminanceCoefficients(U$);let J=U$.x.toFixed(4),Q=U$.y.toFixed(4),$=U$.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${Q}, ${$} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function cD(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(E6).join(`
`)}function nD(J){let Q=[];for(let $ in J){let W=J[$];if(W===!1)continue;Q.push("#define "+$+" "+W)}return Q.join(`
`)}function sD(J,Q){let $={},W=J.getProgramParameter(Q,J.ACTIVE_ATTRIBUTES);for(let Z=0;Z<W;Z++){let K=J.getActiveAttrib(Q,Z),H=K.name,Y=1;if(K.type===J.FLOAT_MAT2)Y=2;if(K.type===J.FLOAT_MAT3)Y=3;if(K.type===J.FLOAT_MAT4)Y=4;$[H]={type:K.type,location:J.getAttribLocation(Q,H),locationSize:Y}}return $}function E6(J){return J!==""}function EU(J,Q){let $=Q.numSpotLightShadows+Q.numSpotLightMaps-Q.numSpotLightShadowsWithMaps;return J.replace(/NUM_DIR_LIGHTS/g,Q.numDirLights).replace(/NUM_SPOT_LIGHTS/g,Q.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,Q.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,$).replace(/NUM_RECT_AREA_LIGHTS/g,Q.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,Q.numPointLights).replace(/NUM_HEMI_LIGHTS/g,Q.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,Q.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,Q.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,Q.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,Q.numPointLightShadows)}function qU(J,Q){return J.replace(/NUM_CLIPPING_PLANES/g,Q.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,Q.numClippingPlanes-Q.numClipIntersection)}var iD=/^[ \t]*#include +<([\w\d./]+)>/gm;function UK(J){return J.replace(iD,aD)}var oD=new Map;function aD(J,Q){let $=a0[Q];if($===void 0){let W=oD.get(Q);if(W!==void 0)$=a0[W],Y0('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',Q,W);else throw Error("THREE.WebGLProgram: Can not resolve #include <"+Q+">")}return UK($)}var rD=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function FU(J){return J.replace(rD,tD)}function tD(J,Q,$,W){let Z="";for(let K=parseInt(Q);K<parseInt($);K++)Z+=W.replace(/\[\s*i\s*\]/g,"[ "+K+" ]").replace(/UNROLLED_LOOP_INDEX/g,K);return Z}function DU(J){let Q=`precision ${J.precision} float;
	precision ${J.precision} int;
	precision ${J.precision} sampler2D;
	precision ${J.precision} samplerCube;
	precision ${J.precision} sampler3D;
	precision ${J.precision} sampler2DArray;
	precision ${J.precision} sampler2DShadow;
	precision ${J.precision} samplerCubeShadow;
	precision ${J.precision} sampler2DArrayShadow;
	precision ${J.precision} isampler2D;
	precision ${J.precision} isampler3D;
	precision ${J.precision} isamplerCube;
	precision ${J.precision} isampler2DArray;
	precision ${J.precision} usampler2D;
	precision ${J.precision} usampler3D;
	precision ${J.precision} usamplerCube;
	precision ${J.precision} usampler2DArray;
	`;if(J.precision==="highp")Q+=`
#define HIGH_PRECISION`;else if(J.precision==="mediump")Q+=`
#define MEDIUM_PRECISION`;else if(J.precision==="lowp")Q+=`
#define LOW_PRECISION`;return Q}var eD={[c7]:"SHADOWMAP_TYPE_PCF",[q7]:"SHADOWMAP_TYPE_VSM"};function J1(J){return eD[J.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Q1={[O7]:"ENVMAP_TYPE_CUBE",[_8]:"ENVMAP_TYPE_CUBE",[s7]:"ENVMAP_TYPE_CUBE_UV"};function $1(J){if(J.envMap===!1)return"ENVMAP_TYPE_CUBE";return Q1[J.envMapMode]||"ENVMAP_TYPE_CUBE"}var W1={[_8]:"ENVMAP_MODE_REFRACTION"};function Z1(J){if(J.envMap===!1)return"ENVMAP_MODE_REFLECTION";return W1[J.envMapMode]||"ENVMAP_MODE_REFLECTION"}var K1={[YY]:"ENVMAP_BLENDING_MULTIPLY",[XY]:"ENVMAP_BLENDING_MIX",[UY]:"ENVMAP_BLENDING_ADD"};function H1(J){if(J.envMap===!1)return"ENVMAP_BLENDING_NONE";return K1[J.combine]||"ENVMAP_BLENDING_NONE"}function Y1(J){let Q=J.envMapCubeUVHeight;if(Q===null)return null;let $=Math.log2(Q)-2,W=1/Q;return{texelWidth:1/(3*Math.max(Math.pow(2,$),112)),texelHeight:W,maxMip:$}}function X1(J,Q,$,W){let Z=J.getContext(),K=$.defines,H=$.vertexShader,Y=$.fragmentShader,X=J1($),U=$1($),N=Z1($),E=H1($),G=Y1($),q=cD($),O=nD(K),R=Z.createProgram(),D,F,I=$.glslVersion?"#version "+$.glslVersion+`
`:"";if($.isRawShaderMaterial){if(D=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O].filter(E6).join(`
`),D.length>0)D+=`
`;if(F=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O].filter(E6).join(`
`),F.length>0)F+=`
`}else D=[DU($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O,$.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",$.batching?"#define USE_BATCHING":"",$.batchingColor?"#define USE_BATCHING_COLOR":"",$.instancing?"#define USE_INSTANCING":"",$.instancingColor?"#define USE_INSTANCING_COLOR":"",$.instancingMorph?"#define USE_INSTANCING_MORPH":"",$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.map?"#define USE_MAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+N:"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.displacementMap?"#define USE_DISPLACEMENTMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.mapUv?"#define MAP_UV "+$.mapUv:"",$.alphaMapUv?"#define ALPHAMAP_UV "+$.alphaMapUv:"",$.lightMapUv?"#define LIGHTMAP_UV "+$.lightMapUv:"",$.aoMapUv?"#define AOMAP_UV "+$.aoMapUv:"",$.emissiveMapUv?"#define EMISSIVEMAP_UV "+$.emissiveMapUv:"",$.bumpMapUv?"#define BUMPMAP_UV "+$.bumpMapUv:"",$.normalMapUv?"#define NORMALMAP_UV "+$.normalMapUv:"",$.displacementMapUv?"#define DISPLACEMENTMAP_UV "+$.displacementMapUv:"",$.metalnessMapUv?"#define METALNESSMAP_UV "+$.metalnessMapUv:"",$.roughnessMapUv?"#define ROUGHNESSMAP_UV "+$.roughnessMapUv:"",$.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+$.anisotropyMapUv:"",$.clearcoatMapUv?"#define CLEARCOATMAP_UV "+$.clearcoatMapUv:"",$.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+$.clearcoatNormalMapUv:"",$.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+$.clearcoatRoughnessMapUv:"",$.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+$.iridescenceMapUv:"",$.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+$.iridescenceThicknessMapUv:"",$.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+$.sheenColorMapUv:"",$.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+$.sheenRoughnessMapUv:"",$.specularMapUv?"#define SPECULARMAP_UV "+$.specularMapUv:"",$.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+$.specularColorMapUv:"",$.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+$.specularIntensityMapUv:"",$.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+$.transmissionMapUv:"",$.thicknessMapUv?"#define THICKNESSMAP_UV "+$.thicknessMapUv:"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexNormals?"#define HAS_NORMAL":"",$.vertexColors?"#define USE_COLOR":"",$.vertexAlphas?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.flatShading?"#define FLAT_SHADED":"",$.skinning?"#define USE_SKINNING":"",$.morphTargets?"#define USE_MORPHTARGETS":"",$.morphNormals&&$.flatShading===!1?"#define USE_MORPHNORMALS":"",$.morphColors?"#define USE_MORPHCOLORS":"",$.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+$.morphTextureStride:"",$.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+$.morphTargetsCount:"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.sizeAttenuation?"#define USE_SIZEATTENUATION":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(E6).join(`
`),F=[DU($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O,$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",$.map?"#define USE_MAP":"",$.matcap?"#define USE_MATCAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+U:"",$.envMap?"#define "+N:"",$.envMap?"#define "+E:"",G?"#define CUBEUV_TEXEL_WIDTH "+G.texelWidth:"",G?"#define CUBEUV_TEXEL_HEIGHT "+G.texelHeight:"",G?"#define CUBEUV_MAX_MIP "+G.maxMip+".0":"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoat?"#define USE_CLEARCOAT":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.dispersion?"#define USE_DISPERSION":"",$.iridescence?"#define USE_IRIDESCENCE":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaTest?"#define USE_ALPHATEST":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.sheen?"#define USE_SHEEN":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors||$.instancingColor?"#define USE_COLOR":"",$.vertexAlphas||$.batchingColor?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.gradientMap?"#define USE_GRADIENTMAP":"",$.flatShading?"#define FLAT_SHADED":"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",$.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",$.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",$.toneMapping!==E9?"#define TONE_MAPPING":"",$.toneMapping!==E9?a0.tonemapping_pars_fragment:"",$.toneMapping!==E9?lD("toneMapping",$.toneMapping):"",$.dithering?"#define DITHERING":"",$.opaque?"#define OPAQUE":"",a0.colorspace_pars_fragment,mD("linearToOutputTexel",$.outputColorSpace),uD(),$.useDepthPacking?"#define DEPTH_PACKING "+$.depthPacking:"",`
`].filter(E6).join(`
`);if(H=UK(H),H=EU(H,$),H=qU(H,$),Y=UK(Y),Y=EU(Y,$),Y=qU(Y,$),H=FU(H),Y=FU(Y),$.isRawShaderMaterial!==!0)I=`#version 300 es
`,D=[q,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+D,F=["#define varying in",$.glslVersion===JZ?"":"layout(location = 0) out highp vec4 pc_fragColor;",$.glslVersion===JZ?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+F;let V=I+D+H,M=I+F+Y,w=UU(Z,Z.VERTEX_SHADER,V),_=UU(Z,Z.FRAGMENT_SHADER,M);if(Z.attachShader(R,w),Z.attachShader(R,_),$.index0AttributeName!==void 0)Z.bindAttribLocation(R,0,$.index0AttributeName);else if($.hasPositionAttribute===!0)Z.bindAttribLocation(R,0,"position");Z.linkProgram(R);function C(T){if(J.debug.checkShaderErrors){let p=Z.getProgramInfoLog(R)||"",n=Z.getShaderInfoLog(w)||"",b=Z.getShaderInfoLog(_)||"",u=p.trim(),l=n.trim(),h=b.trim(),r=!0,W0=!0;if(Z.getProgramParameter(R,Z.LINK_STATUS)===!1)if(r=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(Z,R,w,_);else{let H0=NU(Z,w,"vertex"),C0=NU(Z,_,"fragment");T0("WebGLProgram: Shader Error "+Z.getError()+" - VALIDATE_STATUS "+Z.getProgramParameter(R,Z.VALIDATE_STATUS)+`

Material Name: `+T.name+`
Material Type: `+T.type+`

Program Info Log: `+u+`
`+H0+`
`+C0)}else if(u!=="")Y0("WebGLProgram: Program Info Log:",u);else if(l===""||h==="")W0=!1;if(W0)T.diagnostics={runnable:r,programLog:u,vertexShader:{log:l,prefix:D},fragmentShader:{log:h,prefix:F}}}Z.deleteShader(w),Z.deleteShader(_),k=new q6(Z,R),B=sD(Z,R)}let k;this.getUniforms=function(){if(k===void 0)C(this);return k};let B;this.getAttributes=function(){if(B===void 0)C(this);return B};let f=$.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(f===!1)f=Z.getProgramParameter(R,hD);return f},this.destroy=function(){W.releaseStatesOfProgram(this),Z.deleteProgram(R),this.program=void 0},this.type=$.shaderType,this.name=$.shaderName,this.id=xD++,this.cacheKey=Q,this.usedTimes=1,this.program=R,this.vertexShader=w,this.fragmentShader=_,this}var U1=0;class PU{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J,Q,$){let W=this._getShaderCacheForMaterial(J);if(W.has(Q)===!1)W.add(Q),Q.usedTimes++;if(W.has($)===!1)W.add($),$.usedTimes++;return this}remove(J){let Q=this.materialCache.get(J);for(let $ of Q)if($.usedTimes--,$.usedTimes===0)this.shaderCache.delete($.code);return this.materialCache.delete(J),this}getVertexShaderStage(J){return this._getShaderStage(J.vertexShader)}getFragmentShaderStage(J){return this._getShaderStage(J.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let Q=this.materialCache,$=Q.get(J);if($===void 0)$=new Set,Q.set(J,$);return $}_getShaderStage(J){let Q=this.shaderCache,$=Q.get(J);if($===void 0)$=new TU(J),Q.set(J,$);return $}}class TU{constructor(J){this.id=U1++,this.code=J,this.usedTimes=0}}function G1(J){return J===S8||J===RQ||J===kQ}function N1(J,Q,$,W,Z,K){let H=new t7,Y=new PU,X=new Set,U=[],N=new Map,E=W.logarithmicDepthBuffer,G=W.precision,q={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function O(k){if(X.add(k),k===0)return"uv";return`uv${k}`}function R(k,B,f,T,p,n){let b=T.fog,u=p.geometry,l=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?T.environment:null,h=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,r=Q.get(k.envMap||l,h),W0=!!r&&r.mapping===s7?r.image.height:null,H0=q[k.type];if(k.precision!==null){if(G=W.getMaxPrecision(k.precision),G!==k.precision)Y0("WebGLProgram.getParameters:",k.precision,"not supported, using",G,"instead.")}let C0=u.morphAttributes.position||u.morphAttributes.normal||u.morphAttributes.color,L0=C0!==void 0?C0.length:0,UJ=0;if(u.morphAttributes.position!==void 0)UJ=1;if(u.morphAttributes.normal!==void 0)UJ=2;if(u.morphAttributes.color!==void 0)UJ=3;let HJ,i,X0,V0;if(H0){let s0=I9[H0];HJ=s0.vertexShader,i=s0.fragmentShader}else{HJ=k.vertexShader,i=k.fragmentShader;let s0=Y.getVertexShaderStage(k),MJ=Y.getFragmentShaderStage(k);Y.update(k,s0,MJ),X0=s0.id,V0=MJ.id}let N0=J.getRenderTarget(),b0=J.state.buffers.depth.getReversed(),QJ=p.isInstancedMesh===!0,m0=p.isBatchedMesh===!0,d0=!!k.map,t=!!k.matcap,$0=!!r,Q0=!!k.aoMap,k0=!!k.lightMap,z0=!!k.bumpMap&&k.wireframe===!1,S0=!!k.normalMap,y0=!!k.displacementMap,c0=!!k.emissiveMap,n0=!!k.metalnessMap,S=!!k.roughnessMap,FJ=k.anisotropy>0,e0=k.clearcoat>0,r0=k.dispersion>0,A=k.iridescence>0,L=k.sheen>0,j=k.transmission>0,m=FJ&&!!k.anisotropyMap,e=e0&&!!k.clearcoatMap,Z0=e0&&!!k.clearcoatNormalMap,G0=e0&&!!k.clearcoatRoughnessMap,c=A&&!!k.iridescenceMap,o=A&&!!k.iridescenceThicknessMap,M0=L&&!!k.sheenColorMap,j0=L&&!!k.sheenRoughnessMap,F0=!!k.specularMap,K0=!!k.specularColorMap,h0=!!k.specularIntensityMap,x0=j&&!!k.transmissionMap,KJ=j&&!!k.thicknessMap,y=!!k.gradientMap,U0=!!k.alphaMap,s=k.alphaTest>0,E0=!!k.alphaHash,I0=!!k.extensions,J0=E9;if(k.toneMapped){if(N0===null||N0.isXRRenderTarget===!0)J0=J.toneMapping}let q0={shaderID:H0,shaderType:k.type,shaderName:k.name,vertexShader:HJ,fragmentShader:i,defines:k.defines,customVertexShaderID:X0,customFragmentShaderID:V0,isRawShaderMaterial:k.isRawShaderMaterial===!0,glslVersion:k.glslVersion,precision:G,batching:m0,batchingColor:m0&&p._colorsTexture!==null,instancing:QJ,instancingColor:QJ&&p.instanceColor!==null,instancingMorph:QJ&&p.morphTexture!==null,outputColorSpace:N0===null?J.outputColorSpace:N0.isXRRenderTarget===!0?N0.texture.colorSpace:JJ.workingColorSpace,alphaToCoverage:!!k.alphaToCoverage,map:d0,matcap:t,envMap:$0,envMapMode:$0&&r.mapping,envMapCubeUVHeight:W0,aoMap:Q0,lightMap:k0,bumpMap:z0,normalMap:S0,displacementMap:y0,emissiveMap:c0,normalMapObjectSpace:S0&&k.normalMapType===LY,normalMapTangentSpace:S0&&k.normalMapType===rW,packedNormalMap:S0&&k.normalMapType===rW&&G1(k.normalMap.format),metalnessMap:n0,roughnessMap:S,anisotropy:FJ,anisotropyMap:m,clearcoat:e0,clearcoatMap:e,clearcoatNormalMap:Z0,clearcoatRoughnessMap:G0,dispersion:r0,iridescence:A,iridescenceMap:c,iridescenceThicknessMap:o,sheen:L,sheenColorMap:M0,sheenRoughnessMap:j0,specularMap:F0,specularColorMap:K0,specularIntensityMap:h0,transmission:j,transmissionMap:x0,thicknessMap:KJ,gradientMap:y,opaque:k.transparent===!1&&k.blending===n7&&k.alphaToCoverage===!1,alphaMap:U0,alphaTest:s,alphaHash:E0,combine:k.combine,mapUv:d0&&O(k.map.channel),aoMapUv:Q0&&O(k.aoMap.channel),lightMapUv:k0&&O(k.lightMap.channel),bumpMapUv:z0&&O(k.bumpMap.channel),normalMapUv:S0&&O(k.normalMap.channel),displacementMapUv:y0&&O(k.displacementMap.channel),emissiveMapUv:c0&&O(k.emissiveMap.channel),metalnessMapUv:n0&&O(k.metalnessMap.channel),roughnessMapUv:S&&O(k.roughnessMap.channel),anisotropyMapUv:m&&O(k.anisotropyMap.channel),clearcoatMapUv:e&&O(k.clearcoatMap.channel),clearcoatNormalMapUv:Z0&&O(k.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:G0&&O(k.clearcoatRoughnessMap.channel),iridescenceMapUv:c&&O(k.iridescenceMap.channel),iridescenceThicknessMapUv:o&&O(k.iridescenceThicknessMap.channel),sheenColorMapUv:M0&&O(k.sheenColorMap.channel),sheenRoughnessMapUv:j0&&O(k.sheenRoughnessMap.channel),specularMapUv:F0&&O(k.specularMap.channel),specularColorMapUv:K0&&O(k.specularColorMap.channel),specularIntensityMapUv:h0&&O(k.specularIntensityMap.channel),transmissionMapUv:x0&&O(k.transmissionMap.channel),thicknessMapUv:KJ&&O(k.thicknessMap.channel),alphaMapUv:U0&&O(k.alphaMap.channel),vertexTangents:!!u.attributes.tangent&&(S0||FJ),vertexNormals:!!u.attributes.normal,vertexColors:k.vertexColors,vertexAlphas:k.vertexColors===!0&&!!u.attributes.color&&u.attributes.color.itemSize===4,pointsUvs:p.isPoints===!0&&!!u.attributes.uv&&(d0||U0),fog:!!b,useFog:k.fog===!0,fogExp2:!!b&&b.isFogExp2,flatShading:k.wireframe===!1&&(k.flatShading===!0||u.attributes.normal===void 0&&S0===!1&&(k.isMeshLambertMaterial||k.isMeshPhongMaterial||k.isMeshStandardMaterial||k.isMeshPhysicalMaterial)),sizeAttenuation:k.sizeAttenuation===!0,logarithmicDepthBuffer:E,reversedDepthBuffer:b0,skinning:p.isSkinnedMesh===!0,hasPositionAttribute:u.attributes.position!==void 0,morphTargets:u.morphAttributes.position!==void 0,morphNormals:u.morphAttributes.normal!==void 0,morphColors:u.morphAttributes.color!==void 0,morphTargetsCount:L0,morphTextureStride:UJ,numDirLights:B.directional.length,numPointLights:B.point.length,numSpotLights:B.spot.length,numSpotLightMaps:B.spotLightMap.length,numRectAreaLights:B.rectArea.length,numHemiLights:B.hemi.length,numDirLightShadows:B.directionalShadowMap.length,numPointLightShadows:B.pointShadowMap.length,numSpotLightShadows:B.spotShadowMap.length,numSpotLightShadowsWithMaps:B.numSpotLightShadowsWithMaps,numLightProbes:B.numLightProbes,numLightProbeGrids:n.length,numClippingPlanes:K.numPlanes,numClipIntersection:K.numIntersection,dithering:k.dithering,shadowMapEnabled:J.shadowMap.enabled&&f.length>0,shadowMapType:J.shadowMap.type,toneMapping:J0,decodeVideoTexture:d0&&k.map.isVideoTexture===!0&&JJ.getTransfer(k.map.colorSpace)===qJ,decodeVideoTextureEmissive:c0&&k.emissiveMap.isVideoTexture===!0&&JJ.getTransfer(k.emissiveMap.colorSpace)===qJ,premultipliedAlpha:k.premultipliedAlpha,doubleSided:k.side===L9,flipSided:k.side===sJ,useDepthPacking:k.depthPacking>=0,depthPacking:k.depthPacking||0,index0AttributeName:k.index0AttributeName,extensionClipCullDistance:I0&&k.extensions.clipCullDistance===!0&&$.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(I0&&k.extensions.multiDraw===!0||m0)&&$.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:$.has("KHR_parallel_shader_compile"),customProgramCacheKey:k.customProgramCacheKey()};return q0.vertexUv1s=X.has(1),q0.vertexUv2s=X.has(2),q0.vertexUv3s=X.has(3),X.clear(),q0}function D(k){let B=[];if(k.shaderID)B.push(k.shaderID);else B.push(k.customVertexShaderID),B.push(k.customFragmentShaderID);if(k.defines!==void 0)for(let f in k.defines)B.push(f),B.push(k.defines[f]);if(k.isRawShaderMaterial===!1)F(B,k),I(B,k),B.push(J.outputColorSpace);return B.push(k.customProgramCacheKey),B.join()}function F(k,B){k.push(B.precision),k.push(B.outputColorSpace),k.push(B.envMapMode),k.push(B.envMapCubeUVHeight),k.push(B.mapUv),k.push(B.alphaMapUv),k.push(B.lightMapUv),k.push(B.aoMapUv),k.push(B.bumpMapUv),k.push(B.normalMapUv),k.push(B.displacementMapUv),k.push(B.emissiveMapUv),k.push(B.metalnessMapUv),k.push(B.roughnessMapUv),k.push(B.anisotropyMapUv),k.push(B.clearcoatMapUv),k.push(B.clearcoatNormalMapUv),k.push(B.clearcoatRoughnessMapUv),k.push(B.iridescenceMapUv),k.push(B.iridescenceThicknessMapUv),k.push(B.sheenColorMapUv),k.push(B.sheenRoughnessMapUv),k.push(B.specularMapUv),k.push(B.specularColorMapUv),k.push(B.specularIntensityMapUv),k.push(B.transmissionMapUv),k.push(B.thicknessMapUv),k.push(B.combine),k.push(B.fogExp2),k.push(B.sizeAttenuation),k.push(B.morphTargetsCount),k.push(B.morphAttributeCount),k.push(B.numDirLights),k.push(B.numPointLights),k.push(B.numSpotLights),k.push(B.numSpotLightMaps),k.push(B.numHemiLights),k.push(B.numRectAreaLights),k.push(B.numDirLightShadows),k.push(B.numPointLightShadows),k.push(B.numSpotLightShadows),k.push(B.numSpotLightShadowsWithMaps),k.push(B.numLightProbes),k.push(B.shadowMapType),k.push(B.toneMapping),k.push(B.numClippingPlanes),k.push(B.numClipIntersection),k.push(B.depthPacking)}function I(k,B){if(H.disableAll(),B.instancing)H.enable(0);if(B.instancingColor)H.enable(1);if(B.instancingMorph)H.enable(2);if(B.matcap)H.enable(3);if(B.envMap)H.enable(4);if(B.normalMapObjectSpace)H.enable(5);if(B.normalMapTangentSpace)H.enable(6);if(B.clearcoat)H.enable(7);if(B.iridescence)H.enable(8);if(B.alphaTest)H.enable(9);if(B.vertexColors)H.enable(10);if(B.vertexAlphas)H.enable(11);if(B.vertexUv1s)H.enable(12);if(B.vertexUv2s)H.enable(13);if(B.vertexUv3s)H.enable(14);if(B.vertexTangents)H.enable(15);if(B.anisotropy)H.enable(16);if(B.alphaHash)H.enable(17);if(B.batching)H.enable(18);if(B.dispersion)H.enable(19);if(B.batchingColor)H.enable(20);if(B.gradientMap)H.enable(21);if(B.packedNormalMap)H.enable(22);if(B.vertexNormals)H.enable(23);if(k.push(H.mask),H.disableAll(),B.fog)H.enable(0);if(B.useFog)H.enable(1);if(B.flatShading)H.enable(2);if(B.logarithmicDepthBuffer)H.enable(3);if(B.reversedDepthBuffer)H.enable(4);if(B.skinning)H.enable(5);if(B.morphTargets)H.enable(6);if(B.morphNormals)H.enable(7);if(B.morphColors)H.enable(8);if(B.premultipliedAlpha)H.enable(9);if(B.shadowMapEnabled)H.enable(10);if(B.doubleSided)H.enable(11);if(B.flipSided)H.enable(12);if(B.useDepthPacking)H.enable(13);if(B.dithering)H.enable(14);if(B.transmission)H.enable(15);if(B.sheen)H.enable(16);if(B.opaque)H.enable(17);if(B.pointsUvs)H.enable(18);if(B.decodeVideoTexture)H.enable(19);if(B.decodeVideoTextureEmissive)H.enable(20);if(B.alphaToCoverage)H.enable(21);if(B.numLightProbeGrids>0)H.enable(22);if(B.hasPositionAttribute)H.enable(23);k.push(H.mask)}function V(k){let B=q[k.type],f;if(B){let T=I9[B];f=$X.clone(T.uniforms)}else f=k.uniforms;return f}function M(k,B){let f=N.get(B);if(f!==void 0)++f.usedTimes;else f=new X1(J,B,k,Z),U.push(f),N.set(B,f);return f}function w(k){if(--k.usedTimes===0){let B=U.indexOf(k);U[B]=U[U.length-1],U.pop(),N.delete(k.cacheKey),k.destroy()}}function _(k){Y.remove(k)}function C(){Y.dispose()}return{getParameters:R,getProgramCacheKey:D,getUniforms:V,acquireProgram:M,releaseProgram:w,releaseShaderCache:_,programs:U,dispose:C}}function E1(){let J=new WeakMap;function Q(H){return J.has(H)}function $(H){let Y=J.get(H);if(Y===void 0)Y={},J.set(H,Y);return Y}function W(H){J.delete(H)}function Z(H,Y,X){J.get(H)[Y]=X}function K(){J=new WeakMap}return{has:Q,get:$,remove:W,update:Z,dispose:K}}function q1(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.material.id!==Q.material.id)return J.material.id-Q.material.id;else if(J.materialVariant!==Q.materialVariant)return J.materialVariant-Q.materialVariant;else if(J.z!==Q.z)return J.z-Q.z;else return J.id-Q.id}function OU(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.z!==Q.z)return Q.z-J.z;else return J.id-Q.id}function RU(){let J=[],Q=0,$=[],W=[],Z=[];function K(){Q=0,$.length=0,W.length=0,Z.length=0}function H(G){let q=0;if(G.isInstancedMesh)q+=2;if(G.isSkinnedMesh)q+=1;return q}function Y(G,q,O,R,D,F){let I=J[Q];if(I===void 0)I={id:G.id,object:G,geometry:q,material:O,materialVariant:H(G),groupOrder:R,renderOrder:G.renderOrder,z:D,group:F},J[Q]=I;else I.id=G.id,I.object=G,I.geometry=q,I.material=O,I.materialVariant=H(G),I.groupOrder=R,I.renderOrder=G.renderOrder,I.z=D,I.group=F;return Q++,I}function X(G,q,O,R,D,F){let I=Y(G,q,O,R,D,F);if(O.transmission>0)W.push(I);else if(O.transparent===!0)Z.push(I);else $.push(I)}function U(G,q,O,R,D,F){let I=Y(G,q,O,R,D,F);if(O.transmission>0)W.unshift(I);else if(O.transparent===!0)Z.unshift(I);else $.unshift(I)}function N(G,q,O){if($.length>1)$.sort(G||q1);if(W.length>1)W.sort(q||OU);if(Z.length>1)Z.sort(q||OU);if(O)$.reverse(),W.reverse(),Z.reverse()}function E(){for(let G=Q,q=J.length;G<q;G++){let O=J[G];if(O.id===null)break;O.id=null,O.object=null,O.geometry=null,O.material=null,O.group=null}}return{opaque:$,transmissive:W,transparent:Z,init:K,push:X,unshift:U,finish:E,sort:N}}function F1(){let J=new WeakMap;function Q(W,Z){let K=J.get(W),H;if(K===void 0)H=new RU,J.set(W,[H]);else if(Z>=K.length)H=new RU,K.push(H);else H=K[Z];return H}function $(){J=new WeakMap}return{get:Q,dispose:$}}function D1(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"DirectionalLight":$={direction:new P,color:new B0};break;case"SpotLight":$={position:new P,direction:new P,color:new B0,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":$={position:new P,color:new B0,distance:0,decay:0};break;case"HemisphereLight":$={direction:new P,skyColor:new B0,groundColor:new B0};break;case"RectAreaLight":$={color:new B0,position:new P,halfWidth:new P,halfHeight:new P};break}return J[Q.id]=$,$}}}function O1(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"DirectionalLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new a};break;case"SpotLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new a};break;case"PointLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new a,shadowCameraNear:1,shadowCameraFar:1000};break}return J[Q.id]=$,$}}}var R1=0;function k1(J,Q){return(Q.castShadow?2:0)-(J.castShadow?2:0)+(Q.map?1:0)-(J.map?1:0)}function M1(J){let Q=new D1,$=O1(),W={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)W.probe.push(new P);let Z=new P,K=new p0,H=new p0;function Y(U){let N=0,E=0,G=0;for(let B=0;B<9;B++)W.probe[B].set(0,0,0);let q=0,O=0,R=0,D=0,F=0,I=0,V=0,M=0,w=0,_=0,C=0;U.sort(k1);for(let B=0,f=U.length;B<f;B++){let T=U[B],p=T.color,n=T.intensity,b=T.distance,u=null;if(T.shadow&&T.shadow.map)if(T.shadow.map.texture.format===S8)u=T.shadow.map.texture;else u=T.shadow.map.depthTexture||T.shadow.map.texture;if(T.isAmbientLight)N+=p.r*n,E+=p.g*n,G+=p.b*n;else if(T.isLightProbe){for(let l=0;l<9;l++)W.probe[l].addScaledVector(T.sh.coefficients[l],n);C++}else if(T.isDirectionalLight){let l=Q.get(T);if(l.color.copy(T.color).multiplyScalar(T.intensity),T.castShadow){let h=T.shadow,r=$.get(T);r.shadowIntensity=h.intensity,r.shadowBias=h.bias,r.shadowNormalBias=h.normalBias,r.shadowRadius=h.radius,r.shadowMapSize=h.mapSize,W.directionalShadow[q]=r,W.directionalShadowMap[q]=u,W.directionalShadowMatrix[q]=T.shadow.matrix,I++}W.directional[q]=l,q++}else if(T.isSpotLight){let l=Q.get(T);l.position.setFromMatrixPosition(T.matrixWorld),l.color.copy(p).multiplyScalar(n),l.distance=b,l.coneCos=Math.cos(T.angle),l.penumbraCos=Math.cos(T.angle*(1-T.penumbra)),l.decay=T.decay,W.spot[R]=l;let h=T.shadow;if(T.map){if(W.spotLightMap[w]=T.map,w++,h.updateMatrices(T),T.castShadow)_++}if(W.spotLightMatrix[R]=h.matrix,T.castShadow){let r=$.get(T);r.shadowIntensity=h.intensity,r.shadowBias=h.bias,r.shadowNormalBias=h.normalBias,r.shadowRadius=h.radius,r.shadowMapSize=h.mapSize,W.spotShadow[R]=r,W.spotShadowMap[R]=u,M++}R++}else if(T.isRectAreaLight){let l=Q.get(T);l.color.copy(p).multiplyScalar(n),l.halfWidth.set(T.width*0.5,0,0),l.halfHeight.set(0,T.height*0.5,0),W.rectArea[D]=l,D++}else if(T.isPointLight){let l=Q.get(T);if(l.color.copy(T.color).multiplyScalar(T.intensity),l.distance=T.distance,l.decay=T.decay,T.castShadow){let h=T.shadow,r=$.get(T);r.shadowIntensity=h.intensity,r.shadowBias=h.bias,r.shadowNormalBias=h.normalBias,r.shadowRadius=h.radius,r.shadowMapSize=h.mapSize,r.shadowCameraNear=h.camera.near,r.shadowCameraFar=h.camera.far,W.pointShadow[O]=r,W.pointShadowMap[O]=u,W.pointShadowMatrix[O]=T.shadow.matrix,V++}W.point[O]=l,O++}else if(T.isHemisphereLight){let l=Q.get(T);l.skyColor.copy(T.color).multiplyScalar(n),l.groundColor.copy(T.groundColor).multiplyScalar(n),W.hemi[F]=l,F++}}if(D>0)if(J.has("OES_texture_float_linear")===!0)W.rectAreaLTC1=D0.LTC_FLOAT_1,W.rectAreaLTC2=D0.LTC_FLOAT_2;else W.rectAreaLTC1=D0.LTC_HALF_1,W.rectAreaLTC2=D0.LTC_HALF_2;W.ambient[0]=N,W.ambient[1]=E,W.ambient[2]=G;let k=W.hash;if(k.directionalLength!==q||k.pointLength!==O||k.spotLength!==R||k.rectAreaLength!==D||k.hemiLength!==F||k.numDirectionalShadows!==I||k.numPointShadows!==V||k.numSpotShadows!==M||k.numSpotMaps!==w||k.numLightProbes!==C)W.directional.length=q,W.spot.length=R,W.rectArea.length=D,W.point.length=O,W.hemi.length=F,W.directionalShadow.length=I,W.directionalShadowMap.length=I,W.pointShadow.length=V,W.pointShadowMap.length=V,W.spotShadow.length=M,W.spotShadowMap.length=M,W.directionalShadowMatrix.length=I,W.pointShadowMatrix.length=V,W.spotLightMatrix.length=M+w-_,W.spotLightMap.length=w,W.numSpotLightShadowsWithMaps=_,W.numLightProbes=C,k.directionalLength=q,k.pointLength=O,k.spotLength=R,k.rectAreaLength=D,k.hemiLength=F,k.numDirectionalShadows=I,k.numPointShadows=V,k.numSpotShadows=M,k.numSpotMaps=w,k.numLightProbes=C,W.version=R1++}function X(U,N){let E=0,G=0,q=0,O=0,R=0,D=N.matrixWorldInverse;for(let F=0,I=U.length;F<I;F++){let V=U[F];if(V.isDirectionalLight){let M=W.directional[E];M.direction.setFromMatrixPosition(V.matrixWorld),Z.setFromMatrixPosition(V.target.matrixWorld),M.direction.sub(Z),M.direction.transformDirection(D),E++}else if(V.isSpotLight){let M=W.spot[q];M.position.setFromMatrixPosition(V.matrixWorld),M.position.applyMatrix4(D),M.direction.setFromMatrixPosition(V.matrixWorld),Z.setFromMatrixPosition(V.target.matrixWorld),M.direction.sub(Z),M.direction.transformDirection(D),q++}else if(V.isRectAreaLight){let M=W.rectArea[O];M.position.setFromMatrixPosition(V.matrixWorld),M.position.applyMatrix4(D),H.identity(),K.copy(V.matrixWorld),K.premultiply(D),H.extractRotation(K),M.halfWidth.set(V.width*0.5,0,0),M.halfHeight.set(0,V.height*0.5,0),M.halfWidth.applyMatrix4(H),M.halfHeight.applyMatrix4(H),O++}else if(V.isPointLight){let M=W.point[G];M.position.setFromMatrixPosition(V.matrixWorld),M.position.applyMatrix4(D),G++}else if(V.isHemisphereLight){let M=W.hemi[R];M.direction.setFromMatrixPosition(V.matrixWorld),M.direction.transformDirection(D),R++}}}return{setup:Y,setupView:X,state:W}}function kU(J){let Q=new M1(J),$=[],W=[],Z=[];function K(G){E.camera=G,$.length=0,W.length=0,Z.length=0}function H(G){$.push(G)}function Y(G){W.push(G)}function X(G){Z.push(G)}function U(){Q.setup($)}function N(G){Q.setupView($,G)}let E={lightsArray:$,shadowsArray:W,lightProbeGridArray:Z,camera:null,lights:Q,transmissionRenderTarget:{},textureUnits:0};return{init:K,state:E,setupLights:U,setupLightsView:N,pushLight:H,pushShadow:Y,pushLightProbeGrid:X}}function L1(J){let Q=new WeakMap;function $(Z,K=0){let H=Q.get(Z),Y;if(H===void 0)Y=new kU(J),Q.set(Z,[Y]);else if(K>=H.length)Y=new kU(J),H.push(Y);else Y=H[K];return Y}function W(){Q=new WeakMap}return{get:$,dispose:W}}var V1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,B1=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,z1=[new P(1,0,0),new P(-1,0,0),new P(0,1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1)],I1=[new P(0,-1,0),new P(0,-1,0),new P(0,0,1),new P(0,0,-1),new P(0,-1,0),new P(0,-1,0)],MU=new p0,N6=new P,HK=new P;function A1(J,Q,$){let W=new e9,Z=new a,K=new a,H=new XJ,Y=new rQ,X=new tQ,U={},N=$.maxTextureSize,E={[F7]:sJ,[sJ]:F7,[L9]:L9},G=new Q9({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new a},radius:{value:4}},vertexShader:V1,fragmentShader:B1}),q=G.clone();q.defines.HORIZONTAL_PASS=1;let O=new u0;O.setAttribute("position",new YJ(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let R=new AJ(O,G),D=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=c7;let F=this.type;this.render=function(_,C,k){if(D.enabled===!1)return;if(D.autoUpdate===!1&&D.needsUpdate===!1)return;if(_.length===0)return;if(this.type===yH)Y0("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=c7;let B=J.getRenderTarget(),f=J.getActiveCubeFace(),T=J.getActiveMipmapLevel(),p=J.state;if(p.setBlending(V9),p.buffers.depth.getReversed()===!0)p.buffers.color.setClear(0,0,0,0);else p.buffers.color.setClear(1,1,1,1);p.buffers.depth.setTest(!0),p.setScissorTest(!1);let n=F!==this.type;if(n)C.traverse(function(b){if(b.material)if(Array.isArray(b.material))b.material.forEach((u)=>u.needsUpdate=!0);else b.material.needsUpdate=!0});for(let b=0,u=_.length;b<u;b++){let l=_[b],h=l.shadow;if(h===void 0){Y0("WebGLShadowMap:",l,"has no shadow.");continue}if(h.autoUpdate===!1&&h.needsUpdate===!1)continue;Z.copy(h.mapSize);let r=h.getFrameExtents();if(Z.multiply(r),K.copy(h.mapSize),Z.x>N||Z.y>N){if(Z.x>N)K.x=Math.floor(N/r.x),Z.x=K.x*r.x,h.mapSize.x=K.x;if(Z.y>N)K.y=Math.floor(N/r.y),Z.y=K.y*r.y,h.mapSize.y=K.y}let W0=J.state.buffers.depth.getReversed();if(h.camera._reversedDepth=W0,h.map===null||n===!0){if(h.map!==null){if(h.map.depthTexture!==null)h.map.depthTexture.dispose(),h.map.depthTexture=null;h.map.dispose()}if(this.type===q7){if(l.isPointLight){Y0("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}h.map=new oJ(Z.x,Z.y,{format:S8,type:x9,minFilter:iJ,magFilter:iJ,generateMipmaps:!1}),h.map.texture.name=l.name+".shadowMap",h.map.depthTexture=new $8(Z.x,Z.y,h9),h.map.depthTexture.name=l.name+".shadowMapDepth",h.map.depthTexture.format=P8,h.map.depthTexture.compareFunction=null,h.map.depthTexture.minFilter=J8,h.map.depthTexture.magFilter=J8}else{if(l.isPointLight)h.map=new GK(Z.x),h.map.depthTexture=new qZ(Z.x,Q8);else h.map=new oJ(Z.x,Z.y),h.map.depthTexture=new $8(Z.x,Z.y,Q8);if(h.map.depthTexture.name=l.name+".shadowMap",h.map.depthTexture.format=P8,this.type===c7)h.map.depthTexture.compareFunction=W0?LQ:MQ,h.map.depthTexture.minFilter=iJ,h.map.depthTexture.magFilter=iJ;else h.map.depthTexture.compareFunction=null,h.map.depthTexture.minFilter=J8,h.map.depthTexture.magFilter=J8}h.camera.updateProjectionMatrix()}let H0=h.map.isWebGLCubeRenderTarget?6:1;for(let C0=0;C0<H0;C0++){if(h.map.isWebGLCubeRenderTarget)J.setRenderTarget(h.map,C0),J.clear();else{if(C0===0)J.setRenderTarget(h.map),J.clear();let L0=h.getViewport(C0);H.set(K.x*L0.x,K.y*L0.y,K.x*L0.z,K.y*L0.w),p.viewport(H)}if(l.isPointLight){let{camera:L0,matrix:UJ}=h,HJ=l.distance||L0.far;if(HJ!==L0.far)L0.far=HJ,L0.updateProjectionMatrix();N6.setFromMatrixPosition(l.matrixWorld),L0.position.copy(N6),HK.copy(L0.position),HK.add(z1[C0]),L0.up.copy(I1[C0]),L0.lookAt(HK),L0.updateMatrixWorld(),UJ.makeTranslation(-N6.x,-N6.y,-N6.z),MU.multiplyMatrices(L0.projectionMatrix,L0.matrixWorldInverse),h._frustum.setFromProjectionMatrix(MU,L0.coordinateSystem,L0.reversedDepth)}else h.updateMatrices(l);W=h.getFrustum(),M(C,k,h.camera,l,this.type)}if(h.isPointLightShadow!==!0&&this.type===q7)I(h,k);h.needsUpdate=!1}F=this.type,D.needsUpdate=!1,J.setRenderTarget(B,f,T)};function I(_,C){let k=Q.update(R);if(G.defines.VSM_SAMPLES!==_.blurSamples)G.defines.VSM_SAMPLES=_.blurSamples,q.defines.VSM_SAMPLES=_.blurSamples,G.needsUpdate=!0,q.needsUpdate=!0;if(_.mapPass===null)_.mapPass=new oJ(Z.x,Z.y,{format:S8,type:x9});G.uniforms.shadow_pass.value=_.map.depthTexture,G.uniforms.resolution.value=_.mapSize,G.uniforms.radius.value=_.radius,J.setRenderTarget(_.mapPass),J.clear(),J.renderBufferDirect(C,null,k,G,R,null),q.uniforms.shadow_pass.value=_.mapPass.texture,q.uniforms.resolution.value=_.mapSize,q.uniforms.radius.value=_.radius,J.setRenderTarget(_.map),J.clear(),J.renderBufferDirect(C,null,k,q,R,null)}function V(_,C,k,B){let f=null,T=k.isPointLight===!0?_.customDistanceMaterial:_.customDepthMaterial;if(T!==void 0)f=T;else if(f=k.isPointLight===!0?X:Y,J.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0||C.alphaToCoverage===!0){let p=f.uuid,n=C.uuid,b=U[p];if(b===void 0)b={},U[p]=b;let u=b[n];if(u===void 0)u=f.clone(),b[n]=u,C.addEventListener("dispose",w);f=u}if(f.visible=C.visible,f.wireframe=C.wireframe,B===q7)f.side=C.shadowSide!==null?C.shadowSide:C.side;else f.side=C.shadowSide!==null?C.shadowSide:E[C.side];if(f.alphaMap=C.alphaMap,f.alphaTest=C.alphaToCoverage===!0?0.5:C.alphaTest,f.map=C.map,f.clipShadows=C.clipShadows,f.clippingPlanes=C.clippingPlanes,f.clipIntersection=C.clipIntersection,f.displacementMap=C.displacementMap,f.displacementScale=C.displacementScale,f.displacementBias=C.displacementBias,f.wireframeLinewidth=C.wireframeLinewidth,f.linewidth=C.linewidth,k.isPointLight===!0&&f.isMeshDistanceMaterial===!0){let p=J.properties.get(f);p.light=k}return f}function M(_,C,k,B,f){if(_.visible===!1)return;if(_.layers.test(C.layers)&&(_.isMesh||_.isLine||_.isPoints)){if((_.castShadow||_.receiveShadow&&f===q7)&&(!_.frustumCulled||W.intersectsObject(_))){_.modelViewMatrix.multiplyMatrices(k.matrixWorldInverse,_.matrixWorld);let n=Q.update(_),b=_.material;if(Array.isArray(b)){let u=n.groups;for(let l=0,h=u.length;l<h;l++){let r=u[l],W0=b[r.materialIndex];if(W0&&W0.visible){let H0=V(_,W0,B,f);_.onBeforeShadow(J,_,C,k,n,H0,r),J.renderBufferDirect(k,null,n,H0,_,r),_.onAfterShadow(J,_,C,k,n,H0,r)}}}else if(b.visible){let u=V(_,b,B,f);_.onBeforeShadow(J,_,C,k,n,u,null),J.renderBufferDirect(k,null,n,u,_,null),_.onAfterShadow(J,_,C,k,n,u,null)}}}let p=_.children;for(let n=0,b=p.length;n<b;n++)M(p[n],C,k,B,f)}function w(_){_.target.removeEventListener("dispose",w);for(let k in U){let B=U[k],f=_.target.uuid;if(f in B)B[f].dispose(),delete B[f]}}}function w1(J,Q){function $(){let y=!1,U0=new XJ,s=null,E0=new XJ(0,0,0,0);return{setMask:function(I0){if(s!==I0&&!y)J.colorMask(I0,I0,I0,I0),s=I0},setLocked:function(I0){y=I0},setClear:function(I0,J0,q0,s0,MJ){if(MJ===!0)I0*=s0,J0*=s0,q0*=s0;if(U0.set(I0,J0,q0,s0),E0.equals(U0)===!1)J.clearColor(I0,J0,q0,s0),E0.copy(U0)},reset:function(){y=!1,s=null,E0.set(-1,0,0,0)}}}function W(){let y=!1,U0=!1,s=null,E0=null,I0=null;return{setReversed:function(J0){if(U0!==J0){let q0=Q.get("EXT_clip_control");if(J0)q0.clipControlEXT(q0.LOWER_LEFT_EXT,q0.ZERO_TO_ONE_EXT);else q0.clipControlEXT(q0.LOWER_LEFT_EXT,q0.NEGATIVE_ONE_TO_ONE_EXT);U0=J0;let s0=I0;I0=null,this.setClear(s0)}},getReversed:function(){return U0},setTest:function(J0){if(J0)N0(J.DEPTH_TEST);else b0(J.DEPTH_TEST)},setMask:function(J0){if(s!==J0&&!y)J.depthMask(J0),s=J0},setFunc:function(J0){if(U0)J0=jY[J0];if(E0!==J0){switch(J0){case JY:J.depthFunc(J.NEVER);break;case QY:J.depthFunc(J.ALWAYS);break;case $Y:J.depthFunc(J.LESS);break;case YW:J.depthFunc(J.LEQUAL);break;case WY:J.depthFunc(J.EQUAL);break;case ZY:J.depthFunc(J.GEQUAL);break;case KY:J.depthFunc(J.GREATER);break;case HY:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}E0=J0}},setLocked:function(J0){y=J0},setClear:function(J0){if(I0!==J0){if(I0=J0,U0)J0=1-J0;J.clearDepth(J0)}},reset:function(){y=!1,s=null,E0=null,I0=null,U0=!1}}}function Z(){let y=!1,U0=null,s=null,E0=null,I0=null,J0=null,q0=null,s0=null,MJ=null;return{setTest:function(DJ){if(!y)if(DJ)N0(J.STENCIL_TEST);else b0(J.STENCIL_TEST)},setMask:function(DJ){if(U0!==DJ&&!y)J.stencilMask(DJ),U0=DJ},setFunc:function(DJ,D9,A9){if(s!==DJ||E0!==D9||I0!==A9)J.stencilFunc(DJ,D9,A9),s=DJ,E0=D9,I0=A9},setOp:function(DJ,D9,A9){if(J0!==DJ||q0!==D9||s0!==A9)J.stencilOp(DJ,D9,A9),J0=DJ,q0=D9,s0=A9},setLocked:function(DJ){y=DJ},setClear:function(DJ){if(MJ!==DJ)J.clearStencil(DJ),MJ=DJ},reset:function(){y=!1,U0=null,s=null,E0=null,I0=null,J0=null,q0=null,s0=null,MJ=null}}}let K=new $,H=new W,Y=new Z,X=new WeakMap,U=new WeakMap,N={},E={},G={},q=new WeakMap,O=[],R=null,D=!1,F=null,I=null,V=null,M=null,w=null,_=null,C=null,k=new B0(0,0,0),B=0,f=!1,T=null,p=null,n=null,b=null,u=null,l=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),h=!1,r=0,W0=J.getParameter(J.VERSION);if(W0.indexOf("WebGL")!==-1)r=parseFloat(/^WebGL (\d)/.exec(W0)[1]),h=r>=1;else if(W0.indexOf("OpenGL ES")!==-1)r=parseFloat(/^OpenGL ES (\d)/.exec(W0)[1]),h=r>=2;let H0=null,C0={},L0=J.getParameter(J.SCISSOR_BOX),UJ=J.getParameter(J.VIEWPORT),HJ=new XJ().fromArray(L0),i=new XJ().fromArray(UJ);function X0(y,U0,s,E0){let I0=new Uint8Array(4),J0=J.createTexture();J.bindTexture(y,J0),J.texParameteri(y,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(y,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let q0=0;q0<s;q0++)if(y===J.TEXTURE_3D||y===J.TEXTURE_2D_ARRAY)J.texImage3D(U0,0,J.RGBA,1,1,E0,0,J.RGBA,J.UNSIGNED_BYTE,I0);else J.texImage2D(U0+q0,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,I0);return J0}let V0={};V0[J.TEXTURE_2D]=X0(J.TEXTURE_2D,J.TEXTURE_2D,1),V0[J.TEXTURE_CUBE_MAP]=X0(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),V0[J.TEXTURE_2D_ARRAY]=X0(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),V0[J.TEXTURE_3D]=X0(J.TEXTURE_3D,J.TEXTURE_3D,1,1),K.setClear(0,0,0,1),H.setClear(1),Y.setClear(0),N0(J.DEPTH_TEST),H.setFunc(YW),z0(!1),S0(WW),N0(J.CULL_FACE),Q0(V9);function N0(y){if(N[y]!==!0)J.enable(y),N[y]=!0}function b0(y){if(N[y]!==!1)J.disable(y),N[y]=!1}function QJ(y,U0){if(G[y]!==U0){if(J.bindFramebuffer(y,U0),G[y]=U0,y===J.DRAW_FRAMEBUFFER)G[J.FRAMEBUFFER]=U0;if(y===J.FRAMEBUFFER)G[J.DRAW_FRAMEBUFFER]=U0;return!0}return!1}function m0(y,U0){let s=O,E0=!1;if(y){if(s=q.get(U0),s===void 0)s=[],q.set(U0,s);let I0=y.textures;if(s.length!==I0.length||s[0]!==J.COLOR_ATTACHMENT0){for(let J0=0,q0=I0.length;J0<q0;J0++)s[J0]=J.COLOR_ATTACHMENT0+J0;s.length=I0.length,E0=!0}}else if(s[0]!==J.BACK)s[0]=J.BACK,E0=!0;if(E0)J.drawBuffers(s)}function d0(y){if(R!==y)return J.useProgram(y),R=y,!0;return!1}let t={[D7]:J.FUNC_ADD,[fH]:J.FUNC_SUBTRACT,[bH]:J.FUNC_REVERSE_SUBTRACT};t[hH]=J.MIN,t[xH]=J.MAX;let $0={[gH]:J.ZERO,[pH]:J.ONE,[mH]:J.SRC_COLOR,[lH]:J.SRC_ALPHA,[oH]:J.SRC_ALPHA_SATURATE,[sH]:J.DST_COLOR,[cH]:J.DST_ALPHA,[dH]:J.ONE_MINUS_SRC_COLOR,[uH]:J.ONE_MINUS_SRC_ALPHA,[iH]:J.ONE_MINUS_DST_COLOR,[nH]:J.ONE_MINUS_DST_ALPHA,[aH]:J.CONSTANT_COLOR,[rH]:J.ONE_MINUS_CONSTANT_COLOR,[tH]:J.CONSTANT_ALPHA,[eH]:J.ONE_MINUS_CONSTANT_ALPHA};function Q0(y,U0,s,E0,I0,J0,q0,s0,MJ,DJ){if(y===V9){if(D===!0)b0(J.BLEND),D=!1;return}if(D===!1)N0(J.BLEND),D=!0;if(y!==vH){if(y!==F||DJ!==f){if(I!==D7||w!==D7)J.blendEquation(J.FUNC_ADD),I=D7,w=D7;if(DJ)switch(y){case n7:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case ZW:J.blendFunc(J.ONE,J.ONE);break;case KW:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case HW:J.blendFuncSeparate(J.DST_COLOR,J.ONE_MINUS_SRC_ALPHA,J.ZERO,J.ONE);break;default:T0("WebGLState: Invalid blending: ",y);break}else switch(y){case n7:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case ZW:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE,J.ONE,J.ONE);break;case KW:T0("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case HW:T0("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:T0("WebGLState: Invalid blending: ",y);break}V=null,M=null,_=null,C=null,k.set(0,0,0),B=0,F=y,f=DJ}return}if(I0=I0||U0,J0=J0||s,q0=q0||E0,U0!==I||I0!==w)J.blendEquationSeparate(t[U0],t[I0]),I=U0,w=I0;if(s!==V||E0!==M||J0!==_||q0!==C)J.blendFuncSeparate($0[s],$0[E0],$0[J0],$0[q0]),V=s,M=E0,_=J0,C=q0;if(s0.equals(k)===!1||MJ!==B)J.blendColor(s0.r,s0.g,s0.b,MJ),k.copy(s0),B=MJ;F=y,f=!1}function k0(y,U0){y.side===L9?b0(J.CULL_FACE):N0(J.CULL_FACE);let s=y.side===sJ;if(U0)s=!s;z0(s),y.blending===n7&&y.transparent===!1?Q0(V9):Q0(y.blending,y.blendEquation,y.blendSrc,y.blendDst,y.blendEquationAlpha,y.blendSrcAlpha,y.blendDstAlpha,y.blendColor,y.blendAlpha,y.premultipliedAlpha),H.setFunc(y.depthFunc),H.setTest(y.depthTest),H.setMask(y.depthWrite),K.setMask(y.colorWrite);let E0=y.stencilWrite;if(Y.setTest(E0),E0)Y.setMask(y.stencilWriteMask),Y.setFunc(y.stencilFunc,y.stencilRef,y.stencilFuncMask),Y.setOp(y.stencilFail,y.stencilZFail,y.stencilZPass);c0(y.polygonOffset,y.polygonOffsetFactor,y.polygonOffsetUnits),y.alphaToCoverage===!0?N0(J.SAMPLE_ALPHA_TO_COVERAGE):b0(J.SAMPLE_ALPHA_TO_COVERAGE)}function z0(y){if(T!==y){if(y)J.frontFace(J.CW);else J.frontFace(J.CCW);T=y}}function S0(y){if(y!==SH){if(N0(J.CULL_FACE),y!==p)if(y===WW)J.cullFace(J.BACK);else if(y===jH)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else b0(J.CULL_FACE);p=y}function y0(y){if(y!==n){if(h)J.lineWidth(y);n=y}}function c0(y,U0,s){if(y){if(N0(J.POLYGON_OFFSET_FILL),b!==U0||u!==s){if(b=U0,u=s,H.getReversed())U0=-U0;J.polygonOffset(U0,s)}}else b0(J.POLYGON_OFFSET_FILL)}function n0(y){if(y)N0(J.SCISSOR_TEST);else b0(J.SCISSOR_TEST)}function S(y){if(y===void 0)y=J.TEXTURE0+l-1;if(H0!==y)J.activeTexture(y),H0=y}function FJ(y,U0,s){if(s===void 0)if(H0===null)s=J.TEXTURE0+l-1;else s=H0;let E0=C0[s];if(E0===void 0)E0={type:void 0,texture:void 0},C0[s]=E0;if(E0.type!==y||E0.texture!==U0){if(H0!==s)J.activeTexture(s),H0=s;J.bindTexture(y,U0||V0[y]),E0.type=y,E0.texture=U0}}function e0(){let y=C0[H0];if(y!==void 0&&y.type!==void 0)J.bindTexture(y.type,null),y.type=void 0,y.texture=void 0}function r0(){try{J.compressedTexImage2D(...arguments)}catch(y){T0("WebGLState:",y)}}function A(){try{J.compressedTexImage3D(...arguments)}catch(y){T0("WebGLState:",y)}}function L(){try{J.texSubImage2D(...arguments)}catch(y){T0("WebGLState:",y)}}function j(){try{J.texSubImage3D(...arguments)}catch(y){T0("WebGLState:",y)}}function m(){try{J.compressedTexSubImage2D(...arguments)}catch(y){T0("WebGLState:",y)}}function e(){try{J.compressedTexSubImage3D(...arguments)}catch(y){T0("WebGLState:",y)}}function Z0(){try{J.texStorage2D(...arguments)}catch(y){T0("WebGLState:",y)}}function G0(){try{J.texStorage3D(...arguments)}catch(y){T0("WebGLState:",y)}}function c(){try{J.texImage2D(...arguments)}catch(y){T0("WebGLState:",y)}}function o(){try{J.texImage3D(...arguments)}catch(y){T0("WebGLState:",y)}}function M0(y){if(E[y]!==void 0)return E[y];else return J.getParameter(y)}function j0(y,U0){if(E[y]!==U0)J.pixelStorei(y,U0),E[y]=U0}function F0(y){if(HJ.equals(y)===!1)J.scissor(y.x,y.y,y.z,y.w),HJ.copy(y)}function K0(y){if(i.equals(y)===!1)J.viewport(y.x,y.y,y.z,y.w),i.copy(y)}function h0(y,U0){let s=U.get(U0);if(s===void 0)s=new WeakMap,U.set(U0,s);let E0=s.get(y);if(E0===void 0)E0=J.getUniformBlockIndex(U0,y.name),s.set(y,E0)}function x0(y,U0){let E0=U.get(U0).get(y);if(X.get(U0)!==E0)J.uniformBlockBinding(U0,E0,y.__bindingPointIndex),X.set(U0,E0)}function KJ(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),H.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),J.pixelStorei(J.PACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_ALIGNMENT,4),J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,!1),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,J.BROWSER_DEFAULT_WEBGL),J.pixelStorei(J.PACK_ROW_LENGTH,0),J.pixelStorei(J.PACK_SKIP_PIXELS,0),J.pixelStorei(J.PACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_ROW_LENGTH,0),J.pixelStorei(J.UNPACK_IMAGE_HEIGHT,0),J.pixelStorei(J.UNPACK_SKIP_PIXELS,0),J.pixelStorei(J.UNPACK_SKIP_ROWS,0),J.pixelStorei(J.UNPACK_SKIP_IMAGES,0),N={},E={},H0=null,C0={},G={},q=new WeakMap,O=[],R=null,D=!1,F=null,I=null,V=null,M=null,w=null,_=null,C=null,k=new B0(0,0,0),B=0,f=!1,T=null,p=null,n=null,b=null,u=null,HJ.set(0,0,J.canvas.width,J.canvas.height),i.set(0,0,J.canvas.width,J.canvas.height),K.reset(),H.reset(),Y.reset()}return{buffers:{color:K,depth:H,stencil:Y},enable:N0,disable:b0,bindFramebuffer:QJ,drawBuffers:m0,useProgram:d0,setBlending:Q0,setMaterial:k0,setFlipSided:z0,setCullFace:S0,setLineWidth:y0,setPolygonOffset:c0,setScissorTest:n0,activeTexture:S,bindTexture:FJ,unbindTexture:e0,compressedTexImage2D:r0,compressedTexImage3D:A,texImage2D:c,texImage3D:o,pixelStorei:j0,getParameter:M0,updateUBOMapping:h0,uniformBlockBinding:x0,texStorage2D:Z0,texStorage3D:G0,texSubImage2D:L,texSubImage3D:j,compressedTexSubImage2D:m,compressedTexSubImage3D:e,scissor:F0,viewport:K0,reset:KJ}}function _1(J,Q,$,W,Z,K,H){let Y=Q.has("WEBGL_multisampled_render_to_texture")?Q.get("WEBGL_multisampled_render_to_texture"):null,X=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new a,N=new WeakMap,E=new Set,G,q=new WeakMap,O=!1;try{O=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(A){}function R(A,L){return O?new OffscreenCanvas(A,L):X7("canvas")}function D(A,L,j){let m=1,e=r0(A);if(e.width>j||e.height>j)m=j/Math.max(e.width,e.height);if(m<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){let Z0=Math.floor(m*e.width),G0=Math.floor(m*e.height);if(G===void 0)G=R(Z0,G0);let c=L?R(Z0,G0):G;return c.width=Z0,c.height=G0,c.getContext("2d").drawImage(A,0,0,Z0,G0),Y0("WebGLRenderer: Texture has been resized from ("+e.width+"x"+e.height+") to ("+Z0+"x"+G0+")."),c}else{if("data"in A)Y0("WebGLRenderer: Image in DataTexture is too big ("+e.width+"x"+e.height+").");return A}return A}function F(A){return A.generateMipmaps}function I(A){J.generateMipmap(A)}function V(A){if(A.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(A.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function M(A,L,j,m,e,Z0=!1){if(A!==null){if(J[A]!==void 0)return J[A];Y0("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let G0;if(m){if(G0=Q.get("EXT_texture_norm16"),!G0)Y0("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension")}let c=L;if(L===J.RED){if(j===J.FLOAT)c=J.R32F;if(j===J.HALF_FLOAT)c=J.R16F;if(j===J.UNSIGNED_BYTE)c=J.R8;if(j===J.UNSIGNED_SHORT&&G0)c=G0.R16_EXT;if(j===J.SHORT&&G0)c=G0.R16_SNORM_EXT}if(L===J.RED_INTEGER){if(j===J.UNSIGNED_BYTE)c=J.R8UI;if(j===J.UNSIGNED_SHORT)c=J.R16UI;if(j===J.UNSIGNED_INT)c=J.R32UI;if(j===J.BYTE)c=J.R8I;if(j===J.SHORT)c=J.R16I;if(j===J.INT)c=J.R32I}if(L===J.RG){if(j===J.FLOAT)c=J.RG32F;if(j===J.HALF_FLOAT)c=J.RG16F;if(j===J.UNSIGNED_BYTE)c=J.RG8;if(j===J.UNSIGNED_SHORT&&G0)c=G0.RG16_EXT;if(j===J.SHORT&&G0)c=G0.RG16_SNORM_EXT}if(L===J.RG_INTEGER){if(j===J.UNSIGNED_BYTE)c=J.RG8UI;if(j===J.UNSIGNED_SHORT)c=J.RG16UI;if(j===J.UNSIGNED_INT)c=J.RG32UI;if(j===J.BYTE)c=J.RG8I;if(j===J.SHORT)c=J.RG16I;if(j===J.INT)c=J.RG32I}if(L===J.RGB_INTEGER){if(j===J.UNSIGNED_BYTE)c=J.RGB8UI;if(j===J.UNSIGNED_SHORT)c=J.RGB16UI;if(j===J.UNSIGNED_INT)c=J.RGB32UI;if(j===J.BYTE)c=J.RGB8I;if(j===J.SHORT)c=J.RGB16I;if(j===J.INT)c=J.RGB32I}if(L===J.RGBA_INTEGER){if(j===J.UNSIGNED_BYTE)c=J.RGBA8UI;if(j===J.UNSIGNED_SHORT)c=J.RGBA16UI;if(j===J.UNSIGNED_INT)c=J.RGBA32UI;if(j===J.BYTE)c=J.RGBA8I;if(j===J.SHORT)c=J.RGBA16I;if(j===J.INT)c=J.RGBA32I}if(L===J.RGB){if(j===J.UNSIGNED_SHORT&&G0)c=G0.RGB16_EXT;if(j===J.SHORT&&G0)c=G0.RGB16_SNORM_EXT;if(j===J.UNSIGNED_INT_5_9_9_9_REV)c=J.RGB9_E5;if(j===J.UNSIGNED_INT_10F_11F_11F_REV)c=J.R11F_G11F_B10F}if(L===J.RGBA){let o=Z0?eW:JJ.getTransfer(e);if(j===J.FLOAT)c=J.RGBA32F;if(j===J.HALF_FLOAT)c=J.RGBA16F;if(j===J.UNSIGNED_BYTE)c=o===qJ?J.SRGB8_ALPHA8:J.RGBA8;if(j===J.UNSIGNED_SHORT&&G0)c=G0.RGBA16_EXT;if(j===J.SHORT&&G0)c=G0.RGBA16_SNORM_EXT;if(j===J.UNSIGNED_SHORT_4_4_4_4)c=J.RGBA4;if(j===J.UNSIGNED_SHORT_5_5_5_1)c=J.RGB5_A1}if(c===J.R16F||c===J.R32F||c===J.RG16F||c===J.RG32F||c===J.RGBA16F||c===J.RGBA32F)Q.get("EXT_color_buffer_float");return c}function w(A,L){let j;if(A){if(L===null||L===Q8||L===R7)j=J.DEPTH24_STENCIL8;else if(L===h9)j=J.DEPTH32F_STENCIL8;else if(L===o7)j=J.DEPTH24_STENCIL8,Y0("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(L===null||L===Q8||L===R7)j=J.DEPTH_COMPONENT24;else if(L===h9)j=J.DEPTH_COMPONENT32F;else if(L===o7)j=J.DEPTH_COMPONENT16;return j}function _(A,L){if(F(A)===!0||A.isFramebufferTexture&&A.minFilter!==J8&&A.minFilter!==iJ)return Math.log2(Math.max(L.width,L.height))+1;else if(A.mipmaps!==void 0&&A.mipmaps.length>0)return A.mipmaps.length;else if(A.isCompressedTexture&&Array.isArray(A.image))return L.mipmaps.length;else return 1}function C(A){let L=A.target;if(L.removeEventListener("dispose",C),B(L),L.isVideoTexture)N.delete(L);if(L.isHTMLTexture)E.delete(L)}function k(A){let L=A.target;L.removeEventListener("dispose",k),T(L)}function B(A){let L=W.get(A);if(L.__webglInit===void 0)return;let j=A.source,m=q.get(j);if(m){let e=m[L.__cacheKey];if(e.usedTimes--,e.usedTimes===0)f(A);if(Object.keys(m).length===0)q.delete(j)}W.remove(A)}function f(A){let L=W.get(A);J.deleteTexture(L.__webglTexture);let j=A.source,m=q.get(j);delete m[L.__cacheKey],H.memory.textures--}function T(A){let L=W.get(A);if(A.depthTexture)A.depthTexture.dispose(),W.remove(A.depthTexture);if(A.isWebGLCubeRenderTarget)for(let m=0;m<6;m++){if(Array.isArray(L.__webglFramebuffer[m]))for(let e=0;e<L.__webglFramebuffer[m].length;e++)J.deleteFramebuffer(L.__webglFramebuffer[m][e]);else J.deleteFramebuffer(L.__webglFramebuffer[m]);if(L.__webglDepthbuffer)J.deleteRenderbuffer(L.__webglDepthbuffer[m])}else{if(Array.isArray(L.__webglFramebuffer))for(let m=0;m<L.__webglFramebuffer.length;m++)J.deleteFramebuffer(L.__webglFramebuffer[m]);else J.deleteFramebuffer(L.__webglFramebuffer);if(L.__webglDepthbuffer)J.deleteRenderbuffer(L.__webglDepthbuffer);if(L.__webglMultisampledFramebuffer)J.deleteFramebuffer(L.__webglMultisampledFramebuffer);if(L.__webglColorRenderbuffer){for(let m=0;m<L.__webglColorRenderbuffer.length;m++)if(L.__webglColorRenderbuffer[m])J.deleteRenderbuffer(L.__webglColorRenderbuffer[m])}if(L.__webglDepthRenderbuffer)J.deleteRenderbuffer(L.__webglDepthRenderbuffer)}let j=A.textures;for(let m=0,e=j.length;m<e;m++){let Z0=W.get(j[m]);if(Z0.__webglTexture)J.deleteTexture(Z0.__webglTexture),H.memory.textures--;W.remove(j[m])}W.remove(A)}let p=0;function n(){p=0}function b(){return p}function u(A){p=A}function l(){let A=p;if(A>=Z.maxTextures)Y0("WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+Z.maxTextures);return p+=1,A}function h(A){let L=[];return L.push(A.wrapS),L.push(A.wrapT),L.push(A.wrapR||0),L.push(A.magFilter),L.push(A.minFilter),L.push(A.anisotropy),L.push(A.internalFormat),L.push(A.format),L.push(A.type),L.push(A.generateMipmaps),L.push(A.premultiplyAlpha),L.push(A.flipY),L.push(A.unpackAlignment),L.push(A.colorSpace),L.join()}function r(A,L){let j=W.get(A);if(A.isVideoTexture)FJ(A);if(A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&j.__version!==A.version){let m=A.image;if(m===null)Y0("WebGLRenderer: Texture marked for update but no image data found.");else if(m.complete===!1)Y0("WebGLRenderer: Texture marked for update but image is incomplete");else{b0(j,A,L);return}}else if(A.isExternalTexture)j.__webglTexture=A.sourceTexture?A.sourceTexture:null;$.bindTexture(J.TEXTURE_2D,j.__webglTexture,J.TEXTURE0+L)}function W0(A,L){let j=W.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&j.__version!==A.version){b0(j,A,L);return}else if(A.isExternalTexture)j.__webglTexture=A.sourceTexture?A.sourceTexture:null;$.bindTexture(J.TEXTURE_2D_ARRAY,j.__webglTexture,J.TEXTURE0+L)}function H0(A,L){let j=W.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&j.__version!==A.version){b0(j,A,L);return}$.bindTexture(J.TEXTURE_3D,j.__webglTexture,J.TEXTURE0+L)}function C0(A,L){let j=W.get(A);if(A.isCubeDepthTexture!==!0&&A.version>0&&j.__version!==A.version){QJ(j,A,L);return}$.bindTexture(J.TEXTURE_CUBE_MAP,j.__webglTexture,J.TEXTURE0+L)}let L0={[GY]:J.REPEAT,[NQ]:J.CLAMP_TO_EDGE,[NY]:J.MIRRORED_REPEAT},UJ={[J8]:J.NEAREST,[EY]:J.NEAREST_MIPMAP_NEAREST,[i7]:J.NEAREST_MIPMAP_LINEAR,[iJ]:J.LINEAR,[EQ]:J.LINEAR_MIPMAP_NEAREST,[C8]:J.LINEAR_MIPMAP_LINEAR},HJ={[BY]:J.NEVER,[_Y]:J.ALWAYS,[zY]:J.LESS,[MQ]:J.LEQUAL,[IY]:J.EQUAL,[LQ]:J.GEQUAL,[AY]:J.GREATER,[wY]:J.NOTEQUAL};function i(A,L){if(L.type===h9&&Q.has("OES_texture_float_linear")===!1&&(L.magFilter===iJ||L.magFilter===EQ||L.magFilter===i7||L.magFilter===C8||L.minFilter===iJ||L.minFilter===EQ||L.minFilter===i7||L.minFilter===C8))Y0("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(A,J.TEXTURE_WRAP_S,L0[L.wrapS]),J.texParameteri(A,J.TEXTURE_WRAP_T,L0[L.wrapT]),A===J.TEXTURE_3D||A===J.TEXTURE_2D_ARRAY)J.texParameteri(A,J.TEXTURE_WRAP_R,L0[L.wrapR]);if(J.texParameteri(A,J.TEXTURE_MAG_FILTER,UJ[L.magFilter]),J.texParameteri(A,J.TEXTURE_MIN_FILTER,UJ[L.minFilter]),L.compareFunction)J.texParameteri(A,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(A,J.TEXTURE_COMPARE_FUNC,HJ[L.compareFunction]);if(Q.has("EXT_texture_filter_anisotropic")===!0){if(L.magFilter===J8)return;if(L.minFilter!==i7&&L.minFilter!==C8)return;if(L.type===h9&&Q.has("OES_texture_float_linear")===!1)return;if(L.anisotropy>1||W.get(L).__currentAnisotropy){let j=Q.get("EXT_texture_filter_anisotropic");J.texParameterf(A,j.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(L.anisotropy,Z.getMaxAnisotropy())),W.get(L).__currentAnisotropy=L.anisotropy}}}function X0(A,L){let j=!1;if(A.__webglInit===void 0)A.__webglInit=!0,L.addEventListener("dispose",C);let m=L.source,e=q.get(m);if(e===void 0)e={},q.set(m,e);let Z0=h(L);if(Z0!==A.__cacheKey){if(e[Z0]===void 0)e[Z0]={texture:J.createTexture(),usedTimes:0},H.memory.textures++,j=!0;e[Z0].usedTimes++;let G0=e[A.__cacheKey];if(G0!==void 0){if(e[A.__cacheKey].usedTimes--,G0.usedTimes===0)f(L)}A.__cacheKey=Z0,A.__webglTexture=e[Z0].texture}return j}function V0(A,L,j){return Math.floor(Math.floor(A/j)/L)}function N0(A,L,j,m){let Z0=A.updateRanges;if(Z0.length===0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,L.width,L.height,j,m,L.data);else{Z0.sort((j0,F0)=>j0.start-F0.start);let G0=0;for(let j0=1;j0<Z0.length;j0++){let F0=Z0[G0],K0=Z0[j0],h0=F0.start+F0.count,x0=V0(K0.start,L.width,4),KJ=V0(F0.start,L.width,4);if(K0.start<=h0+1&&x0===KJ&&V0(K0.start+K0.count-1,L.width,4)===x0)F0.count=Math.max(F0.count,K0.start+K0.count-F0.start);else++G0,Z0[G0]=K0}Z0.length=G0+1;let c=$.getParameter(J.UNPACK_ROW_LENGTH),o=$.getParameter(J.UNPACK_SKIP_PIXELS),M0=$.getParameter(J.UNPACK_SKIP_ROWS);$.pixelStorei(J.UNPACK_ROW_LENGTH,L.width);for(let j0=0,F0=Z0.length;j0<F0;j0++){let K0=Z0[j0],h0=Math.floor(K0.start/4),x0=Math.ceil(K0.count/4),KJ=h0%L.width,y=Math.floor(h0/L.width),U0=x0,s=1;$.pixelStorei(J.UNPACK_SKIP_PIXELS,KJ),$.pixelStorei(J.UNPACK_SKIP_ROWS,y),$.texSubImage2D(J.TEXTURE_2D,0,KJ,y,U0,1,j,m,L.data)}A.clearUpdateRanges(),$.pixelStorei(J.UNPACK_ROW_LENGTH,c),$.pixelStorei(J.UNPACK_SKIP_PIXELS,o),$.pixelStorei(J.UNPACK_SKIP_ROWS,M0)}}function b0(A,L,j){let m=J.TEXTURE_2D;if(L.isDataArrayTexture||L.isCompressedArrayTexture)m=J.TEXTURE_2D_ARRAY;if(L.isData3DTexture)m=J.TEXTURE_3D;let e=X0(A,L),Z0=L.source;$.bindTexture(m,A.__webglTexture,J.TEXTURE0+j);let G0=W.get(Z0);if(Z0.version!==G0.__version||e===!0){if($.activeTexture(J.TEXTURE0+j),(typeof ImageBitmap<"u"&&L.image instanceof ImageBitmap)===!1){let s=JJ.getPrimaries(JJ.workingColorSpace),E0=L.colorSpace===j8?null:JJ.getPrimaries(L.colorSpace),I0=L.colorSpace===j8||s===E0?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,L.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,I0)}$.pixelStorei(J.UNPACK_ALIGNMENT,L.unpackAlignment);let o=D(L.image,!1,Z.maxTextureSize);o=e0(L,o);let M0=K.convert(L.format,L.colorSpace),j0=K.convert(L.type),F0=M(L.internalFormat,M0,j0,L.normalized,L.colorSpace,L.isVideoTexture);i(m,L);let K0,h0=L.mipmaps,x0=L.isVideoTexture!==!0,KJ=G0.__version===void 0||e===!0,y=Z0.dataReady,U0=_(L,o);if(L.isDepthTexture){if(F0=w(L.format===T8,L.type),KJ)if(x0)$.texStorage2D(J.TEXTURE_2D,1,F0,o.width,o.height);else $.texImage2D(J.TEXTURE_2D,0,F0,o.width,o.height,0,M0,j0,null)}else if(L.isDataTexture)if(h0.length>0){if(x0&&KJ)$.texStorage2D(J.TEXTURE_2D,U0,F0,h0[0].width,h0[0].height);for(let s=0,E0=h0.length;s<E0;s++)if(K0=h0[s],x0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,K0.width,K0.height,M0,j0,K0.data)}else $.texImage2D(J.TEXTURE_2D,s,F0,K0.width,K0.height,0,M0,j0,K0.data);L.generateMipmaps=!1}else if(x0){if(KJ)$.texStorage2D(J.TEXTURE_2D,U0,F0,o.width,o.height);if(y)N0(L,o,M0,j0)}else $.texImage2D(J.TEXTURE_2D,0,F0,o.width,o.height,0,M0,j0,o.data);else if(L.isCompressedTexture)if(L.isCompressedArrayTexture){if(x0&&KJ)$.texStorage3D(J.TEXTURE_2D_ARRAY,U0,F0,h0[0].width,h0[0].height,o.depth);for(let s=0,E0=h0.length;s<E0;s++)if(K0=h0[s],L.format!==B9)if(M0!==null)if(x0){if(y)if(L.layerUpdates.size>0){let I0=Y$(K0.width,K0.height,L.format,L.type);for(let J0 of L.layerUpdates){let q0=K0.data.subarray(J0*I0/K0.data.BYTES_PER_ELEMENT,(J0+1)*I0/K0.data.BYTES_PER_ELEMENT);$.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,J0,K0.width,K0.height,1,M0,q0)}L.clearLayerUpdates()}else $.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,K0.width,K0.height,o.depth,M0,K0.data)}else $.compressedTexImage3D(J.TEXTURE_2D_ARRAY,s,F0,K0.width,K0.height,o.depth,0,K0.data,0,0);else Y0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(x0){if(y)$.texSubImage3D(J.TEXTURE_2D_ARRAY,s,0,0,0,K0.width,K0.height,o.depth,M0,j0,K0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,s,F0,K0.width,K0.height,o.depth,0,M0,j0,K0.data)}else{if(x0&&KJ)$.texStorage2D(J.TEXTURE_2D,U0,F0,h0[0].width,h0[0].height);for(let s=0,E0=h0.length;s<E0;s++)if(K0=h0[s],L.format!==B9)if(M0!==null)if(x0){if(y)$.compressedTexSubImage2D(J.TEXTURE_2D,s,0,0,K0.width,K0.height,M0,K0.data)}else $.compressedTexImage2D(J.TEXTURE_2D,s,F0,K0.width,K0.height,0,K0.data);else Y0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(x0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,K0.width,K0.height,M0,j0,K0.data)}else $.texImage2D(J.TEXTURE_2D,s,F0,K0.width,K0.height,0,M0,j0,K0.data)}else if(L.isDataArrayTexture)if(x0){if(KJ)$.texStorage3D(J.TEXTURE_2D_ARRAY,U0,F0,o.width,o.height,o.depth);if(y)if(L.layerUpdates.size>0){let s=Y$(o.width,o.height,L.format,L.type);for(let E0 of L.layerUpdates){let I0=o.data.subarray(E0*s/o.data.BYTES_PER_ELEMENT,(E0+1)*s/o.data.BYTES_PER_ELEMENT);$.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,E0,o.width,o.height,1,M0,j0,I0)}L.clearLayerUpdates()}else $.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,o.width,o.height,o.depth,M0,j0,o.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,0,F0,o.width,o.height,o.depth,0,M0,j0,o.data);else if(L.isData3DTexture)if(x0){if(KJ)$.texStorage3D(J.TEXTURE_3D,U0,F0,o.width,o.height,o.depth);if(y)$.texSubImage3D(J.TEXTURE_3D,0,0,0,0,o.width,o.height,o.depth,M0,j0,o.data)}else $.texImage3D(J.TEXTURE_3D,0,F0,o.width,o.height,o.depth,0,M0,j0,o.data);else if(L.isFramebufferTexture){if(KJ)if(x0)$.texStorage2D(J.TEXTURE_2D,U0,F0,o.width,o.height);else{let{width:s,height:E0}=o;for(let I0=0;I0<U0;I0++)$.texImage2D(J.TEXTURE_2D,I0,F0,s,E0,0,M0,j0,null),s>>=1,E0>>=1}}else if(L.isHTMLTexture){if("texElementImage2D"in J){let s=J.canvas;if(!s.hasAttribute("layoutsubtree"))s.setAttribute("layoutsubtree","true");if(o.parentNode!==s){s.appendChild(o),E.add(L),s.onpaint=(E0)=>{let I0=E0.changedElements;for(let J0 of E)if(I0.includes(J0.image))J0.needsUpdate=!0},s.requestPaint();return}if(J.texElementImage2D.length===3)J.texElementImage2D(J.TEXTURE_2D,J.RGBA8,o);else{let{RGBA:I0,RGBA:J0,UNSIGNED_BYTE:q0}=J;J.texElementImage2D(J.TEXTURE_2D,0,I0,J0,q0,o)}J.texParameteri(J.TEXTURE_2D,J.TEXTURE_MIN_FILTER,J.LINEAR),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_S,J.CLAMP_TO_EDGE),J.texParameteri(J.TEXTURE_2D,J.TEXTURE_WRAP_T,J.CLAMP_TO_EDGE)}}else if(h0.length>0){if(x0&&KJ){let s=r0(h0[0]);$.texStorage2D(J.TEXTURE_2D,U0,F0,s.width,s.height)}for(let s=0,E0=h0.length;s<E0;s++)if(K0=h0[s],x0){if(y)$.texSubImage2D(J.TEXTURE_2D,s,0,0,M0,j0,K0)}else $.texImage2D(J.TEXTURE_2D,s,F0,M0,j0,K0);L.generateMipmaps=!1}else if(x0){if(KJ){let s=r0(o);$.texStorage2D(J.TEXTURE_2D,U0,F0,s.width,s.height)}if(y)$.texSubImage2D(J.TEXTURE_2D,0,0,0,M0,j0,o)}else $.texImage2D(J.TEXTURE_2D,0,F0,M0,j0,o);if(F(L))I(m);if(G0.__version=Z0.version,L.onUpdate)L.onUpdate(L)}A.__version=L.version}function QJ(A,L,j){if(L.image.length!==6)return;let m=X0(A,L),e=L.source;$.bindTexture(J.TEXTURE_CUBE_MAP,A.__webglTexture,J.TEXTURE0+j);let Z0=W.get(e);if(e.version!==Z0.__version||m===!0){$.activeTexture(J.TEXTURE0+j);let G0=JJ.getPrimaries(JJ.workingColorSpace),c=L.colorSpace===j8?null:JJ.getPrimaries(L.colorSpace),o=L.colorSpace===j8||G0===c?J.NONE:J.BROWSER_DEFAULT_WEBGL;$.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,L.flipY),$.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,L.premultiplyAlpha),$.pixelStorei(J.UNPACK_ALIGNMENT,L.unpackAlignment),$.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,o);let M0=L.isCompressedTexture||L.image[0].isCompressedTexture,j0=L.image[0]&&L.image[0].isDataTexture,F0=[];for(let J0=0;J0<6;J0++){if(!M0&&!j0)F0[J0]=D(L.image[J0],!0,Z.maxCubemapSize);else F0[J0]=j0?L.image[J0].image:L.image[J0];F0[J0]=e0(L,F0[J0])}let K0=F0[0],h0=K.convert(L.format,L.colorSpace),x0=K.convert(L.type),KJ=M(L.internalFormat,h0,x0,L.normalized,L.colorSpace),y=L.isVideoTexture!==!0,U0=Z0.__version===void 0||m===!0,s=e.dataReady,E0=_(L,K0);i(J.TEXTURE_CUBE_MAP,L);let I0;if(M0){if(y&&U0)$.texStorage2D(J.TEXTURE_CUBE_MAP,E0,KJ,K0.width,K0.height);for(let J0=0;J0<6;J0++){I0=F0[J0].mipmaps;for(let q0=0;q0<I0.length;q0++){let s0=I0[q0];if(L.format!==B9)if(h0!==null)if(y){if(s)$.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0,0,0,s0.width,s0.height,h0,s0.data)}else $.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0,KJ,s0.width,s0.height,0,s0.data);else Y0("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0,0,0,s0.width,s0.height,h0,x0,s0.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0,KJ,s0.width,s0.height,0,h0,x0,s0.data)}}}else{if(I0=L.mipmaps,y&&U0){if(I0.length>0)E0++;let J0=r0(F0[0]);$.texStorage2D(J.TEXTURE_CUBE_MAP,E0,KJ,J0.width,J0.height)}for(let J0=0;J0<6;J0++)if(j0){if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,0,0,0,F0[J0].width,F0[J0].height,h0,x0,F0[J0].data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,0,KJ,F0[J0].width,F0[J0].height,0,h0,x0,F0[J0].data);for(let q0=0;q0<I0.length;q0++){let MJ=I0[q0].image[J0].image;if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0+1,0,0,MJ.width,MJ.height,h0,x0,MJ.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0+1,KJ,MJ.width,MJ.height,0,h0,x0,MJ.data)}}else{if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,0,0,0,h0,x0,F0[J0])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,0,KJ,h0,x0,F0[J0]);for(let q0=0;q0<I0.length;q0++){let s0=I0[q0];if(y){if(s)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0+1,0,0,h0,x0,s0.image[J0])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+J0,q0+1,KJ,h0,x0,s0.image[J0])}}}if(F(L))I(J.TEXTURE_CUBE_MAP);if(Z0.__version=e.version,L.onUpdate)L.onUpdate(L)}A.__version=L.version}function m0(A,L,j,m,e,Z0){let G0=K.convert(j.format,j.colorSpace),c=K.convert(j.type),o=M(j.internalFormat,G0,c,j.normalized,j.colorSpace),M0=W.get(L),j0=W.get(j);if(j0.__renderTarget=L,!M0.__hasExternalTextures){let F0=Math.max(1,L.width>>Z0),K0=Math.max(1,L.height>>Z0);if(e===J.TEXTURE_3D||e===J.TEXTURE_2D_ARRAY)$.texImage3D(e,Z0,o,F0,K0,L.depth,0,G0,c,null);else $.texImage2D(e,Z0,o,F0,K0,0,G0,c,null)}if($.bindFramebuffer(J.FRAMEBUFFER,A),S(L))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,m,e,j0.__webglTexture,0,n0(L));else if(e===J.TEXTURE_2D||e>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&e<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,m,e,j0.__webglTexture,Z0);$.bindFramebuffer(J.FRAMEBUFFER,null)}function d0(A,L,j){if(J.bindRenderbuffer(J.RENDERBUFFER,A),L.depthBuffer){let m=L.depthTexture,e=m&&m.isDepthTexture?m.type:null,Z0=w(L.stencilBuffer,e),G0=L.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(S(L))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,n0(L),Z0,L.width,L.height);else if(j)J.renderbufferStorageMultisample(J.RENDERBUFFER,n0(L),Z0,L.width,L.height);else J.renderbufferStorage(J.RENDERBUFFER,Z0,L.width,L.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,G0,J.RENDERBUFFER,A)}else{let m=L.textures;for(let e=0;e<m.length;e++){let Z0=m[e],G0=K.convert(Z0.format,Z0.colorSpace),c=K.convert(Z0.type),o=M(Z0.internalFormat,G0,c,Z0.normalized,Z0.colorSpace);if(S(L))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,n0(L),o,L.width,L.height);else if(j)J.renderbufferStorageMultisample(J.RENDERBUFFER,n0(L),o,L.width,L.height);else J.renderbufferStorage(J.RENDERBUFFER,o,L.width,L.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function t(A,L,j){let m=L.isWebGLCubeRenderTarget===!0;if($.bindFramebuffer(J.FRAMEBUFFER,A),!(L.depthTexture&&L.depthTexture.isDepthTexture))throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let e=W.get(L.depthTexture);if(e.__renderTarget=L,!e.__webglTexture||L.depthTexture.image.width!==L.width||L.depthTexture.image.height!==L.height)L.depthTexture.image.width=L.width,L.depthTexture.image.height=L.height,L.depthTexture.needsUpdate=!0;if(m){if(e.__webglInit===void 0)e.__webglInit=!0,L.depthTexture.addEventListener("dispose",C);if(e.__webglTexture===void 0){e.__webglTexture=J.createTexture(),$.bindTexture(J.TEXTURE_CUBE_MAP,e.__webglTexture),i(J.TEXTURE_CUBE_MAP,L.depthTexture);let M0=K.convert(L.depthTexture.format),j0=K.convert(L.depthTexture.type),F0;if(L.depthTexture.format===P8)F0=J.DEPTH_COMPONENT24;else if(L.depthTexture.format===T8)F0=J.DEPTH24_STENCIL8;for(let K0=0;K0<6;K0++)J.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+K0,0,F0,L.width,L.height,0,M0,j0,null)}}else r(L.depthTexture,0);let Z0=e.__webglTexture,G0=n0(L),c=m?J.TEXTURE_CUBE_MAP_POSITIVE_X+j:J.TEXTURE_2D,o=L.depthTexture.format===T8?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(L.depthTexture.format===P8)if(S(L))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,o,c,Z0,0,G0);else J.framebufferTexture2D(J.FRAMEBUFFER,o,c,Z0,0);else if(L.depthTexture.format===T8)if(S(L))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,o,c,Z0,0,G0);else J.framebufferTexture2D(J.FRAMEBUFFER,o,c,Z0,0);else throw Error("THREE.WebGLTextures: Unknown depthTexture format.")}function $0(A){let L=W.get(A),j=A.isWebGLCubeRenderTarget===!0;if(L.__boundDepthTexture!==A.depthTexture){let m=A.depthTexture;if(L.__depthDisposeCallback)L.__depthDisposeCallback();if(m){let e=()=>{delete L.__boundDepthTexture,delete L.__depthDisposeCallback,m.removeEventListener("dispose",e)};m.addEventListener("dispose",e),L.__depthDisposeCallback=e}L.__boundDepthTexture=m}if(A.depthTexture&&!L.__autoAllocateDepthBuffer)if(j)for(let m=0;m<6;m++)t(L.__webglFramebuffer[m],A,m);else{let m=A.texture.mipmaps;if(m&&m.length>0)t(L.__webglFramebuffer[0],A,0);else t(L.__webglFramebuffer,A,0)}else if(j){L.__webglDepthbuffer=[];for(let m=0;m<6;m++)if($.bindFramebuffer(J.FRAMEBUFFER,L.__webglFramebuffer[m]),L.__webglDepthbuffer[m]===void 0)L.__webglDepthbuffer[m]=J.createRenderbuffer(),d0(L.__webglDepthbuffer[m],A,!1);else{let e=A.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,Z0=L.__webglDepthbuffer[m];J.bindRenderbuffer(J.RENDERBUFFER,Z0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,Z0)}}else{let m=A.texture.mipmaps;if(m&&m.length>0)$.bindFramebuffer(J.FRAMEBUFFER,L.__webglFramebuffer[0]);else $.bindFramebuffer(J.FRAMEBUFFER,L.__webglFramebuffer);if(L.__webglDepthbuffer===void 0)L.__webglDepthbuffer=J.createRenderbuffer(),d0(L.__webglDepthbuffer,A,!1);else{let e=A.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,Z0=L.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,Z0),J.framebufferRenderbuffer(J.FRAMEBUFFER,e,J.RENDERBUFFER,Z0)}}$.bindFramebuffer(J.FRAMEBUFFER,null)}function Q0(A,L,j){let m=W.get(A);if(L!==void 0)m0(m.__webglFramebuffer,A,A.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(j!==void 0)$0(A)}function k0(A){let L=A.texture,j=W.get(A),m=W.get(L);A.addEventListener("dispose",k);let e=A.textures,Z0=A.isWebGLCubeRenderTarget===!0,G0=e.length>1;if(!G0){if(m.__webglTexture===void 0)m.__webglTexture=J.createTexture();m.__version=L.version,H.memory.textures++}if(Z0){j.__webglFramebuffer=[];for(let c=0;c<6;c++)if(L.mipmaps&&L.mipmaps.length>0){j.__webglFramebuffer[c]=[];for(let o=0;o<L.mipmaps.length;o++)j.__webglFramebuffer[c][o]=J.createFramebuffer()}else j.__webglFramebuffer[c]=J.createFramebuffer()}else{if(L.mipmaps&&L.mipmaps.length>0){j.__webglFramebuffer=[];for(let c=0;c<L.mipmaps.length;c++)j.__webglFramebuffer[c]=J.createFramebuffer()}else j.__webglFramebuffer=J.createFramebuffer();if(G0)for(let c=0,o=e.length;c<o;c++){let M0=W.get(e[c]);if(M0.__webglTexture===void 0)M0.__webglTexture=J.createTexture(),H.memory.textures++}if(A.samples>0&&S(A)===!1){j.__webglMultisampledFramebuffer=J.createFramebuffer(),j.__webglColorRenderbuffer=[],$.bindFramebuffer(J.FRAMEBUFFER,j.__webglMultisampledFramebuffer);for(let c=0;c<e.length;c++){let o=e[c];j.__webglColorRenderbuffer[c]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,j.__webglColorRenderbuffer[c]);let M0=K.convert(o.format,o.colorSpace),j0=K.convert(o.type),F0=M(o.internalFormat,M0,j0,o.normalized,o.colorSpace,A.isXRRenderTarget===!0),K0=n0(A);J.renderbufferStorageMultisample(J.RENDERBUFFER,K0,F0,A.width,A.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+c,J.RENDERBUFFER,j.__webglColorRenderbuffer[c])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),A.depthBuffer)j.__webglDepthRenderbuffer=J.createRenderbuffer(),d0(j.__webglDepthRenderbuffer,A,!0);$.bindFramebuffer(J.FRAMEBUFFER,null)}}if(Z0){$.bindTexture(J.TEXTURE_CUBE_MAP,m.__webglTexture),i(J.TEXTURE_CUBE_MAP,L);for(let c=0;c<6;c++)if(L.mipmaps&&L.mipmaps.length>0)for(let o=0;o<L.mipmaps.length;o++)m0(j.__webglFramebuffer[c][o],A,L,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+c,o);else m0(j.__webglFramebuffer[c],A,L,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+c,0);if(F(L))I(J.TEXTURE_CUBE_MAP);$.unbindTexture()}else if(G0){for(let c=0,o=e.length;c<o;c++){let M0=e[c],j0=W.get(M0),F0=J.TEXTURE_2D;if(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)F0=A.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(F0,j0.__webglTexture),i(F0,M0),m0(j.__webglFramebuffer,A,M0,J.COLOR_ATTACHMENT0+c,F0,0),F(M0))I(F0)}$.unbindTexture()}else{let c=J.TEXTURE_2D;if(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)c=A.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(c,m.__webglTexture),i(c,L),L.mipmaps&&L.mipmaps.length>0)for(let o=0;o<L.mipmaps.length;o++)m0(j.__webglFramebuffer[o],A,L,J.COLOR_ATTACHMENT0,c,o);else m0(j.__webglFramebuffer,A,L,J.COLOR_ATTACHMENT0,c,0);if(F(L))I(c);$.unbindTexture()}if(A.depthBuffer)$0(A)}function z0(A){let L=A.textures;for(let j=0,m=L.length;j<m;j++){let e=L[j];if(F(e)){let Z0=V(A),G0=W.get(e).__webglTexture;$.bindTexture(Z0,G0),I(Z0),$.unbindTexture()}}}let S0=[],y0=[];function c0(A){if(A.samples>0){if(S(A)===!1){let{textures:L,width:j,height:m}=A,e=J.COLOR_BUFFER_BIT,Z0=A.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,G0=W.get(A),c=L.length>1;if(c)for(let M0=0;M0<L.length;M0++)$.bindFramebuffer(J.FRAMEBUFFER,G0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+M0,J.RENDERBUFFER,null),$.bindFramebuffer(J.FRAMEBUFFER,G0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+M0,J.TEXTURE_2D,null,0);$.bindFramebuffer(J.READ_FRAMEBUFFER,G0.__webglMultisampledFramebuffer);let o=A.texture.mipmaps;if(o&&o.length>0)$.bindFramebuffer(J.DRAW_FRAMEBUFFER,G0.__webglFramebuffer[0]);else $.bindFramebuffer(J.DRAW_FRAMEBUFFER,G0.__webglFramebuffer);for(let M0=0;M0<L.length;M0++){if(A.resolveDepthBuffer){if(A.depthBuffer)e|=J.DEPTH_BUFFER_BIT;if(A.stencilBuffer&&A.resolveStencilBuffer)e|=J.STENCIL_BUFFER_BIT}if(c){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,G0.__webglColorRenderbuffer[M0]);let j0=W.get(L[M0]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,j0,0)}if(J.blitFramebuffer(0,0,j,m,0,0,j,m,e,J.NEAREST),X===!0){if(S0.length=0,y0.length=0,S0.push(J.COLOR_ATTACHMENT0+M0),A.depthBuffer&&A.resolveDepthBuffer===!1)S0.push(Z0),y0.push(Z0),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,y0);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,S0)}}if($.bindFramebuffer(J.READ_FRAMEBUFFER,null),$.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),c)for(let M0=0;M0<L.length;M0++){$.bindFramebuffer(J.FRAMEBUFFER,G0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+M0,J.RENDERBUFFER,G0.__webglColorRenderbuffer[M0]);let j0=W.get(L[M0]).__webglTexture;$.bindFramebuffer(J.FRAMEBUFFER,G0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+M0,J.TEXTURE_2D,j0,0)}$.bindFramebuffer(J.DRAW_FRAMEBUFFER,G0.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&X){let L=A.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[L])}}}function n0(A){return Math.min(Z.maxSamples,A.samples)}function S(A){let L=W.get(A);return A.samples>0&&Q.has("WEBGL_multisampled_render_to_texture")===!0&&L.__useRenderToTexture!==!1}function FJ(A){let L=H.render.frame;if(N.get(A)!==L)N.set(A,L),A.update()}function e0(A,L){let{colorSpace:j,format:m,type:e}=A;if(A.isCompressedTexture===!0||A.isVideoTexture===!0)return L;if(j!==tW&&j!==j8)if(JJ.getTransfer(j)===qJ){if(m!==B9||e!==q9)Y0("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else T0("WebGLTextures: Unsupported texture color space:",j);return L}function r0(A){if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement)U.width=A.naturalWidth||A.width,U.height=A.naturalHeight||A.height;else if(typeof VideoFrame<"u"&&A instanceof VideoFrame)U.width=A.displayWidth,U.height=A.displayHeight;else U.width=A.width,U.height=A.height;return U}this.allocateTextureUnit=l,this.resetTextureUnits=n,this.getTextureUnits=b,this.setTextureUnits=u,this.setTexture2D=r,this.setTexture2DArray=W0,this.setTexture3D=H0,this.setTextureCube=C0,this.rebindTextures=Q0,this.setupRenderTarget=k0,this.updateRenderTargetMipmap=z0,this.updateMultisampleRenderTarget=c0,this.setupDepthRenderbuffer=$0,this.setupFrameBufferTexture=m0,this.useMultisampledRTT=S,this.isReversedDepthBuffer=function(){return $.buffers.depth.getReversed()}}function C1(J,Q){function $(W,Z=j8){let K,H=JJ.getTransfer(Z);if(W===q9)return J.UNSIGNED_BYTE;if(W===OW)return J.UNSIGNED_SHORT_4_4_4_4;if(W===RW)return J.UNSIGNED_SHORT_5_5_5_1;if(W===DY)return J.UNSIGNED_INT_5_9_9_9_REV;if(W===OY)return J.UNSIGNED_INT_10F_11F_11F_REV;if(W===qY)return J.BYTE;if(W===FY)return J.SHORT;if(W===o7)return J.UNSIGNED_SHORT;if(W===DW)return J.INT;if(W===Q8)return J.UNSIGNED_INT;if(W===h9)return J.FLOAT;if(W===x9)return J.HALF_FLOAT;if(W===RY)return J.ALPHA;if(W===kY)return J.RGB;if(W===B9)return J.RGBA;if(W===P8)return J.DEPTH_COMPONENT;if(W===T8)return J.DEPTH_STENCIL;if(W===MY)return J.RED;if(W===kW)return J.RED_INTEGER;if(W===S8)return J.RG;if(W===MW)return J.RG_INTEGER;if(W===LW)return J.RGBA_INTEGER;if(W===qQ||W===FQ||W===DQ||W===OQ)if(H===qJ)if(K=Q.get("WEBGL_compressed_texture_s3tc_srgb"),K!==null){if(W===qQ)return K.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(W===FQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(W===DQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(W===OQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(K=Q.get("WEBGL_compressed_texture_s3tc"),K!==null){if(W===qQ)return K.COMPRESSED_RGB_S3TC_DXT1_EXT;if(W===FQ)return K.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(W===DQ)return K.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(W===OQ)return K.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(W===VW||W===BW||W===zW||W===IW)if(K=Q.get("WEBGL_compressed_texture_pvrtc"),K!==null){if(W===VW)return K.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(W===BW)return K.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(W===zW)return K.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(W===IW)return K.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(W===AW||W===wW||W===_W||W===CW||W===PW||W===RQ||W===TW)if(K=Q.get("WEBGL_compressed_texture_etc"),K!==null){if(W===AW||W===wW)return H===qJ?K.COMPRESSED_SRGB8_ETC2:K.COMPRESSED_RGB8_ETC2;if(W===_W)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:K.COMPRESSED_RGBA8_ETC2_EAC;if(W===CW)return K.COMPRESSED_R11_EAC;if(W===PW)return K.COMPRESSED_SIGNED_R11_EAC;if(W===RQ)return K.COMPRESSED_RG11_EAC;if(W===TW)return K.COMPRESSED_SIGNED_RG11_EAC}else return null;if(W===SW||W===jW||W===yW||W===vW||W===fW||W===bW||W===hW||W===xW||W===gW||W===pW||W===mW||W===dW||W===lW||W===uW)if(K=Q.get("WEBGL_compressed_texture_astc"),K!==null){if(W===SW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:K.COMPRESSED_RGBA_ASTC_4x4_KHR;if(W===jW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:K.COMPRESSED_RGBA_ASTC_5x4_KHR;if(W===yW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:K.COMPRESSED_RGBA_ASTC_5x5_KHR;if(W===vW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:K.COMPRESSED_RGBA_ASTC_6x5_KHR;if(W===fW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:K.COMPRESSED_RGBA_ASTC_6x6_KHR;if(W===bW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:K.COMPRESSED_RGBA_ASTC_8x5_KHR;if(W===hW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:K.COMPRESSED_RGBA_ASTC_8x6_KHR;if(W===xW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:K.COMPRESSED_RGBA_ASTC_8x8_KHR;if(W===gW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:K.COMPRESSED_RGBA_ASTC_10x5_KHR;if(W===pW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:K.COMPRESSED_RGBA_ASTC_10x6_KHR;if(W===mW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:K.COMPRESSED_RGBA_ASTC_10x8_KHR;if(W===dW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:K.COMPRESSED_RGBA_ASTC_10x10_KHR;if(W===lW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:K.COMPRESSED_RGBA_ASTC_12x10_KHR;if(W===uW)return H===qJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:K.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(W===cW||W===nW||W===sW)if(K=Q.get("EXT_texture_compression_bptc"),K!==null){if(W===cW)return H===qJ?K.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:K.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(W===nW)return K.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(W===sW)return K.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(W===iW||W===oW||W===kQ||W===aW)if(K=Q.get("EXT_texture_compression_rgtc"),K!==null){if(W===iW)return K.COMPRESSED_RED_RGTC1_EXT;if(W===oW)return K.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(W===kQ)return K.COMPRESSED_RED_GREEN_RGTC2_EXT;if(W===aW)return K.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(W===R7)return J.UNSIGNED_INT_24_8;return J[W]!==void 0?J[W]:null}return{convert:$}}var P1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,T1=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class SU{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,Q){if(this.texture===null){let $=new SQ(J.texture);if(J.depthNear!==Q.depthNear||J.depthFar!==Q.depthFar)this.depthNear=J.depthNear,this.depthFar=J.depthFar;this.texture=$}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let Q=J.cameras[0].viewport,$=new Q9({vertexShader:P1,fragmentShader:T1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:Q.z},depthHeight:{value:Q.w}}});this.mesh=new AJ(new L7(20,20),$)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class jU extends K9{constructor(J,Q){super();let $=this,W=null,Z=1,K=null,H="local-floor",Y=1,X=null,U=null,N=null,E=null,G=null,q=null,O=typeof XRWebGLBinding<"u",R=new SU,D={},F=Q.getContextAttributes(),I=null,V=null,M=[],w=[],_=new a,C=null,k=new TJ;k.viewport=new XJ;let B=new TJ;B.viewport=new XJ;let f=[k,B],T=new cZ,p=null,n=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(i){let X0=M[i];if(X0===void 0)X0=new e7,M[i]=X0;return X0.getTargetRaySpace()},this.getControllerGrip=function(i){let X0=M[i];if(X0===void 0)X0=new e7,M[i]=X0;return X0.getGripSpace()},this.getHand=function(i){let X0=M[i];if(X0===void 0)X0=new e7,M[i]=X0;return X0.getHandSpace()};function b(i){let X0=w.indexOf(i.inputSource);if(X0===-1)return;let V0=M[X0];if(V0!==void 0)V0.update(i.inputSource,i.frame,X||K),V0.dispatchEvent({type:i.type,data:i.inputSource})}function u(){W.removeEventListener("select",b),W.removeEventListener("selectstart",b),W.removeEventListener("selectend",b),W.removeEventListener("squeeze",b),W.removeEventListener("squeezestart",b),W.removeEventListener("squeezeend",b),W.removeEventListener("end",u),W.removeEventListener("inputsourceschange",l);for(let i=0;i<M.length;i++){let X0=w[i];if(X0===null)continue;w[i]=null,M[i].disconnect(X0)}p=null,n=null,R.reset();for(let i in D)delete D[i];J.setRenderTarget(I),G=null,E=null,N=null,W=null,V=null,HJ.stop(),$.isPresenting=!1,J.setPixelRatio(C),J.setSize(_.width,_.height,!1),$.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(i){if(Z=i,$.isPresenting===!0)Y0("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(i){if(H=i,$.isPresenting===!0)Y0("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return X||K},this.setReferenceSpace=function(i){X=i},this.getBaseLayer=function(){return E!==null?E:G},this.getBinding=function(){if(N===null&&O)N=new XRWebGLBinding(W,Q);return N},this.getFrame=function(){return q},this.getSession=function(){return W},this.setSession=async function(i){if(W=i,W!==null){if(I=J.getRenderTarget(),W.addEventListener("select",b),W.addEventListener("selectstart",b),W.addEventListener("selectend",b),W.addEventListener("squeeze",b),W.addEventListener("squeezestart",b),W.addEventListener("squeezeend",b),W.addEventListener("end",u),W.addEventListener("inputsourceschange",l),F.xrCompatible!==!0)await Q.makeXRCompatible();if(C=J.getPixelRatio(),J.getSize(_),!(O&&("createProjectionLayer"in XRWebGLBinding.prototype))){let V0={antialias:F.antialias,alpha:!0,depth:F.depth,stencil:F.stencil,framebufferScaleFactor:Z};G=new XRWebGLLayer(W,Q,V0),W.updateRenderState({baseLayer:G}),J.setPixelRatio(1),J.setSize(G.framebufferWidth,G.framebufferHeight,!1),V=new oJ(G.framebufferWidth,G.framebufferHeight,{format:B9,type:q9,colorSpace:J.outputColorSpace,stencilBuffer:F.stencil,resolveDepthBuffer:G.ignoreDepthValues===!1,resolveStencilBuffer:G.ignoreDepthValues===!1})}else{let V0=null,N0=null,b0=null;if(F.depth)b0=F.stencil?Q.DEPTH24_STENCIL8:Q.DEPTH_COMPONENT24,V0=F.stencil?T8:P8,N0=F.stencil?R7:Q8;let QJ={colorFormat:Q.RGBA8,depthFormat:b0,scaleFactor:Z};N=this.getBinding(),E=N.createProjectionLayer(QJ),W.updateRenderState({layers:[E]}),J.setPixelRatio(1),J.setSize(E.textureWidth,E.textureHeight,!1),V=new oJ(E.textureWidth,E.textureHeight,{format:B9,type:q9,depthTexture:new $8(E.textureWidth,E.textureHeight,N0,void 0,void 0,void 0,void 0,void 0,void 0,V0),stencilBuffer:F.stencil,colorSpace:J.outputColorSpace,samples:F.antialias?4:0,resolveDepthBuffer:E.ignoreDepthValues===!1,resolveStencilBuffer:E.ignoreDepthValues===!1})}V.isXRRenderTarget=!0,this.setFoveation(Y),X=null,K=await W.requestReferenceSpace(H),HJ.setContext(W),HJ.start(),$.isPresenting=!0,$.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(W!==null)return W.environmentBlendMode},this.getDepthTexture=function(){return R.getDepthTexture()};function l(i){for(let X0=0;X0<i.removed.length;X0++){let V0=i.removed[X0],N0=w.indexOf(V0);if(N0>=0)w[N0]=null,M[N0].disconnect(V0)}for(let X0=0;X0<i.added.length;X0++){let V0=i.added[X0],N0=w.indexOf(V0);if(N0===-1){for(let QJ=0;QJ<M.length;QJ++)if(QJ>=w.length){w.push(V0),N0=QJ;break}else if(w[QJ]===null){w[QJ]=V0,N0=QJ;break}if(N0===-1)break}let b0=M[N0];if(b0)b0.connect(V0)}}let h=new P,r=new P;function W0(i,X0,V0){h.setFromMatrixPosition(X0.matrixWorld),r.setFromMatrixPosition(V0.matrixWorld);let N0=h.distanceTo(r),b0=X0.projectionMatrix.elements,QJ=V0.projectionMatrix.elements,m0=b0[14]/(b0[10]-1),d0=b0[14]/(b0[10]+1),t=(b0[9]+1)/b0[5],$0=(b0[9]-1)/b0[5],Q0=(b0[8]-1)/b0[0],k0=(QJ[8]+1)/QJ[0],z0=m0*Q0,S0=m0*k0,y0=N0/(-Q0+k0),c0=y0*-Q0;if(X0.matrixWorld.decompose(i.position,i.quaternion,i.scale),i.translateX(c0),i.translateZ(y0),i.matrixWorld.compose(i.position,i.quaternion,i.scale),i.matrixWorldInverse.copy(i.matrixWorld).invert(),b0[10]===-1)i.projectionMatrix.copy(X0.projectionMatrix),i.projectionMatrixInverse.copy(X0.projectionMatrixInverse);else{let n0=m0+y0,S=d0+y0,FJ=z0-c0,e0=S0+(N0-c0),r0=t*d0/S*n0,A=$0*d0/S*n0;i.projectionMatrix.makePerspective(FJ,e0,r0,A,n0,S),i.projectionMatrixInverse.copy(i.projectionMatrix).invert()}}function H0(i,X0){if(X0===null)i.matrixWorld.copy(i.matrix);else i.matrixWorld.multiplyMatrices(X0.matrixWorld,i.matrix);i.matrixWorldInverse.copy(i.matrixWorld).invert()}this.updateCamera=function(i){if(W===null)return;let{near:X0,far:V0}=i;if(R.texture!==null){if(R.depthNear>0)X0=R.depthNear;if(R.depthFar>0)V0=R.depthFar}if(T.near=B.near=k.near=X0,T.far=B.far=k.far=V0,p!==T.near||n!==T.far)W.updateRenderState({depthNear:T.near,depthFar:T.far}),p=T.near,n=T.far;T.layers.mask=i.layers.mask|6,k.layers.mask=T.layers.mask&-5,B.layers.mask=T.layers.mask&-3;let N0=i.parent,b0=T.cameras;H0(T,N0);for(let QJ=0;QJ<b0.length;QJ++)H0(b0[QJ],N0);if(b0.length===2)W0(T,k,B);else T.projectionMatrix.copy(k.projectionMatrix);C0(i,T,N0)};function C0(i,X0,V0){if(V0===null)i.matrix.copy(X0.matrixWorld);else i.matrix.copy(V0.matrixWorld),i.matrix.invert(),i.matrix.multiply(X0.matrixWorld);if(i.matrix.decompose(i.position,i.quaternion,i.scale),i.updateMatrixWorld(!0),i.projectionMatrix.copy(X0.projectionMatrix),i.projectionMatrixInverse.copy(X0.projectionMatrixInverse),i.isPerspectiveCamera)i.fov=z8*2*Math.atan(1/i.projectionMatrix.elements[5]),i.zoom=1}this.getCamera=function(){return T},this.getFoveation=function(){if(E===null&&G===null)return;return Y},this.setFoveation=function(i){if(Y=i,E!==null)E.fixedFoveation=i;if(G!==null&&G.fixedFoveation!==void 0)G.fixedFoveation=i},this.hasDepthSensing=function(){return R.texture!==null},this.getDepthSensingMesh=function(){return R.getMesh(T)},this.getCameraTexture=function(i){return D[i]};let L0=null;function UJ(i,X0){if(U=X0.getViewerPose(X||K),q=X0,U!==null){let V0=U.views;if(G!==null)J.setRenderTargetFramebuffer(V,G.framebuffer),J.setRenderTarget(V);let N0=!1;if(V0.length!==T.cameras.length)T.cameras.length=0,N0=!0;for(let d0=0;d0<V0.length;d0++){let t=V0[d0],$0=null;if(G!==null)$0=G.getViewport(t);else{let k0=N.getViewSubImage(E,t);if($0=k0.viewport,d0===0)J.setRenderTargetTextures(V,k0.colorTexture,k0.depthStencilTexture),J.setRenderTarget(V)}let Q0=f[d0];if(Q0===void 0)Q0=new TJ,Q0.layers.enable(d0),Q0.viewport=new XJ,f[d0]=Q0;if(Q0.matrix.fromArray(t.transform.matrix),Q0.matrix.decompose(Q0.position,Q0.quaternion,Q0.scale),Q0.projectionMatrix.fromArray(t.projectionMatrix),Q0.projectionMatrixInverse.copy(Q0.projectionMatrix).invert(),Q0.viewport.set($0.x,$0.y,$0.width,$0.height),d0===0)T.matrix.copy(Q0.matrix),T.matrix.decompose(T.position,T.quaternion,T.scale);if(N0===!0)T.cameras.push(Q0)}let b0=W.enabledFeatures;if(b0&&b0.includes("depth-sensing")&&W.depthUsage=="gpu-optimized"&&O){N=$.getBinding();let d0=N.getDepthInformation(V0[0]);if(d0&&d0.isValid&&d0.texture)R.init(d0,W.renderState)}if(b0&&b0.includes("camera-access")&&O){J.state.unbindTexture(),N=$.getBinding();for(let d0=0;d0<V0.length;d0++){let t=V0[d0].camera;if(t){let $0=D[t];if(!$0)$0=new SQ,D[t]=$0;let Q0=N.getCameraImage(t);$0.sourceTexture=Q0}}}}for(let V0=0;V0<M.length;V0++){let N0=w[V0],b0=M[V0];if(N0!==null&&b0!==void 0)b0.update(N0,X0,X||K)}if(L0)L0(i,X0);if(X0.detectedPlanes)$.dispatchEvent({type:"planesdetected",data:X0});q=null}let HJ=new LU;HJ.setAnimationLoop(UJ),this.setAnimationLoop=function(i){L0=i},this.dispose=function(){}}}var S1=new p0,yU=new l0;yU.set(-1,0,0,0,1,0,0,0,1);function j1(J,Q){function $(D,F){if(D.matrixAutoUpdate===!0)D.updateMatrix();F.value.copy(D.matrix)}function W(D,F){if(F.color.getRGB(D.fogColor.value,zZ(J)),F.isFog)D.fogNear.value=F.near,D.fogFar.value=F.far;else if(F.isFogExp2)D.fogDensity.value=F.density}function Z(D,F,I,V,M){if(F.isNodeMaterial)F.uniformsNeedUpdate=!1;else if(F.isMeshBasicMaterial)K(D,F);else if(F.isMeshLambertMaterial){if(K(D,F),F.envMap)D.envMapIntensity.value=F.envMapIntensity}else if(F.isMeshToonMaterial)K(D,F),E(D,F);else if(F.isMeshPhongMaterial){if(K(D,F),N(D,F),F.envMap)D.envMapIntensity.value=F.envMapIntensity}else if(F.isMeshStandardMaterial){if(K(D,F),G(D,F),F.isMeshPhysicalMaterial)q(D,F,M)}else if(F.isMeshMatcapMaterial)K(D,F),O(D,F);else if(F.isMeshDepthMaterial)K(D,F);else if(F.isMeshDistanceMaterial)K(D,F),R(D,F);else if(F.isMeshNormalMaterial)K(D,F);else if(F.isLineBasicMaterial){if(H(D,F),F.isLineDashedMaterial)Y(D,F)}else if(F.isPointsMaterial)X(D,F,I,V);else if(F.isSpriteMaterial)U(D,F);else if(F.isShadowMaterial)D.color.value.copy(F.color),D.opacity.value=F.opacity;else if(F.isShaderMaterial)F.uniformsNeedUpdate=!1}function K(D,F){if(D.opacity.value=F.opacity,F.color)D.diffuse.value.copy(F.color);if(F.emissive)D.emissive.value.copy(F.emissive).multiplyScalar(F.emissiveIntensity);if(F.map)D.map.value=F.map,$(F.map,D.mapTransform);if(F.alphaMap)D.alphaMap.value=F.alphaMap,$(F.alphaMap,D.alphaMapTransform);if(F.bumpMap){if(D.bumpMap.value=F.bumpMap,$(F.bumpMap,D.bumpMapTransform),D.bumpScale.value=F.bumpScale,F.side===sJ)D.bumpScale.value*=-1}if(F.normalMap){if(D.normalMap.value=F.normalMap,$(F.normalMap,D.normalMapTransform),D.normalScale.value.copy(F.normalScale),F.side===sJ)D.normalScale.value.negate()}if(F.displacementMap)D.displacementMap.value=F.displacementMap,$(F.displacementMap,D.displacementMapTransform),D.displacementScale.value=F.displacementScale,D.displacementBias.value=F.displacementBias;if(F.emissiveMap)D.emissiveMap.value=F.emissiveMap,$(F.emissiveMap,D.emissiveMapTransform);if(F.specularMap)D.specularMap.value=F.specularMap,$(F.specularMap,D.specularMapTransform);if(F.alphaTest>0)D.alphaTest.value=F.alphaTest;let I=Q.get(F),V=I.envMap,M=I.envMapRotation;if(V){if(D.envMap.value=V,D.envMapRotation.value.setFromMatrix4(S1.makeRotationFromEuler(M)).transpose(),V.isCubeTexture&&V.isRenderTargetTexture===!1)D.envMapRotation.value.premultiply(yU);D.reflectivity.value=F.reflectivity,D.ior.value=F.ior,D.refractionRatio.value=F.refractionRatio}if(F.lightMap)D.lightMap.value=F.lightMap,D.lightMapIntensity.value=F.lightMapIntensity,$(F.lightMap,D.lightMapTransform);if(F.aoMap)D.aoMap.value=F.aoMap,D.aoMapIntensity.value=F.aoMapIntensity,$(F.aoMap,D.aoMapTransform)}function H(D,F){if(D.diffuse.value.copy(F.color),D.opacity.value=F.opacity,F.map)D.map.value=F.map,$(F.map,D.mapTransform)}function Y(D,F){D.dashSize.value=F.dashSize,D.totalSize.value=F.dashSize+F.gapSize,D.scale.value=F.scale}function X(D,F,I,V){if(D.diffuse.value.copy(F.color),D.opacity.value=F.opacity,D.size.value=F.size*I,D.scale.value=V*0.5,F.map)D.map.value=F.map,$(F.map,D.uvTransform);if(F.alphaMap)D.alphaMap.value=F.alphaMap,$(F.alphaMap,D.alphaMapTransform);if(F.alphaTest>0)D.alphaTest.value=F.alphaTest}function U(D,F){if(D.diffuse.value.copy(F.color),D.opacity.value=F.opacity,D.rotation.value=F.rotation,F.map)D.map.value=F.map,$(F.map,D.mapTransform);if(F.alphaMap)D.alphaMap.value=F.alphaMap,$(F.alphaMap,D.alphaMapTransform);if(F.alphaTest>0)D.alphaTest.value=F.alphaTest}function N(D,F){D.specular.value.copy(F.specular),D.shininess.value=Math.max(F.shininess,0.0001)}function E(D,F){if(F.gradientMap)D.gradientMap.value=F.gradientMap}function G(D,F){if(D.metalness.value=F.metalness,F.metalnessMap)D.metalnessMap.value=F.metalnessMap,$(F.metalnessMap,D.metalnessMapTransform);if(D.roughness.value=F.roughness,F.roughnessMap)D.roughnessMap.value=F.roughnessMap,$(F.roughnessMap,D.roughnessMapTransform);if(F.envMap)D.envMapIntensity.value=F.envMapIntensity}function q(D,F,I){if(D.ior.value=F.ior,F.sheen>0){if(D.sheenColor.value.copy(F.sheenColor).multiplyScalar(F.sheen),D.sheenRoughness.value=F.sheenRoughness,F.sheenColorMap)D.sheenColorMap.value=F.sheenColorMap,$(F.sheenColorMap,D.sheenColorMapTransform);if(F.sheenRoughnessMap)D.sheenRoughnessMap.value=F.sheenRoughnessMap,$(F.sheenRoughnessMap,D.sheenRoughnessMapTransform)}if(F.clearcoat>0){if(D.clearcoat.value=F.clearcoat,D.clearcoatRoughness.value=F.clearcoatRoughness,F.clearcoatMap)D.clearcoatMap.value=F.clearcoatMap,$(F.clearcoatMap,D.clearcoatMapTransform);if(F.clearcoatRoughnessMap)D.clearcoatRoughnessMap.value=F.clearcoatRoughnessMap,$(F.clearcoatRoughnessMap,D.clearcoatRoughnessMapTransform);if(F.clearcoatNormalMap){if(D.clearcoatNormalMap.value=F.clearcoatNormalMap,$(F.clearcoatNormalMap,D.clearcoatNormalMapTransform),D.clearcoatNormalScale.value.copy(F.clearcoatNormalScale),F.side===sJ)D.clearcoatNormalScale.value.negate()}}if(F.dispersion>0)D.dispersion.value=F.dispersion;if(F.iridescence>0){if(D.iridescence.value=F.iridescence,D.iridescenceIOR.value=F.iridescenceIOR,D.iridescenceThicknessMinimum.value=F.iridescenceThicknessRange[0],D.iridescenceThicknessMaximum.value=F.iridescenceThicknessRange[1],F.iridescenceMap)D.iridescenceMap.value=F.iridescenceMap,$(F.iridescenceMap,D.iridescenceMapTransform);if(F.iridescenceThicknessMap)D.iridescenceThicknessMap.value=F.iridescenceThicknessMap,$(F.iridescenceThicknessMap,D.iridescenceThicknessMapTransform)}if(F.transmission>0){if(D.transmission.value=F.transmission,D.transmissionSamplerMap.value=I.texture,D.transmissionSamplerSize.value.set(I.width,I.height),F.transmissionMap)D.transmissionMap.value=F.transmissionMap,$(F.transmissionMap,D.transmissionMapTransform);if(D.thickness.value=F.thickness,F.thicknessMap)D.thicknessMap.value=F.thicknessMap,$(F.thicknessMap,D.thicknessMapTransform);D.attenuationDistance.value=F.attenuationDistance,D.attenuationColor.value.copy(F.attenuationColor)}if(F.anisotropy>0){if(D.anisotropyVector.value.set(F.anisotropy*Math.cos(F.anisotropyRotation),F.anisotropy*Math.sin(F.anisotropyRotation)),F.anisotropyMap)D.anisotropyMap.value=F.anisotropyMap,$(F.anisotropyMap,D.anisotropyMapTransform)}if(D.specularIntensity.value=F.specularIntensity,D.specularColor.value.copy(F.specularColor),F.specularColorMap)D.specularColorMap.value=F.specularColorMap,$(F.specularColorMap,D.specularColorMapTransform);if(F.specularIntensityMap)D.specularIntensityMap.value=F.specularIntensityMap,$(F.specularIntensityMap,D.specularIntensityMapTransform)}function O(D,F){if(F.matcap)D.matcap.value=F.matcap}function R(D,F){let I=Q.get(F).light;D.referencePosition.value.setFromMatrixPosition(I.matrixWorld),D.nearDistance.value=I.shadow.camera.near,D.farDistance.value=I.shadow.camera.far}return{refreshFogUniforms:W,refreshMaterialUniforms:Z}}function y1(J,Q,$,W){let Z={},K={},H=[],Y=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function X(M,w){let _=w.program;W.uniformBlockBinding(M,_)}function U(M,w){let _=Z[M.id];if(_===void 0)D(M),_=N(M),Z[M.id]=_,M.addEventListener("dispose",I);let C=w.program;W.updateUBOMapping(M,C);let k=Q.render.frame;if(K[M.id]!==k)G(M),K[M.id]=k}function N(M){let w=E();M.__bindingPointIndex=w;let _=J.createBuffer(),C=M.__size,k=M.usage;return J.bindBuffer(J.UNIFORM_BUFFER,_),J.bufferData(J.UNIFORM_BUFFER,C,k),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,w,_),_}function E(){for(let M=0;M<Y;M++)if(H.indexOf(M)===-1)return H.push(M),M;return T0("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function G(M){let w=Z[M.id],_=M.uniforms,C=M.__cache;J.bindBuffer(J.UNIFORM_BUFFER,w);for(let k=0,B=_.length;k<B;k++){let f=_[k];if(Array.isArray(f))for(let T=0,p=f.length;T<p;T++)q(f[T],k,T,C);else q(f,k,0,C)}J.bindBuffer(J.UNIFORM_BUFFER,null)}function q(M,w,_,C){if(R(M,w,_,C)===!0){let{__offset:k,value:B}=M;if(Array.isArray(B)){let f=0;for(let T=0;T<B.length;T++){let p=B[T],n=F(p);if(O(p,M.__data,f),typeof p!=="number"&&typeof p!=="boolean"&&!p.isMatrix3&&!ArrayBuffer.isView(p))f+=n.storage/Float32Array.BYTES_PER_ELEMENT}}else O(B,M.__data,0);J.bufferSubData(J.UNIFORM_BUFFER,k,M.__data)}}function O(M,w,_){if(typeof M==="number"||typeof M==="boolean")w[0]=M;else if(M.isMatrix3)w[0]=M.elements[0],w[1]=M.elements[1],w[2]=M.elements[2],w[3]=0,w[4]=M.elements[3],w[5]=M.elements[4],w[6]=M.elements[5],w[7]=0,w[8]=M.elements[6],w[9]=M.elements[7],w[10]=M.elements[8],w[11]=0;else if(ArrayBuffer.isView(M))w.set(new M.constructor(M.buffer,M.byteOffset,w.length));else M.toArray(w,_)}function R(M,w,_,C){let k=M.value,B=w+"_"+_;if(C[B]===void 0){if(typeof k==="number"||typeof k==="boolean")C[B]=k;else if(ArrayBuffer.isView(k))C[B]=k.slice();else C[B]=k.clone();return!0}else{let f=C[B];if(typeof k==="number"||typeof k==="boolean"){if(f!==k)return C[B]=k,!0}else if(ArrayBuffer.isView(k))return!0;else if(f.equals(k)===!1)return f.copy(k),!0}return!1}function D(M){let w=M.uniforms,_=0,C=16;for(let B=0,f=w.length;B<f;B++){let T=Array.isArray(w[B])?w[B]:[w[B]];for(let p=0,n=T.length;p<n;p++){let b=T[p],u=Array.isArray(b.value)?b.value:[b.value];for(let l=0,h=u.length;l<h;l++){let r=u[l],W0=F(r),H0=_%C,C0=H0%W0.boundary,L0=H0+C0;if(_+=C0,L0!==0&&C-L0<W0.storage)_+=C-L0;b.__data=new Float32Array(W0.storage/Float32Array.BYTES_PER_ELEMENT),b.__offset=_,_+=W0.storage}}}let k=_%C;if(k>0)_+=C-k;return M.__size=_,M.__cache={},this}function F(M){let w={boundary:0,storage:0};if(typeof M==="number"||typeof M==="boolean")w.boundary=4,w.storage=4;else if(M.isVector2)w.boundary=8,w.storage=8;else if(M.isVector3||M.isColor)w.boundary=16,w.storage=12;else if(M.isVector4)w.boundary=16,w.storage=16;else if(M.isMatrix3)w.boundary=48,w.storage=48;else if(M.isMatrix4)w.boundary=64,w.storage=64;else if(M.isTexture)Y0("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else if(ArrayBuffer.isView(M))w.boundary=16,w.storage=M.byteLength;else Y0("WebGLRenderer: Unsupported uniform value type.",M);return w}function I(M){let w=M.target;w.removeEventListener("dispose",I);let _=H.indexOf(w.__bindingPointIndex);H.splice(_,1),J.deleteBuffer(Z[w.id]),delete Z[w.id],delete K[w.id]}function V(){for(let M in Z)J.deleteBuffer(Z[M]);H=[],Z={},K={}}return{bind:X,update:U,dispose:V}}var v1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),z9=null;function f1(){if(z9===null)z9=new J9(v1,16,16,S8,x9),z9.name="DFG_LUT",z9.minFilter=iJ,z9.magFilter=iJ,z9.wrapS=NQ,z9.wrapT=NQ,z9.generateMipmaps=!1,z9.needsUpdate=!0;return z9}class b1{constructor(J={}){let{canvas:Q=PY(),context:$=null,depth:W=!0,stencil:Z=!1,alpha:K=!1,antialias:H=!1,premultipliedAlpha:Y=!0,preserveDrawingBuffer:X=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:N=!1,reversedDepthBuffer:E=!1,outputBufferType:G=q9}=J;this.isWebGLRenderer=!0;let q;if($!==null){if(typeof WebGLRenderingContext<"u"&&$ instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");q=$.getContextAttributes().alpha}else q=K;let O=G,R=new Set([LW,MW,kW]),D=new Set([q9,Q8,o7,R7,OW,RW]),F=new Uint32Array(4),I=new Int32Array(4),V=new P,M=null,w=null,_=[],C=[],k=null;this.domElement=Q,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=E9,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let B=this,f=!1,T=null,p=null,n=null,b=null;this._outputColorSpace=VY;let u=0,l=0,h=null,r=-1,W0=null,H0=new XJ,C0=new XJ,L0=null,UJ=new B0(0),HJ=0,i=Q.width,X0=Q.height,V0=1,N0=null,b0=null,QJ=new XJ(0,0,i,X0),m0=new XJ(0,0,i,X0),d0=!1,t=new e9,$0=!1,Q0=!1,k0=new p0,z0=new P,S0=new XJ,y0={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},c0=!1;function n0(){return h===null?V0:1}let S=$;function FJ(z,v){return Q.getContext(z,v)}try{let z={alpha:!0,depth:W,stencil:Z,antialias:H,premultipliedAlpha:Y,preserveDrawingBuffer:X,powerPreference:U,failIfMajorPerformanceCaveat:N};if("setAttribute"in Q)Q.setAttribute("data-engine",`three.js r${TH}`);if(Q.addEventListener("webglcontextlost",s0,!1),Q.addEventListener("webglcontextrestored",MJ,!1),Q.addEventListener("webglcontextcreationerror",DJ,!1),S===null){if(S=FJ("webgl2",z),S===null)if(FJ("webgl2"))throw Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.");else throw Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(z){throw T0("WebGLRenderer: "+z.message),z}let e0,r0,A,L,j,m,e,Z0,G0,c,o,M0,j0,F0,K0,h0,x0,KJ,y,U0,s,E0,I0;function J0(){if(e0=new dF(S),e0.init(),s=new C1(S,e0),r0=new vF(S,e0,J,s),A=new w1(S,e0),r0.reversedDepthBuffer&&E)A.buffers.depth.setReversed(!0);p=S.createFramebuffer(),n=S.createFramebuffer(),b=S.createFramebuffer(),L=new cF(S),j=new E1,m=new _1(S,e0,A,j,r0,s,L),e=new mF(B),Z0=new oE(S),E0=new jF(S,Z0),G0=new lF(S,Z0,L,E0),c=new sF(S,G0,Z0,E0,L),KJ=new nF(S,r0,m),K0=new fF(j),o=new N1(B,e,e0,r0,E0,K0),M0=new j1(B,j),j0=new F1,F0=new L1(e0),x0=new SF(B,e,A,c,q,Y),h0=new A1(B,c,r0),I0=new y1(S,L,r0,A),y=new yF(S,e0,L),U0=new uF(S,e0,L),L.programs=o.programs,B.capabilities=r0,B.extensions=e0,B.properties=j,B.renderLists=j0,B.shadowMap=h0,B.state=A,B.info=L}if(J0(),O!==q9)k=new oF(O,Q.width,Q.height,H,W,Z);let q0=new jU(B,S);this.xr=q0,this.getContext=function(){return S},this.getContextAttributes=function(){return S.getContextAttributes()},this.forceContextLoss=function(){let z=e0.get("WEBGL_lose_context");if(z)z.loseContext()},this.forceContextRestore=function(){let z=e0.get("WEBGL_lose_context");if(z)z.restoreContext()},this.getPixelRatio=function(){return V0},this.setPixelRatio=function(z){if(z===void 0)return;V0=z,this.setSize(i,X0,!1)},this.getSize=function(z){return z.set(i,X0)},this.setSize=function(z,v,d=!0){if(q0.isPresenting){Y0("WebGLRenderer: Can't change size while VR device is presenting.");return}if(i=z,X0=v,Q.width=Math.floor(z*V0),Q.height=Math.floor(v*V0),d===!0)Q.style.width=z+"px",Q.style.height=v+"px";if(k!==null)k.setSize(Q.width,Q.height);this.setViewport(0,0,z,v)},this.getDrawingBufferSize=function(z){return z.set(i*V0,X0*V0).floor()},this.setDrawingBufferSize=function(z,v,d){i=z,X0=v,V0=d,Q.width=Math.floor(z*d),Q.height=Math.floor(v*d),this.setViewport(0,0,z,v)},this.setEffects=function(z){if(O===q9){T0("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(z){for(let v=0;v<z.length;v++)if(z[v].isOutputPass===!0){Y0("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}k.setEffects(z||[])},this.getCurrentViewport=function(z){return z.copy(H0)},this.getViewport=function(z){return z.copy(QJ)},this.setViewport=function(z,v,d,x){if(z.isVector4)QJ.set(z.x,z.y,z.z,z.w);else QJ.set(z,v,d,x);A.viewport(H0.copy(QJ).multiplyScalar(V0).round())},this.getScissor=function(z){return z.copy(m0)},this.setScissor=function(z,v,d,x){if(z.isVector4)m0.set(z.x,z.y,z.z,z.w);else m0.set(z,v,d,x);A.scissor(C0.copy(m0).multiplyScalar(V0).round())},this.getScissorTest=function(){return d0},this.setScissorTest=function(z){A.setScissorTest(d0=z)},this.setOpaqueSort=function(z){N0=z},this.setTransparentSort=function(z){b0=z},this.getClearColor=function(z){return z.copy(x0.getClearColor())},this.setClearColor=function(){x0.setClearColor(...arguments)},this.getClearAlpha=function(){return x0.getClearAlpha()},this.setClearAlpha=function(){x0.setClearAlpha(...arguments)},this.clear=function(z=!0,v=!0,d=!0){let x=0;if(z){let g=!1;if(h!==null){let R0=h.texture.format;g=R.has(R0)}if(g){let R0=h.texture.type,_0=D.has(R0),O0=x0.getClearColor(),P0=x0.getClearAlpha(),v0=O0.r,i0=O0.g,t0=O0.b;if(_0)F[0]=v0,F[1]=i0,F[2]=t0,F[3]=P0,S.clearBufferuiv(S.COLOR,0,F);else I[0]=v0,I[1]=i0,I[2]=t0,I[3]=P0,S.clearBufferiv(S.COLOR,0,I)}else x|=S.COLOR_BUFFER_BIT}if(v)x|=S.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0);if(d)x|=S.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(x!==0)S.clear(x)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(z){z.setRenderer(this),T=z},this.dispose=function(){Q.removeEventListener("webglcontextlost",s0,!1),Q.removeEventListener("webglcontextrestored",MJ,!1),Q.removeEventListener("webglcontextcreationerror",DJ,!1),x0.dispose(),j0.dispose(),F0.dispose(),j.dispose(),e.dispose(),c.dispose(),E0.dispose(),I0.dispose(),o.dispose(),q0.dispose(),q0.removeEventListener("sessionstart",EK),q0.removeEventListener("sessionend",qK),Y8.stop()};function s0(z){z.preventDefault(),m7("WebGLRenderer: Context Lost."),f=!0}function MJ(){m7("WebGLRenderer: Context Restored."),f=!1;let z=L.autoReset,v=h0.enabled,d=h0.autoUpdate,x=h0.needsUpdate,g=h0.type;J0(),L.autoReset=z,h0.enabled=v,h0.autoUpdate=d,h0.needsUpdate=x,h0.type=g}function DJ(z){T0("WebGLRenderer: A WebGL context could not be created. Reason: ",z.statusMessage)}function D9(z){let v=z.target;v.removeEventListener("dispose",D9),A9(v)}function A9(z){vU(z),j.remove(z)}function vU(z){let v=j.get(z).programs;if(v!==void 0){if(v.forEach(function(d){o.releaseProgram(d)}),z.isShaderMaterial)o.releaseShaderCache(z)}}this.renderBufferDirect=function(z,v,d,x,g,R0){if(v===null)v=y0;let _0=g.isMesh&&g.matrixWorld.determinantAffine()<0,O0=hU(z,v,d,x,g);A.setMaterial(x,_0);let P0=d.index,v0=1;if(x.wireframe===!0){if(P0=G0.getWireframeAttribute(d),P0===void 0)return;v0=2}let i0=d.drawRange,t0=d.attributes.position,f0=i0.start*v0,GJ=(i0.start+i0.count)*v0;if(R0!==null)f0=Math.max(f0,R0.start*v0),GJ=Math.min(GJ,(R0.start+R0.count)*v0);if(P0!==null)f0=Math.max(f0,0),GJ=Math.min(GJ,P0.count);else if(t0!==void 0&&t0!==null)f0=Math.max(f0,0),GJ=Math.min(GJ,t0.count);let BJ=GJ-f0;if(BJ<0||BJ===1/0)return;E0.setup(g,x,O0,d,P0);let LJ,NJ=y;if(P0!==null)LJ=Z0.get(P0),NJ=U0,NJ.setIndex(LJ);if(g.isMesh)if(x.wireframe===!0)A.setLineWidth(x.wireframeLinewidth*n0()),NJ.setMode(S.LINES);else NJ.setMode(S.TRIANGLES);else if(g.isLine){let vJ=x.linewidth;if(vJ===void 0)vJ=1;if(A.setLineWidth(vJ*n0()),g.isLineSegments)NJ.setMode(S.LINES);else if(g.isLineLoop)NJ.setMode(S.LINE_LOOP);else NJ.setMode(S.LINE_STRIP)}else if(g.isPoints)NJ.setMode(S.POINTS);else if(g.isSprite)NJ.setMode(S.TRIANGLES);if(g.isBatchedMesh)if(!e0.get("WEBGL_multi_draw")){let{_multiDrawStarts:vJ,_multiDrawCounts:A0,_multiDrawCount:aJ}=g,$J=P0?Z0.get(P0).bytesPerElement:1,W9=j.get(x).currentProgram.getUniforms();for(let O9=0;O9<aJ;O9++)W9.setValue(S,"_gl_DrawID",O9),NJ.render(vJ[O9]/$J,A0[O9])}else NJ.renderMultiDraw(g._multiDrawStarts,g._multiDrawCounts,g._multiDrawCount);else if(g.isInstancedMesh)NJ.renderInstances(f0,BJ,g.count);else if(d.isInstancedBufferGeometry){let vJ=d._maxInstanceCount!==void 0?d._maxInstanceCount:1/0,A0=Math.min(d.instanceCount,vJ);NJ.renderInstances(f0,BJ,A0)}else NJ.render(f0,BJ)};function NK(z,v,d){if(z.transparent===!0&&z.side===L9&&z.forceSinglePass===!1)z.side=sJ,z.needsUpdate=!0,D6(z,v,d),z.side=F7,z.needsUpdate=!0,D6(z,v,d),z.side=L9;else D6(z,v,d)}this.compile=function(z,v,d=null){if(d===null)d=z;if(w=F0.get(d),w.init(v),C.push(w),d.traverseVisible(function(g){if(g.isLight&&g.layers.test(v.layers)){if(w.pushLight(g),g.castShadow)w.pushShadow(g)}}),z!==d)z.traverseVisible(function(g){if(g.isLight&&g.layers.test(v.layers)){if(w.pushLight(g),g.castShadow)w.pushShadow(g)}});w.setupLights();let x=new Set;return z.traverse(function(g){if(!(g.isMesh||g.isPoints||g.isLine||g.isSprite))return;let R0=g.material;if(R0)if(Array.isArray(R0))for(let _0=0;_0<R0.length;_0++){let O0=R0[_0];NK(O0,d,g),x.add(O0)}else NK(R0,d,g),x.add(R0)}),w=C.pop(),x},this.compileAsync=function(z,v,d=null){let x=this.compile(z,v,d);return new Promise((g)=>{function R0(){if(x.forEach(function(_0){if(j.get(_0).currentProgram.isReady())x.delete(_0)}),x.size===0){g(z);return}setTimeout(R0,10)}if(e0.get("KHR_parallel_shader_compile")!==null)R0();else setTimeout(R0,10)})};let E$=null;function fU(z){if(E$)E$(z)}function EK(){Y8.stop()}function qK(){Y8.start()}let Y8=new LU;if(Y8.setAnimationLoop(fU),typeof self<"u")Y8.setContext(self);this.setAnimationLoop=function(z){E$=z,q0.setAnimationLoop(z),z===null?Y8.stop():Y8.start()},q0.addEventListener("sessionstart",EK),q0.addEventListener("sessionend",qK),this.render=function(z,v){if(v!==void 0&&v.isCamera!==!0){T0("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(f===!0)return;if(T!==null)T.renderStart(z,v);let d=q0.enabled===!0&&q0.isPresenting===!0,x=k!==null&&(h===null||d)&&k.begin(B,h);if(z.matrixWorldAutoUpdate===!0)z.updateMatrixWorld();if(v.parent===null&&v.matrixWorldAutoUpdate===!0)v.updateMatrixWorld();if(q0.enabled===!0&&q0.isPresenting===!0&&(k===null||k.isCompositing()===!1)){if(q0.cameraAutoUpdate===!0)q0.updateCamera(v);v=q0.getCamera()}if(z.isScene===!0)z.onBeforeRender(B,z,v,h);if(w=F0.get(z,C.length),w.init(v),w.state.textureUnits=m.getTextureUnits(),C.push(w),k0.multiplyMatrices(v.projectionMatrix,v.matrixWorldInverse),t.setFromProjectionMatrix(k0,QZ,v.reversedDepth),Q0=this.localClippingEnabled,$0=K0.init(this.clippingPlanes,Q0),M=j0.get(z,_.length),M.init(),_.push(M),q0.enabled===!0&&q0.isPresenting===!0){let _0=B.xr.getDepthSensingMesh();if(_0!==null)q$(_0,v,-1/0,B.sortObjects)}if(q$(z,v,0,B.sortObjects),M.finish(),B.sortObjects===!0)M.sort(N0,b0,v.reversedDepth);if(c0=q0.enabled===!1||q0.isPresenting===!1||q0.hasDepthSensing()===!1,c0)x0.addToRenderList(M,z);if(this.info.render.frame++,this.info.autoReset===!0)this.info.reset();if($0===!0)K0.beginShadows();let g=w.state.shadowsArray;if(h0.render(g,z,v),$0===!0)K0.endShadows();if((x&&k.hasRenderPass())===!1){let{opaque:_0,transmissive:O0}=M;if(w.setupLights(),v.isArrayCamera){let P0=v.cameras;if(O0.length>0)for(let v0=0,i0=P0.length;v0<i0;v0++){let t0=P0[v0];DK(_0,O0,z,t0)}if(c0)x0.render(z);for(let v0=0,i0=P0.length;v0<i0;v0++){let t0=P0[v0];FK(M,z,t0,t0.viewport)}}else{if(O0.length>0)DK(_0,O0,z,v);if(c0)x0.render(z);FK(M,z,v)}}if(h!==null&&l===0)m.updateMultisampleRenderTarget(h),m.updateRenderTargetMipmap(h);if(x)k.end(B);if(z.isScene===!0)z.onAfterRender(B,z,v);if(E0.resetDefaultState(),r=-1,W0=null,C.pop(),C.length>0){if(w=C[C.length-1],m.setTextureUnits(w.state.textureUnits),$0===!0)K0.setGlobalState(B.clippingPlanes,w.state.camera)}else w=null;if(_.pop(),_.length>0)M=_[_.length-1];else M=null;if(T!==null)T.renderEnd()};function q$(z,v,d,x){if(z.visible===!1)return;if(z.layers.test(v.layers)){if(z.isGroup)d=z.renderOrder;else if(z.isLOD){if(z.autoUpdate===!0)z.update(v)}else if(z.isLightProbeGrid)w.pushLightProbeGrid(z);else if(z.isLight){if(w.pushLight(z),z.castShadow)w.pushShadow(z)}else if(z.isSprite){if(!z.frustumCulled||t.intersectsSprite(z)){if(x)S0.setFromMatrixPosition(z.matrixWorld).applyMatrix4(k0);let _0=c.update(z),O0=z.material;if(O0.visible)M.push(z,_0,O0,d,S0.z,null)}}else if(z.isMesh||z.isLine||z.isPoints){if(!z.frustumCulled||t.intersectsObject(z)){let _0=c.update(z),O0=z.material;if(x){if(z.boundingSphere!==void 0){if(z.boundingSphere===null)z.computeBoundingSphere();S0.copy(z.boundingSphere.center)}else{if(_0.boundingSphere===null)_0.computeBoundingSphere();S0.copy(_0.boundingSphere.center)}S0.applyMatrix4(z.matrixWorld).applyMatrix4(k0)}if(Array.isArray(O0)){let P0=_0.groups;for(let v0=0,i0=P0.length;v0<i0;v0++){let t0=P0[v0],f0=O0[t0.materialIndex];if(f0&&f0.visible)M.push(z,_0,f0,d,S0.z,t0)}}else if(O0.visible)M.push(z,_0,O0,d,S0.z,null)}}}let R0=z.children;for(let _0=0,O0=R0.length;_0<O0;_0++)q$(R0[_0],v,d,x)}function FK(z,v,d,x){let{opaque:g,transmissive:R0,transparent:_0}=z;if(w.setupLightsView(d),$0===!0)K0.setGlobalState(B.clippingPlanes,d);if(x)A.viewport(H0.copy(x));if(g.length>0)F6(g,v,d);if(R0.length>0)F6(R0,v,d);if(_0.length>0)F6(_0,v,d);A.buffers.depth.setTest(!0),A.buffers.depth.setMask(!0),A.buffers.color.setMask(!0),A.setPolygonOffset(!1)}function DK(z,v,d,x){if((d.isScene===!0?d.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[x.id]===void 0){let f0=e0.has("EXT_color_buffer_half_float")||e0.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[x.id]=new oJ(1,1,{generateMipmaps:!0,type:f0?x9:q9,minFilter:C8,samples:Math.max(4,r0.samples),stencilBuffer:Z,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:JJ.workingColorSpace})}let R0=w.state.transmissionRenderTarget[x.id],_0=x.viewport||H0;R0.setSize(_0.z*B.transmissionResolutionScale,_0.w*B.transmissionResolutionScale);let O0=B.getRenderTarget(),P0=B.getActiveCubeFace(),v0=B.getActiveMipmapLevel();if(B.setRenderTarget(R0),B.getClearColor(UJ),HJ=B.getClearAlpha(),HJ<1)B.setClearColor(16777215,0.5);if(B.clear(),c0)x0.render(d);let i0=B.toneMapping;B.toneMapping=E9;let t0=x.viewport;if(x.viewport!==void 0)x.viewport=void 0;if(w.setupLightsView(x),$0===!0)K0.setGlobalState(B.clippingPlanes,x);if(F6(z,d,x),m.updateMultisampleRenderTarget(R0),m.updateRenderTargetMipmap(R0),e0.has("WEBGL_multisampled_render_to_texture")===!1){let f0=!1;for(let GJ=0,BJ=v.length;GJ<BJ;GJ++){let LJ=v[GJ],{object:NJ,geometry:vJ,material:A0,group:aJ}=LJ;if(A0.side===L9&&NJ.layers.test(x.layers)){let $J=A0.side;A0.side=sJ,A0.needsUpdate=!0,OK(NJ,d,x,vJ,A0,aJ),A0.side=$J,A0.needsUpdate=!0,f0=!0}}if(f0===!0)m.updateMultisampleRenderTarget(R0),m.updateRenderTargetMipmap(R0)}if(B.setRenderTarget(O0,P0,v0),B.setClearColor(UJ,HJ),t0!==void 0)x.viewport=t0;B.toneMapping=i0}function F6(z,v,d){let x=v.isScene===!0?v.overrideMaterial:null;for(let g=0,R0=z.length;g<R0;g++){let _0=z[g],{object:O0,geometry:P0,group:v0}=_0,i0=_0.material;if(i0.allowOverride===!0&&x!==null)i0=x;if(O0.layers.test(d.layers))OK(O0,v,d,P0,i0,v0)}}function OK(z,v,d,x,g,R0){if(z.onBeforeRender(B,v,d,x,g,R0),z.modelViewMatrix.multiplyMatrices(d.matrixWorldInverse,z.matrixWorld),z.normalMatrix.getNormalMatrix(z.modelViewMatrix),g.onBeforeRender(B,v,d,x,z,R0),g.transparent===!0&&g.side===L9&&g.forceSinglePass===!1)g.side=sJ,g.needsUpdate=!0,B.renderBufferDirect(d,v,x,g,z,R0),g.side=F7,g.needsUpdate=!0,B.renderBufferDirect(d,v,x,g,z,R0),g.side=L9;else B.renderBufferDirect(d,v,x,g,z,R0);z.onAfterRender(B,v,d,x,g,R0)}function D6(z,v,d){if(v.isScene!==!0)v=y0;let x=j.get(z),g=w.state.lights,R0=w.state.shadowsArray,_0=g.state.version,O0=o.getParameters(z,g.state,R0,v,d,w.state.lightProbeGridArray),P0=o.getProgramCacheKey(O0),v0=x.programs;x.environment=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?v.environment:null,x.fog=v.fog;let i0=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap;if(x.envMap=e.get(z.envMap||x.environment,i0),x.envMapRotation=x.environment!==null&&z.envMap===null?v.environmentRotation:z.envMapRotation,v0===void 0)z.addEventListener("dispose",D9),v0=new Map,x.programs=v0;let t0=v0.get(P0);if(t0!==void 0){if(x.currentProgram===t0&&x.lightsStateVersion===_0)return kK(z,O0),t0}else{if(O0.uniforms=o.getUniforms(z),T!==null&&z.isNodeMaterial)T.build(z,d,O0);z.onBeforeCompile(O0,B),t0=o.acquireProgram(O0,P0),v0.set(P0,t0),x.uniforms=O0.uniforms}let f0=x.uniforms;if(!z.isShaderMaterial&&!z.isRawShaderMaterial||z.clipping===!0)f0.clippingPlanes=K0.uniform;if(kK(z,O0),x.needsLights=gU(z),x.lightsStateVersion=_0,x.needsLights)f0.ambientLightColor.value=g.state.ambient,f0.lightProbe.value=g.state.probe,f0.directionalLights.value=g.state.directional,f0.directionalLightShadows.value=g.state.directionalShadow,f0.spotLights.value=g.state.spot,f0.spotLightShadows.value=g.state.spotShadow,f0.rectAreaLights.value=g.state.rectArea,f0.ltc_1.value=g.state.rectAreaLTC1,f0.ltc_2.value=g.state.rectAreaLTC2,f0.pointLights.value=g.state.point,f0.pointLightShadows.value=g.state.pointShadow,f0.hemisphereLights.value=g.state.hemi,f0.directionalShadowMatrix.value=g.state.directionalShadowMatrix,f0.spotLightMatrix.value=g.state.spotLightMatrix,f0.spotLightMap.value=g.state.spotLightMap,f0.pointShadowMatrix.value=g.state.pointShadowMatrix;return x.lightProbeGrid=w.state.lightProbeGridArray.length>0,x.currentProgram=t0,x.uniformsList=null,t0}function RK(z){if(z.uniformsList===null){let v=z.currentProgram.getUniforms();z.uniformsList=q6.seqWithValue(v.seq,z.uniforms)}return z.uniformsList}function kK(z,v){let d=j.get(z);d.outputColorSpace=v.outputColorSpace,d.batching=v.batching,d.batchingColor=v.batchingColor,d.instancing=v.instancing,d.instancingColor=v.instancingColor,d.instancingMorph=v.instancingMorph,d.skinning=v.skinning,d.morphTargets=v.morphTargets,d.morphNormals=v.morphNormals,d.morphColors=v.morphColors,d.morphTargetsCount=v.morphTargetsCount,d.numClippingPlanes=v.numClippingPlanes,d.numIntersection=v.numClipIntersection,d.vertexAlphas=v.vertexAlphas,d.vertexTangents=v.vertexTangents,d.toneMapping=v.toneMapping}function bU(z,v){if(z.length===0)return null;if(z.length===1)return z[0].texture!==null?z[0]:null;V.setFromMatrixPosition(v.matrixWorld);for(let d=0,x=z.length;d<x;d++){let g=z[d];if(g.texture!==null&&g.boundingBox.containsPoint(V))return g}return null}function hU(z,v,d,x,g){if(v.isScene!==!0)v=y0;m.resetTextureUnits();let R0=v.fog,_0=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?v.environment:null,O0=h===null?B.outputColorSpace:h.isXRRenderTarget===!0?h.texture.colorSpace:JJ.workingColorSpace,P0=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,v0=e.get(x.envMap||_0,P0),i0=x.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,t0=!!d.attributes.tangent&&(!!x.normalMap||x.anisotropy>0),f0=!!d.morphAttributes.position,GJ=!!d.morphAttributes.normal,BJ=!!d.morphAttributes.color,LJ=E9;if(x.toneMapped){if(h===null||h.isXRRenderTarget===!0)LJ=B.toneMapping}let NJ=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,vJ=NJ!==void 0?NJ.length:0,A0=j.get(x),aJ=w.state.lights;if($0===!0){if(Q0===!0||z!==W0){let OJ=z===W0&&x.id===r;K0.setState(x,z,OJ)}}let $J=!1;if(x.version===A0.__version){if(A0.needsLights&&A0.lightsStateVersion!==aJ.state.version)$J=!0;else if(A0.outputColorSpace!==O0)$J=!0;else if(g.isBatchedMesh&&A0.batching===!1)$J=!0;else if(!g.isBatchedMesh&&A0.batching===!0)$J=!0;else if(g.isBatchedMesh&&A0.batchingColor===!0&&g.colorTexture===null)$J=!0;else if(g.isBatchedMesh&&A0.batchingColor===!1&&g.colorTexture!==null)$J=!0;else if(g.isInstancedMesh&&A0.instancing===!1)$J=!0;else if(!g.isInstancedMesh&&A0.instancing===!0)$J=!0;else if(g.isSkinnedMesh&&A0.skinning===!1)$J=!0;else if(!g.isSkinnedMesh&&A0.skinning===!0)$J=!0;else if(g.isInstancedMesh&&A0.instancingColor===!0&&g.instanceColor===null)$J=!0;else if(g.isInstancedMesh&&A0.instancingColor===!1&&g.instanceColor!==null)$J=!0;else if(g.isInstancedMesh&&A0.instancingMorph===!0&&g.morphTexture===null)$J=!0;else if(g.isInstancedMesh&&A0.instancingMorph===!1&&g.morphTexture!==null)$J=!0;else if(A0.envMap!==v0)$J=!0;else if(x.fog===!0&&A0.fog!==R0)$J=!0;else if(A0.numClippingPlanes!==void 0&&(A0.numClippingPlanes!==K0.numPlanes||A0.numIntersection!==K0.numIntersection))$J=!0;else if(A0.vertexAlphas!==i0)$J=!0;else if(A0.vertexTangents!==t0)$J=!0;else if(A0.morphTargets!==f0)$J=!0;else if(A0.morphNormals!==GJ)$J=!0;else if(A0.morphColors!==BJ)$J=!0;else if(A0.toneMapping!==LJ)$J=!0;else if(A0.morphTargetsCount!==vJ)$J=!0;else if(!!A0.lightProbeGrid!==w.state.lightProbeGridArray.length>0)$J=!0}else $J=!0,A0.__version=x.version;let W9=A0.currentProgram;if($J===!0){if(W9=D6(x,v,g),T&&x.isNodeMaterial)T.onUpdateProgram(x,W9,A0)}let O9=!1,m9=!1,x8=!1,EJ=W9.getUniforms(),zJ=A0.uniforms;if(A.useProgram(W9.program))O9=!0,m9=!0,x8=!0;if(x.id!==r)r=x.id,m9=!0;if(A0.needsLights){let OJ=bU(w.state.lightProbeGridArray,g);if(A0.lightProbeGrid!==OJ)A0.lightProbeGrid=OJ,m9=!0}if(O9||W0!==z){if(A.buffers.depth.getReversed()&&z.reversedDepth!==!0)z._reversedDepth=!0,z.updateProjectionMatrix();EJ.setValue(S,"projectionMatrix",z.projectionMatrix),EJ.setValue(S,"viewMatrix",z.matrixWorldInverse);let l9=EJ.map.cameraPosition;if(l9!==void 0)l9.setValue(S,z0.setFromMatrixPosition(z.matrixWorld));if(r0.logarithmicDepthBuffer)EJ.setValue(S,"logDepthBufFC",2/(Math.log(z.far+1)/Math.LN2));if(x.isMeshPhongMaterial||x.isMeshToonMaterial||x.isMeshLambertMaterial||x.isMeshBasicMaterial||x.isMeshStandardMaterial||x.isShaderMaterial)EJ.setValue(S,"isOrthographic",z.isOrthographicCamera===!0);if(W0!==z)W0=z,m9=!0,x8=!0}if(A0.needsLights){if(aJ.state.directionalShadowMap.length>0)EJ.setValue(S,"directionalShadowMap",aJ.state.directionalShadowMap,m);if(aJ.state.spotShadowMap.length>0)EJ.setValue(S,"spotShadowMap",aJ.state.spotShadowMap,m);if(aJ.state.pointShadowMap.length>0)EJ.setValue(S,"pointShadowMap",aJ.state.pointShadowMap,m)}if(g.isSkinnedMesh){EJ.setOptional(S,g,"bindMatrix"),EJ.setOptional(S,g,"bindMatrixInverse");let OJ=g.skeleton;if(OJ){if(OJ.boneTexture===null)OJ.computeBoneTexture();EJ.setValue(S,"boneTexture",OJ.boneTexture,m)}}if(g.isBatchedMesh){if(EJ.setOptional(S,g,"batchingTexture"),EJ.setValue(S,"batchingTexture",g._matricesTexture,m),EJ.setOptional(S,g,"batchingIdTexture"),EJ.setValue(S,"batchingIdTexture",g._indirectTexture,m),EJ.setOptional(S,g,"batchingColorTexture"),g._colorsTexture!==null)EJ.setValue(S,"batchingColorTexture",g._colorsTexture,m)}let d9=d.morphAttributes;if(d9.position!==void 0||d9.normal!==void 0||d9.color!==void 0)KJ.update(g,d,W9);if(m9||A0.receiveShadow!==g.receiveShadow)A0.receiveShadow=g.receiveShadow,EJ.setValue(S,"receiveShadow",g.receiveShadow);if((x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial)&&x.envMap===null&&v.environment!==null)zJ.envMapIntensity.value=v.environmentIntensity;if(zJ.dfgLUT!==void 0)zJ.dfgLUT.value=f1();if(m9){if(EJ.setValue(S,"toneMappingExposure",B.toneMappingExposure),A0.needsLights)xU(zJ,x8);if(R0&&x.fog===!0)M0.refreshFogUniforms(zJ,R0);if(M0.refreshMaterialUniforms(zJ,x,V0,X0,w.state.transmissionRenderTarget[z.id]),A0.needsLights&&A0.lightProbeGrid){let OJ=A0.lightProbeGrid;zJ.probesSH.value=OJ.texture,zJ.probesMin.value.copy(OJ.boundingBox.min),zJ.probesMax.value.copy(OJ.boundingBox.max),zJ.probesResolution.value.copy(OJ.resolution)}q6.upload(S,RK(A0),zJ,m)}if(x.isShaderMaterial&&x.uniformsNeedUpdate===!0)q6.upload(S,RK(A0),zJ,m),x.uniformsNeedUpdate=!1;if(x.isSpriteMaterial)EJ.setValue(S,"center",g.center);if(EJ.setValue(S,"modelViewMatrix",g.modelViewMatrix),EJ.setValue(S,"normalMatrix",g.normalMatrix),EJ.setValue(S,"modelMatrix",g.matrixWorld),x.uniformsGroups!==void 0){let OJ=x.uniformsGroups;for(let l9=0,g8=OJ.length;l9<g8;l9++){let MK=OJ[l9];I0.update(MK,W9),I0.bind(MK,W9)}}return W9}function xU(z,v){z.ambientLightColor.needsUpdate=v,z.lightProbe.needsUpdate=v,z.directionalLights.needsUpdate=v,z.directionalLightShadows.needsUpdate=v,z.pointLights.needsUpdate=v,z.pointLightShadows.needsUpdate=v,z.spotLights.needsUpdate=v,z.spotLightShadows.needsUpdate=v,z.rectAreaLights.needsUpdate=v,z.hemisphereLights.needsUpdate=v}function gU(z){return z.isMeshLambertMaterial||z.isMeshToonMaterial||z.isMeshPhongMaterial||z.isMeshStandardMaterial||z.isShadowMaterial||z.isShaderMaterial&&z.lights===!0}if(this.getActiveCubeFace=function(){return u},this.getActiveMipmapLevel=function(){return l},this.getRenderTarget=function(){return h},this.setRenderTargetTextures=function(z,v,d){let x=j.get(z);if(x.__autoAllocateDepthBuffer=z.resolveDepthBuffer===!1,x.__autoAllocateDepthBuffer===!1)x.__useRenderToTexture=!1;j.get(z.texture).__webglTexture=v,j.get(z.depthTexture).__webglTexture=x.__autoAllocateDepthBuffer?void 0:d,x.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(z,v){let d=j.get(z);d.__webglFramebuffer=v,d.__useDefaultFramebuffer=v===void 0},this.setRenderTarget=function(z,v=0,d=0){h=z,u=v,l=d;let x=null,g=!1,R0=!1;if(z){let O0=j.get(z);if(O0.__useDefaultFramebuffer!==void 0){A.bindFramebuffer(S.FRAMEBUFFER,O0.__webglFramebuffer),H0.copy(z.viewport),C0.copy(z.scissor),L0=z.scissorTest,A.viewport(H0),A.scissor(C0),A.setScissorTest(L0),r=-1;return}else if(O0.__webglFramebuffer===void 0)m.setupRenderTarget(z);else if(O0.__hasExternalTextures)m.rebindTextures(z,j.get(z.texture).__webglTexture,j.get(z.depthTexture).__webglTexture);else if(z.depthBuffer){let i0=z.depthTexture;if(O0.__boundDepthTexture!==i0){if(i0!==null&&j.has(i0)&&(z.width!==i0.image.width||z.height!==i0.image.height))throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");m.setupDepthRenderbuffer(z)}}let P0=z.texture;if(P0.isData3DTexture||P0.isDataArrayTexture||P0.isCompressedArrayTexture)R0=!0;let v0=j.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget){if(Array.isArray(v0[v]))x=v0[v][d];else x=v0[v];g=!0}else if(z.samples>0&&m.useMultisampledRTT(z)===!1)x=j.get(z).__webglMultisampledFramebuffer;else if(Array.isArray(v0))x=v0[d];else x=v0;H0.copy(z.viewport),C0.copy(z.scissor),L0=z.scissorTest}else H0.copy(QJ).multiplyScalar(V0).floor(),C0.copy(m0).multiplyScalar(V0).floor(),L0=d0;if(d!==0)x=p;if(A.bindFramebuffer(S.FRAMEBUFFER,x))A.drawBuffers(z,x);if(A.viewport(H0),A.scissor(C0),A.setScissorTest(L0),g){let O0=j.get(z.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_CUBE_MAP_POSITIVE_X+v,O0.__webglTexture,d)}else if(R0){let O0=v;for(let P0=0;P0<z.textures.length;P0++){let v0=j.get(z.textures[P0]);S.framebufferTextureLayer(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0+P0,v0.__webglTexture,d,O0)}}else if(z!==null&&d!==0){let O0=j.get(z.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,O0.__webglTexture,d)}r=-1},this.readRenderTargetPixels=function(z,v,d,x,g,R0,_0,O0=0){if(!(z&&z.isWebGLRenderTarget)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let P0=j.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget&&_0!==void 0)P0=P0[_0];if(P0){A.bindFramebuffer(S.FRAMEBUFFER,P0);try{let v0=z.textures[O0],i0=v0.format,t0=v0.type;if(z.textures.length>1)S.readBuffer(S.COLOR_ATTACHMENT0+O0);if(!r0.textureFormatReadable(i0)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!r0.textureTypeReadable(t0)){T0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(v>=0&&v<=z.width-x&&(d>=0&&d<=z.height-g))S.readPixels(v,d,x,g,s.convert(i0),s.convert(t0),R0)}finally{let v0=h!==null?j.get(h).__webglFramebuffer:null;A.bindFramebuffer(S.FRAMEBUFFER,v0)}}},this.readRenderTargetPixelsAsync=async function(z,v,d,x,g,R0,_0,O0=0){if(!(z&&z.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let P0=j.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget&&_0!==void 0)P0=P0[_0];if(P0)if(v>=0&&v<=z.width-x&&(d>=0&&d<=z.height-g)){A.bindFramebuffer(S.FRAMEBUFFER,P0);let v0=z.textures[O0],i0=v0.format,t0=v0.type;if(z.textures.length>1)S.readBuffer(S.COLOR_ATTACHMENT0+O0);if(!r0.textureFormatReadable(i0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!r0.textureTypeReadable(t0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let f0=S.createBuffer();S.bindBuffer(S.PIXEL_PACK_BUFFER,f0),S.bufferData(S.PIXEL_PACK_BUFFER,R0.byteLength,S.STREAM_READ),S.readPixels(v,d,x,g,s.convert(i0),s.convert(t0),0);let GJ=h!==null?j.get(h).__webglFramebuffer:null;A.bindFramebuffer(S.FRAMEBUFFER,GJ);let BJ=S.fenceSync(S.SYNC_GPU_COMMANDS_COMPLETE,0);return S.flush(),await SY(S,BJ,4),S.bindBuffer(S.PIXEL_PACK_BUFFER,f0),S.getBufferSubData(S.PIXEL_PACK_BUFFER,0,R0),S.deleteBuffer(f0),S.deleteSync(BJ),R0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(z,v=null,d=0){let x=Math.pow(2,-d),g=Math.floor(z.image.width*x),R0=Math.floor(z.image.height*x),_0=v!==null?v.x:0,O0=v!==null?v.y:0;m.setTexture2D(z,0),S.copyTexSubImage2D(S.TEXTURE_2D,d,0,0,_0,O0,g,R0),A.unbindTexture()},this.copyTextureToTexture=function(z,v,d=null,x=null,g=0,R0=0){let _0,O0,P0,v0,i0,t0,f0,GJ,BJ,LJ=z.isCompressedTexture?z.mipmaps[R0]:z.image;if(d!==null)_0=d.max.x-d.min.x,O0=d.max.y-d.min.y,P0=d.isBox3?d.max.z-d.min.z:1,v0=d.min.x,i0=d.min.y,t0=d.isBox3?d.min.z:0;else{let zJ=Math.pow(2,-g);if(_0=Math.floor(LJ.width*zJ),O0=Math.floor(LJ.height*zJ),z.isDataArrayTexture)P0=LJ.depth;else if(z.isData3DTexture)P0=Math.floor(LJ.depth*zJ);else P0=1;v0=0,i0=0,t0=0}if(x!==null)f0=x.x,GJ=x.y,BJ=x.z;else f0=0,GJ=0,BJ=0;let NJ=s.convert(v.format),vJ=s.convert(v.type),A0;if(v.isData3DTexture)m.setTexture3D(v,0),A0=S.TEXTURE_3D;else if(v.isDataArrayTexture||v.isCompressedArrayTexture)m.setTexture2DArray(v,0),A0=S.TEXTURE_2D_ARRAY;else m.setTexture2D(v,0),A0=S.TEXTURE_2D;A.activeTexture(S.TEXTURE0),A.pixelStorei(S.UNPACK_FLIP_Y_WEBGL,v.flipY),A.pixelStorei(S.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),A.pixelStorei(S.UNPACK_ALIGNMENT,v.unpackAlignment);let aJ=A.getParameter(S.UNPACK_ROW_LENGTH),$J=A.getParameter(S.UNPACK_IMAGE_HEIGHT),W9=A.getParameter(S.UNPACK_SKIP_PIXELS),O9=A.getParameter(S.UNPACK_SKIP_ROWS),m9=A.getParameter(S.UNPACK_SKIP_IMAGES);A.pixelStorei(S.UNPACK_ROW_LENGTH,LJ.width),A.pixelStorei(S.UNPACK_IMAGE_HEIGHT,LJ.height),A.pixelStorei(S.UNPACK_SKIP_PIXELS,v0),A.pixelStorei(S.UNPACK_SKIP_ROWS,i0),A.pixelStorei(S.UNPACK_SKIP_IMAGES,t0);let x8=z.isDataArrayTexture||z.isData3DTexture,EJ=v.isDataArrayTexture||v.isData3DTexture;if(z.isDepthTexture){let zJ=j.get(z),d9=j.get(v),OJ=j.get(zJ.__renderTarget),l9=j.get(d9.__renderTarget);A.bindFramebuffer(S.READ_FRAMEBUFFER,OJ.__webglFramebuffer),A.bindFramebuffer(S.DRAW_FRAMEBUFFER,l9.__webglFramebuffer);for(let g8=0;g8<P0;g8++){if(x8)S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,j.get(z).__webglTexture,g,t0+g8),S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,j.get(v).__webglTexture,R0,BJ+g8);S.blitFramebuffer(v0,i0,_0,O0,f0,GJ,_0,O0,S.DEPTH_BUFFER_BIT,S.NEAREST)}A.bindFramebuffer(S.READ_FRAMEBUFFER,null),A.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(g!==0||z.isRenderTargetTexture||j.has(z)){let zJ=j.get(z),d9=j.get(v);A.bindFramebuffer(S.READ_FRAMEBUFFER,n),A.bindFramebuffer(S.DRAW_FRAMEBUFFER,b);for(let OJ=0;OJ<P0;OJ++){if(x8)S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,zJ.__webglTexture,g,t0+OJ);else S.framebufferTexture2D(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,zJ.__webglTexture,g);if(EJ)S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,d9.__webglTexture,R0,BJ+OJ);else S.framebufferTexture2D(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,d9.__webglTexture,R0);if(g!==0)S.blitFramebuffer(v0,i0,_0,O0,f0,GJ,_0,O0,S.COLOR_BUFFER_BIT,S.NEAREST);else if(EJ)S.copyTexSubImage3D(A0,R0,f0,GJ,BJ+OJ,v0,i0,_0,O0);else S.copyTexSubImage2D(A0,R0,f0,GJ,v0,i0,_0,O0)}A.bindFramebuffer(S.READ_FRAMEBUFFER,null),A.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(EJ)if(z.isDataTexture||z.isData3DTexture)S.texSubImage3D(A0,R0,f0,GJ,BJ,_0,O0,P0,NJ,vJ,LJ.data);else if(v.isCompressedArrayTexture)S.compressedTexSubImage3D(A0,R0,f0,GJ,BJ,_0,O0,P0,NJ,LJ.data);else S.texSubImage3D(A0,R0,f0,GJ,BJ,_0,O0,P0,NJ,vJ,LJ);else if(z.isDataTexture)S.texSubImage2D(S.TEXTURE_2D,R0,f0,GJ,_0,O0,NJ,vJ,LJ.data);else if(z.isCompressedTexture)S.compressedTexSubImage2D(S.TEXTURE_2D,R0,f0,GJ,LJ.width,LJ.height,NJ,LJ.data);else S.texSubImage2D(S.TEXTURE_2D,R0,f0,GJ,_0,O0,NJ,vJ,LJ);if(A.pixelStorei(S.UNPACK_ROW_LENGTH,aJ),A.pixelStorei(S.UNPACK_IMAGE_HEIGHT,$J),A.pixelStorei(S.UNPACK_SKIP_PIXELS,W9),A.pixelStorei(S.UNPACK_SKIP_ROWS,O9),A.pixelStorei(S.UNPACK_SKIP_IMAGES,m9),R0===0&&v.generateMipmaps)S.generateMipmap(A0);A.unbindTexture()},this.initRenderTarget=function(z){if(j.get(z).__webglFramebuffer===void 0)m.setupRenderTarget(z)},this.initTexture=function(z){if(z.isCubeTexture)m.setTextureCube(z,0);else if(z.isData3DTexture)m.setTexture3D(z,0);else if(z.isDataArrayTexture||z.isCompressedArrayTexture)m.setTexture2DArray(z,0);else m.setTexture2D(z,0);A.unbindTexture()},this.resetState=function(){u=0,l=0,h=null,A.reset(),E0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return QZ}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let Q=this.getContext();Q.drawingBufferColorSpace=JJ._getDrawingBufferColorSpace(J),Q.unpackColorSpace=JJ._getUnpackColorSpace()}}export{r9 as warnOnce,Y0 as warn,JN as setConsoleFunction,m7 as log,QN as getConsoleFunction,T0 as error,PY as createCanvasElement,VG as ZeroStencilOp,YG as ZeroSlopeEnding,gH as ZeroFactor,HG as ZeroCurvatureEnding,XG as WrapAroundEnding,VZ as WireframeGeometry,e7 as WebXRController,sG as WebGPUCoordinateSystem,C1 as WebGLUtils,b1 as WebGLRenderer,oJ as WebGLRenderTarget,GK as WebGLCubeRenderTarget,QZ as WebGLCoordinateSystem,yY as WebGLArrayRenderTarget,vY as WebGL3DRenderTarget,EZ as VideoTexture,cY as VideoFrameTexture,Q$ as VectorKeyframeTrack,XJ as Vector4,P as Vector3,a as Vector2,q7 as VSMShadowMap,o7 as UnsignedShortType,RW as UnsignedShort5551Type,OW as UnsignedShort4444Type,Q8 as UnsignedIntType,DY as UnsignedInt5999Type,R7 as UnsignedInt248Type,OY as UnsignedInt101111Type,q9 as UnsignedByteType,$X as UniformsUtils,D0 as UniformsLib,_X as UniformsGroup,tZ as Uniform,gY as Uint8ClampedBufferAttribute,xY as Uint8BufferAttribute,AQ as Uint32BufferAttribute,IQ as Uint16BufferAttribute,sU as UVMapping,iQ as TubeGeometry,NG as TrianglesDrawMode,EG as TriangleStripDrawMode,qG as TriangleFanDrawMode,nJ as Triangle,sQ as TorusKnotGeometry,nQ as TorusGeometry,iG as TimestampQuery,nZ as Timer,rX as TextureUtils,EX as TextureLoader,kJ as Texture,cQ as TetrahedronGeometry,rW as TangentSpaceNormalMap,mU as TOUCH,KW as SubtractiveBlending,fH as SubtractEquation,K8 as StringKeyframeTrack,dG as StreamReadUsage,gG as StreamDrawUsage,cG as StreamCopyUsage,MX as StereoCamera,pG as StaticReadUsage,hG as StaticDrawUsage,lG as StaticCopyUsage,mH as SrcColorFactor,oH as SrcAlphaSaturateFactor,lH as SrcAlphaFactor,wQ as SpriteMaterial,KZ as Sprite,fX as SpotLightHelper,bZ as SpotLight,gQ as SplineCurve,Z$ as SphericalHarmonics3,jX as Spherical,H6 as SphereGeometry,SJ as Sphere,v9 as Source,YZ as SkinnedMesh,bX as SkeletonHelper,CQ as Skeleton,FY as ShortType,G9 as ShapeUtils,oX as ShapePath,uQ as ShapeGeometry,M7 as Shape,BZ as ShadowMaterial,Q9 as ShaderMaterial,I9 as ShaderLib,a0 as ShaderChunk,ZZ as Scene,qJ as SRGBTransfer,VY as SRGBColorSpace,TW as SIGNED_RG11_EAC_Format,oW as SIGNED_RED_RGTC1_Format,aW as SIGNED_RED_GREEN_RGTC2_Format,PW as SIGNED_R11_EAC_Format,lQ as RingGeometry,bH as ReverseSubtractEquation,zG as ReplaceStencilOp,GY as RepeatWrapping,wX as RenderTarget3D,VQ as RenderTarget,UW as ReinhardToneMapping,kW as RedIntegerFormat,MY as RedFormat,pZ as RectAreaLight,TX as Raycaster,y8 as Ray,oQ as RawShaderMaterial,MW as RGIntegerFormat,S8 as RGFormat,RG as RGDepthPacking,qQ as RGB_S3TC_DXT1_Format,VW as RGB_PVRTC_4BPPV1_Format,BW as RGB_PVRTC_2BPPV1_Format,wW as RGB_ETC2_Format,AW as RGB_ETC1_Format,sW as RGB_BPTC_UNSIGNED_Format,nW as RGB_BPTC_SIGNED_Format,tU as RGBIntegerFormat,kY as RGBFormat,OG as RGBDepthPacking,OQ as RGBA_S3TC_DXT5_Format,DQ as RGBA_S3TC_DXT3_Format,FQ as RGBA_S3TC_DXT1_Format,zW as RGBA_PVRTC_4BPPV1_Format,IW as RGBA_PVRTC_2BPPV1_Format,_W as RGBA_ETC2_EAC_Format,cW as RGBA_BPTC_Format,xW as RGBA_ASTC_8x8_Format,hW as RGBA_ASTC_8x6_Format,bW as RGBA_ASTC_8x5_Format,fW as RGBA_ASTC_6x6_Format,vW as RGBA_ASTC_6x5_Format,yW as RGBA_ASTC_5x5_Format,jW as RGBA_ASTC_5x4_Format,SW as RGBA_ASTC_4x4_Format,uW as RGBA_ASTC_12x12_Format,lW as RGBA_ASTC_12x10_Format,mW as RGBA_ASTC_10x8_Format,pW as RGBA_ASTC_10x6_Format,gW as RGBA_ASTC_10x5_Format,dW as RGBA_ASTC_10x10_Format,LW as RGBAIntegerFormat,B9 as RGBAFormat,DG as RGBADepthPacking,RQ as RG11_EAC_Format,TH as REVISION,iW as RED_RGTC1_Format,kQ as RED_GREEN_RGTC2_Format,CW as R11_EAC_Format,vZ as QuaternionLinearInterpolant,X6 as QuaternionKeyframeTrack,xJ as Quaternion,xQ as QuadraticBezierCurve3,hQ as QuadraticBezierCurve,iZ as PropertyMixer,WJ as PropertyBinding,VX as PositionalAudio,W8 as PolyhedronGeometry,mX as PolarGridHelper,TQ as PointsMaterial,NZ as Points,xX as PointLightHelper,hZ as PointLight,nX as PlaneHelper,L7 as PlaneGeometry,j9 as Plane,TJ as PerspectiveCamera,U7 as Path,YK as PMREMGenerator,yH as PCFSoftShadowMap,c7 as PCFShadowMap,V7 as OrthographicCamera,dH as OneMinusSrcColorFactor,uH as OneMinusSrcAlphaFactor,iH as OneMinusDstColorFactor,nH as OneMinusDstAlphaFactor,rH as OneMinusConstantColorFactor,eH as OneMinusConstantAlphaFactor,pH as OneFactor,K6 as OctahedronGeometry,LY as ObjectSpaceNormalMap,OX as ObjectLoader,ZJ as Object3D,Y6 as NumberKeyframeTrack,vG as NotEqualStencilFunc,HY as NotEqualDepth,wY as NotEqualCompare,MG as NormalRGPacking,LG as NormalGAPacking,n7 as NormalBlending,UG as NormalAnimationBlendMode,E9 as NoToneMapping,kG as NoNormalPacking,j8 as NoColorSpace,V9 as NoBlending,PG as NeverStencilFunc,JY as NeverDepth,BY as NeverCompare,FW as NeutralToneMapping,EY as NearestMipmapNearestFilter,i7 as NearestMipmapLinearFilter,iU as NearestMipMapNearestFilter,oU as NearestMipMapLinearFilter,J8 as NearestFilter,YY as MultiplyOperation,HW as MultiplyBlending,XY as MixOperation,NY as MirroredRepeatWrapping,hH as MinEquation,wZ as MeshToonMaterial,aQ as MeshStandardMaterial,IZ as MeshPhysicalMaterial,AZ as MeshPhongMaterial,_Z as MeshNormalMaterial,PZ as MeshMatcapMaterial,CZ as MeshLambertMaterial,tQ as MeshDistanceMaterial,rQ as MeshDepthMaterial,g9 as MeshBasicMaterial,AJ as Mesh,xH as MaxEquation,p0 as Matrix4,l0 as Matrix3,eZ as Matrix2,kN as MathUtils,K$ as MaterialLoader,uU as MaterialBlending,jJ as Material,pU as MOUSE,JG as LoopRepeat,QG as LoopPingPong,eU as LoopOnce,$$ as LoadingManager,XQ as LoaderUtils,lJ as Loader,eW as LinearTransfer,XW as LinearToneMapping,tW as LinearSRGBColorSpace,EQ as LinearMipmapNearestFilter,C8 as LinearMipmapLinearFilter,aU as LinearMipMapNearestFilter,rU as LinearMipMapLinearFilter,eQ as LinearInterpolant,iJ as LinearFilter,F9 as LineSegments,GZ as LineLoop,TZ as LineDashedMaterial,MZ as LineCurve3,bQ as LineCurve,gJ as LineBasicMaterial,vX as Line3,b9 as Line,mZ as LightProbe,p9 as Light,TG as LessStencilFunc,jG as LessEqualStencilFunc,YW as LessEqualDepth,MQ as LessEqualCompare,$Y as LessDepth,zY as LessCompare,t7 as Layers,dQ as LatheGeometry,HZ as LOD,$9 as KeyframeTrack,BG as KeepStencilOp,CG as InvertStencilOp,oG as InterpolationSamplingType,aG as InterpolationSamplingMode,ZG as InterpolateSmooth,WG as InterpolateLinear,$G as InterpolateDiscrete,KG as InterpolateBezier,b8 as Interpolant,I8 as InterleavedBufferAttribute,J6 as InterleavedBuffer,DW as IntType,hY as Int8BufferAttribute,mY as Int32BufferAttribute,pY as Int16BufferAttribute,XZ as InstancedMesh,CX as InstancedInterleavedBuffer,dZ as InstancedBufferGeometry,A8 as InstancedBufferAttribute,wG as IncrementWrapStencilOp,IG as IncrementStencilOp,WZ as ImageUtils,E7 as ImageLoader,RX as ImageBitmapLoader,mQ as IcosahedronGeometry,gX as HemisphereLightHelper,fZ as HemisphereLight,x9 as HalfFloatType,aY as HTMLTexture,L8 as Group,pX as GridHelper,yG as GreaterStencilFunc,fG as GreaterEqualStencilFunc,ZY as GreaterEqualDepth,LQ as GreaterEqualCompare,KY as GreaterDepth,AY as GreaterCompare,JZ as GLSL3,nG as GLSL1,PX as GLBufferAttribute,PQ as FrustumArray,e9 as Frustum,F7 as FrontSide,nY as FramebufferTexture,BQ as FogExp2,zQ as Fog,h9 as FloatType,w0 as Float32BufferAttribute,dY as Float16BufferAttribute,M9 as FileLoader,pQ as ExtrudeGeometry,SQ as ExternalTexture,K9 as EventDispatcher,N9 as Euler,GQ as EquirectangularRefractionMapping,UQ as EquirectangularReflectionMapping,SG as EqualStencilFunc,WY as EqualDepth,IY as EqualCompare,Z6 as EllipseCurve,FZ as EdgesGeometry,mG as DynamicReadUsage,xG as DynamicDrawUsage,uG as DynamicCopyUsage,sH as DstColorFactor,cH as DstAlphaFactor,L9 as DoubleSide,vQ as DodecahedronGeometry,jZ as DiscreteInterpolant,dX as DirectionalLightHelper,xZ as DirectionalLight,nU as DetachedBindMode,$8 as DepthTexture,T8 as DepthStencilFormat,P8 as DepthFormat,HX as DefaultLoadingManager,_G as DecrementWrapStencilOp,AG as DecrementStencilOp,bY as DataUtils,NX as DataTextureLoader,J9 as DataTexture,a7 as DataArrayTexture,r7 as Data3DTexture,yX as Cylindrical,$6 as CylinderGeometry,EW as CustomToneMapping,vH as CustomBlending,LZ as CurvePath,H9 as Curve,SH as CullFaceNone,dU as CullFaceFrontBack,jH as CullFaceFront,WW as CullFaceBack,SZ as CubicInterpolant,kZ as CubicBezierCurve3,fQ as CubicBezierCurve,s7 as CubeUVReflectionMapping,GX as CubeTextureLoader,k7 as CubeTexture,_8 as CubeRefractionMapping,O7 as CubeReflectionMapping,qZ as CubeDepthTexture,uZ as CubeCamera,aX as Controls,aH as ConstantColorFactor,tH as ConstantAlphaFactor,W6 as ConeGeometry,UX as CompressedTextureLoader,Q6 as CompressedTexture,iY as CompressedCubeTexture,sY as CompressedArrayTexture,rG as Compatibility,JJ as ColorManagement,J$ as ColorKeyframeTrack,B0 as Color,SX as Clock,NQ as ClampToEdgeWrapping,yQ as CircleGeometry,GW as CineonToneMapping,RZ as CatmullRomCurve3,jQ as CapsuleGeometry,oY as CanvasTexture,lX as CameraHelper,U6 as Camera,k9 as Cache,qY as ByteType,lZ as BufferGeometryLoader,u0 as BufferGeometry,YJ as BufferAttribute,uX as BoxHelper,v8 as BoxGeometry,cX as Box3Helper,yJ as Box3,JK as Box2,Z8 as BooleanKeyframeTrack,_Q as Bone,yZ as BezierInterpolant,UZ as BatchedMesh,lU as BasicShadowMap,FG as BasicDepthPacking,sJ as BackSide,iX as AxesHelper,kX as AudioLoader,LX as AudioListener,H$ as AudioContext,BX as AudioAnalyser,sZ as Audio,cU as AttachedBindMode,sX as ArrowHelper,cZ as ArrayCamera,DZ as ArcCurve,KX as AnimationUtils,IX as AnimationObjectGroup,AX as AnimationMixer,XX as AnimationLoader,N7 as AnimationClip,rZ as AnimationAction,gZ as AmbientLight,bG as AlwaysStencilFunc,QY as AlwaysDepth,_Y as AlwaysCompare,RY as AlphaFormat,qW as AgXToneMapping,ZW as AdditiveBlending,GG as AdditiveAnimationBlendMode,UY as AddOperation,D7 as AddEquation,NW as ACESFilmicToneMapping};
