<script lang="ts">
  import { onMount } from 'svelte';
  import { consumePendingPdfTransfer } from '../lib/pdfTransfer';
  import { validatePdfFiles, type PdfToolLang } from '../lib/pdfToolUtils';

  export let title = 'Arrastra tus PDF aquí';
  export let activeTitle = 'Suelta para añadirlos';
  export let subtitle = 'Suelta los archivos o pulsa para seleccionarlos';
  export let help = 'Solo PDF. Privado, local y sin subir nada a servidores.';
  export let multiple = false;
  export let accept = 'application/pdf,.pdf';
  export let acceptedTypes = ['application/pdf'];
  export let acceptedExtensions = ['.pdf'];
  export let selectedLabel = '';
  export let acceptTransfers = true;
  export let showPrivacyLink = true;
  export let maxFileSize: number | undefined = undefined;
  export let maxTotalSize: number | undefined = undefined;
  export let maxFiles: number | undefined = undefined;
  export let onFiles: (files: File[]) => void | Promise<void> = () => {};
  export let onInvalidFiles: (files: File[]) => void | Promise<void> = () => {};
  export let onValidationErrors: (errors: string[]) => void | Promise<void> = () => {};

  let inputElement: HTMLInputElement;
  let isDragging = false;
  let dragDepth = 0;
  let privacyHref = '/es/privacidad';
  let privacyText = 'Tus archivos se procesan en este navegador. Ver privacidad';
  let currentLang: PdfToolLang = 'es';
  const inputId = `pdf-dropzone-input-${Math.random().toString(36).slice(2)}`;
  const helpId = `pdf-dropzone-help-${Math.random().toString(36).slice(2)}`;
  const statusId = `pdf-dropzone-status-${Math.random().toString(36).slice(2)}`;

  $: currentTitle = isDragging ? activeTitle : title;
  $: statusText = selectedLabel || subtitle;

  onMount(() => {
    currentLang = document.documentElement.lang === 'en' ? 'en' : 'es';
    privacyHref = `/${currentLang}/privacidad`;
    privacyText =
      currentLang === 'en'
        ? 'Files are processed in this browser. View privacy'
        : 'Tus archivos se procesan en este navegador. Ver privacidad';

    if (!acceptTransfers) return;

    void (async () => {
      try {
        const transfer = await consumePendingPdfTransfer();
        if (transfer?.file) {
          selectedLabel =
            currentLang === 'en'
              ? `Imported from ${transfer.source}: ${transfer.file.name}`
              : `Importado desde ${transfer.source}: ${transfer.file.name}`;
          await processFiles([transfer.file]);
        }
      } catch {
        // Ignore transfer errors so the normal uploader keeps working.
      }
    })();
  });

  function openFileDialog() {
    inputElement?.click();
  }

  async function handleInputChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    await processFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    dragDepth += 1;
    isDragging = true;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    isDragging = dragDepth > 0;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragDepth = 0;
    isDragging = false;
    await processFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  async function processFiles(files: File[]) {
    if (files.length === 0) return;

    const invalidFiles = files.filter((file) => !isPdf(file));
    if (invalidFiles.length > 0) {
      await onInvalidFiles(invalidFiles);
    }

    const validation = validatePdfFiles(
      multiple ? files : files.slice(0, 1),
      { maxFileSize, maxTotalSize, maxFiles },
      currentLang,
    );

    if (validation.errors.length > 0) {
      await onValidationErrors(validation.errors);
    }

    if (validation.validFiles.length === 0) return;
    await onFiles(multiple ? validation.validFiles : [validation.validFiles[0]]);
  }

  function isPdf(file: File) {
    const lowerName = file.name.toLowerCase();
    return (
      acceptedTypes.includes(file.type) ||
      acceptedExtensions.some((extension) => lowerName.endsWith(extension))
    );
  }
</script>

