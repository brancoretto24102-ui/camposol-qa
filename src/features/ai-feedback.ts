import {createElement as h} from 'react';

export type AIRequestState='idle'|'loading'|'received'|'failed';

export function AIRequestFeedback({state,error}:{state:AIRequestState;error:string}){
  if(state==='failed')return h('div',{className:'notice error',role:'alert'},h('strong',null,'No se recibió una propuesta de la IA.'),h('p',null,error),h('p',{className:'small'},'El texto de tu consulta se conserva. Resuelve el motivo indicado antes de volver a enviarla.'));
  if(state==='received')return error?h('div',{className:'notice error',role:'alert'},h('strong',null,'La API respondió, pero la propuesta necesita una corrección.'),h('p',null,error)):null;
  return h('p',{className:'notice info',role:'status'},state==='loading'?'La IA está preparando la respuesta. Se mostrará aquí al terminar.':'Pulsa «Generar con IA» para recibir la propuesta aquí mismo y revisarla antes de guardarla.');
}
