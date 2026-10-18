// Typographie française à l'affichage : espace insécable avant « ? ! : ; » et à l'intérieur des guillemets, pour
// qu'un « » ou un « ? » ne parte jamais seul à la ligne. Les textes rangés (game/…) gardent des espaces simples.
const NBSP = " ";

export function frenchSpaces(text: string): string {
  return text
    .replace(/« /g, `«${NBSP}`)
    .replace(/ ([»?!:;])/g, `${NBSP}$1`);
}
