/*
  SISTEMA 2 — DESCRIPTOGRAFIA RSA (versão didática)

  Este arquivo está dividido em seis partes:

    1. Configurações e formato do pacote
    2. Matemática com BigInt (potência modular e tamanhos)
    3. Leitura e validação da chave (D e N)
    4. Leitura e validação do pacote criptografado
    5. Descriptografia e reconstrução do texto (bytes → UTF-8)
    6. Interface (botões, campos e mensagens)

  As partes 1 a 5 não mexem na página. Só a parte 6 lê e escreve nos campos.

  Este sistema é independente do sistema de criptografia: não usa nenhum arquivo dele.
  Os dois só combinam o FORMATO do pacote (descrito no README).

  AVISO: isto é RSA "puro", sem padding. Serve para estudar a matemática,
  NÃO para proteger informação de verdade. Veja o README.
*/

"use strict";


/* ============================================================
   1. CONFIGURAÇÕES E FORMATO DO PACOTE
   ============================================================ */

// Precisa ser igual ao que o sistema de criptografia escreve.
const CABECALHO_DO_PACOTE = "RSA-EDU/1";
const RODAPE_DO_PACOTE = "FIM";

// Mesmo limite do sistema 1 (100 KB de mensagem original).
const LIMITE_DE_BYTES_DA_MENSAGEM = 100000;

// Limite de dígitos aceitos em D e N. Uma chave de 2048 bits tem cerca de 617 dígitos.
const LIMITE_DE_DIGITOS_DA_CHAVE = 2000;

// O pacote tem 5 linhas de cabeçalho + 1 linha por bloco + 1 linha "FIM".
const LINHAS_DE_CABECALHO = 5;


/* ============================================================
   2. MATEMÁTICA COM BIGINT
   ============================================================ */

/*
  Calcula (base ^ expoente) mod modulo pelo método "elevar ao quadrado e multiplicar".
  É a mesma ideia do sistema 1, mas aqui o expoente é D, que é enorme
  (centenas de dígitos). Sem este método a conta seria impossível.
*/
function potenciaModular(base, expoente, modulo) {
  if (modulo === 1n) {
    return 0n;
  }

  let resultado = 1n;
  let potenciaAtual = base % modulo;
  let expoenteRestante = expoente;

  while (expoenteRestante > 0n) {
    const bitAtual = expoenteRestante % 2n;

    if (bitAtual === 1n) {
      resultado = (resultado * potenciaAtual) % modulo;
    }

    potenciaAtual = (potenciaAtual * potenciaAtual) % modulo;
    expoenteRestante = expoenteRestante / 2n;
  }

  return resultado;
}

// Quantos bits um número positivo tem.
function quantidadeDeBits(numero) {
  return numero.toString(2).length;
}

// Bytes por bloco de mensagem. Tem que ser a MESMA regra do sistema 1.
function tamanhoDoBlocoEmBytes(modulo) {
  return Math.floor((quantidadeDeBits(modulo) - 1) / 8);
}

// Bytes necessários para escrever N (cada bloco cifrado tem esse tamanho).
function tamanhoDoModuloEmBytes(modulo) {
  return Math.ceil(quantidadeDeBits(modulo) / 8);
}

// Últimos 16 dígitos hexadecimais de N. Serve para conferir se o N é o mesmo do pacote.
function calcularFinalDoModulo(modulo) {
  const hexadecimal = modulo.toString(16);
  return hexadecimal.slice(-16).padStart(16, "0");
}


/* ============================================================
   3. LEITURA E VALIDAÇÃO DA CHAVE (D e N)
   ============================================================ */

/*
  Converte o texto de um campo em BigInt.
  Aceita espaços e quebras de linha no meio (comum ao copiar números grandes),
  mas só aceita algarismos de 0 a 9.
*/
function lerNumeroDecimal(textoDoCampo, nomeDoCampo) {
  const semEspacos = textoDoCampo.replace(/\s+/g, "");

  if (semEspacos === "") {
    throw new Error("Preencha o campo " + nomeDoCampo + ".");
  }
  if (!/^[0-9]+$/.test(semEspacos)) {
    throw new Error("O campo " + nomeDoCampo + " deve conter apenas números (0 a 9).");
  }
  if (semEspacos.length > LIMITE_DE_DIGITOS_DA_CHAVE) {
    throw new Error("O campo " + nomeDoCampo + " é longo demais para uma chave deste sistema.");
  }
  return BigInt(semEspacos);
}

