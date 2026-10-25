const {
  useState,
  useRef,
  useEffect,
  useMemo
} = React;
const {
  DEFAULTS,
  timing,
  groupState,
  RoundTransport,
  integer
} = RoundHelper;
const THEMES = [{
  id: 'wood',
  name: 'Wood & Brass',
  number: '01',
  description: 'Warm walnut, ivory enamel, and satin brass.',
  colors: ['#df671b', '#237c82', '#d6a012', '#9161aa']
}, {
  id: 'studio',
  name: 'Studio Console',
  number: '02',
  description: 'Graphite hardware and an illuminated glass display.',
  colors: ['#2bd4f3', '#ffcc52', '#ff8f8b', '#a69afa']
}, {
  id: 'concert',
  name: 'Concert Hall',
  number: '03',
  description: 'Velvet, warm stage lighting, and luminous rings.',
  colors: ['#68efce', '#ffd174', '#b38bff', '#ff8caa']
}];
const Icon = ({
  name,
  size = 22
}) => {
  const paths = {
    palette: React.createElement(React.Fragment, null, React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "8"
    }), React.createElement("path", {
      d: "M12 4v16M4 12h16M6.4 6.4l11.2 11.2M6.4 17.6L17.6 6.4"
    }), React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    })),
    sound: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M11 5 6 9H3v6h3l5 4Z"
    }), React.createElement("path", {
      d: "M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"
    })),
    muted: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M11 5 6 9H3v6h3l5 4Z"
    }), React.createElement("path", {
      d: "m16 9 6 6m0-6-6 6"
    })),
    play: React.createElement("path", {
      d: "m8 4 12 8-12 8Z",
      fill: "currentColor",
      stroke: "none"
    }),
    pause: React.createElement(React.Fragment, null, React.createElement("rect", {
      x: "6",
      y: "4",
      width: "4",
      height: "16",
      rx: "1",
      fill: "currentColor",
      stroke: "none"
    }), React.createElement("rect", {
      x: "14",
      y: "4",
      width: "4",
      height: "16",
      rx: "1",
      fill: "currentColor",
      stroke: "none"
    })),
    reset: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M4 10a8 8 0 1 1 1 8M4 3v7h7"
    })),
    coffee: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"
    })),
    close: React.createElement("path", {
      d: "m6 6 12 12M6 18 18 6"
    }),
    check: React.createElement("path", {
      d: "m5 12 4 4L19 6"
    }),
    expand: React.createElement("path", {
      d: "M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"
    })
  };
  return React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, paths[name]);
};
function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
  large = false,
  suffix,
  id
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = integer(draft, min, max, value);
    setDraft(String(n));
    onChange(n);
  };
  return React.createElement("div", {
    className: `number-control ${large ? 'large-number' : ''}`
  }, label && React.createElement("label", {
    htmlFor: id
  }, label), React.createElement("div", {
    className: "number-body"
  }, React.createElement("input", {
    id: id,
    "aria-label": label || 'Tempo in beats per minute',
    type: "number",
    inputMode: "numeric",
    min: min,
    max: max,
    step: "1",
    value: draft,
    disabled: disabled,
    onChange: e => {
      const v = e.target.value;
      setDraft(v);
      const n = Number(v);
      if (v !== '' && Number.isInteger(n) && n >= min && n <= max) onChange(n);
    },
    onBlur: commit,
    onKeyDown: e => {
      if (e.key === 'Enter') {
        commit();
        e.currentTarget.blur();
      }
    }
  }), suffix && React.createElement("span", {
    className: "number-unit"
  }, suffix), !large && React.createElement("div", {
    className: "step-buttons"
  }, React.createElement("button", {
    type: "button",
    "aria-label": `Increase ${label.toLowerCase()}`,
    disabled: disabled || value >= max,
    onClick: () => onChange(Math.min(max, value + 1))
  }, "\u25B4"), React.createElement("button", {
    type: "button",
    "aria-label": `Decrease ${label.toLowerCase()}`,
    disabled: disabled || value <= min,
    onClick: () => onChange(Math.max(min, value - 1))
  }, "\u25BE"))));
}
function useFrame(engine) {
  const [frame, setFrame] = useState(engine.snapshot());
  useEffect(() => engine.subscribe(setFrame), [engine]);
  return frame;
}
const pointAt = (r, angle) => ({
  x: 400 + r * Math.sin(angle),
  y: 400 - r * Math.cos(angle)
});
function Conductor({
  engine,
  config,
  theme
}) {
  const {
    position,
    status,
    beat
  } = useFrame(engine);
  const t = timing(config);
  const isReady = status === 'ready' || status === 'starting';
  const countIn = position < 0;
  const completed = status === 'complete';
  const phase = countIn ? Math.max(0, (position + t.beatsPerMeasure) / t.beatsPerMeasure) : position % t.loop / t.loop;
  const angle = phase * 360;
  const centerText = isReady ? 'READY' : completed ? 'DONE' : countIn ? Math.min(t.beatsPerMeasure, beat + t.beatsPerMeasure + 1) : beat % t.beatsPerMeasure + 1;
  const centerLabel = isReady ? 'PRESS PLAY' : completed ? 'WELL SUNG' : status === 'paused' ? 'PAUSED' : countIn ? 'COUNT IN' : 'BEAT';
  const elapsedBeats = Math.max(0, Math.min(t.total, position));
  const radii = Array.from({
    length: config.groupCount
  }, (_, i) => 315 - i * (config.groupCount === 2 ? 94 : config.groupCount === 3 ? 72 : 62));
  const groups = radii.map((r, i) => groupState(i, position, config));
  const divisionCount = Math.min(config.measures, 32);
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "dial-region"
  }, React.createElement("svg", {
    className: `conductor-dial ${status === 'playing' ? 'is-running' : ''}`,
    viewBox: "0 0 800 800",
    role: "img",
    "aria-label": `Round conductor: ${status === 'ready' ? 'ready' : completed ? 'finished' : countIn ? 'count in' : 'beat ' + centerText}, ${config.groupCount} groups`
  }, React.createElement("defs", null, React.createElement("radialGradient", {
    id: "plate",
    cx: "42%",
    cy: "25%",
    r: "85%"
  }, React.createElement("stop", {
    stopColor: "var(--dial-top)"
  }), React.createElement("stop", {
    offset: "0.7",
    stopColor: "var(--dial-bottom)"
  }), React.createElement("stop", {
    offset: "1",
    stopColor: "var(--dial-edge)"
  })), React.createElement("linearGradient", {
    id: "bezel",
    x1: "0",
    y1: "0",
    x2: "0.9",
    y2: "1"
  }, React.createElement("stop", {
    stopColor: "var(--bezel-highlight)"
  }), React.createElement("stop", {
    offset: ".23",
    stopColor: "var(--bezel-dark)"
  }), React.createElement("stop", {
    offset: ".47",
    stopColor: "var(--bezel-mid)"
  }), React.createElement("stop", {
    offset: ".65",
    stopColor: "var(--bezel-highlight)"
  }), React.createElement("stop", {
    offset: "1",
    stopColor: "var(--bezel-dark)"
  })), React.createElement("radialGradient", {
    id: "hub",
    cx: "40%",
    cy: "15%",
    r: "100%"
  }, React.createElement("stop", {
    stopColor: "var(--hub-top)"
  }), React.createElement("stop", {
    offset: "1",
    stopColor: "var(--hub-bottom)"
  })), React.createElement("linearGradient", {
    id: "needle",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, React.createElement("stop", {
    stopColor: "var(--needle-dark)"
  }), React.createElement("stop", {
    offset: ".5",
    stopColor: "var(--needle-light)"
  }), React.createElement("stop", {
    offset: "1",
    stopColor: "var(--needle-dark)"
  })), React.createElement("filter", {
    id: "ring-glow",
    x: "-25%",
    y: "-25%",
    width: "150%",
    height: "150%"
  }, React.createElement("feGaussianBlur", {
    stdDeviation: "4"
  })), React.createElement("filter", {
    id: "small-shadow",
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%"
  }, React.createElement("feDropShadow", {
    dx: "0",
    dy: "3",
    stdDeviation: "3",
    floodColor: "#000",
    floodOpacity: ".5"
  }))), React.createElement("circle", {
    cx: "400",
    cy: "406",
    r: "381",
    fill: "#000",
    opacity: ".24"
  }), React.createElement("circle", {
    cx: "400",
    cy: "400",
    r: "381",
    fill: "url(#bezel)"
  }), React.createElement("circle", {
    cx: "400",
    cy: "400",
    r: "374",
    fill: "none",
    stroke: "var(--bezel-highlight)",
    strokeWidth: "1",
    opacity: ".65"
  }), React.createElement("circle", {
    cx: "400",
    cy: "400",
    r: "369",
    fill: "url(#plate)",
    stroke: "var(--bezel-dark)",
    strokeWidth: "3"
  }), React.createElement("circle", {
    cx: "400",
    cy: "400",
    r: "363",
    fill: "none",
    stroke: "var(--dial-outline)",
    strokeWidth: "1"
  }), Array.from({
    length: divisionCount
  }, (_, i) => {
    const a = i / divisionCount * 2 * Math.PI;
    const p1 = pointAt(342, a),
      p2 = pointAt(i % 2 ? 350 : 355, a);
    return React.createElement("line", {
      key: i,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      stroke: "var(--tick)",
      strokeWidth: i % 2 ? 1.5 : 2.5,
      strokeLinecap: "round"
    });
  }), radii.map((r, i) => {
    const g = groups[i],
      color = theme.colors[i],
      circumference = 2 * Math.PI * r;
    const startAngle = g.start % t.loop / t.loop * 360;
    const progress = g.status === 'done' ? 1 : g.status === 'singing' ? g.inLoop / t.loop : 0;
    const p = pointAt(r, startAngle * Math.PI / 180);
    return React.createElement("g", {
      key: i,
      className: `ring ring-${g.status}`
    }, React.createElement("circle", {
      cx: "400",
      cy: "400",
      r: r,
      fill: "none",
      stroke: "var(--groove-shadow)",
      strokeWidth: "27"
    }), React.createElement("circle", {
      cx: "400",
      cy: "400",
      r: r,
      fill: "none",
      stroke: color,
      strokeOpacity: "var(--track-opacity)",
      strokeWidth: "23"
    }), React.createElement("circle", {
      cx: "400",
      cy: "400",
      r: r + 13.5,
      fill: "none",
      stroke: "var(--groove-edge)",
      strokeWidth: "1"
    }), React.createElement("circle", {
      cx: "400",
      cy: "400",
      r: r - 13.5,
      fill: "none",
      stroke: "var(--groove-edge)",
      strokeWidth: "1"
    }), progress > 0 && React.createElement("g", {
      transform: `rotate(${startAngle - 90} 400 400)`,
      opacity: g.status === 'done' ? .55 : 1
    }, React.createElement("circle", {
      className: "arc-glow",
      cx: "400",
      cy: "400",
      r: r,
      fill: "none",
      stroke: color,
      strokeWidth: "25",
      strokeDasharray: `${progress * circumference} ${circumference}`,
      filter: "url(#ring-glow)"
    }), React.createElement("circle", {
      cx: "400",
      cy: "400",
      r: r,
      fill: "none",
      stroke: color,
      strokeWidth: "23",
      strokeLinecap: progress < .005 ? 'butt' : 'round',
      strokeDasharray: `${progress * circumference} ${circumference}`
    }), React.createElement("circle", {
      cx: "400",
      cy: "399",
      r: r,
      fill: "none",
      stroke: "#fff",
      strokeOpacity: ".22",
      strokeWidth: "1",
      strokeDasharray: `${progress * circumference} ${circumference}`
    })), Array.from({
      length: Math.min(config.measures, 16)
    }, (_, m) => {
      const a = startAngle * Math.PI / 180 + m / Math.min(config.measures, 16) * 2 * Math.PI;
      const p1 = pointAt(r - 23, a),
        p2 = pointAt(r - 31, a);
      return React.createElement("line", {
        key: m,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        stroke: "var(--tick)",
        opacity: ".45",
        strokeWidth: "1.5",
        strokeLinecap: "round"
      });
    }), React.createElement("g", {
      transform: `translate(${p.x} ${p.y})`,
      filter: "url(#small-shadow)"
    }, React.createElement("circle", {
      r: "22",
      fill: color,
      stroke: "var(--marker-edge)",
      strokeWidth: "2"
    }), React.createElement("circle", {
      r: "18.5",
      fill: "none",
      stroke: "#fff",
      strokeOpacity: ".35",
      strokeWidth: "1"
    }), React.createElement("text", {
      y: "7.5",
      textAnchor: "middle",
      fill: "var(--marker-text)",
      fontSize: "24",
      fontWeight: "700"
    }, i + 1)));
  }), React.createElement("g", {
    transform: `rotate(${angle} 400 400)`,
    className: "conductor-needle",
    filter: "url(#small-shadow)"
  }, React.createElement("path", {
    d: "M397 400 399 46 Q400 42 401 46L403 400Z",
    fill: "url(#needle)"
  }), React.createElement("circle", {
    cx: "400",
    cy: "53",
    r: "4",
    fill: "var(--needle-light)"
  })), React.createElement("circle", {
    cx: "400",
    cy: "400",
    r: "85",
    fill: "url(#hub)",
    stroke: "var(--hub-stroke)",
    strokeWidth: "2"
  }), React.createElement("circle", {
    cx: "400",
    cy: "400",
    r: "78",
    fill: "none",
    stroke: "var(--hub-stroke)",
    strokeWidth: ".5",
    opacity: ".5"
  }), React.createElement("text", {
    x: "400",
    y: typeof centerText === 'number' ? 415 : 400,
    textAnchor: "middle",
    className: `dial-count ${typeof centerText === 'number' ? '' : 'dial-word'}`,
    fill: "var(--text)"
  }, centerText), React.createElement("text", {
    x: "400",
    y: "444",
    textAnchor: "middle",
    className: "dial-label",
    fill: "var(--text-muted)"
  }, centerLabel), React.createElement("circle", {
    cx: "400",
    cy: "306",
    r: "8",
    fill: "url(#bezel)",
    stroke: "var(--bezel-dark)"
  }))), React.createElement("div", {
    className: "group-strip",
    style: {
      '--group-count': config.groupCount
    }
  }, groups.map((g, i) => React.createElement("div", {
    key: i,
    className: `group-card ${g.status}`,
    style: {
      '--group-color': theme.colors[i]
    }
  }, React.createElement("div", {
    className: "group-title"
  }, React.createElement("span", {
    className: "group-led"
  }), React.createElement("strong", null, "Group ", i + 1), React.createElement("span", {
    className: "group-state"
  }, g.status === 'done' ? '✓' : g.status === 'singing' ? `${g.repetition}/${config.repeats}` : '•••')), React.createElement("div", {
    className: "group-progress"
  }, React.createElement("span", {
    style: {
      width: `${g.progress * 100}%`
    }
  })), React.createElement("div", {
    className: "group-detail"
  }, g.status === 'done' ? 'Finished' : g.status === 'singing' ? `Singing · measure ${Math.floor(g.inLoop / t.beatsPerMeasure) + 1}` : isReady ? `Enters ${i === 0 ? 'first' : `after ${i * config.offsetValue} ${config.offsetUnit}`}` : `In ${Math.max(1, Math.ceil(g.start - position))} beats`)))), React.createElement("div", {
    className: "performance-foot"
  }, React.createElement("span", {
    className: `status-light ${status}`
  }), React.createElement("span", null, status === 'playing' ? countIn ? 'Count in' : 'Round in progress' : status === 'paused' ? 'Paused — resume when ready' : completed ? 'Round complete — play again' : 'Ready when you are'), React.createElement("span", {
    className: "beat-total"
  }, Math.floor(elapsedBeats), " / ", t.total, " beats")));
}
function ThemeDialog({
  open,
  onClose,
  selected,
  onSelect
}) {
  const dialog = useRef(null);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();else if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  return React.createElement("dialog", {
    ref: dialog,
    className: "theme-dialog",
    onCancel: onClose,
    onClose: onClose,
    onClick: e => {
      if (e.target === dialog.current) {
        const r = dialog.current.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
      }
    },
    "aria-labelledby": "theme-title"
  }, React.createElement("div", {
    className: "dialog-heading"
  }, React.createElement("div", null, React.createElement("p", {
    className: "eyebrow"
  }, "MAKE IT YOURS"), React.createElement("h2", {
    id: "theme-title"
  }, "Choose your atmosphere")), React.createElement("button", {
    className: "icon-button",
    "aria-label": "Close theme chooser",
    onClick: onClose
  }, React.createElement(Icon, {
    name: "close"
  }))), React.createElement("div", {
    className: "theme-options"
  }, THEMES.map(theme => React.createElement("button", {
    key: theme.id,
    className: `theme-choice ${selected === theme.id ? 'selected' : ''}`,
    onClick: () => {
      onSelect(theme.id);
      onClose();
    },
    "aria-pressed": selected === theme.id
  }, React.createElement("div", {
    className: `theme-preview preview-${theme.id}`
  }, React.createElement("div", {
    className: "mini-panel"
  }, React.createElement("span", null), React.createElement("span", null), React.createElement("span", null), React.createElement("span", null)), React.createElement("div", {
    className: "mini-dial"
  }, theme.colors.slice(0, 3).map((c, i) => React.createElement("i", {
    key: i,
    style: {
      '--preview-color': c,
      '--inset': `${12 + i * 14}%`
    }
  })), React.createElement("b", null, "2")), selected === theme.id && React.createElement("span", {
    className: "selected-check"
  }, React.createElement(Icon, {
    name: "check",
    size: 17
  }))), React.createElement("span", {
    className: "theme-choice-title"
  }, React.createElement("small", null, theme.number), theme.name), React.createElement("span", {
    className: "theme-description"
  }, theme.description)))));
}
function App() {
  const [config, setConfig] = useState(DEFAULTS);
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new RoundTransport(DEFAULTS);
  const engine = engineRef.current;
  const [status, setStatus] = useState('ready');
  const [audioError, setAudioError] = useState('');
  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem('round-helper-theme');
      return THEMES.some(t => t.id === saved) ? saved : 'studio';
    } catch (_) {
      return 'studio';
    }
  });
  const [themeOpen, setThemeOpen] = useState(false);
  const [clickOptions, setClickOptions] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);
  const tapTimes = useRef([]);
  const theme = THEMES.find(t => t.id === themeId);
  const playing = status === 'playing' || status === 'starting';
  useEffect(() => {
    document.body.dataset.theme = themeId;
    try {
      localStorage.setItem('round-helper-theme', themeId);
    } catch (_) {}
  }, [themeId]);
  useEffect(() => {
    const unsub = engine.subscribe(s => {
      setStatus(previous => previous === s.status ? previous : s.status);
      setAudioError(s.error);
    });
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) engine.pause();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [engine]);
  const change = patch => {
    engine.update(patch);
    setConfig({
      ...engine.config
    });
  };
  const tap = () => {
    const now = performance.now();
    if (tapTimes.current.length && now - tapTimes.current.at(-1) > 2000) tapTimes.current = [];
    tapTimes.current.push(now);
    tapTimes.current = tapTimes.current.slice(-5);
    if (tapTimes.current.length > 1) change({
      bpm: integer(60000 / ((now - tapTimes.current[0]) / (tapTimes.current.length - 1)), 40, 200, 100)
    });
    setTapPulse(true);
    setTimeout(() => setTapPulse(false), 120);
  };
  const togglePlay = () => playing ? engine.pause() : engine.start();
  return React.createElement("div", {
    className: `app-shell theme-${themeId}`
  }, React.createElement("span", {
    className: "chassis-screw screw-tl",
    "aria-hidden": "true"
  }), React.createElement("span", {
    className: "chassis-screw screw-tr",
    "aria-hidden": "true"
  }), React.createElement("span", {
    className: "chassis-screw screw-bl",
    "aria-hidden": "true"
  }), React.createElement("span", {
    className: "chassis-screw screw-br",
    "aria-hidden": "true"
  }), React.createElement("aside", {
    className: "console-column"
  }, React.createElement("header", {
    className: "brand"
  }, React.createElement("h1", null, "Round Helper"), React.createElement("div", {
    className: "edition"
  }, React.createElement("span", null, theme.number), React.createElement("span", {
    className: "edition-divider"
  }), theme.name)), React.createElement("section", {
    className: "setup-panel",
    "aria-label": "Round setup"
  }, React.createElement("h2", {
    className: "panel-title"
  }, "Round setup", React.createElement("span", {
    className: `power-led ${playing ? 'lit' : ''}`
  })), React.createElement("div", {
    className: "setup-content"
  }, React.createElement("div", {
    className: "tempo-module"
  }, React.createElement("div", {
    className: "tempo-row"
  }, React.createElement(NumberControl, {
    id: "tempo",
    label: "Tempo",
    value: config.bpm,
    min: 40,
    max: 200,
    large: true,
    suffix: "BPM",
    onChange: bpm => change({
      bpm
    })
  }), React.createElement("button", {
    className: `hardware-button tap-button ${tapPulse ? 'tapped' : ''}`,
    onClick: tap
  }, "TAP")), React.createElement("input", {
    className: "tempo-slider",
    type: "range",
    min: "40",
    max: "200",
    value: config.bpm,
    "aria-label": "Tempo",
    onChange: e => change({
      bpm: Number(e.target.value)
    }),
    style: {
      '--fill': `${(config.bpm - 40) / 160 * 100}%`
    }
  }), React.createElement("div", {
    className: "tempo-scale"
  }, React.createElement("span", null, "40"), React.createElement("span", null, config.timeSignature === '6/8' ? 'Dotted-quarter beat' : 'Beats per minute'), React.createElement("span", null, "200"))), React.createElement("fieldset", {
    className: "round-fields"
  }, React.createElement("div", {
    className: "setting-cell"
  }, React.createElement("label", {
    htmlFor: "meter"
  }, "Time signature"), React.createElement("div", {
    className: "select-wrapper"
  }, React.createElement("select", {
    id: "meter",
    disabled: playing,
    value: config.timeSignature,
    onChange: e => change({
      timeSignature: e.target.value
    })
  }, ['2/4', '3/4', '4/4', '6/8'].map(s => React.createElement("option", {
    key: s
  }, s))))), React.createElement("div", {
    className: "setting-cell"
  }, React.createElement(NumberControl, {
    disabled: playing,
    id: "measures",
    label: "Measures",
    value: config.measures,
    min: 1,
    max: 32,
    onChange: measures => change({
      measures
    })
  })), React.createElement("div", {
    className: "setting-cell"
  }, React.createElement(NumberControl, {
    disabled: playing,
    id: "groups",
    label: "Groups",
    value: config.groupCount,
    min: 2,
    max: 4,
    onChange: groupCount => change({
      groupCount
    })
  })), React.createElement("div", {
    className: "setting-cell entry-cell"
  }, React.createElement(NumberControl, {
    disabled: playing,
    id: "entry",
    label: "Enter every",
    value: config.offsetValue,
    min: 1,
    max: 128,
    onChange: offsetValue => change({
      offsetValue
    })
  }), React.createElement("div", {
    className: "unit-selector",
    "aria-label": "Group entry units"
  }, ['measures', 'beats'].map(unit => React.createElement("button", {
    key: unit,
    disabled: playing,
    onClick: () => change({
      offsetUnit: unit
    }),
    "aria-pressed": config.offsetUnit === unit
  }, unit)))), React.createElement("div", {
    className: "setting-cell repeats-cell"
  }, React.createElement(NumberControl, {
    disabled: playing,
    id: "repeats",
    label: "Repeats",
    value: config.repeats,
    min: 1,
    max: 32,
    onChange: repeats => change({
      repeats
    })
  })), React.createElement("div", {
    className: "setting-cell metronome-cell"
  }, React.createElement("span", {
    className: "field-label"
  }, "Metronome"), React.createElement("button", {
    className: `toggle ${config.soundEnabled ? 'on' : ''}`,
    role: "switch",
    "aria-checked": config.soundEnabled,
    "aria-label": "Metronome sound",
    onClick: () => change({
      soundEnabled: !config.soundEnabled
    }),
    disabled: false
  }, React.createElement("span", null)))), React.createElement("div", {
    className: "setup-note"
  }, React.createElement("span", null, playing ? 'Pause to adjust the round.' : 'Each group sings the full round.'), React.createElement("button", {
    className: "text-button",
    onClick: () => setClickOptions(v => !v),
    "aria-expanded": clickOptions
  }, "Click options ", React.createElement("span", null, clickOptions ? '−' : '+'))), clickOptions && React.createElement("div", {
    className: "click-options"
  }, React.createElement("div", {
    className: "segmented-control"
  }, ['accent', 'flat'].map(style => React.createElement("button", {
    key: style,
    "aria-pressed": config.metronomeStyle === style,
    onClick: () => change({
      metronomeStyle: style
    })
  }, style === 'accent' ? 'Accented' : 'Even clicks'))), React.createElement("label", null, React.createElement("input", {
    type: "checkbox",
    checked: config.highPitchAccent,
    disabled: config.metronomeStyle === 'flat',
    onChange: e => change({
      highPitchAccent: e.target.checked
    })
  }), "Higher pitch on downbeats")), React.createElement("div", {
    className: "transport-row"
  }, React.createElement("button", {
    className: `play-button ${playing ? 'playing' : ''}`,
    onClick: togglePlay,
    "aria-label": playing ? 'Pause round' : status === 'paused' ? 'Resume round' : status === 'complete' ? 'Play round again' : 'Play round'
  }, React.createElement(Icon, {
    name: playing ? 'pause' : 'play',
    size: 38
  }), React.createElement("span", null, playing ? 'PAUSE' : status === 'paused' ? 'RESUME' : status === 'complete' ? 'PLAY AGAIN' : 'PLAY')), React.createElement("button", {
    className: "reset-button hardware-button",
    onClick: () => engine.reset()
  }, React.createElement(Icon, {
    name: "reset",
    size: 28
  }), React.createElement("span", null, "RESET"))), audioError && React.createElement("p", {
    className: "audio-error",
    role: "alert"
  }, audioError)), React.createElement("footer", {
    className: "support-area"
  }, React.createElement("p", {
    className: "creator"
  }, "Created by ", React.createElement("strong", null, "Drew Wichman")), React.createElement("p", {
    className: "support-copy"
  }, "Finding Round Helper useful? Your support helps me create more free music classroom tools."), React.createElement("a", {
    className: "coffee-link",
    href: "https://www.buymeacoffee.com/musicaldrewby",
    target: "_blank",
    rel: "noopener noreferrer"
  }, React.createElement(Icon, {
    name: "coffee",
    size: 19
  }), React.createElement("span", null, "Buy me a coffee"), React.createElement("span", {
    className: "link-arrow",
    "aria-hidden": "true"
  }, "\u2197"))))), React.createElement("main", {
    className: "stage-panel",
    "aria-label": "Round conductor"
  }, React.createElement("div", {
    className: "stage-toolbar"
  }, React.createElement("div", {
    className: "stage-caption"
  }, React.createElement("span", {
    className: "eyebrow"
  }, "THE CONDUCTOR"), React.createElement("span", null, config.groupCount, " voices. One shared pulse.")), React.createElement("div", {
    className: "toolbar-actions"
  }, React.createElement("button", {
    className: "hardware-button theme-button",
    onClick: () => setThemeOpen(true),
    "aria-label": "Choose theme",
    "aria-haspopup": "dialog"
  }, React.createElement(Icon, {
    name: "palette",
    size: 20
  }), React.createElement("span", null, "Themes")), React.createElement("button", {
    className: "hardware-button sound-button",
    onClick: () => change({
      soundEnabled: !config.soundEnabled
    }),
    "aria-label": config.soundEnabled ? 'Mute metronome' : 'Unmute metronome',
    "aria-pressed": config.soundEnabled
  }, React.createElement(Icon, {
    name: config.soundEnabled ? 'sound' : 'muted'
  })))), React.createElement(Conductor, {
    engine: engine,
    config: config,
    theme: theme
  })), React.createElement(ThemeDialog, {
    open: themeOpen,
    onClose: () => setThemeOpen(false),
    selected: themeId,
    onSelect: setThemeId
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
