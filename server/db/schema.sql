-- BotMng 스키마. 서버는 테이블을 자동으로 만들거나 고치지 않으므로(TypeORM synchronize 끔),
-- 스키마를 바꿀 때는 이 파일과 server/src 의 엔티티를 함께 고치고 DB에도 직접 반영한다.
-- 여러 번 실행해도 안전하다 (IF NOT EXISTS).  실행: mariadb -ubotmng -p botmng < server/db/schema.sql

-- 수집한 로그. loggedAt 은 한국 시간(KST)으로 저장한다.
CREATE TABLE IF NOT EXISTS log_entries (
  id         INT          NOT NULL AUTO_INCREMENT,
  source     ENUM('out','error')        NOT NULL,
  level      ENUM('info','warn','error') NOT NULL,
  tag        VARCHAR(64)  NULL,
  message    TEXT         NOT NULL,
  loggedAt   DATETIME(3)  NOT NULL,
  fileOffset BIGINT       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_log_entries_source_offset (source, fileOffset), -- 같은 줄을 두 번 저장하지 않도록
  KEY idx_log_entries_level (level),
  KEY idx_log_entries_tag (tag),
  KEY idx_log_entries_logged_at (loggedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 로그 파일별로 어디까지 읽었는지 (재시작 후 이어 읽기)
CREATE TABLE IF NOT EXISTS log_offsets (
  source   VARCHAR(8) NOT NULL,
  `offset` BIGINT     NOT NULL,
  PRIMARY KEY (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 계정. 서버가 시작할 때 .env 의 비밀번호로 admin/guest 를 맞춘다.
CREATE TABLE IF NOT EXISTS users (
  id           INT          NOT NULL AUTO_INCREMENT,
  username     VARCHAR(64)  NOT NULL,
  passwordHash VARCHAR(100) NOT NULL,
  role         ENUM('admin','guest') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
