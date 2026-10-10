---
title: About
permalink: /about/
lede: Tessera replaces the monolithic simulation box with a designed mosaic of zoom resimulations, and replaces the measurement of global statistics with their emulation.
math: true
---

## The problem

The next generation of wide-field surveys will measure the properties of billions of galaxies over gigaparsec volumes. Their clustering analyses use luminous red galaxies, emission-line galaxies and quasars as tracers of the matter distribution, and interpreting them requires a model of how each population occupies dark matter haloes. Current analyses supply this through halo occupation models with no galaxy-formation physics, absorbing assembly bias and cross-correlations into nuisance parameters that inflate the uncertainties on cosmological parameters.

Replacing those nuisance parameters with physical models means simulating the haloes in which galaxies form, and the simulations must meet several requirements at once:

- span volumes comparable to the survey footprints, tens of Gpc³ out to z ~ 2, to capture large-scale modes and the rare, massive haloes;
- resolve the lower-mass haloes that host emission-line galaxies, and their assembly histories;
- cover cosmological and galaxy-formation parameter space densely enough to train emulators or simulation-based inference;
- write outputs often enough to build the merger trees that semi-analytic models need.

No existing suite satisfies all four. Gigaparsec N-body boxes exist for one or a few cosmologies, or for hundreds of cosmologies at particle masses above 10⁹ M<sub>☉</sub>/h. The largest hydrodynamic boxes cost around 5 × 10⁷ core-hours for a single cosmology. Quijote varies cosmology over tens of thousands of boxes but at particle masses above 10¹¹ M<sub>☉</sub>/h, and CAMELS varies cosmology and feedback over thousands of hydrodynamic runs in volumes of only (25–50 Mpc/h)³.

{% include figure.html src="/assets/img/figures/resolution_volume.webp" alt="Periodic cosmological simulations since 2010 on the resolution–volume plane" caption="Periodic cosmological simulations published since 2010 on the resolution–volume plane. Purple points are dark-matter-only, orange hydrodynamic; open circles are members of the Quijote and CAMELS suites. Horizontal lines give the comoving volume of the Euclid Wide and Deep footprints. Tessera is placed at the volume of one parent and the particle mass of its zooms." %}

## Composite zooms

Zoom resimulation is the complementary lever. A region is selected from a large, low-resolution parent volume and re-run at much higher resolution, retaining the large-scale tidal field while gaining mass resolution at modest cost. When enough regions spanning a range of environments are combined with appropriate weights, the resulting composite distribution functions approximate those of the parent.

