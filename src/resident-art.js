const svg = (content, label, cls='') => `<svg class="${cls}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${content}</svg>`;

export function badgeSVG(npc, locked=false) {
  const {accent,pale,badge}=npc;
  const points=Array.from({length:32},(_,i)=>{const a=i*Math.PI/16-Math.PI/2,r=i%2?45:49;return `${64+Math.cos(a)*r},${56+Math.sin(a)*r}`;}).join(' ');
  const icons={
    acorn:`<path d="M49 53h30v10c0 15-15 23-15 23S49 78 49 63Z" fill="#ab7548"/><path d="M45 55c0-12 8-20 19-20s19 8 19 20Z" fill="#59734d"/><path d="m63 37 3-9 7-3" fill="none" stroke="#59734d" stroke-width="5" stroke-linecap="round"/><path d="M57 40c3-3 9-5 14-3M56 62v8" stroke="#f1d6a0" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    wheat:`<g stroke="#9b7942" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M61 84V33m0 46L46 47m17 32 17-35"/></g><g fill="#bd9650"><ellipse cx="55" cy="43" rx="4" ry="8" transform="rotate(-40 55 43)"/><ellipse cx="67" cy="42" rx="4" ry="8" transform="rotate(40 67 42)"/><ellipse cx="55" cy="57" rx="4" ry="8" transform="rotate(-40 55 57)"/><ellipse cx="67" cy="56" rx="4" ry="8" transform="rotate(40 67 56)"/><ellipse cx="76" cy="54" rx="4" ry="8" transform="rotate(15 76 54)"/><ellipse cx="47" cy="54" rx="4" ry="8" transform="rotate(-55 47 54)"/><ellipse cx="61" cy="31" rx="4.3" ry="8"/></g><path d="m52 83 15 4 5-6" stroke="#739064" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    snow:`<g stroke="#568b96" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M64 28v56M39.8 42l48.4 28M39.8 70l48.4-28"/><path d="m56 33 8 8 8-8M56 79l8-8 8 8M39 50l11-3 3-11M75 76l3-11 11-3M39 62l11 3 3 11M75 36l3 11 11 3"/></g><circle cx="64" cy="56" r="5" fill="#d2e9e3"/>`,
    sun:`<circle cx="64" cy="52" r="17" fill="#d7aa58"/><g stroke="#b28447" stroke-width="3.4" stroke-linecap="round">${Array.from({length:8},(_,i)=>{let a=i*Math.PI/4;return `<path d="M${64+Math.sin(a)*24} ${52+Math.cos(a)*24}l${Math.sin(a)*5} ${Math.cos(a)*5}"/>`;}).join('')}</g><path d="M35 83c12-15 23-15 31-4 10-9 19-7 28 3" fill="none" stroke="#b7884c" stroke-width="3" stroke-linecap="round"/>`,
    shell:`<path d="M61 78C21 59 40 35 50 43c1-19 17-22 22-6 15-12 29 8 15 20 9 9-7 21-20 22Z" fill="#a4c3a9" stroke="#598f82" stroke-width="2.5" stroke-linejoin="round"/><g stroke="#588e82" stroke-width="2" fill="none" stroke-linecap="round"><path d="m63 76-17-24m18 23-8-35m10 35 2-32m0 32 13-24"/><path d="M41 87q11-7 22 0t22 0"/></g>`,
    ember:`<path d="M65 27c5 16-2 18 1 25 8-1 8-10 8-10 21 17 17 41-9 45-27-2-36-25-18-43-1 13 5 13 5 13 0-14 11-18 13-30Z" fill="#b97b4c"/><path d="M64 54c1 11-11 14-9 23 9 13 26 0 15-12 0 6-5 5-5 5Z" fill="#edc577"/><path d="m42 91 40-5m-37 0 34 6" stroke="#7c6851" stroke-width="4" stroke-linecap="round"/>`,
    star:`<path d="m64 28 9 19 21 3-15 15 3 21-18-10-18 10 3-21-15-15 21-3Z" fill="#b7a268" stroke="#8a805c" stroke-width="2" stroke-linejoin="round"/><path d="m57 49 7-11 5 12" fill="none" stroke="#eadbb0" stroke-width="3" stroke-linecap="round"/><g fill="#8e8aa6"><circle cx="32" cy="36" r="2.5"/><circle cx="95" cy="79" r="2.5"/><path d="m95 27 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>`
  };
  return svg(`<g class="badge-ink${locked?' is-locked':''}"><path d="m42 83-5 37 20-10 13 11-2-37m1 0 17 34 5-18 15 1-21-30" fill="${accent}" opacity=".85"/><polygon points="${points}" fill="${accent}"/><circle cx="64" cy="56" r="41" fill="${pale}"/><circle cx="64" cy="56" r="35.5" fill="#f7efd7"/><circle cx="64" cy="56" r="38" fill="none" stroke="${accent}" stroke-width="1.2" stroke-dasharray="2 3" opacity=".65"/>${icons[badge.motif]}</g>`,`${badge.name}${locked?'，尚未获得':''}`,'friend-badge');
}

