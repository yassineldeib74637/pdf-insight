export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type FileCheck = { ok: true } | { ok: false; message: string };

export function validateFile(file: Pick<File, 'name' | 'type' | 'size'>): FileCheck {
  const looksLikePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) {
    return { ok: false, message: 'Dozwolone są tylko pliki PDF.' };
  }
  if (file.size === 0) {
    return { ok: false, message: 'Plik jest pusty.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, message: 'Plik jest za duży. Maksymalny rozmiar to 10 MB.' };
  }
  return { ok: true };
}
