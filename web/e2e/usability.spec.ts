import {test,expect,site,controls} from './fixtures';
import type {Page} from '@playwright/test';
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error')list.push(m.text())});page.on('response',r=>{if(r.status()===404&&r.url().startsWith(site))list.push('404 '+r.url())});});
test.afterEach(async({page})=>{expect((errors.get(page)??[]).filter(m=>!(test.info().title.startsWith('contact validation')&&m.includes('status of 503')))).toEqual([])});
const fit=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

test('skip link focuses the main landmark and desktop controls have normal accessible semantics',async({page})=>{
 for(const path of ['', 'learn/','tables/','contact/','privacy/']){
  await page.goto(site+path);await expect(page.locator('#main-content')).toBeVisible();if(!path)await expect(page.locator('.results-theme-heading')).toBeVisible();
  const skip=page.getByRole('link',{name:'本文へ移動'});await skip.focus();await expect(skip).toBeInViewport();await page.keyboard.press('Enter');await expect(page.locator('#main-content')).toBeFocused();
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(site);await expect(page.locator('.results-theme-heading')).toBeVisible();
 await expect(page.getByRole('combobox',{name:'データを選ぶ',exact:true})).toBeVisible();await expect(page.locator('dialog.conditions-dialog')).toHaveCount(0);
});

test('source dialogs trap keyboard focus, close with Escape and return focus to their invoking button',async({page})=>{
 for(const [theme,id] of [['blood-pressure','bp_guidance'],['detailed','ecg'],['other','uric_acid']]){
  await page.goto(site+`?theme=${theme}&indicator=${id}&year=2023&region=15&measure=count`);await expect(page.locator('.results-theme-heading')).toBeVisible();
  const button=page.getByRole('button',{name:/このデータの諸元・出典を確認|分子・分母の出典を確認/}).first();await button.focus();await button.press('Enter');
  const dialog=page.locator('dialog[open]');await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  for(let i=0;i<12;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(button).toBeFocused();
 }
 const trigger=page.getByRole('button',{name:'表示条件',exact:true});
 if(await trigger.isVisible()){await trigger.click();await expect(page.getByRole('dialog',{name:'分析条件を変更'})).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();}
});

test('small screens keep notes readable, controls usable and wide tables confined to horizontal scrollers',async({page})=>{
 test.setTimeout(180000);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await page.goto(site+'?theme=other&indicator=uric_acid&year=2023&region=15&measure=count');
  await expect(page.locator('[data-examination-rate]')).toHaveText('9.0％');await page.locator('#graph').scrollIntoViewIfNeeded();await fit(page);
  const label=page.locator('.examination-table tbody tr').nth(2).locator('th');
  expect(await label.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const box=el.getBoundingClientRect();return Array.from(range.getClientRects()).every(r=>r.right<=box.right+1&&r.left>=box.left-1)})).toBe(true);
  for(const selector of ['.definition','.examination-state-note','.integrated-measure-note']){
   const sizes=await page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>parseFloat(getComputedStyle(n).fontSize)));expect(sizes.length).toBeGreaterThan(0);expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14);
  }
  await controls(page,async()=>{const year=page.getByRole('combobox',{name:'実績年度',exact:true});await year.selectOption('2022')});await expect(page.locator('[data-examination-rate]')).toHaveText('8.7％');await fit(page);
  if(width===390)await page.screenshot({path:test.info().outputPath('a9-mobile-state.png')});
 }
 await page.setViewportSize({width:390,height:844});await page.goto(site+'tables/?year=2023&cell=AM6');await expect(page.locator('.published-table')).toBeVisible();await fit(page);
 const scroller=page.getByLabel('原表。横スクロール可能');expect(await scroller.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);await scroller.evaluate(el=>el.scrollLeft=el.scrollWidth);await expect(page.locator('.source-cell-details')).toContainText('6936');
});

