import { useCallback, useEffect, useState } from 'react';
import { bootstrapTelegramSession } from '@/lib/accessClient';

export type ContactType = 'email' | 'telegram';
export type LearningMode = 'guided' | 'direct';
export type AuthStatus = 'guest' | 'verified';
export type Gender = 'female' | 'male';

export interface UserProfile {
  name: string;
  contactType: ContactType;
  contact: string;
  contactVerified: boolean;
  authStatus: AuthStatus;
  gender?: Gender;
  learningMode: LearningMode;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileDraft {
  name: string;
  contactType: ContactType;
  contact: string;
  contactVerified: boolean;
  authStatus?: AuthStatus;
  gender?: Gender;
  learningMode: LearningMode;
}

const PROFILE_KEY = 'otto-user-profile';
const PROFILE_OWNER_KEY = 'otto-user-profile-owner-v1';
const ONBOARDING_KEY = 'otto-onboarding-completed';
const MODE_KEY = 'otto-learning-mode-v1';
const LEGACY_PROGRESS_KEYS = [
  'goethe-a1-progress',
  'otto-a1-activity-v1',
] as const;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function clearLocalProfileCache() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROFILE_OWNER_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignore
  }
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<UserProfile>;

  const name =
    typeof candidate.name === 'string'
      ? candidate.name.trim()
      : '';

  const contact =
    typeof candidate.contact === 'string'
      ? candidate.contact.trim()
      : '';

  const contactType =
    candidate.contactType === 'email' ||
    candidate.contactType === 'telegram'
      ? candidate.contactType
      : 'email';

  const learningMode =
    candidate.learningMode === 'guided' ||
    candidate.learningMode === 'direct'
      ? candidate.learningMode
      : null;

  if (!learningMode) return null;

  const createdAt =
    typeof candidate.createdAt === 'string' && candidate.createdAt
      ? candidate.createdAt
      : new Date().toISOString();

  const updatedAt =
    typeof candidate.updatedAt === 'string' && candidate.updatedAt
      ? candidate.updatedAt
      : createdAt;

  const contactVerified = candidate.contactVerified === true;

  const authStatus: AuthStatus =
    candidate.authStatus === 'verified' && contactVerified
      ? 'verified'
      : 'guest';

  if (authStatus === 'verified' && (!name || !contact)) {
    return null;
  }

  const gender: Gender | undefined =
    candidate.gender === 'female' ||
    candidate.gender === 'male'
      ? candidate.gender
      : undefined;

  return {
    name,
    contactType,
    contact,
    contactVerified,
    authStatus,
    gender,
    learningMode,
    createdAt,
    updatedAt,
  };
}

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = safeGet(PROFILE_KEY);
    return raw
      ? normalizeProfile(JSON.parse(raw))
      : null;
  } catch {
    return null;
  }
}

export function hasExistingLearningData() {
  return LEGACY_PROGRESS_KEYS.some((key) => {
    const value = safeGet(key);
    return Boolean(
      value &&
      value !== '{}' &&
      value !== '[]'
    );
  });
}

export function getStoredLearningMode(): LearningMode {
  const profile = loadUserProfile();

  if (profile) {
    return profile.learningMode;
  }

  return safeGet(MODE_KEY) === 'guided'
    ? 'guided'
    : 'direct';
}

async function persistServerProfile(profile: UserProfile, reportError?: (code: string) => void) {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: profile.name,
        gender: profile.gender,
        learningMode: profile.learningMode,
        onboardingCompleted: true,
      }),
    });

    const data = await response
      .json()
      .catch(() => ({}));
    if (!response.ok) {
      reportError?.(typeof data.code === 'string' ? data.code : response.status === 401 ? 'not_authenticated' : 'profile_save_failed');
      return null;
    }

    if (typeof data.userId === 'string' && data.userId) safeSet(PROFILE_OWNER_KEY, data.userId);
    const saved = normalizeProfile(data.profile);
    if (!saved) reportError?.('profile_response_invalid');
    return saved;
  } catch {
    reportError?.('network_error');
    return null;
  }
}

function cacheProfile(profile: UserProfile) {
  safeSet(PROFILE_KEY, JSON.stringify(profile));
  safeSet(MODE_KEY, profile.learningMode);
  safeSet(ONBOARDING_KEY, 'true');
}

