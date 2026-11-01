import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from './theme';
import { API_ORIGIN } from './api';
import { useUI } from './ui';
export default function Captcha({ purpose, onVerified }: { purpose: 'login' | 'register'; onVerified: (payload: string) => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const { resolved } = useTheme();
  const { s } = useUI();
  useEffect(() => {
    onVerified('');
    const origin = new URL(API_ORIGIN || window.location.origin).origin;
    const receive = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data?.type === 'altcha' && typeof data.payload === 'string' && data.payload.length < 10000) onVerified(data.payload);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onVerified, purpose, resolved]);
  return <View style={{ gap: 6 }}><Text style={s.label}>Security check</Text>{React.createElement('iframe', {
    ref: frame, src: `${API_ORIGIN || (typeof window !== "undefined" ? window.location.origin : "")}/captcha?purpose=${purpose}&theme=${resolved}&parentOrigin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`, title: 'Security verification',
    style: { border: 0, width: '100%', height: 160 },
  })}<Text style={s.hint}>Complete the CAPTCHA before continuing.</Text></View>;
}
