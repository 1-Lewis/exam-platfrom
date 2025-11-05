// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ou `import authOptions from "@/lib/auth"` si export default

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <pre className="mt-4 text-sm bg-gray-50 p-3 rounded">
        {JSON.stringify(session, null, 2)}
      </pre>
    </main>
  );
}
