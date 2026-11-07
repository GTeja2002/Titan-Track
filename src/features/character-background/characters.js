import toji from './assets/toji.png';
import goku from './assets/goku.png';
import zoro from './assets/zoro.png';
import baki from './assets/baki.png';

// Local imports let Vite bundle the artwork for web and Android WebView builds.
export const CHARACTERS = Object.freeze([
  { id: 'toji', name: 'Toji', src: toji, color: '#7db296' },
  { id: 'goku', name: 'Goku', src: goku, color: '#e7bc65' },
  { id: 'zoro', name: 'Zoro', src: zoro, color: '#8ebd70' },
  { id: 'baki', name: 'Baki', src: baki, color: '#d58b7a' },
]);
