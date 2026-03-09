// Dominant colors from each African country's flag
// [primary, secondary] — used for spotlight theming
export const countryColors: Record<string, [string, string]> = {
  DZ: ["#006233", "#D21034"],     // Algeria — green, red
  AO: ["#CC092F", "#000000"],     // Angola — red, black
  BJ: ["#008751", "#FCD116"],     // Benin — green, yellow
  BW: ["#6DA9E4", "#000000"],     // Botswana — blue, black
  BF: ["#EF2B2D", "#009E49"],     // Burkina Faso — red, green
  BI: ["#CE1126", "#1EB53A"],     // Burundi — red, green
  CM: ["#007A5E", "#CE1126"],     // Cameroon — green, red
  CV: ["#003893", "#CF2027"],     // Cape Verde — blue, red
  CF: ["#003082", "#CE1126"],     // CAR — blue, red
  TD: ["#002664", "#C60C30"],     // Chad — blue, red
  KM: ["#3A7728", "#FFC72C"],     // Comoros — green, yellow
  CG: ["#009543", "#FBDE4A"],     // Congo — green, yellow
  CD: ["#007FFF", "#CE1021"],     // DR Congo — blue, red
  DJ: ["#6AB2E7", "#12AD2B"],     // Djibouti — blue, green
  EG: ["#CE1126", "#000000"],     // Egypt — red, black
  GQ: ["#3E9A00", "#E32118"],     // Eq Guinea — green, red
  ER: ["#EA0437", "#4189DD"],     // Eritrea — red, blue
  SZ: ["#3D5DA7", "#FFD900"],     // Eswatini — blue, yellow
  ET: ["#009A44", "#FCDD09"],     // Ethiopia — green, yellow
  GA: ["#009E60", "#FCD116"],     // Gabon — green, yellow
  GM: ["#CE1126", "#0C1C8C"],     // Gambia — red, blue
  GH: ["#006B3F", "#FCD116"],     // Ghana — green, yellow
  GN: ["#CE1126", "#FCD116"],     // Guinea — red, yellow
  GW: ["#CE1126", "#009E49"],     // Guinea-Bissau — red, green
  CI: ["#F77F00", "#009E60"],     // Ivory Coast — orange, green
  KE: ["#BB0000", "#006600"],     // Kenya — red, green
  LS: ["#00209F", "#009543"],     // Lesotho — blue, green
  LR: ["#BF0A30", "#002868"],     // Liberia — red, blue
  LY: ["#000000", "#239E46"],     // Libya — black, green
  MG: ["#FC3D32", "#007E3A"],     // Madagascar — red, green
  MW: ["#CE1126", "#339E35"],     // Malawi — red, green
  ML: ["#14B53A", "#FCD116"],     // Mali — green, yellow
  MR: ["#006233", "#C09300"],     // Mauritania — green, gold
  MU: ["#EA2839", "#1A206D"],     // Mauritius — red, blue
  MA: ["#C1272D", "#006233"],     // Morocco — red, green
  MZ: ["#FFD100", "#009A44"],     // Mozambique — yellow, green
  NA: ["#003580", "#009A44"],     // Namibia — blue, green
  NE: ["#E05206", "#0DB02B"],     // Niger — orange, green
  NG: ["#008751", "#FFFFFF"],     // Nigeria — green, white
  RW: ["#20603D", "#FAD201"],     // Rwanda — green, yellow
  ST: ["#12AD2B", "#FFD100"],     // Sao Tome — green, yellow
  SN: ["#00853F", "#FDEF42"],     // Senegal — green, yellow
  SC: ["#003D88", "#D62828"],     // Seychelles — blue, red
  SL: ["#1EB53A", "#0072C6"],     // Sierra Leone — green, blue
  SO: ["#4189DD", "#FFFFFF"],     // Somalia — blue, white
  ZA: ["#007A4D", "#FFB612"],     // South Africa — green, gold
  SS: ["#078930", "#DA121A"],     // South Sudan — green, red
  SD: ["#D21034", "#007229"],     // Sudan — red, green
  TZ: ["#1EB53A", "#FCD116"],     // Tanzania — green, yellow
  TG: ["#006A4E", "#D21034"],     // Togo — green, red
  TN: ["#E70013", "#FFFFFF"],     // Tunisia — red, white
  UG: ["#000000", "#FCDC04"],     // Uganda — black, yellow
  ZM: ["#198A00", "#EF7D00"],     // Zambia — green, orange
  ZW: ["#006400", "#FFD200"],     // Zimbabwe — green, yellow
};

export function getTeamColors(countryCode?: string): [string, string] {
  if (!countryCode) return ["#ffffff", "#cccccc"];
  return countryColors[countryCode.toUpperCase()] || ["#ffffff", "#cccccc"];
}
