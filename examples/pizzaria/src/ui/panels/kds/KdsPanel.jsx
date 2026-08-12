// src/ui/panels/kds/KdsPanel.jsx — painel raiz do KDS (pedidos ativos +
// status de conexão do WhatsApp). Recebe `dataClient` como prop (R17),
// nunca importa src/db/*, src/delivery/* nem src/whatsapp/* diretamente —
// ver specs/feature-13/design.md, Decisão 1.
import { useEffect, useState } from "react";

import { Card, Navbar, ThemeToggle } from "../../index.js";
import { ConnectionStatus } from "./ConnectionStatus.jsx";
import { PedidoList } from "./PedidoList.jsx";

export function KdsPanel({ dataClient }) {
  const [pedidos, setPedidos] = useState([]);
  const [statusConexao, setStatusConexao] = useState("desconectado");

  useEffect(() => {
    dataClient.listarPedidosAtivos().then(setPedidos);

    const cancelarPedidosChange = dataClient.onPedidosChange((novosPedidos) => {
      setPedidos(novosPedidos);
    });

    return () => {
      cancelarPedidosChange();
    };
  }, [dataClient]);

  useEffect(() => {
    dataClient.getStatusConexaoWhatsApp().then(setStatusConexao);

    const cancelarConnectionStatusChange = dataClient.onConnectionStatusChange((novoStatus) => {
      setStatusConexao(novoStatus);
    });

    return () => {
      cancelarConnectionStatusChange();
    };
  }, [dataClient]);

  async function handleAtualizarStatus(id, novoStatus) {
    const pedidoAtualizado = await dataClient.atualizarStatusPedido(id, novoStatus);
    setPedidos((atual) =>
      atual.map((pedido) => (pedido.id === id ? { ...pedido, ...pedidoAtualizado } : pedido))
    );
    return pedidoAtualizado;
  }

  async function handleAtribuirMotoboy(id, motoboy) {
    const pedidoAtualizado = await dataClient.atribuirMotoboy(id, motoboy);
    setPedidos((atual) =>
      atual.map((pedido) => (pedido.id === id ? { ...pedido, ...pedidoAtualizado } : pedido))
    );
    return pedidoAtualizado;
  }

  return (
    <div>
      <Navbar>
        <span>Painel KDS</span>
        <ConnectionStatus status={statusConexao} />
        <ThemeToggle />
      </Navbar>

      <Card>
        <PedidoList
          pedidos={pedidos}
          onAtualizarStatus={handleAtualizarStatus}
          onAtribuirMotoboy={handleAtribuirMotoboy}
        />
      </Card>
    </div>
  );
}
