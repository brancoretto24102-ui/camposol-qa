import { randomUUID } from 'node:crypto';
import {EvidenceStore} from './evidence-store.mjs';
import {
  applyQACommand, digiProyConfig, digiProySource, newContent, validateMethodology,
  requireQA, text, object, identifier, documentProgress, invalidateContent,
} from '../src/qa-domain.ts';

const now=()=>new Date().toISOString();
const actions={init:'Inició la cartilla',save_context:'Guardó el contexto de la cartilla',save_selection:'Actualizó la selección de casos',save_case:'Guardó un caso',submit:'Envió contenido a revisión',approve:'Aprobó contenido',correct:'Solicitó una corrección',project_context_changed:'Cambió la información de la cartilla'};
const methodology=row=>row?{...row,config:JSON.parse(row.config)}:null;
const document=row=>row?{...row,content:JSON.parse(row.content)}:null;

export class QAStore {
  constructor(store){
    this.store=store;this.db=store.db;
    if(!this.db.prepare('PRAGMA table_info(applications)').all().some(c=>c.name==='version'))this.db.exec('ALTER TABLE applications ADD COLUMN version INTEGER NOT NULL DEFAULT 1');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS qa_methodology_versions(
        id TEXT PRIMARY KEY,application_id TEXT NOT NULL REFERENCES applications(id),methodology_key TEXT NOT NULL,
        name TEXT NOT NULL,version_label TEXT NOT NULL,source_reference TEXT NOT NULL,config TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('borrador','aprobado')),revision INTEGER NOT NULL DEFAULT 1,
        created_by TEXT REFERENCES users(id),approved_by TEXT REFERENCES users(id),approved_at TEXT,
        UNIQUE(application_id,methodology_key,version_label));
      CREATE TABLE IF NOT EXISTS qa_documents(
        project_id TEXT PRIMARY KEY REFERENCES projects(id),methodology_version_id TEXT NOT NULL REFERENCES qa_methodology_versions(id),
        version INTEGER NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS qa_document_revisions(
        project_id TEXT NOT NULL REFERENCES qa_documents(project_id),version INTEGER NOT NULL,
        action TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),actor_name TEXT NOT NULL,
        created_at TEXT NOT NULL,snapshot TEXT NOT NULL,PRIMARY KEY(project_id,version));
      CREATE INDEX IF NOT EXISTS qa_methodology_application_idx ON qa_methodology_versions(application_id);
    `);
    this.db.prepare(`INSERT OR IGNORE INTO qa_methodology_versions
      (id,application_id,methodology_key,name,version_label,source_reference,config,status,revision)
      VALUES(?,'digiproy','digiproy','DigiProy','1.0',?,?,'aprobado',1)`)
      .run(randomUUID(),digiProySource,JSON.stringify(digiProyConfig));
    this.evidence=new EvidenceStore(store);
  }
  applications(user){
    const u=this.store.requireUser(user),ids=new Set(this.store.listProjects(u).map(p=>p.application_id));
    return this.db.prepare('SELECT * FROM applications ORDER BY name').all()
      .filter(a=>a.active||u.role==='administrador'||ids.has(a.id)).map(a=>({...a,active:!!a.active}));
  }
  saveApplication(user,input){
    const u=this.store.admin(user),v=object(input),id=text(v.id,60,true),name=text(v.name,160,true);
    requireQA(/^[a-z][a-z0-9_-]{1,59}$/.test(id),'Usa un código de aplicación en minúsculas y sin espacios.');
    requireQA(typeof v.active==='boolean'&&Number.isInteger(v.version)&&Number(v.version)>=0,'Revisa el estado y la versión de la aplicación.');
    return this.store.transaction(()=>{
      const old=this.db.prepare('SELECT * FROM applications WHERE id=?').get(id);
      requireQA((old?.version??0)===v.version,'Otra persona actualizó esta aplicación. Recarga antes de guardar.',409);
      requireQA(!this.db.prepare('SELECT id FROM applications WHERE name=? AND id<>?').get(name,id),'Ya existe una aplicación con ese nombre.');
      if(old)this.db.prepare('UPDATE applications SET name=?,active=?,version=version+1 WHERE id=?').run(name,v.active?1:0,id);
      else this.db.prepare('INSERT INTO applications(id,name,active,version) VALUES(?,?,?,1)').run(id,name,v.active?1:0);
      this.store.audit(u,old?'Actualizó una aplicación':'Creó una aplicación',null,null,id);
      return {...this.db.prepare('SELECT * FROM applications WHERE id=?').get(id),active:v.active};
    });
  }
  methodologies(user){
    const u=this.store.requireUser(user);
    return this.db.prepare('SELECT * FROM qa_methodology_versions ORDER BY application_id,name,version_label,id').all()
      .filter(m=>m.status==='aprobado'||u.role==='administrador').map(methodology);
  }
  saveMethodology(user,input,id=null,revision=0){
    const u=this.store.admin(user),v=validateMethodology(input);
    requireQA(Number.isInteger(revision)&&revision>=0,'Falta la revisión de la metodología.');
    requireQA(this.db.prepare('SELECT id FROM applications WHERE id=?').get(v.application_id),'La aplicación no existe.');
    return this.store.transaction(()=>{
      const old=id?this.db.prepare('SELECT * FROM qa_methodology_versions WHERE id=?').get(identifier(id)):null;
      requireQA((old?.revision??0)===revision,'La metodología cambió. Recarga antes de guardar.',409);
      requireQA(!id||old,'La metodología no existe.',404);
      requireQA(!old||old.status==='borrador','Una metodología aprobada es inmutable. Crea otra versión.',409);
      requireQA(!old||(old.application_id===v.application_id&&old.methodology_key===v.methodology_key),'La identidad de una metodología no puede cambiar.');
      const key=id??randomUUID();
      requireQA(!this.db.prepare('SELECT id FROM qa_methodology_versions WHERE application_id=? AND methodology_key=? AND version_label=? AND id<>?').get(v.application_id,v.methodology_key,v.version_label,key),'Ese código y versión de metodología ya existen.');
      if(old)this.db.prepare('UPDATE qa_methodology_versions SET name=?,version_label=?,source_reference=?,config=?,revision=revision+1 WHERE id=?').run(v.name,v.version_label,v.source_reference,JSON.stringify(v.config),key);
      else this.db.prepare(`INSERT INTO qa_methodology_versions(id,application_id,methodology_key,name,version_label,source_reference,config,status,revision,created_by) VALUES(?,?,?,?,?,?,?,'borrador',1,?)`).run(key,v.application_id,v.methodology_key,v.name,v.version_label,v.source_reference,JSON.stringify(v.config),u.id);
      this.store.audit(u,'Guardó una metodología en borrador',key,null,`${v.name} ${v.version_label}`);
      return methodology(this.db.prepare('SELECT * FROM qa_methodology_versions WHERE id=?').get(key));
    });
  }
  approveMethodology(user,id,revision){
    const u=this.store.admin(user);
    return this.store.transaction(()=>{
      const m=this.db.prepare('SELECT * FROM qa_methodology_versions WHERE id=?').get(identifier(id));
      requireQA(m,'La metodología no existe.',404);requireQA(m.status==='borrador'&&m.revision===revision,'La versión cambió o ya está aprobada.',409);
      validateMethodology(methodology(m));
      this.db.prepare("UPDATE qa_methodology_versions SET status='aprobado',revision=revision+1,approved_by=?,approved_at=? WHERE id=?").run(u.id,now(),id);
      this.store.audit(u,'Aprobó una versión de metodología',id,null,`${m.name} ${m.version_label}`);
      return methodology(this.db.prepare('SELECT * FROM qa_methodology_versions WHERE id=?').get(id));
    });
  }
  actor(user,project){
    const u=this.store.requireUser(user),role=this.store.roleInProject(u,project);
    return {...u,active:!!u.active,can_self_approve:!!u.can_self_approve,can_edit:project.can_edit,
      can_review:u.role==='administrador'||(u.role==='revisor'&&role==='revisor')};
  }
  get(user,id){this.store.viewProject(user,id);return document(this.db.prepare('SELECT * FROM qa_documents WHERE project_id=?').get(id));}
  record(user,doc,action){
    const u=this.store.requireUser(user);
    this.db.prepare('INSERT INTO qa_document_revisions VALUES(?,?,?,?,?,?,?)').run(doc.project_id,doc.version,action,u.id,u.full_name,doc.updated_at,JSON.stringify(doc));
    this.store.audit(u,actions[action]??action,doc.project_id,doc.project_id,`Versión documental ${doc.version}`);
  }
  command(user,id,expected,command){
    requireQA(Number.isInteger(expected)&&expected>=0,'Falta la versión documental.');
    const cmd=object(command);requireQA(Buffer.byteLength(JSON.stringify(cmd))<=2_000_000,'La solicitud excede 2 MB.',413);
    return this.store.transaction(()=>{
      const p=this.store.viewProject(user,id),actor=this.actor(user,p);
      requireQA(p.status!=='archivado','Reabre el proyecto antes de modificar su cartilla.',409);
      const old=document(this.db.prepare('SELECT * FROM qa_documents WHERE project_id=?').get(id));
      requireQA((old?.version??0)===expected,'Otra persona actualizó la cartilla. Conserva tus textos y recarga antes de guardar.',409);
      let content,methodologyId;
      if(cmd.action==='init'){
        requireQA(actor.can_edit,'No tienes permiso para iniciar esta cartilla.',403);
        requireQA(!old,'La cartilla ya tiene una metodología vinculada.',409);
        const m=this.db.prepare("SELECT * FROM qa_methodology_versions WHERE id=? AND status='aprobado'").get(identifier(cmd.methodology_version_id));
        requireQA(m&&m.application_id===p.application_id,'Selecciona una metodología aprobada para esta aplicación.');
        methodologyId=m.id;content=newContent(p.description,actor);
      }else{
        requireQA(old,'Selecciona primero la metodología de la cartilla.');
        const m=methodology(this.db.prepare('SELECT * FROM qa_methodology_versions WHERE id=?').get(old.methodology_version_id));
        content=applyQACommand(old.content,cmd,m.config,actor,now());methodologyId=m.id;
      }
      requireQA(Buffer.byteLength(JSON.stringify(content))<=2_000_000,'La cartilla excede el límite técnico de 2 MB de texto.',413);
      const timestamp=now(),doc={project_id:id,methodology_version_id:methodologyId,version:expected+1,content,created_at:old?.created_at??timestamp,updated_at:timestamp};
      if(old)this.db.prepare('UPDATE qa_documents SET content=?,version=?,updated_at=? WHERE project_id=?').run(JSON.stringify(content),doc.version,timestamp,id);
      else this.db.prepare('INSERT INTO qa_documents VALUES(?,?,?,?,?,?)').run(id,methodologyId,doc.version,JSON.stringify(content),timestamp,timestamp);
      this.record(actor,doc,cmd.action);return doc;
    });
  }
  ensureProjectApplication(id,applicationId){
    const doc=this.db.prepare('SELECT project_id FROM qa_documents WHERE project_id=?').get(id);
    const p=this.db.prepare('SELECT application_id FROM projects WHERE id=?').get(id);
    requireQA(!doc||p.application_id===applicationId,'La cartilla tiene una metodología vinculada. Crea otro proyecto para otra aplicación.');
  }
  projectChanged(user,previous,input){
    if(!['code','name','objective','description'].some(k=>String(input[k]).trim()!==previous[k]))return;
    const doc=document(this.db.prepare('SELECT * FROM qa_documents WHERE project_id=?').get(previous.id));if(!doc)return;
    const p=this.store.viewProject(user,previous.id),actor=this.actor(user,p);
    doc.content=invalidateContent(doc.content,actor);doc.version++;doc.updated_at=now();
    this.db.prepare('UPDATE qa_documents SET content=?,version=?,updated_at=? WHERE project_id=?').run(JSON.stringify(doc.content),doc.version,doc.updated_at,previous.id);
    this.record(actor,doc,'project_context_changed');
  }
  progress(user){const ids=new Set(this.store.listProjects(user).map(p=>p.id));return this.db.prepare('SELECT * FROM qa_documents ORDER BY updated_at DESC').all().filter(d=>ids.has(d.project_id)).map(d=>documentProgress(document(d)));}
  history(user,id,offset=0){
    this.store.viewProject(user,id);requireQA(Number.isInteger(offset)&&offset>=0,'La página de historial no es válida.');
    return this.db.prepare('SELECT project_id,version,action,actor_id,actor_name,created_at FROM qa_document_revisions WHERE project_id=? ORDER BY version DESC LIMIT 20 OFFSET ?').all(id,offset);
  }
  revision(user,id,version){this.store.viewProject(user,id);requireQA(Number.isInteger(version)&&version>0,'La versión no es válida.');const r=this.db.prepare('SELECT snapshot FROM qa_document_revisions WHERE project_id=? AND version=?').get(id,version);requireQA(r,'La versión no está disponible.',404);return JSON.parse(r.snapshot);}
}
