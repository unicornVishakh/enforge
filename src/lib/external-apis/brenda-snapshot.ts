/**
 * BRENDA cached snapshot.
 *
 * BRENDA's full SOAP API requires registration and a hashed-password header.
 * For the demo, when BRENDA credentials are absent we serve from this curated
 * snapshot of biofuel-/biochem-relevant enzymes. Each entry is sourced from
 * peer-reviewed literature; citations live in the comment block beside each
 * record. Km is in mM, kcat in s⁻¹, optimum_temperature in °C, optimum_pH unitless.
 *
 * This is NOT a complete BRENDA dump. It is a hand-picked working set that
 * exercises every code path in the retrieval/scoring pipeline and gives
 * the demo realistic numbers to talk about.
 */

export interface BRENDAEntry {
  ec_number: string;
  name: string;
  organism: string;
  uniprot_accession: string | null;
  primary_substrate: string;
  primary_product: string;
  km_mM: number | null;
  kcat_s: number | null;
  optimum_temperature_c: number | null;
  optimum_ph: number | null;
  reference: string;
  function_short: string;
  /** Free-text terms that, if present in the user's substrate or product,
   *  should match this enzyme during retrieval. */
  match_terms: string[];
}

export const BRENDA_SNAPSHOT: BRENDAEntry[] = [
  // ─── Ethanol metabolism / biofuel-relevant ────────────────────────────────
  {
    ec_number: "1.1.1.1",
    name: "Alcohol dehydrogenase 1 (ADH1)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "P00330",
    primary_substrate: "ethanol",
    primary_product: "acetaldehyde",
    km_mM: 17.0,
    kcat_s: 950,
    optimum_temperature_c: 30,
    optimum_ph: 8.5,
    reference: "Ganzhorn AJ et al., J Biol Chem (1987) 262:3754",
    function_short:
      "NAD+-dependent oxidation of ethanol to acetaldehyde — entry point of ethanol catabolism.",
    match_terms: ["ethanol", "alcohol", "ADH"],
  },
  {
    ec_number: "1.1.1.2",
    name: "Alcohol dehydrogenase (NADP+) (ADH6)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "Q04894",
    primary_substrate: "ethanol",
    primary_product: "acetaldehyde",
    km_mM: 24.0,
    kcat_s: 220,
    optimum_temperature_c: 30,
    optimum_ph: 7.0,
    reference: "Larroy C et al., Biochem J (2002) 361:163",
    function_short:
      "NADPH-preferring alcohol dehydrogenase active on medium-chain alcohols.",
    match_terms: ["ethanol", "NADPH", "ADH6"],
  },
  {
    ec_number: "4.1.1.1",
    name: "Pyruvate decarboxylase (PDC1)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "P06169",
    primary_substrate: "pyruvate",
    primary_product: "acetaldehyde",
    km_mM: 1.4,
    kcat_s: 60,
    optimum_temperature_c: 30,
    optimum_ph: 6.5,
    reference: "Lu G et al., J Mol Biol (2000) 297:121",
    function_short:
      "Decarboxylates pyruvate to acetaldehyde + CO2; required for ethanol fermentation.",
    match_terms: ["pyruvate", "decarboxylase", "PDC"],
  },
  {
    ec_number: "1.2.1.10",
    name: "Acetaldehyde dehydrogenase (AdhE, acetylating)",
    organism: "Escherichia coli",
    uniprot_accession: "P0A9Q7",
    primary_substrate: "acetaldehyde",
    primary_product: "acetyl-CoA",
    km_mM: 0.04,
    kcat_s: 30,
    optimum_temperature_c: 37,
    optimum_ph: 7.5,
    reference: "Espinosa-Urgel M et al., FEMS Microbiol Lett (1997) 152:347",
    function_short:
      "CoA-dependent oxidation of acetaldehyde to acetyl-CoA — gateway to fatty-acid biosynthesis.",
    match_terms: ["acetaldehyde", "acetyl-CoA", "AdhE"],
  },

  // ─── Fatty acid synthesis (ethanol → C8-C16 alkanes) ──────────────────────
  {
    ec_number: "6.4.1.2",
    name: "Acetyl-CoA carboxylase (ACC1)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "Q00955",
    primary_substrate: "acetyl-CoA",
    primary_product: "malonyl-CoA",
    km_mM: 0.05,
    kcat_s: 4.5,
    optimum_temperature_c: 30,
    optimum_ph: 8.0,
    reference: "Roesler KR et al., Plant Physiol (1997) 113:75",
    function_short:
      "ATP-dependent biotin-mediated carboxylation of acetyl-CoA — committed step of fatty-acid synthesis.",
    match_terms: ["acetyl-CoA", "malonyl-CoA", "carboxylase", "ACC"],
  },
  {
    ec_number: "2.3.1.85",
    name: "Fatty acid synthase (FASN)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "P07149",
    primary_substrate: "acetyl-CoA",
    primary_product: "palmitoyl-CoA (C16)",
    km_mM: 0.01,
    kcat_s: 0.3,
    optimum_temperature_c: 30,
    optimum_ph: 7.0,
    reference: "Lomakin IB et al., Cell (2007) 129:319",
    function_short:
      "Multi-domain megasynthase elongating malonyl-CoA into C14–C18 fatty acids.",
    match_terms: ["fatty acid", "palmitate", "FAS", "C16"],
  },
  {
    ec_number: "2.3.1.180",
    name: "β-ketoacyl-ACP synthase III (FabH)",
    organism: "Escherichia coli",
    uniprot_accession: "P0A6R0",
    primary_substrate: "acetyl-CoA",
    primary_product: "acetoacetyl-ACP",
    km_mM: 0.02,
    kcat_s: 1.2,
    optimum_temperature_c: 37,
    optimum_ph: 7.0,
    reference: "Heath RJ & Rock CO, J Biol Chem (1996) 271:27795",
    function_short:
      "Initiator condensing enzyme of bacterial fatty-acid biosynthesis.",
    match_terms: ["FabH", "ketoacyl", "C8", "C10", "fatty acid"],
  },
  {
    ec_number: "1.2.1.50",
    name: "Acyl-CoA reductase (LuxC-like)",
    organism: "Marinobacter aquaeolei VT8",
    uniprot_accession: "A1U2K0",
    primary_substrate: "fatty acyl-CoA",
    primary_product: "fatty aldehyde",
    km_mM: 0.06,
    kcat_s: 0.4,
    optimum_temperature_c: 30,
    optimum_ph: 7.5,
    reference: "Willis RM et al., Biochemistry (2011) 50:10550",
    function_short:
      "NADPH-dependent reduction of fatty acyl-CoA to fatty aldehyde — penultimate step of alkane biosynthesis.",
    match_terms: ["acyl-CoA reductase", "fatty aldehyde", "alkane"],
  },
  {
    ec_number: "4.1.99.5",
    name: "Aldehyde decarbonylase (cyanobacterial ADO)",
    organism: "Synechococcus elongatus PCC 7942",
    uniprot_accession: "Q54764",
    primary_substrate: "fatty aldehyde",
    primary_product: "alkane (Cn-1)",
    km_mM: 0.08,
    kcat_s: 0.04,
    optimum_temperature_c: 35,
    optimum_ph: 7.0,
    reference: "Schirmer A et al., Science (2010) 329:559",
    function_short:
      "O2- and ferredoxin-dependent decarbonylation of fatty aldehyde to alkane — final step of biosynthetic alkane production.",
    match_terms: ["alkane", "decarbonylase", "ADO", "C8", "C16", "hydrocarbon"],
  },

  // ─── CO2 fixation / methanol ──────────────────────────────────────────────
  {
    ec_number: "1.17.1.9",
    name: "Formate dehydrogenase (FDH)",
    organism: "Candida boidinii",
    uniprot_accession: "O13437",
    primary_substrate: "formate",
    primary_product: "carbon dioxide",
    km_mM: 7.0,
    kcat_s: 3.2,
    optimum_temperature_c: 45,
    optimum_ph: 7.0,
    reference: "Tishkov VI & Popov VO, Biochemistry (Mosc) (2004) 69:1252",
    function_short:
      "NAD+-dependent oxidation of formate to CO2; widely used as a cofactor regeneration enzyme.",
    match_terms: ["formate", "CO2", "FDH", "methanol", "carbon dioxide"],
  },
  {
    ec_number: "1.1.1.244",
    name: "Methanol dehydrogenase (MDH)",
    organism: "Methylobacterium extorquens AM1",
    uniprot_accession: "P14775",
    primary_substrate: "methanol",
    primary_product: "formaldehyde",
    km_mM: 0.06,
    kcat_s: 18,
    optimum_temperature_c: 30,
    optimum_ph: 9.0,
    reference: "Anthony C, Subcell Biochem (2000) 35:73",
    function_short:
      "PQQ-dependent periplasmic methanol oxidation in methylotrophic bacteria.",
    match_terms: ["methanol", "MDH", "formaldehyde"],
  },
  {
    ec_number: "4.1.1.39",
    name: "Ribulose bisphosphate carboxylase/oxygenase (RuBisCO, large subunit)",
    organism: "Synechococcus elongatus PCC 6301",
    uniprot_accession: "P00879",
    primary_substrate: "ribulose-1,5-bisphosphate + CO2",
    primary_product: "3-phosphoglycerate",
    km_mM: 0.2,
    kcat_s: 5.0,
    optimum_temperature_c: 30,
    optimum_ph: 8.0,
    reference: "Tcherkez GG et al., Proc Natl Acad Sci USA (2006) 103:7246",
    function_short:
      "The principal CO2-fixing enzyme on Earth; carboxylation of RuBP.",
    match_terms: ["RuBisCO", "CO2", "carbon fixation", "ribulose"],
  },
  {
    ec_number: "4.2.1.1",
    name: "Carbonic anhydrase II",
    organism: "Homo sapiens",
    uniprot_accession: "P00918",
    primary_substrate: "CO2 + H2O",
    primary_product: "bicarbonate + H+",
    km_mM: 9.3,
    kcat_s: 1_000_000,
    optimum_temperature_c: 25,
    optimum_ph: 7.5,
    reference: "Khalifah RG, J Biol Chem (1971) 246:2561",
    function_short:
      "Zn2+-catalyzed reversible hydration of CO2 — fastest known enzyme.",
    match_terms: ["carbonic anhydrase", "CO2", "bicarbonate"],
  },

  // ─── Glycolysis & central metabolism (canonical reference enzymes) ────────
  {
    ec_number: "2.7.1.1",
    name: "Hexokinase (HK1)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "P04806",
    primary_substrate: "glucose + ATP",
    primary_product: "glucose-6-phosphate + ADP",
    km_mM: 0.1,
    kcat_s: 220,
    optimum_temperature_c: 30,
    optimum_ph: 7.5,
    reference: "Cardenas ML et al., Biochim Biophys Acta (1998) 1401:242",
    function_short: "First committed step of glycolysis.",
    match_terms: ["glucose", "hexokinase", "phosphorylation"],
  },
  {
    ec_number: "1.2.1.12",
    name: "Glyceraldehyde-3-phosphate dehydrogenase (GAPDH)",
    organism: "Saccharomyces cerevisiae",
    uniprot_accession: "P00359",
    primary_substrate: "glyceraldehyde-3-phosphate",
    primary_product: "1,3-bisphosphoglycerate",
    km_mM: 0.08,
    kcat_s: 105,
    optimum_temperature_c: 30,
    optimum_ph: 8.5,
    reference: "Krimsky I & Racker E, Biochemistry (1963) 2:512",
    function_short:
      "Reversible NAD+-dependent oxidative phosphorylation in glycolysis.",
    match_terms: ["GAPDH", "glycolysis", "glyceraldehyde"],
  },
  {
    ec_number: "1.1.1.27",
    name: "L-lactate dehydrogenase (LDH)",
    organism: "Bacillus subtilis",
    uniprot_accession: "P13714",
    primary_substrate: "pyruvate",
    primary_product: "L-lactate",
    km_mM: 0.45,
    kcat_s: 380,
    optimum_temperature_c: 55,
    optimum_ph: 6.5,
    reference: "Mohan H & Mathew M, Indian J Biochem Biophys (1993) 30:178",
    function_short:
      "NADH-dependent reduction of pyruvate to L-lactate in fermentation.",
    match_terms: ["lactate", "LDH", "pyruvate", "fermentation"],
  },
  {
    ec_number: "1.1.1.37",
    name: "Malate dehydrogenase (MDH1)",
    organism: "Escherichia coli",
    uniprot_accession: "P61889",
    primary_substrate: "L-malate",
    primary_product: "oxaloacetate",
    km_mM: 0.5,
    kcat_s: 95,
    optimum_temperature_c: 37,
    optimum_ph: 8.0,
    reference: "Banaszak LJ & Bradshaw RA, in The Enzymes (1975) 11:369",
    function_short: "TCA cycle and gluconeogenic malate/oxaloacetate interconversion.",
    match_terms: ["malate", "MDH", "TCA"],
  },
  {
    ec_number: "1.1.1.42",
    name: "NADP-dependent isocitrate dehydrogenase (IDH)",
    organism: "Escherichia coli",
    uniprot_accession: "P08200",
    primary_substrate: "isocitrate",
    primary_product: "α-ketoglutarate + CO2",
    km_mM: 0.12,
    kcat_s: 88,
    optimum_temperature_c: 37,
    optimum_ph: 7.5,
    reference: "Hurley JH et al., Science (1990) 249:1012",
    function_short: "Oxidative decarboxylation of isocitrate in the TCA cycle.",
    match_terms: ["isocitrate", "IDH", "TCA"],
  },
  {
    ec_number: "2.3.3.1",
    name: "Citrate synthase (gltA)",
    organism: "Escherichia coli",
    uniprot_accession: "P0ABH7",
    primary_substrate: "acetyl-CoA + oxaloacetate",
    primary_product: "citrate",
    km_mM: 0.1,
    kcat_s: 175,
    optimum_temperature_c: 37,
    optimum_ph: 8.0,
    reference: "Bell AW et al., Biochemistry (1983) 22:3841",
    function_short: "Initial condensation of the TCA cycle.",
    match_terms: ["citrate", "TCA", "oxaloacetate"],
  },

  // ─── Aromatic, branched-chain & heterocyclic ──────────────────────────────
  {
    ec_number: "4.3.1.24",
    name: "Phenylalanine ammonia-lyase (PAL)",
    organism: "Petroselinum crispum",
    uniprot_accession: "P24481",
    primary_substrate: "L-phenylalanine",
    primary_product: "trans-cinnamate",
    km_mM: 0.07,
    kcat_s: 22,
    optimum_temperature_c: 40,
    optimum_ph: 8.5,
    reference: "MacDonald MJ & D'Cunha GB, Biochem Cell Biol (2007) 85:273",
    function_short:
      "Non-oxidative deamination of L-phenylalanine — entry point to plant phenylpropanoid metabolism.",
    match_terms: ["phenylalanine", "PAL", "cinnamate", "aromatic"],
  },
  {
    ec_number: "4.3.1.23",
    name: "Tyrosine ammonia-lyase (TAL)",
    organism: "Rhodobacter capsulatus",
    uniprot_accession: "Q3IWB0",
    primary_substrate: "L-tyrosine",
    primary_product: "p-coumarate",
    km_mM: 0.16,
    kcat_s: 1.5,
    optimum_temperature_c: 30,
    optimum_ph: 8.5,
    reference: "Kyndt JA et al., FEBS Lett (2002) 512:240",
    function_short:
      "Bacterial deamination of L-tyrosine to p-coumarate — flavonoid biosynthesis intermediate.",
    match_terms: ["tyrosine", "TAL", "p-coumarate", "aromatic"],
  },
  {
    ec_number: "1.14.13.81",
    name: "Cytochrome P450 BM3 (CYP102A1)",
    organism: "Bacillus megaterium",
    uniprot_accession: "P14779",
    primary_substrate: "fatty acid (long chain)",
    primary_product: "ω-hydroxy fatty acid",
    km_mM: 0.01,
    kcat_s: 285,
    optimum_temperature_c: 37,
    optimum_ph: 7.5,
    reference: "Noble MA et al., Biochem J (1999) 339:371",
    function_short:
      "Self-sufficient fatty-acid hydroxylase — workhorse for engineered C–H activation.",
    match_terms: ["P450", "BM3", "hydroxylation", "fatty acid"],
  },

  // ─── Cellulosic biomass ──────────────────────────────────────────────────
  {
    ec_number: "3.2.1.91",
    name: "Cellobiohydrolase I (Cel7A)",
    organism: "Trichoderma reesei",
    uniprot_accession: "P62694",
    primary_substrate: "cellulose",
    primary_product: "cellobiose",
    km_mM: 5.0,
    kcat_s: 6.5,
    optimum_temperature_c: 65,
    optimum_ph: 4.5,
    reference: "Divne C et al., Science (1994) 265:524",
    function_short:
      "Processive exoglucanase that liberates cellobiose from cellulose chain ends.",
    match_terms: ["cellulose", "cellobiohydrolase", "Cel7A", "biomass"],
  },
  {
    ec_number: "3.2.1.4",
    name: "Endo-1,4-β-glucanase (Cel5A)",
    organism: "Acidothermus cellulolyticus",
    uniprot_accession: "P54583",
    primary_substrate: "cellulose",
    primary_product: "cello-oligosaccharides",
    km_mM: 12,
    kcat_s: 22,
    optimum_temperature_c: 75,
    optimum_ph: 5.0,
    reference: "Sakon J et al., Biochemistry (1996) 35:10648",
    function_short:
      "Thermophilic endoglucanase — internal cleavage of β-1,4 bonds in cellulose.",
    match_terms: ["cellulose", "endoglucanase", "biomass", "thermophile"],
  },
  {
    ec_number: "3.2.1.21",
    name: "β-glucosidase (BglB)",
    organism: "Thermotoga maritima",
    uniprot_accession: "Q08638",
    primary_substrate: "cellobiose",
    primary_product: "glucose",
    km_mM: 0.4,
    kcat_s: 70,
    optimum_temperature_c: 90,
    optimum_ph: 6.0,
    reference: "Zechel DL et al., Biochemistry (2003) 42:7195",
    function_short:
      "Hyperthermostable hydrolysis of cellobiose to glucose — final step of cellulose saccharification.",
    match_terms: ["cellobiose", "glucose", "glucosidase", "biomass"],
  },

  // ─── Nitrogen / cofactor / regulatory ─────────────────────────────────────
  {
    ec_number: "1.18.1.2",
    name: "Ferredoxin-NADP+ reductase (FNR)",
    organism: "Spinacia oleracea",
    uniprot_accession: "P00455",
    primary_substrate: "ferredoxin (reduced)",
    primary_product: "NADPH",
    km_mM: 0.005,
    kcat_s: 280,
    optimum_temperature_c: 25,
    optimum_ph: 7.5,
    reference: "Aliverti A et al., Photosynth Res (1995) 43:1",
    function_short:
      "Final electron-transfer step of photosynthesis — produces NADPH for the Calvin cycle.",
    match_terms: ["ferredoxin", "NADP", "FNR", "redox"],
  },
  {
    ec_number: "2.7.1.30",
    name: "Glycerol kinase (GK)",
    organism: "Escherichia coli",
    uniprot_accession: "P0A6F3",
    primary_substrate: "glycerol",
    primary_product: "glycerol-3-phosphate",
    km_mM: 0.02,
    kcat_s: 100,
    optimum_temperature_c: 37,
    optimum_ph: 9.0,
    reference: "Hurley JH et al., Science (1993) 259:673",
    function_short: "ATP-dependent phosphorylation of glycerol — first step of glycerol catabolism.",
    match_terms: ["glycerol", "kinase", "phosphorylation"],
  },
  {
    ec_number: "4.1.1.32",
    name: "Phosphoenolpyruvate carboxykinase (PEPCK)",
    organism: "Escherichia coli",
    uniprot_accession: "P22259",
    primary_substrate: "oxaloacetate + GTP",
    primary_product: "phosphoenolpyruvate + GDP + CO2",
    km_mM: 0.07,
    kcat_s: 25,
    optimum_temperature_c: 37,
    optimum_ph: 7.5,
    reference: "Matte A et al., J Mol Biol (1996) 256:126",
    function_short: "Gluconeogenic decarboxylation of oxaloacetate to PEP.",
    match_terms: ["PEPCK", "oxaloacetate", "PEP", "gluconeogenesis"],
  },
  {
    ec_number: "1.1.1.49",
    name: "Glucose-6-phosphate dehydrogenase (G6PD)",
    organism: "Leuconostoc mesenteroides",
    uniprot_accession: "P11411",
    primary_substrate: "glucose-6-phosphate",
    primary_product: "6-phospho-D-glucono-1,5-lactone",
    km_mM: 0.07,
    kcat_s: 220,
    optimum_temperature_c: 37,
    optimum_ph: 7.5,
    reference: "Levy HR & Cook PF, Methods Enzymol (1988) 89:339",
    function_short: "First step of the pentose phosphate pathway — major NADPH source.",
    match_terms: ["G6PD", "glucose-6-phosphate", "NADPH", "pentose"],
  },
  {
    ec_number: "2.6.1.42",
    name: "Branched-chain aminotransferase (BCAT)",
    organism: "Escherichia coli",
    uniprot_accession: "P0AB80",
    primary_substrate: "L-isoleucine",
    primary_product: "α-keto-β-methylvalerate",
    km_mM: 0.18,
    kcat_s: 22,
    optimum_temperature_c: 37,
    optimum_ph: 8.0,
    reference: "Inoue K et al., J Biochem (1988) 104:777",
    function_short:
      "PLP-dependent transamination of branched-chain amino acids — engineered for higher-alcohol biosynthesis.",
    match_terms: ["BCAT", "isoleucine", "valine", "leucine", "aminotransferase"],
  },
  {
    ec_number: "1.4.1.13",
    name: "Glutamate synthase (GltBD)",
    organism: "Azospirillum brasilense",
    uniprot_accession: "P22106",
    primary_substrate: "α-ketoglutarate + glutamine",
    primary_product: "L-glutamate",
    km_mM: 0.1,
    kcat_s: 4.0,
    optimum_temperature_c: 30,
    optimum_ph: 7.5,
    reference: "Vanoni MA & Curti B, Cell Mol Life Sci (1999) 55:617",
    function_short:
      "Two-component flavin-containing glutamate synthase — central to bacterial nitrogen assimilation.",
    match_terms: ["glutamate", "synthase", "nitrogen"],
  },
];

export interface BRENDASearchInput {
  substrate?: string;
  product?: string;
  ec_number?: string;
  limit?: number;
}

export function searchBRENDASnapshot(
  input: BRENDASearchInput,
): BRENDAEntry[] {
  const terms = [input.substrate, input.product]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());

  let hits: BRENDAEntry[] = BRENDA_SNAPSHOT;

  if (input.ec_number) {
    hits = hits.filter((e) => e.ec_number === input.ec_number);
  }

  if (terms.length > 0) {
    hits = hits.filter((e) => {
      const hay = [
        e.name.toLowerCase(),
        e.primary_substrate.toLowerCase(),
        e.primary_product.toLowerCase(),
        e.function_short.toLowerCase(),
        ...e.match_terms.map((t) => t.toLowerCase()),
      ].join("\n");
      return terms.some((t) => hay.includes(t));
    });
  }

  return hits.slice(0, input.limit ?? 30);
}
