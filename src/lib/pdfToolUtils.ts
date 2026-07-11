export interface PdfToolLimitOptions {
  maxFileSize?: number;
  maxTotalSize?: number;
  maxFiles?: number;
}

export interface PdfToolValidationResult {
  validFiles: File[];
  errors: string[];
  totalSize: number;
}

export const DEFAULT_PDF_TOOL_LIMITS = {
  maxFileSize: 75 * 1024 * 1024,
  maxTotalSize: 180 * 1024 * 1024,
  maxFiles: 30,
} as const;

export const PDF_TOOL_ERROR_MESSAGES = {
  es: {
    invalidType: 'Solo se admiten archivos PDF válidos.',
    emptyFile: 'El archivo está vacío y no se puede procesar.',
    fileTooLarge: (size: string, limit: string) =>
      `El archivo pesa ${size}. El límite recomendado para esta herramienta es ${limit}.`,
    tooManyFiles: (limit: number) =>
      `Has seleccionado demasiados archivos. El límite recomendado es ${limit}.`,
    totalTooLarge: (size: string, limit: string) =>
      `El conjunto de archivos pesa ${size}. Reduce la selección por debajo de ${limit}.`,
    password: 'El PDF está protegido con contraseña o no permite esta operación en navegador.',
    damaged: 'El PDF parece estar dañado o no tiene un formato válido.',
    memory:
      'El navegador no tiene memoria suficiente para completar la operación. Prueba con un PDF más pequeño o divide el trabajo en varios pasos.',
    unsupported:
      'Tu navegador no permite completar esta operación. Actualízalo o prueba con otro navegador moderno.',
    unknown:
      'No se pudo completar la operación. Revisa que el PDF no esté dañado, protegido o sea demasiado grande.',
  },
  en: {
    invalidType: 'Only valid PDF files are supported.',
    emptyFile: 'The file is empty and cannot be processed.',
    fileTooLarge: (size: string, limit: string) =>
      `The file is ${size}. The recommended limit for this tool is ${limit}.`,
    tooManyFiles: (limit: number) =>
      `You selected too many files. The recommended limit is ${limit}.`,
    totalTooLarge: (size: string, limit: string) =>
      `The selected files are ${size}. Reduce the selection below ${limit}.`,
    password: 'The PDF is password-protected or does not allow this browser operation.',
    damaged: 'The PDF seems to be damaged or is not a valid PDF file.',
    memory:
      'The browser does not have enough memory to complete the operation. Try a smaller PDF or split the work in several steps.',
    unsupported:
      'Your browser cannot complete this operation. Update it or try another modern browser.',
    unknown:
      'The operation could not be completed. Check that the PDF is not damaged, protected or too large.',
  },
} as const;

export type PdfToolLang = keyof typeof PDF_TOOL_ERROR_MESSAGES;

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function getPdfToolLimits(options: PdfToolLimitOptions = {}) {
  return {
    maxFileSize: options.maxFileSize ?? DEFAULT_PDF_TOOL_LIMITS.maxFileSize,
    maxTotalSize: options.maxTotalSize ?? DEFAULT_PDF_TOOL_LIMITS.maxTotalSize,
    maxFiles: options.maxFiles ?? DEFAULT_PDF_TOOL_LIMITS.maxFiles,
  };
}

export function validatePdfFiles(
  files: File[],
  options: PdfToolLimitOptions = {},
  lang: PdfToolLang = 'es',
): PdfToolValidationResult {
  const limits = getPdfToolLimits(options);
  const messages = PDF_TOOL_ERROR_MESSAGES[lang] ?? PDF_TOOL_ERROR_MESSAGES.es;
  const errors = new Set<string>();
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (files.length > limits.maxFiles) {
    errors.add(messages.tooManyFiles(limits.maxFiles));
  }

  if (totalSize > limits.maxTotalSize) {
    errors.add(
      messages.totalTooLarge(formatFileSize(totalSize), formatFileSize(limits.maxTotalSize)),
    );
  }

  const validFiles = files.filter((file) => {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (!isPdf) {
      errors.add(messages.invalidType);
      return false;
    }

    if (file.size <= 0) {
      errors.add(messages.emptyFile);
      return false;
    }

    if (file.size > limits.maxFileSize) {
      errors.add(
        messages.fileTooLarge(formatFileSize(file.size), formatFileSize(limits.maxFileSize)),
      );
      return false;
    }

    return true;
  });

  return {
    validFiles,
    errors: [...errors],
    totalSize,
  };
}

export function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.requestIdleCallback?.(() => resolve(), { timeout: 120 }) ??
      window.setTimeout(resolve, 0);
  });
}

export function createPdfObjectUrl(bytes: Uint8Array | ArrayBuffer | Blob) {
  const blob =
    bytes instanceof Blob
      ? bytes
      : new Blob([bytes instanceof Uint8Array ? (bytes.slice().buffer as ArrayBuffer) : bytes], {
          type: 'application/pdf',
        });
  return URL.createObjectURL(blob);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getPdfBaseFilename(file: File | null, fallback = 'documento') {
  if (!file?.name) return fallback;
  return file.name.replace(/\.pdf$/i, '').trim() || fallback;
}

export function getFriendlyPdfError(
  error: unknown,
  fallback: string = PDF_TOOL_ERROR_MESSAGES.es.unknown,
  lang: PdfToolLang = 'es',
) {
  const messages = PDF_TOOL_ERROR_MESSAGES[lang] ?? PDF_TOOL_ERROR_MESSAGES.es;

  if (error instanceof DOMException) {
    if (/quota|memory|allocation/i.test(`${error.name} ${error.message}`)) return messages.memory;
    if (/notallowed|security|unsupported/i.test(`${error.name} ${error.message}`))
      return messages.unsupported;
  }

  if (error instanceof Error) {
    const text = `${error.name} ${error.message}`;

    if (/password|encrypted|encrypt/i.test(text)) return messages.password;
    if (/invalid|corrupt|damaged|parse|xref|trailer|eof/i.test(text)) return messages.damaged;
    if (/memory|allocation|out of/i.test(text)) return messages.memory;
    if (/unsupported|not supported|not implemented/i.test(text)) return messages.unsupported;

    return error.message || fallback;
  }

  return fallback || messages.unknown;
}
