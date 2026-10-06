import { Button, Dialog, Flex } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { LogEntry, formatStamp } from "./api";
import { LevelBadge, OutcomeBadge } from "./components/Badges";
import { formatDuration } from "./lib/format-duration";

/** 로그 한 건의 전체 내용. 표에서는 잘리거나 길게 늘어나는 스택트레이스를 그대로 읽고 복사할 수 있다. */
export function LogDetailDialog({ log, onClose }: { log: LogEntry | null; onClose: () => void }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  useEffect(() => setCopied("idle"), [log?.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(log!.message);
      setCopied("done");
    } catch {
      setCopied("failed"); // 클립보드 권한이 없는 환경
    }
  };

  return (
    <Dialog.Root open={log !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="720px" aria-describedby={undefined}>
        <Dialog.Title as="h2">로그 상세</Dialog.Title>
        {log && (
          <>
            <dl className="detail">
              <dt>번호</dt>
              <dd>{log.id}</dd>
              <dt>시각</dt>
              <dd>
                {formatStamp(log.loggedAt)} <span className="muted">(KST) · {log.loggedAt}</span>
              </dd>
              <dt>레벨</dt>
              <dd>
                <LevelBadge level={log.level} />
              </dd>
              <dt>파일</dt>
              <dd>{log.source}.log</dd>
              <dt>태그</dt>
              <dd>{log.tag ? <span className="tag">[{log.tag}]</span> : "-"}</dd>
              {log.outcome && (
                <>
                  <dt>결과</dt>
                  <dd>
                    <OutcomeBadge outcome={log.outcome} />
                  </dd>
                </>
              )}
              {log.durationMs !== null && (
                <>
                  <dt>처리시간</dt>
                  <dd>
                    {formatDuration(log.durationMs)} <span className="muted">({log.durationMs.toLocaleString("ko-KR")}ms)</span>
                  </dd>
                </>
              )}
            </dl>
            <pre className="detail-msg" aria-label="전체 메시지">
              {log.message}
            </pre>
          </>
        )}
        <Flex justify="end" align="center" gap="3" mt="4">
          {copied === "done" && <span className="muted">복사했습니다</span>}
          {copied === "failed" && <span className="error-text">복사하지 못했습니다 (브라우저 권한)</span>}
          <Button variant="soft" color="gray" onClick={copy}>
            메시지 복사
          </Button>
          <Dialog.Close>
            <Button>닫기</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
