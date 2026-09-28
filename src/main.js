import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, R, UP, direction, biomeAt, groundPoint, REGIONS } from './world.js';
import { createNeighbors } from './neighbors.js';

const $=id=>document.getElementById(id);
const clamp=THREE.MathUtils.clamp;
const keys=new Set();
const state={ready:false,mode:'globe',transition:null,zoomTarget:null,time:0,moving:0,nearby:0,nearNpc:-1,primary:'wonder',region:'forest',collected:new Set(),joystick:new THREE.Vector2(),moveTarget:null,walkPhase:0,celebrateUntil:0,discoveryUntil:0,userOrbit:false,selectedJournal:-1};
try{const stored=JSON.parse(localStorage.getItem('little-planet-wonders-v1')||'[]');if(Array.isArray(stored))stored.forEach(id=>{if(REGIONS.some(r=>r.id===id))state.collected.add(id);});}catch(_){}
let renderer,scene,camera,controls,world,avatar,playerRing,playerShadow,targetMarker,pathLine,neighbors;
let width=innerWidth,height=innerHeight,globeDistance=24;
const player={normal:direction(16,-1.1),previousNormal:new THREE.Vector3(),heading:new THREE.Vector3(0,-1,0),jump:0,jumpVelocity:0};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),north=new THREE.Vector3(),east=new THREE.Vector3(),screenUp=new THREE.Vector3(),right=new THREE.Vector3(),movement=new THREE.Vector3(),candidate=new THREE.Vector3();
const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),transport=new THREE.Quaternion();
const identity=new THREE.Quaternion();
let toastTimer,last=performance.now(),lastChirp=0,lastFocus;

class Soundscape {
  constructor(){this.enabled=false;this.context=null;this.master=null;}
  async toggle(){
    if(!this.context){
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext){notify('这个浏览器暂时无法播放声音。');return;}
      this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
      const buffer=this.context.createBuffer(1,this.context.sampleRate*4,this.context.sampleRate),data=buffer.getChannelData(0);let value=0;
      for(let i=0;i<data.length;i++){value=(value+(Math.random()*2-1)*.014)/1.018;data[i]=value;}
      const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;
      const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;
      const gain=this.context.createGain();gain.gain.value=.12;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();
    }
    await this.context.resume();this.enabled=!this.enabled;this.master.gain.setTargetAtTime(this.enabled?.35:0,this.context.currentTime,.25);
    $('sound-icon').setAttribute('href',this.enabled?'#sound':'#muted');$('sound-button').setAttribute('aria-pressed',String(this.enabled));
    $('sound-button').setAttribute('aria-label',this.enabled?'关闭环境声音':'开启环境声音');$('sound-button').title=this.enabled?'关闭声音':'开启声音';
    if(this.enabled)this.chirp();
  }
  tone(frequency,duration=.3,delay=0,volume=.12,type='sine'){
    if(!this.enabled||!this.context)return;
    const t=this.context.currentTime+delay,osc=this.context.createOscillator(),gain=this.context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+duration+.03);
  }
  chime(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,.72,i*.095,.15));}
  chirp(){if(!this.enabled||!this.context)return;const t=this.context.currentTime,osc=this.context.createOscillator(),gain=this.context.createGain();osc.frequency.setValueAtTime(1700,t);osc.frequency.exponentialRampToValueAtTime(2450,t+.065);osc.frequency.exponentialRampToValueAtTime(1800,t+.14);gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.05,t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+.18);osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+.2);}
}
const audio=new Soundscape();

