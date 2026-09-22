import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {appUrl,appRoute} from './app-url';
import {PublicHeader,PublicFooter} from './public-shell';
import {tableLink,visualizationLink} from './source-table';
import {indexable,productionOrigin} from './seo';
afterEach(()=>vi.unstubAllEnvs());
it('joins root and subdirectory paths without changing external or fragment URLs',()=>{
 for(const base of ['/','/health-data-vault/']){
  for(const path of ['/contact/','/tables/?year=2022&cell=AD6','/public-data/current.json','/review/data.json'])expect(appUrl(path,base)).toBe(base+path.slice(1));
  expect(appRoute(base+'tables/',base)).toBe('/tables');expect(appRoute(base,base)).toBe('/');
 }
 expect(appRoute('/contact','/health-data-vault/')).toBe('__outside__');
 expect(appUrl('https://www.kenko-niigata.com/a','/test/')).toBe('https://www.kenko-niigata.com/a');
 expect(appUrl('#map','/test/')).toBe('#map');
});
it('shares BASE_URL across navigation and source-cell review links',()=>{
 vi.stubEnv('BASE_URL','/health-data-vault/');
 const html=renderToStaticMarkup(<><PublicHeader review/><PublicFooter review/></>);
 expect(html).toContain('/health-data-vault/contact/?review=1');expect(html).toContain('/health-data-vault/?review=1#table');
 expect(html).not.toContain('href="/contact');
 expect(tableLink({observation_fiscal_year:2023,source_cell:'AD6'} as any,true)).toBe('/health-data-vault/tables/?year=2023&cell=AD6&review=1');
 expect(visualizationLink({source:{observation_fiscal_year:2023}} as any,{visualization:{region:'15',indicator_id:'bp_referral'}} as any,false)).toBe('/health-data-vault/?year=2023&region=15&indicator=bp_referral#map');
});
it('indexes only the production host and base, never review variants',()=>{
 const site='https://public-dl.github.io/health-data-vault';
 expect(productionOrigin(site+'/')).toBe(site);
 expect(indexable(site,'production','https://public-dl.github.io','','/health-data-vault/')).toBe(true);
 for(const q of ['?review','?review=1','?exportReview','?exportReview=1'])expect(indexable(site,'production','https://public-dl.github.io',q,'/health-data-vault/')).toBe(false);
 expect(indexable(site,'production','https://public-dl.github.io','','/')).toBe(false);
 expect(indexable(site,'branch-deploy','https://public-dl.github.io','','/health-data-vault/')).toBe(false);
});
