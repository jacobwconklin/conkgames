import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const html=readFileSync(new URL('../public/labs/custom-character.html',import.meta.url),'utf8');
function setup(storage=new Map()) {
 const nodes=new Map();
 const context2d={createLinearGradient(){return {addColorStop(){}}},fillRect(){},clearRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},save(){},restore(){},translate(){},scale(){},rect(){},clip(){},fillText(){},fill(){},setLineDash(){}};
 function element(){return {children:[],dataset:{},style:{},listeners:{},classList:{add(){},toggle(){}},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(name,fn){this.listeners[name]=fn},getContext(){return context2d},open:false,showModal(){this.open=true},close(){this.open=false},focus(){}};}
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element,querySelectorAll(){return []},addEventListener(){}};
 const localStorage={setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}};
 const context=vm.createContext({document,window:{listeners:{},addEventListener(name,fn){this.listeners[name]=fn}},localStorage,requestAnimationFrame(){},URL,console});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 return code=>vm.runInContext(code,context);
}
test('movement, walking frames, jumping, landing, and missing pose fallback',()=>{
 const run=setup();assert.equal(run('currentPose()'),'front');run("keys.add('ArrowRight'); update(1/120)");assert.ok(run('player.x')>64);assert.equal(run('currentPose()'),'walk1');
 run("keys.clear();jumpQueued=true;update(1/120)");assert.equal(run('currentPose()'),'jump');run('for(let i=0;i<150;i++)update(1/120)');assert.equal(run('player.y'),480-run('player.h'));assert.equal(run('player.grounded'),true);
 run("keys.add('ArrowDown');update(1/120)");assert.equal(run('currentPose()'),'front');run("pixels['character.front']=blankPixels(64);bake('character','front')");assert.equal(run('art.character[currentPose()]'),null);
});
test('platform underside blocks upward movement',()=>{const run=setup();run('Object.assign(player,{x:270,y:420,vy:-590});update(1/120)');assert.equal(run('player.y'),416);assert.equal(run('player.vy'),0);});
test('both enemy types cause fainting on side contact',()=>{for(const type of ['enemy1','enemy2']){const run=setup();run(`enemies=[makeEnemy({x:88,y:416,type:'${type}'})];update(1/120)`);assert.ok(run('player.dead')>0);assert.equal(run('currentPose()'),'faint');run('for(let i=0;i<115;i++)update(1/120)');assert.equal(run('player.dead'),0);assert.equal(run('player.x'),64);}});
test('both enemy types can be stomped, faint, and disappear',()=>{for(const type of ['enemy1','enemy2']){const run=setup();run(`Object.assign(player,{x:440,y:416-player.h-2,vy:300,grounded:false});enemies=[makeEnemy({x:440,y:416,type:'${type}'})];update(1/120)`);assert.ok(run('enemies[0].dead')>0);assert.ok(run('player.vy')<0);assert.equal(run('player.dead'),0);run('for(let i=0;i<60;i++)update(1/120)');assert.equal(run('enemies.length'),0);}});
test('wheel turns at ledges; spring stays in a vertical lane and reverses',()=>{const run=setup();run("enemies=[makeEnemy({x:256,y:320,type:'enemy1'})];update(1/120)");assert.ok(run('enemies[0].vx')>0);run("enemies=[makeEnemy({x:500,y:130,type:'enemy2'})];for(let i=0;i<120;i++)update(1/120)");assert.equal(run('enemies[0].x'),500);assert.ok(run('enemies[0].y')>=66);assert.equal(run('enemies[0].direction'),1);});
test('placement rejects gaps, spawn, overlaps, and blocked spring lanes',()=>{const run=setup();assert.equal(run("placementAt(300,300,'enemy1').y"),320);assert.equal(run("placementAt(880,400,'enemy1')"),null);assert.equal(run("placementAt(86,450,'spike')"),null);assert.equal(run("placementAt(300,380,'enemy2')"),null);run("placements=[{x:500,y:130,type:'enemy2'}]");assert.equal(run("placementAt(510,150,'block')"),null);});
test('placed blocks support landing and can be removed; spikes cause fainting',()=>{const run=setup();run("setPlacing('block');placeAt(550,210)");assert.equal(run('blocks.length'),1);run('setPlacing(null);Object.assign(player,{x:blocks[0].x,y:blocks[0].y-player.h-1,vy:200,grounded:false});update(1/120)');assert.equal(run('player.grounded'),true);run("setPlacing('erase');placeAt(blocks[0].x+10,blocks[0].y+10)");assert.equal(run('blocks.length'),0);run('setPlacing(null);Object.assign(player,{x:200,y:458,invincible:0});spikes=[{x:200,y:458,w:32,h:32}];update(1/120)');assert.ok(run('player.dead')>0);});
test('fill respects boundaries, transparent regions, and no-op fills',()=>{const run=setup();run("const d=blankPixels();for(let y=0;y<32;y++)d[y*32+16]=palette[0];floodFill(d,0,0,palette[7])");assert.equal(run('d.filter(c=>c===palette[7]).length'),512);assert.equal(run('d[31]'),null);run('floodFill(d,0,0,palette[7]);floodFill(d,0,0,null)');assert.equal(run('d.filter(Boolean).length'),32);});
test('pencil interpolates fast strokes and eraser makes pixels transparent',()=>{const run=setup();run('const d=blankPixels();paintLine(d,{x:0,y:0},{x:31,y:31},palette[1])');assert.equal(run('d.filter(Boolean).length'),32);run('paintLine(d,{x:0,y:0},{x:31,y:31},null)');assert.equal(run('d.filter(Boolean).length'),0);});
test('editor pauses play, isolates drafts, prevents Escape, and commits only on Save',()=>{const run=setup();run("openEditor('character','front','Front');draft[0]=palette[7];keys.add('ArrowRight');update(.1)");assert.equal(run('player.x'),64);assert.equal(run("pixels['character.front'][0]"),null);assert.equal(run("let cancelled=false;$('pixel-editor').listeners.cancel({preventDefault(){cancelled=true}});cancelled"),true);run('commitEditor()');assert.equal(run("pixels['character.front'][0]"),'#e44b60');assert.equal(run("$('pixel-editor').open"),false);});
test('Reset restores immutable originals after Save; Undo restores the edited draft',()=>{
 const run=setup();run("openEditor('scene','topA','Ground top A');draft[0]=palette[7];commitEditor();openEditor('scene','topA','Ground top A');$('reset-art').onclick()");
 assert.equal(run("draft[0]===ORIGINAL_SPRITES['original.scene.topA'][0]"),true);
 assert.equal(run("pixels['scene.topA'][0]"),'#e44b60');
 assert.equal(run("Object.isFrozen(ORIGINAL_SPRITES)&&Object.isFrozen(ORIGINAL_SPRITES['original.scene.topA'])"),true);
 run("$('undo').onclick()");assert.equal(run('draft[0]'),'#e44b60');
 run("$('reset-art').onclick();commitEditor()");assert.equal(run("pixels['scene.topA'][0]===ORIGINAL_SPRITES['original.scene.topA'][0]"),true);
});
test('art, sky, layout and enemies survive local storage and restart',()=>{const storage=new Map(),run=setup(storage);run("pixels['character.front'][0]=palette[1];skyColor='#123456';skyBottomColor='#fedcba';blocks=[{x:500,y:200,w:32,h:32}];spikes=[{x:600,y:458,w:32,h:32}];placements=[{x:300,y:366,type:'enemy1'}];saveProject();restart()");assert.equal(run('enemies.length'),1);assert.equal(run('blocks.length'),1);const restored=setup(storage);assert.equal(restored("pixels['character.front'][0]"),'#ffffff');assert.equal(restored('skyColor'),'#123456');assert.equal(restored('skyBottomColor'),'#fedcba');assert.equal(restored('blocks.length'),1);assert.equal(restored('spikes.length'),1);assert.equal(restored('enemies[0].type'),'enemy1');});
test('all defaults use their intended canvas dimensions and output is standalone',()=>{const run=setup();assert.equal(run('Object.entries(pixels).every(([key,p])=>p.length===1024&&p.every(c=>c===null||/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(c)))'),true);assert.equal(run('catalogs.scene.length'),9);assert.equal(run('catalogs.enemy.length'),12);assert.equal(/<script[^>]+src=|<link[^>]+stylesheet/.test(html),false);run('draw()');});

