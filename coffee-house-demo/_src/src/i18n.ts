/**
 * Arayüz metinleri — tek kaynak: i18n/{tr,en,ar,ru}.json (brief §5: bileşenlerde sabit metin yok).
 * TR referans şemadır; diğer diller build'de anahtar anahtar karşılaştırılır. AR/RU'da yalnızca kapsam dışı
 * site sayfaları (markalar, referanslar, hakkımızda, yasal) eksik olabilir — o sayfalar EN'e bağlanır.
 * Ürün, şube ve yer adları burada değildir: veriden (data/*.json) gelir.
 * AR/RU: makine çevirisi başlangıcı — TEYİT: native kontrol.
 */
import ar from "../i18n/ar.json";
import en from "../i18n/en.json";
import ru from "../i18n/ru.json";
import tr from "../i18n/tr.json";
import sunum from "../i18n/sunum.json";
import type { Locale } from "./config";

export type Strings = typeof tr;
export type Sunum = typeof sunum;

/** AR/RU'da bilerek çevrilmeyen site bölümleri (sonraki faz) */
const OPTIONAL_IN_PARTIAL = new Set(["site.brands", "site.references", "site.about", "site.legal"]);

function compare(ref: unknown, other: unknown, lang: string, at: string, partial: boolean, errors: string[]) {
  if (typeof ref !== typeof other || Array.isArray(ref) !== Array.isArray(other)) {
    if (other === undefined && partial && OPTIONAL_IN_PARTIAL.has(at)) return;
    errors.push(`${lang}: ${at} ${other === undefined ? "eksik" : "tipi farklı"}`);
    return;
  }
  if (Array.isArray(ref)) {
    const o = other as unknown[];
    if (ref.length !== o.length) errors.push(`${lang}: ${at} dizi uzunluğu ${o.length} (tr: ${ref.length})`);
    ref.forEach((r, i) => compare(r, o[i], lang, `${at}[${i}]`, partial, errors));
  } else if (ref && typeof ref === "object") {
    for (const k of Object.keys(ref)) compare((ref as Record<string, unknown>)[k], (other as Record<string, unknown>)[k], lang, at ? `${at}.${k}` : k, partial, errors);
    for (const k of Object.keys(other as object)) if (!(k in ref)) errors.push(`${lang}: ${at ? `${at}.` : ""}${k} fazlalık`);
  } else if (typeof ref === "string") {
    // Referans (TR) da bilerek boşsa (ör. isteğe bağlı not) boş kalabilir
    if (!(other as string).trim() && ref.trim()) errors.push(`${lang}: ${at} boş`);
    // Yer tutucular ({n}, {branch}…) her dilde aynı olmalı
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    if (ph(ref) !== ph(other as string)) errors.push(`${lang}: ${at} yer tutucuları farklı (${ph(other as string)} ≠ ${ph(ref)})`);
  }
}

export function validateStrings(): void {
  const errors: string[] = [];
  compare(tr, en, "en", "", false, errors);
  compare(tr, ar, "ar", "", true, errors);
  compare(tr, ru, "ru", "", true, errors);
  if (errors.length) throw new Error(`i18n:\n  ${errors.join("\n  ")}`);
}

export const strings: Record<Locale, Strings> = { tr, en: en as Strings, ar: ar as unknown as Strings, ru: ru as unknown as Strings };
export const sunumStrings: Sunum = sunum;

export const fill = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
