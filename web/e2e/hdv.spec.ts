import {test,expect,open,choose,controls,section,years,record,count,percent,release,site} from './fixtures';
import {readFile} from 'node:fs/promises';

test('audited anchors and source provenance guard the release oracle',async({page})=>{
  const t=record('metabo_case','15213');
  expect(t.value).toBe(793);expect(t.derived_rate.denominator_value).toBe(3401);
  expect(percent(t.derived_rate.value)).toBe('23.3');
  expect(t.source_sheet).toBe('保険者別 ');expect(t.source_cell).toBe('E23');
  expect(t.source_sha256).toBe('08fc5b2e9956ced9d98efca9bfdb08f4287b8004bb11c06e3326790b9f3f0c1b');
  expect(record('urine_protein','15').value).toBe(4689);
  await open(page);await choose(page,{a:'15213'});
  await expect(page.locator('#overview')).toContainText('793人');
  await expect(page.locator('#overview')).toContainText('23.3%');
});

for(const [region,label] of [['15','新潟県'],['15213','燕市'],['hc-15-sanjo','三条保健所管内']]){
  test(`overall ${label}: release counts, 100 people, table and annual bars`,async({page})=>{
    await open(page);await choose(page,{a:region});
    const r=record('metabo_case',region),overview=page.locator('#overview');
    await expect(overview).toContainText(count(r.value)+'人');
    await expect(overview).toContainText(percent(r.derived_rate.value)+'%');
    await expect(overview.locator('[data-person]')).toHaveCount(100);
    const table=await years(page);
    for(const year of [2021,2022,2023])await expect(table).toContainText(count(record('metabo_case',region,year).value));
    const graph=await years(page,'graph');
    for(const year of [2021,2022,2023])await expect(graph.locator(`[data-region="${region}"][data-year="${year}"]`)).toHaveCount(1);
  });
}
for(const [id,allowed] of [['metabo_case',true],['guidance_active',true],['physician_normal',false]] as const){
  test(`Sanjo / Tsubame ${id}: three annual facts and permitted connections`,async({page})=>{
    await open(page);await choose(page,{indicator:id,a:'hc-15-sanjo',b:'15213'});
    if(!allowed){
      for(const year of ['2021','2022','2023']){
        await choose(page,{year});
        const table=await section(page,'table');
        await expect(table).toContainText(year+'年度');
        await expect(table).toContainText('年度間比較なし');
      }
      await expect(page.locator('[data-temporal-connection]')).toHaveCount(0);
      await expect(page.locator('nav[aria-label="データの見方"] a[href="#graph"]')).toHaveCount(0);
      return;
    }
    const graph=await years(page,'graph');
    for(const code of ['hc-15-sanjo','15213']){
      const series=graph.locator(`svg [data-region="${code}"]`);
      for(const year of [2021,2022,2023])await expect(series.locator(`[data-year="${year}"]`)).toHaveCount(1);
      await expect(series.locator('[data-temporal-connection]')).toHaveCount(allowed?2:0);
    }
  });
}
test('prefecture / Uonuma: six composition bars',async({page})=>{
  await open(page);await choose(page,{b:'hc-15-uonuma'});
  const graph=await years(page,'graph');
  await expect(graph.locator('svg [data-region][data-year]')).toHaveCount(6);
  await expect(graph).toContainText('魚沼保健所管内');
});

