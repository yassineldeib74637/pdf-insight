import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Below this many characters the PDF is treated as a scan without a text layer. */
const MIN_TEXT_LENGTH = 50;

export class NoTextLayerError extends Error {
  constructor() {
    super(
      'Ten PDF nie zawiera warstwy tekstowej (prawdopodobnie skan). OCR nie jest obsługiwany.',
    );
    this.name = 'NoTextLayerError';
  }
}

export interface ExtractedPdf {
  text: string;
  pages: number;
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  try {
    const parts: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
      parts.push(`[Strona ${pageNumber}]\n${text}`);
    }
    const full = parts.join('\n\n');
    if (full.replace(/\[Strona \d+\]/g, '').trim().length < MIN_TEXT_LENGTH) {
      throw new NoTextLayerError();
    }
    return { text: full, pages: doc.numPages };
  } finally {
    await loadingTask.destroy();
  }
}
