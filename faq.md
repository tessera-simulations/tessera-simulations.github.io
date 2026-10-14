---
title: FAQ
permalink: /faq/
lede: Common questions about the suite.
body_class: faq
---

<details>
<summary>What does the name mean?</summary>
<p>A tessera is a single tile in a mosaic. Each zoom in the suite is one such tile, and global predictions are obtained only by combining them.</p>
</details>

<details>
<summary>Is Tessera a periodic simulation?</summary>
<p>No. It is a set of zoom resimulations of spherical regions, each 31 Mpc/h in radius, selected from (1.6 Gpc/h)³ particle-mesh parents. Global statistics are recovered by emulation rather than measured in a box. The parents themselves are not science products: their halo populations are unresolved and they are used only for the large-scale density field.</p>
</details>

<details>
<summary>How many cosmologies does it cover?</summary>
<p>Every zoom has its own cosmology. The full design has 8,192 points over seven parameters, including dynamical dark energy, and 1,041 zooms are complete. Because the design is a Sobol' sequence, any leading block is itself a balanced suite.</p>
</details>

<details>
<summary>What is the mass resolution?</summary>
<p>The high-resolution particle mass is 6.5 × 10⁸ M<sub>☉</sub>/h at the fiducial cosmology, scaling linearly with Ω<sub>m</sub>. Haloes are catalogued down to 20 particles, around 1.3 × 10¹⁰ M<sub>☉</sub>/h, and emulated above a conservative 100-particle floor of 10¹¹ M<sub>☉</sub>/h so that every zoom contributes to every mass bin on the same footing.</p>
</details>

<details>
<summary>Why particle-mesh parents?</summary>
<p>The parent exists only to supply the smoothed density field at the selection scale and the Lagrangian patch that seeds the zoom, both properties of the field on scales above 30 Mpc/h where particle-mesh and tree-PM solutions agree. A parent takes about ten minutes on one GPU, which is what makes a design of thousands affordable. We verify against a tree-PM run that the overdensity percentiles are reproduced to 0.24 percentile points at all epochs.</p>
</details>

<details>
<summary>Can I measure clustering in the zooms?</summary>
<p>Pairs can be counted inside each region, but a zoom provides no full-box mean number density, so clustering statistics must be emulated rather than measured directly. Companion work joins the small-scale pair counts to a perturbation-theory prediction on large scales.</p>
</details>

<details>
<summary>Are there galaxies?</summary>
<p>The simulations are dark-matter-only, but each zoom writes 140 snapshots so that merger trees can be built, and the SHARK semi-analytic model is run on those trees. Synthesizer then forward-models the emission, giving photometry and spectra for every galaxy. Hydrodynamic zooms at CAMELS-like resolution are planned.</p>
</details>

<details>
<summary>Which haloes should I count?</summary>
<p>Count within the mapped 31 Mpc/h selection sphere, intersected with the clean mask. The whole clean volume of a zoom is a biased counting volume: the padding shell that survives contamination is preferentially underdense, which suppresses the mass function by up to a third at cluster masses.</p>
</details>

<details>
<summary>When will the data be public?</summary>
<p>The first release will accompany the suite paper, which is in preparation. Collaborators can access the catalogues now on request; see the <a href="/data/">Data</a> page.</p>
</details>

<details>
<summary>How do I cite Tessera?</summary>
<p>Cite the suite paper for any use of the data, and the halo mass function emulator paper if you use the emulation framework. Both are on the <a href="/publications/">Publications</a> page.</p>
</details>

<details>
<summary>Where was it run?</summary>
<p>On the DiRAC COSMA facility at Durham University. Each zoom fits on a single 28-core node with under 64 GB of memory, so the suite runs as a job array without requiring a dedicated allocation.</p>
</details>
