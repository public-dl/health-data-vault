import {test,expect,site} from './fixtures';
test('header and footer anchors retain every selected condition without reloading',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(site+'?theme=overall&indicator=group%3Adoctor_judgment&year=2022&region=15202&region2=15&measure=count');await expect(page.locator('#overview [data-export-surface]').first()).toBeVisible();
 const search=new URL(page.url()).search;await page.evaluate(()=>{(window as any).__navigationSentinel='same-document'});
 for(const [selector,hash] of [['.site-header nav a[href="#map"]','#map'],['.site-header nav a[href="#table"]','#table'],['footer a[href="#about-data"]','#about-data']]){
  await page.locator(selector).click();expect(new URL(page.url()).search).toBe(search);expect(new URL(page.url()).hash).toBe(hash);expect(await page.evaluate(()=>(window as any).__navigationSentinel)).toBe('same-document');await expect(page.locator('.results-theme-heading')).toHaveText('総合判定');
 }expect(errors).toEqual([]);
});
test('dashboard and tables fetch only their verified delivery assets',async({page})=>{
 const paths:string[]=[];page.on('request',r=>{if(r.url().includes('/public-data/'))paths.push(new URL(r.url()).pathname)});
 await page.goto(site+'?theme=other&indicator=uric_acid&year=2023&region=15&measure=count');await expect(page.locator('.examination-values').first()).toContainText('6,936');
 expect(paths.some(p=>p.includes('/releases/'))).toBe(false);expect(paths.filter(p=>p.includes('/delivery/'))).toHaveLength(3);expect(paths.filter(p=>p.endsWith('/current.json'))).toHaveLength(1);
 paths.length=0;await page.goto(site+'tables/?year=2023&cell=AM6');await expect(page.locator('.published-table')).toBeVisible();await expect(page.locator('.source-cell-details')).toContainText('6936');
 expect(paths.some(p=>p.includes('/releases/'))).toBe(false);expect(paths.filter(p=>p.includes('/delivery/'))).toHaveLength(1);
});
