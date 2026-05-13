#!/usr/bin/env node
/**
 * Seed demo data for EnzymeForge.ai — founder-demo edition.
 *
 * Three commands:
 *   pnpm seed              Idempotent. If the demo workspace already has data,
 *                          skip with a clear message.
 *   pnpm seed --force      Wipe the demo workspace, then reseed.
 *   pnpm seed:reset        Wipe-only. No reseed (use `pnpm seed` after).
 *
 * "Demo workspace" = the workspace owned by `demo@enzymeforge.ai`. All other
 * workspaces are left untouched. Wipe cascades:
 *   - delete projects in the workspace      → cascades to enzyme_candidates,
 *     predictions, experiments, pathway_designs, candidate-scoped comments,
 *     and project-scoped audit_log rows (audit_log FK is ON DELETE CASCADE
 *     via workspace_id, not entity_id, so we delete those explicitly too).
 *   - delete model_calibration globally     → so retrain demo starts at
 *     a clean v1.0.0 baseline.
 *
 * Sequences are bundled inline as fallback (snapshots taken 2026-05-08).
 * `pnpm seed` first tries a live UniProt fetch with an 8-second timeout
 * per accession; if that fails we use the bundled snapshot.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

// ─── Config ────────────────────────────────────────────────────────────────

const DEMO_EMAIL = "demo@enzymeforge.ai";
const DEMO_PASSWORD = "enzymeforge-demo-2026";
const DEMO_NAME = "Demo Researcher";

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const RESET_ONLY = args.has("--reset-only");

// ─── Bundled enzyme sequences (fallback for offline UniProt) ───────────────
// Snapshots from rest.uniprot.org/uniprotkb/<acc>.fasta on 2026-05-08.

const BUNDLED_SEQUENCES = {
  P00330:
       "MSIPETQKGVIFYESHGKLEYKDIPVPKPKANELLINVKYSGVCHTDLHAWHGDWPLPVKLPLVGGHEGAGVVVGMGENV"
     + "KGWKIGDYAGIKWLNGSCMACEYCELGNESNCPHADLSGYTHDGSFQQYATADAVQAAHIPQGTDLAQVAPILCAGITVY"
     + "KALKSANLMAGHWVAISGAAGGLGSLAVQYAKAMGYRVLGIDGGEGKEELFRSIGGEVFIDFTKEKDIVGAVLKATDGGA"
     + "HGVINVSVSEAAIEASTRYVRANGTTVLVGMPAGAKCCSDVFNQVVKSISIVGSYVGNRADTREALDFFARGLVKSPIKV"
     + "VGLSTLPEIYEKMEKGQIVGRYVVDTSK",
  P0A9Q7:
       "MAVTNVAELNALVERVKKAQREYASFTQEQVDKIFRAAALAAADARIPLAKMAVAESGMGIVEDKVIKNHFASEYIYNAY"
     + "KDEKTCGVLSEDDTFGTITIAEPIGIICGIVPTTNPTSTAIFKSLISLKTRNAIIFSPHPRAKDATNKAADIVLQAAIAA"
     + "GAPKDLIGWIDQPSVELSNALMHHPDINLILATGGPGMVKAAYSSGKPAIGVGAGNTPVVIDETADIKRAVASVLMSKTF"
     + "DNGVICASEQSVVVVDSVYDAVRERFATHGGYLLQGKELKAVQDVILKNGALNAAIVGQPAYKIAELAGFSVPENTKILI"
     + "GEVTVVDESEPFAHEKLSPTLAMYRAKDFEDAVEKAEKLVAMGGIGHTSCLYTDQDNQPARVSYFGQKMKTARILINTPA"
     + "SQGGIGDLYNFKLAPSLTLGCGSWGGNSISENVGPKHLINKKTVAKRAENMLWHKLPKSIYFRRGSLPIALDEVITDGHK"
     + "RALIVTDRFLFNNGYADQITSVLKAAGVETEVFFEVEADPTLSIVRKGAELANSFKPDVIIALGGGSPMDAAKIMWVMYE"
     + "HPETHFEELALRFMDIRKRIYKFPKMGVKAKMIAVTTTSGTGSEVTPFAVVTDDATGQKYPLADYALTPDMAIVDANLVM"
     + "DMPKSLCAFGGLDAVTHAMEAYVSVLASEFSDGQALQALKLLKEYLPASYHEGSKNPVARERVHSAATIAGIAFANAFLG"
     + "VCHSMAHKLGSQFHIPHGLANALLICNVIRYNANDNPTKQTAFSQYDRPQARRRYAEIADHLGLSAPGDRTAAKIEKLLA"
     + "WLETLKAELGIPKSIREAGVQEADFLANVDKLSEDAFDDQCTGANPRYPLISELKQILLDTYYGRDYVEGETAAKKEAAP"
     + "AKAEKKAKKSA",
  P06169:
       "MSEITLGKYLFERLKQVNVNTVFGLPGDFNLSLLDKIYEVEGMRWAGNANELNAAYAADGYARIKGMSCIITTFGVGELS"
     + "ALNGIAGSYAEHVGVLHVVGVPSISAQAKQLLLHHTLGNGDFTVFHRMSANISETTAMITDIATAPAEIDRCIRTTYVTQ"
     + "RPVYLGLPANLVDLNVPAKLLQTPIDMSLKPNDAESEKEVIDTILALVKDAKNPVILADACCSRHDVKAETKKLIDLTQF"
     + "PAFVTPMGKGSIDEQHPRYGGVYVGTLSKPEVKEAVESADLILSVGALLSDFNTGSFSYSYKTKNIVEFHSDHMKIRNAT"
     + "FPGVQMKFVLQKLLTTIADAAKGYKPVAVPARTPANAAVPASTPLKQEWMWNQLGNFLQEGDVVIAETGTSAFGINQTTF"
     + "PNNTYGISQVLWGSIGFTTGATLGAAFAAEEIDPKKRVILFIGDGSLQLTVQEISTMIRWGLKPYLFVLNNDGYTIEKLI"
     + "HGPKAQYNEIQGWDHLSLLPTFGAKDYETHRVATTGEWDKLTQDKSFNDNSKIRMIEIMLPVFDAPQNLVEQAKLTAATN"
     + "AKQ",
  P0A6L0:
       "MTDLKASSLRALKLMDLTTLNDDDTDEKVIALCHQAKTPVGNTAAICIYPRFIPIARKTLKEQGTPEIRIATVTNFPHGN"
     + "DDIDIALAETRAAIAYGADEVDVVFPYRALMAGNEQVGFDLVKACKEACAAANVLLKVIIETGELKDEALIRKASEISIK"
     + "AGADFIKTSTGKVAVNATPESARIMMEVIRDMGVEKTVGFKPAGGVRTAEDAQKYLAIADELFGADWADARHYRFGASSL"
     + "LASLLKALGHGDGKSASSY",
  Q00955:
       "MSEESLFESSPQKMEYEITNYSERHTELPGHFIGLNTVDKLEESPLRDFVKSHGGHTVISKILIANNGIAAVKEIRSVRK"
     + "WAYETFGDDRTVQFVAMATPEDLEANAEYIRMADQYIEVPGGTNNNNYANVDLIVDIAERADVDAVWAGWGHASENPLLP"
     + "EKLSQSKRKVIFIGPPGNAMRSLGDKISSTIVAQSAKVPCIPWSGTGVDTVHVDEKTGLVSVDDDIYQKGCCTSPEDGLQ"
     + "KAKRIGFPVMIKASEGGGGKGIRQVEREEDFIALYHQAANEIPGSPIFIMKLAGRARHLEVQLLADQYGTNISLFGRDCS"
     + "VQRRHQKIIEEAPVTIAKAETFHEMEKAAVRLGKLVGYVSAGTVEYLYSHDDGKFYFLELNPRLQVEHPTTEMVSGVNLP"
     + "AAQLQIAMGIPMHRISDIRTLYGMNPHSASEIDFEFKTQDATKKQRRPIPKGHCTACRITSEDPNDGFKPSGGTLHELNF"
     + "RSSSNVWGYFSVGNNGNIHSFSDSQFGHIFAFGENRQASRKHMVVALKELSIRGDFRTTVEYLIKLLETEDFEDNTITTG"
     + "WLDDLITHKMTAEKPDPTLAVICGAATKAFLASEEARHKYIESLQKGQVLSKDLLQTMFPVDFIHEGKRYKFTVAKSGND"
     + "RYTLFINGSKCDIILRQLSDGGLLIAIGGKSHTIYWKEEVAATRLSVDSMTTLLEVENDPTQLRTPSPGKLVKFLVENGE"
     + "HIIKGQPYAEIEVMKMQMPLVSQENGIVQLLKQPGSTIVAGDIMAIMTLDDPSKVKHALPFEGMLPDFGSPVIEGTKPAY"
     + "KFKSLVSTLENILKGYDNQVIMNASLQQLIEVLRNPKLPYSEWKLHISALHSRLPAKLDEQMEELVARSLRRGAVFPARQ"
     + "LSKLIDMAVKNPEYNPDKLLGAVVEPLADIAHKYSNGLEAHEHSIFVHFLEEYYEVEKLFNGPNVREENIILKLRDENPK"
     + "DLDKVALTVLSHSKVSAKNNLILAILKHYQPLCKLSSKVSAIFSTPLQHIVELESKATAKVALQAREILIQGALPSVKER"
     + "TEQIEHILKSSVVKVAYGSSNPKRSEPDLNILKDLIDSNYVVFDVLLQFLTHQDPVVTAAAAQVYIRRAYRAYTIGDIRV"
     + "HEGVTVPIVEWKFQLPSAAFSTFPTVKSKMGMNRAVSVSDLSYVANSQSSPLREGILMAVDHLDDVDEILSQSLEVIPRH"
     + "QSSSNGPAPDRSGSSASLSNVANVCVASTEGFESEEEILVRLREILDLNKQELINASIRRITFMFGFKDGSYPKYYTFNG"
     + "PNYNENETIRHIEPALAFQLELGRLSNFNIKPIFTDNRNIHVYEAVSKTSPLDKRFFTRGIIRTGHIRDDISIQEYLTSE"
     + "ANRLMSDILDNLEVTDTSNSDLNHIFINFIAVFDISPEDVEAAFGGFLERFGKRLLRLRVSSAEIRIIIKDPQTGAPVPL"
     + "RALINNVSGYVIKTEMYTEVKNAKGEWVFKSLGKPGSMHLRPIATPYPVKEWLQPKRYKAHLMGTTYVYDFPELFRQASS"
     + "SQWKNFSADVKLTDDFFISNELIEDENGELTEVEREPGANAIGMVAFKITVKTPEYPRGRQFVVVANDITFKIGSFGPQE"
     + "DEFFNKVTEYARKRGIPRIYLAANSGARIGMAEEIVPLFQVAWNDAANPDKGFQYLYLTSEGMETLKKFDKENSVLTERT"
     + "VINGEERFVIKTIIGSEDGLGVECLRGSGLIAGATSRAYHDIFTITLVTCRSVGIGAYLVRLGQRAIQVEGQPIILTGAP"
     + "AINKMLGREVYTSNLQLGGTQIMYNNGVSHLTAVDDLAGVEKIVEWMSYVPAKRNMPVPILETKDTWDRPVDFTPTNDET"
     + "YDVRWMIEGRETESGFEYGLFDKGSFFETLSGWAKGVVVGRARLGGIPLGVIGVETRTVENLIPADPANPNSAETLIQEP"
     + "GQVWHPNSAFKTAQAINDFNNGEQLPMMILANWRGFSGGQRDMFNEVLKYGSFIVDALVDYKQPIIIYIPPTGELRGGSW"
     + "VVVDPTINADQMEMYADVNARAGVLEPQGMVGIKFRREKLLDTMNRLDDKYRELRSQLSNKSLAPEVHQQISKQLADRER"
     + "ELLPIYGQISLQFADLHDRSSRMVAKGVISKELEWTEARRFFFWRLRRRLNEEYLIKRLSHQVGEASRLEKIARIRSWYP"
     + "ASVDHEDDRQVATWIEENYKTLDDKLKGLKLESFAQDLAKKIRSDHDNAIDGLSEVIKMLSTDDKEKLLKTLK",
  P0A6R0:
       "MYTKIIGTGSYLPEQVRTNADLEKMVDTSDEWIVTRTGIRERHIAAPNETVSTMGFEAATRAIEMAGIEKDQIGLIVVAT"
     + "TSATHAFPSAACQIQSMLGIKGCPAFDVAAACAGFTYALSVADQYVKSGAVKYALVVGSDVLARTCDPTDRGTIIIFGDG"
     + "AGAAVLAASEEPGIISTHLHADGSYGELLTLPNADRVNPENSIHLTMAGNEVFKVAVTELAHIVDETLAANNLDRSQLDW"
     + "LVPHQANLRIISATAKKLGMSMDNVVVTLDRHGNTSAASVPCALDEAVRDGRIKPGQLVLLEAFGGGFTWGSALVRF",
  P0A6Q3:
       "MVDKRESYTKEDLLASGRGELFGAKGPQLPAPNMLMMDRVVKMTETGGNFDKGYVEAELDINPDLWFFGCHFIGDPVMPG"
     + "CLGLDAMWQLVGFYLGWLGGEGKGRALGVGEVKFTGQVLPTAKKVTYRIHFKRIVNRRLIMGLADGEVLVDGRLIYTASD"
     + "LKVGLFQDTSAF",
  Q54765:
       "MFGLIGHLTSLEQARDVSRRMGYDEYADQGLEFWSSAPPQIVDEITVTSATGKVIHGRYIESCFLPEMLAARRFKTATRK"
     + "VLNAMSHAQKHGIDISALGGFTSIIFENFDLASLRQVRDTTLEFERFTTGNTHTAYVICRQVEAAAKTLGIDITQATVAV"
     + "VGATGDIGSAVCRWLDLKLGVGDLILTARNQERLDNLQAELGRGKILPLEAALPEADFIVWVASMPQGVVIDPATLKQPC"
     + "VLIDGGYPKNLGSKVQGEGIYVLNGGVVEHCFDIDWQIMSAAEMARPERQMFACFAEAMLLEFEGWHTNFSWGRNQITIE"
     + "KMEAIGEASVRHGFQPLALAI",
  Q54764:
       "MPQLEASLELDFQSESYKDAYSRINAIVIEGEQEAFDNYNRLAEMLPDQRDELHKLAKMEQRHMKGFMACGKNLSVTPDM"
     + "GFAQKFFERLHENFKAAAAEGKVVTCLLIQSLIIECFAIAAYNIYIPVADAFARKITEGVVRDEYLHRNFGEEWLKANFD"
     + "ASKAELEEANRQNLPLVWLMLNEVADDARELGMERESLVEDFMIAYGEALENIGFTTREIMRMSAYGLAAV",
  O13437:
       "MKIVLVLYDAGKHAADEEKLYGCTENKLGIANWLKDQGHELITTSDKEGETSELDKHIPDADIIITTPFHPAYITKERLD"
     + "KAKNLKLVVVAGVGSDHIDLDYINQTGKKISVLEVTGSNVVSVAEHVVMTMLVLVRNFVPAHEQIINHDWEVAAIAKDAY"
     + "DIEGKTIATIGAGRIGYRVLERLLPFNPKELLYYDYQALPKEAEEKVGARRVENIEELVAQADIVTVNAPLHAGTKGLIN"
     + "KELLSKFKKGAWLVNTARGAICVAEDVAAALESGQLRGYGGDVWFPQPAPKDHPWRDMRNKYGAGNAMTPHYSGTTLDAQ"
     + "TRYAEGTKNILESFFTGKFDYRPQDIILLNGEYVTKAYGKHDKK",
  P31005:
       "MTNFFIPPASVIGRGAVKEVGTRLKQIGAKKALIVTDAFLHSTGLSEEVAKNIREAGLDVAIFPKAQPDPADTQVHEGVD"
     + "VFKQENCDALVSIGGGSSHDTAKAIGLVAANGGRINDYQGVNSVEKPVVPVVAITTTAGTGSETTSLAVITDSARKVKMP"
     + "VIDEKITPTVAIVDPELMVKKPAGLTIATGMDALSHAIEAYVAKGATPVTDAFAIQAMKLINEYLPKAVANGEDIEAREA"
     + "MAYAQYMAGVAFNNGGLGLVHSISHQVGGVYKLQHGICNSVNMPHVCAFNLIAKTERFAHIAELLGENVSGLSTAAAAER"
     + "AIVALERYNKNFGIPSGYAEMGVKEEDIELLAKNAFEDVCTQSNPRVATVQDIAQIIKNAL",
  P00918:
       "MSHHWGYGKHNGPEHWHKDFPIAKGERQSPVDIDTHTAKYDPSLKPLSVSYDQATSLRILNNGHAFNVEFDDSQDKAVLK"
     + "GGPLDGTYRLIQFHFHWGSLDGQGSEHTVDKKKYAAELHLVHWNTKYGDFGKAVQQPDGLAVLGIFLKVGSAKPGLQKVV"
     + "DVLDSIKTKGKSADFTNFDPRGLLPESLDYWTYPGSLTTPPLLECVTWIVLKEPISVSSEQVLKFRKLNFNGEGEPEELM"
     + "VDNWRPAQPLKNRQIKASFK",
  P00879:
       "MSYAQTKTQTKSGYKAGVQDYRLTYYTPDYTPKDTDILAAFRVTPQPGVPFEEAAAAVAAESSTGTWTTVWTDLLTDLDR"
     + "YKGRCYDIEPVPGEDNQFIAYIAYPLDLFEEGSITNVLTSIVGNVFGFKALRALRLEDIRFPVAYIKTFQGPPHGIQVER"
     + "DKLNKYGRPLLGCTIKPKLGLSAKNYGRAVYECLRGGLDFTKDDENINSAPFQRWRDRFLFVADAITKAQAETGEIKGHY"
     + "LNVTAPTCEEMLKRAEYAKELKQPIIMHDYLTAGFTANTTLARWCRDNGVLLHIHRAMHAVIDRQKNHGIHFRVLAKALR"
     + "LSGGDHIHTGTVVGKLEGERGITMGFVDLLRENYVEQDKSRGIYFTQDWASLPGVMAVASGGIHVWHMPALVEIFGDDSV"
     + "LQFGGGTLGHPWGNAPGATANRVALEACVQARNEGRNLAREGNDVIREAAKWSPELAVACELWKEIKFEFEAMDTV",
  P25437:
       "MKSRAAVAFAPGKPLEIVEIDVAPPKKGEVLIKVTHTGVCHTDAFTLSGDDPEGVFPVVLGHEGAGVVVEVGEGVTSVKP"
     + "GDHVIPLYTAECGECEFCRSGKTNLCVAVRETQGKGLMPDGTTRFSYNGQPLYHYMGCSTFSEYTVVAEVSLAKINPEAN"
     + "HEHVCLLGCGVTTGIGAVHNTAKVQPGDSVAVFGLGAIGLAVVQGARQAKAGRIIAIDTNPKKFDLARRFGATDCINPND"
     + "YDKPIKDVLLDINKWGIDHTFECIGNVNVMRAALESAHRGWGQSVIIGVAVAGQEISTRPFQLVTGRVWKGSAFGGVKGR"
     + "SQLPGMVEDAMKGDIDLEPFVTHTMSLDEINDAFDLMHEGKSIRTVIRY",
};

// ─── Enzyme metadata ───────────────────────────────────────────────────────

const ENZYME_META = {
  P00330: { name: "Alcohol dehydrogenase 1 (ADH1)", organism: "Saccharomyces cerevisiae", ec: "1.1.1.1", pdb: "4W6Z",
    function_short: "NAD+-dependent oxidation of ethanol to acetaldehyde — entry point of ethanol catabolism." },
  P0A9Q7: { name: "Bifunctional aldehyde-alcohol dehydrogenase AdhE", organism: "Escherichia coli", ec: "1.2.1.10", pdb: null,
    function_short: "CoA-dependent oxidation of acetaldehyde to acetyl-CoA; bridges fermentation to fatty-acid biosynthesis." },
  P06169: { name: "Pyruvate decarboxylase isozyme 1 (PDC1)", organism: "Saccharomyces cerevisiae", ec: "4.1.1.1", pdb: null,
    function_short: "Decarboxylates pyruvate to acetaldehyde + CO2; couples glycolysis to the ethanol branch." },
  P0A6L0: { name: "Deoxyribose-phosphate aldolase (DERA)", organism: "Escherichia coli", ec: "4.1.2.4", pdb: "1JCJ",
    function_short: "Aldol condensation of acetaldehyde to deoxyribose-5-phosphate; engineered for C–C bond formation in synbio." },
  Q00955: { name: "Acetyl-CoA carboxylase (ACC1)", organism: "Saccharomyces cerevisiae", ec: "6.4.1.2", pdb: null,
    function_short: "ATP-dependent biotin-mediated carboxylation of acetyl-CoA — committed step of fatty-acid synthesis." },
  P0A6R0: { name: "β-ketoacyl-ACP synthase III (FabH)", organism: "Escherichia coli", ec: "2.3.1.180", pdb: "1HNJ",
    function_short: "Initiator condensing enzyme of bacterial fatty-acid biosynthesis; controls chain-length specificity." },
  P0A6Q3: { name: "3-hydroxydecanoyl-ACP dehydratase (FabA)", organism: "Escherichia coli", ec: "4.2.1.59", pdb: "1MKA",
    function_short: "Dehydratase / isomerase in unsaturated fatty-acid biosynthesis; introduces the cis-double bond." },
  Q54765: { name: "Long-chain acyl-ACP reductase (AAR)", organism: "Synechococcus elongatus PCC 7942", ec: "1.2.1.80", pdb: null,
    function_short: "NADPH-dependent reduction of fatty acyl-ACP to fatty aldehyde — penultimate step of alkane biosynthesis." },
  Q54764: { name: "Aldehyde decarbonylase (ADO)", organism: "Synechococcus elongatus PCC 7942", ec: "4.1.99.5", pdb: "2OC5",
    function_short: "O2-/ferredoxin-dependent decarbonylation of fatty aldehyde to alkane — slow step (kcat≈0.04 s⁻¹)." },
  O13437: { name: "Formate dehydrogenase (FDH)", organism: "Candida boidinii", ec: "1.17.1.9", pdb: "2NAD",
    function_short: "NAD+-dependent formate/CO2 interconversion; reversible under high-energy reductant for CO2 reduction." },
  P31005: { name: "NAD-dependent methanol dehydrogenase (Mdh)", organism: "Bacillus methanolicus", ec: "1.1.1.244", pdb: null,
    function_short: "Reversible methanol/formaldehyde interconversion; engineered for methanol synthesis in reverse direction." },
  P00918: { name: "Carbonic anhydrase II", organism: "Homo sapiens", ec: "4.2.1.1", pdb: "2CBA",
    function_short: "Zn²⁺-catalyzed reversible hydration of CO2 — fastest known enzyme (kcat ≈ 10⁶ s⁻¹)." },
  P00879: { name: "Ribulose-bisphosphate carboxylase large chain (RbcL)", organism: "Nostoc sp. PCC 7120", ec: "4.1.1.39", pdb: "1RXO",
    function_short: "The principal CO2-fixing enzyme on Earth; carboxylation of ribulose-1,5-bisphosphate." },
  P25437: { name: "S-(hydroxymethyl)glutathione dehydrogenase (FrmA)", organism: "Escherichia coli", ec: "1.1.1.284", pdb: null,
    function_short: "Reversible formaldehyde/formate interconversion via glutathione adduct — central to C1 metabolism." },
};

// ─── Variant specs ─────────────────────────────────────────────────────────

/*
 * Variants on yeast ADH1 (P00330, 348 aa, 1-indexed with initiator Met).
 *
 * Active-site reference (verified against the bundled sequence above):
 *   Catalytic-zinc ligands       Cys44, His67, Cys154
 *   Structural-zinc Cys cluster  Cys98, Cys101, Cys104, Cys112
 *                                (canonical MDR-family CXXC...CXC motif,
 *                                 visible in CMACEYCELGNES...NCP)
 * Neither narrative residue (142 or 286) sits at a Zn-binding site — both
 * are deliberately *outside* the catalytic core, in regions that modulate
 * kinetics rather than abolish them. This is what makes them realistic
 * demo targets: real engineering campaigns mutate these regions.
 *
 * The two "narrative" residues:
 *
 *   Position 142 = Q (glutamine) — in the Rossmann NAD-binding β-α-β loop
 *   (residues 135-145). Coenzyme-affinity residue. Mutation Q142A reduces
 *   the polar contact with the NAD adenine ribose; some characterized yeast
 *   ADH1 variants show *increased* turnover when this contact is relaxed
 *   because the rate-limiting step shifts from NADH release to hydride
 *   transfer. Demo narrative: "the model under-weighted coenzyme-release
 *   kinetics, so this variant exceeded prediction."
 *
 *   Position 286 = V (valine) — in the substrate-channel loop (residues
 *   281-295, sequence DVFNQVVKSISIVGSY, with D at 281). Plapp's and
 *   Trezeguet's labs identified this loop as governing alcohol substrate
 *   access; V286A/V286I disrupts channel hydrophobicity and consistently
 *   lowers activity on medium-chain alcohols. Demo narrative: "two
 *   underperformers share a mutation at 286 → the hypothesis surfacing
 *   engine flags it on retrain."
 *
 * These two narrative beats from one dataset: 142 is the model "learning"
 * something it under-weighted; 286 is the recurring-mutation hypothesis.
 */
