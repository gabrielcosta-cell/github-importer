// Configuração do SSO centralizado via DOT Operação
export const SSO_CONFIG = {
  APP_URL: 'https://dot.dotconceito.com',
  LOGIN_PATH: '/auth',
  MODULE_SELECT_PATH: '/selecionar-modulo',
} as const;

export const getLoginUrl = () => `${SSO_CONFIG.APP_URL}${SSO_CONFIG.LOGIN_PATH}`;

// URL para tela de seleção de módulos
export const getModuleSelectUrl = () => 
  `${SSO_CONFIG.APP_URL}${SSO_CONFIG.MODULE_SELECT_PATH}`;
