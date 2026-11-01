import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';

export type ThemeChoice = 'light' | 'dark' | 'system';
export const lightColors = {
  cream: '#F7F5EE', paper: '#FFFFFF', green: '#164D3D', dark: '#173F34',
  ink: '#253E36', muted: '#627168', border: '#D9E0D5', sage: '#E8EFE4',
  coral: '#E5866C', peach: '#FBE9DE', error: '#A53D3D',
  dangerSurface: '#FFF0ED', dangerBorder: '#E6B6AD', onAccent: '#FFFFFF',
};
export type Palette = typeof lightColors;
const darkColors: Palette = {
  cream: '#111B17', paper: '#1C2922', green: '#A0DABB', dark: '#E6F2E8',
  ink: '#E1EBE2', muted: '#ABBDAD', border: '#415246', sage: '#2B3F32',
  coral: '#F2AC91', peach: '#493A30', error: '#FFB2AA',
  dangerSurface: '#452B2A', dangerBorder: '#9D6660', onAccent: '#113223',
};
const ThemeContext = createContext({
  choice: 'system' as ThemeChoice,
  resolved: 'light' as 'light' | 'dark',
  colors: lightColors,
  setChoice: (_choice: ThemeChoice) => {},
});
const KEY = 'mypetpair.theme';
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  useEffect(() => {
    let current = true;
    const read = async () => {
      try {
        const saved = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
        if (current && (saved === 'light' || saved === 'dark' || saved === 'system')) setChoiceState(saved);
      } catch { /* Theme remains usable when persistence is unavailable. */ }
    };
    void read();
    return () => { current = false; };
  }, []);
  const resolved = choice === 'system' ? (system === 'dark' ? 'dark' : 'light') : choice;
  const colors = resolved === 'dark' ? darkColors : lightColors;
  const value = useMemo(() => ({ choice, resolved, colors, setChoice: (next: ThemeChoice) => {
    setChoiceState(next);
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, next);
      else void SecureStore.setItemAsync(KEY, next).catch(() => {});
    } catch { /* An in-memory preference is still applied. */ }
  } }), [choice, resolved, colors]);
  useEffect(() => {
    if (Platform.OS !== 'web') void SystemUI.setBackgroundColorAsync(colors.cream).catch(() => {});
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = resolved;
      document.documentElement.style.backgroundColor = colors.cream;
      document.body.style.backgroundColor = colors.cream;
    }
  }, [resolved, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
