<script lang="ts">
  import { Sparkles, MessageSquare, Loader2, Send, Key, ExternalLink } from "lucide-svelte";
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import Markdown from "svelte-exmarkdown";
  import { getBakerAssistantResponse } from "$lib/aiService";
  import type { Ingredient } from "$lib/types";

  interface Props {
    recipeName: string;
    ingredients: Ingredient[];
    hydration: number;
    portions: number;
    notes: string;
    onUpdateRecipe: (data: {
      recipeName?: string;
      ingredients?: any[];
      portions?: number;
      targetHydration?: number;
      notes?: string;
    }) => void;
  }

  let { recipeName, ingredients, hydration, portions, notes, onUpdateRecipe }: Props = $props();

  let chatMessages = $state<{ role: "user" | "assistant"; content: string }[]>([]);
  let userInput = $state("");
  let isAnalyzing = $state(false);
  let isEditingKey = $state(false);
  let chatContainer = $state<HTMLElement | null>(null);

  // API Key handling
  let apiKeyInput = $state("");
  let hasKey = $state(true); // Assume true until checked on mount
  let isSavingKey = $state(false);

  onMount(() => {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey) apiKeyInput = localKey;
    // process.env.API_KEY is defined in vite.config.ts
    const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY);
    hasKey = !!(localKey || envKey);
  });

  function saveApiKey() {
    if (!apiKeyInput.trim()) return;
    isSavingKey = true;
    localStorage.setItem('gemini_api_key', apiKeyInput.trim());
    hasKey = true;
    isEditingKey = false;
    isSavingKey = false;
  }

  $effect(() => {
    if (chatMessages.length > 0 && chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  async function sendChatMessage() {
    if (!userInput.trim() || isAnalyzing) return;

    const message = userInput.trim();
    chatMessages.push({ role: "user", content: message });
    userInput = "";
    isAnalyzing = true;

    try {
      const response = await getBakerAssistantResponse(chatMessages, {
        recipeName,
        ingredients,
        hydration,
        portions,
        notes,
      });

      console.log("AI Response:", response);
      if (response.advice) {
        chatMessages.push({ role: "assistant", content: response.advice });
      } else if (!response.recipeUpdate) {
        // Fallback message if AI provides neither advice nor recipe update
        chatMessages.push({ role: "assistant", content: "I've processed your request." });
      }

      if (response.recipeUpdate) {
        onUpdateRecipe(response.recipeUpdate);
      }
    } catch (e: any) {
      console.error("AI Assistant Error:", e);
      let errorMessage = "I'm having trouble connecting right now. Please try again.";

      // Handle Gemini specific "overloaded" (503) or "rate limit" (429) errors
      // The SDK often throws an object with a 'message' that contains the JSON error if it's a fetch error
      const msg = e?.message || "";
      const isOverloaded = msg.includes("503") || msg.toLowerCase().includes("overloaded") || msg.includes("UNAVAILABLE");
      const isQuotaExceeded = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit");
      const isInvalidKey = msg.includes("API_KEY_INVALID") || msg.includes("401") || msg.includes("403");

      if (isOverloaded) {
        errorMessage = "The baking oven is a bit crowded right now (Gemini is overloaded). Please try again in a moment!";
      } else if (isQuotaExceeded) {
        errorMessage = "I've answered a lot of questions recently. Please wait a bit before asking more.";
      } else if (isInvalidKey) {
        errorMessage = "Your API key seems to be invalid. Please check it and try again.";
        // We don't necessarily want to force hasKey = false here immediately
        // as it might be a transient 403, but it's a good hint.
      }

      chatMessages.push({
        role: "assistant",
        content: errorMessage,
      });
    } finally {
      isAnalyzing = false;
    }
  }
</script>

<div
  class="flex flex-col bg-white shadow-slate-200/40 shadow-xl border border-slate-200 rounded-3xl sm:rounded-[2rem] h-[500px] sm:h-[600px] overflow-hidden"
>
  <div
    class="flex justify-between items-center bg-slate-50/50 p-4 sm:p-6 border-slate-100 border-b"
  >
    <div class="flex items-center gap-3">
      <div class="bg-amber-100 p-2 rounded-xl">
        <Sparkles class="w-4 h-4 text-amber-600" />
      </div>
      <div>
        <h3 class="font-black text-slate-900 text-sm uppercase tracking-wider">
          Baker's AI Assistant
        </h3>
        <p class="font-bold text-[10px] text-slate-400 uppercase tracking-widest">
          Online & Ready
        </p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      {#if hasKey}
        <button
          onclick={() => {
            isEditingKey = !isEditingKey;
          }}
          class="font-black text-[10px] {isEditingKey ? 'text-amber-600' : 'text-slate-400'} hover:text-amber-600 uppercase tracking-widest transition"
          title="Change API Key"
        >
          {isEditingKey ? 'Cancel' : 'Key'}
        </button>
      {/if}
      {#if chatMessages.length > 0}
        <button
          onclick={() => (chatMessages = [])}
          class="font-black text-[10px] text-slate-400 hover:text-red-500 uppercase tracking-widest transition"
        >
          Clear
        </button>
      {/if}
    </div>
  </div>

  <div
    bind:this={chatContainer}
    class="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 overflow-y-auto scroll-smooth"
  >
    {#if !hasKey || isEditingKey}
      <div
        class="flex flex-col justify-center items-center space-y-6 px-4 h-full text-center"
        in:fade
      >
        <div class="bg-amber-50 p-4 rounded-3xl">
          <Key class="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h4 class="font-black text-slate-900 text-lg uppercase tracking-tight">
            {hasKey ? 'Update Gemini API Key' : 'Gemini API Key Required'}
          </h4>
          <p class="mt-2 max-w-[280px] font-medium text-slate-500 text-sm leading-relaxed">
            To use the AI assistant, you need a Gemini API key. Your key is stored locally in your browser.
          </p>
        </div>

        <form
          onsubmit={(e) => { e.preventDefault(); saveApiKey(); }}
          class="flex flex-col gap-3 w-full max-w-[300px]"
        >
          <input
            type="password"
            bind:value={apiKeyInput}
            placeholder="AIZA..."
            class="bg-slate-50 px-4 py-3 border border-slate-200 focus:border-amber-500 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 w-full text-sm transition-all"
            required
          />
          <div class="flex gap-2">
            {#if hasKey}
              <button
                type="button"
                onclick={() => {
                  localStorage.removeItem('gemini_api_key');
                  apiKeyInput = "";
                  hasKey = false;
                  isEditingKey = false;
                }}
                class="flex-1 bg-red-50 hover:bg-red-100 py-3 rounded-2xl font-bold text-red-600 text-sm transition-all"
              >
                Clear
              </button>
            {/if}
            <button
              type="submit"
              disabled={!apiKeyInput.trim() || isSavingKey}
              class="flex-[2] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 py-3 rounded-2xl font-bold text-white text-sm transition-all"
            >
              {isSavingKey ? 'Saving...' : hasKey ? 'Update Key' : 'Start Baking with AI'}
            </button>
          </div>
        </form>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 font-bold text-amber-600 text-xs hover:underline uppercase tracking-widest"
        >
          Get a free key from Google <ExternalLink class="w-3 h-3" />
        </a>
      </div>
    {:else if chatMessages.length === 0}
      <div class="flex flex-col justify-center items-center px-4 h-full text-center">
        <div class="flex justify-center items-center bg-slate-50 mb-4 rounded-2xl w-12 h-12">
          <MessageSquare class="w-6 h-6 text-slate-300" />
        </div>
        <p class="font-medium text-slate-400 text-sm leading-relaxed">
          Paste a recipe to import it, or ask me anything about sourdough baking, hydration, and crumb texture.
        </p>
      </div>
    {/if}

    {#each chatMessages as msg}
      <div
        class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}"
        in:fly={{ y: 10, duration: 300 }}
      >
        <div
          class="max-w-[85%] rounded-2xl px-4 py-3 text-sm {msg.role === 'user'
            ? 'bg-slate-900 text-white rounded-br-none shadow-lg'
            : 'bg-slate-100 text-slate-700 rounded-bl-none'}"
        >
          <div class="prose prose-sm prose-slate {msg.role === 'user' ? 'prose-invert' : ''}">
            <Markdown md={msg.content} />
          </div>
        </div>
      </div>
    {/each}

    {#if isAnalyzing}
      <div class="flex justify-start" in:fade>
        <div class="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-none">
          <Loader2 class="w-4 h-4 text-slate-400 animate-spin" />
        </div>
      </div>
    {/if}
  </div>

  <div class="bg-slate-50 p-4 border-slate-100 border-t">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        sendChatMessage();
      }}
      class="relative"
    >
      <input
        type="text"
        bind:value={userInput}
        disabled={!hasKey}
        placeholder={hasKey ? "Ask or paste a recipe..." : "Enter API key above to start"}
        class="bg-white disabled:bg-slate-50 py-3 pr-12 pl-4 border border-slate-200 focus:border-transparent rounded-xl focus:ring-2 focus:ring-amber-500 w-full text-sm transition-all disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!userInput.trim() || isAnalyzing || !hasKey}
        class="top-1.5 right-2 absolute bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 p-1.5 rounded-lg text-white disabled:text-slate-400 transition-all"
      >
        <Send class="w-4 h-4" />
      </button>
    </form>
  </div>
</div>
