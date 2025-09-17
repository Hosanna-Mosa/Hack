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
  const [details, setDetails] = useState<any | null>(null);

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
      setDetails(null);
      const res = await SchoolAPI.compareStored(sourceIdA, sourceIdB, { threshold: 0.9, verbose: true, perDim: true });
      console.log('Compare response:', res.data); // Debug log
      if (res?.data?.matched) {
        toast({ title: "Matched", description: `Cosine ${(res.data as any).cosine?.toFixed?.(3)} | Dist ${(res.data as any).normDistance?.toFixed?.(3)}` });
      } else {
        toast({ title: "Not matched", description: `Cosine ${(res.data as any).cosine?.toFixed?.(3)} | Dist ${(res.data as any).normDistance?.toFixed?.(3)}` , variant: "destructive" });
      }
      setDetails(res.data);
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
          {details && (
            <div className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong>Matched:</strong> {String(details.matched)}</div>
                    <div><strong>Threshold:</strong> {details.threshold?.toFixed?.(3)}</div>
                    <div><strong>Cosine:</strong> {details.cosine?.toFixed?.(6)}</div>
                    <div><strong>Norm distance:</strong> {details.normDistance?.toFixed?.(6)}</div>
                  </div>
                  
                  {details.details && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div><strong>Dot product:</strong> {details.details.dot?.toFixed?.(6)}</div>
                        <div><strong>‖A‖:</strong> {details.details.normA?.toFixed?.(6)}</div>
                        <div><strong>‖B‖:</strong> {details.details.normB?.toFixed?.(6)}</div>
                        <div><strong>Denominator:</strong> {details.details.denom?.toFixed?.(6)}</div>
                        <div><strong>Dimensions:</strong> {details.details.len}</div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="font-semibold mb-2">Calculation Formula:</div>
                        <div className="bg-gray-100 p-3 rounded font-mono text-xs">
                          cosine_similarity = dot_product / (||A|| × ||B||)<br/>
                          = {details.details.dot?.toFixed?.(6)} / ({details.details.normA?.toFixed?.(6)} × {details.details.normB?.toFixed?.(6)})<br/>
                          = {details.details.dot?.toFixed?.(6)} / {details.details.denom?.toFixed?.(6)}<br/>
                          = {details.cosine?.toFixed?.(6)}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {details.a?.vector && details.b?.vector && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vector A ({details.a.sourceId})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <div><strong>Vector Length:</strong> {details.a.vector.length}</div>
                          <div><strong>Vector Norm:</strong> {details.details?.normA?.toFixed?.(6) || 'N/A'}</div>
                          <div><strong>Min Value:</strong> {Math.min(...details.a.vector).toFixed(6)}</div>
                          <div><strong>Max Value:</strong> {Math.max(...details.a.vector).toFixed(6)}</div>
                          <div><strong>Mean:</strong> {(details.a.vector.reduce((a: number, b: number) => a + b, 0) / details.a.vector.length).toFixed(6)}</div>
                        </div>
                        <div className="text-xs font-mono bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                          <div className="mb-2"><strong>First 50 values:</strong></div>
                          <div className="break-all">
                            [{details.a.vector.slice(0, 50).map((v: number) => v.toFixed(6)).join(', ')}
                            {details.a.vector.length > 50 && `, ... (${details.a.vector.length - 50} more)`}]
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Vector B ({details.b.sourceId})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <div><strong>Vector Length:</strong> {details.b.vector.length}</div>
                          <div><strong>Vector Norm:</strong> {details.details?.normB?.toFixed?.(6) || 'N/A'}</div>
                          <div><strong>Min Value:</strong> {Math.min(...details.b.vector).toFixed(6)}</div>
                          <div><strong>Max Value:</strong> {Math.max(...details.b.vector).toFixed(6)}</div>
                          <div><strong>Mean:</strong> {(details.b.vector.reduce((a: number, b: number) => a + b, 0) / details.b.vector.length).toFixed(6)}</div>
                        </div>
                        <div className="text-xs font-mono bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                          <div className="mb-2"><strong>First 50 values:</strong></div>
                          <div className="break-all">
                            [{details.b.vector.slice(0, 50).map((v: number) => v.toFixed(6)).join(', ')}
                            {details.b.vector.length > 50 && `, ... (${details.b.vector.length - 50} more)`}]
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!details.a?.vector && !details.b?.vector && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vector Details Not Available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      <p>Vector details are not being returned from the backend. This could be because:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>The backend is not configured to return vectors with verbose=true</li>
                        <li>The API request is not including the verbose parameter correctly</li>
                        <li>Check the browser console for the debug log to see what's being returned</li>
                      </ul>
                      <div className="mt-3 p-3 bg-yellow-50 rounded">
                        <strong>Debug Info:</strong> Check browser console for "Compare response:" log to see the actual API response.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {details.details?.perDim && (
                <Card>
                  <CardHeader>
                    <CardTitle>Per-Dimension Calculation Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left border">Index</th>
                            <th className="px-2 py-1 text-left border">A[i]</th>
                            <th className="px-2 py-1 text-left border">B[i]</th>
                            <th className="px-2 py-1 text-left border">A[i] × B[i]</th>
                            <th className="px-2 py-1 text-left border">Running Sum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.details.perDim.slice(0, 100).map((row: any, idx: number) => {
                            const runningSum = details.details.perDim.slice(0, idx + 1).reduce((sum: number, r: any) => sum + r.prod, 0);
                            return (
                              <tr key={row.i} className="border-t">
                                <td className="px-2 py-1 border">{row.i}</td>
                                <td className="px-2 py-1 border font-mono">{Number(row.a).toFixed(6)}</td>
                                <td className="px-2 py-1 border font-mono">{Number(row.b).toFixed(6)}</td>
                                <td className="px-2 py-1 border font-mono">{Number(row.prod).toFixed(6)}</td>
                                <td className="px-2 py-1 border font-mono">{runningSum.toFixed(6)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {details.details.perDim.length > 100 && (
                        <div className="text-sm text-gray-600 mt-2">
                          Showing first 100 dimensions. Total: {details.details.perDim.length}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


