import { asset } from "../lib/paths";

export interface Chapter {
  slug: string;
  number: string;
  title: string;
  summary: string;
  videoSrc: string;
  posterSrc: string;
  durationLabel: string;
  projection: "flat" | "equirectangular";
  hasAudio: boolean;
  isPreview: boolean;
  audioSrc?: string;
  subtitlesSrc?: string;
  loopVideo?: boolean;
}

// Replace these shared preview media with the final episodes when available.
const preview = {
  videoSrc: asset("media/video/episode-demo.mp4"),
  durationLabel: "2:00 min",
  projection: "equirectangular" as const,
  hasAudio: false,
  isPreview: true,
};

export const chapters: Chapter[] = [
  {
    ...preview,
    slug: "ventral-body-upward-movement",
    number: "1",
    title: "Ventral Body Upward Movement",
    summary:
      "Una buza descubre que los tiburones utilizan ciertos movimientos para reconocerse y comunicarse en puntos específicos del arrecife, convirtiéndolos en espacios de encuentro y reconocimiento social.",
    posterSrc: asset("media/images/episode-1.webp"),
  },
  {
    ...preview,
    slug: "tail-slap",
    number: "2",
    title: "Tail Slap",
    summary:
      "Una buza descubre que los tiburones blancos utilizan los golpes de sus aletas para comunicarse, coordinarse y compartir el alimento, revelando una forma de inteligencia colectiva basada en acuerdos y cooperación, más que en la competencia.",
    posterSrc: asset("media/images/episode-2.webp"),
  },
  {
    ...preview,
    slug: "ampollas-de-lorenzini",
    number: "3",
    title: "Ampollas de Lorenzini",
    summary:
      "Una buza observa cómo los tiburones utilizan sus ampollas de Lorenzini para explorar las jaulas de buceo y descubre que, lejos de actuar por instinto, investigan lo desconocido y comparten información para comprenderlo colectivamente.",
    posterSrc: asset("media/images/episode-3.webp"),
  },
];
