/**
 * Kurumsal site sayfaları. Metinler i18n/*.json → site; ağ verisi data/ag.json; görseller build'den.
 * Birincil hedef franchise başvurusu: her sayfada "Başvuru yap", anasayfa ve franchising'de güçlü CTA.
 */
import { SITE, hasPage, paths, type Locale } from "../../config";
import { company, countryName, locations, references, stats, type CountryCode, type NetworkLocation } from "../../data/network";
import type { BrandId } from "../../data/schema";
import { fill } from "../../i18n";
import { phoneIntl, telHref } from "../../shared/format";
import { jsonScript } from "../document";
import { attrs, html, raw, type Raw } from "../html";
import { icons } from "../icons";
import { BRAND_NAME } from "../menu";
import { instaHandle, mailHref, pageHead, pic, renderSitePage, siteT, waHref, type SiteAssets } from "./layout";

const BRAND_LABEL: Record<BrandId, string> = BRAND_NAME;
const COUNTRIES: CountryCode[] = ["TR", "AE", "KG"];
const n2 = (i: number) => String(i + 1).padStart(2, "0");
const directionsUrl = (loc: NetworkLocation) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Coffee House ${loc.place.tr} ${loc.city.tr}`)}`;

/** Coffee Art'ın logosu yok — tipografik geçici işaret (menüdekiyle aynı) */
const caMark = (): Raw => html`<span class="ca-mark ca-mark--lg" role="img" aria-label="Coffee Art"><span>Coffee</span><span>Art</span></span>`;

const organizationLd = (l: Locale, a: SiteAssets) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Coffee House",
  slogan: company.slogan,
  url: SITE + paths.site("home", l),
  logo: SITE + a.logo,
  foundingDate: String(company.kurulus), // TEYİT: know-how başlangıcı mı, kuruluş mu?
  email: company.eposta,
  telephone: company.telefon_e164,
  address: { "@type": "PostalAddress", streetAddress: "Kemalpaşa Mah. Fethibey Cad. No: 61", addressLocality: "Fatih", addressRegion: "İstanbul", addressCountry: "TR" },
  sameAs: [company.instagram],
  brand: [{ "@type": "Brand", name: "Coffee House" }, { "@type": "Brand", name: "Coffee Art" }],
});

