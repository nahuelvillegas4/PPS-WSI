import { useState, useSyncExternalStore } from 'react';
import { ViewerPage } from '../features/viewer/ViewerPage';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
  };
}

function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Home() {
  const [imageId, setImageId] = useState('1');
  const valid = /^[1-9]\d*$/.test(imageId);

  return (
    <main className="home">
      <h1>GIA · Visor de imágenes</h1>
      <p>
        Abrí una imagen registrada para recorrerla con zoom y desplazamiento. Las teselas se piden
        al servicio de teselas a medida que se necesitan; la imagen completa nunca se descarga.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) navigate(`/images/${imageId}`);
        }}
      >
        <label>
          Id de la imagen
          <input
            type="number"
            min={1}
            step={1}
            value={imageId}
            onChange={(event) => {
              setImageId(event.target.value);
            }}
          />
        </label>
        <button type="submit" disabled={!valid}>
          Abrir
        </button>
      </form>
    </main>
  );
}

export function App() {
  const path = usePath();
  const match = /^\/images\/([1-9]\d*)$/.exec(path);

  if (match?.[1]) {
    return (
      <ViewerPage
        key={match[1]}
        imageId={Number(match[1])}
        onBack={() => {
          navigate('/');
        }}
      />
    );
  }
  return <Home />;
}
