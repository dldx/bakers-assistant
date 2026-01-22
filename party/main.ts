import type * as Party from "partykit/server";

export default class VaultServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // When a device connects, send it the current state of the vault
    const vault = await this.room.storage.get<Record<string, any>>("vault") || {};
    conn.send(JSON.stringify({ type: "sync-all", vault }));

    console.log(`Connected: ${conn.id} to room ${this.room.id}`);
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);

    if (data.type === "save-recipe") {
      // 1. Persist to central storage (Cloudflare Durable Object)
      const vault = await this.room.storage.get<Record<string, any>>("vault") || {};
      vault[data.recipe.uuid] = data.recipe;
      await this.room.storage.put("vault", vault);

      // 2. Broadcast to all other connected devices
      this.room.broadcast(message, [sender.id]);
    }

    if (data.type === "delete-recipe") {
      const vault = await this.room.storage.get<Record<string, any>>("vault") || {};
      delete vault[data.uuid];
      await this.room.storage.put("vault", vault);

      this.room.broadcast(message, [sender.id]);
    }
  }
}