/*
  Confere se D e N fazem sentido antes de qualquer conta.
  Não dá para saber só por eles se o par está "certo", mas dá para
  barrar valores que nunca poderiam ser uma chave RSA.
*/
function validarChave(d, n) {
  if (n % 2n === 0n) {
    throw new Error("N não pode ser par. No RSA, N é o produto de dois primos ímpares.");
  }
  if (tamanhoDoBlocoEmBytes(n) < 1) {
    throw new Error("N é pequeno demais: não cabe nem 1 byte por bloco.");
  }
  if (d < 1n || d >= n) {
    throw new Error("D precisa ser maior que zero e menor que N.");
  }
}


/* ============================================================
   4. LEITURA E VALIDAÇÃO DO PACOTE CRIPTOGRAFADO
   ============================================================ */

/*
  Lê uma linha no formato NOME=VALOR e devolve o VALOR.
  Lança um erro se o nome não for o esperado.
*/
function lerCampoDoCabecalho(linha, nomeEsperado) {
  const prefixo = nomeEsperado + "=";
  if (linha === undefined || !linha.startsWith(prefixo)) {
    throw new Error("Era esperada a linha \"" + nomeEsperado + "=...\". O pacote está incompleto ou foi alterado.");
  }
  return linha.slice(prefixo.length);
}

// Converte um texto em número inteiro pequeno (Number), aceitando só algarismos.
function lerInteiroPositivo(texto, descricao) {
  if (!/^[0-9]{1,9}$/.test(texto)) {
    throw new Error("Valor inválido em " + descricao + ": \"" + texto + "\".");
  }
  return Number(texto);
}

/*
  Lê uma linha de bloco: BLOCO-<número>=<bytes>:<hexadecimal>
  Confere a posição, o tamanho em bytes, a quantidade de dígitos e se o valor é menor que N.
*/
function lerLinhaDeBloco(linha, posicaoEsperada, n, tamanhoDoBloco) {
  const formato = /^BLOCO-([0-9]+)=([0-9]+):([0-9a-fA-F]+)$/;
  const partes = formato.exec(linha);

  if (partes === null) {
    throw new Error("A linha do bloco " + posicaoEsperada + " está em um formato inválido.");
  }

  const posicao = Number(partes[1]);
  const tamanho = Number(partes[2]);
  const hexadecimal = partes[3];

  if (posicao !== posicaoEsperada) {
    throw new Error("Blocos fora de ordem: era esperado o bloco " + posicaoEsperada + " e veio o " + partes[1] + ".");
  }
  if (tamanho < 1 || tamanho > tamanhoDoBloco) {
    throw new Error("O bloco " + posicao + " diz ter " + partes[2] + " bytes, mas com este N o máximo é " + tamanhoDoBloco + ".");
  }

  const digitosEsperados = tamanhoDoModuloEmBytes(n) * 2;
  if (hexadecimal.length !== digitosEsperados) {
    throw new Error(
      "O bloco " + posicao + " tem " + hexadecimal.length + " dígitos, mas deveria ter " +
      digitosEsperados + ". Ele foi cortado ou alterado."
    );
  }

  const valorCifrado = BigInt("0x" + hexadecimal);
  if (valorCifrado >= n) {
    throw new Error("O bloco " + posicao + " é maior que N. Ele não pode ter sido gerado com este N.");
  }

  return { tamanho: tamanho, valorCifrado: valorCifrado };
}

