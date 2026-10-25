let timer;
onmessage=e=>{clearInterval(timer);timer=null;if(e.data==='start')timer=setInterval(()=>postMessage('tick'),25)};
