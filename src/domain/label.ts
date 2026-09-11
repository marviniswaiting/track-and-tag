import JsBarcode from 'jsbarcode';
import bwipjs from 'bwip-js';
import type { LabelElement, Settings } from './types';
const fill = (content: string, location: string, item: string, weight: string) => content.replaceAll('{location}',location).replaceAll('{item}',item).replaceAll('{weight}',weight);
export function renderLabel(canvas: HTMLCanvasElement, settings: Settings, data: {location:string;item:string;weight:number}): CanvasRenderingContext2D {
  canvas.width=96; canvas.height=240; const ctx=canvas.getContext('2d',{willReadFrequently:true}); if(!ctx) throw new Error('Canvas rendering is unavailable.');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,96,240);
  for(const element of settings.template) drawElement(ctx, element, fill(element.content,data.location,data.item,data.weight.toFixed(settings.decimalPlaces)));
  return ctx;
}
function drawElement(ctx: CanvasRenderingContext2D, e: LabelElement, content: string): void {
  ctx.save(); ctx.translate(e.x,e.y); ctx.rotate((e.rot ?? 0)*Math.PI/180);
  try {
    if(e.type==='text'){ ctx.fillStyle='#000';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${e.size ?? 18}px sans-serif`;ctx.fillText(content,0,0);return; }
    if(!content)return; const temp=document.createElement('canvas');
    if(e.type==='barcode') JsBarcode(temp,content,{format:e.format ?? 'CODE128',displayValue:e.showText ?? false,margin:0,height:e.height ?? 40,width:e.width ?? 2});
    else bwipjs.toCanvas(temp,{bcid:e.type==='qrcode'?'qrcode':'datamatrix',text:content,scale:e.scale ?? 2,padding:e.padding ?? 0,includetext:false});
    ctx.drawImage(temp,-temp.width/2,-temp.height/2);
  } catch(error){ throw new Error(`Cannot render ${e.type}: ${error instanceof Error ? error.message : 'invalid content'}`,{cause:error}); } finally { ctx.restore(); }
}
export function canvasToRaster(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Uint8Array {
  const bytesPerRow=Math.ceil(canvas.width/8), pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data, raster=new Uint8Array(bytesPerRow*canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const p=(y*canvas.width+x)*4; const brightness=((pixels[p] ?? 255)+(pixels[p+1] ?? 255)+(pixels[p+2] ?? 255))/3;if(brightness<128)raster[y*bytesPerRow+Math.floor(x/8)]!|=1<<(7-x%8);}
  const out=new Uint8Array(8+raster.length);out.set([0x1d,0x76,0x30,0,bytesPerRow&255,bytesPerRow>>8,canvas.height&255,canvas.height>>8]);out.set(raster,8);return out;
}
