import {createElement as h} from 'react';
import {Button} from '../ui.ts';

export function FreeChatProposalIssue({error,busy,onRepair}:{error:string;busy:boolean;onRepair:()=>void}){
  if(!error)return null;
  return h('section',{className:'notice info',role:'alert'},h('strong',null,'La propuesta necesita una corrección'),
    h('p',null,'La respuesta llegó, pero la propuesta debe cumplir las validaciones antes de guardarse. Puedes pedirle al asistente que la corrija aquí mismo.'),
    h(Button,{variant:'secondary',disabled:busy,onClick:onRepair},'Preparar corrección'),
    h('p',{className:'small muted'},'Se completará tu mensaje. Revísalo y pulsa Enviar mensaje; utilizará otra consulta de la cuota gratuita.'),
    h('details',null,h('summary',null,'Ver el motivo de la validación'),h('p',null,error)));
}
