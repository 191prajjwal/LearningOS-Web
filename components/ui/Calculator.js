"use client";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Delete, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";

const BUTTONS = [
  // Row 1
  [
    { label: "sin", action: "sin", type: "fn" },
    { label: "cos", action: "cos", type: "fn" },
    { label: "tan", action: "tan", type: "fn" },
    { label: "AC", action: "clear", type: "control" },
    { label: "⌫", action: "backspace", type: "control" },
  ],
  [
    { label: "log", action: "log", type: "fn" },
    { label: "ln", action: "ln", type: "fn" },
    { label: "√", action: "sqrt", type: "fn" },
    { label: "(", action: "(", type: "op" },
    { label: ")", action: ")", type: "op" },
  ],
  [
    { label: "x²", action: "^2", type: "fn" },
    { label: "xⁿ", action: "^", type: "op" },
    { label: "π", action: "π", type: "fn" },
    { label: "e", action: "e", type: "fn" },
    { label: "÷", action: "/", type: "op" },
  ],
  [
    { label: "7", action: "7", type: "num" },
    { label: "8", action: "8", type: "num" },
    { label: "9", action: "9", type: "num" },
    { label: "×", action: "*", type: "op" },
  ],
  [
    { label: "4", action: "4", type: "num" },
    { label: "5", action: "5", type: "num" },
    { label: "6", action: "6", type: "num" },
    { label: "−", action: "-", type: "op" },
  ],
  [
    { label: "1", action: "1", type: "num" },
    { label: "2", action: "2", type: "num" },
    { label: "3", action: "3", type: "num" },
    { label: "+", action: "+", type: "op" },
  ],
  [
    { label: "0", action: "0", type: "num", wide: true },
    { label: ".", action: ".", type: "num" },
    { label: "=", action: "=", type: "equals" },
  ],
];

