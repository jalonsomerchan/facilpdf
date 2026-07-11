import { PDFDocument } from 'pdf-lib';

export type PdfPageSize = 'a3' | 'a4' | 'a5' | 'letter' | 'legal';
export type PdfPageOrientation = 'portrait' | 'landscape';

export interface ResizePdfOptions {
  file: File;
  pageSize: PdfPageSize;
  orientation: PdfPageOrientation;
  marginMm?: number;
}

export interface ResizePdfResult {
  bytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  width: number;
  height: number;
}

const PAGE_SIZES: Record<PdfPageSize, readonly [number, number]> = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
};

const POINTS_PER_MM = 72 / 25.4;

export function getTargetPageSize(pageSize: PdfPageSize, orientation: PdfPageOrientation) {
  const size = PAGE_SIZES[pageSize];
  if (!size) throw new Error('Unsupported PDF page size.');
  const [portraitWidth, portraitHeight] = size;
  return orientation === 'landscape'
    ? { width: portraitHeight, height: portraitWidth }
    : { width: portraitWidth, height: portraitHeight };
}

export async function resizePdfInBrowser({
  file,
  pageSize,
  orientation,
  marginMm = 10,
}: ResizePdfOptions): Promise<ResizePdfResult> {
  const sourceBytes = new Uint8Array((await file.arrayBuffer()).slice(0));
  const sourcePdf = await PDFDocument.load(sourceBytes.slice(), { ignoreEncryption: false });
  const outputPdf = await PDFDocument.create();
  const { width, height } = getTargetPageSize(pageSize, orientation);
  const safeMargin =
    Math.min(Math.max(Number.isFinite(marginMm) ? marginMm : 0, 0), 50) * POINTS_PER_MM;
  const availableWidth = width - safeMargin * 2;
  const availableHeight = height - safeMargin * 2;

  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new Error('The selected margin is too large for this page size.');
  }

  for (const sourcePage of sourcePdf.getPages()) {
    const embeddedPage = await outputPdf.embedPage(sourcePage);
    const scale = Math.min(
      availableWidth / embeddedPage.width,
      availableHeight / embeddedPage.height,
    );
    const drawnWidth = embeddedPage.width * scale;
    const drawnHeight = embeddedPage.height * scale;
    const page = outputPdf.addPage([width, height]);

    page.drawPage(embeddedPage, {
      x: (width - drawnWidth) / 2,
      y: (height - drawnHeight) / 2,
      width: drawnWidth,
      height: drawnHeight,
    });
  }

  outputPdf.setTitle(`Redimensionado - ${file.name}`);
  outputPdf.setCreator('FácilPDF');
  outputPdf.setProducer('FácilPDF');
  outputPdf.setModificationDate(new Date());

  const bytes = await outputPdf.save({ useObjectStreams: true });

  return {
    bytes,
    originalSize: sourceBytes.byteLength,
    outputSize: bytes.byteLength,
    pageCount: outputPdf.getPageCount(),
    width,
    height,
  };
}
