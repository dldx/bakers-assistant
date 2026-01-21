<script lang="ts">
    import { fade } from "svelte/transition";
    import { PenLine, BookOpen } from "lucide-svelte";
    import Markdown from "svelte-exmarkdown";

    let { notes = $bindable("") } = $props();

    let isEditing = $state(false);
    let containerRef: HTMLElement | null = $state(null);
    let textareaRef: HTMLTextAreaElement | null = $state(null);

    function handleClickOutside(event: MouseEvent) {
        if (
            isEditing &&
            containerRef &&
            !containerRef.contains(event.target as Node)
        ) {
            isEditing = false;
        }
    }

    function startEditing(event?: MouseEvent | KeyboardEvent) {
        if (event && event.type === "click") {
            event.stopPropagation();
        }
        isEditing = true;
        // Focus usually happens automatically if we use autofocus, but let's be safe
        setTimeout(() => {
            textareaRef?.focus();
        }, 0);
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="mt-8 pt-8 border-t border-slate-100" bind:this={containerRef}>
    <div class="flex items-center justify-between mb-4">
        <h3
            class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"
        >
            <PenLine class="w-4 h-4 text-slate-400" />
            Baker's Notes
        </h3>

        {#if !isEditing}
            <button
                onclick={startEditing}
                class="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
            >
                Edit Notes
            </button>
        {/if}
    </div>

    <div class="relative">
        {#if isEditing}
            <div class="w-full relative group" in:fade={{ duration: 150 }}>
                <textarea
                    bind:this={textareaRef}
                    bind:value={notes}
                    placeholder="Record your process, folding times, or ambient temperature..."
                    class="w-full h-full min-h-[300px] p-6 bg-white rounded-2xl border-2 border-amber-500/20 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-y text-base text-slate-700 font-medium placeholder:text-slate-300 transition-all font-mono shadow-xl shadow-amber-900/5 outline-none"
                ></textarea>
                <div
                    class="absolute bottom-4 right-4 text-[10px] font-black text-slate-400 pointer-events-none uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"
                >
                    Markdown Supported
                </div>
                <div
                    class="absolute -top-3 right-4 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 shadow-sm pointer-events-none"
                >
                    Editing
                </div>
            </div>
        {:else}
            <!-- Rendered View -->
            <div
                class="bg-slate-50 rounded-2xl p-8 min-h-[200px] border border-slate-100 hover:border-amber-200 transition-colors cursor-text group relative"
                onclick={startEditing}
                onkeydown={(e) => e.key === "Enter" && startEditing()}
                role="button"
                tabindex="0"
                in:fade={{ duration: 150 }}
            >
                {#if notes.trim()}
                    <div
                        class="prose prose-sm prose-slate prose-headings:font-black prose-p:font-medium prose-p:text-slate-600 prose-ul:list-disc prose-ol:list-decimal max-w-none"
                    >
                        <Markdown md={notes} />
                    </div>
                {:else}
                    <div
                        class="h-full min-h-[140px] flex flex-col items-center justify-center text-center text-slate-300 group-hover:text-amber-300 transition-colors"
                    >
                        <BookOpen class="w-10 h-10 mb-3 opacity-50" />
                        <p class="text-xs font-black uppercase tracking-widest">
                            No notes yet. Click to start writing.
                        </p>
                    </div>
                {/if}

                <!-- Subtle 'Click to edit' hint on hover -->
                <div
                    class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100"
                >
                    Click to edit
                </div>
            </div>
        {/if}
    </div>
</div>
