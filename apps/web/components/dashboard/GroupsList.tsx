"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@/components/ui";
import { Plus } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

export default function GroupsList() {
  const { groups, fetchGroups } = useDashboard();
  const [groupName, setGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    setSubmitting(true);
    try {
      // TODO: Implement create group API call
      // const success = await createGroup(groupName);
      // if (success) {
      //   setGroupName("");
      //   await fetchGroups();
      // }

      // For now, just clear and refresh
      setGroupName("");
      await fetchGroups();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Group Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateGroup}
              disabled={submitting || !groupName.trim()}
            >
              {submitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Groups List */}
      {groups.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-sm">Your Groups</h3>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-3 border rounded-lg hover:bg-accent transition cursor-pointer"
              >
                <p className="font-medium text-sm">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No groups yet. Create one to get started!
        </p>
      )}
    </div>
  );
}
