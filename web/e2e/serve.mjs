import {spawnSync, spawn} from 'node:child_process';
// A real production build with the real deployment base. No application policy overrides.
const env={...process.env, CONTEXT:'production', PUBLIC_SITE_URL:'https://public-dl.github.io/health-data-vault', PUBLIC_CONTACT_URL:'https://health-data-vault.netlify.app/contact/'};
for(const args of [['node_modules/typescript/bin/tsc'],['node_modules/vite/bin/vite.js','build']]){
  const result=spawnSync(process.execPath,args,{env,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4399','--strictPort'],{env,stdio:'inherit'});
process.on('exit',()=>server.kill());
server.on('exit',code=>process.exit(code??0));
