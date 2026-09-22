/** Site-local paths only; source URLs and generated blob URLs stay untouched. */
export function appUrl(path:string,base=import.meta.env.BASE_URL):string {
 if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path) || path.startsWith('#')) return path;
 return base.replace(/\/?$/, '/')+path.replace(/^\/+/, '');
}
export function appRoute(pathname:string,base=import.meta.env.BASE_URL):string {
 const prefix=base.replace(/\/+$/, '');
 if(prefix && pathname!==prefix && !pathname.startsWith(prefix+'/'))return '__outside__';
 return ('/'+pathname.slice(prefix.length).replace(/^\/+/, '')).replace(/\/+$/, '')||'/';
}
