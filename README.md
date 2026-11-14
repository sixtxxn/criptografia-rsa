# Projeto RSA — Criptografia e Descriptografia

Dois sistemas independentes, feitos em HTML, CSS e JavaScript puro, que implementam o algoritmo RSA à mão (sem bibliotecas de criptografia).

```text
PROJETO-RSA/
├── 01-CRIPTOGRAFIA/      Sistema 1: gera as chaves e criptografa o texto
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── README.md
│
└── 02-DESCRIPTOGRAFIA/   Sistema 2: recebe D, N e a mensagem e recupera o texto
    ├── index.html
    ├── style.css
    ├── script.js
    └── README.md
```

## Como executar

Não precisa instalar nada. Basta abrir o `index.html` de cada pasta no navegador.

1. Abra `01-CRIPTOGRAFIA/index.html`, clique em **Gerar chaves**, escreva o texto e clique em **Criptografar**.
2. Copie **D**, **N** e o **resultado** com os botões de copiar.
3. Abra `02-DESCRIPTOGRAFIA/index.html`, cole os três valores e clique em **Descriptografar**.

A explicação completa de cada sistema (matemática, funções do `script.js`, formato dos dados e testes) está no `README.md` de cada pasta.

## Aviso

Projeto com finalidade educacional. O RSA implementado aqui não usa padding e não deve ser usado para proteger dados reais. Sistemas de verdade usam RSA-OAEP com SHA-256 por meio de bibliotecas criptográficas confiáveis.
