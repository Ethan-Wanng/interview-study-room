export const dayThemes=[
 {id:'midnight',zh:'午夜',en:'Midnight',start:0,end:5,dark:true},
 {id:'dawn',zh:'破晓',en:'Dawn',start:5,end:6,dark:false},
 {id:'sunrise',zh:'日出',en:'Sunrise',start:6,end:7,dark:false},
 {id:'morning',zh:'早晨',en:'Morning',start:7,end:9,dark:false},
 {id:'forenoon',zh:'上午',en:'Forenoon',start:9,end:12,dark:false},
 {id:'noon',zh:'中午',en:'Noon',start:12,end:14,dark:false},
 {id:'afternoon',zh:'下午',en:'Afternoon',start:14,end:17,dark:false},
 {id:'dusk',zh:'暮色',en:'Dusk',start:17,end:18,dark:false},
 {id:'twilight',zh:'薄暮',en:'Twilight',start:18,end:19,dark:true},
 {id:'evening',zh:'夜晚',en:'Evening',start:19,end:21,dark:true},
 {id:'night',zh:'深夜',en:'Night',start:21,end:24,dark:true},
];
export function timeTheme(date=new Date()){const h=date.getHours()+date.getMinutes()/60;return dayThemes.find(t=>h>=t.start&&h<t.end)!.id}
export function validTheme(value:string|null){if(value==='day')return 'forenoon';return value==='auto'||dayThemes.some(t=>t.id===value)?value!:'auto'}
// 灯光模式与时间主题相互独立、可以同时生效：开灯 = 该时段配色的亮色版本，关灯 = 暗色版本。
// 没有手动选过时，沿用该时段本来的明暗（白天亮、夜里暗）。
export type Lamp='on'|'off';
export const validLamp=(value:string|null):Lamp|null=>value==='on'||value==='off'?value:null;
export const naturalLamp=(id:string):Lamp=>dayThemes.find(t=>t.id===id)?.dark?'off':'on';
