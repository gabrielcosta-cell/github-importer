import { supabase } from "@/integrations/supabase/client";

const npsData = [
  { empresa: 'Versátil', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-25', observacoes: '- vcs precisam fazer um estudo mais afundo dos seus clientes, principalmente os que ja vem com bagagem de marketing.- estudar muiiiito as campanhas existente a fim de saber o que esta dando certo e melhorar e o que deu errado evitar. - agilidade nas entregas e transparência no cronograma- errar todos nós erramos. Persistir nos erros é o que complica tudo, isso eu estou falando de mim.', recomendacao: 4, responsavel: 'Danilo Carvalho', email: 'CRIACAO@VERSATILBANHERIAS.COM.BR', squad: 'Apollo' },
  { empresa: 'Connect Tecnologiia e Consultoria', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-10-07', observacoes: 'Nosso principal objetivo foi a geraçao de leads, hoje com um pouco mais de experiencia, acredito que tenha sido um erro muito grande, achar que nosso ICP encontrariamos no Instagram, e ter aceito a sugestao de utilizar essa rede social, considerando que estamos há 10 meses com a parceira e nao tivemos unico lead. Porem, quero elogiar a postura do Gabriel COO, Vinicius, e o resultado do material da nova logomarca/ Site e Apresentaçao.', recomendacao: 5, responsavel: 'Sueli Sacuno', email: 'sueli.sacuno@connectsolucoes.com', squad: 'Athena' },
  { empresa: 'Pita Machado', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-10-03', observacoes: 'No momento não.', recomendacao: 6, responsavel: 'Henrique Machado', email: 'henrique.machado@pita.adv.br', squad: 'Athena' },
  { empresa: 'Rede focoh', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-24', observacoes: 'Nossa parceria com a DOT começou apenas há um mês. Contudo, o atendimento tem sido nível premium e estamos impressionados com a equipe. Muito em breve relataremos sobre os resultados.', recomendacao: 10, responsavel: 'Joe Angeli', email: 'marketing.redefocoh@gmail.com', squad: 'Apollo' },
  { empresa: 'Cotafacil', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-24', observacoes: 'Nao', recomendacao: 10, responsavel: 'Manoel Dias', email: 'manoel@franquiascotafacil.com.br', squad: 'Apollo' },
  { empresa: 'BelaFer', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-24', observacoes: 'POR ENQUANTO ESTA INDO BEM', recomendacao: 10, responsavel: 'Rodrigo Bertachini', email: 'rodrigo@belaferacosmetais.com.br', squad: 'Ares' },
  { empresa: 'Esher', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-25', observacoes: 'Gostei muito do atendimento e prontidão para ajustes. Sinto que a equipe está empenhada em fazer dar certo. Vocês estão de parabéns', recomendacao: 10, responsavel: 'Uliana', email: 'uliana@esher.com.br', squad: 'Athena' },
  { empresa: 'Aluga Ai', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-26', observacoes: 'Não.', recomendacao: 10, responsavel: 'Heloisa', email: 'heloisa@grupoalugaai.com.br', squad: 'Atlas' },
  { empresa: 'PRS Monitoramento', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-26', observacoes: 'Empresa com atendimento diferenciado, possui cronograma profissional que toda empresa precisa ter, MKT é o primeiro segmento da empresa no macro fluxo comercial.', recomendacao: 10, responsavel: 'Isaías Lamadril Borges', email: 'portoalegre@prsminitoramento.com.br', squad: 'Artemis' },
  { empresa: 'Linx/Plugg.To', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-10-02', observacoes: 'Não.', recomendacao: 10, responsavel: 'Ana', email: 'ana.cruz@linx.com.br', squad: 'Artemis' },
  { empresa: 'ACKNO', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-10-01', observacoes: 'Pessoal muito comprometido, rápidos e eficazes nas atividades', recomendacao: 10, responsavel: 'Marco Reis', email: 'marcos.reis@ackno.com.br', squad: 'Artemis' },
  { empresa: 'CLORUP', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-10-02', observacoes: 'Somos super bem atendidos.', recomendacao: 10, responsavel: 'Ana Soares', email: 'ana.soares@clorup.com.br', squad: 'Athena' },
  { empresa: 'AQRZ', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-29', observacoes: 'O time é bem eficiente e cordial', recomendacao: 10, responsavel: 'Erika', email: 'ops@aquirazinvestimentos.com.br', squad: 'Athena' },
  { empresa: 'Apolo Algodão', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-25', observacoes: 'Gosto bastante do suporte e do atendimento recebido.', recomendacao: 9, responsavel: 'Aline Carvalho', email: 'aline.carvalho@apolo.net.br', squad: 'Athena' },
  { empresa: 'Itiban', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-26', observacoes: 'Estamos com um trabalho em andamento a pouco tempo, e entendemos que os resultados virão a médio longo prazo, mas estamos contentes com o andamento até este momento.', recomendacao: 9, responsavel: 'Wagner Vieira da Silva', email: 'marketing@itiban.com.br', squad: 'Atlas' },
  { empresa: 'Q! Donuts', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-30', observacoes: 'Inicio de projeto, tudo caminhando conforme planejado.', recomendacao: 9, responsavel: 'Guilherme', email: 'guilherme.motta@qdonuts.com.br', squad: 'Artemis' },
  { empresa: 'AK Auto Center', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-28', observacoes: 'Não.', recomendacao: 8, responsavel: 'Sandra', email: 'sandrasophiaguto@gmail.com', squad: 'Atlas' },
  { empresa: '8 MILÍMETROS', sentimento_sem_dot: 'muito_desapontado', created_at: '2025-09-29', observacoes: 'Sem comentários adicionais', recomendacao: 8, responsavel: 'DIEGO OCTÁVIO', email: 'diego@8milimetros.com.br', squad: 'Apollo' },
  { empresa: 'CCR Contabilidade', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-24', observacoes: 'Somos muito bem atendidos, com muita atenção por toda a equipe DOT', recomendacao: 7, responsavel: 'Catia', email: 'catia@ccrcontabilidade.com.br', squad: 'Apollo' },
  { empresa: 'Neurohope', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-25', observacoes: 'Acredito que ainda estamos conhecendo o trabalho de vocês', recomendacao: 7, responsavel: 'Bianca', email: 'biancaperosa@hotmail.com', squad: 'Ares' },
  { empresa: 'Inshape', sentimento_sem_dot: 'indiferente', created_at: '2025-10-07', observacoes: 'sem comentarios', recomendacao: 7, responsavel: 'Nelson', email: 'ncunhajr@terra.com.br', squad: 'Apollo' },
  { empresa: 'Apolo Algodão', sentimento_sem_dot: 'indiferente', created_at: '2025-09-24', observacoes: 'Dificuldade em atingir resultado, o investimento nao esta se justificando.', recomendacao: 6, responsavel: 'Rodrigo', email: 'rlneto@me.com', squad: 'Athena' },
  { empresa: 'Italia no Box', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-25', observacoes: 'Gostaria de destacar a dedicação e a boa comunicação da equipe, sempre disposta a apoiar e orientar. No entanto, apesar de todo o esforço e educação no atendimento, até o momento não conseguimos enxergar resultados positivos na prática. Isso nos preocupa, pois acreditamos que o objetivo principal da parceria é a geração de resultados concretos.', recomendacao: 6, responsavel: 'Débora', email: 'franquia@italianobox.com.br', squad: 'Atlas' },
  { empresa: 'Nika Imóveis', sentimento_sem_dot: 'pouco_desapontado', created_at: '2025-09-30', observacoes: 'O atendimento da Dot é muito bom, são bem educados e gentis.Na parte de criação são muito demorados, e se tratando do valor mensal, acho que entregam pouco pelo valor pago, esperávamos mais entregas.Cfe havia comentado, deveriam sugerir outras criações de anúncios, cfe consta no contrato acordado entre as partes.Os Leads ainda estão frios, ainda falta acertar o Lead ideal para cada público dependendo do valor de cada imóvel, que tenha o poder de compra. Enfim, serem mais acertivos!', recomendacao: 6, responsavel: 'Seleni', email: 'nika@nikaimoveis.com.br', squad: 'Artemis' },
];

export async function importNPSResponses(): Promise<{ success: number; errors: number; details: string[] }> {
  const details: string[] = [];
  let success = 0;
  let errors = 0;

  for (const record of npsData) {
    const { error } = await supabase.from('nps_responses').insert(record);
    
    if (error) {
      errors++;
      details.push(`Erro ao inserir ${record.empresa}: ${error.message}`);
    } else {
      success++;
      details.push(`Inserido: ${record.empresa} - Nota ${record.recomendacao}`);
    }
  }

  return { success, errors, details };
}
