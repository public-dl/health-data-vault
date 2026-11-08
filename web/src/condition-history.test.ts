import {describe,it,expect} from 'vitest';
import {ConditionHistory,conditionURL,type Conditions} from './condition-history';

const initial:Conditions={theme:'overall',indicator:'group:metabo',year:2023,regions:['15'],measure:'rate'};
const start=new URL('https://example.test/health-data-vault/?review=1#map');
describe('condition history policy',()=>{
  it('normalizes the first entry, preserves unrelated URL state, and omits an absent region B',()=>{
    const h=new ConditionHistory();expect(h.write(start,initial)).toBe('replace');
    const url=conditionURL(start,initial);expect(url.hash).toBe('#map');expect(url.searchParams.get('review')).toBe('1');
    expect(h.write(url,initial)).toBeNull();
    const pair=conditionURL(url,{...initial,regions:['15202','15']});
    expect(conditionURL(pair,initial).searchParams.has('region2')).toBe(false);
    expect(start.searchParams.has('theme')).toBe(false);
  });
  it('pushes discrete changes and does not push during restoration, including same-condition anchors',()=>{
    const h=new ConditionHistory(),url=conditionURL(start,initial);h.write(url,initial);
    expect(h.write(url,{...initial,year:2022})).toBe('push');
    h.restore();expect(h.write(url,initial)).toBeNull();
    expect(h.write(url,{...initial,measure:'count'})).toBe('push');
    h.restore();expect(h.write(start,initial)).toBe('replace');
  });
  it('groups only a slider burst, leaving separate choices and separate gestures traversable',()=>{
    const h=new ConditionHistory();let url=conditionURL(start,initial);h.write(url,initial);
    h.mark('slider','first');expect(h.write(url,{...initial,year:2021})).toBe('push');url=conditionURL(url,{...initial,year:2021});
    h.mark('slider','first');expect(h.write(url,{...initial,year:2022})).toBe('replace');url=conditionURL(url,{...initial,year:2022});
    h.mark('slider','second');expect(h.write(url,initial)).toBe('push');
    h.endGroup();h.mark('slider','second');expect(h.write(url,initial)).toBe('push');
  });
  it('keeps playback in one entry across frames and starts a new group after stopping or restoring',()=>{
    const h=new ConditionHistory();let url=conditionURL(start,initial);h.write(url,initial);
    h.mark('playback');expect(h.write(url,{...initial,year:2021})).toBe('push');url=conditionURL(url,{...initial,year:2021});
    h.mark('playback');expect(h.write(url,{...initial,year:2022})).toBe('replace');url=conditionURL(url,{...initial,year:2022});
    h.endGroup();h.mark('playback');expect(h.write(url,initial)).toBe('push');
    h.restore();expect(h.write(url,{...initial,year:2022})).toBeNull();
    h.mark('playback');expect(h.write(url,initial)).toBe('push');
  });
});