// ─── Anasayfa ───────────────────────────────────────────────────────────────
export function renderHome(l: Locale, a: SiteAssets): string {
  const t = siteT(l), h = t.home;
  const whyIcons = [icons.tag, icons.store, icons.sparkle, icons.layers];
  const gallery: [string, string][] = [["ic-mekan", "ic-mekan-oturma-alani.jpg"], ["soguk-icecekler", "cilekli-matcha-iced-latte-yakin.jpg"], ["latte-art", "latte-art-kalpli.jpg"], ["pop-art", "ic-mekan-pop-art-duvar.jpg"]];
  const perCountry = COUNTRIES.map((c) => ({ c, n: locations.filter((x) => x.country === c && x.status === "acik").length }));

  const body = html`
<section class="hero">
  <div class="wrap hero__grid">
    <div class="hero__text">
      <p class="eyebrow">${h.eyebrow}</p>
      <h1 class="hero__title">${h.h1.map((line) => html`<span>${line}</span>`)}</h1>
      <p class="hero__lead">${h.lead}</p>
      <p class="hero__ctas">
        <a class="btn btn--solid btn--xl" href="${paths.site("franchising", l)}#basvuru">${h.ctaApply}${icons.arrow()}</a>
        <a class="btn btn--ghost btn--xl" href="${paths.site("branches", l)}">${h.ctaBranches}</a>
      </p>
    </div>
    <figure class="porthole" data-porthole>
      ${pic(a.video.poster, h.videoLabel, "(min-width: 64rem) 520px, (min-width: 40rem) 60vw, 84vw", { cls: "porthole__poster", eager: true, high: true })}
      <video class="porthole__video" muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" data-mp4="${a.video.mp4}" data-webm="${a.video.webm}"></video>
      <button class="porthole__toggle" type="button" data-video-toggle data-play="${t.video.play}" data-pause="${t.video.pause}" aria-label="${t.video.pause}" hidden>${icons.pause()}</button>
    </figure>
  </div>
</section>

<section class="stats" aria-label="Coffee House">
  <ul class="wrap stats__list" role="list">
    <li><b>${stats.open}</b><span>${h.stats.branches}</span></li>
    <li><b>${stats.coming}</b><span>${h.stats.coming}</span></li>
    <li><b>${stats.countries}</b><span>${h.stats.countries}</span></li>
    <li><b>${stats.brands}</b><span>${h.stats.brands}</span></li>
    <li><b>${stats.since}</b><span>${h.stats.since}</span></li>
  </ul>
</section>

<section class="block wrap" aria-labelledby="h-why">
  <h2 class="block__title" id="h-why">${h.whyTitle}</h2>
  <ul class="cards cards--4" role="list">
    ${h.why.map((w, i) => html`<li class="card">${whyIcons[i]()}<h3>${w.title}</h3><p>${w.body}</p></li>`)}
  </ul>
</section>

<section class="block block--latte" aria-labelledby="h-brands">
  <div class="wrap">
    <h2 class="block__title" id="h-brands">${h.brandsTitle}</h2>
    <p class="block__lead">${h.brandsLead}</p>
    <div class="duo">
      <article class="duo__card duo__card--ch">
        ${pic(a.img["neon-logo"], a.alt("neon-logo-kahvenin-evine-hosgeldiniz.jpg", l), "(min-width: 56rem) 280px, 40vw", { cls: "duo__img" })}
        <div class="duo__text"><img src="${a.logo}" alt="" width="64" height="64" loading="lazy"><h3>Coffee House</h3><p>${h.brandCH}</p></div>
      </article>
      <article class="duo__card duo__card--ca">
        <div class="duo__mark">${caMark()}</div>
        <div class="duo__text"><h3>Coffee Art</h3><p>${h.brandCA}</p></div>
      </article>
    </div>
    <p class="block__more"><a class="link" href="${paths.site("brands", l)}"${hasPage("brands", l) ? "" : attrs({ hreflang: "en" })}>${h.brandsLink}${icons.arrow()}</a></p>
  </div>
</section>

<section class="block wrap" aria-labelledby="h-process">
  <h2 class="block__title" id="h-process">${h.processTitle}</h2>
  <ol class="steps5" role="list">
    ${t.process.map((s, i) => html`<li><span class="steps5__n" aria-hidden="true">${n2(i)}</span><h3>${s.title}</h3></li>`)}
  </ol>
  <p class="block__more"><a class="link" href="${paths.site("franchising", l)}#surec">${h.processLink}${icons.arrow()}</a></p>
</section>

<section class="block block--night" aria-labelledby="h-map">
  <div class="wrap mapteaser">
    <div>
      <h2 class="block__title" id="h-map">${h.mapTitle}</h2>
      <p class="block__lead">${h.mapLead}</p>
      <ul class="mapteaser__counts" role="list">${perCountry.map((x) => html`<li><b>${x.n}</b> ${countryName(x.c, l)}</li>`)}</ul>
      <p><a class="btn btn--light" href="${paths.site("branches", l)}">${h.mapLink}${icons.arrow()}</a></p>
    </div>
    <img class="mapteaser__map" src="${a.mapPreview.url}" alt="${h.mapAlt}" width="${a.mapPreview.width}" height="${a.mapPreview.height}" loading="lazy" decoding="async">
  </div>
</section>

<section class="block wrap" aria-labelledby="h-gallery">
  <h2 class="block__title" id="h-gallery">${h.galleryTitle}</h2>
  <ul class="gallery" role="list">
    ${gallery.map(([key, file]) => html`<li>${pic(a.img[key], a.alt(file, l), "(min-width: 64rem) 25vw, 50vw")}</li>`)}
  </ul>
</section>

<section class="ctaband" aria-labelledby="h-cta">
  <div class="wrap ctaband__in">
    <h2 id="h-cta">${h.ctaTitle}</h2>
    <p>${h.ctaBody}</p>
    <p class="ctaband__btns">
      <a class="btn btn--ink btn--xl" href="${paths.site("franchising", l)}#basvuru">${h.ctaApply}${icons.arrow()}</a>
      <a class="btn btn--ghost btn--xl" href="${waHref(l)}" rel="noopener" target="_blank">${icons.whatsapp()}${h.ctaWa}</a>
    </p>
  </div>
</section>`;

  return renderSitePage({
    page: "home", locale: l, title: h.title, description: h.description, body, a,
    preloads: [{ as: "image", type: "image/avif", imagesrcset: a.video.poster.avif, imagesizes: "(min-width: 64rem) 520px, (min-width: 40rem) 60vw, 84vw", fetchpriority: "high" }],
    jsonLd: [organizationLd(l, a)],
  });
}