test('remove mode resets moving and defeated enemies, pauses play, and removes what is shown',()=>{
 const run=setup();run("placements=[{x:300,y:366,type:'enemy1'},{x:500,y:130,type:'enemy2'}];enemies=placements.map(makeEnemy);enemies[0].x=350;enemies[1].dead=.2;player.x=700;setPlacing('erase')");
 assert.equal(run('player.x'),64);assert.equal(run('enemies[0].x'),300);assert.equal(run('enemies[1].dead'),0);
 run('update(1)');assert.equal(run('enemies[0].x'),300);assert.equal(run('enemies[1].y'),130);
 assert.equal(run('placeAt(310,375)'),true);assert.equal(run('placements.length'),1);assert.equal(run('enemies.length'),1);
 run('placeAt(900,100)');assert.match(run("$('message').textContent"),/Click a placed/);
 run("pointer={x:900,y:100};const labels=[];ctx.fillText=(text)=>labels.push(text);draw()");assert.equal(run("labels.includes('Choose an open space')"),false);
});
test('floating1 always faces its rightward travel direction',()=>{
 const run=setup();run('const rendered=[];sprite=(...args)=>rendered.push(args);draw()');
 assert.equal(run('rendered[0][5]'),false);assert.equal(run('rendered[3][5]'),false);
 assert.equal(run("catalogs.scene.slice(-3).map(p=>p[1]).join(',')"),'floating1,floating2,floating3');
});
test('old floating artwork migrates without changing protected originals',()=>{
 const storage=new Map();storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,pixels:{'scene.bird':Array(1024).fill('#ffffff')}}));const run=setup(storage);
 assert.equal(run("pixels['scene.floating1'].every(c=>c==='#ffffff')"),true);
 assert.equal(run("ORIGINAL_SPRITES['original.scene.floating1'].every(c=>c==='#ffffff')"),false);
});
test('lab has no image import or file picker',()=>{assert.equal(/import-art|image-file|type="file"|Image import|Import image/.test(html),false);});

