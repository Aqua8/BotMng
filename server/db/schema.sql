-- BotMng 스키마. 서버는 테이블을 자동으로 만들거나 고치지 않으므로(TypeORM synchronize 끔),
-- 스키마를 바꿀 때는 이 파일과 server/src 의 엔티티를 함께 고치고 DB에도 직접 반영한다.
-- 여러 번 실행해도 안전하다 (IF NOT EXISTS).  실행: mariadb -ubotmng -p botmng < server/db/schema.sql
-- 테이블/컬럼 설명(COMMENT)은 DB에도 저장된다 (Workbench 등에서 확인 가능).

CREATE TABLE IF NOT EXISTS log_entries (
  id         INT          NOT NULL AUTO_INCREMENT COMMENT '로그 고유 번호 (자동 증가, 최신순 정렬과 커서 페이지네이션 기준)',
  source     ENUM('out','error')         NOT NULL COMMENT '로그 파일 구분 (out=out.log, error=error.log)',
  level      ENUM('info','warn','error') NOT NULL COMMENT '로그 레벨',
  tag        VARCHAR(64)  NULL     COMMENT '메시지 앞의 [태그] 값, 예: daily, poll (태그가 없으면 NULL)',
  message    TEXT         NOT NULL COMMENT '로그 메시지 (스택트레이스처럼 이어지는 줄은 줄바꿈으로 합쳐 한 건)',
  loggedAt   DATETIME(3)  NOT NULL COMMENT '로그 발생 시각, 한국 시간(KST) (타임스탬프가 없는 옛 로그는 파일 수정 시각)',
  fileOffset BIGINT       NOT NULL COMMENT '로그 파일 안에서 이 항목이 시작하는 바이트 위치 (같은 줄 중복 저장 방지용)',
  PRIMARY KEY (id),
  UNIQUE KEY uq_log_entries_source_offset (source, fileOffset), -- 같은 줄을 두 번 저장하지 않도록
  KEY idx_log_entries_level (level),
  KEY idx_log_entries_tag (tag),
  KEY idx_log_entries_logged_at (loggedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ScheduleAlertBot의 out.log/error.log에서 수집한 로그 항목';

CREATE TABLE IF NOT EXISTS log_offsets (
  source   VARCHAR(8) NOT NULL COMMENT '로그 파일 구분 (out 또는 error)',
  `offset` BIGINT     NOT NULL COMMENT '해당 로그 파일에서 다음에 읽을 바이트 위치',
  PRIMARY KEY (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='수집기가 로그 파일별로 어디까지 읽었는지 (서버 재시작 후 이어 읽기용)';

CREATE TABLE IF NOT EXISTS users (
  id           INT          NOT NULL AUTO_INCREMENT COMMENT '계정 고유 번호',
  username     VARCHAR(64)  NOT NULL COMMENT '로그인 아이디 (admin, guest)',
  passwordHash VARCHAR(100) NOT NULL COMMENT '비밀번호 bcrypt 해시 (원문은 저장하지 않음)',
  role         ENUM('admin','guest') NOT NULL COMMENT '권한 (admin=관리자, guest=읽기 전용)',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='웹 화면 로그인 계정 (서버 시작 시 .env 의 비밀번호로 admin/guest 를 맞춤)';
