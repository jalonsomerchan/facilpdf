<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
  import PdfDropzone from './PdfDropzone.svelte';
  import PdfResultModal from './PdfResultModal.svelte';
  import ProcessingState from './ProcessingState.svelte';
  import ResultState from './ResultState.svelte';
  import { createPdfObjectUrl, formatFileSize, yieldToBrowser } from '../lib/pdfToolUtils';

  type Lang = 'es' | 'en';
  type ThumbStatus = 'pending' | 'ready' | 'failed';
  type OutputMode = 'all' | 'selected';
  type TextMode = 'none' | 'all' | 'selected';
  type TextPosition = 'diagonal' | 'top-center' | 'bottom-center' | 'bottom-right';
  type NumberPosition = 'bottom-center' | 'bottom-right' | 'top-right';
  type SelectionRangeMode = 'replace' | 'add' | 'remove';

  interface TextSettings {
    mode: TextMode;
    value: string;
    size: number;
    opacity: number;
    position: TextPosition;
  }

  interface NumberSettings {
    enabled: boolean;
    format: string;
    position: NumberPosition;
    size: number;
  }

  interface SourcePdf {
    id: string;
    file: File;
    pageCount: number;
    pageLabels?: string[];
    error?: string;
  }

  interface PageItem {
    id: string;
    sourceId: string;
    fileName: string;
    pageIndex: number;
    pageNumber: number;
    pageLabel: string;
    rotation: number;
    kept: boolean;
    selected: boolean;
    thumbUrl?: string;
    thumbStatus: ThumbStatus;
  }

  interface HistoryEntry {
    pages: PageItem[];
    action: string;
  }

  interface ThumbnailJob {
    source: SourcePdf;
    sourcePages: PageItem[];
    token: number;
  }

  type PreviewPatch = Pick<Partial<PageItem>, 'pageLabel' | 'thumbUrl' | 'thumbStatus'>;

  interface PendingPreviewUpdate {
    sourceId: string;
    pageIndex: number;
    patch: PreviewPatch;
  }

  interface SourceSelectionStats {
    selected: number;
    total: number;
    allSelected: boolean;
  }

  export let lang: Lang = 'es';

  const MAX_CONCURRENT_THUMBNAIL_JOBS = 2;
  const MAX_THUMBNAIL_WIDTH = 280;
  const MAX_THUMBNAIL_HEIGHT = 340;
  const MAX_THUMBNAIL_PIXELS = 180_000;

  const copy = {
    es: {
      title: 'Multiherramienta PDF',
      intro:
        'Organiza, selecciona y edita páginas con acciones rápidas antes de crear tu nuevo PDF.',
      eyebrow: 'Privado y local',
      dropTitle: 'Arrastra tus PDF aquí',
      addMoreTitle: 'Añadir más archivos PDF',
      dropActive: 'Suelta para añadir al editor',
      dropText: 'Suelta archivos o pulsa para seleccionarlos',
      fileHelp: 'PDF · privado · procesamiento local',
      noFiles: 'Carga uno o varios PDF para empezar.',
      invalidFiles: 'Algunos archivos no son PDF y se han ignorado.',
      readError: 'No se pudo leer este PDF. Puede estar dañado o protegido.',
      rendering: 'Generando miniaturas…',
      page: 'Página',
      selected: 'seleccionadas',
      finalPages: 'páginas',
      files: 'archivos',
      options: 'Opciones de la multiherramienta',
      output: 'PDF de salida',
      outputAll: 'Todas las páginas visibles',
      outputSelected: 'Solo páginas marcadas',
      outputHelpAll: 'Se exportarán todas las páginas que no hayas eliminado.',
      outputHelpSelected: 'Se exportarán únicamente las páginas con la marca azul.',
      outputFileName: 'Nombre del archivo',
      outputFileHelp: 'Se añadirá la extensión .pdf automáticamente.',
      addText: 'Añadir texto',
      textLabel: 'Texto visible',
      textPlaceholder: 'Texto, sello o marca de agua…',
      textPosition: 'Posición',
      textPositions: {
        diagonal: 'Centro diagonal',
        'top-center': 'Arriba, centrado',
        'bottom-center': 'Abajo, centrado',
        'bottom-right': 'Abajo, derecha',
      },
      pageNumbers: 'Numerar páginas',
      numberFormat: 'Formato',
      numberFormatHelp: 'Usa {n} para el número actual y {total} para el total.',
      numberPosition: 'Posición',
      numberPositions: {
        'bottom-center': 'Abajo, centrado',
        'bottom-right': 'Abajo, derecha',
        'top-right': 'Arriba, derecha',
      },
      selection: 'Selección y acciones',
      selectionHelp: 'Las páginas marcadas se usan al elegir “Solo páginas marcadas”.',
      selectOdd: 'Impares',
      selectEven: 'Pares',
      invertSelection: 'Invertir',
      rangeLabel: 'Seleccionar rango',
      rangePlaceholder: 'Ej.: 1-3, 6, 9-12',
      rangeHelp: 'Según el orden actual de las miniaturas.',
      rangeMode: 'Modo del rango',
      rangeModes: {
        replace: 'Reemplazar selección',
        add: 'Añadir a la selección',
        remove: 'Quitar de la selección',
      },
      applyRange: 'Aplicar',
      invalidRange: 'Escribe un rango válido, por ejemplo 1-3, 6, 9-12.',
      rotateSelectedLeft: 'Girar marcadas a la izquierda',
      rotateSelectedRight: 'Girar marcadas a la derecha',
      duplicateSelected: 'Duplicar marcadas',
      moveSelectedStart: 'Mover marcadas al inicio',
      moveSelectedEnd: 'Mover marcadas al final',
      deleteSelected: 'Eliminar marcadas',
      reversePages: 'Invertir orden',
      undo: 'Deshacer',
      undoDone: 'Se ha deshecho el último cambio.',
      nothingToUndo: 'No hay cambios que deshacer.',
      restoreDeleted: 'Restaurar eliminadas',
      restored: 'Se han restaurado las páginas eliminadas.',
      pagesRotated: 'Se han girado las páginas marcadas.',
      pagesDuplicated: 'Se han duplicado las páginas marcadas.',
      pagesMovedStart: 'Las páginas marcadas se han movido al inicio.',
      pagesMovedEnd: 'Las páginas marcadas se han movido al final.',
      pagesDeleted: 'Se han eliminado las páginas marcadas. Puedes deshacer el cambio.',
      pagesReversed: 'Se ha invertido el orden de las páginas.',
      pageMoved: 'Página movida.',
      generate: 'Ver y Descargar PDF',
      generating: 'Generando PDF…',
      download: 'Descargar PDF',
      clear: 'Limpiar todo',
      confirmClear: '¿Quieres quitar todos los archivos y cambios de la multiherramienta?',
      confirmRemovePdf: '¿Quieres quitar “{name}” y todas sus páginas?',
      readyTitle: 'PDF listo',
      ready: 'Tu PDF se ha generado correctamente.',
      needPages: 'Debe quedar al menos una página.',
      needSelected: 'Selecciona al menos una página.',
      selectedRequired: 'Marca alguna página para usar esta acción.',
      createError: 'No se pudo generar el PDF. Revisa que los archivos no estén protegidos.',
      previewTitle: 'Ver y Descargar PDF',
      closePreview: 'Cerrar vista previa',
      outputName: 'facilpdf-multiherramienta.pdf',
      rotateLeft: 'Girar izquierda',
      rotateRight: 'Girar derecha',
      deletePage: 'Eliminar página',
      toggleSelected: 'Seleccionar o deseleccionar página',
      dragPage: 'Arrastra para reordenar',
      moveBefore: 'Mover página antes',
      moveAfter: 'Mover página después',
      removePdf: 'Eliminar PDF',
      selectPdfPages: 'Seleccionar las páginas de este PDF',
      deselectPdfPages: 'Deseleccionar las páginas de este PDF',
      selectAll: 'Seleccionar todas',
      deselectAll: 'Deseleccionar todas',
      enlargeThumb: 'Ampliar miniatura',
      enlargedTitle: 'Miniatura ampliada',
      closeEnlarged: 'Cerrar miniatura ampliada',
      thumbNotReady: 'La miniatura aún no está lista.',
      previousPage: 'Página anterior',
      nextPage: 'Página siguiente',
      zoomOut: 'Alejar',
      zoomIn: 'Acercar',
      resetZoom: 'Restablecer zoom',
      fileError: 'No se pudo abrir este archivo.',
      pageSingular: 'página',
      fileSingular: 'archivo',
      selectedSingular: 'seleccionada',
      selectionUpdated: 'Selección actualizada.',
      processingHint:
        'Los PDFs grandes pueden tardar un poco más. El proceso continúa de forma local en tu navegador.',
      completedEyebrow: 'Proceso completado',
      privacyResult:
        'El archivo generado se mantiene en tu navegador y no se envía a servidores externos.',
      openPreview: 'Abrir en una pestaña',
      totalSuffix: 'en total',
      interleave: 'Intercalar dos PDF',
      interleaveHelp:
        'Alterna las páginas de dos archivos: A1, B1, A2, B2… El resto conserva su orden.',
      firstPdf: 'Primer PDF',
      secondPdf: 'Segundo PDF',
      reverseSecond: 'Invertir el segundo PDF',
      interleaveAction: 'Intercalar páginas',
      interleaveDone: 'Las páginas de ambos PDF se han intercalado.',
      interleaveInvalid: 'Elige dos PDF distintos con páginas disponibles.',
    },
    en: {
      title: 'PDF multitool',
      intro: 'Organize, select and edit pages with quick actions before creating your new PDF.',
      eyebrow: 'Private and local',
      dropTitle: 'Drag your PDFs here',
      addMoreTitle: 'Add more PDF files',
      dropActive: 'Drop to add to the editor',
      dropText: 'Drop files or click to select them',
      fileHelp: 'PDF · private · local processing',
      noFiles: 'Load one or more PDFs to start.',
      invalidFiles: 'Some files were not PDFs and were ignored.',
      readError: 'This PDF could not be read. It may be damaged or protected.',
      rendering: 'Generating thumbnails…',
      page: 'Page',
      selected: 'selected',
      finalPages: 'pages',
      files: 'files',
      options: 'Multitool options',
      output: 'Output PDF',
      outputAll: 'All visible pages',
      outputSelected: 'Marked pages only',
      outputHelpAll: 'Every page you have not removed will be exported.',
      outputHelpSelected: 'Only pages with the blue check mark will be exported.',
      outputFileName: 'File name',
      outputFileHelp: 'The .pdf extension is added automatically.',
      addText: 'Add text',
      textLabel: 'Visible text',
      textPlaceholder: 'Text, stamp or watermark…',
      textPosition: 'Position',
      textPositions: {
        diagonal: 'Diagonal center',
        'top-center': 'Top center',
        'bottom-center': 'Bottom center',
        'bottom-right': 'Bottom right',
      },
      pageNumbers: 'Add page numbers',
      numberFormat: 'Format',
      numberFormatHelp: 'Use {n} for the current number and {total} for the total.',
      numberPosition: 'Position',
      numberPositions: {
        'bottom-center': 'Bottom center',
        'bottom-right': 'Bottom right',
        'top-right': 'Top right',
      },
      selection: 'Selection and actions',
      selectionHelp: 'Marked pages are used when “Marked pages only” is selected.',
      selectOdd: 'Odd',
      selectEven: 'Even',
      invertSelection: 'Invert',
      rangeLabel: 'Select range',
      rangePlaceholder: 'E.g. 1-3, 6, 9-12',
      rangeHelp: 'Based on the current thumbnail order.',
      rangeMode: 'Range mode',
      rangeModes: {
        replace: 'Replace selection',
        add: 'Add to selection',
        remove: 'Remove from selection',
      },
      applyRange: 'Apply',
      invalidRange: 'Enter a valid range, for example 1-3, 6, 9-12.',
      rotateSelectedLeft: 'Rotate marked pages left',
      rotateSelectedRight: 'Rotate marked pages right',
      duplicateSelected: 'Duplicate marked pages',
      moveSelectedStart: 'Move marked pages to start',
      moveSelectedEnd: 'Move marked pages to end',
      deleteSelected: 'Delete marked pages',
      reversePages: 'Reverse order',
      undo: 'Undo',
      undoDone: 'The last change was undone.',
      nothingToUndo: 'There are no changes to undo.',
      restoreDeleted: 'Restore deleted',
      restored: 'Deleted pages have been restored.',
      pagesRotated: 'The marked pages have been rotated.',
      pagesDuplicated: 'The marked pages have been duplicated.',
      pagesMovedStart: 'The marked pages were moved to the start.',
      pagesMovedEnd: 'The marked pages were moved to the end.',
      pagesDeleted: 'The marked pages were deleted. You can undo this change.',
      pagesReversed: 'The page order has been reversed.',
      pageMoved: 'Page moved.',
      generate: 'View and download PDF',
      generating: 'Generating PDF…',
      download: 'Download PDF',
      clear: 'Clear all',
      confirmClear: 'Remove all files and edits from the multitool?',
      confirmRemovePdf: 'Remove “{name}” and all its pages?',
      readyTitle: 'PDF ready',
      ready: 'Your PDF has been generated successfully.',
      needPages: 'At least one page must remain.',
      needSelected: 'Select at least one page.',
      selectedRequired: 'Mark at least one page to use this action.',
      createError: 'The PDF could not be generated. Check that files are not protected.',
      previewTitle: 'View and download PDF',
      closePreview: 'Close preview',
      outputName: 'facilpdf-multitool.pdf',
      rotateLeft: 'Rotate left',
      rotateRight: 'Rotate right',
      deletePage: 'Delete page',
      toggleSelected: 'Select or deselect page',
      dragPage: 'Drag to reorder',
      moveBefore: 'Move page backward',
      moveAfter: 'Move page forward',
      removePdf: 'Remove PDF',
      selectPdfPages: 'Select this PDF’s pages',
      deselectPdfPages: 'Deselect this PDF’s pages',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      enlargeThumb: 'Enlarge thumbnail',
      enlargedTitle: 'Enlarged thumbnail',
      closeEnlarged: 'Close enlarged thumbnail',
      thumbNotReady: 'The thumbnail is not ready yet.',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      zoomOut: 'Zoom out',
      zoomIn: 'Zoom in',
      resetZoom: 'Reset zoom',
      fileError: 'This file could not be opened.',
      pageSingular: 'page',
      fileSingular: 'file',
      selectedSingular: 'selected',
      selectionUpdated: 'Selection updated.',
      processingHint:
        'Large PDFs may take a little longer. Processing continues locally in your browser.',
      completedEyebrow: 'Process complete',
      privacyResult:
        'The generated file stays in your browser and is not sent to external servers.',
      openPreview: 'Open in a tab',
      totalSuffix: 'total',
      interleave: 'Interleave two PDFs',
      interleaveHelp:
        'Alternate pages from two files: A1, B1, A2, B2… Other files keep their order.',
      firstPdf: 'First PDF',
      secondPdf: 'Second PDF',
      reverseSecond: 'Reverse the second PDF',
      interleaveAction: 'Interleave pages',
      interleaveDone: 'Pages from both PDFs were interleaved.',
      interleaveInvalid: 'Choose two different PDFs with available pages.',
    },
  } as const;

  let sources: SourcePdf[] = [];
  let pages: PageItem[] = [];
  let history: HistoryEntry[] = [];
  let pdfJsPromise: Promise<any> | null = null;
  let renderToken = 0;
  let generationToken = 0;
  let fileLoadToken = 0;
  let thumbnailQueue: ThumbnailJob[] = [];
  let pendingPreviewUpdates = new Map<string, PendingPreviewUpdate>();
  let previewFlushFrame = 0;
  let activeThumbnailRenders = 0;
  let isRendering = false;
  let isGenerating = false;
  let errorMessage = '';
  let statusMessage = '';
  let previewUrl = '';
  let isPreviewOpen = false;
  let resultBytes: Uint8Array | null = null;
  let outputMode: OutputMode = 'selected';
  let outputFileName = lang === 'en' ? 'facilpdf-multitool' : 'facilpdf-multiherramienta';
  let textMode: TextMode = 'none';
  let textValue = '';
  let textSize = 34;
  let textOpacity = 0.2;
  let textPosition: TextPosition = 'diagonal';
  let numberingEnabled = false;
  let numberFormat = lang === 'en' ? 'Page {n} of {total}' : 'Página {n} de {total}';
  let numberPosition: NumberPosition = 'bottom-center';
  let numberSize = 11;
  let selectionRange = '';
  let selectionRangeMode: SelectionRangeMode = 'replace';
  let interleaveFirstId = '';
  let interleaveSecondId = '';
  let reverseInterleaveSecond = false;
  let draggedPageId = '';
  let dragOverPageId = '';
  let enlargedPage: PageItem | null = null;
  let enlargedZoom = 1;
  let enlargedDialog: HTMLDivElement;
  let enlargedCloseButton: HTMLButtonElement;
  let enlargedTrigger: HTMLElement | null = null;
  let previousBodyOverflow = '';
  let toolRoot: HTMLElement;
  let showMobileAction = true;
  let workspaceRegion: HTMLDivElement;
  let sourceSelectionStats = new Map<string, SourceSelectionStats>();

  $: t = copy[lang] ?? copy.es;
  $: visiblePages = pages.filter((page) => page.kept);
  $: selectedPages = visiblePages.filter((page) => page.selected);
  $: deletedPages = pages.filter((page) => !page.kept);
  $: exportPages = outputMode === 'selected' ? selectedPages : visiblePages;
  $: totalPageItems = pages.length;
  $: sourceSelectionStats = buildSourceSelectionStats(sources, pages);
  $: interleaveSources = sources.filter(
    (source) => !source.error && (sourceSelectionStats.get(source.id)?.total ?? 0) > 0,
  );
  $: downloadName = normalizeOutputName(outputFileName, t.outputName);
  $: canGenerate =
    exportPages.length > 0 && (!numberingEnabled || Boolean(numberFormat.trim())) && !isGenerating;
  $: enlargedIndex = enlargedPage
    ? visiblePages.findIndex((page) => page.id === enlargedPage?.id)
    : -1;

  async function loadPdfJs() {
    if (!pdfJsPromise) {
      pdfJsPromise = Promise.all([
        import('pdfjs-dist/build/pdf.mjs'),
        import('pdfjs-dist/build/pdf.worker.mjs?url'),
      ]).then(([pdfJs, worker]) => {
        pdfJs.GlobalWorkerOptions.workerSrc = worker.default;
        return pdfJs;
      });
    }

    return pdfJsPromise;
  }

  async function addFiles(selectedFiles: File[]) {
    if (!selectedFiles.length) return;
    const token = fileLoadToken;
    errorMessage = '';
    statusMessage = '';
    history = [];

    for (const file of selectedFiles) {
      const id = newId();

      try {
        const bytes = await file.arrayBuffer();
        if (token !== fileLoadToken) return;
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
        if (token !== fileLoadToken) return;
        const pageCount = pdf.getPageCount();
        const source: SourcePdf = { id, file, pageCount };
        const sourcePages = Array.from({ length: pageCount }, (_, index): PageItem => ({
          id: `${id}-${index}-${newId()}`,
          sourceId: id,
          fileName: file.name,
          pageIndex: index,
          pageNumber: index + 1,
          pageLabel: String(index + 1),
          rotation: 0,
          kept: true,
          selected: true,
          thumbStatus: 'pending',
        }));

        sources = [...sources, source];
        pages = [...pages, ...sourcePages];
        syncInterleaveSources();
        history = [];
        invalidateResult();
        enqueueSourceThumbnails(source, sourcePages);
      } catch {
        if (token !== fileLoadToken) return;
        sources = [...sources, { id, file, pageCount: 0, error: t.readError }];
        history = [];
      }
    }

    await tick();
    if (token !== fileLoadToken) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    workspaceRegion?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function handleInvalidFiles() {
    errorMessage = t.invalidFiles;
  }

  function handleValidationErrors(errors: string[]) {
    errorMessage = errors.join(' ');
  }

  function enqueueSourceThumbnails(source: SourcePdf, sourcePages: PageItem[]) {
    thumbnailQueue.push({ source, sourcePages, token: renderToken });
    isRendering = true;
    pumpThumbnailQueue();
  }

  function pumpThumbnailQueue() {
    while (activeThumbnailRenders < MAX_CONCURRENT_THUMBNAIL_JOBS && thumbnailQueue.length > 0) {
      const job = thumbnailQueue.shift();
      if (
        !job ||
        job.token !== renderToken ||
        !sources.some((source) => source.id === job.source.id)
      ) {
        continue;
      }

      activeThumbnailRenders += 1;
      void renderSourceThumbnails(job).finally(() => {
        if (job.token !== renderToken) return;
        activeThumbnailRenders = Math.max(0, activeThumbnailRenders - 1);
        pumpThumbnailQueue();
      });
    }

    isRendering = activeThumbnailRenders > 0 || thumbnailQueue.length > 0;
  }

  async function renderSourceThumbnails({ source, sourcePages, token }: ThumbnailJob) {
    let pdfDoc: any = null;
    const settledPageIndexes = new Set<number>();

    try {
      const pdfJs = await loadPdfJs();
      if (token !== renderToken) return;
      const bytes = new Uint8Array(await source.file.arrayBuffer());
      if (token !== renderToken) return;
      pdfDoc = await pdfJs.getDocument({
        data: bytes,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableAutoFetch: true,
        disableStream: true,
      }).promise;
      if (token !== renderToken) return;

      const pageLabels = await readPageLabels(pdfDoc, sourcePages.length);
      if (token !== renderToken || !sources.some((item) => item.id === source.id)) return;
      if (pageLabels.some((label, index) => label !== String(index + 1))) {
        sources = sources.map((item) => (item.id === source.id ? { ...item, pageLabels } : item));
        sourcePages.forEach((item) =>
          updateSourcePagePreview(item.sourceId, item.pageIndex, {
            pageLabel: pageLabels[item.pageIndex],
          }),
        );
      }

      for (const item of sourcePages) {
        if (token !== renderToken || !sources.some((item) => item.id === source.id)) break;
        await yieldToBrowser();
        if (token !== renderToken || !sources.some((item) => item.id === source.id)) break;

        let page: any = null;
        try {
          page = await pdfDoc.getPage(item.pageNumber);
          const thumbUrl = await renderPageThumb(page);
          if (token !== renderToken || !sources.some((item) => item.id === source.id)) {
            URL.revokeObjectURL(thumbUrl);
            break;
          }
          updateSourcePagePreview(item.sourceId, item.pageIndex, {
            thumbUrl,
            thumbStatus: 'ready',
          });
        } catch {
          if (token === renderToken && sources.some((item) => item.id === source.id)) {
            updateSourcePagePreview(item.sourceId, item.pageIndex, { thumbStatus: 'failed' });
          }
        } finally {
          settledPageIndexes.add(item.pageIndex);
          page?.cleanup();
        }
      }
    } catch {
      if (token === renderToken && sources.some((item) => item.id === source.id)) {
        sourcePages
          .filter((item) => !settledPageIndexes.has(item.pageIndex))
          .forEach((item) =>
            updateSourcePagePreview(item.sourceId, item.pageIndex, { thumbStatus: 'failed' }),
          );
      }
    } finally {
      if (pdfDoc) {
        try {
          await pdfDoc.destroy();
        } catch {
          // The document may already be closing after cancellation.
        }
      }
    }
  }

  async function readPageLabels(pdfDoc: any, pageCount: number) {
    try {
      const labels =
        typeof pdfDoc.getPageLabels === 'function' ? await pdfDoc.getPageLabels() : null;

      return Array.from({ length: pageCount }, (_, index) => {
        const label = Array.isArray(labels) ? labels[index] : '';
        return typeof label === 'string' && label.trim() ? label.trim() : String(index + 1);
      });
    } catch {
      return Array.from({ length: pageCount }, (_, index) => String(index + 1));
    }
  }

  function pageDisplayName(page: PageItem) {
    return page.pageLabel || String(page.pageNumber);
  }

  async function renderPageThumb(pdfPage: any) {
    const originalViewport = pdfPage.getViewport({ scale: 1 });
    const originalWidth = Math.max(1, originalViewport.width);
    const originalHeight = Math.max(1, originalViewport.height);
    if (!Number.isFinite(originalWidth) || !Number.isFinite(originalHeight)) {
      throw new Error('Invalid page dimensions');
    }
    const pixelScale =
      Math.sqrt(MAX_THUMBNAIL_PIXELS) / Math.sqrt(originalWidth) / Math.sqrt(originalHeight);
    const scale = Math.min(
      0.34,
      MAX_THUMBNAIL_WIDTH / originalWidth,
      MAX_THUMBNAIL_HEIGHT / originalHeight,
      pixelScale,
    );
    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) throw new Error('No canvas context');

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await pdfPage.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    if (!blob) throw new Error('No thumbnail blob');

    return URL.createObjectURL(blob);
  }

  function updatePage(pageId: string, patch: Partial<PageItem>) {
    pages = pages.map((page) => (page.id === pageId ? { ...page, ...patch } : page));
    if (enlargedPage?.id === pageId) enlargedPage = { ...enlargedPage, ...patch };
  }

  function updateSourcePagePreview(sourceId: string, pageIndex: number, patch: PreviewPatch) {
    const key = `${sourceId}:${pageIndex}`;
    const pending = pendingPreviewUpdates.get(key);
    pendingPreviewUpdates.set(key, {
      sourceId,
      pageIndex,
      patch: { ...pending?.patch, ...patch },
    });

    if (!previewFlushFrame) {
      previewFlushFrame = window.requestAnimationFrame(flushSourcePagePreviews);
    }
  }

  function flushSourcePagePreviews() {
    previewFlushFrame = 0;
    if (pendingPreviewUpdates.size === 0) return;

    const updates = pendingPreviewUpdates;
    pendingPreviewUpdates = new Map();
    const sourceIds = new Set(sources.map((source) => source.id));

    for (const update of updates.values()) {
      if (!sourceIds.has(update.sourceId) && update.patch.thumbUrl) {
        URL.revokeObjectURL(update.patch.thumbUrl);
      }
    }

    pages = pages.map((page) => {
      const update = updates.get(`${page.sourceId}:${page.pageIndex}`);
      return update ? { ...page, ...update.patch } : page;
    });

    if (enlargedPage) {
      const update = updates.get(`${enlargedPage.sourceId}:${enlargedPage.pageIndex}`);
      if (update) enlargedPage = { ...enlargedPage, ...update.patch };
    }
  }

  function discardPendingPreviewUpdates(sourceId?: string) {
    for (const [key, update] of pendingPreviewUpdates) {
      if (sourceId && update.sourceId !== sourceId) continue;
      if (update.patch.thumbUrl) URL.revokeObjectURL(update.patch.thumbUrl);
      pendingPreviewUpdates.delete(key);
    }

    if (pendingPreviewUpdates.size === 0 && previewFlushFrame) {
      window.cancelAnimationFrame(previewFlushFrame);
      previewFlushFrame = 0;
    }
  }

  function removeSource(sourceId: string) {
    const source = sources.find((item) => item.id === sourceId);
    if (!source) return;

    const confirmation = t.confirmRemovePdf.replace('{name}', source.file.name);
    if (!source.error && typeof window !== 'undefined' && !window.confirm(confirmation)) return;

    const sourceUrls = new Set(
      pages
        .filter((page) => page.sourceId === sourceId)
        .map((page) => page.thumbUrl)
        .filter((url): url is string => Boolean(url)),
    );
    sourceUrls.forEach((url) => URL.revokeObjectURL(url));
    thumbnailQueue = thumbnailQueue.filter((job) => job.source.id !== sourceId);
    discardPendingPreviewUpdates(sourceId);
    if (enlargedPage?.sourceId === sourceId) closeEnlarged();
    sources = sources.filter((source) => source.id !== sourceId);
    pages = pages.filter((page) => page.sourceId !== sourceId);
    syncInterleaveSources();
    isRendering = activeThumbnailRenders > 0 || thumbnailQueue.length > 0;
    history = [];
    invalidateResult();
  }

  function toggleSelected(pageId: string) {
    const page = pages.find((item) => item.id === pageId);
    if (!page?.kept) return;
    updatePage(pageId, { selected: !page.selected });
    invalidateResult();
  }

  function toggleSourceSelection(sourceId: string) {
    const sourcePages = pages.filter((page) => page.kept && page.sourceId === sourceId);
    if (sourcePages.length === 0) return;
    const shouldSelect = !sourcePages.every((page) => page.selected);
    pages = pages.map((page) =>
      page.kept && page.sourceId === sourceId ? { ...page, selected: shouldSelect } : page,
    );
    invalidateResult();
    statusMessage = t.selectionUpdated;
  }

  function buildSourceSelectionStats(currentSources: SourcePdf[], currentPages: PageItem[]) {
    const stats = new Map<string, SourceSelectionStats>(
      currentSources.map((source) => [source.id, { selected: 0, total: 0, allSelected: false }]),
    );

    for (const page of currentPages) {
      if (!page.kept) continue;
      const sourceStats = stats.get(page.sourceId);
      if (!sourceStats) continue;
      sourceStats.total += 1;
      if (page.selected) sourceStats.selected += 1;
    }

    for (const sourceStats of stats.values()) {
      sourceStats.allSelected = sourceStats.total > 0 && sourceStats.selected === sourceStats.total;
    }

    return stats;
  }

  function selectAll(selected: boolean) {
    pages = pages.map((page) => (page.kept ? { ...page, selected } : page));
    invalidateResult();
    statusMessage = t.selectionUpdated;
  }

  function selectPattern(pattern: 'odd' | 'even' | 'invert') {
    let visibleIndex = 0;
    pages = pages.map((page) => {
      if (!page.kept) return page;
      visibleIndex += 1;
      if (pattern === 'invert') return { ...page, selected: !page.selected };
      const shouldSelect = pattern === 'odd' ? visibleIndex % 2 === 1 : visibleIndex % 2 === 0;
      return { ...page, selected: shouldSelect };
    });
    invalidateResult();
    statusMessage = t.selectionUpdated;
  }

  function applySelectionRange() {
    const selectedIndexes = parsePageRange(selectionRange, visiblePages.length);
    if (!selectedIndexes) {
      errorMessage = t.invalidRange;
      return;
    }

    let visibleIndex = 0;
    pages = pages.map((page) => {
      if (!page.kept) return page;
      visibleIndex += 1;
      const isInRange = selectedIndexes.has(visibleIndex);
      const selected =
        selectionRangeMode === 'add'
          ? page.selected || isInRange
          : selectionRangeMode === 'remove'
            ? page.selected && !isInRange
            : isInRange;
      return { ...page, selected };
    });
    invalidateResult();
    statusMessage = t.selectionUpdated;
  }

  function parsePageRange(value: string, pageCount: number) {
    const tokens = value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length === 0) return null;

    const indexes = new Set<number>();
    for (const token of tokens) {
      const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) return null;
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      if (start < 1 || end < 1 || start > pageCount || end > pageCount) return null;
      for (let index = Math.min(start, end); index <= Math.max(start, end); index += 1) {
        indexes.add(index);
      }
    }
    return indexes;
  }

  function saveHistory(action: string) {
    const snapshot = pages.map((page) => ({ ...page }));
    history = [...history.slice(-19), { pages: snapshot, action }];
  }

  function undoLastChange() {
    const entry = history.at(-1);
    if (!entry) {
      errorMessage = t.nothingToUndo;
      return;
    }
    history = history.slice(0, -1);
    const livePages = new Map(pages.map((page) => [page.id, page]));
    pages = entry.pages.map((page) => {
      const livePage = livePages.get(page.id);
      return livePage
        ? {
            ...page,
            selected: page.kept !== livePage.kept ? page.selected : livePage.selected,
            pageLabel: livePage.pageLabel,
            thumbUrl: livePage.thumbUrl ?? page.thumbUrl,
            thumbStatus: livePage.thumbStatus,
          }
        : { ...page };
    });
    if (enlargedPage) {
      const restoredPage = pages.find((page) => page.id === enlargedPage?.id && page.kept);
      if (restoredPage) enlargedPage = restoredPage;
      else closeEnlarged();
    }
    syncInterleaveSources();
    invalidateResult();
    statusMessage = t.undoDone;
  }

  function restoreDeletedPages() {
    if (deletedPages.length === 0) return;
    saveHistory(t.restoreDeleted);
    pages = pages.map((page) => (!page.kept ? { ...page, kept: true, selected: true } : page));
    syncInterleaveSources();
    invalidateResult();
    statusMessage = t.restored;
  }

  function deletePage(pageId: string) {
    if (visiblePages.length <= 1) {
      errorMessage = t.needPages;
      return;
    }
    saveHistory(t.deletePage);
    if (enlargedPage?.id === pageId) closeEnlarged();
    updatePage(pageId, { kept: false, selected: false });
    syncInterleaveSources();
    invalidateResult();
    statusMessage = t.pagesDeleted;
  }

  function rotatePage(pageId: string, delta: 90 | -90) {
    const page = pages.find((item) => item.id === pageId);
    if (!page) return;
    saveHistory(delta < 0 ? t.rotateLeft : t.rotateRight);
    updatePage(pageId, { rotation: normalize(page.rotation + delta) });
    invalidateResult();
  }

  function rotateSelected(delta: 90 | -90) {
    if (selectedPages.length === 0) {
      errorMessage = t.selectedRequired;
      return;
    }
    saveHistory(delta < 0 ? t.rotateSelectedLeft : t.rotateSelectedRight);
    pages = pages.map((page) =>
      page.kept && page.selected ? { ...page, rotation: normalize(page.rotation + delta) } : page,
    );
    invalidateResult();
    statusMessage = t.pagesRotated;
  }

  function duplicateSelectedPages() {
    if (selectedPages.length === 0) {
      errorMessage = t.selectedRequired;
      return;
    }
    saveHistory(t.duplicateSelected);
    pages = pages.flatMap((page) =>
      page.kept && page.selected ? [page, { ...page, id: newId() }] : [page],
    );
    invalidateResult();
    statusMessage = t.pagesDuplicated;
  }

  function moveSelectedPages(position: 'start' | 'end') {
    if (selectedPages.length === 0) {
      errorMessage = t.selectedRequired;
      return;
    }

    const selectedIds = new Set(selectedPages.map((page) => page.id));
    const selectedItems = pages.filter((page) => selectedIds.has(page.id));
    const otherItems = pages.filter((page) => !selectedIds.has(page.id));
    const nextPages =
      position === 'start' ? [...selectedItems, ...otherItems] : [...otherItems, ...selectedItems];
    if (nextPages.every((page, index) => page.id === pages[index]?.id)) return;

    saveHistory(position === 'start' ? t.moveSelectedStart : t.moveSelectedEnd);
    pages = nextPages;
    invalidateResult();
    statusMessage = position === 'start' ? t.pagesMovedStart : t.pagesMovedEnd;
  }

  function syncInterleaveSources() {
    const sourceIdsWithVisiblePages = new Set(
      pages.filter((page) => page.kept).map((page) => page.sourceId),
    );
    const ids = sources
      .filter((source) => !source.error && sourceIdsWithVisiblePages.has(source.id))
      .map((source) => source.id);

    if (!ids.some((id) => id === interleaveFirstId)) interleaveFirstId = ids[0] ?? '';
    if (!ids.some((id) => id === interleaveSecondId) || interleaveSecondId === interleaveFirstId) {
      interleaveSecondId = ids.find((id) => id !== interleaveFirstId) ?? '';
    }
  }

  function interleavePdfPages() {
    if (!interleaveFirstId || !interleaveSecondId || interleaveFirstId === interleaveSecondId) {
      errorMessage = t.interleaveInvalid;
      return;
    }

    const visiblePagesBefore = pages.filter((page) => page.kept);
    const firstPages = visiblePagesBefore.filter((page) => page.sourceId === interleaveFirstId);
    const secondPages = visiblePagesBefore.filter((page) => page.sourceId === interleaveSecondId);
    if (firstPages.length === 0 || secondPages.length === 0) {
      errorMessage = t.interleaveInvalid;
      return;
    }

    const orderedSecondPages = reverseInterleaveSecond ? [...secondPages].reverse() : secondPages;
    const interleaved: PageItem[] = [];
    const longestSource = Math.max(firstPages.length, orderedSecondPages.length);
    for (let index = 0; index < longestSource; index += 1) {
      if (firstPages[index]) interleaved.push(firstPages[index]);
      if (orderedSecondPages[index]) interleaved.push(orderedSecondPages[index]);
    }

    const sourceIds = new Set([interleaveFirstId, interleaveSecondId]);
    const nextVisiblePages: PageItem[] = [];
    let inserted = false;
    for (const page of visiblePagesBefore) {
      if (sourceIds.has(page.sourceId)) {
        if (!inserted) {
          nextVisiblePages.push(...interleaved);
          inserted = true;
        }
      } else {
        nextVisiblePages.push(page);
      }
    }

    let visibleIndex = 0;
    const nextPages = pages.map((page) => (page.kept ? nextVisiblePages[visibleIndex++]! : page));
    saveHistory(t.interleave);
    pages = nextPages;
    invalidateResult();
    statusMessage = t.interleaveDone;
  }

  function deleteSelectedPages() {
    if (selectedPages.length === 0) {
      errorMessage = t.selectedRequired;
      return;
    }
    if (visiblePages.length - selectedPages.length < 1) {
      errorMessage = t.needPages;
      return;
    }
    saveHistory(t.deleteSelected);
    const selectedIds = new Set(selectedPages.map((page) => page.id));
    if (enlargedPage && selectedIds.has(enlargedPage.id)) closeEnlarged();
    pages = pages.map((page) =>
      selectedIds.has(page.id) ? { ...page, kept: false, selected: false } : page,
    );
    syncInterleaveSources();
    invalidateResult();
    statusMessage = t.pagesDeleted;
  }

  function reversePages() {
    if (visiblePages.length < 2) return;
    saveHistory(t.reversePages);
    const reversed = [...visiblePages].reverse();
    let visibleIndex = 0;
    pages = pages.map((page) => (page.kept ? reversed[visibleIndex++] : page));
    invalidateResult();
    statusMessage = t.pagesReversed;
  }

  function movePage(pageId: string, delta: -1 | 1) {
    const currentIndex = visiblePages.findIndex((page) => page.id === pageId);
    const target = visiblePages[currentIndex + delta];
    if (currentIndex < 0 || !target) return;

    saveHistory(delta < 0 ? t.moveBefore : t.moveAfter);
    const fromIndex = pages.findIndex((page) => page.id === pageId);
    const toIndex = pages.findIndex((page) => page.id === target.id);
    const nextPages = [...pages];
    [nextPages[fromIndex], nextPages[toIndex]] = [nextPages[toIndex], nextPages[fromIndex]];
    pages = nextPages;
    invalidateResult();
    statusMessage = t.pageMoved;
  }

  function onDragStart(event: DragEvent, pageId: string) {
    draggedPageId = pageId;
    dragOverPageId = '';
    event.dataTransfer?.setData('text/plain', pageId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(event: DragEvent, pageId: string) {
    event.preventDefault();
    dragOverPageId = pageId;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function onDrop(event: DragEvent, targetPageId: string) {
    event.preventDefault();
    const sourcePageId = draggedPageId || event.dataTransfer?.getData('text/plain') || '';
    draggedPageId = '';
    dragOverPageId = '';

    if (!sourcePageId || sourcePageId === targetPageId) return;

    const fromIndex = pages.findIndex((page) => page.id === sourcePageId);
    const toIndex = pages.findIndex((page) => page.id === targetPageId);
    if (fromIndex < 0 || toIndex < 0) return;

    saveHistory(t.dragPage);
    const nextPages = [...pages];
    const [page] = nextPages.splice(fromIndex, 1);
    nextPages.splice(toIndex, 0, page);
    pages = nextPages;
    invalidateResult();
    statusMessage = t.pageMoved;
  }

  async function generatePdf() {
    if (outputMode === 'selected' && selectedPages.length === 0) {
      errorMessage = t.needSelected;
      return;
    }

    if (exportPages.length === 0) {
      errorMessage = t.needPages;
      return;
    }

    const token = ++generationToken;
    const pagesToExport = exportPages.map((page) => ({ ...page }));
    const sourceSnapshot = new Map(sources.map((source) => [source.id, source]));
    const textSettings: TextSettings = {
      mode: textMode,
      value: textValue.trim(),
      size: Number(textSize) || 34,
      opacity: Number(textOpacity) || 0.2,
      position: textPosition,
    };
    const numberSettings: NumberSettings = {
      enabled: numberingEnabled,
      format: numberFormat,
      position: numberPosition,
      size: Number(numberSize) || 11,
    };

    isGenerating = true;
    errorMessage = '';
    statusMessage = '';
    clearResult();

    try {
      const outputPdf = await PDFDocument.create();
      if (token !== generationToken) return;
      const loadedSources = new Map<string, PDFDocument>();
      const font = await outputPdf.embedFont(StandardFonts.HelveticaBold);
      if (token !== generationToken) return;

      for (const [outputIndex, pageItem] of pagesToExport.entries()) {
        if (token !== generationToken) return;
        const source = sourceSnapshot.get(pageItem.sourceId);
        if (!source || source.error) continue;

        let sourcePdf = loadedSources.get(source.id);
        if (!sourcePdf) {
          const sourceBytes = await source.file.arrayBuffer();
          if (token !== generationToken) return;
          sourcePdf = await PDFDocument.load(sourceBytes, {
            ignoreEncryption: false,
          });
          if (token !== generationToken) return;
          loadedSources.set(source.id, sourcePdf);
        }

        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageItem.pageIndex]);
        if (token !== generationToken) return;
        const finalRotation = normalize(copiedPage.getRotation().angle + pageItem.rotation);

        copiedPage.setRotation(degrees(finalRotation));

        outputPdf.addPage(copiedPage);

        if (shouldDrawText(pageItem, textSettings)) {
          drawText(copiedPage, font, textSettings, finalRotation);
        }

        if (numberSettings.enabled) {
          drawPageNumber(
            copiedPage,
            font,
            outputIndex + 1,
            pagesToExport.length,
            numberSettings,
            finalRotation,
          );
        }

        await yieldToBrowser();
      }

      const generatedBytes = new Uint8Array(await outputPdf.save({ useObjectStreams: true }));
      if (token !== generationToken) return;
      const generatedUrl = createPdfObjectUrl(generatedBytes);
      if (token !== generationToken) {
        URL.revokeObjectURL(generatedUrl);
        return;
      }
      resultBytes = generatedBytes;
      previewUrl = generatedUrl;
      isPreviewOpen = true;
      statusMessage = t.ready;
    } catch {
      if (token === generationToken) errorMessage = t.createError;
    } finally {
      if (token === generationToken) isGenerating = false;
    }
  }

  function shouldDrawText(page: PageItem, settings: TextSettings) {
    if (!settings.value || settings.mode === 'none') return false;
    if (settings.mode === 'all') return true;
    return page.selected;
  }

  function drawText(page: any, font: any, settings: TextSettings, pageRotation: number) {
    const { width, height } = page.getSize();
    const { width: visualWidth, height: visualHeight } = getVisualPageSize(
      width,
      height,
      pageRotation,
    );
    const unitWidth = Math.max(font.widthOfTextAtSize(settings.value, 1), 1);
    const size = Math.max(8, Math.min(settings.size, (visualWidth - 64) / unitWidth));
    const textWidth = font.widthOfTextAtSize(settings.value, size);
    const margin = 32;
    const isRight = settings.position === 'bottom-right';
    const visualX = isRight
      ? Math.max(margin, visualWidth - margin - textWidth)
      : (visualWidth - textWidth) / 2;
    const visualY =
      settings.position === 'top-center'
        ? visualHeight - margin - size
        : settings.position.startsWith('bottom')
          ? margin
          : visualHeight / 2;
    const point = visualToPagePoint(visualX, visualY, width, height, pageRotation);

    page.drawText(settings.value, {
      x: point.x,
      y: point.y,
      size,
      font,
      color: rgb(0.85, 0.12, 0.1),
      opacity: settings.opacity,
      rotate: degrees(normalize(pageRotation + (settings.position === 'diagonal' ? -24 : 0))),
    });
  }

  function drawPageNumber(
    page: any,
    font: any,
    current: number,
    total: number,
    settings: NumberSettings,
    pageRotation: number,
  ) {
    const label = settings.format
      .replaceAll('{n}', String(current))
      .replaceAll('{total}', String(total));
    const { width, height } = page.getSize();
    const { width: visualWidth, height: visualHeight } = getVisualPageSize(
      width,
      height,
      pageRotation,
    );
    const unitWidth = Math.max(font.widthOfTextAtSize(label, 1), 1);
    const size = Math.max(7, Math.min(settings.size, (visualWidth - 48) / unitWidth));
    const textWidth = font.widthOfTextAtSize(label, size);
    const margin = 24;
    const visualX = settings.position.endsWith('right')
      ? Math.max(margin, visualWidth - margin - textWidth)
      : (visualWidth - textWidth) / 2;
    const visualY = settings.position.startsWith('top') ? visualHeight - margin - size : margin;
    const point = visualToPagePoint(visualX, visualY, width, height, pageRotation);

    page.drawText(label, {
      x: point.x,
      y: point.y,
      size,
      font,
      color: rgb(0.12, 0.16, 0.22),
      opacity: 0.9,
      rotate: degrees(pageRotation),
    });
  }

  function getVisualPageSize(width: number, height: number, rotation: number) {
    return rotation === 90 || rotation === 270
      ? { width: height, height: width }
      : { width, height };
  }

  function visualToPagePoint(
    visualX: number,
    visualY: number,
    width: number,
    height: number,
    rotation: number,
  ) {
    if (rotation === 90) return { x: width - visualY, y: visualX };
    if (rotation === 180) return { x: width - visualX, y: height - visualY };
    if (rotation === 270) return { x: visualY, y: height - visualX };
    return { x: visualX, y: visualY };
  }

  function thumbStyle(rotation: number) {
    const scale = rotation === 90 || rotation === 270 ? 0.74 : 1;
    return `transform: rotate(${rotation}deg) scale(${scale});`;
  }

  function enlargedThumbStyle(rotation: number) {
    const rotationScale = rotation === 90 || rotation === 270 ? 0.74 : 1;
    return `transform: rotate(${rotation}deg) scale(${rotationScale * enlargedZoom});`;
  }

  async function openEnlarged(page: PageItem, trigger?: EventTarget | null) {
    if (!enlargedPage && typeof document !== 'undefined') {
      enlargedTrigger = trigger instanceof HTMLElement ? trigger : null;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    enlargedPage = page;
    enlargedZoom = 1;
    await tick();
    enlargedCloseButton?.focus();
  }

  function navigateEnlarged(delta: -1 | 1) {
    const target = visiblePages[enlargedIndex + delta];
    if (!target) return;
    enlargedPage = target;
    enlargedZoom = 1;
  }

  function setEnlargedZoom(value: number) {
    enlargedZoom = Math.min(4, Math.max(0.5, Number(value) || 1));
  }

  function closeEnlarged(restoreFocus = true) {
    if (!enlargedPage) return;
    enlargedPage = null;
    enlargedZoom = 1;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = previousBodyOverflow;
    }
    if (restoreFocus && enlargedTrigger?.isConnected) enlargedTrigger.focus();
    enlargedTrigger = null;
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!enlargedPage) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEnlarged();
      return;
    }

    if (!(event.target instanceof HTMLInputElement)) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateEnlarged(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateEnlarged(1);
      }
    }

    if (event.key !== 'Tab' || !enlargedDialog) return;
    const focusable = Array.from(
      enlargedDialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  function clearTool(requestConfirmation = false) {
    if (
      requestConfirmation &&
      sources.length > 0 &&
      typeof window !== 'undefined' &&
      !window.confirm(t.confirmClear)
    ) {
      return;
    }
    renderToken += 1;
    generationToken += 1;
    fileLoadToken += 1;
    thumbnailQueue = [];
    discardPendingPreviewUpdates();
    activeThumbnailRenders = 0;
    isRendering = false;
    isGenerating = false;
    const thumbUrls = new Set(
      pages.map((page) => page.thumbUrl).filter((url): url is string => Boolean(url)),
    );
    thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    closeEnlarged(false);
    sources = [];
    pages = [];
    history = [];
    selectionRange = '';
    selectionRangeMode = 'replace';
    interleaveFirstId = '';
    interleaveSecondId = '';
    reverseInterleaveSecond = false;
    errorMessage = '';
    statusMessage = '';
    clearResult();
  }

  function invalidateResult() {
    generationToken += 1;
    isGenerating = false;
    clearResult();
    errorMessage = '';
    statusMessage = '';
  }

  function clearResult() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    resultBytes = null;
    isPreviewOpen = false;
  }

  function closePreview() {
    isPreviewOpen = false;
  }

  function normalize(value: number) {
    return ((value % 360) + 360) % 360;
  }

  function normalizeOutputName(value: string, fallback: string) {
    const fallbackBase = fallback.replace(/\.pdf$/i, '');
    const safeBase = value
      .trim()
      .replace(/\.pdf$/i, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 120);
    return `${safeBase || fallbackBase}.pdf`;
  }

  function newId() {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }

  function pageCountLabel(count: number) {
    return count === 1 ? t.pageSingular : t.finalPages;
  }

  function fileCountLabel(count: number) {
    return count === 1 ? t.fileSingular : t.files;
  }

  function selectedCountLabel(count: number) {
    return count === 1 ? t.selectedSingular : t.selected;
  }

  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      showMobileAction = entry?.isIntersecting ?? true;
    });
    observer.observe(toolRoot);
    return () => observer.disconnect();
  });

  onDestroy(() => clearTool(false));
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<section
  bind:this={toolRoot}
  class="multi-tool"
  class:multi-tool--has-files={sources.length > 0}
  aria-labelledby="multi-tool-title"
  aria-busy={isGenerating}
