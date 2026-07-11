<script lang="ts">
  import { onDestroy } from 'svelte';
  import { PDFDocument } from 'pdf-lib';
  import PdfDropzone from './PdfDropzone.svelte';
  import PdfResultModal from './PdfResultModal.svelte';
  import { flattenPdfInBrowser } from '../lib/pdf/flattenPdf';
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
      title: 'Aplanar formularios PDF',
      intro:
        'Convierte los campos editables compatibles en contenido fijo para compartir una copia no editable del formulario.',
      warning:
        'Aplana formularios AcroForm compatibles. No elimina contraseñas, firmas digitales ni todas las anotaciones del PDF.',
      drop: 'Arrastra un PDF con formulario',
      active: 'Suelta el PDF',
      subtitle: 'Suelta el archivo o pulsa para seleccionarlo',
      help: 'Solo PDF · procesamiento local',
      invalid: 'Selecciona un PDF válido y sin contraseña.',
      error: 'No se pudo aplanar el formulario PDF.',
      selected: 'PDF seleccionado',
      pages: 'páginas',
      fields: 'campos compatibles',
      change: 'Cambiar PDF',
      none: 'No se han detectado campos AcroForm compatibles para aplanar.',
      flatten: 'Aplanar formulario',
      flattening: 'Aplanando…',
      download: 'Descargar PDF aplanado',
      open: 'Abrir en pestaña',
      close: 'Cerrar',
      ready: 'Formulario aplanado. Revisa que los valores visibles sean correctos.',
      previewTitle: 'Vista previa del PDF aplanado',
      previewDesc: 'Comprueba los campos antes de descargar la copia final.',
      local: 'El archivo se modifica en este navegador y no se envía a FácilPDF.',
    },
    en: {
      title: 'Flatten PDF forms',
      intro:
        'Turn compatible editable fields into fixed page content so you can share a non-editable form copy.',
      warning:
        'Flattens compatible AcroForm fields. It does not remove passwords, digital signatures or every PDF annotation.',
      drop: 'Drag a PDF form here',
      active: 'Drop the PDF',
      subtitle: 'Drop the file or click to select it',
      help: 'PDF only · local processing',
      invalid: 'Select a valid PDF without a password.',
      error: 'The PDF form could not be flattened.',
      selected: 'Selected PDF',
      pages: 'pages',
      fields: 'compatible fields',
      change: 'Change PDF',
      none: 'No compatible AcroForm fields were found to flatten.',
      flatten: 'Flatten form',
      flattening: 'Flattening…',
      download: 'Download flattened PDF',
      open: 'Open in tab',
      close: 'Close',
      ready: 'Form flattened. Check that all visible values are correct.',
      previewTitle: 'Flattened PDF preview',
      previewDesc: 'Check the fields before downloading the final copy.',
      local: 'The file is modified in this browser and is not sent to FácilPDF.',
    },
  } as const;

  let file: File | null = null;
  let pageCount = 0;
  let fieldCount = 0;
  let hasXfa = false;
  let isProcessing = false;
  let errorMessage = '';
  let statusMessage = '';
  let previewUrl = '';
  let isPreviewOpen = false;
  $: t = copy[lang] ?? copy.es;
  $: canFlatten = Boolean(file && (fieldCount > 0 || hasXfa)) && !isProcessing;
  $: downloadName = `${getPdfBaseFilename(file, lang === 'en' ? 'flattened-pdf' : 'pdf-aplanado')}-aplanado.pdf`;

  onDestroy(clearResult);

  async function addFiles(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    clearResult();
    errorMessage = '';
    statusMessage = '';
    try {
      const pdf = await PDFDocument.load(await selected.arrayBuffer(), { ignoreEncryption: false });
      const form = pdf.getForm();
      file = selected;
      pageCount = pdf.getPageCount();
      fieldCount = form.getFields().length;
      hasXfa = form.hasXFA();
    } catch (error) {
      clearFile();
      errorMessage = getFriendlyPdfError(error, t.invalid, lang);
    }
  }

  async function flatten() {
    if (!file || !canFlatten) return;
    isProcessing = true;
    errorMessage = '';
    statusMessage = '';
    clearResult();
    try {
      await yieldToBrowser();
      const result = await flattenPdfInBrowser(file);
      previewUrl = createPdfObjectUrl(result.bytes);
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
    fieldCount = 0;
    hasXfa = false;
    statusMessage = '';
    clearResult();
  }
  function clearResult() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    isPreviewOpen = false;
  }
</script>

