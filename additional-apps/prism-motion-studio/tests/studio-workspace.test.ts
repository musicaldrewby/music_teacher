import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {blankScene,sceneSchema} from '../lib/scene';
import {InspectorCategory,Section} from '../components/studio-fields';

test('blank stage is valid, stationary, empty and independent',()=>{
 const scene=sceneSchema.parse(blankScene());
 assert.equal(scene.floor,true);assert.equal(scene.ground.height,0);
 assert.equal(scene.ground.finish,'matte');assert.equal(scene.fps,60);
 assert.equal(scene.particles,'none');assert.equal(scene.backgroundImage,'');
 for(const items of [scene.objects,scene.effects,scene.paths,scene.worldEvents,scene.camera.keys,scene.camera.shots])assert.equal(items.length,0);
 assert.equal(scene.camera.motion,'still');assert.equal(scene.camera.proceduralMotion.enabled,false);
 assert.equal(scene.camera.walk.enabled,false);assert.equal(scene.camera.ride.enabled,false);
 scene.camera.position[0]=999;assert.notEqual(blankScene().camera.position[0],999);
});

test('object groups expose controls in their intended tab and all outside object inspector',()=>{
 const render=(category:string)=>renderToStaticMarkup(h(InspectorCategory.Provider,{value:category},
 h(Section,{title:'Transform',children:'position control'}),h(Section,{title:'Procedural material',children:'texture control'}),h(Section,{title:'Interactive action',children:'interaction control'})));
 assert.match(render('shape'),/position control/);assert.doesNotMatch(render('shape'),/texture control|interaction control/);
 assert.match(render('look'),/texture control/);assert.match(render('advanced'),/interaction control/);
 assert.match(render('all'),/position control/);assert.match(render('all'),/texture control/);
});
