// Tipos da biblioteca Cordel (o mesmo interpretador do editor e da linha de comando).
//
//   const Cordel = require('cordel');
//   const r = Cordel.run('mostre 0.1 + 0.2');
//   r.out[0].text  // "0.3"

/** Um arquivo que o programa pode ler com tabela(…), leia(…) ou abas(…). */
export type Arquivo =
  | { name: string; text: string }
  | { name: string; sheets: { name: string; rows: (string | number | boolean | null)[][]; /** a linha da planilha de cada item de rows (para a origem) */ linhas?: number[] }[] };

/** Célula de tabela: texto, número exato (em texto decimal), data (dt em ISO: aaaa-mm-dd ou aaaa-mm-ddThh:mm:ss) ou lógico. */
export type Celula = string | { n: string } | { dt: string; s: string } | { b: boolean };

/** De onde veio um valor mostrado: o resumo e até 20 das linhas das planilhas que o formaram. */
export interface Origem {
  /** "42 células de vendas.csv (coluna Total; linhas 2 a 43)" */
  texto: string;
  /** Versão curta, para uma coluna: "vendas.csv, linhas 2 a 43" */
  curto: string;
  /** Quantas linhas de planilha formaram o valor (sem esse campo, a origem é a internet ou um índice). */
  total?: number;
  cols?: string[] | null;
  rows?: Celula[][];
  /** Onde fica cada linha de rows: "linha 17" (ou "vendas.csv · linha 17" com várias planilhas). */
  onde?: string[];
}

export type Saida =
  /** origens: os trechos do texto (ini..fim) que vieram de planilhas, da internet ou de índices. */
  | { kind: 'out'; text: string; origens?: (Origem & { ini: number; fim: number })[] }
  | { kind: 'ask'; text: string }
  | { kind: 'answer'; text: string }
  /** origens: a origem de cada linha mostrada (null quando a linha não veio de fora). */
  | { kind: 'table'; cols: string[] | null; rows: Celula[][]; total: number; origens?: (Origem | null)[] }
  | { kind: 'chart'; title: string; campo: string | null; total: number; labels: string[]; values: string[] }
  | { kind: 'file'; name: string; ext: string; rows: number | null };

export interface ErroCordel {
  /** Mensagem em português, com trechos de código entre crases. */
  msg: string;
  /** Sugestão de correção, quando houver. */
  dica: string | null;
  line: number;
  col: number;
  lineText: string;
  /** Nome do módulo onde o erro aconteceu (ausente quando é no próprio programa). */
  arquivo?: string;
}

export interface ResultadoDeTeste { name: string; ok: boolean; msg?: string; line?: number }

/** Arquivo gravado por salve(…). Tabelas (.csv, .xlsx) trazem cols e rows; textos trazem text. */
export interface ArquivoSalvo { name: string; ext: 'csv' | 'xlsx' | 'txt' | 'md' | 'json' | string; text?: string; cols?: string[] | null; rows?: Celula[][] }

/** Elemento da tela (árvore redesenhada a cada toque). */
export interface NoTela { t: string; kids?: NoTela[]; [prop: string]: unknown }

export interface Resultado {
  out: Saida[];
  error: ErroCordel | null;
  /** Texto da pergunta quando o programa parou esperando uma resposta de pergunte(…). */
  ask: string | null;
  tests: ResultadoDeTeste[] | null;
  files: ArquivoSalvo[];
  ui: NoTela | null;
  /** Busca pendente: sem a opção buscar, o programa para na primeira busca que ainda não tem resposta. Busque o endereço, ponha a resposta em rede e rode de novo. */
  busca?: PedidoDeBusca;
  /** Tempo de execução em milissegundos. */
  ms: number;
}

export interface PedidoDeBusca { url: string; cabecalhos: Record<string, string>; chave: string }
/** Resposta de uma busca: status, tipo (Content-Type) e texto; ou um erro de rede, de tempo ou de tamanho. */
export type RespostaDeBusca = { status: number; tipo: string; texto: string } | { erro: 'rede' | 'tempo' | 'grande'; segundos?: number; detalhe?: string };

export interface Opcoes {
  /** Respostas para pergunte(…), na ordem. Quando acabam, o resultado traz ask com a próxima pergunta. */
  answers?: string[];
  /** Semente dos sorteios de aleatório(…): a mesma semente repete os mesmos números. */
  seed?: number;
  files?: Arquivo[];
  /** Data usada por hoje(), no formato aaaa-mm-dd. */
  hoje?: string;
  /** Momento usado por agora(), como "2026-09-26T14:30:00". Sem ele, agora() usa o relógio (na data de hoje, se ela foi fixada). */
  agora?: string;
  /** Roda como app: a tela fica viva e pergunte(…) não é permitido. */
  app?: boolean;
  /** Memória de guarde(…) e guardado(…). */
  storage?: { get(chave: string): unknown; set(chave: string, valor: unknown): void };
  /** Limite de passos (padrão: 20 milhões para programas, 5 milhões por toque em apps). */
  maxSteps?: number;
  /** Grava o passo a passo da execução (máquina do tempo). */
  trace?: boolean;
  /** Módulos para use "nome": um objeto { nome: código } ou uma função nome → código (ou { nome, src }). */
  modulos?: Record<string, string> | ((nome: string) => string | { nome: string; src: string } | null) | null;
  /** Busca síncrona para busque(…), tabela("https://…"), índice(…) e cotação(…). Sem ela, veja Resultado.busca. */
  buscar?: (url: string, cabecalhos: Record<string, string>) => RespostaDeBusca;
  /** Respostas já conhecidas, pela chave do pedido (o endereço, quando não há cabeçalhos). */
  rede?: Record<string, RespostaDeBusca>;
}

export interface Sessao {
  res: Resultado;
  temTela: boolean;
  /** Dispara um toque ou digitação no elemento de número id; 'voltar' e 'ir' navegam entre páginas. */
  event(id: number | 'voltar' | 'ir', valor?: unknown): { out: Saida[]; error: ErroCordel | null; ui: NoTela | null; files: ArquivoSalvo[]; changed: boolean; busca?: PedidoDeBusca; ms: number };
  /** Guarda a resposta de uma busca pedida por um toque; depois, repita o mesmo event. */
  lembrar(chave: string, resposta: RespostaDeBusca): void;
}

export interface Problema {
  nivel: 'erro' | 'aviso';
  linha: number;
  col: number;
  msg: string;
  dica: string | null;
  /** Verdadeiro para erros de sintaxe (o programa nem começa a rodar). */
  sintaxe?: boolean;
}

/** Roda um programa do começo ao fim. */
export function run(src: string, opcoes?: Opcoes): Resultado;
/** Roda um programa e mantém a tela viva para receber toques. */
export function start(src: string, opcoes?: Opcoes): Sessao;
/** Aponta erros e avisos sem rodar o programa. */
export function verificar(src: string, opcoes?: { modulos?: Opcoes['modulos'] }): { problemas: Problema[] };
/** Devolve o código no formato oficial (recuo de 2 espaços, espaçamento, grafia oficial). Nunca muda o significado. */
export function formatar(src: string): string;
/** Forma normalizada de um nome: sem acentos e em minúsculas ("Preço" → "preco"). */
export function norm(nome: string): string;
/** Versão da linguagem, como "0.7.0". */
export const version: string;
