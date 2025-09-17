import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolAPI } from "@/lib/api";

export default function PhotosPage() {
  const { toast } = useToast();
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [sourceIdA, setSourceIdA] = useState<string | null>(null);
  const [sourceIdB, setSourceIdB] = useState<string | null>(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  const handleFileAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFileA(f);
  }
  const handleFileBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFileB(f);
  }

  const uploadA = async () => {
    if (!fileA) { toast({ title: "Choose first photo", variant: "destructive" }); return; }
    setIsUploadingA(true);
    try {
      const id = `photo-A-${Date.now()}`;
      await SchoolAPI.upsertImageEmbeddingMultipart({ sourceId: id, file: fileA });
      setSourceIdA(id);
      toast({ title: "Saved A", description: fileA.name });
    } catch (err: any) {
      toast({ title: "Save A failed", description: String(err?.message || err), variant: "destructive" });
    } finally { setIsUploadingA(false); }
  }

  const uploadB = async () => {
    if (!fileB) { toast({ title: "Choose second photo", variant: "destructive" }); return; }
    setIsUploadingB(true);
    try {
      const id = `photo-B-${Date.now()}`;
      await SchoolAPI.upsertImageEmbeddingMultipart({ sourceId: id, file: fileB });
      setSourceIdB(id);
      toast({ title: "Saved B", description: fileB.name });
    } catch (err: any) {
      toast({ title: "Save B failed", description: String(err?.message || err), variant: "destructive" });
    } finally { setIsUploadingB(false); }
  }

  const handleCompare = async () => {
    if (!sourceIdA || !sourceIdB) {
      toast({ title: "Save both photos first", variant: "destructive" });
      return;
    }
    setIsComparing(true);
    try {
      const res = await fetch(`${location.origin}/api-proxy/embeddings/compare-stored`, { method: 'POST' } as any);
      // placeholder to satisfy TS, real call is below in API
    } catch {}
    try {
      const res = await SchoolAPI.compareStored(sourceIdA, sourceIdB, { threshold: 0.9 });
      if (res?.data?.matched) {
        toast({ title: "Matched", description: `Cosine ${(res.data as any).cosine?.toFixed?.(3)} | Dist ${(res.data as any).normDistance?.toFixed?.(3)}` });
      } else {
        toast({ title: "Not matched", description: `Cosine ${(res.data as any).cosine?.toFixed?.(3)} | Dist ${(res.data as any).normDistance?.toFixed?.(3)}` , variant: "destructive" });
      }
      // comparison finished, nothing else to close in this simplified page
    } catch (err: any) {
      toast({ title: "Compare failed", description: String(err?.message || err), variant: "destructive" });
    } finally { setIsComparing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Photos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Photo A</Label>
                <Input type="file" accept="image/*" onChange={handleFileAChange} />
                <div className="text-sm text-muted-foreground">{fileA?.name || "No file"} {sourceIdA ? `— saved (${sourceIdA})` : ""}</div>
                <Button onClick={uploadA} disabled={isUploadingA}>Save A</Button>
              </div>
              <div className="space-y-2">
                <Label>Photo B</Label>
                <Input type="file" accept="image/*" onChange={handleFileBChange} />
                <div className="text-sm text-muted-foreground">{fileB?.name || "No file"} {sourceIdB ? `— saved (${sourceIdB})` : ""}</div>
                <Button onClick={uploadB} disabled={isUploadingB}>Save B</Button>
              </div>
          </div>
          <div className="pt-2">
            <Button variant="secondary" onClick={handleCompare} disabled={isComparing}>Compare</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