const ADH1_VARIANTS = [
  {
    name: "ADH1_v1",
    mutations: [{ position: 142, from: "Q", to: "A", score: 0.34 }],
    predicted: { activity: 0.75, stability: 0.72, expression: 0.78, predicted_yield: 0.74 },
  },
  {
    name: "ADH1_v2",
    mutations: [
      { position: 286, from: "V", to: "A", score: 0.21 },
      { position: 116, from: "D", to: "N", score: 0.18 },
    ],
    predicted: { activity: 0.72, stability: 0.65, expression: 0.75, predicted_yield: 0.68 },
  },
  {
    name: "ADH1_v3",
    mutations: [{ position: 286, from: "V", to: "I", score: 0.26 }],
    predicted: { activity: 0.68, stability: 0.68, expression: 0.76, predicted_yield: 0.66 },
  },
];

/*
 * Variants on E. coli FabH (P0A6R0, 317 aa). Catalytic triad C112/H244/N274;
 * substrate-channel and chain-length specificity governed by M207, F87, F157,
 * V212. The aim is to widen the acyl-CoA pocket toward C8+ substrates so
 * downstream FAS chains land in the C8-C16 jet-range.
 */
const FABH_VARIANTS = [
  {
    name: "FabH_v1",
    mutations: [{ position: 207, from: "M", to: "A", score: 0.41 }],
    predicted: { activity: 0.71, stability: 0.60, expression: 0.62, predicted_yield: 0.65 },
  },
  {
    name: "FabH_v2",
    mutations: [{ position: 87, from: "F", to: "Y", score: 0.29 }],
    predicted: { activity: 0.66, stability: 0.65, expression: 0.60, predicted_yield: 0.63 },
  },
  {
    name: "FabH_v3",
    mutations: [
      { position: 157, from: "F", to: "A", score: 0.22 },
      { position: 212, from: "V", to: "T", score: 0.18 },
    ],
    predicted: { activity: 0.62, stability: 0.58, expression: 0.58, predicted_yield: 0.59 },
  },
];

