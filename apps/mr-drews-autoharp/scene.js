import {SCENES,fitPhoto,compositeOpacities} from './scene-math.js?v=spooky-scenes-1';
const $=id=>document.getElementById(id);
export function createScene({prepare=null,onSelect=()=>{},onChange=()=>{},onBlend=()=>{},onError=()=>{}}={}){
  let current='sunlit',request=0,animation=0;
  let weights=SCENES.map((_,i)=>i===0?1:0);
  function renderWeights(){
    onBlend(current,weights[SCENES.findIndex(scene=>scene.id===current)]);
    compositeOpacities(weights).forEach((opacity,i)=>{for(const id of [SCENES[i].photoId+'Layer',SCENES[i].backdropId])$(id).style.opacity=String(opacity);});
  }
  function fadeTo(id){
    cancelAnimationFrame(animation);
    const index=SCENES.findIndex(scene=>scene.id===id),from=[...weights],start=performance.now();
    const duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:900;
    function tick(now){
      const t=duration?Math.min(1,Math.max(0,(now-start)/duration)):1,ease=t*t*(3-2*t);
      weights=from.map((value,i)=>value*(1-ease)+(i===index?ease:0));renderWeights();
      animation=t<1?requestAnimationFrame(tick):0;
    }
    tick(start);
  }
  function paint(id){
    const scene=SCENES.find(s=>s.id===id);current=id;fadeTo(id);
    $('scene').setAttribute('aria-label',`Playable autoharp — ${scene.name}`);
    $('sceneSelect').value=id;$('sceneQuickSelect').value=id;
    try{localStorage.setItem('drews-autoharp-scene',id);}catch{}
  }
  async function selectScene(id){
    if(id===current){request++;$('sceneStatus').textContent=SCENES.find(s=>s.id===current).name;$('sceneSelect').value=current;$('sceneQuickSelect').value=current;return;}
    const scene=SCENES.find(s=>s.id===id);if(!scene)return;
    const token=++request;$('sceneStatus').textContent='Opening scene…';
    try{
      for(const elementId of [scene.photoId,scene.backdropId])if(!$(elementId).src)$(elementId).src=scene.image;
      await $(scene.photoId).decode();
      if(prepare)await prepare(scene);
      if(token!==request)return;
      onChange(id);paint(id);$('sceneStatus').textContent=scene.name;
    }catch{if(token===request){$('sceneSelect').value=current;$('sceneQuickSelect').value=current;$('sceneStatus').textContent='';onError('This scene could not load. Please try again.');}}
  }
  for(const id of ['sceneSelect','sceneQuickSelect'])$(id).addEventListener('change',e=>{
    const control=e.target,selected=control.value;
    // Return the keyboard immediately, even if the image loads slowly or fails.
    onSelect();selectScene(selected);
    // Some native pickers restore focus when their popup finishes closing.
    requestAnimationFrame(()=>{if(document.activeElement===control)onSelect();});
  });
  function resize(){const rect=$('scene').getBoundingClientRect(),fit=fitPhoto(rect.width,rect.height);$('instrumentPosition').style.transform=`translate3d(${fit.x}px,${fit.y}px,0) scale(${fit.scale})`;}
  renderWeights();new ResizeObserver(resize).observe($('scene'));window.visualViewport?.addEventListener('resize',resize);resize();
  try{const saved=localStorage.getItem('drews-autoharp-scene');if(SCENES.some(s=>s.id===saved))selectScene(saved);}catch{}
  return {selectScene,resize};
}
