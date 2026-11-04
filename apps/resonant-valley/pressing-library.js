import {normalizeSong} from './data.js';
import {sleeveFor,validSleeve} from './record-sleeve.js';
import {playableSong} from './collection.js';
const INBOX='resonant-valley:'+new URL('.',import.meta.url).pathname+'listening-inbox-v1';
export const editionId=id=>typeof id==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
export function shareableRecords(records,profile){
 return records.filter(r=>!r.edition).map(r=>({id:r.id,work:r.song.id||r.id,sleeve:sleeveFor(r),song:playableSong(r.song,profile)}))
  .filter(r=>r.song.tracks.some(t=>t.notes.length));
}
export function listeningCopy(edition){
 if(!editionId(edition?.id)||!validSleeve(edition.sleeve)||typeof edition.artist!=='string')throw Error('Invalid listening copy.');
 const song=normalizeSong(edition.song);return {id:'listen-'+edition.id,edition:edition.id,artist:edition.artist.slice(0,32),sleeve:edition.sleeve,song,colorIndex:0,color:'#ffb84d'};
}
export function inbox(){try{const rows=JSON.parse(localStorage.getItem(INBOX)||'[]');return Array.isArray(rows)?rows.filter(r=>editionId(r?.id)).slice(0,60):[];}catch{return [];}}
export function stashEdition(edition){
 const copies=inbox();if(copies.some(r=>r.id===edition.id))return;listeningCopy(edition);
 if(copies.length>=60)throw Error('Open your valley to file the waiting records.');
 localStorage.setItem(INBOX,JSON.stringify([...copies,edition]));
}
export function clearFiled(ids){localStorage.setItem(INBOX,JSON.stringify(inbox().filter(x=>!ids.has(x.id))));}
