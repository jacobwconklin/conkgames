// Shared project model and editable, code-native pixel defaults.
const $ = id => document.getElementById(id);
const W=1100, H=560, WORLD=2816, SIZE=32, ENEMY_W=64, ENEMY_H=64, GRAVITY=1550;
const canvas=$('game'), ctx=canvas.getContext('2d');
const palette=['#17111f','#ffffff','#73717d','#c6c5cf','#653c29','#b4784d','#efb58a','#e44b60','#f59155','#ffe095','#38875c','#a1df88','#3d6acb','#83c8e5','#7852a4','#e39ac3'];
const colorNames=['Ink','White','Slate','Silver','Dark brown','Brown','Peach','Red','Orange','Yellow','Green','Mint','Blue','Sky','Purple','Pink'];
const poses=[['front','Front'],['sideways','Sideways'],['walk1','Walk 1'],['walk2','Walk 2'],['jump','Jump'],['faint','Faint']];
const catalogs={character:poses,enemy:['enemy1','enemy2'].flatMap(type=>[...Array.from({length:5},(_,i)=>[type+'Frame'+i,type+' · '+(i+1)]),[type+'Faint',type+' faint']]),scene:[['topA','Ground top A'],['topB','Ground top B'],['bottomA','Ground bottom A'],['bottomB','Ground bottom B'],['block','Block'],['spike','Spikes'],['floating1','floating1'],['floating2','floating2'],['floating3','floating3']]};
const blankPixels=(height=32)=>Array(32*height).fill(null);
// Nearest-neighbor migration fits old square artwork inside a two-block player canvas.
function tallPlayerPixels(source){
 const result=blankPixels(64),occupied=source.map((c,i)=>c?i:-1).filter(i=>i>=0);
 if(!occupied.length)return result;
 const left=Math.min(...occupied.map(i=>i%32)),right=Math.max(...occupied.map(i=>i%32));
 const top=Math.min(...occupied.map(i=>Math.floor(i/32))),bottom=Math.max(...occupied.map(i=>Math.floor(i/32)));
 const scale=Math.min(32/(right-left+1),64/(bottom-top+1)),w=Math.round((right-left+1)*scale),h=Math.round((bottom-top+1)*scale),offset=Math.floor((32-w)/2);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)result[(64-h+y)*32+offset+x]=source[(top+Math.min(bottom-top,Math.floor(y/scale)))*32+left+Math.min(right-left,Math.floor(x/scale))];
 return result;
}
// Fit a saved tall canvas into the middle half of the square, preserving world proportions.
function squarePlayerPixels(source){
 const result=blankPixels();
 for(let y=0;y<32;y++)for(let x=0;x<16;x++)result[y*32+x+8]=source[(y*2)*32+x*2]||source[(y*2)*32+x*2+1]||source[(y*2+1)*32+x*2]||source[(y*2+1)*32+x*2+1];
 return result;
}
function defaultPixels(group,id,wheelDirection=1) {
 const pixels=blankPixels();
 const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(i>=0&&i<32&&j>=0&&j<32)pixels[j*32+i]=palette[c];};
 if(group==='character') return ORIGINAL_PLAYER_PIXELS[id].slice();
 if(group==='enemy') {
  const fire=id.startsWith('enemy2'), faint=id.endsWith('Faint');
  const frame=Number(id.match(/Frame(\d)$/)?.[1]||0);
  if(faint){rect(4,25,24,5,fire?8:2);rect(8,24,4,2,0);rect(20,24,4,2,0);return pixels;}
  if(fire){
   // Five distinct downward flame silhouettes beneath the familiar head.
   for(let x=7;x<25;x++){
    const tip=23+((x*3+frame*5)%9);rect(x,16,1,tip-16,7);
    const inner=20+((x+frame*2)%7);if(x>9&&x<23)rect(x,16,1,inner-16,8);
    if(x>12&&x<20)rect(x,16,1,5+(frame+x)%4,9);
   }
   rect(7,5,18,12,8);rect(10,2,12,3,9);rect(3,9,4,3,3);rect(25,9,4,3,3);rect(14,0,4,2,3);
   rect(10,8,4,frame===2?2:4,0);rect(19,8,4,frame===3?2:4,0);
   rect(12,14,8,1,0);if(frame===1||frame===4)rect(14,13,4,3,0);
  }else{
   // Rotate a complete pixel face in five equal 72-degree steps.
   for(let y=4;y<28;y++)for(let x=4;x<28;x++)if((x-15.5)**2+(y-15.5)**2<145)rect(x,y,1,1,2);
   rect(10,8,12,16,3);rect(8,11,16,10,3);
   for(const [x,y,w,h] of [[14,0,4,5],[14,27,4,5],[0,14,5,4],[27,14,5,4],[4,4,4,4],[24,4,4,4],[4,24,4,4],[24,24,4,4]])rect(x,y,w,h,0);
   if(frame===0){rect(10,11,3,5,0);rect(19,11,3,5,0);rect(12,21,8,2,0);}
   if(frame===1){rect(9,12,5,2,0);rect(19,10,3,6,0);rect(13,19,6,5,0);}
   if(frame===2){rect(9,11,5,2,0);rect(18,11,5,2,0);rect(13,18,6,2,0);rect(11,20,10,2,0);}
   if(frame===3){rect(10,10,3,5,0);rect(19,10,3,5,0);rect(14,19,4,5,0);}
   if(frame===4){rect(10,13,3,2,0);rect(19,13,3,2,0);rect(11,20,10,2,0);rect(12,22,8,2,0);}
   const rotated=blankPixels(),angle=wheelDirection*frame*Math.PI*2/5,c=Math.cos(angle),sn=Math.sin(angle);
   for(let y=0;y<32;y++)for(let x=0;x<32;x++){const dx=x-15.5,dy=y-15.5,sx=Math.round(dx*c+dy*sn+15.5),sy=Math.round(-dx*sn+dy*c+15.5);if(sx>=0&&sx<32&&sy>=0&&sy<32)rotated[y*32+x]=pixels[sy*32+sx];}
   return rotated;
  }
 } else if(id.startsWith('top')||id.startsWith('bottom')||id==='block') {
  rect(0,0,32,32,4); rect(0,16,32,2,5); rect(15,0,2,16,5); rect(5,18,2,14,5); rect(26,18,2,14,5);
  if(id.startsWith('top')) {rect(0,0,32,6,10);rect(0,0,32,2,11);rect(id==='topA'?4:19,6,6,3,10);}
  if(id==='bottomB') {rect(10,5,3,3,5);rect(23,24,4,3,5);}
  if(id==='block') {rect(0,0,32,3,9);rect(0,0,3,32,9);rect(29,0,3,32,4);rect(0,29,32,3,4);}
 } else if(id==='spike') {
  for(let x=0;x<32;x++) {const height=24-Math.abs((x%16)-7.5)*3; rect(x,32-Math.ceil(height),1,Math.ceil(height),3);}
  rect(0,29,32,3,2);
 } else if(id==='floating1') {
  rect(8,14,16,7,13);rect(19,10,7,8,13);rect(25,14,5,3,9);rect(22,12,2,2,0);rect(4,10,8,6,12);rect(9,8,4,9,12);rect(3,18,5,3,12);
 } else if(id==='floating2') {
  rect(4,7,10,10,15);rect(18,7,10,10,15);rect(6,18,8,8,14);rect(18,18,8,8,14);rect(14,11,4,16,0);rect(11,6,3,4,0);rect(18,6,3,4,0);
 } else if(id==='floating3') {
  for(let y=2;y<23;y++)for(let x=6;x<26;x++)if(((x-16)/10)**2+((y-12)/11)**2<1)rect(x,y,1,1,7);
  rect(10,5,3,7,15);rect(14,23,4,3,7);rect(16,26,1,6,3);
 }
 return pixels;
}

