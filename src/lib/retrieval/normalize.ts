const STOP_WORDS = new Set([
  "و",
  "یا",
  "در",
  "به",
  "از",
  "با",
  "برای",
  "را",
  "رو",
  "که",
  "یک",
  "این",
  "آن",
  "چه",
  "چطور",
  "چگونه",
  "می",
  "شود",
  "شده",
  "کنم",
  "کنیم",
  "کردن",
  "است",
  "هست",
  "the",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "and",
  "or",
  "how",
  "can",
  "i",
  "is",
  "are",
]);

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bnext[\s.-]*js\b/giu, " nextjs "],
  [/نکست(?:\s+جی\s+اس)?/gu, " nextjs "],

  [/\bnode[\s.-]*js\b/giu, " nodejs "],
  [/\bnode\b/giu, " nodejs "],
  [/نود(?:\s+جی\s+اس)?/gu, " nodejs "],

  [/\bpostgres(?:ql)?\b/giu, " postgresql "],
  [/پستگرس(?:کیوال)?/gu, " postgresql "],

  [/\bredis\b/giu, " redis "],
  [/ردیس/gu, " redis "],

  [/\bdocker\b/giu, " docker "],
  [/داکر/gu, " docker "],

  [/\bpython\b/giu, " python "],
  [/پایتون/gu, " python "],

  [/\blaravel\b/giu, " laravel "],
  [/لاراول/gu, " laravel "],

  [/\bdjango\b/giu, " django "],
  [/جنگو/gu, " django "],

  [/\bwordpress\b/giu, " wordpress "],
  [/وردپرس/gu, " wordpress "],

  [/\bcron\b/giu, " cron "],
  [/کران/gu, " cron "],

  [/\bdatabase\b/giu, " database "],
  [/دیتابیس/gu, " database "],
  [/پایگاه\s+داده/gu, " database "],

  [/\bconnect(?:ion)?\b/giu, " connect "],
  [/اتصال/gu, " connect "],
  [/متصل/gu, " connect "],
  [/وصل/gu, " connect "],

  [/\bdomain\b/giu, " domain "],
  [/دامنه/gu, " domain "],
  [/دامین/gu, " domain "],

  [/\badd(?:ing)?\b/giu, " add "],
  [/اضافه\s+کردن/gu, " add "],
  [/افزودن/gu, " add "],

  [/\bapplications?\b/giu, " app "],
  [/\bapps?\b/giu, " app "],
  [/برنامه/gu, " app "],

  [/\bports?\b/giu, " port "],
  [/پورت(?:\s*ها|های)?/gu, " port "],

  [/\bupload\b/giu, " upload "],
  [/آپلود/gu, " upload "],
  [/بارگذاری/gu, " upload "],

  [/\bbucket\b/giu, " bucket "],
  [/باکت/gu, " bucket "],

  [/\bemail[\s-]*server\b/giu, " emailserver "],
  [/ایمیل[\s‌-]*سرور/gu, " emailserver "],

  [/\bstatic[\s-]*ip\b/giu, " staticip "],
  [/آی[\s‌-]*پی\s+ثابت/gu, " staticip "],

  [/\bagent\b/giu, " agent "],
  [/عامل/gu, " agent "],
];

function canonicalizeCharacters(value: string): string {
  return value
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/\u200c/g, " ")
    .replace(
      /[\u064B-\u065F\u0670\u06D6-\u06ED]/g,
      "",
    );
}

export function normalizeText(value: string): string {
  let normalized = canonicalizeCharacters(
    value.normalize("NFKC").toLowerCase(),
  );

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token));
}
