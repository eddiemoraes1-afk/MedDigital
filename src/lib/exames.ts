/**
 * Base de exames médicos para autocomplete e agrupamento por categoria no PDF.
 * A categoria define qual página o exame vai no documento impresso:
 * exames da mesma categoria ficam juntos numa página, categorias diferentes = páginas separadas.
 */

export interface Exame {
  nome: string          // nome oficial do exame
  categoria: string     // chave da categoria (define agrupamento no PDF)
  sinonimos?: string[]  // nomes alternativos para busca
  preparo?: string      // orientação de preparo para o paciente
}

/** Categorias e seus rótulos de exibição */
export const CATEGORIAS: Record<string, string> = {
  sangue_hemato:    'Hematologia',
  sangue_bioquim:   'Bioquímica / Metabolismo',
  sangue_renal:     'Função Renal',
  sangue_hepatico:  'Função Hepática',
  sangue_lipidios:  'Perfil Lipídico',
  sangue_glicemia:  'Glicemia / Diabetes',
  sangue_hormonio:  'Hormônios / Endocrinologia',
  sangue_tireoide:  'Tireoide',
  sangue_infeccao:  'Infectologia / Sorologia',
  sangue_auto:      'Autoimunidade / Reumatologia',
  sangue_coag:      'Coagulação',
  urina:            'Urina',
  fezes:            'Fezes',
  raio_x:           'Radiografia (Raio-X)',
  ultrassom:        'Ultrassonografia',
  tomografia:       'Tomografia Computadorizada (TC)',
  ressonancia:      'Ressonância Magnética (RM)',
  mamografia:       'Mamografia / Densitometria',
  cardiologia:      'Cardiologia',
  neurologia:       'Neurologia / Eletrofisiologia',
  oftalmologia:     'Oftalmologia',
  pneumologia:      'Pneumologia / Função Pulmonar',
  endoscopia:       'Endoscopia / Colonoscopia',
  outros:           'Outros',
}

