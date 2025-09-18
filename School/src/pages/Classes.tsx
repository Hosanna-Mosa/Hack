import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
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
	const [moreOpen, setMoreOpen] = useState(false);
	const [moreClassId, setMoreClassId] = useState<string | null>(null);
const [removeOpen, setRemoveOpen] = useState(false);
const [classStudents, setClassStudents] = useState<StudentItem[]>([]);
const [viewOpen, setViewOpen] = useState(false);
	const [studentsToRemove, setStudentsToRemove] = useState<string[]>([]);
	const [teacherAssignOpen, setTeacherAssignOpen] = useState(false);
	const [teacherAssignClassId, setTeacherAssignClassId] = useState<string | null>(null);
	const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
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
									<div className="text-xs text-muted-foreground">Students {((c as any)?.currentStudentCount ?? (c as any)?.studentIds?.length ?? 0)} • Capacity {c.capacity}</div>
								</div>
						<Button variant="ghost" size="icon" aria-label="More options" onClick={() => { setMoreClassId(c._id); setMoreOpen(true); }}>
							<MoreHorizontal className="h-5 w-5" />
						</Button>
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

			{/* More Options Dialog */}
			<Dialog open={moreOpen} onOpenChange={setMoreOpen}>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle>Class Options</DialogTitle>
					</DialogHeader>
					<div className="grid gap-5 py-2">
						{/* Quick stats */}
						{(() => {
							const current = classes.find(x => x._id === moreClassId);
							const teacherNames = (current?.teacherIds || [])
								.map(teacher => {
									// Handle both populated teacher objects and simple IDs
									if (typeof teacher === 'object' && teacher.user) {
										return teacher.user.profile?.name || 'Unnamed';
									} else {
										return teacherOptions.find(t => t._id === teacher)?.name;
									}
								})
								.filter(Boolean)
								.join(", ") || "Unassigned";
							// student count might not be available on the class item
							const studentCount = (current as any)?.currentStudentCount ?? (current as any)?.studentIds?.length ?? "N/A";
							return (
								<div className="rounded-lg border p-4 text-sm bg-muted/20">
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">No. of students</span>
										<span className="font-semibold">{studentCount}</span>
									</div>
									<div className="mt-3 flex items-start justify-between gap-3">
										<span className="text-muted-foreground">Assigned teacher</span>
										<span className="font-medium text-right">{teacherNames}</span>
									</div>
								</div>
							);
						})()}

						<div className="flex flex-wrap items-center gap-2">
							<Button onClick={() => {
								if (!moreClassId) return;
								setMoreOpen(false);
								setAssignClassId(moreClassId);
								setAssignOpen(true);
							}}>Add Students</Button>
							<Button variant="secondary" onClick={async () => {
								if (!moreClassId) return;
								try {
                                const res = await apiRequest<{ success: boolean; data: any[] }>(`/classes/${moreClassId}/students`);
                                    setClassStudents((res.data || []).map((s: any) => ({ _id: s.id, name: s.name, admissionNumber: s.admissionNumber })));
									setViewOpen(true);
									setMoreOpen(false);
								} catch (e: any) {
									toast({ title: 'Failed to load students', description: e.message });
								}
							}}>View Students</Button>
							<Button variant="outline" onClick={async () => {
								if (!moreClassId) return;
								try {
                                const res = await apiRequest<{ success: boolean; data: any[] }>(`/classes/${moreClassId}/students`);
                                    setClassStudents((res.data || []).map((s: any) => ({ _id: s.id, name: s.name, admissionNumber: s.admissionNumber })));
									setStudentsToRemove([]);
									setRemoveOpen(true);
									setMoreOpen(false);
								} catch (e: any) {
									toast({ title: 'Failed to load students', description: e.message });
								}
							}}>Delete Students</Button>
							<Button variant="secondary" onClick={() => {
								if (!moreClassId) return;
								const currentClass = classes.find(c => c._id === moreClassId);
								// Extract teacher IDs from populated teacher objects or simple IDs
								const teacherIds = (currentClass?.teacherIds || []).map(teacher => {
									if (typeof teacher === 'object' && teacher._id) {
										return teacher._id;
									}
									return teacher;
								});
								setSelectedTeachers(teacherIds);
								setTeacherAssignClassId(moreClassId);
								setMoreOpen(false);
								setTeacherAssignOpen(true);
							}}>Edit Teacher</Button>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setMoreOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Remove Students Dialog */}
			<Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>Remove Students from Class</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 py-2">
						<div className="text-sm text-muted-foreground">Select students to remove. They will become unassigned.</div>
						<select multiple className="border rounded-md p-2 h-64"
							value={studentsToRemove}
							onChange={(e) => setStudentsToRemove(Array.from(e.target.selectedOptions).map(o => o.value))}
						>
							{classStudents.map(s => (
								<option key={s._id} value={s._id}>{s.name}{s.admissionNumber ? ` (${s.admissionNumber})` : ''}</option>
							))}
						</select>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setRemoveOpen(false)}>Cancel</Button>
						<Button variant="destructive" onClick={async () => {
							if (!moreClassId || studentsToRemove.length === 0) return;
							try {
								await apiRequest(`/classes/${moreClassId}/remove-students`, { method: 'POST', body: JSON.stringify({ studentIds: studentsToRemove }) });
								setRemoveOpen(false);
								setStudentsToRemove([]);
								fetchData();
							} catch (e: any) {
								toast({ title: 'Failed to remove', description: e.message });
							}
						}}>Remove Selected</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* View Students Dialog */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-[640px]">
					<DialogHeader>
						<DialogTitle>Class Students</DialogTitle>
					</DialogHeader>
					<div className="max-h-[60vh] overflow-auto rounded-md border">
						<div className="grid grid-cols-[1fr_auto] gap-x-4 text-sm p-3 sticky top-0 bg-background border-b font-medium">
							<span>Name</span>
							<span className="text-right">Adm. No.</span>
						</div>
						<div className="divide-y">
							{classStudents.length === 0 ? (
								<div className="p-4 text-sm text-muted-foreground">No students in this class.</div>
							) : (
								classStudents.map(s => (
									<div key={s._id} className="grid grid-cols-[1fr_auto] gap-x-4 p-3 text-sm">
										<span>{s.name}</span>
										<span className="text-right">{s.admissionNumber || '-'}</span>
									</div>
								))
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setViewOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Teacher Assignment Dialog */}
			<Dialog open={teacherAssignOpen} onOpenChange={setTeacherAssignOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Assign Teachers to Class</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="text-sm text-muted-foreground">
							Select teachers to assign to this class. You can select multiple teachers.
						</div>
						<div className="space-y-2 max-h-60 overflow-y-auto">
							{teacherOptions.map((teacher) => (
								<div key={teacher._id} className="flex items-center space-x-2">
									<input
										type="checkbox"
										id={`teacher-${teacher._id}`}
										checked={selectedTeachers.includes(teacher._id)}
										onChange={(e) => {
											if (e.target.checked) {
												setSelectedTeachers(prev => [...prev, teacher._id]);
											} else {
												setSelectedTeachers(prev => prev.filter(id => id !== teacher._id));
											}
										}}
										className="rounded border-gray-300"
									/>
									<label htmlFor={`teacher-${teacher._id}`} className="text-sm font-medium">
										{teacher.name}
									</label>
									<span className="text-xs text-muted-foreground">({teacher.email})</span>
								</div>
							))}
						</div>
						{teacherOptions.length === 0 && (
							<div className="text-center py-4 text-muted-foreground">
								No teachers available
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setTeacherAssignOpen(false)}>Cancel</Button>
						<Button onClick={async () => {
							if (!teacherAssignClassId) return;
							try {
								await apiRequest(`/classes/${teacherAssignClassId}/teachers`, {
									method: 'PUT',
									body: JSON.stringify({ teacherIds: selectedTeachers })
								});
								toast({ title: 'Success', description: 'Teachers assigned successfully' });
								setTeacherAssignOpen(false);
								// Refresh classes data
								fetchData();
							} catch (e: any) {
								toast({ title: 'Failed to assign teachers', description: e.message });
							}
						}}>Save Changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}


