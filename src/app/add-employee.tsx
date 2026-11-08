import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { SkeletonRows } from '@/components/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { listBranches } from '@/admin/api';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { createEmployee, getEmployee, listDepartments, listDesignations, updateEmployee, type Employee, type Lookup } from '@/team/api';
import { employeeBody, validateEmployee, type EmployeeErrors } from '@/team/employee';
import { describeTeamError } from '@/team/logic';
import { showToast } from '@/ui/toast';

/** Add a person to the team, or edit one (`?id=`). Needs `hrm.create` or `hrm.update`. */
export default function AddEmployeeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const one = useQuery({ queryKey: ['team', 'one', id], queryFn: () => getEmployee(id as string), enabled: !!id });
  if (id && !one.data) return <View style={{ flex: 1 }}>{one.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <EmployeeForm person={one.data} />;
}

const pick = (id: string | undefined, name: string | undefined): Lookup | null => (id ? { id, name: name ?? '' } : null);

function EmployeeForm({ person }: { person?: Employee }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const maySalary = me?.permissions?.includes('hrm.view_salary') ?? false;
  const [first, setFirst] = useState(person?.first_name ?? '');
  const [last, setLast] = useState(person?.last_name ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [department, setDepartment] = useState<Lookup | null>(pick(person?.department, person?.department_name));
  const [designation, setDesignation] = useState<Lookup | null>(pick(person?.designation, person?.designation_name));
  const [branch, setBranch] = useState<Lookup | null>(person ? pick(person.branch, person.branch_name) : pick(me?.active_branch?.id, me?.active_branch?.name));
  const [joined, setJoined] = useState(person?.date_of_joining ?? localDateISO(new Date()));
  const [salary, setSalary] = useState(person?.basic_salary && Number(person.basic_salary) > 0 ? String(Number(person.basic_salary)) : '');
  const [errors, setErrors] = useState<EmployeeErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const form = { first, last, phone, email, departmentId: department?.id ?? '', designationId: designation?.id ?? '', branchId: branch?.id ?? '', joined, salary };
    const found = validateEmployee(form);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = employeeBody(form, maySalary);
      if (person) await updateEmployee(person.id, body);
      else await createEmployee(body);
      await qc.invalidateQueries({ queryKey: ['team'] });
      showToast({ text: person ? t('Saved: {name}', { name: first.trim() }) : t('Added to your team: {name}', { name: first.trim() }) });
      router.back();
    } catch (e) {
      setFailure(describeTeamError(e));
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: person ? t('Edit person') : t('Add a person') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="First name" required value={first} onChangeText={setFirst} autoCapitalize="words" error={errors.first} />
              <Field label="Last name" required value={last} onChangeText={setLast} autoCapitalize="words" error={errors.last} />
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" />
              <Field label="Email" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email} />
              <Picker label="Department" required value={department} onChange={(d) => { setDepartment(d); setDesignation(null); }} load={listDepartments} queryKey="departments" error={errors.departmentId} />
              <Picker label="Job title" required value={designation} onChange={setDesignation} load={(s) => listDesignations(s, department?.id)} queryKey={`designations-${department?.id ?? 'all'}`} error={errors.designationId} />
              <Picker label="Branch" required value={branch} onChange={setBranch} load={async (s) => (await listBranches()).filter((b) => b.is_active && (!s || b.name.toLowerCase().includes(s.toLowerCase())))} queryKey="branches" error={errors.branchId} />
              <Field label="Joined on" required value={joined} onChangeText={setJoined} placeholder="2026-11-08" keyboardType="numbers-and-punctuation" error={errors.joined} />
              {maySalary ? <Field label="Monthly salary" prefix="৳" value={salary} onChangeText={setSalary} keyboardType="decimal-pad" placeholder="0" error={errors.salary} /> : null}
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={person ? 'Save changes' : 'Add to team'} size="lg" loading={busy} onPress={() => void save()} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
