declare module "subset-font" {
  /** harfbuzz tabanlı alt kümeleme; bağlamsal biçimler (GSUB) korunur. */
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: "woff2" | "woff" | "truetype" | "sfnt"; preserveNameIds?: number[] },
  ): Promise<Buffer>;
}
