import * as THREE from 'three';
import { createModels } from './models.js';
import { refineModels } from './art.js';
import { decorateLandscape } from './scenery.js';
import { RESIDENTS } from './residents-data.js';

export const R = 6;
export const UP = new THREE.Vector3(0,1,0);
const DEG = Math.PI/180;
export const REGIONS = [
  { id:'forest', number:'01', name:'Fernwood', chinese:'蕨木森林', category:'FOREST', color:'#77b45b', description:'每一次远行，都始于一小步。', action:'照料篝火', wonder:'林间的微光', lon:16,lat:-8 },
  { id:'meadow', number:'02', name:'Sunmeadow', chinese:'晴风草甸', category:'MEADOW', color:'#bacd79', description:'风车慢慢转，日子也慢慢走。', action:'听一听风车', wonder:'风的来信', lon:-37,lat:8 },
  { id:'snow', number:'03', name:'Frostfall', chinese:'霜落雪原', category:'GLACIER', color:'#a4d6cb', description:'在世界的顶端，拾起一片宁静。', action:'唤醒冰晶', wonder:'冰雪的回声', lon:12,lat:65 },
  { id:'desert', number:'04', name:'Amber Dunes', chinese:'琥珀沙丘', category:'DESERT', color:'#e6c07a', description:'沙海记得，每一阵风经过的形状。', action:'转动日晷', wonder:'时间的影子', lon:74,lat:17 },
  { id:'coast', number:'05', name:'Tidehaven', chinese:'潮汐海岸', category:'COAST', color:'#a4d7b8', description:'把脚步放轻，听海浪讲个故事。', action:'拾起海螺', wonder:'大海的悄悄话', lon:88,lat:-24 },
  { id:'volcano', number:'06', name:'Ember Heights', chinese:'余烬高地', category:'VOLCANO', color:'#d39b68', description:'就连沉睡的山，也有温柔的心跳。', action:'聆听火山', wonder:'大地的心跳', lon:-107,lat:14 },
  { id:'highlands', number:'07', name:'Skyreach', chinese:'云端遗迹', category:'HIGHLANDS', color:'#b6c5a0', description:'抬头的时候，我们离星星更近一些。', action:'仰望群星', wonder:'星空的约定', lon:164,lat:13 }
];
const PALETTE = {
  forest:['#519747','#54994a','#4f9346','#589a4d','#55974a'],
  meadow:['#a3be58','#a4c15a','#a0bb56','#a8bf60','#a9c460'],
  snow:['#cde5b9','#d0e8be','#cce2b6','#d1e6bc'],
  desert:['#dfb15b','#e6b75e','#dcb05c','#e5b761'],
  coast:['#d8b56a','#dfbd75','#d3b16b','#e1bf79'],
  volcano:['#55553d','#53553e','#5b5a41','#50543b'],
  highlands:['#8b9b61','#91a466','#91a066','#899963'],
  water:['#246d78','#287582','#28777d','#296f7b']
};
export function direction(lon,lat) {
  const a=lon*DEG,b=lat*DEG,c=Math.cos(b);
  return new THREE.Vector3(Math.sin(a)*c,Math.sin(b),Math.cos(a)*c);
}
export function coordinates(n) {return {lon:Math.atan2(n.x,n.z)/DEG,lat:Math.asin(THREE.MathUtils.clamp(n.y,-1,1))/DEG};}
export function shoreLatitude(lon) {
  const bay=8.8*Math.exp(-Math.pow((lon-4)/45,4));
  return -38+Math.sin(lon*.035)*3.6+Math.sin(lon*.15)*1.7+bay;
}
export function biomeAt(n) {
  const {lon,lat}=coordinates(n);
  const shore=shoreLatitude(lon);
  if(lat<shore)return 'water';
  if(lat>46+Math.sin(lon*.065)*3.2)return 'snow';
  const l=lon+Math.sin(lat*.24)*2.1+Math.cos(lat*.55)*.9;
  if(l>-16&&l<46)return 'forest';
  if(l>=46&&l<113)return lat< -5+Math.sin(lon*.09)*3.5?'coast':'desert';
  if(l<=-16&&l>-67)return 'meadow';
  if(l<=-67&&l>-143)return 'volcano';
  return 'highlands';
}
export function elevation(n) {
  const id=biomeAt(n);
  const noise=Math.sin(n.x*19+n.y*11)*Math.cos(n.z*17-n.x*5);
  const fine=Math.sin(n.x*45+n.z*29)*Math.cos(n.y*39+n.z*9);
  if(id==='water')return -.075+noise*.009;
  return .032+noise*.006+fine*.0018+(id==='snow'?.025:0);
}
export function groundPoint(n, extra=0) {return n.clone().multiplyScalar(R+elevation(n)+extra);}
function seedRandom(seed=4817) {return ()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}

