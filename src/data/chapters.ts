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
  projection: "equirectangular" as const,
  hasAudio: false,
  isPreview: true,
};

export const chapters: Chapter[] = [
  {
    ...preview,
    slug: "ventral-body-upward-movement",
    durationLabel: "1:43 min",
    number: "1",
    title: "Ventral Body Upward Movement",
    summary:
      "Una <em>buza</em> descubre que los tiburones utilizan ciertos movimientos para <strong>reconocerse y comunicarse</strong> en puntos específicos del arrecife, convirtiéndolos en espacios de <strong>encuentro y reconocimiento social</strong>.",
    posterSrc: asset("media/images/episode-1.webp"),
  },
  {
    ...preview,
    slug: "tail-slap",
    durationLabel: "1:59 min",
    number: "2",
    title: "Tail Slap",
    summary:
      "Una <em>buza</em> descubre que los tiburones blancos utilizan los golpes de sus aletas para <strong>comunicarse, coordinarse y compartir el alimento</strong>, revelando una forma de inteligencia colectiva basada en <strong>acuerdos y cooperación</strong>, más que en la competencia.",
    posterSrc: asset("media/images/episode-2.webp"),
  },
  {
    ...preview,
    slug: "ampollas-de-lorenzini",
    durationLabel: "2:40 min",
    number: "3",
    title: "Ampollas de Lorenzini",
    summary:
      "Una <em>buza</em> observa cómo los tiburones utilizan sus <strong>ampollas de Lorenzini</strong> para explorar las jaulas de buceo y descubre que, lejos de actuar por instinto, investigan lo desconocido y <strong>comparten información</strong> para comprenderlo colectivamente.",
    posterSrc: asset("media/images/episode-3.webp"),
  },
];
