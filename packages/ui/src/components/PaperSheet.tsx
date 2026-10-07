import type { ReactNode } from 'react';

/**
 * Review 4 #3 (answers §3, tech design §12.6): every paper-ground page (the paper, the council and its
 * slate, ballot and count, the cells and the ward) as a sheet on a desk on a wide screen. CSS only
 * (`paper-desk`, `paper-sheet` in tokens.css): under 960 px it is a pass-through; from 960 px the page
 * is a 720 px framed, shadowed sheet on a dark desk ground.
 */
export function PaperSheet({ children }: { children: ReactNode }) {
  return (
    <div className="paper-desk" data-testid="paper-desk">
      <div className="paper-sheet" data-testid="paper-sheet">
        {children}
      </div>
    </div>
  );
}