const COLORS = {
  num: "bg-elevated hover:bg-overlay text-primary border-default",
  op: "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/20",
  fn: "bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/15",
  control: "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/15",
  equals: "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 col-span-1",
};

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState([]);
  const [isDeg, setIsDeg] = useState(true);
  const [justEvaled, setJustEvaled] = useState(false);

  const handleKey = useCallback((action) => {
    if (action === "clear") {
      setDisplay("0");
      setExpression("");
      setJustEvaled(false);
      return;
    }

    if (action === "backspace") {
      if (justEvaled) { setDisplay("0"); setJustEvaled(false); return; }
      const next = display.length > 1 ? display.slice(0, -1) : "0";
      setDisplay(next);
      return;
    }

    if (action === "=") {
      try {
        const expr = buildExpression(display);
        const result = evaluate(expr, isDeg);
        const resultStr = formatResult(result);
        setHistory(h => [...h.slice(-9), { expr: display, result: resultStr }]);
        setExpression(display + " =");
        setDisplay(resultStr);
        setJustEvaled(true);
      } catch {
        setDisplay("Error");
        setJustEvaled(true);
      }
      return;
    }

    // Operators and numbers
    const operators = ["+", "-", "*", "/", "^"];
    const isOp = operators.includes(action);

    if (justEvaled) {
      if (isOp) {
        setDisplay(display + action);
        setJustEvaled(false);
        return;
      }
      setDisplay(action);
      setJustEvaled(false);
      return;
    }

    if (action === "π") {
      setDisplay(d => d === "0" ? "π" : d + "π");
      return;
    }
    if (action === "e") {
      setDisplay(d => d === "0" ? "e" : d + "e");
      return;
    }
    if (["sin", "cos", "tan", "log", "ln", "sqrt"].includes(action)) {
      setDisplay(d => d === "0" ? action + "(" : d + action + "(");
      return;
    }
    if (action === "^2") {
      setDisplay(d => d === "0" ? "0^2" : d + "^2");
      return;
    }

    if (display === "0" && action !== "." && !isOp) {
      setDisplay(action);
    } else {
      setDisplay(d => d + action);
    }
  }, [display, isDeg, justEvaled]);

  // Keyboard input
  useEffect(() => {
    const handler = (e) => {
      const k = e.key;
      if (k >= "0" && k <= "9") handleKey(k);
      else if (k === ".") handleKey(".");
      else if (k === "+" || k === "-" || k === "*" || k === "/" ) handleKey(k);
      else if (k === "Enter" || k === "=") handleKey("=");
      else if (k === "Backspace") handleKey("backspace");
      else if (k === "Escape") handleKey("clear");
      else if (k === "^") handleKey("^");
      else if (k === "(") handleKey("(");
      else if (k === ")") handleKey(")");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const buildExpression = (expr) => {
    return expr
      .replace(/π/g, String(Math.PI))
      .replace(/\be\b/g, String(Math.E));
  };

  const evaluate = (expr, deg) => {
    const toRad = (v) => deg ? (v * Math.PI) / 180 : v;
    const fromRad = (v) => deg ? (v * 180) / Math.PI : v;

    // Replace functions
    let processed = expr
      .replace(/sin\(([^)]+)\)/g, (_, v) => Math.sin(toRad(parseFloat(evaluate(v, deg)))).toString())
      .replace(/cos\(([^)]+)\)/g, (_, v) => Math.cos(toRad(parseFloat(evaluate(v, deg)))).toString())
      .replace(/tan\(([^)]+)\)/g, (_, v) => Math.tan(toRad(parseFloat(evaluate(v, deg)))).toString())
      .replace(/log\(([^)]+)\)/g, (_, v) => Math.log10(parseFloat(evaluate(v, deg))).toString())
      .replace(/ln\(([^)]+)\)/g, (_, v) => Math.log(parseFloat(evaluate(v, deg))).toString())
      .replace(/sqrt\(([^)]+)\)/g, (_, v) => Math.sqrt(parseFloat(evaluate(v, deg))).toString())
      .replace(/\^/g, "**");

    // Safe eval using Function
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${processed})`)();
  };

  const formatResult = (val) => {
    if (typeof val !== "number" || isNaN(val)) return "Error";
    if (!isFinite(val)) return val > 0 ? "∞" : "-∞";
    if (Number.isInteger(val)) return String(val);
    return parseFloat(val.toPrecision(10)).toString();
  };

  return (
    <div className="card-surface p-5 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-primary">Calculator</h3>
        <button
          onClick={() => setIsDeg(v => !v)}
          className={cn("text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors", isDeg ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/10" : "border-default text-muted bg-elevated")}
        >
          {isDeg ? "DEG" : "RAD"}
        </button>
      </div>

      {/* Display */}
      <div className="bg-base rounded-xl p-4 mb-4 min-h-[80px] flex flex-col justify-end">
        {expression && <p className="text-xs text-muted font-mono text-right truncate">{expression}</p>}
        <p className="font-mono text-2xl font-bold text-primary text-right truncate">{display}</p>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mb-3 max-h-20 overflow-y-auto no-scrollbar space-y-0.5">
          {[...history].reverse().map((h, i) => (
            <div key={i} className="flex justify-between text-xs text-muted font-mono px-1">
              <span className="truncate">{h.expr}</span>
              <span className="text-secondary ml-2 flex-shrink-0">= {h.result}</span>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-1.5">
        {BUTTONS.map((row, ri) => (
          <div key={ri} className={cn("grid gap-1.5", ri === 0 || ri === 1 ? "grid-cols-5" : ri === 2 ? "grid-cols-5" : "grid-cols-4")}>
            {row.map((btn) => (
              <motion.button
                key={btn.label}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleKey(btn.action)}
                className={cn(
                  "py-2.5 rounded-xl text-sm font-medium border transition-colors font-mono",
                  COLORS[btn.type],
                  btn.wide && "col-span-2"
                )}
              >
                {btn.label}
              </motion.button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
