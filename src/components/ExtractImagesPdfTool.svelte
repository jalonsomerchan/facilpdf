<script lang="ts">
  import { onDestroy } from 'svelte';
  import JSZip from 'jszip';
  import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
  import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
  import PdfDropzone from './PdfDropzone.svelte';
  import { parsePageRanges } from '../lib/pdf/pageRanges';
  import { formatFileSize, getFriendlyPdfError, getPdfBaseFilename, yieldToBrowser } from '../lib/pdfToolUtils';

  type Lang = 'es' | 'en';
  type ImageFormat = 'png' | 'jpg' | 'webp';

  export let lang: Lang = 'es';
  export let defaultFormat: ImageFormat = 'png';
  export let lockedFormat: ImageFormat | null = null;

  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const copy = {
    es: {
      title: 'Extraer imágenes de PDF',
      intro: 'Convierte páginas de un PDF en imágenes PNG o JPG directamente en tu navegador.',
      warning: 'Esta herramienta exporta páginas renderizadas como imágenes. No extrae los recursos internos originales del PDF.',
      drop: 'Arrastra un PDF aquí',
      active: 'Suelta el PDF',
      subtitle: 'Suelta el archivo o pulsa para seleccionarlo',
      help: 'Solo PDF · procesamiento local',
      invalid: 'Selecciona un PDF válido.',
      error: 'No se pudieron exportar las páginas como imágenes.',
      ready: 'Imágenes generadas correctamente.',
      file: 'PDF seleccionado',
      change: 'Cambiar PDF',
      pages: 'Páginas a exportar',
      pagesHelp: 'Ejemplo: 1, 3-5. Déjalo vacío para exportar todas las páginas.',
      format: 'Formato',
      quality: 'Calidad de imagen',
      scale: 'Resolución',
      generate: 'Exportar imágenes',
      generating: 'Exportando imágenes…',
      download: 'Descargar resultado',
      result: 'Resultado preparado',
      badFormat: 'Usa números o rangos separados por comas, por ejemplo 1, 3-5.',
      invalidNumber: 'Las páginas deben ser números positivos.',
      reversedRange: 'El rango {range} está invertido.',
      outOfBounds: 'La página {page} no existe. El PDF tiene {total} páginas.',
      duplicated: 'La página {page} está repetida.',
      needFile: 'Carga un PDF antes de elegir páginas.',
    },
    en: {
      title: 'Extract PDF images',
      intro: 'Convert PDF pages into PNG or JPG images directly in your browser.',
      warning: 'This tool exports rendered pages as images. It does not extract the original internal PDF image resources.',
      drop: 'Drag a PDF here',
      active: 'Drop the PDF',
      subtitle: 'Drop the file or click to select it',
      help: 'PDF only · local processing',
      invalid: 'Select a valid PDF.',
      error: 'The pages could not be exported as images.',
      ready: 'Images generated successfully.',
      file: 'Selected PDF',
      change: 'Change PDF',
      pages: 'Pages to export',
      pagesHelp: 'Example: 1, 3-5. Leave empty to export all pages.',
      format: 'Format',
      quality: 'Image quality',
      scale: 'Resolution',
      generate: 'Export images',
      generating: 'Exporting images…',
      download: 'Download result',
      result: 'Result ready',
      badFormat: 'Use numbers or ranges separated by commas, for example 1, 3-5.',
      invalidNumber: 'Pages must be positive numbers.',
      reversedRange: 'The range {range} is reversed.',
      outOfBounds: 'Page {page} does not exist. The PDF has {total} pages.',
      duplicated: 'Page {page} is duplicated.',
      needFile: 'Load a PDF before choosing pages.',
    },
  } as const;

  let file: File | null = null;
  let pdfDocument: PDFDocumentProxy | null = null;
  let pageCount = 0;
  let pageRange = '';
  let format: ImageFormat = lockedFormat ?? defaultFormat;
  let quality = 0.9;
  let scale = 1.6;
  let isGenerating = false;
  let progress = 0;
  let statusMessage = '';
  let errorMessage = '';
  let resultUrl = '';
  let resultName = '';
  let resultSize = 0;

  $: t = copy[lang] ?? copy.es;
  $: canGenerate = Boolean(file && pdfDocument && pageCount > 0) && !isGenerating;
  $: selectedPages = pageRange.trim() ? parsePageRanges(pageRange, pageCount, rangeMessages()).pages : Array.from({ length: pageCount }, (_, index) => index + 1);

  function rangeMessages() {
    return {
      needFile: t.needFile,
      badFormat: t.badFormat,
      invalidNumber: t.invalidNumber,
      reversedRange: t.reversedRange,
      outOfBounds: t.outOfBounds,
      duplicated: t.duplicated,
    };
  }

  async function addFiles(files: File[]) {
    const selectedFile = files[0];
    if (!selectedFile) return;

    await clearPdfDocument();
    clearResult();
    errorMessage = '';
    statusMessage = '';
    progress = 0;

    try {
      const data = new Uint8Array(await selectedFile.arrayBuffer());
      const loadingTask = getDocument({ data, useWorkerFetch: false, isEvalSupported: false, disableAutoFetch: true, disableStream: true });
      pdfDocument = await loadingTask.promise;
      file = selectedFile;
      pageCount = pdfDocument.numPages;
      pageRange = '';
    } catch (error) {
      file = null;
      pdfDocument = null;
      pageCount = 0;
      errorMessage = getFriendlyPdfError(error, t.invalid);
    }
  }

  function handleInvalidFiles() {
    errorMessage = t.invalid;
  }

  async function generateImages() {
    if (!file || !pdfDocument) return;

    const parsed = pageRange.trim() ? parsePageRanges(pageRange, pageCount, rangeMessages()) : { pages: selectedPages, error: '' };
    if (parsed.error) {
      errorMessage = parsed.error;
      return;
    }

    isGenerating = true;
    progress = 0;
    statusMessage = '';
    errorMessage = '';
    clearResult();

    try {
      const pages = parsed.pages.length ? parsed.pages : selectedPages;
      const generated = [] as Array<{ name: string; blob: Blob }>;
      const baseName = getPdfBaseFilename(file, 'pdf-pages');

      for (const [index, pageNumber] of pages.entries()) {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas unavailable');

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const task = page.render({ canvasContext: context, viewport });
        await task.promise;
        page.cleanup();

        const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
        const blob = await canvasToBlob(canvas, mime, format === 'png' ? undefined : quality);
        generated.push({ name: `${baseName}-pagina-${String(pageNumber).padStart(3, '0')}.${format}`, blob });
        progress = Math.round(((index + 1) / pages.length) * 100);
        await yieldToBrowser();
      }

      if (generated.length === 1) {
        resultName = generated[0].name;
        resultSize = generated[0].blob.size;
        resultUrl = URL.createObjectURL(generated[0].blob);
      } else {
        const zip = new JSZip();
        for (const item of generated) zip.file(item.name, item.blob);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        resultName = `${baseName}-imagenes.zip`;
        resultSize = zipBlob.size;
        resultUrl = URL.createObjectURL(zipBlob);
      }

      statusMessage = t.ready;
    } catch (error) {
      errorMessage = getFriendlyPdfError(error, t.error);
    } finally {
      isGenerating = false;
    }
  }

  function canvasToBlob(canvas: HTMLCanvasElement, mime: string, imageQuality?: number) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image export failed'));
      }, mime, imageQuality);
    });
  }

  async function clearFile() {
    file = null;
    pageCount = 0;
    pageRange = '';
    errorMessage = '';
    statusMessage = '';
    progress = 0;
    clearResult();
    await clearPdfDocument();
  }

  function clearResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = '';
    resultName = '';
    resultSize = 0;
  }

  async function clearPdfDocument() {
    if (!pdfDocument) return;
    try {
      await pdfDocument.destroy();
    } catch {
      // Ignore pdf.js cleanup errors.
    }
    pdfDocument = null;
  }

  onDestroy(() => {
    clearResult();
    void clearPdfDocument();
  });
