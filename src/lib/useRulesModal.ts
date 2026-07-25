// Shows a game's rules automatically the first time it's opened, and
// exposes `show()` so a "?" button can bring them back up anytime after.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useRulesModal(gameKey: string) {
  const [visible, setVisible] = useState(false);
  const storageKey = `strikr_rules_seen_${gameKey}_v1`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((seen) => {
      if (!seen) {
        setVisible(true);
        AsyncStorage.setItem(storageKey, '1').catch(() => {});
      }
    });
  }, [storageKey]);

  return { visible, show: () => setVisible(true), hide: () => setVisible(false) };
}
