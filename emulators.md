---
title: Emulators
permalink: /emulators/
wide: true
math: true
lede: Halo statistics from the suite as functions of cosmology.
---

The emulators are trained on the zooms as functions of the cosmological parameters and the local overdensity, then averaged over the overdensity distribution of each cosmology to give the global statistic. The widget runs a small network distilled from those predictions. Select a relation and move the sliders; the dashed curve is the fiducial (Planck 2018) cosmology, and the solid curve is coloured by the parameter last changed.

<div class="emulator" data-base="{{ '/assets/data/emulators/' | relative_url }}"><p class="muted">Loading the emulator…</p></div>

<div class="emu-desc" data-model="hmf" data-label="Halo mass function" markdown="1">
Comoving number density of central haloes per decade of $$M_{200\mathrm{c}}$$ (SOAP masses, HBT-HERONS centrals) at snapshots from $$z = 0$$ to $$z \approx 9$$. The upper mass limit falls with redshift.
</div>

<div class="emu-desc" data-model="cm" data-label="Concentration–mass relation" markdown="1">
Median and 16–84% range of the NFW concentration $$c_{200\mathrm{c}}$$ (from $$V_\mathrm{max}/V_{200\mathrm{c}}$$) of central haloes above $$10^{12}\,h^{-1}\,M_\odot$$ at $$z = 0$$.
</div>

<script src="{{ '/assets/js/emulator.js' | relative_url }}" defer></script>
