# Sistema 2 — Descriptografia RSA

Página que recebe a chave privada (D e N) e uma mensagem gerada pelo **Sistema 1 — Criptografia RSA** e recupera exatamente o texto original.

Este projeto é independente: não usa nenhum arquivo do Sistema 1. Os dois só combinam o **formato** da mensagem criptografada, descrito em [Compatibilidade](#compatibilidade).

> **Uso educacional.** O RSA implementado aqui é o RSA "puro", sem padding. Ele serve para estudar a matemática, não para proteger dados de verdade. Veja [Segurança e limitações](#segurança-e-limitações).

---

## Sumário

1. [Sobre o projeto](#sobre-o-projeto)
2. [Tecnologias utilizadas](#tecnologias-utilizadas)
3. [Estrutura dos arquivos](#estrutura-dos-arquivos)
4. [Como executar](#como-executar)
5. [Funcionamento matemático](#funcionamento-matemático)
6. [Explicação do JavaScript](#explicação-do-javascript)
7. [Reconstrução dos caracteres](#reconstrução-dos-caracteres)
8. [Compatibilidade](#compatibilidade)
9. [Exemplos de utilização](#exemplos-de-utilização)
10. [Segurança e limitações](#segurança-e-limitações)
11. [Testes](#testes)

---

## Sobre o projeto

### Objetivo

Desfazer a criptografia feita pelo Sistema 1. Quem tem a chave privada consegue transformar os blocos criptografados de volta no texto original, sem perder nenhum caractere: acentos, emojis, quebras de linha, tabulações, outros alfabetos.

### Como funciona a descriptografia

No RSA existem duas chaves:

- **Pública (E, N):** usada pelo Sistema 1 para criptografar.
- **Privada (D, N):** usada aqui para descriptografar.

O processo é o inverso do Sistema 1:

```text
Pacote → blocos → M = C^D mod N → bytes (no tamanho certo) → UTF-8 → texto original
```

Antes de fazer qualquer conta, o sistema confere se a chave e o pacote estão em ordem. Se algo estiver errado (campo vazio, N diferente, bloco faltando, mensagem cortada, chave errada), ele explica o problema em vez de mostrar um texto estranho.

---

## Tecnologias utilizadas

| Tecnologia | Para que serve aqui |
|---|---|
| **HTML** | Estrutura da página: campos, botões, seções. |
| **CSS** | Aparência: cores, espaçamentos, adaptação para celular. |
| **JavaScript** (puro, sem frameworks) | Toda a lógica: leitura do pacote, matemática e conversão de volta para texto. |
| **BigInt** | Inteiros de qualquer tamanho. D e N têm centenas de dígitos; o `Number` comum só é exato até 2^53 − 1. Um BigInt se escreve com `n` no final: `256n`. |
| **UTF-8** | Padrão que transforma caracteres em bytes (1 a 4 bytes por caractere). Aqui fazemos o caminho de volta: bytes → caracteres. |

Recursos do navegador usados (já vêm em qualquer navegador moderno, não são bibliotecas):

- `TextDecoder` — converte bytes UTF-8 em texto. Usado no modo rigoroso (`fatal: true`).
- `navigator.clipboard` — copia o texto recuperado.

---

## Estrutura dos arquivos

```text
02-DESCRIPTOGRAFIA/
├── index.html   → a página: três passos (Chave privada, Mensagem criptografada, Texto original)
├── style.css    → cores, fontes e layout (cor ferrugem = sistema de descriptografia)
├── script.js    → toda a lógica (validação, matemática, bytes, UTF-8, interface)
└── README.md    → este arquivo
```

O `index.html` carrega os outros dois arquivos com:

```html
<link rel="stylesheet" href="style.css">
<script src="script.js" defer></script>
```

---

## Como executar

Não precisa instalar nada nem rodar servidor.

1. Abra a pasta `02-DESCRIPTOGRAFIA` e dê dois cliques em `index.html`.
2. No Sistema 1 (outra aba ou janela), gere as chaves e criptografe uma mensagem.
3. **Passo 1 — Chave privada:** no Sistema 1, clique em *Copiar D* e cole no campo **D**. Faça o mesmo com *Copiar N* → campo **N**.
4. **Passo 2 — Mensagem criptografada:** no Sistema 1, clique em *Copiar resultado* e cole no campo grande (de `RSA-EDU/1` até `FIM`).
5. Clique em **Descriptografar**.
6. **Passo 3 — Texto original:** o texto aparece, com um resumo (caracteres, bytes e blocos). Use **Copiar texto** se quiser.

**Limpar tudo** apaga os campos para começar de novo.

Dicas:
- Espaços e quebras de linha no meio de D e N são ignorados, então não tem problema se o número quebrar em várias linhas ao colar.
- Linhas em branco e espaços nas pontas das linhas do pacote também são ignorados.
- O aviso (verde ou vermelho) fica preso no alto da tela, então aparece mesmo se você estiver lá embaixo na página.

---

## Funcionamento matemático

### A operação

Para cada bloco criptografado C:

```text
M = C^D mod N
```

M é o número que o Sistema 1 montou a partir dos bytes do texto.

### Exemplo com números pequenos

Chave de brinquedo: P = 61, Q = 53, N = 3233, φ(N) = 3120, E = 17, D = 2753.

O Sistema 1 criptografou a letra `O` (byte 79):

```text
C = 79^17 mod 3233 = 1307
```

Aqui fazemos:

```text
M = 1307^2753 mod 3233 = 79   →  byte 79  →  "O"
```

### Por que dá certo

D foi calculado para que E × D = 1 + k × φ(N). Então:

```text
C^D = (M^E)^D = M^(E·D) = M^(1 + k·φ(N)) = M × (M^φ(N))^k
```

Pelo teorema de Euler, `M^φ(N) mod N = 1`, logo `C^D mod N = M × 1^k = M`.

Conferindo o exemplo: 17 × 2753 = 46801 = 1 + 15 × 3120.

### Por que precisa de um método rápido

D tem centenas de dígitos. Calcular `C^D` direto é impossível (o número teria mais dígitos que átomos no universo). O método **elevar ao quadrado e multiplicar** percorre D bit a bit e tira o `mod N` depois de cada conta, então os números nunca passam de N². Para N de 1024 bits são cerca de 1024 quadrados e, em média, 512 multiplicações por bloco.

Exemplo: 5^13 mod 7. 13 em binário é `1101` (8 + 4 + 1):

```text
5^1 mod 7 = 5
5^2 mod 7 = 4
5^4 mod 7 = 4^2 mod 7 = 2
5^8 mod 7 = 2^2 mod 7 = 4

5^13 = 5^8 × 5^4 × 5^1  →  4 × 2 × 5 = 40 mod 7 = 5
```

---

## Explicação do JavaScript

O `script.js` está dividido em seis partes. As partes 1 a 5 não tocam na página; só a parte 6 lê e escreve nos campos.

### Parte 1 — Configurações

| Constante | Valor | Significado |
|---|---|---|
| `CABECALHO_DO_PACOTE` | `"RSA-EDU/1"` | Primeira linha esperada no pacote. |
| `RODAPE_DO_PACOTE` | `"FIM"` | Última linha esperada. |
| `LIMITE_DE_BYTES_DA_MENSAGEM` | `100000` | Mesmo limite do Sistema 1. |
| `LIMITE_DE_DIGITOS_DA_CHAVE` | `2000` | Máximo de dígitos aceitos em D e N (uma chave de 2048 bits tem cerca de 617). |
| `LINHAS_DE_CABECALHO` | `5` | Linhas antes dos blocos: `RSA-EDU/1`, `N-FINAL`, `TOTAL-BYTES`, `TAMANHO-BLOCO`, `BLOCOS`. |

### Parte 2 — Matemática com BigInt

#### `potenciaModular(base, expoente, modulo)`
- **Responsabilidade:** calcular `base^expoente mod modulo`.
- **Parâmetros:** três BigInt.
- **Retorno:** BigInt entre 0 e `modulo − 1`.
- **Funcionamento:** "elevar ao quadrado e multiplicar". A cada volta do laço, `expoenteRestante % 2n` diz se o bit atual é 1 (aí multiplica no resultado); `potenciaAtual` é elevada ao quadrado; `expoenteRestante / 2n` passa para o próximo bit.
- **Onde é usada:** `descriptografarBloco`.

#### `quantidadeDeBits(numero)`
- **Responsabilidade:** contar os bits de um número positivo.
- **Parâmetros:** BigInt.
- **Retorno:** `Number`.
- **Funcionamento:** tamanho do texto de `numero.toString(2)` (o número escrito em binário).
- **Onde é usada:** `tamanhoDoBlocoEmBytes`, `tamanhoDoModuloEmBytes`.

#### `tamanhoDoBlocoEmBytes(modulo)`
- **Responsabilidade:** calcular quantos bytes de mensagem cabem em um bloco para este N.
- **Parâmetros:** N (BigInt).
- **Retorno:** `Number` — `Math.floor((bits de N − 1) / 8)`. É a mesma regra do Sistema 1; para N de 1024 bits, 127.
- **Onde é usada:** `validarChave` (N pequeno demais) e `interpretarPacote` (confere `TAMANHO-BLOCO`).

#### `tamanhoDoModuloEmBytes(modulo)`
- **Responsabilidade:** calcular quantos bytes ocupa N.
- **Parâmetros:** BigInt.
- **Retorno:** `Number` — `Math.ceil(bits / 8)`. Cada bloco cifrado tem o dobro disso em dígitos hexadecimais.
- **Onde é usada:** `lerLinhaDeBloco`.

#### `calcularFinalDoModulo(modulo)`
- **Responsabilidade:** gerar a "impressão digital" curta de N.
- **Parâmetros:** BigInt.
- **Retorno:** `string` com os 16 últimos dígitos hexadecimais de N (com zeros à esquerda se N for pequeno).
- **Onde é usada:** `interpretarPacote`, para comparar com a linha `N-FINAL` do pacote.

### Parte 3 — Leitura e validação da chave

#### `lerNumeroDecimal(textoDoCampo, nomeDoCampo)`
- **Responsabilidade:** transformar o texto de um campo (D ou N) em BigInt.
- **Parâmetros:** o texto digitado (`string`) e o nome do campo para a mensagem de erro (`"D"` ou `"N"`).
- **Retorno:** BigInt, ou lança `Error`.
- **Funcionamento:** remove espaços e quebras de linha (`replace(/\s+/g, "")`); recusa campo vazio, qualquer coisa que não seja algarismo (`/^[0-9]+$/`) e números com mais de 2000 dígitos; converte com `BigInt(...)`.
- **Onde é usada:** `lerChavePrivadaDaTela`.

#### `validarChave(d, n)`
- **Responsabilidade:** barrar valores que nunca poderiam ser uma chave RSA.
- **Parâmetros:** D e N (BigInt).
- **Retorno:** nada; lança `Error` se houver problema.
- **Funcionamento:** confere que N é ímpar (produto de dois primos ímpares), que N é grande o bastante para pelo menos 1 byte por bloco e que 0 < D < N.
- **Onde é usada:** `lerChavePrivadaDaTela`.

Observação: só com D e N não dá para provar que D é o par certo de N. Isso é descoberto durante a descriptografia (veja `numeroParaBytes` e `bytesUtf8ParaTexto`).

### Parte 4 — Leitura e validação do pacote

#### `lerCampoDoCabecalho(linha, nomeEsperado)`
- **Responsabilidade:** ler uma linha `NOME=VALOR`.
- **Parâmetros:** a linha (`string`, pode ser `undefined` se o pacote for curto demais) e o nome esperado (ex.: `"TOTAL-BYTES"`).
- **Retorno:** o texto depois do `=`, ou lança `Error` se a linha não começar com `NOME=`.
- **Onde é usada:** `interpretarPacote`.

#### `lerInteiroPositivo(texto, descricao)`
- **Responsabilidade:** converter um valor do cabeçalho em `Number`.
- **Parâmetros:** o texto e uma descrição para o erro.
- **Retorno:** `Number`, ou lança `Error`.
- **Funcionamento:** aceita só de 1 a 9 algarismos (`/^[0-9]{1,9}$/`), o que já impede valores absurdos.
- **Onde é usada:** `interpretarPacote`.

#### `lerLinhaDeBloco(linha, posicaoEsperada, n, tamanhoDoBloco)`
- **Responsabilidade:** ler e conferir uma linha `BLOCO-i=tamanho:hex`.
- **Parâmetros:** a linha (`string`), a posição que o bloco deveria ter (`Number`), N (BigInt) e o máximo de bytes por bloco (`Number`).
- **Retorno:** objeto `{ tamanho, valorCifrado }` (`Number`, BigInt), ou lança `Error`.
- **Funcionamento:** usa a expressão regular `/^BLOCO-([0-9]+)=([0-9]+):([0-9a-fA-F]+)$/` para separar as três partes. Depois confere: a posição é a esperada (ordem certa); o tamanho está entre 1 e `tamanhoDoBloco`; o hexadecimal tem exatamente 2 × (bytes de N) dígitos (nem cortado, nem com dígitos a mais); o valor é menor que N. Converte o hexadecimal com `BigInt("0x" + hex)`.
- **Onde é usada:** `interpretarPacote`.

#### `interpretarPacote(textoDoPacote, n)`
- **Responsabilidade:** validar o pacote inteiro e extrair os blocos.
- **Parâmetros:** o texto colado (`string`) e N (BigInt).
- **Retorno:** objeto `{ totalDeBytes, blocos }`, onde `blocos` é um array de `{ tamanho, valorCifrado }` na ordem original. Lança `Error` em qualquer problema.
- **Funcionamento, na ordem:**
  1. Divide em linhas (aceita `\n` e `\r\n`), tira espaços das pontas (`trim`) e descarta linhas vazias.
  2. Pacote vazio → erro.
  3. Primeira linha diferente de `RSA-EDU/1` → "não parece ter saído do sistema de criptografia".
  4. Última linha diferente de `FIM` → "mensagem incompleta".
  5. `N-FINAL` diferente do final do N colado → "Este N não é o mesmo...".
  6. `TOTAL-BYTES` entre 1 e 100 000.
  7. `TAMANHO-BLOCO` igual ao calculado para este N.
  8. `BLOCOS` igual ao número de linhas de bloco encontradas.
  9. Cada bloco passa por `lerLinhaDeBloco`.
  10. A soma dos tamanhos dos blocos tem que dar `TOTAL-BYTES`.
- **Onde é usada:** `descriptografarPacote`.

### Parte 5 — Descriptografia e reconstrução

#### `descriptografarBloco(valorCifrado, chavePrivada)`
- **Responsabilidade:** aplicar `M = C^D mod N`.
- **Parâmetros:** C (BigInt) e `{ d, n }`.
- **Retorno:** M (BigInt).
- **Onde é usada:** `descriptografarPacote`.

#### `numeroParaBytes(numero, tamanho)`
- **Responsabilidade:** transformar M de volta em exatamente `tamanho` bytes. É o inverso do `bytesParaNumero` do Sistema 1.
- **Parâmetros:** BigInt e `Number`.
- **Retorno:** `Uint8Array` com `tamanho` bytes, ou `null` se o número não couber.
- **Funcionamento:** preenche a lista de trás para frente: o último byte é `numero % 256n`, depois divide por 256 e repete. As posições que sobram à esquerda ficam com 0 — é assim que os zeros à esquerda voltam. Se depois de preencher tudo ainda sobrar valor, o número era grande demais para aquele bloco, o que só acontece com chave errada ou bloco alterado.
- **Onde é usada:** `descriptografarPacote`.

#### `bytesUtf8ParaTexto(bytes)`
- **Responsabilidade:** converter os bytes em texto com UTF-8 rigoroso.
- **Parâmetros:** `Uint8Array`.
- **Retorno:** `string`, ou `null` se os bytes não forem UTF-8 válido.
- **Funcionamento:** `new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })`.
  - `fatal: true`: sem isso, o navegador trocaria bytes inválidos por `�` sem avisar. Com isso, ele lança um `TypeError`, que a função captura e transforma em `null`. Qualquer outro tipo de erro é relançado, para não esconder problemas inesperados.
  - `ignoreBOM: true`: sem isso, um caractere U+FEFF no começo do texto original seria apagado.
- **Onde é usada:** `descriptografarPacote`.

#### `descriptografarPacote(textoDoPacote, chavePrivada)`
- **Responsabilidade:** executar todo o processo.
- **Parâmetros:** o texto colado (`string`) e `{ d, n }`.
- **Retorno:** objeto `{ texto, totalDeBytes, quantidadeDeBlocos }`, ou lança `Error`.
- **Funcionamento:** chama `interpretarPacote`; cria uma lista com `totalDeBytes` posições; para cada bloco, descriptografa, converte em bytes com o tamanho guardado no pacote e copia para a lista na posição certa (`set`); no fim converte tudo de uma vez com `bytesUtf8ParaTexto`. Se um bloco não couber no seu tamanho ou se o UTF-8 for inválido, explica que a chave D provavelmente está errada ou que a mensagem foi alterada.
- **Onde é usada:** `aoClicarDescriptografar`.

### Parte 6 — Interface

| Função | O que faz | Chamada por |
|---|---|---|
| `elemento(id)` | Atalho para `document.getElementById(id)`. | Todas as funções da interface. |
| `mostrarAviso(texto, tipo)` | Escreve na faixa de aviso com a cor do `tipo` (`"sucesso"`, `"erro"`, `"info"`). | `aoClicarDescriptografar`, `copiarCampo`. |
| `lerChavePrivadaDaTela()` | Lê os campos D e N com `lerNumeroDecimal`, valida com `validarChave` e retorna `{ d, n }`. | `aoClicarDescriptografar`. |
| `aoClicarDescriptografar()` | Apaga o resultado anterior; valida a chave (erro aparece na hora); mostra "Descriptografando..."; 30 ms depois chama `descriptografarPacote` e mostra o texto e o resumo, ou a mensagem de erro. | Clique em **Descriptografar**. |
| `aoClicarLimpar()` | Esvazia todos os campos, esconde o aviso e coloca o cursor no campo D. | Clique em **Limpar tudo**. |
| `copiarCampo(idDoCampo, nomeDoCampo)` | Copia o valor do campo com `navigator.clipboard.writeText`; se o navegador recusar, a função interna `copiarDoJeitoAntigo` seleciona o texto e usa `document.execCommand("copy")`. | Botão **Copiar texto**. |
| `iniciarInterface()` | Liga os três botões às suas funções. | Evento `DOMContentLoaded`. |

### Recursos de JavaScript usados

- **`BigInt`**: `BigInt("123")`, `BigInt("0x1f")` (lê hexadecimal), `256n`. Não pode ser misturado com `Number` na mesma conta; `Number(...)` converte de volta quando o valor é pequeno (um byte, por exemplo).
- **Expressões regulares**: `/^[0-9]+$/` (só algarismos), `/\s+/g` (espaços e quebras de linha), `/\r?\n/` (quebra de linha Windows ou Unix) e o formato da linha de bloco. `exec` devolve as partes capturadas entre parênteses.
- **`split`, `map`, `filter`, `trim`**: dividir o pacote em linhas, tirar espaços e descartar linhas vazias.
- **`startsWith` e `slice`**: ler `NOME=VALOR`.
- **`Uint8Array` e `set`**: lista de bytes; `set(lista, posicao)` copia um bloco para dentro da lista final.
- **`TextDecoder`**: bytes → texto, no modo rigoroso.
- **`throw new Error(...)` e `try/catch`**: cada validação lança um erro com uma mensagem própria; a interface captura e mostra. O único `catch` dentro da lógica é o de `bytesUtf8ParaTexto`, que trata especificamente o `TypeError` de UTF-8 inválido.
- **`setTimeout`**: deixa a tela mostrar "Descriptografando..." antes da conta pesada.
- **`Array.from(texto).length`**: conta caracteres tratando cada emoji como 1.

---

## Reconstrução dos caracteres

Exemplo com o texto `Oi á 😀` (10 bytes) e uma chave de brinquedo com 1 byte por bloco:

**1. Cada bloco é descriptografado e volta a ser um número.**

```text
BLOCO-1 → M = 79   BLOCO-4 → M = 195   ...   BLOCO-10 → M = 128
```

**2. Cada número vira exatamente o número de bytes indicado no pacote.**

Com blocos maiores isso importa: se um bloco tinha `[0, 0, 65]` (3 bytes), o número é 65, e é o tamanho `3` guardado no pacote que faz o sistema recolocar os dois zeros à esquerda.

**3. Os bytes de todos os blocos são juntados, na ordem.**

```text
4f 69 20 c3 a1 20 f0 9f 98 80
```

**4. A lista inteira é convertida de UTF-8 para texto.**

```text
4f → O    69 → i    20 → espaço    c3 a1 → á    20 → espaço    f0 9f 98 80 → 😀
```

A conversão é feita **só no final**, com todos os bytes juntos, porque um caractere de vários bytes (como o emoji) pode ter ficado dividido entre dois blocos.

**Por que o modo rigoroso importa.** Se a chave estiver errada, os bytes recuperados são lixo. Um decodificador comum mostraria algo como `�x�3�` e pareceria que "funcionou". O modo rigoroso (`fatal: true`) recusa esses bytes, e o sistema avisa que a chave provavelmente está errada. Nada é trocado, removido ou "consertado" em silêncio.

---

## Compatibilidade

O Sistema 1 gera um texto neste formato (exemplo ilustrativo, com o hexadecimal encurtado; o real tem 256 dígitos para N de 1024 bits):

```text
RSA-EDU/1
N-FINAL=72a717f8f1eddf07
TOTAL-BYTES=12
TAMANHO-BLOCO=127
BLOCOS=1
BLOCO-1=12:3af8e27f4b78619206236c74f3caab64...d342f81d1
FIM
```

| Linha | Significado | O que este sistema confere |
|---|---|---|
| `RSA-EDU/1` | Formato, versão 1. | Tem que ser a primeira linha. |
| `N-FINAL=` | Últimos 16 dígitos hexadecimais de N. | Igual ao final do N colado. |
| `TOTAL-BYTES=` | Bytes UTF-8 do texto original. | Entre 1 e 100 000, e igual à soma dos blocos. |
| `TAMANHO-BLOCO=` | Máximo de bytes por bloco: `floor((bits de N − 1) / 8)`. | Igual ao calculado para o N colado. |
| `BLOCOS=` | Quantidade de blocos. | Igual ao número de linhas `BLOCO-`. |
| `BLOCO-i=tamanho:hex` | Posição, bytes originais do bloco, valor C em hexadecimal com 2 × (bytes de N) dígitos. | Ordem 1, 2, 3...; tamanho entre 1 e `TAMANHO-BLOCO`; quantidade exata de dígitos; C < N. |
| `FIM` | Fim do pacote. | Tem que ser a última linha. |

O que levar do Sistema 1 para cá:

| No Sistema 1 | Aqui |
|---|---|
| Botão *Copiar D* | Campo **Chave privada D** |
| Botão *Copiar N* | Campo **Módulo N** |
| Botão *Copiar resultado* | Campo **Conteúdo gerado pelo sistema 1** |

D e N são números decimais. O pacote não contém a chave privada; ela precisa vir separada.

---

## Exemplos de utilização

### Exemplo 1 — caminho normal

1. No Sistema 1: gerar chaves (1024 bits), escrever `Olá 😀 🚀`, criptografar.
2. Copiar D, N e o resultado para cá.
3. **Descriptografar** → aparece `Olá 😀 🚀` e o resumo "7 caracteres · 14 bytes em UTF-8 · 1 bloco".

### Exemplo 2 — conferir na mão com a chave de brinquedo

Cole:

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

Resultado: `Oi`. Conta por conta:

- `0x051b` = 1307 → 1307^2753 mod 3233 = 79 → `O`
- `0x0c6b` = 3179 → 3179^2753 mod 3233 = 105 → `i`
- N = 3233 = `0xca1`, por isso `N-FINAL` é `0000000000000ca1`.
- 3233 tem 12 bits → (12 − 1) / 8 = 1 byte por bloco; 3233 cabe em 2 bytes → 4 dígitos hexadecimais por bloco.

### Exemplo 3 — erros comuns

| O que aconteceu | O que o sistema diz |
|---|---|
| Colou o N de outro par de chaves | "Este N não é o mesmo que foi usado para criptografar a mensagem. Confira se copiou o N certo." |
| Colou um D errado | "O bloco 1 não voltou ao tamanho original. A chave D provavelmente não é a par deste N, ou o bloco foi alterado." (ou o aviso de UTF-8 inválido) |
| Esqueceu o final do resultado | "A mensagem está incompleta: falta a linha final "FIM". Copie o resultado inteiro de novo." |
| Digitou uma letra no campo D | "O campo D deve conter apenas números (0 a 9)." |

---

## Segurança e limitações

**Este sistema não é seguro para uso real.**

1. **RSA sem padding.** A mesma mensagem com a mesma chave sempre gera o mesmo resultado, o que permite reconhecer mensagens repetidas ou testar palpites. O RSA puro também é "maleável": dá para alterar um bloco cifrado de forma previsível.
2. **Sem autenticação.** As conferências deste sistema (tamanhos, N-FINAL, UTF-8 válido) pegam erros de cópia e alterações grosseiras, mas não provam quem escreveu a mensagem. Alguém com a chave pública pode criptografar outra mensagem qualquer e ela será aceita.
3. **Blocos independentes.** Blocos de mensagens diferentes (com a mesma chave) podem ser trocados ou repetidos.
4. **Ataques de tempo.** `potenciaModular` demora mais ou menos conforme os bits de D. Bibliotecas profissionais fazem as contas em tempo constante.
5. **D digitado em uma página.** A chave privada fica visível na tela e na área de transferência.
6. **Chaves de 512 bits** já foram quebradas na prática; hoje o mínimo recomendado é 2048 bits.

Em aplicações reais use **RSA-OAEP com SHA-256** (normalmente junto com uma cifra simétrica, como AES-GCM, para o conteúdo), sempre por meio de bibliotecas confiáveis. No navegador, a Web Crypto API (`crypto.subtle`) já oferece isso.

Limites práticos: mensagem de até 100 000 bytes. A descriptografia é a parte lenta do RSA (D é enorme): cerca de 1,5 s para 88 KB com chave de 1024 bits; com 2048 bits, uns 4 a 5 vezes mais. A página fica parada durante a conta; isso é esperado.

---

## Testes

Executados de duas formas: (1) os dois `script.js` carregados em ambientes separados no Node.js; (2) as duas páginas abertas no Google Chrome (automatizado), copiando D, N e o resultado do Sistema 1 para os campos deste sistema e clicando nos botões.

### Mensagens geradas pelo Sistema 1 (chaves de 512, 1024 e 2048 bits)

Em todos os casos o texto recuperado foi comparado com o original **e** os bytes UTF-8 dos dois foram comparados um a um.

| Texto original | Esperado | Obtido |
|---|---|---|
| `Ola Mundo` | idêntico | idêntico |
| `Olá, mundo!` | idêntico | idêntico |
| `1234567890` | idêntico | idêntico |
| `@#$%¨&*()_+-=[]{}` | idêntico | idêntico |
| `áéíóú ç ã õ` | idêntico | idêntico |
| `こんにちは` | idêntico | idêntico |
| `Olá 😀 🚀` | idêntico | idêntico |
| Várias linhas (com linhas vazias) | idêntico | idêntico |
| Tabulações | idêntico | idêntico |
| Combinados: `e` + U+0301, `a` + U+0303, 👨‍👩‍👧, 🇧🇷, 👍🏽 | idêntico, sem normalizar | idêntico |
| Russo, árabe, hebraico, chinês, ∑∫√∞≠≤ | idêntico | idêntico |
| U+FEFF no início | preservado | preservado |
| U+0000 no início, meio e fim (testa zeros à esquerda) | preservado | preservado |
| Só espaços | idêntico | idêntico |
| Texto longo: 88 500 bytes, 697 blocos | idêntico | idêntico |
| Chave de brinquedo (D = 2753, N = 3233) | `Oi` | `Oi` |

### Entradas corrompidas e chaves erradas

| Situação testada | Mensagem exibida |
|---|---|
| Campo da mensagem vazio | "Cole a mensagem criptografada." |
| Texto qualquer no lugar do pacote | "Este texto não parece ter saído do sistema de criptografia (...)" |
| Última linha (`FIM`) removida | "A mensagem está incompleta: falta a linha final "FIM". (...)" |
| Uma linha de bloco removida | "O pacote diz ter 4 blocos, mas foram encontrados 3. (...)" |
| Hexadecimal de um bloco cortado | "O bloco 1 tem 118 dígitos, mas deveria ter 128. (...)" |
| Letra inválida no hexadecimal | "A linha do bloco 1 está em um formato inválido." |
| Blocos fora de ordem | "Blocos fora de ordem: era esperado o bloco 2 e veio o 3." |
| `TOTAL-BYTES` alterado | "A soma dos tamanhos dos blocos (196) não bate com TOTAL-BYTES (5)." |
| Bloco com valor maior que N | "O bloco 1 é maior que N. (...)" |
| Um dígito trocado no meio de um bloco | "O bloco 1 não voltou ao tamanho original. (...)" |
| D errado (D + 2) | "O bloco 1 não voltou ao tamanho original. A chave D provavelmente não é a par deste N (...)" |
| D e N de outro par de chaves | "Este N não é o mesmo que foi usado para criptografar a mensagem. (...)" |
| Letra no campo D | "O campo D deve conter apenas números (0 a 9)." |
| Pacote colado com `\r\n`, espaços e linhas em branco extras | Aceito; texto recuperado corretamente |

Nenhum desses casos travou a página nem gerou erro no console do navegador.