// Identify shipped v2 skins so upgrading replaces defaults without losing custom art.
function legacyEnemyPixels(type){
 const data=blankPixels();const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)data[j*32+i]=palette[c];};
 if(type==='spring'){
  rect(7,9,18,10,8);rect(10,5,12,4,9);rect(3,13,4,3,3);rect(25,13,4,3,3);rect(14,1,4,4,3);
  rect(8,20,16,2,3);rect(11,22,10,2,2);rect(8,24,16,2,3);rect(11,26,10,2,2);rect(6,28,20,3,0);
 }else{
  for(let y=4;y<28;y++)for(let x=4;x<28;x++)if((x-15.5)**2+(y-15.5)**2<145)rect(x,y,1,1,2);
  rect(10,8,12,16,3);rect(8,11,16,10,3);
  for(const [x,y,w,h] of [[14,0,4,5],[14,27,4,5],[0,14,5,4],[27,14,5,4],[4,4,4,4],[24,4,4,4],[4,24,4,4],[24,24,4,4]])rect(x,y,w,h,0);
 }
 rect(10,12,4,5,0);rect(19,12,4,5,0);rect(12,20,8,2,0);return data;
}

const ORIGINAL_SPRITES={}, pixels={}, art={character:{},enemy:{},scene:{}};
for(const [group,entries] of Object.entries(catalogs)) for(const [id] of entries) { const key=group+'.'+id; ORIGINAL_SPRITES['original.'+key]=Object.freeze(defaultPixels(group,id)); pixels[key]=ORIGINAL_SPRITES['original.'+key].slice(); }
// Protected originals are bundled with the page and never loaded from saved projects.
Object.freeze(ORIGINAL_SPRITES);
function pixelCanvas(data) {
 const c=document.createElement('canvas'); c.width=32; c.height=data.length/32; const g=c.getContext('2d');
 data.forEach((color,i)=>{if(color){g.fillStyle=color;g.fillRect(i%32,Math.floor(i/32),1,1);}}); return c;
}
function bake(group,id) { const data=pixels[group+'.'+id]; art[group][id]=data.some(Boolean)?pixelCanvas(data):null; }
function bakeAll() { for(const [group,entries] of Object.entries(catalogs))for(const [id] of entries)bake(group,id); }
const basePlatforms=[[0,15,26,3],[30,15,23,3],[57,15,31,3],[8,12,5,1],[15,10,5,1],[24,8,5,1],[33,12,6,1],[42,9,5,1],[49,12,6,1],[60,12,5,1],[68,10,5,1],[77,12,5,1]].map(([x,y,w,h])=>({x:x*SIZE,y:y*SIZE,w:w*SIZE,h:h*SIZE}));
let blocks=[], spikes=[], placements=[], enemies=[], skyColor='#252d4b', skyBottomColor='#8a7caa';
const solids=()=>basePlatforms.concat(blocks);
let tab='character', camera=0, placing=null, pointer=null, clock=0, lastTime=0, accumulator=0, messageUntil=0, won=false, jumpQueued=false;
const keys=new Set();
const player={x:64,y:416,w:32,h:64,vx:0,vy:0,grounded:true,facing:'front',walkTime:0,dead:0,invincible:0};
const spawnArea={x:32,y:384,w:96,h:96};
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function notify(text,seconds=4){$('message').textContent=text;messageUntil=seconds?clock+seconds:0;}
function clearKeys(){keys.clear();jumpQueued=false;}
const STORAGE_KEY='conkgames-custom-character-v2';
function saveProject(){
 try {localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,blockGridVersion:1,playerDefaultsVersion:6,enemyFramesVersion:2,enemySizeVersion:2,pixels,blocks,spikes,placements,skyColor,skyBottomColor}));}
 catch {notify('Session only — storage unavailable');}
}
function restoreProject(){
 try {
  const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return;
  const data=JSON.parse(raw); if(data.version!==2)return;
  if(data.pixels&&!data.pixels['character.sideways'])data.pixels['character.sideways']=data.pixels['character.idle']||data.pixels['character.right'];
  // Adopt saved right-facing frames for the shared animation.
  for(const [id,old] of [['sideways','right'],['walk1','right1'],['walk2','right2']]){
   if(data.pixels&&!data.pixels['character.'+id]&&data.pixels['character.'+old])data.pixels['character.'+id]=data.pixels['character.'+old];
  }
  // Keep existing placements and legacy custom enemy art as frame 1.
  for(const [oldId,newId] of [['wheel','enemy1Frame0'],['spring','enemy2Frame0'],['wheelFaint','enemy1Faint'],['springFaint','enemy2Faint']]){
   const saved=data.pixels?.['enemy.'+oldId];
   const shippedDefault=(oldId==='wheel'||oldId==='spring')&&JSON.stringify(saved)===JSON.stringify(legacyEnemyPixels(oldId));
   if(saved&&!shippedDefault&&!data.pixels['enemy.'+newId])data.pixels['enemy.'+newId]=saved;
  }
  if(Array.isArray(data.placements))data.placements=data.placements.map(p=>({...p,type:p.type==='wheel'?'enemy1':p.type==='spring'?'enemy2':p.type}));
  // Preserve drawings saved before the floating slots were renamed.
  for(const [oldId,newId] of [['bird','floating1'],['butterfly','floating2'],['balloon','floating3']]) {
   if(data.pixels && !data.pixels['scene.'+newId] && data.pixels['scene.'+oldId]) data.pixels['scene.'+newId]=data.pixels['scene.'+oldId];
  }
  for(const key of Object.keys(pixels))if(Array.isArray(data.pixels?.[key])&&(data.pixels[key].length===pixels[key].length||(key.startsWith('character.')&&data.pixels[key].length===2048))&&data.pixels[key].every(c=>c===null||(typeof c==='string'&&/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c)))){
   const saved=data.pixels[key];
   const oldPlayerDefault=!data.playerDefaultsVersion&&key.startsWith('character.')&&(saved.every(c=>c===null)||saved.every(c=>c==='#ffffff'));
   const id=key.slice(10),legacyId=id==='sideways'?'idle':id;
   const legacy=LEGACY_PLAYER_PIXELS[legacyId];
   const oldPlayerArt=key.startsWith('character.')&&(isReplacedPlayerDefault(id,saved)||[PREVIOUS_PLAYER_PIXELS[id],SOURCE_PLAYER_PIXELS[legacyId],legacy,legacy&&tallPlayerPixels(legacy)].some(original=>original&&JSON.stringify(saved)===JSON.stringify(original)));
   const oldWheelFrame=key.startsWith('enemy.enemy1Frame')&&JSON.stringify(saved)===JSON.stringify(defaultPixels('enemy',key.slice(6),-1));
   if(!oldPlayerDefault&&!oldPlayerArt&&!oldWheelFrame)pixels[key]=key.startsWith('character.')&&saved.length===2048?squarePlayerPixels(saved):saved;
  }
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=WORLD-32&&p.y>=0&&p.y<=H-28;
  blocks=(Array.isArray(data.blocks)?data.blocks:[]).filter(valid).slice(0,300).map(p=>({x:p.x,y:p.y,w:32,h:32}));
  spikes=(Array.isArray(data.spikes)?data.spikes:[]).filter(valid).slice(0,100).map(p=>({x:p.x,y:p.y,w:32,h:32}));
  placements=(Array.isArray(data.placements)?data.placements:[]).filter(p=>valid(p)&&['enemy1','enemy2'].includes(p.type)).slice(0,60).map(p=>({x:p.x,y:p.y,type:p.type}));
  if(!data.enemySizeVersion)for(const p of placements){
   if(p.type==='enemy1'){const support=solids().find(s=>Math.abs(s.y-(p.y+28))<2&&p.x>=s.x&&p.x<s.x+s.w);if(support){p.x=Math.max(support.x,Math.min(support.x+support.w-ENEMY_W,p.x));p.y=support.y-ENEMY_H;}else p.y-=28;}
   else p.y=Math.max(64,p.y-14);
  }
  if(!data.blockGridVersion){
   const snap=value=>Math.round(value/SIZE)*SIZE;
   for(const p of blocks){p.x=Math.min(WORLD-SIZE,snap(p.x));p.y=Math.min(512,snap(p.y));}
   for(const p of spikes){p.x=Math.min(WORLD-SIZE,snap(p.x));p.y=Math.min(512,snap(p.y));}
   for(const p of placements){p.x=Math.min(WORLD-ENEMY_W,snap(p.x));p.y=snap(p.y);
    if(p.type==='enemy1'){const surface=solids().filter(s=>p.x>=s.x&&p.x+ENEMY_W<=s.x+s.w&&s.y>=p.y).sort((a,b)=>a.y-b.y)[0];if(surface)p.y=surface.y-ENEMY_H;}
    else p.y=Math.max(64,Math.min(416,p.y));
   }
  }
  if(/^#[0-9a-f]{6}$/i.test(data.skyColor))skyColor=data.skyColor;
  if(/^#[0-9a-f]{6}$/i.test(data.skyBottomColor))skyBottomColor=data.skyBottomColor;
 } catch {notify('Session only — saved project unavailable');}
}
