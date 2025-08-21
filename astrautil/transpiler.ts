// lumin-transpiler-fixed.ts
// Fixed single-file Lumin -> TypeScript transpiler/parser/emitter.
// Fixes: added missing wrappers, corrected token names, and made parse/emit consistent.

type TokenType =
  | "identifier" | "number" | "string"
  | "lparen" | "rparen" | "lbrace" | "rbrace" | "lbracket" | "rbracket"
  | "comma" | "colon" | "arrow" | "dot"
  | "plus" | "minus" | "star" | "slash" | "percent"
  | "assign" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte"
  | "newline" | "eof";

type Tok = { type: TokenType; lexeme: string; line: number; col: number };

const KEYWORDS = new Set([
  "func","end","return","let","if","else","while","for","in","true","false","nil",
  "output","class","struct","enum","prop","pub","priv","readonly","static",
  "self","protect","exception","prototype"
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
    if (c === "\n") { next(); push("newline","\n"); continue; }

    if (c === "-" && src[i+1] === "-") {
      next(); next();
      while (peek() !== "\n" && i < src.length) next();
      continue;
    }

    if (c === "(") { next(); push("lparen","("); continue; }
    if (c === ")") { next(); push("rparen",")"); continue; }
    if (c === "{") { next(); push("lbrace","{"); continue; }
    if (c === "}") { next(); push("rbrace","}"); continue; }
    if (c === "[") { next(); push("lbracket","["); continue; }
    if (c === "]") { next(); push("rbracket","]"); continue; }
    if (c === ",") { next(); push("comma",","); continue; }
    if (c === ":") { next(); push("colon",":"); continue; }
    if (c === ".") { next(); push("dot","."); continue; }
    if (c === "+" ) { next(); push("plus","+"); continue; }
    if (c === "-" ) {
      if (src[i+1] === ">") { next(); next(); push("arrow","->"); continue; }
      next(); push("minus","-"); continue;
    }
    if (c === "*" ) { next(); push("star","*"); continue; }
    if (c === "/" ) { next(); push("slash","/"); continue; }
    if (c === "%" ) { next(); push("percent","%"); continue; }
    if (c === "=" ) {
      if (src[i+1] === "=") { next(); next(); push("eq","=="); continue; }
      next(); push("assign","="); continue;
    }
    if (c === "!" && src[i+1] === "=") { next(); next(); push("neq","!="); continue; }
    if (c === "<") {
      if (src[i+1] === "=") { next(); next(); push("lte","<="); continue; }
      next(); push("lt","<"); continue;
    }
    if (c === ">") {
      if (src[i+1] === "=") { next(); next(); push("gte",">="); continue; }
      next(); push("gt",">"); continue;
    }

    if (c === `"` || c === `'`) {
      const quote = next();
      let s = "";
      while (peek() !== quote && i < src.length) {
        const ch = next();
        if (ch === "\\") {
          const nx = next();
          s += "\\" + nx;
        } else s += ch;
      }
      if (peek() !== quote) throw new Error(`Unterminated string at ${line}:${col}`);
      next();
      push("string", s);
      continue;
    }

    if (/[0-9]/.test(c)) {
      let n = "";
      while (/[0-9_]/.test(peek())) n += next();
      if (peek() === ".") { n += next(); while (/[0-9_]/.test(peek())) n += next(); }
      push("number", n.replaceAll("_",""));
      continue;
    }

    if (/[A-Za-z_*\-]/.test(c)) {
      let id = "";
      // allow tokens that start with * for var decls like *g
      while (/[A-Za-z0-9_*]/.test(peek())) id += next();
      push("identifier", id);
      continue;
    }

    throw new Error(`Unexpected char '${c}' at ${line}:${col}`);
  }
  push("eof","");
  return toks;
}

/* AST types (same as before) */

type TypeName = string;

type Expr = 
 {
    value?:string|number|boolean
    kind: string,
    props?:{key:string;Value:Expr[]},
    params?: {name:string;type?:TypeName}[],
    args:Expr[],
    ret?: TypeName,
    body?: Stmt[],
    callee?: string,
    name?: string,
    obj?: Expr,
    left?:Expr,
    op?:string,
    right?: Expr,
    index?:Expr,
    elems?:Expr[],
}/**|{
    kind:"LitNum"; value:number
}|{
    kind:"LitStr"; value:string
}|{
    kind:"LitBool"; value:boolean
}|{
    kind:"Nil"
}|{
    kind:"This"
};*/