/*
 * Variants on Candida boidinii FDH (O13437, 364 aa) for the CO2 → methanol
 * project. Engineering toward reductive-direction turnover.
 */
const FDH_VARIANTS = [
  {
    name: "FDH_v1",
    mutations: [{ position: 285, from: "F", to: "A", score: 0.38 }],
    predicted: { activity: 0.75, stability: 0.65, expression: 0.70, predicted_yield: 0.72 },
  },
  {
    name: "FDH_v2",
    mutations: [{ position: 332, from: "T", to: "Y", score: 0.24 }],
    predicted: { activity: 0.55, stability: 0.60, expression: 0.68, predicted_yield: 0.60 },
  },
  {
    name: "FDH_v3",
    mutations: [
      { position: 195, from: "N", to: "Q", score: 0.19 },
      { position: 196, from: "A", to: "S", score: 0.15 },
    ],
    predicted: { activity: 0.50, stability: 0.55, expression: 0.62, predicted_yield: 0.55 },
  },
];

// ─── DB candidate predictions (intentional spread for a live-looking demo) ─

const DB_PREDICTIONS_P1 = {
  P00330: { activity: 0.82, stability: 0.74, expression: 0.78, predicted_yield: 0.78 },
  P0A9Q7: { activity: 0.68, stability: 0.65, expression: 0.55, predicted_yield: 0.62 },
  P06169: { activity: 0.55, stability: 0.72, expression: 0.70, predicted_yield: 0.65 },
  P0A6L0: { activity: 0.45, stability: 0.68, expression: 0.72, predicted_yield: 0.60 },
  Q00955: { activity: 0.55, stability: 0.50, expression: 0.40, predicted_yield: 0.48 },
  P0A6R0: { activity: 0.70, stability: 0.66, expression: 0.62, predicted_yield: 0.65 },
  P0A6Q3: { activity: 0.58, stability: 0.70, expression: 0.65, predicted_yield: 0.63 },
  Q54765: { activity: 0.62, stability: 0.58, expression: 0.55, predicted_yield: 0.58 },
  Q54764: { activity: 0.42, stability: 0.55, expression: 0.50, predicted_yield: 0.48 }, // bottleneck
};

