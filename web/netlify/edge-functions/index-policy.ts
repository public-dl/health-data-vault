import {indexable} from '../../src/seo';
declare const Netlify:{env:{get:(name:string)=>string|undefined}};
export default async (request:Request, context:{next:()=>Promise<Response>;deploy:{context:string}})=>{
 const response=await context.next();const url=new URL(request.url);
 if(!indexable(Netlify.env.get('PUBLIC_SITE_URL')??'',context.deploy.context,url.origin,url.search,url.pathname)||url.pathname.startsWith('/review/'))response.headers.set('X-Robots-Tag','noindex, nofollow');
 return response;
};