test('all six player originals are embedded person artwork and Reset restores them',()=>{
 const run=setup();assert.equal(run("poses.every(([id])=>JSON.stringify(pixels['character.'+id])===JSON.stringify(ORIGINAL_PLAYER_PIXELS[id])&&pixels['character.'+id].some(Boolean)&&pixels['character.'+id].some(c=>c===null))"),true);
 run("openEditor('character','jump','Jump');draft.fill(palette[7]);commitEditor();openEditor('character','jump','Jump');$('reset-art').onclick();commitEditor()");
 assert.equal(run("JSON.stringify(pixels['character.jump'])===JSON.stringify(ORIGINAL_PLAYER_PIXELS.jump)"),true);
});
test('sky renderer uses both configured gradient endpoints',()=>{
 const run=setup();run("const stops=[];ctx.createLinearGradient=(...coords)=>{stops.push(coords);return {addColorStop:(...stop)=>stops.push(stop)}};skyColor='#112233';skyBottomColor='#aabbcc';draw()");
 assert.equal(run('JSON.stringify(stops)'),JSON.stringify([[0,0,0,560],[0,'#112233'],[1,'#aabbcc']]));
});
test('legacy player defaults upgrade without replacing custom drawings',()=>{
 const storage=new Map();const painted=Array(1024).fill('#e44b60');storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,pixels:{'character.front':Array(1024).fill('#ffffff'),'character.left':Array(1024).fill(null),'character.right':painted},skyColor:'#123456'}));
 const run=setup(storage);assert.equal(run("JSON.stringify(pixels['character.front'])===JSON.stringify(ORIGINAL_PLAYER_PIXELS.front)"),true);assert.equal(run("pixels['character.sideways'].filter(Boolean).every(c=>c==='#e44b60')"),true);assert.equal(run('skyColor'),'#123456');
});