const DB_PREDICTIONS_P2 = {
  O13437: { activity: 0.65, stability: 0.70, expression: 0.72, predicted_yield: 0.68 },
  P31005: { activity: 0.72, stability: 0.62, expression: 0.68, predicted_yield: 0.68 },
  P00918: { activity: 0.95, stability: 0.80, expression: 0.75, predicted_yield: 0.84 },
  P00879: { activity: 0.35, stability: 0.60, expression: 0.40, predicted_yield: 0.42 },
  P25437: { activity: 0.62, stability: 0.65, expression: 0.70, predicted_yield: 0.66 },
};

// ─── Project definitions ──────────────────────────────────────────────────

const PROJECT_1 = {
  name: "Ethanol → Jet Fuel (C8–C16)",
  substrate: "ethanol",
  product: "C8–C16 alkanes",
  target_reaction:
    "Ethanol → C8–C16 hydrocarbons via fatty-acid biosynthesis & aldehyde decarbonylation",
  conditions: { temperature_celsius: 30, ph: 7.0, solvent: "aqueous buffer" },
  db_accessions: ["P00330", "P0A9Q7", "P06169", "P0A6L0", "Q00955", "P0A6R0", "P0A6Q3", "Q54765", "Q54764"],
};

const PROJECT_2 = {
  name: "CO₂ + Green H₂ → Methanol",
  substrate: "carbon dioxide",
  product: "methanol",
  target_reaction:
    "CO₂ → formate → formaldehyde → methanol via FDH / FrmA / MDH reductive cascade",
  conditions: { temperature_celsius: 37, ph: 7.5, solvent: "aqueous buffer" },
  db_accessions: ["O13437", "P31005", "P00918", "P00879", "P25437"],
};

