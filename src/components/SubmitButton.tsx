// src/components/SubmitButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  attemptId: string;
  locked?: boolean; // permet de désactiver le bouton si déjà soumis/verrouillé
};

export default function SubmitButton({ attemptId, locked }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    if (locked) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de soumission");
        setLoading(false);
        return;
      }

      // Succès
      setSuccess(true);
      setLoading(false);

      // Rafraîchit la page (ex: re-render du timer, éditeur en lecture seule)
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Erreur réseau");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle size={18} />
        <span>Copie soumise avec succès</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="destructive"
        disabled={loading || locked}
        onClick={handleSubmit}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Soumission...
          </>
        ) : (
          "Remettre ma copie"
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <XCircle size={14} /> {error}
        </div>
      )}
    </div>
  );
}
