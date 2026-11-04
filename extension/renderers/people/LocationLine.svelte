<script lang="ts">
  // A place name with its coordinates as a quiet suffix; either may be missing.
  let {
    place,
    geo,
    class: className,
  }: { place: string | null; geo: string | null; class?: string } = $props();
</script>

{#if place || geo}
  <span class={['inline-flex min-w-0 items-baseline gap-1', className]}>
    <svg
      class="size-3 shrink-0 self-center"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
    {#if place}<span class="truncate">{place}</span>{/if}
    {#if geo}<span class="shrink-0 text-[10px] text-stone-400 tabular-nums">{geo}</span>{/if}
  </span>
{/if}
