import {sound} from './catalog.js';
import {soundArt} from './instrument-art.js';
export {soundArt};

// Original small pixel illustrations for building materials and furniture.
export function itemArt(id,it){
 let paths='';if(it.texture){const speck=it.texture==='plank'?'<path d="M5 17l10 4m3-6 9-4m-9 10 9-4" stroke="#192335" stroke-opacity=".38" stroke-width="1.5"/>':it.texture==='bark'||it.texture==='birch'?'<path d="M7 14v9m5-7v8m9-10v9m4-11v7" stroke="#293346" stroke-opacity=".4" stroke-width="1.5"/>':'<path d="M6 16h3v2H6zm5 6h2v2h-2zm9-4h3v2h-3zm3-7h2v2h-2z" fill="#233147" opacity=".24"/>';paths=`<path fill="${it.color}" d="m2 9 14-7 14 7v15l-14 7-14-7z"/><path fill="#fff" opacity=".24" d="m2 9 14-7 14 7-14 7z"/><path fill="#101e31" opacity=".35" d="m16 16 14-7v15l-14 7z"/>${speck}`;}
 else if(['gigPoster','exchangeCrate','roofSlope','beam','shutter','sign','rail','railBend','railGrade','railSwitch','minecart'].includes(id)){
  const icons={
   gigPoster:'<path fill="#c08369" d="M5 2h22v28H5z"/><path fill="#f2cd92" d="M7 4h18v24H7z"/><path fill="#3f3855" d="M9 6h14v13H9z"/><path fill="#e18972" d="M10 16h3v-4h4v2h3v-4h3v8H10z"/><path fill="#604e66" d="M9 21h4v4H9zm5 0h4v4h-4zm5 0h4v4h-4z"/>',
   exchangeCrate:'<path fill="#6f5363" d="M3 26V8h3v18zm22 1V7h3v20z"/><path fill="#dc8e70" d="M2 5h26l3 4H1z"/><path fill="#c2986c" d="M4 19h23v8H4z"/><path fill="#465170" d="M6 10h18v5H6z"/><path fill="#edc894" d="M8 11h13v2H8zm-1 6h5v5H7z"/><path fill="#ab838e" d="M13 16h6v6h-6z"/>',

   roofSlope:'<path fill="#713e36" d="M2 22 21 4l9 5v17L9 30z"/><path fill="#cc7958" d="M2 22 20 3l11 5L11 27z"/><path fill="#995447" d="m6 18 10 4 2-2-10-4zm6-6 10 4 2-2-10-4zm5-5 10 4 2-2-10-4z"/>',
   beam:'<path fill="#ad7851" d="m2 16 23-11 6 4v10L9 30l-7-4z"/><path fill="#754631" d="m9 21 22-12v10L9 30z"/><path fill="#514340" d="m8 13 4-2 7 4v10l-4 2V17zm11-5 3-2 7 4v10l-3 1V12z"/>',
   shutter:'<path fill="#305b59" d="M2 3h13v26H2zm15 0h13v26H17z"/><path fill="#77afa0" d="M4 5h9v3H4zm0 6h9v3H4zm0 6h9v3H4zm0 6h9v3H4zM19 5h9v3h-9zm0 6h9v3h-9zm0 6h9v3h-9zm0 6h9v3h-9z"/>',
   sign:'<path fill="#775036" d="M13 16h6v15h-6z"/><path fill="#d39a60" d="M2 4h28v19H2z"/><path fill="#315959" d="M5 7h13v13H5z"/><path fill="#f0c274" d="M8 10h4v3H8zm12-1h7v3h-7zm0 6h5v2h-5z"/>',
   minecart:'<path fill="#424250" d="M5 20h23l-4 6H8zm2 4h5v5H7zm14 0h5v5h-5z"/><path fill="#a8c2ca" d="m2 7 18-3 10 4-3 13L9 25 4 20z"/><path fill="#364959" d="m5 8 15-2 7 2-15 4z"/><path fill="#637e8e" d="m11 15 17-4-2 9-15 3z"/>'
  };
  const rail='<path fill="none" stroke="#95694d" stroke-width="4" d="m3 23 16 5m-12-13 16 5M11 8l16 5"/>';
  const straights='<path fill="none" stroke="#c9dce0" stroke-width="2.8" d="M3 28 17 4m-2 28L29 8"/>';
  icons.rail=rail+straights;icons.railGrade=rail+straights+'<path fill="#eaae64" d="M2 12 9 3l3 9H9v4H6v-4z"/>';
  const curve='<path fill="none" stroke="#c9dce0" stroke-width="2.8" d="m2 26 6-12 6-5 16-2M13 31l5-11 3-3 10-3"/>';
  icons.railBend=rail+curve;icons.railSwitch=rail+straights+curve+'<path fill="#ffb55c" d="M2 8h5v5H2z"/>';
  paths=icons[id];
 }
 else if(id==='stick')paths='<path fill="#4f372c" d="M3 25 22 3h4v4L7 29H3zm9 2L26 9h4v4L16 31h-4z"/><path fill="#e2ad68" d="M4 24 22 4h2v2L6 27H4zm9 3L27 10h2v2L15 29h-2z"/>';
 else if(id==='crate')paths='<path fill="#c69565" d="m2 10 16-6 12 5-16 7z"/><path fill="#26334a" d="m5 10 13-4 8 3-12 5z"/><path fill="#b4d9db" d="M8 7l10-3 7 3-10 4z"/><path fill="#edb17d" d="M10 9l10-3 6 3-11 4z"/><path fill="#926245" d="m2 12 12 6v12L2 24z"/><path fill="#bd8757" d="m14 18 16-7v11l-16 8z"/><path fill="#624235" d="m3 17 10 4v2L3 19zm13 5 13-6v2l-13 6z"/>';
 else if(it.instrument)return soundArt(sound(it.instrument)||{id:'drums',kind:'drum'});
 else {const furniture={bed:'M3 13h5v4h20V9h3v18h-3v-3H6v3H3z',door:'M7 2h18v28H7z',steps:'M2 21h9v-7h9V7h10v22H2z',record:'M3 10h26v13H3zm2 13h4v7H5zm18 0h4v7h-4z',bench:'M3 15h26v6H3zm3-8h21v5H6zm0 14h4v7H6zm17 0h4v7h-4z',lantern:'M12 1h8v4h5v18h-6v7h-6v-7H7V5h5z',planter:'M3 16h26l-3 13H6zm5-7h3v7H8zm8-5h3v12h-3zm6 5h3v7h-3z',desk:'M2 16h28v5H2zm4 5h3v9H6zm17 0h3v9h-3zM9 5h14v10H9z'};paths=`<path fill="${it.color}" d="${furniture[id]||furniture.desk}"/>`+(id==='lantern'?'<path fill="#fff0ac" d="M10 8h12v12H10z"/>':id==='record'?'<path fill="#223044" d="M7 12h13v6H7z"/><path fill="#fbb98b" d="M12 14h3v2h-3z"/>':id==='door'?'<path fill="#a2ccdf" d="M10 5h12v8H10z"/><path fill="#f5d484" d="M19 18h3v3h-3z"/>':id==='bed'?'<path fill="#e5edf5" d="M22 13h6v4h-6z"/>':'');}
 return `<svg class="item-art" viewBox="0 0 32 32" aria-hidden="true">${paths}</svg>`;
}
