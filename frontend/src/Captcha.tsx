import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import WebView from 'react-native-webview';
import { API_ORIGIN } from './api';
import { useTheme } from './theme';
import { useUI } from './ui';
export default function Captcha({ purpose, onVerified }: { purpose: 'login' | 'register'; onVerified: (payload: string) => void }) {
  const { resolved } = useTheme();
  const { C, s } = useUI();
  useEffect(() => { onVerified(''); }, [onVerified, purpose, resolved]);
  const url = `${API_ORIGIN}/captcha?purpose=${purpose}&theme=${resolved}`;
  return <View style={{ gap: 6 }}><Text style={s.label}>Security check</Text><View style={{ height: 160, backgroundColor: C.paper, borderRadius: 12, overflow: 'hidden' }}><WebView
    source={{ uri: url }} style={{ backgroundColor: C.paper }}
    originWhitelist={[API_ORIGIN]} javaScriptEnabled domStorageEnabled={false}
    setSupportMultipleWindows={false} mixedContentMode="never" thirdPartyCookiesEnabled={false}
    onShouldStartLoadWithRequest={request => request.url === url || request.url === 'about:blank'}
    onMessage={event => {
      if (event.nativeEvent.url !== url) return;
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'altcha' && typeof data.payload === 'string' && data.payload.length < 10000) onVerified(data.payload);
      } catch { /* Ignore messages outside the explicit CAPTCHA bridge. */ }
    }}
  /></View><Text style={s.hint}>Complete the CAPTCHA before continuing.</Text></View>;
}
