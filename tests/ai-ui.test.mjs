import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AIRequestFeedback} from '../src/features/ai-feedback.ts';

const render=(state,error='')=>renderToStaticMarkup(h(AIRequestFeedback,{state,error}));

test('el error de generación permanece junto al resultado y no vuelve al mensaje inicial',()=>{
  const html=render('failed','El proveedor alcanzó su límite de uso o cuota.');
  assert.match(html,/role="alert"/);assert.match(html,/límite de uso o cuota/);assert.match(html,/consulta se conserva/);
  assert.doesNotMatch(html,/Pulsa|preparando la respuesta/);
});
test('una consulta en curso muestra progreso sin sugerir otro envío',()=>{
  const html=render('loading');assert.match(html,/role="status"/);assert.match(html,/preparando la respuesta/);assert.doesNotMatch(html,/Pulsa|role="alert"/);
});
test('una respuesta recibida no vuelve al estado inicial y sus errores de validación son visibles',()=>{
  assert.equal(render('received'),'');const html=render('received','La cita no coincide con los requisitos.');
  assert.match(html,/role="alert"/);assert.match(html,/La cita no coincide/);assert.doesNotMatch(html,/Pulsa|preparando la respuesta/);
});
test('solo una consulta sin iniciar muestra la invitación a generar',()=>{
  const html=render('idle');assert.match(html,/Generar con IA/);assert.match(html,/role="status"/);assert.doesNotMatch(html,/role="alert"/);
});
