import type {IndicatorGroup} from './model';
import {allocateHundred} from './visual-metadata';

/** Navigation/display order only. Preserve source category order fields and definitions. */
export function presentationGroup(group:IndicatorGroup):IndicatorGroup {
  if(group.group_id!=='doctor_judgment')return group;
  const ids=['referral','guidance','normal'];
  if(group.categories.length!==ids.length||!ids.every(id=>group.categories.some(c=>c.category_id===id)))return group;
  return {...group,categories:ids.map(id=>group.categories.find(c=>c.category_id===id)!)};
}

/** Keep Hamilton tie-breaking in the original release order; move only the results. */
export function presentationAllocation(group:IndicatorGroup,source:IndicatorGroup,rates:(number|null)[]) {
  const originalRates=source.categories.map(c=>rates[group.categories.findIndex(x=>x.category_id===c.category_id)]);
  const allocation=allocateHundred(originalRates);
  return allocation&&group.categories.map(c=>allocation[source.categories.findIndex(x=>x.category_id===c.category_id)]);
}
