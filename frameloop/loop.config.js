// frameloop configuration. Scene lengths are in beats, so every cut lands on the beat grid.
export default {
  width: 1920,
  height: 1080,
  fps: 30,
  bpm: 112,

  // The gate: a scene passes only when its graded score >= threshold AND it has no hard-gate failures
  // (banned CSS, missing assets, blank frames, long dead air, impure render).
  threshold: 8,
  maxIterations: 4,
  concurrency: 2,

  ai: {
    model: 'claude-opus-5-5',
    effort: 'xhigh', // "extra high"
    maxTokens: 32000,
  },

  // Dead-frame hunting thresholds (YDIF = mean absolute luma change vs previous frame, 0-255 scale).
  dead: {
    stillSeconds: 0.6,  // a still run longer than this is flagged (2x this = hard gate)
    endHoldBeats: 1,    // a still hold of up to this many beats at the end of a scene is allowed
    crawl: 0.02,        // YDIF below this counts as "not really moving" (spring tails creeping)
    blankEntropy: 0.02, // normalized luma entropy below this = blank frame
    blankContrast: 6,   // YMAX - YMIN below this = blank frame
    popFactor: 8,       // isolated spike: YDIF > popFactor x both neighbours
    popMin: 2,          // ...and above this absolute value
  },

  audio: {
    // One chord per bar (4 beats). Notes as MIDI numbers.
    progression: [
      [50, 53, 57, 60], // Dm7
      [46, 50, 53, 57], // Bbmaj7
      [53, 57, 60, 64], // Fmaj7
      [48, 52, 55, 59], // Cmaj7
    ],
  },

  scenes: [
    {
      id: 'neap-hero',
      file: 'scenes/neap-hero.html',
      beats: 8,
      brief:
        'Opening of a launch film for Neap, a tide-window app for sea kayakers. A calm sea line becomes the day\'s tide curve; the time of high water rises out of the water. Must read instantly as "tides", not as a generic app promo.',
    },
    {
      id: 'neap-window',
      file: 'scenes/neap-window.html',
      beats: 8,
      brief:
        'Zoomed into high water. A band opens over the slack-water window and the current arrows slow, flatten and reverse as the cursor crosses high water. This is the memorable moment of the film: the product idea shown as motion.',
    },
    {
      id: 'neap-outro',
      file: 'scenes/neap-outro.html',
      beats: 8,
      brief:
        'Wordmark. The tide rises inside the letters of "Neap", then one plain line says what the app is for. Quiet, confident ending; nothing extra.',
    },
  ],
};
