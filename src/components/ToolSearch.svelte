<script lang="ts">
  import { onMount } from 'svelte';

  type Lang = 'es' | 'en';

  export interface ToolSearchCategory {
    id: string;
    title: Record<Lang, string>;
  }

  export let lang: Lang = 'es';
  export let categories: ToolSearchCategory[] = [];
  export let allLabel = lang === 'es' ? 'Todos' : 'All';
  export let searchLabel = lang === 'es' ? 'Buscar herramientas' : 'Search tools';
  export let searchPlaceholder = lang === 'es' ? 'Buscar por nombre, descripción o palabra clave…' : 'Search by name, description or keyword…';
  export let emptyText = lang === 'es' ? 'No hay herramientas que coincidan con tu búsqueda.' : 'No tools match your search.';
  export let toolsLabel = lang === 'es' ? 'herramientas' : 'tools';

  let query = '';
  let selectedCategory = 'all';
  let visibleTools = 0;
  let mounted = false;

  $: normalizedQuery = normalize(query);
  $: if (mounted) filterTools();

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    query = params.get('q') ?? '';
    const requestedCategory = params.get('categoria') ?? 'all';
    selectedCategory = categories.some((category) => category.id === requestedCategory)
      ? requestedCategory
      : 'all';
    mounted = true;
    prepareSearchText();
    filterTools();
  });

  function prepareSearchText() {
    document.querySelectorAll<HTMLElement>('[data-tool-card]').forEach((card) => {
      const text = [
        card.textContent || '',
        card.getAttribute('data-tool-category') || '',
        card.getAttribute('data-tool-status') || '',
        card.getAttribute('aria-label') || '',
      ].join(' ');
      card.dataset.toolSearchText = normalize(text);
    });
  }

  function filterTools() {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-tool-card]'));
    const countOutput = document.querySelector<HTMLElement>('[data-tools-count]');
    let nextVisibleTools = 0;

    for (const card of cards) {
      const categoryMatches = selectedCategory === 'all' || card.dataset.toolCategory === selectedCategory;
      const textMatches = !normalizedQuery || (card.dataset.toolSearchText || '').includes(normalizedQuery);
      const shouldShow = categoryMatches && textMatches;

      card.toggleAttribute('hidden', !shouldShow);
      if (shouldShow) nextVisibleTools += 1;
    }

    visibleTools = nextVisibleTools;

    if (countOutput) {
      countOutput.textContent = `${visibleTools} ${toolsLabel}`;
    }

    const url = new URL(window.location.href);
    normalizedQuery ? url.searchParams.set('q', query.trim()) : url.searchParams.delete('q');
    selectedCategory !== 'all'
      ? url.searchParams.set('categoria', selectedCategory)
      : url.searchParams.delete('categoria');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function clearSearch() {
    query = '';
    selectedCategory = 'all';
  }

  function normalize(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
</script>

<div class="tool-search" aria-label={searchLabel}>
  <div class="tool-search__row">
    <label class="tool-search__field">
      <span>{searchLabel}</span>
      <input bind:value={query} type="search" placeholder={searchPlaceholder} autocomplete="off" aria-controls="tools-catalog-results" />
    </label>
    {#if query || selectedCategory !== 'all'}
      <button class="tool-search__clear" type="button" on:click={clearSearch}>
        {lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}
      </button>
    {/if}
  </div>

  <div class="tool-search__filters" role="group" aria-label={lang === 'es' ? 'Filtrar herramientas por categoría' : 'Filter tools by category'}>
    <button class:is-active={selectedCategory === 'all'} type="button" aria-pressed={selectedCategory === 'all'} on:click={() => (selectedCategory = 'all')}>
      {allLabel}
    </button>
    {#each categories as category (category.id)}
      <button class:is-active={selectedCategory === category.id} type="button" aria-pressed={selectedCategory === category.id} on:click={() => (selectedCategory = category.id)}>
        {category.title[lang]}
      </button>
    {/each}
  </div>

  {#if mounted && visibleTools === 0}
    <p class="tool-search__empty" role="status">{emptyText}</p>
  {/if}
</div>

<style>
  .tool-search{display:grid;gap:1rem;margin:1.4rem 0}.tool-search__row{display:flex;gap:.75rem;align-items:end}.tool-search__field{display:grid;flex:1;gap:.45rem}.tool-search__field span{color:var(--color-text,#0f172a);font-weight:950}.tool-search__field input{width:100%;min-height:3.2rem;box-sizing:border-box;padding:.9rem 1rem;border:1px solid var(--color-border,#e2e8f0);border-radius:1rem;background:var(--color-surface,#fff);color:var(--color-text,#0f172a);font:inherit;font-weight:750;box-shadow:0 10px 28px rgb(15 23 42 / .06)}.tool-search__field input:focus-visible{outline:3px solid color-mix(in srgb,var(--color-primary,#2563eb) 30%,transparent);border-color:var(--color-primary,#2563eb)}.tool-search__clear{min-height:3.2rem;padding:.75rem 1rem;border:1px solid var(--color-border);border-radius:1rem;background:var(--color-surface-soft);color:var(--color-text);cursor:pointer;font:inherit;font-weight:900}.tool-search__filters{display:flex;flex-wrap:wrap;gap:.55rem}.tool-search__filters button{min-height:2.55rem;padding:.58rem .9rem;border:1px solid var(--color-border,#e2e8f0);border-radius:999px;background:var(--color-surface,#fff);color:var(--color-text,#0f172a);cursor:pointer;font:inherit;font-weight:900;transition:transform 120ms ease,background 180ms ease,border-color 180ms ease}.tool-search__filters button:hover,.tool-search__filters button:focus-visible,.tool-search__clear:hover,.tool-search__clear:focus-visible{transform:translateY(-1px);border-color:var(--color-primary,#2563eb)}.tool-search__filters button.is-active{background:linear-gradient(135deg,var(--color-primary,#2563eb),var(--color-secondary,#7c3aed));border-color:transparent;color:#fff}.tool-search__empty{margin:0;padding:1rem;border:1px dashed var(--color-border,#e2e8f0);border-radius:1rem;background:var(--color-surface-soft,#f8fafc);color:var(--color-text-muted,#64748b);font-weight:850}@media(max-width:640px){.tool-search__row{display:grid}.tool-search__filters{display:grid;grid-template-columns:1fr 1fr}.tool-search__filters button{width:100%}}
</style>
