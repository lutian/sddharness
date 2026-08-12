// src/delivery/adapters/nominatim.js — adapter concreto que satisfaz o
// contrato GeocoderAdapter (src/delivery/geocoder.js) usando o `fetch`
// nativo do Node contra a API pública do Nominatim. Única fronteira do
// domínio src/delivery/ que chama `fetch` diretamente — ver "Estratégia de
// teste sem rede real" em specs/feature-10/design.md.

const BASE_URL_PADRAO = "https://nominatim.openstreetmap.org/search";
const USER_AGENT_PADRAO = "pizzaria-whatsapp-delivery-desktop (contato@pizzaria.example)";

// Cria um adapter concreto de geocodificação via API real do Nominatim.
// options: { baseUrl?, userAgent? }
export function createNominatimGeocoder(options = {}) {
  const { baseUrl, userAgent } = options;

  return {
    geocode: async (endereco) => {
      const url = `${baseUrl ?? BASE_URL_PADRAO}?q=${encodeURIComponent(endereco)}&format=json&limit=1`;

      const resposta = await fetch(url, {
        headers: { "User-Agent": userAgent ?? USER_AGENT_PADRAO },
      });

      if (!resposta.ok) {
        throw new Error(
          `createNominatimGeocoder: falha ao geocodificar endereço (status ${resposta.status}).`,
        );
      }

      const resultados = await resposta.json();

      if (resultados.length === 0) {
        return null;
      }

      return {
        latitude: Number(resultados[0].lat),
        longitude: Number(resultados[0].lon),
      };
    },
  };
}
