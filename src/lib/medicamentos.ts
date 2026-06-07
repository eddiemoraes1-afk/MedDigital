/**
 * Base de medicamentos para autocomplete no formulário de receita.
 * Inclui princípio ativo, concentração, forma farmacêutica e nome(s) comercial(is).
 * Fonte: ANVISA / prática clínica brasileira.
 */

export interface Medicamento {
  principio: string       // nome genérico / princípio ativo
  concentracao: string    // ex: "50mg", "500mg/5ml"
  forma: string           // ex: "comprimido", "cápsula", "solução oral"
  comerciais?: string[]   // nomes comerciais (opcional)
}

export const MEDICAMENTOS: Medicamento[] = [
  // ── ANALGÉSICOS / ANTITÉRMICOS ──────────────────────────────────────────────
  { principio: 'Dipirona Monoidratada', concentracao: '500mg', forma: 'comprimido', comerciais: ['Novalgina', 'Anador', 'Magnopyrol'] },
  { principio: 'Dipirona Monoidratada', concentracao: '1g', forma: 'comprimido', comerciais: ['Novalgina 1g'] },
  { principio: 'Dipirona Monoidratada', concentracao: '500mg/ml', forma: 'solução oral (gotas)', comerciais: ['Novalgina Gotas'] },
  { principio: 'Dipirona Monoidratada', concentracao: '500mg/ml', forma: 'solução injetável', comerciais: ['Novalgina Injetável'] },
  { principio: 'Paracetamol', concentracao: '500mg', forma: 'comprimido', comerciais: ['Tylenol', 'Dôrico', 'Parador'] },
  { principio: 'Paracetamol', concentracao: '750mg', forma: 'comprimido', comerciais: ['Tylenol 750mg'] },
  { principio: 'Paracetamol', concentracao: '200mg/ml', forma: 'solução oral (gotas)', comerciais: ['Tylenol Gotas'] },
  { principio: 'Paracetamol', concentracao: '160mg/5ml', forma: 'suspensão oral', comerciais: ['Tylenol Bebê'] },
  { principio: 'Tramadol', concentracao: '50mg', forma: 'cápsula', comerciais: ['Tramal', 'Sylador'] },
  { principio: 'Tramadol', concentracao: '100mg', forma: 'comprimido de liberação prolongada', comerciais: ['Tramal Retard'] },
  { principio: 'Codeína + Paracetamol', concentracao: '30mg + 500mg', forma: 'comprimido', comerciais: ['Tylex', 'Codex'] },
  { principio: 'Morfina', concentracao: '10mg/ml', forma: 'solução oral', comerciais: ['Dimorf'] },
  { principio: 'Morfina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Dimorf'] },

  // ── ANTI-INFLAMATÓRIOS NÃO ESTEROIDAIS (AINEs) ─────────────────────────────
  { principio: 'Ibuprofeno', concentracao: '400mg', forma: 'comprimido', comerciais: ['Advil', 'Alivium', 'Buprovil'] },
  { principio: 'Ibuprofeno', concentracao: '600mg', forma: 'comprimido', comerciais: ['Advil 600', 'Alivium 600'] },
  { principio: 'Ibuprofeno', concentracao: '800mg', forma: 'comprimido', comerciais: ['Advil 800'] },
  { principio: 'Ibuprofeno', concentracao: '100mg/5ml', forma: 'suspensão oral', comerciais: ['Advil Infantil', 'Alivium Infantil'] },
  { principio: 'Nimesulida', concentracao: '100mg', forma: 'comprimido', comerciais: ['Nisulid', 'Scaflan', 'Nimesilam'] },
  { principio: 'Nimesulida', concentracao: '100mg/g', forma: 'granulado para solução oral', comerciais: ['Nisulid Sachê'] },
  { principio: 'Diclofenaco Sódico', concentracao: '50mg', forma: 'comprimido', comerciais: ['Voltaren', 'Cataflam'] },
  { principio: 'Diclofenaco Potássico', concentracao: '50mg', forma: 'comprimido', comerciais: ['Cataflam 50mg'] },
  { principio: 'Diclofenaco Sódico', concentracao: '75mg/3ml', forma: 'solução injetável', comerciais: ['Voltaren Injetável'] },
  { principio: 'Meloxicam', concentracao: '7,5mg', forma: 'comprimido', comerciais: ['Movatec', 'Mobic'] },
  { principio: 'Meloxicam', concentracao: '15mg', forma: 'comprimido', comerciais: ['Movatec 15mg', 'Mobic 15mg'] },
  { principio: 'Naproxeno', concentracao: '500mg', forma: 'comprimido', comerciais: ['Naprosyn', 'Flanax'] },
  { principio: 'Cetoprofeno', concentracao: '100mg', forma: 'cápsula', comerciais: ['Profenid', 'Biprofenid'] },
  { principio: 'Cetoprofeno', concentracao: '100mg/2ml', forma: 'solução injetável', comerciais: ['Profenid Injetável'] },
  { principio: 'Celecoxibe', concentracao: '100mg', forma: 'cápsula', comerciais: ['Celebra', 'Celebrex'] },
  { principio: 'Celecoxibe', concentracao: '200mg', forma: 'cápsula', comerciais: ['Celebra 200mg'] },
  { principio: 'Etoricoxibe', concentracao: '60mg', forma: 'comprimido', comerciais: ['Arcoxia'] },
  { principio: 'Etoricoxibe', concentracao: '90mg', forma: 'comprimido', comerciais: ['Arcoxia 90mg'] },
  { principio: 'Etoricoxibe', concentracao: '120mg', forma: 'comprimido', comerciais: ['Arcoxia 120mg'] },
  { principio: 'Ácido Acetilsalicílico', concentracao: '100mg', forma: 'comprimido', comerciais: ['AAS 100mg', 'Aspirina 100mg'] },
  { principio: 'Ácido Acetilsalicílico', concentracao: '500mg', forma: 'comprimido', comerciais: ['AAS 500mg', 'Aspirina 500mg'] },

  // ── ANTI-HIPERTENSIVOS ───────────────────────────────────────────────────────
  { principio: 'Losartana Potássica', concentracao: '25mg', forma: 'comprimido', comerciais: ['Cozaar', 'Hyzaar'] },
  { principio: 'Losartana Potássica', concentracao: '50mg', forma: 'comprimido', comerciais: ['Cozaar 50mg', 'Losartec'] },
  { principio: 'Losartana Potássica', concentracao: '100mg', forma: 'comprimido', comerciais: ['Cozaar 100mg'] },
  { principio: 'Losartana + Hidroclorotiazida', concentracao: '50mg + 12,5mg', forma: 'comprimido', comerciais: ['Hyzaar'] },
  { principio: 'Enalapril', concentracao: '5mg', forma: 'comprimido', comerciais: ['Vasotec', 'Renitec'] },
  { principio: 'Enalapril', concentracao: '10mg', forma: 'comprimido', comerciais: ['Vasotec 10mg'] },
  { principio: 'Enalapril', concentracao: '20mg', forma: 'comprimido', comerciais: ['Vasotec 20mg'] },
  { principio: 'Lisinopril', concentracao: '5mg', forma: 'comprimido', comerciais: ['Zestril', 'Prinivil'] },
  { principio: 'Lisinopril', concentracao: '10mg', forma: 'comprimido', comerciais: ['Zestril 10mg'] },
  { principio: 'Lisinopril', concentracao: '20mg', forma: 'comprimido', comerciais: ['Zestril 20mg'] },
  { principio: 'Ramipril', concentracao: '5mg', forma: 'comprimido', comerciais: ['Naprix', 'Triatec'] },
  { principio: 'Ramipril', concentracao: '10mg', forma: 'comprimido', comerciais: ['Naprix 10mg'] },
  { principio: 'Amlodipino', concentracao: '5mg', forma: 'comprimido', comerciais: ['Norvasc', 'Amlodil'] },
  { principio: 'Amlodipino', concentracao: '10mg', forma: 'comprimido', comerciais: ['Norvasc 10mg'] },
  { principio: 'Nifedipino', concentracao: '20mg', forma: 'comprimido de ação prolongada', comerciais: ['Adalat Oros', 'Oxcord'] },
  { principio: 'Nifedipino', concentracao: '30mg', forma: 'comprimido de ação prolongada', comerciais: ['Adalat Oros 30mg'] },
  { principio: 'Verapamil', concentracao: '80mg', forma: 'comprimido', comerciais: ['Dilacoron'] },
  { principio: 'Verapamil', concentracao: '240mg', forma: 'comprimido de liberação prolongada', comerciais: ['Dilacoron Retard'] },
  { principio: 'Atenolol', concentracao: '25mg', forma: 'comprimido', comerciais: ['Tenormin'] },
  { principio: 'Atenolol', concentracao: '50mg', forma: 'comprimido', comerciais: ['Tenormin 50mg'] },
  { principio: 'Atenolol', concentracao: '100mg', forma: 'comprimido', comerciais: ['Tenormin 100mg'] },
  { principio: 'Metoprolol', concentracao: '25mg', forma: 'comprimido', comerciais: ['Selozok', 'Lopressor'] },
  { principio: 'Metoprolol', concentracao: '50mg', forma: 'comprimido', comerciais: ['Selozok 50mg'] },
  { principio: 'Metoprolol', concentracao: '100mg', forma: 'comprimido', comerciais: ['Selozok 100mg'] },
  { principio: 'Carvedilol', concentracao: '3,125mg', forma: 'comprimido', comerciais: ['Coreg', 'Dilatrend'] },
  { principio: 'Carvedilol', concentracao: '6,25mg', forma: 'comprimido', comerciais: ['Coreg 6,25mg', 'Dilatrend 6,25mg'] },
  { principio: 'Carvedilol', concentracao: '12,5mg', forma: 'comprimido', comerciais: ['Coreg 12,5mg'] },
  { principio: 'Carvedilol', concentracao: '25mg', forma: 'comprimido', comerciais: ['Coreg 25mg'] },
  { principio: 'Bisoprolol', concentracao: '5mg', forma: 'comprimido', comerciais: ['Concor'] },
  { principio: 'Bisoprolol', concentracao: '10mg', forma: 'comprimido', comerciais: ['Concor 10mg'] },
  { principio: 'Hidroclorotiazida', concentracao: '25mg', forma: 'comprimido', comerciais: ['Clorana', 'Hidrion'] },
  { principio: 'Furosemida', concentracao: '40mg', forma: 'comprimido', comerciais: ['Lasix', 'Furosemix'] },
  { principio: 'Furosemida', concentracao: '10mg/ml', forma: 'solução injetável', comerciais: ['Lasix Injetável'] },
  { principio: 'Espironolactona', concentracao: '25mg', forma: 'comprimido', comerciais: ['Aldactone'] },
  { principio: 'Espironolactona', concentracao: '50mg', forma: 'comprimido', comerciais: ['Aldactone 50mg'] },
  { principio: 'Espironolactona', concentracao: '100mg', forma: 'comprimido', comerciais: ['Aldactone 100mg'] },
  { principio: 'Clonidina', concentracao: '0,1mg', forma: 'comprimido', comerciais: ['Atensina'] },
  { principio: 'Clonidina', concentracao: '0,15mg', forma: 'comprimido', comerciais: ['Atensina 0,15mg'] },
  { principio: 'Doxazosina', concentracao: '2mg', forma: 'comprimido', comerciais: ['Carduran'] },
  { principio: 'Doxazosina', concentracao: '4mg', forma: 'comprimido', comerciais: ['Carduran 4mg'] },
  { principio: 'Hidralazina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Apresolina'] },
  { principio: 'Valsartana', concentracao: '80mg', forma: 'comprimido', comerciais: ['Diovan'] },
  { principio: 'Valsartana', concentracao: '160mg', forma: 'comprimido', comerciais: ['Diovan 160mg'] },
  { principio: 'Olmesartana', concentracao: '20mg', forma: 'comprimido', comerciais: ['Benicar', 'Olsar'] },
  { principio: 'Olmesartana', concentracao: '40mg', forma: 'comprimido', comerciais: ['Benicar 40mg'] },
  { principio: 'Telmisartana', concentracao: '40mg', forma: 'comprimido', comerciais: ['Micardis'] },
  { principio: 'Telmisartana', concentracao: '80mg', forma: 'comprimido', comerciais: ['Micardis 80mg'] },

  // ── DIABETES ─────────────────────────────────────────────────────────────────
  { principio: 'Metformina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Glifage', 'Glucoformin'] },
  { principio: 'Metformina', concentracao: '850mg', forma: 'comprimido', comerciais: ['Glifage 850mg', 'Glucoformin 850mg'] },
  { principio: 'Metformina', concentracao: '1g', forma: 'comprimido', comerciais: ['Glifage XR 1g'] },
  { principio: 'Metformina', concentracao: '500mg', forma: 'comprimido de liberação prolongada', comerciais: ['Glifage XR'] },
  { principio: 'Glibenclamida', concentracao: '5mg', forma: 'comprimido', comerciais: ['Daonil'] },
  { principio: 'Glicazida', concentracao: '30mg', forma: 'comprimido de liberação modificada', comerciais: ['Diamicron MR'] },
  { principio: 'Glicazida', concentracao: '60mg', forma: 'comprimido de liberação modificada', comerciais: ['Diamicron MR 60mg'] },
  { principio: 'Glipizida', concentracao: '5mg', forma: 'comprimido', comerciais: ['Minidiab'] },
  { principio: 'Sitagliptina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Januvia'] },
  { principio: 'Sitagliptina + Metformina', concentracao: '50mg + 1g', forma: 'comprimido', comerciais: ['Janumet'] },
  { principio: 'Saxagliptina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Onglyza'] },
  { principio: 'Linagliptina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Trayenta'] },
  { principio: 'Empagliflozina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Jardiance'] },
  { principio: 'Empagliflozina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Jardiance 25mg'] },
  { principio: 'Dapagliflozina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Forxiga'] },
  { principio: 'Canagliflozina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Invokana'] },
  { principio: 'Canagliflozina', concentracao: '300mg', forma: 'comprimido', comerciais: ['Invokana 300mg'] },
  { principio: 'Liraglutida', concentracao: '6mg/ml', forma: 'solução injetável (caneta)', comerciais: ['Victoza', 'Saxenda'] },
  { principio: 'Semaglutida', concentracao: '0,5mg', forma: 'solução injetável semanal', comerciais: ['Ozempic'] },
  { principio: 'Semaglutida', concentracao: '1mg', forma: 'solução injetável semanal', comerciais: ['Ozempic 1mg'] },
  { principio: 'Insulina NPH Humana', concentracao: '100UI/ml', forma: 'solução injetável (frasco)', comerciais: ['Insulina NPH'] },
  { principio: 'Insulina Regular Humana', concentracao: '100UI/ml', forma: 'solução injetável (frasco)', comerciais: ['Insulina Regular'] },
  { principio: 'Insulina Glargina', concentracao: '100UI/ml', forma: 'solução injetável (caneta)', comerciais: ['Lantus'] },
  { principio: 'Insulina Detemir', concentracao: '100UI/ml', forma: 'solução injetável (caneta)', comerciais: ['Levemir'] },
  { principio: 'Insulina Degludeca', concentracao: '100UI/ml', forma: 'solução injetável (caneta)', comerciais: ['Tresiba'] },
  { principio: 'Insulina Asparte', concentracao: '100UI/ml', forma: 'solução injetável (caneta)', comerciais: ['NovoRapid'] },
  { principio: 'Insulina Lispro', concentracao: '100UI/ml', forma: 'solução injetável (caneta)', comerciais: ['Humalog'] },

  // ── ESTATINAS / DISLIPIDEMIA ────────────────────────────────────────────────
  { principio: 'Sinvastatina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Zocor', 'Sinvax'] },
  { principio: 'Sinvastatina', concentracao: '20mg', forma: 'comprimido', comerciais: ['Zocor 20mg'] },
  { principio: 'Sinvastatina', concentracao: '40mg', forma: 'comprimido', comerciais: ['Zocor 40mg'] },
  { principio: 'Atorvastatina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Lipitor', 'Citalor'] },
  { principio: 'Atorvastatina', concentracao: '20mg', forma: 'comprimido', comerciais: ['Lipitor 20mg'] },
  { principio: 'Atorvastatina', concentracao: '40mg', forma: 'comprimido', comerciais: ['Lipitor 40mg'] },
  { principio: 'Atorvastatina', concentracao: '80mg', forma: 'comprimido', comerciais: ['Lipitor 80mg'] },
  { principio: 'Rosuvastatina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Crestor', 'Rosucor'] },
  { principio: 'Rosuvastatina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Crestor 10mg'] },
  { principio: 'Rosuvastatina', concentracao: '20mg', forma: 'comprimido', comerciais: ['Crestor 20mg'] },
  { principio: 'Rosuvastatina', concentracao: '40mg', forma: 'comprimido', comerciais: ['Crestor 40mg'] },
  { principio: 'Ezetimiba', concentracao: '10mg', forma: 'comprimido', comerciais: ['Zetia', 'Ezedoc'] },
  { principio: 'Ezetimiba + Sinvastatina', concentracao: '10mg + 20mg', forma: 'comprimido', comerciais: ['Vytorin', 'Afalip'] },
  { principio: 'Fenofibrato', concentracao: '200mg', forma: 'cápsula', comerciais: ['Lipless', 'Triglide'] },
  { principio: 'Ômega 3 (EPA + DHA)', concentracao: '1g', forma: 'cápsula', comerciais: ['Ômacor', 'Lavaza'] },

  // ── GASTROENTEROLOGIA ────────────────────────────────────────────────────────
  { principio: 'Omeprazol', concentracao: '20mg', forma: 'cápsula', comerciais: ['Losec', 'Peprazol', 'Mopral'] },
  { principio: 'Omeprazol', concentracao: '40mg', forma: 'cápsula', comerciais: ['Losec 40mg'] },
  { principio: 'Pantoprazol', concentracao: '20mg', forma: 'comprimido', comerciais: ['Pantozol', 'Tecta'] },
  { principio: 'Pantoprazol', concentracao: '40mg', forma: 'comprimido', comerciais: ['Pantozol 40mg'] },
  { principio: 'Esomeprazol', concentracao: '20mg', forma: 'cápsula', comerciais: ['Nexium'] },
  { principio: 'Esomeprazol', concentracao: '40mg', forma: 'cápsula', comerciais: ['Nexium 40mg'] },
  { principio: 'Lansoprazol', concentracao: '15mg', forma: 'cápsula', comerciais: ['Prevacid', 'Ogastoro'] },
  { principio: 'Lansoprazol', concentracao: '30mg', forma: 'cápsula', comerciais: ['Prevacid 30mg'] },
  { principio: 'Rabeprazol', concentracao: '20mg', forma: 'comprimido', comerciais: ['Pariet'] },
  { principio: 'Ranitidina', concentracao: '150mg', forma: 'comprimido', comerciais: ['Antak', 'Zantac'] },
  { principio: 'Ranitidina', concentracao: '300mg', forma: 'comprimido', comerciais: ['Antak 300mg'] },
  { principio: 'Domperidona', concentracao: '10mg', forma: 'comprimido', comerciais: ['Motilium', 'Domperix'] },
  { principio: 'Domperidona', concentracao: '1mg/ml', forma: 'suspensão oral', comerciais: ['Motilium Suspensão'] },
  { principio: 'Metoclopramida', concentracao: '10mg', forma: 'comprimido', comerciais: ['Plasil', 'Cerucal'] },
  { principio: 'Ondansetrona', concentracao: '4mg', forma: 'comprimido', comerciais: ['Zofran', 'Vonau'] },
  { principio: 'Ondansetrona', concentracao: '8mg', forma: 'comprimido', comerciais: ['Zofran 8mg'] },
  { principio: 'Ondansetrona', concentracao: '2mg/ml', forma: 'solução injetável', comerciais: ['Zofran Injetável'] },
  { principio: 'Loperamida', concentracao: '2mg', forma: 'cápsula', comerciais: ['Imosec', 'Lomotil'] },
  { principio: 'Simeticona', concentracao: '75mg', forma: 'cápsula', comerciais: ['Luftal', 'Gas-X', 'Mylicon'] },
  { principio: 'Simeticona', concentracao: '40mg/ml', forma: 'solução oral (gotas)', comerciais: ['Luftal Gotas'] },
  { principio: 'Bismuto Subsalicilato', concentracao: '262mg', forma: 'comprimido mastigável', comerciais: ['Pepto-Bismol'] },
  { principio: 'Sulfassalazina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Azulfidine'] },
  { principio: 'Mesalazina', concentracao: '400mg', forma: 'comprimido', comerciais: ['Asacol', 'Mesacol'] },
  { principio: 'Lactulose', concentracao: '667mg/ml', forma: 'solução oral', comerciais: ['Lactulona', 'Duphalac'] },
  { principio: 'Macrogol 4000', concentracao: '10g', forma: 'pó para solução oral (sachê)', comerciais: ['Nulax', 'Muvinlax'] },

  // ── ANTIBIÓTICOS ─────────────────────────────────────────────────────────────
  { principio: 'Amoxicilina', concentracao: '500mg', forma: 'cápsula', comerciais: ['Amoxil', 'Clavulin (+ ác. clavulânico)'] },
  { principio: 'Amoxicilina', concentracao: '875mg', forma: 'comprimido', comerciais: ['Amoxil 875mg'] },
  { principio: 'Amoxicilina', concentracao: '250mg/5ml', forma: 'pó para suspensão oral', comerciais: ['Amoxil Suspensão'] },
  { principio: 'Amoxicilina + Clavulanato', concentracao: '875mg + 125mg', forma: 'comprimido', comerciais: ['Clavulin', 'Augmentin'] },
  { principio: 'Amoxicilina + Clavulanato', concentracao: '400mg + 57mg/5ml', forma: 'pó para suspensão oral', comerciais: ['Clavulin BD Suspensão'] },
  { principio: 'Azitromicina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Zitromax', 'Azimed'] },
  { principio: 'Azitromicina', concentracao: '200mg/5ml', forma: 'pó para suspensão oral', comerciais: ['Zitromax Suspensão'] },
  { principio: 'Claritromicina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Klaricid', 'Clarineo'] },
  { principio: 'Claritromicina', concentracao: '250mg/5ml', forma: 'pó para suspensão oral', comerciais: ['Klaricid Pediátrico'] },
  { principio: 'Cefalexina', concentracao: '500mg', forma: 'cápsula', comerciais: ['Keflex', 'Ceporine'] },
  { principio: 'Cefalexina', concentracao: '250mg/5ml', forma: 'pó para suspensão oral', comerciais: ['Keflex Suspensão'] },
  { principio: 'Cefuroxima', concentracao: '500mg', forma: 'comprimido', comerciais: ['Zinnat'] },
  { principio: 'Cefadroxila', concentracao: '500mg', forma: 'cápsula', comerciais: ['Cefamox', 'Duricef'] },
  { principio: 'Ciprofloxacino', concentracao: '500mg', forma: 'comprimido', comerciais: ['Cipro', 'Cifran'] },
  { principio: 'Ciprofloxacino', concentracao: '250mg', forma: 'comprimido', comerciais: ['Cipro 250mg'] },
  { principio: 'Levofloxacino', concentracao: '500mg', forma: 'comprimido', comerciais: ['Tavanic', 'Levaquin'] },
  { principio: 'Levofloxacino', concentracao: '750mg', forma: 'comprimido', comerciais: ['Tavanic 750mg'] },
  { principio: 'Moxifloxacino', concentracao: '400mg', forma: 'comprimido', comerciais: ['Avelox'] },
  { principio: 'Doxiciclina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Vibramycin', 'Doxifin'] },
  { principio: 'Minociclina', concentracao: '100mg', forma: 'cápsula', comerciais: ['Minomax'] },
  { principio: 'Metronidazol', concentracao: '400mg', forma: 'comprimido', comerciais: ['Flagyl'] },
  { principio: 'Metronidazol', concentracao: '500mg', forma: 'comprimido', comerciais: ['Flagyl 500mg'] },
  { principio: 'Metronidazol', concentracao: '250mg/5ml', forma: 'suspensão oral', comerciais: ['Flagyl Suspensão'] },
  { principio: 'Sulfametoxazol + Trimetoprima', concentracao: '800mg + 160mg', forma: 'comprimido', comerciais: ['Bactrim', 'Septrin'] },
  { principio: 'Sulfametoxazol + Trimetoprima', concentracao: '200mg + 40mg/5ml', forma: 'suspensão oral', comerciais: ['Bactrim Suspensão'] },
  { principio: 'Nitrofurantoína', concentracao: '100mg', forma: 'cápsula', comerciais: ['Macrodantina'] },
  { principio: 'Fosfomicina', concentracao: '3g', forma: 'pó para solução oral (sachê)', comerciais: ['Monuril'] },
  { principio: 'Clindamicina', concentracao: '300mg', forma: 'cápsula', comerciais: ['Dalacin', 'Clindamicin'] },
  { principio: 'Clindamicina', concentracao: '600mg', forma: 'cápsula', comerciais: ['Dalacin 600mg'] },
  { principio: 'Eritromicina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Pantomicina'] },
  { principio: 'Penicilina Benzatina', concentracao: '1.200.000 UI', forma: 'pó para suspensão injetável', comerciais: ['Benzetacil 1.200.000 UI'] },
  { principio: 'Penicilina Benzatina', concentracao: '2.400.000 UI', forma: 'pó para suspensão injetável', comerciais: ['Benzetacil 2.400.000 UI'] },
  { principio: 'Vancomicina', concentracao: '500mg', forma: 'pó para solução injetável', comerciais: ['Vancocin'] },
  { principio: 'Fluconazol', concentracao: '150mg', forma: 'cápsula', comerciais: ['Zoltec', 'Fluconal'] },
  { principio: 'Fluconazol', concentracao: '50mg', forma: 'cápsula', comerciais: ['Zoltec 50mg'] },
  { principio: 'Itraconazol', concentracao: '100mg', forma: 'cápsula', comerciais: ['Sporanox', 'Itranax'] },
  { principio: 'Ivermectina', concentracao: '6mg', forma: 'comprimido', comerciais: ['Ivermec', 'Revectina'] },
  { principio: 'Albendazol', concentracao: '400mg', forma: 'comprimido', comerciais: ['Zentel', 'Alben'] },
  { principio: 'Mebendazol', concentracao: '100mg', forma: 'comprimido', comerciais: ['Pantelmin', 'Vermox'] },

  // ── RESPIRATÓRIO / ALERGOLOGIA ───────────────────────────────────────────────
  { principio: 'Salbutamol (Albuterol)', concentracao: '100mcg/dose', forma: 'aerossol para inalação', comerciais: ['Aerolin', 'Ventolin'] },
  { principio: 'Formoterol', concentracao: '12mcg/dose', forma: 'aerossol para inalação', comerciais: ['Foradil'] },
  { principio: 'Salmeterol + Fluticasona', concentracao: '25mcg + 125mcg', forma: 'aerossol para inalação', comerciais: ['Seretide'] },
  { principio: 'Budesonida + Formoterol', concentracao: '160mcg + 4,5mcg', forma: 'aerossol para inalação', comerciais: ['Symbicort'] },
  { principio: 'Budesonida', concentracao: '200mcg/dose', forma: 'aerossol para inalação', comerciais: ['Pulmicort'] },
  { principio: 'Fluticasona', concentracao: '50mcg/dose', forma: 'aerossol para inalação', comerciais: ['Flixotide'] },
  { principio: 'Fluticasona', concentracao: '250mcg/dose', forma: 'aerossol para inalação', comerciais: ['Flixotide Forte'] },
  { principio: 'Montelucaste', concentracao: '10mg', forma: 'comprimido', comerciais: ['Singulair'] },
  { principio: 'Montelucaste', concentracao: '5mg', forma: 'comprimido mastigável', comerciais: ['Singulair Pediátrico'] },
  { principio: 'Loratadina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Claritin', 'Loratin'] },
  { principio: 'Loratadina', concentracao: '1mg/ml', forma: 'xarope', comerciais: ['Claritin Xarope'] },
  { principio: 'Cetirizina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Zyrtec', 'Reactine'] },
  { principio: 'Cetirizina', concentracao: '1mg/ml', forma: 'solução oral', comerciais: ['Zyrtec Solução'] },
  { principio: 'Desloratadina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Desalex', 'Aerius'] },
  { principio: 'Fexofenadina', concentracao: '120mg', forma: 'comprimido', comerciais: ['Allegra'] },
  { principio: 'Fexofenadina', concentracao: '180mg', forma: 'comprimido', comerciais: ['Allegra 180mg'] },
  { principio: 'Levocetirizina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Xazal'] },
  { principio: 'Bilastina', concentracao: '20mg', forma: 'comprimido', comerciais: ['Blium', 'Bilaxten'] },
  { principio: 'Difenidramina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Benadryl'] },
  { principio: 'Brometo de Ipratrópio', concentracao: '0,5mg/2ml', forma: 'solução para inalação', comerciais: ['Atrovent'] },
  { principio: 'Brometo de Tiotrópio', concentracao: '18mcg/dose', forma: 'cápsulas para inalação', comerciais: ['Spiriva'] },
  { principio: 'Dextrometorfano', concentracao: '15mg/5ml', forma: 'xarope', comerciais: ['Robitussin'] },
  { principio: 'Ambroxol', concentracao: '30mg', forma: 'comprimido', comerciais: ['Mucosolvan', 'Mucopect'] },
  { principio: 'Ambroxol', concentracao: '6mg/ml', forma: 'solução oral', comerciais: ['Mucosolvan Solução'] },
  { principio: 'Acetilcisteína', concentracao: '600mg', forma: 'comprimido efervescente', comerciais: ['Fluimucil', 'NAC'] },
  { principio: 'Prednisona', concentracao: '5mg', forma: 'comprimido', comerciais: ['Meticorten'] },
  { principio: 'Prednisona', concentracao: '20mg', forma: 'comprimido', comerciais: ['Meticorten 20mg'] },
  { principio: 'Prednisona', concentracao: '50mg', forma: 'comprimido', comerciais: ['Meticorten 50mg'] },
  { principio: 'Prednisolona', concentracao: '3mg/ml', forma: 'solução oral', comerciais: ['Prelone', 'Predsim'] },
  { principio: 'Dexametasona', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Decadron'] },
  { principio: 'Dexametasona', concentracao: '4mg', forma: 'comprimido', comerciais: ['Decadron 4mg'] },
  { principio: 'Dexametasona', concentracao: '4mg/ml', forma: 'solução injetável', comerciais: ['Decadron Injetável'] },
  { principio: 'Betametasona', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Celestone'] },
  { principio: 'Metilprednisolona', concentracao: '4mg', forma: 'comprimido', comerciais: ['Depo-Medrol', 'Solu-Medrol'] },

  // ── SAÚDE MENTAL / NEUROLOGIA ────────────────────────────────────────────────
  { principio: 'Fluoxetina', concentracao: '20mg', forma: 'cápsula', comerciais: ['Prozac', 'Daforin'] },
  { principio: 'Fluoxetina', concentracao: '40mg', forma: 'cápsula', comerciais: ['Prozac 40mg'] },
  { principio: 'Sertralina', concentracao: '50mg', forma: 'comprimido', comerciais: ['Zoloft', 'Tolrest'] },
  { principio: 'Sertralina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Zoloft 100mg'] },
  { principio: 'Escitalopram', concentracao: '10mg', forma: 'comprimido', comerciais: ['Lexapro', 'Cipralex'] },
  { principio: 'Escitalopram', concentracao: '20mg', forma: 'comprimido', comerciais: ['Lexapro 20mg'] },
  { principio: 'Citalopram', concentracao: '20mg', forma: 'comprimido', comerciais: ['Cipramil'] },
  { principio: 'Paroxetina', concentracao: '20mg', forma: 'comprimido', comerciais: ['Aropax', 'Paxil'] },
  { principio: 'Paroxetina', concentracao: '40mg', forma: 'comprimido', comerciais: ['Aropax 40mg'] },
  { principio: 'Venlafaxina', concentracao: '75mg', forma: 'cápsula de liberação prolongada', comerciais: ['Efexor XR'] },
  { principio: 'Venlafaxina', concentracao: '150mg', forma: 'cápsula de liberação prolongada', comerciais: ['Efexor XR 150mg'] },
  { principio: 'Duloxetina', concentracao: '30mg', forma: 'cápsula', comerciais: ['Cymbalta', 'Duloren'] },
  { principio: 'Duloxetina', concentracao: '60mg', forma: 'cápsula', comerciais: ['Cymbalta 60mg'] },
  { principio: 'Amitriptilina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Tryptanol'] },
  { principio: 'Amitriptilina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Tryptanol 25mg'] },
  { principio: 'Nortriptilina', concentracao: '25mg', forma: 'cápsula', comerciais: ['Pamelor'] },
  { principio: 'Nortriptilina', concentracao: '75mg', forma: 'cápsula', comerciais: ['Pamelor 75mg'] },
  { principio: 'Clonazepam', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Rivotril'] },
  { principio: 'Clonazepam', concentracao: '1mg', forma: 'comprimido', comerciais: ['Rivotril 1mg'] },
  { principio: 'Clonazepam', concentracao: '2mg', forma: 'comprimido', comerciais: ['Rivotril 2mg'] },
  { principio: 'Clonazepam', concentracao: '0,5mg/ml', forma: 'solução oral (gotas)', comerciais: ['Rivotril Gotas'] },
  { principio: 'Alprazolam', concentracao: '0,25mg', forma: 'comprimido', comerciais: ['Frontal', 'Xanax'] },
  { principio: 'Alprazolam', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Frontal 0,5mg'] },
  { principio: 'Alprazolam', concentracao: '1mg', forma: 'comprimido', comerciais: ['Frontal 1mg'] },
  { principio: 'Diazepam', concentracao: '5mg', forma: 'comprimido', comerciais: ['Valium', 'Ansileno'] },
  { principio: 'Diazepam', concentracao: '10mg', forma: 'comprimido', comerciais: ['Valium 10mg'] },
  { principio: 'Lorazepam', concentracao: '1mg', forma: 'comprimido', comerciais: ['Lorax'] },
  { principio: 'Bromazepam', concentracao: '3mg', forma: 'comprimido', comerciais: ['Lexotan'] },
  { principio: 'Bromazepam', concentracao: '6mg', forma: 'comprimido', comerciais: ['Lexotan 6mg'] },
  { principio: 'Buspirona', concentracao: '5mg', forma: 'comprimido', comerciais: ['Buspar'] },
  { principio: 'Buspirona', concentracao: '10mg', forma: 'comprimido', comerciais: ['Buspar 10mg'] },
  { principio: 'Quetiapina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Seroquel'] },
  { principio: 'Quetiapina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Seroquel 100mg'] },
  { principio: 'Quetiapina', concentracao: '200mg', forma: 'comprimido', comerciais: ['Seroquel 200mg'] },
  { principio: 'Olanzapina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Zyprexa'] },
  { principio: 'Olanzapina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Zyprexa 10mg'] },
  { principio: 'Risperidona', concentracao: '1mg', forma: 'comprimido', comerciais: ['Risperdal'] },
  { principio: 'Risperidona', concentracao: '2mg', forma: 'comprimido', comerciais: ['Risperdal 2mg'] },
  { principio: 'Haloperidol', concentracao: '1mg', forma: 'comprimido', comerciais: ['Haldol'] },
  { principio: 'Haloperidol', concentracao: '5mg', forma: 'comprimido', comerciais: ['Haldol 5mg'] },
  { principio: 'Carbonato de Lítio', concentracao: '300mg', forma: 'comprimido', comerciais: ['Carbolitium'] },
  { principio: 'Topiramato', concentracao: '25mg', forma: 'comprimido', comerciais: ['Topamax'] },
  { principio: 'Topiramato', concentracao: '50mg', forma: 'comprimido', comerciais: ['Topamax 50mg'] },
  { principio: 'Valproato de Sódio', concentracao: '250mg', forma: 'comprimido', comerciais: ['Depakote'] },
  { principio: 'Valproato de Sódio', concentracao: '500mg', forma: 'comprimido', comerciais: ['Depakote ER'] },
  { principio: 'Carbamazepina', concentracao: '200mg', forma: 'comprimido', comerciais: ['Tegretol'] },
  { principio: 'Carbamazepina', concentracao: '400mg', forma: 'comprimido', comerciais: ['Tegretol 400mg'] },
  { principio: 'Lamotrigina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Lamictal'] },
  { principio: 'Lamotrigina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Lamictal 100mg'] },
  { principio: 'Gabapentina', concentracao: '300mg', forma: 'cápsula', comerciais: ['Neurontin'] },
  { principio: 'Gabapentina', concentracao: '600mg', forma: 'comprimido', comerciais: ['Neurontin 600mg'] },
  { principio: 'Pregabalina', concentracao: '75mg', forma: 'cápsula', comerciais: ['Lyrica'] },
  { principio: 'Pregabalina', concentracao: '150mg', forma: 'cápsula', comerciais: ['Lyrica 150mg'] },
  { principio: 'Pregabalina', concentracao: '300mg', forma: 'cápsula', comerciais: ['Lyrica 300mg'] },
  { principio: 'Donepezila', concentracao: '5mg', forma: 'comprimido', comerciais: ['Aricept'] },
  { principio: 'Donepezila', concentracao: '10mg', forma: 'comprimido', comerciais: ['Aricept 10mg'] },
  { principio: 'Memantina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Ebix', 'Akatinol'] },
  { principio: 'Zolpidem', concentracao: '10mg', forma: 'comprimido', comerciais: ['Stilnox'] },
  { principio: 'Melatonina', concentracao: '3mg', forma: 'comprimido', comerciais: ['Melatonina'] },
  { principio: 'Melatonina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Melatonina 5mg'] },

  // ── TIREOIDЕ ──────────────────────────────────────────────────────────────────
  { principio: 'Levotiroxina Sódica', concentracao: '25mcg', forma: 'comprimido', comerciais: ['Puran T4', 'Levoid'] },
  { principio: 'Levotiroxina Sódica', concentracao: '50mcg', forma: 'comprimido', comerciais: ['Puran T4 50mcg'] },
  { principio: 'Levotiroxina Sódica', concentracao: '75mcg', forma: 'comprimido', comerciais: ['Puran T4 75mcg'] },
  { principio: 'Levotiroxina Sódica', concentracao: '100mcg', forma: 'comprimido', comerciais: ['Puran T4 100mcg'] },
  { principio: 'Levotiroxina Sódica', concentracao: '125mcg', forma: 'comprimido', comerciais: ['Puran T4 125mcg'] },
  { principio: 'Levotiroxina Sódica', concentracao: '150mcg', forma: 'comprimido', comerciais: ['Puran T4 150mcg'] },
  { principio: 'Levotiroxina Sódica', concentracao: '200mcg', forma: 'comprimido', comerciais: ['Puran T4 200mcg'] },
  { principio: 'Propiltiouracil', concentracao: '100mg', forma: 'comprimido', comerciais: ['PTU'] },
  { principio: 'Metimazol (Tiamazol)', concentracao: '5mg', forma: 'comprimido', comerciais: ['Tapazol'] },
  { principio: 'Metimazol (Tiamazol)', concentracao: '10mg', forma: 'comprimido', comerciais: ['Tapazol 10mg'] },
  { principio: 'Iodeto de Potássio', concentracao: '65mg', forma: 'comprimido', comerciais: ['Iodeto de Potássio'] },

  // ── ANTICOAGULANTES / ANTIAGREGANTES ────────────────────────────────────────
  { principio: 'Varfarina', concentracao: '1mg', forma: 'comprimido', comerciais: ['Marevan', 'Coumadin'] },
  { principio: 'Varfarina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Marevan 5mg'] },
  { principio: 'Rivaroxabana', concentracao: '10mg', forma: 'comprimido', comerciais: ['Xarelto'] },
  { principio: 'Rivaroxabana', concentracao: '15mg', forma: 'comprimido', comerciais: ['Xarelto 15mg'] },
  { principio: 'Rivaroxabana', concentracao: '20mg', forma: 'comprimido', comerciais: ['Xarelto 20mg'] },
  { principio: 'Apixabana', concentracao: '2,5mg', forma: 'comprimido', comerciais: ['Eliquis'] },
  { principio: 'Apixabana', concentracao: '5mg', forma: 'comprimido', comerciais: ['Eliquis 5mg'] },
  { principio: 'Dabigatrana', concentracao: '110mg', forma: 'cápsula', comerciais: ['Pradaxa'] },
  { principio: 'Dabigatrana', concentracao: '150mg', forma: 'cápsula', comerciais: ['Pradaxa 150mg'] },
  { principio: 'Clopidogrel', concentracao: '75mg', forma: 'comprimido', comerciais: ['Plavix', 'Plagrel'] },
  { principio: 'Enoxaparina', concentracao: '40mg/0,4ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Clexane'] },
  { principio: 'Enoxaparina', concentracao: '60mg/0,6ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Clexane 60mg'] },
  { principio: 'Enoxaparina', concentracao: '80mg/0,8ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Clexane 80mg'] },

  // ── SUPLEMENTOS / VITAMINAS / MINERAIS ──────────────────────────────────────
  { principio: 'Ácido Fólico', concentracao: '5mg', forma: 'comprimido', comerciais: ['Ácido Fólico', 'Folacin'] },
  { principio: 'Ácido Fólico', concentracao: '0,4mg', forma: 'comprimido', comerciais: ['Ácido Fólico 400mcg'] },
  { principio: 'Ferro Sulfato (Sulfato Ferroso)', concentracao: '40mg', forma: 'comprimido', comerciais: ['Noripurum', 'Sulfato Ferroso'] },
  { principio: 'Ferro Sacarato', concentracao: '100mg/5ml', forma: 'solução injetável', comerciais: ['Noripurum EV'] },
  { principio: 'Vitamina D3 (Colecalciferol)', concentracao: '1.000 UI', forma: 'cápsula', comerciais: ['Vitamina D3 1000 UI'] },
  { principio: 'Vitamina D3 (Colecalciferol)', concentracao: '2.000 UI', forma: 'cápsula', comerciais: ['Vitamina D3 2000 UI'] },
  { principio: 'Vitamina D3 (Colecalciferol)', concentracao: '7.000 UI', forma: 'cápsula', comerciais: ['Vitamina D3 7000 UI'] },
  { principio: 'Vitamina D3 (Colecalciferol)', concentracao: '50.000 UI', forma: 'cápsula', comerciais: ['Vitamina D3 50000 UI'] },
  { principio: 'Carbonato de Cálcio + Vitamina D', concentracao: '1g + 400 UI', forma: 'comprimido', comerciais: ['Caltrate', 'Oscal'] },
  { principio: 'Vitamina B12 (Cianocobalamina)', concentracao: '1.000mcg', forma: 'comprimido sublingual', comerciais: ['Cianocobalamina 1000mcg'] },
  { principio: 'Complexo B', concentracao: '—', forma: 'comprimido', comerciais: ['Complexo B', 'Neurobion'] },
  { principio: 'Zinco', concentracao: '40mg', forma: 'cápsula', comerciais: ['Zinc Plus', 'Zincofer'] },
  { principio: 'Magnésio', concentracao: '300mg', forma: 'cápsula', comerciais: ['Magnésio B6'] },

  // ── UROLOGIA / PRÓSTATA ──────────────────────────────────────────────────────
  { principio: 'Tansulosina', concentracao: '0,4mg', forma: 'cápsula de liberação prolongada', comerciais: ['Urolong', 'Secotex'] },
  { principio: 'Finasterida', concentracao: '5mg', forma: 'comprimido', comerciais: ['Proscar', 'Propecia 5mg'] },
  { principio: 'Finasterida', concentracao: '1mg', forma: 'comprimido', comerciais: ['Propecia'] },
  { principio: 'Dutasterida', concentracao: '0,5mg', forma: 'cápsula', comerciais: ['Avodart'] },
  { principio: 'Sildenafila', concentracao: '25mg', forma: 'comprimido', comerciais: ['Viagra', 'Optim'] },
  { principio: 'Sildenafila', concentracao: '50mg', forma: 'comprimido', comerciais: ['Viagra 50mg'] },
  { principio: 'Sildenafila', concentracao: '100mg', forma: 'comprimido', comerciais: ['Viagra 100mg'] },
  { principio: 'Tadalafila', concentracao: '5mg', forma: 'comprimido', comerciais: ['Cialis'] },
  { principio: 'Tadalafila', concentracao: '20mg', forma: 'comprimido', comerciais: ['Cialis 20mg'] },
  { principio: 'Solifenacina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Vesicare'] },
  { principio: 'Solifenacina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Vesicare 10mg'] },

  // ── GINECOLOGIA / OBSTETRÍCIA ────────────────────────────────────────────────
  { principio: 'Estradiol', concentracao: '1mg', forma: 'comprimido', comerciais: ['Estrofem'] },
  { principio: 'Estradiol + Noretisterona', concentracao: '2mg + 1mg', forma: 'comprimido', comerciais: ['Activelle', 'Kliogest'] },
  { principio: 'Progesterona', concentracao: '100mg', forma: 'cápsula vaginal', comerciais: ['Utrogestan'] },
  { principio: 'Progesterona', concentracao: '200mg', forma: 'cápsula vaginal', comerciais: ['Utrogestan 200mg'] },
  { principio: 'Medroxiprogesterona', concentracao: '2,5mg', forma: 'comprimido', comerciais: ['Provera'] },
  { principio: 'Contraceptivo Oral Combinado (Etinilestradiol + Levonorgestrel)', concentracao: '0,03mg + 0,15mg', forma: 'comprimido', comerciais: ['Microvlar', 'Nordette', 'Levordiol'] },
  { principio: 'Contraceptivo Oral (Etinilestradiol + Gestodeno)', concentracao: '0,03mg + 0,075mg', forma: 'comprimido', comerciais: ['Gynera', 'Femiane'] },
  { principio: 'Contraceptivo Oral (Etinilestradiol + Drospirenona)', concentracao: '0,03mg + 3mg', forma: 'comprimido', comerciais: ['Yaz', 'Angeliq'] },
  { principio: 'Anticoncepção de Emergência (Levonorgestrel)', concentracao: '1,5mg', forma: 'comprimido', comerciais: ['Postinor', 'Plan B'] },

  // ── DOENÇAS REUMÁTICAS / IMUNOLOGIA ─────────────────────────────────────────
  { principio: 'Metotrexato', concentracao: '2,5mg', forma: 'comprimido', comerciais: ['Metotrexato', 'Rheumatrex'] },
  { principio: 'Hidroxicloroquina', concentracao: '400mg', forma: 'comprimido', comerciais: ['Plaquinol', 'Reuquinol'] },
  { principio: 'Leflunomida', concentracao: '20mg', forma: 'comprimido', comerciais: ['Arava'] },
  { principio: 'Azatioprina', concentracao: '50mg', forma: 'comprimido', comerciais: ['Imuran'] },
  { principio: 'Colchicina', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Colchicina'] },
  { principio: 'Alopurinol', concentracao: '100mg', forma: 'comprimido', comerciais: ['Zyloric', 'Lopurin'] },
  { principio: 'Alopurinol', concentracao: '300mg', forma: 'comprimido', comerciais: ['Zyloric 300mg'] },
  { principio: 'Febuxostate', concentracao: '80mg', forma: 'comprimido', comerciais: ['Adenuric'] },
  { principio: 'Ciclosporina', concentracao: '25mg', forma: 'cápsula', comerciais: ['Sandimmun Neoral'] },
  { principio: 'Ciclosporina', concentracao: '100mg', forma: 'cápsula', comerciais: ['Sandimmun Neoral 100mg'] },

  // ── CARDIOVASCULAR ────────────────────────────────────────────────────────────
  { principio: 'Digoxina', concentracao: '0,25mg', forma: 'comprimido', comerciais: ['Lanoxin'] },
  { principio: 'Amiodarona', concentracao: '200mg', forma: 'comprimido', comerciais: ['Atlansil', 'Cordarone'] },
  { principio: 'Isossorbida Mononitrato', concentracao: '20mg', forma: 'comprimido', comerciais: ['Monocordil'] },
  { principio: 'Isossorbida Dinitrato', concentracao: '5mg', forma: 'comprimido sublingual', comerciais: ['Isordil'] },
  { principio: 'Nitroglicerina', concentracao: '0,4mg/dose', forma: 'spray sublingual', comerciais: ['Tridil Spray'] },
  { principio: 'Ivabradina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Procoralan'] },
  { principio: 'Sacubitril + Valsartana', concentracao: '49mg + 51mg', forma: 'comprimido', comerciais: ['Entresto'] },
  { principio: 'Trimetazidina', concentracao: '20mg', forma: 'comprimido', comerciais: ['Vastarel'] },
  { principio: 'Trimetazidina', concentracao: '35mg', forma: 'comprimido de liberação modificada', comerciais: ['Vastarel MR'] },

  // ── DERMATOLOGIA (tópicos comuns) ────────────────────────────────────────────
  { principio: 'Permetrina', concentracao: '5%', forma: 'creme', comerciais: ['Elimite', 'Nix'] },
  { principio: 'Ivermectina', concentracao: '1%', forma: 'loção', comerciais: ['Sklice'] },
  { principio: 'Cetoconazol', concentracao: '2%', forma: 'creme', comerciais: ['Nizoral Creme'] },
  { principio: 'Cetoconazol', concentracao: '2%', forma: 'xampu', comerciais: ['Nizoral Xampu'] },
  { principio: 'Terbinafina', concentracao: '250mg', forma: 'comprimido', comerciais: ['Lamisil'] },
  { principio: 'Terbinafina', concentracao: '1%', forma: 'creme', comerciais: ['Lamisil Creme'] },
  { principio: 'Aciclovir', concentracao: '400mg', forma: 'comprimido', comerciais: ['Zovirax'] },
  { principio: 'Aciclovir', concentracao: '800mg', forma: 'comprimido', comerciais: ['Zovirax 800mg'] },
  { principio: 'Valaciclovir', concentracao: '500mg', forma: 'comprimido', comerciais: ['Valtrex'] },
  { principio: 'Valaciclovir', concentracao: '1g', forma: 'comprimido', comerciais: ['Valtrex 1g'] },
  { principio: 'Isotretinoína', concentracao: '10mg', forma: 'cápsula', comerciais: ['Roacutan', 'Isotrex'] },
  { principio: 'Isotretinoína', concentracao: '20mg', forma: 'cápsula', comerciais: ['Roacutan 20mg'] },
  { principio: 'Doxiciclina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Vibramycin'] },

  // ── OFTALMOLOGIA (colírios comuns) ───────────────────────────────────────────
  { principio: 'Colírio de Tobramicina + Dexametasona', concentracao: '3mg/ml + 1mg/ml', forma: 'colírio', comerciais: ['Tobradex'] },
  { principio: 'Colírio de Cloranfenicol', concentracao: '5mg/ml', forma: 'colírio', comerciais: ['Cloranfenicol Colírio'] },
  { principio: 'Colírio de Ciprofloxacino', concentracao: '3mg/ml', forma: 'colírio', comerciais: ['Ciloxan'] },
  { principio: 'Lágrima Artificial (Carboximetilcelulose)', concentracao: '5mg/ml', forma: 'colírio', comerciais: ['Systane', 'Optive'] },
  { principio: 'Timolol (colírio)', concentracao: '0,5%', forma: 'colírio', comerciais: ['Timoptol'] },
  { principio: 'Brimonidina (colírio)', concentracao: '0,2%', forma: 'colírio', comerciais: ['Alphagan'] },

  // ── OUTROS / MISCELÂNEA ──────────────────────────────────────────────────────
  { principio: 'Ondansetrona', concentracao: '8mg', forma: 'comprimido sublingual', comerciais: ['Vonau Flash'] },
  { principio: 'Dimidrinato', concentracao: '50mg', forma: 'comprimido', comerciais: ['Dramin', 'Bonadoxina'] },
  { principio: 'Escopolamina + Dipirona', concentracao: '6,5mg + 250mg', forma: 'comprimido', comerciais: ['Buscopan Composto'] },
  { principio: 'Escopolamina Butilbrometo', concentracao: '10mg', forma: 'comprimido', comerciais: ['Buscopan'] },
  { principio: 'Escopolamina Butilbrometo', concentracao: '20mg/ml', forma: 'solução injetável', comerciais: ['Buscopan Injetável'] },
  { principio: 'Ácido Ursodesoxicólico', concentracao: '300mg', forma: 'cápsula', comerciais: ['Ursacol'] },
  { principio: 'Silodosina', concentracao: '8mg', forma: 'cápsula', comerciais: ['Urorec'] },
  { principio: 'Betaistina', concentracao: '24mg', forma: 'comprimido', comerciais: ['Betaserc'] },
  { principio: 'Ginkgo Biloba', concentracao: '80mg', forma: 'comprimido', comerciais: ['Tebonin'] },
  { principio: 'Vareniclina', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Champix'] },
  { principio: 'Vareniclina', concentracao: '1mg', forma: 'comprimido', comerciais: ['Champix 1mg'] },
  { principio: 'Bupropiona', concentracao: '150mg', forma: 'comprimido de liberação prolongada', comerciais: ['Zyban', 'Wellbutrin XL'] },
  { principio: 'Naltrexona', concentracao: '50mg', forma: 'comprimido', comerciais: ['Revia'] },
  { principio: 'Soro Fisiológico (NaCl 0,9%)', concentracao: '0,9%', forma: 'solução para inalação', comerciais: ['Soro Fisiológico 0,9%'] },

  // ── PEDIATRIA (doses pediátricas) ────────────────────────────────────────────
  { principio: 'Amoxicilina', concentracao: '125mg/5ml', forma: 'pó para suspensão oral (pediátrico)', comerciais: ['Amoxil Pediátrico 125mg'] },
  { principio: 'Amoxicilina + Clavulanato', concentracao: '200mg + 28,5mg/5ml', forma: 'pó para suspensão oral (pediátrico)', comerciais: ['Clavulin Pediátrico BD'] },
  { principio: 'Cefalexina', concentracao: '125mg/5ml', forma: 'pó para suspensão oral (pediátrico)', comerciais: ['Keflex Infantil'] },
  { principio: 'Paracetamol', concentracao: '100mg/ml', forma: 'solução oral (gotas pediátrica)', comerciais: ['Tylenol Bebê 100mg/ml'] },
  { principio: 'Ibuprofeno', concentracao: '50mg/ml', forma: 'solução oral (gotas pediátrica)', comerciais: ['Alivium Gotas', 'Advil Gotas'] },
  { principio: 'Nistatina', concentracao: '100.000 UI/ml', forma: 'suspensão oral', comerciais: ['Mycostatin Suspensão', 'Nistatina Suspensão'] },
  { principio: 'Nistatina', concentracao: '100.000 UI/g', forma: 'creme', comerciais: ['Mycostatin Creme', 'Nistatina Creme'] },
  { principio: 'Polivitamínico', concentracao: '—', forma: 'solução oral (gotas)', comerciais: ['Polivitamínico Gotas', 'Tri-Vi-Sol', 'Multiton'] },
  { principio: 'Vitamina D3 (Colecalciferol)', concentracao: '200 UI/ml', forma: 'solução oral (gotas pediátrica)', comerciais: ['Addera D3 Gotas', 'Vitamina D3 Gotas'] },
  { principio: 'Sulfato Ferroso', concentracao: '25mg/ml', forma: 'solução oral (gotas)', comerciais: ['Sulfato Ferroso Gotas', 'Noripurum Oral'] },
  { principio: 'Montelucaste', concentracao: '4mg', forma: 'comprimido mastigável (pediátrico 2-5 anos)', comerciais: ['Singulair Baby 4mg'] },
  { principio: 'Budesonida', concentracao: '0,25mg/2ml', forma: 'solução para nebulização', comerciais: ['Pulmicort Nebules 0,25mg'] },
  { principio: 'Budesonida', concentracao: '0,5mg/2ml', forma: 'solução para nebulização', comerciais: ['Pulmicort Nebules 0,5mg'] },
  { principio: 'Salbutamol', concentracao: '0,4mg/ml', forma: 'solução para nebulização', comerciais: ['Aerolin Nebules'] },
  { principio: 'Fenobarbital', concentracao: '40mg/ml', forma: 'solução oral (gotas)', comerciais: ['Gardenal Gotas'] },
  { principio: 'Fenobarbital', concentracao: '100mg', forma: 'comprimido', comerciais: ['Gardenal 100mg'] },
  { principio: 'Carbamazepina', concentracao: '20mg/ml', forma: 'suspensão oral', comerciais: ['Tegretol Suspensão'] },
  { principio: 'Ácido Valproico', concentracao: '50mg/ml', forma: 'xarope', comerciais: ['Depakene Xarope'] },
  { principio: 'Hidróxido de Alumínio + Hidróxido de Magnésio', concentracao: '300mg + 200mg/5ml', forma: 'suspensão oral', comerciais: ['Mylanta Plus', 'Maalox Suspensão'] },
  { principio: 'Clotrimazol', concentracao: '1%', forma: 'creme', comerciais: ['Canesten Creme', 'Lotrimin'] },
  { principio: 'Salbutamol', concentracao: '2mg/5ml', forma: 'xarope', comerciais: ['Aerolin Xarope'] },
  { principio: 'Carbocisteína', concentracao: '50mg/ml', forma: 'xarope (pediátrico)', comerciais: ['Rhinathiol Pediátrico'] },
  { principio: 'Cetirizina', concentracao: '5mg/5ml', forma: 'xarope', comerciais: ['Zyrtec Xarope'] },

  // ── NEUROLOGIA (Parkinson / Enxaqueca / Espasticidade) ───────────────────────
  { principio: 'Levodopa + Carbidopa', concentracao: '100mg + 25mg', forma: 'comprimido', comerciais: ['Sinemet 100/25', 'Prolopa 100/25'] },
  { principio: 'Levodopa + Carbidopa', concentracao: '250mg + 25mg', forma: 'comprimido', comerciais: ['Sinemet 250/25'] },
  { principio: 'Levodopa + Carbidopa', concentracao: '100mg + 25mg', forma: 'comprimido de liberação controlada', comerciais: ['Sinemet CR'] },
  { principio: 'Levodopa + Benserazida', concentracao: '100mg + 25mg', forma: 'cápsula', comerciais: ['Prolopa 100/25 (Roche)'] },
  { principio: 'Levodopa + Benserazida', concentracao: '200mg + 50mg', forma: 'cápsula', comerciais: ['Prolopa 200/50'] },
  { principio: 'Pramipexol', concentracao: '0,125mg', forma: 'comprimido', comerciais: ['Mirapex', 'Sifrol 0,125mg'] },
  { principio: 'Pramipexol', concentracao: '0,5mg', forma: 'comprimido', comerciais: ['Sifrol 0,5mg', 'Mirapex 0,5mg'] },
  { principio: 'Pramipexol', concentracao: '1mg', forma: 'comprimido', comerciais: ['Sifrol 1mg'] },
  { principio: 'Pramipexol', concentracao: '1,5mg', forma: 'comprimido de liberação prolongada', comerciais: ['Sifrol ER 1,5mg'] },
  { principio: 'Ropinirol', concentracao: '0,25mg', forma: 'comprimido', comerciais: ['Requip 0,25mg'] },
  { principio: 'Ropinirol', concentracao: '1mg', forma: 'comprimido', comerciais: ['Requip 1mg'] },
  { principio: 'Ropinirol', concentracao: '2mg', forma: 'comprimido', comerciais: ['Requip 2mg'] },
  { principio: 'Selegilina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Jumex', 'Eldepryl'] },
  { principio: 'Rasagilina', concentracao: '1mg', forma: 'comprimido', comerciais: ['Azilect'] },
  { principio: 'Entacapona', concentracao: '200mg', forma: 'comprimido', comerciais: ['Comtan'] },
  { principio: 'Sumatriptana', concentracao: '50mg', forma: 'comprimido', comerciais: ['Imigran 50mg', 'Sumax 50mg'] },
  { principio: 'Sumatriptana', concentracao: '100mg', forma: 'comprimido', comerciais: ['Imigran 100mg'] },
  { principio: 'Sumatriptana', concentracao: '20mg/dose', forma: 'spray nasal', comerciais: ['Imigran Nasal'] },
  { principio: 'Rizatriptana', concentracao: '10mg', forma: 'comprimido', comerciais: ['Maxalt 10mg'] },
  { principio: 'Rizatriptana', concentracao: '10mg', forma: 'comprimido bucodispersível', comerciais: ['Maxalt RPD'] },
  { principio: 'Eletriptana', concentracao: '40mg', forma: 'comprimido', comerciais: ['Relpax'] },
  { principio: 'Zolmitriptana', concentracao: '2,5mg', forma: 'comprimido', comerciais: ['Zomig'] },
  { principio: 'Ergotamina + Cafeína', concentracao: '1mg + 100mg', forma: 'comprimido', comerciais: ['Cafergot'] },
  { principio: 'Flunarizina', concentracao: '5mg', forma: 'cápsula', comerciais: ['Sibelium', 'Flunarizina'] },
  { principio: 'Propranolol', concentracao: '10mg', forma: 'comprimido', comerciais: ['Inderal 10mg'] },
  { principio: 'Propranolol', concentracao: '40mg', forma: 'comprimido', comerciais: ['Inderal 40mg'] },
  { principio: 'Baclofeno', concentracao: '10mg', forma: 'comprimido', comerciais: ['Lioresal'] },
  { principio: 'Baclofeno', concentracao: '25mg', forma: 'comprimido', comerciais: ['Lioresal 25mg'] },
  { principio: 'Tizanidina', concentracao: '2mg', forma: 'comprimido', comerciais: ['Sirdalud 2mg'] },
  { principio: 'Tizanidina', concentracao: '4mg', forma: 'comprimido', comerciais: ['Sirdalud 4mg'] },
  { principio: 'Fenitoína', concentracao: '100mg', forma: 'comprimido', comerciais: ['Hidantal', 'Epelin 100mg'] },
  { principio: 'Fenitoína', concentracao: '50mg', forma: 'comprimido mastigável', comerciais: ['Hidantal Infantil'] },
  { principio: 'Levetiracetam', concentracao: '500mg', forma: 'comprimido', comerciais: ['Keppra 500mg'] },
  { principio: 'Levetiracetam', concentracao: '1g', forma: 'comprimido', comerciais: ['Keppra 1g'] },
  { principio: 'Oxcarbazepina', concentracao: '300mg', forma: 'comprimido', comerciais: ['Trileptal 300mg'] },
  { principio: 'Oxcarbazepina', concentracao: '600mg', forma: 'comprimido', comerciais: ['Trileptal 600mg'] },
  { principio: 'Rivastigmina', concentracao: '1,5mg', forma: 'cápsula', comerciais: ['Exelon 1,5mg'] },
  { principio: 'Rivastigmina', concentracao: '3mg', forma: 'cápsula', comerciais: ['Exelon 3mg'] },
  { principio: 'Rivastigmina', concentracao: '4,6mg/24h', forma: 'adesivo transdérmico', comerciais: ['Exelon Patch 5'] },
  { principio: 'Rivastigmina', concentracao: '9,5mg/24h', forma: 'adesivo transdérmico', comerciais: ['Exelon Patch 10'] },
  { principio: 'Galantamina', concentracao: '8mg', forma: 'cápsula de liberação prolongada', comerciais: ['Reminyl ER 8mg'] },
  { principio: 'Galantamina', concentracao: '16mg', forma: 'cápsula de liberação prolongada', comerciais: ['Reminyl ER 16mg'] },
  { principio: 'Piracetam', concentracao: '800mg', forma: 'comprimido', comerciais: ['Nootropil 800mg'] },
  { principio: 'Piracetam', concentracao: '1,2g', forma: 'comprimido', comerciais: ['Nootropil 1200mg'] },

  // ── OTORRINOLARINGOLOGIA ──────────────────────────────────────────────────────
  { principio: 'Budesonida', concentracao: '64mcg/dose', forma: 'spray nasal', comerciais: ['Rhinocort Aqua', 'Budecort Aqua'] },
  { principio: 'Fluticasona Furoato', concentracao: '27,5mcg/dose', forma: 'spray nasal', comerciais: ['Avamys'] },
  { principio: 'Fluticasona Propionato', concentracao: '50mcg/dose', forma: 'spray nasal', comerciais: ['Flixonase'] },
  { principio: 'Mometasona Furoato', concentracao: '50mcg/dose', forma: 'spray nasal', comerciais: ['Nasonex', 'Mometasona Spray'] },
  { principio: 'Beclometasona', concentracao: '50mcg/dose', forma: 'spray nasal', comerciais: ['Beclosol Aquoso', 'Beconase AQ'] },
  { principio: 'Azelastina', concentracao: '137mcg/dose', forma: 'spray nasal', comerciais: ['Allergodil Nasal'] },
  { principio: 'Xilometazolina', concentracao: '0,1%', forma: 'spray nasal (adultos)', comerciais: ['Otrivin Adulto', 'Sorine Adulto'] },
  { principio: 'Xilometazolina', concentracao: '0,05%', forma: 'spray nasal (pediátrico)', comerciais: ['Otrivin Pediátrico'] },
  { principio: 'Oximetazolina', concentracao: '0,05%', forma: 'spray nasal', comerciais: ['Afrin', 'Nesofen'] },
  { principio: 'Nafazolina', concentracao: '0,05%', forma: 'spray nasal', comerciais: ['Sorine 0,05%', 'Nafazolina Spray'] },
  { principio: 'Ciprofloxacino', concentracao: '3mg/ml', forma: 'solução otológica', comerciais: ['Ciloxan Otológico', 'Ciprodex'] },
  { principio: 'Ofloxacino', concentracao: '3mg/ml', forma: 'solução otológica', comerciais: ['Floxin Otológico'] },
  { principio: 'Neomicina + Polimixina B + Hidrocortisona', concentracao: '—', forma: 'solução otológica', comerciais: ['Otosporin', 'Otosynalar'] },
  { principio: 'Fenazona + Benzocaína', concentracao: '—', forma: 'solução otológica (anestésica)', comerciais: ['Otalgine', 'Auralgan'] },
  { principio: 'Solução Fisiológica Nasal', concentracao: '0,9%', forma: 'spray nasal', comerciais: ['Soro Nasal 0,9%', 'Naso-X', 'Fisiomar'] },
  { principio: 'Solução Hipertônica Nasal', concentracao: '2,7%', forma: 'spray nasal', comerciais: ['Sterimar Hipertônico', 'HipoNasal'] },
  { principio: 'Carbocisteína', concentracao: '250mg/5ml', forma: 'xarope', comerciais: ['Rhinathiol Xarope', 'Fluifort Xarope'] },
  { principio: 'Carbocisteína', concentracao: '500mg', forma: 'comprimido', comerciais: ['Rhinathiol 500mg'] },
  { principio: 'Guaifenesina', concentracao: '100mg/5ml', forma: 'xarope', comerciais: ['Vick Mel e Limão', 'Robitussin Expectorante'] },

  // ── INFECTOLOGIA AVANÇADA (Antivirais / Tuberculose / Parasitoses) ────────────
  { principio: 'Oseltamivir', concentracao: '75mg', forma: 'cápsula', comerciais: ['Tamiflu 75mg'] },
  { principio: 'Oseltamivir', concentracao: '12mg/ml', forma: 'pó para suspensão oral', comerciais: ['Tamiflu Suspensão'] },
  { principio: 'Rifampicina', concentracao: '300mg', forma: 'cápsula', comerciais: ['Rifampicina', 'Rifaldin 300mg'] },
  { principio: 'Rifampicina', concentracao: '150mg/5ml', forma: 'suspensão oral', comerciais: ['Rifampicina Suspensão'] },
  { principio: 'Isoniazida', concentracao: '100mg', forma: 'comprimido', comerciais: ['Isoniazida 100mg', 'INH 100mg'] },
  { principio: 'Isoniazida', concentracao: '300mg', forma: 'comprimido', comerciais: ['Isoniazida 300mg'] },
  { principio: 'Pirazinamida', concentracao: '500mg', forma: 'comprimido', comerciais: ['Pirazinamida 500mg'] },
  { principio: 'Etambutol', concentracao: '400mg', forma: 'comprimido', comerciais: ['Myambutol', 'Etambutol 400mg'] },
  { principio: 'RHZE (Rifampicina + Isoniazida + Pirazinamida + Etambutol)', concentracao: '150mg+75mg+400mg+275mg', forma: 'comprimido (dose fixa combinada — fase intensiva TB)', comerciais: ['RHZE — Esquema MS'] },
  { principio: 'RH (Rifampicina + Isoniazida)', concentracao: '300mg + 150mg', forma: 'comprimido (dose fixa — fase manutenção TB)', comerciais: ['RH — Manutenção TB MS'] },
  { principio: 'Nitazoxanida', concentracao: '500mg', forma: 'comprimido', comerciais: ['Annita 500mg', 'Alinia'] },
  { principio: 'Nitazoxanida', concentracao: '100mg/5ml', forma: 'suspensão oral', comerciais: ['Annita Suspensão Pediátrica'] },
  { principio: 'Cloroquina', concentracao: '150mg base (250mg fosfato)', forma: 'comprimido', comerciais: ['Cloroquina', 'Aralen'] },
  { principio: 'Primaquina', concentracao: '15mg base', forma: 'comprimido', comerciais: ['Primaquina'] },
  { principio: 'Quinina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Sulfato de Quinina'] },
  { principio: 'Ampicilina', concentracao: '500mg', forma: 'cápsula', comerciais: ['Binotal 500mg', 'Ampicilina 500mg'] },
  { principio: 'Ampicilina', concentracao: '250mg/5ml', forma: 'pó para suspensão oral', comerciais: ['Binotal Suspensão'] },
  { principio: 'Ceftriaxona', concentracao: '1g', forma: 'pó para solução injetável', comerciais: ['Rocefin 1g', 'Ceftriaxona 1g'] },
  { principio: 'Ceftriaxona', concentracao: '500mg', forma: 'pó para solução injetável', comerciais: ['Rocefin 500mg'] },
  { principio: 'Griseofulvina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Grisactin', 'Fulvicin 500mg'] },
  { principio: 'Voriconazol', concentracao: '200mg', forma: 'comprimido', comerciais: ['Vfend 200mg'] },
  { principio: 'Posaconazol', concentracao: '100mg', forma: 'comprimido', comerciais: ['Noxafil 100mg'] },
  { principio: 'Valganciclovir', concentracao: '450mg', forma: 'comprimido', comerciais: ['Valcyte 450mg'] },
  { principio: 'Dolutegravir', concentracao: '50mg', forma: 'comprimido', comerciais: ['Tivicay 50mg'] },
  { principio: 'Tenofovir + Lamivudina + Dolutegravir', concentracao: '300mg + 300mg + 50mg', forma: 'comprimido (1ª linha HIV)', comerciais: ['TLD — Esquema ARV 1ª linha (RENAME)'] },
  { principio: 'Lamivudina', concentracao: '150mg', forma: 'comprimido', comerciais: ['Epivir', '3TC 150mg'] },
  { principio: 'Tenofovir Disoproxila', concentracao: '300mg', forma: 'comprimido', comerciais: ['Viread', 'TDF 300mg'] },

  // ── PSIQUIATRIA — TDAH ────────────────────────────────────────────────────────
  { principio: 'Metilfenidato', concentracao: '10mg', forma: 'comprimido', comerciais: ['Ritalina 10mg'] },
  { principio: 'Metilfenidato', concentracao: '20mg', forma: 'comprimido', comerciais: ['Ritalina 20mg'] },
  { principio: 'Metilfenidato', concentracao: '18mg', forma: 'comprimido de liberação controlada', comerciais: ['Concerta 18mg', 'Ritalina LA 18mg'] },
  { principio: 'Metilfenidato', concentracao: '27mg', forma: 'comprimido de liberação controlada', comerciais: ['Concerta 27mg'] },
  { principio: 'Metilfenidato', concentracao: '36mg', forma: 'comprimido de liberação controlada', comerciais: ['Concerta 36mg', 'Ritalina LA 36mg'] },
  { principio: 'Metilfenidato', concentracao: '54mg', forma: 'comprimido de liberação controlada', comerciais: ['Concerta 54mg'] },
  { principio: 'Lisdexanfetamina', concentracao: '20mg', forma: 'cápsula', comerciais: ['Venvanse 20mg'] },
  { principio: 'Lisdexanfetamina', concentracao: '30mg', forma: 'cápsula', comerciais: ['Venvanse 30mg'] },
  { principio: 'Lisdexanfetamina', concentracao: '40mg', forma: 'cápsula', comerciais: ['Venvanse 40mg'] },
  { principio: 'Lisdexanfetamina', concentracao: '50mg', forma: 'cápsula', comerciais: ['Venvanse 50mg'] },
  { principio: 'Lisdexanfetamina', concentracao: '60mg', forma: 'cápsula', comerciais: ['Venvanse 60mg'] },
  { principio: 'Lisdexanfetamina', concentracao: '70mg', forma: 'cápsula', comerciais: ['Venvanse 70mg'] },
  { principio: 'Atomoxetina', concentracao: '10mg', forma: 'cápsula', comerciais: ['Strattera 10mg'] },
  { principio: 'Atomoxetina', concentracao: '18mg', forma: 'cápsula', comerciais: ['Strattera 18mg'] },
  { principio: 'Atomoxetina', concentracao: '25mg', forma: 'cápsula', comerciais: ['Strattera 25mg'] },
  { principio: 'Atomoxetina', concentracao: '40mg', forma: 'cápsula', comerciais: ['Strattera 40mg'] },
  { principio: 'Atomoxetina', concentracao: '60mg', forma: 'cápsula', comerciais: ['Strattera 60mg'] },
  { principio: 'Aripiprazol', concentracao: '10mg', forma: 'comprimido', comerciais: ['Abilify 10mg', 'Aristab 10mg'] },
  { principio: 'Aripiprazol', concentracao: '15mg', forma: 'comprimido', comerciais: ['Abilify 15mg'] },
  { principio: 'Aripiprazol', concentracao: '30mg', forma: 'comprimido', comerciais: ['Abilify 30mg'] },
  { principio: 'Aripiprazol', concentracao: '1mg/ml', forma: 'solução oral', comerciais: ['Abilify Oral'] },
  { principio: 'Ziprasidona', concentracao: '20mg', forma: 'cápsula', comerciais: ['Geodon 20mg', 'Zeldox 20mg'] },
  { principio: 'Ziprasidona', concentracao: '40mg', forma: 'cápsula', comerciais: ['Geodon 40mg'] },
  { principio: 'Ziprasidona', concentracao: '80mg', forma: 'cápsula', comerciais: ['Geodon 80mg'] },
  { principio: 'Paliperidona', concentracao: '3mg', forma: 'comprimido de liberação prolongada', comerciais: ['Invega 3mg'] },
  { principio: 'Paliperidona', concentracao: '6mg', forma: 'comprimido de liberação prolongada', comerciais: ['Invega 6mg'] },
  { principio: 'Clozapina', concentracao: '25mg', forma: 'comprimido', comerciais: ['Leponex 25mg', 'Clozapina 25mg'] },
  { principio: 'Clozapina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Leponex 100mg'] },
  { principio: 'Fluvoxamina', concentracao: '50mg', forma: 'comprimido', comerciais: ['Luvox 50mg'] },
  { principio: 'Fluvoxamina', concentracao: '100mg', forma: 'comprimido', comerciais: ['Luvox 100mg'] },
  { principio: 'Mirtazapina', concentracao: '15mg', forma: 'comprimido', comerciais: ['Remeron 15mg', 'Mirtaz 15mg'] },
  { principio: 'Mirtazapina', concentracao: '30mg', forma: 'comprimido', comerciais: ['Remeron 30mg'] },
  { principio: 'Bupropiona', concentracao: '300mg', forma: 'comprimido de liberação prolongada', comerciais: ['Wellbutrin XL 300mg', 'Bup 300mg'] },
  { principio: 'Carbonato de Lítio', concentracao: '150mg', forma: 'cápsula', comerciais: ['Carbolitium 150mg'] },
  { principio: 'Carbonato de Lítio', concentracao: '450mg', forma: 'comprimido de liberação controlada', comerciais: ['Carbolitium CR 450mg'] },

  // ── ONCOLOGIA — SUPORTE ───────────────────────────────────────────────────────
  { principio: 'Granisetrona', concentracao: '1mg', forma: 'comprimido', comerciais: ['Kytril 1mg'] },
  { principio: 'Granisetrona', concentracao: '1mg/ml', forma: 'solução injetável', comerciais: ['Kytril Injetável'] },
  { principio: 'Aprepitanto', concentracao: '80mg', forma: 'cápsula', comerciais: ['Emend 80mg'] },
  { principio: 'Aprepitanto', concentracao: '125mg', forma: 'cápsula', comerciais: ['Emend 125mg (dose inicial)'] },
  { principio: 'Tamoxifeno', concentracao: '20mg', forma: 'comprimido', comerciais: ['Nolvadex 20mg', 'Tamoxifeno 20mg'] },
  { principio: 'Letrozol', concentracao: '2,5mg', forma: 'comprimido', comerciais: ['Femara 2,5mg', 'Letrozol 2,5mg'] },
  { principio: 'Anastrozol', concentracao: '1mg', forma: 'comprimido', comerciais: ['Arimidex 1mg', 'Anastrozol 1mg'] },
  { principio: 'Exemestano', concentracao: '25mg', forma: 'comprimido', comerciais: ['Aromasin 25mg'] },
  { principio: 'Capecitabina', concentracao: '500mg', forma: 'comprimido', comerciais: ['Xeloda 500mg'] },
  { principio: 'Megestrol', concentracao: '160mg', forma: 'comprimido', comerciais: ['Megace 160mg'] },
  { principio: 'Leucovorina Cálcica (Ácido Folínico)', concentracao: '25mg', forma: 'comprimido', comerciais: ['Leucovorin 25mg', 'Ácido Folínico 25mg'] },
  { principio: 'Ácido Zolendrônico', concentracao: '4mg/5ml', forma: 'concentrado para solução para infusão', comerciais: ['Zometa 4mg'] },
  { principio: 'Denosumabe', concentracao: '120mg/1,7ml', forma: 'solução injetável (metástases ósseas)', comerciais: ['Xgeva 120mg'] },
  { principio: 'Filgrastim (G-CSF)', concentracao: '300mcg/ml', forma: 'solução injetável', comerciais: ['Neupogen', 'Granulokine'] },
  { principio: 'Ácido Tranexâmico', concentracao: '500mg', forma: 'comprimido', comerciais: ['Transamin 500mg', 'Hemoblock 500mg'] },
  { principio: 'Ácido Tranexâmico', concentracao: '100mg/ml', forma: 'solução injetável', comerciais: ['Transamin Injetável'] },

  // ── RELAXANTES MUSCULARES / ORTOPEDIA ────────────────────────────────────────
  { principio: 'Ciclobenzaprina', concentracao: '5mg', forma: 'comprimido', comerciais: ['Miosan 5mg', 'Flexeril 5mg'] },
  { principio: 'Ciclobenzaprina', concentracao: '10mg', forma: 'comprimido', comerciais: ['Miosan 10mg', 'Flexeril 10mg'] },
  { principio: 'Carisoprodol', concentracao: '350mg', forma: 'comprimido', comerciais: ['Soma 350mg'] },
  { principio: 'Carisoprodol + Diclofenaco + Cafeína + Paracetamol', concentracao: '125mg + 50mg + 30mg + 300mg', forma: 'comprimido', comerciais: ['Tandrilax', 'Dorflex Duo'] },
  { principio: 'Orfenadrina', concentracao: '35mg', forma: 'comprimido', comerciais: ['Norgesic 35mg'] },
  { principio: 'Orfenadrina + AAS + Cafeína', concentracao: '35mg + 385mg + 30mg', forma: 'comprimido', comerciais: ['Norgesic Forte'] },
  { principio: 'Metocarbamol', concentracao: '750mg', forma: 'comprimido', comerciais: ['Robaxin 750mg'] },
  { principio: 'Clorzoxazona', concentracao: '250mg', forma: 'comprimido', comerciais: ['Paraflex 250mg'] },
  { principio: 'Clorzoxazona + Paracetamol', concentracao: '250mg + 300mg', forma: 'comprimido', comerciais: ['Paraflex Plus'] },
  { principio: 'Dantrolene Sódico', concentracao: '25mg', forma: 'cápsula', comerciais: ['Dantrium 25mg'] },
  { principio: 'Cetoprofeno', concentracao: '2,5%', forma: 'gel', comerciais: ['Profenid Gel', 'Ketoflex Gel'] },
  { principio: 'Diclofenaco Dietilamônio', concentracao: '1%', forma: 'gel', comerciais: ['Voltaren Emulgel 1%'] },
  { principio: 'Ibuprofeno', concentracao: '5%', forma: 'gel tópico', comerciais: ['Advil Gel', 'Doril Gel'] },

  // ── DERMATOLOGIA (tópicos completos) ─────────────────────────────────────────
  { principio: 'Tretinoína', concentracao: '0,025%', forma: 'creme', comerciais: ['Vitacid 0,025%', 'Retin-A 0,025%'] },
  { principio: 'Tretinoína', concentracao: '0,05%', forma: 'creme', comerciais: ['Vitacid 0,05%', 'Retin-A 0,05%'] },
  { principio: 'Tretinoína', concentracao: '0,1%', forma: 'creme/gel', comerciais: ['Vitacid 0,1%', 'Retin-A 0,1%'] },
  { principio: 'Adapaleno', concentracao: '0,1%', forma: 'gel', comerciais: ['Differin 0,1%'] },
  { principio: 'Adapaleno', concentracao: '0,3%', forma: 'gel', comerciais: ['Differin 0,3%'] },
  { principio: 'Benzoil Peróxido', concentracao: '5%', forma: 'gel', comerciais: ['Benzac 5%', 'BenzaGel 5%'] },
  { principio: 'Benzoil Peróxido', concentracao: '10%', forma: 'gel', comerciais: ['Benzac 10%'] },
  { principio: 'Adapaleno + Benzoil Peróxido', concentracao: '0,1% + 2,5%', forma: 'gel', comerciais: ['Epiduo'] },
  { principio: 'Clindamicina', concentracao: '1%', forma: 'gel tópico', comerciais: ['Cleocin T Gel', 'Clindoxyl Gel'] },
  { principio: 'Eritromicina', concentracao: '2%', forma: 'gel tópico', comerciais: ['Eritrogel 2%', 'Ery-Tab Gel'] },
  { principio: 'Metronidazol', concentracao: '0,75%', forma: 'gel tópico (rosácea)', comerciais: ['Metrogel 0,75%', 'Rozex 0,75%'] },
  { principio: 'Ácido Azelaico', concentracao: '15%', forma: 'gel', comerciais: ['Finacea 15%'] },
  { principio: 'Ácido Azelaico', concentracao: '20%', forma: 'creme', comerciais: ['Azelan 20%', 'Skinoren 20%'] },
  { principio: 'Mupirocina', concentracao: '2%', forma: 'pomada', comerciais: ['Bactroban 2%', 'Mupirocina 2%'] },
  { principio: 'Ácido Fusídico', concentracao: '2%', forma: 'creme', comerciais: ['Fucidin Creme 2%'] },
  { principio: 'Tacrolimus', concentracao: '0,03%', forma: 'pomada (pediátrico)', comerciais: ['Protopic 0,03%'] },
  { principio: 'Tacrolimus', concentracao: '0,1%', forma: 'pomada (adulto)', comerciais: ['Protopic 0,1%'] },
  { principio: 'Pimecrolimus', concentracao: '1%', forma: 'creme', comerciais: ['Elidel 1%'] },
  { principio: 'Hidrocortisona', concentracao: '1%', forma: 'creme', comerciais: ['Cortaid 1%', 'Hytone 1%'] },
  { principio: 'Desonida', concentracao: '0,05%', forma: 'creme/loção', comerciais: ['DesOwen 0,05%', 'Tridesilon'] },
  { principio: 'Betametasona Dipropionato', concentracao: '0,05%', forma: 'creme', comerciais: ['Diprosone Creme', 'Betnovate N'] },
  { principio: 'Betametasona Valerato', concentracao: '0,1%', forma: 'creme/loção', comerciais: ['Betnovate 0,1%'] },
  { principio: 'Clobetasol Propionato', concentracao: '0,05%', forma: 'creme/pomada/loção', comerciais: ['Temovate', 'Psorex 0,05%'] },
  { principio: 'Mometasona Furoato', concentracao: '0,1%', forma: 'creme/loção', comerciais: ['Elocon 0,1%'] },
  { principio: 'Triamcinolona Acetonida', concentracao: '0,1%', forma: 'creme', comerciais: ['Omcilon-A 0,1%', 'Kenalog Creme'] },
  { principio: 'Minoxidil', concentracao: '5%', forma: 'solução/espuma tópica', comerciais: ['Regaine 5%', 'Loniten 5%'] },
  { principio: 'Minoxidil', concentracao: '2%', forma: 'solução tópica (feminino)', comerciais: ['Regaine 2%'] },
  { principio: 'Ácido Salicílico', concentracao: '2%', forma: 'loção/gel tópico', comerciais: ['Stridex', 'Sal-Ac Gel'] },
  { principio: 'Ureia', concentracao: '10%', forma: 'creme hidratante', comerciais: ['Ureadin 10', 'Eucerin Ureia 10%'] },
  { principio: 'Ureia', concentracao: '40%', forma: 'creme queratolítico', comerciais: ['Ureadin Rx 40', 'Eucerin 40%'] },
  { principio: 'Calcipotriol', concentracao: '50mcg/g', forma: 'solução capilar/creme (psoríase)', comerciais: ['Daivonex', 'Dovonex'] },
  { principio: 'Calcipotriol + Betametasona', concentracao: '50mcg/g + 0,5mg/g', forma: 'gel/pomada', comerciais: ['Daivobet', 'Taclonex'] },
  { principio: 'Coaltar', concentracao: '1%', forma: 'xampu (psoríase/dermatite seborreica)', comerciais: ['Alphosyl', 'Polytar'] },
  { principio: 'Piritionato de Zinco', concentracao: '1%', forma: 'xampu', comerciais: ['Nizodon Xampu', 'DHS Zinc'] },
  { principio: 'Seleneto de Enxofre', concentracao: '2,5%', forma: 'xampu', comerciais: ['Selsun 2,5%'] },
  { principio: 'Ciclopirox', concentracao: '1%', forma: 'xampu/creme', comerciais: ['Loprox', 'Ciclopoli'] },
  { principio: 'Econazol', concentracao: '1%', forma: 'creme', comerciais: ['Econazol Creme 1%', 'Spectazole'] },
  { principio: 'Miconazol', concentracao: '2%', forma: 'creme/pó', comerciais: ['Daktarin 2%', 'Micatin'] },
  { principio: 'Naftifina', concentracao: '1%', forma: 'creme/gel', comerciais: ['Naftin 1%'] },
  { principio: 'Hidroquinona', concentracao: '4%', forma: 'creme (hiperpigmentação)', comerciais: ['Tri-Luma', 'Esoterica 4%'] },
  { principio: 'Imiquimod', concentracao: '5%', forma: 'creme', comerciais: ['Aldara 5%', 'Zyclara'] },
  { principio: 'Podofilotoxina', concentracao: '0,5%', forma: 'solução/gel (condiloma)', comerciais: ['Wartec 0,5%', 'Condylox'] },

  // ── HEMATOLOGIA / ONCOHEMATOLOGIA ────────────────────────────────────────────
  { principio: 'Eritropoetina Alfa', concentracao: '4.000 UI/0,4ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Eprex 4000', 'Eritromax 4000'] },
  { principio: 'Eritropoetina Alfa', concentracao: '10.000 UI/1ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Eprex 10000'] },
  { principio: 'Darbepoetina Alfa', concentracao: '40mcg/0,4ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Aranesp 40mcg'] },
  { principio: 'Darbepoetina Alfa', concentracao: '150mcg/0,3ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Aranesp 150mcg'] },
  { principio: 'Hidroxiureia', concentracao: '500mg', forma: 'cápsula', comerciais: ['Hydrea 500mg', 'Hidroxiureia 500mg'] },
  { principio: 'Deferasirox', concentracao: '250mg', forma: 'comprimido dispersível (quelação de ferro)', comerciais: ['Exjade 250mg'] },
  { principio: 'Deferasirox', concentracao: '500mg', forma: 'comprimido dispersível', comerciais: ['Exjade 500mg'] },
  { principio: 'Fitomenadiona (Vitamina K1)', concentracao: '10mg/ml', forma: 'solução injetável', comerciais: ['Kanakion 10mg/ml'] },
  { principio: 'Fitomenadiona (Vitamina K1)', concentracao: '10mg', forma: 'comprimido', comerciais: ['Kanakion Oral'] },
  { principio: 'Desmopressina (DDAVP)', concentracao: '0,1mg', forma: 'comprimido', comerciais: ['Minirin 0,1mg'] },
  { principio: 'Desmopressina (DDAVP)', concentracao: '0,2mg', forma: 'comprimido', comerciais: ['Minirin 0,2mg'] },

  // ── REUMATOLOGIA — BIOLÓGICOS / JAK INIBIDORES ───────────────────────────────
  { principio: 'Metotrexato', concentracao: '25mg/ml', forma: 'solução injetável subcutânea', comerciais: ['Metotrexato SC', 'Methodject 25mg/ml'] },
  { principio: 'Certolizumabe Pegol', concentracao: '200mg/ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Cimzia 200mg'] },
  { principio: 'Adalimumabe', concentracao: '40mg/0,8ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Humira 40mg', 'Adalimumabe Biosimilar'] },
  { principio: 'Etanercepte', concentracao: '50mg/ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Enbrel 50mg', 'Etanercepte Biosimilar'] },
  { principio: 'Golimumabe', concentracao: '50mg/0,5ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Simponi 50mg'] },
  { principio: 'Abatacepte', concentracao: '125mg/ml', forma: 'solução injetável subcutânea', comerciais: ['Orencia SC 125mg'] },
  { principio: 'Tocilizumabe', concentracao: '162mg/0,9ml', forma: 'solução injetável subcutânea', comerciais: ['RoActemra SC 162mg'] },
  { principio: 'Baricitinibe', concentracao: '2mg', forma: 'comprimido', comerciais: ['Olumiant 2mg'] },
  { principio: 'Baricitinibe', concentracao: '4mg', forma: 'comprimido', comerciais: ['Olumiant 4mg'] },
  { principio: 'Tofacitinibe', concentracao: '5mg', forma: 'comprimido', comerciais: ['Xeljanz 5mg'] },
  { principio: 'Tofacitinibe', concentracao: '11mg', forma: 'comprimido de liberação prolongada', comerciais: ['Xeljanz XR 11mg'] },
  { principio: 'Upadacitinibe', concentracao: '15mg', forma: 'comprimido de liberação prolongada', comerciais: ['Rinvoq 15mg'] },
  { principio: 'Secucinumabe', concentracao: '150mg/ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Cosentyx 150mg'] },
  { principio: 'Ixequizumabe', concentracao: '80mg/ml', forma: 'solução injetável (seringa pré-cheia)', comerciais: ['Taltz 80mg'] },

  // ── ENDOCRINOLOGIA / METABOLISMO ──────────────────────────────────────────────
  { principio: 'Semaglutida', concentracao: '7mg', forma: 'comprimido', comerciais: ['Rybelsus 7mg'] },
  { principio: 'Semaglutida', concentracao: '14mg', forma: 'comprimido', comerciais: ['Rybelsus 14mg'] },
  { principio: 'Tirzepatida', concentracao: '5mg/0,5ml', forma: 'solução injetável semanal', comerciais: ['Mounjaro 5mg'] },
  { principio: 'Tirzepatida', concentracao: '10mg/0,5ml', forma: 'solução injetável semanal', comerciais: ['Mounjaro 10mg'] },
  { principio: 'Tirzepatida', concentracao: '15mg/0,5ml', forma: 'solução injetável semanal', comerciais: ['Mounjaro 15mg'] },
  { principio: 'Dulaglutida', concentracao: '0,75mg/0,5ml', forma: 'solução injetável semanal', comerciais: ['Trulicity 0,75mg'] },
  { principio: 'Dulaglutida', concentracao: '1,5mg/0,5ml', forma: 'solução injetável semanal', comerciais: ['Trulicity 1,5mg'] },
  { principio: 'Pioglitazona', concentracao: '15mg', forma: 'comprimido', comerciais: ['Actos 15mg'] },
  { principio: 'Pioglitazona', concentracao: '30mg', forma: 'comprimido', comerciais: ['Actos 30mg'] },
  { principio: 'Acarbose', concentracao: '50mg', forma: 'comprimido', comerciais: ['Glucobay 50mg'] },
  { principio: 'Acarbose', concentracao: '100mg', forma: 'comprimido', comerciais: ['Glucobay 100mg'] },
  { principio: 'Insulina Glargina', concentracao: '300 UI/ml', forma: 'solução injetável (caneta U300)', comerciais: ['Toujeo'] },
  { principio: 'Insulina Glulisina', concentracao: '100 UI/ml', forma: 'solução injetável (caneta)', comerciais: ['Apidra'] },
  { principio: 'Testosterona Cipionato', concentracao: '200mg/ml', forma: 'solução injetável (ampola)', comerciais: ['Deposteron', 'Depo-Testosterone'] },
  { principio: 'Testosterona Undecanoato', concentracao: '40mg', forma: 'cápsula', comerciais: ['Androxon', 'Restandol'] },
  { principio: 'Testosterona Gel', concentracao: '1%', forma: 'gel transdérmico', comerciais: ['Testogel 1%', 'AndroGel'] },
  { principio: 'Estradiol Transdérmico', concentracao: '50mcg/24h', forma: 'adesivo transdérmico semanal', comerciais: ['Estradot', 'Climara 50'] },
  { principio: 'Raloxifeno', concentracao: '60mg', forma: 'comprimido', comerciais: ['Evista 60mg'] },
  { principio: 'Alendronato', concentracao: '70mg', forma: 'comprimido semanal', comerciais: ['Fosamax 70mg', 'Alendros 70mg'] },
  { principio: 'Alendronato', concentracao: '10mg', forma: 'comprimido', comerciais: ['Fosamax 10mg'] },
  { principio: 'Risedronato', concentracao: '35mg', forma: 'comprimido semanal', comerciais: ['Actonel 35mg'] },
  { principio: 'Ibandronato', concentracao: '150mg', forma: 'comprimido mensal', comerciais: ['Bonviva 150mg'] },
  { principio: 'Denosumabe', concentracao: '60mg/ml', forma: 'solução injetável (osteoporose SC)', comerciais: ['Prolia 60mg'] },
  { principio: 'Calcitonina de Salmão', concentracao: '200 UI/dose', forma: 'spray nasal', comerciais: ['Miacalcic Nasal 200 UI'] },
  { principio: 'Teriparatida', concentracao: '250mcg/ml', forma: 'solução injetável (caneta)', comerciais: ['Forteo'] },
]

