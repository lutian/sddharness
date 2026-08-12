import { describe, expect, it } from "vitest";

import {
  AudioTranscriptionError,
  ImageDescriptionError,
  MediaDownloadError,
  PdfConversionError,
  UnsupportedMediaTypeError,
  describeImageMessage,
  describePdfMessage,
  processarMensagemMultimodal,
  transcribeAudioMessage,
} from "../src/ai/index.js";

// Dublês simples de aiClient, mediaFetcher e pdfConverter: funções `async`
// controladas pelo teste, sem rede real (ver design.md de feature-4).
function criarMediaFetcherDuble({ buffer = Buffer.from("dados-binarios"), mimeType = "audio/ogg" } = {}) {
  const chamadas = [];
  return {
    chamadas,
    download: async (media) => {
      chamadas.push(media);
      return { buffer, mimeType };
    },
  };
}

function criarMediaFetcherDubleComFalha(erro) {
  return {
    download: async () => {
      throw erro;
    },
  };
}

function criarAiClientDuble({ textoTranscrito, textoDescritivo } = {}) {
  const chamadas = { transcribeAudio: [], describeImage: [] };
  return {
    chamadas,
    transcribeAudio: async (audioFile) => {
      chamadas.transcribeAudio.push(audioFile);
      return textoTranscrito;
    },
    describeImage: async (imagem) => {
      chamadas.describeImage.push(imagem);
      return textoDescritivo;
    },
  };
}

function criarPdfConverterDuble({ buffer = Buffer.from("imagem-convertida"), mimeType = "image/png" } = {}) {
  const chamadas = [];
  return {
    chamadas,
    convertFirstPageToImage: async (pdf) => {
      chamadas.push(pdf);
      return { buffer, mimeType };
    },
  };
}