// ─── Franchising ────────────────────────────────────────────────────────────
const CC = [["TR", "+90"], ["AE", "+971"], ["KG", "+996"], ["AZ", "+994"], ["KZ", "+7"], ["UZ", "+998"], ["SA", "+966"], ["QA", "+974"], ["KW", "+965"], ["DE", "+49"], ["GB", "+44"]] as const;
const DEFAULT_CC: Record<Locale, string> = { tr: "+90", en: "+90", ar: "+971", ru: "+996" };

function applicationForm(l: Locale): Raw {
  const f = siteT(l).form;
  const req = html`<span class="req" aria-hidden="true">*</span><span class="sr-only"> (${f.required})</span>`;
  const err = (id: string, msg: string) => html`<p class="field__err" id="${id}-err" data-msg="${msg}" hidden></p>`;
  const radios = (name: string, legend: string, options: string[]) => html`<fieldset class="field field--radio">
    <legend>${legend}</legend>
    <div class="radios">${options.map((o, i) => html`<label class="radio"><input type="radio" name="${name}" value="${i}"${raw(i === options.length - 1 ? " checked" : "")}><span>${o}</span></label>`)}</div>
  </fieldset>`;
  // DEMO: gerçek gönderim YOK — client/site.ts doğrular ve başarı durumunu gösterir.
  // Canlıda: Cloudflare Worker → Resend ile e-posta bildirimi + Turnstile + hız sınırı + başvuruların panelde listelenmesi.
  return html`<form class="form" data-form>
    <div class="form__summary" role="alert" tabindex="-1" data-form-summary hidden><p>${f.errors.summary}</p><ul></ul></div>
    <fieldset class="form__grid">
      <legend class="sr-only">${f.legend}</legend>
      <div class="field">
        <label for="f-name">${f.name}${req}</label>
        <input id="f-name" name="name" autocomplete="name" required aria-describedby="f-name-err">
        ${err("f-name", f.errors.name)}
      </div>
      <div class="field">
        <label for="f-phone">${f.phone}${req}</label>
        <div class="phone">
          <select id="f-cc" name="cc" autocomplete="tel-country-code" aria-label="${f.countryCode}">
            ${CC.map(([c, code]) => html`<option value="${code}"${raw(code === DEFAULT_CC[l] ? " selected" : "")}>${c} ${code}</option>`)}
          </select>
          <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" required aria-describedby="f-phone-err" dir="ltr">
        </div>
        ${err("f-phone", f.errors.phone)}
      </div>
      <div class="field">
        <label for="f-email">${f.email}${req}</label>
        <input id="f-email" name="email" type="email" autocomplete="email" required aria-describedby="f-email-err" dir="ltr">
        ${err("f-email", f.errors.email)}
      </div>
      <div class="field">
        <label for="f-city">${f.city}${req}</label>
        <input id="f-city" name="city" autocomplete="address-level2" required aria-describedby="f-city-hint f-city-err">
        <p class="field__hint" id="f-city-hint">${f.cityHint}</p>
        ${err("f-city", f.errors.city)}
      </div>
      <div class="field">
        <label for="f-area">${f.area}</label>
        <input id="f-area" name="area" type="number" inputmode="numeric" min="40" step="1" aria-describedby="f-area-hint f-area-err" dir="ltr">
        <p class="field__hint" id="f-area-hint">${f.areaHint}</p>
        ${err("f-area", f.errors.area)}
      </div>
      <div class="field">
        <label for="f-budget">${f.budget}</label>
        <select id="f-budget" name="budget">${f.budgetOptions.map((o, i) => html`<option value="${i === 0 ? "" : String(i)}">${o}</option>`)}</select>
      </div>
      ${radios("brand", f.brand, f.brandOptions)}
      ${radios("property", f.property, f.propertyOptions)}
      <div class="field field--wide">
        <label for="f-note">${f.note} <span class="field__opt">(${f.optional})</span></label>
        <textarea id="f-note" name="note" rows="4" maxlength="1000"></textarea>
      </div>
      <div class="field field--wide field--check">
        <input id="f-consent" name="consent" type="checkbox" required aria-describedby="f-consent-err">
        <label for="f-consent">${f.consent}${req} <a href="${paths.site("privacy", l)}"${hasPage("privacy", l) ? "" : attrs({ hreflang: "en" })}>${f.consentLink}</a></label>
        ${err("f-consent", f.errors.consent)}
      </div>
    </fieldset>
    <p class="form__submit"><button class="btn btn--solid btn--xl" type="submit">${f.submit}${icons.arrow()}</button></p>
  </form>
  <div class="form__success" role="status" tabindex="-1" data-form-success data-body="${f.successBody}" hidden>
    <span class="form__success-icon">${icons.check()}</span>
    <h3>${f.successTitle}</h3>
    <p data-success-body></p>
    <a class="btn btn--solid" href="${waHref(l)}" rel="noopener" target="_blank">${icons.whatsapp()}${f.successWa}</a>
  </div>`;
}

