const palette={dark:'#23203d',edge:'#111527',gold:'#ffcf72',deepgold:'#b77d45',cream:'#ffebbb',mint:'#8ae1b5',green:'#4f9b82',blue:'#8ebfff',deepblue:'#526998',red:'#ed6c82',purple:'#bc93e4',silver:'#c5c1d9'};
export function icon(name){
 let r='';const rect=(x,y,w,h,c)=>{r+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${palette[c]||c}"/>`;};
 const line=(x,y,w,h,c='dark')=>rect(x,y,w,h,c);
 if(name==='guitar') {rect(7,9,8,10,'red');rect(5,12,12,5,'red');rect(8,11,5,6,'cream');rect(11,5,3,8,'deepgold');rect(13,2,4,5,'gold');rect(12,6,1,10,'silver');rect(7,14,6,2,'dark');rect(6,17,7,1,'deepgold');}
 else if(name==='keys'){rect(2,7,20,10,'dark');rect(3,8,18,7,'cream');for(let i=0;i<9;i++)rect(4+i*2,8,1,7,'silver');for(let i of [0,1,3,4,5,7])rect(5+i*2,8,1,4,'dark');rect(2,6,20,2,'red');rect(4,17,2,5,'silver');rect(18,17,2,5,'silver');}
 else if(name==='drums'){rect(7,10,10,10,'deepblue');rect(9,11,6,8,'blue');rect(10,13,4,4,'dark');rect(3,7,6,5,'blue');rect(15,7,6,5,'blue');rect(1,4,8,2,'gold');rect(16,3,7,2,'gold');rect(4,6,1,15,'silver');rect(19,5,1,16,'silver');rect(10,20,1,3,'silver');rect(15,20,1,3,'silver');}
 else if(name==='lesson'){rect(5,2,15,19,'deepgold');rect(3,3,15,19,'cream');for(let y of [7,10,13,16])rect(5,y,11,1,'deepgold');rect(10,6,2,8,'dark');rect(11,6,4,2,'dark');rect(7,13,4,3,'dark');}
 else if(name==='amp'||name==='radio'){rect(3,3,18,19,'dark');rect(4,5,16,15,'deepblue');rect(5,8,14,11,'edge');for(let y of [9,12,15,18])rect(6,y,12,1,'deepblue');rect(5,5,2,2,'gold');rect(9,5,2,2,'red');rect(13,5,2,2,'mint');if(name==='radio')rect(17,0,1,4,'silver');}
 else if(name==='cash'){for(let o of [5,3,1]){rect(2,5+o,19,9,'green');rect(3,5+o,17,6,'mint');rect(5,6+o,2,4,'green');rect(16,6+o,2,4,'green');rect(10,6+o,3,4,'green');}rect(9,5,4,11,'gold');}
 else if(name==='income'){rect(2,14,4,8,'green');rect(9,9,4,13,'mint');rect(16,3,4,19,'mint');rect(16,3,4,2,'cream');}
 else if(name==='fans'||name==='alien'){if(name==='alien'){rect(6,3,12,10,'mint');rect(8,13,8,3,'mint');rect(7,6,3,4,'dark');rect(14,6,3,4,'dark');rect(9,17,6,6,'purple');}else{for(let [x,y] of [[1,7],[8,2],[16,7]]){rect(x+1,y,5,6,'blue');rect(x,y+7,7,9,'deepblue');rect(x+1,y+7,5,3,'blue');}}}
 else if(name==='star'||name==='sun'){for(let [x,y,w,h] of [[10,1,4,21],[1,10,22,4],[5,6,14,12],[7,4,10,16]])rect(x,y,w,h,'gold');rect(8,7,8,9,'cream');if(name==='sun'){rect(10,9,2,2,'dark');rect(14,9,2,2,'dark');}}
 else if(name==='record'||name==='planet'||name==='portal'||name==='moon'){rect(6,2,12,20,name==='portal'?'purple':'deepblue');rect(3,5,18,14,name==='moon'?'silver':'deepblue');rect(2,8,20,8,name==='portal'?'purple':name==='moon'?'silver':'deepblue');if(name==='record'){rect(8,7,8,10,'red');rect(10,10,4,4,'cream');}else if(name==='portal'){rect(5,6,14,12,'dark');rect(8,8,8,8,'purple');rect(10,10,5,5,'edge');rect(14,4,3,3,'cream');}else if(name==='planet'){rect(0,14,24,3,'purple');rect(3,11,21,2,'purple');rect(7,5,4,2,'mint');}else{rect(6,7,4,4,'deepblue');rect(13,13,5,3,'deepblue');}}
 else if(name==='van'||name==='rocket'){if(name==='van'){rect(1,6,22,13,'green');rect(3,7,10,5,'blue');rect(16,7,5,5,'blue');rect(1,14,22,2,'mint');rect(4,18,5,5,'dark');rect(16,18,5,5,'dark');rect(5,19,3,3,'silver');rect(17,19,3,3,'silver');}else{rect(10,1,4,4,'red');rect(7,5,10,13,'silver');rect(9,7,6,5,'blue');rect(4,13,3,9,'red');rect(17,13,3,9,'red');rect(9,18,6,5,'gold');}}
 else if(name==='lights'){rect(1,2,22,3,'silver');for(let x of [3,10,17]){rect(x,5,4,7,'dark');rect(x,9,4,3,x===3?'gold':x===10?'purple':'blue');}rect(3,14,4,7,'deepgold');rect(10,14,4,9,'purple');rect(17,14,4,7,'deepblue');}
 else if(name==='mixer'){rect(2,4,20,17,'dark');rect(3,5,18,14,'deepblue');for(let x of [5,9,13,17]){rect(x,7,1,10,'silver');rect(x-1,x%3+9,3,3,'cream');rect(x,6,1,1,'mint');}}
 else if(name==='lock'){rect(7,2,10,3,'gold');rect(5,5,3,7,'gold');rect(16,5,3,7,'gold');rect(4,10,16,12,'gold');rect(10,13,4,6,'dark');}
 else if(name==='tape'){rect(2,6,20,14,'purple');rect(4,8,16,6,'cream');rect(6,9,3,3,'dark');rect(15,9,3,3,'dark');rect(8,17,9,2,'dark');}
 else if(name==='case'){rect(7,2,10,3,'silver');rect(2,6,20,16,'dark');rect(3,7,18,13,'deepblue');rect(3,12,18,2,'silver');rect(6,10,3,5,'silver');rect(16,10,3,5,'silver');}
 else if(name==='coffee'){rect(5,8,12,12,'cream');rect(17,9,5,7,'gold');rect(17,11,3,3,'dark');rect(3,21,18,2,'deepgold');rect(7,2,2,4,'silver');rect(12,1,2,5,'silver');}
 else if(name==='shirt'){rect(6,4,12,17,'purple');rect(2,6,4,7,'purple');rect(18,6,4,7,'purple');rect(9,4,6,3,'dark');rect(10,10,4,6,'gold');}
 else if(name==='ticket'){rect(2,5,20,14,'gold');rect(5,8,10,2,'deepgold');rect(5,13,10,2,'deepgold');for(let y of [6,9,12,15])rect(17,y,1,2,'dark');}
 else if(name==='home'){rect(3,11,18,12,'purple');rect(5,7,14,4,'red');rect(8,4,8,3,'red');rect(11,1,2,3,'red');rect(5,14,4,4,'gold');rect(15,14,4,4,'gold');rect(10,16,4,7,'dark');}
 else {rect(5,5,14,14,'purple');rect(8,8,8,8,'gold');}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
