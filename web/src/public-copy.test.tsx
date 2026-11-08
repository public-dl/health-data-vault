import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {publicText,comparisonText,populationSummary,populationLimit} from './public-copy';
import {presentationIndicator} from './visual-metadata';
import {Privacy} from './privacy';
import {operatorName} from './site-operator';
import {StartupScreen} from './startup-screen';
it('translates presentation copy while preserving source metadata and all permission fields',()=>{
 const raw={indicator_id:'test',description:'年度間比較はpendingです。',unit:'人',intervals:{'2022_2023':'pending'},capabilities:{count_only:true,map_mode:'none'}} as any;const before=structuredClone(raw),view=presentationIndicator(raw);expect(raw).toEqual(before);expect(view.description).toContain('増減比較はできません');expect(view.intervals).toEqual(raw.intervals);expect(view.capabilities).toEqual(raw.capabilities);expect(publicText('承認済みrelease・年度間comparability・pending')).not.toMatch(/pending|comparability|release/);expect(comparisonText('incompatible')).toContain('比較不可');
});
it('puts the actual population and scope limitation in the initial non-collapsed shell',()=>{const html=renderToStaticMarkup(<StartupScreen/>);expect(html).toContain(populationSummary);expect(html).toContain(populationLimit);expect(html).toContain('法定報告');expect(html).not.toContain('承認を確認後');});
it('names the selected operator and external services without inventing storage guarantees',()=>{const html=renderToStaticMarkup(<Privacy/>);expect(operatorName).toBe('public-dl（Health Data Vault運営）');for(const text of [operatorName,'Web3Forms','Googleアナリティクス4','G-QJCHVX2XEW','Cookie','https://web3forms.com/privacy','https://policies.google.com/privacy'])expect(html).toContain(text);expect(html).not.toMatch(/保存しません|一切保存|完全に匿名|必ず削除|同意したもの/);});
