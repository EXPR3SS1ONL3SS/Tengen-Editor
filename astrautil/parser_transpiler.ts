// lumin-transpiler.ts
// Usage:
//   import { transpile } from "./lumin-transpiler";
//   console.log(transpile(`func add(a: num, b: num) -> num
//     let c = a + b
//     output c
//     return c
//   end`))

import { ClassificationTypeNames } from "typescript";

/* ===================== Lexer ===================== */

type TokenType =
  | "identifier" | "number" | "string"
  | "lparen" | "rparen" | "lbrace" | "rbrace" | "comma" | "colon" | "arrow"
  | "plus" | "minus" | "star" | "slash" | "percent"
  | "assign" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte"
  | "newline" | "eof";

type Tok = { type: TokenType; lexeme: string; line: number; col: number };

const kw = new Set([
  "fn","end","return","let","if","else","until","true","false","nil",
  "print","async","await","class","enum","pub","priv","struct"
]);

function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0, line = 1, col = 1;

  const peek = () => src[i] ?? "\0";
  const next = () => { const c = src[i++] ?? "\0"; if (c === "\n") { line++; col = 1; } else col++; return c; };
  const push = (type: TokenType, lexeme = "") => toks.push({ type, lexeme, line, col });

  while (i < src.length) {
    const c = peek();
    if (c === " " || c === "\t" || c === "\r") { next(); continue; }
    if (c === "\n") { next(); push("newline", "\n"); continue; }

    // comments: -- line, or --[[ ... ]] block
    if (c === "-" && src[i+1] === "-") {
      if (src[i+2] === "[" && src[i+3] === "[") {
        i += 4; col += 4;
        while (!(src[i] === "]" && src[i+1] === "]") && i < src.length) next();
        i += 2; col += 2;
      } else {
        while (peek() !== "\n" && i < src.length) next();
      }
      continue;
    }

    if (c === "(") { next(); push("lparen","("); continue; }
    if (c === ")") { next(); push("rparen",")"); continue; }
    if (c === "{") { next(); push("lbrace","{"); continue; }
    if (c === "}") { next(); push("rbrace","}"); continue; }
    if (c === ",") { next(); push("comma",","); continue; }
    if (c === ":") { next(); push("colon",":"); continue; }
    if (c === "+" ) { next(); push("plus","+"); continue; }
    if (c === "-" ) {
      if (src[i+1] === ">") { i+=2; col+=2; push("arrow","->"); continue; }
      next(); push("minus","-"); continue;
    }
    if (c === "*" ) { next(); push("star","*"); continue; }
    if (c === "/" ) { next(); push("slash","/"); continue; }
    if (c === "%" ) { next(); push("percent","%"); continue; }
    if (c === "=" ) {
      if (src[i+1] === "=") { i+=2; col+=2; push("eq","=="); continue; }
      next(); push("assign","="); continue;
    }
    if (c === "!" && src[i+1] === "=") { i+=2; col+=2; push("neq","!="); continue; }
    if (c === "<") {
      if (src[i+1] === "=") { i+=2; col+=2; push("lte","<="); continue; }
      next(); push("lt","<"); continue;
    }
    if (c === ">") {
      if (src[i+1] === "=") { i+=2; col+=2; push("gte",">="); continue; }
      next(); push("gt",">"); continue;
    }

    if (c === `"` || c === `'`) {
      const quote = next();
      let s = "";
      while (peek() !== quote && i < src.length) {
        if (peek() === "\\" && (src[i+1] === quote)) { next(); s += next(); }
        else s += next();
      }
      if (peek() !== quote) throw new Error(`Unterminated string at ${line}:${col}`);
      next();
      toks.push({ type: "string", lexeme: s, line, col });
      continue;
    }

    if (/[0-9]/.test(c)) {
      let n = "";
      while (/[0-9_]/.test(peek())) n += next();
      if (peek() === ".") {
        n += next();
        while (/[0-9_]/.test(peek())) n += next();
      }
      toks.push({ type: "number", lexeme: n.replaceAll("_",""), line, col });
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let id = "";
      while (/[A-Za-z0-9_]/.test(peek())) id += next();
      // treat keywords as identifiers with same lexeme; parser will check kw set
      toks.push({ type: "identifier", lexeme: id, line, col });
      continue;
    }

    throw new Error(`Unexpected character '${c}' at ${line}:${col}`);
  }
  toks.push({ type: "eof", lexeme: "", line, col });
  return toks;
}

