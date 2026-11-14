/*
  SISTEMA 1 — CRIPTOGRAFIA RSA (versão didática)

  Este arquivo está dividido em seis partes:

    1. Configurações e formato do pacote
    2. Matemática com BigInt (potência modular, Euclides estendido, inverso modular)
    3. Números aleatórios, números primos e geração das chaves
    4. Conversão do texto (UTF-8) e divisão em blocos
    5. Criptografia e montagem do pacote de saída
    6. Interface (botões, campos e mensagens)

  As partes 1 a 5 não mexem na página. Só a parte 6 lê e escreve nos campos.

  AVISO: isto é RSA "puro", sem padding. Serve para estudar a matemática,
  NÃO para proteger informação de verdade. Veja o README.
*/

"use strict";


/* ============================================================
   1. CONFIGURAÇÕES E FORMATO DO PACOTE
   ============================================================ */

// Primeira linha do pacote. O sistema de descriptografia confere esta linha.
const CABECALHO_DO_PACOTE = "RSA-EDU/1";

// Última linha do pacote. Se ela faltar, sabemos que o texto foi cortado.
const RODAPE_DO_PACOTE = "FIM";

// Expoente público mais usado no mundo real: 65537 = 2^16 + 1 (é primo).
const EXPOENTE_PUBLICO = 65537n;

// Tamanhos de chave (em bits do módulo N) que a tela oferece.
const TAMANHOS_DE_CHAVE_PERMITIDOS = [512, 1024, 2048];

// Limite de tamanho da mensagem, em bytes UTF-8 (100 KB).
// Acima disso a descriptografia começa a ficar lenta no navegador.
const LIMITE_DE_BYTES_DA_MENSAGEM = 100000;

// Quantas vezes o teste de Miller-Rabin é repetido para cada candidato a primo.
const RODADAS_DO_TESTE_DE_PRIMALIDADE = 24;


/* ============================================================
   2. MATEMÁTICA COM BIGINT
   ============================================================ */

/*
  Calcula (base ^ expoente) mod modulo sem nunca montar o número gigante base^expoente.

  Método "elevar ao quadrado e multiplicar":
  olhamos o expoente bit a bit, do menos significativo para o mais significativo.
  - A cada passo a base é elevada ao quadrado (base, base², base⁴, base⁸, ...).
  - Quando o bit atual do expoente é 1, multiplicamos essa potência no resultado.
  Depois de cada conta tiramos o "mod", então os números nunca crescem demais.
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
    expoenteRestante = expoenteRestante / 2n; // divisão inteira (BigInt descarta a parte decimal)
  }

  return resultado;
}

/*
  Algoritmo de Euclides estendido.
  Para dois números a e b, encontra:
    mdc  = maior divisor comum de a e b
    x, y = números inteiros tais que  a·x + b·y = mdc
  O valor x é o que usamos para achar o inverso modular.
*/
function euclidesEstendido(a, b) {
  let restoAnterior = a;
  let restoAtual = b;

  let xAnterior = 1n;
  let xAtual = 0n;

  let yAnterior = 0n;
  let yAtual = 1n;

  while (restoAtual !== 0n) {
    const quociente = restoAnterior / restoAtual;

    const novoResto = restoAnterior - quociente * restoAtual;
    restoAnterior = restoAtual;
    restoAtual = novoResto;

    const novoX = xAnterior - quociente * xAtual;
    xAnterior = xAtual;
    xAtual = novoX;

    const novoY = yAnterior - quociente * yAtual;
    yAnterior = yAtual;
    yAtual = novoY;
  }

  return { mdc: restoAnterior, x: xAnterior, y: yAnterior };
}

// Maior divisor comum, usando o próprio Euclides estendido.
function maiorDivisorComum(a, b) {
  return euclidesEstendido(a, b).mdc;
}

