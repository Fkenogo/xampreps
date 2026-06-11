import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  SEED_PLANS,
  type PricingPlan,
  type PricingPlanInput,
  type TierType,
} from '@/integrations/firebase/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TIER_TYPE_OPTIONS: { value: TierType; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'pay_per_paper', label: 'Pay per paper' },
  { value: 'school', label: 'School / Bulk' },
];

const EMPTY_PLAN: Omit<PricingPlanInput, 'sortOrder'> = {
  name: '',
  slug: '',
  description: '',
  tierType: 'basic',
  monthlyPriceUsd: null,
  annualPriceUsd: null,
  annualSavingsMonths: 2,
  perPaperPriceUsd: null,
  monthlyExamCap: null,
  includesPracticePapers: true,
  includesPastPapers: true,
  includesBasicExplanations: true,
  includesFullExplanations: false,
  includesProgressTracking: false,
  includesParentAccess: false,
  includesAiHelp: false,
  includesTeacherSupport: false,
  teacherSupportNote: null,
  bulkMinimumStudents: null,
  bulkDiscountPercent: null,
  isVisible: true,
  isHighlighted: false,
  highlightLabel: null,
  featuresIncluded: [],
  featuresExcluded: [],
};

// ---------------------------------------------------------------------------
// Feature list editor (add / remove bullet strings)
// ---------------------------------------------------------------------------
function FeatureListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setDraft('');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg text-sm">
            <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="flex-1">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-muted-foreground hover:text-destructive ml-auto"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add feature bullet…"
          className="text-sm h-8"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number / nullable number input helper
// ---------------------------------------------------------------------------
function NullableNumberInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : parseFloat(raw));
        }}
        placeholder={placeholder ?? 'Leave blank for N/A'}
        className="h-9"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan form dialog (create / edit)
