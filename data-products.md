---
title: Data products
permalink: /data/products/
lede: What Tessera will release, in what form, and how to request early access while the suite paper is in preparation.
wide: true
---

<p class="muted"><a href="/data/">Back to the run catalogue</a></p>

<div class="prose" style="padding-top:0; max-width:46em">
<h2 style="margin-top:0">Release plan</h2>
<p>The first public release will accompany the suite paper and will cover the leading 1,024-point block of the design at z = 0, 1 and 2, with the trained emulators and the pipeline code. Later releases will add further blocks of the design, more redshifts, and galaxy-formation parameter layers.</p>
<p>Until then the catalogues are available to collaborators on request. Write to <a href="mailto:{{ site.contact_email }}">{{ site.contact_email }}</a> describing the intended use.</p>
<p>Data products are listed below. <span class="tag">planned</span> marks products that are produced for every zoom and will be in the first release; <span class="tag tag-grey">on request</span> marks products that are too large for a bulk release.</p>
</div>

<h2>Data products</h2>
<div class="products">
{% for p in site.data.data.products %}
<div class="product">
  <h3>{{ p.name }}</h3>
  <div class="meta"><span class="tag{% if p.status == 'on request' %} tag-grey{% endif %}">{{ p.status }}</span> &nbsp; {{ p.format }}</div>
  <p>{{ p.description }}</p>
</div>
{% endfor %}
</div>

<div class="prose" style="padding-top:0; max-width:46em">

<h2 style="margin-top:0">Layout and conventions</h2>

<p>Each zoom lives in a directory named by its parent and region index, <code>P0485/R0000</code> for example, holding the retained snapshots, the FoF and HBT-HERONS catalogues, the merger trees, the clean masks, the SOAP properties and the SHARK outputs. A top-level region catalogue indexes every zoom with its cosmology, overdensity and selection metadata.</p>

<ul>
<li>Snapshots are SWIFT HDF5 files in h-free comoving units; the catalogues record the h of the run so that quantities can be converted.</li>
<li>Two mass definitions are provided: the friends-of-friends mass, for comparison with FoF-based suites, and the bound M<sub>200c</sub> of HBT-HERONS centrals for structural properties.</li>
<li>Haloes should be counted within the mapped selection sphere intersected with the clean mask, not over the whole clean volume. The <a href="/simulations/#counting-volume">Simulations</a> page explains why.</li>
<li>The overdensity used for conditioning is measured in the zoom itself, within the same sphere in which haloes are counted.</li>
<li>Particle masses scale linearly with Ω<sub>m</sub>; the quoted 6.5 × 10⁸ M<sub>☉</sub>/h is at the fiducial Ω<sub>m</sub> = 0.3158.</li>
</ul>

<h2>Using the data for emulation</h2>

<p>The intended use of the suite is to train conditional emulators and integrate them over the overdensity distribution of a parent, which the parent overdensity tables provide for every cosmology in the design. For cosmologies outside the design an Edgeworth model of the overdensity distribution, fitted to all parents, reproduces the width of the distribution to a median of 0.3 per cent. The trained emulators and the Python package that trains and integrates them will be released with the suite paper.</p>

<h2>Pipeline code</h2>

<p>The pipeline is organised in four stages, each a set of Python drivers that write and submit batch jobs through per-machine profiles:</p>

<table>
<thead><tr><th>Stage</th><th>What runs</th></tr></thead>
<tbody>
<tr><td>A. Parents</td><td>CAMB transfer functions, monofonic initial conditions, pmwd, FoF, overdensity tables, region selection</td></tr>
<tr><td>B. Zooms</td><td>monofonic zoom initial conditions, SWIFT</td></tr>
<tr><td>C. Post-processing</td><td>HBT-HERONS, DHalo trees, clean masks, SOAP, SHARK, Synthesizer</td></tr>
<tr><td>D. Cleanup</td><td>trim snapshots, archive, index the suite</td></tr>
</tbody>
</table>

<p>Stage B needs only the region catalogue from stage A, a few megabytes per parent, so parents and zooms can run on different machines. The code will be public on <a href="{{ site.github_org }}">GitHub</a> with the first data release.</p>

<h2>Citing Tessera</h2>

<p>Please cite the suite paper, and the halo mass function emulator paper if you use the emulation framework. Both are listed on the <a href="/publications/">Publications</a> page, and we will add BibTeX entries there when the suite paper is on arXiv. If you build on the SHARK galaxies or Synthesizer photometry, please also cite those codes.</p>

</div>
