import { createElement as h, useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { createBackend, type Backend, type BackendInfo } from './backend.ts';
import { canCreate, initials, type Profile, type Project, type Application } from './domain.ts';
import { Alert, Brand, Button, Empty, Icon } from './ui.ts';
import { message, go } from './forms.ts';
import { Auth } from './features/auth.ts';
import { Dashboard, ProjectList, NewProject, ProjectDetail } from './features/projects.ts';
import { Administration, MyProfile } from './features/access.ts';
import {Applications,Methodologies} from './features/catalog.ts';
import {QAWorkspace} from './features/qa-workspace.ts';
import type {QAProgress} from './qa-domain.ts';
import './styles.css';
import './qa.css';
import './ai.css';
import {AISettings} from './features/ai.ts';
function App(){const [backend,setBackend]=useState<Backend|null>(null),[info,setInfo]=useState<BackendInfo|null>(null),[profile,setProfile]=useState<Profile|null>(null),[projects,setProjects]=useState<Project[]>([]),[apps,setApps]=useState<Application[]>([]),[progress,setProgress]=useState<QAProgress[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[menu,setMenu]=useState(false),[route,setRoute]=useState(window.location.hash.slice(1)||'inicio');
  useEffect(()=>{const f=()=>{setRoute(window.location.hash.slice(1)||'inicio');setMenu(false);window.scrollTo(0,0);};window.addEventListener('hashchange',f);return()=>window.removeEventListener('hashchange',f);},[]);
  async function refresh(b:Backend){const i=await b.info();setInfo(i);const p=await b.session();setProfile(p);if(p?.active){const [list,catalog,qa]=await Promise.all([b.projects(),b.applications(),b.qaProgress()]);const activity=new Map(qa.map(x=>[x.project_id,x.updated_at]));setProjects(list.map(p=>{const lastActivity=activity.get(p.id);return {...p,updated_at:lastActivity&&lastActivity>p.updated_at?lastActivity:p.updated_at};}).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)));setApps(catalog);setProgress(qa);}else{setProjects([]);setApps([]);setProgress([]);}}
  useEffect(()=>{let mounted=true;void createBackend().then(async b=>{if(!mounted)return;setBackend(b);await refresh(b);}).catch(e=>{if(mounted)setError(message(e));}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;};},[]);
  if(loading)return h('div',{className:'loading',role:'status'},h(Brand),h('p',null,'Preparando tu espacio de trabajo…'));
  if(!backend||!info)return h('div',{className:'loading'},h(Brand),h(Alert,{message:error||'No fue posible conectar con el backend.'}),h(Button,{onClick:()=>window.location.reload()},'Volver a intentar'));
  if(!profile||route.startsWith('restablecer'))return h(Auth,{backend,info,resetRoute:route,onReady:async()=>{setError('');await refresh(backend);go('inicio');}});
  if(!profile.active)return h('div',{className:'loading'},h(Brand),h('h1',null,'Tu cuenta está pendiente de activación'),h('p',null,'Un administrador debe habilitar tu acceso y asignarte un rol. Confirmar el correo no concede acceso a los proyectos.'),h('p',{className:'muted'},profile.email),h(Alert,{message:error}),h(Button,{onClick:()=>{void refresh(backend).catch(e=>setError(message(e)));}},'Comprobar activación'),h(Button,{variant:'ghost',onClick:()=>{void backend.logout().then(()=>setProfile(null)).catch(e=>setError(message(e)));}},'Cerrar sesión'));
  const nav=[{id:'inicio',name:'Inicio',icon:'home'},{id:'proyectos',name:'Mis proyectos',icon:'folder'},...(canCreate(profile)?[{id:'nuevo',name:'Nuevo proyecto',icon:'plus'}]:[]),{id:'aplicaciones',name:'Aplicaciones',icon:'folder'},{id:'metodologias',name:'Metodologías',icon:'file'},{id:'mi-ia',name:'Mi inteligencia artificial',icon:'file'},...(profile.role==='administrador'?[{id:'administracion',name:'Administración',icon:'users'}]:[])];
  let content:ReactNode;
  if(route==='inicio')content=h(Dashboard,{profile,projects,progress});
  else if(route==='proyectos')content=h(ProjectList,{profile,projects});
  else if(route==='nuevo')content=h(NewProject,{backend,profile,apps,onSaved:async(p:Project)=>{await refresh(backend);go(`cartilla/${p.id}`);}});
  else if(route.startsWith('proyecto/'))content=h(ProjectDetail,{key:route,backend,profile,apps,id:route.slice(9),onChanged:()=>refresh(backend)});
  else if(route.startsWith('cartilla/'))content=h(QAWorkspace,{key:route,backend,profile,id:route.slice(9),onChanged:()=>refresh(backend)});
  else if(route==='aplicaciones')content=h(Applications,{backend,profile,apps,onChanged:()=>refresh(backend)});
  else if(route==='metodologias'||route.startsWith('metodologias/'))content=h(Methodologies,{key:route,backend,profile,apps,applicationId:route.split('/')[1]});
  else if(route==='administracion'&&profile.role==='administrador')content=h(Administration,{backend,info,onRefresh:()=>refresh(backend)});
  else if(route==='mi-ia')content=h(AISettings,{backend});
  else if(route==='perfil')content=h(MyProfile,{backend,profile,onSaved:setProfile});
  else content=h(Empty,{title:'Esta sección no está disponible',text:'Selecciona una opción del menú para continuar.'},h(Button,{onClick:()=>go('inicio')},'Ir al inicio'));
  return h('div',{className:`app-shell ${menu?'menu-open':''}`},h('a',{className:'skip-link',href:'#main',onClick:(e:MouseEvent<HTMLAnchorElement>)=>{e.preventDefault();document.getElementById('main')?.focus();}},'Ir al contenido'),h('aside',{className:'sidebar'},h(Brand),h('div',{className:'workspace-label'},'ESPACIO DE TRABAJO'),h('nav',{'aria-label':'Menú principal'},...nav.map(n=>h('a',{key:n.id,href:`#${n.id}`,className:route===n.id||(n.id==='proyectos'&&(route.startsWith('proyecto/')||route.startsWith('cartilla/')))||(n.id==='metodologias'&&route.startsWith('metodologias/'))?'nav-link active':'nav-link'},h(Icon,{name:n.icon}),n.name))),h('div',{className:'sidebar-note'},h(Icon,{name:'shield',size:22}),h('strong',null,'Acceso por proyecto'),h('p',null,'Tu información se muestra según los permisos de tu cuenta.')),h('div',{className:'sidebar-bottom'},h('a',{href:'#perfil',className:route==='perfil'?'nav-link active':'nav-link'},h(Icon,{name:'user'}),'Mi perfil'),h('button',{className:'nav-link logout',onClick:async()=>{try{await backend.logout();setProfile(null);setProjects([]);go('inicio');}catch(e){setError(message(e));}}},h(Icon,{name:'logout'}),'Cerrar sesión'))),
    h('div',{className:'main-shell'},h('header',{className:'topbar'},h('div',{className:'topbar-left'},h(Button,{variant:'ghost',className:'menu-toggle','aria-label':menu?'Cerrar menú':'Abrir menú','aria-expanded':menu,onClick:()=>setMenu(!menu)},h(Icon,{name:'menu'})),h('span',null,'Gestión de pruebas'),h('span',{className:'topbar-divider'},'/'),h('strong',null,route.startsWith('cartilla/')?'Cartilla':route.startsWith('metodologias')?'Metodologías':route==='aplicaciones'?'Aplicaciones':route==='mi-ia'?'Mi inteligencia artificial':'Proyectos')),h('a',{href:'#perfil',className:'profile-link'},h('span',{className:'profile-name'},h('strong',null,profile.full_name),h('small',null,profile.role)),h('span',{className:'avatar'},initials(profile.full_name)))),
    h('div',{className:'environment'},h(Icon,{name:'shield',size:16}),info.mode==='local'?'Entorno local de prueba · Utiliza solo información ficticia.':'Entorno de desarrollo · Utiliza solo información ficticia.'),h('main',{className:'main-content',id:'main',tabIndex:-1},h(Alert,{message:error}),content),h('footer',{className:'footer'},h('span',null,'Camposol QA'),h('span',null,'Información organizada. Trabajo trazable.'))));
}
createRoot(document.getElementById('root')!).render(h(App));
