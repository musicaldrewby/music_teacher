import {renderWAV} from './audio-export.js';
import {safeFilename,zipFiles} from './export-formats.js';
self.onmessage=async({data})=>{
 try{
  const {project,bank,effects,master,tail,stems}=data,name=safeFilename(project.name),files=[];let clipped=0;
  for(let i=0;i<(stems?8:1);i++){
   const result=await renderWAV(project,bank,{effects,master,tail,stem:stems?i:-1,onProgress:percent=>self.postMessage({type:'progress',percent:Math.round((i*100+percent)/(stems?8:1)),label:stems?'Track '+(i+1)+' / 8':'Stereo mix'})});clipped+=result.clipped;
   files.push({name:stems?String(i+1).padStart(2,'0')+'_'+safeFilename(project.tracks[i].name)+'.wav':name+'.wav',data:result.buffer});
  }
  const buffer=stems?zipFiles(files):files[0].data;self.postMessage({type:'done',buffer,name:name+(stems?'_tracks.zip':'.wav'),mime:stems?'application/zip':'audio/wav',clipped},[buffer]);
 }catch(e){self.postMessage({type:'error',message:e.message})}
};
