/**
 * Alternative søgninger når Magentos søgning giver 0 resultater.
 * Magento/OpenSearch splitter ikke danske sammensatte ord, så "vinkelstophane"
 * finder intet, selvom "stophane vinkel" gør. Vi prøver derfor:
 *   1. sammensatte ord splittet ved kendte fagord ("vinkel stophane")
 *   2. kun hovedordet ("stophane"), med evt. dimensioner bevaret
 *   3. stavning uden bindestreger/specialtegn
 */

// Hovedord (efterled) i VVS/el-sortimentet, længste først så "stophane" vinder over "hane".
const HEADS = [
  "afspærringsventil", "sikkerhedsventil", "kontraventil", "radiatorventil", "kugleventil", "vinkelventil",
  "termostatføler", "termostat", "stophane", "kuglehane", "aftapningshane", "vandhane", "hane",
  "pressfitting", "fitting", "overgang", "forskruning", "kobling", "samling", "muffe", "nippel", "bøjning",
  "knæ", "tee", "reduktion", "prop", "hætte", "slange", "rør", "afløb", "gulvafløb", "vandlås", "lås",
  "armatur", "batteri", "bruser", "brusesæt", "pakning", "o-ring", "filter", "pumpe", "ventil", "føler",
  "beslag", "bøjle", "clips", "skrue", "bolt", "møtrik", "skive", "tape", "snor", "lampe", "pære", "spot",
  "kontakt", "stikkontakt", "kabel", "ledning", "tang", "skærer", "nøgle", "bor",
].sort((a, b) => b.length - a.length);

const DIM_RE = /(?:\b\d+ )?\b\d+\/\d+\b|\b\d+\s?mm\b|\bdn ?\d+\b/gi;

function splitCompound(word: string): string[] | null {
  const w = word.toLowerCase();
  if (w.length < 7) return null;
  for (const head of HEADS) {
    if (w.endsWith(head) && w.length - head.length >= 3) {
      let prefix = w.slice(0, w.length - head.length).replace(/-+$/, "");
      // Danske fuge-bogstaver: "radiator-s-ventil", "vand-s-…"
      if (prefix.endsWith("s") && prefix.length > 4) prefix = prefix.slice(0, -1);
      return [prefix, head];
    }
  }
  return null;
}

export function queryVariants(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ");
  const dims = q.match(DIM_RE) || [];
  const words = q.replace(DIM_RE, " ").split(/\s+/).filter(Boolean);

  const out: string[] = [];
  const add = (s: string) => {
    const v = s.replace(/\s+/g, " ").trim();
    if (v.length >= 2 && v.toLowerCase() !== q.toLowerCase() && !out.some((o) => o.toLowerCase() === v.toLowerCase()))
      out.push(v);
  };

  // 1. Split sammensatte ord
  const split = words.map((w) => splitCompound(w));
  if (split.some(Boolean)) {
    add([...words.map((w, i) => (split[i] ? split[i]!.join(" ") : w)), ...dims].join(" "));
  }

  // 2. Kun hovedordet (sidste fagord) + dimensioner
  const lastSplit = [...split].reverse().find(Boolean);
  const lastWord = words[words.length - 1]?.toLowerCase();
  const head = lastSplit ? lastSplit[1] : words.length > 1 && HEADS.includes(lastWord) ? lastWord : null;
  if (head) add([head, ...dims].join(" "));

  // 3. Uden bindestreger og specialtegn
  add(q.replace(/[-_/]+(?!\d)/g, " ").replace(/[^\p{L}\p{N}\s/.]/gu, " "));

  return out.slice(0, 3);
}