/* ===================== AST ===================== */

type TypeName = "num"|"str"|"bool"|"nil"|string;

type Expr =
  | { kind:"LitNum"; value:number }
  | { kind:"LitStr"; value:string }
  | { kind:"LitBool"; value:boolean }
  | { kind:"Nil" }
  | { kind:"Var"; name:string }
  | { kind:"Call"; callee:string; args: Expr[] }
  | { kind:"Await"; expr: Expr }
  | { kind:"Unary"; op:"-" ; right: Expr }
  | { kind:"Binary"; left: Expr; op: string; right: Expr }
  ;

type Stmt =
  | { kind:"Let"; name:string; init: Expr }
  | { kind:"ExprStmt"; expr: Expr }
  | { kind:"Return"; expr?: Expr }
  | { kind:"If"; cond: Expr; then: Stmt[]; elseBranch?: Stmt[] }
  | { kind:"Until"; cond: Expr; body: Stmt[] }
  | { kind:"Print"; expr: Expr }
  | { kind:"Enum"; expr: Expr }
  | { kind:"Struct"; expr: Expr}
  ;

type FuncDecl = {
  name: string;
  params: { name:string; type?: TypeName }[];
  ret?: TypeName;
  body: Stmt[];
};type AsyncFuncDecl = {
  name: string;
  params: { name:string; type?: TypeName }[];
  ret?: TypeName;
  body: Stmt[];
  async: boolean;
}
;type ClassDecl = {
  name: string;
  body: Stmt[];
  
};

type Program = { funcs: AsyncFuncDecl[] };

/* ===================== Parser (recursive descent with precedence) ===================== */

class Parser {
  private i = 0;
  constructor(private toks: Tok[]) {}

  private at(t: TokenType, off=0) { return this.toks[this.i+off]?.type === t; }
  private cur() { return this.toks[this.i]; }
  private eat(t: TokenType, msg?: string) {
    if (!this.at(t)) throw new Error(msg ?? `Expected ${t} at ${this.cur().line}:${this.cur().col}`);
    return this.toks[this.i++];
  }
  private maybe(t: TokenType) { if (this.at(t)) return this.toks[this.i++]; }

  private skipNewlines() { while (this.at("newline")) this.i++; }

  parseProgram(): Program {
    const funcs: AsyncFuncDecl[] = [];
    this.skipNewlines();
    while (!this.at("eof")) {
      funcs.push(this.parseFunc());
      this.skipNewlines();
    }
    return { funcs };
  }

  private parseTypeMaybe(): TypeName | undefined {
    if (this.at("arrow")) {
      this.eat("arrow");
      const t = this.eat("identifier","return type").lexeme;
      return t as TypeName;
    }
    return undefined;
  }

  private parseFunc(): AsyncFuncDecl {
    const idTok = this.eat("identifier","func");
    if (idTok.lexeme !== "func" && idTok.lexeme !== "async") throw new Error(`Expected 'func' or 'async' at ${idTok.line}:${idTok.col}`);
    const isAsync = idTok.lexeme === "async" ? (this.eat("identifier","func").lexeme === "func") || (()=>{throw new Error("expected 'func'");})() : false;

    const name = this.eat("identifier","function name").lexeme;

    this.eat("lparen");
    const params: {name:string; type?:TypeName}[] = [];
    if (!this.at("rparen")) {
      do {
        const pName = this.eat("identifier","param name").lexeme;
        let pType: TypeName|undefined;
        if (this.maybe("colon")) {
          pType = this.eat("identifier","param type").lexeme as TypeName;
        }
        params.push({ name: pName, type: pType });
      } while (this.maybe("comma"));
    }
    this.eat("rparen");

    const ret = this.parseTypeMaybe();

    this.skipNewlines();
    const body: Stmt[] = [];
    while (!(this.at("identifier") && this.toks[this.i].lexeme === "end")) {
      body.push(this.parseStmt());
      this.skipNewlines();
      if (this.at("eof")) throw new Error("Unterminated function, missing 'end'");
    }
    this.i++; // consume 'end'
    this.skipNewlines();
    return { name, params, ret, body, async: isAsync};
  }