/** Unidade de quantidade padrão por forma farmacêutica */
export function unidadeQuantidade(forma: string): string {
  const f = forma.toLowerCase()
  if (f.includes('creme') || f.includes('pomada') || f.includes('gel') || f.includes('loção')) return 'bisnaga(s)'
  if (f.includes('xampu') || f.includes('shampoo')) return 'frasco(s)'
  if (f.includes('colírio') || f.includes('gotas') || f.includes('solução oral') || f.includes('suspensão')) return 'frasco(s)'
  if (f.includes('spray') || f.includes('aerossol') || f.includes('inalação')) return 'frasco(s)'
  if (f.includes('sachê') || f.includes('pó para')) return 'sachê(s)'
  if (f.includes('injetável') || f.includes('seringa')) return 'ampola(s)/seringa(s)'
  if (f.includes('cápsula') || f.includes('comprimido')) return 'caixa(s)'
  return 'unidade(s)'
}

/** Unidade da dose por forma farmacêutica (para o texto de posologia) */
function unidadeDose(forma: string): string {
  const f = forma.toLowerCase()
  if (f.includes('cápsula'))                    return 'cápsula'
  if (f.includes('comprimido'))                 return 'comprimido'
  if (f.includes('gotas') || f.includes('solução oral (gotas)')) return 'gotas'
  if (f.includes('colírio'))                    return 'gota(s)'
  if (f.includes('xarope') || f.includes('suspensão oral') || f.includes('solução oral')) return 'ml'
  if (f.includes('aerossol') || f.includes('spray') || f.includes('inalação')) return 'jato(s)'
  if (f.includes('sachê') || f.includes('pó para')) return 'sachê'
  if (f.includes('creme') || f.includes('pomada') || f.includes('gel')) return 'aplicação'
  return 'dose'
}

