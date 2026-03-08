import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const column = `${provider}_sub`;
    const { data } = await getSupabase()
      .from('users')
      .select('*')
      .eq(column, providerUserId)
      .single();
    return data ?? null;
  },

  async findByEmail(email) {
    const { data } = await getSupabase()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    return data ?? null;
  },

  async createUser(profile: OAuthProfile) {
    const { data, error } = await getSupabase()
      .from('users')
      .insert({
        email: profile.email,
        name: profile.name,
        display_name: profile.name ?? profile.email.split('@')[0],
        avatar_url: profile.avatarUrl,
        role: (profile.raw?.role as string) ?? 'user',
        [`${profile.provider}_sub`]: profile.providerUserId,
      })
      .select()
      .single();
    if (error) throw error;
    return data!;
  },

  async linkProvider(userId, provider, providerUserId) {
    const { error } = await getSupabase()
      .from('users')
      .update({ [`${provider}_sub`]: providerUserId })
      .eq('id', userId);
    if (error) throw error;
  },

  async getUserById(id) {
    const { data } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return data ?? null;
  },
};
