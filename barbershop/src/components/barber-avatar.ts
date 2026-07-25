/**
 * Gera uma URL de foto "placeholder" para um barbeiro, usada até o
 * projeto ter upload de foto de verdade (não existe campo de foto no
 * schema do User ainda). O parâmetro `u` do Pravatar faz a foto ser
 * SEMPRE a mesma para o mesmo barbeiro (determinístico pelo id), em vez
 * de mudar a cada carregamento da página.
 *
 * Pravatar é um serviço público de avatares de exemplo — dá pra trocar
 * por fotos reais no futuro adicionando um campo `photoUrl` em User e
 * usando ele aqui como fallback.
 */
export function getBarberAvatarUrl(barberId: string): string {
  return `https://i.pravatar.cc/300?u=${encodeURIComponent(barberId)}`;
}
