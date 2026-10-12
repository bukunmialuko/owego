import { Avatar, AvatarSilhouette, type AvatarSize } from '@/shared/ui';
import { AVATAR_SWATCHES } from './avatar-swatches';
import { useAvatarAppearance } from './use-avatar-appearance';

type Props = {
  name: string;
  size: AvatarSize;
};

export function AccountAvatar({ name, size }: Props) {
  const appearance = useAvatarAppearance();

  switch (appearance.kind) {
    case 'default':
      return <AvatarSilhouette size={size} />;
    case 'initials':
      return name.trim() === '' ? (
        <AvatarSilhouette size={size} />
      ) : (
        <Avatar name={name} size={size} swatch={AVATAR_SWATCHES[appearance.swatch].swatch} />
      );
  }
}
