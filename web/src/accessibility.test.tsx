import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {accessibleMapPalette,luminance} from './map-palette';
import {groupVisuals,indicatorColorAliases} from './visual-metadata';
import {PublicHeader} from './public-shell';
import {TablePeriod} from './table-period';
import {readFileSync} from 'node:fs';

it('separates map luminance steps while keeping source palettes, domains and data unchanged',()=>{
 const palettes=[...Object.values(groupVisuals).flatMap(g=>Object.values(g).map(v=>v.palette)),...Object.values(indicatorColorAliases).map(v=>v.palette),['#eee8f8','#61419a']];
 for(const palette of palettes){const before=[...palette],colors=accessibleMapPalette(palette),ls=colors.map(luminance);expect(palette).toEqual(before);expect(colors).toHaveLength(palette.length);expect(1.05/(ls[0]+.05)).toBeGreaterThan(1.5);
  for(let i=1;i<ls.length;i++){expect(ls[i-1]).toBeGreaterThan(ls[i]);expect((ls[i-1]+.05)/(ls[i]+.05)).toBeGreaterThan(1.7);}
 }
});
it('provides an early keyboard skip link and explicit actual table period',()=>{
 const header=renderToStaticMarkup(<PublicHeader analysis/>);expect(header.indexOf('本文へ移動')).toBeLessThan(header.indexOf('Health Data Vault'));
 expect(header).toContain('href="#main-content"');
 const period=renderToStaticMarkup(<TablePeriod years={[2022,2021,2022]} selected={2022}/>);expect(period).toContain('2021・2022年度');expect(period).toContain('選択中は2022年度');expect(period).not.toContain('2023');
});
it('keeps an actionable no-JavaScript fallback outside the app root',()=>{
 const html=readFileSync('index.html','utf8');expect(html.indexOf('JavaScriptが必要')).toBeLessThan(html.indexOf('id="root"'));expect(html).toContain('新潟県「にいがたの生活習慣病」の公開資料');
});
