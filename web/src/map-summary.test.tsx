import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {MapSummary} from './map-summary';
import type {Observation} from './model';
it('shows selected values, category color and exact numerator/denominator',()=>{
 const record={value:71.5,derivation:{numerator_value:3080,denominator_value:4305}} as Observation;
 const html=renderToStaticMarkup(<MapSummary record={record} measure="rate" color="#df806b"/>);
 expect(html).toContain('71.5%');expect(html).toContain('3,080 / 4,305');expect(html).toContain('#df806b');
});
it('preserves zero and missing, and follows count/year record changes',()=>{
 const render=(record?:Observation)=>renderToStaticMarkup(<MapSummary record={record} measure="count"/>);
 expect(render({value:0,derived_rate:{numerator_value:0,denominator_value:100}} as Observation)).toContain('0 / 100');
 expect(render({value:4022,derived_rate:{numerator_value:4022,denominator_value:116311}} as Observation)).toContain('4,022 / 116,311');
 expect(render()).toContain('欠損 / 欠損');expect(render()).not.toContain('0人');
});
