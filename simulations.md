---
title: Simulations
permalink: /simulations/
lede: The numerical specification of the Tessera suite. All zooms share these settings; only the cosmology, the high-resolution region and the random seeds differ between them.
---

## Status

| Quantity | Value |
|---|---|
| Design | 8,192 parents, scrambled Sobol' sequence in 38 dimensions |
| Parents run | 1,280 |
| Zooms completed | 1,041 (the leading 1,024-point block plus 17 of the next) |
| Redshift coverage | 140 outputs from z = 23.4 to z = 0; 14 retained |
| Post-processing | FoF, HBT-HERONS, DHalo trees, SOAP, clean masks, SHARK, Synthesizer |

The next power-of-two block of 1,024 zooms is running on COSMA. Because the design is a low-discrepancy sequence, each completed block is a balanced suite in its own right.

## Cosmological design

Seven parameters are varied. The five base parameters have uniform cores with half-normal tails of width 4 per cent of the range beyond each edge, so the prior has no hard boundary and training data do not pile up at the edges.

| Parameter | Uniform core |
|---|---|
| Ω<sub>m</sub> | 0.20 – 0.40 |
| Ω<sub>b</sub> | 0.03 – 0.07 |
| h | 0.60 – 0.80 |
| n<sub>s</sub> | 0.92 – 1.00 |
| σ<sub>8</sub> | 0.70 – 0.90 |
| w<sub>0</sub> | −1.5 – 0.3 |
| w<sub>0</sub> + w<sub>a</sub> | −4.0 – −0.9 |

Dark energy follows the CPL equation of state w(a) = w<sub>0</sub> + w<sub>a</sub>(1 − a). Because w<sub>0</sub> and w<sub>a</sub> are strongly correlated by late-time data, the design samples the better-aligned pair (w<sub>0</sub>, w<sub>0</sub> + w<sub>a</sub>), with a hard guard at w<sub>0</sub> + w<sub>a</sub> ≤ −0.5 that keeps dark energy subdominant at the starting redshift. The realised w<sub>a</sub> spans −4.7 to 0.9. We assume a flat cosmology with massless neutrinos, and define σ<sub>8</sub> as the linear z = 0 amplitude of the CDM-plus-baryon field.

For each cosmology, CAMB with its PPF dark-energy model computes the z = 0 transfer function, which monofonic back-scales to z = 63 with its CPL growth solution. Each parent and its zoom share the same transfer table and the same full cosmology.

{% include figure.html src="/assets/img/figures/v0tessera_params_corner_cosmo.webp" alt="Corner plot of the Sobol' design in the seven cosmological parameters" caption="The seven-dimensional cosmological design, showing the sheared w₀–wₐ plane that results from sampling in (w₀, w₀ + wₐ)." %}

## Parent simulations

| Property | Value |
|---|---|
| Code | pmwd (differentiable particle-mesh, JAX) |
| Box side | 1600 Mpc/h |
| Particle number | 1024³ |
| Particle mass | 3.4 × 10¹¹ M<sub>☉</sub>/h at the fiducial cosmology |
| Initial conditions | monofonic, 2LPT, z = 63 |
| Force mesh | 1024³, 96 time steps, single precision |
| Overdensity tables | 8 radii (10–57 Mpc/h), 14 epochs |
| Cost | ~10 GPU-minutes to evolve, 20–35 minutes on 28 cores to select from |

Each parent receives an independent white-noise realisation, so the suite samples cosmic variance jointly with cosmology. Rather than writing snapshots, the smoothed overdensity field is measured on the device as the run proceeds at 14 epochs spaced by 0.1 dex in scale factor, and its quantiles are stored. Once the region has been selected the particle data are deleted, and what survives of a parent is a few megabytes.

