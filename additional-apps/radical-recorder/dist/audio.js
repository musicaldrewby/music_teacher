// A gentle recorder-like voice: mostly fundamental, a little harmonic body,
// and filtered breath. Audio-clock envelopes keep articulation and pitch clear.
export class AudioEngine {
    constructor(onError = () => {}) {
        this.context=null;this.voices=new Set();this.onError=onError;
        this.wave=null;this.breath=null;
    }
    async ready() {
        try {
            if (!this.context) {
                const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
                if(!Context)throw new Error('Audio is unavailable in this browser.');
                this.context=new Context();
                this.wave=this.context.createPeriodicWave(new Float32Array(8),new Float32Array([0,1,.15,.07,.025,.015,.008,.004]));
                this.breath=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*2.3),this.context.sampleRate);
                const data=this.breath.getChannelData(0);let seed=173;
                for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=(seed>>>0)/2147483648-1;}
            }
            if(this.context.state!=='running')await this.context.resume();
            if(this.context.state!=='running')throw new Error('Tap a play button to enable sound.');
            return true;
        }catch(e){this.onError(e.message);return false;}
    }
    get now(){return this.context?.currentTime||0;}
    track(osc,gain,sources,nodes,points) {
        const voice={osc,gain,sources,nodes,points,stopped:false};this.voices.add(voice);
        let remaining=sources.length;
        for(const source of sources)source.onended=()=>{
            if(--remaining===0){for(const node of nodes)node.disconnect();this.voices.delete(voice);}
        };
        return voice;
    }
    envelope(gain,points) {
        points.forEach(([time,value],i)=>i?gain.gain.linearRampToValueAtTime(value,time):gain.gain.setValueAtTime(value,time));
    }
    play(frequency,start=this.now,duration=null) {
        if(!Number.isFinite(frequency)||frequency<=0||!this.context)return;
        if(duration!==null&&(!Number.isFinite(duration)||duration<=0))return;
        const ctx=this.context;start=Math.max(start,ctx.currentTime);
        const osc=ctx.createOscillator(),gain=ctx.createGain(),air=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),airGain=ctx.createGain();
        osc.setPeriodicWave(this.wave);osc.frequency.setValueAtTime(frequency,start);
        air.buffer=this.breath;air.loop=true;
        filter.type='bandpass';filter.frequency.setValueAtTime(Math.min(6500,frequency*2.5),start);filter.Q.setValueAtTime(.65,start);
        airGain.gain.setValueAtTime(.11,start);airGain.gain.linearRampToValueAtTime(.038,start+(duration===null?.09:Math.min(.09,duration*.5)));
        osc.connect(gain);air.connect(filter);filter.connect(airGain);airGain.connect(gain);gain.connect(ctx.destination);
        const peak=.17*Math.min(1.15,Math.pow(880/frequency,.18));
        const attack=duration===null?.028:Math.min(.028,duration*.22),settle=duration===null?.075:Math.min(.075,duration*.45);
        const points=[[start,0],[start+attack,peak],[start+settle,peak*.84]];
        if(duration!==null){const end=start+duration,release=Math.min(.05,duration*.25);points.push([Math.max(start+settle,end-release),peak*.84],[end,0]);}
        this.envelope(gain,points);
        const voice=this.track(osc,gain,[osc,air],[osc,air,filter,airGain,gain],points);
        osc.start(start);air.start(start,(start*.73)%1.3);
        if(duration!==null)for(const source of voice.sources)source.stop(start+duration+.006);
        return voice;
    }
    click(accent=false,start=this.now) {
        if(!this.context)return;
        const ctx=this.context;start=Math.max(start,ctx.currentTime);
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(accent?1320:990,start);
        const points=[[start,0],[start+.002,accent?.12:.09],[start+.043,0]];
        this.envelope(gain,points);osc.connect(gain);gain.connect(ctx.destination);
        const voice=this.track(osc,gain,[osc],[osc,gain],points);osc.start(start);osc.stop(start+.048);return voice;
    }
    levelAt(voice,time) {
        const points=voice.points;if(time<=points[0][0])return 0;
        for(let i=1;i<points.length;i++){const [end,to]=points[i],[start,from]=points[i-1];if(time<=end)return from+(to-from)*(time-start)/(end-start||1);}
        return points.at(-1)[1];
    }
    stop() {
        if(!this.context)return;
        const now=this.now;
        for(const voice of this.voices){
            if(voice.stopped)continue;voice.stopped=true;
            const param=voice.gain.gain;
            if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
            else{param.cancelScheduledValues(now);param.setValueAtTime(this.levelAt(voice,now),now);}
            param.linearRampToValueAtTime(0,now+.025);
            for(const source of voice.sources)try{source.stop(now+.03);}catch{}
        }
    }
}