type ExprOld =
  | { kind:"LitNum"; value:number }
  | { kind:"LitStr"; value:string }
  | { kind:"LitBool"; value:boolean }
  | { kind:"Nil" }
  | { kind:"Var"; name:string }
  | { kind:"This" }
  | { kind:"Call"; callee:string; args:Expr[] }
  | { kind:"Prop"; obj:Expr; name:string }
  | { kind:"Index"; obj:Expr; index:Expr }
  | { kind:"ObjLit"; props:{key:string; value:Expr}[] }
  | { kind:"ArrLit"; elems:Expr[] }
  | { kind:"Unary"; op:"-"; right:Expr }
  | { kind:"Binary"; left:Expr; op:string; right:Expr }
  | { kind:"FuncExpr"; params:{name:string; type?:TypeName}[]; ret?:TypeName; body:Stmt[] };

type AssignTarget =
  | { kind:"AT_Var"; name:string }
  | { kind:"AT_Prop"; obj:Expr; name:string }
  | { kind:"AT_Index"; obj:Expr; index:Expr };

type Stmt =
  | { kind:"VarDecl"; scope:"var"|"const"|"let"; name:string; type?:TypeName; init?:Expr }
  | { kind:"ExprStmt"; expr:Expr }
  | { kind:"Return"; expr?:Expr }
  | { kind:"If"; cond:Expr; then:Stmt[]; elseBranch?:Stmt[] }
  | { kind:"While"; cond:Expr; body:Stmt[] }
  | { kind:"ForOf"; iter:string; collection:Expr; body:Stmt[] }
  | { kind:"Assign"; target:AssignTarget; value:Expr }
  | { kind:"Output"; expr:Expr }
  | { kind:"Protect"; tryFn:Expr; catchFn?:Expr; args?:Expr[] };

type FuncDecl = {
  name: string;
  params: { name:string; type?:TypeName; optional?:boolean }[];
  ret?: TypeName;
  body: Stmt[];
  modifiers?: string[];
};

type Field = { modifiers: string[]; type?:TypeName; name:string; init?:Expr };
type ClassDecl = { name:string; fields:Field[]; methods:FuncDecl[]; protos:FuncDecl[] };
type StructDecl = { name:string; fields:{mod?:string; type?:TypeName; name:string}[] };
type EnumDecl = { name:string; members:string[] };

type Program = {
  globals: Stmt[];
  funcs: FuncDecl[];
  classes: ClassDecl[];
  structs: StructDecl[];
  enums: EnumDecl[];
};

/* Parser */

class Parser {
  i = 0;
  toks: Tok[];
  constructor(toks: Tok[]) { this.toks = toks; }

  cur() { return this.toks[this.i]; }
  at(t: TokenType) { return this.toks[this.i].type === t; }
  eat(t: TokenType, msg?: string) {
    if (!this.at(t)) throw new Error(msg ?? `Expected ${t} at ${this.cur().line}:${this.cur().col}`);
    return this.toks[this.i++];
  }
  maybe(t: TokenType) { if (this.at(t)) return this.toks[this.i++]; return null; }
  skipNewlines() { while (this.at("newline")) this.i++; }

  parseProgram(): Program {
    this.skipNewlines();
    const prog: Program = { globals: [], funcs: [], classes: [], structs: [], enums: [] };
    while (!this.at("eof")) {
      if (this.at("identifier")) {
        const id = this.cur().lexeme;
        if (id === "func") prog.funcs.push(this.parseFuncDecl());
        else if (id === "class") prog.classes.push(this.parseClass());
        else if (id === "struct") prog.structs.push(this.parseStruct());
        else if (id === "enum") prog.enums.push(this.parseEnum());
        else if (id === "protect") prog.globals.push(this.parseProtectStmt());
        else {
          const stmt = this.parseStmt();
          prog.globals.push(stmt);
        }
      } else {
        const stmt = this.parseStmt();
        prog.globals.push(stmt);
      }
      this.skipNewlines();
    }
    return prog;
  }

