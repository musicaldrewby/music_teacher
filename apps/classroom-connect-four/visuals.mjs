export const BOARD_STYLES = {classic:'Classic Blue',steel:'Brushed Steel',black:'Satin Black',pearl:'Pearl White',stone:'Carved Stone',obsidian:'Obsidian',titanium:'Titanium',ice:'Frosted Ice',copper:'Copper',marble:'White Marble',carbon:'Carbon Fiber',ceramic:'Glazed Ceramic',walnut:'Polished Walnut'};
export const BADGES = [
 ['none','No badge',''],['rocket','Rocket','🚀'],['dragon','Dragon','🐉'],
 ['bolt','Lightning','⚡'],['star','Star','⭐'],['fox','Fox','🦊'],['owl','Owl','🦉'],
 ['cat','Cat','🐱'],['music','Music','🎵'],['robot','Robot','🤖'],['planet','Planet','🪐'],
 ['tiger','Tiger','🐯'],['diamond','Diamond','💎']
];
export function badgeSymbol(key){return BADGES.find(b=>b[0]===key)?.[2]||'';}
export function setBoardStyle(style){document.body.dataset.boardStyle=Object.hasOwn(BOARD_STYLES,style)?style:'classic';}
export function atmosphereFor(scene){
 if(['space','disco','midnight','arcade','robots'].includes(scene))return 'stars';
 if(['underwater','aliensea'].includes(scene))return 'bubbles';
 if(scene==='snow')return 'snow';
 if(['candy','toys','islands','castle','dinos'].includes(scene))return 'sparkles';
 return 'dust';
}
let atmosphereKey='',victoryTimer;
export function setAtmosphere(scene,enabled){
 const layer=document.getElementById('atmosphere'),kind=atmosphereFor(scene);
 layer.hidden=!enabled;
 if(kind===atmosphereKey)return;
 atmosphereKey=kind;layer.dataset.kind=kind;layer.replaceChildren();
 for(let i=0;i<22;i++){
  const particle=document.createElement('i');
  particle.style.cssText=`--x:${(i*37+11)%100}%;--y:${(i*29+7)%100}%;--size:${kind==='bubbles'?12+i%5*7:2+i%4}px;--duration:${16+i%7*3}s;--delay:-${i*1.7}s;--drift:${i%2?48:-48}px`;
  layer.append(particle);
 }
}
export function clearVictory(){
 clearTimeout(victoryTimer);
 const layer=document.getElementById('victoryStage');
 layer.hidden=true;layer.classList.remove('is-ready','is-playing');
 document.body.classList.remove('spotlight-running');
}
export function prepareVictory(name,color){
 clearVictory();
 const layer=document.getElementById('victoryStage');
 document.getElementById('victoryName').textContent=name;
 layer.style.setProperty('--victory-color',color);
 layer.hidden=false;layer.classList.add('is-ready');
}
export function showVictory(name,color){
 const layer=document.getElementById('victoryStage');
 if(!layer.classList.contains('is-ready'))prepareVictory(name,color);
 layer.classList.add('is-playing');
 document.body.classList.add('spotlight-running');
 clearTimeout(victoryTimer);victoryTimer=setTimeout(clearVictory,5400);
}
