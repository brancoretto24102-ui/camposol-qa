import type {SignInWithOAuthCredentials} from '@supabase/supabase-js';

export function oauthRequest(provider:'google'|'azure',pageUrl:string):SignInWithOAuthCredentials{
  if(provider!=='google'&&provider!=='azure')throw new Error('El proveedor de acceso no está habilitado.');
  const page=new URL(pageUrl);
  if(page.username||page.password||!(page.protocol==='https:'||(page.protocol==='http:'&&['localhost','127.0.0.1'].includes(page.hostname))))throw new Error('Abre la aplicación desde su dirección HTTPS pública.');
  return {provider,options:{redirectTo:page.origin+page.pathname,scopes:provider==='google'?'openid email profile':'email',...(provider==='google'?{queryParams:{prompt:'select_account'}}:{})}};
}
