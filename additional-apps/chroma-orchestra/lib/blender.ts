import {exportContraptions} from './contraption-geometry';
import {zipSync,strToU8} from 'fflate';
import {type Project} from './project';
import {exportScenery} from './scenery-geometry';
import {exportCameraPlan} from './camera-sequence';import {wavBytes,type PCM} from './audio';
const launcher=String.raw`@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "MODE=%~1"
if not defined MODE set "MODE=build"
if defined BLENDER_EXE if exist "%BLENDER_EXE%" goto found
set "BLENDER_EXE="
for /f "delims=" %%B in ('where blender.exe 2^>nul') do if not defined BLENDER_EXE set "BLENDER_EXE=%%B"
if defined BLENDER_EXE goto found
for /f "delims=" %%D in ('dir /b /ad /o-n "%ProgramFiles%\Blender Foundation\Blender*" 2^>nul') do if not defined BLENDER_EXE if exist "%ProgramFiles%\Blender Foundation\%%D\blender.exe" set "BLENDER_EXE=%ProgramFiles%\Blender Foundation\%%D\blender.exe"
if defined BLENDER_EXE goto found
echo Blender was not found. Paste the full path to blender.exe.
set /p "BLENDER_EXE=Blender path: "
if not defined BLENDER_EXE exit /b 1
set "BLENDER_EXE=%BLENDER_EXE:"=%"
if not exist "%BLENDER_EXE%" exit /b 1
:found
echo CHROMA ORCHESTRA - %MODE%
"%BLENDER_EXE%" --background --factory-startup --python-exit-code 1 --python "%CD%\orchestra.py" -- %MODE%
if errorlevel 1 goto failed
if "%MODE%"=="build" start "" "%BLENDER_EXE%" "%CD%\output\Chroma-Orchestra.blend"
if "%MODE%"=="test" start "" "%CD%\output\Chroma-Test.png"
if "%MODE%"=="video" start "" "%CD%\output"
if "%MODE%"=="assemble" start "" "%CD%\output"
pause
exit /b 0
:failed
echo Blender reported an error. Read the message above. Completed frames are preserved.
pause
exit /b 1
`;
export async function exportBlender(p:Project,pcm:PCM){const [r,seasonal,machines]=await Promise.all([fetch('/blender/orchestra.py'),fetch('/blender/seasonal_scene.py'),fetch('/blender/contraptions.py')]);if(!r.ok||!seasonal.ok||!machines.ok)throw Error('Could not load the Blender exporter. Please retry.');const script=await r.text(),cmd=(mode:string)=>strToU8('@echo off\r\ncall "%~dp0run.cmd" '+mode+'\r\n');const files={'contraptions.json':strToU8(JSON.stringify(exportContraptions(p))),'contraptions.py':strToU8(await machines.text()),'scenery.json':strToU8(JSON.stringify(exportScenery(p))),'camera-plan.json':strToU8(JSON.stringify(exportCameraPlan(p))),'seasonal_scene.py':strToU8(await seasonal.text()),'performance.json':strToU8(JSON.stringify(p,null,2)),'soundtrack.wav':wavBytes(pcm),'orchestra.py':strToU8(script),'run.cmd':strToU8(launcher.replace(/\r?\n/g,'\r\n')),'01-Render-Test.cmd':cmd('test'),'02-Render-Video.cmd':cmd('video'),'03-Build-and-Open-Scene.cmd':cmd('build'),'04-Assemble-Saved-Frames.cmd':cmd('assemble'),'START-HERE.txt':strToU8(`CHROMA ORCHESTRA — ${p.name}\n\nExtract this whole ZIP into a folder first. Blender 4.5 or later is required.\n\n1. Run 01-Render-Test.cmd to check the camera and lighting.\n2. Run 02-Render-Video.cmd for 1920 x 1080 at 60 FPS, with the exact studio soundtrack.\n3. Run 03-Build-and-Open-Scene.cmd to create and open an editable Blender scene.\n\nAll results are in the output folder next to these files.\nFinished movie: output/Chroma-Orchestra.mp4 (numbered if it already exists).\nEditable scene: output/Chroma-Orchestra.blend.\nTest image: output/Chroma-Test.png.\n\nThe launcher selects OptiX when Blender exposes a compatible GPU, then CUDA, then CPU.\nFull video can take a long time. Completed PNGs are retained; rerun the video launcher to resume.\n04-Assemble-Saved-Frames.cmd joins a completed render and soundtrack without rerendering.\n\nRebuilding replaces the generated .blend. Save hand-edited scenes under another name first.\nTo render manual Blender edits, use Blender's render controls and set your desired output.\nThe soundtrack is packed into the scene and is also included as a WAV.\n\nMac/Linux: blender --background --python orchestra.py -- test\nUse video, build, or assemble instead of test for the other actions.\n\nSeasonal scenery and 3D snowfall are included as editable geometry.\nMarimba Waterfall and Midnight Pipeworks include editable playing lanes, supply tracks, moving bucket lifts, and procedural material nodes.\nOrgan valves follow written note durations; the soundtrack retains its soundfont articulation and controller behavior.\nThe Finished film scene contains the camera edit: cuts, glides, dissolves, and one soundtrack.\nSwitch to Chroma Orchestra to edit the instruments, scenery, snow, or individual cameras.\nRender Finished film to keep the complete camera sequence. Dissolves render both views during the overlap.\nCamera times are seconds from the beginning of the film, including the 1.6-second lead-in.\n\nThe browser and Blender use the same note timing and motion paths. Lighting appearance may differ.\nThe native scene uses choreographed animation, not free-running rigid-body simulation.\n`)};return new Blob([zipSync(files,{level:3}) as Uint8Array<ArrayBuffer>],{type:'application/zip'});}