<div class="pdf-dropzone-shell">
  <button
    type="button"
    class:pdf-dropzone={true}
    class:pdf-dropzone--active={isDragging}
    aria-controls={inputId}
    aria-describedby={`${helpId} ${statusId}`}
    aria-label={`${currentTitle}. ${statusText}`}
    on:click={openFileDialog}
    on:drop={handleDrop}
    on:dragenter={handleDragEnter}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
  >
    <span class="pdf-dropzone__glow" aria-hidden="true"></span>
    <span class="pdf-dropzone__grid" aria-hidden="true"></span>
    <span class="pdf-dropzone__icon-stack" aria-hidden="true">
      <span class="pdf-dropzone__icon-card pdf-dropzone__icon-card--back">PDF</span>
      <span class="pdf-dropzone__icon-card pdf-dropzone__icon-card--front">+</span>
    </span>
    <span class="pdf-dropzone__copy">
      <strong>{currentTitle}</strong>
      <span id={statusId} aria-live="polite">{statusText}</span>
      <small id={helpId}>{help}</small>
    </span>
  </button>

  {#if showPrivacyLink}
    <p class="pdf-dropzone__privacy">🔒 <a href={privacyHref}>{privacyText}</a></p>
  {/if}
</div>

<input
  id={inputId}
  bind:this={inputElement}
  class="pdf-dropzone__input"
  type="file"
  {accept}
  {multiple}
  tabindex="-1"
  aria-hidden="true"
  aria-describedby={helpId}
  aria-label={title}
  on:change={handleInputChange}
/>

<style>
  .pdf-dropzone-shell {
    display: grid;
    gap: 10px;
    width: 100%;
  }

  .pdf-dropzone {
    position: relative;
    isolation: isolate;
    display: grid;
    min-height: 250px;
    place-items: center;
    gap: 16px;
    width: 100%;
    padding: clamp(28px, 6vw, 48px);
    overflow: hidden;
    border: 2px dashed rgba(148, 163, 184, 0.95);
    border-radius: 28px;
    background:
      linear-gradient(135deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.82)),
      radial-gradient(circle at center, rgba(239, 68, 68, 0.09), transparent 45%);
    color: #0f172a;
    cursor: pointer;
    text-align: center;
    font: inherit;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease;
  }

  .pdf-dropzone:hover,
  .pdf-dropzone:focus-visible {
    border-color: #ef4444;
    box-shadow: 0 24px 70px rgba(239, 68, 68, 0.16);
    outline: none;
    transform: translateY(-2px);
  }

  .pdf-dropzone--active {
    border-color: #ef4444;
    background:
      linear-gradient(135deg, rgba(255, 241, 242, 0.98), rgba(255, 255, 255, 0.92)),
      radial-gradient(circle at center, rgba(239, 68, 68, 0.2), transparent 50%);
    box-shadow: 0 28px 80px rgba(239, 68, 68, 0.22);
    transform: scale(1.01);
  }

  .pdf-dropzone__glow {
    position: absolute;
    inset: auto auto -90px 50%;
    z-index: -1;
    width: 280px;
    height: 180px;
    border-radius: 999px;
    background: rgba(239, 68, 68, 0.25);
    filter: blur(48px);
    transform: translateX(-50%);
  }

  .pdf-dropzone__grid {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.5;
    background-image:
      linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: radial-gradient(circle at center, black, transparent 72%);
  }

  .pdf-dropzone__icon-stack {
    position: relative;
    width: 96px;
    height: 82px;
  }

  .pdf-dropzone__icon-card {
    position: absolute;
    display: grid;
    width: 62px;
    height: 74px;
    place-items: center;
    border-radius: 16px;
    background: #fff;
    color: #ef4444;
    font-size: 0.9rem;
    font-weight: 950;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15);
  }

  .pdf-dropzone__icon-card--back {
    left: 10px;
    top: 4px;
    color: #64748b;
    transform: rotate(-10deg);
  }

  .pdf-dropzone__icon-card--front {
    right: 8px;
    bottom: 0;
    border: 1px solid rgba(239, 68, 68, 0.18);
    font-size: 2rem;
    transform: rotate(8deg);
    animation: pdf-dropzone-float 3.4s ease-in-out infinite;
  }

  .pdf-dropzone--active .pdf-dropzone__icon-card--front {
    animation: pdf-dropzone-pop 650ms ease both;
  }

  .pdf-dropzone__copy {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .pdf-dropzone__copy strong {
    font-size: clamp(1.2rem, 2.4vw, 1.55rem);
    letter-spacing: -0.03em;
  }

  .pdf-dropzone__copy span {
    overflow: hidden;
    max-width: min(70vw, 480px);
    color: #334155;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pdf-dropzone__copy small {
    color: #64748b;
  }

  .pdf-dropzone__privacy {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 800;
    text-align: center;
  }

  .pdf-dropzone__privacy a {
    color: #b91c1c;
    text-decoration: none;
  }

  .pdf-dropzone__privacy a:hover,
  .pdf-dropzone__privacy a:focus-visible {
    text-decoration: underline;
  }

  .pdf-dropzone__input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  :global([data-theme='dark']) .pdf-dropzone {
    border-color: var(--color-border-strong);
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-surface) 94%, transparent),
        color-mix(in srgb, var(--color-surface-soft) 88%, transparent)
      ),
      radial-gradient(circle at center, var(--color-primary-soft), transparent 48%);
    color: var(--color-text);
  }

  :global([data-theme='dark']) .pdf-dropzone:hover,
  :global([data-theme='dark']) .pdf-dropzone:focus-visible,
  :global([data-theme='dark']) .pdf-dropzone--active {
    border-color: var(--color-primary);
  }

  :global([data-theme='dark']) .pdf-dropzone__icon-card {
    background: var(--color-surface-raised);
    color: var(--color-primary);
  }

  :global([data-theme='dark']) .pdf-dropzone__copy span,
  :global([data-theme='dark']) .pdf-dropzone__copy small,
  :global([data-theme='dark']) .pdf-dropzone__privacy {
    color: var(--color-text-muted);
  }

  :global([data-theme='dark']) .pdf-dropzone__privacy a {
    color: var(--color-primary);
  }

  @keyframes pdf-dropzone-float {
    0%,
    100% {
      transform: translateY(0) rotate(8deg);
    }
    50% {
      transform: translateY(-6px) rotate(5deg);
    }
  }

  @keyframes pdf-dropzone-pop {
    0% {
      transform: scale(0.9) rotate(8deg);
    }
    55% {
      transform: scale(1.08) rotate(2deg);
    }
    100% {
      transform: scale(1) rotate(8deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pdf-dropzone,
    .pdf-dropzone__icon-card--front,
    .pdf-dropzone--active .pdf-dropzone__icon-card--front {
      animation: none;
      transition: none;
    }
  }

  @media (max-width: 720px) {
    .pdf-dropzone {
      min-height: 220px;
      border-radius: 22px;
    }
  }
</style>
