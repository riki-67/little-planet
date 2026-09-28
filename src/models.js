import * as THREE from 'three';

const PI = Math.PI;
export function createModels(random) {
  const materialCache = new Map();
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cone: new THREE.ConeGeometry(1, 1, 5),
    cone6: new THREE.ConeGeometry(1, 1, 6),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 7),
    ico: new THREE.IcosahedronGeometry(1, 0),
    soft: new THREE.IcosahedronGeometry(1, 1),
    ball: new THREE.SphereGeometry(1, 9, 6),
    octa: new THREE.OctahedronGeometry(1),
    ring: new THREE.TorusGeometry(1, .07, 4, 32)
  };
  const rotors = [], fires = [], smoke = [], lava = [];
  function material(color, extras = {}) {
    const key = String(color) + JSON.stringify(extras);
    if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, ...extras }));
    return materialCache.get(key);
  }
  function mesh(parent, geometry, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geometry, typeof color === 'object' ? color : material(color));
    m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.rotation.set(rx,ry,rz);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (p,c,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0) => mesh(p,geo.box,c,x,y,z,sx,sy,sz,rx,ry,rz);
  const ico = (p,c,x,y,z,sx,sy= sx,sz=sx) => mesh(p,geo.ico,c,x,y,z,sx,sy,sz);
  const soft = (p,c,x,y,z,sx,sy=sx,sz=sx) => mesh(p,geo.soft,c,x,y,z,sx,sy,sz);
  const cyl = (p,c,x,y,z,r,h,rx=0,ry=0,rz=0) => mesh(p,geo.cylinder,c,x,y,z,r,h,r,rx,ry,rz);
  function beam(parent, a, b, radius, color) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const m = mesh(parent, geo.cylinder, color);
    m.position.copy(from).add(to).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), to.clone().sub(from).normalize());
    m.scale.set(radius, from.distanceTo(to), radius); return m;
  }
  function dynamic(group) { group.userData.dynamicRoot = true; return group; }
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext('2d'); const grad = ctx.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(10,28,18,.5)');grad.addColorStop(.4,'rgba(10,28,18,.27)');grad.addColorStop(1,'rgba(10,28,18,0)');
  ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent:true, depthWrite:false, opacity:.64 });
  shadowMaterial.userData.noShadow = true;
  const shadowGeometry = new THREE.PlaneGeometry(1,1);
  function shadow(parent, w=.9, d=w) { const s=mesh(parent,shadowGeometry,shadowMaterial,0,.018,0,w,d,1,-PI/2);s.castShadow=false;return s; }
  function group() { return new THREE.Group(); }

  const roofGeometry = (() => {
    const g = new THREE.BufferGeometry();
    const p = [
      -.5,0,.5, .5,0,.5, 0,1,.5,
      .5,0,-.5, -.5,0,-.5, 0,1,-.5,
      -.5,0,-.5, -.5,0,.5, 0,1,.5, -.5,0,-.5, 0,1,.5, 0,1,-.5,
      .5,0,.5, .5,0,-.5, 0,1,-.5, .5,0,.5, 0,1,-.5, 0,1,.5,
      -.5,0,.5, -.5,0,-.5, .5,0,-.5, -.5,0,.5, .5,0,-.5, .5,0,.5
    ]; g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
  })();
  const leafGeometry = (() => {
    const g=new THREE.BufferGeometry();
    const p=[0,0,0, -.11,.16,.26, 0,.20,.40, 0,0,0, 0,.20,.40, .11,.16,.26,
      -.11,.16,.26,0,-.12,.7,0,.20,.40, 0,.20,.40,0,-.12,.7,.11,.16,.26];
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
  })();
  const crystalGeometry = (() => {
    const g=new THREE.BufferGeometry(),p=[],colors=[];
    const palette = ['#80c6c5','#68b1b1','#539da4','#8bd3c5','#69b8b5','#42959a'].map(c=>new THREE.Color(c));
    const n=5;
    for(let i=0;i<n;i++){
      const a=i/n*PI*2,b=(i+1)/n*PI*2;
      const v0=[Math.sin(a)*.16,0,Math.cos(a)*.16],v1=[Math.sin(b)*.16,0,Math.cos(b)*.16];
      const v2=[Math.sin(a)*.18,.84,Math.cos(a)*.18],v3=[Math.sin(b)*.18,.84,Math.cos(b)*.18], tip=[.035,1.13,-.015];
      [v0,v1,v2,v1,v3,v2,v2,v3,tip].forEach(v=>{p.push(...v);const c=palette[i];colors.push(c.r,c.g,c.b);});
    }
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  })();
  const crystalMat=material('#ffffff',{vertexColors:true,roughness:.55,metalness:.05});

  function pine(scale=1, snow=false) {
    const g=group();shadow(g,.75,.72);
    cyl(g,'#69563b',0,.25,0,.047,.5);
    const greens=snow?['#75a69a','#92b8a2','#bed5b5']:['#286c44','#358047','#44954b','#23603f'];
    const tint=greens[Math.floor(random()*greens.length)];
    mesh(g,geo.cone,tint,0,.56,0,.39,.83,.36,0,random()*2,0);
    mesh(g,geo.cone,snow?'#acd1b4':'#3c8648',.015,.86,0,.30,.72,.29,0,.24,0);
    mesh(g,geo.cone,snow?'#d8e5c4':'#488e47',.005,1.1,0,.20,.55,.20,0,.6,0);
    g.scale.setScalar(scale);return g;
  }
  function broadTree(scale=1, autumn=false) {
    const g=group();shadow(g,.8);
    cyl(g,'#806344',0,.32,0,.055,.65);
    beam(g,[0,.3,0],[-.16,.56,0],.024,'#806344');
    const c=autumn?'#c6af57':'#72ac4b';
    soft(g,c,0,.77,0,.33,.36,.31);soft(g,autumn?'#ddbb64':'#619a43',-.2,.66,.03,.25,.28,.26);
    soft(g,autumn?'#bfa252':'#83b74c',.21,.75,-.02,.23,.29,.25);g.scale.setScalar(scale);return g;
  }
  function rock(scale=.18, color='#89937a') {
    const g=group();shadow(g,scale*2.2,scale*1.8);const m=ico(g,color,0,scale*.43,0,scale,scale*.65,scale*.8);m.rotation.set(random(),random()*6,random()*.3);return g;
  }
  function crystal(scale=1) { const g=group();mesh(g,crystalGeometry,crystalMat);shadow(g,.45);g.scale.setScalar(scale);return g; }
  function mountain(scale=1,snow=true) {
    const g=group();shadow(g,1.55);
    mesh(g,geo.cone,'#788c76',0,.85,0,.70,1.7,.65,0,.35);
    mesh(g,geo.cone,'#607b67',-.33,.43,.16,.43,.9,.44,0,.65);
    if(snow)mesh(g,geo.cone,'#d4dfbd',0,1.50,0,.20,.42,.185,0,.35);
    g.scale.setScalar(scale);return g;
  }
  function smokePlume(parent, y, color='#dde5cf', size=.12, strength=1) {
    const root=dynamic(group());parent.add(root);
    for(let i=0;i<5;i++){
      const m=mesh(root,geo.soft,material(color,{transparent:true,opacity:.5,depthWrite:false}),0,y,0,size,size*.7,size);
      m.castShadow=false;m.material=m.material.clone();
      smoke.push({mesh:m,base:y,phase:i/5,size,strength});
    }
    return root;
  }
  function cabin(scale=1, red=false) {
    const g=group();shadow(g,1.35,1.2);
    box(g,'#6b583e',0,.07,0,1.05,.12,.79);
    box(g,red?'#ad6547':'#94703f',0,.35,0,.90,.55,.67);
    for(let i=0;i<6;i++)box(g,red?'#bd7250':'#a5844b',0,.14+i*.092,.343,.85,.018,.024);
    for(const x of [-.43,.43])for(const z of [-.33,.33])box(g,'#725432',x,.34,z,.065,.61,.07);
    const roofColor=red?'#ba6246':'#315d50';
    mesh(g,roofGeometry,roofColor,0,.62,0,1.18,.46,.91);
    const roofColors=red?['#b95d41','#c7764d','#ad563c']:['#366553','#487a62','#2e594b','#5a8869'];
    for(const side of [-1,1]) for(let row=0;row<4;row++)for(let col=0;col<5;col++){
      const t=(row+.5)/4;
      box(g,roofColors[Math.floor(random()*roofColors.length)],side*t*.589,1.089-t*.46,-.36+col*.18,.181,.018,.177,0,0,-side*Math.atan(.46/.589));
    }
    box(g,'#3c503a',.115,.31,.352,.235,.43,.042);
    box(g,'#594c30',.115,.515,.375,.28,.028,.025);
    ico(g,'#dbc477',.19,.30,.384,.015);
    const windowMat=material('#bed3ae',{emissive:'#b7c986',emissiveIntensity:.20});
    box(g,'#d3b980',-.258,.41,.37,.238,.209,.027);
    box(g,windowMat,-.258,.41,.386,.186,.157,.014);
    box(g,'#ab9765',-.258,.41,.398,.015,.177,.015);box(g,'#ab9765',-.258,.41,.398,.204,.016,.015);
    box(g,'#7c603e',0,.15,.48,1.0,.08,.34);
    for(let i=0;i<9;i++)box(g,'#b08b51',-.44+i*.11,.197,.48,.098,.015,.32);
    for(let i=0;i<3;i++)box(g,'#a18d63',.11,.10-i*.033,.70+i*.1,.35,.045,.14);
    box(g,'#7b7f64',-.28,.96,-.20,.145,.40,.17);
    box(g,'#a6af86',-.28,1.15,-.20,.19,.065,.205);
    const chimney=group();chimney.position.set(-.28,0,-.2);g.add(chimney);smokePlume(chimney,1.20,'#dce5cd',.10,.7);
    box(g,'#574a31',.35,.47,.405,.04,.075,.04);
    box(g,material('#ffe4a0',{emissive:'#ffcb65',emissiveIntensity:.5}),.35,.47,.43,.023,.044,.028);
    g.scale.setScalar(scale);return g;
  }
  function fence(length=1.2,white=false) {
    const g=group(),c=white?'#e1d6a5':'#b19c67';const segments=Math.ceil(length/.27);
    for(let i=0;i<=segments;i++){const x=-length/2+i/segments*length;box(g,c,x,.17,0,.035,.34,.04);mesh(g,geo.cone,c,x,.355,0,.033,.07,.034,0,PI/4);}
    for(const y of [.12,.25])box(g,c,0,y,0,length,.035,.028);return g;
  }
  function cropPatch() {
    const g=group();box(g,'#796140',0,.018,0,.78,.035,1.06);
    for(let row=0;row<5;row++){
      box(g,'#988056',-.31+row*.155,.035,0,.075,.04,1.04);
      for(let col=0;col<8;col++){
        const x=-.31+row*.155,z=-.45+col*.125;
        if(row<2){cyl(g,'#dbbd69',x,.16,z,.013,.22);mesh(g,geo.ico,'#e3c77b',x,.24,z,.037,.075,.035);}
        else {mesh(g,geo.cone6,'#91b752',x,.10,z,.042,.15,.042,0,random()*5);ico(g,row===4?'#da9860':'#b4c961',x,.07,z,.034,.031,.034);}
      }
    }return g;
  }
  function windmill() {
    const g=group();shadow(g,1.25);
    mesh(g,new THREE.CylinderGeometry(.19,.28,.81,8),'#d9d1a1',0,.44,0);
    mesh(g,geo.cone6,'#73886b',0,.985,0,.34,.37,.34,0,PI/6);
    box(g,'#7a6949',0,.2,.275,.13,.32,.04);
    box(g,'#a0bfac',-.13,.62,.207,.09,.10,.028);
    const wrap=dynamic(group());wrap.position.set(0,.77,.25);g.add(wrap);
    const rotor=group();wrap.add(rotor);rotors.push(rotor);
    cyl(rotor,'#795b39',0,0,.07,.06,.16,PI/2);
    for(let i=0;i<4;i++){
      const arm=group();arm.rotation.z=i*PI/2;rotor.add(arm);
      box(arm,'#9f8151',0,.34,.10,.028,.72,.025);
      box(arm,'#e8dfb5',.061,.39,.105,.145,.39,.013,0,0,-.10);
      for(let j=0;j<4;j++)box(arm,'#c5b681',.06,.25+j*.097,.118,.149,.013,.012,0,0,-.10);
    }
    return g;
  }
  function tent() {
    const g=group();shadow(g,.95);
    mesh(g,roofGeometry,'#c48741',0,.024,0,.68,.49,.76);
    mesh(g,roofGeometry,'#655334',0,.033,.387,.43,.35,.006);
    beam(g,[0,.535,-.44],[0,.535,.44],.015,'#78613c');
    for(const side of [-1,1]){
      beam(g,[0,.52,side*.37],[0,.03,side*.72],.008,'#dbc998');
      cyl(g,'#8d7447',0,.042,side*.74,.016,.1,0,0,.3);
      for(const x of [-.36,.36])cyl(g,'#c5b68c',x,.025,side*.43,.012,.06);
    }
    box(g,'#64785b',.53,.06,-.20,.24,.12,.31);
    cyl(g,'#bba36c',.54,.13,-.21,.075,.26,0,0,PI/2);
    return g;
  }
  function bridge() {
    const g=group();shadow(g,1.1,.8);
    for(let i=0;i<9;i++)box(g,i%3===0?'#c99f59':'#bb924e',0,.17,-.40+i*.10,.73,.065,.089);
    for(const x of [-.32,.32]){
      for(const z of [-.42,.42])box(g,'#7e6844',x,.31,z,.045,.60,.046);
      box(g,'#9b7d4d',x,.48,0,.042,.035,.92);box(g,'#997747',x,.31,0,.034,.03,.88);
    }
    return g;
  }
  function fire() {
    const g=group();shadow(g,.9);
    for(let i=0;i<9;i++){const a=i/9*PI*2;ico(g,i%2?'#949982':'#b5b697',Math.cos(a)*.255,.048,Math.sin(a)*.255,.072,.055,.068);}
    beam(g,[-.14,.06,-.10],[.14,.08,.10],.046,'#715134');beam(g,[.13,.08,-.12],[-.13,.1,.12],.048,'#966542');
    const wrap=dynamic(group());g.add(wrap);
    const orange=material('#ee942e',{emissive:'#ed6112',emissiveIntensity:.85});
    const yellow=material('#f5ce59',{emissive:'#f5a427',emissiveIntensity:.9});
    const flame=mesh(wrap,geo.cone6,orange,0,.24,0,.12,.32,.12,0,.2,.12);
    const inner=mesh(wrap,geo.cone,yellow,0,.205,.035,.077,.24,.075,0,.7,-.10);
    const light=new THREE.PointLight('#ffa83f',1.15,2.3,2);light.position.y=.4;wrap.add(light);
    fires.push({flame,inner,light});
    for(let i=0;i<6;i++){
      const spark=mesh(wrap,geo.octa,material('#ffdb75',{emissive:'#e89439',emissiveIntensity:.8}),0,.3,0,.013,.019,.013);
      smoke.push({mesh:spark,base:.2,phase:i/6,size:.014,strength:.5,spark:true});
    }
    return g;
  }
  function logSeat() {const g=group();cyl(g,'#936941',0,.09,0,.10,.62,0,0,PI/2);for(const x of [-.315,.315])cyl(g,'#c3a16a',x,.09,0,.077,.012,0,0,PI/2);return g;}
  function crate() {
    const g=group();box(g,'#b39758',0,.12,0,.28,.23,.24);
    for(const x of [-.125,.125])box(g,'#d0b579',x,.125,.128,.025,.25,.024);
    for(const y of [.03,.2])box(g,'#d0b579',0,y,.128,.28,.025,.024);
    for(let i=0;i<4;i++)ico(g,i%2?'#d69346':'#a9b553',-.085+(i%2)*.16,.24,-.06+Math.floor(i/2)*.12,.055);
    return g;
  }
  function palm(scale=1) {
    const g=group();shadow(g,.85);
    const p=[[0,0,0],[.025,.27,0],[.07,.55,0],[.16,.83,.015],[.19,1.08,.03]];
    for(let i=0;i<4;i++)beam(g,p[i],p[i+1],.034-i*.004,i%2?'#b99b58':'#a18445');
    for(let i=0;i<7;i++){
      const leaf=mesh(g,leafGeometry,material(i%2?'#3d9556':'#5aaa55',{side:THREE.DoubleSide}),.19,1.06,.03,.78,.86,.82,0,i/7*PI*2,0);
      leaf.rotation.x=(i%2)*.08;
    }
    for(let i=0;i<3;i++)ico(g,'#9e813e',.14+i*.046,1.018,.05,.052,.060,.049);
    g.scale.setScalar(scale);return g;
  }
  function cactus(scale=1) {
    const g=group();shadow(g,.4);
    cyl(g,'#4d8c64',0,.3,0,.065,.59);soft(g,'#5a9769',0,.59,0,.064,.07,.064);
    beam(g,[0,.29,0],[-.14,.29,0],.04,'#5c996a');cyl(g,'#5c996a',-.14,.37,0,.039,.18);soft(g,'#69a56f',-.14,.47,0,.04);
    beam(g,[0,.37,0],[.12,.37,0],.037,'#45835f');cyl(g,'#45835f',.12,.49,0,.037,.23);soft(g,'#4f9064',.12,.60,0,.037);
    ico(g,'#e8bd69',0,.666,0,.035,.025,.036);g.scale.setScalar(scale);return g;
  }
  function desertArch() {
    const g=group();shadow(g,1.6,1.1);
    for(const x of [-.44,.44]){
      mesh(g,new THREE.CylinderGeometry(.13,.23,1.2,5),'#c29a50',x,.60,0,1,1,1,0,x,0);
      box(g,'#d5ad62',x,1.22,0,.30,.14,.33,0,.03,x*.1);
    }
    box(g,'#dab567',0,1.35,0,1.20,.18,.32,0,0,-.07);
    box(g,'#b98c42',.03,1.17,.015,.42,.08,.22,0,0,.04);
    for(let i=0;i<5;i++)ico(g,'#ccaa67',(random()-.5)*1.4,.06,(random()-.5)*.8,.1,.07,.1);
    return g;
  }
  function sandstone(height=1.5) {
    const g=group();shadow(g,.65);
    mesh(g,new THREE.CylinderGeometry(.12,.23,1,5),'#c69b4b',0,height/2,0,1,height,1,0,.45,-.08);
    box(g,'#e0b664',-.06,height,0,.29,.11,.31,0,.14,-.12);return g;
  }
  function sundial() {
    const g=group();shadow(g,1.0);cyl(g,'#b89d60',0,.065,0,.38,.13);cyl(g,'#dfc784',0,.14,0,.34,.035);
    for(let i=0;i<12;i++){const a=i/12*PI*2;box(g,'#9e864d',Math.sin(a)*.28,.163,Math.cos(a)*.28,.015,.009,.055,0,a);}
    mesh(g,geo.cone,'#b4883c',0,.26,0,.10,.27,.1,0,0,-.4);return g;
  }
  function igloo() {
    const g=group();shadow(g,1.0);
    mesh(g,new THREE.SphereGeometry(.41,12,7,0,PI*2,0,PI/2),'#dbe6d0',0,0,0);
    mesh(g,new THREE.CylinderGeometry(.16,.16,.26,8,1,false,0,PI),'#c5d9ce',0,.03,.40,1,1,1,PI/2,0,PI/2);
    box(g,'#6f9b9b',0,.095,.51,.19,.18,.035);
    for(let i=0;i<6;i++){const a=i/6*PI*2;box(g,'#b3cebf',Math.sin(a)*.358,.175,Math.cos(a)*.358,.02,.022,.14,0,a);}
    return g;
  }
  function volcano() {
    const g=group();shadow(g,2.3,2.0);
    const geom=new THREE.CylinderGeometry(.31,.88,1.58,8,3,true);
    mesh(g,geom,'#555e4d',0,.79,0);
    mesh(g,new THREE.CylinderGeometry(.30,.21,.2,8,1,true),'#333e37',0,1.50,0);
    cyl(g,material('#ef7430',{emissive:'#fb5914',emissiveIntensity:1.2}),0,1.42,0,.24,.03);
    const paths=[[[.0,1.59,.31],[-.10,1.24,.44],[.03,.87,.61],[-.12,.57,.70],[-.09,.1,.87]],
      [[-.25,1.57,.11],[-.36,1.20,.3],[-.40,.93,.42],[-.53,.76,.44]]];
    const lavaMat=material('#f4b64b',{emissive:'#f56718',emissiveIntensity:1.5});lava.push(lavaMat);
    paths.forEach(path=>{for(let i=0;i<path.length-1;i++)beam(g,path[i],path[i+1],.025,lavaMat);});
    smokePlume(g,1.64,'#819586',.15,1.6);
    for(let i=0;i<12;i++){const a=i/12*PI*2;ico(g,'#59654f',Math.sin(a)*.8,.09,Math.cos(a)*.8,.13,.10,.1);}
    return g;
  }
  function telescope() {
    const g=group();shadow(g,1.1);
    cyl(g,'#a1a589',0,.065,0,.44,.13);
    for(let i=0;i<3;i++){const a=i*PI*2/3;beam(g,[0,.42,0],[Math.sin(a)*.22,.12,Math.cos(a)*.22],.025,'#887855');}
    const scope=group();scope.position.set(0,.49,0);scope.rotation.x=-.55;g.add(scope);
    cyl(scope,'#c3a664',0,0,0,.065,.43,PI/2);cyl(scope,'#e2c995',0,0,.22,.085,.06,PI/2);
    cyl(scope,'#447875',0,0,.255,.063,.009,PI/2);return g;
  }
  function dock() {
    const g=group();shadow(g,1.1,1.2);
    for(let i=0;i<9;i++)box(g,i%2?'#beaa72':'#a99059',0,.13,i*.12-.48,.57,.055,.108);
    for(const x of [-.24,.24])for(const z of [-.43,.43])cyl(g,'#8c7851',x,.14,z,.026,.4);
    return g;
  }
  function boat() {
    const g=group();
    mesh(g,geo.soft,'#bd9154',0,.07,0,.27,.14,.50);
    box(g,'#4e695e',0,.155,0,.32,.04,.58);
    for(let i=0;i<3;i++)box(g,'#ccb57e',0,.19,-.22+i*.23,.36,.025,.055);
    cyl(g,'#b29a65',0,.52,-.04,.018,.76);
    const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute([.02,.27,-.04,.02,.89,-.04,.43,.3,-.04],3));sail.computeVertexNormals();mesh(g,sail,material('#ece0ad',{side:THREE.DoubleSide}));
    return g;
  }
  function flower(color='#e9e5b0') {
    const g=group();cyl(g,'#679049',0,.055,0,.007,.11);
    for(let i=0;i<5;i++){const a=i/5*PI*2;ico(g,color,Math.cos(a)*.025,.12,Math.sin(a)*.025,.023,.014,.023);}
    ico(g,'#e0b956',0,.127,0,.015,.014,.015);return g;
  }
  function grass(color='#6e9d46') {
    const g=group();for(let i=0;i<3;i++)mesh(g,geo.cone,color,(i-1)*.025,.055+random()*.02,0,.017,.15,.012,0,random()*5,(i-1)*-.3);return g;
  }
  function mushroom() {
    const g=group();cyl(g,'#d8cf9f',0,.05,0,.018,.10);mesh(g,geo.cone6,'#b7583e',0,.114,0,.067,.05,.064);
    for(let i=0;i<3;i++)ico(g,'#f0ddb0',(i-1)*.028,.138,Math.sin(i*2)*.019,.009,.004,.008);return g;
  }
  function cloud() {
    const g=group();const colors=['#dae4cd','#e6ebd7','#d0dfca'];
    for(let i=0;i<5;i++){const m=soft(g,colors[i%3],(i-2)*.19,(i%2)*.045,Math.sin(i*2)*.025,.22+random()*.06,.15+random()*.06,.19);m.castShadow=false;m.receiveShadow=false;}
    return g;
  }

  function animal(kind='fox') {
    const g=group(), limbs=[],tailPivot=group();shadow(g,.65,.80);
    if(kind==='fox'){
      soft(g,'#c97d37',0,.20,0,.12,.13,.24);soft(g,'#e19647',0,.28,.23,.12,.12,.13);
      mesh(g,geo.cone,'#eee0b0',0,.245,.36,.078,.17,.067,PI/2,0,0);
      ico(g,'#353d32',0,.245,.435,.028,.025,.028);
      for(const x of [-.07,.07]){mesh(g,geo.cone,'#b66b2f',x,.43,.23,.055,.16,.042);mesh(g,geo.cone,'#624d37',x,.434,.251,.027,.095,.015);ico(g,'#303a2d',x*1.34,.298,.30,.012);}
      tailPivot.position.set(0,.19,-.2);g.add(tailPivot);
      mesh(tailPivot,geo.cone6,'#cb843e',0,.07,-.16,.097,.34,.083,-PI/2+.3);
      mesh(tailPivot,geo.cone6,'#eee0b5',0,.135,-.33,.059,.17,.052,-PI/2+.3);
      for(const x of [-.07,.07])for(const z of [-.145,.13]){const leg=group();leg.position.set(x,.16,z);g.add(leg);box(leg,'#614d35',0,-.07,0,.043,.16,.044);limbs.push(leg);}
    } else if(kind==='sheep'){
      soft(g,'#ece7c6',0,.24,0,.19,.18,.26);for(let i=0;i<4;i++)soft(g,'#e0dfbd',(i%2-.5)*.23,.29,Math.floor(i/2)*.24-.12,.13);
      soft(g,'#867855',0,.25,.28,.088,.105,.105);
      for(const x of [-.11,.11])soft(g,'#9d9069',x,.30,.25,.055,.023,.043);
      for(const x of [-.07,.07])for(const z of [-.14,.14]){const leg=group();leg.position.set(x,.14,z);g.add(leg);box(leg,'#7c6f4b',0,-.06,0,.034,.16,.035);limbs.push(leg);}
      for(const x of [-.043,.043])ico(g,'#3c4434',x,.28,.364,.009);
    } else {
      soft(g,'#e1ddbd',0,.13,0,.09,.11,.16);soft(g,'#ebe4c5',0,.21,.13,.073,.078,.075);
      for(const x of [-.032,.032]){soft(g,'#d8cfaa',x,.345,.115,.025,.105,.027);ico(g,'#414832',x*1.5,.229,.18,.009);}
      soft(g,'#f0e7ca',0,.16,-.15,.045);for(const x of [-.07,.07])soft(g,'#cdc8a9',x,.04,-.05,.045,.045,.07);
    }
    return {root:g, limbs, tail:tailPivot, kind};
  }
  function avatar() {
    const root=group(),body=group(),legs=[],arms=[];
    root.add(body);
    const green='#597b5e', skin='#edce91';
    mesh(body,new THREE.CylinderGeometry(.095,.12,.205,7),'#d6c687',0,.25,0);
    box(body,green,0,.265,-.028,.176,.205,.11);
    soft(body,skin,0,.405,0,.096,.105,.09);
    mesh(body,new THREE.SphereGeometry(.102,9,5,0,PI*2,0,PI/2),'#ce6847',0,.432,0);
    cyl(body,'#b8543e',0,.445,0,.104,.029);
    soft(body,'#e48259',0,.55,0,.035,.031,.035);
    box(body,'#ae583e',0,.439,.085,.16,.022,.075);
    for(const x of [-.034,.034])ico(body,'#36483a',x,.408,.083,.01,.012,.008);
    ico(body,skin,0,.384,.096,.018,.016,.015);
    box(body,'#aa7842',0,.27,-.13,.15,.175,.08);box(body,'#c99b59',0,.301,-.178,.147,.07,.023);
    for(const x of [-.054,.054])box(body,'#dfb66e',x,.268,-.181,.015,.18,.01);
    cyl(body,'#73937a',0,.366,-.15,.038,.20,0,0,PI/2);
    for(const x of [-.061,.061]){
      const leg=group();leg.position.set(x,.167,0);body.add(leg);
      box(leg,'#546748',0,-.047,0,.065,.10,.065);box(leg,'#79593c',0,-.115,.022,.073,.054,.109);legs.push(leg);
      const arm=group();arm.position.set(x*2.04,.319,0);body.add(arm);box(arm,green,0,-.055,0,.053,.11,.061);soft(arm,skin,0,-.121,.005,.029,.033,.029);arms.push(arm);
    }
    return {root,body,legs,arms};
  }

  function animate(t, dt, celebration=0) {
    rotors.forEach((r,i)=>r.rotation.z=t*(.4+i*.03));
    fires.forEach((f,i)=>{const pulse=1+.11*Math.sin(t*11+i)+.07*Math.sin(t*17+i);f.flame.scale.y=.32*pulse*(1+celebration*.4);f.flame.rotation.z=Math.sin(t*8)*.13;f.inner.scale.y=.24*(1+.14*Math.sin(t*13));f.light.intensity=1.1+.23*Math.sin(t*11);});
    smoke.forEach(s=>{const age=(t*(s.spark?.36:.15)/s.strength+s.phase)%1;const scale=s.size*(s.spark?1-age*.5:.65+age*1.8);s.mesh.position.set(Math.sin(age*5+s.phase*11)*age*.16,s.base+age*(s.spark?.6:1.15)*s.strength,Math.cos(age*4+s.phase*5)*age*.05);s.mesh.scale.set(scale,scale*(s.spark?1.4:.7),scale);if(!s.spark)s.mesh.material.opacity=Math.sin(Math.PI*age)*.48;});
    lava.forEach(m=>m.emissiveIntensity=1.1+.25*Math.sin(t*2));
  }
  return {geo,material,mesh,box,ico,soft,cyl,beam,shadow,pine,broadTree,rock,crystal,mountain,cabin,fence,cropPatch,windmill,tent,bridge,fire,logSeat,crate,palm,cactus,desertArch,sandstone,sundial,igloo,volcano,telescope,dock,boat,flower,grass,mushroom,cloud,animal,avatar,animate,dynamic};
}
