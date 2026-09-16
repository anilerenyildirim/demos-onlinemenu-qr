/** Minimal güvenli şablon: interpolasyonlar otomatik kaçışlanır, `raw()` ile işaretlenen HTML olduğu gibi geçer. */

const RAW = Symbol("raw");
export interface Raw { [RAW]: true; value: string }

export const raw = (value: string): Raw => ({ [RAW]: true, value });

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

type Value = string | number | boolean | null | undefined | Raw | Value[];

const toStr = (v: Value): string => {
  if (v === null || v === undefined || v === false || v === true) return "";
  if (Array.isArray(v)) return v.map(toStr).join("");
  if (typeof v === "object" && RAW in v) return v.value;
  return esc(String(v));
};

export function html(strings: TemplateStringsArray, ...values: Value[]): Raw {
  let out = strings[0];
  values.forEach((v, i) => { out += toStr(v) + strings[i + 1]; });
  return raw(out);
}

export const attrs = (a: Record<string, string | number | boolean | null | undefined>) =>
  raw(
    Object.entries(a)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(String(v))}"`))
      .join(""),
  );
