import type { Lang } from '../i18n/ui';

export type ToolStatus = 'available' | 'soon' | 'beta' | 'guide';
export type ToolCategoryId =
  'organizar' | 'convertir' | 'optimizar' | 'seguridad' | 'edicion' | 'utilidad';

type LocalizedText = Record<Lang, string>;

export interface PdfToolCategory {
  id: ToolCategoryId;
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
  seo: { title: LocalizedText; description: LocalizedText };
}

export interface PdfTool {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  category: ToolCategoryId;
  route: string;
  icon: string;
  status: ToolStatus;
  keywords: string[];
  seo: { title: LocalizedText; description: LocalizedText };
}

export const toolStatusLabels: Record<ToolStatus, LocalizedText> = {
  available: { es: 'Disponible', en: 'Available' },
  soon: { es: 'Próximamente', en: 'Soon' },
  beta: { es: 'Beta', en: 'Beta' },
  guide: { es: 'Guía', en: 'Guide' },
};

export const pdfToolCategories = [
  {
    id: 'organizar',
    title: { es: 'Organizar PDF', en: 'Organize PDF' },
    description: {
      es: 'Une, divide, rota, reordena y elimina páginas de documentos PDF sin subirlos a ningún servidor.',
      en: 'Merge, split, rotate, reorder and delete pages from PDF documents without uploading them to any server.',
    },
    icon: '🗂️',
    seo: {
      title: {
        es: 'Herramientas para organizar PDF online y privado',
        en: 'Private online tools to organize PDF files',
      },
      description: {
        es: 'Herramientas frontend para unir, dividir, rotar, ordenar y eliminar páginas PDF directamente en tu navegador.',
        en: 'Frontend tools to merge, split, rotate, arrange and delete PDF pages directly in your browser.',
      },
    },
  },
  {
    id: 'convertir',
    title: { es: 'Convertir PDF', en: 'Convert PDF' },
    description: {
      es: 'Convierte imágenes y documentos a PDF o extrae formatos comunes desde tus archivos.',
      en: 'Convert images and documents to PDF or export common formats from your files.',
    },
    icon: '🔁',
    seo: {
      title: {
        es: 'Convertidores PDF online en el navegador',
        en: 'Browser-based online PDF converters',
      },
      description: {
        es: 'Convierte PDF, JPG y otros formatos con herramientas que funcionan en el frontend.',
        en: 'Convert PDF, JPG and other formats with tools that run on the frontend.',
      },
    },
  },
  {
    id: 'optimizar',
    title: { es: 'Optimizar PDF', en: 'Optimize PDF' },
    description: {
      es: 'Reduce peso, mejora archivos y prepara documentos PDF para compartirlos mejor.',
      en: 'Reduce file size, improve files and prepare PDF documents for easier sharing.',
    },
    icon: '⚡',
    seo: {
      title: {
        es: 'Herramientas para optimizar PDF online',
        en: 'Online tools to optimize PDF files',
      },
      description: {
        es: 'Comprime, repara y optimiza PDF desde el navegador manteniendo la privacidad.',
        en: 'Compress, repair and optimize PDF files in the browser while keeping them private.',
      },
    },
  },
  {
    id: 'seguridad',
    title: { es: 'Seguridad PDF', en: 'PDF security' },
    description: {
      es: 'Firma visualmente, revisa límites de protección y gestiona PDFs manteniendo el control de tus archivos.',
      en: 'Visually sign, review protection limits and manage PDFs while keeping control of your files.',
    },
    icon: '🔐',
    seo: {
      title: { es: 'Herramientas de seguridad PDF privadas', en: 'Private PDF security tools' },
      description: {
        es: 'Opciones para firmar visualmente y revisar límites de seguridad PDF directamente en el navegador.',
        en: 'Options to visually sign and review PDF security limits directly in the browser.',
      },
    },
  },
  {
    id: 'edicion',
    title: { es: 'Editar PDF', en: 'Edit PDF' },
    description: {
      es: 'Edita metadatos, numera páginas, añade marcas de agua y prepara pequeñas modificaciones de documentos PDF.',
      en: 'Edit metadata, number pages, add watermarks and prepare small changes to PDF documents.',
    },
    icon: '✏️',
    seo: {
      title: {
        es: 'Herramientas para editar PDF en el navegador',
        en: 'Browser-based PDF editing tools',
      },
      description: {
        es: 'Edita información y detalles de tus PDFs con utilidades 100% frontend.',
        en: 'Edit information and details in your PDFs with 100% frontend utilities.',
      },
    },
  },
  {
    id: 'utilidad',
    title: { es: 'Utilidades PDF', en: 'PDF utilities' },
    description: {
      es: 'Herramientas auxiliares para revisar, limpiar, probar y preparar archivos PDF.',
      en: 'Helper tools to review, clean, test and prepare PDF files.',
    },
    icon: '🧰',
    seo: {
      title: { es: 'Utilidades PDF online privadas', en: 'Private online PDF utilities' },
      description: {
        es: 'Utilidades PDF simples, privadas y ejecutadas directamente en el navegador.',
        en: 'Simple, private PDF utilities that run directly in the browser.',
      },
    },
  },
] as const satisfies PdfToolCategory[];

