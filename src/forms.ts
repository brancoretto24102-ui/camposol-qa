import { createElement as h } from 'react';
export const message=(e:unknown)=>e instanceof Error?e.message:'No fue posible completar la operación.';
export const value=(form:FormData,name:string)=>String(form.get(name)??'');
export const go=(route:string)=>{window.location.hash=route;};
export function Field({label,name,type='text',defaultValue='',required=false,maxLength=160,minLength,readOnly=false,hint}:{label:string;name:string;type?:string;defaultValue?:string;required?:boolean;maxLength?:number;minLength?:number;readOnly?:boolean;hint?:string}){return h('label',{className:'field'},h('span',null,label,required&&h('em',null,' *')),h('input',{name,type,defaultValue,required,maxLength,minLength,readOnly,autoComplete:type==='password'?'new-password':name==='email'?'email':'off'}),hint&&h('small',null,hint));}
export function TextArea({label,name,defaultValue='',required=false,maxLength=2000}:{label:string;name:string;defaultValue?:string;required?:boolean;maxLength?:number}){return h('label',{className:'field'},h('span',null,label,required&&h('em',null,' *')),h('textarea',{name,defaultValue,required,maxLength,rows:4}));}

