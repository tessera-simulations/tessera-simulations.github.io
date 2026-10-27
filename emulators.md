---
title: Emulators
permalink: /emulators/
wide: true
lede: The suite's halo statistics as functions of cosmology. Move the sliders to see how the global halo mass function and the concentration–mass relation respond; everything runs in your browser.
---

Each zoom measures haloes in one environment of one cosmology. The emulators learn those measurements as functions of the cosmological parameters and the local overdensity, then average over the distribution of overdensities in each cosmology to predict the statistic over the whole universe. The widgets below run a small network distilled from those global predictions, so a curve takes well under a millisecond to recompute.

## Halo mass function

The comoving number density of haloes per decade of $$M_{200\mathrm{c}}$$ (SOAP spherical-overdensity masses of HBT-HERONS centrals), from one emulator per snapshot from $$z = 0$$ to $$z \approx 9$$. The upper mass limit falls with redshift as massive haloes become rare in the zooms.

<div class="emulator" data-src="{{ '/assets/data/emulators/hmf.json' | relative_url }}"><p class="muted">Loading the emulator…</p></div>

## Concentration–mass relation

The median and 16–84% range of the NFW concentration $$c_{200\mathrm{c}}$$, from $$V_\mathrm{max}/V_{200\mathrm{c}}$$, of central haloes above $$10^{12}\,h^{-1}\,M_\odot$$ at $$z = 0$$, each environment weighted by its abundance of haloes of that mass.

<div class="emulator" data-src="{{ '/assets/data/emulators/cm.json' | relative_url }}"><p class="muted">Loading the emulator…</p></div>

<script src="{{ '/assets/js/emulator.js' | relative_url }}" defer></script>
