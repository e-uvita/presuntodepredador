export interface Typeface {
  id: string;
  name: string;
  cssFamily: string;
  downloadSrc?: string;
  layers?: { name: string; cssFamily: string }[];
}

export const specimen = {
  text:"QUIZÁ HOLLYWOOD JUZGUE AL TIBURÓN POR SUS FAUCES, MIENTRAS EL HOMBRE OCULTA SU VIOLENCIA BAJO UN EXTRAÑO GUITAR Y UN MARKETING QUE VENDE.",
  size: 64,
  minSize: 24,
  maxSize: 160,
};

// These are the two UI families already available, not the project's final font.
export const typefaces: Typeface[] = [
  { id: "titles", name: "Títulos", cssFamily: "var(--font-display)" },
  { id: "body", name: "Texto", cssFamily: "var(--font-body)" },
];

// Once the original files exist, import { asset } from "../lib/paths",
// declare their @font-face in styles/fonts.css,
// and add an entry here. Only publish a download when its file is supplied:
// { id: "project", name: "Presunto", cssFamily: '"Presunto"',
//   downloadSrc: asset("fonts/presunto.otf"),
//   layers: [
//     { name: "Capa 1", cssFamily: '"Presunto Capa 1"' },
//     { name: "Capa 2", cssFamily: '"Presunto Capa 2"' },
//     { name: "Capa 3", cssFamily: '"Presunto Capa 3"' },
//   ] },
