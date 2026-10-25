// Substitui o pacote `server-only` nos testes unitários. No Next, o import
// faz o build falhar se um componente de cliente puxar um módulo de servidor;
// no Vitest não há essa fronteira, e o módulo real lançaria erro ao carregar.
export {};
