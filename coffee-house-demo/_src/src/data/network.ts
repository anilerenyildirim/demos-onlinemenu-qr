/**
 * Şube ağı (data/ag.json): markanın "Nerelerdeyiz" ve "Referanslar" sayfalarından derlenen lokasyonlar.
 * Konumlar şehir/ilçe düzeyindedir — TEYİT. Sayılar (şube, ülke, marka) buradan hesaplanır; elle yazılmaz.
 */
import ag from "../../data/ag.json";
import { LOCALES, type Locale } from "../config";
import type { BrandId, I18n } from "./schema";

export type CountryCode = "TR" | "AE" | "KG";
export type LocationStatus = "acik" | "yakinda";

export interface NetworkLocation {
  id: string;
  country: CountryCode;
  status: LocationStatus;
  brand: BrandId;
  place: I18n;
  city: I18n;
  /** [enlem, boylam] — şehir/ilçe merkezi */
  latlng: [number, number];
  /** QR menü demosu olan şubenin slug'ı */
  menu: string | null;
  note: string | null;
}

const fail = (msg: string): never => { throw new Error(`[ağ] ${msg}`); };
const i18n = (t: Record<string, string>, where: string): I18n => {
  for (const l of LOCALES) if (!t[l]) fail(`${where}: "${l}" eksik`);
  return t as I18n;
};

export const company = ag.firma;
export const countries = ag.ulkeler as Record<CountryCode, I18n>;

export const locations: NetworkLocation[] = ag.lokasyonlar.map((x) => {
  if (!(x.ulke in countries)) fail(`${x.id}: bilinmeyen ülke ${x.ulke}`);
  if (x.durum !== "acik" && x.durum !== "yakinda") fail(`${x.id}: bilinmeyen durum ${x.durum}`);
  return {
    id: x.id,
    country: x.ulke as CountryCode,
    status: x.durum as LocationStatus,
    brand: x.marka as BrandId,
    place: i18n(x.yer, `${x.id}.yer`),
    city: i18n(x.sehir, `${x.id}.sehir`),
    latlng: x.konum as [number, number],
    menu: "menu" in x ? (x as { menu: string }).menu : null,
    note: "teyit" in x ? (x as { teyit: string }).teyit : null,
  };
});

export const references = ag.referanslar.map((r) => ({ name: r.ad, place: r.yer as { tr: string; en: string } }));

/** Rakam şeridi — TEYİT: listede 19 kayıt var; tekrar eden Esenyurt tek sayıldı */
export const stats = {
  open: locations.filter((l) => l.status === "acik").length,
  coming: locations.filter((l) => l.status === "yakinda").length,
  countries: new Set(locations.map((l) => l.country)).size,
  brands: new Set(locations.map((l) => l.brand)).size,
  since: company.kurulus,
};

export const countryName = (c: CountryCode, l: Locale) => countries[c][l];
