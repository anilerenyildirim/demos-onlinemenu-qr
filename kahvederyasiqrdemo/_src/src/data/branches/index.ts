import type { BranchBundle } from "../schema";
import { bundle as manavgat } from "./antalya-manavgat";
import { bundle as nazilli } from "./aydin-nazilli";
import { bundle as balikesir } from "./balikesir-merkez";
import { bundle as batman } from "./batman";
import { bundle as tatvan } from "./bitlis-tatvan";
import { bundle as buyukcekmece } from "./istanbul-buyukcekmece";

/**
 * Şube seçicideki sıra; ilki giriş sayfasının varsayılan şubesidir.
 * Yeni şube: dosyayı ekle, buraya kaydet — rotası build'de otomatik üretilir.
 */
export const branches: BranchBundle[] = [buyukcekmece, balikesir, nazilli, manavgat, tatvan, batman];
