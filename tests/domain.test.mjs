import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canCreate, validateProject, summarize, initials } from '../src/domain.ts';
const valid={application_id:'digiproy',code:'FICTICIO-01',name:'Cartilla de prueba',objective:'Verificar el alta ficticia',description:'',status:'borrador'};
test('proyecto válido y campos requeridos',()=>{assert.equal(validateProject(valid),null);for(const field of ['name','code','objective','application_id'])assert.ok(validateProject({...valid,[field]:''}));});
test('no admite estados documentales aprobados antes de implementar aprobaciones',()=>assert.ok(validateProject({...valid,status:'aprobado'})));
test('solo administradores y editores activos crean proyectos',()=>{for(const role of ['administrador','editor','revisor','lector'])for(const active of [true,false])assert.equal(canCreate({role,active}),active&&['administrador','editor'].includes(role));});
test('los indicadores se calculan de registros presentes',()=>assert.deepEqual(summarize([{status:'borrador'},{status:'en_preparacion'},{status:'archivado'}]),{total:3,active:2,drafts:1,archived:1}));
test('identificación visual de perfiles sin nombre',()=>{assert.equal(initials(''), '');assert.equal(initials('Ana De Prueba'),'AD');});
