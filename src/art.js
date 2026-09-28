import * as THREE from 'three';

// The art layer only changes models and surface detail; game state and controls stay intact.
export function refineModels(M, random) {
  const PI = Math.PI;
  const group = () => new THREE.Group();
  const mesh = M.mesh, box = M.box, cyl = M.cyl, ico = M.ico, beam = M.beam;
  const vertexMaterial = M.material('#ffffff', { vertexColors: true, roughness: 1 });

  function facetedMass(variant, snow) {
    const positions = [], colors = [];
    const count = 7;
    const rings = [];
    const radii = variant===1 ? [.65,.60,.44,.255] : [.65,.59,.39,.15];
    const heights = [-.025, .53, 1.14, 1.50];
    for (let j = 0; j < 4; j++) {
      const ring = [];
      for (let i = 0; i < count; i++) {
        const a = i / count * PI * 2 + .17 * variant;
        const wobble = 1 + Math.sin(i * 2.7 + variant * 1.9 + j) * .12;
        ring.push([
          Math.sin(a) * radii[j] * wobble - j * .035 + Math.sin(variant) * j * .025,
          heights[j] + (j ? Math.sin(i * 2.1 + variant + j * .8) * .065 : 0),
          Math.cos(a) * radii[j] * wobble * .89 + Math.sin(j * 2 + variant) * .035
        ]);
      }
      rings.push(ring);
    }
    const stone = ['#829079', '#74836f', '#8d987f', '#6c7d69', '#919c86', '#78866f', '#7d8c77'];
    const snowColors = ['#d5ddc2', '#cbd6b9', '#e2e5cb'];
    function triangle(a, b, c, color) {
      positions.push(...a, ...b, ...c);
      const tint = new THREE.Color(color);
      for (let k = 0; k < 3; k++) colors.push(tint.r, tint.g, tint.b);
    }
    for (let j = 0; j < 3; j++) for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      const a = rings[j][i], b = rings[j][next], c = rings[j + 1][i], d = rings[j + 1][next];
      const face = stone[(i + variant + j) % stone.length];
      triangle(a, b, c, face);
      triangle(b, d, c, snow && j === 2 && (i + variant) % 3 === 0 ? '#cbd5b8' : stone[(i + variant + j + 1) % stone.length]);
    }
    const peak = [-.12 + variant * .045, variant===1 ? 1.54 : 1.70 + Math.sin(variant * 2) * .06, -.05];
    for (let i = 0; i < count; i++) triangle(rings[3][i], rings[3][(i + 1) % count], peak, snow ? snowColors[(i + variant) % 3] : stone[i]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  const crags = Array.from({ length: 3 }, (_, i) => facetedMass(i, true));
  const bareCrags = Array.from({ length: 3 }, (_, i) => facetedMass(i, false));
  M.mountain = (scale = 1, snow = true) => {
    const g = group(), choice = Math.floor(random() * 3), variant=scale>1.05?1:choice;
    M.shadow(g, 1.73, 1.55);
    mesh(g, snow ? crags[variant] : bareCrags[variant], vertexMaterial);
    ico(g, '#7b8970', -.38, .28, .27, .30, .43, .26).rotation.y = .52;
    ico(g, '#8b967e', .35, .12, .36, .21, .18, .23).rotation.y = -.4;
    ico(g, '#677c5c', -.19, .065, .52, .14, .085, .16);
    g.scale.setScalar(scale); return g;
  };

  M.pine = (scale = 1, snow = false) => {
    const g = group(); M.shadow(g, .79, .73);
    cyl(g, '#745f40', 0, .25, 0, .044, .50);
    const palette = snow ? ['#7eab95', '#8cb29c', '#91bda5'] : ['#2c6b49', '#367950', '#398149', '#316e50'];
    const color = palette[Math.floor(random() * palette.length)];
    const twist = random() * PI * 2;
    mesh(g, M.geo.cone, color, -.015, .61, 0, .36, .92, .34, 0, twist, .018);
    mesh(g, M.geo.cone, snow ? '#c7ddbb' : '#45884f', .02, .97, -.005, .235, .84, .223, 0, twist + .15, -.022);
    if (snow) mesh(g, M.geo.cone, '#e0e7cc', .01, 1.27, -.012, .092, .30, .088, 0, twist + .15);
    g.scale.setScalar(scale); g.userData.conifer=true; return g;
  };

  const oldCrystal = M.crystal;
  M.crystal = scale => {
    const g = oldCrystal(scale);
    g.children[0].material.color.set('#a6d3d9');
    g.children[0].material.roughness = .7;
    return g;
  };

  const fernLeaf = new THREE.BufferGeometry();
  fernLeaf.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0,0, -.065,.085,.10, 0,.13,.18,
    0,0,0, 0,.13,.18, .065,.085,.10,
    -.065,.085,.10, -.095,.07,.20, 0,.13,.18,
    .065,.085,.10, 0,.13,.18, .095,.07,.20,
    -.095,.07,.20, -.057,.07,.29, 0,.13,.18,
    .095,.07,.20, 0,.13,.18, .057,.07,.29,
    -.057,.07,.29, 0,.025,.39, 0,.13,.18,
    .057,.07,.29, 0,.13,.18, 0,.025,.39
  ], 3));
  fernLeaf.computeVertexNormals();
  M.fern = (scale = 1) => {
    const g = group();
    for (let i = 0; i < 7; i++) mesh(g, fernLeaf, M.material(i % 2 ? '#618e4b' : '#4e7f45', { side: THREE.DoubleSide }), 0, .012, 0, .58, .9, .60, 0, i * PI * 2 / 7, 0);
    g.scale.setScalar(scale); return g;
  };

  const barrelGeometry = new THREE.CylinderGeometry(.095, .095, .25, 10, 2);
  const hoopGeometry = new THREE.TorusGeometry(.098, .008, 4, 10);
  M.barrel = () => {
    const g = group(); M.shadow(g, .33);
    mesh(g, barrelGeometry, '#957146', 0, .128, 0);
    for (const y of [.055, .207]) mesh(g, hoopGeometry, '#627467', 0, y, 0, 1, 1, 1, PI / 2);
    cyl(g, '#c0a270', 0, .255, 0, .084, .012);
    for (const x of [-.039, 0, .039]) box(g, '#9d8154', x, .263, 0, .005, .002, .145);
    ico(g, '#6d613e', .028, .27, .02, .011, .007, .011);
    return g;
  };
  M.logPile = () => {
    const g = group(); M.shadow(g, .58, .40);
    for (let row = 0; row < 3; row++) for (let j = 0; j < 3 - row; j++) {
      const x = (j - (2 - row) / 2) * .105, y = .052 + row * .085;
      cyl(g, '#826143', x, y, 0, .049, .35, PI / 2);
      for (const z of [-.18, .18]) {
        cyl(g, '#c7ac75', x, y, z, .040, .006, PI / 2);
        cyl(g, '#a48755', x, y, z * 1.025, .014, .005, PI / 2);
      }
    } return g;
  };
  M.lanternPost = () => {
    const g = group();
    cyl(g, '#82754b', -.05, .29, 0, .025, .58);
    beam(g, [-.05,.56,0], [.105,.56,0], .017, '#8f8052');
    const metal = '#536151';
    box(g, metal, .1, .40, 0, .086, .020, .070);
    box(g, M.material('#e7d19b', { emissive:'#e9be68', emissiveIntensity:.45 }), .1, .456, 0, .060, .09, .051);
    for (const x of [.064,.136]) for (const z of [-.027,.027]) box(g, metal, x, .46, z, .011, .105, .011);
    mesh(g, M.geo.cone, metal, .1, .523, 0, .063, .048, .05, 0, PI/4);
    const handle = mesh(g, M.geo.ring, metal, .1, .557, 0, .025, .033, .025);
    handle.rotation.y = PI/2; return g;
  };
  M.signpost = () => {
    const g = group(); cyl(g, '#816e43', 0, .20, 0, .022, .41);
    box(g, '#b99c63', .01, .33, 0, .30, .09, .035, 0, 0, -.03);
    mesh(g, M.geo.cone, '#b99c63', .182, .327, 0, .07, .12, .018, 0, 0, -PI/2);
    beam(g, [-.048,.33,.024], [.07,.33,.024], .007, '#e5d6a3');
    beam(g, [.03,.36,.024], [.07,.33,.024], .007, '#e5d6a3');
    beam(g, [.03,.30,.024], [.07,.33,.024], .007, '#e5d6a3');
    return g;
  };
  M.tractor = () => {
    const g = group(); M.shadow(g, .72, .91);
    const green = '#47785d';
    box(g, '#465746', 0, .16, 0, .22, .075, .49);
    box(g, green, 0, .245, .105, .235, .15, .24);
    box(g, '#73a276', 0, .333, .105, .24, .03, .26);
    box(g, '#3e4c3a', 0, .244, .235, .17, .10, .014);
    for (const x of [-.06,-.03,0,.03,.06]) box(g, '#c8c597', x, .244, .245, .009, .089, .008);
    for (const x of [-.143,.143]) for (const z of [-.17,.175]) {
      const radius = z < 0 ? .116 : .080;
      cyl(g, '#344738', x, radius, z, radius, .068, 0, 0, PI/2);
      cyl(g, '#d9be67', x * 1.245, radius, z, radius * .58, .012, 0, 0, PI/2);
      cyl(g, '#687650', x * 1.30, radius, z, radius * .20, .014, 0, 0, PI/2);
    }
    box(g, '#9d814d', 0, .235, -.14, .13, .024, .12);
    box(g, '#8b744a', 0, .285, -.194, .14, .11, .025, .15);
    beam(g, [0,.2,-.09], [0,.365,-.025], .011, '#455b47');
    mesh(g, M.geo.ring, '#344b3c', 0, .366, -.026, .047, .047, .047, -.55, 0);
    cyl(g, '#6a7356', -.064, .425, .14, .014, .23);
    box(g, '#697750', 0, .118, -.29, .055, .028, .10);
    return g;
  };
  M.hayCart = () => {
    const g = group(); M.shadow(g, .80, .95);
    box(g, '#947348', 0, .16, 0, .38, .045, .47);
    for (const x of [-.176,.176]) box(g, '#b0925b', x, .24, 0, .024, .13, .49);
    for (const z of [-.223,.223]) box(g, '#b79862', 0, .24, z, .37, .13, .024);
    for (const x of [-.224,.224]) {
      cyl(g, '#5b6241', x, .105, 0, .107, .035, 0, 0, PI/2);
      cyl(g, '#b39b64', x * 1.11, .105, 0, .072, .012, 0, 0, PI/2);
    }
    for (const x of [-.125,.125]) beam(g, [x,.16,.20], [x,.115,.64], .013, '#9b8150');
    for (let i=0;i<5;i++) {
      const z=(i-2)*.074; cyl(g, i%2 ? '#d2bd75' : '#c4ad62', 0, .302 + Math.sin(i)*.02, z, .064, .32, 0, 0, PI/2);
    }
    for (const x of [-.08,.08]) box(g, '#a79059', x, .36, 0, .017, .011, .40);
    return g;
  };

  const oldCabin = M.cabin;
  M.cabin = (scale = 1, red = false) => {
    const g = oldCabin(scale, red);
    // Small construction details, kept in the same muted wood palette.
    for (const x of [-.62,.62]) box(g, '#b5a16c', x * .87, .625, 0, .035, .043, 1.02);
    for (const side of [-1,1]) beam(g, [side*.59,.621,.475], [0,1.091,.465], .013, '#b9a77a');
    box(g, '#81714b', 0, 1.092, 0, .054, .028, .95);
    for (const z of [-.21,.03,.22]) box(g, '#785e3e', .456, .35, z, .010, .43, .018);
    box(g, '#aa8952', -.258, .29, .416, .30, .05, .086);
    for (let i=0;i<4;i++) {
      const x=-.355+i*.065;
      ico(g, '#648b4e', x, .335, .429, .032, .045, .025);
      ico(g, i%2 ? '#e4d9ac' : '#d79d75', x+.01, .377, .43, .025, .020, .025);
    }
    const barrel = M.barrel(); barrel.position.set(.65, 0, .15); g.add(barrel);
    const logs = M.logPile(); logs.position.set(-.68, 0, -.10); logs.rotation.y=PI/2;g.add(logs);
    return g;
  };

  const oldTent=M.tent;
  M.tent=()=>{
    const g=oldTent();
    const flaps=new THREE.BufferGeometry();
    flaps.setAttribute('position',new THREE.Float32BufferAttribute([
      0,.512,.388,-.32,.035,.39,-.22,.06,.43,
      0,.512,.388,.22,.06,.43,.32,.035,.39
    ],3));flaps.computeVertexNormals();mesh(g,flaps,M.material('#d09b57',{side:THREE.DoubleSide}));
    for(const side of [-1,1]) beam(g,[0,.515,side*.39],[side*.345,.035,side*.39],.0055,'#e0c291');
    box(g,'#788663',0,.043,.26,.32,.019,.32);
    const mug=group();cyl(mug,'#d4d3ad',0,.035,0,.025,.052);cyl(mug,'#5a6b51',0,.064,0,.018,.004);
    mesh(mug,M.geo.ring,'#d4d3ad',.027,.04,0,.016,.019,.016,0,PI/2);
    mug.position.set(-.41,0,.5);g.add(mug);return g;
  };

  const oldFire=M.fire;
  M.fire=()=>{
    const g=oldFire();
    for(const a of [PI*.2,PI*.87,PI*1.53]) beam(g,[Math.cos(a)*.245,.02,Math.sin(a)*.245],[.01,.69,-.015],.012,'#777154');
    beam(g,[.01,.65,-.015],[.01,.40,-.015],.0045,'#576050');
    mesh(g,M.geo.soft,'#566450',.01,.363,-.015,.092,.065,.092);
    cyl(g,'#68765b',.01,.404,-.015,.09,.019);
    cyl(g,'#3e4d3f',.01,.416,-.015,.073,.006);
    return g;
  };

  M.cloud=()=>{
    const g=group();
    const puffs=[[-.36,.015,.00,.23,.17,.18],[-.16,.10,.02,.29,.23,.24],[.07,.04,0,.31,.205,.25],[.30,.105,-.02,.23,.19,.21],[.10,.18,.03,.21,.19,.20]];
    puffs.forEach((p,i)=>{const m=M.soft(g,['#dce6d5','#e5ead8','#d3e0d0'][i%3],...p);m.castShadow=false;m.receiveShadow=false;});
    return g;
  };

  // An irregular sandstone prism is shared by the weathered desert monuments.
  const stonePositions=[],stoneColors=[];
  const stoneFaces=['#c9a35a','#b48b45','#d6b26a','#bf964e','#d9b670','#b89450'];
  const stoneRings=[];
  for(let j=0;j<4;j++){
    const ring=[];
    for(let i=0;i<6;i++){
      const a=i/6*PI*2+.2;
      const r=[.225,.19,.158,.185][j]*(1+Math.sin(i*2+j)*.12);
      ring.push([Math.sin(a)*r+(j>1?-.025:0),[0,.35,.88,1][j]+(j===3?Math.sin(i*4)*.035:0),Math.cos(a)*r*.85]);
    }stoneRings.push(ring);
  }
  function stoneTri(a,b,c,tint){stonePositions.push(...a,...b,...c);const color=new THREE.Color(tint);for(let i=0;i<3;i++)stoneColors.push(color.r,color.g,color.b);}
  for(let j=0;j<3;j++)for(let i=0;i<6;i++){
    const n=(i+1)%6;stoneTri(stoneRings[j][i],stoneRings[j][n],stoneRings[j+1][i],stoneFaces[i]);stoneTri(stoneRings[j][n],stoneRings[j+1][n],stoneRings[j+1][i],stoneFaces[(i+j)%6]);
  }
  for(let i=0;i<6;i++)stoneTri(stoneRings[3][i],stoneRings[3][(i+1)%6],[-.025,1.025,0],'#dfbd7b');
  const stoneGeometry=new THREE.BufferGeometry();stoneGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stonePositions,3));stoneGeometry.setAttribute('color',new THREE.Float32BufferAttribute(stoneColors,3));stoneGeometry.computeVertexNormals();
  M.sandstone=(height=1.5)=>{const g=group();M.shadow(g,.71);mesh(g,stoneGeometry,vertexMaterial,0,0,0,1,height,1,0,.1,-.045);ico(g,'#b49b5e',.20,.025,.09,.08,.04,.06);return g;};
  const oldArch=M.desertArch;
  M.desertArch=()=>{
    const g=oldArch();
    g.children.forEach(m=>{if(m.isMesh&&m.geometry.type==='CylinderGeometry'){m.geometry=stoneGeometry;m.material=vertexMaterial;m.position.y=0;m.scale.y=1.2;}});
    box(g,'#ba9652',.09,1.31,.18,.015,.10,.012,0,0,-.22);
    box(g,'#bd9956',-.36,1.39,.18,.010,.08,.011,0,0,.16);return g;
  };
  return M;
}
