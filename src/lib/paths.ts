/** Public URLs share Astro's base, including GitHub Pages project sites. */
export function asset(path: string) {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function chapterHref(slug: string) {
  return asset(`capitulos/${slug}/`);
}
