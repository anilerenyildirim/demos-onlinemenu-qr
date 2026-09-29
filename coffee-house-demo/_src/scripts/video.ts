/**
 * TEK SEFERLİK: markanın 2 dk'lık dikey tanıtım videosundan (1080×1920, 60 fps, 103 MB) site hero'su için
 * ~10 sn'lik sessiz döngü üretir. Hero'da video konuşma balonu biçimli dairesel pencerede oynar → kare kırpılır.
 *
 *   ../video/hero-720.mp4   H.264 (High), 720×720, 30 fps, sessiz, faststart
 *   ../video/hero-720.webm  VP9, aynı içerik
 *   ../_ref/hero-poster.jpg döngünün ilk karesi (build AVIF/WebP'ye çevirir) — poster → video geçişinde sıçrama olmaz
 *
 * Kesitler sahne geçişlerinin içinden seçildi (ffmpeg scene > 0.25 ile ölçüldü); sıra hikâye kurar:
 * takeaway bardağa French press → tamper → espresso akışı → süt → latte art → fincana espresso → frappe.
 * build bu klasöre dokunmaz. Çalıştırma: npm run video   (ffmpeg PATH'te olmalı)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IN = path.resolve(SRC, "../_ref/video/tanitim-orijinal.mp4");
const OUT = path.resolve(SRC, "../video");
const POSTER = path.resolve(SRC, "../_ref/hero-poster.jpg");

/** [başlangıç, bitiş] saniye — her biri tek sahne içinde */
const CLIPS: [number, number][] = [
  [21.10, 23.15], // French press, logolu takeaway bardağa
  [91.72, 93.00], // tamper
  [94.66, 96.30], // espresso akışı (shot bardağına)
  [12.20, 13.20], // süt dökümü
  [15.90, 16.90], // latte art (üstten)
  [41.36, 42.94], // fincana espresso (logolu önlük)
  [110.45, 112.25], // krem şantili çilekli frappe
];
const SIZE = 720;
/** Dikey karenin ortası: 1080×1920 → y = (1920 − 1080) / 2 */
const CROP = `crop=1080:1080:0:420,scale=${SIZE}:${SIZE}:flags=lanczos,fps=30`;

mkdirSync(OUT, { recursive: true });
const graph =
  CLIPS.map(([a, b], i) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS,${CROP}[v${i}]`).join(";") +
  ";" + CLIPS.map((_, i) => `[v${i}]`).join("") + `concat=n=${CLIPS.length}:v=1:a=0,format=yuv420p[out]`;

const run = (args: string[]) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const mb = (f: string) => `${(statSync(f).size / 1048576).toFixed(2)} MB`;

const mp4 = path.join(OUT, `hero-${SIZE}.mp4`);
run(["-i", IN, "-filter_complex", graph, "-map", "[out]", "-an",
  "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
console.log(`mp4: ${mb(mp4)}`);

const webm = path.join(OUT, `hero-${SIZE}.webm`);
run(["-i", IN, "-filter_complex", graph, "-map", "[out]", "-an",
  "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", webm]);
console.log(`webm: ${mb(webm)}`);

run(["-ss", String(CLIPS[0][0] + 0.02), "-i", IN, "-frames:v", "1", "-vf", CROP.replace(",fps=30", ""), "-q:v", "2", POSTER]);
console.log(`poster: ${mb(POSTER)}`);

const total = CLIPS.reduce((s, [a, b]) => s + (b - a), 0);
console.log(`süre: ${total.toFixed(2)} sn, ${CLIPS.length} kesit`);
