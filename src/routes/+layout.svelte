<script lang="ts">
  import "../app.css";
  import { Toaster } from "$lib/components/ui/sonner";
  import { ModeWatcher } from "mode-watcher";
  import * as Tooltip from "$lib/components/ui/tooltip";

  let { children } = $props();
</script>

<!-- <ModeWatcher /> -->
<Toaster />

<Tooltip.Provider>
  {@render children()}
</Tooltip.Provider>