function notify(text){clearTimeout(toastTimer);$('toast').querySelector('span').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2900);}
function surfaceNorth(n,out=new THREE.Vector3()){out.set(0,1,0).addScaledVector(n,-n.y);if(out.lengthSq()<.00001)out.set(0,0,-1).addScaledVector(n,n.z);return out.normalize();}
function desiredGlobeDistance(){return Math.max(25.8,6.45/(Math.tan(THREE.MathUtils.degToRad(19))*width/height*.86));}
function setLimits(){controls.minDistance=state.mode==='globe'?10:2.6;controls.maxDistance=state.mode==='globe'?globeDistance*1.7:17;}
function updateViewUI(){const globe=state.mode==='globe';$('view-button').classList.toggle('active',globe);$('view-button').setAttribute('aria-pressed',String(globe));$('view-label').textContent=globe?'星球全景':'旅人视角';$('view-button').title=globe?'靠近看看 · U':'看看整颗星球 · U';}
function cameraFlight(toPosition,toTarget,duration=1250){
  const from=camera.position.clone(),fromDirection=from.clone().normalize(),toDirection=toPosition.clone().normalize();
  const arc=new THREE.Quaternion().setFromUnitVectors(fromDirection,toDirection);
  state.transition={start:performance.now(),duration,fromPosition:from,toPosition:toPosition.clone(),fromDirection,arc,fromTarget:controls.target.clone(),toTarget:toTarget.clone()};
  state.zoomTarget=null;controls.enabled=false;controls.enableDamping=false;state.userOrbit=false;$('scene').classList.remove('dragging');
}
function switchView(mode=state.mode==='globe'?'walk':'globe',animate=true){
  if(!state.ready||neighbors?.blocks())return;
  state.mode=mode;setLimits();updateViewUI();renderer.domElement.focus({preventScroll:true});surfaceNorth(player.normal,north);
  let position,target;
  if(mode==='globe'){
    target=new THREE.Vector3();position=player.normal.clone().addScaledVector(north,.37).normalize().multiplyScalar(globeDistance);
  }else{
    target=groundPoint(player.normal,.10).addScaledVector(north,.24);
    const pull=width<650?6.45:5.85;
    position=player.normal.clone().multiplyScalar(R+pull).addScaledVector(north,-4.55);
  }
  if(animate)cameraFlight(position,target);else{camera.position.copy(position);controls.target.copy(target);controls.update();}
  player.previousNormal.copy(player.normal);
}
function focusPlayer(){if(state.mode==='walk')switchView('walk');else switchView('globe');}
function zoom(factor){if(!state.ready||neighbors?.blocks())return;state.zoomTarget=clamp((state.zoomTarget||camera.position.distanceTo(controls.target))*factor,controls.minDistance,controls.maxDistance);}

