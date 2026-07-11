import { PDFDocument } from 'pdf-lib';

export interface FlattenPdfResult {
  bytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  pageCount: number;
  flattenedFields: number;
  removedXfa: boolean;
}

export async function flattenPdfInBrowser(file: File): Promise<FlattenPdfResult> {
  const sourceBytes = new Uint8Array((await file.arrayBuffer()).slice(0));
  const pdf = await PDFDocument.load(sourceBytes.slice(), { ignoreEncryption: false });
  const form = pdf.getForm();
  const fields = form.getFields();
  const removedXfa = form.hasXFA();

  if (removedXfa) form.deleteXFA();
  if (fields.length > 0) form.flatten({ updateFieldAppearances: true });

  pdf.setCreator('FácilPDF');
  pdf.setProducer('FácilPDF');
  pdf.setModificationDate(new Date());

  const bytes = await pdf.save({ useObjectStreams: true });

  return {
    bytes,
    originalSize: sourceBytes.byteLength,
    outputSize: bytes.byteLength,
    pageCount: pdf.getPageCount(),
    flattenedFields: fields.length,
    removedXfa,
  };
}