test('table ranges explain the selected year and integrated examination links retain their percentages',async({page})=>{
 await page.goto(site+'?theme=overall&indicator=group%3Ametabo&year=2022&region=15202&region2=15&measure=count');await page.locator('#table').scrollIntoViewIfNeeded();
 await expect(page.locator('#table [data-table-period]').first()).toContainText('2021・2022年度');await expect(page.locator('#table [data-table-period]').first()).toContainText('選択中は2022年度');
 await expect(page.locator('#table .selected-year-label').first()).toHaveText('選択中');
 await page.goto(site+'?theme=other&indicator=uric_acid&year=2022&region=15&measure=rate');await expect(page.locator('[data-examination-rate]')).toHaveText('8.7％');await expect(page).toHaveURL(/measure=count/);
 await expect(page.locator('.integrated-measure-note')).toContainText('判定人数・実施件数・割合を同時に表示');
 await expect(page.locator('#table [data-table-period]')).toContainText('選択中は2022年度');
 await controls(page,()=>page.getByRole('combobox',{name:'実績年度',exact:true}).selectOption('2023').then(()=>{}));await expect(page.locator('[data-examination-rate]')).toHaveText('9.0％');
 await page.goBack();await expect(page.locator('[data-examination-rate]')).toHaveText('8.7％');
});

test('contact validation, failure retention, duplicate prevention and success clearing work without a real submission',async({page})=>{
 await page.goto(site+'contact/');const form=page.locator('form'),button=form.getByRole('button',{name:'送信する'});let calls=0,answer:((x:void)=>void)|undefined;
 await page.route('https://api.web3forms.com/submit',async route=>{calls++;const body=route.request().postDataJSON();expect(body.email).toBe('test@example.com');expect(body.message).toBe('ローカル自動試験（実送信なし）');expect(body.category).toBe('その他');expect(body.name).toBe('検証');expect(route.request().headers()['content-type']).toContain('application/json');await new Promise<void>(resolve=>{answer=resolve});await route.fulfill({status:503,json:{success:false}})});
 await button.click();expect(calls).toBe(0);
 await form.locator('[name=name]').fill('検証');await form.locator('[name=email]').fill('test@example.com');await form.locator('[name=category]').selectOption('その他');await form.locator('[name=message]').fill('ローカル自動試験（実送信なし）');
 await button.click();await expect.poll(()=>calls).toBe(1);await expect(form.getByRole('button')).toBeDisabled();await form.evaluate(el=>(el as HTMLFormElement).requestSubmit());expect(calls).toBe(1);answer!();
 await expect(form.getByRole('status')).toContainText('送信できませんでした');await expect(form.locator('[name=message]')).toHaveValue('ローカル自動試験（実送信なし）');await expect(form.locator('[name=email]')).toHaveValue('test@example.com');
 await page.unroute('https://api.web3forms.com/submit');
 await page.route('https://api.web3forms.com/submit',async route=>{calls++;await route.fulfill({json:{success:true}})});await button.click();await expect(form.getByRole('status')).toContainText('お問い合わせを受け付けました');
 await expect(form.locator('[name=message]')).toHaveValue('');await expect(form.locator('[name=email]')).toHaveValue('');expect(calls).toBe(2);await fit(page);
});

test('JavaScript-disabled visitors get a source link and a clear explanation instead of an endless loader',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});
 await context.route('https://public-dl.github.io/**',async route=>{const u=new URL(route.request().url());const response=await context.request.get('http://127.0.0.1:4399'+u.pathname+u.search);await route.fulfill({response})});
 try{const page=await context.newPage();await page.goto(site);await expect(page.locator('.no-script')).toBeVisible();await expect(page.locator('.no-script')).toContainText('JavaScriptが必要');await expect(page.locator('.startup-status')).not.toBeVisible();await expect(page.locator('.no-script a')).toHaveAttribute('href',/kenko-niigata\.com/);}finally{await context.close();}
});
