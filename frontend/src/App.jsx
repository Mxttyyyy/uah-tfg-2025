import Alert from "./components/Alert";
import Spinner from "./components/Spinner";

export default function App() {
  return (
    <div className="mx-auto max-w-3xl space-y-4flex flex-col p-6 gap-10">
      <Spinner size="md" label="Cargando análisis..." />
      <Alert variant="success" title="Success" onClose={() => {}}>
        dsjkdsaks lsdkjdkl jhfdskjf fjdhnf jfds fjdsfdj fdjsfdsf jf fdsk f dsjmsd sna
      </Alert>
    </div>
  );
}
