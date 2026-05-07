type Params = Promise<{ id: string }>;

export default async function AlbumPage({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl">Album {id}</h1>
    </main>
  );
}
