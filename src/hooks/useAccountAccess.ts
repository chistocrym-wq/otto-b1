import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deactivatePreview20GuestSandbox, installPreview20GuestSandbox } from '@/lib/preview20GuestSandbox';

export interface AccountAccess {
  authenticated: boolean;
  guest?: boolean;
  userId?: string;
  serverNow: string | null;
  trialActive: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionActive: boolean;
  subscriptionUntil: string | null;
  hasTrainingAccess: boolean;
  reason?: string;
}

const VERIFIED_ACCESS_GRACE_MS = 5 * 60_000;

const initialAccess: AccountAccess = {
  authenticated: false,
  serverNow: null,
  trialActive: false,
  trialStartedAt: null,
  trialEndsAt: null,
  subscriptionActive: false,
  subscriptionUntil: null,
  hasTrainingAccess: false,
};

export function useAccountAccess() {
  const [access, setAccess] = useState<AccountAccess>(initialAccess);
  const [ready, setReady] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'loading'|'granted'|'denied'|'failed'>('loading');
  const [tick, setTick] = useState(0);
  const [connectionInterrupted, setConnectionInterrupted] = useState(false);
  const lastGrantedAtRef = useRef<number | null>(null);
  const receivedAtRef = useRef(Date.now());
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const checkedOnceRef = useRef(false);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    // Do not unmount the active exercise on normal background access checks.
    if (!checkedOnceRef.current) setCheckStatus('loading');
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/account-access', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;
      const payload: unknown = await response.json().catch(() => null);
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Explicit authorization denial must never be treated as an outage.
          lastGrantedAtRef.current = null;
          deactivatePreview20GuestSandbox();
          setAccess(initialAccess);
          setConnectionInterrupted(false);
          setCheckStatus('denied');
        } else {
          setConnectionInterrupted(true);
          setCheckStatus(previous => previous === 'granted' ? 'granted' : 'failed');
        }
        return;
      }
      if (!payload || typeof payload !== 'object' ||
          typeof (payload as AccountAccess).authenticated !== 'boolean' ||
          typeof (payload as AccountAccess).hasTrainingAccess !== 'boolean') {
        throw new Error('Invalid account access response');
      }
      const data = payload as AccountAccess;
      if (data.guest === true) installPreview20GuestSandbox(data.trialStartedAt);
      else deactivatePreview20GuestSandbox();
      receivedAtRef.current = Date.now();
      lastGrantedAtRef.current = (data.authenticated || data.guest) && data.hasTrainingAccess ? Date.now() : null;
      setConnectionInterrupted(false);
      setAccess({
        ...initialAccess, ...data,
        authenticated: data.authenticated === true,
        trialActive: data.trialActive === true,
        subscriptionActive: data.subscriptionActive === true,
        hasTrainingAccess: data.hasTrainingAccess === true,
      });
      setCheckStatus((data.authenticated || data.guest) && data.hasTrainingAccess ? 'granted' : 'denied');
    } catch {
      if (requestId !== requestIdRef.current) return;
      // Preserve only previously verified access during a brief network failure.
      setConnectionInterrupted(true);
      setCheckStatus(previous => previous === 'granted' ? 'granted' : 'failed');
    } finally {
      window.clearTimeout(timeout);
      if (requestId === requestIdRef.current) {
        checkedOnceRef.current = true;
        controllerRef.current = null;
        setReady(true);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const refreshId = window.setInterval(() => void refresh(), 60_000);
    const onOffline = () => setConnectionInterrupted(true);
    const onOnline = () => void refresh();
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    const tickId = window.setInterval(() => setTick((value) => value + 1), 1_000);
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      window.clearInterval(refreshId);
      window.clearInterval(tickId);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [refresh]);

  const remainingMs = useMemo(() => {
    void tick;
    if (!access.trialEndsAt || !access.serverNow) return 0;

    const serverNowMs = Date.parse(access.serverNow);
    const endsAtMs = Date.parse(access.trialEndsAt);
    if (!Number.isFinite(serverNowMs) || !Number.isFinite(endsAtMs)) return 0;

    const elapsedSinceResponse = Date.now() - receivedAtRef.current;
    return Math.max(0, endsAtMs - (serverNowMs + elapsedSinceResponse));
  }, [access.serverNow, access.trialEndsAt, tick]);

  // Do not extend a known trial/subscription expiration during the grace period.
  // The server clock is used rather than trusting the device clock alone.
  void tick;
  const clockBase = Date.parse(access.serverNow || '');
  const nowFromServer = Number.isFinite(clockBase) ? clockBase + Date.now() - receivedAtRef.current : NaN;
  const trialEnd = Date.parse(access.trialEndsAt || '');
  const paidEnd = Date.parse(access.subscriptionUntil || '');
  const trialValid = access.trialActive && (!Number.isFinite(trialEnd) || Number.isFinite(nowFromServer) && nowFromServer < trialEnd);
  const paidValid = access.subscriptionActive && (!Number.isFinite(paidEnd) || Number.isFinite(nowFromServer) && nowFromServer < paidEnd);
  const deadlineExpired = access.hasTrainingAccess && (access.trialActive || access.subscriptionActive) && !trialValid && !paidValid;
  const graceExpired = connectionInterrupted && checkStatus === 'granted' &&
    (lastGrantedAtRef.current === null || Date.now() - lastGrantedAtRef.current > VERIFIED_ACCESS_GRACE_MS);
  const effectiveAccess = deadlineExpired ? { ...access, hasTrainingAccess: false, trialActive: trialValid, subscriptionActive: paidValid } : access;
  return { access: effectiveAccess, ready, refresh, remainingMs,
    checkStatus: graceExpired ? 'failed' as const : checkStatus, connectionInterrupted };
}
