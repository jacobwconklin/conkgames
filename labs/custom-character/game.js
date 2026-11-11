// Game simulation, independent from the editor draft and the pixel shapes.
function respawn(){Object.assign(player,{x:64,y:480-player.h,vx:0,vy:0,grounded:true,facing:'front',walkTime:0,dead:0,invincible:1.4});camera=0;}
function makeEnemy(p){return {...p,w:ENEMY_W,h:ENEMY_H,vx:p.type==='enemy2'?0:-65,vy:0,grounded:true,dead:0,originY:p.y,direction:-1,animTime:0};}
function restart(){respawn();enemies=placements.map(makeEnemy);won=false;confetti=[];setPlacing(null);notify('Fresh start. Your art and level are ready.');}
function faint(){if(player.dead||player.invincible>0)return;player.dead=.9;player.vx=player.vy=0;notify('Fainted! Back to the start…',1.4);}
function moveBody(body,dt){
 const platforms=solids();body.x+=body.vx*dt;let wall=false;
 for(const p of platforms)if(overlaps(body,p)){if(body.vx>0)body.x=p.x-body.w;else if(body.vx<0)body.x=p.x+p.w;wall=true;}
 if(body.x<0||body.x+body.w>WORLD){body.x=Math.max(0,Math.min(WORLD-body.w,body.x));wall=true;}
 body.vy+=GRAVITY*dt;const oldY=body.y;body.y+=body.vy*dt;body.grounded=false;
 for(const p of platforms)if(overlaps(body,p)){
  if(body.vy>=0&&oldY+body.h<=p.y+1){body.y=p.y-body.h;body.vy=0;body.grounded=true;}
  else if(body.vy<0&&oldY>=p.y+p.h-1){body.y=p.y+p.h;body.vy=0;}
 }
 return wall;
}
function spikeHitbox(spike){return {x:spike.x,y:spike.y,w:SIZE,h:SIZE};}
function drawHitboxes(){
 if(!showHitboxes)return;
 ctx.save();ctx.globalAlpha=1;ctx.lineWidth=2;ctx.setLineDash([]);
 const outline=(body,color)=>{ctx.strokeStyle=color;ctx.strokeRect(body.x,body.y,body.w,body.h);};
 outline(player,'#00e5ff');
 for(const enemy of enemies)if(!enemy.dead){outline(enemy,'#ffb347');ctx.strokeStyle='#55ff77';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(enemy.x,enemy.y);ctx.lineTo(enemy.x+enemy.w,enemy.y);ctx.stroke();ctx.lineWidth=2;}
 for(const spike of spikes)outline(spikeHitbox(spike),'#ff60a8');
 ctx.restore();
}
function currentPose(){if(player.dead)return'faint';if(!player.grounded)return'jump';if(player.vx)return ['walk1','sideways','walk2','sideways'][Math.floor(player.walkTime/.12)%4];return player.facing==='front'?'front':'sideways';}
function update(dt){
 clock+=dt;if(messageUntil&&clock>messageUntil&&!placing){$('message').textContent='';messageUntil=0;}
 if(placing||$('pixel-editor').open||$('instructions').open)return;
 updateConfetti(dt);
 if(player.dead){player.dead=Math.max(0,player.dead-dt);if(!player.dead)respawn();return;}
 player.invincible=Math.max(0,player.invincible-dt);
 const direction=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
 player.vx=direction*245;
 if(player.vx)player.facing=direction<0?'left':'right';else if(keys.has('ArrowDown')||keys.has('KeyS'))player.facing='front';
 if(jumpQueued&&player.grounded){player.vy=-590;player.grounded=false;}jumpQueued=false;
 const oldBottom=player.y+player.h;moveBody(player,dt);
 if(player.vx&&player.grounded)player.walkTime+=dt;else if(player.grounded)player.walkTime=0;
 for(const enemy of enemies){
  if(enemy.dead){enemy.dead=Math.max(.001,enemy.dead-dt);continue;}
  enemy.animTime=(enemy.animTime||0)+dt;
  const oldEnemyY=enemy.y;
  if(enemy.type==='enemy2'){
   enemy.y+=enemy.direction*80*dt;
   const minY=Math.max(0,enemy.originY-64),maxY=Math.min(H-enemy.h,enemy.originY+64);
   if(enemy.y<minY||enemy.y>maxY){enemy.y=Math.max(minY,Math.min(maxY,enemy.y));enemy.direction*=-1;}
   if(solids().some(p=>overlaps(enemy,p))){enemy.y=oldEnemyY;enemy.direction*=-1;}
  }else{
   if(enemy.grounded){const ahead=enemy.vx>0?enemy.x+enemy.w+3:enemy.x-3;if(!solids().some(p=>ahead>=p.x&&ahead<=p.x+p.w&&Math.abs(p.y-enemy.y-enemy.h)<3))enemy.vx*=-1;}
   if(moveBody(enemy,dt))enemy.vx*=-1;
  }
  if(overlaps(player,enemy)){
   if(player.vy>0&&oldBottom<=oldEnemyY+8){enemy.dead=.45;player.y=enemy.y-player.h;player.vy=-380;player.grounded=false;notify('Stomp! Nice landing.',1.3);}
   else {faint();if(player.dead)break;}
  }
 }
 enemies=enemies.filter(e=>e.dead!==.001&&e.y<H+100);
 for(const spike of spikes)if(overlaps(player,spikeHitbox(spike)))faint();
 if(player.y>H+40){player.invincible=0;player.y=H-50;faint();}
 if(player.x+player.w>=2688&&player.y+player.h>=352&&player.y<480&&!player.dead&&!won){won=true;startConfetti();notify('You made it! Keep creating, or restart to try again.',6);}
 camera=Math.max(0,Math.min(WORLD-W,player.x-W*.36));
}
function enemyPose(enemy){const frame=Math.floor((enemy.animTime||0)/.16)%5;return enemy.type+(enemy.dead?'Faint':'Frame'+(enemy.type==='enemy2'&&enemy.direction>0?4-frame:frame));}
function sprite(image,x,y,w,h,flip=false,fallback=false,flipY=false){
 ctx.save();ctx.translate(Math.round(x+w/2),Math.round(y+h));if(flip)ctx.scale(-1,1);if(flipY){ctx.translate(0,-h);ctx.scale(1,-1);}
 if(image){ctx.drawImage(image,-w/2,-h,w,h);}else if(fallback){ctx.fillStyle='#fff';ctx.fillRect(-w/2,-h,w,h);}ctx.restore();
}

