// Navigation and panels are presentation state only: opening one never stops audio.
export function createWorkspaceLayout(){
 const $=id=>document.getElementById(id),names=['settings','record','scene','inspector','export','vr'];let current=null,opener=null,settings='midi',edit='quantize',inspector='track';
 function close(restore=true){if(!current)return false;$(current+'-drawer').hidden=true;for(const b of document.querySelectorAll('[data-open-drawer]'))b.setAttribute('aria-expanded','false');current=null;document.body.dataset.drawer='';if(restore&&opener?.isConnected!==false)opener?.focus({preventScroll:true});return true}
 function open(name,trigger=document.activeElement){if(['track','note','edit'].includes(name)){setInspector(name);name='inspector'}if(!names.includes(name))return;close(false);current=name;opener=trigger;$(name+'-drawer').hidden=false;document.body.dataset.drawer=name;for(const b of document.querySelectorAll('[data-open-drawer]'))b.setAttribute('aria-expanded',String(b.dataset.openDrawer===name));$(name+'-heading').focus({preventScroll:true});if(name==='export')$('export-panel').open=true}
 function setInspector(page){if(!['track','note','edit'].includes(page))return;inspector=page;for(const name of ['track','note','edit'])$(name+'-drawer').hidden=page!==name;for(const b of document.querySelectorAll('[data-inspector-page]'))b.setAttribute('aria-pressed',String(b.dataset.inspectorPage===page))}
 function setSettings(page){if(!['midi','metronome'].includes(page))return;settings=page;for(const b of document.querySelectorAll('[data-settings-page]'))b.setAttribute('aria-pressed',String(b.dataset.settingsPage===page));$('lcd-midi-page').hidden=page!=='midi';$('metronome-options').hidden=page!=='metronome'}
 function setEdit(page){if(!['quantize','measures'].includes(page))return;edit=page;for(const b of document.querySelectorAll('[data-edit-page]'))b.setAttribute('aria-pressed',String(b.dataset.editPage===page));$('quantize-tools').hidden=page!=='quantize';$('measure-tools').hidden=page!=='measures'}
 for(const b of document.querySelectorAll('[data-open-drawer]')){b.setAttribute('aria-controls',b.dataset.openDrawer+'-drawer');b.setAttribute('aria-expanded','false');b.onclick=()=>current===b.dataset.openDrawer?close():open(b.dataset.openDrawer,b)}
 for(const b of document.querySelectorAll('[data-close-drawer]'))b.onclick=()=>close();
 for(const b of document.querySelectorAll('[data-open-settings]'))b.onclick=()=>{setSettings(b.dataset.openSettings);open('settings',b)};
 for(const b of document.querySelectorAll('[data-settings-page]'))b.onclick=()=>setSettings(b.dataset.settingsPage);
 for(const b of document.querySelectorAll('[data-edit-page]'))b.onclick=()=>setEdit(b.dataset.editPage);
 for(const b of document.querySelectorAll('[data-inspector-page]'))b.onclick=()=>setInspector(b.dataset.inspectorPage);
 function measure(){for(const [id,key] of [['workstation-header','--header-height'],['transport-dock','--transport-height']]){const height=$(id).getBoundingClientRect().height;if(height>0)$('workstation-main').style.setProperty(key,Math.ceil(height)+'px')}}
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(measure);observer.observe($('workstation-header'));observer.observe($('transport-dock'))}measure();setSettings(settings);setEdit(edit);setInspector(inspector);
 return {open,close,setSettings,get current(){return current},get settings(){return settings}};
}