// ─── Experiments ──────────────────────────────────────────────────────────

const EXPERIMENTS_P1 = [
  // 1) EXCEEDER: Q142A on NAD-binding loop. Measured exceeds predicted by ~15%.
  {
    targetVariant: "ADH1_v1",
    measured: { activity: 0.84, stability: 0.74, predicted_yield: 0.86 },
    days_ago: 14,
    notes:
      "Exceeded prediction. Q142A on the NAD-binding loop appears to accelerate NADH off-rate beyond what the activity model anticipated — turnover number jumped on C2-C4 aldehyde panel. Worth folding into the activity head for the next retrain.",
  },
  // 2) MATCH: wild-type ADH1, within experimental error.
  {
    targetDb: "P00330",
    measured: { activity: 0.80, stability: 0.73, predicted_yield: 0.76 },
    days_ago: 11,
    notes: "Wild-type ADH1 baseline replicate. Matches prediction within experimental error (±5%).",
  },
  // 3) UNDERPERFORMER 1: V286A in substrate channel — yield drops ~28%.
  {
    targetVariant: "ADH1_v2",
    measured: { activity: 0.51, stability: 0.62, predicted_yield: 0.49 },
    days_ago: 7,
    notes:
      "Underperformed. V286A widens the substrate channel beyond optimum — observed activity collapse on C4+ aldehyde intermediates. Inspect channel geometry before next round.",
  },
  // 4) UNDERPERFORMER 2: V286I — shared mutation position drives hypothesis surface.
  {
    targetVariant: "ADH1_v3",
    measured: { activity: 0.49, stability: 0.66, predicted_yield: 0.48 },
    days_ago: 3,
    notes:
      "Underperformed. V286I confirms the cluster — both substitutions at position 286 reduce specific activity. Skip 286 in next round; consider 282 or 294 instead.",
  },
];

