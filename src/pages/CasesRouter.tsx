import { useParams } from 'react-router-dom';
import CasesBlog from './CasesBlog';
import CaseDetail from './CaseDetail';

// List of known niches - case insensitive matching
const KNOWN_NICHES = [
  'B2B', 'Franquia', 'Energia Solar', 'Academia', 'Educação',
  'Serviço', 'Varejo', 'Imobiliária | Construção Civil', 'SAAS', 
  'Telecom', 'Investimentos / Finanças', 'Contabilidade', 
  'E-commerce', 'Odontologia', 'Advocacia', 'Saúde', 'Alimentício'
];

const CasesRouter = () => {
  const { param } = useParams<{ param: string }>();
  
  if (!param) {
    return <CasesBlog />;
  }
  
  // Check if param matches a known niche (case insensitive)
  const decodedParam = decodeURIComponent(param);
  const isNiche = KNOWN_NICHES.some(
    niche => niche.toLowerCase() === decodedParam.toLowerCase()
  );
  
  if (isNiche) {
    return <CasesBlog initialNiche={decodedParam} />;
  }
  
  // Otherwise, treat as a case slug
  return <CaseDetail />;
};

export default CasesRouter;

