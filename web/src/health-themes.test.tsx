import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {healthThemes,themeChoices,resolveThemeSelection,groupPresentation} from './health-themes';
import {HealthThemeMenu} from './health-theme-menu';
import type {Indicator,IndicatorGroup} from './model';
const groups=['metabo','doctor_judgment','guidance'].map(group_id=>({group_id,name:group_id,categories:[{indicator_id:group_id+'_one'}]})) as IndicatorGroup[];
const catalog=groups.map(g=>({indicator_id:g.categories[0].indicator_id})) as Indicator[];
describe('health theme navigation',()=>{
 it('preserves every existing theme URL and blocks the three future themes',()=>{
  const current=[...catalog,...['bp_referral','lipid_people','liver','glucose_people'].map(indicator_id=>({indicator_id} as Indicator))];
  for(const [theme,id] of [['overall','group:metabo'],['blood-pressure','bp_referral'],['lipids','lipid_people'],['liver','liver'],['glucose','glucose_people']]){
   expect(resolveThemeSelection(theme,id,'group:metabo',groups,current)).toEqual({themeId:theme,indicatorId:id});
  }
  expect(healthThemes.filter(t=>t.status==='planned').map(t=>t.id)).toEqual(['renal-urinary','detailed','other']);
  for(const t of healthThemes.filter(t=>t.status==='planned'))expect(themeChoices(t,groups,current).ids).toEqual([]);
 });
 it('defaults to overall and preserves each existing group and single indicator link',()=>{
  expect(resolveThemeSelection(null,null,'group:metabo',groups,catalog)).toEqual({themeId:'overall',indicatorId:'group:metabo'});
  for(const g of groups)for(const id of ['group:'+g.group_id,g.categories[0].indicator_id])expect(resolveThemeSelection('blood-pressure',id,'group:metabo',groups,catalog)).toEqual({themeId:'overall',indicatorId:id});
 });
 it('never exposes planned themes even if a catalog happens to contain their names',()=>{
  for(const t of healthThemes.slice(1))expect(themeChoices(t,groups,catalog).ids).toEqual([]);
  expect(resolveThemeSelection('unknown','made-up','group:metabo',groups,catalog).indicatorId).toBe('group:metabo');
 });
 it('filters another available theme strictly by membership and release availability',()=>{
  const theme={...healthThemes[0],id:'test',groupIds:['guidance']};
  expect(themeChoices(theme,groups,catalog).ids).toEqual(['group:guidance','guidance_one']);
  expect(themeChoices(theme,groups,[]).ids).toEqual([]);
 });
 it('renders eight ordered themes without unpublished choices',()=>{
  const html=renderToStaticMarkup(<HealthThemeMenu selected="overall" groups={groups} catalog={catalog} onSelect={()=>{}}/>);
  expect(html.match(/disabled=""/g)).toHaveLength(7);
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(healthThemes.map(t=>t.label)).toEqual(['総合判定','血圧','脂質代謝','肝機能','糖代謝','腎・尿路系','詳細な健診項目','その他の健診項目']);
  expect(html).not.toMatch(/BMI|腹囲/);
  for(const t of healthThemes)expect(html).toContain(t.label);
  expect(html.match(/準備中/g)).toHaveLength(7);
 });
 it('keeps current composition presentation explicit without granting comparison permission',()=>{
  for(const g of groups)expect(groupPresentation[g.group_id].visualizationType).toBe('composition');
  expect(groupPresentation['unpublished']).toBeUndefined();
 });
});