const EXPERIMENTS_P2 = [
  {
    targetVariant: "FDH_v1",
    measured: { activity: 0.78, stability: 0.66, predicted_yield: 0.75 },
    days_ago: 5,
    notes: "F285A on FDH improves CO₂-reductive turnover modestly. Continue characterization in batch reactor.",
  },
];

// ─── Pathway graph (project 1 only) ───────────────────────────────────────

const PATHWAY_GRAPH_P1 = {
  nodes: [
    { id: "n0", cpd_id: "C00469", label: "Ethanol", is_substrate: true },
    { id: "n1", cpd_id: "C00084", label: "Acetaldehyde" },
    { id: "n2", cpd_id: "C00024", label: "Acetyl-CoA" },
    { id: "n3", cpd_id: "C01209", label: "Malonyl-CoA" },
    { id: "n4", cpd_id: "C04688", label: "C16:0 acyl-ACP" },
    { id: "n5", cpd_id: "C00249", label: "Palmitate (C16:0)" },
    { id: "n6", cpd_id: "C00219", label: "Palmitaldehyde" },
    { id: "n7", cpd_id: "C08312", label: "Pentadecane (C15)", is_product: true },
  ],
  edges: [
    { id: "e0", source: "n0", target: "n1", reaction_id: "R00754", ec_number: "1.1.1.1",
      best_candidate_name: "Alcohol dehydrogenase 1 (ADH1)", best_candidate_activity: 0.82, is_bottleneck: false },
    { id: "e1", source: "n1", target: "n2", reaction_id: "R00237", ec_number: "1.2.1.10",
      best_candidate_name: "Bifunctional AdhE", best_candidate_activity: 0.68, is_bottleneck: false },
    { id: "e2", source: "n2", target: "n3", reaction_id: "R00742", ec_number: "6.4.1.2",
      best_candidate_name: "Acetyl-CoA carboxylase (ACC1)", best_candidate_activity: 0.55, is_bottleneck: false },
    { id: "e3", source: "n3", target: "n4", reaction_id: "R01624", ec_number: "2.3.1.180",
      best_candidate_name: "FabH_v1", best_candidate_activity: 0.71, is_bottleneck: false },
    { id: "e4", source: "n4", target: "n5", reaction_id: "R09683", ec_number: "3.1.2.14",
      best_candidate_name: null, best_candidate_activity: 0.55, is_bottleneck: false },
    { id: "e5", source: "n5", target: "n6", reaction_id: "R09494", ec_number: "1.2.1.80",
      best_candidate_name: "Long-chain acyl-ACP reductase (AAR)", best_candidate_activity: 0.62, is_bottleneck: false },
    // BOTTLENECK — ADO is the rate-limiting step in cyanobacterial alkane biosynthesis
    { id: "e6", source: "n6", target: "n7", reaction_id: "R10463", ec_number: "4.1.99.5",
      best_candidate_name: "Aldehyde decarbonylase (ADO)", best_candidate_activity: 0.42, is_bottleneck: true },
  ],
  // bottleneck_activity (0.42) × length_penalty max(0.5, 1 - 0.1*(7-1)) = 0.42 * 0.5
  predicted_flux: 0.21,
  bottleneck_edge_id: "e6",
  bottleneck_explanation:
    "Limited by reaction R10463 — best candidate Aldehyde decarbonylase (ADO) has activity 0.420 (kcat ≈ 0.04 s⁻¹).",
};

// ─── Comments (collaboration narrative — single user, two timestamps) ─────

const COMMENTS_P1 = [
  // ~3 hours ago: technical observation
  {
    targetAccession: "P00330",
    hours_ago: 3,
    body:
      "Checking the position-286 cluster more carefully — both underperformers (v2 + v3) bury the substitution in the substrate-channel loop. Looks like a hydrophobicity issue, not just steric. Want to pull the channel geometry from the AlphaFold model before round 3.",
  },
  // ~now: strategic
  {
    targetAccession: "P00330",
    hours_ago: 0,
    body:
      "Should we prioritize the **FabH variants** for the next experimental round? The downstream bottleneck is still ADO, but FabH chain-length specificity is what determines whether we even land in the C8–C16 window. ADH1 is already > 0.78 predicted — diminishing returns there.",
  },
];

// ─── Supabase client (service role; bypasses RLS) ─────────────────────────

const env = await loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ─── Entry point ──────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("[seed] failed:", err.message ?? err);
  process.exit(1);
});

async function main() {
  console.log("[seed] connecting to Supabase…");
  await ensureDemoUser();
  const profile = await getDemoProfile();
  if (!profile) {
    throw new Error("Demo profile not created — the signup trigger may have failed. Check Supabase logs.");
  }
  const workspace = await getOrCreateDemoWorkspace(profile);
  console.log(`[seed] demo workspace: ${workspace.name} (${workspace.id})`);

  if (RESET_ONLY) {
    await wipeDemo(workspace);
    console.log("[seed] reset complete. Use `pnpm seed` to reseed.");
    return;
  }
  if (FORCE) {
    await wipeDemo(workspace);
  } else {
    const existing = await countProjects(workspace);
    if (existing > 0) {
      console.log(
        `[seed] demo workspace already has ${existing} project(s). ` +
          "Skipping. Use `pnpm seed --force` to reset and reseed, or `pnpm seed:reset` to wipe only.",
      );
      return;
    }
  }

  console.log("\n[seed] === Project 1: Ethanol → Jet Fuel ===");
  await seedProject1(profile, workspace);
  console.log("\n[seed] === Project 2: CO₂ → Methanol ===");
  await seedProject2(profile, workspace);
  console.log(`\n[seed] done. Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

// ─── Auth / workspace helpers ─────────────────────────────────────────────

async function ensureDemoUser() {
  // listUsers returns one page (max 50 per page by default); demo user is the
  // only user that matters here, so pagination doesn't.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list?.users?.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    console.log(`[seed] demo user ${DEMO_EMAIL} already exists (${existing.id})`);
    return;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEMO_NAME },
  });
  if (error) throw error;
  console.log(`[seed] created demo user: ${data.user.id}`);
  // Give the auth signup trigger a moment to populate profile + workspace
  await sleep(800);
}

async function getDemoProfile() {
  const { data } = await supabase.from("profiles").select("*").eq("email", DEMO_EMAIL).maybeSingle();
  return data;
}

async function getOrCreateDemoWorkspace(profile) {
  const { data: existing } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;
  // Defensive fallback if the signup trigger didn't fire.
  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({ name: `${profile.full_name ?? "Demo"}'s workspace`, owner_id: profile.id })
    .select("*")
    .single();
  if (error) throw error;
  await supabase
    .from("workspace_members")
    .insert({ workspace_id: created.id, user_id: profile.id, role: "owner" });
  return created;
}

async function countProjects(workspace) {
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);
  return count ?? 0;
}

