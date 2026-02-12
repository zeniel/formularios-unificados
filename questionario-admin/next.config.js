/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Para deploy em Docker/Kubernetes
  
  // Desabilitar strict mode em dev se causar double-render
  reactStrictMode: true,
  
  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Variáveis de ambiente públicas (expostas ao browser)
  env: {
    NEXT_PUBLIC_APP_NAME: 'Administração de Questionários',
    NEXT_PUBLIC_CNJ_CORPORATIVO_URL: 'https://www.cnj.jus.br/corporativo',
  },
};

module.exports = nextConfig;
