import {createElement as h,type ChangeEvent} from 'react';
import {reviewLabels,type Review,type ReviewStatus} from '../qa-domain.ts';
export function QAField({label,value,onChange,rows=0,readOnly=false,required=false,maxLength=4000,hint}:{label:string;value:string;onChange:(v:string)=>void;rows?:number;readOnly?:boolean;required?:boolean;maxLength?:number;hint?:string}){
  const change=(e:ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>onChange(e.target.value);
  return h('label',{className:'field'},h('span',null,label,required&&h('em',null,' *')),
    rows?h('textarea',{value,onChange:change,rows,readOnly,required,maxLength}):h('input',{value,onChange:change,readOnly,required,maxLength}),hint&&h('small',null,hint));
}
export function ReviewBadge({status}:{status:ReviewStatus}){return h('span',{className:`review-chip ${status}`},reviewLabels[status]);}
export function moveItem<T>(items:T[],index:number,delta:number){const next=[...items],target=index+delta;if(target<0||target>=next.length)return next;[next[index],next[target]]=[next[target],next[index]];return next;}
export function ReviewInfo({review}:{review:Review}){return h('div',{className:'qa-review-info'},h(ReviewBadge,{status:review.status}),h('span',{className:'small muted'},`Contenido v${review.version}`),review.approved_name&&h('span',{className:'small'},`Aprobó: ${review.approved_name}`),review.observation&&h('p',null,review.observation));}
