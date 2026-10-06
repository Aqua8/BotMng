import { Button, Checkbox, Dialog, Flex, Text } from "@radix-ui/themes";
import { useRef, useState } from "react";

interface Props {
  onAgree: (remember24h: boolean) => void;
  onDecline: () => void;
}

/** 서비스 소개와 접속 정보 수집 안내. 바깥을 눌러서는 닫히지 않고, Esc 는 "동의하지 않음"으로 처리한다. */
export function ConsentModal({ onAgree, onDecline }: Props) {
  const [remember, setRemember] = useState(false);
  const agreeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onDecline()}>
      <Dialog.Content
        maxWidth="440px"
        className="consent"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          agreeRef.current?.focus();
        }}
      >
        <Dialog.Title as="h2">BotMng에 오신 것을 환영합니다</Dialog.Title>
        <Dialog.Description size="2">
          BotMng는 개인 Discord 일정 알림 봇(ScheduleAlertBot)의 로그를 수집해 한눈에 보여 주는 관제 서비스입니다. 로그 조회·검색, 실시간 확인, 대시보드를 제공합니다.
        </Dialog.Description>

        <h3>접속 정보 수집 안내</h3>
        <p>서비스 보안과 이용 현황 확인을 위해 접속할 때(로그인하거나, 저장된 로그인으로 다시 열 때) 아래 정보를 수집·저장합니다. 같은 접속자는 1시간에 한 번만 기록합니다.</p>
        <ul>
          <li>접속 시각, 입력한 아이디 (비밀번호는 저장하지 않습니다)</li>
          <li>IP 주소와 국가</li>
          <li>운영체제, 웹 브라우저, 기기 종류</li>
        </ul>
        <p className="muted">
          수집한 정보는 365일 보관 후 삭제하며 &quot;접속 로그&quot; 화면에서 확인할 수 있습니다 (게스트에게는 IP 일부만 표시됩니다). 동의하지 않으시면 로그인과 게스트 이용이 제한됩니다.
        </p>

        <Text as="label" size="2">
          <Flex align="center" gap="2" mt="3">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
            24시간 동안 보지 않기
          </Flex>
        </Text>

        <Flex justify="end" gap="2" mt="4">
          <Button variant="soft" color="gray" onClick={onDecline}>
            동의하지 않음
          </Button>
          <Button ref={agreeRef} onClick={() => onAgree(remember)}>
            동의
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
