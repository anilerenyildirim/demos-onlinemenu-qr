/** Arama normalizasyonu — build'de `data-search` üretirken ve istemcide sorguda aynı fonksiyon kullanılır. */
export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