/*
  Lê o pacote inteiro e devolve { totalDeBytes, blocos }.
  Cada conferência tem sua própria mensagem de erro, para o usuário saber o que está errado.
*/
function interpretarPacote(textoDoPacote, n) {
  // Divide em linhas, tira espaços das pontas e ignora linhas vazias.
  const linhas = textoDoPacote
    .split(/\r?\n/)
    .map(function (linha) { return linha.trim(); })
    .filter(function (linha) { return linha !== ""; });

  if (linhas.length === 0) {
    throw new Error("Cole a mensagem criptografada.");
  }
  if (linhas[0] !== CABECALHO_DO_PACOTE) {
    throw new Error("Este texto não parece ter saído do sistema de criptografia (a primeira linha deveria ser " + CABECALHO_DO_PACOTE + ").");
  }
  if (linhas[linhas.length - 1] !== RODAPE_DO_PACOTE) {
    throw new Error("A mensagem está incompleta: falta a linha final \"FIM\". Copie o resultado inteiro de novo.");
  }

  // --- Cabeçalho ---
  const finalDoModulo = lerCampoDoCabecalho(linhas[1], "N-FINAL").toLowerCase();
  if (finalDoModulo !== calcularFinalDoModulo(n)) {
    throw new Error("Este N não é o mesmo que foi usado para criptografar a mensagem. Confira se copiou o N certo.");
  }

  const totalDeBytes = lerInteiroPositivo(lerCampoDoCabecalho(linhas[2], "TOTAL-BYTES"), "TOTAL-BYTES");
  if (totalDeBytes < 1 || totalDeBytes > LIMITE_DE_BYTES_DA_MENSAGEM) {
    throw new Error("TOTAL-BYTES fora do limite permitido (1 a " + LIMITE_DE_BYTES_DA_MENSAGEM + ").");
  }

  const tamanhoDoBloco = lerInteiroPositivo(lerCampoDoCabecalho(linhas[3], "TAMANHO-BLOCO"), "TAMANHO-BLOCO");
  if (tamanhoDoBloco !== tamanhoDoBlocoEmBytes(n)) {
    throw new Error("TAMANHO-BLOCO não combina com este N. O pacote foi alterado ou o N está errado.");
  }

  const quantidadeDeBlocos = lerInteiroPositivo(lerCampoDoCabecalho(linhas[4], "BLOCOS"), "BLOCOS");
  const linhasDeBlocoEncontradas = linhas.length - LINHAS_DE_CABECALHO - 1;
  if (quantidadeDeBlocos < 1 || quantidadeDeBlocos !== linhasDeBlocoEncontradas) {
    throw new Error(
      "O pacote diz ter " + quantidadeDeBlocos + " blocos, mas foram encontrados " +
      linhasDeBlocoEncontradas + ". Algum trecho foi perdido ao copiar."
    );
  }

  // --- Blocos ---
  const blocos = [];
  let somaDosTamanhos = 0;

  for (let i = 0; i < quantidadeDeBlocos; i++) {
    const linha = linhas[LINHAS_DE_CABECALHO + i];
    const bloco = lerLinhaDeBloco(linha, i + 1, n, tamanhoDoBloco);
    blocos.push(bloco);
    somaDosTamanhos += bloco.tamanho;
  }

  if (somaDosTamanhos !== totalDeBytes) {
    throw new Error("A soma dos tamanhos dos blocos (" + somaDosTamanhos + ") não bate com TOTAL-BYTES (" + totalDeBytes + ").");
  }

  return { totalDeBytes: totalDeBytes, blocos: blocos };
}


/* ============================================================
   5. DESCRIPTOGRAFIA E RECONSTRUÇÃO DO TEXTO
   ============================================================ */

// M = C^D mod N, para um único bloco.
function descriptografarBloco(valorCifrado, chavePrivada) {
  return potenciaModular(valorCifrado, chavePrivada.d, chavePrivada.n);
}

/*
  Faz o caminho inverso de bytesParaNumero do sistema 1:
  transforma um número de volta em exatamente "tamanho" bytes (big-endian).
  Os bytes da esquerda que sobrarem ficam 0 — é assim que zeros à esquerda são preservados.
  Se o número não couber em "tamanho" bytes, a chave está errada ou o bloco foi alterado.
*/
function numeroParaBytes(numero, tamanho) {
  const bytes = new Uint8Array(tamanho);
  let restante = numero;

  for (let posicao = tamanho - 1; posicao >= 0; posicao--) {
    bytes[posicao] = Number(restante % 256n);
    restante = restante / 256n;
  }

  if (restante !== 0n) {
    return null; // não coube
  }
  return bytes;
}

/*
  Bytes → texto, com UTF-8 RIGOROSO:
  - fatal: true  → se os bytes não forem UTF-8 válido, dá erro (não troca por "�").
  - ignoreBOM: true → não apaga um caractere U+FEFF que esteja no começo do texto.
  Retorna o texto, ou null se os bytes não formarem UTF-8 válido.
*/
function bytesUtf8ParaTexto(bytes) {
  const decodificador = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  try {
    return decodificador.decode(bytes);
  } catch (erro) {
    // O TextDecoder lança TypeError exatamente quando encontra uma sequência UTF-8 inválida.
    if (erro instanceof TypeError) {
      return null;
    }
    throw erro;
  }
}