In a [proof-of-concept study](https://arxiv.org/abs/2604.17981) we formalised this as an emulation problem. A normalising flow for the halo mass function was trained on small regions drawn from the Quijote Big Sobol Sequence, conditioned on the overdensity of each region and the cosmology of its parent. Integrating the flow over the overdensity distribution of the parent recovered the global mass function of the full (1 Gpc/h)³ box using 0.026 per cent of the simulated volume. That work was run entirely within existing periodic boxes, so the method was validated but the resolution gain that motivates it was never realised.

Tessera is the realisation of that gain.

## The pipeline

### 1. A designed suite of parents

The suite is generated from a single scrambled Sobol' sequence of 8,192 points in 38 dimensions. Seven columns set the cosmology: Ω<sub>m</sub>, Ω<sub>b</sub>, h, n<sub>s</sub>, σ<sub>8</sub> and the dynamical dark energy pair (w<sub>0</sub>, w<sub>0</sub> + w<sub>a</sub>). One column sets the overdensity percentile at which the region is selected. The remaining 30 are reserved for galaxy-formation parameters, so that the same suite can later vary cosmology and galaxy formation jointly.

Because the sequence is low-discrepancy, any leading prefix is itself a balanced design. The suite can be run and released in power-of-two increments without recomputing the design or re-weighting the training set.

Each parent is a (1.6 Gpc/h)³ periodic volume of 1024³ particles, evolved to z = 0 with [pmwd](https://github.com/eelregit/pmwd), a differentiable particle-mesh code written in JAX, in about ten minutes on a single GPU. A particle-mesh integrator cannot resolve haloes, but it is not required to: the parent exists only to supply the large-scale density field on which regions are selected and the Lagrangian patch that seeds the zoom. We verify against a full tree-PM run that the parents reproduce the overdensity percentiles at the selection scale to within 0.24 percentile points at all epochs.

{% include figure.html src="/assets/img/figures/design_corner_cosmo.webp" alt="Corner plot of the seven-dimensional cosmological design" caption="The cosmological design. Grey shows all 8,192 rows of the Sobol' sequence; coloured points are the parents whose zoom has been started and those with completed halo catalogues. Dotted lines mark the uniform core of each prior, beyond which half-normal tails extend." %}

### 2. Region selection by rank

The overdensity field of each parent is measured in spherical apertures of radius 31 Mpc/h centred on a 128³ lattice. The sphere of this radius has the same volume as a (50 Mpc/h)³ cube. Following the proof of concept, we select on the *percentile* of the overdensity within each parent rather than on its value, which bounds the design coordinate to [0, 100] for every cosmology and cancels any monotonic bias in the particle-mesh density field.

Each parent contributes one region, at the percentile given by its own Sobol' coordinate, so that the suite as a whole samples cosmology and environment jointly rather than on a product grid. The particles within the selected sphere, padded by 2 Mpc, are traced back to the initial conditions; if a massive halo straddles the boundary it is absorbed in full rather than rejected, which would bias against dense environments.

### 3. Zoom resimulation with SWIFT

Zoom initial conditions are generated with monofonic at the same starting redshift, cosmology and transfer function as the parent. The high-resolution ellipsoid is refined to an effective 8192³ grid, a particle mass of 6.5 × 10⁸ M<sub>☉</sub>/h, a factor of 512 below the parent, while the remainder of the 1.6 Gpc/h box is retained at low resolution to preserve the tidal field.

The zooms are evolved with [SWIFT](https://swift.strw.leidenuniv.nl/) using its new zoom-region gravity solver. Each runs on a single 28-core node in 13–67 hours, which is what makes the suite schedulable as a simple job array on ordinary facilities. Every zoom writes 140 snapshots between z = 23.4 and z = 0, with a friends-of-friends catalogue on the fly. Bound structures are identified with HBT-HERONS across all outputs and merger trees are built with the DHalo algorithm; once the trees exist, all but 14 snapshots are deleted.

### 4. Galaxies and emission

The merger trees feed the [SHARK](https://github.com/ICRAR/shark) semi-analytic model, which predicts galaxy properties and full star formation histories, and [Synthesizer](https://synthesizer-project.github.io/) forward-models their emission. Because the galaxy-formation parameters are part of the same design, several SHARK realisations can be layered on each zoom to fill the full 8,192-point design from 1,024 zooms. With a physical forward model for galaxies and their emission, tracer populations such as LRGs and ELGs can be selected self-consistently.

### 5. Emulation

For a one-point statistic Φ depending on a variable m, cosmological parameters θ and the overdensity δ of a region, we build a neural density estimator

$$\hat\Phi(m \mid \theta, \delta) \sim \Phi(m \mid \theta, \delta) + \epsilon(m \mid \theta, \delta),$$

and recover the global statistic by integrating over the overdensity distribution of the parent,

$$\Phi_{\rm global}(m \mid \theta) = \int \Phi(m \mid \theta, \delta)\, p(\delta \mid \theta)\, {\rm d}\delta .$$

The particle-mesh parents serve twice: to select the regions, and to supply the weights p(δ &#124; θ) with which they are recombined, at a cost of minutes per cosmology. The [Emulators](/emulators/) page describes the models in more detail.

## Cost

A parent costs about 15 core-hours including post-processing. A zoom costs around 10³ core-hours, so the 1,041 zooms completed so far represent roughly 10⁶ core-hours. A single periodic box of the same volume at the zoom resolution would need 8192³ particles per cosmology, around 9 million core-hours each; a suite of a thousand would cost 9 billion. The comparison is not like for like, since each zoom resolves only a (50 Mpc/h)³ region and the global statistics are recovered through the emulator, but it is why the suite exists.

{% include figure.html src="/assets/img/figures/cost_ncosmo.webp" alt="Cost of simulation suites with effective volume above 1 Gpc³ against the number of cosmologies each samples" caption="Approximate cost of simulation suites with an effective volume above 1 Gpc³ against the number of cosmologies each samples, coloured by the halo mass resolved with 100 particles. Dashed lines mark constant cost per cosmology in core-hours." %}

## Limitations

We try to be explicit about what the approach does not yet do. The parents are particle-mesh, so their accuracy is tested rather than assumed. There is one region per parent, so environment and cosmology are not independently sampled within a box, and a single realisation per cosmology. The suite is dark-matter-only, so there is no baryonic back-reaction on the halo mass function. Clustering statistics need the emulated mean number density rather than a measured one, and are the subject of a companion paper. ΛCDM lies near the edge of the dynamical dark energy design, which we are addressing in the next block of the suite.
