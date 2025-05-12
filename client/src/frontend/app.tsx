import { useCallback, useState } from "react";

function App() {
  const [nodeVersion, setNodeVersion] = useState<string | undefined>(undefined);

  const updateNodeVersion = useCallback(
    async () =>
      setNodeVersion(await backend.nodeVersion("Hello from App.tsx!")),
    [],
  );

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2">
      <img src="./vite.svg" className="logo" alt="Vite logo" />
      <button
        onClick={updateNodeVersion}
        className="rounded-md bg-zinc-700 px-2 py-1 text-lg text-white transition-[opacity] hover:opacity-80"
      >
        Node version is {nodeVersion}
      </button>
    </div>
  );
}

export default App;
