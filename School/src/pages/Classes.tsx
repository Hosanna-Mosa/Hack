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
						{unassigned.length === 0 ? (
							<div className="flex items-center justify-center h-64 border rounded-md bg-gray-50">
								<div className="text-center text-muted-foreground">
									<div className="text-lg font-medium mb-2">All students are assigned to classes</div>
									<div className="text-sm">There are no unassigned students available to add to this class.</div>
								</div>
							</div>
						) : (
							<select multiple className="border rounded-md p-2 h-64"
								value={selectedStudents}
								onChange={(e) => setSelectedStudents(Array.from(e.target.selectedOptions).map(o => o.value))}
							>
								{unassigned.map(s => (
									<option key={s._id} value={s._id}>{s.name}{s.admissionNumber ? ` (${s.admissionNumber})` : ''}</option>
								))}
							</select>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
						<Button 
							onClick={async () => {
								if (!assignClassId || selectedStudents.length === 0) return;
								try {
									await apiRequest(`/classes/${assignClassId}/assign-students`, { method: 'POST', body: JSON.stringify({ studentIds: selectedStudents }) });
									setAssignOpen(false);
									setSelectedStudents([]);
									fetchData();
								} catch (e: any) {
									toast({ title: 'Failed to assign', description: e.message });
								}
							}}
							disabled={unassigned.length === 0 || selectedStudents.length === 0}
						>
							Assign
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* More Options Dialog */}
			<Dialog open={moreOpen} onOpenChange={setMoreOpen}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader className="pb-4">
						<DialogTitle className="text-xl font-semibold">Class Options</DialogTitle>
					</DialogHeader>
					<div className="space-y-6">
						{/* Class Info Card */}
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
								<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
									<div className="flex items-center justify-between mb-4">
										<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{current?.name || 'Class'}</h3>
										<div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
											{current?.grade || 'Grade'} • {current?.section || 'Section'}
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
											<div className="flex items-center space-x-2">
												<div className="w-2 h-2 bg-green-500 rounded-full"></div>
												<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Students</span>
											</div>
											<div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{studentCount}</div>
										</div>
										<div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
											<div className="flex items-center space-x-2">
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
												<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Teacher</span>
											</div>
											<div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate" title={teacherNames}>
												{teacherNames}
											</div>
										</div>
									</div>
								</div>
							);
						})()}

						{/* Action Buttons */}
						<div className="space-y-3">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Quick Actions</h4>
							<div className="grid grid-cols-2 gap-3">
								<Button 
									onClick={() => {
										if (!moreClassId) return;
										setMoreOpen(false);
										setAssignClassId(moreClassId);
										setAssignOpen(true);
									}}
									className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
								>
									<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
									Add Students
								</Button>
								<Button 
									variant="outline" 
									onClick={async () => {
										if (!moreClassId) return;
										try {
											const res = await apiRequest<{ success: boolean; data: any[] }>(`/classes/${moreClassId}/students`);
											setClassStudents((res.data || []).map((s: any) => ({ _id: s.id, name: s.name, admissionNumber: s.admissionNumber })));
											setViewOpen(true);
											setMoreOpen(false);
										} catch (e: any) {
											toast({ title: 'Failed to load students', description: e.message });
										}
									}}
									className="h-12 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 font-medium"
								>
									<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
									View Students
								</Button>
								<Button 
									variant="outline" 
									onClick={async () => {
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
									}}
									className="h-12 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 font-medium"
								>
									<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
									Remove Students
								</Button>
								<Button 
									variant="outline" 
									onClick={() => {
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
									}}
									className="h-12 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 font-medium"
								>
									<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									Edit Teacher
								</Button>
							</div>
						</div>
					</div>
					<DialogFooter className="pt-6 border-t border-gray-200 dark:border-gray-700">
						<Button variant="ghost" onClick={() => setMoreOpen(false)} className="px-6">
							Close
						</Button>
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
								console.log('Assigning teachers to class:', teacherAssignClassId);
								console.log('Selected teachers:', selectedTeachers);
								
								const response = await apiRequest(`/classes/${teacherAssignClassId}/teachers`, {
									method: 'PUT',
									body: JSON.stringify({ teacherIds: selectedTeachers })
								});
								
								console.log('Teacher assignment response:', response);
								toast({ title: 'Success', description: 'Teachers assigned successfully' });
								setTeacherAssignOpen(false);
								// Refresh classes data
								fetchData();
							} catch (e: any) {
								console.error('Teacher assignment error:', e);
								toast({ title: 'Failed to assign teachers', description: e.message });
							}
						}}>Save Changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}


