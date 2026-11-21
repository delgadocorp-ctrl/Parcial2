export async function cargarPaginas<T>(ruta: string): Promise<T[]> {
  const url = new URL(ruta, window.location.origin);
  url.searchParams.set("pageSize", "100");

  const registros: T[] = [];
  let pagina = 1;
  while (true) {
    url.searchParams.set("page", String(pagina));
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar los datos de la venta.");
    }

    const { data, total, pageSize }: { data: T[]; total: number; pageSize: number } =
      await respuesta.json();
    registros.push(...data);
    if (data.length === 0 || pagina * pageSize >= total) {
      return registros;
    }

    pagina += 1;
  }
}
