import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useRedrawOnReturn(version: number): number {
  const latest = useRef(version);
  const versionAtBlur = useRef<number | undefined>(undefined);
  const [redraws, setRedraws] = useState(0);

  useEffect(() => {
    latest.current = version;
  }, [version]);

  useFocusEffect(
    useCallback(() => {
      if (versionAtBlur.current !== undefined && versionAtBlur.current !== latest.current) {
        setRedraws((count) => count + 1);
      }

      return () => {
        versionAtBlur.current = latest.current;
      };
    }, []),
  );

  return redraws;
}
