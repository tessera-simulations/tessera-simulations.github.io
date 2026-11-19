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

<div class="emu-desc" data-model="xi" data-label="Halo correlation function" markdown="1">
Real-space two-point correlation function $$\xi_\mathrm{hh}(r)$$ of central haloes above $$10^{11}\,h^{-1}\,M_\odot$$ at $$z = 0$$, from the pairs inside the zooms' $$26\,h^{-1}\,\mathrm{Mpc}$$ spheres alone, so it stops at $$15\,h^{-1}\,\mathrm{Mpc}$$; below $$0.5\,h^{-1}\,\mathrm{Mpc}$$ it is suppressed by halo exclusion. The distilled network's largest errors, up to $$0.4$$ dex, are at $$11$$–$$15\,h^{-1}\,\mathrm{Mpc}$$ in one corner of the parameter space (the lowest $$\Omega_\mathrm{b}$$ and $$\sigma_8$$ with the most negative $$w_a$$), where $$\xi_\mathrm{hh}$$ nearly vanishes; below $$9\,h^{-1}\,\mathrm{Mpc}$$ they are under $$0.05$$ dex.
</div>

<div class="emu-desc" data-model="cm" data-label="Concentration–mass relation" markdown="1">
Median and 16–84% range of the NFW concentration $$c_{200\mathrm{c}}$$ (from $$V_\mathrm{max}/V_{200\mathrm{c}}$$) of central haloes above $$10^{12}\,h^{-1}\,M_\odot$$ at $$z = 0$$.
</div>

<div class="emu-desc" data-model="spin" data-label="Spin parameter" markdown="1">
Median and 16–84% range of the Bullock spin parameter $$\lambda_\mathrm{B}$$ (angular momentum within the virial radius) of central haloes above $$10^{12}\,h^{-1}\,M_\odot$$ at $$z = 0$$. Nearly independent of cosmology; it falls slowly with mass above $$10^{13.5}\,h^{-1}\,M_\odot$$.
</div>

<div class="emu-desc" data-model="zform" data-label="Formation redshift" markdown="1">
Median and 16–84% range of the half-mass formation redshift, shown as $$1 + z_{1/2}$$, of central haloes above $$10^{11.5}\,h^{-1}\,M_\odot$$ at $$z = 0$$: when the main progenitor's bound mass, along its HBT-HERONS track, first reached half its present value.
</div>

<div class="emu-desc" data-model="acc" data-label="Accretion rate" markdown="1">
Median and 16–84% range of the accretion rate $$\Gamma_\mathrm{dyn} = \Delta\ln M / \Delta\ln a$$ of the bound mass over the last dynamical time, of central haloes above $$10^{11.5}\,h^{-1}\,M_\odot$$ at $$z = 0$$.
</div>

<script src="{{ '/assets/js/emulator.js' | relative_url }}" defer></script>
