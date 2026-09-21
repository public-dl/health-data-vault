import React from 'react';

/** Shared presentation; callers supply only the indicator-specific explanation. */
export function DataNotes({children,group=false}:{children:React.ReactNode;group?:boolean}) {
 return <aside className={`insight${group?' group-notes':''}`}><span className="eyebrow">DATA NOTES</span><h3>データの見どころ</h3><span className="tag">検証値による定型説明</span>{children}</aside>;
}