const nonOverall=[['血圧','bp_referral'],['脂質代謝','triglycerides'],['肝機能','liver'],['糖代謝','hba1c'],['腎・尿路系','urine_protein']];
for(const [theme,id] of nonOverall){
  test(`${theme}: counts only, official map/graph notices`,async({page})=>{
    await open(page);await choose(page,{theme,...(id==='liver'?{}:{indicator:id})});
    const r=record(id,'15');
    await expect(page.locator('#overview')).toContainText(count(r.value));
    await expect(page.getByRole('combobox',{name:'表示する値',exact:true,includeHidden:true})).toHaveValue('count');
    const map=await section(page,'map');
    await expect(map).toContainText('この指標は割合による地域比較を行っていないため、地図は表示していません。報告人数は「表で見る」で確認できます。');
    await expect(map.locator('[data-export-surface="map-card"]')).toHaveCount(0);
    const table=await years(page);
    for(const year of [2021,2022,2023])await expect(table).toContainText(count(record(id,'15',year).value));
    const graph=await section(page,'graph');
    await expect(graph).toContainText('この指標は割合による地域比較を行っていないため、地域分布・比較グラフは表示していません。年度別の報告人数は「表で見る」で確認できます。');
    for(const s of [page.locator('#overview'),table,graph])expect(await s.innerText()).not.toMatch(/[%％]|ポイント/);
    await expect(graph.locator('[data-export-surface="graph-card"]')).toHaveCount(0);
    expect(r).not.toHaveProperty('derived_rate');
  });
}
for(const id of ['renal_urinary_people','urine_blood','creatinine']){
  test(`renal selection ${id} never exposes a rate`,async({page})=>{
    await open(page);await choose(page,{theme:'腎・尿路系',indicator:id});
    await expect(page.locator('#overview')).toContainText(count(record(id,'15').value));
    await expect(page.getByRole('combobox',{name:'表示する値',exact:true,includeHidden:true}).locator('option')).toHaveCount(1);
    expect(await page.locator('#overview').innerText()).not.toMatch(/[%％]/);
  });
}
test('Niitsu derived zero is visible and raw blank remains traceable',async({page})=>{
  const r=record('metabo_indeterminate','hc-15-niitsu');
  expect(r.value).toBe(0);expect(r.original_value).toBeNull();expect(r.zero_derivation.child_sum).toBe(0);
  await open(page);await choose(page,{a:'hc-15-niitsu'});
  await expect(page.locator('#overview')).toContainText('0人');
  await expect(page.locator('#overview')).toContainText('0.0%');
  await page.locator('#overview').getByRole('button',{name:'ⓘ このデータの諸元・出典を確認',exact:true}).click();
  await expect(page.locator('dialog[open]')).toContainText('HDV派生0（原表は空欄）');
});
test('sidebar changes theme color, year and regions',async({page})=>{
  await open(page);
  const activeTheme=async()=>{
    const trigger=page.getByRole('button',{name:/^現在のテーマ /});
    return await trigger.isVisible()?trigger:page.getByRole('navigation',{name:'健康テーマ'}).getByRole('button',{pressed:true});
  };
  let before='';
  await controls(page,async()=>{before=await (await activeTheme()).evaluate(e=>getComputedStyle(e).backgroundColor);});
  await choose(page,{theme:'腎・尿路系',indicator:'urine_protein',year:'2022',a:'hc-15-sanjo',b:'15213'});
  await controls(page,async()=>{
    const active=await activeTheme();
    expect(await active.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);
    await expect(active).toContainText('腎・尿路系');
  });
  await expect(page.locator('#overview')).toContainText(count(record('urine_protein','15213',2022).value));
});
test('01–04 anchors and active location',async({page})=>{
  await open(page);
  for(const id of ['overview','map','table','graph']){
    const target=await section(page,id);
    await expect(page).toHaveURL(new RegExp('#'+id+'$'));
    await expect(page.locator(`nav[aria-label="データの見方"] a[href="#${id}"]`)).toHaveAttribute('aria-current','location');
    await expect(target).toBeInViewport();
  }
});
test('data notes start closed and toggle independently',async({page})=>{
  await open(page);await choose(page,{indicator:'metabo_case',b:'hc-15-tokamachi'});
  const table=await years(page),notes=table.locator('details[data-export-notes]');
  await expect(notes).toHaveCount(2);
  for(const n of await notes.all())await expect(n).not.toHaveAttribute('open','');
  await notes.nth(0).locator('summary').click();await expect(notes.nth(0)).toHaveAttribute('open','');
  await expect(notes.nth(1)).not.toHaveAttribute('open','');
  await notes.nth(0).locator('summary').click();await expect(notes.nth(0)).not.toHaveAttribute('open','');
});
test('year-table typography is identical across columns and comparison cards',async({page},testInfo)=>{
  await open(page);await choose(page,{indicator:'metabo_case',b:'hc-15-tokamachi'});
  const table=await years(page);
  const styles=await table.locator('table').evaluateAll(tables=>tables.map(t=>Array.from(t.querySelectorAll('tr')).map(r=>Array.from(r.children).slice(1).map(c=>{const s=getComputedStyle(c);return [s.fontSize,s.fontWeight,s.lineHeight].join('/');}))));
  expect(styles).toHaveLength(2);
  for(const rows of styles)for(const row of rows)expect(new Set(row).size).toBe(1);
  expect(styles[0]).toEqual(styles[1]);
  await testInfo.attach('comparison-table',{body:await page.screenshot(),contentType:'image/png'});
});

for(const query of ['', '?review','?exportReview']){
  test(`production robots ${query||'normal'} and initial HTML`,async({page})=>{
    const response=await page.goto('./'+query);
    expect(await response!.text()).toContain('<meta name="robots" content="index,follow">');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',query?'noindex,nofollow':'index,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',site);
  });
}
async function assertPng(download:any){
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const bytes=await readFile(await download.path());expect(bytes.length).toBeGreaterThan(8);
  expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
}
for(const mode of ['success','denied','unsupported'] as const){
  test(`image export ${mode}: real PNG generation across shared surfaces`,async({page})=>{
    test.setTimeout(120000);
    // Only the platform clipboard boundary is controlled; rendering and PNG generation are real.
    await page.addInitScript(mode=>{
      if(mode==='unsupported'){Object.defineProperty(window,'ClipboardItem',{value:undefined});return;}
      Object.defineProperty(navigator,'clipboard',{value:{write:async(items:ClipboardItem[])=>{
        const blob=await items[0].getType('image/png');
        if(blob.type!=='image/png'||!blob.size)throw Error('Invalid PNG');
        if(mode==='denied')throw new DOMException('E2E clipboard denied','NotAllowedError');
      }}});
    },mode);
    await open(page);await choose(page,{b:'15213'});
    for(const [id,kind] of [['overview','pictogram-card'],['map','map-card'],['table','table-card'],['graph','graph-card']]){
      const target=await section(page,id);
      await expect(page.getByRole('status').filter({hasText:/コピーしました|PNG.*保存しました/})).not.toBeVisible();
      const button=target.locator(`[data-export-surface="${kind}"]`).first().getByRole('button',{name:/をコピー$/}).first();
      const download=mode==='success'?null:page.waitForEvent('download');
      await button.click();
      if(download)await assertPng(await download);
      await expect(page.getByRole('status').filter({hasText:mode==='success'?/コピーしました/:/PNG.*保存しました/})).toBeVisible();
    }
    await section(page,'overview');
    await expect(page.getByRole('status').filter({hasText:/コピーしました|PNG.*保存しました/})).not.toBeVisible();
    const download=mode==='success'?null:page.waitForEvent('download');
    await page.getByRole('button',{name:'比較画像をコピー',exact:true}).first().click();
    if(download)await assertPng(await download);
    await expect(page.getByRole('status').filter({hasText:mode==='success'?/比較画像.*コピーしました/:/PNG.*保存しました/})).toBeVisible();
  });
}
test('PNG save creates a valid file',async({page})=>{
  await open(page);const download=page.waitForEvent('download');
  await page.locator('#overview').getByRole('button',{name:/をPNG保存$/}).click();
  await assertPng(await download);
});
