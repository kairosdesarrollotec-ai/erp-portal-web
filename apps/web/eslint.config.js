import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // TR-02 (useActivation) y otros hooks usan deps intencionalmente
      // parciales con comentario eslint-disable-next-line explicito -
      // se deja como warn, no error, para no bloquear ese patron ya
      // documentado en el codebase.
      'react-hooks/exhaustive-deps': 'warn',
      // Los hooks de data-fetching llaman setState solo despues de awaits
      // dentro de useEffect. La regla v7 traza la cadena estaticamente y no
      // distingue llamadas sincronas de asincronas, generando falsos positivos.
      'react-hooks/set-state-in-effect': 'warn',
      // Date.now() en useRef() solo se evalua una vez (valor inicial) y no
      // afecta la pureza del componente de forma practica; React Compiler v7
      // lo marca como impuro de forma estatica.
      'react-hooks/purity': 'warn',
      // useMemo con accesos a ref.current: el React Compiler no puede inferir
      // si las deps son equivalentes a las declaradas manualmente; la logica
      // es correcta pero el compilador no puede verificarlo estaticamente.
      'react-hooks/preserve-manual-memoization': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