export const EXAMES: Exame[] = [

  // ── HEMATOLOGIA ─────────────────────────────────────────────────────────────
  { nome: 'Hemograma completo', categoria: 'sangue_hemato', sinonimos: ['hemograma', 'CBC', 'contagem células sanguíneas'] },
  { nome: 'Contagem de Reticulócitos', categoria: 'sangue_hemato', sinonimos: ['reticulócitos'] },
  { nome: 'Velocidade de Hemossedimentação (VHS)', categoria: 'sangue_hemato', sinonimos: ['VHS', 'hemossedimentação'] },
  { nome: 'Proteína C Reativa (PCR)', categoria: 'sangue_hemato', sinonimos: ['PCR', 'proteína C reativa', 'inflamação'] },
  { nome: 'PCR ultra-sensível (PCR-US)', categoria: 'sangue_hemato', sinonimos: ['PCR ultrassensível', 'PCR-us'] },
  { nome: 'Ferritina', categoria: 'sangue_hemato', sinonimos: ['ferritina', 'ferro armazenado'] },
  { nome: 'Ferro sérico e TIBC', categoria: 'sangue_hemato', sinonimos: ['ferro sérico', 'capacidade de ligação do ferro', 'TIBC'] },
  { nome: 'Vitamina B12', categoria: 'sangue_hemato', sinonimos: ['B12', 'cobalamina', 'vitamina B12'] },
  { nome: 'Ácido Fólico (Folato)', categoria: 'sangue_hemato', sinonimos: ['ácido fólico', 'folato', 'vitamina B9'] },
  { nome: 'Dosagem de Vitamina D (25-OH)', categoria: 'sangue_hemato', sinonimos: ['vitamina D', '25-OH vitamina D', 'colecalciferol'], preparo: 'Não é necessário jejum.' },
  { nome: 'Magnésio sérico', categoria: 'sangue_hemato', sinonimos: ['magnésio', 'Mg sérico'] },
  { nome: 'Zinco sérico', categoria: 'sangue_hemato', sinonimos: ['zinco'] },
  { nome: 'Cálcio total e ionizado', categoria: 'sangue_hemato', sinonimos: ['cálcio sérico', 'cálcio ionizado'] },
  { nome: 'Fósforo sérico', categoria: 'sangue_hemato', sinonimos: ['fósforo'] },
  { nome: 'Potássio sérico', categoria: 'sangue_hemato', sinonimos: ['potássio', 'K sérico'] },
  { nome: 'Sódio sérico', categoria: 'sangue_hemato', sinonimos: ['sódio', 'Na sérico'] },

  // ── BIOQUÍMICA / METABOLISMO ─────────────────────────────────────────────────
  { nome: 'Ácido úrico', categoria: 'sangue_bioquim', sinonimos: ['ácido úrico', 'uricemia', 'gota'], preparo: 'Jejum de 4 horas.' },
  { nome: 'Proteínas totais e frações', categoria: 'sangue_bioquim', sinonimos: ['proteínas totais', 'albumina', 'globulina'] },
  { nome: 'Albumina sérica', categoria: 'sangue_bioquim', sinonimos: ['albumina'] },
  { nome: 'Proteína total', categoria: 'sangue_bioquim', sinonimos: ['proteína total'] },
  { nome: 'Homocisteína', categoria: 'sangue_bioquim', sinonimos: ['homocisteína', 'risco cardiovascular'] },
  { nome: 'Lactato desidrogenase (LDH)', categoria: 'sangue_bioquim', sinonimos: ['LDH', 'desidrogenase lática'] },
  { nome: 'Creatina quinase (CK total)', categoria: 'sangue_bioquim', sinonimos: ['CK total', 'CPK', 'creatina fosfocinase'] },
  { nome: 'Frações de CK (CK-MB)', categoria: 'sangue_bioquim', sinonimos: ['CK-MB', 'infarto'] },
  { nome: 'Troponina I ou T', categoria: 'sangue_bioquim', sinonimos: ['troponina', 'troponina I', 'troponina T', 'infarto'] },
  { nome: 'BNP / NT-proBNP (insuficiência cardíaca)', categoria: 'sangue_bioquim', sinonimos: ['BNP', 'NT-proBNP', 'insuficiência cardíaca'] },

  // ── FUNÇÃO RENAL ─────────────────────────────────────────────────────────────
  { nome: 'Creatinina sérica', categoria: 'sangue_renal', sinonimos: ['creatinina', 'função renal'], preparo: 'Jejum de 4 horas.' },
  { nome: 'Ureia sérica', categoria: 'sangue_renal', sinonimos: ['ureia', 'BUN'] },
  { nome: 'Taxa de Filtração Glomerular (TFG/eGFR)', categoria: 'sangue_renal', sinonimos: ['TFG', 'eGFR', 'filtração glomerular'] },
  { nome: 'Cistatina C', categoria: 'sangue_renal', sinonimos: ['cistatina C', 'função renal'] },
  { nome: 'Microalbuminúria (urina 24h ou spot)', categoria: 'sangue_renal', sinonimos: ['microalbuminúria', 'proteinúria', 'albumina urina'] },
  { nome: 'Relação albumina/creatinina urinária', categoria: 'sangue_renal', sinonimos: ['albumina/creatinina', 'RAC'] },
  { nome: 'Ácido úrico urinário (urina 24h)', categoria: 'sangue_renal', sinonimos: ['ácido úrico urina'] },

  // ── FUNÇÃO HEPÁTICA ──────────────────────────────────────────────────────────
  { nome: 'TGO / AST (Aspartato aminotransferase)', categoria: 'sangue_hepatico', sinonimos: ['TGO', 'AST', 'transaminase oxalacética'] },
  { nome: 'TGP / ALT (Alanina aminotransferase)', categoria: 'sangue_hepatico', sinonimos: ['TGP', 'ALT', 'transaminase pirúvica'] },
  { nome: 'Gama-GT (GGT)', categoria: 'sangue_hepatico', sinonimos: ['gama GT', 'GGT', 'gama-glutamiltransferase'] },
  { nome: 'Fosfatase alcalina (FA)', categoria: 'sangue_hepatico', sinonimos: ['fosfatase alcalina', 'FA'] },
  { nome: 'Bilirrubinas Total e Frações', categoria: 'sangue_hepatico', sinonimos: ['bilirrubina total', 'bilirrubina direta', 'bilirrubina indireta'] },
  { nome: 'Tempo de Protrombina (TP/INR)', categoria: 'sangue_hepatico', sinonimos: ['TP', 'INR', 'tempo de protrombina', 'coagulograma'] },
  { nome: 'Amilase sérica', categoria: 'sangue_hepatico', sinonimos: ['amilase', 'pâncreas'] },
  { nome: 'Lipase sérica', categoria: 'sangue_hepatico', sinonimos: ['lipase', 'pâncreas', 'pancreatite'] },

  // ── PERFIL LIPÍDICO ──────────────────────────────────────────────────────────
  { nome: 'Colesterol total e frações (LDL, HDL, VLDL)', categoria: 'sangue_lipidios', sinonimos: ['colesterol', 'LDL', 'HDL', 'lipidograma', 'perfil lipídico'], preparo: 'Jejum de 12 horas.' },
  { nome: 'Triglicerídeos', categoria: 'sangue_lipidios', sinonimos: ['triglicerídeos', 'triglicérides'], preparo: 'Jejum de 12 horas.' },
  { nome: 'Apolipoproteína A1 e B', categoria: 'sangue_lipidios', sinonimos: ['apolipoproteína', 'Apo A1', 'Apo B'] },
  { nome: 'Lipoproteína(a) — Lp(a)', categoria: 'sangue_lipidios', sinonimos: ['Lp(a)', 'lipoproteína a', 'risco cardiovascular'] },

  // ── GLICEMIA / DIABETES ──────────────────────────────────────────────────────
  { nome: 'Glicemia de jejum', categoria: 'sangue_glicemia', sinonimos: ['glicemia', 'glicose jejum', 'diabetes'], preparo: 'Jejum de 8 horas.' },
  { nome: 'Glicemia pós-prandial (2h após refeição)', categoria: 'sangue_glicemia', sinonimos: ['glicemia pós-prandial', 'glicose pós-prandial'], preparo: 'Realizar 2 horas após refeição.' },
  { nome: 'Hemoglobina Glicada (HbA1c)', categoria: 'sangue_glicemia', sinonimos: ['HbA1c', 'hemoglobina glicada', 'A1c', 'diabetes'], preparo: 'Não é necessário jejum.' },
  { nome: 'Teste de Tolerância à Glicose (TOTG 75g)', categoria: 'sangue_glicemia', sinonimos: ['TOTG', 'teste de tolerância', 'curva glicêmica'], preparo: 'Jejum de 8 horas. Trazer lanche para após o exame.' },
  { nome: 'Insulina de jejum', categoria: 'sangue_glicemia', sinonimos: ['insulina', 'resistência insulínica'], preparo: 'Jejum de 8 horas.' },
  { nome: 'Peptídeo C', categoria: 'sangue_glicemia', sinonimos: ['peptídeo C', 'função pancreática'] },
  { nome: 'HOMA-IR (cálculo)', categoria: 'sangue_glicemia', sinonimos: ['HOMA', 'resistência à insulina'] },

  // ── HORMÔNIOS / ENDOCRINOLOGIA ────────────────────────────────────────────────
  { nome: 'TSH (hormônio estimulante da tireoide)', categoria: 'sangue_tireoide', sinonimos: ['TSH', 'tireotrofina', 'tireoide'] },
  { nome: 'T4 Livre (tiroxina livre)', categoria: 'sangue_tireoide', sinonimos: ['T4 livre', 'tiroxina', 'tireoide'] },
  { nome: 'T3 Total e Livre', categoria: 'sangue_tireoide', sinonimos: ['T3', 'triiodotironina', 'tireoide'] },
  { nome: 'Anticorpo Anti-TPO (anti-tireoperoxidase)', categoria: 'sangue_tireoide', sinonimos: ['anti-TPO', 'anticorpo tireoide', 'tireoidite de Hashimoto'] },
  { nome: 'Anticorpo Anti-Tireoglobulina', categoria: 'sangue_tireoide', sinonimos: ['anti-TG', 'anticorpo tireoglobulina'] },
  { nome: 'Tireoglobulina sérica', categoria: 'sangue_tireoide', sinonimos: ['tireoglobulina', 'TG'] },
  { nome: 'TSH receptor (TRAb)', categoria: 'sangue_tireoide', sinonimos: ['TRAb', 'Basedow-Graves', 'hipotireoidismo'] },
  { nome: 'Cortisol basal (manhã)', categoria: 'sangue_hormonio', sinonimos: ['cortisol', 'cortisol matinal', 'suprarrenal'] },
  { nome: 'ACTH (hormônio adrenocorticotrófico)', categoria: 'sangue_hormonio', sinonimos: ['ACTH', 'adrenocorticotrófico'] },
  { nome: 'FSH e LH', categoria: 'sangue_hormonio', sinonimos: ['FSH', 'LH', 'hormônio folículo estimulante', 'menopausa', 'fertilidade'] },
  { nome: 'Estradiol (E2)', categoria: 'sangue_hormonio', sinonimos: ['estradiol', 'estrogênio', 'menopausa'] },
  { nome: 'Progesterona', categoria: 'sangue_hormonio', sinonimos: ['progesterona'] },
  { nome: 'Testosterona total e livre', categoria: 'sangue_hormonio', sinonimos: ['testosterona', 'testosterona total', 'testosterona livre'] },
  { nome: 'DHEA-S (deidroepiandrosterona sulfato)', categoria: 'sangue_hormonio', sinonimos: ['DHEA-S', 'deidroepiandrosterona'] },
  { nome: 'Prolactina', categoria: 'sangue_hormonio', sinonimos: ['prolactina', 'hipófise'] },
  { nome: 'GH (hormônio do crescimento)', categoria: 'sangue_hormonio', sinonimos: ['GH', 'hormônio crescimento', 'IGF-1'] },
  { nome: 'IGF-1 (somatomedina C)', categoria: 'sangue_hormonio', sinonimos: ['IGF-1', 'somatomedina', 'acromegalia'] },
  { nome: 'PTH — Paratormônio', categoria: 'sangue_hormonio', sinonimos: ['PTH', 'paratormônio', 'paratireoide', 'cálcio'] },
  { nome: 'PSA Total e Livre (próstata)', categoria: 'sangue_hormonio', sinonimos: ['PSA', 'PSA total', 'PSA livre', 'próstata', 'câncer próstata'] },
  { nome: 'CA 125 (marcador ovariano)', categoria: 'sangue_hormonio', sinonimos: ['CA 125', 'marcador ovariano', 'ovário'] },
  { nome: 'CA 19-9 (marcador pancreático)', categoria: 'sangue_hormonio', sinonimos: ['CA 19-9', 'marcador pancreático'] },
  { nome: 'CEA (antígeno carcinoembrionário)', categoria: 'sangue_hormonio', sinonimos: ['CEA', 'marcador tumoral', 'cólon'] },
  { nome: 'Alfa-fetoproteína (AFP)', categoria: 'sangue_hormonio', sinonimos: ['AFP', 'alfa-fetoproteína', 'fígado', 'gestação'] },
  { nome: 'Beta-HCG quantitativo', categoria: 'sangue_hormonio', sinonimos: ['HCG', 'beta-HCG', 'gravidez', 'gestação'] },

  // ── INFECTOLOGIA / SOROLOGIA ─────────────────────────────────────────────────
  { nome: 'HIV (Anti-HIV 1 e 2)', categoria: 'sangue_infeccao', sinonimos: ['HIV', 'AIDS', 'anti-HIV'] },
  { nome: 'VDRL / RPR (Sífilis)', categoria: 'sangue_infeccao', sinonimos: ['VDRL', 'RPR', 'sífilis', 'treponema'] },
  { nome: 'FTA-ABS (confirmação sífilis)', categoria: 'sangue_infeccao', sinonimos: ['FTA-ABS', 'sífilis'] },
  { nome: 'Hepatite B (HBsAg, Anti-HBs, Anti-HBc)', categoria: 'sangue_infeccao', sinonimos: ['hepatite B', 'HBsAg', 'anti-HBs', 'anti-HBc'] },
  { nome: 'Hepatite C (Anti-HCV)', categoria: 'sangue_infeccao', sinonimos: ['hepatite C', 'anti-HCV', 'HCV'] },
  { nome: 'Toxoplasmose IgG e IgM', categoria: 'sangue_infeccao', sinonimos: ['toxoplasmose', 'IgG toxoplasma', 'IgM toxoplasma', 'gestante'] },
  { nome: 'Citomegalovírus CMV (IgG e IgM)', categoria: 'sangue_infeccao', sinonimos: ['CMV', 'citomegalovírus', 'gestante'] },
  { nome: 'Rubéola (IgG e IgM)', categoria: 'sangue_infeccao', sinonimos: ['rubéola', 'gestante'] },
  { nome: 'Herpes simples (IgG e IgM)', categoria: 'sangue_infeccao', sinonimos: ['herpes', 'HSV'] },
  { nome: 'Epstein-Barr (Mononucleose — IgG e IgM)', categoria: 'sangue_infeccao', sinonimos: ['EBV', 'Epstein-Barr', 'mononucleose'] },
  { nome: 'Dengue (NS1 / IgM / IgG)', categoria: 'sangue_infeccao', sinonimos: ['dengue', 'NS1 dengue'] },
  { nome: 'COVID-19 (anticorpos IgG/IgM)', categoria: 'sangue_infeccao', sinonimos: ['COVID', 'coronavírus', 'SARS-CoV-2'] },
  { nome: 'Chagas (doença de Chagas)', categoria: 'sangue_infeccao', sinonimos: ['Chagas', 'tripanosomíase', 'doença de Chagas'] },
  { nome: 'Leptospirose (IgM)', categoria: 'sangue_infeccao', sinonimos: ['leptospirose'] },
  { nome: 'HTLV I e II', categoria: 'sangue_infeccao', sinonimos: ['HTLV', 'retrovírus'] },

  // ── AUTOIMUNIDADE / REUMATOLOGIA ─────────────────────────────────────────────
  { nome: 'FAN (fator antinuclear)', categoria: 'sangue_auto', sinonimos: ['FAN', 'fator antinuclear', 'lúpus', 'autoimune', 'ANA'] },
  { nome: 'Fator Reumatoide (FR)', categoria: 'sangue_auto', sinonimos: ['fator reumatoide', 'artrite reumatoide'] },
  { nome: 'Anti-CCP (anticorpo anti-peptídeo citrulinado)', categoria: 'sangue_auto', sinonimos: ['anti-CCP', 'artrite reumatoide', 'citrulinado'] },
  { nome: 'Complemento C3 e C4', categoria: 'sangue_auto', sinonimos: ['complemento', 'C3', 'C4', 'lúpus'] },
  { nome: 'Anti-DNA nativo (anti-dsDNA)', categoria: 'sangue_auto', sinonimos: ['anti-DNA', 'lúpus'] },
  { nome: 'ANCA (anticorpo anticitoplasma de neutrófilo)', categoria: 'sangue_auto', sinonimos: ['ANCA', 'vasculite'] },

  // ── COAGULAÇÃO ───────────────────────────────────────────────────────────────
  { nome: 'Coagulograma completo (TP, TTPA, INR)', categoria: 'sangue_coag', sinonimos: ['coagulograma', 'TP', 'TTPA', 'INR', 'coagulação'] },
  { nome: 'D-Dímero', categoria: 'sangue_coag', sinonimos: ['D-dímero', 'trombose', 'TEP', 'TVP'] },
  { nome: 'Fibrinogênio', categoria: 'sangue_coag', sinonimos: ['fibrinogênio', 'coagulação'] },
  { nome: 'Proteína C e Proteína S', categoria: 'sangue_coag', sinonimos: ['proteína C', 'proteína S', 'trombofilia'] },
  { nome: 'Antitrombina III', categoria: 'sangue_coag', sinonimos: ['antitrombina', 'trombofilia'] },
  { nome: 'Fator V de Leiden', categoria: 'sangue_coag', sinonimos: ['fator V', 'Leiden', 'trombofilia'] },
  { nome: 'Anticoagulante lúpico', categoria: 'sangue_coag', sinonimos: ['anticoagulante lúpico', 'síndrome antifosfolípide'] },

  // ── URINA ────────────────────────────────────────────────────────────────────
  { nome: 'Urina Rotina (EAS / Sumário de urina)', categoria: 'urina', sinonimos: ['EAS', 'urina rotina', 'sumário urina', 'urina 1'], preparo: 'Coletar primeira urina da manhã, jato médio.' },
  { nome: 'Urocultura com antibiograma', categoria: 'urina', sinonimos: ['urocultura', 'cultura urina', 'ITU', 'infecção urinária'], preparo: 'Coletar primeira urina da manhã antes de iniciar antibiótico.' },
  { nome: 'Urina 24 horas (proteinúria)', categoria: 'urina', sinonimos: ['urina 24h', 'proteinúria', 'microalbuminúria', 'proteína urina'], preparo: 'Iniciar coleta após descartar a primeira urina da manhã.' },
  { nome: 'Creatinina urinária 24h', categoria: 'urina', sinonimos: ['creatinina urina', 'clearance creatinina'] },
  { nome: 'Clearance de creatinina', categoria: 'urina', sinonimos: ['clearance creatinina', 'depuração renal'] },
  { nome: 'Pesquisa de cristais urinários', categoria: 'urina', sinonimos: ['cristais urina', 'litíase urinária', 'cálculo renal'] },
  { nome: 'Citologia urinária oncótica', categoria: 'urina', sinonimos: ['citologia urinária', 'câncer bexiga'] },
  { nome: 'Beta-HCG urinário (teste de gravidez)', categoria: 'urina', sinonimos: ['HCG urinário', 'gravidez', 'gestação'] },

  // ── FEZES ─────────────────────────────────────────────────────────────────────
  { nome: 'Parasitológico de fezes (PPF)', categoria: 'fezes', sinonimos: ['PPF', 'parasitológico fezes', 'verminose', 'parasitas'], preparo: 'Coletar em 3 dias diferentes (3 amostras). Não contaminar com urina.' },
  { nome: 'Sangue oculto nas fezes', categoria: 'fezes', sinonimos: ['sangue oculto', 'hemorragia digestiva', 'cólon'], preparo: 'Evitar carne vermelha, tomate e rúcula 3 dias antes. Não realizar durante menstruação.' },
  { nome: 'Calprotectina fecal', categoria: 'fezes', sinonimos: ['calprotectina', 'doença inflamatória intestinal', 'Crohn'] },
  { nome: 'Cultura de fezes (coprocultura)', categoria: 'fezes', sinonimos: ['coprocultura', 'cultura fezes', 'salmonela', 'gastroenterite'] },
  { nome: 'Pesquisa de H. pylori (fezes)', categoria: 'fezes', sinonimos: ['H. pylori fezes', 'helicobacter fezes', 'gastrite'] },
  { nome: 'Elastase pancreática fecal', categoria: 'fezes', sinonimos: ['elastase fecal', 'insuficiência pancreática'] },
  { nome: 'Gordura fecal (esteatorreia)', categoria: 'fezes', sinonimos: ['gordura fecal', 'esteatorreia', 'má absorção'] },
  { nome: 'Rotavírus e Adenovírus nas fezes', categoria: 'fezes', sinonimos: ['rotavírus', 'adenovírus', 'diarreia viral'] },
  { nome: 'Pesquisa de Clostridium difficile', categoria: 'fezes', sinonimos: ['C. diff', 'Clostridium difficile', 'colite'] },

  // ── RADIOGRAFIA (RAIO-X) ─────────────────────────────────────────────────────
  { nome: 'Radiografia de Tórax (PA e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X tórax', 'RX tórax', 'raio X pulmão'], preparo: 'Não é necessário preparo.' },
  { nome: 'Radiografia de Coluna Lombar (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X coluna lombar', 'RX lombar', 'lombar'] },
  { nome: 'Radiografia de Coluna Cervical (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X cervical', 'RX cervical', 'coluna cervical'] },
  { nome: 'Radiografia de Coluna Torácica (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X coluna torácica', 'RX torácica'] },
  { nome: 'Radiografia de Joelho (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X joelho', 'RX joelho'] },
  { nome: 'Radiografia de Quadril (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X quadril', 'RX quadril', 'fêmur'] },
  { nome: 'Radiografia de Ombro (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X ombro', 'RX ombro'] },
  { nome: 'Radiografia de Tornozelo (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X tornozelo', 'RX tornozelo'] },
  { nome: 'Radiografia de Pé (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X pé', 'RX pé'] },
  { nome: 'Radiografia de Mão (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X mão', 'RX mão'] },
  { nome: 'Radiografia de Punho (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X punho', 'RX punho'] },
  { nome: 'Radiografia de Crânio (AP e Perfil)', categoria: 'raio_x', sinonimos: ['raio-X crânio', 'RX crânio', 'crânio'] },
  { nome: 'Radiografia de Abdômen (AP)', categoria: 'raio_x', sinonimos: ['raio-X abdômen', 'RX abdome', 'abdômen'] },
  { nome: 'Radiografia do Arco Plantar', categoria: 'raio_x', sinonimos: ['raio-X arco plantar', 'pé plano', 'calcâneo'] },

  // ── ULTRASSONOGRAFIA ─────────────────────────────────────────────────────────
  { nome: 'Ultrassonografia de Abdômen Total', categoria: 'ultrassom', sinonimos: ['ultrassom abdômen', 'eco abdominal', 'US abdômen'], preparo: 'Jejum de 4 a 6 horas. Bexiga cheia.' },
  { nome: 'Ultrassonografia de Abdômen Superior', categoria: 'ultrassom', sinonimos: ['US abdômen superior', 'fígado vesícula pâncreas'], preparo: 'Jejum de 4 a 6 horas.' },
  { nome: 'Ultrassonografia Pélvica (bexiga cheia)', categoria: 'ultrassom', sinonimos: ['US pélvico', 'ultrassom pélvico', 'útero ovário'], preparo: 'Bexiga cheia (tomar 4 copos de água 1 hora antes, não urinar).' },
  { nome: 'Ultrassonografia Pélvica Transvaginal', categoria: 'ultrassom', sinonimos: ['US transvaginal', 'ultrassom transvaginal'], preparo: 'Bexiga vazia.' },
  { nome: 'Ultrassonografia de Tireoide', categoria: 'ultrassom', sinonimos: ['US tireoide', 'ultrassom tireoide', 'nódulo tireoide'] },
  { nome: 'Ultrassonografia de Mamas', categoria: 'ultrassom', sinonimos: ['US mamas', 'ultrassom mama', 'nódulo mama'] },
  { nome: 'Ultrassonografia de Rins e Vias Urinárias', categoria: 'ultrassom', sinonimos: ['US rins', 'ultrassom renal', 'cálculo renal', 'litíase'], preparo: 'Bexiga cheia.' },
  { nome: 'Ultrassonografia de Próstata Transretal', categoria: 'ultrassom', sinonimos: ['US próstata', 'ultrassom próstata transretal'], preparo: 'Intestino deve ser preparado (enema).' },
  { nome: 'Ultrassonografia de Próstata (via abdominal)', categoria: 'ultrassom', sinonimos: ['US próstata abdominal'], preparo: 'Bexiga cheia.' },
  { nome: 'Ultrassonografia de Articulação (joelho, ombro, etc.)', categoria: 'ultrassom', sinonimos: ['US articular', 'ultrassom articulação', 'US musculoesquelético'] },
  { nome: 'Ultrassonografia Doppler de Membros Inferiores (TVP)', categoria: 'ultrassom', sinonimos: ['Doppler MMII', 'US Doppler veias', 'TVP', 'trombose'] },
  { nome: 'Ultrassonografia Doppler de Carótidas e Vertebrais', categoria: 'ultrassom', sinonimos: ['Doppler carótida', 'US carótida', 'AVC'] },
  { nome: 'Ultrassonografia de Testículos', categoria: 'ultrassom', sinonimos: ['US testicular', 'ultrassom testículo'] },
  { nome: 'Ultrassonografia Obstétrica (morfológico)', categoria: 'ultrassom', sinonimos: ['US obstétrico', 'ultrassom gestação', 'morfológico', 'bebê'] },

  // ── TOMOGRAFIA COMPUTADORIZADA ───────────────────────────────────────────────
  { nome: 'Tomografia de Crânio s/ contraste', categoria: 'tomografia', sinonimos: ['TC crânio', 'tomografia crânio', 'tomografia cabeça'] },
  { nome: 'Tomografia de Crânio c/ contraste', categoria: 'tomografia', sinonimos: ['TC crânio contraste', 'tomografia crânio contraste'] },
  { nome: 'Tomografia de Seios da Face', categoria: 'tomografia', sinonimos: ['TC seios da face', 'tomografia sinusite', 'seios paranasais'] },
  { nome: 'Tomografia de Tórax s/ contraste', categoria: 'tomografia', sinonimos: ['TC tórax', 'tomografia pulmão', 'nódulo pulmonar'] },
  { nome: 'Tomografia de Tórax c/ contraste', categoria: 'tomografia', sinonimos: ['TC tórax contraste', 'tomografia tórax contraste', 'TEP'] },
  { nome: 'Tomografia de Abdômen e Pelve s/ contraste', categoria: 'tomografia', sinonimos: ['TC abdômen', 'tomografia abdômen'] },
  { nome: 'Tomografia de Abdômen e Pelve c/ contraste', categoria: 'tomografia', sinonimos: ['TC abdômen contraste', 'tomografia abdômen contraste'] },
  { nome: 'Tomografia de Coluna Lombar', categoria: 'tomografia', sinonimos: ['TC coluna lombar', 'tomografia lombar', 'hérnia disco'] },
  { nome: 'Tomografia de Coluna Cervical', categoria: 'tomografia', sinonimos: ['TC cervical', 'tomografia cervical'] },
  { nome: 'Angiotomografia de Coronárias', categoria: 'tomografia', sinonimos: ['angiotomografia coronária', 'TC coronária', 'escore de cálcio'] },

  // ── RESSONÂNCIA MAGNÉTICA ────────────────────────────────────────────────────
  { nome: 'Ressonância de Crânio c/ e s/ contraste', categoria: 'ressonancia', sinonimos: ['RM crânio', 'ressonância cabeça', 'RNM crânio'] },
  { nome: 'Ressonância de Coluna Lombar', categoria: 'ressonancia', sinonimos: ['RM coluna lombar', 'ressonância lombar', 'hérnia disco lombar'] },
  { nome: 'Ressonância de Coluna Cervical', categoria: 'ressonancia', sinonimos: ['RM cervical', 'ressonância cervical'] },
  { nome: 'Ressonância de Coluna Torácica', categoria: 'ressonancia', sinonimos: ['RM coluna torácica', 'ressonância torácica'] },
  { nome: 'Ressonância de Joelho', categoria: 'ressonancia', sinonimos: ['RM joelho', 'ressonância joelho', 'menisco', 'ligamento'] },
  { nome: 'Ressonância de Ombro', categoria: 'ressonancia', sinonimos: ['RM ombro', 'ressonância ombro', 'manguito rotador'] },
  { nome: 'Ressonância de Quadril', categoria: 'ressonancia', sinonimos: ['RM quadril', 'ressonância quadril'] },
  { nome: 'Ressonância de Abdômen', categoria: 'ressonancia', sinonimos: ['RM abdômen', 'ressonância abdominal', 'fígado', 'pâncreas'] },
  { nome: 'Ressonância Pélvica', categoria: 'ressonancia', sinonimos: ['RM pelve', 'ressonância pélvica', 'próstata RM'] },
  { nome: 'Ressonância de Tornozelo', categoria: 'ressonancia', sinonimos: ['RM tornozelo', 'ressonância tornozelo'] },
  { nome: 'Angioressonância de Encéfalo', categoria: 'ressonancia', sinonimos: ['angioressonância', 'angiorressonância', 'vasos cerebrais', 'aneurisma'] },

  // ── MAMOGRAFIA / DENSITOMETRIA ───────────────────────────────────────────────
  { nome: 'Mamografia Bilateral', categoria: 'mamografia', sinonimos: ['mamografia', 'raio-X mamas', 'câncer mama'], preparo: 'Não usar desodorante no dia do exame.' },
  { nome: 'Densitometria Óssea (DEXA)', categoria: 'mamografia', sinonimos: ['densitometria óssea', 'DEXA', 'osteoporose', 'osteopenia'] },
  { nome: 'Cintilografia Óssea', categoria: 'mamografia', sinonimos: ['cintilografia óssea', 'metástase óssea'] },

  // ── CARDIOLOGIA ──────────────────────────────────────────────────────────────
  { nome: 'Eletrocardiograma (ECG) em repouso', categoria: 'cardiologia', sinonimos: ['ECG', 'eletrocardiograma', 'eletro'] },
  { nome: 'Ecocardiograma transtorácico', categoria: 'cardiologia', sinonimos: ['ecocardiograma', 'eco coração', 'ultrassom coração'] },
  { nome: 'Ecocardiograma Transesofágico', categoria: 'cardiologia', sinonimos: ['ecocardiograma transesofágico', 'ETE'] },
  { nome: 'Holter 24h (Holter de ritmo)', categoria: 'cardiologia', sinonimos: ['Holter', 'Holter 24h', 'arritmia', 'monitorização'] },
  { nome: 'MAPA 24h (Monitorização Ambulatorial da PA)', categoria: 'cardiologia', sinonimos: ['MAPA', 'monitorização pressão arterial', 'holter pressão'] },
  { nome: 'Teste Ergométrico (esteira)', categoria: 'cardiologia', sinonimos: ['teste ergométrico', 'teste esteira', 'teste esforço', 'isquemia'], preparo: 'Jejum de 3 horas. Trazer tênis.' },
  { nome: 'Escore de Cálcio Coronário', categoria: 'cardiologia', sinonimos: ['escore de cálcio', 'cálcio coronário', 'risco cardiovascular'] },
  { nome: 'Mapa de eventos cardíacos (loop recorder externo)', categoria: 'cardiologia', sinonimos: ['loop recorder', 'mapa eventos'] },

  // ── NEUROLOGIA / ELETROFISIOLOGIA ────────────────────────────────────────────
  { nome: 'Eletroencefalograma (EEG)', categoria: 'neurologia', sinonimos: ['EEG', 'eletroencefalograma', 'epilepsia', 'convulsão'], preparo: 'Lavar o cabelo na noite anterior. Não usar condicionador.' },
  { nome: 'Eletroneuromiografia (ENMG)', categoria: 'neurologia', sinonimos: ['ENMG', 'eletromiografia', 'EMG', 'síndrome do túnel do carpo', 'neuropatia'] },
  { nome: 'Potenciais Evocados Auditivos (BERA)', categoria: 'neurologia', sinonimos: ['BERA', 'potencial auditivo', 'surdez'] },
  { nome: 'Potenciais Evocados Visuais', categoria: 'neurologia', sinonimos: ['potencial visual evocado', 'esclerose múltipla'] },

  // ── OFTALMOLOGIA ─────────────────────────────────────────────────────────────
  { nome: 'Fundoscopia (Fundo de Olho)', categoria: 'oftalmologia', sinonimos: ['fundo de olho', 'fundoscopia', 'retina', 'diabetes', 'hipertensão'] },
  { nome: 'Tonometria (Pressão ocular)', categoria: 'oftalmologia', sinonimos: ['tonometria', 'pressão ocular', 'glaucoma'] },
  { nome: 'Campimetria (Campo Visual)', categoria: 'oftalmologia', sinonimos: ['campimetria', 'campo visual', 'glaucoma'] },
  { nome: 'OCT de Retina (Tomografia de coerência óptica)', categoria: 'oftalmologia', sinonimos: ['OCT retina', 'tomografia retina', 'mácula'] },

  // ── PNEUMOLOGIA / FUNÇÃO PULMONAR ────────────────────────────────────────────
  { nome: 'Espirometria (Prova de função pulmonar)', categoria: 'pneumologia', sinonimos: ['espirometria', 'função pulmonar', 'asma', 'DPOC'] },
  { nome: 'Teste de broncodilatador', categoria: 'pneumologia', sinonimos: ['prova broncodilatadora', 'broncodilatador', 'asma'] },
  { nome: 'Teste de Caminhada 6 Minutos (TC6)', categoria: 'pneumologia', sinonimos: ['TC6', 'teste caminhada 6 minutos', 'tolerância exercício'] },
  { nome: 'Oximetria de pulso noturna', categoria: 'pneumologia', sinonimos: ['oximetria noturna', 'saturação noturna', 'apneia do sono'] },
  { nome: 'Polissonografia', categoria: 'pneumologia', sinonimos: ['polissonografia', 'apneia do sono', 'ronco', 'sono'], preparo: 'Evitar cochilos no dia. Não ingerir cafeína.' },

  // ── ENDOSCOPIA ───────────────────────────────────────────────────────────────
  { nome: 'Endoscopia Digestiva Alta (EDA)', categoria: 'endoscopia', sinonimos: ['endoscopia', 'EDA', 'gastroscopia', 'H. pylori', 'úlcera'], preparo: 'Jejum de 8 horas.' },
  { nome: 'Colonoscopia', categoria: 'endoscopia', sinonimos: ['colonoscopia', 'cólon', 'pólipos', 'câncer cólon'], preparo: 'Preparo intestinal com laxante 1-2 dias antes. Dieta sem resíduos.' },
  { nome: 'Retossigmoidoscopia', categoria: 'endoscopia', sinonimos: ['retossigmoidoscopia', 'sigmoidoscopia', 'reto'] },
  { nome: 'Biópsia de Mucosa Gástrica (para H. pylori)', categoria: 'endoscopia', sinonimos: ['biópsia gástrica', 'H. pylori biópsia'] },
  { nome: 'Teste respiratório para H. pylori (ureia marcada)', categoria: 'endoscopia', sinonimos: ['teste respiratório H. pylori', 'ureia C13', 'helicobacter'], preparo: 'Jejum de 4 horas.' },

  // ── OUTROS ───────────────────────────────────────────────────────────────────
  { nome: 'Papanicolau (Colpocitologia oncótica)', categoria: 'outros', sinonimos: ['papanicolau', 'colpocitologia', 'câncer colo útero', 'HPV'], preparo: 'Abstinência sexual 2 dias antes. Não realizar durante menstruação. Não usar medicamentos vaginais.' },
  { nome: 'Colposcopia', categoria: 'outros', sinonimos: ['colposcopia', 'cérvice', 'HPV', 'colo útero'] },
  { nome: 'BAAR (baciloscopia — tuberculose)', categoria: 'outros', sinonimos: ['BAAR', 'baciloscopia', 'tuberculose', 'TB'] },
  { nome: 'Cultura para BK (bacilo de Koch)', categoria: 'outros', sinonimos: ['cultura BK', 'tuberculose', 'cultura BAAR'] },
  { nome: 'Espermograma', categoria: 'outros', sinonimos: ['espermograma', 'espermiograma', 'fertilidade masculina', 'infertilidade'] },
  { nome: 'Hemocultura (2 amostras)', categoria: 'outros', sinonimos: ['hemocultura', 'bacteremia', 'sepse'] },
  { nome: 'Swab de garganta (cultura)', categoria: 'outros', sinonimos: ['swab garganta', 'cultura garganta', 'estreptococo', 'amigdalite'] },
  { nome: 'Teste do Pezinho (triagem neonatal)', categoria: 'outros', sinonimos: ['teste pezinho', 'triagem neonatal'] },
  { nome: 'Teste Rápido de Streptococo A', categoria: 'outros', sinonimos: ['teste rápido strep', 'teste rápido estreptococo', 'faringite'] },
  { nome: 'PCR COVID-19 (RT-PCR)', categoria: 'outros', sinonimos: ['PCR COVID', 'RT-PCR COVID', 'coronavírus'] },
  { nome: 'Antígeno COVID-19 (teste rápido)', categoria: 'outros', sinonimos: ['antígeno COVID', 'teste rápido COVID'] },
]

