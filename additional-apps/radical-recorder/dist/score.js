import {pitchName,noteLabel} from './core.js';
import {MUSIC_GLYPHS} from './glyphs.js';
const ns='http://www.w3.org/2000/svg';
function svg(tag,attrs={},text){const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}
export const barUnits=meter=>meter==='6/8'?3:Number(meter[0]);
export function makeMeasures(song) {
    if(!song.score?.quantized)return [];
    const beatMs=60000/song.score.bpm,bar=barUnits(song.score.meter),pickup=song.score.pickup||0;
    const measures=[];let measure={index:0,number:pickup?0:1,start:0,end:0,capacity:pickup||bar,pieces:[]},offset=0,time=0;
    song.notes.forEach((note,sourceIndex)=>{
        let units=note.d/beatMs;if(Math.abs(units*4-Math.round(units*4))>.001)throw new Error('This recording needs snapping before staff notation.');
        units=Math.round(units*4)/4;let consumed=0;const pieces=[];
        while(units>.0001){
            if(offset>=measure.capacity-.0001){measure.end=time;measures.push(measure);measure={index:measures.length,number:pickup?measures.length:measures.length+1,start:time,end:time,capacity:bar,pieces:[]};offset=0;}
            const available=Math.min(units,measure.capacity-offset);
            const duration=[4,3,2,1.5,1,.75,.5,.25].find(d=>d<=available+.0001)||.25;
            const piece={key:note.k,units:duration,offset,sourceIndex,start:time,end:time+duration*beatMs,tieIn:false,tieOut:false};
            measure.pieces.push(piece);pieces.push(piece);units-=duration;offset+=duration;consumed+=duration;time+=duration*beatMs;
        }
        if(note.k)pieces.forEach((p,i)=>{p.tieIn=i>0;p.tieOut=i<pieces.length-1;});
    });
    if(measure.pieces.length){measure.end=time;measures.push(measure);}return measures;
}
export function phraseWindows(measures){const windows=[];for(let i=0;i<measures.length;i+=2){const last=measures[Math.min(i+1,measures.length-1)];windows.push({start:measures[i].start,end:last.end,first:i,last:Math.min(i+1,measures.length-1),label:measures[i].number===0?`Pickup–${last.number}`:measures[i]===last?`Measure ${last.number}`:`Measures ${measures[i].number}–${last.number}`});}return windows;}
export function rangeNotes(song,start=0,end=Infinity){let time=0;return song.notes.flatMap((note,sourceIndex)=>{const a=time;time+=note.d;const left=Math.max(a,start),right=Math.min(time,end);return right>left?[{k:note.k,d:right-left,sourceIndex,absolute:left}]:[];});}
function glyph(group,piece,x,y,letters=false,accidental=''){
    const d=piece.units,dotted=[3,1.5,.75].includes(d),base=dotted?d/1.5:d;
    if(!piece.key){
        if(base>=2){group.append(svg('rect',{x:x-8,y:base===4?64:69,width:16,height:7,fill:'currentColor'}));}
        else if(base===1){group.append(svg('path',{d:MUSIC_GLYPHS.quarterRest,transform:`translate(${x-6} 76) scale(.048 -.048)`,fill:'currentColor'}));}
        else {group.append(svg('circle',{cx:x-3,cy:70,r:4,fill:'currentColor'}),svg('path',{d:`M${x-3} 73 Q${x+4} 76 ${x+8} 65 L${x-3} 100`,fill:'none',stroke:'currentColor','stroke-width':3}));if(base===.25)group.append(svg('circle',{cx:x-6,cy:81,r:4,fill:'currentColor'}));}
    } else {
        if(!letters){for(let line=112;line<=y;line+=12)group.append(svg('line',{x1:x-14,x2:x+14,y1:line,y2:line,stroke:'currentColor','stroke-width':1.5}));for(let line=40;line>=y;line-=12)group.append(svg('line',{x1:x-14,x2:x+14,y1:line,y2:line,stroke:'currentColor','stroke-width':1.5}));}
        group.append(svg('ellipse',{cx:x,cy:y,rx:base===4?10:8,ry:5.5,transform:`rotate(-18 ${x} ${y})`,fill:base>=2?'white':'currentColor',stroke:'currentColor','stroke-width':2}));
        const up=letters||y>76,stemX=x+(up?7:-7),stemTop=y+(up?-42:42);
        if(base<4)group.append(svg('line',{x1:stemX,x2:stemX,y1:y,y2:stemTop,stroke:'currentColor','stroke-width':2}));
        if(base<=.5)group.append(svg('path',{d:MUSIC_GLYPHS[(base<=.25?'flag16':'flag8')+(up?'Up':'Down')],transform:`translate(${stemX} ${stemTop}) scale(.048 -.048)`,fill:'currentColor'}));
        if(accidental&&!letters)group.append(svg('text',{x:x-21,y:y+6,'font-size':23,'text-anchor':'middle','font-family':'serif'},accidental));
    }
    if(dotted)group.append(svg('circle',{cx:x+15,cy:piece.key?y-3:79,r:2.3,fill:'currentColor'}));
}
function staffY(key){if(!key)return 80;const m=key.match(/^([A-G])([#-]?)(\d)/);return 112-((Number(m[3])-5)*7+'CDEFGAB'.indexOf(m[1]))*6;}
export function renderScore(container,song,measures,page,format,onNote){
    container.replaceChildren();const first=page*2,visible=measures.slice(first,first+2);if(!visible.length)return;
    const root=svg('svg',{viewBox:'0 0 1000 182',role:'group','aria-label':song.title+' notation'});let x0=18;const width=(964)/visible.length,anchors=[];
    visible.forEach((measure,j)=>{
        const left=x0+j*width,right=left+width;root.append(svg('text',{x:left+6,y:18,'font-size':12,'font-weight':700,fill:'#526066'},measure.number===0?'Pickup':'Measure '+measure.number));
        const letters=format==='letters',pad=j===0&&!letters?74:22,usable=width-pad-18;
        if(!letters){for(let line=0;line<5;line++)root.append(svg('line',{x1:left,x2:right,y1:52+line*12,y2:52+line*12,stroke:'#58636c','stroke-width':1}));if(j===0){root.append(svg('path',{d:MUSIC_GLYPHS.gClef,transform:`translate(${left+5} 88) scale(.048 -.048)`,fill:'#17272c'}));const [num,den]=song.score.meter.split('/');root.append(svg('text',{x:left+47,y: 72,'font-size':21,'font-family':'serif','font-weight':700},num),svg('text',{x:left+47,y:94,'font-size':21,'font-family':'serif','font-weight':700},den));}}
        const accidentalState={};
        // Even spacing keeps sixteenths and accidentals readable on classroom displays.
        measure.pieces.forEach((piece,i)=>{
            const x=left+pad+(i+.5)*usable/Math.max(1,measure.pieces.length),y=letters?72:staffY(piece.key);
            const group=svg('g',{class:'score-note',tabindex:0,role:'button','data-source':piece.sourceIndex,'data-from':piece.start,'data-to':piece.end,'aria-label':piece.key?`${noteLabel(piece.key)}, ${piece.units} quarter-note beats`:`Rest, ${piece.units} quarter-note beats`});
            group.append(svg('rect',{class:'score-highlight',x:x-25,y:28,width:50,height:135,rx:14,fill:'transparent'}));
            let accidental='';if(piece.key){const m=piece.key.match(/^([A-G])([#-]?)(\d)/),id=m[1]+m[3];const prior=accidentalState[id]||'';if(m[2])accidental=m[2]==='#'?'♯':'♭';else if(prior)accidental='♮';accidentalState[id]=m[2];}
            glyph(group,piece,x,y,letters,accidental);anchors.push({piece,x,y,left,right});
            if(format!=='staff')group.append(svg('text',{x,y:letters?132:155,'font-size':letters?30:17,'font-weight':800,'text-anchor':'middle'},piece.key?pitchName(piece.key):'–'));
            if(letters&&piece.key&&/6/.test(piece.key))group.append(svg('text',{x,y:149,'font-size':10,'text-anchor':'middle'},'HIGH'));
            onNote(group,piece.sourceIndex);root.append(group);
        });
        root.append(svg('line',{x1:right,x2:right,y1:letters?40:52,y2:letters?145:100,stroke:'#18242b','stroke-width':j===visible.length-1?2:1}));
    });
    anchors.forEach((a,i)=>{
        if(!a.piece.key)return;
        if(a.piece.tieOut){const next=anchors[i+1],connected=next&&next.piece.sourceIndex===a.piece.sourceIndex;const end=connected?next.x-7:a.right-4;root.append(svg('path',{d:`M${a.x+7} ${a.y+13} Q${(a.x+end)/2} ${a.y+29} ${end} ${a.y+13}`,stroke:'#17272c',fill:'none','stroke-width':1.8}));}
        if(a.piece.tieIn&&(!anchors[i-1]||anchors[i-1].piece.sourceIndex!==a.piece.sourceIndex))root.append(svg('path',{d:`M${a.left+5} ${a.y+13} Q${(a.left+a.x)/2} ${a.y+29} ${a.x-7} ${a.y+13}`,stroke:'#17272c',fill:'none','stroke-width':1.8}));
    });container.append(root);
}
