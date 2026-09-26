import React,{useState} from 'react';
import './data-notes.css';
/** Independent, initially closed supplementary explanations. Content is unchanged. */
export function DataNotes({children,group=false}:{children:React.ReactNode;group?:boolean}) {
 const [open,setOpen]=useState(false);
 return <aside className={`insight data-notes${group?' group-notes':''}`}><details data-export-notes onToggle={e=>setOpen(e.currentTarget.open)}><summary aria-expanded={open}><span>データの見どころ</span><span className="notes-chevron" aria-hidden="true">⌄</span></summary><div className="notes-content"><span className="eyebrow">DATA NOTES</span><span className="tag">検証値による定型説明</span>{children}</div></details></aside>;
}
