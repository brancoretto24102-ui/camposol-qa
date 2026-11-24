import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {oauthRequest} from '../src/oauth.ts';

async function authorize(provider,page){
  const values=new Map(),client=createClient('https://oauth-qa.example.test','sb_publishable_fictitious',{auth:{flowType:'pkce',autoRefreshToken:false,persistSession:true,detectSessionInUrl:false,storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}}});
  const request=oauthRequest(provider,page),result=await client.auth.signInWithOAuth({...request,options:{...request.options,skipBrowserRedirect:true}});
  assert.equal(result.error,null);return {url:new URL(result.data.url),values};
}
test('Google usa el SDK oficial con PKCE y solicita solo identidad, sin acceso al buzón Gmail',async()=>{
  const {url,values}=await authorize('google','https://brancoretto24102-ui.github.io/camposol-qa/');
  assert.equal(url.origin,'https://oauth-qa.example.test');assert.equal(url.pathname,'/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('prompt'),'select_account');
  assert.deepEqual(url.searchParams.get('scopes').split(' ').sort(),['email','openid','profile']);
  assert.equal(url.searchParams.get('redirect_to'),'https://brancoretto24102-ui.github.io/camposol-qa/');
  assert.equal(url.searchParams.get('code_challenge_method').toLowerCase(),'s256');assert.ok(url.searchParams.get('code_challenge').length>=43);
  assert.ok(!url.searchParams.has('code_verifier'));assert.ok(!url.href.includes('sb_publishable_'));
  for(const value of values.values())assert.ok(!url.href.includes(value));
});
test('el retorno conserva la ruta publicada y elimina parámetros, fragmentos y destinos ajenos',async()=>{
  const {url}=await authorize('google','https://brancoretto24102-ui.github.io/camposol-qa/?code=fictitious&next=https://other.example.test/#cartilla/ficticia');
  assert.equal(url.searchParams.get('redirect_to'),'https://brancoretto24102-ui.github.io/camposol-qa/');assert.ok(!url.href.includes('other.example'));
});
test('Microsoft conserva su proveedor, scope y flujo PKCE',async()=>{
  const {url}=await authorize('azure','https://brancoretto24102-ui.github.io/camposol-qa/');
  assert.equal(url.searchParams.get('provider'),'azure');assert.equal(url.searchParams.get('scopes'),'email');assert.ok(!url.searchParams.has('prompt'));assert.ok(url.searchParams.has('code_challenge'));
});
test('solo se permite HTTP de desarrollo en loopback y se rechazan esquemas o credenciales en URL',()=>{
  assert.equal(oauthRequest('google','http://127.0.0.1:5173/?code=fictitious').options.redirectTo,'http://127.0.0.1:5173/');
  for(const value of ['http://remote.example.test/','javascript:alert(1)','data:text/html,test','https://user:password@example.test/'])assert.throws(()=>oauthRequest('google',value));
  assert.throws(()=>oauthRequest('facebook','https://example.test/'));
});
