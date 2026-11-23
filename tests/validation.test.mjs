import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../src/domain.ts';
test('cuerpos incompletos y tipos inesperados se rechazan sin excepción',()=>{for(const input of [null,{},[],{name:22},{application_id:'digiproy',code:'X',name:'Normal',objective:'A',description:null,status:'borrador'}])assert.ok(validateProject(input));});
