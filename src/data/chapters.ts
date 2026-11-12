export type AudioMode = 'integrated' | 'separate';

export interface Chapter {
  slug: string;
  number: string;
  title: string;
  summary: string;
  videoSrc: string;
  audioSrc?: string;
  subtitlesSrc: string;
  audioMode: AudioMode;
  loopVideo: boolean;
}

// Medios provisionales. Cambiar estas rutas no requiere tocar el reproductor.
const DEMO_VIDEO = 'https://threejs.org/examples/textures/pano.mp4';
const DEMO_AUDIO =
  'https://raw.githubusercontent.com/juanfuent-es/audio-subtitles-generator/main/demo.mp3';
const DEMO_SUBTITLES = '/subtitles/demo.srt';

export const titleShader = {
  amplitude: 0.018,
  frequency: 9,
  speed: 0.8,
  noiseScale: 3.2,
  mouseInfluence: 0.012,
};

export const chapters: Chapter[] = [
  {
    slug: 'lo-que-imaginamos',
    number: '01',
    title: 'Lo que imaginamos',
    summary: 'Una primera aproximación a las imágenes que construimos alrededor del depredador.',
    videoSrc: DEMO_VIDEO,
    audioSrc: DEMO_AUDIO,
    subtitlesSrc: DEMO_SUBTITLES,
    audioMode: 'separate',
    loopVideo: true,
  },
  {
    slug: 'bajo-la-superficie',
    number: '02',
    title: 'Bajo la superficie',
    summary: 'Un recorrido provisional por el espacio, el sonido y la observación.',
    videoSrc: DEMO_VIDEO,
    audioSrc: DEMO_AUDIO,
    subtitlesSrc: DEMO_SUBTITLES,
    audioMode: 'separate',
    loopVideo: true,
  },
  {
    slug: 'otras-formas-de-mirar',
    number: '03',
    title: 'Otras formas de mirar',
    summary: 'El cierre de la serie propone volver a mirar lo que creíamos reconocer.',
    videoSrc: DEMO_VIDEO,
    audioSrc: DEMO_AUDIO,
    subtitlesSrc: DEMO_SUBTITLES,
    audioMode: 'separate',
    loopVideo: true,
  },
];

export function getChapter(slug: string) {
  return chapters.find((chapter) => chapter.slug === slug);
}
