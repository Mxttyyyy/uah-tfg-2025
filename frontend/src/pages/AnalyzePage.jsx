import { useRef, useState, useEffect } from "react";

import { analyzeCode } from "../services/analyzeApi";
import Header from "../components/Header";
import CodeInput from "../components/CodeInput";
import OptionsPanelPython from "../components/OptionsPanelPython";
import ResultsPanel from "../components/results/ResultsPanel";
import ScrollToTopButton from "../components/ScrollToTopButton";

import JavaSecurityOptions from "../components/options/java/JavaSecurityOptions";
import JavaStyleOptions from "../components/options/java/JavaStyleOptions";
import JavaMetricsOptions from "../components/options/java/JavaMetricsOptions";
import JavaDeadCodeOptions from "../components/options/java/JavaDeadCodeOptions";

import { createDefaultAnalyzeOptions } from "../utils/defaultOptions";

const DEFAULT_LANGUAGE = "python";

/**
 * Componente principal de la aplicación.
 *
 * Coordina el flujo completo del análisis:
 * - gestión del código fuente introducido por el usuario
 * - configuración de opciones de análisis
 * - comunicación con el backend
 * - coordinación entre entrada de código, opciones y resultados
 */
export default function AnalyzePage() {

  // Estados principales
  const [code, setCode] = useState("");
  const [options, setOptions] = useState(() => createDefaultAnalyzeOptions(DEFAULT_LANGUAGE));
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  // Referencias para controlar el scroll y selección de código
  const codeSectionRef = useRef(null);
  const textareaRef = useRef(null);

  // Cuando cambia el lenguaje seleccionado, reiniciamos las opciones
  // con los valores por defecto correspondientes a ese lenguaje y limpiamos los resultados.
  useEffect(() => {
    setOptions(createDefaultAnalyzeOptions(language));
    setResult(null);
  }, [language]);

  /**
   * Ejecuta el análisis del código actual.
   *
   * Envía el código y las opciones seleccionadas al backend,
   * gestiona el estado de carga y almacena el resultado del análisis.
   */
  async function handleAnalyze() {
    setIsLoading(true);

    // analyzeCode ya valida código vacío y devuelve un error normalizado
    const data = await analyzeCode({
      language,
      code,
      options,
    });

    setResult(data);
    setIsLoading(false);
  }

  /**
   * Limpia el código introducido y los resultados del análisis.
   */
  function handleClear() {
    setCode("");
    setResult(null);
  }

  /**
   * Carga un ejemplo de código.
   */
  function handleLoadExample() {
    const EXAMPLE_CODE = [
      "import subprocess",
      "import hashlib",
      "",
      "def run_cmd(cmd):",
      "    # Bandit: shell=True",
      "    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout",
      "",
      "def weak_hash(password):",
      "    # Bandit: md5 inseguro",
      "    return hashlib.md5(password.encode('utf-8')).hexdigest()",
      "",
      "unused_var = 123  # Vulture: sin usar",
      "",
      "print(run_cmd('echo hello'))",
      "print(weak_hash('1234'))",
    ].join("\n");

    setCode(EXAMPLE_CODE);
    setResult(null); // limpia resultados anteriores
  }

  /**
   *
   * Gestiona la selección de un issue y posiciona el cursor en la línea afectada del código
   * */
  function handleIssueSelect(issue) {
    const line = Number(issue?.line);
    if (!Number.isFinite(line) || line <= 0) return;

    // 1) subir al panel de código
    const codePanel = codeSectionRef.current;
    if (codePanel) {
      codePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // 2) cuando ya hemos subido, marcamos la línea en el textarea
    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;

      const text = ta.value || "";
      const start = getLineStartIndex(text, line);
      const end = getLineEndIndex(text, start);

      ta.focus(); // activamos el textarea (elemento seleccionado)
      ta.setSelectionRange(start, end); // marca línea completa

      // hacer scroll interno del textarea para que se vea esa línea
      const lineHeight = getTextareaLineHeight(ta);
      ta.scrollTop = Math.max(0, (line - 1) * lineHeight - 3 * lineHeight);
    }, 250);
  }

  return (
  <div
    id="top"
    className={`
      min-h-screen dark:bg-[url('/background-dark.png')]
      bg-[url('/background-light.png')] bg-blend-soft-light bg-gray-50/97 
      dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950
      dark:text-neutral-100 dark:bg-black/94 dark:bg-blend-darken 
    `}
  >
    <Header/>

    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 2xl:max-w-[1660px] 2xl:px-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(420px,35vw,650px)]">
        {/* Panel izquierdo de código */}
        <div ref={codeSectionRef} className="min-w-0 scroll-mt-24">
          <CodeInput
            value={code}
            language={language}
            onChange={setCode}
            isLoading={isLoading}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            onExample={handleLoadExample}
            onLanguageChange={setLanguage}
            textareaRef={textareaRef}
          />
        </div>

        {/* Panel derecho de opciones */}
        <div className="min-w-0">
          <OptionsPanelPython options={options} onChange={setOptions} />
          <JavaDeadCodeOptions options={options} onChange={setOptions} />

        </div>
      </div>

      {/* Resultados abajo */}
      <div className="mt-8">
        <ResultsPanel
          result={result}
          autoScroll
          anchorId="results"
          onIssueSelect={handleIssueSelect}
        />
      </div>
    </main>

    {/* Botón flotante para subir arriba */}
    <ScrollToTopButton anchorId="top" showAfterPx={500} />
  </div>
);
}

/* ----------------------------- Funciones auxiliares ----------------------------- */

/**
 * Devuelve el índice del carácter donde comienza una línea concreta
 * dentro de un texto multilinea.
 */
function getLineStartIndex(text, lineNumber) {
  let idx = 0;
  let currentLine = 1;

  while (currentLine < lineNumber && idx < text.length) {
    const new_line = text.indexOf("\n", idx);
    if (new_line === -1) return text.length;
    idx = new_line + 1;
    currentLine += 1;
  }
  return idx;
}

/**
 * Devuelve el índice del carácter donde termina una línea concreta
 * dentro de un texto multilinea.
 */
function getLineEndIndex(text, lineStartIndex) {
  const new_line = text.indexOf("\n", lineStartIndex);
  return new_line === -1 ? text.length : new_line;
}

/**
 * Calcula la altura de una línea del textarea en píxeles.
 */
function getTextareaLineHeight(ta) {
  const cs = window.getComputedStyle(ta); // Obtenemos los estilos del textarea
  const lh = parseFloat(cs.lineHeight); // Intentamos leer el valor de "lineHeight"
  if (Number.isFinite(lh)) return lh;

  // Si lineHeight no es un número, usamos fontSize * 1.4
  const fs = parseFloat(cs.fontSize);
  return Number.isFinite(fs) ? fs * 1.4 : 20;
}