/** Posologias sugeridas por forma farmacêutica */
export function posologiasSugeridas(forma: string): string[] {
  const f = forma.toLowerCase()
  const d = unidadeDose(forma)

  if (f.includes('gotas') && !f.includes('colírio')) {
    return [
      `15 ${d} de 6 em 6 horas, por 3 dias`,
      `15 ${d} de 6 em 6 horas, por 5 dias`,
      `20 ${d} de 8 em 8 horas, por 3 dias`,
      `20 ${d} de 8 em 8 horas, por 5 dias`,
      `20 ${d} de 12 em 12 horas, por 5 dias`,
      `15 ${d} quando necessário`,
    ]
  }
  if (f.includes('colírio')) {
    return [
      `2 ${d} no olho afetado de 6 em 6 horas, por 5 dias`,
      `2 ${d} em cada olho de 6 em 6 horas, por 7 dias`,
      `2 ${d} no olho afetado de 8 em 8 horas, por 7 dias`,
      `1 ${d} em cada olho de 12 em 12 horas, uso contínuo`,
      `2 ${d} no olho afetado quando necessário`,
    ]
  }
  if (f.includes('xarope') || f.includes('suspensão oral') || (f.includes('solução oral') && !f.includes('gotas'))) {
    return [
      `5 ${d} de 8 em 8 horas, por 5 dias`,
      `5 ${d} de 8 em 8 horas, por 7 dias`,
      `10 ${d} de 12 em 12 horas, por 5 dias`,
      `5 ${d} de 12 em 12 horas, por 7 dias`,
      `10 ${d} de 8 em 8 horas, por 10 dias`,
      `5 ${d} 1x ao dia, por 5 dias`,
    ]
  }
  if (f.includes('aerossol') || (f.includes('spray') && !f.includes('sublingual')) || f.includes('inalação')) {
    return [
      `2 ${d} quando necessário (máx. 4x ao dia)`,
      `2 ${d} de 12 em 12 horas, uso contínuo`,
      `2 ${d} de 6 em 6 horas, por 7 dias`,
      `1 ${d} de 12 em 12 horas, uso contínuo`,
      `2 ${d} 1x ao dia (manhã), uso contínuo`,
    ]
  }
  if (f.includes('sublingual')) {
    return [
      `1 ${d} sublingual quando necessário (máx. 3x ao dia)`,
      `1 ${d} sublingual de 8 em 8 horas, por 3 dias`,
      `1 ${d} sublingual de 6 em 6 horas, por 2 dias`,
    ]
  }
  if (f.includes('creme') || f.includes('pomada') || f.includes('gel') || f.includes('loção')) {
    return [
      `Aplicar na área afetada 2x ao dia, por 7 dias`,
      `Aplicar na área afetada 3x ao dia, por 5 dias`,
      `Aplicar na área afetada 1x ao dia (à noite), por 14 dias`,
      `Aplicar na área afetada 2x ao dia, por 14 dias`,
      `Aplicar na área afetada 2x ao dia, uso contínuo`,
      `Aplicar fina camada na área afetada 2x ao dia, por 7 dias`,
    ]
  }
  if (f.includes('sachê') || f.includes('pó para')) {
    return [
      `1 ${d} dissolvido em 200ml de água de 8 em 8 horas, por 5 dias`,
      `1 ${d} dissolvido em 200ml de água 1x ao dia, por 7 dias`,
      `1 ${d} dissolvido em 200ml de água de 12 em 12 horas, por 5 dias`,
      `1 ${d} dissolvido em 200ml de água dose única`,
    ]
  }
  if (f.includes('injetável') || f.includes('seringa')) {
    return [
      `Aplicar por via subcutânea 1x ao dia`,
      `Aplicar por via intramuscular dose única`,
      `Aplicar por via subcutânea de 12 em 12 horas`,
    ]
  }

  // Padrão: comprimido ou cápsula
  return [
    `1 ${d} de 6 em 6 horas, por 3 dias`,
    `1 ${d} de 6 em 6 horas, por 5 dias`,
    `1 ${d} de 8 em 8 horas, por 5 dias`,
    `1 ${d} de 8 em 8 horas, por 7 dias`,
    `1 ${d} de 12 em 12 horas, por 5 dias`,
    `1 ${d} de 12 em 12 horas, por 7 dias`,
    `1 ${d} 1x ao dia, por 7 dias`,
    `1 ${d} 1x ao dia, por 14 dias`,
    `1 ${d} 1x ao dia, uso contínuo`,
    `2 ${d} 1x ao dia, uso contínuo`,
    `1 ${d} à noite, uso contínuo`,
    `1 ${d} quando necessário`,
  ]
}

