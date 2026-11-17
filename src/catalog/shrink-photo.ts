import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { fitWithin, PHOTO_QUALITY } from './photo-size';

export type PickedPhoto = { uri: string; width?: number; height?: number };

/**
 * Makes the picked photo small before it is shown, kept on the phone or sent: long side at most 1280 px, saved as JPEG (which also turns
 * a HEIC from a newer camera into something every server and browser shows). The big copy the picker made in the app's cache is deleted.
 * Returns null if the phone could not do it, and the caller carries on with the photo as picked: a big photo is better than no photo.
 */
export async function shrinkPhoto(photo: PickedPhoto): Promise<{ uri: string; type: 'image/jpeg' } | null> {
  try {
    const target = fitWithin(photo.width, photo.height);
    const context = ImageManipulator.manipulate(photo.uri);
    if (target) context.resize(target.width >= target.height ? { width: target.width } : { height: target.height });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
    // The picker's own copy sits in the cache folder (the photo in the gallery is never touched); it is big and no longer needed.
    if (photo.uri.includes('/cache/') && saved.uri !== photo.uri) {
      try {
        new File(photo.uri).delete();
      } catch {
        // the system empties the cache itself later
      }
    }
    return { uri: saved.uri, type: 'image/jpeg' };
  } catch {
    return null;
  }
}
