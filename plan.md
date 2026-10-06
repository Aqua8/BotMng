# BotMng 기획 및 진행 계획

ScheduleAlertBot(`../ScheduleAlertBot`)의 `data/out.log`, `data/error.log`를 DB에 저장하고 웹에서 관제하는 서비스.

## 1. 결정 사항 (사용자 확정)

| 항목 | 결정 |
|---|---|
| 스택 | TypeScript, NestJS, MariaDB(TypeORM), React(Vite) |
| 수집 방식 | 봇 console 출력에 타임스탬프/레벨 추가 후, BotMng이 로그 파일을 tail |
| 화면 기능 | 로그 목록/검색/필터, 실시간 스트리밍, 대시보드 요약 |
| 프론트 구성 | Nest + React 모노레포. React 빌드 결과를 Nest가 정적 서빙 |
| 인증 | JWT 로그인. 관리자 1 + 게스트 1(읽기 전용). 외부 접근 허용 |
| DB | 로컬 MariaDB(실행 중)에 전용 DB/유저 생성 |
| 보관 | 365일 후 자동 삭제 |
| 작업 방식 | 기능마다 브랜치 생성, `CLAUDE.md` 지침 준수(최소 구현) |

## 2. 가정 (틀리면 알려주세요)

- BotMng은 봇과 같은 맥에서 돌며 로그 파일 경로를 `.env`로 읽는다.
- 스키마는 `server/db/schema.sql`(`CREATE TABLE IF NOT EXISTS`)로 직접 관리하고 TypeORM `synchronize`는 끈다. 자동 변경으로 컬럼이 삭제·변경되어 데이터가 사라지는 일을 막기 위함. 마이그레이션 도구는 도입하지 않는다.
- 게스트는 조회 API만 쓸 수 있고, 현재 API는 전부 조회용이라 별도 권한 분기는 만들지 않는다. 쓰기 API가 생기면 관리자 전용 가드를 추가한다.
- 외부 노출(HTTPS, 터널/리버스 프록시)은 서비스 범위 밖. 앱은 JWT 인증과 비밀번호 해시까지만 책임진다.

## 3. 로그 형식

봇 변경 후: `2026-10-06T15:00:00.000+09:00 INFO [daily] 발송 완료 (1건)` (한국 시간, `INFO|WARN|ERROR`). 파서는 `Z`/`±HH:MM` 모두 받고 **DB에는 KST로 저장**한다(TypeORM `timezone: "+09:00"`, 기존 데이터는 +9h 1회 보정 완료). API 응답의 시각은 절대 시각(ISO)이며 화면에서 KST로 표시한다.
기존 로그(타임스탬프 없음)는 파일 수정시각을 시각으로, `out`=info / `error`=error로 저장한다.
타임스탬프 없는 줄은 직전 항목의 연속 줄(스택트레이스)로 합친다. 단 `(node:` 로 시작하면 새 항목.

## 4. DB 스키마

정의는 `server/db/schema.sql`이 기준이다 (아래는 요약). 테이블·컬럼 설명은 DB의 `COMMENT`로도 저장한다. 기존 DB에 컬럼 설명을 바꿀 때는 `ALTER TABLE ... MODIFY ... COMMENT`를 직접 실행한다.

- `log_entries`: id, source(out/error), level, tag(nullable), message(text), loggedAt(datetime 3), fileOffset. `(source, fileOffset)` 유니크로 중복 수집 방지, `loggedAt`/`tag` 인덱스.
- `log_offsets`: source(PK), offset. 재시작 시 이어서 읽는다. 파일이 줄어들면(로테이션) 0부터.
- `users`: id, username(유니크), passwordHash, role(admin/guest). 시작 시 `.env` 비밀번호로 시드.

## 5. API