/*
  Inverso modular: o número D tal que (valor · D) mod modulo = 1.
  Só existe quando mdc(valor, modulo) = 1.
  No RSA usamos isto para achar D a partir de E e φ(N).
*/
function inversoModular(valor, modulo) {
  const resultado = euclidesEstendido(valor, modulo);

  if (resultado.mdc !== 1n) {
    throw new Error("Não existe inverso modular: os números não são primos entre si.");
  }

  // O x do Euclides pode vir negativo. Somamos o módulo até ele ficar entre 0 e modulo-1.
  let inverso = resultado.x % modulo;
  if (inverso < 0n) {
    inverso = inverso + modulo;
  }
  return inverso;
}

// Quantos bits um número positivo tem. Ex.: 13 = 1101 em binário → 4 bits.
function quantidadeDeBits(numero) {
  return numero.toString(2).length;
}

/*
  Quantos bytes cabem em cada bloco de mensagem para um certo N.
  Usamos (bits de N - 1) / 8, arredondado para baixo.
  Assim o maior bloco possível (todos os bytes = 255) fica com no máximo
  (bits de N - 1) bits, que é sempre MENOR que N. Isso é obrigatório no RSA.
*/
function tamanhoDoBlocoEmBytes(modulo) {
  return Math.floor((quantidadeDeBits(modulo) - 1) / 8);
}

// Quantos bytes são necessários para escrever N inteiro (e qualquer número menor que N).
function tamanhoDoModuloEmBytes(modulo) {
  return Math.ceil(quantidadeDeBits(modulo) / 8);
}


/* ============================================================
   3. NÚMEROS ALEATÓRIOS, PRIMOS E GERAÇÃO DAS CHAVES
   ============================================================ */

// Bytes aleatórios do gerador seguro do navegador (crypto.getRandomValues).
function gerarBytesAleatorios(quantidade) {
  const bytes = new Uint8Array(quantidade);
  crypto.getRandomValues(bytes);
  return bytes;
}

/*
  Junta uma lista de bytes em um único número inteiro (big-endian):
  o primeiro byte é o mais significativo.
  Ex.: [1, 0] → 1·256 + 0 = 256
*/
function bytesParaNumero(bytes) {
  let numero = 0n;
  for (let i = 0; i < bytes.length; i++) {
    numero = numero * 256n + BigInt(bytes[i]);
  }
  return numero;
}

/*
  Gera um número ímpar aleatório com exatamente "bits" bits.
  Ligamos os DOIS bits mais altos: assim, ao multiplicar dois números desses,
  o produto tem exatamente o dobro de bits (P e Q de 512 bits → N de 1024 bits).
*/
function gerarCandidatoAPrimo(bits) {
  const quantidadeDeBytes = Math.ceil(bits / 8);
  let numero = bytesParaNumero(gerarBytesAleatorios(quantidadeDeBytes));

  // Joga fora os bits que sobraram além de "bits".
  const bitsSobrando = BigInt(quantidadeDeBytes * 8 - bits);
  numero = numero >> bitsSobrando;

  numero = numero | (1n << BigInt(bits - 1)); // bit mais alto ligado
  numero = numero | (1n << BigInt(bits - 2)); // segundo bit mais alto ligado
  numero = numero | 1n;                       // último bit ligado → número ímpar

  return numero;
}

// Número aleatório entre minimo e maximo (incluindo os dois).
function gerarNumeroAleatorioEntre(minimo, maximo) {
  const tamanhoDoIntervalo = maximo - minimo + 1n;
  const quantidadeDeBytes = tamanhoDoModuloEmBytes(tamanhoDoIntervalo) + 1;
  const aleatorio = bytesParaNumero(gerarBytesAleatorios(quantidadeDeBytes));
  return minimo + (aleatorio % tamanhoDoIntervalo);
}

// Lista os primos menores que "limite" (Crivo de Eratóstenes).
// Usados para descartar rápido candidatos divisíveis por primos pequenos.
function listarPrimosPequenos(limite) {
  const ehComposto = new Array(limite).fill(false);
  const primos = [];

  for (let numero = 2; numero < limite; numero++) {
    if (!ehComposto[numero]) {
      primos.push(BigInt(numero));
      for (let multiplo = numero * numero; multiplo < limite; multiplo += numero) {
        ehComposto[multiplo] = true;
      }
    }
  }
  return primos;
}

