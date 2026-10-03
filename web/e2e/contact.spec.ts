import {test,expect,site} from './fixtures';

test('contact submits on Pages with validation, retry and success state',async({page},info)=>{
  const bodies:Record<string,unknown>[]=[];
  await page.route('https://api.web3forms.com/submit',async route=>{
    bodies.push(route.request().postDataJSON());
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:bodies.length>1})});
  });
  await page.goto(site+'contact/');
  const send=page.getByRole('button',{name:'送信する',exact:true});
  await expect(send).toBeEnabled();await send.click();expect(bodies).toHaveLength(0);
  await page.getByLabel('お名前（任意）').fill('フォームテスト');
  await page.getByLabel('メールアドレス（必須）').fill('test@example.com');
  await page.getByLabel('お問い合わせ種別').selectOption('表示について');
  await page.getByLabel('お問い合わせ内容（必須）').fill('送信処理の検証');
  await send.click();await expect(page.getByRole('status')).toContainText('送信できませんでした');
  await expect(page.getByLabel('お問い合わせ内容（必須）')).toHaveValue('送信処理の検証');
  await send.click();await expect(page.getByRole('status')).toHaveText('お問い合わせを受け付けました。');
  await expect(page.getByLabel('お問い合わせ内容（必須）')).toHaveValue('');
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toMatchObject({subject:'Health Data Vault からのお問い合わせ',name:'フォームテスト',email:'test@example.com',category:'表示について',message:'送信処理の検証',botcheck:false});
  expect(bodies[0]).not.toHaveProperty('form-name');
  await expect(page.locator('[data-netlify]')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('contact.png'),fullPage:true});
});

test('contact review and exportReview cannot submit',async({page})=>{
  let sent=0;await page.route('https://api.web3forms.com/**',r=>{sent++;return r.abort();});
  for(const query of ['?review','?exportReview']){
    await page.goto(site+'contact/'+query);
    await expect(page.getByRole('button',{name:'送信する',exact:true})).toBeDisabled();
  }
  expect(sent).toBe(0);
});
