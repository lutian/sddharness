// src/ui/panels/config/ConfigPanel.jsx — painel raiz de configuração
// (cardápio + configuração global). Recebe `dataClient` como prop (R14),
// nunca importa src/menu/* diretamente — ver specs/feature-12/design.md,
// Decisão 1.
import { useEffect, useState } from "react";

import { Card, Navbar, ThemeToggle } from "../../index.js";
import { CardapioEditor } from "./CardapioEditor.jsx";
import { ConfigForm } from "./ConfigForm.jsx";

export function ConfigPanel({ dataClient }) {
  const [cardapio, setCardapio] = useState(null);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dataClient.loadCardapio().then(setCardapio);
    dataClient.loadConfig().then(setConfig);
  }, [dataClient]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await dataClient.saveConfig({
        apiKeys: config.apiKeys,
        systemPrompt: config.systemPrompt,
        audioEnabled: config.audioEnabled,
        imageEnabled: config.imageEnabled,
        modeloSelecionado: config.modeloSelecionado,
      });
      setSaved(true);
    } catch (erro) {
      setError(erro.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Navbar>
        <span>Painel de Configuração</span>
        <ThemeToggle />
      </Navbar>

      <Card>
        {cardapio ? (
          <CardapioEditor cardapio={cardapio} onChange={setCardapio} />
        ) : (
          <p>Carregando cardápio...</p>
        )}
      </Card>

      <Card>
        {config ? (
          <ConfigForm
            config={config}
            onChange={setConfig}
            onSave={handleSave}
            saving={saving}
            error={error}
            saved={saved}
          />
        ) : (
          <p>Carregando configurações...</p>
        )}
      </Card>
    </div>
  );
}
