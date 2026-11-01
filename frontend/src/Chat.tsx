import React, { useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { api, ApiError } from './api';
import { Interest, Message, MessagePage } from './types';
import { Button, Chip, Field, useUI } from './ui';

export function useForeground() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const update = () => setActive(AppState.currentState === 'active' && (Platform.OS !== 'web' || document.visibilityState !== 'hidden'));
    const sub = AppState.addEventListener('change', update);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', update);
    update();
    return () => { sub.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', update); };
  }, []);
  return active;
}
export default function Chat({ interest, ownerId, onClose, onUnavailable, onRead }: {
  interest: Interest; ownerId: string; onClose: () => void; onUnavailable: (message: string) => void; onRead: () => void;
}) {
  const { C, s } = useUI();
  const foreground = useForeground();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [body, setBody] = useState('');
  const [retry, setRetry] = useState<{ body: string; clientMessageId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [report, setReport] = useState<Message | null>(null);
  const [reason, setReason] = useState('HARASSMENT');
  const [details, setDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const callbacks = useRef({ onUnavailable, onRead });
  useEffect(() => { callbacks.current = { onUnavailable, onRead }; }, [onUnavailable, onRead]);
  const scroll = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const followLatest = useRef(true);
  const current = useRef(true);
  useEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
  const isAccessError = (e: unknown) => e instanceof ApiError && [401, 403, 404, 409].includes(e.status);
  useEffect(() => {
    if (!foreground) { return; }
    let disposed = false;
    let fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const page = await api<MessagePage>(`/interests/${interest.id}/messages?size=50`);
        if (disposed) return;
        setError('');
        setMessages(previous => {
          // An offline gap must be loaded through history, never silently skipped.
          const gap = previous.length > 0 && page.items.length > 0 && page.items[0].id > previous[previous.length - 1].id;
          if (!previous.length || gap) { setHasMore(page.hasMore); return page.items; }
          const merged = new Map(previous.map(m => [m.id, m]));
          page.items.forEach(m => merged.set(m.id, m));
          return [...merged.values()].sort((a, b) => a.id - b.id);
        });
        if (page.items.length) {
          await api(`/interests/${interest.id}/messages/read`, 'PUT', { messageId: page.items[page.items.length - 1].id });
          if (!disposed) callbacks.current.onRead();
        }
      } catch (e) {
        if (disposed) return;
        setMessages([]); setHasMore(false);
        if (isAccessError(e)) callbacks.current.onUnavailable((e as Error).message);
        else setError('Unable to refresh chat. Check your connection and retry.');
      } finally { fetching = false; }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [interest.id, foreground, reload]);
  const send = async () => {
    if (busy) return;
    const pending = retry || { body: body.trim(), clientMessageId: Crypto.randomUUID() };
    if (!pending.body || pending.body.length > 2000) return;
    followLatest.current = true;
    setBusy(true); setError(''); setRetry(pending);
    try {
      const result = await api<Message>(`/interests/${interest.id}/messages`, 'POST', pending);
      if (!current.current) return;
      setMessages(previous => [...previous.filter(m => m.id !== result.id), result].sort((a, b) => a.id - b.id));
      setBody(''); setRetry(null); setReload(v => v + 1);
    } catch (e) {
      if (!current.current) return;
      if (isAccessError(e)) { setMessages([]); callbacks.current.onUnavailable((e as Error).message); }
      else setError('Message was not confirmed. Retry sends the same message safely.');
    } finally { if (current.current) setBusy(false); }
  };
  const older = async () => {
    if (busy || !messages.length) return;
    followLatest.current = false;
    setBusy(true);
    try {
      const page = await api<MessagePage>(`/interests/${interest.id}/messages?beforeId=${messages[0].id}&size=50`);
      if (!current.current) return;
      setMessages(previous => [...new Map([...page.items, ...previous].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id));
      setHasMore(page.hasMore);
    } catch (e) {
      if (!current.current) return;
      if (isAccessError(e)) { setMessages([]); callbacks.current.onUnavailable((e as Error).message); }
      else setError('Unable to load older messages. Try again.');
    } finally { if (current.current) setBusy(false); }
  };
  return <Modal transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}><View style={{ backgroundColor: C.cream, borderRadius: 20, padding: 20, width: '100%', maxWidth: 700, maxHeight: '90%', gap: 12 }}>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={[s.h2, { flex: 1 }]}>Chat</Text><Button variant="ghost" onPress={onClose}>Close chat</Button></View>
    <Text style={s.body}>{interest.maleDog.name} & {interest.femaleDog.name}</Text>
    <Text style={s.hint}>Private to the two connected owners. Messages refresh while this chat is open. Contact sharing is still optional.</Text>
    {!!error && <View accessibilityLiveRegion="polite"><Text style={{ color: C.error }}>{error}</Text><Button variant="outline" onPress={() => setReload(v => v + 1)}>Refresh chat</Button></View>}
    {report ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}><Text style={s.h3}>Report this message</Text><Text style={s.body}>{report.body}</Text><View style={[s.row, { flexWrap: 'wrap' }]}>{['HARASSMENT', 'PRIVACY', 'FRAUD', 'OTHER'].map(value => <Chip key={value} active={reason === value} onPress={() => setReason(value)}>{value.toLowerCase()}</Chip>)}</View><Field label="Details (optional)" value={details} onChange={setDetails} maxLength={1000} multiline /><Text style={s.hint}>The reported message will be shared with an operator for review.</Text><Button busy={busy} onPress={async () => { setBusy(true); try { await api(`/messages/${report.id}/report`, 'POST', { reason, details }); if (!current.current) return; setReport(null); setDetails(''); setReportSent(true); } catch (e) { if (current.current) setError((e as Error).message); } finally { if (current.current) setBusy(false); } }}>Submit message report</Button><Button variant="ghost" onPress={() => setReport(null)}>Cancel report</Button></ScrollView> : <>
    {reportSent && <Text style={s.body}>Message reported. You can also block the owner from your connection.</Text>}
    <ScrollView ref={scroll} onScroll={event => { const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent; followLatest.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80; }} scrollEventThrottle={100} onContentSizeChange={() => { if (followLatest.current) scroll.current?.scrollToEnd({ animated: false }); }} keyboardShouldPersistTaps="handled" style={{ minHeight: 130, maxHeight: 380 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
      {hasMore && <Button variant="outline" busy={busy} onPress={() => void older()}>Load older messages</Button>}
      {!messages.length && !error && <Text style={s.body}>Start with a thoughtful introduction.</Text>}
      {messages.map(message => <View key={message.id} style={{ alignSelf: message.senderId === ownerId ? 'flex-end' : 'flex-start', width: '90%', padding: 13, borderRadius: 13, backgroundColor: message.senderId === ownerId ? C.sage : C.paper, borderWidth: 1, borderColor: C.border, gap: 7 }}><Text selectable style={s.body}>{message.body}</Text><Text style={s.hint}>{message.senderId === ownerId ? 'You' : 'Connected owner'} · {new Date(message.createdAt).toLocaleString()}</Text>{message.senderId !== ownerId && <Button variant="ghost" onPress={() => { setReport(message); setReportSent(false); }}>Report message</Button>}</View>)}
    </ScrollView>
    <Field label="Message" value={retry ? retry.body : body} onChange={value => { if (!retry) setBody(value); }} maxLength={2000} multiline hint={retry ? 'This message is awaiting confirmation. Retry or discard it before composing another.' : `${body.length}/2000 characters. Avoid sharing sensitive records.`} />
    <View style={[s.row, { flexWrap: 'wrap' }]}><Button icon="send" busy={busy} disabled={!retry && !body.trim()} onPress={() => void send()}>{retry ? 'Retry message' : 'Send message'}</Button>{retry && <Button variant="ghost" disabled={busy} onPress={() => { setRetry(null); setBody(''); }}>Cancel retry</Button>}</View>
    </>}
  </View></KeyboardAvoidingView></Modal>;
}
