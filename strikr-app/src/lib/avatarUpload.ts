import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<{ url?: string; error?: string }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: 'permission_denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return {};

  // fetch(uri).blob() is unreliable for local file:// URIs on real devices
  // (silently produces an empty/corrupt body on iOS) — read as base64 and
  // decode to an ArrayBuffer instead, which is what Supabase's own React
  // Native upload guide recommends.
  const base64 = await new File(result.assets[0].uri).base64();
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decode(base64), {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust: the path never changes on re-upload, so without this the
  // new photo wouldn't show until some cache (device or CDN) expires.
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}
