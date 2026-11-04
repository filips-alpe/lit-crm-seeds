<script lang="ts">
  import { resolve } from '$app/paths';
  import type { SeasonPoint } from './seasons';

  // The years of the correspondence as a single line, a pearl per letter.
  let { points, color }: { points: SeasonPoint[]; color: string } = $props();
</script>

{#if points.length}
  <div class="px-6 pt-10 pb-12">
    <div class="relative h-px bg-stone-300">
      {#each points as p (p.id)}
        <a
          href={resolve('/(app)/data/[id]', { id: p.id })}
          class="group absolute -translate-x-1/2"
          style="left: {p.pct}%; top: -6px"
          title={p.title}
        >
          <span
            class="block size-3 rounded-full ring-4 ring-white"
            style="background-color: {color}"
          ></span>
          <span
            class="absolute top-5 left-1/2 w-32 -translate-x-1/2 text-center font-serif text-xs text-stone-600 group-hover:underline"
            >{p.year}<br />{p.title}</span
          >
        </a>
      {/each}
    </div>
  </div>
{/if}