<section class="flatten-tool" aria-labelledby="flatten-tool-title">
  <header>
    <div>
      <span>FácilPDF</span>
      <h2 id="flatten-tool-title">{t.title}</h2>
      <p>{t.intro}</p>
    </div>
    <strong aria-hidden="true">📌</strong>
  </header>
  <p class="flatten-tool__warning" role="note">{t.warning}</p>
  <PdfDropzone
    title={t.drop}
    activeTitle={t.active}
    subtitle={t.subtitle}
    help={t.help}
    onFiles={addFiles}
    onInvalidFiles={() => (errorMessage = t.invalid)}
    onValidationErrors={(errors) => (errorMessage = errors.join(' '))}
  />
  {#if errorMessage}<p class="flatten-tool__message error" role="alert">{errorMessage}</p>{/if}
  {#if statusMessage}<p class="flatten-tool__message success" role="status">{statusMessage}</p>{/if}
  {#if file}
    <div class="flatten-tool__workspace">
      <aside>
        <span>{t.selected}</span><strong>{file.name}</strong><small
          >{formatFileSize(file.size)} · {pageCount} {t.pages}</small
        ><button type="button" on:click={clearFile}>{t.change}</button>
      </aside>
      <section aria-labelledby="flatten-summary-title">
        <h3 id="flatten-summary-title">{fieldCount} {t.fields}</h3>
        {#if !canFlatten}<p class="flatten-tool__empty" role="status">{t.none}</p>{/if}
        <p>🔒 {t.local}</p>
        <div>
          <button class="primary" type="button" disabled={!canFlatten} on:click={flatten}
            >{isProcessing ? t.flattening : t.flatten}</button
          ><button type="button" disabled={!previewUrl} on:click={() => (isPreviewOpen = true)}
            >{t.download}</button
          >
        </div>
      </section>
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
  .flatten-tool {
    display: grid;
    gap: var(--space-5);
    padding: clamp(1rem, 3vw, 1.8rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2xl);
    background: linear-gradient(135deg, var(--color-surface), var(--color-surface-soft));
    box-shadow: var(--shadow-md);
  }
  .flatten-tool > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .flatten-tool h2,
  .flatten-tool h3 {
    margin: 0;
    color: var(--color-text);
  }
  .flatten-tool h2 {
    font-size: clamp(1.55rem, 3vw, 2.25rem);
    letter-spacing: -0.04em;
  }
  .flatten-tool header p {
    max-width: 48rem;
    margin: 0.45rem 0 0;
    color: var(--color-text-muted);
  }
  .flatten-tool header span {
    display: inline-flex;
    margin-bottom: 0.45rem;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    background: var(--color-secondary-soft);
    color: var(--color-secondary);
    font-size: 0.78rem;
    font-weight: 900;
  }
  .flatten-tool header > strong {
    display: grid;
    width: 5rem;
    height: 5rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 1.35rem;
    background: var(--color-surface);
    font-size: 2.3rem;
    box-shadow: var(--shadow-md);
    transform: rotate(-4deg);
  }
  .flatten-tool__warning,
  .flatten-tool__message,
  .flatten-tool__empty {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-lg);
    font-weight: 800;
  }
  .flatten-tool__warning {
    background: var(--color-warning-soft);
    color: var(--color-warning);
  }
  .flatten-tool__message.error {
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  .flatten-tool__message.success {
    background: var(--color-success-soft);
    color: var(--color-success);
  }
  .flatten-tool__empty {
    background: var(--color-surface-soft);
    color: var(--color-text-muted);
  }
  .flatten-tool__workspace {
    display: grid;
    grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  .flatten-tool__workspace > aside,
  .flatten-tool__workspace > section {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }
  .flatten-tool__workspace aside strong {
    overflow: hidden;
    color: var(--color-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .flatten-tool__workspace span,
  .flatten-tool__workspace small,
  .flatten-tool__workspace section > p {
    color: var(--color-text-muted);
  }
  .flatten-tool__workspace section > p {
    margin: 0;
  }
  .flatten-tool__workspace section > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .flatten-tool button {
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
  .flatten-tool button.primary {
    border-color: transparent;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: #fff;
  }
  .flatten-tool button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  @media (max-width: 760px) {
    .flatten-tool > header,
    .flatten-tool__workspace {
      display: grid;
      grid-template-columns: 1fr;
    }
    .flatten-tool header > strong {
      width: 4.5rem;
      height: 4.5rem;
    }
    .flatten-tool__workspace section > div {
      grid-template-columns: 1fr;
    }
  }
</style>
