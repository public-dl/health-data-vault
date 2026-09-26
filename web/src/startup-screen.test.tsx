import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {StartupScreen} from './startup-screen';
import {healthThemes} from './health-themes';
import {indexable} from './seo';

it('renders navigation and an accessible data-free shell before a release arrives',()=>{
 const html=renderToStaticMarkup(<StartupScreen base="/health-data-vault/"/>);
 expect(html).toContain('Health Data Vault');expect(html).toContain('健康テーマを選ぶ');
 expect(html).toContain('aria-busy="true"');expect(html).toContain('role="status"');
 expect(html).toContain('href="/health-data-vault/learn/"');
 expect(html.match(/<button[^>]*disabled/g)).toHaveLength(8);
 expect(html).not.toMatch(/113,771|19\.3%|data-export-surface/);
});
it('preserves a readable failure state without replacing rejected data',()=>{
 const html=renderToStaticMarkup(<StartupScreen error="公開データのハッシュが一致しません"/>);
 expect(html).toContain('role="alert"');expect(html).toContain('未検証・未承認');
 expect(html).toContain('健康テーマ');expect(html).not.toContain('data-export-surface');
});
it('keeps theme subtitles concise without modifying indicator memberships',()=>{
 expect(healthThemes.map(t=>t.description).join(' ')).not.toMatch(/実人員|予定：|報告人数|原表/);
 expect(healthThemes.find(t=>t.id==='lipids')!.indicatorIds).toContain('lipid_people');
 expect(healthThemes.find(t=>t.id==='glucose')!.indicatorIds).toContain('glucose_people');
 expect(healthThemes.filter(t=>t.status==='planned')).toHaveLength(3);
});
it('requires configured production and rejects review key presence regardless of value',()=>{
 const site='https://health-data-vault.netlify.app/';
 expect(indexable(site,'production','https://health-data-vault.netlify.app','')).toBe(true);
 for(const query of ['?review','?review=','?review=0','?exportReview','?exportReview=false'])expect(indexable(site,'production','https://health-data-vault.netlify.app',query)).toBe(false);
 for(const context of ['development','deploy-preview','branch-deploy',''])expect(indexable(site,context,'https://health-data-vault.netlify.app','')).toBe(false);
 expect(indexable(site,'production','http://localhost:4217','')).toBe(false);
 expect(indexable('','production','https://health-data-vault.netlify.app','')).toBe(false);
});
