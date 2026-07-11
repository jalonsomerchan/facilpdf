<script lang="ts">
  import { onDestroy } from 'svelte';
  import { PDFDocument } from 'pdf-lib';
  import PdfDropzone from './PdfDropzone.svelte';
  import PdfResultModal from './PdfResultModal.svelte';
  import {
    resizePdfInBrowser,
    type PdfPageOrientation,
    type PdfPageSize,
  } from '../lib/pdf/resizePdf';
  import {
    createPdfObjectUrl,
    formatFileSize,
    getFriendlyPdfError,
    getPdfBaseFilename,
    yieldToBrowser,
  } from '../lib/pdfToolUtils';

  type Lang = 'es' | 'en';
  export let lang: Lang = 'es';

  const copy = {
    es: {
      title: 'Cambiar el tamaño de página del PDF',
      intro: 'Adapta todas las páginas a A3, A4, A5, Carta o Legal sin rasterizar el documento.',
      drop: 'Arrastra un PDF para cambiar su tamaño',
      active: 'Suelta el PDF',
      subtitle: 'Suelta el archivo o pulsa para seleccionarlo',
      help: 'Solo PDF · el contenido se procesa localmente',
      invalid: 'Selecciona un PDF válido y sin contraseña.',
      error: 'No se pudo cambiar el tamaño del PDF.',
      ready: 'PDF redimensionado. Comprueba el resultado antes de descargarlo.',
      selected: 'PDF seleccionado',
      pages: 'páginas',
      change: 'Cambiar PDF',
      size: 'Tamaño final',
      orientation: 'Orientación',
      margin: 'Margen',
      marginHelp: 'El contenido se ajusta proporcionalmente dentro del margen.',
      portrait: 'Vertical',
      landscape: 'Horizontal',
      generate: 'Cambiar tamaño',
      generating: 'Redimensionando…',
      download: 'Descargar PDF redimensionado',
      open: 'Abrir en pestaña',
      close: 'Cerrar',
      previewTitle: 'Vista previa del PDF redimensionado',
      previewDesc: 'Revisa los márgenes y la orientación antes de descargar.',
      output: 'Resultado listo',
      local:
        'Las páginas se reconstruyen como contenido vectorial siempre que el PDF de origen lo permite.',
    },
    en: {
      title: 'Resize PDF pages',
      intro: 'Fit every page to A3, A4, A5, Letter or Legal without rasterizing the document.',
      drop: 'Drag a PDF to resize it',
      active: 'Drop the PDF',
      subtitle: 'Drop the file or click to select it',
      help: 'PDF only · content is processed locally',
      invalid: 'Select a valid PDF without a password.',
      error: 'The PDF could not be resized.',
      ready: 'PDF resized. Check the result before downloading it.',
      selected: 'Selected PDF',
      pages: 'pages',
      change: 'Change PDF',
      size: 'Output size',
      orientation: 'Orientation',
      margin: 'Margin',
      marginHelp: 'Content is scaled proportionally inside the selected margin.',
      portrait: 'Portrait',
      landscape: 'Landscape',
      generate: 'Resize PDF',
      generating: 'Resizing…',
      download: 'Download resized PDF',
      open: 'Open in tab',
      close: 'Close',
      previewTitle: 'Resized PDF preview',
      previewDesc: 'Check margins and orientation before downloading.',
      output: 'Result ready',
      local: 'Pages are rebuilt as vector content whenever the source PDF allows it.',
    },
  } as const;

  let file: File | null = null;
  let pageCount = 0;
  let pageSize: PdfPageSize = 'a4';
  let orientation: PdfPageOrientation = 'portrait';
  let marginMm = 10;
  let isProcessing = false;
  let errorMessage = '';
  let statusMessage = '';
  let resultSummary = '';
  let previewUrl = '';
  let isPreviewOpen = false;

  $: t = copy[lang] ?? copy.es;
  $: canGenerate = Boolean(file && pageCount) && !isProcessing;
  $: downloadName = `${getPdfBaseFilename(file, lang === 'en' ? 'resized-pdf' : 'pdf-redimensionado')}-${pageSize}.pdf`;

  onDestroy(clearResult);

  async function addFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    resetMessages();
    clearResult();

    try {
      const pdf = await PDFDocument.load(await selected.arrayBuffer(), { ignoreEncryption: false });
      file = selected;
      pageCount = pdf.getPageCount();
    } catch (error) {
      file = null;
      pageCount = 0;
      errorMessage = getFriendlyPdfError(error, t.invalid, lang);
    }
  }

  async function generate() {
    if (!file) return;
    isProcessing = true;
    resetMessages();
    clearResult();

    try {
      await yieldToBrowser();
      const result = await resizePdfInBrowser({ file, pageSize, orientation, marginMm });
      previewUrl = createPdfObjectUrl(result.bytes);
      resultSummary = `${result.pageCount} ${t.pages} · ${formatFileSize(result.outputSize)}`;
      statusMessage = t.ready;
      isPreviewOpen = true;
    } catch (error) {
      errorMessage = getFriendlyPdfError(error, t.error, lang);
    } finally {
      isProcessing = false;
    }
  }

  function clearFile() {
    file = null;
    pageCount = 0;
    resetMessages();
    clearResult();
  }

  function clearResult() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    isPreviewOpen = false;
    resultSummary = '';
  }

  function resetMessages() {
    errorMessage = '';
    statusMessage = '';
  }
