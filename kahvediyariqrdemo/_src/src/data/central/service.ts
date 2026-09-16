/**
 * Servis akışı metinleri merkezde yazılır ki marka dili her şubede aynı kalsın;
 * şube yalnızca hangi akışı kullandığını seçer (gerekirse kendi adımını ekler).
 * Ton, iç mekân tabelalarından alındı: "Siparişini buradan alabilirsin", "Ödeme noktası", "Self servis".
 */
import type { LocalizedText, ServiceMode } from "../schema";

// TEYİT: Şubelerdeki gerçek sipariş/ödeme akışı markayla doğrulanmalı.
export const ORDER_STEPS: Record<ServiceMode, LocalizedText[]> = {
  self_service: [
    { tr: "Siparişini kasaya söyle", en: "Tell us your order at the counter" },
    { tr: "Ödeme noktasında öde", en: "Pay at the payment point" },
    { tr: "Hazır olunca buradan alabilirsin", en: "Pick it up here when it's ready" },
  ],
  table_service: [
    { tr: "Masana geç, menüye buradan bak", en: "Take a seat and browse the menu here" },
    { tr: "Siparişini masanda alalım", en: "We'll take your order at your table" },
    { tr: "Ödemeyi masada ya da kasada yapabilirsin", en: "Pay at your table or at the counter" },
  ],
  mixed: [
    { tr: "Acelen varsa gel-al penceresine uğra", en: "In a hurry? Use the grab-and-go window" },
    { tr: "Oturacaksan siparişini kasaya söyle", en: "Staying in? Order at the counter" },
    { tr: "Hazır olunca adınla sesleniriz", en: "We'll call your name when it's ready" },
  ],
};

export const SERVICE_LABEL: Record<ServiceMode, LocalizedText> = {
  self_service: { tr: "Self servis", en: "Self service" },
  table_service: { tr: "Masaya servis", en: "Table service" },
  mixed: { tr: "Gel-al + self servis", en: "Grab-and-go + self service" },
};