describe("Processamento multimodal com IA (Whisper e Visão)", () => {
  describe("transcribeAudioMessage", () => {
    it("baixa o áudio antes de chamar aiClient.transcribeAudio e retorna exatamente o texto transcrito", async () => {
      const mediaFetcher = criarMediaFetcherDuble({ mimeType: "audio/ogg" });
      const aiClient = criarAiClientDuble({ textoTranscrito: "quero uma pizza de calabresa" });
      const media = { tipo: "audio", url: "http://exemplo/audio.ogg" };

      const texto = await transcribeAudioMessage({ aiClient, mediaFetcher, media });

      expect(mediaFetcher.chamadas).toEqual([media]);
      expect(aiClient.chamadas.transcribeAudio).toHaveLength(1);
      expect(texto).toBe("quero uma pizza de calabresa");
    });

    it("lança MediaDownloadError e não chama aiClient.transcribeAudio quando o download do áudio falha", async () => {
      const mediaFetcher = criarMediaFetcherDubleComFalha(new Error("rede indisponível"));
      const aiClient = criarAiClientDuble({ textoTranscrito: "não deveria chegar aqui" });
      const media = { tipo: "audio", url: "http://exemplo/audio.ogg" };

      await expect(transcribeAudioMessage({ aiClient, mediaFetcher, media })).rejects.toBeInstanceOf(
        MediaDownloadError
      );
      expect(aiClient.chamadas.transcribeAudio).toHaveLength(0);
    });

    it("lança AudioTranscriptionError com a causa original quando aiClient.transcribeAudio falha", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const erroOriginal = new Error("falha na API do Whisper");
      const aiClient = {
        transcribeAudio: async () => {
          throw erroOriginal;
        },
      };
      const media = { tipo: "audio", url: "http://exemplo/audio.ogg" };

      let erroCapturado = null;
      try {
        await transcribeAudioMessage({ aiClient, mediaFetcher, media });
      } catch (erro) {
        erroCapturado = erro;
      }

      expect(erroCapturado).toBeInstanceOf(AudioTranscriptionError);
      expect(erroCapturado.cause).toBe(erroOriginal);
    });
  });

  describe("describeImageMessage", () => {
    it("com imageEnabled=true, baixa a imagem, chama aiClient.describeImage e retorna o texto descritivo", async () => {
      const mediaFetcher = criarMediaFetcherDuble({ mimeType: "image/jpeg" });
      const aiClient = criarAiClientDuble({ textoDescritivo: "comprovante de pagamento via PIX" });
      const media = { tipo: "imagem", url: "http://exemplo/imagem.jpg" };

      const texto = await describeImageMessage({
        aiClient,
        mediaFetcher,
        media,
        config: { imageEnabled: true },
      });

      expect(mediaFetcher.chamadas).toEqual([media]);
      expect(aiClient.chamadas.describeImage).toHaveLength(1);
      expect(texto).toBe("comprovante de pagamento via PIX");
    });

    it("com imageEnabled=false, retorna null sem chamar mediaFetcher.download nem aiClient.describeImage", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const media = { tipo: "imagem", url: "http://exemplo/imagem.jpg" };

      const resultado = await describeImageMessage({
        aiClient,
        mediaFetcher,
        media,
        config: { imageEnabled: false },
      });

      expect(resultado).toBeNull();
      expect(mediaFetcher.chamadas).toHaveLength(0);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });

    it("lança MediaDownloadError e não chama aiClient.describeImage quando o download da imagem falha", async () => {
      const mediaFetcher = criarMediaFetcherDubleComFalha(new Error("URL expirada"));
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const media = { tipo: "imagem", url: "http://exemplo/imagem.jpg" };

      await expect(
        describeImageMessage({ aiClient, mediaFetcher, media, config: { imageEnabled: true } })
      ).rejects.toBeInstanceOf(MediaDownloadError);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });

    it("lança ImageDescriptionError com a causa original quando aiClient.describeImage falha", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const erroOriginal = new Error("falha no modelo de visão");
      const aiClient = {
        describeImage: async () => {
          throw erroOriginal;
        },
      };
      const media = { tipo: "imagem", url: "http://exemplo/imagem.jpg" };

      let erroCapturado = null;
      try {
        await describeImageMessage({ aiClient, mediaFetcher, media, config: { imageEnabled: true } });
      } catch (erro) {
        erroCapturado = erro;
      }

      expect(erroCapturado).toBeInstanceOf(ImageDescriptionError);
      expect(erroCapturado.cause).toBe(erroOriginal);
    });
  });

  describe("describePdfMessage", () => {
    it("com imageEnabled=true, baixa o PDF, converte a primeira página e chama aiClient.describeImage nessa ordem", async () => {
      const ordemDeChamadas = [];
      const mediaFetcher = {
        download: async (media) => {
          ordemDeChamadas.push("download");
          return { buffer: Buffer.from("pdf-bytes"), mimeType: "application/pdf" };
        },
      };
      const pdfConverter = {
        convertFirstPageToImage: async (pdf) => {
          ordemDeChamadas.push("convert");
          return { buffer: Buffer.from("imagem-convertida"), mimeType: "image/png" };
        },
      };
      const aiClient = {
        describeImage: async (imagem) => {
          ordemDeChamadas.push("describe");
          return "comprovante em PDF de R$ 50,00";
        },
      };
      const media = { tipo: "pdf", url: "http://exemplo/comprovante.pdf" };

      const texto = await describePdfMessage({
        aiClient,
        mediaFetcher,
        pdfConverter,
        media,
        config: { imageEnabled: true },
      });

      expect(ordemDeChamadas).toEqual(["download", "convert", "describe"]);
      expect(texto).toBe("comprovante em PDF de R$ 50,00");
    });

    it("com imageEnabled=false, retorna null sem chamar mediaFetcher, pdfConverter nem aiClient", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const pdfConverter = criarPdfConverterDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const media = { tipo: "pdf", url: "http://exemplo/comprovante.pdf" };

      const resultado = await describePdfMessage({
        aiClient,
        mediaFetcher,
        pdfConverter,
        media,
        config: { imageEnabled: false },
      });

      expect(resultado).toBeNull();
      expect(mediaFetcher.chamadas).toHaveLength(0);
      expect(pdfConverter.chamadas).toHaveLength(0);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });

    it("lança MediaDownloadError e não chama pdfConverter nem aiClient.describeImage quando o download do PDF falha", async () => {
      const mediaFetcher = criarMediaFetcherDubleComFalha(new Error("rede indisponível"));
      const pdfConverter = criarPdfConverterDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const media = { tipo: "pdf", url: "http://exemplo/comprovante.pdf" };

      await expect(
        describePdfMessage({ aiClient, mediaFetcher, pdfConverter, media, config: { imageEnabled: true } })
      ).rejects.toBeInstanceOf(MediaDownloadError);
      expect(pdfConverter.chamadas).toHaveLength(0);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });

    it("lança PdfConversionError com a causa original quando a conversão da primeira página falha (PDF corrompido/sem páginas)", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const erroOriginal = new Error("PDF sem páginas");
      const pdfConverter = {
        convertFirstPageToImage: async () => {
          throw erroOriginal;
        },
      };
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const media = { tipo: "pdf", url: "http://exemplo/comprovante.pdf" };

      let erroCapturado = null;
      try {
        await describePdfMessage({ aiClient, mediaFetcher, pdfConverter, media, config: { imageEnabled: true } });
      } catch (erro) {
        erroCapturado = erro;
      }

      expect(erroCapturado).toBeInstanceOf(PdfConversionError);
      expect(erroCapturado.cause).toBe(erroOriginal);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });

    it("lança ImageDescriptionError com a causa original quando aiClient.describeImage falha após download e conversão bem-sucedidos", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const pdfConverter = criarPdfConverterDuble();
      const erroOriginal = new Error("falha no modelo de visão");
      const aiClient = {
        describeImage: async () => {
          throw erroOriginal;
        },
      };
      const media = { tipo: "pdf", url: "http://exemplo/comprovante.pdf" };

      let erroCapturado = null;
      try {
        await describePdfMessage({ aiClient, mediaFetcher, pdfConverter, media, config: { imageEnabled: true } });
      } catch (erro) {
        erroCapturado = erro;
      }

      expect(erroCapturado).toBeInstanceOf(ImageDescriptionError);
      expect(erroCapturado.cause).toBe(erroOriginal);
    });
  });

  describe("processarMensagemMultimodal", () => {
    it("com media.tipo='audio', retorna a mensagem com texto transcrito, clienteId preservado e sem mutar o objeto original", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const aiClient = criarAiClientDuble({ textoTranscrito: "quero uma pizza grande" });
      const mensagem = {
        clienteId: "5511999990000",
        texto: "",
        media: { tipo: "audio", url: "http://exemplo/audio.ogg" },
      };
      const mensagemOriginalClone = { ...mensagem };

      const resultado = await processarMensagemMultimodal({ mensagem, aiClient, mediaFetcher, config: {} });

      expect(resultado.texto).toBe("quero uma pizza grande");
      expect(resultado.clienteId).toBe("5511999990000");
      expect(mensagem).toEqual(mensagemOriginalClone);
    });

    it("com media.tipo='imagem' e imageEnabled=true, retorna a mensagem com texto descritivo, clienteId preservado e sem mutar o objeto original", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "foto de um comprovante de PIX" });
      const mensagem = {
        clienteId: "5511988887777",
        texto: "",
        media: { tipo: "imagem", url: "http://exemplo/imagem.jpg" },
      };
      const mensagemOriginalClone = { ...mensagem };

      const resultado = await processarMensagemMultimodal({
        mensagem,
        aiClient,
        mediaFetcher,
        config: { imageEnabled: true },
      });

      expect(resultado.texto).toBe("foto de um comprovante de PIX");
      expect(resultado.clienteId).toBe("5511988887777");
      expect(mensagem).toEqual(mensagemOriginalClone);
    });

    it("lança UnsupportedMediaTypeError e não chama mediaFetcher, pdfConverter nem aiClient para media.tipo desconhecido", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const pdfConverter = criarPdfConverterDuble();
      const aiClient = criarAiClientDuble();
      const mensagem = {
        clienteId: "5511977776666",
        texto: "",
        media: { tipo: "video", url: "http://exemplo/video.mp4" },
      };

      await expect(
        processarMensagemMultimodal({ mensagem, aiClient, mediaFetcher, pdfConverter, config: {} })
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
      expect(mediaFetcher.chamadas).toHaveLength(0);
      expect(pdfConverter.chamadas).toHaveLength(0);
    });

    it("sem o campo media (ou com media nulo), retorna a mensagem original inalterada sem chamar mediaFetcher, pdfConverter nem aiClient", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const pdfConverter = criarPdfConverterDuble();
      const aiClient = criarAiClientDuble();

      const mensagemSemMedia = { clienteId: "5511966665555", texto: "olá, quero fazer um pedido" };
      const resultadoSemMedia = await processarMensagemMultimodal({
        mensagem: mensagemSemMedia,
        aiClient,
        mediaFetcher,
        pdfConverter,
        config: {},
      });
      expect(resultadoSemMedia).toEqual(mensagemSemMedia);

      const mensagemComMediaNulo = { clienteId: "5511955554444", texto: "oi", media: null };
      const resultadoComMediaNulo = await processarMensagemMultimodal({
        mensagem: mensagemComMediaNulo,
        aiClient,
        mediaFetcher,
        pdfConverter,
        config: {},
      });
      expect(resultadoComMediaNulo).toEqual(mensagemComMediaNulo);

      expect(mediaFetcher.chamadas).toHaveLength(0);
      expect(pdfConverter.chamadas).toHaveLength(0);
    });

    it("com media.tipo='imagem' e imageEnabled=false, retorna a mensagem original inalterada sem lançar exceção nem chamar mediaFetcher/aiClient", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const mensagem = {
        clienteId: "5511944443333",
        texto: "segue a foto",
        media: { tipo: "imagem", url: "http://exemplo/imagem.jpg" },
      };

      const resultado = await processarMensagemMultimodal({
        mensagem,
        aiClient,
        mediaFetcher,
        config: { imageEnabled: false },
      });

      expect(resultado).toEqual(mensagem);
      expect(mediaFetcher.chamadas).toHaveLength(0);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });

    it("com media.tipo='pdf' e imageEnabled=true, retorna a mensagem com texto descritivo da 1ª página convertida, clienteId preservado e sem mutar o objeto original", async () => {
      const mediaFetcher = criarMediaFetcherDuble({ mimeType: "application/pdf" });
      const pdfConverter = criarPdfConverterDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "comprovante em PDF de R$ 80,00" });
      const mensagem = {
        clienteId: "5511933332222",
        texto: "",
        media: { tipo: "pdf", url: "http://exemplo/comprovante.pdf" },
      };
      const mensagemOriginalClone = { ...mensagem };

      const resultado = await processarMensagemMultimodal({
        mensagem,
        aiClient,
        mediaFetcher,
        pdfConverter,
        config: { imageEnabled: true },
      });

      expect(resultado.texto).toBe("comprovante em PDF de R$ 80,00");
      expect(resultado.clienteId).toBe("5511933332222");
      expect(mensagem).toEqual(mensagemOriginalClone);
      expect(pdfConverter.chamadas).toHaveLength(1);
    });

    it("com media.tipo='pdf' e imageEnabled=false, retorna a mensagem original inalterada sem lançar exceção nem chamar mediaFetcher/pdfConverter/aiClient", async () => {
      const mediaFetcher = criarMediaFetcherDuble();
      const pdfConverter = criarPdfConverterDuble();
      const aiClient = criarAiClientDuble({ textoDescritivo: "não deveria chegar aqui" });
      const mensagem = {
        clienteId: "5511922221111",
        texto: "segue o comprovante",
        media: { tipo: "pdf", url: "http://exemplo/comprovante.pdf" },
      };

      const resultado = await processarMensagemMultimodal({
        mensagem,
        aiClient,
        mediaFetcher,
        pdfConverter,
        config: { imageEnabled: false },
      });

      expect(resultado).toEqual(mensagem);
      expect(mediaFetcher.chamadas).toHaveLength(0);
      expect(pdfConverter.chamadas).toHaveLength(0);
      expect(aiClient.chamadas.describeImage).toHaveLength(0);
    });
  });
});