</script>

<section class="new-pdf-tool" aria-labelledby="resize-tool-title">
  <header class="new-pdf-tool__head">
    <div>
      <span>FácilPDF</span>
      <h2 id="resize-tool-title">{t.title}</h2>
      <p>{t.intro}</p>
    </div>
    <strong aria-hidden="true">↔️</strong>
  </header>

  <PdfDropzone
    title={t.drop}
    activeTitle={t.active}
    subtitle={t.subtitle}
    help={t.help}
    onFiles={addFiles}
    onInvalidFiles={() => (errorMessage = t.invalid)}
    onValidationErrors={(errors) => (errorMessage = errors.join(' '))}
  />

  {#if errorMessage}<p class="new-pdf-tool__message new-pdf-tool__message--error" role="alert">
      {errorMessage}
    </p>{/if}
  {#if statusMessage}<p class="new-pdf-tool__message new-pdf-tool__message--success" role="status">
      {statusMessage}
    </p>{/if}

  {#if file}
    <div class="new-pdf-tool__workspace">
      <aside class="new-pdf-tool__file">
        <span>{t.selected}</span><strong>{file.name}</strong><small
          >{formatFileSize(file.size)} · {pageCount} {t.pages}</small
        >
        <button type="button" on:click={clearFile}>{t.change}</button>
      </aside>

      <form class="new-pdf-tool__options" on:submit|preventDefault={generate}>
        <label
          ><span>{t.size}</span><select bind:value={pageSize}
            ><option value="a3">A3</option><option value="a4">A4</option><option value="a5"
              >A5</option
            ><option value="letter">Letter</option><option value="legal">Legal</option></select
          ></label
        >
        <fieldset>
          <legend>{t.orientation}</legend><label
            ><input type="radio" bind:group={orientation} value="portrait" /> {t.portrait}</label
          ><label
            ><input type="radio" bind:group={orientation} value="landscape" /> {t.landscape}</label
          >
        </fieldset>
        <label
          ><span>{t.margin}: {marginMm} mm</span><input
            type="range"
            bind:value={marginMm}
            min="0"
            max="30"
            step="2"
          /><small>{t.marginHelp}</small></label
        >
        <p class="new-pdf-tool__note">🔒 {t.local}</p>
        <div class="new-pdf-tool__actions">
          <button class="primary" type="submit" disabled={!canGenerate}
            >{isProcessing ? t.generating : t.generate}</button
          ><button type="button" disabled={!previewUrl} on:click={() => (isPreviewOpen = true)}
            >{resultSummary || t.download}</button
          >
        </div>
      </form>
    </div>
  {/if}
</section>

<PdfResultModal
  open={isPreviewOpen && Boolean(previewUrl)}
  pdfUrl={previewUrl}
  filename={downloadName}
  title={t.previewTitle}
  description={t.previewDesc}
  downloadLabel={t.download}
  closeLabel={t.close}
  openLabel={t.open}
  on:close={() => (isPreviewOpen = false)}
/>

<style>
  .new-pdf-tool {
    display: grid;
    gap: var(--space-5);
    padding: clamp(1rem, 3vw, 1.8rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2xl);
    background: linear-gradient(135deg, var(--color-surface), var(--color-surface-soft));
    box-shadow: var(--shadow-md);
  }
  .new-pdf-tool__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .new-pdf-tool__head h2 {
    margin: 0;
    color: var(--color-text);
    font-size: clamp(1.55rem, 3vw, 2.25rem);
    letter-spacing: -0.04em;
  }
  .new-pdf-tool__head p {
    max-width: 48rem;
    margin: 0.45rem 0 0;
    color: var(--color-text-muted);
  }
  .new-pdf-tool__head span {
    display: inline-flex;
    margin-bottom: 0.45rem;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: 0.78rem;
    font-weight: 900;
  }
  .new-pdf-tool__head > strong {
    display: grid;
    width: 5rem;
    height: 5rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 1.35rem;
    background: var(--color-surface);
    font-size: 2.3rem;
    box-shadow: var(--shadow-md);
    transform: rotate(4deg);
  }
  .new-pdf-tool__message {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-lg);
    font-weight: 800;
  }
  .new-pdf-tool__message--error {
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  .new-pdf-tool__message--success {
    background: var(--color-success-soft);
    color: var(--color-success);
  }
  .new-pdf-tool__workspace {
    display: grid;
    grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  .new-pdf-tool__file,
  .new-pdf-tool__options {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }
  .new-pdf-tool__file strong {
    overflow: hidden;
    color: var(--color-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .new-pdf-tool__file span,
  .new-pdf-tool__file small,
  .new-pdf-tool__options small {
    color: var(--color-text-muted);
  }
  .new-pdf-tool__options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .new-pdf-tool__options > label,
  .new-pdf-tool__options fieldset {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    margin: 0;
  }
  .new-pdf-tool__options > label > span,
  .new-pdf-tool__options legend {
    color: var(--color-text);
    font-weight: 850;
  }
  .new-pdf-tool__options select {
    width: 100%;
    min-height: 3rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text);
  }
  .new-pdf-tool__options fieldset {
    grid-template-columns: 1fr 1fr;
    padding: 0;
    border: 0;
  }
  .new-pdf-tool__options legend {
    grid-column: 1/-1;
    margin-bottom: 0.5rem;
  }
  .new-pdf-tool__options fieldset label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text);
  }
  .new-pdf-tool__options input[type='range'] {
    width: 100%;
    accent-color: var(--color-primary);
  }
  .new-pdf-tool__note,
  .new-pdf-tool__actions {
    grid-column: 1/-1;
  }
  .new-pdf-tool__note {
    margin: 0;
    padding: 0.8rem;
    border-radius: var(--radius-lg);
    background: var(--color-surface-soft);
    color: var(--color-text-muted);
  }
  .new-pdf-tool__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .new-pdf-tool button {
    min-height: 3rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface-soft);
    color: var(--color-text);
    cursor: pointer;
    font: inherit;
    font-weight: 900;
  }
  .new-pdf-tool button.primary {
    border-color: transparent;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: #fff;
  }
  .new-pdf-tool button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  @media (max-width: 760px) {
    .new-pdf-tool__head,
    .new-pdf-tool__workspace {
      display: grid;
      grid-template-columns: 1fr;
    }
    .new-pdf-tool__head > strong {
      width: 4.5rem;
      height: 4.5rem;
    }
    .new-pdf-tool__options,
    .new-pdf-tool__actions {
      grid-template-columns: 1fr;
    }
    .new-pdf-tool__options fieldset {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
