export default function Page({ params }: { params: { id?: string } }) {
  return (
    <main className="p-6">
      <h1>Dynamic OK?</h1>
      <pre>{JSON.stringify(params)}</pre>
    </main>
  );
}
