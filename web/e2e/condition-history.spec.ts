import {test,expect,site,controls} from './fixtures';
import type {Page} from '@playwright/test';

const start=site+'?theme=overall&indicator=group%3Ametabo&year=2023&region=15&measure=rate';
const select=(page:Page,label:string,value:string)=>controls(page,()=>page.locator(`.analysis-sidebar select[aria-label="${label}"]`).selectOption(value).then(()=>{}));
const query=(page:Page)=>new URL(page.url()).search;
const failures=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const errors:string[]=[];failures.set(page,errors);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()===404&&r.url().startsWith(site))errors.push('404 '+r.url())});
});
test.afterEach(async({page})=>{expect(failures.get(page)).toEqual([])});
async function ready(page:Page){await expect(page.locator('.results-theme-heading')).toBeVisible();await expect(page.locator('.theme-error')).toHaveCount(0);}
async function theme(page:Page,name:string){await controls(page,async()=>{
 const trigger=page.locator('.theme-current');if(await trigger.isVisible())await trigger.click();
 await page.locator('.theme-options button').filter({has:page.locator('strong').filter({hasText:new RegExp('^'+name+'$')})}).click();
});}

test('every confirmed condition restores together through back and forward without loading data again',async({page})=>{
 const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/public-data/'))requests.push(r.url())});
 await page.goto(start);await ready(page);const fetched=requests.length;await page.evaluate(()=>{(window as any).__sameDocument=true});
 const states=[query(page)];
 await theme(page,'血圧');states.push(query(page));
 await select(page,'データを選ぶ','bp_guidance');states.push(query(page));
 await select(page,'実績年度','2022');states.push(query(page));
 await controls(page,()=>page.locator('.region-selects select').nth(0).selectOption('15202').then(()=>{}));states.push(query(page));
 await controls(page,()=>page.locator('.region-selects select').nth(1).selectOption('15').then(()=>{}));states.push(query(page));
 await theme(page,'総合判定');states.push(query(page));
 await select(page,'表示する値','rate');states.push(query(page));
 await select(page,'表示する値','count');states.push(query(page));
 const length=await page.evaluate(()=>history.length);
 for(let i=states.length-2;i>=0;i--){await page.goBack();await expect.poll(()=>query(page)).toBe(states[i]);await ready(page);const params=new URL(page.url()).searchParams;
   await expect(page.locator('.analysis-sidebar select[aria-label="データを選ぶ"]')).toHaveValue(params.get('indicator')!);
   await expect(page.locator('.analysis-sidebar select[aria-label="実績年度"]')).toHaveValue(params.get('year')!);
   await expect(page.locator('.analysis-sidebar select[aria-label="表示する値"]')).toHaveValue(params.get('measure')!);
   await expect(page.locator('.region-selects select').nth(0)).toHaveValue(params.get('region')!);
   await expect(page.locator('.region-selects select').nth(1)).toHaveValue(params.get('region2')??'');
 }
 for(let i=1;i<states.length;i++){await page.goForward();await expect.poll(()=>query(page)).toBe(states[i]);await ready(page);}
 expect(await page.evaluate(()=>history.length)).toBe(length);expect(await page.evaluate(()=>(window as any).__sameDocument)).toBe(true);expect(requests).toHaveLength(fetched);expect(errors).toEqual([]);
 await page.screenshot({path:test.info().outputPath('a8-restored-conditions.png')});
 await page.locator('#graph').scrollIntoViewIfNeeded();const series=page.locator('#graph .series-controls input[type="checkbox"]');await expect(series).toHaveCount(2);await expect(series.nth(0)).toBeChecked();await expect(series.nth(1)).toBeChecked();
});

test('a continuous year-slider burst is one entry, separate year choices remain separate',async({page})=>{
 await page.goto(start.replace('year=2023','year=2021'));await ready(page);await page.locator('#map').scrollIntoViewIfNeeded();
 const slider=page.locator('#map input[type="range"]').first();await expect(slider).toBeVisible();const before=await page.evaluate(()=>history.length);
 await slider.focus();await page.keyboard.down('ArrowRight');await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2022');
 await page.keyboard.down('ArrowRight');await page.keyboard.up('ArrowRight');await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2023');
 expect(await page.evaluate(()=>history.length)).toBe(before+1);
 await page.goBack();await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2021');await expect(slider).toHaveValue('0');
 await page.goForward();await expect(slider).toHaveValue('2');
 await select(page,'実績年度','2022');await select(page,'実績年度','2021');
 await page.goBack();await expect(slider).toHaveValue('1');await page.goBack();await expect(slider).toHaveValue('2');
});