const available = 'available' as const;

export const pdfTools = [
  {
    id: 'pdf-multitool',
    title: { es: 'Multiherramienta PDF', en: 'PDF multitool' },
    description: {
      es: 'Une, reordena, rota, elimina, divide por selección y añade texto visible desde una sola herramienta.',
      en: 'Merge, reorder, rotate, delete, split by selection and add visible text from a single tool.',
    },
    category: 'organizar',
    route: 'multiherramienta-pdf',
    icon: '🧩',
    status: available,
    keywords: [
      'multiherramienta pdf',
      'editor pdf',
      'unir pdf',
      'rotar pdf',
      'eliminar paginas pdf',
      'dividir pdf',
      'añadir texto pdf',
      'pdf multitool',
      'pdf editor',
      'pdf-lib',
      'pdf.js',
    ],
    seo: {
      title: {
        es: 'Multiherramienta PDF online gratis y privada',
        en: 'Free private online PDF multitool',
      },
      description: {
        es: 'Edita PDFs desde una sola pantalla: unir, reordenar, rotar, eliminar, dividir por selección y añadir texto visible sin subir archivos.',
        en: 'Edit PDFs from one screen: merge, reorder, rotate, delete, split by selection and add visible text without uploads.',
      },
    },
  },
  {
    id: 'merge-pdf',
    title: { es: 'Unir PDF', en: 'Merge PDF' },
    description: {
      es: 'Combina varios archivos PDF en uno solo sin perder privacidad.',
      en: 'Combine several PDF files into a single document without losing privacy.',
    },
    category: 'organizar',
    route: 'unir-pdf',
    icon: '➕',
    status: available,
    keywords: ['unir pdf', 'combinar pdf', 'merge pdf', 'pdf-lib'],
    seo: {
      title: {
        es: 'Unir PDF online gratis y privado',
        en: 'Merge PDF online for free and privately',
      },
      description: {
        es: 'Une varios archivos PDF directamente en tu navegador. Gratis, privado y sin subir documentos a ningún servidor.',
        en: 'Merge several PDF files directly in your browser. Free, private and without uploading documents to any server.',
      },
    },
  },
  {
    id: 'reorder-pdf',
    title: { es: 'Ordenar PDF', en: 'Reorder PDF' },
    description: {
      es: 'Reordena páginas, elimina las que no necesites y descarga una copia nueva.',
      en: 'Reorder pages, remove the ones you do not need and download a new copy.',
    },
    category: 'organizar',
    route: 'ordenar-pdf',
    icon: '↕️',
    status: available,
    keywords: [
      'ordenar pdf',
      'reordenar pdf',
      'mover páginas pdf',
      'reorder pdf',
      'pdf-lib',
      'pdf.js',
    ],
    seo: {
      title: {
        es: 'Ordenar páginas PDF online gratis y privado',
        en: 'Reorder PDF pages online for free and privately',
      },
      description: {
        es: 'Reordena páginas de un PDF, elimina las que no necesites y descarga un nuevo documento. Todo funciona localmente en tu navegador.',
        en: 'Reorder PDF pages, remove pages you do not need and download a new document. Everything runs locally in your browser.',
      },
    },
  },
  {
    id: 'delete-pages-pdf',
    title: { es: 'Eliminar páginas PDF', en: 'Delete PDF pages' },
    description: {
      es: 'Quita páginas concretas o rangos de un PDF y descarga una copia limpia.',
      en: 'Remove specific pages or ranges from a PDF and download a clean copy.',
    },
    category: 'organizar',
    route: 'eliminar-paginas-pdf',
    icon: '🗑️',
    status: available,
    keywords: [
      'eliminar paginas pdf',
      'borrar paginas pdf',
      'quitar paginas pdf',
      'delete pdf pages',
      'remove pdf pages',
      'pdf-lib',
    ],
    seo: {
      title: {
        es: 'Eliminar páginas PDF online sin subir archivos',
        en: 'Delete PDF pages online without uploads',
      },
      description: {
        es: 'Elimina páginas sueltas o rangos de un PDF directamente en tu navegador, sin subir documentos a servidores.',
        en: 'Delete individual pages or ranges from a PDF directly in your browser, without uploading documents to servers.',
      },
    },
  },
  {
    id: 'split-pdf',
    title: { es: 'Dividir PDF', en: 'Split PDF' },
    description: {
      es: 'Extrae páginas o rangos de un PDF y descarga un nuevo documento privado.',
      en: 'Extract pages or ranges from a PDF and download a new private document.',
    },
    category: 'organizar',
    route: 'dividir-pdf',
    icon: '✂️',
    status: available,
    keywords: ['dividir pdf', 'separar pdf', 'extraer páginas pdf', 'split pdf', 'pdf-lib'],
    seo: {
      title: {
        es: 'Dividir PDF online sin subir archivos',
        en: 'Split PDF online without uploads',
      },
      description: {
        es: 'Divide PDF por páginas o rangos desde el navegador, manteniendo los archivos en tu dispositivo.',
        en: 'Split PDFs by pages or ranges from the browser, keeping files on your device.',
      },
    },
  },
  {
    id: 'rotate-pdf',
    title: { es: 'Rotar PDF', en: 'Rotate PDF' },
    description: {
      es: 'Gira todas o algunas páginas de un PDF y descarga una copia corregida.',
      en: 'Rotate all or selected PDF pages and download a corrected copy.',
    },
    category: 'organizar',
    route: 'rotar-pdf',
    icon: '🔄',
    status: available,
    keywords: ['rotar pdf', 'girar pdf', 'rotate pdf', 'rotar paginas pdf', 'pdf-lib'],
    seo: {
      title: { es: 'Rotar PDF online en el navegador', en: 'Rotate PDF online in the browser' },
      description: {
        es: 'Rota páginas PDF localmente en el navegador, sin enviar documentos a servidores externos.',
        en: 'Rotate PDF pages locally in the browser without sending documents to external servers.',
      },
    },
  },
  {
    id: 'resize-pdf',
    title: { es: 'Cambiar tamaño PDF', en: 'Resize PDF' },
    description: {
      es: 'Adapta las páginas a A3, A4, A5, Carta o Legal con orientación y margen configurables.',
      en: 'Fit pages to A3, A4, A5, Letter or Legal with configurable orientation and margins.',
    },
    category: 'edicion',
    route: 'cambiar-tamano-pdf',
    icon: '↔️',
    status: available,
    keywords: [
      'cambiar tamaño pdf',
      'pdf a4',
      'redimensionar pdf',
      'resize pdf',
      'pdf letter',
      'pdf page size',
      'imprimir pdf',
    ],
    seo: {
      title: {
        es: 'Cambiar tamaño de PDF online a A4, A3 o Carta',
        en: 'Resize PDF online to A4, A3 or Letter',
      },
      description: {
        es: 'Cambia el tamaño de las páginas de un PDF a A3, A4, A5, Carta o Legal directamente en tu navegador y sin subir archivos.',
        en: 'Resize PDF pages to A3, A4, A5, Letter or Legal directly in your browser without uploading files.',
      },
    },
  },
  {
    id: 'compress-pdf',
    title: { es: 'Comprimir PDF', en: 'Compress PDF' },
    description: {
      es: 'Reduce el tamaño de tus PDFs en el navegador con calidad configurable.',
      en: 'Reduce PDF size in the browser with configurable quality.',
    },
    category: 'optimizar',
    route: 'comprimir-pdf',
    icon: '📦',
    status: available,
    keywords: [
      'comprimir pdf',
      'reducir pdf',
      'compress pdf',
      'optimizar pdf',
      'pdf.js',
      'pdf-lib',
    ],
    seo: {
      title: { es: 'Comprimir PDF online privado', en: 'Compress PDF online privately' },
      description: {
        es: 'Comprime PDF directamente en tu navegador con una estrategia local basada en pdf.js y pdf-lib, sin subir archivos.',
        en: 'Compress PDFs directly in your browser with a local strategy based on pdf.js and pdf-lib, without uploads.',
      },
    },
  },
  {
    id: 'watermark-pdf',
    title: { es: 'Marca de agua PDF', en: 'Watermark PDF' },
    description: {
      es: 'Añade una marca de agua de texto con tamaño, opacidad, rotación, posición y rangos de páginas.',
      en: 'Add a text watermark with size, opacity, rotation, position and page range controls.',
    },
    category: 'edicion',
    route: 'marca-de-agua-pdf',
    icon: '💧',
    status: available,
    keywords: [
      'marca de agua pdf',
      'añadir marca de agua pdf',
      'watermark pdf',
      'texto pdf',
      'pdf-lib',
    ],
    seo: {
      title: {
        es: 'Añadir marca de agua a PDF online gratis y privado',
        en: 'Add watermark to PDF online for free and privately',
      },
      description: {
        es: 'Añade texto como marca de agua a todas o algunas páginas de un PDF directamente en tu navegador, sin subir archivos.',
        en: 'Add text as a watermark to all or selected PDF pages directly in your browser, without uploading files.',
      },
    },
  },
  {
    id: 'sign-pdf',
    title: { es: 'Firmar PDF', en: 'Sign PDF' },
    description: {
      es: 'Añade una firma visual dibujada o subida como imagen a una página del PDF.',
      en: 'Add a visual signature drawn or uploaded as an image to a PDF page.',
    },
    category: 'seguridad',
    route: 'firmar-pdf',
    icon: '✍️',
    status: available,
    keywords: ['firmar pdf', 'firma pdf', 'firma visual', 'sign pdf', 'signature pdf', 'pdf-lib'],
    seo: {
      title: {
        es: 'Firmar PDF online con firma visual',
        en: 'Sign PDF online with a visual signature',
      },
      description: {
        es: 'Dibuja o sube una firma y colócala visualmente en un PDF desde el navegador, sin subir archivos.',
        en: 'Draw or upload a signature and place it visually in a PDF from the browser, without uploads.',
      },
    },
  },
  {
    id: 'extract-text-pdf',
    title: { es: 'Extraer texto PDF', en: 'Extract PDF text' },
    description: {
      es: 'Extrae el texto seleccionable de un PDF, cópialo o descárgalo como TXT.',
      en: 'Extract selectable text from a PDF, copy it or download it as TXT.',
    },
    category: 'utilidad',
    route: 'extraer-texto-pdf',
    icon: '📝',
    status: available,
    keywords: [
      'extraer texto pdf',
      'pdf a txt',
      'texto seleccionable pdf',
      'extract pdf text',
      'pdf to text',
      'pdf.js',
    ],
    seo: {
      title: {
        es: 'Extraer texto de PDF online gratis y privado',
        en: 'Extract PDF text online for free and privately',
      },
      description: {
        es: 'Extrae texto seleccionable de documentos PDF directamente en tu navegador, sin subir archivos y sin OCR.',
        en: 'Extract selectable text from PDF documents directly in your browser, without uploads and without OCR.',
      },
    },
  },
  {
    id: 'extract-images-pdf',
    title: { es: 'Extraer imágenes PDF', en: 'Extract PDF images' },
    description: {
      es: 'Convierte páginas seleccionadas de un PDF en imágenes PNG o JPG y descárgalas como archivo o ZIP.',
      en: 'Convert selected PDF pages into PNG or JPG images and download them as a file or ZIP.',
    },
    category: 'convertir',
    route: 'extraer-imagenes-pdf',
    icon: '🖼️',
    status: available,
    keywords: [
      'extraer imagenes pdf',
      'pdf a png',
      'pdf a jpg',
      'convertir pdf imagen',
      'extract pdf images',
      'pdf.js',
      'zip',
    ],
    seo: {
      title: {
        es: 'Extraer imágenes de PDF online gratis y privado',
        en: 'Extract PDF images online for free and privately',
      },
      description: {
        es: 'Exporta páginas de PDF como PNG o JPG directamente en el navegador, con descarga individual o ZIP.',
        en: 'Export PDF pages as PNG or JPG directly in the browser, with individual or ZIP download.',
      },
    },
  },
  {
    id: 'scan-pdf',
    title: { es: 'Escanear PDF', en: 'Scan PDF' },
    description: {
      es: 'Escanea páginas con la cámara del móvil y crea un PDF listo para descargar o editar.',
      en: 'Scan pages with your mobile camera and create a PDF ready to download or edit.',
    },
    category: 'convertir',
    route: 'escanear-pdf',
    icon: '📷',
    status: available,
    keywords: [
      'escanear pdf',
      'camara a pdf',
      'scanner pdf',
      'scan pdf',
      'imagen a pdf',
      'pdf-lib',
      'getUserMedia',
    ],
    seo: {
      title: { es: 'Escanear PDF online desde el móvil', en: 'Scan PDF online from mobile' },
      description: {
        es: 'Escanea documentos con la cámara, genera un PDF en el navegador y pásalo automáticamente a otras herramientas PDF.',
        en: 'Scan documents with the camera, generate a PDF in the browser and send it automatically to other PDF tools.',
      },
    },
  },
  {
    id: 'images-to-pdf',
    title: { es: 'Imágenes a PDF', en: 'Images to PDF' },
    description: {
      es: 'Convierte JPG, PNG y WebP en un PDF con orden, tamaño y orientación configurables.',
      en: 'Convert JPG, PNG and WebP images into a PDF with configurable order, size and orientation.',
    },
    category: 'convertir',
    route: 'imagenes-a-pdf',
    icon: '🖼️',
    status: available,
    keywords: [
      'imagenes a pdf',
      'imagen a pdf',
      'jpg a pdf',
      'png a pdf',
      'webp a pdf',
      'images to pdf',
      'pdf-lib',
    ],
    seo: {
      title: {
        es: 'Imágenes a PDF online gratis y privado',
        en: 'Images to PDF online for free and privately',
      },
      description: {
        es: 'Convierte JPG, PNG y WebP a PDF directamente en tu navegador. Ordena imágenes, elige tamaño y orientación, y descarga un PDF sin subir archivos.',
        en: 'Convert JPG, PNG and WebP images to PDF directly in your browser. Reorder images, choose page size and orientation, and download a PDF without uploads.',
      },
    },
  },
  {
    id: 'jpg-to-pdf',
    title: { es: 'JPG a PDF', en: 'JPG to PDF' },
    description: {
      es: 'Convierte imágenes JPG en un documento PDF listo para descargar.',
      en: 'Convert JPG images into a PDF document ready to download.',
    },
    category: 'convertir',
    route: 'jpg-a-pdf',
    icon: '🖼️',
    status: available,
    keywords: ['jpg a pdf', 'imagen a pdf', 'jpg to pdf', 'pdf-lib'],
    seo: {
      title: {
        es: 'Convertir JPG a PDF online gratis y privado',
        en: 'Convert JPG to PDF online for free and privately',
      },
      description: {
        es: 'Convierte imágenes JPG a PDF directamente en el navegador y sin subir archivos.',
        en: 'Convert JPG images to PDF directly in the browser without uploading files.',
      },
    },
  },
  {
    id: 'pdf-to-jpg',
    title: { es: 'PDF a JPG', en: 'PDF to JPG' },
    description: {
      es: 'Extrae páginas de PDF como imágenes JPG para usarlas fácilmente.',
      en: 'Export PDF pages as JPG images for easy reuse.',
    },
    category: 'convertir',
    route: 'pdf-a-jpg',
    icon: '🧾',
    status: available,
    keywords: ['pdf a jpg', 'convertir pdf imagen', 'pdf to jpg', 'pdf.js'],
    seo: {
      title: {
        es: 'Convertir PDF a JPG online gratis y privado',
        en: 'Convert PDF to JPG online for free and privately',
      },
      description: {
        es: 'Convierte páginas PDF a imágenes JPG usando herramientas frontend, sin subir archivos.',
        en: 'Convert PDF pages to JPG images using frontend tools, without uploads.',
      },
    },
  },
  {
    id: 'test-pdf-generator',
    title: { es: 'Generar PDF de prueba', en: 'Generate test PDF' },
    description: {
      es: 'Crea PDFs de ejemplo con páginas, texto, imágenes, tamaños y metadatos configurables.',
      en: 'Create sample PDFs with configurable pages, text, images, sizes and metadata.',
    },
    category: 'utilidad',
    route: 'generar-pdf-prueba',
    icon: '🧪',
    status: available,
    keywords: [
      'generar pdf prueba',
      'pdf ejemplo',
      'test pdf',
      'sample pdf',
      'lorem ipsum',
      'pdf-lib',
    ],
    seo: {
      title: {
        es: 'Generar PDF de prueba online y privado',
        en: 'Generate a private online test PDF',
      },
      description: {
        es: 'Genera PDFs de prueba configurables directamente en el navegador: páginas, tamaños, texto Lorem Ipsum, imágenes y metadatos.',
        en: 'Generate configurable test PDFs directly in the browser: pages, sizes, Lorem Ipsum text, images and metadata.',
      },
    },
  },
  {
    id: 'repair-pdf',
    title: { es: 'Reparar PDF', en: 'Repair PDF' },
    description: {
      es: 'Intenta reconstruir PDFs dañados o con problemas de lectura.',
      en: 'Try to rebuild damaged PDFs or files with reading issues.',
    },
    category: 'utilidad',
    route: 'reparar-pdf',
    icon: '🩹',
    status: available,
    keywords: ['reparar pdf', 'pdf dañado', 'repair pdf', 'pdf-lib'],
    seo: {
      title: {
        es: 'Reparar PDF online gratis y privado',
        en: 'Repair PDF online for free and privately',
      },
      description: {
        es: 'Intenta reconstruir documentos PDF con problemas directamente en el navegador, sin subir archivos.',
        en: 'Try to rebuild PDF documents with issues directly in the browser, without uploads.',
      },
    },
  },
  {
    id: 'flatten-pdf',
    title: { es: 'Aplanar PDF', en: 'Flatten PDF' },
    description: {
      es: 'Convierte campos editables AcroForm en contenido fijo y revisa la copia antes de descargar.',
      en: 'Turn editable AcroForm fields into fixed content and review the copy before downloading.',
    },
    category: 'edicion',
    route: 'aplanar-pdf',
    icon: '📌',
    status: available,
    keywords: [
      'aplanar pdf',
      'aplanar formulario pdf',
      'campos pdf no editables',
      'flatten pdf',
      'flatten pdf form',
      'acroform',
    ],
    seo: {
      title: {
        es: 'Aplanar PDF online: convertir campos en contenido fijo',
        en: 'Flatten PDF online: turn fields into fixed content',
      },
      description: {
        es: 'Aplana formularios AcroForm de un PDF en el navegador para convertir sus campos editables en contenido fijo, sin subir archivos.',
        en: 'Flatten AcroForm fields in a PDF in your browser to turn editable controls into fixed content without uploading files.',
      },
    },
  },
  {
    id: 'pdf-to-png',
    title: { es: 'PDF a PNG', en: 'PDF to PNG' },
    description: {
      es: 'Convierte páginas PDF en imágenes PNG nítidas, con transparencia compatible y sin pérdida por compresión.',
      en: 'Convert PDF pages into crisp PNG images with lossless compression and compatible transparency.',
    },
    category: 'convertir',
    route: 'pdf-a-png',
    icon: '🖼️',
    status: available,
    keywords: ['pdf a png', 'convertir pdf png', 'pdf imagen sin perdida', 'pdf to png', 'lossless image'],
    seo: {
      title: { es: 'Convertir PDF a PNG online gratis y privado', en: 'Convert PDF to PNG online free and privately' },
      description: {
        es: 'Convierte páginas PDF a PNG de alta calidad en tu navegador. Elige páginas y resolución, sin subir documentos.',
        en: 'Convert PDF pages to high-quality PNG files in your browser. Choose pages and resolution without uploads.',
      },
    },
  },
  {
    id: 'pdf-to-webp',
    title: { es: 'PDF a WebP', en: 'PDF to WebP' },
    description: {
      es: 'Convierte páginas PDF a WebP y ajusta calidad y resolución para obtener imágenes más ligeras.',
      en: 'Convert PDF pages to WebP and adjust quality and resolution for lighter images.',
    },
    category: 'convertir',
    route: 'pdf-a-webp',
    icon: '🌐',
    status: available,
    keywords: ['pdf a webp', 'convertir pdf webp', 'pdf imagen ligera', 'pdf to webp', 'web image'],
    seo: {
      title: { es: 'Convertir PDF a WebP online gratis', en: 'Convert PDF to WebP online for free' },
      description: {
        es: 'Convierte páginas de un PDF a imágenes WebP ligeras directamente en el navegador y descarga una imagen o un ZIP.',
        en: 'Convert PDF pages into lightweight WebP images directly in the browser and download one image or a ZIP.',
      },
    },
  },
  {
    id: 'protect-pdf',
    title: { es: 'Proteger PDF', en: 'Protect PDF' },
    description: {
      es: 'Consulta los límites reales de proteger PDFs con contraseña desde el navegador sin subir archivos.',
      en: 'Review the real limits of password-protecting PDFs in the browser without uploads.',
    },
    category: 'seguridad',
    route: 'proteger-pdf',
    icon: '🛡️',
    status: 'guide',
    keywords: ['proteger pdf', 'contraseña pdf', 'cifrar pdf', 'protect pdf', 'pdf security'],
    seo: {
      title: {
        es: 'Proteger PDF con contraseña: límites en navegador',
        en: 'Protect PDF with password: browser limits',
      },
      description: {
        es: 'Página técnica sobre protección PDF con contraseña, cifrado real y límites de hacerlo solo en navegador.',
        en: 'Technical page about PDF password protection, real encryption and browser-only limits.',
      },
    },
  },
  {
    id: 'unlock-pdf',
    title: { es: 'Desbloquear PDF', en: 'Unlock PDF' },
    description: {
      es: 'Revisa qué se puede hacer con PDFs protegidos cuando conoces la contraseña, sin fuerza bruta ni bypass.',
      en: 'Review what can be done with protected PDFs when you know the password, without brute force or bypass.',
    },
    category: 'seguridad',
    route: 'desbloquear-pdf',
    icon: '🔓',
    status: 'guide',
    keywords: ['desbloquear pdf', 'quitar contraseña pdf', 'unlock pdf', 'password pdf', 'pdf.js'],
    seo: {
      title: {
        es: 'Desbloquear PDF con contraseña conocida',
        en: 'Unlock PDF with a known password',
      },
      description: {
        es: 'Página técnica sobre desbloquear PDFs solo con contraseña conocida, sin cracking ni llamadas a servidor.',
        en: 'Technical page about unlocking PDFs only with a known password, without cracking or server calls.',
      },
    },
  },
  {
    id: 'edit-metadata',
    title: { es: 'Editar metadatos PDF', en: 'Edit PDF metadata' },
    description: {
      es: 'Cambia título, autor, asunto, palabras clave, creador y productor de un PDF.',
      en: 'Change title, author, subject, keywords, creator and producer in a PDF.',
    },
    category: 'edicion',
    route: 'editar-metadatos-pdf',
    icon: '🏷️',
    status: available,
    keywords: ['metadatos pdf', 'editar pdf', 'titulo pdf', 'autor pdf', 'pdf metadata', 'pdf-lib'],
    seo: {
      title: {
        es: 'Editar metadatos PDF online gratis y privado',
        en: 'Edit PDF metadata online for free and privately',
      },
      description: {
        es: 'Edita metadatos básicos de documentos PDF con una herramienta frontend, sin subir archivos.',
        en: 'Edit basic metadata in PDF documents with a frontend tool, without uploads.',
      },
    },
  },
  {
    id: 'page-numbers',
    title: { es: 'Numerar páginas PDF', en: 'Add PDF page numbers' },
    description: {
      es: 'Añade numeración visible a las páginas de tus documentos PDF con formato y posición configurables.',
      en: 'Add visible page numbers to your PDF documents with configurable format and position.',
    },
    category: 'edicion',
    route: 'numerar-paginas-pdf',
    icon: '🔢',
    status: available,
    keywords: [
      'numerar pdf',
      'números de página pdf',
      'pagina n de total',
      'page numbers pdf',
      'pdf-lib',
    ],
    seo: {
      title: {
        es: 'Numerar páginas PDF online gratis y privado',
        en: 'Add page numbers to PDF online for free and privately',
      },
      description: {
        es: 'Añade números de página a documentos PDF desde el navegador con formato, posición, tamaño y margen configurables.',
        en: 'Add page numbers to PDF documents from the browser with configurable format, position, size and margin.',
      },
    },
  },
] as const satisfies PdfTool[];

export function isToolCategoryId(category: string | undefined): category is ToolCategoryId {
  return Boolean(category && pdfToolCategories.some((item) => item.id === category));
}

export function getCategoryById(category: ToolCategoryId) {
  return pdfToolCategories.find((item) => item.id === category)!;
}

export function getToolsByCategory(category: ToolCategoryId) {
  return pdfTools.filter((tool) => tool.category === category);
}

export function getCategoriesWithTools() {
  return pdfToolCategories.map((category) => ({
    ...category,
    tools: getToolsByCategory(category.id),
  }));
}

export function getToolById(id: string) {
  return pdfTools.find((tool) => tool.id === id);
}