const PRIMOS_PEQUENOS = listarPrimosPequenos(2000);

/*
  Uma rodada do teste de Miller-Rabin.
  Escrevemos n - 1 = d · 2^s (d ímpar). Para uma base "a":
    - se a^d mod n = 1 ou n-1, a base não prova nada (n pode ser primo);
    - senão, elevamos ao quadrado até s-1 vezes procurando n-1.
  Se nunca aparecer n-1, temos certeza de que n é COMPOSTO.
  Retorna true se a rodada "passou" (n continua podendo ser primo).
*/
function passaNaRodadaDeMillerRabin(n, base, d, s) {
  let x = potenciaModular(base, d, n);

  if (x === 1n || x === n - 1n) {
    return true;
  }

  for (let i = 1; i < s; i++) {
    x = (x * x) % n;
    if (x === n - 1n) {
      return true;
    }
  }
  return false;
}

/*
  Diz se n é (muito provavelmente) primo.
  1) Divide pelos primos pequenos.
  2) Faz várias rodadas de Miller-Rabin com bases aleatórias.
  Com 24 rodadas, a chance de um número composto passar é menor que 1 em 2^48.
*/
function ehProvavelmentePrimo(n) {
  if (n < 2n) {
    return false;
  }

  for (const primo of PRIMOS_PEQUENOS) {
    if (n === primo) {
      return true;
    }
    if (n % primo === 0n) {
      return false;
    }
  }

  // Escreve n - 1 como d · 2^s
  let d = n - 1n;
  let s = 0;
  while (d % 2n === 0n) {
    d = d / 2n;
    s++;
  }

  for (let rodada = 0; rodada < RODADAS_DO_TESTE_DE_PRIMALIDADE; rodada++) {
    const base = gerarNumeroAleatorioEntre(2n, n - 2n);
    if (!passaNaRodadaDeMillerRabin(n, base, d, s)) {
      return false;
    }
  }
  return true;
}

// Sorteia candidatos até encontrar um primo com a quantidade de bits pedida.
function gerarPrimo(bits) {
  while (true) {
    const candidato = gerarCandidatoAPrimo(bits);
    if (ehProvavelmentePrimo(candidato)) {
      return candidato;
    }
  }
}

/*
  Gera um par de chaves RSA completo.

    1. Sorteia dois primos diferentes P e Q.
    2. N = P × Q
    3. φ(N) = (P − 1) × (Q − 1)
    4. E = 65537 (precisa ter mdc(E, φ(N)) = 1; se não tiver, sorteia de novo)
    5. D = inverso de E módulo φ(N)
    6. Teste rápido: cifra e decifra um número para conferir o par.
*/
function gerarChaves(bitsDoModulo) {
  if (!TAMANHOS_DE_CHAVE_PERMITIDOS.includes(bitsDoModulo)) {
    throw new Error("Tamanho de chave não suportado: " + bitsDoModulo + " bits.");
  }

  const bitsDeCadaPrimo = bitsDoModulo / 2;

  while (true) {
    const p = gerarPrimo(bitsDeCadaPrimo);
    const q = gerarPrimo(bitsDeCadaPrimo);

    if (p === q) {
      continue; // P e Q precisam ser diferentes
    }

    const n = p * q;
    const phi = (p - 1n) * (q - 1n);

    if (maiorDivisorComum(EXPOENTE_PUBLICO, phi) !== 1n) {
      continue; // E não serve para este φ(N); sorteia outros primos
    }

    const d = inversoModular(EXPOENTE_PUBLICO, phi);

    // Conferência: (E · D) mod φ(N) tem que ser 1, e cifrar/decifrar tem que voltar ao original.
    const numeroDeTeste = 123456789n;
    const cifrado = potenciaModular(numeroDeTeste, EXPOENTE_PUBLICO, n);
    const decifrado = potenciaModular(cifrado, d, n);

    if ((EXPOENTE_PUBLICO * d) % phi !== 1n || decifrado !== numeroDeTeste) {
      continue; // não deveria acontecer; se acontecer, tenta de novo
    }

    return { p: p, q: q, n: n, phi: phi, e: EXPOENTE_PUBLICO, d: d };
  }
}


