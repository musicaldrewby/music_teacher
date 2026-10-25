import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {Num,Vector} from '../components/studio-fields';
import {sliderPosition,sliderNumber} from '../lib/numeric-slider';

test('Bounded numeric controls have a labeled slider plus precise number entry',()=>{
 const html=renderToStaticMarkup(<Num label="Opacity" value={.5} min={0} max={1} step={.05} onChange={()=>{}}/>);assert.match(html,/type="range"/);assert.match(html,/type="number"/);assert.ok(html.includes('Opacity slider'));
 const light=renderToStaticMarkup(<Num slider log label="Light power" value={100} min={0} max={20000} step={10} onChange={()=>{}}/>);assert.ok(light.includes('Light power slider'));assert.ok(light.includes('aria-valuetext="100"'));
});
test('Unbounded scene coordinates retain their full precise entry range',()=>{
 const html=renderToStaticMarkup(<Vector label="Position" value={[500,-200,1500]} onChange={()=>{}}/>);assert.doesNotMatch(html,/type="range"/);assert.ok(html.includes('value="1500"'));
});
test('Log light sliders preserve zero, maxima and useful precision at low powers',()=>{
 for(const value of [0,1,10,100,500,20000]){const p=sliderPosition(value,0,20000,true),result=sliderNumber(p,0,20000,1,true);assert.equal(result,value);}
 assert.equal(sliderNumber(0,0,20000,10,true),0);assert.equal(sliderNumber(1,0,20000,10,true),20000);assert.ok(sliderPosition(100,0,20000,true)>.4);
 assert.equal(sliderNumber(.5,0,1,.05),.5);assert.equal(sliderNumber(-1,0,1,.05),0);assert.equal(sliderNumber(2,0,1,.05),1);
});