  parseTypeNameIf(): TypeName | undefined {
    if (this.at("arrow")) {
      this.eat("arrow");
      const id = this.eat("identifier","type name").lexeme;
      return id;
    }
    return undefined;
  }

  // original parseFuncDecl (name after 'func')
  parseFuncDecl(): FuncDecl {
    this.eat("identifier"); // func
    const nameTok = this.eat("identifier");
    const name = nameTok.lexeme;
    return this.parseFuncDeclAfterName(name, []);
  }

  // new helper: allows caller to pass name and modifiers
  parseFuncDeclAfterName(name: string, modifiers: string[] = []): FuncDecl {
    this.eat("lparen");
    const params: {name:string; type?:TypeName; optional?:boolean}[] = [];
    if (!this.at("rparen")) {
      do {
        // parameter name and optional type
        const pName = this.eat("identifier").lexeme;
        let pType: TypeName|undefined;
        let optional = false;
        if (this.maybe("colon")) {
          pType = this.eat("identifier").lexeme;
        }
        if (this.maybe("assign")) {
          // found default initializer in declaration. treat as optional.
          optional = true;
          // read initializer expression (consume tokens until comma or rparen)
          // simple consumption: parse an expression and ignore result
          const _ = this.parseExprSafe();
        }
        params.push({ name: pName, type: pType, optional });
      } while (this.maybe("comma"));
    }
    this.eat("rparen");
    const ret = this.parseTypeNameIf();
    this.skipNewlines();
    const body: Stmt[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      body.push(this.parseStmt());
      this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { name, params, ret, body, modifiers };
  }

  // safe parse expression attempt used when skipping initializers in signatures
  parseExprSafe(): Expr {
    try { return this.parseExpr(); } catch { return { kind:"Nil" }; }
  }

  parseClass(): ClassDecl {
    this.eat("identifier"); // class
    const name = this.eat("identifier").lexeme;
    this.skipNewlines();
    const fields:Field[] = [];
    const methods:FuncDecl[] = [];
    const protos:FuncDecl[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      if (!this.at("identifier")) throw new Error("Unexpected token in class body");
      const tok = this.cur().lexeme;
      if (["pub","priv","readonly","static","prop"].includes(tok)) {
        fields.push(this.parsePropField());
      } else if (["func","pub","priv","static"].includes(tok)) {
        const mods: string[] = [];
        while (this.at("identifier") && ["pub","priv","static"].includes(this.cur().lexeme)) mods.push(this.eat("identifier").lexeme);
        this.eat("identifier","func");
        // parse func where name already consumed by parseFuncDeclAfterName when we want to parse name next
        const nameTok = this.eat("identifier");
        const func = this.parseFuncDeclAfterName(nameTok.lexeme, mods);
        methods.push(func);
      } else if (tok === "prototype") {
        this.eat("identifier"); // prototype
        const clsName = this.eat("identifier").lexeme; // normally same as class name
        this.skipNewlines();
        const f = this.parseFuncDecl(); // parse a func inside prototype
        protos.push(f);
        this.skipNewlines();
        this.eat("identifier","end");
      } else {
        throw new Error(`Unexpected token in class body: ${tok}`);
      }
      this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { name, fields, methods, protos };
  }

  parsePropField(): Field {
    const mods: string[] = [];
    while (this.at("identifier") && ["pub","priv","readonly","static","prop"].includes(this.cur().lexeme)) {
      const lex = this.eat("identifier").lexeme;
      if (lex !== "prop") mods.push(lex);
      else break;
    }
    // if we haven't consumed 'prop', consume it
    if (this.cur().lexeme !== "prop" && this.at("identifier") && this.cur().lexeme === "prop") this.eat("identifier");
    // now type and name
    const type = this.eat("identifier").lexeme;
    const name = this.eat("identifier").lexeme;
    let init: Expr | undefined;
    if (this.maybe("assign")) {
      init = this.parseExpr();
    }
    this.maybe("newline");
    return { modifiers: mods, type, name, init };
  }

  parseStruct(): StructDecl {
    this.eat("identifier"); // struct
    const name = this.eat("identifier").lexeme;
    this.skipNewlines();
    const fields: {mod?:string; type?:TypeName; name:string}[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      let modOrType = this.eat("identifier").lexeme;
      let mod: string|undefined;
      let type: string;
      if (["pub","priv","readonly"].includes(modOrType)) {
        mod = modOrType;
        type = this.eat("identifier").lexeme;
      } else {
        type = modOrType;
      }
      const fname = this.eat("identifier").lexeme;
      fields.push({ mod, type, name: fname });
      this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { name, fields };
  }

  parseEnum(): EnumDecl {
    this.eat("identifier"); // enum
    const name = this.eat("identifier").lexeme;
    this.skipNewlines();
    const members: string[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      if (this.at("identifier")) members.push(this.eat("identifier").lexeme);
      else this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { name, members };
  }

  parseStmt(): Stmt {
    this.skipNewlines();
    if (this.at("identifier")) {
      const id = this.cur().lexeme;
      if (id === "*g" || id === "*r" || id === "*l") return this.parseVarDecl();
      if (id === "return") {
        this.eat("identifier");
        if (this.at("newline") || (this.at("identifier") && this.cur().lexeme === "end")) return { kind:"Return" };
        const e = this.parseExpr();
        return { kind:"Return", expr: e };
      }
      if (id === "if") return this.parseIf();
      if (id === "while") return this.parseWhile();
      if (id === "for") return this.parseFor();
      if (id === "output") { this.eat("identifier"); const e = this.parseExpr(); return { kind:"Output", expr: e }; }
      if (id === "protect") return this.parseProtectStmt();
    }

    const save = this.i;
    try {
      const target = this.parseAssignable();
      if (this.maybe("assign")) {
        const value = this.parseExpr();
        return { kind:"Assign", target, value };
      }
    } catch {
      // not assignable
    }
    this.i = save;
    const expr = this.parseExpr();
    return { kind:"ExprStmt", expr };
  }

  parseVarDecl(): Stmt {
    const scopeTok = this.eat("identifier");
    const scope = scopeTok.lexeme === "*g" ? "var" : scopeTok.lexeme === "*r" ? "const" : "let";
    const type = this.eat("identifier").lexeme;
    const name = this.eat("identifier").lexeme;
    let init: Expr | undefined;
    if (this.maybe("assign")) init = this.parseExpr();
    return { kind:"VarDecl", scope, name, type, init };
  }

  parseIf(): Stmt {
    this.eat("identifier"); // if
    const cond = this.parseExpr();
    this.skipNewlines();
    const then: Stmt[] = [];
    while (!(this.at("identifier") && (this.cur().lexeme === "else" || this.cur().lexeme === "end"))) {
      then.push(this.parseStmt());
      this.skipNewlines();
    }
    let elseBranch: Stmt[] | undefined;
    if (this.at("identifier") && this.cur().lexeme === "else") {
      this.eat("identifier");
      this.skipNewlines();
      const els: Stmt[] = [];
      while (!(this.at("identifier") && this.cur().lexeme === "end")) {
        els.push(this.parseStmt());
        this.skipNewlines();
      }
      elseBranch = els;
    }
    this.eat("identifier"); // end
    return { kind:"If", cond, then, elseBranch };
  }

  parseWhile(): Stmt {
    this.eat("identifier"); // while
    const cond = this.parseExpr();
    this.skipNewlines();
    const body: Stmt[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      body.push(this.parseStmt());
      this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { kind:"While", cond, body };
  }

  parseFor(): Stmt {
    this.eat("identifier"); // for
    const iter = this.eat("identifier").lexeme;
    this.eat("identifier","in");
    const collection = this.parseExpr();
    this.skipNewlines();
    const body: Stmt[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      body.push(this.parseStmt());
      this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { kind:"ForOf", iter, collection, body };
  }

  parseProtectStmt(): Stmt {
    this.eat("identifier"); // protect
    this.eat("lparen");
    const tryFn = this.parseInlineFuncExpr();
    this.skipNewlines();
    let catchFn: Expr | undefined;
    let args: Expr[] | undefined;
    if (this.at("comma")) this.eat("comma");
    if (this.at("identifier") && this.cur().lexeme === "func") {
      catchFn = this.parseInlineFuncExpr();
      if (this.at("comma")) this.eat("comma");
    }
    if (this.at("lbracket")) {

    }
    if (this.at("lbracket")) {
      const arr = this.parseArrayLiteral();
      args = arr.elems;
    }
    this.eat("rparen");
    return { kind:"Protect", tryFn, catchFn, args };
  }

  parseArrayLiteral(): Expr {
  this.eat("lbracket"); // eat '['
  const elems: Expr[] = [];

  if (!this.at("rbracket")) {
    do {
      elems.push(this.parseExpr());
    } while (this.maybe("comma"));
  }

  this.eat("rbracket"); // eat ']'
  return { kind: "ArrLit", elems } as Expr;
}

  parseInlineFuncExpr(): Expr {
    this.eat("identifier"); // func
    this.eat("lparen");
    const params: {name:string; type?:TypeName}[] = [];
    if (!this.at("rparen")) {
      do {
        if (this.at("identifier") && this.cur().lexeme === "exception") {
          this.eat("identifier");
          const name = this.eat("identifier").lexeme;
          params.push({ name, type: "exception" });
        } else {
          const pname = this.eat("identifier").lexeme;
          let ptype:TypeName|undefined;
          if (this.maybe("colon")) ptype = this.eat("identifier").lexeme;
          params.push({ name: pname, type: ptype });
        }
      } while (this.maybe("comma"));
    }
    this.eat("rparen");
    const ret = this.parseTypeNameIf();
    this.skipNewlines();
    const body: Stmt[] = [];
    while (!(this.at("identifier") && this.cur().lexeme === "end")) {
      body.push(this.parseStmt());
      this.skipNewlines();
    }
    this.eat("identifier"); // end
    return { kind:"FuncExpr", params, ret, body } as Expr;
  }

  parseAssignable(): AssignTarget {
    if (this.at("identifier")) {
      if (this.cur().lexeme === "self") {
        this.eat("identifier");
        this.eat("dot");
        const name = this.eat("identifier").lexeme;
        return { kind:"AT_Prop", obj: { kind:"This" } as Expr, name };
      }
      const name = this.eat("identifier").lexeme;
      if (this.at("dot")) {
        this.eat("dot");
        const prop = this.eat("identifier").lexeme;
        return { kind:"AT_Prop", obj: { kind:"Var", name }, name: prop };
      }
      if (this.at("lbracket")) {
        this.eat("lbracket");
        const idx = this.parseExpr();
        this.eat("rbracket");
        return { kind:"AT_Index", obj: { kind:"Var", name }, index: idx };
      }
      return { kind:"AT_Var", name };
    }
    const expr = this.parseExpr();
    if (this.at("dot")) {
      this.eat("dot");
      const prop = this.eat("identifier").lexeme;
      return { kind:"AT_Prop", obj: expr, name: prop };
    }
    if (this.at("lbracket")) {
      this.eat("lbracket");
      const idx = this.parseExpr();
      this.eat("rbracket");
      return { kind:"AT_Index", obj: expr, index: idx };
    }
    throw new Error("Invalid assignment target at " + this.cur().line);
  }

  parseExpr(): Expr { return this.parseBinary(0); }

  precedence(op: string): number {
    switch (op) {
      case "==" : case "!=": return 1;
      case "<": case "<=": case ">": case ">=": return 2;
      case "+": case "-": return 3;
      case "*": case "/": case "%": return 4;
      default: return -1;
    }
  }

  parsePrimary(): Expr {
    const t = this.cur();
    if (t.type === "number") { this.i++; return { kind:"LitNum", value: Number(t.lexeme) }; }
    if (t.type === "string") { this.i++; return { kind:"LitStr", value: t.lexeme }; }
    if (t.type === "identifier") {
      const name = t.lexeme;
      this.i++;
      if (name === "true") return { kind:"LitBool", value:true };
      if (name === "false") return { kind:"LitBool", value:false };
      if (name === "nil") return { kind:"Nil" };
      if (name === "self") return { kind:"This" };
      if (this.at("lparen")) {
        this.eat("lparen");
        const args: Expr[] = [];
        if (!this.at("rparen")) {
          do { args.push(this.parseExpr()); } while (this.maybe("comma"));
        }
        this.eat("rparen");
        return { kind:"Call", callee: name, args };
      }
      return { kind:"Var", name };
    }
    if (t.type === "lparen") {
      this.eat("lparen"); const e = this.parseExpr(); this.eat("rparen"); return e;
    }
    if (t.type === "lbrace") {
      this.eat("lbrace");
      const props: {key:string; value:Expr}[] = [];
      if (!this.at("rbrace")) {
        do {
          const keyTok = this.eat("identifier");
          const key = keyTok.lexeme;
          if (this.maybe("colon") || this.maybe("assign")) {
            const val = this.parseExpr();
            props.push({ key, value: val });
          } else {
            throw new Error("Expected : or = in object literal");
          }
        } while (this.maybe("comma"));
      }
      this.eat("rbrace");
      return { kind:"ObjLit", props };
    }
    if (t.type === "lbracket") {
      this.eat("lbracket");
      const elems: Expr[] = [];
      if (!this.at("rbracket")) {
        do { elems.push(this.parseExpr()); } while (this.maybe("comma"));
      }
      this.eat("rbracket");
      return { kind:"ArrLit", elems };
    }
    if (t.type === "minus") {
      this.eat("minus");
      const r = this.parsePrimary();
      return { kind:"Unary", op:"-", right: r };
    }
    throw new Error(`Unexpected token ${t.type} at ${t.line}:${t.col}`);
  }

  parsePrimaryWithPostfix(): Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.at("dot")) {
        this.eat("dot");
        const id = this.eat("identifier").lexeme;
        if (this.at("lparen")) {
          this.eat("lparen");
          const args: Expr[] = [];
          if (!this.at("rparen")) do { args.push(this.parseExpr()); } while (this.maybe("comma"));
          this.eat("rparen");
          // represent method call as property call
          expr = { kind:"Call", callee: `${emitExprSimple(expr)}.${id}`, args };
        } else {
          expr = { kind:"Prop", obj: expr, name: id };
        }
        continue;
      }
      if (this.at("lbracket")) {
        this.eat("lbracket");
        const idx = this.parseExpr();
        this.eat("rbracket");
        expr = { kind:"Index", obj: expr, index: idx };
        continue;
      }
      break;
    }
    return expr;
  }

  parseBinary(minPrec: number): Expr {
    let left = this.parsePrimaryWithPostfix();
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
      this.i++;
      const right = this.parseBinary(prec + 1);
      left = { kind:"Binary", left, op, right };
    }
    return left;
  }

  // small helper to stringify simple exprs used internally for method call callee encoding
  // not for full emission
}

/* Emitter (same approach, kept concise) */

function mapType(t?: TypeName): string | undefined {
  if (!t) return undefined;
  if (t === "num") return "number";
  if (t === "text") return "string";
  if (t === "bool") return "boolean";
  if (t === "nil") return "void";
  if (t === "any") return "any";
  return t;
}

function emitProgram(p: Program): string {
  const classes = new Set(p.classes.map(c=>c.name));
  let out = "";
  for (const g of p.globals) out += emitStmt(g, 0, classes) + "\n";
  for (const e of p.enums) out += emitEnum(e) + "\n";
  for (const s of p.structs) out += emitStruct(s) + "\n";
  for (const c of p.classes) out += emitClass(c, classes) + "\n";
  for (const f of p.funcs) out += emitTopFunc(f, classes) + "\n";
  return out;
}

function emitEnum(e: EnumDecl): string {
  return `enum ${e.name} {\n  ${e.members.join(",\n  ")}\n}\n`;
}
function emitStruct(s: StructDecl): string {
  const lines = s.fields.map(f => {
    const tsType = mapType(f.type) ?? "any";
    if (f.mod === "priv") return `  // private ${f.name}: ${tsType};`;
    if (f.mod === "readonly") return `  readonly ${f.name}: ${tsType};`;
    return `  ${f.name}: ${tsType};`;
  });
  return `interface ${s.name} {\n${lines.join("\n")}\n}\n`;
}

function emitClass(c: ClassDecl, classes:Set<string>): string {
  const fieldLines = c.fields.map(f => {
    const t = mapType(f.type) ?? "any";
    const mods = f.modifiers || [];
    let prefix = "";
    if (mods.includes("pub")) prefix += "public ";
    if (mods.includes("priv")) prefix += "private ";
    if (mods.includes("readonly")) prefix += "readonly ";
    if (mods.includes("static")) prefix = "static ";
    const init = f.init ? ` = ${emitExpr(f.init, classes)}` : "";
    return `  ${prefix}${f.name}: ${t}${init};`;
  });
  const methodLines = c.methods.map(m => emitMethod(m, classes));
  const protoLines = c.protos.map(m => emitPrototype(m, c.name, classes));
  const parts = [
    `class ${c.name} {`,
    ...fieldLines,
    ...methodLines.map(l => l.split("\n").map(line=>"  "+line).join("\n")),
    `}`,
    ...protoLines
  ];
  return parts.join("\n") + "\n";
}

function emitPrototype(m: FuncDecl, className: string, classes:Set<string>): string {
  const params = m.params.map(p => `${p.name}${p.type?`: ${mapType(p.type)}`:""}`).join(", ");
  const ret = mapType(m.ret) ?? "any";
  const body = m.body.map(s => emitStmt(s,1,classes)).join("\n");
  return `${className}.prototype.${m.name} = function(${params}): ${ret} {\n${body}\n};`;
}

function emitMethod(m: FuncDecl, classes:Set<string>): string {
  const params = m.params.map(p => `${p.name}${p.type?`: ${mapType(p.type)}`:""}`).join(", ");
  const ret = mapType(m.ret) ?? "any";
  const mods = (m.modifiers||[]);
  let prefix = "";
  if (mods.includes("pub")) prefix = "public ";
  if (mods.includes("priv")) prefix = "private ";
  if (mods.includes("static")) prefix = "static ";
  if (m.name === "init") {
    const body = m.body.map(s => emitStmt(s,1,classes)).join("\n");
    return `constructor(${params}) {\n${body}\n}`;
  }
  const body = m.body.map(s => emitStmt(s,1,classes)).join("\n");
  return `${prefix}${m.name}(${params}): ${ret} {\n${body}\n}`;
}

function emitTopFunc(f: FuncDecl, classes:Set<string>): string {
  const params = f.params.map(p => `${p.name}${p.type?`: ${mapType(p.type)}`:""}`).join(", ");
  const ret = mapType(f.ret) ?? "any";
  const body = f.body.map(s => emitStmt(s,1,classes)).join("\n");
  return `function ${f.name}(${params}): ${ret} {\n${body}\n}\n`;
}

function emitStmt(s: Stmt, indentLevel: number, classes:Set<string>): string {
  const indent = '  '.repeat(indentLevel);
  switch (s.kind) {
    case "VarDecl": {
      const t = mapType(s.type) ?? "any";
      const init = s.init ? ` = ${emitExpr(s.init,classes)}` : (s.scope==="const"?" = null":"");
      return `${indent}${s.scope} ${s.name}: ${t}${init};`;
    }
    case "ExprStmt": return `${indent}${emitExpr(s.expr,classes)};`;
    case "Return": return s.expr ? `${indent}return ${emitExpr(s.expr,classes)};` : `${indent}return;`;
    case "Output": return `${indent}console.log(${emitExpr(s.expr,classes)});`;
    case "Assign": {
      let lhs = "";
      if (s.target.kind === "AT_Var") lhs = s.target.name;
      else if (s.target.kind === "AT_Prop") lhs = `${emitExpr(s.target.obj,classes)}.${s.target.name}`;
      else lhs = `${emitExpr(s.target.obj,classes)}[${emitExpr(s.target.index,classes)}]`;
      return `${indent}${lhs} = ${emitExpr(s.value,classes)};`;
    }
    case "If": {
      const th = s.then.map(st => emitStmt(st, indentLevel+1, classes)).join("\n");
      const el = s.elseBranch?.map(st => emitStmt(st, indentLevel+1, classes)).join("\n");
      return `${indent}if (${emitExpr(s.cond,classes)}) {\n${th}\n${indent}}${el ? ` else {\n${el}\n${indent}}` : ""}`;
    }
    case "While": {
      const b = s.body.map(st => emitStmt(st, indentLevel+1, classes)).join("\n");
      return `${indent}while (${emitExpr(s.cond,classes)}) {\n${b}\n${indent}}`;
    }
    case "ForOf": {
      const b = s.body.map(st => emitStmt(st, indentLevel+1, classes)).join("\n");
      return `${indent}for (let ${s.iter} of ${emitExpr(s.collection,classes)}) {\n${b}\n${indent}}`;
    }
    case "Protect": {
      const tryFn = s.tryFn as any;
      const catchFn = s.catchFn as any;
      const argsArr = s.args ?? [];
      const argsExpr = `[${argsArr.map(a=>emitExpr(a,classes)).join(", ")}]`;
      const tryBody = (tryFn.body as Stmt[]).map(st => emitStmt(st,2,classes)).join("\n");
      const catchBody = catchFn ? (catchFn.body as Stmt[]).map((st:Stmt) => emitStmt(st,2,classes)).join("\n") : "";
      const retType = tryFn.ret === "nil" ? "void" : "any";
      const lines = [
        `${indent}new Promise<${retType}>((resolve, reject) => {`,
        `${indent}  try {`,
      ];
      if (tryFn.ret === "nil") {
        lines.push(`${indent}    ((${emitFuncExprSignature(tryFn)}) => {`);
        lines.push(`${tryBody}`);
        lines.push(`${indent}    })(${argsExpr});`);
        lines.push(`${indent}    resolve();`);
      } else {
        lines.push(`${indent}    resolve(((${emitFuncExprSignature(tryFn)}) => {`);
        lines.push(`${tryBody}`);
        lines.push(`${indent}    })(${argsExpr}));`);
      }
      lines.push(`${indent}  } catch (err) {`);
      if (catchFn) {
        lines.push(`${indent}    ((${emitFuncExprSignature(catchFn)}) => {`);
        lines.push(`${catchBody}`);
        lines.push(`${indent}    })(err);`);
      }
      lines.push(`${indent}    reject(err);`);
      lines.push(`${indent}  }`);
      lines.push(`${indent}});`);
      return lines.join("\n");
    }
  }
}

function emitFuncExprSignature(f:any): string {
  const params = (f.params||[]).map((p:any)=>`${p.name}: any`).join(", ");
  return `${params}${f.ret?` : ${mapType(f.ret) ?? "any"}`:""}`;
}

function emitExpr(e: Expr, classes:Set<string>): string {
  switch (e.kind) {
    case "LitNum": return String(e.value);
    case "LitStr": return JSON.stringify(e.value);
    case "LitBool": return e.value ? "true" : "false";
    case "Nil": return "undefined";
    case "Var": return e.name;
    case "This": return "this";
    case "Call": {
      if (e.callee.includes(".")) return `${e.callee.split(".")[0]}.${e.callee.split(".")[1]}(${e.args.map(a=>emitExpr(a,classes)).join(", ")})`;
      if (classes.has(e.callee)) return `new ${e.callee}(${e.args.map(a=>emitExpr(a,classes)).join(", ")})`;
      return `${e.callee}(${e.args.map(a=>emitExpr(a,classes)).join(", ")})`;
    }
    case "Prop": return `${emitExpr(e.obj,classes)}.${e.name}`;
    case "Index": return `${emitExpr(e.obj,classes)}[${emitExpr(e.index,classes)}]`;
    case "ObjLit": return `{ ${e.props.map(p=>`${p.key}: ${emitExpr(p.value,classes)}`).join(", ")} }`;
    case "ArrLit": return `[${e.elems.map(x=>emitExpr(x,classes)).join(", ")}]`;
    case "Unary": return `-${emitExpr(e.right,classes)}`;
    case "Binary": return `(${emitExpr(e.left,classes)} ${e.op} ${emitExpr(e.right,classes)})`;
    case "FuncExpr": {
      return `(${(e.params||[]).map((p:any)=>p.name+ (p.type?`: ${mapType(p.type)}`:"")).join(", ")}) => { /* inline */ }`;
    }
    default: return "undefined";
  }
}

// small helper to convert an Expr to a simple string for callee encoding in postfix calls
function emitExprSimple(expr: Expr): string {
  if (expr.kind === "Var") return expr.name;
  if (expr.kind === "This") return "this";
  // fallback: use generic emitter without classes set
  return JSON.stringify(expr);
}

/* API */

export function transpile(src: string): string {
  const tokens = lex(src);
  const parser = new Parser(tokens);
  const prog = parser.parseProgram();
  return emitProgram(prog);
}