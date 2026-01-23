import PartySocket from "partysocket";
import { db } from "./db";
import type { Recipe } from "./types";
import { env } from "$env/dynamic/public";

export class SyncService {
  private socket: PartySocket | null = null;
  private onSyncCallback: (() => void) | null = null;

  constructor(syncKey: string, onSync: () => void) {
    if (!syncKey) return;

    this.onSyncCallback = onSync;
    this.socket = new PartySocket({
        host: env.PUBLIC_PARTYKIT_HOST || "bakers-assistant.dldx.partykit.dev",
        room: syncKey,
    });

    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

      this.socket.addEventListener("open", async () => {
          const recipes = await db.recipes.toArray();
          this.socket?.send(JSON.stringify({ type: "sync-vault", recipes }));
      });

    this.socket.addEventListener("message", async (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "sync-all") {
          await this.handleSyncAll(data.vault);
        } else if (data.type === "save-recipe") {
          await this.handleSaveRecipe(data.recipe);
        } else if (data.type === "delete-recipe") {
          await this.handleDeleteRecipe(data.uuid);
        }
      } catch (err) {
        console.error("Failed to parse sync message", err);
      }
    });
  }

  private async handleSyncAll(vault: Record<string, Recipe>) {
    let hasChanges = false;
    for (const uuid of Object.keys(vault)) {
      const remote = vault[uuid];
      const local = await db.recipes.where("uuid").equals(uuid).first();

      if (!local || remote.updatedAt > local.updatedAt) {
        // preserve local ID if it exists to avoid duplicates
        if (local?.id) remote.id = local.id;
        await db.recipes.put(remote);
        hasChanges = true;
      }
    }
    if (hasChanges && this.onSyncCallback) this.onSyncCallback();
  }

  private async handleSaveRecipe(remoteRecipe: Recipe) {
    const local = await db.recipes.where("uuid").equals(remoteRecipe.uuid).first();
    if (!local || remoteRecipe.updatedAt > local.updatedAt) {
      if (local?.id) remoteRecipe.id = local.id;
      await db.recipes.put(remoteRecipe);
      if (this.onSyncCallback) this.onSyncCallback();
    }
  }

  private async handleDeleteRecipe(uuid: string) {
    const local = await db.recipes.where("uuid").equals(uuid).first();
    if (local?.id) {
      await db.recipes.delete(local.id);
      if (this.onSyncCallback) this.onSyncCallback();
    }
  }

  public sendSave(recipe: Recipe) {
    this.socket?.send(JSON.stringify({ type: "save-recipe", recipe }));
  }

  public sendDelete(uuid: string) {
    this.socket?.send(JSON.stringify({ type: "delete-recipe", uuid }));
  }

  public async syncAll() {
    if (!this.socket) return;
    const recipes = await db.recipes.toArray();
    this.socket.send(JSON.stringify({ type: "sync-vault", recipes }));
  }

  public close() {
    this.socket?.close();
  }

    public getShareUrl(): string | null {
        if (!this.socket?.room) return null;
        const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
        return `${base}#sync/${this.socket.room}`;
    }
}
