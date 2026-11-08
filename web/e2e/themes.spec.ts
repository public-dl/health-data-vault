import {test,expect,site,release} from './fixtures';
const themes=[['overall','総合判定','group:metabo'],['blood-pressure','血圧','bp_guidance'],['lipids','脂質代謝','lipid_people'],['liver','肝機能','liver'],['glucose','糖代謝','glucose_people'],['renal-urinary','腎・尿路系','renal_urinary_people'],['detailed','詳細な健診項目','anemia'],['other','その他の健診項目','uric_acid']];
for(const [theme,label,id] of themes)for(const measure of ['count','rate'])test(`all-theme direct: ${theme} / ${measure}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(site+`?theme=${theme}&indicator=${id}&measure=${measure}&year=2023&region=15`);
 await expect(page.locator('.results-theme-heading')).toHaveText(label);await expect(page.locator('#overview [data-export-surface]')).not.toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);
 await page.locator('#table').scrollIntoViewIfNeeded();await expect(page.locator('#table table').first()).toBeVisible();expect(errors).toEqual([]);
});
test('all-theme switching preserves a usable page for every theme',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(site);await expect(page.locator('.results-theme-heading')).toBeVisible();
 for(const [theme,label] of themes){
  const trigger=page.locator('.conditions-trigger');const narrow=await trigger.isVisible();if(narrow)await trigger.click();const current=page.locator('.theme-current');if(await current.isVisible())await current.click();
  await page.locator('.theme-options button').filter({has:page.locator('strong',{hasText:new RegExp('^'+label+'$')})}).click();if(narrow)await page.getByRole('button',{name:'条件を閉じる ×',exact:true}).click();
  await expect(page.locator('.results-theme-heading')).toHaveText(label);await expect(page.locator('#overview [data-export-surface]')).not.toHaveCount(0);await expect(page.getByRole('alert')).toHaveCount(0);await expect(page).toHaveURL(new RegExp('theme='+theme));
 }expect(errors).toEqual([]);
});

test('failed theme keeps the menu available and switching theme recovers',async({page})=>{
 const candidate=structuredClone(release);candidate.reported.records.find((r:any)=>r.indicator_id==='bp_guidance').denominator_record_id='missing-in-test';
 await page.route('**/review/data.json',route=>route.fulfill({json:{mode:'review',release_id:'local-fault-injection',payload:candidate}}));
 await page.goto(site+'?review=1&theme=blood-pressure&indicator=bp_guidance&measure=count&year=2023&region=15');
 await expect(page.getByRole('alert')).toContainText('このテーマを表示できませんでした');await expect(page.locator('.results-theme-heading')).toHaveText('血圧');await expect(page.locator('.site-header')).toBeVisible();
 const trigger=page.locator('.conditions-trigger');const narrow=await trigger.isVisible();if(narrow)await trigger.click();const current=page.locator('.theme-current');if(await current.isVisible())await current.click();
 await page.locator('.theme-options button').filter({has:page.locator('strong',{hasText:/^総合判定$/})}).click();if(narrow)await page.getByRole('button',{name:'条件を閉じる ×',exact:true}).click();
 await expect(page.locator('.results-theme-heading')).toHaveText('総合判定');await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.locator('#overview [data-export-surface]')).not.toHaveCount(0);
});
