import * as T from 'three';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';

// Preserve alpha for transparent exports and prevent a color backdrop from
// being mistaken for packed depth. The real color remains in the input buffer.
export class FocusPass extends BokehPass{
 constructor(scene:T.Scene,camera:T.PerspectiveCamera){super(scene,camera,{focus:13,aperture:.0001,maxblur:.018});this.materialBokeh.fragmentShader=this.materialBokeh.fragmentShader.replace('gl_FragColor.a = 1.0;','').replace('( focus + viewZ )','( focus + viewZ ) / max( 0.01, -viewZ )');}
 render(renderer:T.WebGLRenderer,write:T.WebGLRenderTarget,read:T.WebGLRenderTarget){
  const background=this.scene.background,hidden:T.Object3D[]=[],override=this.scene.overrideMaterial;
  this.scene.background=null;this.scene.traverseVisible(o=>{if(o.userData.editorHelper||o.userData.focusDepthIgnore||(o instanceof T.Mesh&&(Array.isArray(o.material)?o.material:[o.material]).every(m=>m.opacity<=.001))){hidden.push(o);o.visible=false;}});
  try{super.render(renderer,write,read,0,false);}finally{this.scene.background=background;this.scene.overrideMaterial=override;hidden.forEach(o=>o.visible=true);}
 }
}