- `POST /api/auth/login` → JWT
- `GET /api/logs` 필터(source, level, tag, q, from, to) + 커서(beforeId) 페이지네이션
- `GET /api/logs/tags`
- `GET /api/logs/stream` SSE 실시간 (fetch 스트림으로 Authorization 헤더 사용)
- `GET /api/stats` 대시보드 요약

## 6. 기능 브랜치 계획

각 단계는 "검증" 기준을 통과해야 완료.

1. `feature/log-timestamp` (ScheduleAlertBot 저장소) — 봇 로그에 시각/레벨 추가 → 검증: tsc 통과, 출력 형식 확인
2. `feature/server-collector` — Nest 스캐폴드, DB 연결, 파서, 파일 tail 수집 → 검증: 파서 단위 테스트, 실제 로그 수집 확인
3. `feature/auth` — JWT 로그인, 관리자/게스트 시드 → 검증: 로그인/무토큰 401 확인
4. `feature/logs-api` — 목록/검색/필터/태그/SSE, 보관 정리 → 검증: API 호출 확인
5. `feature/dashboard-stats` — 통계 API → 검증: 수치 확인
6. `feature/web` — React 로그인/대시보드/로그 화면 → 검증: 빌드 및 브라우저 확인

## 7. 사용자 작업 필요

- MariaDB root 비밀번호로 DB/유저 생성 (README의 SQL 참고). 테이블은 `server/db/schema.sql` 실행
- 외부 노출 방식 결정(터널/프록시) — 배포 단계에서 논의

## 8. 진행 현황

