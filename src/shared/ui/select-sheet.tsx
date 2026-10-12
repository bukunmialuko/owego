import { useMemo, useState } from 'react';
import { BottomSheet } from './bottom-sheet';
import { EmptyState } from './empty-state';
import { ListRow } from './list-row';
import { TextField } from './text-field';

export type SelectSheetOption = {
  id: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  leading?: React.ReactNode;
  disabled?: boolean;
};

type Props = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  closeLabel: string;
  options: SelectSheetOption[];
  selectedId?: string;
  emptyMessage: string;
  searchPlaceholder?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function SelectSheet({
  isOpen,
  title,
  subtitle,
  closeLabel,
  options,
  selectedId,
  emptyMessage,
  searchPlaceholder,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return options;

    return options.filter((option) =>
      [option.title, option.subtitle ?? ''].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [options, query]);

  return (
    <BottomSheet
      isOpen={isOpen}
      title={title}
      {...(subtitle === undefined ? {} : { subtitle })}
      closeLabel={closeLabel}
      onClose={onClose}
      hasCloseButton
    >
      {searchPlaceholder !== undefined && (
        <TextField
          label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={query}
          onChangeText={setQuery}
          leadingIcon="search"
          isLabelHidden
          shape="pill"
          autoCorrect={false}
          autoCapitalize="none"
        />
      )}

      {visible.length === 0 ? (
        <EmptyState title={emptyMessage} />
      ) : (
        visible.map((option) => (
          <ListRow
            key={option.id}
            title={option.title}
            {...(option.subtitle === undefined ? {} : { subtitle: option.subtitle })}
            {...(option.trailing === undefined ? {} : { trailing: option.trailing })}
            {...(option.leading === undefined ? {} : { leading: option.leading })}
            selected={option.id === selectedId}
            disabled={option.disabled ?? false}
            hasChevron
            onPress={() => {
              onSelect(option.id);
            }}
          />
        ))
      )}
    </BottomSheet>
  );
}
