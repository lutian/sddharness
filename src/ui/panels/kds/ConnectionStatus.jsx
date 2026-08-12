// src/ui/panels/kds/ConnectionStatus.jsx — indicador visual do status de
// conexão do WhatsApp Web (R12, R13).
import { Badge } from "../../index.js";

const ROTULOS = {
  conectado: "WhatsApp conectado",
  desconectado: "WhatsApp desconectado",
};

export function ConnectionStatus({ status }) {
  const variant = status === "conectado" ? "success" : "danger";
  const rotulo = ROTULOS[status] ?? ROTULOS.desconectado;

  return <Badge variant={variant}>{rotulo}</Badge>;
}
