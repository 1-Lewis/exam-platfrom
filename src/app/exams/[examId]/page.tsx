export default function Page({ params }: { params: { examId?: string } }) {
  return (
    <main className="p-6 space-y-3">
      <h1>Debug dynamique</h1>
      <div>URL attendue : /exams/&lt;examId&gt;</div>
      <pre>params = {JSON.stringify(params)}</pre>
    </main>
  );
}
