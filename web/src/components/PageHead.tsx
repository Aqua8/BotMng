import { ReactNode } from "react";

/** 페이지 제목과 한 줄 설명. 설명 앞에 램프 같은 요소를 둘 수 있고, 아래에 보조 정보(children)를 붙일 수 있다. */
export function PageHead({ title, lede, lead, children }: { title: string; lede: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <p className="lede">
        {lead}
        <span>{lede}</span>
      </p>
      {children}
    </div>
  );
}