function makeStars(){
  const p=[];let seed=921;const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  for(let i=0;i<420;i++){const n=new THREE.Vector3(random()*2-1,random()*2-1,random()*2-1).normalize().multiplyScalar(48+random()*20);p.push(n.x,n.y,n.z);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:'#b4c7b7',size:.026,transparent:true,opacity:.25,depthWrite:false})));
}
function ring(radius,color,opacity){const group=new THREE.Group();const m=new THREE.Mesh(new THREE.RingGeometry(radius-.012,radius,44),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;group.add(m);return group;}
function initializePlayer(){
  avatar=world.models.avatar();avatar.root.scale.setScalar(1.055);avatar.root.traverse(o=>{if(o.isMesh)o.castShadow=false;});scene.add(avatar.root);
  player.normal.copy(world.startDirection);player.previousNormal.copy(player.normal);surfaceNorth(player.normal,player.heading);
  playerRing=ring(.21,'#dfdfa6',.65);scene.add(playerRing);
  playerShadow=new THREE.Group();world.models.shadow(playerShadow,.43,.40);playerShadow.children[0].material=playerShadow.children[0].material.clone();scene.add(playerShadow);
  targetMarker=ring(.17,'#efdc9b',.73);targetMarker.visible=false;scene.add(targetMarker);
  pathLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#e0d7a5',dashSize:.06,gapSize:.12,transparent:true,opacity:.42,depthWrite:false}));pathLine.visible=false;scene.add(pathLine);
  updateAvatar(0,.016);
}
function placeTarget(n){
  const target=n.clone();
  for(const obstacle of world.colliders){
    if(target.distanceTo(obstacle.n)*R<obstacle.radius+.2){
      const away=player.normal.clone().sub(obstacle.n).projectOnPlane(obstacle.n).normalize();target.copy(obstacle.n).addScaledVector(away,(obstacle.radius+.24)/R).normalize();
    }
  }
  state.moveTarget=target;targetMarker.visible=true;targetMarker.position.copy(groundPoint(target,.052));targetMarker.quaternion.setFromUnitVectors(UP,target);
  const points=[],axis=new THREE.Vector3().crossVectors(player.normal,target).normalize(),angle=player.normal.angleTo(target);
  for(let i=0;i<=60;i++){const n=player.normal.clone().applyAxisAngle(axis,angle*i/60);points.push(groundPoint(n,.046));}
  pathLine.geometry.dispose();pathLine.geometry=new THREE.BufferGeometry().setFromPoints(points);pathLine.computeLineDistances();pathLine.visible=angle>.04;
}
function stopWalking(){state.moveTarget=null;targetMarker.visible=false;pathLine.visible=false;}
function travelTo(index){
  if(!state.ready)return;
  const wonder=world.wonders[index];stopWalking();keys.clear();closeJournal();$('discovery').classList.remove('visible');state.discoveryUntil=0;
  surfaceNorth(wonder.n,north);player.normal.copy(wonder.n).addScaledVector(north,.68/R).normalize();
  player.previousNormal.copy(player.normal);player.heading.copy(wonder.n).sub(player.normal).projectOnPlane(player.normal).normalize();
  player.jump=0;player.jumpVelocity=0;state.region='';state.selectedJournal=index;
  switchView('walk');notify(`${wonder.chinese} · 慢慢走，奇迹就在身边。`);
}
function jump(){
  if(!state.ready||player.jump>.025||state.transition||neighbors?.blocks())return;
  if(state.mode==='globe')switchView('walk');
  player.jumpVelocity=2.6;audio.tone(270,.16,0,.06,'triangle');
}
function updateMovement(dt){
  const blocked=!$('help-modal').hidden||!$('journal').hidden||state.transition||neighbors?.blocks();
  movement.set(0,0,0);let moving=false,manual=false;
  player.previousNormal.copy(player.normal);
  if(!blocked){
    const horizontal=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+state.joystick.x;
    const vertical=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+state.joystick.y;
    if(Math.abs(horizontal)+Math.abs(vertical)>.08){
      manual=true;stopWalking();right.setFromMatrixColumn(camera.matrixWorld,0).projectOnPlane(player.normal).normalize();screenUp.setFromMatrixColumn(camera.matrixWorld,1).projectOnPlane(player.normal).normalize();
      movement.addScaledVector(right,horizontal).addScaledVector(screenUp,vertical).normalize();moving=true;
    }else if(state.moveTarget){
      const distance=player.normal.distanceTo(state.moveTarget)*R;
      if(distance<.09)stopWalking();else{movement.copy(state.moveTarget).sub(player.normal).projectOnPlane(player.normal).normalize();moving=true;}
    }
    if(moving){
      if(!manual){
        for(const obstacle of world.colliders){
          const distance=player.normal.distanceTo(obstacle.n)*R;
          if(distance<obstacle.radius+.38){
            v1.copy(player.normal).sub(obstacle.n).projectOnPlane(player.normal).normalize();
            if(movement.dot(v1)<.25){const factor=(1-distance/(obstacle.radius+.38))*2.4;movement.addScaledVector(v1,factor);v2.crossVectors(player.normal,v1).normalize();movement.addScaledVector(v2,factor*.68);}
          }
        }movement.normalize();
      }
      const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.85:1.04)*(state.joystick.length()>.08?clamp(state.joystick.length(),.35,1):1);
      candidate.copy(player.normal).addScaledVector(movement,speed*dt/R).normalize();
      if(biomeAt(candidate)==='water'){
        if(state.moveTarget)notify('海边适合停一停。试着点击另一片陆地。');stopWalking();moving=false;
      }else{
        for(const obstacle of world.colliders){
          const distance=candidate.distanceTo(obstacle.n)*R;
          if(distance<obstacle.radius+.115){v1.copy(candidate).sub(obstacle.n).projectOnPlane(obstacle.n).normalize();candidate.copy(obstacle.n).addScaledVector(v1,(obstacle.radius+.117)/R).normalize();}
        }
        player.normal.copy(candidate);player.heading.lerp(movement,1-Math.exp(-dt*12)).projectOnPlane(player.normal).normalize();
        state.walkPhase+=dt*(speed>1.4?12:8.5);
      }
    }
  }
  state.moving=THREE.MathUtils.lerp(state.moving,moving?1:0,1-Math.exp(-dt*12));
  if(player.jumpVelocity!==0||player.jump>0){player.jumpVelocity-=7.7*dt;player.jump+=player.jumpVelocity*dt;if(player.jump<0){player.jump=0;player.jumpVelocity=0;}}
  if(state.mode==='walk'&&!state.transition&&player.previousNormal.distanceToSquared(player.normal)>.000000001){
    transport.setFromUnitVectors(player.previousNormal,player.normal);
    v1.copy(camera.position).sub(controls.target).applyQuaternion(transport);
    surfaceNorth(player.normal,north);v2.copy(groundPoint(player.normal,.10)).addScaledVector(north,.24);
    controls.target.copy(v2);camera.position.copy(v2).add(v1);
  }
}
function updateAvatar(t,dt){
  avatar.root.position.copy(groundPoint(player.normal,.013+player.jump));
  player.heading.projectOnPlane(player.normal).normalize();if(player.heading.lengthSq()<.01)surfaceNorth(player.normal,player.heading);
  right.crossVectors(player.normal,player.heading).normalize();v2.crossVectors(right,player.normal).normalize();matrix.makeBasis(right,player.normal,v2);quaternion.setFromRotationMatrix(matrix);avatar.root.quaternion.slerp(quaternion,1-Math.exp(-dt*18));
  const step=Math.sin(state.walkPhase)*state.moving;
  avatar.legs[0].rotation.x=step*.53;avatar.legs[1].rotation.x=-step*.53;
  avatar.arms[0].rotation.x=-step*.43;avatar.arms[1].rotation.x=step*.43;
  avatar.body.position.y=Math.abs(Math.sin(state.walkPhase))*state.moving*.018+Math.sin(t*2)*.003;
  avatar.body.rotation.z=Math.cos(state.walkPhase)*state.moving*.035;
  const celebration=Math.max(0,Math.min(1,(state.celebrateUntil-t)*1.4));
  avatar.arms[0].rotation.z=celebration*.95;avatar.arms[1].rotation.z=-celebration*.95;
  if(player.jump>.025){avatar.legs[0].rotation.x+=.2;avatar.legs[1].rotation.x-=.16;avatar.arms[0].rotation.z-=.2;avatar.arms[1].rotation.z+=.2;}
  playerRing.position.copy(groundPoint(player.normal,.040));playerRing.quaternion.setFromUnitVectors(UP,player.normal);
  playerRing.children[0].material.opacity=.5+Math.sin(t*2)*.05;
  playerShadow.position.copy(groundPoint(player.normal,.018));playerShadow.quaternion.setFromUnitVectors(UP,player.normal);playerShadow.children[0].material.opacity=.66/(1+player.jump*1.3);
  if(targetMarker.visible){const pulse=1+Math.sin(t*4)*.10;targetMarker.scale.setScalar(pulse);targetMarker.children[0].material.opacity=.55+Math.sin(t*4)*.15;}
}
function updateLocationUI(){
  let id=biomeAt(player.normal);if(id==='water')id='coast';
  if(id!==state.region){
    state.region=id;const region=REGIONS.find(r=>r.id===id)||REGIONS[0];
    $('region-category').textContent=`${region.category} · ${region.number}`;$('region-name').textContent=region.name;$('region-description').textContent=region.description;$('region-chinese').textContent=region.chinese;
  }
  let nearest=-1,min=.96;
  world.wonders.forEach((w,i)=>{const d=player.normal.distanceTo(w.n)*R;if(d<min){nearest=i;min=d;}});
  const neighbor=neighbors?.nearest(),nearNpc=neighbor?.index??-1;
  const primary=nearNpc>=0?'npc':nearest>=0?'wonder':'none';
  if(nearest!==state.nearby||nearNpc!==state.nearNpc||primary!==state.primary||!state.ready){state.nearby=nearest;state.nearNpc=nearNpc;state.primary=primary;refreshInteraction();}
}
function refreshInteraction(){
  const nearby=state.nearby,npc=neighbors?.entities[state.nearNpc],both=!!npc&&nearby>=0;
  $('interaction').classList.toggle('npc-interaction',state.primary==='npc');
  $('secondary-interaction').hidden=!both;
  if(both){
    $('secondary-label').textContent=state.primary==='npc'?world.wonders[nearby].action:`与${npc.name}聊聊`;
    $('secondary-icon').setAttribute('href',state.primary==='npc'?'#leaf':'#chat');
    $('secondary-interaction').setAttribute('aria-label',`另一互动：${$('secondary-label').textContent}，快捷键 F`);
  }
  if(state.primary==='npc'&&npc){
    $('interaction').classList.remove('wandering');$('interaction-caption').textContent=neighbors.progress.badges.has(npc.id)?'AN OLD FRIEND · 再坐一会儿':'A NEW NEIGHBOR · 初次见面';
    $('interaction-label').textContent=`与${npc.name}聊聊`;$('interaction-icon').setAttribute('href','#chat');$('interaction').setAttribute('aria-label',`与${npc.name}聊天`);
  }else if(nearby>=0){
    const w=world.wonders[nearby],found=state.collected.has(w.id);
    $('interaction').classList.remove('wandering');$('interaction-caption').textContent=found?'A MOMENT TO REMEMBER':'A SMALL WONDER';
    $('interaction-label').textContent=found?`${w.action} · 已发现`:w.action;$('interaction-icon').setAttribute('href',found?'#check':'#arrow');$('interaction').setAttribute('aria-label',w.action);
  }else{
    $('interaction').classList.add('wandering');$('interaction-caption').textContent='FOLLOW YOUR CURIOSITY';$('interaction-label').textContent='四处走走，发现世界';$('interaction-icon').setAttribute('href','#compass');$('interaction').setAttribute('aria-label','打开探索手记');
  }
}
const wonderMessages=['世界又多了一点点温暖。','风，寄来了一封没有字的信。','原来安静，也有自己的声音。','日影走过的地方，都是好时光。','把大海的声音，装进口袋。','脚下的大地，正轻轻呼吸。','这颗星球上，你从不孤单。'];
function interact(kind){
  if(!state.ready||state.transition||neighbors?.blocks())return;
  const chosen=typeof kind==='string'?kind:state.primary;
  if(chosen==='npc'&&state.nearNpc>=0){neighbors.openConversation(state.nearNpc);return;}
  if(state.nearby<0){openJournal();return;}
  const index=state.nearby,w=world.wonders[index];stopWalking();
  player.heading.copy(w.n).sub(player.normal).projectOnPlane(player.normal).normalize();state.celebrateUntil=state.time+1.35;
  world.interact(index,state.time);audio.chime();
  if(state.collected.has(w.id)){notify(wonderMessages[index]);return;}
  state.collected.add(w.id);saveProgress();refreshInteraction();
  $('discovery-name').textContent=w.wonder;$('discovery-description').textContent=wonderMessages[index];$('discovery-number').textContent=`${String(state.collected.size).padStart(2,'0')} / 07`;
  $('discovery').classList.add('visible');state.discoveryUntil=state.time+4.8;
  if(state.collected.size===7){$('discovery-name').textContent='世界，已经在口袋里。';$('discovery-description').textContent='七个小小奇迹，一颗共同的星球。';state.discoveryUntil=state.time+7;}
}
function saveProgress(){
  $('wonder-count').textContent=state.collected.size;
  world.wonders.forEach(w=>w.found=state.collected.has(w.id));
  document.querySelectorAll('.journal-row').forEach((row,i)=>row.classList.toggle('found',state.collected.has(REGIONS[i].id)));
  document.querySelectorAll('#journal-progress>span').forEach((el,i)=>el.classList.toggle('found',state.collected.has(REGIONS[i].id)));
  $('journal-footer').textContent=state.collected.size===7?'七个小小奇迹，一颗共同的星球。':`已发现 ${state.collected.size} / 7 · 不必赶路，慢慢发现。`;
  try{localStorage.setItem('little-planet-wonders-v1',JSON.stringify([...state.collected]));}catch(_){}
}
function createJournal(){
  REGIONS.forEach((region,index)=>{
    const row=document.createElement('button');row.className='journal-row';row.style.setProperty('--biome',region.color);row.setAttribute('aria-label',`前往${region.chinese}`);
    row.innerHTML=`<span class="biome-dot"><svg class="icon"><use href="#check"/></svg></span><span class="journal-location"><strong>${region.name}</strong><small>${region.chinese} · ${region.wonder}</small></span><svg class="icon"><use href="#arrow"/></svg>`;
    row.addEventListener('click',()=>travelTo(index));$('journal-list').appendChild(row);$('journal-progress').appendChild(document.createElement('span'));
  });
}
function openJournal(){if(neighbors?.blocks())return;keys.clear();state.joystick.set(0,0);$('journal').hidden=false;$('journal-button').setAttribute('aria-expanded','true');}
function closeJournal(){$('journal').hidden=true;$('journal-button').setAttribute('aria-expanded','false');}
function openHelp(){if(neighbors?.blocks())return;keys.clear();state.joystick.set(0,0);closeJournal();lastFocus=document.activeElement;$('help-modal').hidden=false;$('help-close').focus();}
function closeHelp(){if($('help-modal').hidden)return;$('help-modal').hidden=true;if(lastFocus?.focus)lastFocus.focus();}


