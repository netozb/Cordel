'use strict';
// Gera a gramática TextMate da Cordel (destaque de sintaxe no VS Code, GitHub e outros editores)
// a partir das listas do próprio interpretador, para nunca ficar desatualizada.
//
// Nomes em Cordel ignoram acentos e maiúsculas: "senão", "senao" e "SENÃO" são a mesma palavra.
// Por isso cada palavra vira um padrão que aceita as duas formas de cada letra.

const VARIANTES = { a: 'aáàâã', e: 'eéê', i: 'ií', o: 'oóôõ', u: 'uúü', c: 'cç' };
const BASE = { á: 'a', à: 'a', â: 'a', ã: 'a', é: 'e', ê: 'e', í: 'i', ó: 'o', ô: 'o', õ: 'o', ú: 'u', ü: 'u', ç: 'c' };

function flexivel(palavra) {
  return [...palavra.toLowerCase()].map(ch => {
    const b = BASE[ch] || ch;
    return VARIANTES[b] ? '[' + VARIANTES[b] + ']' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
}
const unicas = lista => [...new Set(lista.map(p => p.toLowerCase()))];
// ordena das mais longas para as mais curtas: "senão" antes de "se"
const alternativa = lista => unicas(lista).sort((a, b) => b.length - a.length).map(flexivel).join('|');

const INI = '(?<![\\p{L}\\p{N}_])';
const FIM = '(?![\\p{L}\\p{N}_])';
const NOME = '[\\p{L}_][\\p{L}\\p{N}_]*';

function gerarGramatica({ controle, funcao, variavel, logicas, constantes, tela, contexto, funcoes, metodos }) {
  const palavra = (lista, escopo) => ({ match: '(?i)' + INI + '(' + alternativa(lista) + ')' + FIM, name: escopo });
  return {
    $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
    name: 'Cordel',
    scopeName: 'source.cordel',
    fileTypes: ['cordel'],
    patterns: [
      { include: '#comentario' },
      { include: '#texto' },
      { include: '#numero' },
      { include: '#definicao-de-funcao' },
      { include: '#uso-de-modulo' },
      { include: '#elemento-de-tela' },
      { include: '#palavras' },
      { include: '#chave-de-registro' },
      { include: '#chamada' },
      { include: '#acao' },
      { include: '#operadores' },
      { include: '#pontuacao' },
    ],
    repository: {
      comentario: {
        match: '(#).*$',
        name: 'comment.line.number-sign.cordel',
        captures: { 1: { name: 'punctuation.definition.comment.cordel' } },
      },
      texto: {
        patterns: [
          { begin: '["\\x{201C}\\x{201D}\\x{201E}]', end: '["\\x{201C}\\x{201D}\\x{201E}]|$', name: 'string.quoted.double.cordel',
            beginCaptures: { 0: { name: 'punctuation.definition.string.begin.cordel' } }, endCaptures: { 0: { name: 'punctuation.definition.string.end.cordel' } },
            patterns: [{ include: '#escape' }, { include: '#encaixe' }] },
          { begin: "['\\x{2018}\\x{2019}]", end: "['\\x{2018}\\x{2019}]|$", name: 'string.quoted.single.cordel',
            beginCaptures: { 0: { name: 'punctuation.definition.string.begin.cordel' } }, endCaptures: { 0: { name: 'punctuation.definition.string.end.cordel' } },
            patterns: [{ include: '#escape' }, { include: '#encaixe' }] },
        ],
      },
      escape: { match: '\\\\.', name: 'constant.character.escape.cordel' },
      encaixe: {
        begin: '\\{', end: '\\}|$', name: 'meta.interpolation.cordel', contentName: 'meta.embedded.line.cordel',
        beginCaptures: { 0: { name: 'punctuation.section.interpolation.begin.cordel' } },
        endCaptures: { 0: { name: 'punctuation.section.interpolation.end.cordel' } },
        patterns: [{ include: '$self' }],
      },
      numero: { match: INI + '\\d[\\d_]*(?:\\.\\d+)?' + FIM, name: 'constant.numeric.cordel' },
      'definicao-de-funcao': {
        match: '(?i)' + INI + '(' + alternativa(funcao) + ')\\s+(' + NOME + ')',
        captures: { 1: { name: 'storage.type.function.cordel' }, 2: { name: 'entity.name.function.cordel' } },
      },
      'uso-de-modulo': {
        match: '(?i)^\\s*(use)(?=\\s+["\\x{201C}\\x{201D}\'\\x{2018}])',
        captures: { 1: { name: 'keyword.control.import.cordel' } },
      },
      // título, botão, campo… só são elementos no começo da linha e sem = . ( depois (senão são nomes comuns)
      'elemento-de-tela': {
        match: '(?i)^\\s*(' + alternativa(tela) + ')' + FIM + '(?!\\s*(?:[-+*/]?=(?![=>])|\\.|\\())',
        captures: { 1: { name: 'keyword.other.ui.cordel' } },
      },
      palavras: {
        patterns: [
          // "é" (igual a) vem antes de "e" (lógico): aqui o acento muda a palavra
          { match: INI + '(é|É)' + FIM, name: 'keyword.operator.comparison.word.cordel' },
          palavra(controle, 'keyword.control.cordel'),
          palavra(funcao, 'storage.type.function.cordel'),
          palavra(variavel, 'storage.modifier.cordel'),
          palavra(logicas, 'keyword.operator.logical.cordel'),
          palavra(constantes, 'constant.language.boolean.cordel'),
          { match: '(?i)(?<!\\.)' + INI + '(' + alternativa(contexto) + ')' + FIM, name: 'keyword.other.context.cordel' },
        ],
      },
      'chave-de-registro': { match: INI + '(' + NOME + ')(?=\\s*:)', captures: { 1: { name: 'variable.other.property.key.cordel' } } },
      chamada: {
        patterns: [
          { match: '(?i)(?<!\\.)' + INI + '(' + alternativa(funcoes) + ')(?=\\s*\\()', captures: { 1: { name: 'support.function.builtin.cordel' } } },
          { match: '(?<!\\.)' + INI + '(' + NOME + ')(?=\\s*\\()', captures: { 1: { name: 'entity.name.function.call.cordel' } } },
        ],
      },
      acao: {
        patterns: [
          { match: '(?i)(\\.)\\s*(' + alternativa(metodos) + ')' + FIM, captures: { 1: { name: 'punctuation.accessor.cordel' }, 2: { name: 'support.function.method.cordel' } } },
          { match: '(\\.)\\s*(' + NOME + ')', captures: { 1: { name: 'punctuation.accessor.cordel' }, 2: { name: 'variable.other.property.cordel' } } },
        ],
      },
      operadores: {
        patterns: [
          { match: '=>', name: 'storage.type.function.arrow.cordel' },
          { match: '==|!=|<=|>=|<|>', name: 'keyword.operator.comparison.cordel' },
          { match: '[-+*/]=|=', name: 'keyword.operator.assignment.cordel' },
          { match: '[-+*/%^]', name: 'keyword.operator.arithmetic.cordel' },
        ],
      },
      pontuacao: {
        patterns: [
          { match: ',', name: 'punctuation.separator.comma.cordel' },
          { match: ':', name: 'punctuation.separator.key-value.cordel' },
          { match: ';', name: 'punctuation.terminator.statement.cordel' },
          { match: '[()]', name: 'punctuation.section.parens.cordel' },
          { match: '[\\[\\]]', name: 'punctuation.section.brackets.cordel' },
          { match: '[{}]', name: 'punctuation.section.braces.cordel' },
        ],
      },
    },
  };
}

module.exports = { gerarGramatica, flexivel };
