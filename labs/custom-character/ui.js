// Gallery, controls, and lifecycle.
function renderSlots(){
 $('slots').replaceChildren();
 for(const [id,label] of catalogs[tab]){const group=tab,slot=document.createElement('div');slot.className='slot';slot.dataset.pose=id;const button=document.createElement('button');button.className='upload';button.setAttribute('aria-label','Edit '+label);const thumbnail=pixelCanvas(pixels[group+'.'+id]);thumbnail.style.width='48px';if(group==='character'&&!art[group][id]){const g=thumbnail.getContext('2d');g.fillStyle='#fff';g.fillRect(5,5,22,22);}thumbnail.setAttribute('aria-hidden','true');const name=document.createElement('span');name.textContent=label;button.append(thumbnail,name);button.onclick=()=>openEditor(group,id,label);slot.append(button);$('slots').append(slot);}
 for(const button of document.querySelectorAll('[data-tab]'))button.setAttribute('aria-pressed',String(button.dataset.tab===tab));
 $('scene-tools').hidden=tab!=='scene';$('enemy-tools').hidden=tab!=='enemy';
}
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{setPlacing(null);tab=button.dataset.tab;renderSlots();};
for(const button of document.querySelectorAll('[data-place]'))button.onclick=()=>setPlacing(placing===button.dataset.place?null:button.dataset.place);
$('sky-bottom').addEventListener('input',()=>{skyBottomColor=$('sky-bottom').value;saveProject();});
$('sky').addEventListener('input',()=>{skyColor=$('sky').value;saveProject();});
$('play').onclick=()=>{setPlacing(null);clearKeys();canvas.focus();};
$('restart').onclick=()=>{restart();canvas.focus();};
let showHitboxes=false;
$('show-hitboxes').onclick=()=>{showHitboxes=!showHitboxes;$('show-hitboxes').setAttribute('aria-pressed',String(showHitboxes));clearKeys();canvas.focus();};
$('help').onclick=()=>{clearKeys();$('instructions').showModal();};
$('close-help').onclick=()=>{$('instructions').close();canvas.focus();};
const controls=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','KeyA','KeyD','KeyW','KeyS'];
window.addEventListener('keydown',event=>{
 if($('pixel-editor').open||$('instructions').open)return;
 if(event.code==='Escape'&&placing){setPlacing(null);canvas.focus();return;}
 if(event.target!==canvas&&/^(BUTTON|INPUT|A)$/.test(event.target.tagName))return;
 if(controls.includes(event.code)){event.preventDefault();keys.add(event.code);if(['Space','ArrowUp','KeyW'].includes(event.code)&&!event.repeat)jumpQueued=true;}
 if(event.code==='KeyR'&&!event.repeat)restart();
});
window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',clearKeys);
document.addEventListener('visibilitychange',()=>{clearKeys();lastTime=0;accumulator=0;});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(button.dataset.key);if(button.dataset.key==='Space')jumpQueued=true;});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>keys.delete(button.dataset.key));}
restoreProject();bakeAll();enemies=placements.map(makeEnemy);$('sky').value=skyColor;$('sky-bottom').value=skyBottomColor;renderSlots();notify('Click a thumbnail to draw. Click the level to play.',5);requestAnimationFrame(frame);
