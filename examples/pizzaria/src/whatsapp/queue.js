// src/whatsapp/queue.js — fila FIFO de processamento sequencial com delay humanizado.
import { EventEmitter } from "node:events";

// Fila em memória, estritamente FIFO (push no fim, shift no início). Um único
// loop `while`/`await`, guardado pela flag `_processing`, garante que nunca
// há dois processamentos simultâneos: uma segunda chamada a `enqueue`
// enquanto o loop já está ativo apenas adiciona o item e retorna.
export function createMessageQueue({ minDelayMs = 1000, maxDelayMs = 3000, processFn }) {
  const emitter = new EventEmitter();
  const fila = [];
  let processing = false;

  async function processarFila() {
    processing = true;

    while (fila.length > 0) {
      const item = fila.shift();

      try {
        const resultado = await processFn(item);
        emitter.emit("processed", { item, resultado });
      } catch (error) {
        emitter.emit("error", error);
      }

      if (fila.length > 0) {
        await _delay(minDelayMs, maxDelayMs);
      }
    }

    processing = false;
  }

  function enqueue(mensagem) {
    fila.push(mensagem);

    if (!processing) {
      processarFila();
    }
  }

  return {
    enqueue,
    on: (evento, callback) => emitter.on(evento, callback),
  };
}

// Aguarda um intervalo aleatório entre `minDelayMs` e `maxDelayMs` (delay humanizado).
function _delay(minDelayMs, maxDelayMs) {
  const ms = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
