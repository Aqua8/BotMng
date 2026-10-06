/** 시스템 상태 화면용 표기 도우미 */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString("ko-KR")}B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)}${units[i]}`;
}

/** 가동 시간: 큰 단위 두 개까지. 예) 14초, 2분 5초, 1시간 1분, 1일 1시간 */
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

/** 얼마 전인지. 1초 미만이거나 미래 시각이면 "방금" */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const sec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (sec < 1) return "방금";
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}
