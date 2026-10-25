import {multiply,boxMatrix,panelMatrix,beamMatrix,defaultPanels} from './xr-geometry.js';
import {createXRPanel} from './xr-panel.js';
import {createWorkspacePanel} from './xr-workspace-panel.js';

export function createXRRenderer({document,onLost}){
 const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:false,antialias:true,xrCompatible:true});
 if(!gl)throw new Error('WebGL is unavailable. Enable graphics acceleration and try again.');
 canvas.addEventListener('webglcontextlost',lost);let disposed=false;
 function lost(e){e.preventDefault();onLost()}
 const resources=[];
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error('VR shader failed: '+log)}return s}
 const vert=shader(gl.VERTEX_SHADER,'attribute vec3 aPosition; attribute vec2 aUV; attribute float aLight; uniform mat4 uMatrix; varying vec2 vUV; varying float vLight; void main(){ gl_Position=uMatrix*vec4(aPosition,1.0);vUV=aUV;vLight=aLight;}');
 const frag=shader(gl.FRAGMENT_SHADER,'precision mediump float; uniform vec3 uColor; uniform sampler2D uTexture; uniform float uTextured; varying vec2 vUV; varying float vLight; void main(){vec3 c=mix(uColor*vLight,texture2D(uTexture,vUV).rgb,uTextured);gl_FragColor=vec4(c,1.0);}');
 const program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw new Error('VR graphics could not start.')}
 const pos=gl.getAttribLocation(program,'aPosition'),uv=gl.getAttribLocation(program,'aUV'),light=gl.getAttribLocation(program,'aLight');
 const matrix=gl.getUniformLocation(program,'uMatrix'),color=gl.getUniformLocation(program,'uColor'),textured=gl.getUniformLocation(program,'uTextured');
 function mesh(data,mode=gl.TRIANGLES){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);resources.push(buffer);return {buffer,count:data.length/6,mode}}
 const cubeData=[];
 for(const [corners,shade] of [
  [[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],.84],
  [[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],.7],
  [[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],1],
  [[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],.5],
  [[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],.7],
  [[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],.9]
 ])for(const i of [0,1,2,0,2,3])cubeData.push(...corners[i],0,0,shade);
 const cube=mesh(cubeData),quad=mesh([-.5,-.5,0,0,0,1,.5,-.5,0,1,0,1,.5,.5,0,1,1,1,-.5,-.5,0,0,0,1,.5,.5,0,1,1,1,-.5,.5,0,0,1,1]);
 const line=mesh([0,0,0,0,0,1,0,0,0,0,0,1],gl.LINES),discData=[];
 for(let i=0;i<40;i++)for(const point of [[0,0],[Math.cos(i*Math.PI/20),Math.sin(i*Math.PI/20)],[Math.cos((i+1)*Math.PI/20),Math.sin((i+1)*Math.PI/20)]])discData.push(...point,0,0,0,1);
 const disc=mesh(discData),sphereData=[];
 for(let y=0;y<8;y++)for(let x=0;x<12;x++)for(const [dx,dy]of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){const a=(x+dx)/12*Math.PI*2,b=(y+dy)/8*Math.PI,ny=Math.cos(b);sphereData.push(Math.sin(b)*Math.cos(a)*.5,ny*.5,Math.sin(b)*Math.sin(a)*.5,0,0,.7+ny*.25)}
 const sphere=mesh(sphereData),surfaces=new Map();
 const labelCanvas=document.createElement('canvas');labelCanvas.width=2048;labelCanvas.height=64;const labelPen=labelCanvas.getContext('2d'),labelTexture=gl.createTexture(),labelMeshes=[];let labelBase=-1;
 gl.bindTexture(gl.TEXTURE_2D,labelTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 for(let i=0;i<25;i++){const u=i/32,v=(i+1)/32;labelMeshes.push(mesh([-.5,-.5,0,u,0,1,.5,-.5,0,v,0,1,.5,.5,0,v,1,1,-.5,-.5,0,u,0,1,.5,.5,0,v,1,1,-.5,.5,0,u,1,1]))}
 function labelNotes(base){if(labelBase===base)return;labelBase=base;labelPen.fillStyle='#1a1d21';labelPen.fillRect(0,0,2048,64);labelPen.fillStyle='#e2e0d8';labelPen.textAlign='center';labelPen.textBaseline='middle';labelPen.font='28px Arial, sans-serif';for(let i=0;i<25;i++){const n=base+i;labelPen.fillText(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n%12]+(Math.floor(n/12)-1),i*64+32,32,58)}gl.bindTexture(gl.TEXTURE_2D,labelTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,labelCanvas)}

 function surface(id){
  if(surfaces.has(id))return surfaces.get(id);
  const screen=document.createElement('canvas'),panel=id==='play'?createXRPanel(screen):createWorkspacePanel(screen,id),texture=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const item={screen,panel,texture,get buttons(){return panel.buttons},get sliders(){return panel.sliders||[]}};surfaces.set(id,item);return item;
 }
 document.fonts?.ready.then(()=>{labelBase=-1;for(const s of surfaces.values())s.panel.invalidate()});
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 function draw(mesh,model,tint,pv,isTexture=false){
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(light);gl.vertexAttribPointer(light,1,gl.FLOAT,false,24,20);
  gl.uniformMatrix4fv(matrix,false,multiply(pv,model));gl.uniform3fv(color,tint);gl.uniform1f(textured,isTexture?1:0);gl.drawArrays(mesh.mode,0,mesh.count);
 }
 function update(state,room,hovered){labelNotes(room.base||0);for(const p of (room.panels||defaultPanels()).filter(p=>p.visible)){const item=surface(p.id);if(item.panel.paint(state,room,hovered)){gl.bindTexture(gl.TEXTURE_2D,item.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,item.screen)}}}
 function render(session,pose,anchor,keys,input,rays,state,floorHeight,room={}){
  const layer=session.renderState.baseLayer;gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.clearColor(.018,.027,.04,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,surfaces.get('play')?.texture);gl.uniform1i(gl.getUniformLocation(program,'uTexture'),0);
  const accent=state.theme==='purple'?[.68,.33,1]:[.53,.83,.15],held=input.notes,hover=input.hovered,height=room.options?.height||0,isMallet=room.options?.instrument==='mallets';
  for(const view of pose.views){
   const viewport=layer.getViewport(view);gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
   const pv=multiply(multiply(view.projectionMatrix,view.transform.inverse.matrix),anchor.matrix);
   const box=(x,y,z,w,h,d,c)=>draw(cube,boxMatrix(x,y,z,w,h,d),c,pv);
   const floor=-floorHeight;
   box(0,floor-.04,-.7,7,.08,7,[.15,.115,.08]);box(0,floor+1.6,-3.6,7,3.2,.1,[.11,.135,.17]);
   box(-3.5,floor+1.6,-.7,.1,3.2,7,[.085,.10,.13]);box(3.5,floor+1.6,-.7,.1,3.2,7,[.085,.10,.13]);box(0,floor+3.2,-.7,7,.1,7,[.075,.09,.12]);
   // Oak floor, inset rug, acoustic timber, midnight windows and warm practical lights.
   for(let i=-11;i<=11;i++)box(i*.3,floor+.002,-.7,.006,.004,7,[.16,.125,.09]);
   draw(disc,new Float32Array([1.7,0,0,0,0,0,-1.35,0,0,1,0,0,0,floor+.006,-.65,1]),[.08,.12,.17],pv);
   for(const x of [-2.0,2.0]){
    box(x,.18,-3.49,1.95,1.75,.07,[.28,.2,.14]);box(x,.18,-3.443,1.81,1.60,.025,[.032,.065,.14]);
    for(let i=0;i<8;i++){const sx=x-.76+i*.22,h=.14+((i*17+3)%7)*.075;box(sx,-.55+h/2,-3.412,.18,h,.025,[.07,.11,.18]);for(let j=0;j<Math.floor(h/.08);j++)box(sx+.028,-.50+j*.08,-3.393,.025,.026,.003,[.56,.41,.19])}
    for(let i=0;i<14;i++)box(x-.76+(i*.131)%1.5,.12+(i*.173)% .72,-3.409,.008,.008,.002,[.54,.66,.8]);
    box(x,.18,-3.375,.044,1.65,.03,[.17,.20,.24]);box(x,.08,-3.375,1.81,.04,.03,[.17,.20,.24]);
   }
   box(0,.05,-3.48,1.55,1.52,.08,[.035,.04,.05]);for(let i=-7;i<=7;i++)box(i*.10,.05,-3.415,.047,1.45,.055,[.28,.19,.13]);
   box(0,-.84,-3.46,6.8,.026,.035,accent);box(-3.44,-.84,-.7,.035,.026,5.6,accent);box(3.44,-.84,-.7,.035,.026,5.6,accent);
   for(const x of [-2.9,2.9]){
    box(x,floor+.60,-2.50,.034,1.2,.034,[.33,.25,.18]);draw(sphere,boxMatrix(x,floor+1.26,-2.50,.24,.24,.24),[1,.74,.38],pv);box(x,floor+.022,-2.50,.35,.035,.35,[.13,.14,.16]);
    box(x,floor+.23,.50,.40,.44,.40,[.18,.16,.14]);for(let j=0;j<6;j++){const a=j/6*Math.PI*2;draw(sphere,boxMatrix(x+Math.cos(a)*.16,floor+.63+j*.04,.50+Math.sin(a)*.16,.20,.44,.15),[.12,.26+j*.014,.16],pv)}
   }
   box(-2.45,floor+.3,1.12,1.5,.25,.70,[.14,.20,.25]);box(-2.45,floor+.58,1.43,1.5,.55,.16,[.12,.17,.23]);for(const x of [-3.16,-1.74])box(x,floor+.4,1.12,.15,.5,.73,[.12,.17,.23]);
   for(const x of [-1.05,1.05]){box(x,.95,-1.4,.06,.045,1.4,[.27,.24,.19]);box(x,.92,-1.4,.035,.008,1.32,[.85,.66,.39])}
   box(0,-.58+height,-.76,1.66,.10,isMallet?.88:.67,[.17,.115,.075]);box(0,-.62+height,-.32,1.66,.05,.04,[.38,.24,.14]);
   for(const x of [-.72,.72])box(x,(floor-.62+height)/2,-.76,.055,-.62+height-floor,.63,[.1,.13,.15]);
   if(!isMallet){box(0,-.54+height,-.70,1.32,.10,.38,[.035,.047,.063]);for(const x of [-.7,.7])box(x,-.495+height,-.70,.08,.09,.39,[.32,.19,.12])}
   for(const key of keys){
    const active=held.has(key.note),highlight=hover.has(key.id),c=active?accent:highlight?[.65,.70,.52]:key.bar?key.black?[.24,.105,.07]:[.50,.28,.12]:key.black?[.06,.075,.095]:[.9,.9,.86];
    box(key.x,key.y-(active?.008:0),key.z,key.w,key.h,key.d,c);
    if(key.bar){for(const z of [-1,1])draw(sphere,boxMatrix(key.x,key.y+.028,key.z+z*key.d*.30,.01,.006,.01),[.13,.15,.17],pv);box(key.x,key.y-.13,key.z,.027,.19,.04,[.42,.35,.19])}
    const label=labelMeshes[key.note-(room.base??48)];if(label){gl.bindTexture(gl.TEXTURE_2D,labelTexture);const w=key.w*.68,h=.035,y=key.y+key.h/2+.002-(active?.008:0),z=key.z+key.d*.32;draw(label,new Float32Array([w,0,0,0,0,0,-h,0,0,1,0,0,key.x,y,z,1]),[1,1,1],pv,true)}
    if(!key.black&&key.note%12===0)box(key.x,key.y+key.h/2+.001,key.z+.05,.014,.002,.022,accent);
   }
   for(const panel of (room.panels||defaultPanels()).filter(p=>p.visible)){
    const item=surfaces.get(panel.id);if(!item)continue;const pp=multiply(pv,panelMatrix(panel));
    draw(cube,boxMatrix(0,0,-.025,panel.width+.026,panel.height+.026,.05),[.052,.07,.095],pp);
    gl.bindTexture(gl.TEXTURE_2D,item.texture);draw(quad,boxMatrix(0,0,.002,panel.width,panel.height,1),[1,1,1],pp,true);
    draw(cube,boxMatrix(-panel.width*.13,panel.height/2+.018,0,panel.width*.66,.022,.046),accent,pp);
    for(const f of item.sliders){const fraction=(f.value-f.min)/(f.max-f.min)||0,x=f.vertical?f.x+f.w/2:f.x+f.w*fraction,y=f.vertical?f.y+f.h*(1-fraction):f.y+f.h/2;
     const mx=(x/1440-.5)*panel.width,my=(.5-y/960)*panel.height,kw=f.vertical?.058:.029,kh=f.vertical?.03:.042;
     draw(cube,boxMatrix(mx,my,.017,kw,kh,.030),f.disabled?[.18,.2,.24]:[.65,.71,.77],pp);draw(cube,boxMatrix(mx,my,.033,kw*.76,.003,.002),accent,pp);
    }
   }
   for(const x of [-1.08,1.08]){
    box(x,-.2,-1.25,.30,.52,.28,[.06,.074,.093]);
    draw(disc,boxMatrix(x,-.28,-1.104,.102,.102,1),[.16,.18,.22],pv);draw(disc,boxMatrix(x,-.28,-1.101,.049,.049,1),[.045,.055,.07],pv);
    draw(disc,boxMatrix(x,-.03,-1.104,.038,.038,1),[.23,.25,.29],pv);box(x,-.42,-1.104,.025,.005,.001,accent);
   }
   for(const mallet of room.mallets||[]){
    draw(cube,beamMatrix(mallet.origin,mallet.tip,.012),[.64,.43,.23],pv);draw(sphere,boxMatrix(...mallet.tip,.052,.052,.052),mallet.hand==='left'?[.29,.78,.80]:[.91,.68,.28],pv);
   }
   for(const ray of rays){const distance=Math.min(ray.hit?.distance??2,4),end=ray.origin.map((o,i)=>o+ray.direction[i]*distance),tint=ray.hit?accent:[.42,.58,.7];
    gl.bindBuffer(gl.ARRAY_BUFFER,line.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array([...ray.origin,0,0,1,...end,0,0,1]));draw(line,boxMatrix(0,0,0,1,1,1),tint,pv);box(...ray.origin,.022,.022,.022,tint);if(ray.hit)box(...end,.012,.012,.012,tint);
   }
  }
 }
 return {gl,update,render,surfaces,get buttons(){return surfaces.get('play')?.buttons||[]},dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',lost);resources.forEach(b=>gl.deleteBuffer(b));gl.deleteTexture(labelTexture);for(const s of surfaces.values())gl.deleteTexture(s.texture);surfaces.clear();gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()}};
}
