const DB_NAME = 'FácilPDF-transfers';
const STORE_NAME = 'pending-files';
const DB_VERSION = 1;
const PENDING_KEY = 'pending-pdf';

export interface PendingPdfTransfer {
  file: File;
  source: string;
  createdAt: number;
}

function openTransferDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error ?? new Error('IndexedDB error'));
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (_store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openTransferDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = action(store);

        request.onerror = () => reject(request.error ?? new Error('IndexedDB request error'));
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error('IndexedDB transaction error'));
        };
      }),
  );
}

export async function savePendingPdfTransfer(file: File, source = 'FácilPDF'): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  await withStore('readwrite', (store) =>
    store.put({ file, source, createdAt: Date.now() }, PENDING_KEY),
  );
}

export async function consumePendingPdfTransfer(
  maxAgeMs = 30 * 60 * 1000,
): Promise<PendingPdfTransfer | null> {
  if (typeof indexedDB === 'undefined') return null;

  const transfer = await withStore<PendingPdfTransfer | undefined>('readonly', (store) =>
    store.get(PENDING_KEY),
  );

  if (!transfer) return null;

  await withStore('readwrite', (store) => store.delete(PENDING_KEY));

  if (Date.now() - transfer.createdAt > maxAgeMs) {
    return null;
  }

  if (
    transfer.file.type !== 'application/pdf' &&
    !transfer.file.name.toLowerCase().endsWith('.pdf')
  ) {
    return null;
  }

  return transfer;
}
