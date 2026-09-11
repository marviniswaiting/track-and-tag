declare module 'bwip-js' {
  interface ToCanvasOptions {
    bcid: string;
    text: string;
    scale?: number;
    padding?: number;
    includetext?: boolean;
  }
  interface BwipJs {
    toCanvas(canvas: HTMLCanvasElement, options: ToCanvasOptions): HTMLCanvasElement;
  }
  const bwipjs: BwipJs;
  export default bwipjs;
}
