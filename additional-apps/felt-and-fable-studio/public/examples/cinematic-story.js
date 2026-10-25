window.FELT_CINEMA_EXAMPLE={
  "format": "felt-and-fable",
  "version": 1,
  "title": "The Midnight Knock · cinematic example",
  "active": 0,
  "scenes": [
    {
      "id": "demo-outside",
      "name": "A knock at the manor",
      "bg": 65,
      "bgColor": "#567166",
      "duration": 8,
      "caption": "",
      "items": [
        {
          "id": "demo-maya",
          "type": "puppet",
          "asset": "cinema-maya",
          "name": "Maya",
          "x": 570,
          "y": 590,
          "w": 368,
          "h": 400,
          "bw": 460,
          "bh": 500,
          "rotation": 0,
          "acting": {
            "expression": "worried",
            "pose": "standing",
            "talk": false,
            "blink": true,
            "cues": [
              {
                "id": "act-maya",
                "start": 3,
                "duration": 2.2,
                "expression": "worried",
                "pose": "carrying",
                "talk": true
              }
            ]
          }
        },
        {
          "id": "demo-leo",
          "type": "puppet",
          "asset": "cinema-leo",
          "name": "Leo",
          "x": 1050,
          "y": 590,
          "w": 368,
          "h": 400,
          "bw": 460,
          "bh": 500,
          "rotation": 0,
          "acting": {
            "expression": "neutral",
            "pose": "standing",
            "talk": false,
            "blink": true,
            "cues": [
              {
                "id": "act-leo",
                "start": 5.4,
                "duration": 2.2,
                "expression": "surprised",
                "pose": "pointing",
                "talk": true
              }
            ]
          }
        },
        {
          "id": "demo-flashlight",
          "type": "asset",
          "asset": "cinema-manor-flashlight",
          "name": "Flashlight",
          "x": 640,
          "y": 580,
          "w": 140,
          "h": 140,
          "bw": 1254,
          "bh": 1254,
          "rotation": 0,
          "fiber": 0,
          "color": null,
          "attachment": {
            "parentId": "demo-maya",
            "anchor": "rightHand",
            "dx": 20,
            "dy": 0,
            "rotation": -30,
            "parentScaleX": 0.8,
            "parentScaleY": 0.8,
            "release": null
          }
        },
        {
          "id": "demo-branches",
          "type": "asset",
          "asset": "cinema-foreground-leafy-branches",
          "name": "Foreground branches",
          "x": 800,
          "y": 450,
          "w": 1600,
          "h": 900,
          "bw": 1672,
          "bh": 941,
          "rotation": 0,
          "fiber": 0,
          "color": null,
          "depth": "foreground"
        },
        {
          "id": "demo-line1",
          "type": "bubble",
          "name": "Did you hear that?",
          "bubbleStyle": "speech",
          "text": "Did you hear that?",
          "x": 570,
          "y": 290,
          "w": 490,
          "h": 190,
          "bw": 490,
          "bh": 190,
          "rotation": 0,
          "color": "#fffdf5",
          "textColor": "#202b2c",
          "outlineColor": "#202b2c",
          "outlineWidth": 4,
          "fontSize": 38,
          "fontFamily": "comic",
          "bold": true,
          "textAlign": "center",
          "autoFit": true,
          "tail": "bottom-left",
          "tailLength": 0.23,
          "tailPosition": 0.15,
          "fiber": 0,
          "stitch": false,
          "dialogue": {
            "start": 3,
            "duration": 2.2,
            "reveal": "words",
            "wordsPerSecond": 4
          }
        },
        {
          "id": "demo-line2",
          "type": "bubble",
          "name": "It came from the library…",
          "bubbleStyle": "speech",
          "text": "It came from the library…",
          "x": 1030,
          "y": 290,
          "w": 490,
          "h": 190,
          "bw": 490,
          "bh": 190,
          "rotation": 0,
          "color": "#fffdf5",
          "textColor": "#202b2c",
          "outlineColor": "#202b2c",
          "outlineWidth": 4,
          "fontSize": 38,
          "fontFamily": "comic",
          "bold": true,
          "textAlign": "center",
          "autoFit": true,
          "tail": "bottom-left",
          "tailLength": 0.23,
          "tailPosition": 0.15,
          "fiber": 0,
          "stitch": false,
          "dialogue": {
            "start": 5.4,
            "duration": 2.2,
            "reveal": "words",
            "wordsPerSecond": 4
          }
        }
      ],
      "cinema": {
        "shots": [
          {
            "id": "shot1",
            "name": "The manor",
            "duration": 3,
            "from": {
              "x": 800,
              "y": 450,
              "zoom": 1
            },
            "to": {
              "x": 800,
              "y": 450,
              "zoom": 1.15
            },
            "move": true
          },
          {
            "id": "shot2",
            "name": "Maya listens",
            "duration": 2.4,
            "from": {
              "x": 570,
              "y": 450,
              "zoom": 1.8
            },
            "to": {
              "x": 570,
              "y": 450,
              "zoom": 1.8
            },
            "move": false
          },
          {
            "id": "shot3",
            "name": "Leo reacts",
            "duration": 2.6,
            "from": {
              "x": 1030,
              "y": 450,
              "zoom": 1.8
            },
            "to": {
              "x": 1030,
              "y": 450,
              "zoom": 1.8
            },
            "move": false
          }
        ],
        "look": {
          "light": "night",
          "strength": 0.35,
          "weather": "fog",
          "density": 0.2,
          "x": 0.5,
          "y": 0.4,
          "endX": 0.5,
          "endY": 0.4,
          "target": null
        },
        "transition": {
          "kind": "fade",
          "duration": 0.8
        },
        "titles": [
          {
            "id": "title1",
            "kind": "title",
            "text": "The Midnight Knock",
            "subtitle": "A tiny felt mystery",
            "start": 0.5,
            "duration": 2,
            "color": "#fff9e8"
          }
        ]
      },
      "cues": [
        {
          "id": "wind1",
          "name": "Night air",
          "preset": "wind",
          "assetId": null,
          "start": 0,
          "duration": 8,
          "volume": 0.22,
          "loop": true,
          "fadeIn": 0.6,
          "fadeOut": 0.6,
          "offset": 0
        },
        {
          "id": "knock1",
          "name": "A mysterious knock",
          "preset": "knock",
          "assetId": null,
          "start": 2.4,
          "duration": 1.2,
          "volume": 0.65,
          "loop": false,
          "fadeIn": 0.03,
          "fadeOut": 0.2,
          "offset": 0
        }
      ],
      "narration": {
        "assetId": null,
        "delay": 0,
        "volume": 1
      }
    },
    {
      "id": "demo-inside",
      "name": "Only the old clock",
      "bg": 68,
      "bgColor": "#887364",
      "duration": 8,
      "caption": "",
      "items": [
        {
          "id": "demo-maya2",
          "type": "puppet",
          "asset": "cinema-maya",
          "name": "Maya",
          "x": 620,
          "y": 590,
          "w": 368,
          "h": 400,
          "bw": 460,
          "bh": 500,
          "rotation": 0,
          "acting": {
            "expression": "surprised",
            "pose": "standing",
            "talk": false,
            "blink": true,
            "cues": [
              {
                "id": "act2",
                "start": 3,
                "duration": 2.5,
                "expression": "happy",
                "pose": "waving",
                "talk": true
              }
            ]
          }
        },
        {
          "id": "demo-leo2",
          "type": "puppet",
          "asset": "cinema-leo",
          "name": "Leo",
          "x": 1040,
          "y": 590,
          "w": 368,
          "h": 400,
          "bw": 460,
          "bh": 500,
          "rotation": 0,
          "acting": {
            "expression": "happy",
            "pose": "standing",
            "talk": false,
            "blink": true,
            "cues": []
          }
        },
        {
          "id": "demo-line3",
          "type": "bubble",
          "name": "It is only the old clock!",
          "bubbleStyle": "speech",
          "text": "It is only the old clock!",
          "x": 760,
          "y": 290,
          "w": 490,
          "h": 190,
          "bw": 490,
          "bh": 190,
          "rotation": 0,
          "color": "#fffdf5",
          "textColor": "#202b2c",
          "outlineColor": "#202b2c",
          "outlineWidth": 4,
          "fontSize": 38,
          "fontFamily": "comic",
          "bold": true,
          "textAlign": "center",
          "autoFit": true,
          "tail": "bottom-left",
          "tailLength": 0.23,
          "tailPosition": 0.15,
          "fiber": 0,
          "stitch": false,
          "dialogue": {
            "start": 3,
            "duration": 2.2,
            "reveal": "words",
            "wordsPerSecond": 4
          }
        }
      ],
      "cinema": {
        "shots": [
          {
            "id": "shot4",
            "name": "Inside the library",
            "duration": 3,
            "from": {
              "x": 800,
              "y": 450,
              "zoom": 1
            },
            "to": {
              "x": 800,
              "y": 450,
              "zoom": 1
            },
            "move": false
          },
          {
            "id": "shot5",
            "name": "The answer",
            "duration": 3,
            "from": {
              "x": 650,
              "y": 450,
              "zoom": 1.6
            },
            "to": {
              "x": 650,
              "y": 450,
              "zoom": 2
            },
            "move": true
          },
          {
            "id": "shot6",
            "name": "Together again",
            "duration": 2,
            "from": {
              "x": 800,
              "y": 450,
              "zoom": 1
            },
            "to": {
              "x": 800,
              "y": 450,
              "zoom": 1
            },
            "move": false
          }
        ],
        "transition": {
          "kind": "dissolve",
          "duration": 0.8
        },
        "look": {
          "light": "sunset",
          "strength": 0.25,
          "weather": "none",
          "density": 0.3,
          "x": 0.5,
          "y": 0.4,
          "endX": 0.5,
          "endY": 0.4,
          "target": null
        }
      },
      "cues": [
        {
          "id": "bell1",
          "name": "Clock chime",
          "preset": "bell",
          "assetId": null,
          "start": 1,
          "duration": 2,
          "volume": 0.55,
          "loop": false,
          "fadeIn": 0.03,
          "fadeOut": 0.2,
          "offset": 0
        }
      ],
      "narration": {
        "assetId": null,
        "delay": 0,
        "volume": 1
      }
    },
    {
      "id": "demo-credits",
      "name": "The end",
      "bg": 68,
      "bgColor": "#887364",
      "duration": 7,
      "caption": "",
      "items": [
        {
          "id": "demo-maya3",
          "type": "puppet",
          "asset": "cinema-maya",
          "name": "Maya",
          "x": 350,
          "y": 590,
          "w": 368,
          "h": 400,
          "bw": 460,
          "bh": 500,
          "rotation": 0,
          "acting": {
            "expression": "happy",
            "pose": "standing",
            "talk": false,
            "blink": true,
            "cues": []
          }
        },
        {
          "id": "demo-leo3",
          "type": "puppet",
          "asset": "cinema-leo",
          "name": "Leo",
          "x": 1250,
          "y": 590,
          "w": 368,
          "h": 400,
          "bw": 460,
          "bh": 500,
          "rotation": 0,
          "acting": {
            "expression": "happy",
            "pose": "standing",
            "talk": false,
            "blink": true,
            "cues": []
          }
        }
      ],
      "cinema": {
        "transition": {
          "kind": "curtains",
          "duration": 1
        },
        "titles": [
          {
            "id": "credits",
            "kind": "credits",
            "text": "The Midnight Knock\n\nStarring Maya & Leo\n\nMade with Felt & Fable Studio\n\nCreated by Drew Wichman\n\nThanks for watching",
            "subtitle": "",
            "start": 0,
            "duration": 7,
            "color": "#fff9e8"
          }
        ]
      },
      "cues": [
        {
          "id": "chime1",
          "name": "Ending sparkle",
          "preset": "chime",
          "assetId": null,
          "start": 0.5,
          "duration": 3,
          "volume": 0.45,
          "loop": false,
          "fadeIn": 0.03,
          "fadeOut": 0.2,
          "offset": 0
        }
      ],
      "narration": {
        "assetId": null,
        "delay": 0,
        "volume": 1
      }
    }
  ],
  "custom": [],
  "imports": {},
  "exportFps": 60,
  "audioAssets": {},
  "music": {
    "assetId": null,
    "volume": 0.25,
    "loop": true,
    "duck": true,
    "fade": 1,
    "startSceneId": null,
    "endSceneId": null
  }
};
