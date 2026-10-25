    // Note Data & Fingerings
    export const FINGERINGS = {
        // SOPRANO (C)
        "C5": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        "C#5": [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        "D5": [1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        "D#5": [1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        "E5": [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        "F5": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1], // Baroque Low F (Forked + Foot)
        "F#5": [1, 1, 1, 1, 0, 1, 1, 1, 0, 0],
        "G5": [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        "G#5": [1, 1, 1, 0, 1, 1, 1, 0, 0, 0],
        "A5": [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        "B-5": [1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
        "B5": [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        "C6": [1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "C#6": [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        "D6": [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "E6": [0.5, 1, 1, 1, 1, 1, 0, 0, 0, 0],

        // ALTO (F)
        "F4": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        "G4": [1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        "A4": [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        "B-4": [1, 1, 1, 1, 1, 0, 1, 1, 1, 1], // Forked
        "B4": [1, 1, 1, 1, 0, 1, 1, 1, 0, 0],
        "C5_A": [1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        "D5_A": [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        "E5_A": [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        "F5_A": [1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "G5_A": [0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "A5_A": [0.5, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    };

    export const FREQUENCIES = {
        "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "A4": 440.00, "B-4": 466.16, "B4": 493.88,
        "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "B-5": 932.33, "B5": 987.77,
        "C6": 1046.50, "C#6": 1108.73, "D6": 1174.66, "E6": 1318.51
    };

    export const DEFAULTS = {
        soprano: ["B5", "A5", "G5", "E5", "D5", "C6", "D6", "F#5", "C5", "F5", "E6"],
        alto: ["E5_A", "D5_A", "C5_A", "A4", "G4", "F5_A", "G5_A", "B4", "F4", "B-4", "A5_A"]
    };

    // --- RHYTHM CONSTANTS (ms) ---
    const RHYTHM_S = 150;  // Sixteenth
    const RHYTHM_E = 300;  // Eighth Note
    const RHYTHM_Q = 600;  // Quarter Note
    const RHYTHM_Q_REST = 600; // Quarter Rest
    const RHYTHM_Q_DOT = 900; // Dotted Quarter
    const RHYTHM_H = 1200; // Half Note
    const RHYTHM_H_DOT = 1800; // Dotted Half
    const RHYTHM_W = 2400; // Whole Note

    export const SONG_LIBRARY = [
        {
            title: "Hot Cross Buns",
            notes: [
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H}, 
                {k:"G5", d:RHYTHM_H}, {k:null, d:RHYTHM_Q}, {k:null, d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H}, 
                {k:"G5", d:RHYTHM_H}, {k:null, d:RHYTHM_Q}, {k:null, d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q},
                {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H}, 
                {k:"G5", d:RHYTHM_H}, {k:null, d:RHYTHM_Q}, {k:null, d:RHYTHM_Q}
            ]
        },
        {
            title: "Mary Had a Little Lamb",
            notes: [
                {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_W}
            ]
        },
        {
            title: "Gently Sleep",
            notes: [
                {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H}
            ]
        },
        {
            title: "Au Clair de la Lune",
            notes: [
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_W},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_W},
                {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_H}, {k:"E5", d:RHYTHM_H},
                {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"F#5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q},
                {k:"D5", d:RHYTHM_W},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_W}
            ]
        },
        {
            title: "Ode to Joy",
            notes: [
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q},
                {k:"D6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_Q_DOT}, {k:"A5", d:RHYTHM_E}, {k:"A5", d:RHYTHM_H}, 
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q},
                {k:"D6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"A5", d:RHYTHM_Q_DOT}, {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_H} 
            ]
        },
        {
            title: "Twinkle Twinkle Little Star",
            notes: [
                {k:"C5", d:RHYTHM_Q}, {k:"C5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q},
                {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H}, // A section
                {k:"F5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q},
                {k:"D5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q}, {k:"C5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, // B section
                {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_H},
                {k:"C5", d:RHYTHM_Q}, {k:"C5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, // A section repeat
                {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"F5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q},
                {k:"D5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q}, {k:"C5", d:RHYTHM_H}
            ]
        },
        {
            title: "Jingle Bells",
            notes: [
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_W},
                {k:"C6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q},
                {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"A5", d:RHYTHM_H}, {k:"D6", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_W},
                {k:"C6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q},
                {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"D6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_W}
            ]
        },
        {
            title: "London Bridge",
            notes: [
                {k:"G5", d:RHYTHM_Q_DOT}, {k:"A5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"D5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_H},
                {k:"E5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q_DOT}, {k:"A5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"D5", d:RHYTHM_H}, {k:"G5", d:RHYTHM_H}, {k:"E5", d:RHYTHM_Q}, {k:"C5", d:RHYTHM_H}
            ]
        },
        {
            title: "Old MacDonald",
            notes: [
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_H}, 
                {k:null, d:RHYTHM_Q_REST},
                {k:"D5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_H},
                {k:null, d:RHYTHM_Q_REST},
                {k:"D5", d:RHYTHM_E}, {k:"D5", d:RHYTHM_E}, 
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_Q},                       
                {k:"D5", d:RHYTHM_E}, {k:"D5", d:RHYTHM_E}, 
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_H},                       
                {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, 
                {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E},  
                {k:"G5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_W}
            ]
        },
        {
            title: "When the Saints",
            notes: [
                {k:null, d:RHYTHM_Q_REST},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"D6", d:3000},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"D6", d:3000},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, 
                {k:"D6", d:RHYTHM_H}, {k:"B5", d:RHYTHM_H}, {k:"G5", d:RHYTHM_H}, {k:"B5", d:RHYTHM_H},
                {k:"A5", d:3000},
                {k:"B5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H_DOT},
                {k:"G5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_H}, 
                {k:"D6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_W},
                {k:null, d:RHYTHM_Q_REST},
                {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, 
                {k:"D6", d:RHYTHM_H}, {k:"B5", d:RHYTHM_H}, {k:"G5", d:RHYTHM_H}, {k:"A5", d:RHYTHM_H},
                {k:"G5", d:3000},
                {k:null, d:RHYTHM_Q_REST}, {k:null, d:RHYTHM_Q_REST}, {k:null, d:RHYTHM_Q_REST}
            ]
        },
        {
            title: "Aura Lee",
            notes: [
                {k:"G5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q},
                {k:"D6", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_H},
                {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"C6", d:RHYTHM_W},
                {k:"G5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q},
                {k:"D6", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_H},
                {k:"C6", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q},
                {k:"C6", d:RHYTHM_W}
            ]
        },
        {
            title: "Row Row Row Your Boat",
            notes: [
                {k:"C5", d:RHYTHM_Q_DOT}, {k:"C5", d:RHYTHM_Q_DOT}, {k:"C5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_E}, {k:"E5", d:RHYTHM_Q_DOT},
                {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_E}, {k:"E5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_H_DOT},
                {k:"C6", d:RHYTHM_E}, {k:"C6", d:RHYTHM_E}, {k:"C6", d:RHYTHM_E}, 
                {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E},
                {k:"E5", d:RHYTHM_E}, {k:"E5", d:RHYTHM_E}, {k:"E5", d:RHYTHM_E},
                {k:"C5", d:RHYTHM_E}, {k:"C5", d:RHYTHM_E}, {k:"C5", d:RHYTHM_E},
                {k:"G5", d:RHYTHM_Q}, {k:"F5", d:RHYTHM_E}, {k:"E5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_E}, {k:"C5", d:RHYTHM_H_DOT}
            ]
        },
        {
            title: "Amazing Grace",
            notes: [
                {k:"D5", d:RHYTHM_Q}, 
                {k:"G5", d:RHYTHM_H}, 
                {k:"B5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, 
                {k:"B5", d:RHYTHM_H}, 
                {k:"A5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_H}, 
                {k:"E5", d:RHYTHM_Q}, 
                {k:"D5", d:RHYTHM_H}, 
                {k:"D5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_H}, 
                {k:"B5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, 
                {k:"B5", d:RHYTHM_H}, 
                {k:"A5", d:RHYTHM_Q}, 
                {k:"D6", d:3000},
                {k:"B5", d:RHYTHM_Q}, 
                {k:"D6", d:RHYTHM_Q_DOT}, 
                {k:"B5", d:RHYTHM_E}, 
                {k:"D6", d:RHYTHM_E}, {k:"B5", d:RHYTHM_E}, 
                {k:"G5", d:RHYTHM_H}, 
                {k:"D5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_Q_DOT}, 
                {k:"G5", d:RHYTHM_E}, 
                {k:"G5", d:RHYTHM_E}, {k:"E5", d:RHYTHM_E}, 
                {k:"D5", d:RHYTHM_H}, 
                {k:"D5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_H}, 
                {k:"B5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, 
                {k:"B5", d:RHYTHM_H}, 
                {k:"A5", d:RHYTHM_Q}, 
                {k:"G5", d:3000}
            ]
        },
        {
            title: "It's Raining",
            notes: [
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H}, 
                {k:"E5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"E5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"E5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"E5", d:RHYTHM_H}, 
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_E}, {k:"A5", d:RHYTHM_E},
                {k:"G5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q},
                {k:"E5", d:RHYTHM_E}, {k:"A5", d:RHYTHM_E},
                {k:"G5", d:RHYTHM_E}, {k:"G5", d:RHYTHM_E}, // ta-di
                {k:"G5", d:RHYTHM_Q}, {k:"E5", d:RHYTHM_Q}, // ta, ta
                {k:"E5", d:RHYTHM_E}, {k:"A5", d:RHYTHM_E}, // ta-di
                {k:"G5", d:RHYTHM_H}, {k:"E5", d:RHYTHM_Q}  // ta-a, ta
            ]
        },
        {
            title: "Frère Jacques (in G)",
            notes: [
                {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_Q}, {k:"A5", d:RHYTHM_Q}, {k:"B5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q},
                {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_H},
                {k:"B5", d:RHYTHM_Q}, {k:"C6", d:RHYTHM_Q}, {k:"D6", d:RHYTHM_H},
                {k:"D6", d:RHYTHM_E}, {k:"E6", d:RHYTHM_E}, {k:"D6", d:RHYTHM_E}, {k:"C6", d:RHYTHM_E}, {k:"B5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q},
                {k:"D6", d:RHYTHM_E}, {k:"E6", d:RHYTHM_E}, {k:"D6", d:RHYTHM_E}, {k:"C6", d:RHYTHM_E}, {k:"B5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_Q},
                {k:"G5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H},
                {k:"G5", d:RHYTHM_Q}, {k:"D5", d:RHYTHM_Q}, {k:"G5", d:RHYTHM_H}
            ]
        }
    ];


// Durations are preserved from the original library. Quarter-note unit: 600 ms.
SONG_LIBRARY.forEach((song,i) => {
    song.id = 'builtin-' + i;
    song.score = { bpm:100, meter:i===11?'6/8':i===12?'3/4':'4/4', pickup:i===12?1:0, quantized:true };
});
