# BotMng

[ScheduleAlertBot](https://github.com/Aqua8/ScheduleAlertBot)(Discord 일정 알림 봇)이 남기는 `out.log`, `error.log`를 DB에 저장하고, 웹 화면에서 조회·검색·실시간으로 확인하는 관제 서비스입니다.

## 주요 기능

- **로그 수집**: 봇의 `out.log` / `error.log`를 1초 간격으로 읽어(tail) MariaDB에 저장. 재시작해도 읽던 위치부터 이어서 읽고, 스택트레이스는 한 건으로 합칩니다.
- **로그 조회**: **CSV 내보내기**(관리자만, 현재 필터·정렬 기준, 최대 5만 건), 행을 누르면 전체 메시지를 대화상자로 보고 복사, 빠른 기간 선택(최근 1시간/오늘/24시간/7일, 한국 시간 기준 — 접속 로그에도 있음), 파일(out/error), 레벨(info/warn/error), 태그, 메시지 검색, 기간 필터, 번호 페이지네이션(5/10/20/50/100건, 기본 20건, 총 건수 표시)과 열 정렬. 실시간은 최신순 1페이지에서만 반영하고 페이지·정렬을 바꾸면 자동으로 꺼짐
- **실시간 스트리밍**: 새 로그를 SSE로 화면에 즉시 표시 (켜기/끄기, 끊기면 자동 재연결)
- **대시보드**: **시스템 상태**(DB 연결·응답 시간·로그 건수·크기, 수집기의 읽은 위치·지연·마지막 확인·마지막 오류), 최근 24시간 한 줄 요약(에러 기준), **접속 요약**(접속 수·성공/실패·고유 접속자·방식별·국가별), **Discord 명령 사용 통계**(기간 24시간/7일/30일 선택, 사용 횟수·실패율·평균 처리시간과 명령별 횟수/성공/실패/취소/평균/최대), 마지막 로그·봇 시작 시각, 시간대별 로그 양과 봇의 예약 발송 시각을 한 띠에 보여주는 "하루 시계", 태그별 건수, 최근 경고·에러
- **인증**: JWT 로그인. 관리자(`admin`) 1개 + 읽기 전용 게스트(`guest`) 1개. 로그인 화면의 **"게스트로 로그인" 버튼**으로 비밀번호 없이 게스트로 들어갈 수 있음
- **다크/라이트 테마**: 사이드바와 로그인 화면의 해/달 버튼으로 전환. 처음에는 시스템 설정을 따르고, 토글하면 선택을 브라우저(localStorage)에 계속 저장
- **접속 로그**: 로그인 시도(성공/실패)와, 저장된 로그인으로 화면을 다시 연 재접속(같은 접속자는 1시간에 한 번만)의 시각, 아이디, IP, 국가, OS, 브라우저, 기기를 저장하고 화면에서 조회. 게스트에게는 IP(앞 두 칸만 표시, 예: `203.0.***.***`), User-Agent 원문, 실패한 시도의 아이디를 서버에서 가려서 내려보냄
- **접속 안내·동의 모달**: 접속하면 서비스 소개와 접속 정보 수집 안내 모달을 띄우고, 동의해야 로그인/게스트 버튼을 쓸 수 있음. "24시간 동안 보지 않기"를 체크하고 동의하면 브라우저에 24시간(localStorage), 체크 없이 동의하면 탭을 닫을 때까지(sessionStorage) 기억하며, 동의가 없으면 다시 모달을 띄움 (동의 여부는 화면에서만 막고 서버가 검증하지는 않음)
- **보관 정책**: 365일이 지난 봇 로그는 매일 03:30에, 접속 로그는 매일 03:40에 자동 삭제
- **안정성**: 수집기는 로그 저장과 읽은 위치 기록을 한 트랜잭션으로 묶고, 읽은 위치가 되돌아가 이미 저장된 항목을 다시 읽어도 중복은 건너뛰고 스스로 복구함
- **외부 접속**: Cloudflare 프록시 → HTTPS 직접 서빙, 로그인 시도 횟수 제한

## 왜 봇과 별도 서비스로 만들었나

관제 기능을 ScheduleAlertBot 안에 넣을 수도 있었지만, 일부러 분리했습니다.

- **봇은 가볍게 유지**: 봇은 간단한 설정(`.env`)만 조금 바꾸면 누구나 가져다 쓸 수 있는 상태로 두고 싶었습니다. DB, 웹 서버, 인증 같은 관제용 구성이 들어가면 설치와 설정이 무거워지고, 봇만 쓰려는 사람에게는 불필요한 부담이 됩니다.
- **봇 쪽 변경은 최소로**: 봇에는 로그 앞에 시각과 레벨을 붙이는 `src/logger.ts` 하나만 추가했습니다. 수집, 저장, 화면은 모두 이 저장소가 로그 파일을 읽는 방식으로 처리해서 봇의 코드와 의존성이 늘지 않습니다.
- **새로운 기술을 써보고 싶었음**: 관제 수집기와 웹 화면은 NestJS, TypeORM, MariaDB, React, SSE, JWT 같은 기술을 직접 써보는 기회로 삼았습니다. 봇은 단순함을 지키고, 이쪽에서 자유롭게 시도하는 구조입니다.

## 구조

```
ScheduleAlertBot ──(console)──▶ data/out.log, data/error.log
                                        │ tail (1초)
                                        ▼
브라우저 ◀──HTTPS──▶ Cloudflare ◀──▶ BotMng (NestJS) ──▶ MariaDB
   ▲  React 화면 + REST API + SSE ─────┘
```

NestJS 서버 하나가 REST API와 빌드된 React 화면(`web/dist`)을 함께 서빙합니다.

```
BotMng/
├── server/            NestJS 백엔드
│   ├── db/            schema.sql (테이블 정의, 직접 관리)
│   └── src/
│       ├── auth/      JWT 로그인, 게스트 로그인, 재접속 기록, 계정 시드, 로그인 횟수 제한, 접속자 IP 판별
│       ├── access-log/ 접속 로그 저장·조회·집계, User-Agent 해석, 역할별 IP 마스킹
│       ├── health/    DB·수집기 상태 판정 (/api/health)
│       ├── common/    페이지·정렬 규칙
│       └── logs/      파서, 수집기(중복 건너뛰기), 조회/통계/CSV API, SSE, 보관 기간 정리
├── web/               React 프론트엔드 (관제 콘솔 디자인, Radix Themes)
│   └── src/
│       ├── components/ 공통 컴포넌트 (DataTable, Pagination, FilterSelect, QuickRange, PeriodSelect, 배지, 패널 등)
│       ├── hooks/      useTableQuery (페이지·정렬 상태를 가진 서버 페이지네이션 테이블)
│       ├── lib/        순수 함수와 단위 테스트 (페이지 번호, 빠른 기간, 처리시간·상태 표기)
│       └── theme.tsx   다크/라이트 상태와 토글
├── launchd/           macOS 상시 구동 설정 템플릿 (com.botmng.plist.example)
├── plan.md            기획·결정 사항·진행 현황·운영 메모
└── CLAUDE.md          작업 지침
```

## 기술 스택

| 구분 | 기술 | 버전 |
|---|---|---|
| 런타임 | Node.js | 24.13.0 |
| 언어 | TypeScript | 5.9.3 |
| DB | MariaDB | 11.7.2 |
| 백엔드 프레임워크 | NestJS (`common`, `core`, `platform-express`) | 12.1.2 |
| ORM | TypeORM | 1.1.1 |
| DB 드라이버 | mysql2 | 3.24.5 |
| 인증 | `@nestjs/jwt` 12.0.2, `@nestjs/passport` 12.0.0, passport 0.7.0, passport-jwt 4.0.1 | |
| 비밀번호 해시 | bcryptjs | 3.0.3 |
| User-Agent 해석 | bowser | 2.14.1 |
| 로그인 제한 | `@nestjs/throttler` | 6.7.1 |
| 스케줄 | `@nestjs/schedule` | 12.0.2 |
| 설정 | `@nestjs/config` | 12.0.1 |
| 정적 서빙 | `@nestjs/serve-static` | 12.0.0 |
| 입력 검증 | class-validator 0.15.1, class-transformer 0.5.1 | |
| 반응형 스트림 | rxjs | 7.8.2 |
| 테스트 | Jest 30.5.2, ts-jest 29.4.14 | |
| 프론트엔드 | React / React DOM | 19.3.0 |
| 번들러 | Vite 8.3.3, `@vitejs/plugin-react` 6.1.2 | |
| UI 컴포넌트 | Radix Themes 3.3.0, Radix Icons 1.3.2 | |
| 글꼴 | IBM Plex Sans KR(화면 전체), IBM Plex Mono(로그 줄) — `@fontsource/*` 5.3.0으로 함께 배포 | |
| 상시 구동 | launchd (macOS) | |
| 외부 접속 | Cloudflare 프록시 + Origin 인증서 | |

> TypeScript는 ts-jest 호환을 위해 5.x로 고정했습니다 (TypeScript 7은 ts-jest가 지원하지 않음).

## 로그 형식

ScheduleAlertBot이 출력 앞에 한국 시간과 레벨을 붙입니다. 이 형식을 바꾸면 `server/src/logs/log-parser.ts`도 함께 바꿔야 합니다.

```
2026-10-06T15:00:00.000+09:00 INFO [daily] 발송 완료 (1건)
```

- 시각은 `Z` 또는 `±HH:MM`을 받아들이고, DB에는 **KST로 저장**합니다. 화면에서도 KST로 표시합니다.
- `[태그]`는 메시지 앞부분에서 추출해 태그 필터에 씁니다.
- 타임스탬프가 없는 이전 형식의 로그는 파일 수정 시각을 시각으로 저장하고, 줄마다 독립 항목으로 처리합니다.
- **Discord 명령 사용 로그**(`[command]`)는 결과와 처리 시간을 별도 컬럼으로 분리해 저장합니다. 처리 시간은 확인 버튼을 기다린 시간을 뺀 값입니다.

```
2026-10-06T21:44:52.251+09:00 INFO [command] /일정추가 성공 (10558ms)
2026-10-06T21:44:52.251+09:00 WARN [command] /일정추가 실패 (80ms): Google API 오류(403)
→ message "[command] /일정추가: Google API 오류(403)", outcome failure, durationMs 80
```

  `outcome`은 `success`/`failure`/`cancelled`, `durationMs`는 ms 값이며, 명령 로그가 아닌 줄은 둘 다 `NULL`입니다. 형식이 다른 `[command]` 줄은 건드리지 않습니다. 화면의 로그 테이블에는 "결과"(배지)와 "처리시간"(`80ms`, `10.6초`, `1분 5초`) 열로 보이고 둘 다 정렬할 수 있습니다.

## API

모두 `/api` 아래에 있고, 로그인을 제외하면 `Authorization: Bearer <token>`이 필요합니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/login` | 로그인 → JWT (12시간). IP당 분당 10회 제한 |
| POST | `/api/auth/resume` | 저장된 로그인으로 화면을 열었음을 알림 → 접속 로그에 `session`으로 기록(같은 계정·IP·브라우저의 성공 기록이 1시간 안에 있으면 생략). 토큰 검증도 겸함(만료면 401). IP당 분당 10회 제한 |
| POST | `/api/auth/guest` | 게스트 버튼. 비밀번호 없이 읽기 전용 게스트 토큰 발급. IP당 분당 10회 제한(로그인과 별도 집계) |
| GET | `/api/auth/me` | 현재 사용자 |
| GET | `/api/logs` | 목록. `source`, `level`, `tag`, `q`, `from`, `to` 필터 + `page`, `pageSize`(5/10/20/50/100, 기본 20), `sort`(`loggedAt`/`level`/`source`/`tag`/`outcome`/`durationMs`), `order`(`asc`/`desc`). 응답 `{ items, total, page, pageSize }` |
| GET | `/api/logs/export.csv` | **관리자만**(게스트는 403). `/api/logs`와 같은 필터·정렬(`source`, `level`, `tag`, `q`, `from`, `to`, `sort`, `order`)로 CSV 내려받기. 최대 50,000건(넘으면 `X-Truncated: true`), `X-Row-Count` 헤더. UTF-8 BOM, `= + - @`로 시작하는 셀은 앞에 `'`를 붙여 CSV 인젝션 방지 |
| GET | `/api/logs/tags` | 존재하는 태그 목록 |
| GET | `/api/logs/stream` | 새 로그 SSE (`event: log`, 25초마다 `ping`) |
| GET | `/api/health` | DB와 로그 수집기 상태. `status`(ok/warn/error)와 `issues`, DB(응답 시간, 건수, 크기), 파일별 수집 상태. DB가 죽어도 응답함(JWT 인증은 DB를 쓰지 않음). 로컬 파일 경로·오류 메시지는 포함하지 않고 오류는 종류 이름만 |
| GET | `/api/stats` | 대시보드 통계 |
| GET | `/api/stats/access` | 접속 요약. `days`(1/7/30, 기본 7). 접속 수, 성공/실패, 고유 접속자(성공한 접속의 서로 다른 IP 수), 방식별, 국가별 상위 8개. IP는 개수로만 세고 응답에 넣지 않으므로 게스트도 조회 가능 |
| GET | `/api/stats/commands` | Discord 명령 사용 통계. `days`(1/7/30, 기본 7). 응답 `{ days, total, success, failure, cancelled, avgMs, byCommand }`. `/비서`는 해석된 동작별(`/비서(일정삭제)`)로 따로 집계. 게스트도 조회 가능 |
| GET | `/api/access-logs` | 접속 로그 목록. `success`, `method`(`password`/`guest`/`session`), `from`, `to` 필터 + `page`, `pageSize`, `sort`(`loggedAt`/`username`/`success`/`method`/`ip`/`country`/`os`/`browser`/`device`), `order`. 게스트에게는 IP 마스킹, User-Agent·실패한 시도의 아이디 제외, `ip`·`username` 정렬은 400 |

목록은 기본이 시각 내림차순(최신순)이고, 정렬 열은 서버가 허용한 이름만 받으며 같은 값끼리는 `id`로 순서를 고정합니다. 게스트가 가려진 값(IP, 계정)으로 정렬하면 순서로 숨긴 값을 유추할 수 있어 막았습니다.

## 설치와 실행

### 1. MariaDB 준비

DB와 전용 유저를 만듭니다 (root 권한으로 1회). 비밀번호는 직접 정하세요.

```sql
CREATE DATABASE IF NOT EXISTS botmng CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'botmng'@'localhost' IDENTIFIED BY '<비밀번호>';
GRANT ALL PRIVILEGES ON botmng.* TO 'botmng'@'localhost';
FLUSH PRIVILEGES;
```

DB 포트는 이 서버 안에서만 쓰므로 **외부에 열지 않습니다.** 공인 IP를 가진 서버라면 특히 중요합니다. Homebrew MariaDB 기준으로 `my.cnf.d` 아래에 설정 파일을 두고 재시작합니다.

```bash
printf '[mysqld]\nbind-address = 127.0.0.1\n' > /opt/homebrew/etc/my.cnf.d/bind-local.cnf
brew services restart mariadb
lsof -iTCP:3306 -sTCP:LISTEN -n -P   # 127.0.0.1:3306 으로만 나와야 함
```

MySQL Workbench 같은 도구도 같은 서버에서 `127.0.0.1:3306`으로 접속합니다.

그다음 테이블을 만듭니다. 서버는 테이블을 자동으로 만들거나 고치지 않으므로(TypeORM `synchronize` 끔) **스키마는 SQL 파일로 직접 관리**합니다. 여러 번 실행해도 안전합니다.

```bash
mariadb -ubotmng -p botmng < server/db/schema.sql
```

스키마를 바꿀 때는 `server/db/schema.sql`과 `server/src`의 엔티티를 함께 고치고 DB에도 직접 반영합니다. 모든 테이블과 컬럼에는 `COMMENT`(설명)가 달려 있어 Workbench 등에서 바로 확인할 수 있습니다.

### 2. 환경 변수

`server/.env.example`을 `server/.env`로 복사해 채웁니다.

| 변수 | 설명 |
|---|---|
| `PORT` | 서버 포트 (HTTPS 직접 서빙 시 443) |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MariaDB 접속 정보 |
| `BOT_OUT_LOG` `BOT_ERROR_LOG` | 봇 로그 파일의 절대 경로 |
| `JWT_SECRET` | JWT 서명 키 (충분히 긴 랜덤 값) |
| `ADMIN_PASSWORD` `GUEST_PASSWORD` | `admin` / `guest` 비밀번호. 바꾸고 재시작하면 반영 |
| `TLS_CERT_PATH` `TLS_KEY_PATH` | (선택) 설정하면 `0.0.0.0`으로 HTTPS 서빙, 비우면 `127.0.0.1` HTTP |

### 3. 빌드와 실행

```bash
(cd web && npm i && npm run build)
(cd server && npm i && npm run build)
cd server && npm start
```

개발 중에는 서버 `npm run dev`, 화면 `cd web && npm run dev`(5173, `/api`는 3000으로 프록시)를 씁니다.

### 4. 테스트

```bash
cd server && npm test
```

로그 파서, 수집기 중복 건너뛰기, 페이지 계산·정렬 허용 규칙, 접속자 IP·국가 판별(Cloudflare 대역 신뢰), User-Agent 해석, IP 마스킹, 역할별 응답(게스트에게 가려지는 값), 명령·접속 통계 집계, 상태 판정, CSV 이스케이프 단위 테스트(91개)가 있습니다. NestJS 12가 ESM 전용이라 컨트롤러·서비스는 Jest에서 직접 불러오지 못해, Nest와 무관한 순수 함수로 분리해 테스트합니다. 웹의 순수 함수(페이지 번호, 빠른 기간, 표기 함수; 18개)는 Node 내장 테스트로 `cd web && npm test`를 실행합니다.

## 상시 구동 (launchd)

```bash
# 템플릿의 자리표시자를 실제 경로로 채워 설치 (실제 값이 든 plist는 Git에 올리지 않음)
sed -e "s#__PROJECT_DIR__#$(pwd)#g" -e "s#__NODE_BIN_DIR__#$(dirname "$(which node)")#g" \
  launchd/com.botmng.plist.example > ~/Library/LaunchAgents/com.botmng.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.botmng.plist

# 코드 수정 후 반영
(cd server && npm run build) && launchctl kickstart -k gui/$(id -u)/com.botmng

# 제거
launchctl bootout gui/$(id -u)/com.botmng
```

`KeepAlive`로 비정상 종료 시 자동 재시작하며, 서버 로그는 `server/logs/`에 쌓입니다. 템플릿의 `__NODE_BIN_DIR__`, `__PROJECT_DIR__`는 위 `sed` 명령이 채웁니다.

## 외부 접속 (Cloudflare 프록시, 터널 없음)

1. Cloudflare DNS에 A 레코드(프록시 켬)를 이 서버의 공인 IP로 등록
2. SSL/TLS → Origin Server에서 Origin 인증서를 발급해 `server/certs/origin.pem`, `origin.key`로 저장 (Git 제외, 키 파일 권한 600)
3. SSL/TLS 모드를 **Full (strict)** 로 설정
4. `.env`에 `PORT=443`, `TLS_CERT_PATH`, `TLS_KEY_PATH` 설정 후 서비스 재시작
5. 공유기 뒤에 있다면 외부 443 → 서버 443 포트포워딩

## 보안

- 모든 조회 API는 JWT 필수, 비밀번호는 bcrypt 해시로 저장, 입력은 class-validator로 검증
- 게스트는 조회만 가능 (현재 API가 모두 조회용). **게스트 버튼이 있으므로 누구나 로그 화면을 볼 수 있음** — 로그 메시지에 공개하기 곤란한 내용이 없는지 주의
- CSV 내보내기는 관리자만 가능(서버에서 403)하고, 내용이 수식으로 실행되지 않도록 `= + - @`·탭·CR로 시작하는 셀은 앞에 `'`를 붙임
- 로그인은 접속자 IP당 분당 10회로 제한. `CF-Connecting-IP`는 접속 소켓이 **Cloudflare IP 대역일 때만** 신뢰해 헤더 위조로 제한을 피할 수 없음 (`server/src/auth/client-ip.ts`, 대역 변경 시 갱신 필요)
- 접속 로그에는 IP 같은 접속 정보가 저장됨. **비밀번호는 저장하지 않으며**, 게스트에게는 IP 앞 두 칸만 보이고 User-Agent 원문과 실패한 시도의 아이디는 보이지 않음 (가리는 처리는 화면이 아니라 서버에서 하므로 원본이 응답에 실리지 않음). 수집 사실은 접속 시 모달로 안내하고 동의를 받음
- DB 포트(3306)는 `bind-address = 127.0.0.1`로 로컬에서만 열려 있어 인터넷에 노출되지 않음
- TLS 인증서를 설정하지 않으면 `127.0.0.1`에서만 받아 실수로 HTTP가 외부에 열리지 않음
- `.env`, 인증서, 서버 로그, 실제 경로가 든 plist는 Git에서 제외. 비밀번호·키·IP·도메인·로컬 경로 같은 값은 `.env`나 로컬 파일에만 두고 저장소에는 올리지 않음

## 알려진 한계

- 폴링 경계에 걸린 스택트레이스는 두 항목으로 나뉠 수 있음
- 접속 정보 수집 동의는 화면(모달)에서만 막으며 서버가 검증하지 않음. 동의 기록도 서버에 저장하지 않음 (API를 직접 호출하면 모달 없이 로그인 가능)
- 서버 IP로 Cloudflare를 거치지 않고 직접 접속하는 것은 막지 않음 (로그인과 횟수 제한은 적용됨)
- 공인 IP가 바뀌면 DNS 레코드를 갱신해야 함

자세한 결정 배경, 진행 현황, 나중에 할 일은 [plan.md](plan.md)를 참고하세요.
