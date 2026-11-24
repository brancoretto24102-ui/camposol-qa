import {createElement as h} from 'react';
import {type MethodologyConfig,type QAContent} from '../qa-domain.ts';
import {referenceRows} from '../evidence-domain.ts';
export function MatrixPreview({content,config,caseId}:{content:QAContent;config:MethodologyConfig;caseId?:string}){
  const rows=referenceRows(content).filter(r=>!caseId||r.case_id===caseId);
  return h('div',null,h('div',{className:'qa-matrix-wrap',role:'region','aria-label':'Vista previa de la matriz oficial',tabIndex:0},
    h('table',{className:'qa-matrix'},
      h('colgroup',null,...Array.from({length:13},(_,i)=>h('col',{key:i,className:`qa-col-${i}`}))),
      h('thead',null,h('tr',{className:'qa-column-letters'},...'ABCDEFGHIJKLM'.split('').map(letter=>h('th',{key:letter,scope:'col'},letter))),
        h('tr',null,...config.columns.map(c=>h('th',{key:c.key,scope:'col',colSpan:c.key==='comment'?3:1},c.label)))),
      h('tbody',null,...rows.map(row=>h('tr',{key:row.case_id+':'+(row.step_id??'empty')},...config.columns.map(c=>h('td',{key:c.key,colSpan:c.key==='comment'?3:1},String(row[c.key as keyof typeof row]??'')))))),
      rows.length===0&&h('caption',null,'La matriz se completará con los casos que selecciones.'))),
    h('p',{className:'small muted qa-matrix-note'},'Una fila y una referencia por paso. En el Excel, cada referencia abre sus capturas y Regresar vuelve a su celda de la columna J.'));
}
