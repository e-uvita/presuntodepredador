import { asset } from "../lib/paths";

/** Site identity and shared assets. Keep episode-specific media in chapters.ts. */
export const site = {
  name: "Presunto depredador",
  tagline: "El tiburón que existe y el que imaginamos.",
  year: 2026,
  description:
    "Tres narraciones desde el océano que cuestionan nuestra forma de mirar a los tiburones. Un proyecto de Elizabeth Lezama Jacinto.",
  heroImage: asset("media/images/ocean.webp"),
  heroImageAlt: "Tiburones nadando juntos en el azul del océano",
  branding: {
    // Temporary reconstruction. Replace with the owner's original exported asset.
    mark: asset("branding/mark.svg"),
    favicon: asset("branding/mark.svg"),
    title: asset("branding/title.svg"),
    titleWidth: 1600,
    titleHeight: 623,
  },
  // Set to null for self-hosted fonts declared in styles/fonts.css.
  fontStylesheetUrl: "https://use.typekit.net/fop2wxl.css" as string | null,
};
