import { ListRow } from '@/shared/ui';
import { IconCircle } from '@/shared/ui';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

type Props = {
  icon: IoniconsIconName;
  title: string;
  subtitle?: string;
  trailingNode?: React.ReactNode;
  trailing?: string;
  onPress?: () => void;
  hasChevron?: boolean;
};

export function SettingsRow({
  icon,
  title,
  subtitle,
  trailingNode,
  trailing,
  onPress,
  hasChevron,
}: Props) {
  return (
    <ListRow
      title={title}
      {...(subtitle === undefined ? {} : { subtitle })}
      leading={<IconCircle icon={icon} tone="neutral" size="sm" />}
      {...(trailingNode === undefined ? {} : { trailingNode })}
      {...(trailing === undefined ? {} : { trailing })}
      {...(onPress === undefined ? {} : { onPress })}
      hasChevron={hasChevron ?? (onPress !== undefined && trailingNode === undefined)}
    />
  );
}