</script>

<section class="extract-images-tool" aria-labelledby="extract-images-title">
  <header class="tool-head">
    <div>
      <span>FácilPDF</span>
      <h2 id="extract-images-title">{t.title}</h2>
      <p>{t.intro}</p>
    </div>
    <strong aria-hidden="true">🖼️</strong>
  </header>

  <p class="warning" role="note">{t.warning}</p>

  <PdfDropzone title={t.drop} activeTitle={t.active} subtitle={t.subtitle} help={t.help} onFiles={addFiles} onInvalidFiles={handleInvalidFiles} />

  {#if errorMessage}<p class="message error" role="alert">{errorMessage}</p>{/if}
  {#if statusMessage}<p class="message success" role="status">{statusMessage}</p>{/if}

  {#if file}
    <div class="panel">
      <aside>
        <span>{t.file}</span>
        <strong>{file.name}</strong>
        <small>{formatFileSize(file.size)} · {pageCount} páginas</small>
        <button type="button" on:click={clearFile}>{t.change}</button>
      </aside>

      <div class="options">
        <label>
          <span>{t.pages}</span>
          <input bind:value={pageRange} type="text" placeholder="1, 3-5" />
          <small>{t.pagesHelp}</small>
        </label>

        {#if lockedFormat}
          <div class="locked-option" aria-label={`${t.format}: ${lockedFormat.toUpperCase()}`}>
            <span>{t.format}</span>
            <strong>{lockedFormat.toUpperCase()}</strong>
          </div>
        {:else}
          <label>
            <span>{t.format}</span>
            <select bind:value={format}>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WebP</option>
            </select>
          </label>
        {/if}

        <label>
          <span>{t.scale}: {scale.toFixed(1)}x</span>
          <input bind:value={scale} type="range" min="1" max="3" step="0.2" />
        </label>

        {#if format !== 'png'}
          <label>
            <span>{t.quality}: {Math.round(quality * 100)}%</span>
            <input bind:value={quality} type="range" min="0.45" max="1" step="0.05" />
          </label>
        {/if}

        {#if isGenerating}
          <progress value={progress} max="100">{progress}%</progress>
        {/if}

        <div class="actions">
          <button class="primary" type="button" disabled={!canGenerate} on:click={generateImages}>{isGenerating ? t.generating : t.generate}</button>
          <a class:disabled={!resultUrl} href={resultUrl || undefined} download={resultName || undefined}>{t.download}</a>
        </div>

        {#if resultUrl}
          <p class="result"><strong>{t.result}</strong><br />{resultName} · {formatFileSize(resultSize)}</p>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .extract-images-tool{display:grid;gap:22px;margin:34px 0 56px;padding:clamp(18px,3vw,30px);border:1px solid var(--color-border,#e2e8f0);border-radius:32px;background:linear-gradient(135deg,var(--color-surface,#fff),var(--color-surface-soft,#f8fafc));box-shadow:var(--shadow-md,0 30px 90px rgba(15,23,42,.11))}
  .tool-head{display:flex;align-items:center;justify-content:space-between;gap:18px}.tool-head h2{margin:0;font-size:clamp(1.6rem,3vw,2.3rem);letter-spacing:-.04em}.tool-head p{margin:.45rem 0 0;color:#64748b}.tool-head span{display:inline-flex;margin-bottom:8px;padding:5px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:.78rem;font-weight:950}.tool-head>strong{display:grid;width:96px;height:96px;place-items:center;border-radius:24px;background:#f0fdf4;font-size:2.8rem;box-shadow:0 20px 48px rgba(15,23,42,.12);transform:rotate(-4deg)}
  .warning{margin:0;padding:14px 16px;border:1px solid color-mix(in srgb,var(--color-success,#16a34a) 35%,var(--color-border));border-radius:18px;background:var(--color-success-soft,#f0fdf4);color:var(--color-success,#166534);font-weight:850}.message{margin:0;padding:13px 15px;border-radius:16px;font-weight:850}.message.error{background:var(--color-danger-soft,#fff1f2);color:var(--color-danger,#991b1b)}.message.success{background:var(--color-success-soft,#ecfdf5);color:var(--color-success,#166534)}.panel{display:grid;grid-template-columns:300px 1fr;gap:18px;align-items:start}.panel aside,.options{border:1px solid var(--color-border,#e2e8f0);border-radius:24px;background:var(--color-surface,#fff);box-shadow:var(--shadow-sm,0 18px 48px rgba(15,23,42,.07))}.panel aside{display:grid;gap:12px;padding:18px}.panel aside strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.panel span,label span,.locked-option span{color:var(--color-text-muted,#475569);font-size:.86rem;font-weight:900}.panel small{color:var(--color-text-soft,#64748b)}.options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:18px}.options label,.locked-option{display:grid;gap:8px}.options label:first-child{grid-column:1/-1}.locked-option strong{display:flex;min-height:48px;align-items:center;padding:0 14px;border:1px solid var(--color-border);border-radius:16px;background:var(--color-surface-soft);color:var(--color-text)}.options input,.options select{width:100%;box-sizing:border-box;min-height:48px;border:1px solid var(--color-border-strong,#cbd5e1);border-radius:16px;background:var(--color-surface,#fff);color:var(--color-text,#0f172a);font:inherit;font-weight:750}.options input[type='text'],.options select{padding:12px 14px}.options input[type='range']{accent-color:var(--color-success,#16a34a)}.options progress{grid-column:1/-1;width:100%;height:14px}.panel button,.actions a{display:grid;min-height:46px;place-items:center;border:0;border-radius:999px;text-decoration:none;cursor:pointer;font:inherit;font-weight:950}.panel button:disabled,.actions a.disabled{pointer-events:none;cursor:not-allowed;opacity:.45}.panel aside button,.actions a{background:var(--color-surface-soft,#e2e8f0);color:var(--color-text,#0f172a)}.primary{background:linear-gradient(135deg,#22c55e,#15803d);color:#fff}.actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:12px}.result{grid-column:1/-1;margin:0;padding:14px 16px;border-radius:18px;background:var(--color-surface-soft,#f8fafc);color:var(--color-text-muted,#475569)}@media (max-width:850px){.tool-head,.panel{display:grid;grid-template-columns:1fr}.tool-head>strong{width:82px;height:82px}.options,.actions{grid-template-columns:1fr}}
</style>
