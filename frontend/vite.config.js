import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        vendedor: 'Vendedor.html',
        admin: 'admin.html',
        crearCuenta: 'registrarCuentaV.html',
        consulta: 'Consulta.html',
        acercaDe: 'acercaDe.html'
      },
    },
  },
});




