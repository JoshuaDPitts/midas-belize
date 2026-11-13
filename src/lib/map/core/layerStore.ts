// src/lib/map/core/layerStore.ts
import {
  type LayerConfig,
  LayerAlreadyExistsError,
  LayerNotFoundError,
} from '../layers/types';

type Listener = () => void;

export class LayerStore {
  private readonly byId = new Map<string, LayerConfig>();
  private ids: string[] = [];
  private readonly listeners = new Set<Listener>();
  /** Cached snapshot — stable reference for useSyncExternalStore. */
  private snapshot: LayerConfig[] = [];

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    // Rebuild snapshot before notifying listeners so the new reference
    // is ready when useSyncExternalStore calls getSnapshot.
    this.snapshot = this.ids.map((id) => this.byId.get(id)!);
    for (const fn of this.listeners) fn();
  }

  // DeckLayer uses Record<string, unknown> so id is unknown on the union.
  // All concrete LayerConfig variants carry id: string; cast is safe.
  private cfgId(cfg: LayerConfig): string { return cfg.id as string; }

  get(id: string): LayerConfig | undefined { return this.byId.get(id); }
  order(): string[] { return [...this.ids]; }
  /** Returns a stable reference that only changes after mutations. */
  all(): LayerConfig[] { return this.snapshot; }

  addLayer(cfg: LayerConfig): void {
    const id = this.cfgId(cfg);
    if (this.byId.has(id)) throw new LayerAlreadyExistsError(id);
    this.byId.set(id, cfg);
    this.ids.push(id);
    this.emit();
  }

  removeLayer(id: string): void {
    if (!this.byId.has(id)) throw new LayerNotFoundError(id);
    this.byId.delete(id);
    this.ids = this.ids.filter((x) => x !== id);
    this.emit();
  }

  updateLayer(id: string, patch: Partial<LayerConfig>): void {
    const prev = this.byId.get(id);
    if (!prev) throw new LayerNotFoundError(id);
    const next = { ...prev, ...patch, id, type: prev.type as LayerConfig['type'] } as LayerConfig;
    this.byId.set(id, next);
    this.emit();
  }

  setLayerOrder(ids: string[]): void {
    for (const id of ids) if (!this.byId.has(id)) throw new LayerNotFoundError(id);
    const listed = new Set(ids);
    const tail = this.ids.filter((x) => !listed.has(x));
    this.ids = [...ids, ...tail];
    this.emit();
  }
}
