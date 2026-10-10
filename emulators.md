---
title: Emulators
permalink: /emulators/
lede: Conditional normalising flows that learn each statistic as a function of cosmology and environment, and the integration that turns region-level predictions into global ones.
math: true
---

## The framework

Every emulator in Tessera has the same structure. A one-point distribution function Φ of some variable m depends on the cosmological parameters θ of a parent and on the local overdensity δ of a region within it. We build a neural density estimator

$$\hat\Phi(m \mid \theta, \delta) \sim \Phi(m \mid \theta, \delta) + \epsilon(m \mid \theta, \delta),$$

where ε is the bias of the emulator, and recover the global function by integrating it against the overdensity distribution of the parent,

$$\Phi_{\rm global}(m \mid \theta) = \int \Phi(m \mid \theta, \delta)\, p(\delta \mid \theta)\, {\rm d}\delta .$$

The integral is evaluated by Monte Carlo: a target volume is tiled with independent regions, each assigned an overdensity drawn from p(δ &#124; θ), and the predicted counts are summed. Repeating this gives a distribution of global predictions from which we quote a median and a 16–84 per cent interval. The models are implemented in JAX and are fully differentiable, so they can be embedded directly in gradient-based inference pipelines.

For a cosmology in the design, p(δ &#124; θ) is measured: the quantile table of the parent at the selection radius is the inverse CDF from which overdensities are drawn. For an arbitrary cosmology the low-order moments of log₁₀(1 + δ) are modelled as quadratic functions of θ, fitted to all parents, and the distribution is reconstructed with an Edgeworth expansion.

## Count emulators

For binned counts such as the halo mass function, the prediction is decomposed into a baseline, the mean over all training regions, and a residual predicted by a conditional normalising flow. Counts in each bin are modelled as Poisson draws about the flow-predicted rate, and the intractable likelihood is marginalised by Monte Carlo over latent samples. The conditioning vector has eight entries: log₁₀(1 + δ) of the region and the seven cosmological parameters.

| | Halo mass function | Concentration–mass |
|---|---|---|
| Target | counts in 16 mass bins | log₁₀ c<sub>200c</sub> |
| Mass range (M<sub>☉</sub>/h) | 10¹¹ – 10¹⁵ | > 10¹¹ |
| Conditioning inputs | δ, 7 cosmological | M<sub>200c</sub>, δ, 7 cosmological |
| Flow | 4 scalar affine layers, 128 hidden units | 3 affine layers, 64 hidden units |
| Likelihood | Poisson, 16 latent samples | exact |
| Training set | 1,041 regions | 3.1 × 10⁵ haloes |
| Split by parent | 80 / 10 / 10 | 90 / 10 |

Splits are made at the level of the parent, so no cosmology or white-noise realisation is shared between training and test sets. Both models train on a CPU in minutes.

{% include figure.html src="/assets/img/figures/hmf_regions_fof_z0.webp" alt="Emulated halo mass functions for six held-out zoom regions against the measured counts" caption="The z = 0 FoF halo mass function of six held-out regions, spanning the best to the worst fits. Points are measured counts with Poisson errors, the blue line is the emulator at the region's overdensity and cosmology, and the band is the emulated finite-volume range. Grey is the emulator at the fiducial cosmology." wide=true %}

{% include figure.html src="/assets/img/figures/hmf_response_fof_z0.webp" alt="Response of the emulated halo mass function to overdensity and to each cosmological parameter" caption="Response of the emulated mass function to the region overdensity (top left) and to each of the seven cosmological parameters, with all other inputs held at the training mean. Environment is the dominant dependence; Ω<sub>m</sub> scales the abundance and σ<sub>8</sub> tilts it about a pivot near 10¹³ M<sub>☉</sub>/h." wide=true %}

## Relation emulators

Relations between halo properties use a second, per-object flow. For the concentration–mass relation we model the full conditional distribution p(log₁₀ c &#124; M<sub>200c</sub>, δ, θ), which amounts to a conditional Gaussian whose mean and width are free functions of mass, environment and cosmology. Haloes are drawn flat in log mass so that rare massive haloes are retained; a conditional density is not biased by how its conditioning variable is sampled. The global relation is the mixture of region-level densities over p(δ &#124; θ), weighted at each mass by the emulated halo abundance.

{% include figure.html src="/assets/img/figures/cM_response_z0.webp" alt="Response of the median concentration–mass relation to overdensity and to each cosmological parameter" caption="Response of the median concentration–mass relation to each input. The dependence on the 31 Mpc/h overdensity is weak; the dependence on cosmology, and in particular on the dark energy parameters through the growth history, is much stronger." wide=true %}

## Galaxy statistics

The same machinery applies to any statistic measured in the regions. On the SHARK galaxies and Synthesizer photometry we have trained emulators for the stellar mass function, the g-band luminosity function, the g − r colour distribution and the star-forming main sequence, each conditioned on cosmology and environment and integrated to a global prediction.

{% include figure.html src="/assets/img/figures/smf_global_shark_z0.webp" alt="Global stellar mass functions recovered by the emulator for held-out cosmologies" caption="Global z = 0 stellar mass functions recovered for held-out parents by integrating the SHARK emulator over each parent's overdensity distribution." wide=true %}

{% include figure.html src="/assets/img/figures/lf_sweep_shark_g_z0.webp" alt="Emulated g-band luminosity function as each parameter is swept" caption="The emulated g-band luminosity function as each cosmological parameter is swept over its prior." wide=true %}

## Clustering

Two-point statistics need more than a one-point emulator, because a zoom provides no full-box catalogue from which to measure the mean number density. In companion work we emulate the halo correlation function from zoom regions alone: pairs counted inside each region give the small-scale clustering, while on large scales a perturbation-theory matter correlation function is multiplied by a linear bias emulated from the response of the halo abundance to the region overdensity. Validated on Quijote with 0.1 per cent of the box volume, the joined prediction recovers the halo correlation function to a few per cent at 10 Mpc/h and to the box's own sample-variance floor above 30 Mpc/h.

{% include figure.html src="/assets/img/figures/clustering_global.webp" alt="Halo correlation function emulated from zoom regions against the full-box measurement for six held-out Quijote cosmologies" caption="The joined correlation-function prediction against the full-box truth for six held-out Quijote cosmologies spanning the error range." wide=true %}

## Software

The emulators are trained and integrated with a small Python package built on JAX, which will be released alongside the suite. It provides the count and relation flows, the Poisson likelihood, the Edgeworth model of p(δ &#124; θ), and the Monte Carlo integration to global predictions. Trained weights for every emulator on this page will ship with the first data release.
