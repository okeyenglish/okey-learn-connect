import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { FamilyLedgerModal } from "@/components/finances/FamilyLedgerModal";

interface ClientFinancesButtonProps {
  clientId: string;
  clientName: string;
  familyGroupId?: string;
}

export function ClientFinancesButton({ 
  clientId, 
  clientName,
  familyGroupId 
}: ClientFinancesButtonProps) {
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setLedgerModalOpen(true)}
      >
        <Wallet className="h-4 w-4 mr-2" />
        Семейная касса
      </Button>

      <FamilyLedgerModal
        open={ledgerModalOpen}
        onOpenChange={setLedgerModalOpen}
        clientId={familyGroupId ? undefined : clientId}
        familyGroupId={familyGroupId}
        clientName={clientName}
      />
    </>
  );
}
