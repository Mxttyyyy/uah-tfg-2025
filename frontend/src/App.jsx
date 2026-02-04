import Alert from "./components/Alert";
import Spinner from "./components/Spinner";
import { useState } from "react";
import Header from "./components/Header";
import CodeInput from "./components/CodeInput";
import OptionsPanel from "./components/OptionsPanel";
import CodeActions from "./components/CodeActions";
import ResultsPanel from "./components/results/ResultsPanel";
import ScrollToTopButton from "./components/ScrollToTopButton";

import { createDefaultAnalyzeOptions } from "./utils/defaultOptions";

export default function App() {
  const [code, setCode] = useState("");
  const [options, setOptions] = useState(() => createDefaultAnalyzeOptions());
  const [isLoading, setIsLoading] = useState(false);

  // Simulamos lo que devuelve el backend
  const [result, setResult] = useState(null);

  function fakeOk() {
    setResult({
      language: "python",
      analysis_time_ms: 842,
      summary: {
        total_issues: 5,
        by_severity: { info: 1, warning: 2, error: 1 },
      },
      analysis: {
        style: [
          {
            tool: "ruff",
            category: "style",
            code: "F401",
            severity: "warning",
            message: "Imported but unused: 'os'",
            line: 1,
            column: 1,
            suggestion: "Elimina el import si no se usa.",
            help_url: "",
            notes: [],
          },
          {
            tool: "ruff",
            category: "style",
            code: "F408",
            severity: "error",
            message: "Imported but unused: 'os'",
            line: 1,
            column: 1,
            suggestion: "Elimina el import si no se usa.",
            help_url: "",
            notes: [],
          },
        ],
        security: [
          {
            tool: "bandit",
            category: "security",
            code: "B105",
            severity: "error",
            message: "Hardcoded password string",
            line: 10,
            column: 5,
            suggestion:
              "Evita credenciales hardcodeadas; usa variables de entorno.",
            help_url: "",
            notes: ["Ejemplo: os.environ.get('PASSWORD')"],
          },
          {
            tool: "bandit",
            category: "security",
            code: "B106",
            severity: "warning",
            message: "Hardcoded password string",
            line: 10,
            column: 5,
            suggestion:
              "Evita credenciales hardcodeadas; usa variables de entorno.",
            help_url: "",
            notes: ["Ejemplo: os.environ.get('PASSWORD')"],
          },
          {
            tool: "bandit",
            category: "security",
            code: "B105",
            severity: "error",
            message: "Hardcoded password string",
            line: 10,
            column: 5,
            suggestion:
              "Evita credenciales hardcodeadas; usa variables de entorno.",
            help_url: "",
            notes: ["Ejemplo: os.environ.get('PASSWORD')"],
          },
          {
            tool: "bandit",
            category: "security",
            code: "B105",
            severity: "info",
            message: "Hardcoded password string",
            line: 10,
            column: 5,
            suggestion:
              "Evita credenciales hardcodeadas; usa variables de entorno.",
            help_url: "",
            notes: ["Ejemplo: os.environ.get('PASSWORD')"],
          },
          
        ],
        dead_code: [
          {
            tool: "vulture",
            category: "dead_code",
            code: "unused-function",
            severity: "info",
            message: "Unused function 'helper'",
            line: 25,
            column: 1,
            suggestion: "Elimina o utiliza la función.",
            help_url: "",
            notes: [],
          },
        ],
        types: [
          {
            tool: "mypy",
            category: "types",
            code: "arg-type",
            severity: "warning",
            message: "Argument 1 has incompatible type",
            line: 30,
            column: 12,
            suggestion: "Revisa los tipos esperados y los argumentos.",
            help_url: "",
            notes: [],
          },
          {
            tool: "mypy",
            category: "types",
            code: "arg-type",
            severity: "error",
            message: "Argument 1 has incompatible type",
            line: 30,
            column: 12,
            suggestion: "Revisa los tipos esperados y los argumentos.",
            help_url: "",
            notes: [],
          },
        ],
        metrics: {
          tool: "radon",
          maintainability_index: { score: 68.2, rank: "C" },
          raw_metrics: {
            loc: 120,
            lloc: 78,
            sloc: 90,
            comments: 10,
            blank: 12,
            multi: 0,
          },
          cyclomatic_complexity: {
            blocks: [
              {
                name: "process_data",
                type: "function",
                complexity: 12,
                rank: "C",
                line: 40,
              },
              {
                name: "main",
                type: "function",
                complexity: 5,
                rank: "B",
                line: 5,
              },
            ],
          },
        },
      },
      error: null,
    });
  }

  function fakeEmpty() {
    setResult({
      language: "python",
      analysis_time_ms: 310,
      summary: {
        total_issues: 0,
        by_severity: { info: 0, warning: 0, error: 0 },
      },
      analysis: {
        style: [],
        security: [],
        dead_code: [],
        types: [],
        metrics: {},
      },
      error: null,
    });
  }

  function fakeError() {
    setResult({
      language: "python",
      analysis_time_ms: 0,
      summary: {
        total_issues: 0,
        by_severity: { info: 0, warning: 0, error: 0 },
      },
      analysis: {
        style: [],
        security: [],
        dead_code: [],
        types: [],
        metrics: {},
      },
      error: { message: "El campo 'code' está vacío.", http_status: 400 },
    });
  }

  // Simula "Analizar" (solo muestra loading un momento)
  async function onAnalyzeFake() {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsLoading(false);
    fakeOk();
  }

  function handleAnalyze() {
    // Simulación de llamada a API
    setIsLoading(true);
    window.setTimeout(() => {
      setIsLoading(false);
      // Por ahora solo para ver que "hace algo"
      alert("Aquí iría la llamada a /api/analyze");
    }, 800);
  }

  function handleClear() {
    setCode("");
  }

  function handleExample() {
    setCode(
      [
        "def greet(name):",
        "    return f'Hola, {name}!'",
        "",
        "print(greet('mundo'))",
        "",
      ].join("\n"),
    );
  }

  return (
    /*<div className="mx-auto max-w-3xl space-y-4flex flex-col p-6 gap-10">
      <Spinner size="md" label="Cargando análisis..." />
      <Alert variant="success" title="Success" onClose={() => {}}>
        Ha ocurrido un error en uno de los módulos de análisis. Vuelva a ejecutar el análisis.
      </Alert>
    </div>*/
    <div id="top" className="min-h-screen ">
      <Header />
      <main className="mx-auto max-w-7xl xl:max-w-8xl 2xl:max-w-7xl p-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeInput
            value={code}
            onChange={setCode}
            onAnalyze={onAnalyzeFake}
            onClear={handleClear}
            isLoading={isLoading}
          />{" "}
          {/* Si queremos botón de código de ejemplo, annadimos prop onExample */}
          <OptionsPanel options={options} onChange={setOptions} />
        </div>

        {/* Debug: para ver cómo cambian options */}
        {/*<pre className="mt-6 overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-900 shadow-sm">
          {JSON.stringify({ options }, null, 2)}
        </pre>*/}

        {/* Botones de prueba */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={fakeOk}
          >
            Ver OK
          </button>
          <button
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={fakeEmpty}
          >
            Ver vacío
          </button>
          <button
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={fakeError}
          >
            Ver error
          </button>
        </div>

        {/* Resultados */}
        <div className="mt-6">
          <ResultsPanel result={result} autoScroll />
        </div>
      </main>
      <ScrollToTopButton anchorId="top" showAfterPx={550} />
    </div>
  );
}