/** Gera a string de exibição de um medicamento */
export function medicamentoLabel(m: Medicamento): string {
  return `${m.principio} ${m.concentracao} (${m.forma})`
}

/** Busca medicamentos por texto (princípio ativo, concentração, nome comercial) */
export function buscarMedicamentos(query: string, limite = 8): Medicamento[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []

  const resultados: Array<{ med: Medicamento; score: number }> = []

  for (const med of MEDICAMENTOS) {
    const principioLower   = med.principio.toLowerCase()
    const concentracaoLower = med.concentracao.toLowerCase()
    const comerciaisLower  = (med.comerciais ?? []).map(c => c.toLowerCase())

    let score = 0

    // Correspondência exata no início do princípio ativo → prioridade máxima
    if (principioLower.startsWith(q)) score += 100
    // Palavra no princípio que começa com a query
    else if (principioLower.split(' ').some(w => w.startsWith(q))) score += 80
    // Query dentro do princípio
    else if (principioLower.includes(q)) score += 60

    // Correspondência em nome comercial
    if (comerciaisLower.some(c => c.startsWith(q))) score += 90
    else if (comerciaisLower.some(c => c.includes(q))) score += 50

    // Correspondência na concentração
    if (concentracaoLower.startsWith(q)) score += 30

    if (score > 0) resultados.push({ med, score })
  }

  return resultados
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(r => r.med)
}
