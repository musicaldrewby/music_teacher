const PREFERENCE='mallet-measure-free-welcome-seen-v1';
export function initWelcome(doc=document,storage){
 if(storage===undefined){try{storage=doc.defaultView.localStorage}catch{storage=null}}
 const dialog=doc.querySelector('#welcome');let returnFocus=null;
 const seen=()=>{try{return storage?.getItem(PREFERENCE)==='true'}catch{return false}};
 function enter(){try{storage?.setItem(PREFERENCE,'true')}catch{}dialog.close();(returnFocus?.isConnected?returnFocus:doc.querySelector('#main'))?.focus({preventScroll:true});}
 function show(){returnFocus=doc.activeElement;if(!dialog.open)dialog.showModal();doc.querySelector('#welcome-enter').focus({preventScroll:true});}
 doc.querySelector('#welcome-enter').addEventListener('click',enter);
 doc.querySelector('#welcome-close').addEventListener('click',enter);
 dialog.addEventListener('cancel',e=>{e.preventDefault();enter()});
 if(!seen())show();return show;
}
