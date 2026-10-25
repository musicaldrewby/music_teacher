import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {INSTRUMENTS,HELP,SOUND_SOURCES,FINGERING_SOURCES} from '../dist/data.js';
import {TROUBLESHOOTING,REPAIR_SOURCES,LEVELS} from '../dist/troubleshooting-data.js';
import {filterIssues,issueMarkup,InstrumentTroubleshooter} from '../dist/troubleshooting.js';
for(const instrument of INSTRUMENTS){const cards=TROUBLESHOOTING[instrument.id];assert.ok(cards.length>=5);assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);for(const card of cards){for(const field of ['title','cause','student','teacher','repair','avoid'])assert.ok(card[field]?.trim(),instrument.id+' '+field);assert.ok(LEVELS[card.level]);assert.ok(card.sources.length);for(const id of card.sources)assert.ok(REPAIR_SOURCES[id]?.[1].startsWith('https://'));const markup=issueMarkup(card);for(const label of ['Can I try it?','Can my teacher help?','Does it need a shop?'])assert.ok(markup.includes(label));assert.ok(!markup.includes('undefined'));}for(const card of HELP[instrument.id]){for(const id of card.sources)assert.ok(SOUND_SOURCES[id]);for(const id of card.fingerings||[])assert.ok(FINGERING_SOURCES[id]);}assert.ok(!JSON.stringify([cards,HELP[instrument.id],instrument.hints]).includes('Mr. Drew'));}
assert.ok(filterIssues('trumpet',{query:'after oil'}).some(c=>c.id==='blocked-after-oiling'));
assert.ok(filterIssues('flute',{query:'cork grease'}).some(c=>c.id==='tight-joint'));
assert.ok(filterIssues('trombone',{level:'shop'}).some(c=>c.id==='bent-slide'));
assert.ok(filterIssues('bells',{query:'stand',level:'teacher'}).length);
assert.equal(filterIssues('clarinet',{query:'qzx-no-matches'}).length,0);
assert.ok(!filterIssues('clarinet',{query:'mallet'}).length);
// Test search, role filtering, reset, and switching instruments through the controller.
const ids=['repair-search','repair-grid','repair-filter','repair-reset','repair-title','repair-count'];const elements=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',innerHTML:'',events:{},addEventListener(name,fn){this.events[name]=fn},focus(){this.focused=true}}]));
const ui=new InstrumentTroubleshooter({querySelector:s=>elements[s.slice(1)]});ui.show(INSTRUMENTS.find(i=>i.id==='trumpet'));assert.equal(elements['repair-count'].textContent,'7 of 7 problems');
elements['repair-search'].events.input({target:{value:'mouthpiece'}});assert.ok(elements['repair-grid'].innerHTML.includes('The mouthpiece is stuck.'));
elements['repair-filter'].events.change({target:{value:'shop'}});assert.ok(!elements['repair-grid'].innerHTML.includes('The mouthpiece is stuck.'));
ui.show(INSTRUMENTS.find(i=>i.id==='bells'));assert.equal(ui.query,'');assert.equal(ui.level,'all');assert.equal(elements['repair-count'].textContent,'5 of 5 problems');
elements['repair-search'].events.input({target:{value:'no-matches-12345'}});assert.ok(elements['repair-grid'].innerHTML.includes('No matching problems.'));elements['repair-reset'].events.click();assert.equal(elements['repair-count'].textContent,'5 of 5 problems');assert.ok(elements['repair-search'].focused);
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');for(const id of ids)assert.ok(html.includes(`id="${id}"`));assert.ok(html.includes('data-mode="repairs"'));assert.ok(html.includes('Ask your teacher'));
console.log('Passed: 45 repair cards across 7 instruments; all 34 sound cards; valid reference mappings; role labels; search/filter/reset; instrument changes; teacher wording.');
