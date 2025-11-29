import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();
  return responseBody;
}

export default function StatusPage() {
  return (
    <div>
      <h1>STATUS</h1>
      <DatabaseStatus />
    </div>
  );
}

function DatabaseStatus() {
  const { data, isLoading } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  let databaseInfo = "Carregando...";

  if (!isLoading && data) {
    databaseInfo = {
      updated_at: new Date(data.updated_at).toLocaleString("pt-BR"),
      version: data.dependencies.database.version,
      max_connections: data.dependencies.database.max_connections,
      opened_connections: data.dependencies.database.opened_connections,
    };
  }

  return (
    <div>
      <h2>Ultima atualização: {databaseInfo.updated_at}</h2>
      <div>
        Versão do banco de dados: <b>{databaseInfo.version}</b>
      </div>
      <div>
        Máximo de conexões: <b>{databaseInfo.max_connections}</b>
      </div>
      <div>
        Conexões abertas: <b>{databaseInfo.opened_connections}</b>
      </div>
    </div>
  );
}
