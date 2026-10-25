'use strict';
// Level order, artwork, wall height, and optional gentle lighting.
// Load after image asset scripts and before game.js. See ADDING_LOCATIONS.txt.
window.SneakyCatLevels=[{"id": "albuquerque", "name": "Albuquerque", "description": "The Sandias, Old Town adobe, gently flickering farolitos, and distant balloon glows.", "src": window.SneakyCatAssets["albuquerque"]}, {"id": "new-orleans", "name": "New Orleans", "description": "French Quarter lanterns, wrought-iron balconies, and warm jazz-night light.", "src": window.SneakyCatAssets["new-orleans"]}, {"id": "san-francisco", "name": "San Francisco", "description": "Moonlit Victorian houses, drifting bay fog, and the Golden Gate Bridge.", "src": window.SneakyCatAssets["san-francisco"]}, {"id": "paris", "name": "Paris", "description": "Golden Eiffel Tower sparkles above slate rooftops and the Seine.", "src": window.SneakyCatAssets["paris"]}, {"id": "tokyo", "name": "Tokyo", "description": "Warm lanterns, softly glowing neon, and a few drifting petals.", "src": window.SneakyCatAssets["tokyo"]}, {"id": "state-fair", "name": "State Fair", "description": "A luminous Ferris wheel, warm carousel lights, and a magical nighttime midway.", "src": window.SneakyCatAssets["state-fair"]}, {"id": "midnight-jazz-club", "name": "Midnight Jazz Club", "description": "An intimate rooftop club with a glowing saxophone sign, golden marquee lights, and a velvet-curtained stage.", "rail": 0.646, "src": window.SneakyCatAssets["midnight-jazz-club"]}, {"id": "rainy-london", "name": "Rainy London", "description": "Big Ben, cozy bookshop windows, and falling rain with tiny splashes on the wet ledge.", "src": window.SneakyCatAssets["rainy-london"]}, {"id": "arcade", "name": "The Arcade", "description": "A neighborhood arcade at sunset: weathered brick, faded street art, a vintage bulb-lit sign, and warm city light.", "rail": 0.689, "src": window.SneakyCatAssets["arcade"]}, {"id": "skatepark", "name": "The Skatepark", "description": "A gritty warehouse skate spot with worn vert ramps, concrete bowls, street art, and a steel viaduct overhead.", "rail": 0.663, "src": window.SneakyCatAssets["skatepark"]}, {"id": "music-classroom", "name": "Music Classroom", "description": "An inviting Orff classroom with wooden xylophones, silver-bar metallophones, tubanos, ukuleles, Boomwhackers, and a basket of dance scarves.", "rail": 0.689, "src": window.SneakyCatAssets["music-classroom"]},{"id":"las-vegas","name":"Las Vegas","description":"The moonlit Strip, golden hotel lights, a glowing observation wheel, and shimmering fountain reflections.","rail":0.684,"src":window.SneakyCatAssets["las-vegas"]},{"id":"grand-canyon","name":"Grand Canyon","description":"Sunset over sandstone temples, a golden Colorado River, and a quiet stone overlook.","rail":0.667,"src":window.SneakyCatAssets["grand-canyon"]},{"id":"ukraine","name":"Ukraine","description":"Moonlit Kyiv: the Golden Gate, Mother Ukraine statue, golden domes, and warm Dnipro reflections.","rail":0.685,"src":window.SneakyCatAssets["ukraine"]},{"id":"chicago","name":"Chicago","description":"Sunset on the Chicago River, Marina City, the Willis Tower, Wrigley Building, and steel bridges.","rail":0.687,"src":window.SneakyCatAssets["chicago"]},{"id":"memphis","name":"Memphis, Tennessee","description":"Sunset over the glass Memphis Pyramid, Mississippi River bridge, and Beale Street-inspired blues clubs.","rail":0.679,"src":window.SneakyCatAssets["memphis"]},{"id":"fortnite","name":"Fortnite Island","description":"A sunset island with a Battle Bus, clock tower, wooden builds, and a broad brick wall.","rail":0.658,"src":window.SneakyCatAssets["fortnite"]},{"id":"roblox","name":"Brookhaven RP","description":"A Brookhaven RP-inspired sunset neighborhood with shops, a police station, hospital, playground, and hillside homes.","rail":0.669,"src":window.SneakyCatAssets["brookhaven"]},{"id":"minecraft","name":"Minecraft Valley","description":"A sunset voxel valley with a block village, waterfall, square sun, and a stone-brick wall.","rail":0.658,"src":window.SneakyCatAssets["minecraft"]},
{
  "id": "new-york",
  "name": "New York",
  "description": "Sunset over the Brooklyn Bridge, Manhattan skyline, brownstones, and East River.",
  "rail": 0.654,
  "lights": [
    [
      290,
      329,
      22
    ],
    [
      342,
      453,
      13
    ],
    [
      454,
      452,
      12
    ],
    [
      1426,
      497,
      10
    ]
  ],
  "reflections": {
    "x": 605,
    "y": 528,
    "width": 1000,
    "rows": 6
  },
  "ariaLabel": "Sneaky Cat walks along a sunset overlook in New York.",
  "src": window.SneakyCatAssets["new-york"]
},
{
  "id": "washington-dc",
  "name": "Washington DC",
  "description": "The Capitol, Washington Monument, Lincoln Memorial, and cherry blossoms at sunset.",
  "rail": 0.654,
  "lights": [
    [
      44,
      448,
      20
    ],
    [
      917,
      474,
      9
    ],
    [
      1049,
      470,
      13
    ],
    [
      1153,
      468,
      12
    ],
    [
      1330,
      461,
      16
    ],
    [
      1557,
      461,
      15
    ]
  ],
  "reflections": {
    "x": 380,
    "y": 518,
    "width": 860,
    "rows": 7
  },
  "ariaLabel": "Sneaky Cat walks along a sunset overlook in Washington DC.",
  "src": window.SneakyCatAssets["washington-dc"]
},
{
  "id": "phoenix",
  "name": "Phoenix, Arizona",
  "description": "Sonoran Desert saguaros, palms, mountain silhouettes, and the Phoenix skyline at sunset.",
  "rail": 0.629,
  "lights": [
    [
      259,
      342,
      15
    ],
    [
      358,
      426,
      12
    ],
    [
      882,
      544,
      10
    ],
    [
      1010,
      527,
      10
    ],
    [
      1360,
      548,
      10
    ]
  ],
  "ariaLabel": "Sneaky Cat walks along a sunset overlook in Phoenix, Arizona.",
  "src": window.SneakyCatAssets["phoenix"]
},
{
  "id": "super-mario",
  "name": "Super Mario Bros.",
  "description": "A Mushroom Kingdom-inspired sunset with green pipes, question blocks, golden coins, and a castle.",
  "rail": 0.657,
  "lights": [
    [
      273,
      55,
      16
    ],
    [
      338,
      87,
      16
    ],
    [
      394,
      119,
      15
    ],
    [
      443,
      159,
      15
    ],
    [
      1332,
      346,
      13
    ],
    [
      1370,
      302,
      13
    ],
    [
      1409,
      273,
      13
    ],
    [
      1451,
      253,
      13
    ]
  ],
  "ariaLabel": "Sneaky Cat walks along a brick wall in a Super Mario Bros.-inspired kingdom at sunset.",
  "src": window.SneakyCatAssets["super-mario"]
},
{
  "id": "death-star",
  "name": "Death Star",
  "description": "A Star Wars hangar with TIE fighters, Imperial lights, and a view into space.",
  "rail": 0.619,
  "depthEdge": 0.605,
  "lights": [
    [
      130,
      122,
      10
    ],
    [
      295,
      204,
      10
    ],
    [
      585,
      271,
      9
    ],
    [
      1559,
      205,
      9
    ],
    [
      1628,
      436,
      13
    ]
  ],
  "ariaLabel": "Sneaky Cat walks along a ledge in Death Star.",
  "src": window.SneakyCatAssets["death-star"],
  "lightColor": "pink"
},
{
  "id": "pokemon",
  "name": "Pokémon",
  "description": "A Pallet Town-inspired sunset village with Pikachu, Eevee, a Pokémon Center, and a sleeping Snorlax.",
  "rail": 0.62,
  "depthEdge": 0.61,
  "lights": [
    [
      594,
      326,
      24
    ],
    [
      595,
      383,
      17
    ],
    [
      318,
      329,
      13
    ],
    [
      1540,
      354,
      12
    ]
  ],
  "ariaLabel": "Sneaky Cat walks along a ledge in Pokémon.",
  "src": window.SneakyCatAssets["pokemon"]
},
{
  "id": "denver",
  "name": "Denver, Colorado",
  "description": "The golden State Capitol, Union Station, downtown skyline, and snowy Rocky Mountains at sunset.",
  "rail": 0.63,
  "depthEdge": 0.618,
  "lights": [
    [
      230,
      71,
      18
    ],
    [
      317,
      481,
      12
    ],
    [
      396,
      477,
      12
    ],
    [
      834,
      562,
      13
    ],
    [
      922,
      551,
      12
    ],
    [
      1357,
      414,
      15
    ]
  ],
  "ariaLabel": "Sneaky Cat walks along a ledge in Denver, Colorado.",
  "src": window.SneakyCatAssets["denver"]
},
{
  "id": "yellowstone",
  "name": "Yellowstone National Park",
  "description": "Old Faithful, a timber lodge, grazing bison, and warm evening light.",
  "rail": 0.653,
  "depthEdge": 0.637,
  "lights": [
    [
      1420,
      390,
      12
    ],
    [
      1460,
      342,
      12
    ],
    [
      1542,
      328,
      12
    ]
  ],
  "ariaLabel": "Sneaky Cat walks along a ledge in Yellowstone National Park.",
  "src": window.SneakyCatAssets["yellowstone"]
},
{
  "id": "rainforest",
  "name": "Rain Forest",
  "description": "A lush tropical canopy, waterfall mist, orchids, and a turquoise river at dusk.",
  "rail": 0.684,
  "depthEdge": 0.672,
  "lights": [],
  "ariaLabel": "Sneaky Cat walks along a ledge in Rain Forest.",
  "src": window.SneakyCatAssets["rainforest"]
}];
