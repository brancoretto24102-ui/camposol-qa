import {randomUUID} from 'node:crypto';
import {identifier,requireQA} from '../src/qa-domain.ts';
import {validateEvidenceInput,verifyCapture,stepInDocument,EVIDENCE_PER_STEP,EXPORT_MAX_BYTES} from '../src/evidence-domain.ts';
const fields='id,project_id,case_id,step_id,object_path,filename,caption,mime_type,extension,byte_size,width,height,sha256,step_snapshot,state,created_by,created_at';
const map=row=>({...row,step_snapshot:JSON.parse(row.step_snapshot)});
export class EvidenceStore {
  constructor(store){
    this.store=store;this.db=store.db;
    this.db.exec('CREATE TABLE IF NOT EXISTS qa_evidence_sets(project_id TEXT PRIMARY KEY REFERENCES projects(id),revision INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS qa_evidence(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),case_id TEXT NOT NULL,step_id TEXT NOT NULL,object_path TEXT NOT NULL UNIQUE,filename TEXT NOT NULL,caption TEXT NOT NULL,mime_type TEXT NOT NULL,extension TEXT NOT NULL,byte_size INTEGER NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,sha256 TEXT NOT NULL,step_snapshot TEXT NOT NULL,state TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,retired_at TEXT,bytes BLOB NOT NULL); CREATE INDEX IF NOT EXISTS qa_evidence_step_idx ON qa_evidence(project_id,case_id,step_id,state)');
  }
  manifest(user,id){this.store.viewProject(user,identifier(id));return {revision:this.db.prepare('SELECT revision FROM qa_evidence_sets WHERE project_id=?').get(id)?.revision??0,items:this.db.prepare('SELECT '+fields+' FROM qa_evidence WHERE project_id=? AND state=? ORDER BY created_at,id').all(id,'active').map(map)};}
  editable(user,id,version){
    const p=this.store.viewProject(user,id),actor=this.store.qa.actor(user,p);requireQA(actor.can_edit,'No tienes permiso para adjuntar capturas.',403);
    requireQA(p.status!=='archivado','Reabre el proyecto antes de modificar las capturas.',409);
    const doc=this.store.qa.get(user,id);requireQA(doc&&Number.isInteger(version)&&doc.version===version,'La cartilla cambió. Recarga antes de adjuntar o retirar capturas.',409);return {doc,actor};
  }
  async attach(user,id,version,caseId,stepId,value,bytes){
    identifier(id);const input=validateEvidenceInput(value);await verifyCapture(bytes,input);
    return this.store.transaction(()=>{
      const {doc,actor}=this.editable(user,id,version),step=stepInDocument(doc,caseId,stepId);
      requireQA(this.db.prepare("SELECT count(*) AS n FROM qa_evidence WHERE project_id=? AND case_id=? AND step_id=? AND state='active'").get(id,caseId,stepId).n<EVIDENCE_PER_STEP,'Este paso ya tiene cinco capturas. Retira una antes de adjuntar otra.');
      requireQA(this.db.prepare("SELECT coalesce(sum(byte_size),0) AS n FROM qa_evidence WHERE project_id=? AND state='active'").get(id).n+bytes.length<=EXPORT_MAX_BYTES,'Las capturas de la cartilla exceden 50 MB.',413);
      const key=randomUUID(),date=new Date().toISOString(),path=id+'/'+caseId+'/'+stepId+'/'+key+'.'+input.extension;
      this.db.prepare('INSERT INTO qa_evidence(id,project_id,case_id,step_id,object_path,filename,caption,mime_type,extension,byte_size,width,height,sha256,step_snapshot,state,created_by,created_at,bytes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(key,id,caseId,stepId,path,input.filename,input.caption,input.mime_type,input.extension,input.byte_size,input.width,input.height,input.sha256,JSON.stringify(step),'active',actor.id,date,bytes);
      this.db.prepare('INSERT INTO qa_evidence_sets(project_id,revision) VALUES(?,1) ON CONFLICT(project_id) DO UPDATE SET revision=revision+1').run(id);
      this.store.audit(actor,'Adjuntó una captura de un paso',key,id,'Documento v'+version);
      return map(this.db.prepare('SELECT '+fields+' FROM qa_evidence WHERE id=?').get(key));
    });
  }
  find(user,id){const e=this.db.prepare('SELECT '+fields+' FROM qa_evidence WHERE id=?').get(identifier(id));requireQA(e,'La captura no está disponible.',404);this.store.viewProject(user,e.project_id);return map(e);}
  finish(user,id,version){const e=this.find(user,id);this.editable(user,e.project_id,version);requireQA(e.state==='active','La captura ya fue retirada.',409);return e;}
  retire(user,id,version){return this.store.transaction(()=>{
    const e=this.find(user,id),{actor}=this.editable(user,e.project_id,version);if(e.state==='retired')return;
    this.db.prepare("UPDATE qa_evidence SET state='retired',retired_at=? WHERE id=?").run(new Date().toISOString(),id);
    this.db.prepare('UPDATE qa_evidence_sets SET revision=revision+1 WHERE project_id=?').run(e.project_id);
    this.store.audit(actor,'Retiró una captura de la exportación',id,e.project_id,'Archivo conservado; documento v'+version);
  });}
  bytes(user,id){this.find(user,id);return new Uint8Array(this.db.prepare('SELECT bytes FROM qa_evidence WHERE id=?').get(id).bytes);}
}

