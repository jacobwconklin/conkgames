// Clean editable pixel originals: binary transparency, no isolated matte pixels,
// and deliberately placed eyes rather than downsampled nearly-black fragments.
const ORIGINAL_PLAYER_PIXELS = Object.fromEntries(Object.entries(SOURCE_PLAYER_PIXELS).map(([id,source])=>{
 const data=source.map(color=>{
  if(!color||parseInt(color.slice(7),16)<220)return null;
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  if(Math.max(r,g,b)<42)return '#17111f';
  if(r>g*1.2&&r>b*1.2)return '#71432b';
  if(g>r*1.25&&g>b*1.1)return '#38875c';
  if(b>r*1.25&&b>g*1.15)return '#3d6acb';
  return '#37353d';
 });
 const seen=new Set();let largest=[];
 for(let i=0;i<1024;i++)if(data[i]&&!seen.has(i)){
  const component=[],todo=[i];seen.add(i);
  while(todo.length){const p=todo.pop();component.push(p);const x=p%32,y=Math.floor(p/32);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*32+nx;if(nx>=0&&nx<32&&ny>=0&&ny<32&&data[n]&&!seen.has(n)){seen.add(n);todo.push(n);}}
  }
  if(component.length>largest.length)largest=component;
 }
 const keep=new Set(largest);for(let i=0;i<1024;i++)if(!keep.has(i))data[i]=null;
 const eyes={front:[14,8,7,4,[15,18],9],left:[13,8,3,4,[14],9],left1:[12,8,4,4,[13],9],left2:[11,8,4,4,[12],9],right:[15,8,4,4,[17],9],right1:[17,8,4,4,[19],9],right2:[16,8,4,4,[18],9],jump:[12,7,8,4,[14,17],8],crouch:[12,14,7,3,[13,17],15]};
 if(eyes[id]){const [x,y,w,h,xs,ey]=eyes[id];for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)data[j*32+i]='#71432b';for(const ex of xs){data[ey*32+ex]='#17111f';data[(ey+1)*32+ex]='#17111f';}}
 return [id,Object.freeze(data)];
}));
Object.freeze(ORIGINAL_PLAYER_PIXELS);
