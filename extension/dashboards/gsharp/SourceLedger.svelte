<script lang="ts">
  import { resolve } from '$app/paths';
  import { formatDate } from '$lib/utils/formatDate';
  import type { SourceEntry } from './sources';
  /* eslint-disable svelte/no-navigation-without-resolve -- external source links */

  // Reference notes pulled off the records, each linking back to its record.
  let { entries, color, empty }: { entries: SourceEntry[]; color: string; empty?: string } =
    $props();
</script>

{#if entries.length}
  <ul class="space-y-3">
    {#each entries as e (e.id + e.reference)}
      <li class="border-l-4 pl-3" style="border-color: {color}">
        {#if e.href}
          <a
            href={e.href}
            target="_blank"
            rel="noopener noreferrer"
            class="block font-serif text-base break-all text-stone-800 hover:underline">{e.label}</a
          >
        {:else}
          <p class="font-serif text-base text-stone-800">{e.reference}</p>
        {/if}
        <a
          href={resolve('/(app)/data/[id]', { id: e.id })}
          class="text-xs text-stone-500 hover:underline">{formatDate(e.date)} · {e.title}</a
        >
      </li>
    {/each}
  </ul>
{:else if empty}
  <p class="py-3 text-center text-sm text-stone-400">{empty}</p>
{/if}
