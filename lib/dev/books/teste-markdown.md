---
autor: arquivo de teste
---

# Teste de Markdown

Arquivo feito à mão para testar o leitor (não é do Project Gutenberg). Ir para a [tabela](#tabela) ou abrir o [site do Gutenberg](https://www.gutenberg.org).

## Texto

Um parágrafo com **negrito**, *itálico*, ~~riscado~~, `código` e uma nota[^1]. Acentuação: ação, coração, pêssego.

> Uma citação em destaque.

- Primeiro item
- Segundo item
  - Item dentro do segundo
- [x] Tarefa feita
- [ ] Tarefa pendente

## Código

```js
const linha = "uma linha bem comprida para testar a rolagem horizontal do bloco de código quando o texto está em 200%";
```

## Tabela

| Formato | Lê no app? | Observação |
|---|---|---|
| TXT | Sim | Parágrafos se ajustam ao tamanho do texto |
| MD | Sim | Com sumário |
| PDF | Ainda não | |
| EPUB | Ainda não | |

## O que não deve funcionar

A imagem abaixo é remota e não pode ser baixada:

![um gráfico](https://example.com/rastreador.png)

O HTML abaixo deve ser ignorado:

<img src="x" onerror="alert('falhou')">
<script>alert("falhou")</script>

Um [link perigoso](javascript:alert('falhou')) deve virar texto comum.

[^1]: Texto da nota de rodapé.
