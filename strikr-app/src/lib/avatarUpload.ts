import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<{ url?: string; error?: string }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { error: 'permission_denied' };

  // Cropped to a square but NOT downscaled in resolution — a modern phone
  // photo stays several MB even after cropping, which is slow to upload and
  // slow to (re-)download everywhere the avatar shows up (leaderboard rows,
  // friends list, profile). A real fix needs actual resizing (a native
  // image-manipulation module, requiring a new build — tracked separately).
  // Dropping quality this much is the one lever available without that: it
  // meaningfully shrinks the file for a circle this small on screen, at the
  // cost of some visible compression artifacting if zoomed in.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.3,
  });
  if (result.canceled || !result.assets?.[0]) return {};

  // fetch(uri).blob() is unreliable for local file:// URIs on real devices;
  // .arrayBuffer() is what Supabase's own Expo/React Native guide uses.
  const arraybuffer = await fetch(result.assets[0].uri).then((res) => res.arrayBuffer());
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, arraybuffer, {
    contentType: result.assets[0].mimeType ?? 'image/jpeg',
    upsert: true,
  });
  if (error) {
    const status = (error as { statusCode?: string }).statusCode;
    return { error: status ? `[${status}] ${error.message} (${arraybuffer.byteLength} bytes)` : `${error.message} (${arraybuffer.byteLength} bytes)` };
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust: the path never changes on re-upload, so without this the
  // new photo wouldn't show until some cache (device or CDN) expires.
  return { url: `${data.publicUrl}?t=${Date.now()}` };
}