export function renderFranchising(l: Locale, a: SiteAssets): string {
  const t = siteT(l), F = t.franchising;
  const jumps: [string, string][] = [["surec", F.jump.process], ["yatirim", F.jump.investment], ["sss", F.jump.faq], ["basvuru", F.jump.apply]];
  const body = html`
${pageHead(F.h1, F.lead, html`<nav class="jump" aria-label="${F.h1}"><ul role="list">${jumps.map(([id, label]) => html`<li><a href="#${id}">${label}</a></li>`)}</ul></nav>`)}

<section class="block wrap" id="surec" aria-labelledby="h-process">
  <h2 class="block__title" id="h-process">${F.processTitle}</h2>
  <ol class="timeline" role="list">
    ${t.process.map((s, i) => html`<li class="timeline__item"><span class="timeline__n" aria-hidden="true">${n2(i)}</span><div><h3>${s.title}</h3><p>${s.body}</p></div></li>`)}
  </ol>
</section>

<section class="block block--latte" id="yatirim" aria-labelledby="h-invest">
  <div class="wrap">
    <h2 class="block__title" id="h-invest">${F.investTitle}</h2>
    <p class="block__lead">${F.investLead}</p>
    <dl class="invest">
      ${F.invest.map((x) => html`<div class="invest__item"><dt>${x.k}</dt><dd><b>${x.v}</b>${x.note ? html`<span>${x.note}</span>` : ""}</dd></div>`)}
    </dl>
    <p class="note">${F.note}</p>
  </div>
</section>

<section class="block wrap" id="sss" aria-labelledby="h-faq">
  <h2 class="block__title" id="h-faq">${F.faqTitle}</h2>
  <div class="faq">
    ${F.faq.map((q) => html`<details class="faq__item"><summary>${q.q}${icons.chevronDown()}</summary><p>${q.a}</p></details>`)}
  </div>
</section>

<section class="block block--apply" id="basvuru" aria-labelledby="h-apply">
  <div class="wrap apply">
    <div class="apply__intro">
      <h2 class="block__title" id="h-apply">${F.applyTitle}</h2>
      <p class="block__lead">${F.applyLead}</p>
      <p class="apply__alt">
        <a class="btn btn--ghost" href="${waHref(l)}" rel="noopener" target="_blank">${icons.whatsapp()}${t.wa.label}</a>
        <a class="btn btn--ghost" href="${telHref(company.telefon)}">${icons.phone()}<bdi>${phoneIntl(company.telefon)}</bdi></a>
      </p>
    </div>
    <div class="apply__form">${applicationForm(l)}</div>
  </div>
</section>`;

  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: F.faq.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } })) };
  return renderSitePage({ page: "franchising", locale: l, title: F.title, description: F.description, body, a, jsonLd: [faqLd] });
}

