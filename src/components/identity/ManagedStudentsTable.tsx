import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ManagedStudentListItem } from '@/integrations/firebase/identity';

interface ManagedStudentsTableProps {
  items: ManagedStudentListItem[];
  emptyTitle: string;
  emptyDescription: string;
}

export default function ManagedStudentsTable({
  items,
  emptyTitle,
  emptyDescription,
}: ManagedStudentsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h3 className="font-semibold text-foreground">{emptyTitle}</h3>
        <p className="text-sm text-muted-foreground mt-2">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Education</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Relationship</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.studentUid}>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{item.studentDisplayName}</p>
                  {item.schoolName ? (
                    <p className="text-xs text-muted-foreground">{item.schoolName}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{item.educationLevel || '—'}</TableCell>
              <TableCell>{item.country || '—'}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.relationshipLabel}</Badge>
              </TableCell>
              <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