/** Busca exames por texto (nome e sinônimos), com limite */
export function buscarExames(query: string, limite = 8): Exame[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []

  const resultados: Array<{ exame: Exame; score: number }> = []

  for (const ex of EXAMES) {
    const nomeLower = ex.nome.toLowerCase()
    const sinonLower = (ex.sinonimos ?? []).map(s => s.toLowerCase())

    let score = 0

    if (nomeLower.startsWith(q)) score += 100
    else if (nomeLower.split(' ').some(w => w.startsWith(q))) score += 80
    else if (nomeLower.includes(q)) score += 60

    if (sinonLower.some(s => s.startsWith(q))) score += 90
    else if (sinonLower.some(s => s.includes(q))) score += 50

    if (score > 0) resultados.push({ exame: ex, score })
  }

  return resultados
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(r => r.exame)
}

/** Agrupa uma lista de nomes de exames por categoria */
export function agruparExamesPorCategoria(
  nomesExames: string[]
): Array<{ categoria: string; label: string; exames: string[]; preparo?: string }> {
  const grupos = new Map<string, string[]>()

  for (const nome of nomesExames) {
    if (!nome.trim()) continue
    // Tentar encontrar na base pelo nome exato ou parcial
    const encontrado = EXAMES.find(e =>
      e.nome.toLowerCase() === nome.toLowerCase() ||
      e.sinonimos?.some(s => s.toLowerCase() === nome.toLowerCase())
    )
    const cat = encontrado?.categoria ?? 'outros'
    if (!grupos.has(cat)) grupos.set(cat, [])
    grupos.get(cat)!.push(nome)
  }

  return [...grupos.entries()].map(([cat, exames]) => ({
    categoria: cat,
    label: CATEGORIAS[cat] ?? 'Outros',
    exames,
  }))
}
