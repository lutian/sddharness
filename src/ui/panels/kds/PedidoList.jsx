// src/ui/panels/kds/PedidoList.jsx — lista de pedidos ativos (R1, R2).
import { PedidoCard } from "./PedidoCard.jsx";

export function PedidoList({ pedidos, onAtualizarStatus, onAtribuirMotoboy }) {
  return (
    <div>
      {pedidos.map((pedido) => (
        <PedidoCard
          key={pedido.id}
          pedido={pedido}
          onAtualizarStatus={onAtualizarStatus}
          onAtribuirMotoboy={onAtribuirMotoboy}
        />
      ))}
    </div>
  );
}
