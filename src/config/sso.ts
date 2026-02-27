// Configuração do SSO centralizado via SKALA CRM
export const SSO_CONFIG = {
  CRM_URL: 'https://skala.dotconceito.com',
  CRM_LOGIN_PATH: '/auth',
  CRM_MODULE_SELECT_PATH: '/selecionar-modulo',
} as const;

export const getCRMLoginUrl = () => `${SSO_CONFIG.CRM_URL}${SSO_CONFIG.CRM_LOGIN_PATH}`;

// URL para tela de seleção de módulos
export const getCRMModuleSelectUrl = () => 
  `${SSO_CONFIG.CRM_URL}${SSO_CONFIG.CRM_MODULE_SELECT_PATH}`;
