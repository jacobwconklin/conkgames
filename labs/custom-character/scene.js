// Scene placement and camera controls. Changes affect saved layout, not just live enemies.
function setPlacing(type){if(type==='erase'){respawn();enemies=placements.map(makeEnemy);won=false;confetti=[];}placing=type;pointer=null;clearKeys();$('camera-tools').hidden=!type;$('camera').value=String(Math.round(camera));canvas.style.cursor=type?'crosshair':'default';for(const b of document.querySelectorAll('[data-place]'))b.setAttribute('aria-pressed',String(b.dataset.place===type));if(type)notify(type==='erase'?'Click one of your placed objects to remove it.':type==='enemy2'?'Click open air. enemy2 needs a clear vertical path.':type==='block'?'Click to place blocks. Choose Play when finished.':'Click above a surface to place '+(type==='spike'?'spikes.':'a walking enemy.'),0);else{$('message').textContent='';messageUntil=0;}}
function objectAt(x,y){
 for(const [kind,list] of [['enemy',placements],['spike',spikes],['block',blocks]])for(let i=list.length-1;i>=0;i--){const p=list[i];if(x>=p.x&&x<=p.x+(kind==='enemy'?ENEMY_W:32)&&y>=p.y&&y<=p.y+(kind==='enemy'?ENEMY_H:32))return {x:p.x,y:p.y,w:kind==='enemy'?ENEMY_W:32,h:kind==='enemy'?ENEMY_H:32,kind,index:i};}
 return null;
}
function placementAt(x,y,type=placing||'enemy1'){
 if(type==='erase')return objectAt(x,y);
 const width=type==='enemy1'||type==='enemy2'?ENEMY_W:32;
 const sx=Math.max(0,Math.min(WORLD-width,Math.floor(x/32)*32));let candidate;
 if(type==='block')candidate={x:sx,y:Math.round((y-16-10)/32)*32+10,w:32,h:32};
 else if(type==='enemy2')candidate={x:sx,y:Math.round(y-ENEMY_H/2),w:ENEMY_W,h:ENEMY_H};
 else{
  const height=type==='spike'?32:ENEMY_H;
  const surface=solids().filter(p=>sx>=p.x&&sx+width<=p.x+p.w&&p.y>=y-8).sort((a,b)=>a.y-b.y)[0];
  if(!surface)return null;candidate={x:sx,y:surface.y-height,w:width,h:height};
 }
 if(candidate.y<0||candidate.y+candidate.h>H)return null;
 const area=type==='enemy2'?{...candidate,y:candidate.y-64,h:candidate.h+128}:candidate;
 if(area.y<0||area.y+area.h>H||overlaps(area,spawnArea)||overlaps(area,player)||solids().some(p=>overlaps(area,p))||spikes.some(p=>overlaps(area,p)))return null;
 // Reserve the full patrol lane so later blocks cannot trap a vertical enemy.
 if(placements.some(p=>overlaps(area,{x:p.x,y:p.type==='enemy2'?p.y-64:p.y,w:ENEMY_W,h:p.type==='enemy2'?ENEMY_H+128:ENEMY_H})))return null;
 return candidate;
}
function placeAt(x,y){
 const spot=placementAt(x,y);if(!spot){notify(placing==='erase'?'Click a placed enemy, block, or spike to remove it.':'That space is occupied or too close to the start. Try another spot.',0);return false;}
 if(placing==='erase'){
  const list=spot.kind==='enemy'?placements:spot.kind==='spike'?spikes:blocks;list.splice(spot.index,1);enemies=placements.map(makeEnemy);
 }else if(placing==='block'||placing==='spike'){
  const list=placing==='block'?blocks:spikes;if(list.length>=(placing==='block'?300:100)){notify('This scene is full. Remove a few objects first.',0);return false;}list.push(spot);
 }else{
  if(placements.length>=60){notify('You have 60 enemies. Remove one to make space.',0);return false;}
  const p={x:spot.x,y:spot.y,type:placing};placements.push(p);enemies.push(makeEnemy(p));setPlacing(null);
 }
 saveProject();return true;
}
function canvasPoint(event){const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/W,r.height/H);const x=(event.clientX-r.left-(r.width-W*scale)/2)/scale,y=(event.clientY-r.top-(r.height-H*scale)/2)/scale;return x>=0&&x<=W&&y>=0&&y<=H?{x:x+camera,y}:null;}
canvas.addEventListener('pointermove',event=>pointer=canvasPoint(event));canvas.addEventListener('pointerleave',()=>pointer=null);
canvas.addEventListener('pointerdown',event=>{canvas.focus();if(!placing)return;const point=canvasPoint(event);if(point)placeAt(point.x,point.y);});
$('camera').addEventListener('input',()=>{if(placing)camera=Number($('camera').value);});
