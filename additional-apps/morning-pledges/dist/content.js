// Public-domain pledge and song texts. Sources are linked in the About dialog.
// O Fair New Mexico: Elizabeth Garrett, copyright 1915, original sheet music
// provided by the New Mexico Secretary of State. Line breaks suit projection.
(function(){
const chorus={label:'Chorus',lines:[
'O fair New Mexico,','We love, we love you so,',
'Our hearts with pride o’erflow,','No matter where we go.',
'O fair New Mexico,','We love, we love you so,',
'The grandest state to know,','New Mexico.'
]};
window.PLEDGE_PAGES={
 us:{flag:'us',title:'United States',nav:'U.S. Pledge',eyebrow:'THE STARS & STRIPES',heading:'The Pledge of Allegiance',number:'01',sections:[{lines:['I pledge allegiance to the Flag','of the United States of America,','and to the Republic','for which it stands,','one Nation under God,','indivisible,','with liberty and justice for all.']}]},
 nm:{flag:'nm',title:'New Mexico',nav:'New Mexico Pledge',eyebrow:'THE LAND OF ENCHANTMENT',heading:'Salute to the New Mexico Flag',number:'02',sections:[{lines:['I salute the flag','of the state of New Mexico,','the Zia symbol','of perfect friendship','among united cultures.']}]},
 anthem:{flag:'us',song:true,title:'The Star-Spangled Banner',nav:'National Anthem',eyebrow:'THE NATIONAL ANTHEM',heading:'The Star-Spangled Banner',number:'03',byline:'Lyrics by Francis Scott Key · Verse 1',sections:[
 {label:'Opening',lines:['O say can you see,','by the dawn’s early light,','What so proudly we hailed','at the twilight’s last gleaming,','Whose broad stripes and bright stars','through the perilous fight,','O’er the ramparts we watched','were so gallantly streaming?']},
 {label:'Ending',lines:['And the rocket’s red glare,','the bombs bursting in air,','Gave proof through the night','that our flag was still there;','O say does that star-spangled','banner yet wave','O’er the land of the free','and the home of the brave?']}
 ]},
 'fair-new-mexico':{flag:'nm',song:true,title:'O Fair New Mexico',nav:'O Fair New Mexico',eyebrow:'NEW MEXICO’S STATE SONG',heading:'O Fair New Mexico',number:'04',byline:'Words & music by Elizabeth Garrett',sections:[
 {label:'Verse 1',lines:['Under a sky of azure,','Where balmy breezes blow;','Kissed by the golden sunshine,','Is Nuevo Mejico.','Home of the Montezuma,','With fiery hearts aglow,','State of the deeds historic,','Is Nuevo Mejico.']},
 {...chorus,label:'Chorus · after verse 1'},
 {label:'Verse 2',lines:['Rugged and high sierras,','With deep canyons below;','Dotted with fertile valleys,','Is Nuevo Mejico.','Fields full of sweet alfalfa,','Richest perfumes bestow,','State of the apple blossoms,','Is Nuevo Mejico.']},
 {...chorus,label:'Chorus · after verse 2'},
 {label:'Verse 3',lines:['Days that are full of heart-dreams,','Nights when the moon hangs low;','Beaming its benedictions,','O’er Nuevo Mejico.','Land with its bright mañana,','Coming through weal and woe;','State of our esperanza,','Is Nuevo Mejico.']},
 {...chorus,label:'Chorus · after verse 3'}
 ]}
};
})();