export function portraitSVG(npc, happy=false) {
  const {species,fur,cream,outfit,pale}=npc;
  let ears='',hair='',muzzle='',accessory='',eyes='';
  const normalEyes=`<g fill="#36483e" class="portrait-eyes"><ellipse cx="49" cy="63" rx="3.6" ry="5"/><ellipse cx="79" cy="63" rx="3.6" ry="5"/><circle cx="50" cy="61.5" r="1" fill="#fff7df"/><circle cx="80" cy="61.5" r="1" fill="#fff7df"/></g>`;
  const gladEyes=`<g fill="none" stroke="#36483e" stroke-width="3.4" stroke-linecap="round"><path d="M45 64q4-7 8 0m22 0q4-7 8 0"/></g>`;
  eyes=happy?gladEyes:normalEyes;
  if(species==='squirrel'){
    ears=`<ellipse cx="38" cy="35" rx="13" ry="20" fill="${fur}" transform="rotate(-17 38 35)"/><ellipse cx="90" cy="35" rx="13" ry="20" fill="${fur}" transform="rotate(17 90 35)"/><ellipse cx="38" cy="35" rx="6" ry="12" fill="${cream}"/><ellipse cx="90" cy="35" rx="6" ry="12" fill="${cream}"/>`;
    muzzle=`<ellipse cx="64" cy="78" rx="21" ry="15" fill="${cream}"/><path d="M59 73q5-4 10 0l-5 5Z" fill="#69533e"/>`;
    hair=`<path d="M36 44q6-19 30-19 27 0 29 20Z" fill="${outfit}"/><path d="M65 29q1-17 14-17-1 13-14 17" fill="#94ad71"/>`;
    accessory=`<path d="m44 107 31 18" stroke="#9a794b" stroke-width="7"/><path d="m75 111 19 0v13H75Z" fill="#e7cd96"/><path d="m76 112 8 6 9-6" fill="none" stroke="#ba986b" stroke-width="1.5"/>`;
  } else if(species==='sheep'){
    ears=`<ellipse cx="27" cy="58" rx="14" ry="9" fill="${fur}" transform="rotate(-25 27 58)"/><ellipse cx="101" cy="58" rx="14" ry="9" fill="${fur}" transform="rotate(25 101 58)"/>`;
    hair=`<g fill="${cream}"><circle cx="32" cy="43" r="13"/><circle cx="45" cy="34" r="15"/><circle cx="66" cy="31" r="16"/><circle cx="87" cy="36" r="15"/><circle cx="98" cy="47" r="12"/></g><path d="M44 24v-9h40v9" fill="#f5edda"/><ellipse cx="64" cy="14" rx="28" ry="12" fill="#f5edda"/>`;
    muzzle=`<ellipse cx="64" cy="80" rx="17" ry="11" fill="#bba98b"/><path d="m61 77 6 0-3 4Z" fill="#776750"/>`;
    accessory=`<path d="M48 108v20h34v-20" fill="#f4e7c6"/><path d="m56 109 8 6 8-6" fill="none" stroke="#c9aa68" stroke-width="2"/>`;
  } else if(species==='penguin'){
    muzzle=`<path d="M64 49C31 27 29 76 45 91c12 10 32 9 40-1 16-16 10-63-21-41" fill="${cream}"/><path d="m54 77 10-7 10 7-10 8Z" fill="#d7a05a"/>`;
    hair=`<path d="M31 41c0-26 66-27 66 0Z" fill="${outfit}"/><rect x="30" y="36" width="68" height="11" rx="5" fill="#a4c9c6"/><circle cx="66" cy="16" r="9" fill="#e1e7cd"/>`;
    accessory=`<path d="M33 100q31 10 62-1v12q-31 9-62-1Z" fill="#c48267"/><path d="m78 106 11 1-2 20-12-2Z" fill="#d28f71"/>`;
  } else if(species==='fennec'){
    ears=`<path d="M31 58 19 8q23 8 29 35m32 0q6-28 28-35L97 59" fill="${fur}"/><path d="m31 44-4-23 13 22m49 0 13-22-4 23" fill="#edcb9e"/>`;
    muzzle=`<path d="M34 70q12-2 30 7 19-9 30-7-4 28-30 26-27 2-30-26" fill="${cream}"/><path d="m59 74 10 0-5 6Z" fill="#675a43"/>`;
    hair=`<path d="M31 43q30-15 65-1l-4 9q-26-11-61 1Z" fill="#e8cf9b"/><path d="m33 45 5 6-5 39-9-5Z" fill="#e8cf9b"/>`;
    accessory=`<path d="m36 101 28 15 29-15-2 22H37Z" fill="#789a88"/><circle cx="64" cy="114" r="4" fill="#dfb567"/>`;
  } else if(species==='otter'){
    ears=`<circle cx="31" cy="47" r="10" fill="${fur}"/><circle cx="97" cy="47" r="10" fill="${fur}"/>`;
    muzzle=`<ellipse cx="52" cy="78" rx="16" ry="13" fill="${cream}"/><ellipse cx="76" cy="78" rx="16" ry="13" fill="${cream}"/><path d="M57 70q7-6 14 0l-7 8Z" fill="#66513e"/><path d="M39 77h-12m14 6-13 3m59-9h14m-13 6 12 3" stroke="#736448" stroke-width="1.5" stroke-linecap="round"/>`;
    hair=`<ellipse cx="64" cy="36" rx="43" ry="9" fill="#d6bc7c"/><path d="M38 34V23q26-18 52 0v11Z" fill="#dfc686"/><path d="M38 29h52v7H38Z" fill="#688c77"/>`;
    accessory=`<path d="M35 111h59v7H35Z" fill="#e2e7ca"/><path d="m52 125 3-12 11 5 9-4 3 11" fill="#e4ceaa" stroke="#b29e80" stroke-width="1"/>`;
  } else if(species==='dragon'){
    ears=`<path d="m31 58-19-25 23 7m58 0 22-7-18 25" fill="${fur}"/><path d="m37 38-4-27 20 24m23 0 19-24-4 27" fill="#cfb77a"/>`;
    muzzle=`<ellipse cx="64" cy="80" rx="25" ry="17" fill="${cream}"/><circle cx="55" cy="76" r="2" fill="#82764f"/><circle cx="73" cy="76" r="2" fill="#82764f"/>`;
    hair=`<path d="m50 32 7-17 8 15 8-13 8 18" fill="#b0b183"/>`;
    accessory=`<path d="m33 103 31 11 30-11-4 17-26-3-25 7Z" fill="#bd835b"/><path d="M48 117v11h31v-11" fill="#5e6c55"/>`;
  } else {
    ears=`<path d="m29 50-3-30 27 15m23 0 26-15-3 30" fill="${fur}"/>`;
    muzzle=`<path d="M64 53C20 28 24 88 48 91l16-8 16 8c25-6 28-64-16-38" fill="${cream}"/><path d="m57 76 7-8 7 8-7 9Z" fill="#c8a169"/>`;
    accessory=`<g stroke="#a69a71" stroke-width="3" fill="none"><circle cx="47" cy="63" r="16"/><circle cx="81" cy="63" r="16"/><path d="M63 62h2M29 58l-7-4m77 4 7-4"/></g><path d="m37 108 27 17 27-17" fill="#8f8aa3"/><path d="m62 114 2-5 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3Z" fill="#d8c68c"/>`;
  }
  return svg(`<circle cx="64" cy="64" r="61" fill="${pale}"/><circle cx="66" cy="80" r="37" fill="${npc.accent}" opacity=".13"/><path d="M28 128v-16c3-25 67-25 72 0v16" fill="${outfit}"/>${ears}<ellipse cx="64" cy="64" rx="35" ry="36" fill="${fur}"/>${muzzle}${eyes}<ellipse cx="38" cy="76" rx="6" ry="3.5" fill="#d99576" opacity=".47"/><ellipse cx="89" cy="76" rx="6" ry="3.5" fill="#d99576" opacity=".47"/><path d="M59 85q5 5 10 0" fill="none" stroke="#79684e" stroke-width="1.7" stroke-linecap="round"/>${hair}${accessory}`,npc.name,'resident-portrait');
}
