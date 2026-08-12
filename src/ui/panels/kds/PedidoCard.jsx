// src/ui/panels/kds/PedidoCard.jsx — card de um pedido ativo: cliente,
// status, tempo de espera, mudança de status e atribuição de motoboy
// (R2, R6, R7, R8, R9, R10, R11). Não reimplementa validação de domínio:
// delega toda decisão de "essa transição é permitida?"/"esse motoboy é
// válido?" às promessas recebidas via props, apenas capturando e exibindo
// o erro em caso de rejeição (specs/feature-13/design.md, Decisão 3).
import { useEffect, useState } from "react";

import { Badge, Button, Card } from "../../index.js";

const STATUS_PERMITIDOS = [
  "recebido",
  "em_preparo",
  "saiu_para_entrega",
  "concluido",
  "cancelado",
];

export function PedidoCard({ pedido, onAtualizarStatus, onAtribuirMotoboy }) {
  const [statusSelecionado, setStatusSelecionado] = useState(pedido.status);
  const [motoboyDigitado, setMotoboyDigitado] = useState(pedido.motoboy ?? "");
  const [erroStatus, setErroStatus] = useState(null);
  const [erroMotoboy, setErroMotoboy] = useState(null);

  // Sincroniza os valores exibidos com o `pedido` recalculado por
  // `KdsPanel` após sucesso (R7, R10) ou após uma atualização de
  // `onPedidosChange` (R4) — sem sobrescrever uma edição em andamento que
  // ainda não foi confirmada, exceto quando o valor de origem muda de fato.
  useEffect(() => {
    setStatusSelecionado(pedido.status);
  }, [pedido.status]);

  useEffect(() => {
    setMotoboyDigitado(pedido.motoboy ?? "");
  }, [pedido.motoboy]);

  async function handleConfirmarStatus() {
    setErroStatus(null);
    try {
      await onAtualizarStatus(pedido.id, statusSelecionado);
    } catch (erro) {
      setStatusSelecionado(pedido.status);
      setErroStatus(erro.message);
    }
  }

  async function handleConfirmarMotoboy() {
    setErroMotoboy(null);
    try {
      await onAtribuirMotoboy(pedido.id, motoboyDigitado);
    } catch (erro) {
      setMotoboyDigitado(pedido.motoboy ?? "");
      setErroMotoboy(erro.message);
    }
  }

  return (
    <Card>
      <p>{pedido.clienteNome}</p>
      <Badge>{pedido.status}</Badge>
      {pedido.tempoEsperaMinutos === null ? (
        <span>Tempo de espera indisponível</span>
      ) : (
        <span>{pedido.tempoEsperaMinutos} min</span>
      )}

      <label>
        Novo status
        <select
          aria-label={`Novo status do pedido ${pedido.id}`}
          value={statusSelecionado}
          onChange={(evento) => setStatusSelecionado(evento.target.value)}
        >
          {STATUS_PERMITIDOS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <Button variant="primary" onClick={handleConfirmarStatus}>
        Confirmar status
      </Button>
      {erroStatus && <Badge variant="danger">{erroStatus}</Badge>}

      <label>
        Motoboy
        <input
          type="text"
          aria-label={`Motoboy do pedido ${pedido.id}`}
          value={motoboyDigitado}
          onChange={(evento) => setMotoboyDigitado(evento.target.value)}
        />
      </label>
      <Button variant="primary" onClick={handleConfirmarMotoboy}>
        Confirmar motoboy
      </Button>
      {erroMotoboy && <Badge variant="danger">{erroMotoboy}</Badge>}
    </Card>
  );
}
