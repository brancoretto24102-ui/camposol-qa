import {defaultAIPreferences,validateAIPreferences,validateAIGenerate,assertAITarget,parseAIResponse} from '../src/ai-domain.ts';
import {requireQA,identifier} from '../src/qa-domain.ts';
import {callAIProvider} from '../supabase/functions/_shared/ai-providers.ts';
import {validateChatInput,parseChatResult} from '../src/ai-chat-domain.ts';
import {callFreeChat,freeChatStatus,freeChatUnavailable} from '../supabase/functions/_shared/ai-free-chat.ts';

const freeConfig=()=>({key:process.env.GROQ_API_KEY??'',freePlanConfirmed:process.env.GROQ_FREE_PLAN_CONFIRMED==='true'});

export class AIStore {
  constructor(store){this.store=store;this.db=store.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS ai_provider_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id),provider TEXT NOT NULL,mode TEXT NOT NULL,model TEXT NOT NULL,version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ai_api_usage(user_id TEXT PRIMARY KEY REFERENCES users(id),minute_start INTEGER NOT NULL,minute_count INTEGER NOT NULL,day_start INTEGER NOT NULL,day_count INTEGER NOT NULL);`);
  }
  preferences(user){const u=this.store.requireUser(user),row=this.db.prepare('SELECT provider,mode,model,version FROM ai_provider_preferences WHERE user_id=?').get(u.id);return row??{...defaultAIPreferences};}
  savePreferences(user,value){const u=this.store.requireUser(user),input=validateAIPreferences(value);
    return this.store.transaction(()=>{const old=this.preferences(u);requireQA(input.version===old.version,'Tus preferencias cambiaron en otra ventana. Recárgalas antes de guardar.',409);
      this.db.prepare('INSERT INTO ai_provider_preferences VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider,mode=excluded.mode,model=excluded.model,version=excluded.version').run(u.id,input.provider,input.mode,input.model,input.version+1);return this.preferences(u);});
  }
  context(user,input){const u=this.store.requireUser(user),project=this.store.viewProject(u,identifier(input.project_id));
    requireQA(project.can_edit,'Tu rol permite consultar, pero no utilizar el asistente para elaborar contenido.',403);
    const document=this.store.qa.get(u,project.id);requireQA(document,'Inicia la cartilla antes de utilizar el asistente.');
    requireQA(document.version===input.version,'La cartilla cambió. Conserva tu propuesta y recarga antes de continuar.',409);
    const methodology=this.store.qa.methodologies(u).find(m=>m.id===document.methodology_version_id),context={project,document,methodology};assertAITarget(context,input);return context;
  }
  reserve(user){const u=this.store.requireUser(user);return this.store.transaction(()=>{
    const now=Date.now(),old=this.db.prepare('SELECT * FROM ai_api_usage WHERE user_id=?').get(u.id),minute=old&&now-old.minute_start<60_000,day=old&&now-old.day_start<86_400_000;
    requireQA((!minute||old.minute_count<4)&&(!day||old.day_count<20),'Límite de seguridad: 4 solicitudes por minuto y 20 por 24 horas por cuenta.',429);
    this.db.prepare('INSERT INTO ai_api_usage VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET minute_start=excluded.minute_start,minute_count=excluded.minute_count,day_start=excluded.day_start,day_count=excluded.day_count').run(u.id,minute?old.minute_start:now,minute?old.minute_count+1:1,day?old.day_start:now,day?old.day_count+1:1);});
  }
  async generate(user,value,fetcher){let input;
    try{input=validateAIGenerate(value);const context=this.context(user,input);this.reserve(user);const result=await callAIProvider(input,fetcher);
      try{parseAIResponse(result.text,context,input);}catch(error){result.validation_error=error.message;}return result;
    }finally{if(input)input.api_key='';if(value&&typeof value==='object')delete value.api_key;}
  }
  freeStatus(user,config=freeConfig()){this.store.requireUser(user);return freeChatStatus(config);}
  async chat(user,value,fetcher,config=freeConfig()){
    const input=validateChatInput(value),context=this.context(user,input);
    requireQA(freeChatStatus(config).enabled,freeChatUnavailable,503);this.reserve(user);
    return parseChatResult(await callFreeChat(input,config,fetcher),context,input);
  }
}
