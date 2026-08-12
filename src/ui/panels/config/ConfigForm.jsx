// src/ui/panels/config/ConfigForm.jsx — formulário de configuração global
// (chaves de API, system prompt, switches de áudio/imagem, modelo de IA).
// Não reimplementa validação de domínio: apenas monta o objeto `config` e
// delega a validação/persistência a `dataClient.saveConfig` (ver
// specs/feature-12/design.md, Decisão 3).
import { Badge, Button } from "../../index.js";

const MODELOS_PERMITIDOS = ["openai", "deepseek"];

export function ConfigForm({ config, onChange, onSave, saving, error, saved }) {
  function atualizarCampo(campo, valor) {
    onChange({ ...config, [campo]: valor });
  }

  function atualizarApiKey(provedor, valor) {
    onChange({ ...config, apiKeys: { ...config.apiKeys, [provedor]: valor } });
  }

  return (
    <div>
      <label>
        Chave de API OpenAI
        <input
          type="password"
          aria-label="Chave de API OpenAI"
          value={config.apiKeys.openai}
          onChange={(evento) => atualizarApiKey("openai", evento.target.value)}
        />
      </label>

      <label>
        Chave de API DeepSeek
        <input
          type="password"
          aria-label="Chave de API DeepSeek"
          value={config.apiKeys.deepseek}
          onChange={(evento) => atualizarApiKey("deepseek", evento.target.value)}
        />
      </label>

      <label>
        System prompt
        <textarea
          aria-label="System prompt"
          value={config.systemPrompt}
          onChange={(evento) => atualizarCampo("systemPrompt", evento.target.value)}
        />
      </label>

      <label>
        Áudio habilitado
        <input
          type="checkbox"
          aria-label="Áudio habilitado"
          checked={config.audioEnabled}
          onChange={(evento) => atualizarCampo("audioEnabled", evento.target.checked)}
        />
      </label>

      <label>
        Imagem habilitada
        <input
          type="checkbox"
          aria-label="Imagem habilitada"
          checked={config.imageEnabled}
          onChange={(evento) => atualizarCampo("imageEnabled", evento.target.checked)}
        />
      </label>

      <label>
        Modelo de IA
        <select
          aria-label="Modelo de IA"
          value={config.modeloSelecionado}
          onChange={(evento) => atualizarCampo("modeloSelecionado", evento.target.value)}
        >
          {MODELOS_PERMITIDOS.map((modelo) => (
            <option key={modelo} value={modelo}>
              {modelo}
            </option>
          ))}
        </select>
      </label>

      <Button variant="primary" onClick={onSave} disabled={saving}>
        Salvar configurações
      </Button>

      {saved && <Badge variant="success">Configurações salvas com sucesso.</Badge>}
      {error && <Badge variant="danger">{error}</Badge>}
    </div>
  );
}
