<script lang="ts">
  type Action = {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };

  type Props = {
    title?: string;
    description?: string;
    fileName?: string;
    fileSize?: string;
    downloadUrl?: string;
    downloadName?: string;
    downloadLabel?: string;
    privacyText?: string;
    eyebrow?: string;
    actions?: Action[];
  };

  let {
    title = 'Tu PDF está listo',
    description = 'El proceso ha terminado correctamente. Ya puedes descargar el archivo generado.',
    fileName = 'documento.pdf',
    fileSize = '',
    downloadUrl = '',
    downloadName = fileName,
    downloadLabel = 'Descargar PDF',
    privacyText = 'El archivo generado se mantiene en tu navegador. No se ha enviado a servidores externos.',
    eyebrow = 'Proceso completado',
    actions = [],
  }: Props = $props();
</script>

<section class="result-state" aria-live="polite">
  <div class="result-state__icon" aria-hidden="true">✓</div>

  <div class="result-state__content">
    <p class="result-state__eyebrow">{eyebrow}</p>
    <h2>{title}</h2>
    <p>{description}</p>

    <div class="result-state__file">
      <span aria-hidden="true">📄</span>
      <div>
        <strong>{fileName}</strong>
        {#if fileSize}
          <small>{fileSize}</small>
        {/if}
      </div>
    </div>

    {#if downloadUrl}
      <a class="result-state__download" href={downloadUrl} download={downloadName}
        >{downloadLabel}</a
      >
    {:else}
      <button class="result-state__download" type="button" disabled>{downloadLabel}</button>
    {/if}

    {#if actions.length > 0}
      <div class="result-state__actions">
        {#each actions as action}
          {#if action.href}
            <a
              class={`result-state__action result-state__action--${action.variant ?? 'secondary'}`}
              href={action.href}>{action.label}</a
            >
          {:else}
            <button
              class={`result-state__action result-state__action--${action.variant ?? 'secondary'}`}
              type="button"
              onclick={action.onClick}>{action.label}</button
            >
          {/if}
        {/each}
      </div>
    {/if}

    <p class="result-state__privacy">{privacyText}</p>
  </div>
</section>

<style>
  .result-state {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: clamp(1rem, 3vw, 1.5rem);
    width: min(48rem, 100%);
    margin-inline: auto;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid
      color-mix(in srgb, var(--color-success, #16a34a) 28%, var(--color-border, #e2e8f0));
    border-radius: var(--radius-2xl, 1.5rem);
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--color-success, #16a34a) 12%, transparent),
        transparent 18rem
      ),
      var(--color-surface-raised, #fff);
    box-shadow: var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.08));
  }

  .result-state__icon {
    display: grid;
    width: 3.75rem;
    height: 3.75rem;
    place-items: center;
    border-radius: var(--radius-xl, 1.25rem);
    background: var(--color-success-soft, #dcfce7);
    color: var(--color-success, #16a34a);
    font-size: 1.7rem;
    font-weight: 950;
  }

  .result-state__content {
    display: grid;
    gap: 0.85rem;
    min-width: 0;
  }

  .result-state__eyebrow,
  .result-state h2,
  .result-state p {
    margin: 0;
  }

  .result-state__eyebrow {
    color: var(--color-success, #16a34a);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .result-state h2 {
    color: var(--color-text, #0f172a);
    font-size: clamp(1.45rem, 3vw, 2.1rem);
    line-height: 1.05;
  }

  .result-state p {
    color: var(--color-text-muted, #475569);
  }

  .result-state__file {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-width: 0;
    padding: 0.85rem;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: var(--radius-xl, 1.25rem);
    background: var(--color-surface, #fff);
  }

  .result-state__file > span {
    display: grid;
    width: 2.6rem;
    height: 2.6rem;
    flex: 0 0 auto;
    place-items: center;
    border-radius: var(--radius-lg, 1rem);
    background: var(--color-primary-soft, #dbeafe);
  }

  .result-state__file div {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .result-state__file strong,
  .result-state__file small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-state__file strong {
    color: var(--color-text, #0f172a);
  }

  .result-state__file small {
    color: var(--color-text-soft, #64748b);
  }

  .result-state__download,
  .result-state__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-height: 2.9rem;
    padding: 0.78rem 1.15rem;
    border: 1px solid transparent;
    border-radius: var(--radius-full, 999px);
    cursor: pointer;
    font-weight: 900;
    line-height: 1;
    text-decoration: none;
    transition:
      transform var(--transition-fast, 120ms ease),
      background var(--transition-base, 180ms ease),
      border-color var(--transition-base, 180ms ease),
      box-shadow var(--transition-base, 180ms ease);
  }

  .result-state__download {
    background: var(--color-primary-filled, var(--color-primary, #2563eb));
    color: var(--color-on-filled, #fff);
    box-shadow: var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.08));
  }

  .result-state__download:hover {
    color: var(--color-on-filled, #fff);
    transform: translateY(-1px);
    background: var(--color-primary-filled-hover, var(--color-primary-hover, #1d4ed8));
  }

  .result-state__download:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .result-state__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .result-state__action--secondary {
    border-color: var(--color-border, #e2e8f0);
    background: var(--color-surface, #fff);
    color: var(--color-text, #0f172a);
  }

  .result-state__action--ghost {
    background: transparent;
    color: var(--color-text-muted, #475569);
  }

  .result-state__action--primary {
    background: var(--color-primary-filled, var(--color-primary, #2563eb));
    color: var(--color-on-filled, #fff);
  }

  .result-state__action:hover {
    transform: translateY(-1px);
  }

  .result-state__privacy {
    padding: 0.75rem 0.9rem;
    border: 1px solid
      color-mix(in srgb, var(--color-success, #16a34a) 24%, var(--color-border, #e2e8f0));
    border-radius: var(--radius-lg, 1rem);
    background: var(--color-success-soft, #dcfce7);
    font-size: 0.92rem;
  }

  @media (max-width: 560px) {
    .result-state {
      grid-template-columns: 1fr;
    }

    .result-state__download,
    .result-state__action {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .result-state__download,
    .result-state__action {
      transition: none;
    }
  }
</style>