// ---------------------------------------------------------------------------
function PlanDialog({
  open,
  plan,
  planCount,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  plan: PricingPlan | null;
  planCount: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = plan !== null;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PricingPlanInput>(() =>
    plan ?? { ...EMPTY_PLAN, sortOrder: planCount + 1 },
  );

  // Reset form when dialog opens with a different plan
  useEffect(() => {
    if (open) {
      setForm(plan ?? { ...EMPTY_PLAN, sortOrder: planCount + 1 });
    }
  }, [open, plan, planCount]);

  const set = <K extends keyof PricingPlanInput>(key: K, value: PricingPlanInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    try {
      setSaving(true);
      if (isEdit && plan) {
        await updatePricingPlan(plan.id, form);
        toast.success('Plan updated');
      } else {
        await createPricingPlan(form);
        toast.success('Plan created');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit: ${plan?.name}` : 'Create pricing plan'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="plan-name">Name *</Label>
              <Input id="plan-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Standard" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input id="plan-slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="standard" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="plan-desc">Description</Label>
            <Textarea
              id="plan-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="One-line description shown on pricing page"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tier type</Label>
              <Select value={form.tierType} onValueChange={(v) => set('tierType', v as TierType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NullableNumberInput
              id="sort-order"
              label="Sort order"
              value={form.sortOrder}
              onChange={(v) => set('sortOrder', v ?? 0)}
              placeholder="1"
            />
          </div>

          {/* Pricing */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Pricing (USD)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NullableNumberInput id="monthly" label="Monthly ($)" value={form.monthlyPriceUsd} onChange={(v) => set('monthlyPriceUsd', v)} />
              <NullableNumberInput id="annual" label="Annual ($)" value={form.annualPriceUsd} onChange={(v) => set('annualPriceUsd', v)} hint="Full year price" />
              <NullableNumberInput id="per-paper" label="Per paper ($)" value={form.perPaperPriceUsd} onChange={(v) => set('perPaperPriceUsd', v)} />
              <NullableNumberInput id="exam-cap" label="Monthly exam cap" value={form.monthlyExamCap} onChange={(v) => set('monthlyExamCap', v)} hint="Blank = unlimited" />
            </div>
          </div>

          {/* Bulk / school */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">School / Bulk</p>
            <div className="grid grid-cols-2 gap-3">
              <NullableNumberInput id="bulk-min" label="Min students" value={form.bulkMinimumStudents} onChange={(v) => set('bulkMinimumStudents', v)} />
              <NullableNumberInput id="bulk-discount" label="Discount %" value={form.bulkDiscountPercent} onChange={(v) => set('bulkDiscountPercent', v)} />
            </div>
          </div>

          {/* Feature toggles */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Features included</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {(
                [
                  ['includesPastPapers', 'Past Papers'],
                  ['includesPracticePapers', 'Practice Papers'],
                  ['includesBasicExplanations', 'Basic explanations'],
                  ['includesFullExplanations', 'Full explanations'],
                  ['includesProgressTracking', 'Progress tracking'],
                  ['includesParentAccess', 'Parent access'],
                  ['includesAiHelp', 'AI help'],
                  ['includesTeacherSupport', 'Teacher support'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 py-1">
                  <Switch
                    id={`toggle-${key}`}
                    checked={Boolean(form[key])}
                    onCheckedChange={(v) => set(key, v)}
                  />
                  <Label htmlFor={`toggle-${key}`} className="text-sm cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>
            {form.includesTeacherSupport && (
              <div className="mt-2 space-y-1">
                <Label htmlFor="teacher-note" className="text-sm">Teacher support note</Label>
                <Input
                  id="teacher-note"
                  value={form.teacherSupportNote ?? ''}
                  onChange={(e) => set('teacherSupportNote', e.target.value || null)}
                  placeholder="e.g. Where available"
                />
              </div>
            )}
          </div>

          {/* Feature bullets */}
          <FeatureListEditor
            label="Features included (bullet list)"
            items={form.featuresIncluded}
            onChange={(items) => set('featuresIncluded', items)}
          />
          <FeatureListEditor
            label="Features excluded (struck-out in UI)"
            items={form.featuresExcluded}
            onChange={(items) => set('featuresExcluded', items)}
          />

          {/* Display options */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Display</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch id="is-visible" checked={form.isVisible} onCheckedChange={(v) => set('isVisible', v)} />
                <Label htmlFor="is-visible" className="text-sm cursor-pointer">Visible on pricing page</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="is-highlighted" checked={form.isHighlighted} onCheckedChange={(v) => set('isHighlighted', v)} />
                <Label htmlFor="is-highlighted" className="text-sm cursor-pointer">Highlighted (recommended)</Label>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <Label htmlFor="highlight-label" className="text-sm">Highlight badge label</Label>
              <Input
                id="highlight-label"
                value={form.highlightLabel ?? ''}
                onChange={(e) => set('highlightLabel', e.target.value || null)}
                placeholder="e.g. Best value"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------
function DeleteDialog({
  plan,
  onConfirm,
  onCancel,
}: {
  plan: PricingPlan;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete plan: {plan.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the plan from Firestore. The pricing page will fall back to seed data
            for this tier until a replacement is created. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete plan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Seed button — writes seed plans to Firestore in one click
// ---------------------------------------------------------------------------
async function seedPlans(): Promise<number> {
  let seeded = 0;
  for (const plan of SEED_PLANS) {
    const { id, ...input } = plan;
    await createPricingPlan(input);
    seeded++;
  }
  return seeded;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PricingPlansAdmin() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<PricingPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletePlan, setDeletePlan] = useState<PricingPlan | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    try {
      const result = await getPricingPlans();
      setPlans(result);
    } catch (err) {
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditPlan(null);
    setDialogOpen(true);
  };

  const openEdit = (plan: PricingPlan) => {
    setEditPlan(plan);
    setDialogOpen(true);
  };

  const handleToggleVisibility = async (plan: PricingPlan) => {
    try {
      await updatePricingPlan(plan.id, { isVisible: !plan.isVisible });
      toast.success(`Plan ${plan.isVisible ? 'hidden' : 'shown'}`);
      await load();
    } catch {
      toast.error('Failed to update plan visibility');
    }
  };

  const handleDelete = async () => {
    if (!deletePlan) return;
    try {
      await deletePricingPlan(deletePlan.id);
      toast.success(`Plan deleted: ${deletePlan.name}`);
      setDeletePlan(null);
      await load();
    } catch {
      toast.error('Failed to delete plan');
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const count = await seedPlans();
      toast.success(`Seeded ${count} plans from default data`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Pricing Plans</h3>
          <p className="text-xs text-muted-foreground">
            Manage the plans shown on the public pricing page.
            {plans.length === 0 && !loading && ' No plans in Firestore — pricing page is using seed data.'}
          </p>
        </div>
        <div className="flex gap-2">
          {plans.length === 0 && !loading && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
              {seeding && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Seed default plans
            </Button>
          )}
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            New plan
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading plans…
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No pricing plans in Firestore.
            Use <strong>Seed default plans</strong> to populate initial data, or create plans manually.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Annual</TableHead>
                <TableHead>Per paper</TableHead>
                <TableHead>Exam cap</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      {plan.isHighlighted && (
                        <Badge className="gap-1 bg-primary/10 text-primary border-0 text-xs">
                          <Star className="w-3 h-3" />
                          {plan.highlightLabel ?? 'Highlighted'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{plan.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {plan.tierType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {plan.monthlyPriceUsd !== null ? `$${plan.monthlyPriceUsd}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {plan.annualPriceUsd !== null ? `$${plan.annualPriceUsd}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {plan.perPaperPriceUsd !== null ? `$${plan.perPaperPriceUsd}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {plan.monthlyExamCap !== null ? plan.monthlyExamCap : '∞'}
                  </TableCell>
                  <TableCell className="text-sm">{plan.sortOrder}</TableCell>
                  <TableCell>
                    <Badge
                      variant={plan.isVisible ? 'default' : 'secondary'}
                      className={plan.isVisible ? 'bg-emerald-100 text-emerald-700 border-0' : ''}
                    >
                      {plan.isVisible ? 'Visible' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title={plan.isVisible ? 'Hide' : 'Show'}
                        onClick={() => handleToggleVisibility(plan)}
                      >
                        {plan.isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="Edit"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setDeletePlan(plan)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialogs */}
      <PlanDialog
        open={dialogOpen}
        plan={editPlan}
        planCount={plans.length}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />
      {deletePlan && (
        <DeleteDialog
          plan={deletePlan}
          onConfirm={handleDelete}
          onCancel={() => setDeletePlan(null)}
        />
      )}
    </div>
  );
}
