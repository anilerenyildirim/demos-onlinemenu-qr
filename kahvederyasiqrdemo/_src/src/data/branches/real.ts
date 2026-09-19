/**
 * Şubenin GERÇEK alanları (ad, tip, adres, telefon, e-posta) markanın sitesinden çekilen
 * data/subeler-tam.json'dan okunur — elle yazılmaz. Detay sayfası çekilmemiş ya da alan eksikse build düşer.
 */
import scraped from "../../../data/subeler-tam.json";
import type { Branch, BranchKind } from "../schema";

type Real = Pick<Branch, "name_i18n" | "kind" | "address" | "phone" | "email">;

/** @param siteSlug sitedeki detay sayfası yolunun son parçası (ör. "balikesir-merkez-subesi") */
export function realBranch(siteSlug: string): Real {
  const b = scraped.subeler.find((x) => x.detay_url.endsWith(`/${siteSlug}`));
  if (!b) throw new Error(`şube listede yok: ${siteSlug}`);
  if (b.kaynak !== "detay" || !b.adres || !b.telefon || !b.tip) throw new Error(`şube detayı eksik: ${siteSlug}`);
  const kind: BranchKind = b.tip === "Cafe&Restaurant" ? "cafe_restaurant" : "cafe";
  return { name_i18n: { tr: b.ad }, kind, address: b.adres, phone: b.telefon, email: b.eposta };
}

/** Yurtiçi şube sayısı — ölçek rakamı buradan gelir. */
export const domesticBranchCount: number = scraped.toplam;