  private parseStmt(): Stmt {
    this.skipNewlines();
    const t = this.cur();
    if (t.type === "identifier") {
      switch (t.lexeme) {
        case "let": return this.parseLet();
        case "return": return this.parseReturn();
        case "if": return this.parseIf();
        case "while": return this.parseWhile();
        case "output": return this.parseOutput();
      }
    }
    const expr = this.parseExpr();
    return { kind:"ExprStmt", expr };
  }

  private parseLet(): Stmt {
    this.i++; // let
    const name = this.eat("identifier","binding name").lexeme;
    this.eat("assign","=");
    const init = this.parseExpr();
    return { kind:"Let", name, init };
  }

  private parseReturn(): Stmt {
    this.i++; // return
    if (this.at("newline")) return { kind:"Return" };
    if (this.at("identifier") && this.toks[this.i].lexeme === "end") return { kind:"Return" };
    const expr = this.parseExpr();
    return { kind:"Return", expr };
  }

  private parseIf(): Stmt {
    this.i++; // if
    const cond = this.parseExpr();
    this.skipNewlines();
    const then: Stmt[] = [];
    while (!(this.at("identifier") && (this.toks[this.i].lexeme === "else" || this.toks[this.i].lexeme === "end"))) {
      then.push(this.parseStmt());
      this.skipNewlines();
    }
    let elseBranch: Stmt[]|undefined;
    if (this.at("identifier") && this.toks[this.i].lexeme === "else") {
      this.i++; // else
      this.skipNewlines();
      const els: Stmt[] = [];
      while (!(this.at("identifier") && this.toks[this.i].lexeme === "end")) {
        els.push(this.parseStmt());
        this.skipNewlines();
      }
      elseBranch = els;
    }
    this.eat("identifier","end"); // end
    return { kind:"If", cond, then, elseBranch };
  }

  private parseWhile(): Stmt {
    this.i++; // while
    const cond = this.parseExpr();
    this.skipNewlines();
    const body: Stmt[] = [];
    while ((this.at("identifier") && this.toks[this.i].lexeme === "end")) {
      body.push(this.parseStmt());
      this.skipNewlines();
    }
    this.i++; // end
    return { kind:"Until", cond, body };
  }

  private parseOutput(): Stmt {
    this.i++; // output
    const expr = this.parseExpr();
    return { kind:"Print", expr };
  }

  // Pratt parser
  private parseExpr(): Expr { return this.parseBinary(0); }
  private precedence(op: string): number {
    switch (op) {
      case "==" : case "!=": return 1;
      case "<": case "<=": case ">": case ">=": return 2;
      case "+": case "-": return 3;
      case "*": case "/": case "%": return 4;
      default: return -1;
    }
  }

  private parsePrimary(): Expr {
    const t = this.cur();
    if (t.type === "number") { this.i++; return { kind:"LitNum", value: Number(t.lexeme) }; }
    if (t.type === "string") { this.i++; return { kind:"LitStr", value: t.lexeme }; }
    if (t.type === "identifier") {
      if (t.lexeme === "true") { this.i++; return { kind:"LitBool", value: true }; }
      if (t.lexeme === "false") { this.i++; return { kind:"LitBool", value: false }; }
      if (t.lexeme === "nil") { this.i++; return { kind:"Nil" }; }
      if (t.lexeme === "await") {
        this.i++;
        const expr = this.parsePrimary();
        return { kind:"Await", expr };
      }
      // call or var
      const name = t.lexeme; this.i++;
      if (this.maybe("lparen")) {
        const args: Expr[] = [];
        if (!this.at("rparen")) {
          do { args.push(this.parseExpr()); } while (this.maybe("comma"));
        }
        this.eat("rparen",")");
        return { kind:"Call", callee: name, args };
      }
      return { kind:"Var", name };
    }
    if (t.type === "lparen") {
      this.i++;
      const e = this.parseExpr();
      this.eat("rparen",")");
      return e;
    }
    if (t.type === "minus") {
      this.i++;
      const right = this.parsePrimary();
      return { kind:"Unary", op:"-", right };
    }
    throw new Error(`Unexpected token ${t.type} at ${t.line}:${t.col}`);
  }