/* ============================================================
   4. CONVERSÃO DO TEXTO (UTF-8) E DIVISÃO EM BLOCOS
   ============================================================ */

/*
  Procura "surrogates soltos" no texto.
  Em JavaScript, caracteres fora do plano básico (como emojis) são guardados
  como um PAR de unidades: uma "alta" (0xD800–0xDBFF) seguida de uma "baixa" (0xDC00–0xDFFF).
  Uma unidade sozinha não é um caractere Unicode válido e não pode virar UTF-8.
  Retorna a posição do problema, ou -1 se o texto estiver correto.
*/
function encontrarSurrogateSolto(texto) {
  for (let i = 0; i < texto.length; i++) {
    const codigo = texto.charCodeAt(i);
    const ehAlta = codigo >= 0xd800 && codigo <= 0xdbff;
    const ehBaixa = codigo >= 0xdc00 && codigo <= 0xdfff;

    if (ehAlta) {
      const proximo = texto.charCodeAt(i + 1); // NaN se não existir
      const proximoEhBaixa = proximo >= 0xdc00 && proximo <= 0xdfff;
      if (!proximoEhBaixa) {
        return i;
      }
      i++; // o par está completo; pula a unidade baixa
    } else if (ehBaixa) {
      return i; // baixa sem alta antes
    }
  }
  return -1;
}

// Texto → bytes UTF-8. O TextEncoder do navegador segue o padrão UTF-8 à risca.
function textoParaBytesUtf8(texto) {
  const codificador = new TextEncoder();
  return codificador.encode(texto);
}

// Corta a lista de bytes em pedaços de no máximo "tamanhoMaximo" bytes, mantendo a ordem.
function dividirEmBlocos(bytes, tamanhoMaximo) {
  const blocos = [];
  for (let inicio = 0; inicio < bytes.length; inicio += tamanhoMaximo) {
    blocos.push(bytes.slice(inicio, inicio + tamanhoMaximo));
  }
  return blocos;
}

// Escreve um número em hexadecimal com uma quantidade fixa de dígitos (zeros à esquerda).
function numeroParaHexadecimal(numero, quantidadeDeDigitos) {
  return numero.toString(16).padStart(quantidadeDeDigitos, "0");
}

/*
  "Impressão digital" curta de N: os últimos 16 dígitos hexadecimais.
  Vai dentro do pacote para o sistema 2 avisar quando alguém usa o N errado.
*/
function calcularFinalDoModulo(modulo) {
  const hexadecimal = modulo.toString(16);
  return hexadecimal.slice(-16).padStart(16, "0");
}


/* ============================================================
   5. CRIPTOGRAFIA E MONTAGEM DO PACOTE
   ============================================================ */

// C = M^E mod N, para um único bloco.
function criptografarBloco(numeroDoBloco, chavePublica) {
  if (numeroDoBloco >= chavePublica.n) {
    throw new Error("Bloco maior ou igual a N. Isso não pode acontecer no RSA.");
  }
  return potenciaModular(numeroDoBloco, chavePublica.e, chavePublica.n);
}

/*
  Monta o texto final que vai para o sistema de descriptografia.

    RSA-EDU/1
    N-FINAL=<últimos 16 dígitos hexadecimais de N>
    TOTAL-BYTES=<quantidade de bytes UTF-8 da mensagem>
    TAMANHO-BLOCO=<bytes máximos por bloco>
    BLOCOS=<quantidade de blocos>
    BLOCO-1=<bytes deste bloco>:<bloco cifrado em hexadecimal>
    BLOCO-2=...
    FIM
*/
function montarPacote(modulo, totalDeBytes, tamanhoDoBloco, blocosCifrados) {
  const linhas = [];
  linhas.push(CABECALHO_DO_PACOTE);
  linhas.push("N-FINAL=" + calcularFinalDoModulo(modulo));
  linhas.push("TOTAL-BYTES=" + totalDeBytes);
  linhas.push("TAMANHO-BLOCO=" + tamanhoDoBloco);
  linhas.push("BLOCOS=" + blocosCifrados.length);

  for (let i = 0; i < blocosCifrados.length; i++) {
    const bloco = blocosCifrados[i];
    linhas.push("BLOCO-" + (i + 1) + "=" + bloco.tamanho + ":" + bloco.hexadecimal);
  }

  linhas.push(RODAPE_DO_PACOTE);
  return linhas.join("\n");
}

