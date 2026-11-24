import {createElement as h,useState} from 'react';
import type {Backend} from '../backend.ts';
import type {QADocument,QACommand} from '../qa-domain.ts';
import type {AIContext,AITask} from '../ai-domain.ts';
import {AIAssistant} from './ai.ts';
import {FreeAIChat} from './free-chat.ts';

export function CartillaAIAssistant(props:{backend:Backend;context:AIContext;initialTask:AITask;caseId?:string;run:(command:QACommand)=>Promise<QADocument>}){
  const [mode,setMode]=useState<'free'|'other'>('free'),[busy,setBusy]=useState(false);
  return h('div',null,h('div',{className:'panel ai-mode-switch',role:'tablist','aria-label':'Forma de usar inteligencia artificial'},
    h('button',{type:'button',role:'tab','aria-selected':mode==='free',disabled:busy,className:mode==='free'?'active':'',onClick:()=>setMode('free')},'Chat gratuito'),
    h('button',{type:'button',role:'tab','aria-selected':mode==='other',disabled:busy,className:mode==='other'?'active':'',onClick:()=>setMode('other')},'Mi otra IA · opcional')),
    mode==='free'?h(FreeAIChat,{...props,onBusy:setBusy}):h(AIAssistant,{...props,onBusy:setBusy}));
}