function neighborApproach(npc,preferred){
  for(const distance of [.62,.75,.52])for(const angle of [0,.55,-.55,1.15,-1.15,2.1,-2.1,Math.PI]){
    const tangent=preferred.clone().applyAxisAngle(npc.normal,angle).projectOnPlane(npc.normal).normalize();
    const n=npc.normal.clone().addScaledVector(tangent,distance/R).normalize();
    if(biomeAt(n)==='water')continue;
    if(world.colliders.every(o=>n.distanceTo(o.n)*R>o.radius+.14))return n;
  }
  return npc.normal.clone().addScaledVector(surfaceNorth(npc.normal),.68/R).normalize();
}
function initializeNeighbors(){
  neighbors=createNeighbors({scene,world,player,state,camera,controls,audio,callbacks:{
    prepareOverlay(){
      keys.clear();state.joystick.set(0,0);$('joystick-knob').style.transform='';stopWalking();closeJournal();closeHelp();
      state.zoomTarget=null;controls.enabled=false;controls.enableDamping=false;
      $('discovery').classList.remove('visible');state.discoveryUntil=0;
    },
    resumeInput(){controls.enabled=!state.transition&&!neighbors?.blocks();controls.enableDamping=!state.transition;refreshInteraction();},
    focusCanvas(){renderer.domElement.focus({preventScroll:true});},
    notify,
    focusConversation(npc){
      const saved={mode:state.mode,position:camera.position.clone(),target:controls.target.clone(),width,height};
      player.heading.copy(npc.normal).sub(player.normal).projectOnPlane(player.normal).normalize();
      const mid=player.normal.clone().add(npc.normal).normalize(),n=surfaceNorth(mid),e=new THREE.Vector3().crossVectors(n,mid).normalize(),mobile=width<650;
      const target=groundPoint(mid,mobile?.26:.34).addScaledVector(n,mobile?-.48:-.06);
      const position=mid.clone().multiplyScalar(R+(mobile?3.95:3.45)).addScaledVector(n,-3.20).addScaledVector(e,.25);
      state.mode='walk';setLimits();updateViewUI();cameraFlight(position,target,1050);return saved;
    },
    restoreConversation(saved){
      state.mode='walk';setLimits();updateViewUI();
      if(saved?.mode==='walk'&&saved.width===width&&saved.height===height)cameraFlight(saved.position,saved.target,850);
      else switchView('walk');
    },
    walkTo(npc){
      const away=player.normal.clone().sub(npc.normal).projectOnPlane(npc.normal);
      if(away.lengthSq()<.00001)away.copy(surfaceNorth(npc.normal)).negate();away.normalize();
      placeTarget(neighborApproach(npc,away));if(state.mode==='globe'&&!state.transition)switchView('walk');
    },
    visit(npc){
      stopWalking();keys.clear();state.joystick.set(0,0);$('joystick-knob').style.transform='';
      player.normal.copy(neighborApproach(npc,surfaceNorth(npc.normal).negate()));player.previousNormal.copy(player.normal);
      player.heading.copy(npc.normal).sub(player.normal).projectOnPlane(player.normal).normalize();player.jump=0;player.jumpVelocity=0;state.region='';
      switchView('walk');notify(`${npc.region} · ${npc.name}就在前面，靠近按 E 聊天。`);
    },
    award(npc){world.celebrateAt(npc.normal,state.time);state.celebrateUntil=state.time+2.1;refreshInteraction();}
  }});
}

