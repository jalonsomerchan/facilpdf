import { PDFDocument } from 'pdf-lib';
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type CompressionLevel = 'soft' | 'recommended' | 'maximum';

export interface CompressionPreset {
  id: CompressionLevel;
  scale: number;
  quality: number;
  label: string;
  description: string;
}

export interface CompressionProgress {
  currentPage: number;
  totalPages: number;
  stage: 'loading' | 'rendering' | 'building' | 'saving';
}

export interface CompressionResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  pageCount: number;
  reductionPercent: number;
  wasReduced: boolean;
}

export interface CompressPdfOptions {
  file: File;
  level: CompressionLevel;
  pages?: number[];
  rotations?: Record<number, number>;
  onProgress?: (_progress: CompressionProgress) => void;
}

export const compressionPresets: Record<CompressionLevel, CompressionPreset> = {
  soft: {
    id: 'soft',
    scale: 1.35,
    quality: 0.82,
    label: 'Suave',
    description: 'Mejor calidad visual, menor reducción de peso.',
  },
  recommended: {
    id: 'recommended',
    scale: 1.05,
    quality: 0.68,
    label: 'Recomendado',
    description: 'Buen equilibrio entre calidad visual y tamaño final.',
  },
  maximum: {
    id: 'maximum',
    scale: 0.78,
    quality: 0.5,
    label: 'Máximo',
    description: 'Más compresión, más pérdida de detalle.',
  },
};

export async function compressPdfInBrowser({
  file,
  level,
  pages,
  rotations = {},
  onProgress,
}: CompressPdfOptions): Promise<CompressionResult> {
  const preset = compressionPresets[level];
  const arrayBuffer = await file.arrayBuffer();
  const sourceBytes = new Uint8Array(arrayBuffer.slice(0));

  onProgress?.({ currentPage: 0, totalPages: 0, stage: 'loading' });

  const loadingTask = getDocument({
    data: sourceBytes.slice(),
    useWorkerFetch: false,
    disableAutoFetch: true,
    disableStream: true,
  });

  const pdf = await loadingTask.promise;

  try {
    const outputPdf = await PDFDocument.create();
    outputPdf.setTitle(`Comprimido - ${file.name}`);
    outputPdf.setCreator('FácilPDF');
    outputPdf.setProducer('FácilPDF');

    const pageNumbers = normalizePages(pages, pdf.numPages);

    for (let index = 0; index < pageNumbers.length; index += 1) {
      const pageNumber = pageNumbers[index];
      onProgress?.({ currentPage: index + 1, totalPages: pageNumbers.length, stage: 'rendering' });

      const page = await pdf.getPage(pageNumber);
      const renderedPage = await renderPageToJpeg(
        page,
        preset,
        normalizeDegrees(rotations[pageNumber] ?? 0),
      );
      page.cleanup();

      onProgress?.({ currentPage: index + 1, totalPages: pageNumbers.length, stage: 'building' });

      const image = await outputPdf.embedJpg(renderedPage.jpegBytes);
      const pdfPage = outputPdf.addPage([renderedPage.width, renderedPage.height]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: renderedPage.width,
        height: renderedPage.height,
      });

      await yieldToBrowser();
    }

    onProgress?.({
      currentPage: pageNumbers.length,
      totalPages: pageNumbers.length,
      stage: 'saving',
    });

    const compressedBytes = await outputPdf.save({ useObjectStreams: true });
    const reductionPercent = calculateReduction(sourceBytes.byteLength, compressedBytes.byteLength);

    return {
      bytes: compressedBytes,
      originalSize: sourceBytes.byteLength,
      compressedSize: compressedBytes.byteLength,
      pageCount: pageNumbers.length,
      reductionPercent,
      wasReduced: compressedBytes.byteLength < sourceBytes.byteLength,
    };
  } finally {
    await destroyPdf(pdf);
  }
}

async function renderPageToJpeg(page: PDFPageProxy, preset: CompressionPreset, rotation = 0) {
  const baseViewport = page.getViewport({ scale: 1 });
  const renderViewport = page.getViewport({
    scale: preset.scale,
    rotation: normalizeDegrees(baseViewport.rotation + rotation),
  });
  const outputViewport = page.getViewport({
    scale: 1,
    rotation: normalizeDegrees(baseViewport.rotation + rotation),
  });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) {
    throw new Error('No se pudo preparar el lienzo para renderizar la página.');
  }

  canvas.width = Math.max(1, Math.floor(renderViewport.width));
  canvas.height = Math.max(1, Math.floor(renderViewport.height));
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: context, viewport: renderViewport }).promise;

  const jpegBlob = await canvasToBlob(canvas, preset.quality);
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

  canvas.width = 1;
  canvas.height = 1;

  return {
    jpegBytes,
    width: outputViewport.width,
    height: outputViewport.height,
  };
}

function normalizePages(pages: number[] | undefined, totalPages: number) {
  const selected = pages?.length
    ? [...new Set(pages)].sort((a, b) => a - b)
    : Array.from({ length: totalPages }, (_, index) => index + 1);

  selected.forEach((page) => {
    if (!Number.isSafeInteger(page) || page < 1 || page > totalPages) {
      throw new Error(`Page ${page} is outside the PDF page range.`);
    }
  });

  return selected;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo convertir la página a imagen JPEG.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

function calculateReduction(originalSize: number, compressedSize: number) {
  if (originalSize <= 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10;
}

async function destroyPdf(pdf: PDFDocumentProxy) {
  try {
    await pdf.destroy();
  } catch {
    // pdf.js may throw if the worker/document is already being destroyed.
  }
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.requestIdleCallback?.(() => resolve(), { timeout: 120 }) ??
      window.setTimeout(resolve, 0);
  });
}
