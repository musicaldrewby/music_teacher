import {useEffect,useRef} from 'react';

/** Keep keyboard navigation in an open dialog, including collapsed sections. */
export function useDialogFocus(open:string,busy:boolean,close:()=>void){
 const root=useRef<HTMLDivElement>(null),state=useRef({busy,close});state.current={busy,close};
 useEffect(()=>{
  const dialog=root.current;if(!open||!dialog)return;
  const previous=document.activeElement as HTMLElement|null;
  const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],summary,[tabindex]')).filter(el=>el.tabIndex>=0&&!el.matches(':disabled,[aria-hidden="true"]')&&el.getClientRects().length>0);
  (controls()[0]||dialog).focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&!state.current.busy){event.preventDefault();event.stopPropagation();state.current.close();}
   if(event.key!=='Tab')return;
   const items=controls(),first=items[0]||dialog,last=items.at(-1)||dialog,active=document.activeElement;
   if(!dialog.contains(active)||active===dialog||event.shiftKey&&active===first||!event.shiftKey&&active===last){event.preventDefault();(event.shiftKey?last:first).focus();}
  };
  dialog.addEventListener('keydown',key);
  return()=>{dialog.removeEventListener('keydown',key);if(previous?.isConnected){const details=previous.closest('details');(details&&!details.open?details.querySelector('summary'):previous)?.focus();}};
 },[open]);
 return root;
}
