import Bfranklin from './bfranklin/Dashboard.svelte';
import Dfranklin from './dfranklin/Dashboard.svelte';
import Mstevenson from './mstevenson/Dashboard.svelte';
import Phewson from './phewson/Dashboard.svelte';
import Wtfranklin from './wtfranklin/Dashboard.svelte';
import Wfranklin from './wfranklin/Dashboard.svelte';
import Sbache from './sbache/Dashboard.svelte';
import Pcollinson from './pcollinson/Dashboard.svelte';
import Tcushing from './tcushing/Dashboard.svelte';
import Ahelvetius from './ahelvetius/Dashboard.svelte';
import Jadams from './jadams/Dashboard.svelte';
import Tjefferson from './tjefferson/Dashboard.svelte';
import Lafayette from './lafayette/Dashboard.svelte';
import Gsharp from './gsharp/Dashboard.svelte';
import Estiles from './estiles/Dashboard.svelte';
import Jcaillot from './jcaillot/Dashboard.svelte';
import Montgolfier from './montgolfier/Dashboard.svelte';
import type { DashboardComponent } from '$lib/dashboards/types';

/** Per-user dashboards, keyed by `User.username`. */
export const dashboards: Record<string, DashboardComponent> = {
  bfranklin: Bfranklin,
  dfranklin: Dfranklin,
  mstevenson: Mstevenson,
  phewson: Phewson,
  wtfranklin: Wtfranklin,
  wfranklin: Wfranklin,
  sbache: Sbache,
  pcollinson: Pcollinson,
  tcushing: Tcushing,
  ahelvetius: Ahelvetius,
  jadams: Jadams,
  tjefferson: Tjefferson,
  lafayette: Lafayette,
  gsharp: Gsharp,
  estiles: Estiles,
  jcaillot: Jcaillot,
  montgolfier: Montgolfier,
};
