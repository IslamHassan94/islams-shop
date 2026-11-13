/**
 * Original, generated product artwork (SVG) for each garment type and colour.
 * Served by app/img/[key]/[color]/route.ts, e.g. /img/leggings/black
 */
import { COLORS } from "./catalog-meta";

type Shape = { body: string; details?: string };

// All shapes drawn on a 600 x 750 canvas.
const SHAPES: Record<string, Shape> = {
  leggings: {
    body: "M200,170 L400,170 L414,300 L398,670 L330,670 L306,340 L294,340 L270,670 L202,670 L186,300 Z",
    details:
      '<rect x="196" y="122" width="208" height="52" rx="10" class="g"/><rect x="196" y="122" width="208" height="52" rx="10" class="s"/>' +
      '<path d="M300,180 L300,330" class="seam"/>',
  },
  bra: {
    body: "M188,300 C188,240 228,200 248,160 L272,160 C276,226 292,262 300,272 C308,262 324,226 328,160 L352,160 C372,200 412,240 412,300 L412,410 L188,410 Z",
    details:
      '<rect x="188" y="400" width="224" height="58" rx="8" class="g"/><rect x="188" y="400" width="224" height="58" rx="8" class="s"/>' +
      '<path d="M252,160 L246,108 M348,160 L354,108" class="strap"/>',
  },
  tank: {
    body: "M236,128 L270,128 C276,196 324,196 330,128 L364,128 L368,204 C382,232 404,244 414,256 L416,580 L184,580 L186,256 C196,244 218,232 232,204 Z",
    details: '<path d="M270,128 C276,196 324,196 330,128" class="seam"/>',
  },
  tee: {
    body: "M228,140 C258,174 342,174 372,140 L462,190 L430,286 L394,266 L398,580 L202,580 L206,266 L170,286 L138,190 Z",
    details: '<path d="M228,140 C258,174 342,174 372,140" class="seam"/><path d="M206,266 L200,250 M394,266 L400,250" class="seam"/>',
  },
  shorts: {
    body: "M190,272 L410,272 L428,488 L322,508 L300,386 L278,508 L172,488 Z",
    details:
      '<rect x="186" y="226" width="228" height="50" rx="10" class="g"/><rect x="186" y="226" width="228" height="50" rx="10" class="s"/>' +
      '<path d="M285,276 L280,320 M315,276 L320,320" class="strap"/>',
  },
  hoodie: {
    body: "M232,168 L368,168 L452,212 L484,566 L432,578 L402,322 L406,610 L194,610 L198,322 L168,578 L116,566 L148,212 Z",
    details:
      '<path d="M236,176 C228,82 372,82 364,176 Z" class="g"/><path d="M236,176 C228,82 372,82 364,176" class="s"/>' +
      '<rect x="236" y="440" width="128" height="84" rx="14" class="shade"/>' +
      '<path d="M286,176 L282,262 M314,176 L318,262" class="strap"/>' +
      '<rect x="194" y="584" width="212" height="26" rx="6" class="shade"/>',
  },
  joggers: {
    body: "M194,166 L406,166 L428,322 L408,618 L334,618 L306,346 L294,346 L266,618 L192,618 L172,322 Z",
    details:
      '<rect x="190" y="118" width="220" height="52" rx="10" class="g"/><rect x="190" y="118" width="220" height="52" rx="10" class="s"/>' +
      '<rect x="190" y="612" width="80" height="44" rx="8" class="shade"/><rect x="330" y="612" width="80" height="44" rx="8" class="shade"/>' +
      '<path d="M286,170 L282,214 M314,170 L318,214" class="strap"/>',
  },
  socks: {
    body: "M246,150 L342,150 L342,440 L432,516 C460,542 446,604 402,604 L296,604 C250,604 246,562 246,520 Z",
    details:
      '<rect x="246" y="150" width="96" height="62" class="shade"/>' +
      '<path d="M246,232 L342,232 M246,250 L342,250" class="stripe"/>',
  },
  cap: {
    body: "M168,430 C168,252 432,252 432,430 Z",
    details:
      '<path d="M150,430 C252,462 482,458 526,424 C506,478 300,500 148,450 Z" class="g"/><path d="M150,430 C252,462 482,458 526,424 C506,478 300,500 148,450 Z" class="s"/>' +
      '<path d="M300,262 L300,430 M232,282 C250,340 256,390 256,430 M368,282 C350,340 344,390 344,430" class="seam"/>' +
      '<circle cx="300" cy="262" r="10" class="g"/>',
  },
  bag: {
    body: "M200,330 L400,330 C452,330 470,360 470,410 L470,540 C470,566 452,580 426,580 L174,580 C148,580 130,566 130,540 L130,410 C130,360 148,330 200,330 Z",
    details:
      '<path d="M226,334 C226,230 374,230 374,334" class="handle"/>' +
      '<path d="M150,372 L450,372" class="seam"/><rect x="250" y="440" width="100" height="60" rx="10" class="shade"/>',
  },
  band: {
    body: "M300,250 C430,250 470,320 470,380 C470,450 420,510 300,510 C180,510 130,450 130,380 C130,320 170,250 300,250 Z M300,300 C220,300 190,340 190,380 C190,424 222,460 300,460 C378,460 410,424 410,380 C410,340 380,300 300,300 Z",
  },
};

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const ART_KEYS = Object.keys(SHAPES);

export function renderProductSvg(key: string, colorName: string): string | null {
  const shape = SHAPES[key];
  const hex = COLORS[colorName];
  if (!shape || !hex) return null;
  const dark = shade(hex, -38);
  const light = colorName === "White" || colorName === "Sand";
  const stroke = light ? "#b9b5ad" : dark;

  const attrs: Record<string, string> = {
    g: `fill="${hex}"`,
    s: `fill="url(#sh-${key})" stroke="${stroke}" stroke-width="2"`,
    shade: `fill="${dark}" opacity=".35"`,
    seam: `fill="none" stroke="${stroke}" stroke-width="2" stroke-dasharray="6 6" opacity=".7"`,
    strap: `fill="none" stroke="${hex}" stroke-width="16" stroke-linecap="round"`,
    handle: `fill="none" stroke="${dark}" stroke-width="22" stroke-linecap="round"`,
    stripe: `stroke="${light ? "#1f2328" : "#ffffff"}" stroke-width="8" opacity=".8"`,
  };
  const inline = (markup: string) => markup.replace(/class="(\w+)"/g, (_, c: string) => attrs[c] ?? "");

  // Gradient ids are suffixed with the key so several inline SVGs on one page don't clash.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750" role="img" aria-label="${key} in ${colorName}">
<defs>
  <linearGradient id="bg-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f5f2"/><stop offset="1" stop-color="#e9e6e0"/></linearGradient>
  <linearGradient id="sh-${key}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
  <radialGradient id="fl-${key}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<rect width="600" height="750" fill="url(#bg-${key})"/>
<ellipse cx="300" cy="690" rx="200" ry="22" fill="url(#fl-${key})"/>
${inline(`<path d="${shape.body}" class="g" fill-rule="evenodd"/><path d="${shape.body}" class="s" fill-rule="evenodd"/>${shape.details ?? ""}`)}
</svg>`;
}