async function wipeDemo(workspace) {
  console.log(`[seed] wiping demo workspace ${workspace.id}…`);
  // Project delete cascades through candidates, predictions, experiments,
  // pathway_designs, and candidate-scoped comments via FK ON DELETE CASCADE.
  const { error: pErr } = await supabase.from("projects").delete().eq("workspace_id", workspace.id);
  if (pErr) throw pErr;
  // audit_log rows scoped to this workspace
  await supabase.from("audit_log").delete().eq("workspace_id", workspace.id);
  // model_calibration is global; wipe so retrain demo starts at v1.0.0.
  await supabase.from("model_calibration").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("[seed] wipe complete.");
}

// ─── Per-project seeders ──────────────────────────────────────────────────

async function seedProject1(profile, workspace) {
  // 1) Project row
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      name: PROJECT_1.name,
      substrate: PROJECT_1.substrate,
      product: PROJECT_1.product,
      target_reaction: PROJECT_1.target_reaction,
      conditions: PROJECT_1.conditions,
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (pErr) throw pErr;
  console.log(`  project ${project.id}`);

  // 2) DB candidates with fetched (or bundled) sequences
  const dbCandidatesInsert = [];
  for (const acc of PROJECT_1.db_accessions) {
    const { seq, source } = await fetchOrBundled(acc);
    const meta = ENZYME_META[acc];
    dbCandidatesInsert.push({
      project_id: project.id,
      source: "db",
      source_id: acc,
      name: meta.name,
      sequence: seq,
      ec_number: meta.ec,
      organism: meta.organism,
      pdb_id: meta.pdb,
      metadata: {
        retrieval_source: "uniprot",
        sequence_source: source,
        function: meta.function_short,
        length: seq.length,
      },
    });
  }
  const { data: dbInserted, error: cErr } = await supabase
    .from("enzyme_candidates")
    .insert(dbCandidatesInsert)
    .select("*");
  if (cErr) throw cErr;
  console.log(`  inserted ${dbInserted.length} DB candidates`);

  // 3) Generated variants
  const byAcc = new Map(dbInserted.map((r) => [r.source_id, r]));
  const variantsToInsert = [];
  const variantOrder = []; // preserves name → spec order to match predictions later

  function pushVariants(parentAccession, specs) {
    const parent = byAcc.get(parentAccession);
    for (const v of specs) {
      const mutatedSeq = applyMutations(parent.sequence, v.mutations);
      variantsToInsert.push({
        project_id: project.id,
        source: "generated",
        source_id: null,
        name: v.name,
        sequence: mutatedSeq,
        parent_sequence: parent.sequence,
        parent_id: parent.id,
        mutations: v.mutations,
        ec_number: parent.ec_number,
        organism: parent.organism,
        pdb_id: parent.pdb_id,
        metadata: {
          generation_model: "facebook/esm2_t6_8M_UR50D",
          generation_method: "demo_seed_curated",
          proposal_score: v.mutations.reduce((acc, m) => acc + (m.score ?? 0), 0),
          length: mutatedSeq.length,
        },
      });
      variantOrder.push(v.name);
    }
  }
  pushVariants("P00330", ADH1_VARIANTS);
  pushVariants("P0A6R0", FABH_VARIANTS);

  const { data: variantInserted, error: vErr } = await supabase
    .from("enzyme_candidates")
    .insert(variantsToInsert)
    .select("*");
  if (vErr) throw vErr;
  console.log(`  inserted ${variantInserted.length} variants`);

  const byName = new Map(variantInserted.map((r) => [r.name, r]));

  // 4) Predictions on every candidate (DB + variants)
  const predictionRows = [];
  for (const c of dbInserted) {
    const p = DB_PREDICTIONS_P1[c.source_id];
    if (!p) continue;
    predictionRows.push(predictionRow(c.id, p));
  }
  for (const v of [...ADH1_VARIANTS, ...FABH_VARIANTS]) {
    const row = byName.get(v.name);
    if (!row) continue;
    predictionRows.push(predictionRow(row.id, v.predicted));
  }
  const { data: predsInserted, error: prErr } = await supabase
    .from("predictions")
    .insert(predictionRows)
    .select("*");
  if (prErr) throw prErr;
  console.log(`  inserted ${predsInserted.length} predictions`);

  const predByCandidate = new Map(predsInserted.map((p) => [p.candidate_id, p]));

  // 5) Pathway design
  const { error: pwErr } = await supabase.from("pathway_designs").insert({
    project_id: project.id,
    name: `${PROJECT_1.substrate} → ${PROJECT_1.product}`,
    graph: PATHWAY_GRAPH_P1,
    predicted_flux: PATHWAY_GRAPH_P1.predicted_flux,
    bottlenecks: [
      {
        edge_id: PATHWAY_GRAPH_P1.bottleneck_edge_id,
        explanation: PATHWAY_GRAPH_P1.bottleneck_explanation,
      },
    ],
  });
  if (pwErr) throw pwErr;
  console.log("  inserted pathway design");

  // 6) Experiments (bind to the prediction the measurement was taken against)
  const expRows = [];
  for (const e of EXPERIMENTS_P1) {
    const cand = e.targetVariant ? byName.get(e.targetVariant) : byAcc.get(e.targetDb);
    if (!cand) {
      console.warn(`  experiment target not found: ${e.targetVariant ?? e.targetDb}`);
      continue;
    }
    const pred = predByCandidate.get(cand.id);
    expRows.push({
      candidate_id: cand.id,
      performed_by: profile.id,
      performed_at: hoursAgoIso(e.days_ago * 24),
      measured_activity: e.measured.activity,
      measured_stability: e.measured.stability,
      measured_yield: e.measured.predicted_yield,
      notes: e.notes,
      prediction_id: pred?.id ?? null,
    });
  }
  const { error: expErr } = await supabase.from("experiments").insert(expRows);
  if (expErr) throw expErr;
  console.log(`  inserted ${expRows.length} experiments`);

  // 7) Comments — both on the top-ranked DB candidate (ADH1)
  const topCandidate = byAcc.get("P00330");
  const commentRows = COMMENTS_P1.map((c) => ({
    entity_type: "candidate",
    entity_id: topCandidate.id,
    user_id: profile.id,
    body: c.body,
    created_at: hoursAgoIso(c.hours_ago),
  }));
  const { error: comErr } = await supabase.from("comments").insert(commentRows);
  if (comErr) throw comErr;
  console.log(`  inserted ${commentRows.length} comments on top candidate (${topCandidate.name})`);

  // 8) Audit row
  await supabase.from("audit_log").insert({
    user_id: profile.id,
    workspace_id: workspace.id,
    action: "project.created",
    entity_type: "project",
    entity_id: project.id,
    payload: { name: PROJECT_1.name, seeded: true },
  });
}

