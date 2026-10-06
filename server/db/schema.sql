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
  outcome    ENUM('success','failure','cancelled') NULL COMMENT 'Discord 명령 사용 결과: success=성공, failure=실패, cancelled=취소 ([command] 로그에만 값이 있고 나머지는 NULL)',
  durationMs INT          NULL     COMMENT 'Discord 명령 처리 시간(ms, 확인 버튼 대기 시간 제외). [command] 로그에만 값이 있음',
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

CREATE TABLE IF NOT EXISTS access_logs (
  id        INT          NOT NULL AUTO_INCREMENT COMMENT '접속 로그 고유 번호',
  loggedAt  DATETIME(3)  NOT NULL COMMENT '로그인 시도 시각, 한국 시간(KST)',
  username  VARCHAR(64)  NOT NULL COMMENT '로그인 화면에 입력한 아이디 (게스트 버튼은 guest)',
  success   TINYINT(1)   NOT NULL COMMENT '로그인 성공 여부 (1=성공, 0=실패)',
  method    ENUM('password','guest','session') NOT NULL COMMENT '로그인 방식 (password=아이디/비밀번호, guest=게스트 버튼, session=저장된 로그인으로 다시 접속)',
  ip        VARCHAR(45)  NOT NULL COMMENT '접속자 IP (Cloudflare 뒤 실제 접속자 IP, IPv6 포함 최대 45자)',
  country   VARCHAR(2)   NULL     COMMENT '접속자 국가 코드 (CF-IPCountry, 알 수 없으면 NULL)',
  os        VARCHAR(64)  NOT NULL COMMENT '운영체제 (User-Agent 해석 결과)',
  browser   VARCHAR(64)  NOT NULL COMMENT '웹 브라우저와 주 버전 (User-Agent 해석 결과)',
  device    VARCHAR(16)  NOT NULL COMMENT '기기 종류 (desktop, mobile, tablet, tv, unknown)',
  userAgent VARCHAR(512) NOT NULL COMMENT 'User-Agent 원문 (최대 512자, 관리자에게만 표시)',
  PRIMARY KEY (id),
  KEY idx_access_logs_logged_at (loggedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='로그인 시도(성공/실패) 접속 기록. 비밀번호는 저장하지 않음';