- [x] 1. log-timestamp (ScheduleAlertBot PR #7 병합 완료)
- [x] 2. server-collector (실수집 검증 완료: out 59건, error 3건)
- [x] 3. auth (401/400/로그인/위변조 토큰 검증 완료)
- [x] 4. logs-api (목록/필터/커서/태그/SSE 검증 완료)
- [x] 4-1. kst-log-time (파서 +09:00 지원, 실수집 시각 검증 완료)
- [x] 5. dashboard-stats (SQL 직접 집계와 일치 확인)
- [x] 5-1. kst-storage (DB KST 저장, 통계 버킷 KST, 신규 수집 검증 완료)
- [x] 6. web (헤드리스 Chrome으로 로그인/대시보드/필터/검색/실시간 ON·OFF/로그아웃 검증 완료)
- [x] 8-3. db-comments (모든 테이블·컬럼에 COMMENT 추가, 운영 DB에 ALTER 적용·검증 완료)
- [x] 8-4. DB 포트 3306 로컬 바인딩 (`my.cnf.d/bind-local.cnf`, 공인 IP로 닫힘 확인)
- [x] 8-2. db-schema (synchronize 끔, schema.sql로 직접 관리 — 운영 테이블과 동일함 검증, 인덱스 이름 정리)
- [x] 8. hardening (로그인 IP당 분당 10회 제한, 127.0.0.1 바인딩 — 429/바인딩 검증 완료)
- [x] 8-1. direct-https (선택적 TLS 서빙, CF 대역에서만 CF-Connecting-IP 신뢰 — 자체서명 인증서로 검증 완료. 실제 Origin 인증서는 사용자 발급 필요)
- [x] 7. launchd 상시 구동 (크래시 후 자동 재시작, 수집 지속 검증 완료)

## 9. 실행 방법

```
# 1회: 의존성 설치 + 화면 빌드 + 서버 빌드
(cd web && npm i && npm run build)
(cd server && npm i && npm run build)

# 실행 (http://localhost:3000, 포트는 server/.env 의 PORT)
cd server && npm start

# 개발: 서버 `npm run dev`(3000) + 화면 `cd web && npm run dev`(5173, /api 는 3000으로 프록시)
```

- 계정: `admin` / `guest`. 비밀번호는 `server/.env` 의 `ADMIN_PASSWORD` / `GUEST_PASSWORD` (바꾸고 재시작하면 반영).
- 상시 구동: `launchd/com.botmng.plist.example` 템플릿 (KeepAlive, 로그인 시 자동 시작). 로그는 `server/logs/`. 설치 방법은 README 참고.
  - 설치: 템플릿의 `__PROJECT_DIR__`, `__NODE_BIN_DIR__`를 채워 `~/Library/LaunchAgents/com.botmng.plist`로 저장 후 `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.botmng.plist` (README의 `sed` 명령 참고)
  - 코드 수정 후 반영: `(cd server && npm run build) && launchctl kickstart -k gui/$(id -u)/com.botmng`
  - 제거: `launchctl bootout gui/$(id -u)/com.botmng`
- 외부 노출 (터널 없이 Cloudflare 프록시 → 이 맥 직접 연결, 구간 HTTPS):
  1. Cloudflare DNS에 A 레코드(프록시 켬 = 주황 구름)를 이 맥의 공인 IP로 등록
  2. SSL/TLS → Origin Server → Create Certificate 로 인증서 발급 → `server/certs/origin.pem`, `origin.key` 로 저장 (git 제외됨)
  3. SSL/TLS 모드를 **Full (strict)** 로 설정
  4. 포트: 이 맥이 공인 IP를 직접 가지므로 포트포워딩은 불필요. 443을 써야 주소에 포트가 안 붙는다(macOS는 일반 사용자도 1024 미만 포트 바인딩 가능). 공유기 뒤라면 외부 443 → 이 맥 443 포트포워딩 필요
  5. `server/.env` 에 `PORT=443`, `TLS_CERT_PATH`, `TLS_KEY_PATH` 설정 후 `launchctl kickstart -k gui/$(id -u)/com.botmng`
  6. 접속: `https://<쓰는 도메인>` (실제 도메인은 저장소에 적지 않는다)
  - TLS 경로가 설정된 경우에만 `0.0.0.0` 으로 열고, 아니면 `127.0.0.1` HTTP 로만 받는다.
  - 로그인은 IP당 분당 10회로 제한. `CF-Connecting-IP` 는 접속 소켓이 Cloudflare IP 대역일 때만 신뢰(`server/src/auth/client-ip.ts`, 대역이 바뀌면 갱신).

## 보안 원칙

- 비밀번호, JWT 키, 인증서/키, DB 접속 정보, 공인 IP, 실제 도메인, 계정명이 든 로컬 경로는 **저장소에 올리지 않는다**. `server/.env`, `server/certs/`, 실제 값이 든 plist 등 로컬 파일에만 둔다.
- 저장소에는 `server/.env.example`처럼 자리표시자만 둔다.
- 문서에 예시가 필요하면 `<도메인>`, `/path/to/...` 같은 자리표시자를 쓴다.

## 11. 추가 기능: 접속 로그, 게스트 버튼, 동의 모달

### 결정 사항 (사용자 확정)
| 항목 | 결정 |
|---|---|
| 접속 로그 열람 | 관리자는 전체, **게스트도 열람하되 IP는 일부 마스킹** |
| 동의하지 않은 경우 | **로그인과 게스트 버튼 차단** (동의해야 이용 가능) |
| 동의 저장 | "24시간 보이지 않기"를 체크하고 동의하면 브라우저에 24시간 유지(localStorage + 만료 시각), 체크 없이 동의하면 탭을 닫을 때까지(sessionStorage). 둘 다 없으면 모달 표시 |

### 가정 (틀리면 알려주세요)
- 접속 로그는 **로그인 시도**(성공/실패 모두)를 기록한다. 일반 API 호출은 기록하지 않는다.
- 저장 항목: 시각(KST), 입력한 아이디, 성공 여부, 로그인 방식(password/guest), IP, 국가(`CF-IPCountry`), OS, 브라우저, 기기 종류, User-Agent 원문. **비밀번호는 저장하지 않는다.**
- IP는 Cloudflare 뒤 실제 접속자 IP(`client-ip.ts`)를 쓴다.
- 보관 기간은 로그와 같은 365일.
- 게스트에게 보이는 값(서버에서 가린 뒤 전송, 원본은 내려보내지 않음): IP는 앞 두 칸만 남기고 나머지 칸을 `*`로 마스킹(IPv4 `203.0.***.***`, IPv6 `2001:db8:****:****:****:****:****:****`), **User-Agent 원문은 숨김**, 실패한 시도의 아이디는 숨김(비밀번호를 아이디 칸에 잘못 입력하는 경우가 있어서).
- 로그인 횟수 제한에 걸린 요청(429)은 핸들러 전에 막히므로 접속 로그에 남지 않는다.
- 동의는 화면에서만 막는다(서버가 동의 여부를 검증하지 않음). 동의 기록을 서버에 저장하지 않는다.
- **게스트 버튼은 인터넷의 누구나 로그 화면을 볼 수 있다는 뜻**이다. 로그 메시지에 공개하기 곤란한 내용이 없는지 주기적으로 확인한다.
- User-Agent 해석은 MIT 라이선스의 `bowser`를 쓴다 (`ua-parser-js` 2.x는 AGPL).

### 브랜치 계획
1. `feature/access-log` — `access_logs` 테이블, 로그인 시 기록, 조회 API(역할별 마스킹), 화면 탭, 보관 정리 → 검증: 파서/마스킹 단위 테스트, 성공/실패 기록, 게스트 응답에 원본 IP 없음, 화면 확인
2. `feature/guest-login` — `POST /api/auth/guest`와 로그인 화면의 "게스트로 로그인" 버튼 → 검증: 비밀번호 없이 게스트 토큰 발급, 접속 로그에 method=guest 기록, 횟수 제한 적용
3. `feature/consent-modal` — 소개/수집 동의 모달, 24시간/세션 저장, 미동의 시 로그인·게스트 버튼 차단 → 검증: 브라우저에서 모달 표시/저장/만료/차단 확인

### 진행 현황
- [x] 11-1. access-log (UA/IP 마스킹 단위 테스트, 실제 Cloudflare 경로에서 IP·국가·OS·브라우저 기록 확인, 게스트 응답에 원본 IP·UA·실패 아이디 없음 확인, 브라우저로 관리자/게스트 화면·필터 확인)
- [x] 11-2. guest-login (비밀번호 없이 게스트 토큰 발급, 접속 로그 method=guest 기록, 횟수 제한(별도 집계) 확인, 브라우저에서 버튼 클릭 확인. 보너스: Windows 10/11 OS 표기 수정)
- [x] 11-3. consent-modal (헤드리스 Chrome 21개 시나리오 통과: 최초 표시, 동의 거부 시 버튼 차단·안내, 24시간 저장·만료, 탭 세션 저장, 새 탭 재표시, 로그인 상태에서 거부 시 로그아웃, Esc)

## 12. 웹 디자인 개편 (관제실 콘솔)

### 결정 사항 (사용자 확정)
| 항목 | 결정 |
|---|---|
| 분위기 | 관제실 콘솔 (좌측 사이드바 + 로그 스트림 중심) |
| 범위 | 전체 화면(로그인, 대시보드, 로그, 접속 로그, 동의 모달) + 레이아웃 변경 포함 |
| 테마 | 다크/라이트 모두 지원 (시스템 설정을 따름) |

### 디자인 계획
- **포인트 색**: Discord 블러플 계열(봇이 Discord로 알림을 보내는 서비스라는 점에서). 초록/노랑/빨강은 상태(정상·경고·에러) 표시에만 사용한다.
- **색**: 다크는 푸른 기가 도는 잉크색 바탕, 라이트는 차가운 종이색 바탕. 순수 검정·형광 포인트·크림+테라코타는 쓰지 않는다.
- **글꼴**: IBM Plex Sans KR(화면 전체) + IBM Plex Mono(실제 로그 줄에만). 대문자 라벨, 라벨 위의 작은 머리글, 불필요한 번호 매기기는 쓰지 않는다.
- **첫 화면**: "하루 시계" — 24시간 띠 위에 예약 발송(매일 06:00 일정, 21:00 내일 미리보기, 일요일 20:00 주간 요약)과 시간대별 로그 양, 현재 시각 표시선을 올린다. 통계는 카드 대신 문장과 가로 막대로.
- **정직한 표기**: 봇은 변경이 있을 때만 로그를 남기므로 로그가 없다고 멈춘 것은 아니다. "정상" 대신 "최근 24시간 에러 없음"처럼 에러 기준으로만 말한다.
- **레이아웃**: 데스크톱은 좌측 사이드바, 모바일은 상단 바 + 가로 탭. 로그는 고정폭 한 줄 스트림(왼쪽에 레벨 표시 막대).
- **움직임**: 첫 화면의 하루 시계가 그려지는 한 번의 연출과, 사용자 동작에 반응하는 것(펼침, 토글)만 쓴다. 섹션마다 페이드인은 쓰지 않는다.
- **품질 기준**: 모바일 대응, 키보드 포커스 표시, `prefers-reduced-motion` 존중, 충분한 명도 대비.
- **가정**: 예약 시각(06:00/21:00/일 20:00)은 봇 설정에서 읽어오지 않고 화면에 상수로 둔다. 봇의 스케줄을 바꾸면 화면 상수도 같이 바꿔야 한다. 기능과 API는 바꾸지 않는다.

### 추가 결정 (사용자 확정)
| 항목 | 결정 |
|---|---|
| UI 라이브러리 | **Radix Themes로 컨트롤 전체 교체** (Table, Button, IconButton, Select, TextField, Switch, Dialog, Badge). 포인트색은 Radix `iris`(블러플 계열), 회색은 `slate`. 사이드바·하루 시계 같은 레이아웃은 기존 디자인 유지 |
| 테마 토글 | 사이드바와 로그인 화면에 해/달 토글 버튼. 처음에는 시스템 설정을 따르고, 토글하면 선택값을 **브라우저에 계속 저장**(localStorage `botmng.theme`). 사용자는 "세션"이라고 했지만 선택지를 보여주고 계속 저장을 골랐다 |
| 로그/접속 로그 | 둘 다 **테이블**로 변경. 로그는 시각/레벨/파일/태그/메시지 열. 실시간 새 줄 강조는 유지 |


### 공통 컴포넌트 설계 (`web/src/components/`, `web/src/hooks/`)
반복되는 화면 패턴을 한 곳에 모으고 Radix Themes 위에 얇게 감싼다. 화면 파일은 데이터와 열 정의만 갖는다.

| 이름 | 역할 | 쓰는 곳 |
|---|---|---|
| `ThemeProvider` / `ThemeToggle` (`theme.tsx`) | Radix `Theme` 설정, 다크/라이트 상태와 localStorage 저장, 해/달 토글 버튼 | 앱 전체, 사이드바, 로그인 |
| `PageHead` | 페이지 제목 + 한 줄 설명(+ 상태 램프) | 모든 화면 |
| `Panel` | 제목/보조 문구가 있는 구역 | 대시보드 |
| `StatusLamp` | 상태 램프(정상/경고/에러/꺼짐) | 대시보드, 실시간 스위치, 결과 표시 |
| `LevelBadge`, `ResultBadge` | 로그 레벨, 로그인 성공/실패를 색 있는 배지로 | 로그, 접속 로그, 대시보드 |
| `FilterSelect` | "전체" 선택지가 있는 필터용 Radix Select (빈 값 처리 포함) | 로그, 접속 로그 |
| `SearchField`, `DateTimeField` | 검색 입력, 라벨 있는 날짜·시각 입력 | 로그 |
| `LiveSwitch` | 실시간 켜기/끄기 스위치 + 연결 램프 | 로그 |
| `DataTable<T>` | 열 정의(`columns`)와 행 데이터만 받는 테이블. 빈 상태, 로딩, "더 보기", 가로 스크롤, 행 강조 지원 | 로그, 접속 로그 |
| `usePagedList` (hook) | 커서 페이지네이션 목록 상태(조회, 더 보기, 필터 변경 시 재조회, 입력 지연) | 로그, 접속 로그 |

원칙: 두 군데 이상에서 실제로 쓰는 것만 공통으로 만든다. 한 화면에서만 쓰는 조각(하루 시계, 태그 막대)은 그 화면 파일에 둔다.

### 진행 현황
- [x] 12-1. redesign-console (좌측 사이드바 + 하루 시계 대시보드 + 로그 스트림, 다크/라이트·모바일 캡처 확인, 기능 회귀: 화면 15개 시나리오 + 동의 모달 21개 시나리오 통과)
  - 참고: 화면 상수 `Dashboard.tsx`의 `SCHEDULE`(06:00/21:00/일 20:00)은 봇 스케줄을 바꾸면 같이 바꿔야 한다. 글꼴 파일이 함께 빌드되어 `web/dist`가 약 8MB(557개)지만 브라우저는 쓰는 글자 구간만 내려받는다.
- [x] 12-2. radix-themes (Radix Themes 컨트롤 교체, 해/달 테마 토글(localStorage 저장), 로그·접속 로그 테이블화, 공통 컴포넌트 `components/`·`hooks/` 분리 — 화면 25개 + 동의 모달 21개 시나리오 통과, 토글 저장·새로고침 유지·시스템 설정 복귀 확인)
  - 참고: 테마를 Radix Theme의 `appearance`로 관리하고, 직접 만든 색 토큰은 Radix 변수(`--gray-*`, `--accent-*`)에 연결해 한 번에 바뀐다. Dialog 제목은 접근성을 위해 `h2`로 렌더링(기본은 `h1`).

## 13. 테이블 페이지네이션과 정렬

### 결정 사항 (사용자 확정)
| 항목 | 결정 |
|---|---|
| 페이지네이션 | 번호 페이지 + 페이지 크기 선택(5/10/20/50/100, 기본 20) + 총 건수 표시. 서버 API를 `page/pageSize/total` 방식으로 변경하고 기존 커서(`beforeId`)·"더 보기"는 제거 |
| 정렬 | 메시지를 뺀 모든 열. 열 머리글을 누르면 내림차순 → 오름차순 → 기본(시각 내림차순)으로 순환. 서버에서 허용된 열만 받음 |
| 실시간 | 1페이지 + 시각 내림차순일 때만 새 로그를 끼워 넣음. 페이지나 정렬을 바꾸면 **실시간 스위치를 자동으로 끔**. 실시간을 다시 켜면 1페이지·기본 정렬로 돌아감 |

### 설계
- API: `GET /api/logs`, `GET /api/access-logs`에 `page`(≥1), `pageSize`(5/10/20/50/100), `sort`, `order`(asc/desc) 추가. 응답은 `{ items, total, page, pageSize }`.
- 정렬 가능 열: 로그 `loggedAt, level, source, tag` / 접속 로그 `loggedAt, username, success, method, ip, country, os, browser, device`. 같은 값끼리는 `id`로 순서를 고정한다.
- **게스트의 정렬 제한**: 게스트에게는 IP 앞 두 칸과 성공한 시도의 아이디만 보이므로, 가려진 값으로 정렬하면 순서로 숨긴 값을 유추할 수 있다. 게스트가 `ip`, `username`으로 정렬하려 하면 400으로 거부하고, 화면에서는 두 열의 정렬 버튼을 숨긴다.
- 공통 컴포넌트: `Pagination`(번호, 이전/다음, 페이지 크기, 총 건수), `DataTable`에 정렬 머리글 추가, `usePagedList`를 페이지·정렬 상태를 가진 `useTableQuery`로 대체.

### 진행 현황
- [x] 13-1. table-pagination-sort (서버: 단위 테스트 34개, API 검증(페이지 겹침·누락 없음, 정렬, 400 검증, 게스트 정렬 제한). 웹: pageWindow 단위 테스트 5개, 브라우저 시나리오 26개 + 기존 화면 25개 + 동의 모달 21개 통과)
  - 변경: 페이지 크기를 5/10/20/50/100(기본 20)으로 조정했다 (처음 20/50/100, 기본 50). 서버 `common/paging.ts`와 화면 `Pagination.tsx`·`useTableQuery.ts`에 값이 각각 있어 함께 바꿔야 한다.
  - 참고: 열 머리글 클릭은 내림차순 → 오름차순 → 기본(시각 내림차순) 순환. 페이지·정렬을 바꾸면 1페이지로 돌아가고, 필터를 바꿔도 1페이지로 돌아간다.

## 14. 명령 로그의 결과·처리시간 컬럼 분리

### 결정 사항 (사용자 확정)
- 봇이 남기는 명령 사용 로그의 **처리 시간에서 확인 버튼 대기 시간을 뺀다** (봇 저장소 `timeWait`).
- 처리 시간과 **성공/실패**를 로그 메시지에서 분리해 **DB 컬럼과 웹 테이블 열**로 따로 둔다.

### 설계
- DB `log_entries`에 `outcome ENUM('success','failure','cancelled') NULL`, `durationMs INT NULL` 추가 (`schema.sql`, 엔티티, 운영 DB `ALTER` 적용). `[command]` 로그에만 값이 있고 나머지는 NULL.
- 결과는 성공/실패 두 가지가 아니라 **취소**(확인 버튼에서 취소, 30초 무응답)를 포함한 세 가지.
- 파서(`log-parser.ts`)가 `[command] /명령 성공|실패|취소 (Nms)(: 사유)` 형식을 읽어 두 값을 빼고, 메시지에는 `[command] /명령(: 사유)`만 남긴다. 형식이 다르면 건드리지 않는다.
- 기존 `[command]` 행은 `UPDATE`로 한 번 보정했다 (1건). 과거 로그 파일은 그대로다.
- 웹: 로그 테이블에 "결과"(배지)와 "처리시간" 열 추가, 둘 다 서버 정렬 가능. 처리시간 표기는 `80ms` / `10.6초` / `1분 5초`.

### 진행 현황
- [x] 14-1. command-columns (서버 테스트 41개, 웹 단위 테스트 8개, 임시 행 저장으로 TypeORM 매핑 확인, 화면 31개 + 테이블 28개 + 동의 모달 21개 시나리오 통과). 봇 쪽은 ScheduleAlertBot의 `feature/command-log-duration`.

## 10. 나중에 할 일 (필요해질 때)

- **맥 절전 방지**: 잠자기에 들어가면 외부 접속이 끊긴다. 시스템 설정 > 에너지에서 "디스플레이가 꺼져 있을 때 자동 잠자기 방지"를 켜거나, `caffeinate -s`를 launchd에 등록한다.
- **공인 IP 변경 대응**: 통신사가 IP를 바꾸면 Cloudflare의 `botmng` A 레코드도 갱신해야 접속이 유지된다. 자주 바뀌면 Cloudflare API로 A 레코드를 갱신하는 DDNS 스크립트를 launchd로 주기 실행한다.
- **Cloudflare IP 대역 갱신**: `server/src/auth/client-ip.ts`의 대역이 바뀌면 `https://www.cloudflare.com/ips-v4`, `ips-v6` 기준으로 갱신한다.
- **서버 직접 접속 차단(선택)**: Cloudflare를 거치지 않고 서버 IP로 접속하는 것을 막으려면 맥 방화벽/공유기에서 인바운드를 Cloudflare IP 대역으로 제한한다.
- **서버 로그 로테이션(선택)**: `server/logs/`는 로테이션이 없다. 커지면 정리한다.
