<script lang="ts">
    import { fade } from "svelte/transition";
    import { PenLine, BookOpen } from "lucide-svelte";
    import Markdown from "svelte-exmarkdown";
    import * as Field from "$lib/components/ui/field";
    import { Textarea } from "$lib/components/ui/textarea";
    import { gfmPlugin } from "svelte-exmarkdown/gfm";
    import rehypeExternalLinks from "rehype-external-links";

    let { notes = $bindable(""), isCookingMode, ...restprops } = $props();

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
            const target = event.target as HTMLElement;
            // Prevent entering edit mode if clicking a link
            if (target.closest("a")) {
                return;
            }
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

<div class="mt-8 pt-8 border-slate-100 border-t" {...restprops} id="notes">
    <div class="flex justify-between items-center mb-4">
        <h3
            class="flex items-center gap-2 font-black text-slate-800 text-sm uppercase tracking-widest"
        >
            <PenLine class="w-4 h-4 text-slate-400" />
            Baker's Notes
        </h3>

        {#if !isEditing}
            <button
                onclick={startEditing}
                class="bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-bold text-amber-600 hover:text-amber-700 text-xs transition-colors"
            >
                Edit Notes
            </button>
        {/if}
    </div>

    <div class="relative" bind:this={containerRef}>
        {#if isEditing}
            <div class="group relative w-full" in:fade={{ duration: 150 }}>
                <Field.Field>
                    <Textarea
                        bind:ref={textareaRef}
                        bind:value={notes}
                        placeholder="Record your process, folding times, or ambient temperature..."
                        class="bg-white shadow-amber-900/5 shadow-none shadow-xl p-4 sm:p-6 border-2 border-amber-500/20 focus:border-amber-500 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 w-full h-full min-h-[200px] sm:min-h-[300px] font-mono font-medium text-slate-700 placeholder:text-slate-300 text-sm sm:text-base transition-all resize-y"
                    />
                </Field.Field>
                <div
                    class="right-4 bottom-4 absolute bg-slate-50 px-2 py-1 border border-slate-100 rounded-lg font-black text-[10px] text-slate-400 uppercase tracking-widest pointer-events-none"
                >
                    Markdown Supported
                </div>
                <div
                    class="-top-3 right-4 absolute bg-amber-100 shadow-sm px-2 py-0.5 border border-amber-200 rounded font-bold text-[10px] text-amber-800 pointer-events-none"
                >
                    Editing
                </div>
            </div>
        {:else}
            <!-- Rendered View -->
            <div
                class="group relative bg-slate-50 p-5 sm:p-8 border border-slate-100 hover:border-amber-200 rounded-2xl min-h-[140px] sm:min-h-[200px] text-black transition-colors cursor-text"
                onclick={!isCookingMode ? startEditing : undefined}
                onkeydown={(e) => e.key === "Enter" && startEditing()}
                role="button"
                tabindex="0"
                in:fade={{ duration: 150 }}
            >
                {#if notes.trim()}
                    <div
                        class="max-w-none prose-p:font-medium prose-headings:font-black prose-p:text-slate-600 prose-ol:list-decimal prose-ul:list-disc prose prose-sm prose-slate"
                    >
                        <Markdown
                            md={notes}
                            plugins={[
                                gfmPlugin(),
                                {
                                    rehypePlugin: [
                                            rehypeExternalLinks,
                                            {
                                                target: "_blank",
                                                rel: [
                                                    "nofollow",
                                                    "noopener",
                                                    "noreferrer",
                                                ],
                                            },
                                        ],
                                },
                            ]}
                        />
                    </div>
                {:else}
                    <div
                        class="flex flex-col justify-center items-center h-full min-h-[140px] text-slate-300 group-hover:text-amber-300 text-center transition-colors"
                    >
                        <BookOpen class="opacity-50 mb-3 w-10 h-10" />
                        <p class="font-black text-xs uppercase tracking-widest">
                            No notes yet. Click to start writing.
                        </p>
                    </div>
                {/if}

                <!-- Subtle 'Click to edit' hint on hover -->
                <div
                    class="right-4 bottom-4 absolute bg-white opacity-0 group-hover:opacity-100 shadow-sm px-2 py-1 border border-slate-100 rounded-md font-bold text-[10px] text-slate-400 transition-opacity"
                >
                    Click to edit
                </div>
            </div>
        {/if}
    </div>
</div>