{% include figure.html src="/assets/img/figures/pm_vs_swift_hmf.webp" alt="Friends-of-friends halo mass function of the fiducial parent run with pmwd and with SWIFT from identical initial conditions" caption="The z = 0 FoF mass function of the fiducial parent evolved with pmwd (orange) and with the SWIFT tree-PM solver (black) from identical initial conditions. The PM parent recovers halo abundances only in the cluster regime, which is why parents are used solely for the large-scale density field." %}

## Regions

| Property | Value |
|---|---|
| Selection radius | 31 Mpc/h, the volume of a (50 Mpc/h)³ cube |
| Selection lattice | 128³, 2.1 × 10⁶ candidate regions per parent |
| Selection variable | percentile of log₁₀(1 + δ) within the parent |
| Regions per parent | 1 |
| Lagrangian padding | 2 Mpc |
| Boundary haloes | absorbed in full, with their own pad |
| Realised overdensities | −0.45 < log₁₀(1 + δ) < 0.36 |

The selected sphere is expanded by the pad and the parent particles within it are traced back to their Lagrangian positions. The resulting point cloud, a median of 3.8 × 10⁴ parent particles, is all that is passed to the zoom initial conditions, where the high-resolution region is its minimum bounding ellipsoid.

{% include figure.html src="/assets/img/figures/region_selection.webp" alt="A selected region in the initial conditions and at z = 0, shown in three projections" caption="A selected region in the initial conditions (top) and at z = 0 (bottom) in three projections. Orange marks the high-resolution particles, blue the padded shell, and purple the parent's massive haloes." %}

## Zoom resimulations

| Property | Value |
|---|---|
| Code | SWIFT, dark-matter-only, zoom-region gravity solver |
| Initial conditions | monofonic, 2LPT, z = 63, parent white noise on levels ≤ 10 |
| Refinement levels | 64³ (level 6) to effective 8192³ (level 13), 10-cell padding |
| Particle mass | 6.5 × 10⁸ M<sub>☉</sub>/h at the fiducial cosmology |
| Mean spacing | 0.195 Mpc/h |
| Softening | 7.8 kpc/h comoving (spacing / 25) |
| High-resolution particles | median 4.7 × 10⁷, up to 1.6 × 10⁸ |
| Gravity | FMM with adaptive opening (ε = 10⁻³), 1024³ long-range mesh |
| Time-step parameter | η = 0.025 |
| Walltime | 13–67 hours on one 28-core node, median 35 |
| Memory | 27–53 GB peak |

### Outputs

| Property | Value |
|---|---|
| Snapshots written | 140, Δlog₁₀ a = 0.01, z = 23.4 → 0, lossy compression |
| Snapshots retained | 14, Δlog₁₀ a = 0.1, matching the parent percentile epochs |
| On-the-fly FoF | b = 0.2, at least 20 particles (1.3 × 10¹⁰ M<sub>☉</sub>/h) |
| Subhaloes | HBT-HERONS, tracked across all 140 outputs |
| Merger trees | DHalo |
| Halo properties | SOAP |
| Clean mask | voxels further than 2 Mpc from any background particle |
| Galaxies | SHARK, with Synthesizer photometry |
| Footprint | ~85 GB per zoom with all snapshots, 10–40 GB after reduction |

### Counting volume

Zoom simulations are contaminated near their boundary by low-resolution particles. The clean mask removes them, but the clean mask is not by itself a safe counting volume: outside the selection sphere the surviving clean volume is preferentially underdense, which would suppress the mass function by up to a third at cluster masses. Haloes are therefore counted within the 31 Mpc/h selection sphere itself, mapped into the zoom frame and intersected with the clean mask. At z = 0 at least 99.6 per cent of the sphere is clean in every zoom, and the overdensity measured in the zoom matches the parent value used for selection to 0.003 dex.

## Pipeline code

The pipeline that generates the design, runs the parents, selects regions, writes zoom initial conditions, submits and post-processes the zooms is a Python package with per-machine profiles. It will be released with the suite paper, after which the design file plus the pipeline is sufficient to regenerate any subset of the suite deterministically. See the [Data](/data/) page.
