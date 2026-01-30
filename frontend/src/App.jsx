import Alert from "./components/Alert";
import Spinner from "./components/Spinner";
import Header from "./components/Header";

export default function App() {
  return (
    
    /*<div className="mx-auto max-w-3xl space-y-4flex flex-col p-6 gap-10">
      <Spinner size="md" label="Cargando análisis..." />
      <Alert variant="success" title="Success" onClose={() => {}}>
        Ha ocurrido un error en uno de los módulos de análisis. Vuelva a ejecutar el análisis.
      </Alert>
    </div>*/
     <div className="min-h-screen">
      <Header />
    </div>
     
  );
}
