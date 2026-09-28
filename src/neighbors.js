import * as THREE from 'three';
import { R, UP, direction, groundPoint } from './world.js';
import { RESIDENTS } from './residents-data.js';
import { createResidentModel } from './resident-models.js';
import { badgeSVG, portraitSVG } from './resident-art.js';

const $=id=>document.getElementById(id);
const SAVE_KEY='little-planet-neighbors-v1';

export function createNeighbors({scene,world,player,state,camera,controls,audio,callbacks}) {
  const progress={badges:new Set(),visits:{},choices:{}};
  let storageAvailable=true,session=null,bookOpen=false,pendingTalk=-1,bookFocus=null,lastBleep=0;
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
    if(saved&&typeof saved==='object')for(const n of RESIDENTS){
      if(Array.isArray(saved.badges)&&saved.badges.includes(n.id))progress.badges.add(n.id);
      progress.visits[n.id]=Math.max(0,Math.min(100000,Math.floor(Number(saved.visits?.[n.id])||0)));
      const choice=saved.choices?.[n.id];if(Number.isInteger(choice)&&choice>=0&&choice<n.choices.length)progress.choices[n.id]=choice;
    }
  }catch(_){storageAvailable=false;}
  const entities=RESIDENTS.map((data,index)=>{
    const model=createResidentModel(world.models,data),normal=direction(data.lon,data.lat);
    model.root.position.copy(groundPoint(normal,.023));model.root.userData.resident=data.id;scene.add(model.root);
    const localNorth=new THREE.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
    const east=new THREE.Vector3().crossVectors(localNorth,normal).normalize();
    const heading=localNorth.clone().negate().addScaledVector(east,.20).normalize();
    const side=new THREE.Vector3().crossVectors(normal,heading).normalize();heading.crossVectors(side,normal).normalize();
    model.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,normal,heading));
    world.colliders.push({n:normal,radius:.17,resident:data.id});
    const marker=document.createElement('button');marker.className='npc-marker';marker.style.setProperty('--neighbor',data.accent);
    marker.setAttribute('aria-label',`与${data.name}聊天，${data.role}`);marker.dataset.npc=index;
    marker.innerHTML=`<span class="npc-balloon"><svg class="icon"><use href="#chat"/></svg><i></i></span><span class="npc-marker-name">${data.name}<small>${data.role}</small></span>`;
    marker.addEventListener('click',()=>requestTalk(index));$('npc-markers').appendChild(marker);
    return {...data,index,normal,model,marker,heading,heartUntil:-1,distance:Infinity};
  });
  const temp=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3(),projected=new THREE.Vector3(),basis=new THREE.Matrix4(),targetQuaternion=new THREE.Quaternion();
  const near={index:-1,distance:Infinity};

  function save(){
    try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,badges:[...progress.badges],visits:progress.visits,choices:progress.choices}));storageAvailable=true;}
    catch(_){storageAvailable=false;}
  }
  function renderBook(){
    const count=progress.badges.size;$('badge-count').textContent=count;$('badge-total').textContent=count;
    $('neighbors-intro').textContent=matchMedia('(pointer:coarse)').matches?'七位邻居，七份心意。轻轻上滑，认识大家。':'七个地方，七位愿意为你停下来的邻居。';
    $('neighbors-button').setAttribute('aria-label',`打开邻居簿，已获得 ${count} 枚友谊徽章，共 7 枚`);
    $('badge-progress').innerHTML=RESIDENTS.map(n=>`<i class="${progress.badges.has(n.id)?'earned':''}" style="--neighbor:${n.accent}"></i>`).join('');
    $('residents-grid').innerHTML=entities.map(n=>{
      const earned=progress.badges.has(n.id);
      n.marker.classList.toggle('befriended',earned);
      return `<button class="resident-card${earned?' earned':''}" data-resident="${n.index}" style="--neighbor:${n.accent};--neighbor-pale:${n.pale}" aria-label="去${n.region}拜访${n.name}，${earned?'已获得':'尚未获得'}${n.badge.name}徽章">
        <div class="resident-card-art">${portraitSVG(n,earned)}<span class="resident-card-badge">${badgeSVG(n,!earned)}</span></div>
        <div class="resident-card-name"><b>${n.name}</b><span>${n.english}</span></div><p>${n.role} · ${n.region}</p>
        <div class="resident-card-status"><svg class="icon"><use href="${earned?'#check':'#chat'}"/></svg><span>${earned?n.badge.name:'初次聊天，收获徽章'}</span></div>
        <span class="visit-label">${earned?'再去坐坐':'去认识一下'}<svg class="icon"><use href="#arrow"/></svg></span>
      </button>`;
    }).join('')+`<div class="friendship-note"><div class="friendship-note-stamp"><svg class="icon"><use href="${count===7?'#heart':'#leaf'}"/></svg></div><strong>${count===7?'满满一口袋朋友':'世界很小，\n刚好够我们相遇。'}</strong><p>${count===7?'七份心意都收好啦。\n新的日常，留给下一次拜访。':'不必急着集齐。\n每一次停留，都值得。'}</p><span>LITTLE MOMENTS, BIG FRIENDSHIPS</span></div>`;
    $('neighbors-summary').textContent=count===7?'七位邻居，都认识你了。随时回来聊聊新故事。':`已收集 ${count} / 7 · 完整聊完首次见面对话后获得，不会重复发放。`;
    if(!storageAvailable)$('neighbors-summary').textContent+=' 此预览仅保留本次进度，独立打开 HTML 可启用浏览器存档。';
  }
  function setModalClass(){document.body.classList.toggle('talking',!!session);document.body.classList.toggle('neighbors-open',bookOpen);}
  function openBook(){
    if(!state.ready)return;
    if(session)closeConversation(false);
    callbacks.prepareOverlay();bookFocus=document.activeElement;bookOpen=true;pendingTalk=-1;
    renderBook();$('neighbors-modal').hidden=false;$('neighbors-button').setAttribute('aria-expanded','true');setModalClass();$('neighbors-close').focus({preventScroll:true});
  }
  function closeBook(focus=true){
    if(!bookOpen)return;bookOpen=false;$('neighbors-modal').hidden=true;$('neighbors-button').setAttribute('aria-expanded','false');setModalClass();callbacks.resumeInput();
    if(focus){if(bookFocus?.isConnected&&!bookFocus.closest('[hidden]'))bookFocus.focus({preventScroll:true});else callbacks.focusCanvas();}
  }
  function nearest(){
    near.index=-1;near.distance=Infinity;
    for(const n of entities){n.distance=player.normal.distanceTo(n.normal)*R;if(n.distance<=1.05&&n.distance<near.distance){near.index=n.index;near.distance=n.distance;}}
    return near;
  }
  function requestTalk(index){
    if(!state.ready||session||bookOpen)return;
    const n=entities[index];if(!n)return;
    if(state.transition){pendingTalk=index;return;}
    if(player.normal.distanceTo(n.normal)*R<=1.07){openConversation(index);return;}
    pendingTalk=index;callbacks.walkTo(n);callbacks.notify(`走近${n.name}，听听${n.role}的故事。`);
  }
  function visit(index){
    if(!entities[index])return;
    closeBook(false);closeConversation(false);pendingTalk=-1;callbacks.visit(entities[index]);
  }
  function openConversation(index){
    const n=entities[index];if(!state.ready||!n||session||player.normal.distanceTo(n.normal)*R>1.09)return;
    closeBook(false);callbacks.prepareOverlay();pendingTalk=-1;
    const first=!progress.badges.has(n.id),visits=progress.visits[n.id]||0;
    let lines;
    if(first){lines=[{text:n.greeting},{text:n.question,choices:n.choices,kind:'first'}];}
    else{
      const remembered=n.choices[progress.choices[n.id]]?.memory;
      const welcomes=[`呀，你又来啦！${remembered?`我还记得，你喜欢${remembered}。`:'你的脚步声，我已经认得了。'}`,`今天的风，果然把老朋友带来了。${remembered?`刚才还想到你说过的${remembered}呢。`:'来，找个舒服的位置坐一会儿。'}`,`见到你真好！${remembered?`${remembered}，今天还一样喜欢吗？`:'这里一直给你留着一个位置。'}`];
      lines=[{text:welcomes[Math.max(0,visits-1)%welcomes.length]},{text:'今天想聊些什么？我正好有一小段空闲，全部留给你。',kind:'repeat',choices:[
        {label:'最近在忙什么？',reply:n.repeat[visits%n.repeat.length]},
        {label:'给我一个探索小提示吧',reply:n.hint},
        {label:'只是来打个招呼',reply:'原来只是想来看看我呀。这样的拜访，我最喜欢了。'}
      ]}];
    }
    session={index,npc:n,first,lines,cursor:0,stage:'talk',typing:false,started:state.time,choice:progress.choices[n.id],camera:callbacks.focusConversation(n),finished:false,typed:0};
    $('conversation').hidden=false;setModalClass();$('dialogue-bubble').style.setProperty('--neighbor',n.accent);$('dialogue-bubble').style.setProperty('--neighbor-pale',n.pale);
    $('dialogue-name').textContent=n.name;$('dialogue-role').textContent=n.role;$('dialogue-occasion').textContent=first?'初次见面 · 一点点新鲜，一点点期待':`又见面啦 · 第 ${visits+1} 次聊天`;
    $('dialogue-portrait').innerHTML=portraitSVG(n);$('dialogue-bubble').classList.remove('giving-gift');$('dialogue-gift').hidden=true;$('dialogue-message').hidden=false;$('dialogue-book').hidden=true;
    showLine();$('dialogue-next').focus({preventScroll:true});
  }
  function showLine(){
    if(!session)return;
    const node=session.lines[session.cursor];session.characters=Array.from(node.text);session.typed=0;session.typing=true;session.lineStarted=performance.now();session.lineAnnounced=false;
    $('dialogue-typed').textContent='';$('dialogue-live-text').textContent=node.text;$('dialogue-choices').hidden=true;$('dialogue-choices').innerHTML='';
    $('dialogue-next').hidden=false;$('dialogue-next-label').textContent='显示全部';$('dialogue-hint').textContent=matchMedia('(pointer:coarse)').matches?'轻点文字，继续听':'点击文字，或按 E / 空格继续';
    $('dialogue-bubble').classList.add('is-typing');$('dialogue-portrait').innerHTML=portraitSVG(session.npc,session.cursor>1);
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)finishTyping();
  }
  function finishTyping(){
    if(!session||session.stage!=='talk')return;
    session.typing=false;session.typed=session.characters.length;$('dialogue-typed').textContent=session.characters.join('');$('dialogue-bubble').classList.remove('is-typing');
    const node=session.lines[session.cursor];
    if(node.choices){
      $('dialogue-choices').innerHTML=node.choices.map((c,i)=>`<button class="dialogue-choice" data-choice="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${c.label}</b><svg class="icon"><use href="#arrow"/></svg></button>`).join('');
      $('dialogue-choices').hidden=false;$('dialogue-next').hidden=true;$('dialogue-hint').textContent=matchMedia('(pointer:coarse)').matches?'轻点一句你想说的话':'选一句想说的话 · 也可按数字键选择';
      if(document.activeElement===$('dialogue-next'))$('dialogue-choices').querySelector('button')?.focus();
    }else{
      $('dialogue-next').hidden=false;$('dialogue-next-label').textContent=node.gift?'收下这份心意':session.cursor===session.lines.length-1&&!session.first?'下次再见':'继续听';
    }
  }
  function choose(index){
    if(!session||session.stage!=='talk'||session.typing)return;
    const current=session.lines[session.cursor],choice=current.choices?.[index];if(!choice)return;
    if(current.kind==='first')session.choice=index;
    audio.tone(session.npc.pitch*.92,.09,0,.032,'triangle');
    const tail=current.kind==='first'?{text:session.npc.gift,gift:true}:{text:session.npc.farewell};
    session.lines=session.lines.slice(0,session.cursor+1).concat({text:choice.reply},tail);session.cursor++;
    showLine();$('dialogue-next').focus({preventScroll:true});
  }
  function advance(){
    if(!session)return;
    if(session.stage==='gift'){closeConversation();return;}
    if(session.typing){finishTyping();return;}
    const node=session.lines[session.cursor];if(node.choices)return;
    if(session.cursor<session.lines.length-1){session.cursor++;showLine();return;}
    finishConversation();
  }
  function finishConversation(){
    if(!session||session.finished)return;session.finished=true;
    const n=session.npc;progress.visits[n.id]=(progress.visits[n.id]||0)+1;
    if(Number.isInteger(session.choice))progress.choices[n.id]=session.choice;
    const newlyEarned=!progress.badges.has(n.id);
    if(newlyEarned)progress.badges.add(n.id);
    save();renderBook();
    if(!newlyEarned){audio.tone(n.pitch,.20,0,.03);closeConversation();callbacks.notify(`${n.name}很开心见到你。下次再来聊新故事吧。`);return;}
    session.stage='gift';session.typing=false;n.heartUntil=state.time+3.0;
    $('dialogue-bubble').classList.remove('is-typing');$('dialogue-bubble').classList.add('giving-gift');$('dialogue-portrait').innerHTML=portraitSVG(n,true);
    $('dialogue-message').hidden=true;$('dialogue-gift').hidden=false;$('dialogue-book').hidden=false;$('dialogue-next').hidden=false;
    $('gift-art').innerHTML=badgeSVG(n);$('gift-name').textContent=n.badge.name;$('gift-note').textContent=n.badge.note;
    $('gift-save-message').textContent=storageAvailable?'已收藏并自动保存': '已收藏 · 此预览仅保留本次进度';
    $('dialogue-occasion').textContent=`来自${n.name}的一点心意`;$('dialogue-hint').textContent=`友谊徽章 ${progress.badges.size} / 7`;$('dialogue-next-label').textContent='收好，继续散步';
    $('dialogue-live-text').textContent=`获得${n.name}赠送的${n.badge.name}徽章。${n.badge.note} 已收集 ${progress.badges.size} 枚，共 7 枚。`;
    audio.chime();callbacks.award(n);$('neighbors-button').classList.add('new-badge');setTimeout(()=>$('neighbors-button').classList.remove('new-badge'),2300);
    $('dialogue-next').focus({preventScroll:true});
  }
  function closeConversation(focus=true){
    if(!session)return;
    const cameraState=session.camera;session=null;$('conversation').hidden=true;$('dialogue-bubble').classList.remove('giving-gift','is-typing');setModalClass();
    callbacks.restoreConversation(cameraState);callbacks.resumeInput();if(focus)callbacks.focusCanvas();
  }
  function trapFocus(event,panel){
    const all=[...panel.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el=>!el.closest('[hidden]'));
    if(!all.length)return;
    const current=all.indexOf(document.activeElement),next=(current+(event.shiftKey?-1:1)+all.length)%all.length;
    event.preventDefault();all[next].focus();
  }
  function handleKey(event){
    if(session){
      if(event.code==='Tab'){trapFocus(event,$('dialogue-bubble'));return true;}
      if(event.code==='Escape'){event.preventDefault();closeConversation();return true;}
      if(event.repeat){if(['Space','KeyE','Enter'].includes(event.code))event.preventDefault();return true;}
      if(!session.typing&&session.stage==='talk'){
        const options=session.lines[session.cursor].choices;
        if(options){
          const digit=event.code.match(/^(?:Digit|Numpad)([1-3])$/);if(digit){event.preventDefault();choose(Number(digit[1])-1);return true;}
          if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
            const buttons=[...$('dialogue-choices').querySelectorAll('button')],current=buttons.indexOf(document.activeElement),step=['ArrowUp','ArrowLeft'].includes(event.code)?-1:1;
            event.preventDefault();buttons[(Math.max(0,current)+step+buttons.length)%buttons.length]?.focus();return true;
          }
        }
      }
      if(['KeyE','Space','Enter'].includes(event.code)){
        const button=document.activeElement?.closest('button');
        if(button&&$('dialogue-bubble').contains(button)&&event.code!=='KeyE'){
          if(button.dataset.choice!==undefined||button.id==='dialogue-close'||button.id==='dialogue-book')return true;
        }
        event.preventDefault();advance();return true;
      }
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
      return true;
    }
    if(bookOpen){
      if(event.code==='Tab')trapFocus(event,$('neighbors-modal'));
      if(['Escape','KeyB'].includes(event.code)&&!event.repeat){event.preventDefault();closeBook();}
      if(['KeyW','KeyA','KeyS','KeyD','Space'].includes(event.code)&&document.activeElement?.tagName!=='BUTTON')event.preventDefault();
      return true;
    }
    if(event.code==='KeyB'&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&$('help-modal').hidden){event.preventDefault();openBook();return true;}
    return false;
  }
  function update(now,t,dt){
    nearest();
    if(pendingTalk>=0&&!session&&!bookOpen&&!state.transition&&entities[pendingTalk].distance<.88)openConversation(pendingTalk);
    if(session?.stage==='talk'&&session.typing){
      const count=Math.min(session.characters.length,Math.floor((now-session.lineStarted)/25)+1);
      if(count!==session.typed){
        session.typed=count;$('dialogue-typed').textContent=session.characters.slice(0,count).join('');
        if(now-lastBleep>95&&count<session.characters.length){audio.tone(session.npc.pitch+(session.characters[count-1]?.codePointAt(0)||0)%7*24,.055,0,.018,'triangle');lastBleep=now;}
      }
      if(count>=session.characters.length)finishTyping();
    }
    const overlay=!!session||bookOpen;
    for(const n of entities){
      const {model,index,normal}=n,phase=index*1.61,talking=session?.index===index;
      if(n.distance<1.8){forward.copy(player.normal).sub(normal).projectOnPlane(normal);if(forward.lengthSq()<.000001)forward.copy(n.heading);forward.normalize();}
      else forward.copy(n.heading);
      right.crossVectors(normal,forward).normalize();forward.crossVectors(right,normal).normalize();basis.makeBasis(right,normal,forward);targetQuaternion.setFromRotationMatrix(basis);model.root.quaternion.slerp(targetQuaternion,1-Math.exp(-dt*5));
      model.body.position.y=Math.sin(t*2.0+phase)*.005;model.body.rotation.z=Math.sin(t*1.2+phase)*.017;
      model.head.rotation.z=Math.sin(t*.8+phase)*.035+(talking && session?.cursor===1 ? .07 : 0);model.head.rotation.y=Math.sin(t*.6+phase)*.035;
      const blink=(t+phase*1.7)%(4.5+index*.27);const openness=blink<.13?.08:1;
      model.eyes.forEach(eye=>eye.scale.y=openness);model.mouth.scale.y=talking && session?.typing ? .65+Math.abs(Math.sin(t*24))*.95 : 1;
      const greeting=n.distance<1.5&&(t+phase)%14<1.5;
      model.arms[0].rotation.z=greeting?-1.9+Math.sin(t*8)*.15:talking?-.35+Math.sin(t*3.2)*.12:-.10;
      model.arms[1].rotation.z=.10+Math.sin(t*1.6+phase)*.035;
      model.arms[0].rotation.x=talking?-.15:-.03;model.arms[1].rotation.x=-.13;
      if(model.tail)model.tail.rotation.y=Math.sin(t*1.7+phase)*.085;
      model.heart.visible=n.heartUntil>t;
      if(model.heart.visible){const age=3-(n.heartUntil-t);model.heart.position.y=.93+age*.09;model.heart.material.opacity=Math.min(.92,(n.heartUntil-t)*.7);}
      const visible=!overlay&&normal.dot(temp.copy(camera.position).sub(groundPoint(normal)))>.20;
      if(!visible){n.marker.hidden=true;continue;}
      projected.copy(groundPoint(normal,.96)).project(camera);
      const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
      if(projected.z>1||projected.z<0||x<25||x>innerWidth-25||y<86||y>innerHeight-140){n.marker.hidden=true;continue;}
      n.marker.hidden=false;n.marker.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      n.marker.classList.toggle('near',near.index===index);n.marker.classList.toggle('walk-view',state.mode==='walk');
    }
  }
  $('neighbors-button').addEventListener('click',()=>bookOpen?closeBook():openBook());
  $('neighbors-close').addEventListener('click',()=>closeBook());
  $('neighbors-modal').addEventListener('click',event=>{if(event.target===$('neighbors-modal'))closeBook();});
  $('residents-grid').addEventListener('click',event=>{const card=event.target.closest('[data-resident]');if(card)visit(Number(card.dataset.resident));});
  $('dialogue-next').addEventListener('click',advance);$('dialogue-close').addEventListener('click',()=>closeConversation());
  $('dialogue-choices').addEventListener('click',event=>{const button=event.target.closest('[data-choice]');if(button)choose(Number(button.dataset.choice));});
  $('dialogue-message').addEventListener('click',event=>{if(!event.target.closest('button'))advance();});
  $('dialogue-book').addEventListener('click',()=>{closeConversation(false);openBook();});
  renderBook();
  return {entities,progress,nearest,update,handleKey,requestTalk,openConversation,openBook,closeBook,closeConversation,visit,
    cancelApproach(){pendingTalk=-1;},
    blocks(){return !!session||bookOpen;},
    get session(){return session;},get bookOpen(){return bookOpen;},get storageAvailable(){return storageAvailable;}
  };
}