/*
  Caminho completo:
  pacote → blocos → M = C^D mod N → bytes (no tamanho certo) → UTF-8 → texto.
*/
function descriptografarPacote(textoDoPacote, chavePrivada) {
  const pacote = interpretarPacote(textoDoPacote, chavePrivada.n);

  const todosOsBytes = new Uint8Array(pacote.totalDeBytes);
  let posicaoDeEscrita = 0;

  for (let i = 0; i < pacote.blocos.length; i++) {
    const bloco = pacote.blocos[i];
    const numeroOriginal = descriptografarBloco(bloco.valorCifrado, chavePrivada);
    const bytesDoBloco = numeroParaBytes(numeroOriginal, bloco.tamanho);

    if (bytesDoBloco === null) {
      throw new Error(
        "O bloco " + (i + 1) + " não voltou ao tamanho original. " +
        "A chave D provavelmente não é a par deste N, ou o bloco foi alterado."
      );
    }

    todosOsBytes.set(bytesDoBloco, posicaoDeEscrita);
    posicaoDeEscrita += bytesDoBloco.length;
  }

  const texto = bytesUtf8ParaTexto(todosOsBytes);
  if (texto === null) {
    throw new Error(
      "Os bytes recuperados não formam um texto UTF-8 válido. " +
      "A chave D provavelmente está errada, ou a mensagem foi alterada."
    );
  }

  return {
    texto: texto,
    totalDeBytes: pacote.totalDeBytes,
    quantidadeDeBlocos: pacote.blocos.length
  };
}


/* ============================================================
   6. INTERFACE
   ============================================================ */

function elemento(id) {
  return document.getElementById(id);
}

// Mostra uma mensagem na faixa de aviso. tipo: "sucesso", "erro" ou "info".
function mostrarAviso(texto, tipo) {
  const aviso = elemento("aviso");
  aviso.textContent = texto;
  aviso.className = "aviso aviso-" + tipo;
  aviso.hidden = false;
}

// Lê D e N da tela, valida e devolve { d, n }. Lança erro se algo estiver errado.
function lerChavePrivadaDaTela() {
  const d = lerNumeroDecimal(elemento("campo-d").value, "D");
  const n = lerNumeroDecimal(elemento("campo-n").value, "N");
  validarChave(d, n);
  return { d: d, n: n };
}

// Clique em "Descriptografar".
function aoClicarDescriptografar() {
  const botao = elemento("botao-descriptografar");
  elemento("texto-recuperado").value = "";
  elemento("resumo-resultado").textContent = "";

  let chavePrivada;
  try {
    chavePrivada = lerChavePrivadaDaTela();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
    return;
  }

  const textoDoPacote = elemento("campo-pacote").value;

  botao.disabled = true;
  mostrarAviso("Descriptografando...", "info");

  // O setTimeout deixa a tela mostrar o aviso antes da conta pesada.
  setTimeout(function () {
    try {
      const resultado = descriptografarPacote(textoDoPacote, chavePrivada);
      elemento("texto-recuperado").value = resultado.texto;
      elemento("resumo-resultado").textContent =
        Array.from(resultado.texto).length + " caracteres · " +
        resultado.totalDeBytes + " bytes em UTF-8 · " +
        resultado.quantidadeDeBlocos + (resultado.quantidadeDeBlocos === 1 ? " bloco" : " blocos");
      mostrarAviso("Mensagem recuperada.", "sucesso");
    } catch (erro) {
      mostrarAviso(erro.message, "erro");
    }
    botao.disabled = false;
  }, 30);
}

// Clique em "Limpar": apaga todos os campos.
function aoClicarLimpar() {
  elemento("campo-d").value = "";
  elemento("campo-n").value = "";
  elemento("campo-pacote").value = "";
  elemento("texto-recuperado").value = "";
  elemento("resumo-resultado").textContent = "";
  elemento("aviso").hidden = true;
  elemento("campo-d").focus();
}

// Copia o conteúdo de um campo (forma moderna, com a forma antiga como reserva).
function copiarCampo(idDoCampo, nomeDoCampo) {
  const campo = elemento(idDoCampo);
  const conteudo = campo.value;

  if (conteudo === "") {
    mostrarAviso("Não há nada para copiar ainda.", "erro");
    return;
  }

  function copiarDoJeitoAntigo() {
    campo.select();
    const deuCerto = document.execCommand("copy");
    campo.setSelectionRange(0, 0);
    if (deuCerto) {
      mostrarAviso(nomeDoCampo + " copiado.", "sucesso");
    } else {
      mostrarAviso("O navegador bloqueou a cópia. Selecione o texto e use Ctrl+C.", "erro");
    }
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(conteudo).then(
      function () { mostrarAviso(nomeDoCampo + " copiado.", "sucesso"); },
      copiarDoJeitoAntigo
    );
  } else {
    copiarDoJeitoAntigo();
  }
}

function iniciarInterface() {
  elemento("botao-descriptografar").addEventListener("click", aoClicarDescriptografar);
  elemento("botao-limpar").addEventListener("click", aoClicarLimpar);
  elemento("botao-copiar-texto").addEventListener("click", function () {
    copiarCampo("texto-recuperado", "Texto");
  });
}

document.addEventListener("DOMContentLoaded", iniciarInterface);
