import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE, validateFile } from './file';

describe('validateFile', () => {
  it('accepts a normal PDF', () => {
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 }).ok).toBe(
      true,
    );
  });
  it('accepts a PDF with empty mime type but .pdf extension', () => {
    expect(validateFile({ name: 'A.PDF', type: '', size: 1000 }).ok).toBe(true);
  });
  it('rejects non-PDF files', () => {
    expect(validateFile({ name: 'a.png', type: 'image/png', size: 1000 }).ok).toBe(false);
  });
  it('rejects files over 10 MB', () => {
    expect(
      validateFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_FILE_SIZE + 1 })
        .ok,
    ).toBe(false);
  });
  it('rejects empty files', () => {
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 0 }).ok).toBe(
      false,
    );
  });
});
