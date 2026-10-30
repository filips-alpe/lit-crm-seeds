<script lang="ts">
  import type { TermSpan } from './money';
  import * as m from '$lib/paraglide/messages.js';

  let { span }: { span: TermSpan } = $props();
</script>

{#if span.kind === 'year'}
  {m.flaky_careful_flea_honor()}
{:else if span.kind === 'years'}
  {m.awful_lazy_seahorse_intend({ n: span.n })}
{:else if span.kind === 'months'}
  {m.green_few_jaguar_foster({ n: span.n })}
{:else}
  {m.any_key_cobra_list({ n: span.n })}
{/if}
