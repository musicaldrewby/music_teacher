import {renderPatternScore} from './notation.js';import {scoreProject} from './catalog.js';
const NS='http://www.w3.org/2000/svg';
export const printDefaults={paper:'letter',staffScale:1,noteNames:false,teacherMeasures:4,partMeasures:2,lineBreaks:[],pageBreaks:[]};
export function parseBreaks(text,bars){if(!String(text).trim())return [];const values=String(text).split(',').map(v=>Number(v.trim()));if(values.some(n=>!Number.isInteger(n)||n<2||n>bars))throw Error('Breaks must be measure numbers from 2 to '+bars+', separated by commas.');return [...new Set(values)].sort((a,b)=>a-b);}
export function printSettings(p){const n=p.notation||{};return {...printDefaults,...n,paper:n.paper==='a4'?'a4':'letter',staffScale:[.8,1,1.2,1.4].includes(n.staffScale)?n.staffScale:1};}
export function createScorePages(project,{part=null,settings=printSettings(project),document=globalThis.document}={}){
 if(!project.tracks.length)throw Error('Add an instrument before printing.');
 const p=scoreProject({...project,notation:{...project.notation,...settings}}),holder=document.createElement('div');
 holder.style.cssText='position:absolute;left:-100000px;top:0;width:1080px;';document.body.append(holder);
 const width=settings.paper==='a4'?794:816,height=settings.paper==='a4'?1123:1056,margin=48,usable=width-margin*2,labelWidth=part?0:95,gap=12,musicWidth=usable-labelWidth;
 const pages=[],warnings=new Set();let page,y;
 const el=(name,attrs,text)=>{const node=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs||{}))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;return node;};
 const addText=(text,x,y,size=12,options={})=>page.append(el('text',{x,y,'font-family':'Arial',fill:'#111','font-size':size,...options},text));
 const newPage=()=>{page=el('svg',{xmlns:NS,viewBox:`0 0 ${width} ${height}`,width,height,role:'img','aria-label':`${project.title}, page ${pages.length+1}`});page.append(el('rect',{width,height,fill:'white'}));pages.push(page);addText(project.title.slice(0,80),margin,48,21,{'font-family':'Georgia'});const name=part?project.tracks.find(t=>t.id===part)?.name:'Teacher score';addText([project.composer,name,project.meter,project.bpm+' BPM'].filter(Boolean).join(' · '),margin,71,11);addText(project.title.slice(0,50),margin,height-28,9);addText(String(pages.length),width-margin,height-28,10,{'text-anchor':'end'});y=96;};
 const wrap=(text,limit)=>{const words=text.split(/\s+/),lines=[];for(const word of words){if(!lines.length||lines.at(-1).length+word.length>limit)lines.push(word);else lines[lines.length-1]+=' '+word;}return lines;};
 try{
  renderPatternScore(holder,p,part?[part]:p.tracks.map(t=>t.id),.25,{layout:part?'part':'teacher',scale:settings.staffScale});newPage();
  for(const system of holder.querySelectorAll('.score-system')){
   const rows=[...system.querySelectorAll('.score-staff')].map(staff=>{const svg=staff.querySelector('.staff-music svg'),vb=svg.getAttribute('viewBox').split(' ').map(Number),scale=musicWidth/vb[2],legend=staff.querySelector('.compact-stroke-key')?.textContent||[...staff.querySelectorAll('.stroke-key span')].map(e=>e.textContent).join(' · '),legendLines=wrap(legend,part?110:95);return {svg,scale,height:vb[3]*scale+(part?22:0)+(legend?legendLines.length*11+5:0),label:staff.querySelector('h4').textContent,legendLines:legend?legendLines:[]};});
   const total=rows.reduce((n,r)=>n+r.height,0)+gap;
   if((system.dataset.pageBreak==='true'||y+total>height-margin)&&y>96)newPage();
   if(total>height-margin-96)warnings.add('A large ensemble system spans pages. A smaller staff size or fewer visible parts will keep more together.');
   for(const [index,r]of rows.entries()){
    if(y+r.height>height-margin&&y>96){newPage();addText(`Measures ${system.dataset.firstMeasure}–${+system.dataset.firstMeasure + +system.dataset.measureCount-1} · continued`,margin,y,10);y+=20;}
    if(r.height>height-margin-y)throw Error('A staff is too tall for this page. Choose a smaller staff size.');
    const begin=y;if(part){addText(r.label.split(' · mm.')[0],margin,y+13,11);y+=22;}else for(const [i,line]of wrap(r.label,17).entries())addText(line,margin,y+28+i*12,10);
    const g=el('g',{fill:'black',stroke:'black','stroke-width':.3,'stroke-dasharray':'none','font-family':'Arial, sans-serif','font-size':'10pt','font-weight':'normal','font-style':'normal',transform:`translate(${margin+labelWidth} ${y}) scale(${r.scale})`});for(const child of r.svg.childNodes)g.append(child.cloneNode(true));page.append(g);
    const vb=r.svg.getAttribute('viewBox').split(' ').map(Number);y+=vb[3]*r.scale;
    for(const line of r.legendLines){addText(line,margin+labelWidth,y+9,8);y+=11;}if(r.legendLines.length)y+=5;
    if(r.scale*10<4)warnings.add(`Measures ${system.dataset.firstMeasure}–${+system.dataset.firstMeasure + +system.dataset.measureCount-1} are crowded. Try fewer measures per line.`);
   }
   y+=gap;
  }
  return {pages,warnings:[...warnings],width,height,settings};
 }finally{holder.remove();}
}
export async function scorePDF(layout,{onProgress=()=>{}}={}){
 const {jsPDF}=await import('./vendor/document-tools.js');const pdf=new jsPDF({unit:'pt',format:[layout.width*.75,layout.height*.75],compress:true});
 for(let i=0;i<layout.pages.length;i++){if(i)pdf.addPage();const svg=layout.pages[i].cloneNode(true);svg.style.position='absolute';svg.style.left='-100000px';document.body.append(svg);try{await pdf.svg(svg,{x:0,y:0,width:layout.width*.75,height:layout.height*.75});}finally{svg.remove();}onProgress((i+1)/layout.pages.length);}
 return pdf.output('blob');
}
