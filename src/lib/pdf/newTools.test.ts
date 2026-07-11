import { PDFDocument, rgb } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { flattenPdfInBrowser } from './flattenPdf';
import { getTargetPageSize, resizePdfInBrowser } from './resizePdf';

async function makePdfFile(withForm = false) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 600]);
  page.drawText('FácilPDF test', { x: 30, y: 540, color: rgb(0.1, 0.2, 0.4) });

  if (withForm) {
    const field = pdf.getForm().createTextField('name');
    field.setText('Ada');
    field.addToPage(page, { x: 30, y: 480, width: 180, height: 28 });
  }

  const bytes = await pdf.save();
  return new File([bytes.slice().buffer as ArrayBuffer], 'test.pdf', { type: 'application/pdf' });
}

describe('resizePdfInBrowser', () => {
  it('uses standard dimensions and preserves the page count', async () => {
    const file = await makePdfFile();
    const result = await resizePdfInBrowser({
      file,
      pageSize: 'a4',
      orientation: 'landscape',
      marginMm: 12,
    });
    const output = await PDFDocument.load(result.bytes);
    const expected = getTargetPageSize('a4', 'landscape');

    expect(output.getPageCount()).toBe(1);
    expect(output.getPage(0).getWidth()).toBeCloseTo(expected.width, 1);
    expect(output.getPage(0).getHeight()).toBeCloseTo(expected.height, 1);
  });
});

describe('flattenPdfInBrowser', () => {
  it('turns interactive form fields into fixed page content', async () => {
    const result = await flattenPdfInBrowser(await makePdfFile(true));
    const output = await PDFDocument.load(result.bytes);

    expect(result.flattenedFields).toBe(1);
    expect(output.getForm().getFields()).toHaveLength(0);
    expect(output.getPageCount()).toBe(1);
  });
});
