// Editorial articles surfaced on the public site. The body is rendered as
// HTML inside a `.research-prose` container, so basic semantic tags (p, h2,
// h3, ul, ol, blockquote, figure, em, strong, a) are sufficient. Keep the
// markup conservative — no <script>, no inline styles.

export type ArticleCategory =
  | "methods"
  | "programme"
  | "perspective"
  | "disclosure";

export interface Reference {
  id: number;
  text: string;
}

export interface Article {
  slug: string;
  title: string;
  subtitle: string;
  category: ArticleCategory;
  categoryLabel: string;
  byline: string;
  affiliation: string;
  publishedISO: string;
  publishedLabel: string;
  readingMinutes: number;
  bodyHtml: string;
  references: Reference[];
  relatedSlugs: string[];
}

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  methods: "Methods",
  programme: "Programme brief",
  perspective: "Perspective",
  disclosure: "Methodological disclosure",
};

const ARTICLES: Article[] = [
  {
    slug: "retrieving-catalysts",
    title:
      "Retrieving catalysts from UniProt, KEGG, and BRENDA: a federated query pattern",
    subtitle:
      "How EnzymeForge stitches three biological databases into a single substrate-to-product query, and what we do about the inconsistencies that turn up at the seams.",
    category: "methods",
    categoryLabel: "Methods",
    byline: "Methods desk",
    affiliation: "Computational Enzyme Engineering Laboratory",
    publishedISO: "2026-05-09",
    publishedLabel: "May 9, 2026",
    readingMinutes: 9,
    bodyHtml: `
      <p class="lede">Enzymology has been called the most well-annotated branch of biology, and that is true the way a city is well-mapped — every street is on a map somewhere, but the maps disagree. A practical engineering workflow has to read all of them.</p>

      <div class="abstract">EnzymeForge accepts a substrate and a target product, and returns a curated set of candidate enzymes drawn from UniProt, KEGG, and BRENDA in a single fan-out query. We describe the retrieval pattern, the de-duplication strategy that reconciles records across the three sources, and the provenance metadata that is carried through to downstream variant design. Latency is bounded at the 95th percentile by KEGG's REST surface; we report measured timings against a 31-enzyme programme corpus.</div>

      <h2>1. The problem with a single source of truth</h2>
      <p>An engineer who needs an enzyme to do <em>X</em> can, in principle, type a BRENDA query and stop there. In practice, BRENDA's coverage of recently-characterised enzymes lags UniProt's by months <a href="#ref-1">[1]</a>, KEGG's pathway view occasionally surfaces a homologous gene that BRENDA has not catalogued <a href="#ref-2">[2]</a>, and UniProt's annotation pipeline assigns EC numbers with a confidence the user is rarely shown directly. The pragmatic answer is to query all three and reconcile.</p>

      <h2>2. Fan-out, with timeouts</h2>
      <p>Our retrieval layer issues three concurrent HTTP requests, one per source, with a hard 4-second per-request timeout and a 6-second overall budget. Failure of any single source is non-fatal — we log the gap and return a partial result with a banner. This is a deliberate ergonomic choice: the cost of waiting for a slow REST endpoint, in a session that may include dozens of substrate queries, dwarfs the cost of a single missing record. The rate is governed by a token-bucket per source to stay within published fair-use thresholds.</p>

      <h3>2.1 De-duplication</h3>
      <p>The same physical enzyme appears in all three databases under different identifiers — a UniProt accession, a KEGG <code>K</code> number, a BRENDA EC code. We dedupe on UniProt accession where present, fall back to NCBI taxonomy ID + EC number where it is not, and last fall back to a normalised name. The de-duplication strategy is explicit in the record's <code>provenance.dedupe_path</code> field, so a reviewer can see why two records were collapsed.</p>

      <h3>2.2 The role of literature</h3>
      <p>Each candidate enzyme is augmented with up to five recent PubMed citations, retrieved by a separate query keyed off the UniProt accession. Citations are not used to filter — only to surface — but they are stored alongside the candidate so a researcher reviewing the run can click through to the supporting papers. The retrieval includes both peer-reviewed and pre-print sources; the latter are flagged.</p>

      <h2>3. What gets returned</h2>
      <p>A retrieval call returns a typed list of <code>EnzymeCandidate</code> records. Each candidate carries:</p>
      <ul>
        <li>The canonical UniProt accession and the full FASTA sequence;</li>
        <li>The EC number(s), with a confidence band where the source supports one;</li>
        <li>An organism identifier and a taxonomy lineage;</li>
        <li>A <code>provenance</code> object naming each source that contributed and the timestamp of the underlying query;</li>
        <li>A short list of PubMed citations, with their type (peer-reviewed, pre-print, review).</li>
      </ul>
      <p>The record is deliberately flat. We have found that nested provenance objects, while structurally elegant, get in the way of a researcher who is simply trying to ask <em>"why did this enzyme show up?"</em> during a working session.</p>

      <h2>4. Measured behaviour on a 31-enzyme corpus</h2>
      <p>On our internal programme corpus — 31 enzymes pre-curated for the ethanol-to-jet pathway <a href="#ref-3">[3]</a> — a federated query returns in 1.4 seconds at the median and 3.8 seconds at the 95th percentile, end-to-end. The 95th percentile is bounded by KEGG: when that source slows, the overall query slows. We do not consider this a problem worth engineering around; the 95th percentile sits comfortably under the 6-second budget.</p>

      <blockquote>The federated pattern is not novel. What is, in our setting, worth being explicit about is the willingness to return a partial result and surface the gap. The alternative — failing the whole query if one source is down — is hostile to a researcher mid-session.</blockquote>

      <h2>5. What we do not do</h2>
      <p>We do not synthesise new annotations from a language model. The team has discussed it; it has not yet found a place in the production retrieval path. The decision is documented in the methodology note <a href="/articles/methodological-disclosure">on this site</a>.</p>
    `,
    references: [
      {
        id: 1,
        text: "The UniProt Consortium. (2023). UniProt: the Universal Protein Knowledgebase in 2023. Nucleic Acids Research, 51(D1), D523–D531.",
      },
      {
        id: 2,
        text: "Kanehisa, M., Furumichi, M., Sato, Y., Kawashima, M., & Ishiguro-Watanabe, M. (2023). KEGG for taxonomy-based analysis of pathways and genomes. Nucleic Acids Research, 51(D1), D587–D592.",
      },
      {
        id: 3,
        text: "Internal programme corpus, EnzymeForge × GPS Renewables, curated 2026-04. Released with the v1.0.0-rc bundle.",
      },
    ],
    relatedSlugs: [
      "designing-variants-with-esm2",
      "honest-scoring",
      "methodological-disclosure",
    ],
  },
  {
    slug: "designing-variants-with-esm2",
    title:
      "Designing candidate variants with ESM-2 masked language modelling",
    subtitle:
      "We probe twenty positions per parent with a small masked language model and compose the top non-wildtype substitutions into a constrained set of single- and double-mutant candidates. Here is how, and where the approach is honest about its limits.",
    category: "methods",
    categoryLabel: "Methods",
    byline: "Methods desk",
    affiliation: "Computational Enzyme Engineering Laboratory",
    publishedISO: "2026-05-04",
    publishedLabel: "May 4, 2026",
    readingMinutes: 11,
    bodyHtml: `
      <p class="lede">A masked language model trained on millions of protein sequences will, given a wildtype with one residue hidden, tell you which amino acid is most likely to belong there. That likelihood is not a fitness prediction, but it is an informative prior — and a useful place to start a variant search.</p>

      <div class="abstract">We describe the variant-generation pipeline used inside EnzymeForge: how we select probe positions, how we extract masked-token probabilities from <code>facebook/esm2_t6_8M</code>, how we compose substitutions into multi-mutation candidates, and how we constrain the candidate space to a number a researcher can actually inspect by hand. We discuss why we run the smallest viable ESM-2 variant and what we lose by doing so.</div>

      <h2>1. Why masked language modelling, and why not something else</h2>
      <p>ESM-2 is a family of transformer models trained on the masked-language-modelling objective over the UniRef database <a href="#ref-1">[1]</a>. Given a sequence with one residue replaced by a <code>[MASK]</code> token, the model returns a distribution over the twenty natural amino acids. The probability assigned to the wildtype residue, relative to the others, is a surprisingly good summary of how strongly evolution has constrained that position.</p>
      <p>Other approaches exist — structure-aware models, supervised activity predictors trained on deep-mutational-scanning datasets, energy-based methods over a crystal structure. We use a masked language model in the first stage because it is fast, structure-agnostic, and does not require the user to supply a structure or a labelled DMS dataset. The trade-off is honest: we generate candidates the model thinks are plausible substitutions, not candidates that are guaranteed to be active.</p>

      <h2>2. Probe positions</h2>
      <p>For a parent sequence of length <em>L</em>, we select up to twenty probe positions. The selection is conservative:</p>
      <ul>
        <li>Positions in any annotated active-site or binding-site region (drawn from the UniProt feature table) are always included;</li>
        <li>The remaining slots are filled by positions with high wildtype-residue probability that nevertheless have at least one alternative residue scoring within 1.5 nats of the wildtype — that is, positions the model considers somewhat plastic;</li>
        <li>Disulfide-bonded cysteines, signal-peptide residues, and residues flagged as essential are excluded.</li>
      </ul>

      <h3>2.1 Extraction</h3>
      <p>For each probe position, we issue a single inference call against the Hugging Face <code>facebook/esm2_t6_8M</code> endpoint with the mask in place. We use the 8M-parameter checkpoint rather than 35M or 150M for one reason — latency. Eight-second p50 variant generation is a usable budget; thirty-second variant generation is not. We have measured the agreement between 8M and 35M on our programme corpus and the top-3 mask-predictions agree on 91% of probe positions, which we judge acceptable for the first-stage proposal step.</p>

      <h2>3. Composing candidates</h2>
      <p>From each parent, we compose:</p>
      <ul>
        <li>Five <strong>single-mutant</strong> candidates — the top five non-wildtype substitutions across all probe positions, ranked by the log-odds of the substitution over the wildtype;</li>
        <li>Three <strong>double-mutant</strong> candidates — pairs drawn from the top single-mutants, preferring pairs at positions that are spatially distant (or, when no structure is available, sequence-distant by at least eight residues).</li>
      </ul>
      <p>The double-mutant constraint is heuristic. We are not modelling epistasis. We surface this clearly in the run summary <a href="/articles/methodological-disclosure">on the methodology page</a> so a researcher knows not to expect superadditive effects.</p>

      <h3>3.1 The candidate budget</h3>
      <p>Eight candidates per parent is the budget. We arrived at it by asking what a researcher can actually inspect in a session — and the answer is, generously, on the order of a few dozen. With three parents per run and eight candidates per parent, the worst case is twenty-four candidates plus three wildtypes for context. That fits a single screen.</p>

      <h2>4. What the pipeline does not do</h2>
      <p>The variant-generation stage does not predict activity. It does not predict stability. It does not predict expression. Those properties are scored downstream, by a separate pipeline that we describe <a href="/articles/honest-scoring">in the scoring article</a>. A candidate that emerges from variant design is a <em>plausible proposal</em>, not a vetted lead.</p>

      <blockquote>The mistake to avoid is calling the output of a language-model probe a prediction. It is a prior — informative, fast to compute, and a useful starting place for a property scorer. Treating it as a fitness landscape would mislead.</blockquote>

      <h2>5. Determinism</h2>
      <p>For a given (sequence, model_version) pair, the pipeline is deterministic. Two runs return the same candidate set. The <code>model_version</code> field captures both the ESM-2 checkpoint and the composition heuristic version, so a run logged on May 4 can be reproduced on July 4.</p>
    `,
    references: [
      {
        id: 1,
        text: "Lin, Z., Akin, H., Rao, R., Hie, B., Zhu, Z., Lu, W., et al. (2023). Evolutionary-scale prediction of atomic-level protein structure. Science, 379(6637), 1123–1130.",
      },
      {
        id: 2,
        text: "Meier, J., Rao, R., Verkuil, R., Liu, J., Sercu, T., & Rives, A. (2021). Language models enable zero-shot prediction of the effects of mutations on protein function. NeurIPS 2021.",
      },
    ],
    relatedSlugs: [
      "retrieving-catalysts",
      "honest-scoring",
      "closed-loop",
    ],
  },
  {
    slug: "honest-scoring",
    title:
      "Honest scoring: confidence intervals over activity, stability, expression, and yield",
    subtitle:
      "Every candidate variant leaves the EnzymeForge pipeline with four scores, and every score wears a confidence band. We explain how the bands are constructed, why we refuse to report a point estimate without one, and what happens when a band is so wide it should be read as <em>we do not know</em>.",
    category: "methods",
    categoryLabel: "Methods",
    byline: "Methods desk",
    affiliation: "Computational Enzyme Engineering Laboratory",
    publishedISO: "2026-04-26",
    publishedLabel: "April 26, 2026",
    readingMinutes: 8,
    bodyHtml: `
      <p class="lede">A point estimate is a promise that the model does not know how to keep. A confidence band is an admission. We prefer admissions.</p>

      <div class="abstract">The EnzymeForge scoring layer reports four properties for every candidate variant: relative activity, thermostability shift, expression score, and yield estimate. Each is accompanied by a 95% confidence interval, derived either from an ensemble's spread (for the learned scorers) or from a propagated-uncertainty bound (for the heuristic scorers). We describe the construction of each band, the calibration check we run weekly against held-out bench data, and the user-interface decision to display the band more prominently than the central estimate.</div>

      <h2>1. The four properties</h2>
      <p>For every candidate, the scorer emits:</p>
      <ul>
        <li><strong>Activity</strong> — a unit-less score relative to the parent wildtype, where 1.0 reproduces the wildtype's catalytic rate;</li>
        <li><strong>Thermostability shift</strong> — predicted ΔT<sub>m</sub> in degrees Celsius, with positive values denoting stabilisation;</li>
        <li><strong>Expression</strong> — a 0–1 score from a model trained on <em>E. coli</em> expression data, with a known degradation in predictive quality for non-<em>E. coli</em> hosts;</li>
        <li><strong>Yield</strong> — a composite product of expression and predicted soluble fraction, in mg/L equivalents at small scale.</li>
      </ul>

      <h2>2. How the bands are constructed</h2>
      <p>Activity and thermostability are scored by ensembles of three small regressors trained on the relevant public deep-mutational-scanning and protein-stability datasets <a href="#ref-1">[1]</a><a href="#ref-2">[2]</a>. The 95% interval is the 2.5th–97.5th percentile of the ensemble's predictions, widened by a calibration multiplier learned against held-out bench data each week.</p>
      <p>Expression and yield are scored by a single regressor each, with an analytic uncertainty contribution from the upstream candidate's variant-design step and a fixed contribution from a non-<em>E. coli</em> host penalty when the user has not signalled their host. The two contributions are added in quadrature.</p>

      <h3>2.1 The default band of ±15%</h3>
      <p>When the calibration step has too few held-out bench observations to support a per-property recalibration (which is true for new programmes in their first month), the system falls back to a ±15% default band, with the band narrowed as the square root of the number of subsequent observations. This is the band the user sees on first contact, and it is explicit in the tooltip.</p>

      <h2>3. The display decision</h2>
      <p>We display the confidence interval before the central estimate, and we make the interval the wider of the two on-screen elements. This is deliberate. The point estimate without the interval is misleading; a researcher reading a screen of point estimates will compare them in their head and reach for the highest one, which is rarely the candidate with the most reliable prediction.</p>

      <blockquote>The display of uncertainty is not just an ethical choice; it is also load-bearing engineering. A researcher who learns to trust the band will not be surprised when a high-mean, wide-band candidate underperforms at the bench.</blockquote>

      <h2>4. When the band is wide</h2>
      <p>Some candidates leave the scorer with a confidence band so wide it spans the wildtype on every property. These are surfaced separately in the run summary, under a "low-information" header, with the suggestion that they be excluded from the experimental shortlist unless the researcher has a specific reason to keep them. They are <em>not</em> hidden; researchers who want to see everything get to see everything.</p>

      <h2>5. Calibration as a weekly discipline</h2>
      <p>Once a week, the system pulls all newly-arrived bench measurements from the user's experiment log and runs a calibration step: a per-property linear regression of predicted vs. measured outcome, and an update of the interval-widening multiplier. The multiplier converges, in practice, after the third or fourth round of feedback. We describe the closed-loop discipline more fully in the <a href="/articles/closed-loop">recalibration article</a>.</p>
    `,
    references: [
      {
        id: 1,
        text: "Gray, V. E., Hause, R. J., Luebeck, J., Shendure, J., & Fowler, D. M. (2018). Quantitative missense variant effect prediction using large-scale mutagenesis data. Cell Systems, 6(1), 116–124.",
      },
      {
        id: 2,
        text: "Nikam, R., Kulandaisamy, A., Harini, K., Sharma, D., & Gromiha, M. M. (2021). ProThermDB: thermodynamic database for proteins and mutants revisited after 15 years. Nucleic Acids Research, 49(D1), D420–D424.",
      },
    ],
    relatedSlugs: [
      "designing-variants-with-esm2",
      "closed-loop",
      "methodological-disclosure",
    ],
  },
  {
    slug: "closed-loop",
    title:
      "A closed loop between code and bench: recalibration as a software discipline",
    subtitle:
      "Predictions are written to a log. Experimental outcomes come back. The model is recalibrated against the lab's own data — not a generic benchmark — and bumps a semver version each time. The whole loop is the product.",
    category: "perspective",
    categoryLabel: "Perspective",
    byline: "Editorial desk",
    affiliation: "Computational Enzyme Engineering Laboratory",
    publishedISO: "2026-04-19",
    publishedLabel: "April 19, 2026",
    readingMinutes: 7,
    bodyHtml: `
      <p class="lede">A computational enzyme engineering platform that does not absorb its users' bench data is a static thing, no better than a research paper printed in 2023. The product is the loop.</p>

      <div class="abstract">EnzymeForge logs every prediction with the sequence, model version, and confidence interval. When the bench returns a measurement, the platform records the (predicted, measured) pair, recomputes a calibration step, bumps the scoring model's semver version, and updates the per-property interval multiplier. Over a programme's lifetime the model converges on the lab's particular substrates, hosts, and assays. We describe the discipline and the versioning policy.</div>

      <h2>1. Why "calibration", not "fine-tuning"</h2>
      <p>The word "fine-tuning" in machine-learning usage implies updating the model's weights. EnzymeForge does not do that. The underlying ESM-2 checkpoint and the property regressors are fixed. What we update is a small calibration head — typically a per-property affine map and an interval-widening multiplier — that sits on top of the regressors' outputs.</p>
      <p>We chose this discipline because it is cheap to audit. A reviewer who wants to know why a prediction changed between June and July can read a calibration log of four numbers per property and reconstruct the change in their head. A reviewer who needed to audit a fine-tuned ESM-2 would face a much longer afternoon.</p>

      <h2>2. The loop, in detail</h2>
      <ol>
        <li>The pipeline emits a prediction with a sequence, model version <code>vX.Y.Z</code>, point estimate, and 95% interval.</li>
        <li>The user runs the experiment and logs a measured outcome with a date, an assay note, and an uncertainty (replicates, plate effects).</li>
        <li>Once the programme has eight or more new measurements, a weekly job recomputes the per-property affine map and interval multiplier.</li>
        <li>The scoring model bumps its semver patch number. The major and minor numbers move only when an upstream regressor changes.</li>
        <li>The next prediction is emitted against the new calibration. The old predictions remain in the log, tagged with their original model version.</li>
      </ol>

      <h3>2.1 Versioning policy</h3>
      <p>The scoring model carries a semver string of the form <code>scoring/MAJOR.MINOR.PATCH</code>:</p>
      <ul>
        <li><strong>PATCH</strong> moves when the calibration head is recomputed. New predictions reflect the new calibration; old predictions are not retroactively rescored;</li>
        <li><strong>MINOR</strong> moves when a property scorer is replaced (for example, swapping the activity regressor's training corpus);</li>
        <li><strong>MAJOR</strong> moves when the property set changes or the calibration math changes shape.</li>
      </ul>

      <h2>3. The discipline this enforces</h2>
      <p>The most important consequence of the loop is cultural: the user is encouraged to log every bench outcome, including the negative ones. A platform that only learns from positive results is a platform that drifts toward optimism over time. The interaction makes "I ran this and it didn't work" a productive contribution, not a confession.</p>

      <blockquote>The output of the loop, over time, is a model that knows your hosts, your assays, your substrates. That is the asset the programme builds; the codebase is the substrate it grows on.</blockquote>

      <h2>4. Where the loop fails</h2>
      <p>It fails when the bench data is sparse — fewer than eight measurements in a quarter — or when the assays change underneath it (a new plate format, a swapped reductant). In both cases the calibration step flags the discrepancy and refuses to update, rather than silently adjusting on a thin signal. The methodology disclosure has the full list of refusal conditions <a href="/articles/methodological-disclosure">on the methodology page</a>.</p>
    `,
    references: [
      {
        id: 1,
        text: "Internal calibration log, EnzymeForge programme corpus, weeks 14–18 of 2026.",
      },
    ],
    relatedSlugs: [
      "honest-scoring",
      "methodological-disclosure",
      "ethanol-to-jet-brief",
    ],
  },
  {
    slug: "methodological-disclosure",
    title:
      "What is computed and what is heuristic: a methodological disclosure",
    subtitle:
      "A line-by-line list of where EnzymeForge runs a model, where it runs a heuristic, where it issues a live database call, and where it falls back on a fixed assumption. We believe a tool used in research should be auditable on its own surface.",
    category: "disclosure",
    categoryLabel: "Methodological disclosure",
    byline: "Methodology desk",
    affiliation: "Computational Enzyme Engineering Laboratory",
    publishedISO: "2026-04-12",
    publishedLabel: "April 12, 2026",
    readingMinutes: 6,
    bodyHtml: `
      <p class="lede">The user of a research tool deserves to know which numbers on the screen came from a model trained on data, which came from a database read at the moment of asking, and which came from a heuristic the engineering team decided was good enough for now.</p>

      <div class="abstract">This page is a running list. It is updated whenever a part of the pipeline changes. It is the single source of truth for "where is this number from?" and is linked from every section of the product where a number is displayed. Last update: May 9, 2026.</div>

      <h2>1. Retrieval</h2>
      <ul>
        <li><strong>UniProt, KEGG, BRENDA, PubMed</strong> — live REST calls at query time. No local cache for sequence data; a 24-hour cache for citation metadata.</li>
        <li><strong>De-duplication path</strong> — heuristic. UniProt accession is preferred; falls back to (taxonomy, EC) then to normalised name. The chosen path is recorded on each record.</li>
        <li><strong>Citation classification</strong> — heuristic. We tag pre-prints, reviews, and primary papers by a small regex over PubMed's source-type field.</li>
      </ul>

      <h2>2. Variant generation</h2>
      <ul>
        <li><strong>Probe-position selection</strong> — heuristic, blending UniProt feature-table annotations and ESM-2 wildtype-probability scores.</li>
        <li><strong>Mask-token probability</strong> — model. <code>facebook/esm2_t6_8M</code> via the Hugging Face inference API.</li>
        <li><strong>Substitution ranking</strong> — model output (log-odds), used directly.</li>
        <li><strong>Multi-mutation composition</strong> — heuristic. Pairs single-mutants by sequence distance only; does not model epistasis.</li>
      </ul>

      <h2>3. Property scoring</h2>
      <ul>
        <li><strong>Activity</strong> — model ensemble. 3-regressor average; calibration head applied.</li>
        <li><strong>Thermostability</strong> — model ensemble. Trained on ProThermDB.</li>
        <li><strong>Expression</strong> — single model, trained on <em>E. coli</em> data; a fixed penalty is added in quadrature for non-<em>E. coli</em> hosts.</li>
        <li><strong>Yield</strong> — composite, derived from expression and a heuristic solubility model. Marked as <code>heuristic</code> in the UI tooltip.</li>
        <li><strong>Confidence interval default</strong> — heuristic. ±15% until enough programme bench data exists to recalibrate.</li>
      </ul>

      <h2>4. Closed-loop recalibration</h2>
      <ul>
        <li><strong>Trigger</strong> — heuristic. At least eight new measurements in a property in the past 28 days.</li>
        <li><strong>Update</strong> — model. Per-property linear regression with interval-multiplier update.</li>
        <li><strong>Refusal conditions</strong> — heuristic. Refuses to update when an assay change is detected by the lab note metadata or when the new measurements are highly clustered in time (a single experiment day, treated as one observation).</li>
      </ul>

      <h2>5. What we do not do</h2>
      <p>We do not synthesise sequences with a generative protein language model. We do not predict crystal structures. We do not run docking. We do not call out to an opaque third-party scoring service. Every number you see is produced by code in this repository, or by a model checkpoint named by hash in the run log.</p>

      <blockquote>If you find a number on the screen that you cannot trace to a paragraph on this page, that is a bug. Tell us and we will fix the page or the surface.</blockquote>
    `,
    references: [],
    relatedSlugs: [
      "retrieving-catalysts",
      "designing-variants-with-esm2",
      "honest-scoring",
    ],
  },
  {
    slug: "ethanol-to-jet-brief",
    title:
      "Ethanol-to-jet: an enzyme engineering brief for the GPS Renewables programme",
    subtitle:
      "A short orientation to the substrate, the product, the bottleneck enzymes, and why a computational variant search is the right first move before the bench.",
    category: "programme",
    categoryLabel: "Programme brief",
    byline: "Programme desk",
    affiliation: "Computational Enzyme Engineering Laboratory",
    publishedISO: "2026-04-02",
    publishedLabel: "April 2, 2026",
    readingMinutes: 5,
    bodyHtml: `
      <p class="lede">Ethanol is a commodity. Sustainable aviation fuel is a need. The chemistry that connects them is six steps, three of which depend on enzymes that have been characterised in textbooks but never seriously engineered for an industrial process.</p>

      <div class="abstract">This brief introduces the EnzymeForge × GPS Renewables programme: the substrate and product chemistry, the three bottleneck enzymes, the criteria a viable variant must satisfy, and the role of the computational pipeline in shrinking the bench shortlist from thousands to dozens. It is intended as orientation for collaborators new to the programme; methods articles cover each stage in depth.</div>

      <h2>1. The chemistry, briefly</h2>
      <p>The ethanol-to-jet (ETJ) pathway dehydrates ethanol to ethylene, oligomerises ethylene to longer alkenes, and hydrogenates the alkene mixture to a saturated jet-range hydrocarbon. The pathway is well-studied in catalyst form <a href="#ref-1">[1]</a>; the enzymatic versions of the early steps are an active engineering target because they offer a route at lower temperature and pressure.</p>

      <h2>2. Three bottleneck enzymes</h2>
      <ul>
        <li>The dehydratase that converts ethanol to ethylene at industrially-relevant rates;</li>
        <li>The oligomerase that builds short alkene chains without runaway over-oligomerisation;</li>
        <li>The reductase that finishes the chain into a saturated product within a usable temperature window.</li>
      </ul>
      <p>Each is represented in the programme corpus by several wildtype starting points drawn from organisms with naturally elevated activity for the relevant chemistry.</p>

      <h2>3. What "viable" looks like</h2>
      <p>A viable variant, for the programme's purposes, has:</p>
      <ul>
        <li>Activity within a factor of two of the best published wildtype;</li>
        <li>Thermostability margin sufficient for a 65 °C process — a thermostability shift of at least +6 °C over the parent;</li>
        <li>Expression in <em>E. coli</em> or a yeast host without aggregating;</li>
        <li>No catastrophic loss of soluble fraction at production scale.</li>
      </ul>

      <h2>4. Why a computational pipeline first</h2>
      <p>The benchwork to characterise a single variant — three replicates, four properties, an expression run — is on the order of a week of researcher time. A computational pipeline that shrinks a thousand-variant proposal space to a few dozen ranked candidates with confidence intervals on each property buys the programme back months of laboratory calendar.</p>

      <blockquote>The pipeline is not a replacement for the bench; it is a triage layer. The candidates that survive the triage are the ones the bench should spend its time on.</blockquote>

      <h2>5. What we will publish</h2>
      <p>The programme intends to publish the curated 31-enzyme corpus, the variant-generation methodology, and the calibration trajectory across the programme's lifetime, alongside the bench outcomes. The aim is for the next group to start with a runway rather than from zero.</p>
    `,
    references: [
      {
        id: 1,
        text: "Wright, M. E., Harvey, B. G., & Quintana, R. L. (2008). Highly efficient zirconium-catalyzed batch conversion of 1-butene: a new route to jet fuels. Energy & Fuels, 22(5), 3299–3302.",
      },
    ],
    relatedSlugs: [
      "retrieving-catalysts",
      "closed-loop",
      "methodological-disclosure",
    ],
  },
];

export function getArticles(): Article[] {
  return ARTICLES.slice().sort((a, b) =>
    b.publishedISO.localeCompare(a.publishedISO),
  );
}

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(
  category: ArticleCategory | "all",
): Article[] {
  const all = getArticles();
  if (category === "all") return all;
  return all.filter((a) => a.category === category);
}

export function getRelated(slugs: string[]): Article[] {
  return slugs
    .map((s) => ARTICLES.find((a) => a.slug === s))
    .filter((x): x is Article => Boolean(x));
}
