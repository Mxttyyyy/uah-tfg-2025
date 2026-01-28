import "./App.css";
import Spinner from "./components/Spinner";

export default function App() {
  return (
    <div className="p-6">
      <Spinner size="md" label="Cargando análisis..." />
    </div>
  );
}