function wireInput(){
  let press=null;
  renderer.domElement.addEventListener('pointerdown',event=>{if(neighbors?.blocks())return;renderer.domElement.focus({preventScroll:true});if(event.button===0)press={x:event.clientX,y:event.clientY,time:performance.now(),id:event.pointerId};});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!press||event.pointerId!==press.id)return;const click=Math.hypot(event.clientX-press.x,event.clientY-press.y)<6&&performance.now()-press.time<500;press=null;
    if(!click||state.transition||!$('help-modal').hidden||neighbors?.blocks())return;
    pointer.set(event.clientX/width*2-1,-event.clientY/height*2+1);raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObject(world.terrain,false);
    const people=raycaster.intersectObjects(neighbors.entities.map(n=>n.model.root),true);
    if(people.length&&(!hits.length||people[0].distance<=hits[0].distance+.04)){
      let object=people[0].object;while(object&&!object.userData.resident)object=object.parent;
      if(object){const index=neighbors.entities.findIndex(n=>n.id===object.userData.resident);neighbors.requestTalk(index);return;}
    }
    if(!hits.length)return;neighbors.cancelApproach();
    const n=hits[0].point.clone().normalize();
    if(biomeAt(n)==='water'){notify('这里是海。沿着岸边走走吧。');return;}
    placeTarget(n);if(state.mode==='globe')switchView('walk');
  });
  renderer.domElement.addEventListener('pointercancel',()=>press=null);
  renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
  controls.addEventListener('start',()=>{state.userOrbit=true;state.zoomTarget=null;$('scene').classList.add('dragging');});
  controls.addEventListener('end',()=>{state.userOrbit=false;$('scene').classList.remove('dragging');});
  document.addEventListener('keydown',event=>{
    if(neighbors?.handleKey(event))return;
    if(event.code==='Escape'){closeHelp();closeJournal();return;}
    if(!$('help-modal').hidden){if(event.code==='Tab'){event.preventDefault();const close=$('help-close'),start=$('help-start');(document.activeElement===close?start:close).focus();}return;}
    if(event.code==='KeyM'&&!event.repeat){$('journal').hidden?openJournal():closeJournal();return;}
    if(!$('journal').hidden)return;
    if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)){
      neighbors.cancelApproach();event.preventDefault();keys.add(event.code);renderer.domElement.focus({preventScroll:true});
      if(state.mode==='globe'&&!state.transition&&!event.code.startsWith('Shift'))switchView('walk');
    }
    if(event.repeat)return;
    if(event.code==='Space'){if(event.target.tagName==='BUTTON')return;event.preventDefault();jump();}
    if(event.code==='KeyE')interact();
    if(event.code==='KeyF'&&state.nearNpc>=0&&state.nearby>=0)interact(state.primary==='npc'?'wonder':'npc');
    if(event.code==='KeyU')switchView();
    if(event.code==='KeyC')focusPlayer();
    if(event.code==='Equal')zoom(.83);
    if(event.code==='Minus')zoom(1.2);
  });
  document.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>{keys.clear();state.joystick.set(0,0);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();state.joystick.set(0,0);}});
  $('home-button').addEventListener('click',()=>travelTo(0));
  $('view-button').addEventListener('click',()=>switchView());
  $('touch-view').addEventListener('click',()=>switchView());
  $('touch-jump').addEventListener('click',jump);
  $('sound-button').addEventListener('click',()=>audio.toggle().catch(()=>notify('声音暂时无法开启，请再点一次。')));
  $('help-button').addEventListener('click',openHelp);$('help-close').addEventListener('click',closeHelp);$('help-start').addEventListener('click',closeHelp);
  $('help-modal').addEventListener('click',event=>{if(event.target===$('help-modal'))closeHelp();});
  $('journal-button').addEventListener('click',()=>{$('journal').hidden?openJournal():closeJournal();});$('journal-close').addEventListener('click',closeJournal);
  document.addEventListener('pointerdown',event=>{if(!$('journal').contains(event.target)&&!$('journal-button').contains(event.target))closeJournal();});
  $('interaction').addEventListener('click',interact);
  $('secondary-interaction').addEventListener('click',()=>interact(state.primary==='npc'?'wonder':'npc'));
  $('focus-button').addEventListener('click',focusPlayer);$('zoom-in').addEventListener('click',()=>zoom(.83));$('zoom-out').addEventListener('click',()=>zoom(1.2));
  $('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){notify('在独立浏览器窗口打开，可以使用全屏。');}});
  let joystickPointer=null;
  function moveJoystick(event){
    const rect=$('joystick').getBoundingClientRect(),x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2,length=Math.hypot(x,y),scale=Math.min(1,27/Math.max(1,length));
    state.joystick.set(x*scale/27,-y*scale/27);$('joystick-knob').style.transform=`translate(${x*scale}px,${y*scale}px)`;
  }
  $('joystick').addEventListener('pointerdown',event=>{if(neighbors?.blocks())return;neighbors.cancelApproach();event.preventDefault();joystickPointer=event.pointerId;$('joystick').setPointerCapture(event.pointerId);moveJoystick(event);if(state.mode==='globe')switchView('walk');});
  $('joystick').addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer)moveJoystick(event);});
  function releaseJoystick(event){if(event.pointerId!==joystickPointer)return;joystickPointer=null;state.joystick.set(0,0);$('joystick-knob').style.transform='';}
  $('joystick').addEventListener('pointerup',releaseJoystick);$('joystick').addEventListener('pointercancel',releaseJoystick);
  addEventListener('resize',resize);
}

