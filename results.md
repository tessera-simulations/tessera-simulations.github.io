---
title: Results
permalink: /results/
lede: First results from the 1,041 completed zooms at z = 0. Figures will be updated as the suite grows and the papers are finalised.
wide: true
---

<div class="prose" style="padding-top:0; max-width:46em">
<h2 style="margin-top:0">The suite as a population</h2>
<p>Each zoom samples a different cosmology and a different environment, so the statistics measured across the suite span a wide range by construction. The figures below show the raw measurements, before emulation, for the halo mass function from SWIFT, the stellar mass function from SHARK, and the g-band luminosity function and g − r colour from Synthesizer.</p>
</div>

<div class="cards">
  <div class="card">
    <a href="{{ '/assets/img/figures/hmf_suite_z0_z2.webp' | relative_url }}"><img src="{{ '/assets/img/figures/hmf_suite_z0_z2.webp' | relative_url }}" alt="Halo mass functions of every zoom at z = 0 and z = 2" loading="lazy"></a>
    <h3>Halo mass functions</h3>
    <p>Every zoom at z = 0 and z = 2, coloured by region overdensity.</p>
  </div>
  <div class="card">
    <a href="{{ '/assets/img/figures/gsmf_suite_z0_z2.webp' | relative_url }}"><img src="{{ '/assets/img/figures/gsmf_suite_z0_z2.webp' | relative_url }}" alt="Galaxy stellar mass functions of every zoom at z = 0 and z = 2 from SHARK" loading="lazy"></a>
    <h3>Stellar mass functions</h3>
    <p>SHARK galaxies in every zoom at z = 0 and z = 2.</p>
  </div>
  <div class="card">
    <a href="{{ '/assets/img/figures/lf_g_suite_z0.webp' | relative_url }}"><img src="{{ '/assets/img/figures/lf_g_suite_z0.webp' | relative_url }}" alt="g-band luminosity functions of every zoom at z = 0" loading="lazy"></a>
    <h3>Luminosity functions</h3>
    <p>Synthesizer g-band luminosity functions at z = 0.</p>
  </div>
  <div class="card">
    <a href="{{ '/assets/img/figures/colour_gr_suite_z0.webp' | relative_url }}"><img src="{{ '/assets/img/figures/colour_gr_suite_z0.webp' | relative_url }}" alt="g − r colour distributions of every zoom at z = 0" loading="lazy"></a>
    <h3>Colour distributions</h3>
    <p>g − r colour distributions at z = 0.</p>
  </div>
</div>

<div class="prose" style="max-width:46em">

<h2>Halo mass function</h2>

<p>On 104 held-out test regions the emulator follows the measured mass function over four decades in mass, across regions whose abundances differ by a factor of several through the combined effect of environment and cosmology. The 16–84 per cent spread of the residuals tracks the Poisson expectation at every mass, from ±6 per cent at 10¹¹ M<sub>☉</sub>/h to ±35 per cent at 10¹³·⁴ M<sub>☉</sub>/h, so the region-level error is dominated by shot noise in the test regions rather than by the emulator. Stacking the held-out regions, the ratio of measured to emulated counts lies between 0.97 and 1.03 in every bin up to 10¹³·⁴ M<sub>☉</sub>/h.</p>

{% include figure.html src="/assets/img/figures/hmf_fractional_fof_z0.webp" alt="Fractional residual of the measured mass function about the emulator over the held-out regions" caption="Fractional residual of the measured FoF mass function about the emulator over the 104 held-out regions: the median region, the 16–84 per cent range across regions, and the Poisson expectation for the median region." %}

<p>A zoom suite provides no full-box measurement against which to test the global prediction, so we compare against an independent suite: the Quijote Big Sobol Sequence, of which 271 boxes fall inside our design. The emulator agrees with Quijote in shape and in its response to cosmology over the mass range Quijote resolves, and extends the prediction 2.5 dex below the Quijote resolution limit. A residual offset of around ten per cent, close to independent of cosmology, is under investigation; the leading candidates are the resolution of Quijote's FoF masses and the position of ΛCDM at the edge of our dark energy design.</p>

{% include figure.html src="/assets/img/figures/hmf_global_fof_z0.webp" alt="Global halo mass functions predicted by the emulator for six Quijote cosmologies against the full-box measurements" caption="Global z = 0 FoF mass function predicted by the emulator (blue) for six Quijote cosmologies inside the design, compared with the mass function measured in the full (1 Gpc/h)³ Quijote box (points). Lower panels show the fractional difference." wide=true %}

{% include figure.html src="/assets/img/figures/hmf_quijote_fof_z0.webp" alt="Ratio of the emulated global mass function to Quijote over 271 boxes" caption="Top: emulated global mass functions for six Quijote cosmologies spanning σ<sub>8</sub>, with the Quijote measurements. Bottom: ratio of emulator to Quijote for the same boxes, and the median and 16–84 per cent range over all 271 boxes inside the design." %}

<h2>Concentration–mass relation</h2>

<p>Concentration needs many more particles per halo than mass does, so the resolution gain of the zooms is felt more strongly here. The relation flow recovers region-to-region differences in normalisation of up to 0.2 dex, driven by both cosmology and environment. Over 31,200 held-out haloes the residual about the predicted median is offset by less than 0.02 dex at all masses, with a scatter of 0.13 dex that matches the width the flow predicts; 71 per cent of haloes fall inside the predicted 16–84 per cent band. The relation turns over below 10¹² M<sub>☉</sub>/h in every region, which is the resolution limit of the R<sub>max</sub> proxy rather than a physical feature.</p>

{% include figure.html src="/assets/img/figures/cM_regions_z0.webp" alt="Concentration–mass relation in six held-out zooms against the flow prediction" caption="The z = 0 concentration–mass relation of HBT-HERONS centrals in six held-out zooms. Points are binned medians; the blue line and band are the median and 16–84 per cent range of the flow at the region's overdensity and cosmology; grey is the fiducial cosmology." wide=true %}

{% include figure.html src="/assets/img/figures/cM_global_z0.webp" alt="Global concentration–mass relation predicted for six held-out parents" caption="Global z = 0 concentration–mass relation predicted for six held-out parents, mixing the region-level flow over each parent's overdensity distribution with abundance weighting. Because the environmental dependence is weak, the variation between panels is cosmological." wide=true %}

<h2>Galaxies</h2>

<p>The same emulation pipeline runs on the SHARK galaxy catalogues and their Synthesizer photometry. The figures below show global reconstructions for held-out parents and the response of each statistic to the cosmological parameters.</p>

{% include figure.html src="/assets/img/figures/smf_regions_shark_z0.webp" alt="Emulated stellar mass functions for held-out regions" caption="Emulated z = 0 stellar mass functions for six held-out regions, against the SHARK measurements." wide=true %}

{% include figure.html src="/assets/img/figures/pdf_global_shark_g-r_z0.webp" alt="Global g − r colour distributions for held-out parents" caption="Global g − r colour distributions recovered for held-out parents." wide=true %}

{% include figure.html src="/assets/img/figures/sfms_sweep_z0.webp" alt="Emulated star-forming main sequence as each parameter is swept" caption="The emulated star-forming main sequence as each cosmological parameter is swept over its prior." %}

<h2>Where this leads</h2>

<p>The stored snapshots support the same analysis at higher redshift, and the merger trees allow accretion histories to be measured for every halo. Beyond the one-point functions shown here, work in progress includes two-point clustering from zoom regions, active learning for region placement, multi-fidelity training with a small number of hydrodynamic zooms, and field-level emulation. See the <a href="/publications/">Publications</a> page for the papers in preparation.</p>

</div>
