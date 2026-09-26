import React from 'react';
import {createRoot} from 'react-dom/client';
import {appRoute} from './app-url';
import {PublicHeader,PublicFooter} from './public-shell';
import {StartupScreen} from './startup-screen';
import './public.css';
import './annual-pages.css';
import './style.css';
import './health-themes.css';
import './top-design.css';
import './loading.css';
import './desktop-density.css';
import './analysis-sidebar.css';
import './presentation.css';
import './wide-screen-density.css';

const root=createRoot(document.getElementById('root')!);
const route=appRoute(location.pathname),base=import.meta.env.BASE_URL;
root.render(<StartupScreen base={base} route={route}/>);
async function start(){
 const review=new URLSearchParams(location.search).has('review');
 if(route==='/contact'){
  const {Contact}=await import('./contact');root.render(<Contact/>);return;
 }
 if(route==='/learn'){
  const {Learn}=await import('./learn');root.render(<><PublicHeader review={review}/><Learn review={review}/><PublicFooter review={review}/></>);return;
 }
 const data=import('./model').then(m=>m.loadData());
 if(route==='/tables'){
  const [{PublishedTables},loaded]=await Promise.all([import('./source-table'),data]);
  root.render(<><PublicHeader review={loaded.review}/>{loaded.extensions?<PublishedTables tables={loaded.extensions.published_tables} review={loaded.review} release={loaded.release}/>:<main><h1>公表数表はこのreleaseに収録されていません</h1></main>}<PublicFooter review={loaded.review}/></>);return;
 }
 const [{App},loaded]=await Promise.all([import('./dashboard'),data]);
 root.render(<App data={loaded.payload} review={loaded.review} release={loaded.release} extensions={loaded.extensions}/>);
}
start().catch(error=>root.render(<StartupScreen base={base} route={route} error={String(error.message)}/>));