function resize(){
  const old=globeDistance;width=innerWidth;height=innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();globeDistance=desiredGlobeDistance();
  if(state.mode==='globe'&&Math.abs(old-globeDistance)>.01)camera.position.multiplyScalar(globeDistance/old);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.45:1.75));renderer.setSize(width,height);setLimits();
  if(state.transition){state.transition=null;controls.enabled=!neighbors?.blocks();controls.enableDamping=true;}controls.update();
}
function updateCamera(now,dt){
  controls.update();
  if(state.transition){
    const flight=state.transition,x=clamp((now-flight.start)/flight.duration,0,1),t=x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
    quaternion.slerpQuaternions(identity,flight.arc,t);v1.copy(flight.fromDirection).applyQuaternion(quaternion);
    const r=THREE.MathUtils.lerp(flight.fromPosition.length(),flight.toPosition.length(),t);
    camera.position.copy(v1).multiplyScalar(r);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,t);camera.lookAt(controls.target);
    if(x===1){state.transition=null;controls.enabled=!neighbors?.blocks();controls.enableDamping=true;controls.update();player.previousNormal.copy(player.normal);}
  }else if(state.zoomTarget!==null){
    v1.copy(camera.position).sub(controls.target);const distance=THREE.MathUtils.lerp(v1.length(),state.zoomTarget,1-Math.exp(-dt*9));v1.setLength(distance);camera.position.copy(controls.target).add(v1);controls.update();
    if(Math.abs(distance-state.zoomTarget)<.008)state.zoomTarget=null;
  }
  if(state.mode==='walk'&&!state.transition){
    v1.copy(camera.position).sub(groundPoint(player.normal));const height=v1.dot(player.normal);
    if(height<.6)camera.position.addScaledVector(player.normal,.6-height);
    if(camera.position.length()<R+.72)camera.position.setLength(R+.72);
    camera.lookAt(controls.target);
  }
  const fov=state.mode==='globe'?38:43;
  if(Math.abs(camera.fov-fov)>.01){camera.fov=THREE.MathUtils.lerp(camera.fov,fov,1-Math.exp(-dt*4));camera.updateProjectionMatrix();}
  camera.updateMatrixWorld();
}
function frame(now){
  requestAnimationFrame(frame);const dt=clamp((now-last)/1000,0,.045);last=now;if(!state.ready||document.hidden)return;state.time+=dt;
  updateCamera(now,dt);updateMovement(dt);updateAvatar(state.time,dt);world.animate(state.time,dt);neighbors.update(now,state.time,dt);updateLocationUI();
  if(state.discoveryUntil&&state.time>state.discoveryUntil){$('discovery').classList.remove('visible');state.discoveryUntil=0;}
  if(audio.enabled&&state.time-lastChirp>13&&['forest','meadow','highlands'].includes(state.region)){audio.chirp();lastChirp=state.time;}
  renderer.render(scene,camera);
}

