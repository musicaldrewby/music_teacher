export const ROOM={x:140,y:20,width:1060,height:720};
export function cameraFit(width,height,camera={}){
 const zoom=Math.max(1,Math.min(1.8,camera.zoom||1));
 const scale=(camera.overview||height>width?Math.min(width/ROOM.width,height/ROOM.height):Math.max(width/ROOM.width,height/ROOM.height))*zoom;
 const cx=ROOM.x+ROOM.width/2,cy=ROOM.y+ROOM.height/2;
 const limitX=Math.max(0,(ROOM.width*scale-width)/2)+120*scale;
 const limitY=Math.max(0,(ROOM.height*scale-height)/2)+100*scale;
 const panX=Math.max(-limitX,Math.min(limitX,camera.panX||0)),panY=Math.max(-limitY,Math.min(limitY,camera.panY||0));
 return {scale,x:width/2-cx*scale+panX,y:height/2-cy*scale+panY,panX,panY};
}
export function screenPoint(point,fit){return {x:point.x*fit.scale+fit.x,y:point.y*fit.scale+fit.y};}
export function worldPoint(point,fit){return {x:(point.x-fit.x)/fit.scale,y:(point.y-fit.y)/fit.scale};}
