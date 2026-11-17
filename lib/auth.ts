import { supabase } from './supabase';
import type { Profile } from './types';

/**
 * Every player is an anonymous user by default; upgrading to email later keeps the
 * same user id, so their seat and score survive the upgrade.
 */
export async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const existing = data.session?.user.id;
  if (existing) return existing;

  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error || !created.user) {
    throw new Error(error?.message ?? 'could not start a session');
  }
  return created.user.id;
}

export async function loadProfile(): Promise<Profile | null> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji')
    .eq('id', uid)
    .maybeSingle();

  if (error) return null;
  if (!data) {
    const fallback: Profile = { id: uid, display_name: 'player', avatar_emoji: '🙂' };
    await saveProfile(fallback);
    return fallback;
  }
  return data as Profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: profile.id,
      display_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
}
