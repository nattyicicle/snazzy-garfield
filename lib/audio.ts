export function resolveAudioSource(file: string) {
  const baseUrl = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.replace(/\/+$/, "");

  if (!baseUrl || /^(https?:|data:|blob:)/i.test(file)) {
    return file;
  }

  return `${baseUrl}${file.startsWith("/") ? file : `/${file}`}`;
}
