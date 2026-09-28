import * as THREE from 'three';

export function decorateLandscape({ scene, models:M, place, reserve, direction, groundPoint, elevation, biomeAt, R, shoreline }) {
  const PI=Math.PI;
  const pathNormals=[];

  function pathRibbon(nodes, width, color, { closed=false, reserveTrees=true, height=.031, opacity=1 }={}) {
    const curve=new THREE.CatmullRomCurve3(nodes.map(([lon,lat])=>new THREE.Vector3(lon,lat,0)),closed,'catmullrom',.35);
    const normals=[],positions=[],indices=[];
    const segments=closed?180:150;
    for(let i=0;i<=segments;i++){
      const p=curve.getPoint(i/segments);const n=direction(p.x,p.y);normals.push(n);
      if(reserveTrees&&i%6===0)reserve(p.x,p.y,width*.62);
    }
    for(let i=0;i<=segments;i++){
      const n=normals[i], tangent=normals[Math.min(segments,i+1)].clone().sub(normals[Math.max(0,i-1)]).normalize();
      const lateral=new THREE.Vector3().crossVectors(n,tangent).normalize();
      const organic=1+Math.sin(i*.16)*.045+Math.sin(i*.39)*.018;
      for(const sign of [-1,1]){
        const p=n.clone().multiplyScalar(R).addScaledVector(lateral,sign*width*.5*organic).normalize();
        p.multiplyScalar(R+elevation(p)+height);positions.push(p.x,p.y,p.z);
      }
      if(i<segments){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=M.material(color,{side:THREE.DoubleSide,roughness:1,transparent:opacity<1,opacity,depthWrite:opacity===1});
    const road=new THREE.Mesh(geometry,material);road.receiveShadow=true;scene.add(road);
    pathNormals.push(...normals);return normals;
  }

  // Broad footpaths give the clearings a readable, lived-in composition.
  const forestPath=[[3.3,2.6],[3.5,-1.8],[7,-3.9],[11.2,-4.1],[15,-6.0],[18.3,-9.1],[21.2,-10.0],[25.1,-10.0],[29,-13.0]];
  pathRibbon(forestPath,.44,'#b8aa69',{height:.027});
  pathRibbon(forestPath,.40,'#cebd7b',{height:.033,reserveTrees:false});
  pathRibbon([[7,-4.1],[6.8,-7.4],[8.6,-11.5],[11.2,-14.0]],.27,'#c4b171');
  const farmPath=[[-47,10.6],[-42.1,8.2],[-35.6,8.0],[-32.7,5.3],[-36.8,2.0],[-43.9,3.7],[-48.6,7.4]];
  pathRibbon(farmPath,.31,'#d3bd72',{closed:true,height:.032});
  pathRibbon([[-109,14],[-114,13],[-118,15.7]],.24,'#8c8157');
  pathRibbon([[164,13],[162,16.5],[158,18.5],[151,17.0]],.24,'#c1bd8c');

  // A thin wet edge makes the ocean read as a separate, rounded layer.
  const shoreColors={forest:'#94a764',meadow:'#b8bd76',coast:'#ddc389',desert:'#d6b97a',snow:'#ccdbbc',volcano:'#778365',highlands:'#a1ae7c',water:'#9bb784'};
  function coastRibbon(distance,width,foam=false){
    const vertices=[],colors=[],indices=[],segments=420;
    for(let i=0;i<=segments;i++){
      const lon=i/segments*360-180,lat=shoreline(lon)+distance;
      const n=direction(lon,lat),next=direction(lon+.15,shoreline(lon+.15)+distance),tangent=next.sub(n).normalize(),side=new THREE.Vector3().crossVectors(n,tangent).normalize();
      const biome=biomeAt(direction(lon,shoreline(lon)+2));
      const color=new THREE.Color(foam?'#7db8a9':shoreColors[biome]||shoreColors.forest);
      for(const sign of [-1,1]){
        const p=n.clone().multiplyScalar(R).addScaledVector(side,sign*width/2).normalize();
        p.multiplyScalar(foam?R-.007:R+.043);vertices.push(p.x,p.y,p.z);colors.push(color.r,color.g,color.b);
      }
      if(i<segments){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    const mat=M.material('#ffffff',{vertexColors:true,side:THREE.DoubleSide,roughness:.95,transparent:foam,opacity:foam?.56:1,depthWrite:!foam});
    const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=!foam;scene.add(mesh);
  }
  coastRibbon(.58,.10);coastRibbon(-1.15,.06,true);

  // Details are grouped around buildings and paths, not spread uniformly.
  place(M.lanternPost(),7.0,1.8,-.30,.85);reserve(7.0,1.8,.13);
  place(M.signpost(),-.5,2.0,-.28,.90);reserve(-.5,2.0,.15);
  place(M.signpost(),-21,-7.8,-.60,.8);
  place(M.signpost(),64,12,.7,.9);
  place(M.signpost(),1,53,-.1,.75);
  place(M.barrel(),-3.1,8.7,.25,.95);
  place(M.logPile(),21.0,-6.4,.4,.70);
  place(M.lanternPost(),11,-12.4,.5,.67);
  place(M.tractor(),-39.8,12.7,1.6,.92);reserve(-39.8,12.7,.38);
  place(M.hayCart(),-46.8,7.8,-.18,.83);reserve(-46.8,7.8,.33);
  place(M.barrel(),-50.8,12.9,-.3);
  place(M.barrel(),-51.7,14.2,.3,.8);
  place(M.signpost(),-30,9.4,1.25,.8);
  place(M.lanternPost(),110,-21.7,.8,.83);
  place(M.logPile(),-116.6,11,.2,.8);

  const fernSpots=[[-6,7],[-5,6],[-5.5,4.8],[-2,13],[26,22],[28,22],[26,20.5],[32,-1],[32,-2.5],[-.5,-17],[2,-19],[33,-22],[13,-18],[10,-19],[145,18],[154,5]];
  fernSpots.forEach(([lon,lat],i)=>place(M.fern(.7+(i%4)*.12),lon,lat,i*1.37));
  for(const [lon,lat] of [[2,23],[3,23.8],[5,22.9],[25,26],[26,25],[27,24.2],[-6,-20],[30,-22]]){
    place(M.rock(.11,'#7f9474'),lon,lat,lon*.3);
  }
  // River-bank planting is kept low so the turquoise water remains visible.
  for(const [lon,lat] of [[17.0,15],[17.6,14],[20.0,7],[19.6,5.8],[25,-3],[26,-3.8],[20,-16],[20.5,-17]]){
    place(M.grass('#78a262'),lon,lat,.7,1.15);
    place(M.fern(.58),lon+.6,lat-.5,1.3);
  }
  // Small flower clusters instead of a uniform dotted lawn.
  const flowerClusters=[[10.2,.6],[6.7,4],[-4.8,5.5],[-27,16.2],[-24.3,20],[-51,21],[31.4,-5.2],[15.2,-18.8],[159,15.9]];
  flowerClusters.forEach(([lon,lat],i)=>{
    for(let j=0;j<5;j++){
      const a=j/5*PI*2+.37*i,r=.55+(j%2)*.35;
      place(M.flower(i%3===1?'#dbc580':'#e1e0b3'),lon+Math.cos(a)*r,lat+Math.sin(a)*r,a,.70+(j%3)*.10);
    }
  });

  // Pebbles and pale shells give the nearest shore a little tactile detail.
  for(let i=0;i<35;i++){
    const lon=-63+i*4.8,lat=shoreline(lon)+1.0+Math.sin(i*2.3)*.35;
    if(i%3===0)place(M.rock(.045,'#c4c59e'),lon,lat,i,.75);
    if(i%5===1){
      const shell=new THREE.Group();
      for(let j=0;j<4;j++)M.beam(shell,[0,.01,0],[Math.sin((j-1.5)*.6)*.047,.014,Math.cos((j-1.5)*.6)*.06],.009,'#d7d7b7');
      place(shell,lon+1.2,lat-.1,i*.4);
    }
  }
  return {pathNormals};
}
