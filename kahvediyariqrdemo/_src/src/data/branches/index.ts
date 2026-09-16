import type { BranchBundle } from "../schema";
import { bundle as avm } from "./ornek-sube-avm";
import { bundle as cadde } from "./ornek-sube-cadde";
import { bundle as kampus } from "./ornek-sube-kampus";
import { bundle as yolUstu } from "./ornek-sube-yol-ustu";

/** Şube seçicideki sıra. Yeni şube: dosyayı ekle, buraya kaydet — rota build'de otomatik üretilir. */
export const branches: BranchBundle[] = [cadde, avm, kampus, yolUstu];