export function buildWorld(scene) {
  const random=seedRandom();
  const M=refineModels(createModels(random),random);
  const staticRoot=new THREE.Group();scene.add(staticRoot);
  const reservations=[],colliders=[],dynamicRoots=[],animals=[],clouds=[],wonders=[];
  const routes=[];
  let burstTime=-100;
  const startDirection=direction(16,-1.1);
  const normalQuaternion=new THREE.Quaternion();

  function reserve(lon,lat,radius) {reservations.push({n:direction(lon,lat),radius});}
  function isReserved(n, padding=0) {return reservations.some(r=>n.distanceTo(r.n)*R<r.radius+padding);}
  function place(model,lon,lat,yaw=0,scale=1,root=staticRoot) {
    const n=direction(lon,lat);model.position.copy(groundPoint(n));
    model.quaternion.setFromUnitVectors(UP,n);model.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP,yaw));
    model.scale.multiplyScalar(scale);
    if(model.userData.conifer&&lat-shoreLatitude(lon)<4.2)model.scale.multiplyScalar(.76);
    root.add(model);return model;
  }
  function obstacle(lon,lat,radius) {colliders.push({n:direction(lon,lat),radius});}
  function structure(factory,lon,lat,{yaw=0,scale=1,radius=.7,collision=.4}={}) {
    const obj=place(factory(),lon,lat,yaw,scale);reserve(lon,lat,radius*scale);if(collision)obstacle(lon,lat,collision*scale);return obj;
  }

  RESIDENTS.forEach(n=>reserve(n.lon,n.lat,.58));

  const terrainGeometry=new THREE.SphereGeometry(R,112,76).toNonIndexed();
  const p=terrainGeometry.attributes.position;
  const normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    normal.fromBufferAttribute(p,i).normalize();normal.multiplyScalar(R+elevation(normal));p.setXYZ(i,normal.x,normal.y,normal.z);
  }
  const colors=new Float32Array(p.count*3);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<p.count;i+=3){
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
    normal.copy(a).add(b).add(c).normalize();
    const biome=biomeAt(normal),palette=PALETTE[biome];
    const color=new THREE.Color(palette[Math.floor(random()*palette.length)]);
    color.lerp(new THREE.Color(palette[0]),.83);
    const shade=.992+random()*.014;color.multiplyScalar(shade);
    for(let k=0;k<3;k++){colors[(i+k)*3]=color.r;colors[(i+k)*3+1]=color.g;colors[(i+k)*3+2]=color.b;}
  }
  terrainGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const groundNormals=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){normal.fromBufferAttribute(p,i).normalize();groundNormals[i*3]=normal.x;groundNormals[i*3+1]=normal.y;groundNormals[i*3+2]=normal.z;}
  terrainGeometry.setAttribute('normal',new THREE.BufferAttribute(groundNormals,3));
  const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,flatShading:false});
  terrainMaterial.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMeadowPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMeadowPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vMeadowPosition;
      float groundHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float broad=.5+.5*sin(vMeadowPosition.x*6.4+vMeadowPosition.z*3.1)*sin(vMeadowPosition.y*7.1-vMeadowPosition.x*2.0);
      float fine=groundHash(floor(vMeadowPosition*118.0));
      float fleck=smoothstep(.966,1.0,fine)*.062;
      diffuseColor.rgb*=.99+(broad-.5)*.027+(fine-.5)*.012-fleck;
    `);
  };
  terrainMaterial.customProgramCacheKey=()=> 'little-planet-handpainted-ground-v2';
  const terrain=new THREE.Mesh(terrainGeometry,terrainMaterial);
  terrain.receiveShadow=true;terrain.castShadow=true;scene.add(terrain);

  // The forest clearing is deliberately composed rather than randomly scattered.
  structure(()=>M.cabin(1.05),3,10,{yaw:-.13,radius:.98,collision:.59});
  structure(M.tent,8,-11,{yaw:-.27,radius:.72,collision:.35});
  structure(M.fire,16,-8,{radius:.7,collision:.24});
  structure(M.logSeat,20,-10,{yaw:.35,radius:.24,collision:0});
  structure(M.logSeat,13,-12,{yaw:1.35,radius:.27,collision:0});
  structure(M.crate,8,-5,{yaw:.5,radius:.28,collision:.17});
  place(M.mushroom(),5,4);place(M.mushroom(),6.3,4.5,0,.7);
  for(const [lon,lat,s] of [[7,31,.97],[15,34,1.11],[23,31,.84],[12,39,.85]])structure(()=>M.mountain(s),lon,lat,{radius:.87*s,collision:.52*s,yaw:lon*.13});
  const forestPines=[[-6,21,1.1],[-7,11,.97],[-9,1,1.12],[-6,-14,1.0],[0,-21,1.02],[9,-26,.86],[21,-24,1.0],[32,-26,1.08],[38,-15,1.04],[39,-3,.90],[35,7,1.12],[33,18,1.1],[29,25,1.0],[-2,31,1.0],[-6,39,.94]];
  forestPines.forEach(([lon,lat,s])=>{place(M.pine(s),lon,lat,random()*6);reserve(lon,lat,.23);});

  // A continuous turquoise ribbon, following the curvature of the planet.
  const riverNodes=[[19,29],[20,23],[18.7,16],[22,8],[21,-1],[24,-10],[23,-18],[26.8,-25.4],[28,-27.4],[29,shoreLatitude(29)-.8]];
  const riverCurve=new THREE.CatmullRomCurve3(riverNodes.map(([lon,lat])=>new THREE.Vector3(lon,lat,0)));
  const riverNormals=[];
  for(let i=0;i<=180;i++){const p=riverCurve.getPoint(i/180);riverNormals.push(direction(p.x,p.y));}
  function ribbon(width,offset,color) {
    const vertices=[],indices=[];
    for(let i=0;i<riverNormals.length;i++){
      const n=riverNormals[i], prev=riverNormals[Math.max(0,i-1)],next=riverNormals[Math.min(riverNormals.length-1,i+1)];
      const tangent=next.clone().sub(prev).normalize(),side=new THREE.Vector3().crossVectors(n,tangent).normalize();
      for(const sign of [-1,1]){const v=n.clone().multiplyScalar(R).addScaledVector(side,sign*width/2+offset).normalize();v.multiplyScalar(R+elevation(v)+.036);vertices.push(v.x,v.y,v.z);}
      if(i<riverNormals.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.Mesh(g,M.material(color,{side:THREE.DoubleSide,roughness:.6,emissive:color,emissiveIntensity:.08}));m.receiveShadow=true;scene.add(m);return m;
  }
  ribbon(.28,0,'#4ebfae');ribbon(.062,-.055,'#9ce4c8');
  structure(M.bridge,23,-10,{yaw:Math.PI/2+.16,radius:.63,collision:0});
  for(const [lon,lat] of [[18,24],[24,14],[18,7],[26,-2],[20,-15],[27,-21]])place(M.rock(.12,'#a4b99b'),lon,lat);

  // A small working farm on the sunny side of the forest.
  structure(M.windmill,-36,12,{yaw:.3,radius:.8,collision:.34});
  structure(()=>M.cabin(.85,true),-47,17,{yaw:.48,radius:.9,collision:.49});
  structure(M.cropPatch,-37,-4,{yaw:.18,radius:.77,collision:0});
  structure(M.cropPatch,-46,-2,{yaw:.2,scale:.82,radius:.77,collision:0});
  for(const [lon,lat,yaw,len] of [[-49,-14,.2,1.1],[-37,-14,.15,1.0],[-55,4,1.55,.9],[-32,2,1.7,.7],[-46,26,.2,1.1]])place(M.fence(len,true),lon,lat,yaw);
  structure(M.crate,-33,7,{yaw:.2,radius:.25,collision:0});
  for(const [lon,lat] of [[-54,20],[-58,9],[-59,-3],[-54,-22],[-30,31],[-28,21],[-22,-15]])place(M.broadTree(.75+random()*.25),lon,lat,random()*6);
  for(let i=0;i<7;i++){
    const hay=new THREE.Group();M.cyl(hay,'#d3bd61',0,.09,0,.075,.36,0,0,Math.PI/2);M.cyl(hay,'#a99349',-.06,.09,0,.078,.025,0,0,Math.PI/2);M.cyl(hay,'#a99349',.06,.09,0,.078,.025,0,0,Math.PI/2);
    place(hay,-46+i*1.8,31+Math.sin(i)*1.8,Math.PI*.4);reserve(-46+i*1.8,31,.15);
  }

  // Tall, chiseled crystals give the icy cap its distinctive silhouette.
  for(const [lon,lat,s,lean] of [[-27,73,1.06,-.12],[-13,76,1.22,.15],[0,78,1.33,-.10],[14,77,1.22,.12],[31,76,1.25,.1],[45,75,.95,-.08],[-37,63,.75,-.23],[42,65,.88,.10]]){
    const crystal=M.crystal(s);crystal.children[0].rotation.z=lean;place(crystal,lon,lat,random()*3);reserve(lon,lat,.35);
    place(M.crystal(s*.65),lon+6,lat-3,random()*4);
  }
  structure(M.igloo,-20,55,{yaw:.2,radius:.6,collision:.32});
  const iceShrine=new THREE.Group();M.cyl(iceShrine,'#a7cfc0',0,.07,0,.33,.14);iceShrine.add(M.crystal(.69));
  structure(()=>iceShrine,12,65,{radius:.6,collision:.23});
  for(const [lon,lat] of [[-46,51],[43,53],[-31,50],[36,51]])place(M.pine(.6,true),lon,lat,random()*5);

  // Sandstone towers, an ancient dial and scattered cacti.
  structure(M.desertArch,70,31,{yaw:-.7,radius:.85,collision:.6});
  structure(()=>M.sandstone(1.62),58,34,{yaw:.2,radius:.44,collision:.19});
  structure(()=>M.sandstone(1.14),61,30,{yaw:.2,radius:.4,collision:.19});
  structure(M.sundial,74,17,{radius:.61,collision:.22});
  structure(()=>M.tent(),88,6,{yaw:1.0,scale:.85,radius:.68,collision:.31});
  for(const [lon,lat] of [[55,14],[59,5],[86,28],[96,14],[103,31],[96,3],[72,4]])place(M.cactus(.74+random()*.35),lon,lat,random()*5);
  for(const [lon,lat] of [[83,24],[89,23],[97,26]])place(M.sandstone(.38+random()*.2),lon,lat,random()*3,.8);

  // The coast is all bent palms, soft sand and little wooden jetties.
  for(const [lon,lat] of [[59,-9],[58,-20],[60,-30],[70,-29],[78,-35],[86,-34],[99,-30],[106,-24],[105,-11],[91,-12],[75,-14],[84,-6]])place(M.palm(.82+random()*.25),lon,lat,random()*6);
  structure(M.dock,88,-26,{yaw:.17,radius:.85,collision:0});
  const shell=new THREE.Group();
  for(let i=0;i<7;i++){const a=(i/6-.5)*2.2;M.beam(shell,[0,.06,0],[Math.sin(a)*.18,.08,Math.cos(a)*.20],.034,i%2?'#ead7a6':'#d4b584');}
  structure(()=>shell,88,-24,{radius:.3,collision:0});
  structure(()=>M.cabin(.73),108,-19,{yaw:-.6,radius:.74,collision:.40});
  const boat1=place(M.boat(),93,-44,.4,.95,scene);dynamicRoots.push(boat1);
  const boat2=place(M.boat(),-31,-48,-.6,.8,scene);dynamicRoots.push(boat2);

  // On the far side, a quiet volcano glows in the dark soil.
  structure(M.volcano,-105,34,{yaw:.2,radius:1.25,collision:.82});
  structure(M.tent,-117,16,{yaw:-.7,radius:.78,collision:.34});
  structure(M.fire,-114,8,{radius:.48,collision:.23});
  const emberMarker=new THREE.Group();M.ico(emberMarker,'#747963',0,.13,0,.20,.23,.18);M.mesh(emberMarker,M.geo.octa,M.material('#e9b46b',{emissive:'#e47c36',emissiveIntensity:.45}),0,.38,0,.075,.13,.075);
  structure(()=>emberMarker,-107,14,{radius:.5,collision:.18});
  for(const [lon,lat] of [[-85,17],[-92,34],[-127,27],[-130,7],[-91,-4]])place(M.palm(.7),lon,lat,random()*6);
  for(const [lon,lat] of [[-120,-2],[-96,9]]){
    const dead=new THREE.Group();M.cyl(dead,'#877954',0,.3,0,.035,.6);M.beam(dead,[0,.24,0],[.15,.39,.04],.02,'#94835a');M.beam(dead,[0,.42,0],[-.17,.60,0],.016,'#94835a');place(dead,lon,lat,random()*5);
  }

  // A seventh, quieter corner: a weathered observatory and old stone arches.
  structure(M.telescope,164,13,{yaw:.4,radius:.65,collision:.28});
  structure(()=>M.cabin(.8),150,22,{yaw:-.3,radius:.8,collision:.47});
  structure(()=>M.mountain(1.1),177,34,{radius:.9,collision:.58});
  structure(()=>M.mountain(.8),158,37,{radius:.9,collision:.45});
  const ruins=new THREE.Group();
  for(const x of [-.28,.28]){M.box(ruins,'#abb092',x,.38,0,.15,.74,.20);M.box(ruins,'#c0c2a2',x,.79,0,.20,.12,.23);}
  M.box(ruins,'#b7bb9b',0,.92,0,.83,.15,.24,0,0,.045);
  structure(()=>ruins,171,4,{yaw:-.4,radius:.68,collision:.4});

  decorateLandscape({scene,models:M,place,reserve,direction,groundPoint,elevation,biomeAt,R,shoreline:shoreLatitude});

  // Warm stepping stones tie all seven neighborhoods together.
  const routeStops=[REGIONS[0],REGIONS[1],REGIONS[5],REGIONS[6],REGIONS[4],REGIONS[3],REGIONS[2],REGIONS[0]];
  for(let segment=0;segment<routeStops.length-1;segment++){
    const a=direction(routeStops[segment].lon,routeStops[segment].lat),b=direction(routeStops[segment+1].lon,routeStops[segment+1].lat);
    const angle=a.angleTo(b),steps=Math.ceil(angle*R/.17),axis=new THREE.Vector3().crossVectors(a,b).normalize();
    for(let j=0;j<=steps;j++){
      const t=j/steps,n=a.clone().applyAxisAngle(axis,angle*t);
      const side=new THREE.Vector3().crossVectors(n,axis).normalize();
      n.addScaledVector(side,Math.sin(t*Math.PI*3+segment)*.022*Math.sin(t*Math.PI)).normalize();
      if(biomeAt(n)==='water')continue;
      routes.push(n.clone());
      if(isReserved(n,.08))continue;
      const {lon,lat}=coordinates(n);const stone=M.rock(.038+random()*.012,biomeAt(n)==='snow'?'#accbb0':'#dace8c');
      stone.scale.y=.28;place(stone,lon,lat,random()*6);
    }
  }

  const nearRiver = n=>riverNormals.some(p=>p.distanceTo(n)*R<.33);
  const nearPath = n=>routes.some(p=>p.distanceTo(n)*R<.20);
  // Deterministically seeded vegetation keeps paths and clearings readable.
  for(let i=0;i<1150;i++){
    const lon=random()*360-180,lat=Math.asin(random()*1.72-.86)/DEG;
    const n=direction(lon,lat),biome=biomeAt(n);
    if(isReserved(n,.13)||nearPath(n)||(biome==='forest'&&nearRiver(n)))continue;
    if(biome==='forest'&&random()<.35)place(M.pine(.60+random()*.45),lon,lat,random()*6);
    else if(biome==='meadow'&&random()<.17)place(M.broadTree(.62+random()*.34),lon,lat,random()*6);
    else if(biome==='highlands'&&random()<.43)place(random()>.45?M.pine(.72+random()*.24):M.broadTree(.7),lon,lat,random()*6);
    else if(biome==='volcano'&&random()<.65)place(M.rock(.045+random()*.12,'#434e3c'),lon,lat,random()*6);
    else if(biome==='desert'&&random()<.2)place(M.cactus(.6+random()*.5),lon,lat,random()*6);
    else if(biome==='desert'&&random()<.35)place(M.rock(.05+random()*.10,'#cda554'),lon,lat,random()*6);
    else if(biome==='snow'&&random()<.45)place(M.crystal(.09+random()*.14),lon,lat,random()*6);
    else if(biome==='coast'&&random()<.32)place(M.palm(.65+random()*.30),lon,lat,random()*6);
  }
  for(let i=0;i<780;i++){
    const lon=random()*360-180,lat=random()*95-40,n=direction(lon,lat),biome=biomeAt(n);
    if(isReserved(n,.03)||nearPath(n)||(biome==='forest'&&nearRiver(n)))continue;
    if(biome==='forest'||biome==='meadow'||biome==='highlands'){
      if(random()<.36)place(M.flower(random()>.3?'#e4dfab':'#e5bfa0'),lon,lat,random()*6,.7+random()*.4);
      else if(random()<.10&&biome==='forest')place(M.mushroom(),lon,lat,random()*6,.6+random()*.5);
      else place(M.grass(biome==='meadow'?'#94b056':'#4c873f'),lon,lat,random()*6);
    }
  }
  for(const [lon,lat] of [[11,0],[10,1],[10.7,2],[12,1.1],[30,-3],[31,-3.5],[29,-2.5],[24,23]])place(M.flower(),lon,lat,random()*5,1.0);

  // Ocean flecks are polygonal rather than a photographic water texture.
  const waveMaterial=M.material('#6bad9f',{transparent:true,opacity:.40,depthWrite:false});waveMaterial.userData.noShadow=true;
  for(let i=0;i<240;i++){
    const lon=random()*360-180,lat=-27-random()*49,n=direction(lon,lat);
    if(biomeAt(n)!=='water')continue;
    const wave=new THREE.Group();M.box(wave,waveMaterial,0,.026,0,.10+random()*.17,.003,.016);
    place(wave,lon,lat,random()*.4);
  }

  // The inhabitants each keep to their own little patch of the world.
  const animalSpots=[['fox',31,-2],['fox',1,-15],['fox',28,18],['rabbit',8,-3],['rabbit',-2,-5],['sheep',-42,-16],['sheep',-48,-15],['sheep',-36,-21],['sheep',-51,-20],['sheep',-30,21]];
  animalSpots.forEach(([kind,lon,lat],i)=>{
    const animal=M.animal(kind);animal.root.traverse(o=>{if(o.isMesh)o.castShadow=false;});scene.add(animal.root);animal.home=direction(lon,lat);animal.phase=i*2.37;animal.radius=kind==='fox'?.24:.14;animals.push(animal);
  });

  const cloudSpots=[[-69,20,7.6],[-80,-12,7.5],[-39,-47,7.4],[40,-51,7.6],[81,15,7.9],[75,44,7.7],[-24,39,7.3],[23,70,7.8],[-116,51,7.6],[145,21,7.7],[175,-21,7.7],[-159,-35,7.6],[-10,-69,7.8]];
  cloudSpots.forEach(([lon,lat,radius],i)=>{
    const g=M.cloud();g.scale.setScalar(.66+random()*.35);g.quaternion.setFromUnitVectors(UP,direction(lon,lat));scene.add(g);clouds.push({root:g,lon,lat,radius,phase:i*1.7});
  });

  // Each small wonder has a single modest glint in the world.
  REGIONS.forEach((region,index)=>{
    const root=new THREE.Group(),n=direction(region.lon,region.lat);
    root.position.copy(groundPoint(n));root.quaternion.setFromUnitVectors(UP,n);scene.add(root);
    const mat=M.material('#f0d99a',{emissive:'#eed393',emissiveIntensity:.35});
    const gem=M.mesh(root,M.geo.octa,mat,0,.65,0,.055,.089,.055);gem.castShadow=false;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.14,.004,4,28),new THREE.MeshBasicMaterial({color:'#e8d99d',transparent:true,opacity:.6}));ring.rotation.x=Math.PI/2;ring.position.y=.052;root.add(ring);
    wonders.push({...region,n,root,gem,ring,found:false,index});
  });

  // Extract moving parts before batching the rest into instanced meshes.
  staticRoot.updateMatrixWorld(true);
  function findDynamics(obj) {
    for(const child of [...obj.children]){
      if(child.userData.dynamicRoot){const matrix=child.matrixWorld.clone();child.removeFromParent();scene.add(child);matrix.decompose(child.position,child.quaternion,child.scale);dynamicRoots.push(child);}
      else findDynamics(child);
    }
  }
  findDynamics(staticRoot);
  dynamicRoots.forEach(root=>root.traverse(o=>{if(o.isMesh)o.castShadow=false;}));
  staticRoot.updateMatrixWorld(true);
  const batches=new Map();
  staticRoot.traverse(obj=>{
    if(!obj.isMesh)return;
    const m=obj.material;
    const signature=[obj.geometry.uuid,m.type,m.roughness,m.metalness,m.flatShading,m.vertexColors,m.side,m.emissive?.getHex(),m.emissiveIntensity,m.transparent,m.opacity,m.depthWrite,m.blending,m.map?.uuid,m.alphaMap?.uuid,!!m.userData.noShadow].join('|');
    if(!batches.has(signature)){
      const shared=m.clone();shared.color?.set(0xffffff);
      batches.set(signature,{geometry:obj.geometry,material:shared,matrices:[],colors:[]});
    }
    const batch=batches.get(signature);
    batch.matrices.push(obj.matrixWorld.clone());batch.colors.push(m.color?.clone()||new THREE.Color(0xffffff));
  });
  for(const batch of batches.values()){
    const instance=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
    batch.matrices.forEach((m,i)=>{instance.setMatrixAt(i,m);instance.setColorAt(i,batch.colors[i]);});
    instance.instanceMatrix.needsUpdate=true;instance.instanceColor.needsUpdate=true;
    instance.castShadow=!batch.material.userData.noShadow;instance.receiveShadow=!batch.material.userData.noShadow;
    instance.computeBoundingSphere();scene.add(instance);
  }
  scene.remove(staticRoot);

  // A short-lived constellation of sparks celebrates an interaction.
  const sparkCount=35;
  const sparkGeo=new THREE.SphereGeometry(.018,5,4);
  const sparkMat=new THREE.MeshBasicMaterial({color:'#ffe8a8',transparent:true,opacity:1});
  const sparks=new THREE.InstancedMesh(sparkGeo,sparkMat,sparkCount);sparks.visible=false;sparks.frustumCulled=false;scene.add(sparks);
  const sparkVelocity=Array.from({length:sparkCount},()=>new THREE.Vector3((random()-.5)*1.4,.6+random()*1.2,(random()-.5)*1.4));
  const sparkOrigin=new THREE.Vector3(),sparkQuat=new THREE.Quaternion(),tempObject=new THREE.Object3D();

  const rippleMat=new THREE.MeshBasicMaterial({color:'#c5f0d3',transparent:true,opacity:.48,depthWrite:false});
  const ripples=new THREE.InstancedMesh(new THREE.BoxGeometry(.043,.008,.09),rippleMat,16);ripples.frustumCulled=false;scene.add(ripples);
  const tempV=new THREE.Vector3(), north=new THREE.Vector3(),east=new THREE.Vector3(),forward=new THREE.Vector3(),basis=new THREE.Matrix4();

  function celebrateAt(n,t){
    burstTime=t;sparkOrigin.copy(groundPoint(n,.2));sparkQuat.setFromUnitVectors(UP,n);sparks.visible=true;
  }
  function interact(index,t) {
    const w=wonders[index];w.found=true;celebrateAt(w.n,t);
  }
  function animate(t,dt) {
    M.animate(t,dt,Math.max(0,1-(t-burstTime)));
    clouds.forEach(cloud=>{
      const n=direction(cloud.lon+t*.16,cloud.lat+Math.sin(t*.16+cloud.phase)*1.2);
      cloud.root.position.copy(n).multiplyScalar(cloud.radius+Math.sin(t*.35+cloud.phase)*.035);
      cloud.root.quaternion.setFromUnitVectors(UP,n);
    });
    animals.forEach(animal=>{
      const a=t*(animal.kind==='fox'?.27:.17)+animal.phase;
      north.set(0,1,0).addScaledVector(animal.home,-animal.home.y).normalize();east.crossVectors(north,animal.home).normalize();
      const n=animal.home.clone().addScaledVector(east,Math.sin(a)*animal.radius/R).addScaledVector(north,Math.cos(a)*animal.radius*.7/R).normalize();
      forward.copy(east).multiplyScalar(Math.cos(a)).addScaledVector(north,-Math.sin(a)*.7).normalize();
      tempV.crossVectors(n,forward).normalize();forward.crossVectors(tempV,n).normalize();basis.makeBasis(tempV,n,forward);
      animal.root.position.copy(groundPoint(n,.015));animal.root.quaternion.setFromRotationMatrix(basis);
      animal.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(t*5+animal.phase+(i%2)*Math.PI)*.16);
      animal.tail.rotation.y=Math.sin(t*2.2+animal.phase)*.14;
      if(animal.kind==='rabbit')animal.root.position.addScaledVector(n,Math.max(0,Math.sin(t*2+animal.phase))*.032);
    });
    wonders.forEach((w,i)=>{
      w.gem.visible=!w.found;w.gem.position.y=.62+Math.sin(t*1.8+i)*.035;w.gem.rotation.y=t*.9;w.gem.rotation.z=Math.sin(t*.7+i)*.15;
      w.ring.material.opacity=w.found?.30:.42+Math.sin(t*2+i)*.15;
    });
    for(let i=0;i<16;i++){
      const f=(i/16+t*.020)%1,idx=Math.min(riverNormals.length-2,Math.floor(f*(riverNormals.length-1)));
      const n=riverNormals[idx];tempObject.position.copy(groundPoint(n,.054));
      forward.copy(riverNormals[idx+1]).sub(n).normalize();east.crossVectors(n,forward).normalize();forward.crossVectors(east,n).normalize();basis.makeBasis(east,n,forward);
      tempObject.quaternion.setFromRotationMatrix(basis);tempObject.scale.setScalar(.75+Math.sin(i*5)*.25);tempObject.updateMatrix();ripples.setMatrixAt(i,tempObject.matrix);
    }
    ripples.instanceMatrix.needsUpdate=true;
    const age=t-burstTime;
    if(age>=0&&age<2.2){
      sparkMat.opacity=Math.max(0,1-age/2.2);
      for(let i=0;i<sparkCount;i++){
        tempV.copy(sparkVelocity[i]).multiplyScalar(age);tempV.y-=age*age*.32;tempV.applyQuaternion(sparkQuat).add(sparkOrigin);
        tempObject.position.copy(tempV);tempObject.quaternion.identity();tempObject.scale.setScalar(1-age/2.8);tempObject.updateMatrix();sparks.setMatrixAt(i,tempObject.matrix);
      }sparks.instanceMatrix.needsUpdate=true;
    }else sparks.visible=false;
    boat1.position.copy(groundPoint(direction(93,-44),.06+Math.sin(t)*.025));boat2.position.copy(groundPoint(direction(-31,-48),.06+Math.sin(t*.9)*.025));
  }
  return {terrain,models:M,colliders,wonders,startDirection,animate,interact,celebrateAt,regions:REGIONS};
}
