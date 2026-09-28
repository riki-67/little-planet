import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Each neighbor is an original small articulated, low-poly character.
export function createResidentModel(M, npc) {
  const PI=Math.PI, g=()=>new THREE.Group();
  const root=g(), body=g(), head=g(), feet=g(), arms=[], eyes=[];
  const {fur,cream,outfit,species}=npc;
  root.add(body,feet);body.add(head);head.position.y=.55;head.userData.keepDynamic=true;
  const mesh=M.mesh,box=M.box,soft=M.soft,cyl=M.cyl,ico=M.ico,beam=M.beam;
  const clothGeometry=new THREE.CylinderGeometry(.114,.142,.235,8);
  mesh(body,clothGeometry,outfit,0,.29,0);
  cyl(body,cream,0,.429,0,.066,.052);
  for(const x of [-.065,.065]){
    box(feet,'#666c4f',x,.115,0,.063,.13,.063);
    soft(feet,species==='penguin'?'#c69a58':'#817155',x,.038,.025,.045,.043,.070);
    const arm=g();arm.userData.keepDynamic=true;arm.position.set(x*2.16,.36,0);body.add(arm);
    soft(arm,outfit,0,-.054,0,.043,.092,.046);
    soft(arm,fur,0,-.137,.016,.038,.042,.039);arms.push(arm);
  }
  soft(head,fur,0,0,0,.154,.153,.135);
  // Smaller face parts stay independent so blinks and speech remain expressive.
  if(species==='penguin'){
    for(const x of [-.052,.052])soft(head,cream,x,-.012,.107,.081,.105,.034);
    soft(body,cream,0,.286,.101,.090,.117,.037);
  }else if(species==='owl'){
    for(const x of [-.058,.058])soft(head,cream,x,-.012,.103,.084,.099,.046);
  }else{
    soft(head,cream,0,-.061,.118,species==='dragon'?.115:.090,.058,.046);
    for(const x of [-.117,.117])soft(head,'#d29b79',x,-.041,.084,.025,.015,.018);
  }
  for(const x of [-.056,.056]){
    const eye=g();eye.userData.keepDynamic=true;eye.position.set(x,.018,.131);head.add(eye);
    soft(eye,'#293e36',0,0,0,.013,.019,.010);
    soft(eye,'#f6ebd4',.003,.006,.009,.004,.005,.003);eyes.push(eye);
  }
  const mouth=g();mouth.userData.keepDynamic=true;mouth.position.set(0,-.083,.163);head.add(mouth);
  soft(mouth,'#705840',0,0,0,.017,.007,.005);
  if(species==='owl'||species==='penguin')mesh(head,M.geo.cone,'#d4a060',0,-.044,.157,.027,.061,.027,PI/2,0,0);
  else ico(head,species==='dragon'?'#8c8058':'#68523c',0,-.038,.162,.020,.014,.013);
  let tail=null;
  if(species==='squirrel'){
    for(const x of [-.115,.115]){
      soft(head,fur,x,.132,-.018,.047,.092,.038);
      soft(head,cream,x,.143,.013,.022,.047,.013);
    }
    soft(head,outfit,0,.125,-.016,.139,.055,.125);
    mesh(head,M.geo.cone,'#98af73',.044,.194,-.02,.032,.086,.017,0,0,-.5);
    box(body,'#d8c18c',.074,.267,.117,.104,.099,.034);
    beam(body,[-.085,.40,.09],[.085,.23,.123],.012,'#ac8b58');
    box(arms[1],'#efe2b6',0,-.145,.044,.10,.066,.015,0,0,-.15);
    for(const x of [-1,1])beam(arms[1],[x*.047,-.112,.055],[0,-.142,.056],.0025,'#b69a69');
    ico(arms[1],'#b8865c',0,-.139,.059,.010,.009,.004);
    tail=g();tail.position.set(.025,.185,-.105);root.add(tail);
    soft(tail,fur,.035,.085,-.055,.073,.155,.085);
    soft(tail,fur,.075,.26,-.079,.117,.131,.087);
    soft(tail,cream,.094,.267,-.162,.060,.075,.014);
  }else if(species==='sheep'){
    for(const x of [-.174,.174])soft(head,fur,x,.026,.0,.064,.028,.035);
    for(let i=0;i<7;i++){
      const a=i/6*PI;soft(head,cream,Math.cos(a)*.116,.075+Math.sin(a)*.072,-.02,.061,.055,.066);
    }
    cyl(head,'#efe8cf',0,.184,-.005,.115,.030);
    for(const [x,y,z] of [[-.06,.218,0],[.03,.228,0],[.079,.209,0]])soft(head,'#f5ebcf',x,y,z,.066,.049,.067);
    box(body,'#ecddb5',0,.263,.117,.166,.197,.026);
    for(const x of [-.060,.060])box(body,'#ecddb5',x,.386,.092,.028,.074,.020);
    ico(body,'#b2955c',0,.259,.139,.023,.036,.008);
    soft(arms[1],'#bd9253',0,-.145,.084,.066,.044,.035);
    for(const x of [-.026,.019])box(arms[1],'#edce8a',x,-.116,.100,.009,.022,.019,0,0,-.25);
  }else if(species==='penguin'){
    soft(head,outfit,0,.105,-.005,.155,.085,.140);
    cyl(head,'#abd1c8',0,.103,0,.155,.035);
    soft(head,'#e1e8cf',0,.193,-.012,.041,.037,.039);
    box(body,'#c67f63',0,.426,.004,.247,.044,.223);
    box(body,'#d28f70',.073,.358,.119,.046,.135,.022,0,0,.12);
    cyl(arms[1],'#d1d9c1',0,-.146,.058,.034,.059);
    cyl(arms[1],'#8a7354',0,-.115,.058,.026,.004);
    mesh(arms[1],M.geo.ring,'#d1d9c1',.034,-.140,.058,.018,.020,.018,0,PI/2);
  }else if(species==='fennec'){
    for(const x of [-.118,.118]){
      mesh(head,M.geo.cone,fur,x,.17,-.015,.059,.255,.036,0,0,-Math.sign(x)*.20);
      mesh(head,M.geo.cone,'#eac495',x,.179,.012,.030,.174,.008,0,0,-Math.sign(x)*.20);
    }
    box(head,'#e6ce9f',0,.10,.01,.27,.044,.23,0,0,.035);
    box(head,'#dbc492',-.138,.012,-.006,.042,.166,.048,0,0,-.17);
    box(body,'#8ba79c',0,.39,.101,.211,.045,.057,0,0,-.10);
    mesh(body,M.geo.cone,'#7c9e93',.011,.325,.113,.077,.10,.021,0,0,PI);
    ico(body,'#d5b472',.01,.365,.148,.022,.026,.008);
    box(arms[1],'#d8c59a',0,-.144,.058,.10,.074,.019,0,0,.18);
    box(arms[1],'#b19b6a',.025,-.143,.070,.006,.064,.005,0,0,.18);
    tail=g();tail.position.set(.035,.177,-.105);root.add(tail);
    soft(tail,fur,.025,-.04,-.085,.060,.060,.132);soft(tail,cream,.040,-.02,-.205,.052,.049,.075);
  }else if(species==='otter'){
    for(const x of [-.143,.143])soft(head,fur,x,.057,-.013,.040,.045,.032);
    cyl(head,'#d4bb7a',0,.153,.005,.209,.022);
    cyl(head,'#e1c88c',0,.184,-.005,.130,.066);
    cyl(head,'#799882',0,.162,-.005,.132,.020);
    for(const y of [.245,.29,.335])box(body,'#dce3c7',0,y,.119,.205,.022,.018);
    for(const sign of [-1,1])for(const y of [-.051,-.072])beam(head,[sign*.070,y,.158],[sign*.151,y+.007,.141],.0025,'#6d6550');
    for(let i=0;i<5;i++){
      const a=(i-2)*.4;beam(arms[1],[0,-.177,.081],[Math.sin(a)*.054,-.121,.082+Math.cos(a)*.013],.009,'#dfcdab');
    }
    tail=g();tail.position.set(0,.087,-.102);root.add(tail);soft(tail,fur,0,-.004,-.1,.060,.038,.165);
  }else if(species==='dragon'){
    for(const x of [-.095,.095]){
      mesh(head,M.geo.cone,'#c6b67f',x,.158,-.011,.025,.123,.024,0,0,-Math.sign(x)*.16);
      mesh(head,M.geo.cone,fur,x*1.72,.02,-.016,.045,.098,.025,0,0,-Math.sign(x)*1.0);
    }
    for(let i=0;i<3;i++)mesh(head,M.geo.cone,'#a9af7f',(i-1)*.052,.133,-.079,.031,.065,.027,0,0,(i-1)*-.2);
    box(body,'#bf875c',0,.405,.021,.237,.041,.211);
    box(body,'#546752',0,.254,.115,.163,.183,.032);
    ico(body,'#d5a467',0,.29,.137,.025,.032,.008);
    box(arms[1],'#a49b73',0,-.17,.064,.013,.149,.013,0,0,-.09);
    box(arms[1],'#8d9b84',.008,-.083,.065,.060,.055,.013,0,0,-.09);
    tail=g();tail.position.set(0,.17,-.115);root.add(tail);
    soft(tail,fur,.021,-.057,-.099,.061,.056,.131);mesh(tail,M.geo.cone,'#b6b682',.026,-.015,-.199,.034,.067,.035,0,0,-.35);
  }else{
    for(const x of [-.107,.107])mesh(head,M.geo.cone,fur,x,.118,-.020,.048,.141,.041,0,0,-Math.sign(x)*.35);
    for(const x of [-.058,.058])mesh(head,M.geo.ring,'#bcae7f',x,.018,.148,.052,.057,.052);
    beam(head,[-.008,.018,.148],[.008,.018,.148],.004,'#bcae7f');
    box(body,'#9690a5',0,.394,.105,.233,.042,.033,0,0,-.08);
    ico(body,'#d7c490',0,.351,.136,.028,.035,.009);
    box(arms[1],'#8da091',0,-.15,.058,.103,.12,.033,0,0,.13);
    box(arms[1],'#e4d4ac',.017,-.150,.078,.079,.096,.008,0,0,.13);
    ico(arms[1],'#bf9f60',.019,-.15,.084,.020,.025,.004);
  }

  // Bake each rigid part to one vertex-colored mesh, retaining the articulated rig.
  const shared=M.material('#ffffff',{vertexColors:true,roughness:1,flatShading:true});
  function compact(part){
    part.updateWorldMatrix(true,true);const inverse=part.matrixWorld.clone().invert(),sources=[];
    part.traverse(o=>{
      if(!o.isMesh||!o.material.isMeshStandardMaterial)return;
      let parent=o.parent;while(parent&&parent!==part){if(parent.userData.keepDynamic)return;parent=parent.parent;}
      if(o.userData.keepDynamic)return;sources.push(o);
    });
    if(!sources.length)return;
    const geometries=sources.map(o=>{
      const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
      const old=geometry.getAttribute('color'),count=geometry.getAttribute('position').count,colors=new Float32Array(count*3),tint=o.material.color;
      for(let i=0;i<count;i++){colors[i*3]=tint.r*(old?old.getX(i):1);colors[i*3+1]=tint.g*(old?old.getY(i):1);colors[i*3+2]=tint.b*(old?old.getZ(i):1);}
      for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.clearGroups();return geometry;
    });
    const merged=mergeGeometries(geometries,false);geometries.forEach(geo=>geo.dispose());
    if(!merged)throw new Error('Neighbor geometry could not be combined');
    sources.forEach(o=>o.removeFromParent());const result=new THREE.Mesh(merged,shared);result.receiveShadow=true;part.add(result);
  }
  compact(head);arms.forEach(compact);compact(body);compact(feet);if(tail)compact(tail);
  const shadow=M.shadow(root,.49,.41);shadow.material=shadow.material.clone();shadow.material.opacity=.53;
  root.scale.setScalar(species==='fennec'?.85:.91);
  root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.userData.resident=npc.id;}});

  const heartCanvas=document.createElement('canvas');heartCanvas.width=heartCanvas.height=64;
  const ctx=heartCanvas.getContext('2d');ctx.fillStyle='#eddcb0';ctx.beginPath();ctx.moveTo(32,53);ctx.bezierCurveTo(8,37,7,23,16,17);ctx.bezierCurveTo(23,12,30,16,32,22);ctx.bezierCurveTo(38,10,49,13,53,22);ctx.bezierCurveTo(60,37,42,46,32,53);ctx.fill();
  const heartTexture=new THREE.CanvasTexture(heartCanvas);heartTexture.colorSpace=THREE.SRGBColorSpace;
  const heart=new THREE.Sprite(new THREE.SpriteMaterial({map:heartTexture,transparent:true,depthWrite:false,opacity:.9}));heart.position.set(0,.98,0);heart.scale.set(.19,.19,.19);heart.visible=false;root.add(heart);
  return {root,body,head,arms,eyes,mouth,tail,heart,shadow};
}
