import { Flex, Switch, Text } from "@radix-ui/themes";
import { StatusLamp } from "./StatusLamp";

/** 실시간 켜기/끄기. 켜져 있고 서버와 연결되었을 때만 램프가 켜진다. */
export function LiveSwitch({ checked, connected, onChange }: { checked: boolean; connected: boolean; onChange: (v: boolean) => void }) {
  return (
    <Text as="label" size="2" title={connected ? "연결됨" : checked ? "연결 중" : "꺼짐"}>
      <Flex align="center" gap="2">
        <Switch checked={checked} onCheckedChange={onChange} aria-label="실시간" />
        실시간
        <StatusLamp status={checked && connected ? "ok" : "idle"} />
      </Flex>
    </Text>
  );
}