/*
  Verifica se o texto pode ser criptografado.
  Retorna os bytes UTF-8 do texto, ou lança um erro com uma explicação.
*/
function validarTextoParaCriptografar(texto) {
  if (texto.length === 0) {
    throw new Error("Escreva a mensagem antes de criptografar.");
  }

  const posicaoInvalida = encontrarSurrogateSolto(texto);
  if (posicaoInvalida !== -1) {
    throw new Error(
      "O texto tem um caractere quebrado na posição " + (posicaoInvalida + 1) +
      " (metade de um emoji ou símbolo). Apague e digite esse caractere de novo."
    );
  }

  const bytes = textoParaBytesUtf8(texto);
  if (bytes.length > LIMITE_DE_BYTES_DA_MENSAGEM) {
    throw new Error(
      "A mensagem tem " + bytes.length + " bytes. O limite é " +
      LIMITE_DE_BYTES_DA_MENSAGEM + " bytes (cerca de 100 KB)."
    );
  }
  return bytes;
}

/*
  Faz o caminho completo:
  texto → UTF-8 → bytes → blocos → números → C = M^E mod N → pacote.
*/
function criptografarTexto(texto, chavePublica) {
  const bytes = validarTextoParaCriptografar(texto);

  const tamanhoDoBloco = tamanhoDoBlocoEmBytes(chavePublica.n);
  const digitosPorBloco = tamanhoDoModuloEmBytes(chavePublica.n) * 2; // 2 dígitos hex por byte

  const blocosDeBytes = dividirEmBlocos(bytes, tamanhoDoBloco);
  const blocosCifrados = [];

  for (const blocoDeBytes of blocosDeBytes) {
    const numeroDoBloco = bytesParaNumero(blocoDeBytes);
    const numeroCifrado = criptografarBloco(numeroDoBloco, chavePublica);

    blocosCifrados.push({
      tamanho: blocoDeBytes.length,
      hexadecimal: numeroParaHexadecimal(numeroCifrado, digitosPorBloco)
    });
  }

  return {
    pacote: montarPacote(chavePublica.n, bytes.length, tamanhoDoBloco, blocosCifrados),
    totalDeBytes: bytes.length,
    quantidadeDeBlocos: blocosCifrados.length,
    tamanhoDoBloco: tamanhoDoBloco
  };
}


/* ============================================================
   6. INTERFACE
   ============================================================ */

// Chaves atuais. Fica vazio (null) até o usuário gerar as chaves.
let chavesAtuais = null;

// Atalho para pegar um elemento da página pelo id.
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

// Atualiza o contador "X caracteres · Y bytes" embaixo da mensagem.
function atualizarContador() {
  const texto = elemento("texto-original").value;
  const quantidadeDeCaracteres = Array.from(texto).length; // conta emojis como 1
  let quantidadeDeBytes = 0;

  if (encontrarSurrogateSolto(texto) === -1) {
    quantidadeDeBytes = textoParaBytesUtf8(texto).length;
  }

  elemento("contador").textContent =
    quantidadeDeCaracteres + " caracteres · " + quantidadeDeBytes + " bytes em UTF-8";
}

// Coloca as chaves geradas nos campos da tela.
function exibirChaves(chaves) {
  elemento("valor-e").value = chaves.e.toString();
  elemento("valor-n").value = chaves.n.toString();
  elemento("valor-d").value = chaves.d.toString();

  elemento("valor-p").textContent = chaves.p.toString();
  elemento("valor-q").textContent = chaves.q.toString();
  elemento("valor-phi").textContent = chaves.phi.toString();
  elemento("valor-bits").textContent = quantidadeDeBits(chaves.n) + " bits";
  elemento("valor-bloco").textContent = tamanhoDoBlocoEmBytes(chaves.n) + " bytes por bloco";

  elemento("area-chaves").hidden = false;
}

