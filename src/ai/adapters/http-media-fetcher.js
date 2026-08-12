// src/ai/adapters/http-media-fetcher.js — adapter concreto que satisfaz o
// contrato MediaFetcher (src/ai/media.js) usando o `fetch` nativo do Node.
// Única fronteira do domínio src/ai/ que chama `fetch` diretamente para
// baixar mídia — ver "Estratégia de teste sem rede real" em
// specs/feature-10/design.md.

// Cria um adapter concreto de download de mídia via HTTP.
// options: {} (reservado; nenhuma opção obrigatória nesta feature)
export function createHttpMediaFetcher() {
  return {
    download: async (media) => {
      if (!media?.url) {
        throw new Error("createHttpMediaFetcher: media.url é obrigatório.");
      }

      const resposta = await fetch(media.url);

      if (!resposta.ok) {
        throw new Error(
          `createHttpMediaFetcher: falha ao baixar mídia (status ${resposta.status}).`,
        );
      }

      const buffer = Buffer.from(await resposta.arrayBuffer());
      const mimeType = resposta.headers.get("content-type") || media.mimeType;

      return { buffer, mimeType };
    },
  };
}
