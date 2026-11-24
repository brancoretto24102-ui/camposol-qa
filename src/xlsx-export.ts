import type Excel from 'exceljs';
import type {Project} from './domain.ts';
import {reviewLabels,type MethodologyVersion,type QADocument} from './qa-domain.ts';
import {EXPORT_MAX_BYTES,MATRIX_SHEET,referenceRows,evidenceIsCurrent,verifyCapture,type Evidence,type EvidenceState} from './evidence-domain.ts';
export interface ExportInput {project:Project;document:QADocument;methodology:MethodologyVersion;evidence:EvidenceState;images:Map<string,Uint8Array>}
const quote=(sheet:string)=>"'"+sheet.replace(/'/g,"''")+"'";
function text(value:unknown){const s=String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'');if(s.length>32767)throw new Error('Un texto excede el límite de 32.767 caracteres por celda de Excel.');return s;}
const font={name:'Century Gothic',size:9,color:{argb:'FF172D1B'}};
const border:Partial<Excel.Borders>=Object.fromEntries(['top','left','right','bottom'].map(k=>[k,{style:'thin',color:{argb:'FFDDE5D8'}}]));
function style(cell:Excel.Cell,{header=false,link=false,title=false}={}){
  cell.font={...font,...(header?{bold:true,color:{argb:'FF134F1C'}}:{}),...(title?{bold:true,size:15}:{}),...(link?{bold:true,underline:true,color:{argb:'FF173F66'}}:{})};
  cell.alignment={wrapText:true,vertical:'middle',horizontal:header||link||title?'center':'left'};
  cell.border=border;
  if(header)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF92C16B'}};
}
function mergeValue(ws:Excel.Worksheet,range:string,value:unknown,title=false){ws.mergeCells(range);const cell=ws.getCell(range.split(':')[0]);cell.value=text(value);style(cell,{title});return cell;}
export function exportEvidence(doc:QADocument,state:EvidenceState):Evidence[]{
  const wanted=new Set(referenceRows(doc.content).filter(r=>r.step_id).map(r=>r.case_id+':'+r.step_id));
  if(state.items.some(e=>e.state==='pending'&&wanted.has(e.case_id+':'+e.step_id)))throw new Error('Hay cargas pendientes. Confírmalas o retíralas antes de exportar.');
  const selected=state.items.filter(e=>e.state==='active'&&wanted.has(e.case_id+':'+e.step_id));
  if(selected.some(e=>!evidenceIsCurrent(e,doc)))throw new Error('Hay capturas de una versión anterior de un paso. Retíralas o reemplázalas antes de exportar.');
  if(selected.reduce((n,e)=>n+e.byte_size,0)>EXPORT_MAX_BYTES)throw new Error('Las capturas exceden 50 MB. Reduce su tamaño antes de exportar.');
  return selected;
}
export async function buildQAXlsx({project,document:doc,methodology:method,evidence:state,images}:ExportInput):Promise<Uint8Array>{
  if(project.id!==doc.project_id||method.id!==doc.methodology_version_id)throw new Error('La cartilla no coincide con el proyecto o la metodología.');
  const rows=referenceRows(doc.content);if(!rows.length)throw new Error('Incluye al menos un caso antes de exportar.');
  const selected=exportEvidence(doc,state);
  for(const e of selected){if(e.project_id!==project.id)throw new Error('Una captura no pertenece a esta cartilla.');const bytes=images.get(e.id);if(!bytes)throw new Error('Falta una captura adjunta. La descarga se canceló para evitar un Excel incompleto.');await verifyCapture(bytes,e);}
  // Lazy loading keeps the Excel engine outside the login, chat and editing bundles.
  const {default:ExcelJS}=await import('exceljs'),book=new ExcelJS.Workbook();
  book.creator='Camposol QA';book.created=new Date(doc.updated_at);book.modified=new Date(doc.updated_at);
  const control=book.addWorksheet('Hoja de Control',{views:[{showGridLines:false}],pageSetup:{paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
  control.columns=Array.from({length:13},(_,i)=>({width:i===0||i===12?4:17}));
  mergeValue(control,'D2:L3','CAMPOSOL S.A. · PLAN DE PRUEBAS FUNCIONALES',true);
  mergeValue(control,'B5:L6',project.name,true);
  const fields=[['CÓDIGO',project.code],['OBJETIVO',project.objective],['METODOLOGÍA',method.name+' '+method.version_label],['VERSIÓN DOCUMENTAL',doc.version],['VERSIÓN DE EVIDENCIAS',state.revision],['CONTEXTO',reviewLabels[doc.content.context.review.status]],['SELECCIÓN',reviewLabels[doc.content.selection.status]],['CASOS APROBADOS',doc.content.cases.filter(c=>c.included&&c.review.status==='aprobado').length+' / '+doc.content.cases.filter(c=>c.included).length],['REFERENCIAS',doc.content.context.source_notes]];
  fields.forEach(([label,value],i)=>{mergeValue(control,'B'+(i+8)+':D'+(i+8),label);mergeValue(control,'E'+(i+8)+':L'+(i+8),value);control.getRow(i+8).height=i===1||i===8?65:30;});
  const matrix=book.addWorksheet(MATRIX_SHEET,{views:[{state:'frozen',ySplit:2,showGridLines:false}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
  matrix.columns=[27,13.625,36,48,11,8,62,50,65,26,49,8,8].map(width=>({width}));
  mergeValue(matrix,'A1:M1','CASOS DE PRUEBA · '+project.code+' · '+project.name,true);matrix.getRow(1).height=59;
  method.config.columns.forEach((column,i)=>{const c=matrix.getCell(2,i+1);c.value=column.label;style(c,{header:true});});matrix.mergeCells('K2:M2');matrix.getRow(2).height=30;
  for(const r of rows){
    const values=[r.requirement,r.item,r.name,r.description,r.priority,r.step,r.step_description,r.arguments,r.expected_result,r.reference,r.comment];
    values.forEach((v,i)=>{const c=matrix.getCell(r.excel_row,i+1);c.value=text(v);style(c);});
    matrix.mergeCells('K'+r.excel_row+':M'+r.excel_row);matrix.getRow(r.excel_row).height=110;
    const ref=matrix.getCell('J'+r.excel_row);ref.value={text:r.reference,hyperlink:'#'+quote(r.reference)+'!B4',tooltip:'Abrir capturas del paso'};style(ref,{link:true});
    const ws=book.addWorksheet(r.reference,{views:[{showGridLines:false}],pageSetup:{paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
    ws.columns=Array.from({length:22},(_,i)=>({width:i===0||i===21?4:12}));
    const back=mergeValue(ws,'B2:D2','Regresar');back.value={text:'Regresar',hyperlink:'#'+quote(MATRIX_SHEET)+'!J'+r.excel_row,tooltip:'Volver a la celda J'+r.excel_row};
    back.font={...font,bold:true,color:{argb:'FFFFFFFF'}};back.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF196B24'}};back.alignment={horizontal:'center',vertical:'middle'};ws.getRow(2).height=30;
    const summary=r.item+' · '+r.name+'\nPaso '+(r.step||'sin registrar')+': '+r.step_description+'\nResultado esperado: '+r.expected_result;
    const heading=mergeValue(ws,'B4:U7',summary);heading.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2F0D9'}};heading.font={...font,bold:true,size:12};for(let y=4;y<=7;y++)ws.getRow(y).height=40;
    mergeValue(ws,'B9:U9','Documento v'+doc.version+' · '+reviewLabels[r.status as keyof typeof reviewLabels]+' · '+r.reference);
    const shots=selected.filter(e=>e.case_id===r.case_id&&e.step_id===r.step_id);
    let y=10;
    if(!shots.length)mergeValue(ws,'B10:U12','Sin captura adjunta para este paso.');
    for(const e of shots){
      mergeValue(ws,'B'+y+':U'+y,e.filename+(e.caption?' · '+e.caption:''));ws.getRow(y).height=40;
      const scale=Math.min(1,1100/e.width,850/e.height),width=Math.round(e.width*scale),height=Math.round(e.height*scale);
      const bytes=images.get(e.id)!;
      const image=book.addImage({buffer:new Uint8Array(bytes).buffer as unknown as Excel.Buffer,extension:e.extension==='jpg'?'jpeg':'png'});
      ws.addImage(image,{tl:{col:1,row:y+1},ext:{width,height}});
      const reserved=Math.ceil(height/26)+2;for(let k=0;k<reserved;k++)ws.getRow(y+2+k).height=20;
      y+=reserved+3;
    }
  }
  matrix.autoFilter={from:'A2',to:'M'+rows.at(-1)!.excel_row};
  const output=await book.xlsx.writeBuffer();
  // ExcelJS 4.4 emits internal links as external relationships plus a location.
  // Write native OOXML locations, without relationships or a leading '#'.
  const {default:JSZip}=await import('jszip'),zip=await JSZip.loadAsync(new Uint8Array(output));
  const escape=(v:string)=>v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const links=[rows.map(r=>({ref:'J'+r.excel_row,location:quote(r.reference)+'!B4'})),...rows.map(r=>[{ref:'B2',location:quote(MATRIX_SHEET)+'!J'+r.excel_row}])];
  for(let i=0;i<links.length;i++){
    const n=i+2,path='xl/worksheets/sheet'+n+'.xml',rels='xl/worksheets/_rels/sheet'+n+'.xml.rels';
    const xml=await zip.file(path)!.async('string'),native='<hyperlinks>'+links[i].map(l=>'<hyperlink ref="'+l.ref+'" location="'+escape(l.location)+'"/>').join('')+'</hyperlinks>';
    zip.file(path,xml.replace(/<hyperlinks>[\s\S]*?<\/hyperlinks>/,native));
    const relationships=zip.file(rels);if(relationships)zip.file(rels,(await relationships.async('string')).replace(/<Relationship\b[^>]*\bType="[^"]*\/hyperlink"[^>]*\/>/g,''));
  }
  // editAs belongs to twoCellAnchor, not oneCellAnchor (OOXML 20.5.2.24).
  for(const [path,file] of Object.entries(zip.files))if(/^xl\/drawings\/drawing\d+\.xml$/.test(path))zip.file(path,(await file.async('string')).replace(/(<xdr:oneCellAnchor\b[^>]*?)\seditAs="[^"]*"/g,'$1'));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}