async function seedProject2(profile, workspace) {
  // Same shape as project 1 but lighter — no pathway, fewer variants, 1 experiment
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      name: PROJECT_2.name,
      substrate: PROJECT_2.substrate,
      product: PROJECT_2.product,
      target_reaction: PROJECT_2.target_reaction,
      conditions: PROJECT_2.conditions,
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (pErr) throw pErr;
  console.log(`  project ${project.id}`);

  const dbCandidatesInsert = [];
  for (const acc of PROJECT_2.db_accessions) {
    const { seq, source } = await fetchOrBundled(acc);
    const meta = ENZYME_META[acc];
    dbCandidatesInsert.push({
      project_id: project.id,
      source: "db",
      source_id: acc,
      name: meta.name,
      sequence: seq,
      ec_number: meta.ec,
      organism: meta.organism,
      pdb_id: meta.pdb,
      metadata: {
        retrieval_source: "uniprot",
        sequence_source: source,
        function: meta.function_short,
        length: seq.length,
      },
    });
  }
  const { data: dbInserted, error: cErr } = await supabase
    .from("enzyme_candidates")
    .insert(dbCandidatesInsert)
    .select("*");
  if (cErr) throw cErr;
  console.log(`  inserted ${dbInserted.length} DB candidates`);

  const byAcc = new Map(dbInserted.map((r) => [r.source_id, r]));
  const fdh = byAcc.get("O13437");
  const variantsToInsert = FDH_VARIANTS.map((v) => ({
    project_id: project.id,
    source: "generated",
    source_id: null,
    name: v.name,
    sequence: applyMutations(fdh.sequence, v.mutations),
    parent_sequence: fdh.sequence,
    parent_id: fdh.id,
    mutations: v.mutations,
    ec_number: fdh.ec_number,
    organism: fdh.organism,
    pdb_id: fdh.pdb_id,
    metadata: {
      generation_model: "facebook/esm2_t6_8M_UR50D",
      generation_method: "demo_seed_curated",
      proposal_score: v.mutations.reduce((acc, m) => acc + (m.score ?? 0), 0),
      length: applyMutations(fdh.sequence, v.mutations).length,
    },
  }));
  const { data: variantInserted, error: vErr } = await supabase
    .from("enzyme_candidates")
    .insert(variantsToInsert)
    .select("*");
  if (vErr) throw vErr;
  console.log(`  inserted ${variantInserted.length} variants`);

  const byName = new Map(variantInserted.map((r) => [r.name, r]));

  const predictionRows = [];
  for (const c of dbInserted) {
    const p = DB_PREDICTIONS_P2[c.source_id];
    if (!p) continue;
    predictionRows.push(predictionRow(c.id, p));
  }
  for (const v of FDH_VARIANTS) {
    const row = byName.get(v.name);
    if (!row) continue;
    predictionRows.push(predictionRow(row.id, v.predicted));
  }
  const { data: predsInserted, error: prErr } = await supabase
    .from("predictions")
    .insert(predictionRows)
    .select("*");
  if (prErr) throw prErr;
  console.log(`  inserted ${predsInserted.length} predictions`);

  const predByCandidate = new Map(predsInserted.map((p) => [p.candidate_id, p]));

  const expRows = [];
  for (const e of EXPERIMENTS_P2) {
    const cand = byName.get(e.targetVariant);
    if (!cand) continue;
    const pred = predByCandidate.get(cand.id);
    expRows.push({
      candidate_id: cand.id,
      performed_by: profile.id,
      performed_at: hoursAgoIso(e.days_ago * 24),
      measured_activity: e.measured.activity,
      measured_stability: e.measured.stability,
      measured_yield: e.measured.predicted_yield,
      notes: e.notes,
      prediction_id: pred?.id ?? null,
    });
  }
  const { error: expErr } = await supabase.from("experiments").insert(expRows);
  if (expErr) throw expErr;
  console.log(`  inserted ${expRows.length} experiments`);

  await supabase.from("audit_log").insert({
    user_id: profile.id,
    workspace_id: workspace.id,
    action: "project.created",
    entity_type: "project",
    entity_id: project.id,
    payload: { name: PROJECT_2.name, seeded: true },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function predictionRow(candidateId, p) {
  return {
    candidate_id: candidateId,
    model_version: "1.0.0",
    activity_score: round4(p.activity),
    stability_score: round4(p.stability),
    expression_score: round4(p.expression),
    predicted_yield: round4(p.predicted_yield),
    confidence_lower: round4(p.predicted_yield * 0.85),
    confidence_upper: round4(Math.min(1, p.predicted_yield * 1.15)),
    features: { seed: true, source: "demo_curated" },
  };
}

function applyMutations(seq, muts) {
  const arr = seq.split("");
  for (const m of muts) {
    const idx = m.position - 1;
    if (idx >= 0 && idx < arr.length) arr[idx] = m.to;
  }
  return arr.join("");
}

function round4(x) {
  return Math.round(x * 10_000) / 10_000;
}

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOrBundled(accession) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://rest.uniprot.org/uniprotkb/${accession}.fasta`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    const seq = text.split("\n").filter((l) => !l.startsWith(">")).join("").trim();
    if (!seq) throw new Error("empty body");
    return { seq, source: "live" };
  } catch (e) {
    const bundled = BUNDLED_SEQUENCES[accession];
    if (!bundled) throw new Error(`No bundled fallback for ${accession}: ${e.message}`);
    return { seq: bundled, source: "bundled" };
  }
}

async function loadEnv() {
  const out = { ...process.env };
  try {
    const text = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (!out[k]) out[k] = v;
    }
  } catch {
    // .env.local missing — fall back to whatever's in process.env
  }
  if (!out.NEXT_PUBLIC_SUPABASE_URL || !out.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Configure .env.local (or export the vars) before running this script.",
    );
  }
  return out;
}