>
  <header class="multi-tool__hero">
    <div>
      <span class="multi-tool__eyebrow">{t.eyebrow}</span>
      <h2 id="multi-tool-title">{t.title}</h2>
      <p>{t.intro}</p>
    </div>

    <div class="multi-tool__stats">
      <strong>{visiblePages.length}</strong>
      <span>{pageCountLabel(visiblePages.length)}</span>
      <small
        >{sources.length}
        {fileCountLabel(sources.length)} · {totalPageItems}
        {pageCountLabel(totalPageItems)}
        {t.totalSuffix} · {selectedPages.length}
        {selectedCountLabel(selectedPages.length)}</small
      >
    </div>
  </header>

  <PdfDropzone
    {lang}
    multiple
    compact={sources.length > 0}
    title={sources.length > 0 ? t.addMoreTitle : t.dropTitle}
    activeTitle={t.dropActive}
    subtitle={t.dropText}
    help={t.fileHelp}
    onFiles={addFiles}
    onInvalidFiles={handleInvalidFiles}
    onValidationErrors={handleValidationErrors}
  />

  {#if errorMessage}
    <p
      class="multi-tool__message multi-tool__message--error"
      id={errorMessage === t.invalidRange ? 'multi-selection-range-error' : undefined}
      role="alert"
    >
      {errorMessage}
    </p>
  {/if}

  {#if statusMessage}
    <p class="multi-tool__message multi-tool__message--success" role="status">{statusMessage}</p>
  {/if}

  {#if isRendering}
    <p class="multi-tool__message" role="status">{t.rendering}</p>
  {/if}

  {#if isGenerating}
    <ProcessingState
      title={t.generating}
      description={t.intro}
      longOperationHint={t.processingHint}
    />
  {/if}

  {#if sources.length === 0}
    <p class="multi-tool__empty">{t.noFiles}</p>
  {:else}
    <div class="multi-tool__workspace" bind:this={workspaceRegion}>
      <section class="multi-tool__canvas" aria-labelledby="selection-title">
        <header class="selection-toolbar">
          <div class="selection-toolbar__heading">
            <div>
              <h3 id="selection-title">{t.selection}</h3>
              <p>{t.selectionHelp}</p>
            </div>
            <strong
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${selectedPages.length} ${selectedCountLabel(selectedPages.length)}`}
              >{selectedPages.length}/{visiblePages.length}</strong
            >
          </div>

          <div class="selection-toolbar__quick" role="group" aria-label={t.selection}>
            <button type="button" on:click={() => selectAll(true)}>{t.selectAll}</button>
            <button type="button" on:click={() => selectAll(false)}>{t.deselectAll}</button>
            <button type="button" on:click={() => selectPattern('odd')}>{t.selectOdd}</button>
            <button type="button" on:click={() => selectPattern('even')}>{t.selectEven}</button>
            <button type="button" on:click={() => selectPattern('invert')}
              >{t.invertSelection}</button
            >
          </div>

          <form class="selection-toolbar__range" on:submit|preventDefault={applySelectionRange}>
            <label for="multi-selection-range">
              <span>{t.rangeLabel}</span>
              <input
                id="multi-selection-range"
                type="text"
                bind:value={selectionRange}
                placeholder={t.rangePlaceholder}
                aria-describedby="multi-selection-range-help"
                aria-invalid={errorMessage === t.invalidRange}
                aria-errormessage={errorMessage === t.invalidRange
                  ? 'multi-selection-range-error'
                  : undefined}
                on:input={() => {
                  if (errorMessage === t.invalidRange) errorMessage = '';
                }}
              />
            </label>
            <label class="selection-toolbar__range-mode">
              <span>{t.rangeMode}</span>
              <select bind:value={selectionRangeMode}>
                {#each Object.entries(t.rangeModes) as [value, label] (value)}
                  <option {value}>{label}</option>
                {/each}
              </select>
            </label>
            <button type="submit">{t.applyRange}</button>
            <small id="multi-selection-range-help">{t.rangeHelp}</small>
          </form>

          <div class="selection-toolbar__bulk">
            <button type="button" on:click={() => rotateSelected(-90)}>
              <span aria-hidden="true">↶</span>
              {t.rotateSelectedLeft}
            </button>
            <button type="button" on:click={() => rotateSelected(90)}>
              <span aria-hidden="true">↷</span>
              {t.rotateSelectedRight}
            </button>
            <button type="button" on:click={duplicateSelectedPages}>
              <span aria-hidden="true">⧉</span>
              {t.duplicateSelected}
            </button>
            <button type="button" on:click={() => moveSelectedPages('start')}>
              <span aria-hidden="true">⇤</span>
              {t.moveSelectedStart}
            </button>
            <button type="button" on:click={() => moveSelectedPages('end')}>
              <span aria-hidden="true">⇥</span>
              {t.moveSelectedEnd}
            </button>
            <button type="button" on:click={reversePages}>
              <span aria-hidden="true">⇄</span>
              {t.reversePages}
            </button>
            <button
              class="danger-action"
              type="button"
              disabled={selectedPages.length === 0 || selectedPages.length === visiblePages.length}
              on:click={deleteSelectedPages}
            >
              <span aria-hidden="true">×</span>
              {t.deleteSelected}
            </button>
          </div>

          <div class="selection-toolbar__history">
            <button
              type="button"
              disabled={history.length === 0}
              title={history.length > 0 ? `${t.undo}: ${history.at(-1)?.action}` : t.nothingToUndo}
              on:click={undoLastChange}
            >
              <span aria-hidden="true">↩</span>
              {t.undo}
            </button>
            {#if deletedPages.length > 0}
              <button type="button" on:click={restoreDeletedPages}>
                <span aria-hidden="true">♻</span>
                {t.restoreDeleted} ({deletedPages.length})
              </button>
            {/if}
          </div>
        </header>

        {#if visiblePages.length === 0}
          <p class="multi-tool__empty">{t.noFiles}</p>
        {:else}
          <div class="multi-tool__pages" aria-label={t.title}>
            {#each visiblePages as item, index (item.id)}
              <article
                class:multi-page={true}
                class:multi-page--selected={item.selected}
                class:multi-page--over={dragOverPageId === item.id}
                draggable="true"
                aria-label={`${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                on:dragstart={(event) => onDragStart(event, item.id)}
                on:dragover={(event) => onDragOver(event, item.id)}
                on:drop={(event) => onDrop(event, item.id)}
                on:dragend={() => (dragOverPageId = '')}
              >
                <button
                  class="multi-page__select"
                  type="button"
                  aria-label={`${t.toggleSelected}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                  aria-pressed={item.selected}
                  on:click={() => toggleSelected(item.id)}
                >
                  {item.selected ? '✓' : '+'}
                </button>

                <button
                  class="multi-page__trash"
                  type="button"
                  aria-label={`${t.deletePage}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                  on:click={() => deletePage(item.id)}
                >
                  <span aria-hidden="true">×</span>
                </button>

                <button
                  class="multi-page__zoom"
                  type="button"
                  aria-label={`${t.enlargeThumb}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                  on:click={(event) => openEnlarged(item, event.currentTarget)}
                >
                  <span aria-hidden="true">⛶</span>
                </button>

                <div class="multi-page__thumb-frame" title={t.dragPage}>
                  <div class="multi-page__thumb" style={thumbStyle(item.rotation)}>
                    {#if item.thumbStatus === 'ready' && item.thumbUrl}
                      <img
                        src={item.thumbUrl}
                        alt={`${t.page} ${pageDisplayName(item)} · ${item.fileName}`}
                        loading="lazy"
                      />
                    {:else}
                      <span
                        class:multi-page__placeholder={true}
                        class:multi-page__placeholder--loading={item.thumbStatus === 'pending'}
                        >{pageDisplayName(item)}</span
                      >
                    {/if}
                  </div>
                </div>

                <div class="multi-page__meta">
                  <strong>{t.page} {pageDisplayName(item)}</strong>
                  <span>{item.rotation}°</span>
                </div>
                <small title={item.fileName}>{item.fileName}</small>

                <div class="multi-page__actions">
                  <button
                    type="button"
                    disabled={index === 0}
                    on:click={() => movePage(item.id, -1)}
                    aria-label={`${t.moveBefore}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                    >←</button
                  >
                  <button
                    type="button"
                    on:click={() => rotatePage(item.id, -90)}
                    aria-label={`${t.rotateLeft}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                    >↶</button
                  >
                  <button
                    type="button"
                    on:click={() => rotatePage(item.id, 90)}
                    aria-label={`${t.rotateRight}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                    >↷</button
                  >
                  <button
                    type="button"
                    disabled={index === visiblePages.length - 1}
                    on:click={() => movePage(item.id, 1)}
                    aria-label={`${t.moveAfter}: ${t.page} ${pageDisplayName(item)} · ${item.fileName} · ${index + 1}/${visiblePages.length}`}
                    >→</button
                  >
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>

      <aside class="multi-tool__sidebar" aria-label={t.options}>
        <section class="side-card side-card--primary">
          <h3>{t.output}</h3>
          <strong>{exportPages.length}</strong>
          <p>
            {outputMode === 'selected' ? t.outputSelected : t.outputAll}
          </p>
        </section>

        <section class="side-card">
          <h3>{t.files}</h3>
          <div class="file-chips">
            {#each sources as source}
              {@const selectionStats = sourceSelectionStats.get(source.id)}
              <div class="file-chip" class:has-error={Boolean(source.error)}>
                <span class="file-chip__icon" aria-hidden="true">📄</span>
                <span class="file-chip__copy">
                  <strong title={source.file.name}>{source.file.name}</strong>
                  <small>
                    {#if source.error}
                      {t.fileError}
                    {:else}
                      {selectionStats?.total ?? 0}
                      {pageCountLabel(selectionStats?.total ?? 0)} · {selectionStats?.selected ?? 0}
                      {selectedCountLabel(selectionStats?.selected ?? 0)} · {formatFileSize(
                        source.file.size,
                      )}
                    {/if}
                  </small>
                </span>
                {#if !source.error}
                  <button
                    class="file-chip__select"
                    type="button"
                    disabled={(selectionStats?.total ?? 0) === 0}
                    aria-pressed={selectionStats?.allSelected ?? false}
                    on:click={() => toggleSourceSelection(source.id)}
                    aria-label={`${selectionStats?.allSelected ? t.deselectPdfPages : t.selectPdfPages}: ${source.file.name}`}
                    title={`${selectionStats?.allSelected ? t.deselectPdfPages : t.selectPdfPages}: ${source.file.name}`}
                  >
                    {selectionStats?.allSelected ? '✓' : '+'}
                  </button>
                {/if}
                <button
                  class="file-chip__remove"
                  type="button"
                  on:click={() => removeSource(source.id)}
                  aria-label={`${t.removePdf}: ${source.file.name}`}
                  title={`${t.removePdf}: ${source.file.name}`}
                >
                  ×
                </button>
              </div>
            {/each}
          </div>
        </section>

        {#if interleaveSources.length >= 2}
          <details class="side-card">
            <summary>{t.interleave}</summary>
            <p class="field-help">{t.interleaveHelp}</p>
            <div class="paired-fields">
              <label class="simple-field">
                <span>{t.firstPdf}</span>
                <select bind:value={interleaveFirstId} on:change={syncInterleaveSources}>
                  {#each interleaveSources as source (source.id)}
                    <option value={source.id}>{source.file.name}</option>
                  {/each}
                </select>
              </label>
              <label class="simple-field">
                <span>{t.secondPdf}</span>
                <select bind:value={interleaveSecondId} on:change={syncInterleaveSources}>
                  {#each interleaveSources as source (source.id)}
                    <option value={source.id}>{source.file.name}</option>
                  {/each}
                </select>
              </label>
            </div>
            <label class="toggle-field">
              <input type="checkbox" bind:checked={reverseInterleaveSecond} />
              <span>{t.reverseSecond}</span>
            </label>
            <button
              class="side-card-action"
              type="button"
              disabled={!interleaveFirstId ||
                !interleaveSecondId ||
                interleaveFirstId === interleaveSecondId}
              on:click={interleavePdfPages}
            >
              <span aria-hidden="true">⇆</span>
              {t.interleaveAction}
            </button>
          </details>
        {/if}

        <section class="side-card">
          <h3 id="multi-output-title">{t.output}</h3>
          <div class="segmented-control" role="radiogroup" aria-labelledby="multi-output-title">
            <label>
              <input
                type="radio"
                bind:group={outputMode}
                value="all"
                on:change={invalidateResult}
              />
              <span>{t.outputAll}</span>
            </label>
            <label>
              <input
                type="radio"
                bind:group={outputMode}
                value="selected"
                on:change={invalidateResult}
              />
              <span>{t.outputSelected}</span>
            </label>
          </div>
          <p class="field-help" aria-live="polite">
            {outputMode === 'selected' ? t.outputHelpSelected : t.outputHelpAll}
          </p>
          <label class="simple-field">
            <span>{t.outputFileName}</span>
            <input
              class="text-input"
              type="text"
              bind:value={outputFileName}
              maxlength="120"
              autocomplete="off"
            />
            <small>{t.outputFileHelp}</small>
          </label>
        </section>

        <details class="side-card">
          <summary>{t.addText}</summary>
          <label class="simple-field">
            <span>{t.addText}</span>
            <select bind:value={textMode} on:change={invalidateResult}>
              <option value="none">{lang === 'es' ? 'No' : 'None'}</option>
              <option value="all">{t.outputAll}</option>
              <option value="selected">{t.outputSelected}</option>
            </select>
          </label>
          {#if textMode !== 'none'}
            <label class="simple-field">
              <span>{t.textLabel}</span>
              <input
                class="text-input"
                bind:value={textValue}
                placeholder={t.textPlaceholder}
                on:input={invalidateResult}
              />
            </label>
            <label class="simple-field">
              <span>{t.textPosition}</span>
              <select bind:value={textPosition} on:change={invalidateResult}>
                {#each Object.entries(t.textPositions) as [value, label] (value)}
                  <option {value}>{label}</option>
                {/each}
              </select>
            </label>
            <label class="range-field">
              <span>{lang === 'es' ? 'Tamaño' : 'Size'}: {textSize}</span>
              <input
                type="range"
                min="12"
                max="90"
                bind:value={textSize}
                on:input={invalidateResult}
              />
            </label>
            <label class="range-field">
              <span
                >{lang === 'es' ? 'Opacidad' : 'Opacity'}: {Math.round(
                  Number(textOpacity) * 100,
                )}%</span
              >
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                bind:value={textOpacity}
                on:input={invalidateResult}
              />
            </label>
          {/if}
        </details>

        <details class="side-card">
          <summary>{t.pageNumbers}</summary>
          <label class="toggle-field">
            <input type="checkbox" bind:checked={numberingEnabled} on:change={invalidateResult} />
            <span>{t.pageNumbers}</span>
          </label>
          {#if numberingEnabled}
            <label class="simple-field">
              <span>{t.numberFormat}</span>
              <input
                class="text-input"
                type="text"
                bind:value={numberFormat}
                on:input={invalidateResult}
              />
              <small>{t.numberFormatHelp}</small>
            </label>
            <label class="simple-field">
              <span>{t.numberPosition}</span>
              <select bind:value={numberPosition} on:change={invalidateResult}>
                {#each Object.entries(t.numberPositions) as [value, label] (value)}
                  <option {value}>{label}</option>
                {/each}
              </select>
            </label>
            <label class="range-field">
              <span>{lang === 'es' ? 'Tamaño' : 'Size'}: {numberSize}</span>
              <input
                type="range"
                min="8"
                max="24"
                bind:value={numberSize}
                on:input={invalidateResult}
              />
            </label>
          {/if}
        </details>

        <div class="side-actions">
          <button
            class="primary-action"
            type="button"
            disabled={!canGenerate}
            on:click={generatePdf}
            ><span aria-hidden="true">⚡</span> {isGenerating ? t.generating : t.generate}</button
          >
          <button class="ghost-action" type="button" on:click={() => clearTool(true)}>
            <span aria-hidden="true">🧹</span>
            {t.clear}
          </button>
        </div>

        {#if resultBytes}
          <ResultState
            title={t.readyTitle}
            description={t.ready}
            eyebrow={t.completedEyebrow}
            fileName={downloadName}
            fileSize={formatFileSize(resultBytes.byteLength)}
            downloadUrl={previewUrl}
            {downloadName}
            downloadLabel={t.download}
            privacyText={t.privacyResult}
          />
        {/if}
      </aside>
    </div>

    {#if showMobileAction}
      <div class="mobile-generate">
        <span><strong>{exportPages.length}</strong> {pageCountLabel(exportPages.length)}</span>
        <button type="button" disabled={!canGenerate} on:click={generatePdf}>
          <span aria-hidden="true">⚡</span>
          {isGenerating ? t.generating : t.generate}
        </button>
      </div>
    {/if}
  {/if}
</section>

<div class="multi-tool-modal-theme">
  <PdfResultModal
    open={isPreviewOpen && Boolean(previewUrl)}
    pdfUrl={previewUrl}
    filename={downloadName}
    title={t.previewTitle}
    description={t.ready}
    downloadLabel={t.download}
    closeLabel={t.closePreview}
    openLabel={t.openPreview}
    on:close={closePreview}
  />
</div>

{#if enlargedPage}
  <div class="thumb-modal" role="presentation" on:click|self={() => closeEnlarged()}>
    <div
      bind:this={enlargedDialog}
      class="thumb-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thumb-modal-title"
      aria-describedby="thumb-modal-description"
    >
      <header>
        <div>
          <span>{t.enlargedTitle}</span>
          <h3 id="thumb-modal-title">{t.page} {pageDisplayName(enlargedPage)}</h3>
          <p id="thumb-modal-description">{enlargedPage.fileName}</p>
        </div>

        <div class="thumb-modal__zoom-controls">
          <button
            type="button"
            on:click={() => setEnlargedZoom(enlargedZoom - 0.25)}
            aria-label={t.zoomOut}>−</button
          >
          <label>
            <span>Zoom · {Math.round(enlargedZoom * 100)}%</span>
            <input
              type="range"
              min="50"
              max="400"
              step="25"
              value={Math.round(enlargedZoom * 100)}
              aria-valuetext={`${Math.round(enlargedZoom * 100)}%`}
              on:input={(event) => setEnlargedZoom(Number(event.currentTarget.value) / 100)}
            />
          </label>
          <button
            type="button"
            on:click={() => setEnlargedZoom(enlargedZoom + 0.25)}
            aria-label={t.zoomIn}>+</button
          >
          <button type="button" on:click={() => setEnlargedZoom(1)} aria-label={t.resetZoom}
            >100%</button
          >
        </div>

        <button
          bind:this={enlargedCloseButton}
          class="thumb-modal__close"
          type="button"
          on:click={() => closeEnlarged()}
          aria-label={t.closeEnlarged}>×</button
        >
      </header>
      <div class="thumb-modal__body">
        {#if enlargedPage.thumbUrl}
          <img
            src={enlargedPage.thumbUrl}
            alt={`${t.page} ${pageDisplayName(enlargedPage)} · ${enlargedPage.fileName}`}
            style={enlargedThumbStyle(enlargedPage.rotation)}
          />
        {:else}
          <p>{t.thumbNotReady}</p>
        {/if}
      </div>
      <footer class="thumb-modal__navigation">
        <button
          type="button"
          disabled={enlargedIndex <= 0}
          aria-label={t.previousPage}
          on:click={() => navigateEnlarged(-1)}
        >
          <span aria-hidden="true">←</span>
          <span class="thumb-modal__navigation-label">{t.previousPage}</span>
        </button>
        <strong>{Math.max(0, enlargedIndex + 1)} / {visiblePages.length}</strong>
        <button
          type="button"
          disabled={enlargedIndex < 0 || enlargedIndex >= visiblePages.length - 1}
          aria-label={t.nextPage}
          on:click={() => navigateEnlarged(1)}
        >
          <span class="thumb-modal__navigation-label">{t.nextPage}</span>
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .multi-tool {
    --multi-filled-start: #1d4ed8;
    --multi-filled-end: #6d28d9;
    --multi-on-filled: #fff;
    --color-primary-filled: var(--multi-filled-start);
    --color-primary-filled-hover: #1e40af;
    --color-secondary-filled: var(--multi-filled-end);
    --color-on-filled: var(--multi-on-filled);
    display: grid;
    gap: 20px;
    margin: 28px 0 56px;
    padding: clamp(16px, 3vw, 26px);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at top left,
        color-mix(in srgb, var(--color-primary, #2563eb) 14%, transparent),
        transparent 28rem
      ),
      var(--color-surface-raised, #fff);
    box-shadow: var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.08));
  }

  .multi-tool-modal-theme {
    --color-primary-filled: #1d4ed8;
    --color-primary-filled-hover: #1e40af;
    --color-secondary-filled: #6d28d9;
    --color-on-filled: #fff;
  }
  .multi-tool__hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
  }
  .multi-tool__hero h2 {
    margin: 0 0 6px;
    font-size: clamp(1.7rem, 3vw, 2.45rem);
    letter-spacing: -0.045em;
  }
  .multi-tool__hero p,
  .multi-tool__empty {
    margin: 0;
    color: var(--color-text-muted, #475569);
  }
  .multi-tool__eyebrow {
    display: inline-flex;
    margin-bottom: 10px;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--color-primary-soft, #dbeafe);
    color: var(--color-primary, #2563eb);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .multi-tool__stats {
    display: grid;
    min-width: 170px;
    gap: 2px;
    padding: 14px 16px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 22px;
    background: var(--color-surface, #fff);
    text-align: right;
  }
  .multi-tool__stats strong {
    font-size: 2rem;
    line-height: 1;
  }
  .multi-tool__stats span,
  .multi-tool__stats small {
    color: var(--color-text-muted, #475569);
    font-weight: 800;
  }
  .multi-tool__message,
  .multi-tool__empty {
    padding: 13px 15px;
    border-radius: 16px;
    background: var(--color-surface-soft, #f1f5f9);
    font-weight: 850;
  }
  .multi-tool__message {
    margin: 0;
  }
  .multi-tool__message--error {
    background: var(--color-danger-soft, #fee2e2);
    color: var(--color-danger, #dc2626);
  }
  .multi-tool__message--success {
    background: var(--color-success-soft, #dcfce7);
    color: var(--color-success, #16a34a);
  }
  .multi-tool__workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 18px;
    align-items: start;
  }
  .multi-tool__sidebar {
    position: sticky;
    top: calc(4.6rem + 18px);
    display: grid;
    gap: 12px;
    max-height: calc(100dvh - 4.6rem - 36px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
    scrollbar-gutter: stable;
  }
  .side-card {
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 20px;
    background: var(--color-surface, #fff);
    box-shadow: var(--shadow-xs, 0 1px 2px rgb(15 23 42 / 0.06));
  }
  .side-card h3,
  .side-card p {
    margin: 0;
  }
  .side-card h3 {
    font-size: 0.86rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted, #475569);
  }
  .side-card--primary {
    background: linear-gradient(135deg, var(--multi-filled-start), var(--multi-filled-end));
    color: var(--multi-on-filled);
  }
  .side-card--primary h3,
  .side-card--primary p {
    color: rgb(255 255 255 / 0.84);
  }
  .side-card--primary strong {
    font-size: 2.1rem;
    line-height: 1;
  }
  .file-chips {
    display: grid;
    gap: 7px;
  }
  .file-chips button {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    width: 100%;
    padding: 8px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 14px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text, #0f172a);
    cursor: pointer;
    text-align: left;
  }
  .file-chips strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.85rem;
  }
  .file-chips small {
    font-weight: 900;
  }
  .file-chips .has-error {
    background: var(--color-danger-soft, #fee2e2);
    color: var(--color-danger, #dc2626);
  }
  .segmented-control {
    display: grid;
    grid-template-columns: 1fr;
    gap: 7px;
  }
  .segmented-control label {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 9px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 14px;
    cursor: pointer;
    font-weight: 850;
  }
  .side-actions button {
    min-height: 40px;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
    font-weight: 900;
  }
  .side-card summary {
    cursor: pointer;
    font-weight: 900;
    color: var(--color-text, #0f172a);
  }
  .simple-field,
  .range-field {
    display: grid;
    gap: 6px;
    color: var(--color-text-muted, #475569);
    font-size: 0.88rem;
    font-weight: 800;
  }
  .simple-field select,
  .text-input {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    background: var(--color-surface, #fff);
    color: var(--color-text, #0f172a);
  }
  .side-actions {
    display: grid;
    gap: 9px;
  }
  .primary-action {
    background: linear-gradient(135deg, var(--multi-filled-start), var(--multi-filled-end));
    color: var(--multi-on-filled);
    box-shadow: var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.08));
  }
  .ghost-action {
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text, #0f172a);
  }
  .side-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .multi-tool__pages {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
    gap: 14px;
  }
  .multi-page {
    position: relative;
    display: grid;
    gap: 9px;
    padding: 10px;
    border: 2px solid var(--color-border, #e2e8f0);
    border-radius: 22px;
    background: var(--color-surface, #fff);
    box-shadow: var(--shadow-xs, 0 1px 2px rgb(15 23 42 / 0.06));
    cursor: grab;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  .multi-page:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.08));
  }
  .multi-page:active {
    cursor: grabbing;
  }
  .multi-page--selected {
    border-color: var(--color-primary, #2563eb);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--color-primary, #2563eb) 16%, transparent),
      var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.08));
  }
  .multi-page--over {
    border-color: var(--color-secondary, #7c3aed);
    transform: scale(0.98);
  }
  .multi-page__select,
  .multi-page__trash,
  .multi-page__zoom {
    position: absolute;
    z-index: 2;
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 950;
    box-shadow: var(--shadow-sm, 0 4px 12px rgb(15 23 42 / 0.14));
  }
  .multi-page__select {
    top: 9px;
    left: 9px;
    background: var(--multi-filled-start);
    color: var(--multi-on-filled);
  }
  .multi-page__trash {
    top: 9px;
    right: 9px;
    background: var(--color-danger-soft, #fee2e2);
    color: var(--color-danger, #dc2626);
  }
  .multi-page__zoom {
    right: 9px;
    bottom: 88px;
    background: var(--color-surface, #fff);
    color: var(--color-text, #0f172a);
    border: 1px solid var(--color-border, #e2e8f0);
  }
  .multi-page__zoom:hover,
  .multi-page__zoom:focus-visible {
    border-color: var(--color-primary, #2563eb);
    color: var(--color-primary, #2563eb);
    outline: 3px solid color-mix(in srgb, var(--color-primary, #2563eb) 18%, transparent);
    outline-offset: 2px;
  }
  .multi-page__thumb-frame {
    display: grid;
    min-height: 225px;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 16px;
    background: linear-gradient(
      135deg,
      var(--color-surface-soft, #f1f5f9),
      var(--color-surface, #fff)
    );
  }
  .multi-page__thumb {
    display: grid;
    width: 84%;
    place-items: center;
    transition: transform 180ms ease;
  }
  .multi-page__thumb img {
    display: block;
    width: 100%;
    height: auto;
    box-shadow: 0 12px 26px rgb(15 23 42 / 0.16);
    pointer-events: none;
  }
  .multi-page__placeholder {
    display: grid;
    width: 100%;
    min-height: 150px;
    place-items: center;
    border-radius: 12px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text-soft, #64748b);
    font-size: 1.35rem;
    font-weight: 950;
  }
  .multi-page__placeholder--loading {
    background: linear-gradient(100deg, #f1f5f9 20%, #fff 45%, #f1f5f9 70%);
    background-size: 220% 100%;
    animation: thumb-loading 1.4s ease-in-out infinite;
  }
  .multi-page__meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
  }
  .multi-page__meta span {
    padding: 5px 9px;
    border-radius: 999px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text-muted, #475569);
    font-weight: 950;
    font-size: 0.82rem;
  }
  .multi-page small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-muted, #475569);
    font-size: 0.78rem;
  }
  .multi-page__actions {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 7px;
    align-items: center;
  }
  .multi-page__actions button {
    display: grid;
    min-height: 36px;
    place-items: center;
    border: 0;
    border-radius: 999px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text, #0f172a);
    font: inherit;
    font-weight: 950;
  }
  .multi-page__actions button {
    cursor: pointer;
  }
  .thumb-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(15 23 42 / 0.72);
    backdrop-filter: blur(10px);
  }
  .thumb-modal__panel {
    display: grid;
    gap: 1rem;
    width: min(100%, 52rem);
    max-height: 92vh;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    border: 1px solid color-mix(in srgb, var(--color-border, #e2e8f0) 55%, transparent);
    border-radius: var(--radius-2xl, 1.5rem);
    background: var(--color-surface, #fff);
    box-shadow: var(--shadow-lg, 0 24px 60px rgb(15 23 42 / 0.16));
  }
  .thumb-modal__panel header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }
  .thumb-modal__panel header span {
    color: var(--color-text-muted, #475569);
    font-size: 0.8rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .thumb-modal__panel h3,
  .thumb-modal__panel p {
    margin: 0;
  }
  .thumb-modal__panel p {
    color: var(--color-text-muted, #475569);
    font-size: 0.9rem;
    font-weight: 750;
  }
  .thumb-modal__panel button {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 0;
    border-radius: 999px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text, #0f172a);
    cursor: pointer;
    font: inherit;
    font-size: 1.5rem;
    font-weight: 900;
  }
  .thumb-modal__body {
    display: grid;
    place-items: center;
    overflow: auto;
  }
  .thumb-modal__body img {
    display: block;
    width: auto;
    max-width: 100%;
    max-height: 72vh;
    border-radius: var(--radius-lg, 1rem);
    background: #fff;
    box-shadow: 0 20px 55px rgb(15 23 42 / 0.26);
  }
  .thumb-modal__body p {
    padding: 1rem;
    color: var(--color-text-muted, #475569);
    font-weight: 800;
  }
  @keyframes thumb-loading {
    0% {
      background-position: 120% 0;
    }
    100% {
      background-position: -120% 0;
    }
  }
  @media (max-width: 980px) {
    .multi-tool__hero,
    .multi-tool__workspace {
      display: grid;
      grid-template-columns: 1fr;
    }
    .multi-tool__sidebar {
      position: static;
      max-height: none;
      overflow: visible;
      padding-right: 0;
      scrollbar-gutter: auto;
    }
    .multi-tool__stats {
      text-align: left;
    }
    .multi-tool__pages {
      grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
    }
    .multi-page__thumb-frame {
      min-height: 180px;
    }
    .multi-page__zoom {
      bottom: 96px;
    }
  }
  @media (max-width: 520px) {
    .multi-tool {
      padding: 14px;
      border-radius: 22px;
    }
    .multi-tool__pages {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .multi-page {
      padding: 8px;
      border-radius: 18px;
    }
    .multi-page__thumb-frame {
      min-height: 150px;
    }
    .multi-page__select,
    .multi-page__trash,
    .multi-page__zoom {
      width: 30px;
      height: 30px;
    }
  }

  .multi-tool *,
  .multi-tool *::before,
  .multi-tool *::after {
    box-sizing: border-box;
  }

  .multi-tool__workspace,
  .multi-tool__sidebar,
  .multi-tool__canvas,
  .multi-tool__pages {
    min-width: 0;
  }

  .file-chip {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    gap: 9px;
    align-items: center;
    min-height: 52px;
    padding: 7px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 14px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text, #0f172a);
  }

  .file-chip.has-error {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .file-chip__icon {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 10px;
    background: var(--color-surface, #fff);
  }

  .file-chip__copy {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  .file-chip__copy strong,
  .file-chip__copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-chip__copy strong {
    font-size: 0.84rem;
  }

  .file-chip__copy small {
    color: var(--color-text-muted, #475569);
    font-size: 0.73rem;
    font-weight: 750;
  }

  .file-chip > button {
    display: grid;
    width: 44px;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 999px;
    background: var(--color-surface, #fff);
    color: var(--color-danger, #dc2626);
    cursor: pointer;
    font: inherit;
    font-size: 1.25rem;
    font-weight: 900;
  }

  .file-chip > .file-chip__select {
    color: var(--color-primary, #2563eb);
  }

  .file-chip > .file-chip__remove {
    color: var(--color-danger, #dc2626);
  }

  .field-help,
  .simple-field small {
    margin: 0;
    color: var(--color-text-soft, #64748b);
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.4;
  }

  .simple-field select,
  .simple-field input,
  .text-input {
    font: inherit;
  }

  .paired-fields {
    display: grid;
    gap: 9px;
  }

  .side-card-action {
    display: inline-flex;
    min-height: 44px;
    gap: 8px;
    align-items: center;
    justify-content: center;
    padding: 9px 12px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    background: var(--color-primary-soft, #dbeafe);
    color: var(--color-primary, #2563eb);
    cursor: pointer;
    font: inherit;
    font-weight: 850;
  }

  .side-card-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .toggle-field {
    display: flex;
    min-height: 44px;
    gap: 9px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 14px;
    color: var(--color-text, #0f172a);
    cursor: pointer;
    font-weight: 850;
  }

  .toggle-field input,
  .segmented-control input {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary, #2563eb);
  }

  .segmented-control label {
    min-height: 44px;
    transition:
      border-color var(--transition-fast, 120ms ease),
      background-color var(--transition-fast, 120ms ease);
  }

  .segmented-control label:has(input:checked) {
    border-color: var(--color-primary, #2563eb);
    background: var(--color-primary-soft, #dbeafe);
    color: var(--color-primary, #2563eb);
  }

  details.side-card[open] summary {
    margin-bottom: 2px;
  }

  .multi-tool__canvas {
    display: grid;
    gap: 14px;
  }

  .selection-toolbar {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 20px;
    background: var(--color-surface, #fff);
    box-shadow: var(--shadow-xs, 0 1px 2px rgb(15 23 42 / 0.06));
  }

  .selection-toolbar__heading {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
  }

  .selection-toolbar h3,
  .selection-toolbar p {
    margin: 0;
  }

  .selection-toolbar h3 {
    color: var(--color-text, #0f172a);
    font-size: 1rem;
  }

  .selection-toolbar p {
    margin-top: 3px;
    color: var(--color-text-muted, #475569);
    font-size: 0.82rem;
  }

  .selection-toolbar__heading > strong {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--color-primary-soft, #dbeafe);
    color: var(--color-primary, #2563eb);
    white-space: nowrap;
  }

  .selection-toolbar__quick,
  .selection-toolbar__bulk,
  .selection-toolbar__history {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .selection-toolbar button,
  .selection-toolbar__range input,
  .selection-toolbar__range select {
    min-height: 44px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 12px;
    background: var(--color-surface-soft, #f1f5f9);
    color: var(--color-text, #0f172a);
    font: inherit;
  }

  .selection-toolbar button {
    padding: 8px 11px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 850;
  }

  .selection-toolbar button:disabled,
  .multi-page__actions button:disabled,
  .thumb-modal__panel button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .selection-toolbar__bulk {
    padding-top: 10px;
    border-top: 1px solid var(--color-border, #e2e8f0);
  }

  .selection-toolbar .danger-action {
    background: var(--color-danger-soft, #fee2e2);
    color: var(--color-danger, #dc2626);
  }

  .selection-toolbar__history button {
    background: var(--color-primary-soft, #dbeafe);
    color: var(--color-primary, #2563eb);
  }

  .selection-toolbar__range {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(150px, 0.6fr) auto;
    gap: 7px;
    align-items: end;
  }

  .selection-toolbar__range label {
    display: grid;
    min-width: 0;
    gap: 5px;
    color: var(--color-text-muted, #475569);
    font-size: 0.8rem;
    font-weight: 800;
  }

  .selection-toolbar__range input {
    width: 100%;
    padding: 8px 10px;
  }

  .selection-toolbar__range select {
    width: 100%;
    padding: 8px 10px;
  }

  .selection-toolbar__range small {
    grid-column: 1 / -1;
    color: var(--color-text-soft, #64748b);
    font-size: 0.75rem;
  }

  .mobile-generate {
    display: none;
  }

  .multi-page {
    cursor: default;
  }

  .multi-page__thumb-frame {
    cursor: grab;
  }

  .multi-page--over {
    border-color: var(--color-secondary, #7c3aed);
    box-shadow:
      0 0 0 5px color-mix(in srgb, var(--color-secondary, #7c3aed) 18%, transparent),
      var(--shadow-md, 0 12px 32px rgb(15 23 42 / 0.12));
    transform: translateY(-4px) scale(1.015);
  }

  .multi-page__select,
  .multi-page__trash,
  .multi-page__zoom {
    width: 44px;
    height: 44px;
  }

  .multi-page__trash {
    font-size: 1.35rem;
  }

  .multi-page__zoom {
    bottom: 92px;
  }

  .multi-page__actions {
    grid-template-columns: repeat(4, 1fr);
  }

  .multi-page__actions button {
    min-width: 0;
    min-height: 44px;
  }

  .side-actions button {
    min-height: 44px;
  }

  .multi-page__placeholder--loading {
    background: linear-gradient(
      100deg,
      var(--color-surface-soft, #f1f5f9) 20%,
      var(--color-surface, #fff) 45%,
      var(--color-surface-soft, #f1f5f9) 70%
    );
    background-size: 220% 100%;
  }

  .multi-tool button:focus-visible,
  .multi-tool input:focus-visible,
  .multi-tool select:focus-visible,
  .multi-tool summary:focus-visible,
  .thumb-modal button:focus-visible,
  .thumb-modal input:focus-visible {
    outline: 3px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }

  .simple-field input:focus-visible,
  .simple-field select:focus-visible,
  .selection-toolbar__range input:focus-visible,
  .selection-toolbar__range select:focus-visible {
    border-color: var(--color-primary, #2563eb);
    box-shadow: 0 0 0 3px var(--color-primary-soft, #dbeafe);
  }

  .thumb-modal {
    z-index: var(--z-modal, 80);
    padding: clamp(8px, 2vw, 20px);
  }

  .thumb-modal__panel {
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: min(96vw, 1120px);
    height: min(94vh, 820px);
    max-height: 94vh;
  }

  .thumb-modal__panel header {
    align-items: center;
    flex-wrap: wrap;
  }

  .thumb-modal__panel header > div:first-child {
    min-width: min(100%, 220px);
    flex: 1 1 220px;
  }

  .thumb-modal__zoom-controls {
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 999px;
    background: var(--color-surface-soft, #f1f5f9);
  }

  .thumb-modal__zoom-controls label {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .thumb-modal__zoom-controls label span {
    font-size: 0.72rem;
  }

  .thumb-modal__zoom-controls input {
    width: min(18vw, 150px);
    accent-color: var(--color-primary, #2563eb);
  }

  .thumb-modal__panel .thumb-modal__zoom-controls button,
  .thumb-modal__panel .thumb-modal__close,
  .thumb-modal__navigation button {
    width: auto;
    min-width: 44px;
    height: 44px;
    min-height: 44px;
    padding: 0 12px;
    font-size: 0.9rem;
  }

  .thumb-modal__panel .thumb-modal__close {
    padding: 0;
    font-size: 1.5rem;
  }

  .thumb-modal__body {
    min-height: 0;
    padding: 12px;
    border-radius: 16px;
    background: var(--color-surface-soft, #f1f5f9);
  }

  .thumb-modal__body img {
    transform-origin: center;
    transition: transform var(--transition-base, 180ms ease);
  }

  .thumb-modal__navigation {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    align-items: center;
  }

  .thumb-modal__navigation strong {
    min-width: 72px;
    color: var(--color-text-muted, #475569);
    text-align: center;
  }

  .thumb-modal__navigation button:first-child {
    justify-self: start;
  }

  .thumb-modal__navigation button {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
  }

  .thumb-modal__navigation button:last-child {
    justify-self: end;
  }

  @media (max-width: 980px) {
    .multi-tool--has-files {
      padding-bottom: 92px;
    }

    .multi-tool__workspace {
      gap: 14px;
    }

    .multi-tool__sidebar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .side-actions,
    .multi-tool__sidebar > :global(.result-state) {
      grid-column: 1 / -1;
    }

    .side-actions .primary-action {
      display: none;
    }

    .mobile-generate {
      position: fixed;
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      left: max(12px, env(safe-area-inset-left));
      z-index: var(--z-header, 40);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      width: min(calc(100% - 24px), 720px);
      min-height: 66px;
      margin-inline: auto;
      padding: 9px 10px 9px 16px;
      border: 1px solid color-mix(in srgb, var(--color-border, #e2e8f0) 70%, transparent);
      border-radius: 20px;
      background: color-mix(in srgb, var(--color-surface, #fff) 94%, transparent);
      color: var(--color-text, #0f172a);
      box-shadow: var(--shadow-lg, 0 24px 60px rgb(15 23 42 / 0.16));
      backdrop-filter: blur(14px);
    }

    .mobile-generate > span {
      display: grid;
      color: var(--color-text-muted, #475569);
      font-size: 0.75rem;
      font-weight: 800;
    }

    .mobile-generate > span strong {
      color: var(--color-text, #0f172a);
      font-size: 1.2rem;
      line-height: 1;
    }

    .mobile-generate button {
      min-height: 48px;
      padding: 10px 16px;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--multi-filled-start), var(--multi-filled-end));
      color: var(--multi-on-filled);
      cursor: pointer;
      font: inherit;
      font-weight: 900;
    }

    .mobile-generate button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  @media (max-width: 680px) {
    .multi-tool__sidebar {
      grid-template-columns: 1fr;
    }

    .selection-toolbar__heading {
      align-items: center;
    }

    .selection-toolbar__quick,
    .selection-toolbar__bulk {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .selection-toolbar__range {
      grid-template-columns: 1fr;
    }

    .selection-toolbar__quick button,
    .selection-toolbar__bulk button {
      width: 100%;
    }

    .multi-tool__pages {
      grid-template-columns: repeat(auto-fill, minmax(min(145px, 100%), 1fr));
    }

    .multi-page__select,
    .multi-page__trash,
    .multi-page__zoom {
      width: 44px;
      height: 44px;
    }

    .thumb-modal__panel {
      height: 96vh;
      max-height: 96vh;
    }

    .thumb-modal__zoom-controls {
      order: 3;
      width: 100%;
      justify-content: center;
      border-radius: 14px;
    }

    .thumb-modal__zoom-controls input {
      width: min(30vw, 130px);
    }
  }

  @media (max-width: 420px) {
    .multi-tool {
      padding: 12px;
    }

    .multi-tool__stats {
      min-width: 0;
      width: 100%;
    }

    .selection-toolbar__range {
      grid-template-columns: 1fr;
    }

    .selection-toolbar__range small {
      grid-column: 1;
    }

    .selection-toolbar__history {
      display: grid;
      grid-template-columns: 1fr;
    }

    .mobile-generate > span {
      display: none;
    }

    .mobile-generate button {
      width: 100%;
    }

    .thumb-modal {
      padding: 6px;
    }

    .thumb-modal__panel {
      width: calc(100vw - 12px);
      height: calc(100dvh - 12px);
      max-height: calc(100dvh - 12px);
      gap: 10px;
      padding: 10px;
    }

    .thumb-modal__zoom-controls {
      display: grid;
      grid-template-columns: 44px minmax(64px, 1fr) 44px 58px;
      gap: 4px;
      padding: 3px;
    }

    .thumb-modal__zoom-controls label {
      display: grid;
      min-width: 0;
      gap: 1px;
    }

    .thumb-modal__zoom-controls label span {
      overflow: hidden;
      font-size: 0.65rem;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .thumb-modal__zoom-controls input {
      width: 100%;
      min-width: 0;
    }

    .thumb-modal__panel .thumb-modal__zoom-controls button {
      min-width: 44px;
      padding-inline: 4px;
      font-size: 0.78rem;
    }

    .thumb-modal__navigation {
      grid-template-columns: 44px minmax(0, 1fr) 44px;
      gap: 6px;
    }

    .thumb-modal__navigation button {
      width: 44px;
      padding: 0;
      font-size: 1rem;
    }

    .thumb-modal__navigation-label {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .multi-page,
    .multi-page__thumb,
    .thumb-modal__body img {
      transition: none;
    }
    .multi-page__placeholder--loading {
      animation: none;
    }
    .thumb-modal {
      backdrop-filter: none;
    }

    .mobile-generate {
      backdrop-filter: none;
    }
  }
</style>