async function start(){
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(error){$('load-message').textContent='此浏览器无法启用 WebGL，请使用支持 WebGL 的浏览器打开。';return;}
  renderer.setClearColor('#0d1923',0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.025;
  renderer.setSize(width,height);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=renderer.extensions.has('EXT_color_buffer_float')?THREE.VSMShadowMap:THREE.PCFSoftShadowMap;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Little Planet 三维小游戏');renderer.domElement.setAttribute('role','img');$('scene').appendChild(renderer.domElement);
  scene=new THREE.Scene();
  const hemi=new THREE.HemisphereLight('#e6efdc','#536e5b',1.68);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff2d2',2.48);sun.position.set(-9,15,13);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:55});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;sun.shadow.radius=3.5;sun.shadow.blurSamples=8;scene.add(sun);
  const fill=new THREE.DirectionalLight('#93bec5',.85);fill.position.set(8,3,-12);scene.add(fill);scene.add(new THREE.AmbientLight('#d7e5d4',.18));
  camera=new THREE.PerspectiveCamera(38,width/height,.1,160);globeDistance=desiredGlobeDistance();camera.position.copy(direction(-8,16)).multiplyScalar(globeDistance);
  controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.065;controls.rotateSpeed=.6;controls.zoomSpeed=.68;controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI-.08;controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;controls.update();setLimits();makeStars();
  $('load-progress').style.width='24%';$('load-message').textContent='种下森林，铺好星球上的小路';
  await new Promise(resolve=>setTimeout(resolve,40));
  try{
    world=buildWorld(scene);$('load-progress').style.width='74%';$('load-message').textContent='邻居们正在准备见面的小礼物';
    await new Promise(resolve=>setTimeout(resolve,30));initializePlayer();createJournal();saveProgress();initializeNeighbors();wireInput();
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    await renderer.compileAsync(scene,camera);
    $('load-progress').style.width='100%';state.ready=true;resize();neighbors.update(performance.now(),state.time,.016);updateLocationUI();refreshInteraction();renderer.render(scene,camera);last=performance.now();document.body.classList.add('ready');requestAnimationFrame(frame);
    window.littlePlanet={state,player,world,scene,camera,renderer,travelTo,switchView,neighbors};
  }catch(error){console.error(error);$('load-message').textContent='小星球暂时没能准备好，请重新打开此文件。';}
}
start();