// ─── Şubeler ────────────────────────────────────────────────────────────────
export interface MenuLink { slug: string; url: (l: Locale) => string }

export function renderBranches(l: Locale, a: SiteAssets, menus: MenuLink[]): string {
  const t = siteT(l), B = t.branches;
  const order = [...locations].sort((x, y) => (x.status === y.status ? COUNTRIES.indexOf(x.country) - COUNTRIES.indexOf(y.country) : x.status === "acik" ? -1 : 1));
  const menuUrl = (loc: NetworkLocation) => (loc.menu ? menus.find((m) => m.slug === loc.menu)?.url(l) ?? null : null);
  const norm = (s: string) => s.toLocaleLowerCase(l).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
  const mapData = order.map((loc) => ({
    id: loc.id, lat: loc.latlng[0], lng: loc.latlng[1], country: loc.country, brand: loc.brand, open: loc.status === "acik",
    name: loc.place[l], city: `${loc.city[l]} · ${countryName(loc.country, l)}`, brandName: BRAND_LABEL[loc.brand],
    menu: menuUrl(loc), directions: directionsUrl(loc),
  }));

  const body = html`
${pageHead(B.h1, fill(B.lead, { open: stats.open, countries: stats.countries, coming: stats.coming }), html`<p class="phead__note">${B.note}</p>`)}
<section class="wrap branches" data-branches>
  <div class="branches__tools">
    <div class="chips" role="group" aria-label="${B.filterLabel}">
      <button class="chip" type="button" aria-pressed="true" data-country="">${B.all} <span>${locations.length}</span></button>
      ${COUNTRIES.map((c) => html`<button class="chip" type="button" aria-pressed="false" data-country="${c}">${countryName(c, l)} <span>${locations.filter((x) => x.country === c).length}</span></button>`)}
    </div>
    <label class="search"><span class="sr-only">${B.search}</span>${icons.pin()}<input type="search" placeholder="${B.search}" data-search autocomplete="off"></label>
    <p class="branches__count" aria-live="polite" data-count data-tpl="${B.count}">${fill(B.count, { n: locations.length })}</p>
  </div>
  <div class="branches__grid">
    <div class="map" role="region" aria-label="${B.mapLabel}" data-map="region" data-js="${a.mapJs}" data-geo="${a.geo.region}" data-zoom-in="${B.zoomIn}" data-zoom-out="${B.zoomOut}" data-attribution="${B.mapAttribution}" dir="ltr">
      <p class="map__loading">${B.mapLoading}</p>
    </div>
    <ul class="locs" role="list" data-list>
      ${order.map((loc) => {
        const m = menuUrl(loc);
        return html`<li class="loc" data-id="${loc.id}" data-country="${loc.country}" data-search="${norm(`${loc.place[l]} ${loc.city[l]} ${loc.place.tr} ${loc.city.tr} ${countryName(loc.country, l)}`)}">
          <span class="loc__dot loc__dot--${loc.brand}${loc.status === "yakinda" ? " is-coming" : ""}" aria-hidden="true"></span>
          <div class="loc__main">
            <h2 class="loc__name"><bdi>${loc.place[l]}</bdi></h2>
            <p class="loc__meta">${loc.city[l]} · ${countryName(loc.country, l)} · ${BRAND_LABEL[loc.brand]}</p>
          </div>
          <span class="loc__tag${loc.status === "yakinda" ? " loc__tag--soon" : ""}">${loc.status === "acik" ? B.open : B.coming}</span>
          <p class="loc__actions">
            ${m ? html`<a class="loc__btn loc__btn--menu" href="${m}">${icons.qr()}${B.qrMenu}</a>` : ""}
            <a class="loc__btn" href="${directionsUrl(loc)}" rel="noopener" target="_blank">${icons.pin()}${B.directions}</a>
            <button class="loc__btn" type="button" data-focus="${loc.id}">${icons.map()}${B.showOnMap}</button>
          </p>
        </li>`;
      })}
    </ul>
    <p class="locs__empty" data-empty hidden>${B.empty}</p>
  </div>
</section>
${jsonScript("map-data", { mode: "region", points: mapData, labels: { open: B.open, coming: B.coming, menu: B.qrMenu, directions: B.directions } })}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: order.filter((x) => x.status === "acik").map((loc, i) => ({
      "@type": "ListItem", position: i + 1,
      item: {
        "@type": "CafeOrCoffeeShop",
        name: `${BRAND_LABEL[loc.brand]} ${loc.place.tr}`,
        brand: { "@type": "Brand", name: BRAND_LABEL[loc.brand] },
        address: { "@type": "PostalAddress", addressLocality: loc.city.tr, addressCountry: loc.country }, // TEYİT: sokak adresi yok
        geo: { "@type": "GeoCoordinates", latitude: loc.latlng[0], longitude: loc.latlng[1] }, // şehir merkezi
        ...(menuUrl(loc) ? { hasMenu: SITE + menuUrl(loc) } : {}),
      },
    })),
  };
  return renderSitePage({ page: "branches", locale: l, title: B.title, description: B.description, body, a, map: true, jsonLd: [ld] });
}

// ─── İletişim ───────────────────────────────────────────────────────────────
export function renderContact(l: Locale, a: SiteAssets): string {
  const t = siteT(l), C = t.contact;
  const card = (icon: Raw, title: string, value: Raw, action: Raw) => html`<article class="ccard">${icon}<h2>${title}</h2><p class="ccard__v">${value}</p><p>${action}</p></article>`;
  const body = html`
${pageHead(C.h1, C.lead)}
<section class="wrap contact">
  <div class="contact__cards">
    ${card(icons.pin(), C.office, html`${company.adres}`, html`<a class="link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.adres)}" rel="noopener" target="_blank">${C.directions}${icons.external()}</a>`)}
    ${card(icons.phone(), t.footer.phone, html`<bdi>${phoneIntl(company.telefon)}</bdi>`, html`<a class="link" href="${telHref(company.telefon)}">${C.call}${icons.arrow()}</a>`)}
    ${card(icons.whatsapp(), t.footer.whatsapp, html`<bdi>${phoneIntl(company.telefon)}</bdi>`, html`<a class="link" href="${waHref(l)}" rel="noopener" target="_blank">${C.write}${icons.arrow()}</a>`)}
    ${card(icons.mail(), t.footer.email, html`${company.eposta}`, html`<a class="link" href="${mailHref()}">${C.mail}${icons.arrow()}</a>`)}
    ${card(icons.globe(), t.footer.instagram, html`${instaHandle()}`, html`<a class="link" href="${company.instagram}" rel="noopener" target="_blank">${C.follow}${icons.external()}</a>`)}
  </div>
  <div class="map map--office" role="region" aria-label="${C.mapLabel}" data-map="office" data-js="${a.mapJs}" data-geo="${a.geo.marmara}" data-zoom-in="${t.branches.zoomIn}" data-zoom-out="${t.branches.zoomOut}" data-attribution="${t.branches.mapAttribution}" dir="ltr">
    <p class="map__loading">${t.branches.mapLoading}</p>
  </div>
  <aside class="contact__apply">
    <h2>${C.applyTitle}</h2>
    <p>${C.applyBody}</p>
    <a class="btn btn--solid" href="${paths.site("franchising", l)}#basvuru">${C.applyCta}${icons.arrow()}</a>
  </aside>
</section>
${jsonScript("map-data", { mode: "office", points: [{ id: "merkez", lat: company.konum[0], lng: company.konum[1], name: "Coffee House", city: company.adres, open: true, brand: "coffee-house", brandName: "Coffee House", menu: null, directions: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.adres)}` }], labels: { open: t.branches.open, coming: t.branches.coming, menu: t.branches.qrMenu, directions: C.directions } })}`;
  return renderSitePage({ page: "contact", locale: l, title: C.title, description: C.description, body, a, map: true, jsonLd: [organizationLd(l, a)] });
}

// ─── Markalarımız (TR/EN) ───────────────────────────────────────────────────
export function renderBrands(l: "tr" | "en", a: SiteAssets): string {
  const t = siteT(l), B = t.brands;
  const body = html`
${pageHead(B.h1, B.lead)}
<section class="wrap brand brand--ch" aria-labelledby="h-ch">
  <div class="brand__media">
    ${pic(a.img["neon-logo"], a.alt("neon-logo-kahvenin-evine-hosgeldiniz.jpg", l), "(min-width: 56rem) 40vw, 100vw")}
    ${pic(a.img["latte-neon"], a.alt("latte-fincan-neon-tabela.jpg", l), "(min-width: 56rem) 20vw, 50vw")}
  </div>
  <div class="brand__text">
    <img src="${a.logo}" alt="" width="96" height="96" loading="lazy">
    <h2 id="h-ch">Coffee House</h2>
    <p class="brand__slogan">${B.ch.slogan}</p>
    ${B.ch.body.map((p) => html`<p>${p}</p>`)}
    <ul class="brand__facts" role="list">${B.ch.facts.map((f) => html`<li>${icons.check()}${f}</li>`)}</ul>
  </div>
</section>
<section class="block--latte">
  <div class="wrap brand brand--ca" aria-labelledby="h-ca">
    <div class="brand__media brand__media--ca">${caMark()}</div>
    <div class="brand__text">
      <h2 id="h-ca">Coffee Art</h2>
      ${B.ca.body.map((p) => html`<p>${p}</p>`)}
      <p class="note">${B.ca.note}</p>
    </div>
  </div>
</section>`;
  return renderSitePage({ page: "brands", locale: l, title: B.title, description: B.description, body, a });
}

// ─── Referanslar (TR/EN) ────────────────────────────────────────────────────
export function renderReferences(l: "tr" | "en", a: SiteAssets): string {
  const t = siteT(l), R = t.references;
  const family = new Set(["Coffee House", "Coffee Art"]);
  const body = html`
${pageHead(R.h1, R.lead, html`<p class="phead__note">${fill(R.count, { n: references.length })} · <span class="refs__legend"><span class="refs__dot" aria-hidden="true"></span>${R.family}</span></p>`)}
<section class="wrap block">
  <ul class="refs" role="list">
    ${references.map((r) => html`<li class="ref${family.has(r.name) ? " ref--family" : ""}"><b>${r.name}</b><span>${r.place[l]}</span>${family.has(r.name) ? html`<span class="sr-only"> — ${R.family}</span>` : ""}</li>`)}
  </ul>
</section>`;
  return renderSitePage({ page: "references", locale: l, title: R.title, description: R.description, body, a });
}

// ─── Hakkımızda (TR/EN) ─────────────────────────────────────────────────────
export function renderAbout(l: "tr" | "en", a: SiteAssets): string {
  const t = siteT(l), A = t.about;
  const body = html`
${pageHead(A.h1, A.lead)}
<section class="wrap about">
  <div class="about__text">${A.body.map((p) => html`<p>${p}</p>`)}</div>
  <div class="about__media">
    ${pic(a.img["pop-art"], a.alt("ic-mekan-pop-art-duvar.jpg", l), "(min-width: 56rem) 22vw, 50vw")}
    ${pic(a.img["uc-fincan"], a.alt("espresso-telve-cekirdek-uc-fincan.jpg", l), "(min-width: 56rem) 22vw, 50vw")}
  </div>
</section>
<section class="wrap block">
  <ul class="cards cards--3" role="list">${A.principles.map((p, i) => html`<li class="card"><span class="card__n" aria-hidden="true">${n2(i)}</span><h3>${p.title}</h3><p>${p.body}</p></li>`)}</ul>
</section>`;
  return renderSitePage({ page: "about", locale: l, title: A.title, description: A.description, body, a });
}

// ─── Yasal (TR/EN) ──────────────────────────────────────────────────────────
export function renderLegal(kind: "privacy" | "cookies", l: "tr" | "en", a: SiteAssets): string {
  const t = siteT(l), G = t.legal, P = G[kind];
  const body = html`
${pageHead(P.h1, P.description, html`<p class="phead__note phead__note--warn">${G.draft}</p>`)}
<section class="wrap legal">
  ${P.sections.map((s) => html`<h2>${s.h}</h2><p>${s.p}</p>`)}
</section>`;
  return renderSitePage({ page: kind, locale: l, title: P.title, description: P.description, body, a });
}

