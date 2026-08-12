// src/ui/panels/config/CardapioEditor.jsx — edição em memória do cardápio
// carregado. Não persiste em disco (src/menu/index.js não expõe
// saveCardapio) — ver specs/feature-12/requirements.md, observação de
// escopo, e design.md, "Fora do escopo".
import { useState } from "react";

// Retorna uma cópia imutável de `cardapio` com apenas o item identificado por
// `categoriaIndex`/`itemIndex` alterado pelos campos de `camposAtualizados`.
function _atualizarItem(cardapio, categoriaIndex, itemIndex, camposAtualizados) {
  return {
    ...cardapio,
    categorias: cardapio.categorias.map((categoria, indiceCategoria) => {
      if (indiceCategoria !== categoriaIndex) {
        return categoria;
      }
      return {
        ...categoria,
        itens: categoria.itens.map((item, indiceItem) => {
          if (indiceItem !== itemIndex) {
            return item;
          }
          return { ...item, ...camposAtualizados };
        }),
      };
    }),
  };
}

export function CardapioEditor({ cardapio, onChange }) {
  // Texto bruto digitado no campo de preço, por item, mantido à parte do
  // valor numérico de `cardapio` para que um valor inválido continue visível
  // no campo mesmo sem ser propagado ao estado "oficial" do cardápio.
  const [precoTexto, setPrecoTexto] = useState({});
  const [erros, setErros] = useState({});

  function handleNomeChange(categoriaIndex, itemIndex, novoNome) {
    onChange(_atualizarItem(cardapio, categoriaIndex, itemIndex, { nome: novoNome }));
  }

  function handlePrecoChange(categoriaIndex, itemIndex, novoValor) {
    const chave = `${categoriaIndex}-${itemIndex}`;
    setPrecoTexto((atual) => ({ ...atual, [chave]: novoValor }));

    const numero = Number(novoValor);
    if (novoValor.trim() === "" || !Number.isFinite(numero)) {
      setErros((atual) => ({ ...atual, [chave]: "Preço deve ser um número válido." }));
      return;
    }

    setErros((atual) => {
      const { [chave]: _removido, ...resto } = atual;
      return resto;
    });
    onChange(_atualizarItem(cardapio, categoriaIndex, itemIndex, { preco: numero }));
  }

  return (
    <div>
      {cardapio.categorias.map((categoria, categoriaIndex) => (
        <div key={categoria.nome}>
          <h3>{categoria.nome}</h3>
          {categoria.itens.map((item, itemIndex) => {
            const chave = `${categoriaIndex}-${itemIndex}`;
            const valorPreco = chave in precoTexto ? precoTexto[chave] : String(item.preco);
            const mensagemErro = erros[chave];

            return (
              <div key={chave}>
                <input
                  type="text"
                  value={item.nome}
                  onChange={(evento) =>
                    handleNomeChange(categoriaIndex, itemIndex, evento.target.value)
                  }
                />
                <input
                  type="text"
                  value={valorPreco}
                  onChange={(evento) =>
                    handlePrecoChange(categoriaIndex, itemIndex, evento.target.value)
                  }
                />
                {mensagemErro && <span role="alert">{mensagemErro}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
