/** 처리 시간을 사람이 읽기 쉽게: 1초 미만은 ms, 1분 미만은 소수점 한 자리 초, 그 이상은 분과 초. 예) 80ms, 10.6초, 1분 5초 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 59_950) return `${(ms / 1000).toFixed(1)}초`; // 59.95초부터는 반올림하면 60.0초가 되므로 분 표기로 넘긴다
  const totalSeconds = Math.round(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초`;
}
