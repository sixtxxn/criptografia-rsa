# Sistema 1 — Criptografia RSA

Página que gera um par de chaves RSA e transforma um texto em uma mensagem criptografada. O resultado é lido pelo **Sistema 2 — Descriptografia RSA**, que fica em outra pasta e funciona sozinho.

> **Uso educacional.** O RSA implementado aqui é o RSA "puro", sem padding. Ele serve para estudar a matemática, não para proteger dados de verdade. Veja [Segurança e limitações](#segurança-e-limitações).

---

## Sumário

1. [Sobre o projeto](#sobre-o-projeto)
2. [Tecnologias utilizadas](#tecnologias-utilizadas)
3. [Estrutura dos arquivos](#estrutura-dos-arquivos)
4. [Como executar](#como-executar)
5. [Funcionamento matemático](#funcionamento-matemático)
6. [Explicação do JavaScript](#explicação-do-javascript)
7. [Tratamento de caracteres](#tratamento-de-caracteres)
8. [Formato de saída](#formato-de-saída)
9. [Exemplos de utilização](#exemplos-de-utilização)
10. [Segurança e limitações](#segurança-e-limitações)
11. [Testes](#testes)

---

## Sobre o projeto

### Objetivo

Receber um texto qualquer (com acentos, emojis, quebras de linha, outros alfabetos) e devolver uma versão criptografada que só pode ser lida por quem tem a chave privada.

### O que é RSA

RSA é um algoritmo de criptografia de **chave pública**, criado em 1977 por Rivest, Shamir e Adleman. Ele usa duas chaves:

- **Chave pública (E, N):** pode ser divulgada. Serve para **criptografar**.
- **Chave privada (D, N):** fica em segredo. Serve para **descriptografar**.

A segurança vem de um fato da matemática: multiplicar dois primos grandes é fácil, mas descobrir quais primos foram multiplicados a partir do resultado (fatorar N) é extremamente difícil.

### Como funciona a criptografia neste sistema

1. O texto vira bytes (UTF-8).
2. Os bytes são divididos em blocos pequenos o bastante para caber em N.
3. Cada bloco vira um número inteiro M.
4. Cada número é criptografado com `C = M^E mod N`.
5. Os blocos criptografados são organizados em um texto (o "pacote"), pronto para copiar.

### Finalidade educacional

Todo o cálculo está escrito à mão no `script.js`, sem bibliotecas: geração de primos, inverso modular, exponenciação modular. A ideia é que você consiga ler o código e acompanhar cada etapa.

---

## Tecnologias utilizadas

| Tecnologia | Para que serve aqui |
|---|---|
| **HTML** | Estrutura da página: campos, botões, seções. |
| **CSS** | Aparência: cores, espaçamentos, adaptação para celular. |
| **JavaScript** (puro, sem frameworks) | Toda a lógica: matemática, conversão de texto e interface. |
| **BigInt** | Tipo de número do JavaScript para inteiros de qualquer tamanho. Os números comuns (`Number`) só são exatos até 2^53 − 1 (cerca de 9 quatrilhões); as chaves RSA aqui têm de 155 a 617 dígitos. Um BigInt se escreve com `n` no final: `65537n`. |
| **UTF-8** | Padrão que transforma qualquer caractere Unicode em uma sequência de 1 a 4 bytes. `A` vira 1 byte, `á` vira 2, `こ` vira 3, `😀` vira 4. |

Recursos do navegador usados (não são bibliotecas, já vêm em qualquer navegador moderno):

- `crypto.getRandomValues` — números aleatórios seguros, para sortear os primos.
- `TextEncoder` — converte texto em bytes UTF-8.
- `navigator.clipboard` — copia texto para a área de transferência.

---

## Estrutura dos arquivos

```text
01-CRIPTOGRAFIA/
├── index.html   → a página: três passos (Chaves, Mensagem, Resultado)
├── style.css    → cores, fontes e layout (verde = sistema de criptografia)
├── script.js    → toda a lógica (matemática, UTF-8, blocos, interface)
└── README.md    → este arquivo
```

O `index.html` carrega os outros dois arquivos assim:

```html
<link rel="stylesheet" href="style.css">
<script src="script.js" defer></script>
```

O `defer` faz o script rodar só depois que a página inteira foi lida, então os campos já existem quando o JavaScript procura por eles.

---

## Como executar

Não precisa instalar nada nem rodar servidor.

1. Abra a pasta `01-CRIPTOGRAFIA`.
2. Dê dois cliques em `index.html` (abre no navegador padrão). Chrome, Edge, Firefox e Safari atuais funcionam.
3. **Passo 1 — Chaves:** escolha o tamanho de N (1024 bits é o padrão) e clique em **Gerar chaves**. Aparecem E, N e D.
4. **Passo 2 — Mensagem:** escreva o texto. O contador mostra quantos caracteres e bytes ele tem.
5. Clique em **Criptografar**. (Se você esquecer de gerar as chaves, elas são geradas automaticamente nesse momento.)
6. **Passo 3 — Resultado:** clique em **Copiar resultado**.
7. Para descriptografar, abra o Sistema 2 e cole lá: o resultado, o **D** (botão *Copiar D*) e o **N** (botão *Copiar N*).

Importante: se você gerar chaves novas, o resultado anterior é apagado, porque ele só pode ser aberto com as chaves antigas.

---

## Funcionamento matemático

### Exemplo com números pequenos

Usando primos minúsculos para dar para fazer de cabeça (ou na calculadora):

| Etapa | Conta | Resultado |
|---|---|---|
| 1. Escolher primos | P = 61, Q = 53 | |
| 2. Módulo | N = 61 × 53 | **N = 3233** |
| 3. Totiente | φ(N) = (61 − 1) × (53 − 1) = 60 × 52 | **φ(N) = 3120** |
| 4. Expoente público | E precisa ter mdc(E, 3120) = 1 | **E = 17** |
| 5. Expoente privado | D tal que (17 × D) mod 3120 = 1 | **D = 2753** |

Conferindo o passo 5: 17 × 2753 = 46801 = 15 × 3120 + 1. O resto é 1.

**Como achar o D (Euclides estendido).** Dividimos sucessivamente:

```text
3120 = 183 × 17 + 9
  17 =   1 ×  9 + 8
   9 =   1 ×  8 + 1   ← o mdc é 1, então o inverso existe
   8 =   8 ×  1 + 0
```

Voltando as contas, chegamos a `17 × (−367) + 3120 × 2 = 1`. O x encontrado é −367. Como ele é negativo, somamos 3120: −367 + 3120 = **2753**.

**Criptografar** a letra `O` (byte 79):

```text
C = 79^17 mod 3233 = 1307
```

**Descriptografar** (isso é feito no Sistema 2):

```text
M = 1307^2753 mod 3233 = 79   → byte 79 → "O"
```

### Por que funciona

E e D foram escolhidos de modo que E × D = 1 + k × φ(N) para algum inteiro k. Pelo teorema de Euler, `M^φ(N) mod N = 1`, então:

```text
(M^E)^D = M^(E·D) = M^(1 + k·φ(N)) = M × (M^φ(N))^k ≡ M × 1^k = M   (mod N)
```

### O que o sistema faz de verdade

Igual ao exemplo, mas com números enormes:

- **P e Q** são sorteados com metade dos bits de N (512 bits cada para N de 1024 bits).
- Para saber se um número sorteado é primo, usamos divisão por primos pequenos e o **teste de Miller-Rabin** (24 rodadas).
- **E = 65537**, o valor usado na prática. Se por acaso mdc(65537, φ(N)) ≠ 1, novos primos são sorteados.
- **D** é calculado com o Euclides estendido, como acima.

### Exponenciação modular eficiente

Calcular `M^65537` diretamente geraria um número com milhões de dígitos. O método **elevar ao quadrado e multiplicar** evita isso. Exemplo: 5^13 mod 7. O expoente 13 em binário é `1101`, ou seja, 13 = 8 + 4 + 1:

```text
5^1 mod 7 = 5
5^2 mod 7 = 25 mod 7 = 4
5^4 mod 7 = 4^2 mod 7 = 16 mod 7 = 2
5^8 mod 7 = 2^2 mod 7 = 4

5^13 = 5^8 × 5^4 × 5^1  →  4 × 2 × 5 = 40 mod 7 = 5
```

Só 3 quadrados e 3 multiplicações, e os números nunca passam de 7² = 49.

---

## Explicação do JavaScript

O `script.js` está dividido em seis partes. As partes 1 a 5 não tocam na página; só a parte 6 lê e escreve nos campos. Assim a matemática fica separada da interface.

### Parte 1 — Configurações

| Constante | Valor | Significado |
|---|---|---|
| `CABECALHO_DO_PACOTE` | `"RSA-EDU/1"` | Primeira linha do pacote; identifica o formato e a versão. |
| `RODAPE_DO_PACOTE` | `"FIM"` | Última linha; se faltar, o pacote foi cortado. |
| `EXPOENTE_PUBLICO` | `65537n` | Valor de E. |
| `TAMANHOS_DE_CHAVE_PERMITIDOS` | `[512, 1024, 2048]` | Tamanhos de N aceitos (em bits). |
| `LIMITE_DE_BYTES_DA_MENSAGEM` | `100000` | Tamanho máximo da mensagem em bytes UTF-8. |
| `RODADAS_DO_TESTE_DE_PRIMALIDADE` | `24` | Rodadas do Miller-Rabin. |
| `PRIMOS_PEQUENOS` | lista | Primos menores que 2000 (gerada por `listarPrimosPequenos`). |

### Parte 2 — Matemática com BigInt

#### `potenciaModular(base, expoente, modulo)`
- **Responsabilidade:** calcular `base^expoente mod modulo`.
- **Parâmetros:** três BigInt.
- **Retorno:** BigInt entre 0 e `modulo − 1`.
- **Funcionamento:** método "elevar ao quadrado e multiplicar". Percorre o expoente bit a bit (`% 2n` pega o último bit, `/ 2n` descarta o último bit). A cada volta eleva `potenciaAtual` ao quadrado; quando o bit é 1, multiplica no `resultado`. Tira `% modulo` depois de cada conta.
- **Onde é usada:** `criptografarBloco` (C = M^E mod N), `passaNaRodadaDeMillerRabin` e no autoteste de `gerarChaves`.

#### `euclidesEstendido(a, b)`
- **Responsabilidade:** achar o mdc de `a` e `b` e os números `x`, `y` tais que `a·x + b·y = mdc`.
- **Parâmetros:** dois BigInt.
- **Retorno:** objeto `{ mdc, x, y }`.
- **Funcionamento:** versão iterativa (com laço `while`, sem recursão). Guarda os dois últimos restos e os dois últimos valores de x e de y; a cada passo calcula o quociente e atualiza os três pares com a mesma fórmula `novo = anterior − quociente × atual`.
- **Onde é usada:** `maiorDivisorComum` e `inversoModular`.

#### `maiorDivisorComum(a, b)`
- **Responsabilidade:** devolver o mdc.
- **Parâmetros:** dois BigInt.
- **Retorno:** BigInt.
- **Funcionamento:** chama `euclidesEstendido` e devolve só o campo `mdc`.
- **Onde é usada:** `gerarChaves`, para conferir se mdc(E, φ(N)) = 1.

#### `inversoModular(valor, modulo)`
- **Responsabilidade:** achar D tal que `(valor × D) mod modulo = 1`.
- **Parâmetros:** dois BigInt.
- **Retorno:** BigInt entre 0 e `modulo − 1`.
- **Funcionamento:** usa o `x` do Euclides estendido. Se o mdc não for 1, o inverso não existe e lança um erro. Se `x` vier negativo, soma o módulo.
- **Onde é usada:** `gerarChaves`, para calcular D.

#### `quantidadeDeBits(numero)`
- **Responsabilidade:** contar quantos bits um número positivo tem.
- **Parâmetros:** BigInt positivo.
- **Retorno:** `Number`.
- **Funcionamento:** `numero.toString(2)` escreve o número em binário; o tamanho desse texto é a quantidade de bits.
- **Onde é usada:** `tamanhoDoBlocoEmBytes`, `tamanhoDoModuloEmBytes`, `exibirChaves`.

#### `tamanhoDoBlocoEmBytes(modulo)`
- **Responsabilidade:** dizer quantos bytes da mensagem cabem em cada bloco.
- **Parâmetros:** N (BigInt).
- **Retorno:** `Number`. Para N de 1024 bits, 127.
- **Funcionamento:** `Math.floor((bits de N − 1) / 8)`. Um bloco de k bytes vale no máximo 2^(8k) − 1; com essa conta, 8k ≤ bits − 1, então o bloco é sempre menor que 2^(bits−1), que é menor ou igual a N.
- **Onde é usada:** `criptografarTexto`, `exibirChaves`.

#### `tamanhoDoModuloEmBytes(modulo)`
- **Responsabilidade:** dizer quantos bytes são precisos para escrever N.
- **Parâmetros:** BigInt.
- **Retorno:** `Number`. Para N de 1024 bits, 128.
- **Funcionamento:** `Math.ceil(bits / 8)`.
- **Onde é usada:** `criptografarTexto` (cada bloco cifrado é escrito com esse tamanho fixo) e `gerarNumeroAleatorioEntre`.

### Parte 3 — Aleatórios, primos e chaves

#### `gerarBytesAleatorios(quantidade)`
- **Responsabilidade:** produzir bytes aleatórios seguros.
- **Parâmetros:** quantidade de bytes (`Number`).
- **Retorno:** `Uint8Array` (lista de bytes de 0 a 255).
- **Funcionamento:** cria a lista e preenche com `crypto.getRandomValues`.
- **Onde é usada:** `gerarCandidatoAPrimo`, `gerarNumeroAleatorioEntre`.

#### `bytesParaNumero(bytes)`
- **Responsabilidade:** juntar uma lista de bytes em um único número.
- **Parâmetros:** `Uint8Array`.
- **Retorno:** BigInt.
- **Funcionamento:** para cada byte, `numero = numero × 256 + byte`. O primeiro byte fica mais à esquerda (big-endian). Exemplo: `[0x4F, 0x69]` → 79 × 256 + 105 = 20329.
- **Onde é usada:** `criptografarTexto` (bloco → número M), `gerarCandidatoAPrimo`, `gerarNumeroAleatorioEntre`.

#### `gerarCandidatoAPrimo(bits)`
- **Responsabilidade:** sortear um número ímpar com exatamente `bits` bits.
- **Parâmetros:** `Number` (ex.: 512).
- **Retorno:** BigInt.
- **Funcionamento:** sorteia bytes, descarta os bits a mais com `>>` e liga três bits com `|`: o mais alto (garante o tamanho), o segundo mais alto (garante que P × Q tenha exatamente o dobro de bits) e o último (número ímpar; nenhum primo grande é par).
- **Onde é usada:** `gerarPrimo`.

#### `gerarNumeroAleatorioEntre(minimo, maximo)`
- **Responsabilidade:** sortear um BigInt no intervalo [minimo, maximo].
- **Parâmetros:** dois BigInt.
- **Retorno:** BigInt.
- **Funcionamento:** sorteia um número com um byte a mais que o tamanho do intervalo e usa o resto da divisão (`%`) para trazê-lo ao intervalo.
- **Onde é usada:** `ehProvavelmentePrimo` (bases do Miller-Rabin).

#### `listarPrimosPequenos(limite)`
- **Responsabilidade:** listar os primos menores que `limite`.
- **Parâmetros:** `Number`.
- **Retorno:** array de BigInt.
- **Funcionamento:** Crivo de Eratóstenes: marca os múltiplos de cada primo encontrado; o que sobra sem marca é primo.
- **Onde é usada:** uma única vez, para criar a constante `PRIMOS_PEQUENOS`.

#### `passaNaRodadaDeMillerRabin(n, base, d, s)`
- **Responsabilidade:** executar uma rodada do teste de Miller-Rabin.
- **Parâmetros:** `n` (candidato), `base` (sorteada), `d` e `s` tais que n − 1 = d × 2^s (BigInt, BigInt, BigInt, Number).
- **Retorno:** `true` se n pode ser primo; `false` se ficou provado que n é composto.
- **Funcionamento:** calcula x = base^d mod n. Se x for 1 ou n − 1, passa. Senão eleva x ao quadrado até s − 1 vezes; se aparecer n − 1, passa. Se não aparecer, n é composto.
- **Onde é usada:** `ehProvavelmentePrimo`.

#### `ehProvavelmentePrimo(n)`
- **Responsabilidade:** dizer se `n` é primo (com probabilidade de erro menor que 1 em 2^48).
- **Parâmetros:** BigInt.
- **Retorno:** `true` ou `false`.
- **Funcionamento:** tenta dividir pelos primos de `PRIMOS_PEQUENOS` (descarta rápido a maioria dos candidatos), escreve n − 1 como d × 2^s e roda 24 rodadas de Miller-Rabin com bases aleatórias.
- **Onde é usada:** `gerarPrimo`.

#### `gerarPrimo(bits)`
- **Responsabilidade:** devolver um primo com o número de bits pedido.
- **Parâmetros:** `Number`.
- **Retorno:** BigInt.
- **Funcionamento:** repete `gerarCandidatoAPrimo` até `ehProvavelmentePrimo` responder `true`. Perto de 2^512, cerca de 1 em cada 177 ímpares é primo, então isso termina rápido.
- **Onde é usada:** `gerarChaves`.

#### `gerarChaves(bitsDoModulo)`
- **Responsabilidade:** criar o par de chaves completo.
- **Parâmetros:** 512, 1024 ou 2048 (`Number`).
- **Retorno:** objeto `{ p, q, n, phi, e, d }`, todos BigInt.
- **Funcionamento:** sorteia P e Q diferentes; calcula N e φ(N); confere mdc(E, φ(N)) = 1; calcula D com `inversoModular`; faz um autoteste (cifra e decifra o número 123456789 e confere se (E × D) mod φ(N) = 1). Se alguma condição falhar, sorteia novos primos.
- **Onde é usada:** `gerarChavesPelaTela`.

### Parte 4 — Texto, UTF-8 e blocos

#### `encontrarSurrogateSolto(texto)`
- **Responsabilidade:** achar caracteres "quebrados" no texto.
- **Parâmetros:** `string`.
- **Retorno:** posição do problema (`Number`) ou −1 se estiver tudo certo.
- **Funcionamento:** o JavaScript guarda emojis e outros caracteres raros como um par de unidades (alta + baixa). O laço confere que toda unidade alta (0xD800–0xDBFF) é seguida por uma baixa (0xDC00–0xDFFF) e que não existe baixa sozinha. Uma unidade solta não é um caractere válido e, se fosse para o `TextEncoder`, seria trocada por `�` — o que alteraria o texto sem aviso.
- **Onde é usada:** `validarTextoParaCriptografar`, `atualizarContador`.

#### `textoParaBytesUtf8(texto)`
- **Responsabilidade:** converter texto em bytes UTF-8.
- **Parâmetros:** `string`.
- **Retorno:** `Uint8Array`.
- **Funcionamento:** `new TextEncoder().encode(texto)`.
- **Onde é usada:** `validarTextoParaCriptografar`, `atualizarContador`.

#### `dividirEmBlocos(bytes, tamanhoMaximo)`
- **Responsabilidade:** cortar os bytes em pedaços.
- **Parâmetros:** `Uint8Array` e `Number`.
- **Retorno:** array de `Uint8Array`, na ordem original. Todos têm `tamanhoMaximo` bytes, menos o último, que pode ser menor.
- **Funcionamento:** laço que anda de `tamanhoMaximo` em `tamanhoMaximo` usando `slice`.
- **Onde é usada:** `criptografarTexto`.

#### `numeroParaHexadecimal(numero, quantidadeDeDigitos)`
- **Responsabilidade:** escrever um número em hexadecimal com tamanho fixo.
- **Parâmetros:** BigInt e `Number`.
- **Retorno:** `string`, completada com zeros à esquerda (`padStart`).
- **Onde é usada:** `criptografarTexto` (cada bloco cifrado tem o mesmo número de dígitos).

#### `calcularFinalDoModulo(modulo)`
- **Responsabilidade:** gerar uma "impressão digital" curta de N.
- **Parâmetros:** BigInt.
- **Retorno:** `string` com os 16 últimos dígitos hexadecimais de N.
- **Funcionamento:** `toString(16)`, `slice(-16)` e `padStart(16, "0")` (para N pequenos).
- **Onde é usada:** `montarPacote`. O Sistema 2 tem uma cópia desta função para conferir se o N colado é o mesmo.

### Parte 5 — Criptografia e pacote

#### `criptografarBloco(numeroDoBloco, chavePublica)`
- **Responsabilidade:** aplicar `C = M^E mod N` em um bloco.
- **Parâmetros:** M (BigInt) e `{ e, n }`.
- **Retorno:** C (BigInt).
- **Funcionamento:** confere que M < N (exigência do RSA) e chama `potenciaModular`.
- **Onde é usada:** `criptografarTexto`.

#### `montarPacote(modulo, totalDeBytes, tamanhoDoBloco, blocosCifrados)`
- **Responsabilidade:** montar o texto de saída.
- **Parâmetros:** N (BigInt), total de bytes (`Number`), bytes por bloco (`Number`), array de `{ tamanho, hexadecimal }`.
- **Retorno:** `string` com as linhas separadas por `\n` (formato explicado em [Formato de saída](#formato-de-saída)).
- **Onde é usada:** `criptografarTexto`.

#### `validarTextoParaCriptografar(texto)`
- **Responsabilidade:** recusar textos que não podem ser criptografados.
- **Parâmetros:** `string`.
- **Retorno:** os bytes UTF-8 (`Uint8Array`), ou lança um `Error` com explicação.
- **Funcionamento:** confere se o texto está vazio, se tem caractere quebrado (`encontrarSurrogateSolto`) e se passa do limite de 100 000 bytes.
- **Onde é usada:** `aoClicarCriptografar` (para mostrar o erro na hora) e `criptografarTexto`.

#### `criptografarTexto(texto, chavePublica)`
- **Responsabilidade:** executar todo o processo de criptografia.
- **Parâmetros:** `string` e `{ e, n }`.
- **Retorno:** objeto `{ pacote, totalDeBytes, quantidadeDeBlocos, tamanhoDoBloco }`.
- **Funcionamento:** valida e converte o texto em bytes, divide em blocos, converte cada bloco em número, criptografa, escreve em hexadecimal com tamanho fixo e monta o pacote.
- **Onde é usada:** `aoClicarCriptografar`.

### Parte 6 — Interface

| Função | O que faz | Chamada por |
|---|---|---|
| `elemento(id)` | Atalho para `document.getElementById(id)`. Retorna o elemento. | Todas as funções da interface. |
| `mostrarAviso(texto, tipo)` | Escreve na faixa de aviso e aplica a cor do `tipo` (`"sucesso"`, `"erro"`, `"info"`). Não retorna nada. | Botões e `copiarCampo`. |
| `atualizarContador()` | Mostra "X caracteres · Y bytes em UTF-8". `Array.from(texto).length` conta cada emoji como 1 caractere. | Evento `input` da mensagem e `iniciarInterface`. |
| `exibirChaves(chaves)` | Recebe o objeto de `gerarChaves` e preenche E, N, D e a área "Ver os números usados no cálculo". | `gerarChavesPelaTela`. |
| `limparResultado()` | Apaga o resultado e o resumo. | `gerarChavesPelaTela` (chaves novas invalidam o resultado antigo). |
| `gerarChavesPelaTela()` | Lê o tamanho escolhido, chama `gerarChaves`, guarda em `chavesAtuais` e mostra na tela. | `aoClicarGerarChaves`, `aoClicarCriptografar`. |
| `aoClicarGerarChaves()` | Desativa o botão, mostra "Procurando números primos..." e, 30 ms depois (tempo para a tela atualizar), gera as chaves. | Clique em **Gerar chaves**. |
| `aoClicarCriptografar()` | Valida o texto; se ainda não houver chaves, gera; criptografa e mostra o resultado e o resumo. | Clique em **Criptografar**. |
| `copiarCampo(idDoCampo, nomeDoCampo)` | Copia o valor do campo. Usa `navigator.clipboard.writeText`; se o navegador recusar, usa a função interna `copiarDoJeitoAntigo` (seleciona e executa `document.execCommand("copy")`). | Botões com o atributo `data-copiar`. |
| `iniciarInterface()` | Liga os botões e o contador às funções. | Evento `DOMContentLoaded` (página carregada). |

A variável `chavesAtuais` guarda o par de chaves atual (`null` até a primeira geração).

### Recursos de JavaScript usados

- **`BigInt`**: `123n`, `BigInt(5)`. Não pode ser misturado com `Number` na mesma conta (`1n + 1` dá erro), por isso o código converte com `BigInt(...)` e `Number(...)` quando precisa. A divisão `/` entre BigInt descarta a parte decimal.
- **Operadores de bits**: `<<` (desloca para a esquerda: `1n << 3n` = 8n), `>>` (desloca para a direita), `|` (liga bits).
- **`Uint8Array`**: lista de bytes de tamanho fixo; cada posição vai de 0 a 255.
- **`TextEncoder`**: converte texto em UTF-8.
- **`toString(2)` e `toString(16)`**: escreve o número em binário ou hexadecimal.
- **`padStart`**: completa um texto à esquerda até um tamanho.
- **`throw new Error(...)` e `try/catch`**: as funções lançam erros com mensagens claras; a interface captura e mostra na faixa de aviso.
- **`setTimeout`**: adia as contas pesadas por 30 ms para que o aviso "aguarde" apareça antes.
- **`addEventListener`**: liga um evento (clique, digitação) a uma função.
- **`data-*` e `dataset`**: os botões de copiar guardam no HTML qual campo copiam (`data-copiar="valor-n"`).
- **`"use strict"`**: modo estrito, que transforma alguns erros silenciosos em erros visíveis.

---

## Tratamento de caracteres

### Por que UTF-8

O RSA trabalha com números, então o texto precisa virar números. O caminho é:

```text
Texto original → UTF-8 → bytes → blocos → números (BigInt) → RSA
```

UTF-8 cobre **todos** os caracteres Unicode. Exemplo real do texto `Oi á 😀`:

| Caractere | Bytes UTF-8 (hexadecimal) |
|---|---|
| `O` | `4f` |
| `i` | `69` |
| espaço | `20` |
| `á` | `c3 a1` |
| espaço | `20` |
| `😀` | `f0 9f 98 80` |

Total: 6 caracteres, 10 bytes.

### O que é preservado

- **Nada é normalizado.** `é` pode ser um caractere só (U+00E9) ou `e` + acento combinante (U+0065 U+0301). Visualmente são iguais, mas os bytes são diferentes. O sistema mantém exatamente a forma que foi digitada.
- **Espaços, tabulações e quebras de linha** são bytes como qualquer outro.
- **Emojis compostos** (família, bandeiras, tons de pele) são sequências de vários caracteres; todos são preservados.
- Observação: campos de texto do navegador guardam quebras de linha como `\n`. Um texto colado com `\r\n` (Windows) chega ao script já como `\n`.

### Divisão em blocos

No RSA, cada número criptografado precisa ser **menor que N**. Por isso os bytes são cortados em blocos de `tamanhoDoBlocoEmBytes(N)` bytes:

| Tamanho de N | Bytes por bloco | Dígitos hexadecimais por bloco cifrado |
|---|---|---|
| 512 bits | 63 | 128 |
| 1024 bits | 127 | 256 |
| 2048 bits | 255 | 512 |

Um caractere pode ficar dividido entre dois blocos (por exemplo, os 4 bytes de um emoji). Não tem problema: o Sistema 2 junta todos os bytes de volta antes de converter para texto.

### Zeros à esquerda

O byte `0x00` (caractere U+0000) no início de um bloco "some" quando o bloco vira número: `[0, 0, 65]` e `[65]` valem os dois 65. Por isso o pacote guarda **o tamanho de cada bloco em bytes**. Com essa informação, o Sistema 2 sabe que precisa recolocar dois zeros na frente.

---

## Formato de saída

Exemplo ilustrativo (N de 1024 bits, texto `Olá, mundo!` com 12 bytes; o hexadecimal foi encurtado aqui, o real tem 256 dígitos):

```text
RSA-EDU/1
N-FINAL=72a717f8f1eddf07
TOTAL-BYTES=12
TAMANHO-BLOCO=127
BLOCOS=1
BLOCO-1=12:3af8e27f4b78619206236c74f3caab64...d342f81d1
FIM
```

| Linha | Significado |
|---|---|
| `RSA-EDU/1` | Identifica o formato (versão 1). |
| `N-FINAL=` | Últimos 16 dígitos hexadecimais de N. O Sistema 2 compara com o N que você colou e avisa se for outro. |
| `TOTAL-BYTES=` | Quantidade de bytes UTF-8 do texto original. |
| `TAMANHO-BLOCO=` | Máximo de bytes por bloco para este N. |
| `BLOCOS=` | Quantidade de linhas `BLOCO-` que vêm a seguir. |
| `BLOCO-i=tamanho:hex` | `i` = posição do bloco (1, 2, 3...), `tamanho` = bytes originais do bloco, `hex` = valor criptografado C em hexadecimal minúsculo, sempre com 2 × (bytes de N) dígitos. |
| `FIM` | Marca o final. |

Regras que o Sistema 2 confere: as linhas precisam estar nessa ordem; a soma dos tamanhos dos blocos tem que dar `TOTAL-BYTES`; cada `hex` tem que ter o número exato de dígitos e valer menos que N. Linhas em branco e espaços nas pontas das linhas são ignorados, então colar com uma linha a mais ou a menos no final não causa problema.

O pacote **não** contém a chave privada. Para descriptografar é preciso levar D e N separadamente.

---

## Exemplos de utilização

### Exemplo 1 — mensagem curta

1. Clique em **Gerar chaves** (1024 bits).
2. Escreva `Olá 😀 🚀`. O contador mostra "7 caracteres · 14 bytes em UTF-8".
3. Clique em **Criptografar**. Abaixo do resultado aparece "14 bytes em 1 bloco de até 127 bytes".
4. Copie o resultado, D e N e cole no Sistema 2.

### Exemplo 2 — a mesma mensagem duas vezes

Criptografe `teste` duas vezes com as mesmas chaves: o resultado sai **idêntico**. Isso acontece porque não há padding (nenhuma parte aleatória). É uma das fraquezas do RSA puro, explicada abaixo.

### Exemplo 3 — trocar as chaves

Depois de criptografar, clique em **Gerar chaves** de novo. O resultado é apagado. Se você tentar abrir um resultado antigo no Sistema 2 com o N novo, ele avisa: "Este N não é o mesmo que foi usado para criptografar a mensagem."

### Exemplo 4 — chave de brinquedo (para conferir na mão)

O Sistema 2 aceita qualquer chave válida, inclusive a do exemplo pequeno (N = 3233, D = 2753). Cole no Sistema 2:

- D: `2753`
- N: `3233`
- Mensagem:

```text
RSA-EDU/1
N-FINAL=0000000000000ca1
TOTAL-BYTES=2
TAMANHO-BLOCO=1
BLOCOS=2
BLOCO-1=1:051b
BLOCO-2=1:0c6b
FIM
```

Resultado: `Oi`. Os blocos são `0x051b` = 1307 (79^17 mod 3233, letra `O`) e `0x0c6b` = 3179 (105^17 mod 3233, letra `i`).

---

## Segurança e limitações

**Este sistema não é seguro para uso real.** Motivos:

1. **Sem padding (RSA "textbook").** A mesma mensagem sempre gera o mesmo resultado, então quem observa pode reconhecer mensagens repetidas ou testar palpites: basta criptografar "sim" e "não" com a chave pública e comparar. Também é possível alterar um bloco de forma previsível (o RSA puro é "maleável").
2. **Blocos independentes.** Cada bloco é criptografado sozinho. Um atacante pode trocar a ordem ou repetir blocos cifrados entre mensagens com a mesma chave.
3. **Sem autenticação.** Nada prova quem escreveu a mensagem nem garante que ela não foi trocada por outra criptografada com a mesma chave pública. O sistema só detecta alterações "grosseiras".
4. **Implementação não protegida.** `potenciaModular` leva tempos diferentes conforme os bits do expoente, o que permite ataques de tempo. Bibliotecas profissionais evitam isso.
5. **Tamanho de chave.** 512 bits já foi quebrado na prática e está aqui só por ser rápido. Hoje, o mínimo recomendado para RSA é 2048 bits.
6. **Chave privada à vista.** A página mostra D na tela e não guarda nada com proteção.

Sistemas de verdade usam **RSA-OAEP com SHA-256** (que adiciona aleatoriedade e verificação a cada mensagem), normalmente combinado com uma cifra simétrica como AES-GCM para o conteúdo, sempre por meio de bibliotecas confiáveis (no navegador, a Web Crypto API: `crypto.subtle`).

Limites práticos deste sistema:

- Mensagem de até 100 000 bytes UTF-8.
- Gerar chaves de 2048 bits pode levar de alguns décimos de segundo a alguns segundos, dependendo do computador e da sorte no sorteio dos primos.
- Durante as contas a página fica parada; isso é esperado.

---

## Testes

Os testes foram executados de duas formas: (1) os dois `script.js` carregados em ambientes separados no Node.js, criptografando no Sistema 1 e descriptografando no Sistema 2; (2) as duas páginas abertas no Google Chrome (automatizado), copiando D, N e o resultado de uma página para a outra.

Em todos os casos a comparação foi feita **texto a texto e byte a byte** (bytes UTF-8 do original contra os do recuperado).

### Textos testados (chaves de 512, 1024 e 2048 bits)

| Texto | Resultado esperado | Obtido |
|---|---|---|
| `Ola Mundo` | idêntico | idêntico |
| `Olá, mundo!` | idêntico | idêntico |
| `1234567890` | idêntico | idêntico |
| `@#$%¨&*()_+-=[]{}` | idêntico | idêntico |
| `áéíóú ç ã õ` | idêntico | idêntico |
| `こんにちは` | idêntico | idêntico |
| `Olá 😀 🚀` | idêntico | idêntico |
| Várias linhas (incluindo linhas vazias no final) | idêntico | idêntico |
| Tabulações (`a\tb\t\tc\t`) | idêntico | idêntico |
| Combinados: `e` + U+0301, `a` + U+0303, família 👨‍👩‍👧, bandeira 🇧🇷, 👍🏽 | idêntico, sem normalizar | idêntico |
| Outros alfabetos: russo, árabe, hebraico, chinês, símbolos ∑∫√∞≠≤ | idêntico | idêntico |
| U+FEFF (BOM) no início do texto | preservado | preservado |
| Bytes zero (U+0000) no início, meio e fim | preservados | preservados |
| Só espaços (`"   "`) | idêntico | idêntico |
| Texto longo: 88 500 bytes, 697 blocos (1024 bits) | idêntico | idêntico (cerca de 1,5 s para descriptografar) |

### Chaves

- N tem exatamente o número de bits escolhido (512, 1024 e 2048).
- P × Q = N e (E × D) mod φ(N) = 1.
- Exemplo pequeno: inverso de 17 mod 3120 = 2753; 65^17 mod 3233 = 2790; 2790^2753 mod 3233 = 65.

### Entradas inválidas no Sistema 1

| Situação | Mensagem exibida |
|---|---|
| Texto vazio | "Escreva a mensagem antes de criptografar." |
| Caractere quebrado (metade de um emoji) | "O texto tem um caractere quebrado na posição 4 (...)" |
| Mais de 100 000 bytes | "A mensagem tem 100001 bytes. O limite é 100000 bytes (cerca de 100 KB)." |

Os testes de mensagens corrompidas e chaves erradas estão no README do Sistema 2.
