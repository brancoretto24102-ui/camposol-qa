// Minimal runtime surface for Node/TypeScript CI. Hosted Deno supplies its own
// globals; this file is not imported or included in the deployed bundle.
declare const Deno: {
  env:{get(name:string):string|undefined};
  serve(handler:(request:Request)=>Response|Promise<Response>):unknown;
};
