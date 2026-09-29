import {test as base, expect, type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

export const site='https://public-dl.github.io/health-data-vault/';
export const pointer=JSON.parse(readFileSync(resolve('public/public-data/current.json'),'utf8'));
const bytes=readFileSync(resolve(`public/public-data/releases/${pointer.release_id}.json`));
if(pointer.status!=='approved'||createHash('sha256').update(bytes).digest('hex')!==pointer.data_sha256)throw Error('Approved release/hash mismatch');
export const release=JSON.parse(bytes.toString());
export const records=[...release.analysis.records,...release.annual.records,...release.reported.records];
export function record(id:string,region:string,year=2023){
  const rows=records.filter((r:any)=>r.indicator_id===id&&r.geography_code===region&&r.observation_fiscal_year===year);
  if(rows.length!==1)throw Error(`Expected one record: ${id}/${region}/${year}: ${rows.length}`);
  const r=rows[0];
  const source=release.published_tables.find((t:any)=>t.source.sha256===r.source_sha256&&t.source_sheet===r.source_sheet);
  const cell=source?.rows.flatMap((x:any)=>x.cells).find((c:any)=>c.coordinate===r.source_cell);
  if(!cell||cell.original_value!==r.original_value)throw Error(`Original cell mismatch: ${id}/${region}/${year}`);
  return rows[0];
}
export const count=(n:number)=>n.toLocaleString('ja-JP');
export const percent=(n:number)=>n.toFixed(1);

export const test=base.extend({
  page:async({page},use)=>{
    // Exercise analytics initialization without sending test visits to Google.
    await page.route('https://www.googletagmanager.com/**', route => route.fulfill({contentType:'application/javascript',body:''}));
    await page.route(/https:\/\/[^/]*google-analytics\.com\//, route => route.abort());
    // Fulfil the production origin with LOCAL build bytes. Never hit or modify production.
    // The browser sees the real HTTPS origin, so the robots guard is tested unchanged.
    await page.route('https://public-dl.github.io/**',async route=>{
      const u=new URL(route.request().url());
      const response=await page.request.get('http://127.0.0.1:4399'+u.pathname+u.search);
      await route.fulfill({response});
    });
    await use(page);
    await page.unrouteAll({behavior:'wait'});
  },
});
export {expect};
export async function open(page:Page){
  await page.goto('./');
  await expect(page.getByRole('combobox',{name:'データを選ぶ',exact:true,includeHidden:true})).toBeAttached();
}
export async function controls(page:Page,action:()=>Promise<void>){
  const trigger=page.getByRole('button',{name:'条件を変更',exact:true});
  const mobile=await trigger.isVisible();
  if(mobile)await trigger.click();
  await action();
  if(mobile)await page.getByRole('button',{name:'条件を閉じる ×',exact:true}).click();
}
export async function choose(page:Page,{theme,indicator,a,b,year}:{theme?:string;indicator?:string;a?:string;b?:string;year?:string}){
  await controls(page,async()=>{
    if(theme){
      const current=page.getByRole('button',{name:/^現在のテーマ /});
      // The mobile drawer already shows the theme list; desktop uses a disclosure.
      if(await current.isVisible())await current.click();
      await page.getByRole('navigation',{name:'健康テーマ'}).getByRole('button').filter({has:page.getByText(theme,{exact:true})}).click();
    }
    if(indicator)await page.getByRole('combobox',{name:'データを選ぶ',exact:true}).selectOption(indicator);
    if(year)await page.getByRole('combobox',{name:'実績年度',exact:true}).selectOption(year);
    if(a)await page.getByRole('combobox',{name:'表示する地域',exact:true}).selectOption(a);
    if(b)await page.getByRole('combobox',{name:'比較する地域（任意）',exact:true}).selectOption(b);
  });
}
export async function section(page:Page,id:string){
  await page.getByRole('navigation',{name:'データの見方'}).locator(`a[href="#${id}"]`).click();
  const target=page.locator('#'+id);
  await expect(target).not.toHaveAttribute('aria-busy','true');
  return target;
}
export async function years(page:Page,id='table'){
  const target=await section(page,id);
  for(const y of [2021,2022,2023])await expect(target).toContainText(`${y}年度`);
  return target;
}
