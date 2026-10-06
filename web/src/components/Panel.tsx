import { ReactNode } from "react";

/** 제목(과 오른쪽 보조 문구)이 있는 구역 */
export function Panel({ title, aside, id, children }: { title: string; aside?: ReactNode; id?: string; children: ReactNode }) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section className="panel" aria-labelledby={titleId}>
      <div className="panel-head">
        <h2 id={titleId}>{title}</h2>
        {aside && <span className="muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
