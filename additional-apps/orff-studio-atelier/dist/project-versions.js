const PREFIX='mallet-measure-versions:';
export function readVersions(storage,id){const raw=storage.getItem(PREFIX+id);if(!raw)return [];const entries=JSON.parse(raw);if(!Array.isArray(entries))throw Error('Saved versions could not be read. Download your current project before clearing browser data.');return entries;}
export function saveVersion(storage,project,name,{now=Date.now(),id=globalThis.crypto?.randomUUID?.()||String(Date.now())}={}){
 if(!project.projectId)throw Error('Save this session before creating a version.');const title=String(name||'').trim().slice(0,80);if(!title)throw Error('Give this version a name.');
 const versions=readVersions(storage,project.projectId);if(versions.length>=20)throw Error('This project has 20 versions. Download and remove an older version before saving another.');
 const entry={id,name:title,created:now,project:structuredClone(project)};
 storage.setItem(PREFIX+project.projectId,JSON.stringify([...versions,entry]));return entry;
}
export function deleteVersion(storage,projectId,id){storage.setItem(PREFIX+projectId,JSON.stringify(readVersions(storage,projectId).filter(v=>v.id!==id)));}
