/**
 * Doble en memoria de kairosDb para pruebas (el repo no trae fake-indexeddb). Implementa solo lo que usan
 * evidence-upload-queue y sync-draft-store: add/get/put/update/delete/filter/where().equals().
 */
type Row = Record<string, unknown>;

class FakeCollection<T extends Row> {
  constructor(private readonly rows: () => T[]) {}
  filter(fn: (row: T) => boolean) {
    const base = this.rows;
    return new FakeCollection<T>(() => base().filter(fn));
  }
  async toArray(): Promise<T[]> {
    return this.rows();
  }
  async count(): Promise<number> {
    return this.rows().length;
  }
  async delete(): Promise<number> {
    const targets = this.rows();
    for (const row of targets) (row as Row & { __remove?: () => void }).__remove?.();
    return targets.length;
  }
}

export class FakeTable<T extends Row> {
  private store = new Map<string, T>();
  private seq = 0;
  constructor(private readonly keyPaths: string[] | null) {}

  private keyOf(row: T): string {
    return this.keyPaths ? this.keyPaths.map((k) => String(row[k])).join('|') : '';
  }
  private asKey(key: unknown): string {
    return Array.isArray(key) ? key.join('|') : String(key);
  }

  async add(row: T): Promise<number> {
    const id = ++this.seq;
    this.store.set(String(id), { ...row, id });
    return id;
  }
  async put(row: T): Promise<void> {
    this.store.set(this.keyPaths ? this.keyOf(row) : String((row as Row).id), { ...row });
  }
  async get(key: unknown): Promise<T | undefined> {
    return this.store.get(this.asKey(key));
  }
  async update(key: unknown, patch: Partial<T>): Promise<number> {
    const k = this.asKey(key);
    const current = this.store.get(k);
    if (!current) return 0;
    this.store.set(k, { ...current, ...patch });
    return 1;
  }
  async delete(key: unknown): Promise<void> {
    this.store.delete(this.asKey(key));
  }
  async bulkDelete(keys: unknown[]): Promise<void> {
    for (const k of keys) this.store.delete(this.asKey(k));
  }
  filter(fn: (row: T) => boolean) {
    return new FakeCollection<T>(() => [...this.store.values()].filter(fn));
  }
  where(index: string) {
    const fields = index.replace(/[[\]]/g, '').split('+');
    return {
      equals: (value: unknown) => {
        const wanted = Array.isArray(value) ? value : [value];
        const matches = () =>
          [...this.store.entries()]
            .filter(([, row]) => fields.every((f, i) => row[f] === wanted[i]))
            .map(([k, row]) => Object.assign({ ...row }, { __remove: () => this.store.delete(k) }) as T);
        return new FakeCollection<T>(matches);
      },
    };
  }
  clear(): void {
    this.store.clear();
    this.seq = 0;
  }
  /** Para asserts. */
  all(): T[] {
    return [...this.store.values()];
  }
}

export function createFakeKairosDb() {
  return {
    evidence_queue: new FakeTable<Row>(null),
    sync_drafts: new FakeTable<Row>(['checklistType', 'sourceId']),
    sync_field_edits: new FakeTable<Row>(['checklistType', 'sourceId', 'key']),
  };
}