test('player uses square artwork with a one-by-two-block collision body',()=>{
 const run=setup();assert.equal(run('player.h'),64);assert.equal(run('player.w'),32);
 for(const pose of ['sideways','walk1','walk2'])assert.equal(run("playerSpriteBox('"+pose+"').w"),64);
});
test('held movement uses a stable four-step walk cycle',()=>{
 const run=setup();run("player.facing='right';player.vx=245;player.grounded=true");const cycle=[];
 for(const t of [.01,.13,.25,.37,.49])cycle.push(run('player.walkTime='+t+';currentPose()'));
 assert.deepEqual(cycle,['walk1','sideways','walk2','sideways','walk1']);
});
test('both enemy animations visit all five frames and wrap upright',()=>{
 const run=setup();for(const type of ['enemy1','enemy2']){
  const frames=[];for(let i=0;i<6;i++)frames.push(run("enemyPose({type:'"+type+"',animTime:"+(i*.16+.001)+"})"));
  assert.deepEqual(frames,[0,1,2,3,4,0].map(i=>type+'Frame'+i));
  assert.equal(run("new Set(Array.from({length:5},(_,i)=>JSON.stringify(pixels['enemy."+type+"Frame'+i]))).size"),5);
 }
});
test('wheel mirrors horizontally while fire stays upright and reverses frame order',()=>{
 const run=setup();run("enemies=[makeEnemy({x:300,y:366,type:'enemy1'}),makeEnemy({x:500,y:130,type:'enemy2'})];enemies[0].vx=65;enemies[1].direction=1;const rendered=[];sprite=(...args)=>rendered.push(args);draw()");
 assert.equal(run('rendered[6][5]'),true);assert.equal(run('Boolean(rendered[7][7])'),false);assert.equal(run('enemyPose(enemies[1])'),'enemy2Frame4');
 run('enemies[0].vx=-65;enemies[1].direction=-1;rendered.length=0;draw()');assert.equal(run('rendered[6][5]'),false);assert.equal(run('Boolean(rendered[7][7])'),false);assert.equal(run('enemyPose(enemies[1])'),'enemy2Frame0');
});

test('old shipped enemy skins upgrade but custom frames and placements survive',()=>{
 const seed=setup(),storage=new Map();const custom=Array(1024).fill('#e44b60');
 storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,pixels:{'enemy.spring':JSON.parse(seed("JSON.stringify(legacyEnemyPixels('spring'))")),'enemy.wheel':custom},placements:[{x:500,y:130,type:'spring'}]}));
 const run=setup(storage);assert.equal(run("JSON.stringify(pixels['enemy.enemy2Frame0'])===JSON.stringify(ORIGINAL_SPRITES['original.enemy.enemy2Frame0'])"),true);assert.equal(run("pixels['enemy.enemy1Frame0'].every(c=>c==='#e44b60')"),true);assert.equal(run('enemies[0].type'),'enemy2');
});
test('descending enemy2 uses frames 5 to 1 and remains stompable',()=>{
 const run=setup();const order=[];for(let i=0;i<5;i++)order.push(run("enemyPose({type:'enemy2',direction:1,animTime:"+(i*.16+.001)+"})"));assert.deepEqual(order,[4,3,2,1,0].map(i=>'enemy2Frame'+i));
 run("Object.assign(player,{x:440,y:416-player.h-2,vy:400,grounded:false});enemies=[makeEnemy({x:440,y:416,type:'enemy2'})];enemies[0].direction=1;update(1/120)");assert.ok(run('enemies[0].dead')>0);
});

test('WASD controls and shared frames mirror with stable bounds',()=>{
 const run=setup();
 run("window.listeners.keydown({code:'KeyA',target:canvas,preventDefault(){}});update(1/120)");
 assert.ok(run('player.vx')<0);assert.equal(run('currentPose()'),'walk1');
 run("const calls=[];sprite=(...args)=>calls.push(args);drawPlayer('walk1')");
 assert.equal(run('calls[0][5]'),true);
 run("window.listeners.keyup({code:'KeyA'});window.listeners.keydown({code:'KeyD',target:canvas,preventDefault(){}});update(1/120);drawPlayer('walk1')");
 assert.equal(run('calls[1][5]'),false);assert.ok(run('player.vx')>0);
 run("window.listeners.keydown({code:'KeyW',target:canvas,preventDefault(){}});update(1/120)");
 assert.equal(run('currentPose()'),'jump');
 assert.equal(run("poses.some(([id])=>id==='crouch'||id.startsWith('left')||id.startsWith('right'))"),false);
});

