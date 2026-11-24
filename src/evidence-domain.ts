import {requireQA,identifier,type CaseStep,type QAContent,type QADocument} from './qa-domain.ts';
export const EVIDENCE_MAX_BYTES=5*1024*1024,EXPORT_MAX_BYTES=50*1024*1024,EVIDENCE_PER_STEP=5;
export const EVIDENCE_BUCKET='qa-evidence',MATRIX_SHEET='Casos de Prueba',MATRIX_FIRST_ROW=3;
export interface CaptureInfo {mime_type:'image/png'|'image/jpeg';extension:'png'|'jpg';width:number;height:number;byte_size:number}
export interface Evidence extends CaptureInfo {
  id:string;project_id:string;case_id:string;step_id:string;object_path:string;
  filename:string;caption:string;sha256:string;created_at:string;created_by:string;
  step_snapshot:CaseStep;state:'pending'|'active'|'retired';
}
export interface EvidenceState {revision:number;items:Evidence[]}
export interface EvidenceInput extends CaptureInfo {filename:string;caption:string;sha256:string}
export interface ReferenceRow {
  case_id:string;step_id:string|null;excel_row:number;reference:string;
  requirement:string;item:string;name:string;description:string;priority:string;
  step:string;step_description:string;arguments:string;expected_result:string;comment:string;status:string;
}
export function referenceRows(content:QAContent):ReferenceRow[]{
  const rows:ReferenceRow[]=[];
  content.cases.filter(c=>c.included).forEach((c,i)=>{
    const steps:(CaseStep|null)[]=c.steps.length?c.steps:[null];
    steps.forEach((s,j)=>rows.push({
      case_id:c.id,step_id:s?.id??null,excel_row:MATRIX_FIRST_ROW+rows.length,
      reference:'Referencia '+String(rows.length+1).padStart(2,'0'),
      requirement:c.requirement,item:'CP'+String(i+1).padStart(2,'0'),name:c.name,description:c.description,
      priority:c.priority,step:s?String(j+1):'',step_description:s?.description??'',arguments:s?.arguments??'',
      expected_result:s?.expected_result??'',comment:c.comment,status:c.review.status,
    }));
  });return rows;
}
export function sameStep(a:CaseStep,b:CaseStep){return a.id===b.id&&a.description===b.description&&a.arguments===b.arguments&&a.expected_result===b.expected_result;}
export function stepInDocument(doc:QADocument,caseId:string,stepId:string):CaseStep{
  identifier(caseId);identifier(stepId);
  const step=doc.content.cases.find(c=>c.id===caseId&&c.included)?.steps.find(s=>s.id===stepId);
  requireQA(step,'Guarda el caso y el paso antes de adjuntar una captura.',409);return step;
}
export function evidenceIsCurrent(e:Evidence,doc:QADocument){
  const step=doc.content.cases.find(c=>c.id===e.case_id&&c.included)?.steps.find(s=>s.id===e.step_id);
  return !!step&&sameStep(e.step_snapshot,step);
}
function dimensions(width:number,height:number){
  requireQA(Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width<=20000&&height<=20000&&width*height<=24000000,'La imagen excede 24 megapíxeles o sus dimensiones no son válidas.');
}
export function captureInfo(bytes:Uint8Array):CaptureInfo{
  requireQA(bytes.length>0&&bytes.length<=EVIDENCE_MAX_BYTES,'Cada captura debe tener como máximo 5 MB.',413);
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length>=33&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)&&v.getUint32(8)===13&&String.fromCharCode(...bytes.slice(12,16))==='IHDR'){
    const width=v.getUint32(16),height=v.getUint32(20);dimensions(width,height);
    return {mime_type:'image/png',extension:'png',width,height,byte_size:bytes.length};
  }
  if(bytes.length>=12&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
    let p=2;
    while(p+4<=bytes.length){
      requireQA(bytes[p]===255,'El archivo JPEG no es válido.');
      while(bytes[p]===255)p++;
      const marker=bytes[p++];if(marker===217||marker===218)break;
      if(marker===216||marker===1||(marker>=208&&marker<=215))continue;
      if(p+2>bytes.length)break;
      const size=v.getUint16(p);requireQA(size>=2&&p+size<=bytes.length,'El archivo JPEG está incompleto.');
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
        requireQA(size>=8,'El archivo JPEG no es válido.');
        const height=v.getUint16(p+3),width=v.getUint16(p+5);dimensions(width,height);
        return {mime_type:'image/jpeg',extension:'jpg',width,height,byte_size:bytes.length};
      }p+=size;
    }
  }throw new Error('Adjunta una captura PNG o JPG válida. No se aceptan otros formatos.');
}
export async function sha256(bytes:Uint8Array){const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');}
export function validateEvidenceInput(v:EvidenceInput):EvidenceInput{
  requireQA(!!v&&typeof v==='object','Revisa los datos de la captura.');
  requireQA(typeof v.filename==='string'&&v.filename.trim().length>0&&v.filename.length<=200&&!/[\u0000-\u001f]/.test(v.filename),'Revisa el nombre de la captura.');
  requireQA(typeof v.caption==='string'&&v.caption.length<=2000,'La descripción de la captura excede 2.000 caracteres.');
  requireQA(typeof v.sha256==='string'&&/^[a-f0-9]{64}$/.test(v.sha256),'Falta la huella de la captura.');
  requireQA((v.mime_type==='image/png'&&v.extension==='png')||(v.mime_type==='image/jpeg'&&v.extension==='jpg'),'El formato de imagen no es válido.');
  requireQA(Number.isInteger(v.byte_size)&&v.byte_size>0&&v.byte_size<=EVIDENCE_MAX_BYTES,'La captura excede 5 MB.',413);
  dimensions(v.width,v.height);
  return {filename:v.filename.trim(),caption:v.caption.trim(),sha256:v.sha256,mime_type:v.mime_type,extension:v.extension,width:v.width,height:v.height,byte_size:v.byte_size};
}
export async function verifyCapture(bytes:Uint8Array,e:Pick<Evidence,'mime_type'|'width'|'height'|'byte_size'|'sha256'>){
  const actual=captureInfo(bytes);
  requireQA(actual.mime_type===e.mime_type&&actual.byte_size===e.byte_size&&actual.width===e.width&&actual.height===e.height&&await sha256(bytes)===e.sha256,'La captura cambió o está dañada. Vuelve a adjuntarla antes de exportar.',409);return actual;
}

