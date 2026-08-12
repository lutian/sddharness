// src/delivery/geocoder.js — contrato mínimo do adapter de geocodificação
// (Nominatim) injetável.
//
// Qualquer integração concreta com a API do Nominatim deve ser envolvida por
// um adapter que satisfaça este contrato antes de ser injetada em
// `geocodeEndereco`/`calcularTempoEspera`. `src/delivery/` nunca importa um
// cliente HTTP concreto — ver `design.md` de feature-6.
//
// @typedef {object} GeocoderAdapter
// @property {(endereco: string) => Promise<{ latitude: number, longitude: number } | null>} geocode
//   Geocodifica um endereço textual. Retorna `null` quando o Nominatim não
//   encontra nenhum resultado para o endereço informado (não é um erro de
//   rede — é uma resposta válida "sem resultado").

export {};
