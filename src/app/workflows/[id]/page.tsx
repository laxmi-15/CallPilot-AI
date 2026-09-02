"use client";

import React, { use } from "react";
import { storageRepo } from "@/lib/store/storage";
import { WorkflowBuilder } from "@/components/workflow-builder/WorkflowBuilder";
import { Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workflow = storageRepo.getWorkflow(resolvedParams.id);

  if (!workflow) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Workflow Not Found</h2>
        <p className="text-xs text-slate-400">The requested workflow ID does not exist in the active repository.</p>
        <Link href="/workflows">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Workflows
          </Button>
        </Link>
      </div>
    );
  }

  return <WorkflowBuilder initialWorkflow={workflow} isEditing={true} />;
}
