import Alert from "./components/Alert";
import Spinner from "./components/Spinner";
import { useState } from "react";
import Header from "./components/Header";
import CodeInput from "./components/CodeInput";

export default function App() {
  const [code, setCode] = useState("");
  return (
    /*<div className="mx-auto max-w-3xl space-y-4flex flex-col p-6 gap-10">
      <Spinner size="md" label="Cargando análisis..." />
      <Alert variant="success" title="Success" onClose={() => {}}>
        Ha ocurrido un error en uno de los módulos de análisis. Vuelva a ejecutar el análisis.
      </Alert>
    </div>*/
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl xl:max-w-6xl 2xl:max-w-7xl p-4">
        <CodeInput value={code} onChange={setCode} />
      </main>
    </div>
  );
}
