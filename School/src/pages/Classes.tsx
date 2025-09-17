import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TeacherOption { _id: string; name: string; email: string; }
interface ClassItem { _id: string; name: string; grade: string; section: string; capacity: number; teacherIds: string[]; }
interface StudentItem { _id: string; name: string; admissionNumber?: string; }

export default function ClassesPage() {
	const [classes, setClasses] = useState<ClassItem[]>([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
	const [unassigned, setUnassigned] = useState<StudentItem[]>([]);
	const [assignOpen, setAssignOpen] = useState(false);
	const [assignClassId, setAssignClassId] = useState<string | null>(null);
	const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
	const { toast } = useToast();

	// crude user schoolId retrieval from localStorage if present
	const schoolId = useMemo(() => {
		try { return JSON.parse(localStorage.getItem('user') || '{}').schoolId || null; } catch { return null; }
	}, []);

	const [effectiveSchoolId, setEffectiveSchoolId] = useState<string | null>(null);

	useEffect(() => {
		const resolveSchool = async () => {
			if (schoolId) { setEffectiveSchoolId(schoolId); return; }
			try {
				const me = await apiRequest<{ success: boolean; user: any }>("/auth/me");
				const sid = me?.user?.schoolId || null;
				if (sid) {
					setEffectiveSchoolId(sid);
					try { localStorage.setItem('user', JSON.stringify(me.user)); } catch {}
				}
			} catch {
				setEffectiveSchoolId(null);
			}
		};
		resolveSchool();
	}, [schoolId]);

	const fetchData = async () => {
		if (!effectiveSchoolId) return;
		const list = await apiRequest<{ success: boolean; data: any[] }>(`/classes?schoolId=${effectiveSchoolId}`);
		setClasses(list.data as any);
		const t = await apiRequest<{ success: boolean; data: any[] }>(`/classes/teachers?schoolId=${effectiveSchoolId}`);
		setTeacherOptions(
			(t.data || []).map((x: any) => ({ _id: x._id, name: x?.user?.profile?.name || 'Unnamed', email: x?.user?.profile?.contact?.email }))
		);
		const s = await apiRequest<{ success: boolean; data: any[] }>(`/classes/unassigned?schoolId=${effectiveSchoolId}`);
		setUnassigned((s.data || []).map((u: any) => ({ _id: u._id, name: u.name, admissionNumber: u.academicInfo?.admissionNumber })));
	};

	useEffect(() => { fetchData(); }, [effectiveSchoolId]);

	// Show helper text when no teachers
	const teacherHelp = teacherOptions.length === 0 ? 'No teachers found for this school. Register teachers first.' : '';

	const [form, setForm] = useState({ name: "", grade: "", section: "", capacity: 40, teacherIds: [] as string[] });

	const submit = async () => {
		if (!effectiveSchoolId) { toast({ title: 'Missing school', description: 'No school found for user.' }); return; }
		setLoading(true);
		try {
			const payload = { ...form, schoolId: effectiveSchoolId };
			const token = ((): string | undefined => { try { return localStorage.getItem('token') || undefined; } catch { return undefined; } })();
			const res = await apiRequest<{ success: boolean; data: any }>(`/classes`, { method: 'POST', body: JSON.stringify(payload), token });
			toast({ title: 'Class created', description: res.data?.name });
			setOpen(false);
			setForm({ name: "", grade: "", section: "", capacity: 40, teacherIds: [] });
			fetchData();
		} catch (e: any) {
			toast({ title: 'Failed to create class', description: e.message });
		} finally { setLoading(false); }
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Classes</h1>
				<Button onClick={() => setOpen(true)}>Add New Class</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Existing Classes</CardTitle>
				</CardHeader>
				<CardContent>
					{classes.length === 0 ? (
						<div className="text-muted-foreground">No classes yet.</div>
					) : (
						<div className="grid gap-3">
							{classes.map((c) => (
								<div key={c._id} className="border rounded-md p-3 flex items-center justify-between">
									<div>
										<div className="font-medium">{c.name} — {c.grade}-{c.section}</div>
										<div className="text-sm text-muted-foreground">Capacity {c.capacity}</div>
									</div>
									<Button variant="outline" onClick={() => { setAssignClassId(c._id); setAssignOpen(true); }}>Add Students</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle>Add New Class</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<label className="text-sm">Class Name</label>
						<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Grade 6" />
						<label className="text-sm">Grade</label>
						<Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g., 6" />
						<label className="text-sm">Section</label>
						<Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="e.g., A" />
						<label className="text-sm">Capacity</label>
						<Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
						<label className="text-sm">Assign Teachers</label>
						<select multiple className="border rounded-md p-2 h-32"
							value={form.teacherIds}
							onChange={(e) => {
								const values = Array.from(e.target.selectedOptions).map(o => o.value);
								setForm({ ...form, teacherIds: values });
							}}
						>
							{teacherOptions.map(t => (
								<option key={t._id} value={t._id}>{t.name} ({t.email})</option>
							))}
						</select>
						{teacherHelp && <div className="text-xs text-muted-foreground">{teacherHelp}</div>}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
						<Button onClick={submit} disabled={loading}>{loading ? 'Saving...' : 'Save Class'}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Assign Students Dialog */}
			<Dialog open={assignOpen} onOpenChange={setAssignOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Assign Students</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="text-sm text-muted-foreground">Only students without a class are shown.</div>
						<select multiple className="border rounded-md p-2 h-64"
							value={selectedStudents}
							onChange={(e) => setSelectedStudents(Array.from(e.target.selectedOptions).map(o => o.value))}
						>
							{unassigned.map(s => (
								<option key={s._id} value={s._id}>{s.name}{s.admissionNumber ? ` (${s.admissionNumber})` : ''}</option>
							))}
						</select>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
						<Button onClick={async () => {
							if (!assignClassId || selectedStudents.length === 0) return;
							try {
								await apiRequest(`/classes/${assignClassId}/assign-students`, { method: 'POST', body: JSON.stringify({ studentIds: selectedStudents }) });
								setAssignOpen(false);
								setSelectedStudents([]);
								fetchData();
							} catch (e: any) {
								toast({ title: 'Failed to assign', description: e.message });
							}
						}}>Assign</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}