test('playback frames share one entry and traversal stops playback without creating an entry',async({page})=>{
 await page.goto(start);await ready(page);await page.locator('#map').scrollIntoViewIfNeeded();
 const before=await page.evaluate(()=>history.length),play=page.locator('#map .timeline button').first();
 await play.click();await expect.poll(()=>new URL(page.url()).searchParams.get('year'),{timeout:8000}).toBe('2022');
 expect(await page.evaluate(()=>history.length)).toBe(before+1);
 await page.goBack();await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2023');await expect(play).toHaveText('▶ 年度を再生');
 await page.waitForTimeout(2100);expect(new URL(page.url()).searchParams.get('year')).toBe('2023');
 await page.goForward();await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2022');await expect(play).toHaveText('▶ 年度を再生');expect(await page.evaluate(()=>history.length)).toBe(before+1);
 await play.click();await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2023');await play.click();
 await page.goBack();await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2022');
});

test('dragging a year slider retains its DOM and groups all movement into one entry',async({page})=>{
 await page.goto(start.replace('year=2023','year=2021'));await ready(page);await page.locator('#map').scrollIntoViewIfNeeded();
 const slider=page.locator('#map input[type="range"]').first();await slider.scrollIntoViewIfNeeded();await expect(slider).toBeInViewport();
 await slider.evaluate(el=>{(window as any).__dragSlider=el});const box=(await slider.boundingBox())!,before=await page.evaluate(()=>history.length);
 await page.mouse.move(box.x+8,box.y+box.height/2);await page.mouse.down();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2022');
 await page.mouse.move(box.x+box.width-8,box.y+box.height/2);await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2023');await page.mouse.up();
 expect(await slider.evaluate(el=>el===(window as any).__dragSlider)).toBe(true);expect(await page.evaluate(()=>history.length)).toBe(before+1);
 await page.goBack();await expect(slider).toHaveValue('0');await page.goForward();await expect(slider).toHaveValue('2');
});

test('map selection, region swap, reset, anchors and a new branch coexist with condition history',async({page})=>{
 await page.goto(site+'?theme=other&indicator=uric_acid&year=2023&region=15&measure=count');await expect(page.locator('[data-examination-rate]')).toHaveText('9.0％');
 const original=query(page);await page.locator('#map').scrollIntoViewIfNeeded();await page.locator('#map path[data-geography="15210"]').first().focus();await page.locator('#map path[data-geography="15210"]').first().press('Enter');
 await expect.poll(()=>new URL(page.url()).searchParams.get('region2')).toBe('15210');const pair=query(page);
 await controls(page,()=>page.locator('.region-selects button').click());await expect.poll(()=>new URL(page.url()).searchParams.get('region')).toBe('15210');const swapped=query(page);
 await controls(page,()=>page.locator('.filters > button').click());await expect.poll(()=>new URL(page.url()).searchParams.get('theme')).toBe('overall');
 await page.goBack();await expect.poll(()=>query(page)).toBe(swapped);await expect(page.locator('[data-examination-rate]').first()).toHaveText('0.0％（真の0）');
 await page.goBack();await expect.poll(()=>query(page)).toBe(pair);await page.goBack();await expect.poll(()=>query(page)).toBe(original);
 await page.locator('.site-header a[href="#table"]').click();await expect.poll(()=>new URL(page.url()).hash).toBe('#table');
 await select(page,'実績年度','2022');await page.goBack();await expect.poll(()=>new URL(page.url()).searchParams.get('year')).toBe('2023');expect(new URL(page.url()).hash).toBe('#table');
 await page.goBack();await expect.poll(()=>new URL(page.url()).hash).toBe('');
 await select(page,'実績年度','2021');const branch=page.url();await page.goForward();expect(page.url()).toBe(branch);
});

test('invalid deep links normalize in place and reloads do not add condition history',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(site+'?theme=bad&indicator=uric_acid_tests&year=1900&region=bad&region2=15&measure=rate#table');await ready(page);
 await expect(page.locator('[data-examination-rate]')).toHaveText('9.0％');const url=new URL(page.url());
 expect(Object.fromEntries(url.searchParams)).toEqual({theme:'other',indicator:'uric_acid',year:'2023',region:'15',measure:'count'});expect(url.hash).toBe('#table');
 const length=await page.evaluate(()=>history.length);await page.reload();await ready(page);expect(page.url()).toBe(url.href);expect(await page.evaluate(()=>history.length)).toBe(length);
 await select(page,'実績年度','2022');await page.goBack();await expect.poll(()=>page.url()).toBe(url.href);await expect(page.locator('[data-examination-rate]')).toHaveText('9.0％');expect(errors).toEqual([]);
});
