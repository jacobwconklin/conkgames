// Pixel studio: draft pixels are isolated until Save. All drawing uses palette colors or transparency.
let editing=null,draft=null,tool='pencil',selectedColor=palette[1],undoStack=[],drawing=false,lastPixel=null,gridCursor={x:0,y:0},showCursor=false;
const grid=$('pixel-grid'),gridCtx=grid.getContext('2d');
function floodFill(data,x,y,color){const target=data[y*32+x];if(target===color)return;const stack=[y*32+x];data[y*32+x]=color;while(stack.length){const i=stack.pop(),cx=i%32,cy=Math.floor(i/32);for(const n of [cx>0?i-1:-1,cx<31?i+1:-1,cy>0?i-32:-1,cy<data.length/32-1?i+32:-1])if(n>=0&&data[n]===target){data[n]=color;stack.push(n);}}}
function paintLine(data,a,b,color){let x=a.x,y=a.y;const dx=Math.abs(b.x-x),sx=x<b.x?1:-1,dy=-Math.abs(b.y-y),sy=y<b.y?1:-1;let err=dx+dy;while(true){data[y*32+x]=color;if(x===b.x&&y===b.y)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}}
function pushUndo(){undoStack.push(draft.slice());if(undoStack.length>40)undoStack.shift();}
function editorDraw(){
 if(!draft)return;const height=draft.length/32;gridCtx.clearRect(0,0,grid.width,grid.height);
 for(let y=0;y<height;y++)for(let x=0;x<32;x++){gridCtx.fillStyle=draft[y*32+x]||((x+y)%2?'#3b3449':'#2e283b');gridCtx.fillRect(x*16,y*16,16,16);}
 gridCtx.strokeStyle='#00000028';gridCtx.lineWidth=1;for(let i=0;i<=height;i++){gridCtx.beginPath();gridCtx.moveTo(i*16,0);gridCtx.lineTo(i*16,grid.height);gridCtx.moveTo(0,i*16);gridCtx.lineTo(512,i*16);gridCtx.stroke();}
 if(showCursor){gridCtx.strokeStyle='#fff';gridCtx.lineWidth=2;gridCtx.strokeRect(gridCursor.x*16+1,gridCursor.y*16+1,14,14);}
 const mini=$('mini-preview').getContext('2d');mini.clearRect(0,0,32,height);mini.drawImage(pixelCanvas(draft),0,0);$('undo').disabled=!undoStack.length;
}
function openEditor(group,id,label){clearKeys();editing={group,id};draft=pixels[group+'.'+id].slice();undoStack=[];drawing=false;lastPixel=null;showCursor=false;gridCursor={x:0,y:0};const height=draft.length/32;grid.width=512;grid.height=height*16;grid.style.aspectRatio='32 / '+height;grid.style.maxWidth=height===64?'256px':'';$('mini-preview').width=32;$('mini-preview').height=height;$('mini-preview').style.width=height===64?'32px':'64px';$('studio-size').textContent='PIXEL STUDIO / 32 × '+height;grid.setAttribute('aria-label','32 by '+height+' pixel drawing canvas. Use arrow keys to move the cursor, Space to draw.');$('editor-title').textContent=label;$('editor-note').textContent='Reset restores the original artwork. Save applies your changes.';$('pixel-editor').showModal();editorDraw();}
function commitEditor(){if(!editing)return;const {group,id}=editing;pixels[group+'.'+id]=draft.slice();bake(group,id);editing=null;drawing=false;lastPixel=null;$('pixel-editor').close();renderSlots();saveProject();clearKeys();canvas.focus();notify('Artwork saved. Try it in your world.');}
function gridPoint(event){const r=grid.getBoundingClientRect();return {x:Math.max(0,Math.min(31,Math.floor((event.clientX-r.left)/r.width*32))),y:Math.max(0,Math.min(draft.length/32-1,Math.floor((event.clientY-r.top)/r.height*(draft.length/32))))};}
function applyTool(p){const color=tool==='eraser'?null:selectedColor;if(tool==='fill')floodFill(draft,p.x,p.y,color);else paintLine(draft,lastPixel||p,p,color);lastPixel=p;gridCursor=p;editorDraw();}
grid.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();grid.focus();grid.setPointerCapture(event.pointerId);showCursor=false;pushUndo();drawing=true;lastPixel=null;applyTool(gridPoint(event));});
grid.addEventListener('pointermove',event=>{if(drawing&&tool!=='fill')applyTool(gridPoint(event));});
for(const event of ['pointerup','pointercancel','lostpointercapture'])grid.addEventListener(event,()=>{drawing=false;lastPixel=null;});
grid.addEventListener('keydown',event=>{const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(offsets[event.code]){event.preventDefault();showCursor=true;gridCursor.x=Math.max(0,Math.min(31,gridCursor.x+offsets[event.code][0]));gridCursor.y=Math.max(0,Math.min(draft.length/32-1,gridCursor.y+offsets[event.code][1]));editorDraw();}else if(event.code==='Space'){event.preventDefault();pushUndo();lastPixel=null;applyTool(gridCursor);}});
$('pixel-editor').addEventListener('cancel',event=>event.preventDefault());
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{tool=button.dataset.tool;for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b===button));};
for(let i=0;i<palette.length;i++){const b=document.createElement('button');b.style.background=palette[i];b.setAttribute('aria-label',colorNames[i]);b.setAttribute('aria-pressed',String(i===1));b.onclick=()=>{selectedColor=palette[i];$('color-name').textContent=colorNames[i];for(const other of $('palette').children)other.setAttribute('aria-pressed',String(other===b));};$('palette').append(b);}
$('undo').onclick=()=>{if(undoStack.length){draft=undoStack.pop();editorDraw();}};
$('reset-art').onclick=()=>{pushUndo();draft=ORIGINAL_SPRITES['original.'+editing.group+'.'+editing.id].slice();editorDraw();};
$('save-art').onclick=commitEditor;