// Apaga o resultado antigo (usado quando as chaves mudam).
function limparResultado() {
  elemento("resultado").value = "";
  elemento("resumo-resultado").textContent = "";
}

// Gera as chaves usando o tamanho escolhido na lista.
function gerarChavesPelaTela() {
  const bitsEscolhidos = Number(elemento("tamanho-chave").value);
  chavesAtuais = gerarChaves(bitsEscolhidos);
  exibirChaves(chavesAtuais);
  limparResultado();
}

// Clique em "Gerar chaves".
function aoClicarGerarChaves() {
  const botao = elemento("botao-gerar");
  botao.disabled = true;
  mostrarAviso("Procurando números primos... isso pode levar alguns segundos.", "info");

  // O setTimeout dá tempo para a tela mostrar o aviso antes da conta pesada começar.
  setTimeout(function () {
    try {
      gerarChavesPelaTela();
      mostrarAviso("Chaves geradas. Copie D e N para usar no sistema de descriptografia.", "sucesso");
    } catch (erro) {
      mostrarAviso("Não foi possível gerar as chaves: " + erro.message, "erro");
    }
    botao.disabled = false;
  }, 30);
}

// Clique em "Criptografar".
function aoClicarCriptografar() {
  const texto = elemento("texto-original").value;
  const botao = elemento("botao-criptografar");

  // Validação feita antes de qualquer conta, para o erro aparecer na hora.
  try {
    validarTextoParaCriptografar(texto);
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
    return;
  }

  botao.disabled = true;
  mostrarAviso("Criptografando...", "info");

  setTimeout(function () {
    try {
      let geradasAgora = false;
      if (chavesAtuais === null) {
        gerarChavesPelaTela(); // facilita: se ainda não há chaves, cria agora
        geradasAgora = true;
      }

      const chavePublica = { e: chavesAtuais.e, n: chavesAtuais.n };
      const resultado = criptografarTexto(texto, chavePublica);

      elemento("resultado").value = resultado.pacote;
      elemento("resumo-resultado").textContent =
        resultado.totalDeBytes + " bytes em " + resultado.quantidadeDeBlocos +
        (resultado.quantidadeDeBlocos === 1 ? " bloco" : " blocos") +
        " de até " + resultado.tamanhoDoBloco + " bytes";

      let mensagem = "Mensagem criptografada.";
      if (geradasAgora) {
        mensagem = "Como ainda não havia chaves, elas foram geradas agora. " + mensagem;
      }
      mostrarAviso(mensagem + " Leve o resultado, D e N para o sistema 2.", "sucesso");
    } catch (erro) {
      mostrarAviso("Erro ao criptografar: " + erro.message, "erro");
    }
    botao.disabled = false;
  }, 30);
}

/*
  Copia o conteúdo de um campo para a área de transferência.
  Tenta a forma moderna (navigator.clipboard) e, se o navegador não permitir,
  usa a forma antiga (selecionar o texto e executar "copy").
*/
function copiarCampo(idDoCampo, nomeDoCampo) {
  const campo = elemento(idDoCampo);
  const conteudo = campo.value;

  if (conteudo === "") {
    mostrarAviso("Não há nada para copiar em \"" + nomeDoCampo + "\" ainda.", "erro");
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

// Liga cada botão à sua função. Roda quando a página termina de carregar.
function iniciarInterface() {
  elemento("botao-gerar").addEventListener("click", aoClicarGerarChaves);
  elemento("botao-criptografar").addEventListener("click", aoClicarCriptografar);
  elemento("texto-original").addEventListener("input", atualizarContador);

  // Todos os botões com o atributo data-copiar copiam o campo indicado.
  const botoesDeCopiar = document.querySelectorAll("[data-copiar]");
  for (const botao of botoesDeCopiar) {
    botao.addEventListener("click", function () {
      copiarCampo(botao.dataset.copiar, botao.dataset.nome);
    });
  }

  atualizarContador();
}

document.addEventListener("DOMContentLoaded", iniciarInterface);
