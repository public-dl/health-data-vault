import React from 'react';

export type ExportSurfaceKind='summary-card'|'map-card'|'table-card'|'pictogram-card'|'graph-card';

/** Only the visible deliverable belongs here. Source dialogs live outside this boundary. */
export function ExportSurface({kind,children,...props}:React.ComponentPropsWithoutRef<'article'>&{kind:ExportSurfaceKind}) {
 return <article {...props} data-export-surface={kind}>{children}</article>;
}

/** Fail closed: never fall back to a section or an arbitrary parent wrapper. */
export function exportSurfaceFor(element:Element):Element {
 const surface=element.closest('[data-export-surface]');
 if(!surface)throw new Error('画像出力の対象カードが定義されていません');
 return surface;
}
