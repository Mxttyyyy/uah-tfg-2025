import Alert from "./components/Alert";
import Spinner from "./components/Spinner";
import { useState } from "react";
import Header from "./components/Header";
import CodeInput from "./components/CodeInput";
import OptionsPanel from "./components/OptionsPanel";
import ActionBar from "./components/ActionBar";

import { createDefaultAnalyzeOptions } from "./utils/defaultOptions";

export default function App() {
  const [code, setCode] = useState("");
  const [options, setOptions] = useState(() => createDefaultAnalyzeOptions());
  const [isLoading, setIsLoading] = useState(false);

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
      ].join("\n")
    );
  }

  return (
    /*<div className="mx-auto max-w-3xl space-y-4flex flex-col p-6 gap-10">
      <Spinner size="md" label="Cargando análisis..." />
      <Alert variant="success" title="Success" onClose={() => {}}>
        Ha ocurrido un error en uno de los módulos de análisis. Vuelva a ejecutar el análisis.
      </Alert>
    </div>*/
    <div className="min-h-screen ">
      <Header />
      <main className="mx-auto max-w-7xl xl:max-w-8xl 2xl:max-w-7xl p-4">
        <div className="grid gap-6 lg:grid-cols-2">
        <CodeInput value={code} onChange={setCode} />
        <OptionsPanel options={options} onChange={setOptions} />
        </div>

        {/* ActionBar justo debajo */}
        <div className="mt-6">
          <ActionBar
            code={code}
            isLoading={isLoading}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            onExample={handleExample}
          />
        </div>

        {/* Debug: para ver cómo cambian options */}
        <pre className="mt-6 overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-900 shadow-sm">
          {JSON.stringify({ options }, null, 2)}
        </pre>

      </main>
    </div>
  );
}