export function useUserProfile() {
  const [profile, setProfile] =
    useState<UserProfile | null>(loadUserProfile);

  const [modePreference, setModePreference] =
    useState<LearningMode>(getStoredLearningMode);

  const [completed, setCompleted] =
    useState(
      () =>
        safeGet(ONBOARDING_KEY) === 'true' &&
        Boolean(loadUserProfile())
    );

  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  const legacyUser = false;

  const learningMode =
    profile?.learningMode ??
    modePreference;

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        await bootstrapTelegramSession();

        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'same-origin',
        });

        if (!response.ok) {
          if (response.status !== 401 && !cancelled) {
            setLoadFailed(true);
            setAuthenticated(false);
            setProfile(null);
            setCompleted(false);
          }
          if (
            response.status === 401 &&
            !cancelled
          ) {
            setAuthenticated(false);
            clearLocalProfileCache();
            setProfile(null);
            setCompleted(false);
          }

          return;
        }

        const data = await response
          .json()
          .catch(() => ({}));

        if (!data || data.authenticated !== true || typeof data.userId !== 'string') throw new Error('Invalid authenticated profile response');
        if (!cancelled) {
          setLoadFailed(false);
          setAuthenticated(true);
        }

        const remoteProfile =
          normalizeProfile(data.profile);

        if (remoteProfile) {
          if (cancelled) return;

          cacheProfile(remoteProfile);
          safeSet(PROFILE_OWNER_KEY, data.userId);
          setProfile(remoteProfile);
          setModePreference(
            remoteProfile.learningMode
          );
          setCompleted(
            data.profile?.onboardingCompleted === true
          );

          return;
        }

        /*
         * Only a user already authenticated by the NEW
         * server account system may seed a missing profile
         * from this device. Old local-only accounts are not
         * imported because they cannot reach this branch
         * without a valid server identity/session.
         */
        if (data.authenticated === true) {
          const localProfile =
            loadUserProfile();

          const localCompleted =
            safeGet(ONBOARDING_KEY) === 'true' &&
            Boolean(localProfile);

          if (
            localProfile &&
            localCompleted &&
            safeGet(PROFILE_OWNER_KEY) === data.userId
          ) {
            const saved =
              await persistServerProfile(
                localProfile
              );

            if (saved && !cancelled) {
              cacheProfile(saved);
              setProfile(saved);
              setModePreference(
                saved.learningMode
              );
              setCompleted(true);
            }

            return;
          }
        }

        if (!cancelled) {
          clearLocalProfileCache();
          setProfile(null);
          setCompleted(false);
        }
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setProfile(null);
          setAuthenticated(false);
          setCompleted(false);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback(
    async (draft: UserProfileDraft) => {
      const now = new Date().toISOString();
      const next: UserProfile = {
        name: draft.name.trim(),
        contactType: draft.contactType,
        contact: draft.contact.trim(),
        contactVerified: draft.contactVerified,
        authStatus:
          draft.authStatus === 'verified' &&
          draft.contactVerified
            ? 'verified'
            : 'guest',
        gender:
          draft.gender ??
          profile?.gender,
        learningMode: draft.learningMode,
        createdAt:
          profile?.createdAt ??
          now,
        updatedAt: now,
      };

      setProfileSaveError(null);
      const saved =
        await persistServerProfile(next, setProfileSaveError);

      if (!saved) {
        return false;
      }

      cacheProfile(saved);
      setProfile(saved);
      setModePreference(saved.learningMode);
      setAuthenticated(true);
      setCompleted(true);
      return true;
    },
    [profile]
  );

  const setGender = useCallback(
    (gender: Gender) => {
      setProfile((previous) => {
        if (!previous) return previous;

        const next: UserProfile = {
          ...previous,
          gender,
          updatedAt:
            new Date().toISOString(),
        };

        cacheProfile(next);
        void persistServerProfile(next);

        return next;
      });
    },
    []
  );

  const setLearningMode = useCallback(
    (mode: LearningMode) => {
      setModePreference(mode);
      safeSet(MODE_KEY, mode);

      setProfile((previous) => {
        if (!previous) return previous;

        const next: UserProfile = {
          ...previous,
          learningMode: mode,
          updatedAt:
            new Date().toISOString(),
        };

        cacheProfile(next);
        void persistServerProfile(next);

        return next;
      });
    },
    []
  );

  return {
    profile,
    completed,
    legacyUser,
    learningMode,
    ready,
    authenticated,
    loadFailed,
    saveProfile,
    profileSaveError,
    setGender,
    setLearningMode,
  };
}
