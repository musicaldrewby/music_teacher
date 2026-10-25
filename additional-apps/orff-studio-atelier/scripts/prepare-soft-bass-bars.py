#!/usr/bin/env python3
"""Rebuild the two bass-bar roots from pinned CC0 soft acoustic strikes.

Requires numpy/scipy; original recordings stay in the caller's temporary directory.
The app uses the same root mapping, with measured tuning. No upper-frequency EQ.
"""
import argparse, hashlib, json, math, urllib.request
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, periodogram

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'dist/assets/audio/recorded/ensemble-additions'
COMMIT='c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e'
SPECS=[('F1','f2',41,.15660378247939713,'eadaeb8bd491b3161197478119be60771e0e1d8620d4848e39595976f9c9c998'),('C2','c3',48,.14597827981847075,'5fd3c75ab7eafebc24a693793e2c4404922dfad37d8dd9bf80e8ca483500ed80')]

def read(path):
 sr,x=wavfile.read(path)
 if np.issubdtype(x.dtype,np.integer): x=x.astype(np.float64)/max(abs(np.iinfo(x.dtype).min),np.iinfo(x.dtype).max)
 else: x=x.astype(np.float64)
 if x.ndim==1:x=np.column_stack((x,x))
 return sr,x

def fundamental(x,sr,expected):
 # Restrict the estimate to the physical fundamental, not a louder bar partial.
 segment=x[int(.08*sr):int(.85*sr)].mean(axis=1)
 frequencies,power=periodogram(segment,sr,window='hann',nfft=2**20)
 eligible=np.flatnonzero((frequencies>expected*.94)&(frequencies<expected*1.06))
 index=eligible[np.argmax(power[eligible])]
 l,c,r=np.log(np.maximum(power[index-1:index+2],1e-30))
 delta=.5*(l-r)/(l-2*c+r)
 return (index+delta)*sr/2**20

def upper_ratio(x,sr):
 frequencies,power=periodogram(x[:sr//2].mean(axis=1),sr,window='hann')
 return float(10*np.log10(power[frequencies>220].sum()/power[(frequencies>=40)&(frequencies<=180)].sum()))

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);args=parser.parse_args();args.source_dir.mkdir(parents=True,exist_ok=True)
 manifestPath=ROOT/'dist/assets/audio/manifest.json';provenancePath=DEST/'PROVENANCE.json'
 manifest=json.loads(manifestPath.read_text());provenance=json.loads(provenancePath.read_text());sampleSet=manifest['instrumentSamples']['bass-bars'];assets=[];report=[]
 rng=np.random.default_rng(20261017)
 for sourceName,rootName,midi,targetRms,expectedHash in SPECS:
  sourceFile=f'Marimba_hit_Outrigger_{sourceName}_soft_01.wav'
  sourceUrl=f'https://raw.githubusercontent.com/sgossner/VCSL/{COMMIT}/Idiophones/Struck%20Idiophones/Marimba/{sourceFile}'
  original=args.source_dir/sourceFile
  # Always verify the pinned source against the researched checksum.
  with urllib.request.urlopen(sourceUrl,timeout=60) as response: sourceBytes=response.read()
  assert hashlib.sha256(sourceBytes).hexdigest()==expectedHash,'Unexpected upstream sample bytes'
  original.write_bytes(sourceBytes);sr,x=read(original);assert sr==44100 and x.shape[1]==2
  originalDuration=len(x)/sr
  x=sosfilt(butter(2,25,fs=sr,btype='highpass',output='sos'),x,axis=0)
  fadeIn=round(.0005*sr);fadeOut=round(.04*sr)
  x[:fadeIn]*=np.linspace(0,1,fadeIn)[:,None];x[-fadeOut:]*=np.linspace(1,0,fadeOut)[:,None]
  amplitudeGain=targetRms/np.sqrt(np.mean(x[:sr//2]**2));x*=amplitudeGain
  assert np.max(np.abs(x))<.7
  hz=fundamental(x,sr,440*2**((midi-69)/12));rootMidi=69+12*math.log2(hz/440)
  filename=f'bass-bars-soft-{rootName}.wav';out=DEST/filename
  dither=(rng.random(x.shape)-rng.random(x.shape))/32768
  pcm=np.clip(np.round((x+dither)*32768),-32768,32767).astype(np.int16)
  wavfile.write(out,sr,pcm);actual=pcm.astype(float)/32768
  old=DEST/f'bass-bars-root-{rootName}.wav'
  oldRatio=upper_ratio(read(old)[1],sr) if old.exists() else None
  ratio=upper_ratio(actual,sr)
  asset={'file':filename,'url':'assets/audio/recorded/ensemble-additions/'+filename,'sourceFile':sourceFile,'sourceUrl':sourceUrl,'sourceSha256':expectedHash,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sourceDuration':originalDuration,'duration':len(x)/sr,'sampleRate':sr,'channels':2,'format':'PCM signed 16-bit WAV','bytes':out.stat().st_size,'peak':float(np.max(np.abs(actual))),'rms':float(np.sqrt(np.mean(actual**2))),'clippedSamples':int(np.count_nonzero(np.abs(pcm.astype(np.int32))>=32767)),'processing':{'excerptSeconds':None,'trimStartSeconds':0,'trimEndSeconds':originalDuration,'highpassHz':25,'highpassOrder':2,'amplitudeGain':amplitudeGain,'fadeInSeconds':fadeIn/sr,'endFadeSeconds':fadeOut/sr,'dither':'TPDF at one 16-bit LSB','naturalDecayPreserved':True,'levelMatching':'First 500 ms stereo RMS matched to the previous medium-strike root','upperFrequencyEQ':False},'measuredFundamentalHz':hz,'measuredRootMidi':rootMidi,'first500msUpperToLowDb':ratio}
  assets.append(asset)
  for note,descriptor in sampleSet['notes'].items():
   if descriptor['sourceRootMidi']!=midi:continue
   descriptor.update(url=asset['url'],tuningSemitones=round(int(note)-rootMidi,6),duration=asset['duration'])
  report.append({'root':rootName,'fundamentalHz':hz,'tuningCents':(rootMidi-midi)*100,'peak':asset['peak'],'first500msRms':float(np.sqrt(np.mean(actual[:sr//2]**2))),'oldUpperToLowDb':oldRatio,'newUpperToLowDb':ratio,'changeDb':None if oldRatio is None else ratio-oldRatio})
 sampleSet['sourceInstrument']='Acoustic marimba, softly played mallet strikes'
 sampleSet['articulation']='Separate soft-strike recordings; natural attack and decay; no upper-frequency EQ'
 sampleSet['sourceCommit']=COMMIT
 provenance['updated']='2026-10-17';provenance['instrumentSamples']['bass-bars']=sampleSet
 provenance['assets']=[a for a in provenance['assets'] if not a['file'].startswith('bass-bars-')]+assets
 provenance['qualityNotes']=[line for line in provenance['qualityNotes'] if not line.startswith('Bass bars now use')]
 provenance['qualityNotes'].append('Bass bars now use separate soft acoustic strikes, level-matched to the previous medium layer. Their upper partials are quieter in the recording itself; no treble EQ or synthetic layers were added.')
 manifestPath.write_text(json.dumps(manifest,indent=2)+'\n');provenancePath.write_text(json.dumps(provenance,indent=2)+'\n')
 print(json.dumps(report,indent=2))

if __name__=='__main__':main()
