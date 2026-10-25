// Standard Baroque/English fingerings, lowest note through two octaves.
// Verified against American Recorder Society soprano/tenor and alto charts:
// https://americanrecorder.org/docs/Fingering_Chart_for_Soprano_Recorder.pdf
// https://americanrecorder.org/docs/Fingering_Chart_for_Alto_Recorder.pdf
// Positions: thumb, 1, 2, 3, 4, 5, double 6, double 7. 1=closed, 0=open,
// h=outer small hole closed, v=vented thumb. Original diagrams are drawn below.
export const BAROQUE_FINGERINGS=[
 '11111111','1111111h','11111110','111111h0','11111100','11111011','11110110','11110000',
 '111011h0','11100000','11011000','11000000','10100000','01100000','00100000','00111110',
 'v1111100','v1111010','v1110100','v1110000','v1101000','v1100000','v110011h','v1101100','v1001100'
];
export function recorderFingering(instrument,note){
 const offset=note-instrument.base;
 return instrument.shape==='recorder'&&Number.isInteger(offset)?BAROQUE_FINGERINGS[offset]??null:null;
}
export function fingeringDiagram(pattern){
 if(!pattern)return '<p class="fingering-empty">Select a recorder note to see its fingering.</p>';
 const names=['Thumb','1','2','3','4','5','6','7'],description=[...pattern].map((v,i)=>`${names[i]} ${v==='1'?'closed':v==='v'?'slightly open':v==='h'?'outer hole closed':'open'}`).join(', ');
 const circle=(x,y,r,filled)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${filled?'#365443':'#fffdf6'}" stroke="#365443" stroke-width="1.8"/>`;
 return `<svg class="recorder-fingering" viewBox="0 0 174 245" role="img" aria-label="Baroque fingering: ${description}"><path d="M92 42v192" stroke="#c4cdbb" stroke-width="34" stroke-linecap="round"/>${[...pattern].map((v,i)=>{const x=i?92:31,y=i?30+i*25:55;return `<text x="${i?126:8}" y="${i?y+4:29}" font-size="11" fill="#526646">${names[i]}</text>`+(i>=6?circle(x-7,y,5.5,v!=='0')+circle(x+7,y,6.5,v==='1'):circle(x,y,8,v!=='0'))+(v==='v'?`<path d="M${x-7} ${y-2}q7-9 14 0" fill="none" stroke="#fffdf6" stroke-width="3"/>`:'');}).join('')}<path d="M17 82h27" stroke="#9cad9b"/><text x="31" y="98" text-anchor="middle" font-size="9" fill="#687b65">back</text></svg>`;
}
