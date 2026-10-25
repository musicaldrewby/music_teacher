const PREFERENCE='mallet-measure-skip-welcome-v1';
export function initWelcome(doc=document,storage){
 if(storage===undefined){try{storage=doc.defaultView.localStorage}catch{storage=null}}
 const dialog=doc.querySelector('#welcome'),skip=doc.querySelector('#welcome-skip');
 const skipped=()=>{try{return storage.getItem(PREFERENCE)==='true'}catch{return false}};
 function enter(){try{if(skip.checked)storage.setItem(PREFERENCE,'true');else storage.removeItem(PREFERENCE)}catch{}dialog.close();doc.querySelector('#main')?.focus();}
 function show(){skip.checked=skipped();if(!dialog.open)dialog.showModal();doc.querySelector('#welcome-enter').focus();}
 doc.querySelector('#welcome-enter').addEventListener('click',enter);
 dialog.addEventListener('cancel',event=>{event.preventDefault();enter()});
 if(!skipped())show();
 return show;
}