test('hitbox toggle draws exact collision rectangles and excludes defeated enemies',()=>{
 const run=setup();
 run("const outlines=[];ctx.strokeRect=(...args)=>outlines.push(args);spikes=[{x:200,y:458}];enemies=[makeEnemy({x:500,y:130,type:'enemy2'}),{x:700,y:200,w:64,h:56,dead:.2}];drawHitboxes()");
 assert.equal(run('outlines.length'),0);
 run("$('show-hitboxes').onclick();drawHitboxes()");
 assert.equal(run('JSON.stringify(outlines)'),JSON.stringify([[64,416,32,64],[500,130,64,64],[200,458,32,32]]));
 run("outlines.length=0;$('show-hitboxes').onclick();drawHitboxes()");
 assert.equal(run('outlines.length'),0);
});

test('square player editor reaches the last row and preserves edits across save, reload and reset',()=>{
 const storage=new Map(),run=setup(storage);
 run("openEditor('character','sideways','Sideways');draft=blankPixels();floodFill(draft,0,31,palette[7])");
 assert.equal(run('draft.length'),1024);assert.equal(run('draft.filter(Boolean).length'),1024);
 assert.equal(run('grid.height'),512);
 run("gridCursor={x:31,y:30};grid.listeners.keydown({code:'ArrowDown',preventDefault(){}})");
 assert.equal(run('gridCursor.y'),31);
 run("paintLine(draft,{x:31,y:31},{x:31,y:31},palette[1]);commitEditor()");
 const restored=setup(storage);
 assert.equal(restored("pixels['character.sideways'][1023]"),'#ffffff');
 assert.equal(restored("art.character.sideways.height"),32);
 restored("openEditor('character','sideways','Sideways');$('reset-art').onclick();commitEditor()");
 assert.equal(restored("JSON.stringify(pixels['character.sideways'])===JSON.stringify(ORIGINAL_SPRITES['original.character.sideways'])"),true);
});
test('terrain, placements and migrated layouts use whole blocks',()=>{
 const run=setup();
 assert.equal(run('basePlatforms.every(p=>[p.x,p.y,p.w,p.h].every(v=>v%SIZE===0))'),true);
 for(const type of ['block','enemy2']){
  const spot=JSON.parse(run("JSON.stringify(placementAt(550,160,'"+type+"'))"));
  assert.ok(spot);assert.equal(spot.x%32,0);assert.equal(spot.y%32,0);
 }
 const storage=new Map();storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,enemySizeVersion:2,blocks:[{x:501,y:201}],spikes:[{x:600,y:458}],placements:[{x:300,y:338,type:'enemy1'}]}));
 const migrated=setup(storage);
 assert.equal(migrated('[...blocks,...spikes,...placements].every(p=>p.x%32===0&&p.y%32===0)'),true);
 assert.equal(migrated('placements[0].y+ENEMY_H'),384);
});
test('live enemy hitbox top is a green stomp line',()=>{
 const run=setup();run("const segments=[];let from;ctx.moveTo=(x,y)=>from=[x,y];ctx.lineTo=(x,y)=>segments.push([ctx.strokeStyle,...from,x,y]);showHitboxes=true;enemies=[makeEnemy({x:320,y:256,type:'enemy1'})];drawHitboxes()");
 assert.equal(run('JSON.stringify(segments)'),JSON.stringify([['#55ff77',320,256,384,256]]));
});

