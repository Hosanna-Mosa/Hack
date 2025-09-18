import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

interface EditTeacherDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teacher?: { _id: string; name: string; email?: string; mobile?: string } | null;
  onSaved: () => void;
}

export function EditTeacherDialog({ open, onOpenChange, teacher, onSaved }: EditTeacherDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(teacher?.name || "");
    setEmail(teacher?.email || "");
    setMobile(teacher?.mobile || "");
  }, [teacher, open]);

  const handleSave = async () => {
    if (!teacher?._id) return;
    try {
      setSaving(true);
      await apiRequest(`/teachers/${teacher._id}`, {
        method: "PUT",
        body: JSON.stringify({ name, email, mobile })
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      // noop - parent shows toast on reload if needed
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Name</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Mobile</div>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Phone number" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


