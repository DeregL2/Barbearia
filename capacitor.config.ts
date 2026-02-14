import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.barbearia.app',
  appName: 'Barbearia',
  webDir: 'frontend',
  server: {
    androidScheme: 'http',       // Isso força o app a usar HTTP (sem S)
    cleartext: true,             // Permite conexão insegura (texto simples)
    allowNavigation: ['*']       // Permite navegar para IPs externos
  }
};

export default config;