test('square artwork stays centered around the narrow hitbox in either direction',()=>{
 const run=setup();
 run("const rendered=[];sprite=(...args)=>rendered.push(args);player.facing='right';drawPlayer('sideways');player.facing='left';drawPlayer('sideways')");
 assert.equal(run('JSON.stringify(rendered.map(args=>args.slice(1,6)))'),JSON.stringify([[48,416,64,64,false],[48,416,64,64,true]]));
 assert.equal(run('player.w'),32);assert.equal(run('player.h'),64);
});
test('saved tall drawings migrate while old defaults upgrade to clean square originals',()=>{
 const seed=setup(),storage=new Map();
 const custom=Array(2048).fill(null);custom[0]='#e44b60';custom[2047]='#ffffff';
 storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,blockGridVersion:1,playerDefaultsVersion:2,pixels:{
  'character.idle':custom,
  'character.front':JSON.parse(seed('JSON.stringify(tallPlayerPixels(LEGACY_PLAYER_PIXELS.front))'))
 }}));
 const run=setup(storage);
 assert.equal(run("pixels['character.sideways'].length"),1024);
 assert.equal(run("pixels['character.sideways'][8]"),'#e44b60');
 assert.equal(run("pixels['character.sideways'][31*32+23]"),'#ffffff');
 assert.equal(run("JSON.stringify(pixels['character.front'])===JSON.stringify(ORIGINAL_PLAYER_PIXELS.front)"),true);
 run('saveProject()');const restored=setup(storage);
 assert.equal(restored("pixels['character.sideways'][8]"),'#e44b60');
});

test('player source artwork matches Git before vertical fitting',()=>{
 const context=vm.createContext({});
 vm.runInContext(execFileSync('git',['show','1ad270d:labs/custom-character/original-player.js'],{encoding:'utf8'})+execFileSync('git',['show','1ad270d:labs/custom-character/player-art.js'],{encoding:'utf8'}),context);
 const run=setup();
 for(const [id,old] of [['front','front'],['sideways','right'],['walk1','right1'],['walk2','right2'],['jump','jump'],['faint','faint']]){
  assert.equal(run("JSON.stringify(LEGACY_PLAYER_PIXELS['"+id+"'])"),vm.runInContext("JSON.stringify(ORIGINAL_PLAYER_PIXELS."+old+")",context));
 }
});
test('discarded shipped artwork reverts without replacing customized pixels',()=>{
 const seed=setup(),storage=new Map();
 const discarded=JSON.parse(seed("JSON.stringify([...REPLACED_PLAYER_SIGNATURES.front].map(c=>REPLACED_PLAYER_COLORS[parseInt(c,16)]))"));
 const custom=discarded.slice();custom[0]='#123456';
 storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,playerDefaultsVersion:3,pixels:{'character.front':discarded,'character.jump':custom}}));
 const run=setup(storage);
 assert.equal(run("JSON.stringify(pixels['character.front'])===JSON.stringify(ORIGINAL_PLAYER_PIXELS.front)"),true);
 assert.equal(run("pixels['character.jump'][0]"),'#123456');
});


test('approved player JSON is bundled exactly and Reset restores every pose',()=>{
 const approved=JSON.parse(readFileSync(new URL('../labs/custom-character/player-defaults.json',import.meta.url),'utf8'));
 const run=setup();
 for(const [id,data] of Object.entries(approved.poses)){
  assert.equal(run("JSON.stringify(pixels['character."+id+"'])"),JSON.stringify(data));
  run("openEditor('character','"+id+"','"+id+"');draft.fill('#123456');commitEditor();openEditor('character','"+id+"','"+id+"');$('reset-art').onclick();commitEditor()");
  assert.equal(run("JSON.stringify(pixels['character."+id+"'])"),JSON.stringify(data));
 }
 assert.equal(/export-player-defaults|playerDefaultsExport/.test(html),false);
 assert.ok(html.includes('id="save-art"'));
});
test('previous unmodified defaults migrate to approved artwork while custom edits survive',()=>{
 const seed=setup(),storage=new Map();
 const old=JSON.parse(seed('JSON.stringify(PREVIOUS_PLAYER_PIXELS.front)'));
 const custom=old.slice();custom[0]='#123456';
 storage.set('conkgames-custom-character-v2',JSON.stringify({version:2,playerDefaultsVersion:5,pixels:{'character.front':old,'character.jump':custom}}));
 const run=setup(storage);
 assert.equal(run("JSON.stringify(pixels['character.front'])===JSON.stringify(ORIGINAL_PLAYER_PIXELS.front)"),true);
 assert.equal(run("pixels['character.jump'][0]"),'#123456');
});