// Two-block artwork surrounds the centered one-block-wide collision body.
function playerSpriteBox(pose){return {x:player.x-SIZE/2,y:player.y,w:SIZE*2,h:SIZE*2};}
function drawPlayer(pose){const box=playerSpriteBox(pose);const flip=player.facing==='left'&&['sideways','walk1','walk2'].includes(pose);if(flip)box.x=2*(player.x+player.w/2)-box.x-box.w;sprite(art.character[pose],box.x,box.y,box.w,box.h,flip,true);}
function drawFlameParticles(enemy){
 const direction=1,edge=enemy.y+enemy.h;
 for(let i=0;i<7;i++){const age=((enemy.animTime||0)*1.7+i/7)%1;ctx.globalAlpha=(1-age)*.8;ctx.fillStyle=i%2?'#ffe095':'#f59155';const x=enemy.x+enemy.w/2+Math.sin(i*7+age*3)*(8+age*18);ctx.fillRect(Math.round(x),Math.round(edge+direction*age*22),2+(i%2),2+(i%2));}
 ctx.globalAlpha=1;
}

function tiledGround(p){
 ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();
 for(let y=0;y<p.h;y+=32)for(let x=0;x<p.w;x+=32){const variant=(Math.floor((p.x+x)/32)+Math.floor(y/32))%2?'B':'A';const tile=art.scene[(y===0?'top':'bottom')+variant];if(tile)ctx.drawImage(tile,p.x+x,p.y+y,32,32);}
 ctx.restore();
}
function draw(){
 ctx.imageSmoothingEnabled=false;const skyGradient=ctx.createLinearGradient(0,0,0,H);skyGradient.addColorStop(0,skyColor);skyGradient.addColorStop(1,skyBottomColor);ctx.fillStyle=skyGradient;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#ffffff';ctx.globalAlpha=.25;for(let i=0;i<36;i++)ctx.fillRect((i*137+31-camera*.13+W*2)%W,35+(i*67)%250,2,2);ctx.globalAlpha=1;
 const paused=placing||$('pixel-editor').open||$('instructions').open;
 // Decoration phase is advanced only during play by the UI animation loop.
 for(let i=0;i<6;i++){const id=['floating1','floating2','floating3'][i%3];const x=((decorationTime*(12+i*3)+i*219-camera*.18)%(W+80)+(W+80))%(W+80)-40;const y=65+(i*43)%210+Math.sin(decorationTime*.8+i)*10;sprite(art.scene[id],x,y,36,36,id!=='floating1'&&i%2===1);}
 ctx.save();ctx.translate(-Math.round(camera),0);
 for(const p of basePlatforms)tiledGround(p);
 for(const p of blocks)sprite(art.scene.block,p.x,p.y,32,32);
 for(const p of spikes)sprite(art.scene.spike,p.x,p.y,32,32);
 ctx.fillStyle='#cfdded';ctx.font='12px monospace';ctx.fillText('START / Your world starts here',35,535);
 ctx.fillStyle='#d9d0ee';ctx.fillRect(2688,352,4,128);ctx.fillStyle=won?'#ffe29a':'#b1eed6';ctx.beginPath();ctx.moveTo(2692,352);ctx.lineTo(2752,371);ctx.lineTo(2692,392);ctx.fill();
 for(const e of enemies){if(e.dead)ctx.globalAlpha=e.dead/.45;sprite(art.enemy[enemyPose(e)],e.x,e.y,e.w,e.h,e.vx>0);if(e.type==='enemy2'&&!e.dead)drawFlameParticles(e);ctx.globalAlpha=1;}
 const pose=currentPose();if(player.invincible>0&&Math.floor(clock*10)%2===0)ctx.globalAlpha=.5;drawPlayer(pose);ctx.globalAlpha=1;
 if(placing){ctx.strokeStyle='#ffffff16';ctx.lineWidth=1;for(let x=Math.floor(camera/32)*32;x<camera+W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=32){ctx.beginPath();ctx.moveTo(camera,y);ctx.lineTo(camera+W,y);ctx.stroke();}
  if(pointer){const spot=placementAt(pointer.x,pointer.y,placing);if(spot){ctx.globalAlpha=.65;if(placing!=='erase')sprite(placing==='block'||placing==='spike'?art.scene[placing]:art.enemy[placing+'Frame0'],spot.x,spot.y,spot.w,spot.h);ctx.globalAlpha=1;ctx.strokeStyle=placing==='erase'?'#ff7777':'#b1eed6';ctx.strokeRect(spot.x,spot.y,spot.w,spot.h);if(placing==='enemy2'){ctx.setLineDash([4,4]);ctx.strokeRect(spot.x,spot.y-64,spot.w,spot.h+128);ctx.setLineDash([]);}}else{ctx.fillStyle='#ffb0b0';ctx.fillText(placing==='erase'?'Click a placed object':'Choose an open space',Math.min(pointer.x,camera+W-180),Math.max(20,pointer.y));}}
 }
 drawHitboxes();
 ctx.restore();drawConfetti();$('state').textContent='Pose: '+poses.find(p=>p[0]===pose)[1]+(art.character[pose]?'':' · white square');
 for(const el of $('slots').children)el.classList.toggle('active',tab==='character'&&el.dataset.pose===pose);
}
let decorationTime=0;
function frame(time){if(!lastTime)lastTime=time;accumulator+=Math.min((time-lastTime)/1000,.1);lastTime=time;while(accumulator>=1/120){update(1/120);if(!placing&&!$('pixel-editor').open&&!$('instructions').open)decorationTime+=1/120;accumulator-=1/120;}draw();requestAnimationFrame(frame);}

// Screen-space celebration, bounded in duration and particle count.
let confetti=[];
function startConfetti(){confetti=Array.from({length:180},(_,i)=>({x:Math.random()*W,y:-Math.random()*H*.8,vx:(Math.random()-.5)*70,vy:100+Math.random()*120,life:5+Math.random()*2,color:palette[7+i%9],phase:Math.random()*Math.PI*2}));}
function updateConfetti(dt){for(const p of confetti){p.life-=dt;p.x+=(p.vx+Math.sin(p.phase)*20)*dt;p.y+=p.vy*dt;p.phase+=dt*5;}confetti=confetti.filter(p=>p.life>0&&p.y<H+20);}
function drawConfetti(){for(const p of confetti){ctx.globalAlpha=Math.min(1,p.life);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),3+Math.abs(Math.sin(p.phase))*5,4);}ctx.globalAlpha=1;}