  private parseBinary(minPrec: number): Expr {
    let left = this.parsePrimary();
    while (true) {
      const tok = this.cur();
      const op = (
        tok.type === "plus" ? "+" :
        tok.type === "minus" ? "-" :
        tok.type === "star" ? "*" :
        tok.type === "slash" ? "/" :
        tok.type === "percent" ? "%" :
        tok.type === "eq" ? "==" :
        tok.type === "neq" ? "!=" :
        tok.type === "lt" ? "<" :
        tok.type === "lte" ? "<=" :
        tok.type === "gt" ? ">" :
        tok.type === "gte" ? ">=" : null
      );
      if (!op) break;
      const prec = this.precedence(op);
      if (prec < minPrec) break;
      this.i++; // consume op
      const right = this.parseBinary(prec + 1);
      left = { kind:"Binary", left, op, right };
    }
    return left;
  }
}

/* ===================== Emitter ===================== */

function mapType(t?: TypeName): string | undefined {
  if (!t) return undefined;
  if (t === "num") return "number";
  if (t === "str") return "string";
  if (t === "bool") return "boolean";
  if (t === "nil") return "void";
  return t; // user-supplied TS type
}

function emitExpr(e: Expr): string {
  switch (e.kind) {
    case "LitNum": return String(e.value);
    case "LitStr": return JSON.stringify(e.value);
    case "LitBool": return e.value ? "true" : "false";
    case "Nil": return "undefined";
    case "Var": return e.name;
    case "Call": return `${e.callee}(${e.args.map(emitExpr).join(", ")})`;
    case "Await": return `await ${emitExpr(e.expr)}`;
    case "Unary": return `-${emitExpr(e.right)}`;
    case "Binary": return `(${emitExpr(e.left)} ${e.op} ${emitExpr(e.right)})`;
  }
}

function emitStmt(s: Stmt, indent: string): string {
  switch (s.kind) {
    case "Let": return `${indent}let ${s.name} = ${emitExpr(s.init)};`;
    case "ExprStmt": return `${indent}${emitExpr(s.expr)};`;
    case "Return": return s.expr ? `${indent}return ${emitExpr(s.expr)};` : `${indent}return;`;
    case "Print": return `${indent}console.log(${emitExpr(s.expr)});`;
    case "If": {
      const th = s.then.map(st => emitStmt(st, indent + "  ")).join("\n");
      const el = s.elseBranch?.map(st => emitStmt(st, indent + "  ")).join("\n");
      return `${indent}if (${emitExpr(s.cond)}) {\n${th}\n${indent}}${el ? ` else {\n${el}\n${indent}}` : ""}`;
    }
    case "Until": {
      const b = s.body.map(st => emitStmt(st, indent + "  ")).join("\n");
      return `${indent}while (!${emitExpr(s.cond)}) {\n${b}\n${indent}}`;
    }
    case "Enum": {
      return ``
    }
    case "Struct": {
      return ``
    }
  }
}

function emitFunc(f: AsyncFuncDecl): string {
  const params = f.params.map(p => `${p.name}${p.type ? `: ${mapType(p.type)}` : ""}`).join(", ");
  const ret = mapType(f.ret);
  const sig = `function ${f.name}(${params})${ret ? `: ${ret}` : ""}`;
  const header = f.async ? `async ${sig}` : sig;
  const body = f.body.map(st => emitStmt(st, "  ")).join("\n");
  return `${header} {\n${body}\n}`;
}

function emitClass(c: ClassDecl): string {
  return ``
}

function emitProgram(p: Program): string {
  return p.funcs.map(emitFunc).join("\n\n");
}

/* ===================== Public API ===================== */

export function transpile(source: string): string {
  const tokens = lex(source);
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();
  return emitProgram(ast);
}



/* ===================== CLI (optional) ===================== */
/*
if (require.main === module) {
  const fs = require("fs");
  const src = fs.readFileSync(0, "utf8");
  process.stdout.write(transpile(src));
}
*/