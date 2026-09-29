/** potrace paketi tip tanımı içermiyor — trace-logo.ts'in kullandığı kısım. */
declare module "potrace" {
  export class Potrace {
    setParameters(p: {
      threshold?: number; blackOnWhite?: boolean; turdSize?: number;
      optCurve?: boolean; optTolerance?: number; alphaMax?: number;
    }): void;
    loadImage(src: Buffer | string, cb: (err: Error | null) => void): void;
    getPathTag(fillColor?: string): string;
  }
}
