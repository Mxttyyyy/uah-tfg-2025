import Alert from "./components/Alert";
import Spinner from "./components/Spinner";
import { useState } from "react";
import Header from "./components/Header";
import CodeInput from "./components/CodeInput";
import OptionsPanel from "./components/OptionsPanel";
import ActionBar from "./components/actionBar";

import { createDefaultAnalyzeOptions } from "./utils/defaultOptions";

export default function App() {
  const [code, setCode] = useState("");
  const [options, setOptions] = useState(() => createDefaultAnalyzeOptions());

  return (
    /*<div className="mx-auto max-w-3xl space-y-4flex flex-col p-6 gap-10">
      <Spinner size="md" label="Cargando análisis..." />
      <Alert variant="success" title="Success" onClose={() => {}}>
        Ha ocurrido un error en uno de los módulos de análisis. Vuelva a ejecutar el análisis.
      </Alert>
    </div>*/
    <div className="min-h-screen ">
      <Header />
      <main className="mx-auto max-w-8xl xl:max-w-8xl 2xl:max-w-7xl p-4">
        <div className="grid gap-6 lg:grid-cols-2">
        <CodeInput value={code} onChange={setCode} />
        <OptionsPanel options={options} onChange={setOptions} />
        </div>
      </main>
    </div>
  );
}
