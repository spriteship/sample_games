function clampUiValue(value){return Number.isFinite(value)?Math.max(0,Math.min(1,value)):0}
function resolveFillRect(fill,value=fill.value){const steps=Math.max(1,Math.floor(fill.segments));const normalized=clampUiValue(value);const amount=fill.mode==="stepped"?Math.floor(normalized*steps)/steps:normalized;const b=fill.bounds;if(fill.direction==="bottom-to-top")return{...b,y:b.y+b.height*(1-amount),height:b.height*amount};if(fill.direction==="right-to-left")return{...b,x:b.x+b.width*(1-amount),width:b.width*amount};return{...b,width:b.width*amount}}
function validUiInsets(insets,width,height){return Object.values(insets).every(n=>Number.isFinite(n)&&n>=0)&&insets.left+insets.right<width&&insets.top+insets.bottom<height}
function resolveNineSlice(sourceWidth,sourceHeight,width,height,insets){if(!validUiInsets(insets,sourceWidth,sourceHeight)||width<insets.left+insets.right||height<insets.top+insets.bottom)return[];const sx=[0,insets.left,sourceWidth-insets.right,sourceWidth];const sy=[0,insets.top,sourceHeight-insets.bottom,sourceHeight];const tx=[0,insets.left,width-insets.right,width];const ty=[0,insets.top,height-insets.bottom,height];return Array.from({length:9},(_,i)=>{const x=i%3,y=Math.floor(i/3);return{source:{x:sx[x],y:sy[y],width:sx[x+1]-sx[x],height:sy[y+1]-sy[y]},target:{x:tx[x],y:ty[y],width:tx[x+1]-tx[x],height:ty[y+1]-ty[y]}}})}
function resolvePanelContent(panel,width,height){return{x:panel.padding.left,y:panel.padding.top,width:Math.max(0,width-panel.padding.left-panel.padding.right),height:Math.max(0,height-panel.padding.top-panel.padding.bottom)}}
function resolveIndicatorGeometry(indicator,width,height,scale=1){const ground=indicator.attachment==="ground"&&indicator.camera!=="topdown_overhead";const bakedRatio=ground&&indicator.alreadyProjected?Math.max(.01,Math.min(1,indicator.verticalScale<1?indicator.verticalScale:height/width)):1;const projection=ground?indicator.alreadyProjected?bakedRatio:indicator.verticalScale:1;const radians=indicator.heading*Math.PI/180;const cos=Math.cos(radians),sin=Math.sin(radians);const a=scale*cos,b=scale*projection*sin;const c=-scale*sin/bakedRatio,d=scale*projection*cos/bakedRatio;const x=width*indicator.anchor.x,y=height*indicator.anchor.y;const radius=Math.hypot(Math.max(x,width-x),Math.max(y,height-y)/bakedRatio)*scale;const extentX=Math.ceil(radius)+1,extentY=Math.ceil(radius*projection)+1;return{matrix:[a,b,c,d,x-a*x-c*y,y-b*x-d*y],bounds:{x:x-extentX,y:y-extentY,width:extentX*2,height:extentY*2},anchor:{x:extentX,y:extentY}}}
function resolveIndicatorScale(width,radius){return 2*Math.max(0,Number.isFinite(radius)?radius:0)/Math.max(1,width)}
function resolvePanelTextBounds(panel,width,height,titleHeight){const content=resolvePanelContent(panel,width,height);if(panel.titleBounds)return{title:panel.titleBounds,body:content};const offset=titleHeight>0?titleHeight+8:0;return{title:{...content,height:Math.min(content.height,titleHeight)},body:{...content,y:content.y+offset,height:Math.max(0,content.height-offset)}}}
function resolveControlTextSize(config,font,textWidth){const control=config.control;if(!control||config.fitLabel===false)return{width:config.width,height:config.height};return{width:Math.min(4096,Math.ceil(Math.max(control.minimumWidth,control.padding.left+control.padding.right+textWidth+16))),height:Math.min(4096,Math.ceil(Math.max(control.minimumHeight,control.padding.top+control.padding.bottom+font.size*font.lineHeight+8)))}}
function resolvePanelActionBounds(bounds,panel,sourceWidth,sourceHeight,width,height){const x=resolveUiSliceCoordinate(bounds.x,sourceWidth,width,panel.slices.left,panel.slices.right);const y=resolveUiSliceCoordinate(bounds.y,sourceHeight,height,panel.slices.top,panel.slices.bottom);return{x,y,width:resolveUiSliceCoordinate(bounds.x+bounds.width,sourceWidth,width,panel.slices.left,panel.slices.right)-x,height:resolveUiSliceCoordinate(bounds.y+bounds.height,sourceHeight,height,panel.slices.top,panel.slices.bottom)-y}}
function resolveUiSliceCoordinate(v,source,target,first,last){return v<=first?v:v>=source-last?target-(source-v):first+(v-first)*(target-first-last)/(source-first-last)}
function resolveUiLayerArtifact(revision,config,artifactId){const artifact=revision.artifacts.find(entry=>entry.id===artifactId);if(revision.method!=="vector"||artifact?.role!=="frame"||artifact.mimeType!=="image/png"||config.fill||config.composition||config.states||config.layers.length>1)return artifact;return revision.artifacts.find(entry=>entry.role==="source"&&entry.mimeType==="image/svg+xml"&&entry.width===artifact.width&&entry.height===artifact.height)??artifact}
export { clampUiValue, resolveFillRect, resolveNineSlice, resolvePanelContent };
export async function loadUiPack(base = './') {
  const manifest = await (await fetch(base + 'ui-pack.json')).json();
  const images = new Map();
  for (const component of manifest.components) for (const artifact of component.activeRevision.artifacts) {
    if (!['image/png','image/svg+xml'].includes(artifact.mimeType)) continue;
    const image = new Image(); image.src = base + artifact.url;
    await image.decode(); images.set(artifact.id, image);
  }
  for (const font of manifest.fonts) {
    const face = new FontFace(font.family, 'url(' + JSON.stringify(base + font.url) + ')', {weight:String(font.weight)});
    await face.load(); document.fonts.add(face);
  }
  return {manifest, images};
}
function drawSliced(ctx, image, x, y, width, height, panel) {
  const regions = resolveNineSlice(image.width, image.height, width, height, panel.slices);
  if (!regions.length) throw new Error('Invalid panel slicing');
  for (const {source:s,target:t} of regions) {
    if (!s.width || !s.height || !t.width || !t.height) continue;
    if (panel.edgeMode === 'tile' && (s.width !== t.width || s.height !== t.height)) {
      ctx.save(); ctx.beginPath(); ctx.rect(x+t.x,y+t.y,t.width,t.height); ctx.clip();
      for(let ty=0;ty<t.height;ty+=s.height) for(let tx=0;tx<t.width;tx+=s.width)
        ctx.drawImage(image,s.x,s.y,s.width,s.height,x+t.x+tx,y+t.y+ty,s.width,s.height);
      ctx.restore();
    } else ctx.drawImage(image,s.x,s.y,s.width,s.height,x+t.x,y+t.y,t.width,t.height);
  }
}
function textLines(ctx, content, width, font) {
  ctx.font=font.weight+' '+font.size+'px '+JSON.stringify(font.family);
  const lines=[];
  for(const paragraph of String(content).split('\n')) {
    let line='';
    for (const word of paragraph.match(/\S+\s*|\s+/g) || []) {
      if(line && ctx.measureText(line+word.trimEnd()).width>width) {lines.push(line.trimEnd());line='';}
      for(const char of word) {
        if(line && ctx.measureText(line+char).width>width) {lines.push(line);line='';}
        line+=char;
      }
    }
    lines.push(line);
  }
  return lines;
}
function drawText(ctx, content, bounds, font, scrollY=0) {
  ctx.save(); ctx.beginPath(); ctx.rect(bounds.x,bounds.y,bounds.width,bounds.height); ctx.clip();
  ctx.fillStyle=font.color; ctx.textBaseline='top';
  const lines=textLines(ctx,content,bounds.width,font), lh=font.size*font.lineHeight;
  lines.forEach((line,index)=>ctx.fillText(line,bounds.x,bounds.y-scrollY+index*lh));
  ctx.restore(); return lines.length*lh;
}
function drawControlLabel(ctx, label, bounds, font) {
  ctx.fillStyle=font.color;ctx.font=font.weight+' '+font.size+'px '+JSON.stringify(font.family);
  if(ctx.measureText(label).width>bounds.width) {
    const letters=Array.from(label);
    while(letters.length && ctx.measureText(letters.join('')+'…').width>bounds.width) letters.pop();
    label=letters.join('')+'…';
  }
  ctx.save();ctx.beginPath();ctx.rect(bounds.x,bounds.y,bounds.width,bounds.height);ctx.clip();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,bounds.x+bounds.width/2,bounds.y+bounds.height/2);ctx.restore();
}
export function renderUiComponent(canvas, component, images, values={}) {
  const revision=component.activeRevision, c=revision.configuration;
  const capability=name=>revision.validation.capabilities[name]?.passed===true;
  const panel=capability('text') ? c.panel : undefined;
  const control=capability('resize') ? c.control : undefined;
  const resize=panel || control;
  const canResize=capability('resize') && resize;
  const labelFont={...(c.labelFont || revision.styleGuide.bodyFont)};
  if(values.labelFontSize!==undefined) labelFont.size=Math.min(96,Math.max(8,values.labelFontSize));
  let width=Math.min(4096,Math.max(canResize ? resize.minimumWidth:1, canResize ? values.width || c.width:c.width));
  let height=Math.min(4096,Math.max(canResize ? resize.minimumHeight:1, canResize ? values.height || c.height:c.height));
  if(control && c.fitLabel!==false) {
    const measure=canvas.getContext('2d'); measure.font=labelFont.weight+' '+labelFont.size+'px '+JSON.stringify(labelFont.family);
    ({width,height}=resolveControlTextSize(c,labelFont,measure.measureText(values.label ?? c.label ?? '').width));
  }
  const indicator=c.indicator && capability('projection') ? c.indicator : undefined;
  const geometry=indicator ? resolveIndicatorGeometry({...indicator,heading:values.heading ?? indicator.heading},width,height,resolveIndicatorScale(width,values.radius ?? indicator.radius)) : undefined;
  const renderScale=geometry ? Math.min(1,4096/geometry.bounds.width,4096/geometry.bounds.height) : 1;
  canvas.width=Math.ceil((geometry?.bounds.width ?? width)*renderScale); canvas.height=Math.ceil((geometry?.bounds.height ?? height)*renderScale);
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  if(geometry) {ctx.scale(renderScale,renderScale);ctx.translate(-geometry.bounds.x,-geometry.bounds.y);ctx.transform(...geometry.matrix);}
  const artifacts=new Map(revision.artifacts.map(a=>[a.id,a]));
  const imageFor=id=>images.get(resolveUiLayerArtifact(revision,c,id)?.id ?? id);
  const selected=c.states?.[values.state || c.selectedState];
  const primary=revision.artifacts.find(a=>a.mimeType==='image/png' && a.role==='preview')
    || revision.artifacts.find(a=>a.mimeType==='image/png' && a.role==='frame')
    || revision.artifacts.find(a=>a.mimeType==='image/png' && a.role!=='raw' && a.role!=='mask' && a.role!=='fill');
  const layers=selected ? [{artifactId:selected,bounds:{x:0,y:0,width:c.width,height:c.height}}]
    : c.layers.length ? c.layers : primary ? [{artifactId:primary.id,bounds:{x:0,y:0,width:c.width,height:c.height}}] : [];
  function drawLayer(layer) {
    const artifact=artifacts.get(layer.artifactId); if(!artifact || artifact.role==='mask' || artifact.role==='fill') return;
    const image=imageFor(layer.artifactId); if(!image) return;
    ctx.globalAlpha=layer.opacity ?? 1;
    if(canResize && (control || (layer.bounds.x===0 && layer.bounds.y===0 && layer.bounds.width===artifact.width && layer.bounds.height===artifact.height)))
      drawSliced(ctx,image,0,0,width,height,resize);
    else ctx.drawImage(image,layer.bounds.x,layer.bounds.y,layer.bounds.width,layer.bounds.height);
  }
  for(const layer of layers) if(layer.placement==='background') drawLayer(layer);
  ctx.globalAlpha=1;
  if(c.fill && capability('fill')) {
    const fill=document.createElement('canvas'); fill.width=width; fill.height=height;
    const f=fill.getContext('2d'), rect=resolveFillRect(c.fill, values.value ?? c.fill.value);
    f.fillStyle=c.fill.color; f.fillRect(rect.x,rect.y,rect.width,rect.height);
    if(c.fill.maskArtifactId) {
      const mask=imageFor(c.fill.maskArtifactId); if(!mask) throw new Error('Missing fill mask');
      f.globalCompositeOperation='destination-in'; f.drawImage(mask,0,0,c.width,c.height);
    }
    ctx.drawImage(fill,0,0);
  }
  ctx.save();
  for(const layer of layers) if(layer.placement!=='background') drawLayer(layer);
  ctx.restore(); ctx.globalAlpha=1;
  let textHeight=0;
  if(panel) {
    const title=values.title ?? panel.title, content=resolvePanelContent(panel,width,height);
    const titleHeight=title ? textLines(ctx,title,panel.titleBounds?.width ?? content.width,panel.headingFont).length*panel.headingFont.size*panel.headingFont.lineHeight : 0;
    const bounds=resolvePanelTextBounds(panel,width,height,titleHeight);
    const scroll=panel.overflow==='scroll' ? Math.max(0,values.scrollY || 0):0;
    if(panel.titleBounds) {
      if(title) drawText(ctx,title,bounds.title,panel.headingFont);
      textHeight=drawText(ctx,values.content ?? panel.content,bounds.body,panel.bodyFont,scroll);
    } else {
      const bodyHeight=textLines(ctx,values.content ?? panel.content,bounds.body.width,panel.bodyFont).length*panel.bodyFont.size*panel.bodyFont.lineHeight;
      ctx.save();ctx.beginPath();ctx.rect(content.x,content.y,content.width,content.height);ctx.clip();
      if(title) drawText(ctx,title,{...bounds.title,y:bounds.title.y-scroll,height:titleHeight},panel.headingFont);
      drawText(ctx,values.content ?? panel.content,{...bounds.body,y:bounds.body.y-scroll,height:bodyHeight},panel.bodyFont);
      ctx.restore();textHeight=bodyHeight+(title ? titleHeight+8:0);
    }
  } else if(typeof c.label==='string' && (capability('text') || c.states)) {
    const font=labelFont, padding=c.control?.padding || {left:8,right:8,top:4,bottom:4};
    drawControlLabel(ctx,values.label ?? c.label,{x:padding.left,y:padding.top,width:Math.max(1,width-padding.left-padding.right),height:Math.max(1,height-padding.top-padding.bottom)},font);
  }
  if(panel?.actionButtons) {
    const source=revision.artifacts.find(a=>a.role==='frame');
    panel.actionButtons.forEach((action,index)=>{
      const bounds=canResize && source ? resolvePanelActionBounds(action.bounds,panel,source.width,source.height,width,height) : action.bounds;
      drawControlLabel(ctx,values.actionLabels?.[index] ?? action.label,bounds,panel.bodyFont);
    });
  }
  return {width:canvas.width,height:canvas.height,anchor:geometry?{x:geometry.anchor.x*renderScale,y:geometry.anchor.y*renderScale}:undefined,value:c.fill?clampUiValue(values.value ?? c.fill.value):undefined,textHeight};
}
