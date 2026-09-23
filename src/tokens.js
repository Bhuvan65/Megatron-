export const C = {
  bg: '#05070A', panel: '#0C1117', edge: '#1A232D',
  chromeLo: '#3A434D', chromeMid: '#8E99A6', chromeHi: '#D6DEE7',
  cyan: '#00F0FF', cyanDim: '#0891A0', amber: '#FFB300', violet: '#8A2BFF',
  text: '#E8F4F8', text2: '#7F8FA0', disabled: '#3E4A57'
}

// [start, length] for useScroll().range
export const SCROLL = {
  hero: [0, 0.15],
  rotate: [0.15, 0.25],
  explode: [0.4, 0.25],
  physics: [0.65, 0.15],
  hangar: [0.8, 0.2]
}

export const SECTIONS = [
  ['HERO', SCROLL.hero],
  ['ROTATION', SCROLL.rotate],
  ['EXPLODED', SCROLL.explode],
  ['PHYSICS', SCROLL.physics],
  ['HANGAR', SCROLL.hangar]
]

export const FONT = {
  display: "'Orbitron', sans-serif",
  body: "'Rajdhani', sans-serif",
  mono: "'JetBrains Mono', monospace"
}

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
