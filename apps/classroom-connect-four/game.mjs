export const MODES={classic:{names:['Red','Yellow'],marks:['R','Y'],cols:7,rows:6,label:'CLASSIC · 2 PLAYERS'},custom:{names:['Group 1','Group 2'],marks:['1','2'],cols:7,rows:6,label:'CUSTOM GROUPS · 2 TEAMS'}};
export const SIZES={auto:null,large:[9,7],extra:[10,8],giant:[12,9]};
export function winningCells(board,row,col){const who=board[row][col];if(who===null)return [];for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){const cells=[[row,col]];for(const sign of [-1,1]){let r=row+dr*sign,c=col+dc*sign;while(r>=0&&r<board.length&&c>=0&&c<board[0].length&&board[r][c]===who){cells.push([r,c]);r+=dr*sign;c+=dc*sign;}}if(cells.length>=4)return cells;}return [];}
export class Game{
 constructor(mode='classic'){this.size='auto';this.teacherMode=false;this.customNames=['Group 1','Group 2'];this.setMode(mode)}
 setMode(mode,names=this.customNames){if(!Object.hasOwn(MODES,mode))throw Error('Unknown mode');if(mode==='custom'){if(!Array.isArray(names)||names.length<2||names.length>12||names.some(n=>typeof n!=='string'))throw Error('Choose 2–12 group names');this.customNames=names.map((n,i)=>n.trim().slice(0,40)||`Group ${i+1}`);}this.mode=mode;this.config={...MODES[mode]};if(mode==='custom'){this.config.names=[...this.customNames];this.config.marks=this.customNames.map((_,i)=>String(i+1));this.config.label=`CUSTOM GROUPS · ${this.customNames.length} TEAMS`;}[this.config.cols,this.config.rows]=this.dimensions();this.scores=this.config.names.map(()=>0);this.starter=0;this.round=0;this.reset(false)}
 dimensions(){if(SIZES[this.size])return SIZES[this.size];if(this.mode==='custom'){const n=this.config.names.length;return n<=2?[7,6]:n<=4?[9,7]:n<=6?[10,8]:[12,9];}return [MODES[this.mode].cols,MODES[this.mode].rows];}
 setSize(size){if(!Object.hasOwn(SIZES,size))throw Error('Unknown board size');this.size=size;[this.config.cols,this.config.rows]=this.dimensions();this.reset(false)}
 setTeacherMode(enabled){this.teacherMode=!!enabled;this.awaitingAward=this.teacherMode;}
 get ended(){return this.winner!==null||this.draw;}
 reset(rotate=true){if(rotate)this.starter=(this.starter+1)%this.scores.length;this.round++;this.board=Array.from({length:this.config.rows},()=>Array(this.config.cols).fill(null));this.turn=this.starter;this.history=[];this.winner=null;this.win=[];this.draw=false;this.awaitingAward=this.teacherMode;}
 awardTurn(team){if(!this.teacherMode||this.ended)throw Error('A turn cannot be awarded now');if(!Number.isInteger(team)||team<0||team>=this.scores.length)throw Error('Invalid team');this.turn=team;this.awaitingAward=false;}
 passTurn(){if(this.ended)throw Error('The round has ended');if(this.teacherMode)this.awaitingAward=true;else this.turn=(this.turn+1)%this.scores.length;}
 drop(col){if(!Number.isInteger(col)||col<0||col>=this.config.cols)throw Error('Choose a valid column');if(this.ended)throw Error('The round has ended');if(this.awaitingAward)throw Error('Teacher: award a team the turn first');let row=this.config.rows-1;while(row>=0&&this.board[row][col]!==null)row--;if(row<0)throw Error('That column is full');const who=this.turn;this.board[row][col]=who;this.history.push({row,col,who});this.win=winningCells(this.board,row,col);if(this.win.length){this.winner=who;this.scores[who]++;}else if(this.history.length===this.config.rows*this.config.cols)this.draw=true;else if(this.teacherMode)this.awaitingAward=true;else this.turn=(who+1)%this.scores.length;return {row,col,who};}
 undo(){const move=this.history.pop();if(!move)return false;if(this.winner!==null)this.scores[this.winner]--;this.board[move.row][move.col]=null;this.turn=move.who;this.winner=null;this.win=[];this.draw=false;this.awaitingAward=false;return true;}
 snapshot(){return {mode:this.mode,teams:this.config.names.map((name,i)=>({number:i+1,name,mark:this.config.marks[i]})),size:this.size,teacherMode:this.teacherMode,awaitingAward:this.awaitingAward,board:this.board.map(r=>[...r]),turn:this.awaitingAward?null:this.config.names[this.turn],winner:this.winner===null?null:this.config.names[this.winner],draw:this.draw,scores:[...this.scores],moves:this.history.length};}
}
export class TurnClock{
 constructor(){this.reset(0)}
 reset(seconds){this.remaining=seconds*1000;this.running=false;this.last=null;}
 sync(run,now){if(this.running&&this.last!==null)this.remaining=Math.max(0,this.remaining-Math.max(0,now-this.last));this.last=now;this.running=run&&this.remaining>0;return this.remaining;}
 extend(seconds){this.remaining+=seconds*1000;}
}
