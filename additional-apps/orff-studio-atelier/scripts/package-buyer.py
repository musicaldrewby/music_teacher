#!/usr/bin/env python3
"""Assemble a buyer ZIP after build-retail.mjs has populated Software."""
from pathlib import Path
import json, shutil, sys, zipfile, hashlib
R=Path(__file__).resolve().parents[1]
base=Path(sys.argv[1]).resolve(); out=Path(sys.argv[2]).resolve()
assert (base/'Software/Open-Mallet-Measure.html').is_file()
for d in ['Examples','Notices','Source/scripts']:(base/d).mkdir(parents=True,exist_ok=True)
for name in ['Mallet-Measure-User-Manual.pdf','START-HERE.pdf']:shutil.copy2(R/'docs/manual'/name,base/name)
for name in ['README.txt','WHATS-NEW.txt']:shutil.copy2(R/'docs/release'/name,base/name)
shutil.copy2(R/'dist/demos/assignment-4.orff',base/'Examples/My-Orf-Assignment.orff')
for name in ['package.json','pnpm-lock.yaml']:shutil.copy2(R/name,base/'Source'/name)
for name in ['build-retail.mjs','retail-bootstrap.js','build-document-tools.mjs','document-tools-entry.js']:shutil.copy2(R/'scripts'/name,base/'Source/scripts'/name)
shutil.copy2(R/'dist/index.html',base/'Source/original-index.html')
(base/'Source/restore-source.mjs').write_text('''import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const software=path.resolve(here,'../Software');
const out=process.argv[2]&&path.resolve(process.argv[2]);
if(!out)throw Error('Usage: node restore-source.mjs NEW-EMPTY-DIRECTORY');
try{if((await fs.readdir(out)).length)throw Error('Output must be empty');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(out,{recursive:true});
await fs.cp(software,path.join(out,'dist'),{recursive:true});
const context={window:{}};
vm.runInNewContext(await fs.readFile(path.join(software,'offline-assets.js'),'utf8'),context);
for(const [key,entry] of Object.entries(context.window.MM_ASSETS)){
 let decoded;
 vm.runInNewContext(await fs.readFile(path.join(software,entry.file),'utf8'),{window:{MM_receive:(name,data)=>{if(name!==key)throw Error('Asset mismatch');decoded=Buffer.from(data,'base64');}}});
 const dest=path.resolve(out,'dist',key);
 if(!dest.startsWith(path.join(out,'dist')+path.sep))throw Error('Invalid asset path');
 await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,decoded);
}
await fs.copyFile(path.join(here,'original-index.html'),path.join(out,'dist/index.html'));
for(const name of ['package.json','pnpm-lock.yaml'])await fs.copyFile(path.join(here,name),path.join(out,name));
await fs.cp(path.join(here,'scripts'),path.join(out,'scripts'),{recursive:true});
console.log('Editable source restored to '+out);
''')
(base/'Source/README.txt').write_text('''SOURCE FILES - no setup is required for normal use

The original readable application modules are retained in Software/*.js.
Software/studio.bundle.js is the bundled local-file runtime. Third-party
libraries and their licenses are in Software/vendor. Audio and artwork are
encoded in Software/packed and indexed by Software/offline-assets.js.

For source work, use Node.js and run this from the Source folder:
  node restore-source.mjs /absolute/path/to/a/new-empty-directory
This reconstructs raw assets and a dist/index.html in that separate directory.
It does not modify your working copy of the software. Open that source dist
through a local development server. To rebuild a downloadable copy, install
the package.json dependencies in the reconstructed directory, then run:
  node scripts/build-retail.mjs /absolute/path/to/another-empty-directory

The included package file and lock file record the application dependencies.
The document-tools scripts rebuild the bundled PDF/ZIP dependencies if needed.
Do not edit internal Software files to compose music; use the app and .orff
project files instead. Third-party licenses remain with the respective files.
''')
licenses=[]
for p in sorted((base/'Software').rglob('*')):
 if p.is_file() and any(s in p.name.upper() for s in ['LICENSE','CREDITS','CC0','NOTICE']):licenses.append(str(p.relative_to(base)))
font_license=Path('/usr/share/doc/fonts-dejavu-core/copyright')
if font_license.is_file():shutil.copy2(font_license,base/'Notices/DejaVu-Font-Copyright.txt')
(base/'Notices/THIRD-PARTY-NOTICES.txt').write_text('''MALLET & MEASURE - THIRD-PARTY NOTICE INDEX

The existing audio credits, sample provenance, font licenses, and library
licenses are retained in Software. They apply to their respective components.
See each notice for its original terms and source information. This index
does not replace or alter those terms.

'''+ '\n'.join(licenses)+'\n\nDejaVu fonts embedded in the user guides: see DejaVu-Font-Copyright.txt.\n')
# Exclude workstation files by assembling only a clean retail build and the
# explicit documents above; no repository metadata or user project is copied.
files=sorted(p for p in base.rglob('*') if p.is_file() and not any(x.startswith('.') for x in p.relative_to(base).parts))
for p in files:
 assert not any(x.startswith('.') for x in p.relative_to(base).parts),p
 assert p.suffix not in ['.log'],p
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,p.relative_to(base.parent))
with zipfile.ZipFile(out) as z:assert z.testzip() is None
print(json.dumps({'zip':str(out),'files':len(files),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'licenseFiles':len(licenses)}))
