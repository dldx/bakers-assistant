<script lang="ts">
  import {
    Sparkles,
    MessageSquare,
    Loader2,
    Send,
    Key,
    ExternalLink,
    Image as ImageIcon,
    Camera,
    Plus,
    X,
  } from "lucide-svelte";
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import Markdown from "svelte-exmarkdown";
  import { getBakerAssistantResponse, type ChatMessage } from "$lib/aiService";
  import type { Ingredient, RecipeStage } from "$lib/types";
  import { toast } from "svelte-sonner";
  import { Textarea } from "$lib/components/ui/textarea";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  interface Props {
    recipeName: string;
    ingredients: Ingredient[];
    stages: RecipeStage[];
    hydration: number;
    portions: number;
    isScalingEnabled: boolean;
    notes: string;
    onUpdateRecipe: (data: {
      recipeName?: string;
      ingredients?: Ingredient[];
      stages?: RecipeStage[];
      portions?: number;
      isScalingEnabled?: boolean;
      targetHydration?: number;
      notes?: string;
    }) => void;
  }

  let { recipeName, ingredients, stages, hydration, portions, isScalingEnabled, notes, onUpdateRecipe }: Props = $props();

  let chatMessages = $state<ChatMessage[]>([]);
  let userInput = $state("");
  let isAnalyzing = $state(false);
  let isEditingKey = $state(false);
  let chatContainer = $state<HTMLElement | null>(null);

  // Image handling
  let pendingImage = $state<{ data: string; mimeType: string } | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let cameraInput = $state<HTMLInputElement | null>(null);

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
    toast.success("API Key saved");
  }

  $effect(() => {
    if (chatMessages.length > 0 && chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  async function handleFileSelection(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      pendingImage = {
        data: base64Data,
        mimeType: file.type
      };
    };
    reader.readAsDataURL(file);
    target.value = '';
  }

  async function sendChatMessage() {
    if ((!userInput.trim() && !pendingImage) || isAnalyzing) return;

    const message = userInput.trim();
    const image = pendingImage ? { ...pendingImage } : undefined;

    chatMessages.push({ role: "user", content: message, image });
    userInput = "";
    pendingImage = null;
    isAnalyzing = true;

    try {
      const response = await getBakerAssistantResponse(chatMessages, {
        recipeName,
        ingredients,
        stages,
        hydration,
        portions,
        notes,
        isScalingEnabled,
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
        toast.info("Recipe updated by AI analysis");
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

      toast.error(errorMessage);
      chatMessages.push({
        role: "assistant",
        content: errorMessage,
      });
    } finally {
      isAnalyzing = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }
</script>

<div
  class="flex flex-col bg-white shadow-slate-200/40 shadow-xl border border-slate-200 rounded-0 sm:rounded-4xl h-full min-h-100"
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
          onclick={() => {
            chatMessages = [];
            pendingImage = null;
          }}
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
          <p class="mt-2 max-w-70 font-medium text-slate-500 text-sm leading-relaxed">
            To use the AI assistant, you need a Gemini API key. Your key is stored locally in your browser.
          </p>
        </div>

        <form
          onsubmit={(e) => { e.preventDefault(); saveApiKey(); }}
          class="flex flex-col gap-3 w-full max-w-75"
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
              class="flex-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 py-3 rounded-2xl font-bold text-white text-sm transition-all"
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
          {#if msg.image}
            <div class="mb-2 max-w-full overflow-hidden">
              <img
                src="data:{msg.image.mimeType};base64,{msg.image.data}"
                alt="Chat attachment"
                class="shadow-sm rounded-lg w-auto max-h-64 sm:max-h-96 object-contain"
              />
            </div>
          {/if}
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
    {#if pendingImage}
      <div class="relative bg-white shadow-sm mb-3 p-1.5 border border-slate-200 rounded-2xl w-24 h-24" in:fade>
        <img
          src="data:{pendingImage.mimeType};base64,{pendingImage.data}"
          alt="Pending upload"
          class="rounded-xl w-full h-full object-cover"
        />
        <button
          onclick={() => pendingImage = null}
          class="-top-2 -right-2 absolute bg-slate-900 hover:bg-red-500 shadow-md p-1 border-2 border-white rounded-full text-white transition-colors"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    {/if}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        sendChatMessage();
      }}
      class="flex items-end gap-2"
    >
      <div class="relative flex-1">
        <Textarea
          bind:value={userInput}
          disabled={!hasKey}
          onkeydown={handleKeydown}
          placeholder={hasKey ? (pendingImage ? "Describe this photo..." : "Ask or paste a recipe...") : "Enter API key above to start"}
          class="bg-white disabled:bg-slate-50 shadow-sm py-3 pr-12 pl-4 border border-slate-200 focus:border-transparent rounded-xl focus:ring-2 focus:ring-amber-500 w-full min-h-11.5 text-sm transition-all resize-none disabled:cursor-not-allowed no-scrollbar"
          rows={1}
        />
        <input
          type="file"
          accept="image/*"
          bind:this={fileInput}
          onchange={handleFileSelection}
          class="hidden"
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          bind:this={cameraInput}
          onchange={handleFileSelection}
          class="hidden"
        />
        <div class="right-2 bottom-1.5 absolute">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              disabled={!hasKey || isAnalyzing}
              class="flex justify-center items-center hover:bg-slate-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
              title="Add image"
            >
              <Plus class="w-5 h-5" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="shadow-xl border-slate-100 rounded-xl">
              <DropdownMenu.Item
                onclick={() => cameraInput?.click()}
                class="flex items-center gap-2 mx-1 my-0.5 px-3 py-2 rounded-lg cursor-pointer"
              >
                <Camera class="w-4 h-4" />
                <span>Take Photo</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => fileInput?.click()}
                class="flex items-center gap-2 mx-1 my-0.5 px-3 py-2 rounded-lg cursor-pointer"
              >
                <ImageIcon class="w-4 h-4" />
                <span>Choose Photo</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
      <button
        type="submit"
        disabled={(!userInput.trim() && !pendingImage) || isAnalyzing || !hasKey}
        class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 shadow-sm px-4 rounded-xl h-11.5 text-white disabled:text-slate-400 transition-all shrink-0"
      >
        <Send class="w-4 h-4" />
      </button>
    </form>
  </div>
</div>
