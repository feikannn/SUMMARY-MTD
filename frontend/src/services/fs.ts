import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Writes a UTF-8 text file into the cache dir and returns its File (overwriting any prior).
export function writeTextFile(name: string, content: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file;
}

// Writes binary (base64) content, used for xlsx.
export function writeBase64File(name: string, base64: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: "base64" });
  return file;
}

export async function shareFile(uri: string, mimeType?: string, dialogTitle?: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: undefined });
  return true;
}

export async function readFileText(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    // expo-file-system File() is unsupported on web; the DocumentPicker uri is a
    // blob/object URL that fetch can read directly.
    const res = await fetch(uri);
    return await res.text();
  }
  const file = new File(uri);
  return await file.text();
}
