import {appUrl} from './app-url';
import type {PublishedTable,Observation,TableCell} from './model';
export function tableLink(r:Observation,review:boolean){const p=new URLSearchParams({year:String(r.observation_fiscal_year),cell:r.source_cell});if(review)p.set('review','1');return appUrl('/tables/')+'?'+p;}
export function visualizationLink(table:PublishedTable,cell:TableCell,review:boolean){if(!cell.visualization)return null;const p=new URLSearchParams({year:String(table.source.observation_fiscal_year),region:cell.visualization.region,indicator:cell.visualization.indicator_id});if(review)p.set('review','1');return appUrl('/')+'?'+p+'#map';}
