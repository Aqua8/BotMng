/**
 * 이미 저장된 위치(fileOffset)의 항목을 뺀다. 수집기의 "읽은 위치"가 되돌아가면(백업 복원, 실수로 지운 경우 등)
 * 처음부터 다시 읽게 되는데, 이때 중복 항목 때문에 저장 전체가 롤백되어 읽은 위치가 영영 전진하지 못하고
 * 그 뒤의 새 로그도 저장되지 못하는 문제를 막는다. 중복은 건너뛰고 새 항목만 저장하면 스스로 복구된다.
 */
export function withoutStored<T extends { fileOffset: number }>(entries: T[], storedOffsets: Iterable<number>): T[] {
  const stored = new Set(storedOffsets);
  return entries.filter((e) => !stored.has(e.fileOffset));
}
