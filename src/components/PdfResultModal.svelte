<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';

  export let open = false;
  export let title = 'Vista previa del PDF';
  export let description = 'Comprueba el resultado y descárgalo cuando esté listo.';
  export let pdfUrl = '';
  export let filename = 'pdfworld.pdf';
  export let closeLabel = 'Cerrar';
  export let downloadLabel = 'Descargar PDF';
  export let openLabel = 'Abrir en pestaña';

  const dispatch = createEventDispatcher<{ close: void }>();
  let dialogElement: HTMLElement;
  let closeButton: HTMLButtonElement;
  let previouslyFocused: HTMLElement | null = null;
  let previousBodyOverflow = '';
  let wasOpen = false;

  $: if (open && pdfUrl && !wasOpen) {
    wasOpen = true;
    void activateModal();
  } else if ((!open || !pdfUrl) && wasOpen) {
    wasOpen = false;
    deactivateModal();
  }

  onDestroy(deactivateModal);

  function closeModal() {
    dispatch('close');
  }

  async function activateModal() {
    if (typeof document === 'undefined') return;
    previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await tick();
    closeButton?.focus();
  }

  function deactivateModal() {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = previousBodyOverflow;
    if (previouslyFocused?.isConnected) previouslyFocused.focus();
    previouslyFocused = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab' || !dialogElement) return;

    const focusable = Array.from(
      dialogElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open && pdfUrl}
  <div class="pdf-result-modal" role="presentation">
    <button
      class="pdf-result-modal__backdrop"
      type="button"
      aria-label={closeLabel}
      on:click={closeModal}
    ></button>
    <div
      bind:this={dialogElement}
      class="pdf-result-modal__dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-result-title"
      aria-describedby="pdf-result-description"
    >
      <header class="pdf-result-modal__header">
        <div>
          <span>FácilPDF</span>
          <h3 id="pdf-result-title">{title}</h3>
          <p id="pdf-result-description">{description}</p>
        </div>

        <button
          bind:this={closeButton}
          type="button"
          class="pdf-result-modal__close"
          on:click={closeModal}
          aria-label={closeLabel}
        >
          ×
        </button>
      </header>

      <div class="pdf-result-modal__viewer">
        <iframe {title} src={pdfUrl}></iframe>
      </div>

      <footer class="pdf-result-modal__actions">
        <a
          class="pdf-result-modal__button pdf-result-modal__button--ghost"
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {openLabel}
        </a>
        <a
          class="pdf-result-modal__button pdf-result-modal__button--primary"
          href={pdfUrl}
          download={filename}
        >
          {downloadLabel}
        </a>
      </footer>
    </div>
  </div>
{/if}

<style>
  .pdf-result-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: clamp(12px, 3vw, 28px);
    background:
      radial-gradient(circle at 20% 0%, rgba(240, 82, 61, 0.24), transparent 34rem),
      rgba(15, 23, 42, 0.66);
    backdrop-filter: blur(14px);
    animation: pdf-result-fade 180ms ease both;
  }

  .pdf-result-modal__dialog {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-rows: auto minmax(320px, 1fr) auto;
    width: min(1120px, 100%);
    max-height: min(92vh, 900px);
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 28px;
    background: color-mix(in srgb, var(--color-surface) 96%, transparent);
    box-shadow: 0 34px 110px rgba(15, 23, 42, 0.34);
    animation: pdf-result-rise 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .pdf-result-modal__backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: default;
  }

  .pdf-result-modal__header,
  .pdf-result-modal__actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 18px;
  }

  .pdf-result-modal__header span {
    display: inline-flex;
    margin-bottom: 7px;
    padding: 5px 9px;
    border-radius: 999px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: 0.76rem;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pdf-result-modal__header h3 {
    margin: 0 0 6px;
    color: var(--color-text);
    font-size: clamp(1.35rem, 2.4vw, 2rem);
    letter-spacing: -0.04em;
  }

  .pdf-result-modal__header p {
    margin: 0;
    color: var(--color-text-muted);
  }

  .pdf-result-modal__close,
  .pdf-result-modal__button {
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
    font-weight: 950;
    text-decoration: none;
    transition:
      transform 150ms ease,
      box-shadow 150ms ease,
      background 150ms ease;
  }

  .pdf-result-modal__close {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    background: var(--color-surface-soft);
    color: var(--color-text);
    font-size: 1.7rem;
    line-height: 1;
  }

  .pdf-result-modal__viewer {
    min-height: 0;
    padding: 0 18px;
  }

  .pdf-result-modal__viewer iframe {
    width: 100%;
    height: 100%;
    min-height: min(64vh, 680px);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    background: var(--color-surface-soft);
  }

  .pdf-result-modal__actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .pdf-result-modal__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    padding: 12px 16px;
  }

  .pdf-result-modal__button--ghost {
    background: var(--color-surface-soft);
    color: var(--color-text);
  }

  .pdf-result-modal__button--primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: #fff;
    box-shadow: 0 16px 34px rgba(239, 68, 68, 0.28);
  }

  .pdf-result-modal__close:hover,
  .pdf-result-modal__button:hover {
    transform: translateY(-1px);
  }

  .pdf-result-modal__close:focus-visible,
  .pdf-result-modal__button:focus-visible {
    outline: 3px solid var(--color-primary-soft);
    outline-offset: 3px;
  }

  @keyframes pdf-result-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes pdf-result-rise {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pdf-result-modal,
    .pdf-result-modal__dialog {
      animation: none;
    }

    .pdf-result-modal__close,
    .pdf-result-modal__button {
      transition: none;
    }
  }

  @media (max-width: 720px) {
    .pdf-result-modal__dialog {
      border-radius: 22px;
      max-height: 96dvh;
    }

    .pdf-result-modal__header,
    .pdf-result-modal__actions {
      padding: 14px;
    }

    .pdf-result-modal__viewer {
      padding: 0 14px;
    }

    .pdf-result-modal__viewer iframe {
      min-height: 58vh;
    }

    .pdf-result-modal__button {
      flex: 1 1 180px;
    }
  }
</style>
